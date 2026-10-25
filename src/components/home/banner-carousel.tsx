'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Megaphone, Sparkles, MessageCircle, X, ExternalLink, Heart, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export interface BannerItem {
  id: string
  title: string | null
  imageUrl: string
  link: string | null
}

interface BannerCarouselProps {
  banners?: BannerItem[]
}

const DEFAULT_PROMO_BANNERS: BannerItem[] = [
  {
    id: 'choutuppal-promo-1',
    title: 'చౌటుప్పల్ యాప్ 2.0 లైవ్ | మీ వ్యాపారాన్ని ఉచితంగా రిజిస్టర్ చేసుకోండి',
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    link: '/dashboard',
  },
  {
    id: 'choutuppal-promo-2',
    title: 'బ్యానర్ యాడ్స్ ద్వారా 10,000+ స్థానిక కస్టమర్లను చేరుకోండి',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    link: '/dashboard',
  },
  {
    id: 'choutuppal-promo-3',
    title: 'రియల్ ఎస్టేట్ & ప్లాట్లు | జీరో బ్రోకరేజ్ లిస్టింగ్స్',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    link: '/explore?cat=real-estate',
  },
]

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [index, setIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const activeBanners = banners && banners.length > 0 ? banners : DEFAULT_PROMO_BANNERS
  const count = activeBanners.length
  const current = activeBanners[index] || activeBanners[0]

  const go = useCallback((dir: number) => {
    if (count === 0) return
    setIndex((i) => (i + dir + count) % count)
  }, [count])

  // Auto-scroll every 4 seconds (pauses on hover or when modal is open)
  useEffect(() => {
    if (count <= 1 || isPaused || modalOpen) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, 4000)
    return () => clearInterval(timer)
  }, [count, isPaused, modalOpen])

  // Reset liked state when viewing a new banner
  useEffect(() => {
    setIsLiked(false)
  }, [index])

  // Auto-play and progress bar for modal
  useEffect(() => {
    if (!modalOpen || count <= 1) return
    setProgress(0)
    
    const DURATION = 5000
    const start = Date.now()
    
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / DURATION) * 100)
      setProgress(pct)
      
      if (pct >= 100) {
        clearInterval(tick)
        if (index < count - 1) {
          setIndex(index + 1)
        } else {
          setModalOpen(false)
        }
      }
    }, 50)
    
    return () => clearInterval(tick)
  }, [modalOpen, index, count])

  // Body scroll lock for modal
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [modalOpen])

  // Touch swipe for mobile
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50) {
      go(delta > 0 ? -1 : 1)
    }
    touchStartX.current = null
  }

  const trackClick = useCallback(() => {
    if (current?.id && !current.id.startsWith('choutuppal-promo')) {
      fetch(`/api/banners/${current.id}/click`, { method: 'POST' }).catch(() => {})
    }
  }, [current])

  function handleBannerClick() {
    trackClick()
    setModalOpen(true)
  }

  if (!current) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">
      {/* Badge row — ABOVE the banner image (no overlap) */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full gradient-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Banner Ad
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
          ₹99/day
        </span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          Early Bird FREE
        </span>
      </div>

      {/* Banner image — 16:9, full width, constrained height on desktop */}
      <div
        onClick={handleBannerClick}
        className="relative aspect-[16/9] max-h-[380px] sm:max-h-[420px] w-full cursor-pointer overflow-hidden rounded-3xl gradient-brand shadow-md"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {current?.imageUrl ? (
          <Image
            src={current.imageUrl}
            alt={current.title ?? 'Banner Ad'}
            fill
            priority={true}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 95vw, 1200px"
            quality={75}
            className="object-cover bg-slate-900"
          />
        ) : null}
        
        {/* Gloss overlay */}
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 right-10 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%)] pointer-events-none" />

        {/* Dark gradient at bottom for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

        {/* Title overlay at the bottom */}
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10 pointer-events-none">
          <h2 className="text-xl font-black leading-tight text-white drop-shadow-md sm:text-2xl lg:text-3xl max-w-3xl">
            {current?.title ?? 'Promote Your Business to 10,000+ Locals'}
          </h2>
          <p className="mt-1 hidden max-w-xl text-sm text-white/90 sm:block drop-shadow">
            Reach customers across Choutuppal, Panthangi, Lingojiguda, Koyyalagudem &amp; nearby villages.
          </p>
        </div>

        {/* Navigation arrows — only when more than 1 banner */}
        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous banner"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 md:grid"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next banner"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 md:grid"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        {/* Pagination dots with 44px touch targets */}
        {count > 1 ? (
          <div className="absolute bottom-2 right-3 z-10 flex items-center">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
              >
                <span
                  className={cn(
                    'h-2 rounded-full transition-all block',
                    i === index ? 'w-6 bg-white shadow' : 'w-2 bg-white/60 hover:bg-white/90',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* CTA buttons — BELOW the banner */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleBannerClick} size="sm" className="gap-2 bg-white text-blue-700 shadow-sm border border-slate-200 hover:bg-blue-50 font-semibold text-xs sm:text-sm">
          <Megaphone className="h-4 w-4 text-blue-600" />
          View Offer Details
        </Button>
        <a
          href={`https://wa.me/919494348175?text=${encodeURIComponent('నమస్కారం చౌటుప్పల్ యాప్, నా బిజినెస్ కోసం బ్యానర్ అడ్ ఇవ్వాలనుకుంటున్నాను. వివరాలు దయచేసి పంచండి.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-white/90 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-emerald-700 shadow-sm backdrop-blur transition-all hover:bg-emerald-50"
        >
          <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>ప్రమోట్ చేయండి</span>
        </a>
      </div>

      {/* Full-Screen Banner Modal */}
      {mounted && modalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] h-screen w-screen bg-black/95 backdrop-blur-md flex items-center justify-center overflow-hidden">
          <div className="w-full h-full flex items-center justify-center md:relative md:max-w-3xl md:h-[85vh] md:rounded-3xl md:border md:border-slate-800 md:z-50 md:overflow-hidden bg-black md:bg-slate-950">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-[10001] text-white text-3xl cursor-pointer bg-black/60 rounded-full p-2 h-11 w-11 flex items-center justify-center hover:bg-black/90 transition"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>

            {count > 1 ? (
              <>
                {/* Left Tap Zone */}
                <div
                  className="absolute left-0 top-0 h-full w-1/2 z-[10000] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(-1)
                  }}
                />
                {/* Right Tap Zone */}
                <div
                  className="absolute right-0 top-0 h-full w-1/2 z-[10000] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(1)
                  }}
                />
              </>
            ) : null}

            {/* Progress bar */}
            {count > 1 ? (
              <div className="absolute top-0 left-0 w-full z-[10001] flex gap-1 p-2 bg-black/40">
                {activeBanners.map((_, i) => (
                  <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full bg-white transition-all duration-75 ease-linear"
                      style={{
                        width: i < index ? '100%' : i === index ? `${progress}%` : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {/* Media Container */}
            <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none z-[9999]">
              {current?.imageUrl ? (
                <Image fill src={current.imageUrl} alt={current.title ?? 'Banner Ad'} className="object-contain pointer-events-auto" priority quality={80} />
              ) : null}

              <div className="absolute bottom-20 left-4 right-4 bg-black/85 backdrop-blur-md p-5 rounded-2xl pointer-events-auto z-[10001] border border-white/10">
                <h3 className="text-lg md:text-xl font-black text-white">{current?.title ?? 'Special Offer'}</h3>
                <p className="mt-1 text-xs md:text-sm text-slate-300">
                  Reach customers across Choutuppal, Yadadri &amp; nearby villages.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4">
                  {current?.link ? (
                    <a
                      href={current.link}
                      target={current.link.startsWith('http') ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      onClick={trackClick}
                      className="w-full sm:flex-1"
                    >
                      <Button size="lg" className="w-full gap-2 gradient-brand text-white shadow-lg">
                        <ExternalLink className="h-4 w-4" />
                        Visit Offer / Learn More
                      </Button>
                    </a>
                  ) : (
                    <a
                      href="/dashboard"
                      className="w-full sm:flex-1"
                    >
                      <Button size="lg" className="w-full gap-2 gradient-brand text-white shadow-lg">
                        <Megaphone className="h-4 w-4" />
                        Register Business Free
                      </Button>
                    </a>
                  )}

                  <a
                    href={`https://wa.me/919494348175?text=${encodeURIComponent(`నమస్కారం చౌటుప్పల్ యాప్, నా బిజినెస్ కోసం బ్యానర్ అడ్ ఇవ్వాలనుకుంటున్నాను: ${current?.title || 'బ్యానర్ ప్రమోషన్'}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1"
                  >
                    <Button size="lg" variant="outline" className="w-full gap-2 border-emerald-500 text-emerald-400 bg-transparent hover:bg-emerald-950">
                      <MessageCircle className="h-4 w-4" />
                      Inquire on WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Like & Comment */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center gap-4 z-[10001] pointer-events-auto">
              <input
                type="text"
                placeholder="Reply or express interest..."
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 outline-none border border-white/20 text-sm focus:border-white/50"
              />
              <button className="text-white hover:text-blue-400 shrink-0 p-1" aria-label="Send">
                <Send className="h-5 w-5" />
              </button>
              <button onClick={() => setIsLiked(!isLiked)} className="text-white shrink-0 p-1" aria-label="Like banner">
                <Heart className={cn('h-6 w-6 transition', isLiked ? 'fill-red-500 text-red-500' : 'hover:text-red-400')} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
