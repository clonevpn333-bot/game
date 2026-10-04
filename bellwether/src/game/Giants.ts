import * as THREE from 'three';
import type { World } from '../world/World';
import type { Game } from './Game';
import type { Collider } from '../core/Physics';
import { Shepherd, type ShepherdOpts } from '../actors/Shepherd';
import { audio } from '../audio/AudioEngine';

/**
 * Bellwether's giants in the world: footfalls that shake the camera, feet that block the player and
 * stop traffic, and (when hostile) a searchlight that hunts you and chin guns that fire when it finds you.
 */
export interface GiantOpts extends ShepherdOpts {
  pos: THREE.Vector3;
  yaw?: number;
  path?: THREE.Vector3[];
  loop?: boolean;
  /** hostile behaviour: searchlight hunting + guns */
  hunt?: boolean;
  /** can be brought down by shooting its glowing knee actuators */
  weakKnees?: boolean;
}

export interface Giant {
  sh: Shepherd;
  hunt: boolean;
  locked: number;
  burstCd: number;
  knees: { hp: number; core: THREE.Mesh }[];
  onDown: (() => void) | null;
  /** player was hit by its guns this frame */
  sweepT: number;
  chip: boolean;
}

function giants(W: World): Giant[] {
  let list = W.named.get('giants') as Giant[] | undefined;
  if (!list) {
    list = [];
    W.named.set('giants', list);
  }
  return list;
}

export function addGiant(W: World, g: Game, o: GiantOpts): Giant {
  const sh = new Shepherd(o);
  sh.place(o.pos, o.yaw ?? 0);
  if (o.path) sh.follow(o.path, o.loop ?? true);
  else sh.speed = sh.cruise = 0;
  W.add(sh.root);
  const s = sh.scale;
  // feet are solid
  const cols: Collider[] = sh.legs.map(() => W.physics.add({ cx: 0, cy: 1.2 * s, cz: 0, hx: 1.6 * s, hy: 1.2 * s, hz: 1.8 * s, noVault: true, tag: 'giant' }));
  const giant: Giant = { sh, hunt: !!o.hunt, locked: 0, burstCd: 2, knees: [], onDown: null, sweepT: Math.random() * 10, chip: false };
  if (o.weakKnees) {
    for (const l of sh.legs) {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.75 * s, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a20').multiplyScalar(2.6), toneMapped: false }));
      l.knee.add(core);
      core.position.set(0, 0, 1.0 * s);
      giant.knees.push({ hp: 180, core });
    }
  }
  giants(W).push(giant);
  sh.onStep = (p, sc) => {
    const d = p.distanceTo(g.player.pos);
    const k = THREE.MathUtils.clamp(1 - d / (70 * sc), 0, 1);
    if (k > 0) {
      g.player.trauma = Math.min(1, g.player.trauma + k * k * 0.35);
      audio.impact('thud', p, 0.4 + k * 1.2);
      if (k > 0.3) audio.rumble(0.7, k * 0.5);
    }
    if (d < 120) g.fx.burst('dust', p.clone().setY(0.3), new THREE.Vector3(0, 1, 0), Math.round(10 + 20 * sc));
  };
  W.onUpdate((dt) => {
    sh.update(dt);
    sh.legs.forEach((l, i) => {
      const c = cols[i];
      c.cx = l.plant.x;
      c.cz = l.plant.z;
      c.cy = l.plant.y + 1.2 * s;
      c.enabled = !sh.dead || sh.fall < 0.3;
    });
    if (giant.hunt && !sh.dead) huntUpdate(giant, g, dt);
    else if (!sh.dead) {
      // idle gaze: a slow sweep of the street ahead
      giant.sweepT += dt;
      const ahead = sh.pos.clone().add(new THREE.Vector3(Math.sin(sh.yaw), 0, Math.cos(sh.yaw)).multiplyScalar(26 * s));
      const side = new THREE.Vector3(Math.cos(sh.yaw), 0, -Math.sin(sh.yaw));
      sh.look.copy(ahead).addScaledVector(side, Math.sin(giant.sweepT * 0.35) * 14 * s);
      // gentle curiosity: friendly giants glance at the player when close
      const dp = g.player.pos.distanceTo(sh.pos);
      sh.lookTarget = dp < 34 * s ? g.player.camPos : null;
    }
  });
  W.disposers.push(() => sh.dispose());
  return giant;
}

