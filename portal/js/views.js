/**
 * Nova Arcade views — hand-rolled DOM, no framework, no build step.
 *
 * Shaped like a streaming service because that is what it is: a spotlight for
 * one title, then rails you scan sideways. Everything stays keyboard operable —
 * the target machine is a Chromebook with a trackpad.
 */

import * as catalog from './catalog.js';
import * as launcher from './launcher.js';
import * as storage from './storage.js';
import { detect, meetsTier, TIER_LABEL, memoryHeadroom, storageInfo } from './capabilities.js';
import { navigate } from './router.js';

const view = () => document.getElementById('view');

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

const clear = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
const mount = (node) => { const v = view(); clear(v); v.append(node); return node; };

const CATEGORY_LABEL = {
  action: 'Action', coop: 'Co-op', arcade: 'Arcade', puzzle: 'Puzzle',
  sim: 'Sandbox', racing: 'Racing', strategy: 'Strategy',
};
const label = (c) => CATEGORY_LABEL[c] || (c ? c[0].toUpperCase() + c.slice(1) : 'Games');

const fmtAgo = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** `controls` arrives as a string from the hub and an array from repo sources. */
function controlKeys(game) {
  if (Array.isArray(game.controls)) return game.controls.map((c) => `${c.keys} — ${c.action}`);
  if (typeof game.controls === 'string' && game.controls) return game.controls.split('·').map((s) => s.trim()).filter(Boolean);
  return [];
}

let saves = new Map();
let activeFilter = 'all';

// ---------------------------------------------------------------- library --

export async function renderLibrary(query = '') {
  const caps = detect();
  saves = new Map((await storage.listSaves()).map((s) => [s.gameId, s]));
  const all = catalog.visible();

  if (query.trim()) return mount(searchView(query, all, caps));

  const spotlight = all.find((g) => g.spotlight) || all.find((g) => g.featured) || all[0];
  const cats = [...new Set(all.map((g) => g.category || 'action'))];

  const node = el('div', {},
    spotlight ? heroFor(spotlight, caps, 'Spotlight') : null,
    filterBar(cats),
    el('div', { class: 'rails', id: 'rails' }),
  );
  mount(node);
  paintRails(all, caps);
  return node;
}

function filterBar(cats) {
  const bar = el('nav', { class: 'filters', 'aria-label': 'Filter by category' });
  const make = (id, text) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(activeFilter === id),
    onclick: () => {
      activeFilter = id;
      for (const c of bar.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(c.dataset.cat === id));
      paintRails(catalog.visible(), detect());
    },
    dataset: { cat: id },
    text,
  });
  bar.append(make('all', 'All games'), ...cats.map((c) => make(c, label(c))));
  return bar;
}

function paintRails(all, caps) {
  const rails = document.getElementById('rails');
  if (!rails) return;
  clear(rails);

  const pool = activeFilter === 'all' ? all : all.filter((g) => (g.category || 'action') === activeFilter);

  if (activeFilter === 'all') {
    const resume = all.filter((g) => saves.has(g.id))
      .sort((a, b) => saves.get(b.id).updatedAt - saves.get(a.id).updatedAt);
    if (resume.length) rails.append(rail('Continue playing', resume, caps, 'Picks up where you left off'));

    const featured = all.filter((g) => g.featured);
    if (featured.length) rails.append(rail('Featured', featured, caps));

    for (const cat of [...new Set(all.map((g) => g.category || 'action'))]) {
      const list = all.filter((g) => (g.category || 'action') === cat);
      if (list.length) rails.append(rail(label(cat), list, caps));
    }
  } else {
    rails.append(rail(label(activeFilter), pool, caps));
  }

  if (!rails.children.length) {
    rails.append(el('p', { class: 'empty', text: 'Nothing in this category yet.' }));
  }
}

function rail(title, games, caps, note) {
  const track = el('div', { class: 'rail-track', role: 'list' });
  for (const g of games) track.append(tile(g, caps));
  wireRailKeys(track);
  return el('section', { class: 'rail' },
    el('div', { class: 'rail-head' },
      el('h2', { text: title }),
      el('span', { text: note || `${games.length} title${games.length === 1 ? '' : 's'}` })),
    track,
  );
}

