import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import {
  findGovtContactDuplicates,
  isValidIndianPhoneNumber,
  normalizePhoneNumber,
} from '@/lib/government-contacts'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from '@/lib/constants'
import type {
  GovernmentContact,
  AuditLog,
  GovtContactCategory,
  GovtContactStatus,
  GovtSourceType,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Robust CSV parser that correctly handles quoted fields, escaped quotes,
 * commas within fields, and newlines.
 */
function parseCsv(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  let i = 0
  while (i < text.length) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"'
        i += 2
        continue
      } else if (char === '"') {
        inQuotes = false
        i++
        continue
      } else {
        cell += char
        i++
        continue
      }
    } else {
      if (char === '"') {
        inQuotes = true
        i++
        continue
      } else if (char === ',') {
        row.push(cell.trim())
        cell = ''
        i++
        continue
      } else if (char === '\r') {
        i++
        continue
      } else if (char === '\n') {
        row.push(cell.trim())
        if (row.some((c) => c !== '')) {
          lines.push(row)
        }
        row = []
        cell = ''
        i++
        continue
      } else {
        cell += char
        i++
        continue
      }
    }
  }

  // Push final cell and row
  row.push(cell.trim())
  if (row.some((c) => c !== '')) {
    lines.push(row)
  }

  return lines
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    let csvContent = ''
    let dryRun = false
    let requestedTerritory = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      csvContent = body.csv || ''
      dryRun = Boolean(body.dryRun)
      requestedTerritory = body.territoryId || ''
    } else {
      csvContent = await req.text()
    }

    if (!csvContent || typeof csvContent !== 'string' || !csvContent.trim()) {
      return NextResponse.json(
        { success: false, error: 'CSV content is empty or invalid' },
        { status: 400 }
      )
    }

    const rows = parseCsv(csvContent)
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV must contain a header row and at least one data row' },
        { status: 400 }
      )
    }

    // Header mapping
    const headerRow = rows[0].map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''))
    const getColIndex = (...candidates: string[]) => {
      for (const cand of candidates) {
        const cleanCand = cand.toLowerCase().replace(/[\s_-]+/g, '')
        const idx = headerRow.indexOf(cleanCand)
        if (idx !== -1) return idx
      }
      return -1
    }

    const nameIdx = getColIndex('name', 'officename', 'contactname')
    const desigIdx = getColIndex('designation', 'role', 'title')
    const catIdx = getColIndex('category', 'dept', 'department')
    const subcatIdx = getColIndex('subcategory', 'subdept')
    const phoneIdx = getColIndex('phone_number', 'phonenumber', 'phone', 'contactnumber', 'mobile')
    const altPhoneIdx = getColIndex('alternate_phone_number', 'alternatephonenumber', 'altphone', 'landline')
    const emailIdx = getColIndex('email', 'emailid')
    const distIdx = getColIndex('district')
    const mandalIdx = getColIndex('mandal')
    const villageIdx = getColIndex('village', 'town')
    const wardIdx = getColIndex('ward')
    const addressIdx = getColIndex('office_address', 'officeaddress', 'address', 'location')
    const hoursIdx = getColIndex('office_hours', 'officehours', 'hours', 'timings')
    const availIdx = getColIndex('availability')
    const srcTypeIdx = getColIndex('source_type', 'sourcetype', 'source')
    const srcUrlIdx = getColIndex('source_url', 'sourceurl', 'url', 'link')
    const srcRefIdx = getColIndex('source_reference', 'sourcereference', 'reference')
    const statusIdx = getColIndex('status')
    const emergIdx = getColIndex('is_emergency', 'isemergency', 'emergency')
    const pubIdx = getColIndex('is_public_contact', 'ispubliccontact', 'ispublic', 'public')
    const orderIdx = getColIndex('display_order', 'displayorder', 'order')
    const terrIdx = getColIndex('territory_id', 'territoryid', 'territory')
    const notesIdx = getColIndex('notes', 'remarks')

    if (nameIdx === -1 || desigIdx === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required CSV headers missing. Ensure "name" and "designation" columns exist.',
        },
        { status: 400 }
      )
    }

    const store = loadStore()
    if (!store.governmentContacts) store.governmentContacts = []
    if (!store.auditLogs) store.auditLogs = []

    const validCategoryIds = new Set(GOVT_CONTACT_CATEGORIES.map((c) => c.id))

    const importedContacts: GovernmentContact[] = []
    const duplicateWarnings: Array<{ rowNumber: number; name: string; duplicateOf: string }> = []
    const errors: Array<{ rowNumber: number; message: string }> = []

    const now = new Date().toISOString()
    const targetTerritory =
      user.role === 'SUPER_ADMIN'
        ? (requestedTerritory || FLAGSHIP_TERRITORY_ID)
        : user.territoryId

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const rowNum = r + 1

      const name = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : '').trim()
      const designation = (desigIdx !== -1 && row[desigIdx] ? row[desigIdx] : '').trim()

      if (!name) {
        errors.push({ rowNumber: rowNum, message: 'Name is required' })
        continue
      }
      if (!designation) {
        errors.push({ rowNumber: rowNum, message: 'Designation is required' })
        continue
      }

      // Category resolution
      let categoryRaw = (catIdx !== -1 && row[catIdx] ? row[catIdx] : '').trim().toLowerCase()
      categoryRaw = categoryRaw.replace(/[\s-]+/g, '_')
      let category: GovtContactCategory = 'other_public_services'
      if (validCategoryIds.has(categoryRaw as GovtContactCategory)) {
        category = categoryRaw as GovtContactCategory
      } else {
        // Find best match by name
        const match = GOVT_CONTACT_CATEGORIES.find(
          (c) =>
            c.name.toLowerCase().includes(categoryRaw) ||
            (c.telugu || '').includes(categoryRaw) ||
            categoryRaw.includes(c.id)
        )
        if (match) {
          category = match.id
        }
      }

      const phoneNumber = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : ''
      const altPhoneNumber = altPhoneIdx !== -1 && row[altPhoneIdx] ? row[altPhoneIdx].trim() : ''

      if (phoneNumber && !isValidIndianPhoneNumber(phoneNumber)) {
        errors.push({
          rowNumber: rowNum,
          message: `Invalid phone format for "${phoneNumber}". Must be 10-digit mobile or official short code.`,
        })
        continue
      }

      const village = (villageIdx !== -1 && row[villageIdx] ? row[villageIdx] : '').trim() || undefined
      const subcategory = (subcatIdx !== -1 && row[subcatIdx] ? row[subcatIdx] : '').trim() || undefined
      const email = (emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : '').trim() || undefined
      const district = (distIdx !== -1 && row[distIdx] ? row[distIdx] : '').trim() || 'Yadadri Bhuvanagiri'
      const mandal = (mandalIdx !== -1 && row[mandalIdx] ? row[mandalIdx] : '').trim() || 'Choutuppal'
      const ward = (wardIdx !== -1 && row[wardIdx] ? row[wardIdx] : '').trim() || undefined
      const officeAddress = (addressIdx !== -1 && row[addressIdx] ? row[addressIdx] : '').trim() || undefined
      const officeHours = (hoursIdx !== -1 && row[hoursIdx] ? row[hoursIdx] : '').trim() || undefined

      let availability: '24x7' | 'office_hours' | 'unknown' = 'office_hours'
      if (availIdx !== -1 && row[availIdx]) {
        const a = row[availIdx].trim().toLowerCase()
        if (a === '24x7' || a === '24/7' || a === 'round_the_clock') availability = '24x7'
        else if (a === 'office_hours' || a === 'office' || a === 'daytime') availability = 'office_hours'
        else availability = 'unknown'
      }

      let sourceType: GovtSourceType = 'official_website'
      if (srcTypeIdx !== -1 && row[srcTypeIdx]) {
        const st = row[srcTypeIdx].trim().toLowerCase()
        if (['official_website', 'official_document', 'authorized_confirmation', 'other'].includes(st)) {
          sourceType = st as GovtSourceType
        }
      }

      const sourceUrl = (srcUrlIdx !== -1 && row[srcUrlIdx] ? row[srcUrlIdx] : '').trim() || undefined
      const sourceReference = (srcRefIdx !== -1 && row[srcRefIdx] ? row[srcRefIdx] : '').trim() || undefined

      // Non-negotiable safety guard:
      // Even if the CSV specifies 'published' or 'verified', new imported contacts
      // MUST default to 'pending_verification' (or 'draft' if CSV specifies 'draft')
      // until an admin explicitly reviews and verifies the contact source.
      let rawStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim().toLowerCase() : ''
      let finalStatus: GovtContactStatus = 'pending_verification'
      if (rawStatus === 'draft') {
        finalStatus = 'draft'
      }

      const isEmergency =
        emergIdx !== -1 && row[emergIdx]
          ? ['true', '1', 'yes', 'y'].includes(row[emergIdx].trim().toLowerCase())
          : category === 'emergency_helpline' || category === 'ambulance_health' || category === 'fire_rescue' || category === 'police'

      const isPublicContact =
        pubIdx !== -1 && row[pubIdx]
          ? !['false', '0', 'no', 'n'].includes(row[pubIdx].trim().toLowerCase())
          : true

      const displayOrder = orderIdx !== -1 && row[orderIdx] ? parseInt(row[orderIdx], 10) || 100 : 100
      const rowTerritory =
        user.role === 'SUPER_ADMIN' && terrIdx !== -1 && row[terrIdx]
          ? row[terrIdx].trim() || targetTerritory
          : targetTerritory

      const notes = (notesIdx !== -1 && row[notesIdx] ? row[notesIdx] : '').trim() || undefined

      // Duplicate Check
      const candidate: Partial<GovernmentContact> = {
        name,
        category,
        village,
        phoneNumber,
        alternatePhoneNumber: altPhoneNumber,
      }

      const duplicates = findGovtContactDuplicates(candidate, [
        ...store.governmentContacts,
        ...importedContacts,
      ])

      if (duplicates.length > 0) {
        duplicateWarnings.push({
          rowNumber: rowNum,
          name,
          duplicateOf: `${duplicates[0].name} (${duplicates[0].id})`,
        })
      }

      const id = `govt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

      const contact: GovernmentContact = {
        id,
        name,
        designation,
        category,
        subcategory,
        phoneNumber: phoneNumber || undefined,
        alternatePhoneNumber: altPhoneNumber || undefined,
        email,
        district,
        mandal,
        village,
        ward,
        officeAddress,
        officeHours,
        availability,
        sourceType,
        sourceUrl,
        sourceReference,
        status: finalStatus,
        isEmergency,
        isPublicContact,
        displayOrder,
        territoryId: rowTerritory,
        notes,
        createdAt: now,
        updatedAt: now,
        createdBy: user.userId || user.phone,
        updatedBy: user.userId || user.phone,
      }

      importedContacts.push(contact)
    }

    if (!dryRun && importedContacts.length > 0) {
      store.governmentContacts.push(...importedContacts)

      const audit: AuditLog = {
        id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        actorId: user.userId || user.phone,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: targetTerritory,
        action: 'GOVT_CONTACTS_IMPORTED',
        details: `Imported ${importedContacts.length} government contacts via CSV (${duplicateWarnings.length} duplicates flagged)`,
        metadata: {
          importedCount: importedContacts.length,
          duplicateCount: duplicateWarnings.length,
          errorCount: errors.length,
        },
        createdAt: now,
      }
      store.auditLogs.push(audit)

      saveStore(store)
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalRows: rows.length - 1,
      importedCount: importedContacts.length,
      duplicateCount: duplicateWarnings.length,
      errorCount: errors.length,
      importedContacts: importedContacts.map((c) => ({
        id: c.id,
        name: c.name,
        designation: c.designation,
        category: c.category,
        phoneNumber: c.phoneNumber,
        status: c.status,
      })),
      duplicateWarnings,
      errors,
      message: dryRun
        ? `Dry run successful: ${importedContacts.length} valid contacts parsed`
        : `Successfully imported ${importedContacts.length} government contacts (${duplicateWarnings.length} duplicates flagged)`,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during CSV import' },
      { status: 500 }
    )
  }
}
