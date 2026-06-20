'use strict';

/* =====================================================================
   rounds.js — the Round (one minigame instance) plus the course
   builders for the Show:  Door Dash, The Whirlygig, Jump Club, Hex-A-Gone.
   The Round owns the beans, obstacles, FX, camera, phase machine and the
   per-category qualification logic.
   ===================================================================== */

class Round {
    constructor(def, beans) {
        this.def = def;
        this.category = def.category;
        this.beans = beans;
        this.player = beans.find(b => b.isPlayer);
        this.obstacles = [];
        this.tiles = null;
        this.fx = [];

        // world / camera
        this.minX = 0; this.maxX = CFG.W; this.minY = 0; this.maxY = CFG.H;
        this.cx = CFG.W / 2;
        this.camMode = 'fixed';
        this.cam = { x: 0, y: 0 };

        // phase machine
        this.phase = 'intro';      // intro | go | ending
        this.phaseT = CFG.INTRO_TIME;
        this.elapsed = 0;
        this.live = false;
        this.controllable = false;

        // qualification
        this.kind = 'race';        // race | survival | final
        this.qualifyCount = def.qualify || 0;
        this.qualifiedCount = 0;
        this.finishY = 0;
        this.timer = def.duration || 0;

        // outcome
        this.result = null;        // {outcome:'qualify'|'eliminate'|'win', place}
        this.done = false;
        this.bigTease = false;

        // hooks set by builders
        this.thinkFn = (b) => { b.ai.mx = 0; b.ai.my = 0; b.ai.jump = false; b.ai.dive = false; };
        this.drawGround = null;
        this.onUpdate = null;
        this.doorWalls = [];
        this.platform = null;
        this.sweeper = null;
    }

    start() { this.camera(0, true); }

