/**
 * Choutuppal Franchise CRM — Automation Rule Evaluation Engine
 * Phase 3F Step 3: Pure, Deterministic Rule Evaluation & Action Planning
 *
 * This module is a pure, side-effect-free evaluator.
 * It NEVER writes to disk, mutates contacts, sends WhatsApp messages, or makes external network calls.
 */

import type {
  AutomationRule,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationActionType,
  DealStage,
} from './types'

// -----------------------------------------------------------------------------
// Evaluator Contracts & Interfaces
// -----------------------------------------------------------------------------

export interface InboundMessageEvent {
  messageText: string
  phone: string
  providerMessageId?: string
  contactName?: string
  timestamp?: string
}

export interface TerritoryContext {
  territoryId: string
  territoryName?: string
  primaryDomain?: string
  contactPhone?: string
  whatsappNumber?: string
}

export interface ContactContext {
  id?: string
  name?: string
  phone?: string
  tags?: string[]
  stage?: DealStage
  messageCount?: number
  isFirstInbound?: boolean
  lastContactAt?: string
}

export interface EvaluateAutomationsOptions {
  event: InboundMessageEvent
  territory: TerritoryContext
  rules: AutomationRule[]
  contact?: ContactContext
  requireIdempotency?: boolean
  cooldownSeconds?: number
}

export interface ProposedAction {
  ruleId: string
  ruleName: string
  actionType: AutomationActionType
  actionValue: string
  renderedValue?: string
  metadata?: Record<string, any>
  warnings?: string[]
  isSuppressed?: boolean
  suppressionReason?: string
}

export interface RuleEvaluationTrace {
  ruleId: string
  ruleName: string
  status: AutomationRuleStatus
  isActive: boolean
  isSupported: boolean
  triggerType: string
  matched: boolean
  skipReason?: string
  matchedKeyword?: string
  isExactMatch?: boolean
  matchRank?: number
}

export interface EvaluationResult {
  success: boolean
  matchedRuleIds: string[]
  skippedRuleIds: string[]
  unsupportedRuleIds: string[]
  deferredRuleIds: string[]
  proposedActions: ProposedAction[]
  renderedPreviews: Array<{
    ruleId: string
    ruleName: string
    messageText: string
  }>
  trace: RuleEvaluationTrace[]
  summary: {
    totalRulesEvaluated: number
    matchedCount: number
    skippedCount: number
    unsupportedCount: number
    deferredCount: number
  }
}

export interface RateLimitPolicy {
  maxMessagesPerContactPerHour?: number
  ruleCooldownSeconds?: number
}

export interface CooldownCheckContext {
  lastTriggeredAt?: string
  contactLastMessageAt?: string
  cooldownSeconds?: number
}

// -----------------------------------------------------------------------------
// Constants & Allowlisted Sets
// -----------------------------------------------------------------------------

export const SUPPORTED_TRIGGERS = new Set<string>([
  'keyword_match',
  'first_inbound_message',
])

export const DEFERRED_TRIGGERS = new Set<string>([
  'time_based',
  'stage_changed',
  'tag_added',
  'lead_created',
])

export const SUPPORTED_ACTIONS = new Set<string>([
  'send_message',
  'add_tag',
  'remove_tag',
  'update_stage',
  'queue_approval',
])

export const VALID_DEAL_STAGES = new Set<string>([
  'NEW_LEAD',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
])

// -----------------------------------------------------------------------------
// Text Normalization & Unicode Word Boundary Matcher
// -----------------------------------------------------------------------------

/**
 * Normalizes text by lowercasing, trimming, and collapsing whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return ''
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Checks if a character is a Unicode word character (letter, number, or mark).
 * Supports Latin, Telugu, Devanagari, and other Unicode scripts.
 */
function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}\p{M}]/u.test(char)
}

/**
 * Checks whether a keyword or phrase appears in message text.
 * Prevents substring false positives (e.g. 'hi' inside 'this' or '1' inside '123').
 * Also correctly handles Telugu Unicode phrases and boundaries.
 */
