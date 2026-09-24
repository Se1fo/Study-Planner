// Study Planner offline support
const CACHE = "study-planner-v1.8";
// The app page lives in its own cache that survives service worker updates,
// so with auto-update off the installed version stays put until the user updates.
const PAGE_CACHE = "study-planner-page";
const PREFS_CACHE = "study-planner-prefs";
const PREFS_KEY = "/__prefs";
const KEEP = [CACHE, PAGE_CACHE, PREFS_CACHE];
const ASSETS = ["/manifest.json", "/icon-192.png"];
const PAGE_KEY = "./";

// Fetch with a time limit so a slow network can't leave install (and the app's "Checking…") hanging.
function fetchWithTimeout(req, ms = 8000) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  return fetch(req, { signal: ctl.signal }).finally(() => clearTimeout(to));
}

let autoUpdate = null; // null = not loaded yet
async function getAutoUpdate() {
  if (autoUpdate !== null) return autoUpdate;
  try {
    const res = await (await caches.open(PREFS_CACHE)).match(PREFS_KEY);
    autoUpdate = res ? !!(await res.json()).autoUpdate : false;
  } catch (err) { autoUpdate = false; }
  return autoUpdate;
}

self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (d.type === "SET_PREFS") {
    autoUpdate = !!d.autoUpdate;
    e.waitUntil(caches.open(PREFS_CACHE).then(c =>
      c.put(PREFS_KEY, new Response(JSON.stringify({ autoUpdate }), { headers: { "Content-Type": "application/json" } }))
    ));
  }
});

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const url of ASSETS) {
      try { const res = await fetchWithTimeout(url); if (res.ok) await c.put(url, res); } catch (err) {}
    }
    // Only save the page the first time; after that it's replaced when the user updates (or auto-update is on).
    const pc = await caches.open(PAGE_CACHE);
    if (!(await pc.match(PAGE_KEY))) {
      try { const res = await fetchWithTimeout(PAGE_KEY); if (res.ok) await pc.put(PAGE_KEY, res); } catch (err) {}
    }
  })());
  // No skipWaiting here: the page decides when the new worker takes over (right away if auto-update is on).
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function networkPage(req) {
  // Skip the browser's HTTP cache (GitHub Pages sets max-age=600) so an update shows up right away.
  const res = await fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
  if (res.ok) {
    const copy = res.clone();
    caches.open(PAGE_CACHE).then(c => c.put(PAGE_KEY, copy));
  }
  return res;
}

async function cachedPage(req) {
  const pc = await caches.open(PAGE_CACHE);
  return (await pc.match(PAGE_KEY)) || (await caches.match(req, { ignoreSearch: true }));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const isPage = req.mode === "navigate" ||
    (url.origin === self.location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html") || url.pathname === "/"));
  if (isPage) {
    if (url.searchParams.has("check")) return; // update checks go straight to the network
    e.respondWith((async () => {
      // "?v=" is the user asking to update, so always get the latest.
      const forced = url.searchParams.has("v");
      if (forced || await getAutoUpdate()) {
        try { return await networkPage(req); }
        catch (err) { return (await cachedPage(req)) || Response.error(); }
      }
      // Auto-update off: keep running the installed version.
      const hit = await cachedPage(req);
      if (hit) return hit;
      return networkPage(req);
    })());
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
