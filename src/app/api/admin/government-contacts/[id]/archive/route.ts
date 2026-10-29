import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadStore, saveStore } from '@/lib/store'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import type { AuditLog } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const { id } = await params
    const store = loadStore()

    const contact = (store.governmentContacts || []).find((c) => c.id === id)
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const terrCheck = await requireTerritoryAccess(req, contact.territoryId)
    if (terrCheck.errorResponse) return terrCheck.errorResponse

    const now = new Date().toISOString()
    contact.status = 'archived'
    contact.updatedAt = now
    contact.updatedBy = user.userId || user.phone

    if (!store.auditLogs) store.auditLogs = []
    const audit: AuditLog = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: user.userId || user.phone,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: contact.territoryId,
      action: 'GOVT_CONTACT_ARCHIVED',
      details: `Archived government contact ${contact.name} (${contact.id})`,
      metadata: { contactId: id, status: 'archived' },
      createdAt: now,
    }
    store.auditLogs.push(audit)

    saveStore(store)

    return NextResponse.json({
      success: true,
      contact,
      message: 'Government contact archived successfully',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Archive action failed' },
      { status: 500 }
    )
  }
}
