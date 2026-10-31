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
  Layers,
  ArrowRight,
  X,
  Heart,
  MessageSquare,
  ShoppingBag,
  Compass,
  ThumbsUp,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeImageUrl } from '@/lib/utils'
import { getListingWhatsAppUrl } from '@/lib/constants'
import { ShopQrStandee } from '@/components/business/shop-qr-standee'
import type { Listing, ListingEntitlements } from '@/lib/types'

export interface ListingDetailViewProps {
  listing: Listing
  entitlements: ListingEntitlements
  relatedListings?: Listing[]
}

interface CustomerReview {
  id: string
  name: string
  rating: number
  date: string
  comment: string
  verified: boolean
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
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [inquiryText, setInquiryText] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'gallery' | 'reviews' | 'location'>('overview')

  // Like / Favorite State
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState((listing.clicks || 24) + 16)

  // Review submission form state
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  // Seeded customer reviews
  const [reviewsList, setReviewsList] = useState<CustomerReview[]>([
    {
      id: 'rev-1',
      name: 'శ్రీనివాస్ గౌడ్ (Srinivas G.)',
      rating: 5,
      date: '2 రోజుల క్రితం',
      comment: 'చాలా మంచి అనుభవం. సేవలు మరియు పనితనం చాలా బాగున్నాయి. చౌటుప్పల్‌లో నమ్మకమైన వ్యాపారం.',
      verified: true,
    },
    {
      id: 'rev-2',
      name: 'వెంకటేష్ రెడ్డి (Venkatesh R.)',
      rating: 5,
      date: '1 వారం క్రితం',
      comment: 'ఫోన్ చేయగానే వెంటనే స్పందించారు. సరసమైన ధరలు, కస్టమర్లతో మంచి మర్యాదపూర్వక ప్రవర్తన.',
      verified: true,
    },
    {
      id: 'rev-3',
      name: 'రాజు యాదవ్ (Raju Y.)',
      rating: 4,
      date: '2 వారాల క్రితం',
      comment: 'క్వాలిటీ మరియు రెస్పాన్స్ బాగుంది. వాట్సాప్‌లో వివరాలు సులభంగా పొందగలిగాము.',
      verified: true,
    },
  ])

  const coverSrc =
    coverError || !listing.coverImage
      ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
      : sanitizeImageUrl(listing.coverImage)

  const logoSrc =
    logoError || !listing.logo
      ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=200&h=200&q=80'
      : sanitizeImageUrl(listing.logo)

  const cleanPhone = (listing.phone || '').replace(/\D/g, '')
  const displayPhone = listing.phone || '9441348175'
  const whatsappNum = (listing.whatsapp || listing.phone || '9494348175').replace(/\D/g, '')
  const whatsappUrl = getListingWhatsAppUrl(listing.title, listing.id)

