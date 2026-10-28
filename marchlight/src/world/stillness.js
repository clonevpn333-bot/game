// THE STILLNESS, as something you can walk into.
// A field has a centre, a radius and a strength that breathes (pulse). Inside it:
//  · movement thickens (the player's speed and jump scale down with the local strength),
//  · sound drains away and the picture greys (the grade's uStill),
//  · a "held" meter rises while the local strength is high; if it fills, the Stillness takes you.
// Rules the player can learn: keep moving, cross on the weak beat, and stored momentum is yours —
// a kinetic leap (a captured cell) always fires, even in a strong field. Moving fields can grow.
import * as THREE from 'three';
import { clamp, damp } from '../core/util.js';

export class Stillness {
  constructor(game) {
    this.game = game; this.fields = []; this.held = 0; this.k = 0;
    this.el = document.createElement('div'); this.el.id = 'stillHud';
    this.el.innerHTML = '<div class="t">THE STILLNESS IS HOLDING YOU</div><div class="m"><b></b></div><div class="s">keep moving · leap out [Space in the air]</div>';
    document.getElementById('ui').appendChild(this.el);
    game.add((dt) => this.update(dt));
  }
  // field: { pos (city frame), r, base 0..1, pulse 0..1, period s, grow m/s, max r, label }
  add(f) { const F = { base: 0.5, pulse: 0.5, period: 6, grow: 0, maxR: f.r, ...f, t: 0 }; this.fields.push(F); return F; }
  remove(f) { this.fields = this.fields.filter(x => x !== f); }
  clear() { this.fields = []; this.held = 0; }
  strength(f) { return clamp(f.base + f.pulse * Math.sin(f.t * Math.PI * 2 / f.period), 0, 1); }
  // local strength at a point: full in the core, fading over the outer 30% of the radius
  at(p) {
    let k = 0;
    for (const f of this.fields) { const d = Math.hypot(p.x - f.pos.x, p.z - f.pos.z); if (d < f.r && Math.abs(p.y - f.pos.y) < f.r) k = Math.max(k, this.strength(f) * clamp((f.r - d) / (f.r * 0.3), 0, 1)); }
    return k;
  }
  update(dt) {
    const g = this.game, P = g.player;
    for (const f of this.fields) { f.t += dt; if (f.grow) f.r = Math.min(f.maxR, f.r + f.grow * dt); }
    const raw = this.fields.length && !g.director.active ? this.at(P.pos) : 0;
    this.k = damp(this.k, raw, 4, dt);
    const k = this.k;
    P.speedMul = 1 - k * 0.72;                        // thick air
    P.jumpMul = 1 - k * 0.55;
    // held: fills while the field is strong around you and you aren't escaping it
    const moving = Math.hypot(P.vel.x, P.vel.z) > 1.2;
    if (raw > 0.55 && !P.leaping) this.held += dt * (raw - 0.45) * (moving ? 0.22 : 0.42);
    else this.held = Math.max(0, this.held - dt * (raw > 0.2 ? 0.08 : 0.35));
    if (P.leaping) this.held = Math.max(0, this.held - dt * 0.6);
    this.held = Math.min(1, this.held);
    if (this.held >= 1 && !P.dead) { this.held = 0; this.k = 0; g.onPlayerDeath?.('still'); }
    // the look and the sound of it
    const gu = g.engine.grade.uniforms.uStill; if (!this.owned && this.fields.length) gu.value = damp(gu.value, k * 0.75, 3, dt);
    if (this.fields.length) g.audio.duck(1 - k * 0.7, 0.4);
    this.el.classList.toggle('show', this.held > 0.08);
    this.el.querySelector('b').style.width = (this.held * 100).toFixed(0) + '%';
  }
}
