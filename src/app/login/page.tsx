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
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Loader2,
  Building2,
  UserCheck,
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
    const redirectParam = params.get('redirect') || '/admin/dashboard'

    if (magicToken) {
      setLoading(true)
      fetch(`/api/auth/magic-link?token=${encodeURIComponent(magicToken)}&redirect=${encodeURIComponent(redirectParam)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            toast.success('Successfully authenticated via WhatsApp Magic Link!')
            router.push(data.redirect || '/admin/dashboard')
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
      router.push(data.redirect || '/admin/dashboard')
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
        throw new Error(data.error || 'Failed to generate Magic Link')
      }

      setMagicSent(true)
      toast.success('1-Click Magic Link generated!')

      // Direct local session login shortcut
      if (data.token) {
        const verifyRes = await fetch(`/api/auth/magic-link?token=${encodeURIComponent(data.token)}`)
        const verifyData = await verifyRes.json()
        if (verifyData.success) {
          toast.success(`Authenticated as ${verifyData.role}!`)
          router.push(verifyData.redirect || '/admin/dashboard')
          return
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send WhatsApp login')
    } finally {
      setLoading(false)
    }
  }

  // Quick Preset Helper for One-Click Admin Selection
  function fillPreset(pEmail: string, pPass: string) {
    setEmail(pEmail)
    setPassword(pPass)
    setTab('email')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Choutuppal.in
        </Link>

        <div className="flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl shadow-lg">
            C
          </span>
          <span className="text-2xl font-black text-white tracking-tight">
            Choutuppal<span className="text-amber-400">.in</span>
          </span>
        </div>
        <h2 className="mt-3 text-center text-lg font-extrabold text-white">
          Sign In to Portal (లాగిన్ చేయండి)
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Super Admin, Franchise Admins, WhatsApp CRM &amp; Merchant Dashboard
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800/90 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-slate-700/80">
          {/* TAB SELECTOR */}
          <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-2xl mb-6 border border-slate-700">
            <button
              type="button"
              onClick={() => setTab('email')}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                tab === 'email'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => setTab('whatsapp')}
              className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                tab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
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
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </button>
            </form>
          ) : (
            /* TAB 2: 1-CLICK WHATSAPP MAGIC LINK */
            <form onSubmit={handleWhatsAppMagicLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  WhatsApp Phone Number (వాట్సాప్ నెంబర్)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9441348175"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  We generate an instant 1-click single-use signed cryptographic token.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                1-Click WhatsApp Instant Sign In
              </button>

              {magicSent ? (
                <div className="bg-emerald-950/60 border border-emerald-700 p-3 rounded-xl text-center">
                  <p className="text-xs text-emerald-300 font-semibold">
                    ✓ Authenticating your session now...
                  </p>
                </div>
              ) : null}
            </form>
          )}

          {/* QUICK PRESETS FOR INSTANT ADMIN ACCESS */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-2.5">
              Instant Admin &amp; Franchise Logins
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillPreset('admin@choutuppal.in', 'Choutuppal@2026')}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white transition text-left cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-white text-[10px]">Super Admin</div>
                  <div className="text-[9px] text-slate-400">admin@choutuppal.in</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillPreset('nalgonda.admin@choutuppal.in', 'Nalgonda@2026')}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-white transition text-left cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-white text-[10px]">Nalgonda Admin</div>
                  <div className="text-[9px] text-slate-400">nalgonda.admin</div>
                </div>
              </button>
            </div>
          </div>

          {/* QUICK DIRECT ACCESS PORTALS */}
          <div className="mt-4 pt-4 border-t border-slate-700/80">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin"
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700/80 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-blue-400" />
                Admin Panel
              </Link>
              <Link
                href="/crm"
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-700/80 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                WhatsApp CRM
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-amber-400 font-bold hover:underline">
              Register Merchant Free (ఖాతా తెరవండి)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
