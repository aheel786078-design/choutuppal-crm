'use client'

import React, { useState } from 'react'
import { Image as ImageIcon, Plus, Eye, Trash2, X, ExternalLink } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { BannerItem } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<BannerItem[]>([
    {
      id: 'ban_1',
      title: 'Sri Sai Ram Automobiles — Festive Service Offer 20% Off',
      imageUrl: PRESET_PHOTO_COVERS[5].url,
      linkUrl: '/business/sri-sai-ram-automobiles-choutuppal',
      type: 'TOP_BANNER',
      isActive: true,
      clicks: 145,
      impressions: 2890,
      startDate: new Date().toISOString(),
    },
    {
      id: 'ban_2',
      title: 'Yadadri Mega Township Open Plots Launch Offer',
      imageUrl: PRESET_PHOTO_COVERS[4].url,
      linkUrl: '/business/yadadri-open-plots-choutuppal-highway',
      type: 'POPUP',
      isActive: true,
      clicks: 89,
      impressions: 1420,
      startDate: new Date().toISOString(),
    },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: PRESET_PHOTO_COVERS[5].url,
    linkUrl: '',
    type: 'TOP_BANNER' as const,
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title) return

    const newBanner: BannerItem = {
      id: `ban_${Date.now()}`,
      ...formData,
      isActive: true,
      clicks: 0,
      impressions: 0,
      startDate: new Date().toISOString(),
    }
    setBanners([newBanner, ...banners])
    setIsModalOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this banner?')) {
      setBanners(banners.filter((b) => b.id !== id))
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <div className="relative h-44 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {item.type}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Clicks: {item.clicks} • Impr: {item.impressions}</span>
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
              <h3 className="text-sm font-bold text-white">Create Banner Ad</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destination URL</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/business/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
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
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
