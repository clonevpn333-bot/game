'use strict';

/* =====================================================================
   save.js — persistent profile: equipped cosmetics, crowns, win streak,
   and unlocked achievements. Wraps localStorage (guarded for headless).
   ===================================================================== */

const Save = {
    data: null,
    newlyUnlocked: [],   // queue of achievement objects for the UI to toast

    _defaults() {
        return {
            color: 1, pattern: 0, upper: 1, lower: 1, faceplate: 0,
            emotes: [0, 1, 2, 5],          // gestures stay free
            kudos: 600,                    // shop currency
            owned: null,                   // {slot:{idx:true}} — seeded on load (commons free)
            crowns: 0,
            streak: 0,
            bestStreak: 0,
            showsPlayed: 0,
            achievements: {},              // id -> true
        };
    },

    load() {
        let loaded = null;
        try {
            const raw = window.localStorage.getItem(CFG.SAVE_KEY);
            if (raw) loaded = JSON.parse(raw);
        } catch (e) { /* storage unavailable — run with defaults */ }
        this.data = Object.assign(this._defaults(), loaded || {});
        if (!Array.isArray(this.data.emotes) || this.data.emotes.length !== 4) {
            this.data.emotes = [0, 1, 2, 5];
        }
        if (this.data.kudos == null) this.data.kudos = 600;
        this._seedOwned();
        this._validateEquipped();
        return this.data;
    },

    // ---- Shop / ownership --------------------------------------------
    _slots() { return { color: COLORS, pattern: PATTERNS, faceplate: FACEPLATES, upper: COSTUMES_UPPER, lower: COSTUMES_LOWER }; },
    _seedOwned() {
        const slots = this._slots();
        if (!this.data.owned || typeof this.data.owned !== 'object') this.data.owned = {};
        for (const k in slots) {
            if (!this.data.owned[k]) this.data.owned[k] = {};
            slots[k].forEach((item, i) => { if (item.rarity === 'common') this.data.owned[k][i] = true; });
        }
        this.data.owned.upper[0] = true; this.data.owned.lower[0] = true;   // 'None' always owned
    },
    _validateEquipped() {
        const def = { color: 1, pattern: 0, faceplate: 0, upper: 1, lower: 1 };
        for (const k in def) if (!this.owns(k, this.data[k])) this.data[k] = def[k];
    },
    owns(slot, idx) { return !!(this.data.owned[slot] && this.data.owned[slot][idx]); },
    priceOf(slot, idx) {
        const item = this._slots()[slot][idx];
        return ({ common: 0, uncommon: 500, rare: 1200, epic: 3000, legendary: 8000 })[item ? item.rarity : 'common'] || 0;
    },
    buy(slot, idx) {
        if (this.owns(slot, idx)) return false;
        const p = this.priceOf(slot, idx);
        if ((this.data.kudos || 0) < p) return false;
        this.data.kudos -= p;
        this.data.owned[slot][idx] = true;
        this.save();
        return true;
    },
    addKudos(n) { this.data.kudos = (this.data.kudos || 0) + n; this.save(); },

    save() {
        try {
            window.localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(this.data));
        } catch (e) { /* ignore */ }
    },

    // ---- Equipped cosmetic accessors ---------------------------------
    color()     { return COLORS[this.data.color]; },
    pattern()   { return PATTERNS[this.data.pattern]; },
    upper()     { return COSTUMES_UPPER[this.data.upper]; },
    lower()     { return COSTUMES_LOWER[this.data.lower]; },
    faceplate() { return FACEPLATES[this.data.faceplate]; },
    emoteList() { return this.data.emotes.map(i => EMOTES[i]); },

    // Build an appearance object the renderer understands
    appearance() {
        return {
            color:    this.color().hex,
            pattern:  this.pattern().type,
            upper:    this.upper().prop,
            lower:    this.lower().prop,
            visor:    this.faceplate().visor,
        };
    },

    // ---- Achievements -------------------------------------------------
    unlock(id) {
        if (this.data.achievements[id]) return false;       // already had it
        this.data.achievements[id] = true;
        const def = ACHIEVEMENTS.find(a => a.id === id);
        if (def) this.newlyUnlocked.push(def);
        this.save();
        return true;
    },
    has(id) { return !!this.data.achievements[id]; },

    // Head Turner — all four equipped cosmetic slots are Legendary
    checkHeadTurner() {
        if (this.color().rarity === 'legendary' &&
            this.pattern().rarity === 'legendary' &&
            this.faceplate().rarity === 'legendary' &&
            (this.upper().rarity === 'legendary' || this.lower().rarity === 'legendary')) {
            this.unlock('head_turner');
        }
    },

    // ---- Show outcome bookkeeping ------------------------------------
    recordWin(flawless) {
        this.data.crowns++;
        this.data.streak++;
        this.data.bestStreak = Math.max(this.data.bestStreak, this.data.streak);
        this.unlock('crowned');
        if (this.data.streak >= 5) this.unlock('infallible');
        if (flawless) this.unlock('flawless');
        this.save();
    },
    recordLoss() {
        this.data.streak = 0;
        this.save();
    },
};
