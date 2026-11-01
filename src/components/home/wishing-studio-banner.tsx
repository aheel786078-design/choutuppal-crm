'use client'

import {
  Sparkles,
  Cake,
  Flower2,
  Megaphone,
  Video,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const WA_NUMBER = '919494348175'

const STUDIO_CARDS = [
  {
    id: 'birthday_anniversary',
    title: 'పుట్టినరోజు & పెళ్లిరోజు విషెస్',
    tag: 'అత్యంత జనాదరణ',
    price: '₹99',
    unit: '24 గంటల పోస్టర్',
    icon: Cake,
    gradient: 'from-amber-500 to-rose-500',
    borderGlow: 'hover:border-amber-400',
    description: 'మీ కుటుంబ సభ్యులు, మిత్రుల ఫోటోతో అధికారిక యాప్ & వాట్సాప్ స్టేటస్‌లో ఫుల్ స్క్రీన్ పోస్టర్ డిస్‌ప్లే!',
    features: [
      '24 గంటల లైవ్ విజిబిలిటీ',
      'హై-క్వాలిటీ కలర్ డిజైన్',
      'సోషల్ మీడియా షేరబుల్ లింక్',
    ],
    waMessage: 'నమస్కారం! నేను బర్త్‌డే / యానివర్సరీ విషెస్ స్టోరీ (₹99) పోస్ట్ చేయాలనుకుంటున్నాను.',
    btnLabel: 'విషెస్ పోస్ట్ (₹99)',
  },
  {
    id: 'leader_wishes',
    title: 'రాజకీయ & నాయకుల శుభాకాంక్షలు',
    tag: 'స్పెషల్ విషెస్',
    price: '₹99',
    unit: '24 గంటల పోస్టర్',
    icon: Flower2,
    gradient: 'from-blue-600 to-indigo-600',
    borderGlow: 'hover:border-blue-400',
    description: 'స్థానిక రాజకీయ, సామాజిక నాయకుల బర్త్‌డే, పదవీ ప్రమాణ స్వీకారం & అభినందన పోస్టర్లు పట్టణ ప్రజలకు చేరేలా!',
    features: [
      '15,000+ ప్రజలకు విజిబిలిటీ',
      'ప్రొఫెషనల్ పొలిటికల్ లేఅవుట్',
      'యాప్ హోమ్‌పేజీ టాప్ డిస్‌ప్లే',
    ],
    waMessage: 'నమస్కారం! నేను స్థానిక నాయకుల శుభాకాంక్షల స్టోరీ (₹99) బుక్ చేయాలనుకుంటున్నాను.',
    btnLabel: 'నాయకుల విషెస్ (₹99)',
  },
  {
    id: 'shop_offer',
    title: 'షాప్ డైలీ ఆఫర్ స్టోరీ',
    tag: 'బిజినెస్ స్పెషల్',
    price: '₹99',
    unit: 'రోజుకు',
    icon: Megaphone,
    gradient: 'from-emerald-600 to-teal-600',
    borderGlow: 'hover:border-emerald-400',
    description: 'మీ షాప్ నేటి స్పెషల్ డిస్కౌంట్ లేదా కొత్త కలెక్షన్ వివరాలు కస్టమర్లు నేరుగా వాట్సాప్‌లో ఆర్డర్ చేసే బటన్‌తో!',
    features: [
      'డైరెక్ట్ వాట్సాప్ ఆర్డర్ బటన్',
      'కస్టమర్ డైరెక్ట్ కనెక్షన్',
      'డైలీ ఆఫర్స్ రైల్ లో టాప్ ప్లేస్‌మెంట్',
    ],
    waMessage: 'నమస్కారం! నేను మా షాప్ డిస్కౌంట్ ఆఫర్ స్టోరీ (₹99/రోజు) బుక్ చేయాలనుకుంటున్నాను.',
    btnLabel: 'షాప్ ఆఫర్ (₹99)',
  },
  {
    id: 'video_reels_bulk',
    title: 'వీడియో రీల్స్ & బల్క్ మెసేజ్',
    tag: 'హై సేల్స్ బూస్ట్',
    price: '₹299',
    unit: '3 రోజులు / క్యాంపెయిన్',
    icon: Video,
    gradient: 'from-purple-600 to-pink-600',
    borderGlow: 'hover:border-purple-400',
    description: 'మీ షాప్ వీడియో యాప్ హోమ్‌పేజీ రీల్స్ లో 3 రోజులు ప్లే అవుతుంది లేదా 15,000+ వెరిఫైడ్ మొబైల్స్‌కు వాట్సాప్ బ్రాడ్‌కాస్ట్!',
    features: [
      'రీల్స్ సెక్షన్ లో 3 రోజులు',
      'వాట్సాప్ బల్క్ రీచ్ (₹499)',
      'డెలివరీ రిపోర్ట్ & అనలిటిక్స్',
    ],
    waMessage: 'నమస్కారం! నేను వీడియో రీల్ ప్రమోషన్ (₹299) లేదా బల్క్ మెసేజ్ (₹499) బుక్ చేయాలనుకుంటున్నాను.',
    btnLabel: 'రీల్స్ ప్రమోషన్ (₹299)',
  },
]

export function WishingStudioBanner() {
  return (
    <section className="relative w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-emerald-50/40 p-4 sm:p-6 shadow-sm">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>చౌటుప్పల్ ప్రమోషన్ &amp; విషింగ్ స్టూడియో</span>
          </div>
          <h2 className="mt-1.5 text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900">
            పుట్టినరోజు విషెస్, ఆఫర్లు &amp; వ్యాపార ప్రమోషన్స్
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
            మీ ప్రియమైన వారికి శుభాకాంక్షలు తెలియజేయండి లేదా మీ వ్యాపారాన్ని పట్టణంలోని 15,000+ స్థానిక ప్రజలకు చేర్చండి.
          </p>
        </div>

        {/* 30-min delivery guarantee pill */}
        <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-3.5 py-2 shadow-xs shrink-0">
          <Clock className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-left">
            <p className="text-[11px] font-extrabold text-slate-900">30 నిమిషాల్లో లైవ్!</p>
            <p className="text-[10px] text-slate-500">ఫోటో అందిన వెంటనే పోస్టర్ రెడీ</p>
          </div>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {STUDIO_CARDS.map((card) => {
          const Icon = card.icon
          const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(card.waMessage)}`

          return (
            <div
              key={card.id}
              className={`relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${card.borderGlow}`}
            >
              <div>
                {/* Badge & Icon */}
                <div className="flex items-center justify-between">
                  <div
                    className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-xs`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] font-bold border border-slate-200">
                    {card.tag}
                  </Badge>
                </div>

                {/* Title & Price */}
                <div className="mt-3">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {card.title}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      {card.price}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      / {card.unit}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {card.description}
                </p>

                {/* Feature checkmarks */}
                <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {card.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 1-Tap WhatsApp CTA Button */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${card.gradient} py-2.5 px-3 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95`}
              >
                <span>{card.btnLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )
        })}
      </div>

      {/* Footer Trust Bar & Direct Payment Info */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 px-4 py-2.5 text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>సులభమైన చెల్లింపు:</strong> PhonePe / GooglePay / UPI:{' '}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold text-emerald-700 border border-emerald-200">
              9494348175@ybl
            </code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>హెల్ప్‌లైన్: <strong>9494348175</strong></span>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-700 font-semibold">100% వెరిఫైడ్ సర్వీస్</span>
        </div>
      </div>
    </section>
  )
}
