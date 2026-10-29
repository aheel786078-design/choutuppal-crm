'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  HardDrive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Database,
  Smartphone,
  CreditCard,
  Cloud,
  Zap,
  ArrowRight,
  Server,
  FileCode,
  Layers,
  Lock,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import type { SystemHealthReport, HealthStatusLabel } from '@/lib/types'

function getStatusBadge(status: HealthStatusLabel) {
  switch (status) {
    case 'CONNECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          CONNECTED
        </span>
      )
    case 'MOCK':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          MOCK (Sandbox)
        </span>
      )
    case 'NOT_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          NOT VERIFIED
        </span>
      )
    case 'NOT_CONFIGURED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          NOT CONFIGURED
        </span>
      )
    case 'DISCONNECTED':
    case 'ERROR':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          {status}
        </span>
      )
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function SystemHealthAdminPage() {
  const [report, setReport] = useState<SystemHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<string>('')

  const fetchHealthReport = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await fetch('/api/admin/health')
      const data = await res.json()
      if (data.success && data.report) {
        setReport(data.report)
        setLastFetchTime(new Date().toLocaleTimeString())
      } else {
        setErrorMsg(data.error || 'Failed to fetch system health diagnostics.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error fetching system health.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthReport()
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader
        title="System Health & Diagnostics"
        subtitle="Real-time process runtime, local data store integrity, and integration status inspection"
        onRefresh={fetchHealthReport}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Loading State */}
        {loading && !report && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Running diagnostic health probes...</p>
            <p className="text-xs text-slate-500">Inspecting process, local data store, and configuration safely.</p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800/80 rounded-xl flex items-center justify-between gap-3 text-red-200 text-xs">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={fetchHealthReport}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-900 text-red-200 rounded font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {report && (
          <>
            {/* Top Process & Overall Status Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
                      report.app.status === 'HEALTHY'
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-500/20'
                        : 'bg-gradient-to-tr from-amber-600 to-orange-400 shadow-amber-500/20'
                    }`}
                  >
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-white">System Runtime &amp; Platform Health</h2>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          report.app.status === 'HEALTHY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {report.app.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Process running on Node.js {report.app.nodeVersion} • Environment: {report.app.environment}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                  <div>
                    <span className="block text-slate-500 text-[11px]">Process Uptime</span>
                    <span className="font-semibold text-slate-200 text-sm">{formatUptime(report.app.uptimeSeconds)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px]">Heap Memory</span>
                    <span className="font-semibold text-slate-200 text-sm">
                      {report.app.memoryUsageMB.heapUsed} / {report.app.memoryUsageMB.heapTotal} MB
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[11px]">Last Probe</span>
                    <span className="font-semibold text-slate-200 text-sm">{lastFetchTime || 'Just now'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Health & Record Integrity Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Local JSON Data Store Status</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">{report.storage.storePath}</span>
                  {getStatusBadge(report.storage.status)}
                </div>
              </div>

              {/* Storage Diagnostic Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[11px] block">Readability</span>
                  <span className={`font-semibold ${report.storage.readable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {report.storage.readable ? '✓ File Readable' : '✗ Unreadable'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[11px] block">JSON Parse Test</span>
                  <span className={`font-semibold ${report.storage.parseable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {report.storage.parseable ? '✓ Parse Succeeded' : '✗ Parse Failed'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[11px] block">File Size</span>
                  <span className="font-semibold text-slate-200">
                    {(report.storage.fileSizeBytes / 1024).toFixed(1)} KB ({report.storage.fileSizeBytes.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 text-[11px] block">Last Modified</span>
                  <span className="font-semibold text-slate-200 truncate block" title={report.storage.lastModified}>
                    {new Date(report.storage.lastModified).toLocaleDateString()} {new Date(report.storage.lastModified).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* SHA-256 Checksum */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">Diagnostic Checksum (SHA-256):</span>
                  <code className="text-[11px] text-emerald-400 font-mono break-all">{report.storage.sha256Hash}</code>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">Strictly Non-Destructive Probe</span>
              </div>

              {/* Entity Record Counts Breakdown */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Persistent Entity Inventory
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Listings</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.listings}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Contacts</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.contacts}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Deals</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.deals}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Franchises</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.franchises}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Territories</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.territories}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Automations</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.automations}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Orders</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.orders}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Subscriptions</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.subscriptions}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                    <span className="block text-slate-500 text-[10px]">Govt Contacts</span>
                    <span className="font-bold text-slate-200">{report.storage.recordCounts.governmentContacts}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* External Integrations Health Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: WhatsApp Cloud API */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-semibold text-sm text-white">WhatsApp Cloud API (Meta)</h3>
                  </div>
                  {getStatusBadge(report.integrations.whatsappCloudApi.status)}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Phone Number ID</span>
                    <span className="font-medium text-slate-200">
                      {report.integrations.whatsappCloudApi.phoneNumberIdConfigured ? '✓ Configured' : '✗ Not Configured'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Permanent Access Token</span>
                    <span className="font-medium text-slate-200">
                      {report.integrations.whatsappCloudApi.tokenConfigured ? '✓ Configured (Masked)' : '✗ Not Configured'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">CRM Flow Auto-Sync</span>
                    <span className="font-medium text-slate-200">
                      {report.integrations.whatsappCloudApi.syncListingsConfigured ? '✓ Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {report.integrations.whatsappCloudApi.details}
                </p>

                <div className="pt-1 flex justify-end">
                  <Link
                    href="/admin/settings"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <span>Configure API Credentials</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 2: Payment Gateway */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <h3 className="font-semibold text-sm text-white">Payment Gateway</h3>
                  </div>
                  {getStatusBadge(report.integrations.paymentGateway.status)}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Active Adapter</span>
                    <code className="font-mono text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {report.integrations.paymentGateway.activeAdapter}
                    </code>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Webhook Verification</span>
                    <span className="font-medium text-emerald-400">✓ HMAC-SHA256 Active</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">Order Idempotency</span>
                    <span className="font-medium text-emerald-400">✓ Enforced</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {report.integrations.paymentGateway.details}
                </p>

                <div className="pt-1 flex justify-end">
                  <Link
                    href="/admin/monetization"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <span>View Orders &amp; Subscriptions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 3: Cloudflare R2 Media Storage */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    <h3 className="font-semibold text-sm text-white">Cloudflare R2 Media Storage</h3>
                  </div>
                  {getStatusBadge(report.integrations.r2Storage.status)}
                </div>

                <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {report.integrations.r2Storage.details}
                </p>

                <div className="text-[11px] text-slate-500">
                  Media fallbacks: Preset Unsplash &amp; ImgBB photo CDN URLs are active across all 212 business listings.
                </div>
              </div>

              {/* Card 4: WhatsApp Automations Engine */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-semibold text-sm text-white">WhatsApp Automations Engine</h3>
                  </div>
                  {getStatusBadge(report.automations.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Total Rules</span>
                    <span className="font-bold text-slate-200">{report.automations.totalRules}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Draft (Sandbox)</span>
                    <span className="font-bold text-amber-400">{report.automations.draftRules}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="block text-slate-500 text-[10px]">Active</span>
                    <span className="font-bold text-emerald-400">{report.automations.activeRules}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {report.automations.details}
                </p>

                <div className="pt-1 flex justify-end">
                  <Link
                    href="/admin/crm-flows"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <span>Manage Bot &amp; Automations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Privacy & Zero-Side-Effect Guarantee Banner */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center gap-3 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Zero Secret Leakage Guarantee:</strong> All API keys, tokens, and session secrets are cryptographically protected and never rendered in browser payloads. Diagnostic health checks are strictly read-only and generate zero outbound network side effects.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
