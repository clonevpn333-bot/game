// ============================================================================
//  Player: movement physics, collision, voxel raycast, break / place
// ============================================================================
import * as THREE from 'three';
import {
  GRAVITY, TERMINAL_VELOCITY, PLAYER_HEIGHT, PLAYER_EYE, PLAYER_WIDTH,
  WALK_SPEED, SPRINT_SPEED, SNEAK_SPEED, JUMP_VELOCITY, FLY_SPEED, SWIM_SPEED, clamp,
} from './constants.js';
import { BLOCK, TIER } from './ids.js';
import { getBlock, isLiquid } from './blocks.js';
import { itemDef } from './items.js';

const HW = PLAYER_WIDTH / 2;

export class Player {
  constructor(camera, world, game) {
    this.camera = camera;
    this.world = world;
    this.game = game;
    this.pos = new THREE.Vector3(0, 80, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.inWater = false;
    this.inLava = false;
    this.onLadder = false;
    this.flying = false;
    this.sneaking = false;
    this.sprinting = false;
    this.mode = 'survival';     // survival | creative
    this.reach = 5;
    this.target = null;          // {x,y,z, nx,ny,nz, px,py,pz}
    this.breakProgress = 0;
    this.breakTarget = null;
    this.attackCooldown = 0;
    this.placeCooldown = 0;
    this._lastSpace = 0;

    // stats
    this.maxHealth = 20; this.health = 20;
    this.hunger = 20; this.saturation = 5; this.exhaustion = 0;
    this.air = 300; this.maxAir = 300;
    this.xp = 0; this.xpLevel = 0;
    this.fallStart = null;
    this.invulnerable = 0;
    this.dead = false;
  }

  setMode(m) { this.mode = m; this.reach = m === 'creative' ? 6 : 5; if (m !== 'creative') this.flying = false; }

  eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + (this.sneaking ? PLAYER_EYE - 0.15 : PLAYER_EYE), this.pos.z); }

  // ---- physics ----
  update(dt, input) {
    if (this.dead) return;
    dt = Math.min(dt, 0.05);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    if (this.invulnerable > 0) this.invulnerable -= dt;

    this._look(input);
    this._fluidState();

    this.sneaking = input.key('ShiftLeft') && this.onGround && !this.flying;
    this.sprinting = (input.key('ControlLeft') || input.sprintToggle) && input.key('KeyW') && !this.sneaking;

    // creative fly toggle: double-tap space
    if (this.mode === 'creative' && input.pressed('Space')) {
      const now = performance.now();
      if (now - this._lastSpace < 300) { this.flying = !this.flying; this.vel.y = 0; }
      this._lastSpace = now;
    }

    if (this.flying) this._flyMove(dt, input);
    else this._walkMove(dt, input);

    this._interact(dt, input);
    this.camera.position.copy(this.eyePos());
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); // z=0: never roll/slant

    // void / lava / drown damage handled in survival; here track fall + air
    this._fallAndAir(dt);
    if (this.pos.y < -32) this.takeDamage(8 * dt, 'void');
  }

  _look(input) {
    const s = 0.0022 * (this.game.settings?.sensitivity || 1);
    this.yaw -= input.mouseDX * s;
    this.pitch -= input.mouseDY * s;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
    input.mouseDX = 0; input.mouseDY = 0;
  }

  _fluidState() {
    const eb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + PLAYER_EYE), Math.floor(this.pos.z));
    const fb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.2), Math.floor(this.pos.z));
    this.inWater = (eb === BLOCK.WATER) || (fb === BLOCK.WATER);
    this.inLava = (eb === BLOCK.LAVA) || (fb === BLOCK.LAVA);
    this.headInWater = (eb === BLOCK.WATER);
    const cb = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.9), Math.floor(this.pos.z));
    this.onLadder = (cb === BLOCK.LADDER);
  }

  _wishDir(input) {
    let fx = 0, fz = 0;
    if (input.key('KeyW')) fz -= 1;
    if (input.key('KeyS')) fz += 1;
    if (input.key('KeyA')) fx -= 1;
    if (input.key('KeyD')) fx += 1;
    const len = Math.hypot(fx, fz);
    if (len > 0) { fx /= len; fz /= len; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    return { x: fx * cos - fz * sin, z: fx * sin + fz * cos, moving: len > 0 };
  }

  _flyMove(dt, input) {
    const dir = this._wishDir(input);
    let speed = FLY_SPEED * (this.sprinting ? 2.2 : 1) * (input.key('ControlLeft') ? 2 : 1);
    this.vel.x = dir.x * speed;
    this.vel.z = dir.z * speed;
    this.vel.y = 0;
    if (input.key('Space')) this.vel.y = speed;
    if (input.key('ShiftLeft')) this.vel.y = -speed;
    this._move(dt);
  }

  _walkMove(dt, input) {
    const dir = this._wishDir(input);
    let speed = this.sneaking ? SNEAK_SPEED : (this.sprinting ? SPRINT_SPEED : WALK_SPEED);
    if (this.inWater || this.inLava) speed = SWIM_SPEED;

    const accel = this.onGround ? 14 : 5;
    const targetX = dir.x * speed, targetZ = dir.z * speed;
    this.vel.x += (targetX - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (targetZ - this.vel.z) * Math.min(1, accel * dt);

    if (this.inWater || this.inLava) {
      this.vel.y -= GRAVITY * 0.28 * dt;
      this.vel.y = Math.max(this.vel.y, -3.5);
      if (input.key('Space')) this.vel.y = 4.0;
      this.vel.y *= 0.92;
    } else if (this.onLadder) {
      this.vel.y = input.key('Space') ? 3.0 : (input.key('ShiftLeft') ? -3.0 : (dir.moving ? 2.2 : -1.5));
    } else {
      this.vel.y -= GRAVITY * dt;
      this.vel.y = Math.max(this.vel.y, -TERMINAL_VELOCITY);
      if (input.key('Space') && this.onGround) { this.vel.y = JUMP_VELOCITY; this.onGround = false; this.exhaustion += this.sprinting ? 0.2 : 0.05; }
    }
    this._move(dt);
  }

  _move(dt) {
    this.onGround = false;
    this._moveAxis(0, this.vel.x * dt);
    const wasAir = this.vel.y;
    this._moveAxis(1, this.vel.y * dt);
    this._moveAxis(2, this.vel.z * dt);
  }

  _solidAABB(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (id === BLOCK.AIR) return false;
    const b = getBlock(id);
    return b.solid;
  }

  _moveAxis(axis, amt) {
    if (amt === 0) return;
    const p = this.pos;
    const comp = ['x', 'y', 'z'][axis];
    p[comp] += amt;
    const minX = p.x - HW, maxX = p.x + HW;
    const minY = p.y, maxY = p.y + PLAYER_HEIGHT;
    const minZ = p.z - HW, maxZ = p.z + HW;
    const x0 = Math.floor(minX), x1 = Math.floor(maxX - 1e-5);
    const y0 = Math.floor(minY), y1 = Math.floor(maxY - 1e-5);
    const z0 = Math.floor(minZ), z1 = Math.floor(maxZ - 1e-5);
    let limit = amt > 0 ? Infinity : -Infinity, hit = false;
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          if (!this._solidAABB(x, y, z)) continue;
          hit = true;
          const lo = axis === 0 ? x : axis === 1 ? y : z;
          if (amt > 0) limit = Math.min(limit, lo); else limit = Math.max(limit, lo + 1);
        }
    if (!hit) return;
    const eps = 1e-3;
    if (axis === 0) p.x = amt > 0 ? limit - HW - eps : limit + HW + eps;
    else if (axis === 2) p.z = amt > 0 ? limit - HW - eps : limit + HW + eps;
    else {
      if (amt > 0) p.y = limit - PLAYER_HEIGHT - eps;
      else { p.y = limit + eps; this.onGround = true; }
    }
    this.vel[comp] = 0;
  }

  _fallAndAir(dt) {
    // fall damage
    if (!this.onGround && this.vel.y < 0 && this.fallStart === null && !this.inWater && !this.flying && !this.onLadder) {
      this.fallStart = this.pos.y;
    }
    if (this.fallStart !== null && (this.onGround || this.inWater || this.flying || this.onLadder)) {
      const dist = this.fallStart - this.pos.y;
      if (this.onGround && dist > 3.0 && !this.inWater) {
        const dmg = Math.floor(dist - 3.0);
        if (dmg > 0) { this.takeDamage(dmg, 'fall'); this.game.audio?.play('hurt'); }
      }
      this.fallStart = null;
    }
    if (this.fallStart !== null && this.pos.y > this.fallStart) this.fallStart = this.pos.y;

    // air / drowning
    if (this.headInWater) {
      this.air -= dt * 20;
      if (this.air <= 0) { this.air = 0; this._drownTick = (this._drownTick || 0) + dt; if (this._drownTick > 1) { this.takeDamage(2, 'drown'); this._drownTick = 0; } }
    } else { this.air = Math.min(this.maxAir, this.air + dt * 60); this._drownTick = 0; }
    if (this.inLava) { this._lavaTick = (this._lavaTick || 0) + dt; if (this._lavaTick > 0.5) { this.takeDamage(2, 'lava'); this._lavaTick = 0; } }
  }

  takeDamage(amount, source) {
    if (this.dead || this.mode === 'creative') return;
    if (this.invulnerable > 0 && source !== 'void' && source !== 'lava' && source !== 'drown') return;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.5;
    this.game.onHurt?.(amount, source);
    if (this.health <= 0) this.die();
  }
  heal(a) { this.health = Math.min(this.maxHealth, this.health + a); }
  die() { this.dead = true; this.game.onDeath?.(); }
  respawn(x, y, z) {
    this.dead = false; this.health = this.maxHealth; this.hunger = 20; this.saturation = 5;
    this.air = this.maxAir; this.vel.set(0, 0, 0); this.pos.set(x + 0.5, y, z + 0.5); this.fallStart = null;
  }

  // ---- voxel raycast ----
  raycast(maxDist) {
    const o = this.eyePos();
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')).normalize();
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;
    let tMaxX = stepX > 0 ? (x + 1 - o.x) / dir.x : stepX < 0 ? (x - o.x) / dir.x : Infinity;
    let tMaxY = stepY > 0 ? (y + 1 - o.y) / dir.y : stepY < 0 ? (y - o.y) / dir.y : Infinity;
    let tMaxZ = stepZ > 0 ? (z + 1 - o.z) / dir.z : stepZ < 0 ? (z - o.z) / dir.z : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxDist) {
      const id = this.world.getBlock(x, y, z);
      if (id !== BLOCK.AIR && !isLiquid(id)) {
        return { x, y, z, nx, ny, nz, px: x + nx, py: y + ny, pz: z + nz, id, dist: t };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
    return null;
  }

  // ---- interaction ----
  _interact(dt, input) {
    this.target = this.raycast(this.reach);

    // mining
    if (input.mouseLeft && this.target) {
      this._mine(dt, input);
    } else {
      this.breakProgress = 0; this.breakTarget = null;
    }

    // attack mobs (edge)
    if (input.pressed('mouseLeft')) {
      this.game.tryAttack?.();
    }

    // use / place (edge or held with cooldown)
    if (input.mouseRight && this.placeCooldown <= 0) {
      if (this._use(input)) this.placeCooldown = 0.22;
    }
  }

  heldItem() { return this.game.inventory.held(); }

  _mine(dt, input) {
    const t = this.target;
    const b = getBlock(t.id);
    if (b.hardness < 0) return; // unbreakable
    if (this.mode === 'creative') {
      this._breakBlock(t, true);
      this.placeCooldown = 0.1;
      input.consume('mouseLeft');
      return;
    }
    if (!this.breakTarget || this.breakTarget.x !== t.x || this.breakTarget.y !== t.y || this.breakTarget.z !== t.z) {
      this.breakTarget = t; this.breakProgress = 0;
    }
    const time = this._breakTime(b);
    this.breakProgress += dt / time;
    this.game.audio?.tick?.('dig');
    if (this.breakProgress >= 1) {
      this._breakBlock(t, this._canHarvest(b));
      this.breakProgress = 0; this.breakTarget = null;
      this.exhaustion += 0.005;
    }
  }

  _toolFor() {
    const held = this.heldItem();
    if (!held) return null;
    const d = itemDef(held.id);
    return (d && d.tool) ? d : null;
  }
  _canHarvest(b) {
    if (b.minTier <= TIER.HAND) return true;
    const tool = this._toolFor();
    return tool && tool.tool === b.tool && tool.tier >= b.minTier;
  }
  _breakTime(b) {
    if (b.hardness === 0) return 0.05;
    const tool = this._toolFor();
    let mult = 1;
    if (tool && tool.tool === b.tool) mult = tool.speed;
    const harvest = this._canHarvest(b);
    return Math.max(0.05, (b.hardness * (harvest ? 1.5 : 5)) / mult);
  }

  _breakBlock(t, harvest) {
    const b = getBlock(t.id);
    const drops = harvest ? this._rollDrops(b, t.id) : [];
    this.world.setBlock(t.x, t.y, t.z, BLOCK.AIR);
    // gravity blocks above? (sand/gravel) — let world handle on next neighbour update; simple: drop one
    this.game.onBlockBroken?.(t, b);
    for (const d of drops) this.game.spawnDrop?.(t.x + 0.5, t.y + 0.5, t.z + 0.5, d.item, d.count);
    if (b.drops && b.drops.xp) this.game.addXP?.(b.drops.xp);
    // tool durability
    const held = this.heldItem();
    if (held) { const hd = itemDef(held.id); if (hd && hd.durability) this.game.inventory.damageHeld(1); }
    this.game.audio?.play?.('break');
    this.game.particles?.blockBreak?.(t.x + 0.5, t.y + 0.5, t.z + 0.5, t.id);
  }

  _rollDrops(b, id) {
    const out = [];
    const r = Math.random;
    const dd = b.drops;
    if (dd === undefined || dd === null) { out.push({ item: id, count: 1 }); return out; }
    if (dd.item === -1) {
      // special: leaves saplings/apples, gravel flint, etc.
    } else if (dd.item != null) {
      out.push({ item: dd.item, count: dd.count || 1 });
    }
    if (dd.flint && r() < dd.flint) out.push({ item: 265, count: 1 });
    if (dd.sapling && r() < dd.sapling) out.push({ item: 256, count: 1 }); // leaves -> stick
    if (dd.apple && r() < dd.apple) out.push({ item: 268, count: 1 });
    if (dd.seeds && r() < dd.seeds) out.push({ item: 270, count: 1 });
    return out;
  }

  _use(input) {
    const t = this.target;
    const held = this.heldItem();
    // interact with containers / tables first
    if (t) {
      const tb = getBlock(t.id);
      if (!input.key('ShiftLeft')) {
        if (t.id === BLOCK.CRAFTING_TABLE) { this.game.openCrafting?.(); return true; }
        if (t.id === BLOCK.FURNACE || t.id === BLOCK.FURNACE_LIT) { this.game.openFurnace?.(t); return true; }
        if (t.id === BLOCK.CHEST) { this.game.openChest?.(t); return true; }
      }
    }
    if (!held) return false;
    const d = itemDef(held.id);

    // eat food
    if (d.food && this.hunger < 20) {
      this.game.eat?.(d, held);
      return true;
    }
    // bucket fluids
    if (d.placeFluid != null && t) {
      this.world.setBlock(t.px, t.py, t.pz, d.placeFluid);
      this.game.inventory.replaceHeld(d.empties);
      return true;
    }
    if (held.id === 333 /*bucket*/ && t && isLiquid(t.id)) { /* handled by raycast skipping liquids; skip */ }

    // flint and steel -> nether portal ignite (place portal block in obsidian frame, simplified)
    if (d.igniter && t) { this.game.tryIgnitePortal?.(t); return true; }

    // place block
    if (d.isBlock) return this._placeBlock(d.blockId, input);
    // plant seeds on farmland/grass
    if (d.plantable && t && (t.id === BLOCK.FARMLAND)) {
      this.world.setBlock(t.px, t.py, t.pz, d.plantable);
      this.game.inventory.consumeHeld(1);
      return true;
    }
    // hoe -> farmland
    if (d.tool === 'hoe' && t && (t.id === BLOCK.GRASS || t.id === BLOCK.DIRT) && t.ny === 0 && this.world.getBlock(t.x, t.y + 1, t.z) === BLOCK.AIR) {
      this.world.setBlock(t.x, t.y, t.z, BLOCK.FARMLAND); return true;
    }
    return false;
  }

  _placeBlock(blockId, input) {
    const t = this.target;
    if (!t) return false;
    const px = t.px, py = t.py, pz = t.pz;
    if (this.world.getBlock(px, py, pz) !== BLOCK.AIR) return false;
    // don't place inside player
    const minX = this.pos.x - HW, maxX = this.pos.x + HW;
    const minY = this.pos.y, maxY = this.pos.y + PLAYER_HEIGHT;
    const minZ = this.pos.z - HW, maxZ = this.pos.z + HW;
    const b = getBlock(blockId);
    if (b.solid && px + 1 > minX && px < maxX && py + 1 > minY && py < maxY && pz + 1 > minZ && pz < maxZ) return false;
    this.world.setBlock(px, py, pz, blockId);
    if (this.mode !== 'creative') this.game.inventory.consumeHeld(1);
    this.game.audio?.play?.('place');
    return true;
  }
}
