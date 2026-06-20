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
            fame: 0,                       // Fall Pass progression
            passClaimed: {},               // tier -> true
            shopDay: -1,                   // day index the shop rotation was rolled for
            shopRot: null,                 // [{slot, idx}] featured items
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
        if (this.data.fame == null) this.data.fame = 0;
        if (!this.data.passClaimed || typeof this.data.passClaimed !== 'object') this.data.passClaimed = {};
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
    // grant ownership of a cosmetic outright (Fall Pass rewards)
    grant(slot, idx) {
        if (!this.data.owned[slot]) this.data.owned[slot] = {};
        this.data.owned[slot][idx] = true; this.save();
    },

    // ---- Rotating shop ------------------------------------------------
    // A featured set of non-common items, deterministic per day so it's
    // stable within a session but refreshes daily (Fall Guys' store model).
    _dayIndex() { return Math.floor(Date.now() / 86400000); },
    shopRotation() {
        const day = this._dayIndex();
        if (this.data.shopDay !== day || !Array.isArray(this.data.shopRot) || !this.data.shopRot.length) {
            this.data.shopDay = day;
            this.data.shopRot = this._rollShop(day * 2654435761 >>> 0);
            this.save();
        }
        return this.data.shopRot;
    },
    rerollShop(cost) {                       // pay Kudos to refresh the featured set now
        if ((this.data.kudos || 0) < cost) return false;
        this.data.kudos -= cost;
        this.data.shopRot = this._rollShop((Date.now() ^ (this.data.fame * 40503)) >>> 0);
        this.save();
        return true;
    },
    _rollShop(seed) {
        let s = (seed % 2147483647) || 1; const rnd = () => (s = s * 48271 % 2147483647) / 2147483647;
        const slots = this._slots(), pool = [];
        for (const k in slots) slots[k].forEach((it, i) => { if (it.rarity !== 'common') pool.push({ slot: k, idx: i }); });
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        // keep a pleasing spread of rarities up top
        return pool.slice(0, SHOP_ROTATION_SIZE);
    },
    nextRotationMs() { return (this._dayIndex() + 1) * 86400000 - Date.now(); },

    // ---- Fall Pass ----------------------------------------------------
    addFame(n) { this.data.fame = (this.data.fame || 0) + n; this.save(); },
    passTierReached() {                      // highest tier whose Fame threshold is met
        let t = 0;
        for (const tier of FALL_PASS) if (this.data.fame >= tier.fame) t = tier.tier; else break;
        return t;
    },
    passProgress() {                         // {tier, next, into, span, frac} toward the next tier
        const reached = this.passTierReached();
        const next = FALL_PASS.find(t => t.tier === reached + 1);
        const prevFame = reached > 0 ? FALL_PASS[reached - 1].fame : 0;
        if (!next) return { tier: reached, max: true, frac: 1, into: 0, span: 0 };
        const span = next.fame - prevFame, into = this.data.fame - prevFame;
        return { tier: reached, next, max: false, frac: U.clamp(into / span, 0, 1), into, span };
    },
    canClaim(tier) { return this.passTierReached() >= tier && !this.data.passClaimed[tier]; },
    claimPass(tier) {
        if (!this.canClaim(tier)) return null;
        const def = FALL_PASS.find(t => t.tier === tier); if (!def) return null;
        this.data.passClaimed[tier] = true;
        const r = def.reward;
        if (r.kudos) this.data.kudos = (this.data.kudos || 0) + r.kudos;
        else if (r.crown) this.data.crowns = (this.data.crowns || 0) + r.crown;
        else if (r.slot != null) this.grant(r.slot, r.idx);
        this.save();
        return r;
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