/** Called once per frame by a level: cars wait for planted feet. */
export function giantTraffic(W: World, g: Game): void {
  W.onUpdate(() => {
    if (!g.traffic) return;
    const obs: { p: THREE.Vector3; r: number }[] = [];
    for (const gi of giants(W)) for (const f of gi.sh.legs) obs.push({ p: f.plant, r: 2.2 * gi.sh.scale });
    g.traffic.obstacles = obs;
  });
}

function huntUpdate(gi: Giant, g: Game, dt: number): void {
  const sh = gi.sh;
  const s = sh.scale;
  const p = g.player;
  const spotR = 4.2;
  gi.sweepT += dt;
  const flat = p.pos.clone().setY(0);
  const lookFlat = sh.look.clone().setY(0);
  const inRange = flat.distanceTo(sh.pos.clone().setY(0)) < 62 * s;
  // can the lamp actually see the player? (roofs, awnings and cars hide you)
  const lamp = sh.head.localToWorld(new THREE.Vector3(0, -1.6 * s, 2.4 * s));
  const toP = p.camPos.clone().sub(lamp);
  const dist = toP.length();
  const blocked = !!g.physics.raycast(lamp, toP.clone().normalize(), dist - 0.6, (c) => !c.noShoot && c.tag !== 'giant');
  const inSpot = lookFlat.distanceTo(flat) < spotR + (p.crouching ? -1.2 : 0.6);
  if (inRange && inSpot && !blocked && g.state === 'playing') gi.locked = Math.min(3, gi.locked + dt);
  else gi.locked = Math.max(0, gi.locked - dt * 0.7);
  if (gi.locked > 0.35) {
    // tracking: the beam follows you, a little slower than a sprint
    const step = 4.6 * dt;
    const d = flat.clone().sub(lookFlat);
    const len = d.length();
    if (len > 0.01) sh.look.addScaledVector(d.normalize(), Math.min(len, step));
    sh.lookTarget = null;
    gi.burstCd -= dt;
    if (gi.locked > 0.9 && gi.burstCd <= 0) {
      gi.burstCd = 1.6;
      fireBurst(gi, g);
    }
    if (gi.locked > 0.9 && Math.random() < dt * 0.5) audio.servo?.(lamp, 0.4);
  } else {
    // sweeping: a figure-eight of light across the street ahead
    const ahead = sh.pos.clone().add(new THREE.Vector3(Math.sin(sh.yaw), 0, Math.cos(sh.yaw)).multiplyScalar(20 * s));
    const side = new THREE.Vector3(Math.cos(sh.yaw), 0, -Math.sin(sh.yaw));
    const want = ahead.addScaledVector(side, Math.sin(gi.sweepT * 0.45) * 12).add(new THREE.Vector3(Math.sin(sh.yaw), 0, Math.cos(sh.yaw)).multiplyScalar(Math.sin(gi.sweepT * 0.9) * 9));
    sh.look.lerp(want, Math.min(1, dt * 1.2));
  }
  const show = gi.locked > 0.9;
  if (show) g.hud.chip('SHEPHERD HAS YOU · BREAK THE LIGHT', 0.4);
  else if (gi.chip) g.hud.chip(null);
  gi.chip = show;
}

