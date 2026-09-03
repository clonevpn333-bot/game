#!/usr/bin/env node
/* Boot, generate, render, move, restart. */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, '../vendor/three.min.js')
           .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/peerjs\/1\.5\.4\/peerjs\.min\.js/, '../vendor/peerjs.min.js');
fs.writeFileSync(path.join(ROOT, 'dist', 'test.html'), html);

const fails = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' :: ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto('file://' + path.join(ROOT, 'dist', 'test.html'));
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  check('boots and exposes the game', true);

  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  const gen = await page.evaluate(() => ({
    tris: window.CRUX.T.mesh.geometry.attributes.position.count / 3,
    camps: window.CRUX.Camps.list.map(c => Math.round(c.y)),
    walls: window.CRUX.Walls.list.map(w => Math.round(w.y)),
    items: window.CRUX.WI.list.length, cases: window.CRUX.WI.cases.length,
    props: window.CRUX.Props.counts,
    pick: window.CRUX.Run.pick,
    summitY: Math.round(window.CRUX.Summit.pos.y),
  }));
  const campsSorted = gen.camps.every((v, i) => i === 0 || v > gen.camps[i - 1]);
  const wallsSorted = gen.walls.every((v, i) => i === 0 || v > gen.walls[i - 1]);
  check('world generated', gen.tris > 100000 && gen.items > 20 && gen.cases > 15 && gen.camps.length === 6,
    JSON.stringify({ tris: gen.tris, items: gen.items, cases: gen.cases, summitY: gen.summitY }));
  check('camps and fog walls climb in order', campsSorted && wallsSorted,
    'camps ' + gen.camps.join(',') + ' walls ' + gen.walls.join(','));
  // whichever biomes this island rolled, each has to have put something out
  const SIGNATURE = {
    shore: ['palm', 'drift'], tropics: ['tree', 'fern'], roots: ['shroom', 'arch'],
    alpine: ['pine'], mesa: ['cactus', 'brush'], caldera: ['basalt'],
    gloom: ['gtree', 'bell'], kiln: ['obs'], citadel: ['pillar', 'ruin'], peak: ['cairn'],
  };
  const bare = gen.pick.filter(b => !(SIGNATURE[b] || []).some(k => (gen.props[k] || 0) > 5));
  check('every biome this island rolled built its own scenery', bare.length === 0,
    gen.pick.join(' > ') + '  ' + JSON.stringify(gen.props));

  const rstat = await page.evaluate(() => {
    const r = window.CRUX.Game.renderer.info.render;
    return { calls: r.calls, tris: r.triangles };
  });
  check('renders the world', rstat.calls > 8 && rstat.tris > 20000, JSON.stringify(rstat));

  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = false;
    C.Game.renderer.setPixelRatio(0.25);
    C.Game.renderer.setSize(160, 100, false);
    C.Game.world.visible = false;
    C.Sky.mesh.visible = false;
    C.HUD.blocked = false;
    document.getElementById('pause').classList.add('hidden');
    window.__sim = (s) => new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => { if (C.Game.t - start >= s) { clearInterval(id); res(); } }, 8);
    });
  });
  await page.evaluate(() => window.__sim(1.0));

  const r1 = await page.evaluate(() => ({ state: window.CRUX.P.state, y: window.CRUX.P.pos.y }));
  check('player settles on the ground', r1.state === 0, 'state=' + r1.state + ' y=' + r1.y.toFixed(1));

  const before = await page.evaluate(() => ({ x: window.CRUX.P.pos.x, z: window.CRUX.P.pos.z }));
  await page.keyboard.down('w');
  await page.evaluate(() => window.__sim(1.6));
  await page.keyboard.up('w');
  const after = await page.evaluate(() => ({ x: window.CRUX.P.pos.x, z: window.CRUX.P.pos.z }));
  const moved = Math.hypot(after.x - before.x, after.z - before.z);
  check('walks on input', moved > 1.5, 'moved ' + moved.toFixed(2) + ' m');

  const det = await page.evaluate(() => {
    const T = window.CRUX.T;
    const sample = () => [T.hAt(12, -40), T.hAt(-88, 61), T.hAt(140, 130)].map(v => Math.round(v * 1000) / 1000);
    const a = sample();
    T.build(T.seed);
    const b = sample();
    return { a, same: JSON.stringify(a) === JSON.stringify(b) };
  });
  check('the island is the same every time from one seed', det.same, JSON.stringify(det.a));

  await page.evaluate(() => {
    const C = window.CRUX;
    C.T.build(C.T.seed);
    C.Game.renderer.shadowMap.enabled = true;
    C.Game.renderer.setPixelRatio(1);
    C.Game.renderer.setSize(900, 560, false);
    C.Game.world.visible = true; C.Sky.mesh.visible = true;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ROOT, 'dist', 'shot-game.png') });

  const errBefore = errors.length;
  await page.evaluate(() => window.CRUX.Game.quit());
  await page.waitForTimeout(300);
  check('leaving the island returns to the menu',
    await page.evaluate(() => window.CRUX.Game.mode === 'menu' && !document.getElementById('menu').classList.contains('hidden')));
  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.waitForTimeout(1200);
  const second = await page.evaluate(() => ({
    calls: window.CRUX.Game.renderer.info.render.calls,
    tris: window.CRUX.Game.renderer.info.render.triangles,
    items: window.CRUX.WI.list.length,
  }));
  check('a second run rebuilds and renders', second.calls > 8 && second.tris > 20000 && second.items > 20, JSON.stringify(second));
  check('no errors on the second run', errors.length === errBefore, errors.slice(errBefore, errBefore + 3).join(' | '));

  const real = errors.filter(e => !/favicon|GroupMarkerNotSet|WebGL: INVALID/i.test(e));
  check('no console or page errors', real.length === 0, real.slice(0, 4).join(' | '));

  await browser.close();
  console.log('');
  if (fails.length) { console.log('FAILED ' + fails.length + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL SMOKE CHECKS PASSED');
})().catch(e => { console.error('SMOKE CRASH', e); process.exit(2); });
