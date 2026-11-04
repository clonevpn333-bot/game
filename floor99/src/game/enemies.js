// Enemy roster. Each type has its own silhouette, movement, telegraphs and attacks.
// Robots break apart into physical components when destroyed.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { FXColors } from '../engine/fx.js';
import { armorTextures } from '../engine/textures.js';

const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _hit = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

function baseMats(paint, accent, eye) {
  const A = armorTextures();
  const worn = (color, rough, metal) => new THREE.MeshStandardMaterial({ color, map: A.map, normalMap: A.normalMap, roughnessMap: A.roughnessMap, roughness: rough, metalness: metal });
  return {
    paint: worn(paint, 0.55, 0.45),
    accent: worn(accent, 0.5, 0.4),
    dark: new THREE.MeshStandardMaterial({ color: '#1b1d22', map: A.map, normalMap: A.normalMap, metalness: 0.75, roughness: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: '#a8b0ba', metalness: 1, roughness: 0.25 }),
    eye: new THREE.MeshStandardMaterial({ color: '#000', emissive: eye, emissiveIntensity: 3.5 }),
  };
}
// small detail helpers: bolt rings & hazard stripes on robot parts
function bolts(parent, mat, pts, r = 0.025) { for (const [x, y, z] of pts) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat); b.position.set(x, y, z); parent.add(b); } }
function mk(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
function joint(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

export class Enemy {
  constructor(game, pos, o = {}) {
    this.game = game;
    this.type = o.type || 'enemy';
    this.name = o.name || 'ROBOT';
    this.pos = new THREE.Vector3().copy(pos);
    this.vel = new THREE.Vector3();
    this.knock = new THREE.Vector3();
    this.yaw = o.yaw ?? Math.random() * Math.PI * 2;
    this.hp = this.maxHp = o.hp || 50;
    this.radius = o.radius || 0.5;
    this.height = o.height || 1.6;
    this.speed = o.speed || 5;
    this.flying = !!o.flying;
    this.heavy = !!o.heavy;
    this.swimmer = !!o.swimmer;
    this.alive = true;
    this.state = 'spawn';
    this.stateT = 0;
    this.spawnT = o.spawnTime ?? 0.9;
    this.root = new THREE.Group();
    this.root.position.copy(this.pos);
    this.hitSpheres = []; // { obj, offset, r, mult, tag }
    this.breakParts = [];
    this.flashMats = [];
    this.flash = 0;
    this.stagger = 0;
    this.attackCool = rand(0.5, 1.5);
    this.grounded = false;
    this.seen = false;
    this.losT = 0;
    this.hasLOS = false;
    this.distToPlayer = 99;
    this.score = o.score || 100;
    this.grabbed = false;
    this.thrown = 0;
    this.shortCircuit = 0;
    this.phase = Math.random() * 10;
    this.scoreTag = o.scoreTag || '';
    this.airborneT = 0;
    this.lastHitBy = null;
    this.stunned = 0;
    this.frozen = 0;
    this.burn = 0;
    game.scene.add(this.root);
  }
  // ---- hit geometry
  addHit(obj, offset, r, mult = 1, tag = 'body') { this.hitSpheres.push({ obj, offset: new THREE.Vector3().copy(offset), r, mult, tag }); }
  sphereWorld(h, out) { return h.obj.localToWorld(out.copy(h.offset)); }
  center(out) { return out.copy(this.pos).setY(this.pos.y + this.height * 0.55); }

  // ---- damage
  takeDamage(amount, info = {}) {
    if (!this.alive || this.spawnT > 0.3) return 0;
    let dmg = amount * (info.mult || 1);
    if (this.armor && info.dir && info.tag !== 'weak' && info.weapon !== 'rail' && info.type !== 'explosion' && info.type !== 'crush') {
      const fwd = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      if (info.dir.dot(fwd) < -0.25) { dmg *= this.armor; info.armored = true; }
    }
    if (this.onBeforeDamage) dmg = this.onBeforeDamage(dmg, info);
    if (dmg <= 0) return 0;
    this.hp -= dmg;
    this.flash = 1;
    this.lastHitBy = info.weapon;
    if (info.dir && info.knock) {
      const k = info.knock / (this.heavy ? 6 : 1);
      this.knock.addScaledVector(info.dir, k);
      if (!this.flying && !this.heavy) this.knock.y += k * 0.25;
    }
    if (info.stagger || dmg > this.maxHp * 0.3) this.stagger = Math.max(this.stagger, this.heavy ? 0.15 : 0.35);
    if (!this.seen) { this.seen = true; this.state = this.state === 'spawn' ? 'spawn' : 'chase'; }
    if (this.hp <= 0) { this.hp = 0; this.die(info); }
    else if (this.onHurt) this.onHurt(info);
    return dmg;
  }
  die(info = {}) {
    if (!this.alive) return;
    this.alive = false;
    const G = this.game;
    const dir = info.dir ? info.dir.clone() : new THREE.Vector3(0, 1, 0);
    const c = this.center(new THREE.Vector3());
    this.root.updateMatrixWorld(true);
    // break into components
    for (const p of this.breakParts) {
      if (!p.parent) continue;
      const v = new THREE.Vector3(rand(-1, 1), rand(0.6, 1.6), rand(-1, 1)).multiplyScalar(rand(3, 7)).addScaledVector(dir, rand(4, 10) * (info.force || 1));
      G.fx.detach(p, v, rand(5, 9), 0.18);
    }
    G.fx.explosion(c, this.deathScale || 0.6, { debris: true });
    G.fx.sparks(c, 30, dir, 12);
    G.fx.electric(c, 10, 0.6);
    G.audio.play('robotDie', { pos: c });
    if ((this.deathScale || 0.6) >= 1) G.audio.play('explosion', { pos: c, big: this.deathScale });
    G.scene.remove(this.root);
    G.onEnemyKilled(this, info);
  }
  dispose() { this.game.scene.remove(this.root); }

  // ---- physics & movement
  physicsStep(dt) {
    const G = this.game;
    const P = G.physics;
    // rising out of a hatch / descending from a ceiling port
    if (this.rise) {
      const k = Math.min(1, 1 - this.spawnT / this.rise.dur);
      this.pos.y = this.rise.from + (this.rise.to - this.rise.from) * (1 - Math.pow(1 - k, 2));
      if (k >= 1 || this.spawnT <= 0) { this.pos.y = this.rise.to; this.rise = null; }
      return;
    }
    // knockback decay
    this.knock.multiplyScalar(Math.exp(-(this.heavy ? 6 : 3.5) * dt));
    const gscale = G.gravityScaleEnemies ?? 1;
    if (this.flying) {
      this.pos.addScaledVector(this.vel, dt).addScaledVector(this.knock, dt);
      if (gscale < 0) this.pos.y += -gscale * 6 * dt;
      _v.copy(this.pos).setY(this.pos.y + this.radius);
      if (P.collideSphere(_v, this.radius, (c) => c.tag !== 'trigger')) this.pos.copy(_v).setY(_v.y - this.radius);
    } else {
      const wl = G.waterLevelAt(this.pos.x, this.pos.z);
      const depth = wl - this.pos.y;
      if (!this.grounded || gscale !== 1) this.vel.y -= 26 * gscale * dt;
      if (depth > 0.6 && !this.swimmer) { this.vel.y += 26 * 0.85 * dt; this.vel.multiplyScalar(Math.exp(-2 * dt)); }
      if (this.vel.y < -40) this.vel.y = -40;
      const mv = _v2.copy(this.vel).add(this.knock);
      const len = mv.length() * dt;
      const steps = Math.max(1, Math.ceil(len / 0.3));
      const h = dt / steps;
      const wasGrounded = this.grounded;
      this.grounded = false;
      for (let s = 0; s < steps; s++) {
        this.pos.addScaledVector(mv, h);
        const offs = this.height > 1.8 ? [this.radius, this.height - this.radius] : [this.radius];
        for (const oy of offs) {
          _v.set(this.pos.x, this.pos.y + oy, this.pos.z);
          const n = P.collideSphere(_v, this.radius, (c) => c.tag !== 'trigger' && c.tag !== 'noenemy');
          if (!n) continue;
          this.pos.set(_v.x, _v.y - oy, _v.z);
          for (let k = 0; k < n; k++) {
            const ct = P.contacts[k];
            if (ct.n.y > 0.55) {
              this.grounded = true; this.groundC = ct.c;
              if (this.vel.y < 0) this.vel.y = 0;
              if (this.knock.y < 0) this.knock.y = 0;
              if (ct.c.hazard && this.alive) this._hazard(ct.c.hazard, dt);
            } else {
              const vn = this.vel.dot(ct.n); if (vn < 0) this.vel.addScaledVector(ct.n, -vn);
              const kn = this.knock.dot(ct.n);
              if (kn < 0) {
                // slammed into a wall: impact damage!
                if (kn < -14 && this.thrown > 0) this.takeDamage(-kn * 2.2, { type: 'impact', dir: ct.n.clone().negate() });
                this.knock.addScaledVector(ct.n, -kn * 1.3);
              }
              if (ct.n.y < -0.5 && this.vel.y > 0) this.vel.y = 0;
              this.wallHit = ct.n;
            }
          }
        }
      }
      if (this.grounded && this.groundC) {
        if (this.groundC.conveyor) this.pos.addScaledVector(this.groundC.conveyor, dt);
        if (this.groundC.dynamic) this.pos.applyMatrix4(this.groundC.deltaM);
      }
      if (this.grounded && !wasGrounded && this.airborneT > 0.6) {
        if (this.thrown > 0 || this.airborneT > 1.4) this.takeDamage(this.airborneT * 22, { type: 'fall', dir: new THREE.Vector3(0, -1, 0) });
        G.fx.dust(this.pos, 4, 0.7);
      }
      this.airborneT = this.grounded ? 0 : this.airborneT + dt;
      // water short-circuit (ground robots hate water)
      if (depth > 0.7 && !this.swimmer && !this.waterproof && this.alive) {
        this.shortCircuit += dt;
        if (Math.random() < dt * 8) { G.fx.electric(this.center(_v), 4, 0.5); G.audio.play('zap', { pos: this.pos }); }
        if (this.shortCircuit > 0.25) { this.shortCircuit = 0; this.takeDamage(this.maxHp * 0.22, { type: 'water', env: true }); }
      }
    }
    this.thrown = Math.max(0, this.thrown - dt);
    if (this.pos.y < (G.floor?.killY ?? -30)) { this.takeDamage(9999, { type: 'fall', env: true }); }
  }
  _hazard(hz, dt) {
    this._hz = (this._hz || 0) - dt;
    if (this._hz <= 0) { this._hz = 0.3; this.takeDamage(hz.dps * 0.6, { type: hz.type, env: true }); this.knock.y += 6; }
  }
  // steer toward a point (ground units)
  steer(dir, speed, dt, accel = 30) {
    const tx = dir.x * speed, tz = dir.z * speed;
    const ice = this.game.ice ? 0.15 : 1;
    const k = 1 - Math.exp(-accel * 0.2 * ice * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;
  }
  faceToward(x, z, dt, rate = 8) {
    const target = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.yaw += angDiff(this.yaw, target) * (1 - Math.exp(-rate * dt));
  }
  pathDir(out) {
    const G = this.game;
    const pl = G.player.pos;
    if (this.hasLOS && Math.abs(pl.y - this.pos.y) < 2.5) return out.set(pl.x - this.pos.x, 0, pl.z - this.pos.z).normalize();
    if (G.nav && G.nav.dirTo(this.pos, out)) return out;
    return out.set(pl.x - this.pos.x, 0, pl.z - this.pos.z).normalize();
  }
  separate(dt) {
    for (const o of this.game.enemies) {
      if (o === this || !o.alive || o.flying !== this.flying) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz, rr = this.radius + o.radius + 0.3;
      if (d2 < rr * rr && d2 > 1e-4) {
        const d = Math.sqrt(d2), push = (rr - d) * 6 * dt;
        this.pos.x += dx / d * push; this.pos.z += dz / d * push;
      }
    }
  }
  perceive(dt) {
    const G = this.game;
    const pl = G.player;
    this.distToPlayer = this.pos.distanceTo(pl.pos);
    this.losT -= dt;
    if (this.losT <= 0) {
      this.losT = 0.15 + Math.random() * 0.1;
      const eye = this.center(_v);
      const tgt = _v2.copy(pl.pos).setY(pl.pos.y + 1.3);
      this.hasLOS = G.physics.lineOfSight(eye, tgt);
      const range = G.lightsOut > 0.5 ? 14 : 60;
      if (this.hasLOS && this.distToPlayer < range) this.seen = true;
    }
  }
  updateFlash(dt) {
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 8);
      for (const m of this.flashMats) { m.emissive.setRGB(this.flash, this.flash, this.flash); }
    }
  }
  common(dt) {
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.state = 'chase'; this.seen = true; }
    }
    if (this.stagger > 0) this.stagger -= dt;
    if (this.stunned > 0) this.stunned -= dt;
    this.perceive(dt);
    this.updateFlash(dt);
    // ground units stranded somewhere unreachable re-enter the arena (prevents soft-locks)
    if (!this.flying && !this.swimmer && this.type !== 'foreman') {
      this.strandT = this.hasLOS || this.distToPlayer < 25 ? 0 : (this.strandT || 0) + dt;
      const pts = this.game.floor?.spawnPoints;
      if (this.strandT > 25 && pts?.length) {
        const pl = this.game.player.pos;
        let best = pts[0], bd = 1e9;
        for (const p of pts) { const d = Math.hypot(p[0] - pl.x, p[2] - pl.z); if (d < bd && d > 8) { bd = d; best = p; } }
        this.pos.set(best[0], best[1] + 0.2, best[2]); this.vel.set(0, 0, 0); this.knock.set(0, 0, 0); this.strandT = 0;
        this.game.fx.ring(this.pos.clone().setY(this.pos.y + 0.1), 0.2, 2.2, 0.5, 0xff2d6f);
      }
    }
  }
  update(dt) { }
  syncRoot() { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; }
}

