// Study Planner offline support
const CACHE = "study-planner-v1.6";
const PRECACHE = ["./", "/", "/index.html", "/manifest.json", "/icon-192.png"];

self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      for (const url of PRECACHE) {
        try { await c.add(url); } catch (err) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The app page itself: always try the internet first (so updates arrive), fall back to the saved copy offline.
  const isPage = req.mode === "navigate" ||
    (url.origin === self.location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html") || url.pathname === "/"));
  if (isPage) {
    if (url.searchParams.has("check")) return; // update checks go straight to the network
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => {
            c.put(req, copy);
            c.put("./", copy.clone());
          });
        }
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fallback = await caches.match("./") || await caches.match("/") || await caches.match("/index.html");
        return fallback;
      })
    );
    return;
  }

  // Static assets (manifest, icons): Cache first, fallback to network
  if (url.origin === self.location.origin && (url.pathname.endsWith(".json") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg"))) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Fonts: use the saved copy right away, refresh it in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});

