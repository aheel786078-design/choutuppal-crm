'use client'
import Image from 'next/image';

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus, Star, Heart, Send } from 'lucide-react'
import { cn, sanitizeImageUrl } from '@/lib/utils'
import { toast } from 'sonner'
import type { UserStory as Story } from '@/lib/types'

const StoryCreator = dynamic(
  () => import('@/components/stories/story-creator').then((m) => m.StoryCreator),
  { ssr: false }
)

interface StoriesRailProps {
  stories: {
    id: string
    mediaUrl: string
    mediaType: string
    caption: string | null
    views: number
    expiresAt: Date | null
    createdAt: Date
    owner: { username: string | null; name: string | null; image: string | null }
  }[]
  viewer: {
    isLoggedIn: boolean
    isPremium: boolean
  }
}

export function StoriesRail({ stories, viewer }: StoriesRailProps) {
  const router = useRouter()
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset liked state when viewing a new story
  useEffect(() => {
    setIsLiked(false)
  }, [viewerIndex])

  // Auto-play and progress bar
  useEffect(() => {
    if (viewerIndex === null) return
    setProgress(0)
    
    const STORY_DURATION = 5000
    const start = Date.now()
    
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / STORY_DURATION) * 100)
      setProgress(pct)
      
      if (pct >= 100) {
        clearInterval(tick)
        // Note: storyItems length is derived from stories prop. 
        // We use stories.length to avoid dependency cycle with storyItems if it's declared after this block or not memoized.
        if (viewerIndex < stories.length - 1) {
          setViewerIndex(viewerIndex + 1)
        } else {
          setViewerIndex(null)
        }
      }
    }, 50)
    
    return () => clearInterval(tick)
  }, [viewerIndex, stories.length])

  useEffect(() => {
    if (viewerIndex !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [viewerIndex])

  const storyItems = (stories || []).map((s) => {
    const expiresStr = s.expiresAt
      ? typeof s.expiresAt === 'string'
        ? s.expiresAt
        : s.expiresAt.toISOString?.() || new Date().toISOString()
      : new Date().toISOString()
    const createdStr = s.createdAt
      ? typeof s.createdAt === 'string'
        ? s.createdAt
        : s.createdAt.toISOString?.() || new Date().toISOString()
      : new Date().toISOString()

    return {
      id: s.id,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType || 'IMAGE',
      caption: s.caption,
      views: s.views || 0,
      expiresAt: expiresStr,
      createdAt: createdStr,
      owner: {
        id: '',
        name: s.owner?.name || s.owner?.username || 'User',
        username: s.owner?.username || 'user',
        image: s.owner?.image || null,
      },
    }
  })

  function handleAddClick() {
    if (!viewer.isLoggedIn) {
      toast.info('స్టోరీ పోస్ట్ చేయడానికి దయచేసి లాగిన్ అవ్వండి')
      router.push('/login')
      return
    }
    if (!viewer.isPremium) {
      toast.error('స్టోరీలు పోస్ట్ చేయడం కేవలం ప్రీమియం యూజర్లకే. ఇప్పుడే అప్‌గ్రేడ్ చేయండి!', {
        duration: 5000,
        action: { label: 'Upgrade', onClick: () => router.push('/dashboard') },
      })
      return
    }
    setCreatorOpen(true)
  }

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          Stories
        </h2>
        <span className="text-[11px] font-semibold text-amber-600">Premium</span>
      </div>

      {/* Container: left-aligned, horizontal scroll, no wrap */}
      <div
        className="no-scrollbar mt-3 flex w-full max-w-full justify-start gap-4 overflow-x-auto px-4 pb-3 flex-nowrap touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Add story button */}
        <button
          onClick={handleAddClick}
          className="mr-4 flex shrink-0 flex-col items-center"
          aria-label="Add your story"
        >
          <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-slate-300 bg-white/70 text-slate-400 transition hover:border-blue-400 hover:text-blue-600">
            <Plus className="h-6 w-6" />
          </span>
          <span className="mt-1 w-16 truncate text-center text-xs text-slate-500">
            Your Story
          </span>
        </button>

        {/* Story cards */}
        {storyItems.map((s, i) => {
          const name = s.owner.username ?? s.owner.name ?? `Story ${i + 1}`
          const initial = name.charAt(0).toUpperCase()
          return (
            <button
              key={s.id}
              onClick={() => setViewerIndex(i)}
              className="mr-4 flex shrink-0 flex-col items-center"
              title={s.caption ?? name}
            >
              {/* Premium gradient ring */}
              <span className="rounded-full bg-gradient-to-r from-blue-600 to-yellow-500 p-1">
                <span className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-amber-400 text-lg font-bold text-white">
                  {s.owner.image ? (
                    <Image width={800} height={800} loading="lazy" decoding="async" sizes="(max-width: 768px) 100vw, 33vw"
                      src={sanitizeImageUrl(s.owner.image)}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                  <Star className="absolute right-0 top-0 h-4 w-4 fill-amber-400 text-amber-500" />
                </span>
              </span>
              {/* Text below */}
              <span className="mt-1 w-16 truncate text-center text-xs text-slate-600">
                {name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Full-screen viewer Modal */}
      {mounted && viewerIndex !== null && storyItems[viewerIndex] && createPortal(
        <div className="fixed inset-0 z-[9999] h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
          <div className="w-full h-full flex items-center justify-center md:relative md:max-w-md md:h-[85vh] md:rounded-2xl md:z-50 md:overflow-hidden md:border md:border-white/10 bg-black">
            {/* Close Button */}
            <button
              onClick={() => setViewerIndex(null)}
              className="absolute top-4 right-4 z-[10001] text-white text-3xl cursor-pointer bg-black/40 rounded-full p-2 h-12 w-12 flex items-center justify-center"
            >
              &times;
            </button>

            {/* Left Tap Zone (Previous) */}
            <div
              className="absolute left-0 top-0 h-full w-1/2 z-[10000] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (viewerIndex > 0) setViewerIndex(viewerIndex - 1)
              }}
            />

            {/* Right Tap Zone (Next) */}
            <div
              className="absolute right-0 top-0 h-full w-1/2 z-[10000] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (viewerIndex < storyItems.length - 1) {
                  setViewerIndex(viewerIndex + 1)
                } else {
                  setViewerIndex(null)
                }
              }}
            />

            {/* Progress bar */}
            <div className="absolute top-0 left-0 w-full z-[10001] flex gap-1 p-2">
              {storyItems.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{
                      width: i < viewerIndex ? '100%' : i === viewerIndex ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Media Container */}
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-[9999]">
              {storyItems[viewerIndex].mediaType === 'VIDEO' ? (
                <video
                  src={storyItems[viewerIndex].mediaUrl}
                  autoPlay
                  controls={false}
                  playsInline
                  className="max-h-full max-w-full object-contain pointer-events-auto"
                />
              ) : (
                <Image width={800} height={800} loading="lazy" decoding="async"
                  src={sanitizeImageUrl(storyItems[viewerIndex].mediaUrl)}
                  alt={storyItems[viewerIndex].caption || 'Story'}
                  className="max-h-full max-w-full object-contain pointer-events-auto"
                />
              )}
              
              {/* Caption Overlay */}
              {storyItems[viewerIndex].caption && (
                <div className="absolute bottom-20 left-4 right-4 text-white text-base bg-black/60 p-4 rounded-xl backdrop-blur-md z-[10001] pointer-events-auto text-center">
                  {storyItems[viewerIndex].caption}
                </div>
              )}
            </div>

            {/* Bottom Bar: Like & Comment */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-4 z-[10001] pointer-events-auto">
              <input
                type="text"
                placeholder="Reply..."
                className="flex-1 bg-white/10 text-white rounded-full px-4 py-2 outline-none border border-white/20"
              />
              <button className="text-white hover:text-blue-400 shrink-0">
                <Send className="h-5 w-5" />
              </button>
              <button onClick={() => setIsLiked(!isLiked)} className="text-white shrink-0">
                <Heart className={cn('h-7 w-7 transition', isLiked && 'fill-red-500 text-red-500')} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Creator modal */}
      <StoryCreator
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        onCreated={() => {
          // Refresh the page to show the new story (simple, reliable).
          window.location.reload()
        }}
      />
    </section>
  )
}
