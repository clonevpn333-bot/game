'use strict';
/**
 * Teardown registry — §1.1 "Deterministic teardown on game exit".
 *
 * Nothing in a game should call addEventListener / requestAnimationFrame /
 * setTimeout / createObjectURL directly. Route them through here and a single
 * destroyAll() reclaims the lot. The portal also destroys the whole iframe
 * (§2.2), but manual teardown is what makes standalone play and the
 * heap-returns-to-baseline benchmark (§4) hold.
 */
(function (global) {
    const PE = (global.PE = global.PE || {});

    const listeners = [];   // [target, type, fn, opts]
    const rafs      = [];   // raf handles
    const timers    = [];   // setTimeout handles
    const intervals = [];   // setInterval handles
    const contexts  = [];   // WebGL contexts
    const urls      = [];   // object URLs
    const audios    = [];   // AudioContexts
    const closers   = [];   // arbitrary cleanup fns
    let destroyed   = false;

    const Teardown = {
        get destroyed() { return destroyed; },

        on(target, type, fn, opts) {
            if (destroyed) return fn;
            target.addEventListener(type, fn, opts);
            listeners.push([target, type, fn, opts]);
            return fn;
        },

        off(target, type, fn, opts) {
            target.removeEventListener(type, fn, opts);
            for (let i = listeners.length - 1; i >= 0; i--) {
                const l = listeners[i];
                if (l[0] === target && l[1] === type && l[2] === fn) listeners.splice(i, 1);
            }
        },

        raf(fn) {
            if (destroyed) return 0;
            const h = requestAnimationFrame(fn);
            rafs.push(h);
            // Keep the handle list bounded: a long-running loop would otherwise
            // push one entry per frame forever (a leak in the leak-preventer).
            if (rafs.length > 8) rafs.splice(0, rafs.length - 8);
            return h;
        },

        timeout(fn, ms) {
            if (destroyed) return 0;
            const h = setTimeout(function () {
                const i = timers.indexOf(h);
                if (i >= 0) timers.splice(i, 1);
                fn();
            }, ms);
            timers.push(h);
            return h;
        },

        interval(fn, ms) {
            if (destroyed) return 0;
            const h = setInterval(fn, ms);
            intervals.push(h);
            return h;
        },

        trackContext(gl)      { if (gl) contexts.push(gl); return gl; },
        trackAudio(ac)        { if (ac) audios.push(ac); return ac; },
        trackObjectURL(url)   { if (url) urls.push(url); return url; },
        onDestroy(fn)         { if (fn) closers.push(fn); return fn; },

        /** Idempotent. Safe to call from unload, from the portal, or both. */
        destroyAll() {
            if (destroyed) return;
            destroyed = true;

            for (let i = 0; i < rafs.length; i++) cancelAnimationFrame(rafs[i]);
            for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
            for (let i = 0; i < intervals.length; i++) clearInterval(intervals[i]);
            for (let i = 0; i < listeners.length; i++) {
                const l = listeners[i];
                try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* detached */ }
            }
            for (let i = 0; i < closers.length; i++) {
                try { closers[i](); } catch (e) { /* keep tearing down */ }
            }
            for (let i = 0; i < contexts.length; i++) {
                try {
                    const ext = contexts[i].getExtension('WEBGL_lose_context');
                    if (ext) ext.loseContext();
                } catch (e) { /* context already gone */ }
            }
            for (let i = 0; i < audios.length; i++) {
                try { audios[i].close(); } catch (e) { /* already closed */ }
            }
            for (let i = 0; i < urls.length; i++) {
                try { URL.revokeObjectURL(urls[i]); } catch (e) { /* already revoked */ }
            }

            listeners.length = 0; rafs.length = 0; timers.length = 0;
            intervals.length = 0; contexts.length = 0; urls.length = 0;
            audios.length = 0; closers.length = 0;

            if (document.pointerLockElement) {
                try { document.exitPointerLock(); } catch (e) { /* not locked */ }
            }
        },
    };

    PE.Teardown = Teardown;
})(typeof window !== 'undefined' ? window : globalThis);
