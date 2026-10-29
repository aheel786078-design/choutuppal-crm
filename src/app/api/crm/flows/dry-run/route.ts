import { NextResponse } from 'next/server'
import { loadStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { evaluateFlow } from '@/lib/flow-runtime-engine'
import type { WhatsAppFlow, Territory } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_DRY_RUN_PAYLOAD = 64 * 1024 // 64KB

/**
 * POST /api/crm/flows/dry-run
 * Pure, side-effect-free dry-run evaluation of inbound WhatsApp text or button clicks against flows.
 * Returns matched trigger, flow ID, node ID, rendered body, selected media, buttons/lists, and next-node transition.
 * Never mutates store, sends messages, or executes live WhatsApp API calls.
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const rawBody = await req.text()
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_DRY_RUN_PAYLOAD) {
      return NextResponse.json(
        {
          success: false,
          error: `Payload too large. Maximum size is ${MAX_DRY_RUN_PAYLOAD / 1024}KB.`,
        },
        { status: 413 }
      )
    }

    let body: any = {}
    try {
      body = JSON.parse(rawBody || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      )
    }

    const messageText = typeof body.messageText === 'string' ? body.messageText.trim() : ''
    const buttonPayload = typeof body.buttonPayload === 'string' ? body.buttonPayload.trim() : undefined
    const buttonTitle = typeof body.buttonTitle === 'string' ? body.buttonTitle.trim() : undefined

    if (!messageText && !buttonPayload && !buttonTitle) {
      return NextResponse.json(
        { success: false, error: 'messageText or buttonPayload is required for flow dry-run.' },
        { status: 400 }
      )
    }

    const store = loadStore()

    // -------------------------------------------------------------------------
    // TENANT TERRITORY ISOLATION
    // -------------------------------------------------------------------------
    let targetTerritoryId: string
    if (auth.user.role === 'SUPER_ADMIN') {
      targetTerritoryId = body.territoryId || FLAGSHIP_TERRITORY_ID
    } else {
      targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
      if (body.territoryId && body.territoryId !== targetTerritoryId) {
        const terrAuth = await requireTerritoryAccess(req, body.territoryId)
        if (terrAuth.errorResponse) return terrAuth.errorResponse
        targetTerritoryId = body.territoryId
      }
    }

    const territory: Territory =
      (store.territories || []).find((t) => t.id === targetTerritoryId) || {
        id: targetTerritoryId,
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
          heroTitle: 'చౌటుప్పల్ లోకల్ బిజినెస్',
        },
        contactPhone: '9441348175',
        whatsappNumber: '9441348175',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

    // Combine store flows with candidate flows (e.g. from an unsaved CSV import)
    const candidateFlows: WhatsAppFlow[] = Array.isArray(body.candidateFlows)
      ? body.candidateFlows
      : []

    const combinedFlows = [...candidateFlows, ...store.flows]

    // Default allowDraft to true for dry-run simulation so admins can test what they are developing
    const allowDraft = body.allowDraft !== undefined ? Boolean(body.allowDraft) : true
    const filterFlowId = typeof body.filterFlowId === 'string'
      ? body.filterFlowId.trim()
      : (typeof body.flowId === 'string' && body.filterOnly ? body.flowId.trim() : undefined)
    const activeFlowId = typeof body.activeFlowId === 'string'
      ? body.activeFlowId.trim()
      : (typeof body.flowId === 'string' && !body.filterOnly ? body.flowId.trim() : undefined)

    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : '919441348175'
    const contactName = typeof body.contactName === 'string' && body.contactName.trim() ? body.contactName.trim() : 'మిత్రమా'

    const contact = store.contacts?.find((c) => (c.phone || '').replace(/\D/g, '') === phone.replace(/\D/g, ''))

    const result = evaluateFlow({
      incomingText: messageText,
      buttonPayload,
      buttonTitle,
      activeFlowId,
      activeNodeId: typeof body.activeNodeId === 'string' ? body.activeNodeId.trim() : undefined,
      listingPage: typeof body.listingPage === 'number' ? body.listingPage : undefined,
      senderPhone: phone,
      senderName: contact?.name || contactName,
      territory,
      contact,
      storeFlows: combinedFlows,
      storeListings: store.listings,
      allowDraft,
      filterFlowId,
    })

    return NextResponse.json({
      success: true,
      dryRun: true,
      territoryId: targetTerritoryId,
      allowDraft,
      matched: result.matched,
      matchedTrigger: result.matchedTrigger || null,
      flowId: result.flowId || null,
      flowName: result.flowName || null,
      nodeId: result.nodeId || null,
      nodeType: result.nodeType || null,
      renderedBody: result.renderedBody || result.messageText || null,
      selectedMedia: result.selectedMedia || result.imageUrl || null,
      mediaType: result.mediaType || 'image',
      buttons: result.buttons || [],
      listSections: result.listSections || [],
      nextNodeTransition: result.nextNodeTransition || null,
      attachedListing: result.attachedListing || null,
      listing: result.listing || null,
      sortedListings: result.sortedListings || [],
      pagination: result.pagination || null,
      reason: result.reason || null,
    })
  } catch (err: any) {
    console.error('[Flow Dry-Run Exception]:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal dry-run evaluation error.' },
      { status: 500 }
    )
  }
}
