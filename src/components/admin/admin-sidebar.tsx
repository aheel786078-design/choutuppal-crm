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
  CheckSquare,
  Flame,
  Globe2,
  Landmark,
  Activity,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminUI } from '@/components/admin/admin-ui-context'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  isApprovalQueue?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
      { href: '/admin/health', label: 'System Health & Security', icon: Activity, badge: 'Live' },
      { href: '/admin/audit-logs', label: 'Audit Logs & Governance', icon: ShieldCheck, badge: 'Security' },
    ],
  },
  {
    title: 'Directory & Moderation',
    items: [
      { href: '/admin/listings', label: 'Listings & Businesses', icon: Store, badge: '200+' },
      { href: '/admin/approvals', label: 'Approval Queue', icon: CheckSquare, isApprovalQueue: true },
      { href: '/admin/government-contacts', label: 'Government Directory', icon: Landmark, badge: 'Official' },
    ],
  },
  {
    title: 'CRM & Messaging',
    items: [
      { href: '/admin/contacts', label: 'Contacts & Leads', icon: Contact },
      { href: '/admin/inbox', label: 'Shared WhatsApp Inbox', icon: MessageSquare },
      { href: '/admin/pipelines', label: 'Sales Pipelines (Kanban)', icon: Kanban },
      { href: '/admin/broadcasts', label: 'Broadcast Campaigns', icon: Send },
    ],
  },
  {
    title: 'Network & Permissions',
    items: [
      { href: '/admin/franchise', label: 'Franchise Network', icon: Globe2 },
      { href: '/admin/staff', label: 'Franchise Staff & Roles', icon: Users, badge: 'Roles' },
      { href: '/admin/monetization', label: 'Monetization & Plans', icon: Sparkles, badge: 'Plans' },
    ],
  },
  {
    title: 'WhatsApp Automation',
    items: [
      { href: '/admin/crm-flows', label: 'WhatsApp Bot & Flows', icon: GitBranch, badge: 'Cards' },
      { href: '/crm/flows', label: 'Visual Flow Canvas (CRM)', icon: Sparkles, badge: 'Editor' },
    ],
  },
  {
    title: 'Website & Media',
    items: [
      { href: '/admin/stories-offers', label: 'Stories & Offers', icon: Flame, badge: 'Expiring' },
      { href: '/admin/news', label: 'News & Updates', icon: Newspaper },
      { href: '/admin/shorts', label: 'Video Shorts (Reels)', icon: Clapperboard },
      { href: '/admin/banners', label: 'Banners & Visuals', icon: ImageIcon },
      { href: '/admin/ticker', label: 'Ticker Bar Notices', icon: Radio },
      { href: '/admin/settings', label: 'Cloud API & R2 Settings', icon: Settings },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const {
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileNavOpen,
    closeMobileNav,
    setCommandPaletteOpen,
  } = useAdminUI()

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

  const renderNavLinks = (isMobile: boolean = false) => {
    return (
      <div className="space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {/* Section Header */}
            {(!isSidebarCollapsed || isMobile) ? (
              <div className="px-3 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>{section.title}</span>
              </div>
            ) : (
              <div className="w-full my-2 border-t border-slate-800" title={section.title} />
            )}

            {/* Links */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const isApproval = item.isApprovalQueue

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => isMobile && closeMobileNav()}
                    title={isSidebarCollapsed && !isMobile ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all group relative',
                      isSidebarCollapsed && !isMobile
                        ? 'justify-center p-2.5'
                        : 'justify-between px-3 py-2',
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      {(!isSidebarCollapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {/* Badge */}
                    {(!isSidebarCollapsed || isMobile) && (
                      <>
                        {isApproval && pendingCount > 0 ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-black shrink-0">
                            {pendingCount}
                          </span>
                        ) : item.badge ? (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0',
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}

                    {/* Collapsed dot indicator for badge */}
                    {isSidebarCollapsed && !isMobile && isApproval && pendingCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* MOBILE SLIDE-OVER DRAWER & BACKDROP                           */}
      {/* ------------------------------------------------------------- */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shadow-2xl md:hidden transition-transform duration-300 ease-in-out',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 text-xs">
              CP
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-xs text-white truncate">Choutuppal Admin</h2>
              <p className="text-[10px] text-emerald-400">Franchise &amp; CRM Platform</p>
            </div>
          </div>
          <button
            onClick={closeMobileNav}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Command palette shortcut trigger on mobile */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              closeMobileNav()
              setCommandPaletteOpen(true)
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Admin...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Ctrl+K</kbd>
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks(true)}
        </div>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-300">CRM Engine Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v2.1</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR                                   */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 min-h-screen bg-slate-950 text-slate-200 border-r border-slate-800 transition-[width] duration-200 ease-in-out sticky top-0 h-screen select-none',
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Desktop Brand Header */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-2 h-16">
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20 shrink-0 text-sm">
              CP
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-xs text-white tracking-wide truncate">
                  Choutuppal Admin
                </h1>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Franchise &amp; CRM Platform
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Control */}
          <button
            onClick={toggleSidebarCollapse}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isSidebarCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+\\)' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Quick Search Trigger when expanded */}
        {!isSidebarCollapsed && (
          <div className="px-3 pt-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs hover:border-slate-700 hover:text-slate-200 transition-colors shadow-sm"
              title="Search modules (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px]">Command Palette</span>
              </div>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Ctrl+K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {renderNavLinks(false)}
        </div>

        {/* Desktop Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-900/40">
          <div
            className={cn(
              'rounded-xl bg-slate-950 p-2 border border-slate-800 flex items-center transition-all',
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {!isSidebarCollapsed && (
                <span className="text-[11px] text-slate-300 font-medium truncate">
                  CRM Bot Ready
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] text-slate-500 font-mono">v2.1</span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
