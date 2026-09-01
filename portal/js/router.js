/**
 * Hash router (§2.1).
 *
 * Hash over History API deliberately: the portal must work when dropped on
 * GitHub Pages or any dumb static host with no rewrite rules, and a hash never
 * 404s on refresh or deep link.
 */

const routes = [];
let current = null;
let onChange = null;

export function route(pattern, handler) {
  // '*' is the catch-all; it is matched by pattern, never compiled.
  if (pattern === '*') { routes.push({ rx: null, names: [], handler, pattern }); return; }
  // '/play/:id' -> /^\/play\/([^/]+)$/
  const names = [];
  const rx = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
  routes.push({ rx, names, handler, pattern });
}

export function parse(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  return raw.startsWith('/') ? raw : '/' + raw;
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target) { resolve(); return; }
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
}

export function currentPath() { return current; }

export async function resolve() {
  const full = parse();
  // Hash routes carry their own query string: '#/play/foo?fresh=1'.
  const qIndex = full.indexOf('?');
  const path = qIndex < 0 ? full : full.slice(0, qIndex);
  const query = Object.fromEntries(new URLSearchParams(qIndex < 0 ? '' : full.slice(qIndex + 1)));
  current = path;

  for (const r of routes) {
    if (!r.rx) continue;
    const m = r.rx.exec(path);
    if (!m) continue;
    const params = {};
    r.names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
    onChange?.(path);
    await r.handler(params, { path, query });
    return true;
  }
  onChange?.(path);
  await routes.find((r) => r.pattern === '*')?.handler({}, { path, query });
  return false;
}

export function start(changeHandler) {
  onChange = changeHandler;
  window.addEventListener('hashchange', () => resolve());
  return resolve();
}
