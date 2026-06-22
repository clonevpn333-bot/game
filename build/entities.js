'use strict';

/* =====================================================================
   entities.js — the Bean (player + AI) and every obstacle class.
   Beans are pure physics + self-rendering; the Round drives them and
   feeds AI beans their inputs via bean.ai each frame.
   ===================================================================== */

class Bean {
    constructor(opts) {
        this.x = opts.x; this.y = opts.y;
        this.startX = opts.x; this.startY = opts.y;
        this.vx = 0; this.vy = 0;
        this.z = 0;  this.vz = 0;
        this.groundZ = 0;          // terrain floor height under the bean (0 = flat course)
        this.r = CFG.BEAN_R;
        this.facing = -Math.PI / 2;     // looking "up" the course
        this.isPlayer = !!opts.isPlayer;
        this.isAI = !opts.isPlayer;
        this.name = opts.name || 'Bean';
        this.appearance = opts.appearance;
        this.emoteList = opts.emoteList || EMOTES.slice(0, 4);

        // race / round state
        this.alive = true;
        this.finished = false;
        this.qualified = false;
        this.eliminated = false;
        this.falling = false;
        this.exited = false;        // qualified & whisked off the course (spectating)
        this.place = 0;

        // motion-state timers
        this.diveT = 0; this.proneT = 0; this.diveCd = 0;
        this.ragdoll = 0; this.spin = 0;
        this.grabbing = null; this.grabbedBy = null; this.grabT = 0;

        // Tail Tag (Hunt mode): hold a tail to qualify
        this.hasTail = false; this.tailColor = '#ff5fa2'; this.tagCd = 0;

        // cosmetics / anim
        this.bob = Math.random() * 6.283;
        this.squash = 1;
        this.emoteT = 0; this.emoteAnim = null; this.emoteName = null;
        this.justEmoted = 99;
        this.everRagdolled = false;
        this.blink = U.rngf(2, 5);

        // AI brain inputs (filled by the round each frame)
        this.ai = { mx: 0, my: 0, jump: false, dive: false, grab: false };
        this.skill = opts.skill != null ? opts.skill : 0.7;
        this.lane = opts.lane || 0;
        this.aiTimer = 0;
        this.aiTarget = { x: this.x, y: this.y };
        this.aiJumpLock = 0;
    }

    get grounded() { return this.z <= this.groundZ + 0.5; }
    get air() { return this.z - this.groundZ; }   // height ABOVE the local floor (terrain-aware)
    get controllable() {
        return this.ragdoll <= 0 && this.proneT <= 0 && this.diveT <= 0 && !this.grabbedBy;
    }
    get gone() { return this.eliminated && !this.falling; }

    // ---- Hits & states ------------------------------------------------
    hit(dx, dy, power, ragTime) {
        if (this.falling || this.gone) return;
        const l = Math.hypot(dx, dy) || 1;
        this.vx = dx / l * power;
        this.vy = dy / l * power;
        this.vz = Math.max(this.vz, power * 0.22);
        this.ragdoll = Math.max(this.ragdoll, ragTime || 0.7);
        this.diveT = 0; this.proneT = 0;
        this.everRagdolled = true;
        this._releaseGrab();
    }
    bounce(v) { if (this.grounded) { this.vz = v; } }

    startFall() {
        if (this.falling || this.gone) return;
        this.falling = true;
        this.vz = -40;
        this.ragdoll = Math.max(this.ragdoll, 0.4);
        this._releaseGrab();
        if (this.grabbedBy) { this.grabbedBy.grabbing = null; this.grabbedBy = null; }
    }

    doEmote(em) {
        if (!em || !this.grounded || this.ragdoll > 0 || this.diveT > 0 || this.falling) return;
        this.emoteAnim = em.anim; this.emoteName = em.name; this.emoteT = 1.8; this.justEmoted = 0;
    }

    _releaseGrab(fling) {
        if (this.grabbing) {
            const t = this.grabbing;
            t.grabbedBy = null;
            if (fling) t.hit(Math.cos(this.facing), Math.sin(this.facing), 320, 0.5);
            this.grabbing = null;
        }
    }

