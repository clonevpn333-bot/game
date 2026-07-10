/* ============================================================
 * Player controller: movement + collision vs map, health/regen,
 * camera (look, bob, recoil, shake), grenades with arc indicator,
 * interaction, door animation.
 * ============================================================ */
RT.player = (() => {
  const PL = {};
  const pos = new THREE.Vector3();       // feet position
  const vel = new THREE.Vector3();
  let yaw = 0, pitch = 0;
  let health = 100, lastHurt = -99, dead = false;
  let crouchK = 0, wantCrouch = false, sprinting = false, grounded = true;
  let bobT = 0, speedF = 0, lookVelX = 0, lookVelY = 0;
  let kickP = 0, kickY = 0, recovP = 0;
  let grenades = 4, gCooking = -1;
  const EYE = 1.62, EYE_C = 1.08, R = 0.34;
  const _shake = new THREE.Vector3();

  Object.defineProperties(PL, {
    pos: { get: () => pos }, vel: { get: () => vel },
    yaw: { get: () => yaw, set: v => { yaw = v; } },
    pitch: { get: () => pitch, set: v => { pitch = v; } },
    health: { get: () => health }, dead: { get: () => dead },
    sprinting: { get: () => sprinting }, speedF: { get: () => speedF },
    grenades: { get: () => grenades, set: v => { grenades = v; } },
    crouched: { get: () => crouchK > 0.5 },
  });
  PL.eyeY = () => pos.y + lerp(EYE, EYE_C, crouchK);

  PL.init = function (spawn) {
    pos.set(spawn.x, RT.map.groundAt(spawn.x, spawn.z, 999) + 0.05, spawn.z);
    vel.set(0, 0, 0);
    yaw = spawn.ry || 0; pitch = 0;
    health = 100; dead = false; lastHurt = -99;
    grenades = 4;
    RT.engine.camera.position.set(pos.x, PL.eyeY(), pos.z);
  };
  PL.addRecoil = function (p, y) { kickP += p; kickY += y; };
  PL.state = () => ({ pos: pos.clone(), yaw, pitch, health, grenades });
  PL.restore = (s) => { pos.copy(s.pos); yaw = s.yaw; pitch = s.pitch; health = 100; dead = false; grenades = Math.max(2, s.grenades); };

  PL.damage = function (amount, fromPos) {
    if (dead || RT.game && RT.game.godmode) return;
    health -= amount;
    lastHurt = RT.engine.time;
    RT.engine.shake(0.12 + amount * 0.004);
    if (RT.audio) RT.audio.hurt();
    if (RT.hud) {
      RT.hud.pulseVignette(clamp(1.3 - health / 100, 0.25, 1));
      if (fromPos) {
        const a = Math.atan2(fromPos.x - pos.x, fromPos.z - pos.z);
        RT.hud.damageFrom(a - yaw + Math.PI);
      }
    }
    if (health <= 0) { health = 0; dead = true; if (RT.game) RT.game.onPlayerDeath(); }
  };

  /* collision resolve: circle (R) vs collider AABBs, axis separated */
  function collideMove(dx, dz) {
    const feet = pos.y;
    const head = feet + 1.75;
    for (const axis of [0, 1]) {
      const nx = pos.x + (axis === 0 ? dx : 0);
      const nz = pos.z + (axis === 1 ? dz : 0);
      let blocked = false;
      for (const c of RT.map.colliders) {
        if (c.disabled) continue;
        if (c.max.y < feet + 0.45 || c.min.y > head - 0.15) continue;    // step-under/step-over
        const cx = clamp(nx, c.min.x, c.max.x), cz = clamp(nz, c.min.z, c.max.z);
        const ddx = nx - cx, ddz = nz - cz;
        if (ddx * ddx + ddz * ddz < R * R) {
          if (c.max.y - feet <= 0.52 && grounded) continue;              // walkable step (handled by groundAt)
          blocked = true; break;
        }
      }
      if (!blocked) { if (axis === 0) pos.x = nx; else pos.z = nz; }
      else if (axis === 0) vel.x = 0; else vel.z = 0;
    }
  }

  PL.update = function (dt) {
    const I = RT.input, cam = RT.engine.camera;
    if (RT.game && RT.game.state !== 'play') return;

    /* look */
    let [mdx, mdy] = I.consumeMouse();
    if (I.fallback) {
      const ls = 2.4 * dt * 400;
      if (I.keys.ArrowLeft) mdx -= ls; if (I.keys.ArrowRight) mdx += ls;
      if (I.keys.ArrowUp) mdy -= ls; if (I.keys.ArrowDown) mdy += ls;
    }
    const sens = 0.0021 * RT.settings.sens * (RT.weapons && RT.weapons.state().adsK > 0.5 ? 0.6 : 1);
    yaw -= mdx * sens; pitch -= mdy * sens;
    pitch = clamp(pitch, -1.45, 1.45);
    lookVelX = damp(lookVelX, mdx / Math.max(dt, 0.001) / 800, 14, dt);
    lookVelY = damp(lookVelY, mdy / Math.max(dt, 0.001) / 800, 14, dt);

    /* recoil: kick applies fast, partial recovery pulls back (frame-rate independent) */
    const kApply = 1 - Math.exp(-26 * dt);
    const dp = kickP * kApply, dy = kickY * kApply;
    pitch += dp; yaw += dy;
    kickP -= dp; kickY -= dy;
    recovP += dp * 0.55;
    const rec = recovP * (1 - Math.exp(-5.5 * dt));
    pitch -= rec; recovP -= rec;

    if (dead) { crouchK = damp(crouchK, 1, 4, dt); applyCamera(dt); return; }

    /* stance */
    if (I.pressed('KeyC') || I.pressed('ControlLeft')) wantCrouch = !wantCrouch;
    const wish = new THREE.Vector3(
      (I.keys.KeyD ? 1 : 0) - (I.keys.KeyA ? 1 : 0), 0,
      (I.keys.KeyS ? 1 : 0) - (I.keys.KeyW ? 1 : 0));
    const moving = wish.lengthSq() > 0;
    sprinting = I.keys.ShiftLeft && I.keys.KeyW && !wantCrouch && !I.aim;
    if (sprinting) wantCrouch = false;
    crouchK = damp(crouchK, wantCrouch ? 1 : 0, 10, dt);

    /* movement */
    const adsK = RT.weapons ? RT.weapons.state().adsK : 0;
    let speed = 4.3;
    if (sprinting) speed = 6.6;
    if (wantCrouch) speed = 2.3;
    if (adsK > 0.5) speed = 2.7;
    wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const accel = grounded ? 38 : 8;
    vel.x = damp(vel.x, wish.x * speed, accel / speed * 4, dt);
    vel.z = damp(vel.z, wish.z * speed, accel / speed * 4, dt);

    /* gravity + jump */
    const ground = RT.map.groundAt(pos.x, pos.z, pos.y);
    vel.y -= 19 * dt;
    if (I.pressed('Space') && grounded) {
      vel.y = 5.6;
      // mantle-lite: extra boost against chest-high obstacle ahead
      const aheadX = pos.x + Math.sin(-yaw) * 0.7 * 0 + wish.x * 0.6, aheadZ = pos.z + wish.z * 0.6;
      const og = RT.map.groundAt(aheadX, aheadZ, pos.y + 1.4);
      if (og - pos.y > 0.5 && og - pos.y < 1.25) vel.y = 6.4;
      if (RT.audio) RT.audio.footstep(1);
    }
    pos.y += vel.y * dt;
    if (pos.y <= ground) { pos.y = ground; vel.y = 0; grounded = true; }
    else grounded = pos.y - ground < 0.08;

    collideMove(vel.x * dt, vel.z * dt);

    /* keep inside map bounds */
    const lim = RT.map.terrain.size / 2 - 4;
    pos.x = clamp(pos.x, -lim, lim); pos.z = clamp(pos.z, -lim, lim);

    /* footsteps + speed factor */
    const hSpeed = Math.hypot(vel.x, vel.z);
    speedF = clamp(hSpeed / 6.6, 0, 1);
    bobT += dt * (5 + speedF * 5.5) * (hSpeed > 0.4 ? 1 : 0);
    if (grounded && hSpeed > 0.5) {
      PL._stepAcc = (PL._stepAcc || 0) + hSpeed * dt;
      const stride = sprinting ? 2.4 : 1.9;
      if (PL._stepAcc > stride) {
        PL._stepAcc = 0;
        if (RT.audio) RT.audio.footstep(speedF);
      }
    }

    /* health regen */
    if (health < 100 && RT.engine.time - lastHurt > 4.6) {
      health = Math.min(100, health + 26 * dt);
    }
    if (RT.hud) RT.hud.setHealth(health, RT.engine.time - lastHurt);

    /* grenade */
    updateGrenade(dt);
    /* interact */
    updateInteract(dt);
    /* doors */
    updateDoors(dt);

    applyCamera(dt);
  };

  function applyCamera(dt) {
    const cam = RT.engine.camera;
    const bobA = speedF * (sprinting ? 0.05 : 0.032) * (grounded ? 1 : 0.2);
    const bobY = Math.abs(Math.sin(bobT)) * bobA;
    const bobX = Math.sin(bobT * 0.5) * bobA * 0.6;
    RT.engine.getShakeOffset(_shake);
    cam.position.set(pos.x + bobX * Math.cos(yaw) + _shake.x, PL.eyeY() + bobY + _shake.y + (dead ? -0.5 : 0), pos.z + bobX * Math.sin(yaw) + _shake.z);
    cam.rotation.set(pitch + _shake.x * 0.8, yaw + _shake.y * 0.8, _shake.z * 0.7 + (dead ? 0.4 : 0));
    RT.engine.updateSun(cam.position);
  }

  /* ---------- grenades ---------- */
  let arcDots = null;
  function grenadeVel() {
    const cam = RT.engine.camera;
    const d = new THREE.Vector3();
    cam.getWorldDirection(d);
    d.multiplyScalar(13.5).add(new THREE.Vector3(0, 3.4, 0));
    return d;
  }
  function updateGrenade(dt) {
    const I = RT.input;
    if (I.keys.KeyG && grenades > 0 && gCooking < 0) gCooking = 0;
    if (gCooking >= 0) {
      gCooking += dt;
      if (!arcDots) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
        arcDots = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd080, size: 0.09, sizeAttenuation: true, depthTest: false, transparent: true, opacity: 0.85 }));
        arcDots.renderOrder = 30; arcDots.frustumCulled = false;
        RT.engine.scene.add(arcDots);
      }
      arcDots.visible = true;
      const v = grenadeVel(), p = new THREE.Vector3(pos.x, PL.eyeY() - 0.1, pos.z);
      const arr = arcDots.geometry.attributes.position.array;
      let idx = 0;
      for (let i = 0; i < 16; i++) {
        const t = (i + 1) * 0.13;
        arr[idx++] = p.x + v.x * t;
        arr[idx++] = p.y + v.y * t - 9.8 * t * t / 2;
        arr[idx++] = p.z + v.z * t;
      }
      arcDots.geometry.attributes.position.needsUpdate = true;
      if (!I.keys.KeyG || gCooking > 3.2) {
        arcDots.visible = false;
        throwGrenade(Math.max(0.2, 4 - gCooking));
        gCooking = -1;
      }
    } else if (arcDots) arcDots.visible = false;
  }
  function throwGrenade(fuse) {
    grenades--;
    if (RT.hud) RT.hud.refreshAmmo();
    const geos = [RT.G.sph(0.055, 10, 8, 0x3a4433, {}), RT.G.cyl(0.02, 0.02, 0.03, 6, 0x6a6a5a, { y: 0.06 }),
      RT.G.box(0.015, 0.07, 0.03, 0x8a8578, { x: 0.02, y: 0.045, rz: -0.3 })];
    const m = RT.meshOf(geos, RT.MAT.gun);
    const p = new THREE.Vector3(pos.x, PL.eyeY() - 0.1, pos.z);
    const v = grenadeVel();
    m.position.copy(p);
    RT.engine.scene.add(m);
    if (RT.audio) RT.audio.throwWhoosh();
    let t = 0;
    (RT.transients = RT.transients || []).push((dt2) => {
      t += dt2; fuse -= dt2;
      v.y -= 9.8 * dt2;
      const nx = m.position.x + v.x * dt2, ny = m.position.y + v.y * dt2, nz = m.position.z + v.z * dt2;
      const hit = RT.map.raycast(m.position.x, m.position.y, m.position.z, v.x * dt2, v.y * dt2, v.z * dt2, 1.001, true);
      const g = RT.map.groundAt(nx, nz, ny + 0.5);
      if (ny <= g + 0.05) {
        m.position.set(nx, g + 0.05, nz);
        if (Math.abs(v.y) > 1.5 && RT.audio) RT.audio.gBounce();
        v.y = Math.abs(v.y) * 0.38;
        v.x *= 0.55; v.z *= 0.55;
      } else if (hit) {
        // reflect off surface
        const n = hit.normal;
        const dot = v.x * n.x + v.y * n.y + v.z * n.z;
        v.x -= 2 * dot * n.x; v.y -= 2 * dot * n.y; v.z -= 2 * dot * n.z;
        v.multiplyScalar(0.42);
        if (RT.audio) RT.audio.gBounce();
      } else m.position.set(nx, ny, nz);
      m.rotation.x += 6 * dt2; m.rotation.z += 4 * dt2;
      if (fuse <= 0) {
        RT.engine.scene.remove(m);
        PL.explode(m.position, 6.2, 118);
        return false;
      }
      return true;
    });
  }
  PL.explode = function (p, radius, dmg) {
    RT.fxExplosion(p, radius);
    // damage player
    const d2p = Math.hypot(p.x - pos.x, p.y - (pos.y + 1), p.z - pos.z);
    if (d2p < radius) PL.damage(dmg * (1 - d2p / radius), p);
    if (RT.ai) RT.ai.explosionAt(p, radius, dmg);
  };

  /* ---------- interaction ---------- */
  let curInteract = null;
  function updateInteract(dt) {
    const eye = PL.eyeY();
    curInteract = null;
    let bestD = 99;
    for (const it of RT.map.interact) {
      if (it.used) continue;
      const p = it.getPos ? it.getPos() : it;
      const d = Math.hypot(p.x - pos.x, (p.y - eye) * 0.6, p.z - pos.z);
      if (d < (it.r || 1.7) && d < bestD) { bestD = d; curInteract = it; }
    }
    if (RT.hud) RT.hud.setInteract(curInteract ? (curInteract.door ? (curInteract.door.breach ? 'BREACH' : (curInteract.door.open ? 'CLOSE' : 'OPEN')) : curInteract.label) : null);
    if (curInteract && RT.input.pressed('KeyF')) {
      if (curInteract.door) {
        const dr = curInteract.door;
        if (dr.breach && !dr.open) {
          dr.open = true; dr.target = 1.15; dr.speed = 14;
          if (RT.game && RT.game.onBreach) RT.game.onBreach(dr);
          if (RT.audio) RT.audio.doorKick();
        } else {
          dr.open = !dr.open; dr.target = dr.open ? 1.05 : 0; dr.speed = 5;
          if (RT.audio) RT.audio.doorCreak();
        }
      } else if (curInteract.fn) {
        curInteract.fn(curInteract);
        if (curInteract.once) curInteract.used = true;
      }
    }
  }
  function updateDoors(dt) {
    for (const d of RT.map.doors) {
      const target = d.target || 0;
      if (Math.abs(d.t - target) > 0.001) {
        d.t = damp(d.t, target, d.speed || 5, dt);
        d.pivot.rotation.y = d.baseRy + d.t * Math.PI * 0.52;
        d.updateCol();
      }
    }
  }

  return PL;
})();

