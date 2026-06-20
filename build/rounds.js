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
        this.kind = 'race';        // race | survival | final | tag | tiptoe | mountain
        this.viewKind = null;      // which CourseView to build (defaults to kind)
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
        this.slimeY = null;        // Slime Climb: world-y of the rising slime line
        this.slimeRate = 0;
        this.matchSafe = -1;       // Perfect Match: the currently-called fruit (-1 = memorise)
        this.matchPhase = null;
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

        // Collisions + falling only during LIVE play ('go'): never during the
        // ending beat (so a qualified bean can't get knocked out after it has
        // already qualified), and after a brief spawn immunity.
        if (this.phase === 'go' && this.elapsed > 0.6)
            for (const o of this.obstacles)
                for (const b of this.beans) if (!b.gone && !b.exited && o.collide) o.collide(b, this, dt);

        this._separate();
        if (this.kind === 'tag' && this.phase === 'go') this._tagSteals();
        if (this.phase === 'go')
            for (const b of this.beans) this._bounds(b);
    }

    // Tail Tag: a tail-less bean pressing grab near a tail-holder steals it.
    _tagSteals() {
        for (const b of this.beans) {
            if (b.gone || b.exited || b.falling || b.hasTail || b.tagCd > 0) continue;
            const want = b.isPlayer ? (Input.grabPressed || Input.grab) : b.ai.grab;
            if (!want) continue;
            let best = null, bd = CFG.GRAB_RANGE * 1.25;
            for (const o of this.beans) {
                if (o === b || !o.hasTail || o.falling || o.gone || o.exited) continue;
                const d = U.dist(b.x, b.y, o.x, o.y);
                if (d < bd) { bd = d; best = o; }
            }
            if (best) {
                best.hasTail = false; b.hasTail = true; b.tailColor = best.tailColor;
                best.ragdoll = Math.max(best.ragdoll, 0.45); best.everRagdolled = true;
                best.tagCd = 1.1; b.tagCd = 0.7;
                this.spawnBurst(b.x, b.y, 22, b.tailColor, 12);
            }
        }
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
        if (this.kind === 'race' || this.kind === 'mountain' || this.kind === 'climb') {
            const lo = this.minX + bean.r, hi = this.maxX - bean.r;
            if (bean.x < lo) { bean.x = lo; if (bean.vx < 0) bean.vx *= -0.2; }
            if (bean.x > hi) { bean.x = hi; if (bean.vx > 0) bean.vx *= -0.2; }
            if (bean.y > this.maxY - bean.r) bean.y = this.maxY - bean.r;
        } else if (this.kind === 'survival') {
            if (bean.grounded && U.dist(bean.x, bean.y, this.platform.cx, this.platform.cy) > this.platform.r)
                bean.startFall();
        } else if (this.kind === 'tag') {
            // Tail Tag is a walled arena — nobody falls off; clamp to the rim.
            const P = this.platform, dx = bean.x - P.cx, dy = bean.y - P.cy, d = Math.hypot(dx, dy) || 1;
            const lim = P.r - bean.r;
            if (d > lim) { bean.x = P.cx + dx / d * lim; bean.y = P.cy + dy / d * lim; bean.vx *= 0.3; bean.vy *= 0.3; }
        } else if (this.kind === 'tiptoe') {
            // fall when off all tiles, or when you step on a fake (it drops away)
            if (bean.x < this.minX - 30 || bean.x > this.maxX + 30 || bean.y < this.minY - 60) {
                if (bean.grounded) bean.startFall(); return;
            }
            const t = this._tileAt(bean.x, bean.y);
            if (!t) { if (bean.grounded) bean.startFall(); }
            else if (bean.grounded && t.fake && t.state === 'solid') { t.step(); bean.startFall(); }
        } else if (this.kind === 'match') {
            // fall when standing off any solid tile (e.g. a tile that just dropped)
            if (bean.grounded && !this._tileAt(bean.x, bean.y)) bean.startFall();
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
        if (this.kind === 'race' || this.kind === 'tiptoe') {
            for (const b of this.beans)
                if (b.alive && !b.finished && !b.gone && b.y <= this.finishY) this.markFinish(b);
            if (this.elapsed > CFG.ROUND_MAXTIME) this._raceCutoff();
        } else if (this.kind === 'climb') {
            // a race against a rising tide of slime: finish to qualify, but get
            // caught below the slime line and you sink.
            if (this.elapsed > 2.5) this.slimeY -= this.slimeRate * dt;
            for (const b of this.beans) {
                if (b.alive && !b.finished && !b.gone && b.y <= this.finishY) this.markFinish(b);
                else if (b.alive && !b.finished && !b.eliminated && !b.falling && b.y > this.slimeY) {
                    b.startFall(); this.spawnBurst(b.x, b.y, 0, '#d23bb0', 8);
                }
            }
            if (this.elapsed > CFG.ROUND_MAXTIME || this.aliveSoFar() === 0) this._raceCutoff();
        } else if (this.kind === 'mountain') {
            // a racing FINAL — first bean to the crown wins it all
            for (const b of this.beans)
                if (b.alive && !b.finished && !b.gone && b.y <= this.finishY) {
                    b.finished = true;
                    if (!this._mtnDone) { this._mtnDone = true; this.spawnConfetti(b); this._finishFinal(b === this.player); }
                }
            if (this.elapsed > CFG.ROUND_MAXTIME && !this._mtnDone) { this._mtnDone = true; this._finishFinal(false); }
        } else if (this.kind === 'match') {
            // the cycle machine (in onUpdate) flips _mPhase to 'done' after the
            // last round; everyone still standing qualifies.
            if (this._mPhase === 'done' || this.elapsed > 70) {
                for (const b of this.beans) if (b.alive && !b.eliminated) { b.qualified = true; b.exited = true; }
                this.qualifyCount = this.beans.filter(b => b.qualified).length;
                this._finish();
            }
        } else if (this.kind === 'tag') {
            this.timer -= dt;
            const tailed = this.beans.filter(b => b.alive && !b.eliminated && b.hasTail).length;
            if (this.timer <= 0) {
                for (const b of this.beans) if (b.alive && !b.eliminated) {
                    if (b.hasTail) { b.qualified = true; b.exited = true; }
                    else { b.eliminated = true; b.alive = false; }
                }
                this.qualifyCount = tailed;
                this._finish();
            }
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
        this.survivors = this.beans.filter(b => b.alive && !b.eliminated);   // snapshot at resolution
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

// ---- Tail Tag (Hunt) --------------------------------------------------
function tagThink(bean, round, dt) {
    const P = round.platform;
    bean.ai.jump = false; bean.ai.grab = false; bean.ai.dive = false;
    if (bean.hasTail) {
        // flee the nearest tail-less chaser, hugging the platform centre
        let cx = 0, cy = 0;
        for (const o of round.beans) {
            if (o === bean || o.hasTail || o.gone || o.exited || o.falling) continue;
            const d = U.dist(bean.x, bean.y, o.x, o.y);
            if (d < 260) { cx += (bean.x - o.x) / (d || 1); cy += (bean.y - o.y) / (d || 1); }
        }
        const tox = P.cx - bean.x, toy = P.cy - bean.y, dl = Math.hypot(tox, toy) || 1;
        const edge = dl / P.r;                              // pull harder toward centre near the rim
        let mx = cx + tox / dl * (0.4 + edge * 0.9), my = cy + toy / dl * (0.4 + edge * 0.9);
        const ml = Math.hypot(mx, my) || 1; bean.ai.mx = mx / ml; bean.ai.my = my / ml;
        if (U.chance(0.01)) bean.ai.dive = true;            // occasional juke
    } else {
        // hunt the nearest tail-holder and grab it
        let best = null, bd = 1e9;
        for (const o of round.beans) {
            if (!o.hasTail || o.gone || o.exited || o.falling) continue;
            const d = U.dist(bean.x, bean.y, o.x, o.y);
            if (d < bd) { bd = d; best = o; }
        }
        if (best) {
            let dx = best.x - bean.x, dy = best.y - bean.y; const dl = Math.hypot(dx, dy) || 1;
            bean.ai.mx = dx / dl; bean.ai.my = dy / dl;
            bean.ai.grab = bd < CFG.GRAB_RANGE * (1.0 + bean.skill * 0.6);
            if (bd < 130 && bd > 50 && U.chance(0.02)) bean.ai.dive = true;   // lunge for the steal
        } else { bean.ai.mx = 0; bean.ai.my = 0; }
    }
}

// ---- Tip Toe (Logic) --------------------------------------------------
function tiptoeThink(bean, round, dt) {
    // hop tile-to-tile: among ADJACENT tiles (so we never cut a diagonal over a
    // gap), pick the one that's most "forward" (lower y) and real. Clumsy beans
    // occasionally misjudge a fake.
    let best = null, bestScore = -1e9;
    const dodge = 900 * (0.55 + bean.skill * 0.6);
    for (const t of round.tiles) {
        if (t.state !== 'solid') continue;
        const dx = t.cx - bean.x, dy = t.cy - bean.y, d = Math.hypot(dx, dy);
        if (d < 6 || d > 84) continue;                 // adjacent neighbours only
        let score = (bean.y - t.cy) + U.rngf(-4, 4);   // forward = lower y
        if (t.fake) score -= dodge;
        if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best) { const dx = best.cx - bean.x, dy = best.cy - bean.y, dl = Math.hypot(dx, dy) || 1;
        bean.ai.mx = dx / dl; bean.ai.my = dy / dl; }
    else { bean.ai.mx = 0; bean.ai.my = -0.5; }
    if (U.chance((0.6 - bean.skill) * 0.015)) { bean.ai.mx *= 0.15; bean.ai.my *= 0.15; }  // hesitation
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
}

// ---- Perfect Match (Logic) --------------------------------------------
function matchThink(bean, round, dt) {
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
    if (round._mPhase === 'drop') { bean.ai.mx = 0; bean.ai.my = 0; return; }   // freeze — hold your tile as the floor drops
    if (round.matchSafe >= 0 && round._mPhase === 'answer') {
        const cur = round._tileAt(bean.x, bean.y);
        if (cur && cur.state === 'solid' && cur.fruit === round.matchSafe) { bean.ai.mx = 0; bean.ai.my = 0; return; }  // already safe
        if (U.chance(0.7 + bean.skill * 0.3)) {        // react to the called fruit
            let best = null, bd = 1e9;
            for (const t of round.tiles) {
                if (t.state !== 'solid' || t.fruit !== round.matchSafe) continue;
                const d = U.dist(bean.x, bean.y, t.cx, t.cy);
                if (d < bd) { bd = d; best = t; }
            }
            if (best) { const dx = best.cx - bean.x, dy = best.cy - bean.y, dl = Math.hypot(dx, dy) || 1;
                bean.ai.mx = dx / dl; bean.ai.my = dy / dl; return; }
        }
    }
    // otherwise mill around the board
    const cx = (round.minX + round.maxX) / 2, cy = (round.minY + round.maxY) / 2;
    if (U.chance(0.02) || (bean.aiTarget.x === 0 && bean.aiTarget.y === 0)) {
        bean.aiTarget.x = cx + U.rngf(-160, 160); bean.aiTarget.y = cy + U.rngf(-120, 120);
    }
    const dx = bean.aiTarget.x - bean.x, dy = bean.aiTarget.y - bean.y, dl = Math.hypot(dx, dy) || 1;
    bean.ai.mx = dx / dl * 0.45; bean.ai.my = dy / dl * 0.45;
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
        r.minY = 240; r.maxY = 3820; r.finishY = 420;     // long, multi-section course
        r.thinkFn = raceThink;
    },
    // ----- course SECTION helpers (real Fall Guys courses string several of
    // these together so every stretch plays differently) ---------------------
    _xs(r, n, i, pad) { pad = pad || 160; return n <= 1 ? r.cx : U.lerp(r.minX + pad, r.maxX - pad, i / (n - 1)); },
    _beams(r, y, o) {                                  // a row of spinning beams / blades / windmills
        o = o || {}; const n = o.n || 2, sp = o.speed != null ? o.speed : 1.4;
        for (let i = 0; i < n; i++)
            r.obstacles.push(new Spinner({ cx: this._xs(r, n, i, o.pad), cy: y, len: o.len || 210,
                thick: o.thick || 20, speed: (i % 2 ? -sp : sp), power: o.power || 360,
                color: o.color || '#7b46d6', style: o.style || 'bar' }));
    },
    _bumpers(r, y, o) {                                // a staggered field of pinball bumpers
        o = o || {}; const rows = o.rows || 2, cols = o.cols || 3, gap = o.gap || 130;
        for (let j = 0; j < rows; j++)
            for (let i = 0; i < cols; i++) {
                const off = (j % 2) * (((r.maxX - r.minX) / cols) / 2);
                r.obstacles.push(new Bumper({ x: U.clamp(this._xs(r, cols, i, 130) + off, r.minX + 50, r.maxX - 50),
                    y: y - j * gap, r: o.r || 36, power: o.power || 320, color: o.color || '#ffd23f' }));
            }
    },
    _conveyor(r, y0, y1, o) {                          // a treadmill across the lane
        o = o || {};
        r.obstacles.push(new Conveyor({ x0: r.minX + 12, x1: r.maxX - 12, y0, y1,
            dx: o.dx || 0, dy: o.dy != null ? o.dy : 1, push: o.push || 120, color: o.color || '#46d36a' }));
    },
    _blocks(r, y, o) {                                 // sliding wall blocks across the lane
        o = o || {}; const n = o.n || 2, gap = o.gap || 150;
        for (let i = 0; i < n; i++)
            r.obstacles.push(new MovingBlock({ cy: y - i * gap, x0: r.minX + 70, x1: r.maxX - 70,
                w: o.w || 150, thick: 42, speed: o.speed || 150, dir: i % 2 ? -1 : 1,
                cx: i % 2 ? r.maxX - 70 : r.minX + 70, color: o.color || '#b06bff' }));
    },
    _cannons(r, y, o) {                                // cannons lobbing boulders down-course
        o = o || {}; const n = o.n || 2;
        for (let i = 0; i < n; i++)
            r.obstacles.push(new Cannon({ x: this._xs(r, n, i, 170), y, interval: o.interval || 2.2,
                phase: i * 0.8, speed: o.speed || 320, ballR: o.ballR || 26, spread: o.spread || 120,
                reach: o.reach || 1500, color: o.color || '#e6395a' }));
    },
    _axes(r, y, o) {                                   // swinging axes (Knight Fever)
        o = o || {}; const n = o.n || 1, gap = o.gap || 230;
        for (let i = 0; i < n; i++)
            r.obstacles.push(new Hammer({ cx: r.cx, cy: y - i * gap, amp: o.amp || 320, headR: 30,
                speed: (i % 2 ? -1 : 1) * (o.speed || 1.9), phase: i * 1.1, power: 540, style: o.style || 'axe' }));
    },
    _hammers(r, y, o) {                                // wrecking-ball hammers
        o = o || {}; const n = o.n || 1, gap = o.gap || 240;
        for (let i = 0; i < n; i++)
            r.obstacles.push(new Hammer({ cx: r.cx, cy: y - i * gap, amp: o.amp || 320, headR: 33,
                speed: (i % 2 ? -1 : 1) * (o.speed || 1.8), phase: i * 0.9, power: o.power || 540 }));
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
    // hand out tails to a fraction of the field (the rest must steal one)
    _dealTails(r, frac) {
        const cols = ['#ff5fa2', '#ffd23f', '#5ad1ff', '#46d36a', '#b06bff', '#ff9447'];
        const order = U.shuffle(r.beans.slice());
        const nTails = U.clamp(Math.round(r.beans.length * frac), 2, r.beans.length - 1);
        order.forEach((b, i) => { b.hasTail = i < nTails; b.tailColor = cols[i % cols.length]; b.tagCd = 0; });
        r.qualifyCount = nTails;
    },
    // a grid of stepping-stone tiles over slime; hidden fakes drop away when
    // stepped on. Spacing is derived from tile size so neighbours OVERLAP (the
    // safe path is continuous), and the path's lateral steps are kept solid so
    // it's always traversable.
    _tipToeField(r, cols, rows, fakeChance) {
        r.kind = 'tiptoe'; r.viewKind = 'final'; r.camMode = 'fixed'; r.thinkFn = tiptoeThink;
        r.tiles = [];
        const size = 42, stepX = 52, stepY = 50;       // tight overlap → continuous path
        const gridW = (cols - 1) * stepX, gridH = (rows - 1) * stepY;
        const cx = 640, x0 = cx - gridW / 2, yBot = 250 + gridH, yTop = 250;
        let safe = Math.floor(cols / 2), prevSafe = safe;
        for (let ry = 0; ry < rows; ry++) {
            const y = yBot - ry * stepY;
            const edgeRow = (ry === 0 || ry === rows - 1);
            prevSafe = safe;
            if (!edgeRow) safe = U.clamp(safe + U.rng(-1, 1), 0, cols - 1);
            const keep = new Set([safe, prevSafe]);          // L-shaped step stays solid
            for (let cxi = 0; cxi < cols; cxi++) {
                const x = x0 + cxi * stepX;
                const fake = !edgeRow && !keep.has(cxi) && U.chance(fakeChance);
                const t = new HexTile({ cx: x, cy: y, size, color: edgeRow ? '#ffd23f' : '#8fd0ff' });
                t.fake = fake;                                // hidden — looks identical to a real tile
                r.tiles.push(t);
            }
        }
        r.minX = x0 - size; r.maxX = x0 + gridW + size;
        r.minY = yTop - size; r.maxY = yBot + size;
        r.finishY = yTop + size * 0.5;                       // crossing the top (gold) row qualifies
        const startTiles = r.tiles.filter(t => t.cy > yBot - 2);
        r.beans.forEach((b, i) => {
            const t = startTiles[i % startTiles.length];
            b.x = t.cx + U.rngf(-5, 5); b.y = t.cy; b.startX = b.x; b.startY = b.y;
            b.facing = -Math.PI / 2; b.skill = b.isPlayer ? 1 : U.rngf(0.3, 0.72);
        });
        r.qualifyCount = Math.max(3, Math.round(r.beans.length * 0.6));
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
        doorDash(r) {                       // RACE — walls of doors, smash the fakes
            Rounds._raceCommon(r);
            Rounds._doorWall(r, 3340, 2);
            Rounds._doorWall(r, 2980, 3);
            Rounds._bumpers(r, 2560, { rows: 2, cols: 4, color: '#ff5fa2' });
            Rounds._doorWall(r, 2150, 2);
            Rounds._beams(r, 1760, { n: 2, speed: 1.3, color: '#7b46d6' });
            Rounds._doorWall(r, 1360, 3);
            Rounds._doorWall(r, 980, 2);
            Rounds._bumpers(r, 640, { rows: 1, cols: 3, color: '#ffd23f' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },

        // -------------------------------------------------- THE WHIRLYGIG
        whirlygig(r) {                      // RACE — beams, treadmills, giant windmill
            Rounds._raceCommon(r);
            Rounds._beams(r, 3360, { n: 3, style: 'bar', speed: 1.4, color: '#7b46d6' });
            Rounds._beams(r, 3000, { n: 2, style: 'bar', speed: -1.5, color: '#23d6c8' });
            Rounds._bumpers(r, 2620, { rows: 2, cols: 5, color: '#ffd23f' });
            Rounds._beams(r, 2250, { n: 1, style: 'blade', speed: 1.0, len: 260, color: '#ff5fa2' });
            Rounds._conveyor(r, 1900, 2090, { dy: 1, push: 120 });
            Rounds._beams(r, 1620, { n: 3, style: 'blade', speed: 2.0, color: '#ff5fa2' });
            Rounds._beams(r, 1230, { n: 2, style: 'bar', speed: -1.7, color: '#23d6c8' });
            Rounds._beams(r, 760, { n: 1, style: 'windmill', speed: 0.8, len: 330, thick: 32, color: '#7b46d6' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
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
        gateCrash(r) {                      // RACE — doors interleaved with beams & hammers
            Rounds._raceCommon(r);
            Rounds._doorWall(r, 3340, 3);
            Rounds._beams(r, 2980, { n: 2, speed: 1.4, color: '#7b46d6' });
            Rounds._doorWall(r, 2560, 2);
            Rounds._hammers(r, 2150, { n: 1, speed: 1.8 });
            Rounds._beams(r, 1820, { n: 2, speed: -1.6, color: '#23d6c8' });
            Rounds._doorWall(r, 1420, 3);
            Rounds._bumpers(r, 1050, { rows: 2, cols: 4, color: '#ff5fa2' });
            Rounds._doorWall(r, 660, 2);
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
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

        // -------------------------------------------------- DIZZY HEIGHTS
        dizzyHeights(r) {                   // RACE — spinning platforms + fruit cannons
            Rounds._raceCommon(r);
            Rounds._beams(r, 3360, { n: 2, style: 'blade', speed: 1.5, len: 240, color: '#23d6c8' });
            Rounds._cannons(r, 3050, { n: 2, interval: 2.0, speed: 340, reach: 1600, color: '#ff9447' });
            Rounds._bumpers(r, 2650, { rows: 2, cols: 5, color: '#ffd23f' });
            Rounds._beams(r, 2250, { n: 3, style: 'bar', speed: -1.7, color: '#7b46d6' });
            Rounds._cannons(r, 1950, { n: 2, interval: 2.2, speed: 320, reach: 1400, color: '#ff5fa2' });
            Rounds._beams(r, 1500, { n: 2, style: 'blade', speed: 2.0, color: '#23d6c8' });
            Rounds._bumpers(r, 1050, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._beams(r, 680, { n: 1, style: 'windmill', speed: 0.9, len: 320, thick: 30, color: '#7b46d6' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- FRUIT CHUTE
        fruitChute(r) {                     // RACE — climb the belts under a fruit barrage
            Rounds._raceCommon(r);
            Rounds._cannons(r, 3300, { n: 3, interval: 1.8, speed: 360, reach: 2400, spread: 150, color: '#ff9447' });
            Rounds._conveyor(r, 2900, 3150, { dy: 1, push: 135, color: '#46d36a' });
            Rounds._bumpers(r, 2550, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._conveyor(r, 2050, 2350, { dy: 1, push: 140, color: '#5ad1ff' });
            Rounds._cannons(r, 1750, { n: 2, interval: 1.9, speed: 340, reach: 1500, color: '#ff5fa2' });
            Rounds._conveyor(r, 1150, 1420, { dy: 1, push: 135, color: '#46d36a' });
            Rounds._bumpers(r, 760, { rows: 1, cols: 3, color: '#ffd23f' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- HIT PARADE
        hitParade(r) {                      // RACE — the everything gauntlet
            Rounds._raceCommon(r);
            Rounds._doorWall(r, 3360, 3);
            Rounds._beams(r, 3000, { n: 2, speed: 1.5, color: '#7b46d6' });
            Rounds._hammers(r, 2680, { n: 1, speed: 1.9 });
            Rounds._conveyor(r, 2300, 2520, { dy: 1, push: 125 });
            Rounds._blocks(r, 1980, { n: 2, speed: 160, color: '#b06bff' });
            Rounds._bumpers(r, 1600, { rows: 2, cols: 5, color: '#ffd23f' });
            Rounds._cannons(r, 1250, { n: 2, interval: 2.1, speed: 330, reach: 1200, color: '#e6395a' });
            Rounds._beams(r, 820, { n: 1, style: 'windmill', speed: 0.9, len: 320, thick: 30, color: '#23d6c8' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- KNIGHT FEVER
        knightFever(r) {                    // RACE — swinging axes, sliding blocks, bumpers
            Rounds._raceCommon(r);
            Rounds._axes(r, 3320, { n: 2, speed: 1.9, gap: 300 });
            Rounds._bumpers(r, 2850, { rows: 2, cols: 4, color: '#e6395a' });
            Rounds._blocks(r, 2450, { n: 2, speed: 170, color: '#9a6cff' });
            Rounds._axes(r, 2050, { n: 2, speed: -2.1, gap: 300 });
            Rounds._conveyor(r, 1650, 1850, { dy: 1, push: 130, color: '#7b46d6' });
            Rounds._blocks(r, 1300, { n: 3, speed: 180, gap: 130, color: '#9a6cff' });
            Rounds._axes(r, 820, { n: 2, speed: 2.2, gap: 280 });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        jumpShowdown(r) {           // SURVIVAL — fast sweeper, smaller ring
            Rounds._arena(r, 280);
            const s = Rounds._sweeper(r, { speed: 1.0, power: 520 }); r.sweeper = s;
            Rounds._spawnRing(r);
            r.onUpdate = (rr, dt) => { s.speed += dt * 0.09; };
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

        hexRoyale(r) {              // FINAL — medium honeycomb
            r.kind = 'final'; r.camMode = 'fixed';
            r.minX = 280; r.maxX = 1000; r.minY = 130; r.maxY = 630; r.thinkFn = hexThink;
            Rounds._hexField(r, 32, 48, 42);
            r.onUpdate = (rr, dt) => {
                rr._decayT = (rr._decayT || 0) - dt;
                if (rr.elapsed > 14 && rr._decayT <= 0) {
                    rr._decayT = Math.max(0.16, 1.0 - (rr.elapsed - 14) * 0.02);
                    const s = rr.tiles.filter(t => t.state === 'solid'); if (s.length) U.pick(s).step();
                }
            };
        },
        honeycomb(r) {              // FINAL — dense little tiles
            r.kind = 'final'; r.camMode = 'fixed';
            r.minX = 300; r.maxX = 980; r.minY = 140; r.maxY = 620; r.thinkFn = hexThink;
            Rounds._hexField(r, 28, 42, 38);
            r.onUpdate = (rr, dt) => {
                rr._decayT = (rr._decayT || 0) - dt;
                if (rr.elapsed > 12 && rr._decayT <= 0) {
                    rr._decayT = Math.max(0.14, 0.9 - (rr.elapsed - 12) * 0.02);
                    const s = rr.tiles.filter(t => t.state === 'solid'); if (s.length) U.pick(s).step();
                }
            };
        },

        // ============================================ NEW GAMEMODES ===
        // -------- FALL MOUNTAIN (racing FINAL — first to the crown wins)
        fallMountain(r) {           // FINAL race — climb past cannons to grab the Crown
            Rounds._raceCommon(r);
            r.kind = 'mountain'; r.viewKind = 'race'; r.crownFinish = true; r.finishY = 360;
            Rounds._beams(r, 3320, { n: 2, speed: 1.5, color: '#7b46d6' });
            Rounds._cannons(r, 2950, { n: 2, interval: 1.9, speed: 360, reach: 2400, spread: 150, color: '#e6395a' });
            Rounds._bumpers(r, 2500, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._beams(r, 2050, { n: 3, speed: -1.7, color: '#7b46d6' });
            Rounds._cannons(r, 1650, { n: 2, interval: 2.0, speed: 340, reach: 1300, color: '#e6395a' });
            Rounds._hammers(r, 1150, { n: 2, speed: 2.0, gap: 260 });
            Rounds._beams(r, 700, { n: 1, style: 'windmill', speed: 0.9, len: 320, thick: 30, color: '#e6395a' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        lostTemple(r) {             // FINAL race — doors, hammers & blocks to the Crown
            Rounds._raceCommon(r);
            r.kind = 'mountain'; r.viewKind = 'race'; r.crownFinish = true; r.finishY = 360;
            Rounds._doorWall(r, 3340, 3);
            Rounds._hammers(r, 2950, { n: 2, speed: 1.9, gap: 280 });
            Rounds._blocks(r, 2500, { n: 2, speed: 170, color: '#9a6cff' });
            Rounds._doorWall(r, 2050, 2);
            Rounds._beams(r, 1650, { n: 2, speed: -1.7, color: '#e6395a' });
            Rounds._bumpers(r, 1200, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._hammers(r, 700, { n: 2, speed: 2.2, gap: 240 });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },

        // -------- TAIL TAG (HUNT — hold a tail when the clock runs out)
        tailTag(r) {
            Rounds._arena(r, 335);
            r.kind = 'tag'; r.viewKind = 'survival'; r.thinkFn = tagThink;
            r.timer = r.def.duration || 30;
            Rounds._spawnRing(r);
            Rounds._dealTails(r, 0.58);
        },
        tailChase(r) {              // HUNT — tighter arena, fewer tails, frantic
            Rounds._arena(r, 290);
            r.kind = 'tag'; r.viewKind = 'survival'; r.thinkFn = tagThink;
            r.timer = r.def.duration || 28;
            Rounds._spawnRing(r);
            Rounds._dealTails(r, 0.5);
        },

        // -------- TIP TOE (LOGIC — find the hidden path of real tiles)
        tipToe(r) { Rounds._tipToeField(r, 7, 8, 0.46); },
        tipToeTwins(r) { Rounds._tipToeField(r, 9, 9, 0.52); },   // wider grid, more fakes

        // -------- PERFECT MATCH (LOGIC — dash to the called fruit) -----
        perfectMatch(r) {
            r.kind = 'match'; r.viewKind = 'final'; r.camMode = 'fixed'; r.thinkFn = matchThink;
            r.minX = 300; r.maxX = 980; r.minY = 150; r.maxY = 630;
            r.tiles = [];
            const size = 40, stepX = 58, stepY = 52;
            // only 3 fruits on the board so ~1/3 of tiles always survive a call —
            // a safe tile is always close (forgiving, like the real 2-4 fruit rounds)
            const pal = U.shuffle(FRUITS.map((_, i) => i)).slice(0, 3);
            let row = 0;
            for (let y = r.minY + 30; y <= r.maxY - 20; y += stepY, row++) {
                const off = (row % 2) * (stepX / 2);
                for (let x = r.minX + 40 + off; x <= r.maxX - 30; x += stepX) {
                    const fruit = U.pick(pal);
                    r.tiles.push(new HexTile({ cx: x, cy: y, size, color: FRUITS[fruit].color, fruit }));
                }
            }
            const spots = U.shuffle(r.tiles.slice());
            r.beans.forEach((b, i) => {
                const t = spots[i % spots.length];
                b.x = t.cx; b.y = t.cy; b.startX = b.x; b.startY = b.y;
                b.skill = b.isPlayer ? 1 : U.rngf(0.3, 0.72); b.facing = U.rngf(0, 6.28);
                b.aiTarget = { x: 0, y: 0 };
            });
            // cycle machine: memorise → call a fruit → drop the rest → restore
            r._mPhase = 'show'; r._mT = 4.5; r._mCycle = 0; r.matchSafe = -1; r.matchPhase = 'memorise';
            r.onUpdate = (rr, dt) => {
                rr._mT -= dt;
                if (rr._mPhase === 'show') {
                    rr.matchSafe = -1; rr.matchPhase = 'memorise';
                    if (rr._mT <= 0) {
                        const present = [...new Set(rr.tiles.filter(t => t.state === 'solid').map(t => t.fruit))];
                        rr.matchSafe = present.length ? U.pick(present) : 0;
                        rr._mPhase = 'answer'; rr._mT = 5.0; rr.matchPhase = 'answer';
                    }
                } else if (rr._mPhase === 'answer') {
                    if (rr._mT <= 0) {
                        for (const t of rr.tiles) if (t.state === 'solid' && t.fruit !== rr.matchSafe) t.step();
                        rr._mPhase = 'drop'; rr._mT = 1.2; rr.matchPhase = 'drop';
                    }
                } else if (rr._mPhase === 'drop') {
                    if (rr._mT <= 0) {
                        rr._mCycle++;
                        if (rr._mCycle >= 3) { rr._mPhase = 'done'; }
                        else { for (const t of rr.tiles) t.restore(); rr._mPhase = 'show'; rr._mT = 4.0; rr.matchSafe = -1; }
                    }
                }
            };
        },

        // -------- SLIME CLIMB (RACE vs a rising tide of slime)
        slimeClimb(r) {
            Rounds._raceCommon(r);
            r.kind = 'climb'; r.viewKind = 'race';
            r.slimeY = r.maxY - 40; r.slimeRate = 42;
            Rounds._blocks(r, 3320, { n: 2, speed: 150, color: '#b06bff' });
            Rounds._cannons(r, 2950, { n: 2, interval: 2.0, speed: 340, reach: 1400, color: '#e6395a' });
            Rounds._hammers(r, 2550, { n: 2, speed: 1.8, gap: 260 });
            Rounds._beams(r, 2150, { n: 2, speed: -1.6, color: '#23d6c8' });
            Rounds._bumpers(r, 1750, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._blocks(r, 1350, { n: 2, speed: 165, color: '#9a6cff' });
            Rounds._hammers(r, 900, { n: 2, speed: 2.0, gap: 240 });
            Rounds._beams(r, 560, { n: 2, speed: 1.7, color: '#ff5fa2' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        slimeScramble(r) {
            Rounds._raceCommon(r);
            r.kind = 'climb'; r.viewKind = 'race';
            r.slimeY = r.maxY - 30; r.slimeRate = 48;
            Rounds._doorWall(r, 3340, 3);
            Rounds._hammers(r, 2950, { n: 2, speed: 1.9, gap: 280 });
            Rounds._cannons(r, 2550, { n: 2, interval: 1.8, speed: 360, reach: 1600, color: '#e6395a' });
            Rounds._beams(r, 2100, { n: 3, speed: -1.8, color: '#7b46d6' });
            Rounds._blocks(r, 1650, { n: 3, speed: 185, gap: 130, color: '#9a6cff' });
            Rounds._bumpers(r, 1150, { rows: 2, cols: 5, color: '#e6395a' });
            Rounds._hammers(r, 650, { n: 2, speed: 2.2, gap: 240 });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
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
