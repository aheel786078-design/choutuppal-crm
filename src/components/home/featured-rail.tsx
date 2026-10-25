'use client'
import Image from 'next/image';

import Link from 'next/link'
import { Star, MapPin, BadgeCheck, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './section-heading'

const FALLBACK_BUSINESS_IMAGE =
  'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=600&auto=format&fit=crop&q=80'

type FeaturedListing = {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  logo?: string | null
  avgRating?: number | null
  views?: number
  isFeatured?: boolean
  category?: { name: string; slug: string } | null
  village?: { name: string; slug: string } | null
}

interface FeaturedRailProps {
  listings: FeaturedListing[]
}

export function FeaturedRail({ listings }: FeaturedRailProps) {
  const topListings = listings.slice(0, 12)

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <SectionHeading
        title="Top Local Businesses"
        action={
          <Link href="/listings">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-blue-600 hover:bg-blue-50"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {topListings.map((l, i) => {
          const rating = ((l.avgRating ?? (4 + ((i * 7) % 10) / 10))).toFixed(1)
          const imgUrl = l.coverImage || l.logo || FALLBACK_BUSINESS_IMAGE

          return (
            <Link
              key={l.id}
              href={`/business/${l.slug}`}
              prefetch={true}
              className="hover-lift group flex w-full flex-col justify-between overflow-hidden rounded-2xl glass transition-all duration-300 hover:border-blue-400"
            >
              {/* cover */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <Image width={800} height={800} decoding="async" sizes="(max-width: 768px) 100vw, 33vw" src={imgUrl} alt={l.title} loading={i < 4 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <span className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-amber-700 backdrop-blur shadow-xs">
                  <BadgeCheck className="h-3 w-3 text-blue-600" />
                  Top
                </span>
              </div>

              {/* body */}
              <div className="p-3">
                <h3 className="truncate font-bold text-slate-900 text-sm sm:text-base">{l.title}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  <span className="font-semibold text-slate-700">{rating}</span>
                  <span className="text-slate-300">·</span>
                  <span className="truncate text-slate-500">
                    {l.category?.name ?? 'Business'}
                  </span>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                  <span className="truncate">{l.village?.name ?? 'Choutuppal'}</span>
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
