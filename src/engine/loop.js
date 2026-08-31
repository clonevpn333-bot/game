'use strict';
/**
 * Fixed-timestep simulation decoupled from render, with interpolation — §1.3.
 *
 * The whole loop is allocation-free: no closures created per frame, no object
 * literals, no array literals. The frame callback signature is
 * (alpha, dtRender) and the step callback is (fixedDt).
 */
(function (global) {
    const PE = (global.PE = global.PE || {});
    const Teardown = PE.Teardown;

    function Loop(opts) {
        this.step        = opts.step;                       // (dt) => void, fixed
        this.render      = opts.render;                     // (alpha, dt) => void
        this.hz          = opts.hz || 60;
        this.fixedDt     = 1 / this.hz;
        this.maxSteps    = opts.maxSteps || 5;              // spiral-of-death clamp
        this.onStats     = opts.onStats || null;            // (stats) => void, ~1Hz

        this._acc        = 0;
        this._last       = 0;
        this._running    = false;
        this._paused     = false;
        this._handle     = 0;

        // Stats, mutated in place and handed to onStats — never reallocated.
        this.stats = { fps: 0, frameMs: 0, stepMs: 0, renderMs: 0, steps: 0, dropped: 0 };
        this._frames     = 0;
        this._statAcc    = 0;
        this._frameMsAcc = 0;
        this._stepMsAcc  = 0;
        this._rendMsAcc  = 0;

        // Bound once so requestAnimationFrame never allocates a closure.
        const self = this;
        this._tick = function (ts) { self._onFrame(ts); };
    }

    Loop.prototype.start = function () {
        if (this._running) return;
        this._running = true;
        this._last = performance.now();
        this._acc = 0;
        this._schedule();
    };

    Loop.prototype.stop = function () {
        this._running = false;
        if (this._handle) cancelAnimationFrame(this._handle);
        this._handle = 0;
    };

    /** Pause keeps the loop scheduled but skips simulation, so a resumed game
     *  does not eat a multi-second catch-up burst. */
    Loop.prototype.pause = function () {
        this._paused = true;
        this._acc = 0;
    };

    Loop.prototype.resume = function () {
        if (!this._paused) return;
        this._paused = false;
        this._last = performance.now();
        this._acc = 0;
    };

    Loop.prototype._schedule = function () {
        this._handle = Teardown ? Teardown.raf(this._tick) : requestAnimationFrame(this._tick);
    };

    Loop.prototype._onFrame = function (ts) {
        if (!this._running) return;

        let dt = (ts - this._last) / 1000;
        this._last = ts;
        // A backgrounded tab or a GC pause can hand us a huge dt. Clamp rather
        // than simulate it: catching up 3 seconds at 60Hz is 180 steps.
        if (dt > 0.25) dt = 0.25;
        if (dt < 0) dt = 0;

        if (this._paused) { this._schedule(); return; }

        const t0 = performance.now();
        this._acc += dt;

        let steps = 0;
        const fixed = this.fixedDt;
        const tStep = performance.now();
        while (this._acc >= fixed && steps < this.maxSteps) {
            this.step(fixed);
            this._acc -= fixed;
            steps++;
        }
        const stepMs = performance.now() - tStep;

        if (steps === this.maxSteps && this._acc >= fixed) {
            // We are behind budget; discard the backlog instead of compounding it.
            this.stats.dropped += Math.floor(this._acc / fixed);
            this._acc = 0;
        }

        const alpha = this._acc / fixed;
        const tRend = performance.now();
        this.render(alpha, dt);
        const rendMs = performance.now() - tRend;

        const frameMs = performance.now() - t0;
        this._frames++;
        this._statAcc    += dt;
        this._frameMsAcc += frameMs;
        this._stepMsAcc  += stepMs;
        this._rendMsAcc  += rendMs;
        this.stats.steps = steps;

        if (this._statAcc >= 1) {
            const s = this.stats;
            s.fps      = this._frames / this._statAcc;
            s.frameMs  = this._frameMsAcc / this._frames;
            s.stepMs   = this._stepMsAcc / this._frames;
            s.renderMs = this._rendMsAcc / this._frames;
            this._frames = 0; this._statAcc = 0;
            this._frameMsAcc = 0; this._stepMsAcc = 0; this._rendMsAcc = 0;
            if (this.onStats) this.onStats(s);
        }

        this._schedule();
    };

    PE.Loop = Loop;
})(typeof window !== 'undefined' ? window : globalThis);
