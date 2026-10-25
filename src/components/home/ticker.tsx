'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_ANNOUNCEMENTS = [
  '🪔 చౌటుప్పల్ యాప్ 2.0 లైవ్ - మీ వ్యాపారాన్ని ఉచితంగా రిజిస్టర్ చేసుకోండి!',
  '📅 డైలీ స్పిన్ & విన్ బహుమతులు - ప్రతిరోజూ 1 ఉచిత స్పిన్ లభ్యం.',
  '🏠 చౌటుప్పల్ & పరిసరాల్లో మీ ప్లాట్లు, ఇళ్లను జీరో బ్రోకరేజ్‌తో అమ్మండి/కొనండి.',
  '📣 హోమ్‌పేజీ బ్యానర్ యాడ్స్ కేవలం ₹99/రోజు నుండి ప్రారంభం - 10,000+ స్థానిక కస్టమర్లను చేరుకోండి.',
  '📰 స్థానిక వార్తలు మరియు వ్యాపార కథనాలు ప్రతిరోజూ తాజా అప్‌డేట్స్‌తో.',
]

interface TickerProps {
  initialAnnouncements?: string[]
}

export function Ticker({ initialAnnouncements }: TickerProps) {
  const [paused, setPaused] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>(
    initialAnnouncements && initialAnnouncements.length > 0 ? initialAnnouncements : DEFAULT_ANNOUNCEMENTS
  )

  useEffect(() => {
    let active = true
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!active || !j.ok || !j.settings) return
        
        let loadedItems: string[] = []
        if (j.settings.ticker_items_json) {
          try {
            const parsed = JSON.parse(j.settings.ticker_items_json)
            if (Array.isArray(parsed)) {
              loadedItems = parsed
                .filter((t: any) => t.isActive !== false)
                .map((t: any) => t.text)
                .filter(Boolean)
            }
          } catch {}
        }
        
        if (loadedItems.length === 0 && j.settings.announcement_ticker) {
          loadedItems = j.settings.announcement_ticker
            .split('|')
            .map((s: string) => s.trim())
            .filter(Boolean)
        }

        if (loadedItems.length > 0) {
          setAnnouncements(loadedItems)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const currentList = announcements && announcements.length > 0 ? announcements : DEFAULT_ANNOUNCEMENTS
  const items = [...currentList, ...currentList]

  return (
    <div className="border-y border-white/40 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full gradient-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          <Megaphone className="h-3.5 w-3.5" />
          Live
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div
            className={cn(
              'flex w-max gap-10 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700',
              'animate-marquee',
              paused && 'animate-marquee-paused',
            )}
          >
            {items.map((a, i) => (
              <span key={i} className="inline-flex items-center">
                {a}
              </span>
            ))}
          </div>
        </div>
        <button
          aria-label={paused ? 'Play ticker' : 'Pause ticker'}
          onClick={() => setPaused((p) => !p)}
          className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-600 transition hover:text-blue-600"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

