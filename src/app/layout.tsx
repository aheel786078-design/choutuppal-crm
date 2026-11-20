import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster as SonnerToaster } from 'sonner'
import { Providers } from '@/components/providers'
import { SiteHeader } from '@/components/home/site-header'
import { SiteFooter } from '@/components/home/site-footer'
import { BottomNav } from '@/components/home/bottom-nav'
import { WhatsAppFloat } from '@/components/home/whatsapp-float'
import { PWAController } from '@/components/pwa/pwa-controller'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://choutuppal.in'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'చౌటుప్పల్ యాప్ | Choutuppal SuperApp — Business, Real Estate & Community',
    template: '%s | చౌటుప్పల్ యాప్ (Choutuppal App)',
  },
  description:
    'Discover businesses, services, real estate, jobs, news and local community in Choutuppal, Yadadri Bhuvanagiri, Telangana. చౌటుప్పల్ లోకల్ సూపర్ యాప్.',
  keywords: [
    'Choutuppal',
    'చౌటుప్పల్',
    'Yadadri Bhuvanagiri',
    'Telangana business',
    'real estate Choutuppal',
    'local services',
    'community',
    'WhatsApp SuperApp',
  ],
  authors: [{ name: 'Choutuppal App Team' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/assets/choutuppal-favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'చౌటుప్పల్ యాప్ | Choutuppal SuperApp — Business, Real Estate & Community',
    description:
      'Businesses, services, real estate, jobs, news & community for Choutuppal, Yadadri, Telangana.',
    url: SITE_URL,
    siteName: 'చౌటుప్పల్ యాప్ | Choutuppal App',
    images: [
      {
        url: 'https://choutuppal.in/assets/choutuppal-app-banner.jpg',
        width: 1138,
        height: 640,
        alt: 'చౌటుప్పల్ యాప్ | Choutuppal SuperApp',
      },
    ],
    type: 'website',
    locale: 'te_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'చౌటుప్పల్ యాప్ | Choutuppal SuperApp',
    description:
      'Businesses, services, real estate, jobs, news & community for Choutuppal, Yadadri, Telangana.',
    images: ['https://choutuppal.in/assets/choutuppal-app-banner.jpg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'చౌటుప్పల్ యాప్',
  },
  applicationName: 'చౌటుప్పల్ యాప్',
  formatDetection: {
    telephone: true,
  },
}

export const viewport: Viewport = {
  themeColor: '#094AA8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="te" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/assets/choutuppal-favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
          <PWAController />
          <SonnerToaster position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