export function matchKeywordInText(
  text: string,
  keyword: string
): { matched: boolean; isExact: boolean } {
  const normText = normalizeText(text)
  const normKw = normalizeText(keyword)

  if (!normText || !normKw) {
    return { matched: false, isExact: false }
  }

  // Exact match
  if (normText === normKw) {
    return { matched: true, isExact: true }
  }

  // Bounded substring match
  let searchIdx = 0
  while ((searchIdx = normText.indexOf(normKw, searchIdx)) !== -1) {
    const beforeChar = searchIdx > 0 ? normText[searchIdx - 1] : null
    const afterChar =
      searchIdx + normKw.length < normText.length
        ? normText[searchIdx + normKw.length]
        : null

    const beforeOk = !beforeChar || !isWordChar(beforeChar)
    const afterOk = !afterChar || !isWordChar(afterChar)

    if (beforeOk && afterOk) {
      return { matched: true, isExact: false }
    }

    searchIdx += 1
  }

  return { matched: false, isExact: false }
}

// -----------------------------------------------------------------------------
// Safe Template Rendering
// -----------------------------------------------------------------------------

export interface RenderTemplateResult {
  rendered: string
  warnings: string[]
}

/**
 * Safely replaces allowlisted template variables in message templates.
 * Allowlisted variables:
 * - {{contact.name}}
 * - {{contact.phone}}
 * - {{territory.name}}
 * - {{territory.id}}
 * - {{territory.domain}}
 * - {{territory.phone}}
 * - {{territory.whatsapp}}
 *
 * Unknown variables produce a validation warning and remain unreplaced.
 * Never executes code, eval(), or accesses arbitrary properties.
 */
export function renderMessageTemplate(
  template: string,
  event: InboundMessageEvent,
  territory: TerritoryContext,
  contact?: ContactContext
): RenderTemplateResult {
  if (!template) {
    return { rendered: '', warnings: [] }
  }

  const warnings: string[] = []
  const knownVariables: Record<string, string> = {
    'contact.name': contact?.name || event.contactName || 'Citizen',
    'contact.phone': contact?.phone || event.phone || '',
    'territory.name': territory.territoryName || 'Choutuppal',
    'territory.id': territory.territoryId,
    'territory.domain': territory.primaryDomain || 'choutuppal.in',
    'territory.phone': territory.contactPhone || '9441348175',
    'territory.whatsapp': territory.whatsappNumber || '9441348175',
  }

  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, varName) => {
    const key = varName.trim().toLowerCase()
    if (Object.prototype.hasOwnProperty.call(knownVariables, key)) {
      return knownVariables[key]
    }
    warnings.push(`Unknown template variable '{{${varName}}}' left unreplaced`)
    return match
  })

  return { rendered, warnings }
}

// -----------------------------------------------------------------------------
// Core Pure Evaluator
// -----------------------------------------------------------------------------

interface MatchedRuleCandidate {
  rule: AutomationRule
  matchedKeyword?: string
  isExact: boolean
  keywordLength: number
}

/**
 * Pure evaluation function.
 * Evaluates inbound message against given rules under trusted territory context.
 */
