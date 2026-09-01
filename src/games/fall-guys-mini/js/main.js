'use strict';
/**
 * Fall Guys Mini — a top-down obstacle race up a gauntlet against seven rivals.
 *
 * Everything that moves is a fixed-capacity pool or a preallocated array, and
 * the whole scene is flat shapes with cheap shadows: no gradients per frame, no
 * per-frame allocation, no image assets. That is what keeps it pinned at 60 on
 * an integrated GPU while eight runners and two dozen hazards are live.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown, Pool = PE.Pool;

    const W = 900, H = 560;              // logical viewport
    const COURSE_W = 820;                // playfield width
    const FINISH_Y = -6400;              // course runs from y=0 up to here
    const RUNNERS = 8;                   // player + 7 rivals
    const R = 17;                        // runner radius

    const COLORS = ['#FF7BAC', '#5FD8FF', '#FFD166', '#8BE38B', '#C6A0FF', '#FF9E6B', '#7FA2FF', '#FF6B6B'];

    const state = {
        mode: 'title',                   // title | countdown | racing | finished
        timer: 0, elapsed: 0, place: 0, best: 0, wins: 0,
        camY: 0, shake: 0, finishedCount: 0,
    };

    let seed = 0x1f2e3d4c;
    function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0; return (seed >>> 0) / 4294967296; }
    const rand = (a, b) => a + rnd() * (b - a);

    // -------------------------------------------------------------- runners
    const runners = new Array(RUNNERS);
    for (let i = 0; i < RUNNERS; i++) {
        runners[i] = {
            i, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0,
            face: 0, hue: COLORS[i], player: i === 0,
            stun: 0, dive: 0, diveCool: 0, done: 0, place: 0,
            bob: rand(0, 6.28), skill: 0.72 + rnd() * 0.3, wobble: rand(0.5, 1.6),
        };
    }
    const player = runners[0];

    // -------------------------------------------------------------- hazards
    // Fixed layout objects; only their phase advances each frame.
    const bars = [];        // rotating beams around a hub
    const pendulums = [];   // swinging balls on an arm
    const sliders = [];     // blocks tracking left/right
    const pits = [];        // holes that drop you back

    function buildCourse() {
        bars.length = 0; pendulums.length = 0; sliders.length = 0; pits.length = 0;
        let y = -560;
        let band = 0;
        while (y > FINISH_Y + 500) {
            const kind = band % 4;
            if (kind === 0) {
                const hubs = 2 + (rnd() < 0.4 ? 1 : 0);
                for (let i = 0; i < hubs; i++) {
                    bars.push({
                        x: (i + 1) * (COURSE_W / (hubs + 1)) - COURSE_W / 2,
                        y, len: rand(115, 165), arms: rnd() < 0.5 ? 2 : 3,
                        a: rand(0, 6.28), spd: rand(0.9, 1.8) * (rnd() < 0.5 ? -1 : 1),
                    });
                }
            } else if (kind === 1) {
                const n = 3 + Math.floor(rnd() * 2);
                for (let i = 0; i < n; i++) {
                    pendulums.push({
                        x: rand(-COURSE_W / 2 + 70, COURSE_W / 2 - 70), y: y - i * 90,
                        arm: rand(90, 140), a: rand(0, 6.28), spd: rand(1.4, 2.3), r: rand(22, 30),
                    });
                }
            } else if (kind === 2) {
                const n = 2 + Math.floor(rnd() * 2);
                for (let i = 0; i < n; i++) {
                    sliders.push({
                        y: y - i * 120, w: rand(150, 250), h: 34,
                        x: 0, range: COURSE_W / 2 - 90, a: rand(0, 6.28), spd: rand(0.7, 1.3),
                    });
                }
            } else {
                const n = 2 + Math.floor(rnd() * 3);
                for (let i = 0; i < n; i++) {
                    pits.push({
                        x: rand(-COURSE_W / 2 + 80, COURSE_W / 2 - 80), y: y - i * 110,
                        rx: rand(56, 96), ry: rand(34, 52),
                    });
                }
            }
            y -= 560;
            band++;
        }
    }

    const puffs = new Pool(140, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 1, c: '#fff' }));
    function puff(x, y, n, color, power) {
        for (let i = 0; i < n; i++) {
            const p = puffs.acquire();
            if (!p) return;
            const a = rand(0, 6.28), s = rand(power * 0.3, power);
            p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
            p.max = p.life = rand(0.25, 0.6); p.r = rand(3, 8); p.c = color;
        }
    }

    // ---------------------------------------------------------------- reset
    function reset() {
        buildCourse();
        for (let i = 0; i < RUNNERS; i++) {
            const r = runners[i];
            r.x = r.px = (i - (RUNNERS - 1) / 2) * 62;
            r.y = r.py = -40;
            r.vx = r.vy = 0; r.stun = 0; r.dive = 0; r.diveCool = 0; r.done = 0; r.place = 0;
        }
        puffs.releaseAll();
        state.mode = 'countdown';
        state.timer = 3.2;
        state.elapsed = 0;
        state.place = 0;
        state.finishedCount = 0;
        state.camY = 0;
        state.shake = 0;
    }

    // ------------------------------------------------------------- hazards
    function updateHazards(dt) {
        for (let i = 0; i < bars.length; i++) bars[i].a += bars[i].spd * dt;
        for (let i = 0; i < pendulums.length; i++) pendulums[i].a += pendulums[i].spd * dt;
        for (let i = 0; i < sliders.length; i++) {
            const s = sliders[i];
            s.a += s.spd * dt;
            s.x = Math.sin(s.a) * s.range;
        }
    }

    function knock(r, nx, ny, power) {
        if (r.stun > 0 || r.dive > 0) return;
        r.vx = nx * power; r.vy = ny * power;
        r.stun = 0.62;
        if (r.player) state.shake = 1;
        puff(r.x, r.y, 10, '#FFE3A3', 260);
    }

    function collideHazards(r) {
        // Rotating beams.
        for (let i = 0; i < bars.length; i++) {
            const b = bars[i];
            if (Math.abs(b.y - r.y) > b.len + 60) continue;
            for (let k = 0; k < b.arms; k++) {
                const a = b.a + (k * Math.PI * 2) / b.arms;
                const ex = b.x + Math.cos(a) * b.len, ey = b.y + Math.sin(a) * b.len;
                const d = pointSeg(r.x, r.y, b.x, b.y, ex, ey);
                if (d.dist < R + 13) {
                    const nx = (r.x - d.cx) / (d.dist || 1), ny = (r.y - d.cy) / (d.dist || 1);
                    knock(r, nx, ny, 620);
                }
            }
        }
        // Pendulum balls.
        for (let i = 0; i < pendulums.length; i++) {
            const p = pendulums[i];
            if (Math.abs(p.y - r.y) > 220) continue;
            const bx = p.x + Math.sin(p.a) * p.arm;
            const by = p.y + Math.abs(Math.cos(p.a)) * 26;
            const dx = r.x - bx, dy = r.y - by, d = Math.hypot(dx, dy);
            if (d < R + p.r) knock(r, dx / (d || 1), dy / (d || 1), 700);
        }
        // Sliding blocks.
        for (let i = 0; i < sliders.length; i++) {
            const s = sliders[i];
            if (Math.abs(s.y - r.y) > 120) continue;
            const hx = s.w / 2 + R, hy = s.h / 2 + R;
            const dx = r.x - s.x, dy = r.y - s.y;
            if (Math.abs(dx) < hx && Math.abs(dy) < hy) {
                if (hx - Math.abs(dx) < hy - Math.abs(dy)) knock(r, Math.sign(dx) || 1, 0, 560);
                else knock(r, 0, Math.sign(dy) || -1, 560);
            }
        }
        // Pits send you back down the course.
        for (let i = 0; i < pits.length; i++) {
            const p = pits[i];
            const dx = (r.x - p.x) / p.rx, dy = (r.y - p.y) / p.ry;
            if (dx * dx + dy * dy < 0.72) {
                puff(r.x, r.y, 14, '#7FA2FF', 200);
                r.y += 220; r.vx = 0; r.vy = 0; r.stun = 0.7;
                if (r.player) state.shake = 1;
            }
        }
    }

    const segHit = { dist: 0, cx: 0, cy: 0 };
    function pointSeg(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        segHit.cx = ax + dx * t; segHit.cy = ay + dy * t;
        segHit.dist = Math.hypot(px - segHit.cx, py - segHit.cy);
        return segHit;
    }

    // ---------------------------------------------------------------- input
    const keys = Object.create(null);

    function step(dt) {
        state.shake *= 0.88;
        puffs.update(stepPuff, dt);

        if (state.mode === 'countdown') {
            state.timer -= dt;
            if (state.timer <= 0) state.mode = 'racing';
            return;
        }
        if (state.mode !== 'racing') return;

        state.elapsed += dt;
        updateHazards(dt);

        for (let i = 0; i < RUNNERS; i++) {
            const r = runners[i];
            r.px = r.x; r.py = r.y;
            if (r.done) continue;

            r.bob += dt * (6 + Math.hypot(r.vx, r.vy) * 0.02);
            if (r.stun > 0) r.stun -= dt;
            if (r.dive > 0) r.dive -= dt;
            if (r.diveCool > 0) r.diveCool -= dt;

            let ax = 0, ay = 0;
            if (r.player) {
                ax = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
                ay = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
                if ((keys.Space) && r.diveCool <= 0 && r.stun <= 0) {
                    r.dive = 0.34; r.diveCool = 1.1;
                    const m = Math.hypot(ax, ay) || 1;
                    r.vx += (ax / m) * 520; r.vy += (ay / m) * 520 - 120;
                    puff(r.x, r.y, 8, '#FFFFFF', 150);
                }
            } else {
                ay = -1;
                // Rivals steer around whatever is closest ahead, with a personal
                // wobble so eight of them never move as one block.
                let avoid = 0;
                for (let k = 0; k < pendulums.length; k++) {
                    const p = pendulums[k];
                    if (p.y > r.y || p.y < r.y - 240) continue;
                    const bx = p.x + Math.sin(p.a) * p.arm;
                    if (Math.abs(bx - r.x) < 90) avoid += (r.x - bx) > 0 ? 1 : -1;
                }
                for (let k = 0; k < pits.length; k++) {
                    const p = pits[k];
                    if (p.y > r.y || p.y < r.y - 200) continue;
                    if (Math.abs(p.x - r.x) < p.rx + 30) avoid += (r.x - p.x) > 0 ? 1 : -1;
                }
                ax = avoid !== 0 ? Math.sign(avoid) : Math.sin(state.elapsed * r.wobble + r.bob) * 0.5;
                if (r.x < -COURSE_W / 2 + 60) ax = 1;
                if (r.x > COURSE_W / 2 - 60) ax = -1;
            }

            const speed = (r.stun > 0 ? 90 : 250) * (r.player ? 1 : r.skill) * (r.dive > 0 ? 1.15 : 1);
            const m = Math.hypot(ax, ay);
            if (m > 0 && r.stun <= 0) {
                r.vx += (ax / m) * speed * dt * 9;
                r.vy += (ay / m) * speed * dt * 9;
                r.face = Math.atan2(ay, ax);
            }
            const drag = Math.pow(r.dive > 0 ? 0.22 : 0.02, dt);
            r.vx *= drag; r.vy *= drag;
            const cap = r.dive > 0 ? 520 : speed;
            const sp = Math.hypot(r.vx, r.vy);
            if (sp > cap) { r.vx = (r.vx / sp) * cap; r.vy = (r.vy / sp) * cap; }

            r.x += r.vx * dt; r.y += r.vy * dt;
            r.x = Math.max(-COURSE_W / 2 + R, Math.min(COURSE_W / 2 - R, r.x));
            if (r.y > 40) r.y = 40;

            collideHazards(r);

            if (r.y <= FINISH_Y) {
                r.done = 1;
                r.place = ++state.finishedCount;
                if (r.player) finish(r.place);
            }
        }

        // Runners jostle rather than overlap.
        for (let i = 0; i < RUNNERS; i++) {
            for (let k = i + 1; k < RUNNERS; k++) {
                const a = runners[i], b = runners[k];
                if (a.done || b.done) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.hypot(dx, dy);
                if (d > 0 && d < R * 2) {
                    const push = (R * 2 - d) / 2;
                    const nx = dx / d, ny = dy / d;
                    a.x -= nx * push; a.y -= ny * push;
                    b.x += nx * push; b.y += ny * push;
                }
            }
        }

        const targetCam = player.y - H * 0.34;
        state.camY += (targetCam - state.camY) * Math.min(1, dt * 6);
    }

    function stepPuff(p, dt) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.94; p.vy *= 0.94;
        p.life -= dt;
        return p.life > 0;
    }

    function finish(place) {
        state.mode = 'finished';
        state.place = place;
        if (place === 1) state.wins++;
        const score = Math.max(0, Math.round((9 - place) * 1000 - state.elapsed * 10));
        if (score > state.best) state.best = score;
        Bridge.score(score, `place ${place}`);
        persist();
    }

    // -------------------------------------------------------------- render
    let canvas, ctx, scaler, loop;

    function render(alpha, dt) {
        const sx = state.shake * (rnd() - 0.5) * 10;
        const sy = state.shake * (rnd() - 0.5) * 10;
        ctx.setTransform(scaler.scale(), 0, 0, scaler.scale(), sx, sy);

        ctx.fillStyle = '#131A2B';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(W / 2, -state.camY);

        drawCourse();
        for (let i = 0; i < pits.length; i++) drawPit(pits[i]);
        for (let i = 0; i < sliders.length; i++) drawSlider(sliders[i]);
        for (let i = 0; i < bars.length; i++) drawBar(bars[i]);
        for (let i = 0; i < pendulums.length; i++) drawPendulum(pendulums[i]);

        for (let i = 0; i < puffs.size; i++) {
            const p = puffs.at(i);
            const t = p.life / p.max;
            ctx.globalAlpha = t;
            ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * t, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (let i = RUNNERS - 1; i >= 0; i--) drawRunner(runners[i], alpha);
        ctx.restore();

        drawHud();
        scaler.sample(dt * 1000, performance.now());
    }

    function drawCourse() {
        const top = state.camY - 40, bot = state.camY + H + 40;
        // Track floor with stripe banding for a sense of speed.
        ctx.fillStyle = '#1E2740';
        ctx.fillRect(-COURSE_W / 2, top, COURSE_W, bot - top);
        const bandH = 120;
        const first = Math.floor(top / bandH) * bandH;
        for (let y = first; y < bot; y += bandH) {
            if (((y / bandH) | 0) % 2 === 0) continue;
            ctx.fillStyle = '#222C48';
            ctx.fillRect(-COURSE_W / 2, y, COURSE_W, bandH);
        }
        ctx.fillStyle = '#39456B';
        ctx.fillRect(-COURSE_W / 2 - 16, top, 16, bot - top);
        ctx.fillRect(COURSE_W / 2, top, 16, bot - top);

        // Start and finish bands.
        if (bot > -60 && top < 60) {
            ctx.fillStyle = '#2E3A5C';
            ctx.fillRect(-COURSE_W / 2, 20, COURSE_W, 26);
        }
        if (top < FINISH_Y + 120 && bot > FINISH_Y - 120) {
            for (let i = 0; i < 22; i++) {
                ctx.fillStyle = i % 2 ? '#F4F6FB' : '#2A3350';
                ctx.fillRect(-COURSE_W / 2 + i * (COURSE_W / 22), FINISH_Y - 14, COURSE_W / 22, 28);
            }
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 30px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FINISH', 0, FINISH_Y - 40);
            ctx.textAlign = 'left';
        }
    }

    function drawPit(p) {
        if (p.y < state.camY - 120 || p.y > state.camY + H + 120) return;
        ctx.fillStyle = '#0C1120';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#3C4A72';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 6.283); ctx.stroke();
    }

    function drawSlider(s) {
        if (s.y < state.camY - 120 || s.y > state.camY + H + 120) return;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        roundRect(s.x - s.w / 2, s.y - s.h / 2 + 7, s.w, s.h, 9);
        ctx.fillStyle = '#5FD8FF';
        roundRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 9);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        roundRect(s.x - s.w / 2 + 6, s.y - s.h / 2 + 5, s.w - 12, 7, 4);
    }

    function drawBar(b) {
        if (b.y < state.camY - 260 || b.y > state.camY + H + 260) return;
        for (let k = 0; k < b.arms; k++) {
            const a = b.a + (k * 6.283) / b.arms;
            const ex = b.x + Math.cos(a) * b.len, ey = b.y + Math.sin(a) * b.len;
            ctx.strokeStyle = 'rgba(0,0,0,0.28)';
            ctx.lineWidth = 22;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(b.x, b.y + 7); ctx.lineTo(ex, ey + 7); ctx.stroke();
            ctx.strokeStyle = '#FF7BAC';
            ctx.lineWidth = 20;
            ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
        }
        ctx.fillStyle = '#39456B';
        ctx.beginPath(); ctx.arc(b.x, b.y, 18, 0, 6.283); ctx.fill();
    }

    function drawPendulum(p) {
        if (p.y < state.camY - 240 || p.y > state.camY + H + 240) return;
        const bx = p.x + Math.sin(p.a) * p.arm;
        const by = p.y + Math.abs(Math.cos(p.a)) * 26;
        ctx.strokeStyle = '#39456B';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 40); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(bx, by + 8, p.r, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#FFD166';
        ctx.beginPath(); ctx.arc(bx, by, p.r, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(bx - p.r * 0.3, by - p.r * 0.35, p.r * 0.3, 0, 6.283); ctx.fill();
    }

    function drawRunner(r, alpha) {
        const x = r.px + (r.x - r.px) * alpha;
        const y = r.py + (r.y - r.py) * alpha;
        if (y < state.camY - 80 || y > state.camY + H + 80) return;

        const squash = r.dive > 0 ? 0.7 : 1 + Math.sin(r.bob) * 0.06;
        const hh = R * 1.28 * squash;

        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.beginPath(); ctx.ellipse(x, y + R * 0.9, R * 0.92, R * 0.34, 0, 0, 6.283); ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        if (r.dive > 0) ctx.rotate(r.face + Math.PI / 2);
        else if (r.stun > 0) ctx.rotate(Math.sin(r.stun * 40) * 0.28);

        // body
        ctx.fillStyle = r.hue;
        roundRect(-R * 0.86, -hh, R * 1.72, hh + R * 0.86, R * 0.82);
        // belly highlight
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        roundRect(-R * 0.55, -hh + R * 0.3, R * 1.1, hh * 0.7, R * 0.5);
        // eyes
        const look = r.stun > 0 ? 0 : Math.cos(r.face) * 2.4;
        ctx.fillStyle = '#141A28';
        ctx.beginPath(); ctx.arc(-R * 0.3 + look, -hh + R * 0.55, 3.2, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(R * 0.3 + look, -hh + R * 0.55, 3.2, 0, 6.283); ctx.fill();
        if (r.stun > 0) {
            ctx.strokeStyle = '#FFE3A3'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -hh - 8, 9, 0.2, 2.9); ctx.stroke();
        }
        ctx.restore();

        if (r.player) {
            ctx.fillStyle = '#FFD166';
            ctx.beginPath();
            ctx.moveTo(x, y - hh - 16); ctx.lineTo(x - 7, y - hh - 27); ctx.lineTo(x + 7, y - hh - 27);
            ctx.closePath(); ctx.fill();
        }
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
        // Standings: how many rivals are ahead of the player right now.
        let ahead = 0;
        for (let i = 1; i < RUNNERS; i++) if (runners[i].y < player.y) ahead++;
        const progress = Math.max(0, Math.min(1, player.y / FINISH_Y));

        ctx.fillStyle = 'rgba(10,14,26,0.6)';
        roundRect(14, 14, 190, 54, 12);
        ctx.fillStyle = '#F4F6FB';
        ctx.font = '700 22px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
        ctx.fillText(`${ordinal(ahead + 1)}`, 28, 44);
        ctx.font = '12px ui-monospace, Menlo, monospace';
        ctx.fillStyle = '#9AA6C4';
        ctx.fillText(`of ${RUNNERS}   ${state.elapsed.toFixed(1)}s`, 74, 42);
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        roundRect(28, 52, 162, 6, 3);
        ctx.fillStyle = '#5FD8FF';
        roundRect(28, 52, 162 * progress, 6, 3);

        if (state.mode === 'countdown') {
            const n = Math.ceil(state.timer - 0.2);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFD166';
            ctx.font = '700 92px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
            ctx.fillText(n > 0 ? String(n) : 'GO', W / 2, H / 2);
            ctx.textAlign = 'left';
        }

        if (state.mode === 'title' || state.mode === 'finished') {
            ctx.fillStyle = 'rgba(10,14,26,0.78)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FF7BAC';
            ctx.font = '700 50px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
            ctx.fillText(state.mode === 'finished' ? ordinal(state.place) + ' PLACE' : 'FALL GUYS MINI', W / 2, H / 2 - 26);
            ctx.fillStyle = '#F4F6FB';
            ctx.font = '15px ui-monospace, Menlo, monospace';
            if (state.mode === 'finished') ctx.fillText(`${state.elapsed.toFixed(1)}s   ·   wins ${state.wins}`, W / 2, H / 2 + 8);
            ctx.fillStyle = '#9AA6C4';
            ctx.fillText('WASD move   ·   SPACE dive', W / 2, H / 2 + 40);
            ctx.fillStyle = '#F4F6FB';
            ctx.fillText('press ENTER', W / 2, H / 2 + 70);
            ctx.textAlign = 'left';
        }
    }

    const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

    // ---------------------------------------------------------------- boot
    function persist() { Bridge.save({ v: 1, best: state.best, wins: state.wins }); }

    function boot(hello) {
        canvas = document.getElementById('c');
        ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        const bootEl = document.getElementById('boot');
        if (bootEl) bootEl.remove();

        if (hello && hello.save && hello.save.v === 1) {
            state.best = hello.save.best | 0;
            state.wins = hello.save.wins | 0;
        }
        buildCourse();

        scaler = new PE.ResolutionScaler(canvas, {
            logicalWidth: W, logicalHeight: H, targetFps: 60,
            initialScale: (hello && hello.settings && typeof hello.settings.resolutionScale === 'number')
                ? hello.settings.resolutionScale : PE.ResolutionScaler.suggestInitialScale(),
        });

        Teardown.on(window, 'keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Enter' && (state.mode === 'title' || state.mode === 'finished')) reset();
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        });
        Teardown.on(window, 'keyup', (e) => { keys[e.code] = false; });
        Teardown.on(canvas, 'pointerdown', () => { if (state.mode === 'title' || state.mode === 'finished') reset(); });

        loop = new PE.Loop({
            hz: 60, step, render,
            onStats: (s) => Bridge.stats({
                fps: s.fps, frameMs: s.frameMs, scale: scaler.scale(),
                heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
                entities: RUNNERS + puffs.size,
            }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'canvas2d', pointerLock: false });
    }

    Bridge.connect({
        id: 'fall-guys-mini',
        onHello: boot,
        onPause: () => loop && loop.pause(),
        onResume: () => loop && loop.resume(),
        onLowMemory: () => puffs.releaseAll(),
        onSettings: (s) => {
            if (!scaler) return;
            if (s && typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