function tile(game, caps) {
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const save = saves.get(game.id);
  return el('a', {
    class: `tile${supported ? '' : ' tile--locked'}`,
    href: `#/game/${game.id}`, role: 'listitem',
    'aria-label': `${game.title}. ${game.tagline || ''}${supported ? '' : ' Not supported on this device.'}`,
    dataset: { id: game.id },
  },
    el('div', { class: 'tile-art' },
      !supported ? el('span', { class: 'tile-flag tile-flag--warn', text: `Needs ${TIER_LABEL[game.minRendererTier]}` })
        : save ? el('span', { class: 'tile-flag', text: 'Saved' }) : null,
      el('img', { src: game.thumbnail, alt: '', loading: 'lazy', decoding: 'async', width: 320, height: 180 }),
    ),
    el('div', { class: 'tile-body' },
      el('h3', { class: 'tile-title', text: game.title }),
      el('p', { class: 'tile-sub', text: game.tagline || '' }),
      el('div', { class: 'tile-meta' },
        el('span', { text: game.players || '1 player' }),
        el('span', { class: 'dot' }),
        el('span', { text: `~${game.estMemoryMB} MB` }),
      ),
    ),
  );
}

/** Arrow keys walk a rail; the browser scrolls the focused tile into view. */
function wireRailKeys(track) {
  track.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tiles = [...track.querySelectorAll('.tile')];
    const i = tiles.indexOf(e.target.closest('.tile'));
    if (i < 0) return;
    const next = tiles[i + (e.key === 'ArrowRight' ? 1 : -1)];
    if (next) { next.focus(); e.preventDefault(); }
  });
}

function searchView(query, all, caps) {
  const hits = catalog.search(query, all);
  const grid = el('div', { class: 'grid', role: 'list' });
  for (const g of hits) grid.append(tile(g, caps));
  return el('div', {},
    el('div', { class: 'rail-head', style: 'padding-top:26px' },
      el('h2', { text: `Results for “${query.trim()}”` }),
      el('span', { text: `${hits.length} title${hits.length === 1 ? '' : 's'}` })),
    hits.length ? grid : el('p', { class: 'empty', text: 'No games match that.' }),
  );
}

// ----------------------------------------------------------------- hero --

function heroFor(game, caps, eyebrow) {
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const save = saves.get(game.id);
  return el('section', { class: 'hero' },
    el('div', { class: 'hero-art' }, el('img', { src: game.thumbnail, alt: '', fetchpriority: 'high' })),
    el('div', { class: 'hero-veil' }),
    el('div', { class: 'hero-body' },
      el('span', { class: 'eyebrow', text: eyebrow }),
      el('h1', { class: 'hero-title', text: game.title }),
      el('p', { class: 'hero-tagline', text: game.tagline || '' }),
      el('div', { class: 'hero-meta' },
        el('span', {}, el('b', { text: label(game.category) })),
        el('span', { text: game.players || '1 player' }),
        game.duration ? el('span', { text: game.duration }) : null,
        el('span', { text: `${TIER_LABEL[game.minRendererTier]} · ~${game.estMemoryMB} MB` }),
      ),
      el('div', { class: 'hero-actions' },
        supported
          ? el('a', { class: 'btn btn--play', href: `#/play/${game.id}` }, playIcon(), save ? 'Continue' : 'Play')
          : el('span', { class: 'btn', text: `Needs ${TIER_LABEL[game.minRendererTier]}` }),
        el('a', { class: 'btn btn--ghost', href: `#/game/${game.id}`, text: 'Details' }),
      ),
    ),
  );
}

function playIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '13'); svg.setAttribute('height', '13');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 1.8v12.4L14 8z');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

// --------------------------------------------------------------- detail --

