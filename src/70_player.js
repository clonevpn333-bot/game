/* =========================================================================
 * PLAYER — inventory, physics, mining, placing, hunger, XP and combat.
 * ========================================================================= */

var INV_HOTBAR = 9, INV_MAIN = 27, INV_SIZE = INV_HOTBAR + INV_MAIN;

function makeStack(item, count, dur, ench) {
  return { item: item, count: count === undefined ? 1 : count, dur: dur || 0, ench: ench || null };
}
function stackMax(s) { var it = s && ITEMS[s.item]; return it ? it.stack : 64; }
function sameStack(a, b) {
  if (!a || !b) return false;
  if (a.item !== b.item) return false;
  if (a.dur !== b.dur) return false;
  if ((a.ench ? 1 : 0) !== (b.ench ? 1 : 0)) return false;
  if (a.ench && JSON.stringify(a.ench) !== JSON.stringify(b.ench)) return false;
  return true;
}

function makePlayer(game) {
  var p = {
    x: 0.5, y: 120, z: 0.5, vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0, w: 0.6, h: 1.8, camY: 121.62,
    dim: DIM_OVERWORLD, onGround: false, inWater: false, inLava: false, submerged: false,
    sneaking: false, sprinting: false, flying: false, creative: false, spectator: false,
    hp: 20, maxHp: 20, food: 20, saturation: 5, exhaustion: 0, air: 300, maxAir: 300,
    xp: 0, level: 0, hurtTime: 0, invuln: 0, dead: false, deathTime: 0,
    inv: new Array(INV_SIZE), armor: [null, null, null, null], offhand: null,
    sel: 0, cursor: null, bobPhase: 0, bobAmt: 0, lastX: 0, lastZ: 0,
    fallStart: null, effects: {}, spawnX: 0, spawnY: 0, spawnZ: 0, spawnDim: DIM_OVERWORLD,
    swimming: false, sprintTime: 0, jumpTicks: 0, useTime: 0, eating: null,
    breaking: null, breakProgress: 0, breakTotal: 0, attackCooldown: 0, lastSwing: -99,
    portalTime: 0, portalCool: 0, elytraFlying: false, stepSoundDist: 0
  };
  for (var i = 0; i < INV_SIZE; i++) p.inv[i] = null;
  return p;
}

/* --------------------------------------------------------- inventory -- */
function giveItem(game, item, count) {
  var p = game.player;
  var max = ITEMS[item] ? ITEMS[item].stack : 64;
  /* top up existing stacks first, hotbar before backpack, like the real thing */
  for (var pass = 0; pass < 2; pass++) {
    for (var i = 0; i < INV_SIZE; i++) {
      var s = p.inv[i];
      if (pass === 0) {
        if (!s || s.item !== item || s.dur || s.ench) continue;
        var room = max - s.count;
        if (room <= 0) continue;
        var move = Math.min(room, count);
        s.count += move; count -= move;
      } else {
        if (s) continue;
        var take = Math.min(max, count);
        p.inv[i] = makeStack(item, take);
        count -= take;
      }
      if (count <= 0) { game.ui.dirty = true; return 0; }
    }
  }
  game.ui.dirty = true;
  return count;
}
function countItem(game, item) {
  var n = 0, p = game.player;
  for (var i = 0; i < INV_SIZE; i++) if (p.inv[i] && p.inv[i].item === item) n += p.inv[i].count;
  return n;
}
function consumeItem(game, item, count) {
  var p = game.player;
  for (var i = 0; i < INV_SIZE && count > 0; i++) {
    var s = p.inv[i];
    if (!s || s.item !== item) continue;
    var take = Math.min(s.count, count);
    s.count -= take; count -= take;
    if (s.count <= 0) p.inv[i] = null;
  }
  game.ui.dirty = true;
  return count === 0;
}
function heldStack(p) { return p.inv[p.sel]; }
function heldItem(p) { var s = p.inv[p.sel]; return s ? s.item : null; }
function damageHeld(game, amount) {
  var p = game.player;
  if (p.creative) return;
  var s = p.inv[p.sel];
  if (!s) return;
  var it = ITEMS[s.item];
  if (!it || !it.durability) return;
  var unb = enchLevel(s, 'unbreaking');
  if (unb && Math.random() < unb / (unb + 1)) return;
  s.dur += amount;
  if (s.dur >= it.durability) {
    p.inv[p.sel] = null;
    playSound(game, 'break', p.x, p.y, p.z);
  }
  game.ui.dirty = true;
}
function enchLevel(stack, id) {
  if (!stack || !stack.ench) return 0;
  for (var i = 0; i < stack.ench.length; i++) if (stack.ench[i].id === id) return stack.ench[i].lvl;
  return 0;
}
function dropHeld(game, all) {
  var p = game.player;
  var s = p.inv[p.sel];
  if (!s) return;
  var n = all ? s.count : 1;
  s.count -= n;
  var f = 0.4;
  var e = dropItem(game, p.dim, p.x, p.camY - 0.3, p.z, s.item, n, true);
  e.vx = Math.cos(p.pitch) * Math.sin(p.yaw) * 8; e.vy = Math.sin(p.pitch) * 8 + 1.5;
  e.vz = -Math.cos(p.pitch) * Math.cos(p.yaw) * 8;
  e.pickupDelay = 1.0;
  if (s.count <= 0) p.inv[p.sel] = null;
  game.ui.dirty = true;
}

/* -------------------------------------------------------------- XP ---- */
function xpForLevel(l) { return l <= 15 ? 2 * l + 7 : (l <= 30 ? 5 * l - 38 : 9 * l - 158); }
function addXP(game, amount) {
  var p = game.player;
  p.xp += amount;
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    if (p.level % 5 === 0) playSound(game, 'levelup', p.x, p.y, p.z);
    /* mending: spend XP repairing worn gear before it reaches the bar */
  }
  game.ui.dirty = true;
}
function spendLevels(game, n) {
  var p = game.player;
  if (p.level < n) return false;
  p.level -= n; p.xp = 0;
  game.ui.dirty = true;
  return true;
}

