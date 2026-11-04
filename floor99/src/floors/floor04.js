// FLOOR 4 — THE FACTORY
// Assembly Line A (conveyors, presses, robotic arms, a Clanker fabricator) → Molten Foundry
// (molten channels, catwalks, a pouring crucible on a moving crane, the gravity-cannon
// prototype) → Stamping Hall (press grid, Bruiser) → THE FOREMAN (ceiling-rail boss) →
// the factory tears itself apart → elevator.
import * as THREE from 'three';
import { Mat, moltenMaterial } from '../engine/materials.js';
import { textTexture } from '../engine/textures.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';
import { Enemy } from '../game/enemies.js';
import { setStyle } from '../engine/stylize.js';
import { pipeRun, embers } from './kit.js';
import { solid, wall, Press, Hatch, dropDrone, Mover, screen, sign, Spotlight, confetti, pyro, marquee, Elevator, stageLights } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const HW = 22; // half width
const LEN = 158;

function beltTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#16171b'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 16) { x.fillStyle = '#26282e'; x.fillRect(0, i, 128, 3); }
  x.fillStyle = '#f2c230';
  x.beginPath(); x.moveTo(44, 90); x.lineTo(64, 60); x.lineTo(84, 90); x.lineTo(74, 90); x.lineTo(64, 75); x.lineTo(54, 90); x.fill();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ destructible power core
class Core {
  constructor(g, pos, name, onDestroy) {
    this.g = g; this.name = name; this.onDestroy = onDestroy;
    this.pos = V(...pos).setY(pos[1] + 1.6);
    this.hp = this.max = 420; this.alive = true; this.radius = 1.4;
    const grp = this.grp = new THREE.Group(); grp.position.set(...pos); g.scene.add(grp);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.6, 16), Mat.metal('#2a2e36', 0.4, 0.9)); base.position.y = 0.3; grp.add(base);
    this.coreMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#25f4ff', emissiveIntensity: 4 });
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 20), this.coreMat); this.core.position.y = 1.7; grp.add(this.core);
    for (let i = 0; i < 6; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), Mat.metal('#888', 0.3, 1)); const a = i / 6 * Math.PI * 2; bar.position.set(Math.cos(a) * 1.1, 1.7, Math.sin(a) * 1.1); grp.add(bar); }
    for (const y of [0.55, 2.9]) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 6, 20), Mat.paint('#f2c230', 0.4, 0.5)); r.rotation.x = Math.PI / 2; r.position.y = y; grp.add(r); }
    const lbl = sign(g, [name], [0, 3.6, 0], 3.2, 0.8, 0, { parent: grp, glow: '#25f4ff', double: true });
    this.lbl = lbl;
    this.light = new THREE.PointLight('#25f4ff', 30, 12); this.light.position.y = 1.7; grp.add(this.light);
    const c = new Box({ pos: this.pos.clone(), size: [1.8, 2.8, 1.8] });
    c.owner = this; g.physics.add(c); this.collider = c;
    g.destructibles.push(this);
    g.addHazard(this);
    this.flash = 0;
  }
  onShot(dmg, info) {
    if (!this.alive) return;
    this.hp -= dmg * (info.weapon === 'hammer' || info.weapon === 'blades' ? 1.6 : 1);
    this.flash = 1;
    this.g.fx.electric(info.point || this.pos, 5, 0.4);
    this.g.audio.play('zap', { pos: this.pos });
    this.g.hud.hitmarker(false, false);
    if (this.hp <= 0) this.destroy();
  }
  destroy(silent) {
    this.alive = false;
    const g = this.g;
    this.core.visible = false; this.light.intensity = 0; this.lbl.visible = false; this.collider.enabled = false;
    if (silent) { if (this.onDestroy) this.onDestroy(); return; }
    g.explode(this.pos, 1.6, 40, { source: 'player' });
    g.fx.electric(this.pos, 40, 2);
    this.core.visible = false; this.light.intensity = 0; this.lbl.visible = false;
    g.audio.play('glassShatter', { pos: this.pos });
    g.audio.play('cheer', { big: 1.6 });
    g.addHype(0.15);
    g.player.shake(0.5);
    g.slowmo(0.35, 0.6);
    this.collider.enabled = false;
    if (this.onDestroy) this.onDestroy();
  }
  update(dt) {
    if (!this.alive) { if (Math.random() < dt * 6) this.g.fx.sparks(this.pos, 3, null, 5); if (Math.random() < dt * 3) this.g.fx.smokePuff(this.pos, 1, 1, 1.5); return; }
    this.core.rotation.y += dt * 2;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.coreMat.emissive.setRGB(0.15 + this.flash, 0.95 + this.flash * 0.05, 1);
    this.coreMat.emissiveIntensity = 2 + (this.hp / this.max) * 2 + this.flash * 4;
  }
}

// ------------------------------------------------------------------ robotic arm (animated, swats when close)
class RoboArm {
  constructor(g, pos, o = {}) {
    this.g = g; this.pos = V(...pos); this.facing = o.facing || 0;
    const paint = Mat.paint('#f2a51c', 0.4, 0.5), dark = Mat.metal('#2a2e36', 0.4, 0.9);
    this.base = new THREE.Group(); this.base.position.copy(this.pos); g.scene.add(this.base);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.2, 16), dark); b.position.y = 0.6; this.base.add(b);
    this.yawJ = new THREE.Group(); this.yawJ.position.y = 1.2; this.base.add(this.yawJ);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.8, 12), paint); t.position.y = 0.4; this.yawJ.add(t);
    this.sh = new THREE.Group(); this.sh.position.y = 0.9; this.yawJ.add(this.sh);
    const u = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.8), paint); u.position.y = 2.1; this.sh.add(u);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.0, 16), dark); hub.rotation.z = Math.PI / 2; this.sh.add(hub);
    this.el = new THREE.Group(); this.el.position.y = 4.2; this.sh.add(this.el);
    const hub2 = hub.clone(); this.el.add(hub2);
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.4, 0.6), paint); f.position.y = 1.7; this.el.add(f);
    this.wr = new THREE.Group(); this.wr.position.y = 3.4; this.el.add(this.wr);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.6, 12), dark); head.position.y = 0.3; this.wr.add(head);
    this.lampMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2020', emissiveIntensity: 0.3 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), this.lampMat); lamp.position.set(0, 0.5, 0.4); this.wr.add(lamp);
    this.claws = [];
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.35), Mat.metal('#ccc', 0.3, 1)); c.position.set(s * 0.3, 0.95, 0); this.wr.add(c); this.claws.push(c); }
    this.tip = new THREE.Object3D(); this.tip.position.y = 1.2; this.wr.add(this.tip);
    solid(g, { pos: [pos[0], 0.6, pos[2]], size: [2.4, 1.2, 2.4], collide: true, mat: dark }).mesh.visible = false;
    this.t = Math.random() * 10; this.state = 'work'; this.st = 0; this.cool = 2;
    this.speed = 1;
    g.addHazard(this);
  }
  update(dt) {
    const g = this.g, pl = g.player;
    this.t += dt * this.speed;
    this.cool -= dt;
    const d = _v.set(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = d.length();
    if (this.state === 'work') {
      this.yawJ.rotation.y = this.facing + Math.sin(this.t * 0.9) * 1.2;
      this.sh.rotation.x = 0.5 + Math.sin(this.t * 1.3) * 0.35;
      this.el.rotation.x = 1.2 + Math.sin(this.t * 1.3 + 1) * 0.4;
      this.wr.rotation.x = 0.6;
      this.lampMat.emissiveIntensity = 0.3;
      if (dist < 7.5 && this.cool <= 0 && pl.alive && Math.abs(pl.pos.y - this.pos.y) < 3) { this.state = 'wind'; this.st = 0; this.targetYaw = Math.atan2(d.x, d.z); g.audio.play('windup', { pos: this.pos }); }
    } else if (this.state === 'wind') {
      this.st += dt;
      this.yawJ.rotation.y += (this.targetYaw - 1.4 - this.yawJ.rotation.y) * Math.min(1, dt * 8);
      this.sh.rotation.x += (0.2 - this.sh.rotation.x) * Math.min(1, dt * 8);
      this.el.rotation.x += (1.9 - this.el.rotation.x) * Math.min(1, dt * 8);
      this.lampMat.emissiveIntensity = Math.sin(this.st * 40) > 0 ? 6 : 0.5;
      if (this.st > 0.75) { this.state = 'swat'; this.st = 0; this.hit = false; g.audio.play('swing', { pos: this.pos }); }
    } else if (this.state === 'swat') {
      this.st += dt;
      const k = Math.min(1, this.st / 0.3);
      this.yawJ.rotation.y = this.targetYaw - 1.4 + k * 2.8;
      this.sh.rotation.x = 1.25; this.el.rotation.x = 0.5;
      // analytic hit along the sweeping arm
      const tip = this.tip.getWorldPosition(new THREE.Vector3());
      if (!this.hit && tip.distanceTo(pl.pos.clone().setY(pl.pos.y + 1)) < 2.4) {
        this.hit = true;
        const kdir = new THREE.Vector3(Math.cos(this.yawJ.rotation.y), 0, -Math.sin(this.yawJ.rotation.y));
        pl.damage(20, { from: this.pos, knock: kdir.multiplyScalar(-14).setY(8), type: 'arm' });
        g.audio.play('punch', { pos: pl.pos });
      }
      for (const e of g.enemies) if (e.alive && !e.flying && tip.distanceTo(e.center(_v)) < 2.4) { e.takeDamage(60, { type: 'arm', env: true, dir: new THREE.Vector3(0, 0.5, 1), knock: 18 }); }
      if (k >= 1) { this.state = 'work'; this.cool = 2.5 / this.speed; }
    }
  }
}