// ===================================================================== CLANKER
export class Clanker extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'clanker', name: 'CLANKER', hp: 45, radius: 0.45, height: 1.35, speed: 9.2, score: 100, ...o });
    const M = this.M = baseMats(o.paint || '#aeb4bd', o.accent || '#e8572a', '#ff2d2d');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    const r = this.root;
    this.body = joint(r, 0, 0.75, 0);
    const torso = mk(this.body, rbox(0.62, 0.48, 0.55, 0.12), M.paint, 0, 0.15, 0);
    mk(this.body, rbox(0.66, 0.12, 0.5, 0.04), M.accent, 0, 0.36, -0.02);
    mk(this.body, rbox(0.3, 0.2, 0.1, 0.03), M.dark, 0, 0.12, -0.3); // back vent
    mk(this.body, rbox(0.22, 0.14, 0.05, 0.03), M.dark, 0, 0.08, 0.28); // chest port
    mk(this.body, new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), M.eye, 0, 0.08, 0.31, Math.PI / 2);
    bolts(this.body, M.steel, [[-0.25, 0.32, 0.25], [0.25, 0.32, 0.25], [-0.25, -0.02, 0.25], [0.25, -0.02, 0.25], [-0.32, 0.15, 0], [0.32, 0.15, 0]]);
    for (const sx of [-1, 1]) mk(this.body, rbox(0.04, 0.42, 0.02, 0.01), M.accent, 0.18 * sx, 0.15, 0.285);
    for (let i = 0; i < 3; i++) mk(this.body, rbox(0.32, 0.02, 0.02, 0.005), M.eye, 0, 0.06 + i * 0.05, -0.355);
    // head with single eye
    this.head = joint(this.body, 0, 0.42, 0.18);
    const hd = mk(this.head, rbox(0.38, 0.26, 0.32, 0.08), M.paint, 0, 0.08, 0.05);
    mk(this.head, new THREE.CylinderGeometry(0.1, 0.12, 0.08, 16), M.dark, 0, 0.08, 0.22, Math.PI / 2);
    this.eye = mk(this.head, new THREE.SphereGeometry(0.075, 12, 10), M.eye, 0, 0.08, 0.25);
    mk(this.head, new THREE.CylinderGeometry(0.01, 0.01, 0.25, 4), M.steel, 0.12, 0.3, -0.02, 0, 0, -0.3);
    mk(this.head, new THREE.SphereGeometry(0.03, 6, 6), M.eye, 0.16, 0.42, -0.02);
    // arms with saw-claws
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = joint(this.body, 0.38 * s, 0.25, 0.05);
      mk(sh, new THREE.SphereGeometry(0.11, 10, 8), M.dark);
      mk(sh, rbox(0.12, 0.38, 0.12, 0.04), M.accent, 0, -0.18, 0.04);
      const el = joint(sh, 0, -0.36, 0.06);
      mk(el, rbox(0.1, 0.3, 0.1, 0.03), M.paint, 0, -0.12, 0.06, 0.5);
      const claw = joint(el, 0, -0.3, 0.18);
      const saw = mk(claw, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18), M.steel, 0, 0, 0, 0, 0, Math.PI / 2);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; mk(saw, new THREE.ConeGeometry(0.03, 0.06, 4), M.steel, Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17, 0, 0, -a + Math.PI / 2); }
      this.arms.push({ sh, el, claw, saw });
      this.breakParts.push(sh);
    }
    // digitigrade legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = joint(r, 0.2 * s, 0.75, -0.05);
      mk(hip, rbox(0.14, 0.36, 0.16, 0.05), M.dark, 0, -0.16, 0.06, -0.5);
      const knee = joint(hip, 0, -0.3, 0.16);
      mk(knee, rbox(0.1, 0.32, 0.1, 0.03), M.paint, 0, -0.14, -0.06, 0.6);
      const ankle = joint(knee, 0, -0.28, -0.14);
      mk(ankle, new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), M.steel, 0, -0.08, 0);
      const foot = mk(ankle, rbox(0.16, 0.06, 0.26, 0.02), M.dark, 0, -0.17, 0.06);
      this.legs.push({ hip, knee, ankle, foot, s });
      this.breakParts.push(hip);
    }
    this.breakParts.push(this.head);
    this.addHit(this.body, new THREE.Vector3(0, 0.15, 0), 0.42, 1, 'body');
    this.addHit(this.head, new THREE.Vector3(0, 0.08, 0.06), 0.22, 2.2, 'head');
    this.addHit(this.root, new THREE.Vector3(0, 0.4, 0), 0.3, 0.8, 'legs');
    this.strikeT = 0;
    this.deathScale = 0.6;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    const dirToPl = _v3.set(pl.pos.x - this.pos.x, 0, pl.pos.z - this.pos.z);
    const dist = dirToPl.length();
    dirToPl.normalize();
    this.attackCool -= dt;
    let moveSpeed = 0;
    if (this.state === 'spawn') {
      this.vel.x *= 0.8; this.vel.z *= 0.8;
    } else if (this.stagger > 0 || this.stunned > 0 || this.grabbed) {
      this.vel.x *= Math.exp(-6 * dt); this.vel.z *= Math.exp(-6 * dt);
    } else if (this.state === 'chase') {
      if (!this.seen) { this.state = 'idle'; }
      const d = this.pathDir(_v);
      // strafe a bit when close to make them less predictable
      if (dist < 6) { _v2.set(-d.z, 0, d.x).multiplyScalar(Math.sin(this.phase * 0.7) * 0.4); d.add(_v2).normalize(); }
      moveSpeed = this.speed * (G.enemySpeedMult || 1);
      this.steer(d, moveSpeed, dt, 40);
      this.faceToward(this.pos.x + d.x, this.pos.z + d.z, dt, 10);
      if (dist < 2.3 && this.attackCool <= 0 && Math.abs(pl.pos.y - this.pos.y) < 1.6) { this.state = 'windup'; this.stateT = 0; G.audio.play('windup', { pos: this.pos }); }
      else if (this.grounded && dist > 5 && dist < 11 && this.hasLOS && this.attackCool <= 0 && Math.random() < dt * 0.8) {
        // pounce
        this.state = 'leap'; this.stateT = 0;
        const t = 0.65;
        const dy = pl.pos.y - this.pos.y;
        this.vel.set((pl.pos.x - this.pos.x) / t * 0.92, (dy + 0.5 * 26 * t * t) / t, (pl.pos.z - this.pos.z) / t * 0.92);
        this.grounded = false;
        G.audio.play('servo', { pos: this.pos });
      }
    } else if (this.state === 'idle') {
      this.vel.x *= 0.9; this.vel.z *= 0.9;
      this.phase += dt;
      if (this.seen || this.distToPlayer < 25) { this.seen = true; this.state = 'chase'; G.audio.play('alert', { pos: this.pos }); }
    } else if (this.state === 'windup') {
      this.stateT += dt;
      this.faceToward(pl.pos.x, pl.pos.z, dt, 14);
      this.vel.x *= 0.85; this.vel.z *= 0.85;
      this.M.eye.emissiveIntensity = 3.5 + Math.sin(this.stateT * 60) * 3;
      if (this.stateT > 0.36) {
        this.state = 'strike'; this.stateT = 0;
        const f = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        this.vel.x = f.x * 13; this.vel.z = f.z * 13;
        G.audio.play('swing', { pos: this.pos });
        this.M.eye.emissiveIntensity = 3.5;
      }
    } else if (this.state === 'strike') {
      this.stateT += dt;
      if (this.stateT > 0.08 && !this.struck) {
        const f = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const to = _v2.subVectors(pl.pos, this.pos); to.y = 0;
        if (to.length() < 2.4 && to.normalize().dot(f) > 0.3 && Math.abs(pl.pos.y - this.pos.y) < 1.8) {
          this.struck = true;
          if (pl.damage(14, { from: this.pos, knock: f.clone().multiplyScalar(9).setY(4), type: 'melee' })) G.audio.play('robotHit', { pos: pl.pos });
        }
      }
      if (this.stateT > 0.28) { this.state = 'chase'; this.struck = false; this.attackCool = rand(0.8, 1.3); }
    } else if (this.state === 'leap') {
      this.stateT += dt;
      if (this.stateT > 0.15 && this.grounded) { this.state = 'chase'; this.attackCool = 0.4; G.fx.dust(this.pos, 5, 0.6); G.audio.play('stomp', { pos: this.pos }); }
      if (!this.struck && this.pos.distanceTo(pl.pos) < 1.6) { this.struck = true; pl.damage(12, { from: this.pos, knock: _v.copy(this.vel).setY(3).multiplyScalar(0.5), type: 'melee' }); }
      if (this.stateT > 2) this.state = 'chase';
    }
    if (this.state !== 'strike' && this.state !== 'leap') this.struck = false;
    if (!this.flying) this.physicsStep(dt);
    this.separate(dt);
    this.syncRoot();
    this.animate(dt);
  }
  animate(dt) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * sp * 1.6;
    const p = this.phase;
    const run = clamp(sp / 6, 0, 1);
    for (const L of this.legs) {
      const ph = p + (L.s > 0 ? Math.PI : 0);
      const air = !this.grounded;
      L.hip.rotation.x = air ? -0.7 : -Math.sin(ph) * 0.8 * run;
      L.knee.rotation.x = air ? 0.9 : Math.max(0, Math.sin(ph + 1)) * 0.9 * run;
      L.ankle.rotation.x = air ? -0.5 : -Math.max(0, Math.sin(ph - 0.5)) * 0.7 * run;
    }
    const spawnK = this.spawnT > 0 ? this.spawnT : 0;
    this.body.position.y = 0.75 + Math.abs(Math.sin(p)) * 0.06 * run - spawnK * 0.3;
    this.body.rotation.x = 0.25 * run + (this.state === 'windup' ? -0.4 : this.state === 'strike' ? 0.5 : 0) + (this.stagger > 0 ? -0.5 : 0);
    const windup = this.state === 'windup' ? 1 : 0;
    const strike = this.state === 'strike' ? 1 : 0;
    this.arms.forEach((a, i) => {
      const s = i === 0 ? 1 : -1;
      a.sh.rotation.x = damp(a.sh.rotation.x, windup ? -2.4 : strike ? -0.4 : -0.6 + Math.sin(p + i * Math.PI) * 0.5 * run, 20, dt);
      a.sh.rotation.z = damp(a.sh.rotation.z, windup ? 0.5 * s : 0.15 * s, 12, dt);
      a.saw.rotation.y += dt * (windup || strike ? 60 : 8);
    });
    this.head.rotation.y = Math.sin(this.phase * 0.3) * 0.15;
  }
}

