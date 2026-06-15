'use strict';
/* =============================================================================
   SMALL HOURS — POC bootstrap: render loop, input, scene management.
   Pipeline:  scene.draw() -> offscreen (crisp)  ->  FILTER.render() -> display
              (degraded)    ->  scene.drawOverlay() -> display (crisp UI)
   ============================================================================= */
(() => {
    const screen = document.getElementById('screen');
    const dctx = screen.getContext('2d');
    const off = document.createElement('canvas'); off.width = VW; off.height = VH;
    const sctx = off.getContext('2d');

    FILTER.init();

    const GAME = {
        mx: VW / 2, my: VH / 2, t: 0, dt: 0,
        keys: new Set(),
        fxFlash: 0,
        cur: null, curName: null,
        key(code) { return this.keys.has(code); },
        flash(v) { this.fxFlash = Math.max(this.fxFlash, v == null ? 0.8 : v); },
        go(name) {
            this.cur = SCENES[name]; this.curName = name;
            if (this.cur.enter) this.cur.enter();
        }
    };
    window.GAME = GAME;

    // ---- input ----
    function toCanvas(e) {
        const r = screen.getBoundingClientRect();
        GAME.mx = Math.max(0, Math.min(VW, (e.clientX - r.left) / r.width * VW));
        GAME.my = Math.max(0, Math.min(VH, (e.clientY - r.top) / r.height * VH));
    }
    window.addEventListener('mousemove', e => { toCanvas(e); PROFILER.mouse(GAME.mx); });
    window.addEventListener('mousedown', e => {
        toCanvas(e); SOUND.ensure();
        if (GAME.cur && GAME.cur.onClick) GAME.cur.onClick(GAME.mx, GAME.my);
    });
    window.addEventListener('keydown', e => {
        if (e.code === 'Space') e.preventDefault();
        if (e.code === 'KeyM') { SOUND.toggleMute(); return; }
        GAME.keys.add(e.code);
    });
    window.addEventListener('keyup', e => GAME.keys.delete(e.code));
    window.addEventListener('blur', () => GAME.keys.clear());

    // ---- loop ----
    let last = performance.now();
    function frame(now) {
        let dt = (now - last) / 1000; last = now;
        if (dt > 0.05) dt = 0.05;                 // clamp after tab-switch etc.
        GAME.dt = dt; GAME.t += dt;

        const s = GAME.cur;
        if (s) {
            if (s.update) s.update(dt);
            if (s.postUpdate) s.postUpdate(dt);

            // draw atmospheric layer (crisp) into offscreen
            sctx.setTransform(1, 0, 0, 1, 0, 0);
            sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over';
            if (s.draw) s.draw(sctx);

            // degrade -> display
            FILTER.render(off, dctx, {
                mode: s.filterMode || 'full',
                deg: s.deg ? s.deg() : 0.3,
                t: GAME.t,
                cleanBlink: !!s.clean,
                flash: s.flashVal || 0
            });

            // crisp UI overlay
            dctx.setTransform(1, 0, 0, 1, 0, 0);
            dctx.globalAlpha = 1; dctx.globalCompositeOperation = 'source-over';
            if (s.drawOverlay) s.drawOverlay(dctx);
        }

        // global transition flash
        if (GAME.fxFlash > 0.001) {
            dctx.globalAlpha = GAME.fxFlash; dctx.fillStyle = '#f4fff4';
            dctx.fillRect(0, 0, VW, VH); dctx.globalAlpha = 1;
            GAME.fxFlash = Math.max(0, GAME.fxFlash - dt * 2.4);
        }

        requestAnimationFrame(frame);
    }

    GAME.go('boot');
    requestAnimationFrame(frame);
})();
