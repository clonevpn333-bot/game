// Set-construction kit shared by all floors: solid geometry with colliders, hydraulic presses,
// spawn hatches, ceiling drone ports, moving platforms, crowd stands, screens, light rigs,
// confetti/pyro, and the elevator exit.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { Mat, lightConeMaterial, hologramMaterial } from '../engine/materials.js';
import { textTexture, hazardTexture } from '../engine/textures.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';

const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const rand = (a, b) => a + Math.random() * (b - a);

// Solid box with mesh + collider. rot = [rx, ry, rz]
export function solid(g, o) {
  const [w, h, d] = o.size;
  const geo = o.round ? new RoundedBoxGeometry(w, h, d, 2, Math.min(o.round, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)) : new THREE.BoxGeometry(w, h, d);
  if (o.uv) scaleUV(geo, w, h, d, o.uv);
  const mesh = new THREE.Mesh(geo, o.mat || Mat.panel());
  mesh.position.set(...o.pos);
  if (o.rot) mesh.rotation.set(...o.rot);
  mesh.castShadow = o.cast !== false;
  mesh.receiveShadow = true;
  (o.parent || g.scene).add(mesh);
  let c = null;
  if (o.collide !== false) {
    c = new Box({ pos: new THREE.Vector3(...o.pos), size: o.size, rot: o.rot, tag: o.tag, surface: o.surface, hazard: o.hazard, wallrun: o.wallrun, grapple: o.grapple });
    if (o.parent || o.dynamic) { c.attach(mesh, new THREE.Vector3()); }
    c.noSafe = o.noSafe;
    c.navIgnore = o.navIgnore;
    c.isCeiling = o.ceiling;
    if (o.conveyor) c.conveyor = o.conveyor;
    g.physics.add(c);
    mesh.userData.collider = c;
  }
  return { mesh, collider: c };
}
// Collider only (invisible)
export function wall(g, pos, size, o = {}) {
  const c = new Box({ pos: new THREE.Vector3(...pos), size, rot: o.rot, tag: o.tag, wallrun: o.wallrun, grapple: o.grapple });
  c.isCeiling = o.ceiling; c.navIgnore = o.navIgnore; c.blocksCamera = o.blocksCamera;
  return g.physics.add(c);
}
function scaleUV(geo, w, h, d, k) {
  const uv = geo.attributes.uv, n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const su = nx > 0.5 ? d : w, sv = ny > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * su / k, uv.getY(i) * sv / k);
  }
}

