import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadStore, isListingPublished } from '@/lib/store'
import { resolveListingEntitlements } from '@/lib/entitlement-resolver'
import { ListingDetailView } from '@/components/business/listing-detail-view'

export const dynamic = 'force-dynamic'

interface ListingPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const store = loadStore()
  const listing = (store.listings || []).find(
    (l) => (l.slug === slug || l.id === slug || l.id === `lst_${slug}`) && isListingPublished(l)
  )

  if (!listing) {
    return {
      title: 'Listing Not Found | Choutuppal.in',
    }
  }

  return {
    title: `${listing.title} | Choutuppal Directory`,
    description:
      listing.description?.slice(0, 160) ||
      `Contact details, phone number, address, and verified services for ${listing.title} in Choutuppal.`,
    openGraph: {
      title: `${listing.title} | Choutuppal Directory`,
      description:
        listing.description?.slice(0, 160) ||
        `Verified listing on Choutuppal App.`,
      images: listing.coverImage ? [listing.coverImage] : [],
    },
  }
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
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
