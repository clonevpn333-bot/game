/* Tiny DOM helper shared by every Summit panel. */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const fmt = (n) => Math.round(n).toLocaleString();
export const meters = (n) => `${Math.round(n)} m`;

/** Local profile: currency, unlocks, chosen look, name. */
const KEY = 'summit.profile';
export function loadProfile() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  return {
    name: p.name || '',
    coins: p.coins ?? 0,
    owned: p.owned || { outfit: ['expedition'], hat: ['none'], pack: ['none', 'small'] },
    look: p.look || { outfit: 'expedition', hat: 'none', pack: 'small', tone: 1 },
    runs: p.runs || 0,
    best: p.best || 0,
    server: p.server || '',
  };
}
export function saveProfile(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} }