// ---------------------------------------------------------------- hydraulic press
export class Press {
  constructor(g, o) {
    this.g = g;
    this.o = o;
    const [w, h, d] = o.size;
    this.lowY = o.lowY; this.highY = o.highY;
    this.group = new THREE.Group();
    this.group.position.set(o.pos[0], o.highY + h / 2, o.pos[2]);
    g.scene.add(this.group);
    const head = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.15), o.mat || Mat.panel('#3a3f4a', 1));
    head.castShadow = true; head.receiveShadow = true;
    this.group.add(head);
    // hazard stripes along the bottom edge
    const stripeMat = Mat.hazard(Math.max(1, Math.round(w / 3)));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.35, d + 0.04), stripeMat);
    strip.position.y = -h / 2 + 0.18; this.group.add(strip);
    this.warnMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2020', emissiveIntensity: 0.2 });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.12, 0.12), this.warnMat);
    lamp.position.set(0, -h / 2 + 0.4, d / 2 + 0.07); this.group.add(lamp);
    const lamp2 = lamp.clone(); lamp2.position.z = -d / 2 - 0.07; this.group.add(lamp2);
    // piston rods
    const rodMat = Mat.metal('#c8ced6', 0.2, 1);
    const rodLen = 40;
    for (const [rx, rz] of (o.rods || [[0, 0]])) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(o.rodR || 0.5, o.rodR || 0.5, rodLen, 16), rodMat);
      rod.position.set(rx, h / 2 + rodLen / 2, rz); this.group.add(rod);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry((o.rodR || 0.5) * 1.6, (o.rodR || 0.5) * 1.6, 1.2, 16), Mat.metal('#2a2e36', 0.4, 0.9));
      sleeve.position.set(rx, h / 2 + 0.6, rz); this.group.add(sleeve);
    }
    if (o.sign) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.6, 4), 0.9), new THREE.MeshBasicMaterial({ map: textTexture(o.sign, { w: 512, h: 128, color: '#ffd400', bg: '#000' }) }));
      s.position.set(0, 0, d / 2 + 0.08); this.group.add(s);
      const s2 = s.clone(); s2.rotation.y = Math.PI; s2.position.z = -d / 2 - 0.08; this.group.add(s2);
    }
    this.h = h;
    this.collider = new Box({ size: o.size, tag: 'solid' });
    this.collider.attach(this.group, new THREE.Vector3());
    this.collider.crush = true;
    this.collider.wallrun = false;
    g.physics.add(this.collider);
    this.state = o.startState || 'up';
    this.t = o.offset || 0;
    this.cycle = { up: 1.6, warn: 0.6, down: 0.22, hold: 0.6, rise: 0.9, ...(o.cycle || {}) };
    this.active = o.active !== false;
    this.y = o.highY;
    this.footprint = { w, d };
    this.onSlam = o.onSlam;
  }
  bottom() { return this.group.position.y - this.h / 2; }
  setBottom(y) { this.group.position.y = y + this.h / 2; }
  trigger() { this.state = 'warn'; this.t = 0; }
  update(dt) {
    if (!this.active && this.state === 'up') return;
    const C = this.cycle;
    this.t += dt;
    const g = this.g;
    const center = this.group.position;
    if (this.state === 'up') {
      this.setBottom(this.highY);
      if (this.t > C.up && !this.o.manual) { this.state = 'warn'; this.t = 0; g.audio.play('hydraulic', { pos: center }); }
      this.warnMat.emissiveIntensity = 0.2;
    } else if (this.state === 'warn') {
      this.warnMat.emissiveIntensity = Math.sin(this.t * 40) > 0 ? 5 : 0.3;
      this.setBottom(this.highY - Math.sin(this.t * 50) * 0.04 - this.t * 0.3);
      if (Math.random() < 0.4) g.fx.dust(_v.set(center.x + rand(-1, 1) * this.footprint.w / 2, this.bottom(), center.z + rand(-1, 1) * this.footprint.d / 2), 1, 0.4);
      if (this.t > C.warn) { this.state = 'down'; this.t = 0; }
    } else if (this.state === 'down') {
      const k = Math.min(1, this.t / C.down);
      const from = this.highY - C.warn * 0.3;
      this.setBottom(from + (this.lowY - from) * k * k);
      if (k >= 1) { this.state = 'hold'; this.t = 0; this._slam(); }
    } else if (this.state === 'hold') {
      this.setBottom(this.lowY);
      if (this.t > C.hold) {
        if (this.o.fallThrough) { this.state = 'fall'; this.t = 0; this.collider.enabled = false; return; }
        if (this.o.oneShot) { this.state = 'done'; return; }
        this.state = 'rise'; this.t = 0; g.audio.play('hydraulic', { pos: center });
      }
    } else if (this.state === 'fall') {
      this.group.position.y -= dt * (6 + this.t * 10);
      if (this.group.position.y < -40) { this.state = 'done'; this.group.visible = false; }
    } else if (this.state === 'rise') {
      const k = Math.min(1, this.t / C.rise);
      this.setBottom(this.lowY + (this.highY - this.lowY) * (1 - Math.pow(1 - k, 2)));
      if (k >= 1) { this.state = 'up'; this.t = 0; }
    }
  }
  _slam() {
    const g = this.g, p = this.group.position;
    const bottom = this.bottom();
    g.audio.play('pressSlam', { pos: p });
    const d = g.player.pos.distanceTo(p);
    g.player.shake(Math.max(0, 0.7 - d / 40));
    const fw = this.footprint.w / 2, fd = this.footprint.d / 2;
    for (let i = 0; i < 6; i++) g.fx.dust(_v.set(p.x + rand(-fw, fw), bottom + 0.1, p.z + (Math.random() < 0.5 ? -fd : fd)), 3, 1.2);
    g.fx.sparks(_v.set(p.x, bottom + 0.1, p.z + fd), 12, null, 9);
    // crush enemies and props in the footprint
    const inside = (x, z, r = 0) => Math.abs(x - p.x) < fw + r && Math.abs(z - p.z) < fd + r;
    for (const e of g.enemies) {
      if (!e.alive || !inside(e.pos.x, e.pos.z, -0.1)) continue;
      if (e.pos.y + e.height > bottom + 0.05 && e.pos.y < bottom + this.h + 0.5 && e.pos.y > bottom - 3) e.takeDamage(9999, { type: 'crush', env: true, dir: new THREE.Vector3(0, -1, 0) });
    }
    for (const pr of g.props) if (pr.alive && inside(pr.body.pos.x, pr.body.pos.z) && pr.body.pos.y < bottom + 0.2 && pr.body.pos.y > bottom - 2.5) g.destroyProp(pr, { type: 'crush' });
    const pl = g.player;
    if (inside(pl.pos.x, pl.pos.z, -0.2) && pl.pos.y + (pl.mode === 'slide' || pl.crouch ? 1.04 : 1.8) > bottom + 0.05 && pl.pos.y < bottom + 0.3 && pl.pos.y > bottom - 3) { pl.damage(200, { type: 'crush' }); g.emit('crushed'); }
    if (this.onSlam) this.onSlam(this);
  }
}

