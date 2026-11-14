'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LogIn,
  Lock,
  Mail,
  Phone,
  MessageCircle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'email' | 'whatsapp'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  // Automatically redeem magic token if present in query string
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const magicToken = params.get('magic')
    const redirectParam = params.get('redirect') || '/dashboard'

    if (magicToken) {
      setLoading(true)
      fetch(`/api/auth/magic-link?token=${encodeURIComponent(magicToken)}&redirect=${encodeURIComponent(redirectParam)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('Successfully authenticated via WhatsApp Magic Link!')
            const dest = data.role === 'SUPER_ADMIN' || data.role === 'FRANCHISE_ADMIN' ? '/admin/dashboard' : '/dashboard'
            router.push(data.redirect || dest)
          } else {
            toast.error(data.error || 'Magic link is invalid or has expired.')
          }
        })
        .catch(() => {
          toast.error('Network error while validating login link.')
        })
        .finally(() => setLoading(false))
    }
  }, [router])

  // Unified Email / Password Sign In via /api/auth/login
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials. Please try again.')
      }

      toast.success(data.message || 'Login successful! Redirecting to dashboard...')
      const dest = data.role === 'SUPER_ADMIN' || data.role === 'FRANCHISE_ADMIN' ? '/admin/dashboard' : '/dashboard'
      router.push(data.redirect || dest)
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  // 1-Click WhatsApp Magic Link Login
  async function handleWhatsAppMagicLogin(e: React.FormEvent) {
    e.preventDefault()
    const clean = phone.replace(/\D/g, '')
    if (!clean || clean.length < 10) {
      toast.error('Please enter a valid 10-digit WhatsApp number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate WhatsApp login link')
      }

      setMagicSent(true)
      toast.success('WhatsApp Magic Link ready!')

      if (data.verifyUrl) {
        const verifyRes = await fetch(data.verifyUrl)
        const verifyData = await verifyRes.json()
        if (verifyData.success) {
          toast.success('Verified automatically! Redirecting...')
          const dest = verifyData.role === 'SUPER_ADMIN' || verifyData.role === 'FRANCHISE_ADMIN' ? '/admin/dashboard' : '/dashboard'
          router.push(verifyData.redirect || dest)
          return
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send WhatsApp login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mb-6 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Choutuppal.in
        </Link>

        <div className="flex items-center justify-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl shadow-lg shadow-emerald-600/25">
            CP
          </span>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            Choutuppal<span className="text-emerald-600">.in</span>
          </span>
        </div>
        <h2 className="mt-3 text-center text-xl font-black text-slate-900">
          Sign In to Portal (లాగిన్ చేయండి)
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          User Dashboard, Merchant Store, WhatsApp CRM &amp; Admin Console
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {/* TAB SELECTOR */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                tab === 'email'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => setTab('whatsapp')}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              1-Click WhatsApp
            </button>
          </div>

          {/* TAB 1: EMAIL & PASSWORD */}
          {tab === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address or WhatsApp Phone
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@choutuppal.in"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In to Dashboard</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: WHATSAPP MAGIC LINK */
            <form onSubmit={handleWhatsAppMagicLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your WhatsApp Number (10 digits)
                </label>
                <div className="relative flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9441348175"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-r-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  We verify your account instantly via Meta Cloud WhatsApp API. No password needed!
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-60 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    <span>1-Click Sign In via WhatsApp</span>
                  </>
                )}
              </button>

              {magicSent && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Link Generated!</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Your session has been validated and you are being redirected automatically.
                  </p>
                </div>
              )}
            </form>
          )}

          {/* BOTTOM REGISTRATION LINK */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New business owner or citizen in Choutuppal?{' '}
              <Link
                href="/register"
                className="font-bold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-500/50 hover:decoration-emerald-700"
              >
                Register Your Shop Free &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
