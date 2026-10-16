// Making hits land: wind-up / strike / follow-through animation, alternating
// fists and a 3-hit combo, the victim's flinch and knockback, a split-second
// hit-stop, camera shake, an impact burst, a thwack, and a target health bar
// with KO call-outs. Driven by the world's 'melee' event, so every fight in
// the city (you, NPCs fighting back, gang brawls) uses it.
import { WEAPONS } from '../sim/combat.js';

const now = () => performance.now() / 1000;

export class HitFX {
  constructor(game) {
    this.game = game;
    this.kbs = [];
    this.combo = 0; this.lastSwing = 0; this.side = 1;
    this.el = document.createElement('div');
    this.el.id = 'target-hud';
    this.el.className = 'hidden';
    document.getElementById('ui').appendChild(this.el);
    this.hideAt = 0;
    game.world.on('melee', (e) => this.onMelee(e));
  }
  get W() { return this.game.world; }
  figOf(c) {
    if (!c) return null;
    const I = this.game.interiors;
    if (I && I.active) { if (I.player && I.player.cid === c.id) return I.player; const f = I.figs.get(c.id); if (f) return f; }
    return c.ped || null;
  }
  // the player starts a swing (hit or miss)
  swing(fig, wid) {
    const t = now();
    this.combo = t - this.lastSwing < 0.9 ? this.combo + 1 : 1;
    this.lastSwing = t;
    this.side = -this.side;
    const heavy = this.combo % 3 === 0;
    const w = WEAPONS[wid] || WEAPONS.fists;
    fig.atk = { t0: t, dur: (w.melee && wid !== 'fists' ? 0.42 : 0.3) * (heavy ? 1.25 : 1), side: this.side, kind: wid === 'fists' ? 'punch' : wid === 'knife' ? 'stab' : 'swing', heavy };
    fig.action = '';
    const A = this.game.audio;
    if (A && A.burst && A.white) A.burst(A.white, 'bandpass', heavy ? 600 : 900, 0.8, 0.1, 0.02, 0.16);
    return heavy;
  }
  onMelee({ attacker, target, wid }) {
    const W = this.W, g = this.game;
    const af = this.figOf(attacker), vf = this.figOf(target);
    const t = now();
    if (af && (!af.atk || t - af.atk.t0 > 0.15)) af.atk = { t0: t - 0.08, dur: 0.32, side: (af.id || 0) % 2 ? 1 : -1, kind: wid === 'fists' ? 'punch' : 'swing' };
    const heavy = !!(af && af.atk && af.atk.heavy);
    if (!vf) return;
    // the victim turns into the blow, flinches and is knocked back
    if (af) {
      const dx = vf.x - af.x, dz = vf.z - af.z, L = Math.hypot(dx, dz) || 1;
      vf.h = Math.atan2(-dx, -dz);
      vf.hit = { t0: t, heavy };
      const push = heavy ? 2.6 : 1.1;
      this.kbs.push({ f: vf, vx: dx / L * push, vz: dz / L * push, t: 0.22 });
    } else vf.hit = { t0: t, heavy };
    const me = W.life?.player || g.possession?.c;
    const involved = me && (attacker === me || target === me);
    // a heavy third hit puts them on the ground
    if (heavy && attacker === me && target.status === 'ok') { W.combat.wound(target, 0.1, attacker, wid); if (vf.fallen != null) vf.fallen = Math.max(vf.fallen || 0, 1.4); }
    // feel: hit-stop, shake, burst, sound
    const cam = g.renderer.camera.position;
    const near = (vf.x - cam.x) ** 2 + (vf.z - cam.z) ** 2 < 60 * 60;
    if (involved) { g.hitStop = Math.max(g.hitStop || 0, heavy ? 0.13 : 0.065); g.rig.shake = Math.max(g.rig.shake || 0, heavy ? 0.9 : 0.45); }
    if (near && g.fx && g.fx.glow) {
      const y = (vf.y || 0) + (target.status !== 'ok' ? 0.4 : 1.45);
      for (let i = 0; i < (heavy ? 18 : 9); i++) g.fx.glow.emit({ x: vf.x, y, z: vf.z, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 0, max: 0.12 + Math.random() * 0.12, s0: heavy ? 0.5 : 0.32, s1: 0.05, c0: [3, 2.6, 2.2, 1], c1: [1.5, 0.6, 0.3, 0], rot: 0 });
    }
    const A = g.audio;
    if (near && A && A.ctx) { A.burst && A.white && A.burst(A.white, 'bandpass', heavy ? 1400 : 2400, 1.4, heavy ? 0.5 : 0.32, 0.001, heavy ? 0.14 : 0.08); A.tone && A.tone('sine', heavy ? 70 : 110, heavy ? 0.5 : 0.3, 0.002, 0.12, 45); }
    if (attacker === me) this.showTarget(target, heavy);
    if (target === me && me.ped) g.toast(`${attacker.first} hits you!`, 1);
  }
  showTarget(o, heavy) {
    const hp = Math.max(0, Math.min(1, o.health ?? 1));
    const ko = o.status !== 'ok' || hp <= 0.35 || (o.ped && o.ped.fallen > 1);
    const tag = o.status === 'dead' ? '<b class="ko">K.O. — DEAD</b>' : ko ? '<b class="ko">K.O.!</b>' : heavy ? '<b class="ko small">HEAVY HIT</b>' : this.combo > 1 ? `<b class="ko small">${this.combo} HIT COMBO</b>` : '';
    this.el.innerHTML = `<div class="tn">${o.name}</div><div class="tb"><i style="width:${Math.round(hp * 100)}%"></i></div>${tag}`;
    this.el.classList.remove('hidden');
    this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
    this.hideAt = now() + 2.6;
  }
  update(dt) {
    for (let i = this.kbs.length - 1; i >= 0; i--) {
      const k = this.kbs[i];
      const s = Math.min(dt, k.t);
      k.f.x += k.vx * s; k.f.z += k.vz * s;
      k.t -= s;
      if (k.t <= 0) this.kbs.splice(i, 1);
    }
    if (this.hideAt && now() > this.hideAt) { this.hideAt = 0; this.el.classList.add('hidden'); }
  }
}

// pose offsets for the renderer: attacker arm strike and victim flinch
export function attackPose(fig, t) {
  const a = fig.atk;
  if (!a) return null;
  const k = (t - a.t0) / a.dur;
  if (k >= 1 || k < 0) { if (k >= 1) fig.atk = null; return null; }
  // 0..0.3 wind-up, 0.3..0.55 strike, 0.55..1 recover
  const wind = k < 0.3 ? k / 0.3 : Math.max(0, 1 - (k - 0.3) / 0.12);
  const strike = k < 0.3 ? 0 : k < 0.55 ? (k - 0.3) / 0.25 : Math.max(0, 1 - (k - 0.55) / 0.45);
  return { wind, strike, side: a.side, kind: a.kind, heavy: a.heavy };
}
export function hitPose(fig, t) {
  const h = fig.hit;
  if (!h) return 0;
  const k = (t - h.t0) / (h.heavy ? 0.5 : 0.32);
  if (k >= 1) { fig.hit = null; return 0; }
  return Math.sin(Math.min(1, k) * Math.PI) * (h.heavy ? 1.4 : 1);
}
