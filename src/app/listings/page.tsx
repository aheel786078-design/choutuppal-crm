import Image from 'next/image'
import Link from 'next/link'
import { Search, MapPin, Phone, MessageCircle, CheckCircle2, Star, ArrowLeft, Filter } from 'lucide-react'
import { loadStore } from '@/lib/store'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, getListingWhatsAppUrl } from '@/lib/constants'

export const dynamic = 'force-dynamic'

interface ListingsPageProps {
  searchParams: Promise<{
    q?: string
    cat?: string
    village?: string
  }>
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams
  const q = (params.q || '').toLowerCase().trim()
  const cat = params.cat || ''
  const village = params.village || ''

  const store = loadStore()
  let listings = (store.listings || []).filter(
    (l) => l.status === 'published' || l.status === 'approved' || l.status === 'APPROVED'
  )

  if (q) {
    listings = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.categoryName && l.categoryName.toLowerCase().includes(q))
    )
  }

  if (cat && cat !== 'all') {
    listings = listings.filter((l) => l.categoryId === cat)
  }

  if (village && village !== 'all') {
    listings = listings.filter((l) => l.villageId === village)
  }

  // Sort featured & premium first
  listings.sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)
    if (a.isPremium !== b.isPremium) return (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0)
    return b.views - a.views
  })

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black">
            చౌటుప్పల్ బిజినెస్ డైరెక్టరీ (Choutuppal Directory)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            Showing {listings.length} verified listings with phone numbers, photos, and instant WhatsApp chat
          </p>

          {/* FILTER CONTROLS */}
          <form method="GET" action="/listings" className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-slate-800">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ''}
                placeholder="Search shop, doctor, plumber..."
                className="w-full text-xs sm:text-sm focus:outline-hidden"
              />
            </div>

            <select
              name="cat"
              defaultValue={cat || 'all'}
              className="bg-white text-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-hidden"
            >
              <option value="all">All Categories (అన్ని విభాగాలు)</option>
              {STANDARD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.telugu})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm py-2 px-4 rounded-xl shadow-md transition"
            >
              Filter Listings
            </button>
          </form>
        </div>
      </div>

      {/* LISTINGS GRID */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-700">No listings found matching your search.</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or search for another keyword.</p>
            <Link
              href="/listings"
              className="mt-4 inline-block bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* PHOTO ROW */}
                  <div className="relative h-48 w-full bg-slate-100">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-900 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>Verified</span>
                    </div>
                    {item.isPremium ? (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-xs">
                        Premium
                      </div>
                    ) : null}
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                      {item.categoryName || 'Business'}
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="p-4">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.address}</span>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${item.phone}`}
                    className="flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    Call
                  </a>
                  <a
                    href={getListingWhatsAppUrl(item.title, item.id)}
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
        )}
      </div>
    </div>
  )
}
