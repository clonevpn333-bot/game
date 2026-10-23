// Filmstrip of the rig viewer: node tools/strip.mjs "<query>" out.png [frames] [interval] [w] [h] [warm]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [query, out, frames = '8', dtS = '0.1', w = '360', h = '520', warm = '2'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://localhost:8080/dev/rig.html?' + query);
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await p.evaluate((s) => window.__step(s), +warm);
const shots = [];
for (let i = 0; i < +frames; i++) {
  await p.evaluate((s) => window.__step(s), i ? +dtS : 0);
  shots.push(await p.screenshot({ type: 'png' }));
}
await b.close();
// stitch with a tiny PNG composer via canvas in a fresh page would be heavy; use python instead
import fs from 'node:fs';
const dir = out.replace(/\.png$/, '_f');
shots.forEach((buf, i) => fs.writeFileSync(`${dir}${i}.png`, buf));
import { execSync } from 'node:child_process';
execSync(`python3 -c "
from PIL import Image
ims=[Image.open('${dir}%d.png'%i) for i in range(${frames})]
g=Image.new('RGB',(ims[0].width*len(ims),ims[0].height))
for i,im in enumerate(ims): g.paste(im,(i*im.width,0))
g.save('${out}')
"`);
console.log('wrote', out);