    // ---- Update -------------------------------------------------------
    update(dt, round) {
        // animation / cooldown timers always tick
        this.bob += dt * 7;
        this.blink -= dt;
        this.diveCd = Math.max(0, this.diveCd - dt);
        this.grabT = Math.max(0, this.grabT - dt);
        this.tagCd = Math.max(0, this.tagCd - dt);
        this.justEmoted += dt;
        if (this.aiJumpLock > 0) this.aiJumpLock -= dt;
        if (this.emoteT > 0) { this.emoteT -= dt; if (this.emoteT <= 0) { this.emoteAnim = null; this.emoteName = null; } }

        if (this.gone || this.exited) return;

        // Falling into slime/pit — drop then eliminate
        if (this.falling) {
            this.vz -= CFG.GRAVITY * 0.8 * dt;
            this.z += this.vz * dt;
            this.x += this.vx * dt; this.y += this.vy * dt;
            this.vx *= (1 - 0.9 * dt); this.vy *= (1 - 0.9 * dt);
            this.spin += dt * 9;
            if (this.z < -180) { this.eliminated = true; this.alive = false; }
            return;
        }

        // If being grabbed, the grabber owns our position
        if (this.grabbedBy && this.grabbedBy.grabbing === this) {
            if (this.blink <= 0) this.blink = U.rngf(2.5, 6);
            return;
        }

        if (!round.live) return;     // frozen during intro card

        // terrain floor under the bean (0 on flat courses). VOID (a gap) reads
        // as a very negative number → the bean drops into it.
        let gz = round.groundZ ? round.groundZ(this.x, this.y) : 0;
        const overVoid = gz <= -9000;
        if (overVoid) gz = 0;
        this.groundZ = gz;

        // gather inputs
        let ix = 0, iy = 0, wantJump = false, wantDive = false;
        if (this.isPlayer) {
            if (round.controllable && this.alive) {
                ix = Input.moveX; iy = Input.moveY;
                wantJump = Input.jump; wantDive = Input.dive;
            }
        } else {
            ix = this.ai.mx; iy = this.ai.my; wantJump = this.ai.jump; wantDive = this.ai.dive;
        }
        const il = Math.hypot(ix, iy);
        if (il > 1) { ix /= il; iy /= il; }

        const grounded = this.grounded;

        if (this.controllable) {
            if (il > 0.05) this.facing = U.lerpAngle(this.facing, Math.atan2(iy, ix), 0.35);

            if (grounded && wantJump) this.vz = CFG.JUMP_V;

            if (grounded && wantDive && this.diveCd <= 0) {
                const a = il > 0.05 ? Math.atan2(iy, ix) : this.facing;
                this.facing = a;
                this.diveT = CFG.DIVE_TIME;
                this.diveCd = CFG.DIVE_TIME + CFG.DIVE_RECOVER + CFG.DIVE_CD;
                this.vz = CFG.DIVE_HOP;
                this.vx = Math.cos(a) * CFG.DIVE_SPEED;
                this.vy = Math.sin(a) * CFG.DIVE_SPEED;
            }
        }

        // velocity update by state
        if (this.ragdoll > 0) {
            this.ragdoll -= dt;
            const sp = Math.hypot(this.vx, this.vy);
            const ns = Math.max(0, sp - CFG.RAGDOLL_FRICTION * dt);
            if (sp > 1) { this.vx = this.vx / sp * ns; this.vy = this.vy / sp * ns; }
            this.spin += dt * (6 + sp * 0.02);
            if (this.ragdoll <= 0) this.spin = 0;
        } else if (this.diveT > 0) {
            this.diveT -= dt;
            // gentle steering keeps the lunge feeling responsive instead of a
            // dead commit, and a low drag gives a satisfyingly long belly-slide.
            if (il > 0.05) {
                this.facing = U.lerpAngle(this.facing, Math.atan2(iy, ix), CFG.DIVE_STEER);
                const sp = Math.hypot(this.vx, this.vy);
                this.vx = U.lerp(this.vx, Math.cos(this.facing) * sp, CFG.DIVE_STEER);
                this.vy = U.lerp(this.vy, Math.sin(this.facing) * sp, CFG.DIVE_STEER);
            }
            this.vx *= (1 - CFG.DIVE_DRAG * dt); this.vy *= (1 - CFG.DIVE_DRAG * dt);
            if (this.diveT <= 0) this.proneT = CFG.DIVE_RECOVER;
        } else if (this.proneT > 0) {
            this.proneT -= dt;
            this.vx = U.approach(this.vx, 0, CFG.FRICTION * dt);
            this.vy = U.approach(this.vy, 0, CFG.FRICTION * dt);
        } else {
            const ctrl = grounded ? 1 : CFG.AIR_CONTROL;
            if (il > 0.05) {
                this.vx = U.approach(this.vx, ix * CFG.RUN_SPEED, CFG.ACCEL * ctrl * dt);
                this.vy = U.approach(this.vy, iy * CFG.RUN_SPEED, CFG.ACCEL * ctrl * dt);
            } else if (grounded) {
                this.vx = U.approach(this.vx, 0, CFG.FRICTION * dt);
                this.vy = U.approach(this.vy, 0, CFG.FRICTION * dt);
            }
        }

        // integrate vertical (z) against the terrain floor gz
        if (overVoid) {
            // airborne over a gap: keep arcing; sink to floor level → fall in
            this.vz -= CFG.GRAVITY * dt;
            this.z += this.vz * dt;
            if (this.z <= gz + 2) this.startFall();
        } else if (this.z > gz + 0.5 || this.vz > 0) {
            // in the air or rising: gravity, then land on the surface
            this.vz -= CFG.GRAVITY * dt;
            this.z += this.vz * dt;
            if (this.z <= gz) { this.z = gz; this.vz = 0; }
        } else {
            // on the surface (incl. walking up onto higher ground): stick to it
            this.z = gz; this.vz = 0;
        }

        // integrate horizontal
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // drag a grabbed bean along
        if (this.grabbing) {
            if (this.grabT <= 0 || !this.grabbing.alive || this.grabbing.falling) {
                this._releaseGrab(true);
            } else {
                const t = this.grabbing;
                t.x = this.x + Math.cos(this.facing) * (this.r * 2.1);
                t.y = this.y + Math.sin(this.facing) * (this.r * 2.1);
                t.z = this.z; t.vx = this.vx; t.vy = this.vy;
            }
        }

        // squash & stretch from vertical motion
        const target = 1 + U.clamp(this.vz / 1600, -0.18, 0.28);
        this.squash = U.lerp(this.squash, target, 0.4);
        if (this.blink <= 0) this.blink = U.rngf(2.5, 6);
    }

    tryGrab(beans) {
        if (!this.controllable || !this.grounded || this.grabbing) return;
        let best = null, bestD = CFG.GRAB_RANGE;
        for (const b of beans) {
            if (b === this || !b.alive || b.falling || b.grabbedBy) continue;
            const d = U.dist(this.x, this.y, b.x, b.y);
            if (d > bestD) continue;
            const ang = Math.abs(U.angleDiff(this.facing, U.angleTo(this.x, this.y, b.x, b.y)));
            if (ang < 1.1) { best = b; bestD = d; }
        }
        if (best) {
            this.grabbing = best; best.grabbedBy = this;
            this.grabT = CFG.GRAB_TIME; best.ragdoll = Math.max(best.ragdoll, 0.05);
        }
    }
    releaseGrab() { this._releaseGrab(true); }

    // =================================================================
    //  RENDER
    // =================================================================
    drawShadow(ctx, cam) {
        if (this.gone) return;
        const sx = this.x - cam.x, sy = this.y - cam.y;
        const lift = Math.max(0, this.z);
        const sc = U.clamp(1 - lift / 600, 0.45, 1);
        ctx.save();
        ctx.globalAlpha = 0.22 * sc;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 4, this.r * 0.95 * sc, this.r * 0.5 * sc, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
    }

