// Choutuppal App Service Worker (v2.0)
// High-performance caching for mobile phones & offline resilience

const CACHE_NAME = 'choutuppal-cache-v3'
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
]

// 1. Install: Pre-cache critical core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Pre-cache partial fail:', err)
        })
      })
      .then(() => self.skipWaiting())
  )
})

// 2. Activate: Clean up any old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      })
      .then(() => self.clients.claim())
  )
})

// 3. Fetch strategy:
// - Static assets (JS, CSS, fonts, images, webp, png, svg): Stale-While-Revalidate (instant loading from phone disk cache)
// - Navigation & HTML pages (including /business/*): Network-first with Cache fallback (ensures fresh data, works offline)
// - API & Next-Auth requests: Network only
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests or browser extension/cross-origin calls
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Skip auth, analytics, and non-GET APIs
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/user') ||
    url.pathname.includes('/wp-admin')
  ) {
    return
  }

  // A. Static Assets: Scripts, styles, fonts, and images (Stale-While-Revalidate)
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg')

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // B. HTML Navigation / Page Routes (Network-First with Cache Fallback)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse
            // Fallback to cached home page if page not in cache
            return caches.match('/')
          })
        })
    )
    return
  }
})
