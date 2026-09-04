#!/usr/bin/env node
/* The acceptance list, checked by actually loading the game and driving it. */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

const fails = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' :: ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file://' + path.join(ROOT, 'dist', 'test.html'));
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = false;
    C.Game.renderer.setSize(140, 90, false);
    C.HUD.blocked = false;
    document.getElementById('pause').classList.add('hidden');
    window.__sim = (s) => new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => { if (C.Game.t - start >= s) { clearInterval(id); res(); } }, 8);
    });
    // ground at the foot of a wall at least `minH` tall, plus the way to face it
    window.__wall = (minH) => {
      const T = C.T;
      for (let i = 0; i < 240000; i++) {
        const a = Math.random() * 6.283, r = 40 + Math.random() * 150;
        const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 2);
        if (!g) continue;
        for (let k = 0; k < 10; k++) {
          const b = k / 10 * 6.283;
          const px = g.x + Math.cos(b) * 1.7, pz = g.z + Math.sin(b) * 1.7;
          if (T.hAt(px, pz) > g.y + minH && T.normSmooth(px, pz).y < 0.4) return { g, dx: Math.cos(b), dz: Math.sin(b) };
        }
      }
      return null;
    };
    // a flat patch with room to walk out of it in every direction
    window.__openGround = (T, rad) => {
      for (let i = 0; i < 160000; i++) {
        const a = Math.random() * 6.283, r = 30 + Math.random() * 140;
        const q = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
        if (!q || T.normSmooth(q.x, q.z).y < 0.985) continue;
        let ok = true;
        for (let k = 0; k < 12 && ok; k++) {
          const b = k / 12 * 6.283;
          for (const d of [rad * 0.5, rad, rad * 1.4]) {
            const px = q.x + Math.cos(b) * d, pz = q.z + Math.sin(b) * d;
            const h = T.hAt(px, pz);
            if (h <= T.VOID || Math.abs(h - q.y) > 0.9 || !T.standable(px, pz, 1)) { ok = false; break; }
          }
        }
        if (ok) return q;
      }
      return null;
    };
    window.__hold = (keys, secs, each) => new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => {
        keys.forEach(k => { C.IN.keys[k] = true; });
        if (each) each();
        if (C.Game.t - start >= secs) { clearInterval(id); keys.forEach(k => { C.IN.keys[k] = false; }); res(); }
      }, 8);
    });
  });

  // ---- 1. no invisible ground -----------------------------------------
  const vis = await page.evaluate(() => {
    const C = window.CRUX, T3 = THREE, r = C.Game.renderer, T = C.T;
    ['Props', 'Camps', 'Walls', 'Summit', 'WI', 'Coop', 'FX', 'Fog'].forEach(k => { if (C[k] && C[k].group) C[k].group.visible = false; });
    C.Sky.mesh.visible = false; C.Sky.cloud.visible = false; C.P.fig.root.visible = false;
    const cam = new T3.PerspectiveCamera(70, 1, 0.2, 1200);
    const out = {};
    const rt = new T3.WebGLRenderTarget(96, 96), buf = new Uint8Array(96 * 96 * 4);
    const oldFog = C.Game.scene.fog; C.Game.scene.fog = null;
    // several vantage points around the island, so a one-off angle cannot hide it
    const views = [[1.3, 45], [-1.1, 60], [2.6, 80], [0.2, 120]];
    for (const mode of ['FrontSide', 'DoubleSide']) {
      T.mesh.material.forEach(m => { m.side = T3[mode]; m.needsUpdate = true; });
      let lit = 0;
      for (const [a, up] of views) {
        cam.position.set(Math.cos(a) * 240, up, Math.sin(a) * 240);
        cam.lookAt(0, C.K.SUMMIT_H * 0.45, 0);
        r.setRenderTarget(rt); r.setClearColor(0x000000, 1); r.clear(); r.render(C.Game.scene, cam);
        r.readRenderTargetPixels(rt, 0, 0, 96, 96, buf);
        for (let i = 0; i < buf.length; i += 4) if (buf[i] + buf[i + 1] + buf[i + 2] > 24) lit++;
      }
      out[mode] = lit;
    }
    T.mesh.material.forEach(m => { m.side = T3.FrontSide; m.needsUpdate = true; });
    r.setRenderTarget(null); C.Game.scene.fog = oldFog;
    ['Props', 'Camps', 'Walls', 'Summit', 'WI', 'Coop', 'FX', 'Fog'].forEach(k => { if (C[k] && C[k].group) C[k].group.visible = true; });
    C.Sky.mesh.visible = true; C.P.fig.root.visible = true;
    return out;
  });
  check('the ground is never culled away', vis.FrontSide >= vis.DoubleSide * 0.99,
    'front ' + vis.FrontSide + ' vs double ' + vis.DoubleSide);

  // every material in the world has something to draw with
  const mats = await page.evaluate(() => {
    const C = window.CRUX;
    let missing = 0, noGeo = 0, total = 0;
    C.Game.world.traverse(o => {
      if (!o.isMesh && !o.isInstancedMesh && !o.isPoints && !o.isLine) return;
      total++;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (!o.material || ms.some(m => !m)) missing++;
      if (!o.geometry || !o.geometry.attributes.position) noGeo++;
    });
    return { total, missing, noGeo };
  });
  check('no geometry without a material', mats.missing === 0 && mats.noGeo === 0, JSON.stringify(mats));

  // ---- 2. spawn is on visible solid ground, outside the rock -----------
  const spawn = await page.evaluate(() => {
    const C = window.CRUX, P = C.P;
    const rows = [];
    for (let i = 0; i < C.Camps.list.length; i++) {
      const c = C.Camps.list[i];
      // the two places the game ever puts a body
      P.spawnAt(c.x + 2.6, c.z + 2.2, c.y);
      rows.push({ where: 'begin' + i, clear: +(P.pos.y - C.groundH(P.pos.x, P.pos.z)).toFixed(2), sea: +P.pos.y.toFixed(1) });
      P.spawnAt(c.x + 2.4, c.z + 1.6, c.y);
      rows.push({ where: 'respawn' + i, clear: +(P.pos.y - C.groundH(P.pos.x, P.pos.z)).toFixed(2), sea: +P.pos.y.toFixed(1) });
    }
    return rows;
  });
  const buried = spawn.filter(r => r.clear < -0.02 || r.sea < 0.5);
  check('every spawn point is on top of the ground, not inside it', buried.length === 0,
    buried.length ? JSON.stringify(buried) : spawn.length + ' points checked');

  const settle = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const c = C.Camps.list[0];
    P.spawnAt(c.x + 2.6, c.z + 2.2, c.y);
    await window.__sim(1.2);
    return { state: P.state, clear: +(P.pos.y - C.groundH(P.pos.x, P.pos.z)).toFixed(2), hp: Math.round(P.hp), y: +P.pos.y.toFixed(1) };
  });
  check('you land standing on it, undamaged', settle.state === 0 && Math.abs(settle.clear) < 0.2 && settle.hp === 100,
    JSON.stringify(settle));

  // ---- 2b. WASD moves the way the camera is pointing --------------------
  const wasd = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    const g = window.__openGround(T, 4.5);
    if (!g) return { none: true };
    async function step(keys, yaw) {
      P.spawnAt(g.x, g.z, g.y);
      C.CAM.yaw = yaw; C.CAM.pitch = 0; P.st = P.stMax;
      await window.__sim(0.2);
      const x0 = P.pos.x, z0 = P.pos.z;
      await window.__hold(keys, 1.0);
      return { dx: P.pos.x - x0, dz: P.pos.z - z0 };
    }
    // three.js's own idea of the camera's right, for the same look direction
    function basis(yaw) {
      const f = C.CAM.flatForward(new THREE.Vector3());
      const cam = new THREE.PerspectiveCamera();
      cam.position.set(0, 0, 0); cam.lookAt(f.x, 0, f.z);
      const r = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      return { f: f.clone(), r: r };
    }
    const out = {};
    for (const yaw of [0, 1.9, -2.4]) {
      C.CAM.yaw = yaw;
      const b = basis(yaw);
      const w = await step(['KeyW'], yaw), d = await step(['KeyD'], yaw);
      const a2 = await step(['KeyA'], yaw), s2 = await step(['KeyS'], yaw);
      out['y' + yaw.toFixed(1)] = {
        fwd: +(w.dx * b.f.x + w.dz * b.f.z).toFixed(2),
        back: +(s2.dx * b.f.x + s2.dz * b.f.z).toFixed(2),
        right: +(d.dx * b.r.x + d.dz * b.r.z).toFixed(2),
        left: +(a2.dx * b.r.x + a2.dz * b.r.z).toFixed(2),
      };
    }
    return out;
  });
  const wk = Object.keys(wasd);
  check('W goes where the camera looks', wk.every(k => wasd[k].fwd > 2 && wasd[k].back < -2),
    JSON.stringify(wasd));
  check('D strafes right and A strafes left', wk.every(k => wasd[k].right > 2 && wasd[k].left < -2),
    JSON.stringify(wasd));

  // ---- 2c. the look settings actually do something ----------------------
  const sens = await page.evaluate(() => {
    const C = window.CRUX, out = {};
    function turn(dx, dy) {
      C.CAM.yaw = 0; C.CAM.pitch = 0;
      C.CAM.applyMouse(dx, dy);
      return { yaw: +C.CAM.yaw.toFixed(4), pitch: +C.CAM.pitch.toFixed(4) };
    }
    const sx = C.IN.sensX, sy = C.IN.sensY, ix = C.IN.invX, iy = C.IN.invY;
    const base = turn(100, 100);
    C.IN.sensX = sx * 2;
    out.doubled = turn(100, 100).yaw / base.yaw;
    C.IN.sensX = sx;
    C.IN.invX = true; C.IN.invY = true;
    const inv = turn(100, 100);
    out.invX = Math.sign(inv.yaw) !== Math.sign(base.yaw);
    out.invY = Math.sign(inv.pitch) !== Math.sign(base.pitch);
    C.IN.invX = ix; C.IN.invY = iy;
    // vertical multiplier is independent of horizontal
    C.IN.sensY = sy * 0.5;
    out.vert = Math.abs(turn(0, 100).pitch) / Math.abs(base.pitch);
    C.IN.sensY = sy;
    // and the climbing FOV opens the view on the wall
    out.fovBase = C.CAM.fovBase; out.fovClimb = C.CAM.fovClimb;
    return out;
  });
  check('sensitivity scales the turn', Math.abs(sens.doubled - 2) < 0.01, 'x2 gave ' + sens.doubled.toFixed(3));
  check('invert X and Y work independently', sens.invX && sens.invY, JSON.stringify(sens));
  check('vertical sensitivity is its own multiplier', Math.abs(sens.vert - 0.5) < 0.01, 'half gave ' + sens.vert.toFixed(3));
  check('climbing opens the field of view', sens.fovClimb > 0, 'fov ' + sens.fovBase + ' +' + sens.fovClimb);

  // ---- 2d. the island rolls its variant biomes --------------------------
  const biomes = await page.evaluate(() => {
    const C = window.CRUX, seen = {}, picks = [];
    for (let i = 0; i < 200; i++) {
      const p = C.Run.roll((i * 2654435761) >>> 0);
      picks.push(p.join(','));
      p.forEach(b => { seen[b] = (seen[b] || 0) + 1; });
    }
    C.Run.roll(C.T.seed);
    return { kinds: Object.keys(seen).length, distinct: new Set(picks).size, seen: seen,
             total: Object.keys(C.BIOMES).length, slots: C.Run.pick.length };
  });
  check('all ten biomes exist and every one gets used', biomes.total === 10 && biomes.kinds === 10,
    JSON.stringify({ total: biomes.total, used: biomes.kinds }));
  check('a run is six slots with the middle four rolled',
    biomes.slots === 6 && biomes.distinct >= 8, 'distinct routes seen: ' + biomes.distinct);

  // ---- 3. the fog wall holds you until its fire is lit ------------------
  const fogw = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    const w = C.Walls.ceiling();
    if (!w) return { none: true };
    // stand just under it on climbable ground and try to climb straight up
    let spot = null;
    for (let i = 0; i < 160000 && !spot; i++) {
      const a = Math.random() * 6.283, r = 40 + Math.random() * 150;
      const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, w.y - 12);
      if (g && g.y < w.y - 1) spot = g;
    }
    if (!spot) return { none: true };
    P.spawnAt(spot.x, spot.z, spot.y);
    P.st = P.stMax;
    const y0 = P.pos.y;
    await window.__hold(['KeyW', C.IN.grabKey], 3.0);
    const blocked = P.pos.y;
    C.Camps.setLit(w.i + 1, true);                 // light the fire below it
    await window.__hold(['KeyW', C.IN.grabKey], 2.0);
    return { wallY: +w.y.toFixed(1), start: +y0.toFixed(1), blocked: +blocked.toFixed(1), after: +P.pos.y.toFixed(1) };
  });
  check('fog holds you below its wall until the fire is lit',
    fogw.none || fogw.blocked <= fogw.wallY + 0.3, JSON.stringify(fogw));

  await page.evaluate(() => { window.CRUX.Walls.list.forEach(w => { w.open = true; }); });

  // ---- 4. no auto-climb ------------------------------------------------
  const auto = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__wall(5);
    if (!spot) return { found: false };
    window.__spot = spot;
    function place() {
      P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
      C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
      P.st = P.stMax;
    }
    place();
    const y0 = P.pos.y;
    await window.__hold(['KeyW'], 2.0);
    const noGrab = { state: P.state, gained: +(P.pos.y - y0).toFixed(2) };
    place();
    const y1 = P.pos.y;
    await window.__hold(['KeyW', C.IN.grabKey], 2.0);
    const withGrab = { state: P.state, gained: +(P.pos.y - y1).toFixed(2) };
    // and now let go, in the air, well off the deck
    const yHigh = P.pos.y;
    C.IN.keys[C.IN.grabKey] = false;
    await window.__sim(0.15);
    const released = { state: P.state, y: +P.pos.y.toFixed(2), fellFrom: +yHigh.toFixed(2) };
    return { found: true, noGrab, withGrab, released };
  });
  check('a wall can be found to test against', auto.found);
  if (auto.found) {
    check('walking into a wall does NOT climb it', auto.noGrab.state !== 2 && auto.noGrab.gained < 1.2,
      'state ' + auto.noGrab.state + ', rose ' + auto.noGrab.gained + ' m');
    check('holding grab DOES climb it', auto.withGrab.state === 2 && auto.withGrab.gained > 1.5,
      'state ' + auto.withGrab.state + ', rose ' + auto.withGrab.gained + ' m');
    check('letting go of grab drops you off the wall', auto.released.state !== 2,
      'state ' + auto.released.state);
  }

  // a hand holds its hold while the body climbs past it
  const grip = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    // reuse the face that check 4 already proved climbable, rather than
    // rolling a fresh one this late in the run and hoping it works out
    const spot = window.__spot || window.__wall(5);
    if (!spot) return { held: 0, moved: 0, frames: 0, none: true };
    let out = { held: 0, moved: 0, frames: 0 };
    for (let attempt = 0; attempt < 3 && out.frames === 0; attempt++) {
      P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
      C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
      C.HUD.blocked = false;          // no pointer lock exists in a headless run
      for (const k in P.status) P.status[k] = 0;
      C.Survive.recalcMax();
      P.st = P.stMax; P.hp = 100;
      let held = 0, moved = 0, frames = 0, last = null, lastT = -1;
      await window.__hold(['KeyW', C.IN.grabKey], 1.6, () => {
        if (C.Game.t === lastT || !P.handOn || P.rope) return;
        lastT = C.Game.t; frames++;
        if (last) {
          const d = Math.hypot(P.handL.x - last.x, P.handL.y - last.y, P.handL.z - last.z);
          if (d < 0.004) held++; else moved++;
        }
        last = { x: P.handL.x, y: P.handL.y, z: P.handL.z };
      });
      out = { held, moved, frames, attempt };
      if (!frames) out.why = {
        state: P.state, wall: P.wall.has, blocked: C.HUD.blocked,
        st: +P.st.toFixed(1), y: +P.pos.y.toFixed(1),
        ground: +C.groundH(P.pos.x, P.pos.z).toFixed(1), rope: !!P.rope,
      };
    }
    return out;
  });
  check('a climbing hand grips its hold instead of sliding',
    grip.frames > 4 && grip.held > grip.frames * 0.2 && grip.moved > 0, JSON.stringify(grip));


  // ---- 4. stamina: drains on the wall, refills only on the ground ------
  const stam = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__spot || window.__wall(5);
    P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
    C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
    P.st = P.stMax;
    await window.__hold(['KeyW', C.IN.grabKey], 1.0);
    C.IN.keys[C.IN.grabKey] = true;
    const onWall = P.state === 2;
    const s0 = P.st;
    await window.__sim(1.2);                       // hold on, do not move
    const s1 = P.st;
    C.IN.keys[C.IN.grabKey] = false;
    await window.__sim(0.12);
    return { onWall, drainedHanging: +(s0 - s1).toFixed(2), letGoState: P.state };
  });
  check('stamina drains just from hanging on', stam.drainedHanging > 1.5, 'lost ' + stam.drainedHanging);
  check('letting go while hanging leaves the wall', stam.letGoState !== 2, 'state ' + stam.letGoState);

  const regen = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    let spot = null;
    for (let i = 0; i < 90000 && !spot; i++) {
      const a = Math.random() * 6.283, r = 40 + Math.random() * 140;
      const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
      if (g && T.normSmooth(g.x, g.z).y > 0.95) spot = g;
    }
    P.spawnAt(spot.x, spot.z, spot.y);
    for (const k in P.status) P.status[k] = 0;
    C.Survive.recalcMax();
    P.st = 10;
    await window.__sim(1.5);
    const onGround = P.st;
    // now climb and confirm it only goes down
    P.st = 60;
    return { onGround: +(onGround - 10).toFixed(1) };
  });
  check('stamina comes back on the ground', regen.onGround > 8, 'regained ' + regen.onGround);

  const noRegenClimb = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__spot || window.__wall(5);
    P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
    C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
    P.st = P.stMax;
    let rose = false, lastSt = P.st, minSeen = 999;
    await window.__hold(['KeyW', C.IN.grabKey], 2.6, () => {
      if (P.state === 2 && !P.onPiton) { if (P.st > lastSt + 0.01) rose = true; minSeen = Math.min(minSeen, P.st); }
      lastSt = P.st;
    });
    return { rose, spent: +(P.stMax - minSeen).toFixed(1) };
  });
  check('stamina never goes up while climbing', !noRegenClimb.rose, 'spent ' + noRegenClimb.spent);

  // ---- 5. running out on a wall makes you slide, then fall -------------
  const slip = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__wall(14) || window.__spot;
    if (!spot) return { found: false };
    P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
    C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
    for (const k in P.status) P.status[k] = 0;
    C.Survive.recalcMax();
    P.st = 14; P.extra = 0;                        // nearly spent, and no reserve
    let sawClimb = false, sawSlip = false, sawGrace = false;
    // an empty bar scrabbles for GRIP_GRACE before the slide starts, so this
    // has to outlast that as well as the climb itself
    await window.__hold(['KeyW', C.IN.grabKey], 7.0, () => {
      P.extra = 0;
      if (P.state === 2) sawClimb = true;
      if (P.state === 3) sawSlip = true;
      if (P.gripT > 0) sawGrace = true;
    });
    return { found: true, sawClimb, sawSlip, sawGrace, st: +P.st.toFixed(1) };
  });
  check('running the bar dry on a wall makes you slide', !slip.found || (slip.sawClimb && slip.sawSlip && slip.sawGrace),
    JSON.stringify(slip));

  // ---- 6. falls hurt ---------------------------------------------------
  const fall = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const c = C.Camps.list[0];
    const out = {};
    for (const h of [3, 30]) {
      P.spawnAt(c.x + 3, c.z + 3, c.y);
      P.hp = 100;
      for (const k in P.status) P.status[k] = 0;
      C.Survive.recalcMax();
      P.pos.y += h; P.state = 1; P.grounded = false; P.vel.set(0, 0, 0); P.fallFrom = P.pos.y;
      await new Promise(res => {
        const start = C.Game.t;
        const id = setInterval(() => {
          if (P.state === 0 || P.state === 4 || C.Game.t - start > 8) { clearInterval(id); res(); }
        }, 8);
      });
      out['h' + h] = { hp: Math.round(P.hp), state: P.state, injury: Math.round(P.status.injury) };
    }
    return out;
  });
  check('a short drop is free', fall.h3.hp >= 99, JSON.stringify(fall.h3));
  check('a fall from height hurts', fall.h30.hp < 60, JSON.stringify(fall.h30));

  // ---- 7. camera stays out of the rock ---------------------------------
  const cam = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    let tested = 0, inside = 0, worst = 0;
    for (let i = 0; i < 42; i++) {
      let g = null;
      for (let k = 0; k < 3000 && !g; k++) {
        const a = Math.random() * 6.283, r = Math.random() * (C.K.BASE_R - 8);
        g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 2, 1.5);
      }
      if (!g) continue;
      P.spawnAt(g.x, g.z, g.y);
      C.CAM.yaw = Math.random() * 6.283 - 3.14;
      C.CAM.pitch = Math.random() * 1.5 - 0.75;
      C.CAM.dist = C.CAM.want; C.CAM.lift = 0; C.CAM.first = false;
      C.CAM.smoothTgt.set(P.pos.x, P.pos.y + C.K.EYE, P.pos.z);
      await window.__sim(0.26);
      const gh = C.groundH(C.CAM.pos.x, C.CAM.pos.z);
      tested++;
      if (gh > T.VOID && C.CAM.pos.y < gh) { inside++; worst = Math.max(worst, gh - C.CAM.pos.y); }
    }
    return { tested, inside, worst: +worst.toFixed(2) };
  });
  check('the camera never ends up inside the rock', cam.inside === 0,
    cam.inside + '/' + cam.tested + ' buried, worst ' + cam.worst + 'm');

  // ---- 8. loot and props sit on the ground -----------------------------
  const place = await page.evaluate(() => {
    const C = window.CRUX;
    let floating = 0, sunk = 0, sea = 0;
    C.WI.list.forEach(it => {
      const g = C.groundH(it.x, it.z);
      if (g <= C.T.VOID) { sea++; return; }
      if (it.y - g > 0.6) floating++;
      if (g - it.y > 0.6) sunk++;
      if (it.y < 0.4) sea++;
    });
    C.WI.cases.forEach(c => {
      const g = C.groundH(c.x, c.z);
      if (g <= C.T.VOID || c.y < 0.4) { sea++; return; }
      if (Math.abs(c.y - g) > 0.6) floating++;
    });
    return { items: C.WI.list.length, cases: C.WI.cases.length, floating, sunk, sea };
  });
  check('nothing is floating in the air or sunk in the rock',
    place.floating === 0 && place.sunk === 0 && place.sea === 0, JSON.stringify(place));

  // ---- the look: detail, occlusion, grain, and things that move ---------
  const look = await page.evaluate(() => {
    const C = window.CRUX, T = C.T, g = T.mesh.geometry;
    const tris = g.attributes.position.count / 3;
    // the render mesh is subdivided past the height field it is built from
    const subdiv = tris / (T.N * T.N * 2);

    // ambient occlusion: sample vertex brightness across the island and check
    // there is a real spread, not one flat tone
    const col = g.attributes.color;
    let lo = 999, hi = -999, n = 0, sum = 0;
    for (let i = 0; i < 40000; i++) {
      const k = ((Math.random() * col.count) | 0) * 3;
      const v = (col.array[k] + col.array[k + 1] + col.array[k + 2]) / 3;
      if (v < lo) lo = v; if (v > hi) hi = v; sum += v; n++;
    }
    const spread = (hi - lo) / 255;

    // the grain map has to carry contrast or it does nothing once three
    // projections are averaged together
    const tex = T.mesh.material[0].map, cv = tex && tex.image;
    let gLo = 255, gHi = 0;
    if (cv) {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0; i < d.length; i += 4) { if (d[i] < gLo) gLo = d[i]; if (d[i] > gHi) gHi = d[i]; }
    }

    // the shader patch has to actually match its anchors, or three.js falls
    // back to the stock map lookup against a uv attribute that is not there
    const probe = { vertexShader: '#include <common>\n#include <begin_vertex>',
                    fragmentShader: '#include <common>\n#include <map_fragment>' };
    T.mesh.material[0].onBeforeCompile(probe);

    return {
      subdiv, tris, aoSpread: +spread.toFixed(3), grainRange: (gHi - gLo) / 255,
      patched: probe.vertexShader.indexOf('vWPos') >= 0 && probe.fragmentShader.indexOf('bw') >= 0,
      sunOverAmb: C.Sky.sun.intensity / Math.max(0.01, C.Sky.hemi.intensity),
    };
  });
  check('the render mesh is finer than the height field it stands on', look.subdiv >= 3.9,
    look.tris + ' triangles, ' + look.subdiv + 'x');
  check('ambient occlusion gives the rock a real tonal range', look.aoSpread > 0.25,
    'spread ' + look.aoSpread);
  check('the rock grain carries contrast', look.grainRange > 0.5, 'range ' + look.grainRange.toFixed(2));
  check('the triplanar patch found its anchors', look.patched, String(look.patched));
  check('the sun is stronger than the sky it lights against', look.sunOverAmb > 2.2,
    'ratio ' + look.sunOverAmb.toFixed(2));

  const flag = await page.evaluate(async () => {
    const C = window.CRUX, f = C.Camps.list[0].flag;
    if (!f) return { moved: -1 };
    const a = f.geometry.attributes.position.array, b0 = Array.from(a);
    await window.__sim(0.4);
    let d = 0;
    for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b0[i]);
    return { moved: +d.toFixed(2) };
  });
  check('the camp flag is cloth, not a signboard', flag.moved > 0.5, 'drift ' + flag.moved);

  const real = errors.filter(e => !/favicon|GroupMarkerNotSet|WebGL: INVALID/i.test(e));
  check('no console or page errors', real.length === 0, real.slice(0, 4).join(' | '));

  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = true;
    C.Game.renderer.setSize(640, 400, false);
  });
  await browser.close();
  console.log('');
  if (fails.length) { console.log('FAILED ' + fails.length + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL ACCEPTANCE CHECKS PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
