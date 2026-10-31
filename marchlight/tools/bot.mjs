// Fast headless playtest bot: plays a stretch of the story like a player would and reports what happened.
//   node tools/bot.mjs <beat> [--stop <checkpoint>] [--secs 600] [--shots] [--film] [--choice Flywheel]
// --shots: a picture at each new objective. --film: dialogue at normal speed and a picture every 4 s of game time
// (then stitch the folder into a contact sheet to review cutscenes).
// It walks the objective waypoints, uses whatever is in reach, shoots what's alive, does the tether tasks it
// recognises, latches when told to board. Everything runs inside the page in batches (no per-step round
// trips), dialogue is instant, nothing is rendered unless --shots. Prints one line per change of
// checkpoint/objective, every stuck spot and death, then a summary. Typical chapter: well under a minute.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), beat = args[0] || 'c1_fields';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const stop = opt('stop', null), secs = +opt('secs', 600), film = args.includes('--film'), shots = args.includes('--shots') || film, out = path.resolve(opt('out', '/tmp/claude-0/-home-user-game/d07be3d3-70a3-5fb5-b77a-ef8b8d9dfbe9/scratchpad/bot'));
if (shots) fs.mkdirSync(out, { recursive: true });
const T0 = Date.now();
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await b.newPage({ viewport: { width: 480, height: 270 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(`http://localhost:8080/index.html?beat=${beat}`);
await page.waitForFunction(() => window.__game?.running, null, { timeout: 300000 });
const boot = ((Date.now() - T0) / 1000).toFixed(0);
await page.evaluate(({ choice, film }) => {
  const g = __game; g.audio.init(); g.rethrow = false; g.skipAll = !film; g.autoChoose = (o, pick) => setTimeout(() => pick(0), 0);
  const B = window.__bot = { log: [], last: '', stillT: 0, stuck: 0, deaths: 0, lastP: null, was: {}, pick: choice || 'Greenhouse field' };
  const f = g.story.failState.bind(g.story); g.story.failState = (w) => { if (!g.story.failing) { B.deaths++; B.log.push(`  DEATH "${w}" at ${g.player.pos.toArray().map(v => v.toFixed(0))}`); } return f(w); };
  const CAP = ['Wind pump', 'Wind turbine', 'Harvest beam', 'Rig engine', 'Lantern'], REL = ['Bram', 'Dynamo', 'Harvest anchor', 'Harpoon winch', B.pick], ONE = ['Bram', 'Dynamo', 'Harpoon winch'];
  const AIM = { Leech: 0.4, Raider: 1.1 };
  B.step = (n) => {
    for (let s = 0; s < n; s++) {
      const P = g.player, V = P.pos.constructor, cam = g.engine.camera, keys = g.input.keys;
      const aimAt = (p) => { const d = p.clone().sub(cam.position); g.camera.yaw = Math.atan2(d.x, d.z); g.camera.pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z)); };
      const edge = (k) => { if (!B.was[k]) keys.add(k); B.was[k] = !B.was[k]; };
      for (const k of ['KeyW', 'ShiftLeft', 'Space', 'KeyE', 'KeyQ', 'KeyF']) keys.delete(k);
      const obj = g.hud.objective, text = obj?.text || ''; let tgt = obj?.target; if (typeof tgt === 'function') tgt = tgt();
      if (!g.director.active && !P.dead && P.state !== 'scripted') {
        if (P.health < 50) P.health = 100;
        const tt = [...g.tether.targets].filter(t => !t.enabled || t.enabled());
        const rel = tt.find(t => t.releaseOnly && REL.includes(t.label)), cap = tt.find(t => t.captureOnly && CAP.includes(t.label));
        const need = rel && ONE.includes(rel.label) ? 1 : rel ? 3 : 1;
        const foes = g.enemies.alive;
        if (foes.length) {
          const e = foes.reduce((a, c) => a.pos.distanceTo(P.pos) < c.pos.distanceTo(P.pos) ? a : c), ep = e.pos.clone().add(new V(0, AIM[e.constructor.name] || 0, 0));
          const dir = ep.clone().sub(cam.position).normalize(); aimAt(ep);
          g.weapons.aimRay = () => ({ origin: cam.position.clone(), dir: dir.clone() }); g.weapons.drawn = true; g.weapons.cooldown = 0; g.weapons.drawT = 0;
          const am = g.weapons.ammo[g.weapons.current]; if (am && am.mag < 1) am.mag = 20; if (s % 3 === 0) g.weapons.fire();
          const blocked = g.physics.raycastFilter(cam.position, dir, cam.position.distanceTo(ep) - 0.6, 1 | 4 | 128, (c, m) => m?.kind !== 'player' && m?.kind !== 'enemy');
          if ((e.pos.distanceTo(P.pos) > 25 || blocked) && !g.chaseSpeed) { const d = ep.clone().sub(P.pos).setY(0); g.camera.yaw = Math.atan2(d.x, d.z) + (blocked ? 0.6 : 0); keys.add('KeyW'); }
        } else if (cap && (!rel || g.tether.cells < need) && (rel || text.includes('lantern') || cap.label === 'Lantern')) { aimAt(cap.getPos()); if (cap.getPos().distanceTo(P.pos) > 32) keys.add('KeyW'); else keys.add('KeyE'); }
        else if (rel && g.tether.cells >= Math.min(need, 2)) { aimAt(rel.getPos()); if (rel.getPos().distanceTo(P.pos) > 40) keys.add('KeyW'); else if (g.tether.target === rel) edge('KeyQ'); }
        else if ((text === 'Get to the Mule' || text.startsWith('Board')) && g.tether.anchor) { aimAt(g.tether.anchor.getPoint()); edge('KeyF'); }
        else if (tgt) {
          const it = [...g.interact.items].find(it => { const ip = it.getPos ? it.getPos() : it.pos; return ip && ip.distanceTo(P.pos) < 3.2 && (!window.__botSkip || !window.__botSkip.test(typeof it.label === 'function' ? it.label() : it.label)); });
          if (it) { B.log.push(`  use: ${typeof it.label === 'function' ? it.label() : it.label}`); it.onUse(it); if (it.once) g.interact.remove(it); }
          else {
            const d = tgt.clone().sub(P.pos); d.y = 0;
            if (d.length() > 1.2) { g.camera.yaw = Math.atan2(d.x, d.z); g.camera.pitch = 0.1; keys.add('KeyW'); if (d.length() > 6) keys.add('ShiftLeft'); }
            if (B.lastP && B.lastP.distanceTo(P.pos) < 0.08 && d.length() > 1.5) B.stillT += 0.1; else B.stillT = 0;
            // progress toward the target, not just movement: jumping on the spot is still stuck
            const dl = d.length(); if (!B.tgtKey || B.tgtKey !== tgt.toArray().map(v => v.toFixed(0)).join()) { B.tgtKey = tgt.toArray().map(v => v.toFixed(0)).join(); B.best = dl; B.bestT = g.time; }
            if (dl < B.best - 0.5) { B.best = dl; B.bestT = g.time; }
            if (g.time - B.bestT > 6 && dl > 2) { B.stuck++; B.log.push(`  STUCK (no progress) at ${P.pos.toArray().map(v => v.toFixed(1))} heading for ${tgt.toArray().map(v => v.toFixed(1))} (sidestep)`); const side = new V(-d.z, 0, d.x).normalize().multiplyScalar(B.stuck % 2 ? 5 : -5); P.teleport(P.pos.clone().add(side).add(new V(0, 0.5, 0)), P.yaw); B.bestT = g.time; }
            if (B.stillT > 1.2 && P.state === 'ground') keys.add('Space');
            if (B.stillT > 8) { B.stuck++; B.log.push(`  STUCK at ${P.pos.toArray().map(v => v.toFixed(1))} heading for ${tgt.toArray().map(v => v.toFixed(1))} (hopped)`); P.teleport(P.pos.clone().add(d.normalize().multiplyScalar(4)).add(new V(0, 1.5, 0)), P.yaw); B.stillT = 0; }
          }
        }
      }
      B.lastP = P.pos.clone();
      g.advance(0.1, 1 / 30, false);
      const sig = `${g.state.checkpoint} | ${text}`;
      if (Math.floor(g.time / 60) !== Math.floor((g.time - 0.1) / 60)) B.log.push(`  .. at ${P.pos.toArray().map(v => v.toFixed(1))} tgt ${tgt ? tgt.toArray().map(v => v.toFixed(1)) : '-'} state ${P.state}`);
      if (sig !== B.last) { B.log.push(`t=${g.time.toFixed(0).padStart(4)}  ${sig}`); B.last = sig; B.changed = true; }
    }
    const l = B.log; B.log = [];
    return { log: l, cp: g.state.checkpoint, t: g.time, changed: B.changed && !(B.changed = false), cut: g.director.active };
  };
}, { choice: opt('choice', null), film });
let n = 0, done = false;
while (!done) {
  const r = await page.evaluate(() => __bot.step(40));
  r.log.forEach(l => console.log(l));
  if (shots && (film || (r.changed && !r.cut))) { await page.evaluate(() => __game.advance(0.04, 1 / 30, true)); await page.screenshot({ path: path.join(out, `${String(n++).padStart(2, '0')}.png`) }); }
  if ((stop && r.cp === stop) || r.t > secs || (Date.now() - T0) / 1000 > secs * 2) done = true;
}
const sum = await page.evaluate(() => ({ deaths: __bot.deaths, stuck: __bot.stuck, cp: __game.state.checkpoint, t: __game.time.toFixed(0) }));
console.log(`\nreached ${sum.cp} at game t=${sum.t}s · deaths ${sum.deaths} · stuck ${sum.stuck} · errors ${errs.length} · boot ${boot}s · total ${((Date.now() - T0) / 1000).toFixed(0)}s`);
errs.slice(0, 5).forEach(e => console.log('  ERR', e.slice(0, 300)));
await b.close();
if (shots) { const { execFileSync } = await import('node:child_process'); try { execFileSync('python3', ['-c', `
import glob,sys
from PIL import Image
fs=sorted(glob.glob(sys.argv[1]+'/[0-9]*.png')); ims=[Image.open(f).resize((480,270)) for f in fs]; C=4
if ims:
    g=Image.new('RGB',(480*C,270*((len(ims)+C-1)//C)))
    for i,im in enumerate(ims): g.paste(im,((i%C)*480,(i//C)*270))
    g.save(sys.argv[1]+'/sheet.png')`, out]); console.log('sheet:', out + '/sheet.png'); } catch (e) { console.log('no sheet', e.message); } }
