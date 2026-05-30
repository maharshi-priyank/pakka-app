/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/info" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ─── Precache app shell ────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA fallback — every navigation that isn't a public/portal page returns index.html
const navDenylist = [
  /^\/api/,
  /^\/portal\//,
  /^\/p\//,
  /^\/sign\//,
  /^\/invoice\//,
  /^\/q\//,
]
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      const cache = await caches.open('workbox-precache-v2-' + self.registration.scope)
      const response = await cache.match('/index.html')
      return response ?? fetch((event as FetchEvent).request)
    },
    { denylist: navDenylist },
  ),
)

// ─── Runtime caching ───────────────────────────────────────────────────────────

registerRoute(
  ({ request }) => ['style', 'script', 'worker', 'font'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'app-shell',
    plugins:   [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins:   [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'gfonts-css' }),
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gfonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }),
    ],
  }),
)

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ─── Push notifications ────────────────────────────────────────────────────────

interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
  type?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = { title: 'Rupway', body: event.data.text() }
  }

  const { title, body, url = '/app/dashboard', tag, type } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon:   '/pwa-192x192.png',
      badge:  '/pwa-64x64.png',
      data:   { url, type },
      requireInteraction: false,
      silent: false,
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data?.url as string) ?? '/app/dashboard'

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // If an existing tab is already on the target URL, focus it
      for (const client of all) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise focus any open tab and navigate it
      for (const client of all) {
        if ('navigate' in client && 'focus' in client) {
          await client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Fallback — open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
