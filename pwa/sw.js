/* Družina service worker. The build stamps BUILD_ID, so every deploy is a new worker and a fresh cache.
 * Pages always come from the network first, so a reload always gets the newest version;
 * the cache is only there so the app still opens on a bad connection. */
const BUILD_ID = '__BUILD_ID__'
const CACHE = `druzina-${BUILD_ID}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './manifest.webmanifest', './apple-touch-icon.png', './favicon.svg']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('druzina-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  // Firebase, fonts and anything else off-site go straight to the network.
  if (req.method !== 'GET' || url.origin !== location.origin) return
  // The version check must always see the live file.
  if (url.pathname.endsWith('/version.json')) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./', copy))
          return res
        })
        .catch(() => caches.match('./').then((r) => r ?? Response.error())),
    )
    return
  }

  // Built files have the content hash in their name, so a cached copy is never stale.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
