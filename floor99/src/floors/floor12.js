// FLOOR 12 — AQUARIUM APOCALYPSE
// Grand Gallery (giant tanks, fish, caustics) → glass tunnel (the shark passes overhead) →
// Main Tank Chamber → the audience votes to SHATTER THE GLASS (rigged) → the chamber floods,
// ground robots short-circuit, debris floats, piranha-bots swarm → climb the levels as the
// water rises → MEGAMOUTH-9, a mechanical shark that leaps at you → the chamber collapses →
// exit elevator on the top deck.
import * as THREE from 'three';
import { Mat } from '../engine/materials.js';
import { crackTexture, textTexture } from '../engine/textures.js';
import { Box } from '../engine/physics.js';
import { FXColors } from '../engine/fx.js';
import { EVENTS } from '../game/events.js';
import { Enemy } from '../game/enemies.js';
import { setStyle } from '../engine/stylize.js';
import { solid, wall, Hatch, dropDrone, screen, sign, Spotlight, lightCone, marquee, Elevator, stageLights } from './kit.js';
import { enhanceShark, updateBossDetail } from '../game/bossDetail.js';
import { shaderClock } from '../engine/materials.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const CH = { minX: -26, maxX: 26, minZ: 70, maxZ: 116 }; // main chamber
const TANK = { x: 0, z: 92, r: 9.5 };
const DECK_Y = 12, MEZZ_Y = 6, FLOOD_TOP = 10.4;

function causticMaterial(color = '#7fe8ff', strength = 0.5) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: shaderClock, uColor: { value: new THREE.Color(color) }, uStr: { value: strength } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime, uStr; uniform vec3 uColor; varying vec3 vW;
      float c(vec2 p){ float v=0.0; for(int i=0;i<3;i++){ float fi=float(i); p += vec2(sin(p.y*1.3+uTime*0.7+fi), cos(p.x*1.1-uTime*0.6+fi*1.7))*0.6; v += abs(sin(p.x+fi)+sin(p.y*1.2-fi)); } return v/3.0; }
      void main(){ float k = c(vW.xz*0.45); float a = pow(max(0.0, 1.0 - k*0.75), 4.0) * uStr; gl_FragColor = vec4(uColor*a, a); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
}

