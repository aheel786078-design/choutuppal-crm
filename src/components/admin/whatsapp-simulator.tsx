'use client'

import React, { useState } from 'react'
import {
  Send,
  Smartphone,
  Phone,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ChevronRight,
  MapPin,
  Tag,
  CheckCheck,
} from 'lucide-react'
import { Listing } from '@/lib/types'
import { STANDARD_CATEGORIES } from '@/lib/constants'

interface WhatsAppSimulatorProps {
  listings: Listing[]
}

interface ChatMessage {
  id: string
  from: 'bot' | 'user'
  type: 'text' | 'category_list' | 'listing_card'
  text?: string
  data?: any
  time: string
}

export function WhatsAppFlowSimulator({ listings }: WhatsAppSimulatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      from: 'bot',
      type: 'text',
      text: 'నమస్కారం! చౌటుప్పల్ సూపర్ యాప్ WhatsApp సేవలకు స్వాగతం. 🙏\n\nస్థానిక సమాచారం కోసం ఒక ఆప్షన్ ఎంచుకోండి:',
      time: '10:00 AM',
    },
    {
      id: 'm2',
      from: 'bot',
      type: 'category_list',
      text: '🏪 *చౌటుప్పల్ వ్యాపారాలు & సేవలు (Categories)*\nక్రింది బటన్లలో మీకు కావలసిన విభాగాన్ని ఎంచుకోండి:',
      time: '10:00 AM',
    },
  ])
  const [input, setInput] = useState('')

  const handleSelectCategory = (categorySlug: string, categoryName: string, teluguName: string) => {
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      from: 'user',
      type: 'text',
      text: `${teluguName} (${categoryName})`,
      time: 'Just now',
    }

    // Filter matching listings
    const matched = listings.filter(
      (l) => l.categoryId === categorySlug || l.categoryId.includes(categorySlug),
    )
    const topListing = matched.length > 0 ? matched[0] : listings[0]

    const botReply: ChatMessage = {
      id: `bot_${Date.now()}`,
      from: 'bot',
      type: 'listing_card',
      data: topListing,
      time: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg, botReply])
  }

  const handleSendMessage = () => {
    if (!input.trim()) return
    const text = input.trim()
    setInput('')

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      from: 'user',
      type: 'text',
      text,
      time: 'Just now',
    }

    // Search query in listings
    const match = listings.find(
      (l) =>
        l.title.toLowerCase().includes(text.toLowerCase()) ||
        l.description.toLowerCase().includes(text.toLowerCase()) ||
        l.categoryName?.toLowerCase().includes(text.toLowerCase()),
    ) || listings[0]

    const botReply: ChatMessage = {
      id: `bot_${Date.now()}`,
      from: 'bot',
      type: 'listing_card',
      data: match,
      time: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg, botReply])
  }

  const handleReset = () => {
    setMessages([
      {
        id: 'm1',
        from: 'bot',
        type: 'text',
        text: 'నమస్కారం! చౌటుప్పల్ సూపర్ యాప్ WhatsApp సేవలకు స్వాగతం. 🙏\n\nస్థానిక సమాచారం కోసం ఒక ఆప్షన్ ఎంచుకోండి:',
        time: '10:00 AM',
      },
      {
        id: 'm2',
        from: 'bot',
        type: 'category_list',
        text: '🏪 *చౌటుప్పల్ వ్యాపారాలు & సేవలు (Categories)*\nక్రింది బటన్లలో మీకు కావలసిన విభాగాన్ని ఎంచుకోండి:',
        time: '10:00 AM',
      },
    ])
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-w-sm mx-auto flex flex-col h-[650px]">
      {/* Phone Mockup Header */}
      <div className="bg-[#1f2c34] p-3 text-white flex items-center justify-between border-b border-[#2a3942]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow">
              CP
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute bottom-0 right-0 border-2 border-[#1f2c34]" />
          </div>
          <div>
            <h4 className="font-semibold text-xs leading-none">Choutuppal Bot (CRM)</h4>
            <span className="text-[10px] text-emerald-400">official business account</span>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#2a3942]"
          title="Reset Flow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0b141a]">
        {messages.map((m) => {
          if (m.from === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="bg-[#005c4b] text-[#e9edef] rounded-lg p-2.5 max-w-[80%] text-xs shadow">
                  <p>{m.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696a0]">
                    <span>{m.time}</span>
                    <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                  </div>
                </div>
              </div>
            )
          }

          // Bot message types
          if (m.type === 'category_list') {
            return (
              <div key={m.id} className="space-y-2 max-w-[92%]">
                <div className="bg-[#1f2c34] text-[#e9edef] rounded-lg p-2.5 text-xs shadow border border-[#2a3942]">
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
                {/* Category Interactive Buttons */}
                <div className="space-y-1.5 pl-2">
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">
                    Interactive Category Buttons:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STANDARD_CATEGORIES.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCategory(c.slug, c.name, c.telugu)}
                        className="bg-[#202d35] hover:bg-[#2a3942] active:bg-[#005c4b] border border-[#2a3942] text-left p-2 rounded-lg text-[11px] text-[#e9edef] transition-colors flex items-center justify-between group shadow-sm"
                      >
                        <div className="truncate">
                          <p className="font-semibold text-white truncate">{c.telugu}</p>
                          <p className="text-[9px] text-[#8696a0] truncate">{c.name}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          if (m.type === 'listing_card' && m.data) {
            const item: Listing = m.data
            return (
              <div key={m.id} className="max-w-[90%] bg-[#1f2c34] text-[#e9edef] rounded-lg shadow-md border border-[#2a3942] overflow-hidden text-xs">
                {/* Photo Header */}
                <div className="relative h-36 w-full bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    VERIFIED
                  </div>
                </div>

                {/* Details */}
                <div className="p-2.5 space-y-1.5">
                  <h5 className="font-bold text-white text-xs line-clamp-1">{item.title}</h5>
                  <div className="flex items-center gap-1 text-[10px] text-[#00a884]">
                    <Tag className="w-3 h-3" />
                    <span>{item.categoryName || 'Business'}</span>
                  </div>
                  <p className="text-[10px] text-[#8696a0] line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-[#aebac1]">
                    <MapPin className="w-3 h-3 text-[#00a884] shrink-0" />
                    <span className="truncate">{item.address}</span>
                  </div>
                </div>

                {/* WhatsApp Action Buttons */}
                <div className="border-t border-[#2a3942] divide-y divide-[#2a3942]">
                  <div className="py-1.5 text-center text-[#53bdeb] font-semibold text-[11px] hover:bg-[#202d35] cursor-pointer flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>📞 కాల్: {item.phone}</span>
                  </div>
                  <div className="py-1.5 text-center text-[#00a884] font-semibold text-[11px] hover:bg-[#202d35] cursor-pointer flex items-center justify-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>💬 వాట్సాప్ చాట్</span>
                  </div>
                </div>
              </div>
            )
          }

          // Plain text bot reply
          return (
            <div key={m.id} className="bg-[#1f2c34] text-[#e9edef] rounded-lg p-2.5 max-w-[85%] text-xs shadow border border-[#2a3942]">
              <p className="whitespace-pre-line">{m.text}</p>
              <span className="text-[9px] text-[#8696a0] block text-right mt-1">{m.time}</span>
            </div>
          )
        })}
      </div>

      {/* Input Bar */}
      <div className="p-2 bg-[#1f2c34] border-t border-[#2a3942] flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type 'hotel', 'auto', 'real estate'..."
          className="flex-1 bg-[#2a3942] text-[#e9edef] text-xs px-3 py-2 rounded-lg outline-none placeholder:text-[#8696a0]"
        />
        <button
          onClick={handleSendMessage}
          className="p-2 bg-[#00a884] hover:bg-[#008f72] text-white rounded-lg shadow transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
