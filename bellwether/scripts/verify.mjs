// Player-flow check on a built file: open from disk, New Game, watch (no skipping), then walk.
import { chromium } from '@playwright/test';
const FILE = process.argv[2];
const OUT = process.env.OUT || '/tmp/claude-0/bw/rel';
const b = await chromium.launch({ ignoreDefaultArgs: ['--mute-audio'], executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
await p.goto('file://' + FILE);
await p.waitForFunction(() => !document.getElementById('boot-msg'), null, { timeout: 300000 });
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/v_title.png`, timeout: 120000 });
await p.click('button[data-a="new"]');
const tc = Date.now();
let n = 0, ctlRun = 0;
for (let i = 0; i < 200; i++) {
  await p.waitForTimeout(4000);
  const s = await p.evaluate(() => {
    const g = window.__THREE_GAME_TEST_HOOKS__.game;
    const vis = (sel) => { const e = document.querySelector(sel); if (!e) return ''; const cs = getComputedStyle(e); return cs.display !== 'none' && +cs.opacity > 0.05 ? e.innerText.replace(/\s+/g, ' ').slice(0, 60) : ''; };
    return { ch: g.chapter?.id, load: vis('.loading'), sub: vis('.subs'), card: vis('.card'), obj: vis('.objective'), fade: +getComputedStyle(document.querySelector('.fade')).opacity, ctl: !!(g.control && !g.cine.active && g.state === 'playing' && g.chapter?.id === 'ch1'), wp: vis('.waypoint'), pos: g.player.pos.toArray().map((v) => +v.toFixed(1)), fps: window.__THREE_GAME_DIAGNOSTICS__.frame };
  });
  if (i % 3 === 0) await p.screenshot({ path: `${OUT}/v${String(n++).padStart(2, '0')}.png`, timeout: 120000 });
  console.log(`${((Date.now() - tc) / 1000).toFixed(0).padStart(4)}s`, JSON.stringify(s));
  ctlRun = s.ctl ? ctlRun + 1 : 0;
  if (ctlRun >= 2) break;
}
const before = await p.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.game.player.pos.toArray());
await p.mouse.click(400, 225);
await p.keyboard.down('d'); await p.waitForTimeout(1500); await p.keyboard.up('d');
await p.keyboard.down('w'); await p.waitForTimeout(10000); await p.keyboard.up('w');
const after = await p.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.game.player.pos.toArray());
await p.screenshot({ path: `${OUT}/v_walked.png`, timeout: 120000 });
console.log('MOVED', Math.hypot(after[0] - before[0], after[2] - before[2]).toFixed(2), 'm', JSON.stringify(after));
console.log('ERROR PANEL', JSON.stringify(await p.evaluate(() => document.getElementById('error-report')?.innerText ?? null)));
console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
await b.close();
