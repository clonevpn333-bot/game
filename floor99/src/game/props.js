// Physical props (explosive barrels, crates, debris furniture) and pickups.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { Body } from '../engine/physics.js';
import { hazardTexture, textTexture, armorTextures } from '../engine/textures.js';
import { FXColors } from '../engine/fx.js';

const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const _v = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

const PM = {};
function pm() {
  if (PM.ready) return PM;
  PM.ready = true;
  const A = armorTextures();
  PM.barrel = new THREE.MeshStandardMaterial({ color: '#c8202a', map: A.map, normalMap: A.normalMap, roughnessMap: A.roughnessMap, metalness: 0.5, roughness: 0.5 });
  const ht = hazardTexture('#f5b400', '#111');
  PM.barrelBand = new THREE.MeshStandardMaterial({ map: ht, metalness: 0.4, roughness: 0.5 });
  PM.barrelTop = new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.8, roughness: 0.4 });
  PM.glowRed = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff3a1a', emissiveIntensity: 2.5 });
  PM.crate = new THREE.MeshStandardMaterial({ ...woodTextures(), metalness: 0.0, roughness: 0.8 });
  PM.crateEdge = new THREE.MeshStandardMaterial({ color: '#2f3238', metalness: 0.8, roughness: 0.4 });
  const label = textTexture(['HALO', 'BRAND'], { w: 256, h: 256, color: '#ffd400', bg: 'rgba(0,0,0,0)', size: 70 });
  PM.crateLabel = new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.6 });
  PM.metalCrate = new THREE.MeshStandardMaterial({ color: '#3d5a80', metalness: 0.6, roughness: 0.4 });
  PM.health = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#38ff8a', emissiveIntensity: 3 });
  PM.ammo = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd400', emissiveIntensity: 3 });
  PM.gift = new THREE.MeshStandardMaterial({ color: '#ff2d6f', metalness: 0.3, roughness: 0.3, emissive: '#ff2d6f', emissiveIntensity: 0.4 });
  PM.giftRibbon = new THREE.MeshStandardMaterial({ color: '#ffd400', metalness: 0.6, roughness: 0.3, emissive: '#ffd400', emissiveIntensity: 0.6 });
  return PM;
}

export const PROP_GEOS = {};
function geos() {
  if (PROP_GEOS.ready) return PROP_GEOS;
  PROP_GEOS.ready = true;
  PROP_GEOS.barrel = new THREE.CylinderGeometry(0.4, 0.4, 1.1, 18);
  PROP_GEOS.band = new THREE.CylinderGeometry(0.41, 0.41, 0.22, 18, 1, true);
  PROP_GEOS.lid = new THREE.CylinderGeometry(0.36, 0.36, 0.04, 18);
  PROP_GEOS.crate = rbox(1, 1, 1, 0.04);
  PROP_GEOS.edge = new THREE.BoxGeometry(1.04, 0.1, 0.1);
  return PROP_GEOS;
}

