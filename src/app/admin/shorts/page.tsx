'use client'

import React, { useState } from 'react'
import { Clapperboard, Plus, Eye, Trash2, X } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { ShortItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function ShortsAdminPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([
    {
      id: 'sh_1',
      title: 'Famous Choutuppal Friday Cattle & Vegetable Sandha Market Tour',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: PRESET_PHOTO_COVERS[0].url,
      tags: ['Choutuppal', 'Market', 'LocalLife'],
      views: 3410,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: PRESET_PHOTO_COVERS[0].url,
    tags: 'Choutuppal, Reels',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) return

    const newShort: ShortItem = {
      id: `sh_${Date.now()}`,
      title: formData.title,
      videoUrl: formData.videoUrl || 'https://www.youtube.com',
      thumbnailUrl: formData.thumbnailUrl || PRESET_PHOTO_COVERS[0].url,
      tags: formData.tags.split(',').map((t) => t.trim()),
      views: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setShorts([newShort, ...shorts])
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this short?')) {
      setShorts(shorts.filter((s) => s.id !== id))
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shorts.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="relative h-48 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                  👁️ {item.views}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <h4 className="font-semibold text-xs text-white line-clamp-2">{item.title}</h4>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-blue-400 font-medium">{item.tags.join(', ')}</span>
                  <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add Video Short</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video URL (YouTube / MP4)</label>
                <input
                  type="url"
                  required
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
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
                  Save Short
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
