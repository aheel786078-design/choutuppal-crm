import Link from 'next/link'
import {
  Users,
  MessageCircle,
  Phone,
  Shield,
  HeartPulse,
  Flame,
  Zap,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { WHATSAPP_BOT_NUMBER, getCommunityGroupWhatsAppUrl } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const WARDS = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  name: `Ward ${i + 1}`,
  telugu: `వార్డ్ నెం. ${i + 1}`,
  colony:
    i === 0
      ? 'Choutuppal Bus Stand & Main Market'
      : i === 1
      ? 'Gandhi Nagar & Substation Road'
      : i === 2
      ? 'Shanti Nagar & Teachers Colony'
      : i === 3
      ? 'Indira Nagar & Police Station Area'
      : i === 4
      ? 'Bypass Road & Highway Colony'
      : i === 5
      ? 'Panthangi Road & Old Village'
      : i === 6
      ? 'Malkapur Road & Venkateshwara Colony'
      : i === 7
      ? 'Lingoji Guda & Shiva Temple Area'
      : i === 8
      ? 'Koyalagudem Weavers Colony'
      : i === 9
      ? 'RTC Colony & Court Complex'
      : `Municipality Sector ${i + 1} Residential Zone`,
}))

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Official Ward Network
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black mt-2">
            చౌటుప్పల్ వార్డ్ కమ్యూనిటీ &amp; హెల్ప్‌లైన్ (Ward Groups)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-emerald-100 max-w-2xl">
            Join your official Ward WhatsApp group to get daily drinking water updates, garbage collection timings, and community announcements.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* EMERGENCY HOTLINES */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-10">
          <h2 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span>Emergency Services &amp; Municipal Helpline Numbers</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a
              href="tel:100"
              className="bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl p-4 text-center transition"
            >
              <Shield className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <span className="block font-black text-red-950 text-sm">Police (పోలీస్)</span>
              <span className="block text-xs font-bold text-red-700 mt-0.5">Dial 100</span>
              <span className="text-[10px] text-red-500 block">Choutuppal PS: 08694-222233</span>
            </a>

            <a
              href="tel:108"
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl p-4 text-center transition"
            >
              <HeartPulse className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <span className="block font-black text-emerald-950 text-sm">Ambulance (108)</span>
              <span className="block text-xs font-bold text-emerald-700 mt-0.5">Dial 108 / 102</span>
              <span className="text-[10px] text-emerald-500 block">Govt Hospital Choutuppal</span>
            </a>

            <a
              href="tel:1912"
              className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-2xl p-4 text-center transition"
            >
              <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <span className="block font-black text-yellow-950 text-sm">Electricity (విద్యుత్)</span>
              <span className="block text-xs font-bold text-yellow-700 mt-0.5">Dial 1912</span>
              <span className="text-[10px] text-yellow-600 block">TSSPDCL Substation</span>
            </a>

            <a
              href="tel:101"
              className="bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl p-4 text-center transition"
            >
              <Flame className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <span className="block font-black text-orange-950 text-sm">Fire Station (అగ్నిమాపక)</span>
              <span className="block text-xs font-bold text-orange-700 mt-0.5">Dial 101</span>
              <span className="text-[10px] text-orange-600 block">Choutuppal Fire Station</span>
            </a>
          </div>
        </div>

        {/* WARD 1 TO 20 DIRECTORY */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                🏘️ Choutuppal Municipality Wards 1 to 20
              </h2>
              <p className="text-xs text-slate-500">
                Tap &quot;Join on WhatsApp&quot; to receive instant invitation to your colony group
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WARDS.map((w) => (
              <div
                key={w.number}
                className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm border border-emerald-200">
                      W{w.number}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {w.telugu}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm mt-3">{w.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{w.colony}</p>
                </div>

                <a
                  href={getCommunityGroupWhatsAppUrl(w.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Join on WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
