'use strict';

/* =====================================================================
   utils.js — math, RNG, geometry and canvas helpers.
   ===================================================================== */

const U = {
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp:  (a, b, t)   => a + (b - a) * t,
    // Move `a` toward `b` by at most `step`
    approach(a, b, step) {
        if (a < b) return Math.min(a + step, b);
        if (a > b) return Math.max(a - step, b);
        return b;
    },
    dist:  (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    dist2: (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
    angleTo: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),

    // Shortest signed difference between two angles
    angleDiff(a, b) {
        let d = (b - a) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    },
    lerpAngle(a, b, t) { return a + U.angleDiff(a, b) * t; },

    // Random
    rng:   (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo,  // int inclusive
    rngf:  (lo, hi) => lo + Math.random() * (hi - lo),                  // float
    chance: p => Math.random() < p,
    pick:  arr => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // Geometry
    rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },
    circleHit(x1, y1, r1, x2, y2, r2) {
        const rr = r1 + r2;
        return U.dist2(x1, y1, x2, y2) < rr * rr;
    },
    // Closest point on segment AB to point P -> {x,y,t}
    closestOnSeg(px, py, ax, ay, bx, by) {
        const abx = bx - ax, aby = by - ay;
        const len2 = abx * abx + aby * aby || 1e-6;
        let t = ((px - ax) * abx + (py - ay) * aby) / len2;
        t = U.clamp(t, 0, 1);
        return { x: ax + abx * t, y: ay + aby * t, t };
    },
    rotate(x, y, ang) {
        const c = Math.cos(ang), s = Math.sin(ang);
        return { x: x * c - y * s, y: x * s + y * c };
    },

    // Format seconds -> M:SS
    timeStr(sec) {
        sec = Math.max(0, Math.ceil(sec));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m + ':' + String(s).padStart(2, '0');
    },

    // ---- Canvas helpers ----------------------------------------------
    roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y,     x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x,     y + h, r);
        ctx.arcTo(x,     y + h, x,     y,     r);
        ctx.arcTo(x,     y,     x + w, y,     r);
        ctx.closePath();
    },
    // Draw centered text with optional outline
    text(ctx, str, x, y, font, fill, align = 'center', outline = null, ow = 4) {
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        if (outline) {
            ctx.lineWidth = ow;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = outline;
            ctx.strokeText(str, x, y);
        }
        ctx.fillStyle = fill;
        ctx.fillText(str, x, y);
    },

    // Mix two hex colors (#rrggbb) by t
    mixHex(a, b, t) {
        const pa = U._hex(a), pb = U._hex(b);
        const r = Math.round(U.lerp(pa[0], pb[0], t));
        const g = Math.round(U.lerp(pa[1], pb[1], t));
        const bl = Math.round(U.lerp(pa[2], pb[2], t));
        return `rgb(${r},${g},${bl})`;
    },
    // Darken/lighten a hex by amount (-1..1)
    shade(hex, amt) {
        const p = U._hex(hex);
        const f = amt < 0 ? 0 : 255;
        const t = Math.abs(amt);
        const r = Math.round(U.lerp(p[0], f, t));
        const g = Math.round(U.lerp(p[1], f, t));
        const b = Math.round(U.lerp(p[2], f, t));
        return `rgb(${r},${g},${b})`;
    },
    _hex(hex) {
        let h = hex.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    },

    clone(obj) { return JSON.parse(JSON.stringify(obj)); },
};