// ---------------------------------------------------------------- spawn hatch (rises from floor)
export class Hatch {
  constructor(g, pos, o = {}) {
    this.g = g;
    this.pos = new THREE.Vector3(...pos);
    const s = o.size || 2.4;
    this.size = s;
    const grp = this.group = new THREE.Group();
    grp.position.copy(this.pos);
    g.scene.add(grp);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: '#000' }));
    pit.rotation.x = -Math.PI / 2; pit.position.y = 0.012; grp.add(pit);
    const glowMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: o.color || '#ff2d6f', emissiveIntensity: 2.5 });
    this.glowMat = glowMat;
    for (const [x, z, w, d] of [[0, s / 2, s + 0.2, 0.1], [0, -s / 2, s + 0.2, 0.1], [s / 2, 0, 0.1, s], [-s / 2, 0, 0.1, s]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), glowMat); b.position.set(x, 0.03, z); grp.add(b);
    }
    const dmat = Mat.hazard(1);
    this.doors = [];
    for (const sgn of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(s / 2, 0.08, s), dmat);
      d.position.set(sgn * s / 4, 0.04, 0); d.receiveShadow = true;
      grp.add(d);
      this.doors.push({ m: d, sgn });
    }
    this.openK = 0; this.target = 0;
    g.addHazard(this);
  }
  spawn(type, o = {}) {
    const g = this.g;
    this.target = 1;
    g.audio.play('spawnHatch', { pos: this.pos });
    g.fx.smokePuff(this.pos, 4, 1, 1.2);
    const e = g.spawnEnemy(type, this.pos.clone().setY(this.pos.y - 2.6), { ...o, silent: true });
    e.spawnT = 1.3;
    e.rise = { from: this.pos.y - (e.height + 0.4), to: this.pos.y, dur: 1.3 };
    e.pos.y = e.rise.from;
    g.later(2.2, () => { this.target = 0; });
    return e;
  }
  update(dt) {
    this.openK += (this.target - this.openK) * Math.min(1, dt * 6);
    for (const d of this.doors) d.m.position.x = d.sgn * (this.size / 4 + this.openK * this.size * 0.55);
    this.glowMat.emissiveIntensity = 1.5 + this.openK * 4 * (0.6 + 0.4 * Math.sin(performance.now() * 0.02));
  }
}

// Ceiling port: drones descend from the rig
export function dropDrone(g, pos, o = {}) {
  const e = g.spawnEnemy(o.type || 'drone', new THREE.Vector3(pos[0], pos[1], pos[2]), { ...o, silent: true });
  e.spawnT = 1.2;
  e.rise = { from: pos[1], to: pos[1] - (o.drop ?? 8), dur: 1.2 };
  g.fx.ring(new THREE.Vector3(pos[0], pos[1] - 0.5, pos[2]), 0.3, 2.5, 0.5, 0xff2d6f);
  g.audio.play('spawnHatch', { pos: new THREE.Vector3(...pos) });
  return e;
}

