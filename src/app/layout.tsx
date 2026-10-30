import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster as SonnerToaster } from 'sonner'
import { Providers } from '@/components/providers'
import { SiteHeader } from '@/components/home/site-header'
import { SiteFooter } from '@/components/home/site-footer'
import { BottomNav } from '@/components/home/bottom-nav'
import { WhatsAppFloat } from '@/components/home/whatsapp-float'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://choutuppal.in'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Choutuppal App v2.0 — Business, Real Estate & Community',
    template: '%s | Choutuppal App',
  },
  description:
    'Discover businesses, services, real estate, news and community in Choutuppal, Yadadri Bhuvanagiri, Telangana. Promote your business, list properties, and connect locally.',
  keywords: [
    'Choutuppal',
    'Yadadri',
    'Telangana business',
    'real estate Choutuppal',
    'local services',
    'community',
  ],
  authors: [{ name: 'Choutuppal App Team' }],
  icons: {
    icon: 'https://i.ibb.co/NgtRxPLw/Untitled-design.jpg',
    apple: 'https://i.ibb.co/NgtRxPLw/Untitled-design.jpg',
  },
  openGraph: {
    title: 'Choutuppal App v2.0 — Business, Real Estate & Community',
    description:
      'Businesses, services, real estate, news & community for Choutuppal, Yadadri, Telangana.',
    url: SITE_URL,
    siteName: 'Choutuppal App',
    images: [
      {
        url: 'https://i.ibb.co/NgtRxPLw/Untitled-design.jpg',
        width: 1200,
        height: 630,
        alt: 'Choutuppal App v2.0',
      },
    ],
    type: 'website',
    locale: 'te_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Choutuppal App v2.0',
    description:
      'Businesses, services, real estate, news & community for Choutuppal, Yadadri, Telangana.',
    images: ['https://i.ibb.co/NgtRxPLw/Untitled-design.jpg'],
  },
}

export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="te" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans">
        <Providers>
          <SiteHeader />
          <div className="flex-1 pb-16 md:pb-0">
            {children}
          </div>
          <SiteFooter />
          <BottomNav />
          <WhatsAppFloat />
          <SonnerToaster position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
