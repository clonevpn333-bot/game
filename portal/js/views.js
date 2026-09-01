/**
 * Overclock views — hand-rolled DOM, no framework, no build step.
 *
 * Layout is a fixed left rail plus one scrolling sheet: a spotlight panel and a
 * single responsive grid, filtered from the rail. Everything stays keyboard
 * operable — the target machine is a Chromebook with a trackpad.
 */

import * as catalog from './catalog.js';
import * as launcher from './launcher.js';
import * as storage from './storage.js';
import { detect, meetsTier, TIER_LABEL, memoryHeadroom, storageInfo } from './capabilities.js';
import { navigate, currentPath } from './router.js';

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

const CATEGORY = { action: 'Action', arcade: 'Arcade', puzzle: 'Puzzle', sim: 'Sandbox', coop: 'Co-op', racing: 'Racing' };
const label = (c) => CATEGORY[c] || (c ? c[0].toUpperCase() + c.slice(1) : 'Games');

const fmtAgo = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 90) return 'just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function controlKeys(game) {
  if (Array.isArray(game.controls)) return game.controls.map((c) => `${c.keys} — ${c.action}`);
  if (typeof game.controls === 'string' && game.controls) return game.controls.split('·').map((s) => s.trim()).filter(Boolean);
  return [];
}

let saves = new Map();
let activeFilter = 'all';
let query = '';

// ------------------------------------------------------------------ rail --

export function paintRail() {
  const nav = document.getElementById('rail-nav');
  if (!nav) return;
  clear(nav);
  const path = currentPath() || '/';
  const games = catalog.visible();
  const cats = [...new Set(games.map((g) => g.category || 'action'))];

  const link = (href, text, current) => el('a', {
    class: 'rail-link', href, text, 'aria-current': current ? 'page' : null,
  });

  nav.append(
    link('#/', 'All games', path === '/' && activeFilter === 'all'),
    link('#/links', 'Share links', path === '/links'),
    link('#/diagnostics', 'This device', path === '/diagnostics'),
    el('p', { class: 'rail-group', text: 'Categories' }),
  );

  for (const c of cats) {
    const n = games.filter((g) => (g.category || 'action') === c).length;
    nav.append(el('button', {
      class: 'rail-link', type: 'button', 'aria-pressed': String(path === '/' && activeFilter === c),
      onclick: () => { activeFilter = c; query = ''; navigate('/'); renderLibrary(); },
    },
      el('span', { class: 'dotmark' }),
      label(c),
      el('span', { class: 'rail-count', text: String(n) }),
    ));
  }
}

// --------------------------------------------------------------- library --

export async function renderLibrary(q = query) {
  query = q;
  const caps = detect();
  saves = new Map((await storage.listSaves()).map((s) => [s.gameId, s]));
  const all = catalog.visible();

  const pool = activeFilter === 'all' ? all : all.filter((g) => (g.category || 'action') === activeFilter);
  const list = catalog.search(query, pool);
  const spotlight = all.find((g) => g.spotlight) || all.find((g) => g.featured) || all[0];

  const search = el('input', {
    class: 'search', type: 'search', placeholder: 'Search games', value: query,
    'aria-label': 'Search games', autocomplete: 'off', spellcheck: 'false',
  });
  let debounce = 0;
  search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderLibrary(search.value), 130);
  });

  const grid = el('div', { class: 'grid', role: 'list' });
  for (const g of list) grid.append(card(g, caps));

  // Recently played, most recent first — the row a launcher is judged on.
  const resume = all.filter((g) => saves.has(g.id))
    .sort((a, b) => saves.get(b.id).updatedAt - saves.get(a.id).updatedAt)
    .slice(0, 6);
  const resumeGrid = el('div', { class: 'grid', role: 'list' });
  for (const g of resume) resumeGrid.append(card(g, caps));

  const node = el('div', { class: 'stage' },
    !query && spotlight ? heroFor(spotlight, caps, 'Spotlight') : null,
    !query && activeFilter === 'all' && resume.length ? el('section', { class: 'sheet', style: 'padding-bottom:0' },
      el('div', { class: 'sheet-head' },
        el('h2', { text: 'Continue playing' }),
        el('span', { text: `${resume.length} in progress` })),
      resumeGrid,
    ) : null,
    el('section', { class: 'sheet' },
      el('div', { class: 'sheet-head' },
        el('h2', { text: query ? `“${query.trim()}”` : activeFilter === 'all' ? 'All games' : label(activeFilter) }),
        el('span', { text: `${list.length} title${list.length === 1 ? '' : 's'}` }),
        search,
      ),
      list.length ? grid : el('p', { class: 'empty', text: 'Nothing matches that.' }),
    ),
  );
  mount(node);
  paintRail();
  wireGridKeys(grid);
  return node;
}

