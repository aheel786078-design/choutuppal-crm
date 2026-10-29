import { NextResponse } from 'next/server'
import { loadStore, isListingPublished, FLAGSHIP_TERRITORY_ID } from '@/lib/store'
import { getDefaultGovernmentContacts } from '@/lib/government-contacts'
import { requireAuth } from '@/lib/auth-server'
import type { DashboardActionableTask } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth.errorResponse) return auth.errorResponse

    const store = loadStore()
    const { searchParams } = new URL(req.url)
    const territoryQuery = searchParams.get('territoryId')
    const period = searchParams.get('period') || 'all_time'

    const isSuperAdmin = auth.user.role === 'SUPER_ADMIN'
    const targetTerritory = isSuperAdmin
      ? (territoryQuery && territoryQuery !== 'all' ? territoryQuery : null)
      : (auth.user.territoryId || FLAGSHIP_TERRITORY_ID)

    // Compute period cutoff timestamp
    const now = Date.now()
    let cutoffMs = 0
    if (period === 'today') {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      cutoffMs = d.getTime()
    } else if (period === '7d') {
      cutoffMs = now - 7 * 24 * 60 * 60 * 1000
    } else if (period === '30d') {
      cutoffMs = now - 30 * 24 * 60 * 60 * 1000
    }

    const isWithinPeriod = (dateStr?: string | null): boolean => {
      if (!cutoffMs) return true // all_time
      if (!dateStr) return false
      const t = new Date(dateStr).getTime()
      return !isNaN(t) && t >= cutoffMs
    }

    // Apply territory scoping
    let listings = store.listings || []
    let contacts = store.contacts || []
    let deals = store.deals || []
    let approvals = store.approvals || []
    let banners = store.banners || []
    let stories = store.stories || []
    let offers = store.offers || []
    let tickers = store.tickers || []
    let news = store.news || []
    let shorts = store.shorts || []
    let automations = store.automations || []
    let flows = store.flows || []
    let broadcasts = store.broadcasts || []
    let subscriptions = store.subscriptions || []
    let orders = store.orders || []
    let franchises = store.franchises || []
    let rawGovt = (store.governmentContacts && store.governmentContacts.length > 0)
      ? store.governmentContacts
      : getDefaultGovernmentContacts()

    if (targetTerritory) {
      listings = listings.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      contacts = contacts.filter((c) => (c.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      deals = deals.filter((d) => (d.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      approvals = approvals.filter((a) => (a.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      banners = banners.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      stories = stories.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      offers = offers.filter((o) => (o.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      tickers = tickers.filter((t) => (t.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      news = news.filter((n) => (n.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      shorts = shorts.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      automations = automations.filter((a) => (a.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      flows = flows.filter((f) => (f.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      broadcasts = broadcasts.filter((b) => (b.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      subscriptions = subscriptions.filter((s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      orders = orders.filter((o) => (o.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      franchises = franchises.filter((f) => (f.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
      rawGovt = rawGovt.filter((g) => (g.territoryId || FLAGSHIP_TERRITORY_ID) === targetTerritory)
    }

    // 1. Executive Metrics Calculation
    // Tenants / Franchises
    const totalFranchises = franchises.length
    const activeFranchises = franchises.filter((f) => f.status === 'active').length
    const inactiveFranchises = franchises.filter((f) => f.status !== 'active').length
    const pendingFranchises = franchises.filter(
      (f) => f.status === 'application_submitted' || f.status === 'under_review' || f.status === 'approved_pending_setup'
    ).length
    const periodNewFranchises = franchises.filter((f) => isWithinPeriod(f.createdAt)).length

    // Business Listings
    const totalListings = listings.length
    const approvedListings = listings.filter(isListingPublished).length
    const pendingListings = listings.filter((l) => l.status === 'PENDING' || l.status === 'pending_approval').length
    const draftListings = listings.filter((l) => l.status === 'draft').length
    const featuredListings = listings.filter((l) => Boolean(l.isFeatured)).length
    const periodNewListings = listings.filter((l) => isWithinPeriod(l.createdAt)).length

    // CRM Contacts & Deals
    const totalContacts = contacts.length
    const newLeads = contacts.filter((c) => c.stage === 'NEW_LEAD').length
    const activeLeads = contacts.filter((c) => c.stage !== 'LOST').length
    const convertedLeads = contacts.filter((c) => c.stage === 'WON').length
    const periodNewContacts = contacts.filter((c) => isWithinPeriod(c.createdAt)).length

    const totalDeals = deals.length
    const wonDeals = deals.filter((d) => d.status === 'WON' || d.stage === 'WON').length
    const openDeals = deals.filter((d) => d.status === 'OPEN').length
    const lostDeals = deals.filter((d) => d.status === 'LOST' || d.stage === 'LOST').length
    const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const periodNewDeals = deals.filter((d) => isWithinPeriod(d.createdAt)).length

    // Monetization Subscriptions & Orders
    const totalSubscriptions = subscriptions.length
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active' && (!s.expiresAt || new Date(s.expiresAt).getTime() > now)
    ).length
    const expiredSubscriptions = subscriptions.filter(
      (s) => s.status === 'expired' || (s.expiresAt && new Date(s.expiresAt).getTime() <= now)
    ).length
    const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'cancelled').length
    const expiringIn7Days = subscriptions.filter(
      (s) =>
        s.status === 'active' &&
        s.expiresAt &&
        new Date(s.expiresAt).getTime() - now <= 7 * 86400000 &&
        new Date(s.expiresAt).getTime() - now > 0
    ).length
    const periodNewSubscriptions = subscriptions.filter((s) => isWithinPeriod(s.createdAt)).length

    const totalOrders = orders.length
    const pendingOrders = orders.filter((o) => o.status === 'pending').length
    const completedOrders = orders.filter((o) => o.status === 'paid').length
    const failedOrders = orders.filter((o) => o.status === 'failed').length
    const totalRevenue = orders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + (o.amount || 0), 0)
    const periodNewOrders = orders.filter((o) => isWithinPeriod(o.createdAt)).length

    // Automations & Flows
    const totalAutomations = automations.length
    const draftAutomations = automations.filter((a) => a.status === 'draft').length
    const activeAutomations = automations.filter((a) => a.status === 'active' || a.isActive).length
    const pausedAutomations = automations.filter((a) => a.status === 'paused' || a.status === 'disabled').length
    const completedAutomations = automations.filter((a) => (a.executionCount || 0) > 0).length
    const totalFlows = flows.length
    const activeFlows = flows.filter((f) => f.isActive).length
    const totalBroadcasts = broadcasts.length

    // Content & Approvals
    const pendingApprovals = approvals.filter((a) => a.status === 'pending').length
    const totalStories = stories.length
    const totalOffers = offers.length
    const totalNews = news.length
    const totalShorts = shorts.length
    const totalBanners = banners.length
    const totalUsers = store.users ? store.users.length : 0
    const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0)
    const totalWhatsappClicks = listings.reduce((sum, l) => sum + (l.whatsappClicks || 0), 0)

    // Government Directory
    const totalGovernmentContacts = rawGovt.length
    const publishedGovernmentContacts = rawGovt.filter((c) => c.status === 'published').length
    const unverifiedGovernmentContacts = rawGovt.filter(
      (c) => c.status === 'draft' || c.status === 'pending_verification'
    ).length

    // 2. Actionable Tasks Derivation
    const actionableTasks: DashboardActionableTask[] = []

    if (pendingApprovals > 0) {
      actionableTasks.push({
        id: 'task-approvals',
        title: 'Submissions Awaiting Moderation',
        description: `${pendingApprovals} item${pendingApprovals === 1 ? '' : 's'} (listings, stories, or inquiries) in review queue.`,
        count: pendingApprovals,
        severity: 'high',
        route: '/admin/approvals',
        category: 'approvals',
      })
    }

    if (pendingOrders > 0) {
      actionableTasks.push({
        id: 'task-orders',
        title: 'Pending Payment Verifications',
        description: `${pendingOrders} manual payment order${pendingOrders === 1 ? '' : 's'} awaiting reference confirmation.`,
        count: pendingOrders,
        severity: 'high',
        route: '/admin/monetization',
        category: 'payments',
      })
    }

    if (expiringIn7Days > 0) {
      actionableTasks.push({
        id: 'task-expiring-subs',
        title: 'Expiring Subscriptions',
        description: `${expiringIn7Days} active merchant subscription${expiringIn7Days === 1 ? '' : 's'} expire within 7 days.`,
        count: expiringIn7Days,
        severity: 'medium',
        route: '/admin/monetization',
        category: 'subscriptions',
      })
    }

    if (unverifiedGovernmentContacts > 0) {
      actionableTasks.push({
        id: 'task-directory-unverified',
        title: 'Unverified Directory Records',
        description: `${unverifiedGovernmentContacts} official contact record${unverifiedGovernmentContacts === 1 ? '' : 's'} require verification before publishing.`,
        count: unverifiedGovernmentContacts,
        severity: 'medium',
        route: '/admin/government-contacts',
        category: 'directory',
      })
    }

    if (pendingFranchises > 0) {
      actionableTasks.push({
        id: 'task-franchise-pending',
        title: 'Franchise Applications Under Review',
        description: `${pendingFranchises} applicant${pendingFranchises === 1 ? '' : 's'} awaiting territory assignment and review.`,
        count: pendingFranchises,
        severity: 'medium',
        route: '/admin/franchise',
        category: 'approvals',
      })
    }

    return NextResponse.json({
      success: true,
      territoryScoped: Boolean(targetTerritory),
      territoryId: targetTerritory || 'all',
      period,
      periodCutoff: cutoffMs ? new Date(cutoffMs).toISOString() : null,
      stats: {
        // Structured Domain Metrics (Phase 2)
        tenants: {
          total: totalFranchises,
          active: activeFranchises,
          inactive: inactiveFranchises,
          pending: pendingFranchises,
          periodNew: periodNewFranchises,
        },
        listings: {
          total: totalListings,
          published: approvedListings,
          pending: pendingListings,
          draft: draftListings,
          featured: featuredListings,
          periodNew: periodNewListings,
        },
        crm: {
          totalContacts,
          newLeads,
          activeLeads,
          convertedLeads,
          periodNewContacts,
          totalDeals,
          openDeals,
          wonDeals,
          lostDeals,
          totalDealValue,
          periodNewDeals,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions,
          cancelled: cancelledSubscriptions,
          expiringIn7Days,
          periodNew: periodNewSubscriptions,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          failed: failedOrders,
          totalRevenue,
          periodNew: periodNewOrders,
        },
        automations: {
          total: totalAutomations,
          draft: draftAutomations,
          active: activeAutomations,
          paused: pausedAutomations,
          completed: completedAutomations,
          failed: 0,
        },
        directory: {
          total: totalGovernmentContacts,
          published: publishedGovernmentContacts,
          unverified: unverifiedGovernmentContacts,
        },

        // Backward-compatible Flat Keys (for existing components & legacy tests)
        totalListings,
        approvedListings,
        pendingListings,
        featuredListings,
        totalContacts,
        activeLeads,
        totalFlows,
        activeFlows,
        totalBroadcasts,
        pendingApprovals,
        totalStories,
        totalOffers,
        totalFranchises,
        totalNews,
        totalShorts,
        totalBanners,
        totalUsers,
        totalDeals,
        wonDeals,
        openDeals,
        totalDealValue,
        totalAutomations,
        draftAutomations,
        activeAutomations,
        totalViews,
        totalWhatsappClicks,
      },
      actionableTasks,
      recentListings: listings.slice(0, 5),
      recentContacts: contacts.slice(0, 5),
      recentApprovals: approvals.filter((a) => a.status === 'pending').slice(0, 5),
      recentDeals: deals.slice(0, 5),
      banners: banners.slice(0, 5),
      stories: stories.slice(0, 5),
      offers: offers.slice(0, 5),
      tickers: tickers.slice(0, 5),
      news: news.slice(0, 5),
      shorts: shorts.slice(0, 5),
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