export async function renderDetails(id) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);

  const caps = detect();
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const headroom = memoryHeadroom(game.estMemoryMB);
  const save = await storage.getSave(game.id);
  saves = new Map(save ? [[game.id, { gameId: game.id, updatedAt: save.updatedAt, bytes: save.bytes }]] : []);

  const shareUrl = `${location.origin}${location.pathname}#/play/${game.id}`;
  const shareInput = el('input', { class: 'share-url', readonly: true, value: shareUrl, 'aria-label': 'Direct link to this game' });
  const copyBtn = el('button', {
    class: 'btn btn--sm', type: 'button', text: 'Copy link',
    onclick: async () => {
      try { await navigator.clipboard.writeText(shareUrl); } catch { shareInput.select(); document.execCommand('copy'); }
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1600);
    },
  });

  const keys = controlKeys(game);

  const node = el('div', { class: 'detail-wrap' },
    heroFor(game, caps, label(game.category)),
    el('div', { class: 'detail-body' },
      el('div', {},
        el('a', { class: 'back-link', href: '#/', text: '← All games' }),

        !supported ? el('div', { class: 'notice notice--block', style: 'margin-top:18px' },
          el('strong', { text: 'This device can’t run it' }),
          el('p', { text: `${game.title} needs ${TIER_LABEL[game.minRendererTier]} and this browser reports ${TIER_LABEL[caps.tier] || 'no renderer'}. On ChromeOS check chrome://gpu — hardware acceleration being off is the usual cause.` }),
        ) : null,

        supported && caps.software ? el('div', { class: 'notice', style: 'margin-top:18px' },
          el('strong', { text: 'Software rendering' }),
          el('p', { text: 'Hardware acceleration looks disabled, so 3D titles will run slowly. The resolution scaler will drop quality to compensate.' }),
        ) : null,

        supported && headroom.tight ? el('div', { class: 'notice', style: 'margin-top:18px' },
          el('strong', { text: 'Memory will be tight' }),
          el('p', { text: `${game.title} expects about ${game.estMemoryMB} MB and this tab has roughly ${headroom.freeMB} MB free. Close other tabs if it stutters.` }),
        ) : null,

        el('p', { class: 'detail-desc', style: 'margin-top:18px', text: game.description || '' }),

        keys.length ? el('div', { style: 'margin-bottom:26px' },
          el('h3', { text: 'Controls' }),
          el('div', { class: 'keys' }, ...keys.map((k) => el('span', { class: 'key', text: k }))),
        ) : null,

        el('div', {},
          el('h3', { text: 'Direct link' }),
          el('p', { class: 'muted', style: 'margin:0;font-size:13.5px', text: 'Opens straight into this game. Works on any device the site is deployed to.' }),
          el('div', { class: 'share-row' }, shareInput, copyBtn),
        ),
      ),

      el('div', {},
        el('h3', { text: 'Details' }),
        el('dl', { class: 'spec-list' },
          spec('Category', label(game.category)),
          spec('Players', game.players || '1 player'),
          game.duration ? spec('Session', game.duration) : null,
          spec('Renderer', TIER_LABEL[game.minRendererTier]),
          spec('Memory', `~${game.estMemoryMB} MB`),
          spec('Download', fmtBytes(game.bytes)),
          spec('Version', `${game.version}`),
          save ? spec('Save', fmtAgo(save.updatedAt)) : spec('Save', 'None yet'),
        ),
        save ? el('div', { class: 'share-row' },
          el('a', { class: 'btn btn--sm', href: `#/play/${game.id}?fresh=1`, text: 'Start fresh' }),
          el('button', {
            class: 'btn btn--sm btn--ghost', type: 'button', text: 'Delete save',
            onclick: async () => {
              if (!confirm(`Delete the save for ${game.title}?`)) return;
              await storage.deleteSave(game.id);
              renderDetails(id);
            },
          }),
        ) : null,
      ),
    ),
  );
  mount(node);
  return node;
}

function spec(dt, dd) { return el('div', {}, el('dt', { text: dt }), el('dd', { text: dd })); }

// --------------------------------------------------------------- player --

let session = null;

