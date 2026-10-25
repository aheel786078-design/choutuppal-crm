'use client'

import React, { useState, useEffect } from 'react'
import { Contact, Plus, Search, Filter, Phone, Mail, Tag, ArrowRight } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { CRMContact } from '@/lib/types'

export default function ContactsAdminPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/crm/contacts')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setContacts(data.contacts || [])
      })
      .catch((err) => console.warn(err))
  }, [])

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="CRM Contacts & Inbound Leads"
        subtitle="Merchants and customer leads auto-synced from Choutuppal listings and WhatsApp bot"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts by name, tag, phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total Contacts: {contacts.length}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="divide-y divide-slate-800">
            {filtered.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-semibold text-xs text-white truncate">{c.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {c.phone}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{c.notes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {c.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
