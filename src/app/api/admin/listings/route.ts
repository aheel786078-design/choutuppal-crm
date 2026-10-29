import { NextResponse } from 'next/server'
import { loadStore, saveStore, syncListingToCrm, FLAGSHIP_TERRITORY_ID, isListingPublished, logAuditEvent } from '@/lib/store'
import type { Listing } from '@/lib/types'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from '@/lib/constants'
import { requireAuth, requireTerritoryAccess, getAuthenticatedUser } from '@/lib/auth-server'
import { getListingsDAO, upsertListingDAO, deleteListingDAO, upsertContactDAO } from '@/lib/supabase-dao'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const territoryId = searchParams.get('territoryId')

    const user = await getAuthenticatedUser(req)

    const targetTerritory = !user
      ? (territoryId && territoryId !== 'all' ? territoryId : FLAGSHIP_TERRITORY_ID)
      : user.role === 'SUPER_ADMIN'
        ? (territoryId || 'all')
        : user.territoryId

    const daoResult = await getListingsDAO({
      territoryId: targetTerritory,
      publishedOnly: !user,
      pageSize: 1000,
    })

    return NextResponse.json({
      success: true,
      ...(user ? {} : { isPublic: true }),
      listings: daoResult.data,
      total: daoResult.count,
      isRemote: daoResult.isRemote,
      categories: STANDARD_CATEGORIES,
      villages: STANDARD_VILLAGES,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // 1. Require Authenticated Session
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const store = loadStore()

    const title = (body.title || '').trim()
    if (!title) {
      return NextResponse.json({ success: false, error: 'Listing Title is required' }, { status: 400 })
    }

    // 2. Prevent Cross-Tenant Injection:
    // If caller is NOT Super Admin, enforce caller's authenticated territoryId
    let territoryId = body.territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    if (auth.user.role !== 'SUPER_ADMIN') {
      territoryId = auth.user.territoryId
    }

    // 3. Enforce Franchise Plan Listing Quotas
    if (territoryId !== FLAGSHIP_TERRITORY_ID) {
      const franchise = (store.franchises || []).find((f) => f.territoryId === territoryId)
      if (franchise && franchise.featureLimits?.maxListings) {
        const currentCount = (store.listings || []).filter((l) => l.territoryId === territoryId).length
        if (currentCount >= franchise.featureLimits.maxListings) {
          return NextResponse.json(
            {
              success: false,
              error: `Franchise listing quota reached (${currentCount}/${franchise.featureLimits.maxListings}). Please upgrade the plan tier to add more listings.`,
            },
            { status: 403 }
          )
        }
      }
    }

    const categoryObj =
      STANDARD_CATEGORIES.find((c) => c.id === body.categoryId || c.slug === body.categoryId) ||
      STANDARD_CATEGORIES[0]

    const villageObj =
      STANDARD_VILLAGES.find((v) => v.id === body.villageId || v.slug === body.villageId) ||
      STANDARD_VILLAGES[0]

    // Generate clean slug
    const cleanSlug =
      body.slug ||
      `${title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}-${villageObj.slug}`

    const newListing: Listing = {
      id: `lst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      territoryId,
      slug: cleanSlug,
      title,
      description: body.description || '',
      status: body.status || 'APPROVED',
      type: body.type || 'BUSINESS',
      isFeatured: Boolean(body.isFeatured),
      isPremium: Boolean(body.isPremium),
      coverImage: body.coverImage || PRESET_PHOTO_COVERS[0].url,
      logo: body.logo || '',
      gallery: Array.isArray(body.gallery) && body.gallery.length > 0 ? body.gallery : [body.coverImage || PRESET_PHOTO_COVERS[0].url],
      phone: body.phone || '9848012345',
      secondaryPhone: body.secondaryPhone || '',
      whatsapp: body.whatsapp || body.phone || '9848012345',
      email: body.email || '',
      website: body.website || '',
      address: body.address || `${villageObj.name}`,
      location: body.location || villageObj.name,
      price: body.price || '',
      categoryId: categoryObj.id,
      categoryName: categoryObj.name,
      villageId: villageObj.id,
      villageName: villageObj.name,
      views: 0,
      clicks: 0,
      whatsappClicks: 0,
      syncedToCrm: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const synced = syncListingToCrm(newListing, {
      inStore: store,
      callerTerritoryId: territoryId,
      callerRole: auth.user.role,
    })

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId,
      action: 'listing.created',
      entityType: 'listing',
      entityId: newListing.id,
      outcome: 'SUCCESS',
      details: `Created listing "${newListing.title}" (${newListing.id}) in territory ${territoryId}`,
      metadata: { listingId: newListing.id, title: newListing.title, category: newListing.categoryName },
    })

    upsertListingDAO(synced.listing).catch((err) => console.warn('[Supabase Sync Warning]', err.message))
    if (synced.contact) {
      upsertContactDAO(synced.contact).catch((err) => console.warn('[Supabase Sync Warning]', err.message))
    }

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully and synced to Website & CRM WhatsApp Flow!',
      listing: synced.listing,
    })
  } catch (err: any) {
    console.error('[API Listings POST] Exception:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

const ALLOWED_LISTING_UPDATE_FIELDS = [
  'title',
  'description',
  'phone',
  'secondaryPhone',
  'whatsapp',
  'email',
  'website',
  'address',
  'location',
  'price',
  'categoryId',
  'categoryName',
  'villageId',
  'villageName',
  'coverImage',
  'logo',
  'gallery',
  'status',
  'isFeatured',
  'isPremium',
  'type',
  'slug',
] as const

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Listing ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const idx = store.listings.findIndex((l) => l.id === id)

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 })
    }

    const existing = store.listings[idx]
    const existingTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID

    // IDOR / BOLA Guard: Caller must have access to the listing's territory
    const access = await requireTerritoryAccess(req, existingTerritoryId)
    if (access.errorResponse) return access.errorResponse

    // Mass-assignment protection: Only apply whitelisted mutable fields
    const safeUpdates: Partial<Listing> = {}
    for (const key of ALLOWED_LISTING_UPDATE_FIELDS) {
      if (key in updates) {
        ;(safeUpdates as any)[key] = updates[key]
      }
    }

    // Only Super Admin can change territoryId
    if (auth.user.role === 'SUPER_ADMIN' && updates.territoryId) {
      safeUpdates.territoryId = updates.territoryId
    }

    const updated: Listing = {
      ...existing,
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    }

    const synced = syncListingToCrm(updated, {
      inStore: store,
      callerTerritoryId: existingTerritoryId,
      callerRole: auth.user.role,
    })

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: existingTerritoryId,
      action: 'listing.updated',
      entityType: 'listing',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated listing "${updated.title}" (${id})`,
      metadata: { listingId: id, updatedFields: Object.keys(safeUpdates) },
    })

    upsertListingDAO(synced.listing).catch((err) => console.warn('[Supabase Sync Warning]', err.message))
    if (synced.contact) {
      upsertContactDAO(synced.contact).catch((err) => console.warn('[Supabase Sync Warning]', err.message))
    }

    return NextResponse.json({
      success: true,
      message: 'Listing updated and CRM Flow refreshed!',
      listing: synced.listing,
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
      return NextResponse.json({ success: false, error: 'Listing ID is required' }, { status: 400 })
    }

    const store = loadStore()
    const existing = store.listings.find((l) => l.id === id)
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 })
    }

    const existingTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID

    // IDOR / BOLA Guard: Caller must have access to the listing's territory
    const access = await requireTerritoryAccess(req, existingTerritoryId)
    if (access.errorResponse) return access.errorResponse

    store.listings = store.listings.filter((l) => l.id !== id)
    saveStore(store)

    logAuditEvent({
      actorId: auth.user.userId,
      actorName: auth.user.phone,
      actorRole: auth.user.role,
      territoryId: existingTerritoryId,
      action: 'listing.deleted',
      entityType: 'listing',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Deleted listing "${existing.title}" (${id}) from territory ${existingTerritoryId}`,
      metadata: { listingId: id, title: existing.title },
    })

    deleteListingDAO(id, existingTerritoryId).catch((err) => console.warn('[Supabase Sync Warning]', err.message))

    return NextResponse.json({ success: true, message: 'Listing deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
