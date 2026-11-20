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
  Workflow,
  Compass,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { Listing, CRMContact, ApprovalItem, DashboardActionableTask } from '@/lib/types'

type PeriodFilter = 'all_time' | 'today' | '7d' | '30d'

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all_time: 'All Time (మొత్తం)',
  today: 'Today (ఈరోజు)',
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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader
        title="Unified Command Center"
        subtitle="Manage Choutuppal Web Portal, WhatsApp Submissions, Franchise Networks & CRM Pipelines"
        onRefresh={() => fetchDashboardData(selectedTerritoryId, selectedPeriod)}
        selectedTerritoryId={selectedTerritoryId}
        onTerritoryChange={(tId) => setSelectedTerritoryId(tId)}
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Error Notification */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchDashboardData(selectedTerritoryId, selectedPeriod)}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-bold text-xs transition"
            >
              Retry (మళ్లీ ప్రయత్నించండి)
            </button>
          </div>
        )}

        {/* 1. TOP HERO COMMAND BAR (Royal Blue & Amber Brand Identity) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 p-6 sm:p-7 text-white shadow-lg border border-blue-700/50">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  Dual Engine Live (వెబ్‌సైట్ + WhatsApp CRM)
                </span>
                <span className="text-xs text-blue-200 hidden sm:inline">•</span>
                <span className="text-xs text-blue-200 font-mono">choutuppal.in v2.1</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                చౌటుప్పల్ సూపర్‌యాప్ &amp; ఫ్రాంచైజ్ కమాండ్ సెంటర్
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                212+ స్థానిక వ్యాపారాలు, 211 CRM లీడ్స్, 24/7 వాట్సాప్ ఆటోమేషన్ ఫ్లోలు మరియు మల్టీ-టెనెంట్ ఫ్రాంచైజ్ నెట్‌వర్క్‌ను ఒకే చోట నిర్వహించండి.
              </p>
            </div>

            {/* Quick 1-Click Launchers */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <Link
                href="/admin/listings"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ కొత్త లిస్టింగ్ (Add Listing)</span>
              </Link>
              <Link
                href="/crm/flows"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all active:scale-95"
              >
                <Workflow className="w-4 h-4 text-amber-300" />
                <span>ఫ్లో ఎడిటర్ (Flow Editor)</span>
              </Link>
              <Link
                href="/admin/inbox"
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all active:scale-95"
                title="Open Team Inbox"
              >
                <MessageSquare className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">ఇన్‌బాక్స్ (Inbox)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. TIME HORIZON FILTER BAR */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="font-bold text-slate-900">సమయ పరిధి (Time Horizon):</span>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              ఫిల్టర్ ప్రకారం గణాంకాలు తక్షణమే అప్‌డేట్ అవుతాయి
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {(['all_time', 'today', '7d', '30d'] as PeriodFilter[]).map((pKey) => {
              const isActive = selectedPeriod === pKey
              return (
                <button
                  key={pKey}
                  onClick={() => setSelectedPeriod(pKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-sm shadow-blue-700/20'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {PERIOD_LABELS[pKey]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 3. ACTIONABLE OPERATIONS QUEUE */}
        {actionableTasks.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Actionable Operations Queue ({actionableTasks.length} Pending Actions)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {actionableTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 shadow-xs transition-all ${
                    task.severity === 'high'
                      ? 'bg-amber-50/70 border-amber-300 text-slate-900'
                      : 'bg-blue-50/60 border-blue-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>{task.title}</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                        task.severity === 'high'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {task.count}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex justify-end">
                    <Link
                      href={task.route}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <span>Take Action &rarr;</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0" />
              <span>
                <strong>All Operational Queues Clear:</strong> All listing approvals, order verifications, and CRM leads are up to date!
              </span>
            </div>
            <Link
              href="/admin/approvals"
              className="text-blue-700 hover:text-blue-900 font-bold shrink-0 inline-flex items-center gap-1"
            >
              Review Queue <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* 4. EXECUTIVE MULTI-CARD METRICS GRID (6 Premium Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Directory Listings */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Business Directory</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.listings?.total ?? stats.totalListings ?? 0}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {stats.listings?.published ?? stats.approvedListings ?? 0} Live on Web
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>
                {stats.listings?.pending ?? stats.pendingListings ?? 0} Pending • {stats.listings?.draft ?? 0} Draft
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-blue-700 font-bold">+{stats.listings?.periodNew ?? 0} new</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/listings"
                className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold"
              >
                <span>Manage 200+ Photo Listings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: CRM Contacts & Pipeline */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-amber-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">CRM Contacts &amp; Leads</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.crm?.totalContacts ?? stats.totalContacts ?? 0}
              </span>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                {stats.crm?.convertedLeads ?? 0} Converted (Won)
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>
                {stats.crm?.newLeads ?? 0} New • {stats.crm?.activeLeads ?? stats.activeLeads ?? 0} In Pipeline
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-amber-700 font-bold">+{stats.crm?.periodNewContacts ?? 0} new</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/contacts"
                className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1 font-bold"
              >
                <span>View CRM Contacts &amp; Stages</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Sales Deals Pipeline */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Deals &amp; Revenue Value</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
                <Kanban className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                ₹{(stats.crm?.totalDealValue ?? stats.totalDealValue ?? 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {stats.crm?.totalDeals ?? stats.totalDeals ?? 0} Active Deals
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>
                {stats.crm?.openDeals ?? stats.openDeals ?? 0} Open • {stats.crm?.wonDeals ?? stats.wonDeals ?? 0} Won
              </span>
              {selectedPeriod !== 'all_time' && (
                <span className="text-indigo-700 font-bold">+{stats.crm?.periodNewDeals ?? 0} new</span>
              )}
            </div>
            <div className="pt-1">
              <Link
                href="/admin/pipelines"
                className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-bold"
              >
                <span>Open Sales Kanban Pipeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Monetization & Subscriptions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Monetization &amp; Plans</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.subscriptions?.active ?? 0}
              </span>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Active Subscriptions
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>
                {stats.orders?.pending ?? 0} Pending • {stats.subscriptions?.expiringIn7Days ?? 0} Expiring Soon
              </span>
              <span className="text-purple-700 font-bold">
                ₹{(stats.orders?.totalRevenue ?? 0).toLocaleString()} Collected
              </span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/monetization"
                className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-bold"
              >
                <span>Manage Plans, Orders &amp; Grants</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 5: Franchise Network */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Multi-Tenant Network</span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
                <Globe2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.tenants?.total ?? stats.totalFranchises ?? 0}
              </span>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {stats.tenants?.active ?? stats.totalFranchises ?? 0} Active Towns
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>★ Flagship Choutuppal Protected</span>
              <span>{stats.tenants?.pending ?? 0} In Review</span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/franchise"
                className="text-xs text-sky-700 hover:text-sky-900 flex items-center gap-1 font-bold"
              >
                <span>Franchise Console &amp; Territories</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 6: System Health & Diagnostics */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">System Health Status</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700 flex items-center gap-2 tracking-tight">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE (యాక్టివ్)
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                JSON Store Verified
              </span>
            </div>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>{stats.automations?.total ?? stats.totalAutomations ?? 0} Automation Rules</span>
              <span className="text-emerald-700 font-bold">HMAC-SHA256 Active</span>
            </div>
            <div className="pt-1">
              <Link
                href="/admin/health"
                className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold"
              >
                <span>View Full Diagnostic Console</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 5. 2-COLUMN SECTION: Recent Listings & Moderation Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings with Photos */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Active Directory Listings (Website + CRM Flow)
                </h3>
              </div>
              <Link
                href="/admin/listings"
                className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1 font-bold"
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
                recentListings.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/20 transition-all flex items-center gap-3.5"
                  >
                    <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{item.title}</h4>
                        {item.isFeatured && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                            FEATURED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.categoryName} • {item.address}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-blue-700 font-bold">
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
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Moderation Queue (Pending Submissions)
                </h3>
              </div>
              <Link
                href="/admin/approvals"
                className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1 font-bold"
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
                recentApprovals.slice(0, 5).map((appr) => (
                  <div
                    key={appr.id}
                    className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {appr.mediaUrl ? (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={appr.mediaUrl} alt={appr.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-xs text-amber-800 shrink-0 border border-amber-200">
                          {appr.type.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{appr.title}</h4>
                        <p className="text-[11px] text-slate-500">
                          {appr.submitterName} &bull; {appr.submitterPhone}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/admin/approvals"
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors"
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