// ===================================================================== SKYCAM DRONE
export class Drone extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'drone', name: 'SKYCAM', hp: 30, radius: 0.5, height: 0.8, speed: 7, flying: true, score: 120, ...o });
    const M = this.M = baseMats('#2b2f38', '#ffd400', '#ff2d6f');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    const r = this.root;
    this.body = joint(r, 0, 0.4, 0);
    mk(this.body, rbox(0.7, 0.36, 0.6, 0.1), M.paint);
    mk(this.body, rbox(0.72, 0.08, 0.62, 0.03), M.accent, 0, 0.14, 0);
    const lens = mk(this.body, new THREE.CylinderGeometry(0.17, 0.2, 0.25, 18), M.dark, 0, -0.02, 0.38, Math.PI / 2);
    this.lens = mk(this.body, new THREE.CircleGeometry(0.13, 20), M.eye, 0, -0.02, 0.51);
    this.lensRing = mk(this.body, new THREE.TorusGeometry(0.17, 0.015, 6, 20), M.eye, 0, -0.02, 0.505);
    mk(this.body, new THREE.BoxGeometry(0.12, 0.06, 0.04), M.eye, 0.25, 0.08, 0.3); // tally light ("ON AIR")
    bolts(this.body, M.steel, [[-0.3, 0.12, 0.28], [0.3, 0.12, 0.28], [-0.3, 0.12, -0.28], [0.3, 0.12, -0.28]], 0.022);
    mk(this.body, rbox(0.4, 0.12, 0.3, 0.04), M.dark, 0, -0.24, -0.05); // battery pack
    for (let i = 0; i < 4; i++) mk(this.body, rbox(0.06, 0.02, 0.28, 0.005), M.eye, -0.15 + i * 0.1, -0.31, -0.05);
    const ant = mk(this.body, new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), M.steel, -0.2, 0.33, -0.15);
    mk(ant, new THREE.SphereGeometry(0.025, 8, 6), M.eye, 0, 0.16, 0);
    this.rotors = [];
    for (const [x, z] of [[0.55, 0.4], [-0.55, 0.4], [0.55, -0.4], [-0.55, -0.4]]) {
      const arm = mk(this.body, rbox(0.5, 0.05, 0.08, 0.02), M.dark, x * 0.6, 0.05, z * 0.6, 0, Math.atan2(z, x), 0);
      const hub = joint(this.body, x, 0.12, z);
      mk(hub, new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), M.steel);
      const rot = joint(hub, 0, 0.06, 0);
      mk(rot, rbox(0.48, 0.01, 0.06, 0.004), M.steel);
      mk(rot, rbox(0.06, 0.01, 0.48, 0.004), M.steel);
      mk(hub, new THREE.TorusGeometry(0.27, 0.015, 4, 20), M.accent, 0, 0.06, 0, Math.PI / 2);
      this.rotors.push(rot);
      this.breakParts.push(hub);
    }
    this.breakParts.push(lens);
    this.addHit(this.body, new THREE.Vector3(0, 0, 0), 0.48, 1, 'body');
    this.addHit(this.body, new THREE.Vector3(0, -0.02, 0.45), 0.18, 2, 'head');
    this.hoverH = rand(4.5, 7);
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.orbitR = rand(9, 14);
    this.attackCool = rand(1.5, 3);
    this.charge = 0;
    this.deathScale = 0.7;
    this.falling = false;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    if (this.falling) {
      this.vel.y -= 20 * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.yaw += dt * 10;
      G.fx.smokePuff(this.pos, 1, 0.6, 0.8);
      G.fx.fire(this.pos, 1, 0.4);
      _v.copy(this.pos).setY(this.pos.y + 0.3);
      if (G.physics.collideSphere(_v, 0.4, (c) => c.tag !== 'trigger') || this.pos.y < (G.floor?.killY ?? -30) + 2) { this.falling = false; this._explodeDeath(); }
      this.syncRoot();
      this.body.rotation.z += dt * 6;
      return;
    }
    const tgt = _v3.copy(pl.pos);
    this.phase += dt;
    const ground = G.floor?.groundY ?? 0;
    const minY = Math.max(pl.pos.y + 3, ground + 3);
    if (this.state === 'spawn') {
      this.vel.multiplyScalar(0.9);
    } else if (this.stunned > 0 || this.grabbed) {
      this.vel.multiplyScalar(Math.exp(-4 * dt));
      this.vel.y -= 8 * dt;
    } else {
      // orbit the player at range, keep altitude
      const ang = Math.atan2(this.pos.z - tgt.z, this.pos.x - tgt.x) + this.orbitDir * dt * 0.5;
      const want = _v.set(tgt.x + Math.cos(ang) * this.orbitR, minY + this.hoverH - 3 + Math.sin(this.phase * 1.3) * 0.6, tgt.z + Math.sin(ang) * this.orbitR);
      if (!this.hasLOS && this.seen) want.lerp(tgt, 0.35).setY(Math.max(want.y, tgt.y + 2));
      const ceil = G.floor?.ceilingY ?? 40;
      want.y = Math.min(want.y, ceil - 2);
      const to = want.sub(this.pos);
      const d = to.length();
      if (d > 0.1) to.multiplyScalar(Math.min(1, d / 3) * this.speed / d);
      this.vel.lerp(to, 1 - Math.exp(-2.5 * dt));
      if (Math.random() < dt * 0.15) this.orbitDir *= -1;
      // attack
      this.attackCool -= dt;
      if (this.hasLOS && this.attackCool <= 0 && this.distToPlayer < 34 && this.state !== 'charge') { this.state = 'charge'; this.charge = 0; G.audio.play('alert', { pos: this.pos }); }
      if (this.state === 'charge') {
        this.charge += dt;
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        this.M.eye.emissiveIntensity = 3.5 + this.charge * 14;
        this.lensRing.scale.setScalar(1 + this.charge * 1.4);
        if (this.charge > 0.6) {
          this.state = 'chase';
          this.M.eye.emissiveIntensity = 3.5;
          this.lensRing.scale.setScalar(1);
          this.attackCool = rand(1.6, 2.6) * (G.lightsOut > 0.5 ? 1.5 : 1);
          if (this.hasLOS) this.shoot();
        }
      }
    }
    if (this.gravityPull) this.vel.y += this.gravityPull * dt;
    // safety net: a flyer stuck out of reach (behind glass, inside set dressing) re-enters the arena
    this.lostT = this.hasLOS || this.state === 'spawn' ? 0 : (this.lostT || 0) + dt;
    if (this.lostT > 12 && G.floor?.spawnPoints?.length) {
      const pts = G.floor.spawnPoints;
      let best = pts[0], bd = 1e9;
      for (const p of pts) { const d = Math.hypot(p[0] - pl.pos.x, p[2] - pl.pos.z); if (d < bd && d > 6) { bd = d; best = p; } }
      this.pos.set(best[0], Math.max(best[1], pl.pos.y) + 5, best[2]);
      this.vel.set(0, 0, 0); this.lostT = 0;
      G.fx.ring(this.pos.clone(), 0.3, 2.5, 0.5, 0xff2d6f);
    }
    this.physicsStep(dt);
    this.separate(dt);
    // face player
    this.faceToward(pl.pos.x, pl.pos.z, dt, 6);
    this.syncRoot();
    // tilt with velocity
    const lv = _v.copy(this.vel).applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
    this.body.rotation.x = damp(this.body.rotation.x, clamp(lv.z * 0.06, -0.4, 0.4), 6, dt);
    this.body.rotation.z = damp(this.body.rotation.z, clamp(-lv.x * 0.06, -0.4, 0.4), 6, dt);
    // aim lens pitch at player
    const dy = pl.pos.y + 1.2 - this.pos.y;
    this.body.rotation.x += Math.atan2(-dy, Math.hypot(pl.pos.x - this.pos.x, pl.pos.z - this.pos.z)) * 0.5;
    for (const r of this.rotors) r.rotation.y += dt * 40;
    if (this.spawnT > 0) this.root.scale.setScalar(1 - this.spawnT * 0.8);
    else this.root.scale.setScalar(1);
  }
  shoot() {
    const G = this.game, pl = G.player;
    const from = this.lens.getWorldPosition(new THREE.Vector3());
    // lead the target slightly
    const lead = _v.copy(pl.vel).multiplyScalar(this.distToPlayer / 24 * 0.5);
    const to = _v2.copy(pl.pos).add(lead).setY(pl.pos.y + 1.1);
    const dir = to.sub(from).normalize();
    // inaccuracy
    dir.x += rand(-0.03, 0.03); dir.y += rand(-0.02, 0.02); dir.z += rand(-0.03, 0.03);
    dir.normalize();
    G.spawnProjectile({ pos: from, vel: dir.multiplyScalar(23), damage: 9, color: 0xff2d6f, radius: 0.22, owner: this });
    G.audio.play('enemyShot', { pos: from });
    G.fx.flashLight(from, 0xff2d6f, 10, 0.08, 6);
  }
  die(info = {}) {
    if (!this.alive) return;
    // spiral down in flames, then explode
    if (info.type !== 'explosion' && Math.random() < 0.75 && !this.falling) {
      this.alive = false;
      this.falling = true;
      this.vel.set(rand(-3, 3), 2, rand(-3, 3));
      this.game.audio.play('robotHit', { pos: this.pos });
      this.game.onEnemyKilled(this, info);
      this.game.fallingDrones.push(this);
      return;
    }
    super.die(info);
  }
  _explodeDeath() {
    const G = this.game;
    G.fx.explosion(this.pos, 0.8);
    G.audio.play('explosion', { pos: this.pos, big: 0.6 });
    G.damageRadius(this.pos, 3, 30, 10, { source: 'env', type: 'explosion' });
    for (const p of this.breakParts) if (p.parent) G.fx.detach(p, new THREE.Vector3(rand(-6, 6), rand(3, 8), rand(-6, 6)), 6, 0.15);
    G.scene.remove(this.root);
    this.dead = true;
  }
}

