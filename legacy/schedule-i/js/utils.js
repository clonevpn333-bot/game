'use strict';

const U = {
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    lerp:  (a, b, t)   => a + (b - a) * t,
    dist:  (x1,y1,x2,y2) => Math.hypot(x2-x1, y2-y1),
    rng:   (lo, hi)    => Math.floor(Math.random() * (hi - lo + 1)) + lo,
    pick:  arr         => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    money(n) {
        return '$' + Math.abs(n).toLocaleString('en-US', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    },

    timeStr(gameMins) {
        const h = Math.floor(gameMins / 60) % 24;
        const m = Math.floor(gameMins % 60);
        const ap = h >= 12 ? 'PM' : 'AM';
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
    },

    weekday(day) {
        return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][day % 7];
    },

    // Pixel-perfect rect collision
    rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
    },

    // Wrap text for dialog boxes
    wrapText(ctx, text, maxW) {
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxW && line) {
                lines.push(line);
                line = w;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines;
    },

    // Deep copy plain object
    clone(obj) { return JSON.parse(JSON.stringify(obj)); },
};
