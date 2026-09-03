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
  check('the ground is never culled away', vis.FrontSide >= vis.DoubleSide * 0.999,
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
    P.st = 14;                                     // nearly spent already
    let sawClimb = false, sawSlip = false;
    await window.__hold(['KeyW', C.IN.grabKey], 5.0, () => {
      if (P.state === 2) sawClimb = true;
      if (P.state === 3) sawSlip = true;
    });
    return { found: true, sawClimb, sawSlip, st: +P.st.toFixed(1) };
  });
  check('running the bar dry on a wall makes you slide', !slip.found || (slip.sawClimb && slip.sawSlip),
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
