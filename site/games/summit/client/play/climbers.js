/* Owns the visual climbers: one rig per player, driven by animation state,
 * cloth, ragdoll and the parachute. Works for the local player and remotes. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { buildClimber } from '../char/body.js';
import { makeMaterials, makeExtras, defaultLook } from '../char/cosmetics.js';
import { makeSkeleton } from '../char/rig.js';
import { Animator } from '../char/anim.js';
import { makeClothSet } from '../char/cloth.js';
import { Ragdoll } from './ragdoll.js';
import { FLAG } from '../../shared/protocol.js';
import { materials } from '../gfx/materials.js';
import { materialMaps } from '../gfx/textures.js';

const NAME_W = 256, NAME_H = 64;

function nameTag(text, color = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = NAME_W; c.height = NAME_H;
  const x = c.getContext('2d');
  x.font = '600 30px Inter, system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 6;
  x.strokeStyle = 'rgba(0,0,0,0.72)';
  x.strokeText(text, NAME_W / 2, NAME_H / 2);
  x.fillStyle = color;
  x.fillText(text, NAME_W / 2, NAME_H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  spr.scale.set(1.5, 0.375, 1);
  spr.renderOrder = 900;
  return spr;
}

function parachute(mats) {
  const g = new THREE.Group();
  const canopy = new THREE.SphereGeometry(2.6, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.46);
  canopy.scale(1, 0.72, 1);
  const mat = mats.jacket.clone();
  mat.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(canopy, mat);
  dome.castShadow = true;
  dome.position.y = 3.6;
  g.add(dome);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xd8d3c6, transparent: true, opacity: 0.85 });
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 2.4, 3.55, Math.sin(a) * 2.4), new THREE.Vector3(0, 1.5, 0));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  g.visible = false;
  return g;
}

export class Climber {
  constructor(scene, world, { id, name, look, local }) {
    this.id = id;
    this.scene = scene;
    this.world = world;
    this.local = !!local;
    this.lookKey = JSON.stringify(look || null);
    this.look = { ...defaultLook(), ...(look || {}) };
    this.mats = makeMaterials(this.look);
    const { rest } = makeSkeleton();
    this.rig = buildClimber(this.look, this.mats, makeExtras(this.look, rest));
    this.group = new THREE.Group();
    this.group.add(this.rig.mesh);
    this.anim = new Animator(this.rig, world);
    this.cloth = makeClothSet(this.rig, this.mats);
    for (const c of this.cloth) scene.add(c.mesh);
    this.ragdoll = new Ragdoll(this.rig, world);
    this.chute = parachute(this.mats);
    this.group.add(this.chute);
    this.tag = nameTag(name || 'Climber');
    this.tag.position.y = 2.08;
    this.group.add(this.tag);
    scene.add(this.group);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.prevPos = new THREE.Vector3();
    this.state = 'idle';
    this.ghost = false;
    this.wallNormal = null;
    this._v = new THREE.Vector3();
    this.setGhost(false);
  }

  setName(n) {
    this.group.remove(this.tag);
    this.tag = nameTag(n);
    this.tag.position.y = 2.08;
    this.group.add(this.tag);
  }

  setLook(look) {
    // Compare against what we were handed, not the expanded copy — otherwise the
    // rig would be rebuilt every single frame.
    const key = JSON.stringify(look || null);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.look = { ...defaultLook(), ...look };
    this.mats = makeMaterials(this.look);
    this.group.remove(this.rig.mesh);
    for (const c of this.cloth) c.dispose();
    const { rest } = makeSkeleton();
    this.rig = buildClimber(this.look, this.mats, makeExtras(this.look, rest));
    this.group.add(this.rig.mesh);
    this.anim = new Animator(this.rig, this.world);
    this.cloth = makeClothSet(this.rig, this.mats);
    for (const c of this.cloth) this.scene.add(c.mesh);
    this.ragdoll = new Ragdoll(this.rig, this.world);
    this.setGhost(this.ghost);
  }

  setGhost(on) {
    this.ghost = on;
    const list = Array.isArray(this.rig.mesh.material) ? this.rig.mesh.material : [this.rig.mesh.material];
    for (const m of list) {
      m.transparent = on;
      m.opacity = on ? 0.34 : 1;
      m.depthWrite = !on;
      m.needsUpdate = true;
    }
    this.rig.mesh.castShadow = !on;
    for (const c of this.cloth) c.mesh.visible = !on;
  }

  /** Feeds one authoritative or predicted state in. */
  apply(s, dt) {
    this.prevPos.copy(this.pos);
    this.pos.set(s.x, s.y, s.z);
    if (dt > 0) this.vel.copy(this.pos).sub(this.prevPos).divideScalar(dt);
    this.group.position.copy(this.pos);
    // the mesh looks down +Z, movement looks down -Z, so it needs half a turn
    this.group.rotation.y = (s.yaw ?? s.a ?? 0) + Math.PI;
    this.pitch = s.pitch ?? s.b ?? 0;

    const flags = s.f ?? 0;
    const dead = !!(flags & FLAG.DEAD);
    if (dead !== this.ghost) this.setGhost(dead);
    this.chute.visible = !!(flags & FLAG.CHUTE);
    this.tag.visible = !this.local;
  }

  setState(name) {
    if (name === this.state) return;
    this.state = name;
    if (name !== 'ragdoll') { this.anim.setState(name); this.ragdoll.stop(); }
  }

  startRagdoll(velocity) { this.state = 'ragdoll'; this.ragdoll.start(velocity || this.vel); }
  get ragdolling() { return this.ragdoll.active; }

  update(dt, ctx) {
    if (this.ragdoll.active) {
      this.ragdoll.update(dt);
      if (this.ragdoll.settled) { this.ragdoll.stop(); this.anim.setState(this.state === 'ragdoll' ? 'downed' : this.state); }
    } else {
      this.anim.update(dt, {
        speed: Math.hypot(this.vel.x, this.vel.z),
        pitch: this.pitch,
        position: this.pos,
        world: this.world,
        wallNormal: this.wallNormal,
        footIK: !!ctx?.footIK,
      });
    }
    const wind = ctx?.wind;
    for (const c of this.cloth) c.update(dt, wind, this.vel);
    if (this.chute.visible) {
      const t = performance.now() * 0.001;
      this.chute.rotation.z = Math.sin(t * 1.1) * 0.06;
      this.chute.rotation.x = Math.cos(t * 0.9) * 0.05;
    }
    this.tag.material.opacity = ctx?.tagFade ?? 1;
  }

  dispose() {
    this.scene.remove(this.group);
    for (const c of this.cloth) c.dispose();
    this.rig.mesh.geometry.dispose();
  }
}

/** Maps a server animation string to a client state, given the flags. */
export function animFor(p) {
  return p.e || 'idle';
}

/** Holds every visible climber and keeps the roster in sync. */
export class ClimberSet {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.map = new Map();
  }
  ensure(id, name, look, local) {
    let c = this.map.get(id);
    if (!c) { c = new Climber(this.scene, this.world, { id, name, look, local }); this.map.set(id, c); }
    else if (look) c.setLook(look);
    return c;
  }
  get(id) { return this.map.get(id); }
  remove(id) { const c = this.map.get(id); if (c) { c.dispose(); this.map.delete(id); } }
  prune(ids) { for (const id of [...this.map.keys()]) if (!ids.has(id)) this.remove(id); }
  all() { return [...this.map.values()]; }
  dispose() { for (const c of this.map.values()) c.dispose(); this.map.clear(); }
}
