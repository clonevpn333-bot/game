// Boss fights. Every boss is built around the timeline: Dutch can't follow
// you through time, WARDEN-7's shield is powered by 1996 wiring, the Hollow
// slips between eras, and the Continuum must be unmade at its 1996 anchor.
import * as THREE from 'three';
import { G, ERA_YEARS } from '../core/state.js';
import { clamp, damp, dampAngle, wrapAngle } from '../core/mathx.js';
import { Avatar } from '../actors/avatar.js';
import { LOOKS } from './cutscene.js';
import { Pose, poseIdle, poseLocomotion, poseMelee, poseSit, poseDead, J } from '../actors/rig.js';
import { patchActorMaterial } from '../world/materials.js';
import { CF } from '../world/collision.js';

// ------------------------------------------------------------ shared ---
const bar = document.createElement('div');
bar.className = 'bossbar';
bar.innerHTML = '<div class="bn"></div><div class="bb"><div class="bf"></div></div><div class="bs"></div>';
document.body.appendChild(bar);

function showBar(boss) {
  bar.classList.add('on');
  bar.querySelector('.bn').textContent = boss.name;
}
function hideBar() { bar.classList.remove('on'); }

const proj = [];
const rings = [];
const waves = [];
const projGeo = new THREE.SphereGeometry(0.28, 10, 8);

function emissiveMat(color, intensity = 4) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
}

export function fireOrb(from, dir, speed, dmg, color = '#ff4020', homing = 0, era = G.era) {
  const m = new THREE.Mesh(projGeo, emissiveMat(color));
  m.position.copy(from);
  G.scene.add(m);
  proj.push({ m, v: dir.clone().normalize().multiplyScalar(speed), dmg, life: 6, homing, era });
}
// telegraphed area attack: red ring that detonates after `delay`
export function telegraph(pos, radius, delay, dmg, era = G.era, color = '#ff3020') {
  const g = new THREE.RingGeometry(radius * 0.92, radius, 40);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3), transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.12, depthWrite: false }));
  m.add(fill);
  m.position.set(pos.x, pos.y + 0.08, pos.z);
  G.scene.add(m);
  rings.push({ m, fill, t: 0, delay, radius, dmg, era });
}
// expanding floor shockwave: jump over it
export function shockwave(pos, speed, maxR, dmg, era = G.era, color = '#60ffd0') {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 60).rotateX(Math.PI / 2), emissiveMat(color, 3));
  m.position.set(pos.x, pos.y + 0.3, pos.z);
  G.scene.add(m);
  waves.push({ m, r: 1, speed, maxR, dmg, era, hit: false, c: pos.clone() });
}

export function updateBossFX(dt) {
  const p = G.player;
  for (const o of proj.slice()) {
    o.life -= dt;
    o.m.visible = o.era === G.era;
    if (o.homing && o.era === G.era) {
      const to = new THREE.Vector3(p.pos.x, p.pos.y + 1.2, p.pos.z).sub(o.m.position).normalize().multiplyScalar(o.v.length());
      o.v.lerp(to, Math.min(1, o.homing * dt));
    }
    o.m.position.addScaledVector(o.v, dt);
    let dead = o.life <= 0;
    if (o.era === G.era) {
      const d = o.m.position.distanceTo(new THREE.Vector3(p.pos.x, p.pos.y + 1.1, p.pos.z));
      if (d < 0.8) { p.damage(o.dmg, o.m.position, 'laser'); dead = true; }
      if (G.collision.pointSolid(G.era, o.m.position.x, o.m.position.y, o.m.position.z)) dead = true;
    }
    if (dead) { G.fx.sparks(o.m.position.clone(), 6); G.scene.remove(o.m); proj.splice(proj.indexOf(o), 1); }
  }
  for (const r of rings.slice()) {
    r.t += dt;
    r.m.visible = r.era === G.era;
    r.fill.material.opacity = 0.1 + (r.t / r.delay) * 0.35;
    if (r.t >= r.delay) {
      if (r.era === G.era) {
        G.fx.explosion(r.m.position.clone().setY(r.m.position.y + 0.5), 0.5);
        G.audio.play('explosion', r.m.position);
        const d = Math.hypot(p.pos.x - r.m.position.x, p.pos.z - r.m.position.z);
        if (d < r.radius && Math.abs(p.pos.y - r.m.position.y) < 3) p.damage(r.dmg, r.m.position, 'explosion');
      }
      G.scene.remove(r.m);
      rings.splice(rings.indexOf(r), 1);
    }
  }
  for (const w of waves.slice()) {
    w.r += w.speed * dt;
    w.m.scale.set(w.r, 1, w.r);
    w.m.visible = w.era === G.era;
    if (w.era === G.era && !w.hit) {
      const d = Math.hypot(p.pos.x - w.c.x, p.pos.z - w.c.z);
      if (Math.abs(d - w.r) < 0.7 && p.state === 'ground' && Math.abs(p.pos.y - w.c.y) < 1.5 && !(p.action && p.action.type === 'dodge')) {
        w.hit = true;
        p.damage(w.dmg, w.c, 'explosion');
        p.vel.set((p.pos.x - w.c.x) / d * 6, 5, (p.pos.z - w.c.z) / d * 6);
        p.state = 'air';
      }
    }
    if (w.r > w.maxR) { G.scene.remove(w.m); waves.splice(waves.indexOf(w), 1); }
  }
}
export function clearBossFX() {
  for (const a of [proj, rings, waves]) { for (const o of a) G.scene.remove(o.m); a.length = 0; }
}