/* ------------------------------------------------------------ damage -- */
function armorPoints(p) {
  var pts = 0, tough = 0;
  for (var i = 0; i < 4; i++) {
    var s = p.armor[i];
    if (!s) continue;
    var it = ITEMS[s.item];
    if (!it) continue;
    pts += it.armor; tough += it.toughness;
  }
  return { pts: pts, tough: tough };
}
function armorEnch(p, id) {
  var n = 0;
  for (var i = 0; i < 4; i++) n += enchLevel(p.armor[i], id);
  return n;
}
function playerHurt(game, amount, source, bypassArmor) {
  var p = game.player;
  if (p.dead || p.creative || p.spectator) return;
  if (p.invuln > 0) return;
  if (!bypassArmor) {
    var a = armorPoints(p);
    var epf = armorEnch(p, 'protection');
    amount = amount * (1 - Math.min(20, Math.max(a.pts / 5, a.pts - amount / (2 + a.tough / 4))) / 25);
    amount *= (1 - Math.min(0.8, epf * 0.04));
    /* armour wears down when it takes a hit */
    for (var i = 0; i < 4; i++) if (p.armor[i]) {
      var s = p.armor[i], it = ITEMS[s.item];
      s.dur += 1;
      if (s.dur >= it.durability) p.armor[i] = null;
    }
  }
  p.hp -= amount;
  p.hurtTime = 0.4;
  p.invuln = 0.5;
  game.shake = Math.max(game.shake, Math.min(0.35, amount * 0.05));
  game.damageFlash = 1;
  playSound(game, 'hurt', p.x, p.y, p.z, 1.0);
  if (source && source.x !== undefined) {
    var dx = p.x - source.x, dz = p.z - source.z;
    var d = Math.hypot(dx, dz) || 1;
    p.vx += dx / d * 5.5; p.vz += dz / d * 5.5; p.vy = Math.max(p.vy, 5.0);
  }
  if (p.hp <= 0) playerDie(game);
  game.ui.dirty = true;
}
function playerDie(game) {
  var p = game.player;
  if (p.dead) return;
  /* the totem of undying gets one chance to save you */
  for (var i = 0; i < INV_SIZE; i++) {
    if (p.inv[i] && p.inv[i].item === 'totem_of_undying') {
      p.inv[i].count--; if (p.inv[i].count <= 0) p.inv[i] = null;
      p.hp = 1; p.dead = false; p.effects.regen = 40; p.effects.fireres = 40;
      playSound(game, 'levelup', p.x, p.y, p.z);
      game.totemFlash = 1;
      return;
    }
  }
  p.dead = true; p.hp = 0; p.deathTime = 0;
  if (!p.creative) {
    for (var j = 0; j < INV_SIZE; j++) if (p.inv[j]) { dropItem(game, p.dim, p.x, p.y + 1, p.z, p.inv[j].item, p.inv[j].count, true); p.inv[j] = null; }
    for (var k = 0; k < 4; k++) if (p.armor[k]) { dropItem(game, p.dim, p.x, p.y + 1, p.z, p.armor[k].item, 1, true); p.armor[k] = null; }
    spawnXP(game, p.dim, p.x, p.y + 1, p.z, Math.min(100, p.level * 7));
    p.level = 0; p.xp = 0;
  }
  playSound(game, 'death', p.x, p.y, p.z);
  showScreen(game, 'death');
}
function respawnPlayer(game) {
  var p = game.player;
  p.dead = false; p.hp = p.maxHp; p.food = 20; p.saturation = 5; p.air = p.maxAir;
  p.dim = p.spawnDim;
  p.vx = p.vy = p.vz = 0;
  p.effects = {};
  var sy = game.world.getHeight(p.dim, Math.floor(p.spawnX), Math.floor(p.spawnZ)) + 1;
  p.x = p.spawnX + 0.5; p.z = p.spawnZ + 0.5;
  p.y = Math.max(sy, p.spawnY);
  hideScreen(game);
  game.ui.dirty = true;
}

/* -------------------------------------------------------- ray picking -- */
function raycastBlocks(world, dim, ox, oy, oz, dx, dy, dz, maxDist, fluids) {
  var x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  var stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  var tDX = dx === 0 ? Infinity : Math.abs(1 / dx);
  var tDY = dy === 0 ? Infinity : Math.abs(1 / dy);
  var tDZ = dz === 0 ? Infinity : Math.abs(1 / dz);
  var tMX = dx === 0 ? Infinity : ((dx > 0 ? (x + 1 - ox) : (ox - x)) * tDX);
  var tMY = dy === 0 ? Infinity : ((dy > 0 ? (y + 1 - oy) : (oy - y)) * tDY);
  var tMZ = dz === 0 ? Infinity : ((dz > 0 ? (z + 1 - oz) : (oz - z)) * tDZ);
  var face = -1, t = 0;
  for (var i = 0; i < 320; i++) {
    var raw = world.getRaw(dim, x, y, z);
    var id = raw & ID_MASK;
    if (id !== 0) {
      var b = BLOCKS[id];
      var pickable = fluids ? true : (b.collide && !b.liquid) || (b.pickable !== false && !b.liquid && b.render !== 'none' && b.hard >= 0 && !b.replaceable);
      if (fluids && b.liquid) pickable = true;
      if (!b.liquid && b.render !== 'none' && !b.replaceable) pickable = true;
      if (b.liquid && !fluids) pickable = false;
      if (b.replaceable && !b.liquid) pickable = false;
      if (pickable) {
        var boxes = blockBoxesFor(id, (raw >>> ST_SHIFT) & 15) ||
          (b.render === 'flat' || b.render === 'cross' ? [[0.15, 0, 0.15, 0.85, 0.9, 0.85]] : FULLBOX1);
        var hit = rayBoxes(ox, oy, oz, dx, dy, dz, x, y, z, boxes, maxDist);
        if (hit) return { x: x, y: y, z: z, face: hit.face, t: hit.t, id: id, st: (raw >>> ST_SHIFT) & 15,
          px: ox + dx * hit.t, py: oy + dy * hit.t, pz: oz + dz * hit.t };
      }
    }
    if (tMX < tMY && tMX < tMZ) { x += stepX; t = tMX; tMX += tDX; face = stepX > 0 ? 1 : 0; }
    else if (tMY < tMZ) { y += stepY; t = tMY; tMY += tDY; face = stepY > 0 ? 3 : 2; }
    else { z += stepZ; t = tMZ; tMZ += tDZ; face = stepZ > 0 ? 5 : 4; }
    if (t > maxDist) return null;
  }
  return null;
}
function rayBoxes(ox, oy, oz, dx, dy, dz, bx, by, bz, boxes, maxDist) {
  var best = null;
  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    var x0 = bx + b[0], y0 = by + b[1], z0 = bz + b[2];
    var x1 = bx + b[3], y1 = by + b[4], z1 = bz + b[5];
    var tmin = 0, tmax = maxDist, face = -1;
    var axes = [[ox, dx, x0, x1, 0, 1], [oy, dy, y0, y1, 2, 3], [oz, dz, z0, z1, 4, 5]];
    var ok = true;
    for (var a = 0; a < 3; a++) {
      var o = axes[a][0], d = axes[a][1], lo = axes[a][2], hi = axes[a][3];
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } continue; }
      var t1 = (lo - o) / d, t2 = (hi - o) / d, f = axes[a][4];
      if (t1 > t2) { var tt = t1; t1 = t2; t2 = tt; f = axes[a][5]; }
      if (t1 > tmin) { tmin = t1; face = f; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) { ok = false; break; }
    }
    if (ok && tmin >= 0 && tmin <= maxDist && (!best || tmin < best.t)) best = { t: tmin, face: face };
  }
  return best;
}
function raycastEntities(game, ox, oy, oz, dx, dy, dz, maxDist) {
  var best = null;
  var list = game.entities;
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.dim !== game.player.dim || e.dead || e.remove) continue;
    var d = MOBS[e.type];
    if (!d || d.isItem || d.isXP || d.projectile) continue;
    var hw = e.w * 0.5 + 0.1;
    var hit = rayBoxes(ox, oy, oz, dx, dy, dz, 0, 0, 0,
      [[e.x - hw, e.y - 0.05, e.z - hw, e.x + hw, e.y + e.h + 0.05, e.z + hw]], maxDist);
    if (hit && (!best || hit.t < best.t)) best = { t: hit.t, entity: e };
  }
  return best;
}

