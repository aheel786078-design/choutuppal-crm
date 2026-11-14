import Link from 'next/link'
import {
  PhoneCall,
  ShieldAlert,
  Flame,
  Zap,
  HeartPulse,
  Landmark,
  ArrowRight,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react'

interface QuickEmergencyItem {
  id: string
  titleTelugu: string
  titleEnglish: string
  number: string
  dialNumber: string
  icon: typeof ShieldAlert
  bgColor: string
  textColor: string
  badgeText: string
}

const EMERGENCY_ITEMS: QuickEmergencyItem[] = [
  {
    id: 'police',
    titleTelugu: 'పోలీస్ కంట్రోల్ రూమ్',
    titleEnglish: 'Police Control Room',
    number: '100',
    dialNumber: '100',
    icon: ShieldAlert,
    bgColor: 'from-blue-600/20 to-blue-900/30 border-blue-500/30 text-blue-400',
    textColor: 'text-blue-300',
    badgeText: '24/7 Free',
  },
  {
    id: 'ambulance',
    titleTelugu: 'అత్యవసర అంబులెన్స్',
    titleEnglish: 'Emergency Ambulance',
    number: '108',
    dialNumber: '108',
    icon: HeartPulse,
    bgColor: 'from-rose-600/20 to-rose-900/30 border-rose-500/30 text-rose-400',
    textColor: 'text-rose-300',
    badgeText: '24/7 Free',
  },
  {
    id: 'fire',
    titleTelugu: 'ఫైర్ స్టేషన్ చౌటుప్పల్',
    titleEnglish: 'Fire & Rescue Service',
    number: '101',
    dialNumber: '101',
    icon: Flame,
    bgColor: 'from-amber-600/20 to-amber-900/30 border-amber-500/30 text-amber-400',
    textColor: 'text-amber-300',
    badgeText: '24/7 Free',
  },
  {
    id: 'electricity',
    titleTelugu: 'కరెంట్ హెల్ప్‌లైన్',
    titleEnglish: 'TSSPDCL Electricity',
    number: '1912',
    dialNumber: '1912',
    icon: Zap,
    bgColor: 'from-emerald-600/20 to-emerald-900/30 border-emerald-500/30 text-emerald-400',
    textColor: 'text-emerald-300',
    badgeText: 'Toll-Free',
  },
  {
    id: 'mro',
    titleTelugu: 'తహశీల్దార్ (MRO)',
    titleEnglish: 'Tahsildar Choutuppal',
    number: '08331997020',
    dialNumber: '+918331997020',
    icon: Landmark,
    bgColor: 'from-purple-600/20 to-purple-900/30 border-purple-500/30 text-purple-400',
    textColor: 'text-purple-300',
    badgeText: 'Official',
  },
]

export function EmergencyQuickRail() {
  return (
    <section className="w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-rose-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 p-4 sm:p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-inner">
            <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse text-rose-500" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                అత్యవసర హెల్ప్‌లైన్లు (24/7 Emergency)
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" /> 100% Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              పోలీస్, అంబులెన్స్, ఫైర్, విద్యుత్ &amp; చౌటుప్పల్ తహశీల్దార్ సంప్రదింపు నంబర్లు
            </p>
          </div>
        </div>

        <Link
          href="/government-contacts"
          className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-1.5 text-xs font-bold text-rose-200 hover:text-white border border-rose-500/30 transition shadow-xs"
        >
          <span>మొత్తం 120+ నంబర్లు</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 1-Tap Dial Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {EMERGENCY_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href={`tel:${item.dialNumber}`}
              className={`group relative flex flex-col justify-between rounded-xl sm:rounded-2xl border bg-gradient-to-b p-3 sm:p-3.5 transition hover:scale-[1.02] active:scale-95 shadow-sm ${item.bgColor}`}
              aria-label={`Call ${item.titleEnglish} at ${item.number}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white/10 text-white shadow-xs">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                  {item.badgeText}
                </span>
              </div>

              <div className="mt-2.5">
                <p className="text-[11px] sm:text-xs font-medium text-slate-300 truncate">
                  {item.titleTelugu}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm sm:text-base font-black text-white tracking-tight">
                    {item.number}
                  </span>
                  <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white transition">
                    <PhoneCall className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                </div>
              </div>
            </a>
          )
        })}
      </div>

      {/* Footer Quick Action Banner */}
      <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>
            పోలీస్ స్టేషన్, MRO, విద్యుత్ AE, మున్సిపల్ &amp; గ్రామ పంచాయతీ అధికారుల పూర్తి వివరాలు అందుబాటులో ఉన్నాయి.
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <a
            href="https://wa.me/919494348175?text=Govt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 font-bold text-[11px] transition shadow-xs shrink-0"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            వాట్సాప్‌లో నంబర్లు
          </a>
          <Link
            href="/government-contacts"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 text-white px-3 py-1 font-bold text-[11px] transition shrink-0"
          >
            డైరెక్టరీ
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  )
}
