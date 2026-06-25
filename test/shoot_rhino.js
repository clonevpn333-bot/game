'use strict';
/* Close portrait of a rhino mid-action to confirm the bespoke inflatable model. */
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const threePath = path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.js');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/https:\/\/unpkg\.com\/three@[^"']+/, '/three.module.js');
const server = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
    if (u === '/three.module.js') { res.writeHead(200, { 'content-type': 'application/javascript' }); return res.end(fs.readFileSync(threePath)); }
    res.writeHead(404); res.end('nf');
});
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__BR && window.__BR.Engine && window.__BR.Engine.renderer, { timeout: 30000 }).catch(() => {});
    await wait(500);
    await page.evaluate(() => { const { Game, SHOW } = window.__BR; const def = SHOW.find(d => d.id === 'stompin_ground'); Game.toMenu(); Game.startShow(); Game.show.seq = [Object.assign({}, def)]; Game.loadRound(0); });
    await page.waitForFunction(() => { const g = window.__BR.Game; return g.screen === 'playing' && g.show && g.show.round && g.show.round.phase === 'go'; }, { timeout: 60000, polling: 100 }).catch(() => {});
    // step until a rhino is telegraphing or charging, then frame it
    const info = await page.evaluate(() => {
        const { Game, Input } = window.__BR; const r = Game.show.round;
        let target = null;
        for (let i = 0; i < 60 * 26; i++) {
            for (const b of r.beans) if (r.live && b.alive && !b.gone && !b.exited) r.thinkFn(b, r, 1 / 60);
            Input.keys = {}; Input._justPressed = {}; r.update(1 / 60);
            const ch = r.obstacles.filter(o => o.kind === 'rhino' && (o.state === 'charge' || o.state === 'telegraph'));
            if (ch.length && i > 60 * 9) { target = ch[0]; break; }
        }
        if (!target) return null;
        return { x: target.x, y: target.y, facing: target.facing, state: target.state };
    });
    if (!info) { console.log('no rhino caught'); } else {
        console.log('rhino', JSON.stringify(info));
        await page.evaluate((rh) => {
            const sc = window.__BR.Engine.scene;
            for (const n of ['clouds', 'mountains', 'hills', 'blimps']) { const o = sc.getObjectByName(n); if (o) o.visible = true; }
            const { Engine, THREE } = window.__BR;
            // camera ~260 units in front-side of the rhino, low, looking at it (world: x=simx, y=h, z=simy)
            const fx = Math.cos(rh.facing), fy = Math.sin(rh.facing);
            const cxp = rh.x + fx * 150 + fy * 180, czp = rh.y + fy * 150 - fx * 180;
            Engine._dbgCam = { pos: new THREE.Vector3(cxp, 150, czp), look: new THREE.Vector3(rh.x, 55, rh.y) };
        }, info);
        await wait(450);
        await page.screenshot({ path: path.join(SHOTS, 'stompin-rhino.png') });
        console.log('shot stompin-rhino');
    }
    await browser.close(); server.close();
})().catch(e => { console.error('FAILED:', e.message); server.close(); process.exit(1); });