/* ------------------------------------------------------ break / place -- */
function startBreaking(game, hit) {
  var p = game.player;
  if (!hit) { p.breaking = null; return; }
  var b = BLOCKS[hit.id];
  if (p.breaking && p.breaking.x === hit.x && p.breaking.y === hit.y && p.breaking.z === hit.z) return;
  p.breaking = { x: hit.x, y: hit.y, z: hit.z, id: hit.id };
  p.breakProgress = 0;
  p.breakTotal = p.creative ? 0 : breakTimeFor(b, heldItem(p), p.onGround, p.submerged);
  var eff = enchLevel(heldStack(p), 'efficiency');
  if (eff && p.breakTotal) p.breakTotal /= (1 + eff * eff * 0.28);
  if (p.effects.haste) p.breakTotal /= 1.2;
}
function updateBreaking(game, dt, hit) {
  var p = game.player;
  if (!p.breaking || !hit || hit.x !== p.breaking.x || hit.y !== p.breaking.y || hit.z !== p.breaking.z) {
    startBreaking(game, hit);
    if (!p.breaking) return;
  }
  p.breakProgress += dt;
  game.breakSoundT = (game.breakSoundT || 0) - dt;
  if (game.breakSoundT <= 0) {
    game.breakSoundT = 0.24;
    playSound(game, 'dig', p.breaking.x + 0.5, p.breaking.y + 0.5, p.breaking.z + 0.5, 0.9);
    var bd = BLOCKS[p.breaking.id];
    spawnParticle(game, p.dim, p.breaking.x + Math.random(), p.breaking.y + Math.random(), p.breaking.z + Math.random(),
      (Math.random() - 0.5) * 1.4, Math.random(), (Math.random() - 0.5) * 1.4,
      bd.avgColor[0], bd.avgColor[1], bd.avgColor[2], 0.07, 0.4);
  }
  if (p.breakProgress >= p.breakTotal) breakBlock(game, p.breaking.x, p.breaking.y, p.breaking.z);
}
function breakBlock(game, x, y, z) {
  var p = game.player, world = game.world;
  var raw = world.getRaw(p.dim, x, y, z);
  var id = raw & ID_MASK;
  if (id === 0) return;
  var b = BLOCKS[id];
  var held = heldStack(p);
  var silk = enchLevel(held, 'silk_touch');
  var fortune = enchLevel(held, 'fortune');
  world.setBlock(p.dim, x, y, z, 0);
  spawnBlockBreakParticles(game, p.dim, x, y, z, id);
  playSound(game, 'break', x + 0.5, y + 0.5, z + 0.5);
  if (!p.creative && canHarvest(b, heldItem(p))) {
    var dropName = silk && ITEMS[b.name] ? b.name : resolveDrop(b);
    if (dropName && ITEMS[dropName]) {
      var n = b.dropCount ? (b.dropCount[0] + Math.floor(Math.random() * (b.dropCount[1] - b.dropCount[0] + 1))) : 1;
      if (fortune && !silk && b.group === 'ore') n = Math.max(n, n + Math.floor(Math.random() * (fortune + 1)));
      if (n > 0) dropItem(game, p.dim, x + 0.5, y + 0.5, z + 0.5, dropName, n, true);
    }
    if (b.xp && !silk) spawnXP(game, p.dim, x + 0.5, y + 0.5, z + 0.5, b.xp[0] + Math.floor(Math.random() * (b.xp[1] - b.xp[0] + 1)));
  }
  if (!p.creative && b.tool) damageHeld(game, 1);
  p.exhaustion += 0.005;
  p.breaking = null; p.breakProgress = 0;
  /* anything resting on the block falls or pops off */
  supportCheck(game, x, y, z);
}
function supportCheck(game, x, y, z) {
  var world = game.world;
  var above = world.getId(game.player.dim, x, y + 1, z);
  if (above === 0) return;
  var ab = BLOCKS[above];
  if (ab.fall) {
    world.setBlock(game.player.dim, x, y + 1, z, 0);
    var e = makeEntity('falling_block', game.player.dim, x + 0.5, y + 1, z + 0.5, { blockVal: above });
    game.entities.push(e);
  } else if (ab.needsSupport || ab.render === 'cross' || ab.render === 'flat' || ab.render === 'crop') {
    world.setBlock(game.player.dim, x, y + 1, z, 0);
    if (ITEMS[ab.name]) dropItem(game, game.player.dim, x + 0.5, y + 1.5, z + 0.5, resolveDrop(ab) || ab.name, 1, true);
  }
}
function placeBlock(game, hit) {
  var p = game.player, world = game.world;
  var s = heldStack(p);
  if (!s) return false;
  var it = ITEMS[s.item];
  if (!it) return false;
  /* right-click interactions win over placement */
  if (hit && interactBlock(game, hit)) return true;
  if (it.spawnMob) {
    if (!hit) return false;
    var sv = FACING_VEC[0];
    var ex = hit.x + 0.5 + FACE_DIR[hit.face][0], ey = hit.y + FACE_DIR[hit.face][1], ez = hit.z + 0.5 + FACE_DIR[hit.face][2];
    game.entities.push(makeEntity(it.spawnMob, p.dim, ex, ey + 0.1, ez, { persist: true }));
    if (!p.creative) { s.count--; if (s.count <= 0) p.inv[p.sel] = null; }
    return true;
  }
  if (it.use) return useSpecialItem(game, it, hit);
  if (!it.block || !hit) return false;
  var bid = BID[it.block];
  if (bid === undefined) return false;
  var tx = hit.x + FACE_DIR[hit.face][0], ty = hit.y + FACE_DIR[hit.face][1], tz = hit.z + FACE_DIR[hit.face][2];
  /* clicking a replaceable block (grass, snow layer, water) fills it directly */
  var tid = world.getId(p.dim, hit.x, hit.y, hit.z);
  if (BLOCKS[tid].replaceable) { tx = hit.x; ty = hit.y; tz = hit.z; }
  var exist = world.getId(p.dim, tx, ty, tz);
  if (exist !== 0 && !BLOCKS[exist].replaceable) return false;
  var nb = BLOCKS[bid];
  if (nb.solid && playerIntersects(p, tx, ty, tz, blockBoxesFor(bid, 0) || FULLBOX1)) return false;
  var st = placementState(game, nb, hit, tx, ty, tz);
  world.setBlock(p.dim, tx, ty, tz, bpack(bid, st));
  /* doors and tall plants occupy two cells */
  if (nb.render === 'door') world.setBlock(p.dim, tx, ty + 1, tz, bpack(bid, st | 8));
  if (nb.tall) world.setBlock(p.dim, tx, ty + 1, tz, bpack(bid, 8));
  playSound(game, 'place', tx + 0.5, ty + 0.5, tz + 0.5);
  if (!p.creative) { s.count--; if (s.count <= 0) p.inv[p.sel] = null; }
  game.ui.dirty = true;
  p.placeSwing = 1;
  return true;
}
function placementState(game, nb, hit, tx, ty, tz) {
  var p = game.player;
  var st = 0;
  if (nb.place === 'facing') {
    /* horizontal facing, away from the player */
    var yaw = p.yaw;
    var f = Math.round(yaw / (Math.PI / 2)) & 3;
    st = f & 3;
  } else if (nb.place === 'facing6') {
    st = FACE_OPP[hit.face] & 7;
  } else if (nb.place === 'axis') {
    st = (hit.face <= 1 ? 0 : (hit.face <= 3 ? 1 : 2));
  } else if (nb.place === 'slab') {
    if (hit.face === 3 || (hit.face > 1 && (hit.py - Math.floor(hit.py)) > 0.5)) st = 1;
  } else if (nb.place === 'stairs') {
    var f2 = Math.round(p.yaw / (Math.PI / 2)) & 3;
    st = f2 & 3;
    if (hit.face === 3 || (hit.face > 1 && (hit.py - Math.floor(hit.py)) > 0.5)) st |= 4;
  } else if (nb.place === 'wallface') {
    st = hit.face === 2 ? 5 : (hit.face === 3 ? 4 : hit.face);
  } else if (nb.place === 'rot16') {
    st = Math.round((p.yaw + Math.PI) / (Math.PI * 2) * 16) & 15;
  }
  return st;
}
function playerIntersects(p, bx, by, bz, boxes) {
  var hw = p.w * 0.5;
  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    if (p.x + hw <= bx + b[0] || p.x - hw >= bx + b[3]) continue;
    if (p.y + p.h <= by + b[1] || p.y >= by + b[4]) continue;
    if (p.z + hw <= bz + b[2] || p.z - hw >= bz + b[5]) continue;
    return true;
  }
  return false;
}

