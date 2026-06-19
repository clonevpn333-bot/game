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
            emotes: [0, 1, 2, 5],          // Wave, Chicken, Crouch, Spin to Win
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
        // Guard against malformed emote array
        if (!Array.isArray(this.data.emotes) || this.data.emotes.length !== 4) {
            this.data.emotes = [0, 1, 2, 5];
        }
        return this.data;
    },

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
