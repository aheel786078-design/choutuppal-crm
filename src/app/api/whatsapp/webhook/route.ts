import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { loadStore, saveStore, mutateStore, generateMagicToken, FLAGSHIP_TERRITORY_ID, isListingPublished } from '@/lib/store'
import { sendListingWhatsAppCard, sendWhatsAppFlowMessage } from '@/lib/whatsapp-cloud-api'
import type { Territory } from '@/lib/types'
import { runAutomationShadowEvaluation } from '@/lib/automation-shadow-runner'
import { evaluateFlow } from '@/lib/flow-runtime-engine'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'choutuppal_verify_token'

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Verification token mismatch', { status: 403 })
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    // 1. Meta Webhook HMAC-SHA256 Signature Verification (Fail-Closed)
    const appSecret = process.env.WHATSAPP_APP_SECRET
    const signatureHeader = req.headers.get('x-hub-signature-256')
    const isProd = process.env.NODE_ENV === 'production'

    if (isProd && (!appSecret || !signatureHeader)) {
      return NextResponse.json(
        { success: false, error: 'Webhook signature required in production' },
        { status: 401 }
      )
    }

    if (appSecret) {
      if (!signatureHeader) {
        return NextResponse.json(
          { success: false, error: 'Missing x-hub-signature-256 header' },
          { status: 401 }
        )
      }
      const signature = signatureHeader.replace(/^sha256=/, '').trim()
      const expectedSignature = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')

      const sigBuffer = Buffer.from(signature)
      const expectedBuffer = Buffer.from(expectedSignature)

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    } else if (signatureHeader) {
      return NextResponse.json(
        { success: false, error: 'Webhook secret not configured on server' },
        { status: 401 }
      )
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

      const webhookMsgId = message.id
      if (webhookMsgId && store.messages) {
        const isDuplicate = store.messages.some(
          (m) => m.id === webhookMsgId || m.providerMessageId === webhookMsgId
        )
        if (isDuplicate) {
          return NextResponse.json({ status: 'ignored_duplicate_webhook', messageId: webhookMsgId })
        }
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
          contactPhone: '9441348175',
          whatsappNumber: '9441348175',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }

      const territoryName = territory.name.split(' ')[0]
      const townDomain = territory.primaryDomain || `${territory.slug}.choutuppal.in`
      const townUrl = territory.isFlagship ? 'https://choutuppal.in' : `https://${townDomain}`

      // 1. Log inbound message with territory isolation
      store.messages.unshift({
        id: `msg_in_${Date.now()}`,
        providerMessageId: webhookMsgId || undefined,
        territoryId: territory.id,
        phone: senderPhone,
        contactName: senderName,
        direction: 'inbound',
        messageText: incomingText,
        status: 'received',
        createdAt: new Date().toISOString(),
      })

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
          `1. 'సవరించండి' - ఫోటోలు లేదా వివరాలు మార్చడానికి\n` +
          `2. 'తొలగించండి' - షాప్ క్లోజ్ అయితే రిమూవ్ చేయడానికి\n` +
          `3. 'కన్ఫర్మ్' - వివరాలు సరైనవే అని ధృవీకరించడానికి\n\n` +
          `🌐 Website: ${townUrl}`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          contactName: matchedListing.title,
          direction: 'outbound',
          messageText: vendorClaimMsg,
          imageUrl: matchedListing.coverImage,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })

        return NextResponse.json(withShadow({ status: 'vendor_claim_sent', listingId: matchedListing.id }))
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
          `మీ దరఖాస్తు మా సెంట్రల్ అడ్మిన్ డెస్క్‌కు చేరింది. మీ పట్టణంలో సూపర్ యాప్ మరియు వాట్సాప్ బాట్ ప్రారంభించే వివరాలతో మా ప్రతినిధి (9441348175) త్వరలో మిమ్మల్ని సంప్రదిస్తారు.\n\n` +
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
          `డ్రైవర్ నేరుగా మిమ్మల్ని సంప్రదిస్తారు. లేదా కాల్ చేయండి: ${territory.contactPhone || '9441348175'}\n` +
          `🌐 ${townUrl}/services`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: taxiReply,
          imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
        return NextResponse.json(withShadow({ status: 'taxi_automation_dispatched', territoryId: territory.id }))
      }

      // B. Auto Booking
      if (lower.includes('auto') || lower.includes('ఆటో')) {
        const autoReply =
          `🛺 *${territoryName} మెయిన్ ఆటో స్టాండ్ సర్వీస్*\n\n` +
          `నమస్కారం ${senderName} గారు! లోకల్ టౌన్ మరియు పరిసర గ్రామాల కొరకు ఆటో అందుబాటులో ఉంది.\n` +
          `మీ పికప్ లొకేషన్ పంపండి, సమీప ఆటో డ్రైవర్ త్వరలో చేరుకుంటారు.\n` +
          `🌐 ${townUrl}/services`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: autoReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
        return NextResponse.json(withShadow({ status: 'auto_automation_dispatched', territoryId: territory.id }))
      }

      // C. Plumber Emergency
      if (lower.includes('plumber') || lower.includes('ప్లంబర్')) {
        const plumberReply =
          `🔧 *${territoryName} ఎమర్జెన్సీ ప్లంబర్ సర్వీస్*\n\n` +
          `నమస్కారం! పైప్ లీకేజీలు, వాటర్ ట్యాంక్ క్లీనింగ్, మోటార్ ఫిట్టింగ్ కొరకు ధృవీకరించబడిన ప్లంబర్లు సిద్ధంగా ఉన్నారు.\n` +
          `మీ లొకేషన్ మరియు సమస్యను ఇక్కడ మెసేజ్ చేయండి.\n` +
          `🌐 ${townUrl}/services`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: plumberReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
        return NextResponse.json(withShadow({ status: 'plumber_automation_dispatched', territoryId: territory.id }))
      }

      // D. Electrician Emergency
      if (lower.includes('electrician') || lower.includes('ఎలక్ట్రీషియన్')) {
        const electricianReply =
          `⚡ *${territoryName} సర్టిఫైడ్ ఎలక్ట్రీషియన్ సర్వీస్*\n\n` +
          `వైరింగ్, ఇన్వర్టర్ సెటప్, మోటార్ పంప్ రిపేర్ మరియు ఫ్యాన్ ఫిట్టింగ్ కోసం సర్వీస్ రెడీగా ఉంది.\n` +
          `🌐 ${townUrl}/services`

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: electricianReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
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

        store.messages.unshift({
          id: `msg_out_${Date.now()}`,
          territoryId: territory.id,
          phone: senderPhone,
          direction: 'outbound',
          messageText: realEstateReply,
          status: 'sent',
          createdAt: new Date().toISOString(),
        })
        return NextResponse.json(withShadow({ status: 'real_estate_automation_dispatched', territoryId: territory.id }))
      }

      // 7. DEFAULT DIRECTORY DISPATCH WITH PHOTOS (Scoped to Territory)
      const matchedCategory = (store.listings || []).find((l) =>
        (l.territoryId || FLAGSHIP_TERRITORY_ID) === territory.id &&
        isListingPublished(l) &&
        (lower.includes(l.categoryName?.toLowerCase() || '') || l.title.toLowerCase().includes(lower))
      )

      if (matchedCategory) {
        await sendListingWhatsAppCard(senderPhone, matchedCategory, store)
        return NextResponse.json(withShadow({
          status: 'photo_card_dispatched',
          listing: matchedCategory.title,
          territoryId: territory.id,
        }))
      }

      return NextResponse.json(withShadow({ status: 'processed_ok', territoryId: territory.id }))
    })
  } catch (err: any) {
    console.error('[WhatsApp Webhook POST Exception]:', err)
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 })
  }
}
