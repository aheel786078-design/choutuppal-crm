'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Car,
  Wrench,
  Zap,
  Phone,
  PhoneCall,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Star,
  Sparkles,
  ArrowRight,
  Filter,
  Flame,
  Paintbrush,
  Snowflake,
  ShieldAlert,
} from 'lucide-react'
import { sanitizeImageUrl } from '@/lib/utils'
import {
  WHATSAPP_BOT_NUMBER,
  getTaxiBookingWhatsAppUrl,
  getAutoBookingWhatsAppUrl,
  getPlumberWhatsAppUrl,
  getElectricianWhatsAppUrl,
  getServiceWhatsAppUrl,
} from '@/lib/constants'
import type { Listing } from '@/lib/types'

export interface ServiceItem {
  id: string
  title: string
  teluguTitle?: string
  slug?: string
  category: string
  categorySlug: string
  phone: string
  whatsapp?: string
  rating: number
  reviewsCount: number
  responseTime: string
  coverageArea: string
  experience: string
  coverImage: string
  description: string
  specialties: string[]
  isEmergency247?: boolean
  priceInfo?: string
}

const DEFAULT_VERIFIED_SERVICES: ServiceItem[] = [
  {
    id: 'srv_taxi_swagath',
    title: 'Sri Balaji 24/7 Highway Taxi & Cabs',
    teluguTitle: 'శ్రీ బాలాజీ 24/7 హైవే టాక్సీ & క్యాబ్స్',
    slug: 'sri-balaji-taxi-cabs',
    category: 'Taxis & Outstation Cabs',
    categorySlug: 'taxi',
    phone: '9441348175',
    whatsapp: '9494348175',
    rating: 4.9,
    reviewsCount: 142,
    responseTime: '15 mins',
    coverageArea: 'Choutuppal, Panthangi, Hyd Airport, Vijayawada Highway',
    experience: '8+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    description: 'Hyderabad Rajiv Gandhi Airport direct drops, Vijayawada highway urgent drops, Innova, Ertiga & Swift Dzire AC vehicles available 24 hours.',
    specialties: ['Airport Drops', 'Outstation Trips', 'AC Cabs', '24/7 Emergency Pickup'],
    isEmergency247: true,
    priceInfo: 'Standard ₹14/km • Flat Airport Rates',
  },
  {
    id: 'srv_auto_town',
    title: 'Mana Choutuppal Main Stand Auto Drivers Union',
    teluguTitle: 'మన చౌటుప్పల్ మెయిన్ స్టాండ్ ఆటో సర్వీస్',
    slug: 'choutuppal-auto-stand',
    category: 'Auto Stand & Local Rides',
    categorySlug: 'auto',
    phone: '9494348175',
    whatsapp: '9494348175',
    rating: 4.8,
    reviewsCount: 210,
    responseTime: '10 mins',
    coverageArea: 'Choutuppal Town, Lingojiguda, Peddakondur, Malkapur',
    experience: '12+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1596405835955-463df1c3df5a?auto=format&fit=crop&w=800&q=80',
    description: 'Local market drops, bus stand pickups, industrial zone workers transportation, village connectivity with fair meter rates.',
    specialties: ['Bus Stand Pickup', 'Village Drops', 'School Pickup', 'Verified Drivers'],
    isEmergency247: true,
    priceInfo: 'Affordable Local Fares',
  },
  {
    id: 'srv_plumb_kalyan',
    title: 'Kalyan Emergency Plumbing & Motor Borewell Services',
    teluguTitle: 'కళ్యాణ్ ఎమర్జెన్సీ ప్లంబింగ్ & మోటార్ బోర్‌వెల్ వర్క్స్',
    slug: 'kalyan-plumbing-services',
    category: 'Emergency Plumbers',
    categorySlug: 'plumber',
    phone: '9848012345',
    whatsapp: '9494348175',
    rating: 4.9,
    reviewsCount: 96,
    responseTime: '20 mins',
    coverageArea: 'Entire Choutuppal Mandal & Town',
    experience: '10+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    description: 'Expert emergency water leak repairs, bathroom CPVC fittings, water tank cleaning, borewell submersible motor pump repair and new pipeline connections.',
    specialties: ['Pipe Leak Repair', 'Water Tank Cleaning', 'Motor Fitting', 'Bathroom Sanity'],
    isEmergency247: true,
    priceInfo: 'Inspection ₹150 • Genuine Parts',
  },
  {
    id: 'srv_elec_sai',
    title: 'Sai Krishna Certified Electricians & Inverter Solutions',
    teluguTitle: 'సాయి కృష్ణ సర్టిఫైడ్ ఎలక్ట్రీషియన్ & ఇన్వర్టర్ వర్క్స్',
    slug: 'sai-krishna-electricians',
    category: 'Electricians & Power',
    categorySlug: 'electrician',
    phone: '9441348175',
    whatsapp: '9494348175',
    rating: 4.9,
    reviewsCount: 168,
    responseTime: '25 mins',
    coverageArea: 'Choutuppal Town & Surroundings',
    experience: '11+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    description: 'Fast resolution of electrical short circuits, house wiring, ceiling fan / cooler repairs, solar panel & inverter battery installation with warranty.',
    specialties: ['Short Circuit Fix', 'Inverter Wiring', 'Ceiling Fan Repair', 'Motor Starter Fix'],
    isEmergency247: true,
    priceInfo: 'Doorstep ₹150 • Same-day Delivery',
  },
  {
    id: 'srv_ac_cool',
    title: 'Royal Cool AC Service & Refrigerator Tech',
    teluguTitle: 'రాయల్ కూల్ ఏసీ సర్వీస్ & ఫ్రిడ్జ్ రిపేర్',
    slug: 'royal-cool-ac-service',
    category: 'AC & Home Appliances',
    categorySlug: 'ac',
    phone: '9494348175',
    whatsapp: '9494348175',
    rating: 4.8,
    reviewsCount: 88,
    responseTime: '30 mins',
    coverageArea: 'Choutuppal & Industrial Area',
    experience: '7+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
    description: 'Split AC jet cleaning, gas charging (R32 / R410A), inverter AC PCB board repairs, washing machine repair & deep freezer maintenance.',
    specialties: ['Split AC Jet Wash', 'AC Gas Refill', 'Washing Machine Repair', 'Compressor Check'],
    isEmergency247: false,
    priceInfo: 'Jet Wash from ₹499',
  },
  {
    id: 'srv_mech_speed',
    title: 'Speedway 24/7 Car & Bike Highway Breakdown Care',
    teluguTitle: 'స్పీడ్‌వే 24/7 కార్ & బైక్ హైవే బ్రేక్‌డౌన్ సర్వీస్',
    slug: 'speedway-highway-garage',
    category: 'Mechanics & Highway Garage',
    categorySlug: 'mechanic',
    phone: '9848012345',
    whatsapp: '9494348175',
    rating: 4.9,
    reviewsCount: 175,
    responseTime: '15 mins',
    coverageArea: 'NH-65 Highway Tollgate to Malkapur',
    experience: '14+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80',
    description: 'Highway puncture repair, mobile battery jump start, car towing, diesel/petrol emergency delivery, and engine diagnostic service.',
    specialties: ['NH-65 Highway Towing', 'Jump Start', 'Tubeless Puncture', 'Clutch / Brake Overhaul'],
    isEmergency247: true,
    priceInfo: 'On-spot Highway Arrival',
  },
  {
    id: 'srv_paint_deva',
    title: 'Deva Home Painting & Waterproofing Experts',
    teluguTitle: 'దేవా హోమ్ పెయింటింగ్ & వాటర్‌ప్రూఫింగ్',
    slug: 'deva-home-painting',
    category: 'Painters & Renovation',
    categorySlug: 'painter',
    phone: '9441348175',
    whatsapp: '9494348175',
    rating: 4.7,
    reviewsCount: 64,
    responseTime: '1 hour',
    coverageArea: 'Choutuppal Mandal',
    experience: '9+ Years Exp',
    coverImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
    description: 'Asian Paints Royal Luxury emulsion coating, exterior weather protection, roof terrace waterproofing, dampness arrest, and wood polish.',
    specialties: ['Exterior Apex', 'Terrace Waterproofing', 'Royal Emulsion', 'Putty & Texture'],
    isEmergency247: false,
    priceInfo: 'Free Estimation at Site',
  },
]