// --------------------------------------------------------------- schools of robotic fish
class FishSchool {
  constructor(g, o) {
    this.g = g; this.o = o;
    const body = new THREE.ConeGeometry(0.22, 0.9, 6); body.rotateX(Math.PI / 2);
    const tail = new THREE.ConeGeometry(0.2, 0.35, 3); tail.rotateX(-Math.PI / 2); tail.translate(0, 0, -0.55);
    const geo = mergeSimple([body, tail]);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.6, roughness: 0.3, emissive: o.glow || '#000000', emissiveIntensity: 0.6 }), o.n);
    const cols = o.colors || ['#ff8a3a', '#ffd400', '#3ae8ff', '#ff4fa0', '#c0c8d0'];
    this.f = [];
    for (let i = 0; i < o.n; i++) {
      this.mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
      this.f.push({ ph: Math.random() * 100, sp: rand(0.15, 0.4), r: rand(0.3, 1), h: rand(0, 1), s: rand(0.7, 1.4) * (o.scale || 1), lane: rand(-1, 1) });
    }
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler();
    g.scene.add(this.mesh);
    this.mesh.frustumCulled = false;
    g.addHazard(this);
  }
  update(dt) {
    const o = this.o;
    this._k = !this._k; if (this._k) return;
    for (let i = 0; i < this.f.length; i++) {
      const f = this.f[i];
      f.ph += dt * f.sp * 2;
      let x, y, z, yaw;
      if (o.ring) { // circle around a center
        const a = f.ph + f.lane * 3;
        const r = o.ring.r0 + f.r * (o.ring.r1 - o.ring.r0);
        x = o.ring.x + Math.cos(a) * r; z = o.ring.z + Math.sin(a) * r; y = o.y0 + f.h * (o.y1 - o.y0) + Math.sin(f.ph * 3) * 0.3;
        yaw = -a;
      } else { // swim back and forth along a box
        const L = o.box.maxZ - o.box.minZ;
        const t = (f.ph * 2) % (2 * L);
        const dir = t < L ? 1 : -1;
        z = o.box.minZ + (t < L ? t : 2 * L - t);
        x = o.box.minX + (f.r) * (o.box.maxX - o.box.minX) + Math.sin(f.ph * 2) * 0.5;
        y = o.y0 + f.h * (o.y1 - o.y0) + Math.sin(f.ph * 1.7) * 0.4;
        yaw = dir > 0 ? 0 : Math.PI;
      }
      this.e.set(0, yaw, Math.sin(f.ph * 9) * 0.15);
      this.q.setFromEuler(this.e);
      this.m.compose(_v.set(x, y, z), this.q, _v2.setScalar(f.s));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
function mergeSimple(geos) {
  const pos = [], nor = [];
  for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

// --------------------------------------------------------------- MEGAMOUTH-9 (boss)
class Shark extends Enemy {
  constructor(g, pos, o = {}) {
    super(g, pos, { type: 'shark', name: 'MEGAMOUTH-9', hp: 1150, radius: 1.8, height: 2.2, flying: true, swimmer: true, heavy: true, score: 6000, spawnTime: 0.5, ...o });
    const M = this.M = {
      paint: new THREE.MeshStandardMaterial({ color: '#5a6a7a', metalness: 0.7, roughness: 0.35 }),
      belly: new THREE.MeshStandardMaterial({ color: '#d8dde2', metalness: 0.5, roughness: 0.4 }),
      dark: Mat.metal('#1a1d22', 0.4, 0.9), steel: Mat.metal('#d0d6dc', 0.2, 1),
      eye: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2030', emissiveIntensity: 4 }),
      gill: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#25f4ff', emissiveIntensity: 3 }),
    };
    M.paint.emissive = new THREE.Color(0); this.flashMats.push(M.paint);
    this.armor = 0.45;
    const b = this.body = new THREE.Group(); this.root.add(b);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), M.paint); torso.scale.set(1, 0.95, 3.2); b.add(torso);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 12, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), M.belly); belly.scale.set(1, 0.95, 3.1); b.add(belly);
    for (let i = 0; i < 6; i++) { const plate = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 0.5), M.dark); plate.position.set(0, 1.35 - Math.abs(i - 2.5) * 0.05, -2 + i * 0.8); b.add(plate); }
    this.jaw = new THREE.Group(); this.jaw.position.set(0, -0.6, 3.2); b.add(this.jaw);
    const jawM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.4), M.belly); jawM.position.z = 0.6; this.jaw.add(jawM);
    for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 4), M.steel); t.position.set(-0.9 + i * 0.22, 0.4, 1.6); this.jaw.add(t); const t2 = t.clone(); t2.rotation.x = Math.PI; t2.position.set(-0.9 + i * 0.22, 0.25, 1.65); b.add(t2); t2.position.y = -0.3; t2.position.z = 4.75; }
    this.eyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), M.eye); e.position.set(s * 1.05, 0.35, 3.0); b.add(e); this.eyes.push(e); }
    this.gills = [];
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const gl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.12), M.gill); gl.position.set(s * 1.5, 0, 1.4 - k * 0.35); b.add(gl); this.gills.push(gl); }
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 4), M.paint); fin.scale.set(0.25, 1, 1); fin.position.set(0, 2.3, -0.3); fin.rotation.x = -0.35; b.add(fin);
    this.fin = fin;
    for (const s of [-1, 1]) { const pf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.0), M.paint); pf.position.set(s * 1.9, -0.7, 0.8); pf.rotation.z = s * -0.4; b.add(pf); }
    this.tail = new THREE.Group(); this.tail.position.z = -4.6; b.add(this.tail);
    const tb = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 8), M.paint); tb.rotation.x = -Math.PI / 2; tb.position.z = -0.8; this.tail.add(tb);
    const tf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 1.2), M.paint); tf.position.z = -2.0; tf.rotation.x = 0.3; this.tail.add(tf);
    const prop = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 16), M.gill); prop.position.z = -2.2; this.tail.add(prop);
    this.breakParts.push(this.tail, this.jaw, fin);
    this.addHit(b, V(0, 0, 0.5), 1.7, 1, 'body');
    this.addHit(b, V(0, 0, -2.4), 1.3, 1, 'body');
    this.addHit(b, V(1.5, 0, 1.0), 0.6, 2.4, 'weak');
    this.addHit(b, V(-1.5, 0, 1.0), 0.6, 2.4, 'weak');
    this.addHit(b, V(0, 0.4, 3.0), 0.8, 1.8, 'head');
    this.ang = 0; this.mode = 'circle'; this.mt = 0; this.attackT = 5;
    this.deathScale = 2.5;
    this.target = new THREE.Vector3();
    this.isBoss = true; this.bossName = 'MEGAMOUTH-9';
    this.chatHint = (mode) => (mode === 'windup' || mode === 'leap' ? 'MEGAMOUTH IS COMING UP' : 'blue gills. not the armor.');
    enhanceShark(this);
  }
  update(dt) {
    const G = this.game, pl = G.player, F = G.floor;
    this.common(dt);
    G.hud.boss('MEGAMOUTH-9', this.hp / this.maxHp);
    const wl = G.water ? G.water.level : 0;
    this.mt += dt; this.attackT -= dt;
    const prev = this.pos.clone();
    if (this.mode === 'circle') {
      this.ang += dt * 0.45;
      const r = 12 + Math.sin(this.ang * 0.7) * 3;
      const tx = Math.cos(this.ang) * r, tz = TANK.z + Math.sin(this.ang) * r * 0.85;
      const ty = wl - 1.2;
      this.pos.lerp(_v.set(tx, ty, tz), 1 - Math.exp(-1.5 * dt));
      if (pl.mode === 'swim' && pl.pos.distanceTo(this.pos) < 14 && this.attackT < 2) { this.mode = 'charge'; this.mt = 0; G.audio.play('alert', { pos: this.pos }); }
      else if (this.attackT <= 0) { this.mode = 'stalk'; this.mt = 0; }
    } else if (this.mode === 'stalk') {
      // approach the point under the player, fin cutting the surface
      const tgt = _v.set(pl.pos.x, wl - 1.0, pl.pos.z);
      tgt.x = THREE.MathUtils.clamp(tgt.x, CH.minX + 3, CH.maxX - 3); tgt.z = THREE.MathUtils.clamp(tgt.z, CH.minZ + 3, CH.maxZ - 3);
      const to = tgt.clone().sub(this.pos); to.y *= 0.5;
      const d = to.length();
      this.pos.addScaledVector(to.normalize(), Math.min(d, dt * 10));
      if (d < 9 || this.mt > 4) {
        this.mode = 'windup'; this.mt = 0;
        this.target.set(pl.pos.x, pl.pos.y, pl.pos.z);
        this.ring = this._ring(V(this.pos.x, wl + 0.05, this.pos.z));
        G.audio.play('waterBurst', { pos: this.pos, vol: 0.5 });
        G.hud.toast('INCOMING — MOVE!', 'warn');
      }
    } else if (this.mode === 'windup') {
      this.pos.y -= dt * 2;
      G.fx.bubbles(V(this.pos.x, wl - 0.5, this.pos.z), 4);
      if (Math.random() < 0.5) G.fx.splash(V(this.pos.x + rand(-1, 1), wl, this.pos.z + rand(-1, 1)), 3, 0.5);
      if (this.mt > 1.0) {
        this.mode = 'leap'; this.mt = 0;
        const T = 1.25;
        this.from = this.pos.clone();
        // leap through where the player WAS (dodgeable), slightly past
        const tgt = this.target.clone().add(_v.subVectors(this.target, this.pos).setY(0).normalize().multiplyScalar(3));
        this.leapV = new THREE.Vector3((tgt.x - this.pos.x) / T, 0, (tgt.z - this.pos.z) / T);
        this.leapV.y = (wl - 0.5 - this.pos.y + 0.5 * 22 * T * T) / T;
        this.bit = false;
        G.audio.play('splash', { pos: this.pos, power: 2 });
        G.fx.splash(V(this.pos.x, wl, this.pos.z), 50, 2);
      }
    } else if (this.mode === 'leap') {
      this.leapV.y -= 22 * dt;
      this.pos.addScaledVector(this.leapV, dt);
      this.jaw.rotation.x = 0.7;
      if (!this.bit && this.pos.distanceTo(_v.copy(pl.pos).setY(pl.pos.y + 1)) < 3.2) { this.bit = true; pl.damage(34, { from: this.pos, knock: this.leapV.clone().setY(6).multiplyScalar(0.6), type: 'bite' }); G.audio.play('robotHit', { pos: pl.pos }); }
      // smash floating platforms / deck props
      G.smashAround(this.pos, 3, this.leapV, 12);
      if (this.pos.y < wl - 1 && this.leapV.y < 0) {
        this.mode = 'circle'; this.mt = 0; this.attackT = rand(3.5, 5.5);
        G.audio.play('waterBurst', { pos: this.pos, vol: 0.8 });
        G.fx.splash(V(this.pos.x, wl, this.pos.z), 60, 2.2);
        G.fx.ring(V(this.pos.x, wl + 0.05, this.pos.z), 0.5, 7, 0.6, 0xbff4ff);
        pl.shake(0.4);
      }
    } else if (this.mode === 'charge') {
      const to = _v.copy(pl.pos).setY(pl.pos.y + 0.8).sub(this.pos);
      const d = to.length();
      this.pos.addScaledVector(to.normalize(), Math.min(d, dt * 14));
      if (d < 2.6) { pl.damage(26, { from: this.pos, type: 'bite', knock: to.multiplyScalar(10) }); G.audio.play('robotHit', { pos: pl.pos }); this.mode = 'circle'; this.attackT = 4; }
      if (this.mt > 3 || pl.mode !== 'swim') { this.mode = 'circle'; this.attackT = 3; }
    }
    // keep inside the chamber
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, CH.minX + 2, CH.maxX - 2);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, CH.minZ + 2, CH.maxZ - 2);
    if (this.mode !== 'leap' && this.pos.y > wl - 0.8) this.pos.y = wl - 0.8;
    // orientation from motion
    const vel = _v.subVectors(this.pos, prev);
    if (vel.lengthSq() > 1e-6) {
      const yaw = Math.atan2(vel.x, vel.z);
      let d = yaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 4);
      const pitch = Math.atan2(-vel.y, Math.hypot(vel.x, vel.z));
      this.body.rotation.x += (pitch - this.body.rotation.x) * Math.min(1, dt * 5);
    }
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.tail.rotation.y = Math.sin(G.time * 6) * 0.5;
    if (this.mode !== 'leap') this.jaw.rotation.x = 0.1 + Math.sin(G.time * 2) * 0.08;
    for (const gl of this.gills) gl.material.emissiveIntensity = 2 + Math.sin(G.time * 5) * 1;
    // fin wake at the surface
    if (this.pos.y > wl - 2.5 && this.mode !== 'leap' && Math.random() < 0.6) G.fx.splash(V(this.pos.x, wl, this.pos.z), 2, 0.4);
    updateBossDetail(this, dt);
  }
  _ring(pos) {
    const G = this.game;
    const m = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.2, 40), new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos); G.scene.add(m);
    G.later(1.4, () => G.scene.remove(m));
    return m;
  }
  die(info) {
    if (!this.alive) return;
    this.game.hud.boss(null);
    super.die(info);
  }
}

