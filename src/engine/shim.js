'use strict';
/**
 * Compatibility shim for prebuilt bundles.
 *
 * The games imported from the hub were written standalone: they know nothing
 * about the portal, and they were built for a machine with a fan. This wraps
 * them from the outside — no edits to their code — and gives them the three
 * things that decide whether they are playable on a Chromebook:
 *
 *   1. A device-pixel-ratio governor. Nearly every Three.js title sizes its
 *      drawing buffer from window.devicePixelRatio, so owning that value owns
 *      the fill rate. It starts clamped and drops further when frames run long,
 *      then dispatches resize so the game re-applies it.
 *   2. A frame governor. Every requestAnimationFrame goes through here, so the
 *      portal can genuinely pause a backgrounded game (and hide the pause from
 *      its clock, so nothing teleports on resume) and stop it dead on exit.
 *   3. Lifecycle. Reports ready, streams frame stats, and on shutdown cancels
 *      the loop and drops every WebGL context it saw created.
 *
 * It only ever lowers resolution below 1x. A game that hardcodes its pixel
 * ratio opts out of step 1 by construction; steps 2 and 3 still apply.
 */
(function (global) {
    const Bridge = global.PE && global.PE.Bridge;
    const doc = global.document;

    // --- device pixel ratio governor -------------------------------------
    const STEPS = [1, 0.85, 0.72, 0.6, 0.5];
    let stepIndex = 0;
    let nativeDpr = global.devicePixelRatio || 1;

    function currentScale() {
        // Never upscale past 1: retina rendering is banned on this hardware.
        return Math.min(nativeDpr, STEPS[stepIndex]);
    }

    try {
        Object.defineProperty(global, 'devicePixelRatio', {
            get: currentScale,
            configurable: true,
        });
    } catch (e) { /* locked down; the frame governor still applies */ }

    let manual = false;
    function setStep(i, why) {
        i = Math.max(0, Math.min(STEPS.length - 1, i));
        if (i === stepIndex) return false;
        stepIndex = i;
        // Most titles only resize their renderer on a resize event; without
        // this the new ratio would not take effect until the window changed.
        try { global.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
        return true;
    }

    // --- frame governor ---------------------------------------------------
    const nativeRaf = global.requestAnimationFrame && global.requestAnimationFrame.bind(global);
    const nativeCaf = global.cancelAnimationFrame && global.cancelAnimationFrame.bind(global);
    const liveHandles = new Set();
    let paused = false, dead = false;
    let pauseStart = 0, pauseOffset = 0;

    // Frame-time tracking, with the same hysteresis as the engine's scaler:
    // slow to drop, much slower to recover, and a step that relapsed is not
    // retried — that is what stops the resolution pulsing.
    let last = 0, over = 0, under = 0, cooldown = 0, lastUpAt = -1e9;
    const blocked = [0, 0, 0, 0, 0];
    let frames = 0, acc = 0, fps = 0;
    const BUDGET = 1000 / 60;

    function sample(ts) {
        if (!last) { last = ts; return; }
        const dt = ts - last;
        last = ts;
        if (dt <= 0 || dt > 500) return;          // tab was hidden; not a real frame

        frames++; acc += dt;
        if (acc >= 1000) { fps = (frames * 1000) / acc; frames = 0; acc = 0; report(); }

        if (manual || ts < cooldown) return;

        if (dt > BUDGET * 1.15) { over++; under = 0; } 
        else if (dt < BUDGET * 0.70) { under++; over = 0; } 
        else { over = 0; under = 0; }

        if (over >= 12 && stepIndex < STEPS.length - 1) {
            if (ts - lastUpAt < 4000) blocked[stepIndex] = 1;
            setStep(stepIndex + 1);
            over = under = 0; cooldown = ts + 1500;
        } else if (under >= 240 && stepIndex > 0 && !blocked[stepIndex - 1]) {
            setStep(stepIndex - 1);
            over = under = 0; cooldown = ts + 3000; lastUpAt = ts;
        }
    }

    if (nativeRaf) {
        global.requestAnimationFrame = function (cb) {
            if (dead) return 0;
            return nativeRaf(function tick(ts) {
                if (dead) return;
                if (paused) { liveHandles.add(nativeRaf(tick)); return; }
                sample(ts);
                // Hide the paused interval from the game's own clock.
                cb(ts - pauseOffset);
            });
        };
        global.cancelAnimationFrame = function (h) { liveHandles.delete(h); return nativeCaf(h); };
    }

    // --- WebGL context tracking ------------------------------------------
    const contexts = [];
    const nativeGetContext = global.HTMLCanvasElement && global.HTMLCanvasElement.prototype.getContext;
    if (nativeGetContext) {
        global.HTMLCanvasElement.prototype.getContext = function (type) {
            const ctx = nativeGetContext.apply(this, arguments);
            if (ctx && /webgl/i.test(String(type))) contexts.push(ctx);
            return ctx;
        };
    }

    function teardown() {
        dead = true;
        for (const h of liveHandles) { try { nativeCaf(h); } catch (e) { /* gone */ } }
        liveHandles.clear();
        for (const gl of contexts) {
            try {
                const ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
            } catch (e) { /* already lost */ }
        }
        contexts.length = 0;
        if (doc && doc.pointerLockElement) { try { doc.exitPointerLock(); } catch (e) { /* not locked */ } }
    }

    function report() {
        if (!Bridge) return;
        Bridge.stats({
            fps: fps,
            frameMs: fps ? 1000 / fps : 0,
            scale: currentScale(),
            heapMB: global.performance && performance.memory
                ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
        });
    }

    // --- pointer lock -----------------------------------------------------
    /**
     * Pointer lock fails in more ways than any game bothers to handle, and all
     * of them look identical from the player's side: you click, nothing
     * captures. The three that actually bite:
     *
     *   - Chrome imposes a ~1s cooldown after the user presses Esc. A request
     *     inside that window is rejected outright, so it is retried once.
     *   - Chrome 111+ returns a promise; older versions return undefined. An
     *     unhandled rejection on the new API is a console error and no lock.
     *   - `unadjustedMovement` throws on browsers that do not know the option,
     *     taking the whole request down with it.
     *
     * Patching the prototype fixes every game at once, including the imported
     * ones that were written before any of this mattered.
     */
    const nativeRequestLock = global.Element && global.Element.prototype.requestPointerLock;
    let lockTarget = null, lockRetry = 0;

    if (nativeRequestLock) {
        global.Element.prototype.requestPointerLock = function (options) {
            const element = this;
            lockTarget = element;

            // A request from an unfocused document is refused; clicking the
            // frame usually focuses it, but a programmatic call may not have.
            try { global.focus(); } catch (e) { /* cross-origin parent */ }

            const attempt = (opts) => {
                let result;
                try {
                    result = opts === undefined
                        ? nativeRequestLock.call(element)
                        : nativeRequestLock.call(element, opts);
                } catch (err) {
                    // Most often an unknown option object; retry without it.
                    if (opts !== undefined) return attempt(undefined);
                    reportLockFailure(err && err.message || String(err));
                    return undefined;
                }
                if (result && typeof result.catch === 'function') {
                    return result.catch((err) => {
                        if (opts !== undefined) return attempt(undefined);
                        scheduleRetry(element, err && err.message || String(err));
                    });
                }
                return result;
            };

            return attempt(options);
        };
    }

    function scheduleRetry(element, message) {
        // The one failure worth retrying is the Esc cooldown, and it clears in
        // about a second. Anything still failing after that is real.
        if (lockRetry) { reportLockFailure(message); return; }
        lockRetry = setTimeout(function () {
            lockRetry = 0;
            if (doc.pointerLockElement) return;
            try {
                const r = nativeRequestLock.call(element);
                if (r && typeof r.catch === 'function') r.catch((e) => reportLockFailure(e && e.message || String(e)));
            } catch (e) { reportLockFailure(e && e.message || String(e)); }
        }, 1250);
    }

    function reportLockFailure(message) {
        if (Bridge) Bridge.post('game:pointerlock', { locked: false, error: message || 'pointer lock was refused' });
    }

    if (doc) {
        doc.addEventListener('pointerlockchange', function () {
            const locked = doc.pointerLockElement === lockTarget && !!doc.pointerLockElement;
            if (Bridge) Bridge.pointerLock(locked);
        });
        doc.addEventListener('pointerlockerror', function () {
            // The error event carries no reason, so name the usual cause.
            reportLockFailure('the browser refused pointer lock (needs a fresh click, or Esc was pressed moments ago)');
        });
    }

    // --- portal lifecycle -------------------------------------------------
    if (Bridge) {
        Bridge.connect({
            id: (doc && doc.title || 'prebuilt').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            onHello: function (ctx) {
                const pref = ctx && ctx.settings && ctx.settings.resolutionScale;
                if (typeof pref === 'number') {
                    manual = true;
                    let best = 0;
                    for (let i = 0; i < STEPS.length; i++) {
                        if (Math.abs(STEPS[i] - pref) < Math.abs(STEPS[best] - pref)) best = i;
                    }
                    stepIndex = best;
                } else if (ctx && ctx.caps) {
                    // A software rasteriser cannot hold 60 fps on these scenes;
                    // start low rather than spending four seconds discovering it.
                    if (ctx.caps.software) stepIndex = 3;
                    else if (ctx.caps.deviceMemory && ctx.caps.deviceMemory <= 4) stepIndex = 1;
                }
                Bridge.ready({ tier: null, pointerLock: true });
            },
            onPause: function () {
                if (paused) return;
                paused = true;
                pauseStart = global.performance ? performance.now() : Date.now();
            },
            onResume: function () {
                if (!paused) return;
                paused = false;
                const now = global.performance ? performance.now() : Date.now();
                pauseOffset += now - pauseStart;
                last = 0;
            },
            onLowMemory: function () { setStep(stepIndex + 1); },
            onSettings: function (s) {
                if (!s) return;
                if (typeof s.resolutionScale === 'number') {
                    manual = true;
                    let best = 0;
                    for (let i = 0; i < STEPS.length; i++) {
                        if (Math.abs(STEPS[i] - s.resolutionScale) < Math.abs(STEPS[best] - s.resolutionScale)) best = i;
                    }
                    setStep(best);
                } else {
                    manual = false;
                }
            },
            onShutdown: teardown,
        });
    }

    global.__shim = {
        scale: currentScale,
        setStep: setStep,
        stats: function () { return { fps: fps, scale: currentScale(), paused: paused, contexts: contexts.length }; },
    };
})(typeof window !== 'undefined' ? window : globalThis);
