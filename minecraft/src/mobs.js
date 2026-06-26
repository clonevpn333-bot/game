// ============================================================================
//  Entities: mobs (AI + models), dropped items, arrows, spawning
// ============================================================================
import * as THREE from 'three';
import { GRAVITY, WORLD_HEIGHT, SEA_LEVEL, DIM, clamp } from './constants.js';
import { BLOCK, ITEM } from './ids.js';
import { getBlock, isLiquid } from './blocks.js';
import { itemDef } from './items.js';

// ---- generic entity physics -------------------------------------------------
function solidAt(world, x, y, z) {
  const id = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
  if (id === BLOCK.AIR) return false;
  return getBlock(id).solid;
}
function moveAxis(e, world, axis, amt) {
  if (amt === 0) return false;
  const hw = e.width / 2;
  const p = e.pos;
  const comp = ['x', 'y', 'z'][axis];
  p[comp] += amt;
  const x0 = Math.floor(p.x - hw), x1 = Math.floor(p.x + hw - 1e-5);
  const y0 = Math.floor(p.y), y1 = Math.floor(p.y + e.height - 1e-5);
  const z0 = Math.floor(p.z - hw), z1 = Math.floor(p.z + hw - 1e-5);
  let limit = amt > 0 ? Infinity : -Infinity, hit = false;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    if (!solidAt(world, x, y, z)) continue;
    hit = true;
    const lo = axis === 0 ? x : axis === 1 ? y : z;
    if (amt > 0) limit = Math.min(limit, lo); else limit = Math.max(limit, lo + 1);
  }
  if (!hit) return false;
  const eps = 1e-3;
  if (axis === 0) p.x = amt > 0 ? limit - hw - eps : limit + hw + eps;
  else if (axis === 2) p.z = amt > 0 ? limit - hw - eps : limit + hw + eps;
  else { if (amt > 0) p.y = limit - e.height - eps; else { p.y = limit + eps; e.onGround = true; } }
  e.vel[comp] = 0;
  return true;
}

// ---- model builder ----------------------------------------------------------
function box(w, h, d, color, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  m.userData.base = new THREE.Color(color);
  return m;
}
// leg pivoting at top: geometry translated so pivot is at mesh origin (hip)
function leg(w, h, d, color, x, hipY, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, -h / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, hipY, z);
  m.userData.base = new THREE.Color(color);
  return m;
}

