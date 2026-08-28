/* Chat line, message feed and the emote wheel. */
import { h, clear } from './kit.js';
import { EMOTES } from '../char/anim.js';

export class Social {
  constructor(root, { onChat, onEmote }) {
    this.onChat = onChat;
    this.onEmote = onEmote;
    this.lines = [];
    this.log = h('div', { class: 'chat pass' });
    this.input = h('input', { placeholder: 'Say something…', maxlength: '140' });
    this.inputWrap = h('div', { class: 'field chat__input hide' }, this.input);
    this.log.append(this.inputWrap);
    root.append(this.log);

    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = this.input.value.trim();
        if (t) this.onChat?.(t);
        this.input.value = '';
        this.closeChat();
      } else if (e.key === 'Escape') this.closeChat();
    });

    this.wheel = h('div', { class: 'wheel hide' });
    this.ring = h('div', { class: 'wheel__ring' });
    this.wheel.append(this.ring);
    root.append(this.wheel);
    this.keys = Object.keys(EMOTES);
    this.items = this.keys.map((k, i) => {
      const a = (i / this.keys.length) * Math.PI * 2 - Math.PI / 2;
      const el = h('div', {
        class: 'wheel__item',
        style: { left: `${50 + Math.cos(a) * 40}%`, top: `${50 + Math.sin(a) * 40}%` },
      }, EMOTES[k].name);
      this.ring.append(el);
      return el;
    });
    this.hot = 0;
  }

  openChat(input) {
    this.chatting = true;
    input.blockKeys = true;
    this.inputWrap.classList.remove('hide');
    this.input.focus();
  }
  closeChat(input) {
    this.chatting = false;
    if (input) input.blockKeys = false;
    else if (this._input) this._input.blockKeys = false;
    this.inputWrap.classList.add('hide');
    this.input.blur();
  }
  bindInput(input) { this._input = input; }

  push(name, text, color) {
    const line = h('div', { class: 'chat__line' }, h('b', { style: color ? { color } : null }, name + ': '), text);
    this.log.insertBefore(line, this.inputWrap);
    this.lines.push(line);
    if (this.lines.length > 7) this.lines.shift().remove();
    setTimeout(() => { line.style.transition = 'opacity .8s'; line.style.opacity = '0'; setTimeout(() => line.remove(), 900); }, 14000);
  }

  openWheel() { this.wheelOpen = true; this.wheel.classList.remove('hide'); this.wheelDx = 0; this.wheelDy = -1; this.updateWheel(0, 0); }
  updateWheel(dx, dy) {
    if (!this.wheelOpen) return;
    this.wheelDx += dx * 90; this.wheelDy += dy * 90;
    const len = Math.hypot(this.wheelDx, this.wheelDy);
    if (len > 0.25) {
      let a = Math.atan2(this.wheelDy, this.wheelDx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      this.hot = Math.round((a / (Math.PI * 2)) * this.keys.length) % this.keys.length;
    }
    this.items.forEach((el, i) => el.classList.toggle('is-hot', i === this.hot));
  }
  closeWheel() {
    if (!this.wheelOpen) return null;
    this.wheelOpen = false;
    this.wheel.classList.add('hide');
    const key = this.keys[this.hot];
    this.onEmote?.(key);
    return key;
  }
}
