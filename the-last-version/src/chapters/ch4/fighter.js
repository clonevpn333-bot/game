// Chapter 4 melee core: fighters (player, soldiers, the King), hit resolution with blocking,
// parrying, dodging and posture, sword trails, and enemy brains that take turns attacking.
import * as THREE from 'three';
import { Animator } from '../../characters/ml/anim.js';
import { buildKnight, arm } from './knights.js';
import { installLayer, ATTACKS } from './moves.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const PARRY_WINDOW = 0.2;

// ---------------------------------------------------------------- sword trail
const TRAIL_N = 14;
export class Trail {
  constructor(scene, color = [1, 0.85, 0.6]) {
    this.pts = []; // {b, t, age}
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(TRAIL_N * 2 * 3); this.alpha = new Float32Array(TRAIL_N * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(this.alpha, 1));
    const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color(...color) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uC; varying float vA; void main(){ gl_FragColor = vec4(uC * vA, 1.0); }',
    });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; scene.add(this.mesh);
    this.g = g;
  }
  push(b, t) { this.pts.unshift({ b: b.clone(), t: t.clone(), age: 0 }); if (this.pts.length > TRAIL_N) this.pts.pop(); }
  update(dt, intensity = 1) {
    for (const p of this.pts) p.age += dt;
    while (this.pts.length && this.pts[this.pts.length - 1].age > 0.14) this.pts.pop();
    for (let i = 0; i < TRAIL_N; i++) {
      const p = this.pts[Math.min(i, this.pts.length - 1)];
      if (!p) { this.alpha[i * 2] = this.alpha[i * 2 + 1] = 0; continue; }
      this.pos.set([p.b.x, p.b.y, p.b.z, p.t.x, p.t.y, p.t.z], i * 6);
      const a = i < this.pts.length ? Math.max(0, 1 - p.age / 0.14) * (1 - i / TRAIL_N) * intensity : 0;
      this.alpha[i * 2] = a * 0.15; this.alpha[i * 2 + 1] = a * 0.85;
    }
    this.g.attributes.position.needsUpdate = true; this.g.attributes.aA.needsUpdate = true;
    this.mesh.visible = this.pts.length > 1;
  }
}

// ---------------------------------------------------------------- fighter
export class Fighter {
  /** o: { look, weapon, shield, team, hp, posture, type, speed, hyper, name } */
  constructor(scene, o) {
    Object.assign(this, { type: o.type || 'soldier', team: o.team || 'enemy', name: o.name || '' });
    this.char = buildKnight(o.look);
    const w = arm(this.char, o.weapon || 'sword', o.shield || null);
    this.weapon = w.weapon; this.shield = w.shield; this.weaponKind = o.weapon || 'sword';
    this.group = this.char.group; this.scale = this.group.scale.x;
    scene.add(this.group);
    this.anim = new Animator(this.char); this.anim.fidgetsOn = false;
    this.stance = this.weaponKind === 'sword' ? 'guard' : this.weaponKind === 'bow' ? null : 'guard2h';
    installLayer(this);
    this.pos = V3(); this.vel = V3(); this.yaw = 0; this.radius = 0.42 * this.scale;
    this.maxHp = o.hp ?? 60; this.hp = this.maxHp; this.maxPost = o.posture ?? 60; this.post = 0; this.postIdle = 0;
    this.state = 'idle'; this.stateT = 0; this.atk = null; this.act = null; this.queued = null;
    this.blocking = false; this.blockT = 9; this.iframes = 0; this.hyper = o.hyper || 0;
    this.wish = V3(); this.speedMax = o.speed ?? 3.2; this.face = null; this.turnRate = o.turnRate ?? 7;
    this.alive = true; this.brain = null; this.lockTarget = null;
    this.trail = new Trail(scene, o.trailColor || (this.team === 'enemy' ? [1, 0.45, 0.3] : [1, 0.85, 0.6]));
    this.hitFlash = 0; this.dodgeDir = V3();
    this.flinchable = o.flinchable ?? true;
  }

