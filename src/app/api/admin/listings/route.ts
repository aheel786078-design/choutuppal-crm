import { NextResponse } from 'next/server'
import { loadStore, saveStore, syncListingToCrm, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { Listing } from '@/lib/types'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from '@/lib/constants'
import { requireAuth, requireTerritoryAccess, getAuthenticatedUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryId = searchParams.get('territoryId')

    const user = await getAuthenticatedUser(req)
    let listings = store.listings || []

    // If unauthenticated, only return published/approved listings (prevent draft/rejected leakage)
    if (!user) {
      listings = listings.filter(
        (l) => l.status === 'APPROVED' || l.status === 'published' || l.status === 'approved'
      )
      if (territoryId && territoryId !== 'all') {
        listings = listings.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
      }
      return NextResponse.json({
        success: true,
        isPublic: true,
        listings,
        total: listings.length,
        categories: STANDARD_CATEGORIES,
        villages: STANDARD_VILLAGES,
      })
    }

    // Authenticated caller: Enforce territory scoping for Franchise Admins
    if (user.role !== 'SUPER_ADMIN') {
      listings = listings.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
    } else if (territoryId && territoryId !== 'all') {
      listings = listings.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
    }

    return NextResponse.json({
      success: true,
      listings,
      total: listings.length,
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

    syncListingToCrm(newListing)

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully and synced to Website & CRM WhatsApp Flow!',
      listing: newListing,
    })
  } catch (err: any) {
    console.error('[API Listings POST] Exception:', err)
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

    // Prevent non-super-admins from changing the listing's territoryId
    if (auth.user.role !== 'SUPER_ADMIN') {
      delete updates.territoryId
    }

    const updated: Listing = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    syncListingToCrm(updated)

    return NextResponse.json({
      success: true,
      message: 'Listing updated and CRM Flow refreshed!',
      listing: updated,
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

    return NextResponse.json({ success: true, message: 'Listing deleted successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
