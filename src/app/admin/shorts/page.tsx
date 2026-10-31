'use client'

import React, { useState, useEffect } from 'react'
import { Clapperboard, Plus, Eye, Trash2, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { ShortItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function ShortsAdminPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: PRESET_PHOTO_COVERS[0].url,
    tags: 'Choutuppal, Reels',
  })

  const fetchShorts = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (data.success) {
        setShorts(data.shorts || [])
      } else {
        setError(data.error || 'Failed to load video shorts')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching video shorts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShorts()
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
          type: 'short',
          action: 'create',
          item: {
            title: formData.title.trim(),
            videoUrl: formData.videoUrl.trim() || 'https://www.youtube.com',
            thumbnailUrl: formData.thumbnailUrl || PRESET_PHOTO_COVERS[0].url,
            tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
            isActive: true,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsModalOpen(false)
        setFormData({
          title: '',
          videoUrl: '',
          thumbnailUrl: PRESET_PHOTO_COVERS[0].url,
          tags: 'Choutuppal, Reels',
        })
        fetchShorts()
      } else {
        setError(data.error || 'Failed to save video short')
      }
    } catch (err: any) {
      setError(err.message || 'Network error saving video short')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this short?')) return

    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'short',
          action: 'delete',
          id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchShorts()
      } else {
        setError(data.error || 'Failed to delete video short')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting video short')
    }
  }

  const handleToggle = async (id: string) => {
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'short',
          action: 'toggle',
          id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        fetchShorts()
      } else {
        setError(data.error || 'Failed to toggle status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error toggling status')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Video Shorts & Reels Manager"
        subtitle="Manage vertical video shorts and community videos"
        onAddClick={() => setIsModalOpen(true)}
        addLabel="Add Video Short"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-sm">Loading video shorts...</span>
          </div>
        ) : shorts.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs text-slate-900 p-8 text-center text-slate-500">
            <Clapperboard className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No video shorts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shorts.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs text-slate-900 overflow-hidden shadow">
                <div className="relative h-48 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    👁️ {item.views || 0}
                  </span>
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.isActive ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Hidden'}
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <h4 className="font-semibold text-xs text-slate-900 line-clamp-2">{item.title}</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-emerald-700 font-medium">
                      {Array.isArray(item.tags) ? item.tags.join(', ') : 'Reels'}
                    </span>
                    <button onClick={() => handleDelete(item.id)} className="text-rose-600 hover:text-rose-700 p-1">
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
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs text-slate-900 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Video Short</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-900" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Video URL (YouTube / MP4)</label>
                <input
                  type="url"
                  required
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  {saving ? 'Saving...' : 'Save Short'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