export async function renderPlayer(id, opts = {}) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);
  if (opts.fresh) await storage.deleteSave(game.id);

  const hud = el('span', { class: 'hud' });
  const saveDot = el('span', { class: 'save-dot', title: 'Save status' });
  // Quality is stored per game and applied at launch: most engines read their
  // pixel ratio once, at construction, so changing it live is a request the
  // game may ignore. Restarting the frame is the version that always works.
  const pref = await storage.getMeta(`res:${game.id}`, null);
  const resSelect = el('select', {
    class: 'res-select', 'aria-label': 'Resolution',
    onchange: async (e) => {
      const v = e.target.value === 'auto' ? null : parseFloat(e.target.value);
      await storage.setMeta(`res:${game.id}`, v);
      session?.setResolutionScale(v);          // free if the game honours it live
      renderPlayer(id);                        // and guaranteed after a relaunch
    },
  },
    el('option', { value: 'auto', text: 'Quality auto' }),
    ...[['1', 'Quality max'], ['0.85', 'Quality high'], ['0.72', 'Quality balanced'],
        ['0.6', 'Performance'], ['0.5', 'Performance+']].map(([v, t]) =>
      el('option', { value: v, text: t, selected: pref != null && Math.abs(pref - parseFloat(v)) < 0.01 })),
  );

  const mountEl = el('div', { class: 'frame-mount' });
  const overlay = el('div', { class: 'frame-overlay' },
    el('div', { class: 'spinner' }),
    el('p', { class: 'overlay-note', text: `Loading ${game.title}… ${fmtBytes(game.bytes)}` }),
  );

  const node = mount(el('div', { class: 'player' },
    el('div', { class: 'player-bar' },
      el('button', { class: 'btn btn--ghost btn--sm', onclick: () => navigate('/'), text: '← Library' }),
      el('span', { class: 'player-title', text: game.title }),
      hud, saveDot, resSelect,
      el('button', {
        class: 'btn btn--ghost btn--sm', title: 'Fullscreen', text: '⛶',
        onclick: () => {
          const wrap = document.querySelector('.player');
          if (document.fullscreenElement) document.exitFullscreen();
          else wrap?.requestFullscreen?.().catch(() => {});
        },
      }),
    ),
    el('div', { class: 'frame-wrap' }, mountEl, overlay),
  ));

  const setOverlay = (content) => {
    clear(overlay);
    if (!content) { overlay.classList.add('hidden'); return; }
    overlay.classList.remove('hidden');
    overlay.append(content);
  };

  try {
    session = await launcher.launch(game, mountEl, {
      onReady: ({ ms }) => {
        setOverlay(null);
        hud.textContent = `${Math.round(ms)} ms`;
        window.__portal = { ...(window.__portal || {}), lastLaunch: { id: game.id, ms } };
      },
      onStats: (s) => {
        window.__portal = { ...(window.__portal || {}), lastStats: s };
        const bits = [];
        if (s.fps) bits.push(`${Math.round(s.fps)} fps`);
        if (s.scale) bits.push(`${Math.round(s.scale * 100)}%`);
        if (s.heapMB) bits.push(`${Math.round(s.heapMB)} MB`);
        hud.textContent = bits.join('  ');
        if (memoryHeadroom(game.estMemoryMB).freeMB < 120) session?.lowMemory(2);
      },
      onSaved: () => {
        saveDot.textContent = '●';
        saveDot.title = 'Saved ' + new Date().toLocaleTimeString();
        clearTimeout(saveDot._t);
        saveDot._t = setTimeout(() => { saveDot.textContent = ''; }, 1500);
      },
      onExit: () => navigate('/'),
      onError: ({ message, fatal }) => {
        if (!fatal) { console.warn('[game]', message); return; }
        setOverlay(el('div', { class: 'overlay-error' },
          el('div', { class: 'overlay-title', text: 'That title stopped responding' }),
          el('p', { class: 'overlay-note', text: message }),
          el('button', { class: 'btn btn--play', onclick: () => navigate('/'), text: 'Back to library' }),
        ));
      },
    }, { resolutionScale: pref });
  } catch (err) {
    setOverlay(el('div', { class: 'overlay-error' },
      el('div', { class: 'overlay-title', text: 'Can’t launch here' }),
      el('p', { class: 'overlay-note', text: err.message }),
      el('a', { class: 'btn btn--play', href: `#/game/${game.id}`, text: 'Details' }),
    ));
  }
  return node;
}

export async function teardownPlayer() {
  if (session) { await session.destroy(); session = null; }
  await launcher.closeActive();
}

// -------------------------------------------------------- link generator --

/**
 * Link generator.
 *
 * Produces the three things you actually need to hand a game to someone: a
 * direct URL that opens straight into it, an iframe embed snippet, and a
 * launcher that opens it in its own window. The base URL is editable and
 * remembered, so you can generate the real links for your deployed domain
 * before the deploy is even finished.
 */
