import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { loadStore, saveStore } from '@/lib/store'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import { isValidIndianPhoneNumber } from '@/lib/government-contacts'
import { GOVT_CONTACT_CATEGORIES } from '@/lib/constants'
import type { GovernmentContact, AuditLog, GovtContactStatus, GovtContactCategory, GovtSourceType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { id } = await params
    const store = loadStore()

    const contact = (store.governmentContacts || []).find((c) => c.id === id)
    if (!contact) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const terrCheck = await requireTerritoryAccess(req, contact.territoryId)
    if (terrCheck.errorResponse) return terrCheck.errorResponse

    return NextResponse.json({
      success: true,
      contact,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve contact' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const { id } = await params
    const store = loadStore()

    const contactIndex = (store.governmentContacts || []).findIndex((c) => c.id === id)
    if (contactIndex === -1) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const currentContact = store.governmentContacts![contactIndex]

    const terrCheck = await requireTerritoryAccess(req, currentContact.territoryId)
    if (terrCheck.errorResponse) return terrCheck.errorResponse

    const body = await req.json()
    const now = new Date().toISOString()

    // Phone validation if provided
    if (body.phoneNumber !== undefined && body.phoneNumber && !isValidIndianPhoneNumber(body.phoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number or emergency short code format' },
        { status: 400 }
      )
    }

    // Category validation if provided
    if (body.category !== undefined && !GOVT_CONTACT_CATEGORIES.some((c) => c.id === body.category)) {
      return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 })
    }

    // Material detail change detection:
    // If phone number or name changes on a published contact, revert to pending_verification!
    let newStatus = body.status !== undefined ? (body.status as GovtContactStatus) : currentContact.status
    const phoneChanged = body.phoneNumber !== undefined && body.phoneNumber.trim() !== (currentContact.phoneNumber || '').trim()
    const nameChanged = body.name !== undefined && body.name.trim() !== currentContact.name.trim()

    if ((phoneChanged || nameChanged) && currentContact.status === 'published' && body.status === undefined) {
      newStatus = 'pending_verification'
    }

    const updatedContact: GovernmentContact = {
      ...currentContact,
      name: body.name !== undefined ? body.name.trim() : currentContact.name,
      designation: body.designation !== undefined ? body.designation.trim() : currentContact.designation,
      category: body.category !== undefined ? (body.category as GovtContactCategory) : currentContact.category,
      subcategory: body.subcategory !== undefined ? body.subcategory?.trim() : currentContact.subcategory,
      phoneNumber: body.phoneNumber !== undefined ? body.phoneNumber?.trim() : currentContact.phoneNumber,
      alternatePhoneNumber: body.alternatePhoneNumber !== undefined ? body.alternatePhoneNumber?.trim() : currentContact.alternatePhoneNumber,
      email: body.email !== undefined ? body.email?.trim() : currentContact.email,
      officeAddress: body.officeAddress !== undefined ? body.officeAddress?.trim() : currentContact.officeAddress,
      district: body.district !== undefined ? body.district?.trim() : currentContact.district,
      mandal: body.mandal !== undefined ? body.mandal?.trim() : currentContact.mandal,
      village: body.village !== undefined ? body.village?.trim() : currentContact.village,
      ward: body.ward !== undefined ? body.ward?.trim() : currentContact.ward,
      officeHours: body.officeHours !== undefined ? body.officeHours?.trim() : currentContact.officeHours,
      availability: body.availability !== undefined ? body.availability : currentContact.availability,
      sourceType: body.sourceType !== undefined ? (body.sourceType as GovtSourceType) : currentContact.sourceType,
      sourceUrl: body.sourceUrl !== undefined ? body.sourceUrl?.trim() : currentContact.sourceUrl,
      sourceReference: body.sourceReference !== undefined ? body.sourceReference?.trim() : currentContact.sourceReference,
      status: newStatus,
      isEmergency: body.isEmergency !== undefined ? Boolean(body.isEmergency) : currentContact.isEmergency,
      isPublicContact: body.isPublicContact !== undefined ? Boolean(body.isPublicContact) : currentContact.isPublicContact,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : currentContact.displayOrder,
      notes: body.notes !== undefined ? body.notes?.trim() : currentContact.notes,
      updatedAt: now,
      updatedBy: user.userId || user.phone,
    }

    store.governmentContacts![contactIndex] = updatedContact

    if (!store.auditLogs) store.auditLogs = []
    const audit: AuditLog = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: user.userId || user.phone,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: updatedContact.territoryId,
      action: 'GOVT_CONTACT_UPDATED',
      details: `Updated government contact ${updatedContact.name} (${updatedContact.id}). Status: ${updatedContact.status}`,
      metadata: { contactId: id, status: updatedContact.status, phoneChanged, nameChanged },
      createdAt: now,
    }
    store.auditLogs.push(audit)

    saveStore(store)

    return NextResponse.json({
      success: true,
      contact: updatedContact,
      revertedToPendingVerification: newStatus === 'pending_verification' && currentContact.status === 'published',
      message: 'Government contact updated successfully',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse
    const user = auth.user

    const { id } = await params
    const store = loadStore()

    const contactIndex = (store.governmentContacts || []).findIndex((c) => c.id === id)
    if (contactIndex === -1) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const currentContact = store.governmentContacts![contactIndex]
    const terrCheck = await requireTerritoryAccess(req, currentContact.territoryId)
    if (terrCheck.errorResponse) return terrCheck.errorResponse

    const now = new Date().toISOString()
    // Soft-archive instead of hard-deleting
    currentContact.status = 'archived'
    currentContact.updatedAt = now
    currentContact.updatedBy = user.userId || user.phone

    if (!store.auditLogs) store.auditLogs = []
    const audit: AuditLog = {
      id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      actorId: user.userId || user.phone,
      actorName: user.phone,
      actorRole: user.role,
      territoryId: currentContact.territoryId,
      action: 'GOVT_CONTACT_ARCHIVED',
      details: `Archived government contact ${currentContact.name} (${currentContact.id})`,
      metadata: { contactId: id },
      createdAt: now,
    }
    store.auditLogs.push(audit)

    saveStore(store)

    return NextResponse.json({
      success: true,
      message: 'Government contact archived successfully',
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to archive contact' },
      { status: 500 }
    )
  }
}
