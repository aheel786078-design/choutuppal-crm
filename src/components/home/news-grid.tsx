'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ChevronRight, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './section-heading'

interface NewsGridProps {
  articles: Array<{
    id: string
    title: string
    slug: string
    summary: string | null
    image: string | null
    createdAt: Date | string
  }>
}

export function NewsGrid({ articles }: NewsGridProps) {
  if (!articles || articles.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <SectionHeading
        title="Latest News"
        action={
          <Link href="/news">
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
        {articles.slice(0, 8).map((a) => (
          <Link
            key={a.id}
            href={`/news/${a.slug}`}
            prefetch={true}
            className="hover-lift group flex w-full flex-col justify-between overflow-hidden rounded-2xl glass"
          >
            <div>
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                {a.image ? (
                  <Image
                    src={a.image}
                    alt={a.title}
                    width={800} height={500}
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center gradient-brand">
                    <Newspaper className="h-7 w-7 text-white" />
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  News
                </span>
              </div>

              <div className="p-3">
                <h3 className="line-clamp-2 font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors">
                  {a.title}
                </h3>
                {a.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{a.summary}</p>
                ) : null}
              </div>
            </div>

            <div className="px-3 pb-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Calendar className="h-3 w-3 text-amber-500 shrink-0" />
                {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
