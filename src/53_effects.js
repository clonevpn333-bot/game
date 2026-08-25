/* =========================================================================
 * EFFECTS — dropped items, XP, projectiles, TNT, falling blocks, explosions,
 * particles and the procedural sound engine.
 * ========================================================================= */

/* --------------------------------------------------------- particles -- */
function spawnParticle(game, dim, x, y, z, vx, vy, vz, r, g, b, size, life, layer) {
  if (game.particles.length > 2400) return;
  game.particles.push({
    dim: dim, x: x, y: y, z: z, vx: vx, vy: vy, vz: vz,
    r: r, g: g, b: b, a: 1, size: size || 0.12, life: life || 1, maxLife: life || 1,
    layer: layer === undefined ? WHITE_PARTICLE_LAYER : layer, grav: 1
  });
}
var WHITE_PARTICLE_LAYER = 0;
function updateParticles(game, dt) {
  var ps = game.particles;
  for (var i = ps.length - 1; i >= 0; i--) {
    var q = ps[i];
    q.life -= dt;
    if (q.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    q.vy -= 14 * dt * (q.grav === undefined ? 1 : q.grav);
    var nx = q.x + q.vx * dt, ny = q.y + q.vy * dt, nz = q.z + q.vz * dt;
    if (isSolidAt(game.world, q.dim, Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
      q.vx *= 0.4; q.vz *= 0.4; q.vy = 0; ny = q.y;
    }
    q.x = nx; q.y = ny; q.z = nz;
    q.vx *= Math.pow(0.4, dt); q.vz *= Math.pow(0.4, dt);
    q.a = clamp(q.life / q.maxLife, 0, 1);
  }
}
function spawnBlockBreakParticles(game, dim, x, y, z, id) {
  var b = BLOCKS[id];
  var c = b.avgColor || [0.6, 0.6, 0.6];
  for (var i = 0; i < 14; i++) {
    spawnParticle(game, dim, x + Math.random(), y + Math.random(), z + Math.random(),
      (Math.random() - 0.5) * 3, Math.random() * 4, (Math.random() - 0.5) * 3,
      c[0], c[1], c[2], 0.09 + Math.random() * 0.06, 0.6 + Math.random() * 0.5);
  }
}
function spawnDamageParticles(game, e) {
  for (var i = 0; i < 8; i++) {
    spawnParticle(game, e.dim, e.x + (Math.random() - 0.5) * e.w, e.y + e.h * 0.5 + (Math.random() - 0.5) * e.h * 0.5,
      e.z + (Math.random() - 0.5) * e.w, (Math.random() - 0.5) * 2.5, Math.random() * 2.5, (Math.random() - 0.5) * 2.5,
      0.75, 0.06, 0.06, 0.08, 0.5);
  }
}

/* ------------------------------------------------------ dropped items -- */
function dropItem(game, dim, x, y, z, item, count, noPickupDelay) {
  var e = makeEntity('item', dim, x, y + 0.15, z, {
    item: item, count: count,
    vx: (Math.random() - 0.5) * 2.4, vy: 3.2 + Math.random(), vz: (Math.random() - 0.5) * 2.4,
    pickupDelay: noPickupDelay ? 0 : 0.6, life: 0
  });
  game.entities.push(e);
  return e;
}
function updateItemEntity(game, e, dt, def) {
  e.life += dt;
  if (e.life > 300) { e.remove = true; return; }
  applyPhysics(game, e, dt, def);
  e.yaw += dt * 1.1;
  var p = game.player;
  if (p.dim === e.dim && !p.dead && e.pickupDelay <= 0) {
    var dx = p.x - e.x, dy = (p.y + 0.9) - e.y, dz = p.z - e.z;
    var d = Math.hypot(dx, dy, dz);
    if (d < 1.6) {
      e.vx += dx / d * 12 * dt * 4; e.vy += dy / d * 12 * dt * 4; e.vz += dz / d * 12 * dt * 4;
      if (d < 0.65) {
        if (def.isXP) { addXP(game, e.count); playSound(game, 'orb', e.x, e.y, e.z); e.remove = true; }
        else {
          var left = giveItem(game, e.item, e.count);
          if (left < e.count) { playSound(game, 'pop', e.x, e.y, e.z); game.ui.dirty = true; }
          if (left === 0) e.remove = true; else e.count = left;
        }
      }
    }
  }
  /* merge nearby stacks so the ground doesn't fill up with singles */
  if (!def.isXP && e.life > 0.5 && (game.tickCount % 20) === 0) {
    for (var i = 0; i < game.entities.length; i++) {
      var o = game.entities[i];
      if (o === e || o.remove || o.type !== 'item' || o.item !== e.item) continue;
      if (Math.abs(o.x - e.x) < 0.7 && Math.abs(o.y - e.y) < 0.7 && Math.abs(o.z - e.z) < 0.7) {
        var max = ITEMS[e.item] ? ITEMS[e.item].stack : 64;
        var move = Math.min(o.count, max - e.count);
        if (move > 0) { e.count += move; o.count -= move; if (o.count <= 0) o.remove = true; }
      }
    }
  }
}
function spawnXP(game, dim, x, y, z, amount) {
  while (amount > 0) {
    var v = amount >= 17 ? 17 : (amount >= 7 ? 7 : (amount >= 3 ? 3 : 1));
    amount -= v;
    var e = makeEntity('xp_orb', dim, x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, {
      count: v, vx: (Math.random() - 0.5) * 2, vy: 2.5 + Math.random(), vz: (Math.random() - 0.5) * 2, life: 0
    });
    game.entities.push(e);
  }
}

/* --------------------------------------------------------- projectiles */
var PROJ_KIND = {
  arrow: { type: 'arrow', speed: 40, dmg: 4, grav: 1 },
  snowball: { type: 'snowball', speed: 24, dmg: 0, grav: 1 },
  fireball: { type: 'fireball', speed: 22, dmg: 5, grav: 0, fire: true },
  ghast_fireball: { type: 'fireball', speed: 16, dmg: 6, grav: 0, fire: true, explode: 2.6, scale: 2 },
  wither_skull: { type: 'fireball', speed: 26, dmg: 8, grav: 0, explode: 1.6, wither: true },
  shulker_bullet: { type: 'fireball', speed: 12, dmg: 4, grav: 0, homing: true },
  wind_charge: { type: 'snowball', speed: 22, dmg: 1, grav: 0, knock: 14 },
  potion: { type: 'snowball', speed: 14, dmg: 0, grav: 1, splash: true },
  ender_pearl: { type: 'ender_pearl_entity', speed: 22, dmg: 0, grav: 1, teleport: true },
  fangs: { type: null, dmg: 6, fangs: true },
  beam: { type: null, dmg: 6, beam: true }
};
function fireProjectile(game, from, kind, target) {
  var k = PROJ_KIND[kind];
  if (!k) return;
  var sx = from.x, sy = from.y + from.h * 0.75, sz = from.z;
  var tx = target.x, ty = (target.camY !== undefined ? target.camY - 0.4 : target.y + target.h * 0.5), tz = target.z;
  var dx = tx - sx, dy = ty - sy, dz = tz - sz;
  var d = Math.hypot(dx, dy, dz) || 1;
  if (k.beam) {
    damageEntity(game, target, k.dmg, from);
    for (var i = 0; i < 12; i++) {
      var t = i / 12;
      spawnParticle(game, from.dim, sx + dx * t, sy + dy * t, sz + dz * t, 0, 0, 0, 0.4, 0.9, 0.85, 0.09, 0.35);
    }
    playSound(game, 'beam', sx, sy, sz);
    return;
  }
  if (k.fangs) {
    damageEntity(game, target, k.dmg, from);
    for (var f = 0; f < 20; f++)
      spawnParticle(game, from.dim, tx + (Math.random() - 0.5), ty - 1 + Math.random(), tz + (Math.random() - 0.5), 0, 2, 0, 0.85, 0.82, 0.7, 0.13, 0.5);
    playSound(game, 'magic', tx, ty, tz);
    return;
  }
  if (k.grav) { dy += d * 0.06; }
  var e = makeEntity(k.type, from.dim, sx, sy, sz, {
    vx: dx / d * k.speed, vy: dy / d * k.speed, vz: dz / d * k.speed,
    owner: from, kind: kind, life: 0, sizeMul: k.scale || 1
  });
  game.entities.push(e);
  playSound(game, 'shoot', sx, sy, sz);
}
function updateProjectile(game, e, dt, def) {
  var k = PROJ_KIND[e.kind] || PROJ_KIND.arrow;
  e.life += dt;
  if (e.life > 12) { e.remove = true; return; }
  if (k.grav) e.vy -= 20 * dt;
  if (k.homing && e.owner && e.owner.target) {
    var t = e.owner.target;
    var hx = t.x - e.x, hy = t.y + 1 - e.y, hz = t.z - e.z;
    var hd = Math.hypot(hx, hy, hz) || 1;
    e.vx += hx / hd * 24 * dt; e.vy += hy / hd * 24 * dt; e.vz += hz / hd * 24 * dt;
  }
  var nx = e.x + e.vx * dt, ny = e.y + e.vy * dt, nz = e.z + e.vz * dt;
  e.yaw = Math.atan2(e.vx, -e.vz);
  e.pitch = Math.atan2(e.vy, Math.hypot(e.vx, e.vz));
  /* hit a block? */
  if (isSolidAt(game.world, e.dim, Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
    onProjectileHit(game, e, k, null, nx, ny, nz);
    return;
  }
  /* hit an entity? */
  var list = game.entities;
  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    if (o === e || o === e.owner || o.dead || o.dim !== e.dim) continue;
    var od = MOBS[o.type];
    if (!od || od.isItem || od.isXP || od.projectile) continue;
    if (Math.abs(o.x - nx) < o.w * 0.5 + 0.2 && Math.abs(o.z - nz) < o.w * 0.5 + 0.2 &&
      ny > o.y - 0.2 && ny < o.y + o.h + 0.2) {
      onProjectileHit(game, e, k, o, nx, ny, nz);
      return;
    }
  }
  var p = game.player;
  if (e.owner !== p && p.dim === e.dim && !p.dead &&
    Math.abs(p.x - nx) < 0.5 && Math.abs(p.z - nz) < 0.5 && ny > p.y - 0.2 && ny < p.y + 1.9) {
    onProjectileHit(game, e, k, p, nx, ny, nz);
    return;
  }
  e.x = nx; e.y = ny; e.z = nz;
  if (k.fire && Math.random() < dt * 30)
    spawnParticle(game, e.dim, e.x, e.y, e.z, 0, 0.4, 0, 1, 0.6, 0.15, 0.16, 0.5);
}
function onProjectileHit(game, e, k, hit, x, y, z) {
  if (k.teleport && e.owner === game.player) {
    game.player.x = x; game.player.y = y; game.player.z = z;
    game.player.vy = 0;
    playerHurt(game, 2, null);
    playSound(game, 'teleport', x, y, z);
  }
  if (k.explode) explode(game, x, y, z, k.explode, e.dim);
  if (k.knock) {
    var list = game.entities.concat([game.player]);
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o || o.dim !== e.dim) continue;
      var d = Math.hypot(o.x - x, o.y - y, o.z - z);
      if (d < 3.5) { var f = (1 - d / 3.5) * k.knock; o.vx += (o.x - x) / (d || 1) * f; o.vy += 6; o.vz += (o.z - z) / (d || 1) * f; }
    }
  }
  if (hit && k.dmg) damageEntity(game, hit, k.dmg, e.owner);
  if (hit && k.fire) hit.fireTime = Math.max(hit.fireTime || 0, 5);
  if (k.splash) {
    for (var q = 0; q < 24; q++)
      spawnParticle(game, e.dim, x + (Math.random() - 0.5), y + Math.random(), z + (Math.random() - 0.5), 0, 1, 0, 0.7, 0.3, 0.8, 0.12, 0.8);
  }
  playSound(game, 'thud', x, y, z);
  e.remove = true;
}

