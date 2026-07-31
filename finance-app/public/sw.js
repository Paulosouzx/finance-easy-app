const CACHE_NAME = "financeapp-v5";

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
//   - API / Supabase calls → not intercepted at all, browser handles the request directly
//   - Static assets (JS, CSS, fonts, images) → cache first, fallback network + update cache
//   - Navigation requests → network first, fallback cached index.html (SPA offline shell)
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never touch: API endpoints, Supabase, analytics, external POST/PATCH/PUT/DELETE.
  // Re-issuing a cross-origin, preflighted request via fetch(request) inside the SW
  // breaks the CORS preflight in Chrome (bugs.chromium.org/p/chromium/issues/detail?id=1224423),
  // so these requests must fall through to the browser's native network handling untouched.
  const isApi =
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    request.method !== "GET";

  if (isApi) {
    return;
  }

  // Static asset: stale-while-revalidate — respond instantly from cache when available,
  // but always refetch in the background so a new deploy (new icons, new bundle) is
  // picked up on the *next* load instead of being stuck forever behind a cache-first hit.
  const isStaticAsset =
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|otf|webp)$/) != null;

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? networkFetch;
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
