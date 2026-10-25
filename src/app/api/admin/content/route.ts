import { NextResponse } from 'next/server'
import { loadStore, saveStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const store = loadStore()
  return NextResponse.json({
    success: true,
    banners: store.banners || [],
    stories: store.stories || [],
    offers: store.offers || [],
    tickers: store.tickers || [],
    news: store.news || [],
    shorts: store.shorts || [],
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, item, id, action = 'create' } = body

    const store = loadStore()

    if (action === 'delete') {
      if (type === 'banner' && store.banners) {
        store.banners = store.banners.filter((b) => b.id !== id)
      } else if (type === 'story' && store.stories) {
        store.stories = store.stories.filter((s) => s.id !== id)
      } else if (type === 'offer' && store.offers) {
        store.offers = store.offers.filter((o) => o.id !== id)
      } else if (type === 'ticker' && store.tickers) {
        store.tickers = store.tickers.filter((t) => t.id !== id)
      } else if (type === 'news' && store.news) {
        store.news = store.news.filter((n) => n.id !== id)
      } else if (type === 'short' && store.shorts) {
        store.shorts = store.shorts.filter((s) => s.id !== id)
      }
      saveStore(store)
      return NextResponse.json({ success: true, message: 'Deleted successfully' })
    }

    if (action === 'toggle') {
      if (type === 'banner' && store.banners) {
        const found = store.banners.find((b) => b.id === id)
        if (found) found.isActive = !found.isActive
      } else if (type === 'ticker' && store.tickers) {
        const found = store.tickers.find((t) => t.id === id)
        if (found) found.isActive = !found.isActive
      } else if (type === 'short' && store.shorts) {
        const found = store.shorts.find((s) => s.id === id)
        if (found) found.isActive = !found.isActive
      }
      saveStore(store)
      return NextResponse.json({ success: true, message: 'Toggled successfully' })
    }

    // Default: create or update
    if (type === 'banner') {
      if (!store.banners) store.banners = []
      const idx = store.banners.findIndex((b) => b.id === item.id)
      if (idx >= 0) store.banners[idx] = item
      else store.banners.unshift(item)
    } else if (type === 'story') {
      if (!store.stories) store.stories = []
      const idx = store.stories.findIndex((s) => s.id === item.id)
      if (idx >= 0) store.stories[idx] = item
      else store.stories.unshift(item)
    } else if (type === 'offer') {
      if (!store.offers) store.offers = []
      const idx = store.offers.findIndex((o) => o.id === item.id)
      if (idx >= 0) store.offers[idx] = item
      else store.offers.unshift(item)
    } else if (type === 'ticker') {
      if (!store.tickers) store.tickers = []
      const idx = store.tickers.findIndex((t) => t.id === item.id)
      if (idx >= 0) store.tickers[idx] = item
      else store.tickers.unshift(item)
    } else if (type === 'news') {
      if (!store.news) store.news = []
      const idx = store.news.findIndex((n) => n.id === item.id)
      if (idx >= 0) store.news[idx] = item
      else store.news.unshift(item)
    } else if (type === 'short') {
      if (!store.shorts) store.shorts = []
      const idx = store.shorts.findIndex((s) => s.id === item.id)
      if (idx >= 0) store.shorts[idx] = item
      else store.shorts.unshift(item)
    }

    saveStore(store)
    return NextResponse.json({ success: true, message: 'Saved successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
