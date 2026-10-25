'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import {
  Play,
  Share2,
  Plus,
  ArrowLeft,
  X,
  ExternalLink,
  MessageCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { WHATSAPP_BOT_NUMBER } from '@/lib/constants'

interface ShortVideo {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string
  tags: string[]
  views: number
  platform: 'YOUTUBE' | 'INSTAGRAM' | 'DIRECT'
}

function parseVideoSource(url: string): { platform: 'YOUTUBE' | 'INSTAGRAM' | 'DIRECT'; embedUrl: string; thumbnail: string } {
  // YouTube Shorts or standard video
  const ytMatch = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      platform: 'YOUTUBE',
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  // Instagram Reel or Post
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([\w-]+)/)
  if (igMatch) {
    const id = igMatch[1]
    return {
      platform: 'INSTAGRAM',
      embedUrl: `https://www.instagram.com/p/${id}/embed`,
      thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80',
    }
  }

  // Fallback
  return {
    platform: 'DIRECT',
    embedUrl: url,
    thumbnail: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80',
  }
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<ShortVideo[]>([
    {
      id: 'sh_1',
      title: 'Famous Choutuppal Friday Vegetable & Cattle Sandha Tour',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80',
      tags: ['Choutuppal', 'Market', 'LocalLife'],
      views: 3410,
      platform: 'YOUTUBE',
    },
    {
      id: 'sh_2',
      title: 'Vijayawada NH-65 Highway Fast Toll Plaza & Food Court at Panthangi',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      tags: ['Highway', 'Food', 'Panthangi'],
      views: 1890,
      platform: 'YOUTUBE',
    },
    {
      id: 'sh_3',
      title: 'Traditional Pochampally Handloom Sarees Weaving process near Choutuppal',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      tags: ['Handloom', 'Pochampally', 'Craft'],
      views: 5200,
      platform: 'YOUTUBE',
    },
  ])

  const [activeShort, setActiveShort] = useState<ShortVideo | null>(null)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitTag, setSubmitTag] = useState('Choutuppal')

  // Load from store via API on mount
  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.shorts && Array.isArray(data.shorts) && data.shorts.length > 0) {
          const mapped = data.shorts.map((s: any) => {
            const parsed = parseVideoSource(s.videoUrl)
            return {
              id: s.id,
              title: s.title,
              videoUrl: s.videoUrl,
              thumbnailUrl: s.thumbnailUrl || parsed.thumbnail,
              tags: s.tags || ['Choutuppal'],
              views: s.views || 100,
              platform: parsed.platform,
            }
          })
          setShorts(mapped)
        }
      })
      .catch(() => {})
  }, [])

  function handleAddReel(e: React.FormEvent) {
    e.preventDefault()
    if (!submitUrl.trim()) {
      toast.error('Please enter Instagram Reel or YouTube Shorts URL')
      return
    }

    const parsed = parseVideoSource(submitUrl)
    const newReel: ShortVideo = {
      id: `reel_${Date.now()}`,
      title: submitTitle.trim() || 'New Local Reel',
      videoUrl: submitUrl.trim(),
      thumbnailUrl: parsed.thumbnail,
      tags: [submitTag.trim() || 'Choutuppal'],
      views: 1,
      platform: parsed.platform,
    }

    setShorts([newReel, ...shorts])
    setIsSubmitOpen(false)
    setSubmitUrl('')
    setSubmitTitle('')
    toast.success('Reel added successfully to feed!')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      <Script src="https://www.instagram.com/embed.js" strategy="afterInteractive" />

      {/* TOP BAR */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight">
                🎬 Choutuppal Reels &amp; Shorts (రీల్స్)
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Watch Instagram Reels &amp; YouTube Shorts of Choutuppal events, shops, and culture
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSubmitOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            <span>Submit Reel (లింక్ ఇవ్వండి)</span>
          </button>
        </div>
      </div>

      {/* FEED GRID */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {shorts.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col justify-between group"
            >
              <div
                onClick={() => setActiveShort(item)}
                className="relative h-72 sm:h-80 w-full cursor-pointer bg-slate-800 overflow-hidden"
              >
                <Image
                  src={item.thumbnailUrl}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
                
                {/* PLAY BADGE */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white shadow-xl group-hover:scale-110 transition border border-white/30">
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                  </span>
                </div>

                {/* PLATFORM BADGE */}
                <div className="absolute top-2.5 left-2.5">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm ${item.platform === 'INSTAGRAM' ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' : 'bg-red-600 text-white'}`}>
                    {item.platform}
                  </span>
                </div>

                {/* BOTTOM TITLE & VIEWS */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-extrabold text-white text-xs sm:text-sm line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {item.views.toLocaleString()}
                    </span>
                    {item.tags && item.tags.length > 0 ? (
                      <span className="text-amber-400 font-semibold truncate">#{item.tags[0]}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveShort(item)}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  Watch Now
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out this Choutuppal Reel: "${item.title}" on https://choutuppal.in/shorts`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIDEO PLAYER MODAL */}
      {activeShort ? (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setActiveShort(null)}
              className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* PLAYER CONTAINER */}
            <div className="relative aspect-[9/16] w-full bg-black flex items-center justify-center">
              {parseVideoSource(activeShort.videoUrl).platform === 'YOUTUBE' ? (
                <iframe
                  src={parseVideoSource(activeShort.videoUrl).embedUrl}
                  title={activeShort.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : parseVideoSource(activeShort.videoUrl).platform === 'INSTAGRAM' ? (
                <iframe
                  src={parseVideoSource(activeShort.videoUrl).embedUrl}
                  title={activeShort.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeShort.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* INFO UNDER PLAYER */}
            <div className="p-4 bg-slate-900">
              <h2 className="font-black text-sm text-white">{activeShort.title}</h2>
              <div className="mt-3 flex items-center justify-between">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out this Choutuppal Reel: "${activeShort.title}" on https://choutuppal.in/shorts`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share on WhatsApp
                </a>
                <a
                  href={activeShort.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <span>Open Original</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SUBMIT REEL MODAL */}
      {isSubmitOpen ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <button
              onClick={() => setIsSubmitOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-white">
              Submit Local Reel or Short (రీల్ లింక్ జోడించండి)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Paste any Instagram Reel link or YouTube Shorts link. It will automatically convert into an embedded video player!
            </p>

            <form onSubmit={handleAddReel} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video URL (Instagram Reel or YouTube Shorts) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.instagram.com/reel/... or https://youtube.com/shorts/..."
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Supermarket Opening at Choutuppal Bypass"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tag / Village
                </label>
                <input
                  type="text"
                  placeholder="e.g. Choutuppal, Panthangi, Food"
                  value={submitTag}
                  onChange={(e) => setSubmitTag(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-3 rounded-xl text-xs transition shadow-lg"
                >
                  Add Reel to Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