class Boss {
  constructor(name, hp, era, pos) {
    this.name = name;
    this.hp = this.maxHp = hp;
    this.era = era;
    this.pos = pos.clone();
    this.radius = 1.2;
    this.dead = false;
    this.invuln = false;
    this.t = 0;
    this.status = '';
    this.mesh = new THREE.Group();
    this.levelUnit = true;
    showBar(this);
  }
  damage(n, from) {
    if (this.dead) return;
    if (this.era !== G.era) return;
    if (this.invuln) { G.hud.toast(this.invulnMsg || 'IMMUNE', 'warn', 0.8); G.audio.play('denied'); return; }
    this.hp -= n;
    this.flash = 0.12;
    if (this.onHit) this.onHit(n, from);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.die(); }
  }
  die() {
    G.fx.explosion(this.pos.clone(), 1.5);
    G.audio.play('explosion', this.pos);
    hideBar();
    clearBossFX();
    G.progress.addXP(200);
    if (this.onDefeat) this.onDefeat(this);
  }
  bar() {
    bar.querySelector('.bf').style.width = `${(this.hp / this.maxHp) * 100}%`;
    const s = this.era !== G.era ? `IN ${ERA_YEARS[this.era]}` : this.status;
    bar.querySelector('.bs').textContent = s;
    bar.classList.toggle('shield', this.invuln);
  }
  toPlayer() {
    const p = G.player.pos;
    return new THREE.Vector3(p.x - this.pos.x, 0, p.z - this.pos.z);
  }
}

