'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, PhoneCall, RefreshCw, Home, ShieldAlert, Zap, Truck, HeartPulse, Building2, Store } from 'lucide-react'

const EMERGENCY_CONTACTS = [
  { name: 'పోలీస్ ఎమర్జెన్సీ (Police)', number: '100', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { name: 'అంబులెన్స్ (Medical 108)', number: '108', icon: HeartPulse, color: 'text-red-600 bg-red-50 border-red-200' },
  { name: 'చౌటుప్పల్ పోలీస్ స్టేషన్ (Choutuppal PS)', number: '08694273233', icon: ShieldAlert, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { name: 'ఫైర్ స్టేషన్ (Fire 101)', number: '101', icon: Truck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { name: 'విద్యుత్ సమస్యలు (Electricity 1912)', number: '1912', icon: Zap, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { name: 'చౌటుప్పల్ తహసీల్దార్ కార్యాలయం (MRO)', number: '08694273222', icon: Building2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
]

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Auto-redirect to home when connection is restored
      setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setIsChecking(true)
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.href = '/'
      } else {
        setIsChecking(false)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 via-slate-50 to-white pb-24 pt-6 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Offline Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-xl shadow-blue-900/5 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mb-4 text-amber-600">
              <WifiOff className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              ఆఫ్‌లైన్ మోడ్ (Offline Mode)
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              మీరు ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉన్నారు
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
              ఇంటర్నెట్ కనెక్షన్ తాత్కాలికంగా నిలిచిపోయింది. కానీ మీరు గతంలో చూసిన వ్యాపారాల వివరాలు మరియు ఫోన్ కాల్ నంబర్లు మీ ఫోన్‌లో అందుబాటులో ఉన్నాయి.
            </p>

            {isOnline ? (
              <div className="mt-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-bounce">
                ✅ ఇంటర్నెట్ తిరిగి వచ్చింది! హోమ్‌పేజీకి కనెక్ట్ అవుతోంది...
              </div>
            ) : (
              <button
                onClick={handleRetry}
                disabled={isChecking}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-700/20 hover:from-blue-800 hover:to-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'చెక్ చేస్తోంది...' : 'రీకనెక్ట్ ప్రయత్నించండి (Retry)'}
              </button>
            )}
          </div>
        </div>

        {/* 24/7 Emergency Dialers (Works Without Internet) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-rose-600" />
                24/7 అత్యవసర నంబర్లు (Emergency Hotlines)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">ఇంటర్నెట్ లేకుండా నేరుగా కాల్ చేయవచ్చు</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
              డైరెక్ట్ కాల్
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {EMERGENCY_CONTACTS.map((item, idx) => {
              const Icon = item.icon
              return (
                <a
                  key={idx}
                  href={`tel:${item.number}`}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 font-semibold">{item.number}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px] shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    📞 Call
                  </span>
                </a>
              )
            })}
          </div>
        </div>

        {/* Offline Browsing Tips */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-3xl p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Store className="w-4 h-4" />
            ఆఫ్‌లైన్ క్యాష్ ఫీచర్ (Smart Offline Cache)
          </div>
          <h3 className="text-sm font-bold leading-snug">
            మీరు చౌటుప్పల్ యాప్‌లో ఒకసారి బ్రౌజ్ చేసిన ఫోటోలు & షాపుల వివరాలు మీ మొబైల్ స్టోరేజ్‌లో సేవ్ అవుతాయి.
          </h3>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            నెట్‌వర్క్ లేకపోయినా గతంలో చూసిన పేజీలు తక్షణమే లోడ్ అవుతాయి మరియు డేటా మళ్లీ మళ్లీ డౌన్‌లోడ్ అవ్వదు.
          </p>
          <div className="pt-2 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              హోమ్ పేజీకి వెళ్లండి
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              <Store className="w-3.5 h-3.5" />
              వ్యాపారాల డైరెక్టరీ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
