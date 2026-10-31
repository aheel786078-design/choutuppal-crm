import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadStore, isListingPublished } from '@/lib/store'
import { resolveListingEntitlements } from '@/lib/entitlement-resolver'
import { ListingDetailView } from '@/components/business/listing-detail-view'

export const dynamic = 'force-dynamic'

interface BusinessPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { slug } = await params
  const store = loadStore()
  const listing = (store.listings || []).find(
    (l) => (l.slug === slug || l.id === slug || l.id === `lst_${slug}`) && isListingPublished(l)
  )

  if (!listing) {
    return {
      title: 'Business Not Found | Choutuppal.in',
    }
  }

  const fallbackImage =
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'
  const rawImage = listing.coverImage || listing.logo || fallbackImage
  const coverUrl = rawImage.startsWith('http')
    ? rawImage
    : `https://choutuppal.in${rawImage.startsWith('/') ? '' : '/'}${rawImage}`

  const pageUrl = `https://choutuppal.in/business/${listing.slug || listing.id}`
  const shortDesc = listing.description
    ? `${listing.description.slice(0, 140)}...`
    : `${listing.title} — చౌటుప్పల్ అధికారిక డైరెక్టరీలో వెరిఫైడ్ వ్యాపారం.`
  const whatsappPreviewDesc = `${shortDesc} 📞 ఫోన్: ${listing.phone || '9441348175'} | 📍 ${listing.villageName || 'చౌటుప్పల్, తెలంగాణ'}`

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
      siteName: 'చౌటుప్పల్ యాప్ | Choutuppal.in',
      locale: 'te_IN',
      type: 'website',
      images: [
        {
          url: coverUrl,
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

export default async function BusinessDetailPage({ params }: BusinessPageProps) {
  const { slug } = await params
  const store = loadStore()

  const listing = (store.listings || []).find(
    (l) => (l.slug === slug || l.id === slug || l.id === `lst_${slug}`) && isListingPublished(l)
  )

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