// ------------------------------------------------------------------ THE FOREMAN (boss)
class Foreman extends Enemy {
  constructor(g, pos, F) {
    super(g, pos, { type: 'foreman', name: 'THE FOREMAN', hp: 1, radius: 3, height: 6, flying: true, heavy: true, score: 5000, spawnTime: 2.5 });
    this.F = F;
    this.parts = { armL: { hp: 340, max: 340, alive: true }, armR: { hp: 340, max: 340, alive: true }, core: { hp: 900, max: 900, alive: true } };
    const M = this.M = { paint: Mat.paint('#f2a51c', 0.4, 0.5).clone(), dark: Mat.metal('#23262e', 0.4, 0.9), steel: Mat.metal('#b0b8c0', 0.25, 1), eye: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff3010', emissiveIntensity: 4 }), weak: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#25f4ff', emissiveIntensity: 3 }) };
    M.paint.emissive = new THREE.Color(0); this.flashMats.push(M.paint);
    const r = this.root;
    // trolley on the rail
    this.trolley = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 4), M.dark); this.trolley.position.y = 6.5; r.add(this.trolley);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), M.steel); w.rotation.x = Math.PI / 2; w.position.set(s * 2, 7.2, 0); r.add(w); }
    this.body = new THREE.Group(); r.add(this.body);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2, 4, 8), M.paint); torso.position.y = 3.5; this.body.add(torso);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 10), M.steel); neck.position.y = 5.8; this.body.add(neck);
    for (let i = 0; i < 4; i++) { const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3, 0.4), M.dark); const a = i / 4 * Math.PI * 2 + Math.PI / 4; plate.position.set(Math.sin(a) * 2.4, 3.4, Math.cos(a) * 2.4); plate.rotation.y = a; this.body.add(plate); }
    // the eye / core
    this.eyeG = new THREE.Group(); this.eyeG.position.set(0, 1.4, 0); this.body.add(this.eyeG);
    const housing = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 14), M.dark); this.eyeG.add(housing);
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), M.eye); this.eye.position.z = 0.75; this.eyeG.add(this.eye);
    this.shutter = [];
    for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(1.36, 16, 10, 0, Math.PI, 0, Math.PI / 2), M.paint); sh.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; sh.rotation.z = Math.PI / 2; this.eyeG.add(sh); this.shutter.push(sh); }
    // hard hat (it is the Foreman)
    const hat = new THREE.Mesh(new THREE.SphereGeometry(2.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), Mat.paint('#ffd400', 0.35, 0.4)); hat.position.y = 5.3; hat.scale.y = 0.45; this.body.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.15, 24), Mat.paint('#ffd400', 0.35, 0.4)); brim.position.y = 5.3; this.body.add(brim);
    // arms
    this.arms = {};
    for (const [key, s] of [['armL', -1], ['armR', 1]]) {
      const sh = new THREE.Group(); sh.position.set(s * 3.0, 3.8, 0); this.body.add(sh);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), M.weak); sh.add(joint);
      const up = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.5, 1.1), M.paint); up.position.y = -2.4; sh.add(up);
      const el = new THREE.Group(); el.position.y = -4.6; sh.add(el);
      el.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), M.dark));
      const fo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 0.9), M.paint); fo.position.y = -2.2; el.add(fo);
      const hand = new THREE.Group(); hand.position.y = -4.4; el.add(hand);
      if (key === 'armR') { const ham = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 2.6), M.dark); hand.add(ham); const pad = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 2.7), Mat.hazard(1)); pad.position.y = -0.85; hand.add(pad); }
      else { for (const k of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 1.2), M.steel); c.position.set(k * 0.7, -0.9, 0); c.rotation.z = k * 0.3; hand.add(c); } }
      this.arms[key] = { sh, el, hand, joint, s };
      this.breakParts.push(sh);
    }
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 16, 12), M.steel); piston.position.y = 15; r.add(piston);
    const holder = new THREE.Object3D(); holder.position.y = 3.5; this.body.add(holder);
    this.torsoC = new Box({ size: [4.4, 4.4, 4.4] }); this.torsoC.attach(holder, new THREE.Vector3()); g.physics.add(this.torsoC);
    this.addHit(this.arms.armL.joint, V(0, 0, 0), 1.0, 2, 'armL');
    this.addHit(this.arms.armR.joint, V(0, 0, 0), 1.0, 2, 'armR');
    this.addHit(this.eyeG, V(0, 0, 0.6), 1.1, 1.6, 'core');
    this.addHit(this.body, V(0, 3.4, 0), 2.6, 0, 'body');
    this.y = 14; this.targetY = 4.5;
    this.attackT = 3; this.mode = 'idle'; this.mt = 0;
    this.deathScale = 3;
    this.laser = null;
  }
  totalFrac() { const P = this.parts; return (Math.max(0, P.armL.hp) + Math.max(0, P.armR.hp) + Math.max(0, P.core.hp)) / (P.armL.max + P.armR.max + P.core.max); }
  coreExposed() { return !this.parts.armL.alive && !this.parts.armR.alive; }
  takeDamage(amount, info = {}) {
    if (!this.alive || this.spawnT > 0) return 0;
    let tag = info.tag;
    if (!tag || tag === 'body') {
      if (!info.point) { if (info.type === 'explosion' || info.weapon === 'gravity') tag = this._nearestWeak(info.point || this.center(_v)); else { this.game.hud.armorPing(); return 0; } }
      else tag = this._nearestWeak(info.point, 2.2);
      if (!tag) { this.game.hud.armorPing(); this.game.fx.sparks(info.point || this.center(_v), 4, null, 5); return 0; }
    }
    const p = this.parts[tag];
    if (!p || !p.alive) return 0;
    if (tag === 'core' && !this.coreExposed()) { this.game.hud.armorPing(); this.game.fx.sparks(info.point || this.center(_v), 6, null, 6); return 0; }
    const dmg = amount * (info.mult || 1);
    p.hp -= dmg;
    this.flash = 1;
    if (p.hp <= 0) {
      p.alive = false;
      if (tag === 'core') { this.hp = 0; this.die(info); return dmg; }
      this._breakArm(tag);
    }
    return dmg;
  }
  aimArm(a, worldTarget, k) {
    const parent = a.sh.parent;
    parent.updateWorldMatrix(true, false);
    const local = parent.worldToLocal(worldTarget.clone()).sub(a.sh.position).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), local);
    a.sh.quaternion.slerp(q, Math.min(1, k));
    a.el.rotation.x += (0 - a.el.rotation.x) * Math.min(1, k);
  }
  _nearestWeak(pt, maxD = 99) {
    let best = null, bd = maxD;
    for (const h of this.hitSpheres) {
      if (h.tag === 'body') continue;
      if (!this.parts[h.tag].alive) continue;
      const d = this.sphereWorld(h, _v).distanceTo(pt) - h.r;
      if (d < bd) { bd = d; best = h.tag; }
    }
    return best;
  }
  _breakArm(tag) {
    const G = this.game, a = this.arms[tag];
    const p = a.joint.getWorldPosition(new THREE.Vector3());
    G.explode(p, 1.5, 0, { source: 'playerSafe' });
    G.fx.detach(a.sh, new THREE.Vector3(a.s * 6, 4, 2), 10, 0.8);
    this.breakParts = this.breakParts.filter((b) => b !== a.sh);
    this.hitSpheres = this.hitSpheres.filter((h) => h.tag !== tag);
    G.audio.play('cheer', { big: 1.4 });
    G.slowmo(0.4, 0.6);
    G.say('halo', tag === 'armL' ? 'That arm was under WARRANTY!' : 'You disarmed the Foreman! Literally! Lawyers are being notified!', { priority: 2, mood: 'furious' });
    if (this.coreExposed()) {
      G.say('iris', 'Both arms are gone — its core is open. Hit the eye!', { priority: 2 });
      this.targetY = 2.6;
      G.music.setState('boss');
    }
    G.emit('foremanArm', tag);
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    const F = this.F;
    // ride the rail: x follows player, z clamped to boss arena
    const follow = this.mode === 'slam' && this.target ? this.target : pl.pos;
    const tx = THREE.MathUtils.clamp(follow.x, -HW + 5, HW - 5), tz = THREE.MathUtils.clamp(follow.z - (this.mode === 'slam' ? 2.5 : 5), F.bossZ0 + 4, F.bossZ1 - 4);
    const sp = this.mode === 'slam' ? (this.mt < 1.1 ? 2.2 : 0) : this.mode === 'sweep' ? 0.2 : 1.2;
    this.pos.x += (tx - this.pos.x) * Math.min(1, dt * sp);
    this.pos.z += (tz - this.pos.z) * Math.min(1, dt * sp * 0.6);
    this.y += (this.targetY - this.y) * Math.min(1, dt * 1.5);
    this.pos.y = this.y;
    this.root.position.copy(this.pos);
    this.yaw = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z) * 0.4;
    this.root.rotation.y = this.yaw;
    G.hud.boss('THE FOREMAN', this.totalFrac());
    if (this.spawnT > 0) return;
    this.attackT -= dt;
    this.mt += dt;
    const A = this.arms;
    const idleArm = (a, t) => { this.aimArm(a, this.pos.clone().add(_v.set(a.s * 5 + Math.sin(t) * 1.5, 0, 3 + Math.cos(t))), dt * 2); a.el.rotation.x += ((-0.5) - a.el.rotation.x) * Math.min(1, dt * 3); };
    if (this.mode === 'idle') {
      if (this.parts.armL.alive) idleArm(A.armL, G.time * 1.3);
      if (this.parts.armR.alive) idleArm(A.armR, G.time * 1.1 + 1);
      if (this.attackT <= 0) {
        const opts = [];
        if (this.parts.armR.alive) opts.push('slam', 'slam');
        if (this.parts.armL.alive) opts.push('sweep');
        opts.push('spawn');
        if (this.coreExposed()) opts.push('laser', 'laser', 'spawnDrone');
        this.mode = opts[(Math.random() * opts.length) | 0];
        if (this.mode === 'spawn' && G.aliveEnemies() > 4) this.mode = this.coreExposed() ? 'laser' : 'slam';
        if (this.mode === 'slam' && !this.parts.armR.alive) this.mode = 'laser';
        this.mt = 0;
        this.target = pl.pos.clone();
        if (this.mode === 'slam') { G.audio.play('hydraulic', { pos: this.pos }); this.warnRing = this._warn(this.target, 3.6, 1.1); }
        if (this.mode === 'sweep') { G.audio.play('windup', { pos: this.pos }); G.hud.toast('CLAW SWEEP — JUMP!', 'warn'); }
        if (this.mode === 'laser') G.audio.play('railCharge', { pos: this.pos });
      }
    } else if (this.mode === 'slam') {
      const a = A.armR;
      if (this.mt < 1.1) this.aimArm(a, this.target.clone().add(_v.set(0, 14, 0)), dt * 5);
      else if (this.mt < 1.3) this.aimArm(a, this.target, Math.min(1, dt * 30));
      else if (!this.slammed) {
        this.slammed = true;
        G.audio.play('pressSlam', { pos: this.target });
        G.fx.ring(this.target.clone().setY(this.target.y + 0.1), 0.5, 6, 0.4, 0xffb060);
        G.fx.dust(this.target, 16, 1.5);
        pl.shake(0.6);
        if (pl.pos.distanceTo(this.target) < 3.6 && pl.pos.y - this.target.y < 1.5) pl.damage(32, { from: this.target, knock: _v.subVectors(pl.pos, this.target).setY(0).normalize().multiplyScalar(14).setY(8), type: 'slam' });
        G.shockwave(this.target, 5, 16, this);
        for (const e of G.enemies) if (e !== this && e.alive && e.pos.distanceTo(this.target) < 3.6) e.takeDamage(200, { type: 'crush', env: true });
        for (const p of G.props) if (p.alive && p.body.pos.distanceTo(this.target) < 3.2) G.destroyProp(p, { type: 'crush' });
      } else if (this.mt > 2.4) { this.mode = 'idle'; this.slammed = false; this.attackT = this.coreExposed() ? 1.5 : 2.2; }
    } else if (this.mode === 'sweep') {
      const a = A.armL;
      const fwd = _v2.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const k = THREE.MathUtils.clamp((this.mt - 0.9) / 1.2, 0, 1);
      const tgt = this.pos.clone().setY(0.7).addScaledVector(fwd, 3.5).addScaledVector(right, -9 + 18 * k);
      if (this.mt < 0.9) { this.aimArm(a, tgt, dt * 5); G.fx.sparks(tgt, 1, null, 3, FXColors.pink, FXColors.pinkEnd); }
      else if (this.mt < 2.1) {
        this.aimArm(a, tgt, Math.min(1, dt * 20));
        const tip = a.hand.getWorldPosition(new THREE.Vector3());
        G.fx.sparks(tip.clone().setY(0.2), 2, null, 6);
        if (!this.swHit && Math.hypot(tip.x - pl.pos.x, tip.z - pl.pos.z) < 2.4 && pl.pos.y < tip.y + 0.6) { this.swHit = true; pl.damage(24, { from: tip, knock: _v.copy(pl.pos).sub(this.pos).setY(0).normalize().multiplyScalar(12).setY(9), type: 'sweep' }); }
        for (const e of G.enemies) if (e !== this && e.alive && !e.flying && tip.distanceTo(e.center(_v)) < 2.5) e.takeDamage(100, { type: 'sweep', env: true, knock: 14, dir: new THREE.Vector3(0, 0.6, 1) });
        if (Math.floor(this.mt * 8) !== Math.floor((this.mt - dt) * 8)) G.audio.play('clank', { pos: tip });
      } else if (this.mt > 2.8) { this.mode = 'idle'; this.swHit = false; this.attackT = 2; }
    } else if (this.mode === 'spawn' || this.mode === 'spawnDrone') {
      if (this.mt > 0.6 && !this.spawned) {
        this.spawned = true;
        const p = this.pos.clone().setY(1);
        if (this.mode === 'spawn') { for (let i = 0; i < 2; i++) { const e = G.spawnEnemy('clanker', p.clone().add(_v.set(rand(-3, 3), 0, rand(-3, 3)))); e.vel.y = 6; } }
        else { dropDrone(G, [this.pos.x, this.pos.y + 2, this.pos.z], { drop: 4 }); }
        G.audio.play('hydraulic', { pos: this.pos });
      }
      if (this.mt > 1.5) { this.mode = 'idle'; this.spawned = false; this.attackT = 2.5; }
    } else if (this.mode === 'laser') {
      if (!this.laser) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.geometry.translate(0, 0.5, 0); m.geometry.rotateX(Math.PI / 2);
        G.scene.add(m); this.laser = m; this.laserPt = pl.pos.clone();
      }
      const from = this.eye.getWorldPosition(new THREE.Vector3());
      this.laserPt.lerp(pl.pos, Math.min(1, dt * (this.mt < 0.8 ? 0.5 : 1.6)));
      this.laserPt.y = pl.pos.y > 2 ? pl.pos.y : 0;
      const to = this.laserPt.clone();
      this.laser.position.copy(from);
      this.laser.lookAt(to);
      this.laser.scale.set(this.mt < 0.8 ? 0.3 : 1.6, this.mt < 0.8 ? 0.3 : 1.6, from.distanceTo(to));
      G.fx.sparks(to, 3, null, 6, FXColors.fire, FXColors.fireEnd);
      if (this.mt > 0.8) {
        G.audio.loop('rail', 0.15, { rate: 0.4 });
        if (to.distanceTo(pl.pos) < 1.4 && (this._lt = (this._lt || 0) - dt) <= 0) { this._lt = 0.3; pl.damage(12, { from, type: 'laser' }); }
        G.fx.fire(to, 2, 0.6, 0.3);
      }
      if (this.mt > 4.2) { G.scene.remove(this.laser); this.laser = null; this.mode = 'idle'; this.attackT = 1.8; G.audio.loop('rail', 0); }
    }
    // eye shutters open when exposed
    const open = this.coreExposed() ? 1 : 0;
    this.shutter[0].rotation.y = open * 0.9; this.shutter[1].rotation.y = -open * 0.9;
    this.M.eye.emissiveIntensity = 3 + Math.sin(G.time * 8) * 1 + (this.mode === 'laser' ? 4 : 0);
    if (!this.parts.armL.alive || !this.parts.armR.alive) if (Math.random() < dt * 8) G.fx.sparks(this.pos.clone().setY(this.pos.y + 4), 3, null, 6);
  }
  _warn(pos, r, life) {
    const G = this.game;
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(pos.y + 0.06); G.scene.add(m);
    G.later(life + 0.3, () => G.scene.remove(m));
    return m;
  }
  die(info) {
    if (!this.alive) return;
    if (this.laser) { this.game.scene.remove(this.laser); this.laser = null; this.game.audio.loop('rail', 0); }
    this.game.hud.boss(null);
    this.game.physics.remove(this.torsoC);
    super.die(info);
    const G = this.game;
    for (let i = 0; i < 6; i++) G.later(0.2 + i * 0.25, () => G.explode(this.pos.clone().add(_v.set(rand(-4, 4), rand(-2, 4), rand(-3, 3))), 1.4, 0, { source: 'playerSafe' }));
  }
}
const _v2 = new THREE.Vector3();