// ===================================================================== BRUISER (heavy armored)
export class Bruiser extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'bruiser', name: 'BRUISER', hp: 340, radius: 0.95, height: 2.7, speed: 3.6, heavy: true, score: 400, ...o });
    const M = this.M = baseMats(o.paint || '#3a404c', o.accent || '#f2c230', '#ff8a1f');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    this.armor = 0.3;
    const r = this.root;
    this.body = joint(r, 0, 1.45, 0);
    mk(this.body, rbox(1.5, 1.1, 1.1, 0.2), M.paint, 0, 0.3, 0);
    // front armor slabs
    this.frontPlates = [];
    for (const [x, y] of [[-0.4, 0.55], [0.4, 0.55], [-0.4, 0.05], [0.4, 0.05]]) {
      const pl = mk(this.body, rbox(0.72, 0.5, 0.16, 0.05), M.accent, x, y, 0.6);
      mk(pl, rbox(0.6, 0.06, 0.03, 0.01), M.dark, 0, 0.15, 0.09);
      this.frontPlates.push(pl);
      this.breakParts.push(pl);
    }
    // back: exposed reactor core (weak point)
    this.core = mk(this.body, new THREE.SphereGeometry(0.28, 16, 12), M.eye, 0, 0.35, -0.6);
    mk(this.body, new THREE.TorusGeometry(0.32, 0.05, 8, 20), M.dark, 0, 0.35, -0.6);
    for (let i = 0; i < 4; i++) mk(this.body, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), M.steel, -0.45 + i * 0.3, 1.0, -0.4, 0.3);
    // small head sunk into shoulders
    this.head = joint(this.body, 0, 0.95, 0.35);
    mk(this.head, rbox(0.5, 0.32, 0.4, 0.08), M.paint);
    this.eye = mk(this.head, rbox(0.38, 0.06, 0.04, 0.02), M.eye, 0, 0.02, 0.21);
    // giant arms
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = joint(this.body, 0.95 * s, 0.6, 0);
      mk(sh, new THREE.SphereGeometry(0.38, 14, 10), M.accent);
      const el = joint(sh, 0.05 * s, -0.75, 0.1);
      mk(sh, rbox(0.4, 0.8, 0.4, 0.08), M.paint, 0.05 * s, -0.4, 0.05);
      mk(el, rbox(0.55, 0.75, 0.55, 0.1), M.dark, 0, -0.35, 0.1);
      const fist = mk(el, rbox(0.7, 0.55, 0.7, 0.12), M.accent, 0, -0.85, 0.12);
      this.arms.push({ sh, el, fist });
      this.breakParts.push(sh);
    }
    // stumpy legs
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = joint(r, 0.5 * s, 1.0, 0);
      mk(hip, rbox(0.5, 0.6, 0.5, 0.1), M.dark, 0, -0.25, 0);
      const knee = joint(hip, 0, -0.55, 0);
      mk(knee, rbox(0.55, 0.45, 0.6, 0.1), M.paint, 0, -0.2, 0.05);
      mk(knee, rbox(0.7, 0.18, 0.85, 0.06), M.accent, 0, -0.42, 0.12);
      this.legs.push({ hip, knee, s });
      this.breakParts.push(hip);
    }
    this.breakParts.push(this.head);
    this.addHit(this.body, new THREE.Vector3(0, 0.3, 0), 0.95, 1, 'body');
    this.addHit(this.body, new THREE.Vector3(0, 0.35, -0.6), 0.36, 2.6, 'weak');
    this.addHit(this.head, new THREE.Vector3(0, 0, 0.05), 0.3, 1.6, 'head');
    this.addHit(this.root, new THREE.Vector3(0, 0.6, 0), 0.6, 0.8, 'legs');
    this.deathScale = 1.4;
    this.attackCool = 2;
  }
  onBeforeDamage(dmg, info) {
    if (info.armored) { this.game.fx.sparks(info.point || this.center(_v), 6, info.dir ? info.dir.clone().negate() : null, 8); this.game.audio.play('impactMetal', { pos: this.pos }); this.game.hud.armorPing(); }
    if (this.state === 'stunned') dmg *= 1.4;
    return dmg;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.attackCool -= dt;
    const dist = this.distToPlayer;
    if (this.state === 'spawn') { this.vel.x = 0; this.vel.z = 0; }
    else if (this.grabbed) { }
    else if (this.state === 'chase' || this.state === 'idle') {
      this.seen = true; this.state = 'chase';
      const d = this.pathDir(_v);
      this.steer(d, this.speed * (G.enemySpeedMult || 1), dt, 10);
      this.faceToward(pl.pos.x, pl.pos.z, dt, 2.5);
      if (dist < 4.5 && this.attackCool <= 0) { this.state = 'slamWind'; this.stateT = 0; G.audio.play('windup', { pos: this.pos }); this.ring = G.hud.groundWarning ? null : null; G.fx.ring(_v2.copy(this.pos).setY(this.pos.y + 0.05), 5.5, 5.6, 0.75, 0xff3030); }
      else if (dist > 8 && dist < 24 && this.hasLOS && this.attackCool <= 0) { this.state = 'chargeWind'; this.stateT = 0; G.audio.play('alert', { pos: this.pos }); }
    } else if (this.state === 'slamWind') {
      this.stateT += dt;
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      this.M.eye.emissiveIntensity = 3.5 + Math.sin(this.stateT * 40) * 3;
      if (this.stateT > 0.75) {
        this.state = 'recover'; this.stateT = 0;
        this.attackCool = rand(2, 3);
        G.audio.play('pressSlam', { pos: this.pos });
        G.fx.ring(_v2.copy(this.pos).setY(this.pos.y + 0.1), 0.5, 6, 0.4, 0xffb060);
        G.fx.dust(this.pos, 16, 1.6);
        G.player.shake(0.4);
        const d = pl.pos.distanceTo(this.pos);
        if (d < 5.5 && pl.grounded && Math.abs(pl.pos.y - this.pos.y) < 1) pl.damage(24, { from: this.pos, knock: _v.subVectors(pl.pos, this.pos).setY(0).normalize().multiplyScalar(14).setY(7), type: 'slam' });
        G.shockwave(this.pos, 5.5, 18, this);
      }
    } else if (this.state === 'chargeWind') {
      this.stateT += dt;
      this.vel.x *= 0.85; this.vel.z *= 0.85;
      this.faceToward(pl.pos.x, pl.pos.z, dt, 6);
      if (Math.random() < 0.5) G.fx.dust(this.pos, 1, 0.6);
      if (this.stateT > 0.85) { this.state = 'charge'; this.stateT = 0; G.audio.play('servo', { pos: this.pos }); this.hitPlayer = false; this.wallHit = null; }
    } else if (this.state === 'charge') {
      this.stateT += dt;
      const f = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.faceToward(pl.pos.x, pl.pos.z, dt, 0.8);
      this.vel.x = f.x * 17; this.vel.z = f.z * 17;
      if (Math.random() < 0.6) G.fx.dust(this.pos, 1, 0.8);
      if (Math.floor(this.stateT * 6) !== Math.floor((this.stateT - dt) * 6)) G.audio.play('stomp', { pos: this.pos });
      if (!this.hitPlayer && pl.pos.distanceTo(this.pos) < 2.0) {
        this.hitPlayer = true;
        pl.damage(28, { from: this.pos, knock: f.clone().multiplyScalar(20).setY(8), type: 'charge' });
      }
      // smash props in the way
      G.smashAround(this.pos, 1.6, f, 14);
      if (this.wallHit && Math.abs(this.wallHit.y) < 0.5 && this.stateT > 0.15) {
        this.state = 'stunned'; this.stateT = 0; this.stunned = 2.2;
        G.audio.play('pressSlam', { pos: this.pos }); G.player.shake(0.3);
        G.fx.sparks(this.center(_v2), 20, null, 10);
        this.vel.set(0, 0, 0);
        G.emit('bruiserStunned', this);
      } else if (this.stateT > 1.5) { this.state = 'recover'; this.stateT = 0; this.attackCool = 2.5; }
      this.wallHit = null;
    } else if (this.state === 'stunned') {
      this.stateT += dt;
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      if (Math.random() < dt * 10) G.fx.electric(this.center(_v2).setY(this.pos.y + 2.4), 3, 0.4);
      if (this.stateT > 2.2) { this.state = 'chase'; this.attackCool = 1.5; }
    } else if (this.state === 'recover') {
      this.stateT += dt;
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      if (this.stateT > 0.7) this.state = 'chase';
    }
    this.physicsStep(dt);
    this.separate(dt);
    this.syncRoot();
    this.animate(dt);
  }
  animate(dt) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * sp * 0.9;
    const p = this.phase, run = clamp(sp / 4, 0, 1);
    for (const L of this.legs) {
      const ph = p + (L.s > 0 ? Math.PI : 0);
      L.hip.rotation.x = -Math.sin(ph) * 0.5 * run;
      L.knee.rotation.x = Math.max(0, Math.sin(ph + 1)) * 0.6 * run;
    }
    const st = this.state;
    const spawnK = this.spawnT > 0 ? this.spawnT : 0;
    this.body.position.y = 1.45 + Math.abs(Math.sin(p)) * 0.08 * run - spawnK * 0.6 + (st === 'slamWind' ? 0.2 : 0);
    this.body.rotation.x = damp(this.body.rotation.x, st === 'charge' ? 0.45 : st === 'stunned' ? -0.3 : st === 'slamWind' ? -0.25 : 0.05, 8, dt);
    this.body.rotation.z = st === 'stunned' ? Math.sin(this.stateT * 9) * 0.1 : 0;
    this.arms.forEach((a, i) => {
      const s = i ? 1 : -1;
      const tx = st === 'slamWind' ? -2.9 : st === 'recover' ? -0.5 : st === 'charge' ? -1.2 : Math.sin(p + i * Math.PI) * 0.4 * run;
      a.sh.rotation.x = damp(a.sh.rotation.x, tx, st === 'recover' ? 30 : 8, dt);
      a.sh.rotation.z = damp(a.sh.rotation.z, st === 'charge' ? -0.3 * s : 0.15 * -s * 0, 8, dt);
    });
    this.core.scale.setScalar(1 + Math.sin(performance.now() * 0.008) * 0.12 + (st === 'stunned' ? 0.3 : 0));
  }
}

