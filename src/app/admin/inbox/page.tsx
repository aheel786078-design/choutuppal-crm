'use client'

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  Phone,
  Paperclip,
  CheckCheck,
  Search,
  Store,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { WhatsAppMessage, Listing } from '@/lib/types'

export default function SharedInboxPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: 'msg_1',
      phone: '9848012345',
      contactName: 'Ramesh (Sri Sai Ram Auto)',
      direction: 'inbound',
      messageText: 'Hello Admin, my listing photos have been updated with new workshop bay pictures.',
      status: 'received',
      createdAt: '10:30 AM',
    },
    {
      id: 'msg_2',
      phone: '9848012345',
      contactName: 'Super Admin',
      direction: 'outbound',
      messageText: 'Approved! Your listing with the new photos is now live on the website and synced to WhatsApp Flow.',
      imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
      status: 'read',
      createdAt: '10:32 AM',
    },
    {
      id: 'msg_3',
      phone: '9848099887',
      contactName: 'Kishore Reddy (Yadadri Mega Township)',
      direction: 'inbound',
      messageText: 'Did any customer inquire about highway plots today?',
      status: 'received',
      createdAt: '11:15 AM',
    },
  ])

  const [activeContact, setActiveContact] = useState('9848012345')
  const [inputText, setInputText] = useState('')

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const newMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      phone: activeContact,
      direction: 'outbound',
      messageText: inputText.trim(),
      status: 'sent',
      createdAt: 'Just now',
    }

    setMessages([...messages, newMsg])
    setInputText('')
  }

  const activeMessages = messages.filter((m) => m.phone === activeContact)

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Shared WhatsApp Team Inbox"
        subtitle="Manage live two-way customer conversations and send listing photo cards directly in chat"
      />

      <div className="p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
          {/* Left: Contact List (4 Cols) */}
          <div className="md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950">
            <div className="p-3 border-b border-slate-800 bg-slate-900/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search WhatsApp contacts..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
              <button
                type="button"
                onClick={() => setActiveContact('9848012345')}
                className={`w-full text-left p-3 transition-colors flex items-center gap-3 ${
                  activeContact === '9848012345' ? 'bg-slate-900' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  R
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-xs text-white truncate">Ramesh (Auto Tech)</h5>
                    <span className="text-[10px] text-slate-500">10:32 AM</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">Approved! Your listing...</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveContact('9848099887')}
                className={`w-full text-left p-3 transition-colors flex items-center gap-3 ${
                  activeContact === '9848099887' ? 'bg-slate-900' : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                  K
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-xs text-white truncate">Kishore Reddy (Plots)</h5>
                    <span className="text-[10px] text-slate-500">11:15 AM</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">Did any customer inquire...</p>
                </div>
              </button>
            </div>
          </div>

          {/* Right: Active Chat Area (8 Cols) */}
          <div className="md:col-span-8 flex flex-col bg-[#0b141a]">
            {/* Chat Header */}
            <div className="p-3 bg-[#1f2c34] border-b border-[#2a3942] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                  WA
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white leading-none">
                    {activeContact === '9848012345'
                      ? 'Ramesh (Sri Sai Ram Automobiles)'
                      : 'Kishore Reddy (Yadadri Mega Township)'}
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono">{activeContact}</span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium">
                Official API Linked
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMessages.map((m) => {
                const isOut = m.direction === 'outbound'
                return (
                  <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg p-2.5 text-xs shadow ${
                        isOut
                          ? 'bg-[#005c4b] text-[#e9edef]'
                          : 'bg-[#1f2c34] text-[#e9edef] border border-[#2a3942]'
                      }`}
                    >
                      {m.imageUrl && (
                        <div className="mb-2 rounded overflow-hidden max-h-44 bg-slate-900 border border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.imageUrl} alt="Attached" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p>{m.messageText}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696a0]">
                        <span>{m.createdAt}</span>
                        {isOut && <CheckCheck className="w-3 h-3 text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendReply} className="p-3 bg-[#1f2c34] border-t border-[#2a3942] flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type WhatsApp reply to customer..."
                className="flex-1 bg-[#2a3942] text-[#e9edef] text-xs px-3 py-2 rounded-lg outline-none placeholder:text-[#8696a0]"
              />
              <button
                type="submit"
                className="p-2 bg-[#00a884] hover:bg-[#008f72] text-white rounded-lg transition-colors shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
