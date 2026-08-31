/**
 * Portal views (§2.1) — hand-rolled DOM, no framework, no build step.
 *
 * Every view is fully keyboard operable: the target hardware is a Chromebook
 * with a trackpad, and reaching for a mouse is not an option we design around.
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

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function mount(node) {
  const v = view();
  clear(v);
  v.append(node);
  return node;
}

const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmtAgo = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

// ---------------------------------------------------------------- library --

let gridState = { query: '', saves: new Map() };

export async function renderLibrary(query = gridState.query) {
  gridState.query = query;
  const caps = detect();
  const saves = await storage.listSaves();
  gridState.saves = new Map(saves.map((s) => [s.gameId, s]));

  const all = catalog.visible();
  const list = catalog.search(query, all);

  const grid = el('div', { class: 'grid', role: 'list', id: 'grid' });
  for (const game of list) grid.append(card(game, caps));

  const empty = list.length === 0
    ? el('p', { class: 'empty', text: query ? `Nothing matches “${query}”.` : 'No games in the catalog yet.' })
    : null;

  const node = el('div', { class: 'library' },
    el('div', { class: 'library-head' },
      el('h1', { text: 'Library' }),
      el('p', { class: 'sub' },
        `${all.length} title${all.length === 1 ? '' : 's'} · this device renders `,
        el('strong', { text: TIER_LABEL[caps.tier] || 'nothing' }),
        caps.software ? ' (software renderer — expect low frame rates)' : ''),
    ),
    empty || grid,
  );
  mount(node);
  if (list.length) initGridKeyboard(grid);
  return node;
}

function card(game, caps) {
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const save = gridState.saves.get(game.id);
  const href = `#/game/${game.id}`;

  return el('a', {
    class: `card${supported ? '' : ' card--unsupported'}`,
    href,
    role: 'listitem',
    tabindex: -1,
    'aria-label': `${game.title}. ${game.tagline || ''} Needs ${TIER_LABEL[game.minRendererTier]}, about ${game.estMemoryMB} megabytes.${supported ? '' : ' Not supported on this device.'}`,
    dataset: { id: game.id },
  },
    el('div', { class: 'thumb' },
      el('img', { src: game.thumbnail, alt: '', loading: 'lazy', decoding: 'async', width: 320, height: 180 }),
      !supported ? el('span', { class: 'thumb-lock', text: 'Needs ' + TIER_LABEL[game.minRendererTier] }) : null,
    ),
    el('div', { class: 'card-body' },
      el('h2', { class: 'card-title', text: game.title }),
      el('p', { class: 'card-tagline', text: game.tagline || '' }),
      el('div', { class: 'badges' },
        el('span', { class: 'badge', title: 'Minimum renderer tier', text: TIER_LABEL[game.minRendererTier] }),
        el('span', { class: 'badge', title: 'Estimated steady-state heap', text: `~${game.estMemoryMB} MB` }),
        el('span', { class: 'badge badge--quiet', title: 'Bundle download size', text: fmtBytes(game.bytes) }),
        game.pointerLock ? el('span', { class: 'badge badge--quiet', title: 'Uses pointer lock', text: 'mouse-look' }) : null,
        save ? el('span', { class: 'badge badge--save', title: `Saved ${fmtAgo(save.updatedAt)}`, text: 'saved' }) : null,
      ),
    ),
  );
}

/** Roving tabindex + 2D arrow navigation over the card grid. */
function initGridKeyboard(grid) {
  const cards = [...grid.querySelectorAll('.card')];
  if (!cards.length) return;
  let index = 0;
  const setActive = (i, focus = true) => {
    index = Math.max(0, Math.min(cards.length - 1, i));
    cards.forEach((c, n) => { c.tabIndex = n === index ? 0 : -1; });
    if (focus) cards[index].focus();
  };
  setActive(0, false);

  const columns = () => {
    const top = cards[0].offsetTop;
    let n = 0;
    while (n < cards.length && cards[n].offsetTop === top) n++;
    return Math.max(1, n);
  };

  grid.addEventListener('keydown', (e) => {
    const cols = columns();
    switch (e.key) {
      case 'ArrowRight': setActive(index + 1); break;
      case 'ArrowLeft':  setActive(index - 1); break;
      case 'ArrowDown':  setActive(index + cols); break;
      case 'ArrowUp':    setActive(index - cols); break;
      case 'Home':       setActive(0); break;
      case 'End':        setActive(cards.length - 1); break;
      default: return;
    }
    e.preventDefault();
  });
  grid.addEventListener('focusin', (e) => {
    const i = cards.indexOf(e.target.closest('.card'));
    if (i >= 0) setActive(i, false);
  });
}

