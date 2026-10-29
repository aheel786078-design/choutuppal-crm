'use client'

import React, { useState, useEffect } from 'react'
import { Radio, Plus, Trash2, X, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { TickerItem } from '@/lib/types'

export default function TickerAdminPage() {
  const [tickers, setTickers] = useState<TickerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [text, setText] = useState('')

  const fetchTickers = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/content')
      const data = await res.json()
      if (data.success) {
        setTickers(data.tickers || [])
      } else {
        setError(data.error || 'Failed to load ticker announcements')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickers()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    try {
      setSaving(true)
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ticker',
          action: 'create',
          item: {
            text: text.trim(),
            priority: 1,
            isActive: true,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setText('')
        setActionMsg('Announcement ticker added successfully!')
        setTimeout(() => setActionMsg(null), 3000)
        fetchTickers()
      } else {
        setError(data.error || 'Failed to add ticker')
      }
    } catch (err: any) {
      setError(err.message || 'Network error adding announcement')
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
        body: JSON.stringify({ type: 'ticker', id, action: 'toggle' }),
      })
      const data = await res.json()
      if (data.success) {
        setTickers((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
        )
      } else {
        setError(data.error || 'Failed to toggle ticker status')
      }
    } catch (err: any) {
      setError(err.message || 'Network error toggling status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      setError(null)
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ticker', id, action: 'delete' }),
      })
      const data = await res.json()
      if (data.success) {
        setTickers((prev) => prev.filter((t) => t.id !== id))
        setActionMsg('Announcement deleted successfully.')
        setTimeout(() => setActionMsg(null), 3000)
      } else {
        setError(data.error || 'Failed to delete ticker')
      }
    } catch (err: any) {
      setError(err.message || 'Network error deleting ticker')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Breaking News & Announcement Ticker"
        subtitle="Manage continuous marquee announcements displayed on website and app header"
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
            <button onClick={fetchTickers} className="underline hover:text-white text-[11px]">Retry</button>
          </div>
        )}

        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3 shadow">
          <input
            type="text"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type breaking news or announcement alert..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{saving ? 'Adding...' : 'Add Ticker'}</span>
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-xs text-white">Active & Draft Announcements ({tickers.length})</h3>
            <span className="text-[11px] text-slate-500">Live on header marquee when active</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-xs">Loading announcements...</span>
            </div>
          ) : tickers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No ticker announcements added yet. Use the field above to add one.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {tickers.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        t.isActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'
                      }`}
                    />
                    <p className={`text-xs truncate ${t.isActive ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                      {t.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(t.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.isActive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Paused'}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Delete ticker"
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

