/* Front-of-house: loading, main menu, join, settings and the pause panel. */
import { h, clear, loadProfile, saveProfile } from './kit.js';

export class Loading {
  constructor(root) {
    this.fill = h('i');
    this.note = h('p', {}, 'Building the mountain…');
    this.el = h('div', { class: 'loading' }, h('div', { class: 'loading__inner' },
      h('h1', {}, 'Summit'), this.note, h('div', { class: 'loading__bar' }, this.fill)));
    root.append(this.el);
  }
  set(p, note) {
    this.fill.style.width = Math.round(p * 100) + '%';
    if (note) this.note.textContent = note;
  }
  done() {
    this.el.style.opacity = '0';
    setTimeout(() => this.el.remove(), 700);
  }
}

export class MainMenu {
  /** @param handlers { onHost, onJoin, onShop, onSettings } */
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.profile = loadProfile();
    this.error = h('p', { style: { color: 'var(--bad)' } }, '');
    this.nameInput = h('input', { value: this.profile.name || '', placeholder: 'Your name', maxlength: '16' });
    this.codeInput = h('input', { placeholder: 'Room code', maxlength: '6', style: { textTransform: 'uppercase' } });
    this.serverInput = h('input', { value: this.profile.server || '', placeholder: 'wss://your-server/ws — leave empty' });

    this.advanced = h('div', { class: 'hide' },
      h('div', { class: 'sep' }),
      h('div', { class: 'eyebrow' }, 'Dedicated server (optional)'),
      h('p', { style: { marginTop: '6px', fontSize: '12.5px' } },
        'Leave this empty to host from your own tab. Fill it in only if someone is running ',
        h('code', { class: 'mono' }, 'npm run server'), '.'),
      h('div', { class: 'field', style: { marginTop: '8px' } }, this.serverInput));

    this.el = h('div', { class: 'screen' }, h('div', { class: 'card', style: { width: 'min(620px, calc(100vw - 44px))' } },
      h('div', { class: 'eyebrow' }, 'Four climbers · one mountain'),
      h('h1', {}, 'Summit'),
      h('p', { style: { marginTop: '10px' } },
        'Jump from the plane, land on the beach, and get every one of you to the helicopter at the top. Stamina is the whole game.'),
      h('div', { class: 'sep' }),
      h('div', { class: 'list' },
        h('div', { class: 'field' }, this.nameInput),
        h('div', { class: 'row' },
          h('button', { class: 'btn btn--primary', onclick: () => this.host() }, 'Host a run'),
          h('div', { class: 'field', style: { flex: '1' } }, this.codeInput),
          h('button', { class: 'btn', onclick: () => this.join() }, 'Join')),
        this.error),
      h('p', { style: { marginTop: '12px', fontSize: '12.5px' } },
        'Hosting gives you a five-letter code. Send it to your friends — they type it in and press Join. ',
        'Nothing to install and no server to run: the mountain lives in your tab.'),
      h('div', { class: 'sep' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn--ghost', onclick: () => this.h.onShop?.() }, 'Cosmetics'),
        h('button', { class: 'btn btn--ghost', onclick: () => this.h.onSettings?.() }, 'Settings'),
        h('button', { class: 'btn btn--ghost', onclick: () => this.advanced.classList.toggle('hide') }, 'Advanced'),
        h('span', { style: { flex: '1' } }),
        h('span', { class: 'wallet' }, this.profile.coins + ' coins')),
      this.advanced));
    root.append(this.el);
  }

  values() {
    return {
      name: (this.nameInput.value || 'Climber').slice(0, 16),
      code: (this.codeInput.value || '').toUpperCase().trim(),
      server: (this.serverInput.value || '').trim(),
    };
  }
  remember() {
    const v = this.values();
    this.profile.name = v.name;
    this.profile.server = v.server;
    saveProfile(this.profile);
    return v;
  }
  host() { const v = this.remember(); this.setError('Opening a room…'); this.h.onHost?.(v); }
  join() {
    const v = this.remember();
    if (!v.code) { this.setError('Enter the room code your friend sent you.'); return; }
    this.setError('Looking for that room…');
    this.h.onJoin?.(v);
  }
  setError(msg) { this.error.textContent = msg || ''; }
  hide() { this.el.classList.add('hide'); }
  show() { this.el.classList.remove('hide'); this.profile = loadProfile(); }
  remove() { this.el.remove(); }
}