export async function renderLinks() {
  const games = catalog.visible();
  const stored = await storage.getMeta('linkBase', null);
  const here = `${location.origin}${location.pathname}`;
  let base = stored || (location.protocol === 'file:' ? 'https://your-site.netlify.app/' : here);

  const baseInput = el('input', {
    class: 'share-url', value: base, spellcheck: 'false',
    'aria-label': 'Base URL of your deployed site',
  });
  const gameSelect = el('select', { class: 'res-select', style: 'height:38px;width:100%;max-width:340px', 'aria-label': 'Game' },
    ...games.map((g) => el('option', { value: g.id, text: g.title })));

  const directOut = el('input', { class: 'share-url', readonly: true, 'aria-label': 'Direct link' });
  const embedOut = el('textarea', {
    class: 'share-url', readonly: true, rows: 3,
    style: 'height:auto;padding:10px 11px;line-height:1.5;resize:vertical', 'aria-label': 'Embed code',
  });
  const listOut = el('textarea', {
    class: 'share-url', readonly: true, rows: 8,
    style: 'height:auto;padding:10px 11px;line-height:1.6;resize:vertical', 'aria-label': 'Every game link',
  });

  function normalise(v) {
    let b = v.trim();
    if (!b) b = here;
    if (!/^https?:\/\//i.test(b) && !b.startsWith('file:')) b = 'https://' + b;
    // A trailing index.html is fine; a bare domain needs the slash.
    if (!/\.html$/i.test(b) && !b.endsWith('/')) b += '/';
    return b;
  }

  function refresh() {
    base = normalise(baseInput.value);
    const id = gameSelect.value;
    const direct = `${base}#/play/${id}`;
    directOut.value = direct;
    embedOut.value =
      `<iframe src="${direct}"\n        width="960" height="540"\n        style="border:0;border-radius:12px"\n        allow="fullscreen; pointer-lock; autoplay; gamepad"\n        title="${games.find((g) => g.id === id)?.title || id}"></iframe>`;
    listOut.value = games.map((g) => `${g.title.padEnd(22)} ${base}#/play/${g.id}`).join('\n');
    storage.setMeta('linkBase', base);
  }

  baseInput.addEventListener('input', refresh);
  gameSelect.addEventListener('change', refresh);

  const copier = (field, labelText) => {
    const b = el('button', {
      class: 'btn btn--sm', type: 'button', text: labelText,
      onclick: async () => {
        try { await navigator.clipboard.writeText(field.value); }
        catch { field.select(); document.execCommand('copy'); }
        b.textContent = 'Copied';
        setTimeout(() => { b.textContent = labelText; }, 1500);
      },
    });
    return b;
  };

  const node = mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:34px;max-width:900px' },
    el('div', {},
      el('a', { class: 'back-link', href: '#/', text: '← All games' }),
      el('h1', { class: 'hero-title', style: 'font-size:clamp(30px,4vw,46px);margin:14px 0 6px', text: 'Link generator' }),
      el('p', { class: 'muted', style: 'margin:0 0 26px;max-width:60ch',
        text: 'Set the address your site is deployed to, pick a game, and copy the link. These open straight into the game, skipping the library.' }),

      el('h3', { text: 'Your site address' }),
      el('div', { class: 'share-row' }, baseInput),
      el('p', { class: 'muted', style: 'margin:6px 0 26px;font-size:12.5px',
        text: 'For example https://nova-arcade.netlify.app/ — whatever your host gives you after deploying.' }),

      el('h3', { text: 'Game' }),
      el('div', { class: 'share-row' }, gameSelect),

      el('h3', { style: 'margin-top:26px', text: 'Direct link' }),
      el('div', { class: 'share-row' }, directOut, copier(directOut, 'Copy'),
        el('button', {
          class: 'btn btn--sm btn--ghost', type: 'button', text: 'Open',
          onclick: () => window.open(directOut.value, '_blank', 'noopener'),
        })),

      el('h3', { style: 'margin-top:26px', text: 'Embed code' }),
      el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:12.5px',
        text: 'Drop this into any page. The allow list is what lets mouse-look work inside the frame.' }),
      el('div', { class: 'share-row' }, embedOut),
      el('div', { class: 'share-row' }, copier(embedOut, 'Copy embed code')),

      el('h3', { style: 'margin-top:26px', text: 'Every game' }),
      el('div', { class: 'share-row' }, listOut),
      el('div', { class: 'share-row' }, copier(listOut, 'Copy all links')),
    ),
  ));

  refresh();
  return node;
}

// ---------------------------------------------------------- diagnostics --

