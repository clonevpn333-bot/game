'use strict';
/* Bespoke Slime-Climb screenshotter: loads the course, lets the beans climb a
   while, then frames the switchback from several 3/4 angles so we can SEE that
   it (a) stacks upward and (b) marches north — not a tower, not a straight ramp. */
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const threePath = path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.js');
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace(/https:\/\/unpkg\.com\/three@[^"']+/, '/three.module.js');
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
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle',
               '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror:' + e.message));
    await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__BR && window.__BR.Engine && window.__BR.Engine.renderer, { timeout: 30000 }).catch(() => {});
    await wait(600);

    await page.evaluate(() => {
        const { Game, SHOW } = window.__BR;
        const def = SHOW.find(d => d.id === 'slime_climb');
        Game.toMenu(); Game.startShow();
        Game.show.seq = [Object.assign({}, def)];
        Game.loadRound(0);
    });
    await page.waitForFunction(() => {
        const g = window.__BR.Game;
        return g.screen === 'playing' && g.show && g.show.round && g.show.round.phase === 'go';
    }, { timeout: 60000, polling: 100 }).catch(() => {});

    // drive the sim forward manually (headless rAF is throttled) so the beans
    // actually climb and spread across the legs before we frame them.
    await page.evaluate((frames) => {
        const { Game, Input } = window.__BR;
        const r = Game.show.round; const p = r.player;
        for (let i = 0; i < frames; i++) {
            if (r.done) break;
            if (r.live) {
                r.thinkFn(p, r, 1 / 60);
                const ai = p.ai; Input.keys = {}; Input._justPressed = {};
                if (ai.my < -0.3) Input.keys.ArrowUp = 1; else if (ai.my > 0.3) Input.keys.ArrowDown = 1;
                if (ai.mx < -0.3) Input.keys.ArrowLeft = 1; else if (ai.mx > 0.3) Input.keys.ArrowRight = 1;
                if (ai.jump) Input._justPressed.Space = 1; if (ai.dive) Input._justPressed.ShiftLeft = 1;
            } else { Input.keys = {}; Input._justPressed = {}; }
            r.update(1 / 60);
        }
    }, 820);
    await wait(200);

    // restore the backdrop, report where the pack is
    const info = await page.evaluate(() => {
        const sc = window.__BR.Engine.scene;
        for (const n of ['clouds', 'mountains', 'hills', 'blimps']) { const o = sc.getObjectByName(n); if (o) o.visible = true; }
        const r = window.__BR.Game.show.round;
        const zs = r.beans.filter(b => !b.falling && !b.eliminated).map(b => Math.round(b.z)).sort((a, b) => a - b);
        return { live: zs.length, minZ: zs[0], maxZ: zs[zs.length - 1], slimeZ: Math.round(r.slimeZ), elapsed: r.elapsed.toFixed(1) };
    });
    console.log('pack:', JSON.stringify(info));

    // a set of framings (world coords: worldX=simX, worldY=height, worldZ=simY)
    const views = {
        se34:  { pos: [1560, 1500, 2680], look: [620, 250, 1250] },   // 3/4 from the south-east, high
        side:  { pos: [640, 760, 3160],  look: [640, 360, 1150] },    // straight up-course from the south
        east:  { pos: [1860, 1020, 1500], look: [620, 320, 1380] },   // side-on from the east (see the tiers)
        high:  { pos: [980, 2050, 2550], look: [620, 120, 1250] },    // high 3/4, near top-down
    };
    for (const [tag, v] of Object.entries(views)) {
        await page.evaluate((vv) => {
            const { Engine, THREE } = window.__BR;
            Engine._dbgCam = {
                pos: new THREE.Vector3(vv.pos[0], vv.pos[1], vv.pos[2]),
                look: new THREE.Vector3(vv.look[0], vv.look[1], vv.look[2]),
            };
        }, v);
        await wait(450);
        await page.screenshot({ path: path.join(SHOTS, `climb-${tag}.png`) });
        console.log('shot', tag);
    }
    // player chase: drop the debug cam, put the player on a mid leg, let the
    // switchback heading-camera frame them, and shoot.
    await page.evaluate(() => {
        const { Engine, Game } = window.__BR;
        Engine._dbgCam = null;
        const r = Game.show.round, p = r.player;
        p.x = 640; p.y = 1420; p.z = 330; p.vx = 120; p.vy = 0; p.facing = 0;
        Engine._camSnap = true;
    });
    for (let i = 0; i < 90; i++) {
        await page.evaluate(() => { const { Game } = window.__BR; const r = Game.show.round; r.update(1 / 60); });
        await wait(8);
    }
    await page.screenshot({ path: path.join(SHOTS, 'climb-chase.png') });
    console.log('shot chase');
    console.log('ERRORS:', errors.length ? errors.slice(0, 6).join('\n  ') : 'none');
    await browser.close();
    server.close();
})().catch(e => { console.error('FAILED:', e.message); server.close(); process.exit(1); });
