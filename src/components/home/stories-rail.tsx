'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Plus,
  Star,
  Heart,
  Send,
  MessageCircle,
  MessageSquare,
  Share2,
  X,
  Loader2,
  User,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { cn, sanitizeImageUrl } from '@/lib/utils'
import { toast } from 'sonner'
import type { StoryComment } from '@/lib/types'

const StoryCreator = dynamic(
  () => import('@/components/stories/story-creator').then((m) => m.StoryCreator),
  { ssr: false }
)

interface StoriesRailProps {
  stories: {
    id: string
    mediaUrl: string
    mediaType?: string
    caption: string | null
    views?: number
    likesCount?: number
    commentsCount?: number
    sharesCount?: number
    expiresAt?: Date | string | null
    createdAt?: Date | string
    owner?: { username: string | null; name: string | null; image: string | null }
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

  // Interactive Story Data Map (likes, comments count, share count)
  const [storyDataMap, setStoryDataMap] = useState<
    Record<
      string,
      {
        likesCount: number
        isLiked: boolean
        commentsCount: number
        sharesCount: number
      }
    >
  >({})

  // WhatsApp quick reply text
  const [storyReplyText, setStoryReplyText] = useState('')

  // Double tap heart animation
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false)
  const lastTapRef = useRef<number>(0)

