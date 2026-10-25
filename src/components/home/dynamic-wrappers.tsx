'use client'

import nextDynamic from 'next/dynamic'

// Direct components for Above-the-fold critical viewport
export { StoriesRail } from '@/components/home/stories-rail'
export { BannerCarousel } from '@/components/home/banner-carousel'
export { CategoriesGrid } from '@/components/home/categories-grid'
export { FeaturedRail } from '@/components/home/featured-rail'

// Dynamic components for below-the-fold content (Splits JS chunks to save ~35 KiB on initial render)
export const RealEstateRail = nextDynamic(
  () => import('@/components/home/real-estate-rail').then((m) => ({ default: m.RealEstateRail })),
  { ssr: true }
)
export const NewsGrid = nextDynamic(
  () => import('@/components/home/news-grid').then((m) => ({ default: m.NewsGrid })),
  { ssr: true }
)
export const SendNewsCTA = nextDynamic(
  () => import('@/components/home/send-news-cta').then((m) => ({ default: m.SendNewsCTA })),
  { ssr: true }
)
export const BlogGrid = nextDynamic(
  () => import('@/components/home/blog-grid').then((m) => ({ default: m.BlogGrid })),
  { ssr: true }
)

// Lazy-loaded components for below-the-fold heavy interactive widgets
const LazySkeleton = () => <div className="h-48 w-full rounded-2xl bg-slate-100/60 animate-pulse my-4" />

export const SpinWin = nextDynamic(
  () => import('@/components/home/spin-win').then((m) => ({ default: m.SpinWin })),
  { ssr: false, loading: LazySkeleton }
)
export const Testimonials = nextDynamic(
  () => import('@/components/home/testimonials').then((m) => ({ default: m.Testimonials })),
  { ssr: false, loading: LazySkeleton }
)
export const PricingPlans = nextDynamic(
  () => import('@/components/home/pricing-plans').then((m) => ({ default: m.PricingPlans })),
  { ssr: false, loading: LazySkeleton }
)
export const CommunityHub = nextDynamic(
  () => import('@/components/home/community-hub').then((m) => ({ default: m.CommunityHub })),
  { ssr: false, loading: LazySkeleton }
)
