// Shared dialogue state. Lines are short, non-blocking "barks": the game keeps
// running while characters talk. Each reality draws the current line in its
// own style by reading `dialogue.current` (speaker, text, shown).
const SPEAKERS = {
  rin: { name: 'RIN', color: '#2fd3c6', pitch: 1.25 },
  vell: { name: 'VELL', color: '#c06fc0', pitch: 1.7 },
  curator: { name: 'THE CURATOR', color: '#f4f6ff', pitch: 0.6 },
  boss: { name: 'GRIDLOCK', color: '#ffd166', pitch: 0.45 },
  press: { name: 'THE PRESS', color: '#e8642a', pitch: 0.5 },
  sys: { name: '', color: '#98a2bd', pitch: 1 },
};

export class Dialogue {
  constructor(game) { this.game = game; this.queue = []; this.current = null; this.cps = 38; }
  // say('vell', 'text') or say([{who, text, hold}], {onDone})
  say(who, text, opts = {}) {
    const lines = Array.isArray(who) ? who : [{ who, text, ...opts }];
    const onDone = Array.isArray(who) ? text?.onDone : opts.onDone;
    lines.forEach((l, i) => this.queue.push({ ...l, onDone: i === lines.length - 1 ? onDone : null }));
  }
  clear() { this.queue.length = 0; this.current = null; }
  get busy() { return !!this.current || this.queue.length > 0; }
  update(dt) {
    if (!this.current && this.queue.length) {
      const l = this.queue.shift(), sp = SPEAKERS[l.who] || SPEAKERS.sys;
      this.current = { ...l, speaker: sp, shown: 0, t: 0, hold: l.hold ?? Math.max(1.5, l.text.length * 0.052 + 0.9), done: false, age: 0 };
    }
    const c = this.current; if (!c) return;
    c.age += dt;
    if (!c.done) {
      const before = Math.floor(c.shown);
      c.shown = Math.min(c.text.length, c.shown + this.cps * dt);
      if (Math.floor(c.shown) > before && c.text[Math.floor(c.shown) - 1] !== ' ' && Math.floor(c.shown) % 2 === 0) this.game.sfx.play('ui.talk', { pitch: c.speaker.pitch });
      if (c.shown >= c.text.length) c.done = true;
    } else {
      c.t += dt;
      if (c.t >= c.hold) { const cb = c.onDone; this.current = null; cb?.(); }
    }
  }
  get visibleText() { return this.current ? this.current.text.slice(0, Math.floor(this.current.shown)) : ''; }
}

// Word-wrap helper shared by the per-format renderers.
export function wrapText(text, maxChars) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
