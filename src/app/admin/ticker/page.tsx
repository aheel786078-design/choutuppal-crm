'use client'

import React, { useState } from 'react'
import { Radio, Plus, Trash2, X } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { TickerItem } from '@/lib/types'

export default function TickerAdminPage() {
  const [tickers, setTickers] = useState<TickerItem[]>([
    {
      id: 'tick_1',
      text: '📢 Welcome to Choutuppal Super App & WhatsApp Service • WhatsApp bot active at 9848012345 • Register your business free!',
      priority: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ])

  const [text, setText] = useState('')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    setTickers([
      {
        id: `tick_${Date.now()}`,
        text: text.trim(),
        priority: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      ...tickers,
    ])
    setText('')
  }

  const handleDelete = (id: string) => {
    setTickers(tickers.filter((t) => t.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Breaking News & Announcement Ticker"
        subtitle="Manage continuous marquee announcements displayed on website and app header"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0"
          >
            Add Ticker
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="divide-y divide-slate-800">
            {tickers.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-xs text-slate-200">{t.text}</p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
