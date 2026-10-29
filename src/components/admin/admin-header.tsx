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
    <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-sm transition-colors">
      {/* Top bar: Breadcrumbs & Quick Search Trigger */}
      <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800/60 flex-wrap">
        <div className="flex items-center gap-2.5">
          {/* Mobile Hamburger Menu Button */}
          <button
            onClick={openMobileNav}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] px-1 py-0.2 rounded font-mono bg-blue-950/60 text-blue-400 border border-blue-800/50 hidden sm:inline">
                {currentUser.role}
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded transition cursor-pointer"
                title="Sign Out (లాగౌట్)"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-800/50 text-blue-400 hover:text-blue-300 text-xs font-semibold transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Global Search / Command Palette Trigger Button */}
          <button
            onClick={toggleCommandPalette}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
            aria-label="Open command palette (Ctrl+K)"
            title="Search modules and actions (Ctrl+K / Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>
        </div>
      </div>

      {/* Main header row: Title, Subtitle, Territory Switcher & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
              {title}
            </h1>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
              Multi-Tenant CRM
            </span>

            {/* Territory Scope Selector */}
            {onTerritoryChange && territories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <select
                  value={selectedTerritoryId || 'all'}
                  onChange={(e) => onTerritoryChange(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                  aria-label="Filter by franchise territory"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    All Territories (Network View)
                  </option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                      {t.isFlagship ? `★ Flagship: ${t.name}` : `📍 ${t.name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 truncate max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Quick Links */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <a
              href="https://choutuppal.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Flagship</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
            </a>
            <div className="w-px h-3 bg-slate-800" />
            <Link
              href="/admin/franchise"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Franchises</span>
            </Link>
            <div className="w-px h-3 bg-slate-800" />
            <Link
              href="/admin/crm-flows"
              className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WA Flow</span>
            </Link>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
