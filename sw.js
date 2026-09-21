// Study Planner offline support
const CACHE = "study-planner-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add("./")).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The app page itself: always try the internet first (so updates arrive), fall back to the saved copy offline.
  const isPage = req.mode === "navigate" ||
    (url.origin === self.location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html")));
  if (isPage) {
    if (url.searchParams.has("check")) return; // update checks go straight to the network
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
        return res;
      }).catch(() => caches.match("./"))
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
