import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'చౌటుప్పల్ యాప్ | Choutuppal App',
    short_name: 'చౌటుప్పల్',
    description: 'చౌటుప్పల్ అధికారిక లోకల్ యాప్ — వ్యాపారాలు, అత్యవసర సేవలు, రియల్ ఎస్టేట్ & కమ్యూనిటీ.',
    start_url: '/?source=pwa',
    id: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'window-controls-overlay'] as any,
    background_color: '#FFFFFF',
    theme_color: '#094AA8',
    orientation: 'portrait',
    categories: ['business', 'shopping', 'lifestyle', 'news'],
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
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/assets/choutuppal-favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/assets/choutuppal-app-logo.jpg',
        sizes: '2000x2000',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'స్థానిక వ్యాపారాలు & షాపులు (Directory)',
        short_name: 'డైరెక్టరీ',
        description: 'చౌటుప్పల్ 200+ లోకల్ షాపులు & కాంటాక్టులు',
        url: '/listings?source=pwa_shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: '24/7 అత్యవసర సేవలు (Emergency 108/100)',
        short_name: 'అత్యవసరం',
        description: 'పోలీస్, హాస్పిటల్, అంబులెన్స్ హెల్ప్‌లైన్లు',
        url: '/govt?source=pwa_shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'నేటి ఆఫర్లు & డీల్స్ (Offers & Deals)',
        short_name: 'ఆఫర్లు',
        description: 'స్థానిక దుకాణాల రాయితీలు & వీడియో స్టోరీలు',
        url: '/stories?source=pwa_shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'రియల్ ఎస్టేట్ & ప్లాట్లు (Real Estate Hub)',
        short_name: 'రియల్ ఎస్టేట్',
        description: 'ధృవీకరించబడిన ఓపెన్ ప్లాట్లు & భూముల వివరాలు',
        url: '/listings?category=real-estate&source=pwa_shortcut',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
