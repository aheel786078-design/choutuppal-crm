'use client'

import React, { useState, useEffect } from 'react'
import {
  Store,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  Send,
  X,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Upload,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { ListingDualPreview } from '@/components/admin/listing-preview-card'
import { Listing, Category, Village } from '@/lib/types'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [categories, setCategories] = useState<Category[]>(STANDARD_CATEGORIES)
  const [villages, setVillages] = useState<Village[]>(STANDARD_VILLAGES)
  const [loading, setLoading] = useState(true)

  // View Mode: 'table' with dedicated photo column or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Search & Filter
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Photo Zoom Lightbox Modal
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null)

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Test WhatsApp Send State
  const [testSendPhone, setTestSendPhone] = useState('')
  const [testSendListing, setTestSendListing] = useState<Listing | null>(null)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    type: 'BUSINESS',
    categoryId: 'cat-automobile',
    villageId: 'v-choutuppal',
    coverImage: PRESET_PHOTO_COVERS[0].url,
    gallery: [PRESET_PHOTO_COVERS[0].url],
    phone: '9848012345',
    whatsapp: '9848012345',
    email: '',
    address: 'Near Main Bus Stand, Choutuppal',
    price: 'Available',
    description: '',
    status: 'APPROVED',
    isFeatured: true,
    isPremium: false,
  })

  const fetchListings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/listings')
      const data = await res.json()
      if (data.success) {
        setListings(data.listings || [])
      }
    } catch (err) {
      console.warn('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({
      title: '',
      type: 'BUSINESS',
      categoryId: 'cat-automobile',
      villageId: 'v-choutuppal',
      coverImage: PRESET_PHOTO_COVERS[0].url,
      gallery: [PRESET_PHOTO_COVERS[0].url],
      phone: '9848012345',
      whatsapp: '9848012345',
      email: '',
      address: 'Main Road, Choutuppal',
      price: 'Available',
      description: '',
      status: 'APPROVED',
      isFeatured: true,
      isPremium: false,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: Listing) => {
    setEditingId(item.id)
    setFormData({
      title: item.title,
      type: item.type,
      categoryId: item.categoryId,
      villageId: item.villageId,
      coverImage: item.coverImage,
      gallery: item.gallery || [item.coverImage],
      phone: item.phone,
      whatsapp: item.whatsapp || item.phone,
      email: item.email || '',
      address: item.address,
      price: item.price || 'Available',
      description: item.description,
      status: item.status,
      isFeatured: item.isFeatured,
      isPremium: item.isPremium,
    })
    setIsModalOpen(true)
  }

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Please enter listing title')
      return
    }

    setIsSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const payload = editingId ? { id: editingId, ...formData } : formData

      const res = await fetch('/api/admin/listings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        setIsModalOpen(false)
        fetchListings()
        setFeedbackMsg({
          text: editingId ? 'Listing & Photo updated in Website & CRM Flow!' : 'Listing created with Photo & synced to Website and WhatsApp CRM!',
          type: 'success',
        })
        setTimeout(() => setFeedbackMsg(null), 5000)
      } else {
        alert(data.error || 'Failed to save listing')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing from Website and CRM?')) return

    try {
      const res = await fetch(`/api/admin/listings?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchListings()
        setFeedbackMsg({ text: 'Listing removed successfully', type: 'success' })
        setTimeout(() => setFeedbackMsg(null), 3000)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleQuickChangePhoto = async (item: Listing, newUrl: string) => {
    try {
      const res = await fetch('/api/admin/listings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          coverImage: newUrl,
          gallery: [newUrl, ...(item.gallery?.filter((g) => g !== newUrl) || [])],
        }),
      })
      const data = await res.json()
      if (data.success) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === item.id ? { ...l, coverImage: newUrl, gallery: [newUrl] } : l,
          ),
        )
        setFeedbackMsg({
          text: `Photo updated for ${item.title.slice(0, 20)}... and synced to WhatsApp Flow!`,
          type: 'success',
        })
        setTimeout(() => setFeedbackMsg(null), 4000)
      }
    } catch (err: any) {
      console.warn(err)
    }
  }

  const handleTriggerTestWhatsApp = (listing: Listing) => {
    setTestSendListing(listing)
    setTestSendPhone(listing.whatsapp || listing.phone || '9848012345')
  }

  const handleExecuteWhatsAppSend = async () => {
    if (!testSendListing || !testSendPhone) return
    setIsSendingWhatsApp(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testSendPhone,
          listingId: testSendListing.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTestSendListing(null)
        setFeedbackMsg({
          text: `Listing Photo Card successfully dispatched to WhatsApp (${testSendPhone})!`,
          type: 'success',
        })
        setTimeout(() => setFeedbackMsg(null), 5000)
      } else {
        alert(data.error || 'WhatsApp send failed')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  // Filtered listings
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.address.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search)
    const matchesCategory = categoryFilter === 'ALL' || item.categoryId === categoryFilter
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage)
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const selectedCategory =
    categories.find((c) => c.id === formData.categoryId || c.slug === formData.categoryId) ||
    categories[0]

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Listings & Businesses Management"
        subtitle="Full directory with dedicated Photo Rows & Galleries — synced live to Website & WhatsApp CRM Flow"
        onRefresh={fetchListings}
        onAddClick={handleOpenCreate}
        addLabel="Add Listing with Photos"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Notification Toast */}
        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-md ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                : 'bg-red-950/80 border-red-800 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters, Search & View Toggle Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search 200+ listings by shop name, phone, or address..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.telugu} ({c.name})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
            </select>

            {/* View Mode Toggle: Table View (with photo row/column) vs Grid View */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View (Dedicated Photo Row)"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Directory Summary Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ImageIcon className="w-4 h-4" />
              <span>{filteredListings.length} Listings Loaded with Photo Cards</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Showing page {currentPage} of {totalPages || 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-slate-800 disabled:opacity-40 text-white rounded text-xs"
            >
              &larr; Prev
            </button>
            <span className="font-mono text-[11px] text-slate-400">{currentPage}/{totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 bg-slate-800 disabled:opacity-40 text-white rounded text-xs"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        {/* LISTINGS CONTAINER */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            Loading listings database...
          </div>
        ) : paginatedListings.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
            No listings found matching your search.
          </div>
        ) : viewMode === 'table' ? (
          /* ============================================================ */
          /* TABLE VIEW WITH DEDICATED PHOTO ROW / COLUMN                 */
          /* ============================================================ */
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th scope="col" className="py-3 px-4 w-32 font-bold text-emerald-400">
                      📸 Photo &amp; Media
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Business Details
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Category &amp; Location
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      Contact Numbers
                    </th>
                    <th scope="col" className="py-3 px-4 font-bold">
                      CRM Flow Status
                    </th>
                    <th scope="col" className="py-3 px-4 text-right font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paginatedListings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-950/40 transition-colors">
                      {/* DEDICATED PHOTO ROW CELL */}
                      <td className="py-3 px-4 align-top">
                        <div className="relative group w-24 h-20 rounded-xl bg-slate-800 overflow-hidden border border-slate-700 shadow shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => setZoomedPhoto({ url: item.coverImage, title: item.title })}
                          />
                          <button
                            type="button"
                            onClick={() => setZoomedPhoto({ url: item.coverImage, title: item.title })}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            title="Click to Zoom Photo"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <span className="absolute bottom-1 right-1 bg-slate-950/90 text-[9px] text-white px-1 rounded font-bold">
                            📸 {item.gallery?.length || 1}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Change Photo
                          </button>
                        </div>
                      </td>

                      {/* Business Details */}
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-xs leading-snug">{item.title}</h4>
                          {item.isFeatured && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/20">
                              Featured
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                          <span>👁️ {item.views} Views</span>
                          <span>💬 {item.whatsappClicks} WA Clicks</span>
                          {item.price && <span className="text-emerald-400 font-semibold">{item.price}</span>}
                        </div>
                      </td>

                      {/* Category & Location */}
                      <td className="py-3 px-4 align-top space-y-1">
                        <span className="inline-block text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {item.categoryName}
                        </span>
                        <p className="text-[11px] text-slate-400 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>{item.address}</span>
                        </p>
                      </td>

                      {/* Contact Numbers */}
                      <td className="py-3 px-4 align-top space-y-1 font-mono">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{item.whatsapp}</span>
                        </div>
                      </td>

                      {/* CRM Flow Status */}
                      <td className="py-3 px-4 align-top space-y-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Photo Card Bound
                        </span>
                        <div className="text-[10px] text-slate-500">
                          Ready for WhatsApp Auto-Dispatch
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right space-y-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTriggerTestWhatsApp(item)}
                            className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-600/30 transition-colors"
                            title="Send Photo Card to WhatsApp"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
                            title="Edit Listing"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteListing(item.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/50 rounded-lg border border-red-900/30"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CARD GRID VIEW                                               */
          /* ============================================================ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedListings.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow hover:border-slate-700 transition-colors flex flex-col"
              >
                {/* Photo Header */}
                <div className="relative h-44 w-full bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setZoomedPhoto({ url: item.coverImage, title: item.title })}
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm text-blue-400 text-[10px] font-semibold px-2 py-0.5 rounded">
                    {item.categoryName}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-slate-950/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-emerald-400" />
                    <span>Photo Attached</span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-white line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">{item.phone}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTriggerTestWhatsApp(item)}
                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-[11px] font-bold border border-emerald-600/30 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Send</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-1 text-red-400 hover:text-red-300 bg-red-950/30 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Pagination Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>Total {filteredListings.length} listings in database</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-900 border border-slate-800 disabled:opacity-40 text-white rounded"
            >
              Previous Page
            </button>
            <span className="font-mono">{currentPage} of {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-slate-900 border border-slate-800 disabled:opacity-40 text-white rounded"
            >
              Next Page
            </button>
          </div>
        </div>
      </div>

      {/* PHOTO LIGHTBOX MODAL */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white truncate">{zoomedPhoto.title}</h4>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-80 sm:h-96 w-full rounded-xl overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dispatched in WhatsApp Bot Flow and Live on choutuppal.in</span>
              <a
                href={zoomedPhoto.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Quality</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH DEDICATED PHOTO ROW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingId ? 'Edit Listing & Photo' : 'Create New Listing with Photos'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Saved data will reflect immediately on choutuppal.in and WhatsApp Bot Flows
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Fields (Left 7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Listing / Business Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Sri Sai Ram Automobiles & Multi-Brand Garage"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category & Village */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.telugu} ({c.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Village / Location
                    </label>
                    <select
                      value={formData.villageId}
                      onChange={(e) => setFormData({ ...formData, villageId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      {villages.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DEDICATED PHOTO ROW */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>📸 Cover Photo URL (Flow &amp; Website Delivery) *</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Image will appear in WhatsApp card</span>
                  </div>
                  <input
                    type="url"
                    required
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono"
                  />
                  {/* Preset Photo Row */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block mb-1">Quick Select High-Res Cover:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRESET_PHOTO_COVERS.slice(0, 4).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                          className={`h-10 rounded border overflow-hidden relative text-left transition-all ${
                            formData.coverImage === preset.url
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phone & WhatsApp */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Calling Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="98480XXXXX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="98480XXXXX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Address & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Beside Bus Stand, Choutuppal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Price / Rates
                    </label>
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g. ₹500 onwards / Available"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Business Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide services, offerings..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6 pt-1 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.status === 'APPROVED'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.checked ? 'APPROVED' : 'PENDING',
                        })
                      }
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Approved &amp; Published</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) =>
                        setFormData({ ...formData, isFeatured: e.target.checked })
                      }
                      className="rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span>Featured in WhatsApp Bot</span>
                  </label>
                </div>
              </div>

              {/* Real-time Dual Preview on Right (Right 5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <ListingDualPreview
                  title={formData.title}
                  categoryName={selectedCategory.name}
                  teluguCategory={selectedCategory.telugu}
                  description={formData.description}
                  coverImage={formData.coverImage}
                  phone={formData.phone}
                  whatsapp={formData.whatsapp}
                  address={formData.address}
                  price={formData.price}
                  isFeatured={formData.isFeatured}
                  onSelectPreset={(url) => setFormData({ ...formData, coverImage: url })}
                />
              </div>

              {/* Submit Buttons */}
              <div className="lg:col-span-12 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Syncing Photo & Details...' : 'Save & Sync Photo to Flow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST SEND WHATSAPP POPUP */}
      {testSendListing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Test Send Photo Card to WhatsApp</h3>
              </div>
              <button
                onClick={() => setTestSendListing(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={testSendListing.coverImage}
                  alt={testSendListing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h5 className="font-semibold text-xs text-white truncate">{testSendListing.title}</h5>
                <p className="text-[10px] text-emerald-400">Photo Card will be delivered in chat</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recipient WhatsApp Number
              </label>
              <input
                type="tel"
                value={testSendPhone}
                onChange={(e) => setTestSendPhone(e.target.value)}
                placeholder="9848012345"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestSendListing(null)}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp}
                onClick={handleExecuteWhatsAppSend}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingWhatsApp ? 'Sending...' : 'Send Photo Card'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
