'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log client error to console
    console.error('App Runtime Error:', error)
  }, [error])

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        {/* ICON */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5">
          <AlertTriangle className="h-10 w-10 text-rose-600" />
        </div>

        {/* HEADINGS */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900">
            System Notice
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            సాంకేతిక సమస్య ఏర్పడింది
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            పేజీ లోడ్ చేయడంలో తాత్కాలిక సమస్య ఎదురైంది. దయచేసి మళ్లీ ప్రయత్నించండి లేదా హోమ్‌పేజీకి తిరిగి వెళ్లండి.
          </p>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Retry (మళ్లీ ప్రయత్నించండి)
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 px-4 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm active:scale-95"
          >
            <Home className="h-4 w-4" />
            Home (హోమ్)
          </Link>
        </div>

        {/* HELPLINE */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>సహాయం కోసం:</span>
          <a
            href="https://wa.me/919441348175?text=Hello%20Mana%20Choutuppal%2C%20I%20faced%20an%20issue%20on%20the%20website."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Support
          </a>
        </div>
      </div>
    </div>
  )
}
