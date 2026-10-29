'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Send,
  Phone,
  CheckCheck,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Info,
  X,
  User,
  ShieldCheck,
  UserPlus,
  Briefcase,
  ExternalLink,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { WhatsAppMessage, ConversationSummary } from '@/lib/types'

export default function SharedInboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activePhone, setActivePhone] = useState<string | null>(null)
  const [activeContactName, setActiveContactName] = useState<string>('')
  const [activeTerritoryId, setActiveTerritoryId] = useState<string>('')
  const [assignedStaff, setAssignedStaff] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerNotice, setProviderNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [inputText, setInputText] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // --------------------------------------------------------------------------
  // 1. LOAD CONVERSATIONS LIST
  // --------------------------------------------------------------------------
  const fetchConversations = async (autoSelectFirst = false) => {
    try {
      setLoadingConversations(true)
      setError(null)
      const res = await fetch('/api/admin/inbox')
      const data = await res.json()

      if (data.success) {
        const convs: ConversationSummary[] = data.conversations || []
        setConversations(convs)

        if (autoSelectFirst && convs.length > 0 && !activePhone) {
          selectConversation(convs[0].phone, convs[0].contactName, convs[0].territoryId)
        }
      } else {
        setError(data.error || 'Failed to load inbox conversations')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching conversations')
    } finally {
      setLoadingConversations(false)
    }
  }

  // --------------------------------------------------------------------------
  // 2. LOAD MESSAGES FOR ACTIVE PHONE
  // --------------------------------------------------------------------------
  const fetchMessagesForPhone = async (phone: string) => {
    try {
      setLoadingMessages(true)
      setError(null)
      const res = await fetch(`/api/admin/inbox?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()

      if (data.success) {
        const msgs = data.messages || []
        setMessages(msgs)
        setActiveContactName(data.contactName || `Customer (${phone})`)
        setActiveTerritoryId(data.territoryId || '')

        const latestAssigned = msgs.slice().reverse().find((m: any) => m.assignedStaffName)?.assignedStaffName || ''
        setAssignedStaff(latestAssigned)

        // Automatically mark unread messages as read
        fetch('/api/admin/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', phone }),
        }).catch(() => {})

        setTimeout(scrollToBottom, 100)
      } else {
        setError(data.error || 'Failed to load conversation history')
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching message history')
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const paramPhone = searchParams?.get('phone')
    if (paramPhone) {
      const clean = paramPhone.replace(/\D/g, '')
      if (clean) {
        setActivePhone(clean)
        setActiveContactName(`Customer (${clean})`)
        fetchMessagesForPhone(clean)
        fetchConversations(false)
        return
      }
    }
    fetchConversations(true)
  }, [])

  const selectConversation = (phone: string, name: string, territoryId: string) => {
    setActivePhone(phone)
    setActiveContactName(name)
    setActiveTerritoryId(territoryId)
    setProviderNotice(null)
    fetchMessagesForPhone(phone)
  }

  const handleAssignStaff = async () => {
    if (!activePhone) return
    const staffName = prompt('Enter staff member name to assign (e.g. Ramesh - Sales & Support):', assignedStaff || '')
    if (staffName === null) return
    const trimmed = staffName.trim()
    if (!trimmed) return

    try {
      setAssigning(true)
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          phone: activePhone,
          staffId: `stf_${Date.now()}`,
          staffName: trimmed,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAssignedStaff(trimmed)
        fetchConversations(false)
        fetchMessagesForPhone(activePhone)
      } else {
        alert(data.error || 'Failed to assign staff')
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning staff')
    } finally {
      setAssigning(false)
    }
  }

  // --------------------------------------------------------------------------
  // 3. SEND REPLY
  // --------------------------------------------------------------------------
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending || !activePhone) return

    const messageText = inputText.trim()
    setSending(true)
    setError(null)
    setProviderNotice(null)

    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          phone: activePhone,
          messageText,
        }),
      })

      const data = await res.json()

      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message])
        setInputText('')
        setTimeout(scrollToBottom, 100)

        if (!data.providerDelivered) {
          setProviderNotice(
            data.notice || 'Message saved locally in CRM inbox (WhatsApp provider credentials not configured)'
          )
        }

        // Refresh conversation preview in list
        fetchConversations(false)
      } else {
        setError(data.error || 'Failed to dispatch reply')
      }
    } catch (err: any) {
      setError(err.message || 'Network error sending reply')
    } finally {
      setSending(false)
    }
  }

  // Filter conversations by search input
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Shared WhatsApp Team Inbox"
        subtitle="Manage live two-way customer conversations and send listing photo cards directly in chat"
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-950/80 border border-red-800 text-red-200 text-xs p-3 rounded-xl flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex-1 grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
          {/* -------------------------------------------------------------- */}
          {/* LEFT: CONVERSATION LIST (4 COLS) */}
          {/* -------------------------------------------------------------- */}
          <div className="md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-950">
            {/* Search Header */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search WhatsApp contacts..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => fetchConversations(false)}
                title="Refresh conversations"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Conversation Items */}
            <div className="divide-y divide-slate-800/60 overflow-y-auto flex-1">
              {loadingConversations ? (
                <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold">No conversations found</p>
                  <p className="text-[11px] text-slate-600 mt-1">Inbound WhatsApp messages will appear here automatically.</p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = activePhone === c.phone
                  const initial = (c.contactName || c.phone)[0].toUpperCase()

                  return (
                    <button
                      key={c.phone}
                      type="button"
                      onClick={() => selectConversation(c.phone, c.contactName, c.territoryId)}
                      className={`w-full text-left p-3 transition-colors flex items-center gap-3 ${
                        isSelected ? 'bg-slate-900 border-l-2 border-emerald-500' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-700/80 border border-emerald-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-xs text-white truncate">{c.contactName}</h5>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-[11px] text-slate-400 truncate pr-2">{c.lastMessage}</p>
                          {c.unreadCount > 0 && (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* RIGHT: ACTIVE CHAT THREAD (8 COLS) */}
          {/* -------------------------------------------------------------- */}
          <div className="md:col-span-8 flex flex-col bg-[#0b141a]">
            {activePhone ? (
              <>
                {/* Chat Header */}
                <div className="p-3 bg-[#1f2c34] border-b border-[#2a3942] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white shadow">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white leading-tight">{activeContactName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {activePhone}
                        </span>
                        {activeTerritoryId && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                            {activeTerritoryId.replace('territory_', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {assignedStaff ? (
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        <span>Staff: {assignedStaff}</span>
                      </span>
                    ) : null}

                    <button
                      onClick={handleAssignStaff}
                      disabled={assigning}
                      className="text-[10px] bg-[#2a3942] hover:bg-[#374248] text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition"
                      title="Assign to Franchise Staff"
                    >
                      <UserPlus className="w-3 h-3 text-indigo-400" />
                      <span>{assignedStaff ? 'Reassign' : 'Assign'}</span>
                    </button>

                    <Link
                      href={`/admin/contacts?search=${encodeURIComponent(activePhone)}`}
                      className="text-[10px] bg-[#2a3942] hover:bg-[#374248] text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition"
                      title="Open Contact Details"
                    >
                      <User className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">Contact</span>
                    </Link>

                    <Link
                      href={`/admin/pipelines?search=${encodeURIComponent(activePhone)}`}
                      className="text-[10px] bg-[#2a3942] hover:bg-[#374248] text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition"
                      title="Open Deals Pipeline"
                    >
                      <Briefcase className="w-3 h-3 text-blue-400" />
                      <span className="hidden sm:inline">Deals</span>
                    </Link>

                    <button
                      onClick={() => fetchMessagesForPhone(activePhone)}
                      title="Refresh messages"
                      className="p-1 bg-[#2a3942] hover:bg-[#374248] text-slate-300 rounded transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Local Sandbox Notice */}
                {providerNotice && (
                  <div className="bg-amber-950/70 border-b border-amber-800 text-amber-200 text-[11px] px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{providerNotice}</span>
                    </div>
                    <button onClick={() => setProviderNotice(null)} className="text-amber-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Messages Viewport */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span>Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      <p>No messages in this conversation yet.</p>
                      <p className="text-[11px] text-slate-600 mt-1">Send a message below to start the conversation.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isOut = m.direction === 'outbound'
                      return (
                        <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[78%] rounded-xl p-3 text-xs shadow-md ${
                              isOut
                                ? 'bg-[#005c4b] text-[#e9edef]'
                                : 'bg-[#1f2c34] text-[#e9edef] border border-[#2a3942]'
                            }`}
                          >
                            {m.imageUrl && (
                              <div className="mb-2 rounded-lg overflow-hidden max-h-48 bg-slate-900 border border-slate-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{m.messageText}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-[#8696a0]">
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isOut && (
                                <CheckCheck
                                  className={`w-3.5 h-3.5 ${
                                    m.status === 'read' ? 'text-[#53bdeb]' : 'text-slate-400'
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply Input Form */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 bg-[#1f2c34] border-t border-[#2a3942] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sending}
                    placeholder="Type WhatsApp reply to customer..."
                    className="flex-1 bg-[#2a3942] text-[#e9edef] text-xs px-3.5 py-2.5 rounded-xl outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !inputText.trim()}
                    className="p-2.5 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow flex items-center justify-center shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20 text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-300">Select a Conversation</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                  Choose a customer from the left list to review message history and reply securely.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