    // ---- FX -----------------------------------------------------------
    spawnBurst(x, y, z, color, count) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * 6.283, sp = U.rngf(40, 170);
            this.fx.push({ x, y, z: z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                vz: U.rngf(80, 260), life: U.rngf(0.4, 0.9), max: 0.9, color,
                size: U.rngf(3, 6), grav: 900, confetti: false });
        }
    }
    spawnConfetti(bean) {
        const cols = ['#ff5fa2', '#ffd23f', '#46d36a', '#5ad1ff', '#b06bff'];
        for (let i = 0; i < 24; i++) {
            const a = Math.random() * 6.283, sp = U.rngf(60, 240);
            this.fx.push({ x: bean.x, y: bean.y, z: 30 + Math.random() * 30,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: U.rngf(160, 360),
                life: U.rngf(0.8, 1.6), max: 1.6, color: U.pick(cols),
                size: U.rngf(3, 6), grav: 500, confetti: true });
        }
    }
    updateFx(dt) {
        for (let i = this.fx.length - 1; i >= 0; i--) {
            const p = this.fx[i];
            p.life -= dt; if (p.life <= 0) { this.fx.splice(i, 1); continue; }
            p.vz -= p.grav * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.4; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - 1.5 * dt); p.vy *= (1 - 1.5 * dt);
        }
    }
    drawFx(ctx, cam) {
        for (const p of this.fx) {
            const sx = p.x - cam.x, sy = p.y - cam.y - p.z;
            ctx.globalAlpha = U.clamp(p.life / p.max, 0, 1);
            ctx.fillStyle = p.color;
            if (p.confetti) ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size * 0.6);
            else { ctx.beginPath(); ctx.arc(sx, sy, p.size, 0, 6.283); ctx.fill(); }
        }
        ctx.globalAlpha = 1;
    }

    // ---- Update -------------------------------------------------------
    update(dt) {
        this.updateFx(dt);

        if (this.phase === 'intro') {
            this.phaseT -= dt;
            this._playerEmote();
            for (const b of this.beans) b.update(dt, this);
            this.camera(dt, true);
            if (this.phaseT <= 0) { this.phase = 'go'; this.live = true; this.controllable = true; }
            return;
        }

        // go / ending
        this.elapsed += dt;
        this._simulate(dt);
        this._checkQualify(dt);
        this.camera(dt, false);
        if (this.phase === 'ending') {
            this.phaseT -= dt;
            if (this.phaseT <= 0) this.done = true;
        }
    }

    _simulate(dt) {
        if (this.onUpdate) this.onUpdate(this, dt);
        for (const o of this.obstacles) o.update(dt);
        if (this.tiles) for (const t of this.tiles) t.update(dt);

        for (const b of this.beans) {
            if (b.isAI) {
                if (b.alive && !b.gone && !b.exited) this.thinkFn(b, this, dt);
                else { b.ai.mx = 0; b.ai.my = 0; b.ai.jump = false; b.ai.dive = false; }
            }
        }
        this._playerInput();

        for (const b of this.beans) b.update(dt, this);

        // brief spawn immunity so obstacles (e.g. a sweeper starting on top
        // of the spawn ring) don't instantly knock beans out at the gun.
        if (this.elapsed > 0.6)
            for (const o of this.obstacles)
                for (const b of this.beans) if (!b.gone && !b.exited && o.collide) o.collide(b, this, dt);

        this._separate();
        for (const b of this.beans) this._bounds(b);
    }

    _playerEmote() {
        const p = this.player; if (!p || !p.alive) return;
        const slot = Input.emoteSlot();
        if (slot >= 0) p.doEmote(p.emoteList[slot]);
    }
    _playerInput() {
        const p = this.player; if (!p || !p.alive) return;
        const slot = Input.emoteSlot();
        if (slot >= 0) p.doEmote(p.emoteList[slot]);
        if (Input.grabPressed) p.tryGrab(this.beans);
        if (!Input.grab && p.grabbing) p.releaseGrab();
    }

    _separate() {
        const bs = this.beans;
        for (let i = 0; i < bs.length; i++) {
            const a = bs[i]; if (a.gone || a.exited || a.falling) continue;
            for (let j = i + 1; j < bs.length; j++) {
                const b = bs[j]; if (b.gone || b.exited || b.falling) continue;
                if (a.grabbing === b || b.grabbing === a) continue;
                if (Math.abs(a.z - b.z) > 42) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.hypot(dx, dy), min = a.r + b.r;
                if (d > 0.001 && d < min) {
                    const push = (min - d) / 2, nx = dx / d, ny = dy / d;
                    a.x -= nx * push; a.y -= ny * push;
                    b.x += nx * push; b.y += ny * push;
                }
            }
        }
    }

    _bounds(bean) {
        if (bean.falling || bean.gone || bean.exited) return;
        if (this.kind === 'race') {
            const lo = this.minX + bean.r, hi = this.maxX - bean.r;
            if (bean.x < lo) { bean.x = lo; if (bean.vx < 0) bean.vx *= -0.2; }
            if (bean.x > hi) { bean.x = hi; if (bean.vx > 0) bean.vx *= -0.2; }
            if (bean.y > this.maxY - bean.r) bean.y = this.maxY - bean.r;
        } else if (this.kind === 'survival') {
            if (bean.grounded && U.dist(bean.x, bean.y, this.platform.cx, this.platform.cy) > this.platform.r)
                bean.startFall();
        } else if (this.kind === 'final') {
            if (bean.x < this.minX - 50 || bean.x > this.maxX + 50 ||
                bean.y < this.minY - 50 || bean.y > this.maxY + 50) {
                if (bean.grounded) bean.startFall();
                return;
            }
            const t = this._tileAt(bean.x, bean.y);
            if (!t) { if (bean.grounded) bean.startFall(); }
            else if (bean.grounded) t.step();
        }
    }

    // ---- Qualification ------------------------------------------------
    _checkQualify(dt) {
        if (this.result) return;
        if (this.kind === 'race') {
            for (const b of this.beans)
                if (b.alive && !b.finished && !b.gone && b.y <= this.finishY) this.markFinish(b);
            if (this.elapsed > CFG.ROUND_MAXTIME) this._raceCutoff();
        } else if (this.kind === 'survival') {
            this.timer -= dt;
            const aliveN = this.beans.filter(b => b.alive && !b.eliminated).length;
            // Run the full timer so you can spectate after falling.
            if (this.timer <= 0 || aliveN === 0) {
                for (const b of this.beans) if (b.alive && !b.eliminated) b.qualified = true;
                this._finish();
            }
        } else if (this.kind === 'final') {
            const standing = this.beans.filter(b => b.alive && !b.eliminated);
            if (standing.length <= 1) this._finishFinal(standing[0] === this.player);
            if (this.elapsed > 150) this._finishFinal(!this.player.eliminated);  // hard safeguard
        }
    }

    markFinish(bean) {
        if (bean.finished) return;
        bean.finished = true;
        if (this.qualifiedCount < this.qualifyCount) {
            bean.qualified = true;
            bean.exited = true;              // vanish off the course (spectate the rest)
            bean.place = ++this.qualifiedCount;
            this.spawnConfetti(bean);
            if (bean === this.player && bean.place === 1 && bean.justEmoted < 1.3) this.bigTease = true;
            if (this.qualifiedCount >= this.qualifyCount) this._raceCutoff();
        } else {
            bean.eliminated = true; bean.alive = false;
        }
    }
    _raceCutoff() {
        for (const b of this.beans)
            if (!b.qualified && !b.eliminated) { b.eliminated = true; b.alive = false; }
        this._finish();
    }
    _finish() {
        if (this.result) return;
        const p = this.player;
        this.result = { outcome: p.qualified ? 'qualify' : 'eliminate', place: p.place || (this.qualifyCount + 1) };
        this.phase = 'ending'; this.phaseT = CFG.BANNER_TIME;
    }
    _finishFinal(won) {
        if (this.result) return;
        this.result = { outcome: won ? 'win' : 'eliminate', place: won ? 1 : this._aliveCount() + 1 };
        this.phase = 'ending'; this.phaseT = won ? 3.4 : CFG.BANNER_TIME;
        if (won) this.spawnConfetti(this.player);
    }
    _aliveCount() { return this.beans.filter(b => b.alive && !b.eliminated).length; }

    qualifiedSoFar() { return this.beans.filter(b => b.qualified).length; }
    aliveSoFar() { return this.beans.filter(b => b.alive && !b.eliminated).length; }

    // ---- Hex helpers --------------------------------------------------
    _tileAt(x, y) {
        let best = null, bd = 1e9;
        for (const t of this.tiles) {
            if (t.state === 'gone') continue;
            const d = U.dist2(x, y, t.cx, t.cy);
            const rr = (t.size * 0.92) * (t.size * 0.92);
            if (d < rr && d < bd) { bd = d; best = t; }
        }
        return best;
    }
    pickSafeTile(bean) {
        const solids = [], any = [];
        for (const t of this.tiles) {
            if (t.state === 'gone') continue;
            if (t.cx === bean.aiTarget.x && t.cy === bean.aiTarget.y) continue;
            const d = U.dist2(bean.x, bean.y, t.cx, t.cy);
            if (d > 200 * 200) continue;
            any.push([d, t]); if (t.state === 'solid') solids.push([d, t]);
        }
        const pool = solids.length ? solids : any;
        if (!pool.length) return null;
        pool.sort((a, b) => a[0] - b[0]);
        return pool[U.rng(0, Math.min(pool.length, 4) - 1)][1];
    }

    // ---- Jump Club helper ---------------------------------------------
    sweeperEta(bean) {
        const s = this.sweeper; if (!s) return null;
        const d = U.dist(bean.x, bean.y, s.cx, s.cy);
        if (d < 28 || d > s.len + 12) return null;
        const beanAng = Math.atan2(bean.y - s.cy, bean.x - s.cx);
        let best = null;
        for (let i = 0; i < s.arms; i++) {
            const armAng = s.angle + i * Math.PI * 2 / s.arms;
            const diff = U.angleDiff(armAng, beanAng);
            let need;
            if (s.speed > 0) need = diff >= 0 ? diff : diff + Math.PI * 2;
            else need = diff <= 0 ? -diff : Math.PI * 2 - diff;
            const eta = need / Math.abs(s.speed);
            if (best == null || eta < best) best = eta;
        }
        return best;
    }

    // ---- Camera -------------------------------------------------------
    camera(dt, snap) {
        if (this.camMode === 'followY') {
            const ty = this.player.y - CFG.H * 0.62;
            const cl = U.clamp(ty, this.minY - 40, this.maxY - CFG.H + 40);
            this.cam.y = snap ? cl : U.lerp(this.cam.y, cl, 1 - Math.pow(0.001, dt));
            this.cam.x = this.cx - CFG.W / 2;
        } else {
            this.cam.x = 0; this.cam.y = 0;
        }
    }

    // ---- Draw ---------------------------------------------------------
    draw(ctx) {
        const cam = this.cam;
        if (this.drawGround) this.drawGround(ctx, cam);
        // ground parts of obstacles
        for (const o of this.obstacles) if (o.draw) o.draw(ctx, cam);
        if (this.tiles) for (const t of this.tiles) t.draw(ctx, cam);
        // beans: shadows, then bodies sorted by depth (y)
        const vis = this.beans.filter(b => !b.gone);
        for (const b of vis) b.drawShadow(ctx, cam);
        vis.sort((a, b) => a.y - b.y);
        for (const b of vis) b.draw(ctx, cam);
        // overhead obstacle parts
        for (const o of this.obstacles) if (o.drawTop) o.drawTop(ctx, cam);
        // confetti / impact fx on top
        this.drawFx(ctx, cam);
    }
}

