const CACHE_NAME = "financeapp-v1";

const STATIC_PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install: pre-cache critical shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PRECACHE))
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   - API / Supabase calls → network only, never cache
//   - Static assets (JS, CSS, fonts, images) → cache first, fallback network + update cache
//   - Navigation requests → network first, fallback cached index.html (SPA offline shell)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache: API endpoints, Supabase, analytics, external POST/PUT/DELETE
  const isApi =
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    request.method !== "GET";

  if (isApi) {
    event.respondWith(fetch(request));
    return;
  }

  // Static asset: cache first
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|otf|webp)$/) != null;

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Navigation: network first, SPA fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match("/index.html").then((r) => r ?? fetch(request))
    )
  );
});