/** Only used when someone deliberately points at a dedicated server. */
export function defaultServer() { return loadProfile().server || ''; }

export class Settings {
  constructor(root, { input, stage, onClose }) {
    this.input = input;
    this.stage = stage;
    const sens = h('input', { type: 'range', min: '0.25', max: '3', step: '0.05', value: String(input.sensitivity) });
    sens.oninput = () => { input.setSensitivity(Number(sens.value)); sensOut.textContent = Number(sens.value).toFixed(2); };
    const sensOut = h('span', { class: 'mono' }, input.sensitivity.toFixed(2));
    const invert = h('input', { type: 'checkbox' });
    invert.checked = input.invertY;
    invert.onchange = () => input.setInvert(invert.checked);
    const quality = h('select', { style: { background: 'transparent', border: '0', outline: 'none' } },
      ...['high', 'medium', 'low'].map((q) => h('option', { value: q, selected: stage.quality === q }, q)));
    quality.onchange = () => { stage.setQuality(quality.value); localStorage.setItem('summit.quality', quality.value); };

    this.el = h('div', { class: 'screen' }, h('div', { class: 'card', style: { width: 'min(520px, calc(100vw - 44px))' } },
      h('div', { class: 'eyebrow' }, 'Settings'),
      h('h1', { style: { fontSize: '34px' } }, 'Controls & quality'),
      h('div', { class: 'sep' }),
      h('div', { class: 'list' },
        row('Look sensitivity', h('div', { class: 'row' }, sens, sensOut)),
        row('Invert vertical look', invert),
        row('Graphics quality', quality)),
      h('div', { class: 'sep' }),
      h('div', { class: 'eyebrow' }, 'Controls'),
      h('div', { class: 'list', style: { marginTop: '10px' } },
        ...CONTROLS.map(([k, v]) => h('div', { class: 'rowitem' }, h('b', { class: 'mono' }, k), h('span', {}, v)))),
      h('div', { class: 'sep' }),
      h('div', { class: 'row row--end' }, h('button', { class: 'btn btn--primary', onclick: () => { this.el.remove(); onClose?.(); } }, 'Done'))));
    root.append(this.el);
  }
}

const row = (label, control) => h('div', { class: 'rowitem' }, h('b', {}, label), h('span', { style: { marginLeft: 'auto' } }, control));

export const CONTROLS = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look (click once to capture the pointer)'],
  ['Hold left button', 'Grip the rock — this is how you climb'],
  ['Space', 'Jump · mantle a ledge · open the parachute'],
  ['Shift', 'Sprint'],
  ['E', 'Interact: open loot, light a fire, board the helicopter · hold to revive'],
  ['F', 'Boost a teammate up · pick up and drag a body'],
  ['R', 'Throw a rope to the nearest teammate'],
  ['Q', 'Ping where you are looking (Shift+Q marks danger)'],
  ['H', 'Sound the horn'],
  ['1 – 9', 'Use an item · hold G to drop it · hold F to hand it over'],
  ['C', 'Emote wheel'],
  ['T', 'Chat'],
  ['V', 'First person / third person'],
  ['Esc', 'Release the pointer / pause'],
];

export class Pause {
  constructor(root, { onResume, onSettings, onLeave }) {
    this.el = h('div', { class: 'screen' }, h('div', { class: 'card', style: { width: 'min(460px, calc(100vw - 44px))' } },
      h('div', { class: 'eyebrow' }, 'Paused'),
      h('h1', { style: { fontSize: '36px' } }, 'Take a breath'),
      h('p', { style: { marginTop: '8px' } }, 'The mountain does not pause. Your climber is still up there.'),
      h('div', { class: 'sep' }),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn--primary', onclick: () => { this.remove(); onResume?.(); } }, 'Back to the climb'),
        h('button', { class: 'btn btn--ghost', onclick: () => onSettings?.() }, 'Settings'),
        h('button', { class: 'btn btn--ghost', onclick: () => onLeave?.() }, 'Leave the run'))));
    root.append(this.el);
  }
  remove() { this.el.remove(); }
}
