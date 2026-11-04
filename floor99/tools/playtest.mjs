// Full-floor automated playtest. A bot (aim-assisted, but using the real player controller,
// weapons, physics and scripts) plays a floor in fixed simulation steps. Logs objectives,
// deaths, errors and FPS-independent progress; saves screenshots at intervals.
// Usage: node tools/playtest.mjs <floor> <maxSeconds> <outDir> [cp]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const floor = process.argv[2] || '1';
const maxT = +(process.argv[3] || 300);
const out = process.argv[4] || 'shots';
const cp = process.argv[5] || '0';
const port = process.env.PORT || 8099;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !/GL_|WebGL|GPU stall|swiftshader|Automatic fallback/i.test(t)) errors.push(`[${m.type()}] ${t}`); if (m.type() === 'log' && t.startsWith('[bot]')) console.log(t); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
if (process.env.LOWQ !== '0') await page.addInitScript(() => { try { const k = 'floor99.save.v1'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.settings = { ...(d.settings || {}), quality: 'low', voice: false }; localStorage.setItem(k, JSON.stringify(d)); } catch (e) {} });
await page.goto(`http://localhost:${port}/?autostart&floor=${floor}&cp=${cp}`);
await page.waitForFunction(() => window.__floor99 && window.__floor99.game, null, { timeout: 60000 });
await page.evaluate(() => { window.__floor99.frozen = true; });