    draw(ctx, cam) {
        if (this.gone) return;
        const sx = this.x - cam.x;
        const sy = this.y - cam.y - this.z;          // z lifts the body up the screen
        const r = this.r;
        const bobY = Math.sin(this.bob) * (this.grounded ? 1.2 : 0);

        let rot = 0;
        if (this.ragdoll > 0 || this.falling) rot = this.spin;
        else if (this.diveT > 0) rot = Math.cos(this.facing) * 0.5;

        ctx.save();
        ctx.translate(sx, sy + bobY);
        ctx.rotate(rot);

        let sxScale = 1 / this.squash, syScale = this.squash;
        if (this.diveT > 0 || this.proneT > 0) { sxScale = 1.25; syScale = 0.8; }
        ctx.scale(sxScale, syScale);

        this._drawBody(ctx, r);
        ctx.restore();

        // upright overlays (name tag / emote / player arrow)
        this._drawTags(ctx, sx, sy, r);
    }

    _drawBody(ctx, r) {
        const ap = this.appearance;
        const base = ap.color;

        this._lowerCostume(ctx, r, ap.lower);

        // body capsule
        ctx.fillStyle = base;
        U.roundRect(ctx, -r, -r * 1.25, r * 2, r * 2.5, r * 0.95);
        ctx.fill();

        // pattern clipped to body + top highlight
        ctx.save();
        U.roundRect(ctx, -r, -r * 1.25, r * 2, r * 2.5, r * 0.95);
        ctx.clip();
        this._pattern(ctx, r, ap.pattern, base);
        const g = ctx.createLinearGradient(0, -r * 1.3, 0, r);
        g.addColorStop(0, 'rgba(255,255,255,0.35)');
        g.addColorStop(0.5, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-r, -r * 1.3, r * 2, r * 2.4);
        ctx.restore();

        ctx.strokeStyle = U.shade(base, -0.35);
        ctx.lineWidth = 2;
        U.roundRect(ctx, -r, -r * 1.25, r * 2, r * 2.5, r * 0.95);
        ctx.stroke();

        // little legs
        ctx.fillStyle = U.shade(base, -0.2);
        ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 1.18, r * 0.3, r * 0.22, 0, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.45, r * 1.18, r * 0.3, r * 0.22, 0, 0, 6.283); ctx.fill();

