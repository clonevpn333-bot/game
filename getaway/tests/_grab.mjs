// node grab.mjs "<query>" script.js out.png  — runs script (must end by rendering), grabs the canvas via toDataURL (no page.screenshot)
import { createRequire } from 'module'; import fs from 'fs'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, q, file, out] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 200)); });
await p.goto('http://localhost:8080/index.html' + q); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const r = await p.evaluate(fs.readFileSync(file, 'utf8') + `.then((res) => [res, document.querySelector('canvas').toDataURL('image/png')])`).catch((e) => ['EVAL ' + e.message, null]);
if (r[1]) fs.writeFileSync(out, Buffer.from(r[1].split(',')[1], 'base64')); console.log(r[0]); console.log(errs.slice(0, 6).join('\n') || 'no errors'); await b.close();
