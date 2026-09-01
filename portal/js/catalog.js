/**
 * Catalog loading (§1.4) — the portal hardcodes no game knowledge.
 *
 * games.json is served network-first by the service worker with a cache
 * fallback, so the catalog refreshes online and still opens offline. The IDB
 * copy here is a third line of defence for the no-service-worker case.
 */

import * as storage from './storage.js';

const MANIFEST_URL = 'games.json';
let cache = null;

function validate(manifest) {
  if (!manifest || !Array.isArray(manifest.games)) throw new Error('games.json: missing games[]');
  const seen = new Set();
  return manifest.games.filter((g) => {
    const ok = g && g.id && g.title && g.entry && g.hash && g.minRendererTier;
    if (!ok) { console.warn('[catalog] skipping malformed entry', g); return false; }
    if (seen.has(g.id)) { console.warn('[catalog] duplicate id', g.id); return false; }
    seen.add(g.id);
    return true;
  });
}

/**
 * A single-file distribution build (tools/build-single.mjs) embeds the catalog
 * in the page instead of shipping games.json alongside it. Same shape, same
 * validation — only the source differs.
 */
function embedded() {
  const el = document.getElementById('catalog-data');
  if (!el) return null;
  try { return JSON.parse(el.textContent); } catch { return null; }
}

export async function load({ force = false } = {}) {
  if (cache && !force) return cache;

  const inline = embedded();
  if (inline) { cache = { ...inline, games: validate(inline) }; return cache; }

  let manifest = null;
  try {
    const res = await fetch(MANIFEST_URL, { cache: force ? 'reload' : 'default' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
    storage.setMeta('catalog', manifest);
  } catch (err) {
    console.warn('[catalog] network load failed, falling back to cached copy:', err?.message || err);
    manifest = await storage.getMeta('catalog', null);
    if (!manifest) throw new Error('No catalog available — connect once to install the library.');
  }
  cache = { ...manifest, games: validate(manifest) };
  return cache;
}

export function games() { return cache?.games ?? []; }

export function byId(id) { return games().find((g) => g.id === id) || null; }

/** Visible titles: diagnostics/test entries stay out of the grid unless asked for. */
export function visible({ includeHidden = false } = {}) {
  return games().filter((g) => includeHidden || !g.hidden);
}

export function search(query, list = visible()) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((g) =>
    g.title.toLowerCase().includes(q) ||
    g.tagline?.toLowerCase().includes(q) ||
    g.description?.toLowerCase().includes(q) ||
    g.tags?.some((t) => t.toLowerCase().includes(q))
  );
}

export function bundleUrl(game) { return `${game.entry}?v=${game.hash}`; }