// ---------------------------------------------------------------- details --

export async function renderDetails(id) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);

  const caps = detect();
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const headroom = memoryHeadroom(game.estMemoryMB);
  const save = await storage.getSave(game.id);

  const actions = el('div', { class: 'detail-actions' });
  if (supported) {
    actions.append(el('a', { class: 'btn btn--primary', href: `#/play/${game.id}`, text: save ? 'Continue' : 'Play' }));
    if (save) {
      actions.append(el('a', { class: 'btn', href: `#/play/${game.id}?fresh=1`, text: 'New game' }));
      actions.append(el('button', {
        class: 'btn btn--quiet',
        onclick: async () => {
          if (!confirm(`Delete the save for ${game.title}? This cannot be undone.`)) return;
          await storage.deleteSave(game.id);
          renderDetails(id);
        },
        text: 'Delete save',
      }));
    }
  }

  const node = el('div', { class: 'detail' },
    el('a', { class: 'back-link', href: '#/', text: '← Library' }),
    el('div', { class: 'detail-grid' },
      el('img', { class: 'detail-thumb', src: game.thumbnail, alt: '', width: 480, height: 270 }),
      el('div', {},
        el('h1', { text: game.title }),
        el('p', { class: 'sub', text: game.tagline || '' }),
        el('p', { class: 'detail-desc', text: game.description || '' }),

        !supported ? el('div', { class: 'notice notice--block' },
          el('strong', { text: 'This device can’t run this title.' }),
          el('p', { text: `${game.title} needs ${TIER_LABEL[game.minRendererTier]}; this browser reports ${TIER_LABEL[caps.tier] || 'no renderer'}. Rather than launching into a crash, the portal stops here.` }),
          el('p', { class: 'muted', text: 'On ChromeOS, check chrome://gpu — hardware acceleration being off is the usual cause.' }),
        ) : null,

        supported && caps.software ? el('div', { class: 'notice' },
          el('strong', { text: 'Software renderer detected.' }),
          el('p', { text: 'Hardware acceleration appears to be off, so 3D titles will run well below the 30 fps floor.' }),
        ) : null,

        supported && headroom.tight ? el('div', { class: 'notice' },
          el('strong', { text: 'Memory will be tight.' }),
          el('p', { text: `${game.title} expects about ${game.estMemoryMB} MB and this tab has roughly ${headroom.freeMB} MB of headroom left. Close other tabs if it stutters.` }),
        ) : null,

        actions,

        el('dl', { class: 'specs' },
          spec('Renderer', TIER_LABEL[game.minRendererTier]),
          spec('Est. memory', `${game.estMemoryMB} MB`),
          spec('Bundle', `${fmtBytes(game.bytes)} (${fmtBytes(game.gzipBytes)} over the wire)`),
          spec('Version', `${game.version} · ${game.hash}`),
          spec('Pointer lock', game.pointerLock ? 'Required for mouse-look' : 'Not used'),
          save ? spec('Save', `${fmtAgo(save.updatedAt)} · ${fmtBytes(save.bytes || 0)}`) : spec('Save', 'None yet'),
        ),

        game.controls?.length ? el('div', { class: 'controls' },
          el('h3', { text: 'Controls' }),
          el('table', { class: 'controls-table' },
            el('tbody', {}, ...game.controls.map((c) =>
              el('tr', {}, el('th', { scope: 'row', text: c.keys }), el('td', { text: c.action })))),
          ),
        ) : null,
      ),
    ),
  );
  mount(node);
  node.querySelector('.btn')?.focus();
  return node;
}

function spec(label, value) {
  return el('div', { class: 'spec' }, el('dt', { text: label }), el('dd', { text: value }));
}

// ----------------------------------------------------------------- player --

let session = null;

