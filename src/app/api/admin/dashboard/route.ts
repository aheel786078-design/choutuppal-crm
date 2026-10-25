import { NextResponse } from 'next/server'
import { loadStore } from '@/lib/store'

export async function GET() {
  const store = loadStore()

  const totalListings = store.listings.length
  const approvedListings = store.listings.filter((l) => l.status === 'APPROVED' || l.status === 'published').length
  const pendingListings = store.listings.filter((l) => l.status === 'PENDING' || l.status === 'pending_approval').length
  const featuredListings = store.listings.filter((l) => l.isFeatured).length

  const totalContacts = store.contacts.length
  const activeLeads = store.contacts.filter((c) => c.stage !== 'LOST').length
  const totalFlows = store.flows.length
  const activeFlows = store.flows.filter((f) => f.isActive).length

  const pendingApprovals = store.approvals ? store.approvals.filter((a) => a.status === 'pending').length : 0
  const totalStories = store.stories ? store.stories.length : 0
  const totalOffers = store.offers ? store.offers.length : 0
  const totalFranchises = store.franchises ? store.franchises.length : 0

  const totalNews = store.news.length
  const totalShorts = store.shorts.length
  const totalBanners = store.banners.length
  const totalUsers = store.users.length

  const totalViews = store.listings.reduce((sum, l) => sum + (l.views || 0), 0)
  const totalWhatsappClicks = store.listings.reduce((sum, l) => sum + (l.whatsappClicks || 0), 0)

  return NextResponse.json({
    success: true,
    stats: {
      totalListings,
      approvedListings,
      pendingListings,
      featuredListings,
      totalContacts,
      activeLeads,
      totalFlows,
      activeFlows,
      pendingApprovals,
      totalStories,
      totalOffers,
      totalFranchises,
      totalNews,
      totalShorts,
      totalBanners,
      totalUsers,
      totalViews,
      totalWhatsappClicks,
    },
    recentListings: store.listings.slice(0, 5),
    recentContacts: store.contacts.slice(0, 5),
    recentApprovals: store.approvals ? store.approvals.filter((a) => a.status === 'pending').slice(0, 3) : [],
    banners: store.banners || [],
    stories: store.stories || [],
    offers: store.offers || [],
    tickers: store.tickers || [],
    news: store.news || [],
    shorts: store.shorts || [],
  })
}
