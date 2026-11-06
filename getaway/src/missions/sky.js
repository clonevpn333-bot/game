// GETAWAY! — Mission 05 (SKYFALL) set pieces, all built from shapes: a zipline between two towers, freefall + a
// steerable parachute, a glass penthouse on a rooftop with a wall safe, and a safe-cracking minigame.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, damp, dampAngle } from '../core/utils.js';
import { tipBody } from './sea.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z); const _v = new THREE.Vector3();
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function rod(a, b, r, m) { const d = b.clone().sub(a); const g = new THREE.CylinderGeometry(r, r, d.length(), 6); const ms = new THREE.Mesh(g, m); ms.position.copy(a).add(b).multiplyScalar(0.5); ms.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); ms.castShadow = true; return ms; }

// ---------------- zipline ----------------
export class Zipline {
  constructor(a, b) { this.a = a.clone(); this.b = b.clone(); this.g = new THREE.Group(); const steel = mat(0x8a939b, { metalness: 0.7, roughness: 0.35 }), yel = mat(0xf1c40f);
    for (const p of [this.a, this.b]) { this.g.add(rod(p.clone().add(V(0, -2.6, 0)), p.clone().add(V(0, 0.4, 0)), 0.12, yel)); const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), steel); plate.position.copy(p).add(V(0, -2.6, 0)); this.g.add(plate); }
    this.g.add(rod(this.a, this.b, 0.025, steel)); this.trolley = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.5), mat(0xc0392b)); this.trolley.position.copy(this.a); this.g.add(this.trolley); G.scene.add(this.g);
    this.len = this.a.distanceTo(this.b); this.dir = this.b.clone().sub(this.a).normalize(); this.yaw = Math.atan2(this.dir.x, this.dir.z); }
  dispose() { G.scene.remove(this.g); }
}
export class ZipRider { // riding controller: slide down the cable hanging from a trolley
  constructor(zip) { this.zip = zip; this.t = 0; this.v = 2; this.showHuman = true; this.fullDamage = true; this.pos = zip.a.clone(); this.done = false; this.snd = G.audio && G.audio.createLoop('wind', { ref: 6 }); }
  seat() { return this.pos; }
  update(dt) { const z = this.zip; const sin = -z.dir.y; this.v = clamp(this.v + (9.8 * sin - 0.012 * this.v * this.v) * dt, 2, 27); this.t = Math.min(1, this.t + this.v * dt / z.len);
    if (this.t > 0.93) this.v = damp(this.v, 4, 3, dt); // the brake block at the far end
    const hp = z.a.clone().lerp(z.b, this.t); z.trolley.position.copy(hp); this.pos.copy(hp).add(V(0, -2.05, 0));
    const h = G.player.human; h.pos.copy(this.pos); h.yaw = z.yaw; h.state = 'hang'; h.swing = Math.sin(this.t * 20) * 0.15 * (this.v / 27); h.speed = 0; h.weapon = null; h.aim = null; h.animate(dt);
    if (this.snd) this.snd.update(this.pos, clamp(this.v / 27, 0, 1) * 0.8, this.v / 27); if (this.t >= 1) this.done = true; }
  camShot(dt) { const z = this.zip; const side = V(Math.cos(z.yaw), 0, -Math.sin(z.yaw)); const want = this.pos.clone().addScaledVector(z.dir, -7).addScaledVector(side, 3).add(V(0, 2.5, 0)); this._cp = this._cp ? this._cp.lerp(want, clamp(dt * 6, 0, 1)) : want.clone(); return { pos: this._cp, look: this.pos.clone().addScaledVector(z.dir, 10), fov: 70 + this.v * 0.6 }; }
  dispose() { if (this.snd) this.snd.dispose(); }
}