// ================================================================ BUILD
function build(g, { checkpoint }) {
  const F = {
    spawn: { pos: [0, 0.2, -3], yaw: 0 },
    checkpoints: { 1: { pos: [0, 0.2, 66], yaw: 0 }, 2: { pos: [-22, MEZZ_Y + 0.3, 80], yaw: 0 }, 3: { pos: [0, DECK_Y + 0.3, 110], yaw: Math.PI } },
    bounds: { minX: -26, maxX: 26, minZ: 0, maxZ: 116 },
    waterBounds: CH,
    groundY: 0, ceilingY: 22, killY: -12,
    nav: { minX: -26, maxX: 26, minZ: -2, maxZ: 116, cell: 1.5, minY: -0.5, maxY: 1.2, topY: 5 },
    spawnPoints: [[-10, 0, 20], [10, 0, 30], [-14, 0, 80], [14, 0, 84], [-16, 0, 104], [16, 0, 104]],
    beastSpawn: null,
    votePool: ['barrels', 'lightsout', 'lowgrav', 'freeze', 'doublebots', 'sharks', 'gravflip', 'meteors'],
    fogDensity: 0.016,
    floodable: false,
    events: {},
    spouts: [],
  };
  setStyle({ rim: '#7ae6ff', rimStrength: 0.75, sky: '#4ac0ff', ground: '#3a6a78' });
  g.scene.background = new THREE.Color('#021018');
  g.scene.fog = new THREE.FogExp2('#03202c', F.fogDensity);
  stageLights(g, { sky: '#4ac0e8', ground: '#02141c', hemi: 0.85, key: '#c8f0ff', keyI: 1.6, dir: [0.2, 1, -0.3] });
  const host = g.host;
  const tile = Mat.tile('#6f8f9a', '#34505a', 6, 8, 0.2);
  const darkTile = Mat.tile('#22343c', '#0e1a20', 4, 6, 0.3);
  const glass = Mat.glass('#9fe6ff', 0.14);
  const waterVol = new THREE.MeshStandardMaterial({ color: '#0a6a8a', transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0, depthWrite: false, emissive: '#04364a', emissiveIntensity: 0.6 });

  // ------------------------------------------------------------ GALLERY (z -6..40)
  solid(g, { pos: [0, -0.5, 17], size: [28, 1, 48], mat: tile, cast: false });
  solid(g, { pos: [0, 14.5, 17], size: [40, 1, 48], mat: Mat.panel('#14262e', 2), ceiling: true });
  solid(g, { pos: [0, 7, -6.5], size: [40, 14, 1], mat: Mat.panel('#1a2a32', 1) });
  for (const s of [-1, 1]) {
    // glass wall + tank volume behind
    solid(g, { pos: [s * 14, 7.25, 17], size: [0.3, 14.5, 46], mat: glass, surface: 'glass', cast: false });
    const vol = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 46), waterVol); vol.position.set(s * 18.2, 6, 17); g.scene.add(vol);
    solid(g, { pos: [s * 22.5, 7, 17], size: [1, 14, 48], mat: Mat.panel('#10202a', 1) });
    const sand = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 46), Mat.concrete('#c8b890', 4)); sand.position.set(s * 18.2, 0.3, 17); g.scene.add(sand);
    // coral & kelp
    for (let i = 0; i < 18; i++) {
      const c = new THREE.Mesh(i % 3 ? new THREE.ConeGeometry(rand(0.3, 0.8), rand(1, 3), 5) : new THREE.IcosahedronGeometry(rand(0.4, 1), 0), new THREE.MeshStandardMaterial({ color: ['#ff6a8a', '#ffb03a', '#a050ff', '#3ae8a0'][i % 4], roughness: 0.6, emissive: ['#ff2050', '#ff8000', '#7020ff', '#00ff80'][i % 4], emissiveIntensity: 0.25 }));
      c.position.set(s * rand(15.5, 21), rand(0.8, 1.6), rand(-4, 38)); g.scene.add(c);
    }
    for (let i = 0; i < 10; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.15, rand(4, 9), 0.5), new THREE.MeshStandardMaterial({ color: '#1f8a4a', roughness: 0.7, emissive: '#0a3a1a', emissiveIntensity: 0.4 })); k.position.set(s * rand(16, 21), 3, rand(-4, 38)); g.scene.add(k); g.addHazard({ ph: Math.random() * 6, update(dt) { this.ph += dt; k.rotation.z = Math.sin(this.ph) * 0.12; } }); }
    new FishSchool(g, { n: 40, box: { minX: s > 0 ? 15 : -21, maxX: s > 0 ? 21 : -15, minZ: -4, maxZ: 38 }, y0: 2, y1: 11 });
    for (let z = 2; z < 40; z += 9) lightCone(g, [s * 18, 12.4, z], [s * 18, 0, z + 2], '#7fe8ff', 3.5, 0.12);
  }
  // jellyfish (glowing)
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? 1 : -1;
    const j = new THREE.Group(); j.position.set(s * rand(16, 20), rand(4, 10), rand(0, 36)); g.scene.add(j);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#000', emissive: i % 3 ? '#ff6ad8' : '#7af0ff', emissiveIntensity: 1.6, transparent: true, opacity: 0.8 }));
    j.add(bell);
    for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 1.6, 4), bell.material); t.position.set(Math.cos(k) * 0.3, -0.8, Math.sin(k) * 0.3); j.add(t); }
    g.addHazard({ ph: Math.random() * 6, y0: j.position.y, update(dt) { this.ph += dt; j.position.y = this.y0 + Math.sin(this.ph * 0.8) * 0.8; bell.scale.y = 1 + Math.sin(this.ph * 3) * 0.2; } });
  }
  // gallery props: benches, kiosk, gift shop
  for (const z of [8, 20, 32]) { solid(g, { pos: [-6, 0.45, z], size: [1.2, 0.9, 4], mat: Mat.paint('#3a6a7a', 0.5, 0.3), round: 0.1 }); solid(g, { pos: [6, 0.45, z], size: [1.2, 0.9, 4], mat: Mat.paint('#3a6a7a', 0.5, 0.3), round: 0.1 }); }
  solid(g, { pos: [0, 1.2, 14], size: [3, 2.4, 1.2], mat: Mat.paint('#e8eef0', 0.3, 0.2), round: 0.15 });
  sign(g, ['WELCOME TO THE', 'HALO AQUARIUM'], [0, 10.5, -5.9], 16, 4, 0, { glow: '#3ae8ff', size: 110 });
  screen(g, host, [-9, 8, -5.9], 4.5, 0, { color: '#3ae8ff' });
  screen(g, host, [9, 8, -5.9], 4.5, 0, { color: '#3ae8ff' });
  const caust = causticMaterial('#7fe8ff', 0.9);
  const cfloor = new THREE.Mesh(new THREE.PlaneGeometry(28, 46), caust); cfloor.rotation.x = -Math.PI / 2; cfloor.position.set(0, 0.02, 17); g.scene.add(cfloor);
  for (const [x, z] of [[-9, 26], [9, 12], [-10, 36], [10, 38]]) g.addProp(Math.random() < 0.5 ? 'crate' : 'barrel', [x, 0.7, z]);
  for (const z of [6, 24]) { const l = new THREE.PointLight('#5ad8ff', 50, 30, 1.4); l.position.set(0, 12, z); g.scene.add(l); g.dim(l); }
  F.arrive = new Elevator(g, { pos: [0, 0, -6.4], rotY: Math.PI, open: false }); F.arrive.entered = true;

  // ------------------------------------------------------------ TUNNEL (z 40..70)
  solid(g, { pos: [0, -0.5, 55], size: [7, 1, 30], mat: darkTile, cast: false });
  const archG = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 30, 32, 1, true, Math.PI / 2, Math.PI), glass);
  archG.rotation.set(Math.PI / 2, 0, Math.PI / 2); archG.position.set(0, 0.0, 55);
  g.scene.add(archG);
  for (let z = 41; z < 70; z += 4) { const rib = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.12, 6, 24, Math.PI), Mat.metal('#8aa0aa', 0.3, 1)); rib.position.set(0, 0, z); g.scene.add(rib); }
  for (const s of [-1, 1]) { wall(g, [s * 3.8, 3, 55], [0.4, 6, 30], { wallrun: true }); }
  wall(g, [0, 4.4, 55], [7, 0.4, 30], { ceiling: true });
  const tunnelWater = new THREE.Mesh(new THREE.BoxGeometry(44, 22, 30), waterVol); tunnelWater.position.set(0, 7, 55); g.scene.add(tunnelWater);
  tunnelWater.material = waterVol.clone(); tunnelWater.material.side = THREE.BackSide; tunnelWater.material.opacity = 0.45;
  new FishSchool(g, { n: 70, box: { minX: -18, maxX: 18, minZ: 42, maxZ: 68 }, y0: -2, y1: 12, scale: 1.4 });
  const caust2 = new THREE.Mesh(new THREE.PlaneGeometry(7, 30), causticMaterial('#a0f0ff', 0.8)); caust2.rotation.x = -Math.PI / 2; caust2.position.set(0, 0.02, 55); g.scene.add(caust2);
  for (const s of [-1, 1]) solid(g, { pos: [s * 12, 7, 40.5], size: [17, 14, 1], mat: Mat.panel('#10202a', 1) });
  solid(g, { pos: [0, 10, 40.5], size: [7, 8, 1], mat: Mat.panel('#10202a', 1) });
  sign(g, ['▼ MAIN TANK ▼'], [0, 7, 40], 7, 1.6, Math.PI, { glow: '#3ae8ff' });
  // the shark "teaser" swims around the tunnel
  F.teaser = new THREE.Group(); g.scene.add(F.teaser);
  {
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshStandardMaterial({ color: '#4a5a6a', metalness: 0.7, roughness: 0.4 })); body.scale.set(1, 0.9, 3.2); F.teaser.add(body);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2030', emissiveIntensity: 4 })); e.position.set(s * 1.05, 0.3, 3); F.teaser.add(e); }
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 4), body.material); fin.scale.set(0.25, 1, 1); fin.position.set(0, 2.2, -0.3); F.teaser.add(fin);
  }
  F.teaserT = 0;

  // ------------------------------------------------------------ MAIN CHAMBER (z 70..116)
  solid(g, { pos: [0, -0.5, 93], size: [52, 1, 46], mat: darkTile, cast: false });
  solid(g, { pos: [0, 22.5, 93], size: [56, 1, 50], mat: Mat.panel('#0e1c24', 2), ceiling: true });
  for (const s of [-1, 1]) solid(g, { pos: [s * 26.5, 11, 93], size: [1, 22, 46], mat: Mat.panel('#10202a', 1), uv: 4 });
  for (const s of [-1, 1]) solid(g, { pos: [s * 15.25, 11, 69.5], size: [21.5, 22, 1], mat: Mat.panel('#10202a', 1) });
  solid(g, { pos: [0, 15, 69.5], size: [9, 14, 1], mat: Mat.panel('#10202a', 1) });
  // south wall with a doorway onto the top-deck exit elevator (x -3.5..3.5, y 12..17)
  solid(g, { pos: [-15.25, 11, 116.5], size: [23.5, 22, 1], mat: Mat.panel('#10202a', 1) });
  solid(g, { pos: [15.25, 11, 116.5], size: [23.5, 22, 1], mat: Mat.panel('#10202a', 1) });
  solid(g, { pos: [0, 6, 116.5], size: [7, 12, 1], mat: Mat.panel('#10202a', 1) });
  solid(g, { pos: [0, 19.5, 116.5], size: [7, 5, 1], mat: Mat.panel('#10202a', 1) });
  // blast door at the chamber entrance (closes during the flood)
  F.blast = solid(g, { pos: [0, 12, 70], size: [8.5, 8, 0.8], mat: Mat.hazard(3), dynamic: true });
  // mezzanines (y=6) on west/east, upper deck (y=12) south
  const mezzM = Mat.grate(4);
  for (const s of [-1, 1]) {
    solid(g, { pos: [s * 22.5, MEZZ_Y - 0.25, 91], size: [7, 0.5, 40], mat: mezzM });
    solid(g, { pos: [s * 19.2, MEZZ_Y + 0.6, 91], size: [0.2, 1.2, 40], mat: Mat.metal('#8aa0aa', 0.3, 1), wallrun: false });
    // ramp ground -> mezzanine (north end)
    solid(g, { pos: [s * 22.5, MEZZ_Y / 2 - 0.1, 76.2], size: [4, 0.4, 12.6], rot: [-0.5, 0, 0], mat: Mat.grate(1) });
    // ramp mezzanine -> deck (south end)
    solid(g, { pos: [s * 22.5, (MEZZ_Y + DECK_Y) / 2 - 0.1, 100.4], size: [4, 0.4, 12.6], rot: [-0.5, 0, 0], mat: Mat.grate(1) });
  }
  solid(g, { pos: [0, DECK_Y - 0.25, 111], size: [52, 0.5, 10], mat: mezzM });
  solid(g, { pos: [0, DECK_Y + 0.6, 106.1], size: [36, 1.2, 0.2], mat: Mat.metal('#8aa0aa', 0.3, 1), wallrun: false });
  for (const [x, z] of [[-19, 72], [19, 72], [-19, 110], [19, 110], [-10, 106], [10, 106]]) solid(g, { pos: [x, (x === -10 || x === 10) ? DECK_Y / 2 : MEZZ_Y / 2, z], size: [0.7, (x === -10 || x === 10) ? DECK_Y : MEZZ_Y, 0.7], mat: Mat.metal('#5a7080', 0.4, 0.9) });
  // ceiling rail grapple points over the chamber
  for (const [x, z] of [[-12, 82], [12, 82], [-8, 98], [8, 98], [0, 88], [-16, 94], [16, 94]]) g.addGrapplePoint(V(x, 18.5, z));
  // the giant tank: octagonal glass walls with colliders
  F.tankGlass = [];
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const x = TANK.x + Math.sin(a) * TANK.r, z = TANK.z + Math.cos(a) * TANK.r;
    const w = 2 * TANK.r * Math.tan(Math.PI / 8) + 0.1;
    const { mesh, collider } = solid(g, { pos: [x, 9, z], size: [w, 18, 0.3], rot: [0, a, 0], mat: glass, surface: 'glass', cast: false });
    const cr = new THREE.Mesh(new THREE.PlaneGeometry(w, w), crackMat); cr.position.z = 0.17; cr.position.y = rand(-4, 2); mesh.add(cr);
    const cr2 = cr.clone(); cr2.position.z = -0.17; cr2.rotation.y = Math.PI; mesh.add(cr2);
    F.tankGlass.push({ mesh, collider });
  }
  F.crackMat = crackMat;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(TANK.r + 0.2, 0.3, 8, 8), Mat.metal('#8aa0aa', 0.3, 1)); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI / 8; rim.position.set(TANK.x, 18, TANK.z); g.scene.add(rim);
  const rim2 = rim.clone(); rim2.position.y = 0.1; g.scene.add(rim2);
  F.tankWater = new THREE.Mesh(new THREE.CylinderGeometry(TANK.r - 0.2, TANK.r - 0.2, 17.6, 8), waterVol.clone()); F.tankWater.rotation.y = Math.PI / 8; F.tankWater.position.set(TANK.x, 8.9, TANK.z); g.scene.add(F.tankWater);
  F.tankFish = new FishSchool(g, { n: 50, ring: { x: TANK.x, z: TANK.z, r0: 3, r1: 8 }, y0: 2, y1: 16, colors: ['#ffd400', '#ff8a3a', '#7af0ff'] });
  F.chamberCaust = new THREE.Mesh(new THREE.PlaneGeometry(52, 46), causticMaterial('#7fe8ff', 0.5)); F.chamberCaust.rotation.x = -Math.PI / 2; F.chamberCaust.position.set(0, 0.03, 93); g.scene.add(F.chamberCaust);
  sign(g, ['MEGAMOUTH-9'], [0, 19.5, TANK.z - TANK.r - 0.4], 10, 2, Math.PI, { glow: '#ff2030' });
  screen(g, host, [-25.9, 14, 93], 6, Math.PI / 2, { color: '#3ae8ff' });
  screen(g, host, [25.9, 14, 93], 6, -Math.PI / 2, { color: '#3ae8ff' });
  marquee(g, [0, 17, 116], 30, Math.PI, 30, '#3ae8ff');
  F.spots = [new Spotlight(g, [-20, 21, 80], '#5ad8ff', { center: [0, 0, 93], radius: 12 }), new Spotlight(g, [20, 21, 106], '#ffffff', { center: [0, 0, 93], radius: 12, intensity: 600 })];
  for (const z of [80, 100]) { const l = new THREE.PointLight('#5ad8ff', 70, 40, 1.3); l.position.set(0, 20, z); g.scene.add(l); g.dim(l); }
  // locker with the railgun (east mezzanine)
  F.locker = solid(g, { pos: [24.6, MEZZ_Y + 1.2, 88], size: [1.6, 2.4, 1.6], mat: Mat.paint('#c42020', 0.4, 0.5), collide: false }).mesh;
  sign(g, ['MAINTENANCE'], [23.7, MEZZ_Y + 2.7, 88], 2.4, 0.5, -Math.PI / 2, { glow: '#ffd400' });
  // floating containers (platforms that ride the water)
  F.floaters = [];
  for (const [x, z] of [[-12, 80], [12, 84], [-6, 104], [14, 102], [0, 76], [-15, 96]]) {
    const { mesh, collider } = solid(g, { pos: [x, -3, z], size: [4, 1.2, 3], mat: Mat.paint(['#ff6a3a', '#3a8aff', '#ffd400'][F.floaters.length % 3], 0.5, 0.4), dynamic: true, round: 0.1 });
    collider.wallrun = false;
    F.floaters.push({ mesh, collider, x, z, ph: Math.random() * 6 });
  }
  for (const [x, z] of [[-10, 76], [8, 78], [-17, 106], [17, 108], [-3, 110], [5, 112]]) g.addProp(Math.random() < 0.5 ? 'crate' : 'barrel', [x, x > -20 && z > 105 ? DECK_Y + 0.8 : 0.7, z]);
  F.hatches = [[-14, 0, 78], [14, 0, 78], [-16, 0, 106], [16, 0, 106], [-8, 0, 22], [8, 0, 30]].map((p) => new Hatch(g, p, { color: '#3ae8ff' }));
  F.exit = new Elevator(g, { pos: [0, DECK_Y, 115.9], rotY: 0, onEnter: () => F.onExit() });
  sign(g, ['EXIT ▲ FLOOR 13'], [0, DECK_Y + 6.5, 115.8], 8, 1.4, Math.PI, { glow: '#3dff9a' });

  // ------------------------------------------------------------ water (the chamber)
  g.setWater({ ...CH, level: -60, deep: '#032a40', shallow: '#1aa6c8', opacity: 0.72 });
  g.waterFlow = (p) => (F.surge > 0 && p.y < g.water.level ? _v2.set(p.x - TANK.x, 0, p.z - TANK.z).normalize().multiplyScalar(F.surge * 6) : null);
  g.physics.waterFlow = g.waterFlow;
  F.surge = 0;

  // ------------------------------------------------------------ floor events
  F.events.sharks = {
    label: 'FEED THE SHARKS', kind: 'disaster', dur: 3, banner: 'PIRANHA-BOTS RELEASED', icon: '🐟',
    can: () => g.water && g.water.level > 2,
    start() { for (let i = 0; i < 6; i++) g.later(i * 0.3, () => g.spawnEnemy('piranha', V(rand(-20, 20), Math.max(0.5, g.water.level - 2), rand(74, 112)))); },
  };
  F.events.freeze = {
    ...EVENTS.freeze,
    label: 'FREEZE THE WATER',
    start(g2, s) {
      EVENTS.freeze.start(g2, s);
      if (g.water && g.water.level > 0.5) {
        s.ice = g.physics.addBox({ pos: V(0, g.water.level - 0.25, 93), size: [52, 0.5, 46], surface: 'ice' });
        s.ice.ice = true; s.ice.wallrun = false;
        s.iceMesh = new THREE.Mesh(new THREE.BoxGeometry(52, 0.5, 46), new THREE.MeshStandardMaterial({ color: '#dff6ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
        s.iceMesh.position.copy(s.ice.center); g.scene.add(s.iceMesh);
        s.prevSpeed = g.water.speed; g.water.speed = 0;
        g.hud.toast('THE WATER IS FROZEN — WALK ON IT!', 'gift');
        for (const e of g.enemies) if (e.type === 'piranha' && e.alive) e.takeDamage(999, { type: 'freeze', env: true });
      }
    },
    end(g2, s) { EVENTS.freeze.end(g2, s); if (s.ice) { g.physics.remove(s.ice); g.scene.remove(s.iceMesh); g.water.speed = s.prevSpeed; g.audio.play('glassShatter', { pos: g.player.pos }); g.fx.burst(g.player.pos, 40, [1, 1, 1, 1], [1, 1, 1, 0], 8, 0.3, 0.8); } },
  };
  F.events.shatter = { label: 'SHATTER THE GLASS', kind: 'disaster', dur: 1, banner: 'GLASS FAILURE', icon: '💥', start() { F.shatter(); } };
  F.events.shatter2 = { label: 'SHATTER THE GLASS (LOUDER)', kind: 'disaster', dur: 1, banner: 'GLASS FAILURE', icon: '📢', start() { F.shatter(); } };

  F.shatter = () => {
    if (F.shattered) return;
    F.shattered = true;
    g.audio.play('glassShatter', { pos: V(TANK.x, 4, TANK.z) });
    g.audio.play('waterBurst', { pos: V(TANK.x, 4, TANK.z) });
    g.audio.play('explosion', { pos: V(TANK.x, 4, TANK.z), big: 1.5 });
    g.player.shake(0.9);
    g.renderer.flash(0.5, 0xbff4ff, 2);
    g.renderer.kick(1);
    for (const t of F.tankGlass) {
      t.collider.enabled = false; t.mesh.visible = false;
      const p = t.mesh.position;
      for (let i = 0; i < 6; i++) g.fx.spawnDebris(V(p.x + rand(-2, 2), rand(1, 14), p.z + rand(-2, 2)), 1, 14, 5);
      g.fx.burst(V(p.x, 6, p.z), 30, [0.8, 1, 1.2, 0.9], [0.6, 0.9, 1, 0], 12, 0.3, 1.2, -10);
    }
    F.tankWaterDrain = true;
    if (g.water.level < -1) g.water.level = -0.3;
    g.floodTo(3.2, 1.6); // the initial surge
    F.surge = 1;
    F.burstT = 3.5;
    for (const fl of F.floaters) fl.active = true;
  };
  F.update = (dt) => {
    const wl = g.water.level;
    // teaser shark circles the tunnel
    if (F.teaser.visible) {
      F.teaserT += dt * 0.35;
      F.teaser.position.set(Math.sin(F.teaserT) * 10, 8 + Math.sin(F.teaserT * 2) * 2, 55 + Math.cos(F.teaserT) * 9);
      F.teaser.rotation.y = F.teaserT + Math.PI / 2 + (Math.cos(F.teaserT) > 0 ? 0 : 0);
      F.teaser.lookAt(Math.sin(F.teaserT + 0.1) * 10, 8 + Math.sin((F.teaserT + 0.1) * 2) * 2, 55 + Math.cos(F.teaserT + 0.1) * 9);
    }
    // tank water drains into the chamber
    if (F.tankWaterDrain) {
      const tw = F.tankWater;
      tw.scale.y = Math.max(0.01, tw.scale.y - dt * 0.35);
      tw.position.y = 0.2 + 8.8 * tw.scale.y;
      if (tw.scale.y <= 0.02) { tw.visible = false; F.tankWaterDrain = false; F.tankFish.mesh.visible = false; }
      for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; g.fx.glow.emit(TANK.x + Math.cos(a) * TANK.r, tw.position.y * 1.6, TANK.z + Math.sin(a) * TANK.r, Math.cos(a) * rand(4, 9), rand(-2, 2), Math.sin(a) * rand(4, 9), 1.2, 0.8, 1.4, [0.7, 0.9, 1.1, 0.6], [0.6, 0.9, 1, 0], -12, 0.3); }
      g.audio.loop('water', 0.6);
    }
    if (F.burstT > 0) { F.burstT -= dt; if (F.burstT <= 0 && F.flooding) g.floodTo(FLOOD_TOP, 0.11); }
    F.surge = Math.max(0, F.surge - dt * 0.3);
    // floaters ride the water
    for (const fl of F.floaters) {
      fl.ph += dt;
      const ground = fl.mesh.position.y;
      const target = wl > 0.6 ? wl + 0.25 + Math.sin(fl.ph * 1.3) * 0.12 : -3;
      fl.mesh.position.y += (target - ground) * Math.min(1, dt * 2);
      fl.mesh.position.x = fl.x + Math.sin(fl.ph * 0.2) * 2; fl.mesh.position.z = fl.z + Math.cos(fl.ph * 0.17) * 2;
      fl.mesh.rotation.z = Math.sin(fl.ph * 1.1) * 0.04; fl.mesh.rotation.x = Math.cos(fl.ph * 0.9) * 0.04;
    }
    // ground robots fry when the water is deep (handled by Enemy physics) — extra sparks for drama
    F.chamberCaust.visible = wl < 0.2;
    if (F.collapse) {
      if (Math.random() < dt * 2.5) { const p = V(rand(-22, 22), 21, rand(74, 112)); const pr = g.addProp('metalCrate', p); pr.thrown = true; pr.thrownT = 5; g.fx.dust(p, 4, 1); }
      if (Math.random() < dt * 1.5) g.audio.play('glassCrack', { pos: g.player.pos });
    }
  };
  F.openBlast = (open) => {
    const m = F.blast.mesh;
    let t = 0;
    g.audio.play('hydraulic', { pos: m.position });
    g.addHazard({ update(dt) { t += dt; const k = Math.min(1, t / 1.6); m.position.y = open ? 4 + (1 - k) * 0 + k * 8 : 12 - k * 8; if (k >= 1) { this.dead = true; if (!open) g.audio.play('pressSlam', { pos: m.position }); } } });
  };
  F.blast.mesh.position.y = 12; // starts open (raised)
  F.wave = (list) => list.forEach(([type, where, delay, opts], i) => g.later(delay ?? i * 0.5, () => {
    if (type === 'drone') dropDrone(g, where);
    else if (typeof where === 'number') F.hatches[where].spawn(type, opts);
    else g.spawnEnemy(type, V(...where), opts);
  }));
  return F;
}

// ================================================================ SCRIPT
function* script(g, cp) {
  const F = g.floor;
  const say = (who, t, o) => g.say(who, t, o);
  const K = (k) => `<span class="key">${k}</span>`;
  const allDead = () => g.aliveEnemies() === 0;
  const glitch = (v) => { g.renderer.fx.uGlitch.value = v; if (v) g.audio.play('static', { dur: 0.4, vol: 0.4 }); };
  g.music.setState('calm'); g.musicState = 'calm';

  if (cp >= 2) { F.shattered = true; F.tankGlass.forEach((t) => { t.collider.enabled = false; t.mesh.visible = false; }); F.tankWater.visible = false; F.tankFish.mesh.visible = false; g.water.level = cp >= 3 ? FLOOD_TOP : 5; F.flooding = true; g.floodTo(FLOOD_TOP, 0.11); F.openBlast(false); F.teaser.visible = false; }

  if (cp === 0) {
    say('halo', 'Welcome to Floor Twelve — the HALO AQUARIUM! Our most beautiful set! Please do not tap on the glass. The glass taps back.', { mood: 'happy' });
    g.setObjective('REACH THE MAIN TANK', 'Through the gallery and the tunnel');
    yield 6;
    g.music.setState('combat'); g.musicState = 'combat';
    F.wave([['clanker', 4], ['clanker', 5, 0.6], ['drone', [0, 13, 30], 1.2], ['drone', [-6, 13, 36], 2]]);
    yield 5;
    glitch(0.4);
    say('iris', 'Watch the viewer counter on your HUD. It never changes when the cameras cut. It isn\'t counting anything.', { priority: 3 });
    yield 1; glitch(0);
    yield () => allDead() || g.player.pos.z > 44;
    g.music.setState('calm'); g.musicState = 'calm';
    yield () => g.player.pos.z > 44;
    say('halo', 'Our star attraction lives just ahead! MEGAMOUTH-NINE! She is a sweetheart. She has only eaten eleven contestants.', { mood: 'gleeful' });
    yield () => g.player.pos.z > 66;
    g.checkpoint(1);
  }
  if (cp <= 1) {
    F.teaser.visible = false;
    g.music.setState('combat'); g.musicState = 'combat';
    g.setObjective('CLEAR THE CHAMBER', 'Security is on its way');
    F.wave([['clanker', 0], ['clanker', 1, 0.5], ['shield', 2, 1], ['clanker', 3, 1.5], ['drone', [0, 20, 84], 2]]);
    yield 3;
    g.audience.setAuto(false);
    yield allDead;
    // ----------------------------------------------- THE RIGGED VOTE
    say('halo', 'Ladies, gentlemen and algorithms! The moment you have all been waiting for!', { mood: 'gleeful', priority: 3 });
    yield 2.5;
    let winner = null;
    g.audience.startVote({ title: 'SHATTER THE GLASS?', options: ['shatter', 'shatter2'], run: false, onResolve: (id) => { winner = id; } });
    yield () => winner;
    yield 1.6;
    say('halo', 'Both options shatter the glass! DEMOCRACY!', { mood: 'gleeful', priority: 3 });
    // cracks spread
    for (let i = 0; i < 20; i++) { F.crackMat.opacity = i / 20; if (i % 5 === 0) g.audio.play('glassCrack', { pos: V(0, 6, 92) }); yield 0.08; }
    F.flooding = true;
    F.shatter();
    F.openBlast(false);
    g.hud.banner('THE CHAMBER IS FLOODING', 'disaster', 12);
    g.music.setState('disaster'); g.musicState = 'disaster';
    g.setObjective('CLIMB! THE WATER IS RISING', 'Mezzanine ramps are on the north side');
    yield 2.5;
    g.host.tip('water');
    say('halo', 'Up, up, UP, Ninety-Nine! The water is coming whether you like it or not!', { priority: 2 });
    g.hud.hint(`Deep water: ${K('SPACE')} swim up · ${K('C')} dive · watch your O₂`, 6, 'swim');
    yield 3;
    F.wave([['drone', [-12, 20, 90]], ['drone', [12, 20, 96], 1]]);
    for (let i = 0; i < 5; i++) g.later(2 + i * 0.5, () => g.spawnEnemy('piranha', V(rand(-18, 18), 1.2, rand(76, 110))));
    // railgun locker
    if (!g.player.arsenal.slots.some((s) => s.id === 'rail')) {
      say('iris', 'East mezzanine — maintenance locker. There\'s a railgun in it. You\'re going to want it.', { priority: 2 });
      const gift = g.addPickup('gift', V(24.6, MEZZ_Y + 0.4, 88), { onPick: () => {
        F.locker.visible = false;
        g.player.arsenal.addWeapon('rail');
        g.save.unlockWeapon('rail');
        g.hud.toast('UNLOCKED: PRIME TIME RAILGUN', 'unlock');
        g.music.sting('unlock');
        g.hud.hint(`RAILGUN: hold ${K('LMB')} to charge · release to fire · pierces everything`, 7, 'rail');
        say('halo', 'Where did you get THAT? That is studio property!', { mood: 'furious', priority: 2 });
      } });
      gift.landed = true;
    }
    yield () => g.player.pos.y > MEZZ_Y - 0.5 || g.water.level > 5;
    g.checkpoint(2);
  }
  if (cp <= 2) {
    g.music.setState('disaster'); g.musicState = 'disaster';
    g.audience.setAuto(true, 18);
    g.setObjective('KEEP CLIMBING', 'Upper deck — south side');
    yield 4;
    glitch(0.5);
    say('iris', 'I found the contestant records. Ninety-eight before you. All listed as WINNERS. Not one of them ever left this building.', { priority: 3 });
    yield 4;
    glitch(0.9);
    g.host.glitch = 3;
    say('halo', 'Every winner stays with the Halo family FOREVER! Isn\'t that nice? Isn\'t that NICE?', { mood: 'furious', priority: 3 });
    yield 2; glitch(0);
    F.wave([['drone', [-8, 20, 100]], ['drone', [8, 20, 104], 1], ['clanker', [-16, DECK_Y + 0.5, 112], 2], ['clanker', [16, DECK_Y + 0.5, 112], 2.5]]);
    yield () => (g.water.level > 6.5 || g.player.pos.y > DECK_Y - 1) && g.water.level > 5;
    g.checkpoint(3);
  }
  // ----------------------------------------------- MEGAMOUTH-9
  g.audience.setAuto(false);
  g.audience.cancel();
  g.music.play('boss', 'boss'); g.musicState = 'boss';
  say('halo', 'You flooded my aquarium, you dried my fish, you stole my railgun. MEGAMOUTH! DINNER TIME!', { mood: 'furious', priority: 3 });
  g.setObjective('SURVIVE MEGAMOUTH-9', 'Hit it when it leaps — the glowing gills are weak');
  yield 1.5;
  const shark = g.spawnEnemy('shark', V(0, Math.max(1, g.water.level - 3), TANK.z), { cls: Shark, silent: true });
  g.audio.play('sting', { chord: [61.7, 92.5, 123.5, 146.8] });
  yield 3;
  g.hud.hint(`Stay on platforms · ${K('Q')} dodge the leap · shoot the BLUE GILLS`, 6, 'shark');
  yield () => !shark.alive;
  g.addHype(0.3);
  g.audio.play('cheer', { big: 2 });
  say('halo', 'MEGAMOUTH! NOOO! ...Fine. FINE. The fish was overrated anyway.', { mood: 'furious', priority: 3 });
  F.collapse = true;
  g.audio.loop('alarm', 0.25);
  g.hud.banner('CHAMBER COLLAPSE', 'disaster', 20);
  g.setObjective('UPPER DECK — ELEVATOR', '');
  F.exit.setOpen(true);
  say('iris', 'The ceiling is going. Elevator, top deck — move!', { priority: 3 });
  yield () => F.exit.entered;
}

export default {
  name: 'AQUARIUM APOCALYPSE',
  build(g, o) {
    const F = build(g, o);
    F.onExit = () => {
      g.cinematic = true;
      g.player.vel.set(0, 0, 0);
      F.exit.setOpen(false);
      g.audio.loop('alarm', 0);
      g.setCam([0, DECK_Y + 2.2, 119.8], [0, DECK_Y + 1.5, 112], 60, 3);
      g.say('halo', 'FLOOR TWELVE... complete. Ratings: record-breaking. Mood: furious. Next floor: I have plans for you, Ninety-Nine.', { mood: 'furious', priority: 3 });
      g.later(5, () => { g.renderer.fx.uGlitch.value = 0.5; g.audio.play('static', { dur: 0.5, vol: 0.5 }); g.say('iris', 'Floor Thirteen is above us and I can\'t see past it. Whatever they\'re hiding starts there. ...Thank you. For getting this far.', { priority: 3 }); g.later(1, () => { g.renderer.fx.uGlitch.value = 0; }); });
      g.later(12, () => g.completeFloor());
    };
    return F;
  },
  script,
  scoreTarget: 16000,
  elevatorLines: [
    ['halo', 'Floor Twelve: the AQUARIUM! Bring a towel. Or a submarine.', 0.6],
    ['iris', 'Nobody has made it past Floor Twelve in three seasons. Breathe while you can.', 4.2],
  ],
  elevatorDur: 9,
  rewards: [{ type: 'track', id: 'f12' }],
  completeLine: 'Floors thirteen and up are still being... decorated. Stay tuned!',
};
