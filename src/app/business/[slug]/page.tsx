import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Share2,
  Star,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { loadStore, isListingPublished } from '@/lib/store'
import { getListingWhatsAppUrl, WHATSAPP_BOT_NUMBER } from '@/lib/constants'
import { resolveListingEntitlements } from '@/lib/entitlement-resolver'
import { sanitizeImageUrl } from '@/lib/home-data'

export const dynamic = 'force-dynamic'

interface BusinessPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BusinessDetailPage({ params }: BusinessPageProps) {
  const { slug } = await params
  const store = loadStore()

  const listing = (store.listings || []).find(
    (l) => (l.slug === slug || l.id === slug || l.id === `lst_${slug}`) && isListingPublished(l)
  )

  if (!listing) {
    notFound()
  }

  const ent = resolveListingEntitlements(listing.id, store)
  const whatsappUrl = getListingWhatsAppUrl(listing.title, listing.id)

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* TOP NAVIGATION */}
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-xs">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold transition"
          >
            <ArrowLeft className="h-4 w-4" /> All Listings
          </Link>
          <span className="text-slate-400">Ref ID: {listing.id}</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-slate-200">
          {/* COVER PHOTO & BADGES */}
          <div className="relative h-64 sm:h-80 w-full bg-slate-900">
            <Image
              src={sanitizeImageUrl(listing.coverImage)}
              alt={listing.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-white/95 backdrop-blur-xs text-slate-900 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Verified Business
              </span>
              {ent.isFeatured ? (
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-white" />
                  Featured
                </span>
              ) : null}
              {ent.isPremium ? (
                <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-sm">
                  Premium
                </span>
              ) : null}
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-600 px-2 py-0.5 rounded">
                {listing.categoryName || 'Directory'}
              </span>
              <h1 className="text-xl sm:text-3xl font-black mt-2 leading-tight">
                {listing.title}
              </h1>
            </div>
          </div>

          {/* MAIN INFO & ACTION BAR */}
          <div className="p-6 sm:p-8">
            {/* ACTION BUTTONS (CALL & WHATSAPP) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6 border-b border-slate-100">
              <a
                href={`tel:${listing.phone}`}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-md"
              >
                <Phone className="h-4 w-4 text-blue-400" />
                Call Now ({listing.phone})
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-md"
              >
                <MessageCircle className="h-5 w-5" />
                Chat on WhatsApp (AI Auto-Reply)
              </a>
            </div>

            {/* DETAILS */}
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-base font-black text-slate-900 mb-2">About This Business</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {/* LOCATION & ADDRESS */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Address &amp; Location</h3>
                    <p className="text-xs text-slate-600 mt-1">{listing.address}</p>
                    {listing.villageName ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Area: {listing.villageName}, Choutuppal Mandal
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* PHOTO GALLERY */}
              {listing.gallery && listing.gallery.length > 0 ? (
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-3">📸 Photo Gallery</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {listing.gallery.map((img, i) => (
                      <div key={i} className="relative h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <Image src={sanitizeImageUrl(img)} alt={`${listing.title} ${i + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* WHATSAPP AUTOMATION INFO */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="font-extrabold text-xs text-emerald-950">
                      Automated 24/7 WhatsApp Response
                    </h4>
                    <p className="text-[11px] text-emerald-800">
                      Tapping WhatsApp connects you directly to our CRM flow with instant business details and photo cards.
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  Send Inquiry
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
