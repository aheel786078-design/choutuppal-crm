'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface AdminBreadcrumbsProps {
  customItems?: BreadcrumbItem[]
  className?: string
}

// Map route segments to human-readable names
const SEGMENT_NAMES: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Overview',
  approvals: 'Approval Queue',
  listings: 'Listings & Businesses',
  'government-contacts': 'Government Directory',
  monetization: 'Monetization & Plans',
  'stories-offers': 'Stories & Offers',
  franchise: 'Franchise Network',
  staff: 'Staff & Roles',
  news: 'News & Updates',
  shorts: 'Video Shorts',
  banners: 'Banners & Visuals',
  ticker: 'Ticker Bar',
  inbox: 'WhatsApp Inbox',
  contacts: 'Contacts & Leads',
  pipelines: 'Sales Pipelines',
  'crm-flows': 'WhatsApp Flows',
  broadcasts: 'Campaigns',
  settings: 'System Settings',
  health: 'System Health',
}

export function AdminBreadcrumbs({ customItems, className }: AdminBreadcrumbsProps) {
  const pathname = usePathname()

  let items: BreadcrumbItem[] = []

  if (customItems && customItems.length > 0) {
    items = customItems
  } else {
    // Generate from pathname
    const segments = pathname.split('/').filter(Boolean)
    let currentPath = ''

    items = segments.map((seg, index) => {
      currentPath += `/${seg}`
      const isLast = index === segments.length - 1
      const label = SEGMENT_NAMES[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

      return {
        label,
        href: isLast ? undefined : currentPath,
      }
    })
  }

  // Ensure Admin root is always at start if empty
  if (items.length === 0) {
    items = [{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Overview' }]
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-slate-400', className)}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Admin Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Admin Home</span>
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <React.Fragment key={idx}>
              <li aria-hidden="true" className="text-slate-600">
                <ChevronRight className="w-3 h-3" />
              </li>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="hover:text-slate-200 transition-colors font-medium text-slate-400"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn('font-semibold truncate max-w-[180px] sm:max-w-none inline-block', isLast ? 'text-slate-200' : 'text-slate-400')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