// install bot
await page.evaluate(() => {
  const A = window.__floor99;
  const T = (window.__THREE = A.game.camera.constructor); // not used
  let tick = 0;
  window.__bot = (g, input) => {
    tick++;
    const pl = g.player;
    if (!pl.alive) return;
    input.keys.clear();
    input.mouse.left = false;
    // cheat-aim at nearest enemy
    let best = null, bd = 1e9;
    for (const e of g.enemies) {
      if (!e.alive || e.spawnT > 0.3) continue;
      const d = e.pos.distanceTo(pl.pos);
      if (d < bd) { bd = d; best = e; }
    }
    const gift = g.pickups.find((p) => p.alive && p.gift && p.landed);
    // grapple up to elevated gifts
    if (gift && gift.pos.y > pl.pos.y + 2.5 && (!best || bd > 14)) {
      let gp = null, gd = 1e9;
      for (const q of g.grapplePoints) { const d = q.obj.getWorldPosition(q.pos.clone()).distanceTo(gift.pos); if (d < gd) { gd = d; gp = q; } }
      if (gp && pl.mode !== 'grapple') {
        const p = gp.obj.getWorldPosition(gp.pos.clone());
        const from = g.camera.position;
        const dx = p.x - from.x, dy = p.y - from.y, dz = p.z - from.z;
        const hd = Math.hypot(dx, dz);
        if (hd < 30) { pl.camYaw = Math.atan2(-dx, -dz); pl.camPitch = Math.atan2(dy, hd); if (tick % 30 === 0) input.pressed.add('KeyE'); return; }
      } else if (pl.mode === 'grapple') { input.keys.add('KeyW'); return; }
    }
    let goal = null;
    // objective-driven routes (traversal the aim-bot can't infer)
    const ROUTES = {
      12: [[/REACH THE MAIN/, [[0, 0, 30], [0, 0, 60], [0, 0, 74]]], [/CLIMB|KEEP CLIMBING|SURVIVE|UPPER DECK/, [[-22, 0, 70], [-22, 6, 82], [-22, 6, 94], [-22, 12, 107], [-4, 12, 110], [0, 12, 114]]]],
      4: [[/ELEVATOR/, [[0, 0, 150], [0, 0, 160]]]],
      1: [[/ESCAPE|INTO THE ELEVATOR/, [[0, 0, 30], [0, 0, 56.5], [0, 0, 79]]]],
    };
    const fid = g.floorDef.id;
    for (const [re, pts] of (ROUTES[fid] || [])) {
      if (!re.test(g.objective.text)) continue;
      window.__ri = window.__ri || {};
      const key = fid + re.source;
      let i = window.__ri[key] || 0;
      while (i < pts.length - 1 && Math.hypot(pl.pos.x - pts[i][0], pl.pos.z - pts[i][2]) < 2.2 && Math.abs(pl.pos.y - pts[i][1]) < 2.5) i++;
      window.__ri[key] = i;
      goal = { x: pts[i][0], y: pts[i][1], z: pts[i][2], route: true };
      // floor 1 pit: grapple across
      if (fid === 1 && i === 2 && pl.pos.z > 55 && pl.pos.z < 58 && pl.mode !== 'grapple' && tick % 20 === 0) {
        const gp = g.grapplePoints.find((q) => q.pos.z > 69);
        const p = gp.obj.getWorldPosition(gp.pos.clone()), c = g.camera.position;
        pl.camYaw = Math.atan2(-(p.x - c.x), -(p.z - c.z)); pl.camPitch = Math.atan2(p.y - c.y, Math.hypot(p.x - c.x, p.z - c.z));
        input.pressed.add('KeyE');
        return;
      }
      if (fid === 1 && i === 1 && pl.pos.z > 40 && pl.pos.z < 47 && g.floor.pressA.state !== 'rise' && g.floor.pressA.state !== 'up') goal = { x: 0, y: 0, z: 40.5, route: true };
      if (fid === 1 && pl.pos.z > 48 && pl.pos.z < 50 && g.floor.pressB.bottom() < 2 && pl.mode === 'normal') input.pressed.add('KeyC');
      break;
    }
    if (goal) { /* route */ }
    else if (window.__goal) goal = window.__goal(g);
    else if (gift && (!best || bd > 12)) goal = gift.pos;
    else if (best) goal = best.pos;
    // no robots nearby? shoot destructible power cores
    let core = null;
    if (!best || bd > 25) { let cd = 1e9; for (const d of (g.destructibles || [])) { if (!d.alive) continue; const dd = d.pos.distanceTo(pl.pos); if (dd < cd) { cd = dd; core = d; } } }
    if (core) {
      if (pl.arsenal.current.id === 'gravity') pl.arsenal.select(0);
      const c = core.pos, from = g.camera.position;
      const dx = c.x - from.x, dy = c.y - from.y, dz = c.z - from.z;
      pl.camYaw = Math.atan2(-dx, -dz); pl.camPitch = Math.atan2(dy, Math.hypot(dx, dz));
      if (core.pos.distanceTo(pl.pos) < 22) { if (tick % 8 === 0) { input.mouse.left = true; input.mouse.leftPressed = true; } }
      const ddx = c.x - pl.pos.x, ddz = c.z - pl.pos.z, dist = Math.hypot(ddx, ddz);
      if (dist > 9) { const yaw = pl.camYaw; const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw); const f = (ddx * fx + ddz * fz) / dist, r = (ddx * rx + ddz * rz) / dist; if (f > 0.3) input.keys.add('KeyW'); if (r > 0.3) input.keys.add('KeyD'); if (r < -0.3) input.keys.add('KeyA'); }
      if (pl.wallContact && pl.grounded && tick % 30 === 0) input.pressed.add('Space');
      return;
    }
    if (best && bd < 60) {
      let c = best.center(pl.pos.clone());
      // aim at weak points on bosses / heavies
      const pref = ['armL', 'armR', 'weak', 'core'];
      for (const tag of pref) { const h = best.hitSpheres.find((x) => x.tag === tag && (!best.parts || best.parts[tag]?.alive !== false)); if (h && (tag !== 'core' || !best.coreExposed || best.coreExposed())) { c = best.sphereWorld(h, c); break; } }
      const from = g.camera.position;
      const dx = c.x - from.x, dy = c.y - from.y, dz = c.z - from.z;
      pl.camYaw = Math.atan2(-dx, -dz);
      pl.camPitch = Math.atan2(dy, Math.hypot(dx, dz));
      if (pl.aimEnemy || bd < 25) {
        const w = pl.arsenal.current;
        if (w && (w.def.auto)) input.mouse.left = true;
        else if (tick % 8 === 0) { input.mouse.left = true; input.mouse.leftPressed = true; }
      }
      if (bd < 2.6 && tick % 20 === 0) input.pressed.add('KeyF');
    } else if (goal) {
      const dx = goal.x - pl.pos.x, dz = goal.z - pl.pos.z;
      pl.camYaw = Math.atan2(-dx, -dz);
      pl.camPitch = -0.1;
    }
    if (goal) {
      const dx = goal.x - pl.pos.x, dz = goal.z - pl.pos.z;
      const dist = Math.hypot(dx, dz);
      const keep = best && goal === best.pos ? 7 : 0.5;
      if (goal.route && pl.mode === 'swim') input.keys.add('Space');
      if (dist > keep) {
        // move in world dir relative to camera yaw
        const yaw = pl.camYaw;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
        const f = (dx * fx + dz * fz) / dist, r = (dx * rx + dz * rz) / dist;
        if (f > 0.3) input.keys.add('KeyW'); if (f < -0.3) input.keys.add('KeyS');
        if (r > 0.3) input.keys.add('KeyD'); if (r < -0.3) input.keys.add('KeyA');
        if (dist > 12) input.keys.add('ShiftLeft');
      } else if (best) {
        input.keys.add(Math.sin(tick * 0.02) > 0 ? 'KeyA' : 'KeyD');
      }
      if (pl.wallContact && pl.grounded && tick % 30 === 0) input.pressed.add('Space');
    }
    // dodge enemy bolts occasionally
    if (tick % 140 === 0) input.pressed.add('KeyQ');
    // reload when empty
    const w = pl.arsenal.current;
    if (w && w.ammo === 0 && w.reserve === 0 && pl.arsenal.slots.length > 1) pl.arsenal.cycle(1);
  };
});

