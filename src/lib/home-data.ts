import { loadStore } from './store'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from './constants'
import { Listing, UserStory, BannerItem, NewsItem, ShortItem, TickerItem } from './types'

export async function getActiveStories(): Promise<UserStory[]> {
  const store = loadStore()
  const now = new Date().toISOString()
  return (store.stories || []).filter(
    (s) => s.status === 'published' && (!s.expiresAt || s.expiresAt > now)
  )
}

export async function getActiveBanners(): Promise<BannerItem[]> {
  const store = loadStore()
  return (store.banners || []).filter((b) => b.isActive !== false)
}

export async function getCategories() {
  return STANDARD_CATEGORIES
}

export async function getVillages() {
  return STANDARD_VILLAGES
}

export async function getFeaturedListings(): Promise<Listing[]> {
  const store = loadStore()
  const valid = (store.listings || []).filter(
    (l) => l.status === 'published' || l.status === 'approved' || l.status === 'APPROVED'
  )

  // Sort featured & premium first
  return valid.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)
    if (a.isPremium !== b.isPremium) return (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0)
    return b.views - a.views
  })
}

export async function getRealEstateListings(): Promise<Listing[]> {
  const store = loadStore()
  return (store.listings || []).filter(
    (l) =>
      l.type === 'REAL_ESTATE' ||
      l.categoryId === 'cat-realestate' ||
      l.categoryName?.toLowerCase().includes('real estate')
  )
}

export async function getServiceListings(): Promise<Listing[]> {
  const store = loadStore()
  return (store.listings || []).filter(
    (l) =>
      l.type === 'SERVICE' ||
      l.categoryId === 'cat-services' ||
      l.categoryId === 'cat-transport' ||
      l.categoryId === 'cat-electrical'
  )
}

export async function getShorts(): Promise<ShortItem[]> {
  const store = loadStore()
  return (store.shorts || []).filter((s) => s.isActive !== false)
}

export async function getLatestNews(): Promise<NewsItem[]> {
  const store = loadStore()
  return (store.news || []).filter((n) => n.isPublished !== false)
}

export async function getTickers(): Promise<TickerItem[]> {
  const store = loadStore()
  return (store.tickers || []).filter((t) => t.isActive !== false)
}

export async function getHomePageData() {
  const [
    stories,
    banners,
    categories,
    featured,
    realEstate,
    services,
    shorts,
    villages,
    latestNews,
    tickers,
  ] = await Promise.all([
    getActiveStories(),
    getActiveBanners(),
    getCategories(),
    getFeaturedListings(),
    getRealEstateListings(),
    getServiceListings(),
    getShorts(),
    getVillages(),
    getLatestNews(),
    getTickers(),
  ])

  return {
    stories,
    banners,
    categories,
    featured: featured.slice(0, 50),
    realEstate: realEstate.slice(0, 20),
    services: services.slice(0, 20),
    shorts,
    villages,
    latestNews,
    tickers,
    totalListings: featured.length,
  }
}