  // Comments Drawer State
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false)
  const [activeComments, setActiveComments] = useState<StoryComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Restore author name from localStorage if available
    try {
      const savedName = localStorage.getItem('cpl_story_user_name')
      if (savedName) setCommentAuthor(savedName)
    } catch {
      // ignore
    }
  }, [])

  // Initialize story data map
  useEffect(() => {
    if (!stories || stories.length === 0) return
    const initialMap: Record<string, any> = {}
    stories.forEach((s) => {
      initialMap[s.id] = {
        likesCount: typeof s.likesCount === 'number' ? s.likesCount : 12,
        isLiked: false,
        commentsCount: typeof s.commentsCount === 'number' ? s.commentsCount : 3,
        sharesCount: typeof s.sharesCount === 'number' ? s.sharesCount : 4,
      }
    })
    setStoryDataMap((prev) => ({ ...initialMap, ...prev }))
  }, [stories])

  // Reset states when switching stories
  useEffect(() => {
    setCommentsDrawerOpen(false)
    setStoryReplyText('')
    setShowDoubleTapHeart(false)
  }, [viewerIndex])

  // Auto-play and progress bar (Pauses when comments drawer is open!)
  useEffect(() => {
    if (viewerIndex === null || commentsDrawerOpen) return
    setProgress(0)

    const STORY_DURATION = 5500
    const start = Date.now()

    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / STORY_DURATION) * 100)
      setProgress(pct)

      if (pct >= 100) {
        clearInterval(tick)
        if (viewerIndex < stories.length - 1) {
          setViewerIndex(viewerIndex + 1)
        } else {
          setViewerIndex(null)
        }
      }
    }, 50)

    return () => clearInterval(tick)
  }, [viewerIndex, stories.length, commentsDrawerOpen])

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
        name: s.owner?.name || s.owner?.username || 'Choutuppal Business',
        username: s.owner?.username || 'merchant',
        image: s.owner?.image || null,
      },
    }
  })

  // 1. Toggle Like Handler
  const handleToggleLike = async (storyId: string) => {
    const current = storyDataMap[storyId] || {
      likesCount: 12,
      isLiked: false,
      commentsCount: 3,
      sharesCount: 4,
    }
    const newIsLiked = !current.isLiked
    const newCount = newIsLiked ? current.likesCount + 1 : Math.max(0, current.likesCount - 1)

    // Optimistic UI update
    setStoryDataMap((prev) => ({
      ...prev,
      [storyId]: {
        ...current,
        isLiked: newIsLiked,
        likesCount: newCount,
      },
    }))

    try {
      const res = await fetch(`/api/stories/${storyId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) {
        setStoryDataMap((prev) => ({
          ...prev,
          [storyId]: {
            ...current,
            isLiked: data.isLiked,
            likesCount: data.likesCount,
          },
        }))
      }
    } catch {
      // rollback if failed
    }
  }

  // 2. Double Tap on Media to Like
  const handleMediaTap = (storyId: string) => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      setShowDoubleTapHeart(true)
      setTimeout(() => setShowDoubleTapHeart(false), 800)

      const current = storyDataMap[storyId]
      if (!current?.isLiked) {
        handleToggleLike(storyId)
      }
    }
    lastTapRef.current = now
  }

  // 3. Open Comments Drawer
  const handleOpenComments = async (storyId: string) => {
    setCommentsDrawerOpen(true)
    setLoadingComments(true)
    try {
      const res = await fetch(`/api/stories/${storyId}/comments`)
      const data = await res.json()
      if (data.success && Array.isArray(data.comments)) {
        setActiveComments(data.comments)
        setStoryDataMap((prev) => ({
          ...prev,
          [storyId]: {
            ...(prev[storyId] || { likesCount: 12, isLiked: false, sharesCount: 4 }),
            commentsCount: data.commentsCount,
          },
        }))
      }
    } catch {
      // ignore
    } finally {
      setLoadingComments(false)
    }
  }

  // 4. Submit New Comment
  const handleSubmitComment = async (e: React.FormEvent, storyId: string) => {
    e.preventDefault()
    const text = commentInput.trim()
    if (!text || text.length < 2) {
      toast.error('దయచేసి కమెంట్ రాయండి (కనీసం 2 అక్షరాలు)')
      return
    }

    const name = commentAuthor.trim() || 'స్థానిక పౌరుడు'
    try {
      localStorage.setItem('cpl_story_user_name', name)
    } catch {
      // ignore
    }

    setIsSubmittingComment(true)
    try {
      const res = await fetch(`/api/stories/${storyId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userName: name,
        }),
      })

      const data = await res.json()
      if (data.success && data.comment) {
        setActiveComments((prev) => [data.comment, ...prev])
        setCommentInput('')
        setStoryDataMap((prev) => {
          const current = prev[storyId] || { likesCount: 12, isLiked: false, sharesCount: 4 }
          return {
            ...prev,
            [storyId]: {
              ...current,
              commentsCount: data.commentsCount,
            },
          }
        })
        toast.success('కమెంట్ విజయవంతంగా పోస్ట్ చేయబడింది!')
      } else {
        toast.error(data.error || 'కమెంట్ పోస్ట్ చేయడంలో లోపం')
      }
    } catch (err: any) {
      toast.error(err.message || 'నెట్‌వర్క్ లోపం')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // 5. 1-Tap Share Story
  const handleShareStory = async (story: any) => {
    const storyId = story.id
    const shareUrl = `https://choutuppal.in/stories`
    const shopName = story.owner?.name || 'చౌటుప్పల్ వ్యాపారం'
    const shareTitle = `🔥 చౌటుప్పల్ యాప్‌లో "${shopName}" తాజా ఆఫర్ స్టోరీ!`
    const shareText = story.caption ? `"${story.caption}"\n\nఈ ఆఫర్ పూర్తి వివరాలను ఇక్కడ చూడండి:` : `ఈ ఆఫర్ వివరాలు ఇక్కడ చూడండి:`

    // Optimistically bump sharesCount
    setStoryDataMap((prev) => {
      const current = prev[storyId] || { likesCount: 12, isLiked: false, commentsCount: 3, sharesCount: 4 }
      return {
        ...prev,
        [storyId]: {
          ...current,
          sharesCount: current.sharesCount + 1,
        },
      }
    })

    // Track share in backend
    fetch(`/api/stories/${storyId}/share`, { method: 'POST' }).catch(() => {})

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n${shareText}`,
          url: shareUrl,
        })
        toast.success('స్టోరీ విజయవంతంగా షేర్ చేయబడింది!')
        return
      } catch {
        // Fallback to WhatsApp
      }
    }

    // Fallback: Direct WhatsApp Share
    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n\n${shareText}\n${shareUrl}`)}`
    window.open(waUrl, '_blank')
    toast.success('వాట్సాప్‌లో షేర్ చేయండి!')
  }

  function handleAddClick() {
    if (viewer.isLoggedIn && viewer.isPremium) {
      setCreatorOpen(true)
      return
    }
    const waUrl =
      'https://wa.me/919494348175?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%95%E0%B0%BE%E0%B0%B0%E0%B0%82!%20%E0%B0%A8%E0%B1%87%E0%B0%A8%E0%B1%81%20%E2%82%B999%20%E0%B0%B8%E0%B1%8D%E0%B0%9F%E0%B1%8B%E0%B0%B0%E0%B1%80%20%E0%B0%B5%E0%B0%BF%E0%B0%B7%E0%B1%86%E0%B0%B8%E0%B1%8D%20/%20%E0%B0%86%E0%B0%AB%E0%B0%B0%E0%B1%8D%20%E0%B0%AA%E0%B1%8B%E0%B0%B8%E0%B1%8D%E0%B0%9F%E0%B1%8D%20%E0%B0%9A%E0%B1%87%E0%B0%AF%E0%B0%BE%E0%B0%B2%E0%B0%A8%E0%B1%81%E0%B0%95%E0%B1%81%E0%B0%82%E0%B0%9F%E0%B1%81%E0%B0%A8%E0%B1%8D%E0%B0%A8%E0%B0%BE%E0%B0%A8%E0%B1%81.'
    window.open(waUrl, '_blank')
    toast.success('వాట్సాప్‌లో వివరాలు పంపండి! 30 నిమిషాల్లో స్టోరీ లైవ్ అవుతుంది.')
  }

  const currentStory = viewerIndex !== null ? storyItems[viewerIndex] : null
  const currentData = currentStory
    ? storyDataMap[currentStory.id] || {
        likesCount: 12,
        isLiked: false,
        commentsCount: 3,
        sharesCount: 4,
      }
    : { likesCount: 12, isLiked: false, commentsCount: 3, sharesCount: 4 }

  return (
    <section className="w-full relative z-10" aria-label="Stories and Offers">
      {/* Horizontal Story Rail */}
      <div
        className="no-scrollbar flex w-full max-w-full justify-start gap-4 overflow-x-auto px-1 pb-2 flex-nowrap touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Add story button */}
        <button
          onClick={handleAddClick}
          className="mr-2 flex shrink-0 flex-col items-center group cursor-pointer"
          aria-label="Add your story"
        >
          <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-emerald-400 bg-emerald-50/60 text-emerald-600 transition group-hover:border-emerald-600 group-hover:scale-105 shadow-xs">
            <Plus className="h-6 w-6" />
          </span>
          <span className="mt-1 w-16 truncate text-center text-xs font-bold text-slate-700">
            పోస్ట్ (₹99)
          </span>
        </button>

        {/* Stories Circles */}
        {storyItems.map((story, index) => {
          const data = storyDataMap[story.id] || { likesCount: 12, commentsCount: 3 }
          return (
            <button
              key={story.id}
              onClick={() => setViewerIndex(index)}
              className="flex shrink-0 flex-col items-center group cursor-pointer"
            >
              <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-500 group-hover:scale-105 transition shadow-xs">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white bg-slate-100">
                  <Image
                    src={sanitizeImageUrl(story.mediaUrl)}
                    alt={story.owner.name || 'Story'}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <span className="mt-1 w-18 truncate text-center text-xs font-medium text-slate-800">
                {story.owner.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Full-screen viewer Modal */}
      {mounted && viewerIndex !== null && currentStory && createPortal(
        <div className="fixed inset-0 z-[9999] h-screen w-screen bg-black/95 flex items-center justify-center overflow-hidden backdrop-blur-sm">
          <div className="w-full h-full flex items-center justify-center md:relative md:max-w-md md:h-[88vh] md:rounded-3xl md:z-50 md:overflow-hidden md:border md:border-white/15 bg-black shadow-2xl">
            {/* Top Close Button */}
            <button
              onClick={() => {
                setViewerIndex(null)
                setCommentsDrawerOpen(false)
              }}
              className="absolute top-4 right-4 z-[10003] text-white/90 hover:text-white cursor-pointer bg-black/50 hover:bg-black/80 rounded-full p-2 h-10 w-10 flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Tap Zone (Previous Story) */}
            <div
              className="absolute left-0 top-0 h-full w-1/3 z-[10000] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (commentsDrawerOpen) return
                if (viewerIndex > 0) setViewerIndex(viewerIndex - 1)
              }}
            />

            {/* Right Tap Zone (Next Story) */}
            <div
              className="absolute right-0 top-0 h-full w-1/3 z-[10000] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (commentsDrawerOpen) return
                if (viewerIndex < storyItems.length - 1) {
                  setViewerIndex(viewerIndex + 1)
                } else {
                  setViewerIndex(null)
                }
              }}
            />

            {/* Progress bar */}
            <div className="absolute top-2 left-0 w-full z-[10002] flex gap-1 px-3">
              {storyItems.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75 ease-linear"
                    style={{
                      width: i < viewerIndex ? '100%' : i === viewerIndex ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Story Header (Owner info) */}
            <div className="absolute top-5 left-3 right-16 z-[10002] flex items-center gap-2.5 bg-gradient-to-b from-black/70 to-transparent p-2 rounded-xl">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-emerald-400/80 bg-slate-800 shrink-0">
                <Image
                  src={sanitizeImageUrl(currentStory.mediaUrl)}
                  alt={currentStory.owner.name || 'Owner'}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="truncate">
                <h3 className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 truncate">
                  <span>{currentStory.owner.name}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 fill-emerald-400/20" />
                </h3>
                <span className="text-[10px] text-white/70">చౌటుప్పల్ వెరిఫైడ్ వ్యాపారం</span>
              </div>
            </div>

            {/* Media Container with Double-Tap Support */}
            <div
              className="relative w-full h-full flex items-center justify-center select-none z-[9999]"
              onClick={() => handleMediaTap(currentStory.id)}
            >
              {currentStory.mediaType === 'VIDEO' ? (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  controls={false}
                  playsInline
                  className="max-h-full max-w-full object-contain pointer-events-auto"
                />
              ) : (
                <Image
                  width={800}
                  height={800}
                  priority
                  src={sanitizeImageUrl(currentStory.mediaUrl)}
                  alt={currentStory.caption || 'Story'}
                  className="max-h-full max-w-full object-contain pointer-events-auto"
                />
              )}

              {/* Animated Double-Tap Big Heart */}
              {showDoubleTapHeart && (
                <div className="absolute inset-0 flex items-center justify-center z-[10004] pointer-events-none animate-ping duration-300">
                  <Heart className="w-24 h-24 fill-red-500 text-red-500 drop-shadow-2xl opacity-90 scale-125" />
                </div>
              )}

              {/* Caption Overlay */}
              {currentStory.caption && !commentsDrawerOpen && (
                <div className="absolute bottom-20 left-4 right-4 text-white text-xs sm:text-sm font-medium bg-black/75 p-3 rounded-2xl backdrop-blur-md z-[10001] pointer-events-auto text-center border border-white/10 shadow-lg">
                  {currentStory.caption}
                </div>
              )}
            </div>

            {/* BOTTOM INTERACTIVE DOCK: WhatsApp Reply, Like, Comment, Share */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/85 to-transparent flex items-center gap-2 z-[10001] pointer-events-auto">
              {/* WhatsApp Quick Reply Input */}
              <div className="flex-1 flex items-center bg-white/15 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 focus-within:border-emerald-400 transition">
                <input
                  type="text"
                  value={storyReplyText}
                  onChange={(e) => setStoryReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const text = storyReplyText.trim() || currentStory.caption || 'Story Offer'
                      window.open(
                        `https://wa.me/919494348175?text=${encodeURIComponent(
                          `Hi Choutuppal, I saw your Story from "${currentStory.owner.name}": ${text}`
                        )}`,
                        '_blank'
                      )
                      setStoryReplyText('')
                    }
                  }}
                  placeholder="వ్యాపారికి WhatsApp రిప్లై..."
                  className="w-full bg-transparent text-white outline-none text-xs placeholder:text-white/60"
                />
                <button
                  type="button"
                  onClick={() => {
                    const text = storyReplyText.trim() || currentStory.caption || 'Story Offer'
                    window.open(
                      `https://wa.me/919494348175?text=${encodeURIComponent(
                        `Hi Choutuppal, I saw your Story from "${currentStory.owner.name}": ${text}`
                      )}`,
                      '_blank'
                    )
                    setStoryReplyText('')
                  }}
                  className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer transition shrink-0"
                  title="Send via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ❤️ Like Button (Private Count: Hidden from Public) */}
              <button
                type="button"
                onClick={() => handleToggleLike(currentStory.id)}
                className="flex flex-col items-center justify-center min-w-[38px] text-white hover:scale-110 active:scale-90 transition cursor-pointer"
                title="Like story"
              >
                <Heart
                  className={cn(
                    'w-6 h-6 transition-colors',
                    currentData.isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                  )}
                />
                <span className="text-[10px] font-medium text-white/80 -mt-0.5">
                  లైక్
                </span>
              </button>

              {/* 💬 Comments Drawer Button (Private Count: Hidden from Public) */}
              <button
                type="button"
                onClick={() => handleOpenComments(currentStory.id)}
                className="flex flex-col items-center justify-center min-w-[38px] text-white hover:scale-110 active:scale-90 transition cursor-pointer"
                title="View & post comments"
              >
                <MessageSquare className="w-6 h-6 text-white" />
                <span className="text-[10px] font-medium text-white/80 -mt-0.5">
                  కమెంట్స్
                </span>
              </button>

              {/* 📤 1-Tap Share Button */}
              <button
                type="button"
                onClick={() => handleShareStory(currentStory)}
                className="flex flex-col items-center justify-center min-w-[38px] text-white hover:scale-110 active:scale-90 transition cursor-pointer"
                title="Share story"
              >
                <Share2 className="w-6 h-6 text-white" />
                <span className="text-[10px] font-medium text-white/80 -mt-0.5">
                  షేర్
                </span>
              </button>
            </div>

            {/* 💬 COMMENTS BOTTOM DRAWER MODAL */}
            {commentsDrawerOpen && (
              <div className="absolute inset-x-0 bottom-0 max-h-[70%] h-[70%] bg-slate-900/95 backdrop-blur-xl border-t border-white/20 rounded-t-3xl z-[10005] flex flex-col shadow-2xl text-white pointer-events-auto animate-in slide-in-from-bottom duration-200">
                {/* Drawer Header (Private Count: Hidden from Public) */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      కమెంట్లు &amp; ప్రశ్నలు (Comments &amp; Inquiries)
                    </h4>
                  </div>
                  <button
                    onClick={() => setCommentsDrawerOpen(false)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                    title="Close comments"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Comments List Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingComments ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-white/60">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <span className="text-xs">కమెంట్లు లోడ్ అవుతున్నాయి...</span>
                    </div>
                  ) : activeComments.length === 0 ? (
                    <div className="py-10 text-center text-white/60 space-y-2">
                      <Sparkles className="w-7 h-7 mx-auto text-emerald-400/60" />
                      <p className="text-xs">ఇంకా కమెంట్లు లేవు. మొదటి కమెంట్‌ను మీరు పోస్ట్ చేయండి!</p>
                    </div>
                  ) : (
                    activeComments.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          'p-3 rounded-2xl text-xs space-y-1 border',
                          c.isOwnerReply
                            ? 'bg-emerald-950/40 border-emerald-500/40'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <User className="w-3 h-3 text-emerald-400/80" />
                            {c.userName}
                            {c.isOwnerReply && (
                              <span className="bg-emerald-600 text-white text-[9px] font-semibold px-1.5 py-0.2 rounded-full">
                                Owner
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-white/90 leading-relaxed break-words">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Form */}
                <form
                  onSubmit={(e) => handleSubmitComment(e, currentStory.id)}
                  className="p-3 border-t border-white/10 bg-black/60 shrink-0 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder="మీ పేరు (Optional)"
                      className="w-1/3 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-emerald-400"
                    />
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="మీ ప్రశ్న లేదా కామెంట్ రాయండి..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-emerald-400"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentInput.trim()}
                        className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 shadow transition cursor-pointer shrink-0"
                      >
                        {isSubmittingComment ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>పోస్ట్</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Creator modal */}
      <StoryCreator
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        onCreated={() => {
          window.location.reload()
        }}
      />
    </section>
  )
}
