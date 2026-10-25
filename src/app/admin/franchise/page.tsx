'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Globe2,
  Plus,
  Key,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Send,
  ExternalLink,
  X,
  AlertTriangle,
  RefreshCw,
  Building2,
  Sliders,
  DollarSign,
  Lock,
  Search,
  Check,
  Copy,
  Layers,
  Activity,
  History,
  TrendingUp,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { Franchise, Territory, TerritoryDomain, AuditLog, FranchiseStatus, PlanTier } from '@/lib/types'

export default function FranchiseNetworkPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalFranchises: 0,
    activeFranchises: 0,
    pendingFranchises: 0,
    suspendedFranchises: 0,
    totalTerritories: 0,
  })
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [domains, setDomains] = useState<TerritoryDomain[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState<Franchise | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState<{ franchise: Franchise; action: 'suspend' | 'activate' } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [magicLinkData, setMagicLinkData] = useState<{ phone: string; name: string; link: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Create Form State
  const [newTown, setNewTown] = useState({
    townName: '',
    slug: '',
    district: '',
    state: 'Telangana',
    pincodes: '',
    localities: '',
    applicantName: '',
    applicantPhone: '',
    email: '',
    experience: '',
    domain: '',
    planTier: 'PRO' as PlanTier,
    setupFee: 25000,
    monthlyFee: 5000,
    revSharePct: 20,
  })

  // Auto-slug generator
  const handleTownNameChange = (val: string) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    setNewTown((prev) => ({
      ...prev,
      townName: val,
      slug,
      domain: slug ? `${slug}.choutuppal.in` : '',
    }))
  }

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/franchises')
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setFranchises(data.franchises || [])
        setTerritories(data.territories || [])
        setDomains(data.domains || [])
        setAuditLogs(data.auditLogs || [])
      }
    } catch (err: any) {
      console.error('Failed to load franchise data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Create new franchise
  const handleCreateFranchise = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!newTown.townName || !newTown.applicantName || !newTown.applicantPhone) {
      setErrorMsg('Please enter town name, applicant name, and WhatsApp phone.')
      return
    }

    if (newTown.slug === 'choutuppal') {
      setErrorMsg('Choutuppal is the protected flagship company territory and cannot be duplicated.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          townName: newTown.townName,
          district: newTown.district,
          state: newTown.state,
          pincodes: newTown.pincodes.split(',').map((p) => p.trim()).filter(Boolean),
          localities: newTown.localities.split(',').map((l) => l.trim()).filter(Boolean),
          applicantName: newTown.applicantName,
          applicantPhone: newTown.applicantPhone,
          email: newTown.email,
          experience: newTown.experience,
          domain: newTown.domain,
          planTier: newTown.planTier,
          setupFee: newTown.setupFee,
          monthlyFee: newTown.monthlyFee,
          revSharePct: newTown.revSharePct,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to create franchise.')
        return
      }

      setSuccessMsg(data.message || 'Franchise created successfully!')
      setShowCreateModal(false)
      // Reset form
      setNewTown({
        townName: '',
        slug: '',
        district: '',
        state: 'Telangana',
        pincodes: '',
        localities: '',
        applicantName: '',
        applicantPhone: '',
        email: '',
        experience: '',
        domain: '',
        planTier: 'PRO',
        setupFee: 25000,
        monthlyFee: 5000,
        revSharePct: 20,
      })
      await fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  // Update status (activate, suspend, reactivate, close)
  const handleUpdateStatus = async (franchiseId: string, newStatus: FranchiseStatus, reason?: string) => {
    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          franchiseId,
          newStatus,
          reason,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        alert(data.error || 'Failed to update status.')
        return
      }

      setShowSuspendModal(null)
      setSuspendReason('')
      setSuccessMsg(data.message)
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  // Update plan
  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showPlanModal) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/admin/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan',
          franchiseId: showPlanModal.id,
          planTier: showPlanModal.planTier,
          featureLimits: showPlanModal.featureLimits,
          commercialModel: showPlanModal.commercialModel,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        alert(data.error || 'Failed to update plan.')
        return
      }

      setShowPlanModal(null)
      setSuccessMsg('Plan and limits updated successfully.')
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  // Cryptographically Secure Magic Login Link Generation via Server API
  const handleGenerateMagicLink = async (franchise: Franchise) => {
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: franchise.applicantPhone,
          territoryId: franchise.territoryId,
          role: 'FRANCHISE_ADMIN',
        }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || 'Failed to generate magic login link')
        return
      }

      const domain = franchise.assignedDomain || 'choutuppal.in'
      const link = `https://${domain}/login?magic=${data.token}&territory=${franchise.territorySlug}`
      setMagicLinkData({
        phone: franchise.applicantPhone,
        name: franchise.applicantName,
        link,
      })
      setCopiedLink(false)
    } catch (err: any) {
      alert(err.message || 'Network error while generating magic link')
    }
  }

  const copyMagicLink = () => {
    if (magicLinkData) {
      navigator.clipboard.writeText(magicLinkData.link)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Filtered list
  const filteredFranchises = franchises.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.territoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.applicantPhone.includes(searchQuery)
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader
        title="Town Franchise & Territory Network"
        subtitle="Manage multi-town SaaS expansion, territorial data isolation, domain bindings, and WhatsApp bots"
        onRefresh={fetchData}
        onAddClick={() => setShowCreateModal(true)}
        addLabel="Add Town Franchise"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Flash Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </span>
            <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Magic Link Generator Notification */}
        {magicLinkData && (
          <div className="p-5 bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-700/60 rounded-xl space-y-3 text-xs shadow-lg">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Single-Use WhatsApp Magic Login Link Generated</span>
              </span>
              <button onClick={() => setMagicLinkData(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px]">
              Valid for 15 minutes. Automatically authenticates <strong>{magicLinkData.name}</strong> ({magicLinkData.phone}) into their scoped territory admin portal:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-emerald-400 font-mono text-[11px] select-all truncate">
                {magicLinkData.link}
              </div>
              <button
                onClick={copyMagicLink}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors text-xs"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={`https://wa.me/91${magicLinkData.phone}?text=${encodeURIComponent(`నమస్కారం ${magicLinkData.name} గారు! మీ సూపర్ యాప్ అడ్మిన్ డ్యాష్‌బోర్డ్ తెరవడానికి క్రింది సురక్షిత లాగిన్ లింక్ ఉపయోగించండి:\n\n${magicLinkData.link}\n\n(15 నిమిషాల వ్యవధి మాత్రమే)`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp Partner</span>
              </a>
            </div>
          </div>
        )}

        {/* Network Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Total Franchises</span>
              <Globe2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{stats.totalFranchises}</div>
            <span className="text-[10px] text-slate-400 mt-1">Across 1 State</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Active Towns</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{stats.activeFranchises}</div>
            <span className="text-[10px] text-emerald-400/80 mt-1">Live Portals &amp; Bots</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Flagship Hub</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-lg font-bold text-amber-300">Choutuppal</div>
            <span className="text-[10px] text-amber-400/80 mt-1">Company-Owned (211 List.)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Pending Setup</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-400">{stats.pendingFranchises}</div>
            <span className="text-[10px] text-slate-400 mt-1">Awaiting Activation</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider">Suspended</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-400">{stats.suspendedFranchises}</div>
            <span className="text-[10px] text-slate-400 mt-1">Access Paused</span>
          </div>
        </div>

        {/* Protected Flagship Choutuppal Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-900/60 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold tracking-wide">
                  COMPANY-OWNED FLAGSHIP
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  IMMUTABLE CORE
                </span>
              </div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Choutuppal.in (చౌటుప్పల్ టౌన్ &amp; రీజియన్)</span>
                <span className="text-xs text-slate-400 font-normal">Primary Headquarter Territory</span>
              </h3>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Choutuppal remains the protected company-owned territory. All 211 verified listings, contacts, and WhatsApp flows are permanently isolated and protected against reassignment or deletion by franchise operators.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="https://choutuppal.in"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Visit Live</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <Link
                href="/admin/listings"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Manage 211 Listings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search town, territory, partner name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Status:</span>
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {['all', 'active', 'approved_pending_setup', 'suspended'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                    statusFilter === st ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'approved_pending_setup' ? 'Pending' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Franchises Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Franchise Territories</span>
              <span className="text-xs text-slate-400 font-normal">({filteredFranchises.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400">Strict backend-level territory scoping enforced</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2 bg-slate-900/50 rounded-xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
              <p className="text-xs">Loading franchise network...</p>
            </div>
          ) : filteredFranchises.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-900/50 rounded-xl border border-slate-800">
              <Globe2 className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No franchises found matching your filter.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Franchise</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredFranchises.map((fr) => {
                const territory = territories.find((t) => t.id === fr.territoryId)
                const isChoutuppal = fr.territorySlug === 'choutuppal'

                return (
                  <div
                    key={fr.id}
                    className={`bg-slate-900 border rounded-xl p-5 space-y-4 shadow transition-all ${
                      fr.status === 'active'
                        ? 'border-emerald-800/40 hover:border-emerald-700/60'
                        : fr.status === 'suspended'
                        ? 'border-rose-900/50 bg-rose-950/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-sm text-white">{fr.name}</h5>
                          {fr.status === 'active' ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ACTIVE
                            </span>
                          ) : fr.status === 'suspended' ? (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded border border-rose-500/20">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                              SETUP PENDING
                            </span>
                          )}
                          <span className="text-[10px] bg-blue-500/10 text-blue-300 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20">
                            {fr.planTier}
                          </span>
                        </div>
                        <p className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{fr.territoryName} Region</span>
                          <span className="text-slate-500">&bull;</span>
                          <span className="text-slate-400 font-mono text-[11px]">{fr.territorySlug}</span>
                        </p>
                      </div>

                      {/* Domain Badge */}
                      <div className="text-right shrink-0">
                        <a
                          href={`https://${fr.assignedDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-300 hover:text-white bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 flex items-center gap-1 font-mono"
                        >
                          <span>{fr.assignedDomain}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </a>
                      </div>
                    </div>

                    {/* Operator & Coverage Details */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Franchise Operator
                        </span>
                        <div className="font-medium text-slate-200">{fr.applicantName}</div>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{fr.applicantPhone}</span>
                        </div>
                        {fr.email && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{fr.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Plan &amp; Quotas
                        </span>
                        <div className="text-slate-300 font-mono text-[11px]">
                          Limit: <strong className="text-white">{fr.featureLimits?.maxListings || 500}</strong> listings
                        </div>
                        <div className="text-slate-300 font-mono text-[11px]">
                          Staff: <strong className="text-white">{fr.featureLimits?.maxStaff || 4}</strong> users
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Royalty: ₹{fr.commercialModel?.monthlyFee || 5000}/mo ({fr.commercialModel?.revSharePct || 20}%)
                        </div>
                      </div>
                    </div>

                    {/* Localities Tags */}
                    {territory?.localities && territory.localities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500">Coverage:</span>
                        {territory.localities.map((loc, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono"
                          >
                            {loc}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Magic Login Link Button */}
                        <button
                          onClick={() => handleGenerateMagicLink(fr)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Generate WhatsApp single-use login link"
                        >
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Magic Login</span>
                        </button>

                        {/* Plan Customizer */}
                        <button
                          onClick={() => setShowPlanModal(fr)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Modify Plan & Limits"
                        >
                          <Sliders className="w-3.5 h-3.5 text-blue-400" />
                          <span>Plan Limits</span>
                        </button>

                        {/* View Town Public Route */}
                        <Link
                          href={`/town/${fr.territorySlug}`}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Preview public town portal"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-400" />
                          <span>Preview Town</span>
                        </Link>
                      </div>

                      {/* Status Transition Action */}
                      <div className="flex items-center gap-1.5">
                        {isChoutuppal ? (
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-500" />
                            <span>Protected</span>
                          </span>
                        ) : fr.status === 'active' ? (
                          <button
                            onClick={() => setShowSuspendModal({ franchise: fr, action: 'suspend' })}
                            className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                          >
                            Suspend
                          </button>
                        ) : fr.status === 'suspended' ? (
                          <button
                            onClick={() => setShowSuspendModal({ franchise: fr, action: 'activate' })}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(fr.id, 'active')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Activate Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Real-time Audit Trail Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                Multi-Tenant Security &amp; Audit Trail
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Immutable audit records</span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No audit events recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-850">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-[11px]">{log.action}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                        {log.territoryId}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{log.details}</p>
                    <span className="text-[10px] text-slate-500">
                      Actor: {log.actorName} ({log.actorRole})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Create New Town Franchise */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span>Onboard New Town Franchise</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Creates an isolated town territory, binds domains, and configures WhatsApp bot quotas.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateFranchise} className="space-y-4 text-xs">
              {/* Territory Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Town / City Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suryapet, Bhongir, Nalgonda"
                    value={newTown.townName}
                    onChange={(e) => handleTownNameChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Territory Slug (Unique)</label>
                  <input
                    type="text"
                    readOnly
                    value={newTown.slug}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-slate-400 font-mono"
                  />
                  {newTown.slug === 'choutuppal' && (
                    <span className="text-[10px] text-rose-400 block mt-1">Cannot use protected flagship slug!</span>
                  )}
                </div>
              </div>

              {/* District & Coverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Suryapet, Yadadri Bhuvanagiri"
                    value={newTown.district}
                    onChange={(e) => setNewTown({ ...newTown, district: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mandals / Localities (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Road, Bus Stand, RTC Colony"
                    value={newTown.localities}
                    onChange={(e) => setNewTown({ ...newTown, localities: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Franchise Partner Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Partner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maheshwar Reddy"
                    value={newTown.applicantName}
                    onChange={(e) => setNewTown({ ...newTown, applicantName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">WhatsApp Phone (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9848012345"
                    value={newTown.applicantPhone}
                    onChange={(e) => setNewTown({ ...newTown, applicantPhone: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Partner Email</label>
                  <input
                    type="email"
                    placeholder="partner@gmail.com"
                    value={newTown.email}
                    onChange={(e) => setNewTown({ ...newTown, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Domain & Plan Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Primary Domain / Subdomain</label>
                  <input
                    type="text"
                    placeholder="e.g. suryapet.in or suryapet.choutuppal.in"
                    value={newTown.domain}
                    onChange={(e) => setNewTown({ ...newTown, domain: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Default: {newTown.slug ? `${newTown.slug}.choutuppal.in` : 'town.choutuppal.in'}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Plan Tier</label>
                  <select
                    value={newTown.planTier}
                    onChange={(e) => setNewTown({ ...newTown, planTier: e.target.value as PlanTier })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="STARTER">STARTER (500 Listings, 4 Staff, 1000 Broadcasts)</option>
                    <option value="PRO">PRO (1000 Listings, 8 Staff, 2500 Broadcasts, Custom Domain)</option>
                    <option value="ENTERPRISE">ENTERPRISE (2500 Listings, 15 Staff, 5000 Broadcasts, Dedicated Bot)</option>
                  </select>
                </div>
              </div>

              {/* Commercial Terms */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Setup Fee (₹)</label>
                  <input
                    type="number"
                    value={newTown.setupFee}
                    onChange={(e) => setNewTown({ ...newTown, setupFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Royalty (₹)</label>
                  <input
                    type="number"
                    value={newTown.monthlyFee}
                    onChange={(e) => setNewTown({ ...newTown, monthlyFee: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rev Share %</label>
                  <input
                    type="number"
                    value={newTown.revSharePct}
                    onChange={(e) => setNewTown({ ...newTown, revSharePct: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create &amp; Provision Franchise</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Plan & Feature Limits Editor */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Modify Plan &amp; Quotas: {showPlanModal.name}</span>
              </h3>
              <button onClick={() => setShowPlanModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Plan Tier</label>
                <select
                  value={showPlanModal.planTier}
                  onChange={(e) =>
                    setShowPlanModal({ ...showPlanModal, planTier: e.target.value as PlanTier })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Listings Quota</label>
                  <input
                    type="number"
                    value={showPlanModal.featureLimits?.maxListings || 500}
                    onChange={(e) =>
                      setShowPlanModal({
                        ...showPlanModal,
                        featureLimits: {
                          ...showPlanModal.featureLimits,
                          maxListings: Number(e.target.value),
                          maxStaff: showPlanModal.featureLimits?.maxStaff || 4,
                          maxMonthlyBroadcasts: showPlanModal.featureLimits?.maxMonthlyBroadcasts || 1000,
                          customDomainAllowed: showPlanModal.featureLimits?.customDomainAllowed ?? true,
                          aiChatEnabled: showPlanModal.featureLimits?.aiChatEnabled ?? true,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Staff Seats</label>
                  <input
                    type="number"
                    value={showPlanModal.featureLimits?.maxStaff || 4}
                    onChange={(e) =>
                      setShowPlanModal({
                        ...showPlanModal,
                        featureLimits: {
                          ...showPlanModal.featureLimits,
                          maxListings: showPlanModal.featureLimits?.maxListings || 500,
                          maxStaff: Number(e.target.value),
                          maxMonthlyBroadcasts: showPlanModal.featureLimits?.maxMonthlyBroadcasts || 1000,
                          customDomainAllowed: showPlanModal.featureLimits?.customDomainAllowed ?? true,
                          aiChatEnabled: showPlanModal.featureLimits?.aiChatEnabled ?? true,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save Quotas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Suspend / Reactivate Confirmation */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">
                {showSuspendModal.action === 'suspend' ? 'Suspend Franchise Access' : 'Reactivate Franchise'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              {showSuspendModal.action === 'suspend'
                ? `Are you sure you want to suspend "${showSuspendModal.franchise.name}"? Public traffic to their domain will display a temporary pause notice and their admin team will be locked out.`
                : `Reactivating "${showSuspendModal.franchise.name}" will restore live website listings and WhatsApp bot workflows immediately.`}
            </p>

            {showSuspendModal.action === 'suspend' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1 text-xs">Reason for Suspension</label>
                <input
                  type="text"
                  placeholder="e.g. Non-payment of monthly SaaS royalty"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSuspendModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(
                    showSuspendModal.franchise.id,
                    showSuspendModal.action === 'suspend' ? 'suspended' : 'active',
                    suspendReason
                  )
                }
                disabled={submitting}
                className={`px-4 py-2 rounded-lg font-semibold text-xs text-white ${
                  showSuspendModal.action === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {showSuspendModal.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
