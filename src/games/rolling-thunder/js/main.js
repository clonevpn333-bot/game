'use strict';
/**
 * Rolling Thunder — a runaway boulder down a storm-lit mountain road.
 *
 * Pseudo-3D in the classic segment-projection style: the road is a list of
 * segments with curvature and elevation, each projected to screen space and
 * drawn far-to-near. It costs almost nothing per frame — a few hundred filled
 * trapezoids — which is exactly why it holds 60 fps on hardware that would
 * fall over rendering the same scene in WebGL.
 *
 * Every per-frame allocation is hoisted: segments own their projection
 * scratch, and nothing in step() or render() creates an object.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown, Pool = PE.Pool;

    const W = 960, H = 540;
    const SEG_LEN = 200;            // world units per segment
    const DRAW_DIST = 190;          // segments drawn ahead
    const ROAD_W = 1900;
    const CAM_HEIGHT = 1100;
    const CAM_DEPTH = 0.86;         // ~ 1 / tan(fov/2)
    const TRACK_SEGS = 2400;

    const MAX_SPEED = SEG_LEN * 62;
    const ACCEL = MAX_SPEED / 7;
    const BRAKE = -MAX_SPEED / 2.4;
    const DECEL = -MAX_SPEED / 9;
    const OFF_DECEL = -MAX_SPEED / 2.1;
    const CENTRIFUGAL = 0.32;

    // ---------------------------------------------------------------- state
    const state = {
        mode: 'title',              // title | playing | crashed | done
        pos: 0, speed: 0, playerX: 0, playerY: 0, playerVY: 0,
        distance: 0, best: 0, topSpeed: 0, hits: 0,
        shake: 0, flash: 0, nextBolt: 2, roll: 0, airborne: false,
        time: 0,
    };

    let seed = 0x9e3779b9;
    function rnd() {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0;
        return (seed >>> 0) / 4294967296;
    }
    const rand = (lo, hi) => lo + rnd() * (hi - lo);

    // --------------------------------------------------------------- track
    // Each segment carries its own projection scratch so drawing allocates nothing.
    const segments = new Array(TRACK_SEGS);
    for (let i = 0; i < TRACK_SEGS; i++) {
        segments[i] = {
            index: i, curve: 0, hill: 0,
            p1: { wy: 0, cz: 0, sx: 0, sy: 0, sw: 0, scale: 0 },
            p2: { wy: 0, cz: 0, sx: 0, sy: 0, sw: 0, scale: 0 },
            hazard: 0,              // 0 none, 1 barrier, 2 boost
            hazardX: 0, cleared: 0,
            light: 0,
        };
    }

    function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5); }

    function buildTrack() {
        let i = 0, y = 0;
        const addRun = (count, curve, hillTarget) => {
            const startY = y;
            for (let n = 0; n < count && i < TRACK_SEGS; n++, i++) {
                const s = segments[i];
                const p = n / count;
                s.curve = easeInOut(0, curve, p < 0.5 ? p * 2 : (1 - p) * 2);
                y = easeInOut(startY, startY + hillTarget, p);
                s.hill = y;
                s.light = (Math.floor(i / 3) % 2) === 0 ? 1 : 0;
                s.hazard = 0; s.cleared = 0;
                // Hazards thin out at the start so the first seconds read clean.
                const density = i < 160 ? 0 : Math.min(0.16, 0.03 + i / TRACK_SEGS * 0.15);
                if (rnd() < density) {
                    s.hazard = rnd() < 0.26 ? 2 : 1;
                    s.hazardX = rand(-0.72, 0.72);
                }
            }
        };
        while (i < TRACK_SEGS) {
            const kind = rnd();
            const len = Math.round(rand(45, 130));
            if (kind < 0.30) addRun(len, 0, rand(-1800, 2400));
            else if (kind < 0.65) addRun(len, rand(1.8, 5.2) * (rnd() < 0.5 ? -1 : 1), rand(-900, 900));
            else if (kind < 0.85) addRun(len, rand(0.6, 2.2) * (rnd() < 0.5 ? -1 : 1), rand(-2200, 2600));
            else addRun(len, 0, 0);
        }
    }

    const segAt = (z) => segments[Math.min(TRACK_SEGS - 1, Math.max(0, Math.floor(z / SEG_LEN)))];

    // ------------------------------------------------------------ particles
    const sparks = new Pool(180, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, hue: 0, size: 1 }));
    const rain = new Array(140);
    for (let i = 0; i < rain.length; i++) rain[i] = { x: rand(0, W), y: rand(0, H), len: rand(9, 26), spd: rand(700, 1400) };

    function burst(x, y, n, hue, power) {
        for (let i = 0; i < n; i++) {
            const p = sparks.acquire();
            if (!p) return;
            const a = rand(0, Math.PI * 2), s = rand(power * 0.25, power);
            p.x = x; p.y = y;
            p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - power * 0.35;
            p.max = p.life = rand(0.25, 0.8);
            p.hue = hue; p.size = rand(1.5, 3.6);
        }
    }

    // ------------------------------------------------------------ projection
    /**
     * World point -> screen. `cz` is the segment's distance along the road and
     * `wy` its elevation; both are world units, as is the camera.
     */
    function project(p, camX, camY, camZ) {
        const cz = p.cz - camZ;
        p.scale = CAM_DEPTH / (cz < 1 ? 1 : cz);
        p.sx = (W / 2) + (p.scale * (0 - camX) * W) / 2;
        p.sy = (H / 2) - (p.scale * (p.wy - camY) * H) / 2;
        p.sw = (p.scale * ROAD_W * W) / 2;
    }

    // ---------------------------------------------------------------- input
    const keys = Object.create(null);

    function start() {
        state.mode = 'playing';
        state.pos = 0; state.speed = 0; state.playerX = 0;
        state.playerY = 0; state.playerVY = 0; state.airborne = false;
        state.distance = 0; state.topSpeed = 0; state.hits = 0;
        state.shake = 0; state.roll = 0; state.time = 0;
        sparks.releaseAll();
        for (let i = 0; i < TRACK_SEGS; i++) segments[i].cleared = 0;
    }

    function step(dt) {
        state.flash = Math.max(0, state.flash - dt * 2.6);
        state.nextBolt -= dt;
        if (state.nextBolt <= 0) { state.flash = 1; state.nextBolt = rand(3.5, 11); }

        for (let i = 0; i < rain.length; i++) {
            const r = rain[i];
            r.y += (r.spd + state.speed * 0.02) * dt;
            r.x -= 90 * dt;
            if (r.y > H) { r.y = -20; r.x = rand(-40, W + 40); }
            if (r.x < -40) r.x = W + 40;
        }
        sparks.update(stepSpark, dt);

        if (state.mode !== 'playing') { state.shake *= 0.9; return; }

        state.time += dt;
        state.shake *= 0.86;

        const seg = segAt(state.pos);
        const speedPct = state.speed / MAX_SPEED;

        // --- steering. Faster means less authority, and the curve pulls you out.
        const steer = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        state.playerX += steer * dt * 2.4 * (0.45 + (1 - speedPct) * 0.75);
        state.playerX -= dt * speedPct * seg.curve * CENTRIFUGAL;
        state.playerX = Math.max(-2.2, Math.min(2.2, state.playerX));
        state.roll += state.speed * dt * 0.00055 + steer * dt * 1.4;

        // --- jump
        if ((keys.Space || keys.KeyW || keys.ArrowUp) && !state.airborne) {
            state.airborne = true;
            state.playerVY = 640;
        }
        if (state.airborne) {
            state.playerVY -= 1750 * dt;
            state.playerY += state.playerVY * dt;
            if (state.playerY <= 0) {
                state.playerY = 0; state.playerVY = 0; state.airborne = false;
                burst(W / 2 + state.playerX * 90, H * 0.78, 8, 202, 200);
            }
        }

        // --- speed
        const offRoad = Math.abs(state.playerX) > 1;
        if (keys.KeyS || keys.ArrowDown) state.speed += BRAKE * dt;
        else if (offRoad) state.speed += OFF_DECEL * dt;
        else state.speed += (state.speed >= MAX_SPEED ? DECEL : ACCEL) * dt;
        state.speed = Math.max(0, Math.min(MAX_SPEED, state.speed));
        if (offRoad && state.speed > MAX_SPEED * 0.35) {
            state.shake = Math.min(1, state.shake + dt * 2.4);
            if (rnd() < 0.4) burst(W / 2 + state.playerX * 120, H * 0.8, 2, 34, 160);
        }

        state.pos += state.speed * dt;
        state.distance = state.pos / SEG_LEN * 8;
        if (state.speed > state.topSpeed) state.topSpeed = state.speed;

        // --- hazard collisions on the segment under the player
        if (!state.airborne && seg.hazard && !seg.cleared) {
            if (Math.abs(seg.hazardX - state.playerX) < 0.42) {
                seg.cleared = 1;
                if (seg.hazard === 2) {
                    state.speed = Math.min(MAX_SPEED, state.speed + MAX_SPEED * 0.22);
                    burst(W / 2 + seg.hazardX * 120, H * 0.74, 18, 168, 420);
                } else {
                    state.hits++;
                    state.speed *= 0.42;
                    state.shake = 1;
                    burst(W / 2 + seg.hazardX * 120, H * 0.74, 26, 22, 520);
                }
            }
        }

        if (state.pos > (TRACK_SEGS - DRAW_DIST - 4) * SEG_LEN) finish();
    }

    function stepSpark(p, dt) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 900 * dt; p.vx *= 0.98;
        p.life -= dt;
        return p.life > 0;
    }

    function finish() {
        state.mode = 'done';
        const score = Math.floor(state.distance);
        if (score > state.best) state.best = score;
        Bridge.score(score, 'metres');
        persist();
    }

    // -------------------------------------------------------------- render
    let canvas, ctx, scaler, loop;

    function render(alpha, dt) {
        const shakeX = state.shake * (rnd() - 0.5) * 11;
        const shakeY = state.shake * (rnd() - 0.5) * 7;
        ctx.setTransform(scaler.scale(), 0, 0, scaler.scale(), shakeX, shakeY);

        drawSky();

        const baseIndex = Math.floor(state.pos / SEG_LEN);
        const camX = state.playerX * ROAD_W;
        const camY = segAt(state.pos).hill + CAM_HEIGHT + state.playerY;
        const camZ = state.pos;

        // Project the window, then paint NEAR to FAR, clipping each segment to
        // the highest point already covered. Drawing far-to-near with this test
        // culls almost everything and paints the survivors as giant slabs —
        // which is exactly what it did before this was fixed.
        const last = Math.min(TRACK_SEGS - 2, baseIndex + DRAW_DIST);
        for (let i = baseIndex; i <= last; i++) {
            const s = segments[i];
            s.p1.wy = s.hill; s.p1.cz = i * SEG_LEN;
            s.p2.wy = segments[i + 1].hill; s.p2.cz = s.p1.cz + SEG_LEN;
            project(s.p1, camX, camY, camZ);
            project(s.p2, camX, camY, camZ);
        }

        let maxY = H;
        for (let i = baseIndex; i <= last; i++) {
            const s = segments[i];
            if (s.p1.cz < camZ) continue;             // behind the camera
            if (s.p2.sy >= maxY) continue;            // hidden behind a closer crest
            drawSegment(s, (i - baseIndex) / DRAW_DIST);
            maxY = s.p2.sy;
        }

        // Sprites go back to front so nearer hazards overlap farther ones.
        for (let i = last; i >= baseIndex; i--) {
            const s = segments[i];
            if (s.hazard && !s.cleared && s.p1.sw > 1 && s.p1.sy < H + 60) drawHazard(s);
        }

        drawRain();
        drawBoulder();
        drawSparks();
        drawHud();

        if (state.flash > 0.02) {
            ctx.fillStyle = `rgba(198,214,255,${(state.flash * 0.4).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
        }
        scaler.sample(dt * 1000, performance.now());
    }

    function drawSky() {
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
        const lift = state.flash * 26;
        g.addColorStop(0, `hsl(248 46% ${8 + lift}%)`);
        g.addColorStop(0.55, `hsl(258 40% ${14 + lift}%)`);
        g.addColorStop(1, `hsl(268 34% ${22 + lift}%)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H * 0.62 + 2);

        // Ridge line behind the road, parallaxed off the camera's lateral position.
        const off = -(state.playerX * 26) % 240;
        ctx.fillStyle = 'hsl(255 30% 10%)';
        ctx.beginPath();
        ctx.moveTo(-40, H * 0.62);
        for (let x = -40; x <= W + 40; x += 40) {
            const h = 44 + Math.sin((x + off) * 0.011) * 26 + Math.sin((x + off) * 0.031) * 14;
            ctx.lineTo(x, H * 0.62 - h);
        }
        ctx.lineTo(W + 40, H * 0.62);
        ctx.closePath();
        ctx.fill();
    }

    function drawSegment(s, depth) {
        const p1 = s.p1, p2 = s.p2;
        if (p2.sy >= p1.sy) return;
        const fog = Math.min(1, depth * depth * 1.25);
        const wet = s.light ? 14 : 11;

        // grass / shoulder
        ctx.fillStyle = `hsl(${252 - depth * 6} ${18 + depth * 6}% ${(s.light ? 13 : 10) - depth * 4}%)`;
        ctx.fillRect(0, p2.sy, W, p1.sy - p2.sy + 1);

        // road
        quad(ctx, p1.sx - p1.sw, p1.sy, p1.sx + p1.sw, p1.sy,
            p2.sx + p2.sw, p2.sy, p2.sx - p2.sw, p2.sy,
            `hsl(240 8% ${wet - depth * 5}%)`);

        // rumble strips
        const r1 = p1.sw * 0.11, r2 = p2.sw * 0.11;
        const rumble = s.light ? `hsl(186 84% ${44 - depth * 24}%)` : `hsl(320 70% ${40 - depth * 22}%)`;
        quad(ctx, p1.sx - p1.sw - r1, p1.sy, p1.sx - p1.sw, p1.sy, p2.sx - p2.sw, p2.sy, p2.sx - p2.sw - r2, p2.sy, rumble);
        quad(ctx, p1.sx + p1.sw + r1, p1.sy, p1.sx + p1.sw, p1.sy, p2.sx + p2.sw, p2.sy, p2.sx + p2.sw + r2, p2.sy, rumble);

        // centre dashes
        if (s.light) {
            const l1 = p1.sw * 0.02, l2 = p2.sw * 0.02;
            quad(ctx, p1.sx - l1, p1.sy, p1.sx + l1, p1.sy, p2.sx + l2, p2.sy, p2.sx - l2, p2.sy,
                `hsl(48 30% ${46 - depth * 30}%)`);
        }

        if (fog > 0.02) {
            ctx.fillStyle = `hsla(258 40% 14% / ${fog.toFixed(3)})`;
            ctx.fillRect(0, p2.sy, W, p1.sy - p2.sy + 1);
        }
    }

    function quad(c, x1, y1, x2, y2, x3, y3, x4, y4, fill) {
        c.fillStyle = fill;
        c.beginPath();
        c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.lineTo(x4, y4);
        c.closePath(); c.fill();
    }

    function drawHazard(s) {
        const p = s.p1;
        const x = p.sx + p.sw * s.hazardX;
        const h = p.sw * 0.34;
        const w = p.sw * 0.2;
        if (h < 1.2) return;
        if (s.hazard === 2) {
            ctx.fillStyle = `hsla(168 90% 58% / ${Math.min(1, p.scale * 900).toFixed(2)})`;
            ctx.fillRect(x - w, p.sy - h * 0.25, w * 2, h * 0.3);
            ctx.fillStyle = `hsla(168 90% 74% / ${Math.min(0.7, p.scale * 700).toFixed(2)})`;
            ctx.fillRect(x - w * 0.55, p.sy - h * 0.9, w * 1.1, h * 0.6);
        } else {
            ctx.fillStyle = `hsl(14 62% ${Math.max(16, 40 - (1 - p.scale * 600) * 20)}%)`;
            ctx.fillRect(x - w, p.sy - h, w * 2, h);
            ctx.fillStyle = 'hsl(44 84% 58%)';
            ctx.fillRect(x - w, p.sy - h * 0.72, w * 2, h * 0.16);
        }
    }

    function drawRain() {
        ctx.strokeStyle = `rgba(180,200,255,${(0.14 + state.flash * 0.2).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let i = 0; i < rain.length; i++) {
            const r = rain[i];
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - 5, r.y + r.len);
        }
        ctx.stroke();
    }

    function drawBoulder() {
        if (state.mode === 'title') return;
        const bx = W / 2 + state.playerX * 120;
        const by = H * 0.79 - state.playerY * 0.09;
        const r = 34 + (state.airborne ? 3 : 0);

        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.beginPath();
        ctx.ellipse(bx, H * 0.79 + 12, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(state.roll);
        const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
        g.addColorStop(0, '#8e96a8');
        g.addColorStop(0.55, '#5a6072');
        g.addColorStop(1, '#2c3040');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(20,22,30,0.55)';
        for (let i = 0; i < 5; i++) {
            const a = i * 1.257;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * (0.1 + (i % 3) * 0.045), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawSparks() {
        for (let i = 0; i < sparks.size; i++) {
            const p = sparks.at(i);
            const t = p.life / p.max;
            ctx.fillStyle = `hsla(${p.hue} 90% ${52 + t * 28}% / ${t.toFixed(2)})`;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
    }

    function drawHud() {
        ctx.font = '600 15px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#E9EDF6';
        ctx.fillText(`${Math.floor(state.distance)} m`, 18, 30);
        ctx.fillStyle = '#8A93A6';
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.fillText(`BEST ${state.best} m   HITS ${state.hits}`, 18, 50);

        // speed bar
        const pct = state.speed / MAX_SPEED;
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(W - 168, 20, 150, 8);
        ctx.fillStyle = pct > 0.82 ? '#FF7A59' : '#5FE3C0';
        ctx.fillRect(W - 168, 20, 150 * pct, 8);
        ctx.fillStyle = '#8A93A6';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(pct * 240)} km/h`, W - 18, 48);
        ctx.textAlign = 'left';

        if (state.mode === 'title' || state.mode === 'done') {
            ctx.fillStyle = 'rgba(8,9,14,0.72)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#C9B3FF';
            ctx.font = '700 46px ui-monospace, Menlo, monospace';
            ctx.fillText(state.mode === 'done' ? 'RUN COMPLETE' : 'ROLLING THUNDER', W / 2, H / 2 - 24);
            ctx.font = '14px ui-monospace, Menlo, monospace';
            ctx.fillStyle = '#E9EDF6';
            if (state.mode === 'done') ctx.fillText(`${Math.floor(state.distance)} m   ·   ${state.hits} hits`, W / 2, H / 2 + 8);
            ctx.fillStyle = '#8A93A6';
            ctx.fillText('A / D steer   ·   SPACE jump   ·   S brake', W / 2, H / 2 + 40);
            ctx.fillStyle = '#E9EDF6';
            ctx.fillText('press ENTER', W / 2, H / 2 + 70);
            ctx.textAlign = 'left';
        }
    }

    // ---------------------------------------------------------------- boot
    function persist() { Bridge.save({ v: 1, best: state.best }); }

    function boot(hello) {
        canvas = document.getElementById('c');
        ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        const bootEl = document.getElementById('boot');
        if (bootEl) bootEl.remove();

        if (hello && hello.save && hello.save.v === 1) state.best = hello.save.best | 0;
        buildTrack();

        scaler = new PE.ResolutionScaler(canvas, {
            logicalWidth: W, logicalHeight: H, targetFps: 60,
            initialScale: (hello && hello.settings && typeof hello.settings.resolutionScale === 'number')
                ? hello.settings.resolutionScale : PE.ResolutionScaler.suggestInitialScale(),
            onResize: () => { ctx.imageSmoothingEnabled = true; },
        });

        Teardown.on(window, 'keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Enter' && state.mode !== 'playing') start();
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        });
        Teardown.on(window, 'keyup', (e) => { keys[e.code] = false; });
        Teardown.on(canvas, 'pointerdown', () => { if (state.mode !== 'playing') start(); });

        loop = new PE.Loop({
            hz: 60, step, render,
            onStats: (s) => Bridge.stats({
                fps: s.fps, frameMs: s.frameMs, scale: scaler.scale(),
                heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
                entities: sparks.size,
            }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'rolling-thunder',
        onHello: boot,
        onPause: () => loop && loop.pause(),
        onResume: () => loop && loop.resume(),
        onLowMemory: () => sparks.releaseAll(),
        onSettings: (s) => {
            if (!scaler) return;
            if (s && typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