export async function renderPlayer(id, opts = {}) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);

  if (opts.fresh) await storage.deleteSave(game.id);

  const hud = el('span', { class: 'hud', 'aria-live': 'off' });
  const saveDot = el('span', { class: 'save-dot', title: 'Save status', text: '' });

  const resSelect = el('select', { class: 'res-select', 'aria-label': 'Resolution scale',
    onchange: (e) => {
      const v = e.target.value;
      session?.setResolutionScale(v === 'auto' ? null : parseFloat(v));
    } },
    el('option', { value: 'auto', text: 'Res: auto' }),
    ...['1', '0.9', '0.8', '0.75', '0.6', '0.5'].map((v) => el('option', { value: v, text: `Res: ${Math.round(v * 100)}%` })),
  );

  const bar = el('div', { class: 'player-bar' },
    el('button', { class: 'btn btn--quiet', onclick: () => navigate('/'), text: '← Library' }),
    el('span', { class: 'player-title', text: game.title }),
    hud, saveDot, resSelect,
    el('button', {
      class: 'btn btn--quiet', title: 'Fullscreen (F11 also works)',
      onclick: () => {
        const wrap = document.querySelector('.player');
        if (document.fullscreenElement) document.exitFullscreen();
        else wrap?.requestFullscreen?.().catch(() => {});
      }, text: '⛶',
    }),
  );

  const mountEl = el('div', { class: 'frame-mount' });
  const overlay = el('div', { class: 'frame-overlay' },
    el('div', { class: 'spinner' }),
    el('p', { class: 'overlay-text', text: `Loading ${game.title}…` }),
  );

  const node = mount(el('div', { class: 'player' }, bar, el('div', { class: 'frame-wrap' }, mountEl, overlay)));

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
        hud.textContent = `${Math.round(ms)} ms to interactive`;
        // Test hook: the benchmark and soak harnesses read launch latency and
        // live stats from here rather than scraping the HUD.
        window.__portal = { ...(window.__portal || {}), lastLaunch: { id: game.id, ms } };
      },
      onStats: (s) => {
        window.__portal = { ...(window.__portal || {}), lastStats: s };
        const bits = [];
        if (s.fps) bits.push(`${Math.round(s.fps)} fps`);
        if (s.scale) bits.push(`${Math.round(s.scale * 100)}%`);
        if (s.heapMB) bits.push(`${Math.round(s.heapMB)} MB`);
        hud.textContent = bits.join(' · ');
        // Nudge the game to release what it can before the tab gets killed.
        const h = memoryHeadroom(game.estMemoryMB);
        if (h.freeMB < 120) session?.lowMemory(2);
      },
      onSaved: () => {
        saveDot.textContent = '💾';
        saveDot.title = 'Saved ' + new Date().toLocaleTimeString();
        clearTimeout(saveDot._t);
        saveDot._t = setTimeout(() => { saveDot.textContent = ''; }, 1600);
      },
      onExit: () => navigate('/'),
      onError: ({ message, fatal }) => {
        console.warn('[game]', message);
        if (!fatal) return;
        setOverlay(el('div', { class: 'overlay-error' },
          el('strong', { text: 'This title stopped responding.' }),
          el('p', { text: message }),
          el('button', { class: 'btn btn--primary', onclick: () => navigate('/'), text: 'Back to library' }),
        ));
      },
    });
  } catch (err) {
    setOverlay(el('div', { class: 'overlay-error' },
      el('strong', { text: 'Can’t launch on this device.' }),
      el('p', { text: err.message }),
      el('a', { class: 'btn btn--primary', href: `#/game/${game.id}`, text: 'Details' }),
    ));
  }
  return node;
}

/** Called by the router before every navigation away from the player. */
export async function teardownPlayer() {
  if (session) { await session.destroy(); session = null; }
  await launcher.closeActive();
}

// ------------------------------------------------------------ diagnostics --

