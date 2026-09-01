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