  get forward() { return V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get busy() { return this.state === 'attack' || this.state === 'dodge' || this.state === 'hit' || this.state === 'stagger' || this.state === 'broken' || this.state === 'dead' || this.state === 'act'; }
  place(x, z, yaw, ground) { this.pos.set(x, ground ? ground(x, z) : 0, z); this.yaw = yaw; this.vel.set(0, 0, 0); this.sync(); }

  /** Start (or queue) an attack. Returns true if it started. */
  attack(id) {
    const def = ATTACKS[id]; if (!def || !this.alive) return false;
    if (this.state === 'attack') {
      const d = this.atk.def, t = this.atk.t;
      if (t > d.windup + d.active * 0.5) { this.queued = id; return false; }
      return false;
    }
    if (this.busy) return false;
    this.atk = { def, id, t: 0, hit: new Set(), shook: false };
    this.state = 'attack'; this.stateT = 0; this.blocking = false; this.queued = null; this.act = null;
    this.onAttackStart?.(this.atk);
    return true;
  }
  /** Replace the running attack before it strikes (e.g. a held light becomes a charged heavy). */
  convert(id) { if (this.state !== 'attack') return; const def = ATTACKS[id]; this.atk = { def, id, t: Math.min(this.atk.t, def.windup * 0.3), hit: new Set(), shook: false }; }

  dodge(dir) {
    if (!this.alive || (this.busy && !(this.state === 'attack' && this.atk.t > this.atk.def.windup + this.atk.def.active))) return false;
    this.state = 'dodge'; this.stateT = 0; this.atk = null; this.blocking = false; this.queued = null;
    this.dodgeDir.copy(dir).setY(0).normalize(); this.iframes = 0.34;
    this.act = { pose: 'dodge', w: 1, lambda: 26 };
    return true;
  }
  setBlock(on) {
    if (on && !this.blocking && !this.busy) { this.blocking = true; this.blockT = 0; }
    if (!on) this.blocking = false;
  }
  react(kind, dur) { if (!this.alive) return; this.state = kind; this.stateT = 0; this.reactDur = dur; this.atk = null; this.blocking = false; this.queued = null; this.act = { pose: kind === 'hit' ? 'hit' : kind === 'broken' ? 'broken' : 'stagger', w: 1, lambda: kind === 'hit' ? 30 : 16 }; }
  die() { this.alive = false; this.state = 'dead'; this.atk = null; this.blocking = false; this.act = { pose: 'dead', w: 1, lambda: 10 }; this.deadT = 0; }

  /** ctx: { ground(x,z), boxes[], dt } */
  update(dt, ctx) {
    const a = this.anim;
    this.stateT += dt; this.blockT += dt; this.iframes = Math.max(0, this.iframes - dt); this.hitFlash = Math.max(0, this.hitFlash - dt);
    // posture slowly settles when not being pressed (faster when healthy)
    this.postIdle += dt;
    if (this.state !== 'broken' && this.postIdle > 1.3) this.post = Math.max(0, this.post - dt * this.maxPost * (0.08 + 0.14 * this.hp / this.maxHp));
    let want = V3(), maxSp = this.speedMax, accel = 14;
    switch (this.state) {
      case 'attack': {
        const at = this.atk, d = at.def; at.t += dt;
        // lunge: drive forward from late windup through the strike, but never through the target
        const t0 = d.windup * 0.65, t1 = d.windup + d.active;
        if (at.t > t0 && at.t < t1) {
          let k = 1;
          if (this.lockTarget?.alive) { const dd = this.lockTarget.pos.distanceTo(this.pos) - this.lockTarget.radius - this.radius; k = clamp((dd - 0.5) / 1.2, 0, 1); }
          want.copy(this.forward).multiplyScalar((d.lunge / (t1 - t0)) * k * this.scale); maxSp = 99; accel = 40;
        }
        if (d.leap && at.t < t1) this.leapY = Math.sin(clamp(at.t / t1, 0, 1) * Math.PI) * d.leap; else this.leapY = 0;
        // tracking: enemies turn toward their target only during the windup (so side-steps work)
        if (this.lockTarget && at.t < d.windup * (this.team === 'player' ? 1 : 0.75)) this.face = Math.atan2(this.lockTarget.pos.x - this.pos.x, this.lockTarget.pos.z - this.pos.z);
        else if (at.t >= d.windup && !d.spin) this.face = null;
        if (d.spin && at.t > d.windup && at.t < t1) this.yaw += dt * (Math.PI * 2 / d.active);
        if (this.queued && at.t > d.windup + d.active + d.recover * 0.3) { const q = this.queued; this.state = 'idle'; this.atk = null; this.queued = null; this.attack(q); break; }
        if (at.t > d.windup + d.active + d.recover) { this.state = 'idle'; this.atk = null; this.leapY = 0; }
        break;
      }
      case 'dodge': {
        const k = this.stateT / 0.42;
        want.copy(this.dodgeDir).multiplyScalar(9.5 * (1 - k) + 1); maxSp = 99; accel = 30;
        if (k >= 1) { this.state = 'idle'; this.act = null; }
        break;
      }
      case 'hit': case 'stagger': case 'broken': {
        accel = 6;
        if (this.stateT > this.reactDur) { this.state = 'idle'; this.act = null; if (this.post >= this.maxPost) this.post = this.maxPost * 0.45; }
        break;
      }
      case 'act': if (this.actDur !== undefined && this.stateT > this.actDur) { this.state = 'idle'; this.act = null; } accel = 8; break;
      case 'dead': {
        this.deadT += dt; accel = 4;
        break;
      }
      default: {
        want.copy(this.wish).multiplyScalar(this.blocking ? 0.45 : 1);
        if (this.blocking) this.act = { pose: 'block', w: 1, lambda: 24 }; else if (this.state === 'idle' && this.act?.pose === 'block') this.act = null;
      }
    }
    // integrate
    const tv = want.lengthSq() > 0 ? (this.state === 'idle' ? want.multiplyScalar(maxSp) : want) : want;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (tv.x - this.vel.x) * k; this.vel.z += (tv.z - this.vel.z) * k;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    if (ctx.boxes) for (const b of ctx.boxes) this.collideBox(b);
    if (ctx.bounds) { const B = ctx.bounds; this.pos.x = clamp(this.pos.x, B.minX, B.maxX); this.pos.z = clamp(this.pos.z, B.minZ, B.maxZ); }
    this.pos.y = (ctx.ground ? ctx.ground(this.pos.x, this.pos.z) : 0) + (this.leapY || 0);
    // facing
    if (this.face !== null && this.face !== undefined) {
      const d = wrap(this.face - this.yaw), rate = this.state === 'attack' ? this.turnRate * 1.4 : this.turnRate;
      this.yaw += clamp(d, -rate * dt, rate * dt);
    } else if (this.state === 'idle' && this.wish.lengthSq() > 0.01) {
      const d = wrap(Math.atan2(this.wish.x, this.wish.z) - this.yaw); this.yaw += clamp(d, -this.turnRate * dt, this.turnRate * dt);
    }
    // animation drive
    const sp = Math.hypot(this.vel.x, this.vel.z);
    a.speed = this.state === 'idle' ? sp : 0;
    a.moveAngle = sp > 0.1 ? wrap(Math.atan2(this.vel.x, this.vel.z) - this.yaw) : 0;
    a.sprint = sp > 4.8;
    this.sync();
    a.update(dt);
    // trail along the blade while it is live
    const live = this.state === 'attack' && this.atk.t > this.atk.def.windup - 0.04 && this.atk.t < this.atk.def.windup + this.atk.def.active + 0.06;
    if (live && this.weapon.length > 0) { const [b, t] = this.blade(); this.trail.push(b, t); }
    this.trail.update(dt, this.atk?.def.kind === 'red' ? 1.4 : 1);
    if (this.atk?.def.kind === 'red') this.trail.mat.uniforms.uC.value.setRGB(1.0, 0.25, 0.12); else this.trail.mat.uniforms.uC.value.setRGB(...(this.team === 'enemy' ? [1, 0.55, 0.35] : [1, 0.85, 0.6]));
  }

  /** World positions of the blade's base and tip. */
  blade() {
    const g = this.weapon.group; g.updateWorldMatrix(true, false);
    return [g.localToWorld(V3(0, 0, this.weapon.base)), g.localToWorld(V3(0, 0, this.weapon.length))];
  }
  sync() { this.group.position.copy(this.pos); this.group.rotation.set(0, this.yaw, 0); }
  collideBox(b) {
    const cx = clamp(this.pos.x, b.minX, b.maxX), cz = clamp(this.pos.z, b.minZ, b.maxZ);
    const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
    if (d >= this.radius) return;
    if (d < 1e-5) { this.pos.x = b.maxX + this.radius; return; }
    this.pos.x += (dx / d) * (this.radius - d); this.pos.z += (dz / d) * (this.radius - d);
    const vn = (this.vel.x * dx + this.vel.z * dz) / d; if (vn < 0) { this.vel.x -= (dx / d) * vn; this.vel.z -= (dz / d) * vn; }
  }
  dispose(scene) { scene.remove(this.group); scene.remove(this.trail.mesh); }
}

/** Keep fighters from standing inside each other. */
export function separate(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (!a.alive || !b.alive) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.radius + b.radius;
    if (d >= m || d < 1e-5) continue;
    const push = (m - d) / 2, nx = dx / d, nz = dz / d;
    const wa = a.type === 'king' ? 0.15 : b.type === 'king' ? 1.85 : 1, wb = 2 - wa;
    a.pos.x -= nx * push * wa; a.pos.z -= nz * push * wa; b.pos.x += nx * push * wb; b.pos.z += nz * push * wb;
  }
}

