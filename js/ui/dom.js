/* Tiny DOM helper + icon set. No framework, no build step. */
export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

const PATHS = {
  play: '<path d="M5 3.5v13l11-6.5z"/>',
  heart: '<path d="M10 16.5S3.5 12.6 3.5 8.4A3.4 3.4 0 0 1 10 6.6a3.4 3.4 0 0 1 6.5 1.8c0 4.2-6.5 8.1-6.5 8.1z"/>',
  search: '<circle cx="9" cy="9" r="5.5"/><path d="M13.2 13.2 17 17"/>',
  link: '<path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 1 0-4.2-4.2l-1 1"/><path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 1 0 4.2 4.2l1-1"/>',
  arrowL: '<path d="M12 4 6 10l6 6"/>',
  arrowR: '<path d="M8 4l6 6-6 6"/>',
  x: '<path d="M5 5l10 10M15 5L5 15"/>',
  expand: '<path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6"/>',
  shuffle: '<path d="M3 5h3l8 10h3M14 3l3 2-3 2M3 15h3l2-2.5M12.5 7.5 14 5h3M14 17l3-2-3-2"/>',
  refresh: '<path d="M16.5 7A7 7 0 1 0 17 11"/><path d="M17 3v4.5h-4.5"/>',
  clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4.3l2.8 1.7"/>',
  grid: '<rect x="3" y="3" width="6" height="6" rx="1.4"/><rect x="11" y="3" width="6" height="6" rx="1.4"/><rect x="3" y="11" width="6" height="6" rx="1.4"/><rect x="11" y="11" width="6" height="6" rx="1.4"/>',
  users: '<circle cx="8" cy="7" r="3"/><path d="M2.5 16.5c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6"/><path d="M14 5.2a2.8 2.8 0 0 1 0 5.4"/>',
};

export function icon(name, cls = 'icon') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 20 20');
  el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = PATHS[name] || '';
  return el;
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