/* ------------------------------------------------------- interactions -- */
function interactBlock(game, hit) {
  var p = game.player, world = game.world;
  if (p.sneaking) return false;
  var b = BLOCKS[hit.id];
  var st = hit.st;
  switch (b.ui) {
    case 'crafting': showScreen(game, 'crafting'); return true;
    case 'furnace': case 'blast_furnace': case 'smoker':
      openBlockEntity(game, hit, b.ui); return true;
    case 'chest': case 'barrel': case 'shulker':
      openBlockEntity(game, hit, 'chest'); return true;
    case 'enchanting': showScreen(game, 'enchanting'); return true;
    case 'brewing': openBlockEntity(game, hit, 'brewing'); return true;
    case 'anvil': showScreen(game, 'anvil'); return true;
    case 'smithing': showScreen(game, 'smithing'); return true;
    case 'stonecutter': showScreen(game, 'stonecutter'); return true;
    case 'grindstone': showScreen(game, 'grindstone'); return true;
    case 'loom': case 'cartography': case 'fletching': showScreen(game, 'crafting'); return true;
    case 'beacon': showScreen(game, 'beacon'); return true;
  }
  if (b.render === 'door') {
    var base = (st & 8) ? hit.y - 1 : hit.y;
    var lo = world.getRaw(p.dim, hit.x, base, hit.z), hi = world.getRaw(p.dim, hit.x, base + 1, hit.z);
    world.setBlock(p.dim, hit.x, base, hit.z, bpack(lo & ID_MASK, ((lo >>> ST_SHIFT) & 15) ^ 4));
    world.setBlock(p.dim, hit.x, base + 1, hit.z, bpack(hi & ID_MASK, ((hi >>> ST_SHIFT) & 15) ^ 4));
    playSound(game, 'door', hit.x, hit.y, hit.z);
    return true;
  }
  if (b.render === 'trapdoor' || b.render === 'gate') {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, bpack(hit.id, st ^ 4));
    playSound(game, 'door', hit.x, hit.y, hit.z);
    return true;
  }
  if (b.render === 'lever' || b.render === 'button') {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, bpack(hit.id, st ^ 8));
    playSound(game, 'click', hit.x, hit.y, hit.z);
    return true;
  }
  if (b.name === 'repeater' || b.name === 'comparator') {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, bpack(hit.id, (st & 3) | (((st >> 2) + 1) & 3) << 2));
    playSound(game, 'click', hit.x, hit.y, hit.z);
    return true;
  }
  if (b.name === 'bed') { game.trySleep(); return true; }
  if (b.name === 'crafting_table') { showScreen(game, 'crafting'); return true; }
  /* hoe tills dirt, shovel makes paths, axe strips logs, flint lights fires */
  var held = heldItem(p);
  var hit_it = held ? ITEMS[held] : null;
  if (hit_it && hit_it.tool === 'hoe' && (b.name === 'grass_block' || b.name === 'dirt' || b.name === 'coarse_dirt') &&
    world.getId(p.dim, hit.x, hit.y + 1, hit.z) === 0) {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, BID.farmland);
    damageHeld(game, 1); playSound(game, 'dig', hit.x, hit.y, hit.z); return true;
  }
  if (hit_it && hit_it.tool === 'shovel' && b.name === 'grass_block' && world.getId(p.dim, hit.x, hit.y + 1, hit.z) === 0) {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, BID.dirt_path);
    damageHeld(game, 1); playSound(game, 'dig', hit.x, hit.y, hit.z); return true;
  }
  if (hit_it && hit_it.tool === 'axe' && BID['stripped_' + b.name] !== undefined) {
    world.setBlock(p.dim, hit.x, hit.y, hit.z, bpack(BID['stripped_' + b.name], st));
    damageHeld(game, 1); playSound(game, 'dig', hit.x, hit.y, hit.z); return true;
  }
  if (held === 'bone_meal') return applyBoneMeal(game, hit);
  return false;
}
function applyBoneMeal(game, hit) {
  var p = game.player, world = game.world;
  var b = BLOCKS[hit.id];
  var grew = false;
  if (b.growth) {
    var st = hit.st;
    if (st < b.growth) { world.setBlock(p.dim, hit.x, hit.y, hit.z, bpack(hit.id, Math.min(b.growth, st + 1 + (Math.random() * 3 | 0)))); grew = true; }
  } else if (b.name === 'grass_block') {
    for (var i = 0; i < 26; i++) {
      var gx = hit.x + (Math.random() * 7 | 0) - 3, gz = hit.z + (Math.random() * 7 | 0) - 3;
      var gy = hit.y + 1;
      if (world.getId(p.dim, gx, gy, gz) !== 0) continue;
      if (world.getId(p.dim, gx, gy - 1, gz) !== BID.grass_block) continue;
      world.setBlock(p.dim, gx, gy, gz, Math.random() < 0.12 ? BID.poppy : (Math.random() < 0.2 ? BID.dandelion : BID.short_grass));
      grew = true;
    }
  } else if (b.name.indexOf('_sapling') > 0) {
    game.growTree(p.dim, hit.x, hit.y, hit.z, b.name.replace('_sapling', ''));
    grew = true;
  }
  if (grew) {
    consumeItem(game, 'bone_meal', 1);
    for (var q = 0; q < 12; q++)
      spawnParticle(game, p.dim, hit.x + Math.random(), hit.y + 1 + Math.random() * 0.5, hit.z + Math.random(), 0, 0.6, 0, 0.5, 0.9, 0.3, 0.06, 0.7);
  }
  return grew;
}
function useSpecialItem(game, it, hit) {
  var p = game.player, world = game.world;
  switch (it.use) {
    case 'ignite':
      if (!hit) return false;
      var fx = hit.x + FACE_DIR[hit.face][0], fy = hit.y + FACE_DIR[hit.face][1], fz = hit.z + FACE_DIR[hit.face][2];
      if (world.getId(p.dim, fx, fy, fz) !== 0) return false;
      if (tryLightPortal(game, fx, fy, fz)) { damageHeld(game, 1); return true; }
      world.setBlock(p.dim, fx, fy, fz, BID.fire);
      damageHeld(game, 1);
      playSound(game, 'shoot', fx, fy, fz);
      return true;
    case 'bucket':
      if (!hit) return false;
      var lid = world.getId(p.dim, hit.x, hit.y, hit.z);
      if (lid === BID.water || lid === BID.lava) {
        world.setBlock(p.dim, hit.x, hit.y, hit.z, 0);
        consumeItem(game, 'bucket', 1);
        giveItem(game, lid === BID.water ? 'water_bucket' : 'lava_bucket', 1);
        playSound(game, 'splash', hit.x, hit.y, hit.z);
        return true;
      }
      return false;
    case 'place_water': case 'place_lava':
      if (!hit) return false;
      var px2 = hit.x + FACE_DIR[hit.face][0], py2 = hit.y + FACE_DIR[hit.face][1], pz2 = hit.z + FACE_DIR[hit.face][2];
      if (world.getId(p.dim, px2, py2, pz2) !== 0 && !BLOCKS[world.getId(p.dim, px2, py2, pz2)].replaceable) return false;
      if (it.use === 'place_water' && p.dim === DIM_NETHER) {
        for (var q = 0; q < 20; q++) spawnParticle(game, p.dim, px2 + Math.random(), py2 + Math.random(), pz2 + Math.random(), 0, 1.5, 0, 0.9, 0.9, 0.9, 0.14, 0.8);
      } else {
        world.setBlock(p.dim, px2, py2, pz2, it.use === 'place_water' ? BID.water : BID.lava);
      }
      consumeItem(game, it.name, 1);
      giveItem(game, 'bucket', 1);
      playSound(game, 'splash', px2, py2, pz2);
      return true;
    case 'milk':
      p.effects = {};
      consumeItem(game, 'milk_bucket', 1); giveItem(game, 'bucket', 1);
      playSound(game, 'eat', p.x, p.y, p.z);
      return true;
    case 'bow':
      p.charging = true; p.chargeTime = 0;
      return true;
    case 'drink': case 'shield': case 'fish': case 'zoom':
      return false;
  }
  return false;
}
function tryLightPortal(game, x, y, z) {
  var world = game.world, p = game.player;
  /* find an obsidian frame in either vertical plane */
  for (var axis = 0; axis < 2; axis++) {
    var ax = axis === 0 ? 1 : 0, az = axis === 0 ? 0 : 1;
    var minX = x, maxX = x;
    while (world.getId(p.dim, minX - ax, y, z - az) === 0 && maxX - minX < 21) minX -= 1;
    while (world.getId(p.dim, maxX + ax, y, z + az) === 0 && maxX - minX < 21) maxX += 1;
    var w = maxX - minX + 1;
    if (w < 2 || w > 21) continue;
    var minY = y, maxY = y;
    while (world.getId(p.dim, x, minY - 1, z) === 0 && maxY - minY < 21) minY -= 1;
    while (world.getId(p.dim, x, maxY + 1, z) === 0 && maxY - minY < 21) maxY += 1;
    var h = maxY - minY + 1;
    if (h < 3 || h > 21) continue;
    var ok = true;
    for (var i = 0; i < w && ok; i++) {
      var cx = minX + i * ax + (axis === 0 ? 0 : 0), cz = z;
      var bxp = axis === 0 ? minX + i : x, bzp = axis === 0 ? z : minX + i;
      if (world.getId(p.dim, bxp, minY - 1, bzp) !== BID.obsidian) ok = false;
      if (world.getId(p.dim, bxp, maxY + 1, bzp) !== BID.obsidian) ok = false;
    }
    for (var j = 0; j < h && ok; j++) {
      var lx = axis === 0 ? minX - 1 : x, lz = axis === 0 ? z : minX - 1;
      var rx = axis === 0 ? maxX + 1 : x, rz = axis === 0 ? z : maxX + 1;
      if (world.getId(p.dim, lx, minY + j, lz) !== BID.obsidian) ok = false;
      if (world.getId(p.dim, rx, minY + j, rz) !== BID.obsidian) ok = false;
    }
    if (!ok) continue;
    for (var a2 = 0; a2 < w; a2++) for (var b2 = 0; b2 < h; b2++) {
      var px3 = axis === 0 ? minX + a2 : x, pz3 = axis === 0 ? z : minX + a2;
      world.setBlock(p.dim, px3, minY + b2, pz3, bpack(BID.nether_portal, axis));
    }
    playSound(game, 'portal', x, y, z);
    return true;
  }
  return false;
}

