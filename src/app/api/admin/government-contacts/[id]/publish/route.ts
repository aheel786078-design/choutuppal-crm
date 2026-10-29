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

    const body = await req.json().catch(() => ({}))
    const action = body.action === 'unpublish' ? 'unpublish' : 'publish'
    const now = new Date().toISOString()

    if (action === 'publish') {
      // 1. Must be authorized as a public contact
      if (!contact.isPublicContact) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot publish: Contact is not authorized for public release (isPublicContact is false).',
          },
          { status: 400 }
        )
      }

      // 2. Must be verified or have verified source documentation
      if (contact.status !== 'verified' && !contact.verifiedAt) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot publish: Contact must be verified before publication.',
          },
          { status: 400 }
        )
      }

      contact.status = 'published'
      contact.updatedAt = now
      contact.updatedBy = user.userId || user.phone

      if (!store.auditLogs) store.auditLogs = []
      const audit: AuditLog = {
        id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        actorId: user.userId || user.phone,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: contact.territoryId,
        action: 'GOVT_CONTACT_PUBLISHED',
        details: `Published government contact ${contact.name} (${contact.id}) for public directory`,
        metadata: { contactId: id, status: 'published' },
        createdAt: now,
      }
      store.auditLogs.push(audit)

      saveStore(store)

      return NextResponse.json({
        success: true,
        contact,
        message: 'Government contact published successfully',
      })
    } else {
      // Unpublish action
      contact.status = 'pending_verification'
      contact.updatedAt = now
      contact.updatedBy = user.userId || user.phone

      if (!store.auditLogs) store.auditLogs = []
      const audit: AuditLog = {
        id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        actorId: user.userId || user.phone,
        actorName: user.phone,
        actorRole: user.role,
        territoryId: contact.territoryId,
        action: 'GOVT_CONTACT_UNPUBLISHED',
        details: `Unpublished government contact ${contact.name} (${contact.id})`,
        metadata: { contactId: id, status: 'pending_verification' },
        createdAt: now,
      }
      store.auditLogs.push(audit)

      saveStore(store)

      return NextResponse.json({
        success: true,
        contact,
        message: 'Government contact unpublished successfully',
      })
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Publish action failed' },
      { status: 500 }
    )
  }
}
