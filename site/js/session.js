/* Private hub links. A visitor's hub lives at /h/<key> where key is 128 bits of
 * CSPRNG entropy in base62 (22 chars) — unguessable, never derived from anything
 * about the user. Keys can be retired and regenerated on demand. */
const ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const LS_CURRENT = 'nova.key.current';
const LS_RETIRED = 'nova.key.retired';
const KEY_RE = /^[0-9A-Za-z]{18,32}$/;

function readJSON(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

/** 128 bits of entropy rendered in base62 (22 chars). */
export function mintKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (out.length < 22) { out = ALPHA[Number(n % 62n)] + out; n /= 62n; }
  return out;
}

export const isKey = (k) => typeof k === 'string' && KEY_RE.test(k);

export function currentKey() {
  let k = null;
  try { k = localStorage.getItem(LS_CURRENT); } catch {}
  if (!isKey(k)) { k = mintKey(); try { localStorage.setItem(LS_CURRENT, k); } catch {} }
  return k;
}

export function adoptKey(k) {
  if (!isKey(k)) return currentKey();
  try { localStorage.setItem(LS_CURRENT, k); } catch {}
  return k;
}

export const retiredKeys = () => readJSON(LS_RETIRED, []);
export const isRetired = (k) => retiredKeys().includes(k);

/** Retires the active key and mints a new one. Returns the new key. */
export function regenerateKey() {
  const old = currentKey();
  const list = retiredKeys();
  if (!list.includes(old)) list.push(old);
  writeJSON(LS_RETIRED, list.slice(-40));
  const next = mintKey();
  try { localStorage.setItem(LS_CURRENT, next); } catch {}
  return next;
}

export function restoreKey(k) {
  if (!isKey(k)) return false;
  writeJSON(LS_RETIRED, retiredKeys().filter((x) => x !== k));
  adoptKey(k);
  return true;
}

export const hubURL = (key, sub = '') =>
  `${location.origin}/h/${key}${sub ? '/' + sub.replace(/^\/+/, '') : ''}`;

/** Parses /h/<key>/<rest...> into { key, parts }. */
export function parsePath(pathname = location.pathname) {
  const seg = pathname.split('/').filter(Boolean);
  if (seg[0] !== 'h' || !isKey(seg[1])) return { key: null, parts: [] };
  return { key: seg[1], parts: seg.slice(2) };
}
