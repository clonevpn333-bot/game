// Modal panels used by activities, the phone, the home computer and games.
// While a panel is open the game ignores movement keys and the player stands still.
export function openPanel(game, { title = '', html = '', cls = '', onBind = null, closable = true, onClose = null } = {}) {
  const root = document.getElementById('ui');
  const m = document.createElement('div');
  m.className = 'modal panel-modal ' + cls;
  m.innerHTML = `<div class="modal-in">${title ? `<div class="pm-head"><h2>${title}</h2>${closable ? '<button class="pm-x" data-close>×</button>' : ''}</div>` : ''}<div class="pm-body">${html}</div></div>`;
  root.appendChild(m);
  game.input.enabled = false;
  game.input.keys.clear();
  if (game.interiors) game.interiors.busy = true;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    m.remove();
    removeEventListener('keydown', onKey, true);
    if (!document.querySelector('.panel-modal')) { game.input.enabled = true; game.input.keys.clear(); if (game.interiors) game.interiors.busy = false; }
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.code === 'Escape' && closable) { e.stopPropagation(); close(); } };
  addEventListener('keydown', onKey, true);
  m.querySelectorAll('[data-close]').forEach((b) => b.onclick = close);
  const api = {
    el: m, close,
    body: m.querySelector('.pm-body'),
    set(html2) { api.body.innerHTML = html2; api.bind(); },
    bind() { m.querySelectorAll('[data-close]').forEach((b) => b.onclick = close); if (onBind) onBind(api); },
  };
  api.bind();
  return api;
}

export const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
export const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
