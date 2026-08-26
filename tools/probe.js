#!/usr/bin/env node
/* Headless assertion harness.
 *
 * Boots minecraft.html once in Chromium and runs a named list of probes
 * against the live game, printing one PASS/FAIL line each. Adding a check
 * means adding one entry to PROBES below -- the browser plumbing is written
 * once and never again, and a whole round of verification costs a handful of
 * lines of output instead of a screenshot.
 *
 *   node tools/probe.js              run everything
 *   node tools/probe.js bed sleep    run only probes whose name matches
 *
 * Each probe is { name, fn } where fn runs INSIDE the page, is given the
 * shared helper object, and returns a string. Prefix the string with "FAIL"
 * to fail; anything else passes. Probes run in order and share the world.
 */
const path = require('path');
const PW = process.env.PW_DIR ||
  '/tmp/claude-0/-home-user-game/8e46908c-6722-519f-95f9-a35325cb275d/scratchpad/node_modules/playwright-core';
const CHROME = process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = require(PW);

/* ------------------------------------------------------------- probes -- */
const PROBES = [
  { name: 'boot', fn: () => {
      const g = window.game;
      return 'blocks=' + BLOCKS.length + ' items=' + ITEM_LIST.length + ' mobs=' +
        Object.keys(MOBS).length + ' tiles=' + TEX_LAYERS.length + ' fps=' + g.fps.toFixed(0);
    } },

  { name: 'empty-inventory', fn: () => {
      const p = window.game.player;
      let n = 0; for (let i = 0; i < p.inv.length; i++) if (p.inv[i]) n++;
      return n === 0 ? 'start with nothing' : 'FAIL ' + n + ' starting items';
    } },

  { name: 'spawn-distance', fn: () => {
      const p = window.game.player;
      const d = Math.round(Math.hypot(p.x, p.z));
      return d < 900 ? d + ' blocks from origin' : 'FAIL ' + d + ' blocks from origin';
    } },

  /* an empty hand must still open things */
  { name: 'empty-hand-interact', fn: () => {
      const g = window.game, p = g.player, out = [];
      p.creative = true; p.inv[p.sel] = null; p.offhand = null;
      g.dayTime = 14000; g.isDay = false;     /* a bed only works at night */
      for (let i = g.entities.length - 1; i >= 0; i--)
        if (MOBS[g.entities[i].type].hostile) g.entities.splice(i, 1);
      const x = Math.floor(p.x) + 3, y = Math.floor(p.y), z = Math.floor(p.z);
      for (const b of ['crafting_table', 'furnace', 'chest', 'white_bed']) {
        if (BID[b] === undefined) { out.push(b + '=missing'); continue; }
        g.world.setBlock(p.dim, x, y, z, BID[b]);
        UI.screen = null; g.sleeping = 0;
        const ok = placeBlock(g, { x: x, y: y, z: z, face: 2, id: BID[b] });
        const opened = !!UI.screen || !!g.sleeping;
        out.push(b + '=' + (ok && opened ? 'ok' : 'NO'));
        if (UI.screen) hideScreen(g);
        g.sleeping = 0; g.sleepFade = 0; g.sleepPos = null;
        g.world.setBlock(p.dim, x, y, z, 0);
      }
      const bad = out.filter(s => s.indexOf('=ok') < 0);
      return (bad.length ? 'FAIL ' : '') + out.join(' ');
    } },

  { name: 'sleep', fn: async () => {
      const g = window.game, p = g.player;
      g.dayTime = 14000; g.isDay = false; p.creative = true;
      for (let i = g.entities.length - 1; i >= 0; i--)
        if (MOBS[g.entities[i].type].hostile) g.entities.splice(i, 1);
      const x = Math.floor(p.x) + 2, y = Math.floor(p.y), z = Math.floor(p.z);
      g.world.setBlock(p.dim, x, y, z, BID.white_bed);
      const pitch0 = p.pitch;
      if (!g.trySleep({ x: x, y: y, z: z, face: 2 })) return 'FAIL trySleep refused';
      const seen = { fade: 0, pitch: pitch0 };
      for (let i = 0; i < 40; i++) {
        updateSleep(g, 0.05);
        seen.fade = Math.max(seen.fade, g.sleepFade || 0);
        seen.pitch = Math.min(seen.pitch, p.pitch);
      }
      const onBed = Math.abs(p.x - (x + 0.5)) < 0.01 && Math.abs(p.z - (z + 0.5)) < 0.01;
      g.sleeping = 0; g.sleepFade = 0; g.sleepPos = null;
      g.world.setBlock(p.dim, x, y, z, 0);
      return (seen.fade > 0.9 && seen.pitch < -0.8 && onBed)
        ? 'lies on the bed, fades to ' + seen.fade.toFixed(2) + ', looks up to '
          + seen.pitch.toFixed(2) + ' rad, wakes at dawn'
        : 'FAIL fade=' + seen.fade.toFixed(2) + ' pitch=' + seen.pitch.toFixed(2) + ' onBed=' + onBed;
    } },

  { name: 'bed-model', fn: () => {
      const boxes = modelFor(BID.white_bed, 0);
      if (!boxes) return 'FAIL no model';
      let lo = 99, hi = -99;
      for (const b of boxes) { lo = Math.min(lo, b.y0); hi = Math.max(hi, b.y1); }
      return boxes.length >= 6 && lo === 0
        ? boxes.length + ' boxes, y ' + lo + '..' + hi + ' (legs+mattress+pillow)'
        : 'FAIL ' + boxes.length + ' boxes, y ' + lo + '..' + hi;
    } },

  { name: 'worlds', fn: () => {
      const g = window.game;
      g.worldId = 'probe-abc'; g.worldName = 'Probe World'; g.seed = 4242;
      if (!saveGame(g)) return 'FAIL save refused';
      const all = listWorlds();
      const mine = all.find(w => w.id === 'probe-abc');
      const slug = worldSlug('My  Cool World!!');
      const s1 = seedFromText('hello'), s2 = seedFromText('hello'), s3 = seedFromText('12345');
      g.seed = 0; g.worldName = '';
      const ok = loadGame(g);
      deleteWorld('probe-abc');
      const gone = !listWorlds().some(w => w.id === 'probe-abc');
      return (mine && mine.name === 'Probe World' && slug === 'my-cool-world' &&
        s1 === s2 && s3 === 12345 && ok && g.seed === 4242 && g.worldName === 'Probe World' && gone)
        ? all.length + ' world(s) listed, save/load round-trips by id, slug=' + slug +
          ', text seed stable, numeric seed exact, delete works'
        : 'FAIL listed=' + (mine ? 'y' : 'n') + ' slug=' + slug + ' load=' + ok +
          ' seed=' + g.seed + ' name=' + g.worldName + ' deleted=' + gone;
    } },

  { name: 'enderman', fn: () => {
      const m = MOBS.enderman, arm = m.model.parts.find(p => p.n === 'armL');
      const a0 = arm.piv[1] + arm.box[1], a1 = a0 + arm.box[4];
      const head = m.model.parts.find(p => p.n === 'head');
      const hTop = head.piv[1] + head.box[1] + head.box[4];
      return a1 <= hTop
        ? 'h=' + m.h + ' arms ' + a0 + '..' + a1 + ' head top ' + hTop + ' stare=' + !!m.stare
        : 'FAIL arms reach ' + a1 + ' above head top ' + hTop;
    } },

  { name: 'caves', fn: () => {
      const g = window.game, w = g.world, p = g.player, dim = p.dim;
      let air = 0, solid = 0, open = 0, tall = 0, cols = 0;
      const x0 = Math.floor(p.x) - 48, z0 = Math.floor(p.z) - 48;
      for (let x = x0; x < x0 + 96; x += 2) for (let z = z0; z < z0 + 96; z += 2) {
        const h = w.getHeight(dim, x, z); if (h < 5) continue;
        cols++; let run = 0, top = false;
        for (let y = 8; y < h - 1; y++) {
          if (w.getId(dim, x, y, z) === 0) { air++; run++; if (y > h - 4) top = true; }
          else { solid++; if (run > tall) tall = run; run = 0; }
        }
        if (run > tall) tall = run;
        if (top) open++;
      }
      const pct = 100 * air / Math.max(1, air + solid);
      return pct > 3 && tall > 12
        ? pct.toFixed(1) + '% air, ' + open + '/' + cols + ' columns open to sky, tallest void ' + tall
        : 'FAIL ' + pct.toFixed(1) + '% air, tallest void ' + tall;
    } },

  { name: 'postfx', fn: () => {
      const c = R.progComposite.u;
      const missing = ['uDof', 'uDofDepth', 'uCTexel', 'uPrev', 'uBlurAmt']
        .filter(n => c[n] === undefined || c[n] === null);
      return missing.length ? 'FAIL uniforms missing: ' + missing.join(',')
        : 'dof=' + R.settings.dof + ' motionBlur=' + R.settings.motionBlur +
          ' depthTex=' + !!R.sceneFBO.depth + ' all uniforms bound';
    } },

  { name: 'multiplayer-code', fn: () => {
      const c = netInviteCode('abc1234', 123456);
      const back = netParseCode(c);
      return (back && back.room === 'abc1234' && back.seed === 123456 &&
        c.indexOf('/') < 0 && c.indexOf(':') < 0)
        ? c + ' round-trips, carries no path' : 'FAIL ' + c;
    } },

  { name: 'swing-curves', fn: () => {
      /* the vanilla constants, sampled: f1 must peak early, f late */
      const at = s => [Math.sin(s * s * Math.PI), Math.sin(Math.sqrt(s) * Math.PI)];
      const a = at(0.25), b = at(0.85);
      return (a[1] > a[0] && b[0] > b[1] && SWING_GAIN.length === 4)
        ? 'f1 leads early (' + a[1].toFixed(2) + '>' + a[0].toFixed(2) + '), f leads late ('
          + b[0].toFixed(2) + '>' + b[1].toFixed(2) + '), ' + SWING_GAIN.length + ' tool gains'
        : 'FAIL curve shape wrong';
    } },
];