// ===================================================================== DUTCH
export class Dutch extends Boss {
  constructor(pos) {
    super('DUTCH KOWALSKI — RED SEVENS', 900, 0, pos);
    this.av = new Avatar({ ...LOOKS.dutch }, 0, { scale: 1.35 });
    G.scene.add(this.av.group);
    this.pose = new Pose();
    this.yaw = Math.PI;
    this.state = 'approach';
    this.st = 0;
    this.phase = 0;
    this.feet = pos.clone();
    this.radius = 1.0;
    this.summoned = false;
    this.cooldown = 1.5;
    this.status = 'Charge into walls to stun him · he can\'t follow you through time';
  }
  update(dt) {
    this.t += dt;
    const here = G.era === 0;
    this.av.group.visible = here;
    this.pos.set(this.feet.x, this.feet.y + 1.7, this.feet.z);
    this.bar();
    if (this.dead) { this.deadT = (this.deadT || 0) + dt; this.pose.clear(); poseDead(this.pose, 1, this.deadT * 1.5); this.av.update(this.pose, this.feet.x, this.feet.y, this.feet.z, this.yaw, dt); return; }
    if (!here) { this.av.update(this.pose, this.feet.x, this.feet.y, this.feet.z, this.yaw, dt); return; }
    const tp = this.toPlayer();
    const dist = tp.length();
    const face = Math.atan2(tp.x, tp.z);
    this.st += dt;
    this.cooldown -= dt;
    const enraged = this.hp < this.maxHp * 0.5;
    if (enraged && !this.summoned) {
      this.summoned = true;
      G.hud.say('Dutch', 'BOYS! GET IN HERE!', 2.5);
      for (let i = 0; i < 3; i++) {
        const n = G.combat.spawnEnemy(this.feet.x + (i - 1) * 4, this.feet.z + 6, 0, i === 1 ? 'gunman' : 'thug', { persistent: true, aware: true, colors: { top: new THREE.Color('#8a1010') } });
        if (n) n.levelNpc = true;
      }
    }
    let speed = 0;
    const p = this.pose.clear();
    if (this.state === 'approach') {
      this.yaw = dampAngle(this.yaw, face, 5, dt);
      speed = enraged ? 4.2 : 3.2;
      if (dist < 2.6 && this.cooldown <= 0) { this.state = 'swing'; this.st = 0; G.audio.play('whoosh', this.feet); }
      else if (dist > 7 && this.cooldown <= 0 && Math.random() < dt * 0.9) { this.state = 'wind'; this.st = 0; this.chargeDir = tp.clone().normalize(); G.hud.say('Dutch', 'RRRAAAGH!', 1); }
      else if (dist < 8 && this.cooldown <= 0 && Math.random() < dt * 0.35) { this.state = 'slam'; this.st = 0; telegraph(this.feet, 6, 1.1, 26, 0); }
      poseLocomotion(p, this.t * 5, 1.3);
    } else if (this.state === 'swing') {
      poseIdle(p, this.t);
      const k = this.st / 0.9;
      poseMelee(this.tmpP || (this.tmpP = new Pose()), 3, k);
      p.blendUpper(this.tmpP, 1);
      if (!this.hitDone && k > 0.45) {
        this.hitDone = true;
        if (dist < 3.2) {
          const pl = G.player;
          const blocked = pl.blocking;
          pl.damage(blocked ? 6 : 22, this.feet, 'melee');
          G.cam.shake(0.3);
        }
      }
      if (k >= 1) { this.state = 'approach'; this.hitDone = false; this.cooldown = 0.8; }
    } else if (this.state === 'wind') {
      poseIdle(p, this.t);
      p.set(J.spine, 0.5); p.set(J.shL, 0.4, 0, 0.6); p.set(J.shR, 0.4, 0, -0.6);
      this.yaw = Math.atan2(this.chargeDir.x, this.chargeDir.z);
      this.av.group.position.x = (Math.random() - 0.5) * 0.05;
      if (this.st > 0.9) { this.state = 'charge'; this.st = 0; }
    } else if (this.state === 'charge') {
      speed = 15;
      poseLocomotion(p, this.t * 10, 2.8);
      // hit player?
      if (dist < 2 && !this.chargeHit) {
        this.chargeHit = true;
        G.player.damage(30, this.feet, 'melee');
        G.player.vel.set(this.chargeDir.x * 12, 6, this.chargeDir.z * 12);
        G.player.state = 'air';
      }
      if (this.st > 1.4) { this.state = 'approach'; this.cooldown = 1.2; this.chargeHit = false; }
    } else if (this.state === 'stun') {
      poseIdle(p, this.t);
      p.set(J.neck, 0.6, Math.sin(this.t * 5) * 0.3);
      p.set(J.spine, 0.4);
      p.rootY = -0.2;
      if (this.st > 2.8) { this.state = 'approach'; this.cooldown = 1; }
    } else if (this.state === 'slam') {
      poseIdle(p, this.t);
      const k = this.st / 1.1;
      p.set(J.shL, -2.8 * Math.min(1, k * 2), 0, 0.3); p.set(J.shR, -2.8 * Math.min(1, k * 2), 0, -0.3);
      if (k > 0.85) { p.set(J.shL, -0.6); p.set(J.shR, -0.6); p.set(J.spine, 0.7); }
      if (k >= 1) { shockwave(this.feet, 9, 16, 15, 0, '#ff8030'); G.cam.shake(0.5); this.state = 'approach'; this.cooldown = 1.5; }
    }
    // move
    if (speed > 0) {
      const dir = this.state === 'charge' ? this.chargeDir : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const before = this.feet.clone();
      this.feet.x += dir.x * speed * dt; this.feet.z += dir.z * speed * dt;
      const n = G.collision.resolveCylinder(0, this.feet, 0.9, 2.2, 0.4);
      if (n && this.state === 'charge' && this.feet.distanceTo(before) < speed * dt * 0.5) {
        this.state = 'stun'; this.st = 0; this.chargeHit = false;
        G.audio.play('crash', this.feet); G.cam.shake(0.6);
        G.fx.sparks(this.feet.clone().setY(this.feet.y + 1.5), 20);
        G.hud.toast('Dutch is STUNNED — hit him now!', 'good', 1.5);
      }
    }
    this.av.update(p, this.feet.x, this.feet.y, this.feet.z, this.yaw, dt);
  }
  onHit(n) {
    if (this.state === 'stun') this.hp -= n; // double damage while stunned
  }
  die() {
    super.die();
    this.state = 'dead';
  }
}

