/* Koala Study Mate service worker.
   - Same-origin pages/scripts/styles/images: network first, so a fresh deploy
     shows up immediately; the cached copy is used only when offline.
   - /api/* is never cached (logins, shared words, sync always go to the server).
   - Google Fonts: stale-while-revalidate. Bump CACHE when the list changes. */
const CACHE = "koala-study-v3";
const PRECACHE = [
  "/", "/index.html", "/css/style.css", "/js/app.js", "/js/words.js", "/js/words_ko.js",
  "/favicon.svg?v=3", "/icon-192.png?v=3", "/icon-512.png?v=3", "/apple-touch-icon.png?v=3", "/manifest.webmanifest", "/screenshots/home.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" }))))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then((hit) =>
            hit || (req.mode === "navigate" ? caches.match("/index.html") : Response.error())
          )
        )
    );
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
