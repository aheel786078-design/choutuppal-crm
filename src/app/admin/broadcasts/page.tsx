'use client'

import React, { useState, useEffect } from 'react'
import { Send, Users, Image as ImageIcon, CheckCircle2, X, Trash2, Calendar, Loader2, Sparkles } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'
import type { BroadcastCampaign } from '@/lib/types'

export default function BroadcastsAdminPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>([])
  const [audienceCounts, setAudienceCounts] = useState({ all: 0, realEstate: 0, merchants: 0 })
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTO_COVERS[4]?.url || '')
  const [targetAudience, setTargetAudience] = useState('ALL')
  const [isSending, setIsSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchBroadcasts = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/broadcasts')
      const data = await res.json()
      if (data.success) {
        setBroadcasts(data.broadcasts || [])
        if (data.audienceCounts) {
          setAudienceCounts(data.audienceCounts)
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch broadcasts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !title.trim()) return

    setIsSending(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
          targetAudience,
        }),
      })

      const data = await res.json()
      if (data.success && data.broadcast) {
        setSuccessMsg(data.sandboxNotice || 'Broadcast campaign staged successfully in local sandbox mode.')
        setTitle('')
        setMessage('')
        fetchBroadcasts()
        setTimeout(() => setSuccessMsg(null), 8000)
      } else {
        setErrorMsg(data.error || 'Failed to stage broadcast campaign.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error staging broadcast campaign.')
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteBroadcast = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete staged campaign "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/broadcasts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setBroadcasts((prev) => prev.filter((b) => b.id !== id))
      } else {
        alert(data.error || 'Failed to delete broadcast.')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting broadcast.')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="WhatsApp Broadcast Campaigns"
        subtitle="Stage promotional announcements and photo cards for targeted CRM contact segments"
        onRefresh={fetchBroadcasts}
      />

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Sandbox Notice Banner */}
        <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-200 text-xs flex items-center justify-between gap-3 shadow">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span>
              <strong>Campaign Staging Sandbox</strong>: WhatsApp broadcasts require pre-approved Meta Business message templates. Campaigns configured here are validated, audience-matched, and staged locally in the CRM store.
            </span>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-500/30 shrink-0">
            Sandbox Active
          </span>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-between shadow">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendBroadcast} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Compose Staged WhatsApp Broadcast</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Audience Available: {audienceCounts.all} contacts
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Campaign Name / Internal Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Open Plots Festival Offer"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">All Contacts &amp; Merchants ({audienceCounts.all} recipients)</option>
              <option value="REAL_ESTATE">Real Estate &amp; Land Inquirers ({audienceCounts.realEstate} recipients)</option>
              <option value="MERCHANTS">Active Business Owners ({audienceCounts.merchants} recipients)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Media Attachment (Photo / Banner URL)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WhatsApp Broadcast Message Text *
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="నమస్కారం! చౌటుప్పల్ లో సరికొత్త ఓపెన్ ప్లాట్ల వెంచర్ ప్రారంభమైనది..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow disabled:opacity-50 transition"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isSending ? 'Staging Campaign...' : 'Stage Broadcast Campaign'}</span>
            </button>
          </div>
        </form>

        {/* Staged Campaigns List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Staged Broadcast Campaigns ({broadcasts.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Persistent Local Store
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading staged campaigns...</span>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
              No broadcast campaigns staged yet. Compose a campaign above to stage it for your territory.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {broadcasts.map((b) => (
                <div key={b.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-xs text-white truncate">{b.title}</h4>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.2 rounded border border-blue-500/20 font-bold">
                        {b.targetAudience} ({b.matchedRecipients} contacts)
                      </span>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.2 rounded border border-amber-500/20 font-mono">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{b.message}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>ID: {b.id}</span>
                      <span>Staged: {new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteBroadcast(b.id, b.title)}
                      className="p-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg border border-rose-500/20 transition"
                      title="Delete Staged Campaign"
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
    </div>
  )
}
