'use client'

import { MessageCircle, Megaphone, Send } from 'lucide-react'

export function SendNewsCTA() {
  const whatsappUrl = `https://wa.me/919494348175?text=${encodeURIComponent(
    'నమస్కారం చౌటుప్పల్ యాప్, మా ఊరిలో ఒక ముఖ్యమైన వార్త/అప్డేట్ ఉంది. దయచేసి దీన్ని యాప్ లో పోస్ట్ చేయండి.'
  )}`

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-amber-500 p-6 text-white shadow-xl sm:p-8">
        {/* Background glow effects */}
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-amber-400/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold backdrop-blur-md">
              <Megaphone className="h-4 w-4 text-amber-300" />
              <span>మాకు వార్త పంపండి</span>
            </div>
            <h2 className="font-telugu text-lg font-bold leading-relaxed text-white sm:text-xl lg:text-2xl">
              📢 మీకు ఏదైనా లోకల్ న్యూస్ తెలుసా? మాకు పంపండి! మీ ఊరిలో జరుగుతున్న విశేషాలను, ఈవెంట్స్ ని మాతో షేర్ చేయండి. మేము యాప్ లో ప్రచురిస్తాము.
            </h2>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-blue-700 shadow-lg transition-all hover:bg-amber-50 hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-telugu text-base">WhatsApp లో పంపండి</span>
            <Send className="h-4 w-4 text-blue-600" />
          </a>
        </div>
      </div>
    </section>
  )
}
