'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Workflow,
  Zap,
  MessageSquare,
  Users,
  Send,
  Kanban,
  Settings,
  ArrowLeft,
  LayoutDashboard,
  CheckCircle2,
  FileSpreadsheet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminUI } from '@/components/admin/admin-ui-context'

const CRM_LINKS = [
  { href: '/crm/dashboard', label: 'CRM Dashboard', icon: LayoutDashboard },
  { href: '/crm/flows', label: 'Interactive Flows', icon: Workflow, badge: '1 Flow' },
  { href: '/crm/automations', label: 'Automations (Rules)', icon: Zap, badge: '179 Draft' },
  { href: '/crm/inbox', label: 'Team Inbox', icon: MessageSquare },
  { href: '/crm/contacts', label: 'Contacts & Tags', icon: Users },
  { href: '/crm/broadcasts', label: 'Broadcast Campaigns', icon: Send },
  { href: '/crm/pipelines', label: 'Sales Pipelines', icon: Kanban },
]

export function CRMSidebar() {
  const pathname = usePathname()
  const { isMobileNavOpen, closeMobileNav } = useAdminUI()

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-500/20">
            WA
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-slate-900 tracking-tight truncate">
              WhatsApp CRM
            </h1>
            <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Engine Active (9494348175)
            </p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={closeMobileNav}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Automation Hub</span>
          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
            24/7
          </span>
        </div>

        {CRM_LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileNav}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:text-slate-800'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Switch to Admin Panel or Website */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 space-y-1.5 text-xs">
        <Link
          href="/admin/dashboard"
          onClick={closeMobileNav}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
          <span>Switch to Admin Panel</span>
        </Link>
        <Link
          href="/"
          target="_blank"
          onClick={closeMobileNav}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Open Choutuppal.in</span>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white text-slate-800 border-r border-slate-200 shadow-xs hidden md:flex flex-col shrink-0 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={closeMobileNav}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-800 shadow-2xl flex flex-col md:hidden transform transition-transform duration-200 ease-in-out',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
