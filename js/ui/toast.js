import { h } from './dom.js';
let host = null;
export function toast(message, ms = 2400) {
  if (!host) { host = h('div', { id: 'toasts' }); document.body.append(host); }
  const el = h('div', { class: 'toast' }, message);
  host.append(el);
  setTimeout(() => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
  return el;
}
