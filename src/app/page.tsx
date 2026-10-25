import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Car,
  Wrench,
  Zap,
  Home as HomeIcon,
  Play,
  Share2,
  Users,
  Compass,
} from 'lucide-react'
import { getHomePageData } from '@/lib/home-data'
import {
  WHATSAPP_BOT_NUMBER,
  WHATSAPP_MEDIA_NUMBER,
  getListingWhatsAppUrl,
  getTaxiBookingWhatsAppUrl,
  getAutoBookingWhatsAppUrl,
  getPlumberWhatsAppUrl,
  getElectricianWhatsAppUrl,
  getRealEstateWhatsAppUrl,
  getStoryOfferWhatsAppUrl,
} from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const data = await getHomePageData()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50">
      {/* 1. TICKER BAR */}
      {data.tickers && data.tickers.length > 0 ? (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs py-2 px-3 shadow-inner">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 overflow-hidden">
            <span className="shrink-0 font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded text-[10px]">
              📢 LIVE
            </span>
            <div className="truncate flex-1 font-medium">
              {data.tickers.map((t) => t.text).join(' • ')}
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_BOT_NUMBER}?text=Hi%20Choutuppal`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-amber-300 hover:text-white font-bold flex items-center gap-1 text-[11px]"
            >
              <MessageCircle className="h-3 w-3" />
              Chat Bot
            </a>
          </div>
        </div>
      ) : null}

      {/* 2. HERO SEARCH SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/20 text-amber-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mana Choutuppal 200+ Verified Businesses &amp; Services</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            చౌటుప్పల్ లోకల్ బిజినెస్ &amp; రియల్ ఎస్టేట్
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto">
            Find shops, plumbers, electricians, 24/7 taxi &amp; auto booking, open plots, and WhatsApp direct deals.
          </p>

          {/* Search Bar Form */}
          <form action="/listings" method="GET" className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-xl">
            <div className="flex-1 flex items-center gap-2 px-3">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                name="q"
                placeholder="Search business, doctor, plumber, plot..."
                className="w-full text-slate-800 placeholder-slate-400 text-sm focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
            >
              Search
            </button>
          </form>

          {/* Quick Filter Badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-300">Popular:</span>
            <Link href="/services" className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs transition">
              🚖 Taxi
            </Link>
            <Link href="/services" className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs transition">
              🛺 Auto
            </Link>
            <Link href="/services" className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs transition">
              🔧 Plumber
            </Link>
            <Link href="/real-estate" className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs transition">
              🏡 Open Plots
            </Link>
            <Link href="/listings?cat=cat-health" className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-xs transition">
              🏥 Hospitals
            </Link>
          </div>
        </div>
      </section>

      {/* 3. STORIES & OFFERS RAIL */}
      {data.stories && data.stories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Active Local Stories &amp; Daily Deals (లైవ్ ఆఫర్లు)
                </h3>
              </div>
              <span className="text-xs text-slate-400">Auto-expires in 24h</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
              {data.stories.map((story) => (
                <div
                  key={story.id}
                  className="shrink-0 w-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs group"
                >
                  <div className="relative h-44 w-full">
                    <Image
                      src={story.mediaUrl}
                      alt={story.businessName}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <p className="text-xs font-black truncate">{story.businessName}</p>
                      <p className="text-[10px] text-slate-200 line-clamp-1">{story.caption}</p>
                    </div>
                  </div>
                  <a
                    href={getStoryOfferWhatsAppUrl(story.caption, story.businessName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 transition"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Claim on WA
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 4. PROMOTIONAL BANNERS */}
      {data.banners && data.banners.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.banners.slice(0, 2).map((banner) => (
              <div
                key={banner.id}
                className="relative h-44 rounded-2xl overflow-hidden shadow-md border border-slate-200 group"
              >
                <Image
                  src={banner.imageUrl}
                  alt={banner.title}
                  fill
                  className="object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-4 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded w-max mb-1">
                    Featured Sponsor
                  </span>
                  <h4 className="text-base font-black leading-snug">{banner.title}</h4>
                  <div className="mt-2 flex items-center gap-2">
                    <Link
                      href={banner.linkUrl || '/listings'}
                      className="inline-flex items-center gap-1 text-xs font-bold bg-white text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-100 transition"
                    >
                      View Details
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 5. 4 CORE SERVICES (TAXI, AUTO, PLUMBER, ELECTRICIAN) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              🚨 24/7 Essential Emergency Services
            </h2>
            <p className="text-xs text-slate-500">
              Instant 1-click booking on WhatsApp with live driver &amp; technician confirmation
            </p>
          </div>
          <Link
            href="/services"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            All Services
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TAXI CARD */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
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
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200 font-bold">
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
                Local Choutuppal town rides, Panthangi, Malkapur &amp; Peddakondur village drops.
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
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
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
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col justify-between">
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
                House wiring, short circuit, inverter setup, AC servicing &amp; fan rewinding.
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

      {/* 6. CATEGORIES GRID (16 CATEGORIES) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              📂 Browse by Category (విభాగాలు)
            </h2>
            <p className="text-xs text-slate-500">
              16 essential commercial categories across Choutuppal Mandal
            </p>
          </div>
          <Link
            href="/listings"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View 200+ Businesses
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {data.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/listings?cat=${cat.id}`}
              className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition text-center group flex flex-col items-center justify-center min-h-[90px]"
            >
              <span className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition block truncate w-full">
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-400 font-telugu block mt-0.5 truncate w-full">
                {cat.telugu}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. VERIFIED BUSINESS DIRECTORY LISTINGS (WITH PHOTO ROWS) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                🌟 Verified Local Businesses (ధృవీకరించబడిన దుకాణాలు)
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Detailed listings with photos, direct phone numbers, and CRM automated chat
            </p>
          </div>
          <Link
            href="/listings"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            See All ({data.totalListings})
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.featured.slice(0, 9).map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* PHOTO ROW / COVER */}
                <div className="relative h-44 w-full bg-slate-100">
                  <Image
                    src={listing.coverImage}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-800 shadow-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Verified</span>
                  </div>
                  {listing.isPremium ? (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shadow-xs">
                      Premium
                    </div>
                  ) : null}
                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                    {listing.categoryName || 'Business'}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="p-4">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">
                    {listing.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{listing.address}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (PHONE & WHATSAPP) */}
              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <a
                  href={`tel:${listing.phone}`}
                  className="flex items-center justify-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold transition"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-600" />
                  Call Now
                </a>
                <a
                  href={getListingWhatsAppUrl(listing.title, listing.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. REAL ESTATE & PLOTS SECTION */}
      {data.realEstate && data.realEstate.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <HomeIcon className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  🏡 Choutuppal Real Estate &amp; Open Plots (ప్లాట్లు &amp; భూములు)
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Highway facing DTCP/HMDA approved ventures, agricultural land &amp; houses
              </p>
            </div>
            <Link
              href="/real-estate"
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              All Plots
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.realEstate.slice(0, 3).map((plot) => (
              <div
                key={plot.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 hover:shadow-md transition"
              >
                <div className="relative h-44 w-full">
                  <Image
                    src={plot.coverImage}
                    alt={plot.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-emerald-700 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                    {plot.price || 'Contact for Price'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-extrabold text-slate-900 text-base line-clamp-1">{plot.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plot.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    <span>{plot.address}</span>
                  </div>

                  <a
                    href={getRealEstateWhatsAppUrl(plot.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-xs"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Inquire on WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 9. LOCAL REELS & SHORTS (INSTAGRAM & YOUTUBE PLAYER) */}
      {data.shorts && data.shorts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                🎬 Choutuppal Reels &amp; Local Video Shorts
              </h2>
              <p className="text-xs text-slate-500">
                Trending local videos, events, shop tours &amp; village moments
              </p>
            </div>
            <Link
              href="/shorts"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Watch All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.shorts.slice(0, 4).map((short) => (
              <div
                key={short.id}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs group"
              >
                <div className="relative h-64 w-full bg-slate-900">
                  <Image
                    src={short.thumbnailUrl}
                    alt={short.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/30 backdrop-blur-md text-white shadow-lg group-hover:scale-110 transition">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </span>
                  </div>
                  <div className="absolute top-2 left-2 bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                    REEL
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-xs font-extrabold line-clamp-2">{short.title}</p>
                    <span className="text-[10px] text-slate-300 mt-0.5 block">
                      {short.views.toLocaleString()} views
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <Link
                    href={`/shorts?id=${short.id}`}
                    className="block text-center bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold text-xs py-1.5 rounded-lg transition"
                  >
                    Watch Player
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 10. LOCAL NEWS & BLOGS */}
      {data.latestNews && data.latestNews.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                📰 Choutuppal News &amp; Mandal Updates (వార్తలు)
              </h2>
              <p className="text-xs text-slate-500">
                Development works, road expansion, municipality circulars &amp; local notifications
              </p>
            </div>
            <Link
              href="/news"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All News
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.latestNews.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-slate-200 flex flex-col sm:flex-row"
              >
                <div className="relative h-44 sm:h-auto sm:w-48 shrink-0 bg-slate-100">
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base mt-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.summary}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/news/${item.slug}`}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Read Story →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 11. WARD COMMUNITY GROUPS (1 TO 20) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12 mb-12">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
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
