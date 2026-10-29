import Image from 'next/image'
import Link from 'next/link'
import { Search, MapPin, Phone, MessageCircle, CheckCircle2, Star, ArrowLeft, Filter } from 'lucide-react'
import { loadStore, FLAGSHIP_TERRITORY_ID, isListingPublished } from '@/lib/store'
import { STANDARD_CATEGORIES, STANDARD_VILLAGES, getListingWhatsAppUrl } from '@/lib/constants'
import { resolveListingEntitlements, isListingFeatured, isListingPremium } from '@/lib/entitlement-resolver'

import { sanitizeImageUrl } from '@/lib/home-data'

export const dynamic = 'force-dynamic'

interface ListingsPageProps {
  searchParams: Promise<{
    q?: string
    cat?: string
    category?: string
    village?: string
    territoryId?: string
    territory?: string
  }>
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const params = await searchParams
  const q = (params.q || '').toLowerCase().trim()
  const rawCat = (params.cat || params.category || '').toLowerCase().trim()
  const cleanCat = rawCat.replace(/^cat-/, '')
  const village = (params.village || '').toLowerCase().trim()
  const territoryId = params.territoryId || params.territory || ''

  const store = loadStore()
  let listings = (store.listings || []).filter((l) => isListingPublished(l))

  if (territoryId && territoryId !== 'all') {
    listings = listings.filter((l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === territoryId)
  }

  if (q) {
    listings = listings.filter((l) => {
      const titleMatch = l.title ? l.title.toLowerCase().includes(q) : false
      const descMatch = l.description ? l.description.toLowerCase().includes(q) : false
      const addrMatch = l.address ? l.address.toLowerCase().includes(q) : false
      const catMatch = l.categoryName ? l.categoryName.toLowerCase().includes(q) : false
      const locMatch = l.location ? l.location.toLowerCase().includes(q) : false
      const villageMatch = l.villageName ? l.villageName.toLowerCase().includes(q) : false
      return titleMatch || descMatch || addrMatch || catMatch || locMatch || villageMatch
    })
  }

  if (cleanCat && cleanCat !== 'all') {
    listings = listings.filter((l) => {
      const lid = (l.categoryId || '').toLowerCase().replace(/^cat-/, '')
      const lname = (l.categoryName || '').toLowerCase()
      return (
        lid === cleanCat ||
        lid.includes(cleanCat) ||
        cleanCat.includes(lid) ||
        lname.includes(cleanCat)
      )
    })
  }

  if (village && village !== 'all') {
    listings = listings.filter((l) => {
      const vid = (l.villageId || '').toLowerCase()
      const vname = (l.villageName || '').toLowerCase()
      return vid === village || vname.includes(village)
    })
  }

  // Authoritative sort: featured first, then premium, then views
  listings.sort((a, b) => {
    const featA = isListingFeatured(a, store) ? 1 : 0
    const featB = isListingFeatured(b, store) ? 1 : 0
    if (featB !== featA) return featB - featA

    const premA = isListingPremium(a, store) ? 1 : 0
    const premB = isListingPremium(b, store) ? 1 : 0
    if (premB !== premA) return premB - premA

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
              defaultValue={
                STANDARD_CATEGORIES.find(
                  (c) => c.id === rawCat || c.id.replace(/^cat-/, '') === cleanCat
                )?.id || 'all'
              }
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
            {listings.map((item) => {
              const ent = resolveListingEntitlements(item.id, store)
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* PHOTO ROW */}
                    <Link
                      href={`/business/${item.slug || item.id}`}
                      className="block relative h-48 w-full bg-slate-100 group overflow-hidden"
                    >
                      <Image
                        src={sanitizeImageUrl(item.coverImage)}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-900 shadow-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>Verified</span>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {ent.isFeatured && (
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-xs flex items-center gap-1">
                            <Star className="h-3 w-3 fill-white" />
                            Featured
                          </div>
                        )}
                        {ent.isPremium && (
                          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-xs">
                            Premium
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                        {item.categoryName || 'Business'}
                      </div>
                    </Link>

                    {/* INFO */}
                    <div className="p-4">
                      <Link href={`/business/${item.slug || item.id}`}>
                        <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1 hover:text-blue-600 transition">
                          {item.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {item.description || 'Verified local business in Choutuppal, Telangana.'}
                      </p>

                      <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{item.address || 'Choutuppal Mandal, Telangana'}</span>
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
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
