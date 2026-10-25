'use client'

import React, { useState, useEffect } from 'react'
import {
  GitBranch,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Phone,
  MessageCircle,
  ExternalLink,
  Layers,
  Save,
  Tag,
  Settings,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Check,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'
import { WhatsAppFlowSimulator } from '@/components/admin/whatsapp-simulator'
import { Listing, CRMFlowConfig } from '@/lib/types'
import { STANDARD_CATEGORIES } from '@/lib/constants'

export default function CRMFlowsPage() {
  const [flows, setFlows] = useState<CRMFlowConfig[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  // Config State
  const [sendPhotos, setSendPhotos] = useState(true)
  const [includeCallButton, setIncludeCallButton] = useState(true)
  const [includeWaButton, setIncludeWaButton] = useState(true)
  const [includeWebButton, setIncludeWebButton] = useState(true)
  const [activeCategories, setActiveCategories] = useState<string[]>(
    STANDARD_CATEGORIES.slice(0, 8).map((c) => c.slug),
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const [flowsRes, listingsRes] = await Promise.all([
        fetch('/api/crm/flows'),
        fetch('/api/admin/listings'),
      ])
      const flowsData = await flowsRes.json()
      const listingsData = await listingsRes.json()

      if (flowsData.success) {
        setFlows(flowsData.flows || [])
      }
      if (listingsData.success) {
        setListings(listingsData.listings || [])
      }
    } catch (err) {
      console.warn('Flow fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggleCategory = (slug: string) => {
    setActiveCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  const handleSaveFlowSettings = async () => {
    try {
      const res = await fetch('/api/crm/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'WhatsApp Category Browser & Photos Dispatch',
          triggerKeyword: 'SERVICES',
          sendPhotos,
          actionButtons: [
            ...(includeCallButton ? [{ id: 'btn_call', title: '📞 Call', action: 'TEL' }] : []),
            ...(includeWaButton ? [{ id: 'btn_wa', title: '💬 WhatsApp', action: 'WA' }] : []),
            ...(includeWebButton ? [{ id: 'btn_web', title: '🌐 View Web', action: 'WEB' }] : []),
          ],
          categoriesOrder: activeCategories,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 3000)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="WhatsApp CRM Automation Flows & Bot"
        subtitle="Configure Interactive Category Buttons, Listing Photo Cards, and test in real-time"
        onRefresh={fetchData}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-800/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                WhatsApp Bot Active on Official Meta Cloud API
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                When customers chat on WhatsApp, the bot displays interactive Category Buttons and dispatches Listings with their Hero Photos, Contact Details, and Action Buttons!
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveFlowSettings}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all shrink-0 active:scale-95"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Flow Updated!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Flow Settings</span>
              </>
            )}
          </button>
        </div>

        {/* 2-Column Grid: Config Controls (Left) & WhatsApp Simulator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Flow Rules & Category Buttons Configuration (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Media & Photos Dispatch Engine */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">
                  1. Listing Photos &amp; Media Dispatch Engine
                </h4>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <label className="flex items-start gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={sendPhotos}
                    onChange={(e) => setSendPhotos(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-white block">
                      Send High-Resolution Listing Cover Photo in WhatsApp Chat
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Attaches the listing cover image as an official Meta Cloud Media Card with title, price, address &amp; phone in the caption.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons Toggles */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Interactive Action Buttons on Photo Card:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCallButton}
                      onChange={(e) => setIncludeCallButton(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>📞 Call Now</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWaButton}
                      onChange={(e) => setIncludeWaButton(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>💬 WhatsApp Chat</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeWebButton}
                      onChange={(e) => setIncludeWebButton(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>🌐 Website Link</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Interactive Category List Buttons Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-sm text-white">
                    2. Interactive Category Buttons ({activeCategories.length} Active)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Displayed in WhatsApp Interactive List
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Select which categories appear as primary interactive buttons when a user clicks &quot;2. 🏪 వ్యాపారాలు &amp; సేవలు&quot;:
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {STANDARD_CATEGORIES.map((cat) => {
                  const isSelected = activeCategories.includes(cat.slug)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.slug)}
                      className={`p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-600 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold truncate">{cat.telugu}</p>
                        <p className="text-[10px] text-slate-500 truncate">{cat.name}</p>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                          isSelected ? 'bg-emerald-500 text-white' : 'border border-slate-700'
                        }`}
                      >
                        {isSelected && '✓'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Phone Mockup Simulator (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Live Interactive WhatsApp Bot Simulator
              </span>
              <span className="text-[11px] text-slate-500">Tap buttons to test flow</span>
            </div>

            <WhatsAppFlowSimulator listings={listings} />
          </div>
        </div>
      </div>
    </div>
  )
}