function card(game, caps) {
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const save = saves.get(game.id);
  return el('a', {
    class: `card${supported ? '' : ' card--locked'}`,
    href: `#/game/${game.id}`, role: 'listitem', dataset: { id: game.id },
    'aria-label': `${game.title}. ${game.tagline || ''}${supported ? '' : ' Not supported on this device.'}`,
  },
    el('div', { class: 'card-art' },
      !supported ? el('span', { class: 'card-flag card-flag--warn', text: `Needs ${TIER_LABEL[game.minRendererTier]}` })
        : save ? el('span', { class: 'card-flag', text: 'Continue' }) : null,
      el('img', { src: game.thumbnail, alt: '', loading: 'lazy', decoding: 'async', width: 320, height: 180 }),
      el('span', { class: 'card-play', 'aria-hidden': 'true' }, playIcon()),
    ),
    el('div', { class: 'card-body' },
      el('h3', { class: 'card-title', text: game.title }),
      el('p', { class: 'card-sub', text: game.tagline || '' }),
      el('div', { class: 'card-meta' },
        el('span', { text: label(game.category) }),
        el('span', { class: 'dot' }),
        el('span', { text: `${game.estMemoryMB} MB` }),
      ),
    ),
  );
}

function wireGridKeys(grid) {
  const cards = [...grid.querySelectorAll('.card')];
  if (!cards.length) return;
  const cols = () => {
    const top = cards[0].offsetTop;
    let n = 0;
    while (n < cards.length && cards[n].offsetTop === top) n++;
    return Math.max(1, n);
  };
  grid.addEventListener('keydown', (e) => {
    const i = cards.indexOf(e.target.closest('.card'));
    if (i < 0) return;
    const c = cols();
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + c, ArrowUp: i - c, Home: 0, End: cards.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    cards[Math.max(0, Math.min(cards.length - 1, to))].focus();
  });
}

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
        el('span', { class: 'pill pill--amber', text: label(game.category) }),
        el('span', { class: 'pill', text: game.players || '1 player' }),
        game.duration ? el('span', { class: 'pill', text: game.duration }) : null,
        el('span', { class: 'pill', text: `${TIER_LABEL[game.minRendererTier]} · ${game.estMemoryMB} MB` }),
        game.pointerLock ? el('span', { class: 'pill', text: 'Mouse look' }) : null,
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
  svg.setAttribute('width', '13'); svg.setAttribute('height', '13'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M3 1.8v12.4L14 8z');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

// ---------------------------------------------------------------- detail --

export async function renderDetails(id) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);

  const caps = detect();
  const supported = meetsTier(caps.tier, game.minRendererTier);
  const headroom = memoryHeadroom(game.estMemoryMB);
  const save = await storage.getSave(game.id);
  saves = new Map(save ? [[game.id, { gameId: game.id, updatedAt: save.updatedAt }]] : []);

  const shareUrl = `${location.origin}${location.pathname}#/play/${game.id}`;
  const field = el('input', { class: 'field', readonly: true, value: shareUrl, 'aria-label': 'Direct link' });
  const keys = controlKeys(game);

  const node = el('div', { class: 'detail' },
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
          el('p', { text: 'Hardware acceleration looks disabled, so 3D titles will run slowly. Set quality to Performance in the player bar.' }),
        ) : null,

        supported && headroom.tight ? el('div', { class: 'notice', style: 'margin-top:18px' },
          el('strong', { text: 'Memory will be tight' }),
          el('p', { text: `${game.title} expects about ${game.estMemoryMB} MB and this tab has roughly ${headroom.freeMB} MB free. Close other tabs if it stutters.` }),
        ) : null,

        el('p', { class: 'detail-desc', text: game.description || '' }),

        keys.length ? el('div', { style: 'margin-bottom:28px' },
          el('h3', { class: 'sub', text: 'Controls' }),
          el('div', { class: 'keys' }, ...keys.map((k) => el('span', { class: 'key', text: k }))),
        ) : null,

        el('div', {},
          el('h3', { class: 'sub', text: 'Direct link' }),
          el('div', { class: 'row' }, field, copyBtn(field, 'Copy'),
            el('a', { class: 'btn btn--sm btn--ghost', href: '#/links', text: 'More options' })),
        ),
      ),

      el('div', {},
        el('h3', { class: 'sub', text: 'Details' }),
        el('dl', { class: 'spec' },
          spec('Category', label(game.category)),
          spec('Players', game.players || '1 player'),
          game.duration ? spec('Session', game.duration) : null,
          spec('Renderer', TIER_LABEL[game.minRendererTier]),
          spec('Memory', `${game.estMemoryMB} MB`),
          spec('Download', fmtBytes(game.bytes)),
          spec('Mouse look', game.pointerLock ? 'Yes' : 'No'),
          save ? spec('Save', fmtAgo(save.updatedAt)) : spec('Save', 'None yet'),
        ),
        save ? el('div', { class: 'row' },
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
  paintRail();
  return node;
}

const spec = (dt, dd) => el('div', {}, el('dt', { text: dt }), el('dd', { text: dd }));

function copyBtn(field, text) {
  const b = el('button', {
    class: 'btn btn--sm', type: 'button', text,
    onclick: async () => {
      try { await navigator.clipboard.writeText(field.value); }
      catch { field.select(); document.execCommand('copy'); }
      b.textContent = 'Copied';
      setTimeout(() => { b.textContent = text; }, 1500);
    },
  });
  return b;
}

// ---------------------------------------------------------------- player --

let session = null;

export async function renderPlayer(id, opts = {}) {
  const game = catalog.byId(id);
  if (!game) return renderNotFound(`No game with id “${id}”.`);
  if (opts.fresh) await storage.deleteSave(game.id);

  const hud = el('span', { class: 'hud' });
  const saveDot = el('span', { class: 'save-dot', title: 'Save status' });
  const pref = await storage.getMeta(`res:${game.id}`, null);

  // Quality applies at launch: these engines read their pixel ratio once, at
  // construction, so changing it live is a request the game may ignore.
  const resSelect = el('select', {
    class: 'res-select', 'aria-label': 'Quality',
    onchange: async (e) => {
      const v = e.target.value === 'auto' ? null : parseFloat(e.target.value);
      await storage.setMeta(`res:${game.id}`, v);
      session?.setResolutionScale(v);
      renderPlayer(id);
    },
  },
    el('option', { value: 'auto', text: 'Quality auto' }),
    ...[['1', 'Max'], ['0.85', 'High'], ['0.72', 'Balanced'], ['0.6', 'Performance'], ['0.5', 'Performance+']]
      .map(([v, t]) => el('option', { value: v, text: t, selected: pref != null && Math.abs(pref - parseFloat(v)) < 0.01 })),
  );

  const mountEl = el('div', { class: 'frame-mount' });
  const overlay = el('div', { class: 'frame-overlay' },
    el('div', { class: 'spinner' }),
    el('p', { class: 'overlay-note', text: `Loading ${game.title} · ${fmtBytes(game.bytes)}` }),
  );
  // Pointer lock needs a real click inside the frame; say so rather than
  // leaving the player wondering why mouse-look is dead.
  const lockHint = game.pointerLock
    ? el('div', { class: 'lock-hint' }, 'Click the game to capture the mouse · ', el('b', { text: 'Esc' }), ' releases it')
    : null;

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
    el('div', { class: 'frame-wrap' }, mountEl, overlay, lockHint),
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
      onPointerLock: (locked, error) => {
        if (!lockHint) return;
        if (locked) { lockHint.style.display = 'none'; return; }
        lockHint.style.display = '';
        if (error) {
          clear(lockHint);
          lockHint.append('Mouse capture failed — click the game again');
        }
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

// ----------------------------------------------------------------- links --

/**
 * Link tools. Three things you actually need to hand a game to someone: a
 * direct URL, an iframe embed with the right permission list, and a launcher
 * that opens the site in a blank window.
 */
export async function renderLinks() {
  const games = catalog.visible();
  const here = `${location.origin}${location.pathname}`;
  const stored = await storage.getMeta('linkBase', null);
  let base = stored || (location.protocol === 'file:' ? 'https://your-site.netlify.app/' : here);

  const baseField = el('input', { class: 'field', value: base, spellcheck: 'false', 'aria-label': 'Your site address' });
  const gameSelect = el('select', { class: 'res-select', style: 'height:38px;min-width:220px', 'aria-label': 'Game' },
    ...games.map((g) => el('option', { value: g.id, text: g.title })));
  const directField = el('input', { class: 'field', readonly: true, 'aria-label': 'Direct link' });
  const embedField = el('textarea', { class: 'field', readonly: true, rows: 3, 'aria-label': 'Embed code' });
  const allField = el('textarea', { class: 'field', readonly: true, rows: 8, 'aria-label': 'Every link' });
  const titleField = el('input', { class: 'field', value: 'New Tab', 'aria-label': 'Window title' });
  const launcherField = el('input', { class: 'field', readonly: true, 'aria-label': 'Launcher link' });
  const b64 = (v) => btoa(unescape(encodeURIComponent(v))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const normalise = (v) => {
    let b = (v || '').trim() || here;
    if (!/^https?:\/\//i.test(b) && !b.startsWith('file:')) b = 'https://' + b;
    if (!/\.html$/i.test(b) && !b.endsWith('/')) b += '/';
    return b;
  };

  function refresh() {
    base = normalise(baseField.value);
    const id = gameSelect.value;
    const direct = `${base}#/play/${id}`;
    const title = games.find((g) => g.id === id)?.title || id;
    directField.value = direct;
    embedField.value =
      `<iframe src="${direct}"\n        width="960" height="540"\n        style="border:0;border-radius:12px"\n` +
      `        allow="fullscreen; pointer-lock; autoplay; gamepad"\n        title="${title}"></iframe>`;
    allField.value = games.map((g) => `${g.title.padEnd(20)} ${base}#/play/${g.id}`).join('\n');
    const cloakBase = base.replace(/(index\.html)?$/, 'cloak.html');
    launcherField.value = `${cloakBase}#u=${b64(direct)}&t=${b64(titleField.value || 'New Tab')}&go=1`;
    storage.setMeta('linkBase', base);
  }
  baseField.addEventListener('input', refresh);
  gameSelect.addEventListener('change', refresh);
  titleField.addEventListener('input', refresh);

  // A single-file build carries the whole arcade in the page, which is what
  // makes the offline path below possible.
  const isSingleFile = !!document.getElementById('catalog-data');

  /**
   * Opens the arcade in a window that stays on about:blank.
   *
   * Two ways in, because one of them does not work everywhere:
   *
   *   src    — the frame points at the deployed URL. Cheapest, keeps the
   *            service worker and storage, and is what every cloaker does. It
   *            needs the site served over http(s): a blank window cannot frame
   *            a file:// URL, and Chrome hands you an empty frame if you try.
   *   srcdoc — the frame is given the page's own HTML. There is no URL to
   *            block, so it works straight off the filesystem with no server.
   *            Only possible for a single-file build, where nothing is external.
   */
  function openBlank() {
    const title = (titleField.value || 'New Tab').replace(/[<>]/g, '');
    const local = location.protocol === 'file:';

    if (local && !isSingleFile) {
      alert('This copy loads its files separately, so a blank window has nothing to '
          + 'point at offline.\n\nEither host the site, or open portal.html — the '
          + 'single-file build does this with no server.');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      alert('Your browser blocked the pop-up. Allow pop-ups for this site and try again.');
      return;
    }

    const doc = win.document;
    doc.title = title;
    const icon = doc.createElement('link');
    icon.rel = 'icon';
    icon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23dfe3e8'/%3E%3C/svg%3E";
    doc.head.appendChild(icon);
    doc.documentElement.style.height = '100%';
    doc.body.style.cssText = 'margin:0;height:100vh;background:#000;overflow:hidden';

    const frame = doc.createElement('iframe');
    frame.setAttribute('allow', 'fullscreen; pointer-lock; autoplay; gamepad');
    frame.style.cssText = 'border:0;display:block;width:100%;height:100%';

    if (local || isSingleFile) {
      // Serialise this page minus whatever is rendered into it; the copy boots
      // itself and renders fresh.
      const clone = document.documentElement.cloneNode(true);
      const view = clone.querySelector('#view');
      if (view) view.innerHTML = '';
      frame.srcdoc = '<!DOCTYPE html>' + clone.outerHTML;
    } else {
      frame.src = directField.value;
    }
    doc.body.appendChild(frame);
  }

  const node = mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:34px;max-width:860px' },
    el('div', {},
      el('a', { class: 'back-link', href: '#/', text: '← All games' }),
      el('h1', { class: 'hero-title', style: 'font-size:clamp(28px,3.4vw,42px);margin:14px 0 6px', text: 'Share links' }),
      el('p', { class: 'muted', style: 'margin:0 0 30px;max-width:60ch',
        text: 'Set the address your site is deployed to, pick a game, and copy a link. These open straight into the game and skip the library.' }),

      el('h3', { class: 'sub', text: 'Your site address' }),
      el('div', { class: 'row' }, baseField),
      el('p', { class: 'muted', style: 'margin:6px 0 28px;font-size:12.5px',
        text: 'For example https://overclock.netlify.app/ — whatever your host gives you after deploying.' }),

      el('h3', { class: 'sub', text: 'Game' }),
      el('div', { class: 'row' }, gameSelect),

      el('h3', { class: 'sub', style: 'margin-top:28px', text: 'Direct link' }),
      el('div', { class: 'row' }, directField, copyBtn(directField, 'Copy'),
        el('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: 'Open', onclick: () => window.open(directField.value, '_blank', 'noopener') })),

      el('h3', { class: 'sub', style: 'margin-top:28px', text: 'Blank-window launcher' }),
      el('p', { class: 'muted', style: 'margin:0 0 10px;font-size:12.5px',
        text: isSingleFile
          ? 'Opens a new tab that stays on about:blank with the whole arcade inside it. This build carries every game in the page, so it works with no server and no connection.'
          : 'Opens a new tab that stays on about:blank and frames the site inside it. Set the window title first.' }),
      el('div', { class: 'row' }, titleField,
        el('button', { class: 'btn btn--sm btn--play', type: 'button', text: 'Open blank window', onclick: openBlank })),
      el('div', { class: 'row' }, launcherField, copyBtn(launcherField, 'Copy launcher link')),
      el('p', { class: 'muted', style: 'margin:8px 0 0;font-size:12px',
        text: 'The launcher link opens the blank window on arrival. /cloak.html ships with the site as a standalone copy.' }),

      el('h3', { class: 'sub', style: 'margin-top:28px', text: 'Embed code' }),
      el('p', { class: 'muted', style: 'margin:0 0 8px;font-size:12.5px',
        text: 'Paste into any page. The allow list is what makes mouse-look work inside the frame.' }),
      el('div', { class: 'row' }, embedField),
      el('div', { class: 'row' }, copyBtn(embedField, 'Copy embed code')),

      el('h3', { class: 'sub', style: 'margin-top:28px', text: 'Every game' }),
      el('div', { class: 'row' }, allField),
      el('div', { class: 'row' }, copyBtn(allField, 'Copy all links')),
    ),
  ));
  refresh();
  paintRail();
  return node;
}

// ----------------------------------------------------------- diagnostics --

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
    ['Pointer lock', caps.pointerLock ? 'present' : 'missing'],
    ['Device memory', caps.deviceMemory ? `${caps.deviceMemory} GB` : 'not reported'],
    ['CPU cores', caps.cores ?? 'not reported'],
    ['Pixel ratio', caps.dpr],
    ['JS heap limit', head.limitMB ? `${head.limitMB} MB (using ${head.usedMB} MB)` : 'not exposed'],
    ['Service worker', navigator.serviceWorker?.controller ? 'controlling' : 'registered, not controlling'],
    ['Storage', store ? `${fmtBytes(store.usage)} of ${fmtBytes(store.quota)}` : 'not reported'],
    ['Saves are stored in', storage.backend()],
    ['Network', navigator.onLine ? 'online' : 'offline'],
  ];

  const plResult = el('p', { class: 'muted', style: 'font-size:13.5px', text: 'Not run yet.' });
  const cached = el('tbody');

  const node = mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:34px;max-width:760px' },
    el('div', {},
      el('a', { class: 'back-link', href: '#/', text: '← All games' }),
      el('h1', { class: 'hero-title', style: 'font-size:clamp(28px,3.4vw,42px);margin:14px 0 24px', text: 'This device' }),
      el('table', { class: 'table' }, el('tbody', {},
        ...rows.map(([k, v]) => el('tr', {}, el('th', { scope: 'row', text: k }), el('td', { text: String(v) }))))),

      el('h3', { class: 'sub', style: 'margin-top:34px', text: 'Pointer lock' }),
      el('p', { class: 'muted', style: 'font-size:13.5px;max-width:60ch',
        text: 'Sandboxed frames can refuse pointer lock silently, which kills mouse-look. This runs the real check in a frame configured exactly like a game launch.' }),
      el('button', { class: 'btn btn--sm', style: 'margin-top:10px', onclick: () => runPointerLockCheck(plResult), text: 'Run check' }),
      plResult,

      el('h3', { class: 'sub', style: 'margin-top:34px', text: 'Cached games' }),
      el('table', { class: 'table' }, cached),
      el('div', { class: 'row' },
        el('button', { class: 'btn btn--sm btn--ghost', onclick: async () => { await clearCaches(); renderDiagnostics(); }, text: 'Clear cache' })),
    ),
  ));

  for (const b of (await storage.listBundles()).sort((a, c) => c.lastUsed - a.lastUsed)) {
    cached.append(el('tr', {}, el('th', { scope: 'row', text: b.gameId }), el('td', { text: fmtAgo(b.lastUsed) })));
  }
  if (!cached.children.length) cached.append(el('tr', {}, el('th', { text: 'Nothing cached yet' }), el('td', {})));
  paintRail();
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
    onPointerLock: (locked, error) => {
      if (locked) line.textContent = '✓ Pointer lock works in the sandbox.';
      else if (error) line.textContent = '⚠ ' + error;
    },
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
  paintRail();
  return mount(el('div', { class: 'detail-body', style: 'grid-template-columns:1fr;padding-top:60px' },
    el('div', {},
      el('div', { class: 'overlay-title', text: 'Not found' }),
      el('p', { class: 'overlay-note', style: 'margin:10px 0 20px', text: message }),
      el('a', { class: 'btn btn--play', href: '#/', text: 'Back to library' }),
    )));
}
