'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Workflow,
  Plus,
  Search,
  Upload,
  Download,
  PlayCircle,
  PauseCircle,
  Archive,
  Pencil,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageSquare,
  GitFork,
  FileText,
  X,
  Loader2,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FlowImportModal } from '@/components/flows/flow-import-modal'
import type { FlowRow } from '@/lib/flows/types'

interface FlowTemplate {
  slug: string
  name: string
  description: string
  icon: string
  node_count: number
}

export default function AdminFlowsPage() {
  const router = useRouter()
  const [flows, setFlows] = useState<FlowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'draft' | 'archived'>('ALL')

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false)
  const [templates, setTemplates] = useState<FlowTemplate[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  // Import Modal
  const [importOpen, setImportOpen] = useState(false)

  const loadFlows = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/flows')
      const json = await res.json()
      if (json.flows) {
        setFlows(json.flows)
      }
    } catch (err) {
      console.error('Failed to load flows:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/flows/templates')
      const json = await res.json()
      if (json.templates) {
        setTemplates(json.templates)
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  useEffect(() => {
    loadFlows()
    loadTemplates()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create flow')
      const json = await res.json()
      setCreateOpen(false)
      setNewName('')
      router.push(`/admin/flows/${json.flow.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create flow')
    } finally {
      setCreating(false)
    }
  }

  const handleUseTemplate = async (templateSlug: string) => {
    setCreating(true)
    try {
      const t = templates.find((tmp) => tmp.slug === templateSlug)
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: t ? `${t.name} (Copy)` : 'New Flow',
          template_slug: templateSlug,
        }),
      })
      if (!res.ok) throw new Error('Failed to create from template')
      const json = await res.json()
      setCreateOpen(false)
      router.push(`/admin/flows/${json.flow.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create from template')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete WhatsApp flow "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/flows/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setFlows((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      console.error(err)
      alert('Failed to delete flow')
    }
  }

  const filteredFlows = flows.filter((f) => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      f.name.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (Array.isArray(f.trigger_config?.keywords) &&
        (f.trigger_config.keywords as string[]).some((k) => k.toLowerCase().includes(q)))
    )
  })

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader
        title="WhatsApp Flow Automation Builder"
        subtitle="Visual canvas & branching nodes for business directory, services, and real estate bots"
        onRefresh={loadFlows}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200/80 shadow-xs p-4 rounded-xl">
          <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search flows, keywords, templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-xs text-slate-900"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-xs">
              {(['ALL', 'active', 'draft', 'archived'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    statusFilter === st ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Import / Export
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Flow
            </Button>
          </div>
        </div>

        {/* Sync Guarantee Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <GitFork className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Dual Admin &amp; CRM Sync Engine Active
              </p>
              <p className="text-[11px] text-slate-400">
                Any changes made here in Admin Panel or in the CRM Portal (/crm/flows) are automatically synchronized in real-time.
              </p>
            </div>
          </div>
          <Link
            href="/crm/flows"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 shrink-0"
          >
            Open in CRM <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Flows Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="text-xs font-medium">Loading WhatsApp Flows...</span>
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-300 rounded-xl bg-white p-8">
            <Workflow className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900">No WhatsApp Flows Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Create your first WhatsApp conversational flow or choose from pre-built templates for emergency services, business directory, or real estate inquiries.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Flow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlows.map((flow) => {
              const keywords = Array.isArray(flow.trigger_config?.keywords)
                ? (flow.trigger_config.keywords as string[])
                : []
              const isLive = flow.status === 'active' || flow.status === 'published'

              return (
                <div
                  key={flow.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 hover:border-emerald-300 shadow-xs transition-all shadow-sm group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                          <Workflow className="h-4 w-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 truncate">{flow.name}</h4>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-medium ${
                          isLive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : flow.status === 'archived'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isLive ? 'Active' : flow.status === 'archived' ? 'Archived' : 'Draft'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {flow.description || 'Interactive WhatsApp conversation flow with buttons and list nodes.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-medium text-slate-400">Trigger:</span>
                      {keywords.length > 0 ? (
                        keywords.slice(0, 3).map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-emerald-800 font-semibold font-mono"
                          >
                            {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500">First Inbound Message</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-slate-500" />
                      {flow.run_count ?? 0} runs
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(flow.id, flow.name)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete Flow"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Link
                        href={`/admin/flows/${flow.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit Canvas
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Create WhatsApp Flow
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Pick a ready-made Choutuppal template or start with a blank flow canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {templates.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                  Pre-configured Templates:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.slug}
                      type="button"
                      onClick={() => handleUseTemplate(tpl.slug)}
                      disabled={creating}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-400">
                            {tpl.name}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {tpl.node_count} nodes
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                Or Start Blank:
              </span>
              <Input
                placeholder="Enter flow title (e.g. Festival Offers &amp; Taxis)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white border-slate-200 text-xs text-slate-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              className="text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Create Blank Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <FlowImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => loadFlows()}
      />
    </div>
  )
}
