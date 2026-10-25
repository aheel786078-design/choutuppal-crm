import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Shield, Users, Smartphone, MessageCircle } from 'lucide-react'
import { WHATSAPP_BOT_NUMBER } from '@/lib/constants'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black">About Choutuppal.in (మా గురించి)</h1>
          <p className="mt-2 text-sm text-slate-200">
            Connecting 200+ local merchants, residents, doctors, and real estate builders across Choutuppal Mandal.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 space-y-6 text-slate-700 leading-relaxed text-sm">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Our Mission</h2>
            <p>
              Choutuppal.in was created to bridge local citizens, travelers on NH-65 highway, and village residents with verified services in Choutuppal town. Whether you need an emergency plumber at midnight, a 24/7 taxi to Rajiv Gandhi International Airport, open plot ventures, or municipal updates, Choutuppal SuperApp provides instant direct WhatsApp connections without middlemen fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <CheckCircle2 className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-extrabold text-slate-900">200+ Verified Businesses</h3>
              <p className="text-xs text-slate-500 mt-1">Direct contact numbers, photo galleries, and genuine owner credentials.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <Smartphone className="h-6 w-6 text-emerald-600 mb-2" />
              <h3 className="font-extrabold text-slate-900">WhatsApp AI CRM Engine</h3>
              <p className="text-xs text-slate-500 mt-1">Instant automated reply flows for taxi, auto, health, and shopping requests.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <Shield className="h-6 w-6 text-amber-600 mb-2" />
              <h3 className="font-extrabold text-slate-900">Zero Middleman Commission</h3>
              <p className="text-xs text-slate-500 mt-1">Direct communication with drivers, plumbers, electricians, and plot owners.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-lg font-black text-slate-900 mb-2">Contact &amp; Administration</h2>
            <p className="text-xs text-slate-600">
              For business listings, verification, or advertisement inquiries:
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                WhatsApp: +91 94943 48175
              </span>
              <span>Email: info@choutuppal.in</span>
              <span>Location: NH-65, Choutuppal, Yadadri Bhuvanagiri Dist, Telangana 508252</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
