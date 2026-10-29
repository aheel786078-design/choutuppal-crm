'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Send,
  X,
  FileText,
  Building,
  Sparkles,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { ApprovalItem } from '@/lib/types'

export default function ApprovalQueuePage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'changes_requested' | 'rejected'>('pending')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Action Modal State (for Request Changes or Reject with notes)
  const [actionModal, setActionModal] = useState<{
    open: boolean
    id: string
    action: 'request_changes' | 'reject'
    title: string
  } | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('all')

  const fetchApprovals = async (territoryId = selectedTerritoryId) => {
    setLoading(true)
    try {
      const url =
        territoryId && territoryId !== 'all'
          ? `/api/admin/approvals?territoryId=${encodeURIComponent(territoryId)}`
          : '/api/admin/approvals'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setApprovals(data.approvals || [])
      }
    } catch (err) {
      console.warn('Fetch approvals error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [])

  const handleApprove = async (id: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        setToastMsg('Item approved, published to Website & WhatsApp CRM, and owner notified!')
        setTimeout(() => setToastMsg(null), 5000)
        fetchApprovals()
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExecuteModalAction = async () => {
    if (!actionModal) return
    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionModal.id,
          action: actionModal.action,
          adminNotes: actionNotes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setToastMsg(
          actionModal.action === 'request_changes'
            ? 'Changes requested and submitter alerted on WhatsApp!'
            : 'Item rejected and submitter notified.',
        )
        setTimeout(() => setToastMsg(null), 5000)
        setActionModal(null)
        setActionNotes('')
        fetchApprovals()
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredApprovals = approvals.filter((item) => {
    const matchesTab = item.status === activeTab
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter
    return matchesTab && matchesType
  })

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="Admin Moderation & Approval Queue"
        subtitle="Review, approve, or request changes on user WhatsApp submissions before publishing"
        selectedTerritoryId={selectedTerritoryId}
        onTerritoryChange={(tid) => {
          setSelectedTerritoryId(tid)
          fetchApprovals(tid)
        }}
        onRefresh={() => fetchApprovals(selectedTerritoryId)}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Toast Alert */}
        {toastMsg && (
          <div className="p-3.5 bg-emerald-950/90 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-amber-950/40 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Centralized Submission &amp; Review Workflow
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
                    {pendingCount} Pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Submissions from WhatsApp (New Listings, Stories, Offers, Franchise Applications) remain unpublished until reviewed here.
              </p>
            </div>
          </div>
        </div>

        {/* Tab & Type Filters Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review ({approvals.filter((a) => a.status === 'pending').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'approved'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approved &amp; Published</span>
            </button>

            <button
              onClick={() => setActiveTab('changes_requested')}
              className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'changes_requested'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Changes Requested</span>
            </button>

            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected</span>
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Submission Types</option>
              <option value="NEW_LISTING">New Listings</option>
              <option value="STORY">Stories</option>
              <option value="OFFER">Offers</option>
              <option value="FRANCHISE_APP">Franchise Applications</option>
              <option value="CITIZEN_REPORT">Reels &amp; Community Reports</option>
            </select>
          </div>
        </div>

        {/* Approval Queue Items List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Loading moderation queue...
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs">
              No items in this queue status.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredApprovals.map((item) => (
                <div key={item.id} className="p-5 hover:bg-slate-950/40 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Media Thumbnail */}
                    {item.mediaUrl ? (
                      <div className="w-20 h-20 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-700">
                        <FileText className="w-8 h-8" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.type}
                        </span>
                        <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                        {item.status === 'pending' && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                            Pending Review
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 break-all">
                        {item.data?.description || item.data?.caption || item.data?.proposedArea || item.data?.url}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-slate-300">
                          👤 {item.submitterName}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-emerald-400">
                          <Phone className="w-3 h-3" />
                          {item.submitterPhone}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {item.adminNotes && (
                        <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] text-amber-400">
                          <strong>Admin Feedback:</strong> {item.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Pending Items */}
                  {item.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(item.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve &amp; Publish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            open: true,
                            id: item.id,
                            action: 'request_changes',
                            title: item.title,
                          })
                        }
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700"
                      >
                        Request Changes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            open: true,
                            id: item.id,
                            action: 'reject',
                            title: item.title,
                          })
                        }
                        className="p-2 text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 rounded-lg border border-red-900/30"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK & REJECTION MODAL */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {actionModal.action === 'request_changes'
                  ? 'Request Changes from Submitter'
                  : 'Reject Submission'}
              </h3>
              <button onClick={() => setActionModal(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide feedback for <strong>{actionModal.title}</strong>. This message will be sent directly to the submitter on WhatsApp:
            </p>

            <textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g. Please provide a clear shop front photo and complete street address..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteModalAction}
                className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 ${
                  actionModal.action === 'request_changes'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Dispatching...' : 'Send to Submitter via WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
