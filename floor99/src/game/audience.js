// THE AUDIENCE — a vote director with pluggable vote sources.
//
// VoteSources implement { begin(session), tally(session, dt) -> void, end(session) }
// and add ballots via session.cast(optionIndex, weight). Built in:
//   - SimulatedCrowd: believable simulated tallies driven by game "hype" and drama rules.
//   - BroadcastSpectators: real ballots from other browser tabs (spectator.html) through
//     BroadcastChannel('floor99-votes'). The same message protocol can be bridged to a
//     WebSocket server later for real online spectators / multiplayer voting.
import { EVENTS, DISASTER_POOL, GIFT_POOL } from './events.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

class VoteSession {
  constructor(o) {
    this.id = 'v' + Math.random().toString(36).slice(2, 8);
    this.title = o.title;
    this.options = o.options; // [{ id, label, icon, kind }]
    this.duration = o.duration ?? 8;
    this.t = 0;
    this.votes = o.options.map(() => 0);
    this.rigged = o.rigged;
    this.done = false;
    this.external = 0;
  }
  cast(i, w = 1) { if (i >= 0 && i < this.votes.length) this.votes[i] += w; }
  percents() {
    const sum = this.votes.reduce((a, b) => a + b, 0) || 1;
    return this.votes.map((v) => v / sum);
  }
  winner() {
    if (this.rigged !== undefined && this.rigged !== null) return this.rigged;
    let best = 0;
    this.votes.forEach((v, i) => { if (v > this.votes[best]) best = i; });
    return best;
  }
}

export class SimulatedCrowd {
  begin(s, game) {
    const viewers = 1;
    s.sim = s.options.map((o) => {
      const ev = EVENTS[o.id];
      let appeal = rand(0.8, 1.2);
      // the audience wants a show: chaos wins more when hype is high
      if (ev && ev.kind === 'disaster') appeal *= 0.9 + game.hype * 0.5;
      if (ev && ev.kind === 'gift') appeal *= 0.7 + game.hype * 0.7;
      if (o.id === game.audience.lastEvent) appeal *= 0.6;
      return { appeal, momentum: 0 };
    });
    s.swingAt = Math.random() < 0.35 ? rand(0.55, 0.8) : 2;
    s.swingTo = (Math.random() * s.options.length) | 0;
    s.viewers = viewers;
  }
  tally(s, dt) {
    const k = s.t / s.duration;
    s.options.forEach((o, i) => {
      const sm = s.sim[i];
      sm.momentum += (Math.random() - 0.5) * dt * 3;
      sm.momentum *= Math.exp(-dt);
      let rate = Math.max(0.05, sm.appeal + sm.momentum) * (60 + 400 * k);
      if (k > s.swingAt && i === s.swingTo) rate *= 2.6; // dramatic late swing
      if (s.rigged === i) rate *= 1.8;
      s.cast(i, rate * dt * rand(0.6, 1.4));
    });
  }
  end() {}
}

export class BroadcastSpectators {
  constructor() {
    this.ch = null;
    this.current = null;
    this.count = 0;
    try {
      this.ch = new BroadcastChannel('floor99-votes');
      this.ch.onmessage = (e) => {
        const m = e.data || {};
        if (m.type === 'hello' && this.current) this._announce(this.current);
        if (m.type === 'hello') this.count++;
        if (m.type === 'ballot' && this.current && m.id === this.current.id && !this.current.done) {
          // each real ballot is worth a big swing
          const sum = this.current.votes.reduce((a, b) => a + b, 0);
          this.current.cast(m.option, Math.max(40, sum * 0.12));
          this.current.external++;
        }
      };
    } catch (e) { this.ch = null; }
  }
  _announce(s) { this.ch?.postMessage({ type: 'vote', id: s.id, title: s.title, options: s.options.map((o) => o.label), duration: s.duration }); }
  begin(s) { this.current = s; if (this.ch) this._announce(s); }
  tally() {}
  end(s, winner) { this.ch?.postMessage({ type: 'result', id: s.id, winner }); this.current = null; }
}

