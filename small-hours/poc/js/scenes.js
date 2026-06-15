'use strict';
/* =============================================================================
   SMALL HOURS — POC scenes (the playable vertical slice).
   Each scene:  enter() · update(dt) · draw(g)=atmospheric art (filtered) ·
   drawOverlay(dctx)=crisp UI (subtitles/buttons) · onClick(x,y) · filterMode · deg()
   Scenes draw into VW x VH space; FILTER degrades draw(); drawOverlay is crisp.
   ============================================================================= */
const SCENES = (() => {
    const PAN = 130;                 // world parallax offset (px) at full pan
    const C = { dim: '#0a0d0a', wall: '#13171300', red: '#ff2b2b', green: '#7dffb0', paper: '#cfe0cf', ink: '#0c120c' };

    // ---------- shared draw helpers ----------
    function clearBG(g, top, bot) {
        const grad = g.createLinearGradient(0, 0, 0, VH);
        grad.addColorStop(0, top); grad.addColorStop(1, bot);
        g.fillStyle = grad; g.fillRect(0, 0, VW, VH);
    }
    function lines(ctx, text, maxW) {
        const words = text.split(' '); const out = []; let line = '';
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
        }
        if (line) out.push(line); return out;
    }
    function wrap(ctx, text, x, y, maxW, lh) { lines(ctx, text, maxW).forEach((l, i) => ctx.fillText(l, x, y + i * lh)); }
    function center(ctx, text, y, font, color) { ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(text, VW / 2, y); ctx.restore(); }
    function button(ctx, b, hover) {
        ctx.save();
        ctx.strokeStyle = hover ? 'rgba(235,235,235,0.95)' : 'rgba(200,200,200,0.55)';
        ctx.fillStyle = hover ? 'rgba(40,55,40,0.55)' : 'rgba(20,28,20,0.45)';
        ctx.lineWidth = 2; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#dfeadf'; ctx.font = '17px "Courier New", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
        ctx.restore();
    }
    function hit(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }

    // The first-person sleep room. wo = world offset (parallax); vis = {show, closeness, frozen}
    function room(g, wo, vis, moon) {
        clearBG(g, '#0a0d0c', '#050605');
        // back wall
        g.fillStyle = '#0f1411'; g.fillRect(120 + wo * 0.3, 120, VW - 240, 230);
        // window + venetian blind moonlight (left wall)
        const wx = 150 + wo * 0.6;
        g.fillStyle = 'rgba(150,180,210,' + (0.10 + 0.06 * moon) + ')';
        g.fillRect(wx, 140, 150, 170);
        g.fillStyle = 'rgba(8,10,9,0.85)';
        for (let i = 0; i < 9; i++) g.fillRect(wx, 146 + i * 19, 150, 9);   // blinds
        // light bars cast across the bed/floor
        g.save(); g.globalAlpha = 0.07 + 0.05 * moon; g.fillStyle = '#cfe0ff';
        for (let i = 0; i < 5; i++) g.fillRect(180 + wo, 360 + i * 24, VW - 360, 9);
        g.restore();
        // one-way mirror (right wall)
        const mx = VW - 250 + wo * 0.6;
        const mg = g.createLinearGradient(mx, 150, mx + 150, 320);
        mg.addColorStop(0, 'rgba(40,50,55,0.5)'); mg.addColorStop(1, 'rgba(10,14,16,0.6)');
        g.fillStyle = mg; g.fillRect(mx, 150, 150, 170);
        g.strokeStyle = 'rgba(70,80,85,0.4)'; g.strokeRect(mx, 150, 150, 170);
        // in-world wall camera + red REC dot
        const cx = VW - 90 + wo * 0.5;
        g.fillStyle = '#1a1f1c'; g.fillRect(cx, 96, 46, 26);
        g.fillStyle = C.red; g.beginPath(); g.arc(cx + 38, 109, 4, 0, 7); g.fill();
        g.save(); g.globalAlpha = 0.25; g.fillStyle = C.red; g.beginPath(); g.arc(cx + 38, 109, 8, 0, 7); g.fill(); g.restore();
        // foot of bed (closest, darkest) + sheets
        g.fillStyle = '#0b0f0c'; g.fillRect(150 + wo * 0.2, 470, VW - 300, 70);
        g.fillStyle = 'rgba(120,130,120,0.10)'; g.fillRect(220 + wo * 0.2, 392, VW - 440, 86);
        // The Visitor — correct human silhouette, at the foot of the bed
        if (vis && vis.show) {
            const s = 0.85 + (vis.closeness || 0) * 1.7;
            const bx = VW / 2 + wo, by = 470;            // feet line at footboard
            const h = 250 * s, w = 70 * s;
            g.save();
            g.fillStyle = 'rgba(3,4,3,0.96)';
            // torso
            g.beginPath(); g.moveTo(bx - w * 0.32, by);
            g.lineTo(bx - w * 0.40, by - h * 0.62);
            g.quadraticCurveTo(bx - w * 0.5, by - h * 0.72, bx - w * 0.30, by - h * 0.76);
            g.lineTo(bx + w * 0.30, by - h * 0.76);
            g.quadraticCurveTo(bx + w * 0.5, by - h * 0.72, bx + w * 0.40, by - h * 0.62);
            g.lineTo(bx + w * 0.32, by); g.closePath(); g.fill();
            // arms (too long, hanging straight)
            g.fillRect(bx - w * 0.46, by - h * 0.62, w * 0.14, h * 0.55);
            g.fillRect(bx + w * 0.32, by - h * 0.62, w * 0.14, h * 0.55);
            // head
            g.beginPath(); g.ellipse(bx, by - h * 0.83, w * 0.22, h * 0.10, 0, 0, 7); g.fill();
            // faint rim so it reads against the dark
            g.strokeStyle = 'rgba(90,110,95,0.10)'; g.lineWidth = 1.5; g.stroke();
            // eyes: dead catchlights — present, but they don't track or blink (Visitor)
            g.fillStyle = vis.frozen ? 'rgba(150,175,160,0.10)' : 'rgba(150,175,160,0.28)';
            g.beginPath(); g.arc(bx - w * 0.09, by - h * 0.84, 2.2 * s, 0, 7); g.fill();
            g.beginPath(); g.arc(bx + w * 0.09, by - h * 0.84, 2.2 * s, 0, 7); g.fill();
            g.restore();
        }
    }

    // EEG phosphor readout from a samples array (values ~ -1..1)
    function eeg(g, samples, x, y, w, h) {
        g.save();
        g.fillStyle = 'rgba(2,10,4,0.85)'; g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(40,90,55,0.35)'; g.lineWidth = 1;
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x, y + h * i / 4); g.lineTo(x + w, y + h * i / 4); g.stroke(); }
        g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath();
        const n = samples.length;
        if (n < 2) { g.restore(); return; }
        for (let i = 0; i < n; i++) {
            const px = x + (i / (n - 1)) * w, py = y + h / 2 - samples[i] * (h / 2 - 6);
            i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.stroke();
        g.fillStyle = 'rgba(125,255,176,0.7)'; g.font = '12px "Courier New", monospace';
        g.fillText('EEG  C3-A2', x + 8, y + 16);
        g.restore();
    }
    function pushEEG(arr, dread, t, max) {
        const v = 0.18 * Math.sin(t * 6) + 0.10 * Math.sin(t * 17)
            + dread * (0.6 * Math.sin(t * 40) + (Math.random() - 0.5) * 0.7);
        arr.push(Math.max(-1, Math.min(1, v)));
        while (arr.length > max) arr.shift();
    }

    // ============================ SCENES ============================
    const S = {};

    // ---- BOOT ----
    S.boot = {
        filterMode: 'light', deg() { return 0.22; },
        enter() { PROFILER.reset(); this.t = 0; this.returning = PROFILER.visits() > 0; },
        update(dt) { this.t += dt; },
        draw(g) { clearBG(g, '#070908', '#020302'); },
        drawOverlay(d) {
            center(d, 'SMALL HOURS', 150, '64px "Courier New", monospace', '#dfe7df');
            center(d, 'EPISODE ONE — THE ASHGROVE STUDY', 196, '20px "Courier New", monospace', '#8fa898');
            center(d, '( proof of concept · ~4 min · single-player )', 226, '14px "Courier New", monospace', '#5d6d62');
            d.save(); d.textAlign = 'center'; d.fillStyle = '#6f7d72'; d.font = '14px "Courier New", monospace';
            wrapCenter(d, 'CONTENT: medical settings, helplessness, the dark. This demo quietly profiles HOW you play (mouse/keys only) and reads it back at the end. 100% local — nothing leaves your machine.', VW / 2, 300, 620, 20);
            d.restore();
            if (this.returning)
                center(d, 'ASHGROVE WELLNESS — prior record located. Welcome back, subject.', 392, '15px "Courier New", monospace', '#b88');
            if ((this.t % 1.4) < 0.8)
                center(d, '[ click to begin ]', 452, '22px "Courier New", monospace', '#dfe7df');
        },
        onClick() { SOUND.ensure(); SOUND.startHum(); SOUND.startDrone(); GAME.go('arrival'); }
    };

    // ---- ARRIVAL (exterior + phone) ----
    S.arrival = {
        filterMode: 'full', deg() { return 0.30; },
        enter() { this.t = 0; },
        update(dt) { this.t += dt; },
        draw(g) {
            clearBG(g, '#0a1018', '#05070a');
            // building
            g.fillStyle = '#0b0f0d'; g.fillRect(0, 300, VW, 240);
            g.fillStyle = '#0e1311'; g.fillRect(180, 210, 600, 110);
            // glowing sign
            g.save(); g.shadowColor = '#79d9ff'; g.shadowBlur = 24;
            g.fillStyle = '#bfe8ff'; g.font = '30px "Courier New", monospace'; g.textAlign = 'center';
            g.fillText('ASHGROVE SLEEP CENTER', VW / 2, 256); g.restore();
            // a couple of windows lit
            g.fillStyle = 'rgba(200,210,170,0.25)'; g.fillRect(250, 250, 40, 40); g.fillRect(680, 250, 40, 40);
            // parking lot lines + headlight wash
            g.strokeStyle = 'rgba(180,180,160,0.18)'; g.lineWidth = 3;
            for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(120 + i * 120, 540); g.lineTo(220 + i * 90, 360); g.stroke(); }
            g.save(); g.globalAlpha = 0.12; const hg = g.createRadialGradient(VW / 2, 560, 20, VW / 2, 560, 320);
            hg.addColorStop(0, '#fff'); hg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hg; g.fillRect(0, 360, VW, 180); g.restore();
        },
        drawOverlay(d) {
            // phone panel
            const px = 40, py = 330, pw = 300, ph = 170;
            d.save(); d.fillStyle = 'rgba(8,12,10,0.82)'; d.strokeStyle = 'rgba(120,140,120,0.4)'; d.lineWidth = 2;
            d.fillRect(px, py, pw, ph); d.strokeRect(px, py, pw, ph);
            d.fillStyle = '#7fa890'; d.font = '12px "Courier New", monospace';
            d.fillText('● MESSAGES', px + 14, py + 22);
            d.fillStyle = '#dfeadf'; d.font = '14px "Courier New", monospace';
            d.fillText('Maya:  did you GET it?? 🙏', px + 14, py + 50);
            d.fillText('Mom:   drive safe baby', px + 14, py + 74);
            d.fillText('Landlord: rent was due the 1st.', px + 14, py + 98);
            d.fillStyle = '#ff7a7a'; d.fillText('BANK:  balance  -$43.18', px + 14, py + 132);
            d.restore();
            if ((this.t % 1.4) < 0.8) center(d, '[ click to go inside ]', 520, '18px "Courier New", monospace', '#dfe7df');
        },
        onClick() { GAME.go('consent'); }
    };

    // ---- CONSENT (read p.4 or don't — it's logged) ----
    S.consent = {
        filterMode: 'light', deg() { return 0.20; },
        enter() {
            this.t0 = Date.now(); this.page4 = false;
            this.buttons = [
                { x: 250, y: 430, w: 200, h: 46, label: 'VIEW PAGE 4', action: () => { this.page4 = !this.page4; PROFILER.set('readDisclosure', true); } },
                { x: 510, y: 430, w: 200, h: 46, label: 'SIGN HERE  ✗', action: () => { PROFILER.set('signDelayMs', Date.now() - this.t0); SOUND.heartbeat(58); GAME.go('wiring'); } }
            ];
        },
        update() {},
        draw(g) { clearBG(g, '#0c0e0c', '#070807'); g.fillStyle = 'rgba(190,200,185,0.06)'; g.fillRect(180, 70, 600, 420); },
        drawOverlay(d) {
            center(d, 'ASHGROVE SLEEP CENTER', 110, '24px "Courier New", monospace', '#dfeadf');
            center(d, 'OVERNIGHT STUDY — PARTICIPANT CONSENT', 138, '15px "Courier New", monospace', '#9fb0a4');
            d.save(); d.fillStyle = '#aebbb0'; d.font = '14px "Courier New", monospace';
            wrapCenter(d, 'You agree to remain in the bed and to keep all sensors attached for the full session. You will be observed and recorded for the entire duration. Compensation ($1,200) is paid only for a COMPLETE session.', VW / 2, 190, 540, 22);
            if (this.page4) {
                d.fillStyle = '#ff8a8a';
                wrapCenter(d, 'p.4 — DISCLOSURE: Subject grants Ashgrove Wellness LLC perpetual, irrevocable rights to all session data and derivative recordings, including physiological and behavioral responses, for any commercial purpose, without further notice or compensation.', VW / 2, 300, 540, 22);
            } else {
                d.fillStyle = '#5f6f64'; d.font = '13px "Courier New", monospace';
                center(d, '(page 4 — disclosure — most people sign without reading it)', 318, '13px "Courier New", monospace', '#5f6f64');
            }
            d.restore();
            const mx = GAME.mx, my = GAME.my;
            this.buttons.forEach(b => button(d, b, hit(b, mx, my)));
        },
        onClick(x, y) { for (const b of this.buttons) if (hit(b, x, y)) { b.action(); return; } }
    };

    // ---- WIRING UP (rules over the room) ----
    S.wiring = {
        filterMode: 'full', deg() { return 0.30; },
        enter() {
            this.t = 0; this.i = 0;
            this.script = [
                "MARCUS:  This gel's a little cold, sorry. That's normal.",
                "MARCUS:  Rule one — stay in the bed.",
                "MARCUS:  Rule two — don't remove the sensors. We can't pay out an incomplete session.",
                "MARCUS:  Press the call button if you need me. I'm right here, watching your readings.",
                "MARCUS:  Ever feel like someone's standing right where I am now? ...You will tonight. It's the study.",
                "MARCUS:  Just sleep naturally. Easy money."
            ];
        },
        update(dt) { this.t += dt; this.i = Math.min(this.script.length - 1, Math.floor(this.t / 3.2)); },
        draw(g) { room(g, 6 * Math.sin(this.t * 0.4), { show: false }, 0.6); },
        drawOverlay(d) {
            d.save(); d.fillStyle = 'rgba(0,0,0,0.55)'; d.fillRect(0, 452, VW, 60);
            center(d, this.script[this.i], 488, '18px "Courier New", monospace', '#e6efe6'); d.restore();
            if (this.t > this.script.length * 3.2)
                center(d, '[ click when you are ready to sleep ]', 250, '18px "Courier New", monospace', '#cfe0cf');
        },
        onClick() { if (this.t > this.script.length * 3.2) { GAME.flash(0.8); GAME.go('sleep'); } }
    };

    // ---- SLEEP (breathe-to-sleep) ----
    S.sleep = {
        filterMode: 'full', deg() { return 0.30 + 0.1 * this.meter; },
        enter() { this.t = 0; this.meter = 0; this.wasSpace = false; this.lastBreath = 0; this.eeg = []; this.guide = 0; },
        update(dt) {
            this.t += dt;
            this.guide = (Math.sin(this.t * 0.9) + 1) / 2;            // breath guide 0..1
            const sp = GAME.key('Space');
            if (sp && !this.wasSpace) {                                // exhale edge = one breath
                const now = this.t; PROFILER.breath(this.lastBreath ? (now - this.lastBreath) * 1000 : 0);
                this.lastBreath = now; this.meter = Math.min(1, this.meter + 0.2);
                SOUND.heartbeat(Math.max(46, 58 - this.meter * 14));
            }
            this.wasSpace = sp;
            this.meter = Math.max(0, this.meter - dt * 0.04);          // gentle decay
            pushEEG(this.eeg, 0.05 + 0.1 * (1 - this.meter), this.t, 240);
            if (this.meter >= 1) { GAME.flash(0.9); GAME.go('paralysis'); }
        },
        draw(g) {
            room(g, 0, { show: false }, 0.5 * (1 - this.meter));
            // breath guide ring (expands on exhale phase)
            const r = 30 + this.guide * 55, cx = VW / 2, cy = 250;
            g.save(); g.strokeStyle = 'rgba(150,200,170,' + (0.25 + 0.25 * this.guide) + ')'; g.lineWidth = 3;
            g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke();
            g.strokeStyle = 'rgba(150,200,170,0.12)'; g.beginPath(); g.arc(cx, cy, 90, 0, 7); g.stroke();
            g.restore();
            eeg(g, this.eeg, 360, 470, 240, 56);
            // sleep meter bar
            g.fillStyle = 'rgba(120,150,120,0.25)'; g.fillRect(360, 458, 240, 4);
            g.fillStyle = 'rgba(150,210,170,0.8)'; g.fillRect(360, 458, 240 * this.meter, 4);
        },
        drawOverlay(d) {
            center(d, 'HOLD  [SPACE]  to exhale with the ring. Sleep when it darkens.', 110, '17px "Courier New", monospace', 'rgba(220,230,220,' + (0.8 - 0.6 * this.meter) + ')');
        }
    };

    // ---- PARALYSIS (eyes-only; what you look at is logged) ----
    S.paralysis = {
        filterMode: 'full',
        deg() { return 0.45 + 0.25 * (this.vis ? this.vis.closeness : 0) + (this.lookedAt ? 0.15 : 0); },
        enter() {
            this.t = 0; this.timer = 22; this.eeg = []; this.confSec = 0; this.avoidSec = 0;
            this.vis = { show: true, closeness: 0, frozen: false }; this.lookedAt = false;
            this.wasLooked = false; this.clean = false; this.flashVal = 0; this.done = false;
            SOUND.heartbeat(92); SOUND.startTone();
        },
        update(dt) {
            this.t += dt;
            if (this.done) { return; }
            const panX = (GAME.mx / VW - 0.5) * 2;                      // -1..1
            this.wo = -panX * PAN;
            this.lookedAt = Math.abs(panX) < 0.22;                      // looking straight ahead = at it
            this.vis.frozen = this.lookedAt;
            const steady = GAME.key('ShiftLeft') || GAME.key('ShiftRight');
            if (steady) PROFILER.set('steadied', true);

            if (this.lookedAt) {
                this.confSec += dt;
                if (!this.wasLooked) SOUND.stinger();                  // edge: you met its eyes
            } else {
                this.avoidSec += dt;
                this.vis.closeness = Math.min(1, this.vis.closeness + dt * 0.07); // creeps closer
            }
            this.wasLooked = this.lookedAt;

            this.timer -= dt * (steady ? 1.7 : 1.0);
            PROFILER.inc('enduredMs', dt * 1000);
            pushEEG(this.eeg, this.lookedAt ? 0.9 : 0.45 + this.vis.closeness * 0.3, this.t, 240);

            if (this.timer <= 0) {                                     // ---- clean-frame reveal ----
                this.done = true; this.clean = true; this.flashVal = 1; this.revealT = 0;
                SOUND.silence();
                PROFILER.set('confronts', this.confSec); PROFILER.set('avoids', this.avoidSec);
            }
        },
        // when done: hold a clean reveal then move on
        postUpdate(dt) {
            if (!this.done) return;
            this.revealT += dt; this.flashVal = Math.max(0, this.flashVal - dt * 2.2);
            this.vis.closeness = Math.min(1, this.vis.closeness + dt * 0.9); // it surges in, clear and close
            if (this.revealT > 1.2) GAME.go('glass');
        },
        draw(g) {
            room(g, this.wo || 0, this.vis, 0.3);
            if (!this.done) eeg(g, this.eeg, 360, 470, 240, 56);
        },
        drawOverlay(d) {
            if (this.done) return;
            const a = Math.max(0, 1 - this.t / 3);
            if (a > 0) center(d, 'you can only move your eyes', 120, '20px "Courier New", monospace', 'rgba(225,225,225,' + a + ')');
            center(d, '[ hold SHIFT to steady your breathing ]', 510, '14px "Courier New", monospace', 'rgba(180,190,180,0.5)');
        }
    };

    // ---- GLASS (the reveal) ----
    S.glass = {
        filterMode: 'full', deg() { return 0.40; },
        enter() { this.t = 0; SOUND.startDrone(); },
        update(dt) { this.t += dt; },
        draw(g) {
            clearBG(g, '#04110a', '#020805');
            // bank of monitors
            for (let i = 0; i < 6; i++) {
                const x = 70 + (i % 3) * 290, y = 90 + ((i / 3) | 0) * 180;
                g.fillStyle = '#021006'; g.fillRect(x, y, 250, 150);
                g.strokeStyle = 'rgba(40,90,55,0.5)'; g.strokeRect(x, y, 250, 150);
                g.strokeStyle = C.green; g.lineWidth = 1.5; g.beginPath();
                for (let k = 0; k < 60; k++) { const px = x + k * 4, py = y + 75 + Math.sin(k * 0.6 + i + this.t * 2) * 30 * Math.random(); k ? g.lineTo(px, py) : g.moveTo(px, py); }
                g.stroke();
                if (i === 4) { g.fillStyle = 'rgba(125,255,176,0.5)'; g.font = '12px monospace'; g.fillText('CAM 3 — IR — BED EMPTY', x + 10, y + 20); }
            }
            // wall of tapes (right)
            for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
                const x = 760 + c * 95, y = 90 + r * 40;
                g.fillStyle = r === 0 && c === 0 ? '#3a1414' : '#15110c';
                g.fillRect(x, y, 85, 30); g.strokeStyle = 'rgba(120,110,90,0.4)'; g.strokeRect(x, y, 85, 30);
            }
        },
        drawOverlay(d) {
            const dt = new Date();
            d.fillStyle = '#ff9a9a'; d.font = '11px "Courier New", monospace';
            d.fillText('TONIGHT ' + dt.toLocaleDateString() + ' — REC', 766, 110);
            d.save(); d.fillStyle = 'rgba(0,0,0,0.6)'; d.fillRect(0, 452, VW, 70);
            const line = this.t < 3 ? "MARCUS:  You weren't supposed to be up yet."
                : this.t < 6 ? "MARCUS:  But honestly? This is even better."
                    : "[ click ]";
            center(d, line, 492, '19px "Courier New", monospace', '#e6efe6'); d.restore();
        },
        onClick() { if (this.t > 4) GAME.go('report'); }
    };

    // ---- REPORT (the Fear Profile end-card) ----
    S.report = {
        filterMode: 'light', deg() { return 0.20; },
        enter() {
            PROFILER.recordVisit(); this.rep = PROFILER.report(); this.t = 0;
            SOUND.silence(); SOUND.startDrone();
            this.buttons = [
                { x: 250, y: 486, w: 200, h: 40, label: 'PLAY AGAIN', action: () => GAME.go('boot') },
                { x: 510, y: 486, w: 230, h: 40, label: 'DELETE RECORD', action: () => { try { localStorage.removeItem('ashgrove_visits'); } catch (e) {} this.deleted = true; } }
            ];
        },
        update(dt) { this.t += dt; },
        draw(g) { clearBG(g, '#0c0e0c', '#070807'); g.fillStyle = 'rgba(200,210,195,0.05)'; g.fillRect(110, 50, VW - 220, 420); },
        drawOverlay(d) {
            d.save();
            center(d, 'ASHGROVE WELLNESS LLC — SESSION SUMMARY', 88, '20px "Courier New", monospace', '#dfeadf');
            d.strokeStyle = 'rgba(150,170,150,0.4)'; d.beginPath(); d.moveTo(150, 104); d.lineTo(VW - 150, 104); d.stroke();
            d.font = '15px "Courier New", monospace'; d.textAlign = 'left';
            let y = 134;
            for (const [k, v] of this.rep.rows) {
                d.fillStyle = '#88998c'; d.fillText(k, 165, y);
                d.fillStyle = '#e3ece3'; d.fillText(String(v), 470, y); y += 26;
            }
            d.strokeStyle = 'rgba(150,170,150,0.25)'; d.beginPath(); d.moveTo(150, y); d.lineTo(VW - 150, y); d.stroke();
            d.fillStyle = '#c9a3a3'; d.font = 'italic 14px "Courier New", monospace';
            wrap(d, 'NOTE: ' + this.rep.note, 165, y + 24, VW - 330, 20);
            if (this.rep.visitLine) { d.fillStyle = '#ff9a9a'; d.fillText(this.rep.visitLine, 165, y + 78); }
            if (this.deleted) { d.fillStyle = '#7d9a7d'; d.fillText('record deleted. (we kept a copy.)', 165, y + 100); }
            d.restore();
            // footer + blinking REC
            d.save(); d.textAlign = 'center'; d.fillStyle = '#cdbfae'; d.font = '14px "Courier New", monospace';
            this.rep.footer.split('\n').forEach((l, i) => d.fillText(l, VW / 2, 446 + i * 20)); d.restore();
            const mx = GAME.mx, my = GAME.my;
            this.buttons.forEach(b => button(d, b, hit(b, mx, my)));
        },
        onClick(x, y) { for (const b of this.buttons) if (hit(b, x, y)) { b.action(); return; } }
    };

    function wrapCenter(ctx, text, cx, y, maxW, lh) {
        ctx.save(); ctx.textAlign = 'center';
        lines(ctx, text, maxW).forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
        ctx.restore();
    }

    return S;
})();
