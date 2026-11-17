/* Service worker for the site (Ask231).
 *
 * Goals for Liberian mobile networks: open fast on weak data, keep working when the
 * connection drops, and never download the same photo twice.
 *
 * - App code (/assets/*, hashed by Vite): cache first, kept forever (file names change on release).
 * - Pages: network first, falling back to the saved app shell, then to /offline.html.
 * - Listing photos (/media/*): cache first, newest 250 kept (photo file names never change).
 * - Public listing data (categories, places, ads): network first, saved copy used when offline.
 *   Private data (messages, account, my ads, saved listings, staff) is never stored.
 * - Fonts: served from the cache, refreshed in the background.
 *
 * A new version waits until the app asks it to take over (the "Update available" prompt),
 * so a page never mixes old and new code.
 */
const VERSION = 'v1'
const SHELL = `md-shell-${VERSION}`
const ASSETS = 'md-assets'
const IMAGES = 'md-images'
const API = 'md-api'
const FONTS = 'md-fonts'
const KEEP = [SHELL, ASSETS, IMAGES, API, FONTS]
const SHELL_FILES = ['/', '/offline.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

const PUBLIC_API = [
  /^\/api\/market\/(categories|counties|towns)\/([^/]+\/)?$/,
  /^\/api\/market\/advertisements\/(popular\/|promoted\/)?$/,
  /^\/api\/market\/advertisements\/(?!mine\/)[^/]+\/$/,
]
const NOT_THE_APP = /^\/(api|admin|s|media|static|health)\//

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL)
    await shell.addAll(SHELL_FILES)
    // Save the app code the start page needs, so the very first visit already works offline.
    try {
      const html = await (await shell.match('/')).text()
      const files = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]))]
      await (await caches.open(ASSETS)).addAll(files)
    } catch { /* not fatal: assets are saved as they load */ }
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter(name => name.startsWith('md-') && !KEEP.includes(name)).map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
  if (event.data === 'CLEAR_USER_DATA') event.waitUntil(caches.delete(API))
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS))
    return
  }
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (NOT_THE_APP.test(url.pathname)) return
    event.respondWith(page(request))
    return
  }
  if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(request, ASSETS)); return }
  if (url.pathname.startsWith('/media/')) { event.respondWith(cacheFirst(request, IMAGES, 250)); return }
  if (PUBLIC_API.some(pattern => pattern.test(url.pathname))) { event.respondWith(networkFirst(request, API, 120)); return }
  if (SHELL_FILES.includes(url.pathname) || url.pathname.startsWith('/icons/')) { event.respondWith(staleWhileRevalidate(request, SHELL)) }
})

async function page(request) {
  const cache = await caches.open(SHELL)
  try {
    const response = await fetch(request)
    // Every route serves the same index.html; keep the latest copy as the offline shell.
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) cache.put('/', response.clone())
    return response
  } catch {
    return (await cache.match('/')) || (await cache.match('/offline.html')) || Response.error()
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone())
    if (maxEntries) trim(cache, maxEntries)
  }
  return response
}

async function networkFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) { await cache.put(request, response.clone()); trim(cache, maxEntries) }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const refresh = fetch(request).then(response => {
    if (response.ok || response.type === 'opaque') cache.put(request, response.clone())
    return response
  }).catch(() => cached)
  return cached || refresh
}

async function trim(cache, maxEntries) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i])
}
