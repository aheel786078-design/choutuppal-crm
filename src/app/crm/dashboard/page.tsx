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
  Edit3,
  Bot,
  Flame,
  ShieldAlert,
  Building2,
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'

export default function CRMDashboardPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [flowsCount, setFlowsCount] = useState<number>(1)
  const [autosCount, setAutosCount] = useState<number>(179)
  const [draftAutosCount, setDraftAutosCount] = useState<number>(179)
  const [contactsCount, setContactsCount] = useState<number>(211)
  const [dealsCount, setDealsCount] = useState<number>(4)
  const [dealValue, setDealValue] = useState<number>(450000)
  const [wonDeals, setWonDeals] = useState<number>(1)
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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full bg-slate-50 text-slate-900">
      {/* 1. TOP HERO COMMAND BAR (Royal Blue & Amber Brand Identity) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 p-6 sm:p-7 text-white shadow-lg border border-blue-700/50">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                WhatsApp CRM &amp; Bot Engine Active
              </span>
              <span className="text-xs text-blue-200 hidden sm:inline">•</span>
              <span className="text-xs text-blue-200 font-mono">Cloud API 9494348175</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              వాట్సాప్ CRM &amp; ఆటోమేషన్ హబ్
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              24/7 ఆటోమేటెడ్ రిప్లైలు, ఇంటరాక్టివ్ బటన్లు, ఫోటో కార్డ్స్, లైవ్ టీమ్ ఇన్‌బాక్స్ మరియు కస్టమర్ లీడ్ మేనేజ్‌మెంట్.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Link
              href="/crm/flows"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4 stroke-[2.5]" />
              <span>✏️ ఎడిట్ ఫ్లో (Edit Flow)</span>
            </Link>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-blue-200" />
              <span>ఇంపోర్ట్ CSV (Import)</span>
            </button>
            <Link
              href="/admin/inbox"
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all active:scale-95"
              title="Open Team Inbox"
            >
              <MessageSquare className="w-4 h-4 text-amber-300" />
              <span>టీమ్ ఇన్‌బాక్స్ (Inbox)</span>
            </Link>
            <a
              href="/csv/sample_flows.csv"
              download="sample_flows.csv"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all active:scale-95"
              title="Download Sample CSV"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. QUICK STARTER PRESET LAUNCHERS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              త్వరిత ఫ్లో టెంప్లేట్లు (Quick Flow Presets)
            </h3>
          </div>
          <Link href="/crm/flows" className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1">
            <span>Manage All Flows &rarr;</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <Link
            href="/crm/flows"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold shrink-0">
              🤖
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">వెల్‌కమ్ బాట్</p>
              <p className="text-[10px] text-slate-500 truncate">Welcome Bot</p>
            </div>
          </Link>

          <Link
            href="/crm/flows"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 font-bold shrink-0">
              🔍
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">సేవలు &amp; షాపులు</p>
              <p className="text-[10px] text-slate-500 truncate">Services Menu</p>
            </div>
          </Link>

          <Link
            href="/crm/flows"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold shrink-0">
              🎟️
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">నేటి డీల్స్ &amp; ఆఫర్స్</p>
              <p className="text-[10px] text-slate-500 truncate">Today's Deals</p>
            </div>
          </Link>

          <Link
            href="/crm/flows"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold shrink-0">
              🚨
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">ఎమర్జెన్సీ నంబర్లు</p>
              <p className="text-[10px] text-slate-500 truncate">Emergency 108/100</p>
            </div>
          </Link>

          <Link
            href="/crm/flows"
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50 hover:border-blue-300 transition text-left"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 font-bold shrink-0">
              🏠
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">రియల్ ఎస్టేట్ ప్లాట్స్</p>
              <p className="text-[10px] text-slate-500 truncate">Real Estate Hub</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. 5 KEY METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>ఇంటరాక్టివ్ ఫ్లోలు</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Workflow className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{flowsCount}</p>
          <p className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>welcome_menu Active</span>
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>ఆటోమేషన్ రూల్స్</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{autosCount}</p>
          <p className="text-[11px] text-amber-700 font-bold">
            {draftAutosCount} Rules • Instant Replies
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>వెరిఫైడ్ కాంటాక్ట్స్</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{contactsCount}</p>
          <p className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Synced from Directory</span>
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>డీల్స్ &amp; పైప్‌లైన్</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            ₹{dealValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-indigo-700 font-bold">
            {dealsCount} Deals ({wonDeals} Won)
          </p>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-2 shadow-xs hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>బాట్ నంబర్లు (Bot Phone)</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5 font-mono text-xs font-bold">
            <div className="text-blue-700">🤖 9494348175 (Bot)</div>
            <div className="text-slate-600">📱 9441348175 (Media)</div>
          </div>
        </div>
      </div>

      {/* 4. 4 OPERATIONAL GRID MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Interactive Flows */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Interactive Production Flows</h3>
                <p className="text-[11px] text-slate-500">
                  Welcome Menu, Day 1-5 Nurture, Emergency, Marketplace Hubs
                </p>
              </div>
            </div>
            <Link
              href="/crm/flows"
              className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
            >
              <span>Manage Flows</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Welcome Flow &amp; Quick Buttons</span>
                <p className="text-[11px] text-slate-500">Triggers: Hi, Hello, నమస్కారం, Start, Menu</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Services &amp; Directory Navigator</span>
                <p className="text-[11px] text-slate-500">Triggers: Services, టాక్సీ, ప్లంబర్, ఆటో</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Daily Deals &amp; Vouchers Rail</span>
                <p className="text-[11px] text-slate-500">Triggers: ఆఫర్లు, Deals, డిస్కౌంట్, ప్లాట్స్</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Module 2: Automations */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">179 Automation Rules</h3>
                <p className="text-[11px] text-slate-500">
                  Wards 1-20, Emergency 108/100, MRO, Banks &amp; Keyword Matchers
                </p>
              </div>
            </div>
            <Link
              href="/crm/automations"
              className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
            >
              <span>View Rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Emergency Services &amp; Police</span>
                <p className="text-[11px] text-slate-500">100, 108, 101, Choutuppal CI/SI Contacts</p>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                Instant Reply
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Ward Community Groups (1 to 20)</span>
                <p className="text-[11px] text-slate-500">Individual WhatsApp community group invites</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Auto Tagged
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between hover:bg-slate-100 transition">
              <div>
                <span className="font-bold text-slate-900">Directory Category Cards with Photos</span>
                <p className="text-[11px] text-slate-500">Automobile, Medical, Kirana, Plumbers, Electrical</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                Photo Attached
              </span>
            </div>
          </div>
        </div>

        {/* Module 3: Deals & Pipeline */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-200">
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
              className="text-xs text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
            >
              <span>View Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Total Pipeline Value</span>
                <p className="text-[11px] text-slate-500">Across 6 commercial stages</p>
              </div>
              <span className="text-xs font-black text-indigo-700">
                ₹{dealValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Won Deals Conversion</span>
                <p className="text-[11px] text-slate-500">Successfully closed commercial packages</p>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                {wonDeals} Closed Won
              </span>
            </div>
          </div>
        </div>

        {/* Module 4: Broadcasts & Inbox */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-sky-50 text-sky-700 rounded-2xl border border-sky-200">
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
              href="/admin/inbox"
              className="text-xs text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1"
            >
              <span>Open Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Staged Campaigns (Sandbox)</span>
                <p className="text-[11px] text-slate-500">Audience segmentation &amp; staging</p>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-bold">
                {broadcastsCount} Staged
              </span>
            </div>
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">Deep-Linked Shared Team Inbox</span>
                <p className="text-[11px] text-slate-500">Phone-based chat assignment &amp; staff routing</p>
              </div>
              <Link
                href="/admin/inbox"
                className="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-200 px-2.5 py-1 rounded-lg font-bold transition-colors"
              >
                Launch Chat &rarr;
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