// ---------------------------------------------------------------- hit resolution
/**
 * Resolves live blades against opponents. `ev` receives gameplay events:
 *   ev(kind, { a, t, def, point, dir }) with kind in
 *   'dodged' | 'parry' | 'block' | 'guardbreak' | 'hit' | 'kill' | 'broken'
 */
export function resolveHits(list, ev) {
  for (const a of list) {
    if (!a.alive || a.state !== 'attack') continue;
    const at = a.atk, d = at.def;
    if (at.t < d.windup || at.t > d.windup + d.active) continue;
    if (d.shock && !at.shook) { at.shook = true; ev('shock', { a, def: d }); }
    for (const t of list) {
      if (t === a || !t.alive || t.team === a.team || at.hit.has(t)) continue;
      if (a.team !== 'player' && t.team !== 'player' && !(a.ambient || t.ambient)) continue; // background soldiers only spar
      const dx = t.pos.x - a.pos.x, dz = t.pos.z - a.pos.z, dist = Math.hypot(dx, dz);
      if (dist > d.reach * Math.max(1, a.scale * 0.92) + t.radius) continue;
      if (Math.abs((t.pos.y) - (a.pos.y - (a.leapY || 0))) > 1.6) continue;
      const ang = Math.abs(wrap(Math.atan2(dx, dz) - a.yaw));
      if (d.arc < Math.PI && ang > d.arc + Math.atan2(t.radius, Math.max(dist, 0.1))) continue;
      at.hit.add(t);
      applyHit(a, t, d, ev);
      if (a.state !== 'attack') break; // parried: the swing is over
    }
  }
}

