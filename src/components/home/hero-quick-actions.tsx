'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  PhoneCall,
  Sparkles,
  Car,
  MessageCircle,
  ShieldAlert,
  ArrowRight,
  BadgeCheck,
  MapPin,
  TrendingUp,
} from 'lucide-react'

const QUICK_SEARCH_CHIPS = [
  { label: '🏥 ఆస్పత్రులు', query: 'హాస్పిటల్' },
  { label: '🚖 టాక్సీ & క్యాబ్స్', query: 'Taxi' },
  { label: '🏨 హోటల్స్ & ఫుడ్', query: 'హోటల్' },
  { label: '⚡ ఎలక్ట్రీషియన్లు', query: 'Electrician' },
  { label: '🏡 ఓపెన్ ప్లాట్లు', query: 'Plots' },
  { label: '🛒 కిరాణా & మార్కెట్', query: 'కిరాణా' },
]

export function HeroQuickActions() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      router.push(`/listings?search=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/listings')
    }
  }

  const handleChipClick = (query: string) => {
    setSearchQuery(query)
    router.push(`/listings?search=${encodeURIComponent(query)}`)
  }

  return (
    <section className="relative w-full overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-900/90 via-slate-900/95 to-slate-950 p-5 sm:p-7 shadow-xl text-white">
      {/* Background Decorative Glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5">
        {/* Top Town Badge & Verified Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>మన చౌటుప్పల్ అధికారిక లోకల్ సూపర్ యాప్</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1 font-medium">
              <BadgeCheck className="h-4 w-4 text-emerald-400" /> 200+ వెరిఫైడ్ సేవలు
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 font-medium">
              <TrendingUp className="h-4 w-4 text-blue-400" /> 15,000+ స్థానిక ప్రజలు
            </span>
          </div>
        </div>

        {/* Hero Headline & Value Proposition */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            చౌటుప్పల్ లోకల్ బిజినెస్ &amp; సర్వీసెస్ హబ్
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            మీకు కావాల్సిన షాపులు, వైద్యులు, అత్యవసర సేవలు, రియల్ ఎస్టేట్ మరియు నేటి ప్రత్యేక ఆఫర్లను క్షణాల్లో కనుగొనండి.
          </p>
        </div>

        {/* Interactive Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full max-w-3xl">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="దుకాణాలు, ఆస్పత్రులు, డాక్టర్లు, టాక్సీ లేదా సేవల కోసం వెతకండి..."
              className="h-13 sm:h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-11 pr-28 sm:pr-32 text-sm sm:text-base text-white placeholder:text-slate-400 backdrop-blur-md outline-none transition focus:border-emerald-400 focus:bg-white/15 focus:ring-4 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              className="absolute right-1.5 sm:right-2 h-10 sm:h-11 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs sm:text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-95 flex items-center gap-1.5"
            >
              <span>వెతకండి</span>
              <ArrowRight className="h-4 w-4 hidden sm:inline" />
            </button>
          </div>

          {/* Quick Search Suggestions Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">జనాదరణ పొందినవి:</span>
            {QUICK_SEARCH_CHIPS.map((chip) => (
              <button
                key={chip.query}
                type="button"
                onClick={() => handleChipClick(chip.query)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-slate-300 backdrop-blur-xs transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </form>

        {/* 4 Essential 1-Tap Quick Action Cards (WCAG 44x44px Touch Targets) */}
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-4">
          {/* 1. Emergency & Govt Numbers */}
          <Link
            href="/government-contacts"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 to-slate-900/60 p-3.5 sm:p-4 backdrop-blur-md transition hover:border-rose-400 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 shadow-xs">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                24/7 ఎమర్జెన్సీ
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-200">
                ప్రభుత్వ &amp; అత్యవసర నంబర్లు
              </h3>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                పోలీస్, హాస్పిటల్, ఫైర్ &amp; 108
              </p>
            </div>
          </Link>

          {/* 2. Wishing & Story Post (₹99) */}
          <a
            href="https://wa.me/919494348175?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%95%E0%B0%BE%E0%B0%B0%E0%B0%82!%20%E0%B0%A8%E0%B1%87%E0%B0%A8%E0%B1%81%20%E2%82%B999%20%E0%B0%B8%E0%B1%8D%E0%B0%9F%E0%B1%8B%E0%B0%B0%E0%B1%80%20%E0%B0%B5%E0%B0%BF%E0%B0%B7%E0%B1%86%E0%B0%B8%E0%B1%8D%20/%20%E0%B0%86%E0%B0%AB%E0%B0%B0%E0%B1%8D%20%E0%B0%AA%E0%B1%8B%E0%B0%B8%E0%B1%8D%E0%B0%9F%E0%B1%8D%20%E0%B0%9A%E0%B1%87%E0%B0%AF%E0%B0%BE%E0%B0%B2%E0%B0%A8%E0%B1%81%E0%B0%95%E0%B1%81%E0%B0%82%E0%B0%9F%E0%B1%81%E0%B0%A8%E0%B1%8D%E0%B0%A8%E0%B0%BE%E0%B0%A8%E0%B1%81."
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900/60 p-3.5 sm:p-4 backdrop-blur-md transition hover:border-amber-400 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shadow-xs">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                కేవలం ₹99
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-200">
                బర్త్‌డే &amp; విషెస్ స్టోరీ
              </h3>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                యాప్ &amp; వాట్సాప్‌లో 24 గంటల పోస్టర్
              </p>
            </div>
          </a>

          {/* 3. 24/7 Taxi & Auto Booking */}
          <Link
            href="/services"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-slate-900/60 p-3.5 sm:p-4 backdrop-blur-md transition hover:border-sky-400 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 shadow-xs">
                <Car className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                క్యాబ్స్ &amp; ఆటో
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-200">
                24/7 టాక్సీ &amp; ప్రయాణం
              </h3>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                ఎయిర్‌పోర్ట్ క్యాబ్స్ &amp; లోకల్ ఆటో
              </p>
            </div>
          </Link>

          {/* 4. Official WhatsApp Assistant */}
          <a
            href="https://wa.me/919494348175?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%95%E0%B0%BE%E0%B0%B0%E0%B0%82"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-3.5 sm:p-4 backdrop-blur-md transition hover:border-emerald-400 hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shadow-xs">
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                లైవ్ బాట్
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-200">
                వాట్సాప్ అసిస్టెంట్
              </h3>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                చాట్ చేయండి: 9494348175
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
