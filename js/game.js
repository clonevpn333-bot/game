'use strict';

/* =====================================================================
   game.js — boot, main loop, screen state machine and Show progression.
   Screens: menu | customize | howto | trophies | playing | eliminated | victory
   ===================================================================== */

const Game = {
    canvas: null,
    ctx: null,
    last: 0,
    t: 0,
    screen: 'menu',
    show: null,        // { index, beans, round }
    player: null,
    info: null,        // payload for eliminated / victory screens

    init() {
        this.canvas = document.getElementById('gc');
        this.canvas.width = CFG.W;
        this.canvas.height = CFG.H;
        this.ctx = this.canvas.getContext('2d');

        Input.init(this.canvas);
        Save.load();

        this.screen = 'menu';
        requestAnimationFrame(ts => this._loop(ts));
    },

    _loop(ts) {
        let dt = this.last ? (ts - this.last) / 1000 : 0;
        this.last = ts;
        dt = Math.min(dt, 0.05);
        this.t += dt;

        this._update(dt);
        this._render();
        Input.flush();
        requestAnimationFrame(t2 => this._loop(t2));
    },

    // ------------------------------------------------------------------
    _update(dt) {
        UI.update(dt);

        if (this.screen === 'playing') {
            const r = this.show.round;
            r.update(dt);
            if (r.done) this.finishRound();
            if (Input.esc) this.toMenu();
            return;
        }

        // menu-style screens
        if (Input.mouse.clicked) {
            const id = UI.pick(Input.mouse.x, Input.mouse.y);
            if (id) this._onButton(id);
        }
        if (this.screen === 'menu' && Input.confirm) this.startShow();
        if (this.screen !== 'menu' && Input.esc) this.toMenu();
    },

    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CFG.W, CFG.H);
        switch (this.screen) {
            case 'menu':      UI.drawMenu(ctx, this.t); break;
            case 'customize': UI.drawCustomize(ctx, this.t); break;
            case 'howto':     UI.drawHowTo(ctx, this.t); break;
            case 'trophies':  UI.drawTrophies(ctx, this.t); break;
            case 'eliminated':UI.drawEliminated(ctx, this.info); break;
            case 'victory':   UI.drawVictory(ctx, this.info, this.t); break;
            case 'playing': {
                const r = this.show.round;
                r.draw(ctx);
                if (r.phase === 'intro') UI.drawIntro(ctx, r);
                else {
                    UI.drawHUD(ctx, r);
                    if (r.phase === 'ending') UI.drawEndingOverlay(ctx, r);
                }
                UI.drawToasts(ctx);
                break;
            }
        }
    },

    // ------------------------------------------------------------------
    _onButton(id) {
        if (id === 'play')      { this.startShow(); return; }
        if (id === 'customize') { this.screen = 'customize'; return; }
        if (id === 'howto')     { this.screen = 'howto'; return; }
        if (id === 'trophies')  { this.screen = 'trophies'; return; }
        if (id === 'menu')      { this.toMenu(); return; }

        if (id.startsWith('cyc:')) {
            const [, key, dir] = id.split(':');
            const arrays = { color: COLORS, pattern: PATTERNS, faceplate: FACEPLATES, upper: COSTUMES_UPPER, lower: COSTUMES_LOWER };
            const arr = arrays[key];
            const n = arr.length;
            Save.data[key] = (Save.data[key] + (dir === '1' ? 1 : -1) + n) % n;
            Save.save(); Save.checkHeadTurner();
            return;
        }
        if (id.startsWith('emote:')) {
            const [, slot, dir] = id.split(':');
            const i = +slot, n = EMOTES.length;
            Save.data.emotes[i] = (Save.data.emotes[i] + (dir === '1' ? 1 : -1) + n) % n;
            Save.save();
            return;
        }
    },

    toMenu() { this.screen = 'menu'; this.show = null; },

    // ---- Show lifecycle ----------------------------------------------
    startShow() {
        const beans = this._makeField();
        this.show = { index: 0, beans, round: null };
        this.loadRound(0);
    },

    loadRound(i) {
        for (const b of this.show.beans) this._resetBean(b);
        this.show.index = i;
        this.show.round = Rounds.create(SHOW[i], this.show.beans);
        this.screen = 'playing';
    },

    finishRound() {
        const r = this.show.round;
        const res = r.result;

        if (res.outcome === 'qualify') {
            Save.unlock('first_qual');
            if (r.bigTease) Save.unlock('big_tease');
            if (r.category === 'Survival') Save.unlock('survivor');
            const survivors = r.beans.filter(b => b.alive && !b.eliminated);
            this.show.beans = survivors;
            this.loadRound(this.show.index + 1);
            return;
        }

        if (res.outcome === 'win') {
            const flawless = !this.player.everRagdolled;
            Save.recordWin(flawless);
            this.info = {};
            this.screen = 'victory';
            return;
        }

        // eliminate
        Save.recordLoss();
        this.info = {
            roundName: r.def.name,
            place: res.place,
            roundsCleared: this.show.index,
            totalRounds: SHOW.length,
        };
        this.screen = 'eliminated';
    },

    // ---- Field / beans -----------------------------------------------
    _makeField() {
        const beans = [];
        this.player = new Bean({
            x: 0, y: 0, isPlayer: true, name: 'You',
            appearance: Save.appearance(), emoteList: Save.emoteList(),
        });
        beans.push(this.player);

        const names = U.shuffle(BEAN_NAMES.slice());
        for (let i = 0; i < CFG.FIELD_SIZE - 1; i++) {
            beans.push(new Bean({
                x: 0, y: 0, name: names[i % names.length],
                appearance: this._randomAppearance(),
                emoteList: [U.pick(EMOTES), U.pick(EMOTES), U.pick(EMOTES), U.pick(EMOTES)],
            }));
        }
        return beans;
    },

    _randomAppearance() {
        return {
            color: U.pick(COLORS).hex,
            pattern: U.pick(PATTERNS).type,
            upper: U.pick(COSTUMES_UPPER).prop,
            lower: U.pick(COSTUMES_LOWER).prop,
            visor: U.pick(FACEPLATES).visor,
        };
    },

    _resetBean(b) {
        b.vx = 0; b.vy = 0; b.z = 0; b.vz = 0; b.facing = -Math.PI / 2;
        b.alive = true; b.finished = false; b.qualified = false;
        b.eliminated = false; b.falling = false; b.place = 0;
        b.diveT = 0; b.proneT = 0; b.diveCd = 0; b.ragdoll = 0; b.spin = 0; b.squash = 1;
        b.grabbing = null; b.grabbedBy = null; b.grabT = 0;
        b.emoteT = 0; b.emoteAnim = null; b.emoteName = null; b.justEmoted = 99;
        b.ai = { mx: 0, my: 0, jump: false, dive: false };
        b.aiTimer = 0; b.aiJumpLock = 0; b.aiTarget = { x: 0, y: 0 };
        // NOTE: everRagdolled persists across the whole show (Flawless trophy)
    },
};

window.addEventListener('load', () => Game.init());