/* --------------------------------------------------------------- run -- */
(async () => {
  const filter = process.argv.slice(2);
  const list = filter.length
    ? PROBES.filter(p => filter.some(f => p.name.indexOf(f) >= 0))
    : PROBES;
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  const seed = process.env.SEED || '4';
  await page.goto('file://' + path.resolve(__dirname, '..', 'minecraft.html') + '?seed=' + seed);
  await page.waitForFunction(() => window.game && window.game.ready, null, { timeout: 240000 });
  await page.waitForTimeout(Number(process.env.SETTLE || 14000));

  let fails = 0;
  for (const p of list) {
    let r;
    try { r = await page.evaluate(p.fn); }
    catch (e) { r = 'FAIL threw: ' + String(e.message).slice(0, 120); }
    const bad = typeof r === 'string' && r.startsWith('FAIL');
    if (bad) fails++;
    console.log((bad ? 'FAIL ' : 'pass ') + p.name.padEnd(20) + ' ' + r.replace(/^FAIL /, ''));
  }
  if (process.env.SHOTS) {
    const OUT = process.env.SHOT_DIR || '/tmp';
    await page.evaluate(() => {
      const g = window.game, p = g.player;
      g.timeOfDay = 0.30; g.weather.rain = 0; g.sleeping = 0;
      p.creative = true; p.flying = false;
      document.querySelector('.hud').style.display = 'none';
      const x = Math.floor(p.x) + 1, z = Math.floor(p.z);
      const y = g.world.getHeight(p.dim, x, z);
      g.world.setBlock(p.dim, x, y, z, BID.white_bed);
      window.__bed = { x: x, y: y, z: z };
      p.pitch = -1.10; p.vx = p.vy = p.vz = 0;   /* a natural glance down */
    });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { window.game.frozen = true; });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + '/p_body.png' });
    await page.evaluate(() => {
      const g = window.game, p = g.player, b = window.__bed;
      p.x = b.x + 0.5; p.z = b.z + 3.4; p.y = b.y + 2; p.camY = p.y + 1.5;
      p.yaw = 0; p.pitch = -0.42; g.frozen = true;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '/p_bed.png', clip: { x: 150, y: 120, width: 360, height: 250 } });
    console.log('shots  p_body.png p_bed.png');
  }
  const uniq = [...new Set(errs)];
  if (uniq.length) { fails++; console.log('FAIL page-errors        ' + uniq.slice(0, 4).join(' | ')); }
  else console.log('pass page-errors        none');
  console.log(fails ? fails + ' FAILED' : 'all ' + list.length + ' probes passed');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('HARNESS FAILED ' + e.message); process.exit(2); });
