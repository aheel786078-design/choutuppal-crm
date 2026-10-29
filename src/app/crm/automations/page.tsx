'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Search,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Tag,
  MessageSquare,
  Clock,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  PlayCircle,
  Terminal,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { AutomationRule, AutomationRuleStatus } from '@/lib/types'

export default function CRMAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationRule[]>([])
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    draft: 0,
    paused: 0,
    disabled: 0,
    unsupported: 0,
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const [previewResult, setPreviewResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Dry-Run Simulator State
  const [showSimulator, setShowSimulator] = useState(true)
  const [simMessage, setSimMessage] = useState('doctor clinic')
  const [simPhone, setSimPhone] = useState('919441348175')
  const [simContactName, setSimContactName] = useState('Ravi Kumar')
  const [simIncludeDrafts, setSimIncludeDrafts] = useState(true)
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<any>(null)
  const [simError, setSimError] = useState<string | null>(null)

  const handleRunDryRun = async (msgOverride?: string) => {
    const textToTest = msgOverride !== undefined ? msgOverride : simMessage
    if (!textToTest.trim()) {
      setSimError('Please enter message text to test.')
      return
    }
    setSimLoading(true)
    setSimError(null)
    try {
      const res = await fetch('/api/crm/automations/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: textToTest.trim(),
          phone: simPhone.trim() || '919441348175',
          contactName: simContactName.trim() || undefined,
          simulateDrafts: simIncludeDrafts,
        }),
      })
      const data = await res.json()
      if (data.success && data.evaluation) {
        setSimResult(data)
      } else {
        setSimError(data.error || 'Dry-run evaluation failed.')
      }
    } catch (err: any) {
      setSimError('Network error connecting to dry-run API.')
    } finally {
      setSimLoading(false)
    }
  }

  const loadAutomations = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/crm/automations')
      const data = await res.json()
      if (data.success && Array.isArray(data.automations)) {
        setAutomations(data.automations)
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        setErrorMsg(data.error || 'Failed to load automations.')
      }
    } catch (err: any) {
      console.error('[Automations UI] Fetch error:', err)
      setErrorMsg('Network error connecting to automations API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAutomations()
  }, [loadAutomations])

  const handlePreviewImport = async () => {
    if (!importCsvText.trim()) {
      setImportError('Please paste CSV content to preview.')
      return
    }
    setImporting(true)
    setImportError(null)
    setPreviewResult(null)

    try {
      const res = await fetch('/api/crm/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: importCsvText,
          dryRun: true,
        }),
      })
      const data = await res.json()
      if (data.success && data.preview) {
        setPreviewResult(data.preview)
      } else {
        setImportError(data.error || 'Failed to preview CSV import.')
      }
    } catch (err: any) {
      setImportError('Network error previewing CSV import.')
    } finally {
      setImporting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importCsvText.trim()) return
    setImporting(true)
    setImportError(null)

    try {
      const res = await fetch('/api/crm/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: importCsvText,
          dryRun: false,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setIsImportModalOpen(false)
        setImportCsvText('')
        setPreviewResult(null)
        loadAutomations()
      } else {
        setImportError(data.error || 'Failed to confirm CSV import.')
      }
    } catch (err: any) {
      setImportError('Network error saving automation rules.')
    } finally {
      setImporting(false)
    }
  }

  const handleToggleStatus = async (rule: AutomationRule) => {
    const nextStatus: AutomationRuleStatus =
      rule.status === 'active' ? 'paused' : rule.status === 'paused' ? 'active' : 'active'

    try {
      const res = await fetch('/api/crm/automations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          status: nextStatus,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAutomations((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, status: nextStatus, isActive: nextStatus === 'active' } : r))
        )
      } else {
        alert(data.error || 'Failed to update rule status.')
      }
    } catch (err) {
      alert('Network error updating rule status.')
    }
  }

  const handleDeleteRule = async (rule: AutomationRule) => {
    if (!confirm(`Are you sure you want to delete rule "${rule.name}"?`)) return

    try {
      const res = await fetch(`/api/crm/automations?id=${encodeURIComponent(rule.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setAutomations((prev) => prev.filter((r) => r.id !== rule.id))
      } else {
        alert(data.error || 'Failed to delete rule.')
      }
    } catch (err) {
      alert('Network error deleting rule.')
    }
  }

  const filteredRules = automations.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(search.toLowerCase()) ||
      rule.triggerValue.toLowerCase().includes(search.toLowerCase()) ||
      rule.actionValue.toLowerCase().includes(search.toLowerCase()) ||
      (rule.description && rule.description.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'ALL' ||
      rule.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
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
              Persistent rules catalogue, keyword auto-replies, and CRM lead tagging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPreviewResult(null)
              setImportError(null)
              setIsImportModalOpen(true)
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV (Preview / Confirm)</span>
          </button>

          <a
            href="/csv/sample_automations.csv"
            download="sample_automations.csv"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Template CSV</span>
          </a>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadAutomations}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-3 py-1 rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Rules</span>
          <div className="text-lg font-bold text-white mt-0.5">{summary.total || automations.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Draft Rules</span>
          <div className="text-lg font-bold text-amber-400 mt-0.5">{summary.draft}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Active Rules</span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{summary.active}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Paused Rules</span>
          <div className="text-lg font-bold text-slate-400 mt-0.5">{summary.paused}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Disabled / Unsupported</span>
          <div className="text-lg font-bold text-rose-400 mt-0.5">{summary.disabled + summary.unsupported}</div>
        </div>
      </div>

      {/* Rule Evaluator & Dry-Run Simulator Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div
          onClick={() => setShowSimulator(!showSimulator)}
          className="flex items-center justify-between p-4 bg-slate-950/60 hover:bg-slate-950/80 cursor-pointer border-b border-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Rule Evaluator &amp; Dry-Run Simulator
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Sandbox Safe (0 Dispatches)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Test incoming WhatsApp messages against your rules catalog and preview rendered template responses.
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {showSimulator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showSimulator && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Simulator Input Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Simulated Inbound Message Text *
                  </label>
                  <textarea
                    rows={3}
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    placeholder="e.g. doctor clinic, hi police, hospital, namaste..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  {/* Quick Suggestion Pills */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">Quick tests:</span>
                    {['doctor clinic', 'hi police', 'namaste', 'hospital', 'real estate', 'shops near me'].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => {
                          setSimMessage(pill)
                          handleRunDryRun(pill)
                        }}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-amber-300 rounded border border-slate-800 hover:border-amber-500/40 transition-colors"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Sender Phone Number
                    </label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      placeholder="919441348175"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Contact Name (Mock)
                    </label>
                    <input
                      type="text"
                      value={simContactName}
                      onChange={(e) => setSimContactName(e.target.value)}
                      placeholder="Ravi Kumar"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simIncludeDrafts}
                      onChange={(e) => setSimIncludeDrafts(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300 font-medium">
                      Simulate Draft Rules (What-If Preview)
                    </span>
                  </label>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {simIncludeDrafts ? 'Drafts Evaluated' : 'Active Only'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunDryRun()}
                  disabled={simLoading || !simMessage.trim()}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {simLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating Against Rules...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Evaluate Message (Dry-Run)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulator Output / Results (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 min-h-[220px] flex flex-col justify-between">
                {simError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{simError}</span>
                  </div>
                )}

                {!simResult && !simError && (
                  <div className="my-auto text-center p-8 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">
                      Dry-Run Sandbox Standing By
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Click any quick suggestion or type a keyword phrase above to test deterministic rule evaluation without dispatching any real messages.
                    </p>
                  </div>
                )}

                {simResult && (
                  <div className="space-y-3.5 text-xs">
                    {/* Header Status Bar */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-400">Match Result:</span>
                        {simResult.evaluation.matchedRuleIds.length > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px] border border-emerald-500/30">
                            {simResult.evaluation.matchedRuleIds.length} Rule(s) Matched
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 font-semibold rounded text-[10px]">
                            0 Rules Matched
                          </span>
                        )}
                        {simResult.simulateDrafts && (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] rounded font-mono border border-amber-500/20">
                            Draft What-If Mode
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {simResult.evaluation.summary.totalRulesEvaluated} evaluated
                      </span>
                    </div>

                    {/* Proposed Actions */}
                    {simResult.evaluation.proposedActions.length === 0 ? (
                      <div className="p-4 bg-slate-900 rounded-xl text-center text-slate-500 text-xs">
                        No proposed actions generated for this message.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                          Proposed Action Plan ({simResult.evaluation.proposedActions.length})
                        </span>
                        {simResult.evaluation.proposedActions.map((act: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border ${
                              act.isSuppressed
                                ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                                : 'bg-slate-900 border-slate-700/80 text-white'
                            } space-y-2`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">{act.ruleName}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                    act.actionType === 'send_message'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  }`}
                                >
                                  {act.actionType}
                                </span>
                              </div>
                              {act.isSuppressed && (
                                <span className="text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                                  Suppressed: Single-Reply Policy
                                </span>
                              )}
                            </div>

                            {/* Rendered Template Output */}
                            {act.renderedValue && (
                              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                                {act.renderedValue}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Safety Footnote */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{simResult.notice}</span>
                      <span className="font-mono text-emerald-400">Strictly Isolated</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules by name, keywords, tag, or Telugu response..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'draft', 'active', 'paused', 'disabled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st ? 'bg-amber-500 text-black' : 'bg-slate-950 text-slate-300 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Automations Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span>Loading persistent automation rules...</span>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <p>No automation rules found matching your filter.</p>
          <p className="text-[11px] text-slate-600">
            Click &quot;Import CSV&quot; to safely preview and import the 179 rules dataset in draft status.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Rule Name</th>
                  <th className="py-3 px-4 font-bold">Trigger</th>
                  <th className="py-3 px-4 font-bold">Action</th>
                  <th className="py-3 px-4 font-bold">Response / Tag Payload</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRules.map((rule) => {
                  const isActionTag = rule.actionType === 'add_tag'

                  return (
                    <tr key={rule.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-4 align-top space-y-1">
                        <div className="font-bold text-white text-xs">{rule.name}</div>
                        {rule.description && (
                          <div className="text-[10px] text-slate-500 line-clamp-1">{rule.description}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-amber-300 line-clamp-2">
                          {rule.triggerValue || `<${rule.triggerType}>`}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{rule.triggerType}</span>
                      </td>

                      <td className="py-3 px-4 align-top">
                        {isActionTag ? (
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
                        {isActionTag ? (
                          <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800 text-[10px]">
                            {rule.actionValue}
                          </span>
                        ) : (
                          <p className="line-clamp-2 text-slate-300 font-mono text-[10px]">
                            {rule.actionValue}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rule.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : rule.status === 'draft'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : rule.status === 'paused'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {rule.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top text-right space-x-1">
                        <button
                          onClick={() => handleToggleStatus(rule)}
                          title={rule.status === 'active' ? 'Pause Rule' : 'Activate Rule'}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          {rule.status === 'active' ? (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          title="Delete Rule"
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import & Preview Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Safe CSV Import &amp; Preview</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paste Automation CSV Content *
              </label>
              <textarea
                rows={6}
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="name,trigger_type,trigger_value,action_type,action_value,is_active,description,template_slug..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Expected columns: name, trigger_type, trigger_value, action_type, action_value, is_active, description, template_slug.
              </p>
            </div>

            {/* Dry-Run Preview Results */}
            {previewResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Dry-Run Preview Result (Zero Store Mutations)</span>
                </h4>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Total Rows</span>
                    <div className="font-bold text-white text-sm">{previewResult.totalParsed}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-emerald-400">New Rules</span>
                    <div className="font-bold text-emerald-400 text-sm">{previewResult.createdCount}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Duplicates (Skip)</span>
                    <div className="font-bold text-slate-400 text-sm">{previewResult.skippedCount}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-rose-400">Unsupported</span>
                    <div className="font-bold text-rose-400 text-sm">{previewResult.unsupportedCount}</div>
                  </div>
                </div>

                {previewResult.warnings && previewResult.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-lg text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Warnings ({previewResult.warnings.length})</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {previewResult.warnings.slice(0, 3).map((w: any, idx: number) => (
                        <li key={idx}>Row {w.row}: {w.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={importing || !importCsvText.trim()}
                  onClick={handlePreviewImport}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 flex items-center gap-1.5"
                >
                  {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Preview Import</span>
                </button>

                <button
                  type="button"
                  disabled={importing || !previewResult || previewResult.createdCount === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Import ({previewResult?.createdCount || 0} Drafts)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