// ================================================================== BUILD
function build(g, { checkpoint }) {
  const F = {
    spawn: { pos: [0, 0.2, -3], yaw: 0 },
    checkpoints: { 1: { pos: [0, 0.2, 50], yaw: 0 }, 2: { pos: [0, 0.2, 94], yaw: 0 }, 3: { pos: [0, 0.2, 124], yaw: 0 }, 4: { pos: [0, 0.2, 150], yaw: 0 } },
    bounds: { minX: -HW, maxX: HW, minZ: 0, maxZ: LEN },
    groundY: 0, ceilingY: 24, killY: -10,
    nav: { minX: -HW, maxX: HW, minZ: -6, maxZ: LEN, cell: 1.5, minY: -0.5, maxY: 1.4, topY: 9 },
    spawnPoints: [[-10, 0, 20], [10, 0, 30], [-12, 0, 70], [12, 0, 80], [-8, 0, 110], [8, 0, 118]],
    beastSpawn: null,
    votePool: ['barrels', 'lightsout', 'doublebots', 'freeze', 'lasers', 'lowgrav', 'firestorm', 'accelerate', 'reverse', 'overflow', 'gravflip'],
    fogDensity: 0.011,
    floodable: false,
    events: {},
    bossZ0: 128, bossZ1: 156,
  };
  F.center = [0, 0, 0];
  setStyle({ rim: '#ff9a4a', rimStrength: 0.8, sky: '#5a8cff', ground: '#a04a1a' });
  g.scene.background = new THREE.Color('#0b0806');
  g.scene.fog = new THREE.FogExp2('#12141c', F.fogDensity);
  stageLights(g, { sky: '#5a78b8', ground: '#2a1a14', hemi: 0.42, key: '#c8dcff', keyI: 1.8, dir: [-0.35, 1, 0.25] });
  const host = g.host;

  // ------------------------------------------------------------ SHELL: floor, walls, roof
  const floorMat = Mat.concrete('#34312c', 8);
  // floor split into segments around the molten channels (z 60, 72, 84)
  const floorSegs = [[-8, 60], [63, 72], [75, 84], [87, LEN + 4]];
  for (const [z0, z1] of floorSegs) solid(g, { pos: [0, -0.5, (z0 + z1) / 2], size: [2 * HW, 1, z1 - z0], mat: floorMat, cast: false });
  const wallM = Mat.panel('#2a2826', 1);
  for (const s of [-1, 1]) {
    solid(g, { pos: [s * (HW + 0.5), 12, LEN / 2 - 2], size: [1, 24, LEN + 12], mat: wallM, uv: 6 });
    // window strips (emissive)
    for (let z = 6; z < LEN; z += 12) { const w = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff9a3a', emissiveIntensity: 1.2 })); w.position.set(s * (HW - 0.01), 16, z); w.rotation.y = -s * Math.PI / 2; g.scene.add(w); }
  }
  solid(g, { pos: [0, 12, -8.5], size: [2 * HW + 2, 24, 1], mat: wallM });
  solid(g, { pos: [0, 12, LEN + 4.5], size: [2 * HW + 2, 24, 1], mat: wallM });
  wall(g, [0, 24.5, LEN / 2], [2 * HW + 4, 1, LEN + 20], { ceiling: true });
  // roof trusses
  const trussM = Mat.metal('#3a3530', 0.5, 0.8);
  for (let z = 0; z < LEN; z += 8) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.6, 0.6), trussM); t.position.set(0, 22, z); g.scene.add(t);
    if (z % 16 === 0) { const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.6, 12, 1, true), Mat.metal('#222', 0.5, 0.8)); lamp.position.set(0, 20.5, z); g.scene.add(lamp); const bulb = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffe0b0', emissiveIntensity: 3 })); bulb.rotation.x = Math.PI / 2; bulb.position.set(0, 20.2, z); g.scene.add(bulb); }
  }
  // practical lights down the hall (dimmable)
  for (const z of [10, 40, 75, 110, 142]) { const l = new THREE.PointLight('#bcd4ff', 45, 38, 1.4); l.position.set(0, 18, z); g.scene.add(l); g.dim(l); }

  // ------------------------------------------------------------ INDUSTRIAL DRESSING: pipe runs along both walls
  for (const s2 of [-1, 1]) {
    const x = s2 * (HW - 0.7);
    pipeRun(g, [[x, 2.2, -6], [x, 2.2, LEN + 2]], { r: 0.55, stripes: 'red', flangeEvery: 6 });
    pipeRun(g, [[x + -s2 * 0.4, 7.5, -6], [x + -s2 * 0.4, 7.5, 40], [x + -s2 * 0.4, 11, 44], [x + -s2 * 0.4, 11, LEN + 2]], { r: 0.38, copper: true, flangeEvery: 5, valve: 0 });
    for (let z = 8; z < LEN; z += 26) pipeRun(g, [[x, 0, z], [x, 13, z], [x - s2 * 4, 16, z], [x - s2 * 4, 22, z]], { r: 0.5, stripes: 'yellow', valve: 0 });
  }
  pipeRun(g, [[-HW, 18, 58], [HW, 18, 58]], { r: 0.6, stripes: 'red', flangeEvery: 5 });
  pipeRun(g, [[-HW, 16.5, 98], [HW, 16.5, 98]], { r: 0.5, copper: true, valve: 0 });
  // ------------------------------------------------------------ ARRIVAL ELEVATOR + DOCK
  F.arrive = new Elevator(g, { pos: [0, 0, -7.6], rotY: Math.PI, open: false });
  F.arrive.entered = true;
  sign(g, ['ASSEMBLY HALL 4'], [0, 14, -7.9], 18, 3.2, 0, { glow: '#ff9a3a', color: '#ffe6c8', size: 150 });
  screen(g, host, [-12, 9, -7.7], 5, 0);
  screen(g, host, [12, 9, -7.7], 5, 0);
  for (const [x, z] of [[-14, 4], [-15, 7], [14, 3], [15.5, 6], [-9, 9]]) g.addProp(Math.random() < 0.5 ? 'crate' : 'crateBig', [x, 1, z]);
  g.addProp('barrel', [8, 0.6, 8]); g.addProp('barrel', [9, 0.6, 9.2]);

  // ------------------------------------------------------------ ASSEMBLY LINE A (z 14..50)
  const beltTex = beltTexture();
  F.belts = [];
  F.beltSpeed = 3.2;
  F.beltDir = 1;
  for (const x of [-10, 10]) {
    const tex = beltTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, 10);
    const beltMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const { mesh, collider } = solid(g, { pos: [x, 0.5, 31], size: [5, 1, 36], mat: [Mat.metal('#2a2e36'), Mat.metal('#2a2e36'), beltMat, Mat.metal('#2a2e36'), Mat.metal('#2a2e36'), Mat.metal('#2a2e36')] });
    collider.conveyor = V(0, 0, -F.beltSpeed);
    for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 36), Mat.paint('#f2c230', 0.4, 0.4)); rail.position.set(x + s * 2.6, 1.1, 31); g.scene.add(rail); }
    F.belts.push({ x, mesh, collider, tex });
  }
  // presses over the belts
  F.lineAPresses = [];
  for (const x of [-10, 10]) for (const z of [24, 38]) {
    const pr = new Press(g, { pos: [x, 0, z], size: [4.6, 2.4, 4], lowY: 1.0, highY: 7, cycle: { up: 1.8, warn: 0.6, down: 0.2, hold: 0.5, rise: 1 }, offset: rand(0, 3) });
    g.addHazard(pr); F.lineAPresses.push(pr);
  }
  // robotic arms
  F.arms = [new RoboArm(g, [-3.5, 0, 22], { facing: -Math.PI / 2 }), new RoboArm(g, [3.5, 0, 34], { facing: Math.PI / 2 }), new RoboArm(g, [-3.5, 0, 44], { facing: -Math.PI / 2 })];
  // the fabricator (end of the lines) + core 1
  for (const x of [-10, 10]) {
    const { mesh } = solid(g, { pos: [x, 4, 52], size: [7, 8, 4], mat: Mat.panel('#2a2e36', 1) });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff5a10', emissiveIntensity: 2 })); door.position.set(0, -1.4, -2.01); door.rotation.y = Math.PI; mesh.add(door);
    sign(g, ['FABRICATOR'], [x, 8.6, 49.9], 6, 1.2, Math.PI, { glow: '#ff9a3a' });
  }
  F.fabOn = true; F.fabT = 4;
  F.cores = [];
  F.cores.push(new Core(g, [0, 0, 49], 'LINE A CORE', () => F.onCore(0)));
  sign(g, ['PRODUCTION: CLANKERS'], [0, 12, 50], 14, 2.2, Math.PI, { glow: '#ff2d6f' });

  // ------------------------------------------------------------ MOLTEN FOUNDRY (z 55..95)
  const molten = moltenMaterial({ scale: 0.3 });
  F.channels = [];
  for (const z of [61.5, 73.5, 85.5]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.2, 3), molten); m.position.set(0, -0.6, z); g.scene.add(m);
    const c = g.physics.addBox({ pos: V(0, -0.7, z), size: [2 * HW, 0.2, 3], hazard: { dps: 45, type: 'molten' } });
    c.noSafe = true;
    for (const s of [-1, 1]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.25, 0.3), Mat.paint('#f2c230', 0.5, 0.4)); lip.position.set(0, 0.02, z + s * 1.6); g.scene.add(lip); }
    for (const lx of [-12, 12]) { const l = new THREE.PointLight('#ff6a1a', 45, 16, 1.4); l.position.set(lx, 1.2, z); g.scene.add(l); }
    F.channels.push({ z, m });
    embers(g, { minX: -HW + 1, maxX: HW - 1, minZ: z - 1.4, maxZ: z + 1.4, y: -0.3 }, 14);
  }
  // narrow bridges over channels
  for (const z of [61.5, 73.5, 85.5]) for (const x of [-14, 0, 14]) solid(g, { pos: [x, 0.05, z], size: [2.2, 0.3, 3.6], mat: Mat.grate(1) });
  // catwalks
  const cw = Mat.grate(3);
  solid(g, { pos: [-15, 5, 77], size: [6, 0.4, 34], mat: cw });
  solid(g, { pos: [15, 5, 77], size: [6, 0.4, 34], mat: cw });
  solid(g, { pos: [0, 5, 92], size: [24, 0.4, 4], mat: cw });
  solid(g, { pos: [-15, 2.5, 57.3], size: [3, 0.4, 7.5], rot: [-0.62, 0, 0], mat: cw }); // ramp up
  solid(g, { pos: [15, 2.5, 57.3], size: [3, 0.4, 7.5], rot: [-0.62, 0, 0], mat: cw });
  for (const s of [-1, 1]) for (let z = 62; z < 94; z += 6) solid(g, { pos: [s * 15, 2.5, z], size: [0.5, 5, 0.5], mat: Mat.metal('#3a3530') });
  // crucible crane
  F.crane = { x: 0, dir: 1, z: 72, t: 0 };
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 0.8, 1.2), Mat.metal('#5a5040', 0.5, 0.8)); rail.position.set(0, 19, 72); g.scene.add(rail);
  F.trolley = new THREE.Group(); F.trolley.position.set(0, 18, 72); g.scene.add(F.trolley);
  F.trolley.add(new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 3), Mat.paint('#f2c230', 0.4, 0.5)));
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 6), Mat.metal('#222')); cable.position.y = -4.2; F.trolley.add(cable);
  F.crucible = new THREE.Group(); F.crucible.position.y = -9; F.trolley.add(F.crucible);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.5, 3, 16, 1, true), Mat.metal('#3a3530', 0.6, 0.8)); bucket.material.side = THREE.DoubleSide; F.crucible.add(bucket);
  const meltTop = new THREE.Mesh(new THREE.CircleGeometry(1.9, 20), molten); meltTop.rotation.x = -Math.PI / 2; meltTop.position.y = 1.2; F.crucible.add(meltTop);
  const cg = g.addGrapplePoint(V(0, 16.5, 72), { parent: null });
  F.craneGP = cg;
  F.puddles = [];
  // gravity cannon prototype display (on the left catwalk)
  F.gravCase = solid(g, { pos: [-15, 6.0, 80], size: [1.6, 1.6, 1.6], mat: Mat.glass('#ffd0ff', 0.2), collide: false }).mesh;
  sign(g, ['PROTOTYPE'], [-15, 7.4, 80], 2.4, 0.6, Math.PI / 2, { glow: '#a050ff', double: true });
  // core 2 on a platform above the far channel
  solid(g, { pos: [0, 2.2, 79.5], size: [6, 0.6, 6], mat: Mat.grate(2) });
  for (const [x, z] of [[-2.6, 77], [2.6, 77], [-2.6, 82], [2.6, 82]]) solid(g, { pos: [x, 1, z], size: [0.4, 2, 0.4], mat: Mat.metal('#3a3530') });
  solid(g, { pos: [0, 1.0, 76.0], size: [3, 0.4, 5], rot: [0.42, 0, 0], mat: Mat.grate(1) });
  F.cores.push(new Core(g, [0, 2.5, 80], 'LINE B CORE', () => F.onCore(1)));
  g.addGrapplePoint(V(0, 9, 80));
  for (const [x, z] of [[-8, 66], [8, 68], [-6, 79], [10, 81], [-12, 90], [12, 90]]) g.addProp('barrel', [x, 0.6, z]);

  // ------------------------------------------------------------ STAMPING HALL (z 98..124)
  F.gate1 = solid(g, { pos: [0, 5, 96], size: [2 * HW, 10, 1], mat: Mat.hazard(6), dynamic: true });
  F.stampPresses = [];
  for (const [x, z] of [[-11, 104], [11, 104], [-11, 116], [11, 116], [0, 110]]) {
    const pr = new Press(g, { pos: [x, 0, z], size: [6, 3, 6], lowY: 0, highY: 9, cycle: { up: 2, warn: 0.8, down: 0.18, hold: 0.7, rise: 1 }, offset: rand(0, 3.5), rods: [[-1.5, 0], [1.5, 0]] });
    g.addHazard(pr); F.stampPresses.push(pr);
  }
  for (const [x, z] of [[-4, 102], [4, 118], [-17, 110], [17, 110]]) solid(g, { pos: [x, 1.5, z], size: [1.6, 3, 1.6], mat: Mat.panel('#3a3530') });
  F.cores.push(new Core(g, [0, 0, 121.5], 'LINE C CORE', () => F.onCore(2)));
  F.hatches = [[-16, 0, 100], [16, 0, 100], [-16, 0, 120], [16, 0, 120], [-8, 0, 30], [8, 0, 18], [-17, 0, 68], [17, 0, 82]].map((p) => new Hatch(g, p, { color: '#ff9a3a' }));
  F.bigHatch = new Hatch(g, [0, 0, 100], { size: 4, color: '#ffd400' });

  // ------------------------------------------------------------ BOSS ARENA (z 128..156)
  F.gate2 = solid(g, { pos: [0, 5, 126], size: [2 * HW, 10, 1], mat: Mat.hazard(6), dynamic: true });
  const bossRail = new THREE.Mesh(new THREE.BoxGeometry(2 * HW, 1, 1.4), Mat.metal('#5a5040', 0.5, 0.8)); bossRail.position.set(0, 21.5, 142); g.scene.add(bossRail);
  for (const [x, z] of [[-13, 134], [13, 134], [-13, 150], [13, 150]]) { solid(g, { pos: [x, 2, z], size: [2.4, 4, 2.4], mat: Mat.panel('#3a3530') }); }
  marquee(g, [0, 11, 157.4], 30, Math.PI, 30, '#ff9a3a');
  sign(g, ['MANAGEMENT'], [0, 13.5, 157.9], 16, 3, Math.PI, { glow: '#ff2d6f', size: 150 });
  F.exit = new Elevator(g, { pos: [0, 0, 157.6], rotY: 0, onEnter: () => F.onExit() });
  F.spots = [new Spotlight(g, [-15, 21, 136], '#ff9a3a', { center: [0, 0, 142], radius: 10 }), new Spotlight(g, [15, 21, 148], '#ffffff', { center: [0, 0, 142], radius: 10, intensity: 600 })];
  for (const [x, z] of [[-6, 138], [7, 146], [-9, 150]]) g.addProp('barrel', [x, 0.6, z]);

  // ------------------------------------------------------------ floor events
  F.speedMul = 1;
  F.events.accelerate = {
    label: 'ACCELERATE MACHINERY', kind: 'disaster', dur: 22, banner: 'PRODUCTION SPEED: MAXIMUM', icon: '⏩',
    start() { F.speedMul = 2.4; g.audio.loop('machinery', 0.4, { rate: 1.8 }); },
    end() { F.speedMul = 1; g.audio.loop('machinery', 0.25, { rate: 1 }); },
  };
  F.events.reverse = {
    label: 'REVERSE THE LINES', kind: 'chaos', dur: 22, banner: 'LINES REVERSED', icon: '🔁',
    start() { F.beltDir = -1.6; F.reversed = true; },
    end() { F.beltDir = 1; F.reversed = false; },
  };
  F.overflowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, 34), molten); F.overflowMesh.rotation.x = -Math.PI / 2; F.overflowMesh.position.set(0, -1, 73.5); g.scene.add(F.overflowMesh);
  F.overflowLevel = -1; F.overflowTarget = -1;
  F.events.overflow = {
    label: 'MOLTEN OVERFLOW', kind: 'disaster', dur: 16, banner: 'MOLTEN OVERFLOW — GET HIGH', icon: '🌋',
    start() { F.overflowTarget = 0.35; g.audio.play('fireJet', { pos: V(0, 0, 73) }); },
    end() { F.overflowTarget = -1; },
  };

  // ------------------------------------------------------------ per-frame logic
  F.update = (dt) => {
    const sm = F.speedMul;
    // belts
    for (const b of F.belts) {
      const v = F.beltSpeed * F.beltDir * sm * (F.lineADead ? 0.15 : 1);
      b.collider.conveyor.set(0, 0, -v);
      b.tex.offset.y += v * dt / 3.6;
    }
    for (const pr of F.lineAPresses) pr.cycle.up = 1.8 / sm;
    for (const pr of F.stampPresses) pr.cycle.up = 2 / sm;
    for (const a of F.arms) a.speed = sm;
    // fabricator spits clankers (or crates when reversed)
    if (F.fabOn && !F.lineADead) {
      F.fabT -= dt * sm;
      if (F.fabT <= 0) {
        F.fabT = 7;
        const x = Math.random() < 0.5 ? -10 : 10;
        if (F.reversed || g.aliveEnemies() > 6) { g.addProp(Math.random() < 0.5 ? 'crate' : 'barrel', [x, 2, 48]); }
        else if (F.lineAActive) { const e = g.spawnEnemy('clanker', V(x, 1.2, 48)); e.seen = true; }
        else g.addProp('crate', [x, 2, 48]);
      }
    }
    // crane + crucible pour
    const C = F.crane;
    C.t += dt * sm;
    C.x += C.dir * dt * 3 * sm;
    if (C.x > HW - 5) C.dir = -1; if (C.x < -HW + 5) C.dir = 1;
    F.trolley.position.x = C.x;
    F.craneGP.obj.position.set(C.x, 16.5, 72);
    if (F.foundryActive && C.t > 6) {
      const tilt = Math.min(1, (C.t - 6) / 0.8);
      F.crucible.rotation.z = tilt * 1.2 * C.dir;
      if (tilt >= 1) {
        const lip = F.crucible.localToWorld(V(1.8 * C.dir, 1.2, 0));
        for (let i = 0; i < 3; i++) g.fx.glow.emit(lip.x, lip.y, lip.z, rand(-0.4, 0.4) + C.dir * 2, rand(-1, 0), rand(-0.4, 0.4), 1.2, 0.7, 0.5, FXColors.fire, [1.6, 0.5, 0.1, 0.6], -16, 0.2);
        if (Math.random() < dt * 4) F.puddle(V(lip.x + C.dir * 1.5, 0, 72 + rand(-1, 1)));
      }
      if (C.t > 9) { C.t = 0; F.crucible.rotation.z = 0; }
    } else F.crucible.rotation.z *= 0.9;
    // puddles
    const pl = g.player;
    for (let i = F.puddles.length - 1; i >= 0; i--) {
      const p = F.puddles[i];
      p.t -= dt;
      p.m.scale.setScalar(Math.min(1, p.t / 2) * p.r);
      if (p.t <= 0) { g.scene.remove(p.m); F.puddles.splice(i, 1); continue; }
      if (Math.hypot(pl.pos.x - p.pos.x, pl.pos.z - p.pos.z) < p.r * Math.min(1, p.t / 2) && pl.pos.y < 0.5 && (pl._pt = (pl._pt || 0) - dt) <= 0) { pl._pt = 0.4; pl.damage(10, { type: 'molten', knock: V(0, 8, 0) }); g.emit('burned'); }
      for (const e of g.enemies) if (e.alive && !e.flying && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < p.r && Math.random() < dt * 3) e.takeDamage(15, { type: 'molten', env: true });
      if (Math.random() < dt * 4) g.fx.fire(p.pos, 1, 0.5, p.r * 0.5);
    }
    // overflow
    F.overflowLevel += (F.overflowTarget - F.overflowLevel) * Math.min(1, dt * 0.8);
    F.overflowMesh.position.y = F.overflowLevel;
    if (F.overflowLevel > 0.05) {
      if (pl.grounded && pl.pos.z > 57 && pl.pos.z < 90 && pl.pos.y < F.overflowLevel + 0.1 && (pl._ot = (pl._ot || 0) - dt) <= 0) { pl._ot = 0.3; pl.damage(9, { type: 'molten', knock: V(0, 9, 0) }); g.emit('burned'); }
      for (const e of g.enemies) if (e.alive && !e.flying && e.pos.z > 57 && e.pos.z < 90 && e.pos.y < F.overflowLevel + 0.1 && Math.random() < dt * 4) e.takeDamage(20, { type: 'molten', env: true });
    }
    if (F.collapse) {
      F.collapseT = (F.collapseT || 0) + dt;
      if (Math.random() < dt * 3) { const p = V(rand(-HW + 2, HW - 2), 22, rand(128, 156)); const pr = g.addProp(Math.random() < 0.4 ? 'barrel' : 'metalCrate', p); pr.thrown = Math.random() < 0.5; pr.thrownT = 5; g.fx.sparks(p, 10, null, 8); }
      if (Math.random() < dt * 2) g.fx.explosion(V(rand(-HW, HW), rand(8, 20), rand(100, 156)), 0.8, { debris: true });
    }
  };
  F.puddle = (pos) => {
    if (F.puddles.length > 10) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 20), molten); m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(0.03); g.scene.add(m);
    F.puddles.push({ m, pos: pos.clone(), r: rand(1.4, 2.2), t: 6 });
  };
  F.openGate = (gate) => {
    g.audio.play('hydraulic', { pos: gate.mesh.position });
    let t = 0;
    g.addHazard({ update(dt) { t += dt; gate.mesh.position.y = 5 + Math.min(1, t / 2.5) * 19; if (t > 2.5) this.dead = true; } });
  };
  F.wave = (list) => {
    list.forEach(([type, where, delay, opts], i) => g.later(delay ?? i * 0.5, () => {
      if (type === 'drone') dropDrone(g, where);
      else if (typeof where === 'number') (where === -1 ? F.bigHatch : F.hatches[where]).spawn(type, opts);
      else g.spawnEnemy(type, V(...where), opts);
    }));
  };
  g.audio.loop('machinery', 0.25, { rate: 1 });
  return F;
}