/* =====================================================================
   AI BRAINS  (shared by builders)
   ===================================================================== */
function raceThink(bean, round, dt) {
    let tx, ty = round.finishY - 30;
    if (round.doorWalls.length) {
        let wall = null;
        for (const w of round.doorWalls)
            if (w.y < bean.y - 4 && (!wall || w.y > wall.y)) wall = w;
        if (wall) { const fx = wall.fakeNear(bean.x); tx = fx != null ? fx : bean.x; }
        else tx = round.cx + bean.lane * 0.25;
    } else {
        tx = round.cx + bean.lane;
    }
    let dx = tx - bean.x, dy = ty - bean.y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;

    // obstacle avoidance
    let ax = 0, ay = 0;
    for (const o of round.obstacles) {
        let px, py;
        if (o instanceof Spinner) {
            let best = 1e9, bx = 0, by = 0;
            for (const [ex, ey] of o._ends()) {
                const c = U.closestOnSeg(bean.x, bean.y, o.cx, o.cy, ex, ey);
                const d = U.dist(bean.x, bean.y, c.x, c.y);
                if (d < best) { best = d; bx = c.x; by = c.y; }
            }
            if (bean.z > o.height) continue;
            px = bx; py = by;
        } else if (o instanceof Hammer) {
            if (bean.z > o.height) continue;
            const h = o._head(); px = h[0]; py = h[1];
        } else continue;
        const d = U.dist(bean.x, bean.y, px, py);
        const rad = 95;
        if (d < rad) {
            const w = 1 - d / rad;
            ax += (bean.x - px) / (d || 1) * w * 1.7;
            ay += (bean.y - py) / (d || 1) * w * 0.5;
        }
    }
    let mx = dx + ax, my = dy + ay;
    const ml = Math.hypot(mx, my) || 1;
    bean.ai.mx = mx / ml; bean.ai.my = my / ml;

    bean.aiTimer -= dt;
    let dive = false;
    if (bean.aiTimer <= 0) {
        bean.aiTimer = U.rngf(0.8, 2.2);
        if (Math.abs(ax) + Math.abs(ay) < 0.2 && U.chance(0.4 * bean.skill)) dive = true;
    }
    bean.ai.dive = dive; bean.ai.jump = false;
}

