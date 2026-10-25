'use client'

import React, { useState } from 'react'
import { Send, Users, Image as ImageIcon, CheckCircle2, X } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { PRESET_PHOTO_COVERS, STANDARD_CATEGORIES } from '@/lib/constants'

export default function BroadcastsAdminPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTO_COVERS[4].url)
  const [targetAudience, setTargetAudience] = useState('ALL')
  const [isSending, setIsSending] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setSuccessMsg(true)
      setTitle('')
      setMessage('')
      setTimeout(() => setSuccessMsg(false), 4000)
    }, 1200)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="WhatsApp Broadcast Campaigns"
        subtitle="Send broadcast announcements and promotional listing cards with photos to contacts"
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Broadcast queued &amp; dispatched successfully to WhatsApp audience!</span>
          </div>
        )}

        <form onSubmit={handleSendBroadcast} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow">
          <h3 className="font-bold text-sm text-white">Compose WhatsApp Broadcast</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Campaign Name / Internal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Open Plots Festival Offer"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="ALL">All Contacts &amp; Merchants (Full Audience)</option>
              <option value="REAL_ESTATE">Real Estate &amp; Land Inquirers</option>
              <option value="MERCHANTS">Active Business Owners</option>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Dispatching Broadcast...' : 'Send Broadcast Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
