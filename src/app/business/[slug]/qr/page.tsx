import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadStore } from '@/lib/store'
import { ShopQrStandee } from '@/components/business/shop-qr-standee'

export const dynamic = 'force-dynamic'

interface BusinessQrPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: BusinessQrPageProps): Promise<Metadata> {
  const { slug } = await params
  const store = loadStore()
  const listing = (store.listings || []).find(
    (l) => l.slug === slug || l.id === slug || l.id === `lst_${slug}`
  )

  if (!listing) {
    return {
      title: 'QR Code Not Found | Choutuppal.in',
    }
  }

  return {
    title: `${listing.title} — షాప్ కౌంటర్ QR స్టాండీ | Choutuppal.in`,
    description: `${listing.title} అధికారిక చౌటుప్పల్ యాప్ కౌంటర్ QR స్టాండీ పోస్టర్. A4 సైజులో ప్రింట్ తీసి మీ షాప్ కౌంటర్‌పై పెట్టండి.`,
  }
}

export default async function BusinessQrPage({ params }: BusinessQrPageProps) {
  const { slug } = await params
  const store = loadStore()

  const listing = (store.listings || []).find(
    (l) => l.slug === slug || l.id === slug || l.id === `lst_${slug}`
  )

  if (!listing) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0 print:m-0">
      <ShopQrStandee listing={listing} isStandalonePage={true} />
    </main>
  )
}
