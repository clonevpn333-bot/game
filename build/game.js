'use strict';

/* =====================================================================
   game.js — HEADLESS show/round controller for the 3D build.
   No rendering here: the 3D engine polls Game.screen / Game.show.round
   and builds views; the DOM UI calls these methods via hooks.
   ===================================================================== */

const Game = {
    screen: 'menu',     // menu | customize | howto | trophies | playing | eliminated | victory
    show: null,         // { index, beans, round }
    player: null,
    info: null,

    init() {
        Save.load();
        this.screen = 'menu';
    },

    // Driven by the engine every frame.
    update(dt) {
        if (this.screen === 'loading') {
            this.loadingT -= dt;
            if (this.loadingT <= 0) this.screen = 'playing';
            return;
        }
        if (this.screen === 'playing') {
            const r = this.show.round;
            r.update(dt);
            if (r.done) this.finishRound();
        }
    },

    // ---- UI hooks -----------------------------------------------------
    cycleCosmetic(slot, dir) {
        const arrays = { color: COLORS, pattern: PATTERNS, faceplate: FACEPLATES, upper: COSTUMES_UPPER, lower: COSTUMES_LOWER };
        const arr = arrays[slot]; if (!arr) return;
        const n = arr.length;
        let idx = Save.data[slot];
        for (let k = 0; k < n; k++) { idx = (idx + (dir > 0 ? 1 : -1) + n) % n; if (Save.owns(slot, idx)) break; }
        Save.data[slot] = idx; Save.save(); Save.checkHeadTurner();
    },
    buyCosmetic(slot, idx) {
        if (Save.buy(slot, idx)) { Save.data[slot] = idx; Save.save(); Save.checkHeadTurner(); return true; }
        return false;
    },
    toShop() { this.screen = 'shop'; },
    toFallPass() { this.screen = 'fallpass'; },
    claimPassTier(tier) { return Save.claimPass(tier); },
    rerollShop() { return Save.rerollShop(150); },
    shopSelect(slot, idx) {     // owned -> equip; locked -> buy (+ equip) if affordable
        if (Save.owns(slot, idx)) { Save.data[slot] = idx; Save.save(); Save.checkHeadTurner(); return; }
        if (Save.buy(slot, idx)) { Save.data[slot] = idx; Save.save(); Save.checkHeadTurner(); }
    },
    cycleEmote(i, dir) {
        const n = EMOTES.length;
        Save.data.emotes[i] = (Save.data.emotes[i] + (dir > 0 ? 1 : -1) + n) % n;
        Save.save();
    },

    toMenu() { this.screen = 'menu'; this.show = null; },

    // ---- Show lifecycle ----------------------------------------------
    startShow() {
        const beans = this._makeField();
        this.show = { index: 0, beans, round: null, seq: this._buildSequence(), earned: 0, fame: 0 };
        this.loadRound(0);
    },

    // A fresh, randomised line-up each Show: 2–3 races, 1–2 survival, 1 final.
    _buildSequence() {
        const byCat = c => U.shuffle(SHOW.filter(d => d.category === c).slice());
        const races = byCat('Race'), survs = byCat('Survival'), fins = byCat('Final');
        const RQ = [14, 10, 7, 6];
        const seq = [];
        const nRace = U.rng(2, 3), nSurv = U.rng(1, 2);
        for (let i = 0; i < nRace && i < races.length; i++)
            seq.push(Object.assign({}, races[i], { qualify: RQ[i] }));
        for (let i = 0; i < nSurv && i < survs.length; i++)
            seq.push(Object.assign({}, survs[i], { duration: U.rng(26, 32) }));
        seq.push(fins.length ? U.pick(fins) : SHOW.find(d => d.category === 'Final'));
        return seq;
    },

    loadRound(i) {
        for (const b of this.show.beans) this._resetBean(b);
        this.show.index = i;
        const def = this.show.seq[i];
        this.show.round = Rounds.create(def, this.show.beans);
        // Build the round-select REEL: a long strip of map cards that scrolls
        // fast and lands on the actual next round (Fall Guys' round picker).
        const land = 17, reel = [];
        for (let k = 0; k < land; k++) reel.push(U.pick(SHOW));
        reel.push(def);
        for (let k = 0; k < 5; k++) reel.push(U.pick(SHOW));
        this.loadingInfo = {
            name: def.name, category: def.category, tagline: def.tagline,
            index: i + 1, total: this.show.seq.length, land,
            reel: reel.map(d => ({ name: d.name, category: d.category, tagline: d.tagline })),
        };
        this.loadingT = 2.4;
        this.screen = 'loading';
    },

    finishRound() {
        const r = this.show.round;
        const res = r.result;

        if (res.outcome === 'qualify') {
            Save.unlock('first_qual');
            if (r.bigTease) Save.unlock('big_tease');
            if (r.category === 'Survival') Save.unlock('survivor');
            const e = 100; Save.addKudos(e); this.show.earned += e;
            const f = PASS_FAME.qualify + PASS_FAME.perRound; Save.addFame(f); this.show.fame += f;
            const survivors = r.survivors || r.beans.filter(b => b.alive && !b.eliminated);
            this.show.beans = survivors;
            this.loadRound(this.show.index + 1);
            return;
        }

        if (res.outcome === 'win') {
            const flawless = !this.player.everRagdolled;
            Save.recordWin(flawless);
            const e = 800; Save.addKudos(e); this.show.earned += e;
            const f = PASS_FAME.win; Save.addFame(f); this.show.fame += f;
            this.info = { crowns: Save.data.crowns, streak: Save.data.streak,
                earned: this.show.earned, kudos: Save.data.kudos, fame: this.show.fame };
            this.screen = 'victory';
            return;
        }

        const e = 50; Save.addKudos(e); this.show.earned += e;
        const f = PASS_FAME.played; Save.addFame(f); this.show.fame += f;
        Save.recordLoss();
        this.info = {
            roundName: r.def.name, place: res.place,
            roundsCleared: this.show.index, totalRounds: this.show.seq.length,
            earned: this.show.earned, kudos: Save.data.kudos, fame: this.show.fame,
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
        b.eliminated = false; b.falling = false; b.exited = false; b.place = 0;
        b.diveT = 0; b.proneT = 0; b.diveCd = 0; b.ragdoll = 0; b.spin = 0; b.squash = 1;
        b.grabbing = null; b.grabbedBy = null; b.grabT = 0;
        b.emoteT = 0; b.emoteAnim = null; b.emoteName = null; b.justEmoted = 99;
        b.ai = { mx: 0, my: 0, jump: false, dive: false };
        b.aiTimer = 0; b.aiJumpLock = 0; b.aiTarget = { x: 0, y: 0 };
        // everRagdolled persists across the whole show (Flawless trophy)
    },
};