// ================================================================ WARDEN-7
function machineMesh(era, color = '#e8ecf0', eye = '#ff2030', scale = 1) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.8 });
  patchActorMaterial(m, era);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * scale, 1), m);
  core.castShadow = true;
  g.add(core);
  const eyeM = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 16, 12), emissiveMat(eye, 5));
  eyeM.position.z = 1.05 * scale;
  g.add(eyeM);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry((1.7 + i * 0.35) * scale, 0.07 * scale, 6, 40), m);
    r.rotation.x = Math.PI / 2 + i * 0.5;
    g.add(r);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.25 * scale, 2.4 * scale), m);
    arm.position.set(Math.cos(a) * 1.6 * scale, -0.5 * scale, Math.sin(a) * 1.6 * scale);
    arm.rotation.y = -a;
    arm.rotation.x = 0.6;
    g.add(arm);
  }
  return g;
}

export class Warden extends Boss {
  constructor(pos, level) {
    super('WARDEN-7 — AEGIS SECURITY CONSTRUCT', 1300, 1, pos);
    this.level = level;
    this.mesh = machineMesh(1, '#e8ecf0', '#ff2030', 1.1);
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#30c0ff').multiplyScalar(1.5), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.mesh.add(this.shield);
    G.scene.add(this.mesh);
    this.radius = 2.0;
    this.home = pos.clone();
    this.atk = 2;
    this.summoned = false;
    this.invulnMsg = 'SHIELDED — its pylons draw power from 1996 wiring';
  }
  update(dt) {
    this.t += dt;
    const here = G.era === 1;
    this.mesh.visible = here || G.shift.active;
    const pylons = [0, 1, 2].filter((i) => !this.level.flags['cut' + i]).length;
    this.invuln = pylons > 0;
    this.shield.visible = this.invuln;
    this.status = this.invuln ? `SHIELD: ${pylons} pylon${pylons > 1 ? 's' : ''} powered · cut their 1996 power trunks` : 'SHIELD DOWN';
    this.bar();
    if (this.dead) { this.mesh.position.y = damp(this.mesh.position.y, this.home.y - 6, 1, dt); this.mesh.rotation.z += dt; return; }
    this.pos.set(this.home.x + Math.sin(this.t * 0.5) * 6, this.home.y + Math.sin(this.t * 1.3) * 0.8, this.home.z + Math.cos(this.t * 0.37) * 4);
    this.mesh.position.copy(this.pos);
    const tp = this.toPlayer();
    this.mesh.rotation.y = dampAngle(this.mesh.rotation.y, Math.atan2(tp.x, tp.z), 3, dt);
    this.mesh.children.forEach((c, i) => { if (c.geometry && c.geometry.type === 'TorusGeometry') c.rotation.z += dt * (0.6 + i * 0.3); });
    if (!here) return;
    this.atk -= dt;
    const enraged = this.hp < this.maxHp * 0.5;
    if (enraged && !this.summoned) {
      this.summoned = true;
      for (let i = 0; i < 2; i++) { const d = G.combat.spawnDrone(this.pos.x + (i ? 5 : -5), this.pos.y, this.pos.z, 1, { aware: true, health: 50 }); d.levelUnit = true; d.state = 'combat'; }
      G.hud.say('WARDEN-7', 'THREAT REASSESSED. DEPLOYING SUPPORT.', 2.5);
    }
    if (this.atk <= 0) {
      const pl = G.player.pos;
      const r = Math.random();
      if (r < 0.45) {
        // bolt fan
        const base = new THREE.Vector3(pl.x - this.pos.x, pl.y + 1 - this.pos.y, pl.z - this.pos.z).normalize();
        for (let i = -2; i <= 2; i++) {
          const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.18);
          fireOrb(this.pos.clone(), d, 16, 9, '#ff3040', 0, 1);
        }
        G.audio.gunshot('pulse', this.pos);
      } else if (r < 0.8) {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2, rr = i === 0 ? 0 : 3 + Math.random() * 4;
          telegraph(new THREE.Vector3(pl.x + Math.cos(a) * rr, pl.y, pl.z + Math.sin(a) * rr), 3, 1.3 + i * 0.15, 20, 1);
        }
        G.audio.play('denied', this.pos);
      } else {
        fireOrb(this.pos.clone(), new THREE.Vector3(0, -0.2, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y), 7, 20, '#ff9020', 1.8, 1);
      }
      this.atk = enraged ? 1.3 : 2.0;
    }
  }
  die() { super.die(); }
}

