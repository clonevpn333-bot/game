/* Lowspec Arcade service worker (§2.3).
 *
 * Three caches, three strategies:
 *   shell-<hash>   app shell, precached at install, cache-first, whole-cache
 *                  swap on version change (the hash is stamped by
 *                  tools/build.mjs from the shell sources).
 *   bundles-v1     game bundles at content-hashed URLs, cache-first forever.
 *                  A version bump changes the URL, so only that bundle is
 *                  refetched; older versions of the same path are purged.
 *   runtime-v1     thumbnails and icons, stale-while-revalidate.
 *
 * games.json is network-first with a cache fallback so the catalog updates
 * online and still opens offline.
 */

const SHELL_VERSION = '943714aa60';                     // stamped by tools/build.mjs
const SHELL_CACHE   = `shell-${SHELL_VERSION}`;
const BUNDLE_CACHE  = 'bundles-v1';
const RUNTIME_CACHE = 'runtime-v1';
const MANIFEST_URL  = 'games.json';

const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'portal/css/shell.css',
  'portal/js/shell.js',
  'portal/js/router.js',
  'portal/js/catalog.js',
  'portal/js/views.js',
  'portal/js/launcher.js',
  'portal/js/storage.js',
  'portal/js/capabilities.js',
  'portal/icons/icon.svg',
];

const MANIFEST_TIMEOUT_MS = 2500;
const QUOTA_HIGH = 0.85;   // start evicting bundles above this fraction of quota
const QUOTA_TARGET = 0.6;  // evict down to this

// ------------------------------------------------------------------ install

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // addAll is atomic-ish but fails the whole install on one 404; add
    // individually so a missing optional asset cannot brick the install.
    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (err) { console.warn('[sw] precache miss', url, err?.message); }
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, BUNDLE_CACHE, RUNTIME_CACHE]);
    for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
    await self.clients.claim();
    await enforceQuota();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'PURGE_BUNDLES') {
    event.waitUntil(caches.delete(BUNDLE_CACHE));
  }
});

// -------------------------------------------------------------------- fetch

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // never proxy third parties

  const path = url.pathname;

  // Game bundles are checked before navigation mode on purpose: loading a
  // bundle into an iframe *is* a navigation request, and the app-shell handler
  // would otherwise answer it with index.html.
  if (/\/games\/[^/]+\.html$/.test(path)) { event.respondWith(bundleHandler(req)); return; }
  if (req.mode === 'navigate') { event.respondWith(navigationHandler(req)); return; }
  if (path.endsWith('/' + MANIFEST_URL) || path.endsWith(MANIFEST_URL)) { event.respondWith(manifestHandler(req)); return; }
  if (/\.(svg|png|webp|jpg|ico|woff2?)$/.test(path)) { event.respondWith(runtimeHandler(req)); return; }
  if (/\.(css|js|webmanifest)$/.test(path)) { event.respondWith(shellHandler(req)); return; }
});

/** App shell: cached copy paints instantly, network only fills gaps. */
async function navigationHandler(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = (await cache.match('index.html')) || (await cache.match('./'));
  if (cached) return cached;
  try { return await fetch(req); }
  catch { return new Response(offlineHtml(), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }); }
}

