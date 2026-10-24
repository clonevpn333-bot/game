// Character/animation sheet from the rig viewer: one image of several poses, in one browser.
//   node tools/poses.mjs [--out poses.png] ["query" "query" ...]   (queries are dev/rig.html params)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2); const oi = args.indexOf('--out');
const out = path.resolve(oi >= 0 ? args[oi + 1] : 'poses.png');
const side = 'rot=1.5708&cam=0,1.0,4.6,0,0.85,0';
const qs = args.filter((a, i) => a !== '--out' && i !== oi + 1).length ? args.filter((a, i) => a !== '--out' && i !== oi + 1) : [
  'cam=0,1.3,6.5,0,0.85,0', 'one=1&face=1', 'one=1&face=1&emo=happy&talk=1', `one=1&speed=1.5&${side}`, `one=1&speed=5.5&${side}`,
  `one=1&mode=sit&${side}`, 'one=1&gu=0&cam=-0.3,1.6,0.3,-0.6,0.8,-1.08', `one=1&gu=2.5&chair=1&${side}`, 'one=1&act=stretch', 'one=1&aim=pistol&rot=0.6',
];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 400, height: 400 } });
p.on('pageerror', e => console.log('pageerror:', e.message));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'poses-')), shots = [];
for (const [i, q] of qs.entries()) {
  await p.goto('http://localhost:8080/dev/rig.html?' + q); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await p.evaluate(() => window.__step(1.3));
  const f = path.join(tmp, i + '.jpg'); await p.screenshot({ path: f, type: 'jpeg', quality: 75 }); shots.push([f, q]);
}
await b.close();
fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify(shots));
execFileSync('python3', ['-c', `
import json,sys
from PIL import Image, ImageDraw
shots=json.load(open(sys.argv[1])); C=5; w=h=280
g=Image.new('RGB',(w*C,h*((len(shots)+C-1)//C)),(20,20,20))
for i,(f,label) in enumerate(shots):
    im=Image.open(f).resize((w,h)); d=ImageDraw.Draw(im); d.rectangle([0,0,w,12],fill=(0,0,0)); d.text((2,0),label[:48],fill=(255,230,0)); g.paste(im,((i%C)*w,(i//C)*h))
g.save(sys.argv[2])`, path.join(tmp, 'list.json'), out]);
console.log('sheet:', out);
