/* 50_combat.js — player controller, trackpad-first camera, weapons, damage, feel.
 * OWNER: main. CONTRACT §6 is the design brief: no pointer lock, one button, trackpad.
 */
VH.Combat = (function () {
  const U = VH.util;

  /* ------------------------------------------------------------------ tuning */
  const T = {
    walkSpeed: 3.4, runSpeed: 6.6, accel: 34, decel: 26, airAccel: 8,
    camDist: 5.0, camHeight: 2.05, camSide: 0.75, camLerp: 11,
    yawRate: 2.9, yawDead: 0.16, pitchMin: -0.42, pitchMax: 0.52,
    aimDist: 60,
    dashSpeed: 15.5, dashTime: 0.20, dashIFrames: 0.22, dashCharges: 2, dashRecharge: 1.6,
    magnetCone: 0.10,          /* radians of screen-space magnetism */
    focusScale: 0.28, focusDrain: 0.55, focusRegen: 0.22, focusMax: 1,
  };

  const weapons = {
    glassjaw: { name: 'GLASSJAW', kind: 'auto', rpm: 690, dmg: 11, spread: 0.020, spreadMax: 0.075,
                spreadPer: 0.008, recover: 0.10, mag: 32, reload: 1.15, recoil: 0.9,
                range: 60, falloff: 34, tracer: 0x9fe8ff, desc: 'chatters; bloom fast, burst it' },
    saltlight: { name: 'SALTLIGHT', kind: 'semi', rpm: 200, dmg: 34, spread: 0.006, spreadMax: 0.03,
                spreadPer: 0.012, recover: 0.22, mag: 9, reload: 1.35, recoil: 2.4,
                range: 70, falloff: 44, tracer: 0xffd9a8, desc: 'heavy, slow recovery, punches' },
    ninefold: { name: 'NINEFOLD', kind: 'shotgun', rpm: 95, dmg: 9, pellets: 9, spread: 0.085,
                spreadMax: 0.085, spreadPer: 0, recover: 0.3, mag: 6, reload: 1.8, recoil: 3.4,
                range: 22, falloff: 12, tracer: 0xff8a5a, desc: 'wide, knocks back, close only' },
  };

  let player = null;
  let yaw = 0, pitch = 0.04;
  let camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let dashT = 0, dashCharges = T.dashCharges, dashCool = 0, dashDir = new THREE.Vector3();
  let fireCool = 0, spread = 0, reloadT = 0, ammo = 32, curWeapon = 'glassjaw';
  let focus = 1, focusOn = false;
  let recoilKick = 0, fovKick = 0;
  let lockTarget = null;
  const tracers = [];
  const impacts = [];

  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
  const _ray = new THREE.Raycaster();

  /* ------------------------------------------------------------------ collide
   * Capsule (as a circle in XZ) against the world's axis-aligned boxes. Resolve on
   * the smallest penetration axis so the player slides along walls. */
  function collide(pos, radius) {
    const w = VH.ctx.world;
    if (!w || !w.colliders) return;
    for (const c of w.colliders) {
      if (c.type !== 'box') continue;
      if (pos.y > c.y + c.hh + 0.4) continue;          /* standing on top of it */
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const px = c.hw + radius - Math.abs(dx);
      const pz = c.hd + radius - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) pos.x += px * Math.sign(dx || 1);
        else pos.z += pz * Math.sign(dz || 1);
      }
    }
  }

  /* Does a ray from a to b hit static geometry? Used for shots and camera. */
  function rayBlocked(a, b) {
    const w = VH.ctx.world;
    if (!w || !w.colliders) return null;
    const dir = _v3.copy(b).sub(a);
    const len = dir.length();
    if (len < 1e-4) return null;
    dir.multiplyScalar(1 / len);
    let best = null, bestT = len;
    for (const c of w.colliders) {
      /* slab test against the AABB */
      let tmin = 0, tmax = bestT;
      const lo = [c.x - c.hw, c.y - c.hh, c.z - c.hd];
      const hi = [c.x + c.hw, c.y + c.hh, c.z + c.hd];
      const o = [a.x, a.y, a.z], d = [dir.x, dir.y, dir.z];
      let ok = true;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) { ok = false; break; } continue; }
        let t1 = (lo[i] - o[i]) / d[i], t2 = (hi[i] - o[i]) / d[i];
        if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) { ok = false; break; }
      }
      if (ok && tmin < bestT && tmin > 0.05) { bestT = tmin; best = tmin; }
    }
    return best === null ? null : a.clone().addScaledVector(dir, bestT);
  }

  /* ---------------------------------------------------------------- targeting
   * Trackpad aiming lives or dies on this. The reticle is the OS cursor; we widen
   * it into a cone and snap to whatever enemy is nearest that cone in screen space. */
  function pickTarget() {
    const cam = VH.Core.camera;
    if (!cam) return null;
    const mx = VH.Input.mouse.nx, my = VH.Input.mouse.ny;
    let best = null, bestD = T.magnetCone * (focusOn ? 2.4 : 1);
    for (const e of VH.ctx.enemies) {
      if (!e.alive) continue;
      _v.copy(e.chestPos()).project(cam);
      if (_v.z > 1) continue;
      const d = Math.hypot(_v.x - mx, _v.y - my);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /* World point the cursor is pointing at, used for aim and for the player's facing. */
  function aimPoint(out) {
    const cam = VH.Core.camera;
    _ray.setFromCamera({ x: VH.Input.mouse.nx, y: VH.Input.mouse.ny }, cam);
    if (lockTarget && lockTarget.alive) { out.copy(lockTarget.chestPos()); return out; }
    const hit = rayBlocked(_ray.ray.origin, _v2.copy(_ray.ray.origin).addScaledVector(_ray.ray.direction, T.aimDist));
    if (hit) out.copy(hit);
    else out.copy(_ray.ray.origin).addScaledVector(_ray.ray.direction, T.aimDist);
    return out;
  }

  /* ------------------------------------------------------------------ weapons */
  function fire() {
    const w = weapons[curWeapon];
    if (reloadT > 0 || fireCool > 0) return;
    if (ammo <= 0) { startReload(); return; }
    ammo--;
    fireCool = 60 / w.rpm;

    const origin = player.chestPos();
    const aim = aimPoint(_v);
    const shots = w.pellets || 1;
    for (let i = 0; i < shots; i++) {
      const dir = _v2.copy(aim).sub(origin).normalize();
      const sp = (w.pellets ? w.spread : spread) * (focusOn ? 0.25 : 1);
      dir.x += (Math.random() - 0.5) * sp; dir.y += (Math.random() - 0.5) * sp; dir.z += (Math.random() - 0.5) * sp;
      dir.normalize();
      const end = origin.clone().addScaledVector(dir, w.range);

      /* enemies first, then geometry */
      let hitActor = null, hitPt = null, hitDist = w.range;
      for (const e of VH.ctx.enemies) {
        if (!e.alive) continue;
        const c = e.chestPos();
        const to = _v3.copy(c).sub(origin);
        const along = to.dot(dir);
        if (along < 0 || along > hitDist) continue;
        const perp = to.addScaledVector(dir, -along).length();
        const r = e.radius + (w.pellets ? 0.25 : 0.18);
        if (perp < r) { hitDist = along; hitActor = e; hitPt = origin.clone().addScaledVector(dir, along); }
      }
      const geo = rayBlocked(origin, end);
      if (geo && origin.distanceTo(geo) < hitDist) { hitActor = null; hitPt = geo; }

      addTracer(origin, hitPt || end, w.tracer);
      if (hitActor) {
        const head = hitPt.y > hitActor.group.position.y + 1.5;
        const falloffMul = U.clamp(1 - Math.max(0, hitDist - w.falloff) / w.range, 0.45, 1);
        damage(hitActor, w.dmg * falloffMul * (head ? 2.2 : 1), { point: hitPt, dir: dir, part: head ? 'head' : 'body', weapon: w });
        addImpact(hitPt, 0xff5a6a, head ? 1.5 : 1);
      } else if (hitPt) {
        addImpact(hitPt, 0xffd9a8, 0.7);
      }
    }

    spread = Math.min(w.spreadMax, spread + w.spreadPer);
    recoilKick += w.recoil * 0.02;
    fovKick = Math.min(0.7, fovKick + w.recoil * 0.1);
    VH.Chars.play(player, 'fire');
    VH.emit('fire', { actor: player, weapon: w, origin: origin, dir: _v2 });
    VH.emit('shake', { amount: 0.05 + w.recoil * 0.02, dur: 0.16 });
  }

  function startReload() {
    const w = weapons[curWeapon];
    if (reloadT > 0 || ammo === w.mag) return;
    reloadT = w.reload;
    VH.Chars.play(player, 'reload');
    VH.emit('reload', { actor: player, weapon: w });
  }

  function damage(target, amount, opts) {
    opts = opts || {};
    if (!target || !target.alive) return;
    if (target === player && VH.ctx.flags.god) return;
    if (target.iframes > 0) return;
    target.hp -= amount;
    VH.emit('hit', { attacker: opts.attacker || player, target: target, dmg: amount,
                     point: opts.point, part: opts.part || 'body', weapon: opts.weapon });
    if (target === player) VH.emit('playerHit', { dmg: amount, from: opts.attacker });

    if (target.hp <= 0) {
      target.alive = false;
      target.state = 'death';
      VH.Chars.play(target, 'death');
      const i = VH.ctx.enemies.indexOf(target);
      if (i > -1) VH.ctx.enemies.splice(i, 1);
      VH.emit('kill', { attacker: opts.attacker || player, target: target, part: opts.part });
      VH.emit('hitstop', { dur: 0.075 });
      VH.emit('shake', { amount: 0.22, dur: 0.3 });
      if (lockTarget === target) lockTarget = null;
    } else {
      /* hit reaction: direction-aware, additive so they keep moving */
      target.stagger = Math.max(target.stagger, amount > 25 ? 0.5 : 0.16);
      const side = opts.dir ? Math.sign(opts.dir.clone().cross(new THREE.Vector3(0, 1, 0)).dot(
        _v3.copy(target.group.position).sub(opts.point || target.group.position))) : 1;
      VH.Chars.play(target, amount > 25 ? 'stagger' : (side > 0 ? 'hitL' : 'hitR'));
      VH.emit('hitstop', { dur: 0.028 });
    }
  }

  /* ------------------------------------------------------------------- VFX */
  let tracerGeo = null, tracerMesh = null, impactMesh = null;
  function initVFX() {
    const g = new THREE.PlaneGeometry(1, 1);
    tracerMesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }), 64);
    tracerMesh.count = 0;
    tracerMesh.frustumCulled = false;
    tracerMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(64 * 3), 3);
    VH.ctx.scene.add(tracerMesh);

    impactMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 48);
    impactMesh.count = 0;
    impactMesh.frustumCulled = false;
    impactMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
    VH.ctx.scene.add(impactMesh);
  }

  function addTracer(a, b, color) {
    if (tracers.length > 60) tracers.shift();
    tracers.push({ a: a.clone(), b: b.clone(), t: 0, life: 0.09, color: new THREE.Color(color) });
  }
  function addImpact(p, color, scale) {
    if (impacts.length > 44) impacts.shift();
    impacts.push({ p: p.clone(), t: 0, life: 0.26, color: new THREE.Color(color), s: scale || 1 });
  }

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  function updateVFX(dt) {
    if (!tracerMesh) return;
    const cam = VH.Core.camera;
    let n = 0;
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      tr.t += dt;
      if (tr.t >= tr.life) { tracers.splice(i, 1); continue; }
      if (n >= 64) continue;
      const mid = _v.copy(tr.a).add(tr.b).multiplyScalar(0.5);
      const len = tr.a.distanceTo(tr.b);
      const dir = _v2.copy(tr.b).sub(tr.a).normalize();
      _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const fade = 1 - tr.t / tr.life;
      _s.set(0.045 * fade + 0.01, len, 1);
      _m.compose(mid, _q, _s);
      tracerMesh.setMatrixAt(n, _m);
      tracerMesh.instanceColor.setXYZ(n, tr.color.r * fade, tr.color.g * fade, tr.color.b * fade);
      n++;
    }
    tracerMesh.count = n;
    tracerMesh.instanceMatrix.needsUpdate = true;
    tracerMesh.instanceColor.needsUpdate = true;

    let m = 0;
    for (let i = impacts.length - 1; i >= 0; i--) {
      const im = impacts[i];
      im.t += dt;
      if (im.t >= im.life) { impacts.splice(i, 1); continue; }
      if (m >= 48) continue;
      const f = im.t / im.life;
      const sc = im.s * (0.4 + f * 2.2);
      _m.compose(im.p, _q.identity(), _s.set(sc, sc, sc));
      impactMesh.setMatrixAt(m, _m);
      const fade = (1 - f) * (1 - f);
      impactMesh.instanceColor.setXYZ(m, im.color.r * fade, im.color.g * fade, im.color.b * fade);
      m++;
    }
    impactMesh.count = m;
    impactMesh.instanceMatrix.needsUpdate = true;
    impactMesh.instanceColor.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ camera */
  function updateCamera(dt, raw) {
    const t = VH.Core.camTarget;
    if (!player) return;

    /* Yaw from cursor X distance off centre, rate-based, with a dead zone so a
     * resting cursor never drifts the camera. This is the trackpad answer to
     * having no relative mouse motion. */
    const nx = VH.Input.mouse.nx, ny = VH.Input.mouse.ny;
    const ax = Math.abs(nx) < T.yawDead ? 0 : (nx - Math.sign(nx) * T.yawDead) / (1 - T.yawDead);
    yaw -= ax * Math.abs(ax) * T.yawRate * raw;
    if (VH.Input.keys.KeyQ) yaw += 1.9 * raw;
    if (VH.Input.keys.KeyE) yaw -= 1.9 * raw;
    const ay = Math.abs(ny) < T.yawDead ? 0 : (ny - Math.sign(ny) * T.yawDead) / (1 - T.yawDead);
    pitch = U.damp(pitch, U.clamp(ay * 0.55, T.pitchMin, T.pitchMax), 8, raw);

    const p = player.group.position;
    const back = _v.set(Math.sin(yaw), 0, Math.cos(yaw));
    const right = _v2.set(Math.cos(yaw), 0, -Math.sin(yaw));

    const dist = T.camDist * (focusOn ? 0.85 : 1) - recoilKick * 0.5;
    const desired = _v3.copy(p)
      .addScaledVector(back, dist)
      .addScaledVector(right, T.camSide);
    desired.y = p.y + T.camHeight + dist * pitch;

    /* never let the camera enter geometry, and never let it go under the ground */
    const eye = _v.copy(p); eye.y += 1.5;
    const blocked = rayBlocked(eye, desired);
    if (blocked) desired.copy(blocked).addScaledVector(_v2.copy(desired).sub(eye).normalize(), -0.35);
    const ground = VH.ctx.world ? VH.ctx.world.navSample(desired.x, desired.z).y : 0;
    desired.y = Math.max(desired.y, ground + 0.55);

    camPos.lerp(desired, 1 - Math.exp(-T.camLerp * raw));
    camLook.lerp(_v.copy(p).setY(p.y + 1.42).addScaledVector(right, T.camSide * 0.5), 1 - Math.exp(-13 * raw));

    t.pos.copy(camPos);
    t.look.copy(camLook);
    t.fov = 55 + fovKick * 4 - (focusOn ? 5 : 0);
  }

  /* ------------------------------------------------------------------ update */
  function update(dt, raw) {
    raw = raw || dt || 1 / 60;
    if (!player || !player.alive) { if (player) updateCamera(dt, raw); updateVFX(raw); return; }

    /* ---- focus (slow-mo) ---- */
    const wantFocus = VH.Input.keys.Space && focus > 0.02;
    if (wantFocus !== focusOn) { focusOn = wantFocus; VH.emit(focusOn ? 'focusStart' : 'focusEnd', {}); }
    if (focusOn) focus = Math.max(0, focus - T.focusDrain * raw);
    else focus = Math.min(T.focusMax, focus + T.focusRegen * raw);
    VH.ctx.timeScale = U.damp(VH.ctx.timeScale, focusOn ? T.focusScale : 1, 12, raw);

    /* ---- targeting ---- */
    const picked = pickTarget();
    if (picked) lockTarget = picked;
    else if (lockTarget && (!lockTarget.alive)) lockTarget = null;
    if (VH.Input.pressed('Tab')) {
      const alive = VH.ctx.enemies.filter(e => e.alive);
      if (alive.length) lockTarget = alive[(alive.indexOf(lockTarget) + 1) % alive.length];
    }

    /* ---- movement ---- */
    const ax = VH.Input.axis();
    const fwd = _v.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = _v2.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const wish = _v3.set(0, 0, 0).addScaledVector(fwd, -ax.z).addScaledVector(right, ax.x);
    if (wish.lengthSq() > 1) wish.normalize();

    const running = VH.Input.keys.ShiftLeft || VH.Input.keys.ShiftRight;
    const targetSpeed = (running && ax.len > 0.1 ? T.runSpeed : T.walkSpeed) * (focusOn ? 0.7 : 1);

    /* dash */
    dashCool -= raw;
    if (dashCharges < T.dashCharges && dashCool <= 0) { dashCharges++; dashCool = T.dashRecharge; }
    if (VH.Input.pressed('ShiftLeft') && ax.len > 0.1 && dashCharges > 0 && dashT <= 0) {
      dashCharges--; dashT = T.dashTime; dashDir.copy(wish);
      player.iframes = T.dashIFrames;
      VH.Chars.play(player, 'dash');
      VH.emit('dash', { actor: player, dir: dashDir });
      VH.emit('shake', { amount: 0.06, dur: 0.12 });
    }

    if (dashT > 0) {
      dashT -= dt;
      const e = U.easeOutQuint(1 - dashT / T.dashTime);
      player.vel.copy(dashDir).multiplyScalar(T.dashSpeed * (1 - e * 0.55));
    } else {
      const desiredVel = wish.multiplyScalar(targetSpeed);
      const rate = wish.lengthSq() > 0.001 ? T.accel : T.decel;
      player.vel.x = U.damp(player.vel.x, desiredVel.x, rate * 0.3, dt);
      player.vel.z = U.damp(player.vel.z, desiredVel.z, rate * 0.3, dt);
    }

    player.iframes = Math.max(0, player.iframes - dt);
    player.stagger = Math.max(0, player.stagger - dt);

    const pos = player.group.position;
    pos.x += player.vel.x * dt;
    pos.z += player.vel.z * dt;
    collide(pos, player.radius);
    /* keep the player inside the district */
    const b = VH.ctx.world && VH.ctx.world.bounds;
    if (b) {
      pos.x = U.clamp(pos.x, b.min.x + 1, b.max.x - 1);
      pos.z = U.clamp(pos.z, b.min.z + 1, b.max.z - 1);
    }

    /* ---- facing + aim ---- */
    aimPoint(player.aim);
    const speed = Math.hypot(player.vel.x, player.vel.z);
    if (lockTarget || VH.Input.down) {
      const d = _v.copy(player.aim).sub(pos);
      player.yaw = Math.atan2(-d.x, -d.z);
    } else if (speed > 0.4) {
      player.yaw = Math.atan2(-player.vel.x, -player.vel.z);
    }
    VH.Chars.lookAt(player, player.aim, 1);

    /* ---- animation state ---- */
    if (player.stagger > 0) player.state = 'stagger';
    else if (dashT > 0) player.state = 'dash';
    else if (speed > T.walkSpeed + 0.6) player.state = 'run';
    else if (speed > 0.2) player.state = 'walk';
    else player.state = player.weapon ? 'aim' : 'idle';

    /* ---- weapons ---- */
    const w = weapons[curWeapon];
    fireCool -= raw;
    if (reloadT > 0) { reloadT -= raw; if (reloadT <= 0) ammo = w.mag; }
    spread = Math.max(0, spread - w.recover * raw);
    recoilKick = U.damp(recoilKick, 0, 9, raw);
    fovKick = U.damp(fovKick, 0, 7, raw);

    if (VH.Input.down && !VH.ctx.paused) {
      if (w.kind === 'auto') fire();
      else if (VH.Input.clickedThisFrame) fire();
    }
    if (VH.Input.pressed('KeyR')) startReload();
    if (VH.Input.pressed('Digit1')) setWeapon('glassjaw');
    if (VH.Input.pressed('Digit2')) setWeapon('saltlight');
    if (VH.Input.pressed('Digit3')) setWeapon('ninefold');
    if (VH.Input.pressed('KeyF')) { VH.Chars.play(player, 'melee1'); meleeSwing(); }

    updateCamera(dt, raw);
    updateVFX(raw);
  }

  function meleeSwing() {
    const reach = 2.3;
    for (const e of VH.ctx.enemies) {
      if (!e.alive) continue;
      const d = e.group.position.distanceTo(player.group.position);
      if (d > reach) continue;
      const to = _v.copy(e.group.position).sub(player.group.position).normalize();
      const face = _v2.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      if (to.dot(face) < 0.35) continue;
      damage(e, 45, { point: e.chestPos(), dir: to, part: 'body' });
      e.vel.addScaledVector(face, 6);
    }
    VH.emit('melee', { actor: player, hit: true });
    VH.emit('shake', { amount: 0.12, dur: 0.2 });
  }

  function setWeapon(id) {
    if (!weapons[id] || curWeapon === id) return;
    curWeapon = id; ammo = weapons[id].mag; reloadT = 0; spread = 0;
  }

  function giveWeapon(actor, id) { if (actor === player) setWeapon(id); }

  function spawnPlayer(pos) {
    if (player) { VH.Chars.remove(player); const i = VH.ctx.actors.indexOf(player); if (i > -1) VH.ctx.actors.splice(i, 1); }
    player = VH.Chars.create('kas', { kind: 'player', team: 0 });
    const w = VH.ctx.world;
    const p = pos || (w && w.spawns ? w.spawns.player : new THREE.Vector3());
    player.group.position.copy(p);
    player.group.position.y = w ? w.navSample(p.x, p.z).y : 0;
    player.weapon = weapons[curWeapon];
    VH.ctx.scene.add(player.group);
    VH.ctx.player = player;
    VH.ctx.actors.push(player);
    ammo = weapons[curWeapon].mag;
    yaw = 0; pitch = 0.04;
    camPos.copy(player.group.position).add(new THREE.Vector3(0, T.camHeight, T.camDist));
    camLook.copy(player.group.position).setY(player.group.position.y + 1.4);
    return player;
  }

  function init() {
    initVFX();
    /* Boot straight into a walkable city unless a test harness owns the camera. */
    if (!VH.q.chartest && !VH.q.worldtest && !VH.q.coretest && !VH.q.mattest && !VH.q.uitest) {
      spawnPlayer();
    }
  }

  return {
    init: init, update: update, spawnPlayer: spawnPlayer, damage: damage,
    giveWeapon: giveWeapon, setWeapon: setWeapon, weapons: weapons,
    get player() { return player; },
    get ammo() { return ammo; },
    get magSize() { return weapons[curWeapon].mag; },
    get reloading() { return reloadT > 0; },
    get focus() { return focus; },
    get focusOn() { return focusOn; },
    get dashCharges() { return dashCharges; },
    get target() { return lockTarget; },
    get weaponName() { return weapons[curWeapon].name; },
    get spread() { return spread; },
  };
})();
