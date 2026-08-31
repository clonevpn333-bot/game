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
  const db = await open();
  if (!db) return fallback;
  try { return await fn(db); } catch (e) {
    console.warn('[storage]', e?.message || e);
    return fallback;
  }
}

// ---- saves ---------------------------------------------------------------

export function getSave(gameId) {
  return withDb(null, (db) => tx(db, 'saves', 'readonly', (s) => wrap(s.get(gameId))));
}

export function putSave(gameId, data, version = 1) {
  const rec = { data, version, updatedAt: Date.now(), bytes: estimateBytes(data) };
  return withDb(false, (db) => tx(db, 'saves', 'readwrite', (s) => { s.put(rec, gameId); return true; }));
}

export function deleteSave(gameId) {
  return withDb(false, (db) => tx(db, 'saves', 'readwrite', (s) => { s.delete(gameId); return true; }));
}

export function listSaves() {
  return withDb([], async (db) => {
    const keys = await tx(db, 'saves', 'readonly', (s) => wrap(s.getAllKeys()));
    const vals = await tx(db, 'saves', 'readonly', (s) => wrap(s.getAll()));
    return keys.map((k, i) => ({ gameId: k, updatedAt: vals[i]?.updatedAt || 0, bytes: vals[i]?.bytes || 0 }));
  });
}

// ---- meta ----------------------------------------------------------------

export function getMeta(key, fallback = null) {
  return withDb(fallback, async (db) => {
    const v = await tx(db, 'meta', 'readonly', (s) => wrap(s.get(key)));
    return v === undefined ? fallback : v;
  });
}

export function setMeta(key, value) {
  return withDb(false, (db) => tx(db, 'meta', 'readwrite', (s) => { s.put(value, key); return true; }));
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
