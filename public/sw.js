// Choutuppal App Progressive Web App (PWA) Service Worker v5.0
// High-performance intelligent offline caching, image persistence & resilient fallback

const CACHE_NAME = 'choutuppal-app-shell-v5'
const IMAGE_CACHE = 'choutuppal-images-v5'
const DATA_CACHE = 'choutuppal-data-v5'

const STATIC_PRECACHE = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/manifest.json',
  '/assets/choutuppal-favicon.png',
  '/assets/choutuppal-app-logo.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]

// 1. Install Event: Pre-cache core shell & offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_PRECACHE).catch((err) => {
          console.warn('[PWA SW] Pre-cache partial warning:', err)
        })
      })
      .then(() => self.skipWaiting())
  )
})

// 2. Activate Event: Clean up legacy caches & take immediate control
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, IMAGE_CACHE, DATA_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      })
      .then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Multi-tier caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests from http/https
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Skip dynamic auth and administrative mutations
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/whatsapp/webhook') ||
    url.pathname.includes('/wp-admin')
  ) {
    return
  }

  // Tier 1: Static scripts, stylesheets, and fonts (Stale-While-Revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // Tier 2: Images, Photos & Media (Cache-First — avoids repeated downloads!)
  const isImageOrMedia =
    request.destination === 'image' ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('r2.cloudflarestorage.com') ||
    url.hostname.includes('images.unsplash.com') ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico|avif)(\?.*)?$/i.test(url.pathname)

  if (isImageOrMedia) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached photo immediately; revalidate in background if stale
            fetch(request)
              .then((fresh) => {
                if (fresh && fresh.status === 200) {
                  cache.put(request, fresh.clone())
                }
              })
              .catch(() => {})
            return cachedResponse
          }

          // Not in cache: fetch from network, then store in cache
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone())
              }
              return networkResponse
            })
            .catch(() => {
              // Fallback to placeholder if offline and image missing
              return caches.match('/assets/choutuppal-favicon.png')
            })
        })
      })
    )
    return
  }

  // Tier 3: HTML Page Navigation (Network-First with Cache Fallback -> Offline Page)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return networkResponse
        })
        .catch(async () => {
          // Check if this specific route was cached previously
          const cachedRoute = await caches.match(request)
          if (cachedRoute) return cachedRoute

          // Fallback to cached home page
          const cachedHome = await caches.match('/')
          if (cachedHome) return cachedHome

          // Fallback to dedicated offline cache dashboard
          const offlineFallback = await caches.match('/offline')
          return offlineFallback || new Response('Offline - చౌటుప్పల్ యాప్', { headers: { 'Content-Type': 'text/plain' } })
        })
    )
    return
  }

  // Tier 4: Read-Only Public Directory APIs (Network-First with Data Cache Fallback)
  if (url.pathname.startsWith('/api/listings') || url.pathname.startsWith('/api/stories')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone()
            caches.open(DATA_CACHE).then((cache) => cache.put(request, clone))
          }
          return networkResponse
        })
        .catch(() => {
          return caches.match(request)
        })
    )
    return
  }
})