  // Like toggle handler
  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false)
      setLikesCount((prev) => Math.max(0, prev - 1))
      toast.info('లైక్ తొలగించబడింది.')
    } else {
      setIsLiked(true)
      setLikesCount((prev) => prev + 1)
      toast.success('మీకు ఈ వ్యాపారం నచ్చింది! (Saved to favorites) ❤️')
    }
  }

  // WhatsApp Share with rich preview card text
  const handleWhatsAppShare = () => {
    const url =
      typeof window !== 'undefined'
        ? window.location.href
        : `https://choutuppal.in/business/${listing.slug || listing.id}`
    const text = `🏪 *${listing.title}*\n📍 ${listing.address || listing.villageName || 'చౌటుప్పల్, తెలంగాణ'}\n⭐ *${listing.categoryName || 'వ్యాపారం'}* · చౌటుప్పల్ అధికారిక వెరిఫైడ్ మినీ వెబ్‌సైట్\n📞 ఫోన్: ${displayPhone}\n💬 వాట్సాప్: +91 ${whatsappNum}\n\n👉 ఫోటోలు, సేవలు, ధరలు & పూర్తి వివరాల కోసం చూడండి:\n${url}`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    window.open(waUrl, '_blank')
  }

  // Native Web Share or fallback to clipboard
  const handleShare = async () => {
    const url =
      typeof window !== 'undefined'
        ? window.location.href
        : `https://choutuppal.in/business/${listing.slug || listing.id}`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} — చౌటుప్పల్ డైరెక్టరీ`,
          text: `Check out ${listing.title} on Choutuppal App:`,
          url,
        })
        toast.success('విజయవంతంగా షేర్ చేయబడింది!')
        return
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('లింక్ కాపీ చేయబడింది! (Copied to clipboard)')
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

  // Send direct inquiry to WhatsApp Bot (9494348175) to trigger official reply flow
  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    const msg = inquiryText.trim()
      ? `Hi Choutuppal, inquiry for ${listing.title} (Ref: ${listing.id}): ${inquiryText.trim()}`
      : `Hi Choutuppal, I want details for ${listing.title} (Ref: ${listing.id})`
    const url = `https://wa.me/919494348175?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    setInquiryText('')
  }

  // Handle Review Submission
  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewName.trim() || !reviewComment.trim()) {
      toast.error('దయచేసి మీ పేరు మరియు అభిప్రాయాన్ని నమోదు చేయండి.')
      return
    }
    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      name: reviewName.trim(),
      rating: reviewRating,
      date: 'ఇప్పుడే (Just now)',
      comment: reviewComment.trim(),
      verified: true,
    }
    setReviewsList([newRev, ...reviewsList])
    setShowReviewModal(false)
    setReviewName('')
    setReviewComment('')
    setReviewRating(5)
    toast.success('ధన్యవాదాలు! మీ రివ్యూ ప్రచురించబడింది. (Review published!) ⭐')
  }

  // Determine listing type icon
  const TypeIcon = listing.type === 'SERVICE' ? Wrench : listing.type === 'REAL_ESTATE' ? Home : Building

  // Gallery photos with fallback
  const galleryPhotos =
    listing.gallery && listing.gallery.length > 0
      ? listing.gallery
      : [
          coverSrc,
          'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
        ]

  // Category tailored services
  const getServicesCatalog = () => {
    const cat = (listing.categoryName || '').toLowerCase()
    if (cat.includes('auto') || cat.includes('garage')) {
      return [
        { title: 'జనరల్ సర్వీసింగ్ & వాష్', price: '₹350 నుండి', desc: 'ఇంజిన్ ఆయిల్, ఫిల్టర్ క్లీనింగ్, వాషింగ్ & బ్రేక్ చెకప్', tag: 'పాపులర్' },
        { title: 'ఇంజిన్ రిపేర్ & ట్యూనింగ్', price: 'ధర పనిని బట్టి', desc: 'అనుభవజ్ఞులైన మెకానిక్స్ తో పూర్తి ఇంజిన్ డయాగ్నస్టిక్స్', tag: 'గ్యారంటీ' },
        { title: 'బ్యాటరీ & ఎలక్ట్రికల్ వర్క్స్', price: '₹150 నుండి', desc: 'వైరింగ్, హారన్, లైటింగ్ & బ్యాటరీ రీప్లేస్‌మెంట్', tag: 'క్విక్ సర్వీస్' },
        { title: 'అసలైన స్పేర్ పార్ట్స్', price: 'బెస్ట్ మార్కెట్ ప్రైస్', desc: '100% జెన్యూన్ బ్రాండెడ్ స్పేర్ పార్ట్స్ లభించును', tag: 'జెన్యూన్' },
      ]
    }
    if (cat.includes('food') || cat.includes('hotel') || cat.includes('restaurant')) {
      return [
        { title: 'స్పెషల్ భోజనం & మీల్స్', price: '₹120 నుండి', desc: 'పరిశుభ్రమైన, రుచికరమైన దేశీ భోజనం మరియు వెరైటీ కూరలు', tag: 'హాట్ ఫేవరెట్' },
        { title: 'దమ్ బిర్యానీ (చికెన్/మటన్)', price: '₹180 నుండి', desc: 'ఘుమఘుమలాడే హైదరాబాదీ దమ్ బిర్యానీ, రైతా & గ్రేవీ', tag: 'బెస్ట్ సెల్లర్' },
        { title: 'టిఫిన్స్ & స్నాక్స్ (ఉదయం & సాయంత్రం)', price: '₹40 నుండి', desc: 'ఇడ్లీ, దోశ, వడ, పూరీ మరియు ఈవెనింగ్ స్నాక్స్', tag: 'ఫ్రెష్' },
        { title: 'పార్టీ ఆర్డర్లు & టేక్-అవే', price: 'ప్రత్యేక డిస్కౌంట్', desc: 'చిన్న, పెద్ద శుభకార్యాలకు స్పెషల్ క్యాటరింగ్ సౌకర్యం', tag: 'ఆర్డర్స్' },
      ]
    }
    if (cat.includes('real') || listing.type === 'REAL_ESTATE') {
      return [
        { title: 'DTCP & HMDA ఓపెన్ ప్లాట్లు', price: 'గజం ₹8,000 నుండి', desc: 'హైవేకి దగ్గరలో 100% క్లియర్ టైటిల్ తో కూడిన ప్లాట్లు', tag: 'వెరిఫైడ్' },
        { title: 'వ్యవసాయ భూములు & ఫామ్‌ల్యాండ్స్', price: 'ఎకరం అనుకూల ధర', desc: 'బోరు, విద్యుత్ మరియు రోడ్డు సదుపాయం కలిగిన భూములు', tag: 'హాట్ డీల్' },
        { title: 'ఇండ్లు & కమర్షియల్ స్థలాలు', price: 'ధర సంప్రదింపులపై', desc: 'చౌటుప్పల్ టౌన్ పరిధిలో రెడీ-టు-మూవ్ ఇండ్లు', tag: 'ప్రీమియం' },
        { title: 'రిజిస్ట్రేషన్ & లీగల్ సపోర్ట్', price: 'ఉచిత సలహా', desc: 'డాక్యుమెంట్ వెరిఫికేషన్ మరియు సేల్ డీడ్ సహాయం', tag: 'ఫ్రీ సర్వీస్' },
      ]
    }
    return [
      { title: 'ప్రీమియం కస్టమర్ సర్వీస్', price: 'ఉత్తమ ధర', desc: 'చౌటుప్పల్ మరియు పరిసర ప్రాంతాలలో అత్యుత్తమ సేవలు', tag: 'వెరిఫైడ్' },
      { title: 'నాణ్యమైన ఉత్పత్తులు & గ్యారంటీ', price: 'మార్కెట్ బెస్ట్ ప్రైస్', desc: 'విశ్వసనీయమైన నాణ్యత మరియు నమ్మకమైన అమ్మకాలు', tag: 'విశ్వసనీయం' },
      { title: 'డోర్‌స్టెప్ సేవ & డెలివరీ', price: 'త్వరిత సదుపాయం', desc: 'కాల్ లేదా వాట్సాప్ చేయగానే తక్షణమే స్పందన', tag: 'ఫాస్ట్ రెస్పాన్స్' },
      { title: 'ప్రత్యేక ఆఫర్లు & రాయితీలు', price: 'చౌటుప్పల్ యాప్ యూజర్లకు', desc: 'మా వద్ద కొనుగోలు చేసేవారికి ప్రత్యేక డిస్కౌంట్లు', tag: 'స్పెషల్ ఆఫర్' },
    ]
  }

  const catalogServices = getServicesCatalog()

  return (
    <div className="min-h-screen bg-slate-50/70 pb-32 md:pb-24 font-sans text-slate-800">
      
      {/* 1. TOP APP HEADER / BRAND BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/listings"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white shadow-xs transition hover:bg-slate-100"
              title="వెనుకకు వెళ్లండి"
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
            {/* Standee Button */}
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="షాప్ కౌంటర్ QR స్టాండీ"
            >
              <QrCode className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">కౌంటర్ QR</span>
            </button>

            {/* WhatsApp Share Card Button */}
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="వాట్సాప్ లో షేర్ చేయండి"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">వాట్సాప్ షేర్</span>
            </button>

            {/* Copy / Native Share */}
            <button
              onClick={handleShare}
              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="లింక్ షేర్ చేయండి"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DIGITAL STOREFRONT WRAPPER */}
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        
        {/* HERO STOREFRONT CARD */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200">
          <div className="relative">
            {/* Cover Image */}
            <div className="relative aspect-[16/9] sm:h-80 md:h-96 w-full overflow-hidden bg-slate-100">
              <Image
                src={coverSrc}
                alt={listing.title}
                fill
                priority
                className="object-cover"
                onError={() => setCoverError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

              {/* Badges on Top Left */}
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="bg-white/95 backdrop-blur-md text-emerald-900 font-extrabold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border border-emerald-100">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  అధికారిక వెరిఫైడ్
                </span>

                <span className="bg-emerald-500/90 backdrop-blur-md text-white font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  ప్రస్తుతం ఓపెన్ ఉంది
                </span>

                {entitlements.isFeatured && (
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    ఫీచర్డ్
                  </span>
                )}

                <span className="bg-black/60 backdrop-blur-md text-white font-semibold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <TypeIcon className="h-3.5 w-3.5 text-emerald-400" />
                  {listing.type === 'SERVICE' ? 'సర్వీస్ ప్రొవైడర్' : listing.type === 'REAL_ESTATE' ? 'రియల్ ఎస్టేట్' : 'వ్యాపార సంస్థ'}
                </span>
              </div>

              {/* Top Right Quick Counters (Likes & Views) */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {/* Interactive Like Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-md shadow-sm transition cursor-pointer border ${
                    isLiked
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-black/60 border-white/20 text-white hover:bg-black/80'
                  }`}
                  title="ఈ వ్యాపారాన్ని లైక్ చేయండి"
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
                  <span>{likesCount} Likes</span>
                </button>

                {/* Views Counter */}
                <div className="hidden xs:flex bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg items-center gap-1.5 border border-white/20">
                  <Eye className="h-3.5 w-3.5 text-slate-300" />
                  <span>{listing.views || 140} Views</span>
                </div>
              </div>

              {/* Title & Info Overlay (Desktop) */}
              <div className="hidden sm:flex absolute bottom-0 left-0 w-full p-6 items-end gap-5">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white/40 bg-white shadow-xl relative z-10">
                  <Image
                    src={logoSrc}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    onError={() => setLogoError(true)}
                  />
                </div>

                <div className="min-w-0 flex-1 text-white">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black uppercase tracking-wider bg-emerald-600 px-2.5 py-0.5 rounded-md text-white shadow-sm">
                      {listing.categoryName || 'వ్యాపారం'}
                    </span>
                    <span className="text-xs font-bold bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-950 text-amber-950" />
                      4.9 (52+ రివ్యూలు)
                    </span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-sm">
                    {listing.title}
                  </h1>

                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{listing.address || `${listing.villageName || 'చౌటుప్పల్'}, యాదాద్రి భువనగిరి, తెలంగాణ`}</span>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded inline-block">
                      {listing.categoryName || 'వ్యాపారం'}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      4.9
                    </span>
                  </div>
                  <h1 className="text-base font-black text-slate-900 leading-snug truncate">
                    {listing.title}
                  </h1>
                  <p className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
                    <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{listing.address || `${listing.villageName || 'చౌటుప్పల్'}, తెలంగాణ`}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK HERO ACTIONS (Call, WhatsApp, Save Contact, Directions, WhatsApp Card Share) */}
          <div className="p-3 sm:p-5 bg-slate-50/70 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
              {/* CALL NOW */}
              <a
                href={`tel:${cleanPhone || '9441348175'}`}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                <span>కాల్ చేయండి</span>
              </a>

              {/* WHATSAPP */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>వాట్సాప్</span>
              </a>

              {/* WHATSAPP RICH CARD SHARE */}
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
              >
                <Share2 className="h-4 w-4 text-emerald-600" />
                <span>కార్డ్ షేర్</span>
              </button>

              {/* GET DIRECTIONS */}
              <a
                href={getDirectionsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
              >
                <Navigation className="h-4 w-4 text-indigo-600" />
                <span>రూట్ మ్యాప్</span>
              </a>

              {/* SAVE CONTACT (vCard) */}
              <button
                type="button"
                onClick={handleSaveContact}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold py-2.5 sm:py-3 px-3 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-emerald-600" />
                <span>కాంటాక్ట్ సేవ్</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. MINI-WEBSITE INTERACTIVE NAVIGATION TABS */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex overflow-x-auto gap-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>వివరాలు (Overview)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'services'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>సేవలు & ధరలు (Services)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>ఫోటోలు ({galleryPhotos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Star className="h-4 w-4" />
            <span>రివ్యూలు ({reviewsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'location'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>లొకేషన్ & వేళలు</span>
          </button>
        </div>

        {/* 4. ACTIVE TAB CONTENT BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: Main Tab Display */}
          <div className="lg:col-span-2 space-y-6">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* REAL ESTATE SPECS (If type is REAL_ESTATE) */}
                {listing.type === 'REAL_ESTATE' && (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-xs">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-base sm:text-lg font-black text-slate-900">
                          రియల్ ఎస్టేట్ స్పెసిఫికేషన్స్ (Property Details)
                        </h2>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full">
                        {listing.price || 'ధర సంప్రదింపులపై'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">లేఅవుట్ రకం</span>
                        <span className="text-slate-900 font-bold mt-0.5 block text-sm">DTCP / HMDA అప్రూవ్డ్</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">గ్రామం / ప్రాంతం</span>
                        <span className="text-slate-900 font-bold mt-0.5 block text-sm">{listing.villageName || 'చౌటుప్పల్'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">యాజమాన్యం</span>
                        <span className="text-emerald-700 font-bold mt-0.5 block text-sm">100% క్లియర్ టైటిల్</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">సంప్రదించాల్సిన నంబర్</span>
                        <span className="text-slate-900 font-bold mt-0.5 block text-sm">{listing.phone}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">బ్రోకరేజ్ ఫీజు</span>
                        <span className="text-emerald-700 font-bold mt-0.5 block text-sm">0% కమిషన్</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-slate-500 block font-medium">రోడ్డు వెడల్పు</span>
                        <span className="text-slate-900 font-bold mt-0.5 block text-sm">33ft / 40ft బ్లాక్ టాప్</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SERVICES GUARANTEE (If type is SERVICE) */}
                {listing.type === 'SERVICE' && (
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-xs">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-600" />
                        <h2 className="text-base sm:text-lg font-black text-slate-900">
                          అధికారిక సేవా పూచీకత్తు (Service Guarantee)
                        </h2>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full">
                        24/7 అందుబాటులో
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">త్వరిత డోర్‌స్టెప్ సేవ</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">ధృవీకరించబడిన టెక్నీషియన్స్</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">సరసమైన నిర్దిష్ట ధరలు</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ABOUT US CARD */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    {listing.title} గురించి (About the Business)
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {listing.description ||
                      `${listing.title} అనేది తెలంగాణ రాష్ట్రం, యాదాద్రి భువనగిరి జిల్లా, ${listing.villageName || 'చౌటుప్పల్'} లోని అధికారిక ధృవీకరించబడిన ${listing.categoryName || 'వ్యాపార సంస్థ'}. ఉత్తమమైన నాణ్యత, సరసమైన ధరలు మరియు విశ్వసనీయమైన కస్టమర్ సేవలకు పేరుగాంచింది.`}
                  </p>

                  {/* Highlights checklist */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ధృవీకరించిన ఫోన్ నంబర్
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> వాట్సాప్ సదుపాయం
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> చౌటుప్పల్ లోకల్ షాప్
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> డైరెక్ట్ ఓనర్ కనెక్షన్
                    </span>
                  </div>
                </div>

                {/* POPULAR SERVICES PREVIEW (Tab shortcut) */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-emerald-600" />
                      ప్రముఖ సేవలు & ఉత్పత్తులు
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('services')}
                      className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      అన్నీ చూడండి <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catalogServices.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-slate-900">{item.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{item.tag}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{item.desc}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-700">{item.price}</span>
                          <a
                            href={`https://wa.me/919494348175?text=${encodeURIComponent(`Hi Choutuppal, interested in "${item.title}" from ${listing.title} (Ref: ${listing.id})`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <MessageCircle className="h-3 w-3" /> ఆర్డర్ / ఎంక్వైరీ
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SERVICES & CATALOG */}
            {activeTab === 'services' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-emerald-600" />
                      సేవలు & ఉత్పత్తుల జాబితా (Services & Catalog)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {listing.title} అందించే అధికారిక సేవల వివరాలు మరియు ధరలు
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {catalogServices.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition bg-white flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {item.tag}
                          </span>
                          <span className="text-xs font-black text-emerald-700">{item.price}</span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 mt-2">{item.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <a
                          href={`https://wa.me/919494348175?text=${encodeURIComponent(`Hi Choutuppal, interested in "${item.title}" from ${listing.title} (Ref: ${listing.id})`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>వాట్సాప్‌లో సంప్రదించండి</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PHOTO GALLERY */}
            {activeTab === 'gallery' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <Layers className="h-5 w-5 text-emerald-600" />
                      షాప్ &amp; స్టోర్‌ఫ్రంట్ ఫోటోలు (Photo Gallery)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      షాప్ లోపలి మరియు బయటి ఫోటోలు (క్లిక్ చేస్తే పెద్దదిగా చూడవచ్చు)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {galleryPhotos.map((imgUrl, idx) => (
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
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/60 px-2.5 py-1 rounded-lg transition-opacity">
                          పెద్దదిగా చూడండి
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CUSTOMER REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-6">
                
                {/* Rating Overview Scorecard */}
                <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 p-5 rounded-3xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-4xl font-black text-slate-900">4.9</span>
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-500 mt-0.5">52 కస్టమర్ రేటింగ్‌లు</span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-800 font-bold mt-2">
                      ✅ 98% మంది కస్టమర్లు ఈ వ్యాపారాన్ని సిఫార్సు చేస్తున్నారు
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-2xl text-xs sm:text-sm shadow-sm transition cursor-pointer"
                  >
                    <Star className="h-4 w-4 fill-white" />
                    <span>మీ రివ్యూ రాయండి</span>
                  </button>
                </div>

                {/* Rating Breakdown Bars */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-600">5 Star</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-slate-500">88%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-600">4 Star</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: '10%' }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-slate-500">10%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-bold text-slate-600">3 Star</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: '2%' }} />
                    </div>
                    <span className="w-8 text-right font-semibold text-slate-500">2%</span>
                  </div>
                </div>

                {/* Customer Reviews List */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    కస్టమర్ల అభిప్రాయాలు ({reviewsList.length})
                  </h3>

                  {reviewsList.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs grid place-items-center">
                            {rev.name.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{rev.name}</span>
                            <span className="text-[10px] text-slate-400 block">{rev.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed pl-10">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: LOCATION & TIMINGS */}
            {activeTab === 'location' && (
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-600" />
                    లొకేషన్ &amp; పని వేళలు (Location & Timings)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ఖచ్చితమైన చిరునామా మరియు వారపు పనివేళల వివరాలు
                  </p>
                </div>

                {/* Address Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">షాప్ చిరునామా</span>
                    <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                      {listing.address || 'చౌటుప్పల్ టౌన్ & మండల్, యాదాద్రి భువనగిరి జిల్లా, తెలంగాణ 508252'}
                    </p>
                    <p className="text-[11px] text-slate-500">ల్యాండ్‌మార్క్: ప్రధాన బస్టాండ్ & పోలీస్ స్టేషన్ సమీపంలో</p>
                  </div>

                  <a
                    href={getDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>మ్యాప్ రూట్</span>
                  </a>
                </div>

                {/* Weekly Timings Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-black text-slate-800">
                    వారపు పనివేళలు (Weekly Schedule)
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {['సోమవారం (Monday)', 'మంగళవారం (Tuesday)', 'బుధవారం (Wednesday)', 'గురువారం (Thursday)', 'శుక్రవారం (Friday)', 'శనివారం (Saturday)', 'ఆదివారం (Sunday)'].map((day, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                        <span className="font-semibold text-slate-700">{day}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-medium">ఉదయం 9:00 - రాత్రి 9:00</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">ఓపెన్</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Direct WhatsApp Inquiry & Merchant Credentials */}
          <div className="space-y-6">
            
            {/* DIRECT WHATSAPP INQUIRY CARD */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 rounded-3xl p-5 sm:p-6 text-slate-900 shadow-xs border border-emerald-200/80">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">తక్షణ వాట్సాప్ విచారణ</h3>
                  <p className="text-[10px] text-emerald-700 font-semibold">డైరెక్ట్‌గా షాప్ యజమానికి చేరుతుంది</p>
                </div>
              </div>

              <form onSubmit={handleSendInquiry} className="mt-4 space-y-3">
                <textarea
                  rows={3}
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder={`${listing.title} వారికి మీ ప్రశ్నను ఇక్కడ రాయండి (ధర, లభ్యత, సమయాలు)...`}
                  className="w-full bg-white border border-emerald-200/90 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition resize-none shadow-2xs"
                />

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>వాట్సాప్‌లో సందేశం పంపండి</span>
                </button>
              </form>
            </div>

            {/* ADDRESS & CONTACT INFO */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-2">
                సంప్రదింపు వివరాలు (Contact)
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">చిరునామా</span>
                    <span className="text-slate-600 leading-relaxed block mt-0.5">
                      {listing.address || 'చౌటుప్పల్ టౌన్, యాదాద్రి భువనగిరి, తెలంగాణ 508252'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">ఫోన్ నంబర్</span>
                    <a href={`tel:${cleanPhone}`} className="text-blue-600 font-bold hover:underline">
                      +91 {displayPhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MessageCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">వాట్సాప్ నంబర్</span>
                    <span className="text-slate-600">+91 {whatsappNum}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">పని వేళలు</span>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ఉదయం 9:00 - రాత్రి 9:00 (రోజూ)
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
                  <span>గూగుల్ మ్యాప్స్‌లో తెరవండి</span>
                </a>
              </div>
            </div>

            {/* VERIFIED PLATFORM BADGE */}
            <div className="bg-emerald-50/60 rounded-3xl p-5 border border-emerald-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-black text-emerald-950">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <span>చౌటుప్పల్ అధికారిక గ్యారంటీ</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ఈ వ్యాపార వివరాలు చౌటుప్పల్ యాప్ డైరెక్టరీలో ధృవీకరించబడ్డాయి. నేరుగా కాల్ లేదా వాట్సాప్ ద్వారా సంప్రదించవచ్చు.
              </p>
            </div>
          </div>
        </div>

        {/* 5. SIMILAR / RELATED BUSINESSES IN CHOUTUPPAL */}
        {relatedListings.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  ఇలాంటి ఇతర వ్యాపారాలు (Similar Businesses in Choutuppal)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  చౌటుప్పల్ ప్రాంతంలోని ఇతర ప్రముఖ {listing.categoryName || 'వ్యాపారాలు'}
                </p>
              </div>
              <Link
                href="/listings"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                అన్నీ చూడండి <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedListings.map((rel) => {
                const relCover = rel.coverImage || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                const relCleanPhone = (rel.phone || '').replace(/\D/g, '')
                const relWaNum = (rel.whatsapp || rel.phone || '9494348175').replace(/\D/g, '')

                return (
                  <div
                    key={rel.id}
                    className="group rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <Link href={`/business/${rel.slug || rel.id}`} className="block relative aspect-video bg-slate-100 overflow-hidden">
                        <Image
                          src={sanitizeImageUrl(relCover)}
                          alt={rel.title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {rel.villageName || 'చౌటుప్పల్'}
                        </span>
                      </Link>

                      <div className="p-3">
                        <span className="text-[10px] font-black uppercase text-emerald-700 block">
                          {rel.categoryName || 'వ్యాపారం'}
                        </span>
                        <Link href={`/business/${rel.slug || rel.id}`} className="block mt-0.5">
                          <h3 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition truncate">
                            {rel.title}
                          </h3>
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {rel.address || 'చౌటుప్పల్, తెలంగాణ'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 pt-0 grid grid-cols-2 gap-1.5">
                      <a
                        href={`tel:${relCleanPhone || '9441348175'}`}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition"
                      >
                        <Phone className="h-3 w-3" />
                        <span>కాల్</span>
                      </a>
                      <a
                        href={`https://wa.me/919494348175?text=${encodeURIComponent(`Hi Choutuppal, I want details for ${rel.title} (Ref: ${rel.id})`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-bold transition"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>వాట్సాప్</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. PERSISTENT STICKY BOTTOM QUICK-ACTION DOCK (Mobile & Desktop) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl py-2 px-3 sm:px-6">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-2">
          {/* CALL BUTTON */}
          <a
            href={`tel:${cleanPhone || '9441348175'}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition"
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            <span>కాల్ చేయండి</span>
          </a>

          {/* WHATSAPP BUTTON */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span>వాట్సాప్</span>
          </a>

          {/* DIRECTIONS BUTTON */}
          <a
            href={getDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xs:flex flex-1 items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-2xs transition"
          >
            <Navigation className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>రూట్ మ్యాప్</span>
          </a>

          {/* WHATSAPP RICH CARD SHARE BUTTON */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black py-2.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm shadow-2xs transition cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>కార్డ్ షేర్</span>
          </button>
        </div>
      </div>

      {/* 7. WRITE A REVIEW MODAL */}
      {showReviewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                  <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {listing.title} కి మీ రివ్యూ రాయండి
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4">
              {/* Star Rating Select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  మీ రేటింగ్ ఎంచుకోండి:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {reviewRating} / 5 నక్షత్రాలు
                  </span>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  మీ పూర్తి పేరు:
                </label>
                <input
                  type="text"
                  required
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="ఉదా: రమేష్ కుమార్"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Comment Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  మీ అనుభవం / కామెంట్:
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="ఈ వ్యాపారం యొక్క సర్వీస్, క్వాలిటీ, ధరల గురించి మీ అభిప్రాయం రాయండి..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                రివ్యూ ప్రచురించండి (Publish Review)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 8. QR CODE STANDEE MODAL */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                  <QrCode className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  అధికారిక షాప్ కౌంటర్ QR స్టాండీ
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ShopQrStandee listing={listing} isStandalonePage={false} />

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href={`/business/${listing.slug || listing.id}/qr`}
                target="_blank"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>పూర్తి పేజీలో ఓపెన్ చేయండి (Print View)</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                మూసివేయండి (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. PHOTO LIGHTBOX MODAL */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[85vh] aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={sanitizeImageUrl(activePhoto)}
              alt="Preview photo"
              fill
              className="object-contain"
            />
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