function buildModel(type) {
  const g = new THREE.Group();
  const parts = [], legs = [];
  let head = null;
  const add = (m) => { g.add(m); parts.push(m); return m; };

  if (type === 'cow' || type === 'pig' || type === 'sheep') {
    const body = { cow: 0x4a3528, pig: 0xe39aa6, sheep: 0xece5da };
    const col = body[type];
    const bodyY = 0.75, bodyH = 0.6, bodyL = 1.1;
    add(box(0.7, bodyH, bodyL, col, 0, bodyY, 0));
    head = add(box(0.55, 0.55, 0.5, type === 'cow' ? 0x4a3528 : col, 0, bodyY + 0.18, -bodyL / 2 - 0.15));
    if (type === 'sheep') add(box(0.85, 0.8, 1.25, 0xfdfaf3, 0, bodyY + 0.05, 0)); // wool
    if (type === 'pig') { const s = box(0.18, 0.12, 0.1, 0xd07f8c, 0, bodyY + 0.12, -bodyL / 2 - 0.4); add(s); }
    const lx = 0.22, lz = 0.38, hipY = bodyY - bodyH / 2;
    for (const [sx, sz] of [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]]) legs.push(add(leg(0.18, hipY, 0.18, type === 'cow' ? 0x3a2a20 : col, sx, hipY, sz)));
  } else if (type === 'chicken') {
    add(box(0.4, 0.45, 0.45, 0xf2f2f2, 0, 0.45, 0));
    head = add(box(0.3, 0.3, 0.3, 0xf2f2f2, 0, 0.78, -0.2));
    add(box(0.12, 0.1, 0.1, 0xe0a020, 0, 0.78, -0.4)); // beak
    add(box(0.12, 0.12, 0.08, 0xd02020, 0, 0.92, -0.18)); // comb
    for (const sx of [-0.12, 0.12]) legs.push(add(leg(0.08, 0.25, 0.08, 0xe0a020, sx, 0.25, 0)));
  } else if (type === 'zombie' || type === 'skeleton') {
    const skin = type === 'zombie' ? 0x4f7a3a : 0xdadada;
    const cloth = type === 'zombie' ? 0x3a4f8a : 0xcfcfcf;
    add(box(0.55, 0.7, 0.3, cloth, 0, 1.05, 0));
    head = add(box(0.5, 0.5, 0.5, type === 'zombie' ? 0x4f7a3a : 0xeeeeee, 0, 1.65, 0));
    for (const sx of [-0.37, 0.37]) legs.push(add(leg(0.22, 0.7, 0.22, skin, sx, 1.4, 0))); // arms (anim)
    for (const sx of [-0.16, 0.16]) legs.push(add(leg(0.24, 0.7, 0.24, type === 'zombie' ? 0x32508a : 0xbdbdbd, sx, 0.7, 0)));
  } else if (type === 'creeper') {
    add(box(0.6, 1.1, 0.35, 0x4caf50, 0, 0.95, 0));
    head = add(box(0.5, 0.5, 0.5, 0x57c25b, 0, 1.6, 0));
    for (const [sx, sz] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]]) legs.push(add(leg(0.18, 0.4, 0.18, 0x3f9e44, sx, 0.4, sz)));
  } else if (type === 'spider') {
    add(box(0.7, 0.5, 0.8, 0x2a2320, 0, 0.5, 0.2));
    head = add(box(0.55, 0.45, 0.45, 0x352b26, 0, 0.5, -0.45));
    add(box(0.08, 0.08, 0.08, 0xcc2222, -0.12, 0.58, -0.62));
    add(box(0.08, 0.08, 0.08, 0xcc2222, 0.12, 0.58, -0.62));
    for (let i = 0; i < 4; i++) { const zz = -0.1 + i * 0.18; legs.push(add(leg(0.07, 0.5, 0.5, 0x1d1714, -0.45, 0.55, zz))); legs.push(add(leg(0.07, 0.5, 0.5, 0x1d1714, 0.45, 0.55, zz))); }
  }
  return { group: g, parts, legs, head };
}

// ---- mob definitions --------------------------------------------------------
const DEFS = {
  cow: { hostile: false, hp: 10, width: 0.9, height: 1.4, speed: 1.6, drops: [[ITEM.BEEF_RAW, 1, 3], [ITEM.LEATHER, 0, 2]], xp: 1 },
  pig: { hostile: false, hp: 10, width: 0.9, height: 1.2, speed: 1.7, drops: [[ITEM.PORKCHOP_RAW, 1, 3]], xp: 1 },
  sheep: { hostile: false, hp: 8, width: 0.9, height: 1.3, speed: 1.6, drops: [[ITEM.MUTTON_RAW, 1, 2], [BLOCK.WOOL_WHITE, 1, 1]], xp: 1 },
  chicken: { hostile: false, hp: 4, width: 0.5, height: 0.9, speed: 1.8, drops: [[ITEM.CHICKEN_RAW, 1, 1], [ITEM.FEATHER, 0, 2]], xp: 1, floaty: true },
  zombie: { hostile: true, hp: 20, width: 0.6, height: 1.95, speed: 2.0, dmg: 3, drops: [[ITEM.IRON_INGOT, 0, 1]], xp: 5, burns: true },
  skeleton: { hostile: true, hp: 20, width: 0.6, height: 1.95, speed: 2.1, dmg: 2, ranged: true, drops: [[ITEM.BONE, 1, 2], [ITEM.ARROW, 0, 2]], xp: 5, burns: true },
  creeper: { hostile: true, hp: 20, width: 0.6, height: 1.7, speed: 2.0, dmg: 0, creeper: true, drops: [[ITEM.GUNPOWDER, 1, 2]], xp: 5 },
  spider: { hostile: true, hp: 16, width: 1.0, height: 0.9, speed: 2.6, dmg: 2, drops: [[ITEM.STRING, 1, 2]], xp: 5, neutralDay: true },
};

