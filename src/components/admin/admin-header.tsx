'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Smartphone,
  Globe,
  MapPin,
  Building2,
  Menu,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react'
import { AdminBreadcrumbs, BreadcrumbItem } from '@/components/admin/admin-breadcrumbs'
import { useAdminUI } from '@/components/admin/admin-ui-context'

export interface AdminHeaderProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  onAddClick?: () => void
  addLabel?: string
  selectedTerritoryId?: string
  onTerritoryChange?: (territoryId: string) => void
  customBreadcrumbs?: BreadcrumbItem[]
}

export function AdminHeader({
  title,
  subtitle,
  onRefresh,
  onAddClick,
  addLabel = 'Add New',
  selectedTerritoryId,
  onTerritoryChange,
  customBreadcrumbs,
}: AdminHeaderProps) {
  const router = useRouter()
  const { openMobileNav, toggleCommandPalette } = useAdminUI()
  const [territories, setTerritories] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetch('/api/admin/franchises')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.territories)) {
          setTerritories(data.territories)
        }
      })
      .catch(() => {})

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs transition-colors">
      {/* Top bar: Breadcrumbs & Quick Search Trigger */}
      <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2.5">
          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={openMobileNav}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <AdminBreadcrumbs customItems={customBreadcrumbs} />
        </div>

        <div className="flex items-center gap-2.5">
          {/* User Session Status */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-bold text-slate-800 truncate max-w-[120px] sm:max-w-[180px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold hidden sm:inline">
                {currentUser.role}
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                title="Sign Out (లాగౌట్)"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-800 text-xs font-bold transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Global Search / Command Palette Trigger Button */}
          <button
            onClick={toggleCommandPalette}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors text-xs cursor-pointer"
            aria-label="Open command palette (Ctrl+K)"
            title="Search modules and actions (Ctrl+K / Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline font-medium">Search...</span>
            <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-300 shadow-xs">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>
        </div>
      </div>

      {/* Main header row: Title, Subtitle, Territory Switcher & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
              {title}
            </h1>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Multi-Tenant CRM
            </span>

            {/* Territory Scope Selector */}
            {onTerritoryChange && territories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <select
                  value={selectedTerritoryId || 'all'}
                  onChange={(e) => onTerritoryChange(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
                  aria-label="Filter by franchise territory"
                >
                  <option value="all" className="bg-white text-slate-900">
                    All Territories (Network View)
                  </option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id} className="bg-white text-slate-900">
                      {t.isFlagship ? `★ Flagship: ${t.name}` : `📍 ${t.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 truncate max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Quick Links */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <a
              href="https://choutuppal.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-emerald-700 rounded hover:bg-white transition-colors font-medium"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Flagship</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
            <div className="w-px h-3 bg-slate-200" />
            <Link
              href="/admin/franchise"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-emerald-700 rounded hover:bg-white transition-colors font-medium"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Franchises</span>
            </Link>
            <div className="w-px h-3 bg-slate-200" />
            <Link
              href="/admin/crm-flows"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-emerald-700 rounded hover:bg-white transition-colors font-medium"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WA Flow</span>
            </Link>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs"
              title="Refresh Data"
              aria-label="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Primary Add Action */}
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
