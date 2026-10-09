const CACHE_NAME = 'agrisense-edge-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/telemetry_mock.json',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone())
              })
            }
          })
          .catch(() => {
            /* Offline fallback active */
          })
        return cachedResponse
      }
      return fetch(event.request).catch(() => {
        if (event.request.url.includes('/telemetry_mock.json')) {
          return caches.match('/telemetry_mock.json')
        }
        return caches.match('/')
      })
    })
  )
})
