import { loadStore, FLAGSHIP_TERRITORY_ID, isListingPublished } from './store'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from './constants'
import type { Listing, UserStory, BannerItem, NewsItem, ShortItem, TickerItem } from './types'
import { isListingFeatured, isListingPremium } from './entitlement-resolver'

const DEFAULT_STORIES: UserStory[] = [
  {
    id: 'st_default_1',
    businessId: 'lst_1',
    businessName: 'Sri Sai Ram Automobiles',
    ownerPhone: '9848012345',
    mediaUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    caption: 'Weekend Monsoon Free Oil Checkup & Computer Wheel Alignment camp at Choutuppal bypass!',
    status: 'published',
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString(),
    territoryId: 'territory_choutuppal',
  },
  {
    id: 'st_default_2',
    businessId: 'lst_2',
    businessName: 'Sri Thirumala Medicals',
    ownerPhone: '9441348175',
    mediaUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800',
    caption: 'All genuine medicines, baby products & health supplements with flat 15% discount today!',
    status: 'published',
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString(),
    territoryId: 'territory_choutuppal',
  },
  {
    id: 'st_default_3',
    businessId: 'lst_3',
    businessName: 'Hotel Swagath Grand & Bakers',
    ownerPhone: '9494348175',
    mediaUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    caption: 'Special Authentic Dum Biryani & Fresh Bakery Pastries Family Combo Offer in Choutuppal!',
    status: 'published',
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    createdAt: new Date().toISOString(),
    territoryId: 'territory_choutuppal',
  },
]

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'bnr_default_1',
    title: 'చౌటుప్పల్ యాప్ 2.0 లైవ్ | మీ వ్యాపారాన్ని ఉచితంగా రిజిస్టర్ చేసుకోండి',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    linkUrl: '/register',
    isActive: true,
    type: 'TOP_BANNER',
    territoryId: 'territory_choutuppal',
    clicks: 120,
    impressions: 1540,
    startDate: new Date().toISOString(),
  },
  {
    id: 'bnr_default_2',
    title: 'టాప్ హోమ్‌పేజీ బ్యానర్ యాడ్స్ ద్వారా 10,000+ స్థానిక కస్టమర్లను చేరుకోండి',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    linkUrl: 'https://wa.me/919441348175?text=Hi%20Choutuppal%2C%20I%20want%20to%20book%20a%20Banner%20Ad',
    isActive: true,
    type: 'TOP_BANNER',
    territoryId: 'territory_choutuppal',
    clicks: 85,
    impressions: 980,
    startDate: new Date().toISOString(),
  },
]

export async function getActiveStories(): Promise<UserStory[]> {
  const store = loadStore()
  const now = new Date().toISOString()
  const active = (store.stories || []).filter(
    (s) => s.status === 'published' && (!s.expiresAt || s.expiresAt > now)
  )
  if (active.length > 0) return active
  const anyPublished = (store.stories || []).filter((s) => s.status === 'published')
  return anyPublished.length > 0 ? anyPublished : DEFAULT_STORIES
}

export async function getActiveBanners(): Promise<BannerItem[]> {
  const store = loadStore()
  const active = (store.banners || []).filter((b) => b.isActive !== false)
  return active.length > 0 ? active : DEFAULT_BANNERS
}

export async function getCategories() {
  return STANDARD_CATEGORIES
}

export async function getVillages() {
  return STANDARD_VILLAGES
}

export function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url) return 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80'
  if (url.includes('photo-1541888946425-d0fbb186f5f8')) {
    return 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80'
  }
  return url
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
  }).map((l) => ({
    ...l,
    coverImage: sanitizeImageUrl(l.coverImage),
  }))
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
  ).map((l) => ({
    ...l,
    coverImage: sanitizeImageUrl(l.coverImage),
  }))
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

export interface BlogItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  createdAt: Date | string
}

const DEFAULT_BLOGS: BlogItem[] = [
  {
    id: 'blog-1',
    title: 'చౌటుప్పల్ నేషనల్ హైవే 65 రియల్ ఎస్టేట్ గైడ్ 2026: ఓపెన్ ప్లాట్ల కొనుగోలు సూత్రాలు',
    slug: 'choutuppal-nh65-real-estate-guide',
    excerpt: 'హైదరాబాద్-విజయవాడ నేషనల్ హైవే పై DTCP & HMDA అప్రూవ్డ్ ప్లాట్లలో పెట్టుబడి పెట్టేందుకు ముఖ్యమైన చిట్కాలు.',
    coverImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'blog-2',
    title: 'చౌటుప్పల్ స్థానిక వ్యాపారులు వాట్సాప్ ద్వారా కస్టమర్లను ఎలా పెంచుకోవాలి?',
    slug: 'local-business-whatsapp-growth-choutuppal',
    excerpt: 'డిజిటల్ మార్కెటింగ్ మరియు వాట్సాప్ బిజినెస్ ఆటోమేషన్ ద్వారా స్థానిక కస్టమర్ల ఆర్డర్లు రెట్టింపు చేసే వ్యూహాలు.',
    coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'blog-3',
    title: 'చౌటుప్పల్ మున్సిపాలిటీ తాజా అభివృద్ధి పనులు: రహదారుల విస్తరణ & మౌలిక వసతులు',
    slug: 'choutuppal-municipality-development-updates',
    excerpt: 'పట్టణంలో జరుగుతున్న తాగునీరు, డ్రైనేజీ మరియు వాణిజ్య రోడ్ల ఆధునీకరణ ప్రాజెక్టుల తాజా సమాచారం.',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'blog-4',
    title: 'చౌటుప్పల్ 24/7 ఎమర్జెన్సీ సర్వీసులు: టాక్సీ, ఆటో, ప్లంబర్ & ఎలక్ట్రీషియన్ గైడ్',
    slug: 'choutuppal-24-7-emergency-services-guide',
    excerpt: 'అత్యవసర పరిస్థితుల్లో ఒకే క్లిక్‌తో నమ్మకమైన డ్రైవర్లు, మెకానిక్‌లు మరియు టెక్నీషియన్లను పొందే విధానం.',
    coverImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    createdAt: new Date().toISOString(),
  },
]

export async function getBlogs(): Promise<BlogItem[]> {
  const store = loadStore()
  const custom = (store as any).blogs
  if (Array.isArray(custom) && custom.length > 0) {
    return custom
  }
  return DEFAULT_BLOGS
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
    blogs,
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
    getBlogs(),
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
    blogs,
    totalListings: featured.length,
  }
}
