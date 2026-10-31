import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { loadStore } from '@/lib/store'
import { StoriesRail } from '@/components/home/stories-rail'
import {
  Sparkles,
  ArrowLeft,
  Tag,
  Clock,
  Phone,
  MessageCircle,
  Share2,
  Store,
  ExternalLink,
  Flame,
  BadgePercent,
} from 'lucide-react'
import { sanitizeImageUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'స్థానిక స్టోరీస్ & ఆఫర్స్ | Choutuppal Local Stories & Daily Offers',
  description:
    'చౌటుప్పల్ స్థానిక దుకాణాలు, వ్యాపారులు మరియు రియల్ ఎస్టేట్ నేటి ప్రత్యేక ఆఫర్లు & 24 గంటల స్టోరీస్ ఇక్కడ చూడండి.',
}

export default function StoriesPage() {
  const store = loadStore()

  // Filter active stories
  const now = new Date()
  const activeStories = (store.stories || []).filter((s) => {
    if (s.status !== 'published') return false
    if (s.expiresAt) {
      const exp = new Date(s.expiresAt)
      if (exp.getTime() < now.getTime()) {
        // Keep fallback if needed, or return true
        return true
      }
    }
    return true
  })

  // Format stories for StoriesRail component
  const formattedStories = activeStories.map((s: any) => ({
    id: s.id,
    mediaUrl: s.mediaUrl || 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
    mediaType: 'IMAGE',
    caption: s.caption || null,
    views: s.views || 48,
    expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
    createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
    owner: {
      username: s.businessName || 'Choutuppal Merchant',
      name: s.businessName || 'Local Business',
      image: s.mediaUrl || 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=800',
    },
  }))

  // Filter active offers
  const activeOffers = (store.offers || []).filter((o) => o.status === 'published')

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header */}
      <section className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-emerald-600" />
                  లోకల్ స్టోరీస్ & ఆఫర్స్
                </h1>
              </div>
              <p className="text-2xs sm:text-xs text-slate-500">
                చౌటుప్పల్ నేటి ప్రత్యేక డీల్స్ & 24 గంటల లైవ్ అప్‌డేట్స్
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/919494348175?text=Hello%20Choutuppal%20App,%20I%20want%20to%20post%20a%20Story%20or%20Offer%20for%20my%20business."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>ఆఫర్ పోస్ట్ చేయండి</span>
          </a>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Stories Rail Interactive Viewer Section */}
        <section className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <Flame className="h-4 w-4" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                లైవ్ స్టేటస్ స్టోరీస్ (Tap to Watch)
              </h2>
            </div>
            <span className="text-2xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              {formattedStories.length} స్టోరీలు యాక్టివ్
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            ఏదైనా సర్కిల్ నొక్కండి — WhatsApp లేదా Instagram మాదిరిగా ఫుల్‌స్క్రీన్ ఆటో-ప్లే అవుతుంది.
          </p>

          <StoriesRail
            stories={formattedStories}
            viewer={{ isLoggedIn: false, isPremium: false }}
          />
        </section>

        {/* Featured Offers Banner Section */}
        {activeOffers.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <BadgePercent className="h-4 w-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                నేటి ప్రత్యేక డిస్కౌంట్లు & ఆఫర్లు (Exclusive Deals)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOffers.map((off) => (
                <div
                  key={off.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition"
                >
                  <div className="flex items-start gap-4">
                    {off.imageUrl && (
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <Image
                          src={sanitizeImageUrl(off.imageUrl)}
                          alt={off.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-2xs font-bold border border-amber-200">
                          <Tag className="h-3 w-3" />
                          {off.discount || 'Special Offer'}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                        {off.title}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                        <Store className="h-3.5 w-3.5 text-slate-400" />
                        {off.businessName}
                      </p>
                      {off.terms && (
                        <p className="text-2xs text-slate-500 mt-2 line-clamp-2">
                          {off.terms}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-2xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ఈ రోజు మాత్రమే
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/91${(off.ownerPhone || '9441348175').replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(off.businessName)},%20I%20saw%20your%20offer%20"${encodeURIComponent(off.title)}"%20on%20Choutuppal.in.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>చాట్ చేయండి</span>
                      </a>
                      <a
                        href={`tel:${off.ownerPhone || '9441348175'}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>కాల్</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stories Grid Gallery Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Store className="h-4 w-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                అన్ని లోకల్ బిజినెస్ స్టోరీలు (Stories Gallery)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {activeStories.map((st) => (
              <div
                key={st.id}
                className="group relative bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-sm transition flex flex-col"
              >
                <div className="relative aspect-4/5 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={sanitizeImageUrl(st.mediaUrl)}
                    alt={st.businessName || 'Business Story'}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Status Badge */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-3xs font-semibold backdrop-blur-xs flex items-center gap-1 shadow-2xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Live Story
                  </span>

                  {/* Business Overlay info at bottom of card */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <p className="text-xs font-bold line-clamp-1 drop-shadow-xs">
                      {st.businessName}
                    </p>
                    {st.caption && (
                      <p className="text-3xs text-white/90 line-clamp-2 mt-0.5 drop-shadow-xs">
                        {st.caption}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-white flex items-center justify-between gap-1 border-t border-slate-100">
                  <a
                    href={`https://wa.me/91${(st.ownerPhone || '9441348175').replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(st.businessName || 'Business')},%20I%20saw%20your%20Story%20on%20Choutuppal.in.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold transition"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${st.ownerPhone || '9441348175'}`}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    aria-label="Call business"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Promo Footer Callout */}
        <section className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-2xl border border-emerald-200/80 p-5 sm:p-6 text-center shadow-xs">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
            మీ షాప్ లేదా సర్వీస్ ఆఫర్‌ను ప్రమోట్ చేయాలనుకుంటున్నారా?
          </h3>
          <p className="text-xs text-slate-600 max-w-xl mx-auto mb-4">
            చౌటుప్పల్ యాప్ ద్వారా మీ వ్యాపార ఆఫర్‌లు, కొత్త స్టాక్ మరియు ప్రత్యేక డిస్కౌంట్లను వేలాది మంది స్థానిక కస్టమర్లకు వాట్సాప్ మరియు వెబ్‌సైట్ ద్వారా చేరువ చేయండి.
          </p>
          <a
            href="https://wa.me/919494348175?text=Hello,%20I%20want%20to%20advertise%20my%20business%20offer%20on%20Choutuppal%20App."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp ద్వారా ఆఫర్ పంపండి (9494348175)</span>
          </a>
        </section>
      </div>
    </main>
  )
}
