'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { useAdminUI } from '@/components/admin/admin-ui-context'
import {
  LayoutDashboard,
  Store,
  CheckSquare,
  Landmark,
  Sparkles,
  Flame,
  Globe2,
  Users,
  Newspaper,
  Clapperboard,
  Image as ImageIcon,
  Radio,
  MessageSquare,
  Contact,
  Kanban,
  GitBranch,
  Send,
  Settings,
  Activity,
  PlusCircle,
  FileCheck,
  ShieldCheck,
  Search,
} from 'lucide-react'

interface NavCommand {
  label: string
  href: string
  keywords: string[]
  icon: React.ComponentType<{ className?: string }>
  group: string
}

const COMMAND_ROUTES: NavCommand[] = [
  // Overview
  { label: 'Dashboard Overview', href: '/admin/dashboard', keywords: ['analytics', 'metrics', 'stats', 'home', 'revenue'], icon: LayoutDashboard, group: 'Overview' },
  { label: 'System Health & Diagnostics', href: '/admin/health', keywords: ['status', 'memory', 'uptime', 'logs', 'check'], icon: Activity, group: 'Overview' },
  { label: 'Audit Logs & Governance', href: '/admin/audit-logs', keywords: ['audit', 'logs', 'security', 'governance', 'compliance', 'history', 'trail', 'who'], icon: ShieldCheck, group: 'Overview' },

  // Directory & Listings
  { label: 'Listings & Businesses', href: '/admin/listings', keywords: ['stores', 'shops', 'vendors', 'directory', 'bulk'], icon: Store, group: 'Business Directory' },
  { label: 'Approval Queue', href: '/admin/approvals', keywords: ['review', 'pending', 'moderate', 'verify'], icon: CheckSquare, group: 'Business Directory' },
  { label: 'Government & Emergency Directory', href: '/admin/government-contacts', keywords: ['police', 'mro', 'collector', 'hospital', 'official', 'contacts'], icon: Landmark, group: 'Business Directory' },

  // CRM & Leads
  { label: 'Contacts & Leads', href: '/admin/contacts', keywords: ['customers', 'clients', 'crm', 'leads', 'import', 'csv'], icon: Contact, group: 'CRM & Messaging' },
  { label: 'Shared WhatsApp Inbox', href: '/admin/inbox', keywords: ['chat', 'messages', 'whatsapp', 'support'], icon: MessageSquare, group: 'CRM & Messaging' },
  { label: 'Sales Pipelines (Kanban)', href: '/admin/pipelines', keywords: ['deals', 'funnel', 'sales', 'kanban'], icon: Kanban, group: 'CRM & Messaging' },
  { label: 'Broadcast Campaigns', href: '/admin/broadcasts', keywords: ['bulk messaging', 'marketing', 'sms', 'announcements'], icon: Send, group: 'CRM & Messaging' },

  // Automations & WhatsApp
  { label: 'WhatsApp Bot & Flows', href: '/admin/crm-flows', keywords: ['bot', 'flows', 'interactive', 'cards', 'menu'], icon: GitBranch, group: 'Automation & Network' },
  { label: 'Visual Flow Canvas (CRM)', href: '/crm/flows', keywords: ['builder', 'node', 'editor', 'logic'], icon: Sparkles, group: 'Automation & Network' },
  { label: 'Franchise Network', href: '/admin/franchise', keywords: ['tenants', 'territories', 'zones', 'mandal'], icon: Globe2, group: 'Automation & Network' },
  { label: 'Franchise Staff & Roles', href: '/admin/staff', keywords: ['rbac', 'users', 'permissions', 'team', 'employees'], icon: Users, group: 'Automation & Network' },
  { label: 'Monetization & Plans', href: '/admin/monetization', keywords: ['pricing', 'subscriptions', 'billing', 'payments'], icon: Sparkles, group: 'Automation & Network' },

  // Website Content
  { label: 'Stories & Offers', href: '/admin/stories-offers', keywords: ['promotions', 'deals', 'expiry'], icon: Flame, group: 'Website Content' },
  { label: 'News & Local Updates', href: '/admin/news', keywords: ['articles', 'announcements', 'posts'], icon: Newspaper, group: 'Website Content' },
  { label: 'Video Shorts (Reels)', href: '/admin/shorts', keywords: ['videos', 'reels', 'moderation'], icon: Clapperboard, group: 'Website Content' },
  { label: 'Banners & Hero Media', href: '/admin/banners', keywords: ['carousel', 'sliders', 'images'], icon: ImageIcon, group: 'Website Content' },
  { label: 'Ticker Bar Notices', href: '/admin/ticker', keywords: ['headline', 'marquee', 'alert'], icon: Radio, group: 'Website Content' },
  { label: 'Cloud API & R2 Settings', href: '/admin/settings', keywords: ['config', 'storage', 'meta', 'credentials'], icon: Settings, group: 'Website Content' },
]