        this._face(ctx, r, ap.visor);
        this._upperCostume(ctx, r, ap.upper);
    }

    _face(ctx, r, visor) {
        const open = this.blink < 0.12 ? 0.15 : 1;
        ctx.save();
        ctx.translate(0, -r * 0.15);
        ctx.fillStyle = visor;
        ctx.strokeStyle = U.shade(visor, -0.4);
        ctx.lineWidth = 1.5;
        U.roundRect(ctx, -r * 0.78, -r * 0.4, r * 1.56, r * 0.78, r * 0.32);
        ctx.fill(); ctx.stroke();
        const lookX = Math.cos(this.facing) * 1.6;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(-r * 0.32, 0, r * 0.2, r * 0.26 * open, 0, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.32, 0, r * 0.2, r * 0.26 * open, 0, 0, 6.283); ctx.fill();
        if (open > 0.5) {
            ctx.fillStyle = '#22203a';
            ctx.beginPath(); ctx.arc(-r * 0.32 + lookX, 1, r * 0.09, 0, 6.283); ctx.fill();
            ctx.beginPath(); ctx.arc(r * 0.32 + lookX, 1, r * 0.09, 0, 6.283); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(255,120,150,0.5)';
        ctx.beginPath(); ctx.arc(-r * 0.55, r * 0.35, r * 0.16, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.55, r * 0.35, r * 0.16, 0, 6.283); ctx.fill();
    }

    _pattern(ctx, r, type, base) {
        const dk = U.shade(base, -0.28);
        const lt = U.shade(base, 0.4);
        switch (type) {
            case 'stripes':
                ctx.fillStyle = dk;
                for (let i = -2; i <= 2; i++) ctx.fillRect(i * r * 0.55 - r * 0.12, -r * 1.3, r * 0.22, r * 2.6);
                break;
            case 'spots':
                ctx.fillStyle = dk;
                for (const p of [[-.4, -.6], [.5, -.2], [-.2, .5], [.35, .7], [-.55, .15]])
                    { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * 0.22, 0, 6.283); ctx.fill(); }
                break;
            case 'check':
                for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++)
                    if ((xx + yy) & 1) { ctx.fillStyle = dk; ctx.fillRect(xx * r * 0.5, yy * r * 0.5, r * 0.5, r * 0.5); }
                break;
            case 'camo':
                ctx.fillStyle = dk;
                for (const p of [[-.3, -.5, .5], [.4, .1, .6], [-.1, .6, .45], [.5, -.6, .4]])
                    { ctx.beginPath(); ctx.ellipse(p[0] * r, p[1] * r, p[2] * r, p[2] * r * 0.8, 0.5, 0, 6.283); ctx.fill(); }
                break;
            case 'tiger':
                ctx.strokeStyle = dk; ctx.lineWidth = r * 0.18; ctx.lineCap = 'round';
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-r, i * r * 0.5);
                    ctx.quadraticCurveTo(0, i * r * 0.5 - r * 0.3, r, i * r * 0.5);
                    ctx.stroke();
                }
                break;
            case 'star':
                ctx.fillStyle = lt;
                this._star(ctx, 0, 0, r * 0.7, r * 0.3, 5);
                break;
            case 'tiedye': {
                const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 1.6);
                g.addColorStop(0, 'rgba(255,255,255,0.6)'); g.addColorStop(0.4, U.shade(base, 0.3));
                g.addColorStop(0.7, base); g.addColorStop(1, dk);
                ctx.fillStyle = g; ctx.fillRect(-r, -r * 1.4, r * 2, r * 2.8);
                break;
            }
            case 'galaxy': {
                const g = ctx.createLinearGradient(-r, -r, r, r);
                g.addColorStop(0, '#2b1d5e'); g.addColorStop(0.5, '#6a32c8'); g.addColorStop(1, '#1b1340');
                ctx.fillStyle = g; ctx.fillRect(-r, -r * 1.4, r * 2, r * 2.8);
                ctx.fillStyle = '#fff';
                for (const p of [[-.4, -.7], [.3, -.3], [-.1, .2], [.45, .5], [-.5, .55], [.1, -.9]])
                    { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * 0.06, 0, 6.283); ctx.fill(); }
                break;
            }
            default: break; // solid
        }
    }

    _star(ctx, cx, cy, R, r2, pts) {
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
            const ang = (Math.PI / pts) * i - Math.PI / 2;
            const rad = i & 1 ? r2 : R;
            const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill();
    }

    _upperCostume(ctx, r, prop) {
        ctx.save();
        ctx.translate(0, -r * 1.25);
        switch (prop) {
            case 'party':
                ctx.fillStyle = '#ff5fa2'; ctx.beginPath();
                ctx.moveTo(0, -r * 1.1); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -r * 1.1, r * 0.18, 0, 6.283); ctx.fill();
                break;
            case 'cap':
                ctx.fillStyle = '#e6395a';
                U.roundRect(ctx, -r * 0.6, -r * 0.5, r * 1.2, r * 0.5, r * 0.25); ctx.fill();
                ctx.fillRect(-r * 0.85, -r * 0.12, r * 0.55, r * 0.18);
                break;
            case 'pigeon':
                ctx.fillStyle = '#cfd6df'; ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.6, 0, 6.283); ctx.fill();
                ctx.fillStyle = '#ff9447'; ctx.beginPath();
                ctx.moveTo(0, -r * 0.3); ctx.lineTo(r * 0.7, -r * 0.15); ctx.lineTo(0, -r * 0.02); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.4, r * 0.08, 0, 6.283); ctx.fill();
                break;
            case 'bee':
                ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(-r * 0.4, -r * 0.7);
                ctx.moveTo(r * 0.2, 0); ctx.lineTo(r * 0.4, -r * 0.7); ctx.stroke();
                ctx.fillStyle = '#ffd23f';
                ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.75, r * 0.12, 0, 6.283); ctx.fill();
                ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.75, r * 0.12, 0, 6.283); ctx.fill();
                break;
            case 'cat':
                ctx.fillStyle = '#9a6cff';
                for (const s of [-1, 1]) { ctx.beginPath();
                    ctx.moveTo(s * r * 0.2, 0); ctx.lineTo(s * r * 0.55, -r * 0.7); ctx.lineTo(s * r * 0.6, 0); ctx.closePath(); ctx.fill(); }
                break;
            case 'pirate':
                ctx.fillStyle = '#23203a';
                U.roundRect(ctx, -r * 0.8, -r * 0.55, r * 1.6, r * 0.5, r * 0.2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.3); ctx.quadraticCurveTo(0, -r * 1.05, r * 0.8, -r * 0.3); ctx.fill();
                ctx.fillStyle = '#fff'; this._star(ctx, 0, -r * 0.55, r * 0.16, r * 0.07, 5);
                break;
            case 'dino':
                ctx.fillStyle = '#46d36a';
                for (let i = -1; i <= 1; i++) { ctx.beginPath();
                    ctx.moveTo(i * r * 0.4 - r * 0.18, 0); ctx.lineTo(i * r * 0.4, -r * 0.5); ctx.lineTo(i * r * 0.4 + r * 0.18, 0); ctx.closePath(); ctx.fill(); }
                break;
            case 'crown':
                ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#e8a200'; ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.2);
                ctx.lineTo(0, -r * 0.6); ctx.lineTo(r * 0.3, -r * 0.2); ctx.lineTo(r * 0.6, -r * 0.5);
                ctx.lineTo(r * 0.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
                break;
            default: break;
        }
        ctx.restore();
    }

    _lowerCostume(ctx, r, prop) {
        switch (prop) {
            case 'shoes':
                ctx.fillStyle = '#f25c54';
                ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 1.25, r * 0.34, r * 0.2, 0, 0, 6.283); ctx.fill();
                ctx.beginPath(); ctx.ellipse(r * 0.45, r * 1.25, r * 0.34, r * 0.2, 0, 0, 6.283); ctx.fill();
                break;
            case 'tutu':
                ctx.fillStyle = '#ff8fd0';
                ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 1.4, r * 0.5, 0, 0, 6.283); ctx.fill();
                break;
            case 'tail':
                ctx.fillStyle = '#46d36a';
                ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(-r * 1.5, r * 1.2); ctx.lineTo(0, r * 1.25); ctx.closePath(); ctx.fill();
                break;
            case 'rocket':
                ctx.fillStyle = '#ffb03f';
                ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 1.2); ctx.lineTo(0, r * 1.9); ctx.lineTo(r * 0.4, r * 1.2); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#ff5a2c';
                ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 1.2); ctx.lineTo(0, r * 1.6); ctx.lineTo(r * 0.2, r * 1.2); ctx.closePath(); ctx.fill();
                break;
            case 'gold':
                ctx.fillStyle = '#ffd23f';
                ctx.beginPath(); ctx.ellipse(-r * 0.45, r * 1.25, r * 0.36, r * 0.22, 0, 0, 6.283); ctx.fill();
                ctx.beginPath(); ctx.ellipse(r * 0.45, r * 1.25, r * 0.36, r * 0.22, 0, 0, 6.283); ctx.fill();
                break;
            default: break;
        }
    }

    _drawTags(ctx, sx, sy, r) {
        if (this.emoteAnim && this.emoteT > 0) {
            const by = sy - r * 2.4;
            ctx.save();
            ctx.globalAlpha = U.clamp(this.emoteT * 2, 0, 1);
            U.text(ctx, this._emoteIcon(), sx, by, 'bold 26px system-ui', '#fff', 'center', PAL.ink, 5);
            ctx.restore();
        }
        if (this.isPlayer) {
            const ay = sy - r * 2.0 - Math.abs(Math.sin(this.bob)) * 3;
            ctx.fillStyle = PAL.gold;
            ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(sx, ay + 12); ctx.lineTo(sx - 9, ay); ctx.lineTo(sx + 9, ay); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else {
            ctx.save();
            ctx.globalAlpha = 0.85;
            U.text(ctx, this.name, sx, sy - r * 1.85, '600 11px system-ui', '#fff', 'center', 'rgba(20,15,40,0.7)', 3);
            ctx.restore();
        }
    }

    _emoteIcon() {
        switch (this.emoteAnim) {
            case 'wave': return '👋';
            case 'dance': return '🐔';
            case 'crouch': return '⬇️';
            case 'think': return '🤔';
            case 'flex': return '💪';
            case 'spin': return '🌀';
            case 'point': return '👉';
            case 'heart': return '💖';
            default: return '✨';
        }
    }
}

