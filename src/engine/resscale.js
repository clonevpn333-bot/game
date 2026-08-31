'use strict';
/**
 * Backing-resolution control + dynamic resolution scaling — §1.2 / §1.3.
 *
 * Two jobs:
 *   1. Clamp devicePixelRatio and render the backing store at 0.75x-1.0x of CSS
 *      size, then let CSS upscale. Full retina rendering is banned on the
 *      target profile: it is a pure fill-rate multiplier for no gameplay value.
 *   2. When frame time blows the budget, drop backing resolution *before*
 *      dropping frame rate, with hysteresis strong enough that the renderer
 *      never oscillates between two scales (the "never jitters between 60 and
 *      45" criterion).
 */
(function (global) {
    const PE = (global.PE = global.PE || {});

    const STEPS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];

    function ResolutionScaler(canvas, opts) {
        opts = opts || {};
        this.canvas      = canvas;
        this.targetFps   = opts.targetFps || 60;
        this.floorFps    = opts.floorFps || 30;
        this.maxDpr      = opts.maxDpr || 1.0;       // never exceed 1 backing px per CSS px
        this.minScale    = opts.minScale || 0.5;
        this.maxScale    = opts.maxScale || 1.0;
        this.auto        = opts.auto !== false;
        // A game with a fixed logical resolution (most 2D titles) scales its
        // backing store against that, not against CSS size or DPR.
        this.logicalW    = opts.logicalWidth || 0;
        this.logicalH    = opts.logicalHeight || 0;
        this.onResize    = opts.onResize || null;    // (w, h, scale) => void

        this._stepIndex  = STEPS.indexOf(clampStep(opts.initialScale || 1.0));
        if (this._stepIndex < 0) this._stepIndex = 0;
        this._budgetMs   = 1000 / this.targetFps;
        this._overCount  = 0;
        this._underCount = 0;
        this._cooldown   = 0;
        // Steps that produced an immediate relapse are not retried this session.
        this._blocked    = new Uint8Array(STEPS.length);
        this._lastUpAt   = -1e9;
        this.width = 0; this.height = 0;

        this.applyResize();
    }

    function clampStep(v) {
        let best = STEPS[0], bd = Infinity;
        for (let i = 0; i < STEPS.length; i++) {
            const d = Math.abs(STEPS[i] - v);
            if (d < bd) { bd = d; best = STEPS[i]; }
        }
        return best;
    }

    ResolutionScaler.prototype.scale = function () { return STEPS[this._stepIndex]; };

    ResolutionScaler.prototype.dpr = function () {
        return Math.min(global.devicePixelRatio || 1, this.maxDpr);
    };

    /** Resize the backing store to CSS size x scale x clamped DPR. */
    ResolutionScaler.prototype.applyResize = function () {
        let cssW, cssH, f;
        if (this.logicalW) {
            cssW = this.logicalW; cssH = this.logicalH; f = this.scale();
        } else {
            const rect = this.canvas.getBoundingClientRect();
            cssW = Math.max(1, rect.width  || this.canvas.clientWidth  || 640);
            cssH = Math.max(1, rect.height || this.canvas.clientHeight || 360);
            f = this.scale() * this.dpr();
        }
        const w = Math.max(1, Math.round(cssW * f));
        const h = Math.max(1, Math.round(cssH * f));
        if (w === this.width && h === this.height) return false;
        this.width = w; this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
        if (this.onResize) this.onResize(w, h, this.scale());
        return true;
    };

    /** Manual override — §1.2 requires scaling be reversible at runtime. */
    ResolutionScaler.prototype.setScale = function (v) {
        const idx = STEPS.indexOf(clampStep(v));
        if (idx < 0 || idx === this._stepIndex) return false;
        this._stepIndex = idx;
        this._overCount = 0; this._underCount = 0;
        this.applyResize();
        return true;
    };

    ResolutionScaler.prototype.setAuto = function (on) {
        this.auto = !!on;
        this._overCount = 0; this._underCount = 0;
    };

    /**
     * Feed one frame time (ms). Called from the render callback; allocation-free.
     */
    ResolutionScaler.prototype.sample = function (frameMs, nowMs) {
        if (!this.auto) return;
        if (nowMs < this._cooldown) return;

        // Over budget by >15% counts as pressure; under 70% counts as headroom.
        if (frameMs > this._budgetMs * 1.15) { this._overCount++; this._underCount = 0; }
        else if (frameMs < this._budgetMs * 0.70) { this._underCount++; this._overCount = 0; }
        else { this._overCount = 0; this._underCount = 0; }

        if (this._overCount >= 12 && this._stepIndex < STEPS.length - 1 &&
            STEPS[this._stepIndex + 1] >= this.minScale) {
            // A downgrade right after an upgrade means that step is not
            // sustainable on this device: block it for the rest of the session.
            if (nowMs - this._lastUpAt < 4000) this._blocked[this._stepIndex] = 1;
            this._stepIndex++;
            this._overCount = 0; this._underCount = 0;
            this._cooldown = nowMs + 1500;
            this.applyResize();
            return;
        }

        // Upscale is deliberately reluctant: 4s of clear headroom, and never
        // into a step that already relapsed.
        if (this._underCount >= 240 && this._stepIndex > 0 &&
            !this._blocked[this._stepIndex - 1] && STEPS[this._stepIndex - 1] <= this.maxScale) {
            this._stepIndex--;
            this._overCount = 0; this._underCount = 0;
            this._cooldown = nowMs + 3000;
            this._lastUpAt = nowMs;
            this.applyResize();
        }
    };

    /**
     * Pick a starting scale from what the device advertises. Cheap heuristic;
     * the adaptive loop corrects it within a couple of seconds either way.
     */
    ResolutionScaler.suggestInitialScale = function () {
        const mem   = global.navigator && navigator.deviceMemory || 4;
        const cores = global.navigator && navigator.hardwareConcurrency || 2;
        const px    = (global.innerWidth || 1280) * (global.innerHeight || 720);
        if (mem <= 2 || cores <= 2) return 0.75;
        if (mem <= 4 && px > 1280 * 800) return 0.8;
        if (mem <= 4) return 0.9;
        return 1.0;
    };

    ResolutionScaler.STEPS = STEPS;
    PE.ResolutionScaler = ResolutionScaler;
})(typeof window !== 'undefined' ? window : globalThis);