// ================================================================ THE HOLLOW
export class Hollow extends Boss {
  constructor(pos) {
    super('THE HOLLOW — WHAT CONTINUUM LEFT BEHIND', 1400, 2, pos);
    this.meshes = [0, 1, 2].map((e) => {
      const m = machineMesh(e, ['#6a5040', '#c8ccd0', '#4a5a40'][e], '#60ffd0', 1.3);
      G.scene.add(m);
      return m;
    });
    this.radius = 2.2;
    this.home = pos.clone();
    this.slipT = 13;
    this.atk = 2.5;
    this.mesh = new THREE.Group();
  }
  slip() {
    const options = [0, 1, 2].filter((e) => e !== this.era);
    this.era = options[Math.floor(Math.random() * options.length)];
    this.slipT = this.hp < this.maxHp * 0.3 ? 8 : 13;
    G.hud.toast(`THE HOLLOW SLIPS INTO ${ERA_YEARS[this.era]} — follow it [${this.era + 1}]`, 'warn', 3);
    G.fx.shiftMotes(this.pos.clone(), new THREE.Color(0.4, 1, 0.8));
    G.audio.play('consequence', this.pos);
  }
  update(dt) {
    this.t += dt;
    this.bar();
    this.meshes.forEach((m, e) => {
      m.visible = e === this.era && (e === G.era || G.shift.active);
      // ghost: show faintly when in another era
      if (e === this.era && e !== G.era) { m.visible = true; m.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 0.18; } }); }
      else if (e === this.era) m.traverse((o) => { if (o.material) { o.material.opacity = 1; o.material.transparent = false; } });
    });
    if (this.dead) { for (const m of this.meshes) { m.scale.multiplyScalar(1 - dt * 0.6); } return; }
    this.pos.set(this.home.x + Math.sin(this.t * 0.4) * 8, this.home.y + 1.5 + Math.sin(this.t * 1.7), this.home.z + Math.sin(this.t * 0.6) * 6);
    for (const m of this.meshes) { m.position.copy(this.pos); m.rotation.y += dt * 0.5; m.rotation.x = Math.sin(this.t) * 0.2; }
    this.slipT -= dt;
    if (this.slipT <= 0) this.slip();
    if (this.era !== G.era) return;
    this.atk -= dt;
    if (this.atk <= 0) {
      if (Math.random() < 0.5) shockwave(new THREE.Vector3(this.pos.x, this.home.y, this.pos.z), 8, 22, 18, this.era);
      else for (let i = 0; i < 3; i++) fireOrb(this.pos.clone(), new THREE.Vector3(Math.random() - 0.5, 0.4, Math.random() - 0.5), 6, 12, '#60ffd0', 1.4, this.era);
      this.atk = this.hp < this.maxHp * 0.3 ? 1.6 : 2.4;
    }
  }
}