/* ---------------------------------------------------------- explosion -- */
function explode(game, x, y, z, power, dim) {
  var world = game.world;
  var r = Math.ceil(power * 1.4);
  for (var dy = -r; dy <= r; dy++) for (var dz = -r; dz <= r; dz++) for (var dx = -r; dx <= r; dx++) {
    var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > power * (0.85 + Math.random() * 0.35)) continue;
    var bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz;
    var id = world.getId(dim, bx, by, bz);
    if (id === 0) continue;
    var b = BLOCKS[id];
    if (b.hard < 0 || b.blast > power * 22) continue;
    if (b.liquid) continue;
    world.setBlock(dim, bx, by, bz, 0);
    if (Math.random() < 0.25 && b.drop) dropItem(game, dim, bx + 0.5, by + 0.5, bz + 0.5, resolveDrop(b), 1);
  }
  var list = game.entities;
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.dim !== dim || e.dead) continue;
    var ed = Math.hypot(e.x - x, e.y - y, e.z - z);
    if (ed > power * 2.2) continue;
    var f = 1 - ed / (power * 2.2);
    damageEntity(game, e, power * 7 * f * f, null, true);
    e.vx += (e.x - x) / (ed || 1) * power * 4 * f;
    e.vy += Math.max(2, (e.y - y) / (ed || 1) * power * 4 * f);
    e.vz += (e.z - z) / (ed || 1) * power * 4 * f;
  }
  var p = game.player;
  if (p.dim === dim) {
    var pd = Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z);
    if (pd < power * 2.2) {
      var pf = 1 - pd / (power * 2.2);
      playerHurt(game, power * 6 * pf * pf, null);
      p.vx += (p.x - x) / (pd || 1) * power * 3.5 * pf;
      p.vy += Math.max(3, power * 2.5 * pf);
      p.vz += (p.z - z) / (pd || 1) * power * 3.5 * pf;
      game.shake = Math.max(game.shake, 0.6 * pf);
    }
  }
  for (var q = 0; q < 90; q++) {
    var a = Math.random() * Math.PI * 2, e2 = (Math.random() - 0.5) * Math.PI;
    var sp = Math.random() * power * 3.5;
    spawnParticle(game, dim, x, y, z, Math.cos(a) * Math.cos(e2) * sp, Math.sin(e2) * sp, Math.sin(a) * Math.cos(e2) * sp,
      1, 0.72 - Math.random() * 0.4, 0.28, 0.22 + Math.random() * 0.3, 0.7 + Math.random() * 0.6);
  }
  playSound(game, 'explode', x, y, z);
}

