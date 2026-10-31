'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Building2,
  Home,
  MapPin,
  Phone,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  Maximize2,
  Compass,
  ArrowRight,
  Search,
  Sparkles,
  TreePine,
  Store,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { sanitizeImageUrl } from '@/lib/utils'
import { getRealEstateWhatsAppUrl } from '@/lib/constants'
import type { Listing } from '@/lib/types'

export interface PropertyItem {
  id: string
  title: string
  teluguTitle?: string
  slug?: string
  propertyType: 'plots' | 'farmland' | 'commercial' | 'residential'
  propertyTypeLabel: string
  price: string
  pricePerUnit?: string
  area: string
  facing: string
  roadWidth: string
  approvalType: string
  location: string
  village: string
  phone: string
  whatsapp?: string
  coverImage: string
  description: string
  highlights: string[]
  isVerifiedVenture?: boolean
}

const DEFAULT_VERIFIED_VENTURES: PropertyItem[] = [
  {
    id: 'prop_nh65_plots',
    title: 'Sri Balaji Mega DTCP Approved Township (NH-65 Highway)',
    teluguTitle: 'శ్రీ బాలాజీ మెగా DTCP టౌన్‌షిప్ - నేషనల్ హైవే ఫేసింగ్',
    slug: 'sri-balaji-dtcp-township',
    propertyType: 'plots',
    propertyTypeLabel: 'DTCP Open Plots',
    price: '₹12,500 / Sq. Yd',
    pricePerUnit: 'Starting from ₹18.75 Lakhs',
    area: '150 - 300 Sq. Yds',
    facing: 'East & North Facing',
    roadWidth: '40 ft & 60 ft BT Roads',
    approvalType: 'DTCP & RERA Approved',
    location: 'Near Choutuppal Tollgate, Hyderabad-Vijayawada Highway',
    village: 'Choutuppal Town',
    phone: '9441348175',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
    description: 'Prime highway facing residential open plots with 100% clear title, spot registration, underground drainage, electricity, avenue plantation, and park.',
    highlights: ['100% Vaastu', 'Underground Drainage', 'Electricity & Water Lines', 'Bank Loan Available'],
    isVerifiedVenture: true,
  },
  {
    id: 'prop_panthangi_farms',
    title: 'Green Valley Organic Farmland & Weekend Villa Plots',
    teluguTitle: 'గ్రీన్ వ్యాలీ ఆర్గానిక్ ఫామ్‌ల్యాండ్ & వీకెండ్ విల్లా ప్లాట్లు',
    slug: 'green-valley-farmlands',
    propertyType: 'farmland',
    propertyTypeLabel: 'Agricultural Farmland',
    price: '₹5,500 / Sq. Yd',
    pricePerUnit: '₹28 Lakhs / Gunta (Half Acre available)',
    area: '500 Sq. Yds - 2 Acres',
    facing: 'All Facings Available',
    roadWidth: '33 ft Gravel Road',
    approvalType: 'Clear Title (Patta Passbook)',
    location: 'Panthangi Village Road, 4km from Choutuppal Junction',
    village: 'Panthangi',
    phone: '9494348175',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    description: 'Drip-irrigated sandalwood, mango & mahogany plantation farmland with 24/7 borewell water, solar fencing, and ready cottage foundation.',
    highlights: ['Red Soil Farmland', 'Drip Irrigation', 'Borewell Water', 'Immediate Dharani Passbook'],
    isVerifiedVenture: true,
  },
  {
    id: 'prop_town_commercial',
    title: 'Choutuppal Main Road 3-Floor Commercial Building for Sale',
    teluguTitle: 'చౌటుప్పల్ మెయిన్ రోడ్డు 3 అంతస్తుల కమర్షియల్ కాంప్లెక్స్',
    slug: 'choutuppal-main-commercial-building',
    propertyType: 'commercial',
    propertyTypeLabel: 'Commercial Building',
    price: '₹1.85 Crores',
    pricePerUnit: 'Rental Yield ₹85,000/month',
    area: '240 Sq. Yds (4,200 Sq. Ft Builtup)',
    facing: 'North-East Corner',
    roadWidth: '80 ft Main Road',
    approvalType: 'Municipality Approved G+2',
    location: 'Opposite RTC Bus Stand, Choutuppal Market Road',
    village: 'Choutuppal Town',
    phone: '9848012345',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    description: 'High footfall commercial building with 6 running shops on ground floor, 2 office floors rented to diagnostic center & finance bank.',
    highlights: ['Running Rental Income', 'Commercial Meter', 'Heavy Footfall', 'Prime Bus Stand Road'],
    isVerifiedVenture: true,
  },
  {
    id: 'prop_malkapur_house',
    title: 'Brand New 3BHK Independent Luxury Villa House',
    teluguTitle: 'నూతన 3BHK ఇండిపెండెంట్ లగ్జరీ హౌస్ - మల్కాపూర్',
    slug: 'malkapur-independent-villa',
    propertyType: 'residential',
    propertyTypeLabel: 'Independent House',
    price: '₹58 Lakhs',
    pricePerUnit: 'Negotiable for spot payment',
    area: '167 Sq. Yds (1,450 Sq. Ft Slab)',
    facing: 'East Facing',
    roadWidth: '30 ft CC Road',
    approvalType: 'Gram Panchayat & Bank Loan Approved',
    location: 'Malkapur Main Village Road, 2km from Highway',
    village: 'Malkapur',
    phone: '9441348175',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    description: 'Modern 3BHK elevation with teakwood main door, premium vitrified tiles, modular kitchen, car parking portico, and municipal drinking water connection.',
    highlights: ['Car Parking Portico', 'Teak Wood Finishing', 'Municipal Water', 'SBI Loan Eligible'],
    isVerifiedVenture: true,
  },
  {
    id: 'prop_lingoji_plots',
    title: 'Lakshmi Narasimha HMDA Residential Layout',
    teluguTitle: 'లక్ష్మీ నరసింహ HMDA రెసిడెన్షియల్ లేఅవుట్ - లింగోజిగూడ',
    slug: 'lakshmi-narasimha-hmda-layout',
    propertyType: 'plots',
    propertyTypeLabel: 'HMDA Open Plots',
    price: '₹14,000 / Sq. Yd',
    pricePerUnit: '₹28 Lakhs for 200 Sq. Yd',
    area: '200, 267 & 400 Sq. Yds',
    facing: 'East & West Facings',
    roadWidth: '40 ft Blacktop Roads',
    approvalType: 'HMDA & RERA Approved',
    location: 'Lingoji Guda Ring Road, Choutuppal Mandal',
    village: 'Lingoji Guda',
    phone: '9494348175',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1524813686514-a57563d77d66?auto=format&fit=crop&w=800&q=80',
    description: 'Fully compound walled gated community layout with overhead water tank, children play park, LED street lights, and fast appreciation potential.',
    highlights: ['Gated Community', 'Compound Wall', 'Overhead Water Tank', 'Children Play Area'],
    isVerifiedVenture: true,
  },
  {
    id: 'prop_peddakondur_farm',
    title: '1.25 Acres Highway Adjacent Commercial Agricultural Land',
    teluguTitle: '1.25 ఎకరాల హైవే ఆనుకుని ఉన్న కమర్షియల్ ల్యాండ్',
    slug: 'peddakondur-commercial-land',
    propertyType: 'farmland',
    propertyTypeLabel: 'Highway Land',
    price: '₹95 Lakhs / Acre',
    pricePerUnit: 'Total ₹1.18 Crores',
    area: '1 Acre 10 Guntas',
    facing: 'South-East 120 ft Highway Frontage',
    roadWidth: 'NH-65 Highway Frontage',
    approvalType: 'Dharani Clear Title Patta',
    location: 'Peddakondur Stage, Beside Petrol Pump',
    village: 'Peddakondur',
    phone: '9848012345',
    whatsapp: '9494348175',
    coverImage: 'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80',
    description: 'Excellent frontage for petrol pump, highway restaurant dhaba, warehousing godown, or heavy vehicle transport parking.',
    highlights: ['120 ft Frontage', 'Single Owner Patta', 'Commercial Potential', 'Zero Litigation'],
    isVerifiedVenture: true,
  },
]

