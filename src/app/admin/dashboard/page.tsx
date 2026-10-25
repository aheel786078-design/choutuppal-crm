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
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { Listing, CRMContact, ApprovalItem } from '@/lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    totalListings: 211,
    approvedListings: 211,
    pendingListings: 0,
    totalContacts: 211,
    activeLeads: 211,
    totalFlows: 2,
    pendingApprovals: 3,
    totalStories: 1,
    totalOffers: 1,
    totalFranchises: 2,
    totalViews: 24890,
    totalWhatsappClicks: 3410,
  })
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [recentContacts, setRecentContacts] = useState<CRMContact[]>([])
  const [recentApprovals, setRecentApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setRecentListings(data.recentListings || [])
        setRecentContacts(data.recentContacts || [])
        setRecentApprovals(data.recentApprovals || [])
      }
    } catch (err) {
      console.warn('Dashboard fetch failed, using stored cache:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Unified Command Center"
        subtitle="Manage Choutuppal Web Portal, WhatsApp Submissions & Franchise CRM Flows"
        onRefresh={fetchDashboardData}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Pending Moderation Notice Bar */}
        {stats.pendingApprovals > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-800/60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>{stats.pendingApprovals} Submissions Awaiting Approval</span>
                  <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
                    Action Required
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  New listings, stories, and franchise inquiries submitted via WhatsApp require admin verification before publishing.
                </p>
              </div>
            </div>

            <Link
              href="/approvals"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 shadow transition-colors"
            >
              <span>Open Approval Queue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Dual-Channel Sync Banner */}
        <div className="rounded-xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-emerald-900/30 border border-blue-800/40 p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Real-time Data Sync Engine Active
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Dual-Channel Live
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Every approved listing is delivered to <strong>choutuppal.in</strong> and bound with <strong>Photo Cards</strong> to the <strong>WhatsApp Bot Flow</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/listings"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Listing with Photos</span>
            </Link>
            <Link
              href="/crm-flows"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Test Bot Flow</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Listings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Directory Listings</span>
              <Store className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalListings}</span>
              <span className="text-[11px] text-emerald-400 font-medium">100% Photos Attached</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>{stats.approvedListings} Live</span>
              <span>•</span>
              <Link href="/listings" className="text-blue-400 hover:underline">
                View All &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: CRM Leads */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">CRM Merchants &amp; Leads</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalContacts}</span>
              <span className="text-[11px] text-emerald-400 font-medium">Active Pipeline</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Auto-synced from directory listings
            </div>
          </div>

          {/* Card 3: Stories & Offers */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Stories &amp; Offers</span>
              <Flame className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalStories + stats.totalOffers}</span>
              <span className="text-[11px] text-pink-400 font-medium">Auto-Expiring</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {stats.totalStories} Stories • {stats.totalOffers} Active Offers
            </div>
          </div>

          {/* Card 4: Franchise Hub */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Franchise Towns</span>
              <Globe2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">{stats.totalFranchises}</span>
              <span className="text-[11px] text-emerald-400 font-medium">Town Network</span>
            </div>
            <div className="text-[11px] text-slate-500">
              White-label expansion active
            </div>
          </div>
        </div>

        {/* 2-Column Section: Recent Listings & Recent Approvals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings with Photos */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-white">
                  Active Listings (Website + CRM Flow)
                </h3>
              </div>
              <Link
                href="/listings"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <span>View All ({stats.totalListings})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center gap-3.5"
                >
                  {/* Photo Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
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
              ))}
            </div>
          </div>

          {/* Pending Submissions Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-white">
                  Moderation Queue (Pending Submissions)
                </h3>
              </div>
              <Link
                href="/approvals"
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
              >
                <span>Review All ({stats.pendingApprovals})</span>
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
                        <p className="text-[11px] text-slate-400">{appr.submitterName} &bull; {appr.submitterPhone}</p>
                      </div>
                    </div>

                    <Link
                      href="/approvals"
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs font-semibold shrink-0 border border-amber-500/30"
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
