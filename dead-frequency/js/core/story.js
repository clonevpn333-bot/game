'use strict';
// Async story runner: pausable waits, dialogue, flags, clock, checkpoints.

const CANCEL = { cancelled: true };

const Story = {
  token: 0,
  timers: [],
  waiters: [],
  flags: {},
  clock: 22 * 60 + 2,       // minutes since midnight of Oct 15 (may exceed 1440)
  clockRate: 1 / 20,        // game minutes per real second
  clockRunning: true,
  segments: {},
  order: [],
  current: null,
  voiceLoop: null,
  reached: [],

  define(id, seg) { seg.id = id; this.segments[id] = seg; this.order.push(id); },

  // ---- timing primitives (cancelled on checkpoint reload) ----
  wait(sec) {
    const tok = this.token;
    return new Promise((res, rej) => this.timers.push({ at: G.time + sec, res, rej, tok }));
  },
  until(fn, timeout = 0) {
    const tok = this.token;
    return new Promise((res, rej) => this.waiters.push({ fn, res, rej, tok, deadline: timeout ? G.time + timeout : 0 }));
  },
  // run fn in background, cancel-safe
  spawn(fn) { const tok = this.token; (async () => { try { await fn(); } catch (e) { if (e !== CANCEL) console.error(e); } })(); return tok; },
  alive(tok) { return tok === this.token; },
  check(tok) { if (tok !== this.token) throw CANCEL; },

  cancelAll() {
    this.token++;
    for (const t of this.timers) t.rej(CANCEL);
    for (const w of this.waiters) w.rej(CANCEL);
    this.timers = []; this.waiters = [];
    UI.cancelChoices(); UI.clearSubs();
    if (this.voiceLoop) { this.voiceLoop.stop(0.05); this.voiceLoop = null; }
  },

  update(dt) {
    if (this.clockRunning) this.clock += dt * this.clockRate;
    const now = G.time;
    if (this.timers.length) {
      const due = this.timers.filter(t => t.at <= now);
      if (due.length) { this.timers = this.timers.filter(t => t.at > now); for (const t of due) t.res(); }
    }
    if (this.waiters.length) {
      for (const w of this.waiters.slice()) {
        let ok = false;
        try { ok = w.fn(); } catch (e) { console.error(e); }
        if (ok || (w.deadline && now > w.deadline)) { this.waiters.splice(this.waiters.indexOf(w), 1); w.res(!!ok); }
      }
    }
  },

  // ---- dialogue ----
  dur(text) { return Math.max(2.0, 1.3 + text.length * 0.052); },
  async say(who, text, dur, kind = '') {
    const d = dur || this.dur(text);
    const npc = who && NPCs.get(who.toLowerCase());
    if (npc) npc.talking = true;
    const voice = (kind === 'phone' || kind === 'radio') && who && who !== 'EVAN';
    if (voice) this.voice(true, kind);
    if (kind === 'radio' && Radio.ready) Radio.voice(true);
    UI.sub(who, text, d, kind || (who === 'THOUGHT' ? 'thought' : ''));
    try { await this.wait(d); }
    finally {
      if (npc) npc.talking = false;
      if (voice) this.voice(false);
      if (kind === 'radio' && Radio.ready) Radio.voice(false);
    }
  },
  think(text, dur) { return this.say('THOUGHT', text, dur || this.dur(text) * 0.9, 'thought'); },
  voice(on, kind) {
    if (!SND.ready) return;
    if (on) { if (!this.voiceLoop) { this.voiceLoop = SND.loop('murmur', { bus: 'voice', vol: kind === 'phone' ? 0.25 : 0.0 }); } this.voiceLoop.set('talk', true); }
    else if (this.voiceLoop) this.voiceLoop.set('talk', false);
  },
  // sequence of [who, text, dur?, kind?]
  async lines(arr, kind) { for (const l of arr) { if (typeof l === 'function') { await l(); continue; } await this.say(l[0], l[1], l[2], l[3] || kind); } },
  choose(list, o) { return UI.choices(list, o); },
  objective(text) { UI.objective(text); if (text) SND.sfx('paper', { bus: 'ui', vol: 0.4 }); },

  // ---- clock ----
  setClock(h, m) { let mins = h * 60 + m; if (h < 12) mins += 1440; this.clock = mins; },
  clockStr() { return U.fmtClock(this.clock); },
  hhmm() { return Math.floor(this.clock); },

  // ---- segments / checkpoints ----
  async start(id, o = {}) {
    const seg = this.segments[id];
    if (!seg) { console.error('no segment', id); return; }
    this.cancelAll();
    const tok = this.token;
    this.current = id;
    if (!this.reached.includes(id)) this.reached.push(id);
    if (seg.checkpoint !== false) this.save(id);
    G.running = true;
    try {
      if (!o.noFade && !(seg.seamless && !o.restart && G.level)) { UI.fadeNow(1); }
      NPCs.clear();
      Stalker.reset();
      Player.drop();
      Phone.close(true);
      UI.objective(null); UI.callUI(null); UI.qte(null); UI.bluescreen(null);
      Engine.distortBase = 0; Engine.tracking = 0; Engine.gray = 0; Engine.exposure = 1;
      SND.muffle(20000, 1, 0.1);
      G.mode = 'walk';
      Player.canMove = true; Player.canLook = true; Player.canRun = true; Player.speedMul = 1; Player.hidden = false;
      if (seg.card && !o.noCard) { await UI.chapterCard(seg.card[0], seg.card[1], seg.card[2]); this.check(tok); }
      if (seg.setup) await seg.setup(o);
      this.check(tok);
      await seg.run(o);
    } catch (e) {
      if (e !== CANCEL) console.error(e);
    }
  },
  // mark a checkpoint without reloading (restart will run that segment's setup)
  checkpoint(id) { this.current = id; if (!this.reached.includes(id)) this.reached.push(id); this.save(id); },
  restart() { this.rollbackFlags(); if (this.current) this.start(this.current, { restart: true, noCard: true }); },
  goto(id) { setTimeout(() => this.start(id), 0); throw CANCEL; },

  save(id) {
    try {
      localStorage.setItem('df_save', JSON.stringify({ seg: id, flags: this.flags, reached: this.reached }));
    } catch (e) { /* ignore */ }
    this._savedFlags = JSON.parse(JSON.stringify(this.flags));
  },
  load() {
    try { const s = JSON.parse(localStorage.getItem('df_save') || 'null'); if (s) { this.reached = s.reached || []; } return s; } catch (e) { return null; }
  },
  // when restarting from a checkpoint, roll back flags to what they were when it was saved
  rollbackFlags() { if (this._savedFlags) this.flags = JSON.parse(JSON.stringify(this._savedFlags)); },
};
