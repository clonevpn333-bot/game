// Your weapons on foot: X cycles through what you carry, right mouse aims over
// the shoulder, left click fires (hold for automatics) or swings a melee weapon.
// Aiming at someone makes them raise their hands; G then demands their wallet.
import { WEAPONS } from '../sim/combat.js';
import { ensureLife } from '../sim/lifeState.js';
import { dist, damp, clamp } from '../core/math.js';
import { rand } from '../core/rng.js';
import * as THREE from 'three';

const v3 = new THREE.Vector3();

export class PlayerWeapons {
  constructor(game) {
    this.game = game;
    this.cur = null;     // equipped weapon id or null (holstered)
    this.fireT = 0;
    this.aiming = false;
    this.prevDown = false;
    this.cross = document.createElement('div');
    this.cross.id = 'crosshair';
    this.cross.className = 'hidden';
    document.getElementById('ui').appendChild(this.cross);
  }
  get W() { return this.game.world; }

  owned(c) {
    const L = ensureLife(c, this.W);
    const list = ['fists', ...(L.inv.weapons || []).filter((w) => WEAPONS[w])];
    if (c.duty != null && c.job?.role === 'officer' && !list.includes('pistol')) list.push('pistol', 'taser');
    return Array.from(new Set(list));
  }
  ammo(c, w) { const L = ensureLife(c, this.W); if (WEAPONS[w].melee || w === 'taser') return Infinity; if (c.duty != null && c.job?.role === 'officer') return Infinity; return (L.ammo || {})[w] || 0; }

  // called every frame while on foot
  update(dt, P, p) {
    const g = this.game, I = g.input, W = this.W, c = P.c;
    const T = g.rig.third;
    if (I.hit('KeyX')) {
      const list = this.owned(c);
      const i = this.cur == null ? 0 : list.indexOf(this.cur) + 1;
      this.cur = i >= list.length ? null : list[i];
      g.toast(this.cur ? `${WEAPONS[this.cur].label}${this.cur !== 'fists' && !WEAPONS[this.cur].melee ? ` — ${this.ammo(c, this.cur) === Infinity ? '∞' : this.ammo(c, this.cur)} rounds` : ''}` : 'Weapon holstered', 1.6);
    }
    p.weapon = this.cur && this.cur !== 'fists' ? this.cur : null;
    const wp = this.cur ? WEAPONS[this.cur] : null;
    this.aiming = !!wp && !wp.melee && I.mouse.down[2];
    this.cross.classList.toggle('hidden', !this.aiming);
    if (this.aiming) {
      // over-the-shoulder: face where the camera looks
      T.dist = damp(T.dist, 2.6, 8, dt); T.height = damp(T.height, 0.35, 8, dt); T.lookY = 1.5; T.side = damp(T.side || 0, 0.55, 8, dt);
      p.h = T.yaw;
      p.action = 'aim';
      p.v = Math.min(p.v, 1.6);
      // people you point a gun at put their hands up
      const tgt = this.targetPed(c, 18);
      if (tgt) {
        const o = W.citizens[tgt.cid];
        if (o && o.duty == null && tgt.action !== 'down') {
          tgt.action = 'hail'; W.peds.stop(tgt, 'hail'); tgt.h = Math.atan2(p.x - tgt.x, p.z - tgt.z);
          P.prompts.push({ key: 'G', text: `Demand ${o.first}'s wallet`, danger: true });
          if (I.hit('KeyG')) this.mug(c, o, tgt);
        }
      }
    } else { if (p.action === 'aim') p.action = ''; if (T.side) T.side = damp(T.side, 0, 8, dt); if (Math.abs(T.side) < 0.01) T.side = 0; }
    // firing
    this.fireT -= dt;
    const down = I.mouse.down[0] && I.locked;
    const edge = down && !this.prevDown;
    this.prevDown = down;
    // V: attack whoever is in front of you, armed or not (guns pistol-whip)
    const front = this.frontPed(c, p, 2.2);
    if (front && !this.aiming) P.prompts.push({ key: 'V', text: `Attack ${W.citizens[front.cid]?.first || 'them'}`, danger: true });
    if (this.fireT <= 0 && (I.hit('KeyV') || (!wp && edge))) { const mw = wp && wp.melee ? this.cur : 'fists'; this.swing(c, p, mw); this.fireT = WEAPONS[mw].rate; return; }
    if (!wp || this.fireT > 0) return;
    if (wp.melee && edge) { this.swing(c, p, this.cur); this.fireT = wp.rate; return; }
    if (!this.aiming) return;
    if (!(edge || (wp.auto && down))) return;
    const L = ensureLife(c, W);
    const ammo = this.ammo(c, this.cur);
    if (ammo <= 0) { if (edge) { g.toast('Out of ammo. Gun stores and the underground sell rounds.', 2); g.audio && g.audio.tone && g.audio.tone('square', 180, 0.05, 0.002, 0.04); } return; }
    if (ammo !== Infinity) L.ammo[this.cur] = ammo - 1;
    this.fireT = wp.rate;
    // aim at whatever is under the crosshair
    const cam = g.renderer.camera;
    cam.getWorldDirection(v3);
    const from = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    const probe = W.combat.ray(from, { x: v3.x, y: v3.y, z: v3.z }, 140, c.id);
    const muzzle = { x: p.x + Math.sin(p.h) * 0.45 + Math.cos(p.h) * 0.22, y: (p.y || 0) + 1.42, z: p.z + Math.cos(p.h) * 0.45 - Math.sin(p.h) * 0.22 };
    const dx = probe.point.x - muzzle.x, dy = probe.point.y - muzzle.y, dz = probe.point.z - muzzle.z;
    const Ld = Math.hypot(dx, dy, dz) || 1;
    W.combat.fire(c, this.cur, muzzle, { x: dx / Ld, y: dy / Ld, z: dz / Ld });
    g.rig.shake = Math.max(g.rig.shake, wp.dmg * 0.6 + (wp.pellets ? 0.4 : 0));
    T.pitch = clamp(T.pitch - wp.dmg * 0.03, -0.25, 1.25);
  }

