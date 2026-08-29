/* History-API router scoped under /h/<key>. Routes:
 *   ''            library
 *   g/<id>        game detail
 *   play/<id>     immersive player  */
import { parsePath, hubURL, hubHash } from './session.js';

export function createRouter({ key, mount, render }) {
  const go = {
    key,
    href: (sub) => hubHash(go.key, sub),
    url: (sub) => hubURL(go.key, sub),
    to(sub, { replace = false } = {}) {
      const url = go.href(sub);
      try {
        if (replace) history.replaceState({ sub }, '', url);
        else history.pushState({ sub }, '', url);
      } catch { location.hash = url; }
      go.paint();
    },
    rekey(next) { go.key = next; try { history.replaceState({}, '', hubHash(next)); } catch { location.hash = hubHash(next); } },
    paint() {
      const { parts } = parsePath();
      const sub = parts.join('/');
      const query = Object.fromEntries(new URLSearchParams(location.search));
      const view = render({ sub, parts, query, go, setQuery });
      swap(view);
    },
  };

  let current = null;
  function swap(next) {
    const finish = () => {
      if (current) { current.destroy?.(); current.remove(); }
      mount.append(next);
      current = next;
      if (!next.classList.contains('player')) window.scrollTo({ top: 0, behavior: 'instant' });
    };
    if (current && !document.startViewTransition) {
      current.classList.add('is-leaving');
      setTimeout(finish, 180);
    } else if (document.startViewTransition && current) {
      document.startViewTransition(finish);
    } else finish();
  }

  function setQuery(patch) {
    const q = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) { if (v == null) q.delete(k); else q.set(k, v); }
    const s = q.toString();
    // query strings need a real origin; on file:// keep the filter in memory only
    if (!/^https?:$/.test(location.protocol)) return;
    try { history.replaceState({}, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch {}
  }

  addEventListener('popstate', () => go.paint());
  addEventListener('hashchange', () => go.paint());
  document.addEventListener('nova:keychange', (e) => go.rekey(e.detail));
  return go;
}
