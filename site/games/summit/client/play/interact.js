/* Decides what the player is looking at or standing next to, produces the HUD
 * prompt for it, and turns key presses into server actions. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { ACT } from '../../shared/protocol.js';
import { ITEMS } from '../../shared/items.js';
import { FLAG } from '../../shared/protocol.js';
import { describeContents } from '../world/worldobjects.js';

const _v = new THREE.Vector3();

export class Interact {
  constructor(net, worldObjects, climbers, world) {
    this.net = net;
    this.wo = worldObjects;
    this.climbers = climbers;
    this.world = world;
    this.reviveHold = 0;
    this.prompt = null;
    this.carrying = null;
    this.helicopter = null;
  }

  /** Chooses the single best thing to act on right now. */
  resolve(mePos, others, phase) {
    const list = [];

    const downed = others.find((p) => (p.f & FLAG.DOWNED) && !(p.f & FLAG.DEAD) && dist(p, mePos) < 2.4);
    if (downed) list.push({ kind: 'revive', id: downed.i, label: `Hold E — Revive ${downed.n}`, hold: true, dist: dist(downed, mePos) });

    const heli = this.helicopter;
    if (heli && heli.state === 'landed' && mePos.distanceTo(heli.position) < 9) {
      list.push({ kind: 'heli', label: 'E — Board the helicopter', dist: mePos.distanceTo(heli.position), priority: -2 });
    }

    const camp = this.wo.nearestCamp(mePos, 7);
    if (camp) {
      list.push(camp.camp.lit
        ? { kind: 'camp-rest', label: 'Resting — stamina and warmth recovering', passive: true, dist: camp.dist }
        : { kind: 'camp', label: 'E — Light the campfire', dist: camp.dist, priority: -1 });
    }

    const item = this.wo.nearestItem(mePos, 2.8);
    if (item) {
      const label = item.node.open
        ? `E — Take ${describeContents(item.node.contents) || 'contents'}`
        : `E — Open ${item.kind === 'drop' ? 'pack' : item.kind}`;
      list.push({ kind: 'item', id: item.id, label, dist: item.dist });
    }

    const mate = others.find((p) => !(p.f & FLAG.DEAD) && !(p.f & FLAG.DOWNED) && dist(p, mePos) < 2.8);
    if (mate) list.push({ kind: 'mate', id: mate.i, label: `F — Boost ${mate.n} up   ·   R — Throw a rope`, dist: dist(mate, mePos), priority: 1 });

    const dead = others.find((p) => (p.f & FLAG.DEAD) && dist(p, mePos) < 2.6);
    if (dead) list.push({ kind: 'body', id: dead.i, label: `F — Carry ${dead.n}`, dist: dist(dead, mePos), priority: 1 });

    list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.dist - b.dist);
    this.prompt = list[0] || null;
    return this.prompt;
  }

  /** Runs each frame after input is read. */
  update(dt, input, ctx) {
    const net = this.net;
    const p = this.prompt;

    if (p && p.kind === 'revive' && input.down('interact')) {
      this.reviveHold += dt;
      net.act(ACT.REVIVE, { id: p.id, done: this.reviveHold > 1.2 });
      if (this.reviveHold > 1.2) this.reviveHold = 0;
    } else {
      this.reviveHold = 0;
      if (input.hit('interact') && p) {
        if (p.kind === 'item') net.act(ACT.PICKUP, { id: p.id });
        else if (p.kind === 'camp') net.act(ACT.CAMP, {});
        else if (p.kind === 'heli') net.act(ACT.BOARD_HELI, {});
      }
    }

    if (input.hit('help')) {
      if (this.carrying) { net.act(ACT.RELEASE_PLAYER, {}); this.carrying = null; }
      else if (p && p.kind === 'body') { net.act(ACT.GRAB_PLAYER, { id: p.id }); this.carrying = p.id; }
      else if (p && (p.kind === 'mate' || p.kind === 'revive')) net.act(ACT.BOOST, { id: p.id });
    }

    if (input.hit('rope')) {
      const target = p && (p.kind === 'mate' || p.kind === 'revive') ? p.id : ctx.nearestMateId;
      if (target) net.act(ACT.ROPE_THROW, { id: target });
    }

    if (input.hit('ping')) {
      const hit = this.aimPoint(ctx.camera, 90);
      if (hit) net.act(ACT.PING, { x: hit.x, y: hit.y, z: hit.z, kind: input.down('sprint') ? 'danger' : 'mark' });
    }

    if (input.hit('horn')) net.act(ACT.HORN, {});

    const slot = input.takeSlot();
    if (slot >= 0) {
      if (input.down('drop')) net.act(ACT.DROP, { slot });
      else if (input.down('help') && ctx.nearestMateId) net.act(ACT.GIVE, { to: ctx.nearestMateId, slot });
      else net.act(ACT.USE, { slot });
    }
  }

  /** Where the camera is pointing, on the terrain. */
  aimPoint(camera, maxDist = 60) {
    const dir = camera.getWorldDirection(_v.clone());
    const o = camera.getWorldPosition(new THREE.Vector3());
    let t = 1;
    while (t < maxDist) {
      const x = o.x + dir.x * t, y = o.y + dir.y * t, z = o.z + dir.z * t;
      const h = this.world.height(x, z);
      if (y <= h) return new THREE.Vector3(x, h, z);
      t += Math.max(0.5, t * 0.05);
    }
    return null;
  }
}

function dist(p, v) { return Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z); }

/** Human-readable inventory line for the HUD. */
export function slotLabel(slot) {
  if (!slot) return '';
  const def = ITEMS[slot.id];
  return `${def?.name || slot.id}${slot.n > 1 ? ' ×' + slot.n : ''}`;
}