export class Audience {
  constructor(game) {
    this.game = game;
    this.sources = [new SimulatedCrowd(), new BroadcastSpectators()];
    this.session = null;
    this.active = []; // running events
    this.cooldown = 30;
    this.auto = false;
    this.lastEvent = null;
    this.resultT = 0;
    this.pendingRun = null;
    this.history = [];
  }
  get voting() { return !!this.session || this.resultT > 0; }
  setAuto(on, first = 20) { this.auto = on; this.cooldown = first; }
  onEvent(name) {
    if (name === 'kill') this.cooldown -= 0.6; // action accelerates the show
  }
  pool() {
    const f = this.game.floor;
    const disasters = (f.votePool || DISASTER_POOL).filter((id) => this._can(id));
    return disasters;
  }
  _can(id) {
    const ev = EVENTS[id] || this.game.floor.events?.[id];
    if (!ev) return false;
    if (this.active.some((a) => a.id === id)) return false;
    return !ev.can || ev.can(this.game);
  }
  def(id) { return this.game.floor.events?.[id] || EVENTS[id]; }
  autoVote() {
    const g = this.game;
    const gift = g.hype > 0.72 && Math.random() < 0.55;
    let ids;
    let title;
    if (gift) {
      ids = shuffle(GIFT_POOL.filter((id) => this._can(id))).slice(0, 2);
      title = pick(['THE AUDIENCE LOVES YOU!', 'FAN FAVOURITE BONUS!', 'THE VIEWERS ARE GENEROUS!']);
    } else {
      ids = shuffle(this.pool()).slice(0, 2);
      title = g.hype < 0.3 ? pick(['THE VIEWERS ARE BORED!', 'RATINGS ARE DROPPING!']) : pick(['CHOOSE THE NEXT DISASTER!', 'THE VIEWERS WANT MORE!', 'THE AUDIENCE HAS SPOKEN!', 'VOTE NOW!']);
    }
    if (ids.length < 2) return;
    this.startVote({ title, options: ids });
  }
  startVote(o) {
    if (this.session) return null;
    const g = this.game;
    const options = o.options.map((id) => {
      const d = this.def(id) || { label: id.toUpperCase(), kind: 'chaos' };
      return { id, label: o.labels?.[id] || d.label, icon: d.icon || '', kind: d.kind };
    });
    const s = new VoteSession({ title: o.title, options, duration: o.duration ?? 7.5, rigged: o.rigged });
    this.session = s;
    s.onResolve = o.onResolve;
    s.run = o.run !== false;
    for (const src of this.sources) src.begin(s, g);
    g.hud.showVote(s);
    g.music.setState('vote', 0.6);
    g.audio.play('voteStart');
    g.audio.play('drumroll', { dur: s.duration - 0.5, delay: 0.3 });
    g.emit('voteStart', s);
    return s;
  }
  cancel() {
    if (this.session) { this.game.hud.hideVote(); this.session = null; }
    for (const a of this.active) { const d = this.def(a.id); if (d && d.end) try { d.end(this.game, a.state); } catch (e) { } }
    this.active.length = 0;
    this.game.hud.clearBanners?.();
  }
  run(id, opts = {}) {
    const d = this.def(id);
    if (!d) return;
    const g = this.game;
    const state = {};
    const entry = { id, t: opts.dur ?? d.dur ?? 10, state, warn: 1.6 };
    this.active.push(entry);
    this.lastEvent = id;
    this.history.push(id);
    g.hud.banner(d.banner || d.label, d.kind, entry.t + entry.warn);
    if (d.kind !== 'gift') g.audio.play('warning');
    g.emit('eventWarn', { id, def: d });
    return entry;
  }
  update(dt) {
    const g = this.game;
    const s = this.session;
    if (s) {
      s.t += dt;
      for (const src of this.sources) src.tally(s, dt);
      const p = s.percents();
      const tl = Math.max(0, s.duration - s.t);
      g.hud.updateVote(s, p, tl);
      if (Math.floor(tl) !== Math.floor(tl + dt) && tl < 3.5) g.audio.play('voteTick', { high: tl < 1 });
      if (s.t >= s.duration) {
        s.done = true;
        const w = s.winner();
        // ensure displayed numbers agree with the winner (rigged votes get "adjusted")
        if (s.rigged !== undefined && s.rigged !== null) { const max = Math.max(...s.votes); s.votes[w] = max * 1.25 + 10; }
        for (const src of this.sources) src.end(s, w, g);
        g.hud.resolveVote(s, w, s.percents());
        g.music.sting('vote');
        g.audio.play('voteResult');
        g.audio.play('cheer', { big: 1.2 });
        this.resultT = 2.2;
        this.pendingRun = s.run ? s.options[w].id : null;
        g.emit('voteResult', { session: s, winner: s.options[w], rigged: s.rigged !== undefined && s.rigged !== null });
        if (s.onResolve) s.onResolve(s.options[w].id, w);
        this.session = null;
      }
    }
    if (this.resultT > 0) {
      this.resultT -= dt;
      if (this.resultT <= 0) {
        g.hud.hideVote();
        g.music.setState(g.musicState || 'combat', 1.5);
        if (this.pendingRun) { this.run(this.pendingRun); this.pendingRun = null; }
      }
    }
    // running events
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      const d = this.def(a.id);
      if (a.warn > 0) {
        a.warn -= dt;
        if (a.warn <= 0) { try { d.start && d.start(g, a.state); } catch (e) { console.error(e); } g.emit('eventStart', { id: a.id, def: d }); }
        continue;
      }
      a.t -= dt;
      try { d.update && d.update(g, dt, a.state); } catch (e) { console.error(e); }
      if (a.t <= 0) {
        try { d.end && d.end(g, a.state); } catch (e) { console.error(e); }
        this.active.splice(i, 1);
        g.emit('eventEnd', { id: a.id });
      }
    }
    // auto scheduling
    if (this.auto && !this.session && this.resultT <= 0 && this.active.filter((a) => this.def(a.id).kind !== 'gift').length === 0 && !g.cinematic && g.player.alive) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) { this.cooldown = rand(38, 55); this.autoVote(); }
    }
  }
}

function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
