'use strict';
/**
 * 2048 — sliding tiles with real motion: every tile carries where it came from,
 * so a move animates from the old board to the new one instead of snapping.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown;
    const N = 4, PAD = 14, TILE = 118, W = N * TILE + PAD * (N + 1), H = W + 96;
    const BOARD_Y = 96;

    const COLORS = {
        2: ['#2A2639', '#C6C0D2'], 4: ['#332E45', '#E4DFF0'], 8: ['#7A4A16', '#FFE9C7'],
        16: ['#96540F', '#FFF1D8'], 32: ['#B45B12', '#FFF4E2'], 64: ['#C9531B', '#FFF1E6'],
        128: ['#C08A12', '#FFF8E3'], 256: ['#C99A0E', '#FFFAE8'], 512: ['#D0A80B', '#FFFCEE'],
        1024: ['#D6B60A', '#FFFDF3'], 2048: ['#FFB020', '#1A1206'],
    };
    const colorFor = (v) => COLORS[v] || (v > 2048 ? ['#FF4D3D', '#FFF'] : COLORS[2]);

    const state = { grid: new Int32Array(N * N), score: 0, best: 0, mode: 'title', anim: 0, won: false };
    // Per-tile animation record: value, from cell, to cell, and whether it merged.
    let moving = [];

    const at = (r, c) => state.grid[r * N + c];
    const put = (r, c, v) => { state.grid[r * N + c] = v; };

    function spawn() {
        const free = [];
        for (let i = 0; i < N * N; i++) if (!state.grid[i]) free.push(i);
        if (!free.length) return null;
        const i = free[(Math.random() * free.length) | 0];
        state.grid[i] = Math.random() < 0.9 ? 2 : 4;
        return i;
    }

    function reset() {
        state.grid.fill(0);
        state.score = 0; state.won = false; state.mode = 'playing';
        moving = [];
        spawn(); spawn();
    }

    /** Slide + merge one line; returns the compacted values and the moves made. */
    function slideLine(vals, keys) {
        const out = [], moves = [];
        let write = 0;
        for (let i = 0; i < vals.length; i++) {
            if (!vals[i]) continue;
            if (out.length && out[out.length - 1] === vals[i] && !moves[moves.length - 1].merged) {
                out[out.length - 1] *= 2;
                state.score += out[out.length - 1];
                if (out[out.length - 1] === 2048) state.won = true;
                moves.push({ from: keys[i], to: write - 1, value: vals[i], merged: true });
            } else {
                out.push(vals[i]);
                moves.push({ from: keys[i], to: write, value: vals[i], merged: false });
                write++;
            }
        }
        while (out.length < N) out.push(0);
        return { out, moves };
    }

    function move(dir) {          // 0 up, 1 right, 2 down, 3 left
        const before = Int32Array.from(state.grid);
        const anims = [];
        for (let line = 0; line < N; line++) {
            const vals = [], cells = [];
            for (let i = 0; i < N; i++) {
                const r = dir === 0 ? i : dir === 2 ? N - 1 - i : line;
                const c = dir === 3 ? i : dir === 1 ? N - 1 - i : line;
                vals.push(at(r, c)); cells.push([r, c]);
            }
            const { out, moves } = slideLine(vals, cells.map((_, i) => i));
            for (let i = 0; i < N; i++) {
                const r = dir === 0 ? i : dir === 2 ? N - 1 - i : line;
                const c = dir === 3 ? i : dir === 1 ? N - 1 - i : line;
                put(r, c, out[i]);
            }
            for (const m of moves) anims.push({ from: cells[m.from], to: cells[m.to], value: m.value, merged: m.merged });
        }
        let changed = false;
        for (let i = 0; i < N * N; i++) if (before[i] !== state.grid[i]) { changed = true; break; }
        if (!changed) return false;
        moving = anims;
        state.anim = 1;
        spawn();
        if (state.score > state.best) state.best = state.score;
        persist();
        if (!canMove()) { state.mode = 'dead'; Bridge.score(state.score, 'points'); }
        return true;
    }

    function canMove() {
        for (let i = 0; i < N * N; i++) if (!state.grid[i]) return true;
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                if (c + 1 < N && at(r, c) === at(r, c + 1)) return true;
                if (r + 1 < N && at(r, c) === at(r + 1, c)) return true;
            }
        }
        return false;
    }

    function step(dt) { if (state.anim > 0) state.anim = Math.max(0, state.anim - dt * 7); }

    let canvas, ctx, scaler, loop;
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    function render(alpha, dt) {
        ctx.setTransform(scaler.scale(), 0, 0, scaler.scale(), 0, 0);
        ctx.fillStyle = '#0B0A0F';
        ctx.fillRect(0, 0, W, H);

        ctx.font = '700 30px "Archivo", system-ui, sans-serif';
        ctx.fillStyle = '#FFB020';
        ctx.fillText('2048', PAD, 46);
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#918AA3';
        ctx.fillText('SCORE', W - 168, 30);
        ctx.fillText('BEST', W - 78, 30);
        ctx.font = '700 20px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#F4F1EC';
        ctx.fillText(String(state.score), W - 168, 52);
        ctx.fillText(String(state.best), W - 78, 52);

        ctx.fillStyle = '#15131C';
        roundRect(0, BOARD_Y - PAD, W, W, 16);
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                ctx.fillStyle = '#1E1B29';
                roundRect(PAD + c * TILE + c * 0, BOARD_Y + r * TILE, TILE - PAD, TILE - PAD, 10);
            }
        }

        const t = ease(1 - state.anim);
        if (state.anim > 0 && moving.length) {
            for (const m of moving) {
                const x = (m.from[1] + (m.to[1] - m.from[1]) * t) * TILE + PAD;
                const y = (m.from[0] + (m.to[0] - m.from[0]) * t) * TILE + BOARD_Y;
                drawTile(x, y, m.value, 1);
            }
        } else {
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const v = at(r, c);
                    if (v) drawTile(PAD + c * TILE, BOARD_Y + r * TILE, v, 1);
                }
            }
        }

        if (state.mode !== 'playing') {
            ctx.fillStyle = 'rgba(11,10,15,0.84)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFB020';
            ctx.font = '700 40px "Archivo", system-ui, sans-serif';
            ctx.fillText(state.mode === 'dead' ? 'NO MOVES LEFT' : '2048', W / 2, H / 2 - 16);
            ctx.fillStyle = '#F4F1EC';
            ctx.font = '15px ui-monospace, Menlo, monospace';
            if (state.mode === 'dead') ctx.fillText(`${state.score} points`, W / 2, H / 2 + 16);
            ctx.fillStyle = '#918AA3';
            ctx.fillText('arrows or WASD to slide', W / 2, H / 2 + 48);
            ctx.fillStyle = '#F4F1EC';
            ctx.fillText('press ENTER', W / 2, H / 2 + 76);
            ctx.textAlign = 'left';
        }
        scaler.sample(dt * 1000, performance.now());
    }

    function drawTile(x, y, v, s) {
        const [bg, fg] = colorFor(v);
        const size = TILE - PAD;
        ctx.fillStyle = bg;
        roundRect(x, y, size, size, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        roundRect(x + 4, y + 4, size - 8, size * 0.4, 8);
        ctx.fillStyle = fg;
        const txt = String(v);
        ctx.font = `700 ${txt.length > 3 ? 30 : txt.length > 2 ? 38 : 46}px "Archivo", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + size / 2, y + size / 2 + 2);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath(); ctx.fill();
    }

    const persist = () => Bridge.save({ v: 1, best: state.best });

    function boot(hello) {
        canvas = document.getElementById('c');
        ctx = canvas.getContext('2d', { alpha: false });
        document.getElementById('boot')?.remove();
        if (hello?.save?.v === 1) state.best = hello.save.best | 0;

        scaler = new PE.ResolutionScaler(canvas, {
            logicalWidth: W, logicalHeight: H, targetFps: 60,
            initialScale: typeof hello?.settings?.resolutionScale === 'number'
                ? hello.settings.resolutionScale : 1,
        });

        const DIRS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
        Teardown.on(window, 'keydown', (e) => {
            if (e.code === 'Enter' && state.mode !== 'playing') { reset(); return; }
            const d = DIRS[e.code];
            if (d !== undefined && state.mode === 'playing') { move(d); e.preventDefault(); }
        });
        Teardown.on(canvas, 'pointerdown', () => { if (state.mode !== 'playing') reset(); });

        loop = new PE.Loop({
            hz: 60, step, render,
            onStats: (s) => Bridge.stats({ fps: s.fps, frameMs: s.frameMs, scale: scaler.scale() }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'twenty48', onHello: boot,
        onPause: () => loop?.pause(), onResume: () => loop?.resume(),
        onSettings: (s) => {
            if (!scaler) return;
            if (typeof s?.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
