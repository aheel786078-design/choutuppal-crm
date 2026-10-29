'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Phone,
  Tag,
  ArrowRight,
  RefreshCw,
  Search,
  DollarSign,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { CRMDeal, DealStage } from '@/lib/types'

interface StageConfig {
  key: DealStage
  title: string
  color: string
  badgeColor: string
}

const STAGES: StageConfig[] = [
  { key: 'NEW_LEAD', title: 'New Leads', color: 'border-blue-500', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'CONTACTED', title: 'Contacted / Pitch', color: 'border-amber-500', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'QUALIFIED', title: 'Verified / Qualified', color: 'border-indigo-500', badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { key: 'PROPOSAL', title: 'Proposal Sent', color: 'border-purple-500', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'WON', title: 'Won / Active Paid', color: 'border-emerald-500', badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { key: 'LOST', title: 'Lost / Closed', color: 'border-rose-500', badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
]

export default function PipelinesPage() {
  const [deals, setDeals] = useState<CRMDeal[]>([])
  const [metrics, setMetrics] = useState<any>({
    totalDeals: 0,
    totalValue: 0,
    openValue: 0,
    wonValue: 0,
    stageCounts: {},
    stageValues: {},
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('search')
      return p ? p.trim() : ''
    }
    return ''
  })
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<CRMDeal | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: 'NEW_LEAD' as DealStage,
    phone: '',
    tag: '',
    contactName: '',
    notes: '',
    nextFollowUpDate: '',
  })

  const loadDeals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrorMsg(null)

    try {
      let url = '/api/crm/deals'
      const params = new URLSearchParams()
      if (selectedTerritoryId && selectedTerritoryId !== 'ALL') {
        params.append('territoryId', selectedTerritoryId)
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const res = await fetch(url)
      const data = await res.json()

      if (data.success && Array.isArray(data.deals)) {
        setDeals(data.deals)
        if (data.metrics) {
          setMetrics(data.metrics)
        }
      } else {
        setErrorMsg(data.error || 'Failed to fetch deals from server.')
      }
    } catch (err: any) {
      console.error('[Pipelines] Fetch error:', err)
      setErrorMsg('Network error connecting to deals API.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedTerritoryId, searchQuery])

  useEffect(() => {
    loadDeals()
  }, [loadDeals])

  const openCreateModal = () => {
    setEditingDeal(null)
    const isPhoneSearch = /^\d+$/.test(searchQuery.trim())
    setFormData({
      title: !isPhoneSearch && searchQuery.trim() ? `${searchQuery.trim()} Deal` : '',
      value: '',
      stage: 'NEW_LEAD',
      phone: isPhoneSearch ? searchQuery.trim() : '',
      tag: 'Lead',
      contactName: !isPhoneSearch && searchQuery.trim() ? searchQuery.trim() : '',
      notes: '',
      nextFollowUpDate: '',
    })
    setShowCreateModal(true)
  }

  const openEditModal = (deal: CRMDeal) => {
    setEditingDeal(deal)
    setFormData({
      title: deal.title,
      value: String(deal.value),
      stage: deal.stage,
      phone: deal.phone || '',
      tag: deal.tag || '',
      contactName: deal.contactName || '',
      notes: deal.notes || '',
      nextFollowUpDate: deal.nextFollowUpDate || '',
    })
    setShowCreateModal(true)
  }

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Please enter a deal title.')
      return
    }
    const val = Number(formData.value)
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid non-negative amount.')
      return
    }

    setSaving(true)
    try {
      if (editingDeal) {
        // PUT update
        const res = await fetch('/api/crm/deals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDeal.id,
            title: formData.title.trim(),
            value: val,
            stage: formData.stage,
            phone: formData.phone.trim() || undefined,
            tag: formData.tag.trim() || undefined,
            contactName: formData.contactName.trim() || undefined,
            notes: formData.notes.trim() || undefined,
            nextFollowUpDate: formData.nextFollowUpDate || undefined,
          }),
        })
        const data = await res.json()
        if (data.success && data.deal) {
          setShowCreateModal(false)
          loadDeals(true)
        } else {
          alert(data.error || 'Failed to update deal.')
        }
      } else {
        // POST create
        const res = await fetch('/api/crm/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title.trim(),
            value: val,
            stage: formData.stage,
            phone: formData.phone.trim() || undefined,
            tag: formData.tag.trim() || undefined,
            contactName: formData.contactName.trim() || undefined,
            notes: formData.notes.trim() || undefined,
            nextFollowUpDate: formData.nextFollowUpDate || undefined,
            territoryId: selectedTerritoryId && selectedTerritoryId !== 'ALL' ? selectedTerritoryId : undefined,
          }),
        })
        const data = await res.json()
        if (data.success && data.deal) {
          setShowCreateModal(false)
          loadDeals(true)
        } else {
          alert(data.error || 'Failed to create deal.')
        }
      }
    } catch (err: any) {
      console.error('[Pipelines] Save error:', err)
      alert('Network error saving deal.')
    } finally {
      setSaving(false)
    }
  }

  const moveStage = async (id: string, newStage: DealStage) => {
    // Optimistic UI update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              stage: newStage,
              status: newStage === 'WON' ? 'WON' : newStage === 'LOST' ? 'LOST' : 'OPEN',
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    )

    try {
      const res = await fetch('/api/crm/deals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || 'Failed to update deal stage.')
        loadDeals(true)
      } else {
        loadDeals(true)
      }
    } catch (err) {
      console.error('[Pipelines] Stage move error:', err)
      loadDeals(true)
    }
  }

  const handleDeleteDeal = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete deal "${title}"?`)) return

    try {
      const res = await fetch(`/api/crm/deals?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setDeals((prev) => prev.filter((d) => d.id !== id))
        loadDeals(true)
      } else {
        alert(data.error || 'Failed to delete deal.')
      }
    } catch (err) {
      console.error('[Pipelines] Delete error:', err)
      alert('Network error deleting deal.')
    }
  }

  const getNextStage = (current: DealStage): DealStage | null => {
    const idx = STAGES.findIndex((s) => s.key === current)
    if (idx >= 0 && idx < STAGES.length - 2) {
      return STAGES[idx + 1].key
    }
    if (current === 'PROPOSAL') return 'WON'
    return null
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <AdminHeader
        title="Sales Pipeline & Merchant Deals (Kanban)"
        subtitle="Track onboarding stages of local businesses and real estate promoters"
        addLabel="Add Deal"
        onAddClick={openCreateModal}
        onRefresh={() => loadDeals(true)}
        selectedTerritoryId={selectedTerritoryId}
        onTerritoryChange={(tId) => setSelectedTerritoryId(tId)}
      />

      <div className="p-6 max-w-7xl mx-auto w-full flex-1 space-y-6">
        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => loadDeals(true)}
              className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1 rounded-md"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Total Pipeline Value</span>
            <div className="text-xl font-bold text-white mt-1">
              ₹{Number(metrics.totalValue || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500">{metrics.totalDeals || 0} active deals</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Open Deals in Funnel</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              ₹{Number(metrics.openValue || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500">In negotiation / proposal</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Won / Closed Revenue</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              ₹{Number(metrics.wonValue || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-500/80 font-medium">Paid advertisers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Search Deals</span>
            <div className="relative mt-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search merchant, tag, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Loading persistent sales pipeline...</p>
          </div>
        )}

        {/* Kanban Board Columns */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
            {STAGES.map((st) => {
              const stageDeals = deals.filter((d) => d.stage === st.key)
              const stageVal = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)

              return (
                <div
                  key={st.key}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3 min-h-[460px] flex flex-col"
                >
                  {/* Column Header */}
                  <div className={`border-l-2 ${st.color} pl-2 py-0.5 flex items-center justify-between`}>
                    <div>
                      <h4 className="font-semibold text-xs text-white tracking-wide">{st.title}</h4>
                      <div className="text-[10px] text-slate-400 font-medium">
                        ₹{stageVal.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-1.5 py-0.5 rounded">
                      {stageDeals.length}
                    </span>
                  </div>

                  {/* Deals List */}
                  <div className="space-y-2.5 flex-1">
                    {stageDeals.length === 0 ? (
                      <div className="border border-dashed border-slate-800/80 rounded-lg p-6 text-center text-[11px] text-slate-600">
                        No deals in stage
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const nextStage = getNextStage(deal.stage)

                        return (
                          <div
                            key={deal.id}
                            className="bg-slate-950 p-3 rounded-lg border border-slate-800 hover:border-slate-700 shadow-sm space-y-2 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h5 className="font-semibold text-xs text-white leading-tight">
                                {deal.title}
                              </h5>
                              <span className="text-[11px] text-emerald-400 font-bold flex-shrink-0">
                                ₹{Number(deal.value || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                            {deal.phone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{deal.phone}</span>
                              </div>
                            )}

                            {deal.contactName && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Briefcase className="w-2.5 h-2.5 text-slate-500" />
                                <span className="truncate">{deal.contactName}</span>
                              </div>
                            )}

                            {deal.notes && (
                              <p className="text-[10px] text-slate-400 line-clamp-2 bg-slate-900/50 p-1.5 rounded border border-slate-800/50">
                                {deal.notes}
                              </p>
                            )}

                            {deal.nextFollowUpDate && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Follow up: {deal.nextFollowUpDate}</span>
                              </div>
                            )}

                            {/* Tags and Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                              {deal.tag ? (
                                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                                  <Tag className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{deal.tag}</span>
                                </span>
                              ) : (
                                <span />
                              )}

                              <div className="flex items-center gap-1">
                                {deal.phone && (
                                  <Link
                                    href={`/admin/inbox?phone=${encodeURIComponent(deal.phone)}`}
                                    title="Open WhatsApp Chat"
                                    className="text-emerald-400 hover:text-emerald-300 p-1 hover:bg-slate-800 rounded transition"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </Link>
                                )}
                                <button
                                  onClick={() => openEditModal(deal)}
                                  title="Edit Deal"
                                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDeal(deal.id, deal.title)}
                                  title="Delete Deal"
                                  className="text-slate-400 hover:text-rose-400 p-1 hover:bg-slate-800 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Stage Selector & Quick Advance */}
                            <div className="flex items-center justify-between pt-1 text-[10px] gap-1">
                              <select
                                value={deal.stage}
                                onChange={(e) => moveStage(deal.id, e.target.value as DealStage)}
                                className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
                              >
                                {STAGES.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.title}
                                  </option>
                                ))}
                              </select>

                              {nextStage && (
                                <button
                                  onClick={() => moveStage(deal.id, nextStage)}
                                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 text-[10px] px-1 py-0.5"
                                >
                                  <span>Advance</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Deal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <span>{editingDeal ? 'Edit Sales Deal' : 'Create New Sales Deal'}</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deal Title / Merchant Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Sai Ram Automobiles - Annual Banner"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Value / Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="1500"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pipeline Stage *
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as DealStage })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9848012345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Industry / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Automobile, RealEstate, Retail"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Contact Name / Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes & Discussion Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Details discussed with merchant, pricing quotes, special requests..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingDeal ? 'Update Deal' : 'Save Deal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