function fireBurst(gi: Giant, g: Game): void {
  const sh = gi.sh;
  const s = sh.scale;
  const cam = g.engine.camera;
  for (let i = 0; i < 4; i++) {
    window.setTimeout(() => {
      if (sh.dead || g.state !== 'playing') return;
      const side = i % 2 ? 1 : -1;
      const muzzle = sh.head.localToWorld(new THREE.Vector3(side * 1.4 * s, -1.4 * s, 4.8 * s));
      const p = g.player;
      const aim = p.chest.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2.2));
      const moving = p.speed > 4 ? 0.2 : p.speed > 1 ? 0.12 : 0;
      const hit = Math.random() < 0.42 - moving - (p.crouching ? 0.1 : 0);
      const to = hit ? p.chest.clone() : aim;
      g.fx.muzzle(muzzle, to.clone().sub(muzzle).normalize(), cam);
      g.fx.tracer(muzzle, to, cam);
      audio.gunshot(muzzle, 1.1);
      if (hit) p.hurt(9, muzzle);
      else {
        g.fx.burst('sparks', aim.clone().setY(Math.max(0.05, aim.y - 1)), new THREE.Vector3(0, 1, 0), 6);
        audio.impact('concrete', aim, 0.5);
      }
    }, i * 120);
  }
}

/** Shooting targets for Combat: the glowing knee actuators of weak-kneed giants. */
export function giantTargets(W: World, g: Game): { hitTest: (o: THREE.Vector3, d: THREE.Vector3, max: number) => { dist: number; head: boolean; point: THREE.Vector3 } | null; damage: (n: number) => void }[] {
  const out: ReturnType<typeof giantTargets> = [];
  for (const gi of giants(W)) {
    gi.knees.forEach((k) => {
      const hitTest = (o: THREE.Vector3, d: THREE.Vector3, max: number) => {
        if (k.hp <= 0 || gi.sh.dead) return null;
        const c = k.core.getWorldPosition(new THREE.Vector3());
        const r = 1.0 * gi.sh.scale;
        const oc = o.clone().sub(c);
        const b = oc.dot(d);
        const disc = b * b - (oc.lengthSq() - r * r);
        if (disc < 0) return null;
        const t = -b - Math.sqrt(disc);
        if (t < 0 || t > max) return null;
        return { dist: t, head: false, point: o.clone().addScaledVector(d, t) };
      };
      const damage = (n: number) => {
        if (k.hp <= 0) return;
        k.hp -= n;
        const c = k.core.getWorldPosition(new THREE.Vector3());
        g.fx.burst('sparks', c, new THREE.Vector3(0, 1, 0), 10);
        if (k.hp <= 0) {
          k.core.visible = false;
          audio.explosion(c, 0.6);
          g.fx.burst('smoke', c, new THREE.Vector3(0, 1, 0), 30);
          g.fx.burst('embers', c, new THREE.Vector3(0, 1, 0), 30);
          const broken = gi.knees.filter((q) => q.hp <= 0).length;
          if (broken >= 2 && !gi.sh.dead) {
            gi.sh.collapse(Math.random() < 0.5 ? 1 : -1);
            audio.rumble(4, 0.9);
            window.setTimeout(() => {
              audio.explosion(gi.sh.pos.clone().setY(2), 1);
              g.fx.burst('dust', gi.sh.pos.clone().setY(1), new THREE.Vector3(0, 1, 0), 120);
              g.player.trauma = 1;
            }, 1600);
            gi.onDown?.();
          }
        }
      };
      out.push({ hitTest, damage });
    });
  }
  return out;
}

/** Floating lantern drones drifting in slow flocks above the streets. */
export function lanterns(W: World, center: THREE.Vector3, radius: number, count: number, color = '#ffcf8a', height = 18): void {
  const geo = new THREE.BoxGeometry(0.5, 0.7, 0.5);
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4), toneMapped: false });
  const im = new THREE.InstancedMesh(geo, mat, count);
  const seeds = Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2, r: radius * (0.3 + Math.random() * 0.7), h: height + Math.random() * 10, sp: 0.02 + Math.random() * 0.05, ph: Math.random() * 10 }));
  const m = new THREE.Matrix4();
  W.add(im);
  W.onUpdate((_dt, t) => {
    seeds.forEach((s, i) => {
      const a = s.a + t * s.sp;
      m.makeRotationY(t * 0.5 + s.ph);
      m.setPosition(center.x + Math.cos(a) * s.r, s.h + Math.sin(t * 0.7 + s.ph) * 1.2, center.z + Math.sin(a) * s.r);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  W.disposers.push(() => geo.dispose());
}
