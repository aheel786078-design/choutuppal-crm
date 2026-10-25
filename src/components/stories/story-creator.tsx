'use client'

import { useState } from 'react'
import { Loader2, Send, Image as ImageIcon, Video, Link as LinkIcon, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Image from 'next/image'

interface StoryCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (story: {
    id: string
    mediaUrl: string
    mediaType: string
    caption: string | null
    views: number
    expiresAt: string
    createdAt: string
    owner: { id: string; name: string | null; username: string | null; image: string | null }
  }) => void
}

const SAMPLE_STORY_LINKS = [
  {
    name: 'Shop Celebration',
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    type: 'IMAGE',
  },
  {
    name: 'Special Deal',
    url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
    type: 'IMAGE',
  },
  {
    name: 'New Product Arrival',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
    type: 'IMAGE',
  },
]

export function StoryCreator({ open, onOpenChange, onCreated }: StoryCreatorProps) {
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE')
  const [caption, setCaption] = useState('')
  const [targetLink, setTargetLink] = useState('')
  const [posting, setPosting] = useState(false)

  async function postStory() {
    if (!mediaUrl.trim()) {
      toast.error('దయచేసి స్టోరీ మీడియా లింక్ (Image/Video URL) ఎంటర్ చేయండి')
      return
    }

    setPosting(true)
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: mediaUrl.trim(),
          mediaType,
          caption: caption.trim() || undefined,
          link: targetLink.trim() || undefined,
        }),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        throw new Error(j.error || j.message || 'Failed to post story')
      }

      toast.success('స్టోరీ విజయవంతంగా పోస్ట్ చేయబడింది! 24 గంటలు లైవ్ లో ఉంటుంది.')
      onCreated(j.story)
      reset()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post story')
    } finally {
      setPosting(false)
    }
  }

  function reset() {
    setMediaUrl('')
    setCaption('')
    setTargetLink('')
    setMediaType('IMAGE')
  }

  const handleMediaUrlChange = (val: string) => {
    setMediaUrl(val)
    if (val.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      setMediaType('VIDEO')
    } else {
      setMediaType('IMAGE')
    }
  }

  const waPrefillMessage = `నమస్కారం చౌటుప్పల్ యాప్, నా బిజినెస్ స్టోరీ ప్రమోషన్ కోసం సహాయం కావాలి: ${caption || '24 గంటల స్టోరీ'}`
  const waUrl = `https://wa.me/919494348175?text=${encodeURIComponent(waPrefillMessage)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl gradient-brand text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900">
                Create 24h Story (లింక్ ద్వారా పోస్ట్ చేయండి)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                ఫోటో/వీడియో లింక్ (URL) ఎంటర్ చేయండి. 24 గంటల్లో ఆటోమేటిక్‌గా ముగుస్తుంది.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-6 pt-2 max-h-[80vh] overflow-y-auto fancy-scroll">
          {/* Direct Media Link Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-blue-600" /> Story Media Link / URL (Photo/Video)
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Direct Link Only</span>
            </Label>
            <Input
              value={mediaUrl}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/... or video link"
              className="rounded-xl text-xs"
            />
            <p className="text-[11px] text-slate-500">
              గమనిక: ఫోటో లేదా వీడియో అప్‌లోడ్ చేయాల్సిన పనిలేదు. డైరెక్ట్ లింక్ (URL) కాపీ చేసి ఇక్కడ పేస్ట్ చేయండి.
            </p>
          </div>

          {/* Preset Sample Links */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-700">శాంపిల్ స్టోరీ లింక్స్:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_STORY_LINKS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMediaUrl(sample.url)
                    setMediaType(sample.type as any)
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition"
                >
                  + {sample.name}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          {mediaUrl ? (
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-600">లైవ్ ప్రివ్యూ (9:16 Story):</Label>
              <div className="relative mx-auto aspect-[9/16] w-48 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
                {mediaType === 'VIDEO' ? (
                  <video src={mediaUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <Image
                    src={mediaUrl}
                    alt="Story preview"
                    fill
                    className="object-cover"
                    onError={() => {
                      toast.error('ఇమేజ్ లింక్ చెల్లదు. దయచేసి సరైన పబ్లిక్ ఇమేజ్ URL ఇవ్వండి.')
                    }}
                  />
                )}
                {caption ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                    <p className="line-clamp-2 text-xs font-semibold">{caption}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
              <ImageIcon className="h-8 w-8 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-600">మీడియా లింక్ ఇవ్వగానే ఇక్కడ ప్రివ్యూ కనిపిస్తుంది</p>
            </div>
          )}

          {/* Caption */}
          <div>
            <Label className="mb-1.5 block text-xs font-bold text-slate-700">క్యాప్షన్ / సందేశం (ఆప్షనల్)</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="మీ కస్టమర్ల కోసం ఆఫర్ లేదా వివరాలు..."
              rows={2}
              maxLength={500}
              className="rounded-xl text-xs"
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">{caption.length}/500</p>
          </div>

          {/* Target Link */}
          <div>
            <Label className="mb-1.5 block text-xs font-bold text-slate-700">స్వైప్-అప్ లింక్ (ఆప్షనల్)</Label>
            <Input
              value={targetLink}
              onChange={(e) => setTargetLink(e.target.value)}
              placeholder="https://... లేదా /business/your-shop"
              className="rounded-xl text-xs"
            />
          </div>

          {/* WhatsApp Direct Help Button */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between gap-2">
            <div className="text-[11px] text-emerald-950">
              <p className="font-bold">స్టోరీ క్రియేషన్ కోసం WhatsApp సహాయం కావాలా?</p>
              <p className="text-emerald-700">మా సపోర్ట్ టీమ్ మీకు తక్షణ సహాయం అందిస్తుంది.</p>
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp Help
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl text-xs"
            >
              రద్దు చేయండి
            </Button>
            <Button
              type="button"
              onClick={postStory}
              disabled={posting || !mediaUrl.trim()}
              className="flex-1 gap-2 rounded-xl gradient-brand text-white shadow-md text-xs font-bold"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {posting ? 'పోస్ట్ అవుతోంది...' : 'Publish Story Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
