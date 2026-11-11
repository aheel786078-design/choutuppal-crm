import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadStore, isListingPublished } from '@/lib/store'
import { resolveListingEntitlements } from '@/lib/entitlement-resolver'
import { ListingDetailView } from '@/components/business/listing-detail-view'
import { getBaseUrl, getListingSlug } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface ListingPageProps {
  params: Promise<{
    slug: string
  }>
}

function findMatchingListing(listings: any[], slugParam: string) {
  const cleanParam = decodeURIComponent(slugParam).toLowerCase().trim()
  return (listings || []).find((l) => {
    if (!isListingPublished(l)) return false
    const lSlug = (l.slug || '').toLowerCase().trim()
    const lId = (l.id || '').toLowerCase().trim()
    const genSlug = getListingSlug(l).toLowerCase()
    return (
      lSlug === cleanParam ||
      lId === cleanParam ||
      lId === `lst_${cleanParam}` ||
      genSlug === cleanParam ||
      l.title.toLowerCase().trim() === cleanParam
    )
  })
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const store = loadStore()
  const listing = findMatchingListing(store.listings, slug)

  if (!listing) {
    return {
      title: 'Listing Not Found | Choutuppal.in',
    }
  }

  const baseUrl = getBaseUrl()
  const fallbackImage =
    'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=1200&h=630&q=80'
  let rawImage = listing.coverImage || listing.logo || fallbackImage
  if (rawImage.includes('unsplash.com') && !rawImage.includes('w=1200')) {
    rawImage = `${rawImage.split('?')[0]}?auto=format&fit=crop&w=1200&h=630&q=80`
  }
  const coverUrl = rawImage.startsWith('http')
    ? rawImage
    : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`

  const actualSlug = getListingSlug(listing)
  const pageUrl = `${baseUrl}/business/${actualSlug}`
  const shortDesc = listing.description
    ? `${listing.description.slice(0, 140)}...`
    : `${listing.title} — చౌటుప్పల్ అధికారిక డైరెక్టరీలో వెరిఫైడ్ వ్యాపారం.`
  const whatsappPreviewDesc = `${shortDesc} 📞 ఫోన్: ${listing.phone || '9441348175'} | 📍 ${listing.address || listing.villageName || 'చౌటుప్పల్, తెలంగాణ'}`

  return {
    title: `${listing.title} — చౌటుప్పల్ బిజినెస్ డైరెక్టరీ | Choutuppal.in`,
    description: whatsappPreviewDesc,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${listing.title} (చౌటుప్పల్)`,
      description: whatsappPreviewDesc,
      url: pageUrl,
      siteName: 'చౌటుప్పల్ యాప్ · Choutuppal.in',
      locale: 'te_IN',
      type: 'website',
      images: [
        {
          url: coverUrl,
          secureUrl: coverUrl,
          width: 1200,
          height: 630,
          alt: `${listing.title} - Choutuppal`,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${listing.title} (చౌటుప్పల్)`,
      description: whatsappPreviewDesc,
      images: [coverUrl],
    },
  }
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { slug } = await params
  const store = loadStore()
  const listing = findMatchingListing(store.listings, slug)

  if (!listing) {
    notFound()
  }

  const entitlements = resolveListingEntitlements(listing.id, store)
  const relatedListings = (store.listings || [])
    .filter(
      (l) =>
        l.id !== listing.id &&
        isListingPublished(l) &&
        (l.categoryId === listing.categoryId || l.categoryName === listing.categoryName)
    )
    .slice(0, 4)

  return (
    <ListingDetailView
      listing={listing}
      entitlements={entitlements}
      relatedListings={relatedListings}
    />
  )
}
