import type { CRMContact } from './types'
import { FLAGSHIP_TERRITORY_ID } from './store'

/**
 * Normalizes Indian phone numbers into a standard 10-digit format.
 * Handles:
 *  - Strips spaces, dashes, parentheses, non-digits
 *  - Strips leading '+91' or '91' prefix (if 12 digits total)
 *  - Strips leading '0' prefix (if 11 digits total)
 *  - Returns clean 10-digit string if valid, or empty string if invalid
 */
export function normalizeIndianPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')

  // 12 digits starting with 91 (e.g. 919848012345)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }

  // 11 digits starting with 0 (e.g. 09848012345)
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }

  // Standard 10-digit number
  if (digits.length === 10) {
    return digits
  }

  // If outside standard format, return digits as-is if >= 7, else empty
  return digits.length >= 7 && digits.length <= 15 ? digits : ''
}

/**
 * Masks phone numbers to protect customer privacy in diagnostic / warning responses.
 * Example: '9848012345' -> '98480*****'
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  const normalized = normalizeIndianPhoneNumber(phone)
  if (!normalized) return '***-***-****'
  if (normalized.length === 10) {
    return `${normalized.slice(0, 5)}*****`
  }
  return `${normalized.slice(0, 3)}***${normalized.slice(-2)}`
}

export interface DuplicateMatch {
  id: string
  name: string
  phone: string
  maskedPhone: string
  stage: string
  territoryId: string
  matchType: 'exact_phone' | 'email' | 'similar_name'
}

/**
 * Checks if a given contact candidate matches any existing contacts in the specified territory.
 * Enforces strict tenant isolation: Caller cannot detect or discover contacts from other territories.
 */
export function findDuplicateContacts(
  existingContacts: CRMContact[],
  candidate: {
    phone?: string
    email?: string
    name?: string
    excludeId?: string
    territoryId?: string
  },
  options: {
    isSuperAdmin?: boolean
    callerTerritoryId?: string
  } = {}
): { isDuplicate: boolean; matches: DuplicateMatch[] } {
  const normCandidatePhone = normalizeIndianPhoneNumber(candidate.phone)
  const normCandidateEmail = candidate.email?.trim().toLowerCase()
  const candidateName = candidate.name?.trim().toLowerCase()

  const targetTerritory = options.isSuperAdmin
    ? candidate.territoryId
    : (options.callerTerritoryId || candidate.territoryId || FLAGSHIP_TERRITORY_ID)

  // Scope existing contacts strictly to the authorized territory (unless super admin viewing all)
  const scopedContacts = existingContacts.filter((c) => {
    if (candidate.excludeId && c.id === candidate.excludeId) return false
    if (options.isSuperAdmin && (!targetTerritory || targetTerritory === 'all')) return true
    const contactTerritory = c.territoryId || FLAGSHIP_TERRITORY_ID
    return contactTerritory === targetTerritory
  })

  const matches: DuplicateMatch[] = []

  for (const c of scopedContacts) {
    const existingNormPhone = normalizeIndianPhoneNumber(c.phone)
    const existingEmail = c.email?.trim().toLowerCase()
    const existingName = c.name?.trim().toLowerCase()

    // 1. Primary rule: Exact 10-digit phone number match
    if (normCandidatePhone && existingNormPhone && normCandidatePhone === existingNormPhone) {
      matches.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        maskedPhone: maskPhoneNumber(c.phone),
        stage: c.stage,
        territoryId: c.territoryId || FLAGSHIP_TERRITORY_ID,
        matchType: 'exact_phone',
      })
      continue
    }

    // 2. Secondary rule: Email match (if non-empty)
    if (normCandidateEmail && existingEmail && normCandidateEmail === existingEmail) {
      matches.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        maskedPhone: maskPhoneNumber(c.phone),
        stage: c.stage,
        territoryId: c.territoryId || FLAGSHIP_TERRITORY_ID,
        matchType: 'email',
      })
      continue
    }

    // 3. Supporting evidence: Exact name match with partial phone similarity
    if (
      candidateName &&
      existingName &&
      candidateName.length >= 4 &&
      candidateName === existingName &&
      normCandidatePhone &&
      existingNormPhone &&
      normCandidatePhone.slice(-4) === existingNormPhone.slice(-4)
    ) {
      matches.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        maskedPhone: maskPhoneNumber(c.phone),
        stage: c.stage,
        territoryId: c.territoryId || FLAGSHIP_TERRITORY_ID,
        matchType: 'similar_name',
      })
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  }
}

