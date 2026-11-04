// Host system: MR. HALO (the show's AI host) and IRIS (hacked comms).
// Renders Halo's animated face to a canvas used both in the HUD and on in-world screens,
// manages a priority dialogue queue, contextual commentary with no-repeat bags, and voice.
import * as THREE from 'three';
import { BUILD } from '../build.js';
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
    this.canvas.width = 512; this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.irisCanvas = document.createElement('canvas');
    this.irisCanvas.width = 256; this.irisCanvas.height = 256;
    this.irisCtx = this.irisCanvas.getContext('2d');
    this.lastKillLine = 0;
    this.stats = { lines: 0 };
    // recorded voice clips load lazily (they are large); until then lines play with blips
    this.clips = null;
    import('../../assets/voice/clips.js').then((m) => { this.clips = m.default; }).catch(() => {});
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
    if (!this.app.settings.voice || !this.clips) return false;
    const clip = this.clips[line.who + '|' + line.text];
    if (!clip) return false;
    this.stopVoice();
    const a = this.recordedVoice = new Audio(clip);
    a.preload = 'auto';
    a.volume = Math.min(1, this.app.audio.vol.voice * 1.25) * this.app.audio.vol.master;
    line.audioEnded = false;
    const done = () => { line.audioEnded = true; line.dur = line.t || 0; if (this.recordedVoice === a) { this.recordedVoice = null; this.app.music.setVoiceActive(false); } };
    a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) line.dur = a.duration + 0.15; };
    a.onplay = () => { if (this.recordedVoice === a) this.app.music.setVoiceActive(true); };
    a.onpause = () => { if (this.recordedVoice === a) this.app.music.setVoiceActive(false); };
    a.onended = done; a.onerror = done;
    a.play().catch(done);
    this.app.music.setVoiceActive(true, true);
    return true;
  }
  stopVoice() {
    const a = this.recordedVoice;
    if (a) { a.onended = a.onerror = a.onloadedmetadata = a.onpause = a.onplay = null; a.pause(); a.removeAttribute('src'); a.load(); this.recordedVoice = null; }
    if (this.current) this.current.audioEnded = true;
    this.app.music.setVoiceActive(false);
  }
  pauseVoice() { this.recordedVoice?.pause(); }
  resumeVoice() { this.recordedVoice?.play().catch(() => { if (this.current) this.current.audioEnded = true; }); }

  update(dt) {
    if (this.app.game?.paused) return;
    if (this.recordedVoice) this.recordedVoice.volume = Math.min(1, this.app.audio.vol.voice * 1.25) * this.app.audio.vol.master;
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
      if (L.t >= L.dur && (!L.voiced || L.audioEnded)) {
        if (L.onDone) L.onDone();
        this.current = null;
        this.app.hud.subtitle(null);
      }
    } else if (this.queue.length) {
      this.queue.sort((a, b) => b.priority - a.priority);
      const L = this.queue.shift();
      L.t = 0;
      L.voiced = this.speak(L);
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
    if (this._drawT <= 0) {
      this._drawT = BUILD.fast ? 1 / 12 : 1 / 24;
      this._draw();
      if (this.current?.who === 'iris' || !this._irisDrawn) { this._drawIris(); this._irisDrawn = true; }
      this.texture.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------ portrait rendering
  _draw() {
    // MR. HALO — illustrated retro-TV host, drawn live at 512px (HUD portrait + every in-world screen)
    const c = this.ctx, W = 512, t = this.time;
    const mood = this.mood;
    const furious = mood === 'furious', gleeful = mood === 'gleeful', annoyed = mood === 'annoyed', nervous = mood === 'nervous';
    const talk = this.talk;
    c.save();
    // ---------- studio background
    const bg = c.createRadialGradient(256, 230, 30, 256, 256, 380);
    bg.addColorStop(0, furious ? '#5a0a18' : '#4a1878');
    bg.addColorStop(0.55, furious ? '#24040c' : '#1c0838');
    bg.addColorStop(1, '#06020e');
    c.fillStyle = bg; c.fillRect(0, 0, W, W);
    c.save(); c.translate(256, 250); c.rotate(t * 0.12);
    for (let i = 0; i < 16; i++) {
      c.rotate(Math.PI / 8);
      const g = c.createLinearGradient(0, 0, 0, -380);
      g.addColorStop(0, furious ? 'rgba(255,60,60,0.10)' : 'rgba(255,90,200,0.10)'); g.addColorStop(1, 'rgba(255,90,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-38, -380); c.lineTo(38, -380); c.fill();
    }
    c.restore();
    for (let i = 0; i < 26; i++) { // floating sparkles
      const sx = (i * 97.3 + t * (8 + i % 5) * 3) % W, sy = (i * 53.7 + Math.sin(t + i) * 20 + 512) % W;
      const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i));
      c.fillStyle = `rgba(255,${200 + (i % 3) * 20},120,${a * 0.6})`; c.beginPath(); c.arc(sx, sy, 1.5 + (i % 3), 0, 7); c.fill();
    }
    // ---------- tuxedo shoulders
    const bob = Math.sin(t * 2.1) * 3 + talk * 2;
    c.save(); c.translate(0, bob * 0.5);
    const jacket = c.createLinearGradient(0, 380, 0, 512);
    jacket.addColorStop(0, '#24202e'); jacket.addColorStop(1, '#0c0a12');
    c.fillStyle = jacket;
    c.beginPath(); c.moveTo(40, 512); c.quadraticCurveTo(70, 400, 180, 390); c.lineTo(332, 390); c.quadraticCurveTo(442, 400, 472, 512); c.closePath(); c.fill();
    // shirt V + satin lapels
    c.fillStyle = '#f2f0f6'; c.beginPath(); c.moveTo(212, 392); c.lineTo(300, 392); c.lineTo(256, 500); c.closePath(); c.fill();
    for (const sx of [-1, 1]) {
      const lap = c.createLinearGradient(256 + sx * 20, 390, 256 + sx * 110, 480);
      lap.addColorStop(0, '#4a3a5a'); lap.addColorStop(0.5, '#1a1424'); lap.addColorStop(1, '#3a2c48');
      c.fillStyle = lap; c.beginPath(); c.moveTo(256 + sx * 44, 392); c.lineTo(256 + sx * 8, 500); c.lineTo(256 + sx * 96, 512); c.lineTo(256 + sx * 120, 396); c.closePath(); c.fill();
    }
    // lapel pin
    c.fillStyle = '#ffd400'; c.beginPath(); c.arc(330, 430, 9, 0, 7); c.fill();
    c.fillStyle = '#7a4a00'; c.font = 'bold 9px "Chakra Petch", sans-serif'; c.textAlign = 'center'; c.fillText('99', 330, 433);
    // bow tie
    c.save(); c.translate(256, 400); c.rotate(Math.sin(t * 3) * 0.04 + (gleeful ? Math.sin(t * 12) * 0.08 : 0));
    const bow = c.createLinearGradient(-50, -20, 50, 20); bow.addColorStop(0, '#ff5aa0'); bow.addColorStop(0.5, '#e01a6a'); bow.addColorStop(1, '#ff4f90');
    c.fillStyle = bow;
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-30, -26, -58, -18); c.quadraticCurveTo(-64, 0, -58, 18); c.quadraticCurveTo(-30, 26, 0, 0); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(30, -26, 58, -18); c.quadraticCurveTo(64, 0, 58, 18); c.quadraticCurveTo(30, 26, 0, 0); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-36, -9, 14, 4, -0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(36, -9, 14, 4, 0.3, 0, 7); c.fill();
    c.fillStyle = '#b0104e'; roundRect(c, -12, -13, 24, 26, 7); c.fill();
    c.restore();
    c.restore();
    // ---------- chrome neck
    const neck = c.createLinearGradient(220, 0, 292, 0);
    neck.addColorStop(0, '#5a6070'); neck.addColorStop(0.45, '#e8eef6'); neck.addColorStop(1, '#4a5060');
    c.fillStyle = neck; c.fillRect(226, 350 + bob, 60, 46);
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(226, 358 + i * 12 + bob, 60, 3); }
    // ---------- TV head
    const tilt = Math.sin(t * 0.9) * 0.035 + (nervous ? Math.sin(t * 17) * 0.02 : 0) + (furious ? Math.sin(t * 31) * 0.015 : 0);
    c.save(); c.translate(256, 236 + bob); c.rotate(tilt);
    // antenna stubs + halo
    for (const sx of [-1, 1]) {
      c.strokeStyle = '#c8d0da'; c.lineWidth = 5; c.beginPath(); c.moveTo(sx * 60, -118); c.lineTo(sx * 84, -150); c.stroke();
      c.fillStyle = furious ? '#ff3030' : '#ffd400'; c.beginPath(); c.arc(sx * 86, -153, 7, 0, 7); c.fill();
    }
    const hy = -178 + Math.sin(t * 2) * 6;
    c.save(); c.translate(0, hy); c.rotate(Math.sin(t * 0.7) * 0.08);
    c.shadowColor = furious ? '#ff3030' : '#ffd400'; c.shadowBlur = 34;
    const hal = c.createLinearGradient(-110, 0, 110, 0);
    hal.addColorStop(0, furious ? '#a01010' : '#b07a00'); hal.addColorStop(0.3, furious ? '#ff6060' : '#fff3a0'); hal.addColorStop(0.6, furious ? '#ff2020' : '#ffd400'); hal.addColorStop(1, furious ? '#801010' : '#a06a00');
    c.strokeStyle = hal; c.lineWidth = 15;
    c.beginPath(); c.ellipse(0, 0, 104, 22, 0, 0, Math.PI * 2); c.stroke();
    c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(0, -3, 98, 18, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
    c.restore();
    // chassis: gold-and-chrome bezel with depth
    const bz = c.createLinearGradient(0, -130, 0, 130);
    bz.addColorStop(0, '#fff6c8'); bz.addColorStop(0.18, '#e8b830'); bz.addColorStop(0.5, '#a06a10'); bz.addColorStop(0.82, '#e0a828'); bz.addColorStop(1, '#6a4008');
    c.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(c, -146, -112, 300, 246, 54); c.fill(); // drop shadow
    c.fillStyle = bz; roundRect(c, -152, -122, 304, 244, 56); c.fill();
    const bz2 = c.createLinearGradient(-150, 0, 150, 0);
    bz2.addColorStop(0, 'rgba(255,255,255,0.25)'); bz2.addColorStop(0.15, 'rgba(255,255,255,0)'); bz2.addColorStop(0.85, 'rgba(0,0,0,0)'); bz2.addColorStop(1, 'rgba(0,0,0,0.3)');
    c.fillStyle = bz2; roundRect(c, -152, -122, 304, 244, 56); c.fill();
    // side dials
    for (const sx of [-1, 1]) {
      const dg = c.createRadialGradient(sx * 160 - 3, -24, 2, sx * 160, -20, 20);
      dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#6a7080');
      c.fillStyle = dg; c.beginPath(); c.arc(sx * 160, -20, 17, 0, 7); c.fill();
      c.fillStyle = '#2a2e38'; c.beginPath(); c.arc(sx * 160, 30, 10, 0, 7); c.fill();
      c.strokeStyle = '#2a2e38'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx * 160, -20); c.lineTo(sx * 160 + Math.cos(t + sx) * 12, -20 + Math.sin(t + sx) * 12); c.stroke();
    }
    // screen
    const SW = 252, SH = 196;
    c.save();
    roundRect(c, -SW / 2, -SH / 2, SW, SH, 40); c.clip();
    const scr = c.createRadialGradient(0, -10, 10, 0, 0, 170);
    scr.addColorStop(0, furious ? '#4a0610' : '#1a2048'); scr.addColorStop(1, furious ? '#120004' : '#05061a');
    c.fillStyle = scr; c.fillRect(-SW / 2, -SH / 2, SW, SH);
    const glowCol = furious ? '#ff3a3a' : '#7df9ff';
    const blink = this.blink < 0 ? 0.08 : 1;
    const lookX = Math.sin(t * 0.7) * 6 + Math.sin(t * 2.3) * 2, lookY = Math.cos(t * 0.5) * 3;
    // cheeks
    if (!furious) for (const sx of [-1, 1]) { const ck = c.createRadialGradient(sx * 78, 30, 0, sx * 78, 30, 26); ck.addColorStop(0, 'rgba(255,90,180,0.55)'); ck.addColorStop(1, 'rgba(255,90,180,0)'); c.fillStyle = ck; c.fillRect(sx * 78 - 30, 0, 60, 60); }
    // eyes
    for (const sx of [-1, 1]) {
      const ex = sx * 52, ey = -22;
      c.save(); c.translate(ex, ey);
      if (gleeful) {
        // happy crescent eyes with sparkle
        c.strokeStyle = glowCol; c.lineWidth = 11; c.lineCap = 'round'; c.shadowColor = glowCol; c.shadowBlur = 18;
        c.beginPath(); c.arc(0, 10, 22, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
        c.shadowBlur = 0; c.fillStyle = '#ffffff';
        const sp = 4 + Math.abs(Math.sin(t * 6 + sx)) * 4; c.beginPath(); c.moveTo(sx * 26, -26 - sp); c.lineTo(sx * 26 + 3, -26); c.lineTo(sx * 26, -26 + sp); c.lineTo(sx * 26 - 3, -26); c.fill();
      } else {
        const eh = 30 * blink * (annoyed ? 0.6 : 1);
        c.shadowColor = glowCol; c.shadowBlur = 16;
        c.fillStyle = '#f4fbff'; c.beginPath(); c.ellipse(0, 0, 25, eh, 0, 0, 7); c.fill();
        c.shadowBlur = 0;
        if (blink > 0.5) {
          c.save(); c.beginPath(); c.ellipse(0, 0, 25, eh, 0, 0, 7); c.clip();
          const ir = c.createRadialGradient(lookX - 2, lookY - 3, 2, lookX, lookY, 16);
          ir.addColorStop(0, furious ? '#ffb0a0' : '#c8ffff'); ir.addColorStop(0.5, furious ? '#ff2020' : '#18c8e8'); ir.addColorStop(1, furious ? '#600000' : '#05506a');
          c.fillStyle = ir; c.beginPath(); c.arc(lookX, lookY, nervous ? 11 : 15, 0, 7); c.fill();
          c.fillStyle = '#02040a'; c.beginPath(); c.arc(lookX, lookY, nervous ? 4 : furious ? 5 : 7, 0, 7); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(lookX - 6, lookY - 7, 5, 0, 7); c.fill(); c.beginPath(); c.arc(lookX + 5, lookY + 5, 2.2, 0, 7); c.fill();
          // upper lid for annoyed / furious
          if (annoyed || furious) { c.fillStyle = furious ? '#2a0408' : '#0c1030'; c.save(); c.rotate(sx * (furious ? 0.35 : 0.12)); c.fillRect(-30, -eh - 4, 60, eh * (furious ? 0.85 : 0.75)); c.restore(); }
          c.restore();
        }
      }
      // brows
      c.strokeStyle = glowCol; c.lineWidth = 9; c.lineCap = 'round'; c.shadowColor = glowCol; c.shadowBlur = 12;
      c.beginPath();
      const by = -44 - (gleeful ? 6 : 0) - (nervous ? 4 : 0);
      if (furious) { c.moveTo(-sx * 26, by - 6); c.lineTo(sx * 18, by + 10); }
      else if (annoyed && sx > 0) { c.moveTo(-22, by - 8); c.quadraticCurveTo(0, by - 18, 22, by - 6); }
      else if (nervous) { c.moveTo(-22, by + 4 * sx); c.quadraticCurveTo(0, by - 10, 22, by - 4 * sx); }
      else { c.moveTo(-22, by); c.quadraticCurveTo(0, by - 10, 22, by); }
      c.stroke(); c.shadowBlur = 0;
      c.restore();
    }
    // mouth
    c.save(); c.translate(0, 46);
    const open = Math.min(1, talk * 1.1 + (gleeful ? 0.35 : 0));
    const mw = gleeful ? 96 : annoyed ? 60 : 80;
    c.shadowColor = glowCol; c.shadowBlur = 14;
    if (annoyed && open < 0.2) {
      c.strokeStyle = glowCol; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-mw / 2, 4); c.quadraticCurveTo(0, -2, mw / 2, 8); c.stroke();
    } else if (furious) {
      const mh = 16 + open * 22;
      c.fillStyle = '#1a0004'; roundRect(c, -mw / 2, -mh / 2, mw, mh, 8); c.fill();
      c.strokeStyle = glowCol; c.lineWidth = 5; roundRect(c, -mw / 2, -mh / 2, mw, mh, 8); c.stroke();
      c.shadowBlur = 0; c.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) { c.fillRect(-mw / 2 + 5 + i * (mw - 10) / 6, -mh / 2 + 2, (mw - 10) / 6 - 3, mh / 2 - 3); c.fillRect(-mw / 2 + 5 + i * (mw - 10) / 6, 1, (mw - 10) / 6 - 3, mh / 2 - 3); }
    } else {
      const drop = 10 + open * 34 + (nervous ? Math.sin(t * 20) * 3 : 0);
      c.fillStyle = '#12020e';
      c.beginPath(); c.moveTo(-mw / 2, 0); c.quadraticCurveTo(0, drop * 2, mw / 2, 0); c.quadraticCurveTo(0, 6 + open * 6, -mw / 2, 0); c.fill();
      c.shadowBlur = 0;
      c.save(); c.clip();
      c.fillStyle = '#ffffff'; c.fillRect(-mw / 2, -2, mw, 9 + open * 2); // teeth
      for (let i = 1; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-mw / 2 + i * mw / 6, 0, 2, 9); }
      c.fillStyle = '#ff5a9a'; c.beginPath(); c.ellipse(0, drop * 1.2, mw * 0.28, drop * 0.45, 0, 0, 7); c.fill(); // tongue
      c.restore();
      c.strokeStyle = glowCol; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-mw / 2, 0); c.quadraticCurveTo(0, drop * 2, mw / 2, 0); c.stroke();
      c.beginPath(); c.moveTo(-mw / 2 - 6, -4); c.quadraticCurveTo(-mw / 2, 2, -mw / 2 + 4, -1); c.stroke();
      c.beginPath(); c.moveTo(mw / 2 + 6, -4); c.quadraticCurveTo(mw / 2, 2, mw / 2 - 4, -1); c.stroke();
    }
    c.restore();
    if (nervous) { // sweat drop
      c.fillStyle = '#9ff4ff'; c.beginPath(); c.moveTo(96, -66); c.quadraticCurveTo(84, -40, 96, -34); c.quadraticCurveTo(108, -40, 96, -66); c.fill();
    }
    // screen glass: scanlines, curvature shading, reflection streak
    c.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = -SH / 2; y < SH / 2; y += 4) c.fillRect(-SW / 2, y, SW, 2);
    const vg = c.createRadialGradient(0, 0, 60, 0, 0, 160); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = vg; c.fillRect(-SW / 2, -SH / 2, SW, SH);
    const refl = c.createLinearGradient(-SW / 2, -SH / 2, 0, 0); refl.addColorStop(0, 'rgba(255,255,255,0.22)'); refl.addColorStop(0.5, 'rgba(255,255,255,0.04)'); refl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = refl; c.beginPath(); c.moveTo(-SW / 2, -SH / 2); c.lineTo(10, -SH / 2); c.lineTo(-SW / 2, 40); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 6; roundRect(c, -SW / 2, -SH / 2, SW, SH, 40); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; roundRect(c, -SW / 2 - 4, -SH / 2 - 4, SW + 8, SH + 8, 44); c.stroke();
    c.restore();
    // ---------- broadcast glitch
    const gl = this.glitch + (furious ? 0.35 : 0) + (this.tier >= 2 ? 0.1 : 0);
    if (gl > 0) for (let k = 0; k < 3; k++) if (Math.random() < gl) {
      const y = Math.random() * W, h = 8 + Math.random() * 40;
      const img = c.getImageData(0, y, W, h);
      c.putImageData(img, (Math.random() - 0.5) * 50, y);
      c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,0,80' : '0,255,255'},0.18)`; c.fillRect(0, y, W, h);
    }
    // ---------- LIVE badge
    c.fillStyle = '#ff1a3a'; roundRect(c, 18, 18, 104, 36, 8); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 24px "Chakra Petch", sans-serif'; c.textAlign = 'left';
    if (Math.floor(t * 2) % 2) { c.beginPath(); c.arc(38, 36, 7, 0, 7); c.fill(); }
    c.fillText('LIVE', 52, 45);
    c.restore();
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