/* =====================================================================
   OBSTACLES
   Each: update(dt), collide(bean, round), draw(ctx, cam) [ground layer],
   drawTop(ctx, cam) [overhead layer, optional].
   ===================================================================== */

class Spinner {
    // Rotating bar through a pivot. pushOut knocks beans radially outward.
    constructor(o) {
        this.kind = "spinner";
        this.cx = o.cx; this.cy = o.cy;
        this.len = o.len; this.thick = o.thick || 16;
        this.angle = o.angle || 0;
        this.speed = o.speed;
        this.power = o.power || 360;
        this.height = o.height != null ? o.height : 9999;
        this.arms = o.arms || 2;
        this.pushOut = !!o.pushOut;
        this.color = o.color || '#ff5fa2';
        this.style = o.style || 'bar';      // bar | windmill | blade | sweeper (view only)
        this.layer = 'top';
    }
    update(dt) { this.angle += this.speed * dt; }
    _ends() {
        const out = [];
        for (let i = 0; i < this.arms; i++) {
            const a = this.angle + (i * Math.PI * 2 / this.arms);
            out.push([this.cx + Math.cos(a) * this.len, this.cy + Math.sin(a) * this.len]);
        }
        return out;
    }
    collide(bean, round) {
        if (bean.air > this.height || bean.falling || bean.gone) return;
        // tight capsule test against the visible bar: bean footprint (~0.82r)
        // plus the bar's half-thickness — so a clean-looking pass doesn't clip.
        const hit = bean.r * 0.82 + this.thick * 0.42;
        for (const [ex, ey] of this._ends()) {
            const c = U.closestOnSeg(bean.x, bean.y, this.cx, this.cy, ex, ey);
            if (U.dist(bean.x, bean.y, c.x, c.y) < hit) {
                let dx, dy;
                if (this.pushOut) { dx = bean.x - this.cx; dy = bean.y - this.cy; }
                else {
                    const ta = this.angle + (this.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
                    dx = Math.cos(ta); dy = Math.sin(ta);
                }
                bean.hit(dx, dy, this.power, 0.7);
                round.spawnBurst(bean.x, bean.y, bean.z, this.color, 5);
                return;
            }
        }
    }
    draw(ctx, cam) {
        ctx.save();
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(this.cx - cam.x, this.cy - cam.y + 6, this.len, this.len * 0.4, 0, 0, 6.283); ctx.fill();
        ctx.restore();
        ctx.fillStyle = U.shade(this.color, -0.3);
        ctx.beginPath(); ctx.arc(this.cx - cam.x, this.cy - cam.y, this.thick * 0.7, 0, 6.283); ctx.fill();
    }
    drawTop(ctx, cam) {
        const lift = this.height < 200 ? 6 : 30;
        ctx.save();
        ctx.translate(this.cx - cam.x, this.cy - cam.y - lift);
        ctx.lineWidth = this.thick; ctx.lineCap = 'round';
        ctx.strokeStyle = this.color;
        for (const [ex, ey] of this._ends()) {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex - this.cx, ey - this.cy); ctx.stroke();
        }
        ctx.strokeStyle = U.shade(this.color, 0.35); ctx.lineWidth = this.thick * 0.35;
        for (const [ex, ey] of this._ends()) {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((ex - this.cx) * 0.96, (ey - this.cy) * 0.96); ctx.stroke();
        }
        ctx.fillStyle = U.shade(this.color, -0.25);
        ctx.beginPath(); ctx.arc(0, 0, this.thick * 0.85, 0, 6.283); ctx.fill();
        ctx.restore();
    }
}

class Hammer {
    // Wrecking-ball head sweeping left/right across the lane.
    constructor(o) {
        this.kind = "hammer";
        this.cx = o.cx; this.cy = o.cy;
        this.amp = o.amp; this.headR = o.headR || 30;
        this.phase = o.phase || 0; this.speed = o.speed || 1.6;
        this.power = o.power || 540; this.height = o.height != null ? o.height : 120;
        this.style = o.style || 'hammer';   // hammer | axe | pendulum (view only)
        this.layer = 'top';
    }
    update(dt) { this.phase += this.speed * dt; }
    _head() { return [this.cx + Math.sin(this.phase) * this.amp, this.cy]; }
    collide(bean, round) {
        if (bean.air > this.height || bean.falling || bean.gone) return;
        const [hx, hy] = this._head();
        if (U.dist(bean.x, bean.y, hx, hy) < bean.r + this.headR) {
            const dir = Math.cos(this.phase) >= 0 ? 1 : -1;
            bean.hit(dir, -0.15, this.power, 0.95);
            round.spawnBurst(bean.x, bean.y, bean.z, '#ffd23f', 8);
        }
    }
    draw(ctx, cam) {
        const [hx] = this._head();
        ctx.save();
        ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(hx - cam.x, this.cy - cam.y + 6, this.headR, this.headR * 0.45, 0, 0, 6.283); ctx.fill();
        ctx.restore();
    }
    drawTop(ctx, cam) {
        const [hx, hy] = this._head();
        ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(this.cx - cam.x, this.cy - cam.y - 40); ctx.lineTo(hx - cam.x, hy - cam.y - 28); ctx.stroke();
        const g = ctx.createRadialGradient(hx - cam.x - 6, hy - cam.y - 34, 4, hx - cam.x, hy - cam.y - 28, this.headR);
        g.addColorStop(0, '#c9ced6'); g.addColorStop(1, '#5b6270');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hx - cam.x, hy - cam.y - 28, this.headR, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#3c4250'; ctx.lineWidth = 2; ctx.stroke();
    }
}