let _eid = 1;
export class Mob {
  constructor(type, x, y, z) {
    this.kind = 'mob';
    this.type = type;
    this.def = DEFS[type];
    this.id = _eid++;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.width = this.def.width; this.height = this.def.height;
    this.hp = this.def.hp;
    this.yaw = Math.random() * Math.PI * 2;
    this.onGround = false;
    this.state = 'wander';
    this.timer = Math.random() * 2;
    this.attackCd = 0;
    this.fuse = 0;
    this.dead = false;
    this.hurtFlash = 0;
    this.model = buildModel(type);
    this.group = this.model.group;
    this.walkPhase = Math.random() * 6;
  }

  aabb() {
    const hw = this.width / 2;
    return { minX: this.pos.x - hw, maxX: this.pos.x + hw, minY: this.pos.y, maxY: this.pos.y + this.height, minZ: this.pos.z - hw, maxZ: this.pos.z + hw };
  }

  damage(amount, kbDir, mgr) {
    this.hp -= amount; this.hurtFlash = 0.25;
    if (kbDir) { this.vel.x += kbDir.x * 5; this.vel.z += kbDir.z * 5; this.vel.y = 4; }
    if (this.def.hostile === false) { this.state = 'flee'; this.timer = 4; }
    if (this.hp <= 0) this.die(mgr);
  }
  die(mgr) {
    if (this.dead) return;
    this.dead = true;
    for (const [item, min, max] of this.def.drops) {
      const c = min + Math.floor(Math.random() * (max - min + 1));
      if (c > 0) mgr.game.spawnDrop(this.pos.x, this.pos.y + 0.3, this.pos.z, item, c);
    }
    mgr.game.addXP?.(this.def.xp || 0);
    mgr.game.audio?.play?.('mobdeath');
  }
}

// ---- dropped item -----------------------------------------------------------
export class ItemDrop {
  constructor(x, y, z, item, count, sprite) {
    this.kind = 'item';
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
    this.item = item; this.count = count;
    this.width = 0.25; this.height = 0.25;
    this.age = 0; this.onGround = false; this.dead = false;
    this.pickupDelay = 0.5;
    this.group = sprite;
  }
}

// ---- arrow ------------------------------------------------------------------
export class Arrow {
  constructor(x, y, z, dir, owner) {
    this.kind = 'arrow';
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = dir.clone().multiplyScalar(28);
    this.width = 0.1; this.height = 0.1;
    this.life = 4; this.owner = owner; this.dead = false;
    this.group = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.6), new THREE.MeshBasicMaterial({ color: 0x999999 }));
  }
}

