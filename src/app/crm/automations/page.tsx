'use client'

import React, { useState, useEffect } from 'react'
import {
  Zap,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Tag,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  Building,
  Landmark,
  Store,
} from 'lucide-react'

interface AutomationRule {
  name: string
  trigger_type: string
  trigger_value: string
  action_type: 'send_message' | 'add_tag'
  action_value: string
  is_active: string
  description?: string
}

export default function CRMAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load automations from CSV or API
    fetch('/csv/sample_automations.csv')
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n')
        const items: AutomationRule[] = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          const cols = parseCsvLine(line)
          if (cols.length >= 5) {
            items.push({
              name: cols[0],
              trigger_type: cols[1],
              trigger_value: cols[2],
              action_type: cols[3] as any,
              action_value: cols[4],
              is_active: cols[5] || 'true',
              description: cols[6] || '',
            })
          }
        }
        setAutomations(items)
      })
      .catch((err) => console.warn('Automations load error:', err))
      .finally(() => setLoading(false))
  }, [])

  const parseCsvLine = (text: string) => {
    const res: string[] = []
    let inQuote = false
    let cur = ''
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (c === '"') {
        if (inQuote && text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (c === ',' && !inQuote) {
        res.push(cur)
        cur = ''
      } else {
        cur += c
      }
    }
    res.push(cur)
    return res
  }

  const filteredRules = automations.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.trigger_value.toLowerCase().includes(search.toLowerCase()) ||
      rule.action_value.toLowerCase().includes(search.toLowerCase())
    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'send_message' && rule.action_type === 'send_message') ||
      (filterType === 'add_tag' && rule.action_type === 'add_tag')
    return matchesSearch && matchesType
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Automations &amp; Keyword Rules ({automations.length})
            </h1>
            <p className="text-xs text-slate-400">
              Instant responses, lead tagging, emergency numbers, and categorized directory search.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/csv/sample_automations.csv"
            download="sample_automations.csv"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export 179 Automations CSV</span>
          </a>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 179 rules by keyword, tag name, service, or Ward..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ALL' ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-300'
            }`}
          >
            All ({automations.length})
          </button>
          <button
            onClick={() => setFilterType('send_message')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'send_message' ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setFilterType('add_tag')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'add_tag' ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-300'
            }`}
          >
            Tags
          </button>
        </div>
      </div>

      {/* Automations Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          Loading 179 automations catalogue...
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Rule Name &amp; Trigger</th>
                  <th className="py-3 px-4 font-bold">Inbound Trigger Keywords</th>
                  <th className="py-3 px-4 font-bold">Action Type</th>
                  <th className="py-3 px-4 font-bold">Response Payload / Tag</th>
                  <th className="py-3 px-4 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRules.map((rule, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-4 align-top space-y-1">
                      <div className="font-bold text-white text-xs">{rule.name}</div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {rule.trigger_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs font-mono text-[11px] text-amber-300">
                      {rule.trigger_value || '<First Inbound Message>'}
                    </td>
                    <td className="py-3 px-4 align-top">
                      {rule.action_type === 'add_tag' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                          <Tag className="w-3 h-3" />
                          add_tag
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          <MessageSquare className="w-3 h-3" />
                          send_message
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top max-w-sm text-[11px]">
                      {rule.action_type === 'add_tag' ? (
                        <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                          {rule.action_value}
                        </span>
                      ) : (
                        <p className="line-clamp-2 text-slate-300 font-mono">
                          {rule.action_value.replace(/\\n/g, ' ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
