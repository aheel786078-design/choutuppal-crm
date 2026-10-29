import Link from 'next/link'
import { ArrowLeft, Home, Search, Compass, Phone, MessageCircle, AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        {/* ICON */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
          <Compass className="h-10 w-10 animate-spin-slow text-amber-600" />
        </div>

        {/* HEADINGS */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900">
            <AlertCircle className="h-3.5 w-3.5" /> 404 — Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            పేజీ కనుగొనబడలేదు
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            మీరు వెతుకుతున్న పేజీ అందుబాటులో లేదు లేదా తొలగించబడింది. దయచేసి హోమ్‌పేజీకి తిరిగి వెళ్లండి లేదా డైరెక్టరీలో శోధించండి.
          </p>
        </div>

        {/* QUICK SEARCH BAR */}
        <form action="/listings" method="GET" className="relative flex items-center">
          <input
            type="text"
            name="q"
            placeholder="Search shops, services, doctors..."
            className="w-full rounded-2xl border border-slate-200 py-3 pl-4 pr-12 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
          />
          <button
            type="submit"
            aria-label="Search directory"
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 px-4 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Home className="h-4 w-4" />
            Home (హోమ్)
          </Link>
          <Link
            href="/listings"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <Compass className="h-4 w-4" />
            All Listings
          </Link>
        </div>

        {/* WHATSAPP HELPLINE */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>Need help?</span>
          <a
            href="https://wa.me/919441348175?text=Hello%20Mana%20Choutuppal%2C%20I%20need%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp Helpline
          </a>
        </div>
      </div>
    </div>
  )
}
