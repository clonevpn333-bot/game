/* History-API router scoped under /h/<key>. Routes:
 *   ''            library
 *   g/<id>        game detail
 *   play/<id>     immersive player  */
import { parsePath, hubURL, BASE } from './session.js';

export function createRouter({ key, mount, render }) {
  const go = {
    key,
    href: (sub) => `${BASE}#/h/${go.key}${sub ? '/' + sub : ''}`,
    url: (sub) => location.origin + go.href(sub),
    to(sub, { replace = false } = {}) {
      const url = go.href(sub) + (location.search && sub === '' ? location.search : '');
      if (replace) history.replaceState({ sub }, '', url);
      else history.pushState({ sub }, '', url);
      go.paint();
    },
    rekey(next) { go.key = next; history.replaceState({}, '', hubURL(next)); },
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
    history.replaceState({}, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }

  addEventListener('popstate', () => go.paint());
  addEventListener('hashchange', () => go.paint());
  document.addEventListener('nova:keychange', (e) => go.rekey(e.detail));
  return go;
}