export async function renderDiagnostics() {
  const caps = detect({ force: true });
  const store = await storageInfo();
  const head = memoryHeadroom(0);

  const rows = [
    ['Renderer', TIER_LABEL[caps.tier] || 'none'],
    ['GPU', caps.renderer || 'not exposed'],
    ['Software rasteriser', caps.software ? 'yes — 3D will crawl' : 'no'],
    ['Max texture size', caps.maxTextureSize || '—'],
    ['Instancing', caps.instancing ? 'yes' : 'no'],
    ['OffscreenCanvas', caps.offscreenCanvas ? 'yes' : 'no'],
    ['Pointer lock', caps.pointerLock ? 'present' : 'missing'],
    ['Device memory', caps.deviceMemory ? `${caps.deviceMemory} GB` : 'not reported'],
    ['CPU cores', caps.cores ?? 'not reported'],
    ['Pixel ratio', caps.dpr],
    ['JS heap limit', head.limitMB ? `${head.limitMB} MB (using ${head.usedMB} MB)` : 'not exposed'],
    ['Service worker', navigator.serviceWorker?.controller ? 'controlling' : 'registered, not controlling'],
    ['Storage', store ? `${fmtBytes(store.usage)} of ${fmtBytes(store.quota)}` : 'not reported'],
    ['Network', navigator.onLine ? 'online' : 'offline'],
  ];

  const plResult = el('p', { class: 'muted', style: 'font-size:13.5px', text: 'Not run yet.' });
  const cached = el('tbody');

  const node = mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:34px' },
    el('div', {},
      el('a', { class: 'back-link', href: '#/', text: '← All games' }),
      el('h1', { class: 'hero-title', style: 'font-size:clamp(32px,4vw,48px);margin:14px 0 24px', text: 'This device' }),
      el('table', { class: 'diag-table' }, el('tbody', {},
        ...rows.map(([k, v]) => el('tr', {}, el('th', { scope: 'row', text: k }), el('td', { text: String(v) }))))),

      el('h3', { style: 'margin-top:34px', text: 'Pointer lock' }),
      el('p', { class: 'muted', style: 'font-size:13.5px;max-width:60ch', text: 'Sandboxed frames can refuse pointer lock silently, which breaks mouse-look. This runs the real check in a frame configured exactly like a game launch.' }),
      el('button', { class: 'btn btn--sm', style: 'margin-top:10px', onclick: () => runPointerLockCheck(plResult), text: 'Run check' }),
      plResult,

      el('h3', { style: 'margin-top:34px', text: 'Cached games' }),
      el('table', { class: 'diag-table' }, cached),
      el('div', { class: 'share-row' },
        el('button', { class: 'btn btn--sm btn--ghost', onclick: async () => { await clearCaches(); renderDiagnostics(); }, text: 'Clear cache' }),
      ),
    ),
  ));

  for (const b of (await storage.listBundles()).sort((a, c) => c.lastUsed - a.lastUsed)) {
    cached.append(el('tr', {}, el('th', { scope: 'row', text: b.gameId }), el('td', { text: fmtAgo(b.lastUsed) })));
  }
  if (!cached.children.length) cached.append(el('tr', {}, el('th', { text: 'Nothing cached yet' }), el('td', {})));
  return node;
}

function runPointerLockCheck(target) {
  const probe = catalog.byId('pointer-lock-probe');
  if (!probe) { target.textContent = 'Probe bundle not in the catalog.'; return; }
  clear(target);
  const mountEl = el('div', { class: 'probe-mount' });
  const line = el('p', { class: 'muted', style: 'font-size:13.5px', text: 'Click inside the box, then move the mouse.' });
  target.append(line, mountEl);
  launcher.launch(probe, mountEl, {
    onPointerLock: (locked) => { if (locked) line.textContent = '✓ Pointer lock works in the sandbox.'; },
    onError: ({ message }) => { line.textContent = '⚠ ' + message; },
  });
}

async function clearCaches() {
  if ('caches' in window) {
    for (const k of await caches.keys()) if (k.startsWith('bundles-')) await caches.delete(k);
  }
  for (const b of await storage.listBundles()) await storage.forgetBundle(b.url);
}

export function renderNotFound(message = 'That page doesn’t exist.') {
  return mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:60px' },
    el('div', {},
      el('div', { class: 'overlay-title', text: 'Not found' }),
      el('p', { class: 'overlay-note', style: 'margin:10px 0 20px', text: message }),
      el('a', { class: 'btn btn--play', href: '#/', text: 'Back to library' }),
    )));
}