/* -------------------------------------------------------- eat / drink -- */
function startEating(game) {
  var p = game.player;
  var s = heldStack(p);
  if (!s) return false;
  var it = ITEMS[s.item];
  if (!it) return false;
  if (it.use === 'drink') { p.eating = s; p.useTime = 1.2; return true; }
  if (!it.food) return false;
  if (p.food >= 20 && it.name !== 'golden_apple' && it.name !== 'enchanted_golden_apple') return false;
  p.eating = s; p.useTime = it.eatTime;
  return true;
}
function finishEating(game) {
  var p = game.player;
  var s = p.eating;
  p.eating = null;
  if (!s || !p.inv[p.sel] || p.inv[p.sel] !== s) return;
  var it = ITEMS[s.item];
  p.food = Math.min(20, p.food + it.food);
  p.saturation = Math.min(p.food, p.saturation + it.sat);
  applyItemEffect(game, it);
  playSound(game, 'eat', p.x, p.y, p.z);
  if (!p.creative) {
    s.count--;
    if (s.count <= 0) p.inv[p.sel] = null;
    if (s.item === 'mushroom_stew' || s.item === 'rabbit_stew' || s.item === 'beetroot_soup' || s.item === 'suspicious_stew')
      giveItem(game, 'bowl', 1);
    if (s.item.indexOf('potion') === 0 || s.item === 'honey_bottle') giveItem(game, 'glass_bottle', 1);
    if (s.item === 'milk_bucket') giveItem(game, 'bucket', 1);
  }
  game.ui.dirty = true;
}
function applyItemEffect(game, it) {
  var p = game.player;
  var eff = it.effect || it.potion;
  if (!eff) return;
  var dur = it.potionDur || 20;
  switch (eff) {
    case 'regen': p.effects.regen = Math.max(p.effects.regen || 0, 5); break;
    case 'regen2': p.effects.regen = 20; p.effects.absorb = 120; p.effects.fireres = 300; break;
    case 'heal': p.hp = Math.min(p.maxHp, p.hp + 4); break;
    case 'heal2': p.hp = Math.min(p.maxHp, p.hp + 8); break;
    case 'harm': playerHurt(game, 6, null, true); break;
    case 'poison': p.effects.poison = 8; break;
    case 'hunger': p.effects.hunger = 30; break;
    case 'teleport':
      var a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 6;
      p.x += Math.cos(a) * r; p.z += Math.sin(a) * r;
      p.y = game.world.getHeight(p.dim, Math.floor(p.x), Math.floor(p.z)) + 1;
      playSound(game, 'teleport', p.x, p.y, p.z);
      break;
    default: p.effects[eff] = dur;
  }
  game.ui.dirty = true;
}