export function makeProp(game, kind, pos, o = {}) {
  const M = pm(), G = geos();
  const mesh = new THREE.Group();
  let r = 0.5, mass = 1, hp = 40, explosive = false, box = false, density = 0.6, scale = o.scale || 1;
  if (kind === 'barrel') {
    const body = new THREE.Mesh(G.barrel, M.barrel); mesh.add(body);
    for (const y of [-0.3, 0.3]) { const b = new THREE.Mesh(G.band, M.barrelBand); b.position.y = y; mesh.add(b); }
    const lid = new THREE.Mesh(G.lid, M.barrelTop); lid.position.y = 0.56; mesh.add(lid);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.glowRed); cap.position.set(0.18, 0.58, 0); mesh.add(cap);
    r = 0.5; mass = 1.4; hp = 18; explosive = true; density = 0.5;
  } else if (kind === 'crate' || kind === 'crateBig') {
    const s = kind === 'crateBig' ? 1.6 : 1.0;
    const body = new THREE.Mesh(G.crate, M.crate); body.scale.setScalar(s); mesh.add(body);
    for (const [y, z, ry] of [[0.47, 0.47, 0], [-0.47, 0.47, 0], [0.47, -0.47, 0], [-0.47, -0.47, 0]]) {
      const e = new THREE.Mesh(G.edge, M.crateEdge); e.position.set(0, y * s, z * s); e.scale.set(s, 1, 1); mesh.add(e);
    }
    for (const sgn of [1, -1]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.7 * s, 0.7 * s), M.crateLabel); l.position.z = sgn * 0.505 * s; if (sgn < 0) l.rotation.y = Math.PI; mesh.add(l); }
    r = 0.55 * s; mass = 1 * s * s; hp = 30 * s; box = true; density = 0.45;
  } else if (kind === 'metalCrate') {
    const body = new THREE.Mesh(G.crate, M.metalCrate); body.scale.set(1.2, 0.9, 0.9); mesh.add(body);
    r = 0.55; mass = 2.5; hp = 120; box = true; density = 1.2;
  } else if (o.mesh) {
    mesh.add(o.mesh); r = o.r || 0.5; mass = o.mass || 1; hp = o.hp || 30; box = !!o.box; density = o.density ?? 0.6;
  }
  mesh.scale.multiplyScalar(scale);
  r *= scale;
  mesh.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  game.scene.add(mesh);
  const b = new Body({ r, mass, bounce: 0.2, friction: 0.9, mesh, box, density, kind: 'prop' });
  b.pos.copy(pos);
  mesh.position.copy(pos);
  if (o.rotY) mesh.rotation.y = o.rotY;
  const prop = { kind, body: b, mesh, hp, maxHp: hp, explosive, r, alive: true, onDestroy: o.onDestroy, noRespawn: o.noRespawn };
  b.owner = prop;
  b.onImpact = (body, speed, collider, other) => {
    if (speed > 9) game.audio.play(kind === 'barrel' ? 'clank' : 'impactSoft', { pos: body.pos, vol: Math.min(1, speed / 20) });
    if (prop.thrown && speed > 12) { game.damageProp(prop, 999, { type: 'impact' }); }
    else if (speed > 22) game.damageProp(prop, speed * 1.5, { type: 'impact' });
  };
  game.physics.addBody(b);
  game.props.push(prop);
  return prop;
}

// -------------------------------------------------------------- pickups
export class Pickup {
  constructor(game, kind, pos, o = {}) {
    this.game = game;
    this.kind = kind;
    this.pos = new THREE.Vector3().copy(pos);
    this.vel = new THREE.Vector3(o.vx ?? rand(-2, 2), o.vy ?? rand(4, 7), o.vz ?? rand(-2, 2));
    this.alive = true;
    this.t = 0;
    this.life = o.life ?? 25;
    this.data = o.data || {};
    this.onPick = o.onPick;
    this.big = o.big;
    const M = pm();
    const g = this.mesh = new THREE.Group();
    if (kind === 'health') {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.14), M.health);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), M.health);
      g.add(a, b);
    } else if (kind === 'ammo') {
      for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), M.ammo); s.position.x = (i - 1) * 0.12; g.add(s); }
    } else {
      // sponsor gift box
      const box = new THREE.Mesh(rbox(0.9, 0.9, 0.9, 0.06), M.gift);
      const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.16), M.giftRibbon);
      const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.94, 0.94), M.giftRibbon);
      g.add(box, r1, r2);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 6, 32), M.giftRibbon);
      halo.rotation.x = Math.PI / 2; halo.position.y = 0.8; g.add(halo);
      this.vel.set(0, 0, 0);
      this.life = Infinity;
      this.gift = true;
    }
    g.position.copy(this.pos);
    game.scene.add(g);
    this.r = this.gift ? 1.3 : 0.6;
  }
  update(dt) {
    const G = this.game;
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.remove(); return; }
    const pl = G.player;
    const to = _v.subVectors(pl.pos, this.pos).setY(pl.pos.y + 1 - this.pos.y);
    const d = to.length();
    if (!this.gift && d < 4.5 && pl.alive && this.t > 0.35 && this._wanted()) {
      this.vel.lerp(to.normalize().multiplyScalar(16), 1 - Math.exp(-8 * dt));
      this.pos.addScaledVector(this.vel, dt);
    } else if (!this.gift) {
      this.vel.y -= 20 * dt;
      this.pos.addScaledVector(this.vel, dt);
      _v.copy(this.pos);
      if (G.physics.collideSphere(_v, 0.25, (c) => c.tag !== 'trigger')) { this.pos.copy(_v); this.vel.multiplyScalar(0.3); this.vel.y = Math.abs(this.vel.y) * 0.3; }
    } else {
      // gift drifts down on a parachute of hype
      if (!this.landed) {
        this.pos.y -= dt * 3.5;
        _v.copy(this.pos);
        if (G.physics.collideSphere(_v, 0.5, (c) => c.tag !== 'trigger')) { this.pos.copy(_v); this.landed = true; G.audio.play('land', { pos: this.pos }); G.fx.dust(this.pos, 6, 0.8); }
      }
    }
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += this.gift ? 0.45 : 0.4 + Math.sin(this.t * 4) * 0.12;
    this.mesh.rotation.y += dt * 2.5;
    if (Math.random() < dt * 6) G.fx.trail(this.mesh.position, this.kind === 'health' ? FXColors.green : this.kind === 'ammo' ? [1.5, 1.2, 0.2, 1] : FXColors.pink, 0.2, 0.4);
    if (d < (this.gift ? 1.8 : 1.1) && pl.alive && this._wanted()) this.collect();
  }
  _wanted() {
    const pl = this.game.player;
    if (this.kind === 'health') return pl.hp < pl.maxHp;
    return true;
  }
  collect() {
    const G = this.game, pl = G.player;
    if (this.kind === 'health') { pl.heal(this.data.amount || 15); G.audio.play('heal'); }
    else if (this.kind === 'ammo') { pl.arsenal.refill(this.data.amount || 0.15); G.audio.play('pickup'); }
    else { G.audio.play('powerup'); G.fx.burst(this.pos, 40, FXColors.pink, FXColors.pinkEnd, 8, 0.4, 0.8); }
    if (this.onPick) this.onPick(this);
    G.emit('pickup', this.kind);
    this.remove();
  }
  remove() { this.alive = false; this.game.scene.remove(this.mesh); }
}

