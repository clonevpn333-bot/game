// GETAWAY! — stunt & style tracker: big air, flips, near misses, oncoming, drifts, takedowns, smash-throughs.
// Every stunt refills boost, adds score, and can trigger slow motion for the big moments.
import { G } from './context.js';
import { clamp } from './utils.js';

export class Stunts {
  constructor() {
    this.score = 0; this.combo = 1; this.comboT = 0; this.driftT = 0; this.oncT = 0; this.nearCD = new Map(); this.session = { air: 0, nearMiss: 0, takedowns: 0, best: 0, flips: 0 };
    G.on('landed', (v, d) => { if (!v.isPlayer) return; const t = d.airTime; if (t > 0.7) { const pts = Math.round(t * 180 + d.height * 40); const flips = Math.floor(d.rot / (Math.PI * 1.7)); this.award(t > 1.6 ? 'HUGE AIR' : 'BIG AIR', pts + flips * 400, `${t.toFixed(1)}s · ${d.height.toFixed(0)}m${flips ? ` · ${flips}x FLIP` : ''}`); this.session.air = Math.max(this.session.air, t); if (flips) this.session.flips += flips; G.save.stats.airtime += t; } });
    G.on('vehicleCollision', (a, b, imp) => { const p = a.isPlayer ? a : b.isPlayer ? b : null; const o = p === a ? b : a; if (!p || imp < 10) return; if (o.ai && o.ai.kind === 'pursuit') { this.award('TAKEDOWN!', 300 + Math.round(imp * 10)); this.session.takedowns++; if (imp > 18) G.emit('slowmo', 0.9, 0.35); } else if (o.ai && o.ai.kind === 'hunter') { this.award('SLAMMED!', 300); } });
    G.on('vehicleImpact', (v, imp) => { if (v.isPlayer && imp > 20 && G.time - (this._crashT || 0) > 3) { this._crashT = G.time; G.emit('slowmo', 0.6, 0.3); if (G.cam) G.cam.shake(0.7); if (G.input) G.input.rumble(1, 1, 300); } });
    G.on('vehicleGlass', (v) => { if (v.isPlayer && (this._gT || 0) < G.time) { this._gT = G.time + 0.8; this.award('SMASH THROUGH', 150); } });
    G.on('vehicleHitProp', (v, p, sp) => { if (v.isPlayer && sp > 15) { this.score += 10; if (v.boost !== undefined) v.boost = Math.min(1, v.boost + 0.01); } });
    G.on('bailout', () => this.award('BAIL OUT!', 250));
    G.on('parkour', (n) => this.score += 25);
  }
  award(name, pts, sub = '') {
    pts = Math.round(pts * this.combo); this.score += pts; this.combo = Math.min(5, this.combo + 0.5); this.comboT = 4;
    if (G.hud) G.hud.stuntPop(name + (sub ? `<br><small style="font:600 14px Rajdhani;letter-spacing:.2em">${sub}</small>` : ''), pts);
    const v = G.player && G.player.vehicle; if (v) v.boost = Math.min(1, (v.boost || 0) + clamp(pts / 1500, 0.06, 0.4));
    if (G.audio) G.audio.ui('stunt'); G.emit('stunt', name, pts);
  }
  update(dt) {
    this.comboT -= dt; if (this.comboT <= 0) this.combo = 1;
    const v = G.player.vehicle;
    if (v && v.airborne) { if (!this.airSlow && v.airTime > 0.4 && v.maxAirH > 2.2 && v.vel.y > -6) { this.airSlow = true; G.emit('slowmo', 0.9, 0.35); if (G.cam) G.cam.shake(0.15); } } else this.airSlow = false;
    if (!v || v.mode !== 'drive' || v.airborne) { this.driftT = 0; this.oncT = 0; return; }
    const sp = v.speed;
    // drift
    if (v.slip > 4.5 && sp > 12) { this.driftT += dt; v.boost = Math.min(1, v.boost + dt * 0.04); } else { if (this.driftT > 1.4) this.award('DRIFT', Math.round(this.driftT * 120), `${this.driftT.toFixed(1)}s`); this.driftT = 0; }
    // near misses & oncoming
    if (sp > 18) {
      const near = G.vehicles.query(v.pos.x, v.pos.z, 7, this._n || (this._n = []));
      for (const o of near) {
        if (o === v || o.mode !== 'drive') continue; const dx = o.pos.x - v.pos.x, dz = o.pos.z - v.pos.z; const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const f = dx * s + dz * c, l = dx * c - dz * s;
        const gap = Math.abs(l) - (v.spec.W + o.spec.W) / 2; if (Math.abs(f) < 2 && gap > 0.05 && gap < 1.0) { const t = this.nearCD.get(o.id) || 0; if (G.time - t > 3) { this.nearCD.set(o.id, G.time); this.award('NEAR MISS', 100 + Math.round(sp * 3)); this.session.nearMiss++; G.save.stats.nearMiss++; } }
      }
      // oncoming: traffic heading opposite in front
      let onc = false; for (const o of near) { if (o.ai && o.ai.kind === 'traffic') { const dot = Math.sin(o.yaw) * Math.sin(v.yaw) + Math.cos(o.yaw) * Math.cos(v.yaw); if (dot < -0.8) onc = true; } }
      if (onc) this.oncT += dt; else if (this.oncT > 2) { this.award('ONCOMING', Math.round(this.oncT * 90)); this.oncT = 0; } else this.oncT = Math.max(0, this.oncT - dt);
    }
    if (G.save) G.save.stats.distance += sp * dt;
  }
  reset() { this.score = 0; this.combo = 1; this.session = { air: 0, nearMiss: 0, takedowns: 0, best: 0, flips: 0 }; }
}