interface RealEstateCatalogProps {
  initialStoreListings: Listing[]
}

export function RealEstateCatalog({ initialStoreListings }: RealEstateCatalogProps) {
  const [activeType, setActiveType] = useState<string>('all')
  const [selectedVillage, setSelectedVillage] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Map store listings into uniform PropertyItem structure
  const storePropertyItems: PropertyItem[] = useMemo(() => {
    return initialStoreListings.map((l) => {
      let propType: PropertyItem['propertyType'] = 'plots'
      const titleLower = (l.title || '').toLowerCase()
      if (titleLower.includes('farm') || titleLower.includes('land') || titleLower.includes('acre')) propType = 'farmland'
      else if (titleLower.includes('commercial') || titleLower.includes('shop') || titleLower.includes('building')) propType = 'commercial'
      else if (titleLower.includes('house') || titleLower.includes('villa') || titleLower.includes('flat')) propType = 'residential'

      return {
        id: l.id,
        title: l.title,
        slug: l.slug || l.id,
        propertyType: propType,
        propertyTypeLabel: propType === 'plots' ? 'Open Plots' : propType === 'farmland' ? 'Farmland' : propType === 'commercial' ? 'Commercial' : 'House / Villa',
        price: l.price || 'Price on Request',
        area: 'Standard Layout Area',
        facing: 'East / North',
        roadWidth: '33 ft CC Road',
        approvalType: 'Verified Layout',
        location: l.address || 'Choutuppal Mandal',
        village: l.villageName || 'Choutuppal Town',
        phone: l.phone || '9441348175',
        whatsapp: l.whatsapp || l.phone || '9494348175',
        coverImage: sanitizeImageUrl(l.coverImage),
        description: l.description || 'Verified property in Choutuppal Mandal.',
        highlights: ['Verified Title', 'Direct Contact', 'Fast Growing Area'],
        isVerifiedVenture: true,
      }
    })
  }, [initialStoreListings])

  // Combine and deduplicate
  const allProperties: PropertyItem[] = useMemo(() => {
    const map = new Map<string, PropertyItem>()
    DEFAULT_VERIFIED_VENTURES.forEach((p) => map.set(p.id, p))
    storePropertyItems.forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p)
    })
    return Array.from(map.values())
  }, [storePropertyItems])

  // Filter based on active filters
  const filteredProperties = useMemo(() => {
    return allProperties.filter((item) => {
      const matchesType = activeType === 'all' || item.propertyType === activeType
      const matchesVillage = selectedVillage === 'all' || item.village.toLowerCase().includes(selectedVillage.toLowerCase())
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.teluguTitle && item.teluguTitle.toLowerCase().includes(q)) ||
        item.location.toLowerCase().includes(q) ||
        item.approvalType.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      return matchesType && matchesVillage && matchesSearch
    })
  }, [allProperties, activeType, selectedVillage, searchQuery])

  const propertyTypes = [
    { id: 'all', label: 'All Properties', telugu: 'అన్ని ప్రాపర్టీలు', icon: Sparkles, count: allProperties.length },
    { id: 'plots', label: 'DTCP/HMDA Plots', telugu: 'ఓపెన్ ప్లాట్లు', icon: Layers, count: allProperties.filter((p) => p.propertyType === 'plots').length },
    { id: 'farmland', label: 'Farmlands', telugu: 'వ్యవసాయ భూములు', icon: TreePine, count: allProperties.filter((p) => p.propertyType === 'farmland').length },
    { id: 'commercial', label: 'Commercial', telugu: 'కమర్షియల్ షాపులు', icon: Store, count: allProperties.filter((p) => p.propertyType === 'commercial').length },
    { id: 'residential', label: 'Houses & Villas', telugu: 'ఇళ్ళు & విల్లాలు', icon: Home, count: allProperties.filter((p) => p.propertyType === 'residential').length },
  ]

  const villages = [
    { id: 'all', label: 'All Villages / Town' },
    { id: 'choutuppal', label: 'Choutuppal Town' },
    { id: 'panthangi', label: 'Panthangi' },
    { id: 'malkapur', label: 'Malkapur' },
    { id: 'peddakondur', label: 'Peddakondur' },
    { id: 'lingoji', label: 'Lingoji Guda' },
  ]

  return (
    <div className="space-y-8">
      {/* 1. FILTER CONTROLS */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        {/* Search and Village dropdown row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by venture name, NH-65, DTCP layout, road width..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            >
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  📍 {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Property Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100">
          {propertyTypes.map((type) => {
            const Icon = type.icon
            const isActive = activeType === type.id
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setActiveType(type.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{type.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {type.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. PROPERTIES GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Verified Ventures &amp; Properties</span>
            <span className="text-xs font-bold text-slate-400">
              ({filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} listed)
            </span>
          </h2>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl font-bold border border-emerald-200">
            ✓ Direct Owner / Developer Contact
          </span>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No properties matched your criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Looking for something specific? Contact our Choutuppal Real Estate Help Desk directly on WhatsApp.
            </p>
            <a
              href="https://wa.me/919494348175?text=Hi%20Choutuppal%2C%20I%20am%20looking%20for%20property%20in%20Choutuppal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Property Desk
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((prop) => {
              const waUrl = getRealEstateWhatsAppUrl(prop.title)
              const detailUrl = `/business/${prop.slug || prop.id}`
              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                      <Image
                        src={prop.coverImage}
                        alt={prop.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-900 font-extrabold text-[11px] px-2.5 py-1 rounded-xl shadow-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {prop.approvalType}
                        </span>
                        <span className="bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-xl shadow-md">
                          {prop.price}
                        </span>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md">
                          {prop.propertyTypeLabel}
                        </span>
                        <Link href={detailUrl}>
                          <h3 className="text-base font-black mt-1 line-clamp-1 group-hover:text-emerald-300 transition-colors">
                            {prop.title}
                          </h3>
                        </Link>
                        {prop.teluguTitle && (
                          <p className="text-[11px] text-slate-300 line-clamp-1">
                            {prop.teluguTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Specifications Bar */}
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <div className="px-1">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Plot Area</div>
                          <div className="text-xs font-black text-slate-800 truncate mt-0.5">{prop.area}</div>
                        </div>
                        <div className="px-1 border-x border-slate-200">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Facing</div>
                          <div className="text-xs font-black text-slate-800 truncate mt-0.5">{prop.facing}</div>
                        </div>
                        <div className="px-1">
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">Road</div>
                          <div className="text-xs font-black text-slate-800 truncate mt-0.5">{prop.roadWidth}</div>
                        </div>
                      </div>

                      {prop.pricePerUnit && (
                        <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl inline-block">
                          💰 {prop.pricePerUnit}
                        </div>
                      )}

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {prop.description}
                      </p>

                      {/* Highlights */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {prop.highlights.slice(0, 3).map((h, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            ✓ {h}
                          </span>
                        ))}
                      </div>

                      {/* Location */}
                      <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{prop.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-5 pt-0 grid grid-cols-2 gap-2.5">
                    <a
                      href={`tel:${prop.phone}`}
                      className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold py-3 rounded-2xl text-xs transition cursor-pointer shadow-2xs"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Call Owner</span>
                    </a>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp Site Visit</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. POST PROPERTY PROMO BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-800/40 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black px-3 py-1 rounded-full uppercase mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Zero Brokerage Direct Marketplace
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            Have land, open plots or a house for sale in Choutuppal?
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            List your real estate venture directly on Choutuppal.in. Reach NRI investors, Hyderabad buyers, and highway seekers with verified video tours and automated WhatsApp lead notifications.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition shadow-lg"
            >
              <span>Post Property Ad Free (ఉచిత ప్రకటన)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/919494348175?text=Hi%20Choutuppal%2C%20I%20want%20to%20advertise%20my%20real%20estate%20venture"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition border border-slate-700"
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>Contact Real Estate Desk</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
