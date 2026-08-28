import { h, icon } from './dom.js';
import { toast } from './toast.js';
import { hubURL, hubHash, regenerateKey, currentKey } from '../session.js';

/* "Your private link" sheet — copy, open, regenerate. */
export function openLinkSheet() {
  const box = h('div', { class: 'linkbox' }, hubURL(currentKey()));
  const overlay = h('div', { class: 'overlay' },
    h('div', { class: 'sheet', onclick: (e) => e.stopPropagation() },
      h('div', { class: 'eyebrow' }, 'Private access'),
      h('h2', { class: 'serif' }, 'Your link to Nova Arcade'),
      h('p', {}, 'This address is 128 bits of random — nobody finds it by guessing. Bookmark it, or send it to someone you want to let in. Regenerating retires the old link on this device and mints a fresh one.'),
      box,
      h('div', { class: 'sheet__row' },
        h('button', {
          class: 'btn btn--primary',
          onclick: async () => {
            try { await navigator.clipboard.writeText(box.textContent); toast('Link copied'); }
            catch { getSelection().selectAllChildren(box); toast('Press ⌘C to copy'); }
          },
        }, icon('link'), 'Copy link'),
        h('button', {
          class: 'btn',
          onclick: () => {
            const next = regenerateKey();
            box.textContent = hubURL(next);
            toast('New link minted — old one retired');
            try { history.replaceState({}, '', hubHash(next)); } catch { location.hash = hubHash(next); }
            document.dispatchEvent(new CustomEvent('nova:keychange', { detail: next }));
          },
        }, icon('refresh'), 'Regenerate'),
        h('a', { class: 'btn btn--ghost', href: 'links.html', target: '_blank', rel: 'noopener' }, 'Share the arcade'),
        h('button', { class: 'btn btn--ghost', onclick: close }, 'Done')),
    ));
  overlay.addEventListener('click', close);
  function close() {
    overlay.classList.remove('is-open');
    setTimeout(() => overlay.remove(), 280);
    document.removeEventListener('keydown', onKey);
  }
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}
