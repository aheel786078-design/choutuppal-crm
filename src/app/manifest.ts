import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Choutuppal App',
    short_name: 'Choutuppal',
    description: 'Businesses, services, real estate, news & community for Choutuppal, Yadadri, Telangana.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d4ed8',
    orientation: 'portrait',
    icons: [
      {
        src: 'https://i.ibb.co/rGwMGrby/logo-pwa-20260922-131108-0000.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://i.ibb.co/rGwMGrby/logo-pwa-20260922-131108-0000.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://i.ibb.co/rGwMGrby/logo-pwa-20260922-131108-0000.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