/* explosion FX shared by grenades / mortars / charges */
RT.fxExplosion = function (p, radius) {
  const E = RT.engine;
  E.flash(new THREE.Vector3(p.x, p.y + 1.2, p.z), 0xffb058, 5.5, radius * 4.5, 0.35);
  E.shake(clamp(1.4 - RT.player.pos.distanceTo(p) / 40, 0.15, 1));
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * TAU, r = Math.random();
    E.particle(p.x, p.y + 0.2, p.z,
      Math.cos(a) * r * 7, 3 + Math.random() * 8, Math.sin(a) * r * 7,
      { color: [0xff9b40, 0xffc060, 0x54473a, 0x2e2a24][i % 4], size: 0.32 + Math.random() * 0.5, life: 0.7 + Math.random() * 0.9, grav: -7, drag: 1.5, grow: -0.4 });
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * TAU;
    E.particle(p.x, p.y + 0.4, p.z, Math.cos(a) * 12 * Math.random(), 1 + Math.random() * 3, Math.sin(a) * 12 * Math.random(),
      { color: 0xffe0a0, size: 0.1, life: 0.35, grav: -2, drag: 0.5 });
  }
  // smoke column
  for (let i = 0; i < 10; i++) {
    E.particle(p.x + (Math.random() - .5), p.y + 0.5 + i * 0.3, p.z + (Math.random() - .5),
      (Math.random() - .5) * 1.5, 2 + Math.random() * 2, (Math.random() - .5) * 1.5,
      { color: 0x3d3833, size: 0.7 + Math.random() * 0.7, life: 1.6 + Math.random(), grav: 0.6, drag: 1.2, grow: -0.5, alpha: 0.75 });
  }
  E.decal(new THREE.Vector3(p.x, RT.map ? RT.map.terrain.heightAt(p.x, p.z) : p.y, p.z), new THREE.Vector3(0, 1, 0), 2.6, 0x1c1a16, 30);
  if (RT.audio) RT.audio.explosion(RT.player.pos.distanceTo(p));
};
