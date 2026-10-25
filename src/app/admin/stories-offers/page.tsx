'use client'

import React, { useState, useEffect } from 'react'
import {
  Flame,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Tag,
  Store,
  Phone,
  ExternalLink,
  Send,
  X,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { UserStory, UserOffer } from '@/lib/types'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export default function StoriesOffersPage() {
  const [activeTab, setActiveTab] = useState<'stories' | 'offers'>('stories')
  const [stories, setStories] = useState<UserStory[]>([
    {
      id: 'st_1',
      businessId: 'lst_1',
      businessName: 'Sri Sai Ram Automobiles',
      ownerPhone: '9848012345',
      mediaUrl: PRESET_PHOTO_COVERS[5].url,
      caption: 'Weekend Monsoon Free Oil Checkup & Computer Wheel Alignment camp at Choutuppal bypass!',
      status: 'published',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ])

  const [offers, setOffers] = useState<UserOffer[]>([
    {
      id: 'off_1',
      businessId: 'lst_2',
      businessName: 'Yadadri Mega Township',
      ownerPhone: '9848099887',
      title: 'Highway Plots Spot Registration ₹50,000 Cash Discount',
      discount: '₹50,000 Off',
      imageUrl: PRESET_PHOTO_COVERS[4].url,
      terms: 'Applicable for 200 sq.yards and above. Valid till Sunday.',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      status: 'published',
      createdAt: new Date().toISOString(),
    },
  ])

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [storyForm, setStoryForm] = useState({
    businessName: '',
    ownerPhone: '9848012345',
    caption: '',
    mediaUrl: PRESET_PHOTO_COVERS[0].url,
  })

  const handleAddStory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!storyForm.caption) return

    const newStory: UserStory = {
      id: `st_${Date.now()}`,
      businessId: 'lst_user',
      businessName: storyForm.businessName || 'Choutuppal Merchant',
      ownerPhone: storyForm.ownerPhone,
      mediaUrl: storyForm.mediaUrl,
      caption: storyForm.caption,
      status: 'published',
      expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      createdAt: new Date().toISOString(),
    }
    setStories([newStory, ...stories])
    setIsStoryModalOpen(false)
  }

  const handleDeleteStory = (id: string) => {
    setStories(stories.filter((s) => s.id !== id))
  }

  const handleDeleteOffer = (id: string) => {
    setOffers(offers.filter((o) => o.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Stories & Promotional Offers Hub"
        subtitle="Manage user-submitted stories with media and promotional offers with automatic expiry"
        onAddClick={() => setIsStoryModalOpen(true)}
        addLabel="Add Story / Promo"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Toggle Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'stories' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Active Stories ({stories.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'offers' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Promotional Offers ({offers.length})</span>
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Auto-expiring queue active (24h–7d)
          </span>
        </div>

        {activeTab === 'stories' ? (
          /* STORIES GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {stories.map((st) => (
              <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
                <div className="relative h-64 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={st.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    LIVE STORY
                  </span>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm p-2 rounded-lg text-white text-xs">
                    <p className="line-clamp-2">{st.caption}</p>
                  </div>
                </div>

                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-white">{st.businessName}</h5>
                    <span className="text-[10px] text-emerald-400 font-mono">{st.ownerPhone}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Expires tomorrow
                    </span>
                    <button
                      onClick={() => handleDeleteStory(st.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* OFFERS GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {offers.map((off) => (
              <div key={off.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 shadow">
                {off.imageUrl && (
                  <div className="w-28 h-28 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={off.imageUrl} alt={off.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
                        {off.discount}
                      </span>
                      <h4 className="font-bold text-xs text-white truncate">{off.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{off.terms}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                    <span>{off.businessName}</span>
                    <button onClick={() => handleDeleteOffer(off.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE STORY MODAL */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Post Business Story</h3>
              <button onClick={() => setIsStoryModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddStory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={storyForm.businessName}
                  onChange={(e) => setStoryForm({ ...storyForm, businessName: e.target.value })}
                  placeholder="e.g. Sri Sai Ram Automobiles"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Story Media URL (Photo)</label>
                <input
                  type="url"
                  required
                  value={storyForm.mediaUrl}
                  onChange={(e) => setStoryForm({ ...storyForm, mediaUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Story Caption / Announcement</label>
                <textarea
                  rows={2}
                  required
                  value={storyForm.caption}
                  onChange={(e) => setStoryForm({ ...storyForm, caption: e.target.value })}
                  placeholder="Special weekend offer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-xs font-bold"
                >
                  Publish Story (24h)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