class DoorWall {
    // A wall across the lane split into door segments. `fake` segments are the
    // breakable (smashable) doors — the real way through; the rest are solid.
    constructor(o) {
        this.kind = "doorwall";
        this.y = o.y; this.x0 = o.x0; this.x1 = o.x1;
        this.thick = o.thick || 26;
        this.segs = o.segs;     // [{x0,x1,fake,broken}]
        this.tell = !!o.tell;   // breakable doors wear a visible "forward" tell
    }
    update() {}
    segAt(x) { for (const s of this.segs) if (x >= s.x0 && x < s.x1) return s; return null; }
    fakeNear(x) {
        let best = null, bd = 1e9;
        for (const s of this.segs) {
            if (!s.fake && !s.broken) continue;
            const c = (s.x0 + s.x1) / 2, d = Math.abs(c - x);
            if (d < bd) { bd = d; best = c; }
        }
        return best;
    }
    // nearest already-OPEN (broken) door within maxd — used so the AI crowd
    // surges toward a door someone has already smashed.
    openNear(x, maxd) {
        let best = null, bd = maxd != null ? maxd : 1e9;
        for (const s of this.segs) {
            if (!s.broken) continue;
            const c = (s.x0 + s.x1) / 2, d = Math.abs(c - x);
            if (d < bd) { bd = d; best = c; }
        }
        return best;
    }
    // an AI's blind guess at a door to commit to: skilled beans "read" the tell
    // and bias toward a real breakable door; the rest pick one at random.
    guessDoor(skill) {
        const read = (this.tell ? 0.32 : 0.0) + (skill || 0) * 0.42;
        if (U.chance(read)) {
            const reals = this.segs.filter(s => s.fake || s.broken);
            if (reals.length) { const s = U.pick(reals); return (s.x0 + s.x1) / 2; }
        }
        const s = U.pick(this.segs); return (s.x0 + s.x1) / 2;
    }
    collide(bean, round) {
        if (bean.gone || bean.falling) return;
        if (Math.abs(bean.y - this.y) > bean.r + this.thick * 0.5) return;
        if (bean.air > 130) return;                     // jumped clean over the top
        const s = this.segAt(bean.x);
        if (!s || s.broken) return;
        if (s.fake) {
            s.broken = true;
            round.spawnBurst(bean.x, this.y, 20, '#ffd6ec', 14);
            return;
        }
        // bonked a SOLID door: stop, and forget the door we were committed to so
        // the brain re-guesses next frame (the crowd peels off to other doors).
        const side = bean.y > this.y ? 1 : -1;
        bean.y = this.y + side * (bean.r + this.thick * 0.5 + 1);
        const speed = Math.hypot(bean.vx, bean.vy);
        bean.vy = side * Math.min(speed, 200) * 0.3;    // gentle bump so beans recover & keep trying
        // re-pick a DIFFERENT door next frame: nudge the commit toward an open
        // door if one exists, else just drop it (so the crowd keeps shuffling).
        if (bean.isAI && bean._dwWall === this) {
            const openX = this.openNear(bean.x, 400);
            bean._dwX = (openX != null) ? openX : null;
        }
        if (speed > 340) { bean.ragdoll = Math.max(bean.ragdoll, 0.28); bean.everRagdolled = true; }  // only hard dives ragdoll
    }
    draw(ctx, cam) {
        const y = this.y - cam.y;
        ctx.fillStyle = '#5a4632';
        ctx.fillRect(this.x0 - cam.x - 6, y - this.thick / 2 - 8, 6, this.thick + 16);
        ctx.fillRect(this.x1 - cam.x, y - this.thick / 2 - 8, 6, this.thick + 16);
        for (const s of this.segs) {
            const w = s.x1 - s.x0;
            if (s.broken) {
                ctx.fillStyle = 'rgba(120,90,60,0.25)';
                ctx.fillRect(s.x0 - cam.x, y - this.thick / 2, w, this.thick);
            } else {
                ctx.fillStyle = '#caa46a';
                U.roundRect(ctx, s.x0 - cam.x + 3, y - this.thick / 2, w - 6, this.thick, 5); ctx.fill();
                ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = '#ffd23f';
                ctx.beginPath(); ctx.arc(s.x1 - cam.x - 9, y, 3, 0, 6.283); ctx.fill();
            }
        }
    }
}

class Gate {
    // A wall that RISES to block the lane then LOWERS flush so you can cross —
    // time your run for when it's down (or jump a partly-raised one). Gate Crash.
    constructor(o) {
        this.kind = 'gate';
        this.y = o.y; this.x0 = o.x0; this.x1 = o.x1; this.thick = o.thick || 40;
        this.maxH = o.maxH || 220;
        this.period = o.period || 3.6;
        this.down = o.down != null ? o.down : 0.34;     // fraction of the cycle spent fully DOWN
        this.t = (o.phase || 0) * this.period;
        this.h = 0;
    }
    update(dt) {
        this.t += dt;
        const p = (this.t % this.period) / this.period; // 0..1, DOWN window centred on 0
        const d = this.down;
        if (p < d * 0.5 || p > 1 - d * 0.5) this.h = 0;
        else {
            const u = (p - d * 0.5) / (1 - d);          // 0..1 across the raised arc
            this.h = this.maxH * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
        }
    }
    collide(bean, round) {
        if (bean.falling || bean.gone || bean.exited) return;
        if (bean.x < this.x0 - bean.r || bean.x > this.x1 + bean.r) return;   // only this gate's slice
        if (Math.abs(bean.y - this.y) > bean.r + this.thick * 0.5) return;
        if (this.h < bean.r * 0.6) return;              // gate is down → walk over
        if (bean.air > this.h + 8) return;              // jumped clear over the top
        // press-STOP at the gate face (no backward fling) so a queued bean pours
        // straight through the instant the gate drops.
        const side = bean.y > this.y ? 1 : -1;
        bean.y = this.y + side * (bean.r + this.thick * 0.5 + 1);
        if ((side > 0 && bean.vy < 0) || (side < 0 && bean.vy > 0)) bean.vy = 0;
        const speed = Math.hypot(bean.vx, bean.vy);
        if (speed > 300 && bean.diveT > 0) { bean.ragdoll = Math.max(bean.ragdoll, 0.25); bean.everRagdolled = true; }
    }
}

