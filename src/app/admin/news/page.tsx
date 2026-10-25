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
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { NewsItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function NewsAdminPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([
    {
      id: 'news_1',
      slug: 'choutuppal-bypass-expansion-works-speed-up',
      title: 'Choutuppal National Highway Bypass Expansion Works Accelerated',
      teluguTitle: 'చౌటుప్పల్ బైపాస్ రోడ్డు విస్తరణ పనులు ముమ్మరం',
      summary: 'NH-65 widening works between Choutuppal and Panthangi underway to reduce traffic congestion.',
      content: 'The National Highways Authority of India (NHAI) has sped up 6-lane road expansion works near Choutuppal town...',
      coverImage: PRESET_PHOTO_COVERS[6].url,
      category: 'Development',
      isPublished: true,
      views: 1250,
      createdAt: new Date().toISOString(),
    },
  ])

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) return

    if (editingId) {
      setNewsList((prev) =>
        prev.map((n) => (n.id === editingId ? { ...n, ...formData } : n)),
      )
    } else {
      const newItem: NewsItem = {
        id: `news_${Date.now()}`,
        slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ...formData,
        views: 0,
        createdAt: new Date().toISOString(),
      }
      setNewsList((prev) => [newItem, ...prev])
    }
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this news article?')) {
      setNewsList((prev) => prev.filter((n) => n.id !== id))
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-white">Articles ({newsList.length})</h3>
          </div>

          <div className="divide-y divide-slate-800">
            {newsList.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-14 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                    {item.teluguTitle && (
                      <p className="text-[11px] text-blue-400 truncate">{item.teluguTitle}</p>
                    )}
                    <p className="text-[10px] text-slate-500">
                      {item.category} • 👁️ {item.views} Views
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add News Article</h3>
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
