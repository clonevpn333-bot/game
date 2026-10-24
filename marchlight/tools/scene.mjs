// Quick cutscene check: plays one story beat in real game time and writes ONE contact sheet.
//   node tools/scene.mjs <beat> [--secs 20] [--frames 12] [--use "Talk to Bram"]... [--out sheet.png]
// --use triggers an interaction once it exists (in order); choices pick the first option.
// Prints one line per frame: time, cutscene on/off, Rook's pose, nearby cast poses.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2), beat = args[0] || 'wake';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const uses = args.flatMap((a, i) => a === '--use' ? [args[i + 1]] : []);
const secs = +opt('secs', 20), frames = +opt('frames', 12), out = path.resolve(opt('out', `scene_${beat}.png`));
const W = 640, H = 360, tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-'));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', e => console.log('pageerror:', e.message));
await p.goto(`http://localhost:8080/index.html?beat=${beat}`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 300000 });
await p.evaluate(() => { __game.autoChoose = (o, pick) => setTimeout(() => pick(0), 50); });
const log = [], shots = [];
const step = async (s) => { await p.evaluate((s) => __game.advance(s, 1 / 30, false), s); await p.waitForTimeout(15); };
let t = 0, next = 0, ui = 0;
while (t < secs) {
  if (ui < uses.length) { const r = await p.evaluate((label) => { const it = [...__game.interact.items].find(i => (typeof i.label === 'function' ? i.label() : i.label).includes(label)); if (!it) return false; const g = __game, P = g.player, ip = it.getPos ? it.getPos() : it.pos; if (ip) { const d = P.pos.clone().sub(ip).setY(0); if (d.length() > 1.8) { d.setLength(1.5); const to = ip.clone().add(d); to.y = P.pos.y; P.teleport(to, Math.atan2(-d.x, -d.z)); g.camera.snapBehind(Math.atan2(-d.x, -d.z), 0.1); } } it.onUse(it); if (it.once) __game.interact.remove(it); return true; }, uses[ui]); if (r) ui++; }
  if (t >= next) {
    const info = await p.evaluate(() => {
      const g = __game, P = g.player; g.engine.render(1 / 30);
      const cast = Object.entries(g.cast).filter(([, a]) => !a.hidden && a.pos.distanceTo(P.pos) < 12).map(([n, a]) => `${n}:${a.anim.mode}${a.anim.activity ? '/' + a.anim.activity : ''}`).join(' ');
      return `${g.director.active ? 'CUT' : 'play'} rook:${P.anim.mode}${P.anim.activity ? '/' + P.anim.activity : ''}${P.anim.mode === 'getUp' ? ' u=' + P.anim.modeParam.toFixed(2) : ''} ${cast}`;
    });
    const f = path.join(tmp, `${shots.length}.jpg`); await p.screenshot({ path: f, type: 'jpeg', quality: 70 });
    shots.push([f, `t=${t.toFixed(1)} ${info}`]); log.push(`t=${t.toFixed(1)}  ${info}`); next += secs / frames;
  }
  await step(0.25); t += 0.25;
}
await b.close();
fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify(shots));
execFileSync('python3', ['-c', `
import json,sys
from PIL import Image, ImageDraw
shots=json.load(open(sys.argv[1])); C=4; w,h=480,270
g=Image.new('RGB',(w*C,h*((len(shots)+C-1)//C)),(20,20,20))
for i,(f,label) in enumerate(shots):
    im=Image.open(f).resize((w,h)); d=ImageDraw.Draw(im); d.rectangle([0,0,w,13],fill=(0,0,0)); d.text((3,1),label[:80],fill=(255,230,0)); g.paste(im,((i%C)*w,(i//C)*h))
g.save(sys.argv[2])`, path.join(tmp, 'list.json'), out]);
console.log(log.join('\n')); console.log('sheet:', out);