// ---- manager ----------------------------------------------------------------
export class MobManager {
  constructor(scene, world, game) {
    this.scene = scene; this.world = world; this.game = game;
    this.mobs = []; this.items = []; this.arrows = [];
    this.spawnTimer = 0;
    this.maxPassive = 26; this.maxHostile = 34;
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  clear() {
    for (const e of [...this.mobs, ...this.items, ...this.arrows]) this.group.remove(e.group);
    this.mobs = []; this.items = []; this.arrows = [];
  }

  spawnMob(type, x, y, z) {
    const m = new Mob(type, x, y, z);
    this.mobs.push(m); this.group.add(m.group);
    return m;
  }
  spawnDrop(x, y, z, item, count) {
    const d = new ItemDrop(x, y, z, item, count, this.game.makeItemSprite(item));
    this.items.push(d); this.group.add(d.group);
  }
  spawnArrow(x, y, z, dir, owner) {
    const a = new Arrow(x, y, z, dir, owner);
    this.arrows.push(a); this.group.add(a.group);
  }

  countHostile() { return this.mobs.filter(m => m.def.hostile).length; }
  countPassive() { return this.mobs.filter(m => !m.def.hostile).length; }

  update(dt, player, dayLight) {
    dt = Math.min(dt, 0.05);
    this._spawnLoop(dt, player, dayLight);
    for (const m of this.mobs) this._updateMob(m, dt, player, dayLight);
    for (const it of this.items) this._updateItem(it, dt, player);
    for (const a of this.arrows) this._updateArrow(a, dt, player);
    this.mobs = this._prune(this.mobs);
    this.items = this._prune(this.items);
    this.arrows = this._prune(this.arrows);
  }
  _prune(arr) {
    const keep = [];
    for (const e of arr) { if (e.dead) this.group.remove(e.group); else keep.push(e); }
    return keep;
  }

  _tint(group, lvl, flash) {
    group.traverse(o => {
      if (o.material && o.userData.base) {
        if (flash) o.material.color.setRGB(1, 0.4, 0.4);
        else o.material.color.copy(o.userData.base).multiplyScalar(clamp(lvl, 0.18, 1));
      }
    });
  }

  _updateMob(m, dt, player, dayLight) {
    const w = this.world;
    const dx = player.pos.x - m.pos.x, dz = player.pos.z - m.pos.z;
    const distXZ = Math.hypot(dx, dz);
    const distY = Math.abs(player.pos.y - m.pos.y);
    m.attackCd = Math.max(0, m.attackCd - dt);
    m.hurtFlash = Math.max(0, m.hurtFlash - dt);
    m.timer -= dt;

    // AI
    let wishX = 0, wishZ = 0, wantJump = false;
    const hostile = m.def.hostile && !(m.def.neutralDay && dayLight > 0.5);
    if (hostile && distXZ < 22 && distY < 5) {
      m.state = 'chase';
      if (m.def.creeper && distXZ < 2.2) {
        m.fuse += dt;
        if (m.fuse > 1.4) { this._explode(m, player); m.dead = true; this.group.remove(m.group); }
      } else if (m.def.ranged && distXZ < 16 && distXZ > 4) {
        if (m.attackCd <= 0) {
          const dir = new THREE.Vector3(dx, (player.pos.y + 1.2) - (m.pos.y + 1.4), dz).normalize();
          this.spawnArrow(m.pos.x, m.pos.y + 1.4, m.pos.z, dir, m);
          m.attackCd = 1.6;
        }
      } else if (distXZ > 1.0) {
        const inv = 1 / (distXZ || 1); wishX = dx * inv; wishZ = dz * inv;
      } else if (m.def.dmg > 0 && m.attackCd <= 0) {
        this.game.damagePlayer(m.def.dmg, m); m.attackCd = 1.0;
      }
      m.yaw = Math.atan2(dx, dz);
    } else if (m.state === 'flee' && m.timer > 0) {
      const inv = 1 / (distXZ || 1); wishX = -dx * inv; wishZ = -dz * inv; m.yaw = Math.atan2(-dx, -dz);
    } else {
      // wander
      if (m.timer <= 0) { m.timer = 2 + Math.random() * 4; m.wanderAng = Math.random() < 0.4 ? null : Math.random() * Math.PI * 2; }
      if (m.wanderAng != null) { wishX = Math.sin(m.wanderAng); wishZ = Math.cos(m.wanderAng); m.yaw = m.wanderAng; }
    }

    // movement
    const moving = (wishX || wishZ);
    const speed = m.def.speed * (m.state === 'flee' ? 1.5 : 1);
    if (moving) { m.vel.x += (wishX * speed - m.vel.x) * Math.min(1, 8 * dt); m.vel.z += (wishZ * speed - m.vel.z) * Math.min(1, 8 * dt); }
    else { m.vel.x *= 0.7; m.vel.z *= 0.7; }

    // gravity / water
    const feet = w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.1), Math.floor(m.pos.z));
    const inWater = feet === BLOCK.WATER;
    m.vel.y -= GRAVITY * (inWater ? 0.3 : 1) * dt;
    if (inWater) { m.vel.y = Math.max(m.vel.y, -2); if (moving) m.vel.y += 6 * dt; }
    m.vel.y = Math.max(m.vel.y, -50);

    m.onGround = false;
    const blockedBefore = m.pos.x, blockedZb = m.pos.z;
    moveAxis(m, w, 0, m.vel.x * dt);
    moveAxis(m, w, 1, m.vel.y * dt);
    moveAxis(m, w, 2, m.vel.z * dt);
    // jump if horizontally blocked
    if (moving && m.onGround && Math.abs(m.pos.x - blockedBefore) < Math.abs(m.vel.x * dt) * 0.5 && Math.abs(m.pos.z - blockedZb) < Math.abs(m.vel.z * dt) * 0.5) {
      m.vel.y = 7.0;
    }