/* ------------------------------------------------------------ attack -- */
function playerAttack(game, target) {
  var p = game.player;
  var s = heldStack(p);
  var it = s ? ITEMS[s.item] : null;
  var dmg = it ? it.dmg : 1;
  var cd = clamp(p.attackCooldown, 0, 1);
  var charge = 1 - cd;
  dmg *= (0.2 + charge * charge * 0.8);
  dmg += enchLevel(s, 'sharpness') * 1.25;
  if (p.effects.strength) dmg *= 1.3;
  if (p.effects.weakness) dmg = Math.max(0, dmg - 4);
  var crit = !p.onGround && p.vy < -0.5 && !p.inWater && charge > 0.9;
  if (crit) dmg *= 1.5;
  damageEntity(game, target, dmg, p);
  var kb = enchLevel(s, 'knockback');
  if (kb) {
    var dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz) || 1;
    target.vx += dx / d * kb * 6; target.vz += dz / d * kb * 6;
  }
  var fa = enchLevel(s, 'fire_aspect');
  if (fa) target.fireTime = Math.max(target.fireTime || 0, fa * 4);
  if (crit) for (var i = 0; i < 12; i++)
    spawnParticle(game, p.dim, target.x + (Math.random() - 0.5), target.y + target.h * 0.6, target.z + (Math.random() - 0.5),
      (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 1, 0.95, 0.5, 0.08, 0.5);
  if (it && it.tool === 'sword') damageHeld(game, 1);
  p.attackCooldown = 1;
  p.exhaustion += 0.1;
}

