import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { loadStore, saveStore, mutateStore, generateMagicToken, FLAGSHIP_TERRITORY_ID, isListingPublished } from '@/lib/store'
import { sendListingWhatsAppCard, sendWhatsAppFlowMessage, markWhatsAppMessageAsRead } from '@/lib/whatsapp-cloud-api'
import {
  sendWelcomeCard,
  sendDirectoryListMenu,
  sendAppAndContactVCard,
  sendCategoryShopList,
  sendCategoryListingsCard,
  sendSingleListingDetailsCard,
  sendListingWebProfile,
  sendOffersCard,
  sendEmergencyCard,
  sendSocialMediaCard,
  sendServiceCatalogCard,
  sendVideoAdsCard,
  sendAddManageListingCard,
  getCachedListings,
  type FlowCatalogContext,
} from '@/lib/whatsapp-flow-catalog'
import type { Territory } from '@/lib/types'
import { runAutomationShadowEvaluation } from '@/lib/automation-shadow-runner'
import { evaluateFlow } from '@/lib/flow-runtime-engine'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = (searchParams.get('hub.verify_token') || '').trim()
  const challenge = searchParams.get('hub.challenge')

  let storeVerifyToken = ''
  try {
    const store = loadStore()
    storeVerifyToken = (store.settings?.whatsappVerifyToken || '').trim()
  } catch {}

  const envToken = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim().replace(/^["']|["']$/g, '')
  const validTokens = [envToken, storeVerifyToken, 'choutuppal_verify_token'].filter(Boolean)

  if (mode === 'subscribe' && token && validTokens.includes(token)) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Verification token mismatch', { status: 403 })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    // 1. Meta Webhook HMAC-SHA256 Signature Verification (When secret is configured)
    const appSecret = process.env.WHATSAPP_APP_SECRET
    const signatureHeader = req.headers.get('x-hub-signature-256')
    const enforceSignature = process.env.ENFORCE_WEBHOOK_SIGNATURE === 'true'

    if (appSecret && signatureHeader) {
      try {
        const signature = signatureHeader.replace(/^sha256=/, '').trim()
        const expectedSignature = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

        const sigBuffer = Buffer.from(signature)
        const expectedBuffer = Buffer.from(expectedSignature)

        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
          console.warn('[Webhook] Warning: x-hub-signature-256 mismatch with WHATSAPP_APP_SECRET')
          if (enforceSignature) {
            return NextResponse.json(
              { success: false, error: 'Invalid webhook signature' },
              { status: 401 }
            )
          }
        }
      } catch (sigErr) {
        console.warn('[Webhook] Signature verification exception:', sigErr)
      }
    }

    let body: any
    try {
      body = JSON.parse(rawBody || '{}')
    } catch {
      return NextResponse.json({ status: 'error', error: 'Malformed JSON payload' }, { status: 400 })
    }

    // Extract Meta webhook payload details
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    // ------------------------------------------------------------------------
    // 2. WHATSAPP DELIVERY-STATUS WEBHOOK EVENTS (sent, delivered, read, failed)
    // ------------------------------------------------------------------------
    if (value?.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
      return await mutateStore(async (store) => {
        if (!store.messages) store.messages = []
        const updatedStatusList: Array<{ messageId: string; providerMessageId: string; status: string }> = []

        const STATUS_RANK: Record<string, number> = {
          sent: 1,
          delivered: 2,
          read: 3,
        }

        for (const statusObj of value.statuses) {
          const statusId = statusObj.id
          const newStatus = statusObj.status as 'sent' | 'delivered' | 'read' | 'failed'
          if (!statusId || !newStatus) continue

          const targetMsg = store.messages.find(
            (m) => m.providerMessageId === statusId || m.id === statusId
          )

          if (!targetMsg) {
            continue
          }

          const currentRank = STATUS_RANK[targetMsg.status] ?? 0
          const targetRank = STATUS_RANK[newStatus] ?? 0

          if (newStatus === 'failed') {
            if (targetMsg.status !== 'read' && targetMsg.status !== 'delivered') {
              targetMsg.status = 'failed'
              updatedStatusList.push({ messageId: targetMsg.id, providerMessageId: statusId, status: targetMsg.status })
            }
          } else if (targetRank > currentRank) {
            targetMsg.status = newStatus
            updatedStatusList.push({ messageId: targetMsg.id, providerMessageId: statusId, status: targetMsg.status })
          }
        }

        if (updatedStatusList.length > 0) {
          return NextResponse.json({
            status: 'statuses_processed',
            updatedCount: updatedStatusList.length,
            updates: updatedStatusList,
          })
        }

        return NextResponse.json({
          status: 'statuses_acknowledged_no_mutation',
          receivedCount: value.statuses.length,
        })
      })
    }

    const message = value?.messages?.[0]
    const contact = value?.contacts?.[0]

    if (!message) {
      return NextResponse.json({ status: 'ignored_no_message' })
    }

    // ------------------------------------------------------------------------
    // 3. INBOUND MESSAGE MUTATION (Serialized through mutateStore)
    // ------------------------------------------------------------------------
    return await mutateStore(async (store) => {
      if (!store.messages) store.messages = []
      if (!store.contacts) store.contacts = []
      if (!store.approvals) store.approvals = []

      // If store settings token is empty, pull from Supabase territory_choutuppal branding
      const supabase = getSupabaseAdminClient()
      if (!store.settings?.whatsappToken && supabase) {
        try {
          const { data: tData } = await supabase
            .from('territories')
            .select('branding')
            .eq('id', FLAGSHIP_TERRITORY_ID)
            .single()
          if (tData?.branding?.whatsappSettings) {
            store.settings = { ...(store.settings || {}), ...tData.branding.whatsappSettings }
          }
        } catch (sbSyncErr) {
          console.warn('[Webhook POST] Supabase settings sync error:', sbSyncErr)
        }
      }

      const webhookMsgId = message.id
      if (webhookMsgId && store.messages) {
        const isDuplicate = store.messages.some(
          (m) => m.id === webhookMsgId || m.providerMessageId === webhookMsgId
        )
        if (isDuplicate) {
          return NextResponse.json({ status: 'ignored_duplicate_webhook', messageId: webhookMsgId })
        }
      }

      // Mark incoming message as read on WhatsApp Cloud API (converts to blue ticks)
      if (webhookMsgId && webhookMsgId.startsWith('wamid.')) {
        markWhatsAppMessageAsRead(webhookMsgId).catch((readErr) => {
          console.warn('[Webhook] Failed to mark message as read:', readErr)
        })
      }

      const senderPhone = (message.from || '').replace(/\D/g, '')
      const senderName = contact?.profile?.name || 'Citizen'
      const incomingText = (
        message.text?.body ||
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        ''
      ).trim()

      const buttonPayload = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || undefined
      const buttonTitle = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || undefined

      const lower = incomingText.toLowerCase()

      // ------------------------------------------------------------------------
      // MULTI-TENANT TERRITORY RESOLUTION
      // 1. Check if sender matches an existing listing in a specific territory
      // 2. Check if message explicitly mentions a town/territory name or slug
      // 3. Fallback to Flagship Choutuppal
      // ------------------------------------------------------------------------
      const matchedListing = (store.listings || []).find(
        (l) => (l.phone || '').replace(/\D/g, '') === senderPhone || (l.whatsapp || '').replace(/\D/g, '') === senderPhone
      )

      let territory: Territory | undefined
      if (matchedListing?.territoryId) {
        territory = (store.territories || []).find((t) => t.id === matchedListing.territoryId)
      }

      if (!territory) {
        territory = (store.territories || []).find(
          (t) =>
            lower.includes(t.slug.toLowerCase()) ||
            lower.includes(t.name.toLowerCase()) ||
            (t.localities || []).some((loc) => lower.includes(loc.toLowerCase()))
        )
      }

      if (!territory) {
        territory = (store.territories || []).find((t) => t.id === FLAGSHIP_TERRITORY_ID) || {
          id: FLAGSHIP_TERRITORY_ID,
          name: 'Choutuppal',
          slug: 'choutuppal',
          type: 'company_owned',
          status: 'active',
          district: 'Yadadri Bhuvanagiri',
          state: 'Telangana',
          pincodes: ['508252'],
          localities: ['Choutuppal Town'],
          primaryDomain: 'choutuppal.in',
          subdomain: 'choutuppal.choutuppal.in',
          isFlagship: true,
          branding: {
            primaryColor: '#059669',
            tagline: 'Choutuppal Local Business & Services Hub',
            heroTitle: 'చౌటుప్పల్ లోకల్ బిజినెస్ & సర్వీసెస్',
          },
          contactPhone: '9494348175',
          whatsappNumber: '9494348175',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      const territoryName = territory.name.split(' ')[0]
      const townDomain = territory.primaryDomain || `${territory.slug}.choutuppal.in`
      const townUrl = territory.isFlagship ? 'https://choutuppal.in' : `https://${townDomain}`

      const incomingMsgId = `msg_in_${Date.now()}`

      // 1. Log inbound message with territory isolation
      store.messages.unshift({
        id: incomingMsgId,
        providerMessageId: webhookMsgId || undefined,
        territoryId: territory.id,
        phone: senderPhone,
        contactName: senderName,
        direction: 'inbound',
        messageText: incomingText,
        status: 'received',
        createdAt: new Date().toISOString(),
      })

      // Also persist inbound message to Supabase
      if (supabase) {
        try {
          await supabase.from('whatsapp_messages').insert({
            id: incomingMsgId,
            territory_id: territory.id,
            contact_name: senderName,
            phone: senderPhone,
            direction: 'INBOUND',
            sender: 'customer',
            text: incomingText || '(Interactive Reply)',
            message_text: incomingText || '(Interactive Reply)',
            message_type: 'text',
            status: 'received',
            provider_message_id: webhookMsgId || null,
            timestamp: new Date().toISOString(),
          })
        } catch (sbWhErr) {
          console.warn('[Webhook POST] Supabase inbound insert error:', sbWhErr)
        }
      }

      // 2. Inbound contact matching & auto-upsert with 10-digit deduplication
      const senderClean = senderPhone.replace(/\D/g, '')
      const sender10 = senderClean.length >= 10 ? senderClean.slice(-10) : senderClean

      let existingContact = store.contacts.find((c) => {
        const cClean = (c.phone || '').replace(/\D/g, '')
        const c10 = cClean.length >= 10 ? cClean.slice(-10) : cClean
        return (cClean && cClean === senderClean) || (c10 && sender10 && c10 === sender10)
      })

      const nowIso = new Date().toISOString()

      if (existingContact) {
        existingContact.lastMessage = incomingText
        existingContact.lastContactAt = nowIso
        existingContact.messageCount = (existingContact.messageCount || 0) + 1
        if (senderName && senderName !== 'Citizen' && (!existingContact.name || existingContact.name.startsWith('WhatsApp User'))) {
          existingContact.name = senderName
        }
        if (!existingContact.tags) existingContact.tags = []
        if (!existingContact.tags.includes('WhatsApp Inbound')) {
          existingContact.tags.push('WhatsApp Inbound')
        }
        if (matchedListing && !existingContact.listingId) {
          existingContact.listingId = matchedListing.id
          existingContact.listingTitle = matchedListing.title
          existingContact.businessName = matchedListing.title
        }
      } else {
        existingContact = {
          id: `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: senderName !== 'Citizen' ? senderName : `WhatsApp User (${sender10 || senderClean})`,
          phone: senderPhone,
          territoryId: territory.id,
          tags: ['WhatsApp Inbound'],
          stage: 'NEW_LEAD',
          messageCount: 1,
          lastMessage: incomingText,
          lastContactAt: nowIso,
          createdAt: nowIso,
          ...(matchedListing ? {
            listingId: matchedListing.id,
            listingTitle: matchedListing.title,
            businessName: matchedListing.title,
          } : {}),
        }
        store.contacts.push(existingContact)
      }

    // ------------------------------------------------------------------------
    // AUTOMATION EVALUATOR SHADOW RUNNER (Diagnostics Only — No Dispatch/Mutation)
    // ------------------------------------------------------------------------
    const shadowDiagnostic = runAutomationShadowEvaluation({
      incomingText,
      senderPhone,
      senderName,
      providerMessageId: webhookMsgId,
      territory,
      contact: existingContact,
      storeAutomations: store.automations,
    })

    if (shadowDiagnostic.shadowModeEnabled && shadowDiagnostic.evaluated) {
      console.log(
        `[Automation Shadow Diagnostics] territory=${shadowDiagnostic.territoryId} rulesEvaluated=${shadowDiagnostic.rulesEvaluatedCount} matched=${shadowDiagnostic.matchedRuleIds?.length || 0} winnerAction=${shadowDiagnostic.winnerActionType || 'none'} durationMs=${shadowDiagnostic.durationMs}ms`
      )
    }

    const withShadow = (payload: Record<string, any>) => {
      if (shadowDiagnostic.shadowModeEnabled) {
        return { ...payload, automationShadow: shadowDiagnostic }
      }
      return payload
    }

      // 2. VENDOR MATCH vs REGULAR CITIZEN ROUTING
      if (matchedListing && (lower === 'hi' || lower === 'hello' || lower === 'నమస్కారం')) {
        const vendorClaimMsg =
          `నమస్కారం ${senderName} గారు! 🙏\n\n` +
          `${territoryName} యాప్ రికార్డులలో మీ వ్యాపారం క్రింది విధంగా నమోదై ఉంది:\n` +
          `🏢 *${matchedListing.title}*\n` +
          `📞 ఫోన్: ${matchedListing.phone}\n` +
          `📍 చిరునామా: ${matchedListing.address}\n\n` +
          `మీరు ఈ వ్యాపార యజమాని అయితే, వివరాలను సరిచూసుకొని నిర్ధారించండి లేదా మార్పులు చేయండి:\n` +
          `1. 'QR' - మీ షాప్ కౌంటర్ QR స్టాండీని డౌన్‌లోడ్/ప్రింట్ చేయడానికి\n` +
          `2. 'సవరించండి' - ఫోటోలు లేదా వివరాలు మార్చడానికి\n` +
          `3. 'కన్ఫర్మ్' - వివరాలు సరైనవే అని ధృవీకరించడానికి\n\n` +
          `🌐 Website: ${townUrl}`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: vendorClaimMsg,
          imageUrl: matchedListing.coverImage,
          contactName: matchedListing.title,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'vendor_claim_sent', listingId: matchedListing.id }))
      }

      // ------------------------------------------------------------------------
      // 2. ZERO-TYPING / TAP-ONLY WHATSAPP FLOW ROUTING ENGINE
      // ------------------------------------------------------------------------
      const flowCtx: FlowCatalogContext = {
        toPhone: senderPhone,
        senderName,
        territory,
        store,
      }

      // Action 1: Open Directory List Menu
      if (
        buttonPayload === 'btn_open_directory' ||
        buttonPayload === 'btn_menu_directory' ||
        lower === 'directory' ||
        lower === 'డైరెక్టరీ' ||
        lower === 'మెనూ' ||
        lower === 'menu' ||
        lower === '1'
      ) {
        await sendDirectoryListMenu(flowCtx)
        return NextResponse.json(withShadow({ status: 'directory_list_dispatched' }))
      }

      // Action 2: App Download & Official Native vCard
      if (
        buttonPayload === 'btn_app_vcard' ||
        buttonPayload === 'row_app_vcard' ||
        buttonPayload === 'btn_save_vcard' ||
        buttonPayload === 'btn_contact_saved' ||
        lower.includes('vcard') ||
        lower.includes('యాప్') ||
        lower.includes('app')
      ) {
        await sendAppAndContactVCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'app_vcard_dispatched' }))
      }

      // Action 3: Vouchers & Today's Deals
      if (
        buttonPayload === 'row_vouchers_deals' ||
        buttonPayload === 'btn_view_offers' ||
        buttonPayload === 'btn_vouchers_deals' ||
        buttonPayload === 'btn_menu_stories' ||
        lower === 'offers' ||
        lower === 'vouchers' ||
        lower === 'ఆఫర్లు' ||
        lower === 'వోచర్లు' ||
        lower.includes('కూపన్') ||
        lower.includes('voucher') ||
        lower === '2'
      ) {
        await sendOffersCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'offers_dispatched' }))
      }

      // Action 3c: Video Ads, Stories & Reels
      if (
        buttonPayload === 'row_video_ads' ||
        buttonPayload === 'btn_video_ads' ||
        lower === 'videos' ||
        lower === 'video' ||
        lower.includes('వీడియో') ||
        lower.includes('reels') ||
        lower.includes('రీల్స్') ||
        lower.includes('stories') ||
        lower.includes('స్టోరీ') ||
        lower.includes('ads')
      ) {
        await sendVideoAdsCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'video_ads_dispatched' }))
      }

      // Action 3d: Add / Manage Listing Hub
      if (
        buttonPayload === 'row_add_listing' ||
        buttonPayload === 'btn_add_listing' ||
        lower.includes('add listing') ||
        lower.includes('manage') ||
        lower.includes('నమోదు') ||
        lower.includes('చేర్చండి') ||
        lower.includes('register')
      ) {
        await sendAddManageListingCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'add_listing_dispatched' }))
      }

      // Action 3b: Official Social Media & Community Hub
      if (
        buttonPayload === 'btn_social_media' ||
        buttonPayload === 'row_social_media' ||
        lower === 'social' ||
        lower.includes('social') ||
        lower.includes('instagram') ||
        lower.includes('youtube') ||
        lower.includes('facebook') ||
        lower.includes('సోషల్') ||
        lower.includes('ఇన్‌స్టాగ్రామ్') ||
        lower.includes('యూట్యూబ్') ||
        lower.includes('కమ్యూనిటీ') ||
        lower.includes('ఛానల్') ||
        lower.includes('గ్రూప్')
      ) {
        await sendSocialMediaCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'social_media_dispatched' }))
      }

      // Action 4: Single Business Web Profile Request
      if (buttonPayload?.startsWith('btn_prof_')) {
        const listingId = buttonPayload.replace('btn_prof_', '').trim()
        const allListings = await getCachedListings(territory.id, store)
        const listing =
          allListings.find((l) => l.id === listingId) ||
          (store.listings || []).find((l: any) => l.id === listingId)

        if (listing) {
          await sendListingWebProfile(flowCtx, listing)
          return NextResponse.json(withShadow({ status: 'listing_web_profile_dispatched', listingId }))
        }
      }

      // Action 5: Individual Business Click from Category Sub-List
      if (buttonPayload?.startsWith('row_biz_')) {
        const listingId = buttonPayload.replace('row_biz_', '').trim()
        const allListings = await getCachedListings(territory.id, store)
        const listing =
          allListings.find((l) => l.id === listingId) ||
          (store.listings || []).find((l: any) => l.id === listingId)

        if (listing) {
          await sendSingleListingDetailsCard(flowCtx, listing)
          return NextResponse.json(withShadow({ status: 'single_listing_dispatched', listingId }))
        }
      }

      // Action 6: Interactive Category Sub-Lists (Tap-Only)
      if (
        buttonPayload === 'row_cat_automobile' ||
        buttonPayload === 'row_cat_taxi' ||
        buttonPayload === 'row_cat_auto' ||
        lower.includes('ఆటోమొబైల్') ||
        lower.includes('automobile') ||
        lower.includes('garage') ||
        lower.includes('గ్యారేజ్') ||
        lower.includes('ఆటో') ||
        lower.includes('టాక్సీ') ||
        lower.includes('క్యాబ్')
      ) {
        await sendCategoryShopList(flowCtx, 'automobile')
        return NextResponse.json(withShadow({ status: 'category_automobile_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_mobiles' ||
        (!lower.includes('ఆటో') && (lower.includes('mobile') || lower.includes('మొబైల్') || lower.includes('electronics')))
      ) {
        await sendCategoryShopList(flowCtx, 'mobiles')
        return NextResponse.json(withShadow({ status: 'category_mobiles_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_kirana' ||
        buttonPayload === 'row_cat_clothing' ||
        lower.includes('kirana') ||
        lower.includes('కిరాణా') ||
        lower.includes('cloth') ||
        lower.includes('బట్టలు') ||
        lower.includes('సూపర్')
      ) {
        await sendCategoryShopList(flowCtx, 'kirana')
        return NextResponse.json(withShadow({ status: 'category_kirana_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_food' ||
        lower.includes('food') ||
        lower.includes('hotel') ||
        lower.includes('dining') ||
        lower.includes('హోటల్') ||
        lower.includes('రెస్టారెంట్') ||
        lower.includes('బిర్యానీ')
      ) {
        await sendCategoryShopList(flowCtx, 'food')
        return NextResponse.json(withShadow({ status: 'category_food_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_health' ||
        buttonPayload === 'row_cat_hospitals' ||
        buttonPayload === 'row_cat_medical' ||
        lower.includes('health') ||
        lower.includes('hospital') ||
        lower.includes('medical') ||
        lower.includes('ఆసుపత్రి') ||
        lower.includes('మందులు') ||
        lower.includes('డాక్టర్')
      ) {
        await sendCategoryShopList(flowCtx, 'health')
        return NextResponse.json(withShadow({ status: 'category_health_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_electrical' ||
        lower.includes('electrical') ||
        lower.includes('hardware') ||
        lower.includes('ఎలక్ట్రికల్') ||
        lower.includes('హార్డ్‌వేర్')
      ) {
        await sendCategoryShopList(flowCtx, 'electrical')
        return NextResponse.json(withShadow({ status: 'category_electrical_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_services' ||
        buttonPayload === 'btn_my_services' ||
        lower.includes('services') ||
        lower.includes('service') ||
        lower.includes('నా సేవలు') ||
        lower.includes('plumber') ||
        lower.includes('technician') ||
        lower.includes('ప్లంబర్') ||
        lower.includes('రిపేర్')
      ) {
        await sendServiceCatalogCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'category_services_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_internet' ||
        lower.includes('meeseva') ||
        lower.includes('internet') ||
        lower.includes('మీసేవ') ||
        lower.includes('ఇంటర్నెట్')
      ) {
        await sendCategoryShopList(flowCtx, 'internet')
        return NextResponse.json(withShadow({ status: 'category_internet_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_furniture' ||
        lower.includes('furniture') ||
        lower.includes('ఫర్నిచర్')
      ) {
        await sendCategoryShopList(flowCtx, 'furniture')
        return NextResponse.json(withShadow({ status: 'category_furniture_dispatched' }))
      }

      if (
        buttonPayload === 'row_cat_emergency' ||
        lower.includes('emergency') ||
        lower.includes('police') ||
        lower.includes('పోలీస్') ||
        lower.includes('100') ||
        lower.includes('108')
      ) {
        await sendEmergencyCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'emergency_dispatched' }))
      }

      // Action 7: Welcome Card (Home, Start, Greetings)
      const isGreeting =
        buttonPayload === 'btn_home' ||
        buttonPayload === 'btn_back_to_menu' ||
        lower === 'hi' ||
        lower === 'hello' ||
        lower === 'నమస్కారం' ||
        lower === 'హలో' ||
        lower === 'start' ||
        lower === 'హాయ్' ||
        lower === 'back' ||
        lower === 'వెనక్కి'

      if (isGreeting) {
        await sendWelcomeCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'welcome_card_dispatched' }))
      }

      const isDirectoryClick = buttonPayload === 'btn_menu_directory' || lower === '1' || lower === 'డైరెక్టరీ' || lower === 'directory' || lower === 'షాపులు'
      const isStoriesClick = buttonPayload === 'btn_menu_stories' || lower === '2' || lower === 'స్టోరీస్' || lower === 'stories' || lower === 'ఆఫర్స్' || lower === 'offers'
      const isPromoteClick = buttonPayload === 'btn_menu_promote' || lower === '3' || lower === 'వ్యాపారం' || lower === 'ప్రమోషన్' || lower === 'promote' || lower === 'wishes' || lower === 'విషెస్'
      const isGovtClick = buttonPayload === 'btn_cat_govt' || lower.includes('ప్రభుత్వ') || lower.includes('govt') || lower.includes('emergency')
      const isTermsAccept = buttonPayload === 'btn_accept_terms' || lower === 'accept' || lower === 'అంగీకరిస్తున్నాను'
      const isTermsDecline = buttonPayload === 'btn_decline_terms' || lower === 'decline' || lower === 'రద్దు'
      const isCommunityClick = buttonPayload === 'btn_community' || lower.includes('కమ్యూనిటీ') || lower.includes('community') || lower.includes('గ్రూప్')
      const isOrderStoryClick = buttonPayload === 'btn_order_story_99' || lower.includes('స్టోరీ బుక్') || lower.includes('order story') || lower.includes('wish story')
      const isOrderReelClick = buttonPayload === 'btn_order_reel_299' || lower.includes('రీల్') || lower.includes('reel')
      const isOrderBulkClick = buttonPayload === 'btn_order_bulk_499' || lower.includes('బల్క్') || lower.includes('bulk')
      const isTaxiClick = buttonPayload === 'btn_cat_taxi' || lower === 'taxi' || lower === 'టాక్సీ' || lower.includes('ట్రాన్స్‌పోర్ట్')
      const wardMatch = incomingText.match(/(?:ward|వార్డు)\s*([0-9]{1,2})/i)

      const dispatchStoriesAndMainMenu = async () => {
        await sendOffersCard(flowCtx)
        return NextResponse.json(withShadow({ status: 'stories_and_menu_dispatched' }))
      }

      // SECTION 1: BUSINESS DIRECTORY (CATEGORIES & LISTINGS WITH PHOTOS)
      if (isDirectoryClick && !matchedListing) {
        const directoryMenuText =
          `🔍 *చౌటుప్పల్ లోకల్ బిజినెస్ డైరెక్టరీ* 🏢\n\n` +
          `మీరు ఏ కేటగిరీ దుకాణాలు లేదా సేవల కోసం వెతుకుతున్నారు?\n\n` +
          `1. 🛒 *జనరల్ స్టోర్స్ & కిరాణా* (టైప్ చేయండి: 'కిరాణా')\n` +
          `2. 🏨 *హోటల్స్ & రెస్టారెంట్లు* (టైప్ చేయండి: 'హోటల్')\n` +
          `3. 🏥 *ఆసుపత్రులు & మెడికల్స్* (టైప్ చేయండి: 'హాస్పిటల్')\n` +
          `4. 🚗 *ఆటోమొబైల్స్ & 24/7 టాక్సీ/ఆటో* (టైప్ చేయండి: 'Taxi')\n` +
          `5. ⚡ *ఎలక్ట్రీషియన్లు & ప్లంబర్లు* (టైప్ చేయండి: 'Plumber')\n` +
          `6. 🏡 *రియల్ ఎస్టేట్ & ఓపెన్ ప్లాట్లు* (టైప్ చేయండి: 'Plots')\n` +
          `7. 🏛️ *ప్రభుత్వ అత్యవసర నంబర్లు* (టైప్ చేయండి: 'Govt')\n\n` +
          `💡 *చిట్కా:* ఏదైనా షాప్ లేదా వ్యాపారం పేరు తెలిస్తే నేరుగా టైప్ చేయండి (ఉదా: 'సాయి రామ్').\n` +
          `🌐 పూర్తి వెబ్‌సైట్ డైరెక్టరీ: ${townUrl}/listings`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: directoryMenuText,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: directoryMenuText,
          buttons: [
            { id: 'btn_cat_taxi', title: '🚖 టాక్సీ & ఆటో' },
            { id: 'btn_cat_govt', title: '🏛️ ప్రభుత్వ నంబర్లు' },
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'directory_menu_dispatched' }))
      }

      // SECTION 2: OFFERS & STORIES
      if (isStoriesClick && !matchedListing) {
        const activeStories = (store.stories || []).filter((s) => s.status === 'published')
        const activeOffers = (store.offers || []).filter((o) => o.status === 'published')

        let storiesSummary = ''
        if (activeOffers.length > 0) {
          storiesSummary += `\n*🛍️ నేటి ప్రత్యేక డిస్కౌంట్లు & ఆఫర్లు:*\n`
          activeOffers.slice(0, 3).forEach((off, idx) => {
            storiesSummary += `${idx + 1}. *${off.businessName}*: ${off.title} (${off.discount})\n`
          })
        }
        if (activeStories.length > 0) {
          storiesSummary += `\n*🌟 లైవ్ స్టోరీలు & లోకల్ విషెస్:*\n`
          activeStories.slice(0, 3).forEach((st, idx) => {
            storiesSummary += `${idx + 1}. *${st.businessName}*: ${st.caption || 'Live Update'}\n`
          })
        }

        const storiesMsg =
          `✨ *చౌటుప్పల్ నేటి 24 గంటల ప్రత్యేక స్టోరీస్ & ఆఫర్లు* 🛍️\n` +
          storiesSummary +
          `\n👉 *మొబైల్ స్టేటస్ లాగా ఫుల్‌స్క్రీన్‌లో చూడటానికి:*\n` +
          `🌐 ${townUrl}/stories\n\n` +
          `💡 *మీ షాప్ ఆఫర్ లేదా పుట్టినరోజు/పెళ్లిరోజు శుభాకాంక్షల స్టోరీని కేవలం ₹99 కే ప్రదర్శించడానికి క్రింది బటన్ నొక్కండి:*`

        const topMedia = activeStories[0]?.mediaUrl || activeOffers[0]?.imageUrl || undefined

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: storiesMsg,
          imageUrl: topMedia,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: storiesMsg,
          imageUrl: topMedia,
          buttons: [
            { id: 'btn_order_story_99', title: '🎂 స్టోరీ పోస్ట్ (₹99)' },
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'stories_menu_dispatched' }))
      }

      // SECTION 3: INCOME BACK-BONE — PROMOTE & WISHING STUDIO
      if (isPromoteClick && !matchedListing) {
        const promoteMsg =
          `📢 *చౌటుప్పల్ యాప్ ప్రమోషన్స్ & విషింగ్ డెస్క్* ✨\n\n` +
          `మీ బ్రాండ్‌ను లేదా మీ ప్రియమైన వారికి శుభాకాంక్షలను చౌటుప్పల్‌లోని *15,000+ స్థానిక ప్రజలకు* చేర్చండి:\n\n` +
          `🎂 *1. బర్త్‌డే & యానివర్సరీ విషెస్ స్టోరీ (₹99):*\n` +
          `మీ కుటుంబ సభ్యులు, మిత్రుల ఫోటోతో 24 గంటల పాటు అధికారిక యాప్ & వాట్సాప్ స్టేటస్‌లో ఫుల్-స్క్రీన్ పోస్టర్ డిస్‌ప్లే!\n\n` +
          `💐 *2. స్థానిక నాయకుల శుభాకాంక్షల స్టోరీ (₹99):*\n` +
          `రాజకీయ/సామాజిక నాయకుల బర్త్‌డే, పదవీ ప్రమాణ స్వీకార విషెస్ పోస్టర్లు.\n\n` +
          `🛍️ *3. షాప్ డిస్కౌంట్ ఆఫర్ స్టోరీ (₹99/రోజు):*\n` +
          `మీ నేటి ప్రత్యేక డిస్కౌంట్, కస్టమర్లు నేరుగా మీకు వాట్సాప్ చేసే బటన్‌తో.\n\n` +
          `🎬 *4. వీడియో రీల్ & షార్ట్ ప్రమోషన్ (₹299/3 రోజులు):*\n` +
          `మీ షాప్ వీడియో యాప్ హోమ్‌పేజీ మరియు రీల్స్ సెక్షన్‌లో టాప్‌లో కనిపిస్తుంది.\n\n` +
          `📲 *5. వాట్సాప్ బల్క్ బ్రాడ్‌కాస్ట్ (₹499):*\n` +
          `చౌటుప్పల్ పరిధిలోని ధృవీకరించబడిన కస్టమర్ల మొబైల్స్‌కు డైరెక్ట్ మెసేజ్.\n\n` +
          `🖨️ *6. ఉచిత షాప్ కౌంటర్ QR స్టాండీ*\n\n` +
          `క్రింది ఆప్షన్ ఎంచుకోండి:`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: promoteMsg,
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: promoteMsg,
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          buttons: [
            { id: 'btn_order_story_99', title: '🎂 స్టోరీ పోస్ట్ (₹99)' },
            { id: 'btn_order_reel_299', title: '🎬 రీల్ ప్రమోషన్ (₹299)' },
            { id: 'btn_order_bulk_499', title: '📲 బల్క్ మెసేజ్ (₹499)' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'monetization_promote_menu_dispatched' }))
      }

      // ORDER STORY BOOKING (₹99)
      if (isOrderStoryClick && !matchedListing) {
        const orderMsg =
          `🎉 *మీ స్టోరీ / విషెస్ బుకింగ్ వివరాలు (₹99)*\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n\n` +
          `1️⃣ ఎవరి కోసం? (పేరు & ఫోటో ఈ చాట్ లోనే పంపించండి)\n` +
          `2️⃣ ఏ సందర్భంగా? (పుట్టినరోజు / పెళ్లిరోజు / షాప్ ఆఫర్)\n` +
          `3️⃣ శుభాకాంక్షల మెసేజ్ టైప్ చేయండి.\n\n` +
          `💳 *చెల్లింపు UPI:* \`9494348175@ybl\` (లేదా GooglePay / PhonePe: 9494348175)\n\n` +
          `ఫోటో అందిన 30 నిమిషాల్లో మా డిజైన్ టీమ్ ప్రొఫెషనల్ పోస్టర్ సిద్ధం చేసి, చౌటుప్పల్ యాప్ మరియు వాట్సాప్‌లో లైవ్ చేస్తుంది!`

        if (!store.deals) store.deals = []
        store.deals.unshift({
          id: `deal_story_${Date.now()}`,
          title: `Story Ad (₹99) Inquiry from ${senderName}`,
          description: `Customer wants to book a ₹99 story wish/ad via WhatsApp`,
          value: 99,
          currency: 'INR',
          stage: 'NEW_LEAD',
          status: 'OPEN',
          phone: senderPhone,
          contactId: existingContact?.id,
          contactName: senderName,
          territoryId: territory.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: orderMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: orderMsg,
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'story_order_instructions_dispatched' }))
      }

      // ORDER REEL VIDEO PROMOTION (₹299)
      if (isOrderReelClick && !matchedListing) {
        const orderReelMsg =
          `🎬 *వీడియో రీల్ ప్రమోషన్ బుకింగ్ వివరాలు (₹299/3 రోజులు)* ✨\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n\n` +
          `మీ వ్యాపార వీడియో లేదా ప్రొడక్ట్ రీల్ చౌటుప్పల్ యాప్ హోమ్‌పేజీ మరియు రీల్స్ సెక్షన్‌లో 3 రోజుల పాటు హైలైట్ చేయబడుతుంది:\n\n` +
          `1️⃣ మీ 15-30 సెకన్ల వర్టికల్ (9:16) వీడియోను ఈ చాట్‌లోనే పంపించండి.\n` +
          `2️⃣ మీ వ్యాపారం పేరు, ప్రత్యేక ఆఫర్ వివరాలు మరియు లొకేషన్ పంపండి.\n` +
          `3️⃣ మీ రీల్ కింద కస్టమర్లు నేరుగా మీకు ఆర్డర్ చేయడానికి "Chat on WhatsApp" బటన్ ఇవ్వబడుతుంది.\n\n` +
          `💳 *చెల్లింపు UPI:* \`9494348175@ybl\` (లేదా PhonePe/GPay: 9494348175)\n\n` +
          `వీడియో అందిన వెంటనే మా మీడియా టీమ్ వెరిఫై చేసి లైవ్ చేస్తుంది!`

        if (!store.deals) store.deals = []
        store.deals.unshift({
          id: `deal_reel_${Date.now()}`,
          title: `Reel Promo (₹299) Inquiry from ${senderName}`,
          description: `Customer wants to book a ₹299 video reel promotion via WhatsApp`,
          value: 299,
          currency: 'INR',
          stage: 'NEW_LEAD',
          status: 'OPEN',
          phone: senderPhone,
          contactId: existingContact?.id,
          contactName: senderName,
          territoryId: territory.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: orderReelMsg,
          imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: orderReelMsg,
          imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80',
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'reel_order_instructions_dispatched' }))
      }

      // ORDER BULK WHATSAPP CAMPAIGN (₹499)
      if (isOrderBulkClick && !matchedListing) {
        const orderBulkMsg =
          `📲 *వాట్సాప్ బల్క్ బ్రాడ్‌కాస్ట్ క్యాంపెయిన్ (₹499)* 🚀\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n\n` +
          `చౌటుప్పల్ మరియు పరిసర ప్రాంతాల్లోని *15,000+ వెరిఫైడ్ మొబైల్ యూజర్లకు* మీ ప్రకటనను నేరుగా చేర్చండి:\n\n` +
          `1️⃣ మీ ఆఫర్ పోస్టర్/ఫోటో మరియు వివరాలు ఈ చాట్‌లోనే పంపించండి.\n` +
          `2️⃣ టార్గెట్ ఆడియన్స్: చౌటుప్పల్ టౌన్ లేదా నిర్దిష్ట వార్డులు/గ్రామాలు.\n` +
          `3️⃣ మెసేజ్ చివరలో మీ షాప్ డైరెక్ట్ కాల్ & వాట్సాప్ లింక్ ఉంటుంది.\n` +
          `4️⃣ క్యాంపెయిన్ ముగిసిన తర్వాత డెలివరీ రిపోర్ట్ అందించబడుతుంది.\n\n` +
          `💳 *చెల్లింపు UPI:* \`9494348175@ybl\` (లేదా PhonePe/GPay: 9494348175)\n\n` +
          `పోస్టర్ పంపించండి, మా టీమ్ బ్రాడ్‌కాస్ట్ షెడ్యూల్ చేస్తుంది!`

        if (!store.deals) store.deals = []
        store.deals.unshift({
          id: `deal_bulk_${Date.now()}`,
          title: `Bulk WhatsApp Campaign (₹499) Inquiry from ${senderName}`,
          description: `Customer wants to run a ₹499 bulk WhatsApp campaign to 15,000+ locals`,
          value: 499,
          currency: 'INR',
          stage: 'NEW_LEAD',
          status: 'OPEN',
          phone: senderPhone,
          contactId: existingContact?.id,
          contactName: senderName,
          territoryId: territory.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: orderBulkMsg,
          imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: orderBulkMsg,
          imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'bulk_order_instructions_dispatched' }))
      }

      // TAXI & AUTO SERVICES
      if (isTaxiClick && !matchedListing) {
        const taxiMsg =
          `🚖 *చౌటుప్పల్ 24/7 టాక్సీ & ఆటో సర్వీసులు* 🚗\n\n` +
          `నమస్కారం ${senderName} గారు! అత్యవసర ప్రయాణాలకు మరియు లోకల్ ట్రిప్పుల కోసం వెరిఫైడ్ డ్రైవర్లు అందుబాటులో ఉన్నారు:\n\n` +
          `• 🚗 *హైదరాబాద్ ఎయిర్‌పోర్ట్ & అవుట్‌స్టేషన్ క్యాబ్స్:*\n` +
          `  డిజైర్, ఇన్నోవా & ఎర్టిగా (AC)\n` +
          `• 🛺 *లోకల్ టౌన్ & విలేజ్ ఆటో సర్వీసులు:*\n` +
          `  చౌటుప్పల్ బస్టాండ్, పంతంగి, లింగోజిగూడ, మల్కాపూర్\n\n` +
          `📞 *డైరెక్ట్ క్యాబ్ హెల్ప్‌లైన్:* 9494348175\n` +
          `🌐 వెబ్‌సైట్‌లో డ్రైవర్ల జాబితా: ${townUrl}/services`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: taxiMsg,
          imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: taxiMsg,
          imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80',
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'taxi_info_dispatched' }))
      }

      // GOVERNMENT CONTACTS & ONE-TIME TERMS ACCEPTANCE GATE
      if ((isGovtClick || isTermsAccept || isTermsDecline) && !matchedListing) {
        if (isTermsDecline) {
          const declineMsg = `నిబంధనలను అంగీకరించనందున ప్రభుత్వ సంప్రదింపు వివరాలు చూపించబడలేదు. ప్రధాన మెనూకు వెళ్లడానికి 'మెనూ' అని పంపండి.`
          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: declineMsg,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })
          return NextResponse.json(withShadow({ status: 'terms_declined' }))
        }

        // Check if terms accepted
        const needsTerms = !existingContact?.termsAcceptedAt && !isTermsAccept

        if (needsTerms) {
          const termsPromptMsg =
            `📋 *ముఖ్య గమనిక (నిబంధనలు & ప్రైవసీ)* ⚖️\n\n` +
            `చౌటుప్పల్ అధికారిక ప్రభుత్వ మరియు పబ్లిక్ సంప్రదింపు వివరాలను చూసే ముందు, దయచేసి మా నిబంధనలు మరియు ప్రైవసీ పాలసీని చదివి అంగీకరించండి:\n\n` +
            `• నిబంధనలు: ${townUrl}/terms\n` +
            `• ప్రైవసీ పాలసీ: ${townUrl}/privacy`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: termsPromptMsg,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          await sendWhatsAppFlowMessage({
            toPhone: senderPhone,
            messageText: termsPromptMsg,
            buttons: [
              { id: 'btn_accept_terms', title: 'అంగీకరిస్తున్నాను ✅' },
              { id: 'btn_decline_terms', title: 'రద్దు చేయండి ❌' },
            ],
            territoryId: territory.id,
            contactName: senderName,
          }, store)

          return NextResponse.json(withShadow({ status: 'terms_acceptance_prompted' }))
        }

        // Terms accepted or already accepted
        if (isTermsAccept && existingContact) {
          existingContact.termsAcceptedAt = new Date().toISOString()
        }

        const govtContactsMsg =
          `🏛️ *చౌటుప్పల్ అధికారిక ప్రభుత్వ & అత్యవసర నంబర్లు:* 🚨\n\n` +
          `👮 *పోలీస్ స్టేషన్ (Choutuppal PS):* 08694-273233 / 8712686100\n` +
          `🏥 *ప్రభుత్వ ఆసుపత్రి (CH Choutuppal):* 9849902345\n` +
          `🚒 *ఫైర్ స్టేషన్ (Fire Control):* 101 / 9490612101\n` +
          `⚡ *విద్యుత్ శాఖ ఫిర్యాదులు (TSSPDCL):* 9440813456\n` +
          `🏛️ *మున్సిపల్ కార్యాలయం (Commissioner):* 9849907654\n` +
          `🌾 *తహశీల్దార్ కార్యాలయం (MRO):* 9491036852\n` +
          `🚑 *అంబులెన్స్ సర్వీస్:* 108 / 102\n\n` +
          `🌐 వెబ్‌సైట్‌లో పూర్తి వెరిఫైడ్ జాబితా: ${townUrl}/government-contacts`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: govtContactsMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: govtContactsMsg,
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'govt_contacts_dispatched' }))
      }

      // SECTION 4: COMMUNITY & SOCIAL CONNECT (OPTIONAL, AT THE END)
      if (isCommunityClick && !matchedListing) {
        const communityMsg =
          `🤝 *మన చౌటుప్పల్ కమ్యూనిటీ & వార్డు గ్రూపులు* 🏘️\n\n` +
          `మీ ప్రాంతం మరియు వార్డు అభివృద్ధి సమాచారం, స్థానిక సమస్యలు చర్చించడానికి గ్రూప్‌లో చేరండి:\n\n` +
          `👥 *చౌటుప్పల్ మెయిన్ కమ్యూనిటీ:* https://chat.whatsapp.com/choutuppal-main\n\n` +
          `🏙️ *వార్డు గ్రూపులు (1 నుండి 20 వరకు):*\n` +
          `మీ వార్డు గ్రూప్ లింక్ కోసం మీ వార్డు నంబర్ టైప్ చేయండి (ఉదా: 'Ward 1', 'Ward 5').\n\n` +
          `🌾 *గ్రామాల గ్రూపులు:*\n` +
          `పంతంగి, మల్కాపూర్, లింగోజిగూడ, కోయలగూడెం\n\n` +
          `📸 *సోషల్ మీడియాలో ఫాలో అవ్వండి:*\n` +
          `• Instagram: https://instagram.com/choutuppal.in\n` +
          `• Facebook: https://facebook.com/choutuppal.in`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: communityMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: communityMsg,
          buttons: [
            { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
          ],
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        return NextResponse.json(withShadow({ status: 'community_info_dispatched' }))
      }

      // WARD LEVEL WHATSAPP GROUP SPECIFIC LINK
      if (wardMatch && !matchedListing) {
        const wardNum = parseInt(wardMatch[1], 10)
        if (wardNum >= 1 && wardNum <= 20) {
          const wardMsg =
            `🏙️ *చౌటుప్పల్ వార్డు ${wardNum} అధికారిక వాట్సాప్ గ్రూప్* 🏘️\n\n` +
            `వార్డు నంబర్ ${wardNum} పౌరుల చర్చలు, పారిశుద్ధ్యం మరియు స్థానిక సమస్యల పరిష్కారం కోసం గ్రూప్‌లో చేరండి:\n\n` +
            `👉 గ్రూప్ లింక్: https://chat.whatsapp.com/choutuppal-ward-${wardNum}\n\n` +
            `🏛️ చౌటుప్పల్ మున్సిపల్ కార్యాలయం: 9849907654\n` +
            `📢 యాప్ హెల్ప్‌లైన్: 9494348175`

          if (existingContact) {
            existingContact.preferredWard = wardNum
          }

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: wardMsg,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          await sendWhatsAppFlowMessage({
            toPhone: senderPhone,
            messageText: wardMsg,
            buttons: [
              { id: 'btn_community', title: '👥 అన్ని గ్రూపులు' },
              { id: 'btn_back_to_menu', title: '📋 ప్రధాన మెనూ' },
            ],
            territoryId: territory.id,
            contactName: senderName,
          }, store)

          return NextResponse.json(withShadow({ status: 'ward_group_dispatched', ward: wardNum }))
        }
      }

      // RESET TO MENU
      if (buttonPayload === 'btn_back_to_menu') {
        return await dispatchStoriesAndMainMenu()
      }

      // 3.1. LISTING DETAILS INQUIRY FROM WEBSITE BUTTONS & CARDS
      // Matches: "want details for ... (Ref: ...)" or "inquiry for ... (Ref: ...)" or ref/id tags
      const refMatch = incomingText.match(/\b(?:ref|id):\s*([a-zA-Z0-9_\-]+)/i)
      const isListingInquiry =
        refMatch ||
        lower.includes('want details for') ||
        lower.includes('inquiry for') ||
        lower.includes('details for') ||
        lower.includes('వ్యాపారం చూసి') ||
        lower.includes('వివరాలు కావాలి')

      if (isListingInquiry && !lower.includes('interested in "')) {
        const targetId = refMatch ? refMatch[1] : null
        const targetListing = targetId
          ? (store.listings || []).find((l) => l.id === targetId || l.slug === targetId || l.id === `lst_${targetId}`)
          : (store.listings || []).find((l) => isListingPublished(l) && lower.includes(l.title.toLowerCase().slice(0, 15)))

        if (targetListing) {
          const listingUrl = `${townUrl}/business/${targetListing.slug || targetListing.id}`
          const listingCover =
            targetListing.coverImage ||
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'

          const listingReply =
            `🏢 *${targetListing.title}* (చౌటుప్పల్ అధికారిక వెరిఫైడ్ మినీ వెబ్‌సైట్) ✅\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            `మీరు కోరిన వ్యాపార వివరాలు సిద్ధంగా ఉన్నాయి:\n\n` +
            `📍 *చిరునామా:* ${targetListing.address || `${targetListing.villageName || 'చౌటుప్పల్'}, తెలంగాణ`}\n` +
            `🏷️ *కేటగిరీ:* ${targetListing.categoryName || 'వ్యాపారం'} · ${targetListing.villageName || 'చౌటుప్పల్'}\n` +
            `📞 *డైరెక్ట్ కాల్:* +91 ${targetListing.phone}\n` +
            `💬 *ఓనర్ వాట్సాప్:* +91 ${targetListing.whatsapp || targetListing.phone}\n` +
            `⏰ *పని వేళలు:* ఉదయం 9:00 - రాత్రి 9:00 (రోజూ తెరిచి ఉంటుంది)\n` +
            (targetListing.price ? `💰 *ధర:* ${targetListing.price}\n` : '') +
            `\n👉 *ఫోటోలు, సేవలు, ధరలు & కస్టమర్ రివ్యూల కోసం పూర్తి మినీ వెబ్‌సైట్ చూడండి:*\n` +
            `🌐 ${listingUrl}\n\n` +
            `🖨️ *షాప్ కౌంటర్ QR స్టాండీ కోసం 'QR' అని పంపండి.*\n` +
            `📢 చౌటుప్పల్ యాప్ హెల్ప్‌లైన్: 9494348175`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            contactName: targetListing.title,
            direction: 'outbound',
            messageText: listingReply,
            imageUrl: listingCover,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          if (existingContact) {
            existingContact.listingId = targetListing.id
            existingContact.listingTitle = targetListing.title
            if (!existingContact.tags) existingContact.tags = []
            if (!existingContact.tags.includes('Listing Lead')) {
              existingContact.tags.push('Listing Lead')
            }
          }

          return NextResponse.json(
            withShadow({
              status: 'listing_details_dispatched',
              listingId: targetListing.id,
              listingTitle: targetListing.title,
              url: listingUrl,
            })
          )
        }
      }

      // 3.2. SPECIFIC SERVICE / PRODUCT INQUIRY FROM LISTING CATALOG
      // Matches: "interested in "<Item>" from <Business> (Ref: ...)"
      if (lower.includes('interested in "') || (lower.includes('interested in') && lower.includes('from'))) {
        const itemMatch = incomingText.match(/interested in ["“']([^"”']+)["”'] from (.+?)(?:\s*\(ref:|$)/i)
        const serviceItemName = itemMatch ? itemMatch[1].trim() : 'Service'
        const rawShopName = itemMatch ? itemMatch[2].trim() : ''

        const targetListing = (store.listings || []).find((l) =>
          (refMatch && (l.id === refMatch[1] || l.slug === refMatch[1])) ||
          (rawShopName && (l.title.toLowerCase().includes(rawShopName.toLowerCase()) || rawShopName.toLowerCase().includes(l.title.toLowerCase())))
        ) || (store.listings || [])[0]

        if (targetListing) {
          const serviceReply =
            `🛍️ *${targetListing.title}* వద్ద *${serviceItemName}* వివరాలు! ✨\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            `మీరు విచారించిన '${serviceItemName}' సేవ/ఉత్పత్తి వివరాలు సిద్ధంగా ఉన్నాయి.\n\n` +
            `📞 *షాప్ ఓనర్ ఫోన్ నంబర్:* +91 ${targetListing.phone}\n` +
            `💬 *షాప్ ఓనర్ వాట్సాప్:* https://wa.me/91${(targetListing.whatsapp || targetListing.phone).replace(/\D/g, '')}\n` +
            `📍 *షాప్ లొకేషన్:* ${targetListing.address || 'చౌటుప్పల్, తెలంగాణ'}\n\n` +
            `👉 *పూర్తి సర్వీస్ మెనూ, ధరలు & ఫోటోల కోసం మినీ వెబ్‌సైట్ చూడండి:*\n` +
            `🌐 ${townUrl}/business/${targetListing.slug || targetListing.id}\n\n` +
            `📢 చౌటుప్పల్ యాప్ హెల్ప్‌లైన్: 9494348175`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: serviceReply,
            imageUrl: targetListing.coverImage,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          return NextResponse.json(
            withShadow({
              status: 'service_inquiry_dispatched',
              listingId: targetListing.id,
              serviceItem: serviceItemName,
            })
          )
        }
      }

      // 3.3. ADVERTISING & PROMOTIONS (BANNER, STORY AD, REELS PROMO, BULK MSG, FESTIVAL)
      if (
        lower.includes('banner ad') ||
        lower.includes('బ్యానర్ అడ్') ||
        lower.includes('బ్యానర్ ప్రమోషన్') ||
        lower.includes('book a banner') ||
        lower.includes('story ad') ||
        lower.includes('99/day') ||
        lower.includes('promote my reel') ||
        lower.includes('reels promo') ||
        lower.includes('299/3 days') ||
        lower.includes('bulk promo') ||
        lower.includes('bulk msg') ||
        lower.includes('499 bulk') ||
        lower.includes('promote my listing') ||
        lower.includes('listings promo') ||
        lower.includes('199/week') ||
        lower.includes('festival greeting') ||
        lower.includes('ఫెస్టివల్') ||
        lower.includes('greeting for ₹149')
      ) {
        let promoTitle = 'చౌటుప్పల్ యాప్ ప్రమోషన్ ప్యాకేజీలు'
        let promoDetails = ''

        if (lower.includes('story ad') || lower.includes('99')) {
          promoTitle = 'హోమ్‌పేజీ స్టోరీ యాడ్ (₹99 / రోజు)'
          promoDetails =
            `• యాప్ హోమ్‌పేజీ టాప్ సర్కిల్స్‌లో మీ షాప్ ఆఫర్ లేదా ఫోటో 24 గంటల పాటు ప్రదర్శించబడుతుంది\n` +
            `• 5,000+ స్థానిక కస్టమర్ల వీక్షణ & డైరెక్ట్ వాట్సాప్ లీడ్స్\n` +
            `• ధర: ₹99/రోజు మాత్రమే`
        } else if (lower.includes('reel') || lower.includes('రీల్') || lower.includes('299')) {
          promoTitle = 'రీల్స్ & షార్ట్స్ ప్రమోషన్ (₹299 / 3 రోజులు)'
          promoDetails =
            `• మీ షాప్ వీడియో రీల్‌ను హోమ్‌పేజీ రీల్స్ రైల్ మరియు యూట్యూబ్/ఇన్‌స్టాగ్రామ్‌లో 3 రోజుల పాటు ప్రమోట్ చేస్తాము\n` +
            `• వ్యూయర్ అనలిటిక్స్ & డైరెక్ట్ కస్టమర్ ఎంక్వైరీలు\n` +
            `• ధర: ₹299 (3 రోజుల వ్యవధి)`
        } else if (lower.includes('bulk') || lower.includes('బల్క్') || lower.includes('499')) {
          promoTitle = 'బల్క్ వాట్సాప్ ప్రమోషన్ (₹499 / క్యాంపెయిన్)'
          promoDetails =
            `• చౌటుప్పల్ మరియు పరిసర గ్రామాలలోని 1,000+ ధృవీకరించబడిన స్థానిక కస్టమర్లకు డైరెక్ట్ WhatsApp బ్రాడ్‌కాస్ట్\n` +
            `• మీ షాప్ ఫోటో, ఆఫర్ వివరణ & ఆర్డర్ బటన్లతో తక్షణ డెలివరీ\n` +
            `• ధర: ₹499 ప్రతి క్యాంపెయిన్‌కు`
        } else if (lower.includes('promote my listing') || lower.includes('listings promo') || lower.includes('199')) {
          promoTitle = 'కేటగిరీ టాప్ లిస్టింగ్ ప్రమోషన్ (₹199 / వారం)'
          promoDetails =
            `• మీ కేటగిరీ శోధనలో మీ షాప్ నెంబర్ #1 స్థానంలో పిన్ చేయబడుతుంది\n` +
            `• 'Verified Featured' బ్యాడ్జ్ & డైరెక్ట్ కాల్/వాట్సాప్ బటన్లు\n` +
            `• ధర: ₹199 / వారం`
        } else if (lower.includes('festival') || lower.includes('ఫెస్టివల్') || lower.includes('149')) {
          promoTitle = 'ఫెస్టివల్ గ్రీటింగ్ డిజిటల్ పోస్టర్ (₹149)'
          promoDetails =
            `• మీ షాప్ పేరు, లోగో & మొబైల్ నంబర్‌తో ప్రొఫెషనల్ పండుగ శుభాకాంక్షల హెచ్‌డీ పోస్టర్ డిజైన్\n` +
            `• యాప్ కమ్యూనిటీ ఫీడ్‌లో పోస్ట్ & సోషల్ మీడియా షేరింగ్ ఫైల్\n` +
            `• ధర: ₹149 మాత్రమే`
        } else {
          promoTitle = 'చౌటుప్పల్ యాప్ బ్యానర్ అడ్వర్టైజింగ్ ప్యాకేజీలు'
          promoDetails =
            `• స్టాండర్డ్ బ్యానర్: ₹499 / నెల (హోమ్‌పేజీ రొటేషన్ + కాల్ బటన్)\n` +
            `• ప్రీమియం స్పాన్సర్డ్: ₹999 / నెల (టాప్ పిన్డ్ + WhatsApp ఆర్డర్ బటన్ + సోషల్ ప్రమోషన్)`
        }

        const bannerReply =
          `📢 *${promoTitle}* 🎯\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n\n` +
          `${promoDetails}\n\n` +
          `💡 *మీ యాడ్ బుక్ చేసుకోవడానికి:*\n` +
          `మీ షాప్ పేరు, ఫోటో/వీడియో మరియు ఆఫర్ వివరాలను ఈ చాట్ లోనే పంపించండి. మా డిజైనర్ టీమ్ 2 గంటల్లో లైవ్ చేస్తుంది!\n\n` +
          `📞 అడ్వర్టైజింగ్ హెల్ప్‌లైన్: 9494348175\n` +
          `🌐 Website: ${townUrl}`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: bannerReply,
          imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'ad_promotion_dispatched', package: promoTitle }))
      }

      // 3.7. UPGRADE LISTING TO FEATURED FLOW
      if (
        lower.includes('upgrade my listing to featured') ||
        lower.includes('featured listing') ||
        lower.includes('ఫీచర్డ్ లిస్టింగ్')
      ) {
        const upgradeReply =
          `🌟 *చౌటుప్పల్ ఫీచర్డ్ & ప్రీమియం లిస్టింగ్ అప్‌గ్రేడ్* 🚀\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n` +
          `మీ వ్యాపారాన్ని కేటగిరీ సెర్చ్‌లో టాప్‌లో ఉంచి 10 రెట్లు ఎక్కువ కస్టమర్లను పొందడానికి ఫీచర్డ్ ప్లాన్ అందుబాటులో ఉంది:\n\n` +
          `✨ *ఫీచర్లు:*\n` +
          `• కేటగిరీలో నెంబర్ #1 స్థానం\n` +
          `• 'Verified Featured' గోల్డెన్ స్టార్ బ్యాడ్జ్\n` +
          `• వాట్సాప్ బాట్ సిఫార్సులలో మొదటి ప్రాధాన్యత\n` +
          `• ఉచిత కలర్ కౌంటర్ QR స్టాండీ\n\n` +
          `👉 *వెంటనే అప్‌గ్రేడ్ చేసుకోవడానికి లింక్:*\n` +
          `🌐 ${townUrl}/dashboard\n\n` +
          `📞 హెల్ప్‌లైన్: 9494348175`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: upgradeReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'featured_upgrade_info_dispatched' }))
      }

      // 3.8. GENERAL ASSISTANCE & SUPPORT HELPLINE FLOW
      if (
        lower.includes('need assistance') ||
        lower.includes('faced an issue') ||
        lower.includes('సహాయం కావాలి') ||
        lower.includes('update my merchant profile') ||
        lower === 'support' ||
        lower === 'హెల్ప్‌లైన్'
      ) {
        const supportReply =
          `🤝 *చౌటుప్పల్ యాప్ అధికారిక సపోర్ట్ & హెల్ప్‌డెస్క్* 🛠️\n\n` +
          `నమస్కారం ${senderName} గారు! మేము మీకు ఎలా సహాయపడగలం?\n\n` +
          `1️⃣ మీ షాప్ వివరాలను ఉచితంగా చేర్చడానికి -> 'నా వ్యాపారాన్ని చేర్చండి' అని పంపండి\n` +
          `2️⃣ ఉచిత షాప్ కౌంటర్ QR స్టాండీ కోసం -> 'QR' అని పంపండి\n` +
          `3️⃣ నేటి స్టోరీలు & ఆఫర్ల కోసం -> 'Stories' అని పంపండి\n` +
          `4️⃣ మీ డ్యాష్‌బోర్డ్ పాస్‌వర్డ్-లెస్ లాగిన్ కోసం -> 'Login' అని పంపండి\n` +
          `5️⃣ బ్యానర్ యాడ్స్ & బిజినెస్ ప్రమోషన్ల కోసం -> 'Banner' అని పంపండి\n\n` +
          `📞 నేరుగా మాట్లాడటానికి అడ్మిన్ హెల్ప్‌లైన్: 9494348175\n` +
          `🌐 అధికారిక పోర్టల్: ${townUrl}`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: supportReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'support_menu_dispatched' }))
      }

      // 3.9. WARD COMMUNITY WHATSAPP GROUP FLOW
      if (lower.includes('community whatsapp group') || (lower.includes('ward') && lower.includes('group'))) {
        const wardMatch = incomingText.match(/ward\s*(\d+)/i)
        const wardNum = wardMatch ? wardMatch[1] : '1'
        const wardReply =
          `👥 *చౌటుప్పల్ వార్డ్ ${wardNum} కమ్యూనిటీ వాట్సాప్ గ్రూప్* 📢\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n` +
          `మీ వార్డ్ పరిధిలోని స్థానిక వార్తలు, మున్సిపల్ సమాచారం, తాగునీరు, విద్యుత్ మరియు అత్యవసర సేవల అప్‌డేట్స్ పొందడానికి గ్రూప్‌లో చేరండి:\n\n` +
          `👉 *వార్డ్ ${wardNum} అధికారిక గ్రూప్ లింక్:*\n` +
          `🌐 https://chat.whatsapp.com/choutuppal-ward-${wardNum}\n\n` +
          `🌐 Website: ${townUrl}/community`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: wardReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'ward_group_dispatched', ward: wardNum }))
      }

      // 3.10. LOCAL NEWS SUBMISSION FLOW
      if (
        lower.includes('ముఖ్యమైన వార్త') ||
        lower.includes('వార్త') ||
        (lower.includes('news') && (lower.includes('post') || lower.includes('send') || lower.includes('update') || lower.includes('యాప్ లో')))
      ) {
        const newApprovalId = `appr_news_${Date.now()}`
        store.approvals.unshift({
          id: newApprovalId,
          territoryId: territory.id,
          type: 'NEWS' as any,
          title: `News Submission from ${senderName}`,
          submitterName: senderName,
          submitterPhone: senderPhone,
          status: 'pending',
          data: {
            text: incomingText,
            phone: senderPhone,
          },
          submittedAt: new Date().toISOString(),
        })

        const newsAckMsg =
          `📢 *చౌటుప్పల్ లోకల్ న్యూస్ & మీడియా డెస్క్* 📰\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n` +
          `మీరు పంపిన వార్త/ఈవెంట్ సమాచారం మా ఎడిటోరియల్ టీమ్‌కు చేరింది.\n\n` +
          `దయచేసి వార్తకు సంబంధించిన ఫోటోలు, వీడియోలు లేదా ప్రెస్ నోట్ వివరాలను ఇక్కడే పంపించండి. మా ఎడిటర్స్ పరిశీలించి యాప్‌లో మరియు సోషల్ మీడియాలో వెంటనే ప్రచురిస్తారు.\n\n` +
          `🌐 లైవ్ న్యూస్ చూడటానికి: ${townUrl}/news\n` +
          `📞 న్యూస్ డెస్క్ హెల్ప్‌లైన్: 9494348175`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: newsAckMsg,
          imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'news_submission_queued', approvalId: newApprovalId }))
      }

      // 3.11. SPIN & WIN REWARD CLAIM FLOW
      if (
        lower.includes('spin & win') ||
        lower.includes('స్పిన్') ||
        lower.includes('claim my reward') ||
        (lower.includes('won') && (lower.includes('prize') || lower.includes('spin')))
      ) {
        const prizeMatch = incomingText.match(/won ["“']?([^"”']+)["”']? on spin/i)
        const prizeName = prizeMatch ? prizeMatch[1].trim() : 'స్పిన్ రివార్డ్'

        const spinClaimMsg =
          `🎉 *చౌటుప్పల్ స్పిన్ & విన్ బహుమతి నిర్ధారణ* 🎁\n\n` +
          `నమస్కారం ${senderName} గారు! అభినందనలు! 🎊\n` +
          `మీరు గెలుచుకున్న బహుమతి: *${prizeName}*\n\n` +
          `మీ రివార్డును యాక్టివేట్ చేయడానికి మీ పేరు మరియు షాప్/కాలనీ వివరాలు ఇక్కడ పంపించండి. మా టీమ్ మీ ఆఫర్ డిస్కౌంట్ కూపన్ కోడ్‌ను వెంటనే జారీ చేస్తుంది!\n\n` +
          `🌐 మీ డ్యాష్‌బోర్డ్: ${townUrl}/dashboard\n` +
          `📞 హెల్ప్‌లైన్: 9494348175`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: spinClaimMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'spin_reward_claim_dispatched', prize: prizeName }))
      }

      // 3.12. REAL ESTATE DIRECT INQUIRY & VENTURE ADVERTISING
      if (
        lower.includes('interested in real estate') ||
        lower.includes('looking for property in choutuppal') ||
        lower.includes('advertise my real estate venture')
      ) {
        let propTitle = ''
        const propMatch = incomingText.match(/interested in real estate property:\s*(.+)$/i)
        if (propMatch) {
          propTitle = propMatch[1].trim()
        }

        const isVentureAd = lower.includes('advertise my real estate venture')

        const reReply = isVentureAd
          ? `🏡 *చౌటుప్పల్ రియల్ ఎస్టేట్ వెంచర్ అడ్వర్టైజింగ్ డెస్క్* 🚀\n\n` +
            `నమస్కారం ${senderName} గారు! మీ DTCP/HMDA లేఅవుట్, ఓపెన్ ప్లాట్లు లేదా కమర్షియల్ ప్రాపర్టీలను వేలాది మంది హైదరాబాదీ మరియు స్థానిక కొనుగోలుదారులకు చేరువ చేయడానికి మా ప్లాట్‌ఫామ్ సిద్ధంగా ఉంది:\n\n` +
            `• వెరిఫైడ్ డ్రోన్ వీడియో షూట్ & హోమ్‌పేజీ రైల్ డిస్‌ప్లే\n` +
            `• డైరెక్ట్ వాట్సాప్ సైట్ విజిట్ లీడ్స్ (జీరో బ్రోకరేజ్)\n\n` +
            `మీ వెంచర్ బ్రోచర్/లొకేషన్ ఇక్కడ పంపించండి. మా రియల్ ఎస్టేట్ మేనేజర్ (9494348175) మిమ్మల్ని వెంటనే సంప్రదిస్తారు!\n` +
            `🌐 పోర్టల్: ${townUrl}/real-estate`
          : `🏡 *చౌటుప్పల్ రియల్ ఎస్టేట్ & ఓపెన్ ప్లాట్ల సమాచారం* 📍\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            (propTitle ? `మీరు ఆసక్తి చూపిన వెంచర్: *${propTitle}*\n\n` : '') +
            `చౌటుప్పల్, NH-65 హైవే మరియు పరిసర ప్రాంతాలలో 100% క్లియర్ టైటిల్, DTCP & HMDA అప్రూవ్డ్ ఓపెన్ ప్లాట్లు, అగ్రికల్చర్ ఫామ్‌ల్యాండ్స్ మరియు ఇళ్ల వివరాలు సిద్ధంగా ఉన్నాయి.\n\n` +
            `ఉచిత సైట్ విజిట్ లేదా ధరల బ్రోచర్ కోసం మా వెరిఫైడ్ ప్రాపర్టీ అడ్వైజర్ మిమ్మల్ని వెంటనే సంప్రదిస్తారు.\n\n` +
            `📞 ప్రాపర్టీ డెస్క్: 9494348175\n` +
            `🌐 అన్ని ప్లాట్లు చూడండి: ${townUrl}/real-estate`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: reReply,
          imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'real_estate_inquiry_dispatched', property: propTitle || 'general' }))
      }

      // 3.13. ON-DEMAND SERVICE DIRECT INQUIRY & REGISTRATION
      if (
        (lower.includes('i need') && lower.includes('service in choutuppal')) ||
        lower.includes('i want to list my service on the app')
      ) {
        if (lower.includes('list my service')) {
          const listSrvMsg =
            `🛠️ *చౌటుప్పల్ టెక్నీషియన్ & సర్వీసెస్ ఉచిత రిజిస్ట్రేషన్* 🤝\n\n` +
            `నమస్కారం ${senderName} గారు! మీరు టాక్సీ డ్రైవర్, ఆటో ఓనర్, ఎలక్ట్రీషియన్, ప్లంబర్ లేదా టెక్నీషియన్ అయితే, మీ సేవలను చౌటుప్పల్ యాప్‌లో ఉచితంగా నమోదు చేయండి:\n\n` +
            `👉 నమోదు లింక్: ${townUrl}/register\n\n` +
            `లేదా మీ పేరు, వృత్తి మరియు మొబైల్ నంబర్ ఇక్కడే పంపించండి, మా అడ్మిన్ టీమ్ నమోదు చేస్తుంది.\n` +
            `📞 హెల్ప్‌లైన్: 9494348175`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: listSrvMsg,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          return NextResponse.json(withShadow({ status: 'service_registration_prompt_sent' }))
        } else {
          const srvMatch = incomingText.match(/i need (.+?) service in choutuppal/i)
          const requestedService = srvMatch ? srvMatch[1].trim() : 'ఆన్-డిమాండ్ సర్వీస్'

          const srvBookingMsg =
            `⚡ *చౌటుప్పల్ ఎమర్జెన్సీ & ఆన్-డిమాండ్ సర్వీస్ బుకింగ్* 🛠️\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            `మీరు కోరిన సేవ: *${requestedService}*\n\n` +
            `మీ సమస్య మరియు పికప్/ఇంటి లొకేషన్ వివరాలను ఇక్కడ మెసేజ్ చేయండి. మా వెరిఫైడ్ టెక్నీషియన్ 15-30 నిమిషాల్లో మిమ్మల్ని సంప్రదిస్తారు.\n\n` +
            `📞 అర్జంట్ కాల్ హెల్ప్‌లైన్: 9494348175\n` +
            `🌐 అన్ని సేవలు చూడండి: ${townUrl}/services`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: srvBookingMsg,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          return NextResponse.json(withShadow({ status: 'on_demand_service_requested', service: requestedService }))
        }
      }

      // 3.14. CLAIMING OFFER & STORY/BANNER QUICK REPLIES
      if (
        lower.includes('claiming offer') ||
        lower.includes('saw your story from') ||
        lower.includes('regarding story from') ||
        lower.includes('regarding banner')
      ) {
        const claimReply =
          `🎁 *చౌటుప్పల్ ఆఫర్ & ప్రమోషన్ ఎంక్వైరీ నిర్ధారణ* ✨\n\n` +
          `నమస్కారం ${senderName} గారు! 🙏\n` +
          `మీ ఎంక్వైరీ సంబంధిత వ్యాపార నిర్వాహకులకు చేరింది. త్వరలో వారు మీకు ప్రత్యేక ఆఫర్ వివరాలు లేదా సమాధానం అందిస్తారు.\n\n` +
          `👉 *అన్ని లైవ్ స్టోరీలు & ఆఫర్లు చూడండి:*\n` +
          `🌐 ${townUrl}/stories\n\n` +
          `📞 హెల్ప్‌లైన్: 9494348175`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: claimReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'story_offer_inquiry_dispatched' }))
      }

      // 3.4. SHOP COUNTER QR STANDEE DISPATCH & PRINT LINK
      if (
        buttonPayload === 'btn_my_qr' ||
        lower === 'qr' ||
        lower === 'క్యూఆర్' ||
        lower.includes('qr code') ||
        lower.includes('క్యూఆర్ కోడ్') ||
        lower.includes('my qr') ||
        lower.includes('షాప్ qr') ||
        lower.includes('standee') ||
        lower.includes('స్టాండీ')
      ) {
        if (matchedListing) {
          const standeePrintUrl = `${townUrl}/business/${matchedListing.slug || matchedListing.id}/qr`
          const listingUrl = `${townUrl}/business/${matchedListing.slug || matchedListing.id}`
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&format=png&data=${encodeURIComponent(
            listingUrl
          )}`

          const qrMsg =
            `🏢 *${matchedListing.title}* అధికారిక కౌంటర్ QR స్టాండీ! 🖨️\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            `మీ షాప్ కోసం చౌటుప్పల్ యాప్ అధికారిక బ్రాండెడ్ కౌంటర్ QR స్టాండీ సిద్ధంగా ఉంది.\n\n` +
            `👉 *కలర్ ప్రింట్ తీసుకోవడానికి లింక్ (Print A4):*\n` +
            `🌐 ${standeePrintUrl}\n\n` +
            `👉 *షాప్ ఆన్‌లైన్ ప్రొఫైల్:*\n` +
            `🌐 ${listingUrl}\n\n` +
            `💡 *వ్యాపారులకు సూచన:*\n` +
            `ఈ మెసేజ్ లేదా లింక్‌ను మీ సమీపంలోని జిరాక్స్ / ఫ్లెక్స్ ప్రింటింగ్ షాపుకు WhatsApp ద్వారా ఫార్వర్డ్ చేసి, A4 కలర్ ప్రింట్ తీసి మీ షాప్ కౌంటర్‌పై పెట్టుకోండి. కస్టమర్లు స్కాన్ చేయగానే మీ ఆఫర్లు, ఫోటోలు చూస్తారు మరియు నేరుగా WhatsApp లో ఆర్డర్ చేయగలరు!\n\n` +
            `📢 Helpline: 9494348175 | Website: ${townUrl}`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            contactName: matchedListing.title,
            direction: 'outbound',
            messageText: qrMsg,
            imageUrl: qrImageUrl,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          return NextResponse.json(
            withShadow({
              status: 'shop_qr_standee_dispatched',
              listingId: matchedListing.id,
              qrPrintUrl: standeePrintUrl,
            })
          )
        } else {
          const generalQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&format=png&data=${encodeURIComponent(
            townUrl
          )}`
          const noListingMsg =
            `📲 *చౌటుప్పల్ యాప్ షాప్ కౌంటర్ QR స్టాండీ* 🖨️\n\n` +
            `నమస్కారం ${senderName} గారు! 🙏\n` +
            `మీ షాప్ లేదా వ్యాపారం కోసం ఉచిత బ్రాండెడ్ కౌంటర్ QR స్టాండీని పొందడానికి, ముందుగా మీ వ్యాపార వివరాలను నమోదు చేసుకోండి:\n\n` +
            `👉 ఉచిత నమోదు లింక్: ${townUrl}/register\n\n` +
            `లేదా మీ షాప్ వివరాలను ఇక్కడే WhatsApp లో పంపడానికి 'నా వ్యాపారాన్ని చేర్చండి' అని రిప్లై ఇవ్వండి.\n` +
            `🌐 Website: ${townUrl}`

          store.messages.unshift({
            id: `msg_out_${Date.now()}`,
            territoryId: territory.id,
            phone: senderPhone,
            direction: 'outbound',
            messageText: noListingMsg,
            imageUrl: generalQrUrl,
            status: 'sent',
            createdAt: new Date().toISOString(),
          })

          return NextResponse.json(withShadow({ status: 'qr_registration_prompt_sent' }))
        }
      }

      // 3. MAGIC LOGIN LINK REQUEST
      if (lower.includes('dashboard') || lower.includes('డ్యాష్‌బోర్డ్') || lower.includes('login') || lower.includes('magic')) {
        const token = generateMagicToken(senderPhone)
        const magicMsg =
          `🔑 *${territoryName} సురక్షిత డ్యాష్‌బోర్డ్ లాగిన్ లింక్*\n\n` +
          `నమస్కారం ${senderName} గారు, మీ డ్యాష్‌బోర్డ్‌ను పాస్‌వర్డ్ లేకుండా తెరవడానికి క్రింది సురక్షిత లింక్‌ను నొక్కండి (15 నిమిషాల వ్యవధి మాత్రమే):\n\n` +
          `👉 ${townUrl}/login?magic=${token}&territory=${territory.slug}\n\n` +
          `మీ వ్యాపార లిస్టింగ్‌లు, ఫోటోలు, లీడ్స్ మరియు ఎంక్వైరీలను ఇక్కడి నుండి నిర్వహించుకోవచ్చు.\n` +
          `🌐 Website: ${townUrl}`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: magicMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'magic_link_dispatched' }))
      }

      // 3.5. STORIES & DAILY OFFERS REQUEST VIA WHATSAPP (KEYWORD OR BUTTON CLICK)
      if (
        buttonPayload === 'btn_stories' ||
        lower.includes('stories') ||
        lower.includes('స్టోరీస్') ||
        lower.includes('ఆఫర్స్') ||
        lower.includes('offers') ||
        lower.includes('స్టోరీ')
      ) {
        const activeStories = (store.stories || []).filter((s) => s.status === 'published')
        const activeOffers = (store.offers || []).filter((o) => o.status === 'published')

        let storiesSummary = ''
        if (activeOffers.length > 0) {
          storiesSummary += `\n*🛍️ నేటి ప్రత్యేక డిస్కౌంట్లు & ఆఫర్లు:*\n`
          activeOffers.slice(0, 3).forEach((off, idx) => {
            storiesSummary += `${idx + 1}. *${off.businessName}*: ${off.title} (${off.discount})\n`
          })
        }

        if (activeStories.length > 0) {
          storiesSummary += `\n*🔥 లైవ్ బిజినెస్ స్టోరీస్:*\n`
          activeStories.slice(0, 3).forEach((st, idx) => {
            storiesSummary += `• *${st.businessName}*: ${st.caption || 'Live Update'}\n`
          })
        }

        const storiesMsg =
          `✨ *${territoryName} నేటి ప్రత్యేక స్టోరీస్ & ఆఫర్లు* 🛍️\n` +
          storiesSummary +
          `\n👉 *మొబైల్ స్టేటస్ మాదిరిగా ఫుల్‌స్క్రీన్‌లో అన్ని స్టోరీలు వీక్షించడానికి:*\n` +
          `🌐 ${townUrl}/stories\n\n` +
          `💡 మీ షాప్ ఆఫర్‌ను లేదా స్టోరీని పోస్ట్ చేయడానికి 'ఆఫర్ పోస్ట్' అని పంపండి.\n` +
          `🌐 Website: ${townUrl}`

        const topMedia = activeStories[0]?.mediaUrl || activeOffers[0]?.imageUrl || undefined

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: storiesMsg,
          imageUrl: topMedia,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(
          withShadow({
            status: 'stories_dispatched',
            storiesCount: activeStories.length,
            offersCount: activeOffers.length,
            storiesUrl: `${townUrl}/stories`,
          })
        )
      }

      // 3.6. POST STORY / OFFER VIA WHATSAPP -> QUEUE TO APPROVALS
      if (lower.includes('ఆఫర్ పోస్ట్') || lower.includes('post offer') || lower.includes('post story')) {
        const newApprovalId = `appr_offer_${Date.now()}`
        store.approvals.unshift({
          id: newApprovalId,
          territoryId: territory.id,
          type: 'STORY',
          title: `Story/Offer Submission from ${senderName}`,
          submitterName: senderName,
          submitterPhone: senderPhone,
          status: 'pending',
          data: {
            caption: incomingText,
            phone: senderPhone,
          },
          submittedAt: new Date().toISOString(),
        })

        const postAckMsg =
          `ధన్యవాదాలు ${senderName} గారు! 🙏\n\n` +
          `మీ ఆఫర్/స్టోరీ వివరాలు మా అడ్మిన్ టీమ్ పరిశీలనకు చేరాయి. 2 గంటలలోపు పరిశీలించి ఆమోదించబడిన తర్వాత చౌటుప్పల్ యాప్ మరియు వాట్సాప్ బాట్‌లో లైవ్ చేయబడుతుంది.\n\n` +
          `🌐 లైవ్ స్టోరీలు చూడటానికి: ${townUrl}/stories`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: postAckMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'story_queued_for_approval', approvalId: newApprovalId }))
      }

      // 4. NEW LISTING SUBMISSION VIA WHATSAPP -> INSERTS INTO APPROVAL QUEUE WITH TERRITORY
      if (lower.includes('నా వ్యాపారాన్ని చేర్చండి') || lower.includes('add listing') || lower.includes('కొత్త షాప్')) {
        const newApprovalId = `appr_${Date.now()}`
        store.approvals.unshift({
          id: newApprovalId,
          territoryId: territory.id,
          type: 'NEW_LISTING',
          title: `${senderName}'s Business Submission (${territoryName})`,
          submitterName: senderName,
          submitterPhone: senderPhone,
          status: 'pending',
          mediaUrl: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
          data: {
            title: `${senderName}'s Business`,
            category: 'Services',
            address: `${territoryName} Mandal`,
            phone: senderPhone,
            whatsapp: senderPhone,
            description: incomingText,
          },
          submittedAt: new Date().toISOString(),
        })

        const ackMsg =
          `ధన్యవాదాలు ${senderName} గారు! 🙏\n\n` +
          `మీ వ్యాపార వివరాలు ${territoryName} పోర్టల్‌లో నమోదు చేయబడ్డాయి. మా అడ్మిన్ టీమ్ వివరాలను పరిశీలించి (24 గంటలలోపు) ఆమోదించిన తర్వాత వెబ్‌సైట్ మరియు వాట్సాప్ బాట్‌లో లైవ్ చేయబడుతుంది.\n\n` +
          `స్టేటస్ తెలుసుకోవడానికి ఎప్పుడైనా 'Status' అని మెసేజ్ చేయండి.\n` +
          `🌐 Website: ${townUrl}`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: ackMsg,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'listing_queued_for_approval', approvalId: newApprovalId, territoryId: territory.id }))
      }

      // 5. FRANCHISE APPLICATION VIA WHATSAPP
      if (lower.includes('franchise') || lower.includes('ఫ్రాంచైజీ')) {
        store.approvals.unshift({
          id: `appr_fr_${Date.now()}`,
          territoryId: FLAGSHIP_TERRITORY_ID,
          type: 'FRANCHISE_APP',
          title: `Franchise Application from ${senderName}`,
          submitterName: senderName,
          submitterPhone: senderPhone,
          status: 'pending',
          data: {
            proposedArea: incomingText.replace(/franchise|ఫ్రాంచైజీ/gi, '').trim() || 'Nearby Town',
            email: '',
            experience: 'Inbound WhatsApp Applicant',
          },
          submittedAt: new Date().toISOString(),
        })

        const frAck =
          `🚀 సూపర్ యాప్ సిటీ ఫ్రాంచైజీపై ఆసక్తి చూపినందుకు ధన్యవాదాలు!\n\n` +
          `మీ దరఖాస్తు మా సెంట్రల్ అడ్మిన్ డెస్క్‌కు చేరింది. మీ పట్టణంలో సూపర్ యాప్ మరియు వాట్సాప్ బాట్ ప్రారంభించే వివరాలతో మా ప్రతినిధి (9494348175) త్వరలో మిమ్మల్ని సంప్రదిస్తారు.\n\n` +
          `🌐 బ్రోచర్ & వివరాలు: https://choutuppal.in/admin/franchise`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: FLAGSHIP_TERRITORY_ID,
          phone: senderPhone,
          direction: 'outbound',
          messageText: frAck,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'franchise_applied' }))
      }

      // 6. PUBLISHED WHATSAPP FLOW EXECUTION ENGINE (Precedence over hardcoded fallbacks)
      const flowResult = evaluateFlow({
        incomingText,
        senderPhone,
        senderName,
        territory,
        contact: existingContact,
        storeFlows: store.flows,
        storeListings: store.listings,
        buttonPayload,
        buttonTitle,
      })

      if (flowResult.matched && flowResult.messageText) {
        const dispatchRes = await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: flowResult.messageText,
          imageUrl: flowResult.imageUrl,
          mediaUrl: flowResult.mediaUrl,
          mediaType: flowResult.mediaType,
          buttons: flowResult.buttons,
          listSections: flowResult.listSections,
          listButtonText: flowResult.listButtonText,
          footerText: flowResult.footerText,
          territoryId: territory.id,
          contactName: senderName,
        }, store)

        if (existingContact) {
          if (flowResult.tagToAdd && !existingContact.tags.includes(flowResult.tagToAdd)) {
            existingContact.tags.push(flowResult.tagToAdd)
          }
          if (flowResult.stageToUpdate) {
            existingContact.stage = flowResult.stageToUpdate as any
          }
        }

        return NextResponse.json(
          withShadow({
            status: 'flow_executed',
            flowId: flowResult.flowId,
            flowName: flowResult.flowName,
            nodeId: flowResult.nodeId,
            nodeType: flowResult.nodeType,
            providerDelivered: dispatchRes.providerDelivered,
            territoryId: territory.id,
          })
        )
      }

      // 7. WEBSITE AUTOMATED TRIGGER FALLBACK MATCHING
      // A. Taxi Booking
      if (lower.includes('taxi') || lower.includes('cab')) {
        const taxiReply =
          `🚖 *${territoryName} 24/7 టాక్సీ & క్యాబ్ బుకింగ్*\n\n` +
          `నమస్కారం ${senderName} గారు, ${territoryName} లో మీ ప్రయాణానికి అందుబాటులో ఉన్న టాక్సీలు:\n` +
          `• హైదరాబాద్ ఎయిర్‌పోర్ట్ డ్రాప్స్\n` +
          `• హైవే రౌండ్ ట్రిప్స్\n` +
          `• స్విఫ్ట్ డిజైర్, ఇన్నోవా & ఎర్టిగా (AC)\n\n` +
          `డ్రైవర్ నేరుగా మిమ్మల్ని సంప్రదిస్తారు. లేదా కాల్ చేయండి: ${territory.contactPhone || '9494348175'}\n` +
          `🌐 ${townUrl}/services`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: taxiReply,
          imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
          contactName: senderName,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'taxi_automation_dispatched', territoryId: territory.id }))
      }

      // B. Auto Booking
      if (lower.includes('auto') || lower.includes('ఆటో')) {
        const autoReply =
          `🛺 *${territoryName} మెయిన్ ఆటో స్టాండ్ సర్వీస్*\n\n` +
          `నమస్కారం ${senderName} గారు! లోకల్ టౌన్ మరియు పరిసర గ్రామాల కొరకు ఆటో అందుబాటులో ఉంది.\n` +
          `మీ పికప్ లొకేషన్ పంపండి, సమీప ఆటో డ్రైవర్ త్వరలో చేరుకుంటారు.\n` +
          `🌐 ${townUrl}/services`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: autoReply,
          contactName: senderName,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'auto_automation_dispatched', territoryId: territory.id }))
      }

      // C. Plumber Emergency
      if (lower.includes('plumber') || lower.includes('ప్లంబర్')) {
        const plumberReply =
          `🔧 *${territoryName} ఎమర్జెన్సీ ప్లంబర్ సర్వీస్*\n\n` +
          `నమస్కారం! పైప్ లీకేజీలు, వాటర్ ట్యాంక్ క్లీనింగ్, మోటార్ ఫిట్టింగ్ కొరకు ధృవీకరించబడిన ప్లంబర్లు సిద్ధంగా ఉన్నారు.\n` +
          `మీ లొకేషన్ మరియు సమస్యను ఇక్కడ మెసేజ్ చేయండి.\n` +
          `🌐 ${townUrl}/services`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: plumberReply,
          contactName: senderName,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'plumber_automation_dispatched', territoryId: territory.id }))
      }

      // D. Electrician Emergency
      if (lower.includes('electrician') || lower.includes('ఎలక్ట్రీషియన్')) {
        const electricianReply =
          `⚡ *${territoryName} సర్టిఫైడ్ ఎలక్ట్రీషియన్ సర్వీస్*\n\n` +
          `వైరింగ్, ఇన్వర్టర్ సెటప్, మోటార్ పంప్ రిపేర్ మరియు ఫ్యాన్ ఫిట్టింగ్ కోసం సర్వీస్ రెడీగా ఉంది.\n` +
          `🌐 ${townUrl}/services`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: electricianReply,
          contactName: senderName,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'electrician_automation_dispatched', territoryId: territory.id }))
      }

      // E. Real Estate Inquiry
      if (lower.includes('real estate') || lower.includes('plot') || lower.includes('ప్లాట్')) {
        const realEstateReply =
          `🏡 *${territoryName} రియల్ ఎస్టేట్ & ఓపెన్ ప్లాట్లు*\n\n` +
          `నమస్కారం! ${territoryName} ప్రాంతంలో DTCP/HMDA వెంచర్లు మరియు అగ్రికల్చర్ ల్యాండ్స్ వివరాలు:\n` +
          `• 100% క్లియర్ టైటిల్\n` +
          `• స్పాట్ రిజిస్ట్రేషన్ & బ్యాంక్ లోన్ సదుపాయం\n\n` +
          `మా రియల్ ఎస్టేట్ అడ్వైజర్ మిమ్మల్ని వెంటనే సంప్రదిస్తారు.\n` +
          `🌐 అన్ని ప్లాట్లు చూడండి: ${townUrl}/real-estate`

        await sendWhatsAppFlowMessage({
          toPhone: senderPhone,
          messageText: realEstateReply,
          contactName: senderName,
          territoryId: territory.id,
        }, store)

        return NextResponse.json(withShadow({ status: 'real_estate_automation_dispatched', territoryId: territory.id }))
      }

      // 7. DEFAULT DIRECTORY DISPATCH WITH PHOTOS (Scoped to Territory)
      const matchedCategory = (store.listings || []).find((l) =>
        (l.territoryId || FLAGSHIP_TERRITORY_ID) === territory.id &&
        isListingPublished(l) &&
        (
          (l.categoryName && lower.includes(l.categoryName.toLowerCase())) ||
          (l.categoryId && lower.includes(l.categoryId.toLowerCase().replace('cat-', ''))) ||
          lower.includes(l.title.toLowerCase()) ||
          lower.includes(l.slug.toLowerCase())
        )
      )

      if (matchedCategory) {
        await sendListingWhatsAppCard(senderPhone, matchedCategory, store)
        return NextResponse.json(withShadow({
          status: 'photo_card_dispatched',
          listing: matchedCategory.title,
          territoryId: territory.id,
        }))
      }

      // 8. CATCH-ALL ZERO-TYPING FALLBACK (Dispatches official Welcome Card with banner & 3 buttons)
      await sendWelcomeCard(flowCtx)
      return NextResponse.json(withShadow({ status: 'welcome_card_fallback_dispatched', territoryId: territory.id }))
    })
  } catch (err: any) {
    console.error('[WhatsApp Webhook POST Exception]:', err)
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
  }
}
