// Host system: MR. HALO (the show's AI host) and IRIS (hacked comms).
// Renders Halo's animated face to a canvas used both in the HUD and on in-world screens,
// manages a priority dialogue queue, contextual commentary with no-repeat bags, and voice.
import * as THREE from 'three';
import { HALO, IRIS_TIPS } from './dialogue.js';

const rand = (a, b) => a + Math.random() * (b - a);

class Bag {
  constructor(lines) { this.lines = lines; this.queue = []; this.recent = []; }
  next(tier) {
    const ok = this.lines.filter((l) => (typeof l === 'string' ? 0 : l.tier || 0) <= tier);
    if (!ok.length) return null;
    if (!this.queue.length) {
      // prefer lines of the current tier slightly by duplicating them
      this.queue = ok.flatMap((l) => ((typeof l === 'object' && l.tier === tier && tier > 0) ? [l, l] : [l]));
      for (let i = this.queue.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]; }
    }
    let l = this.queue.pop();
    let guard = 0;
    while (this.recent.includes(l) && this.queue.length && guard++ < 5) l = this.queue.pop();
    this.recent.push(l); if (this.recent.length > 4) this.recent.shift();
    return typeof l === 'string' ? l : l.t;
  }
}

export class Host {
  constructor(app) {
    this.app = app;
    this.game = null;
    this.bags = {};
    this.queue = [];
    this.current = null;
    this.cool = 0;
    this.tier = 0;
    this.tipsGiven = new Set();
    this.mood = 'happy';
    this.talk = 0;
    this.blink = 0;
    this.time = 0;
    this.glitch = 0;
    // face canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256; this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.irisCanvas = document.createElement('canvas');
    this.irisCanvas.width = 256; this.irisCanvas.height = 256;
    this.irisCtx = this.irisCanvas.getContext('2d');
    this.voices = [];
    this.lastKillLine = 0;
    this.stats = { lines: 0 };
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices() || []; };
      load();
      speechSynthesis.onvoiceschanged = load;
    }
    this._draw();
  }
  attach(game) {
    this.game = game;
    this.queue.length = 0;
    this.current = null;
    this.cool = 2;
    this.tier = game.floorDef.tier ?? 0;
    this.idleT = 0;
    // Iris only speaks once she has made contact (Floor 1 introduces her mid-floor)
    this.irisOnline = game.floorDef.id > 1 || (game.checkpointId >= 3);
  }
  detach() { this.game = null; this.queue.length = 0; this.current = null; this.stopVoice(); this.app.hud.subtitle(null); }

  // ------------------------------------------------------------ speaking
  say(who, text, o = {}) {
    if (who === 'iris') this.irisOnline = true;
    const line = { who, text, mood: o.mood || (who === 'halo' ? 'happy' : null), priority: o.priority ?? 2, dur: o.dur || Math.max(2.2, text.length * 0.058 + 0.9), onDone: o.onDone };
    if (line.priority >= 2) this.queue.push(line);
    else {
      // contextual: only if not busy
      if (this.current || this.queue.length > 0) { if (line.priority >= 1 && this.queue.length < 2) this.queue.push(line); else return false; }
      else this.queue.push(line);
    }
    return true;
  }
  sayCtx(cat, o = {}) {
    if (this.cool > 0 && !o.force) return false;
    const src = HALO[cat];
    if (!src) return false;
    const bag = this.bags[cat] || (this.bags[cat] = new Bag(src));
    const t = bag.next(this.tier);
    if (!t) return false;
    const ok = this.say('halo', t, { priority: o.priority ?? 0, mood: o.mood || moodFor(cat, this.tier) });
    if (ok) this.cool = o.cool ?? rand(5, 8);
    return ok;
  }
  tip(key) {
    if (!this.irisOnline || this.tipsGiven.has(key) || !IRIS_TIPS[key]) return;
    this.tipsGiven.add(key);
    const arr = IRIS_TIPS[key];
    this.say('iris', arr[(Math.random() * arr.length) | 0], { priority: 1 });
  }
  get busy() { return !!this.current || this.queue.length > 0; }

  onEvent(name, d) {
    if (!this.game) return;
    const g = this.game;
    switch (name) {
      case 'kill': {
        const tags = (d.tags || []).map((t) => t[0]);
        let cat = 'kill';
        if (d.enemy.heavy) cat = 'heavy';
        else if (tags.includes('MEGA KILL') || tags.includes('TRIPLE KILL') || tags.includes('DOUBLE KILL')) cat = 'multi';
        else if (tags.includes('RETURN TO SENDER')) cat = 'reflect';
        else if (tags.includes('SHORT CIRCUIT')) cat = 'water';
        else if (tags.includes('ENVIRONMENTAL') || tags.includes('FLATTENED')) cat = 'env';
        else if (tags.includes('SPECIAL DELIVERY')) cat = 'gravity';
        else if (tags.includes('SQUASHED')) cat = 'stomp';
        else if (tags.includes('HEADSHOT')) cat = 'headshot';
        else if (tags.includes('SLICED') || tags.includes('HAMMERTIME') || tags.includes('GROUND POUND')) cat = 'melee';
        else if (tags.includes('WALL-RUNNER')) cat = 'wallrun';
        else if (tags.includes('SLIDE KILL')) cat = 'slide';
        else if (tags.includes('AIRBORNE')) cat = 'air';
        const important = cat !== 'kill' && cat !== 'headshot';
        if (important || Math.random() < 0.45) this.sayCtx(cat, { priority: d.enemy.heavy ? 1 : 0 });
        if (g.combo.count > 0 && g.combo.count % 8 === 0) this.sayCtx('combo', { force: true, priority: 1 });
        this.idleT = 0;
        break;
      }
      case 'playerHurt':
        if (d.hp < 30 && !this._lowWarned) { this._lowWarned = true; this.sayCtx('lowhp', { priority: 1, force: true }); if (Math.random() < 0.5) this.tip('lowhp'); }
        else if (Math.random() < 0.15) this.sayCtx('hurt');
        if (d.hp > 60) this._lowWarned = false;
        break;
      case 'nearMiss': if (Math.random() < 0.3) this.sayCtx('nearMiss'); break;
      case 'death': this.queue.length = 0; this.current = null; this.stopVoice(); this.sayCtx('death', { force: true, priority: 2, mood: this.tier > 0 ? 'gleeful' : 'happy' }); break;
      case 'respawnFall': this.sayCtx('respawnFall', { force: true }); break;
      case 'burned': this.sayCtx('burned'); break;
      case 'crushed': this.sayCtx('crushed', { force: true }); break;
      case 'weaponSwitch': if (Math.random() < 0.3) this.sayCtx('weapon_' + d); break;
      case 'grapple': if (Math.random() < 0.08) this.sayCtx('grapple'); break;
      case 'doubleJump': if (Math.random() < 0.05) this.sayCtx('doubleJump'); break;
      case 'propDestroyed': if (Math.random() < 0.08) this.sayCtx('propDestroyed'); break;
      case 'explosion': if (Math.random() < 0.15) this.sayCtx('explosion'); break;
      case 'shieldBroken': this.sayCtx('shieldBroken'); break;
      case 'bruiserStunned': this.sayCtx('bruiserStunned'); this.tip('bruiser'); break;
      case 'voteStart': {
        const s = d;
        const gift = s.options.every((o) => o.kind === 'gift');
        this.sayCtx(gift ? 'giftVote' : 'voteStart', { force: true, priority: 1 });
        break;
      }
      case 'voteResult': if (d.rigged && Math.random() < 0.7) this.sayCtx('voteRigged', { force: true, priority: 1 }); break;
      case 'eventStart': this.sayCtx('ev_' + d.id, { force: true, priority: 1, mood: 'gleeful' }); break;
      case 'enemySeen': this.tip(d); break;
    }
  }

  // ------------------------------------------------------------ voice
  speak(line) {
    const s = this.app.settings;
    if (!s.voice || !('speechSynthesis' in window)) return false;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(line.text.replace(/—/g, ', '));
      const en = this.voices.filter((v) => /^en/i.test(v.lang));
      if (line.who === 'halo') {
        u.voice = en.find((v) => /daniel|alex|fred|male|david|guy|google us/i.test(v.name)) || en[0] || null;
        u.pitch = line.mood === 'furious' ? 0.8 : 1.25; u.rate = 1.12;
      } else {
        u.voice = en.find((v) => /samantha|karen|zira|female|serena|moira|tessa|google uk english female/i.test(v.name)) || en[1] || en[0] || null;
        u.pitch = 0.95; u.rate = 1.03;
      }
      u.volume = this.app.audio.vol.voice * this.app.audio.vol.master;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  stopVoice() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }

  update(dt) {
    this.time += dt;
    this.cool = Math.max(0, this.cool - dt);
    if (this.game && this.game.player?.alive && !this.game.cinematic) {
      this.idleT = (this.idleT || 0) + dt;
      if (this.idleT > 26 && this.game.aliveEnemies() > 0) { this.idleT = 0; this.sayCtx('idle', { priority: 1 }); }
    }
    if (this.current) {
      this.current.t += dt;
      const L = this.current;
      // talking animation + babble when no TTS
      this.talk = L.who === 'halo' && L.t < L.dur - 0.5 ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 17)) * (0.6 + 0.4 * Math.sin(this.time * 5.3)) : this.talk * 0.8;
      if (!L.voiced && L.t < L.dur - 0.6) {
        L.blipT = (L.blipT || 0) - dt;
        if (L.blipT <= 0) { L.blipT = rand(0.07, 0.11); this.app.audio.play(L.who === 'halo' ? 'haloBlip' : 'irisBlip', { pitch: L.mood === 'furious' ? 120 : 190 }); if (L.who === 'iris') L.blipT = 0.2; }
      }
      if (L.t >= L.dur) {
        if (L.onDone) L.onDone();
        this.current = null;
        this.app.hud.subtitle(null);
      }
    } else if (this.queue.length) {
      this.queue.sort((a, b) => b.priority - a.priority);
      const L = this.queue.shift();
      L.t = 0;
      L.voiced = this.speak(L);
      if (L.voiced) L.dur = Math.max(L.dur, L.text.length * 0.068 + 0.8);
      this.current = L;
      this.mood = L.who === 'halo' ? (L.mood || 'happy') : this.mood;
      if (L.who === 'iris') this.app.audio.play('static', { dur: 0.3, vol: 0.25 });
      this.app.hud.subtitle(L);
      this.stats.lines++;
    } else this.talk *= 0.8;
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = rand(2, 5);
    this.glitch = Math.max(0, this.glitch - dt);
    this._drawT = (this._drawT || 0) - dt;
    if (this._drawT <= 0) { this._drawT = 1 / 24; this._draw(); this._drawIris(); this.texture.needsUpdate = true; }
  }

  // ------------------------------------------------------------ portrait rendering
  _draw() {
    const c = this.ctx, W = 256, t = this.time;
    const mood = this.mood;
    const furious = mood === 'furious';
    // background
    const g = c.createLinearGradient(0, 0, 0, W);
    g.addColorStop(0, furious ? '#3a0010' : '#2a0a4a');
    g.addColorStop(1, furious ? '#120004' : '#0a0420');
    c.fillStyle = g; c.fillRect(0, 0, W, W);
    // light rays
    c.save(); c.translate(128, 120); c.rotate(t * 0.15);
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = `rgba(255,${furious ? 40 : 45},${furious ? 60 : 140},0.06)`; c.beginPath(); c.moveTo(0, 0); c.lineTo(-25, -200); c.lineTo(25, -200); c.fill(); }
    c.restore();
    // halo ring
    const hy = 46 + Math.sin(t * 2) * 4;
    c.save();
    c.shadowColor = furious ? '#ff3030' : '#ffd400'; c.shadowBlur = 20;
    c.strokeStyle = furious ? '#ff4040' : '#ffd400'; c.lineWidth = 9;
    c.beginPath(); c.ellipse(128, hy, 62, 14, 0, 0, Math.PI * 2); c.stroke();
    c.restore();
    // head (rounded TV)
    const hx = 128, hyH = 140;
    c.fillStyle = '#e9e6f2';
    roundRect(c, hx - 82, hyH - 70, 164, 140, 40); c.fill();
    c.fillStyle = furious ? '#2a0008' : '#140a28';
    roundRect(c, hx - 70, hyH - 58, 140, 116, 30); c.fill();
    // eyes
    const blinkK = this.blink < 0 ? 0.1 : 1;
    const eyeY = hyH - 14;
    for (const s of [-1, 1]) {
      const ex = hx + s * 32;
      c.fillStyle = furious ? '#ff3a3a' : '#7df9ff';
      c.shadowColor = c.fillStyle; c.shadowBlur = 14;
      if (mood === 'gleeful' || mood === 'happy') {
        // happy arcs
        c.lineWidth = 9; c.strokeStyle = c.fillStyle; c.lineCap = 'round';
        c.beginPath(); c.arc(ex, eyeY + 8, 15, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        if (mood === 'gleeful') { c.beginPath(); c.arc(ex, eyeY + 8, 15, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      } else {
        c.beginPath(); c.ellipse(ex, eyeY, 14, 18 * blinkK, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#000'; c.shadowBlur = 0;
        c.beginPath(); c.arc(ex + Math.sin(t) * 3, eyeY + 2, mood === 'nervous' ? 3 : 6, 0, Math.PI * 2); c.fill();
      }
      c.shadowBlur = 0;
      // brows
      if (furious || mood === 'annoyed') {
        c.strokeStyle = furious ? '#ff3a3a' : '#7df9ff'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(ex - 16 * s, eyeY - 30); c.lineTo(ex + 14 * s, eyeY - (furious ? 18 : 24) * (s === 1 && mood === 'annoyed' ? 1.3 : 1)); c.stroke();
      }
    }
    // mouth
    const open = this.talk;
    c.fillStyle = furious ? '#ff3a3a' : '#ff5ab4';
    c.shadowColor = c.fillStyle; c.shadowBlur = 12;
    const mw = mood === 'gleeful' ? 64 : 52;
    c.beginPath();
    if (furious) { c.rect(hx - mw / 2, hyH + 26 - open * 6, mw, 6 + open * 14); }
    else { c.moveTo(hx - mw / 2, hyH + 22); c.quadraticCurveTo(hx, hyH + 40 + open * 22, hx + mw / 2, hyH + 22); c.quadraticCurveTo(hx, hyH + 30 + open * 6, hx - mw / 2, hyH + 22); }
    c.fill();
    c.shadowBlur = 0;
    if (mood === 'nervous') { c.fillStyle = '#7df9ff'; c.beginPath(); c.ellipse(hx + 60, hyH - 30, 5, 9, 0, 0, Math.PI * 2); c.fill(); }
    // bow tie
    c.fillStyle = '#ff2d6f';
    c.beginPath(); c.moveTo(hx, 222); c.lineTo(hx - 30, 208); c.lineTo(hx - 30, 236); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(hx, 222); c.lineTo(hx + 30, 208); c.lineTo(hx + 30, 236); c.closePath(); c.fill();
    c.fillStyle = '#ffd400'; c.beginPath(); c.arc(hx, 222, 7, 0, Math.PI * 2); c.fill();
    // scanlines + glitch
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < W; y += 3) c.fillRect(0, y, W, 1);
    const gl = this.glitch + (furious ? 0.3 : 0) + (this.tier >= 2 ? 0.1 : 0);
    if (gl > 0 && Math.random() < gl) {
      const y = Math.random() * W, h = 6 + Math.random() * 20;
      const img = c.getImageData(0, y, W, h);
      c.putImageData(img, (Math.random() - 0.5) * 30, y);
    }
    // LIVE tag
    c.fillStyle = '#ff1a3a'; roundRect(c, 10, 10, 54, 20, 4); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 14px "Chakra Petch", sans-serif'; c.fillText('● LIVE', 15, 25);
  }
  _drawIris() {
    const c = this.irisCtx, W = 256, t = this.time;
    c.fillStyle = '#020a06'; c.fillRect(0, 0, W, W);
    // static
    for (let i = 0; i < 900; i++) { const v = Math.random() * 60; c.fillStyle = `rgba(${v},${v + 40},${v},0.5)`; c.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
    // silhouette
    c.fillStyle = 'rgba(40,255,140,0.18)';
    c.beginPath(); c.ellipse(128, 105, 46, 56, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(128, 240, 92, 70, 0, Math.PI, Math.PI * 2); c.fill();
    // waveform
    const talking = this.current && this.current.who === 'iris';
    c.strokeStyle = '#3dff9a'; c.lineWidth = 2; c.shadowColor = '#3dff9a'; c.shadowBlur = 8;
    c.beginPath();
    for (let x = 0; x < W; x += 4) {
      const a = talking ? (Math.sin(x * 0.11 + t * 30) * Math.sin(x * 0.03 + t * 7) * 26) : Math.sin(x * 0.05 + t * 3) * 2;
      c.lineTo(x, 196 + a);
    }
    c.stroke(); c.shadowBlur = 0;
    c.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < W; y += 3) c.fillRect(0, y, W, 1);
    c.fillStyle = '#3dff9a'; c.font = 'bold 14px "Chakra Petch", monospace';
    c.fillText('ENCRYPTED // IRIS', 10, 24);
    if (Math.floor(t * 2) % 2) { c.fillStyle = '#3dff9a'; c.fillRect(10, 32, 8, 8); }
  }
}

function moodFor(cat, tier) {
  if (cat === 'death' || cat === 'hurt') return tier > 0 ? 'gleeful' : 'happy';
  if (cat === 'heavy' || cat === 'multi') return tier > 0 ? 'annoyed' : 'gleeful';
  if (cat.startsWith('ev_')) return 'gleeful';
  if (cat === 'idle') return 'annoyed';
  if (tier >= 2) return Math.random() < 0.5 ? 'furious' : 'nervous';
  if (tier >= 1) return Math.random() < 0.4 ? 'annoyed' : 'happy';
  return 'happy';
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
