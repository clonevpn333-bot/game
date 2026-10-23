// DOM HUD: crosshair, tether cells, ammo, objectives, prompts, hints,
// hitmarkers, damage direction, location cards, letterbox, fades.
import { WEAPONS } from '../combat/weapons.js';
import { clamp, damp } from '../core/util.js';

const HINTS = {
  move: ['MOVING', 'Use <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> to walk. Hold <span class="key">Shift</span> to hurry. The mouse looks around.'],
  interact: ['INTERACT', 'Press <span class="key">F</span> to talk to people and use things.'],
  journal: ['JOURNAL', 'Press <span class="key">J</span> to see your objective, the people you know, and what has happened.'],
  jump: ['TRAVERSAL', '<span class="key">Space</span> jumps. Jump into a ledge to climb onto it. Ledges painted <b style="color:#ffb35c">amber</b> can be hung from — shimmy with <span class="key">A</span>/<span class="key">D</span>, climb with <span class="key">Space</span>, drop with <span class="key">C</span>.'],
  climb: ['CLIMBING', 'Rung panels and ladders can be climbed. Walk into them, then use <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span>. <span class="key">Space</span> kicks off.'],
  capture: ['KINETIC TETHER — CAPTURE', 'Hold <span class="key">E</span> on anything with an <b style="color:#ffb35c">amber ring</b> to drain its momentum into your tether\'s three cells. Moving things fill cells faster.'],
  release: ['KINETIC TETHER — RELEASE', 'Press <span class="key">Q</span> to throw all stored momentum into your target, along your aim. With no target, it becomes a short kinetic blast.'],
  leap: ['KINETIC LEAP', 'While airborne with a charged cell, press <span class="key">Space</span> again to launch yourself where you\'re looking.'],
  latch: ['TETHER LINE', 'Aim at a <b style="color:#7fdcff">blue ring</b> anchor and press <span class="key">F</span> to latch on. Moving machinery carries you with it — let go (release <span class="key">F</span>) at the top to be flung.'],
  shoot: ['WEAPONS', 'Hold <span class="key">RMB</span> to aim, <span class="key">LMB</span> to fire, <span class="key">R</span> to reload. <span class="key">1</span>/<span class="key">2</span> or the wheel switches weapons. <span class="key">V</span> is a melee strike.'],
  crouch: ['STEALTH', '<span class="key">C</span> crouches. Machines that haven\'t noticed you can be approached quietly — a melee strike from behind lands hard.'],
  shearer: ['HEAVY CUTTER', 'Shearers telegraph their charges. Hold <span class="key">E</span> on one <i>while it charges</i> to steal its momentum and stall it — then put it somewhere it won\'t like.'],
  zoom: ['VISOR', 'Hold <span class="key">Z</span> to zoom your Runner visor.'],
};

export class HUD {
  constructor(game) {
    this.game = game;
    const ui = this.root = document.getElementById('ui');
    ui.innerHTML = `
      <div class="lb top"></div><div class="lb bot"></div>
      <div id="xh"><i class="dot"></i><i class="l"></i><i class="r"></i><i class="u"></i><i class="d"></i></div>
      <div id="cells"><svg viewBox="-32 -32 64 64"></svg></div>
      <div class="hitm"><i style="transform:translate(-14px,-10px) rotate(45deg)"></i><i style="transform:translate(5px,-10px) rotate(-45deg)"></i><i style="transform:translate(-14px,8px) rotate(-45deg)"></i><i style="transform:translate(5px,8px) rotate(45deg)"></i></div>
      <div id="dmgdir"></div>
      <div id="ammo"><div class="wn"></div><div class="ct"></div></div>
      <div id="obj" class="hide"><div class="h">Objective</div><div class="t"></div><div class="s"></div></div>
      <div id="prompt"><span class="key">F</span><span class="lbl"></span></div>
      <div id="hint"><div class="h"></div><div class="b"></div></div>
      <div id="notify"></div>
      <div id="loc"><div class="a"></div><div class="b"></div></div>
      <div id="subs"></div><div id="choices"></div>
      <div id="title"><div class="m"></div><div class="tag">NOTHING STAYS STILL. NOT EVEN HOME.</div></div>
      <div id="clickhint">CLICK TO CONTINUE</div>
      <div id="fader"></div><div id="fps"></div>`;
    this.$ = s => ui.querySelector(s);
    this.xh = this.$('#xh'); this.cellsEl = this.$('#cells'); this.ammoEl = this.$('#ammo'); this.objEl = this.$('#obj');
    this.promptEl = this.$('#prompt'); this.hintEl = this.$('#hint'); this.subs = this.$('#subs'); this.choicesEl = this.$('#choices');
    this.locEl = this.$('#loc'); this.notifyEl = this.$('#notify'); this.fader = this.$('#fader'); this.titleEl = this.$('#title');
    this.lbTop = this.$('.lb.top'); this.lbBot = this.$('.lb.bot'); this.hitmEl = this.$('.hitm');
    this.dmgEl = this.$('#dmgdir');
    this.buildCells();
    this.visible = true; this.combatUI = 0; this.hintQueue = []; this.hintsShown = new Set(); this.hintTimer = 0;
    this.damageV = 0; this.spread = 0;
    this.objective = null;
  }

