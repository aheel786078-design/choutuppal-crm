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
    default: 'Choutuppal.in — Mana Choutuppal Local Search & WhatsApp Super App',
    template: '%s | Choutuppal.in',
  },
  description:
    'Discover 200+ verified businesses, real estate plots, 24/7 taxi & auto services, emergency plumbers, electricians, local news and community updates in Choutuppal, Telangana.',
  keywords: [
    'Choutuppal',
    'Choutuppal Business',
    'Choutuppal Real Estate',
    'Choutuppal Taxi Service',
    'Choutuppal Auto Stand',
    'Choutuppal Plumber',
    'Yadadri Bhuvanagiri',
    'Telangana Local App',
  ],
  authors: [{ name: 'Choutuppal App Team' }],
  icons: {
    icon: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=100&auto=format&fit=crop&q=80',
    apple: 'https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?w=100&auto=format&fit=crop&q=80',
  },
  openGraph: {
    title: 'Choutuppal.in — Local Search, Services & WhatsApp CRM',
    description: 'Businesses, real estate, taxi, auto, plumber, news & community in Choutuppal.',
    url: SITE_URL,
    siteName: 'Choutuppal.in',
    type: 'website',
    locale: 'te_IN',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
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
