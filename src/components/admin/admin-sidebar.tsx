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
  Workflow,
  Zap,
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
      { href: '/admin/flows', label: 'Flows Builder (Canvas)', icon: Workflow, badge: '11 Nodes' },
      { href: '/admin/crm-flows', label: 'WhatsApp Bot & Simulator', icon: GitBranch, badge: 'Cards' },
      { href: '/admin/automations', label: 'Automations (Rules)', icon: Zap, badge: 'Rules' },
      { href: '/crm/flows', label: 'Visual Flow Canvas (CRM)', icon: Sparkles, badge: 'CRM' },
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

  // Keyboard shortcut listener for toggling collapse (Ctrl+\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault()
        toggleSidebarCollapse()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebarCollapse])

  const renderNavLinks = (isMobile = false) => {
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
              <div className="w-full my-2 border-t border-slate-200" title={section.title} />
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
                      'flex items-center gap-2.5 rounded-xl text-xs font-medium transition-all group relative cursor-pointer',
                      isSidebarCollapsed && !isMobile
                        ? 'justify-center p-2.5'
                        : 'justify-between px-3 py-2',
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-700'
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500 text-white shrink-0">
                            {pendingCount}
                          </span>
                        ) : item.badge ? (
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0',
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}

                    {/* Collapsed dot indicator for badge */}
                    {isSidebarCollapsed && !isMobile && isApproval && pendingCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
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
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-800 border-r border-slate-200 shadow-xl transition-transform duration-300 ease-in-out md:hidden flex flex-col',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20">
              CP
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xs text-slate-900 truncate">Choutuppal Admin</h2>
              <p className="text-[10px] text-emerald-700 font-medium">Franchise &amp; CRM Platform</p>
            </div>
          </div>
          <button
            onClick={closeMobileNav}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search Admin...</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 shadow-xs">Ctrl+K</kbd>
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {renderNavLinks(true)}
        </div>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-700">CRM Engine Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v2.1</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR                                   */}
      {/* ------------------------------------------------------------- */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 min-h-screen bg-white text-slate-800 border-r border-slate-200 transition-[width] duration-200 ease-in-out sticky top-0 h-screen select-none shadow-xs',
          isSidebarCollapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Desktop Brand Header */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 h-16">
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black shadow-md shadow-emerald-500/20 shrink-0 text-sm">
              CP
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-xs text-slate-900 tracking-wide truncate">
                  Choutuppal Admin
                </h1>
                <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
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
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs hover:border-slate-300 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
              title="Search modules (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-medium">Command Palette</span>
              </div>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-300 shadow-xs">
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
        <div className="p-2.5 border-t border-slate-200 bg-slate-50/80">
          <div
            className={cn(
              'rounded-xl bg-white p-2 border border-slate-200 flex items-center transition-all shadow-xs',
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {!isSidebarCollapsed && (
                <span className="text-[11px] text-slate-700 font-semibold truncate">
                  CRM Bot Ready
                </span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="text-[10px] text-slate-400 font-mono">v2.1</span>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
