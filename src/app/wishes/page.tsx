import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Heart, Gift, MessageCircle, Clock, ShieldCheck } from 'lucide-react'
import { WishingStudioBanner } from '@/components/home/wishing-studio-banner'

export const metadata: Metadata = {
  title: 'చౌటుప్పల్ విషింగ్ & ప్రమోషన్ స్టూడియో | Choutuppal Wishing Studio & Business Promotions',
  description:
    'పుట్టినరోజు, పెళ్లిరోజు, రాజకీయ శుభాకాంక్షలు మరియు దుకాణ ఆఫర్ల పోస్టర్లు చౌటుప్పల్ యాప్ & వాట్సాప్ స్టోరీస్‌లో కేవలం ₹99 కే ప్రమోట్ చేసుకోండి.',
}

export default function WishesPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 pt-4">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        {/* Navigation / Back header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-xs border border-slate-200 transition hover:bg-slate-50 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>హోమ్ పేజీకి తిరిగి వెళ్లండి</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>ఆఫీషియల్ స్టూడియో సర్వీస్</span>
          </span>
        </div>

        {/* Header Intro */}
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Gift className="h-3.5 w-3.5 text-amber-300" />
              Special Promo Studio
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black leading-tight">
              చౌటుప్పల్ విషింగ్ &amp; బిజినెస్ ప్రమోషన్ స్టూడియో
            </h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-100">
              మీ ఆత్మీయుల పుట్టినరోజు, వివాహ వార్షికోత్సవం లేదా మీ వ్యాపార ఆఫర్లను స్థానిక చౌటుప్పల్ పౌరులందరికీ వాట్సాప్ &amp; యాప్ స్టోరీస్ ద్వారా తక్కువ ధరకే తెలియజేయండి.
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-emerald-200">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-300" /> 30 నిమిషాల్లో లైవ్
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> 100% వెరిఫైడ్ &amp; డైరెక్ట్ UPI
              </span>
            </div>
          </div>

          <div className="absolute -right-8 -bottom-8 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* The 4-Card Wishing Studio Component */}
        <WishingStudioBanner />

        {/* Help & Direct Contact Footer */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center">
          <h2 className="text-lg font-bold text-slate-800">ఏదైనా సహాయం కావాలా?</h2>
          <p className="mt-1 text-sm text-slate-600">
            స్టోరీ డిజైనింగ్, కస్టమ్ పోస్టర్లు లేదా బల్క్ మెసేజ్ క్యాంపెయిన్ల కోసం నేరుగా మాట్లాడండి.
          </p>
          <div className="mt-4 flex justify-center">
            <a
              href="https://wa.me/919494348175?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%95%E0%B0%BE%E0%B0%B0%E0%B0%82!%20%E0%B0%B5%E0%B0%BF%E0%B0%B7%E0%B0%BF%E0%B0%82%E0%B0%97%E0%B1%8D%20%E0%B0%B8%E0%B1%8D%E0%B0%9F%E0%B1%82%E0%B0%A1%E0%B0%BF%E0%B0%AF%E0%B1%8B%20%E0%B0%97%E0%B1%81%E0%B0%B0%E0%B0%BF%E0%B0%82%E0%B0%9A%E0%B0%BF%20%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%B0%E0%B0%BE%E0%B0%B2%E0%B1%81%20%E0%B0%95%E0%B0%BE%E0%B0%B5%E0%B0%BE%E0%B0%B2%E0%B0%BF."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span>వాట్సాప్ అసిస్టెంట్ 9494348175 ని సంప్రదించండి</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
