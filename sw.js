// Service worker — caches the app shell so it loads offline.
// Supabase API calls (cross-origin) pass through to the network untouched.
const CACHE = "hebrews-pos-v9";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./favicon.svg",
  "./css/styles.css",
  "./js/vendor/supabase.js",
  "./js/config.js", "./js/db.js", "./js/util.js", "./js/auth.js",
  "./js/offline.js", "./js/receipt.js", "./js/pos.js", "./js/inventory.js",
  "./js/sales.js", "./js/analytics.js", "./js/staff.js", "./js/menu.js", "./js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. -> network

  // HTML navigation: network-first (fresh when online), cache fallback offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  // Other same-origin assets: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
