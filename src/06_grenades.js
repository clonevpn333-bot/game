/* =============================================================
 * BREACHPOINT — grenade physics, smoke, fire and flash
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W;

  var G = {};
  var RADIUS = 0.085;
  var REST = 0.42;          // bounciness
  var TANGENT_FRICTION = 0.72;

  G.createState = function () {
    return { proj: [], smokes: [], fires: [], flashes: [], nextId: 1 };
  };

  /* power: 1 = full throw, 0.55 = lob, 0.3 = underhand drop */
  G.throwGrenade = function (state, owner, weaponId, eye, dir, power, now) {
    var w = W.get(weaponId);
    if (!w) return null;
    var speed = (w.throwSpeed || 20) * power;
    var g = {
      id: state.nextId++,
      owner: owner.id, team: owner.team, wid: weaponId, gtype: w.gtype,
      pos: { x: eye.x + dir.x * 0.45, y: eye.y + dir.y * 0.45 - 0.05, z: eye.z + dir.z * 0.45 },
      vel: {
        x: dir.x * speed + owner.vel.x * 0.6,
        y: dir.y * speed + owner.vel.y * 0.4 + 1.1,
        z: dir.z * speed + owner.vel.z * 0.6
      },
      born: now, fuse: w.fuse || 0, bounces: 0, resting: 0, spin: Math.random() * 6.28,
      detonated: false
    };
    state.proj.push(g);
    return g;
  };

  function reflect(vel, nx, ny, nz) {
    var d = vel.x * nx + vel.y * ny + vel.z * nz;
    vel.x -= (1 + REST) * d * nx;
    vel.y -= (1 + REST) * d * ny;
    vel.z -= (1 + REST) * d * nz;
    // tangential friction
    var d2 = vel.x * nx + vel.y * ny + vel.z * nz;
    var tx = vel.x - d2 * nx, ty = vel.y - d2 * ny, tz = vel.z - d2 * nz;
    vel.x = d2 * nx + tx * TANGENT_FRICTION;
    vel.y = d2 * ny + ty * TANGENT_FRICTION;
    vel.z = d2 * nz + tz * TANGENT_FRICTION;
  }

  /* Advance one projectile. Returns true when it should detonate. */
  G.stepProjectile = function (g, world, dt, now) {
    var sub = 3, sdt = dt / sub;
    for (var s = 0; s < sub; s++) {
      g.vel.y -= C.GRAVITY * sdt;
      var dx = g.vel.x * sdt, dy = g.vel.y * sdt, dz = g.vel.z * sdt;
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-7) continue;
      var ix = dx / len, iy = dy / len, iz = dz / len;
      var h = world.rayWorld(g.pos.x, g.pos.y, g.pos.z, ix, iy, iz, len + RADIUS);
      if (h) {
        var travel = Math.max(0, h.t - RADIUS);
        g.pos.x += ix * travel; g.pos.y += iy * travel; g.pos.z += iz * travel;
        reflect(g.vel, h.nx, h.ny, h.nz);
        g.bounces++;
        g.lastBounce = now;
        g.bounceSpeed = len / sdt;
        if (g.gtype === 'fire' && h.ny > 0.5) return true;     // molotovs break on the floor
        if (g.gtype === 'fire' && g.bounces > 1) return true;
      } else {
        g.pos.x += dx; g.pos.y += dy; g.pos.z += dz;
      }
    }
    var speed2 = g.vel.x * g.vel.x + g.vel.z * g.vel.z + g.vel.y * g.vel.y;
    if (speed2 < 0.09) { g.resting += dt; g.vel.x *= 0.82; g.vel.z *= 0.82; }
    else g.resting = 0;
    g.spin += dt * Math.min(14, Math.sqrt(speed2) * 1.7);

    if (g.fuse > 0 && now - g.born >= g.fuse) return true;
    if (g.gtype === 'smoke' && g.resting > 0.35) return true;   // smokes pop where they settle
    if (now - g.born > 12) return true;                          // failsafe
    return false;
  };

  /* ---------------------------------------------------------------
   * Detonation
   * ------------------------------------------------------------- */
  G.detonate = function (state, g, world, now, players, events) {
    g.detonated = true;
    var w = W.get(g.wid);

    if (g.gtype === 'smoke') {
      var gy = world.dropToFloor(g.pos.x, g.pos.y + 0.2, g.pos.z, 4.0);
      state.smokes.push({
        id: g.id, pos: { x: g.pos.x, y: Math.min(g.pos.y, gy + 1.0) + 0.55, z: g.pos.z },
        radius: 0.5, maxRadius: w.radius, opacity: 0,
        born: now, expand: w.expand || 1.4, duration: w.duration || 16,
        owner: g.owner, team: g.team
      });
      events.push({ t: 'smoke', x: g.pos.x, y: g.pos.y, z: g.pos.z, id: g.id });
      return;
    }

    if (g.gtype === 'fire') {
      var patches = G.spawnFire(state, g, world, now, w);
      events.push({ t: 'fire', x: g.pos.x, y: g.pos.y, z: g.pos.z, id: g.id, n: patches });
      return;
    }

    if (g.gtype === 'flash') {
      events.push({ t: 'flash', x: g.pos.x, y: g.pos.y, z: g.pos.z, id: g.id, owner: g.owner, team: g.team });
      state.flashes.push({ pos: { x: g.pos.x, y: g.pos.y, z: g.pos.z }, time: now, owner: g.owner, team: g.team });
      return;
    }

    if (g.gtype === 'he') {
      events.push({ t: 'he', x: g.pos.x, y: g.pos.y, z: g.pos.z, id: g.id, owner: g.owner, team: g.team, radius: w.radius });
      return;
    }
  };

  /* Fire spreads across the floor in a limited patch cluster. */
  G.spawnFire = function (state, g, world, now, w) {
    var base = { x: g.pos.x, y: world.dropToFloor(g.pos.x, g.pos.y + 0.3, g.pos.z, 3.0), z: g.pos.z };
    var count = 0;
    var rng = M.mulberry32(g.id * 7919);
    var tries = 22;
    var patches = [];
    patches.push({ x: base.x, y: base.y, z: base.z, r: 1.15, born: now });
    for (var i = 0; i < tries && patches.length < 9; i++) {
      var a = rng() * Math.PI * 2;
      var d = 0.7 + rng() * (w.spread || 1.5) * 1.25;
      var px = base.x + Math.cos(a) * d, pz = base.z + Math.sin(a) * d;
      // fire only spreads where it has line of sight along the ground
      if (!world.losWorld(base.x, base.y + 0.35, base.z, px, base.y + 0.35, pz)) continue;
      var py = world.dropToFloor(px, base.y + 1.2, pz, 2.6);
      if (Math.abs(py - base.y) > 1.0) continue;
      patches.push({ x: px, y: py, z: pz, r: 0.95 + rng() * 0.35, born: now });
    }
    for (var k = 0; k < patches.length; k++) {
      state.fires.push({
        id: state.nextId++, gid: g.id, owner: g.owner, team: g.team,
        pos: { x: patches[k].x, y: patches[k].y, z: patches[k].z },
        radius: patches[k].r, born: now + k * 0.06,
        duration: (w.duration || 7) - k * 0.1, dps: w.dps || 24,
        grow: 0
      });
      count++;
    }
    return count;
  };

  /* ---------------------------------------------------------------
   * Per-frame update. `events` collects things the caller turns into
   * damage, sound and visuals.
   * ------------------------------------------------------------- */
  G.update = function (state, world, dt, now, players, events) {
    for (var i = state.proj.length - 1; i >= 0; i--) {
      var g = state.proj[i];
      if (G.stepProjectile(g, world, dt, now)) {
        G.detonate(state, g, world, now, players, events);
        state.proj.splice(i, 1);
      }
    }

    for (var s = state.smokes.length - 1; s >= 0; s--) {
      var sm = state.smokes[s];
      var age = now - sm.born;
      var grow = M.clamp(age / sm.expand, 0, 1);
      sm.radius = M.lerp(0.5, sm.maxRadius, M.smoothstep(grow));
      if (age < sm.expand) sm.opacity = M.clamp(age / (sm.expand * 0.55), 0, 1);
      else if (age > sm.duration - 2.0) sm.opacity = M.clamp((sm.duration - age) / 2.0, 0, 1);
      else sm.opacity = 1;
      if (age > sm.duration) state.smokes.splice(s, 1);
    }

    for (var f = state.fires.length - 1; f >= 0; f--) {
      var fi = state.fires[f];
      var fage = now - fi.born;
      fi.grow = M.clamp(fage / 0.5, 0, 1) * M.clamp((fi.duration - fage) / 0.6, 0, 1);
      if (fage > fi.duration) state.fires.splice(f, 1);
    }

    // smokes put fires out where they overlap
    for (var s2 = 0; s2 < state.smokes.length; s2++) {
      var sv = state.smokes[s2];
      if (sv.opacity < 0.5) continue;
      for (var f2 = state.fires.length - 1; f2 >= 0; f2--) {
        var fv = state.fires[f2];
        if (M.vdist(sv.pos, fv.pos) < sv.radius * 0.85) state.fires.splice(f2, 1);
      }
    }

    state.smokeView = state.smokes;
    world.smokes = state.smokes;
  };

  /* Damage per second a player standing in fire takes (0 when clear). */
  G.fireDamage = function (state, p, dt) {
    if (!p.alive) return null;
    for (var i = 0; i < state.fires.length; i++) {
      var f = state.fires[i];
      if (f.grow < 0.15) continue;
      var dx = p.pos.x - f.pos.x, dz = p.pos.z - f.pos.z;
      var dy = p.pos.y - f.pos.y;
      if (dy < -0.6 || dy > 1.8) continue;
      if (dx * dx + dz * dz > f.radius * f.radius) continue;
      return { dmg: f.dps * dt, owner: f.owner, team: f.team };
    }
    return null;
  };

  /* HE damage with line-of-sight falloff. */
  G.explosionDamage = function (ev, p, world) {
    var w = W.get('he');
    var eye = { x: p.pos.x, y: p.pos.y + p.height * 0.55, z: p.pos.z };
    var dist = M.vdist(eye, ev);
    var radius = ev.radius || w.radius;
    if (dist > radius) return 0;
    if (!world.losWorld(ev.x, ev.y, ev.z, eye.x, eye.y, eye.z)) {
      // partial cover: try the feet and the head before giving up
      if (!world.losWorld(ev.x, ev.y, ev.z, p.pos.x, p.pos.y + 0.2, p.pos.z) &&
          !world.losWorld(ev.x, ev.y, ev.z, p.pos.x, p.pos.y + p.height - 0.1, p.pos.z)) return 0;
      dist *= 1.45;
      if (dist > radius) return 0;
    }
    return w.dmg * Math.pow(1 - dist / radius, 1.4);
  };

  /* Flash blindness: 0..1 plus a hold time before it starts fading. */
  G.flashEffect = function (ev, p, world) {
    var eye = { x: p.pos.x, y: p.pos.y + p.eye, z: p.pos.z };
    var dx = ev.x - eye.x, dy = ev.y - eye.y, dz = ev.z - eye.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 20) return null;
    if (!world.losWorld(eye.x, eye.y, eye.z, ev.x, ev.y, ev.z)) return null;

    var l = dist || 1;
    var fx = dx / l, fy = dy / l, fz = dz / l;
    var look = M.angleVectors(p.yaw, p.pitch);
    var dot = look.x * fx + look.y * fy + look.z * fz;     // 1 = staring straight at it

    // Behind you it does almost nothing; a 90-degree glance clips you briefly.
    var facing = M.clamp((dot + 0.32) / 1.32, 0, 1);
    facing = Math.pow(facing, 1.45);
    var prox = M.clamp(1 - dist / 20, 0, 1);
    prox = 0.35 + 0.65 * prox * prox;

    var strength = facing * prox;
    if (strength < 0.06) return null;
    return {
      amount: M.clamp(strength * 1.15, 0, 1),
      hold: strength * strength * 3.1        // seconds of full white before it fades
    };
  };

  /* Does a smoke block this line? Used by bots and by the audio occlusion. */
  G.smokeBlocks = function (state, ax, ay, az, bx, by, bz) {
    var depth = 0;
    for (var i = 0; i < state.smokes.length; i++) {
      var s = state.smokes[i];
      if (s.opacity < 0.15) continue;
      depth += M.segmentSphereDepth(ax, ay, az, bx, by, bz, s.pos, s.radius) * s.opacity;
      if (depth > 1.2) return true;
    }
    return false;
  };

  /* Clients receive smoke and fire state from the host; they only need to
   * keep thrown grenades moving smoothly between snapshots. */
  G.stepProjectilesOnly = function (state, world, dt, now) {
    for (var i = 0; i < state.proj.length; i++) {
      G.stepProjectile(state.proj[i], world, dt, now);
    }
  };

  G.clear = function (state) {
    state.proj.length = 0; state.smokes.length = 0;
    state.fires.length = 0; state.flashes.length = 0;
  };

  CS.G = G;
})(typeof window !== 'undefined' ? window : globalThis);
