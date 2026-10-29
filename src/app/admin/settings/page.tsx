'use client'

import React, { useState, useEffect } from 'react'
import { Settings, ShieldCheck, Check, Key, Smartphone, Globe, Save, Loader2, AlertCircle } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

export default function SettingsAdminPage() {
  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [verifyToken, setVerifyToken] = useState('choutuppal_verify_token')
  const [syncListings, setSyncListings] = useState(true)
  const [autoSendPhoto, setAutoSendPhoto] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('https://choutuppal.in/api/whatsapp/webhook')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        setPhoneId(data.settings.whatsappPhoneNumberId || '')
        setVerifyToken(data.settings.whatsappVerifyToken || 'choutuppal_verify_token')
        setToken(data.settings.maskedToken || '')
        setSyncListings(data.settings.syncListingsToCrmFlow !== false)
        setAutoSendPhoto(data.settings.autoSendListingPhotoInChat !== false)
        if (data.webhookCallbackUrl) {
          setWebhookUrl(data.webhookCallbackUrl)
        }
      } else {
        setErrorMsg(data.error || 'Failed to load system settings')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: phoneId,
          whatsappVerifyToken: verifyToken,
          whatsappToken: token,
          syncListingsToCrmFlow: syncListings,
          autoSendListingPhotoInChat: autoSendPhoto,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        fetchSettings()
      } else {
        setErrorMsg(data.error || 'Failed to save settings')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error saving settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <AdminHeader
        title="WhatsApp Cloud API & System Settings"
        subtitle="Manage Meta Cloud API credentials, webhook endpoints and synchronization rules"
        onRefresh={fetchSettings}
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
        {saved && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp API credentials and CRM sync rules updated successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-950/80 border border-red-800 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2 shadow">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
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
              placeholder="Leave unchanged or enter new token"
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
                placeholder="e.g. 109848012345678"
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
                placeholder="choutuppal_verify_token"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h4 className="font-semibold text-xs text-white">CRM & Directory Sync Rules</h4>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">Automatic Merchant Sync</span>
                <span className="text-[11px] text-slate-400">Sync listing owners to CRM Contacts as WON merchant leads</span>
              </div>
              <input
                type="checkbox"
                checked={syncListings}
                onChange={(e) => setSyncListings(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">Auto-Send Photo Cards in Chat</span>
                <span className="text-[11px] text-slate-400">Send rich photo cards automatically when matching directory inquiries</span>
              </div>
              <input
                type="checkbox"
                checked={autoSendPhoto}
                onChange={(e) => setAutoSendPhoto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Live Webhook Callback URL (Paste in Meta Developer Console)
            </label>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 flex items-center justify-between">
              <span>{webhookUrl}</span>
              <span className="text-[10px] text-slate-500 font-sans">Verified Route</span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

