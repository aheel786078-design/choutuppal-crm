'use client'

import { useState, useEffect } from 'react'
import { Play, ChevronRight, X, Eye, Heart, Instagram, Plus, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { SectionHeading } from './section-heading'
import Image from 'next/image'
import type { ShortItem as Short } from '@/lib/types'
import Script from 'next/script'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ShortsRailProps {
  shorts: Array<{
    id: string
    videoUrl: string
    platform?: string
    thumbnail?: string | null
    title?: string | null
    description?: string | null
    views?: number
    likes?: number
    youtubeId?: string | null
    createdAt?: Date | string
    owner?: { username?: string | null; name?: string | null } | null
  }>
}

function thumbUrl(youtubeId: string | null, platform: string | undefined, fallback: string) {
  if (platform === 'INSTAGRAM') return ''
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
  return fallback
}

function embedUrl(youtubeId: string | null, videoUrl: string): string {
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
  const m = videoUrl.match(/[?&]v=([^&]+)/)
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`
  return videoUrl
}

export function ShortsRail({ shorts }: ShortsRailProps) {
  const [active, setActive] = useState<number | null>(null)

  // Upload Reel Modal state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [reelUrl, setReelUrl] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (active !== null && shorts[active]?.platform === 'INSTAGRAM') {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          // @ts-ignore
          window.instgrm?.Embeds.process()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [active, shorts])

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reelUrl.trim()) {
      toast.error('Please enter an Instagram or YouTube Reel link')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/shorts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: reelUrl, title, phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit Reel')

      toast.success('Reel submitted! It will appear on the homepage after review.')
      setUploadOpen(false)
      setReelUrl('')
      setTitle('')
      setPhone('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="shorts" className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <Script src="https://www.instagram.com/embed.js" strategy="afterInteractive" />
      <SectionHeading
        title="Shorts & Reels"
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setUploadOpen(true)}
              size="sm"
              className="gap-1.5 gradient-brand font-bold text-xs text-white shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Submit Reel
            </Button>
          </div>
        }
      />
      <div
        className="no-scrollbar mt-3.5 flex w-full max-w-full gap-3 overflow-x-auto pb-4 touch-pan-x sm:gap-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {shorts.map((s, i) => {
          const owner = s.owner?.username ?? s.owner?.name ?? 'Choutuppal'
          const isInstagram = s.platform === 'INSTAGRAM'
          return (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className="hover-lift group relative block h-56 w-32 shrink-0 overflow-hidden rounded-2xl glass sm:h-64 sm:w-36"
            >
              <div className="relative h-full w-full overflow-hidden">
                {isInstagram ? (
                  <div className="h-full w-full flex flex-col items-center justify-center p-3 text-white bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-500">
                    <Instagram className="h-8 w-8 mb-2 drop-shadow-md" />
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-black/20 px-2 py-0.5 rounded-full">Reel</span>
                  </div>
                ) : (
                  <Image
                    src={thumbUrl(s.youtubeId ?? null, s.platform, s.thumbnail ?? '') || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&auto=format&fit=crop&q=80'}
                    alt={s.title ?? 'Short'}
                    fill
                    sizes="(max-width: 640px) 128px, 144px"
                    className="object-cover transition duration-500 group-hover:scale-110"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className={cn(
                  "absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110",
                  isInstagram ? "text-pink-700" : "text-blue-700"
                )}>
                  <Play className={cn("h-5 w-5", isInstagram ? "fill-pink-700" : "fill-blue-700")} />
                </span>
                <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                  <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                    {s.title ?? 'Short'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/70">@{owner}</p>
                  <div className="mt-1 flex items-center gap-2 text-[9px] text-white/60">
                    <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {s.views ?? 0}</span>
                    <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {s.likes ?? 0}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal Player */}
      {active !== null && shorts[active] ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/90 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative aspect-[9/16] h-[80vh] max-h-[80vh] w-auto overflow-hidden rounded-2xl bg-black shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {shorts[active].platform === 'INSTAGRAM' ? (
              <div className="w-[320px] h-[560px] overflow-y-auto fancy-scroll bg-white rounded-xl p-1 flex items-center justify-center">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={shorts[active].videoUrl}
                  data-instgrm-version="14"
                  style={{ width: '320px', minHeight: '480px', border: 'none', margin: '0 auto' }}
                />
              </div>
            ) : (
              <iframe
                src={embedUrl(shorts[active].youtubeId ?? null, shorts[active].videoUrl)}
                title={shorts[active].title ?? 'Short'}
                className="h-full w-full"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
              <p className="text-sm font-semibold text-white">{shorts[active].title ?? 'Short'}</p>
              <p className="text-xs text-white/70">
                @{shorts[active].owner?.username ?? shorts[active].owner?.name ?? 'Choutuppal'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload Reel Modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md bg-white border-gray-200 text-gray-900 font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Instagram className="h-5 w-5 text-pink-600" /> Submit Reel for Promotion
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Paste your Instagram Reel or YouTube Shorts link to showcase your shop or talent on the homepage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-3.5 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reel / Shorts URL *</label>
              <Input
                value={reelUrl}
                onChange={(e) => setReelUrl(e.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                className="border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reel Title / Shop Name</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sri Lakshmi Textiles Offer Reel"
                className="border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9494348175"
                className="border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gap-2 gradient-brand text-white font-bold text-xs h-10 mt-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Reel for Homepage
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