function applyHit(a, t, d, ev) {
  const dir = V3(t.pos.x - a.pos.x, 0, t.pos.z - a.pos.z).normalize();
  const [bb, bt] = a.weapon.length > 0 ? a.blade() : [a.pos, a.pos];
  const point = t.pos.clone().add(V3(0, 1.25 * t.scale, 0)).addScaledVector(dir, -t.radius * 0.6);
  point.lerp(bt, 0.3);
  const info = { a, t, def: d, point, dir };
  if (t.iframes > 0) { ev('dodged', info); return; }
  const facing = Math.abs(wrap(Math.atan2(-dir.x, -dir.z) - t.yaw)) < 1.25;
  t.postIdle = 0;
  if (t.blocking && facing && d.kind !== 'red') {
    if (t.blockT < (t.parryWindow ?? PARRY_WINDOW) && d.kind !== 'bash') {
      // PARRY: the attacker's swing bounces off; their posture takes the blow
      a.post += d.post * (a.type === 'king' ? 1.35 : 2.2); a.postIdle = 0;
      t.post = Math.max(0, t.post - 8);
      if (a.post >= a.maxPost) { a.post = a.maxPost; a.react('broken', a.type === 'king' ? 3.0 : 2.6); ev('broken', { ...info, a: t, t: a }); }
      else a.react('stagger', a.type === 'king' ? 0.55 : 0.75);
      ev('parry', info);
      return;
    }
    if (d.kind === 'bash' || d.guardBreak) { t.post += d.post; t.react('stagger', 0.9); ev('guardbreak', info); t.vel.addScaledVector(dir, 4); return; }
    t.post += d.post * 0.55; t.vel.addScaledVector(dir, 2.5);
    // a soldier who has eaten two blows on the shield answers with a counter
    if (t.brain) { t.blocked = (t.blocked || 0) + 1; if (t.blocked >= 2) { t.blocked = 0; t.brain.counter = t.brain.p?.blockCounter || true; } }
    if (t.team === 'player') t.stamina = Math.max(0, (t.stamina ?? 100) - d.post * 0.6);
    if (t.post >= t.maxPost || (t.team === 'player' && t.stamina <= 0)) { t.post = Math.min(t.post, t.maxPost); t.react('stagger', 1.0); ev('guardbreak', info); return; }
    ev('block', info);
    return;
  }
  // a clean hit
  const mult = t.state === 'broken' ? 1.7 : 1;
  t.hp -= d.dmg * mult * (t.armorMul ?? 1);
  t.post += d.post * (t.state === 'broken' ? 0 : 1);
  t.hitFlash = 0.12;
  t.vel.addScaledVector(dir, d.heavyHit ? 4 : 2);
  if (t.hp <= 0) { t.hp = 0; t.die(); ev('kill', info); return; }
  if (t.post >= t.maxPost && t.state !== 'broken') { t.post = t.maxPost; t.react('broken', t.type === 'king' ? 3.0 : 2.4); ev('broken', { ...info, a, t }); ev('hit', info); return; }
  const interrupt = t.state !== 'attack' || !t.hyper || d.heavyHit && t.hyper < 2;
  // no stun-locking: after two flinches in quick succession a soldier powers through and answers
  const now = performance.now() / 1000;
  if (t.team !== 'player') { t.flinches = (now - (t.lastFlinch || 0) < 1.6 ? (t.flinches || 0) : 0); }
  const shrug = t.team !== 'player' && !d.heavyHit && t.flinches >= 2;
  if (t.flinchable && interrupt && t.state !== 'broken' && !shrug) { t.react(d.heavyHit ? 'stagger' : 'hit', d.heavyHit ? 0.6 : 0.32); t.flinches = (t.flinches || 0) + 1; t.lastFlinch = now; }
  else if (shrug && t.brain) { t.brain.counter = true; t.flinches = 0; t.hitFlash = 0.2; }
  ev('hit', info);
}

