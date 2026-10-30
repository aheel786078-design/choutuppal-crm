import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Car,
  Wrench,
  Zap,
  Phone,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { loadStore } from '@/lib/store'
import {
  getTaxiBookingWhatsAppUrl,
  getAutoBookingWhatsAppUrl,
  getPlumberWhatsAppUrl,
  getElectricianWhatsAppUrl,
} from '@/lib/constants'
import { ServicesCatalog } from '@/components/services/services-catalog'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Choutuppal Services & Emergency Technicians | 24/7 Verified',
  description: 'Book taxis, auto drivers, emergency plumbers, certified electricians, and AC repair technicians in Choutuppal Mandal with direct owner contact.',
}

export default async function ServicesPage() {
  const store = loadStore()
  const services = (store.listings || []).filter(
    (l) =>
      (l.status === 'published' || l.status === 'approved' || l.status === 'APPROVED') &&
      (l.type === 'SERVICE' ||
        l.categoryId === 'cat-services' ||
        l.categoryId === 'cat-transport' ||
        l.categoryId === 'cat-electrical' ||
        l.categoryId === 'cat-automobile')
  )

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-emerald-900/40">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mb-4 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs">
              24/7 Verified On-Demand
            </span>
            <span className="text-slate-400 text-xs">Choutuppal Mandal &amp; NH-65</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black mt-3 tracking-tight">
            చౌటుప్పల్ ఎమర్జెన్సీ &amp; డైలీ సర్వీసెస్ (Services)
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Book 24/7 highway taxis, local autos, emergency plumbers, certified electricians, and appliance mechanics with 15–30 minute arrival and zero broker commission.
          </p>
        </div>
      </div>

      {/* 2. 4 CORE EMERGENCY HIGHLIGHT CARDS */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TAXI */}
          <div className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Car className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  24/7 Live
                </span>
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900">
                24/7 Highway Taxi &amp; Cabs
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hyderabad Airport drops, Vijayawada highway urgent travel, Innova &amp; Swift Dzire AC cabs.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>AC / Non-AC Vehicles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>15-min Highway Pickup</span>
                </div>
              </div>
            </div>

            <a
              href={getTaxiBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Book Taxi on WhatsApp
            </a>
          </div>

          {/* AUTO */}
          <div className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 text-2xl">
                  🛺
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Town Stand
                </span>
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900">
                Choutuppal Auto Stand
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Local Choutuppal town rides, market drops, Panthangi, Malkapur &amp; Peddakondur villages.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Verified Auto Drivers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Fair Local Meter Rates</span>
                </div>
              </div>
            </div>

            <a
              href={getAutoBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Call Auto on WhatsApp
            </a>
          </div>

          {/* PLUMBER */}
          <div className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Wrench className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                  Emergency
                </span>
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900">
                Emergency Plumbers
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Water pipe leakages, bathroom fitting, overhead water tank cleaning, borewell pipe repair.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>20-minute Doorstep Arrival</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Guaranteed Quality Work</span>
                </div>
              </div>
            </div>

            <a
              href={getPlumberWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Request Plumber on WA
            </a>
          </div>

          {/* ELECTRICIAN */}
          <div className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col justify-between hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200">
                  <Zap className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full">
                  Certified
                </span>
              </div>
              <h3 className="mt-4 text-base font-black text-slate-900">
                Electricians &amp; AC Repair
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Short circuits, inverter installation, motor pump repairs, AC gas filling, and ceiling fan repair.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Certified Electricians</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Same-Day Inspection</span>
                </div>
              </div>
            </div>

            <a
              href={getElectricianWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Request Electrician on WA
            </a>
          </div>
        </div>

        {/* 3. INTERACTIVE CATALOG & TECHNICIANS DIRECTORY */}
        <div className="mt-10">
          <ServicesCatalog initialStoreListings={services} />
        </div>
      </div>
    </div>
  )
}
