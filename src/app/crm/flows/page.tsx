'use client'

import React, { useState, useEffect } from 'react'
import {
  Workflow,
  Plus,
  Search,
  Upload,
  Download,
  CheckCircle2,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'

interface FlowItem {
  id: string
  name: string
  trigger_type: string
  trigger_keywords?: string[]
  initial_message?: string
  button_options?: string[]
  template_slug?: string
  description?: string
  imageUrl?: string
  status?: string
}

export default function CRMвогоFlowsPage() {
  const [flows, setFlows] = useState<FlowItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const fetchFlows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/flows')
      const data = await res.json()
      if (data.success && Array.isArray(data.flows)) {
        setFlows(data.flows)
      }
    } catch (err) {
      console.warn('Failed to fetch flows:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlows()
  }, [])

  const filteredFlows = flows.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.trigger_keywords && f.trigger_keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()))) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">
                Interactive WhatsApp Flows ({flows.length})
              </h1>
              <p className="text-xs text-slate-400">
                Visual chatbot decision graphs, button selectors, and keyword entry points.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV Flows</span>
          </button>
          <a
            href="/csv/sample_flows.csv"
            download="sample_flows.csv"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flows by name, trigger keywords, or Telugu terms..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Flows Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          Loading active WhatsApp flows...
        </div>
      ) : filteredFlows.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          No flows found matching your search. Click &quot;Import CSV Flows&quot; to load the master dataset.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlows.map((flow, idx) => (
            <div
              key={flow.id || idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-white text-xs truncate" title={flow.name}>
                      {flow.name}
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                    Live
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 font-mono line-clamp-2">
                  {flow.initial_message || 'Welcome to Choutuppal App!'}
                </div>

                {/* Triggers & Keywords */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Trigger ({flow.trigger_type}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {flow.trigger_keywords && flow.trigger_keywords.length > 0 ? (
                      flow.trigger_keywords.slice(0, 3).map((kw, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono"
                        >
                          {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500">Inbound greeting</span>
                    )}
                    {flow.trigger_keywords && flow.trigger_keywords.length > 3 && (
                      <span className="text-[10px] text-slate-500">
                        +{flow.trigger_keywords.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Button Chips */}
                {flow.button_options && flow.button_options.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Interactive Buttons:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {flow.button_options.map((btn, bi) => (
                        <span
                          key={bi}
                          className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-md font-medium"
                        >
                          🔘 {btn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>welcome_menu bound</span>
                </span>
                <span className="font-mono text-[10px]">
                  {flow.template_slug || 'custom'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed Flow Import Modal */}
      <FlowImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          fetchFlows()
          alert(`Successfully imported ${count} custom WhatsApp flows!`)
        }}
      />
    </div>
  )
}