export function evaluateAutomations(
  options: EvaluateAutomationsOptions
): EvaluationResult {
  const { event, territory, rules, contact, requireIdempotency, cooldownSeconds } = options

  const trace: RuleEvaluationTrace[] = []
  const matchedRuleIds: string[] = []
  const skippedRuleIds: string[] = []
  const unsupportedRuleIds: string[] = []
  const deferredRuleIds: string[] = []

  // Idempotency check if requested
  if (requireIdempotency && !event.providerMessageId) {
    return {
      success: false,
      matchedRuleIds: [],
      skippedRuleIds: rules.map((r) => r.id),
      unsupportedRuleIds: [],
      deferredRuleIds: [],
      proposedActions: [],
      renderedPreviews: [],
      trace: rules.map((r) => ({
        ruleId: r.id,
        ruleName: r.name,
        status: r.status,
        isActive: Boolean(r.isActive),
        isSupported: r.isSupported !== false,
        triggerType: r.triggerType,
        matched: false,
        skipReason: 'Missing providerMessageId: Idempotency required',
      })),
      summary: {
        totalRulesEvaluated: rules.length,
        matchedCount: 0,
        skippedCount: rules.length,
        unsupportedCount: 0,
        deferredCount: 0,
      },
    }
  }

  const matchedCandidates: MatchedRuleCandidate[] = []

  for (const rule of rules) {
    const isActiveFlag = rule.isActive === true
    const isSupportedFlag = rule.isSupported !== false

    // 1. Status & Eligibility check (Conservative status conflict resolution)
    // A rule must never execute if either representation indicates draft, paused, disabled, or unsupported.
    if (!isSupportedFlag) {
      unsupportedRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: isActiveFlag,
        isSupported: false,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: `Rule is flagged as unsupported: ${rule.unsupportedReason || 'unsupported'}`,
      })
      continue
    }

    if (rule.status !== 'active') {
      skippedRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: isActiveFlag,
        isSupported: isSupportedFlag,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: `Rule status is '${rule.status}' (must be 'active')`,
      })
      continue
    }

    if (!isActiveFlag) {
      skippedRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: false,
        isSupported: isSupportedFlag,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: 'Rule isActive is false',
      })
      continue
    }

    // 2. Territory Isolation check
    const ruleTerritory = rule.territoryId || 'territory_choutuppal'
    if (ruleTerritory !== territory.territoryId && !rule.isGlobal) {
      skippedRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: isActiveFlag,
        isSupported: isSupportedFlag,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: `Territory mismatch (rule: ${ruleTerritory}, context: ${territory.territoryId})`,
      })
      continue
    }

    // 3. Cooldown check
    if (cooldownSeconds && cooldownSeconds > 0 && rule.lastExecutedAt) {
      const lastExec = new Date(rule.lastExecutedAt).getTime()
      const now = event.timestamp ? new Date(event.timestamp).getTime() : Date.now()
      const elapsedSeconds = Math.floor((now - lastExec) / 1000)
      if (elapsedSeconds < cooldownSeconds) {
        skippedRuleIds.push(rule.id)
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          status: rule.status,
          isActive: isActiveFlag,
          isSupported: isSupportedFlag,
          triggerType: rule.triggerType,
          matched: false,
          skipReason: `Rule cooldown active (${elapsedSeconds}s < ${cooldownSeconds}s)`,
        })
        continue
      }
    }

    // 4. Trigger Evaluation
    const trigType = rule.triggerType.toLowerCase().trim()

    if (DEFERRED_TRIGGERS.has(trigType)) {
      deferredRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: isActiveFlag,
        isSupported: isSupportedFlag,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: `Trigger type '${rule.triggerType}' is explicitly deferred (cannot be evaluated in real-time inbound message flow)`,
      })
      continue
    }

    if (!SUPPORTED_TRIGGERS.has(trigType)) {
      unsupportedRuleIds.push(rule.id)
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: rule.status,
        isActive: isActiveFlag,
        isSupported: isSupportedFlag,
        triggerType: rule.triggerType,
        matched: false,
        skipReason: `Unsupported trigger type '${rule.triggerType}'`,
      })
      continue
    }

    // Evaluate 'keyword_match'
    if (trigType === 'keyword_match') {
      const keywords = (rule.triggerValue || '')
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)

      let matchedKeyword: string | undefined
      let isExact = false
      let longestMatchedLen = 0

      for (const kw of keywords) {
        const check = matchKeywordInText(event.messageText, kw)
        if (check.matched) {
          if (!matchedKeyword || kw.length > longestMatchedLen || (!isExact && check.isExact)) {
            matchedKeyword = kw
            isExact = check.isExact
            longestMatchedLen = kw.length
          }
        }
      }

      if (matchedKeyword) {
        matchedCandidates.push({
          rule,
          matchedKeyword,
          isExact,
          keywordLength: longestMatchedLen,
        })
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          status: rule.status,
          isActive: true,
          isSupported: true,
          triggerType: rule.triggerType,
          matched: true,
          matchedKeyword,
          isExactMatch: isExact,
        })
      } else {
        skippedRuleIds.push(rule.id)
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          status: rule.status,
          isActive: true,
          isSupported: true,
          triggerType: rule.triggerType,
          matched: false,
          skipReason: 'No keyword match',
        })
      }
      continue
    }

    // Evaluate 'first_inbound_message'
    if (trigType === 'first_inbound_message') {
      const isFirst =
        !contact ||
        contact.isFirstInbound === true ||
        contact.messageCount === undefined ||
        contact.messageCount === 0

      if (isFirst) {
        matchedCandidates.push({
          rule,
          matchedKeyword: '[first_inbound]',
          isExact: true,
          keywordLength: 0,
        })
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          status: rule.status,
          isActive: true,
          isSupported: true,
          triggerType: rule.triggerType,
          matched: true,
          matchedKeyword: '[first_inbound]',
          isExactMatch: true,
        })
      } else {
        skippedRuleIds.push(rule.id)
        trace.push({
          ruleId: rule.id,
          ruleName: rule.name,
          status: rule.status,
          isActive: true,
          isSupported: true,
          triggerType: rule.triggerType,
          matched: false,
          skipReason: `Contact already has ${contact.messageCount} prior messages (not first inbound)`,
        })
      }
      continue
    }
  }

  // ---------------------------------------------------------------------------
  // Deterministic Rule Ordering & Multiple-Match Policy
  // 1. Exact matches first
  // 2. Longest matched keyword length descending
  // 3. Stable alphabetical sort by rule ID
  // ---------------------------------------------------------------------------
  matchedCandidates.sort((a, b) => {
    if (a.isExact !== b.isExact) {
      return a.isExact ? -1 : 1
    }
    if (b.keywordLength !== a.keywordLength) {
      return b.keywordLength - a.keywordLength
    }
    return a.rule.id.localeCompare(b.rule.id)
  })

  // Update matchRank in trace
  matchedCandidates.forEach((c, idx) => {
    matchedRuleIds.push(c.rule.id)
    const t = trace.find((item) => item.ruleId === c.rule.id)
    if (t) {
      t.matchRank = idx + 1
    }
  })

  // ---------------------------------------------------------------------------
  // Action Planning
  // Policy: Only the top-ranked matched rule (winner) produces a send_message action!
  // Secondary matched rules have their send_message suppressed to prevent reply storms.
  // ---------------------------------------------------------------------------
  const proposedActions: ProposedAction[] = []
  const renderedPreviews: Array<{ ruleId: string; ruleName: string; messageText: string }> = []
  let hasWinnerMessage = false

  for (let i = 0; i < matchedCandidates.length; i++) {
    const candidate = matchedCandidates[i]
    const rule = candidate.rule
    const actionType = rule.actionType.toLowerCase().trim()

    // Validate supported action
    if (!SUPPORTED_ACTIONS.has(actionType)) {
      proposedActions.push({
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: rule.actionType,
        actionValue: rule.actionValue,
        warnings: [`Unsupported action type '${rule.actionType}' rejected from execution plan.`],
        isSuppressed: true,
        suppressionReason: `Unsupported action '${rule.actionType}'`,
      })
      continue
    }

    if (actionType === 'send_message') {
      if (!hasWinnerMessage) {
        // Primary winning reply
        hasWinnerMessage = true
        const render = renderMessageTemplate(
          rule.actionValue,
          event,
          territory,
          contact
        )
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: 'send_message',
          actionValue: rule.actionValue,
          renderedValue: render.rendered,
          warnings: render.warnings.length > 0 ? render.warnings : undefined,
          isSuppressed: false,
        })
        renderedPreviews.push({
          ruleId: rule.id,
          ruleName: rule.name,
          messageText: render.rendered,
        })
      } else {
        // Suppressed secondary reply
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: 'send_message',
          actionValue: rule.actionValue,
          isSuppressed: true,
          suppressionReason: `Suppressed by multiple-match policy (winner: ${matchedCandidates[0].rule.id})`,
        })
      }
      continue
    }

    if (actionType === 'add_tag' || actionType === 'remove_tag') {
      const tagVal = (rule.actionValue || '').trim()
      if (!tagVal) {
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          actionValue: rule.actionValue,
          warnings: [`Tag name cannot be empty for ${actionType}`],
          isSuppressed: true,
          suppressionReason: 'Empty tag name',
        })
      } else {
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          actionValue: tagVal,
          isSuppressed: false,
        })
      }
      continue
    }

    if (actionType === 'update_stage') {
      const stageVal = (rule.actionValue || '').trim().toUpperCase()
      if (!VALID_DEAL_STAGES.has(stageVal)) {
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: rule.actionType,
          actionValue: rule.actionValue,
          warnings: [
            `Invalid deal stage '${rule.actionValue}'. Must be one of: ${Array.from(
              VALID_DEAL_STAGES
            ).join(', ')}`,
          ],
          isSuppressed: true,
          suppressionReason: `Invalid deal stage '${rule.actionValue}'`,
        })
      } else {
        proposedActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actionType: 'update_stage',
          actionValue: stageVal,
          isSuppressed: false,
        })
      }
      continue
    }

    if (actionType === 'queue_approval') {
      proposedActions.push({
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: 'queue_approval',
        actionValue: rule.actionValue,
        isSuppressed: false,
      })
      continue
    }
  }

  return {
    success: true,
    matchedRuleIds,
    skippedRuleIds,
    unsupportedRuleIds,
    deferredRuleIds,
    proposedActions,
    renderedPreviews,
    trace,
    summary: {
      totalRulesEvaluated: rules.length,
      matchedCount: matchedRuleIds.length,
      skippedCount: skippedRuleIds.length,
      unsupportedCount: unsupportedRuleIds.length,
      deferredCount: deferredRuleIds.length,
    },
  }
}
