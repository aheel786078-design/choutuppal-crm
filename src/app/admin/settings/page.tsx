'use client'

import React, { useState } from 'react'
import { Settings, ShieldCheck, Check, Key, Smartphone, Globe, Save } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

export default function SettingsAdminPage() {
  const [token, setToken] = useState('EAAG... (Meta Cloud API System Token)')
  const [phoneId, setPhoneId] = useState('109848012345678')
  const [verifyToken, setVerifyToken] = useState('choutuppal_verify_token')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="WhatsApp Cloud API & System Settings"
        subtitle="Manage Meta Cloud API credentials, webhook endpoints and synchronization rules"
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
        {saved && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp API credentials updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Meta WhatsApp Cloud API Configuration</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WhatsApp Permanent Access Token (System User Token)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              From Meta Business Developer Portal &gt; WhatsApp &gt; API Setup
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Live Webhook Callback URL (Paste in Meta Developer Console)
            </label>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400">
              https://choutuppal.in/api/webhooks/whatsapp
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
