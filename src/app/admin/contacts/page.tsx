'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Contact,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Tag,
  ArrowRight,
  MessageSquare,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Briefcase,
  ExternalLink,
  AlertTriangle,
  FileText,
  Upload,
  Copy,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { CRMContact } from '@/lib/types'

const STAGES = [
  { key: 'ALL', label: 'All Stages' },
  { key: 'NEW_LEAD', label: 'New Lead' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'PROPOSAL', label: 'Proposal' },
  { key: 'WON', label: 'Won' },
  { key: 'LOST', label: 'Lost' },
]

export default function ContactsAdminPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('search')
      return p ? p.trim() : ''
    }
    return ''
  })
  const [stageFilter, setStageFilter] = useState('ALL')
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Modals & Feedback
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Duplicate Contact Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    warning: string
    existingContact: {
      id: string
      name: string
      maskedPhone: string
      stage: string
      matchType?: string
    }
  } | null>(null)

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [csvContent, setCsvContent] = useState('')
  const [csvResult, setCsvResult] = useState<any | null>(null)
  const [isCsvImporting, setIsCsvImporting] = useState(false)

  // Form State (New Contact)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    stage: 'NEW_LEAD' as CRMContact['stage'],
    tags: 'Lead',
    notes: '',
  })

  // Edit Form State (Existing Contact)
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    stage: 'NEW_LEAD' as CRMContact['stage'],
    tags: '',
    notes: '',
  })

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/crm/contacts')
      const data = await res.json()
      if (data.success && Array.isArray(data.contacts)) {
        setContacts(data.contacts)
      }
    } catch (err: any) {
      console.warn('Failed to fetch contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const handleCreateContact = async (e?: React.FormEvent, allowDuplicate = false) => {
    if (e) e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) return

    try {
      setSaving(true)
      const tagsArray = formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          stage: formData.stage,
          tags: tagsArray.length > 0 ? tagsArray : ['Lead'],
          notes: formData.notes.trim(),
          territoryId: selectedTerritoryId !== 'all' ? selectedTerritoryId : undefined,
          allowDuplicate,
        }),
      })

      const data = await res.json()
      if (res.status === 409 || data.duplicateDetected) {
        setDuplicateWarning({
          warning: data.warning || 'A contact with this phone number already exists.',
          existingContact: data.existingContact,
        })
        return
      }

      if (data.success && data.contact) {
        showToast(
          data.wasDuplicateOverridden
            ? 'Contact created with duplicate override!'
            : 'Contact created successfully!'
        )
        setShowAddModal(false)
        setDuplicateWarning(null)
        setFormData({ name: '', phone: '', email: '', stage: 'NEW_LEAD', tags: 'Lead', notes: '' })
        fetchContacts()
      } else {
        showToast(data.error || 'Failed to create contact', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Network error creating contact', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleProcessCsvImport = async (allowDuplicates = false) => {
    if (!csvContent.trim()) {
      showToast('Please paste valid CSV content.', 'error')
      return
    }

    try {
      setIsCsvImporting(true)
      const res = await fetch('/api/crm/contacts/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvContent.trim(),
          allowDuplicates,
          territoryId: selectedTerritoryId !== 'all' ? selectedTerritoryId : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCsvResult(data)
        fetchContacts()
        showToast(data.message || `CSV imported successfully!`)
      } else {
        showToast(data.error || 'Failed to import CSV.', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error importing CSV', 'error')
    } finally {
      setIsCsvImporting(false)
    }
  }

  const handleUpdateStage = async (id: string, newStage: CRMContact['stage']) => {
    try {
      // Optimistic update
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, stage: newStage } : c)))
      const res = await fetch('/api/crm/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Stage updated to ${newStage}`)
      } else {
        showToast(data.error || 'Failed to update stage', 'error')
        fetchContacts()
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating stage', 'error')
      fetchContacts()
    }
  }

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete contact "${name}"?`)) return

    try {
      const res = await fetch(`/api/crm/contacts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        showToast('Contact deleted successfully')
        setContacts((prev) => prev.filter((c) => c.id !== id))
        if (selectedContact?.id === id) {
          setSelectedContact(null)
        }
      } else {
        showToast(data.error || 'Failed to delete contact', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting contact', 'error')
    }
  }

  const openDetailModal = (contact: CRMContact) => {
    setSelectedContact(contact)
    setEditFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      stage: contact.stage,
      tags: Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
      notes: contact.notes || '',
    })
  }

  const handleUpdateContactDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContact) return
    if (!editFormData.name.trim() || !editFormData.phone.trim()) {
      showToast('Name and phone are required', 'error')
      return
    }

    try {
      setSaving(true)
      const tagsArray = editFormData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      const res = await fetch('/api/crm/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedContact.id,
          name: editFormData.name.trim(),
          phone: editFormData.phone.trim(),
          email: editFormData.email.trim(),
          stage: editFormData.stage,
          tags: tagsArray.length > 0 ? tagsArray : ['Lead'],
          notes: editFormData.notes.trim(),
        }),
      })
      const data = await res.json()
      if (data.success && data.contact) {
        showToast('Contact updated successfully!')
        setContacts((prev) => prev.map((c) => (c.id === selectedContact.id ? data.contact : c)))
        setSelectedContact(null)
      } else {
        showToast(data.error || 'Failed to update contact', 'error')
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating contact', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Filtered Contacts
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.tags && c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))

    const matchesStage = stageFilter === 'ALL' || c.stage === stageFilter

    const matchesTerritory =
      selectedTerritoryId === 'all' ||
      c.territoryId === selectedTerritoryId ||
      (!c.territoryId && selectedTerritoryId === 'territory_choutuppal')

    return matchesSearch && matchesStage && matchesTerritory
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="CRM Contacts & Inbound Leads"
        subtitle="Merchants and customer leads auto-synced from Choutuppal listings and WhatsApp bot"
        onRefresh={fetchContacts}
        onAddClick={() => setShowAddModal(true)}
        addLabel="Add Contact"
        selectedTerritoryId={selectedTerritoryId}
        onTerritoryChange={(tId) => {
          setSelectedTerritoryId(tId)
          setCurrentPage(1)
        }}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Toast Feedback */}
        {toastMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border-red-800 text-red-300'
            }`}
          >
            <span>{toastMsg.text}</span>
            <button onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search contacts by name, phone, tag, email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key} className="bg-slate-900 text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Showing {filtered.length} of {contacts.length}
            </span>

            <button
              type="button"
              onClick={() => {
                setCsvContent('')
                setCsvResult(null)
                setShowCsvModal(true)
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        {/* Contacts Table / List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading contacts...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No contacts found matching your search or filters.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {paginated.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors"
                >
                  <div
                    onClick={() => openDetailModal(c)}
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
                    title="Click to view & edit contact details"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600/20 to-teal-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/30 shadow-inner group-hover:border-emerald-400 transition-colors">
                      {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-white truncate group-hover:text-blue-300 transition-colors">
                          {c.name}
                        </h4>
                        {c.listingTitle && (
                          <span className="text-[10px] text-blue-400/90 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 truncate max-w-[180px]">
                            {c.listingTitle}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 font-sans text-slate-400 truncate">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {c.email}
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-[10px] text-slate-500 truncate max-w-lg">{c.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-1">
                      {c.tags &&
                        c.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium border border-slate-700/60"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>

                    {/* Quick Stage Changer */}
                    <select
                      value={c.stage}
                      onChange={(e) => handleUpdateStage(c.id, e.target.value as any)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        c.stage === 'WON'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : c.stage === 'NEW_LEAD'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : c.stage === 'LOST'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <option value="NEW_LEAD" className="bg-slate-900 text-white">NEW LEAD</option>
                      <option value="CONTACTED" className="bg-slate-900 text-white">CONTACTED</option>
                      <option value="QUALIFIED" className="bg-slate-900 text-white">QUALIFIED</option>
                      <option value="PROPOSAL" className="bg-slate-900 text-white">PROPOSAL</option>
                      <option value="WON" className="bg-slate-900 text-white">WON (MERCHANT)</option>
                      <option value="LOST" className="bg-slate-900 text-white">LOST</option>
                    </select>

                    {/* Edit Details */}
                    <button
                      onClick={() => openDetailModal(c)}
                      className="p-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20 transition-colors"
                      title="View & Edit Contact Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Open WhatsApp Chat */}
                    <Link
                      href={`/admin/inbox?phone=${encodeURIComponent(c.phone)}`}
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
                      title="Open WhatsApp Inbox Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>

                    {/* View Deals */}
                    <Link
                      href={`/admin/pipelines?search=${encodeURIComponent(c.phone)}`}
                      className="p-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-lg border border-purple-500/20 transition-colors"
                      title="View in Pipeline Deals"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                    </Link>

                    {/* Delete Contact */}
                    <button
                      onClick={() => handleDeleteContact(c.id, c.name)}
                      className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1 border border-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1 border border-slate-700"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Add New CRM Contact</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              {/* Duplicate Contact Warning Banner */}
              {duplicateWarning && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-start gap-2 text-amber-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-200">Duplicate Contact Detected</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-300/90">
                        {duplicateWarning.warning}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-500/20 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-white">{duplicateWarning.existingContact.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px]">
                        {duplicateWarning.existingContact.stage}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      Phone: {duplicateWarning.existingContact.maskedPhone}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const match = contacts.find((c) => c.id === duplicateWarning.existingContact.id)
                        if (match) {
                          setShowAddModal(false)
                          setDuplicateWarning(null)
                          openDetailModal(match)
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700"
                    >
                      View Existing Contact
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleCreateContact(undefined, true)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow"
                    >
                      {saving ? 'Creating...' : 'Override & Proceed Anyway'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name / Business Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar (Sri Sai Auto)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value })
                      setDuplicateWarning(null)
                    }}
                    placeholder="9848012345"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pipeline Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="NEW_LEAD">NEW LEAD</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="WON">WON (MERCHANT)</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="merchant@choutuppal.in"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Merchant, Health & Medical, Verified"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contact notes, deal details, or follow-up summary..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{saving ? 'Creating...' : 'Create Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail & Edit Modal */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-600/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30">
                  {selectedContact.name ? selectedContact.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Contact Details &amp; Edit</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedContact.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Linkage Action Bar */}
            <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/admin/inbox?phone=${encodeURIComponent(selectedContact.phone)}`}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Chat</span>
              </Link>

              <Link
                href={`/admin/pipelines?search=${encodeURIComponent(selectedContact.phone)}`}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-500/30 transition"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>View Deals</span>
              </Link>

              {selectedContact.listingTitle && (
                <Link
                  href={`/admin/listings?search=${encodeURIComponent(selectedContact.listingTitle)}`}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/30 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Linked Listing</span>
                </Link>
              )}
            </div>

            <form onSubmit={handleUpdateContactDetails} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CRM Stage</label>
                  <select
                    value={editFormData.stage}
                    onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="NEW_LEAD">NEW LEAD</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="WON">WON (MERCHANT)</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Internal Notes</label>
                <textarea
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Readonly Metadata */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>Territory:</span>
                  <span className="text-white">{selectedContact.territoryId || 'territory_choutuppal'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Inbound/Outbound Messages:</span>
                  <span className="text-white">{selectedContact.messageCount ?? 0}</span>
                </div>
                {selectedContact.createdAt && (
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="text-slate-300">{new Date(selectedContact.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {selectedContact.lastContactAt && (
                  <div className="flex justify-between">
                    <span>Last Activity:</span>
                    <span className="text-slate-300">{new Date(selectedContact.lastContactAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteContact(selectedContact.id, selectedContact.name)}
                  className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg text-xs font-semibold border border-rose-500/20 flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedContact(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{saving ? 'Saving...' : 'Save Updates'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Import CRM Contacts from CSV</h3>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false)
                  setCsvResult(null)
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Paste CSV Rows</label>
                <button
                  type="button"
                  onClick={() =>
                    setCsvContent(
                      `Name, Phone, Email, Stage, Tags, Notes\n` +
                      `Srinivas Motors, 9848011223, srini@auto.in, NEW_LEAD, Auto;Dealer, Highway Cross\n` +
                      `Laxmi Kirana, 9494022334, laxmi@kirana.in, CONTACTED, Retail;Groceries, Bus Stand\n` +
                      `Ramesh Dairy, 9848011223, duplicate@test.com, NEW_LEAD, Dairy, Sample Dup`
                    )
                  }
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" /> Insert Sample CSV
                </button>
              </div>

              <textarea
                rows={5}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value)
                  setCsvResult(null)
                }}
                placeholder="Format: Name, Phone, Email, Stage, Tags, Notes (Header row optional)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Supports standard 10-digit Indian numbers, +91, 91, or leading 0s. Duplicates against existing database contacts are automatically isolated.
              </p>
            </div>

            {/* Analysis & Breakdown Results */}
            {csvResult && (
              <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-emerald-400 font-semibold">Valid Unique</p>
                    <p className="text-xl font-bold text-white mt-0.5">{csvResult.validCount || 0}</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-amber-400 font-semibold">Duplicates Detected</p>
                    <p className="text-xl font-bold text-white mt-0.5">{csvResult.duplicateCount || 0}</p>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-rose-400 font-semibold">Invalid Rows</p>
                    <p className="text-xl font-bold text-white mt-0.5">{csvResult.invalidCount || 0}</p>
                  </div>
                </div>

                {/* Duplicates breakdown list */}
                {csvResult.duplicateRows?.length > 0 && (
                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Duplicate Rows Flagged:
                    </p>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-[11px]">
                      {csvResult.duplicateRows.map((dup: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1 rounded text-slate-300"
                        >
                          <span>
                            Row {dup.rowNumber}: <strong className="text-white">{dup.name}</strong> ({dup.maskedPhone || dup.phone})
                          </span>
                          <span className="text-amber-400 text-[10px] font-mono">
                            {dup.matchType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalids breakdown list */}
                {csvResult.invalidRows?.length > 0 && (
                  <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Invalid Rows Rejected:
                    </p>
                    <div className="max-h-28 overflow-y-auto space-y-1 text-[11px]">
                      {csvResult.invalidRows.map((inv: any, i: number) => (
                        <div
                          key={i}
                          className="bg-slate-950/80 px-2.5 py-1 rounded text-slate-300 flex items-center justify-between"
                        >
                          <span className="truncate max-w-[70%]">
                            Row {inv.rowNumber}: &quot;{inv.rawText}&quot;
                          </span>
                          <span className="text-rose-400 text-[10px]">{inv.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowCsvModal(false)
                  setCsvResult(null)
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {!csvResult ? (
                  <button
                    type="button"
                    disabled={isCsvImporting || !csvContent.trim()}
                    onClick={() => handleProcessCsvImport(false)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isCsvImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>{isCsvImporting ? 'Processing...' : 'Analyze & Import Unique'}</span>
                  </button>
                ) : (
                  <>
                    {csvResult.duplicateCount > 0 && (
                      <button
                        type="button"
                        disabled={isCsvImporting}
                        onClick={() => handleProcessCsvImport(true)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-50"
                      >
                        {isCsvImporting ? 'Importing...' : `Import All (Include Duplicates)`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCsvModal(false)
                        setCsvResult(null)
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Done
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
