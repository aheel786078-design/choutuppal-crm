import Image from 'next/image'
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
  MapPin,
} from 'lucide-react'
import { loadStore } from '@/lib/store'
import {
  WHATSAPP_BOT_NUMBER,
  getTaxiBookingWhatsAppUrl,
  getAutoBookingWhatsAppUrl,
  getPlumberWhatsAppUrl,
  getElectricianWhatsAppUrl,
  getServiceWhatsAppUrl,
} from '@/lib/constants'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              24/7 Verified
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black mt-2">
            చౌటుప్పల్ ఎమర్జెన్సీ &amp; డైలీ సర్వీసెస్ (Services)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Book taxis, autos, emergency plumbers, certified electricians, and technicians directly via WhatsApp with zero broker commission.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        {/* 4 CORE HIGHLIGHT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TAXI */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Car className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Available
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
                24/7 Taxi &amp; Cab Service
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Hyderabad Airport drops, Vijayawada highway travel, outstation tours, Innova &amp; Swift Dzire cabs.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>AC / Non-AC Vehicles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Immediate Pickup Available</span>
                </div>
              </div>
            </div>

            <a
              href={getTaxiBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Book Taxi on WhatsApp
            </a>
          </div>

          {/* AUTO */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 text-2xl">
                  🛺
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Town Stand
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
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
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Reasonable Meter Rates</span>
                </div>
              </div>
            </div>

            <a
              href={getAutoBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Call Auto on WhatsApp
            </a>
          </div>

          {/* PLUMBER */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Wrench className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                  Emergency
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
                Emergency Plumbers
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Water pipe leakages, bathroom fitting, overhead water tank cleaning, borewell pipe repair.
              </p>
              <div className="mt-3 text-[11px] font-semibold text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>30-minute Doorstep Arrival</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amber-600" />
                  <span>Quality Parts &amp; Guarantee</span>
                </div>
              </div>
            </div>

            <a
              href={getPlumberWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Request Plumber on WA
            </a>
          </div>

          {/* ELECTRICIAN */}
          <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200">
                  <Zap className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full">
                  Technicians
                </span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
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
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Same-Day Service</span>
                </div>
              </div>
            </div>

            <a
              href={getElectricianWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Request Electrician on WA
            </a>
          </div>
        </div>

        {/* ALL LOCAL SERVICE TECHNICIANS & PROVIDERS */}
        <div className="mt-12">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            🔧 All Verified Technicians &amp; Garages in Choutuppal ({services.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded text-[11px] font-bold text-slate-900">
                      {item.categoryName || 'Service'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    Call
                  </a>
                  <a
                    href={getServiceWhatsAppUrl(item.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