function woodTextures() {
  const S = 256, c = document.createElement('canvas'), h = document.createElement('canvas');
  c.width = c.height = h.width = h.height = S;
  const x = c.getContext('2d'), y = h.getContext('2d');
  y.fillStyle = '#808080'; y.fillRect(0, 0, S, S);
  const planks = 4, P = S / planks;
  for (let i = 0; i < planks; i++) {
    const base = 110 + Math.random() * 40;
    x.fillStyle = `rgb(${base + 40},${base * 0.62},${base * 0.32})`; x.fillRect(0, i * P, S, P);
    for (let k = 0; k < 40; k++) { // grain
      x.strokeStyle = `rgba(60,30,10,${0.08 + Math.random() * 0.15})`; x.lineWidth = 1 + Math.random() * 1.5;
      const yy = i * P + Math.random() * P; x.beginPath(); x.moveTo(0, yy);
      for (let xx = 0; xx <= S; xx += 32) x.lineTo(xx, yy + Math.sin(xx * 0.05 + k) * 2);
      x.stroke();
    }
    x.fillStyle = 'rgba(20,10,0,0.7)'; x.fillRect(0, i * P, S, 3);
    y.fillStyle = '#202020'; y.fillRect(0, i * P, S, 4);
    for (const nx of [14, S - 14]) { x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(nx, i * P + P / 2, 4, 0, 7); x.fill(); y.fillStyle = '#ffffff'; y.beginPath(); y.arc(nx, i * P + P / 2, 4, 0, 7); y.fill(); }
  }
  // edge frame
  x.strokeStyle = 'rgba(40,20,5,0.8)'; x.lineWidth = 14; x.strokeRect(0, 0, S, S);
  y.strokeStyle = '#e0e0e0'; y.lineWidth = 14; y.strokeRect(0, 0, S, S);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  // normal from height
  const src = y.getImageData(0, 0, S, S).data, n = document.createElement('canvas'); n.width = n.height = S;
  const nx2 = n.getContext('2d'), img = nx2.createImageData(S, S);
  const H = (i, j) => src[(((j + S) % S) * S + ((i + S) % S)) * 4] / 255;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (H(i + 1, j) - H(i - 1, j)) * 3, dy = (H(i, j + 1) - H(i, j - 1)) * 3, l = Math.hypot(dx, dy, 1), k = (j * S + i) * 4;
    img.data[k] = (-dx / l * 0.5 + 0.5) * 255; img.data[k + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  nx2.putImageData(img, 0, 0);
  return { map, normalMap: new THREE.CanvasTexture(n) };
}