// ---------------------------------------------------------------- moving platform
export class Mover {
  constructor(g, o) {
    this.g = g;
    this.points = o.points.map((p) => new THREE.Vector3(...p));
    this.speed = o.speed || 3;
    this.wait = o.wait ?? 0.8;
    const { mesh, collider } = solid(g, { pos: o.points[0], size: o.size, mat: o.mat || Mat.panel('#2f3540', 1), dynamic: true, round: 0.08 });
    this.mesh = mesh; this.collider = collider;
    collider.wallrun = false;
    if (o.glow !== false) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(o.size[0] + 0.05, 0.08, o.size[2] + 0.05), new THREE.MeshStandardMaterial({ color: '#000', emissive: o.glowColor || '#25f4ff', emissiveIntensity: 3 }));
      edge.position.y = -o.size[1] / 2 + 0.05; mesh.add(edge);
    }
    this.i = 0; this.t = 0; this.waitT = this.wait; this.dir = 1;
    this.rotSpeed = o.rotSpeed || 0;
    this.active = o.active !== false;
    g.addHazard(this);
  }
  update(dt) {
    if (this.rotSpeed) this.mesh.rotation.y += this.rotSpeed * dt;
    if (!this.active || this.points.length < 2) return;
    if (this.waitT > 0) { this.waitT -= dt; return; }
    const a = this.points[this.i], b = this.points[this.i + this.dir];
    const len = a.distanceTo(b);
    this.t += dt * this.speed / len;
    const k = Math.min(1, this.t);
    const e = k * k * (3 - 2 * k);
    this.mesh.position.lerpVectors(a, b, e);
    if (k >= 1) {
      this.t = 0; this.i += this.dir; this.waitT = this.wait;
      if (this.i === this.points.length - 1 || this.i === 0) this.dir *= -1;
    }
  }
}

// ---------------------------------------------------------------- show dressing
export function screen(g, host, pos, size, rotY = 0, o = {}) {
  const grp = new THREE.Group();
  grp.position.set(...pos); grp.rotation.y = rotY;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(size + 0.6, size + 0.6, 0.5, 2, 0.15), Mat.panel('#16181e'));
  frame.position.z = -0.27;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: o.texture || host.texture, toneMapped: false }));
  grp.add(frame, s);
  const led = new THREE.Mesh(new THREE.BoxGeometry(size + 0.7, 0.12, 0.1), new THREE.MeshStandardMaterial({ color: '#000', emissive: o.color || '#ff2d6f', emissiveIntensity: 3 }));
  led.position.set(0, -(size + 0.6) / 2, 0.02); grp.add(led);
  (o.parent || g.scene).add(grp);
  return grp;
}
export function sign(g, text, pos, w, h, rotY = 0, o = {}) {
  const tex = textTexture(Array.isArray(text) ? text : [text], { w: o.tw || 1024, h: o.th || 256, color: o.color || '#ffffff', glow: o.glow || '#ff2d6f', bg: o.bg || 'rgba(0,0,0,0)', size: o.size });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: o.double ? THREE.DoubleSide : THREE.FrontSide }));
  m.position.set(...pos); m.rotation.y = rotY;
  if (o.rotX) m.rotation.x = o.rotX;
  (o.parent || g.scene).add(m);
  return m;
}
export function lightCone(g, pos, target, color, radius = 3, intensity = 0.35, parent) {
  const from = new THREE.Vector3(...pos), to = new THREE.Vector3(...target);
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(0.25, radius, len, 24, 1, true);
  geo.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(geo, lightConeMaterial(color, intensity));
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
  (parent || g.scene).add(m);
  return m;
}
// Moving stage spotlight: real SpotLight + volumetric cone, sweeps around a target area.
export class Spotlight {
  constructor(g, pos, color, o = {}) {
    this.g = g;
    this.base = new THREE.Vector3(...pos);
    this.light = new THREE.SpotLight(color, (o.intensity ?? 900) * 0.13, o.range ?? 70, o.angle ?? 0.22, 0.5, 1.5);
    this.light.position.copy(this.base);
    g.scene.add(this.light, this.light.target);
    g.dim(this.light, 0.85);
    const len = o.len ?? 30;
    const geo = new THREE.CylinderGeometry(0.3, Math.tan(o.angle ?? 0.22) * len, len, 20, 1, true);
    geo.translate(0, -len / 2, 0);
    this.cone = new THREE.Mesh(geo, lightConeMaterial(color, o.cone ?? 0.09));
    this.cone.position.copy(this.base);
    g.scene.add(this.cone);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2, 12), Mat.metal('#222', 0.4, 0.9));
    housing.position.copy(this.base); g.scene.add(housing);
    this.housing = housing;
    this.center = new THREE.Vector3(...(o.center || [0, 0, 0]));
    this.radius = o.radius ?? 14;
    this.speed = o.speed ?? 0.4;
    this.ph = o.phase ?? Math.random() * 10;
    this.follow = null;
    g.addHazard(this);
  }
  update(dt) {
    this.ph += dt * this.speed;
    const tgt = this.follow ? this.follow.clone() : _v.set(this.center.x + Math.cos(this.ph) * this.radius, this.center.y, this.center.z + Math.sin(this.ph * 1.3) * this.radius);
    this.light.target.position.copy(tgt);
    this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tgt.clone().sub(this.base).normalize());
    this.housing.quaternion.copy(this.cone.quaternion);
    this.cone.visible = this.light.intensity > 1;
  }
}

