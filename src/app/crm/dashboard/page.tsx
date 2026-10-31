'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Workflow,
  Zap,
  Users,
  MessageSquare,
  Upload,
  Download,
  CheckCircle2,
  Phone,
  Sparkles,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Radio,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'

export default function CRMDashboardPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [flowsCount, setFlowsCount] = useState<number>(1)
  const [autosCount, setAutosCount] = useState<number>(179)
  const [draftAutosCount, setDraftAutosCount] = useState<number>(179)
  const [contactsCount, setContactsCount] = useState<number>(211)
  const [dealsCount, setDealsCount] = useState<number>(4)
  const [dealValue, setDealValue] = useState<number>(0)
  const [wonDeals, setWonDeals] = useState<number>(0)
  const [broadcastsCount, setBroadcastsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          if (typeof data.stats.totalFlows === 'number') setFlowsCount(data.stats.totalFlows)
          if (typeof data.stats.totalAutomations === 'number') setAutosCount(data.stats.totalAutomations)
          if (typeof data.stats.draftAutomations === 'number') setDraftAutosCount(data.stats.draftAutomations)
          if (typeof data.stats.totalContacts === 'number') setContactsCount(data.stats.totalContacts)
          if (typeof data.stats.totalDeals === 'number') setDealsCount(data.stats.totalDeals)
          if (typeof data.stats.totalDealValue === 'number') setDealValue(data.stats.totalDealValue)
          if (typeof data.stats.wonDeals === 'number') setWonDeals(data.stats.wonDeals)
          if (typeof data.stats.totalBroadcasts === 'number') setBroadcastsCount(data.stats.totalBroadcasts)
        }
      })
      .catch((err) => console.warn('Failed to fetch CRM dashboard metrics:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full bg-slate-50 text-slate-900">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              WhatsApp CRM &amp; Automation Hub
            </h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Commercial Scale
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Automated 24/7 conversational flows, instant keyword triggers, and rich photo media cards for Choutuppal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV Flows</span>
          </button>
          <a
            href="/csv/sample_flows.csv"
            download="sample_flows.csv"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Interactive Flows</span>
            <Workflow className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{flowsCount}</p>
          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Pre-connected welcome_menu</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Automations (Rules)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{autosCount}</p>
          <p className="text-[11px] text-amber-600 font-medium">
            {draftAutosCount} Draft Rules • Staged Inactive
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Verified Contacts</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{contactsCount}</p>
          <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Synced from Directory Listings</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Deals &amp; Pipeline</span>
            <Briefcase className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{dealValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-teal-700 font-medium">
            {dealsCount} Deals ({wonDeals} Won)
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Bot Engine Numbers</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-0.5 font-mono text-xs font-semibold">
            <div className="text-emerald-700">🤖 9494348175 (Bot)</div>
            <div className="text-slate-700">📱 9441348175 (Media)</div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flows Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">39 Production Flows</h3>
                <p className="text-[11px] text-slate-500">
                  Welcome, Day 1-5 Nurture, Govt Gates, Marketplace, B2B Hubs
                </p>
              </div>
            </div>
            <Link
              href="/crm/flows"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Welcome Flow &amp; Step 2</span>
                <p className="text-[11px] text-slate-500">Trigger: Hi, Hello, నమస్కారం, Start</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Digital Agency &amp; Franchise Hub</span>
                <p className="text-[11px] text-slate-500">Trigger: Franchise, వైట్-లేబుల్, B2B</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Jobs, Rentals &amp; Bazaar Deals</span>
                <p className="text-[11px] text-slate-500">Trigger: ఉద్యోగాలు, అద్దెలు, ఆఫర్లు</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Automations Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">179 Automation Rules</h3>
                <p className="text-[11px] text-slate-500">
                  Wards 1-20, Emergency 108/100, MRO, Banks, &amp; Directory Lookups
                </p>
              </div>
            </div>
            <Link
              href="/crm/automations"
              className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Emergency Services &amp; Police</span>
                <p className="text-[11px] text-slate-500">100, 108, 101, Choutuppal CI/SI Contacts</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Instant Reply
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Ward Community Groups (1 to 20)</span>
                <p className="text-[11px] text-slate-500">Individual WhatsApp community group invites</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Auto Tagged
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Directory Category Cards with Photos</span>
                <p className="text-[11px] text-slate-500">Automobile, Medical, Kirana, Plumbers, Electrical</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Photo Attached
              </span>
            </div>
          </div>
        </div>

        {/* Deals & Pipeline Quick Access */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl border border-teal-200">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Deals &amp; Pipelines</h3>
                <p className="text-[11px] text-slate-500">
                  Track buyer/seller leads, commercial packages, and revenue stages
                </p>
              </div>
            </div>
            <Link
              href="/crm/pipelines"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              <span>View Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Total Pipeline Value</span>
                <p className="text-[11px] text-slate-500">Across 6 Kanban stages</p>
              </div>
              <span className="text-xs font-bold text-teal-700">
                ₹{dealValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Won Deals Conversion</span>
                <p className="text-[11px] text-slate-500">Successfully closed commercial transactions</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {wonDeals} Closed Won
              </span>
            </div>
          </div>
        </div>

        {/* Broadcasts & Inbox Quick Access */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Broadcasts &amp; Shared Inbox</h3>
                <p className="text-[11px] text-slate-500">
                  Targeted segment broadcasts and multi-agent WhatsApp desk
                </p>
              </div>
            </div>
            <Link
              href="/admin/broadcasts"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <span>Broadcasts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Staged Campaigns</span>
                <p className="text-[11px] text-slate-500">Audience segmentation &amp; staging</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {broadcastsCount} Staged (Sandbox)
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Deep-Linked Shared Inbox</span>
                <p className="text-[11px] text-slate-500">Phone-based chat assignment &amp; staff routing</p>
              </div>
              <Link
                href="/admin/inbox"
                className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-0.5 rounded-full font-bold transition-colors"
              >
                Open Inbox →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <FlowImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(count) => {
          setFlowsCount(count)
          alert(`Successfully imported ${count} flows with custom buttons & images!`)
        }}
      />
    </div>
  )
}
