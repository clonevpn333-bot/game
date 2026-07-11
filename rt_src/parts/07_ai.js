/* ============================================================
 * AI: enemy state machine (PATROL/GUARD → ALERT → COMBAT →
 * SUPPRESSED / FLANK / FALLBACK), cover usage, squad barks,
 * range/movement accuracy model, allied squadmates, and the
 * combat hit-resolution shared with the player's weapons.
 * ============================================================ */
RT.ai = (() => {
  const A = {};
  const enemies = [], allies = [];
  A.enemies = enemies; A.allies = allies;
  let barkCd = 0, enemyGrenadeCd = 12;
  const BARKS_SPOT = ['Contact!', 'Enemy spotted!', 'There! Open fire!', 'Hostiles front!'];
  const BARKS_DEAD = ['Man down!', 'He’s hit!', 'They got Petrov!', 'Fall back and cover!'];
  const BARKS_GREN = ['Grenade out!', 'Frag out!'];
  const BARKS_FLANK = ['Flank left!', 'Push around!', 'Moving up!'];

  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();

  /* ---------- spawn ---------- */
  A.reset = function () {
    for (const e of enemies) if (e.rig.group.parent) e.rig.group.parent.remove(e.rig.group);
    for (const al of allies) if (al.rig.group.parent) al.rig.group.parent.remove(al.rig.group);
    enemies.length = 0; allies.length = 0;
  };

  A.spawnEnemy = function (x, z, opts) {
    opts = opts || {};
    const rig = RT.character.build({ faction: 'enemy', seed: (x * 37 + z * 91) | 0, rifle: true });
    const y = opts.y != null ? opts.y : RT.map.groundAt(x, z, 999);
    rig.group.position.set(x, y, z);
    RT.engine.world.add(rig.group);
    const e = {
      rig, x, z, y, home: { x, z }, group: opts.group || 'default',
      state: opts.type === 'patrol' ? 'patrol' : 'guard',
      hp: 100, dead: false, yaw: opts.dir ? Math.atan2(opts.dir[0], opts.dir[1]) : Math.random() * TAU,
      alertT: 0, lastKnown: null, cover: null, atCover: false,
      peekT: 0, peeking: false, burstLeft: 0, fireCd: Math.random(),
      losT: Math.random() * 0.3, hasLOS: false, suppression: 0,
      patrolAngle: Math.random() * TAU, patrolRadius: opts.radius || 10, patrolWait: 0,
      moveTarget: null, speed: 0, flanker: false, upstairs: opts.upstairs,
      muzzle: mkMuzzleFlash(rig),
    };
    e.rig.anim.mode = e.state === 'patrol' ? 'walk' : 'idle';
    /* stealth missions: visible vision cone while unalerted */
    if (RT.map.def && RT.map.def.stealth) {
      const half = 1.05; // ~60 deg half-angle
      const cg = new THREE.CircleGeometry(7, 20, -Math.PI / 2 - half, half * 2);
      cg.rotateX(-Math.PI / 2);
      const cone = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({
        color: 0xd8b13c, transparent: true, opacity: 0.11, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      cone.position.y = 0.12;
      cone.renderOrder = 3;
      rig.group.add(cone);
      e.cone = cone;
    }
    enemies.push(e);
    return e;
  };

  function mkMuzzleFlash(rig) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffca66, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), mat);
      p.rotation.z = i * Math.PI / 2;
      g.add(p);
    }
    g.position.set(0, 0.02, 0.5);
    g.visible = false;
    if (rig.rifle) rig.rifle.add(g);
    return g;
  }

  A.spawnAllies = function (spawns, names) {
    const defs = names || [
      { name: 'MARSH', headgear: 'helmet', paletteIdx: 0 },
      { name: 'DOC', headgear: 'boonie', paletteIdx: 1 },
      { name: 'VANE', headgear: 'helmet', paletteIdx: 2 },
    ];
    defs.forEach((d, i) => {
      if (!spawns[i]) return;
      const rig = RT.character.build({ faction: 'ally', seed: 100 + i * 7, headgear: d.headgear, paletteIdx: d.paletteIdx, rifle: true });
      const y = RT.map.groundAt(spawns[i].x, spawns[i].z, 999);
      rig.group.position.set(spawns[i].x, y, spawns[i].z);
      /* subtle green rim tint so allies read as friendly at a glance */
      if (!RT.MAT.allyStd) {
        RT.MAT.allyStd = RT.MAT.std.clone();
        RT.MAT.allyStd.emissive = new THREE.Color(0x0a2010);
        RT.MAT.allyStd.emissiveIntensity = 0.55;
      }
      for (const m of rig.meshes) if (m.material === RT.MAT.std) m.material = RT.MAT.allyStd;
      RT.engine.world.add(rig.group);
      allies.push({
        hp: 100, down: false,
        rig, name: d.name, x: spawns[i].x, z: spawns[i].z, y,
        state: 'follow', fireCd: Math.random() * 2, target: null, losT: Math.random() * 0.4,
        offset: [(i - 1) * 2.2 - 1, 2.2 + i * 1.3], muzzle: mkMuzzleFlash(rig), moveTarget: null,
      });
    });
  };

  /* ---------- perception ---------- */
  function losToPlayer(e) {
    const eyeY = e.y + 1.55;
    const p = RT.player.pos;
    const py = RT.player.eyeY();
    const dx = p.x - e.x, dy = py - eyeY, dz = p.z - e.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > (RT.map.def.stealth ? 34 : 85)) return false;
    // facing check while unalerted
    if (e.state === 'patrol' || e.state === 'guard') {
      const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
      const dot = (dx * fx + dz * fz) / Math.max(0.001, Math.hypot(dx, dz));
      let fov = -0.15; // ~99 deg half-angle
      if (RT.map.def.stealth) fov = 0.35;
      if (dot < fov) return false;
      // crouch reduces detection distance
      if (RT.player.crouched && dist > 22 && RT.map.def.stealth) return false;
    }
    const hit = RT.map.raycast(e.x, eyeY, e.z, dx / dist, dy / dist, dz / dist, dist - 0.4);
    if (hit) return false;
    if (RT.smokeVolumes && RT.smokeVolumes.length && smokeBlocks(e.x, eyeY, e.z, dx / dist, dy / dist, dz / dist, dist)) return false;
    return true;
  }
  /* smoke grenades occlude line-of-sight: block if the sightline passes through an active cloud */
  function smokeBlocks(ox, oy, oz, dx, dy, dz, dist) {
    for (const s of RT.smokeVolumes) {
      const px = s.x - ox, py = s.y - oy, pz = s.z - oz;
      let t = px * dx + py * dy + pz * dz;
      t = Math.max(0, Math.min(dist, t));
      const cxp = ox + dx * t - s.x, cyp = oy + dy * t - s.y, czp = oz + dz * t - s.z;
      if (cxp * cxp + cyp * cyp + czp * czp < s.r * s.r) return true;
    }
    return false;
  }

  A.alertGroup = function (group, pos) {
    for (const e of enemies) {
      if (e.dead || e.group !== group) continue;
      if (e.state === 'patrol' || e.state === 'guard') {
        e.state = 'alert'; e.alertT = 0;
        e.lastKnown = { x: pos.x, z: pos.z };
      }
    }
  };
  A.alertAll = function () {
    const p = RT.player.pos;
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.state === 'patrol' || e.state === 'guard') { e.state = 'alert'; e.lastKnown = { x: p.x, z: p.z }; }
    }
  };

  /* ---------- cover selection ---------- */
  function pickCover(e) {
    const p = RT.player.pos;
    let best = null, bestScore = -1;
    for (const c of RT.map.cover) {
      if (c.claimed && c.claimed !== e && !c.claimed.dead) continue;
      const dE = Math.hypot(c.x - e.x, c.z - e.z);
      if (dE > 30) continue;
      const dP = Math.hypot(c.x - p.x, c.z - p.z);
      if (dP < 7 || dP > 70) continue;
      // cover dir should face the player
      const toP = [(p.x - c.x) / dP, (p.z - c.z) / dP];
      const facing = toP[0] * c.dir.x + toP[1] * c.dir.z;
      if (facing < 0.2) continue;
      const score = facing * 2 - dE * 0.05 - Math.abs(dP - 26) * 0.02;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (best) { if (e.cover) e.cover.claimed = null; best.claimed = e; e.cover = best; }
    return best;
  }

  /* ---------- enemy firing ---------- */
  function enemyFire(e, dt) {
    /* visible reload cycle: play the reload pose while the mag is swapped */
    if (e.reloadT > 0) {
      e.reloadT -= dt;
      if (e.rig) e.rig.anim.mode = 'reload';
      return;
    }
    e.fireCd -= dt;
    if (e.fireCd > 0) return;
    if (e.burstLeft <= 0) {
      e.burstLeft = 3 + (Math.random() * 3 | 0);
      e.fireCd = 0.8 + Math.random() * 1.3; // pause between bursts
      if (e.magLeft == null) e.magLeft = 24 + (Math.random() * 8 | 0);
      if (e.magLeft <= 0) { e.reloadT = 1.9 + Math.random() * 0.7; e.magLeft = 26 + (Math.random() * 8 | 0); }
      return;
    }
    e.burstLeft--;
    e.magLeft = (e.magLeft == null ? 28 : e.magLeft) - 1;
    e.fireCd = 0.11 + Math.random() * 0.04;
    // muzzle fx
    e.muzzle.visible = true;
    e.muzzle.rotation.z = Math.random() * TAU;
    setTimeout(() => { e.muzzle.visible = false; }, 40);
    const mp = _v1.setScalar(0);
    e.muzzle.getWorldPosition(mp);
    RT.engine.flash(mp, 0xffb050, 1.6, 9, 0.05);
    if (RT.audio) RT.audio.enemyShot(Math.hypot(e.x - RT.player.pos.x, e.z - RT.player.pos.z));
    /* accuracy model */
    const p = RT.player.pos;
    const py = RT.player.eyeY() - 0.25;
    const dist = Math.hypot(p.x - e.x, p.z - e.z);
    let spread = 0.035 + dist * 0.0009;
    spread *= 1 + RT.player.speedF * 1.1;
    if (RT.player.crouched) spread *= 1.25;
    spread *= 1 + e.suppression * 0.8;
    spread *= RT.difficulty().spread;                       // difficulty: enemy accuracy
    const dir = _v2.set(p.x - mp.x, py - mp.y, p.z - mp.z).normalize();
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread * 0.8;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();
    const maxD = dist + 12;
    const wall = RT.map.raycast(mp.x, mp.y, mp.z, dir.x, dir.y, dir.z, maxD);
    // does the ray pass near the player?
    const relX = p.x - mp.x, relY = py + 0.1 - mp.y, relZ = p.z - mp.z;
    const tAlong = relX * dir.x + relY * dir.y + relZ * dir.z;
    let hitPlayer = false;
    if (tAlong > 0 && (!wall || wall.dist > tAlong)) {
      const cx = mp.x + dir.x * tAlong - p.x;
      const cy = mp.y + dir.y * tAlong - (p.y + 0.9);
      const cz = mp.z + dir.z * tAlong - p.z;
      const miss = Math.hypot(cx, cy * 0.55, cz);
      if (miss < 0.42) hitPlayer = true;
      else if (miss < 1.6 && RT.audio) RT.audio.crack();
    }
    RT.engine.tracer(mp, dir, Math.min(wall ? wall.dist : maxD, tAlong > 0 ? Math.max(8, tAlong + 6) : maxD), 260);
    if (hitPlayer) {
      RT.player.damage((7 + Math.random() * 7) * RT.difficulty().dmg, new THREE.Vector3(e.x, e.y + 1.5, e.z));
    } else if (wall) {
      const wp = new THREE.Vector3(wall.point.x, wall.point.y, wall.point.z);
      const wn = new THREE.Vector3(wall.normal.x, wall.normal.y, wall.normal.z);
      RT.engine.decal(wp, wn, 0.14, wall.normal.terrain ? 0x4a4034 : 0x26221c, 8);
      for (let i = 0; i < 3; i++)
        RT.engine.particle(wp.x, wp.y, wp.z, wn.x * 2 + (Math.random() - .5) * 2, 1 + Math.random() * 2, wn.z * 2 + (Math.random() - .5) * 2,
          { color: wall.normal.terrain ? 0x8a7a5e : 0x9a938a, size: 0.05, life: 0.4, grav: -7, drag: 1 });
    }
  }

  /* ---------- movement helper ---------- */
  function moveToward(e, tx, tz, speed, dt) {
    const dx = tx - e.x, dz = tz - e.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) return true;
    let mx = dx / d, mz = dz / d;
    // obstacle avoidance: probe ahead, deflect along wall
    const probe = RT.map.raycast(e.x, e.y + 1, e.z, mx, 0, mz, 1.4);
    if (probe) {
      const n = probe.normal;
      const tang = [-n.z, n.x];
      const side = (mx * tang[0] + mz * tang[1]) >= 0 ? 1 : -1;
      mx = tang[0] * side; mz = tang[1] * side;
    }
    const nx = e.x + mx * speed * dt, nz = e.z + mz * speed * dt;
    const ng = RT.map.groundAt(nx, nz, e.y + 0.6);
    if (Math.abs(ng - e.y) < 0.9) { e.x = nx; e.z = nz; e.y = damp(e.y, ng, 16, dt); }
    e.targetYaw = Math.atan2(mx, mz);
    return false;
  }

  function faceTarget(e, tx, tz, dt, rate) {
    const want = Math.atan2(tx - e.x, tz - e.z);
    e.yaw = angleLerp(e.yaw, want, Math.min(1, (rate || 8) * dt));
  }

  /* ---------- per-enemy update ---------- */
  function updateEnemy(e, dt) {
    const rig = e.rig, p = RT.player.pos;
    if (e.dead) { RT.character.pose(rig, dt); return; }
    e.suppression = Math.max(0, e.suppression - dt * 0.5);

    /* throttled LOS */
    e.losT -= dt;
    if (e.losT <= 0) { e.losT = 0.22 + Math.random() * 0.15; e.hasLOS = !RT.player.dead && losToPlayer(e); }

    const distP = Math.hypot(p.x - e.x, p.z - e.z);

    switch (e.state) {
      case 'guard':
      case 'patrol': {
        if (e.hasLOS) {
          e.state = 'combat';
          e.lastKnown = { x: p.x, z: p.z };
          bark(e, BARKS_SPOT);
          A.alertGroup(e.group, p);
          if (RT.game) RT.game.onCombatStart();
          break;
        }
        if (e.state === 'patrol') {
          e.patrolWait -= dt;
          if (!e.moveTarget && e.patrolWait <= 0) {
            e.patrolAngle += 1.1 + Math.random();
            e.moveTarget = {
              x: e.home.x + Math.cos(e.patrolAngle) * e.patrolRadius,
              z: e.home.z + Math.sin(e.patrolAngle) * e.patrolRadius,
            };
          }
          if (e.moveTarget) {
            rig.anim.mode = 'walk';
            if (moveToward(e, e.moveTarget.x, e.moveTarget.z, 1.6, dt)) {
              e.moveTarget = null; e.patrolWait = 1.5 + Math.random() * 2.5;
            }
            e.yaw = angleLerp(e.yaw, e.targetYaw || e.yaw, 6 * dt);
          } else rig.anim.mode = 'idle';
        } else {
          rig.anim.mode = 'guard';
          // occasional look-around
          e.yaw += Math.sin(RT.engine.time * 0.3 + e.home.x) * dt * 0.12;
        }
        break;
      }
      case 'alert': {
        e.alertT += dt;
        if (e.hasLOS) { e.state = 'combat'; bark(e, BARKS_SPOT); break; }
        if (e.lastKnown) {
          rig.anim.mode = 'run';
          const arrived = moveToward(e, e.lastKnown.x, e.lastKnown.z, 3.4, dt);
          e.yaw = angleLerp(e.yaw, e.targetYaw || e.yaw, 8 * dt);
          if (arrived || e.alertT > 8) { e.lastKnown = null; }
        } else {
          rig.anim.mode = 'aim';
          rig.anim.aimPitch = 0;
          e.yaw += dt * 0.9; // scan
          if (e.alertT > 13) { e.state = e.patrolRadius ? 'patrol' : 'guard'; e.alertT = 0; }
        }
        break;
      }
      case 'combat': {
        if (e.hasLOS) e.lastKnown = { x: p.x, z: p.z };
        /* suppressed → duck */
        if (e.suppression > 1.6 && e.cover && e.atCover) {
          e.state = 'suppressed'; e.suppressT = 1 + Math.random() * 1.4; break;
        }
        /* fallback when hurt */
        if (e.hp < 32 && !e.fellBack && Math.random() < dt * 0.5) {
          e.fellBack = true; e.cover && (e.cover.claimed = null); e.cover = null; e.atCover = false;
          const away = Math.atan2(e.x - p.x, e.z - p.z);
          e.moveTarget = { x: e.x + Math.sin(away) * 12, z: e.z + Math.cos(away) * 12 };
        }
        if (e.moveTarget) {
          rig.anim.mode = 'run';
          if (moveToward(e, e.moveTarget.x, e.moveTarget.z, 4.2, dt)) e.moveTarget = null;
          e.yaw = angleLerp(e.yaw, e.targetYaw || e.yaw, 8 * dt);
          break;
        }
        if (!e.cover && !e.upstairs) pickCover(e);
        if (e.cover && !e.atCover) {
          rig.anim.mode = 'run';
          const arrived = moveToward(e, e.cover.x, e.cover.z, 4.4, dt);
          e.yaw = angleLerp(e.yaw, e.targetYaw || e.yaw, 8 * dt);
          if (arrived) { e.atCover = true; e.peekT = 0.4 + Math.random() * 0.7; e.peeking = false; }
          break;
        }
        /* at cover (or standing fight) */
        faceTarget(e, p.x, p.z, dt);
        if (e.cover && e.cover.low) {
          e.peekT -= dt;
          if (e.peekT <= 0) {
            e.peeking = !e.peeking;
            e.peekT = e.peeking ? 1.3 + Math.random() * 0.9 : 0.7 + Math.random() * 1.1 + e.suppression;
          }
          rig.anim.mode = 'aim';
          rig.anim.crouch = damp(rig.anim.crouch, e.peeking ? 0.25 : 1, 8, dt);
          if (e.peeking && e.hasLOS) enemyFire(e, dt);
        } else {
          rig.anim.mode = 'aim';
          rig.anim.crouch = damp(rig.anim.crouch, 0, 8, dt);
          if (e.hasLOS) enemyFire(e, dt);
          else if (e.lastKnown && Math.random() < dt * 0.35) {
            e.moveTarget = { x: e.lastKnown.x + (Math.random() - 0.5) * 6, z: e.lastKnown.z + (Math.random() - 0.5) * 6 };
          }
        }
        const dy = (RT.player.eyeY() - (e.y + 1.5));
        rig.anim.aimPitch = clamp(Math.atan2(dy, distP), -0.6, 0.6);
        /* squad flank + grenades */
        maybeFlank(e, dt);
        maybeGrenade(e, dt, distP);
        break;
      }
      case 'suppressed': {
        rig.anim.mode = 'aim';
        rig.anim.crouch = damp(rig.anim.crouch, 1, 10, dt);
        e.suppressT -= dt;
        if (e.suppressT <= 0) { e.state = 'combat'; e.suppression *= 0.4; }
        break;
      }
    }
    rig.group.position.set(e.x, e.y, e.z);
    rig.group.rotation.y = e.yaw;
    if (e.cone) e.cone.visible = (e.state === 'patrol' || e.state === 'guard');
    RT.character.pose(rig, dt);
  }

  function maybeFlank(e, dt) {
    if (e.flanker || Math.random() > dt * 0.05) return;
    const combatCount = enemies.filter(x => !x.dead && x.state === 'combat' && x.group === e.group).length;
    if (combatCount < 3) return;
    const already = enemies.some(x => x.flanker && !x.dead && x.group === e.group);
    if (already) return;
    e.flanker = true;
    const p = RT.player.pos;
    const side = Math.random() > 0.5 ? 1 : -1;
    const ang = Math.atan2(e.x - p.x, e.z - p.z) + side * 1.5;
    e.cover && (e.cover.claimed = null); e.cover = null; e.atCover = false;
    e.moveTarget = { x: p.x + Math.sin(ang) * 14, z: p.z + Math.cos(ang) * 14 };
    bark(e, BARKS_FLANK);
  }
  function maybeGrenade(e, dt, distP) {
    enemyGrenadeCd -= dt;
    if (enemyGrenadeCd > 0 || distP < 9 || distP > 24 || !e.lastKnown) return;
    if (Math.random() > dt * 0.08) return;
    enemyGrenadeCd = 16 + Math.random() * 10;
    bark(e, BARKS_GREN);
    const p = { ...e.lastKnown };
    const from = new THREE.Vector3(e.x, e.y + 1.6, e.z);
    const geos = [RT.G.sph(0.055, 8, 6, 0x3a4433, {})];
    const m = RT.meshOf(geos, RT.MAT.gun);
    m.position.copy(from);
    RT.engine.scene.add(m);
    const t0 = 1.25;
    const v = new THREE.Vector3((p.x - e.x) / t0, 4.8, (p.z - e.z) / t0);
    let fuse = 2.6;
    (RT.transients = RT.transients || []).push((dt2) => {
      fuse -= dt2;
      v.y -= 9.8 * dt2;
      m.position.x += v.x * dt2; m.position.y += v.y * dt2; m.position.z += v.z * dt2;
      const g = RT.map.groundAt(m.position.x, m.position.z, m.position.y + 0.5);
      if (m.position.y < g + 0.04) { m.position.y = g + 0.04; v.y = Math.abs(v.y) * 0.3; v.x *= 0.5; v.z *= 0.5; }
      if (fuse <= 0) {
        RT.engine.scene.remove(m);
        RT.player.explode(m.position, 5.6, 95);
        return false;
      }
      return true;
    });
  }

  function bark(e, list) {
    if (barkCd > 0) return;
    barkCd = 3.5;
    const d = Math.hypot(e.x - RT.player.pos.x, e.z - RT.player.pos.z);
    if (d < 42 && RT.ui) RT.ui.say('ENEMY', list[(Math.random() * list.length) | 0], 1.8, true);
  }

  /* ---------- allies ---------- */
  function updateAlly(al, dt) {
    const rig = al.rig, p = RT.player.pos;
    if (RT.game && RT.game.cutscene) { rig.anim.mode = 'idle'; RT.character.pose(rig, dt); return; }
    const combat = enemies.some(e => !e.dead && (e.state === 'combat' || e.state === 'suppressed'));
    /* target selection (throttled) */
    al.losT -= dt;
    if (al.losT <= 0) {
      al.losT = 0.4 + Math.random() * 0.3;
      al.target = null;
      let bd = 70;
      for (const e of enemies) {
        if (e.dead || (e.state !== 'combat' && e.state !== 'alert' && e.state !== 'suppressed')) continue;
        const d = Math.hypot(e.x - al.x, e.z - al.z);
        if (d < bd) {
          const hit = RT.map.raycast(al.x, al.y + 1.55, al.z, (e.x - al.x) / d, (e.y + 1.3 - al.y - 1.55) / d, (e.z - al.z) / d, d - 0.5);
          if (!hit) { bd = d; al.target = e; }
        }
      }
    }
    /* movement: follow player at offset, snap to nearby cover in combat */
    const fx = Math.sin(RT.player.yaw), fz = Math.cos(RT.player.yaw);
    const ox = al.offset[0], oz = al.offset[1];
    const want = {
      x: p.x + (fz * ox + fx * oz),
      z: p.z + (-fx * ox + fz * oz),
    };
    const dWant = Math.hypot(want.x - al.x, want.z - al.z);
    if (dWant > (combat ? 7 : 2.6)) {
      rig.anim.mode = dWant > 9 ? 'run' : 'walk';
      const dx2 = want.x - al.x, dz2 = want.z - al.z;
      let mx = dx2 / dWant, mz = dz2 / dWant;
      const probe = RT.map.raycast(al.x, al.y + 1, al.z, mx, 0, mz, 1.3);
      if (probe) { const n = probe.normal; const side = ((mx * -n.z) + (mz * n.x)) >= 0 ? 1 : -1; mx = -n.z * side; mz = n.x * side; }
      const sp = dWant > 9 ? 5.6 : 2.4;
      const nx2 = al.x + mx * sp * dt, nz2 = al.z + mz * sp * dt;
      const ng = RT.map.groundAt(nx2, nz2, al.y + 0.6);
      if (Math.abs(ng - al.y) < 0.95) { al.x = nx2; al.z = nz2; al.y = damp(al.y, ng, 16, dt); }
      al.yaw = al.yaw == null ? 0 : angleLerp(al.yaw, Math.atan2(mx, mz), 8 * dt);
    } else if (al.target) {
      rig.anim.mode = 'aim';
      rig.anim.crouch = damp(rig.anim.crouch || 0, combat && RT.player.crouched ? 0.8 : 0, 6, dt);
      al.yaw = angleLerp(al.yaw || 0, Math.atan2(al.target.x - al.x, al.target.z - al.z), 9 * dt);
      const dy = (al.target.y + 1.4) - (al.y + 1.5);
      rig.anim.aimPitch = clamp(Math.atan2(dy, Math.hypot(al.target.x - al.x, al.target.z - al.z)), -0.5, 0.5);
      /* capped ally damage so the player does the real work */
      al.fireCd -= dt;
      if (al.fireCd <= 0) {
        al.fireCd = 0.5 + Math.random() * 0.8;
        al.muzzle.visible = true;
        setTimeout(() => { al.muzzle.visible = false; }, 40);
        const mp = _v1.set(0, 0, 0);
        al.muzzle.getWorldPosition(mp);
        if (RT.audio) RT.audio.allyShot();
        const e = al.target;
        const dir = _v2.set(e.x - mp.x, (e.y + 1.3) - mp.y, e.z - mp.z).normalize();
        RT.engine.tracer(mp, dir, Math.hypot(e.x - mp.x, e.z - mp.z), 280);
        if (Math.random() < 0.3) A.damageEnemy(e, 13, false, al);
      }
    } else {
      rig.anim.mode = combat ? 'aim' : 'idle';
      al.yaw = angleLerp(al.yaw || 0, RT.player.yaw + Math.PI + (al.offset[0] * 0.14), 4 * dt);
      rig.anim.aimPitch = 0;
    }
    rig.group.position.set(al.x, al.y, al.z);
    rig.group.rotation.y = al.yaw || 0;
    RT.character.pose(rig, dt);
  }

  /* ---------- damage & death ---------- */
  A.damageEnemy = function (e, dmg, headshot, source) {
    if (e.dead) return false;
    e.hp -= dmg * (headshot ? 2.4 : 1);
    e.rig.anim.flinch = 1;
    /* immediate 1-frame jolt; the pose damp blends the recovery */
    e.rig.j.chest.rotation.x -= headshot ? 0.2 : 0.13;
    e.rig.j.head.rotation.z += (Math.random() - 0.5) * 0.24;
    if (e.state === 'guard' || e.state === 'patrol') {
      e.state = 'alert';
      e.lastKnown = { x: RT.player.pos.x, z: RT.player.pos.z };
      A.alertGroup(e.group, RT.player.pos);
    }
    if (e.hp <= 0) {
      e.dead = true;
      e.rig.anim.deathT = 0;
      e.rig.anim.deathDir = Math.random() > 0.35 ? 1 : -1;
      if (e.cover) e.cover.claimed = null;
      if (RT.game) RT.game.onEnemyKilled(e, headshot);
      // nearby squad reacts
      for (const o of enemies) {
        if (o.dead || o === e || o.group !== e.group) continue;
        if (Math.hypot(o.x - e.x, o.z - e.z) < 25) {
          if (o.state === 'guard' || o.state === 'patrol') { o.state = 'alert'; o.lastKnown = { x: RT.player.pos.x, z: RT.player.pos.z }; }
          else if (o.state === 'combat' && o.atCover) o.suppression += 0.7;
        }
      }
      bark(e, BARKS_DEAD);
      return true;
    }
    return false;
  };

  A.explosionAt = function (p, radius, dmg) {
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, (e.y + 1) - p.y, e.z - p.z);
      if (d < radius) A.damageEnemy(e, dmg * (1 - d / (radius * 1.15)), false);
      else if (d < radius * 2.2) e.suppression += 1.2;
    }
  };

  A.suppressNear = function (p, r, amt) {
    for (const e of enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.z - p.z) < r) e.suppression += amt;
    }
  };

  A.aliveInGroup = g => enemies.filter(e => !e.dead && (g ? e.group === g : true)).length;
  A.inCombat = () => enemies.some(e => !e.dead && (e.state === 'combat' || e.state === 'suppressed' || e.state === 'alert'));

  /* ---------- destructibles: explosive barrels + breakable glass ---------- */
  function raySegAABB(o, d, mn, mx, maxT) {
    let tmin = 0, tmax = maxT;
    const O = [o.x, o.y, o.z], D = [d.x, d.y, d.z], A2 = [mn.x, mn.y, mn.z], B2 = [mx.x, mx.y, mx.z];
    for (let a = 0; a < 3; a++) {
      if (Math.abs(D[a]) < 1e-8) { if (O[a] < A2[a] || O[a] > B2[a]) return -1; }
      else { let t1 = (A2[a] - O[a]) / D[a], t2 = (B2[a] - O[a]) / D[a]; if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return -1; }
    }
    return tmin > 0.01 ? tmin : -1;
  }
  function shatterGlass(d, px, py, pz) {
    if (d.broken) return;
    d.broken = true; d.mesh.visible = false;
    if (RT.progress) RT.progress.tally('windows', 1);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      RT.engine.particle(px + (Math.random() - .5) * 0.3, py + (Math.random() - .5) * 0.5, pz + (Math.random() - .5) * 0.3,
        Math.cos(a) * (1 + Math.random() * 2), Math.random() * 2 - 1, Math.sin(a) * (1 + Math.random() * 2),
        { color: 0xc4e2e8, size: 0.05, life: 0.8 + Math.random() * 0.5, grav: -11, drag: 0.8 });
    }
    if (RT.audio) RT.audio.glassBreak();
  }
  function explodeBarrel(d) {
    if (d.exploded) return;
    d.exploded = true; d.mesh.visible = false;
    if (d.col) d.col.disabled = true;
    const p = new THREE.Vector3(d.x, d.y + 0.3, d.z);
    RT.player.explode(p, 6.4, 96);          // FX + player + AI + bots + destructible chain (see PL.explode)
  }
  function blastDestructibles(p, r, dmg, skip) {
    if (!RT.map) return;
    for (const d of RT.map.destructibles) {
      if (d === skip) continue;
      const dd = Math.hypot(d.x - p.x, d.y - p.y, d.z - p.z);
      if (dd > r) continue;
      if (d.kind === 'barrel' && !d.exploded) { d.hp -= dmg * (1 - dd / r); if (d.hp <= 0) setTimeout(() => explodeBarrel(d), 70 + Math.random() * 140); }
      else if (d.kind === 'glass' && !d.broken) shatterGlass(d, d.x, d.y, d.z);
    }
  }
  function hitTarget(d, point) {
    d.hits = (d.hits || 0) + 1;
    if (RT.audio) RT.audio.metalPing();
    for (let i = 0; i < 6; i++)
      RT.engine.particle(point.x, point.y, point.z, (Math.random() - .5) * 3.5, Math.random() * 3 + 1, (Math.random() - .5) * 3.5,
        { color: 0xffe6b0, size: 0.05, life: 0.32, grav: -5, drag: 1 });
    if (RT.range && RT.range.onHit) RT.range.onHit(d);
    if (!d.animating) {
      d.animating = true; let t = 0;
      (RT.transients = RT.transients || []).push((dt) => {
        t += dt;
        const down = t < 0.12 ? t / 0.12 : (t < 1.1 ? 1 : Math.max(0, 1 - (t - 1.1) / 0.25));
        d.pivot.rotation.x = down * 1.5;
        if (t > 1.4) { d.pivot.rotation.x = 0; d.animating = false; return false; }
        return true;
      });
    }
  }
  function damageBarrel(d, dmg, point) {
    if (d.exploded) return;
    d.hp -= dmg;
    if (RT.audio) RT.audio.metalPing();
    for (let i = 0; i < 5; i++)
      RT.engine.particle(point.x, point.y, point.z, (Math.random() - .5) * 3, Math.random() * 3, (Math.random() - .5) * 3,
        { color: 0xffd98a, size: 0.04, life: 0.25, grav: -3, drag: 0.5 });
    if (d.hp <= 0) { explodeBarrel(d); if (RT.progress) RT.progress.tally('barrels', 1); }
  }
  RT.blastDestructibles = blastDestructibles;

  /* ---------- player hitscan resolution ---------- */
  RT.combat = {
    explodeBarrel, blastDestructibles, shatterGlass,
    playerShot(org, dir, cfg, muzzleWorld) {
      if (RT.game) RT.game.stats.shots++;
      const maxD = cfg.range || 160;
      const wall = RT.map.raycast(org.x, org.y, org.z, dir.x, dir.y, dir.z, maxD);
      const wallD = wall ? wall.dist : maxD;
      /* bullet penetration through thin cover (never steel barrels / terrain) */
      let penetrated = false;
      if (wall && !wall.normal.terrain && wall.col && wall.col.pen !== false && !wall.col.barrel) {
        const thick = (wall.exit || wall.dist) - wall.dist;
        if (thick > 0.001 && thick < 0.4) penetrated = true;
      }
      const reach = penetrated ? maxD : wallD;
      /* friendly-fire guard: warn instead of damaging */
      for (const al of allies) {
        const rx = al.x - org.x, ry3 = (al.y + 1.15) - org.y, rz = al.z - org.z;
        const t = rx * dir.x + ry3 * dir.y + rz * dir.z;
        if (t < 0 || t > wallD) continue;
        const cx = org.x + dir.x * t - al.x, cy = org.y + dir.y * t - (al.y + 1.0), cz = org.z + dir.z * t - al.z;
        if (Math.hypot(cx, cy * 0.55, cz) < 0.42) {
          if (RT.ui) RT.ui.friendlyWarn();
          return;
        }
      }
      /* vs enemies (campaign) or bots (BR): sphere tests at head/chest/pelvis/knees */
      const targets = (RT.br && RT.br.active) ? RT.br.hittables() : enemies;
      let hitE = null, hitD = reach, hitHead = false;
      for (const e of targets) {
        if (e.dead) continue;
        const zones = [
          [e.x, e.y + 1.56, e.z, 0.14, true],
          [e.x, e.y + 1.18, e.z, 0.26, false],
          [e.x, e.y + 0.85, e.z, 0.24, false],
          [e.x, e.y + 0.4, e.z, 0.22, false],
        ];
        for (const [zx, zy, zz, zr, isHead] of zones) {
          const rx = zx - org.x, ry2 = zy - org.y, rz = zz - org.z;
          const t = rx * dir.x + ry2 * dir.y + rz * dir.z;
          if (t < 0 || t > hitD) continue;
          const cx = org.x + dir.x * t - zx, cy = org.y + dir.y * t - zy, cz = org.z + dir.z * t - zz;
          if (cx * cx + cy * cy + cz * cz < zr * zr) {
            if (t < hitD) { hitD = t; hitE = e; hitHead = isHead; }
            break;
          }
        }
      }
      const wallbang = hitE && penetrated && hitD > wallD;
      /* breakable glass: shatter any pane crossed up to the terminal point (glass never blocks the round) */
      const term = hitE ? hitD : (wall ? wallD : maxD);
      for (const d of RT.map.destructibles) {
        if (d.kind !== 'glass' || d.broken) continue;
        const gt = raySegAABB(org, dir, d.min, d.max, term + 0.4);
        if (gt >= 0) shatterGlass(d, org.x + dir.x * gt, org.y + dir.y * gt, org.z + dir.z * gt);
      }
      /* tracer from muzzle */
      if (cfg.tracer && Math.random() < 1 / cfg.tracer) {
        RT.engine.tracer(muzzleWorld, dir, hitD, 360);
      }
      RT.ai.suppressNear(new THREE.Vector3(org.x + dir.x * hitD, 0, org.z + dir.z * hitD), 5, 0.35);
      if (hitE) {
        if (RT.game) RT.game.stats.hits++;
        const dmgMod = RT.weapons ? RT.weapons.modFor(RT.weapons.state().curId).dmg : 1;
        let dmg = cfg.dmg * dmgMod * (hitHead ? cfg.headMul : 1);
        if (wallbang) dmg *= 0.5;                                 // penetration damage falloff
        dmg *= RT.difficulty().out;                              // difficulty: your outgoing damage
        const killed = (RT.br && RT.br.active)
          ? RT.br.damageBot(hitE, dmg, hitHead, 'player')
          : A.damageEnemy(hitE, dmg, hitHead);
        if (RT.hud) RT.hud.hitmarker(killed);
        // impact puff on body (no gore)
        const hp = new THREE.Vector3(org.x + dir.x * hitD, org.y + dir.y * hitD, org.z + dir.z * hitD);
        for (let i = 0; i < 4; i++)
          RT.engine.particle(hp.x, hp.y, hp.z, (Math.random() - .5) * 1.6, Math.random() * 1.4, (Math.random() - .5) * 1.6,
            { color: 0x5a5148, size: 0.07, life: 0.4, grav: -4, drag: 2 });
        if (wallbang && wall) {                                   // entry spray on the penetrated surface
          const wp = wall.point, wn = wall.normal;
          RT.engine.decal(new THREE.Vector3(wp.x, wp.y, wp.z), new THREE.Vector3(wn.x, wn.y, wn.z), 0.12, 0x26221c, 10);
          for (let i = 0; i < 5; i++)
            RT.engine.particle(wp.x, wp.y, wp.z, (Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3, { color: 0xa39a8e, size: 0.05, life: 0.3, grav: -5, drag: 1 });
        }
        if (RT.audio) RT.audio.hitFeedback(killed);
      } else if (wall && wall.col && wall.col.barrel) {
        damageBarrel(wall.col.barrel, cfg.dmg * (RT.weapons ? RT.weapons.modFor(RT.weapons.state().curId).dmg : 1), wall.point);
      } else if (wall && wall.col && wall.col.target) {
        hitTarget(wall.col.target, wall.point);
      } else if (wall) {
        const wp = new THREE.Vector3(wall.point.x, wall.point.y, wall.point.z);
        const wn = new THREE.Vector3(wall.normal.x, wall.normal.y, wall.normal.z);
        const isDirt = !!wall.normal.terrain;
        RT.engine.decal(wp, wn, cfg.pellets ? 0.1 : 0.15, isDirt ? 0x4a4034 : 0x26221c, 10);
        for (let i = 0; i < (isDirt ? 6 : 4); i++)
          RT.engine.particle(wp.x, wp.y, wp.z,
            wn.x * (1.5 + Math.random() * 2) + (Math.random() - .5) * 2, 1 + Math.random() * 2.5, wn.z * (1.5 + Math.random() * 2) + (Math.random() - .5) * 2,
            { color: isDirt ? 0x8a7a5e : 0xa39a8e, size: isDirt ? 0.09 : 0.05, life: 0.5, grav: -7, drag: 1.4 });
        if (!isDirt) for (let i = 0; i < 2; i++)
          RT.engine.particle(wp.x, wp.y, wp.z, wn.x * 3 + (Math.random() - .5) * 4, Math.random() * 3, wn.z * 3 + (Math.random() - .5) * 4,
            { color: 0xffd9a0, size: 0.035, life: 0.22, grav: -3, drag: 0.4 });
      }
    },
  };

  /* ---------- frame update ---------- */
  A.update = function (dt) {
    barkCd -= dt;
    /* cap corpse count */
    let corpses = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead && e.rig.anim.mode === 'dead') {
        corpses++;
        if (corpses > 14) {
          if (e.rig.group.parent) e.rig.group.parent.remove(e.rig.group);
          enemies.splice(i, 1);
        }
      }
    }
    const px = RT.player.pos.x, pz = RT.player.pos.z;
    for (const e of enemies) {
      if (A._testFreeze && !e.dead) { RT.character.pose(e.rig, dt); continue; }
      // skip far-away idle enemies (perf)
      if (!e.dead && (e.state === 'guard' || e.state === 'patrol')) {
        const d = Math.hypot(e.x - px, e.z - pz);
        if (d > 130) continue;
      }
      updateEnemy(e, dt);
    }
    for (const al of allies) updateAlly(al, dt);
  };

  return A;
})();
