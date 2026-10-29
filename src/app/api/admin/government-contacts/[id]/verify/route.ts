import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadStore, saveStore } from '@/lib/store'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import type { AuditLog, GovtSourceType } from '@/lib/types'

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
    const sourceType: GovtSourceType = body.sourceType || contact.sourceType || 'official_website'
    const sourceUrl = body.sourceUrl?.trim() || contact.sourceUrl?.trim()
    const sourceReference = body.sourceReference?.trim() || contact.sourceReference?.trim()

    // Verification requirement: A contact must have an identified source or documented authorized confirmation
    if (!sourceUrl && !sourceReference) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verification requires an identified official source URL or documented source reference.',
        },
        { status: 400 }
      )
    }

    const reviewDays = Number(body.reviewDays) || 180 // Default 6-month re-verification policy
    const now = new Date()
    const verifiedAt = now.toISOString()
    const verificationDueAt = new Date(now.getTime() + reviewDays * 24 * 60 * 60 * 1000).toISOString()

    contact.status = 'verified'
    contact.sourceType = sourceType
    if (sourceUrl) contact.sourceUrl = sourceUrl
    if (sourceReference) contact.sourceReference = sourceReference
    contact.verifiedAt = verifiedAt
    contact.verificationDueAt = verificationDueAt
    contact.verifiedBy = user.userId || user.phone
    contact.updatedAt = verifiedAt
    contact.updatedBy = user.userId || user.phone

    if (!store.auditLogs) store.auditLogs = []
    const audit: AuditLog = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: user.userId || user.phone,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: contact.territoryId,
      action: 'GOVT_CONTACT_VERIFIED',
      details: `Verified contact ${contact.name} (${contact.id}). Source: ${sourceType} (${sourceUrl || sourceReference}). Review due in ${reviewDays} days.`,
      metadata: { contactId: id, verifiedAt, verificationDueAt, sourceType },
      createdAt: verifiedAt,
    }
    store.auditLogs.push(audit)

    saveStore(store)

    return NextResponse.json({
      success: true,
      contact,
      message: 'Government contact verified successfully',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
