'use strict';
/**
 * Renderer-tier detection — the standalone fallback (§1.3).
 *
 * When the portal launches a title it has already gated on tier and hands the
 * result over in `portal:hello`, so this probe never runs. It exists so a
 * bundle opened directly as a file still refuses politely instead of throwing.
 * The canonical implementation lives in portal/js/capabilities.js.
 */
(function (global) {
    const PE = (global.PE = global.PE || {});
    const RANK = { canvas2d: 0, webgl1: 1, webgl2: 2 };

    function probe(canvas, type, attrs) {
        try { return canvas.getContext(type, attrs); } catch (e) { return null; }
    }

    function release(gl) {
        if (!gl) return;
        try {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        } catch (e) { /* nothing to release */ }
    }

    /** @returns {'webgl2'|'webgl1'|'canvas2d'} */
    function detect() {
        const c = document.createElement('canvas');
        c.width = c.height = 1;
        const attrs = { failIfMajorPerformanceCaveat: false, antialias: false, depth: true, alpha: false };

        const gl2 = probe(c, 'webgl2', attrs);
        if (gl2) { release(gl2); return 'webgl2'; }

        const gl1 = probe(c, 'webgl', attrs) || probe(c, 'experimental-webgl', attrs);
        if (gl1) { release(gl1); return 'webgl1'; }

        return 'canvas2d';
    }

    function meets(available, required) {
        return (RANK[available] !== undefined ? RANK[available] : -1) >=
               (RANK[required]  !== undefined ? RANK[required]  : 99);
    }

    PE.Tier = { detect: detect, meets: meets, RANK: RANK };
})(typeof window !== 'undefined' ? window : globalThis);
