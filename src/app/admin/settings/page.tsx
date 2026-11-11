'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  ShieldCheck,
  Check,
  Key,
  Smartphone,
  Globe,
  Save,
  Loader2,
  AlertCircle,
  Copy,
  Info,
  Send,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Radio,
} from 'lucide-react'
import { AdminHeader } from '@/components/admin/admin-header'

interface DiagnosticResult {
  webhook: { ok: boolean; status: string; url: string; details?: string }
  metaPhoneApi: { ok: boolean; status: string; details?: any; error?: string; hint?: string }
  metaWabaApi?: { ok: boolean; status: string; details?: any; error?: string }
  testMessage?: { ok: boolean; status: string; recipientPhone?: string; details?: string }
  overallStatus: 'PASS' | 'PARTIAL' | 'FAIL'
}

interface ActivityItem {
  id: string
  phone: string
  contactName?: string
  direction: 'inbound' | 'outbound'
  messageText: string
  status: string
  errorDetails?: string
  createdAt: string
}

export default function SettingsAdminPage() {
  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [verifyToken, setVerifyToken] = useState('choutuppal_verify_token')
  const [syncListings, setSyncListings] = useState(true)
  const [autoSendPhoto, setAutoSendPhoto] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Testing API Connection State
  const [testingConnection, setTestingConnection] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [sendingTestMsg, setSendingTestMsg] = useState(false)
  const [testMsgStatus, setTestMsgStatus] = useState<{ ok: boolean; message: string } | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        setPhoneId(data.settings.whatsappPhoneNumberId || '')
        setWabaId(data.settings.whatsappBusinessAccountId || '')
        setVerifyToken(data.settings.whatsappVerifyToken || 'choutuppal_verify_token')
        setToken(data.settings.maskedToken || '')
        setSyncListings(data.settings.syncListingsToCrmFlow !== false)
        setAutoSendPhoto(data.settings.autoSendListingPhotoInChat !== false)
        if (data.webhookCallbackUrl) {
          setWebhookUrl(data.webhookCallbackUrl)
        }
        if (data.recentActivity) {
          setRecentActivity(data.recentActivity)
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
          whatsappBusinessAccountId: wabaId,
          whatsappVerifyToken: verifyToken,
          whatsappToken: token,
          syncListingsToCrmFlow: syncListings,
          autoSendListingPhotoInChat: autoSendPhoto,
        }),
      })

      const data = await res.json()
      if (data.success) {
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setSavedAt(timeStr)
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

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setDiagnosticResult(null)
    setTestMsgStatus(null)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/admin/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: phoneId,
          whatsappBusinessAccountId: wabaId,
          whatsappVerifyToken: verifyToken,
          whatsappToken: token,
        }),
      })

      const data = await res.json()
      if (data.success && data.diagnostics) {
        setDiagnosticResult(data.diagnostics)
      } else {
        setErrorMsg(data.error || 'Connection test could not be completed')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error during connection test')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSendTestMessage = async () => {
    if (!testPhone || testPhone.replace(/\D/g, '').length < 10) {
      setTestMsgStatus({ ok: false, message: 'దయచేసి సరైన 10 అంకెల ఫోన్ నంబర్‌ను నమోదు చేయండి' })
      return
    }

    setSendingTestMsg(true)
    setTestMsgStatus(null)

    try {
      const res = await fetch('/api/admin/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappPhoneNumberId: phoneId,
          whatsappBusinessAccountId: wabaId,
          whatsappVerifyToken: verifyToken,
          whatsappToken: token,
          testPhone,
        }),
      })

      const data = await res.json()
      if (data.success && data.diagnostics?.testMessage) {
        const tm = data.diagnostics.testMessage
        if (tm.ok) {
          setTestMsgStatus({
            ok: true,
            message: `✅ టెస్ట్ మెసేజ్ ${testPhone} కు విజయవంతంగా పంపబడింది! మీ వాట్సాప్ చెక్ చేయండి.`,
          })
          fetchSettings() // refresh activity
        } else {
          setTestMsgStatus({
            ok: false,
            message: `❌ టెస్ట్ మెసేజ్ విఫలమైంది: ${tm.details}`,
          })
        }
      } else {
        setTestMsgStatus({
          ok: false,
          message: data.error || 'Failed to dispatch test message',
        })
      }
    } catch (err: any) {
      setTestMsgStatus({
        ok: false,
        message: err.message || 'Network error dispatching test message',
      })
    } finally {
      setSendingTestMsg(false)
    }
  }

  const liveWebhook = webhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : 'https://choutuppal-crm.vercel.app/api/whatsapp/webhook')

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-12">
      <AdminHeader
        title="WhatsApp Cloud API & System Settings"
        subtitle="Manage Meta Cloud API credentials, webhook endpoints, live test connections & incoming logs"
        onRefresh={fetchSettings}
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* Saved Confirmation Alert */}
        {savedAt && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>కాన్ఫిగరేషన్ విజయవంతంగా సేవ్ చేయబడింది! ({savedAt})</span>
            </div>
            <button
              onClick={() => setSavedAt(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. CREDENTIALS CONFIGURATION FORM */}
        <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Meta WhatsApp Cloud API Configuration</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Meta Graph API v21.0
            </span>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Permanent Access Token (System User Token)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAX... (Leave unchanged or paste new permanent token)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Meta Business Settings ➔ System Users ➔ Generate Token (Select <code className="bg-slate-100 px-1 py-0.2 rounded font-mono">whatsapp_business_messaging</code>). 24-hour temporary tokens will stop working after 1 day.
            </span>
          </div>

          {/* Phone Number ID & WABA ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number ID
              </label>
              <input
                type="text"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="e.g. 1417321214786767"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Found in Meta Developer Portal ➔ WhatsApp ➔ API Setup
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="e.g. 109848012345678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Found in Meta Developer Portal ➔ WhatsApp ➔ API Setup (Account ID)
              </span>
            </div>
          </div>

          {/* Webhook Verify Token */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Webhook Verify Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="choutuppal_verify_token"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(verifyToken || 'choutuppal_verify_token')
                  setCopiedToken(true)
                  setTimeout(() => setCopiedToken(false), 2000)
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer transition-all"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Enter this exact string in Meta Developer Portal Webhook Verify Token field
            </span>
          </div>

          {/* Webhook Callback URL */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Live Webhook Callback URL (Copy &amp; Paste in Meta Console)
            </label>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-emerald-700 flex items-center justify-between gap-2">
              <span className="truncate select-all font-semibold">{liveWebhook}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(liveWebhook)
                  setCopiedUrl(true)
                  setTimeout(() => setCopiedUrl(false), 2000)
                }}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer transition-all shadow-2xs"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied URL!' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* Sync Rules */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-xs text-slate-900">CRM &amp; Directory Sync Rules</h4>
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

          {/* Save Button */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              {savedAt ? `చివరిగా సేవ్ చేయబడిన సమయం: ${savedAt}` : 'మార్పులు చేసిన తర్వాత సేవ్ చేయండి'}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>

        {/* 2. TEST API CONNECTION & LIVE DIAGNOSTICS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-900">API Connection Test &amp; Live Diagnostics</h3>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{testingConnection ? 'Testing Connection...' : 'Test API Connection'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-600">
            పై కాన్ఫిగరేషన్ ఆధారంగా Meta Graph API సర్వర్లను మరియు మన Webhook ని తనిఖీ చేసి, కనెక్షన్ యాక్టివ్‌గా ఉందో లేదో క్షణాల్లో నిర్ధారిస్తుంది.
          </p>

          {/* Diagnostic Result Cards */}
          {diagnosticResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Webhook Check */}
                <div className={`p-4 rounded-xl border ${diagnosticResult.webhook.ok ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-slate-700" />
                      1. Webhook Endpoint
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diagnosticResult.webhook.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                      {diagnosticResult.webhook.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {diagnosticResult.webhook.details}
                  </p>
                </div>

                {/* Meta Graph API Check */}
                <div className={`p-4 rounded-xl border ${diagnosticResult.metaPhoneApi.ok ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-slate-700" />
                      2. Meta Graph API
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diagnosticResult.metaPhoneApi.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                      {diagnosticResult.metaPhoneApi.status}
                    </span>
                  </div>
                  {diagnosticResult.metaPhoneApi.ok ? (
                    <div className="text-[11px] text-slate-700 space-y-0.5 font-sans">
                      <div><strong>ఫోన్ నంబర్:</strong> {diagnosticResult.metaPhoneApi.details?.displayPhoneNumber}</div>
                      <div><strong>బిజినెస్ పేరు:</strong> {diagnosticResult.metaPhoneApi.details?.verifiedName}</div>
                      <div><strong>క్వాలిటీ:</strong> <span className="text-emerald-700 font-bold">{diagnosticResult.metaPhoneApi.details?.qualityRating}</span> | <strong>స్థితి:</strong> {diagnosticResult.metaPhoneApi.details?.verificationStatus}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-red-700 space-y-1">
                      <div><strong>ఎర్రర్:</strong> {diagnosticResult.metaPhoneApi.error}</div>
                      {diagnosticResult.metaPhoneApi.hint && (
                        <div className="bg-red-100 p-2 rounded text-[10px] text-red-900 font-medium">
                          💡 <strong>పరిష్కారం:</strong> {diagnosticResult.metaPhoneApi.hint}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Optional WABA Card */}
              {diagnosticResult.metaWabaApi && (
                <div className={`p-3 rounded-xl border ${diagnosticResult.metaWabaApi.ok ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'} text-xs flex items-center justify-between`}>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    WABA Account: {diagnosticResult.metaWabaApi.details?.name || 'Verified'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {diagnosticResult.metaWabaApi.details?.wabaId} ({diagnosticResult.metaWabaApi.details?.currency})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Send Live Test Ping to a Phone Number */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              లైవ్ టెస్ట్ WhatsApp మెసేజ్ పంపండి (Live Test Ping)
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="మీ 10-అంకెల WhatsApp నంబర్ (e.g. 9441348175)"
                className="w-full sm:flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTestMsg}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {sendingTestMsg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{sendingTestMsg ? 'పంపుతోంది...' : 'Send Test WhatsApp'}</span>
              </button>
            </div>

            {testMsgStatus && (
              <div className={`p-3 rounded-xl border text-xs font-medium ${testMsgStatus.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {testMsgStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* 3. RECENT WHATSAPP ACTIVITY & LOGS MONITOR */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">ఇటీవలి WhatsApp సందేశాలు &amp; వెబ్‌హుక్ లాగ్‌లు</h3>
            </div>
            <button
              type="button"
              onClick={fetchSettings}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            మీరు వాట్సాప్ లో మెసేజ్ పంపినప్పుడు మన సర్వర్‌కు చేరిందా లేదా, దానికి రిప్లై ఎలా వెళ్ళింది అనేది ఇక్కడ లైవ్‌గా చూడవచ్చు.
          </p>

          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              ఇంకా ఎలాంటి WhatsApp సందేశాలు నమోదు కాలేదు. టెస్ట్ చేయడానికి మీ వాట్సాప్ నుండి &apos;Hi&apos; అని మెసేజ్ చేయండి.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {recentActivity.map((msg) => (
                <div key={msg.id} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${msg.direction === 'inbound' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {msg.direction === 'inbound' ? '📥 ఇన్కమింగ్' : '📤 అవుట్గోయింగ్ రిప్లై'}
                      </span>
                      <span className="font-mono text-slate-700 font-semibold">{msg.phone}</span>
                      {msg.contactName && <span className="text-slate-500 text-[11px]">({msg.contactName})</span>}
                    </div>
                    <p className="text-slate-800 line-clamp-2 font-sans text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                      {msg.messageText || '(మీడియా లేదా ఇంటరాక్టివ్ బటన్)'}
                    </p>
                    {msg.errorDetails && (
                      <p className="text-red-600 text-[10px] font-medium">
                        ⚠️ ఎర్రర్: {msg.errorDetails}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : msg.status === 'received' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {msg.status}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. META PORTAL SETUP STEP-BY-STEP CHECKLIST */}
        <div className="p-5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Meta Developer Portal లో మెసేజ్ రిప్లై రావడానికి ముఖ్యమైన 4 సెట్టింగ్‌లు:</span>
          </div>
          <ol className="list-decimal pl-5 space-y-2 text-xs leading-relaxed text-blue-800">
            <li>
              <strong>1. Callback URL:</strong> Meta Developer Console ➔ <strong>WhatsApp ➔ Configuration ➔ Webhook</strong> లో <strong>Edit</strong> క్లిక్ చేసి <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono">{liveWebhook}</code> ను పేస్ట్ చేయండి.
            </li>
            <li>
              <strong>2. Verify Token:</strong> <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-950 font-mono">{verifyToken || 'choutuppal_verify_token'}</code> ఇచ్చి <strong>Verify and Save</strong> క్లిక్ చేయండి.
            </li>
            <li>
              <strong>3. Webhook Fields (అత్యంత ముఖ్యం):</strong> Webhook దగ్గర ఉన్న <strong>Manage Webhook fields</strong> క్లిక్ చేసి <strong><code className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold font-mono">messages</code></strong> బాక్స్‌ను తప్పనిసరిగా సబ్‌స్క్రైబ్ (Subscribe) చేయాలి. ఇది చేయకపోతే యూజర్లు పంపే మెసేజ్‌లు సర్వర్‌కు చేరవు.
            </li>
            <li>
              <strong>4. Test Phone Number అయితే (Sandbox):</strong> మీరు Meta ఇచ్చిన Test Phone Number వాడుతుంటే, Meta Developer Console ➔ WhatsApp ➔ API Setup లో <strong>&apos;To Phone Numbers&apos;</strong> లో మీ మొబైల్ నంబర్‌ను యాడ్ చేసి OTP వెరిఫై చేయాలి.
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
