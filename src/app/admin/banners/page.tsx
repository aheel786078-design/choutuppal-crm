'use client'

import React, { useState, useEffect } from 'react'
import { Image as ImageIcon, Plus, Eye, Trash2, X, ExternalLink, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { BannerItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: PRESET_PHOTO_COVERS[5].url,
    linkUrl: '',
    type: 'TOP_BANNER' as const,
  })

  const fetchBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (data.success) {
        setBanners(data.banners || [])
      } else {
        setError(data.error || 'Failed to load banners')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching banners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'banner',
          action: 'create',
          item: {
            title: formData.title.trim(),
            imageUrl: formData.imageUrl.trim(),
            linkUrl: formData.linkUrl.trim(),
            type: formData.type,
            isActive: true,
            clicks: 0,
            impressions: 0,
            startDate: new Date().toISOString(),
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionMsg('Banner created and saved successfully!')
        setTimeout(() => setActionMsg(null), 3000)
        setIsModalOpen(false)
        setFormData({
          title: '',
          imageUrl: PRESET_PHOTO_COVERS[5].url,
          linkUrl: '',
          type: 'TOP_BANNER',
        })
        fetchBanners()
      } else {
        setError(data.error || 'Failed to save banner')
      }
    } catch (err: any) {
      setError(err.message || 'Network error saving banner')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'banner', id, action: 'toggle' }),
      })
      const data = await res.json()
      if (data.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
        )
      } else {
        setError(data.error || 'Failed to toggle status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error toggling status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'banner', id, action: 'delete' }),
      })
      const data = await res.json()
      if (data.success) {
        setBanners((prev) => prev.filter((b) => b.id !== id))
        setActionMsg('Banner deleted successfully.')
        setTimeout(() => setActionMsg(null), 3000)
      } else {
        setError(data.error || 'Failed to delete banner')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting banner')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Banners & Featured Stories"
        subtitle="Manage promotional banners, hero sliders and featured story promotions"
        onAddClick={() => setIsModalOpen(true)}
        addLabel="Add Banner"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {actionMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionMsg}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{error}</span>
            </div>
            <button onClick={fetchBanners} className="underline hover:text-white text-[11px]">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">Loading persisted banners...</span>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center p-16 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No Banners Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Promotional banners display on the homepage carousel and category headers.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg"
            >
              Create First Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
                <div className="relative h-44 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    {item.type}
                  </span>
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold shadow flex items-center gap-1 ${
                      item.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                  {item.linkUrl && (
                    <p className="text-[11px] text-blue-400 truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>{item.linkUrl}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Clicks: {item.clicks || 0} • Impr: {item.impressions || 0}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Banner Ad</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Promotional banner headline"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="TOP_BANNER">Top Carousel Banner</option>
                  <option value="POPUP">Popup Welcome Ad</option>
                  <option value="STORY">Featured Story Card</option>
                  <option value="IN_FEED">In-Feed Native Ad</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination URL</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/business/... or https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{saving ? 'Saving...' : 'Save Banner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

