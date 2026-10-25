'use client'
import Image from 'next/image';

import Link from 'next/link'
import { MapPin, ChevronRight, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeading } from './section-heading'

const FALLBACK_RE_IMAGE =
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80'

type Property = {
  id: string
  title: string
  slug: string
  coverImage?: string | null
  price: number
  type: string
  listingType: string
  bedrooms?: number | null
  areaSqft?: number | null
  village?: { name: string; slug: string } | null
}

interface RealEstateRailProps {
  properties: Property[]
}

function formatPrice(price: number, listingType: string) {
  const formatted = new Intl.NumberFormat('en-IN').format(price)
  return listingType === 'RENT' ? `₹${formatted}/mo` : `₹${formatted}`
}

export function RealEstateRail({ properties }: RealEstateRailProps) {
  const topProperties = properties.slice(0, 4)

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <SectionHeading
        title="Premium Properties"
        action={
          <Link href="/listings?tab=realestate">
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
        {topProperties.map((p) => {
          const imgUrl = p.coverImage || FALLBACK_RE_IMAGE
          return (
            <Link
              key={p.id}
              href={`/listings?tab=realestate`}
              prefetch={true}
              className="hover-lift group flex w-full flex-col justify-between overflow-hidden rounded-2xl glass transition-all duration-300 hover:border-blue-400"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <Image width={800} height={800} sizes="(max-width: 768px) 100vw, 33vw"
                  src={imgUrl}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <Badge
                  className={`absolute left-2.5 top-2.5 z-10 ${
                    p.listingType === 'SALE'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                      : 'bg-amber-500 text-white hover:bg-amber-500'
                  }`}
                >
                  For {p.listingType === 'SALE' ? 'Sale' : 'Rent'}
                </Badge>
                <span className="absolute bottom-2.5 right-2.5 z-10 rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 backdrop-blur">
                  {p.type}
                </span>
              </div>

              <div className="p-3">
                <h3 className="truncate font-bold text-slate-900 text-sm sm:text-base">{p.title}</h3>
                <div className="mt-1 flex items-baseline gap-1 text-blue-700">
                  <IndianRupee className="h-3.5 w-3.5" />
                  <span className="text-base font-black tracking-tight sm:text-lg">
                    {formatPrice(p.price, p.listingType).replace('₹', '')}
                  </span>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                  <span className="truncate">{p.village?.name ?? 'Choutuppal'}</span>
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