  buildCells() {
    const svg = this.cellsEl.querySelector('svg'); let s = '';
    const R = 26, w = 3.2;
    for (let i = 0; i < 3; i++) {
      const a0 = -Math.PI / 2 - 0.62 + i * 0.44 - 0.0, a1 = a0 + 0.38;
      const arc = (r) => `M ${Math.cos(a0 + Math.PI) * r} ${Math.sin(a0 + Math.PI) * r} A ${r} ${r} 0 0 1 ${Math.cos(a1 + Math.PI) * r} ${Math.sin(a1 + Math.PI) * r}`;
      s += `<path d="${arc(R)}" stroke="rgba(255,255,255,0.18)" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
      s += `<path class="cell" data-i="${i}" d="${arc(R)}" stroke="#ffb35c" stroke-width="${w}" fill="none" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
    }
    svg.innerHTML = s;
    this.cellPaths = [...svg.querySelectorAll('path.cell')];
  }
  pulseCells() { this.cellsEl.classList.add('pulse'); setTimeout(() => this.cellsEl.classList.remove('pulse'), 150); this.combatUI = 3; }
  flashCells() { this.cellsEl.classList.add('flash'); setTimeout(() => this.cellsEl.classList.remove('flash'), 300); this.combatUI = 3; }

  setVisible(v) { this.visible = v; }
  letterbox(on) { this.lbTop.classList.toggle('on', on); this.lbBot.classList.toggle('on', on); }
  fade(to, dur = 1) { this.fader.style.transition = `opacity ${dur}s`; this.fader.classList.toggle('on', to > 0.5); return new Promise(r => setTimeout(r, dur * 1000)); }

  setObjective(text, sub = '') {
    if (!text) { this.objEl.classList.add('hide'); this.objective = null; return; }
    const changed = !this.objective || this.objective.text !== text;
    this.objective = { text, sub };
    this.objEl.querySelector('.t').textContent = text; this.objEl.querySelector('.s').textContent = sub;
    this.objEl.classList.remove('hide');
    if (changed) { this.objEl.classList.remove('new'); void this.objEl.offsetWidth; this.objEl.classList.add('new'); this.game.audio.ui('objective'); this.objShowT = 7; }
  }
  notify(text, dur = 3) { this.notifyEl.textContent = text; this.notifyEl.classList.add('show'); clearTimeout(this._nt); this._nt = setTimeout(() => this.notifyEl.classList.remove('show'), dur * 1000); }
  location(a, b, dur = 5) { this.locEl.querySelector('.a').textContent = a; this.locEl.querySelector('.b').textContent = b; this.locEl.classList.add('show'); clearTimeout(this._lt); this._lt = setTimeout(() => this.locEl.classList.remove('show'), dur * 1000); }
  hint(id, force = false) {
    if (!HINTS[id] || (this.hintsShown.has(id) && !force)) return;
    this.hintsShown.add(id); this.hintQueue.push(id);
  }
  showTitle(text = 'MARCHLIGHT') {
    this.titleEl.querySelector('.m').innerHTML = [...text].map((c, i) => `<span style="transition-delay:${i * 0.18}s">${c}</span>`).join('');
    this.titleEl.classList.add('show');
  }
  hideTitle() { this.titleEl.classList.remove('show'); }
  clickHint(on) { this.$('#clickhint').classList.toggle('show', on); }

