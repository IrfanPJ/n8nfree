const CACHE_VERSION = "v1";
const STATIC_CACHE = `ht-crm-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ht-crm-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Install: cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Server actions / API: Network First, fall back to cache
// - Static assets (_next/static, fonts, images): Cache First
// - Navigation: Network First with offline fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Supabase calls, and Sentry tunnel
  if (
    request.method !== "GET" ||
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/monitoring")
  ) {
    return;
  }

  // Cache First for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Network First for everything else
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