// Holographic crowd in tiers around an arc. Bobs with the hype meter.
export class Crowd {
  constructor(g, o) {
    this.g = g;
    const count = o.count || 600;
    const body = new THREE.CapsuleGeometry(0.28, 0.6, 3, 6);
    body.translate(0, 0.6, 0);
    const head = new THREE.SphereGeometry(0.22, 8, 6); head.translate(0, 1.3, 0);
    const merged = mergeGeos([body, head]);
    this.mesh = new THREE.InstancedMesh(merged, hologramMaterial(o.color || '#38e8ff', 0.7), count);
    this.mesh.frustumCulled = false;
    this.data = [];
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const tier = (Math.random() * (o.tiers || 4)) | 0;
      const a = o.a0 + Math.random() * (o.a1 - o.a0);
      const r = o.r0 + tier * (o.tierDepth || 2.2) + rand(-0.3, 0.3);
      const y = o.y0 + tier * (o.tierHeight || 1.6);
      const p = new THREE.Vector3(o.cx + Math.cos(a) * r, y, o.cz + Math.sin(a) * r);
      const s = rand(0.85, 1.15);
      this.data.push({ p, s, ph: Math.random() * 10, rot: Math.atan2(o.cx - p.x, o.cz - p.z), jump: rand(0.6, 1.4) });
      m.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.data[i].rot), new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, m);
    }
    g.scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.sv = new THREE.Vector3(); this.pv = new THREE.Vector3();
    this.t = 0;
    g.addHazard(this);
  }
  update(dt) {
    this.t += dt;
    this._skip = !this._skip;
    if (this._skip) return;
    const hype = this.g.hype;
    const amp = 0.05 + hype * hype * 0.5;
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const b = Math.max(0, Math.sin(this.t * (4 + d.jump * 3) + d.ph)) * amp * d.jump;
      this.pv.copy(d.p); this.pv.y += b;
      this.q.setFromAxisAngle(_v.set(0, 1, 0), d.rot + Math.sin(this.t * 2 + d.ph) * 0.2);
      this.sv.setScalar(d.s);
      this.m.compose(this.pv, this.q, this.sv);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
function mergeGeos(geos) {
  // tiny non-indexed merge (position + normal) to avoid an extra dependency
  const pos = [], nor = [];
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

export function confetti(g, pos, n = 120, power = 14) {
  const cols = [[2, 0.3, 0.8, 1], [2, 1.7, 0.1, 1], [0.2, 1.8, 2, 1], [0.4, 2, 0.6, 1], [2, 2, 2, 1]];
  for (let i = 0; i < n; i++) {
    const c = cols[i % cols.length];
    g.fx.glow.emit(pos[0], pos[1], pos[2], rand(-0.4, 0.4) * power, rand(0.6, 1.2) * power, rand(-0.4, 0.4) * power, rand(2.5, 4.5), rand(0.12, 0.2), 0.1, c, [c[0], c[1], c[2], 0], -5, 1.6);
  }
  g.audio.play('confetti', { pos: new THREE.Vector3(...pos) });
}
export function pyro(g, pos, h = 8) {
  for (let i = 0; i < 40; i++) g.fx.glow.emit(pos[0] + rand(-0.3, 0.3), pos[1], pos[2] + rand(-0.3, 0.3), rand(-0.8, 0.8), rand(h * 1.2, h * 1.8), rand(-0.8, 0.8), rand(0.5, 0.9), rand(0.8, 1.4), 0.2, FXColors.fire, FXColors.fireEnd, -4, 1);
  g.audio.play('fireJet', { pos: new THREE.Vector3(...pos) });
  g.fx.flashLight(new THREE.Vector3(pos[0], pos[1] + 3, pos[2]), 0xff8030, 60, 0.5, 18);
}
export function marquee(g, pos, w, rotY = 0, n = 16, color = '#ffd400') {
  const geo = new THREE.SphereGeometry(0.12, 8, 6);
  const mats = [new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: 3 }), new THREE.MeshStandardMaterial({ color: '#000', emissive: color, emissiveIntensity: 0.3 })];
  const grp = new THREE.Group();
  grp.position.set(...pos); grp.rotation.y = rotY;
  const bulbs = [];
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(geo, mats[i % 2]); b.position.x = -w / 2 + (i + 0.5) * w / n; grp.add(b); bulbs.push(b); }
  g.scene.add(grp);
  let t = 0;
  g.addHazard({ update(dt) { t += dt; if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) { const s = Math.floor(t * 6) % 2; bulbs.forEach((b, i) => { b.material = mats[(i + s) % 2]; }); } } });
  return grp;
}

