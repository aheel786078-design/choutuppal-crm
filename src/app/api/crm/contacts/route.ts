import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID, logAuditEvent } from '@/lib/store'
import type { CRMContact } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'
import {
  normalizeIndianPhoneNumber,
  findDuplicateContacts,
  maskPhoneNumber,
} from '@/lib/crm-duplicates'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const checkDuplicate = searchParams.get('checkDuplicate') === 'true'
    const phoneParam = searchParams.get('phone')
    const excludeId = searchParams.get('excludeId') || undefined
    const territoryQuery = searchParams.get('territoryId')

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const callerTerritory = isSuperAdmin
      ? (territoryQuery && territoryQuery !== 'all' ? territoryQuery : undefined)
      : auth.user.territoryId

    let contacts = store.contacts || []

    // Tenant Scoping Guard: Franchise Admin can only see their territory's private customer leads
    if (!isSuperAdmin) {
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
    } else if (callerTerritory && callerTerritory !== 'all') {
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === callerTerritory)
    }

    // Fast-path: Duplicate check query
    if (checkDuplicate && phoneParam) {
      const dupResult = findDuplicateContacts(
        contacts,
        { phone: phoneParam, excludeId, territoryId: callerTerritory },
        { isSuperAdmin, callerTerritoryId: callerTerritory }
      )
      return NextResponse.json({
        success: true,
        isDuplicate: dupResult.isDuplicate,
        matches: dupResult.matches.map((m) => ({
          id: m.id,
          name: m.name,
          maskedPhone: m.maskedPhone,
          stage: m.stage,
          matchType: m.matchType,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      contacts,
      total: contacts.length,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const store = loadStore()

    const name = (body.name || '').trim()
    const rawPhone = (body.phone || '').trim()

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Contact Name must be at least 2 characters.' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeIndianPhoneNumber(rawPhone)
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a valid 10-digit Indian phone number.',
        },
        { status: 400 }
      )
    }

    // Assign caller's territory to prevent cross-tenant contact injection
    let territoryId = body.territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    if (auth.user.role !== 'SUPER_ADMIN') {
      territoryId = auth.user.territoryId
    }

    // Duplicate Contact Detection
    const allowDuplicate = Boolean(body.allowDuplicate)
    const dupCheck = findDuplicateContacts(
      store.contacts || [],
      { phone: normalizedPhone, email: body.email, name, territoryId },
      { isSuperAdmin: auth.user.role === 'SUPER_ADMIN', callerTerritoryId: territoryId }
    )

    if (dupCheck.isDuplicate && !allowDuplicate) {
      const primaryMatch = dupCheck.matches[0]
      return NextResponse.json(
        {
          success: false,
          duplicateDetected: true,
          warning: `A contact with phone number ${primaryMatch.maskedPhone} already exists: "${primaryMatch.name}" (${primaryMatch.stage}).`,
          existingContact: {
            id: primaryMatch.id,
            name: primaryMatch.name,
            maskedPhone: primaryMatch.maskedPhone,
            stage: primaryMatch.stage,
            matchType: primaryMatch.matchType,
          },
        },
        { status: 409 }
      )
    }

    const newContact: CRMContact = {
      id: `cnt_${Date.now()}`,
      territoryId,
      name,
      phone: normalizedPhone,
      email: (body.email || '').trim().toLowerCase(),
      tags: Array.isArray(body.tags) ? body.tags : ['Lead'],
      stage: body.stage || 'NEW_LEAD',
      listingId: body.listingId,
      listingTitle: body.listingTitle,
      notes: body.notes || '',
      messageCount: 0,
      lastContactAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    store.contacts.unshift(newContact)
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      action: dupCheck.isDuplicate && allowDuplicate ? 'contact.create_duplicate_override' : 'contact.created',
      entityType: 'contact',
      entityId: newContact.id,
      outcome: 'SUCCESS',
      details: dupCheck.isDuplicate && allowDuplicate
        ? `Created duplicate contact "${name}" (${maskPhoneNumber(normalizedPhone)}) overriding existing contact ${dupCheck.matches[0].id}`
        : `Created contact "${name}" (${maskPhoneNumber(normalizedPhone)}) in territory ${territoryId}`,
      territoryId,
      metadata: {
        contactId: newContact.id,
        stage: newContact.stage,
        wasDuplicateOverridden: dupCheck.isDuplicate && allowDuplicate,
      },
    })

    return NextResponse.json({
      success: true,
      contact: newContact,
      wasDuplicateOverridden: dupCheck.isDuplicate && allowDuplicate,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

const ALLOWED_CONTACT_UPDATE_FIELDS = [
  'name',
  'phone',
  'email',
  'tags',
  'stage',
  'listingId',
  'listingTitle',
  'notes',
] as const

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const { id, allowDuplicate, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const idx = store.contacts.findIndex((c) => c.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const existing = store.contacts[idx]
    const existingTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID

    // IDOR / BOLA Guard: Verify caller has access to the contact's territory
    const access = await requireTerritoryAccess(req, existingTerritoryId)
    if (access.errorResponse) return access.errorResponse

    // Mass-assignment protection: Whitelist allowed fields
    const safeUpdates: Partial<CRMContact> = {}
    for (const key of ALLOWED_CONTACT_UPDATE_FIELDS) {
      if (key in updates) {
        ;(safeUpdates as any)[key] = updates[key]
      }
    }

    // Only Super Admin can change territoryId
    if (auth.user.role === 'SUPER_ADMIN' && updates.territoryId) {
      safeUpdates.territoryId = updates.territoryId
    }

    // If phone number is updated, normalize and check for duplicate conflict
    if (safeUpdates.phone) {
      const normPhone = normalizeIndianPhoneNumber(safeUpdates.phone)
      if (!normPhone || normPhone.length !== 10) {
        return NextResponse.json(
          { success: false, error: 'Please provide a valid 10-digit Indian phone number.' },
          { status: 400 }
        )
      }
      safeUpdates.phone = normPhone

      const dupCheck = findDuplicateContacts(
        store.contacts,
        { phone: normPhone, excludeId: id, territoryId: existingTerritoryId },
        { isSuperAdmin: auth.user.role === 'SUPER_ADMIN', callerTerritoryId: existingTerritoryId }
      )

      if (dupCheck.isDuplicate && !allowDuplicate) {
        const match = dupCheck.matches[0]
        return NextResponse.json(
          {
            success: false,
            duplicateDetected: true,
            warning: `Phone number ${match.maskedPhone} is already registered to "${match.name}" (${match.stage}).`,
            existingContact: {
              id: match.id,
              name: match.name,
              maskedPhone: match.maskedPhone,
              stage: match.stage,
              matchType: match.matchType,
            },
          },
          { status: 409 }
        )
      }
    }

    const updated: CRMContact = {
      ...existing,
      ...safeUpdates,
      lastContactAt: new Date().toISOString(),
    }

    store.contacts[idx] = updated
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: existingTerritoryId,
      action: 'contact.updated',
      entityType: 'contact',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated contact "${updated.name}" (${maskPhoneNumber(updated.phone)})`,
      metadata: { contactId: id, updatedFields: Object.keys(safeUpdates) },
    })

    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      contact: updated,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Contact ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const existing = store.contacts.find((c) => c.id === id)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 })
    }

    const existingTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID
    const access = await requireTerritoryAccess(req, existingTerritoryId)
    if (access.errorResponse) return access.errorResponse

    store.contacts = store.contacts.filter((c) => c.id !== id)
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: existingTerritoryId,
      action: 'contact.deleted',
      entityType: 'contact',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Deleted contact "${existing.name}" (${maskPhoneNumber(existing.phone)}) from territory ${existingTerritoryId}`,
      metadata: { contactId: id },
    })

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
