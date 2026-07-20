// ODG Service Worker — basic offline cache for the shell.
// Caches the home page + key static assets so the site loads
// even without a network connection (Progressive Web App).

const CACHE_NAME = "odg-v2"; // Bumped: old CSS chunks were stale after deploy
const PRECACHE_URLS = [
  "/",
  "/catalogue",
  "/contact",
  "/logo-odg.png",
  "/logo.jpg",
  "/favicon.jpg",
  "/manifest.json",
];

// Install: pre-cache the shell.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin GET, network fallback.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Don't intercept API calls or Next.js internals.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful same-origin responses.
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve the cached home page for navigations.
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Hors ligne", { status: 503, statusText: "Offline" });
        });
    })
  );
});