// ---------------- freefall + parachute ----------------
function canopyMesh() { const g = new THREE.Group(); const R = 4.2; const cells = 9; const mats = [mat(0xd63a2f), mat(0xf2f2f2)]; const line = mat(0x222222);
  for (let i = 0; i < cells; i++) { const a = (i / (cells - 1) - 0.5) * 2.0; const c = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.32, 2.6), mats[i % 2]); c.position.set(Math.sin(a) * R, Math.cos(a) * R, 0); c.rotation.z = -a; c.castShadow = true; g.add(c);
    if (i % 2 === 0) { for (const zz of [-0.9, 0.9]) g.add(rod(V(0, 0.2, zz * 0.15), V(Math.sin(a) * (R - 0.2), Math.cos(a) * (R - 0.2), zz), 0.012, line)); } }
  return g; }
export class Skydiver {
  constructor(pos, vel, yaw) { this.pos = pos.clone(); this.vel = vel.clone(); this.yaw = yaw; this.state = 'free'; this.showHuman = true; this.fullDamage = true; this.chuteK = 0; this.canopy = canopyMesh(); this.canopy.visible = false; G.scene.add(this.canopy); this.snd = G.audio && G.audio.createLoop('wind', { ref: 6 }); this.landed = false; this.splat = false; }
  seat() { return this.pos; }
  open() { if (this.state !== 'free') return; this.state = 'chute'; this.chuteK = 0; this.canopy.visible = true; this.vel.multiplyScalar(0.35); if (G.audio) { G.audio.whoosh(this.pos, 0.9, 0.6); G.audio.thud(this.pos, 0.6); } G.cam.shake(0.4); }
  update(dt, input) {
    const S = G.world.static; const ground = S.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; const agl = this.pos.y - ground;
    const f = input ? input.moveY() : 0, s = input ? input.moveX() : 0;
    if (this.state === 'free') { this.vel.y = Math.max(-46, this.vel.y - 9.8 * dt); this.yaw -= s * dt * 1.6; const fw = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const hv = fw.multiplyScalar(6 + f * 7); this.vel.x = damp(this.vel.x, hv.x, 1.2, dt); this.vel.z = damp(this.vel.z, hv.z, 1.2, dt);
      if ((input && (input.pressed('jump') || input.pressed('interact'))) || agl < 24) this.open(); }
    else { this.chuteK = Math.min(1, this.chuteK + dt * 2.2); this.yaw -= s * dt * 1.1; const fw = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const sp = f > 0 ? 12 : f < 0 ? 3.5 : 8.5, vs = f > 0 ? -6.5 : f < 0 ? -2.4 : -4.4;
      this.vel.x = damp(this.vel.x, fw.x * sp, 1.6, dt); this.vel.z = damp(this.vel.z, fw.z * sp, 1.6, dt); this.vel.y = damp(this.vel.y, vs, 2.5, dt); }
    this.pos.addScaledVector(this.vel, dt);
    const c = S.pushCircle(this.pos.x, this.pos.z, 0.4, this.pos.y, this.pos.y + 1.6); if (c.hit) { this.pos.x = c.x; this.pos.z = c.z; this.vel.x *= -0.3; this.vel.z *= -0.3; if (this.state === 'free' && this.vel.length() > 25) this.splat = true; }
    const g2 = S.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; if (this.pos.y <= g2) { this.pos.y = g2; if (this.state === 'free' && this.vel.y < -20) this.splat = true; this.landed = true; }
    const h = G.player.human; h.pos.copy(this.pos); h.yaw = this.yaw; h.weapon = null; h.aim = null; h.speed = 0;
    if (this.state === 'free') { h.state = 'skydive'; h.animate(dt); tipBody(h, Math.PI / 2 * 0.92); } else { h.state = 'hang'; h.swing = -f * 0.25; h.animate(dt); }
    if (this.state === 'chute') { this.canopy.position.copy(this.pos).add(V(0, 1.65, 0)); this.canopy.rotation.set(-0.15 - f * 0.1, this.yaw + Math.PI / 2, s * 0.25, 'YXZ'); const k = this.chuteK; this.canopy.scale.set(0.3 + k * 0.7, 0.3 + k * 0.7, 0.3 + k * 0.7); }
    if (this.snd) this.snd.update(this.pos, this.state === 'free' ? 1 : 0.35, this.state === 'free' ? 1 : 0.3);
  }
  camShot(dt) { const fw = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const want = this.state === 'free' ? this.pos.clone().addScaledVector(fw, -6).add(V(0, 5, 0)) : this.pos.clone().addScaledVector(fw, -9).add(V(0, 4.5, 0)); this._cp = this._cp ? this._cp.lerp(want, clamp(dt * 5, 0, 1)) : want.clone();
    return { pos: this._cp, look: this.state === 'free' ? this.pos.clone().addScaledVector(fw, 8).add(V(0, -14, 0)) : this.pos.clone().addScaledVector(fw, 14).add(V(0, -6, 0)), fov: this.state === 'free' ? 78 : 66 }; }
  dispose() { G.scene.remove(this.canopy); if (this.snd) this.snd.dispose(); }
}