export interface CsvContactImportRow {
  rowNumber: number
  name: string
  phone: string
  email?: string
  stage?: string
  tags?: string[]
  notes?: string
}

export interface CsvContactImportResult {
  validContacts: CsvContactImportRow[]
  duplicateRows: Array<CsvContactImportRow & { existingContactId: string; maskedPhone: string; matchType: string }>
  invalidRows: Array<{ rowNumber: number; rawText: string; reason: string }>
}

/**
 * Parses and validates CSV contact rows while separating duplicates from invalid rows.
 */
export function parseContactsCsvWithDuplicates(
  csvContent: string,
  existingContacts: CRMContact[],
  territoryId: string = FLAGSHIP_TERRITORY_ID
): CsvContactImportResult {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const result: CsvContactImportResult = {
    validContacts: [],
    duplicateRows: [],
    invalidRows: [],
  }

  if (lines.length === 0) return result

  // Skip header if line 1 contains "name" or "phone"
  const startIdx = /name|phone|email/i.test(lines[0]) ? 1 : 0

  const seenInCsv = new Set<string>()

  for (let i = startIdx; i < lines.length; i++) {
    const rowNum = i + 1
    const raw = lines[i]
    const cols = raw.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))

    if (cols.length < 2) {
      result.invalidRows.push({
        rowNumber: rowNum,
        rawText: raw,
        reason: 'Insufficient columns (Expected at least Name and Phone)',
      })
      continue
    }

    const name = cols[0]
    const phone = cols[1]
    const email = cols[2] || ''
    const stage = cols[3] || 'NEW_LEAD'
    const tags = cols[4] ? cols[4].split(';').map((t) => t.trim()) : ['Lead']
    const notes = cols[5] || ''

    if (!name || name.length < 2) {
      result.invalidRows.push({
        rowNumber: rowNum,
        rawText: raw,
        reason: 'Invalid contact name (Must be at least 2 characters)',
      })
      continue
    }

    const normPhone = normalizeIndianPhoneNumber(phone)
    if (!normPhone || normPhone.length !== 10) {
      result.invalidRows.push({
        rowNumber: rowNum,
        rawText: raw,
        reason: 'Invalid 10-digit Indian phone number',
      })
      continue
    }

    // Check duplicate within the same CSV upload
    if (seenInCsv.has(normPhone)) {
      result.duplicateRows.push({
        rowNumber: rowNum,
        name,
        phone,
        email,
        stage,
        tags,
        notes,
        existingContactId: 'csv_duplicate',
        maskedPhone: maskPhoneNumber(phone),
        matchType: 'csv_internal_duplicate',
      })
      continue
    }
    seenInCsv.add(normPhone)

    // Check duplicate against existing persistent contacts in territory
    const dupCheck = findDuplicateContacts(
      existingContacts,
      { phone, email, name, territoryId },
      { callerTerritoryId: territoryId }
    )

    if (dupCheck.isDuplicate) {
      const match = dupCheck.matches[0]
      result.duplicateRows.push({
        rowNumber: rowNum,
        name,
        phone,
        email,
        stage,
        tags,
        notes,
        existingContactId: match.id,
        maskedPhone: match.maskedPhone,
        matchType: match.matchType,
      })
    } else {
      result.validContacts.push({
        rowNumber: rowNum,
        name,
        phone,
        email,
        stage,
        tags,
        notes,
      })
    }
  }

  return result
}
