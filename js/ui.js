'use strict';

/* =====================================================================
   ui.js — menus, customization, HUD and full-screen overlays.
   Immediate-mode style: each screen redraws its buttons into UI.buttons,
   and Game queries UI.pick(x,y) on click.
   ===================================================================== */

const UI = {
    buttons: [],
    previewBean: null,
    toasts: [],

    rarityColor(r) {
        return { common: '#b9c2cc', uncommon: '#46d36a', rare: '#3fa9ff',
                 epic: '#b06bff', legendary: '#ffd23f' }[r] || '#fff';
    },

    _begin() { this.buttons = []; },
    pick(mx, my) {
        for (const b of this.buttons) if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) return b.id;
        return null;
    },

    _btn(ctx, id, label, x, y, w, h, opt = {}) {
        const hover = Input.mouse.x >= x && Input.mouse.x <= x + w && Input.mouse.y >= y && Input.mouse.y <= y + h;
        const base = opt.color || PAL.gold;
        ctx.save();
        ctx.fillStyle = 'rgba(20,15,40,0.35)';
        U.roundRect(ctx, x + 3, y + 4, w, h, opt.r || 12); ctx.fill();
        ctx.fillStyle = hover ? U.shade(base, 0.18) : base;
        U.roundRect(ctx, x, y, w, h, opt.r || 12); ctx.fill();
        ctx.strokeStyle = U.shade(base, -0.3); ctx.lineWidth = 3;
        U.roundRect(ctx, x, y, w, h, opt.r || 12); ctx.stroke();
        U.text(ctx, label, x + w / 2, y + h / 2 + 1, opt.font || '800 22px system-ui',
            opt.text || PAL.ink, 'center');
        ctx.restore();
        this.buttons.push({ id, x, y, w, h });
        return hover;
    },

    // ---- toasts (achievement unlocks) --------------------------------
    update(dt) {
        while (Save.newlyUnlocked.length) {
            const a = Save.newlyUnlocked.shift();
            this.toasts.push({ a, t: 4 });
        }
        for (let i = this.toasts.length - 1; i >= 0; i--) {
            this.toasts[i].t -= dt;
            if (this.toasts[i].t <= 0) this.toasts.splice(i, 1);
        }
        if (this.previewBean) this.previewBean.bob += dt * 5;
    },
    drawToasts(ctx) {
        let y = 24;
        for (const tt of this.toasts) {
            const a = U.clamp(tt.t, 0, 1);
            ctx.save(); ctx.globalAlpha = a;
            const w = 360, x = CFG.W / 2 - w / 2;
            ctx.fillStyle = PAL.ink; U.roundRect(ctx, x, y, w, 58, 12); ctx.fill();
            ctx.strokeStyle = PAL.gold; ctx.lineWidth = 3; U.roundRect(ctx, x, y, w, 58, 12); ctx.stroke();
            U.text(ctx, '🏆  Trophy Unlocked', x + 16, y + 20, '800 14px system-ui', PAL.gold, 'left');
            U.text(ctx, tt.a.name, x + 16, y + 40, '700 18px system-ui', '#fff', 'left');
            ctx.restore();
            y += 68;
        }
    },

    // ---- background swirl for menus ----------------------------------
    _menuBg(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
        g.addColorStop(0, '#6a5cff'); g.addColorStop(0.5, '#a24bd6'); g.addColorStop(1, '#ff5fa2');
        ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff';
        for (let i = 0; i < 14; i++) {
            const x = (i * 211 + t * 30) % (CFG.W + 100) - 50;
            const y = (i * 137 + Math.sin(t + i) * 20) % CFG.H;
            ctx.beginPath(); ctx.arc(x, y, 26 + (i % 3) * 10, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // ================================================== MENU
    drawMenu(ctx, t) {
        this._begin();
        this._menuBg(ctx, t);

        const by = 150 + Math.sin(t * 2) * 6;
        U.text(ctx, 'BEAN', CFG.W / 2 - 4, by, '900 110px system-ui', PAL.gold, 'center', PAL.ink, 12);
        U.text(ctx, 'ROYALE', CFG.W / 2, by + 96, '900 92px system-ui', '#fff', 'center', PAL.ink, 11);
        U.text(ctx, 'A Fall Guys tribute — dive, bounce & grab your way to the Crown!',
            CFG.W / 2, by + 168, '600 19px system-ui', '#ffe9c2', 'center', PAL.ink, 4);

        const w = 320, x = CFG.W / 2 - w / 2;
        let y = 410;
        this._btn(ctx, 'play', '▶  PLAY SHOW', x, y, w, 64); y += 80;
        this._btn(ctx, 'customize', '🎨  CUSTOMISE', x, y, w, 56, { color: '#5ad1ff' }); y += 70;
        this._btn(ctx, 'trophies', '🏆  TROPHIES', x, y, w, 56, { color: '#b06bff', text: '#fff' }); y += 70;
        this._btn(ctx, 'howto', '?  HOW TO PLAY', x, y, w, 50, { color: '#ff8fb0', text: PAL.ink, font: '800 18px system-ui' });

        U.text(ctx, `Crowns: ${Save.data.crowns}   ·   Win Streak: ${Save.data.streak}   ·   Best: ${Save.data.bestStreak}`,
            CFG.W / 2, CFG.H - 30, '700 16px system-ui', '#fff', 'center', PAL.ink, 4);
        this.drawToasts(ctx);
    },

    // ================================================== CUSTOMISE
    drawCustomize(ctx, t) {
        this._begin();
        this._menuBg(ctx, t * 0.4);
        U.text(ctx, 'CUSTOMISE YOUR BEAN', CFG.W / 2, 56, '900 40px system-ui', PAL.gold, 'center', PAL.ink, 8);

        // preview panel
        ctx.fillStyle = 'rgba(20,15,40,0.30)';
        U.roundRect(ctx, 80, 110, 360, 520, 20); ctx.fill();
        if (!this.previewBean)
            this.previewBean = new Bean({ x: 260, y: 430, isPlayer: true, name: 'You', appearance: Save.appearance() });
        this.previewBean.appearance = Save.appearance();
        this.previewBean.x = 260; this.previewBean.y = 400; this.previewBean.z = 30 + Math.sin(this.previewBean.bob) * 8;
        this.previewBean.r = 52;
        this.previewBean.drawShadow(ctx, { x: 0, y: 0 });
        this.previewBean.draw(ctx, { x: 0, y: 0 });
        this.previewBean.r = CFG.BEAN_R;

        // cosmetic slots
        const slots = [
            ['color',     'Colour',    COLORS,          Save.color()],
            ['pattern',   'Pattern',   PATTERNS,        Save.pattern()],
            ['faceplate', 'Faceplate', FACEPLATES,      Save.faceplate()],
            ['upper',     'Upper',     COSTUMES_UPPER,  Save.upper()],
            ['lower',     'Lower',     COSTUMES_LOWER,  Save.lower()],
        ];
        let y = 130; const lx = 480, lw = 700;
        for (const [key, label, , cur] of slots) {
            ctx.fillStyle = 'rgba(20,15,40,0.30)';
            U.roundRect(ctx, lx, y, lw, 64, 12); ctx.fill();
            U.text(ctx, label, lx + 18, y + 32, '800 18px system-ui', '#fff', 'left');
            this._btn(ctx, 'cyc:' + key + ':-1', '‹', lx + 300, y + 10, 46, 44, { color: '#ffffff', font: '900 26px system-ui' });
            U.text(ctx, cur.name, lx + 470, y + 26, '800 18px system-ui', this.rarityColor(cur.rarity), 'center');
            U.text(ctx, cur.rarity.toUpperCase(), lx + 470, y + 46, '700 12px system-ui', this.rarityColor(cur.rarity), 'center');
            this._btn(ctx, 'cyc:' + key + ':1', '›', lx + 600, y + 10, 46, 44, { color: '#ffffff', font: '900 26px system-ui' });
            y += 74;
        }

        // emote loadout
        U.text(ctx, 'GESTURE LOADOUT  (keys 1–4 in game)', lx + 18, y + 18, '800 16px system-ui', '#ffe9c2', 'left');
        y += 36;
        const ew = 168;
        for (let i = 0; i < 4; i++) {
            const ex = lx + i * (ew + 8);
            const em = EMOTES[Save.data.emotes[i]];
            ctx.fillStyle = 'rgba(20,15,40,0.30)';
            U.roundRect(ctx, ex, y, ew, 70, 10); ctx.fill();
            U.text(ctx, (i + 1) + '  ' + em.name, ex + ew / 2, y + 22, '800 15px system-ui', this.rarityColor(em.rarity), 'center');
            this._btn(ctx, 'emote:' + i + ':-1', '‹', ex + 8, y + 36, 34, 28, { color: '#fff', font: '900 18px system-ui' });
            U.text(ctx, '♪ ' + em.sound, ex + ew / 2, y + 50, '600 10px system-ui', '#dfe6ff', 'center');
            this._btn(ctx, 'emote:' + i + ':1', '›', ex + ew - 42, y + 36, 34, 28, { color: '#fff', font: '900 18px system-ui' });
        }

        this._btn(ctx, 'menu', '‹ BACK', 80, CFG.H - 70, 200, 52, { color: '#ff8fb0', text: PAL.ink });
        this._btn(ctx, 'play', 'START SHOW ▶', CFG.W - 320, CFG.H - 70, 240, 52);
        this.drawToasts(ctx);
    },

    // ================================================== HOW TO PLAY
    drawHowTo(ctx, t) {
        this._begin();
        this._menuBg(ctx, t * 0.3);
        ctx.fillStyle = 'rgba(20,15,40,0.55)';
        U.roundRect(ctx, 140, 70, CFG.W - 280, CFG.H - 160, 20); ctx.fill();
        U.text(ctx, 'HOW TO PLAY', CFG.W / 2, 120, '900 40px system-ui', PAL.gold, 'center', PAL.ink, 7);

        const lines = [
            ['Move', 'WASD / Arrow Keys'],
            ['Jump', 'Space — hop the sweepers & low bars'],
            ['Dive', 'Shift — a fast forward lunge (then a slow recovery)'],
            ['Grab', 'J / L — grab a rival; release to fling them'],
            ['Gesture', '1–4 — perform your equipped emotes'],
            ['Goal', 'Qualify each round; the field shrinks until one bean takes the Crown.'],
        ];
        let y = 190;
        for (const [k, v] of lines) {
            U.text(ctx, k, 230, y, '800 22px system-ui', '#5ad1ff', 'left');
            U.text(ctx, v, 420, y, '600 20px system-ui', '#fff', 'left');
            y += 46;
        }
        y += 8;
        U.text(ctx, 'ROUND TYPES', 230, y, '800 22px system-ui', PAL.gold, 'left'); y += 36;
        for (const d of SHOW) {
            U.text(ctx, `${d.name}`, 250, y, '800 18px system-ui', '#ffe9c2', 'left');
            U.text(ctx, `[${d.category}]  ${d.tagline}`, 470, y, '600 16px system-ui', '#dfe6ff', 'left');
            y += 32;
        }
        this._btn(ctx, 'menu', '‹ BACK', CFG.W / 2 - 110, CFG.H - 78, 220, 52, { color: '#ff8fb0', text: PAL.ink });
    },

    // ================================================== TROPHIES
    drawTrophies(ctx, t) {
        this._begin();
        this._menuBg(ctx, t * 0.3);
        ctx.fillStyle = 'rgba(20,15,40,0.55)';
        U.roundRect(ctx, 180, 70, CFG.W - 360, CFG.H - 160, 20); ctx.fill();
        U.text(ctx, '🏆 TROPHIES', CFG.W / 2, 120, '900 40px system-ui', PAL.gold, 'center', PAL.ink, 7);
        U.text(ctx, `Crowns ${Save.data.crowns}   ·   Best Streak ${Save.data.bestStreak}`,
            CFG.W / 2, 162, '700 18px system-ui', '#fff', 'center');

        let y = 210;
        for (const a of ACHIEVEMENTS) {
            const got = Save.has(a.id);
            ctx.fillStyle = got ? 'rgba(255,210,63,0.18)' : 'rgba(255,255,255,0.05)';
            U.roundRect(ctx, 240, y, CFG.W - 480, 52, 10); ctx.fill();
            U.text(ctx, got ? '✔' : '🔒', 268, y + 26, '700 22px system-ui', got ? PAL.qualGreen : '#888', 'center');
            U.text(ctx, a.name, 300, y + 19, '800 18px system-ui', got ? PAL.gold : '#cfd6e6', 'left');
            U.text(ctx, a.desc, 300, y + 39, '600 14px system-ui', '#cfd6e6', 'left');
            y += 60;
        }
        this._btn(ctx, 'menu', '‹ BACK', CFG.W / 2 - 110, CFG.H - 78, 220, 52, { color: '#ff8fb0', text: PAL.ink });
    },

    // ================================================== HUD
    drawHUD(ctx, round) {
        // round chip
        ctx.fillStyle = 'rgba(20,15,40,0.55)';
        U.roundRect(ctx, 16, 16, 320, 56, 12); ctx.fill();
        U.text(ctx, round.def.name, 28, 38, '800 22px system-ui', '#fff', 'left');
        const catCol = { Race: '#5ad1ff', Survival: '#ffd23f', Final: '#ff5fa2' }[round.category] || '#fff';
        U.text(ctx, round.category.toUpperCase(), 28, 60, '800 14px system-ui', catCol, 'left');

        // counter (right)
        ctx.fillStyle = 'rgba(20,15,40,0.55)';
        U.roundRect(ctx, CFG.W - 276, 16, 260, 56, 12); ctx.fill();
        if (round.kind === 'race') {
            U.text(ctx, 'QUALIFIED', CFG.W - 146, 36, '800 14px system-ui', PAL.qualGreen, 'center');
            U.text(ctx, `${round.qualifiedCount} / ${round.qualifyCount}`, CFG.W - 146, 58, '900 22px system-ui', '#fff', 'center');
        } else if (round.kind === 'survival') {
            U.text(ctx, 'SURVIVE', CFG.W - 146, 36, '800 14px system-ui', PAL.gold, 'center');
            U.text(ctx, U.timeStr(round.timer) + '   ·   ' + round.aliveSoFar() + ' left', CFG.W - 146, 58, '900 20px system-ui', '#fff', 'center');
        } else {
            U.text(ctx, 'BEANS LEFT', CFG.W - 146, 36, '800 14px system-ui', PAL.pink, 'center');
            U.text(ctx, '' + round.aliveSoFar(), CFG.W - 146, 58, '900 22px system-ui', '#fff', 'center');
        }

        // controls hint + emote bar
        ctx.fillStyle = 'rgba(20,15,40,0.45)';
        U.roundRect(ctx, 16, CFG.H - 52, 470, 38, 10); ctx.fill();
        U.text(ctx, 'WASD move · SPACE jump · SHIFT dive · J grab · 1-4 gesture',
            24, CFG.H - 33, '700 14px system-ui', '#fff', 'left');
    },

    // ================================================== ROUND INTRO CARD
    drawIntro(ctx, round) {
        const tIn = CFG.INTRO_TIME - round.phaseT;
        ctx.fillStyle = 'rgba(10,8,24,0.55)';
        ctx.fillRect(0, 0, CFG.W, CFG.H);
        const pop = U.clamp(tIn * 3, 0, 1);
        ctx.save();
        ctx.translate(CFG.W / 2, CFG.H / 2 - 40);
        ctx.scale(pop, pop);
        const catCol = { Race: '#5ad1ff', Survival: '#ffd23f', Final: '#ff5fa2' }[round.category] || '#fff';
        U.text(ctx, round.category.toUpperCase(), 0, -70, '800 26px system-ui', catCol, 'center', PAL.ink, 6);
        U.text(ctx, round.def.name, 0, 0, '900 76px system-ui', PAL.gold, 'center', PAL.ink, 10);
        ctx.restore();
        U.text(ctx, round.def.tagline, CFG.W / 2, CFG.H / 2 + 60, '600 22px system-ui', '#fff', 'center', PAL.ink, 5);

        if (round.phaseT < CFG.COUNTDOWN) {
            const n = Math.ceil(round.phaseT);
            U.text(ctx, n > 0 ? '' + n : 'GO!', CFG.W / 2, CFG.H / 2 + 150, '900 70px system-ui', '#fff', 'center', PAL.ink, 9);
        }
        if (round.def.qualify)
            U.text(ctx, `Top ${round.def.qualify} qualify`, CFG.W / 2, CFG.H - 80, '700 20px system-ui', PAL.qualGreen, 'center', PAL.ink, 4);
    },

    // ================================================== ENDING OVERLAY (in-world)
    drawEndingOverlay(ctx, round) {
        if (!round.result) return;
        const o = round.result.outcome;
        if (o === 'qualify') {
            const pulse = 1 + Math.sin(Date.now() / 120) * 0.04;
            ctx.save(); ctx.translate(CFG.W / 2, 130); ctx.scale(pulse, pulse);
            U.text(ctx, 'QUALIFIED!', 0, 0, '900 72px system-ui', PAL.qualGreen, 'center', PAL.ink, 10);
            ctx.restore();
            U.text(ctx, round.bigTease ? 'Style points! 😎' : `You placed #${round.result.place}`,
                CFG.W / 2, 188, '700 22px system-ui', '#fff', 'center', PAL.ink, 4);
        } else if (o === 'win') {
            U.text(ctx, '👑 VICTORY 👑', CFG.W / 2, 120, '900 70px system-ui', PAL.gold, 'center', PAL.ink, 10);
        } else {
            U.text(ctx, 'ELIMINATED', CFG.W / 2, 130, '900 70px system-ui', PAL.elimRed, 'center', PAL.ink, 10);
        }
    },

    // ================================================== ELIMINATED SCREEN
    drawEliminated(ctx, info) {
        this._begin();
        const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
        g.addColorStop(0, '#3a2350'); g.addColorStop(1, '#1c1430');
        ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
        U.text(ctx, 'ELIMINATED', CFG.W / 2, 180, '900 76px system-ui', PAL.elimRed, 'center', PAL.ink, 10);
        U.text(ctx, `Knocked out in ${info.roundName} — placed #${info.place}`,
            CFG.W / 2, 270, '700 26px system-ui', '#fff', 'center');
        U.text(ctx, `You cleared ${info.roundsCleared} of ${info.totalRounds} rounds`,
            CFG.W / 2, 312, '600 20px system-ui', '#cfd6e6', 'center');
        this._btn(ctx, 'play', '↻  PLAY AGAIN', CFG.W / 2 - 330, 420, 300, 66);
        this._btn(ctx, 'menu', '☰  MAIN MENU', CFG.W / 2 + 30, 420, 300, 66, { color: '#5ad1ff' });
        this.drawToasts(ctx);
    },

    // ================================================== VICTORY SCREEN
    drawVictory(ctx, info, t) {
        this._begin();
        const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
        g.addColorStop(0, '#7b46d6'); g.addColorStop(1, '#ff5fa2');
        ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
        // confetti rain
        for (let i = 0; i < 60; i++) {
            const x = (i * 97 + (t * 120 + i * i) % CFG.W) % CFG.W;
            const y = ((t * 180 + i * 53) % (CFG.H + 40));
            ctx.fillStyle = ['#ffd23f', '#5ad1ff', '#46d36a', '#fff'][i % 4];
            ctx.fillRect(x, y, 7, 11);
        }
        const bob = Math.sin(t * 3) * 8;
        U.text(ctx, '👑', CFG.W / 2, 150 + bob, '120px system-ui', '#fff', 'center');
        U.text(ctx, 'WINNER WINNER!', CFG.W / 2, 280, '900 70px system-ui', PAL.gold, 'center', PAL.ink, 11);
        U.text(ctx, 'You grabbed the Crown!', CFG.W / 2, 340, '700 26px system-ui', '#fff', 'center', PAL.ink, 4);
        U.text(ctx, `Crowns: ${Save.data.crowns}   ·   Win Streak: ${Save.data.streak}`,
            CFG.W / 2, 386, '800 22px system-ui', '#ffe9c2', 'center', PAL.ink, 4);
        this._btn(ctx, 'play', '↻  PLAY AGAIN', CFG.W / 2 - 330, 460, 300, 66);
        this._btn(ctx, 'menu', '☰  MAIN MENU', CFG.W / 2 + 30, 460, 300, 66, { color: '#5ad1ff' });
        this.drawToasts(ctx);
    },
};