class WindZone {
    // A fan's air current: a rectangular zone that shoves beans in a direction
    // (Big Fans). The fan disc itself is decorative; this is the push field.
    constructor(o) {
        this.kind = 'wind';
        this.x0 = o.x0; this.x1 = o.x1; this.y0 = o.y0; this.y1 = o.y1;
        this.dx = o.dx || 0; this.dy = o.dy || 0;       // push direction
        this.force = o.force || 320; this.color = o.color || '#bfefff';
        this.fanX = o.fanX != null ? o.fanX : (this.x0 + this.x1) / 2;
        this.fanY = o.fanY != null ? o.fanY : (this.y0 + this.y1) / 2;
        this.spin = 0;
    }
    update(dt) { this.spin += dt * 7; }
    collide(bean, round, dt) {
        if (bean.falling || bean.gone || bean.exited) return;
        if (bean.x < this.x0 || bean.x > this.x1 || bean.y < this.y0 || bean.y > this.y1) return;
        const f = this.force * (dt || 0.016);
        bean.vx += this.dx * f; bean.vy += this.dy * f;
    }
}

class BouncePad {
    constructor(o) { this.kind = "bouncepad"; this.x = o.x; this.y = o.y; this.r = o.r || 38; this.t = 0; }
    update(dt) { this.t += dt; }
    collide(bean) {
        if (bean.grounded && !bean.falling && !bean.gone && U.dist(bean.x, bean.y, this.x, this.y) < this.r) {
            bean.bounce(CFG.BOUNCE_V);
            this.t = 0;
        }
    }
    draw(ctx, cam) {
        const sx = this.x - cam.x, sy = this.y - cam.y;
        const pop = Math.max(0, 1 - this.t * 4);
        ctx.fillStyle = '#ff5fa2';
        ctx.beginPath(); ctx.ellipse(sx, sy, this.r, this.r * 0.5, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = U.shade('#ff5fa2', 0.3 + pop * 0.3);
        ctx.beginPath(); ctx.ellipse(sx, sy - pop * 6, this.r * 0.7, this.r * 0.35, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, this.r, this.r * 0.5, 0, 0, 6.283); ctx.stroke();
    }
}

class Conveyor {
    // A belt region that continuously carries grounded beans along (dx,dy).
    constructor(o) {
        this.kind = 'conveyor';
        this.x0 = o.x0; this.x1 = o.x1; this.y0 = o.y0; this.y1 = o.y1;
        this.dx = o.dx || 0; this.dy = o.dy != null ? o.dy : 1;   // +y pushes back down the course
        this.push = o.push || 130; this.color = o.color || '#5ad1ff'; this.t = 0;
    }
    update(dt) { this.t += dt; }
    collide(bean, round, dt) {
        if (bean.falling || bean.gone || bean.exited || !bean.grounded) return;
        if (bean.x < this.x0 || bean.x > this.x1 || bean.y < this.y0 || bean.y > this.y1) return;
        bean.x += this.dx * this.push * (dt || 0.016);
        bean.y += this.dy * this.push * (dt || 0.016);
    }
}

class Bumper {
    // Pinball mushroom that flings beans radially outward on contact.
    constructor(o) {
        this.kind = 'bumper'; this.x = o.x; this.y = o.y; this.r = o.r || 34;
        this.power = o.power || 320; this.color = o.color || '#ffd23f'; this.t = 99;
    }
    update(dt) { this.t += dt; }
    collide(bean, round) {
        if (bean.falling || bean.gone || bean.exited) return;
        const d = U.dist(bean.x, bean.y, this.x, this.y);
        if (d < this.r + bean.r) {
            const nx = (bean.x - this.x) / (d || 1), ny = (bean.y - this.y) / (d || 1);
            bean.hit(nx, ny, this.power, 0.3);
            this.t = 0; round.spawnBurst(bean.x, bean.y, bean.z, this.color, 6);
        }
    }
}

class MovingBlock {
    // A solid wall block sliding side-to-side across the lane; shoves beans.
    constructor(o) {
        this.kind = 'movingblock'; this.cy = o.cy; this.w = o.w || 130; this.thick = o.thick || 40;
        this.height = o.height != null ? o.height : 130;
        this.x0 = o.x0; this.x1 = o.x1; this.speed = o.speed || 150; this.dir = o.dir || 1;
        this.cx = o.cx != null ? o.cx : o.x0; this.color = o.color || '#b06bff';
    }
    update(dt) {
        this.cx += this.dir * this.speed * dt;
        if (this.cx > this.x1) { this.cx = this.x1; this.dir = -1; }
        if (this.cx < this.x0) { this.cx = this.x0; this.dir = 1; }
    }
    collide(bean, round) {
        if (bean.falling || bean.gone || bean.exited || bean.air > this.height) return;
        const dy = bean.y - this.cy, dx = bean.x - this.cx;
        const oy = (bean.r + this.thick * 0.5) - Math.abs(dy);
        const ox = (bean.r + this.w * 0.5) - Math.abs(dx);
        if (oy <= 0 || ox <= 0) return;                 // not overlapping
        // resolve along the SHALLOWER axis so beans slide off instead of being
        // trapped/teleported (the old behaviour pinned you against the wall).
        if (oy <= ox) {
            const s = dy >= 0 ? 1 : -1;
            bean.y = this.cy + s * (bean.r + this.thick * 0.5 + 0.5);
            if (s < 0 && bean.vy < 0) bean.vy = 40;     // bumped back if you ran into its face
        } else {
            const s = dx >= 0 ? 1 : -1;
            bean.x = this.cx + s * (bean.r + this.w * 0.5 + 0.5);
            bean.vx += this.dir * 26;                   // shoved along by the moving wall
        }
    }
}

class SlideWall {
    // A wall spanning the arena width with a GAP you slip through, sliding along
    // y toward the back edge. Miss the gap and it shoves you off. (Block Party.)
    constructor(o) {
        this.kind = 'slidewall';
        this.x0 = o.x0; this.x1 = o.x1;
        this.y = o.y; this.dir = o.dir || 1; this.speed = o.speed || 110;
        this.thick = o.thick || 42; this.height = o.height != null ? o.height : 210;
        this.gapW = o.gapW || 150; this.yMin = o.yMin; this.yMax = o.yMax;
        this.color = o.color || '#9a6cff';
        this.gapX = o.gapX != null ? o.gapX : (this.x0 + this.x1) / 2;
        this._reroll();
    }
    _reroll() { const m = this.gapW / 2 + 12; this.gapX = U.rngf(this.x0 + m, this.x1 - m); }
    update(dt) {
        this.y += this.dir * this.speed * dt;
        if (this.dir > 0 && this.y > this.yMax) { this.y = this.yMin; this._reroll(); }
        else if (this.dir < 0 && this.y < this.yMin) { this.y = this.yMax; this._reroll(); }
    }
    collide(bean, round) {
        if (bean.falling || bean.gone || bean.exited || bean.air > this.height) return;
        if (Math.abs(bean.y - this.y) > bean.r + this.thick * 0.5) return;
        if (bean.x > this.gapX - this.gapW / 2 + bean.r && bean.x < this.gapX + this.gapW / 2 - bean.r) return; // through the gap
        const s = this.dir;
        bean.y = this.y + s * (bean.r + this.thick * 0.5 + 0.5);
        bean.vy += s * 45;                              // shoved toward the back edge
    }
}

class Cannon {
    // Lobs boulders that roll down the course (+y) knocking beans back.
    constructor(o) {
        this.kind = 'cannon'; this.x = o.x; this.y = o.y;
        this.interval = o.interval || 2.3; this.t = o.phase || 0.5;
        this.speed = o.speed || 320; this.ballR = o.ballR || 26;
        this.spread = o.spread || 130; this.reach = o.reach || 1600;
        this.color = o.color || '#e6395a'; this.fruit = !!o.fruit; this.balls = [];
    }
    update(dt, round) {
        const gzf = round && round.groundZ ? round.groundZ : null;
        this.t -= dt;
        if (this.t <= 0) {
            this.t = this.interval;
            const x0 = this.x + U.rngf(-this.spread, this.spread);
            this.balls.push({ x: x0, y: this.y, vx: U.rngf(-26, 26), vy: this.speed, spin: 0,
                gz: gzf ? gzf(x0, this.y) : 0 });
        }
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const b = this.balls[i];
            b.y += b.vy * dt; b.x += b.vx * dt; b.spin += dt * 6;
            b.gz = gzf ? gzf(b.x, b.y) : 0;             // roll along the terrain floor
            if (b.y > this.y + this.reach) this.balls.splice(i, 1);
        }
    }
    collide(bean, round) {
        if (bean.falling || bean.gone || bean.exited || bean.air > 46) return;
        for (const b of this.balls) {
            if (U.dist(bean.x, bean.y, b.x, b.y) < this.ballR + bean.r) {
                const nx = (bean.x - b.x) / (this.ballR + bean.r);
                bean.hit(nx * 0.4, 1, 360, 0.7);
                round.spawnBurst(bean.x, bean.y, bean.z, this.color, 6);
                return;
            }
        }
    }
}

