// Beauty-shot helper: node tools/shot.mjs <floor> <cp> <stepSeconds> <out.png> [camJS]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [floor = '1', cp = '0', step = '2', out = 'shot.png', camJS = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.addInitScript((q) => { try { const k = 'floor99.save.v1'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.settings = { ...(d.settings || {}), quality: q, qualityPicked: true, voice: false }; localStorage.setItem(k, JSON.stringify(d)); } catch (e) {} }, process.env.Q || 'high');
await page.goto(`http://localhost:${process.env.PORT || 8099}/?autostart&floor=${floor}&cp=${cp}`);
await page.waitForFunction(() => window.__floor99 && window.__floor99.game, null, { timeout: 60000 });
await page.evaluate(([s, js]) => { const A = window.__floor99; A.frozen = true; A.debugStep(+s); if (js) new Function('A', 'g', js)(A, A.game); A.debugStep(0.05); }, [step, camJS]);
await page.evaluate(() => { document.getElementById('card').classList.remove('active'); document.getElementById('clickToResume').classList.remove('on'); const fx = window.__floor99.renderer.fx; fx.uFlash.value = 0; fx.uAberration.value = 0; if (!window.__keepLetterbox) fx.uLetterbox.value = 0; window.__floor99.debugRender(); });
await page.screenshot({ path: out, timeout: 120000 });
await browser.close();