// ---------------- penthouse: glass pavilion with a safe, on a roof ----------------
export function penthouse(c, roofY, facing) { // c: roof centre, facing: unit vector of the open (door) side
  const S = G.world.static; const g = new THREE.Group(); const boxes = []; const glass = mat(0x9fd6ff, { transparent: true, opacity: 0.28, metalness: 0.3, roughness: 0.05 }); const frame = mat(0x23272c, { metalness: 0.5 });
  const W = 10, D = 8, H = 3.4; const y = roofY; const ax = Math.abs(facing.x) > 0.5; // door on the side the facing vector points to
  const wall = (x0, z0, x1, z1, isGlass = true) => { const w = Math.max(0.2, Math.abs(x1 - x0)), d = Math.max(0.2, Math.abs(z1 - z0)); const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), isGlass ? glass : frame); m.position.set((x0 + x1) / 2, y + H / 2, (z0 + z1) / 2); g.add(m); boxes.push(S.addBox(Math.min(x0, x1) - 0.1, y, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, y + H, Math.max(z0, z1) + 0.1, { mat: 'glass' })); };
  const x0 = c.x - W / 2, x1 = c.x + W / 2, z0 = c.z - D / 2, z1 = c.z + D / 2; const gap = 2.4;
  // four walls, with a doorway in the facing wall
  const sides = [['z0', [x0, z0, x1, z0]], ['z1', [x0, z1, x1, z1]], ['x0', [x0, z0, x0, z1]], ['x1', [x1, z0, x1, z1]]]; const doorSide = ax ? (facing.x > 0 ? 'x1' : 'x0') : (facing.z > 0 ? 'z1' : 'z0');
  for (const [k, [a, b, cc, d]] of sides) { if (k !== doorSide) { wall(a, b, cc, d); continue; } if (a === cc) { const mid = (b + d) / 2; wall(a, b, cc, mid - gap / 2); wall(a, mid + gap / 2, cc, d); } else { const mid = (a + cc) / 2; wall(a, b, mid - gap / 2, d); wall(mid + gap / 2, b, cc, d); } }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.25, D + 0.6), frame); roof.position.set(c.x, y + H + 0.12, c.z); g.add(roof);
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, H, 0.25), frame); p.position.set(px, y + H / 2, pz); g.add(p); }
  // interior: rug, sofa, desk, lamp, plants, and the safe on the back wall
  const back = doorSide === 'x1' ? V(x0 + 0.5, 0, c.z) : doorSide === 'x0' ? V(x1 - 0.5, 0, c.z) : doorSide === 'z1' ? V(c.x, 0, z0 + 0.5) : V(c.x, 0, z1 - 0.5);
  const rug = new THREE.Mesh(new THREE.BoxGeometry(6, 0.03, 4.5), mat(0x7a2e3a)); rug.position.set(c.x, y + 0.02, c.z); g.add(rug);
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.9), mat(0xd8d2c4)); sofa.position.set(c.x + 1.5, y + 0.4, c.z + 1.6); g.add(sofa); boxes.push(S.addBox(c.x + 0.2, y, c.z + 1.15, c.x + 2.8, y + 0.8, c.z + 2.05));
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1), mat(0x3b2a1e)); desk.position.set(c.x - 2, y + 0.4, c.z - 1.5); g.add(desk); boxes.push(S.addBox(c.x - 3, y, c.z - 2, c.x - 1, y + 0.8, c.z - 1));
  for (const [px, pz] of [[x0 + 0.7, z0 + 0.7], [x1 - 0.7, z1 - 0.7]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8), mat(0x6b4a3a)); pot.position.set(px, y + 0.25, pz); g.add(pot); const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(0x2e7d32, { flatShading: true })); leaf.position.set(px, y + 1, pz); g.add(leaf); }
  const safe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.9), mat(0x2c3036, { metalness: 0.6, roughness: 0.35 })); safe.position.set(back.x, y + 0.65, back.z); safe.lookAt(c.x, y + 0.65, c.z); g.add(safe);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), mat(0xc9a640, { metalness: 0.8, roughness: 0.3 })); dial.rotation.x = Math.PI / 2; dial.position.set(0, 0.15, 0.48); safe.add(dial); const door = new THREE.Group(); safe.add(door);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); G.scene.add(g);
  const front = safe.position.clone().add(c.clone().setY(y + 0.65).sub(safe.position).setY(0).normalize().multiplyScalar(1.2)).setY(y);
  return { g, boxes, safe, dial, safePos: front, dispose() { G.scene.remove(g); for (const b of boxes) b.disabled = true; } };
}