function jumpThink(bean, round, dt) {
    const P = round.platform;
    const rr = P.r * 0.5;
    const tx = P.cx + Math.cos(bean.lane) * rr, ty = P.cy + Math.sin(bean.lane) * rr;
    let dx = tx - bean.x, dy = ty - bean.y; const dl = Math.hypot(dx, dy);
    if (dl > 8) { bean.ai.mx = dx / dl * 0.6; bean.ai.my = dy / dl * 0.6; }
    else { bean.ai.mx = 0; bean.ai.my = 0; }

    // Jump to clear the low sweeper. Decide once per pass; weaker beans
    // sometimes muff the jump (and take the knock) instead of mistiming.
    const eta = round.sweeperEta(bean);
    bean.ai.jump = false;
    if (bean.grounded && bean.aiJumpLock <= 0 && eta != null && eta > 0.12 && eta < 0.36) {
        bean.aiJumpLock = 0.6;
        const success = bean.isPlayer ? 1 : (0.72 + bean.skill * 0.26);
        if (U.chance(success)) bean.ai.jump = true;
    }
    bean.ai.dive = false;
}

function hexThink(bean, round, dt) {
    bean.aiTimer -= dt;
    const cur = round._tileAt(bean.x, bean.y);
    const need = !cur || cur.state !== 'solid';
    if (bean.aiTimer <= 0 || need) {
        const t = round.pickSafeTile(bean);
        if (t) { bean.aiTarget.x = t.cx; bean.aiTarget.y = t.cy; }
        bean.aiTimer = U.rngf(0.3, 0.7);
    }
    let dx = bean.aiTarget.x - bean.x, dy = bean.aiTarget.y - bean.y;
    const dl = Math.hypot(dx, dy) || 1;
    bean.ai.mx = dx / dl; bean.ai.my = dy / dl;
    if (U.chance((0.78 - bean.skill) * 0.022)) { bean.ai.mx = 0; bean.ai.my = 0; }   // hesitate (fall more)
    bean.ai.jump = false; bean.ai.dive = false;
}

/* =====================================================================
   COURSE BUILDERS
   ===================================================================== */