export function AdminCommandPalette() {
  const router = useRouter()
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useAdminUI()

  const handleSelect = (href: string) => {
    setCommandPaletteOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog
      open={isCommandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title="Admin Command Palette"
      description="Quick search and keyboard navigation for all Choutuppal Franchise CRM modules"
      className="bg-slate-900 border border-slate-800 text-slate-100 max-w-xl w-full shadow-2xl rounded-2xl overflow-hidden"
    >
      <div className="flex items-center px-3 border-b border-slate-800">
        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
        <CommandInput
          placeholder="Type a page, tool, or keyword (or press Esc)..."
          className="h-12 bg-transparent text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          ESC
        </kbd>
      </div>

      <CommandList className="max-h-80 overflow-y-auto p-2 text-xs">
        <CommandEmpty className="py-8 text-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <Search className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p className="font-medium text-slate-300">No matching admin modules or actions</p>
            <p className="text-[11px] text-slate-500">Try searching for &quot;contacts&quot;, &quot;health&quot;, &quot;staff&quot;, or &quot;listings&quot;</p>
          </div>
        </CommandEmpty>

        {/* Quick Actions Group */}
        <CommandGroup heading="Quick Actions" className="text-slate-400 font-semibold px-2 py-1 text-[11px] uppercase tracking-wider">
          <CommandItem
            onSelect={() => handleSelect('/admin/contacts')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white">Go to Contacts Console</span>
              <span className="text-[10px] text-slate-400 ml-2">Open lead capture, CSV import, and duplicate management</span>
            </div>
            <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">↵ Enter</kbd>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect('/admin/approvals')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
          >
            <FileCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white">Review Pending Approvals</span>
              <span className="text-[10px] text-slate-400 ml-2">Moderate pending business submissions in review queue</span>
            </div>
            <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">↵ Enter</kbd>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect('/admin/listings')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
          >
            <Store className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white">Manage Business Directory</span>
              <span className="text-[10px] text-slate-400 ml-2">Open listings table, safe bulk actions, and categories</span>
            </div>
            <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">↵ Enter</kbd>
          </CommandItem>

          <CommandItem
            onSelect={() => handleSelect('/admin/health')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white">Inspect System Health &amp; Security</span>
              <span className="text-[10px] text-slate-400 ml-2">View diagnostic checks, uptime, and store hash</span>
            </div>
            <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">↵ Enter</kbd>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1 border-slate-800" />

        {/* Navigation Groups */}
        {['Overview', 'Business Directory', 'CRM & Messaging', 'Automation & Network', 'Website Content'].map((grp) => {
          const groupRoutes = COMMAND_ROUTES.filter((r) => r.group === grp)
          return (
            <CommandGroup key={grp} heading={grp} className="text-slate-400 font-semibold px-2 py-1 text-[11px] uppercase tracking-wider">
              {groupRoutes.map((route) => {
                const Icon = route.icon
                return (
                  <CommandItem
                    key={route.href}
                    value={`${route.label} ${route.keywords.join(' ')}`}
                    onSelect={() => handleSelect(route.href)}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{route.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{route.href}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )
        })}
      </CommandList>

      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span>Navigate with <kbd className="font-mono text-slate-400 font-semibold">↑</kbd> <kbd className="font-mono text-slate-400 font-semibold">↓</kbd></span>
          <span>Select with <kbd className="font-mono text-slate-400 font-semibold">↵</kbd></span>
        </div>
        <span className="text-emerald-400 font-medium">Choutuppal Admin Palette</span>
      </div>
    </CommandDialog>
  )
}
