'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import { useRealtimeNotifications, RealtimeNotification } from '@/hooks/use-realtime-notifications'

interface NotifItem {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setUserId(data.user.id)
      })
    }
  }, [])
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotifItem[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Real-time live update for notification bell
  useRealtimeNotifications({
    userId,
    showToast: false, // Toast shown by page/dashboard
    onNotification: (notif: RealtimeNotification) => {
      setUnread((prev) => prev + 1)
      setItems((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev
        const newNotif: NotifItem = {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link || null,
          isRead: notif.isRead ?? false,
          createdAt: notif.createdAt || new Date().toISOString(),
        }
        return [newNotif, ...prev.slice(0, 9)]
      })
    },
  })

  // Fetch unread count + latest 5
  useEffect(() => {
    let active = true
    fetch('/api/notifications?limit=5')
      .then((r) => r.json())
      .then((j) => {
        if (active && j.ok) {
          setUnread(j.unreadCount)
          setItems(j.notifications)
        }
      })
      .catch(() => {})
    // Poll every 30s for new notifications
    const interval = setInterval(() => {
      fetch('/api/notifications?limit=5')
        .then((r) => r.json())
        .then((j) => {
          if (active && j.ok) {
            setUnread(j.unreadCount)
            setItems(j.notifications)
          }
        })
        .catch(() => {})
    }, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Mark as read when dropdown opens
  function toggleDropdown() {
    const newOpen = !open
    setOpen(newOpen)
    if (newOpen && unread > 0) {
      fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(() => setUnread(0))
        .catch(() => {})
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleDropdown}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 transition hover:text-blue-600"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            {unread > 0 ? <span className="text-[10px] font-semibold text-blue-600">{unread} new</span> : null}
          </div>
          <div className="max-h-80 overflow-y-auto fancy-scroll">
            {items.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <a
                  key={n.id}
                  href={n.link ?? '#'}
                  className={cn(
                    'flex items-start gap-2 border-b border-slate-50 p-3 transition hover:bg-slate-50',
                    !n.isRead && 'bg-blue-50/50',
                  )}
                >
                  <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-slate-300' : 'bg-blue-500')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">{n.title}</p>
                    <p className="line-clamp-2 text-[11px] text-slate-500">{n.message}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </a>
              ))
            )}
          </div>
          <a href="/dashboard" className="block border-t border-slate-100 p-2 text-center text-xs font-semibold text-blue-600 hover:bg-slate-50">
            View all in Dashboard
          </a>
        </div>
      ) : null}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
