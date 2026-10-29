import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Car,
  Wrench,
  Zap,
  Building2,
} from 'lucide-react'
import { getHomePageData } from '@/lib/home-data'
import {
  WHATSAPP_BOT_NUMBER,
  getListingWhatsAppUrl,
  getTaxiBookingWhatsAppUrl,
  getAutoBookingWhatsAppUrl,
  getPlumberWhatsAppUrl,
  getElectricianWhatsAppUrl,
  getRealEstateWhatsAppUrl,
} from '@/lib/constants'

// Modular Home Page Components matching choutuppal.in
import { Ticker } from '@/components/home/ticker'
import { StoriesRail } from '@/components/home/stories-rail'
import { BannerCarousel } from '@/components/home/banner-carousel'
import { CategoriesGrid } from '@/components/home/categories-grid'
import { FeaturedRail } from '@/components/home/featured-rail'
import { RealEstateRail } from '@/components/home/real-estate-rail'
import { NewsGrid } from '@/components/home/news-grid'
import { BlogGrid } from '@/components/home/blog-grid'
import { PricingPlans } from '@/components/home/pricing-plans'
import { Testimonials } from '@/components/home/testimonials'
import { ShortsRail } from '@/components/home/shorts-rail'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const data = await getHomePageData()

  // Format stories for StoriesRail
  const formattedStories = (data.stories || []).map((s: any) => ({
    id: s.id,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType || 'IMAGE',
    caption: s.caption,
    views: s.views || 0,
    expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
    createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
    owner: {
      username: s.businessName || 'Business',
      name: s.businessName || 'Local Merchant',
      image: s.mediaUrl,
    },
  }))

  // Format banners for BannerCarousel
  const formattedBanners = (data.banners || []).map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    link: b.linkUrl || '/listings',
  }))

  // Format featured listings for FeaturedRail
  const formattedFeatured = (data.featured || []).map((l, i) => ({
    id: l.id,
    title: l.title,
    slug: l.slug || l.id,
    coverImage: l.coverImage,
    logo: l.logo || null,
    avgRating: 4.8,
    views: l.views || 100 + i * 5,
    isFeatured: true,
    category: {
      name: l.categoryName || 'Business',
      slug: l.categoryId || 'business',
    },
    village: {
      name: l.address || 'Choutuppal',
      slug: 'choutuppal',
    },
  }))

  // Format real estate listings for RealEstateRail
  const formattedRealEstate = (data.realEstate || []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug || p.id,
    coverImage: p.coverImage,
    price: typeof p.price === 'number' ? p.price : 2500000,
    type: 'PLOT',
    listingType: 'SALE',
    bedrooms: null,
    areaSqft: 1800,
    village: {
      name: p.address || 'Choutuppal Highway',
      slug: 'choutuppal',
    },
  }))

  // Format news items for NewsGrid
  const formattedNews = (data.latestNews || []).map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug || n.id,
    summary: n.summary,
    image: n.coverImage,
    createdAt: n.createdAt,
  }))

  // Format shorts for ShortsRail
  const formattedShorts = (data.shorts || []).map((s: any) => ({
    id: s.id,
    videoUrl: s.videoUrl,
    platform: s.platform || 'YOUTUBE',
    thumbnail: s.thumbnailUrl,
    title: s.title,
    description: s.description,
    views: s.views,
    likes: s.likes,
    youtubeId: s.youtubeId || null,
    createdAt: s.createdAt,
    owner: {
      name: 'Choutuppal Reels',
      username: 'choutuppal',
    },
  }))

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      {/* 1. TICKER BAR */}
      <Ticker
        initialAnnouncements={
          data.tickers && data.tickers.length > 0
            ? data.tickers.map((t) => t.text)
            : undefined
        }
      />

      {/* 2. HERO SEARCH SECTION (MANA CHOUTUPPAL BRANDING) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-indigo-950 text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md border border-emerald-500/30 text-emerald-300 mb-3 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>మన చౌటుప్పల్ 200+ వెరిఫైడ్ వ్యాపారాలు &amp; రియల్ ఎస్టేట్</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Mana Choutuppal<span className="text-emerald-400">.in</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto font-medium">
            చౌటుప్పల్ లోకల్ షాపులు, 24/7 టాక్సీ &amp; ఆటో, ఎమర్జెన్సీ ప్లంబర్, ఓపెన్ ప్లాట్లు &amp; వాట్సాప్ డైరెక్ట్ డీల్స్.
          </p>

          {/* Search Bar Form */}
          <form
            action="/listings"
            method="GET"
            className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-2xl ring-1 ring-slate-900/10"
          >
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search business, doctor, plumber, plot, car..."
                className="w-full text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white font-bold px-7 py-2.5 rounded-xl text-sm shadow-md hover:from-emerald-700 hover:to-blue-800 transition"
            >
              వెతకండి (Search)
            </button>
          </form>

          {/* Quick Filter Badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-300 font-medium">పాపులర్:</span>
            <Link
              href="/services"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10"
            >
              🚖 Taxi
            </Link>
            <Link
              href="/services"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10"
            >
              🛺 Auto
            </Link>
            <Link
              href="/services"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10"
            >
              🔧 Plumber
            </Link>
            <Link
              href="/services"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10"
            >
              ⚡ Electrician
            </Link>
            <Link
              href="/real-estate"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10 text-amber-300 font-bold"
            >
              🏡 Open Plots
            </Link>
            <Link
              href="/listings?cat=cat-health"
              className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg backdrop-blur-xs transition border border-white/10"
            >
              🏥 Hospitals
            </Link>
          </div>
        </div>
      </section>

      {/* 3. STORIES & DAILY DEALS (24H LOCAL SHOP OFFERS) */}
      <section className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 -mt-6 relative z-10">
        <StoriesRail
          stories={formattedStories}
          viewer={{ isLoggedIn: false, isPremium: false }}
        />
      </section>

      {/* 4. HERO PROMOTIONAL BANNER CAROUSEL */}
      <section className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 mt-6">
        <BannerCarousel banners={formattedBanners} />
      </section>

      {/* 5. 24/7 CORE EMERGENCY SERVICES */}
      <section className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              🚨 24/7 Emergency Services (అత్యవసర సేవలు)
            </h2>
            <p className="text-xs text-slate-500">
              Instant 1-click booking on WhatsApp with live confirmation
            </p>
          </div>
          <Link
            href="/services"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            All Services
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TAXI CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200 font-bold">
                  <Car className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Available Now
                </span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                Choutuppal Taxi &amp; Cabs
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Outstation cabs, Airport drops, Hyderabad AC Taxi, Innova, Swift Dzire 24/7.
              </p>
            </div>
            <a
              href={getTaxiBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Book Taxi on WhatsApp
            </a>
          </div>

          {/* AUTO CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200 font-bold text-xl">
                  🛺
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Stand Ready
                </span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                Choutuppal Auto Stand
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Local Choutuppal town rides, Panthangi, Malkapur &amp; Peddakondur drops.
              </p>
            </div>
            <a
              href={getAutoBookingWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Call Auto on WhatsApp
            </a>
          </div>

          {/* PLUMBER CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-bold">
                  <Wrench className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Emergency
                </span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                Emergency Plumbers
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pipe leakages, bathroom fitting, water tank cleaning, borewell motor repair.
              </p>
            </div>
            <a
              href={getPlumberWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Request Plumber
            </a>
          </div>

          {/* ELECTRICIAN CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200 font-bold">
                  <Zap className="h-6 w-6" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Certified
                </span>
              </div>
              <h3 className="mt-3 text-base font-extrabold text-slate-900">
                Electricians &amp; AC
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                House wiring, short circuit, inverter setup, AC servicing &amp; fan repair.
              </p>
            </div>
            <a
              href={getElectricianWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              Request Electrician
            </a>
          </div>
        </div>
      </section>

      {/* 6. BROWSE 16 CATEGORIES GRID */}
      <section className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 mt-10">
        <CategoriesGrid />
      </section>

      {/* 7. TOP VERIFIED FEATURED BUSINESS LISTINGS */}
      <div className="mt-8">
        <FeaturedRail listings={formattedFeatured} />
      </div>

      {/* 8. FEATURED REAL ESTATE & OPEN PLOTS */}
      <div className="mt-12">
        <RealEstateRail properties={formattedRealEstate} />
      </div>

      {/* 9. CHOUTUPPAL LOCAL REELS & VIDEO SHORTS */}
      {data.shorts && data.shorts.length > 0 ? (
        <div className="mt-12">
          <ShortsRail shorts={formattedShorts} />
        </div>
      ) : null}

      {/* 10. LOCAL NEWS & MANDAL UPDATES */}
      {data.latestNews && data.latestNews.length > 0 ? (
        <div className="mt-12">
          <NewsGrid articles={formattedNews} />
        </div>
      ) : null}

      {/* 11. CHOUTUPPAL BLOGS & GUIDES */}
      <div className="mt-12">
        <BlogGrid blogs={data.blogs} />
      </div>

      {/* 12. PRICE MENU / ADVERTISING & PROMO PLANS */}
      <div className="mt-12">
        <PricingPlans />
      </div>

      {/* 13. REAL USER & BUSINESS TESTIMONIALS */}
      <div className="mt-12">
        <Testimonials />
      </div>

      {/* 14. WARD COMMUNITY WHATSAPP GROUPS (1 TO 20) */}
      <section className="mx-auto max-w-7xl w-full px-3 sm:px-4 lg:px-6 mt-14 mb-14">
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="bg-emerald-500/30 text-emerald-300 font-extrabold text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-400/30">
              Choutuppal Municipality Ward Community
            </span>
            <h2 className="text-xl sm:text-3xl font-black mt-3 leading-snug">
              చౌటుప్పల్ వార్డ్ 1 నుండి 20 వాట్సాప్ గ్రూపులు
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-2">
              Join your local colony &amp; ward WhatsApp groups for real-time drinking water timings, garbage collection alerts, and municipal announcements.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/community"
                className="bg-white text-emerald-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm hover:bg-emerald-50 transition shadow-md"
              >
                Join Ward Group (వార్డ్ గ్రూప్ లో చేరండి)
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_BOT_NUMBER}?text=Hi%20Choutuppal%2C%20I%20want%20to%20list%20my%20business`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-700/80 border border-emerald-500/50 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm hover:bg-emerald-600 transition"
              >
                Register Business Free (ఉచిత నమోదు)
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