/* ------------------------------------------------------------- TNT ----- */
function updatePrimedTNT(game, e, dt) {
  e.fuseTime = (e.fuseTime || 0) + dt;
  applyPhysics(game, e, dt, MOBS.tnt);
  if (Math.random() < dt * 20) spawnParticle(game, e.dim, e.x, e.y + 1, e.z, 0, 1, 0, 1, 1, 1, 0.1, 0.5);
  e.tint = (Math.floor(e.fuseTime * 8) % 2) ? [3, 3, 3] : null;
  if (e.fuseTime > 4) { explode(game, e.x, e.y + 0.5, e.z, 4, e.dim); e.remove = true; }
}
function updateFallingBlock(game, e, dt) {
  applyPhysics(game, e, dt, MOBS.falling_block);
  if (e.onGround) {
    var bx = Math.floor(e.x), by = Math.round(e.y), bz = Math.floor(e.z);
    if (game.world.getId(e.dim, bx, by, bz) === 0) {
      game.world.setBlock(e.dim, bx, by, bz, e.blockVal);
      playSound(game, 'thud', bx, by, bz, 0.8, 0.5);
    } else dropItem(game, e.dim, e.x, e.y, e.z, BLOCKS[e.blockVal & ID_MASK].name, 1);
    e.remove = true;
  }
}

