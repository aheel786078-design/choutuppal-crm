import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  MapPin,
  Phone,
  MessageCircle,
  Search,
  ExternalLink,
  Store,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Car,
  Wrench,
  Sparkles,
  ArrowRight,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { loadStore, FLAGSHIP_TERRITORY_ID, isListingPublished } from '@/lib/store'
import { STANDARD_CATEGORIES } from '@/lib/constants'

interface TownPageProps {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function TownTerritoryPage({ params }: TownPageProps) {
  const { slug } = await params
  const store = loadStore()

  // Find territory by slug
  const territory = (store.territories || []).find((t) => t.slug.toLowerCase() === slug.toLowerCase())
  const franchise = (store.franchises || []).find((f) => f.territorySlug?.toLowerCase() === slug.toLowerCase())

  if (!territory) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white border border-slate-200/90 p-8 rounded-3xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <MapPin className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Town Territory Not Yet Launched</h1>
          <p className="text-xs text-slate-500">
            "{slug.toUpperCase()}" is not yet an active town on our hyperlocal network. Are you an entrepreneur looking to launch your town's SuperApp?
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={`https://wa.me/919494348175?text=${encodeURIComponent(`హలో! నేను '${slug}' పట్టణంలో సూపర్ యాప్ & వాట్సాప్ బాట్ ఫ్రాంచైజీ ప్రారంభించడానికి ఆసక్తిగా ఉన్నాను.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Apply for {slug.toUpperCase()} Franchise</span>
            </a>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Return to Flagship Choutuppal.in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check if suspended
  if (territory.status === 'suspended' || franchise?.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white border border-rose-200 p-8 rounded-3xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{territory.name}</h1>
          <p className="text-xs text-slate-500">
            This town portal is temporarily offline for scheduled system maintenance. Please check back shortly or visit our flagship platform.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Visit Choutuppal.in Flagship</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Filter listings for this territory (only published/approved)
  const territoryListings = (store.listings || []).filter(
    (l) => (l.territoryId || FLAGSHIP_TERRITORY_ID) === territory.id && isListingPublished(l)
  )

  const territoryStories = (store.stories || []).filter(
    (s) => (s.territoryId || FLAGSHIP_TERRITORY_ID) === territory.id && s.status === 'published'
  )

  const whatsappPhone = territory.whatsappNumber || territory.contactPhone || '9494348175'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Territory Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 text-xs flex items-center justify-between text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900">{territory.name}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 text-[11px]">{territory.district}, {territory.state}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <a
            href={`https://wa.me/91${whatsappPhone}?text=${encodeURIComponent(`నమస్కారం! నేను ${territory.name} వెబ్‌సైట్ నుండి సంప్రదిస్తున్నాను.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Town Bot: {whatsappPhone}</span>
          </a>
        </div>
      </div>

      {/* Main Town Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between max-w-7xl mx-auto w-full shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {territory.slug.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>{territory.name}</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                SuperApp
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{territory.branding?.tagline || 'Local Business & Services Hub'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/91${whatsappPhone}?text=${encodeURIComponent(`హలో! నా వ్యాపారాన్ని ${territory.name} వెబ్‌సైట్‌లో చేర్చాలనుకుంటున్నాను.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>+ Add Your Business</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-emerald-50/60 via-slate-50 to-slate-50 border-b border-slate-200/80 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{territory.branding?.heroTitle || `${territory.name} లోకల్ బిజినెస్ & సర్వీసెస్`}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Find Everything in <span className="text-emerald-600">{territory.name}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
            {territory.branding?.tagline || 'Explore verified local shops, instant plumber & electrician services, 24/7 taxi booking, and community updates.'}
          </p>

          {/* Localities Tags */}
          {territory.localities && territory.localities.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              <span className="text-xs text-slate-500 font-medium">Coverage Areas:</span>
              {territory.localities.map((loc, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-mono shadow-2xs"
                >
                  {loc}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Services / Category Pills */}
      <section className="py-6 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {STANDARD_CATEGORIES.slice(0, 6).map((cat) => (
            <a
              key={cat.id}
              href={`https://wa.me/91${whatsappPhone}?text=${encodeURIComponent(`హలో! నాకు ${territory.name} లో ${cat.name} వివరాలు కావాలి.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl flex flex-col items-center text-center gap-1.5 transition-all shadow-xs group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">{cat.name}</span>
              <span className="text-[10px] text-slate-500">{cat.telugu}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Listings Section */}
      <section className="py-6 px-4 max-w-7xl mx-auto w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>Verified Listings in {territory.name}</span>
              <span className="text-xs text-slate-500 font-normal">({territoryListings.length})</span>
            </h2>
            <p className="text-xs text-slate-500">Direct contact numbers and WhatsApp buttons</p>
          </div>
        </div>

        {territoryListings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <Store className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs text-slate-600">
              New business listings are currently being onboarded in {territory.name}.
            </p>
            <a
              href={`https://wa.me/91${whatsappPhone}?text=${encodeURIComponent(`హలో! నా వ్యాపారాన్ని ${territory.name} వెబ్‌సైట్‌లో ఉచితంగా నమోదు చేయండి.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Be the First Business to List Here</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {territoryListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between group transition-all"
              >
                <div>
                  <Link href={`/business/${listing.slug || listing.id}`} className="block">
                    <div className="relative h-40 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={listing.coverImage}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white">
                        {listing.categoryName}
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1.5">
                      <h3 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {listing.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{listing.address}</span>
                      </p>
                    </div>
                  </Link>
                </div>

                <div className="p-3 pt-0 flex items-center gap-2">
                  <a
                    href={`https://wa.me/91${listing.whatsapp || listing.phone}?text=${encodeURIComponent(`నమస్కారం! నేను మీ '${listing.title}' వ్యాపారాన్ని ${territory.name} వెబ్‌సైట్ లో చూశాను.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${listing.phone}`}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    title="Call Shop"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-slate-900 text-sm">{territory.name} SuperApp</div>
            <p className="text-[11px] text-slate-500">
              Operated locally by authorized franchise partners. Powered by the Hyperlocal SaaS Platform.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/" className="hover:text-emerald-600 transition-colors">
              Choutuppal.in Flagship
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Town WhatsApp Support Button */}
      <a
        href={`https://wa.me/91${whatsappPhone}?text=${encodeURIComponent(`హలో! నాకు ${territory.name} లో సహాయం కావాలి.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105"
        title="Chat with Town WhatsApp Bot"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  )
}
