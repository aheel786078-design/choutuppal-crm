'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  User,
  Clock,
  Globe2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { AdminBadge } from '@/components/admin/admin-badge'
import { AdminTableSkeleton } from '@/components/admin/admin-table-skeleton'
import { AdminEmptyState } from '@/components/admin/admin-empty-state'
import { AdminPageContainer } from '@/components/admin/admin-page-container'
import { adminToast } from '@/lib/admin-toast'
import type { AuditLog } from '@/lib/types'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL')
  const [territoryFilter, setTerritoryFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [territories, setTerritories] = useState<Array<{ id: string; name: string }>>([])

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      if (search.trim()) params.set('search', search.trim())
      if (actionFilter !== 'ALL') params.set('action', actionFilter)
      if (outcomeFilter !== 'ALL') params.set('outcome', outcomeFilter)
      if (territoryFilter !== 'ALL') params.set('territoryId', territoryFilter)
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        params.set('endDate', end.toISOString())
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setLogs(data.logs || [])
        setTotalCount(data.total || 0)
        setTotalPages(data.totalPages || 1)
        if (Array.isArray(data.territories) && territories.length === 0) {
          setTerritories(data.territories)
        }
      } else {
        adminToast.error('Failed to load audit logs', data.error)
      }
    } catch (err: any) {
      adminToast.error('Connection error', err?.message || 'Could not fetch audit records')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, actionFilter, outcomeFilter, territoryFilter, startDate, endDate, territories.length])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    params.set('export', 'csv')
    if (search.trim()) params.set('search', search.trim())
    if (actionFilter !== 'ALL') params.set('action', actionFilter)
    if (outcomeFilter !== 'ALL') params.set('outcome', outcomeFilter)
    if (territoryFilter !== 'ALL') params.set('territoryId', territoryFilter)
    if (startDate) params.set('startDate', new Date(startDate).toISOString())
    if (endDate) params.set('endDate', new Date(endDate).toISOString())

    adminToast.info('Preparing CSV export with spreadsheet injection defense...')
    window.open(`/api/admin/audit-logs?${params.toString()}`, '_blank')
  }

  const getRoleBadgeVariant = (role: string): 'purple' | 'info' | 'success' | 'warning' | 'neutral' => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'purple'
      case 'PLATFORM_OPERATOR':
        return 'info'
      case 'FRANCHISE_ADMIN':
        return 'success'
      case 'FRANCHISE_STAFF':
      case 'FRANCHISE_REVIEWER':
        return 'warning'
      case 'SYSTEM':
      default:
        return 'neutral'
    }
  }

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'N/A'
    try {
      const d = new Date(iso)
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-12">
      <AdminHeader
        title="Audit Logs & Governance"
        subtitle="Cryptographically verified server session audit trail, security events & administrative accountability"
        customBreadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Audit Logs & Governance', href: '/admin/audit-logs' },
        ]}
      />

      <AdminPageContainer className="mt-6 flex-1 flex flex-col gap-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Audit Records</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalCount.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Successful Actions</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {logs.filter((l) => (l.outcome || 'SUCCESS') === 'SUCCESS').length} on Page
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Security Denials</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                {logs.filter((l) => l.outcome === 'FAILURE').length} on Page
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Integrity Standard</p>
              <h3 className="text-sm font-semibold text-cyan-400 mt-1">HMAC-SHA256 Session</h3>
              <p className="text-xs text-slate-500 mt-0.5">Non-repudiation logging</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by action, details, actor phone or entity ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm"
                title="Download CSV export with spreadsheet formula injection protection"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => fetchLogs()}
                disabled={loading}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                title="Refresh audit log stream"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-800/60 text-xs">
            {/* Outcome Filter */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Outcome</label>
              <select
                value={outcomeFilter}
                onChange={(e) => {
                  setOutcomeFilter(e.target.value as any)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILURE">Failure / Denied</option>
              </select>
            </div>

            {/* Action Group Filter */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Action Category</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Actions</option>
                <option value="auth.login">auth.login</option>
                <option value="staff.created">staff.created</option>
                <option value="staff.updated">staff.updated</option>
                <option value="staff.deleted">staff.deleted</option>
                <option value="listings.bulk_operation">listings.bulk_operation</option>
                <option value="listing.created">listing.created</option>
                <option value="listing.updated">listing.updated</option>
                <option value="listing.deleted">listing.deleted</option>
                <option value="contact.created">contact.created</option>
                <option value="contact.updated">contact.updated</option>
                <option value="contact.deleted">contact.deleted</option>
                <option value="contact.create_duplicate_override">contact.create_duplicate_override</option>
                <option value="flow.created">flow.created</option>
                <option value="flow.updated">flow.updated</option>
                <option value="flow.deleted">flow.deleted</option>
                <option value="SYSTEM_SETTINGS_UPDATED">SYSTEM_SETTINGS_UPDATED</option>
              </select>
            </div>

            {/* Territory Scoping */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Territory Scope</label>
              <select
                value={territoryFilter}
                onChange={(e) => {
                  setTerritoryFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Territories</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl flex-1 flex flex-col justify-between">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6">
                <AdminTableSkeleton rows={8} columns={6} />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12">
                <AdminEmptyState
                  title="No Audit Records Found"
                  description="No audit events matched your search query or filter parameters. Try clearing your filters or date bounds."
                  icon={ShieldCheck}
                />
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Territory</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {logs.map((log) => {
                    const isFailure = log.outcome === 'FAILURE'
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{formatTimestamp(log.createdAt || log.timestamp)}</span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          <div className="flex flex-col gap-0.5">
                            <div className="font-medium text-slate-200 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{log.actorName || log.actorId}</span>
                            </div>
                            <div>
                              <AdminBadge
                                variant={getRoleBadgeVariant(log.actorRole)}
                                size="sm"
                              >
                                {log.actorRole}
                              </AdminBadge>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300">
                            {log.action}
                          </span>
                        </td>

                        {/* Outcome */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          <AdminBadge
                            variant={isFailure ? 'danger' : 'success'}
                            size="sm"
                            dot
                          >
                            {log.outcome || 'SUCCESS'}
                          </AdminBadge>
                        </td>

                        {/* Territory */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Globe2 className="w-3 h-3 text-slate-500" />
                            <span className="truncate max-w-[120px]">
                              {log.territoryId
                                ? log.territoryId.replace('territory_', '')
                                : 'Global'}
                            </span>
                          </div>
                        </td>

                        {/* Details */}
                        <td className="py-3 px-4 text-xs text-slate-300 max-w-xs md:max-w-md truncate">
                          <span title={log.details}>{log.details}</span>
                        </td>

                        {/* Inspect */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLog(log)
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                            title="Inspect complete audit metadata"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && logs.length > 0 && (
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
                  <span className="font-semibold text-slate-200">{totalCount.toLocaleString()}</span> entries
                </span>
                <span className="text-slate-600">|</span>
                <label className="flex items-center gap-1.5">
                  <span>Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value, 10))
                      setPage(1)
                    }}
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 focus:outline-none"
                  >
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="font-medium text-slate-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminPageContainer>

      {/* Metadata Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${selectedLog.outcome === 'FAILURE' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {selectedLog.outcome === 'FAILURE' ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Audit Event Details</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Timestamp</span>
                  <span className="text-slate-200 font-mono">
                    {formatTimestamp(selectedLog.createdAt || selectedLog.timestamp)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Outcome Status</span>
                  <AdminBadge
                    variant={selectedLog.outcome === 'FAILURE' ? 'danger' : 'success'}
                    size="sm"
                    dot
                  >
                    {selectedLog.outcome || 'SUCCESS'}
                  </AdminBadge>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Actor Identity</span>
                  <span className="text-slate-200">
                    {selectedLog.actorName} ({selectedLog.actorId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Actor Role</span>
                  <AdminBadge variant={getRoleBadgeVariant(selectedLog.actorRole)} size="sm">
                    {selectedLog.actorRole}
                  </AdminBadge>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Action</span>
                  <span className="font-mono text-slate-200">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5 font-medium">Territory Scope</span>
                  <span className="text-slate-200">{selectedLog.territoryId || 'Global / Flagship'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Event Description</h4>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 leading-relaxed break-words">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Structured Metadata & Correlation</h4>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