  hitmarker(kill, weak) {
    this.hitmEl.classList.remove('show', 'kill'); void this.hitmEl.offsetWidth;
    this.hitmEl.classList.add('show'); if (kill) this.hitmEl.classList.add('kill');
    this.game.audio.ui(kill ? 'kill' : 'hit');
  }
  damage(from, amount) {
    this.damageV = Math.min(1, this.damageV + amount / 60);
    if (!from) return;
    const p = this.game.player, cam = this.game.camera;
    const d = from.clone().sub(p.pos); const ang = Math.atan2(d.x, d.z) - cam.yaw;
    const i = document.createElement('i'); i.style.transform = `rotate(${-ang * 180 / Math.PI + 180}deg)`; i.style.opacity = '1';
    this.dmgEl.appendChild(i); setTimeout(() => (i.style.opacity = '0'), 50); setTimeout(() => i.remove(), 800);
  }
  fired() { this.combatUI = 4; }
  weaponChanged() { this.combatUI = 4; }
  prompt(text, key = 'F') {
    if (!text) { this.promptEl.classList.remove('show'); return; }
    this.promptEl.querySelector('.key').textContent = key; this.promptEl.querySelector('.lbl').textContent = text; this.promptEl.classList.add('show');
  }

  update(dt) {
    const g = this.game, p = g.player, w = g.weapons, t = g.tether;
    const show = this.visible && !g.director.active && !g.paused;
    this.combatUI = Math.max(0, this.combatUI - dt);
    const combatVisible = show && (w.drawn || t.fill > 0.01 || this.combatUI > 0 || t.target || t.anchor || g.enemies.anyAware);
    // crosshair + spread
    const aiming = w.aiming || t.aiming;
    const spr = w.current && w.drawn ? (w.aiming ? WEAPONS[w.current].spreadAim : WEAPONS[w.current].spreadHip) * (1 + w.spreadBloom * 2.5) : 0.01;
    this.spread = damp(this.spread, spr * 900, 18, dt);
    const s = 4 + this.spread;
    const xs = this.xh.children;
    xs[1].style.transform = `translateX(${-s - 8}px)`; xs[2].style.transform = `translateX(${s}px)`; xs[3].style.transform = `translateY(${-s - 8}px)`; xs[4].style.transform = `translateY(${s}px)`;
    this.xh.style.opacity = show && (combatVisible || aiming) ? (aiming ? 1 : 0.6) : 0;
    for (let i = 1; i < 5; i++) xs[i].style.display = w.drawn ? 'block' : 'none';
    // cells
    const f = t.fill;
    this.cellPaths.forEach((pth, i) => {
      const v = clamp(f - i, 0, 1);
      pth.setAttribute('stroke-dashoffset', (1 - v).toFixed(3));
      pth.setAttribute('stroke', t.overload > 0.3 ? '#ffffff' : v >= 1 ? '#ffb35c' : '#c8692b');
    });
    this.cellsEl.style.opacity = show && (combatVisible || t.capturing) && !t.damaged ? 1 : (show && t.damaged && this.combatUI > 0 ? 0.4 : 0);
    // ammo
    if (w.current && w.ammo[w.current]) {
      const a = w.ammo[w.current], W = WEAPONS[w.current];
      this.ammoEl.querySelector('.wn').textContent = W.name + (w.reloading > 0 ? ' — RELOADING' : '');
      this.ammoEl.querySelector('.ct').innerHTML = `${a.mag}<small> / ${a.reserve}</small>`;
      this.ammoEl.classList.toggle('low', a.mag <= Math.ceil(W.mag * 0.25));
    }
    this.ammoEl.style.opacity = show && w.current && (w.drawn || this.combatUI > 0) ? 1 : 0;
    // objective auto-hide after a while in calm, reappears in journal
    if (this.objShowT > 0) { this.objShowT -= dt; }
    this.objEl.style.opacity = show && this.objective && (this.objShowT > 0 || g.input.down('journal') || combatVisible) ? 1 : 0;
    // hints
    this.hintTimer -= dt;
    if (this.hintTimer <= 0) {
      this.hintEl.classList.remove('show');
      if (this.hintQueue.length && show && this.hintTimer < -0.6) {
        const id = this.hintQueue.shift();
        this.hintEl.querySelector('.h').textContent = HINTS[id][0]; this.hintEl.querySelector('.b').innerHTML = HINTS[id][1];
        this.hintEl.classList.add('show'); this.hintTimer = 9;
      }
    }
    if (!show) this.hintEl.classList.remove('show');
    // damage / health → screen grade
    this.damageV = damp(this.damageV, 0, 1.5, dt);
    const hp = p.health / p.maxHealth;
    g.engine.grade.uniforms.uDamage.value = clamp(this.damageV * 0.6 + (1 - hp) * 0.75 - 0.1, 0, 0.9);
    if (hp < 0.35 && !p.dead) { this.heartT = (this.heartT || 0) - dt; if (this.heartT < 0) { this.heartT = 0.9; g.audio.ui('heart'); } }
    if (!show) this.prompt(null);
  }
}