// ---------------------------------------------------------------- elevator exit
export class Elevator {
  constructor(g, o) {
    this.g = g;
    const [x, y, z] = o.pos;
    const rot = o.rotY || 0;
    this.grp = new THREE.Group();
    this.grp.position.set(x, y, z); this.grp.rotation.y = rot;
    g.scene.add(this.grp);
    const W = 5, H = 4.4, D = 5;
    const wallM = Mat.panel('#3a3530', 1);
    const gold = Mat.metal('#c9a03a', 0.25, 1);
    const toWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(new THREE.Vector3(x, y, z));
    const add = (pos, size, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...pos); m.receiveShadow = true; this.grp.add(m);
      const wp = toWorld(...pos);
      g.physics.add(new Box({ pos: wp, size, rot: [0, rot, 0] }));
      return m;
    };
    add([0, -0.25, D / 2], [W + 1, 0.5, D + 0.4], Mat.grate(2)); // floor
    add([0, H + 0.25, D / 2], [W + 1, 0.5, D + 0.4], wallM); // roof
    add([-W / 2 - 0.25, H / 2, D / 2], [0.5, H, D + 0.4], wallM);
    add([W / 2 + 0.25, H / 2, D / 2], [0.5, H, D + 0.4], wallM);
    add([0, H / 2, D + 0.25], [W + 1, H, 0.5], wallM);
    // frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 2, H + 1.2, 0.6), gold); frame.position.set(0, H / 2, -0.3);
    const hole = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.7), new THREE.MeshBasicMaterial({ color: '#000' }));
    this.grp.add(frame);
    // light inside
    const light = new THREE.PointLight('#ffe8c0', 30, 10); light.position.set(0, H - 0.5, D / 2); this.grp.add(light);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.1, D - 1), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#fff4d0', emissiveIntensity: 2 }));
    strip.position.set(0, H - 0.05, D / 2); this.grp.add(strip);
    sign(g, 'EXIT ▲', [0, H + 0.5, -0.62], 3.2, 0.8, Math.PI, { parent: this.grp, glow: '#3dff9a', color: '#d8ffe8' });
    // doors
    this.doors = [];
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(W / 2, H, 0.2), gold);
      d.position.set(s * W / 4, H / 2, -0.05); this.grp.add(d);
      const c = new Box({ size: [W / 2, H, 0.2] }); c.attach(d, new THREE.Vector3());
      g.physics.add(c);
      this.doors.push({ d, s, c });
    }
    this.open = 0; this.target = o.open ? 1 : 0;
    this.trigger = toWorld(0, 1, D / 2 + 0.4);
    this.W = W;
    this.entered = false;
    this.onEnter = o.onEnter;
    g.addHazard(this);
  }
  setOpen(on) { if ((on ? 1 : 0) !== this.target) { this.target = on ? 1 : 0; this.g.audio.play('doors', { pos: this.trigger, slam: !on }); if (on) this.g.audio.play('elevatorDing'); } }
  update(dt) {
    this.open += (this.target - this.open) * Math.min(1, dt * (this.target ? 2.5 : 6));
    for (const d of this.doors) d.d.position.x = d.s * (this.W / 4 + this.open * this.W * 0.48);
    for (const d of this.doors) d.c.enabled = this.open < 0.6;
    const pl = this.g.player;
    if (!this.entered && this.open > 0.6 && pl.alive && pl.pos.distanceTo(this.trigger) < 2.2) {
      this.entered = true;
      if (this.onEnter) this.onEnter();
    }
  }
}