// ---------------------------------------------------------------- enemy brains
const PROFILES = {
  footman: { range: [2.2, 3.6], speed: 2.8, attacks: [['f1', 0.45], ['f1>f2', 0.35], ['fb', 0.2]], cool: [1.0, 2.0], block: 0.55, backstep: 0.1, counter: 'f2', blockCounter: 'fb' },
  spearman: { range: [3.0, 4.4], speed: 2.6, attacks: [['s1', 0.65], ['s2', 0.35]], cool: [1.2, 2.2], block: 0, backstep: 0.3, counter: 's1' },
  brute: { range: [2.0, 3.0], speed: 2.2, attacks: [['b1', 0.5], ['b2', 0.5]], cool: [1.4, 2.4], block: 0, backstep: 0, counter: 'b2' },
};

/** Grants attack turns so at most `max` enemies swing at the player at once. */
export class Director {
  constructor(max = 2) { this.max = max; this.holders = new Set(); }
  request(f) { for (const h of this.holders) if (!h.alive || (h.state !== 'attack' && !h.brain?.wantsTurn)) this.holders.delete(h); if (this.holders.has(f)) return true; if (this.holders.size < this.max) { this.holders.add(f); return true; } return false; }
  release(f) { this.holders.delete(f); }
}

export class Brain {
  constructor(f, kind) {
    this.f = f; this.kind = kind; this.p = PROFILES[kind];
    this.cool = 1 + Math.random() * 1.5; this.orbit = Math.random() < 0.5 ? 1 : -1; this.orbitT = 2;
    this.react = 0.18 + Math.random() * 0.15; this.blockHold = 0; this.wantsTurn = false; this.chain = null;
    f.speedMax = this.p.speed; f.turnRate = 5.5; f.parryWindow = 0.05; // soldiers block; deflecting is rare
  }
  think(dt, target, director, sense) {
    const f = this.f, p = this.p;
    if (!f.alive) { director?.release(f); return; }
    f.lockTarget = target;
    if (!target?.alive) { f.wish.set(0, 0, 0); f.face = null; return; }
    const to = V3(target.pos.x - f.pos.x, 0, target.pos.z - f.pos.z), dist = to.length(); to.normalize();
    f.face = Math.atan2(to.x, to.z);
    this.cool -= dt; this.orbitT -= dt; this.blockHold -= dt;
    if (this.orbitT < 0) { this.orbitT = 1.5 + Math.random() * 2.5; if (Math.random() < 0.4) this.orbit *= -1; }
    // finishing a combo
    if (f.state === 'idle' && this.chain) { const c = this.chain; this.chain = null; f.attack(c); return; }
    if (f.busy) { f.wish.set(0, 0, 0); if (f.state !== 'attack') director?.release(f); return; }
    // a counter after shrugging off a flurry: swing straight back, no turn-taking
    if (this.counter && !f.busy) { const id = typeof this.counter === 'string' ? this.counter : this.p.counter || this.p.attacks[0][0]; this.counter = false; this.chain = null; f.blocking = false; this.blockHold = 0; if (f.attack(id)) { this.cool = this.p.cool[0]; this.attacks = (this.attacks || 0) + 1; return; } }
    // reactions: once per swing they see coming, footmen decide whether to raise the shield
    if (target.state === 'attack' && target.atk !== this.seenAtk && dist < 3.8) {
      this.seenAtk = target.atk;
      const facing = Math.abs(wrap(Math.atan2(-to.x, -to.z) - f.yaw + Math.PI)) < 1.0;
      if (p.block && facing && Math.random() < p.block) this.blockHold = 0.55 + Math.random() * 0.4;
      else if (p.backstep && Math.random() < p.backstep * 1.5) { f.dodge(to.clone().negate()); return; }
    }
    f.setBlock(this.blockHold > 0);
    if (this.blockHold > 0) { f.wish.set(0, 0, 0); return; }
    if (p.backstep && dist < p.range[0] * 0.7 && Math.random() < p.backstep * dt * 3) { f.dodge(to.clone().negate()); return; }
    // movement: approach to range, then circle and feint in and out
    const [lo, hi] = p.range;
    const tangent = V3(-to.z, 0, to.x).multiplyScalar(this.orbit);
    this.wantsTurn = this.cool <= 0;
    const turn = this.wantsTurn && dist < hi + 2.5 && (director ? director.request(f) : true);
    if (turn) {
      // close in and swing
      if (dist > lo + 0.4) { f.wish.copy(to); f.speedMax = p.speed * 1.35; }
      else {
        f.wish.set(0, 0, 0);
        let pick = this.pickAttack(target);
        if (pick.includes('>')) { const [x, y] = pick.split('>'); this.chain = y; pick = x; }
        if (f.attack(pick)) { this.cool = p.cool[0] + Math.random() * (p.cool[1] - p.cool[0]); this.attacks = (this.attacks || 0) + 1; }
      }
      return;
    }
    f.speedMax = p.speed * 0.6;
    if (dist > hi + 0.5) f.wish.copy(to).add(tangent.multiplyScalar(0.3)).normalize();
    else if (dist < lo) f.wish.copy(to).negate().add(tangent.multiplyScalar(0.5)).normalize();
    else f.wish.copy(tangent).multiplyScalar(0.8);
    // spacing between allies of the same team
    if (sense) for (const o of sense) if (o !== f && o.alive && o.team === f.team) { const dx = f.pos.x - o.pos.x, dz = f.pos.z - o.pos.z, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) f.wish.add(V3(dx / d, 0, dz / d).multiplyScalar((2.2 - d) * 0.8)); }
  }
  pickAttack(target) {
    let opts = this.p.attacks;
    if (this.kind === 'footman' && !target.blocking) opts = opts.filter((o) => o[0] !== 'fb');
    const sum = opts.reduce((s, o) => s + o[1], 0); let r = Math.random() * sum;
    for (const [id, w] of opts) { r -= w; if (r <= 0) return id; }
    return opts[0][0];
  }
}

