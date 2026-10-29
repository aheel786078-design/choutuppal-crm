/**
 * Choutuppal Franchise CRM — Automation Shadow Mode Runner
 * Phase 3F Step 4: Non-Dispatching Shadow-Mode Evaluation Boundary
 *
 * Strictly executes the pure rule evaluation engine for diagnostic observation.
 * NEVER dispatches messages, mutates CRM records, or triggers external webhooks.
 */

import { evaluateAutomations } from './automation-engine'
import type { TerritoryContext, ContactContext } from './automation-engine'
import type { AutomationRule, Territory, CRMContact } from './types'
import { FLAGSHIP_TERRITORY_ID } from './store'

export interface ShadowEvaluationDiagnostic {
  shadowModeEnabled: boolean
  evaluated: boolean
  territoryId?: string
  rulesEvaluatedCount?: number
  matchedRuleIds?: string[]
  proposedActionCount?: number
  skippedRuleIdsCount?: number
  unsupportedCount?: number
  deferredCount?: number
  winnerActionType?: string
  reason?: string
  timestamp?: string
  durationMs?: number
}

export interface ShadowRunnerParams {
  incomingText: string
  senderPhone: string
  senderName?: string
  providerMessageId?: string
  territory?: Territory
  contact?: CRMContact
  storeAutomations?: AutomationRule[]
}

/**
 * Checks whether automation shadow mode is enabled via environment configuration.
 * Defaults strictly to false (disabled).
 */
export function isAutomationShadowModeEnabled(): boolean {
  return process.env.AUTOMATION_SHADOW_MODE === 'true'
}

/**
 * Runs pure automation evaluation in shadow mode.
 *
 * Guarantees:
 * 1. Safe guard: If shadow mode is disabled, returns immediately with zero processing.
 * 2. Tenant isolation: Only evaluates rules matching the trusted server territory.
 * 3. Side-effect free: Proposed actions are inspected for count/type diagnostics only and discarded.
 * 4. Fault tolerant: Any unexpected exception is caught safely without breaking the webhook.
 * 5. Privacy safe: Diagnostics contain no message text, phone numbers, tokens, or PII.
 */
export function runAutomationShadowEvaluation(params: ShadowRunnerParams): ShadowEvaluationDiagnostic {
  const startTime = Date.now()

  // Guard 1: Check feature flag
  if (!isAutomationShadowModeEnabled()) {
    return {
      shadowModeEnabled: false,
      evaluated: false,
      reason: 'Shadow mode disabled by feature flag (AUTOMATION_SHADOW_MODE !== true)',
    }
  }

  // Guard 2: Validate territory context
  const territoryId = params.territory?.id
  if (!territoryId) {
    return {
      shadowModeEnabled: true,
      evaluated: false,
      reason: 'Missing or invalid territory context',
    }
  }

  // Guard 3: Validate incoming message text
  if (typeof params.incomingText !== 'string' || !params.incomingText.trim()) {
    return {
      shadowModeEnabled: true,
      evaluated: false,
      territoryId,
      reason: 'Missing or empty incoming message text',
    }
  }

  try {
    // Resolve rules strictly scoped to this territory (or global)
    const targetTerritoryId = territoryId || FLAGSHIP_TERRITORY_ID
    const candidateRules: AutomationRule[] = (params.storeAutomations || []).filter(
      (r) => (r.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritoryId || r.isGlobal === true
    )

    const territoryContext: TerritoryContext = {
      territoryId: targetTerritoryId,
      territoryName: params.territory?.name || 'Choutuppal',
      primaryDomain: params.territory?.primaryDomain || 'choutuppal.in',
      contactPhone: params.territory?.contactPhone || '9441348175',
      whatsappNumber: params.territory?.whatsappNumber || '9441348175',
    }

    // Build contact context from server-side record if available
    const contactContext: ContactContext = params.contact
      ? {
          id: params.contact.id,
          name: params.contact.name,
          phone: params.contact.phone,
          tags: params.contact.tags,
          stage: params.contact.stage,
          messageCount: params.contact.messageCount,
          lastContactAt: params.contact.lastContactAt,
          isFirstInbound: params.contact.messageCount === 0 || params.contact.messageCount === 1,
        }
      : {
          name: params.senderName || 'Citizen',
          phone: params.senderPhone,
          messageCount: 0,
          isFirstInbound: true,
        }

    // Run pure evaluation
    const evalResult = evaluateAutomations({
      event: {
        messageText: params.incomingText,
        phone: params.senderPhone,
        providerMessageId: params.providerMessageId,
        contactName: contactContext.name,
        timestamp: new Date().toISOString(),
      },
      territory: territoryContext,
      rules: candidateRules,
      contact: contactContext,
    })

    const durationMs = Date.now() - startTime

    // Identify winning action type if any (non-suppressed)
    const winnerAction = evalResult.proposedActions.find((a) => !a.isSuppressed)
    const winnerActionType = winnerAction?.actionType

    // NOTE: All proposed actions are intentionally discarded here.
    // They are NEVER passed to any dispatch mechanism or CRM mutation function.

    const diagnostic: ShadowEvaluationDiagnostic = {
      shadowModeEnabled: true,
      evaluated: true,
      territoryId: targetTerritoryId,
      rulesEvaluatedCount: candidateRules.length,
      matchedRuleIds: evalResult.matchedRuleIds,
      proposedActionCount: evalResult.proposedActions.length,
      skippedRuleIdsCount: evalResult.skippedRuleIds.length,
      unsupportedCount: evalResult.unsupportedRuleIds.length,
      deferredCount: evalResult.deferredRuleIds.length,
      winnerActionType,
      timestamp: new Date().toISOString(),
      durationMs,
    }

    return diagnostic
  } catch (error: any) {
    // Resilient fallback: evaluator failure never throws to caller
    return {
      shadowModeEnabled: true,
      evaluated: false,
      territoryId,
      reason: `Evaluator caught error: ${error?.message || 'unknown error'}`,
      durationMs: Date.now() - startTime,
    }
  }
}
