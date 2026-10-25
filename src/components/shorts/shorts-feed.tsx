'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import Script from 'next/script'

interface ShortsFeedProps {
  shorts: any[]
}

const WHATSAPP_LINK =
  'https://wa.me/919494348175?text=' +
  encodeURIComponent('నేను మా యూట్యూబ్ వీడియో చౌటుప్పల్ యాప్ లో పోస్ట్ చేయాలనుకుంటున్నాను')

function embedUrl(youtubeId: string | null, videoUrl: string): string {
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&playsinline=1`
  const m = videoUrl?.match(/[?&]v=([^&]+)/)
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1`
  const shortMatch = videoUrl?.match(/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0&playsinline=1`
  return videoUrl
}

export function ShortsFeed({ shorts: initialShorts }: ShortsFeedProps) {
  const [items, setItems] = useState<any[]>(initialShorts || [])
  const [activeIndex, setActiveIndex] = useState(0)

  // Live sync with backend
  useEffect(() => {
    let isMounted = true
    async function syncShorts() {
      try {
        const res = await fetch('/api/shorts', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data.ok && Array.isArray(data.shorts) && isMounted && data.shorts.length > 0) {
            setItems(data.shorts)
          }
        }
      } catch (e) {
        // silent fallback to initial
      }
    }
    syncShorts()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (items[activeIndex]?.platform === 'INSTAGRAM') {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          // @ts-ignore
          window.instgrm?.Embeds.process()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeIndex, items])

  if (items.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black text-center text-white px-4">
        {/* Back button overlay */}
        <Link
          href="/"
          className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          aria-label="Back to home"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="text-base font-medium text-white/80">No shorts available yet.</p>
        <p className="font-telugu mt-2 text-xs text-white/60">
          మీ వ్యాపారం లేదా షాప్ వీడియో పోస్ట్ చేయాలనుకుంటే ఇక్కడ క్లిక్ చేయండి
        </p>
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 rounded-full bg-gradient-to-r from-blue-600 to-yellow-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition active:scale-95"
        >
          వీడియో పోస్ట్ చేయండి
        </a>
      </div>
    )
  }

  return (
    <div
      className="h-screen overflow-y-auto snap-y snap-mandatory bg-black"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      onScroll={(e) => {
        const el = e.currentTarget
        const idx = Math.round(el.scrollTop / el.clientHeight)
        if (idx !== activeIndex) setActiveIndex(idx)
      }}
    >
      <Script src="https://www.instagram.com/embed.js" strategy="afterInteractive" />
      <style>{`::-webkit-scrollbar { display: none; }`}</style>

      {/* Back button overlay */}
      <Link
        href="/"
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        aria-label="Back to home"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>

      {items.map((s, i) => (
        <div
          key={s.id || i}
          className="relative flex h-screen w-full snap-start items-center justify-center bg-black"
        >
          {s.platform === 'INSTAGRAM' ? (
            i === activeIndex ? (
              <div className="w-[320px] h-[560px] overflow-y-auto fancy-scroll bg-white rounded-xl p-1 flex items-center justify-center">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={s.videoUrl}
                  data-instgrm-version="14"
                  style={{ width: '320px', minHeight: '480px', border: 'none', margin: '0 auto' }}
                />
              </div>
            ) : (
              <div className="w-[320px] h-[560px] bg-slate-900 rounded-xl flex items-center justify-center text-white/50 text-xs">
                Loading Reel...
              </div>
            )
          ) : (
            <iframe
              src={i === activeIndex ? embedUrl(s.youtubeId, s.videoUrl) : undefined}
              title={s.title ?? 'Short'}
              className="h-full w-full max-w-lg border-0"
              loading="lazy"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Title + channel at bottom */}
          <div className="pointer-events-none absolute bottom-24 left-4 right-20 z-10">
            <p className="text-sm font-semibold text-white drop-shadow-lg line-clamp-2">
              {s.title ?? 'Choutuppal Short Video'}
            </p>
            <p className="text-xs text-white/80 drop-shadow mt-0.5">
              @{s.owner?.username ?? s.owner?.name ?? 'choutuppal'}
            </p>
          </div>

          {/* WhatsApp CTA */}
          <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center gap-1.5 px-4">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gradient-to-r from-blue-600 to-yellow-500 px-5 py-2 text-xs font-bold text-white shadow-lg transition active:scale-95"
            >
              వీడియో పోస్ట్ చేయండి
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}