// ===================================================================== SHIELD UNIT ("BOUNCER")
export class ShieldBot extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'shield', name: 'BOUNCER', hp: 90, radius: 0.6, height: 2.0, speed: 4.6, score: 250, ...o });
    const M = this.M = baseMats('#1e5a8a', '#d9dde2', '#38e8ff');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    const r = this.root;
    this.body = joint(r, 0, 1.05, 0);
    mk(this.body, rbox(0.85, 0.75, 0.55, 0.15), M.paint, 0, 0.35, 0);
    mk(this.body, rbox(0.9, 0.18, 0.6, 0.05), M.accent, 0, 0.62, 0);
    this.head = joint(this.body, 0, 0.85, 0.05);
    mk(this.head, new THREE.SphereGeometry(0.22, 16, 12), M.accent);
    this.visor = mk(this.head, rbox(0.34, 0.08, 0.1, 0.03), M.eye, 0, 0.02, 0.17);
    // shield arm (left) — hexagonal energy shield
    this.shieldArm = joint(this.body, -0.55, 0.45, 0.25);
    mk(this.shieldArm, rbox(0.2, 0.5, 0.2, 0.05), M.accent, 0, -0.15, 0);
    this.shieldMat = new THREE.MeshStandardMaterial({ color: '#0a2030', emissive: '#38e8ff', emissiveIntensity: 1.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    this.shield = mk(this.shieldArm, new THREE.CylinderGeometry(0.95, 0.95, 0.06, 6), this.shieldMat, 0.45, -0.1, 0.55, Math.PI / 2, 0, 0);
    this.shield.castShadow = false;
    this.shieldFrame = mk(this.shieldArm, new THREE.TorusGeometry(0.95, 0.04, 6, 6), M.accent, 0.45, -0.1, 0.55, 0, 0, Math.PI / 6);
    // gun arm
    this.gunArm = joint(this.body, 0.55, 0.45, 0.1);
    mk(this.gunArm, rbox(0.2, 0.55, 0.2, 0.05), M.accent, 0, -0.2, 0);
    this.gun = mk(this.gunArm, rbox(0.14, 0.14, 0.5, 0.03), M.dark, 0, -0.45, 0.2);
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = joint(r, 0.25 * s, 1.0, 0);
      mk(hip, rbox(0.24, 0.55, 0.26, 0.06), M.dark, 0, -0.25, 0);
      const knee = joint(hip, 0, -0.5, 0);
      mk(knee, rbox(0.22, 0.5, 0.24, 0.06), M.paint, 0, -0.22, 0);
      mk(knee, rbox(0.28, 0.1, 0.4, 0.03), M.accent, 0, -0.47, 0.06);
      this.legs.push({ hip, knee, s });
      this.breakParts.push(hip);
    }
    this.breakParts.push(this.head, this.shieldArm, this.gunArm);
    this.shieldHp = this.shieldMax = 160;
    this.shieldDown = 0;
    this.addHit(this.shieldArm, new THREE.Vector3(0.45, -0.1, 0.55), 1.0, 0, 'shield');
    this.addHit(this.body, new THREE.Vector3(0, 0.35, 0), 0.55, 1, 'body');
    this.addHit(this.head, new THREE.Vector3(0, 0, 0), 0.24, 2.2, 'head');
    this.addHit(this.root, new THREE.Vector3(0, 0.5, 0), 0.35, 0.9, 'legs');
    this.attackCool = 2;
    this.deathScale = 0.8;
  }
  shieldActive() { return this.shieldDown <= 0 && this.shieldHp > 0 && this.state !== 'spawn'; }
  hitShield(amount, info) {
    // called by game when a shot hits the 'shield' sphere
    if (!this.shieldActive()) return false;
    if (info.weapon === 'rail') { this.shieldHp -= 999; }
    else this.shieldHp -= amount * (info.weapon === 'blades' || info.weapon === 'hammer' ? 2 : 1);
    this.shieldMat.emissiveIntensity = 4;
    this.game.fx.sparks(info.point, 6, info.dir ? info.dir.clone().negate() : null, 6, FXColors.cyan, FXColors.cyanEnd);
    this.game.audio.play('zap', { pos: info.point });
    if (this.shieldHp <= 0) this.breakShield();
    return info.weapon !== 'rail';
  }
  breakShield() {
    this.shieldDown = 6;
    this.shield.visible = false;
    this.game.fx.burst(this.shield.getWorldPosition(_v), 40, FXColors.cyan, FXColors.cyanEnd, 8, 0.35, 0.6);
    this.game.audio.play('glassShatter', { pos: this.pos });
    this.stagger = 0.8;
    this.game.emit('shieldBroken', this);
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.attackCool -= dt;
    if (this.shieldDown > 0) {
      this.shieldDown -= dt;
      if (this.shieldDown <= 0) { this.shieldHp = this.shieldMax; this.shield.visible = true; }
    }
    this.shieldMat.emissiveIntensity = damp(this.shieldMat.emissiveIntensity, 1.4 + (1 - this.shieldHp / this.shieldMax) * 1.5, 6, dt);
    this.shieldMat.opacity = 0.4 + 0.2 * Math.sin(performance.now() * 0.006);
    if (this.state !== 'spawn' && !this.grabbed && this.stagger <= 0 && this.stunned <= 0) {
      this.seen = true;
      // keep medium distance; advance slowly behind shield
      const dist = this.distToPlayer;
      const d = this.pathDir(_v);
      let sp = dist > 9 ? this.speed : dist < 5 ? -this.speed * 0.6 : 0;
      if (!this.hasLOS) sp = this.speed;
      this.steer(d, sp * (G.enemySpeedMult || 1), dt, 12);
      this.faceToward(pl.pos.x, pl.pos.z, dt, 4);
      if (this.attackCool <= 0 && this.hasLOS && dist < 26) {
        this.burst = 3; this.burstT = 0; this.attackCool = rand(2.5, 3.5);
        G.audio.play('alert', { pos: this.pos });
      }
      if (dist < 2.6 && this.attackCool < 1.5 && !this.bashT) { this.bashT = 0.5; G.audio.play('windup', { pos: this.pos }); }
    } else { this.vel.x *= 0.85; this.vel.z *= 0.85; }
    if (this.bashT) {
      this.bashT -= dt;
      if (this.bashT <= 0) {
        this.bashT = 0; this.attackCool = 2;
        if (this.distToPlayer < 3) { const f = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); pl.damage(16, { from: this.pos, knock: f.multiplyScalar(16).setY(6), type: 'bash' }); G.audio.play('punch', { pos: this.pos }); }
      }
    }
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burst--; this.burstT = 0.22;
        const from = this.gun.getWorldPosition(new THREE.Vector3());
        const dir = _v2.copy(pl.pos).setY(pl.pos.y + 1.1).sub(from).normalize();
        dir.x += rand(-0.04, 0.04); dir.y += rand(-0.02, 0.02); dir.z += rand(-0.04, 0.04);
        G.spawnProjectile({ pos: from, vel: dir.normalize().multiplyScalar(26), damage: 6, color: 0x38e8ff, radius: 0.16, owner: this });
        G.audio.play('enemyShot', { pos: from });
      }
    }
    this.physicsStep(dt);
    this.separate(dt);
    this.syncRoot();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * sp * 1.4;
    for (const L of this.legs) { const ph = this.phase + (L.s > 0 ? Math.PI : 0); L.hip.rotation.x = -Math.sin(ph) * 0.5 * clamp(sp / 3, 0, 1); L.knee.rotation.x = Math.max(0, Math.sin(ph + 1)) * 0.6 * clamp(sp / 3, 0, 1); }
    this.shieldArm.rotation.y = damp(this.shieldArm.rotation.y, this.bashT ? -0.6 : 0, 10, dt);
    this.gunArm.rotation.x = damp(this.gunArm.rotation.x, this.burst > 0 ? -1.4 : -0.3, 10, dt);
    this.body.position.y = 1.05 - (this.spawnT > 0 ? this.spawnT * 0.5 : 0);
  }
}

