// The Clerk: a predator that hears, looks, investigates, searches hiding
// places it has reason to suspect, and gives up when it loses you.
import * as THREE from 'three';
import { buildCharacter, CLERK } from '../../characters/cast.js';
import { Animator } from '../../characters/anim.js';
import { NoiseLoop } from '../../audio/audio.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Ray (XZ) vs boxes — true if a wall blocks sight between a and b. */
export function blocked(a, b, boxes, ignoreTag) {
  for (const c of boxes) {
    if (ignoreTag && c.tag === ignoreTag) continue;
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dz = b.z - a.z;
    let ok = true;
    for (const [p, d, lo, hi] of [[a.x, dx, c.minX, c.maxX], [a.z, dz, c.minZ, c.maxZ]]) {
      if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { ok = false; break; } continue; }
      let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
    }
    if (ok && t0 < 1 && t1 > 0) return true;
  }
  return false;
}

export class Clerk {
  async load(scene, hotel, audio) {
    this.hotel = hotel; this.audio = audio;
    this.ch = await buildCharacter(CLERK);
    // smooth the face away: no eyes, just shadowed sockets
    for (const e of this.ch.eyes) e.pivot.visible = false;
    for (const l of this.ch.lids) l.holder.visible = false;
    this.anim = new Animator(this.ch);
    this.anim.mood = 'tense';
    scene.add(this.ch);
    // version smear: ghost copies that lag and jitter
    this.ghosts = [];
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      for (const m of this.ch.meshes) { const gm = new THREE.SkinnedMesh(m.geometry, ghostMat); gm.bind(this.ch.skeleton, m.bindMatrix); gm.frustumCulled = false; g.add(gm); }
      this.ch.add(g); this.ghosts.push(g);
    }
    this.pos = V3(); this.yaw = 0; this.path = []; this.state = 'dormant';
    this.timer = 0; this.alert = 0; this.lastSeen = null; this.searchList = []; this.speed = 0;
    this.ch.visible = false;
    this.voiceT = 4;
    return this;
  }

  /** Scripted apparition: stands or walks a set path, makes its noises, can never catch you. */
  appear(at, yaw = 0, path = [], speed = 1.0) { this.pos.copy(at); this.yaw = yaw; this.state = 'scripted'; this.ch.visible = true; this.path = path.map((p) => p.clone()); this.scriptSpeed = speed; this.alert = 0; }
  vanish() { this.state = 'dormant'; this.ch.visible = false; this.hum?.set(0, 120, 0.3); }

  spawn(at, state = 'patrol') { this.pos.copy(at); this.state = state; this.ch.visible = true; this.alert = 0; this.path = []; this.timer = 0; }
  hide() { this.state = 'dormant'; this.ch.visible = false; this.hum?.set(0, 120, 0.3); }

  nearestNode(p) { let b = 0, bd = Infinity; this.hotel.nodes.forEach((n, i) => { const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2; if (d < bd && !blocked(p, n, this.walls, 'hidden611')) { bd = d; b = i; } }); return b; }
  route(to) {
    const nodes = this.hotel.nodes, a = this.nearestNode(this.pos), b = this.nearestNode(to);
    const prev = new Map([[a, -1]]), q = [a];
    while (q.length) { const n = q.shift(); if (n === b) break; for (const l of nodes[n].links) if (!prev.has(l)) { prev.set(l, n); q.push(l); } }
    const path = []; let n = b; while (n !== undefined && n !== -1) { path.unshift(V3(nodes[n].x, 0, nodes[n].z)); n = prev.get(n); }
    path.push(to.clone());
    this.path = path;
  }

  /** noise from the player or world: loudness 0..1.5 */
  hear(p, loud) {
    if (this.state === 'dormant' || this.state === 'chase' || this.state === 'scripted') return;
    const d = p.distanceTo(this.pos);
    const wallsBetween = blocked(this.pos, p, this.walls, 'hidden611') ? 0.55 : 1;
    if (d < loud * 16 * wallsBetween) {
      this.state = 'investigate'; this.investigate = p.clone(); this.route(p); this.timer = 0;
      this.voice('hear');
    }
  }

  voice(kind) {
    const a = this.audio; if (!a.ctx) return;
    const p = this.ch.bones.head.getWorldPosition(V3());
    if (kind === 'hear') { a.burst({ pos: p, freq: 300, freqEnd: 180, q: 6, dur: 0.8, vol: 0.25, buf: a.brown, reverb: 0.6 }); }
    if (kind === 'spot') { a.burst({ pos: p, freq: 1800, freqEnd: 600, q: 9, dur: 0.9, vol: 0.5, reverb: 0.7 }); a.tone({ pos: p, type: 'sawtooth', freq: 90, freqEnd: 40, dur: 1, vol: 0.3 }); }
    if (kind === 'idle') { for (let i = 0; i < 5; i++) a.burst({ pos: p, freq: 700 + Math.random() * 1600, q: 12, dur: 0.12, vol: 0.06, at: i * 0.11 + Math.random() * 0.05, reverb: 0.8 }); }
  }

  /** Returns 'caught' when it reaches the player. */
  /** Heavy steps with a drag, and a low hum that rises the closer it is. */
  sounds(dt, moving, player) {
    const a = this.audio; if (!a.ctx) return;
    if (!this.hum) this.hum = new NoiseLoop(a, { type: 'lowpass', freq: 120, q: 4, buf: a.brown, positional: true, ref: 3 });
    const d = this.pos.distanceTo(player.pos);
    this.hum?.pos(this.pos.clone().setY(1.6)); this.hum?.set(this.ch.visible ? Math.min(0.5, 0.12 + (1 - Math.min(1, d / 14)) * 0.45) : 0, 90 + Math.sin(performance.now() / 300) * 20, 0.2);
    if (moving) {
      this.stepT = (this.stepT ?? 0) - dt * Math.max(0.6, this.speed);
      if (this.stepT < 0) {
        this.stepT = 0.85;
        const p = this.pos.clone().setY(0.1);
        a.burst({ pos: p, freq: 260, freqEnd: 70, type: 'lowpass', dur: 0.22, vol: 0.55, buf: a.brown, reverb: 0.6 });
        a.tone({ pos: p, freq: 70, freqEnd: 40, dur: 0.18, vol: 0.35 });
        if (Math.random() < 0.6) a.burst({ pos: p, freq: 900, freqEnd: 400, q: 0.8, dur: 0.45, vol: 0.12, buf: a.pink, at: 0.15, reverb: 0.5 }); // the dragging foot
      }
    }
  }

  update(dt, t, player) {
    if (this.state === 'dormant') return null;
    if (this.state === 'scripted') {
      let moving = false;
      if (this.path.length) {
        const tg = this.path[0], d = V3(tg.x - this.pos.x, 0, tg.z - this.pos.z), dl = d.length();
        if (dl < 0.2) this.path.shift();
        else { this.pos.addScaledVector(d.normalize(), Math.min(dl, this.scriptSpeed * dt)); this.yaw = Math.atan2(d.x, d.z); moving = true; }
      }
      this.speed = moving ? this.scriptSpeed : 0;
      this.sounds(dt, moving, player);
      this.ch.position.copy(this.pos); this.ch.rotation.y = this.yaw;
      if (Math.random() < dt * 1.5) this.ch.position.x += (Math.random() - 0.5) * 0.08;
      this.anim.mode = moving ? 'walk' : 'idle'; this.anim.speed = this.speed;
      this.anim.lookTarget = this.lookAtPlayer ? player.pos.clone().add(V3(0, 1.5, 0)) : null;
      this.anim.custom = (an) => { an.rot('head', new THREE.Vector3(0, 0, 1), Math.sin(t * 0.7) * 0.25); an.rot('neck', new THREE.Vector3(1, 0, 0), 0.25); };
      this.anim.update(dt);
      this.ghosts.forEach((g, i) => { g.position.set((Math.random() - 0.5) * 0.06 * (i + 1), (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.06 * (i + 1)); g.visible = Math.random() < 0.85; });
      return null;
    }
    const walls = this.walls;
    const pp = player.pos;
    const toP = V3(pp.x - this.pos.x, 0, pp.z - this.pos.z); const dist = toP.length();
    // --- perception
    const fwd = V3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const ang = Math.acos(clamp(fwd.dot(toP.clone().normalize()), -1, 1));
    const losClear = !player.hidden && !blocked(this.pos, pp, walls, this.ignore611 ? 'hidden611' : null);
    const lit = player.flashlightOn ? 1.6 : 1;
    const range = (player.crouched ? 7 : 12) * lit * (player.inLight ? 1.7 : 1);
    const sees = losClear && dist < range && (ang < 1.0 || dist < 2.2);
    if (sees) this.alert = Math.min(1, this.alert + dt * (1.8 - dist / range) * (this.state === 'chase' ? 3 : 1.4));
    else this.alert = Math.max(0, this.alert - dt * 0.25);
    if (this.alert >= 1 && this.state !== 'chase') { this.state = 'chase'; this.voice('spot'); }
    if (sees) this.lastSeen = pp.clone();
    // --- behaviour
    let target = null, speed = 1.25;
    if (this.state === 'patrol') {
      if (!this.path.length) {
        const keys = Object.keys(this.hotel.roomNodes); const pick = Math.random();
        const n = pick < 0.45 ? this.hotel.nodes[this.hotel.roomNodes[keys[Math.floor(Math.random() * keys.length)]].inside] : this.hotel.nodes[this.hotel.corridorNodes[Math.floor(Math.random() * this.hotel.corridorNodes.length)]];
        this.route(V3(n.x, 0, n.z)); this.pause = 1.5 + Math.random() * 2.5;
      }
      speed = 1.15;
    } else if (this.state === 'investigate') {
      speed = 1.9;
      if (!this.path.length) { this.timer += dt; if (this.timer > 3) this.beginSearch(this.investigate); }
    } else if (this.state === 'search') {
      speed = 1.4;
      if (!this.path.length) {
        this.timer += dt;
        if (this.timer > 1.6) {
          const next = this.searchList.shift();
          if (!next) { this.state = 'patrol'; this.timer = 0; }
          else { this.route(next.pos ?? next); this.checking = next.hide ? next : null; this.timer = 0; }
        }
        if (this.checking && this.timer > 1.0 && !this.checking.done) {
          this.checking.done = true;
          // opening a hiding place: if the player is inside it, it's over
          if (player.hidden && player.hidden === this.checking.hide) { this.state = 'chase'; this.alert = 1; this.voice('spot'); return 'caught'; }
          this.audio.creakShort(this.pos, 0.3);
        }
      }
    } else if (this.state === 'chase') {
      speed = this.chaseSpeed ?? 4.05;
      if (sees || dist < 3) { this.path = [pp.clone()]; this.lostT = 0; }
      else {
        this.lostT = (this.lostT || 0) + dt;
        if (!this.path.length || this.lostT > 0.5) { if (this.lastSeen) this.route(this.lastSeen); this.lostT = 0; }
        if (this.lastSeen && this.pos.distanceTo(this.lastSeen) < 1.2) this.beginSearch(this.lastSeen, player);
      }
      if (dist < 1.05 && !player.hidden) return 'caught';
    }
    // --- move along the path
    if (this.pause > 0 && this.state === 'patrol') { this.pause -= dt; this.speed = 0; }
    else if (this.path.length) {
      target = this.path[0];
      const d = V3(target.x - this.pos.x, 0, target.z - this.pos.z), dl = d.length();
      if (dl < 0.35) this.path.shift();
      else {
        const step = Math.min(dl, speed * dt);
        this.pos.addScaledVector(d.normalize(), step);
        const want = Math.atan2(d.x, d.z);
        let dy = want - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        this.yaw += dy * Math.min(1, dt * 6);
        this.speed = speed;
        this.anim.turnRate = dy * 3;
      }
    } else this.speed = 0;
    // doors: it opens anything in its way
    for (const door of this.hotel.doors) {
      if (door.locked || door.angle > 1.2) continue;
      const h = door.hingeWorld(); if (Math.hypot(h.x - this.pos.x, h.z - this.pos.z) < 1.4) { door.vel = 4; this.audio.creakShort(h, 0.25); }
    }
    this.sounds(dt, this.speed > 0.2, player);
    // body
    this.ch.position.copy(this.pos);
    // micro "skips": it is a version that doesn't hold together
    if (Math.random() < dt * 1.5) this.ch.position.x += (Math.random() - 0.5) * 0.08;
    this.ch.rotation.y = this.yaw;
    this.anim.mode = this.speed > 0.2 ? (this.speed > 2.6 ? 'run' : 'walk') : 'idle';
    this.anim.speed = this.speed;
    this.anim.lookTarget = this.state === 'chase' || sees ? pp.clone().add(V3(0, 1.5, 0)) : null;
    this.anim.custom = (a) => { a.rot('head', new THREE.Vector3(0, 0, 1), Math.sin(t * 0.7) * 0.25); a.rot('neck', new THREE.Vector3(1, 0, 0), 0.25); };
    this.anim.update(dt);
    this.ghosts.forEach((g, i) => { g.position.set((Math.random() - 0.5) * 0.06 * (i + 1), (Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.06 * (i + 1)); g.visible = Math.random() < 0.85; });
    this.voiceT -= dt; if (this.voiceT < 0) { this.voiceT = 5 + Math.random() * 6; this.voice('idle'); }
    return null;
  }

  beginSearch(p, player) {
    this.state = 'search'; this.timer = 0;
    // check hiding places in the room the noise came from, nearest first
    const hides = this.hotel.hides.filter((h) => h.pos.distanceTo(p) < 7).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p));
    this.searchList = hides.slice(0, 2).map((h) => ({ pos: h.pos, hide: h }));
    // if it watched you hide, it goes straight to that spot
    if (player?.hidden && player.hiddenSeen) this.searchList.unshift({ pos: player.hidden.pos, hide: player.hidden });
    this.searchList.push(p.clone().add(V3((Math.random() - 0.5) * 4, 0, 0)));
  }
}
