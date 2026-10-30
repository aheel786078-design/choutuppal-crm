import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Home,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Plus,
  MessageCircle,
} from 'lucide-react'
import { loadStore } from '@/lib/store'
import { RealEstateCatalog } from '@/components/real-estate/real-estate-catalog'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Choutuppal Real Estate & Open Plots | DTCP & HMDA Approved',
  description: 'Verified residential open plots, agricultural farmland, commercial buildings, and independent houses along NH-65 in Choutuppal Mandal.',
}

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
              Verified Layouts &amp; Farmlands
            </span>
            <span className="text-slate-400 text-xs">Hyderabad-Vijayawada NH-65 Growth Corridor</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black mt-3 tracking-tight">
            చౌటుప్పల్ ఓపెన్ ప్లాట్లు &amp; రియల్ ఎస్టేట్ (Real Estate)
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Direct owner &amp; developer open plots along Hyderabad-Vijayawada NH-65 highway, DTCP/HMDA layouts, farmlands, commercial buildings, and houses with zero brokerage.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition"
            >
              <Plus className="h-4 w-4" />
              Post Property Free
            </Link>
            <a
              href="https://wa.me/919494348175?text=Hi%20Choutuppal%2C%20interested%20in%20Real%20Estate%20listings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 border border-slate-700 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-700 transition"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              WhatsApp Real Estate Desk
            </a>
          </div>
        </div>
      </div>

      {/* 2. REAL ESTATE CATALOG */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6">
        <RealEstateCatalog initialStoreListings={properties} />
      </div>
    </div>
  )
}
