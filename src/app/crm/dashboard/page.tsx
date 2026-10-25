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
} from 'lucide-react'
import { FlowImportModal } from '@/components/crm/flow-import-modal'

export default function CRMDashboardPage() {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [flowsCount, setFlowsCount] = useState(39)
  const [autosCount, setAutosCount] = useState(179)
  const [contactsCount, setContactsCount] = useState(211)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-900/40 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-wide">
              WhatsApp CRM &amp; Automation Hub
            </h1>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              Commercial Scale
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Automated 24/7 conversational flows, instant keyword triggers, and rich photo media cards for Choutuppal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Interactive Flows</span>
            <Workflow className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{flowsCount}</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Pre-connected with welcome_menu</span>
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Automations (Rules)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{autosCount}</p>
          <p className="text-[11px] text-slate-400">
            Inbound triggers, Wards 1-20, &amp; services
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Verified Contacts</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{contactsCount}</p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Synced from Directory Listings</span>
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bot Engine Numbers</span>
            <Phone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-0.5 font-mono text-xs">
            <div className="text-emerald-400">🤖 9494348175 (Bot)</div>
            <div className="text-blue-400">📱 9441348175 (Media)</div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flows Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">39 Production Flows</h3>
                <p className="text-[11px] text-slate-400">
                  Welcome, Day 1-5 Nurture, Govt Gates, Marketplace, B2B Hubs
                </p>
              </div>
            </div>
            <Link
              href="/crm/flows"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Welcome Flow &amp; Step 2</span>
                <p className="text-[11px] text-slate-400">Trigger: Hi, Hello, నమస్కారం, Start</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Digital Agency &amp; Franchise Hub</span>
                <p className="text-[11px] text-slate-400">Trigger: Franchise, వైట్-లేబుల్, B2B</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Jobs, Rentals &amp; Bazaar Deals</span>
                <p className="text-[11px] text-slate-400">Trigger: ఉద్యోగాలు, అద్దెలు, ఆఫర్లు</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Automations Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">179 Automation Rules</h3>
                <p className="text-[11px] text-slate-400">
                  Wards 1-20, Emergency 108/100, MRO, Banks, &amp; Directory Lookups
                </p>
              </div>
            </div>
            <Link
              href="/crm/automations"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Emergency Services &amp; Police</span>
                <p className="text-[11px] text-slate-400">100, 108, 101, Choutuppal CI/SI Contacts</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Instant Reply
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Ward Community Groups (1 to 20)</span>
                <p className="text-[11px] text-slate-400">Individual WhatsApp community group invites</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Auto Tagged
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Directory Category Cards with Photos</span>
                <p className="text-[11px] text-slate-400">Automobile, Medical, Kirana, Plumbers, Electrical</p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Photo Attached
              </span>
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
