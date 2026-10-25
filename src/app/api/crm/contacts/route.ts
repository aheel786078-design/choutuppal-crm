import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { CRMContact } from '@/lib/types'
import { requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    let contacts = store.contacts || []

    // Tenant Scoping Guard: Franchise Admin can only see their territory's private customer leads
    if (auth.user.role !== 'SUPER_ADMIN') {
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === auth.user.territoryId)
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

    // Assign caller's territory to prevent cross-tenant contact injection
    let territoryId = body.territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    if (auth.user.role !== 'SUPER_ADMIN') {
      territoryId = auth.user.territoryId
    }

    const newContact: CRMContact = {
      id: `cnt_${Date.now()}`,
      territoryId,
      name: body.name || 'New Lead',
      phone: body.phone || '9848000000',
      email: body.email || '',
      tags: body.tags || ['Lead'],
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

    return NextResponse.json({
      success: true,
      contact: newContact,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const { id, ...updates } = body

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

    // Non-super-admins cannot reassign contact territory
    if (auth.user.role !== 'SUPER_ADMIN') {
      delete updates.territoryId
    }

    store.contacts[idx] = {
      ...existing,
      ...updates,
      lastContactAt: new Date().toISOString(),
    }

    saveStore(store)

    return NextResponse.json({
      success: true,
      contact: store.contacts[idx],
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

    return NextResponse.json({ success: true, message: 'Contact deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
