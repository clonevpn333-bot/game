'use strict';
/**
 * Orbital Salvage — 2D canvas arcade.
 *
 * Reference implementation for the 2D half of §1.3: layered canvases (a
 * starfield that is drawn once and never cleared, under a dynamic layer),
 * fixed-timestep simulation with render interpolation, and pools for every
 * high-churn entity so the hot loop allocates nothing.
 */
(function () {
    const W = 960, H = 540;                 // logical resolution
    const TAU = Math.PI * 2;

    const Bridge = PE.Bridge, Teardown = PE.Teardown, Pool = PE.Pool;

    // ---------------------------------------------------------------- state
    const state = {
        mode: 'title',                      // title | playing | dead
        score: 0, best: 0, wave: 0, lives: 3,
        shake: 0, waveTimer: 0, respawn: 0,
        salvaged: 0,
    };

    const ship = {
        x: W / 2, y: H / 2, px: W / 2, py: H / 2,
        vx: 0, vy: 0, a: -Math.PI / 2, pa: -Math.PI / 2,
        thrusting: false, cool: 0, invuln: 2,
    };

    // Pools are sized here, at load, and never grow (§1.1).
    const rocks = new Pool(48, () => ({
        x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, r: 0, size: 0, spin: 0, rot: 0, prot: 0, shape: null,
    }));
    const shots = new Pool(32, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, life: 0 }));
    const bits  = new Pool(320, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, life: 0, max: 1, hue: 0, size: 1 }));
    const crates = new Pool(16, () => ({ x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, rot: 0, prot: 0, life: 0 }));

    let seed = 0x2f6e2b1;
    function rnd(lo, hi) {                  // deterministic, allocation-free
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0;
        return lo + ((seed >>> 0) / 4294967296) * (hi - lo);
    }

    // Rock silhouettes are generated once and shared; drawing them allocates
    // nothing per frame.
    const SHAPES = [];
    for (let s = 0; s < 6; s++) {
        const pts = new Float32Array(20);
        for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * TAU;
            const rad = 0.72 + rnd(0, 0.42);
            pts[i * 2] = Math.cos(ang) * rad;
            pts[i * 2 + 1] = Math.sin(ang) * rad;
        }
        SHAPES.push(pts);
    }

    // ------------------------------------------------------------- rendering
    let dyn, dctx, stars, sctx, scaler, loop, hudEl;

    function buildStarfield() {
        // Static layer: painted on resize only. Redrawing 240 stars every frame
        // would be the single biggest overdraw cost in this scene.
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.fillStyle = '#05070d';
        sctx.fillRect(0, 0, stars.width, stars.height);
        const sx = stars.width / W, sy = stars.height / H;
        for (let i = 0; i < 240; i++) {
            const x = rnd(0, W) * sx, y = rnd(0, H) * sy;
            const b = rnd(0.15, 0.9);
            sctx.fillStyle = `rgba(${180 + b * 60 | 0},${190 + b * 50 | 0},255,${b.toFixed(2)})`;
            const s = b > 0.75 ? 2 : 1;
            sctx.fillRect(x | 0, y | 0, s, s);
        }
        // A couple of nebula washes so the backdrop is not just dots.
        for (let i = 0; i < 3; i++) {
            const cx = rnd(0, stars.width), cy = rnd(0, stars.height);
            const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, stars.width * 0.35);
            g.addColorStop(0, i % 2 ? 'rgba(70,120,190,0.10)' : 'rgba(140,70,180,0.09)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            sctx.fillStyle = g;
            sctx.fillRect(0, 0, stars.width, stars.height);
        }
    }

    function fitLayers(w, h) {
        stars.width = w; stars.height = h;
        buildStarfield();
        dctx.setTransform(w / W, 0, 0, h / H, 0, 0);
        dctx.lineCap = 'round';
        dctx.lineJoin = 'round';
    }

    // ------------------------------------------------------------- spawning
    function spawnWave(n) {
        for (let i = 0; i < n; i++) {
            const r = rocks.acquire();
            if (!r) break;
            // Never spawn on top of the ship.
            let x, y, tries = 0;
            do {
                x = rnd(0, W); y = rnd(0, H); tries++;
            } while (tries < 12 && Math.hypot(x - ship.x, y - ship.y) < 160);
            initRock(r, x, y, 3, rnd(-28, 28), rnd(-28, 28));
        }
    }

    function initRock(r, x, y, size, vx, vy) {
        r.x = r.px = x; r.y = r.py = y;
        r.vx = vx; r.vy = vy;
        r.size = size;
        r.r = size === 3 ? 34 : size === 2 ? 20 : 11;
        r.rot = r.prot = rnd(0, TAU);
        r.spin = rnd(-1.4, 1.4);
        r.shape = SHAPES[(rnd(0, SHAPES.length) | 0) % SHAPES.length];
    }

    function burst(x, y, count, hue, speed) {
        for (let i = 0; i < count; i++) {
            const p = bits.acquire();
            if (!p) return;
            const a = rnd(0, TAU), s = rnd(speed * 0.2, speed);
            p.x = p.px = x; p.y = p.py = y;
            p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
            p.max = p.life = rnd(0.25, 0.85);
            p.hue = hue; p.size = rnd(1, 2.6);
        }
    }

    function dropCrate(x, y) {
        const c = crates.acquire();
        if (!c) return;
        c.x = c.px = x; c.y = c.py = y;
        c.vx = rnd(-24, 24); c.vy = rnd(-24, 24);
        c.rot = c.prot = 0; c.life = 14;
    }

    // ------------------------------------------------------------ simulation
    const keys = Object.create(null);

    function step(dt) {
        if (state.mode !== 'playing') { state.shake *= 0.9; return; }

        state.shake *= 0.86;
        if (ship.invuln > 0) ship.invuln -= dt;

        // --- ship
        ship.pa = ship.a;
        ship.px = ship.x; ship.py = ship.y;
        if (state.respawn <= 0) {
            const turn = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
            ship.a += turn * 3.4 * dt;
            ship.thrusting = !!(keys.KeyW || keys.ArrowUp);
            if (ship.thrusting) {
                ship.vx += Math.cos(ship.a) * 260 * dt;
                ship.vy += Math.sin(ship.a) * 260 * dt;
                if (Math.random() < 0.7) {
                    const p = bits.acquire();
                    if (p) {
                        const back = ship.a + Math.PI + rnd(-0.35, 0.35);
                        p.x = p.px = ship.x + Math.cos(back) * 11;
                        p.y = p.py = ship.y + Math.sin(back) * 11;
                        p.vx = Math.cos(back) * rnd(60, 130) + ship.vx * 0.4;
                        p.vy = Math.sin(back) * rnd(60, 130) + ship.vy * 0.4;
                        p.max = p.life = rnd(0.15, 0.4); p.hue = 30; p.size = rnd(1, 2);
                    }
                }
            }
            const drag = Math.pow(0.62, dt);
            ship.vx *= drag; ship.vy *= drag;
            ship.x += ship.vx * dt; ship.y += ship.vy * dt;
            wrap(ship);

            ship.cool -= dt;
            if ((keys.Space || keys.KeyJ) && ship.cool <= 0) {
                const b = shots.acquire();
                if (b) {
                    b.x = b.px = ship.x + Math.cos(ship.a) * 14;
                    b.y = b.py = ship.y + Math.sin(ship.a) * 14;
                    b.vx = ship.vx + Math.cos(ship.a) * 460;
                    b.vy = ship.vy + Math.sin(ship.a) * 460;
                    b.life = 1.1;
                    ship.cool = 0.16;
                    ship.vx -= Math.cos(ship.a) * 18;
                    ship.vy -= Math.sin(ship.a) * 18;
                }
            }
        } else {
            state.respawn -= dt;
            if (state.respawn <= 0) {
                ship.x = ship.px = W / 2; ship.y = ship.py = H / 2;
                ship.vx = ship.vy = 0; ship.invuln = 2.2;
            }
        }

        // --- bullets
        shots.update(stepShot, dt);
        // --- rocks
        rocks.update(stepRock, dt);
        // --- particles
        bits.update(stepBit, dt);
        // --- crates
        crates.update(stepCrate, dt);

        if (rocks.size === 0) {
            state.waveTimer -= dt;
            if (state.waveTimer <= 0) {
                state.wave++;
                spawnWave(Math.min(3 + state.wave, 9));
                state.waveTimer = 2;
            }
        }
    }

    // Sweep callbacks are module-level functions, not closures created per
    // frame — the whole point of Pool.update's signature.
    function stepShot(b, dt) {
        b.px = b.x; b.py = b.y;
        b.x += b.vx * dt; b.y += b.vy * dt;
        wrap(b);
        b.life -= dt;
        if (b.life <= 0) return false;

        for (let i = rocks.size - 1; i >= 0; i--) {
            const r = rocks.at(i);
            if (dist2(r.x - b.x, r.y - b.y) > r.r * r.r) continue;
            hitRock(r, b.vx, b.vy);
            return false;
        }
        return true;
    }

    function stepRock(r, dt) {
        r.px = r.x; r.py = r.y; r.prot = r.rot;
        r.x += r.vx * dt; r.y += r.vy * dt;
        r.rot += r.spin * dt;
        wrap(r);
        if (state.respawn <= 0 && ship.invuln <= 0 &&
            dist2(r.x - ship.x, r.y - ship.y) < (r.r + 9) * (r.r + 9)) {
            killShip();
        }
        return true;
    }

    function stepBit(p, dt) {
        p.px = p.x; p.py = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= dt;
        return p.life > 0;
    }

    function stepCrate(c, dt) {
        c.px = c.x; c.py = c.y; c.prot = c.rot;
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.rot += 0.9 * dt;
        wrap(c);
        c.life -= dt;
        if (state.respawn <= 0 && dist2(c.x - ship.x, c.y - ship.y) < 400) {
            state.score += 75;
            state.salvaged++;
            burst(c.x, c.y, 12, 150, 130);
            return false;
        }
        return c.life > 0;
    }

    function hitRock(r, vx, vy) {
        state.score += r.size === 3 ? 20 : r.size === 2 ? 50 : 100;
        state.shake = Math.min(1, state.shake + 0.35);
        burst(r.x, r.y, r.size === 3 ? 22 : 14, 24, 190);
        if (r.size > 1) {
            for (let i = 0; i < 2; i++) {
                const n = rocks.acquire();
                if (!n) break;
                initRock(n, r.x, r.y, r.size - 1,
                    r.vx + rnd(-46, 46) + vx * 0.04, r.vy + rnd(-46, 46) + vy * 0.04);
            }
        } else if (rnd(0, 1) < 0.35) {
            dropCrate(r.x, r.y);
        }
        rocks.release(r);
    }

    function killShip() {
        burst(ship.x, ship.y, 44, 8, 240);
        state.shake = 1;
        state.lives--;
        state.respawn = 1.6;
        ship.vx = ship.vy = 0;
        if (state.lives <= 0) gameOver();
    }

    function gameOver() {
        state.mode = 'dead';
        if (state.score > state.best) state.best = state.score;
        Bridge.score(state.score, 'salvage run');
        persist();
    }

    function wrap(o) {
        if (o.x < -40) { o.x += W + 80; o.px = o.x; }
        else if (o.x > W + 40) { o.x -= W + 80; o.px = o.x; }
        if (o.y < -40) { o.y += H + 80; o.py = o.y; }
        else if (o.y > H + 40) { o.y -= H + 80; o.py = o.y; }
    }

    const dist2 = (dx, dy) => dx * dx + dy * dy;
    const lerp = (a, b, t) => a + (b - a) * t;

    // ------------------------------------------------------------- rendering
    function render(alpha) {
        const ctx = dctx;
        ctx.clearRect(0, 0, W, H);

        let ox = 0, oy = 0;
        if (state.shake > 0.01) {
            ox = rnd(-1, 1) * state.shake * 7;
            oy = rnd(-1, 1) * state.shake * 7;
            ctx.translate(ox, oy);
        }

        // particles first: they sit under everything
        for (let i = 0; i < bits.size; i++) {
            const p = bits.at(i);
            const t = p.life / p.max;
            ctx.fillStyle = `hsla(${p.hue},90%,${45 + t * 35}%,${t.toFixed(2)})`;
            ctx.fillRect(lerp(p.px, p.x, alpha) - p.size / 2, lerp(p.py, p.y, alpha) - p.size / 2, p.size, p.size);
        }

        ctx.strokeStyle = '#9fb4c8';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < rocks.size; i++) {
            const r = rocks.at(i);
            drawRock(ctx, r, alpha);
        }

        ctx.fillStyle = '#ffd479';
        for (let i = 0; i < shots.size; i++) {
            const b = shots.at(i);
            ctx.fillRect(lerp(b.px, b.x, alpha) - 1.5, lerp(b.py, b.y, alpha) - 1.5, 3, 3);
        }

        for (let i = 0; i < crates.size; i++) {
            const c = crates.at(i);
            const blink = c.life < 4 && ((c.life * 6) | 0) % 2 === 0;
            ctx.save();
            ctx.translate(lerp(c.px, c.x, alpha), lerp(c.py, c.y, alpha));
            ctx.rotate(lerp(c.prot, c.rot, alpha));
            ctx.strokeStyle = blink ? '#4a6d5c' : '#58d0a0';
            ctx.lineWidth = 2;
            ctx.strokeRect(-7, -7, 14, 14);
            ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
            ctx.restore();
        }

        if (state.respawn <= 0 && state.mode !== 'title') drawShip(ctx, alpha);

        if (ox || oy) ctx.translate(-ox, -oy);
        drawHud(ctx);
    }

    function drawRock(ctx, r, alpha) {
        const x = lerp(r.px, r.x, alpha), y = lerp(r.py, r.y, alpha);
        const rot = lerp(r.prot, r.rot, alpha);
        const s = r.shape, cos = Math.cos(rot), sin = Math.sin(rot);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const px = s[i * 2] * r.r, py = s[i * 2 + 1] * r.r;
            const rx = x + px * cos - py * sin, ry = y + px * sin + py * cos;
            if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();
    }

    function drawShip(ctx, alpha) {
        const x = lerp(ship.px, ship.x, alpha), y = lerp(ship.py, ship.y, alpha);
        const a = lerp(ship.pa, ship.a, alpha);
        if (ship.invuln > 0 && ((ship.invuln * 8) | 0) % 2 === 0) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.strokeStyle = '#e6edf3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(-10, -8); ctx.lineTo(-5, 0); ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.stroke();
        if (ship.thrusting) {
            ctx.strokeStyle = '#ffb054';
            ctx.beginPath();
            ctx.moveTo(-6, -4); ctx.lineTo(-14 - Math.random() * 6, 0); ctx.lineTo(-6, 4);
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawHud(ctx) {
        ctx.font = '600 16px ui-monospace, "Courier New", monospace';
        ctx.fillStyle = '#e6edf3';
        ctx.textAlign = 'left';
        ctx.fillText(String(state.score).padStart(6, '0'), 16, 28);
        ctx.fillStyle = '#9aa7b4';
        ctx.font = '13px ui-monospace, "Courier New", monospace';
        ctx.fillText(`WAVE ${state.wave}   SALVAGE ${state.salvaged}   BEST ${state.best}`, 16, 48);

        ctx.fillStyle = '#58d0a0';
        for (let i = 0; i < state.lives; i++) {
            ctx.save();
            ctx.translate(W - 22 - i * 22, 26);
            ctx.rotate(-Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        if (state.mode === 'title' || state.mode === 'dead') {
            ctx.fillStyle = 'rgba(5,7,13,0.72)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#58d0a0';
            ctx.font = '700 42px ui-monospace, "Courier New", monospace';
            ctx.fillText(state.mode === 'dead' ? 'HULL BREACH' : 'ORBITAL SALVAGE', W / 2, H / 2 - 26);
            ctx.fillStyle = '#e6edf3';
            ctx.font = '15px ui-monospace, "Courier New", monospace';
            if (state.mode === 'dead') ctx.fillText(`FINAL ${state.score}   BEST ${state.best}`, W / 2, H / 2 + 6);
            ctx.fillStyle = '#9aa7b4';
            ctx.fillText('W thrust · A/D turn · SPACE fire · P pause', W / 2, H / 2 + 36);
            ctx.fillStyle = '#e6edf3';
            ctx.fillText('press ENTER', W / 2, H / 2 + 66);
            ctx.textAlign = 'left';
        }
    }

    // ---------------------------------------------------------------- flow
    function startRun() {
        state.mode = 'playing';
        state.score = 0; state.wave = 1; state.lives = 3; state.salvaged = 0;
        state.respawn = 0; state.waveTimer = 2;
        rocks.releaseAll(); shots.releaseAll(); bits.releaseAll(); crates.releaseAll();
        ship.x = ship.px = W / 2; ship.y = ship.py = H / 2;
        ship.vx = ship.vy = 0; ship.a = ship.pa = -Math.PI / 2; ship.invuln = 2;
        spawnWave(4);
    }

    function persist() {
        Bridge.save({ v: 1, best: state.best, salvaged: state.salvaged });
    }

    // ----------------------------------------------------------------- boot
    function boot(hello) {
        dyn = document.getElementById('dyn');
        stars = document.getElementById('stars');
        dctx = dyn.getContext('2d', { alpha: true, desynchronized: true });
        sctx = stars.getContext('2d', { alpha: false });
        hudEl = document.getElementById('boot');
        if (hudEl) hudEl.remove();

        if (hello && hello.save) {
            state.best = hello.save.best | 0;
        }

        scaler = new PE.ResolutionScaler(dyn, {
            logicalWidth: W, logicalHeight: H,
            targetFps: 60,
            initialScale: PE.ResolutionScaler.suggestInitialScale(),
            onResize: (w, h) => fitLayers(w, h),
        });

        Teardown.on(window, 'keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Enter' && state.mode !== 'playing') startRun();
            if (e.code === 'KeyP' && state.mode === 'playing') { loop._paused ? loop.resume() : loop.pause(); }
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        });
        Teardown.on(window, 'keyup', (e) => { keys[e.code] = false; });
        Teardown.on(dyn, 'pointerdown', () => { if (state.mode !== 'playing') startRun(); });

        loop = new PE.Loop({
            hz: 60,
            step,
            render: (alpha, dt) => {
                render(alpha);
                scaler.sample(dt * 1000, performance.now());
            },
            onStats: (s) => Bridge.stats({
                fps: s.fps, frameMs: s.frameMs, scale: scaler.scale(),
                heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
                entities: rocks.size + shots.size + bits.size + crates.size,
            }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'orbital-salvage',
        onHello: boot,
        onPause: () => { loop && loop.pause(); persist(); Bridge.flush(); },
        onResume: () => loop && loop.resume(),
        onLowMemory: () => {
            // Particles are the only thing worth dropping; everything else is
            // gameplay-critical and the pools are fixed size anyway.
            bits.releaseAll();
            Bridge.flush();
        },
        onSettings: (s) => {
            if (!scaler) return;
            if (s && typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
