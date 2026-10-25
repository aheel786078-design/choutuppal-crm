'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bell,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Smartphone,
  Globe,
  MapPin,
  ChevronDown,
  Building2,
} from 'lucide-react'

interface AdminHeaderProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  onAddClick?: () => void
  addLabel?: string
  selectedTerritoryId?: string
  onTerritoryChange?: (territoryId: string) => void
}

export function AdminHeader({
  title,
  subtitle,
  onRefresh,
  onAddClick,
  addLabel = 'Add New',
  selectedTerritoryId,
  onTerritoryChange,
}: AdminHeaderProps) {
  const [territories, setTerritories] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/franchises')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.territories)) {
          setTerritories(data.territories)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-30 shadow-sm">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
            Multi-Tenant CRM
          </span>

          {/* Territory Scope Selector */}
          {onTerritoryChange && territories.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={selectedTerritoryId || 'all'}
                onChange={(e) => onTerritoryChange(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">All Territories (Network View)</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.isFlagship ? `★ Flagship: ${t.name}` : `📍 ${t.name}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Quick Website / CRM Links */}
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

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>
    </header>
  )
}
