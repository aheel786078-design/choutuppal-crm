import { loadStore, FLAGSHIP_TERRITORY_ID, isListingPublished } from './store'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from './constants'
import type { Listing, UserStory, BannerItem, NewsItem, ShortItem, TickerItem } from './types'
import { isListingFeatured, isListingPremium } from './entitlement-resolver'

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
    (l) =>
      isListingPublished(l) &&
      (l.territoryId || FLAGSHIP_TERRITORY_ID) === FLAGSHIP_TERRITORY_ID
  )

  // Sort featured & premium first using authoritative live entitlement resolver
  return valid.sort((a, b) => {
    const featA = isListingFeatured(a, store) ? 1 : 0
    const featB = isListingFeatured(b, store) ? 1 : 0
    if (featB !== featA) return featB - featA

    const premA = isListingPremium(a, store) ? 1 : 0
    const premB = isListingPremium(b, store) ? 1 : 0
    if (premB !== premA) return premB - premA

    return (b.views || 0) - (a.views || 0)
  })
}

export async function getRealEstateListings(): Promise<Listing[]> {
  const store = loadStore()
  return (store.listings || []).filter(
    (l) =>
      isListingPublished(l) &&
      (l.territoryId || FLAGSHIP_TERRITORY_ID) === FLAGSHIP_TERRITORY_ID &&
      (l.type === 'REAL_ESTATE' ||
        l.categoryId === 'cat-realestate' ||
        l.categoryName?.toLowerCase().includes('real estate'))
  )
}

export async function getServiceListings(): Promise<Listing[]> {
  const store = loadStore()
  return (store.listings || []).filter(
    (l) =>
      isListingPublished(l) &&
      (l.territoryId || FLAGSHIP_TERRITORY_ID) === FLAGSHIP_TERRITORY_ID &&
      (l.type === 'SERVICE' ||
        l.categoryId === 'cat-services' ||
        l.categoryId === 'cat-transport' ||
        l.categoryId === 'cat-electrical')
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
