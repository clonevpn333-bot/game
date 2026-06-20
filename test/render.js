'use strict';
/* Headless render harness: serves index.html with a LOCAL three.module.js,
   launches Chromium with software WebGL, and screenshots key screens so we
   can actually see what the game looks like. Usage: node test/render.js */
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
    await wait(1800);
    await page.screenshot({ path: path.join(SHOTS, '1-menu.png') });
    const menuInspect = await page.evaluate(() => {
        const box = window.__BR.UI.els.lobbyBean;
        const cv = box && box.querySelector('canvas');
        const r = box && box.getBoundingClientRect();
        return { boxExists: !!box, boxRect: r && { w: r.width, h: r.height, x: r.x, y: r.y },
            canvasInBox: !!cv, canvasSize: cv && { w: cv.width, h: cv.height, cw: cv.clientWidth, ch: cv.clientHeight },
            previewBeanExists: !!(window.__BR.Engine.preview && window.__BR.Engine.preview.bean),
            previewRendererCanvasParent: window.__BR.Engine.preview && window.__BR.Engine.preview.renderer.domElement.parentElement &&
                window.__BR.Engine.preview.renderer.domElement.parentElement.className };
    });
    console.log('MENU INSPECT:', JSON.stringify(menuInspect));

    await page.evaluate(() => { window.__BR.Game.screen = 'customize'; });
    await wait(1500);
    await page.screenshot({ path: path.join(SHOTS, '2-customize.png') });

    // FALL PASS screen (give some fame first so tiers are claimable)
    await page.evaluate(() => { window.__BR.Save.data.fame = 1500; window.__BR.Game.toFallPass(); });
    await wait(900);
    await page.screenshot({ path: path.join(SHOTS, '6-fallpass.png') });

    // start a show — capture the round-select REEL during the loading phase
    await page.evaluate(() => { window.__BR.Game.toMenu(); window.__BR.Game.startShow(); });
    await page.waitForFunction(() => window.__BR.Game.screen === 'loading', { timeout: 30000, polling: 50 }).catch(() => {});
    await wait(700);
    await page.screenshot({ path: path.join(SHOTS, '7-reel.png') });

    // then WAIT (wall-clock) until the round is actually live ('go')
    await page.waitForFunction(() => {
        const g = window.__BR.Game;
        return g.screen === 'playing' && g.show && g.show.round && g.show.round.phase === 'go';
    }, { timeout: 90000, polling: 200 }).catch(() => {});
    await wait(800);
    await page.screenshot({ path: path.join(SHOTS, '3-play.png') });
    const hudInspect = await page.evaluate(() => {
        const c = window.__BR.UI.els.hudCount, n = window.__BR.UI.els.hudName, hud = window.__BR.UI.els.hud;
        const vis = el => el && getComputedStyle(el).display;
        return { hudDisplay: vis(hud), countText: c && c.textContent, nameText: n && n.textContent,
            phase: window.__BR.Game.show.round.phase, round: window.__BR.Game.show.round.def.name };
    });
    console.log('HUD INSPECT:', JSON.stringify(hudInspect));
    await wait(2500);
    await page.screenshot({ path: path.join(SHOTS, '4-play2.png') });

    await page.evaluate(() => { window.__BR.Game.toMenu(); window.__BR.Game.screen = 'shop'; });
    await wait(900);
    await page.screenshot({ path: path.join(SHOTS, '5-shop.png') });

    const info = await page.evaluate(() => ({
        screen: window.__BR.Game.screen,
        seq: window.__BR.Game.show && window.__BR.Game.show.seq.map(d => d.name),
    }));
    console.log('STATE:', JSON.stringify(info));
    console.log('ERRORS:', errors.length ? errors.slice(0, 8).join('\n  ') : 'none');
    await browser.close();
    server.close();
})().catch(e => { console.error('RENDER FAILED:', e.message); server.close(); process.exit(1); });
