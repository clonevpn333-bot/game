'use strict';
/* Screenshot the two new levels (See Saw + Roll Out): step the sim so the field
   is mid-course, then frame each from a couple of telling angles. */
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

const STEP = `(frames) => {
    const { Game, Input } = window.__BR;
    const r0 = Game.show && Game.show.round;
    if (r0 && r0.phase === 'intro') { r0.phase = 'go'; r0.live = true; r0.controllable = true; r0.phaseT = 0; }
    for (let i = 0; i < frames; i++) {
        const r = Game.show && Game.show.round; if (!r || r.done) break;
        const p = r.player;
        if (r.live && p) {
            r.thinkFn(p, r, 1 / 60);
            const ai = p.ai; Input.keys = {}; Input._justPressed = {};
            if (ai.my < -0.3) Input.keys.ArrowUp = 1; else if (ai.my > 0.3) Input.keys.ArrowDown = 1;
            if (ai.mx < -0.3) Input.keys.ArrowLeft = 1; else if (ai.mx > 0.3) Input.keys.ArrowRight = 1;
            if (ai.jump) Input._justPressed.Space = 1; if (ai.dive) Input._justPressed.ShiftLeft = 1;
        } else { Input.keys = {}; Input._justPressed = {}; }
        r.update(1 / 60);
    }
}`;

const JOBS = {
    see_saw: { frames: 760, views: {
        over:  { pos: [640, 1900, 2400], look: [620, 0, 1300] },
        se34:  { pos: [1500, 1150, 2360], look: [620, 120, 1500] },
        chase: { pos: [640, 520, 2120], look: [640, 60, 1500] },
    }},
    roll_out: { frames: 600, views: {
        se34: { pos: [1180, 720, 1180], look: [600, 150, 640] },
        side: { pos: [640, 560, 1480], look: [640, 150, 640] },
        end:  { pos: [1500, 470, 660], look: [400, 150, 650] },
    }},
};

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
    await wait(500);

    for (const [id, job] of Object.entries(JOBS)) {
        await page.evaluate((rid) => {
            const { Game, SHOW } = window.__BR;
            const def = SHOW.find(d => d.id === rid);
            Game.toMenu(); Game.startShow();
            Game.show.seq = [Object.assign({}, def)];
            Game.loadRound(0);
        }, id);
        await page.waitForFunction(() => {
            const g = window.__BR.Game;
            return g.screen === 'playing' && g.show && g.show.round && g.show.round.phase === 'go';
        }, { timeout: 60000, polling: 100 }).catch(() => {});
        await page.evaluate(STEP, job.frames);
        const info = await page.evaluate(() => {
            const sc = window.__BR.Engine.scene;
            for (const n of ['clouds', 'mountains', 'hills', 'blimps']) { const o = sc.getObjectByName(n); if (o) o.visible = true; }
            const r = window.__BR.Game.show.round;
            const live = r.beans.filter(b => !b.falling && !b.eliminated && !b.exited).length;
            return { id: r.def.id, live, fin: r.beans.filter(b => b.finished).length, t: r.elapsed.toFixed(1) };
        });
        console.log(id, JSON.stringify(info));
        for (const [tag, v] of Object.entries(job.views)) {
            await page.evaluate((vv) => {
                const { Engine, THREE } = window.__BR;
                Engine._dbgCam = { pos: new THREE.Vector3(...vv.pos), look: new THREE.Vector3(...vv.look) };
            }, v);
            await wait(420);
            await page.screenshot({ path: path.join(SHOTS, `${id}-${tag}.png`) });
        }
        await page.evaluate(() => { window.__BR.Engine._dbgCam = null; });
    }
    console.log('ERRORS:', errors.length ? errors.slice(0, 6).join('\n  ') : 'none');
    await browser.close();
    server.close();
})().catch(e => { console.error('FAILED:', e.message); server.close(); process.exit(1); });
