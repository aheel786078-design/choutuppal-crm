import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'చౌటుప్పల్ యాప్ | Choutuppal App',
    short_name: 'చౌటుప్పల్',
    description: 'Businesses, services, real estate, jobs, news & community for Choutuppal, Yadadri, Telangana.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/choutuppal-favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/assets/choutuppal-app-logo.jpg',
        sizes: '2000x2000',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
  }
}