// ================================================================== SCRIPT
function* script(g, cp) {
  const F = g.floor;
  const say = (who, t, o) => g.say(who, t, o);
  const K = (k) => `<span class="key">${k}</span>`;
  const allDead = () => g.aliveEnemies() === 0;
  F.coresDown = 0;
  F.onCore = (i) => {
    F.coresDown++;
    g.setObjective('SHUT DOWN THE ASSEMBLY LINES', `${F.coresDown} / 3 power cores destroyed`);
    if (i === 0) { F.lineADead = true; F.fabOn = false; }
  };
  // restore checkpoint state
  if (cp >= 1) { F.cores[0].hp = 0; F.cores[0].destroy(true); F.lineADead = true; F.fabOn = false; F.coresDown = 1; }
  if (cp >= 2) { F.cores[1].hp = 0; F.cores[1].destroy(true); F.openGate(F.gate1); F.coresDown = 2; }
  if (cp >= 3) { F.cores[2].hp = 0; F.cores[2].destroy(true); F.openGate(F.gate2); F.coresDown = 3; }
  F.foundryActive = cp >= 1;
  g.music.setState('explore'); g.musicState = 'explore';

  if (cp === 0) {
    say('halo', 'Welcome to THE FACTORY! Every robot you have ever destroyed was born right here. Show some respect. Or do not — the audience prefers do not.', { mood: 'gleeful' });
    g.setObjective('SHUT DOWN THE ASSEMBLY LINES', '0 / 3 power cores destroyed');
    yield 5;
    g.renderer.fx.uGlitch.value = 0.4; g.audio.play('static', { dur: 0.4, vol: 0.4 });
    say('iris', 'Three lines feed this floor. Kill the power cores and the robots stop coming. ...I designed those presses. Sorry in advance.', { priority: 3 });
    yield 1; g.renderer.fx.uGlitch.value = 0;
    F.lineAActive = true;
    g.music.setState('combat'); g.musicState = 'combat';
    F.wave([['clanker', 4], ['clanker', 5, 0.6], ['drone', [0, 22, 30], 1.5]]);
    g.hud.hint(`Conveyors carry you · presses crush you · ${K('C')} slide under, or time it`, 6, 'factory');
    yield 12;
    g.audience.setAuto(true, 25);
    yield () => !F.cores[0].alive;
    say('halo', 'Do you have ANY idea what downtime costs?! The audience demands compensation!', { mood: 'annoyed', priority: 2 });
    g.audience.setAuto(false);
    yield 2;
    g.audience.startVote({ title: 'THE AUDIENCE HAS SPOKEN!', options: ['accelerate', 'reverse'] });
    yield () => !g.audience.voting;
    g.checkpoint(1);
  }
  F.foundryActive = true;
  if (cp <= 1) {
    g.music.setState('combat'); g.musicState = 'combat';
    g.setObjective('SHUT DOWN THE ASSEMBLY LINES', `${F.coresDown} / 3 — Line B is in the foundry`);
    g.audience.setAuto(true, 30);
    F.wave([['clanker', 6], ['clanker', 7, 1], ['shield', [0, 0, 92], 2], ['drone', [-10, 22, 75], 3], ['drone', [10, 22, 85], 4]]);
    yield 3;
    // gravity cannon prototype
    if (!g.save.data.unlocked.weapons.includes('gravity') || !g.player.arsenal.slots.some((s) => s.id === 'gravity')) {
      say('iris', 'Left catwalk. There\'s a prototype they never shipped — I pulled it out of storage for you.', { priority: 2 });
      const gift = g.addPickup('gift', V(-15, 7.2, 80), { onPick: () => {
        F.gravCase.visible = false;
        g.player.arsenal.addWeapon('gravity');
        g.save.unlockWeapon('gravity');
        g.hud.toast('UNLOCKED: APPLAUSE GRAV-CANNON', 'unlock');
        g.music.sting('unlock');
        g.hud.hint(`GRAV-CANNON: tap ${K('LMB')} blast · hold ${K('LMB')} grab · release to THROW`, 7, 'grav');
        say('halo', 'Hey! That is a PROTOTYPE! It is not even out of beta!', { mood: 'furious', priority: 2 });
      } });
      gift.landed = true;
    }
    g.host.tip('shield');
    yield () => !F.cores[1].alive;
    F.openGate(F.gate1);
    say('iris', 'Line B is down. The Foreman runs the last hall. It\'s old — it was here before the show. Before Halo.', { priority: 3 });
    g.checkpoint(2);
  }
  if (cp <= 2) {
    g.music.setState('disaster'); g.musicState = 'disaster';
    g.setObjective('SHUT DOWN THE ASSEMBLY LINES', `${F.coresDown} / 3 — Line C: the Stamping Hall`);
    say('halo', 'The STAMPING HALL! Where we stamp things. Flat. Mostly contestants.', { mood: 'gleeful' });
    F.wave([['bruiser', -1, 1], ['clanker', 0, 2], ['clanker', 1, 2.5], ['clanker', 2, 4], ['drone', [0, 22, 110], 5]]);
    yield 4;
    g.host.tip('bruiser');
    yield () => !F.cores[2].alive;
    g.audience.setAuto(false);
    g.audience.cancel();
    g.checkpoint(3);
  }
  if (cp <= 3) {
    // ------------------------------------------------- THE FOREMAN
    F.openGate(F.gate2);
    g.music.play('boss', 'boss'); g.musicState = 'boss';
    say('halo', 'You want to shut down MY factory? Then you can take it up with MANAGEMENT!', { mood: 'furious', priority: 3 });
    g.setObjective('DEFEAT THE FOREMAN', 'Break both arm joints, then hit the eye');
    yield 1.5;
    const boss = g.spawnEnemy('foreman', V(0, 14, 146), { cls: Foreman, silent: true });
    boss.F = F;
    g.audio.play('sting', { chord: [65.4, 98, 130.8, 155.6] });
    g.player.shake(0.6);
    yield 4;
    g.hud.hint('Shoot the glowing BLUE JOINTS · throw barrels with the grav-cannon', 6, 'foreman');
    yield () => !boss.alive;
    g.addHype(0.3);
    g.audio.play('cheer', { big: 2 });
    say('halo', 'That was a VINTAGE unit! Do you know how hard it is to find parts for those?!', { mood: 'furious', priority: 3 });
    yield 3;
    g.checkpoint(4);
  }
  // ------------------------------------------------- THE FACTORY TEARS ITSELF APART
  F.collapse = true;
  g.audio.loop('alarm', 0.25);
  g.hud.banner('STRUCTURAL FAILURE', 'disaster', 20);
  F.speedMul = 2.5;
  g.music.setState('disaster');
  say('iris', 'The whole floor is coming apart. Elevator — now!', { priority: 3 });
  g.setObjective('GET TO THE ELEVATOR', '');
  F.exit.setOpen(true);
  yield () => F.exit.entered;
}

