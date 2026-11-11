'use client'

import React, { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Printer,
  Share2,
  Download,
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  Sparkles,
  ShieldCheck,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { getBaseUrl } from '@/lib/utils'
import type { Listing } from '@/lib/types'

interface ShopQrStandeeProps {
  listing: Listing
  isStandalonePage?: boolean
}

export function ShopQrStandee({ listing, isStandalonePage = false }: ShopQrStandeeProps) {
  const standeeRef = useRef<HTMLDivElement>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : getBaseUrl()
  const businessUrl = `${baseUrl}/business/${listing.slug || listing.id}`
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&format=png&data=${encodeURIComponent(
    businessUrl
  )}`

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : businessUrl
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} — Official Choutuppal QR Standee`,
          text: `Check out the official Choutuppal App Counter QR Standee for ${listing.title}. Scan or print for your shop counter!`,
          url: shareUrl,
        })
        toast.success('Shared successfully!')
        return
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Standee link copied to clipboard!')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  const handleWhatsAppShare = () => {
    const text = `నమస్కారం! మా షాప్ "${listing.title}" అధికారిక చౌటుప్పల్ యాప్ కౌంటర్ QR స్టాండీ పోస్టర్ చూడండి:\n👉 ${businessUrl}\n\nకలర్ ప్రింట్ తీసుకోవడానికి లింక్:\n👉 ${businessUrl}/qr`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Action Toolbar (Hidden during print) */}
      <div className="print:hidden w-full max-w-md mx-auto mb-6 flex items-center justify-between gap-2 px-2">
        {isStandalonePage && (
          <Link
            href={`/business/${listing.slug || listing.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>ప్రొఫైల్</span>
          </Link>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>A4 కలర్ ప్రింట్ (Print)</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-semibold border border-emerald-200 transition cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp షేర్</span>
          </button>
        </div>
      </div>

      {/* Advice Note (Hidden during print) */}
      <div className="print:hidden w-full max-w-md mx-auto mb-6 p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900 text-2xs sm:text-xs">
        <p className="font-bold flex items-center gap-1.5 mb-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          వ్యాపారులకు సూచన:
        </p>
        <p>
          ఈ పోస్టర్‌ను మీ సమీపంలోని జిరాక్స్ లేదా ప్రింటింగ్ షాపుకు WhatsApp చేసి A4 కలర్ ప్రింట్ తీసి లామినేషన్ చేయించుకొని మీ షాప్ బిల్లింగ్ కౌంటర్ లేదా క్యాష్ డెస్క్‌పై పెట్టండి.
        </p>
      </div>

      {/* ============================================================ */}
      {/* PRINTABLE QR STANDEE POSTER CARD                             */}
      {/* Optimized for A4 / 5x7 Standee Print                         */}
      {/* ============================================================ */}
      <div
        ref={standeeRef}
        id="shop-qr-standee-card"
        className="w-full max-w-md bg-white border-2 border-emerald-600 rounded-3xl shadow-xl overflow-hidden print:border-2 print:border-emerald-600 print:shadow-none print:max-w-none print:w-[190mm] print:mx-auto print:my-0 print:rounded-2xl"
      >
        {/* Top Header: Official Choutuppal App Partner */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-5 sm:p-6 text-white text-center relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Choutuppal App Branding */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/30 text-white text-2xs sm:text-xs font-bold tracking-wide uppercase mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              <span>అధికారిక డిజిటల్ భాగస్వామి • 2026-2027</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-xs">
                చౌటుప్పల్ యాప్
              </h2>
              <span className="text-xs bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded-md">
                VERIFIED
              </span>
            </div>
            <p className="text-2xs sm:text-xs text-emerald-100 font-medium">
              Choutuppal.in — స్థానిక వ్యాపారాలు &amp; సేవల వేదిక
            </p>
          </div>
        </div>

        {/* Middle Section: Shop Details & Dynamic QR Code */}
        <div className="p-6 sm:p-7 text-center flex flex-col items-center">
          {/* Shop Title */}
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-1">
            {listing.title}
          </h3>

          {/* Category & Location Badges */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 mb-4">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-2xs sm:text-xs font-bold">
              {listing.categoryName || listing.categoryId || 'Business'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-2xs sm:text-xs font-medium flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-500" />
              {listing.address || 'చౌటుప్పల్ మండలం'}
            </span>
          </div>

          {/* QR Code Container */}
          <div className="relative p-4 bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md my-2 flex flex-col items-center justify-center">
            {/* Corner Decorators */}
            <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-600 rounded-tl-sm" />
            <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-600 rounded-tr-sm" />
            <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-600 rounded-bl-sm" />
            <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-600 rounded-br-sm" />

            <div className="relative w-56 h-56 sm:w-64 sm:h-64">
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${listing.title}`}
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
          </div>

          {/* Customer Call to Action */}
          <div className="mt-4 space-y-1">
            <p className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center justify-center gap-1.5">
              <span>👉 మొబైల్ కెమెరాతో స్కాన్ చేయండి</span>
            </p>
            <p className="text-xs text-slate-600 font-medium">
              నేటి ప్రత్యేక ఆఫర్లు, ఫోటోలు, మెనూ &amp; WhatsApp ఆర్డరింగ్ కోసం!
            </p>
          </div>

          {/* Contact Numbers Strip */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 w-full flex items-center justify-center gap-4 text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              {listing.phone || '9441348175'}
            </span>
            {listing.whatsapp && (
              <span className="flex items-center gap-1 text-emerald-700">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                {listing.whatsapp}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Footer: Choutuppal App Publicity & Social Media */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 text-center">
          <p className="text-2xs sm:text-xs font-bold text-slate-800 mb-2.5">
            📢 చౌటుప్పల్ యాప్ సోషల్ మీడియా &amp; హెల్ప్‌లైన్
          </p>

          {/* Social Handles Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-3xs sm:text-2xs font-semibold text-slate-700 mb-3">
            <div className="flex items-center justify-center gap-1 p-1.5 bg-white rounded-lg border border-slate-200/80">
              <Instagram className="h-3 w-3 text-pink-600" />
              <span>@choutuppalapp</span>
            </div>
            <div className="flex items-center justify-center gap-1 p-1.5 bg-white rounded-lg border border-slate-200/80">
              <Youtube className="h-3 w-3 text-red-600" />
              <span>Choutuppal App</span>
            </div>
            <div className="flex items-center justify-center gap-1 p-1.5 bg-white rounded-lg border border-slate-200/80">
              <MessageCircle className="h-3 w-3 text-emerald-600" />
              <span>9494348175 (బాట్)</span>
            </div>
            <div className="flex items-center justify-center gap-1 p-1.5 bg-white rounded-lg border border-slate-200/80">
              <Phone className="h-3 w-3 text-blue-600" />
              <span>9441348175 (హెల్ప్)</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-200/60 text-3xs sm:text-2xs text-slate-500 font-medium">
            <Globe className="h-3 w-3 text-emerald-600" />
            <span>వెబ్‌సైట్: <strong>choutuppal.in</strong></span>
            <span>•</span>
            <span>యాప్ డౌన్‌లోడ్ &amp; ప్రమోషన్స్</span>
          </div>
        </div>
      </div>
    </div>
  )
}
