// Persists sculpted geometry between sessions (IndexedDB). Building a character
// from scratch costs seconds of CPU; with a warm cache it takes well under one.
import { POLY_CACHE } from './sculpt.js';

const DB = 'tlv-geometry', STORE = 'poly', VERSION = 1;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, VERSION);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}

/** Load all cached entries for a character into memory. */
export async function warmCache(name) {
  const d = await db(); if (!d) return 0;
  return new Promise((res) => {
    try {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(name);
      req.onsuccess = () => { const rec = req.result; if (rec) for (const [k, v] of Object.entries(rec)) POLY_CACHE.map.set(k, v); res(rec ? Object.keys(rec).length : 0); };
      req.onerror = () => res(0);
    } catch { res(0); }
  });
}

/** Store everything this character used (replaces its previous record, dropping stale keys). */
export async function persistCache(name, keysUsed) {
  const d = await db(); if (!d) return;
  const rec = {};
  for (const k of keysUsed) { const v = POLY_CACHE.map.get(k); if (v) rec[k] = v; }
  return new Promise((res) => {
    try { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(rec, name); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch { res(); }
  });
}
