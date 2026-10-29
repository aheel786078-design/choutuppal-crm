import type { MetadataRoute } from 'next'
import { loadStore, isListingPublished } from '@/lib/store'

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://choutuppal.in').replace(/\/$/, '')

export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/services`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/real-estate`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/shorts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/community`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  let dynamicRoutes: MetadataRoute.Sitemap = []

  try {
    const store = loadStore()
    const listings = (store.listings || [])
      .filter((l) => isListingPublished(l))
      .slice(0, 500)
      .map((l) => ({
      url: `${SITE_URL}/business/${l.slug || l.id}`,
      lastModified: new Date(l.updatedAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    const news = (store.news || []).slice(0, 100).map((n) => ({
      url: `${SITE_URL}/news/${n.slug || n.id}`,
      lastModified: new Date(n.createdAt || Date.now()),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

    dynamicRoutes = [...listings, ...news]
  } catch (err) {
    console.error('[Sitemap] Error reading store:', err)
  }

  return [...staticRoutes, ...dynamicRoutes]
}
