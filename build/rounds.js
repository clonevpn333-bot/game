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
        this.gateRows = [];        // Gate Crash: rows of raise/lower gates [[gate,...],...]
        this.terrain = null;       // optional height profile (slopes/pits) along the course
        this.groundZ = null;       // (x,y) -> floor height; wired from terrain in Rounds.create
        this.platform = null;
        this.sweeper = null;
        this.slimeY = null;        // (legacy) Slime Climb course-y line
        this.slimeZ = null;        // Slime Climb: world-HEIGHT of the rising slime flood
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
        for (const o of this.obstacles) o.update(dt, this);
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
            if (this.openSides) {                          // Big Fans: drift off the side = fall
                if (bean.grounded && (bean.x < this.minX - 6 || bean.x > this.maxX + 6)) bean.startFall();
            } else {
                const lo = this.minX + bean.r, hi = this.maxX - bean.r;
                if (bean.x < lo) { bean.x = lo; if (bean.vx < 0) bean.vx *= -0.2; }
                if (bean.x > hi) { bean.x = hi; if (bean.vx > 0) bean.vx *= -0.2; }
            }
            if (bean.y > this.maxY - bean.r) bean.y = this.maxY - bean.r;
        } else if (this.kind === 'survival') {
            const P = this.platform, g = this.fallGrace || 0;
            if (bean.grounded) {
                if (P.rect) { if (Math.abs(bean.x - P.cx) > P.hw + g || Math.abs(bean.y - P.cy) > P.hh + g) bean.startFall(); }
                else if (U.dist(bean.x, bean.y, P.cx, P.cy) > P.r + g) bean.startFall();
            }
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
            else if (bean.grounded && !t.fake) t.proven = true;   // a real tile someone stood on = known safe
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
            // a climb against a rising FLOOD of slime: out-climb it (height) to the
            // finish, or get caught below the rising surface and sink.
            const climbers = this.beans.filter(b => b.alive && !b.eliminated && !b.exited && !b.finished && !b.falling);
            if (this.elapsed > 2.5) {
                this.slimeZ += this.slimeRate * dt;                 // always creeping up
                if (climbers.length > 1) {                         // …but it chases the pack, swallowing stragglers
                    const zs = climbers.map(b => b.z).sort((a, b) => a - b);
                    const med = zs[Math.floor(zs.length * 0.5)];
                    this.slimeZ = Math.max(this.slimeZ, med - 130);
                }
            }
            for (const b of this.beans) {
                if (b.alive && !b.finished && !b.gone && b.y <= this.finishY) this.markFinish(b);
                else if (b.alive && !b.finished && !b.eliminated && !b.falling && b.z < this.slimeZ - 6) {
                    b.startFall(); this.spawnBurst(b.x, b.y, b.z, '#d23bb0', 8);
                }
            }
            // no finish-quota cutoff: anyone who out-climbs the flood qualifies; the
            // slime culls the rest. End when nobody is still climbing (or time runs out).
            const climbing = this.beans.some(b => b.alive && !b.eliminated && !b.exited && !b.finished && !b.falling);
            if (this.elapsed > CFG.ROUND_MAXTIME || !climbing) this._raceCutoff();
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
            if (this.timer <= 0) {
                if (this._royal) {                       // Royal Fumble FINAL: tail-holder wins the Crown
                    const holder = this.beans.find(b => b.hasTail && b.alive && !b.eliminated);
                    this._finishFinal(holder === this.player);
                } else {
                    const tailed = this.beans.filter(b => b.alive && !b.eliminated && b.hasTail).length;
                    for (const b of this.beans) if (b.alive && !b.eliminated) {
                        if (b.hasTail) { b.qualified = true; b.exited = true; }
                        else { b.eliminated = true; b.alive = false; }
                    }
                    this.qualifyCount = tailed;
                    this._finish();
                }
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
   TERRAIN — a per-course height profile along the race axis (y), so courses
   can climb, drop and have pits instead of being one flat strip. Segments are
   absolute y-spans; the bean's floor height is interpolated across each.
   The race axis runs from maxY (start) down to finishY (finish), so "uphill
   toward the finish" means a HIGHER z at a LOWER y.
   ===================================================================== */
const VOID_Z = -1e5;
class Terrain {
    constructor() { this.segs = []; }                 // [{yLo,yHi,z0,z1,void}] sorted by yLo
    // a level span at height z, for y in [yLo,yHi)
    flat(yLo, yHi, z) { this.segs.push({ yLo, yHi, z0: z, z1: z }); return this; }
    // a ramp: floor = zLo at yLo, zHi at yHi (linear)
    ramp(yLo, yHi, zLo, zHi) { this.segs.push({ yLo, yHi, z0: zLo, z1: zHi }); return this; }
    // a pit / hole — fall straight through
    gap(yLo, yHi) { this.segs.push({ yLo, yHi, void: true }); return this; }
    heightAt(x, y) {
        for (const s of this.segs) {
            if (y < s.yLo || y >= s.yHi) continue;
            if (s.void) return VOID_Z;
            const t = (y - s.yLo) / (s.yHi - s.yLo);
            return s.z0 + (s.z1 - s.z0) * t;
        }
        return 0;                                      // flat ground outside defined segments
    }
    // top of the climb (max height) — handy for camera / cannons.
    topZ() { let m = 0; for (const s of this.segs) if (!s.void) m = Math.max(m, s.z0, s.z1); return m; }
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

// ---- Door Dash --------------------------------------------------------
// The iconic crowd behaviour: each bean commits to a door it can't see through.
// If someone smashes a door open, the crowd surges to it; if a bean bonks a
// solid door it peels off and re-guesses. Skilled beans read the wall-5-7 tell.
function doorThink(bean, round, dt) {
    const ty = round.finishY - 30;
    let wall = null;                                   // nearest wall still ahead
    for (const w of round.doorWalls)
        if (w.y < bean.y - 2 && (!wall || w.y > wall.y)) wall = w;

    let tx;
    if (wall) {
        if (bean._dwWall !== wall) { bean._dwWall = wall; bean._dwX = null; }
        const openX = wall.openNear(bean.x, 230);      // a door someone already smashed
        if (openX != null) tx = openX;
        else {
            if (bean._dwX == null) bean._dwX = wall.guessDoor(bean.skill);
            tx = bean._dwX;
        }
    } else {
        tx = round.cx + bean.lane * 0.12;              // open run to the finish
    }

    let dx = tx - bean.x, dy = ty - bean.y;
    const dl = Math.hypot(dx, dy) || 1;
    bean.ai.mx = dx / dl; bean.ai.my = dy / dl;
    bean.ai.jump = false; bean.ai.grab = false;

    // dive only to burst through a door that's already OPEN right ahead — never
    // dive blindly into a wall (that just ragdolls you and clogs the crowd).
    bean.aiTimer -= dt;
    if (bean.aiTimer <= 0) {
        bean.aiTimer = U.rngf(0.6, 1.4);
        const openX = wall ? wall.openNear(bean.x, 90) : null;
        bean.ai.dive = openX != null && Math.abs(bean.y - wall.y) < 120 && U.chance(0.4 * bean.skill);
    } else bean.ai.dive = false;
}

// ---- Gate Crash ------------------------------------------------------
// Read the next gate row and head for the gate that's most OPEN (and nearby);
// raised gates bounce you, so the crowd naturally flows through whichever is down.
function gateThink(bean, round, dt) {
    const ty = round.finishY - 30;
    let row = null;
    for (const gr of round.gateRows) {
        const gy = gr[0].y;
        if (gy < bean.y - 4 && (!row || gy > row[0].y)) row = gr;
    }
    if (!row) {                                           // past the last gate — run for the line
        const dx = (round.cx + bean.lane * 0.18) - bean.x, dy = ty - bean.y, dl = Math.hypot(dx, dy) || 1;
        bean.ai.mx = dx / dl; bean.ai.my = dy / dl;
        bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
        return;
    }
    // COMMIT to one gate per row (the nearest by x) and ride its cycle — no
    // thrashing between gates. Re-pick only when we reach a new row.
    if (bean._gateRow !== row) { bean._gateRow = row; bean._gate = null; }
    if (!bean._gate) {
        let g0 = null, bd0 = 1e9;
        for (const gg of row) {
            const gx0 = (gg.x0 + gg.x1) / 2, d0 = Math.abs(gx0 - bean.x);
            if (d0 < bd0) { bd0 = d0; g0 = gg; }
        }
        bean._gate = g0;
    }
    const g = bean._gate;
    const gx = (g.x0 + g.x1) / 2;
    // line up with the gate's x and PRESS forward; the gate press-stops you while
    // raised, then you pour straight through the instant it drops.
    const mx = U.clamp((gx - bean.x) / 45, -1, 1);
    bean.ai.mx = mx; bean.ai.my = -1;
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
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

// Block Party: hug the middle (avoid the rim) and flee the path of slide-walls.
// Block Party: line up your X with the gap of the nearest approaching wall,
// and ease back toward the middle so you're not shoved off the back edge.
function blockThink(bean, round, dt) {
    const P = round.platform;
    let wall = null, best = 1e9;
    for (const o of round.obstacles) {
        if (o.kind !== 'slidewall') continue;
        const d = (bean.y - o.y) * o.dir;           // >0 = wall is behind us, sweeping toward us
        if (d > -bean.r - 6 && d < best) { best = d; wall = o; }
    }
    let mx = 0, my = U.clamp((P.cy - bean.y) / 170, -0.55, 0.55);
    if (wall && U.chance(0.5 + bean.skill * 0.5))    // weaker beans react late & get caught
        mx = U.clamp((wall.gapX - bean.x) / 60, -1, 1);
    bean.ai.mx = mx; bean.ai.my = my;
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
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
    // Among ADJACENT solid tiles, pick the most forward REAL one. Smarter beans
    // read the hidden fakes better and dislike dead-ends (no real tile ahead).
    // Keep a forward jitter so the pack fans out instead of dog-piling one
    // column and shoving each other into the gaps.
    const sense = 0.4 + bean.skill * 0.6;              // fake-reading skill
    let best = null, bestScore = -1e9;
    for (const t of round.tiles) {
        if (t.state !== 'solid') continue;
        const dx = t.cx - bean.x, dy = t.cy - bean.y, d = Math.hypot(dx, dy);
        if (d < 6 || d > 84) continue;                 // adjacent neighbours only
        let score = (bean.y - t.cy) + U.rngf(-6, 6);   // forward + spread jitter
        if (t.fake) score -= 1150 * sense;             // sense & avoid the fakes
        if (t.proven) score += 30;                     // mild nudge toward known-safe
        // dead-end avoidance: smarter beans avoid a tile with no REAL tile ahead
        let hasAhead = false;
        for (const t2 of round.tiles) {
            if (t2.state === 'solid' && !t2.fake && t2.cy < t.cy - 8 &&
                Math.hypot(t2.cx - t.cx, t2.cy - t.cy) < 84) { hasAhead = true; break; }
        }
        if (!hasAhead && t.cy > round.finishY + 30) score -= 80 * sense;
        if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best) { const dx = best.cx - bean.x, dy = best.cy - bean.y, dl = Math.hypot(dx, dy) || 1;
        bean.ai.mx = dx / dl; bean.ai.my = dy / dl; }
    else { bean.ai.mx = 0; bean.ai.my = -0.5; }
    if (U.chance((0.6 - bean.skill * 0.55) * 0.014)) { bean.ai.mx *= 0.15; bean.ai.my *= 0.15; }  // occasional hesitation
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
}

// ---- Perfect Match (Logic) --------------------------------------------
function matchThink(bean, round, dt) {
    bean.ai.jump = false; bean.ai.dive = false; bean.ai.grab = false;
    if (round._mPhase === 'drop') { bean.ai.mx = 0; bean.ai.my = 0; return; }   // freeze — hold your tile as the floor drops
    if (round.matchSafe >= 0 && round._mPhase === 'answer') {
        const cur = round._tileAt(bean.x, bean.y);
        if (cur && cur.state === 'solid' && cur.fruit === round.matchSafe && bean._mLock === cur) {
            bean.ai.mx = (cur.cx - bean.x) / 40; bean.ai.my = (cur.cy - bean.y) / 40; return;  // settle on the safe tile
        }
        // Lock onto ONE target tile for this round. Smart beans pick a correct
        // (safe) tile from the nearest few so the pack spreads out; clumsy beans
        // sometimes MISREMEMBER and lock onto a wrong-fruit tile (and get dropped).
        if (!bean._mLock || bean._mLock.state !== 'solid') {
            if (U.chance(0.6 + bean.skill * 0.4)) {
                const remember = !U.chance(0.45 - bean.skill * 0.4);   // skill → memory
                const pool = [];
                for (const t of round.tiles) {
                    if (t.state !== 'solid') continue;
                    if (remember ? (t.fruit === round.matchSafe) : (t.fruit !== round.matchSafe))
                        pool.push([U.dist2(bean.x, bean.y, t.cx, t.cy), t]);
                }
                if (pool.length) { pool.sort((a, b) => a[0] - b[0]); bean._mLock = pool[U.rng(0, Math.min(pool.length, 5) - 1)][1]; }
            }
        }
        if (bean._mLock) {
            const t = bean._mLock, dx = t.cx - bean.x, dy = t.cy - bean.y, dl = Math.hypot(dx, dy) || 1;
            const ease = U.clamp(dl / 55, 0.18, 1);    // slow as you arrive → settle, don't overshoot
            const sp = ease * (0.7 + bean.skill * 0.3);
            bean.ai.mx = dx / dl * sp; bean.ai.my = dy / dl * sp; return;
        }
    } else { bean._mLock = null; }
    // memorise/show phase: drift toward the board centre so you're ready to dash
    const cx = (round.minX + round.maxX) / 2, cy = (round.minY + round.maxY) / 2;
    if (U.chance(0.02) || (bean.aiTarget.x === 0 && bean.aiTarget.y === 0)) {
        bean.aiTarget.x = cx + U.rngf(-150, 150); bean.aiTarget.y = cy + U.rngf(-110, 110);
    }
    const dx = bean.aiTarget.x - bean.x, dy = bean.aiTarget.y - bean.y, dl = Math.hypot(dx, dy) || 1;
    bean.ai.mx = dx / dl * 0.4; bean.ai.my = dy / dl * 0.4;
}

/* =====================================================================
   COURSE BUILDERS
   ===================================================================== */
const Rounds = {
    create(def, beans) {
        const r = new Round(def, beans);
        Rounds.builders[def.build](r);
        // courses with a height profile expose it to the bean physics
        if (r.terrain && !r.groundZ) r.groundZ = (x, y) => r.terrain.heightAt(x, y);
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
            b.skill = b.isPlayer ? 1 : U.rngf(0.46, 0.86);
        });
    },

    // ---- shared builder helpers --------------------------------------
    _raceCommon(r) {
        r.kind = 'race'; r.camMode = 'followY';
        r.minX = 200; r.maxX = 1080; r.cx = 640;
        r.minY = 240; r.maxY = 3980; r.finishY = 420;     // long, multi-section course
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
    _cannons(r, y, o) {                                // cannons lobbing boulders / giant fruit down-course
        o = o || {}; const n = o.n || 2;
        const fruitCols = ['#e6395a', '#ffd23f', '#ff9447', '#9a6cff', '#46d36a'];
        for (let i = 0; i < n; i++)
            r.obstacles.push(new Cannon({ x: this._xs(r, n, i, 170), y, interval: o.interval || 2.2,
                phase: i * 0.8, speed: o.speed || 320, ballR: o.ballR || 26, spread: o.spread || 120,
                reach: o.reach || 1500, fruit: !!o.fruit,
                color: o.fruit ? fruitCols[i % fruitCols.length] : (o.color || '#e6395a') }));
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
    _plates(r, y, o) {                                 // a row of spinning plates (Dizzy Heights)
        o = o || {}; const cols = o.cols || 3, R = o.R || 150;
        for (let i = 0; i < cols; i++) {
            const x = this._xs(r, cols, i, R * 0.9);
            const dir = (o.dir || 1) * (i % 2 ? -1 : 1);     // adjacent plates spin opposite ways
            r.obstacles.push(new SpinPlate({ cx: x, cy: y, r: R, speed: dir * (o.speed || 0.85),
                fan: !!o.fan, color: o.color || (i % 2 ? '#8fd0ff' : '#b6e6ff') }));
        }
    },
    // A wall of `n` doors with `fakeCount` breakable (smashable) ones. Back-compat:
    // called as _doorWall(r, y, fakeCount) it defaults to 6 doors.
    _doorWall(r, y, n, fakeCount, opts) {
        if (fakeCount === undefined) { fakeCount = n; n = 6; }
        opts = opts || {};
        const x0 = r.minX, x1 = r.maxX, w = (x1 - x0) / n;
        const fakes = new Set();
        while (fakes.size < Math.min(fakeCount, n)) fakes.add(U.rng(0, n - 1));
        const segs = [];
        for (let i = 0; i < n; i++)
            segs.push({ x0: x0 + i * w, x1: x0 + (i + 1) * w, fake: fakes.has(i), broken: false });
        const dw = new DoorWall({ y, x0, x1, segs, tell: !!opts.tell, thick: opts.thick || 30 });
        r.obstacles.push(dw); r.doorWalls.push(dw);
        return dw;
    },
    // A row of `n` raise/lower gates across the lane. `mode` sets the timing logic:
    //   'seq'  — gates open one-at-a-time in a rotating order (forgiving Row 1)
    //   'alt'  — two anti-synced groups (outer pair vs middle); one group open at a time
    //   'inner'— banks where the inner gates open ~3x as often as the outer ones
    _gateRow(r, y, n, opts) {
        opts = opts || {};
        const x0 = r.minX, x1 = r.maxX, w = (x1 - x0) / n;
        const period = opts.period || 3.6, mode = opts.mode || 'seq';
        const row = [];
        for (let i = 0; i < n; i++) {
            let phase = 0, per = period, down = opts.down || 0.34;
            if (mode === 'seq') phase = i / n;                       // rotate the open window
            else if (mode === 'alt') phase = (i === Math.floor((n - 1) / 2) || (n > 3 && i === Math.ceil((n - 1) / 2))) ? 0.5 : 0;  // middle vs outer
            else if (mode === 'inner') {                             // inner gates cycle faster
                const inner = (i >= n * 0.25 && i <= n * 0.75 - 0.01);
                per = inner ? period / 3 : period;
                phase = (i % 2) * 0.5;
            }
            const g = new Gate({ y, x0: x0 + i * w, x1: x0 + (i + 1) * w, thick: opts.thick || 40,
                maxH: opts.maxH || 230, period: per, phase, down });
            r.obstacles.push(g); row.push(g);
        }
        r.gateRows.push(row);
        return row;
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
    _arenaRect(r, hw, hh) {                            // a square/rectangular survival floor
        const cx = 640, cy = 380;
        r.kind = 'survival'; r.camMode = 'fixed';
        r.platform = { cx, cy, rect: true, hw, hh, r: Math.max(hw, hh) };
        r.minX = 0; r.maxX = CFG.W; r.minY = 0; r.maxY = CFG.H;
        return { cx, cy, hw, hh };
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
            b.lane = ang; b.skill = b.isPlayer ? 1 : U.rngf(0.50, 0.88);
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
            b.facing = -Math.PI / 2; b.skill = b.isPlayer ? 1 : U.rngf(0.45, 0.85);
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
            b.skill = b.isPlayer ? 1 : U.rngf(0.40, 0.78);
            b.facing = U.rngf(0, 6.28);
        });
    },

    builders: {
        // -------------------------------------------------- DOOR DASH
        doorDash(r) {                       // RACE — seven walls of doors, smash the breakable ones
            Rounds._raceCommon(r);
            r.thinkFn = doorThink;
            // The whole identity of the course: SEVEN door walls in a row. The
            // door count steps down 7→3 while the breakable count thins out, just
            // like the real level. Walls 5-7 wear a visible "tell" (the real door
            // sits forward of its teeth), which skilled beans can read.
            //   wall:        1   2   3   4   5   6   7
            //   doors:       7   7   7   6   5   4   3
            //   breakable:   5   3   2   2   2   2   1
            const counts    = [7, 7, 7, 6, 5, 4, 3];
            const breakable = [5, 3, 2, 2, 2, 2, 1];
            const yTop = 3380, yStep = 432;
            for (let i = 0; i < counts.length; i++)
                Rounds._doorWall(r, yTop - i * yStep, counts[i], breakable[i], { tell: i >= 4 });
            // after the last wall (y≈788) there's an open run to the finish line
            // (the real course tips you off a ledge onto a finish platform here).
            r.lastWallY = yTop - (counts.length - 1) * yStep;
            Rounds._spawnRows(r, r.maxY - 240, r.cx);
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
                b.lane = ang; b.skill = b.isPlayer ? 1 : U.rngf(0.50, 0.88);
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
                b.skill = b.isPlayer ? 1 : U.rngf(0.40, 0.78);
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
        gateCrash(r) {                      // RACE — read the raise/lower gates, cross when they drop
            Rounds._raceCommon(r);
            r.thinkFn = gateThink;
            // Five gate rows of escalating speed/logic (3 / 3 / 3 / 8 / 3) with a
            // bumper-and-slider interlude after Row 1 — exactly the real course.
            Rounds._gateRow(r, 3420, 3, { mode: 'seq', period: 4.0 });                 // Row 1 — slow rotate
            Rounds._bumpers(r, 3000, { rows: 2, cols: 4, color: '#ff5fa2' });          // interlude
            Rounds._blocks(r, 2700, { n: 2, w: 150, speed: 170 });                     // sliders
            Rounds._gateRow(r, 2350, 3, { mode: 'alt', period: 3.4 });                 // Row 2 — alternation
            Rounds._gateRow(r, 1950, 3, { mode: 'alt', period: 2.6 });                 // Row 3 — faster
            Rounds._gateRow(r, 1450, 8, { mode: 'inner', period: 3.0 });               // Row 4 — wide 8-gate wall
            // finale: a short slime downhill ramp into the last, tightest gate row.
            r.terrain = new Terrain()
                .flat(900, 3980, 0)
                .ramp(560, 900, 0, -150)        // downhill drop
                .flat(240, 560, -150);
            Rounds._gateRow(r, 700, 3, { mode: 'alt', period: 2.2, down: 0.28 });      // Row 5 — final timed jump
            Rounds._spawnRows(r, r.maxY - 240, r.cx);
        },

        // -------------------------------------------------- BLOCK PARTY
        blockParty(r) {                     // SURVIVAL — square floor, slip the gapped walls
            const A = Rounds._arenaRect(r, 300, 250);
            r.thinkFn = blockThink; r.fallGrace = 24;
            r.timer = r.def.duration || 30;
            const x0 = A.cx - A.hw, x1 = A.cx + A.hw;
            const yMin = A.cy - A.hh - 20, yMax = A.cy + A.hh + 20;
            const cols = ['#9a6cff', '#5ad1ff', '#ff8fd0'];
            for (let i = 0; i < 3; i++)                  // faster & a touch tighter so smart beans still get squeezed
                r.obstacles.push(new SlideWall({ x0, x1, y: yMin + i * 175, dir: 1, speed: 96,
                    thick: 44, gapW: 144, yMin, yMax, color: cols[i % cols.length] }));
            // spawn beans across the square
            r.beans.forEach((b, i) => {
                b.x = A.cx + U.rngf(-A.hw * 0.72, A.hw * 0.72);
                b.y = A.cy + U.rngf(-A.hh * 0.35, A.hh * 0.55);
                b.startX = b.x; b.startY = b.y;
                b.skill = b.isPlayer ? 1 : U.rngf(0.48, 0.86); b.facing = -Math.PI / 2;
            });
            r.onUpdate = (rr, dt) => { for (const o of rr.obstacles) if (o.kind === 'slidewall') o.speed += dt * 2.8; };
        },

        // -------------------------------------------------- DIZZY HEIGHTS
        dizzyHeights(r) {                   // RACE — spinning plates carry you off-line
            Rounds._raceCommon(r);
            // S1: a wide field of spinning plates (adjacent plates spin opposite
            // ways) + yellow bumpers — the opening "dizzy" funnel.
            Rounds._plates(r, 3500, { cols: 3, dir: 1, R: 155, speed: 0.85 });
            Rounds._plates(r, 3180, { cols: 3, dir: -1, R: 155, speed: 0.9 });
            Rounds._bumpers(r, 2880, { rows: 1, cols: 4, color: '#ffd23f' });
            // S2: a flat ball gauntlet — cannons fire big rolling balls head-on
            // (even count → centre gap, no barrel down the player's sightline).
            Rounds._cannons(r, 2350, { n: 4, interval: 2.1, speed: 360, reach: 1800, spread: 100, ballR: 32, color: '#ffd23f' });
            // S3: a narrower, faster spinning-plate stretch.
            Rounds._plates(r, 1780, { cols: 2, dir: -1, R: 160, speed: 1.05 });
            Rounds._plates(r, 1460, { cols: 2, dir: 1, R: 160, speed: 1.1 });
            // S4: stacked-plate finale + bumpers before the ramp to the line.
            Rounds._plates(r, 950, { cols: 3, dir: 1, R: 175, speed: 0.8 });
            Rounds._bumpers(r, 620, { rows: 1, cols: 3, color: '#ffd23f' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- FRUIT CHUTE
        fruitChute(r) {                     // RACE — climb the slanted ramps while fruit pours from the top
            Rounds._raceCommon(r);
            // A real UPHILL climb: ramps rising toward the finish, broken by flat
            // landings. (Higher z at a lower y = uphill toward the finish.)
            r.terrain = new Terrain()
                .flat(3600, 3980, 0)
                .ramp(3000, 3600, 150, 0)        // climb 0 → 150
                .flat(2800, 3000, 150)
                .ramp(2200, 2800, 300, 150)      // climb 150 → 300
                .flat(2000, 2200, 300)
                .ramp(1400, 2000, 450, 300)      // climb 300 → 450
                .flat(1200, 1400, 450)
                .ramp(700, 1200, 560, 450)       // climb 450 → 560
                .flat(240, 700, 560);            // the summit (cannons + finish)
            // fruit cannons at the TOP firing fruit down the whole chute. Use an
            // EVEN count so there's a gap at the centre (no cannon barrel pointing
            // straight down the middle into the player's camera).
            Rounds._cannons(r, 600, { n: 4, interval: 2.5, speed: 400, reach: 3600, spread: 120, fruit: true, ballR: 40 });
            // reverse conveyors on the ramps shoving climbers back down the slope.
            Rounds._conveyor(r, 3050, 3520, { dy: 1, push: 130, color: '#46d36a' });
            Rounds._conveyor(r, 2280, 2720, { dy: 1, push: 138, color: '#5ad1ff' });
            Rounds._conveyor(r, 1480, 1920, { dy: 1, push: 134, color: '#46d36a' });
            Rounds._conveyor(r, 780, 1120, { dy: 1, push: 142, color: '#5ad1ff' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- HIT PARADE
        hitParade(r) {                      // RACE — the everything gauntlet
            Rounds._raceCommon(r);
            Rounds._doorWall(r, 3360, 3);
            Rounds._beams(r, 3000, { n: 2, speed: 1.5, color: '#7b46d6' });
            Rounds._hammers(r, 2680, { n: 1, speed: 1.9 });
            Rounds._conveyor(r, 2300, 2520, { dy: 1, push: 125 });
            Rounds._beams(r, 1980, { n: 2, speed: -1.6, color: '#b06bff' });
            Rounds._bumpers(r, 1600, { rows: 2, cols: 5, color: '#ffd23f' });
            Rounds._cannons(r, 1250, { n: 2, interval: 2.1, speed: 330, reach: 1200, color: '#e6395a' });
            Rounds._beams(r, 820, { n: 1, style: 'windmill', speed: 0.9, len: 320, thick: 30, color: '#23d6c8' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- KNIGHT FEVER
        knightFever(r) {                    // RACE — medieval gauntlet: climb, slide, drawbridges
            Rounds._raceCommon(r);
            // Vertical profile from the real level: UP the two axe ramps, across
            // the spike-log top, DOWN the slime slide, then flat to the finish.
            r.terrain = new Terrain()
                .flat(3650, 3980, 0)
                .ramp(3300, 3650, 130, 0)        // climb 1 (axes)
                .ramp(2950, 3300, 250, 130)      // climb 2 (axes)
                .flat(2650, 2950, 250)           // spike-log top
                .ramp(2050, 2650, 60, 250)       // slime SLIDE down (axes + bumpers)
                .flat(1700, 2050, 60)            // Thicc Bonkus hall
                .ramp(1450, 1700, 120, 60)
                .flat(950, 1450, 120)            // drawbridge timing gates
                .ramp(650, 950, 30, 120)         // short slide to the line
                .flat(240, 650, 30);
            Rounds._axes(r, 3460, { n: 2, speed: 1.9, gap: 300 });          // climb 1
            Rounds._axes(r, 3120, { n: 2, speed: -2.0, gap: 300 });         // climb 2
            Rounds._beams(r, 2800, { n: 3, style: 'bar', speed: 1.6, thick: 26, color: '#8a6a3e' }); // spike logs
            Rounds._axes(r, 2380, { n: 2, speed: 2.1, gap: 280 });          // slide axes
            Rounds._bumpers(r, 2180, { rows: 1, cols: 4, color: '#e6395a' });
            Rounds._hammers(r, 1870, { n: 2, speed: 1.4, gap: 300, amp: 360, power: 560 }); // Thicc Bonkus
            Rounds._blocks(r, 1180, { n: 3, w: 150, speed: 150 });          // drawbridge gates
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        jumpShowdown(r) {           // SURVIVAL — fast sweeper, smaller ring
            Rounds._arena(r, 280);
            const s = Rounds._sweeper(r, { speed: 1.0, power: 520 }); r.sweeper = s;
            Rounds._spawnRing(r);
            r.onUpdate = (rr, dt) => { s.speed += dt * 0.09; };
        },
        // -------------------------------------------------- BIG FANS
        bigFans(r) {                // RACE — ride slow-rotating fan PLATFORMS, beams in later sections
            Rounds._raceCommon(r);
            r.openSides = true;     // drift/get knocked off the side of a fan = fall into the slime
            // S1: two fans → one big fan. S2: big centre fan + flank fans. S3-4: fans
            // carrying Rotating Beams. Slow rotation carries you; walk against it.
            Rounds._plates(r, 3450, { cols: 2, dir: 1, R: 200, speed: 0.5, fan: true, color: '#c9a063' });
            Rounds._plates(r, 3080, { cols: 1, dir: -1, R: 250, speed: 0.45, fan: true, color: '#c9a063' });
            Rounds._plates(r, 2650, { cols: 3, dir: 1, R: 175, speed: 0.55, fan: true, color: '#c9a063' });
            Rounds._plates(r, 2150, { cols: 1, dir: -1, R: 250, speed: 0.5, fan: true, color: '#c9a063' });
            Rounds._beams(r, 2150, { n: 1, style: 'bar', speed: 1.3, len: 220, color: '#ff5fa2', power: 420 });
            Rounds._plates(r, 1650, { cols: 2, dir: 1, R: 200, speed: 0.6, fan: true, color: '#c9a063' });
            Rounds._beams(r, 1650, { n: 2, style: 'bar', speed: -1.5, len: 200, color: '#ff5fa2', power: 420 });
            Rounds._plates(r, 1100, { cols: 2, dir: -1, R: 200, speed: 0.65, fan: true, color: '#c9a063' });
            Rounds._beams(r, 1100, { n: 2, style: 'bar', speed: 1.6, len: 200, color: '#ff5fa2', power: 440 });
            Rounds._plates(r, 620, { cols: 1, dir: 1, R: 240, speed: 0.6, fan: true, color: '#c9a063' });
            Rounds._beams(r, 620, { n: 1, style: 'bar', speed: -1.7, len: 240, color: '#ff5fa2', power: 460 });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        // -------------------------------------------------- ROYAL FUMBLE
        royalFumble(r) {            // FINAL — one tail, hold it when time runs out
            Rounds._arena(r, 320);
            r.kind = 'tag'; r.viewKind = 'survival'; r.thinkFn = tagThink; r._royal = true;
            r.timer = 40;
            Rounds._spawnRing(r);
            const order = U.shuffle(r.beans.slice());
            order.forEach((b, i) => { b.hasTail = i === 0; b.tailColor = '#ffd23f'; b.tagCd = 0; });
            r.qualifyCount = 1;
        },

        // ============================================ NEW GAMEMODES ===
        // -------- FALL MOUNTAIN (racing FINAL — first to the crown wins)
        fallMountain(r) {           // FINAL race — climb the mountain past cannons to the Crown
            Rounds._raceCommon(r);
            r.kind = 'mountain'; r.viewKind = 'race'; r.crownFinish = true; r.finishY = 360;
            r.terrain = new Terrain()
                .flat(3650, 3980, 0)
                .ramp(2900, 3650, 140, 0)
                .flat(2700, 2900, 140)
                .ramp(2000, 2700, 290, 140)
                .flat(1800, 2000, 290)
                .ramp(1100, 1800, 430, 290)
                .flat(900, 1100, 430)
                .ramp(500, 900, 520, 430)
                .flat(240, 500, 520);            // summit + Crown
            Rounds._beams(r, 3320, { n: 2, speed: 1.5, color: '#7b46d6' });
            Rounds._cannons(r, 2950, { n: 2, interval: 1.9, speed: 360, reach: 2400, spread: 150, color: '#e6395a' });
            Rounds._bumpers(r, 2500, { rows: 2, cols: 4, color: '#ffd23f' });
            Rounds._beams(r, 2050, { n: 3, speed: -1.7, color: '#7b46d6' });
            Rounds._cannons(r, 1650, { n: 2, interval: 2.0, speed: 340, reach: 1300, color: '#e6395a' });
            Rounds._hammers(r, 1150, { n: 2, speed: 2.0, gap: 260 });
            Rounds._beams(r, 700, { n: 1, style: 'windmill', speed: 0.9, len: 320, thick: 30, color: '#e6395a' });
            Rounds._spawnRows(r, r.maxY - 260, r.cx);
        },
        lostTemple(r) {             // FINAL — a flat temple MAZE of obstacle rooms to a sliding Crown
            Rounds._raceCommon(r);
            r.kind = 'mountain'; r.viewKind = 'race'; r.crownFinish = true; r.crownSlide = true; r.finishY = 320;
            r.thinkFn = doorThink;   // guess doors blind, surge to any opened one — the maze
            // A sequence of obstacle ROOMS, each gated by a wall of doors (only some
            // break). Different hazard per room; a conveyor room before the Crown.
            Rounds._doorWall(r, 3520, 4, 2);                              // room 1 doors
            Rounds._hammers(r, 3180, { n: 2, speed: 1.8, gap: 280 });     // hammer room
            Rounds._doorWall(r, 2860, 4, 2);
            Rounds._beams(r, 2520, { n: 3, style: 'bar', speed: 1.6, color: '#8a6a3e' }); // spinning-log room
            Rounds._doorWall(r, 2200, 4, 2);
            Rounds._plates(r, 1860, { cols: 2, dir: 1, R: 150, speed: 0.95 });            // spinning-plate room
            Rounds._doorWall(r, 1540, 4, 2);
            Rounds._hammers(r, 1200, { n: 3, speed: 2.0, gap: 220 });     // pendulum room
            Rounds._doorWall(r, 900, 3, 2);
            Rounds._conveyor(r, 560, 760, { dy: 1, push: 150, color: '#8a6a3e' });        // pre-crown conveyor room
            // crown room: bounce pads (lily pads) up to the horizontally-sliding Crown
            for (const bx of [r.cx - 150, r.cx + 150, r.cx]) r.obstacles.push(new BouncePad({ x: bx, y: 470, r: 46 }));
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
        // -------- TIP TOE (LOGIC — find the hidden path of real tiles)
        tipToe(r) { Rounds._tipToeField(r, 7, 8, 0.46); },

        // -------- PERFECT MATCH (LOGIC — dash to the called fruit) -----
        perfectMatch(r) {
            r.kind = 'match'; r.viewKind = 'final'; r.camMode = 'fixed'; r.thinkFn = matchThink;
            r.minX = 320; r.maxX = 960; r.minY = 160; r.maxY = 620;
            r.tiles = [];
            // a clean grid of SQUARE fruit tiles (rendered as 'matchtile').
            // Step < ~52 so tile coverage overlaps and there are NO gaps for a
            // moving bean to fall through (the board reads as one flush grid).
            const size = 42, stepX = 50, stepY = 48;
            // only 3 fruits on the board so ~1/3 of tiles always survive a call —
            // a safe tile is always close (forgiving, like the real 2-4 fruit rounds)
            const pal = U.shuffle(FRUITS.map((_, i) => i)).slice(0, 3);
            for (let y = r.minY + 28; y <= r.maxY - 20; y += stepY) {
                for (let x = r.minX + 32; x <= r.maxX - 24; x += stepX) {
                    const fruit = U.pick(pal);
                    const t = new HexTile({ cx: x, cy: y, size, color: FRUITS[fruit].color, fruit });
                    t.kind = 'matchtile';
                    r.tiles.push(t);
                }
            }
            const spots = U.shuffle(r.tiles.slice());
            r.beans.forEach((b, i) => {
                const t = spots[i % spots.length];
                b.x = t.cx; b.y = t.cy; b.startX = b.x; b.startY = b.y;
                b.skill = b.isPlayer ? 1 : U.rngf(0.45, 0.85); b.facing = U.rngf(0, 6.28);
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

        // -------- SLIME CLIMB (RACE up a tower vs a rising flood of slime)
        slimeClimb(r) {
            Rounds._raceCommon(r);
            r.kind = 'climb'; r.viewKind = 'race';
            // A tall tower: ramps up to flat landings, each landing a new hazard.
            // The slime floods upward in HEIGHT, so you must keep climbing.
            r.terrain = new Terrain()
                .flat(3700, 3980, 0)
                .ramp(3450, 3700, 90, 0)
                .flat(3250, 3450, 90)            // S2 sliding blocks
                .ramp(3000, 3250, 200, 90)       // S3 cannon ramp
                .flat(2800, 3000, 200)           // S4 sliding blocks
                .ramp(2550, 2800, 310, 200)
                .flat(2350, 2550, 310)           // S5 conveyor + bumpers
                .ramp(2100, 2350, 420, 310)
                .flat(1900, 2100, 420)           // S6 spinning beams
                .ramp(1650, 1900, 530, 420)
                .flat(1450, 1650, 530)           // S7 rotating hammers
                .ramp(1200, 1450, 630, 530)
                .flat(1000, 1200, 630)           // S8 four sliding blocks
                .ramp(750, 1000, 720, 630)
                .flat(240, 750, 720);            // summit: pendulums + finish
            r.slimeZ = -120; r.slimeRate = 21;   // flood rises in HEIGHT, faster than a slow climber
            r.qualifyCount = r.beans.length;     // finishing qualifies; the flood does the culling

            Rounds._bumpers(r, 3560, { rows: 1, cols: 4, color: '#ff5fa2' });          // S1
            Rounds._blocks(r, 3350, { n: 3, w: 150, speed: 150 });                     // S2
            Rounds._cannons(r, 3010, { n: 2, interval: 2.0, speed: 360, reach: 1700, color: '#e6395a', ballR: 30 }); // S3
            Rounds._blocks(r, 2900, { n: 2, w: 175, speed: 165 });                     // S4
            Rounds._conveyor(r, 2380, 2520, { dy: 1, push: 130, color: '#46d36a' });   // S5
            Rounds._bumpers(r, 2440, { rows: 1, cols: 3, color: '#ffd23f' });
            Rounds._beams(r, 2000, { n: 2, speed: 1.6, color: '#9a6cff' });            // S6
            Rounds._hammers(r, 1550, { n: 2, speed: 1.9, gap: 250 });                  // S7
            Rounds._blocks(r, 1100, { n: 4, w: 130, speed: 150 });                     // S8
            Rounds._hammers(r, 700, { n: 2, speed: 2.1, gap: 230 });                   // S9 pendulums
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
