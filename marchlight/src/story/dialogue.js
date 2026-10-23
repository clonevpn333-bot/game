// Subtitled dialogue with expressive actors, radio chatter, ambient barks and choices.
import { sleep } from '../core/util.js';

export const SPEAKERS = {
  ROOK: { color: '#ffb35c', pitch: 1.0 }, NIA: { color: '#7fe3c4', pitch: 1.25 }, BRAM: { color: '#ffd27a', pitch: 0.72 },
  TOMAS: { color: '#a9c8ff', pitch: 0.9 }, HARROW: { color: '#ff8f7f', pitch: 0.78 }, OPS: { color: '#ff8f7f', pitch: 0.85 },
  ODILE: { color: '#e9b8ff', pitch: 1.1 }, SEFA: { color: '#c8e88a', pitch: 1.05 }, 'MRS. OKAFOR': { color: '#f2c6a0', pitch: 1.15 },
  PELL: { color: '#b0f0ff', pitch: 1.6 }, JUNO: { color: '#ffc0d8', pitch: 1.7 }, IVO: { color: '#d8d0b0', pitch: 0.95 }, DACE: { color: '#c0d0a0', pitch: 1.0 },
  RADIO: { color: '#c9c3b6', pitch: 1.0 }, PA: { color: '#c9c3b6', pitch: 1.0 }, WORKER: { color: '#d0c8b8', pitch: 1.0 }, VENDOR: { color: '#d0c8b8', pitch: 1.1 },
};

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.subs = game.hud.subs; this.choicesEl = game.hud.choicesEl;
    this.choosing = false; this.advanceReq = false; this.lineActive = false;
    this.bigSubs = localStorage.getItem('marchlight.bigsubs') === '1';
    document.body.classList.toggle('bigsubs', this.bigSubs);
    window.addEventListener('mousedown', () => { if (this.lineActive) this.advanceReq = true; });
    game.input.onKey(code => { if ((code === 'Space' || code === 'Enter') && this.lineActive && this.game.director.active) this.advanceReq = true; });
    this.barkEls = [];
    this.history = [];
  }
  actorFor(who) { return typeof who === 'string' ? this.game.cast?.[who.toLowerCase()] : who; }

  // Blocking line. opts: { emotion, dur, radio, look, gesture, wait=true }
  async say(name, text, opts = {}) {
    const g = this.game;
    const spk = SPEAKERS[name] || { color: '#ddd', pitch: 1 };
    const actor = opts.actor || this.actorFor(name);
    const el = document.createElement('div'); el.className = 'sub' + (opts.radio ? ' radio' : '');
    el.innerHTML = `<b style="color:${spk.color}">${name}</b>${escape(text)}`;
    this.clearLines(); this.subs.appendChild(el); this.current = el;
    this.history.push({ name, text, t: g.time });
    if (actor?.anim) { actor.anim.talking = true; if (opts.emotion) actor.anim.setEmotion(opts.emotion); if (opts.gesture !== undefined) actor.anim.gesture = opts.gesture; }
    if (actor?.lookAtSpeaker) actor.lookAtSpeaker(opts.look);
    if (opts.radio) g.audio.ui('radio');
    g.audio.voice(opts.radio || !actor ? null : actor.pos?.clone().add({ x: 0, y: 1.6, z: 0 }), spk.pitch, text.length);
    const dur = opts.dur ?? Math.max(1.6, 0.9 + text.length * 0.052);
    this.lineActive = true; this.advanceReq = false;
    const t0 = g.rtime || 0;
    const blocking = opts.wait !== false;
    if (blocking) {
      while (((g.rtime || 0) - t0) < dur) {
        await sleep(30);
        if (this.advanceReq && ((g.rtime || 0) - t0) > 0.35 && g.director.active) break;
        if (g.skipAll) break;
      }
    }
    this.lineActive = false;
    const finish = () => {
      if (actor?.anim) actor.anim.talking = false;
      el.classList.add('fade'); setTimeout(() => el.remove(), 300);
    };
    if (blocking) { finish(); await sleep(opts.gap ?? 120); }
    else { const tEnd = (g.rtime || 0) + dur; const iv = setInterval(() => { if ((g.rtime || 0) >= tEnd || g.skipAll) { clearInterval(iv); finish(); } }, 50); }
  }
  radio(name, text, opts = {}) { return this.say(name, text, { radio: true, ...opts }); }
  clearLines() { [...this.subs.querySelectorAll('.sub:not(.bark)')].forEach(e => e.remove()); }

  // Non-blocking ambient line
  bark(name, text, dur = 3.2, actor = null) {
    const spk = SPEAKERS[name] || { color: '#cfc8bb', pitch: 1 };
    if (this.lineActive) return;
    const el = document.createElement('div'); el.className = 'sub bark';
    el.innerHTML = `<b style="color:${spk.color}">${name}</b>${escape(text)}`;
    this.subs.appendChild(el); this.barkEls.push(el);
    while (this.barkEls.length > 2) this.barkEls.shift().remove();
    actor = actor || this.actorFor(name);
    if (actor?.anim) { actor.anim.talking = true; setTimeout(() => (actor.anim.talking = false), dur * 900); }
    this.game.audio.voice(actor?.pos ? actor.pos.clone().add({ x: 0, y: 1.6, z: 0 }) : null, spk.pitch, text.length);
    setTimeout(() => { el.classList.add('fade'); setTimeout(() => el.remove(), 300); this.barkEls = this.barkEls.filter(e => e !== el); }, dur * 1000);
  }

  // options: [{ text, tone, value }]. Returns value.
  choose(options, { timeout = 0 } = {}) {
    const g = this.game; this.choosing = true;
    g.input.unlock?.();
    return new Promise(res => {
      this.choicesEl.innerHTML = '';
      let sel = 0;
      const els = options.map((o, i) => {
        const d = document.createElement('div'); d.className = 'choice'; d.style.animationDelay = `${i * 0.06}s`;
        d.innerHTML = `<span class="n">${i + 1}</span><span>${escape(o.text)}</span>${o.tone ? `<span class="tone">${o.tone}</span>` : ''}`;
        d.onmouseenter = () => { sel = i; upd(); };
        d.onclick = () => pick(i);
        this.choicesEl.appendChild(d); return d;
      });
      const upd = () => els.forEach((e, i) => e.classList.toggle('sel', i === sel));
      upd();
      let timer = null;
      if (timeout) { const bar = document.createElement('div'); bar.className = 'timer'; bar.style.width = '100%'; bar.style.transition = `width ${timeout}s linear`; els[0].parentElement.firstChild.appendChild(bar); requestAnimationFrame(() => (bar.style.width = '0')); timer = setTimeout(() => pick(options.length - 1), timeout * 1000); }
      const off = g.input.onKey(code => {
        const m = /^Digit([1-4])$/.exec(code); if (m && +m[1] <= options.length) pick(+m[1] - 1);
        if (code === 'ArrowUp' || code === 'KeyW') { sel = (sel + options.length - 1) % options.length; upd(); g.audio.ui('tick'); }
        if (code === 'ArrowDown' || code === 'KeyS') { sel = (sel + 1) % options.length; upd(); g.audio.ui('tick'); }
        if (code === 'Enter' || code === 'Space' || code === 'KeyF') pick(sel);
      });
      const padPoll = setInterval(() => { for (let i = 1; i <= 4; i++) if (g.input.uiPressed('choice' + i) && i <= options.length) pick(i - 1); }, 30);
      const pick = (i) => {
        clearTimeout(timer); clearInterval(padPoll); off();
        els.forEach((e, k) => { e.style.opacity = k === i ? '1' : '0.15'; });
        g.audio.ui('select');
        setTimeout(() => { this.choicesEl.innerHTML = ''; this.choosing = false; res(options[i].value ?? i); }, 260);
        this.history.push({ name: 'ROOK', text: options[i].text, choice: true });
      };
      g.autoChoose?.(options, pick);
    });
  }
}

function escape(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*(.+?)\*/g, '<i>$1</i>'); }
