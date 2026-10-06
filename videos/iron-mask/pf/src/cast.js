/*
 * cast.js : FILM.hc, the HOMO CURIOSUS shared visual system. Owner: director. Scenes READ, never redefine.
 *
 *   FILM.hc.HAND               canonical hand-stencil frame { cx, cy, s }  (G1 in the storyboard)
 *   FILM.hc.hand(o)            -> { outline: [[x,y]...] closed, tips: {pinky,ring,middle,index,thumb}, wrist: [[x,y],[x,y]], bounds }
 *                               o: { cx, cy, s, rot, narrow }  narrow 0..1 = the later claw-like narrowing of the fingers
 *   FILM.hc.question(cx, cy, size)  -> { hook: [[x,y]...] (open path, top-left start → stem bottom), dot: [x, y], dotR }
 *   FILM.hc.line(ctx, pts, o)  THE CURIOSITY LINE — the recurring motif. One call draws it on either plate.
 *                               o: { plate: 'paper'|'blueprint', from 0, to 1, width 6, seed, head true, alpha 1, wobble 1.2 }
 *   FILM.hc.headAt(pts, u)     -> [x, y, angle] point at fraction u along a polyline
 *   FILM.hc.resample(pts, step)-> evenly spaced polyline
 *
 * Everything is a pure function of its inputs plus lib.T (boil). No randomness outside lib.rng/hash.
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------- G1: the hand
  // A left hand, palm to the wall, fingers spread, thumb to the right. Authored in hand units
  // (palm centre origin, y down, ~925 units wrist-to-middle-tip), placed by { cx, cy, s }.
  // At the canonical frame the hand spans x 337..786, y 475..1196 on the 1080x1920 canvas.
  const HAND = Object.freeze({ cx: 540, cy: 900, s: 0.78 });

  const FINGERS = [
    // name, base centre, tilt from vertical (deg, + = clockwise/right), length, half width
    ['pinky', [-152, -150], -22, 228, 29],
    ['ring', [-76, -202], -8, 300, 33],
    ['middle', [6, -216], 1, 332, 35],
    ['index', [88, -196], 12, 296, 33],
  ];
  const THUMB = ['thumb', [146, 40], 54, 236, 41];

  function fingerSide(b, ang, len, hw, narrow, side) {
    // side -1 = left edge going up, +1 = right edge going down (returned in travel order)
    const a = (ang * Math.PI) / 180;
    const d = [Math.sin(a), -Math.cos(a)];
    const n = [-d[1], d[0]]; // right-hand normal (for an upward finger n = [1, 0])
    const w0 = hw * (1 - 0.32 * narrow);
    const pts = [];
    const N = 14;
    const reach = len - w0 * 0.9;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      // knuckle bulges at 0.38 and 0.7 of the length; taper toward the tip
      const bulge = 1 + 0.06 * Math.exp(-Math.pow((u - 0.38) / 0.07, 2)) + 0.05 * Math.exp(-Math.pow((u - 0.7) / 0.06, 2));
      const w = w0 * (1 - 0.16 * u) * bulge;
      const s = u * reach;
      pts.push([b[0] + d[0] * s + side * n[0] * w, b[1] + d[1] * s + side * n[1] * w]);
    }
    return side < 0 ? pts : pts.reverse();
  }
  function fingerTip(b, ang, len, hw, narrow) {
    const a = (ang * Math.PI) / 180;
    const d = [Math.sin(a), -Math.cos(a)];
    const n = [-d[1], d[0]];
    const w = hw * (1 - 0.32 * narrow) * 0.84;
    const reach = len - hw * (1 - 0.32 * narrow) * 0.9;
    const c = [b[0] + d[0] * reach, b[1] + d[1] * reach];
    const pts = [];
    const base = Math.atan2(-n[1], -n[0]); // from the left edge, over the tip, to the right edge
    for (let i = 1; i < 12; i++) {
      const th = base + (i / 12) * Math.PI * (Math.sign(d[0] * n[1] - d[1] * n[0]) >= 0 ? 1 : -1);
      pts.push([c[0] + Math.cos(th) * w, c[1] + Math.sin(th) * w]);
    }
    // make sure the arc bulges toward d
    const mid = pts[5];
    if ((mid[0] - c[0]) * d[0] + (mid[1] - c[1]) * d[1] < 0) {
      pts.length = 0;
      for (let i = 1; i < 12; i++) {
        const th = base - (i / 12) * Math.PI;
        pts.push([c[0] + Math.cos(th) * w, c[1] + Math.sin(th) * w]);
      }
    }
    return { arc: pts, tip: [c[0] + d[0] * w, c[1] + d[1] * w] };
  }
  function qcurve(p0, c, p1, n = 6) {
    const out = [];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      out.push([
        (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
        (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
      ]);
    }
    return out;
  }

  const handCache = {};
  function hand(o = {}) {
    const cx = o.cx != null ? o.cx : HAND.cx;
    const cy = o.cy != null ? o.cy : HAND.cy;
    const s = o.s != null ? o.s : HAND.s;
    const rot = o.rot || 0;
    const narrow = clamp(o.narrow || 0);
    const key = [cx, cy, s, rot, narrow.toFixed(3)].join('|');
    if (handCache[key]) return handCache[key];
    const raw = [];
    const tips = {};
    // wrist left → palm left edge
    raw.push([-118, 380], [-138, 300], [-160, 190], [-176, 70], [-182, -40], [-186, -120]);
    FINGERS.forEach((f, i) => {
      const [name, b, ang, len, hw] = f;
      const left = fingerSide(b, ang, len, hw, narrow, -1);
      const t = fingerTip(b, ang, len, hw, narrow);
      const right = fingerSide(b, ang, len, hw, narrow, 1);
      if (i > 0) {
        const prev = raw[raw.length - 1];
        const v = [(prev[0] + left[0][0]) / 2, Math.max(prev[1], left[0][1]) + 18];
        raw.push(...qcurve(prev, v, left[0], 5));
      }
      raw.push(...left, ...t.arc, ...right);
      tips[name] = t.tip;
    });
    // web between index and thumb, then the thumb (upper side out, lower side back)
    {
      const [name, b, ang, len, hw] = THUMB;
      const a = (ang * Math.PI) / 180;
      const d = [Math.sin(a), -Math.cos(a)];
      const n = [-d[1], d[0]];
      const prev = raw[raw.length - 1];
      const upperStart = [b[0] - n[0] * hw, b[1] - n[1] * hw];
      raw.push(...qcurve(prev, [prev[0] + 6, prev[1] + 90], upperStart, 7));
      const left = fingerSide(b, ang, len, hw, narrow * 0.6, -1);
      const t = fingerTip(b, ang, len, hw, narrow * 0.6);
      const right = fingerSide(b, ang, len, hw, narrow * 0.6, 1);
      raw.push(...left, ...t.arc, ...right);
      tips[name] = t.tip;
    }
    // palm heel back down to the wrist
    raw.push([176, 200], [150, 290], [118, 380]);
    // wrist bottom edge (gently curved)
    raw.push([60, 392], [0, 396], [-60, 392]);
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const tf = (p) => [cx + (p[0] * cs - p[1] * sn) * s, cy + (p[0] * sn + p[1] * cs) * s];
    const outline = L.smoothPts(raw.map(tf), true, 5);
    const T = {};
    for (const k in tips) T[k] = tf(tips[k]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of outline) {
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    const res = Object.freeze({ outline, tips: T, wrist: [tf([-118, 380]), tf([118, 380])], bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
    handCache[key] = res;
    return res;
  }

  // ---------------------------------------------------------------- G3: the question mark
  // A calligraphic "?" as one open path: starts at the hook's left end, arcs over the top,
  // curls down into the stem and ends at the stem's foot. size = total height (hook top to dot bottom).
  function question(cx, cy, size) {
    const k = size / 600;
    const pts = [];
    // hook arc: centre (0,-150), radius 150, from 200deg (left) over the top to ~ 20deg (right, below centre)
    for (let i = 0; i <= 40; i++) {
      const th = ((200 + (i / 40) * 210) * Math.PI) / 180;
      pts.push([Math.cos(th) * 150, -150 + Math.sin(th) * 150]);
    }
    // curl in to the stem
    const last = pts[pts.length - 1];
    const c1 = [60, 40];
    const end = [0, 110];
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      pts.push([(1 - t) * (1 - t) * last[0] + 2 * (1 - t) * t * c1[0] + t * t * end[0], (1 - t) * (1 - t) * last[1] + 2 * (1 - t) * t * c1[1] + t * t * end[1]]);
    }
    for (let i = 1; i <= 6; i++) pts.push([0, 110 + i * 15]);
    const tf = (p) => [cx + p[0] * k, cy + p[1] * k];
    return { hook: pts.map(tf), dot: tf([0, 268]), dotR: 26 * k };
  }

  // ---------------------------------------------------------------- polyline helpers
  function resample(pts, step = 4) {
    if (!pts || pts.length < 2) return pts || [];
    const out = [pts[0].slice()];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy);
      let s = step - carry;
      while (s <= d) {
        out.push([a[0] + (dx * s) / d, a[1] + (dy * s) / d]);
        s += step;
      }
      carry = d - (s - step);
    }
    const last = pts[pts.length - 1];
    const o = out[out.length - 1];
    if (Math.hypot(o[0] - last[0], o[1] - last[1]) > 0.5) out.push(last.slice());
    return out;
  }
  function headAt(pts, u) {
    const r = resample(pts, 2);
    const i = clamp(Math.round(u * (r.length - 1)), 0, r.length - 1);
    const a = r[Math.max(0, i - 2)], b = r[Math.min(r.length - 1, i + 2)];
    return [r[i][0], r[i][1], Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  // ---------------------------------------------------------------- THE CURIOSITY LINE
  // Paper: a burnt-orange ink stroke with a darker ragged edge, a yellow highlight core and a spark head.
  // Blueprint: a curiosity-yellow light line with a soft halo and a glowing head.
  function line(ctx, pts, o = {}) {
    if (!pts || pts.length < 2) return;
    const plate = o.plate || 'paper';
    const from = clamp(o.from != null ? o.from : 0);
    const to = clamp(o.to != null ? o.to : 1);
    if (to <= from) return;
    const width = o.width != null ? o.width : 6;
    const alpha = o.alpha != null ? o.alpha : 1;
    const seed = o.seed != null ? o.seed : 1;
    const wob = o.wobble != null ? o.wobble : 1.2;
    const bi = L.boil(L.T);
    const r = resample(pts, 3);
    const i0 = Math.floor(from * (r.length - 1));
    const i1 = Math.max(i0 + 1, Math.ceil(to * (r.length - 1)));
    const seg = [];
    for (let i = i0; i <= i1 && i < r.length; i++) {
      const p = r[i];
      const a = r[Math.max(0, i - 1)], b = r[Math.min(r.length - 1, i + 1)];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const off = wob * (L.noise1(i * 0.045 + bi * 3.1, seed) * 1.6 + L.noise1(i * 0.31 + bi * 7.7, seed + 9) * 0.35);
      seg.push([p[0] - Math.sin(ang) * off, p[1] + Math.cos(ang) * off]);
    }
    if (seg.length < 2) return;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (plate === 'blueprint') {
      ctx.globalCompositeOperation = 'lighter';
      path();
      ctx.strokeStyle = L.rgba(P.hcYellow, 0.07 * alpha);
      ctx.lineWidth = width * 7;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(P.hcYellow, 0.16 * alpha);
      ctx.lineWidth = width * 3;
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = L.rgba(P.hcYellow, 0.95 * alpha);
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.strokeStyle = L.rgba('#FFF6D8', 0.9 * alpha);
      ctx.lineWidth = Math.max(1, width * 0.32);
      ctx.stroke();
    } else {
      path();
      ctx.strokeStyle = L.rgba(P.hcOrangeDeep, 0.9 * alpha);
      ctx.lineWidth = width * 1.35;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(P.hcOrange, alpha);
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.strokeStyle = L.rgba(P.hcYellow, 0.85 * alpha);
      ctx.lineWidth = Math.max(1, width * 0.28);
      ctx.translate(-width * 0.12, -width * 0.12);
      ctx.stroke();
    }
    ctx.restore();
    if (o.head !== false && to < 0.999) {
      const h = seg[seg.length - 1];
      const R = width * 1.15;
      if (plate === 'blueprint') {
        L.glowDot(ctx, h[0], h[1], R, { color: P.hcYellow, core: '#FFFBEA', rays: 8, rayLen: 3.2, glow: 5, seed: seed + 3, intensity: alpha });
      } else {
        L.glowDot(ctx, h[0], h[1], R * 0.9, { color: P.hcYellow, core: '#FFF6D8', rays: 6, rayLen: 2.6, glow: 3, additive: false, seed: seed + 3, intensity: 0.9 * alpha });
        ctx.save();
        ctx.fillStyle = L.rgba(P.hcOrangeDeep, alpha);
        ctx.beginPath();
        ctx.arc(h[0], h[1], R * 0.55, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  FILM.hc = Object.freeze({ HAND, hand, question, line, headAt, resample });
})();