// ---------------- safe-cracking minigame: stop the needle in the green, three times ----------------
export class SafeCrack {
  constructor(dial) { this.dial = dial; this.round = 0; this.misses = 0; this.t = 0; this.done = false; this.zone = this._zone();
    const el = this.el = document.createElement('div'); el.style.cssText = 'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);width:420px;max-width:86vw;z-index:60;font:700 15px Rajdhani,system-ui,sans-serif;color:#fff;text-align:center;letter-spacing:.12em;text-shadow:0 1px 3px #000;pointer-events:none';
    el.innerHTML = '<div class="sc-t">CRACK THE SAFE — PRESS E IN THE GREEN</div><div style="position:relative;height:22px;margin-top:8px;background:rgba(0,0,0,.55);border:2px solid rgba(255,255,255,.5);border-radius:4px"><div class="sc-z" style="position:absolute;top:0;bottom:0;background:#2ecc71"></div><div class="sc-n" style="position:absolute;top:-4px;bottom:-4px;width:4px;background:#ffd36b;box-shadow:0 0 8px #ffd36b"></div></div><div class="sc-p" style="margin-top:6px">TUMBLER 1 / 3</div>';
    document.body.appendChild(el); this.z = el.querySelector('.sc-z'); this.n = el.querySelector('.sc-n'); this.p = el.querySelector('.sc-p'); this._draw(); }
  _zone() { const w = 0.18 - this.round * 0.03; const c = rand(0.15 + w, 0.85 - w); return [c - w / 2, c + w / 2]; }
  _draw() { this.z.style.left = (this.zone[0] * 100) + '%'; this.z.style.width = ((this.zone[1] - this.zone[0]) * 100) + '%'; this.p.textContent = `TUMBLER ${Math.min(3, this.round + 1)} / 3${this.misses ? ` · MISSES ${this.misses}` : ''}`; }
  update(dt, input) { if (this.done) return; this.t += dt * (1 + this.round * 0.22); const x = 0.5 + 0.5 * Math.sin(this.t * 2.6); this.n.style.left = `calc(${x * 100}% - 2px)`; if (this.dial) this.dial.rotation.y = x * 8;
    if (input && input.pressed('interact')) { if (x >= this.zone[0] && x <= this.zone[1]) { this.round++; if (G.audio) G.audio.click(null, 1800, 0.5); if (this.round >= 3) { this.done = true; this.el.remove(); return; } } else { this.misses++; if (G.audio) G.audio.ui('error'); if (this.onMiss) this.onMiss(this.misses); } this.zone = this._zone(); this._draw(); } }
  dispose() { this.el.remove(); }
}
