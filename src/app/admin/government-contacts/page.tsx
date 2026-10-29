'use client'

import React, { useState, useEffect } from 'react'
import {
  Landmark,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Phone,
  Eye,
  Edit2,
  Archive,
  ExternalLink,
  Check,
  X,
  Building2,
  FileText,
  MapPin,
  Flame,
  Zap,
  HeartPulse,
  AlertCircle,
  Upload,
  Download,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { GOVT_CONTACT_CATEGORIES, CHOUTUPPAL_MANDAL_VILLAGES } from '@/lib/constants'

export default function GovernmentContactsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)

  const [contacts, setContacts] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    total: 0,
    published: 0,
    verified: 0,
    pending: 0,
    draft: 0,
    archived: 0,
    overdue: 0,
    emergency: 0,
  })

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [villageFilter, setVillageFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [activeContact, setActiveContact] = useState<any>(null)

  // CSV Import states
  const [csvInput, setCsvInput] = useState('')
  const [importDryRun, setImportDryRun] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Form states
  const [formData, setFormData] = useState<any>({
    name: '',
    designation: '',
    category: 'emergency_helpline',
    subcategory: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    email: '',
    officeAddress: '',
    district: 'Yadadri Bhuvanagiri',
    mandal: 'Choutuppal',
    village: 'Choutuppal Town',
    ward: '',
    officeHours: '',
    availability: 'office_hours',
    sourceType: 'official_website',
    sourceUrl: '',
    sourceReference: '',
    status: 'draft',
    isEmergency: false,
    isPublicContact: true,
    displayOrder: 100,
    notes: '',
  })
  const [verifySourceType, setVerifySourceType] = useState('official_website')
  const [verifySourceUrl, setVerifySourceUrl] = useState('')
  const [verifySourceRef, setVerifySourceRef] = useState('')
  const [verifyReviewDays, setVerifyReviewDays] = useState(180)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<any[] | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const queryParams = new URLSearchParams()
      if (statusFilter !== 'all') queryParams.set('status', statusFilter)
      if (categoryFilter !== 'all') queryParams.set('category', categoryFilter)
      if (villageFilter !== 'all') queryParams.set('village', villageFilter)
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim())

      const res = await fetch(`/api/admin/government-contacts?${queryParams.toString()}`)
      const resData = await res.json()
      if (resData.success) {
        setContacts(resData.contacts || [])
        if (resData.stats) setStats(resData.stats)
      } else {
        setErrorMsg(resData.error || 'Failed to load government contacts')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [statusFilter, categoryFilter, villageFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchData()
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)
    setDuplicateWarning(null)
    try {
      const res = await fetch('/api/admin/government-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccessMsg(`Created contact: ${data.contact.name}`)
        if (data.hasDuplicates) {
          setDuplicateWarning(data.duplicateWarnings)
        } else {
          setShowAddModal(false)
          resetForm()
        }
        fetchData()
      } else {
        setErrorMsg(data.error || 'Failed to create contact')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeContact) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/admin/government-contacts/${activeContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccessMsg(
          data.revertedToPendingVerification
            ? `Updated ${data.contact.name}. Notice: Material changes reverted contact to Pending Verification.`
            : `Updated ${data.contact.name}`
        )
        setShowEditModal(false)
        fetchData()
      } else {
        setErrorMsg(data.error || 'Failed to update contact')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeContact) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/admin/government-contacts/${activeContact.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: verifySourceType,
          sourceUrl: verifySourceUrl,
          sourceReference: verifySourceRef,
          reviewDays: verifyReviewDays,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccessMsg(`Verified ${activeContact.name}`)
        setShowVerifyModal(false)
        fetchData()
      } else {
        setErrorMsg(data.error || 'Verification failed')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (contact: any) => {
    const isPublishing = contact.status !== 'published'
    try {
      const res = await fetch(`/api/admin/government-contacts/${contact.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isPublishing ? 'publish' : 'unpublish' }),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccessMsg(isPublishing ? `Published ${contact.name}` : `Unpublished ${contact.name}`)
        fetchData()
      } else {
        setErrorMsg(data.error || 'Action failed')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling publish state')
    }
  }

  const handleArchive = async (contact: any) => {
    if (!confirm(`Are you sure you want to archive "${contact.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/government-contacts/${contact.id}/archive`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccessMsg(`Archived ${contact.name}`)
        fetchData()
      } else {
        setErrorMsg(data.error || 'Failed to archive')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error archiving contact')
    }
  }

  const handleExportCsv = () => {
    window.open('/api/admin/government-contacts/export', '_blank')
  }

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvInput.trim()) {
      setErrorMsg('Please enter or paste CSV content')
      return
    }
    setIsImporting(true)
    setErrorMsg(null)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/government-contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: csvInput,
          dryRun: importDryRun,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setImportResult(data)
        if (!importDryRun) {
          setActionSuccessMsg(data.message || `Successfully imported ${data.importedCount} contacts`)
          fetchData()
        }
      } else {
        setErrorMsg(data.error || 'CSV import failed')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error importing CSV')
    } finally {
      setIsImporting(false)
    }
  }

  const openEditModal = (c: any) => {
    setActiveContact(c)
    setFormData({
      name: c.name,
      designation: c.designation,
      category: c.category,
      subcategory: c.subcategory || '',
      phoneNumber: c.phoneNumber || '',
      alternatePhoneNumber: c.alternatePhoneNumber || '',
      email: c.email || '',
      officeAddress: c.officeAddress || '',
      district: c.district || 'Yadadri Bhuvanagiri',
      mandal: c.mandal || 'Choutuppal',
      village: c.village || 'Choutuppal Town',
      ward: c.ward || '',
      officeHours: c.officeHours || '',
      availability: c.availability || 'office_hours',
      sourceType: c.sourceType || 'official_website',
      sourceUrl: c.sourceUrl || '',
      sourceReference: c.sourceReference || '',
      status: c.status,
      isEmergency: c.isEmergency,
      isPublicContact: c.isPublicContact,
      displayOrder: c.displayOrder ?? 100,
      notes: c.notes || '',
    })
    setShowEditModal(true)
  }

  const openVerifyModal = (c: any) => {
    setActiveContact(c)
    setVerifySourceType(c.sourceType || 'official_website')
    setVerifySourceUrl(c.sourceUrl || '')
    setVerifySourceRef(c.sourceReference || '')
    setVerifyReviewDays(180)
    setShowVerifyModal(true)
  }

  const openPreviewModal = (c: any) => {
    setActiveContact(c)
    setShowPreviewModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      designation: '',
      category: 'emergency_helpline',
      subcategory: '',
      phoneNumber: '',
      alternatePhoneNumber: '',
      email: '',
      officeAddress: '',
      district: 'Yadadri Bhuvanagiri',
      mandal: 'Choutuppal',
      village: 'Choutuppal Town',
      ward: '',
      officeHours: '',
      availability: 'office_hours',
      sourceType: 'official_website',
      sourceUrl: '',
      sourceReference: '',
      status: 'draft',
      isEmergency: false,
      isPublicContact: true,
      displayOrder: 100,
      notes: '',
    })
    setDuplicateWarning(null)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <AdminHeader title="Government & Emergency Directory" subtitle="Choutuppal Mandal official contacts & verification workflow" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* TOP STATUS ALERTS */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center justify-between text-red-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {actionSuccessMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between text-emerald-300 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Contacts</span>
              <Landmark className="h-4 w-4 text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-white">{stats.total}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span>Published Live</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-300">{stats.published}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-blue-400 text-xs font-semibold">
              <span>Verified</span>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-300">{stats.verified}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span>Pending Review</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-300">{stats.pending}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-red-400 text-xs font-semibold">
              <span>Overdue Check</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-red-300">{stats.overdue}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
              <span>Emergency 24x7</span>
              <Flame className="h-4 w-4" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-300">{stats.emergency}</p>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/60 text-xs">
            {['all', 'published', 'verified', 'pending_verification', 'draft', 'archived'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition ${
                  statusFilter === st ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Contact
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
              title="Export all contacts to CSV"
            >
              <Download className="h-4 w-4 text-slate-400" /> Export CSV
            </button>
            <button
              onClick={() => {
                setCsvInput('')
                setImportResult(null)
                setShowImportModal(true)
              }}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition"
              title="Import contacts from CSV"
            >
              <Upload className="h-4 w-4 text-slate-400" /> Import CSV
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SEARCH & DROPDOWN FILTERS */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-slate-200">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, designation, phone, or office..."
              className="w-full text-xs bg-transparent focus:outline-hidden"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden font-medium"
          >
            <option value="all">All Categories</option>
            {GOVT_CONTACT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="bg-slate-800/90 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden font-medium"
          >
            <option value="all">All Villages (Mandal-Wide)</option>
            {CHOUTUPPAL_MANDAL_VILLAGES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </form>

        {/* DATA TABLE */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Official / Office</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Verification</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
                      Loading government directory records...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      No government contacts found matching current filters.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const catMeta = GOVT_CONTACT_CATEGORIES.find((cat) => cat.id === c.category)
                    const isOverdue = c.verificationDueAt && new Date(c.verificationDueAt) <= new Date()

                    return (
                      <tr key={c.id} className="hover:bg-slate-700/40 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            {c.isEmergency && (
                              <span className="p-0.5 rounded bg-red-500/20 text-red-400" title="Emergency Service">
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                            <span>{c.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{c.designation}</div>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                            {catMeta ? catMeta.name.split(' ')[0] : c.category}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 text-[11px] text-slate-300">
                          <div>{c.village || 'Choutuppal'}</div>
                          <div className="text-[10px] text-slate-400">{c.district}</div>
                        </td>

                        <td className="px-3 py-3.5">
                          {c.phoneNumber ? (
                            <div className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {c.phoneNumber}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No phone</span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          {c.status === 'verified' || c.status === 'published' ? (
                            isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="h-2.5 w-2.5 text-red-400" /> Overdue Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" /> Verified
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              <Clock className="h-2.5 w-2.5 text-amber-400" /> Pending Review
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              c.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : c.status === 'verified'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : c.status === 'pending_verification'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : c.status === 'draft'
                                ? 'bg-slate-600/30 text-slate-300 border border-slate-600'
                                : 'bg-rose-900/30 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Preview Public Card */}
                          <button
                            onClick={() => openPreviewModal(c)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                            title="Preview Public Card"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Contact */}
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-blue-400 transition"
                            title="Edit Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Verify Action */}
                          {c.status !== 'verified' && c.status !== 'published' && (
                            <button
                              onClick={() => openVerifyModal(c)}
                              className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                              title="Verify Official Source"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Publish / Unpublish Toggle */}
                          <button
                            onClick={() => handleTogglePublish(c)}
                            className={`p-1.5 rounded-lg transition ${
                              c.status === 'published'
                                ? 'bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                            title={c.status === 'published' ? 'Unpublish' : 'Publish to Live Directory'}
                          >
                            {c.status === 'published' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          </button>

                          {/* Archive Action */}
                          {c.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(c)}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-700 text-slate-400 hover:text-white transition"
                              title="Archive Contact"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: ADD / EDIT CONTACT */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-400" />
                  {showAddModal ? 'Add Government Contact' : 'Edit Government Contact'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setShowEditModal(false)
                    setDuplicateWarning(null)
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {duplicateWarning && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" /> Potential Duplicate Detected:
                  </p>
                  <p className="mt-1">
                    Existing contacts share this phone number or name/category:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {duplicateWarning.map((d) => (
                      <li key={d.id}>
                        {d.name} ({d.phone || 'No phone'}) [ID: {d.id}]
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-slate-300">
                    Review above to ensure you are not creating a duplicate official entry.
                  </p>
                </div>
              )}

              <form onSubmit={showAddModal ? handleCreateContact : handleUpdateContact} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Official / Service Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Police Control Room / Tahsildar"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation / Role *</label>
                    <input
                      type="text"
                      required
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Mandal Revenue Officer / CI of Police"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    >
                      {GOVT_CONTACT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Subcategory</label>
                    <input
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      placeholder="e.g. Traffic, Fire Safety, Land Records"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Public Phone / Shortcode</label>
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="e.g. 112 / 100 / 9441348175"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Alternate Phone</label>
                    <input
                      type="text"
                      value={formData.alternatePhoneNumber}
                      onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                      placeholder="e.g. 08694-xxxxxx"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Village</label>
                    <select
                      value={formData.village}
                      onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    >
                      {CHOUTUPPAL_MANDAL_VILLAGES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Availability</label>
                    <select
                      value={formData.availability}
                      onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    >
                      <option value="24x7">24x7 (Round the clock)</option>
                      <option value="office_hours">Office Hours (10 AM - 5 PM)</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Office Address</label>
                  <input
                    type="text"
                    value={formData.officeAddress}
                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                    placeholder="e.g. Near Bus Stand, Choutuppal, Yadadri Bhuvanagiri"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Official Source Type</label>
                    <select
                      value={formData.sourceType}
                      onChange={(e) => setFormData({ ...formData, sourceType: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    >
                      <option value="official_website">Official Website (.gov.in / .nic.in)</option>
                      <option value="official_document">Official Gazette / Dept Order</option>
                      <option value="authorized_confirmation">Authorized Official Confirmation</option>
                      <option value="other">Other Public Record</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Official Source URL</label>
                    <input
                      type="url"
                      value={formData.sourceUrl}
                      onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                      placeholder="e.g. https://112.gov.in"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 py-2 border-t border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isEmergency}
                      onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                      className="rounded border-slate-600 bg-slate-900 text-red-500 focus:ring-0"
                    />
                    <span className="text-white font-semibold">Emergency 24x7 Helpline</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublicContact}
                      onChange={(e) => setFormData({ ...formData, isPublicContact: e.target.checked })}
                      className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-0"
                    />
                    <span className="text-white font-semibold">Authorized for Public Release</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setShowEditModal(false)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {showAddModal ? 'Save as Draft / Pending' : 'Update Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: VERIFY SOURCE */}
        {showVerifyModal && activeContact && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Verify Contact Official Source
                </h3>
                <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                To verify <strong className="text-white">{activeContact.name}</strong>, document the official government portal or authorized evidence before enabling publication.
              </p>

              <form onSubmit={handleVerifyContact} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Source Type *</label>
                  <select
                    value={verifySourceType}
                    onChange={(e) => setVerifySourceType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  >
                    <option value="official_website">Official Website (.gov.in)</option>
                    <option value="official_document">Official Gazette / Dept Order</option>
                    <option value="authorized_confirmation">Authorized Official Confirmation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Source URL</label>
                  <input
                    type="url"
                    value={verifySourceUrl}
                    onChange={(e) => setVerifySourceUrl(e.target.value)}
                    placeholder="https://fire.telangana.gov.in"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Source Reference / Citation</label>
                  <input
                    type="text"
                    value={verifySourceRef}
                    onChange={(e) => setVerifySourceRef(e.target.value)}
                    placeholder="e.g. Telangana State Fire Control Directory 2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Re-Verification Policy Window</label>
                  <select
                    value={verifyReviewDays}
                    onChange={(e) => setVerifyReviewDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-hidden"
                  >
                    <option value={90}>90 Days (Quarterly)</option>
                    <option value={180}>180 Days (Semi-Annual — Recommended)</option>
                    <option value={365}>365 Days (Annual)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Verification
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PREVIEW CARD */}
        {showPreviewModal && activeContact && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" /> Public Card Preview
                </h3>
                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* RENDER PUBLIC-FACING CARD */}
              <div className="rounded-2xl bg-white text-slate-900 p-5 border border-slate-200 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {activeContact.category}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Verified Official
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">{activeContact.name}</h4>
                  <p className="text-xs text-slate-600 font-medium">{activeContact.designation}</p>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {activeContact.village}, {activeContact.mandal} Mandal
                  </p>
                  {activeContact.officeHours && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {activeContact.officeHours}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {activeContact.sourceUrl ? (
                    <a
                      href={activeContact.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="h-3 w-3" /> Official Source
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">Verified</span>
                  )}

                  {activeContact.phoneNumber ? (
                    <a
                      href={`tel:${activeContact.phoneNumber}`}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call {activeContact.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No phone</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IMPORT CSV MODAL */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-400" />
                  <h3 className="font-bold text-base text-white">Import Government Contacts via CSV</h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleImportCsv} className="space-y-4 text-xs">
                <div>
                  <p className="text-slate-300 mb-2">
                    Paste raw CSV data or choose a CSV file. Supported columns:
                  </p>
                  <code className="block bg-slate-950 p-2.5 rounded-lg text-[11px] text-slate-300 font-mono overflow-x-auto">
                    name,designation,category,phone_number,village,office_address,office_hours,availability,is_emergency
                  </code>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Upload CSV File</label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setCsvInput((event.target?.result as string) || '')
                        }
                        reader.readAsText(file)
                      }
                    }}
                    className="w-full text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Or Paste CSV Content</label>
                  <textarea
                    rows={8}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="name,designation,category,phone_number,village&#10;Sub Inspector,Police SI,police,9848012345,Choutuppal Town"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
                  <input
                    type="checkbox"
                    id="dryRunCheck"
                    checked={importDryRun}
                    onChange={(e) => setImportDryRun(e.target.checked)}
                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="dryRunCheck" className="text-slate-300 font-medium">
                    Dry Run validation only (simulate import without saving to store)
                  </label>
                </div>

                {/* Import Result Summary */}
                {importResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      importResult.errorCount > 0
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    <p className="font-bold">{importResult.message}</p>
                    <p>
                      Total Rows: {importResult.totalRows} | Valid: {importResult.importedCount} | Duplicates Flagged:{' '}
                      {importResult.duplicateCount} | Errors: {importResult.errorCount}
                    </p>
                    {importResult.duplicateWarnings?.length > 0 && (
                      <div className="mt-2 text-amber-300">
                        <p className="font-semibold">Duplicate Warnings:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {importResult.duplicateWarnings.slice(0, 5).map((w: any, idx: number) => (
                            <li key={idx}>
                              Row {w.rowNumber}: &quot;{w.name}&quot; matches {w.duplicateOf}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {importResult.errors?.length > 0 && (
                      <div className="mt-2 text-red-300">
                        <p className="font-semibold">Row Errors:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {importResult.errors.slice(0, 5).map((err: any, idx: number) => (
                            <li key={idx}>
                              Row {err.rowNumber}: {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl font-bold transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !csvInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {importDryRun ? 'Run Validation' : 'Import Contacts'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
