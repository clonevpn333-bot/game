/**
 * IndexedDB persistence (§1.4).
 *
 * localStorage is disqualified: ~5 MB cap and a synchronous API that blocks
 * the main thread — on the target hardware that is a visible frame hitch.
 *
 * Stores:
 *   saves   key=gameId  { data, version, updatedAt, bytes }
 *   meta    key=name    arbitrary settings / portal state
 *   bundles key=url     { size, lastUsed, gameId, version }  LRU bookkeeping
 *           shared with the service worker so eviction has real usage data.
 */

const DB_NAME = 'gameportal';
const DB_VERSION = 1;
let dbPromise = null;

/**
 * Fallback store for contexts where IndexedDB is unavailable or partitioned —
 * most importantly inside a blank-window launcher, where the top document has
 * no origin of its own and a browser may refuse the frame persistent storage.
 *
 * window.name survives navigation within the same tab and is not partitioned,
 * which makes it the one place a save can live in that situation. It is capped
 * hard: this is a lifeboat for a few kilobytes of save data, not a database.
 */
const NAME_KEY = '__overclock_store__';
const NAME_CAP = 64 * 1024;

const nameStore = {
  available: false,
  target: null,

  probe() {
    // Prefer the top window so the store survives the portal's own navigation.
    for (const w of [safeTop(), window]) {
      if (!w) continue;
      try {
        const before = w.name;
        w.name = before;                       // throws cross-origin
        this.target = w;
        this.available = true;
        return true;
      } catch { /* not reachable; try the next */ }
    }
    return false;
  },

  read() {
    if (!this.target) return {};
    const raw = this.target.name || '';
    const at = raw.indexOf(NAME_KEY);
    if (at < 0) return {};
    try { return JSON.parse(raw.slice(at + NAME_KEY.length)) || {}; } catch { return {}; }
  },

  write(data) {
    if (!this.target) return false;
    let json = JSON.stringify(data);
    if (json.length > NAME_CAP) {
      // Drop the least recently written entries until it fits.
      const entries = Object.entries(data).sort((a, b) => (a[1]?.updatedAt || 0) - (b[1]?.updatedAt || 0));
      while (entries.length && json.length > NAME_CAP) {
        delete data[entries.shift()[0]];
        json = JSON.stringify(data);
      }
    }
    const raw = this.target.name || '';
    const at = raw.indexOf(NAME_KEY);
    const prefix = at < 0 ? raw : raw.slice(0, at);
    try { this.target.name = prefix + NAME_KEY + json; return true; } catch { return false; }
  },

  get(store, key) { return (this.read()[store] || {})[key]; },
  put(store, key, value) {
    const all = this.read();
    (all[store] = all[store] || {})[key] = value;
    return this.write(all);
  },
  del(store, key) {
    const all = this.read();
    if (all[store]) delete all[store][key];
    return this.write(all);
  },
  all(store) { return this.read()[store] || {}; },
};

function safeTop() {
  try {
    // Touching a cross-origin top throws; that is the signal it is unusable.
    const t = window.top;
    void t.location.href;
    return t;
  } catch { return null; }
}

/** True once IndexedDB has been shown not to work here. */
let useName = false;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('bundles')) db.createObjectStore('bundles');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked by another tab'));
  }).catch((err) => {
    // Private browsing and locked-down profiles can refuse IDB outright. The
    // portal must still run — it just cannot remember anything.
    console.warn('[storage] IndexedDB unavailable:', err?.message || err);
    dbPromise = null;
    return null;
  });
  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try { result = fn(s); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('transaction aborted'));
  });
}

const wrap = (req) => ({ __req: req });

async function withDb(fallback, fn) {
  if (useName) return fallback;
  const db = await open();
  if (!db) { useName = nameStore.probe(); return fallback; }
  try { return await fn(db); } catch (e) {
    console.warn('[storage]', e?.message || e);
    useName = nameStore.probe();
    return fallback;
  }
}

/** Where saves are actually going, for the diagnostics page. */
export function backend() {
  return useName ? (nameStore.available ? 'window.name (fallback)' : 'none') : 'IndexedDB';
}

// ---- saves ---------------------------------------------------------------

export async function getSave(gameId) {
  const v = await withDb(null, (db) => tx(db, 'saves', 'readonly', (s) => wrap(s.get(gameId))));
  if (v) return v;
  return useName ? (nameStore.get('saves', gameId) || null) : null;
}

export async function putSave(gameId, data, version = 1) {
  const rec = { data, version, updatedAt: Date.now(), bytes: estimateBytes(data) };
  const ok = await withDb(false, (db) => tx(db, 'saves', 'readwrite', (s) => { s.put(rec, gameId); return true; }));
  if (ok) return true;
  return useName ? nameStore.put('saves', gameId, rec) : false;
}

export async function deleteSave(gameId) {
  const ok = await withDb(false, (db) => tx(db, 'saves', 'readwrite', (s) => { s.delete(gameId); return true; }));
  if (ok) return true;
  return useName ? nameStore.del('saves', gameId) : false;
}

export async function listSaves() {
  const rows = await withDb(null, async (db) => {
    const keys = await tx(db, 'saves', 'readonly', (s) => wrap(s.getAllKeys()));
    const vals = await tx(db, 'saves', 'readonly', (s) => wrap(s.getAll()));
    return keys.map((k, i) => ({ gameId: k, updatedAt: vals[i]?.updatedAt || 0, bytes: vals[i]?.bytes || 0 }));
  });
  if (rows) return rows;
  return Object.entries(useName ? nameStore.all('saves') : {})
    .map(([gameId, r]) => ({ gameId, updatedAt: r?.updatedAt || 0, bytes: r?.bytes || 0 }));
}

// ---- meta ----------------------------------------------------------------

export async function getMeta(key, fallback = null) {
  const v = await withDb(undefined, async (db) => {
    const got = await tx(db, 'meta', 'readonly', (s) => wrap(s.get(key)));
    return got === undefined ? null : got;
  });
  if (v !== undefined) return v === null ? fallback : v;
  const n = useName ? nameStore.get('meta', key) : undefined;
  return n === undefined ? fallback : n;
}

export async function setMeta(key, value) {
  const ok = await withDb(false, (db) => tx(db, 'meta', 'readwrite', (s) => { s.put(value, key); return true; }));
  if (ok) return true;
  return useName ? nameStore.put('meta', key, value) : false;
}

// ---- bundle LRU ----------------------------------------------------------

export function touchBundle(url, gameId, version, size = 0) {
  return withDb(false, (db) => tx(db, 'bundles', 'readwrite', (s) => {
    s.put({ url, gameId, version, size, lastUsed: Date.now() }, url);
    return true;
  }));
}

export function listBundles() {
  return withDb([], (db) => tx(db, 'bundles', 'readonly', (s) => wrap(s.getAll())));
}

export function forgetBundle(url) {
  return withDb(false, (db) => tx(db, 'bundles', 'readwrite', (s) => { s.delete(url); return true; }));
}

// ---- helpers -------------------------------------------------------------

/** Rough byte cost of a save, used for budgeting and the UI. */
export function estimateBytes(data) {
  try { return new Blob([JSON.stringify(data)]).size; } catch { return 0; }
}

/** Ask for persistent storage so the browser stops evicting us first under
 *  pressure. Chrome grants it silently to installed PWAs. */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return false; }
}
