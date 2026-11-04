// Bosses for procedurally built floors.
//
// THE CO-HOST (Floor 10, Act One finale): Halo's body double. A stage-rig robot on speaker-stack
// legs with a TV head that shows Halo's face. Break both chest SPEAKERS to expose the HEAD screen.
// Attacks: spotlight beam sweep (jump / slide it), stomp shockwave (jump the ring), confetti mortar
// barrage (move off the warning circles), and calling in backup. Phase two (head exposed) is faster.
import * as THREE from 'three';
import { Mat, hologramMaterial } from '../engine/materials.js';
import { PlayerModel } from '../game/playerModel.js';
import { buildWeaponModel } from '../game/weapons.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';
import { Enemy } from '../game/enemies.js';
import { addBolts } from '../game/bossDetail.js';
import { dropDrone } from './kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const glow = (c, i = 3) => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: i });

export class CoHost extends Enemy {
  constructor(g, pos, o = {}) {
    super(g, pos, { type: 'cohost', name: 'THE CO-HOST', hp: 1, radius: 3, height: 8, flying: true, heavy: true, score: 6000, spawnTime: 2.6 });
    this.arena = o.arena || { minX: -16, maxX: 16, minZ: pos.z - 14, maxZ: pos.z + 14 };
    this.parts = { speakerL: { hp: 320, max: 320, alive: true }, speakerR: { hp: 320, max: 320, alive: true }, head: { hp: 1100, max: 1100, alive: true } };
    const M = this.M = {
      body: Mat.paint('#1c1c24', 0.35, 0.6).clone(), trim: Mat.paint('#ffd400', 0.35, 0.5), chrome: Mat.metal('#d8dee6', 0.2, 1), dark: Mat.metal('#101216', 0.5, 0.7),
      cone: Mat.rubber('#0a0a0c'), weak: glow('#ff2d6f', 3), eye: glow('#fff2c0', 4),
    };
    M.body.emissive = new THREE.Color(0); this.flashMats.push(M.body);
    const r = this.root;
    this.body = new THREE.Group(); r.add(this.body);
    // speaker-stack legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 1.6, 3.2, 0); this.body.add(leg);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.2, 1.8), M.body); cab.position.y = -1.6; leg.add(cab);
      for (const y of [-0.8, -2.4]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.2, 20), M.cone); w.rotation.x = Math.PI / 2; w.position.set(0, y, 0.92); leg.add(w); const dust = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 12), M.chrome); dust.rotation.x = Math.PI / 2; dust.position.set(0, y, 0.98); leg.add(dust); }
      const foot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.4), M.dark); foot.position.y = -3.25; leg.add(foot);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.14, 1.82), M.trim); stripe.position.y = 0; leg.add(stripe);
      this.legs.push(leg);
    }
    // torso: a rack case with two big glowing speaker cones (weak points)
    this.torso = new THREE.Group(); this.torso.position.y = 5.2; this.body.add(this.torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.8, 2.2), M.body); this.torso.add(chest);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 2.4), M.trim); lid.position.y = 1.45; this.torso.add(lid);
    this.speakers = {};
    for (const [key, s] of [['speakerL', -1], ['speakerR', 1]]) {
      const g = new THREE.Group(); g.position.set(s * 1.15, 0, 1.12); this.torso.add(g);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.12, 8, 28), M.chrome); g.add(ring);
      const cone = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.weak); cone.rotation.x = Math.PI / 2; cone.scale.y = 0.4; g.add(cone);
      this.speakers[key] = { g, cone, s };
      this.addHit(g, V(0, 0, 0.1), 0.95, 2, key);
      this.breakParts.push(g);
    }
    addBolts(this.torso, [[-2.1, 1.1, 1.12], [2.1, 1.1, 1.12], [-2.1, -1.1, 1.12], [2.1, -1.1, 1.12]], M.chrome, 0.08);
    // arms: lighting truss with a spotlight fist
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 2.8, 0.8, 0); this.torso.add(sh);
      const truss = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), M.chrome); truss.position.y = -1.4; sh.add(truss);
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 0.9, 16), M.dark); lamp.position.y = -3.1; sh.add(lamp);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), M.eye); lens.rotation.x = Math.PI / 2; lens.position.y = -3.56; sh.add(lens);
      this.arms.push({ sh, s });
      this.breakParts.push(sh);
    }
    // the head: a chunky TV showing Halo's face
    this.head = new THREE.Group(); this.head.position.y = 7.6; this.body.add(this.head);
    const tv = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 1.6), M.dark); this.head.add(tv);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.4, 0.2), M.trim); bezel.position.z = 0.72; this.head.add(bezel);
    this.screenMat = new THREE.MeshBasicMaterial({ map: g.host.texture, toneMapped: false });
    this.screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.9), this.screenMat); this.screen.position.z = 0.83; this.head.add(this.screen);
    this.shield = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.0), new THREE.MeshStandardMaterial({ color: '#202a34', metalness: 0.9, roughness: 0.25, transparent: true, opacity: 0.85 })); this.shield.position.z = 0.86; this.head.add(this.shield);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 8, 36), glow('#ffd400', 3)); halo.rotation.x = Math.PI / 2; halo.position.y = 1.7; this.head.add(halo); this.halo = halo;
    for (const s of [-1, 1]) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M.chrome); ant.position.set(s * 0.8, 1.6, 0); ant.rotation.z = -s * 0.5; this.head.add(ant); }
    this.addHit(this.head, V(0, 0, 0.6), 1.3, 1.5, 'head');
    this.addHit(this.body, V(0, 4.5, 0), 2.6, 0, 'body');
    // solid collision so you can't run through it
    const holder = new THREE.Object3D(); holder.position.y = 4; this.body.add(holder);
    this.torsoC = new Box({ size: [4.4, 8, 2.6] }); this.torsoC.attach(holder, V(0, 0, 0)); g.physics.add(this.torsoC);
    this.mode = 'intro'; this.mt = 0; this.attackT = 3; this.phase = 1;
    this.deathScale = 3.2;
    this.isBoss = true; this.bossName = 'THE CO-HOST';
    this.chatHint = (mode) => (mode === 'beam' ? 'SPOTLIGHT SWEEP — JUMP IT' : mode === 'stomp' ? 'jump the shockwave!!' : mode === 'mortar' ? 'get off the circles' : this.phase > 1 ? 'SHOOT THE SCREEN' : 'aim for the pink speakers');
    this.beam = null; this.y = 0; this.hop = 0;
    this.pos.y = 0;
  }
  totalFrac() { const P = this.parts; return (Math.max(0, P.speakerL.hp) + Math.max(0, P.speakerR.hp) + Math.max(0, P.head.hp)) / (P.speakerL.max + P.speakerR.max + P.head.max); }
  headExposed() { return !this.parts.speakerL.alive && !this.parts.speakerR.alive; }
  takeDamage(amount, info = {}) {
    if (!this.alive || this.spawnT > 0) return 0;
    let tag = info.tag;
    if (!tag || tag === 'body') {
      tag = info.point ? this._nearestWeak(info.point, 2.4) : (info.type === 'explosion' || info.weapon === 'gravity' ? this._nearestWeak(this.center(_v)) : null);
      if (!tag) { this.game.hud.armorPing(); if (info.point) this.game.fx.sparks(info.point, 4, null, 5); return 0; }
    }
    const p = this.parts[tag];
    if (!p || !p.alive) return 0;
    if (tag === 'head' && !this.headExposed()) { this.game.hud.armorPing(); this.game.fx.sparks(info.point || this.center(_v), 6, null, 6); return 0; }
    const dmg = amount * (info.mult || 1);
    p.hp -= dmg; this.flash = 1;
    if (p.hp <= 0) {
      p.alive = false;
      if (tag === 'head') { this.hp = 0; this.die(info); return dmg; }
      this._breakSpeaker(tag);
    }
    return dmg;
  }
  _nearestWeak(pt, maxD = 99) {
    let best = null, bd = maxD;
    for (const h of this.hitSpheres) {
      if (h.tag === 'body' || !this.parts[h.tag]?.alive) continue;
      if (h.tag === 'head' && !this.headExposed()) continue;
      const d = this.sphereWorld(h, _v).distanceTo(pt) - h.r;
      if (d < bd) { bd = d; best = h.tag; }
    }
    return best;
  }
  _breakSpeaker(tag) {
    const G = this.game, sp = this.speakers[tag];
    const p = sp.g.getWorldPosition(new THREE.Vector3());
    G.explode(p, 1.3, 0, { source: 'playerSafe' });
    G.fx.detach(sp.g, new THREE.Vector3(sp.s * 7, 5, 4), 9, 0.8);
    this.breakParts = this.breakParts.filter((b) => b !== sp.g);
    this.hitSpheres = this.hitSpheres.filter((h) => h.tag !== tag);
    G.audio.play('cheer', { big: 1.5 }); G.slowmo(0.4, 0.6);
    G.say('halo', tag === 'speakerL' ? 'My SUBWOOFER! Do you know what those cost?!' : 'You blew my speakers! I can still hear myself! Can YOU?!', { priority: 2, mood: 'furious' });
    if (this.headExposed()) {
      this.phase = 2;
      this.shield.visible = false;
      G.renderer.fx.uGlitch.value = 0.5; G.later(0.6, () => { G.renderer.fx.uGlitch.value = 0; });
      G.say('iris', 'The face plate\'s off. Shoot the screen — that\'s where it\'s getting its orders.', { priority: 3 });
      G.music.setState('boss');
    }
    G.emit('bossPart', tag);
  }
  _clampArena(v) {
    const A = this.arena;
    v.x = THREE.MathUtils.clamp(v.x, A.minX + 4, A.maxX - 4); v.z = THREE.MathUtils.clamp(v.z, A.minZ + 4, A.maxZ - 4);
    return v;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.mt += dt;
    // stalk the player at a distance, always facing them
    const want = this._clampArena(_v.copy(pl.pos).add(new THREE.Vector3(Math.sin(G.time * 0.3) * 6, 0, 9)));
    const sp = this.mode === 'stomp' ? 0 : (this.phase > 1 ? 1.1 : 0.7);
    this.pos.x += (want.x - this.pos.x) * Math.min(1, dt * sp);
    this.pos.z += (want.z - this.pos.z) * Math.min(1, dt * sp * 0.6);
    const yawT = Math.atan2(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    this.yaw += Math.atan2(Math.sin(yawT - this.yaw), Math.cos(yawT - this.yaw)) * Math.min(1, dt * 3);
    this.root.rotation.y = this.yaw;
    // walking bob + speaker thump
    const walk = Math.min(1, Math.abs(want.x - this.pos.x) + Math.abs(want.z - this.pos.z));
    this.legs.forEach((l, i) => { l.rotation.x = Math.sin(G.time * 4 + i * Math.PI) * 0.18 * walk; });
    this.body.position.y = this.hop + Math.abs(Math.sin(G.time * 4)) * 0.12 * walk;
    for (const k of ['speakerL', 'speakerR']) if (this.parts[k].alive) this.speakers[k].cone.scale.y = 0.4 + Math.max(0, Math.sin(G.time * 9 + (k === 'speakerL' ? 0 : 1.6))) * 0.18;
    this.halo.rotation.z += dt * 1.5;
    this.root.position.copy(this.pos);
    G.hud.boss('THE CO-HOST', this.totalFrac());
    if (this.spawnT > 0) return;
    // ---- attacks
    if (this.mode === 'intro') { if (this.mt > 1.5) { this.mode = 'idle'; this.mt = 0; } return; }
    if (this.mode === 'idle') {
      this.attackT -= dt * (this.phase > 1 ? 1.4 : 1);
      if (this.attackT <= 0) {
        const opts = ['beam', 'stomp', 'mortar', 'beam', 'stomp'];
        if (G.aliveEnemies() < 4) opts.push('summon');
        if (this.phase > 1) opts.push('mortar', 'beam');
        this.mode = opts[(Math.random() * opts.length) | 0]; this.mt = 0;
        this.attackT = this.phase > 1 ? rand(1.8, 2.6) : rand(2.6, 3.6);
        if (this.mode === 'beam') { G.audio.play('railCharge', { pos: this.pos }); G.say('halo', ['SPOTLIGHT!', 'Look into the light!', 'Smile for the camera!'][(Math.random() * 3) | 0], { priority: 1, mood: 'gleeful' }); }
      }
      return;
    }
    if (this.mode === 'beam') return this._beam(dt);
    if (this.mode === 'stomp') return this._stomp(dt);
    if (this.mode === 'mortar') return this._mortar(dt);
    if (this.mode === 'summon') {
      if (!this.summoned) { this.summoned = true; for (let i = 0; i < 2; i++) dropDrone(G, [this.pos.x + (i ? 5 : -5), 12, this.pos.z - 2], { drop: 6 }); G.say('halo', 'Backup dancers! Places, please!', { priority: 1, mood: 'gleeful' }); }
      if (this.mt > 1) { this.summoned = false; this.mode = 'idle'; this.mt = 0; }
    }
  }
  // spotlight sweep: a beam from the head that sweeps across the arena at hip height
  _beam(dt) {
    const G = this.game, pl = G.player, dur = this.phase > 1 ? 3.0 : 3.6;
    if (!this.beam) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 10), new THREE.MeshBasicMaterial({ color: '#fff0b0', toneMapped: false }));
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd060', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.add(h); G.scene.add(m); this.beam = m;
      this.beamY = Math.random() < 0.5 ? 0.6 : 1.35; // low beam: jump · high beam: slide
      G.hud.hint(this.beamY < 1 ? 'LOW BEAM — JUMP!' : 'HIGH BEAM — SLIDE UNDER!', 1.6, 'cohostbeam' + this.beamY);
      this.sweepDir = Math.random() < 0.5 ? 1 : -1;
    }
    const warm = Math.min(1, this.mt / 0.7);
    const from = this.head.getWorldPosition(new THREE.Vector3());
    const a = -1.1 + 2.2 * Math.min(1, Math.max(0, (this.mt - 0.7) / (dur - 0.9)));
    const ang = this.yaw + a * this.sweepDir;
    const to = V(this.pos.x + Math.sin(ang) * 30, this.beamY, this.pos.z + Math.cos(ang) * 30);
    // the beam drops from the head to hip height in front of the boss, then runs flat along the floor
    const knee = V(this.pos.x + Math.sin(ang) * 3.5, this.beamY, this.pos.z + Math.cos(ang) * 3.5);
    const len = knee.distanceTo(to);
    this.beam.position.copy(knee).lerp(to, 0.5);
    this.beam.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(knee).normalize());
    this.beam.scale.set(warm, len, warm);
    this.beam.material.opacity = 1;
    if (Math.random() < dt * 30) G.fx.sparks(to, 2, null, 4, FXColors.spark, FXColors.sparkEnd);
    void from;
    if (this.mt > 0.7 && pl.alive) {
      const h = pl.mode === 'slide' || pl.crouch ? 0.85 : 1.75;
      const p0 = V(pl.pos.x, pl.pos.y + 0.25, pl.pos.z), p1 = V(pl.pos.x, pl.pos.y + h, pl.pos.z);
      // distance from the beam line (knee->to) to the player's capsule axis
      const d = segSeg(knee, to, p0, p1);
      if (d < 0.55 && (this.beamCool = (this.beamCool || 0) - dt) <= 0) {
        this.beamCool = 0.5;
        pl.damage(this.phase > 1 ? 24 : 18, { type: 'laser', from: this.pos, knock: V(0, 7, 0).addScaledVector(V(Math.sin(ang), 0, Math.cos(ang)), 6) });
        G.fx.sparks(V(pl.pos.x, this.beamY, pl.pos.z), 16, null, 6);
      }
    }
    if (this.mt > dur) { G.scene.remove(this.beam); this.beam = null; this.mode = 'idle'; this.mt = 0; }
  }
  // stomp: leap up, slam down near the player, send out a shockwave ring you must jump
  _stomp(dt) {
    const G = this.game, pl = G.player;
    if (this.mt < 0.8) { this.hop = Math.sin(Math.min(1, this.mt / 0.8) * Math.PI) * 4; this.stompAt = this.stompAt || this._clampArena(pl.pos.clone()); const k = Math.min(1, dt * 3); this.pos.x += (this.stompAt.x - this.pos.x) * k; this.pos.z += (this.stompAt.z - this.pos.z) * k; return; }
    if (!this.slammed) {
      this.slammed = true; this.hop = 0;
      G.audio.play('stomp', { pos: this.pos }); G.audio.play('explosion', { pos: this.pos, big: 1.2 });
      G.player.shake(0.7); G.renderer.kick(0.6);
      G.fx.dust(this.pos.clone(), 24, 2.5); G.fx.ring(this.pos.clone().setY(0.1), 1, 2, 0.4, 0xffd400);
      this.wave = { r: 2, hit: false };
      this.waveMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.18, 6, 48), new THREE.MeshBasicMaterial({ color: '#ffd400', toneMapped: false, transparent: true }));
      this.waveMesh.rotation.x = Math.PI / 2; this.waveMesh.position.set(this.pos.x, 0.25, this.pos.z); G.scene.add(this.waveMesh);
    }
    const w = this.wave;
    w.r += dt * (this.phase > 1 ? 15 : 12);
    this.waveMesh.scale.setScalar(w.r); this.waveMesh.material.opacity = Math.max(0, 1 - w.r / 26);
    const d = Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z);
    if (!w.hit && Math.abs(d - w.r) < 0.8 && pl.pos.y < 0.6 && pl.alive) { w.hit = true; pl.damage(this.phase > 1 ? 26 : 20, { type: 'shockwave', from: this.pos, knock: V(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z).normalize().multiplyScalar(10).setY(8) }); }
    if (w.r > 26) { G.scene.remove(this.waveMesh); this.waveMesh = null; this.slammed = false; this.stompAt = null; this.mode = 'idle'; this.mt = 0; }
  }
  // mortar: confetti bombs lobbed at (and around) the player with warning circles
  _mortar(dt) {
    const G = this.game, pl = G.player, n = this.phase > 1 ? 6 : 4;
    this.shots = this.shots || 0;
    if (this.shots < n && this.mt > 0.35 * this.shots + 0.3) {
      this.shots++;
      const target = pl.pos.clone().add(V(rand(-3, 3), 0, rand(-3, 3))).addScaledVector(pl.vel.clone().setY(0), 0.6);
      target.y = 0;
      const from = this.head.getWorldPosition(new THREE.Vector3()).add(V(0, 1.6, 0));
      const T = 1.25, gv = 18;
      const vel = target.clone().sub(from).divideScalar(T); vel.y = (target.y - from.y + 0.5 * gv * T * T) / T;
      G.spawnProjectile({ pos: from, vel, damage: 22, radius: 0.32, owner: this, color: 0xff2d6f, gravity: gv, life: 3, explode: { scale: 0.85, damage: 34, confetti: true, enemy: true } });
      const warn = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.1, 32), new THREE.MeshBasicMaterial({ color: '#ff2d6f', transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
      warn.rotation.x = -Math.PI / 2; warn.position.copy(target).setY(0.06); G.scene.add(warn);
      let t = 0; G.addHazard({ update(dt2) { t += dt2; warn.material.opacity = 0.5 + 0.4 * Math.sin(t * 20); if (t > T + 0.1) { G.scene.remove(warn); this.dead = true; } } });
      G.audio.play('launcher', { pos: this.pos });
    }
    if (this.mt > 0.35 * n + 1.2) { this.shots = 0; this.mode = 'idle'; this.mt = 0; }
  }
  die(info) {
    if (!this.alive) return;
    const G = this.game;
    if (this.beam) { G.scene.remove(this.beam); this.beam = null; }
    if (this.waveMesh) { G.scene.remove(this.waveMesh); this.waveMesh = null; }
    G.hud.boss(null);
    G.physics.remove(this.torsoC);
    super.die(info);
    for (let i = 0; i < 6; i++) G.later(0.2 + i * 0.22, () => G.explode(this.pos.clone().add(V(rand(-3, 3), rand(1, 8), rand(-2, 2))), 1.2, 0, { source: 'playerSafe' }));
  }
}

