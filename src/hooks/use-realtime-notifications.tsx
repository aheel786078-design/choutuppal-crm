'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { MessageCircle, Bell } from 'lucide-react'

export interface RealtimeNotification {
  id: string
  userId?: string
  type: string
  title: string
  message: string
  link?: string | null
  isRead: boolean
  createdAt: string
  listingId?: string
  listingTitle?: string
  whatsappClicks?: number
}

interface UseRealtimeNotificationsOptions {
  userId?: string
  onNotification?: (notif: RealtimeNotification) => void
  showToast?: boolean
  playChime?: boolean
}

/**
 * Synthetic audio chime for notifications (no external audio assets needed).
 */
export function playNotificationChime() {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    // Musical two-tone chime (659.25Hz E5 -> 880Hz A5)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.42)
  } catch {}
}

/**
 * Display a high-visibility real-time toast for WhatsApp inquiries and leads.
 */
export function showWhatsAppLeadToast(
  notif: RealtimeNotification,
  onView?: () => void
) {
  toast.custom(
    (t) => (
      <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-emerald-300 bg-white p-4 shadow-2xl ring-2 ring-emerald-500/20 backdrop-blur-md">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30">
          <MessageCircle className="h-6 w-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white text-[8px] font-bold text-white">
            !
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              {notif.title || 'New WhatsApp Lead!'}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
              LIVE
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-800 leading-snug">
            {notif.message}
          </p>
          {notif.listingTitle ? (
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              Listing: <span className="font-bold text-slate-700">{notif.listingTitle}</span>
            </p>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                toast.dismiss(t)
                if (onView) {
                  onView()
                } else if (notif.link) {
                  window.location.href = notif.link
                }
              }}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              View in Dashboard
            </button>
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    ),
    { duration: 8000 }
  )
}

export function useRealtimeNotifications({
  userId,
  onNotification,
  showToast = true,
  playChime = true,
}: UseRealtimeNotificationsOptions = {}) {
  const processedNotifs = useRef<Set<string>>(new Set())
  const cbRef = useRef(onNotification)

  useEffect(() => {
    cbRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!userId) return

    const handleIncoming = (notif: RealtimeNotification) => {
      if (!notif || !notif.id) return
      if (processedNotifs.current.has(notif.id)) return

      processedNotifs.current.add(notif.id)
      // Limit memory of set
      if (processedNotifs.current.size > 100) {
        const first = processedNotifs.current.values().next().value
        if (first) processedNotifs.current.delete(first)
      }

      if (playChime) {
        playNotificationChime()
      }

      if (showToast) {
        if (notif.type === 'WHATSAPP_CLICK' || notif.title.includes('WhatsApp')) {
          showWhatsAppLeadToast(notif, () => {
            if (cbRef.current) cbRef.current(notif)
            else if (notif.link) window.location.href = notif.link
          })
        } else {
          toast(notif.title, {
            description: notif.message,
            icon: <Bell className="h-4 w-4 text-blue-600" />,
            action: notif.link
              ? {
                  label: 'View',
                  onClick: () => {
                    window.location.href = notif.link!
                  },
                }
              : undefined,
          })
        }
      }

      if (cbRef.current) {
        cbRef.current(notif)
      }
    }

    // 1. Server-Sent Events (SSE) connection
    let eventSource: EventSource | null = null
    let reconnectTimer: any = null

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/notifications/stream')

        eventSource.addEventListener('notification', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as RealtimeNotification
            if (data) handleIncoming(data)
          } catch (err) {
            console.warn('[SSE] Parse error:', err)
          }
        })

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(connectSSE, 6000)
        }
      } catch {}
    }

    connectSSE()

    // 2. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('choutuppal_realtime_channel')
        channel.onmessage = (e) => {
          const msg = e.data
          if (msg && msg.type === 'WHATSAPP_CLICK') {
            // Check if current user is the owner
            if (!msg.ownerId || msg.ownerId === userId) {
              const localNotif: RealtimeNotification = {
                id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                userId,
                type: 'WHATSAPP_CLICK',
                title: '💬 New WhatsApp Lead!',
                message: `Someone clicked your WhatsApp button on "${msg.listingTitle || 'your listing'}".`,
                link: '/dashboard?tab=listings',
                isRead: false,
                createdAt: msg.createdAt || new Date().toISOString(),
                listingId: msg.listingId,
                listingTitle: msg.listingTitle,
              }
              handleIncoming(localNotif)
            }
          }
        }
      } catch {}
    }

    return () => {
      clearTimeout(reconnectTimer)
      if (eventSource) {
        eventSource.close()
      }
      if (channel) {
        channel.close()
      }
    }
  }, [userId, showToast, playChime])
}