let lastObj = '';
let shot = 0;
let simT = 0;
const snap = async (name) => { await page.evaluate(() => window.__floor99.debugRender()); await page.screenshot({ path: `${out}/${String(shot++).padStart(2, '0')}-${name}.png`, timeout: 120000 }); };
await snap('start');
let deaths = 0;
while (simT < maxT) {
  const r = await page.evaluate(() => {
    const A = window.__floor99;
    if (A.state === 'dead') { A.retry(true); return { dead: true }; }
    if (!A.game) return { none: true, state: A.state };
    return A.debugStep(1, window.__bot);
  });
  if (r && r.dead) { deaths++; console.log('DEATH at', simT); await new Promise((res) => setTimeout(res, 1200)); await page.evaluate(() => { window.__floor99.frozen = true; }); continue; }
  if (r && r.none) { console.log('no game, state', r.state); break; }
  simT += 1;
  if (r.obj !== lastObj) { console.log(`[${simT}s] OBJ: ${r.obj} | hp=${Math.round(r.hp)} enemies=${r.enemies}`); lastObj = r.obj; await snap(`obj${simT}`); }
  if (simT % (+process.env.SHOT_EVERY || 30) === 0) { console.log(`[${simT}s] t=${r.t.toFixed(1)} hp=${Math.round(r.hp)} enemies=${r.enemies} state=${r.state}`); await snap(`t${simT}`); }
  if (r.state === 'complete') { console.log('FLOOR COMPLETE at', simT); await page.evaluate(() => { window.__floor99.frozen = false; }); await new Promise((res) => setTimeout(res, 4000)); await page.screenshot({ path: `${out}/${String(shot++).padStart(2, '0')}-complete.png` }); break; }
  if (process.env.GOAL && simT === +process.env.GOAL_AT) await page.evaluate((s) => { window.__goal = new Function('g', s); }, process.env.GOAL);
}
console.log('deaths', deaths, 'ERRORS:', errors.length);
for (const e of errors.slice(0, 30)) console.log(e);
await browser.close();
