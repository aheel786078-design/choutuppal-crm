import { getHomePageData } from '@/lib/home-data'
import { Ticker } from '@/components/home/ticker'
import { StickySocials } from '@/components/home/sticky-socials'
import {
  StoriesRail,
  BannerCarousel,
  CategoriesGrid,
  FeaturedRail,
  RealEstateRail,
  NewsGrid,
  SendNewsCTA,
  BlogGrid,
  SpinWin,
  Testimonials,
  PricingPlans,
  CommunityHub,
} from '@/components/home/dynamic-wrappers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const data = await getHomePageData()

  // Format stories for StoriesRail
  const formattedStories = (data.stories || []).map((s: any) => ({
    id: s.id,
    mediaUrl: s.mediaUrl,
    mediaType: s.mediaType || 'IMAGE',
    caption: s.caption || null,
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
  const formattedBanners = (data.banners || []).map((b: any) => ({
    id: b.id,
    title: b.title || null,
    imageUrl: b.imageUrl,
    link: b.linkUrl || b.link || '/listings',
  }))

  // Format featured listings for FeaturedRail (with glowing badges and ratings)
  const formattedFeatured = (data.featured || []).map((l: any, i: number) => ({
    id: l.id,
    title: l.title,
    slug: l.slug || l.id,
    coverImage: l.coverImage || null,
    logo: l.logo || null,
    avgRating: l.avgRating ?? 4.8,
    views: l.views || 100 + i * 5,
    isFeatured: true,
    category: {
      name: l.categoryName || 'Business',
      slug: l.categoryId || 'business',
    },
    village: {
      name: l.address || l.villageName || 'Choutuppal',
      slug: 'choutuppal',
    },
  }))

  // Format real estate listings for RealEstateRail
  const formattedRealEstate = (data.realEstate || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug || p.id,
    coverImage: p.coverImage || null,
    price: typeof p.price === 'number' ? p.price : 2500000,
    type: p.propertyType || p.type || 'PLOT',
    listingType: p.listingType || 'SALE',
    bedrooms: p.bedrooms || null,
    areaSqft: p.areaSqft || 1800,
    village: {
      name: p.address || p.location || 'Choutuppal Highway',
      slug: 'choutuppal',
    },
  }))

  // Format news items for NewsGrid
  const formattedNews = (data.latestNews || []).map((n: any) => ({
    id: n.id,
    title: n.title,
    slug: n.slug || n.id,
    summary: n.summary || null,
    image: n.coverImage || n.imageUrl || null,
    createdAt: n.createdAt || new Date().toISOString(),
  }))

  // Format blog items for BlogGrid
  const formattedBlogs = (data.blogs || []).map((b: any) => ({
    id: b.id,
    title: b.title,
    slug: b.slug || b.id,
    excerpt: b.excerpt || null,
    coverImage: b.coverImage || null,
    createdAt: b.createdAt || new Date().toISOString(),
  }))

  // Ticker announcements
  const tickerAnnouncements =
    data.tickers && data.tickers.length > 0
      ? data.tickers.map((t: any) => t.text)
      : [
          '✨ చౌటుప్పల్ యాప్ 2.0 కి స్వాగతం! మన ఊరి సమగ్ర సమాచారం మీ చేతుల్లో.',
          '🚀 200+ వెరిఫైడ్ లోకల్ బిజినెస్ లు, రియల్ ఎస్టేట్ ఓపెన్ ప్లాట్లు & ఎమర్జెన్సీ సర్వీసెస్.',
          '📢 మీ వ్యాపారాన్ని చౌటుప్పల్ యాప్ లో లిస్ట్ చేయండి — వాట్సాప్ హెల్ప్‌లైన్: 9494348175.',
        ]

  const viewerInfo = { isLoggedIn: false, isPremium: false }

  return (
    <div className="flex min-h-screen flex-col">
      <Ticker initialAnnouncements={tickerAnnouncements} />
      <StickySocials />

      <main className="flex-1">
        {/* Semantic H1 for Lighthouse Accessibility & SEO */}
        <h1 className="sr-only">
          చౌటుప్పల్ లోకల్ బిజినెస్ డైరెక్టరీ, రియల్ ఎస్టేట్ &amp; సర్వీసెస్ — Choutuppal Local Business &amp; Community App
        </h1>

        <div className="mx-auto flex w-full overflow-visible max-w-7xl flex-col gap-6 sm:gap-7 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 relative z-20">
          {/* 1. Stories & Banners Glass Container */}
          <div className="relative w-full overflow-hidden bg-white/40 backdrop-blur-md rounded-[2rem] p-4 shadow-sm border border-white/50">
            <StoriesRail stories={formattedStories} viewer={viewerInfo} />
            <div className="mt-4">
              <BannerCarousel banners={formattedBanners} />
            </div>
          </div>

          {/* 2. Browse Categories */}
          <CategoriesGrid />

          {/* 3. Top Local Businesses Grid */}
          <FeaturedRail listings={formattedFeatured} />

          {/* 4. Premium Properties Grid */}
          <RealEstateRail properties={formattedRealEstate} />

          {/* 5. Latest News Section */}
          <NewsGrid articles={formattedNews} />

          {/* 6. Recent Blogs & Guides Section */}
          <BlogGrid blogs={formattedBlogs} />

          {/* 7. Send News CTA */}
          <SendNewsCTA />

          {/* 8. Spin & Win */}
          <div className="mt-2">
            <SpinWin />
          </div>

          {/* 9. Advertising & Monetization Section */}
          <div id="pricing" className="mt-8">
            <PricingPlans />
          </div>

          {/* 10. Opportunities & Community */}
          <CommunityHub />

          {/* 11. Reviews (Testimonials) */}
          <div className="mt-12">
            <Testimonials />
          </div>

          {/* Explore anchor target (mobile bottom nav) */}
          <div id="explore" className="scroll-mt-20" />
        </div>
      </main>

      {/* Bottom padding so content isn't hidden behind the mobile bottom nav */}
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  )
}
