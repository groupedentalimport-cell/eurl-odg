// ODG Service Worker — network-first for HTML, cache-first for hashed assets.
//
// CRITICAL FIX: the previous version was cache-first for navigations, which
// meant that after every deploy, returning visitors kept getting the OLD
// index.html from cache. That old HTML referenced OLD chunk hashes (e.g.
// /_next/static/chunks/ed68c4ee2eba89c2.js) that no longer existed on the
// server, causing 404s and ChunkLoadError.
//
// New strategy:
//   - Navigations (HTML pages) → NETWORK-FIRST, fallback to cache when offline.
//     This ensures visitors always see the latest deploy.
//   - Hashed static assets (/_next/static/*, images, fonts) → CACHE-FIRST.
//     These are immutable (filename includes content hash), so cached copies
//     are always valid. New deploys generate new filenames → new fetches.
//   - API calls → NEVER cached, always go to network.
//   - Cross-origin requests → BYPASS cache.
//
// The cache name is bumped on every meaningful change so activate() purges
// everything from the previous version.

const CACHE_NAME = "odg-v3-network-first";
const OFFLINE_FALLBACK = "/";

// Self-install: skip waiting so a new SW takes over immediately.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate: purge ALL previous caches (any name != CACHE_NAME) and take
// control of all open clients without waiting for reload.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch handler — split by request type.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls.
  if (url.pathname.startsWith("/api/")) return;

  // Never intercept admin or portal — they need fresh data.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/portal")
  ) {
    return;
  }

  // === NAVIGATIONS (HTML pages) — NETWORK-FIRST ===
  // Always try the network first so the visitor sees the latest deploy.
  // Fall back to cache when offline. If both fail, serve the cached home
  // page so the user at least sees something.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML for offline use.
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match(OFFLINE_FALLBACK) ||
              new Response("Hors ligne — reconnectez-vous pour accéder au site.", {
                status: 503,
                statusText: "Offline",
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
          )
        )
    );
    return;
  }

  // === HASHED STATIC ASSETS — CACHE-FIRST ===
  // Next.js chunks under /_next/static/ are content-hashed: a given filename
  // always points to the same content. Safe to cache aggressively.
  // Images, fonts, and other static assets follow the same rule.
  const isImmutableAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|css|js|json|wasm)$/i.test(
      url.pathname
    );

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => cached || Response.error());
      })
    );
    return;
  }

  // === EVERYTHING ELSE — STALE-WHILE-REVALIDATE ===
  // Serve from cache immediately if available, fetch in background to update.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
