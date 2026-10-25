import Image from 'next/image'
import Link from 'next/link'
import {
  Home,
  MapPin,
  Phone,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Maximize2,
  Share2,
} from 'lucide-react'
import { loadStore } from '@/lib/store'
import { getRealEstateWhatsAppUrl } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function RealEstatePage() {
  const store = loadStore()
  const properties = (store.listings || []).filter(
    (l) =>
      (l.status === 'published' || l.status === 'approved' || l.status === 'APPROVED') &&
      (l.type === 'REAL_ESTATE' ||
        l.categoryId === 'cat-realestate' ||
        l.categoryName?.toLowerCase().includes('real estate'))
  )

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
              Verified Ventures
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black mt-2">
            చౌటుప్పల్ ఓపెన్ ప్లాట్లు &amp; రియల్ ఎస్టేట్ (Real Estate)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Direct owner &amp; developer open plots along Hyderabad-Vijayawada NH-65 highway, DTCP/HMDA layouts, farmlands, and residential houses for sale.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-700">No properties currently listed.</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon or post your property through WhatsApp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-52 w-full bg-slate-100">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-lg shadow-sm">
                      {item.price || 'Price on Request'}
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded text-[11px] font-bold text-slate-900 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>Verified Layout</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
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
                    Call Owner
                  </a>
                  <a
                    href={getRealEstateWhatsAppUrl(item.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Inquire on WA
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
