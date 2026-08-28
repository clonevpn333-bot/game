/* Finds a link that works from the device you are actually on.
 * The same file is served by several unrelated companies; a filter can block a
 * domain but not all of them, and some CDNs hand back source text rather than a
 * page — this checks for both and says which is which. */
import { h, clear } from './dom.js';

const REPO = { owner: 'clonevpn333-bot', repo: 'game', branch: 'live', file: 'site/nova-arcade.html' };

function mirrors({ owner, repo, branch, file }) {
  return [
    { host: 'raw.githack', renders: true, note: 'Serves it as a page', url: `https://raw.githack.com/${owner}/${repo}/${branch}/${file}` },
    { host: 'rawcdn.githack', renders: true, note: 'Cached edge of the same service', url: `https://rawcdn.githack.com/${owner}/${repo}/${branch}/${file}` },
    { host: 'GitHub Pages', renders: true, note: 'Needs Pages switched on', url: `https://${owner}.github.io/${repo}/` },
    { host: 'GitHub Pages · file', renders: true, note: 'Same, straight at the file', url: `https://${owner}.github.io/${repo}/nova-arcade.html` },
    { host: 'jsDelivr', renders: false, note: 'Reaches everywhere, but serves HTML as text', url: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${file}` },
    { host: 'jsDelivr · Fastly', renders: false, note: 'Different edge network', url: `https://fastly.jsdelivr.net/gh/${owner}/${repo}@${branch}/${file}` },
    { host: 'jsDelivr · Gcore', renders: false, note: 'Third edge network', url: `https://gcore.jsdelivr.net/gh/${owner}/${repo}@${branch}/${file}` },
    { host: 'Statically', renders: false, note: 'Independent CDN, also text', url: `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${file}` },
  ];
}

async function probe(url) {
  const go = (opts) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    return fetch(url, { cache: 'no-store', signal: ctl.signal, ...opts }).finally(() => clearTimeout(t));
  };
  try {
    const r = await go({});
    return { ok: r.ok, renders: (r.headers.get('content-type') || '').toLowerCase().includes('text/html') };
  } catch {
    try { await go({ mode: 'no-cors' }); return { ok: true, renders: null }; }
    catch { return { ok: false, renders: false }; }
  }
}

export function openMirrorFinder(config = REPO) {
  const list = mirrors(config);
  const rows = [];
  const body = h('div', { class: 'list' });

  for (const m of list) {
    const dot = h('span', { class: 'mate__dot is-dead', style: { flex: 'none' } });
    const copy = h('button', { class: 'btn btn--ghost' }, 'Copy');
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(m.url); copy.textContent = 'Copied'; }
      catch { copy.textContent = 'Select it'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
    };
    body.append(h('div', { class: 'rowitem', style: { alignItems: 'flex-start' } },
      dot,
      h('div', { style: { minWidth: '0', flex: '1' } },
        h('b', {}, m.host),
        h('div', { class: 'mono', style: { fontSize: '11.5px', color: 'var(--dim)', wordBreak: 'break-all', lineHeight: '1.5' } }, m.url),
        h('div', { style: { fontSize: '11px', color: 'var(--dimmer)' } }, m.note)),
      copy,
      h('a', { class: 'btn', href: m.url, target: '_blank', rel: 'noopener' }, 'Open')));
    rows.push({ ...m, dot });
  }

  const summary = h('p', {}, 'Press test — green means it loads as a real page.');
  const testBtn = h('button', { class: 'btn btn--primary' }, 'Test from this device');
  testBtn.onclick = async () => {
    testBtn.disabled = true;
    summary.textContent = 'Testing…';
    for (const r of rows) r.dot.className = 'mate__dot is-down';
    const results = await Promise.all(rows.map(async (r) => {
      const res = await probe(r.url);
      const usable = res.ok && res.renders !== false && r.renders !== false;
      r.dot.className = 'mate__dot' + (res.ok ? (usable ? '' : ' is-down') : ' is-dead');
      r.dot.title = !res.ok ? 'blocked or unreachable' : usable ? 'loads as a page' : 'reachable, but hands back source text';
      return usable;
    }));
    const good = results.filter(Boolean).length;
    summary.textContent = good
      ? `${good} of ${rows.length} usable here — use a green one.`
      : 'Nothing green. Amber = reachable but shows source instead of the page; grey = blocked.';
    testBtn.disabled = false;
  };

  const overlay = h('div', { class: 'overlay is-open', style: { zIndex: '870' } },
    h('div', { class: 'sheet', style: { width: 'min(720px, calc(100vw - 40px))' }, onclick: (e) => e.stopPropagation() },
      h('div', { class: 'eyebrow' }, 'Share the arcade'),
      h('h2', { class: 'serif' }, 'Find a link that works'),
      h('p', {}, 'The same file, served by several unrelated companies. A filter can block one domain; it cannot block them all.'),
      h('div', { class: 'sheet__row' }, testBtn, h('button', { class: 'btn btn--ghost', onclick: close }, 'Close')),
      summary,
      h('div', { style: { height: '14px' } }),
      body,
      h('p', { style: { marginTop: '18px' } },
        'If everything is blocked: keep this file. It runs straight off disk — put it in Drive or Downloads and open it. Multiplayer still works, it is peer to peer.')));

  function close() { overlay.remove(); }
  overlay.addEventListener('click', close);
  document.body.append(overlay);
}
