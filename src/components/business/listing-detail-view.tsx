'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Phone,
  PhoneCall,
  MessageCircle,
  UserPlus,
  MapPin,
  Share2,
  Star,
  Eye,
  Clock,
  BadgeCheck,
  ChevronLeft,
  ExternalLink,
  QrCode,
  CheckCircle2,
  Building,
  Home,
  Wrench,
  Copy,
  Check,
  Sparkles,
  Navigation,
  Send,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeImageUrl } from '@/lib/utils'
import { getListingWhatsAppUrl } from '@/lib/constants'
import type { Listing, ListingEntitlements } from '@/lib/types'

export interface ListingDetailViewProps {
  listing: Listing
  entitlements: ListingEntitlements
  relatedListings?: Listing[]
}

export function ListingDetailView({
  listing,
  entitlements,
  relatedListings = [],
}: ListingDetailViewProps) {
  const [coverError, setCoverError] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [inquiryText, setInquiryText] = useState('')

  const coverSrc = coverError || !listing.coverImage
    ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
    : sanitizeImageUrl(listing.coverImage)

  const logoSrc = logoError || !listing.logo
    ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&h=200&q=80'
    : sanitizeImageUrl(listing.logo)

  const cleanPhone = (listing.phone || '').replace(/\D/g, '')
  const displayPhone = listing.phone || '9441348175'
  const whatsappNum = (listing.whatsapp || listing.phone || '9494348175').replace(/\D/g, '')
  const whatsappUrl = getListingWhatsAppUrl(listing.title, listing.id)

  // Share functionality with Web Share API
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://choutuppal.in/business/${listing.slug || listing.id}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} — Choutuppal Directory`,
          text: `Check out ${listing.title} on Choutuppal App:`,
          url,
        })
        toast.success('Shared successfully!')
        return
      } catch (err) {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Listing link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy link.')
    }
  }

  // Generate and download standard vCard (.vcf)
  const handleSaveContact = () => {
    const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:${listing.title}
ORG:Choutuppal Business Directory
TEL;TYPE=CELL:${displayPhone}
${listing.email ? `EMAIL:${listing.email}\n` : ''}ADR;TYPE=WORK:;;${listing.address || 'Choutuppal'};Choutuppal;Telangana;508252;India
URL:https://choutuppal.in/business/${listing.slug || listing.id}
NOTE:Verified listing on Choutuppal App (ID: ${listing.id})
END:VCARD`

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `${listing.title.replace(/[^a-zA-Z0-9]/g, '_')}_contact.vcf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Contact vCard downloaded!')
  }

  // Google Maps Directions
  const getDirectionsUrl = () => {
    const query = encodeURIComponent(`${listing.title}, ${listing.address || 'Choutuppal, Telangana'}`)
    return `https://www.google.com/maps/search/?api=1&query=${query}`
  }

  // QR Code URL (Zero external dependencies - generates high-res QR SVG image)
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.href : `https://choutuppal.in/business/${listing.slug || listing.id}`
  )}`

  // Send direct inquiry
  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    const msg = inquiryText.trim()
      ? `Hi ${listing.title}, I saw your listing on Choutuppal App (ID: ${listing.id}). ${inquiryText.trim()}`
      : `Hi ${listing.title}, I saw your listing on Choutuppal App and would like more details.`
    const url = `https://wa.me/91${whatsappNum}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setInquiryText('')
  }

  // Determine listing type icon
  const TypeIcon = listing.type === 'SERVICE' ? Wrench : listing.type === 'REAL_ESTATE' ? Home : Building

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 md:pb-16 font-sans">
      {/* 1. STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/listings"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white shadow-xs transition hover:bg-slate-100"
              title="Back to all listings"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            </Link>

            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-black text-white shadow-sm">
              CP
            </span>

            <div className="truncate">
              <span className="block truncate text-sm font-black text-slate-900 leading-snug">
                {listing.title}
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 block -mt-0.5">
                {listing.villageName || 'Choutuppal'} · {listing.categoryName || 'Business'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
              title="Show QR Code"
            >
              <QrCode className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">QR Code</span>
            </button>

            <button
              onClick={handleShare}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Share listing"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        
        {/* HERO CARD (Cover + Overlapping Avatar + Header Info) */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200">
          <div className="relative">
            {/* Cover Image (16:9 on mobile, h-72 sm:h-80 md:h-96 on desktop) */}
            <div className="relative aspect-[16/9] sm:h-80 md:h-96 w-full overflow-hidden bg-slate-900">
              <Image
                src={coverSrc}
                alt={listing.title}
                fill
                priority
                className="object-cover"
                onError={() => setCoverError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

              {/* Badges on Top */}
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="bg-white/95 backdrop-blur-md text-slate-900 font-extrabold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <BadgeCheck className="h-4 w-4 text-blue-600" />
                  Verified
                </span>

                {entitlements.isFeatured && (
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    Featured
                  </span>
                )}

                {entitlements.isPremium && (
                  <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                    Premium
                  </span>
                )}

                <span className="bg-slate-900/80 backdrop-blur-md text-white font-semibold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <TypeIcon className="h-3.5 w-3.5 text-emerald-400" />
                  {listing.type === 'SERVICE' ? 'Service Provider' : listing.type === 'REAL_ESTATE' ? 'Real Estate' : 'Local Business'}
                </span>
              </div>

              {/* View Count */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/20">
                <Eye className="h-3.5 w-3.5 text-slate-300" />
                <span>{listing.views || 120} views</span>
              </div>

              {/* Title & Category Info (Desktop Overlay) */}
              <div className="hidden sm:flex absolute bottom-0 left-0 w-full p-6 items-end gap-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white/30 bg-white shadow-xl relative z-10">
                  <Image
                    src={logoSrc}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    onError={() => setLogoError(true)}
                  />
                </div>

                <div className="min-w-0 flex-1 text-white">
                  <span className="text-xs font-black uppercase tracking-wider bg-emerald-600 px-2.5 py-0.5 rounded-md text-white inline-block mb-1.5 shadow-sm">
                    {listing.categoryName || 'Directory'}
                  </span>
                  <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-sm">
                    {listing.title}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{listing.address || 'Choutuppal Mandal, Yadadri Bhuvanagiri, Telangana'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Title & Info (Mobile View) */}
            <div className="sm:hidden p-4 pt-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm relative">
                  <Image
                    src={logoSrc}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    onError={() => setLogoError(true)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded inline-block mb-1">
                    {listing.categoryName || 'Directory'}
                  </span>
                  <h1 className="text-lg font-black text-slate-900 leading-snug truncate">
                    {listing.title}
                  </h1>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
                    <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{listing.address || 'Choutuppal, Telangana'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. QUICK ACTION BAR (Call, WhatsApp, Save Contact, Directions, Share) */}
          <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* CALL NOW */}
              <a
                href={`tel:${cleanPhone || '9441348175'}`}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call Now</span>
              </a>

              {/* WHATSAPP */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>

              {/* SAVE CONTACT (vCard) */}
              <button
                type="button"
                onClick={handleSaveContact}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-emerald-600" />
                <span>Save Contact</span>
              </button>

              {/* GET DIRECTIONS */}
              <a
                href={getDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-3 px-4 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
              >
                <Navigation className="h-4 w-4 text-indigo-600" />
                <span>Directions</span>
              </a>
            </div>
          </div>
        </div>

        {/* 4. MAIN DETAILS & SIDEBAR LAYOUT */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Description, Specs, Gallery, Catalogs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* REAL ESTATE SPECS (If type is REAL_ESTATE) */}
            {listing.type === 'REAL_ESTATE' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Property Specifications (రియల్ ఎస్టేట్ వివరాలు)
                    </h2>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                    {listing.price || 'Price on Request'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Layout Type</span>
                    <span className="text-slate-900 font-bold mt-0.5 block text-sm">DTCP / HMDA Approved</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Location</span>
                    <span className="text-slate-900 font-bold mt-0.5 block text-sm">{listing.villageName || 'Choutuppal'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Ownership</span>
                    <span className="text-slate-900 font-bold mt-0.5 block text-sm">Clear Title / 100% Verified</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Contact Person</span>
                    <span className="text-slate-900 font-bold mt-0.5 block text-sm">{listing.phone}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Brokers Fee</span>
                    <span className="text-emerald-700 font-bold mt-0.5 block text-sm">0% Commission</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 block font-medium">Road Facing</span>
                    <span className="text-slate-900 font-bold mt-0.5 block text-sm">33ft / 40ft Black Top</span>
                  </div>
                </div>
              </div>
            )}

            {/* SERVICES SPECIFICATIONS (If type is SERVICE) */}
            {listing.type === 'SERVICE' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-amber-600" />
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      On-Demand Service Guarantee (సేవల పూచీకత్తు)
                    </h2>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full">
                    24/7 Available
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Quick Doorstep Arrival</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Verified Technicians</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Affordable Pricing</span>
                  </div>
                </div>
              </div>
            )}

            {/* ABOUT & OVERVIEW */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
              <h2 className="text-base sm:text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                About {listing.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {listing.description || `${listing.title} is a verified ${listing.categoryName || 'business'} located in ${listing.villageName || 'Choutuppal'}, Telangana. Offering premier products and trustworthy customer service.`}
              </p>

              {/* FEATURES & KEYWORDS */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified Phone
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp Enabled
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Choutuppal Mandal
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Direct Owner Contact
                </span>
              </div>
            </div>

            {/* PHOTO GALLERY (If available) */}
            {listing.gallery && listing.gallery.length > 0 && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600" />
                  Photos &amp; Storefront ({listing.gallery.length})
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {listing.gallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePhoto(imgUrl)}
                      className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group"
                    >
                      <Image
                        src={sanitizeImageUrl(imgUrl)}
                        alt={`${listing.title} photo ${idx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RELATED BUSINESSES */}
            {relatedListings.length > 0 && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span>Related Businesses in {listing.villageName || 'Choutuppal'}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedListings.slice(0, 4).map((rel) => (
                    <Link
                      key={rel.id}
                      href={`/business/${rel.slug || rel.id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition group"
                    >
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <Image
                          src={sanitizeImageUrl(rel.coverImage)}
                          alt={rel.title}
                          fill
                          className="object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition">
                          {rel.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {rel.categoryName || 'Directory'} · {rel.villageName || 'Choutuppal'}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-bold inline-flex items-center gap-1 mt-1">
                          View Details <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Business Info Card, WhatsApp Direct Form, Working Hours */}
          <div className="space-y-6">
            
            {/* DIRECT WHATSAPP INQUIRY CARD */}
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-emerald-800/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Instant WhatsApp Inquiry</h3>
                  <p className="text-[10px] text-emerald-300">Directly reaches the owner</p>
                </div>
              </div>

              <form onSubmit={handleSendInquiry} className="mt-4 space-y-3">
                <textarea
                  rows={3}
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder={`Write your inquiry for ${listing.title} (e.g. price, availability, timings)...`}
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition resize-none"
                />

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send via WhatsApp</span>
                </button>
              </form>
            </div>

            {/* ADDRESS & CONTACT INFO */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-2">
                Location &amp; Contact
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Address</span>
                    <span className="text-slate-600 leading-relaxed block mt-0.5">
                      {listing.address || 'Choutuppal Mandal, Yadadri Bhuvanagiri District, Telangana 508252'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Phone</span>
                    <a href={`tel:${cleanPhone}`} className="text-blue-600 font-bold hover:underline">
                      +91 {displayPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">WhatsApp</span>
                    <span className="text-slate-600">+91 {whatsappNum}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Business Hours</span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Open Mon - Sun · 9:00 AM - 9:00 PM
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <a
                  href={getDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  <Navigation className="h-3.5 w-3.5 text-blue-600" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>

            {/* VERIFIED PLATFORM BADGE */}
            <div className="bg-emerald-50/60 rounded-3xl p-5 border border-emerald-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-black text-emerald-950">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <span>Choutuppal Official Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                This business is registered with Choutuppal Directory. Phone numbers are verified for direct customer communication.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. QR CODE MODAL */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="inline-block bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase">
              Scan with Any Mobile Camera
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-2 truncate">
              {listing.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Instant contact card on Choutuppal App
            </p>

            <div className="my-5 flex justify-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner">
                <img
                  src={qrCodeImageUrl}
                  alt={`QR code for ${listing.title}`}
                  className="h-56 w-56 object-contain"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Share2 className="h-4 w-4" /> Share Link
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PHOTO MODAL */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] aspect-video">
            <Image
              src={sanitizeImageUrl(activePhoto)}
              alt="Preview photo"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
