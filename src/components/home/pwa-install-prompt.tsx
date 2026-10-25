'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed-session'

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if dismissed in this session
    if (sessionStorage.getItem(DISMISS_KEY) === 'true') return

    // Mobile-only check (userAgent + screen width)
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768
    if (!isMobile) return

    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
      // Show the banner after 3 seconds.
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setVisible(false)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission()
        } catch (err) {
          console.error('[PWA] Failed to request notification permission:', err)
        }
      }
    }
    setPromptEvent(null)
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }

  if (!visible || !promptEvent) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-yellow-500 p-3.5 text-white shadow-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <Image
          src="https://i.ibb.co/NgtRxPLw/Untitled-design.jpg"
          alt="Choutuppal App Icon"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-white/30"
          loading="lazy"
          decoding="async"
        />
        <span className="font-telugu text-sm font-semibold truncate">
          చౌటుప్పల్ యాప్ ని ఇన్‌స్టాల్ చేయండి
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={install}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-amber-50"
        >
          <Download className="h-3.5 w-3.5" />
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
