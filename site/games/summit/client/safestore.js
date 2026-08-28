/* Some contexts (file://, sandboxed frames, privacy mode) throw on any storage
 * access. Swap in an in-memory store so nothing downstream has to care. */
export function installSafeStorage() {
  for (const key of ['localStorage', 'sessionStorage']) {
    let ok = true;
    try { window[key].setItem('__t', '1'); window[key].removeItem('__t'); } catch { ok = false; }
    if (ok) continue;
    const m = new Map();
    const shim = {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
      key: (i) => [...m.keys()][i] ?? null,
      get length() { return m.size; },
    };
    try { Object.defineProperty(window, key, { value: shim, configurable: true }); } catch {}
  }
}