/**
 * The Fallen King: reads the player's distance and habits. Phase 2 (below half health) adds
 * the leaping slam and the spinning sweep, and chains faster.
 */
export class KingBrain {
  constructor(f) { this.f = f; this.cool = 2.2; this.phase = 1; this.chain = []; f.speedMax = 2.6; f.turnRate = 4.2; this.last = ''; this.circle = 1; }
  think(dt, target) {
    const f = this.f; if (!f.alive || !target?.alive) { f.wish.set(0, 0, 0); return; }
    f.lockTarget = target;
    const to = V3(target.pos.x - f.pos.x, 0, target.pos.z - f.pos.z), dist = to.length(); to.normalize();
    f.face = Math.atan2(to.x, to.z);
    if (this.phase === 1 && f.hp < f.maxHp * 0.5) { this.phase = 2; this.onPhase?.(); }
    this.cool -= dt;
    if (f.state === 'idle' && this.chain.length) { f.attack(this.chain.shift()); return; }
    if (f.busy) { f.wish.set(0, 0, 0); return; }
    const p2 = this.phase === 2;
    if (this.cool > 0) {
      // stalk: circle at mid range
      const tangent = V3(-to.z, 0, to.x).multiplyScalar(this.circle);
      if (Math.random() < dt * 0.3) this.circle *= -1;
      f.speedMax = 1.8;
      f.wish.copy(dist > 5 ? to : dist < 3.2 ? to.clone().negate().multiplyScalar(0.6).add(tangent) : tangent).normalize();
      return;
    }
    // choose
    let pick;
    if (dist > 7.5) pick = p2 && Math.random() < 0.5 ? ['kj'] : ['kt'];
    else if (dist > 4.6) pick = p2 && Math.random() < 0.35 ? ['kj'] : Math.random() < 0.6 ? ['kt'] : null;
    else {
      const r = Math.random();
      if (p2 && r < 0.22 && this.last !== 'ks') pick = ['ks'];
      else if (r < 0.62) pick = ['k1'];
      else if (r < 0.8) pick = ['kt'];
      else pick = p2 ? ['kj'] : ['k3'];
    }
    if (!pick) { f.speedMax = 2.8; f.wish.copy(to); return; }
    if (dist > 3.6 && pick[0].startsWith('k1')) { f.speedMax = 3.2; f.wish.copy(to); return; }
    f.wish.set(0, 0, 0);
    if (f.attack(pick[0])) { this.last = pick[0]; this.cool = p2 ? 0.9 + Math.random() * 1.0 : 1.6 + Math.random() * 1.4; }
  }
}