// ===================================================================== STALKER (agile assassin)
export class Stalker extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'stalker', name: 'STALKER', hp: 55, radius: 0.4, height: 2.1, speed: 10.5, score: 220, ...o });
    const M = this.M = baseMats('#121216', '#7a3cff', '#c08bff');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    for (const m of [M.paint, M.accent, M.dark, M.steel]) { m.transparent = true; }
    const r = this.root;
    this.body = joint(r, 0, 1.15, 0);
    mk(this.body, rbox(0.38, 0.6, 0.26, 0.1), M.paint, 0, 0.3, 0);
    mk(this.body, rbox(0.42, 0.1, 0.3, 0.03), M.accent, 0, 0.55, 0);
    this.head = joint(this.body, 0, 0.75, 0.06);
    mk(this.head, new THREE.ConeGeometry(0.16, 0.42, 4), M.paint, 0, 0.05, 0.1, Math.PI / 2, Math.PI / 4, 0);
    mk(this.head, rbox(0.22, 0.04, 0.04, 0.01), M.eye, 0, 0.04, 0.2);
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = joint(this.body, 0.26 * s, 0.5, 0);
      mk(sh, rbox(0.08, 0.5, 0.08, 0.03), M.dark, 0, -0.25, 0);
      const el = joint(sh, 0, -0.5, 0);
      mk(el, rbox(0.07, 0.45, 0.07, 0.03), M.paint, 0, -0.2, 0);
      mk(el, rbox(0.02, 0.85, 0.08, 0.01), M.eye, 0, -0.7, 0.05);
      this.arms.push({ sh, el });
      this.breakParts.push(sh);
    }
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = joint(r, 0.13 * s, 1.15, 0);
      mk(hip, rbox(0.1, 0.6, 0.1, 0.03), M.dark, 0, -0.28, 0);
      const knee = joint(hip, 0, -0.56, 0);
      mk(knee, rbox(0.08, 0.58, 0.08, 0.03), M.paint, 0, -0.28, 0);
      this.legs.push({ hip, knee, s });
      this.breakParts.push(hip);
    }
    this.breakParts.push(this.head);
    this.addHit(this.body, new THREE.Vector3(0, 0.3, 0), 0.32, 1, 'body');
    this.addHit(this.head, new THREE.Vector3(0, 0.05, 0.1), 0.17, 2.4, 'head');
    this.addHit(this.root, new THREE.Vector3(0, 0.6, 0), 0.22, 0.9, 'legs');
    this.cloak = 1;
    this.dodgeCool = 0;
    this.deathScale = 0.6;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.attackCool -= dt; this.dodgeCool -= dt;
    const dist = this.distToPlayer;
    let cloakTarget = 0.12;
    if (this.state === 'spawn') { }
    else if (this.stagger > 0 || this.grabbed || this.stunned > 0) { cloakTarget = 1; this.vel.x *= 0.9; this.vel.z *= 0.9; }
    else if (this.state === 'strike') {
      this.stateT += dt; cloakTarget = 1;
      if (this.stateT > 0.12 && !this.struck && dist < 2.4) { this.struck = true; pl.damage(18, { from: this.pos, type: 'melee', knock: _v.subVectors(pl.pos, this.pos).setY(0).normalize().multiplyScalar(8) }); }
      if (this.stateT > 0.4) { this.state = 'chase'; this.attackCool = rand(1, 1.8); this.struck = false; }
    } else {
      this.seen = true;
      const d = this.pathDir(_v);
      // circle in
      const side = _v2.set(-d.z, 0, d.x).multiplyScalar(dist > 4 ? 0.6 * Math.sin(this.phase * 0.5) : 0);
      d.add(side).normalize();
      this.steer(d, this.speed * (G.enemySpeedMult || 1), dt, 40);
      this.faceToward(pl.pos.x, pl.pos.z, dt, 10);
      if (dist < 3 && this.attackCool <= 0) { this.state = 'strike'; this.stateT = 0; const f = _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.vel.x = f.x * 15; this.vel.z = f.z * 15; G.audio.play('swing', { pos: this.pos }); }
      // dodge when aimed at
      if (G.player.aimEnemy === this && this.dodgeCool <= 0 && G.player.lastShotT < 0.3) {
        this.dodgeCool = 1.6;
        const s = Math.random() < 0.5 ? -1 : 1;
        this.vel.x += -d.z * 16 * s; this.vel.z += d.x * 16 * s; this.vel.y = 4;
        G.fx.burst(this.center(_v2), 10, FXColors.pink, FXColors.pinkEnd, 3, 0.3, 0.3);
        G.audio.play('dash', { pos: this.pos });
      }
    }
    if (this.spawnT > 0 || dist < 4) cloakTarget = 1;
    this.cloak = damp(this.cloak, cloakTarget, 4, dt);
    for (const m of [this.M.paint, this.M.accent, this.M.dark, this.M.steel]) m.opacity = this.cloak;
    this.physicsStep(dt);
    this.separate(dt);
    this.syncRoot();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * sp * 1.3;
    for (const L of this.legs) { const ph = this.phase + (L.s > 0 ? Math.PI : 0); L.hip.rotation.x = -Math.sin(ph) * 0.9 * clamp(sp / 6, 0, 1); L.knee.rotation.x = Math.max(0, Math.sin(ph + 1)) * 1.2 * clamp(sp / 6, 0, 1); }
    this.body.rotation.x = 0.35 * clamp(sp / 8, 0, 1);
    this.arms.forEach((a, i) => { a.sh.rotation.x = damp(a.sh.rotation.x, this.state === 'strike' ? -2.2 + this.stateT * 6 : 0.6, 14, dt); a.sh.rotation.z = (i ? -1 : 1) * 0.3; });
  }
}

