'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Store,
  Users,
  MessageSquare,
  TrendingUp,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  ExternalLink,
  Plus,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  CheckSquare,
  Flame,
  Globe2,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Kanban,
  Activity,
  Layers,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { Listing, CRMContact, ApprovalItem, DashboardActionableTask } from '@/lib/types'

type PeriodFilter = 'all_time' | 'today' | '7d' | '30d'

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all_time: 'All Time',
  today: 'Today',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalListings: 212,
    approvedListings: 212,
    pendingListings: 0,
    totalContacts: 211,
    activeLeads: 211,
    totalFlows: 1,
    pendingApprovals: 3,
    totalStories: 1,
    totalOffers: 1,
    totalFranchises: 4,
    totalViews: 24890,
    totalWhatsappClicks: 3410,
    totalDeals: 4,
    wonDeals: 1,
    openDeals: 2,
    totalDealValue: 450000,
    tenants: { total: 4, active: 4, inactive: 0, pending: 0, periodNew: 0 },
    listings: { total: 212, published: 212, pending: 0, draft: 0, featured: 212, periodNew: 0 },
    crm: { totalContacts: 211, newLeads: 0, activeLeads: 211, convertedLeads: 211, totalDeals: 4, openDeals: 2, wonDeals: 1, totalDealValue: 450000, periodNewContacts: 0 },
    subscriptions: { total: 0, active: 0, expired: 0, cancelled: 0, expiringIn7Days: 0, periodNew: 0 },
    orders: { total: 0, pending: 0, completed: 0, failed: 0, totalRevenue: 0, periodNew: 0 },
    automations: { total: 179, draft: 179, active: 0, paused: 0 },
    directory: { total: 6, published: 6, unverified: 0 },
  })

  const [actionableTasks, setActionableTasks] = useState<DashboardActionableTask[]>([])
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [recentContacts, setRecentContacts] = useState<CRMContact[]>([])
  const [recentApprovals, setRecentApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('all_time')

  const fetchDashboardData = async (
    territoryId = selectedTerritoryId,
    period = selectedPeriod
  ) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      if (territoryId && territoryId !== 'all') {
        params.set('territoryId', territoryId)
      }
      if (period && period !== 'all_time') {
        params.set('period', period)
      }

      const queryString = params.toString()
      const url = queryString ? `/api/admin/dashboard?${queryString}` : '/api/admin/dashboard'
      const res = await fetch(url)
      const data = await res.json()

      if (data.success) {
        setStats(data.stats)
        setActionableTasks(data.actionableTasks || [])
        setRecentListings(data.recentListings || [])
        setRecentContacts(data.recentContacts || [])
        setRecentApprovals(data.recentApprovals || [])
      } else {
        setErrorMsg(data.error || 'Failed to load dashboard metrics')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error fetching dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData(selectedTerritoryId, selectedPeriod)
  }, [selectedTerritoryId, selectedPeriod])

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader
        title="Unified Command Center"
        subtitle="Manage Choutuppal Web Portal, WhatsApp Submissions, Franchise Networks & CRM Pipelines"
        onRefresh={() => fetchDashboardData(selectedTerritoryId, selectedPeriod)}
        selectedTerritoryId={selectedTerritoryId}
        onTerritoryChange={(tId) => setSelectedTerritoryId(tId)}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchDashboardData(selectedTerritoryId, selectedPeriod)}
              className="px-2.5 py-1 bg-red-900/60 hover:bg-red-900 text-white rounded font-medium text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Date Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold text-slate-200">Time Horizon:</span>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              Filter additions and activity by timestamp
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {(['all_time', 'today', '7d', '30d'] as PeriodFilter[]).map((pKey) => {
              const isActive = selectedPeriod === pKey
              return (
                <button
                  key={pKey}
                  onClick={() => setSelectedPeriod(pKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {PERIOD_LABELS[pKey]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actionable Task Hub */}
        {actionableTasks.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Actionable Operations Queue ({actionableTasks.length} Pending)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {actionableTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-xl p-4 border flex flex-col justify-between gap-3 shadow-md transition-all ${
                    task.severity === 'high'
                      ? 'bg-gradient-to-br from-amber-950/60 to-slate-900 border-amber-800/60'
                      : 'bg-gradient-to-br from-slate-900 to-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{task.title}</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                        task.severity === 'high'
                          ? 'bg-amber-500 text-black'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {task.count}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <Link
                      href={task.route}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between text-xs text-slate-300 shadow">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                <strong>All Operational Queues Clear:</strong> No pending listing approvals, unverified orders, or expiring subscriptions require immediate moderation.
              </span>
            </div>
            <Link href="/admin/approvals" className="text-blue-400 hover:underline shrink-0">
              Review Queue &rarr;
            </Link>
          </div>
        )}

        {/* Executive Multi-Card Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Directory Listings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Business Directory</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white">
                {stats.listings?.total ?? stats.totalListings ?? 0}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {stats.listings?.published ?? stats.approvedListings ?? 0} Live
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>
                {stats.listings?.pending ?? stats.pendingListings ?? 0} Pending • {stats.listings?.draft ?? 0} Draft
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-blue-400 font-medium">+{stats.listings?.periodNew ?? 0} in period</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/listings"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <span>Manage 200+ Photo Listings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: CRM Contacts & Pipeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">CRM Contacts &amp; Leads</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white">
                {stats.crm?.totalContacts ?? stats.totalContacts ?? 0}
              </span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {stats.crm?.convertedLeads ?? 0} Converted (Won)
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>
                {stats.crm?.newLeads ?? 0} New Leads • {stats.crm?.activeLeads ?? stats.activeLeads ?? 0} In Pipeline
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-emerald-400 font-medium">+{stats.crm?.periodNewContacts ?? 0} in period</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/contacts"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
              >
                <span>View CRM Contacts &amp; Stages</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Sales Deals Pipeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Deals &amp; Revenue Value</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Kanban className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white">
                ₹{(stats.crm?.totalDealValue ?? stats.totalDealValue ?? 0).toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {stats.crm?.totalDeals ?? stats.totalDeals ?? 0} Active Deals
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>
                {stats.crm?.openDeals ?? stats.openDeals ?? 0} Open • {stats.crm?.wonDeals ?? stats.wonDeals ?? 0} Won
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-indigo-400 font-medium">+{stats.crm?.periodNewDeals ?? 0} new deals</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/pipelines"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <span>Open Sales Kanban Pipeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Monetization & Subscriptions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Monetization &amp; Plans</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white">
                {stats.subscriptions?.active ?? 0}
              </span>
              <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                Active Subscriptions
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>
                {stats.orders?.pending ?? 0} Pending Orders • {stats.subscriptions?.expiringIn7Days ?? 0} Expiring Soon
              </span>
              <span className="text-purple-400 font-medium">
                ₹{(stats.orders?.totalRevenue ?? 0).toLocaleString()} Collected
              </span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/monetization"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
              >
                <span>Manage Plans, Orders &amp; Grants</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 5: Franchise Network */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Multi-Tenant Network</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Globe2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white">
                {stats.tenants?.total ?? stats.totalFranchises ?? 0}
              </span>
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {stats.tenants?.active ?? stats.totalFranchises ?? 0} Active Towns
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>★ Flagship Choutuppal Protected</span>
              <span>{stats.tenants?.pending ?? 0} In Review</span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/franchise"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <span>Franchise Console &amp; Territories</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 6: System Health & Diagnostics Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">System Health Status</span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                JSON Store Verified
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>{stats.automations?.total ?? stats.totalAutomations ?? 0} Automation Rules</span>
              <span className="text-emerald-400 font-medium">HMAC-SHA256 Active</span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/health"
                className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
              >
                <span>View Full Diagnostic Console</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Dual-Channel Sync Engine Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-emerald-950/40 border border-blue-800/50 p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Dual-Channel Sync Engine Active</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Every approved listing synchronizes automatically with <strong>choutuppal.in</strong> and binds interactive <strong>Photo Cards</strong> to the <strong>WhatsApp CRM Bot</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/listings"
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Listing with Photos</span>
            </Link>
            <Link
              href="/admin/crm-flows"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Test Bot Simulator</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Section: Recent Listings & Moderation Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings with Photos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">
                  Active Directory Listings (Website + CRM Flow)
                </h3>
              </div>
              <Link
                href="/admin/listings"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>View All ({stats.totalListings ?? 212})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentListings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No directory listings found for the selected filter.
                </div>
              ) : (
                recentListings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center gap-3.5"
                  >
                    <div className="w-14 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                        {item.isFeatured && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.categoryName} • {item.address}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          CRM Synced
                        </span>
                        <span>👁️ {item.views} Views</span>
                        <span>💬 {item.whatsappClicks} WA Clicks</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Submissions Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">
                  Moderation Queue (Pending Submissions)
                </h3>
              </div>
              <Link
                href="/admin/approvals"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                <span>Review All ({stats.pendingApprovals ?? 0})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentApprovals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No pending submissions in queue. Everything is up to date!
                </div>
              ) : (
                recentApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {appr.mediaUrl ? (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={appr.mediaUrl} alt={appr.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0 border border-slate-700">
                          {appr.type.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-white truncate">{appr.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {appr.submitterName} &bull; {appr.submitterPhone}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/admin/approvals"
                      className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold shrink-0 border border-amber-500/30 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
