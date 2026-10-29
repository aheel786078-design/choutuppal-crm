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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  return (
    <aside className="w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            WA
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm text-white tracking-wide truncate">
              WhatsApp CRM
            </h1>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine Active (9494348175)
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Automation Hub</span>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">24/7</span>
        </div>

        {CRM_LINKS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400',
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
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-300',
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
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 space-y-1.5 text-xs">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
          <span>Switch to Admin Panel</span>
        </Link>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Open Choutuppal.in</span>
        </Link>
      </div>
    </aside>
  )
}
