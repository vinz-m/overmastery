/* global caches */

const CACHE_PREFIX = "overmastery-";
const STATIC_CACHE = `${CACHE_PREFIX}static-v2`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-v1`;
// Each deploy adds new hashed /_next/static files; keep only the most recent
// ones so the cache doesn't grow forever. Old entries are only ever needed by
// a page that was open before the deploy.
const RUNTIME_CACHE_LIMIT = 150;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/overmastery-192.png",
  "/icons/overmastery-512.png",
  "/icons/overmastery-maskable-512.png",
];

const CACHEABLE_PATH_PREFIXES = ["/_next/static/", "/brand/", "/icons/"];
const CACHEABLE_PATHS = new Set([
  "/apple-icon.png",
  "/favicon.ico",
  "/manifest.webmanifest",
]);

function isCacheableStaticRequest(url) {
  return (
    CACHEABLE_PATHS.has(url.pathname) ||
    CACHEABLE_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isSafeToCache(response) {
  return response.ok && response.type === "basic";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Take over right away instead of waiting for every open window of the
      // installed app to close, which can take days on a phone. Safe because
      // pages never depend on a specific worker version: navigations always go
      // to the network and static files are content-hashed.
      .then(() => self.skipWaiting()),
  );
});

async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Keys come back in insertion order, so the oldest are first.
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith(CACHE_PREFIX) &&
                  key !== STATIC_CACHE &&
                  key !== RUNTIME_CACHE,
              )
              .map((key) => caches.delete(key)),
          ),
        ),
      self.registration.navigationPreload?.enable(),
      self.clients.claim(),
      trimCache(RUNTIME_CACHE, RUNTIME_CACHE_LIMIT),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(request));
        } catch {
          return (await caches.match("/offline.html")) || Response.error();
        }
      })(),
    );
    return;
  }

  if (!isCacheableStaticRequest(url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(request);
      if (isSafeToCache(networkResponse)) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, networkResponse.clone());
        event.waitUntil(trimCache(RUNTIME_CACHE, RUNTIME_CACHE_LIMIT));
      }

      return networkResponse;
    })(),
  );
});
