#!/usr/bin/env node
/* Headless smoke test: builds a local-vendor copy, boots it in Chromium and
   drives the game through a solo run. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'dist', 'index.html');
const TEST = path.join(ROOT, 'dist', 'test.html');

let html = fs.readFileSync(SRC, 'utf8');
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, '../vendor/three.min.js')
           .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/peerjs\/1\.5\.4\/peerjs\.min\.js/, '../vendor/peerjs.min.js');
fs.writeFileSync(TEST, html);

const fails = [], warns = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' :: ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox',
           '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file://' + TEST);
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  check('boots and exposes the game', true);

  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play',
    null, { timeout: 90000 });
  const gen = await page.evaluate(() => ({
    tris: window.CRUX.T.mesh.geometry.attributes.position.count / 3,
    rests: window.CRUX.T.rests.length,
    items: window.CRUX.WI.list.length,
    camps: window.CRUX.Camps.list.length,
    props: window.CRUX.Props.counts,
    summitY: Math.round(window.CRUX.Summit.pos.y),
    route: window.CRUX.T.route.length,
  }));
  check('world generated', gen.tris > 50000 && gen.items > 20 && gen.camps === 5, JSON.stringify(gen));

  const rstat = await page.evaluate(() => {
    const r = window.CRUX.Game.renderer.info.render;
    return { calls: r.calls, tris: r.triangles };
  });
  check('renders the world', rstat.calls > 8 && rstat.tris > 20000, JSON.stringify(rstat));

  // swiftshader draws this scene at a few fps, which starves the fixed
  // timestep.  Shrink the framebuffer and drop shadows so the simulation
  // runs at a sane rate; restored before the screenshot.
  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = false;
    C.Game.renderer.setPixelRatio(0.25);
    C.Game.renderer.setSize(160, 100, false);
    C.Game.world.visible = false;
    C.Sky.mesh.visible = false;
    C.HUD.blocked = false;
  });
  await page.waitForTimeout(1500);

  const r1 = await page.evaluate(() => ({
    y: window.CRUX.P.pos.y, x: window.CRUX.P.pos.x, z: window.CRUX.P.pos.z,
    state: window.CRUX.P.state, st: window.CRUX.P.st,
  }));
  check('player settles on the ground', Number.isFinite(r1.y) && r1.state === 0, 'state=' + r1.state + ' y=' + r1.y.toFixed(1));

  // walk
  const before = await page.evaluate(() => ({ x: window.CRUX.P.pos.x, z: window.CRUX.P.pos.z }));
  await page.keyboard.down('w');
  await page.waitForTimeout(1600);
  await page.keyboard.up('w');
  const after = await page.evaluate(() => ({ x: window.CRUX.P.pos.x, z: window.CRUX.P.pos.z, st: window.CRUX.P.st }));
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  check('walks on input', moved > 1.5, 'moved ' + moved.toFixed(2) + ' m');

  // find a steep face and check the climb engages + stamina drains
  const climb = await page.evaluate(async () => {
    const C = window.CRUX, T = C.T, P = C.P, K = C.K;
    // search for a wall with a standable ledge at its foot
    let found = null;
    for (let i = 0; i < 40000 && !found; i++) {
      const a = Math.random() * 6.283, r = 40 + Math.random() * 150;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = T.hAt(x, z);
      if (h <= T.VOID || h < 20) continue;
      if (T.normSmooth(x, z).y < 0.85) continue;
      // is there a wall within 3 m?
      for (let k = 0; k < 8; k++) {
        const b = k / 8 * 6.283;
        const px = x + Math.cos(b) * 2.0, pz = z + Math.sin(b) * 2.0;
        const ph = T.hAt(px, pz);
        if (ph > h + 4 && T.normSmooth(px, pz).y < 0.45) { found = { x, z, h, dx: Math.cos(b), dz: Math.sin(b) }; break; }
      }
    }
    if (!found) return { found: false };
    P.pos.set(found.x, found.h + 0.1, found.z);
    P.vel.set(0, 0, 0); P.state = 0; P.noGrabT = 0;
    C.CAM.yaw = Math.atan2(found.dx, found.dz);
    const st0 = P.st;
    return await new Promise(res => {
      let frames = 0, grabbed = false, maxY = P.pos.y, y0 = P.pos.y;
      const id = setInterval(() => {
        C.IN.keys['KeyW'] = true;
        frames++;
        if (P.state === 2) grabbed = true;
        maxY = Math.max(maxY, P.pos.y);
        if (frames > 130) {
          clearInterval(id);
          C.IN.keys['KeyW'] = false;
          res({ found: true, grabbed, gained: maxY - y0, drained: st0 - P.st, state: P.state, wallNy: P.wall.ny });
        }
      }, 16);
    });
  });
  check('finds a climbable face', climb.found === true);
  if (climb.found) {
    check('grabs on and climbs', climb.grabbed && climb.gained > 1.0, 'gained ' + climb.gained.toFixed(2) + ' m');
    check('stamina drains while climbing', climb.drained > 2, 'drained ' + climb.drained.toFixed(1));
  }

  // fall damage + downed + respawn
  const fall = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    P.hp = 100; P.state = 1;
    P.pos.set(C.Camps.list[0].x + 6, C.Camps.list[0].y + 46, C.Camps.list[0].z + 6);
    P.vel.set(0, 0, 0); P.fallFrom = P.pos.y;
    return await new Promise(res => {
      let f = 0;
      const id = setInterval(() => {
        f++;
        if (P.state === 0 || P.state === 3 || f > 320) { clearInterval(id); res({ hp: P.hp, state: P.state, f }); }
      }, 16);
    });
  });
  check('long falls hurt', fall.hp < 99, 'hp ' + Math.round(fall.hp) + ' state ' + fall.state);
  check('a fatal fall leaves you downed, not dead', fall.hp > 0 || fall.state === 3,
    'hp ' + Math.round(fall.hp) + ' state ' + fall.state);

  const short = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    P.hp = 100; P.state = 1;
    P.pos.set(C.Camps.list[0].x + 4, C.Camps.list[0].y + 3.2, C.Camps.list[0].z + 4);
    P.vel.set(0, 0, 0); P.fallFrom = P.pos.y;
    return await new Promise(res => {
      let f = 0;
      const id = setInterval(() => { f++; if (P.state === 0 || f > 200) { clearInterval(id); res({ hp: P.hp }); } }, 16);
    });
  });
  check('small drops are free', short.hp > 99.5, 'hp ' + short.hp.toFixed(1));

  // inventory + items
  const inv = await page.evaluate(() => {
    const C = window.CRUX;
    C.P.hunger = 20;
    C.Survive.add('jerky');
    const slot = C.Survive.findSlot('jerky');
    C.Survive.use(slot);
    return { hunger: C.P.hunger, slots: C.P.inv.map(s => s && s.k) };
  });
  check('food restores hunger', inv.hunger > 40, 'hunger ' + Math.round(inv.hunger));

  // co-op: rope arrest
  const rope = await page.evaluate(async () => {
    const C = window.CRUX, P = C.P, K = C.K;
    const c = C.Camps.list[0];
    P.hp = 100;
    C.Coop.addAnchor({ id: 'test', owner: P.id, x: c.x, y: c.y + 40, z: c.z, slot: 0 });
    P.pos.set(c.x, c.y + 40, c.z + 1);
    P.state = 1; P.vel.set(0, 0, 0); P.fallFrom = P.pos.y;
    return await new Promise(res => {
      let f = 0;
      const id = setInterval(() => {
        f++;
        const d = Math.hypot(P.pos.x - c.x, P.pos.y - (c.y + 40), P.pos.z - c.z);
        if (f > 120) { clearInterval(id); res({ d, caught: P.ropeCaught, hp: P.hp, state: P.state }); }
      }, 16);
    });
  });
  check('rope arrests a fall', rope.d <= 16.5 && rope.caught === true, 'dist ' + rope.d.toFixed(1) + ' hp ' + Math.round(rope.hp));

  // determinism: same seed, same mountain
  const det = await page.evaluate(() => {
    const C = window.CRUX, T = C.T;
    const sample = () => [T.hAt(12, -40), T.hAt(-88, 61), T.hAt(140, 130), T.rests.length].map(v => Math.round(v * 1000) / 1000);
    const a = sample();
    const before = T.seed;
    T.build(before);
    const b = sample();
    return { a, b, same: JSON.stringify(a) === JSON.stringify(b) };
  });
  check('terrain is deterministic from the seed', det.same, JSON.stringify(det.a));

  await page.evaluate(() => {
    const C = window.CRUX;
    C.T.build(C.T.seed);
    C.Game.renderer.shadowMap.enabled = true;
    C.Game.renderer.setPixelRatio(1);
    C.Game.renderer.setSize(1280, 760, false);
    C.Game.world.visible = true;
    C.Sky.mesh.visible = true;
    C.Game.cam.aspect = 1280 / 760; C.Game.cam.updateProjectionMatrix();
    C.P.pos.set(C.Camps.list[1].x + 3, C.Camps.list[1].y + 2, C.Camps.list[1].z + 6);
    C.CAM.yaw = Math.atan2(-C.P.pos.x, -C.P.pos.z); C.CAM.pitch = 0.12;
  });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(ROOT, 'dist', 'shot-game.png') });

  // leaving the mountain and starting another run has to rebuild cleanly
  const errBefore = errors.length;
  await page.evaluate(() => window.CRUX.Game.quit());
  await page.waitForTimeout(300);
  const backAtMenu = await page.evaluate(() => window.CRUX.Game.mode === 'menu' && !document.getElementById('menu').classList.contains('hidden'));
  check('leaving the mountain returns to the menu', backAtMenu);
  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  const second = await page.evaluate(() => ({
    calls: window.CRUX.Game.renderer.info.render.calls,
    tris: window.CRUX.Game.renderer.info.render.triangles,
    items: window.CRUX.WI.list.length,
  }));
  check('a second run rebuilds and renders', second.calls > 8 && second.tris > 20000 && second.items > 20,
    JSON.stringify(second));
  check('no errors on the second run', errors.length === errBefore, errors.slice(errBefore, errBefore + 3).join(' | '));

  const perf = await page.evaluate(() => ({ fps: Math.round(window.CRUX.Game.fps), calls: window.CRUX.Game.renderer.info.render.calls }));
  console.log('  INFO  swiftshader fps ' + perf.fps + ', draw calls ' + perf.calls);

  const realErrors = errors.filter(e => !/favicon|Download the React|WebGL: INVALID|GroupMarkerNotSet/i.test(e));
  check('no console or page errors', realErrors.length === 0, realErrors.slice(0, 6).join(' | '));

  await browser.close();
  console.log('');
  if (fails.length) { console.log('FAILED ' + fails.length + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL CHECKS PASSED');
})().catch(e => { console.error('SMOKE CRASH', e); process.exit(2); });
