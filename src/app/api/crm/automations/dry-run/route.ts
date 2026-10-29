import { NextResponse } from 'next/server'
import { loadStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { evaluateAutomations } from '@/lib/automation-engine'
import type { TerritoryContext, ContactContext } from '@/lib/automation-engine'
import type { AutomationRule, Territory } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_DRY_RUN_PAYLOAD = 64 * 1024 // 64KB

/**
 * POST /api/crm/automations/dry-run
 * Pure, side-effect-free dry-run evaluation of inbound messages against automation rules.
 * Never mutates store, sends messages, or executes code.
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
    if (!messageText) {
      return NextResponse.json(
        { success: false, error: 'messageText is required for dry-run evaluation.' },
        { status: 400 }
      )
    }

    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : '919441348175'
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : undefined
    const providerMessageId = typeof body.providerMessageId === 'string' ? body.providerMessageId.trim() : undefined
    const requestedRuleIds = Array.isArray(body.ruleIds) ? body.ruleIds : undefined

    // -------------------------------------------------------------------------
    // TENANT TERRITORY ISOLATION
    // -------------------------------------------------------------------------
    let targetTerritoryId: string
    if (auth.user.role === 'SUPER_ADMIN') {
      targetTerritoryId = body.territoryId || FLAGSHIP_TERRITORY_ID
    } else {
      targetTerritoryId = auth.user.territoryId || FLAGSHIP_TERRITORY_ID
      if (body.territoryId && body.territoryId !== targetTerritoryId) {
        return NextResponse.json(
          {
            success: false,
            error: `Access forbidden: You cannot dry-run automations for territory "${body.territoryId}".`,
          },
          { status: 403 }
        )
      }
    }

    const store = loadStore()

    // Resolve territory details
    const territoryRecord: Territory | undefined = (store.territories || []).find(
      (t) => t.id === targetTerritoryId
    )

    const territoryContext: TerritoryContext = {
      territoryId: targetTerritoryId,
      territoryName: territoryRecord?.name || 'Choutuppal',
      primaryDomain: territoryRecord?.primaryDomain || 'choutuppal.in',
      contactPhone: territoryRecord?.contactPhone || '9441348175',
      whatsappNumber: territoryRecord?.whatsappNumber || '9441348175',
    }

    // Resolve rules strictly scoped to territory (or global)
    let candidateRules: AutomationRule[] = (store.automations || []).filter(
      (r) => (r.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritoryId || r.isGlobal === true
    )

    if (requestedRuleIds && requestedRuleIds.length > 0) {
      candidateRules = candidateRules.filter((r) => requestedRuleIds.includes(r.id))
    }

    const simulateDrafts = Boolean(body.simulateDrafts)
    if (simulateDrafts) {
      candidateRules = candidateRules.map((r) => {
        if (r.status === 'draft') {
          return { ...r, status: 'active' as const, isActive: true }
        }
        return r
      })
    }

    // Look up contact if exists
    const cleanPhone = phone.replace(/\D/g, '')
    const existingContact = (store.contacts || []).find(
      (c) => c.phone.replace(/\D/g, '') === cleanPhone
    )

    const contactContext: ContactContext = existingContact
      ? {
          id: existingContact.id,
          name: existingContact.name,
          phone: existingContact.phone,
          tags: existingContact.tags,
          stage: existingContact.stage,
          messageCount: existingContact.messageCount,
          lastContactAt: existingContact.lastContactAt,
          isFirstInbound: existingContact.messageCount === 0,
        }
      : {
          name: contactName || 'Citizen',
          phone,
          messageCount: 0,
          isFirstInbound: true,
        }

    // Pure evaluation
    const evaluationResult = evaluateAutomations({
      event: {
        messageText,
        phone,
        providerMessageId,
        contactName: contactContext.name,
        timestamp: new Date().toISOString(),
      },
      territory: territoryContext,
      rules: candidateRules,
      contact: contactContext,
      requireIdempotency: Boolean(body.requireIdempotency),
      cooldownSeconds: typeof body.cooldownSeconds === 'number' ? body.cooldownSeconds : undefined,
    })

    return NextResponse.json({
      success: true,
      dryRun: true,
      dispatched: false,
      simulateDrafts,
      territoryId: targetTerritoryId,
      event: {
        messageText,
        phone,
        providerMessageId,
      },
      evaluation: evaluationResult,
      notice: simulateDrafts
        ? 'Dry-run completed in sandbox (Draft rules evaluated in simulation mode). Zero store mutations or external WhatsApp dispatches occurred.'
        : 'Dry-run completed in sandbox. Zero store mutations or external WhatsApp dispatches occurred.',
    })
  } catch (error: any) {
    console.error('[API Automations Dry-Run POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error evaluating automation dry-run.' },
      { status: 500 }
    )
  }
}