/* ============================ SOUND ENGINE ============================== */
/* Everything is synthesised at runtime — no audio assets, same as textures. */
var AUDIO = { ctx: null, master: null, enabled: true, volume: 0.6 };
/* Browsers hand back a suspended AudioContext, and it only resumes from
   inside a real user gesture — so this is called from every key and click,
   not just the first one. */
function initAudio() {
  try {
    if (!AUDIO.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { AUDIO.enabled = false; return; }
      AUDIO.ctx = new AC();
      AUDIO.master = AUDIO.ctx.createGain();
      AUDIO.master.gain.value = AUDIO.volume;
      AUDIO.master.connect(AUDIO.ctx.destination);
    }
    if (AUDIO.ctx.state !== 'running' && AUDIO.ctx.resume) AUDIO.ctx.resume();
  } catch (err) { AUDIO.enabled = false; }
}
function noiseBuffer(ctx, dur) {
  var n = Math.floor(ctx.sampleRate * dur);
  var b = ctx.createBuffer(1, n, ctx.sampleRate);
  var d = b.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
var SOUNDS = {
  step_stone: { type: 'noise', f: 900, q: 2, dur: 0.09, gain: 0.20, decay: 0.06 },
  step_grass: { type: 'noise', f: 1500, q: 1, dur: 0.10, gain: 0.16, decay: 0.07 },
  step_wood: { type: 'noise', f: 700, q: 3, dur: 0.09, gain: 0.20, decay: 0.06 },
  step_sand: { type: 'noise', f: 2400, q: 0.7, dur: 0.11, gain: 0.14, decay: 0.08 },
  step_snow: { type: 'noise', f: 3000, q: 0.6, dur: 0.10, gain: 0.12, decay: 0.08 },
  step_water: { type: 'noise', f: 1200, q: 0.8, dur: 0.14, gain: 0.16, decay: 0.10 },
  step_metal: { type: 'noise', f: 2600, q: 5, dur: 0.08, gain: 0.16, decay: 0.05 },
  step_wool: { type: 'noise', f: 500, q: 1, dur: 0.10, gain: 0.10, decay: 0.08 },
  dig: { type: 'noise', f: 800, q: 1.5, dur: 0.08, gain: 0.16, decay: 0.05 },
  break: { type: 'noise', f: 1100, q: 1.2, dur: 0.22, gain: 0.30, decay: 0.16 },
  place: { type: 'noise', f: 800, q: 2.5, dur: 0.12, gain: 0.26, decay: 0.09 },
  hurt: { type: 'tone', f: 320, f2: 150, dur: 0.22, gain: 0.22, wave: 'square' },
  death: { type: 'tone', f: 260, f2: 90, dur: 0.5, gain: 0.26, wave: 'sawtooth' },
  pop: { type: 'tone', f: 700, f2: 1200, dur: 0.08, gain: 0.16, wave: 'sine' },
  orb: { type: 'tone', f: 900, f2: 1500, dur: 0.12, gain: 0.14, wave: 'sine' },
  click: { type: 'tone', f: 1100, f2: 900, dur: 0.05, gain: 0.14, wave: 'square' },
  explode: { type: 'noise', f: 180, q: 0.5, dur: 1.0, gain: 0.7, decay: 0.7 },
  shoot: { type: 'noise', f: 2000, q: 1.5, dur: 0.14, gain: 0.18, decay: 0.09 },
  thud: { type: 'noise', f: 300, q: 2, dur: 0.12, gain: 0.20, decay: 0.08 },
  splash: { type: 'noise', f: 900, q: 0.8, dur: 0.35, gain: 0.26, decay: 0.24 },
  teleport: { type: 'tone', f: 200, f2: 1400, dur: 0.28, gain: 0.20, wave: 'sine' },
  magic: { type: 'tone', f: 600, f2: 1800, dur: 0.3, gain: 0.16, wave: 'triangle' },
  beam: { type: 'tone', f: 1400, f2: 600, dur: 0.4, gain: 0.16, wave: 'sawtooth' },
  levelup: { type: 'tone', f: 500, f2: 1400, dur: 0.5, gain: 0.24, wave: 'triangle' },
  door: { type: 'noise', f: 500, q: 4, dur: 0.3, gain: 0.20, decay: 0.2 },
  eat: { type: 'noise', f: 600, q: 2, dur: 0.14, gain: 0.16, decay: 0.1 },
  anvil: { type: 'noise', f: 2200, q: 8, dur: 0.35, gain: 0.3, decay: 0.25 },
  thunder: { type: 'noise', f: 90, q: 0.4, dur: 2.2, gain: 0.8, decay: 1.8 },
  portal: { type: 'tone', f: 120, f2: 400, dur: 0.9, gain: 0.18, wave: 'sawtooth' },
  bossroar: { type: 'tone', f: 90, f2: 40, dur: 1.6, gain: 0.5, wave: 'sawtooth' }
};
function playSound(game, name, x, y, z, pitch, vol) {
  if (!AUDIO.enabled || !AUDIO.ctx || AUDIO.ctx.state !== 'running') return;
  var s = SOUNDS[name];
  if (!s) return;
  var dist = 0;
  if (x !== undefined && game) {
    var p = game.player;
    dist = Math.hypot(p.x - x, p.y - y, p.z - z);
    if (dist > 34) return;
  }
  var att = 1 / (1 + dist * dist * 0.012);
  var ctx = AUDIO.ctx, t0 = ctx.currentTime;
  var g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, s.gain * att * (vol === undefined ? 1 : vol)), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
  g.connect(AUDIO.master);
  var p2 = pitch || (0.92 + Math.random() * 0.16);
  if (s.type === 'noise') {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, s.dur);
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = s.f * p2; f.Q.value = s.q;
    src.connect(f); f.connect(g);
    src.start(t0); src.stop(t0 + s.dur);
  } else {
    var o = ctx.createOscillator();
    o.type = s.wave || 'sine';
    o.frequency.setValueAtTime(s.f * p2, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, (s.f2 || s.f) * p2), t0 + s.dur);
    o.connect(g);
    o.start(t0); o.stop(t0 + s.dur);
  }
}
function stepSoundFor(blockId) {
  var b = BLOCKS[blockId];
  var m = b ? b.sound : 'stone';
  var map = {
    stone: 'step_stone', deepslate: 'step_stone', grass: 'step_grass', gravel: 'step_stone',
    sand: 'step_sand', snow: 'step_snow', wood: 'step_wood', nether_wood: 'step_wood',
    bamboo: 'step_wood', ladder: 'step_wood', metal: 'step_metal', wool: 'step_wool',
    glass: 'step_stone', water: 'step_water', slime: 'step_wool', moss: 'step_grass',
    netherrack: 'step_stone', mud: 'step_water', sculk: 'step_wool', amethyst: 'step_stone',
    calcite: 'step_stone', copper: 'step_metal', wart: 'step_wool', chain: 'step_metal',
    nether_bricks: 'step_stone', anvil: 'step_metal', lava: 'step_water'
  };
  return map[m] || 'step_stone';
}
