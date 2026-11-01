'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import {
  Car,
  Armchair,
  Wrench,
  Globe,
  BrickWall,
  Flame,
  Sprout,
  Briefcase,
  Zap,
  Shirt,
  UtensilsCrossed,
  Stethoscope,
  Building2,
  Paintbrush,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  ShieldAlert,
} from 'lucide-react'

export interface CategoryItem {
  name: string
  teluguName?: string
  slug: string
  href?: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  gradient: string
  bgSoft: string
  borderColor: string
  textColor: string
  isEmergency?: boolean
}

export const CATEGORIES_CONFIG: CategoryItem[] = [
  {
    name: 'Govt & Emergency',
    teluguName: 'ప్రభుత్వ అత్యవసర సేవలు',
    slug: 'government-contacts',
    href: '/government-contacts',
    icon: ShieldAlert,
    gradient: 'from-rose-600 to-red-700',
    bgSoft: 'bg-rose-50',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    isEmergency: true,
  },
  {
    name: 'Automobile & Cab',
    teluguName: 'టాక్సీ, ఆటో & గ్యారేజ్',
    slug: 'automobile',
    icon: Car,
    gradient: 'from-amber-500 to-orange-600',
    bgSoft: 'bg-orange-50',
    borderColor: 'border-orange-200/80',
    textColor: 'text-orange-600',
  },
  {
    name: 'Food & Dining',
    teluguName: 'హోటల్స్ & రెస్టారెంట్లు',
    slug: 'food-dining',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-amber-500',
    bgSoft: 'bg-orange-50',
    borderColor: 'border-orange-200/80',
    textColor: 'text-orange-600',
  },
  {
    name: 'Health & Medical',
    teluguName: 'ఆస్పత్రులు & క్లినిక్స్',
    slug: 'health-medical',
    icon: Stethoscope,
    gradient: 'from-cyan-500 to-teal-600',
    bgSoft: 'bg-cyan-50',
    borderColor: 'border-cyan-200/80',
    textColor: 'text-cyan-600',
  },
  {
    name: 'Real Estate',
    teluguName: 'ఓపెన్ ప్లాట్లు & ఇళ్ళు',
    slug: 'real-estate',
    icon: Building2,
    gradient: 'from-blue-600 to-indigo-700',
    bgSoft: 'bg-blue-50',
    borderColor: 'border-blue-200/80',
    textColor: 'text-blue-700',
  },
  {
    name: 'Services',
    teluguName: 'ఎలక్ట్రీషియన్ & ప్లంబర్',
    slug: 'services',
    icon: Wrench,
    gradient: 'from-violet-500 to-purple-600',
    bgSoft: 'bg-violet-50',
    borderColor: 'border-violet-200/80',
    textColor: 'text-violet-600',
  },
  {
    name: 'Retail & Fashion',
    teluguName: 'బట్టల దుకాణాలు & షోరూమ్స్',
    slug: 'retail-fashion',
    icon: Shirt,
    gradient: 'from-pink-500 to-rose-500',
    bgSoft: 'bg-pink-50',
    borderColor: 'border-pink-200/80',
    textColor: 'text-pink-600',
  },
  {
    name: 'Electrical & Hardware',
    teluguName: 'ఎలక్ట్రికల్ & హార్డ్‌వేర్',
    slug: 'electrical-hardware',
    icon: Zap,
    gradient: 'from-yellow-500 to-amber-600',
    bgSoft: 'bg-amber-50',
    borderColor: 'border-amber-200/80',
    textColor: 'text-amber-600',
  },
  {
    name: 'Furniture & Home',
    teluguName: 'ఫర్నిచర్ & హోమ్ డెకోర్',
    slug: 'furniture-home',
    icon: Armchair,
    gradient: 'from-emerald-500 to-teal-600',
    bgSoft: 'bg-emerald-50',
    borderColor: 'border-emerald-200/80',
    textColor: 'text-emerald-600',
  },
  {
    name: 'Building Materials',
    teluguName: 'సిమెంట్, ఐరన్ & మెటీరియల్స్',
    slug: 'building-materials',
    icon: BrickWall,
    gradient: 'from-stone-500 to-zinc-700',
    bgSoft: 'bg-stone-50',
    borderColor: 'border-stone-200/80',
    textColor: 'text-stone-700',
  },
  {
    name: 'Agriculture & Seeds',
    teluguName: 'విత్తనాలు & ఎరువులు',
    slug: 'agriculture-seeds',
    icon: Sprout,
    gradient: 'from-green-600 to-emerald-700',
    bgSoft: 'bg-green-50',
    borderColor: 'border-green-200/80',
    textColor: 'text-green-700',
  },
  {
    name: 'Internet & Cyber',
    teluguName: 'మీ-సేవ & ఆన్‌లైన్ సేవలు',
    slug: 'internet-cyber-cafe',
    icon: Globe,
    gradient: 'from-blue-600 to-cyan-500',
    bgSoft: 'bg-blue-50',
    borderColor: 'border-blue-200/80',
    textColor: 'text-blue-600',
  },
  {
    name: 'Engineering & Welding',
    teluguName: 'వెల్డింగ్ & ఇంజనీరింగ్',
    slug: 'engineering-welding',
    icon: Flame,
    gradient: 'from-red-500 to-rose-600',
    bgSoft: 'bg-red-50',
    borderColor: 'border-red-200/80',
    textColor: 'text-red-600',
  },
  {
    name: 'Retail Shopping',
    teluguName: 'జనరల్ స్టోర్స్ & కిరాణా',
    slug: 'retail-shopping',
    icon: ShoppingBag,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgSoft: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200/80',
    textColor: 'text-fuchsia-600',
  },
  {
    name: 'Agencies & Distributors',
    teluguName: 'ఏజెన్సీలు & హోల్‌సేల్',
    slug: 'agencies-distributors',
    icon: Briefcase,
    gradient: 'from-sky-500 to-blue-700',
    bgSoft: 'bg-sky-50',
    borderColor: 'border-sky-200/80',
    textColor: 'text-sky-700',
  },
  {
    name: 'Interior & Decor',
    teluguName: 'ఇంటీరియర్ డిజైన్ & పెయింట్స్',
    slug: 'interior-decor',
    icon: Paintbrush,
    gradient: 'from-indigo-500 to-purple-600',
    bgSoft: 'bg-indigo-50',
    borderColor: 'border-indigo-200/80',
    textColor: 'text-indigo-600',
  },
]