export default {
  name: 'THE FACTORY',
  build(g, o) {
    const F = build(g, o);
    F.onExit = () => {
      g.cinematic = true;
      g.player.vel.set(0, 0, 0);
      F.exit.setOpen(false);
      g.audio.loop('alarm', 0);
      g.audio.loop('machinery', 0);
      g.setCam([0, 2.2, 161.6], [0, 1.5, 154], 60, 3);
      g.say('halo', 'FLOOR FOUR... COMPLETE! The ratings are through the roof! Which is lucky, because the roof is on fire.', { mood: 'gleeful', priority: 3 });
      g.later(4, () => { g.renderer.fx.uGlitch.value = 0.4; g.audio.play('static', { dur: 0.5, vol: 0.5 }); g.say('iris', 'Halo isn\'t in charge, you know. Somebody built him to run this show. I intend to find out who.', { priority: 3 }); g.later(1, () => { g.renderer.fx.uGlitch.value = 0; }); });
      g.later(10, () => g.completeFloor());
    };
    return F;
  },
  script,
  scoreTarget: 14000,
  elevatorLines: [
    ['halo', 'Next stop: Floor Four — THE FACTORY! Where the magic happens. And by magic, I mean robots.', 0.6],
    ['iris', 'They\'re skipping floors two and three. Cleanup crews. Don\'t ask what they\'re cleaning.', 4.6],
  ],
  elevatorDur: 9,
  rewards: [{ type: 'melee', id: 'hammer', label: 'SHOCK HAMMER' }, { type: 'track', id: 'f4' }, { type: 'track', id: 'boss' }],
  completeLine: 'The SHOCK HAMMER is yours! Next: Floor Twelve. Pack a towel.',
};