export function stageLights(g, o = {}) {
  g.scene.add(new THREE.HemisphereLight(o.sky || '#5a4a9a', o.ground || '#140c18', o.hemi ?? 0.9));
  const key = g.addKeyLight(o.key || '#fff2e0', o.keyI ?? 2.4, o.dir || [0.35, 1, 0.25], o.shadowRange || 40);
  return key;
}

// Giant animated LED wall ring (crowd displays, tickers) — the studio's "sky".
export class LedRing {
  constructor(g, o) {
    this.g = g;
    const c = this.canvas = document.createElement('canvas');
    c.width = 2048; c.height = 256;
    this.ctx = c.getContext('2d');
    this.tex = new THREE.CanvasTexture(c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.wrapS = THREE.RepeatWrapping;
    this.tex.repeat.set(-(o.repeat || 3), 1); // negative: seen from inside
    const geo = new THREE.CylinderGeometry(o.r, o.r, o.h, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, side: THREE.BackSide, toneMapped: false, color: new THREE.Color(o.tint || '#9a8aa8') });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(o.x || 0, o.y, o.z || 0);
    g.scene.add(this.mesh);
    this.words = o.words || ['FLOOR 99', 'VOTE NOW', 'THE AUDIENCE WANTS A SHOW', 'CONTESTANT 99', 'HALO LOVES YOU', 'RATINGS'];
    this.t = 0;
    this.draw();
    g.addHazard(this);
  }
  draw() {
    const x = this.ctx, W = 2048, H = 256, t = this.t;
    x.fillStyle = '#05030a'; x.fillRect(0, 0, W, H);
    // crowd silhouettes bobbing
    for (let i = 0; i < 160; i++) {
      const px = (i * 13.7) % W, ph = i * 1.3;
      const h = 40 + (i * 37 % 30) + Math.max(0, Math.sin(t * 6 + ph)) * 14 * (0.3 + this.g.hype);
      x.fillStyle = i % 3 ? '#1a1030' : '#22102a';
      x.beginPath(); x.arc(px, H - h, 9, 0, Math.PI * 2); x.fill();
      x.fillRect(px - 11, H - h + 8, 22, h);
      if (i % 7 === 0 && Math.sin(t * 5 + ph) > 0.6) { x.fillStyle = '#ffffff'; x.fillRect(px - 2, H - h - 26, 4, 18); }
    }
    // band + text
    const band = (y, col) => { x.fillStyle = col; x.fillRect(0, y, W, 6); };
    band(28, '#ff2d6f'); band(92, '#25f4ff');
    x.font = '52px Anton, Impact, sans-serif'; x.textBaseline = 'middle';
    let cx = -((t * 120) % 700);
    let k = 0;
    while (cx < W) { const w = this.words[k++ % this.words.length]; x.fillStyle = k % 2 ? '#ffd400' : '#ffffff'; x.fillText(w, cx, 62); cx += x.measureText(w).width + 90; x.fillStyle = '#ff2d6f'; x.fillText('★', cx - 60, 62); }
    // scanline grid
    x.fillStyle = 'rgba(0,0,0,0.35)';
    for (let yy = 0; yy < H; yy += 4) x.fillRect(0, yy, W, 1);
    this.tex.needsUpdate = true;
  }
  update(dt) {
    this.t += dt;
    this._d = (this._d || 0) - dt;
    if (this._d <= 0) { this._d = 1 / 15; this.draw(); }
  }
}

// LED barricade: metal block whose broad faces show a glowing branded panel
export function ledBlock(g, o) {
  if (!ledBlock.tex) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const x = c.getContext('2d');
    x.fillStyle = '#0c0712'; x.fillRect(0, 0, 512, 160);
    x.strokeStyle = '#ff2d6f'; x.lineWidth = 8; x.strokeRect(8, 8, 496, 144);
    x.font = '110px Anton, Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = '#ff2d6f'; x.shadowBlur = 20; x.fillStyle = '#ffd400'; x.fillText('★ 99 ★', 256, 86);
    ledBlock.tex = new THREE.CanvasTexture(c); ledBlock.tex.colorSpace = THREE.SRGBColorSpace;
    ledBlock.face = new THREE.MeshStandardMaterial({ map: ledBlock.tex, emissive: '#ffffff', emissiveMap: ledBlock.tex, emissiveIntensity: 0.42, roughness: 0.4 });
  }
  const side = Mat.panel('#23202c');
  const mats = [side, side, Mat.metal('#3a3540', 0.4, 0.8), side, ledBlock.face, ledBlock.face];
  return mats;
}

