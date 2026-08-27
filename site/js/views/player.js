import { h, icon } from '../ui/dom.js';
import { gameById } from '../manifest.js';
import { markPlayed } from '../store.js';
import { toast } from '../ui/toast.js';

/* Immersive player. The game runs in a sandboxed iframe: it gets scripts,
 * pointer lock, fullscreen and its own storage origin-partition, but no access
 * to the hub's DOM, and no top-level navigation. */
export function playerView(ctx, id) {
  const g = gameById(id);
  if (!g) return h('div', { class: 'view empty' }, h('h2', { class: 'serif' }, 'Game not found'));

  markPlayed(g.id);

  const frame = h('iframe', {
    src: '/' + g.entry.replace(/^\//, ''),
    title: g.title,
    allow: 'fullscreen; autoplay; gamepad; pointer-lock; cross-origin-isolated',
    sandbox: 'allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals allow-popups',
    loading: 'eager',
  });

  const loader = h('div', { class: 'player__load' },
    h('div', { class: 'spinner' }),
    h('div', { class: 'eyebrow' }, 'Loading ' + g.title));
  frame.addEventListener('load', () => loader.classList.add('is-done'));

  const stage = h('div', { class: 'player__stage' }, frame, loader);

  const exit = () => ctx.go.to(`g/${g.id}`);
  const full = () => {
    const el = stage;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.().catch(() => toast('Fullscreen blocked by the browser'));
  };

  const root = h('div', { class: 'player' },
    h('div', { class: 'player__bar' },
      h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Back', onclick: exit }, icon('arrowL')),
      h('div', {}, h('div', { class: 'player__name' }, g.title), h('div', { class: 'dim' }, g.controls || '')),
      h('span', { class: 'chrome__spacer' }),
      h('button', { class: 'btn btn--ghost', onclick: () => { frame.src = frame.src; loader.classList.remove('is-done'); toast('Restarted'); } }, icon('refresh'), 'Restart'),
      h('button', { class: 'btn', onclick: full }, icon('expand'), 'Fullscreen'),
      h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Close', onclick: exit }, icon('x'))),
    stage);

  const onKey = (e) => {
    if (e.key === 'Escape' && !document.fullscreenElement) exit();
    if (e.key === 'f' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); full(); }
  };
  document.addEventListener('keydown', onKey);
  root.destroy = () => document.removeEventListener('keydown', onKey);
  document.documentElement.style.overflow = 'hidden';
  const prevDestroy = root.destroy;
  root.destroy = () => { prevDestroy(); document.documentElement.style.overflow = ''; };
  return root;
}
