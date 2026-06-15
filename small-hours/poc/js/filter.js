'use strict';
/* =============================================================================
   SMALL HOURS — Degraded-Media Filter (browser sibling of
   ../../tech/shaders/SmallHours_PostProcess.hlsl)

   Scenes draw CRISP into an offscreen "scene" canvas (VW x VH). FILTER.render()
   composites that to the visible canvas with the camcorder/VHS treatment:
   internal-res downscale, chromatic aberration (channel split), scanlines,
   grain, green grade, vignette, head-switch noise band, tracking tears, and the
   diegetic REC/timecode HUD bound to the REAL system clock.

   The most important trick: turning the filter OFF for ~0.4s (cleanBlink) is the
   scariest beat in the kit — the mask slips and you see the thing clearly.
   ============================================================================= */
const VW = 960, VH = 540;          // shared internal resolution (declared once)

const FILTER = (() => {
    const PIX = 3;                  // downscale factor for "tape resolution"
    let noiseTiles = [], scan = null;
    let pix, pixCtx, pixFull, pixFullCtx, ch, chCtx;

    function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    function makeNoise(w, h) {
        const c = mk(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
        }
        x.putImageData(img, 0, 0); return c;
    }

    function makeScan(w, h) {
        const c = mk(w, h), x = c.getContext('2d');
        x.fillStyle = 'rgba(0,0,0,0.34)';
        for (let y = 0; y < h; y += 2) x.fillRect(0, y, w, 1);
        return c;
    }

    function init() {
        noiseTiles = []; for (let i = 0; i < 6; i++) noiseTiles.push(makeNoise(480, 270));
        scan = makeScan(VW, VH);
        pix = mk(Math.ceil(VW / PIX), Math.ceil(VH / PIX)); pixCtx = pix.getContext('2d');
        pixFull = mk(VW, VH); pixFullCtx = pixFull.getContext('2d');
        ch = mk(VW, VH); chCtx = ch.getContext('2d');
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // Isolate one color channel of `src` (multiply trick) then additively draw it
    // to the destination at a horizontal offset -> chromatic aberration.
    function channel(dctx, src, color, dx) {
        chCtx.globalCompositeOperation = 'source-over';
        chCtx.clearRect(0, 0, VW, VH);
        chCtx.drawImage(src, 0, 0);
        chCtx.globalCompositeOperation = 'multiply';
        chCtx.fillStyle = color; chCtx.fillRect(0, 0, VW, VH);
        chCtx.globalCompositeOperation = 'source-over';
        dctx.globalCompositeOperation = 'lighter';
        dctx.drawImage(ch, dx, 0);
    }

    function render(scene, dctx, p) {
        const mode = p.mode || 'full';
        const deg = Math.max(0, Math.min(1, p.deg == null ? 0.3 : p.deg));
        const t = p.t || 0;

        // ---- CLEAN-FRAME REVEAL: filter off, pristine + a flash ----
        if (p.cleanBlink) {
            dctx.imageSmoothingEnabled = true;
            dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1;
            dctx.clearRect(0, 0, VW, VH); dctx.drawImage(scene, 0, 0, VW, VH);
            if (p.flash) { dctx.globalAlpha = p.flash; dctx.fillStyle = '#fff'; dctx.fillRect(0, 0, VW, VH); dctx.globalAlpha = 1; }
            hud(dctx, t, deg);
            return;
        }

        dctx.globalCompositeOperation = 'source-over';
        dctx.globalAlpha = 1;
        dctx.fillStyle = '#000'; dctx.fillRect(0, 0, VW, VH);

        // ---- BASE + CHROMATIC ABERRATION ----
        if (mode === 'full') {
            // downscale (smooth) then upscale (crisp) -> chunky tape resolution
            pixCtx.imageSmoothingEnabled = true;
            pixCtx.clearRect(0, 0, pix.width, pix.height);
            pixCtx.drawImage(scene, 0, 0, pix.width, pix.height);
            pixFullCtx.imageSmoothingEnabled = false;
            pixFullCtx.clearRect(0, 0, VW, VH);
            pixFullCtx.drawImage(pix, 0, 0, VW, VH);

            const ab = 1.2 + 7 * deg;
            channel(dctx, pixFull, '#00ff00', 0);
            channel(dctx, pixFull, '#ff0000', ab);
            channel(dctx, pixFull, '#0000ff', -ab);
        } else {
            dctx.imageSmoothingEnabled = true;
            dctx.drawImage(scene, 0, 0, VW, VH);
        }
        dctx.globalCompositeOperation = 'source-over';

        // ---- GREEN GRADE (multiply toward sickly green, crush a touch) ----
        dctx.globalCompositeOperation = 'multiply';
        dctx.globalAlpha = 0.30 + 0.15 * deg;
        dctx.fillStyle = 'rgb(206,228,206)';
        dctx.fillRect(0, 0, VW, VH);
        dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1;

        // ---- SCANLINES ----
        dctx.globalAlpha = 0.6 + 0.4 * deg;
        dctx.drawImage(scan, 0, 0);
        dctx.globalAlpha = 1;

        // ---- GRAIN (overlay) ----
        dctx.globalCompositeOperation = 'overlay';
        dctx.globalAlpha = 0.10 + 0.22 * deg;
        dctx.imageSmoothingEnabled = true;
        dctx.drawImage(noiseTiles[(Math.random() * noiseTiles.length) | 0], 0, 0, VW, VH);
        dctx.globalCompositeOperation = 'source-over'; dctx.globalAlpha = 1;

        // ---- TRACKING TEAR (rare; more likely at high dread) ----
        if (Math.random() < 0.02 + 0.10 * deg) {
            const y = (Math.random() * VH) | 0, h = 4 + (Math.random() * 18 * (0.5 + deg)) | 0;
            const off = (Math.random() - 0.5) * 60 * (0.4 + deg);
            dctx.drawImage(mode === 'full' ? pixFull : scene, 0, y, VW, h, off, y, VW, h);
        }

        // ---- VIGNETTE ----
        const g = dctx.createRadialGradient(VW / 2, VH / 2, VH * 0.28, VW / 2, VH / 2, VH * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,' + (0.55 + 0.35 * deg).toFixed(2) + ')');
        dctx.fillStyle = g; dctx.fillRect(0, 0, VW, VH);

        // ---- HEAD-SWITCHING NOISE BAND (bottom ~6%) ----
        const bandH = VH * (0.05 + 0.015 * Math.sin(t * 5));
        dctx.globalAlpha = 0.65 + 0.25 * deg;
        dctx.drawImage(noiseTiles[(Math.random() * noiseTiles.length) | 0],
            0, 0, 480, 30, (Math.random() - 0.5) * 20, VH - bandH, VW, bandH);
        dctx.globalAlpha = 1;

        hud(dctx, t, deg);
    }

    // Diegetic HUD: REC + blinking dot, REAL-clock timecode, SP, battery.
    function hud(dctx, t, deg) {
        dctx.globalCompositeOperation = 'source-over';
        dctx.font = '18px "Courier New", monospace';
        dctx.textBaseline = 'top';

        // REC (top-left), dot blinks ~1Hz
        if ((t % 1) < 0.6) { dctx.fillStyle = '#ff2b2b'; dctx.beginPath(); dctx.arc(34, 33, 7, 0, 7); dctx.fill(); }
        dctx.fillStyle = 'rgba(235,235,235,0.85)';
        dctx.fillText('REC', 48, 24);

        // Real-clock timecode (top-right)
        const d = new Date();
        const tc = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        dctx.textAlign = 'right';
        dctx.fillText(tc, VW - 24, 24);
        dctx.font = '13px "Courier New", monospace';
        dctx.fillStyle = 'rgba(235,235,235,0.6)';
        dctx.fillText('SP   ' + ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()] +
            ' ' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()), VW - 24, 48);
        dctx.textAlign = 'left';

        // Battery (bottom-left, above the noise band)
        dctx.strokeStyle = 'rgba(235,235,235,0.5)'; dctx.lineWidth = 2;
        dctx.strokeRect(28, VH - 52, 34, 16); dctx.fillStyle = 'rgba(235,235,235,0.5)';
        dctx.fillRect(62, VH - 48, 3, 8);
        dctx.fillRect(31, VH - 49, 22 * (0.35 + 0.25 * Math.sin(t * 0.3)), 10); // jittery low charge
    }

    return { init, render, VW, VH };
})();
