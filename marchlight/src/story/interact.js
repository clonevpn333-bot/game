// Contextual interactions: nearest valid interactable in front of the player gets an [F] prompt.
import * as THREE from 'three';

const _v = new THREE.Vector3();

export class Interact {
  constructor(game) { this.game = game; this.items = new Set(); this.current = null; this.blockFire = false; this.busy = false; }
  // { pos | getPos(), radius, label | label(), enabled(), onUse(), once, height, facing (dot threshold) }
  add(o) { const it = { radius: 1.8, height: 1.0, facing: 0.35, ...o }; this.items.add(it); return it; }
  remove(it) { this.items.delete(it); if (this.current === it) this.current = null; }
  update() {
    const g = this.game, p = g.player;
    this.current = null;
    if (g.director.active || p.dead || this.busy || g.dialogue.choosing || (p.state !== 'ground')) { g.hud.prompt(null); return; }
    const cam = g.engine.camera; const cf = cam.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    let best = null, bs = Infinity;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      const pos = it.getPos ? it.getPos() : it.pos;
      _v.copy(pos).sub(p.pos); const dy = _v.y - it.height; _v.y = 0;
      const d = _v.length(); if (d > it.radius || Math.abs(dy) > 1.6) continue;
      const dot = d > 0.3 ? _v.normalize().dot(cf) : 1;
      if (dot < it.facing) continue;
      const s = d - dot * 1.2;
      if (s < bs) { bs = s; best = it; }
    }
    this.current = best;
    this.blockFire = !!best;
    if (best) {
      const label = typeof best.label === 'function' ? best.label() : best.label;
      g.hud.prompt(label, g.input.label('use'));
      if (g.input.pressed('use')) { g.audio.ui('tick'); if (best.once) this.remove(best); best.onUse(best); }
    } else g.hud.prompt(null);
  }
}
