/* Presses W and checks whether the climber actually moves. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
p.on('pageerror', e => console.log('ERR', e.message.slice(0, 130)));
await p.goto('http://localhost:4321/games/summit/index.html', { waitUntil: 'load' });
await p.waitForTimeout(10000);
await p.evaluate(`(() => { const a = window.__summit; a.menu.nameInput.value='Ada'; a.menu.serverInput.value=''; a.menu.host(); })()`);
await p.waitForTimeout(8000);
await p.evaluate(`window.__summit.panels.lobby.toggle()`);
for (let i = 0; i < 25; i++) { if (await p.evaluate('window.__summit.net.phase') === 'climb') break; await p.waitForTimeout(800); }
await p.waitForTimeout(3000);
const before = await p.evaluate('({x: +window.__summit.net.pred.x.toFixed(2), z: +window.__summit.net.pred.z.toFixed(2), y: +window.__summit.net.pred.y.toFixed(2)})');
console.log('phase:', await p.evaluate('window.__summit.net.phase'), 'blocking:', await p.evaluate('window.__summit.uiBlocking()'), 'locked:', await p.evaluate('window.__summit.input.locked'));
const t0 = Date.now();
const s0 = await p.evaluate('({seq: window.__summit.net.seq, tick: window.__summit.host?.room?.tick ?? -1, ack: window.__summit.net.lastServerMe ? 1 : 0})');
await p.keyboard.down('KeyW');
await p.waitForTimeout(4000);
await p.keyboard.up('KeyW');
const s1 = await p.evaluate('({seq: window.__summit.net.seq, tick: window.__summit.host?.room?.tick ?? -1})');
const secs = (Date.now() - t0) / 1000;
console.log(`over ${secs.toFixed(1)}s -> client inputs ${s1.seq - s0.seq} (want ${Math.round(secs*30)}), server ticks ${s1.tick - s0.tick} (want ${Math.round(secs*30)})`);
const afterW = await p.evaluate('({x: +window.__summit.net.pred.x.toFixed(2), z: +window.__summit.net.pred.z.toFixed(2), y: +window.__summit.net.pred.y.toFixed(2)})');
await p.keyboard.press('Space');
await p.waitForTimeout(1200);
const afterJump = await p.evaluate('({y: +window.__summit.net.pred.y.toFixed(2), vy: +window.__summit.net.pred.vy.toFixed(2), ground: window.__summit.net.pred.onGround})');
console.log('before  ', JSON.stringify(before));
console.log('after W ', JSON.stringify(afterW), ' moved:', (Math.hypot(afterW.x-before.x, afterW.z-before.z)).toFixed(2), 'm');
console.log('jump    ', JSON.stringify(afterJump));
await b.close();