interface ServicesCatalogProps {
  initialStoreListings: Listing[]
}

export function ServicesCatalog({ initialStoreListings }: ServicesCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Map store listings into uniform ServiceItem structure
  const storeServiceItems: ServiceItem[] = useMemo(() => {
    return initialStoreListings.map((l) => {
      let catSlug = 'all'
      const titleLower = (l.title || '').toLowerCase()
      const catLower = (l.categoryName || '').toLowerCase()

      if (titleLower.includes('taxi') || titleLower.includes('cab') || catLower.includes('transport')) catSlug = 'taxi'
      else if (titleLower.includes('auto')) catSlug = 'auto'
      else if (titleLower.includes('plumb') || titleLower.includes('pipe')) catSlug = 'plumber'
      else if (titleLower.includes('electr') || catLower.includes('electrical')) catSlug = 'electrician'
      else if (titleLower.includes('ac') || titleLower.includes('cool') || titleLower.includes('fridge')) catSlug = 'ac'
      else if (titleLower.includes('garage') || titleLower.includes('mechanic') || catLower.includes('automobile')) catSlug = 'mechanic'
      else if (titleLower.includes('paint') || catLower.includes('paint')) catSlug = 'painter'

      return {
        id: l.id,
        title: l.title,
        slug: l.slug || l.id,
        category: l.categoryName || 'Professional Service',
        categorySlug: catSlug,
        phone: l.phone || '9441348175',
        whatsapp: l.whatsapp || l.phone || '9494348175',
        rating: 4.8,
        reviewsCount: 50 + (l.views || 10),
        responseTime: '20-30 mins',
        coverageArea: l.address || 'Choutuppal Mandal',
        experience: 'Verified Local Pro',
        coverImage: sanitizeImageUrl(l.coverImage),
        description: l.description || 'Verified local service provider in Choutuppal.',
        specialties: ['Verified Merchant', 'Prompt Response', 'Direct Booking'],
        isEmergency247: true,
      }
    })
  }, [initialStoreListings])

  // Combine and deduplicate
  const allServices: ServiceItem[] = useMemo(() => {
    const map = new Map<string, ServiceItem>()
    // Add default high-touch verified services first
    DEFAULT_VERIFIED_SERVICES.forEach((s) => map.set(s.id, s))
    // Add any store listings
    storeServiceItems.forEach((s) => {
      if (!map.has(s.id)) map.set(s.id, s)
    })
    return Array.from(map.values())
  }, [storeServiceItems])

  // Filter based on active tab and search
  const filteredServices = useMemo(() => {
    return allServices.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.categorySlug === activeCategory
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.teluguTitle && item.teluguTitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.specialties.some((s) => s.toLowerCase().includes(q))
      return matchesCategory && matchesSearch
    })
  }, [allServices, activeCategory, searchQuery])

  const categories = [
    { id: 'all', label: 'All Services', telugu: 'అన్ని సేవలు', icon: Sparkles, count: allServices.length },
    { id: 'taxi', label: 'Taxis & Cabs', telugu: 'క్యాబ్స్ & టాక్సీ', icon: Car, count: allServices.filter((s) => s.categorySlug === 'taxi').length },
    { id: 'auto', label: 'Auto Stand', telugu: 'ఆటో స్టాండ్', icon: ShieldCheck, count: allServices.filter((s) => s.categorySlug === 'auto').length },
    { id: 'plumber', label: 'Plumbers', telugu: 'ప్లంబర్లు', icon: Wrench, count: allServices.filter((s) => s.categorySlug === 'plumber').length },
    { id: 'electrician', label: 'Electricians', telugu: 'ఎలక్ట్రీషియన్లు', icon: Zap, count: allServices.filter((s) => s.categorySlug === 'electrician').length },
    { id: 'ac', label: 'AC & Fridge', telugu: 'ఏసీ & ఫ్రిడ్జ్ రిపేర్', icon: Snowflake, count: allServices.filter((s) => s.categorySlug === 'ac').length },
    { id: 'mechanic', label: 'Auto Garage', telugu: 'మెకానిక్ & గ్యారేజ్', icon: Flame, count: allServices.filter((s) => s.categorySlug === 'mechanic').length },
    { id: 'painter', label: 'Painting', telugu: 'పెయింటింగ్', icon: Paintbrush, count: allServices.filter((s) => s.categorySlug === 'painter').length },
  ]

  return (
    <div className="space-y-8">
      {/* 1. SEARCH & CATEGORY CHIPS BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plumber, electrician, taxi, auto driver, AC repair in Choutuppal..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. RESULTS GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Verified Local Professionals</span>
            <span className="text-xs font-bold text-slate-400">
              ({filteredServices.length} {filteredServices.length === 1 ? 'technician' : 'technicians'} available)
            </span>
          </h2>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl font-bold border border-emerald-200">
            ⚡ Direct Owner / Tech Contact
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Wrench className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No service technicians found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn&apos;t find any service matching your query. Tap below to request any on-demand service directly via our WhatsApp desk.
            </p>
            <a
              href={getServiceWhatsAppUrl('Special Custom Request')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
            >
              <MessageCircle className="h-4 w-4" />
              Request on WhatsApp Desk
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const waUrl = getServiceWhatsAppUrl(service.title)
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover & Badges */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <Image
                        src={service.coverImage}
                        alt={service.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-900 font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Verified
                        </span>
                        {service.isEmergency247 && (
                          <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            24/7 Available
                          </span>
                        )}
                      </div>

                      {/* Category tag */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600/90 backdrop-blur-xs px-2 py-0.5 rounded-md">
                          {service.category}
                        </span>
                        <h3 className="text-base font-black mt-1 line-clamp-1 group-hover:text-emerald-300 transition-colors">
                          {service.title}
                        </h3>
                        {service.teluguTitle && (
                          <p className="text-[11px] text-slate-300 line-clamp-1">
                            {service.teluguTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Body content */}
                    <div className="p-5 space-y-3">
                      {/* Metric pills */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-lg font-bold">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>{service.rating}</span>
                          <span className="text-slate-400 font-normal">({service.reviewsCount})</span>
                        </div>
                        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded-lg font-bold">
                          <Clock className="h-3 w-3 text-blue-600" />
                          <span>{service.responseTime} arrival</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {service.experience}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {service.description}
                      </p>

                      {/* Specialties tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {service.specialties.slice(0, 3).map((spec, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            ✓ {spec}
                          </span>
                        ))}
                      </div>

                      {/* Coverage Area */}
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{service.coverageArea}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${service.phone}`}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold py-3 rounded-2xl text-xs transition cursor-pointer shadow-2xs"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Call Now</span>
                    </a>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. VERIFIED SERVICE GUARANTEE STRIP */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-800/40 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black px-3 py-1 rounded-full uppercase mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Choutuppal Franchise Trust Guarantee
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            Are you a skilled technician, taxi owner or mechanic in Choutuppal?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            Register your services free on Choutuppal.in and connect directly to 5,000+ local customer inquiries monthly with automated WhatsApp lead notifications.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition shadow-lg"
            >
              <span>Register as Technician (ఉచిత నమోదు)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/919494348175?text=Hi%20Choutuppal%2C%20I%20want%20to%20list%20my%20service%20on%20the%20app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition border border-slate-700"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>Contact Franchise Manager</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