export function CategoriesGrid() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <section className="w-full relative z-10 my-2" aria-label="Browse Categories">
      {/* Header section with View All link and scroll buttons */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1.5 rounded-full bg-gradient-to-b from-blue-600 to-amber-500" />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Browse Categories
          </h2>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {CATEGORIES_CONFIG.length} Categories
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Navigation Buttons for Desktop & Tablet */}
          <div className="hidden sm:flex items-center gap-1.5 mr-1">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs active:scale-95"
              aria-label="Scroll left categories"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-xs active:scale-95"
              aria-label="Scroll right categories"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Link
            href="/listings"
            className="group inline-flex items-center gap-1 min-h-[44px] px-2 py-1 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors"
          >
            <span>View All</span>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Smooth Horizontal Scrollable Rail on Mobile, Tablet & Desktop */}
      <div className="relative -mx-3 px-3 sm:mx-0 sm:px-0">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-3.5 sm:gap-4 py-2 px-1 scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
        >
          {CATEGORIES_CONFIG.map((cat) => {
            const Icon = cat.icon
            const targetHref = cat.href || `/listings?category=${cat.slug}`
            return (
              <Link
                key={cat.slug}
                href={targetHref}
                prefetch={true}
                className="group flex flex-col items-center flex-shrink-0 w-[90px] sm:w-[104px] select-none text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
              >
                {/* Icon Container with Gradient & Hover/Active animations */}
                <div
                  className={`relative flex items-center justify-center w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-md shadow-slate-300/50 group-hover:shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-200 ease-out border border-white/40 ring-2 ring-transparent group-hover:ring-blue-200`}
                >
                  <Icon size={28} className="transition-transform duration-200 group-hover:scale-110" />
                  {cat.isEmergency && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[9px] font-bold text-white items-center justify-center shadow-xs">
                        !
                      </span>
                    </span>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Category Label */}
                <span className="mt-2 text-[11.5px] sm:text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 leading-tight px-0.5">
                  {cat.name}
                </span>
                {cat.teluguName && (
                  <span className="text-[10px] sm:text-[10.5px] text-slate-500 line-clamp-1 leading-tight px-0.5 mt-0.5">
                    {cat.teluguName}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