const Rounds = {
    create(def, beans) {
        const r = new Round(def, beans);
        Rounds.builders[def.build](r);
        r.start();
        return r;
    },

    // place beans in rows above a start line (races)
    _spawnRows(r, startY, cx) {
        const ais = r.beans.filter(b => b.isAI);
        const ordered = [r.player, ...ais];          // player up front-centre
        const perRow = 5, sx = 78, sy = 62;
        ordered.forEach((b, i) => {
            const row = Math.floor(i / perRow), col = i % perRow;
            b.x = cx + (col - (perRow - 1) / 2) * sx + U.rngf(-8, 8);
            b.y = startY + row * sy;
            b.startX = b.x; b.startY = b.y; b.facing = -Math.PI / 2;
            b.lane = b.isPlayer ? 0 : U.rngf(-340, 340);
            b.skill = b.isPlayer ? 1 : U.rngf(0.32, 0.72);
        });
    },

    // ---- shared builder helpers --------------------------------------
    _raceCommon(r) {
        r.kind = 'race'; r.camMode = 'followY';
        r.minX = 200; r.maxX = 1080; r.cx = 640;
        r.minY = 240; r.maxY = 2680; r.finishY = 420;
        r.thinkFn = raceThink;
    },
    _doorWall(r, y, fakeCount) {
        const x0 = r.minX, x1 = r.maxX, n = 6, w = (x1 - x0) / n;
        const fakes = new Set();
        while (fakes.size < fakeCount) fakes.add(U.rng(0, n - 1));
        const segs = [];
        for (let i = 0; i < n; i++)
            segs.push({ x0: x0 + i * w, x1: x0 + (i + 1) * w, fake: fakes.has(i), broken: false });
        const dw = new DoorWall({ y, x0, x1, segs });
        r.obstacles.push(dw); r.doorWalls.push(dw);
    },
    _arena(r, R) {
        R = R || 300;
        const cx = 640, cy = 380;
        r.kind = 'survival'; r.camMode = 'fixed';
        r.platform = { cx, cy, r: R };
        r.minX = 0; r.maxX = CFG.W; r.minY = 0; r.maxY = CFG.H;
        r.thinkFn = jumpThink;
        return { cx, cy, R };
    },
    _sweeper(r, o) {
        const cx = r.platform.cx, cy = r.platform.cy, R = r.platform.r;
        const s = new Spinner(Object.assign({ cx, cy, len: R - 6, thick: 22, angle: -Math.PI / 2,
            height: 42, arms: 2, pushOut: true, power: 490, color: '#ffd23f' }, o || {}));
        r.obstacles.push(s);
        return s;
    },
    _spawnRing(r) {
        const cx = r.platform.cx, cy = r.platform.cy, R = r.platform.r;
        r.beans.forEach((b, i) => {
            const ang = (i / r.beans.length) * Math.PI * 2;
            const rr = R * (b.isPlayer ? 0.5 : U.rngf(0.4, 0.62));
            b.x = cx + Math.cos(ang) * rr; b.y = cy + Math.sin(ang) * rr;
            b.startX = b.x; b.startY = b.y;
            b.lane = ang; b.skill = b.isPlayer ? 1 : U.rngf(0.38, 0.75);
            b.facing = ang + Math.PI;
        });
    },
    _hexField(r, size, stepX, stepY) {
        r.tiles = [];
        const cols = ['#ff8fd0', '#9a8cff', '#7fd0ff', '#7ce0b0', '#ffd07a', '#ff9ec4'];
        let row = 0;
        for (let y = r.minY + 20; y <= r.maxY - 10; y += stepY, row++) {
            const off = (row % 2) * (stepX / 2);
            for (let x = r.minX + 30 + off; x <= r.maxX - 20; x += stepX)
                r.tiles.push(new HexTile({ cx: x, cy: y, size, color: cols[row % cols.length] }));
        }
        const spots = U.shuffle(r.tiles.slice());
        r.beans.forEach((b, i) => {
            const t = spots[i % spots.length];
            b.x = t.cx; b.y = t.cy; b.startX = b.x; b.startY = b.y;
            b.skill = b.isPlayer ? 1 : U.rngf(0.28, 0.62);
            b.facing = U.rngf(0, 6.28);
        });
    },

    builders: {
        // -------------------------------------------------- DOOR DASH
        doorDash(r) {
            r.kind = 'race'; r.camMode = 'followY';
            r.minX = 200; r.maxX = 1080; r.cx = 640;
            r.minY = 240; r.maxY = 2680;
            r.finishY = 420;
            r.thinkFn = raceThink;

            const makeWall = (y, fakeCount) => {
                const x0 = r.minX, x1 = r.maxX, n = 6, w = (x1 - x0) / n;
                const fakes = new Set();
                while (fakes.size < fakeCount) fakes.add(U.rng(0, n - 1));
                const segs = [];
                for (let i = 0; i < n; i++)
                    segs.push({ x0: x0 + i * w, x1: x0 + (i + 1) * w, fake: fakes.has(i), broken: false });
                const dw = new DoorWall({ y, x0, x1, segs });
                r.obstacles.push(dw); r.doorWalls.push(dw);
            };
            [2150, 1700, 1200, 760].forEach((y, i) => makeWall(y, i % 2 ? 3 : 2));

            Rounds._spawnRows(r, r.maxY - 230, r.cx);

            r.drawGround = (ctx, cam) => {
                drawSky(ctx);
                // track
                ctx.fillStyle = PAL.track;
                ctx.fillRect(r.minX - cam.x, r.minY - cam.y, r.maxX - r.minX, r.maxY - r.minY);
                drawTrackEdges(ctx, cam, r);
                drawFinishBanner(ctx, cam, r);
                drawStartGate(ctx, cam, r);
            };
        },

        // -------------------------------------------------- THE WHIRLYGIG
        whirlygig(r) {
            r.kind = 'race'; r.camMode = 'followY';
            r.minX = 200; r.maxX = 1080; r.cx = 640;
            r.minY = 240; r.maxY = 2680;
            r.finishY = 430;
            r.thinkFn = raceThink;

            r.obstacles.push(new Spinner({ cx: 640, cy: 2150, len: 250, thick: 20, speed: 1.2, power: 360, color: '#7b46d6' }));
            r.obstacles.push(new BouncePad({ x: 470, y: 1880, r: 40 }));
            r.obstacles.push(new BouncePad({ x: 810, y: 1880, r: 40 }));
            r.obstacles.push(new Spinner({ cx: 640, cy: 1620, len: 250, thick: 20, speed: -1.4, power: 360, color: '#ff5fa2' }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 1250, amp: 300, headR: 32, speed: 1.7, power: 520 }));
            r.obstacles.push(new Spinner({ cx: 470, cy: 940, len: 200, thick: 18, speed: 1.6, power: 340, color: '#23d6c8' }));
            r.obstacles.push(new Spinner({ cx: 820, cy: 940, len: 200, thick: 18, speed: -1.6, power: 340, color: '#23d6c8' }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 640, amp: 320, headR: 30, speed: 2.1, phase: 1.5, power: 520 }));

            Rounds._spawnRows(r, r.maxY - 230, r.cx);

            r.drawGround = (ctx, cam) => {
                drawSky(ctx);
                ctx.fillStyle = PAL.track;
                ctx.fillRect(r.minX - cam.x, r.minY - cam.y, r.maxX - r.minX, r.maxY - r.minY);
                drawTrackEdges(ctx, cam, r);
                drawFinishBanner(ctx, cam, r);
                drawStartGate(ctx, cam, r);
            };
        },

        // -------------------------------------------------- JUMP CLUB
        jumpClub(r) {
            r.kind = 'survival'; r.camMode = 'fixed';
            const cx = 640, cy = 380, R = 300;
            r.platform = { cx, cy, r: R };
            r.minX = 0; r.maxX = CFG.W; r.minY = 0; r.maxY = CFG.H;
            r.thinkFn = jumpThink;

            const sweep = new Spinner({ cx, cy, len: R - 6, thick: 22, speed: 0.7,
                angle: -Math.PI / 2, height: 42, arms: 2, pushOut: true, power: 500, color: '#ffd23f' });
            r.sweeper = sweep; r.obstacles.push(sweep);

            // spawn beans on a ring
            const all = r.beans;
            all.forEach((b, i) => {
                const ang = (i / all.length) * Math.PI * 2;
                const rr = R * (b.isPlayer ? 0.5 : U.rngf(0.42, 0.62));
                b.x = cx + Math.cos(ang) * rr; b.y = cy + Math.sin(ang) * rr;
                b.startX = b.x; b.startY = b.y;
                b.lane = ang; b.skill = b.isPlayer ? 1 : U.rngf(0.38, 0.75);
                b.facing = ang + Math.PI;
            });

            r.onUpdate = (rr, dt) => { sweep.speed += dt * 0.06; };   // ramp difficulty

            r.drawGround = (ctx, cam) => {
                drawSlime(ctx);
                drawDisk(ctx, cx, cy, R, PAL.arena);
            };
        },

        // -------------------------------------------------- HEX-A-GONE
        hexAGone(r) {
            r.kind = 'final'; r.camMode = 'fixed';
            r.minX = 300; r.maxX = 980; r.minY = 130; r.maxY = 630;
            r.thinkFn = hexThink;
            r.tiles = [];

            const size = 33, stepX = 50, stepY = 44;
            const cols = ['#ff8fd0', '#9a8cff', '#7fd0ff', '#7ce0b0', '#ffd07a'];
            let row = 0;
            for (let y = r.minY + 20; y <= r.maxY - 10; y += stepY, row++) {
                const off = (row % 2) * (stepX / 2);
                for (let x = r.minX + 30 + off; x <= r.maxX - 20; x += stepX) {
                    r.tiles.push(new HexTile({ cx: x, cy: y, size, color: cols[row % cols.length] }));
                }
            }

            // spread beans across the field on distinct tiles
            const spots = U.shuffle(r.tiles.slice());
            r.beans.forEach((b, i) => {
                const t = spots[i % spots.length];
                b.x = t.cx; b.y = t.cy; b.startX = b.x; b.startY = b.y;
                b.skill = b.isPlayer ? 1 : U.rngf(0.28, 0.62);
                b.facing = U.rngf(0, 6.28);
            });

            r.onUpdate = (rr, dt) => {
                rr._decayT = (rr._decayT || 0) - dt;
                if (rr.elapsed > 16 && rr._decayT <= 0) {
                    rr._decayT = Math.max(0.18, 1.1 - (rr.elapsed - 16) * 0.02);
                    const solids = rr.tiles.filter(t => t.state === 'solid');
                    if (solids.length) U.pick(solids).step();
                }
            };

            r.drawGround = (ctx) => { drawSlime(ctx); };
        },

        // -------------------------------------------------- GATE CRASH
        gateCrash(r) {
            r.kind = 'race'; r.camMode = 'followY';
            r.minX = 200; r.maxX = 1080; r.cx = 640;
            r.minY = 240; r.maxY = 2680;
            r.finishY = 420;
            r.thinkFn = raceThink;

            const makeWall = (y, fakeCount) => {
                const x0 = r.minX, x1 = r.maxX, n = 6, w = (x1 - x0) / n;
                const fakes = new Set();
                while (fakes.size < fakeCount) fakes.add(U.rng(0, n - 1));
                const segs = [];
                for (let i = 0; i < n; i++)
                    segs.push({ x0: x0 + i * w, x1: x0 + (i + 1) * w, fake: fakes.has(i), broken: false });
                const dw = new DoorWall({ y, x0, x1, segs });
                r.obstacles.push(dw); r.doorWalls.push(dw);
            };
            // doors interleaved with spinning bars
            makeWall(2150, 3);
            r.obstacles.push(new Spinner({ cx: 640, cy: 1830, len: 240, thick: 20, speed: 1.3, power: 360, color: '#7b46d6' }));
            makeWall(1500, 2);
            r.obstacles.push(new Spinner({ cx: 470, cy: 1180, len: 190, thick: 18, speed: -1.6, power: 340, color: '#23d6c8' }));
            r.obstacles.push(new Spinner({ cx: 820, cy: 1180, len: 190, thick: 18, speed: 1.6, power: 340, color: '#23d6c8' }));
            makeWall(820, 3);

            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },

        // -------------------------------------------------- BOUNCE BASH
        bounceBash(r) {
            r.kind = 'survival'; r.camMode = 'fixed';
            const cx = 640, cy = 380, R = 300;
            r.platform = { cx, cy, r: R };
            r.minX = 0; r.maxX = CFG.W; r.minY = 0; r.maxY = CFG.H;
            r.thinkFn = jumpThink;

            const sweep = new Spinner({ cx, cy, len: R - 6, thick: 22, speed: 0.85,
                angle: Math.PI / 2, height: 42, arms: 2, pushOut: true, power: 480, color: '#ff5fa2' });
            r.sweeper = sweep; r.obstacles.push(sweep);
            // bounce pads kept near the centre so a launch lands you back on the disc
            for (const [px, py] of [[cx - 120, cy - 70], [cx + 120, cy - 70], [cx, cy + 130], [cx - 95, cy + 70], [cx + 95, cy + 70]])
                r.obstacles.push(new BouncePad({ x: px, y: py, r: 42 }));

            const all = r.beans;
            all.forEach((b, i) => {
                const ang = (i / all.length) * Math.PI * 2;
                const rr = R * (b.isPlayer ? 0.5 : U.rngf(0.4, 0.6));
                b.x = cx + Math.cos(ang) * rr; b.y = cy + Math.sin(ang) * rr;
                b.startX = b.x; b.startY = b.y;
                b.lane = ang; b.skill = b.isPlayer ? 1 : U.rngf(0.38, 0.75);
                b.facing = ang + Math.PI;
            });

            r.onUpdate = (rr, dt) => { sweep.speed += dt * 0.05; };
        },

        // ---- additional levels (built from the shared helpers) -------
        hammerAlley(r) {            // RACE — a gauntlet of wrecking balls
            Rounds._raceCommon(r);
            r.obstacles.push(new Hammer({ cx: 640, cy: 2120, amp: 330, headR: 34, speed: 1.6, power: 540 }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 1760, amp: 300, headR: 32, speed: -1.9, phase: 1, power: 540 }));
            r.obstacles.push(new Spinner({ cx: 640, cy: 1420, len: 250, thick: 20, speed: 1.5, power: 360, color: '#7b46d6' }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 1060, amp: 330, headR: 34, speed: 2.0, phase: 0.6, power: 540 }));
            r.obstacles.push(new Hammer({ cx: 480, cy: 700, amp: 240, headR: 30, speed: -2.2, power: 520 }));
            r.obstacles.push(new Hammer({ cx: 820, cy: 560, amp: 240, headR: 30, speed: 2.3, phase: 1.5, power: 520 }));
            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },
        spinnerSprint(r) {          // RACE — dense spinning bars
            Rounds._raceCommon(r);
            [2100, 1820, 1540, 1260, 980, 700].forEach((y, i) =>
                r.obstacles.push(new Spinner({ cx: i % 2 ? 470 : 820, cy: y, len: 230, thick: 18,
                    speed: i % 2 ? 1.7 : -1.7, power: 350, color: i % 2 ? '#23d6c8' : '#ff5fa2' })));
            r.obstacles.push(new Spinner({ cx: 640, cy: 1680, len: 250, thick: 20, speed: 1.3, power: 360, color: '#7b46d6' }));
            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },
        pinballRun(r) {             // RACE — bounce pads + spinners chaos
            Rounds._raceCommon(r);
            for (const [x, y] of [[470, 2000], [810, 2000], [640, 1700], [470, 1400], [810, 1400], [640, 1100]])
                r.obstacles.push(new BouncePad({ x, y, r: 42 }));
            r.obstacles.push(new Spinner({ cx: 640, cy: 1850, len: 240, thick: 20, speed: 1.5, power: 340, color: '#ffd23f' }));
            r.obstacles.push(new Spinner({ cx: 640, cy: 1250, len: 240, thick: 20, speed: -1.6, power: 340, color: '#ff5fa2' }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 780, amp: 320, headR: 32, speed: 2.0, power: 520 }));
            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },
        dizzyDoors(r) {             // RACE — a maze of doors
            Rounds._raceCommon(r);
            [2150, 1820, 1490, 1160, 830].forEach((y, i) => Rounds._doorWall(r, y, i % 2 ? 2 : 3));
            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },
        theGauntlet(r) {            // RACE — a bit of everything
            Rounds._raceCommon(r);
            Rounds._doorWall(r, 2150, 3);
            r.obstacles.push(new Spinner({ cx: 640, cy: 1850, len: 250, thick: 20, speed: 1.4, power: 360, color: '#7b46d6' }));
            r.obstacles.push(new Hammer({ cx: 640, cy: 1520, amp: 320, headR: 32, speed: 1.9, power: 540 }));
            r.obstacles.push(new BouncePad({ x: 470, y: 1250, r: 42 }));
            r.obstacles.push(new BouncePad({ x: 810, y: 1250, r: 42 }));
            Rounds._doorWall(r, 980, 2);
            r.obstacles.push(new Spinner({ cx: 470, cy: 660, len: 190, thick: 18, speed: 1.7, power: 340, color: '#23d6c8' }));
            r.obstacles.push(new Spinner({ cx: 820, cy: 660, len: 190, thick: 18, speed: -1.7, power: 340, color: '#23d6c8' }));
            Rounds._spawnRows(r, r.maxY - 230, r.cx);
        },
        jumpShowdown(r) {           // SURVIVAL — fast sweeper, smaller ring
            Rounds._arena(r, 280);
            const s = Rounds._sweeper(r, { speed: 1.0, power: 520 }); r.sweeper = s;
            Rounds._spawnRing(r);
            r.onUpdate = (rr, dt) => { s.speed += dt * 0.09; };
        },
        doubleSweep(r) {            // SURVIVAL — two counter-rotating bars
            Rounds._arena(r, 300);
            const s1 = Rounds._sweeper(r, { speed: 0.8, angle: -Math.PI / 2, color: '#ffd23f' }); r.sweeper = s1;
            const s2 = Rounds._sweeper(r, { speed: -1.0, angle: 0, color: '#ff5fa2', len: r.platform.r - 70 });
            Rounds._spawnRing(r);
            r.onUpdate = (rr, dt) => { s1.speed += dt * 0.05; s2.speed -= dt * 0.05; };
        },
        springStorm(r) {            // SURVIVAL — sweeper + a field of springs
            const A = Rounds._arena(r, 300);
            const s = Rounds._sweeper(r, { speed: 0.85, color: '#ff5fa2' }); r.sweeper = s;
            for (const [px, py] of [[A.cx - 130, A.cy - 70], [A.cx + 130, A.cy - 70], [A.cx, A.cy + 140],
                                    [A.cx - 110, A.cy + 80], [A.cx + 110, A.cy + 80], [A.cx, A.cy - 150]])
                r.obstacles.push(new BouncePad({ x: px, y: py, r: 40 }));
            Rounds._spawnRing(r);
            r.onUpdate = (rr, dt) => { s.speed += dt * 0.05; };
        },
        hexBlitz(r) {               // FINAL — tighter arena, faster decay
            r.kind = 'final'; r.camMode = 'fixed';
            r.minX = 320; r.maxX = 960; r.minY = 150; r.maxY = 610; r.thinkFn = hexThink;
            Rounds._hexField(r, 30, 46, 40);
            r.onUpdate = (rr, dt) => {
                rr._decayT = (rr._decayT || 0) - dt;
                if (rr.elapsed > 10 && rr._decayT <= 0) {
                    rr._decayT = Math.max(0.12, 0.8 - (rr.elapsed - 10) * 0.02);
                    const s = rr.tiles.filter(t => t.state === 'solid'); if (s.length) U.pick(s).step();
                }
            };
        },
        hexGiant(r) {               // FINAL — sprawling arena
            r.kind = 'final'; r.camMode = 'fixed';
            r.minX = 240; r.maxX = 1040; r.minY = 110; r.maxY = 650; r.thinkFn = hexThink;
            Rounds._hexField(r, 34, 50, 44);
            r.onUpdate = (rr, dt) => {
                rr._decayT = (rr._decayT || 0) - dt;
                if (rr.elapsed > 18 && rr._decayT <= 0) {
                    rr._decayT = Math.max(0.18, 1.1 - (rr.elapsed - 18) * 0.02);
                    const s = rr.tiles.filter(t => t.state === 'solid'); if (s.length) U.pick(s).step();
                }
            };
        },
    },
};

