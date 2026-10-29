'use client'

import React, { useState, useEffect } from 'react'
import {
  Newspaper,
  Plus,
  Search,
  Eye,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { NewsItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function NewsAdminPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    teluguTitle: '',
    summary: '',
    content: '',
    coverImage: PRESET_PHOTO_COVERS[6].url,
    category: 'Local News',
    isPublished: true,
  })

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (data.success) {
        setNewsList(data.news || [])
      } else {
        setError(data.error || 'Failed to load news articles')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({
      title: '',
      teluguTitle: '',
      summary: '',
      content: '',
      coverImage: PRESET_PHOTO_COVERS[6].url,
      category: 'Local News',
      isPublished: true,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: NewsItem) => {
    setEditingId(item.id)
    setFormData({
      title: item.title,
      teluguTitle: item.teluguTitle || '',
      summary: item.summary || '',
      content: item.content || '',
      coverImage: item.coverImage || PRESET_PHOTO_COVERS[6].url,
      category: item.category || 'Local News',
      isPublished: item.isPublished !== false,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    try {
      setSaving(true)
      setError(null)

      const payload = {
        type: 'news',
        action: editingId ? 'update' : 'create',
        id: editingId || undefined,
        item: {
          ...(editingId ? { id: editingId } : {}),
          title: formData.title.trim(),
          teluguTitle: formData.teluguTitle.trim(),
          summary: formData.summary.trim(),
          content: formData.content.trim(),
          coverImage: formData.coverImage.trim(),
          category: formData.category,
          isPublished: formData.isPublished,
          slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        },
      }

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setActionMsg(editingId ? 'News article updated successfully!' : 'News article published successfully!')
        setTimeout(() => setActionMsg(null), 3000)
        setIsModalOpen(false)
        fetchNews()
      } else {
        setError(data.error || 'Failed to save news article')
      }
    } catch (err: any) {
      setError(err.message || 'Network error saving article')
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
        body: JSON.stringify({ type: 'news', id, action: 'toggle' }),
      })
      const data = await res.json()
      if (data.success) {
        setNewsList((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isPublished: !n.isPublished } : n))
        )
      } else {
        setError(data.error || 'Failed to toggle status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error toggling status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news article?')) return
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'news', id, action: 'delete' }),
      })
      const data = await res.json()
      if (data.success) {
        setNewsList((prev) => prev.filter((n) => n.id !== id))
        setActionMsg('News article deleted successfully.')
        setTimeout(() => setActionMsg(null), 3000)
      } else {
        setError(data.error || 'Failed to delete news article')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting article')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="News & Articles Manager"
        subtitle="Publish local news in Telugu & English for Choutuppal portal and WhatsApp news digest"
        onAddClick={handleOpenCreate}
        addLabel="Add News Article"
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
            <button onClick={fetchNews} className="underline hover:text-white text-[11px]">Retry</button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Articles ({newsList.length})</h3>
            <span className="text-[11px] text-slate-500">Synced to web portal and news digest</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-14 text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Loading articles...</span>
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No news articles found. Click "Add News Article" to publish one.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {newsList.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            item.isPublished !== false
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.isPublished !== false ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {item.teluguTitle && (
                        <p className="text-[11px] text-blue-400 truncate">{item.teluguTitle}</p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {item.category} • 👁️ {item.views || 0} Views
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white"
                      title="Toggle publish status"
                    >
                      {item.isPublished !== false ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-blue-400 hover:text-blue-300 rounded bg-blue-950/30"
                      title="Edit article"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded bg-red-950/30"
                      title="Delete article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">{editingId ? 'Edit News Article' : 'Add News Article'}</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">English Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telugu Headline</label>
                <input
                  type="text"
                  value={formData.teluguTitle}
                  onChange={(e) => setFormData({ ...formData, teluguTitle: e.target.value })}
                  placeholder="వార్త శీర్షిక..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Short Summary</label>
                <textarea
                  rows={2}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
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
                  <span>{editingId ? (saving ? 'Updating...' : 'Update Article') : (saving ? 'Publishing...' : 'Publish Article')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
