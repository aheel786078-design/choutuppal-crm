'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Store,
  Home,
  Wrench,
  User as UserIcon,
  Plus,
  Eye,
  MessageCircle,
  Share2,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Building,
  TrendingUp,
  LogOut,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { sanitizeImageUrl } from '@/lib/utils'
import { toast } from 'sonner'
import type { Listing } from '@/lib/types'

interface UserDashboardProps {
  user: {
    userId?: string
    phone?: string
    name?: string
    role?: string
    territoryId?: string
  }
  listings?: Listing[]
  allListings?: Listing[]
}

type TabType = 'overview' | 'listings' | 'realestate' | 'services' | 'profile'

export function UserDashboardView({ user, listings = [], allListings = [] }: UserDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loggingOut, setLoggingOut] = useState(false)

  // Real estate & services filter
  const userRealEstate = listings.filter((l) => l.categoryId === 'real-estate' || l.categoryName === 'Real Estate')
  const userServices = listings.filter((l) => l.categoryId !== 'real-estate')

  const totalViews = listings.reduce((acc, curr) => acc + (curr.views || 45), 0)
  const totalLeads = listings.reduce((acc, curr) => acc + (curr.whatsappClicks || 12), 0)

  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_OPERATOR' || user.role === 'FRANCHISE_ADMIN'

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logged out successfully.')
      router.push('/login')
    } catch {
      router.push('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const getListingWhatsAppUrl = (title: string, id: string) => {
    const text = encodeURIComponent(`Hi, I am interested in your listing "${title}" on Choutuppal App (ID: ${id}). Please share more details.`)
    return `https://wa.me/919441348175?text=${text}`
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-emerald-600 selection:text-white">
      {/* 1. TOP HEADER & GREETING */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-xl shadow-md shadow-emerald-600/20">
                CP
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                    Merchant Dashboard
                  </h1>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Verified
                  </span>
                  {isAdmin && (
                    <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Admin Staff
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged in as <span className="text-slate-800 font-semibold">{user.phone}</span> • Mana Choutuppal Super App
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  <Building className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Admin CRM Console</span>
                </Link>
              )}
              <Link
                href="/register"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Post New Ad</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="p-2.5 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-xl transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION STRIP */}
          <div className="flex items-center gap-2 overflow-x-auto pt-6 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'listings', label: `My Listings (${listings.length})`, icon: Store },
              { id: 'realestate', label: `Real Estate (${userRealEstate.length})`, icon: Home },
              { id: 'services', label: `Services & Leads (${userServices.length})`, icon: Wrench },
              { id: 'profile', label: 'Profile & Settings', icon: UserIcon },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* KPI STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total Profile Views</span>
              <Eye className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalViews.toLocaleString()}</div>
            <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +24% this week
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">WhatsApp Leads</span>
              <MessageCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalLeads}</div>
            <p className="text-[11px] text-slate-500 mt-1">Direct click-to-chat inquiries</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Active Listings</span>
              <Store className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{listings.length}</div>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold">Live on Choutuppal.in</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Trust &amp; Verification</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">100%</div>
            <p className="text-[11px] text-slate-500 mt-1">Full franchise verified badge</p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Quick Actions &amp; Growth Tools
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Promote your Choutuppal listing on WhatsApp, generate QR stickers for your shop front, or update business details.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold mb-3">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Shop Counter QR Code</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Print and place on your cash counter so visiting customers can save your contact instantly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (listings[0]) {
                        router.push(`/business/${listings[0].slug || listings[0].id}`)
                      } else {
                        toast.info('Create a listing first to generate your counter QR.')
                      }
                    }}
                    className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View &amp; Print QR</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold mb-3">
                      <Share2 className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Share on WhatsApp Groups</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Share your digital business card with customer reviews, photos and directions directly to WhatsApp status.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = typeof window !== 'undefined' ? window.location.origin : 'https://choutuppal.in'
                      const shareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out our verified business listing on Mana Choutuppal App: ${url}/business/${listings[0]?.slug || ''}`)}`
                      window.open(shareUrl, '_blank')
                    }}
                    className="mt-4 text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Share on WhatsApp</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 font-bold mb-3">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">Upgrade to Featured</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Appear at the top of category searches and get verified video stories pinned to Choutuppal homepage.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/919441348175?text=Hi%20Choutuppal%2C%20I%20want%20to%20upgrade%20my%20listing%20to%20Featured"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Request Upgrade</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* RECENT BUSINESS LISTINGS SNAPSHOT */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900">Your Listed Businesses</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('listings')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  View All ({listings.length})
                </button>
              </div>

              {listings.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Store className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No listings posted yet.</p>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> Post Your First Listing
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                          <Image
                            src={sanitizeImageUrl(item.coverImage)}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{item.categoryName || 'Directory'} • {item.villageName || 'Choutuppal'}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-700 font-semibold">
                            <span>{item.views || 48} Views</span>
                            <span>•</span>
                            <span>{item.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link
                          href={`/business/${item.slug || item.id}`}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Public Page</span>
                        </Link>
                        <a
                          href={getListingWhatsAppUrl(item.title, item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>Test WA Bot</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY LISTINGS */}
        {activeTab === 'listings' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">My Business Listings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your active directory pages, photos, and contact information.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Listing
              </Link>
            </div>

            <div className="space-y-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                      <Image
                        src={sanitizeImageUrl(item.coverImage)}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl line-clamp-2">
                        {item.description || 'Verified local listing in Choutuppal.'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          {item.address || 'Choutuppal Mandal'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-emerald-600" />
                          {item.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Link
                      href={`/business/${item.slug || item.id}`}
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </Link>
                    <a
                      href={getListingWhatsAppUrl(item.title, item.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp Link</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: REAL ESTATE */}
        {activeTab === 'realestate' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">My Real Estate Listings</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Open plots, farmlands, commercial shops, and residential houses listed for sale.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Plus className="h-3.5 w-3.5" /> Post Property
              </Link>
            </div>

            {userRealEstate.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Home className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No Real Estate Ads Listed</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Advertise open plots, farmland, or commercial spaces to thousands of buyers in Choutuppal and Hyderabad.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition"
                >
                  <Plus className="h-4 w-4" /> Post Property Ad Free
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userRealEstate.map((prop) => (
                  <div
                    key={prop.id}
                    className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-40 w-full rounded-xl overflow-hidden bg-slate-200 mb-3">
                        <Image
                          src={sanitizeImageUrl(prop.coverImage)}
                          alt={prop.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                          {prop.price || 'Price on Request'}
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{prop.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{prop.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-500">{prop.address || 'Choutuppal'}</span>
                      <Link
                        href={`/business/${prop.slug || prop.id}`}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Ad</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SERVICES */}
        {activeTab === 'services' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900">Technician Services &amp; Bookings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                On-demand taxi, plumbing, electrical, and appliance repair service listings.
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                  <Wrench className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">24/7 WhatsApp Service Dispatch</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Whenever a customer requests taxi, plumbing, or electrician services in Choutuppal, our automated bot sends instant customer phone numbers and location directly to your registered WhatsApp.
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href="/services"
                      className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Services Hub
                    </Link>
                    <a
                      href="https://wa.me/919494348175?text=Hi%20Choutuppal%2C%20I%20am%20available%20for%20service%20bookings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Test Dispatch Ping
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
            <div>
              <h2 className="text-lg font-black text-slate-900">Merchant Account &amp; WhatsApp Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Account verification and notification details.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Registered WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  readOnly
                  value={user.phone}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Account Role &amp; Access Tier
                </label>
                <input
                  type="text"
                  readOnly
                  value={user.role}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Assigned Territory
                </label>
                <input
                  type="text"
                  readOnly
                  value="Choutuppal Mandal (Flagship Territory)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Need to update phone or ownership?</span>
                <a
                  href="https://wa.me/919441348175?text=Hi%20Choutuppal%2C%20I%20want%20to%20update%20my%20merchant%20profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Contact Super Admin
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