async function shellHandler(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

/** Catalog: network-first with a short timeout, then cache. */
async function manifestHandler(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await withTimeout(fetch(req, { cache: 'no-cache' }), MANIFEST_TIMEOUT_MS);
    if (res.ok) { cache.put(req, res.clone()); return res; }
    throw new Error('bad status ' + res.status);
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    return cached || new Response(JSON.stringify({ schemaVersion: 1, games: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
}

/**
 * Game bundles. The URL carries ?v=<content hash>, so a cache hit is proof the
 * bytes are current: serve it and never revalidate. On a miss, fetch, store,
 * drop any older version of the same path, then check the quota.
 */
async function bundleHandler(req) {
  const cache = await caches.open(BUNDLE_CACHE);
  const hit = await cache.match(req);
  if (hit) { touchBundle(req.url); return hit; }

  try {
    const res = await fetch(req);
    if (res.ok) {
      await cache.put(req, res.clone());
      await purgeOtherVersions(cache, req.url);
      touchBundle(req.url, Number(res.headers.get('content-length')) || 0);
      enforceQuota();
    }
    return res;
  } catch {
    // Offline and never played: any cached version beats a dead frame.
    const any = await cache.match(req, { ignoreSearch: true });
    if (any) return any;
    return new Response(unavailableHtml(), { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
}

async function runtimeHandler(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached || Response.error());
  return cached || network;
}

// ----------------------------------------------------------------- helpers

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** Remove stale versions of one bundle path, leaving the version just stored. */
async function purgeOtherVersions(cache, currentUrl) {
  const current = new URL(currentUrl);
  for (const key of await cache.keys()) {
    const u = new URL(key.url);
    if (u.pathname === current.pathname && u.search !== current.search) {
      await cache.delete(key);
      forgetBundle(key.url);
    }
  }
}

/**
 * Quota-aware eviction (§2.3). Chrome hands a tab a fraction of free disk;
 * on a 32 GB Chromebook with a full Downloads folder that can be small, so
 * bundles evict least-recently-used rather than waiting for a QuotaExceeded.
 */
async function enforceQuota() {
  if (!self.navigator?.storage?.estimate) return;
  let { usage = 0, quota = 0 } = await navigator.storage.estimate();
  if (!quota || usage / quota < QUOTA_HIGH) return;

  const cache = await caches.open(BUNDLE_CACHE);
  const keys = await cache.keys();
  const records = await listBundles();
  const lastUsed = new Map(records.map((r) => [r.url, r.lastUsed || 0]));
  keys.sort((a, b) => (lastUsed.get(a.url) || 0) - (lastUsed.get(b.url) || 0));

  for (const key of keys) {
    if (usage / quota <= QUOTA_TARGET) break;
    const res = await cache.match(key);
    const size = Number(res?.headers.get('content-length')) || 200_000;
    await cache.delete(key);
    forgetBundle(key.url);
    usage -= size;
    console.info('[sw] evicted', key.url);
  }
}

// --- IndexedDB LRU bookkeeping, shared with portal/js/storage.js ----------

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gameportal', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('bundles')) db.createObjectStore('bundles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function touchBundle(url, size = 0) {
  try {
    const db = await idb();
    const tx = db.transaction('bundles', 'readwrite');
    const store = tx.objectStore('bundles');
    const get = store.get(url);
    get.onsuccess = () => {
      const prev = get.result || {};
      store.put({ ...prev, url, size: size || prev.size || 0, lastUsed: Date.now() }, url);
    };
    tx.oncomplete = () => db.close();
  } catch { /* IDB unavailable: LRU degrades to insertion order */ }
}

async function listBundles() {
  try {
    const db = await idb();
    const tx = db.transaction('bundles', 'readonly');
    const req = tx.objectStore('bundles').getAll();
    return await new Promise((resolve) => {
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); resolve([]); };
    });
  } catch { return []; }
}

async function forgetBundle(url) {
  try {
    const db = await idb();
    const tx = db.transaction('bundles', 'readwrite');
    tx.objectStore('bundles').delete(url);
    tx.oncomplete = () => db.close();
  } catch { /* nothing to forget */ }
}

// ------------------------------------------------------------ offline HTML

function offlineHtml() {
  return `<!doctype html><meta charset="utf-8"><title>Offline</title>
<body style="font:15px system-ui;background:#0d1117;color:#e6edf3;padding:40px;max-width:60ch">
<h1>Portal not installed yet</h1>
<p>Open this page once while online and it will work offline from then on.</p>`;
}

function unavailableHtml() {
  return `<!doctype html><meta charset="utf-8"><title>Not cached</title>
<body style="font:15px system-ui;background:#0d1117;color:#e6edf3;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
<div><h1 style="font-size:18px">This game isn’t cached yet</h1>
<p style="color:#9aa7b4">Play it once while online and it stays available offline.</p></div>`;
}