/* =====================================================================
   Shared course decoration helpers
   ===================================================================== */
function drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g.addColorStop(0, PAL.skyTop); g.addColorStop(1, PAL.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
}
function drawSlime(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g.addColorStop(0, PAL.slime); g.addColorStop(1, PAL.slimeDark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) {
        const t = (Date.now() / 1000 + i) % 8;
        ctx.beginPath(); ctx.ellipse((i * 173 % CFG.W), (t * 90) % CFG.H, 18, 9, 0, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
}
function drawTrackEdges(ctx, cam, r) {
    ctx.fillStyle = PAL.trackEdge;
    ctx.fillRect(r.minX - cam.x - 14, r.minY - cam.y, 14, r.maxY - r.minY);
    ctx.fillRect(r.maxX - cam.x, r.minY - cam.y, 14, r.maxY - r.minY);
    // dashed centre guide
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.setLineDash([18, 22]);
    ctx.beginPath(); ctx.moveTo(r.cx - cam.x, r.minY - cam.y); ctx.lineTo(r.cx - cam.x, r.maxY - cam.y); ctx.stroke();
    ctx.setLineDash([]);
}
function drawFinishBanner(ctx, cam, r) {
    const y = r.finishY - cam.y;
    // checker line
    const sq = 22;
    for (let i = 0; i * sq < (r.maxX - r.minX); i++) {
        ctx.fillStyle = i & 1 ? '#222' : '#fff';
        ctx.fillRect(r.minX - cam.x + i * sq, y, sq, sq);
        ctx.fillStyle = i & 1 ? '#fff' : '#222';
        ctx.fillRect(r.minX - cam.x + i * sq, y + sq, sq, sq);
    }
    U.text(ctx, 'FINISH', r.cx - cam.x, y - 26, '900 40px system-ui', PAL.gold, 'center', PAL.ink, 7);
}
function drawStartGate(ctx, cam, r) {
    const y = (r.maxY - 150) - cam.y;
    ctx.fillStyle = PAL.purple;
    ctx.fillRect(r.minX - cam.x, y, r.maxX - r.minX, 12);
    U.text(ctx, 'START', r.cx - cam.x, y + 34, '800 22px system-ui', '#fff', 'center', PAL.ink, 5);
}
function drawDisk(ctx, cx, cy, R, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, R, R, 0, 0, 6.283); ctx.fill();
    const g = ctx.createRadialGradient(cx, cy - 40, 30, cx, cy, R);
    g.addColorStop(0, U.shade(color, 0.25)); g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    ctx.strokeStyle = U.shade(color, -0.3); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
}
