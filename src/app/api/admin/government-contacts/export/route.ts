import { NextRequest, NextResponse } from 'next/server'
import { loadStore, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import { requireAuth } from '@/lib/auth-server'
import type { GovernmentContact } from '@/lib/types'

export const dynamic = 'force-dynamic'

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return ''
  let str = String(val)
  // Defense against CSV / Spreadsheet Formula Injection (CWE-1236)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const store = loadStore()
    const allContacts = store.governmentContacts || []

    // Multi-tenant territory scoping: Super Admin can export all or filtered; Franchise Admin only their territory
    const contacts =
      user.role === 'SUPER_ADMIN'
        ? allContacts
        : allContacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)

    const headers = [
      'id',
      'name',
      'designation',
      'category',
      'subcategory',
      'phone_number',
      'alternate_phone_number',
      'email',
      'district',
      'mandal',
      'village',
      'ward',
      'office_address',
      'office_hours',
      'availability',
      'source_type',
      'source_url',
      'source_reference',
      'verified_at',
      'verification_due_at',
      'status',
      'is_emergency',
      'is_public_contact',
      'display_order',
      'territory_id',
      'notes',
      'created_at',
      'updated_at',
    ]

    const csvRows = [headers.join(',')]

    for (const c of contacts) {
      const row = [
        escapeCsvField(c.id),
        escapeCsvField(c.name),
        escapeCsvField(c.designation),
        escapeCsvField(c.category),
        escapeCsvField(c.subcategory || ''),
        escapeCsvField(c.phoneNumber || ''),
        escapeCsvField(c.alternatePhoneNumber || ''),
        escapeCsvField(c.email || ''),
        escapeCsvField(c.district || 'Yadadri Bhuvanagiri'),
        escapeCsvField(c.mandal || 'Choutuppal'),
        escapeCsvField(c.village || ''),
        escapeCsvField(c.ward || ''),
        escapeCsvField(c.officeAddress || ''),
        escapeCsvField(c.officeHours || ''),
        escapeCsvField(c.availability || 'office_hours'),
        escapeCsvField(c.sourceType || 'official_website'),
        escapeCsvField(c.sourceUrl || ''),
        escapeCsvField(c.sourceReference || ''),
        escapeCsvField(c.verifiedAt || ''),
        escapeCsvField(c.verificationDueAt || ''),
        escapeCsvField(c.status || 'draft'),
        escapeCsvField(c.isEmergency ? 'true' : 'false'),
        escapeCsvField(c.isPublicContact ? 'true' : 'false'),
        escapeCsvField(c.displayOrder ?? 100),
        escapeCsvField(c.territoryId || FLAGSHIP_TERRITORY_ID),
        escapeCsvField(c.notes || ''),
        escapeCsvField(c.createdAt || ''),
        escapeCsvField(c.updatedAt || ''),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    logAuditEvent({
      actorId: user.userId,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: user.role === 'SUPER_ADMIN' ? undefined : user.territoryId,
      action: 'government_contacts.exported_csv',
      entityType: 'government_contact',
      outcome: 'SUCCESS',
      details: `Exported ${contacts.length} government contacts to CSV`,
      metadata: { count: contacts.length },
    })

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="government_contacts_${Date.now()}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during CSV export' },
      { status: 500 }
    )
  }
}