    // zombie/skeleton burn in daylight
    if (m.def.burns && dayLight > 0.75) {
      const sky = w.getSky(Math.floor(m.pos.x), Math.floor(m.pos.y + m.height), Math.floor(m.pos.z));
      if (sky >= 14) { m._burn = (m._burn || 0) + dt; if (m._burn > 1) { m.damage(1, null, this); m._burn = 0; } }
    }
    if (m.pos.y < -20) m.dead = true;

    // place + animate model
    m.group.position.set(m.pos.x, m.pos.y, m.pos.z);
    m.group.rotation.y = m.yaw;
    m.walkPhase += dt * (4 + Math.hypot(m.vel.x, m.vel.z) * 2);
    const swing = (moving || m.def.floaty) ? Math.sin(m.walkPhase) * 0.6 : 0;
    m.model.legs.forEach((l, i) => { l.rotation.x = swing * (i % 2 === 0 ? 1 : -1); });
    if (m.def.creeper && m.fuse > 0) { const s = 1 + Math.sin(performance.now() * 0.03) * 0.1 * m.fuse; m.group.scale.set(s, s, s); }
    const lvl = w.lightLevelAt(Math.floor(m.pos.x), Math.floor(m.pos.y + 1), Math.floor(m.pos.z), dayLight);
    this._tint(m.group, lvl, m.hurtFlash > 0);
  }

  _explode(m, player) {
    const cx = m.pos.x, cy = m.pos.y + 0.5, cz = m.pos.z, R = 3.5;
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) {
      const d = Math.hypot(x, y, z);
      if (d > R) continue;
      const id = this.world.getBlock(Math.floor(cx + x), Math.floor(cy + y), Math.floor(cz + z));
      if (id !== BLOCK.AIR && id !== BLOCK.BEDROCK && getBlock(id).hardness >= 0) {
        if (Math.random() < 1 - d / R) this.world.setBlock(Math.floor(cx + x), Math.floor(cy + y), Math.floor(cz + z), BLOCK.AIR);
      }
    }
    const pd = Math.hypot(player.pos.x - cx, player.pos.y - cy, player.pos.z - cz);
    if (pd < R + 2) this.game.damagePlayer(Math.max(0, (1 - pd / (R + 2)) * 18), m);
    this.game.particles?.explosion?.(cx, cy, cz);
    this.game.audio?.play?.('explode');
  }

  _updateItem(it, dt, player) {
    it.age += dt; it.pickupDelay -= dt;
    if (it.age > 240) { it.dead = true; return; }
    it.vel.y -= GRAVITY * dt;
    it.onGround = false;
    moveAxis(it, this.world, 1, it.vel.y * dt);
    if (it.onGround) { it.vel.x *= 0.6; it.vel.z *= 0.6; }
    moveAxis(it, this.world, 0, it.vel.x * dt);
    moveAxis(it, this.world, 2, it.vel.z * dt);
    // magnet + pickup
    const target = new THREE.Vector3(player.pos.x, player.pos.y + 0.6, player.pos.z);
    const d = target.distanceTo(it.pos);
    if (it.pickupDelay <= 0 && d < 1.9) {
      if (d < 0.7) {
        const left = this.game.inventory.addItem(it.item, it.count);
        if (left === 0) { it.dead = true; this.game.audio?.play?.('pop'); }
        else it.count = left;
      } else {
        // kinematic magnet — guarantees convergence
        it.pos.lerp(target, Math.min(1, 9 * dt));
        it.vel.set(0, 0, 0);
      }
    }
    it.group.position.set(it.pos.x, it.pos.y + 0.25 + Math.sin(it.age * 3) * 0.06, it.pos.z);
    it.group.lookAt(player.camera.position);
  }

  _updateArrow(a, dt, player) {
    a.life -= dt; if (a.life <= 0) { a.dead = true; return; }
    a.vel.y -= GRAVITY * 0.4 * dt;
    a.pos.addScaledVector(a.vel, dt);
    if (solidAt(this.world, a.pos.x, a.pos.y, a.pos.z)) { a.dead = true; return; }
    if (a.owner && a.owner.kind === 'mob') {
      if (player.pos.distanceTo(a.pos) < 0.8) { this.game.damagePlayer(2, a.owner); a.dead = true; return; }
    } else {
      for (const m of this.mobs) { const bb = m.aabb(); if (a.pos.x > bb.minX && a.pos.x < bb.maxX && a.pos.y > bb.minY && a.pos.y < bb.maxY && a.pos.z > bb.minZ && a.pos.z < bb.maxZ) { m.damage(4, a.vel, this); a.dead = true; break; } }
    }
    a.group.position.copy(a.pos);
    a.group.lookAt(a.pos.clone().add(a.vel));
  }

  _spawnLoop(dt, player, dayLight) {
    if (this.world.dim === DIM.END) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = 1.2;
    const night = dayLight < 0.35;
    const wantHostile = (night || this.world.dim === DIM.NETHER) && this.countHostile() < this.maxHostile;
    const wantPassive = !night && dayLight > 0.5 && this.countPassive() < this.maxPassive && this.world.dim === DIM.OVERWORLD;
    if (!wantHostile && !wantPassive) return;

    for (let attempt = 0; attempt < 6; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 18;
      const wx = Math.floor(player.pos.x + Math.cos(ang) * r);
      const wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.isLoaded(wx, wz)) continue;
      const gy = this.world.highestY(wx, wz);
      const top = this.world.getBlock(wx, gy, wz);
      const spawnY = gy + 1;
      if (this.world.getBlock(wx, spawnY, wz) !== BLOCK.AIR) continue;
      const blockLight = this.world.getBlockLight(wx, spawnY, wz);
      const sky = this.world.getSky(wx, spawnY, wz);
      const lvl = Math.max(blockLight, sky * dayLight);

      if (wantHostile && lvl < 7) { // dark enough for hostile spawns
        const types = this.world.dim === DIM.NETHER ? ['zombie'] : ['zombie', 'zombie', 'skeleton', 'creeper', 'spider'];
        const t = types[Math.floor(Math.random() * types.length)];
        this.spawnMob(t, wx + 0.5, spawnY, wz + 0.5);
        return;
      }
      if (wantPassive && (top === BLOCK.GRASS || top === BLOCK.GRASS_BLOCK_SNOW) && sky >= 9) {
        const types = ['cow', 'pig', 'sheep', 'chicken'];
        const t = types[Math.floor(Math.random() * types.length)];
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.spawnMob(t, wx + 0.5 + (Math.random() - 0.5), spawnY, wz + 0.5 + (Math.random() - 0.5));
        return;
      }
    }
  }

  // player attack: ray vs mob aabb
  attackRay(origin, dir, reach, damage, weaponKb) {
    let best = null, bestT = reach;
    for (const m of this.mobs) {
      const t = rayAABB(origin, dir, m.aabb());
      if (t != null && t < bestT) { bestT = t; best = m; }
    }
    if (best) {
      const kb = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      best.damage(damage, kb, this);
      this.game.audio?.play?.('hit');
      return true;
    }
    return false;
  }

  serialize() {
    return this.mobs.filter(m => !m.dead).slice(0, 60).map(m => [m.type, m.pos.x, m.pos.y, m.pos.z, m.hp]);
  }
  load(data) {
    if (!data) return;
    for (const [t, x, y, z, hp] of data) { const m = this.spawnMob(t, x, y, z); if (hp) m.hp = hp; }
  }
}

function rayAABB(o, d, b) {
  let tmin = 0, tmax = Infinity;
  for (const ax of ['x', 'y', 'z']) {
    const lo = b['min' + ax.toUpperCase()], hi = b['max' + ax.toUpperCase()];
    if (Math.abs(d[ax]) < 1e-8) { if (o[ax] < lo || o[ax] > hi) return null; }
    else {
      let t1 = (lo - o[ax]) / d[ax], t2 = (hi - o[ax]) / d[ax];
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}
