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
import { Loader2, AlertCircle } from 'lucide-react'

export default function StoriesOffersPage() {
  const [activeTab, setActiveTab] = useState<'stories' | 'offers'>('stories')
  const [stories, setStories] = useState<UserStory[]>([])
  const [offers, setOffers] = useState<UserOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [storyForm, setStoryForm] = useState({
    businessName: '',
    ownerPhone: '9848012345',
    caption: '',
    mediaUrl: PRESET_PHOTO_COVERS[0].url,
  })

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false)
  const [offerForm, setOfferForm] = useState({
    businessName: '',
    ownerPhone: '9848012345',
    title: '',
    discount: '20% Off',
    terms: '',
    imageUrl: PRESET_PHOTO_COVERS[4].url,
    endDateDays: 7,
  })

  const fetchContent = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (data.success) {
        setStories(data.stories || [])
        setOffers(data.offers || [])
      } else {
        setError(data.error || 'Failed to load content')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [])

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storyForm.caption.trim()) return

    try {
      setSaving(true)
      setError(null)
      const newStoryPayload = {
        businessId: 'lst_user',
        businessName: storyForm.businessName.trim() || 'Choutuppal Merchant',
        ownerPhone: storyForm.ownerPhone.trim(),
        mediaUrl: storyForm.mediaUrl.trim(),
        caption: storyForm.caption.trim(),
        status: 'published',
        expiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      }

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'story', action: 'create', item: newStoryPayload }),
      })
      const data = await res.json()
      if (data.success) {
        setActionMsg('Story published live for 24-48 hours!')
        setTimeout(() => setActionMsg(null), 3000)
        setIsStoryModalOpen(false)
        setStoryForm({
          businessName: '',
          ownerPhone: '9848012345',
          caption: '',
          mediaUrl: PRESET_PHOTO_COVERS[0].url,
        })
        fetchContent()
      } else {
        setError(data.error || 'Failed to publish story')
      }
    } catch (err: any) {
      setError(err.message || 'Network error publishing story')
    } finally {
      setSaving(false)
    }
  }

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerForm.title.trim()) return

    try {
      setSaving(true)
      setError(null)
      const newOfferPayload = {
        businessId: 'lst_user',
        businessName: offerForm.businessName.trim() || 'Local Merchant',
        ownerPhone: offerForm.ownerPhone.trim(),
        title: offerForm.title.trim(),
        discount: offerForm.discount.trim(),
        terms: offerForm.terms.trim() || 'Terms & Conditions apply.',
        imageUrl: offerForm.imageUrl.trim(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * (offerForm.endDateDays || 7)).toISOString(),
        status: 'published',
      }

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', action: 'create', item: newOfferPayload }),
      })
      const data = await res.json()
      if (data.success) {
        setActionMsg('Promotional offer created successfully!')
        setTimeout(() => setActionMsg(null), 3000)
        setIsOfferModalOpen(false)
        setOfferForm({
          businessName: '',
          ownerPhone: '9848012345',
          title: '',
          discount: '20% Off',
          terms: '',
          imageUrl: PRESET_PHOTO_COVERS[4].url,
          endDateDays: 7,
        })
        fetchContent()
      } else {
        setError(data.error || 'Failed to create offer')
      }
    } catch (err: any) {
      setError(err.message || 'Network error creating offer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'story', id, action: 'delete' }),
      })
      const data = await res.json()
      if (data.success) {
        setStories((prev) => prev.filter((s) => s.id !== id))
        setActionMsg('Story deleted successfully.')
        setTimeout(() => setActionMsg(null), 3000)
      } else {
        setError(data.error || 'Failed to delete story')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting story')
    }
  }

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', id, action: 'delete' }),
      })
      const data = await res.json()
      if (data.success) {
        setOffers((prev) => prev.filter((o) => o.id !== id))
        setActionMsg('Promotional offer deleted successfully.')
        setTimeout(() => setActionMsg(null), 3000)
      } else {
        setError(data.error || 'Failed to delete offer')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting offer')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Stories & Promotional Offers Hub"
        subtitle="Manage user-submitted stories with media and promotional offers with automatic expiry"
        onAddClick={() => (activeTab === 'stories' ? setIsStoryModalOpen(true) : setIsOfferModalOpen(true))}
        addLabel={activeTab === 'stories' ? 'Add Story' : 'Add Offer'}
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
            <button onClick={fetchContent} className="underline hover:text-white text-[11px]">Retry</button>
          </div>
        )}

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

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">Loading {activeTab}...</span>
          </div>
        ) : activeTab === 'stories' ? (
          /* STORIES GRID */
          stories.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
              <p>No active stories found.</p>
              <button
                onClick={() => setIsStoryModalOpen(true)}
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-xs"
              >
                Post Story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {stories.map((st) => (
                <div key={st.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
                  <div className="relative h-64 bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={st.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      {st.status.toUpperCase()}
                    </span>
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm p-2 rounded-lg text-white text-xs">
                      <p className="line-clamp-2">{st.caption}</p>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-white truncate max-w-[65%]">{st.businessName}</h5>
                      <span className="text-[10px] text-emerald-400 font-mono">{st.ownerPhone}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {st.expiresAt ? `Expires ${new Date(st.expiresAt).toLocaleDateString()}` : 'Live'}
                      </span>
                      <button
                        onClick={() => handleDeleteStory(st.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* OFFERS GRID */
          offers.length === 0 ? (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
              <p>No active promotional offers found.</p>
              <button
                onClick={() => setIsOfferModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
              >
                Create Offer
              </button>
            </div>
          ) : (
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
                      <span className="truncate">{off.businessName}</span>
                      <button
                        onClick={() => handleDeleteOffer(off.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete offer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={storyForm.ownerPhone}
                  onChange={(e) => setStoryForm({ ...storyForm, ownerPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Story Media URL (Photo) *</label>
                <input
                  type="url"
                  required
                  value={storyForm.mediaUrl}
                  onChange={(e) => setStoryForm({ ...storyForm, mediaUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Story Caption / Announcement *</label>
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
                  disabled={saving}
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{saving ? 'Publishing...' : 'Publish Story (48h)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE OFFER MODAL */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Create Promotional Offer</h3>
              <button onClick={() => setIsOfferModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddOffer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  placeholder="e.g. Festival Season Mega Discount"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Tag *</label>
                  <input
                    type="text"
                    required
                    value={offerForm.discount}
                    onChange={(e) => setOfferForm({ ...offerForm, discount: e.target.value })}
                    placeholder="e.g. ₹500 Off / 25% Off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={offerForm.endDateDays}
                    onChange={(e) => setOfferForm({ ...offerForm, endDateDays: parseInt(e.target.value) || 7 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={offerForm.businessName}
                  onChange={(e) => setOfferForm({ ...offerForm, businessName: e.target.value })}
                  placeholder="e.g. Yadadri Mega Township"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner/Photo URL</label>
                <input
                  type="url"
                  value={offerForm.imageUrl}
                  onChange={(e) => setOfferForm({ ...offerForm, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Offer Terms / Description</label>
                <textarea
                  rows={2}
                  value={offerForm.terms}
                  onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
                  placeholder="Valid till Sunday. Min purchase ₹1,000..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{saving ? 'Creating...' : 'Create Offer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

