'use strict';
/* Flexible per-course screenshot tool for the map overhaul.
   Loads any course by id, waits until it is live, and captures:
     shots/shoot-<id>-chase.png   the player's 3rd-person play camera
     shots/shoot-<id>-over.png    an elevated overview down the whole course
   Optional extra overview centred on a sim-y:  --at=<y>  (and --span=<n>)

   Usage:
     node test/shoot.js                       # a default set of races
     node test/shoot.js door_dash whirlygig   # specific course ids
     node test/shoot.js slime_climb --at=3400 # section overview near y=3400
*/
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

const args = process.argv.slice(2);
const opts = {};
const ids = [];
for (const a of args) {
    if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); opts[k] = v === undefined ? true : v; }
    else ids.push(a);
}
const COURSES = ids.length ? ids : ['door_dash', 'gate_crash', 'whirlygig', 'dizzy_heights', 'fruit_chute', 'hit_parade', 'knight_fever', 'big_fans', 'slime_climb'];

(async () => {
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;
    const url = `http://localhost:${port}/index.html`;
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle',
               '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror:' + e.message));
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__BR && window.__BR.Engine && window.__BR.Engine.renderer, { timeout: 30000 }).catch(() => {});
    await wait(800);

    const loadCourse = async (rid) => {
        const ok = await page.evaluate((id) => {
            const { Game, SHOW } = window.__BR;
            const def = SHOW.find(d => d.id === id);
            if (!def) return false;
            Game.toMenu(); Game.startShow();
            Game.show.seq = [Object.assign({}, def)];
            Game.loadRound(0);
            return true;
        }, rid);
        if (!ok) { console.log('  ! unknown course', rid); return false; }
        await page.waitForFunction(() => {
            const g = window.__BR.Game;
            return g.screen === 'playing' && g.show && g.show.round && g.show.round.phase === 'go';
        }, { timeout: 90000, polling: 150 }).catch(() => {});
        return true;
    };

    for (const id of COURSES) {
        console.log('shooting', id);

        // --intro: capture the cinematic map-preview flyover (3 frames)
        if (opts.intro) {
            const ok = await page.evaluate((rid) => {
                const { Game, SHOW } = window.__BR;
                const def = SHOW.find(d => d.id === rid); if (!def) return false;
                Game.toMenu(); Game.startShow();
                Game.show.seq = [Object.assign({}, def)]; Game.loadRound(0);
                window.__BR.Engine._dbgCam = null;
                const sc = window.__BR.Engine.scene;
                for (const n of ['clouds', 'mountains', 'hills', 'blimps']) { const o = sc.getObjectByName(n); if (o) o.visible = true; }
                return true;
            }, id);
            if (!ok) { console.log('  ! unknown', id); continue; }
            // wait until the course is loaded and the intro flyover is running
            await page.waitForFunction(() => {
                const g = window.__BR.Game;
                return g.screen === 'playing' && g.show && g.show.round &&
                    (g.show.round.phase === 'intro' || g.show.round.phase === 'go');
            }, { timeout: 30000, polling: 25 }).catch(() => {});
            for (const [off, tag] of [[150, 'a'], [800, 'b'], [800, 'c']]) {
                await wait(off);
                await page.screenshot({ path: path.join(SHOTS, `intro-${id}-${tag}.png`) });
            }
            continue;
        }

        if (!(await loadCourse(id))) continue;
        // clear any debug cam, restore backdrop, optionally teleport the player
        // to a sim-y so the chase cam frames that spot, let it settle, shoot.
        await page.evaluate((o) => {
            window.__BR.Engine._dbgCam = null;
            const sc = window.__BR.Engine.scene;
            for (const n of ['clouds', 'mountains', 'hills', 'blimps']) {
                const ob = sc.getObjectByName(n); if (ob) ob.visible = true;
            }
            if (o.player != null) {
                const r = window.__BR.Game.show.round;
                r.player.x = (r.minX + r.maxX) / 2; r.player.y = +o.player;
                r.player.vx = r.player.vy = 0;
                window.__BR.Engine._camSnap = true;
            }
        }, opts);
        await wait(1600);
        await page.screenshot({ path: path.join(SHOTS, `shoot-${id}-chase.png`) });

        // elevated overview looking down the whole course (or a section)
        const meta = await page.evaluate((o) => {
            const { Engine, Game, THREE } = window.__BR;
            const r = Game.show.round;
            // hide the sky backdrop so it can't intrude on the top-down view
            const sc = Engine.scene;
            for (const n of ['clouds', 'mountains', 'hills', 'blimps']) {
                const ob = sc.getObjectByName(n); if (ob) ob.visible = false;
            }
            const cx = (r.minX + r.maxX) / 2;
            const atY = o.at != null ? +o.at : (r.finishY + r.maxY) / 2;
            const span = o.span != null ? +o.span : (r.maxY - r.finishY);
            // a near-TOP-DOWN look (high above, barely tilted) so the layout
            // reads clearly and the horizon/backdrop never intrudes.
            const back = atY + span * 0.12;
            const high = Math.max(900, span * 0.85);
            Engine._dbgCam = {
                pos: new THREE.Vector3(cx, high, back),
                look: new THREE.Vector3(cx, 0, atY),
            };
            return { kind: r.kind, minX: r.minX, maxX: r.maxX, minY: r.minY, maxY: r.maxY, finishY: r.finishY };
        }, opts);
        await wait(500);
        await page.screenshot({ path: path.join(SHOTS, `shoot-${id}-over.png`) });
        console.log('  ', JSON.stringify(meta));
    }
    await page.evaluate(() => { window.__BR.Engine._dbgCam = null; });
    console.log('ERRORS:', errors.length ? errors.slice(0, 6).join('\n  ') : 'none');
    await browser.close();
    server.close();
})().catch(e => { console.error('SHOOT FAILED:', e.message); server.close(); process.exit(1); });