/* ------------------------------------------------------ player update -- */
function updatePlayer(game, dt, input) {
  var p = game.player, world = game.world;
  if (p.hurtTime > 0) p.hurtTime -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.attackCooldown > 0) p.attackCooldown -= dt * (heldStack(p) && ITEMS[heldItem(p)] && ITEMS[heldItem(p)].tool === 'sword' ? 1.6 : 4);
  if (p.portalCool > 0) p.portalCool -= dt;

  if (p.dead) { p.deathTime += dt; return; }

  var eyeBlock = world.getId(p.dim, Math.floor(p.x), Math.floor(p.camY), Math.floor(p.z));
  p.submerged = eyeBlock === BID.water;
  var feetLiquid = liquidAt(world, p.dim, p.x, p.y + 0.2, p.z);
  p.inWater = feetLiquid === 'water' || p.submerged;
  p.inLava = feetLiquid === 'lava';

  /* --- movement input --- */
  var fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  var str = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  var len = Math.hypot(fwd, str);
  if (len > 1) { fwd /= len; str /= len; }
  p.sneaking = input.sneak && p.onGround && !p.flying;
  if (input.sprint && fwd > 0 && p.food > 6 && !p.sneaking) p.sprinting = true;
  if (fwd <= 0 || p.food <= 6) p.sprinting = false;

  var speed = 4.317;
  if (p.sprinting) speed = 5.612;
  if (p.sneaking) speed = 1.30;
  if (p.flying) speed = p.sprinting ? 21.6 : 10.8;
  if (p.effects.speed) speed *= 1.2;
  if (p.effects.slow) speed *= 0.85;
  if (p.inWater && !p.flying) speed *= 0.55 + enchLevel(p.armor[3], 'depth_strider') * 0.15;
  if (p.onGround && !p.flying) {
    var gid = world.getId(p.dim, Math.floor(p.x), Math.floor(p.y - 0.1), Math.floor(p.z));
    if (gid && BLOCKS[gid].speedMul) speed *= BLOCKS[gid].speedMul;
  }

  var sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  var wantX = (sinY * fwd + cosY * str) * speed;
  var wantZ = (-cosY * fwd + sinY * str) * speed;

  var slip = 0.6;
  if (p.onGround) {
    var uid = world.getId(p.dim, Math.floor(p.x), Math.floor(p.y - 0.1), Math.floor(p.z));
    if (uid && BLOCKS[uid].slip) slip = BLOCKS[uid].slip;
  }
  var accel = p.onGround ? 34 * (0.6 / slip) : (p.flying ? 30 : 8);
  if (p.inWater && !p.flying) accel = 14;
  p.vx += (wantX - p.vx) * Math.min(1, accel * dt);
  p.vz += (wantZ - p.vz) * Math.min(1, accel * dt);

  /* --- vertical --- */
  if (p.flying) {
    var upv = (input.jump ? 1 : 0) - (input.sneak ? 1 : 0);
    p.vy += (upv * speed - p.vy) * Math.min(1, 20 * dt);
  } else if (p.inWater) {
    if (input.jump) p.vy = Math.min(p.vy + 22 * dt, 3.4);
    else p.vy -= 8 * dt;
    p.vy *= Math.pow(0.30, dt);
  } else if (p.inLava) {
    if (input.jump) p.vy = Math.min(p.vy + 16 * dt, 2.0);
    else p.vy -= 6 * dt;
    p.vy *= Math.pow(0.45, dt);
  } else {
    if (input.jump && p.onGround) {
      p.vy = 8.95 + (p.effects.jump ? 2.2 : 0);
      if (p.sprinting) { p.vx += sinY * 3.0; p.vz += -cosY * 3.0; }
      p.exhaustion += p.sprinting ? 0.2 : 0.05;
    }
    p.vy -= 32 * dt;
    if (p.effects.slowfall && p.vy < -3) p.vy = -3;
    if (p.vy < -60) p.vy = -60;
  }

  /* --- collide & move (sneaking refuses to walk off an edge) --- */
  var prevY = p.y, wasGround = p.onGround;
  var sneakBlock = p.sneaking && p.onGround;
  var oldX = p.x, oldZ = p.z;
  var r = collideAxis(world, p.dim, p, p.vx * dt, p.vy * dt, p.vz * dt);
  if (sneakBlock && !groundBelow(world, p)) {
    p.x = oldX; p.z = oldZ;
    var stepX = collideAxis(world, p.dim, p, p.vx * dt, 0, 0);
    if (!groundBelow(world, p)) p.x = oldX;
    collideAxis(world, p.dim, p, 0, 0, p.vz * dt);
    if (!groundBelow(world, p)) p.z = oldZ;
  }
  var landed = p.vy < 0 && Math.abs(r.dy - p.vy * dt) > 1e-7;
  p.onGround = landed || (p.flying && false);
  if (Math.abs(r.dx - p.vx * dt) > 1e-7) {
    /* auto step-up over a single block, the way the real player walks */
    if (p.onGround && tryStepUp(world, p, p.vx * dt, 0)) { } else p.vx = 0;
  }
  if (Math.abs(r.dz - p.vz * dt) > 1e-7) {
    if (p.onGround && tryStepUp(world, p, 0, p.vz * dt)) { } else p.vz = 0;
  }
  if (r.dy > 0 && p.vy > 0) p.vy = 0;

  /* --- fall damage --- */
  if (!p.onGround && !p.inWater && !p.flying) {
    if (p.fallStart === null && p.vy < 0) p.fallStart = p.y;
    if (p.fallStart !== null && p.y > p.fallStart) p.fallStart = p.y;
  }
  if (p.onGround) {
    if (p.fallStart !== null) {
      var dist = p.fallStart - p.y;
      var ff = enchLevel(p.armor[3], 'feather_falling');
      if (dist > 3 && !p.creative && !p.effects.slowfall) {
        var dmgF = (dist - 3) * (1 - ff * 0.12);
        if (dmgF > 0) { playerHurt(game, dmgF, null, true); playSound(game, 'thud', p.x, p.y, p.z); }
      }
      p.fallStart = null;
    }
    p.vy = 0;
  }
  if (p.inWater) p.fallStart = null;

  /* --- head bob and footsteps --- */
  var hspd = Math.hypot(p.x - p.lastX, p.z - p.lastZ);
  p.lastX = p.x; p.lastZ = p.z;
  p.bobPhase += hspd * 5.2;
  p.bobAmt = approach(p.bobAmt, p.onGround ? Math.min(1, hspd / (dt * 5.6)) : 0, dt * 6);
  p.stepSoundDist += hspd;
  if (p.stepSoundDist > (p.sneaking ? 3.2 : 2.0) && p.onGround) {
    p.stepSoundDist = 0;
    var gb = world.getId(p.dim, Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
    if (gb) playSound(game, stepSoundFor(gb), p.x, p.y, p.z, 0.9 + Math.random() * 0.2, p.sneaking ? 0.4 : 1);
    p.exhaustion += p.sprinting ? 0.04 : 0.01;
  }

  /* --- camera --- */
  var eye = p.sneaking ? 1.50 : 1.62;
  p.camY = approach(p.camY - p.y, eye, dt * 12) + p.y;

  /* --- breath, fire, lava, void --- */
  if (p.submerged) {
    var resp = enchLevel(p.armor[0], 'respiration');
    p.air -= dt * 20 / (1 + resp);
    if (p.air <= 0) { p.air = 0; p.drownT = (p.drownT || 0) + dt; if (p.drownT > 1) { p.drownT = 0; playerHurt(game, 2, null, true); } }
  } else p.air = Math.min(p.maxAir, p.air + dt * 90);
  if (p.inLava && !p.creative) { p.fireTime = 8; playerHurt(game, 4 * dt, null, true); }
  if (p.fireTime > 0) {
    p.fireTime -= dt;
    if (p.inWater) p.fireTime = 0;
    else if (!p.effects.fireres) { p.burnT = (p.burnT || 0) + dt; if (p.burnT > 0.5) { p.burnT = 0; playerHurt(game, 1, null, true); } }
  }
  if (p.y < -18 && !p.creative) playerHurt(game, 4 * dt * 10, null, true);

  /* --- hunger, regeneration --- */
  if (!p.creative) {
    p.exhaustion += dt * 0.005;
    if (p.effects.hunger) p.exhaustion += dt * 0.1;
    while (p.exhaustion >= 4) {
      p.exhaustion -= 4;
      if (p.saturation > 0) p.saturation = Math.max(0, p.saturation - 1);
      else p.food = Math.max(0, p.food - 1);
      game.ui.dirty = true;
    }
    p.regenT = (p.regenT || 0) + dt;
    if (p.food >= 18 && p.hp < p.maxHp && p.regenT > 3.5) {
      p.regenT = 0; p.hp = Math.min(p.maxHp, p.hp + 1); p.exhaustion += 3; game.ui.dirty = true;
    }
    if (p.food === 0 && p.regenT > 4) { p.regenT = 0; playerHurt(game, 1, null, true); }
  }
  if (p.effects.regen) { p.regen2T = (p.regen2T || 0) + dt; if (p.regen2T > 2) { p.regen2T = 0; p.hp = Math.min(p.maxHp, p.hp + 1); game.ui.dirty = true; } }
  if (p.effects.poison) { p.poisT = (p.poisT || 0) + dt; if (p.poisT > 1.5) { p.poisT = 0; if (p.hp > 1) { p.hp -= 1; game.ui.dirty = true; } } }
  for (var k in p.effects) { p.effects[k] -= dt; if (p.effects[k] <= 0) delete p.effects[k]; }

  /* --- eating --- */
  if (p.eating) {
    p.useTime -= dt;
    if (Math.random() < dt * 14) {
      var it2 = ITEMS[p.eating.item];
      spawnParticle(game, p.dim, p.x + (Math.random() - 0.5) * 0.3, p.camY - 0.25, p.z + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 1.5, 1, (Math.random() - 0.5) * 1.5, 0.7, 0.6, 0.5, 0.05, 0.5);
    }
    if (p.useTime <= 0) finishEating(game);
  }

  /* --- nether portal --- */
  var pb = world.getId(p.dim, Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z));
  if (pb === BID.nether_portal) {
    p.portalTime += dt;
    if (p.portalTime > 1.4 && p.portalCool <= 0) { game.travelDimension(p.dim === DIM_NETHER ? DIM_OVERWORLD : DIM_NETHER); p.portalTime = 0; p.portalCool = 6; }
  } else if (pb === BID.end_portal && p.portalCool <= 0) {
    game.travelDimension(p.dim === DIM_END ? DIM_OVERWORLD : DIM_END); p.portalCool = 6;
  } else p.portalTime = Math.max(0, p.portalTime - dt * 2);
}
function groundBelow(world, p) {
  var hw = p.w * 0.5 - 0.02;
  for (var dz = -1; dz <= 1; dz += 2) for (var dx = -1; dx <= 1; dx += 2) {
    if (isSolidAt(world, p.dim, Math.floor(p.x + dx * hw), Math.floor(p.y - 0.05), Math.floor(p.z + dz * hw))) return true;
  }
  return false;
}
function tryStepUp(world, p, dx, dz) {
  var save = { x: p.x, y: p.y, z: p.z };
  p.y += 0.6;
  var r = collideAxis(world, p.dim, p, dx, 0, dz);
  var moved = Math.abs(r.dx) > 1e-6 || Math.abs(r.dz) > 1e-6;
  if (!moved) { p.x = save.x; p.y = save.y; p.z = save.z; return false; }
  /* settle back down onto whatever we stepped onto */
  var down = collideAxis(world, p.dim, p, 0, -0.6, 0);
  if (p.y < save.y - 1e-6) { p.x = save.x; p.y = save.y; p.z = save.z; return false; }
  return true;
}