// ============================================================== CONTINUUM
export class Continuum extends Boss {
  constructor(pos, level) {
    super('VICTOR HALVORSEN — THE CONTINUUM', 1800, 1, pos);
    this.level = level;
    this.home = pos.clone();
    this.stage = 1;
    this.radius = 1.6;
    // stage 1: Victor on a hovering throne
    this.throne = new THREE.Group();
    const tm = new THREE.MeshStandardMaterial({ color: '#e8ecf0', metalness: 0.8, roughness: 0.3 });
    patchActorMaterial(tm, 1);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.8, 0.6, 20), tm);
    seat.position.y = -0.2;
    this.throne.add(seat);
    this.throne.add(new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 40).rotateX(Math.PI / 2), emissiveMat('#ff3030', 4)));
    G.scene.add(this.throne);
    this.victor = new Avatar({ ...LOOKS.victorOld }, 1, {});
    G.scene.add(this.victor.group);
    this.vpose = new Pose();
    // stage 2: the machine god (2189)
    this.god = machineMesh(2, '#3a4a38', '#ff3a3a', 2.2);
    this.god.visible = false;
    G.scene.add(this.god);
    this.atk = 2;
    this.summonT = 10;
  }
  update(dt) {
    this.t += dt;
    this.bar();
    if (this.dead) { this.god.position.y -= dt * 2; this.god.rotation.z += dt; return; }
    const pl = G.player.pos;
    if (this.stage === 1) {
      this.status = 'Phase I — break his throne';
      this.pos.set(this.home.x + Math.sin(this.t * 0.5) * 7, this.home.y + 3 + Math.sin(this.t * 1.1) * 0.6, this.home.z + Math.cos(this.t * 0.4) * 5);
      this.throne.position.copy(this.pos);
      this.throne.visible = this.victor.group.visible = G.era === 1;
      this.vpose.clear(); poseSit(this.vpose, false);
      const face = Math.atan2(pl.x - this.pos.x, pl.z - this.pos.z);
      this.victor.update(this.vpose, this.pos.x, this.pos.y - 0.4, this.pos.z, face, dt);
      if (G.era === 1) {
        this.atk -= dt;
        if (this.atk <= 0) {
          const base = new THREE.Vector3(pl.x - this.pos.x, pl.y + 1 - this.pos.y, pl.z - this.pos.z).normalize();
          for (let i = -3; i <= 3; i++) fireOrb(this.pos.clone(), base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.14), 15, 8, '#ff3030', 0, 1);
          this.atk = 1.8;
        }
        this.summonT -= dt;
        if (this.summonT <= 0) {
          this.summonT = 18;
          for (let i = 0; i < 2; i++) { const n = G.combat.spawnEnemy(this.home.x + (i ? 10 : -10), this.home.z - 8, 1, 'enforcer', { aware: true, persistent: true }); if (n) n.levelNpc = true; }
        }
      }
      if (this.hp < this.maxHp * 0.6) {
        this.stage = 2;
        this.era = 2;
        this.throne.visible = false;
        this.victor.group.visible = false;
        G.hud.say('Victor Halvorsen', 'You think the future is yours to rewrite? I AM the future. Let me show you where it ends.', 5);
        G.shift.charge = 1; G.shift.cooldown = 0; G.shift.start(2);
        this.god.visible = true;
      }
    } else if (this.stage === 2) {
      this.status = 'Phase II — the machine god (2189)';
      this.pos.set(this.home.x + Math.sin(this.t * 0.3) * 5, this.home.y + 6 + Math.sin(this.t) * 1.2, this.home.z + 4);
      this.god.position.copy(this.pos);
      this.god.visible = G.era === 2;
      this.god.rotation.y += dt * 0.3;
      if (G.era === 2) {
        this.atk -= dt;
        if (this.atk <= 0) {
          const r = Math.random();
          if (r < 0.4) shockwave(new THREE.Vector3(this.pos.x, this.home.y, this.pos.z), 10, 26, 18, 2, '#ff4040');
          else if (r < 0.75) for (let i = 0; i < 5; i++) telegraph(new THREE.Vector3(pl.x + (Math.random() - 0.5) * 12, pl.y, pl.z + (Math.random() - 0.5) * 12), 3, 1.2 + i * 0.1, 18, 2);
          else for (let i = 0; i < 4; i++) fireOrb(this.pos.clone(), new THREE.Vector3(Math.random() - 0.5, 0.2, Math.random() - 0.5), 7, 12, '#ff4040', 1.5, 2);
          this.atk = 1.7;
        }
      }
      if (this.hp < this.maxHp * 0.25) {
        this.stage = 3;
        this.invuln = true;
        this.invulnMsg = 'ANCHORED — unmake its anchor in 1996';
        G.hud.say('A.', 'It\'s anchored in time — the rebar core poured in 1996. Shift back and break the anchor!', 5);
      }
    } else if (this.stage === 3) {
      const left = [0, 1, 2].filter((i) => !this.level.flags['anchor' + i]).length;
      this.status = `Phase III — ${left} anchor charge${left === 1 ? '' : 's'} left (1996)`;
      this.god.visible = G.era === 2;
      this.god.position.copy(this.pos);
      this.god.rotation.y += dt * (1 + (3 - left));
      this.atk -= dt;
      if (G.era === 2 && this.atk <= 0) { shockwave(new THREE.Vector3(this.pos.x, this.home.y, this.pos.z), 12, 26, 15, 2, '#ff4040'); this.atk = 2; }
      if (left === 0) { this.invuln = false; this.era = G.era; this.hp = 0; this.dead = true; this.die(); }
    }
  }
}
