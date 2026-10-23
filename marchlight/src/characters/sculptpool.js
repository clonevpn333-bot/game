// Prewarms the anatomy cache: pieces come from IndexedDB when this build has sculpted them
// before, otherwise a pool of workers sculpts them in parallel and the results are stored.
import { anatomyCache, allJobs, keyOf } from './anatomy.js';
import { B, HAIR_STYLES } from './rig.js';

const DB = 'marchlight-anatomy', STORE = 'pieces';
const idb = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function openDB() {
  try {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    return await idb(r);
  } catch (e) { return null; }
}
// The cache is keyed by a hash of the sculpting source, so any change to the anatomy re-sculpts.
async function sourceHash() {
  if (globalThis.__SCULPT_HASH) return globalThis.__SCULPT_HASH; // single-file build
  let h = 2166136261;
  for (const f of ['anatomy.js', 'sculpt.js']) {
    try { const t = await (await fetch(new URL('./' + f, import.meta.url))).text(); for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619); } catch (e) { return 'nohash'; }
  }
  return (h >>> 0).toString(36);
}

export async function prewarmAnatomy(onProgress = () => {}) {
  const t0 = performance.now();
  const jobs = allJobs(B, HAIR_STYLES);
  const ver = await sourceHash(), db = await openDB();
  const missing = [];
  let done = 0;
  const tick = () => onProgress(++done / jobs.length);
  for (const j of jobs) {
    const key = keyOf(j.kind, j.P, j.L, j.lod);
    let hit = null;
    if (db) try { hit = await idb(db.transaction(STORE).objectStore(STORE).get(ver + ':' + key)); } catch (e) { /* ignore */ }
    if (hit) { anatomyCache.set(key, hit); tick(); } else missing.push(j);
  }
  if (missing.length) {
    // biggest first so the pool drains evenly
    const cost = { body: 4, head: 3, hair: 2, hands: 1 };
    missing.sort((a, b) => (cost[b.kind] + (b.lod === 'high' ? 4 : 0)) - (cost[a.kind] + (a.lod === 'high' ? 4 : 0)));
    const n = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1, missing.length));
    let next = 0;
    await new Promise((resolve) => {
      let live = n;
      for (let w = 0; w < n; w++) {
        let worker;
        try {
          // the single-file build carries the worker inline; otherwise load it as a module
          worker = globalThis.__SCULPT_WORKER_SRC
            ? new Worker(URL.createObjectURL(new Blob([globalThis.__SCULPT_WORKER_SRC], { type: 'text/javascript' })))
            : new Worker(new URL('./sculpt.worker.js', import.meta.url), { type: 'module' });
        } catch (e) { live--; if (!live) resolve(); continue; }
        const feed = () => { if (next < missing.length) worker.postMessage({ ...missing[next++] }); else { worker.terminate(); if (--live === 0) resolve(); } };
        worker.onmessage = (e) => {
          const { key, data } = e.data;
          anatomyCache.set(key, data);
          if (db) try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, ver + ':' + key); } catch (err) { /* quota: fine */ }
          tick(); feed();
        };
        worker.onerror = (e) => { console.warn('sculpt worker failed', e.message); worker.terminate(); if (--live === 0) resolve(); };
        feed();
      }
    });
  }
  console.log(`anatomy: ${jobs.length - missing.length} cached, ${missing.length} sculpted in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
}
