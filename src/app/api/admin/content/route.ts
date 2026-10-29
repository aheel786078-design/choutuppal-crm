import { NextResponse } from 'next/server'
import { loadStore, saveStore, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { getAuthenticatedUser, requireAuth, requireTerritoryAccess } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryParam = searchParams.get('territoryId')
    const user = await getAuthenticatedUser(req)

    let banners = store.banners || []
    let stories = store.stories || []
    let offers = store.offers || []
    let tickers = store.tickers || []
    let news = store.news || []
    let shorts = store.shorts || []

    // 1. Unauthenticated / Public Request: Only return published & active content
    if (!user) {
      const now = new Date().toISOString()
      banners = banners.filter((b) => b.isActive !== false)
      stories = stories.filter((s) => s.status === 'published' && (!s.expiresAt || s.expiresAt > now))
      offers = offers.filter((o) => o.status === 'published' && (!o.endDate || o.endDate > now))
      tickers = tickers.filter((t) => t.isActive !== false)
      news = news.filter((n) => n.isPublished !== false)
      shorts = shorts.filter((s) => s.isActive !== false)

      if (territoryParam && territoryParam !== 'all') {
        banners = banners.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
        stories = stories.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
        offers = offers.filter((o) => (o.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
        tickers = tickers.filter((t) => (t.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
        news = news.filter((n) => (n.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
        shorts = shorts.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      }

      return NextResponse.json({
        success: true,
        isPublic: true,
        banners,
        stories,
        offers,
        tickers,
        news,
        shorts,
      })
    }

    // 2. Authenticated Admin Caller: Tenant isolation
    if (user.role !== 'SUPER_ADMIN') {
      // Franchise Admin: strictly scoped to caller's territory
      banners = banners.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
      stories = stories.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
      offers = offers.filter((o) => (o.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
      tickers = tickers.filter((t) => (t.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
      news = news.filter((n) => (n.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
      shorts = shorts.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === user.territoryId)
    } else if (territoryParam && territoryParam !== 'all') {
      // Super Admin filtered by specific territory
      banners = banners.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      stories = stories.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      offers = offers.filter((o) => (o.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      tickers = tickers.filter((t) => (t.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      news = news.filter((n) => (n.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
      shorts = shorts.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territoryParam)
    }

    return NextResponse.json({
      success: true,
      banners,
      stories,
      offers,
      tickers,
      news,
      shorts,
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
    const { type, item, id, action = 'create' } = body

    const validTypes = ['banner', 'story', 'offer', 'ticker', 'news', 'short']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid content type "${type}". Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const typeKeyMap: Record<string, 'banners' | 'stories' | 'offers' | 'tickers' | 'news' | 'shorts'> = {
      banner: 'banners',
      story: 'stories',
      offer: 'offers',
      ticker: 'tickers',
      news: 'news',
      short: 'shorts',
    }
    const listKey = typeKeyMap[type]

    const store = loadStore()
    if (!store[listKey]) {
      (store as any)[listKey] = []
    }
    const list = store[listKey] as any[]

    // ------------------------------------------------------------------------
    // ACTION: DELETE
    // ------------------------------------------------------------------------
    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID is required to delete' }, { status: 400 })
      }
      const existing = list.find((x) => x.id === id)
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
      }

      const itemTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID

      // Guard: Franchise Admin cannot delete Flagship content
      if (itemTerritoryId === FLAGSHIP_TERRITORY_ID && auth.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Flagship Choutuppal content can only be deleted by Super Admin' },
          { status: 403 }
        )
      }

      // Guard: Cross-tenant isolation
      const access = await requireTerritoryAccess(req, itemTerritoryId)
      if (access.errorResponse) return access.errorResponse;

      (store as any)[listKey] = list.filter((x) => x.id !== id)
      saveStore(store)
      return NextResponse.json({ success: true, message: 'Deleted successfully' })
    }

    // ------------------------------------------------------------------------
    // ACTION: TOGGLE ACTIVE / PUBLISHED STATUS
    // ------------------------------------------------------------------------
    if (action === 'toggle') {
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID is required to toggle status' }, { status: 400 })
      }
      const existing = list.find((x) => x.id === id)
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
      }

      const itemTerritoryId = existing.territoryId || FLAGSHIP_TERRITORY_ID
      const access = await requireTerritoryAccess(req, itemTerritoryId)
      if (access.errorResponse) return access.errorResponse

      if (existing.isActive !== undefined) {
        existing.isActive = !existing.isActive
      } else if (existing.isPublished !== undefined) {
        existing.isPublished = !existing.isPublished
      } else if (existing.status !== undefined) {
        existing.status = existing.status === 'published' ? 'draft' : 'published'
      }

      saveStore(store)
      return NextResponse.json({
        success: true,
        message: 'Status updated successfully',
        item: existing,
      })
    }

    // ------------------------------------------------------------------------
    // ACTION: CREATE OR UPDATE
    // ------------------------------------------------------------------------
    if (!item || typeof item !== 'object') {
      return NextResponse.json({ success: false, error: 'Item payload object is required' }, { status: 400 })
    }

    // Input Validations per Type
    if (type === 'banner') {
      if (!item.title?.trim()) {
        return NextResponse.json({ success: false, error: 'Banner title is required' }, { status: 400 })
      }
      if (!item.imageUrl?.trim()) {
        return NextResponse.json({ success: false, error: 'Banner image URL is required' }, { status: 400 })
      }
    } else if (type === 'ticker') {
      if (!item.text?.trim()) {
        return NextResponse.json({ success: false, error: 'Ticker text is required' }, { status: 400 })
      }
    } else if (type === 'news') {
      if (!item.title?.trim()) {
        return NextResponse.json({ success: false, error: 'News headline is required' }, { status: 400 })
      }
    } else if (type === 'story') {
      if (!item.caption?.trim()) {
        return NextResponse.json({ success: false, error: 'Story caption is required' }, { status: 400 })
      }
      if (!item.mediaUrl?.trim()) {
        return NextResponse.json({ success: false, error: 'Story media URL is required' }, { status: 400 })
      }
    } else if (type === 'offer') {
      if (!item.title?.trim()) {
        return NextResponse.json({ success: false, error: 'Offer title is required' }, { status: 400 })
      }
      if (!item.discount?.trim()) {
        return NextResponse.json({ success: false, error: 'Offer discount is required' }, { status: 400 })
      }
    } else if (type === 'short') {
      if (!item.title?.trim()) {
        return NextResponse.json({ success: false, error: 'Short title is required' }, { status: 400 })
      }
      if (!item.videoUrl?.trim()) {
        return NextResponse.json({ success: false, error: 'Short video URL is required' }, { status: 400 })
      }
    }

    // Territory Enactment: Franchise Admins are locked to their own territory
    let targetTerritoryId = item.territoryId || auth.user.territoryId || FLAGSHIP_TERRITORY_ID
    if (auth.user.role !== 'SUPER_ADMIN') {
      targetTerritoryId = auth.user.territoryId
    }
    item.territoryId = targetTerritoryId

    const existingIdx = item.id ? list.findIndex((x) => x.id === item.id) : -1

    if (existingIdx >= 0) {
      // Update existing item
      const existingItem = list[existingIdx]
      const existingTerritoryId = existingItem.territoryId || FLAGSHIP_TERRITORY_ID

      const access = await requireTerritoryAccess(req, existingTerritoryId)
      if (access.errorResponse) return access.errorResponse

      if (auth.user.role !== 'SUPER_ADMIN') {
        item.territoryId = existingTerritoryId
      }

      list[existingIdx] = {
        ...existingItem,
        ...item,
        updatedAt: new Date().toISOString(),
      }
      saveStore(store)
      return NextResponse.json({
        success: true,
        message: 'Updated successfully',
        item: list[existingIdx],
      })
    } else {
      // Create new item
      const prefix = type === 'banner' ? 'ban' : type === 'ticker' ? 'tick' : type === 'story' ? 'st' : type === 'offer' ? 'off' : type === 'news' ? 'news' : 'sh'
      const newItem = {
        id: item.id || `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...item,
        territoryId: targetTerritoryId,
        createdAt: item.createdAt || new Date().toISOString(),
      }
      list.unshift(newItem)
      saveStore(store)
      return NextResponse.json({
        success: true,
        message: 'Created successfully',
        item: newItem,
      })
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