class SpinPlate {
    // A rotating disc platform (Dizzy Heights): beans standing on it are carried
    // around its centre, so you have to walk AGAINST the spin to hold a line.
    constructor(o) {
        this.kind = 'spinplate';
        this.cx = o.cx; this.cy = o.cy; this.r = o.r || 150;
        this.speed = o.speed || 0.8;     // rad/s, signed (CW/CCW)
        this.angle = 0; this.color = o.color || '#8fd0ff';
        this.fan = !!o.fan;              // Big Fans: render as fan blades instead of an arrow disc
    }
    update(dt) { this.angle += this.speed * dt; }
    collide(bean, round, dt) {
        if (bean.falling || bean.gone || bean.exited || bean.air > 12) return;   // must be on the deck
        const dx = bean.x - this.cx, dy = bean.y - this.cy;
        if (dx * dx + dy * dy > this.r * this.r) return;
        const a = this.speed * (dt || 0.016);            // carry around the centre
        const ca = Math.cos(a), sa = Math.sin(a);
        bean.x = this.cx + dx * ca - dy * sa;
        bean.y = this.cy + dx * sa + dy * ca;
    }
}

class HexTile {
    constructor(o) {
        this.kind = "hex";
        this.cx = o.cx; this.cy = o.cy; this.size = o.size;
        this.color = o.color;
        this.fruit = o.fruit != null ? o.fruit : -1;   // Perfect Match: which fruit this tile shows
        this.state = 'solid';        // solid | dissolving | gone
        this.timer = 0;
        this.shake = 0;
    }
    restore() { this.state = 'solid'; this.timer = 0; this.shake = 0; }
    update(dt) {
        if (this.state === 'dissolving') {
            this.timer -= dt; this.shake = Math.min(1, this.shake + dt * 4);
            if (this.timer <= 0) this.state = 'gone';
        }
    }
    contains(x, y) {
        return U.dist2(x, y, this.cx, this.cy) < (this.size * 0.92) * (this.size * 0.92);
    }
    step() { if (this.state === 'solid') { this.state = 'dissolving'; this.timer = 0.75; } }
    draw(ctx, cam) {
        if (this.state === 'gone') return;
        const sh = this.state === 'dissolving' ? Math.sin(this.shake * 40) * 2 : 0;
        const sx = this.cx - cam.x + sh, sy = this.cy - cam.y;
        ctx.save();
        if (this.state === 'dissolving') ctx.globalAlpha = U.clamp(this.timer / 0.75, 0.2, 1);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = U.shade(this.color, -0.3); ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 3 * i - Math.PI / 2;
            const x = sx + Math.cos(a) * this.size, y = sy + Math.sin(a) * this.size * 0.86;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 3 * i - Math.PI / 2;
            const x = sx + Math.cos(a) * this.size * 0.7, y = sy + Math.sin(a) * this.size * 0.6 - this.size * 0.18;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
}