  frontPed(c, p, range) {
    let best = null, bd = range;
    for (const o of this.W.peds.near(p.x, p.z, range + 0.5)) {
      if (o.cid === c.id || o.action === 'down') continue;
      const d = dist(o.x, o.z, p.x, p.z), ang = Math.atan2(o.x - p.x, o.z - p.z);
      if (d < bd && Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.1) { bd = d; best = o; }
    }
    return best;
  }

  targetPed(c, range) {
    const g = this.game, W = this.W;
    const cam = g.renderer.camera;
    cam.getWorldDirection(v3);
    const r = W.combat.ray({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: v3.x, y: v3.y, z: v3.z }, range + 6, c.id);
    return r.hit === 'ped' ? r.p : null;
  }

  swing(c, p, wid) {
    const W = this.W;
    p.action = 'build';
    setTimeout(() => { if (p.action === 'build') p.action = ''; }, 300);
    let best = null, bd = WEAPONS[wid].range + 0.4;
    for (const o of W.peds.near(p.x, p.z, 3)) {
      if (o.cid === c.id) continue;
      const ang = Math.atan2(o.x - p.x, o.z - p.z);
      if (Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 1.0) continue;
      const d = dist(o.x, o.z, p.x, p.z);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) {
      // nobody there: take it out on the nearest car
      for (const v of W.traffic.vehicles) {
        if (v.hidden || v.state === 'garage' || v.state === 'abstract' || v.state === 'gone' || v.id === c.veh) continue;
        if (dist(v.x, v.z, p.x, p.z) > Math.max(v.len, v.wid) / 2 + 1.2) continue;
        const ang = Math.atan2(v.x - p.x, v.z - p.z);
        if (Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > 1.2) continue;
        W.combat.damageVehicle(v, WEAPONS[wid].dmg * 0.12, c, { x: p.x + Math.sin(p.h), z: p.z + Math.cos(p.h) });
        if (v.alarm === 0 && v.state === 'parked') v.alarm = 4;
        this.game.audio && this.game.audio.impact(3);
        break;
      }
    }
    if (best) {
      const o = W.citizens[best.cid];
      W.combat.melee(c, wid, o);
      this.game.audio && this.game.audio.impact(4);
      // they fight back or run
      if (o.status === 'ok' && best.fallen < 1) {
        const tough = (o.traits.honesty < 0.4 || o.job?.role === 'bouncer' || o.job?.role === 'officer') && rand.chance(0.6);
        if (tough) { setTimeout(() => { if (o.status === 'ok' && c.status === 'ok' && dist(best.x, best.z, p.x, p.z) < 2.2) W.combat.melee(o, 'fists', c); }, 500); }
        else W.peds.walkTo(best, best.x + (best.x - p.x) * 10, best.z + (best.z - p.z) * 10, () => W.citizenAI.resume(o), { run: true, direct: true });
      }
    }
  }

  mug(c, o, tp) {
    const W = this.W, g = this.game;
    const take = Math.round(Math.min(o.money, 20 + rand.float() * 160));
    o.money -= take; c.money += take;
    W.history.citizenLog(o, `Was robbed at gunpoint by ${c.name}`, true);
    W.combat.crimeAgainst(o, c, 'robbed', { x: tp.x, z: tp.z }, 1);
    W.combat.raiseHeat(1.5);
    g.toast(take ? `${o.first} hands over $${take} with shaking hands.` : `${o.first} has nothing on them.`, 3);
    W.peds.walkTo(tp, tp.x + (tp.x - c.ped.x) * 8, tp.z + (tp.z - c.ped.z) * 8, () => W.citizenAI.resume(o), { run: true, direct: true });
  }
}