function segSeg(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
  let s = den > 1e-6 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  return p1.clone().addScaledVector(d1, s).distanceTo(p2.clone().addScaledVector(d2, t));
}

// THE RERUN (Floor 20): a hologram of Contestant 98, rebuilt from his retained mind. He fights the way
// a contestant fights: sprints, circle-strafes, dodges when you aim at him, fires revolver bursts,
// slide-kicks, and splits into hologram copies at two-thirds and one-third health.
export class Rerun extends Enemy {
  constructor(g, pos, o = {}) {
    const clone = !!o.clone;
    super(g, pos, { type: 'rerun', name: clone ? 'RERUN COPY' : 'THE RERUN', hp: clone ? 70 : 1500, radius: 0.5, height: 1.9, score: clone ? 150 : 6000, spawnTime: clone ? 0.8 : 2.4 });
    this.clone = clone; this.arena = o.arena;
    this.model = new PlayerModel({ suit: 1, armor: 1, visor: 0, helmet: 0 });
    const holo = hologramMaterial(clone ? '#ff6ad0' : '#7ff6ff', clone ? 0.55 : 0.85);
    this.model.root.traverse((m) => { if (m.isMesh) { m.material = holo; m.castShadow = false; } });
    this.root.add(this.model.root);
    this.gun = buildWeaponModel('revolver'); this.gun.traverse((m) => { if (m.isMesh) m.material = holo; });
    this.model.socketR.add(this.gun); this.gun.rotation.set(Math.PI / 2, 0, 0);
    this.addHit(this.model.j.head, V(0, 0.15, 0), 0.32, 2.2, 'head');
    this.addHit(this.model.j.chest, V(0, 0.05, 0), 0.5, 1, 'body');
    this.addHit(this.model.j.hips, V(0, -0.2, 0), 0.45, 1, 'body');
    this.strafeDir = Math.random() < 0.5 ? 1 : -1; this.fireT = 2; this.dodgeT = 0; this.dodgeCool = 0; this.burst = 0; this.splits = 0;
    this.vel = new THREE.Vector3(); this.mode = 'run'; this.mt = 0;
    if (!clone) { this.isBoss = true; this.bossName = 'THE RERUN'; this.chatHint = () => (this.splits ? 'the REAL one has blue light' : 'he dodges when you aim. bait it'); }
    this.deathScale = clone ? 0.5 : 1.6;
  }
  onBeforeDamage(dmg, info) {
    // dodges a share of aimed shots (not explosions / beams) with a sidestep
    if (this.dodgeCool <= 0 && info.source === 'player' && info.type !== 'explosion' && info.weapon !== 'beam' && Math.random() < (this.clone ? 0.15 : 0.32)) {
      this.dodgeCool = this.clone ? 2 : 1.4; this.dodgeT = 0.32;
      const pl = this.game.player.pos, side = V(pl.z - this.pos.z, 0, this.pos.x - pl.x).normalize().multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      this.vel.copy(side.multiplyScalar(16));
      this.game.fx.trail(this.center(_v), FXColors.cyan, 0.5, 0.3);
      this.game.audio.play('dash', { pos: this.pos });
      return 0;
    }
    return dmg;
  }
  onHurt() {
    if (this.clone) return;
    const frac = this.hp / this.maxHp, G = this.game;
    if ((this.splits === 0 && frac < 0.66) || (this.splits === 1 && frac < 0.33)) {
      this.splits++;
      for (const s of [-1, 1]) { const c = G.spawnEnemy('rerun', this.pos.clone().add(V(s * 2.5, 0, 0)), { cls: Rerun, clone: true, arena: this.arena }); c.vel.set(s * 10, 0, 0); }
      G.fx.burst(this.center(_v), 30, FXColors.cyan, FXColors.cyanEnd, 6, 0.4, 0.6);
      G.say('iris', this.splits === 1 ? 'That\'s Theo\'s dodge. That\'s my brother\'s dodge.' : 'He always split the difference. ...Theo, I\'m sorry.', { priority: 3 });
    }
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.dodgeCool -= dt; this.dodgeT -= dt; this.mt += dt;
    const to = V(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z), d = to.length(); to.normalize();
    // circle-strafe at a preferred range, sprinting
    if (this.dodgeT <= 0 && this.spawnT <= 0) {
      const want = this.clone ? 8 : 11, radial = THREE.MathUtils.clamp((d - want) * 0.6, -1, 1);
      const tang = V(-to.z, 0, to.x).multiplyScalar(this.strafeDir);
      const dir = tang.multiplyScalar(0.85).addScaledVector(to, radial).normalize();
      const sp = this.mode === 'slide' ? 15 : this.clone ? 7.5 : 9.5;
      this.vel.x += (dir.x * sp - this.vel.x) * Math.min(1, dt * 6); this.vel.z += (dir.z * sp - this.vel.z) * Math.min(1, dt * 6);
      if (Math.random() < dt * 0.35) this.strafeDir *= -1;
    } else this.vel.multiplyScalar(Math.exp(-dt * 4));
    this.pos.addScaledVector(this.vel, dt);
    const A = this.arena; if (A) { this.pos.x = THREE.MathUtils.clamp(this.pos.x, A.minX + 2, A.maxX - 2); this.pos.z = THREE.MathUtils.clamp(this.pos.z, A.minZ + 2, A.maxZ - 2); }
    this.pos.y = 0;
    this.yaw = Math.atan2(to.x, to.z);
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    if (!this.clone) G.hud.boss('THE RERUN — CONTESTANT 98', this.hp / this.maxHp);
    // slide kick when close
    if (!this.clone && this.mode !== 'slide' && d < 4 && this.mt > 2 && this.spawnT <= 0) { this.mode = 'slide'; this.mt = 0; this.vel.copy(to).multiplyScalar(15); G.audio.play('slide', { pos: this.pos }); }
    if (this.mode === 'slide') { if (d < 1.4 && !this.kicked && pl.alive) { this.kicked = true; pl.damage(16, { from: this.pos, type: 'melee', knock: to.clone().multiplyScalar(9).setY(6) }); } if (this.mt > 0.6) { this.mode = 'run'; this.kicked = false; this.mt = 0; } }
    // revolver bursts
    this.fireT -= dt;
    if (this.fireT <= 0 && this.spawnT <= 0 && pl.alive) {
      this.burst = this.clone ? 1 : 3; this.fireT = this.clone ? 2.4 : 2.1 - (1 - this.hp / this.maxHp) * 0.6; this.burstT = 0;
    }
    if (this.burst > 0 && (this.burstT = (this.burstT || 0) - dt) <= 0) {
      this.burst--; this.burstT = 0.16; this.recoil = 1;
      const from = this.gun.localToWorld(V(0, 0.02, 0.35)), aim = V(pl.pos.x, pl.pos.y + 1.1, pl.pos.z).addScaledVector(pl.vel, 0.25);
      const vel = aim.sub(from).normalize().multiplyScalar(30);
      G.spawnProjectile({ pos: from, vel, damage: this.clone ? 6 : 8, radius: 0.13, owner: this, color: this.clone ? 0xff6ad0 : 0x7ff6ff });
      G.fx.muzzle(from, vel.clone().normalize(), FXColors.cyan, 0.6);
      G.audio.play('enemyShot', { pos: this.pos });
    }
    this.recoil = Math.max(0, (this.recoil || 0) - dt * 6);
    // animate with the real contestant animator: running, sliding, aiming
    const local = this.vel.clone().applyAxisAngle(V(0, 1, 0), -this.yaw);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.model.animate(dt, { speed: hs, grounded: true, vy: 0, mode: this.mode === 'slide' ? 'slide' : this.dodgeT > 0 ? 'dodge' : 'normal', dodgeT: 1 - Math.max(0, this.dodgeT) / 0.32, sprint: hs > 7, strafe: hs > 1 ? local.x / hs : 0, moveBack: local.z < -0.3 * hs, aiming: true, aimPitch: 0, weaponHand: true, recoil: this.recoil, turn: 0 });
  }
  die(info) {
    if (!this.alive) return;
    if (!this.clone) {
      this.game.hud.boss(null);
      for (const e of this.game.enemies) if (e.alive && e.clone) e.die({});
    }
    super.die(info);
  }
}

// HALO-TRON (Floor 23): the rival mech. The Co-Host's fight scaled up and re-skinned in chrome and
// pink; same weak-point rules, bigger shockwaves.
export class Halotron extends CoHost {
  constructor(g, pos, o = {}) {
    super(g, pos, o);
    this.name = 'HALO-TRON'; this.bossName = 'HALO-TRON';
    this.root.scale.setScalar(1.35);
    this.M.body.color.set('#c8ccd4'); this.M.body.metalness = 0.9; this.M.body.roughness = 0.25; this.M.trim.color.set('#ff2d6f');
    this.parts.speakerL.hp = this.parts.speakerL.max = 420; this.parts.speakerR.hp = this.parts.speakerR.max = 420; this.parts.head.hp = this.parts.head.max = 1400;
    this.torsoC.half.set(3, 5.5, 1.8);
  }
  update(dt) {
    super.update(dt);
    if (this.alive) this.game.hud.boss('HALO-TRON', this.totalFrac());
  }
}

export const BOSSES = { cohost: CoHost, rerun: Rerun, halotron: Halotron };