// ===================================================================== THE BEAST (audience-summoned quadruped)
export class Beast extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'beast', name: 'THE BEAST', hp: 700, radius: 1.4, height: 2.4, speed: 9, heavy: true, score: 1500, ...o });
    const M = this.M = baseMats('#5a1020', '#ffb000', '#ff3000');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    this.armor = 0.6;
    const r = this.root;
    this.body = joint(r, 0, 1.9, 0);
    mk(this.body, rbox(1.5, 1.1, 3.0, 0.3), M.paint);
    for (let i = 0; i < 5; i++) mk(this.body, new THREE.ConeGeometry(0.16, 0.6, 5), M.accent, 0, 0.75, -1.1 + i * 0.5);
    this.vents = [];
    for (const s of [-1, 1]) { const v = mk(this.body, rbox(0.06, 0.5, 1.2, 0.02), M.eye, 0.76 * s, 0.1, -0.4); this.vents.push(v); }
    this.headJ = joint(this.body, 0, 0.2, 1.6);
    mk(this.headJ, rbox(1.0, 0.7, 1.0, 0.2), M.paint, 0, 0.1, 0.3);
    this.jaw = joint(this.headJ, 0, -0.2, 0.0);
    mk(this.jaw, rbox(0.9, 0.25, 1.0, 0.1), M.accent, 0, -0.1, 0.5);
    for (let i = 0; i < 6; i++) mk(this.jaw, new THREE.ConeGeometry(0.06, 0.2, 4), M.steel, -0.35 + i * 0.14, 0.08, 0.95);
    for (const s of [-1, 1]) mk(this.headJ, new THREE.SphereGeometry(0.11, 10, 8), M.eye, 0.3 * s, 0.25, 0.8);
    this.legs = [];
    for (const [x, z, ph] of [[0.7, 1.0, 0], [-0.7, 1.0, Math.PI], [0.7, -1.1, Math.PI], [-0.7, -1.1, 0]]) {
      const hip = joint(r, x, 1.8, z);
      mk(hip, rbox(0.4, 1.0, 0.4, 0.1), M.dark, 0, -0.45, 0);
      const knee = joint(hip, 0, -0.9, 0);
      mk(knee, rbox(0.32, 0.95, 0.32, 0.08), M.paint, 0, -0.42, 0);
      mk(knee, rbox(0.5, 0.15, 0.6, 0.05), M.accent, 0, -0.9, 0.1);
      this.legs.push({ hip, knee, ph });
      this.breakParts.push(hip);
    }
    this.breakParts.push(this.headJ);
    this.addHit(this.body, new THREE.Vector3(0, 0, 0), 1.3, 1, 'body');
    this.addHit(this.body, new THREE.Vector3(0, 0, -1.0), 1.0, 1, 'body');
    this.addHit(this.headJ, new THREE.Vector3(0, 0.1, 0.4), 0.6, 1.8, 'head');
    for (const s of [-1, 1]) this.addHit(this.body, new THREE.Vector3(0.76 * s, 0.1, -0.4), 0.35, 2.4, 'weak');
    this.deathScale = 2;
    this.attackCool = 2;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    this.attackCool -= dt;
    const dist = this.distToPlayer;
    if (this.state === 'spawn') { }
    else if (this.state === 'pounceWind') {
      this.stateT += dt;
      this.faceToward(pl.pos.x, pl.pos.z, dt, 8);
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      if (this.stateT > 0.6) {
        this.state = 'pounce'; this.stateT = 0;
        const t = 0.9;
        this.vel.set((pl.pos.x - this.pos.x) / t, (pl.pos.y - this.pos.y + 0.5 * 26 * t * t) / t, (pl.pos.z - this.pos.z) / t);
        this.grounded = false;
        G.audio.play('servo', { pos: this.pos });
      }
    } else if (this.state === 'pounce') {
      this.stateT += dt;
      if (this.stateT > 0.2 && this.grounded) {
        this.state = 'chase'; this.attackCool = rand(2, 3);
        G.audio.play('pressSlam', { pos: this.pos }); G.player.shake(0.5);
        G.fx.ring(_v.copy(this.pos).setY(this.pos.y + 0.1), 0.5, 7, 0.45, 0xff6030); G.fx.dust(this.pos, 18, 1.8);
        if (pl.pos.distanceTo(this.pos) < 6 && pl.grounded) pl.damage(26, { from: this.pos, knock: _v.subVectors(pl.pos, this.pos).setY(0).normalize().multiplyScalar(16).setY(8) });
        G.shockwave(this.pos, 6, 20, this);
      }
    } else {
      this.seen = true; this.state = 'chase';
      const d = this.pathDir(_v);
      this.steer(d, this.speed * (G.enemySpeedMult || 1), dt, 8);
      this.faceToward(this.pos.x + this.vel.x, this.pos.z + this.vel.z, dt, 3);
      if (dist < 3.5 && this.attackCool <= 0) {
        this.attackCool = 1.2; this.biteT = 0.35;
        G.audio.play('windup', { pos: this.pos });
      } else if (dist > 7 && dist < 22 && this.attackCool <= 0 && this.hasLOS) { this.state = 'pounceWind'; this.stateT = 0; G.audio.play('alert', { pos: this.pos }); }
    }
    if (this.biteT > 0) {
      this.biteT -= dt;
      if (this.biteT <= 0 && this.distToPlayer < 4) pl.damage(20, { from: this.pos, knock: _v.subVectors(pl.pos, this.pos).setY(0).normalize().multiplyScalar(12).setY(5) });
    }
    G.smashAround(this.pos, 2.2, this.vel, 10);
    this.physicsStep(dt);
    this.separate(dt);
    this.syncRoot();
    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.phase += dt * sp * 0.9;
    for (const L of this.legs) { const ph = this.phase + L.ph; L.hip.rotation.x = this.grounded ? -Math.sin(ph) * 0.6 * clamp(sp / 4, 0, 1) : -0.8; L.knee.rotation.x = this.grounded ? Math.max(0, Math.sin(ph + 1)) * 0.7 * clamp(sp / 4, 0, 1) : 0.9; }
    this.jaw.rotation.x = damp(this.jaw.rotation.x, this.biteT > 0 ? 0.6 : this.state === 'pounceWind' ? 0.8 : 0.1 + Math.sin(this.phase) * 0.05, 14, dt);
    this.body.position.y = 1.9 + Math.sin(this.phase * 2) * 0.06 - (this.spawnT > 0 ? this.spawnT : 0);
    for (const v of this.vents) v.material.emissiveIntensity = 2 + Math.sin(performance.now() * 0.01) * 1.5;
  }
}

