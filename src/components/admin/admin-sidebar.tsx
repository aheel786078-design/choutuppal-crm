'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Store,
  Newspaper,
  Clapperboard,
  Image as ImageIcon,
  Radio,
  Users,
  MessageSquare,
  Contact,
  Kanban,
  GitBranch,
  Send,
  Settings,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  CheckSquare,
  Flame,
  Globe2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const WEBSITE_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Admin Approval Queue', icon: CheckSquare, badge: 'Review Queue' },
  { href: '/admin/listings', label: 'Listings & Businesses', icon: Store, badge: '200+ Photos' },
  { href: '/admin/stories-offers', label: 'Stories & Offers', icon: Flame, badge: 'Auto-Expiry' },
  { href: '/admin/franchise', label: 'Franchise Network', icon: Globe2 },
  { href: '/admin/news', label: 'News & Updates', icon: Newspaper },
  { href: '/admin/shorts', label: 'Video Shorts (Reels)', icon: Clapperboard },
  { href: '/admin/banners', label: 'Banners & Stories', icon: ImageIcon },
  { href: '/admin/ticker', label: 'Ticker Bar', icon: Radio },
]

const CRM_NAV = [
  { href: '/admin/inbox', label: 'Shared WhatsApp Inbox', icon: MessageSquare },
  { href: '/admin/contacts', label: 'Contacts & Leads', icon: Contact },
  { href: '/admin/pipelines', label: 'Sales Pipeline (Kanban)', icon: Kanban },
  { href: '/admin/crm-flows', label: 'WhatsApp Bot & Flows', icon: GitBranch, badge: 'Photo Cards' },
  { href: '/crm/flows', label: 'Visual Flow Canvas (CRM)', icon: Sparkles, badge: 'Full CRM' },
  { href: '/admin/broadcasts', label: 'Broadcast Campaigns', icon: Send },
  { href: '/admin/settings', label: 'Cloud API & R2 Storage', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number>(3)

  useEffect(() => {
    fetch('/api/admin/approvals')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.pendingCount === 'number') {
          setPendingCount(data.pendingCount)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
            CP
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm text-white tracking-wide truncate">
              Choutuppal Admin
            </h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Super App &amp; WhatsApp CRM
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Section 1: Website & Franchise Management */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Website &amp; Moderation</span>
            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Portal</span>
          </div>
          <nav className="space-y-1">
            {WEBSITE_NAV.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isApproval = item.href === '/approvals'
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isApproval && pendingCount > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-black">
                      {pendingCount}
                    </span>
                  ) : item.badge ? (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Section 2: CRM & WhatsApp Automations */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>WhatsApp CRM &amp; Flows</span>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>
          <nav className="space-y-1">
            {CRM_NAV.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-slate-300 font-medium">CRM Bot Ready</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v2.1</span>
        </div>
      </div>
    </aside>
  )
}
