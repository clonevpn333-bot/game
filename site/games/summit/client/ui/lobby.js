/* The airfield panel: room code, roster, the board, and ready-up. */
import { h, clear } from './kit.js';
import { FLAG } from '../../shared/protocol.js';
import { BIOMES } from '../../shared/constants.js';

export class LobbyPanel {
  constructor(root, { onReady, onShop, onLeave, onCopy }) {
    this.h = { onReady, onShop, onLeave, onCopy };
    this.ready = false;
    this.codeEl = h('div', { class: 'code' }, '-----');
    this.roster = h('div', { class: 'list' });
    this.countdown = h('p', { style: { color: 'var(--accent)' } }, '');
    this.readyBtn = h('button', { class: 'btn btn--primary', onclick: () => this.toggle() }, 'Ready up');

    this.el = h('div', { class: 'screen' }, h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', {},
          h('div', { class: 'eyebrow' }, 'Airfield · pre-flight'),
          h('h1', { style: { fontSize: '40px' } }, 'The hangar')),
        h('span', { style: { flex: '1' } }),
        h('div', { style: { textAlign: 'right' } },
          h('div', { class: 'eyebrow' }, 'Room code'),
          this.codeEl,
          h('button', { class: 'btn btn--ghost', style: { marginTop: '8px' }, onclick: () => this.h.onCopy?.() }, 'Copy invite'))),
      h('div', { class: 'sep' }),
      h('div', { class: 'grid2' },
        h('div', {},
          h('h2', {}, 'Rope team'),
          h('p', {}, 'Up to four. Anyone can drop and rejoin mid-run.'),
          h('div', { style: { height: '14px' } }),
          this.roster),
        h('div', {},
          h('h2', {}, 'The board'),
          h('p', {}, 'What is waiting above you.'),
          h('div', { style: { height: '14px' } }),
          h('div', { class: 'list' },
            ...BIOMES.map((b) => h('div', { class: 'rowitem' },
              h('span', { style: { width: '10px', height: '10px', borderRadius: '99px', background: `rgb(${b.tint.map((c) => Math.round(c * 255)).join(',')})` } }),
              h('b', {}, b.name),
              h('span', { class: 'rowitem__tag' }, `${Math.max(0, b.from)}–${b.to} m`)))))),
      h('div', { class: 'sep' }),
      this.countdown,
      h('div', { class: 'row' },
        this.readyBtn,
        h('button', { class: 'btn btn--ghost', onclick: () => this.h.onShop?.() }, 'Cosmetics'),
        h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn btn--ghost', onclick: () => this.h.onLeave?.() }, 'Leave'))));
    root.append(this.el);
  }

  toggle() {
    this.ready = !this.ready;
    this.readyBtn.textContent = this.ready ? 'Waiting for the others…' : 'Ready up';
    this.readyBtn.className = this.ready ? 'btn' : 'btn btn--primary';
    this.h.onReady?.(this.ready);
  }

  setRoom(room, meId) {
    if (!room) return;
    this.codeEl.textContent = room.code;
    clear(this.roster);
    for (const p of room.players) {
      this.roster.append(h('div', { class: 'rowitem' },
        h('span', { class: 'mate__dot' + (p.o ? '' : ' is-off') }),
        h('b', {}, p.n + (p.i === meId ? ' (you)' : '')),
        h('span', { class: 'rowitem__tag' }, p.o ? (p.r ? 'Ready' : 'Not ready') : 'Reconnecting…')));
    }
    for (let i = room.players.length; i < 4; i++) {
      this.roster.append(h('div', { class: 'rowitem', style: { opacity: '.4' } },
        h('span', { class: 'mate__dot is-dead' }), h('b', {}, 'Open slot'), h('span', { class: 'rowitem__tag' }, 'Share the code')));
    }
  }

  setCountdown(t) {
    this.countdown.textContent = t > 0 ? `Wheels up in ${Math.ceil(t)}…` : '';
  }
  show() { this.el.classList.remove('hide'); }
  hide() { this.el.classList.add('hide'); }
  remove() { this.el.remove(); }
}