// ===================================================================== PIRANHA-BOT (water)
export class Piranha extends Enemy {
  constructor(game, pos, o = {}) {
    super(game, pos, { type: 'piranha', name: 'PIRANHA-BOT', hp: 22, radius: 0.35, height: 0.5, speed: 8, flying: true, swimmer: true, score: 80, spawnTime: 0.3, ...o });
    const M = this.M = baseMats('#c0c8d0', '#ff2d6f', '#ffee00');
    this.flashMats.push(M.paint, M.accent);
    M.paint.emissive = new THREE.Color(0); M.accent.emissive = new THREE.Color(0);
    const b = this.body = joint(this.root, 0, 0.25, 0);
    mk(b, new THREE.SphereGeometry(0.32, 14, 10), M.paint).scale.set(0.8, 1, 1.3);
    this.jaw = joint(b, 0, -0.05, 0.3);
    mk(this.jaw, rbox(0.3, 0.1, 0.25, 0.03), M.accent, 0, -0.04, 0.08);
    for (let i = 0; i < 5; i++) mk(b, new THREE.ConeGeometry(0.03, 0.09, 4), M.steel, -0.12 + i * 0.06, -0.02, 0.4, Math.PI, 0, 0);
    for (const s of [-1, 1]) mk(b, new THREE.SphereGeometry(0.06, 8, 6), M.eye, 0.16 * s, 0.1, 0.25);
    this.tail = joint(b, 0, 0, -0.38);
    mk(this.tail, new THREE.ConeGeometry(0.2, 0.3, 4), M.accent, 0, 0, -0.1, -Math.PI / 2, 0, 0).scale.set(0.2, 1, 1);
    this.breakParts.push(this.tail, this.jaw);
    this.addHit(b, new THREE.Vector3(), 0.38, 1.2, 'body');
    this.deathScale = 0.35;
  }
  update(dt) {
    const G = this.game, pl = G.player;
    this.common(dt);
    const wl = G.waterLevelAt(this.pos.x, this.pos.z);
    const inWater = this.pos.y < wl - 0.2;
    this.attackCool -= dt;
    if (!inWater) {
      // flop!
      this.vel.y -= 26 * dt;
      this.flying = false;
      this.physicsStep(dt);
      this.flying = true;
      if (this.grounded && Math.random() < dt * 3) { this.vel.set(rand(-2, 2), rand(3, 6), rand(-2, 2)); }
      if (this.grounded) { this._out = (this._out || 0) + dt; if (this._out > 4) this.takeDamage(999, { type: 'air', env: true }); }
    } else {
      this._out = 0;
      const tgt = _v.copy(pl.pos).setY(Math.min(pl.pos.y + 0.8, wl - 0.4));
      const to = tgt.sub(this.pos);
      const d = to.length();
      to.normalize().multiplyScalar(this.speed * (d < 2 ? 1.4 : 1));
      to.x += Math.sin(this.phase * 3) * 2;
      this.vel.lerp(to, 1 - Math.exp(-2.5 * dt));
      this.pos.addScaledVector(this.vel, dt).addScaledVector(this.knock, dt);
      this.knock.multiplyScalar(Math.exp(-3 * dt));
      if (this.pos.y > wl - 0.3) this.pos.y = wl - 0.3;
      _v.copy(this.pos);
      if (G.physics.collideSphere(_v, this.radius, (c) => c.tag !== 'trigger')) this.pos.copy(_v);
      if (d < 1.3 && this.attackCool <= 0) { this.attackCool = 0.9; pl.damage(7, { from: this.pos, type: 'bite' }); G.audio.play('robotHit', { pos: this.pos }); this.biteT = 0.2; }
    }
    this.phase += dt * 5;
    if (this.vel.lengthSq() > 0.1) this.yaw = Math.atan2(this.vel.x, this.vel.z);
    this.syncRoot();
    this.tail.rotation.y = Math.sin(this.phase * 3) * 0.6;
    this.jaw.rotation.x = this.biteT > 0 ? 0.6 : 0.15 + Math.sin(this.phase) * 0.1;
    if (this.biteT > 0) this.biteT -= dt;
  }
}

export const ENEMY_TYPES = { clanker: Clanker, drone: Drone, bruiser: Bruiser, shield: ShieldBot, stalker: Stalker, beast: Beast, piranha: Piranha };
