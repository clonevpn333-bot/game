'use strict';
/**
 * Snake — the classic, with movement interpolated between grid steps so it
 * reads as motion rather than a slideshow, and a fixed-size pool for the tail
 * so a 400-segment snake allocates nothing per frame.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown;
    const COLS = 26, ROWS = 18, CELL = 30;
    const W = COLS * CELL, H = ROWS * CELL;

    const state = {
        mode: 'title', score: 0, best: 0, len: 4, step: 0, stepTime: 0.135,
        dir: 1, nextDir: 1, alive: true, flash: 0, ate: 0,
    };
    // Directions: 0 up, 1 right, 2 down, 3 left.
    const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

    const MAX = COLS * ROWS;
    const bodyX = new Int16Array(MAX), bodyY = new Int16Array(MAX);
    const prevX = new Int16Array(MAX), prevY = new Int16Array(MAX);
    let head = 0, food = { x: 0, y: 0, pulse: 0 };

    const occupied = new Uint8Array(MAX);
    const idx = (x, y) => y * COLS + x;

    function placeFood() {
        occupied.fill(0);
        for (let i = 0; i < state.len; i++) occupied[idx(bodyX[(head - i + MAX) % MAX], bodyY[(head - i + MAX) % MAX])] = 1;
        let free = 0;
        for (let i = 0; i < MAX; i++) if (!occupied[i]) free++;
        if (!free) return;
        let n = Math.floor(Math.random() * free);
        for (let i = 0; i < MAX; i++) {
            if (occupied[i]) continue;
            if (n-- === 0) { food.x = i % COLS; food.y = (i / COLS) | 0; food.pulse = 0; return; }
        }
    }

    function reset() {
        state.mode = 'playing'; state.score = 0; state.len = 4;
        state.step = 0; state.stepTime = 0.135; state.dir = state.nextDir = 1; state.alive = true;
        head = 0;
        for (let i = 0; i < state.len; i++) {
            bodyX[(head - i + MAX) % MAX] = 6 - i; bodyY[(head - i + MAX) % MAX] = 9;
            prevX[(head - i + MAX) % MAX] = 6 - i; prevY[(head - i + MAX) % MAX] = 9;
        }
        placeFood();
    }

    function advance() {
        state.dir = state.nextDir;
        const hx = bodyX[head] + DX[state.dir];
        const hy = bodyY[head] + DY[state.dir];

        if (hx < 0 || hy < 0 || hx >= COLS || hy >= ROWS) return die();
        for (let i = 0; i < state.len - 1; i++) {
            const j = (head - i + MAX) % MAX;
            if (bodyX[j] === hx && bodyY[j] === hy) return die();
        }

        const nh = (head + 1) % MAX;
        prevX[nh] = bodyX[head]; prevY[nh] = bodyY[head];
        bodyX[nh] = hx; bodyY[nh] = hy;
        head = nh;

        if (hx === food.x && hy === food.y) {
            state.len = Math.min(MAX - 1, state.len + 3);
            state.score += 10;
            state.ate = 1;
            state.stepTime = Math.max(0.055, 0.135 - state.score * 0.00035);
            placeFood();
        }
    }

    function die() {
        state.alive = false;
        state.mode = 'dead';
        state.flash = 1;
        if (state.score > state.best) state.best = state.score;
        Bridge.score(state.score, 'points');
        persist();
    }

    const keys = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };

    function step(dt) {
        state.flash *= 0.9;
        state.ate *= 0.86;
        food.pulse += dt * 3.4;
        if (state.mode !== 'playing') return;
        state.step += dt;
        while (state.step >= state.stepTime) {
            state.step -= state.stepTime;
            advance();
            if (!state.alive) return;
        }
    }

    let canvas, ctx, scaler, loop;

    function render(alpha, dt) {
        const t = Math.min(1, state.step / state.stepTime);
        ctx.setTransform(scaler.scale(), 0, 0, scaler.scale(), 0, 0);

        ctx.fillStyle = '#0B0A0F';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 1; x < COLS; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); }
        for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); }
        ctx.stroke();

        // food
        const fp = 1 + Math.sin(food.pulse) * 0.12;
        const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
        ctx.fillStyle = 'rgba(255,77,61,0.22)';
        ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.62 * fp, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#FF4D3D';
        ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.3 * fp, 0, 6.283); ctx.fill();

        // body, newest first so the head sits on top
        for (let i = state.len - 1; i >= 0; i--) {
            const j = (head - i + MAX) % MAX;
            const x = (prevX[j] + (bodyX[j] - prevX[j]) * t) * CELL;
            const y = (prevY[j] + (bodyY[j] - prevY[j]) * t) * CELL;
            const k = 1 - i / state.len;
            const pad = 3 + (1 - k) * 3;
            ctx.fillStyle = i === 0 ? '#FFD37A' : `rgba(255,176,32,${(0.35 + k * 0.6).toFixed(2)})`;
            roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 7 - (1 - k) * 3);
        }

        // eyes on the head
        const hj = head;
        const hx = (prevX[hj] + (bodyX[hj] - prevX[hj]) * t) * CELL + CELL / 2;
        const hy = (prevY[hj] + (bodyY[hj] - prevY[hj]) * t) * CELL + CELL / 2;
        const ex = DX[state.dir] * 5, ey = DY[state.dir] * 5;
        const px = -DY[state.dir] * 5, py = DX[state.dir] * 5;
        ctx.fillStyle = '#1A1206';
        ctx.beginPath(); ctx.arc(hx + ex + px, hy + ey + py, 2.6, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + ex - px, hy + ey - py, 2.6, 0, 6.283); ctx.fill();

        if (state.flash > 0.01) {
            ctx.fillStyle = `rgba(255,77,61,${(state.flash * 0.3).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
        }

        drawHud();
        scaler.sample(dt * 1000, performance.now());
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

    function drawHud() {
        ctx.font = '700 20px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#F4F1EC';
        ctx.fillText(String(state.score).padStart(4, '0'), 16, 30);
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#918AA3';
        ctx.fillText(`BEST ${state.best}   LEN ${state.len}`, 16, 50);

        if (state.mode !== 'playing') {
            ctx.fillStyle = 'rgba(11,10,15,0.82)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFB020';
            ctx.font = '700 46px ui-monospace, Menlo, monospace';
            ctx.fillText(state.mode === 'dead' ? 'GAME OVER' : 'SNAKE', W / 2, H / 2 - 20);
            ctx.fillStyle = '#F4F1EC';
            ctx.font = '15px ui-monospace, Menlo, monospace';
            if (state.mode === 'dead') ctx.fillText(`${state.score} points   ·   best ${state.best}`, W / 2, H / 2 + 12);
            ctx.fillStyle = '#918AA3';
            ctx.fillText('arrows or WASD', W / 2, H / 2 + 44);
            ctx.fillStyle = '#F4F1EC';
            ctx.fillText('press ENTER', W / 2, H / 2 + 72);
            ctx.textAlign = 'left';
        }
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
                ? hello.settings.resolutionScale : PE.ResolutionScaler.suggestInitialScale(),
        });

        Teardown.on(window, 'keydown', (e) => {
            if (e.code === 'Enter' && state.mode !== 'playing') reset();
            const d = keys[e.code];
            // No instant reversal: turning back into your own neck is a death
            // the player never intended.
            if (d !== undefined && (d + 2) % 4 !== state.dir) state.nextDir = d;
            if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
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
        id: 'snake', onHello: boot,
        onPause: () => loop?.pause(), onResume: () => loop?.resume(),
        onSettings: (s) => {
            if (!scaler) return;
            if (typeof s?.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
