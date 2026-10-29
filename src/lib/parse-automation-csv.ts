import crypto from 'crypto'
import type { AutomationRule, AutomationRuleStatus } from './types'

export interface AutomationCsvRowError {
  row: number
  field?: string
  message: string
  raw?: string
}

export interface AutomationCsvWarning {
  row: number
  field?: string
  message: string
}

export interface AutomationParseResult {
  success: boolean
  rules: AutomationRule[]
  errors: AutomationCsvRowError[]
  warnings: AutomationCsvWarning[]
  summary: {
    totalRows: number
    validRules: number
    invalidRows: number
    unsupportedRules: number
  }
}

export interface ParseAutomationCsvOptions {
  territoryId: string
  defaultStatus?: AutomationRuleStatus
  isGlobal?: boolean
}

const KNOWN_TRIGGER_TYPES = new Set(['keyword_match', 'first_inbound_message', 'time_based'])
const KNOWN_ACTION_TYPES = new Set(['send_message', 'add_tag', 'remove_tag', 'update_stage', 'queue_approval'])

/**
 * Tokenizes a CSV string into a 2D array of cells.
 * Correctly handles:
 * - Multiline quoted fields (newlines inside quotes)
 * - Escaped double quotes ("" -> ")
 * - Commas inside quoted cells
 * - CRLF (\r\n) and LF (\n) line breaks
 * - Trailing whitespace and empty lines
 */
export function tokenizeCsv(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '') // Strip UTF-8 BOM
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]

    if (char === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        // Escaped double quote "" -> "
        currentCell += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Cell delimiter
      currentRow.push(currentCell)
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      // Line delimiter
      if (char === '\r' && clean[i + 1] === '\n') {
        i++ // Skip '\n' of CRLF
      }
      currentRow.push(currentCell)
      currentCell = ''

      // Ignore purely empty lines
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
    } else {
      currentCell += char
    }
  }

  // Push last cell & row if remaining
  currentRow.push(currentCell)
  if (currentRow.some((c) => c.trim().length > 0)) {
    rows.push(currentRow)
  }

  return rows
}

/**
 * Neutralizes potential CSV formula injection (CWE-1236).
 * Prepends a single quote if a string begins with =, +, -, @, \t, or \r.
 */
