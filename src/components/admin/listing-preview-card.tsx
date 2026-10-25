'use client'

import React, { useState } from 'react'
import {
  Store,
  Phone,
  MessageCircle,
  MapPin,
  Tag,
  Star,
  ExternalLink,
  Smartphone,
  Globe,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react'
import { PRESET_PHOTO_COVERS } from '@/lib/constants'

export interface PreviewListingProps {
  title: string
  categoryName?: string
  teluguCategory?: string
  description: string
  coverImage?: string
  phone: string
  whatsapp: string
  address: string
  price?: string
  isFeatured?: boolean
  isPremium?: boolean
  onSelectPreset?: (url: string) => void
}

export function ListingDualPreview({
  title,
  categoryName = 'Services',
  teluguCategory = 'సేవలు',
  description,
  coverImage,
  phone,
  whatsapp,
  address,
  price,
  isFeatured = false,
  isPremium = false,
  onSelectPreset,
}: PreviewListingProps) {
  const [tab, setTab] = useState<'whatsapp' | 'website'>('whatsapp')

  const fallbackImage = PRESET_PHOTO_COVERS[0].url
  const activeImage = coverImage && coverImage.trim().length > 0 ? coverImage : fallbackImage

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Top Header & Tab Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Live Output Preview
          </h3>
        </div>

        {/* Preview Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setTab('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              tab === 'whatsapp'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>WhatsApp Flow Card</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('website')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
              tab === 'website'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Website Card</span>
          </button>
        </div>
      </div>

      {/* Preset Photo Quick Picker */}
      {onSelectPreset && (
        <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <ImageIcon className="w-3 h-3 text-blue-400" />
              Quick Pick High-Res Cover Photo:
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_PHOTO_COVERS.slice(0, 4).map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onSelectPreset(p.url)}
                className={`group relative h-12 rounded overflow-hidden border transition-all text-left ${
                  activeImage === p.url
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[9px] text-white px-1 truncate py-0.5">
                  {p.label.split('/')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: WhatsApp CRM Flow Card Mockup */}
      {tab === 'whatsapp' ? (
        <div className="bg-[#0b141a] rounded-xl p-3 border border-emerald-950 shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-emerald-400 pb-2 mb-2 border-b border-emerald-900/30">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WhatsApp Message Preview (Customer View)
            </span>
            <span className="text-[10px] text-slate-500">Cloud API Card</span>
          </div>

          {/* WhatsApp Chat Bubble */}
          <div className="max-w-[320px] mx-auto bg-[#1f2c34] rounded-lg shadow-md border border-[#2a3942] overflow-hidden text-[#e9edef] text-xs">
            {/* Listing Photo Header */}
            <div className="relative h-40 w-full bg-slate-800 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage}
                alt={title || 'Listing Image'}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                VERIFIED
              </div>
              {price && (
                <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm text-emerald-400 font-semibold text-[11px] px-2 py-0.5 rounded">
                  {price}
                </div>
              )}
            </div>

            {/* Content Body */}
            <div className="p-3 space-y-2">
              <div>
                <h4 className="font-bold text-sm text-white leading-tight">
                  {title || 'Listing Business Title'}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-[#00a884] font-medium mt-0.5">
                  <Tag className="w-3 h-3" />
                  <span>{categoryName} ({teluguCategory})</span>
                </div>
              </div>

              <p className="text-[11px] text-[#8696a0] line-clamp-2">
                {description || 'Listing description with business offerings, service details, and location.'}
              </p>

              <div className="pt-1 border-t border-[#2a3942] space-y-1 text-[11px] text-[#aebac1]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#00a884] shrink-0" />
                  <span className="truncate">{address || 'Choutuppal Mandal, Yadadri'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#00a884] shrink-0" />
                  <span>{phone || '98480XXXXX'}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Interactive Action Buttons */}
            <div className="border-t border-[#2a3942] divide-y divide-[#2a3942]">
              <div className="py-2 text-center text-[#53bdeb] font-semibold text-[11px] hover:bg-[#202d35] cursor-pointer flex items-center justify-center gap-1.5">
                <Phone className="w-3 h-3" />
                <span>📞 Call Merchant ({phone || 'Call'})</span>
              </div>
              <div className="py-2 text-center text-[#00a884] font-semibold text-[11px] hover:bg-[#202d35] cursor-pointer flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3 h-3" />
                <span>💬 WhatsApp Direct Chat</span>
              </div>
              <div className="py-2 text-center text-slate-400 text-[11px] hover:bg-[#202d35] cursor-pointer flex items-center justify-center gap-1.5">
                <ExternalLink className="w-3 h-3" />
                <span>🌐 View on Choutuppal.in</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Website Card Mockup */
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-blue-400 pb-2 mb-2 border-b border-slate-800">
            <span>Website Portal Card (User View)</span>
            <span className="text-[10px] text-slate-500">choutuppal.in</span>
          </div>

          <div className="max-w-[320px] mx-auto bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="relative h-44 w-full bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeImage} alt={title} className="w-full h-full object-cover" />
              {isFeatured && (
                <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  FEATURED
                </span>
              )}
              {isPremium && (
                <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  PREMIUM
                </span>
              )}
            </div>

            <div className="p-3 space-y-2">
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {categoryName}
              </span>
              <h4 className="font-bold text-sm text-white line-clamp-1">{title || 'Listing Title'}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{description || 'Description...'}</p>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-semibold">{price || 'Best Price'}</span>
                <span className="text-slate-400 text-[11px]">{address || 'Choutuppal'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button className="py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3 text-blue-400" />
                  <span>Call</span>
                </button>
                <button className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