// ---------------------------------------------------------------- industrial pipe runs
// pts: polyline [[x,y,z]...]; builds pipes, ball elbows, bolted flanges, optional valve wheels.
const PIPE = {};
function pipeMats() {
  if (PIPE.ready) return PIPE;
  PIPE.ready = true;
  PIPE.metal = Mat.panel('#4a4e58', 1);
  PIPE.dark = Mat.metal('#23262d', 0.45, 0.85);
  PIPE.bolt = Mat.metal('#b8bec6', 0.25, 1);
  PIPE.red = Mat.paint('#c8202a', 0.35, 0.45);
  PIPE.yellow = Mat.paint('#f2b21c', 0.4, 0.35);
  PIPE.copper = Mat.metal('#c07a3a', 0.3, 1);
  return PIPE;
}
export function pipeRun(g, pts, o = {}) {
  const M = pipeMats();
  const r = o.r || 0.45;
  const mat = o.mat || (o.copper ? M.copper : M.metal);
  const grp = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
    const d = b.clone().sub(a); const len = d.length(); d.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(up, d);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, true), mat);
    tube.position.copy(a).addScaledVector(d, len / 2); tube.quaternion.copy(q); grp.add(tube);
    // flanges with bolt rings every ~4m
    const n = Math.max(1, Math.floor(len / (o.flangeEvery || 4)));
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.32, r * 1.32, r * 0.42, 20), M.dark);
      fl.position.copy(a).addScaledVector(d, len * t); fl.quaternion.copy(q); grp.add(fl);
      for (let bI = 0; bI < 8; bI++) {
        const ang = bI / 8 * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.09, r * 0.09, r * 0.6, 6), M.bolt);
        bolt.position.set(Math.cos(ang) * r * 1.15, 0, Math.sin(ang) * r * 1.15).applyQuaternion(q).add(fl.position);
        bolt.quaternion.copy(q); grp.add(bolt);
      }
      if (o.stripes && k % 2) { const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, r * 0.5, 20, 1, true), o.stripes === 'yellow' ? M.yellow : M.red); st.position.copy(a).addScaledVector(d, len * (t + 0.5 / (n + 1)) ); st.quaternion.copy(q); grp.add(st); }
    }
    if (i > 0) { const el = new THREE.Mesh(new THREE.SphereGeometry(r * 1.18, 20, 14), M.dark); el.position.copy(a); grp.add(el); }
  }
  if (o.valve !== undefined) {
    const i = Math.min(o.valve, pts.length - 2);
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
    const mid = a.clone().lerp(b, 0.5); const d = b.clone().sub(a).normalize();
    const side = Math.abs(d.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, r * 1.6, 8), M.bolt);
    stem.position.copy(mid).addScaledVector(side, r * 1.1); stem.quaternion.setFromUnitVectors(up, side); grp.add(stem);
    const body = new THREE.Mesh(new THREE.BoxGeometry(r * 1.6, r * 1.6, r * 1.6), M.dark); body.position.copy(mid); body.quaternion.setFromUnitVectors(up, d); grp.add(body);
    const wheel = new THREE.Group(); wheel.position.copy(mid).addScaledVector(side, r * 1.9); wheel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), side); grp.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.2, r * 0.13, 10, 28), M.red));
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 2.3, r * 0.12, r * 0.12), M.red); sp.rotation.z = k * Math.PI / 4; wheel.add(sp); }
  }
  grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.scene.add(grp);
  if (o.collide) for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
    const mid = a.clone().lerp(b, 0.5), d = b.clone().sub(a); const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
    g.physics.add(new Box({ pos: mid, size: [len, r * 2, r * 2], quat: q }));
  }
  return grp;
}

// Glowing ember particles rising from hot surfaces
export function embers(g, area, rate = 20, color = [2, 0.8, 0.2, 1]) {
  g.addHazard({ update(dt) {
    const n = rate * dt + Math.random();
    for (let i = 0; i < n; i++) {
      const x = area.minX + Math.random() * (area.maxX - area.minX), z = area.minZ + Math.random() * (area.maxZ - area.minZ);
      g.fx.glow.emit(x, area.y, z, (Math.random() - 0.5) * 0.6, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 2, 0.06 + Math.random() * 0.06, 0.02, color, [color[0], color[1] * 0.3, 0, 0], 0.2, 0.3);
    }
  } });
}