function sanitizeCsvValue(val: string): string {
  if (!val) return ''
  const trimmed = val.trim()
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`
  }
  return trimmed
}

/**
 * Generates a deterministic rule ID from its core attributes.
 */
function generateDeterministicRuleId(name: string, triggerType: string, triggerValue: string, actionType: string, territoryId: string): string {
  const signature = `${name.trim()}|${triggerType.trim()}|${triggerValue.trim()}|${actionType.trim()}|${territoryId.trim()}`
  const hash = crypto.createHash('sha256').update(signature).digest('hex').substring(0, 12)
  return `auto_${hash}`
}

/**
 * Parses and validates CSV text containing WhatsApp automation rules.
 */
export function parseAutomationCsvContent(
  csvText: string,
  options: ParseAutomationCsvOptions
): AutomationParseResult {
  const { territoryId, defaultStatus = 'draft', isGlobal = false } = options
  const errors: AutomationCsvRowError[] = []
  const warnings: AutomationCsvWarning[] = []
  const rules: AutomationRule[] = []

  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    return {
      success: false,
      rules: [],
      errors: [{ row: 1, message: 'CSV file is empty or missing data rows.' }],
      warnings: [],
      summary: { totalRows: 0, validRules: 0, invalidRows: 1, unsupportedRules: 0 },
    }
  }

  const rows = tokenizeCsv(csvText)
  if (rows.length < 2) {
    return {
      success: false,
      rules: [],
      errors: [{ row: 1, message: 'CSV file must contain a header row and at least one data row.' }],
      warnings: [],
      summary: { totalRows: rows.length, validRules: 0, invalidRows: 1, unsupportedRules: 0 },
    }
  }

  // Header validation
  const headerRow = rows[0].map((h) => h.trim().toLowerCase().replace(/["']/g, ''))
  const nameIdx = headerRow.indexOf('name')
  const triggerTypeIdx = headerRow.indexOf('trigger_type')
  const triggerValueIdx = headerRow.indexOf('trigger_value')
  const actionTypeIdx = headerRow.indexOf('action_type')
  const actionValueIdx = headerRow.indexOf('action_value')
  const isActiveIdx = headerRow.indexOf('is_active')
  const descriptionIdx = headerRow.indexOf('description')
  const templateSlugIdx = headerRow.indexOf('template_slug')

  // Required header presence
  const missingHeaders: string[] = []
  if (nameIdx === -1) missingHeaders.push('name')
  if (triggerTypeIdx === -1) missingHeaders.push('trigger_type')
  if (actionTypeIdx === -1) missingHeaders.push('action_type')
  if (actionValueIdx === -1) missingHeaders.push('action_value')

  if (missingHeaders.length > 0) {
    return {
      success: false,
      rules: [],
      errors: [
        {
          row: 1,
          message: `Missing required column headers: ${missingHeaders.join(', ')}. Expected: name, trigger_type, trigger_value, action_type, action_value, is_active, description, template_slug.`,
        },
      ],
      warnings: [],
      summary: { totalRows: rows.length, validRules: 0, invalidRows: 1, unsupportedRules: 0 },
    }
  }

  let unsupportedCount = 0
  const now = new Date().toISOString()

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const rowNum = rowIndex + 1
    const cols = rows[rowIndex]

    const rawName = cols[nameIdx]?.trim() || ''
    const rawTriggerType = cols[triggerTypeIdx]?.trim() || ''
    const rawTriggerValue = triggerValueIdx >= 0 ? cols[triggerValueIdx] || '' : ''
    const rawActionType = cols[actionTypeIdx]?.trim() || ''
    const rawActionValue = actionValueIdx >= 0 ? cols[actionValueIdx] || '' : ''
    const rawIsActive = isActiveIdx >= 0 ? cols[isActiveIdx]?.trim().toLowerCase() : 'false'
    const rawDescription = descriptionIdx >= 0 ? cols[descriptionIdx] || '' : ''
    const rawTemplateSlug = templateSlugIdx >= 0 ? cols[templateSlugIdx]?.trim() : ''

    // Validation: Name is required
    if (!rawName) {
      errors.push({ row: rowNum, field: 'name', message: 'Rule name cannot be empty.' })
      continue
    }

    // Validation: Trigger Type is required
    if (!rawTriggerType) {
      errors.push({ row: rowNum, field: 'trigger_type', message: 'Trigger type cannot be empty.' })
      continue
    }

    // Validation: Action Type is required
    if (!rawActionType) {
      errors.push({ row: rowNum, field: 'action_type', message: 'Action type cannot be empty.' })
      continue
    }

    // Validation: Action Value is required
    if (!rawActionValue.trim()) {
      errors.push({ row: rowNum, field: 'action_value', message: 'Action value (message text or tag name) cannot be empty.' })
      continue
    }

    // Column count mismatch warning
    if (cols.length !== headerRow.length) {
      warnings.push({
        row: rowNum,
        message: `Row column count (${cols.length}) differs from header count (${headerRow.length}). Parsed with best-effort mapping.`,
      })
    }

    // Check for supported trigger and action types
    const isTriggerSupported = KNOWN_TRIGGER_TYPES.has(rawTriggerType)
    const isActionSupported = KNOWN_ACTION_TYPES.has(rawActionType)
    const isSupported = isTriggerSupported && isActionSupported
    let unsupportedReason: string | undefined

    if (!isSupported) {
      unsupportedCount++
      const reasons: string[] = []
      if (!isTriggerSupported) reasons.push(`Unknown trigger type "${rawTriggerType}"`)
      if (!isActionSupported) reasons.push(`Unknown action type "${rawActionType}"`)
      unsupportedReason = reasons.join('; ')
      warnings.push({
        row: rowNum,
        message: `Unsupported rule: ${unsupportedReason}. This rule will be imported as "disabled" and cannot execute.`,
      })
    }

    // Sanitize formula injection
    const cleanName = sanitizeCsvValue(rawName)
    const cleanTriggerType = sanitizeCsvValue(rawTriggerType)
    const cleanTriggerValue = sanitizeCsvValue(rawTriggerValue)
    const cleanActionType = sanitizeCsvValue(rawActionType)
    const cleanActionValue = sanitizeCsvValue(rawActionValue)
    const cleanDescription = sanitizeCsvValue(rawDescription)
    const cleanTemplateSlug = sanitizeCsvValue(rawTemplateSlug)

    // Per specifications, imported rules default to 'draft' (or 'disabled' if unsupported)
    const ruleStatus: AutomationRuleStatus = !isSupported ? 'disabled' : defaultStatus

    const id = generateDeterministicRuleId(cleanName, cleanTriggerType, cleanTriggerValue, cleanActionType, territoryId)

    const rule: AutomationRule = {
      id,
      name: cleanName,
      triggerType: cleanTriggerType,
      triggerValue: cleanTriggerValue,
      actionType: cleanActionType,
      actionValue: cleanActionValue,
      description: cleanDescription || undefined,
      templateSlug: cleanTemplateSlug || undefined,
      territoryId,
      isGlobal: isGlobal || false,
      status: ruleStatus,
      isActive: false, // Inactive by default upon import
      isSupported,
      unsupportedReason,
      executionCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    rules.push(rule)
  }

  return {
    success: errors.length === 0,
    rules,
    errors,
    warnings,
    summary: {
      totalRows: rows.length - 1,
      validRules: rules.length,
      invalidRows: errors.length,
      unsupportedRules: unsupportedCount,
    },
  }
}
