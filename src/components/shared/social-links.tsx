'use client'

import { useState, useEffect } from 'react'
import { Instagram, Facebook, Youtube, MessageCircle, Megaphone } from 'lucide-react'

const DEFAULT_LINKS = [
  { key: 'social_instagram', icon: Instagram, label: 'Instagram', defaultHref: 'https://www.instagram.com/choutuppalapp/', color: 'bg-pink-600 text-white' },
  { key: 'social_facebook', icon: Facebook, label: 'Facebook', defaultHref: 'https://www.facebook.com/Choutuppalapp/', color: 'bg-blue-600 text-white' },
  { key: 'social_youtube', icon: Youtube, label: 'YouTube', defaultHref: 'https://www.youtube.com/@choutuppalapp', color: 'bg-red-600 text-white' },
  { key: 'social_whatsapp_community', icon: MessageCircle, label: 'WhatsApp Community', defaultHref: 'https://chat.whatsapp.com/ItRGBPJJQSZF6x40IozSJe', color: 'bg-green-500 text-white' },
  { key: 'social_whatsapp_channel', icon: Megaphone, label: 'WhatsApp Channel', defaultHref: 'https://whatsapp.com/channel/0029VbD28mkGpLHOk8wrLE1a', color: 'bg-green-700 text-white' },
]

export function SocialLinks() {
  const [links, setLinks] = useState(
    DEFAULT_LINKS.map(l => ({ ...l, href: l.defaultHref }))
  )

  useEffect(() => {
    let active = true
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        if (active && j.ok && j.settings) {
          setLinks(
            DEFAULT_LINKS.map((l) => ({
              ...l,
              href: j.settings[l.key] || l.defaultHref,
            }))
          )
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex items-center gap-3">
      {links.map((l) => {
        const Icon = l.icon
        return (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            title={l.label}
            aria-label={l.label}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all hover:scale-110 ${l.color}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        )
      })}
    </div>
  )
}