export async function renderDiagnostics() {
  const caps = detect({ force: true });
  const store = await storageInfo();
  const head = memoryHeadroom(0);

  const rows = [
    ['Renderer tier', TIER_LABEL[caps.tier] || 'none'],
    ['GPU', caps.renderer || 'not exposed'],
    ['Software rasteriser', caps.software ? 'yes — 3D titles will crawl' : 'no'],
    ['Max texture size', caps.maxTextureSize || '—'],
    ['Instancing', caps.instancing ? 'yes' : 'no'],
    ['OffscreenCanvas', caps.offscreenCanvas ? 'yes' : 'no'],
    ['Worker rendering', caps.workerRendering ? 'available' : 'unavailable — main thread fallback'],
    ['Pointer lock API', caps.pointerLock ? 'present' : 'missing'],
    ['Device memory', caps.deviceMemory ? `${caps.deviceMemory} GB` : 'not reported'],
    ['CPU cores', caps.cores ?? 'not reported'],
    ['devicePixelRatio', caps.dpr],
    ['JS heap limit', head.limitMB ? `${head.limitMB} MB (using ${head.usedMB} MB)` : 'not exposed'],
    ['Service worker', navigator.serviceWorker?.controller ? 'controlling this page' : caps.serviceWorker ? 'registered, not yet controlling' : 'unsupported'],
    ['Storage', store ? `${fmtBytes(store.usage)} of ${fmtBytes(store.quota)} (${Math.round(store.pct * 100)}%)` : 'not reported'],
    ['Network', navigator.onLine ? 'online' : 'offline'],
  ];

  const plResult = el('p', { class: 'muted', text: 'Not run yet.' });
  const bundles = el('tbody');

  const node = mount(el('div', { class: 'detail' },
    el('a', { class: 'back-link', href: '#/', text: '← Library' }),
    el('h1', { text: 'Diagnostics' }),
    el('p', { class: 'sub', text: 'What this device actually supports, and what the portal has cached.' }),
    el('table', { class: 'diag-table' }, el('tbody', {},
      ...rows.map(([k, v]) => el('tr', {}, el('th', { scope: 'row', text: k }), el('td', { text: String(v) }))))),

    el('h2', { text: 'Pointer lock' }),
    el('p', { class: 'muted', text: 'Sandboxed iframes can silently refuse pointer lock even with allow-pointer-lock set, so verify it on the real device (§2.2).' }),
    el('button', { class: 'btn', onclick: () => runPointerLockCheck(plResult), text: 'Run pointer-lock check' }),
    plResult,

    el('h2', { text: 'Cached bundles' }),
    el('table', { class: 'diag-table' }, el('thead', {}, el('tr', {},
      el('th', { text: 'Game' }), el('th', { text: 'Version' }), el('th', { text: 'Last played' }))), bundles),
    el('div', { class: 'detail-actions' },
      el('button', { class: 'btn', onclick: async () => { await clearCaches(); renderDiagnostics(); }, text: 'Clear cached bundles' }),
      el('a', { class: 'btn btn--quiet', href: '#/', text: 'Done' }),
    ),
  ));

  for (const b of (await storage.listBundles()).sort((a, c) => c.lastUsed - a.lastUsed)) {
    bundles.append(el('tr', {},
      el('td', { text: b.gameId }), el('td', { text: b.version || '—' }), el('td', { text: fmtAgo(b.lastUsed) })));
  }
  if (!bundles.children.length) bundles.append(el('tr', {}, el('td', { colspan: 3, text: 'Nothing cached yet.' })));
  return node;
}

/**
 * Launches the pointer-lock probe bundle in a sandboxed frame configured
 * exactly like a real launch, and reports whether the lock actually engaged.
 */
function runPointerLockCheck(target) {
  const probe = catalog.byId('pointer-lock-probe');
  if (!probe) { target.textContent = 'Probe bundle not in the catalog.'; return; }
  clear(target);
  target.className = '';
  const mountEl = el('div', { class: 'probe-mount' });
  target.append(el('p', { class: 'muted', text: 'Click inside the box below, then move the mouse or trackpad.' }), mountEl);

  launcher.launch(probe, mountEl, {
    onPointerLock: (locked) => {
      if (!locked) return;
      target.querySelector('p').textContent = '✅ Pointer lock engaged inside the sandboxed frame.';
    },
    onError: ({ message }) => { target.querySelector('p').textContent = '⚠️ ' + message; },
  });
}

async function clearCaches() {
  if ('caches' in window) {
    for (const k of await caches.keys()) if (k.startsWith('bundles-')) await caches.delete(k);
  }
  for (const b of await storage.listBundles()) await storage.forgetBundle(b.url);
}

// ------------------------------------------------------------------ misc --

export function renderNotFound(message = 'That page doesn’t exist.') {
  return mount(el('div', { class: 'detail' },
    el('h1', { text: 'Not found' }),
    el('p', { class: 'sub', text: message }),
    el('a', { class: 'btn btn--primary', href: '#/', text: 'Back to library' }),
  ));
}
