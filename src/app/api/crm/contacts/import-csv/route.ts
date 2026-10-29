import { NextResponse } from 'next/server'
import { loadStore, saveStore, logAuditEvent, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import type { CRMContact } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { parseContactsCsvWithDuplicates, normalizeIndianPhoneNumber, maskPhoneNumber } from '@/lib/crm-duplicates'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const csvContent = (body.csvContent || '').trim()
    const allowDuplicates = Boolean(body.allowDuplicates)
    let territoryId = body.territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID

    // Enforce territory scoping for Franchise Admins
    if (auth.user.role !== 'SUPER_ADMIN') {
      territoryId = auth.user.territoryId
    }

    const terrAccess = await requireTerritoryAccess(req, territoryId)
    if (terrAccess.errorResponse) return terrAccess.errorResponse

    if (!csvContent) {
      return NextResponse.json(
        { success: false, error: 'CSV content is empty or not provided.' },
        { status: 400 }
      )
    }

    const store = loadStore()
    const existingContacts = store.contacts || []

    const parseResult = parseContactsCsvWithDuplicates(csvContent, existingContacts, territoryId)

    const contactsToInsert: CRMContact[] = []
    const now = new Date().toISOString()

    // 1. Process valid unique contacts
    for (const valid of parseResult.validContacts) {
      contactsToInsert.push({
        id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        territoryId,
        name: valid.name,
        phone: normalizeIndianPhoneNumber(valid.phone),
        email: valid.email ? valid.email.trim().toLowerCase() : undefined,
        tags: valid.tags && valid.tags.length > 0 ? valid.tags : ['CSV_Import', 'Lead'],
        stage: (valid.stage as any) || 'NEW_LEAD',
        notes: valid.notes || 'Imported via CSV upload',
        messageCount: 0,
        createdAt: now,
        lastContactAt: now,
      })
    }

    // 2. If allowDuplicates is true, also insert duplicate rows with an override tag
    if (allowDuplicates && parseResult.duplicateRows.length > 0) {
      for (const dup of parseResult.duplicateRows) {
        contactsToInsert.push({
          id: `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          territoryId,
          name: dup.name,
          phone: normalizeIndianPhoneNumber(dup.phone),
          email: dup.email ? dup.email.trim().toLowerCase() : undefined,
          tags: [...(dup.tags || ['Lead']), 'Duplicate_Override'],
          stage: (dup.stage as any) || 'NEW_LEAD',
          notes: `${dup.notes || ''} [Duplicate overridden from existing contact: ${dup.existingContactId}]`.trim(),
          messageCount: 0,
          createdAt: now,
          lastContactAt: now,
        })
      }
    }

    if (contactsToInsert.length > 0) {
      if (!store.contacts) store.contacts = []
      store.contacts = [...contactsToInsert, ...store.contacts]
      saveStore(store)

      logAuditEvent({
        actorId: auth.user.userId,
        actorName: auth.user.phone,
        actorRole: auth.user.role,
        action: 'contacts.csv_import',
        details: `Imported ${contactsToInsert.length} contacts via CSV (valid: ${parseResult.validContacts.length}, duplicates reported: ${parseResult.duplicateRows.length}, invalid: ${parseResult.invalidRows.length})`,
        metadata: {
          insertedCount: contactsToInsert.length,
          duplicateRowsCount: parseResult.duplicateRows.length,
          invalidRowsCount: parseResult.invalidRows.length,
          allowDuplicates,
        },
        territoryId,
      })
    }

    return NextResponse.json({
      success: true,
      message: `CSV processed successfully. ${contactsToInsert.length} contact(s) imported.`,
      insertedCount: contactsToInsert.length,
      validCount: parseResult.validContacts.length,
      duplicateCount: parseResult.duplicateRows.length,
      invalidCount: parseResult.invalidRows.length,
      duplicateRows: parseResult.duplicateRows,
      invalidRows: parseResult.invalidRows,
      wasDuplicateAllowed: allowDuplicates,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
