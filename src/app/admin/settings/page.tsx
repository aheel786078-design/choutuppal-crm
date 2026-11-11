'use client'

import React, { useState, useEffect } from 'react'
import { Settings, ShieldCheck, Check, Key, Smartphone, Globe, Save, Loader2, AlertCircle, Copy, Info } from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

export default function SettingsAdminPage() {
  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [verifyToken, setVerifyToken] = useState('choutuppal_verify_token')
  const [syncListings, setSyncListings] = useState(true)
  const [autoSendPhoto, setAutoSendPhoto] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <AdminHeader
        title="WhatsApp Cloud API & System Settings"
        subtitle="Manage Meta Cloud API credentials, webhook endpoints and synchronization rules"
        onRefresh={fetchSettings}
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
        {saved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp API credentials and CRM sync rules updated successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Meta WhatsApp Cloud API Configuration</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Permanent Access Token (System User Token)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Leave unchanged or enter new token"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              From Meta Business Developer Portal &gt; WhatsApp &gt; API Setup
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="e.g. 109848012345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="choutuppal_verify_token"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-xs text-slate-900">CRM & Directory Sync Rules</h4>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Automatic Merchant Sync</span>
                <span className="text-[11px] text-slate-500">Sync listing owners to CRM Contacts as WON merchant leads</span>
              </div>
              <input
                type="checkbox"
                checked={syncListings}
                onChange={(e) => setSyncListings(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Auto-Send Photo Cards in Chat</span>
                <span className="text-[11px] text-slate-500">Send rich photo cards automatically when matching directory inquiries</span>
              </div>
              <input
                type="checkbox"
                checked={autoSendPhoto}
                onChange={(e) => setAutoSendPhoto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Live Webhook Callback URL (Paste in Meta Developer Console)
              </label>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-emerald-700 flex items-center justify-between gap-2">
                <span className="truncate select-all">{webhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://choutuppal-crm.vercel.app/api/whatsapp/webhook')}</span>
                <button
                  type="button"
                  onClick={() => {
                    const url = webhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://choutuppal-crm.vercel.app/api/whatsapp/webhook')
                    navigator.clipboard.writeText(url)
                    setCopiedUrl(true)
                    setTimeout(() => setCopiedUrl(false), 2000)
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Meta Developer Console లో మెసేజ్ రిప్లై రావడానికి ముఖ్యమైన 3 సెట్టింగ్‌లు:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] leading-relaxed text-blue-800">
                <li>
                  <strong>1. Callback URL:</strong> పైన ఉన్న <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono">https://choutuppal-crm.vercel.app/api/whatsapp/webhook</code> లింక్ మాత్రమే పేస్ట్ చేయండి.
                </li>
                <li>
                  <strong>2. Verify Token:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono">{verifyToken || 'choutuppal_verify_token'}</code> ఇచ్చి <em>Verify and Save</em> కొట్టండి.
                </li>
                <li>
                  <strong>3. Webhook Fields (అత్యంత ముఖ్యం):</strong> Meta లో <em>Webhook Fields</em> కింద <strong>Manage</strong> క్లిక్ చేసి <strong><code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-bold font-mono">messages</code></strong> బాక్స్‌ను టిక్ (Subscribe) చేయాలి. ఇది చేయకపోతే యూజర్లు పంపే మెసేజ్‌లు CRM కి రావు.
                </li>
                <li>
                  <strong>4. Access Token:</strong> 24 గంటల Temporary టోకెన్ బదులు Meta Business Settings లో <em>System User Token</em> ను వాడండి.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
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

