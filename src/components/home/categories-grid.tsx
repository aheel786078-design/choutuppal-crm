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
} from 'lucide-react'

export interface CategoryItem {
  name: string
  slug: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  gradient: string
  bgSoft: string
  borderColor: string
  textColor: string
}

export const CATEGORIES_CONFIG: CategoryItem[] = [
  {
    name: 'Automobile',
    slug: 'automobile',
    icon: Car,
    gradient: 'from-amber-500 to-orange-600',
    bgSoft: 'bg-orange-50',
    borderColor: 'border-orange-200/80',
    textColor: 'text-orange-600',
  },
  {
    name: 'Internet & Cyber',
    slug: 'internet-cyber-cafe',
    icon: Globe,
    gradient: 'from-blue-600 to-cyan-500',
    bgSoft: 'bg-blue-50',
    borderColor: 'border-blue-200/80',
    textColor: 'text-blue-600',
  },
  {
    name: 'Engineering & Welding',
    slug: 'engineering-welding',
    icon: Flame,
    gradient: 'from-red-500 to-rose-600',
    bgSoft: 'bg-red-50',
    borderColor: 'border-red-200/80',
    textColor: 'text-red-600',
  },
  {
    name: 'Furniture & Home',
    slug: 'furniture-home',
    icon: Armchair,
    gradient: 'from-emerald-500 to-teal-600',
    bgSoft: 'bg-emerald-50',
    borderColor: 'border-emerald-200/80',
    textColor: 'text-emerald-600',
  },
  {
    name: 'Electrical & Hardware',
    slug: 'electrical-hardware',
    icon: Zap,
    gradient: 'from-yellow-500 to-amber-600',
    bgSoft: 'bg-amber-50',
    borderColor: 'border-amber-200/80',
    textColor: 'text-amber-600',
  },
  {
    name: 'Building Materials',
    slug: 'building-materials',
    icon: BrickWall,
    gradient: 'from-stone-500 to-zinc-700',
    bgSoft: 'bg-stone-50',
    borderColor: 'border-stone-200/80',
    textColor: 'text-stone-700',
  },
  {
    name: 'Interior & Decor',
    slug: 'interior-decor',
    icon: Paintbrush,
    gradient: 'from-indigo-500 to-purple-600',
    bgSoft: 'bg-indigo-50',
    borderColor: 'border-indigo-200/80',
    textColor: 'text-indigo-600',
  },
  {
    name: 'Agriculture & Seeds',
    slug: 'agriculture-seeds',
    icon: Sprout,
    gradient: 'from-green-600 to-emerald-700',
    bgSoft: 'bg-green-50',
    borderColor: 'border-green-200/80',
    textColor: 'text-green-700',
  },
  {
    name: 'Retail & Fashion',
    slug: 'retail-fashion',
    icon: Shirt,
    gradient: 'from-pink-500 to-rose-500',
    bgSoft: 'bg-pink-50',
    borderColor: 'border-pink-200/80',
    textColor: 'text-pink-600',
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-amber-500',
    bgSoft: 'bg-orange-50',
    borderColor: 'border-orange-200/80',
    textColor: 'text-orange-600',
  },
  {
    name: 'Health & Medical',
    slug: 'health-medical',
    icon: Stethoscope,
    gradient: 'from-cyan-500 to-teal-600',
    bgSoft: 'bg-cyan-50',
    borderColor: 'border-cyan-200/80',
    textColor: 'text-cyan-600',
  },
  {
    name: 'Services',
    slug: 'services',
    icon: Wrench,
    gradient: 'from-violet-500 to-purple-600',
    bgSoft: 'bg-violet-50',
    borderColor: 'border-violet-200/80',
    textColor: 'text-violet-600',
  },
  {
    name: 'Agencies & Distributors',
    slug: 'agencies-distributors',
    icon: Briefcase,
    gradient: 'from-sky-500 to-blue-700',
    bgSoft: 'bg-sky-50',
    borderColor: 'border-sky-200/80',
    textColor: 'text-sky-700',
  },
  {
    name: 'Real Estate',
    slug: 'real-estate',
    icon: Building2,
    gradient: 'from-blue-600 to-indigo-700',
    bgSoft: 'bg-blue-50',
    borderColor: 'border-blue-200/80',
    textColor: 'text-blue-700',
  },
  {
    name: 'Retail Shopping',
    slug: 'retail-shopping',
    icon: ShoppingBag,
    gradient: 'from-fuchsia-500 to-pink-600',
    bgSoft: 'bg-fuchsia-50',
    borderColor: 'border-fuchsia-200/80',
    textColor: 'text-fuchsia-600',
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
            return (
              <Link
                key={cat.slug}
                href={`/listings?category=${cat.slug}`}
                prefetch={true}
                className="group flex flex-col items-center flex-shrink-0 w-[84px] sm:w-[94px] select-none text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl"
              >
                {/* Icon Container with Gradient & Hover/Active animations */}
                <div
                  className={`relative flex items-center justify-center w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-md shadow-slate-300/50 group-hover:shadow-lg group-hover:scale-105 group-active:scale-95 transition-all duration-200 ease-out border border-white/40 ring-2 ring-transparent group-hover:ring-blue-200`}
                >
                  <Icon size={28} className="transition-transform duration-200 group-hover:scale-110" />
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Category Label */}
                <span className="mt-2 text-[11.5px] sm:text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight px-0.5">
                  {cat.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
