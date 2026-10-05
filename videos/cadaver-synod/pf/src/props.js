/*
 * props.js : FILM.hx — shared HOMO CURIOSUS drawing kit (loaded after lib.js, before cast.js).
 *   wall(ctx, o)            the Liang Metanduno limestone wall (cached plate) { zoom, cx, cy }
 *   torch(ctx, T, o)        flickering torch light pool + cave darkness { x, y, amount }
 *   motes(ctx, T, o)        dust motes drifting in the torch beam
 *   skinHand(ctx, o)        a realistic inked back-of-hand on the G1 geometry (uses FILM.hc lazily)
 *   halo(ctx, o)            the blown ochre stencil halo around G1 { p: 0..1 spray progress, narrow, retouch }
 *   haloDots()              the halo's droplet table (x, y, r, a, t0, col) — shot 02 flies droplets onto these
 *   star8(ctx, x, y, r, o)  an engraved 8-point star
 *   progress(ctx, k, T)     the schematic progress glyph (5 arcs, arc k lit)
 *   V3 math: rotX/rotY/rotZ/project(cam)
 *   gear(teeth, m, o)       2D gear outline polyline (pitch radius = m * teeth / 2)
 * Pure functions of inputs + lib.T. Caches hold only t-independent canvases.
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const W = 1080, H = 1920;
  const hx = {};

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function blob(cx, cy, rx, ry, seed, n = 40, amp = 0.22) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + amp * L.noise1(Math.cos(a) * 1.3 + 7, seed) + amp * 0.5 * L.noise1(a * 3.1, seed + 3);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  hx.blob = blob;

  // ------------------------------------------------------------------ the wall (cached plate)
  function buildWall() {
    const c = canvas(W, H);
    const g = c.getContext('2d');
    const r = L.rng(L.hash('hc-wall'));
    g.fillStyle = P.stone;
    g.fillRect(0, 0, W, H);
    L.paper(g, { color: P.stone, seed: 41, vignette: 0.15, mottle: 1.6 });
    // relief masses: lit tops, hatched undersides (light from the lower left torch, but rock planes read top-lit)
    const masses = [];
    for (let i = 0; i < 26; i++) {
      const cx = r() * W, cy = r() * H;
      masses.push(blob(cx, cy, 90 + r() * 260, 60 + r() * 180, 100 + i, 44, 0.3));
    }
    masses.forEach((m, i) => {
      g.fillStyle = L.rgba(i % 3 ? P.stoneLight : P.stone, 0.4);
      L.tracePath(g, m, true);
      g.fill();
      const b = L.bounds(m);
      L.hatch(g, m, { angle: -0.35 + r() * 0.2, spacing: 7, width: 1.3, color: P.stoneDeep, alpha: 0.42, boilAmp: 0, seed: 200 + i,
        density: (x, y) => clamp((y - (b.y + b.h * 0.45)) / (b.h * 0.55)) });
      L.inkPath(g, m.slice(Math.floor(m.length * 0.05), Math.floor(m.length * 0.6)), { width: 2.2, color: P.stoneShadow, alpha: 0.7, seed: 300 + i, boil: false, smooth: true });
    });
    // deep recesses: cross-hatched hollows give the wall real relief
    for (let i = 0; i < 7; i++) {
      const m = blob(r() * W, r() * H, 26 + r() * 40, 110 + r() * 160, 150 + i, 36, 0.4);
      g.fillStyle = L.rgba(P.stoneShadow, 0.1);
      L.tracePath(g, m, true);
      g.fill();
      L.hatch(g, m, { angle: -1.2, spacing: 5, width: 1.2, color: P.stoneShadow, alpha: 0.35, boilAmp: 0, seed: 160 + i });
      L.inkPath(g, m.slice(0, 22), { width: 2.6, color: P.hcInk, alpha: 0.6, seed: 170 + i, boil: false });
    }
    // fractures
    for (let i = 0; i < 18; i++) {
      let x = r() * W, y = r() * H;
      const pts = [[x, y]];
      const dir = r() * TAU;
      for (let k = 0; k < 14; k++) {
        x += Math.cos(dir + (r() - 0.5) * 1.4) * 26;
        y += Math.sin(dir + (r() - 0.5) * 1.4) * 26 + 6;
        pts.push([x, y]);
      }
      L.inkPath(g, pts, { width: 1.4 + r() * 2.2, color: P.stoneShadow, alpha: 0.75, seed: 400 + i, boil: false, smooth: false, taper: [6, 20] });
    }
    // calcite drip curtain, top right
    for (let i = 0; i < 46; i++) {
      const x = 640 + i * 10 + (r() - 0.5) * 8;
      const len = 60 + r() * 260 * (1 - Math.abs(i - 23) / 30);
      L.inkPath(g, [[x, -10], [x + (r() - 0.5) * 6, len * 0.5], [x + (r() - 0.5) * 4, len]], { width: 2 + r() * 3, color: i % 2 ? P.stoneLight : P.stoneDeep, alpha: 0.8, seed: 500 + i, boil: false, taper: [0, 30] });
    }
    // flowstone ripples, lower half
    for (let k = 0; k < 9; k++) {
      const pts = [];
      for (let x = -20; x <= W + 20; x += 18) pts.push([x, 1560 + k * 38 + Math.sin(x * 0.012 + k) * 18 + L.noise1(x * 0.01, 600 + k) * 22]);
      L.inkPath(g, pts, { width: 1.6, color: P.stoneDeep, alpha: 0.55, seed: 600 + k, boil: false });
    }
    // pitting
    L.stipple(g, null, { bounds: { x: 0, y: 0, w: W, h: H }, spacing: 11, r: [0.8, 2.4], color: P.stoneShadow, alpha: 0.45, boilAmp: 0, seed: 700,
      density: (x, y) => 0.25 + 0.75 * clamp(L.noise2(x * 0.004, y * 0.004, 701) * 0.9 + 0.3) });
    // older stencils: an adult hand high left, a child's hand right, dots and finger lines
    const hc = FILM.hc;
    if (hc) {
      [[{ cx: 190, cy: 380, s: 0.36, rot: -0.35 }, 0.32], [{ cx: 920, cy: 1380, s: 0.27, rot: 0.4 }, 0.26], [{ cx: 860, cy: 260, s: 0.22, rot: 0.15 }, 0.2]].forEach(([fr, a], i) => {
        const h = hc.hand(fr);
        const rr = L.rng(L.hash('old-stencil', i));
        const pt = h.outline;
        for (let k = 0; k < 1600; k++) {
          const p = pt[Math.floor(rr() * pt.length)];
          const ang = rr() * TAU;
          const d = 4 + -Math.log(1 - rr() * 0.98) * 34 * fr.s * 2.4;
          const x = p[0] + Math.cos(ang) * d, y = p[1] + Math.sin(ang) * d;
          if (L.polyContains(pt, x, y)) continue;
          g.fillStyle = L.rgba(P.ochreDeep, Math.min(1, a * 1.8) * (0.4 + rr() * 0.6));
          g.beginPath();
          g.arc(x, y, 0.8 + rr() * 2.2, 0, TAU);
          g.fill();
        }
      });
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle = L.rgba(P.ochreDeep, 0.25 + r() * 0.25);
      g.beginPath();
      g.arc(90 + r() * 260, 1000 + r() * 320, 6 + r() * 9, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 4; i++) {
      const x = 860 + i * 34;
      L.inkPath(g, [[x, 560], [x + 8, 760]], { width: 9, color: P.ochreDeep, alpha: 0.28, seed: 800 + i, boil: false });
    }
    return c;
  }
  hx.wallCanvas = () => L.cached('hc-wall-v1', buildWall);
  hx.wall = function wall(ctx, o = {}) {
    const z = o.zoom || 1;
    const cx = o.cx != null ? o.cx : 540, cy = o.cy != null ? o.cy : 900;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
    ctx.drawImage(hx.wallCanvas(), 0, 0, W, H);
    ctx.restore();
  };

  // ------------------------------------------------------------------ torch + motes
  hx.flicker = (T) => {
    const b = L.boil(T);
    return 0.86 + 0.09 * L.noise1(b * 0.37, 91) + 0.05 * L.noise1(b * 1.9, 92);
  };
  hx.torch = function torch(ctx, T, o = {}) {
    const x = o.x != null ? o.x : 180, y = o.y != null ? o.y : 1500;
    const amt = o.amount != null ? o.amount : 1;
    const f = hx.flicker(T);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    let g = ctx.createRadialGradient(x, y, 60, x + 200, y - 560, 1350 * f);
    g.addColorStop(0, 'rgba(255,236,200,1)');
    g.addColorStop(0.38, 'rgba(214,170,118,1)');
    g.addColorStop(0.75, 'rgba(110,70,40,1)');
    g.addColorStop(1, L.rgba('#24140a', 1));
    ctx.globalAlpha = 0.85 * amt;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    g = ctx.createRadialGradient(x, y, 0, x, y, 900 * f);
    g.addColorStop(0, L.rgba(P.torch, 0.42 * amt));
    g.addColorStop(1, L.rgba(P.torch, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
  hx.motes = function motes(ctx, T, o = {}) {
    const n = o.n || 260;
    const seed = o.seed || 77;
    const r = L.rng(seed);
    ctx.save();
    for (let i = 0; i < n; i++) {
      const z = 0.3 + r() * 0.7;
      const x0 = r() * W, y0 = r() * H, vx = (r() - 0.3) * 18, vy = -6 - r() * 14;
      const ph = r() * TAU;
      let x = (x0 + vx * T + Math.sin(T * 0.8 + ph) * 14 * z) % W;
      let y = (y0 + vy * T + H * 4) % H;
      if (x < 0) x += W;
      const beam = clamp(1 - Math.hypot(x - 300, y - 1250) / 1100);
      const a = beam * (0.25 + 0.6 * z) * (o.alpha != null ? o.alpha : 1);
      if (a < 0.03) continue;
      ctx.fillStyle = L.rgba('#FFE9C4', a);
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + z * 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the realistic hand
  // finger table mirrors cast.js (hand units, palm centre origin)
  const FING = [
    [[-152, -150], -22, 228, 29],
    [[-76, -202], -8, 300, 33],
    [[6, -216], 1, 332, 35],
    [[88, -196], 12, 296, 33],
    [[146, 40], 54, 236, 41],
  ];
  hx.fingers = function fingers(fr) {
    const s = fr.s, cs = Math.cos(fr.rot || 0), sn = Math.sin(fr.rot || 0);
    const tf = (p) => [fr.cx + (p[0] * cs - p[1] * sn) * s, fr.cy + (p[0] * sn + p[1] * cs) * s];
    return FING.map(([b, ang, len, hw]) => {
      const a = (ang * Math.PI) / 180 + (fr.rot || 0);
      const d = [Math.sin(a), -Math.cos(a)];
      return { base: tf(b), d, n: [-d[1], d[0]], len: len * s, hw: hw * s };
    });
  };
  hx.skinHand = function skinHand(ctx, o = {}) {
    const hc = FILM.hc;
    const fr = Object.assign({}, hc.HAND, o.frame || {});
    const h = hc.hand(fr);
    const out = h.outline;
    const fs = hx.fingers(fr);
    const seed = o.seed || 11;
    const k = fr.s / 0.78;
    // flesh
    ctx.save();
    L.tracePath(ctx, out, true);
    ctx.fillStyle = P.skin;
    ctx.fill();
    ctx.clip();
    // form shade (lower right), contour hatching
    const b = h.bounds;
    L.hatch(ctx, out, { angle: -0.9, spacing: 6.5 * k, width: 1.3, color: P.skinShade, alpha: 0.75, seed: seed + 1,
      density: (x, y) => clamp(((x - b.x) / b.w) * 0.7 + ((y - b.y) / b.h) * 0.5 - 0.25) });
    fs.forEach((f, i) => {
      const L0 = f.len;
      // contour strokes across the finger's shadow half
      for (let s = f.hw * 1.2; s < L0 - f.hw * 0.8; s += 7 * k) {
        const u = s / L0;
        const w = f.hw * (1 - 0.16 * u);
        const cx = f.base[0] + f.d[0] * s, cy = f.base[1] + f.d[1] * s;
        ctx.strokeStyle = L.rgba(P.skinShade, 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx + f.n[0] * w * 0.15, cy + f.n[1] * w * 0.15);
        ctx.quadraticCurveTo(cx + f.n[0] * w * 0.7 + f.d[0] * 3, cy + f.n[1] * w * 0.7 + f.d[1] * 3, cx + f.n[0] * w * 0.98, cy + f.n[1] * w * 0.98);
        ctx.stroke();
      }
      // knuckle creases
      [0.36, 0.4, 0.68, 0.71].forEach((u, j) => {
        if (i === 4 && j > 1) return;
        const s = u * L0;
        const w = f.hw * 0.85;
        const cx = f.base[0] + f.d[0] * s, cy = f.base[1] + f.d[1] * s;
        L.inkPath(ctx, [[cx - f.n[0] * w * 0.7, cy - f.n[1] * w * 0.7], [cx + f.d[0] * 4 * k, cy + f.d[1] * 4 * k], [cx + f.n[0] * w * 0.7, cy + f.n[1] * w * 0.7]],
          { width: 1.5 * k, color: P.skinDeep, alpha: 0.8, seed: seed + 20 + i * 4 + j, taper: 4 });
      });
      // base knuckle bump
      const kb = [f.base[0] + f.d[0] * f.hw * 0.4, f.base[1] + f.d[1] * f.hw * 0.4];
      L.inkPath(ctx, L.ellipsePts(kb[0], kb[1], f.hw * 0.75, f.hw * 0.45, 14, Math.atan2(f.n[1], f.n[0])).slice(8, 14), { width: 1.4 * k, color: P.skinDeep, alpha: 0.6, seed: seed + 50 + i });
      // nail
      const ns = L0 - f.hw * 1.45;
      const nc = [f.base[0] + f.d[0] * ns, f.base[1] + f.d[1] * ns];
      const ang = Math.atan2(f.d[1], f.d[0]);
      const nail = L.ellipsePts(nc[0], nc[1], f.hw * 0.85, f.hw * 0.58, 24, ang);
      L.tracePath(ctx, nail, true);
      ctx.fillStyle = L.mix(P.skin, '#F6E3D0', 0.55);
      ctx.fill();
      L.inkPath(ctx, nail, { closed: true, width: 1.5 * k, color: P.skinDeep, alpha: 0.85, seed: seed + 60 + i });
      L.inkPath(ctx, nail.slice(13, 23), { width: 1.2 * k, color: P.skinDeep, alpha: 0.5, seed: seed + 70 + i });
      // tendon toward the wrist
      if (i < 4) {
        const wr = [fr.cx + (-40 + i * 26) * fr.s, fr.cy + 330 * fr.s];
        const kn = [f.base[0] - f.d[0] * 20 * k, f.base[1] - f.d[1] * 20 * k];
        L.inkPath(ctx, [kn, [lerp(kn[0], wr[0], 0.5) + 6, lerp(kn[1], wr[1], 0.5)], wr], { width: 1.3 * k, color: P.skinShade, alpha: 0.7, seed: seed + 80 + i, taper: [20, 40] });
        L.inkPath(ctx, [[kn[0] - 4 * k, kn[1]], [lerp(kn[0], wr[0], 0.5) - 2, lerp(kn[1], wr[1], 0.5)], [wr[0] - 4 * k, wr[1]]], { width: 1.6 * k, color: '#EBC3A6', alpha: 0.7, seed: seed + 90 + i, taper: [20, 40] });
      }
    });
    // veins
    for (let v = 0; v < 2; v++) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        pts.push([fr.cx + (-30 + v * 70 + Math.sin(u * 5 + v) * 18) * fr.s, fr.cy + (40 + u * 330) * fr.s]);
      }
      L.inkPath(ctx, pts, { width: 2.2 * k, color: L.mix(P.skinShade, '#7d7fa0', 0.35), alpha: 0.55, seed: seed + 100 + v, taper: [30, 30] });
    }
    // fine skin stipple
    L.stipple(ctx, out, { spacing: 9 * k, r: [0.5, 1.2], color: P.skinDeep, alpha: 0.35, seed: seed + 110 });
    ctx.restore();
    // ink outline, doubled
    L.inkPath(ctx, out, { closed: true, width: 4.6 * Math.max(0.6, k), color: P.hcInk, seed: seed + 120, double: true });
    return h;
  };

  // ------------------------------------------------------------------ the ochre halo
  function buildDots() {
    const hc = FILM.hc;
    const h = hc.hand();
    const out = h.outline;
    const r = L.rng(L.hash('hc-halo'));
    const dots = [];
    // outward normals per outline point
    const N = out.length;
    let guard = 0;
    while (dots.length < 7200 && guard++ < 40000) {
      const j = Math.floor(r() * N);
      const a = out[(j - 2 + N) % N], b = out[(j + 2) % N], p = out[j];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      const far = r() < 0.12;
      const d = far ? 60 + r() * 260 : 3 + -Math.log(1 - r() * 0.985) * 42;
      const sp = (r() - 0.5) * 0.9;
      let x = p[0] + (nx * Math.cos(sp) - ny * Math.sin(sp)) * d;
      let y = p[1] + (ny * Math.cos(sp) + nx * Math.sin(sp)) * d;
      if (L.polyContains(out, x, y)) {
        x = p[0] - nx * d;
        y = p[1] - ny * d;
        if (L.polyContains(out, x, y)) continue;
      }
      const ang = Math.atan2(y - 1500, x - 120);
      const order = clamp(0.55 * ((ang + 1.9) / 1.5) + 0.45 * r());
      dots.push({ x, y, r: (far ? 0.6 : 0.9) + r() * (far ? 1.6 : 2.6) * (d < 40 ? 1.15 : 0.8), a: (far ? 0.3 : 0.55) + r() * 0.45, t0: order, col: r() < 0.3 ? P.ochreDeep : r() < 0.5 ? P.ochreDust : P.ochre });
    }
    return dots;
  }
  hx.haloDots = () => L.cached('hc-halo-dots-v1', () => ({ dots: buildDots() })).dots;
  function drawDots(g, dots, p) {
    for (const d of dots) {
      const k = clamp((p - d.t0 * 0.9) / 0.1);
      if (k <= 0) continue;
      g.fillStyle = L.rgba(d.col, d.a * k);
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, TAU);
      g.fill();
    }
  }
  function drips(g, p) {
    const r = L.rng(L.hash('hc-drips'));
    const h = FILM.hc.hand();
    for (let i = 0; i < 5; i++) {
      const pts = h.outline;
      const q = pts[Math.floor(((i * 0.17 + 0.08) % 1) * pts.length)];
      const x = q[0] + (r() - 0.5) * 30, y = q[1] + 10 + r() * 40;
      const len = (40 + r() * 110) * clamp((p - 0.6) / 0.4);
      if (len <= 1) continue;
      L.inkPath(g, [[x, y], [x + (r() - 0.5) * 4, y + len * 0.6], [x + (r() - 0.5) * 3, y + len]], { width: 3 + r() * 2, color: P.ochre, alpha: 0.75, seed: 900 + i, taper: [2, 18], boil: false });
    }
  }
  hx.halo = function halo(ctx, o = {}) {
    const p = o.p != null ? clamp(o.p) : 1;
    const dots = hx.haloDots();
    if (p >= 1) {
      const c = L.cached('hc-halo-full-v1', () => {
        const cv = canvas(W, H);
        const g = cv.getContext('2d');
        drawDots(g, dots, 1);
        drips(g, 1);
        return cv;
      });
      ctx.drawImage(c, 0, 0, W, H);
    } else {
      drawDots(ctx, dots, p);
      drips(ctx, p);
    }
    // the retouch: fingers narrowed by painting ochre into the edge of the stencil, then rock inside the new outline
    const nr = clamp(o.narrow || 0);
    if (nr > 0) {
      const h0 = FILM.hc.hand();
      const h1 = FILM.hc.hand({ narrow: nr });
      ctx.save();
      L.tracePath(ctx, h0.outline, true);
      ctx.clip();
      ctx.fillStyle = L.rgba(P.ochre, 0.8);
      ctx.fillRect(0, 0, W, H);
      L.stipple(ctx, h0.outline, { spacing: 5, r: [0.8, 2], color: P.ochreDeep, alpha: 0.6, seed: 950 });
      ctx.restore();
      ctx.save();
      L.tracePath(ctx, h1.outline, true);
      ctx.clip();
      ctx.drawImage(hx.wallCanvas(), 0, 0, W, H);
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ small glyphs
  hx.star8 = function star8(ctx, x, y, r, o = {}) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU - Math.PI / 2 + (o.rot || 0);
      const rr = i % 2 ? r * 0.28 : i % 4 === 0 ? r : r * 0.62;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = o.fill || P.hcInk;
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    ctx.fill();
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.width || 1.2;
      ctx.stroke();
    }
    ctx.restore();
  };
  hx.progress = function progress(ctx, k, T) {
    const cx = 900, cy = 300, R = 34;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a0 = -Math.PI / 2 + (i / 5) * TAU + 0.12, a1 = -Math.PI / 2 + ((i + 1) / 5) * TAU - 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.strokeStyle = i === k ? P.hcYellow : L.rgba(P.lavender, i < k ? 0.6 : 0.25);
      ctx.lineWidth = i === k ? 4 : 2;
      ctx.stroke();
    }
    ctx.restore();
    L.glowDot(ctx, cx + Math.cos(-Math.PI / 2 + ((k + 0.5) / 5) * TAU) * R, cy + Math.sin(-Math.PI / 2 + ((k + 0.5) / 5) * TAU) * R, 3.5, { color: P.hcYellow, rays: 0, glow: 5 });
  };

  // ------------------------------------------------------------------ 3D helpers
  hx.rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
  hx.rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
  hx.rotZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
  // camera: { yaw, pitch, dist, f, cx, cy } ; world point → [sx, sy, depth, scale]
  hx.project = function project(p, cam) {
    let q = hx.rotY(p, cam.yaw || 0);
    q = hx.rotX(q, cam.pitch || 0);
    const z = (cam.dist || 1800) - q[2];
    const s = (cam.f || cam.dist || 1800) / Math.max(1, z);
    return [cam.cx + q[0] * s, cam.cy + q[1] * s, z, s];
  };

  // gear outline: fine triangular teeth (Antikythera style), pitch radius m*teeth/2
  hx.gear = function gear(teeth, m, o = {}) {
    const rp = (m * teeth) / 2;
    const depth = o.depth != null ? o.depth : m * 1.1;
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * TAU;
      const a1 = ((i + 0.5) / teeth) * TAU;
      pts.push([Math.cos(a0) * (rp - depth * 0.5), Math.sin(a0) * (rp - depth * 0.5)]);
      pts.push([Math.cos(a1) * (rp + depth * 0.5), Math.sin(a1) * (rp + depth * 0.5)]);
    }
    return { pts, rp };
  };

  FILM.hx = hx;
})();

/*
 * FILM.mk — THE POISONED UMBRELLA kit (built on FILM.hx / FILM.hc / lib).
 *   cam(o)                         {x, y, z, f, hz, cx}: a pinhole camera looking down +z (y up)
 *   P3(cam, x, y, z)               → [sx, sy, scale] or null behind the camera
 *   street(ctx, T, cam, o)         wet Waterloo-Bridge night street: skyline, fog, parapet, lamps, wet reflections
 *   rain(ctx, T, cam, o)           3D rain streaks (+ lamp-lit drops)
 *   man(ctx, x, y, s, T, o)        coated figure, walking on twos, rim-lit
 *   brolly(ctx, x, y, s, o)        an umbrella (open or furled), ink silhouette
 *   pip(ctx, o, inner)             branded PiP window (rect or circle) with label tab and leader line; o.p opens it
 *   callout(ctx, x, y, r, p, o)    hand-drawn circle callout with overshoot
 *   label(ctx, s, x, y, o)         mono engraved label with ink underline
 *   sphere(ctx, tex, cx, cy, R, lon, o)  per-pixel lit sphere from an equirect texture
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const mk = {};

  mk.cam = (o = {}) => Object.assign({ x: 0, y: 170, z: 0, f: 900, hz: 860, cx: 540 }, o);
  mk.P3 = (c, x, y, z) => {
    const d = z - c.z;
    if (d < 4) return null;
    const s = c.f / d;
    return [c.cx + (x - c.x) * s, c.hz + (c.y - y) * s, s];
  };

  function skyline(g) {
    // cached far plate: night sky glow, St Paul's dome and city blocks in fog
    const sk = g.createLinearGradient(0, 0, 0, 900);
    sk.addColorStop(0, '#060B16');
    sk.addColorStop(0.75, '#16223A');
    sk.addColorStop(1, '#2C3550');
    g.fillStyle = sk;
    g.fillRect(0, 0, 1080, 1920);
    const r = L.rng(L.hash('skyline'));
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer ? '#141D30' : '#1C2740';
      let x = -20;
      while (x < 1100) {
        const w = 30 + r() * 80, h = 40 + r() * (layer ? 120 : 70);
        g.fillRect(x, 860 - h, w, h + 4);
        if (layer) for (let k = 0; k < 6; k++) if (r() > 0.55) { g.fillStyle = L.rgba(P.lampPale, 0.5); g.fillRect(x + 4 + r() * (w - 8), 860 - h + 6 + r() * (h - 12), 3, 4); g.fillStyle = '#141D30'; }
        x += w + 2;
      }
    }
    // the dome
    g.fillStyle = '#18233A';
    g.beginPath();
    g.ellipse(300, 760, 70, 76, 0, Math.PI, 0);
    g.fillRect(230, 760, 140, 100);
    g.fill();
    g.fillRect(296, 660, 8, 30);
    L.inkPath(g, L.ellipsePts(300, 760, 70, 76, 40).slice(20, 41), { width: 2, color: '#3A4A6A', boil: false, seed: 3 });
    // fog band
    const fog = g.createLinearGradient(0, 760, 0, 900);
    fog.addColorStop(0, 'rgba(70,84,110,0)');
    fog.addColorStop(1, 'rgba(70,84,110,0.55)');
    g.fillStyle = fog;
    g.fillRect(0, 700, 1080, 220);
  }
  mk.skyCanvas = () => L.cached('pu-sky-v1', () => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; skyline(c.getContext('2d')); return c; });

  mk.street = function street(ctx, T, c, o = {}) {
    ctx.drawImage(mk.skyCanvas(), 0, (c.hz - 860), 1080, 1920);
    // wet road plane
    const g = ctx.createLinearGradient(0, c.hz, 0, 1920);
    g.addColorStop(0, '#202B40');
    g.addColorStop(1, '#0B111C');
    ctx.fillStyle = g;
    ctx.fillRect(0, c.hz, 1080, 1920 - c.hz);
    // pavement edge + kerb lines receding
    const far = 6000;
    [[-260, 0.6], [-170, 0.35], [320, 0.6]].forEach(([x, a]) => {
      const p0 = mk.P3(c, x, 0, c.z + 30), p1 = mk.P3(c, x, 0, far);
      if (!p0 || !p1) return;
      ctx.strokeStyle = L.rgba('#8090B0', a);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    });
    // paving stones on the pavement (left of the kerb) in perspective
    for (let z = Math.ceil(c.z / 90) * 90; z < c.z + 2400; z += 90) {
      const a = mk.P3(c, -700, 0, z), b = mk.P3(c, -260, 0, z);
      if (!a || !b) continue;
      ctx.strokeStyle = L.rgba('#6878A0', 0.22 * clamp(1 - (z - c.z) / 2400));
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // parapet (balustrade) on the right, with balusters
    const top = [], bot = [];
    for (let z = c.z + 20; z < far; z += 60) { const a = mk.P3(c, 420, 110, z), b = mk.P3(c, 420, 0, z); if (a) { top.push(a); bot.push(b); } }
    if (top.length > 2) {
      const poly = top.concat(bot.slice().reverse());
      L.tracePath(ctx, poly, true);
      ctx.fillStyle = '#2B3550';
      ctx.fill();
      for (let i = 0; i < top.length; i += 1) {
        ctx.strokeStyle = L.rgba('#11182A', 0.8);
        ctx.lineWidth = Math.max(1, 6 * top[i][2]);
        ctx.beginPath(); ctx.moveTo(top[i][0], top[i][1] + 8 * top[i][2]); ctx.lineTo(bot[i][0], bot[i][1]); ctx.stroke();
      }
      ctx.strokeStyle = L.rgba('#AAB6D0', 0.7);
      ctx.lineWidth = 2;
      L.tracePath(ctx, top, false);
      ctx.stroke();
    }
    // lamps every 520 units on both sides: post, glowing head, wet reflection streak
    for (let k = -1; k < 8; k++) {
      [[-330, 0], [440, 1]].forEach(([x, side]) => {
        const z = Math.floor(c.z / 800) * 800 + k * 800 + side * 400;
        const b = mk.P3(c, x, 0, z), h = mk.P3(c, x, 420, z);
        if (!b || !h || z - c.z < 40) return;
        const s = b[2];
        ctx.strokeStyle = '#0A0F1A';
        ctx.lineWidth = Math.max(1.2, 9 * s);
        ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(h[0], h[1]); ctx.stroke();
        const fl = 0.92 + 0.08 * Math.sin(T * 13 + k * 3);
        const R = 150 * s * fl;
        let gr = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], R);
        gr.addColorStop(0, L.rgba(P.lampPale, 0.95));
        gr.addColorStop(0.15, L.rgba(P.lamp, 0.55));
        gr.addColorStop(1, L.rgba(P.lamp, 0));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gr;
        ctx.fillRect(h[0] - R, h[1] - R, 2 * R, 2 * R);
        // reflection: a soft vertical shimmer on the wet road below the base
        const rl = Math.min(700, 520 * s + 40);
        for (let j = 0; j < 9; j++) {
          const yy = b[1] + (j / 9) * rl;
          const ww = (4 + 16 * s) * (1 + 0.6 * Math.sin(T * 7 + j * 1.7 + k)) * (1 - j / 12);
          ctx.fillStyle = L.rgba(P.lamp, 0.22 * (1 - j / 9));
          ctx.beginPath();
          ctx.ellipse(b[0] + Math.sin(T * 5 + j) * 3 * s, yy, ww, rl / 18, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = L.rgba(P.lampPale, 1);
        ctx.beginPath(); ctx.arc(h[0], h[1], Math.max(1.5, 9 * s), 0, TAU); ctx.fill();
      });
    }
    // puddle ripples
    const r = L.rng(L.hash('ripples'));
    for (let i = 0; i < 40; i++) {
      const x = -250 + r() * 680, z = c.z + 60 + r() * 1400, ph = r();
      const u = ((T * 1.6 + ph) % 1);
      const p = mk.P3(c, x, 0, z);
      if (!p) continue;
      ctx.strokeStyle = L.rgba('#A8B8D8', 0.45 * (1 - u));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], 40 * u * p[2] * 3, 10 * u * p[2] * 3, 0, 0, TAU);
      ctx.stroke();
    }
  };

  mk.rain = function rain(ctx, T, c, o = {}) {
    const n = o.n || 900;
    const r = L.rng(L.hash('rain', o.seed || 1));
    ctx.save();
    ctx.lineCap = 'round';
    const wind = o.wind != null ? o.wind : -0.18;
    for (let i = 0; i < n; i++) {
      const x0 = (r() - 0.5) * 2600, z = c.z + 60 + Math.pow(r(), 1.6) * 2600, ph = r();
      const speed = 1500 + r() * 500;
      const y = 900 - (((T * speed / 900 + ph) % 1) * 1000);
      const x = x0 + wind * (900 - y);
      const a = mk.P3(c, x + c.x, y, z), b = mk.P3(c, x + c.x - wind * 70, y + 70, z);
      if (!a || !b) continue;
      const near = clamp(1 - (z - c.z) / 2600);
      ctx.strokeStyle = L.rgba('#C8D6F0', (0.12 + 0.45 * near) * (o.alpha != null ? o.alpha : 1));
      ctx.lineWidth = 0.6 + 2.2 * near;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.restore();
  };

  // a man in an overcoat and fedora, film-noir silhouette, front view, walking on twos.
  // (x, y) = feet, s = scale (685 units tall at s 1). Lit only by a rim light; reflection on the wet road.
  function manShape(g, ph, walk, o) {
    const sw = walk ? Math.sin(ph) : 0;
    const lift = walk ? Math.max(0, Math.sin(ph)) : 0, lift2 = walk ? Math.max(0, -Math.sin(ph)) : 0;
    const bob = walk ? -7 * Math.abs(Math.cos(ph)) : 0;
    g.beginPath();
    // legs: tapered trousers with a soft knee, the swinging foot lifting
    [[-34, lift], [34, lift2]].forEach(([hx, lf]) => {
      const ky = -175 + lf * 18, ay = -24 - lf * 34;
      const kx = hx * 1.08, ax = hx * 0.92;
      g.moveTo(hx - 30, -335 + bob);
      g.quadraticCurveTo(kx - 26, ky, ax - 15, ay);
      g.lineTo(ax - 22, ay + 6);
      g.quadraticCurveTo(ax - 26, ay + 26, ax + 4, ay + 26);
      g.lineTo(ax + 34, ay + 24);
      g.quadraticCurveTo(ax + 40, ay + 10, ax + 15, ay);
      g.quadraticCurveTo(kx + 24, ky, hx + 30, -335 + bob);
      g.closePath();
    });
    // overcoat: sloped shoulders, belted waist, flared hem that sways
    const hs = sw * 9;
    g.moveTo(-26, -598 + bob);
    g.quadraticCurveTo(-70, -600 + bob, -92, -572 + bob);
    g.quadraticCurveTo(-104, -520 + bob, -96, -440 + bob);
    g.quadraticCurveTo(-92, -410 + bob, -88, -402 + bob);
    g.quadraticCurveTo(-112 + hs, -330, -122 + hs, -258);
    g.quadraticCurveTo(0, -244 + Math.abs(hs), 122 + hs, -258);
    g.quadraticCurveTo(112 + hs, -330, 88, -402 + bob);
    g.quadraticCurveTo(92, -410 + bob, 96, -440 + bob);
    g.quadraticCurveTo(104, -520 + bob, 92, -572 + bob);
    g.quadraticCurveTo(70, -600 + bob, 26, -598 + bob);
    g.closePath();
    // arms: shoulder → elbow → gloved hand, swinging (front view: the forward hand rises and widens)
    [[-1, sw], [1, -sw]].forEach(([sd, a]) => {
      const sx = sd * 92, sy = -560 + bob;
      const ex = sd * 108, ey = -428 + bob + a * 6;
      const hx = sd * (98 - a * 6), hy = -300 + bob - a * 26;
      const w0 = 22, w1 = 15 + a * 2;
      g.moveTo(sx - sd * 0, sy - 6);
      g.quadraticCurveTo(ex + sd * w0, ey, hx + sd * w1, hy);
      g.quadraticCurveTo(hx, hy + 22 + a * 4, hx - sd * w1, hy);
      g.quadraticCurveTo(ex - sd * (w0 - 4), ey, sx - sd * 28, sy + 20);
      g.closePath();
    });
    // neck, head (no features: a silhouette), fedora
    g.moveTo(-16, -600 + bob); g.lineTo(-14, -628 + bob); g.lineTo(14, -628 + bob); g.lineTo(16, -600 + bob); g.closePath();
    g.ellipse(0, -654 + bob, 33, 42, 0, 0, Math.PI * 2);
    g.ellipse(0, -682 + bob, 72, 13, 0, 0, Math.PI * 2);
    g.moveTo(-44, -684 + bob);
    g.quadraticCurveTo(-46, -728 + bob, -16, -730 + bob);
    g.quadraticCurveTo(0, -722 + bob, 16, -730 + bob);
    g.quadraticCurveTo(46, -728 + bob, 44, -684 + bob);
    g.closePath();
  }
  mk.man = function man(ctx, x, y, s, T, o = {}) {
    const walk = o.walk !== false;
    const Tq = Math.floor(T * 12 + 1e-6) / 12;
    const ph = (Tq + (o.phase || 0)) * Math.PI * 2 * 0.95;
    const ink = o.ink || '#05070C';
    const rim = o.rim != null ? o.rim : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (o.flip ? -1 : 1), s);
    // wet-road reflection
    if (o.reflect !== false) {
      ctx.save();
      ctx.scale(1, -0.55);
      manShape(ctx, ph, walk, o);
      ctx.fillStyle = L.rgba(ink, 0.35);
      ctx.fill('nonzero');
      ctx.restore();
    }
    // rim light: the silhouette offset toward the lamp, under the body
    if (rim > 0) {
      ctx.save();
      ctx.translate(5, -3);
      manShape(ctx, ph, walk, o);
      ctx.fillStyle = L.rgba(o.rimColor || P.lampPale, 0.65 * rim);
      ctx.fill('nonzero');
      ctx.restore();
    }
    manShape(ctx, ph, walk, o);
    ctx.fillStyle = ink;
    ctx.fill('nonzero');
    // coat detail, barely lit: belt, centre opening, collar
    if (rim > 0) {
      ctx.strokeStyle = L.rgba(P.lampPale, 0.16 * rim);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-90, -404); ctx.lineTo(90, -404);
      ctx.moveTo(6, -590); ctx.lineTo(10, -262);
      ctx.moveTo(-24, -596); ctx.lineTo(4, -520); ctx.lineTo(30, -596);
      ctx.stroke();
    }
    ctx.restore();
  };

  mk.brolly = function brolly(ctx, x, y, s, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.scale(s, s);
    const ink = o.ink || '#07090F';
    if (o.open) {
      ctx.fillStyle = o.fill || '#14151B';
      ctx.beginPath();
      ctx.moveTo(-170, 0);
      for (let k = 0; k <= 8; k++) { const xx = -170 + k * 42.5; ctx.quadraticCurveTo(xx - 21, -6, xx, k % 2 ? 6 : 0); }
      ctx.quadraticCurveTo(0, -150, -170, 0);
      ctx.fill();
      ctx.strokeStyle = L.rgba(P.lampPale, 0.5);
      ctx.lineWidth = 2;
      for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(-170 + k * 42.5, 2); ctx.stroke(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, -120); ctx.lineTo(0, 230); ctx.arc(-18, 230, 18, 0, Math.PI); ctx.stroke();
    } else {
      // furled: a long tapered body with the ferrule tip at (0, 0) pointing down
      ctx.fillStyle = o.fill || '#15161D';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-22, -110); ctx.lineTo(-16, -470); ctx.lineTo(16, -470); ctx.lineTo(22, -110); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = L.rgba(P.lampPale, 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, -100); ctx.lineTo(10, -460); ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, -470); ctx.lineTo(0, -560); ctx.arc(-26, -560, 26, 0, -Math.PI, true); ctx.stroke();
      ctx.strokeStyle = '#B8BDC6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    }
    ctx.restore();
  };

  // branded PiP window. o: { kind 'rect'|'circle', x, y, w, h | r, p (0..1 open), label, target [x,y] (leader), plate 'navy'|'paper' }
  mk.pip = function pip(ctx, o, inner) {
    const p = clamp(o.p != null ? o.p : 1);
    if (p <= 0) return;
    const e = L.ease.outBack(p);
    const navy = o.plate !== 'paper';
    const edge = navy ? P.hcIvory : P.hcInk;
    ctx.save();
    // leader line from the target to the window edge, drawn first
    if (o.target) {
      const tx = o.target[0], ty = o.target[1];
      const cx = o.kind === 'circle' ? o.x : o.x + o.w / 2, cy = o.kind === 'circle' ? o.y : o.y + o.h / 2;
      const k = L.ease.outExpo(clamp(p * 1.4));
      FILM.hc.line(ctx, [[tx, ty], [tx + (cx - tx) * k, ty + (cy - ty) * k]], { plate: navy ? 'blueprint' : 'paper', width: 3, head: false, seed: 77 });
      L.glowDot(ctx, tx, ty, 5, { color: P.hcYellow, rays: 6, rayLen: 3, additive: navy });
    }
    const frame = () => {
      ctx.beginPath();
      if (o.kind === 'circle') ctx.arc(o.x, o.y, o.r * e, 0, TAU);
      else {
        const w = o.w * e, h = o.h * e;
        ctx.rect(o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h);
      }
    };
    frame();
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    if (inner) inner(ctx, p);
    ctx.restore();
    frame();
    // frame: heavy ink + inner ivory hairline + corner ticks
    ctx.strokeStyle = navy ? '#05080F' : P.hcInk;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = L.rgba(edge, 0.95);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    if (o.kind !== 'circle' && p > 0.6) {
      const a = (p - 0.6) / 0.4;
      ctx.strokeStyle = L.rgba(P.hcYellow, a);
      ctx.lineWidth = 4;
      [[o.x, o.y, 1, 1], [o.x + o.w, o.y, -1, 1], [o.x, o.y + o.h, 1, -1], [o.x + o.w, o.y + o.h, -1, -1]].forEach(([x, y, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(x + dx * 26, y - dy * 10); ctx.lineTo(x - dx * 10, y - dy * 10); ctx.lineTo(x - dx * 10, y + dy * 26); ctx.stroke();
      });
    }
    if (o.label && p > 0.5) {
      const lx = o.kind === 'circle' ? o.x - o.r : o.x, ly = o.kind === 'circle' ? o.y + o.r + 18 : o.y + o.h + 14;
      ctx.fillStyle = P.hcYellow;
      ctx.font = '600 22px ' + MONO;
      const w = ctx.measureText(o.label).width + 28;
      ctx.fillRect(lx, ly, w, 36);
      ctx.fillStyle = P.hcNavyDeep;
      ctx.textBaseline = 'middle';
      ctx.fillText(o.label, lx + 14, ly + 19);
    }
  };

  mk.callout = function callout(ctx, x, y, r, p, o = {}) {
    if (p <= 0) return;
    const pts = [];
    const turns = 1.12 * clamp(p);
    for (let k = 0; k <= 60 * turns; k++) {
      const a = -2.2 + (k / 60) * TAU;
      const rr = r * (1 + 0.06 * Math.sin(k * 0.21) + 0.08 * (k / 60));
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.92]);
    }
    if (pts.length > 1) L.inkPath(ctx, pts, { width: o.width || 5, color: o.color || P.hcRed, seed: o.seed || 31, taper: [4, 30] });
  };

  mk.label = function label(ctx, s, x, y, o = {}) {
    const a = o.alpha != null ? o.alpha : 1;
    if (a <= 0) return;
    L.text(ctx, s, x, y, { size: o.size || 26, family: MONO, weight: 600, color: o.color || P.hcIvory, alpha: a, tracking: '0.16em', align: o.align || 'left' });
    if (o.underline !== false) {
      ctx.font = `600 ${o.size || 26}px ${MONO}`;
      const w = ctx.measureText(s).width * 1.18;
      const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      L.inkPath(ctx, [[x0, y + 10], [x0 + w * (o.p != null ? o.p : 1), y + 12]], { width: 2.5, color: o.ucolor || P.hcYellow, alpha: a, seed: 41, taper: [2, 10] });
    }
  };

  mk.sphere = function sphere(ctx, tex, key, cx, cy, R, lon0, o = {}) {
    if (R < 1.5) return;
    const N = Math.max(16, Math.min(560, Math.round(2 * R)));
    const buf = L.cached('pu-sphere-buf-' + N + '-' + (o.slot || 0), () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; });
    const g = buf.getContext('2d');
    const img = g.createImageData(N, N);
    const d = img.data;
    const tc = L.cached('pu-texdata-' + key, () => tex.getContext('2d').getImageData(0, 0, tex.width, tex.height));
    const tw = tex.width, th = tex.height, td = tc.data;
    const lx = o.lx != null ? o.lx : -0.55, ly = o.ly != null ? o.ly : -0.5, lz = o.lz != null ? o.lz : 0.67;
    const spec = o.spec || 0;
    const tilt = o.tilt || 0.3, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const nx = (i + 0.5) / (N / 2) - 1, ny = (j + 0.5) / (N / 2) - 1;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const ty = ny * ct - nz * st, tz = ny * st + nz * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, -ty)));
      const lon = Math.atan2(nx, tz) + lon0;
      const u = ((lon / TAU) % 1 + 1) % 1, v = 0.5 - lat / Math.PI;
      const ti = ((Math.min(th - 1, Math.floor(v * th)) * tw) + Math.floor(u * tw)) * 4;
      const dd = nx * lx + ny * ly + nz * lz;
      const sh = Math.max(0, Math.min(1, dd * 1.1 + 0.12));
      // specular (view along +z): reflect light about the normal
      const rz = 2 * dd * nz - lz;
      const sp = spec * Math.pow(Math.max(0, rz), 24);
      const k = (o.ambient != null ? o.ambient : 0.22) + 0.78 * sh;
      const p = (j * N + i) * 4;
      d[p] = Math.min(255, td[ti] * k + 255 * sp);
      d[p + 1] = Math.min(255, td[ti + 1] * k + 250 * sp);
      d[p + 2] = Math.min(255, td[ti + 2] * k + 240 * sp);
      d[p + 3] = td[ti + 3];
    }
    g.putImageData(img, 0, 0);
    ctx.drawImage(buf, cx - R, cy - R, 2 * R, 2 * R);
  };

  // the platinum-iridium pellet: brushed metal with four drilled openings on the equator (two crossing holes)
  mk.pelletTex = () => L.cached('pu-pellet-tex-v1', () => {
    const w = 512, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = L.noise2(x * 0.03, y * 0.3, 3) * 0.5 + L.noise2(x * 0.2, y * 0.02, 4) * 0.25;
      const v = 200 + n * 50;
      const i = (y * w + x) * 4;
      d[i] = v; d[i + 1] = v + 3; d[i + 2] = v + 8; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // four openings: lon 0, 90, 180, 270 on the equator; dark bore with a bright chamfer ring
    for (let k = 0; k < 4; k++) {
      const x = (k / 4) * w + w / 8, y = h / 2;
      g.fillStyle = '#9EA4AD';
      g.beginPath(); g.ellipse(x, y, 26, 34, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#15171C';
      g.beginPath(); g.ellipse(x, y, 17, 23, 0, 0, Math.PI * 2); g.fill();
    }
    return c;
  });
  // the evidence board (shots 08 and 10). o: { fall: 0..1 (10: pieces drop), dark: 0..1, T }
  mk.CARDS = [
    { x: 120, y: 300, w: 330, h: 220, rot: -0.05, kind: 'name' },
    { x: 620, y: 260, w: 340, h: 260, rot: 0.06, kind: 'map' },
    { x: 140, y: 1230, w: 300, h: 230, rot: 0.04, kind: 'date' },
    { x: 640, y: 1230, w: 300, h: 260, rot: -0.07, kind: 'pellet' },
  ];
  mk.board = function board(ctx, T, o = {}) {
    const fall = o.fall || 0, dark = o.dark || 0;
    // cork
    ctx.fillStyle = P.cork;
    ctx.fillRect(0, 0, 1080, 1920);
    L.paper(ctx, { color: P.cork, seed: 81, vignette: 0.55, grain: 1.4, mottle: 2 });
    L.stipple(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, spacing: 9, r: [0.8, 2], color: '#7A5A36', alpha: 0.5, seed: 82 });
    const pins = [];
    mk.CARDS.forEach((cd, i) => {
      const f = L.clamp(fall * 1.6 - i * 0.18);
      const dy = 2200 * f * f, rot = cd.rot + f * (i % 2 ? 1.4 : -1.2);
      const cx = cd.x + cd.w / 2, cy = cd.y + cd.h / 2 + dy;
      pins.push([cd.x + cd.w / 2, cd.y + 14 + dy, f]);
      if (cy - cd.h > 1940) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cd.w / 2, -cd.h / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(10, 12, cd.w, cd.h);
      ctx.fillStyle = '#F4EEDD';
      ctx.fillRect(0, 0, cd.w, cd.h);
      L.inkPath(ctx, [[0, 0], [cd.w, 0], [cd.w, cd.h], [0, cd.h]], { closed: true, width: 2, color: P.hcInk, seed: 83 + i });
      const T2 = (s, x, y, sz, col) => L.text(ctx, s, x, y, { size: sz, family: MONO, weight: 600, color: col || P.hcInk, tracking: '0.08em' });
      if (cd.kind === 'name') {
        T2('GEORGI MARKOV', 20, 60, 26);
        T2('1929 \u2013 1978', 20, 100, 22, P.hcInkSoft);
        T2('WRITER · BROADCASTER', 20, 140, 18, P.hcInkSoft);
        L.inkPath(ctx, [[20, 170], [300, 172]], { width: 2, color: P.hcRed, seed: 90 });
      } else if (cd.kind === 'map') {
        const top = [];
        for (let k = 0; k <= 20; k++) top.push([20 + k * 15, 130 + Math.sin(k * 0.5) * 30]);
        L.inkPath(ctx, top, { width: 14, color: L.mix(P.earthSea, '#F4EEDD', 0.5), seed: 91 });
        L.inkPath(ctx, [[200, 80], [214, 190]], { width: 5, color: P.hcRed, seed: 92 });
        T2('WATERLOO BR.', 150, 230, 18);
      } else if (cd.kind === 'date') {
        T2('7 SEPT 1978', 20, 70, 28, P.hcRed);
        T2('STUNG · RIGHT THIGH', 20, 120, 18, P.hcInkSoft);
        T2('11 SEPT · DIED', 20, 170, 20);
      } else {
        const g2 = ctx;
        L.inkCircle(g2, 150, 120, 70, { width: 3, color: P.hcInk, fill: '#D8DBE0', seed: 93 });
        L.hatch(g2, L.ellipsePts(150, 120, 70, 70, 40), { angle: -0.8, spacing: 6, width: 1.2, color: P.hcInkSoft, alpha: 0.7, seed: 94, density: (x, y) => L.clamp((x - 100) / 100) });
        L.inkCircle(g2, 125, 115, 10, { width: 2, color: P.hcInk, fill: '#15171C', seed: 95 });
        L.inkCircle(g2, 175, 125, 9, { width: 2, color: P.hcInk, fill: '#15171C', seed: 96 });
        T2('1.70 MM · Pt/Ir', 30, 230, 18, P.hcRed);
      }
      ctx.restore();
    });
    // string between the pins (the curiosity line, red), snapping as the cards fall
    const order = [0, 1, 3, 2, 0];
    for (let k = 0; k < order.length - 1; k++) {
      const a = pins[order[k]], b = pins[order[k + 1]];
      if (Math.max(a[2], b[2]) > 0.05) continue;
      FILM.hc.line(ctx, [[a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 40], [b[0], b[1]]].map((p) => p), { plate: 'paper', width: 3, head: false, seed: 97 + k });
    }
    pins.forEach(([x, y, f]) => { if (f < 0.05) { L.inkCircle(ctx, x, y, 11, { width: 2, color: P.hcInk, fill: P.hcRed, seed: 98 }); } });
    if (dark > 0) { ctx.fillStyle = L.rgba('#05070D', dark); ctx.fillRect(0, 0, 1080, 1920); }
  };
  FILM.mk = mk;
})();

/*
 * FILM.wc — episode 3 WOODCUT kit: the darker, rigid 2D print world (black ink on parchment, gouged hatching).
 *   paper(ctx, o)              parchment + print vignette
 *   gouge(ctx, clip, o)        rigid woodcut hatching (straight, dense, no wobble)
 *   frame(ctx, o)              printed broadside border with corner blocks
 *   house(ctx, x, base, w, h, seed, o)  half-timbered facade
 *   street(ctx, T, o)          Strasbourg street in perspective to the cathedral spire, cobbles
 *   dancer(ctx, x, y, s, ph, o) 16th-c. dancer (o.kind 'woman'|'man'|'piper'|'drummer'), stiff stamped-puppet poses
 *   porthole(ctx, cx, cy, r, o) Pip's window into the print: bright 3D-world interior (o.ring → draw the frame only)
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const wc = {};
  const INK = () => P.wcInk;

  wc.paper = (ctx, o = {}) => {
    L.paper(ctx, { color: o.color || P.parch, seed: o.seed || 301, vignette: o.vignette != null ? o.vignette : 0.5, mottle: 1.4 });
  };
  wc.gouge = (ctx, clip, o = {}) => L.hatch(ctx, clip, Object.assign({ angle: -0.35, spacing: 6, width: 2.1, color: INK(), alpha: 0.95, angleJitter: 0.008, bow: 0, flow: 0, spacingJitter: 0.08, boilAmp: 0.15, length: [400, 900], gap: [0, 1], seed: 7 }, o));
  wc.frame = (ctx, o = {}) => {
    const m = o.m || 28;
    ctx.save();
    ctx.strokeStyle = INK();
    ctx.lineWidth = 10;
    ctx.strokeRect(m, m, 1080 - 2 * m, 1920 - 2 * m);
    ctx.lineWidth = 3;
    ctx.strokeRect(m + 16, m + 16, 1080 - 2 * m - 32, 1920 - 2 * m - 32);
    ctx.fillStyle = INK();
    [[m, m], [1080 - m - 44, m], [m, 1920 - m - 44], [1080 - m - 44, 1920 - m - 44]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 44, 44);
      ctx.fillStyle = P.parch; ctx.beginPath(); ctx.arc(x + 22, y + 22, 9, 0, TAU); ctx.fill(); ctx.fillStyle = INK();
    });
    ctx.restore();
  };
  wc.house = function house(ctx, x, base, w, h, seed, o = {}) {
    const r = L.rng(L.hash('wc-house', seed));
    const ink = INK();
    const roofH = h * (0.45 + r() * 0.2);
    const body = [[x, base], [x, base - h], [x + w, base - h], [x + w, base]];
    const roof = [[x - w * 0.06, base - h], [x + w / 2, base - h - roofH], [x + w + w * 0.06, base - h]];
    ctx.save();
    ctx.lineJoin = 'miter';
    // plaster
    ctx.beginPath(); L.tracePath(ctx, body, true); ctx.fillStyle = o.plaster || '#EFE4CA'; ctx.fill();
    // shade side
    wc.gouge(ctx, [[x + w * 0.72, base], [x + w * 0.72, base - h], [x + w, base - h], [x + w, base]], { spacing: 7, width: 1.6, seed: seed + 1 });
    // timbers: posts, rails, braces (thick black)
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(4, w * 0.035);
    const floors = 2 + Math.floor(r() * 2);
    for (let f = 0; f <= floors; f++) { const y = base - (h * f) / floors; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
    const posts = 3 + Math.floor(r() * 2);
    for (let p = 0; p <= posts; p++) { const xx = x + (w * p) / posts; ctx.beginPath(); ctx.moveTo(xx, base); ctx.lineTo(xx, base - h); ctx.stroke(); }
    for (let f = 0; f < floors; f++) for (let p = 0; p < posts; p++) {
      const x0 = x + (w * p) / posts, x1 = x + (w * (p + 1)) / posts, y0 = base - (h * f) / floors, y1 = base - (h * (f + 1)) / floors;
      if ((p + f + seed) % 3 === 0) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.moveTo(x1, y0); ctx.lineTo(x0, y1); ctx.stroke(); }
      else if ((p + f) % 2 === 0) {
        // a leaded window
        const wx = x0 + (x1 - x0) * 0.22, wy = y1 + (y0 - y1) * 0.25, ww = (x1 - x0) * 0.56, wh = (y0 - y1) * 0.45;
        ctx.fillStyle = o.lit ? '#E9B65C' : ink;
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = P.parch; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(4, w * 0.035);
      }
    }
    // roof: tiles as rows of gouged scallops
    ctx.beginPath(); L.tracePath(ctx, roof, true); ctx.fillStyle = ink; ctx.fill();
    ctx.save(); ctx.beginPath(); L.tracePath(ctx, roof, true); ctx.clip();
    ctx.strokeStyle = P.parch; ctx.lineWidth = 2;
    for (let y = base - h - roofH; y < base - h; y += 12) {
      ctx.beginPath();
      for (let xx = x - w * 0.1; xx < x + w * 1.1; xx += 16) { ctx.moveTo(xx, y); ctx.arc(xx + 8, y, 8, Math.PI, 0, true); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = 5;
    ctx.beginPath(); L.tracePath(ctx, body, true); ctx.stroke();
    ctx.restore();
  };
  wc.street = function street(ctx, T, o = {}) {
    const vx = o.vx || 540, vy = o.vy || 860;
    wc.paper(ctx);
    // sky: woodcut horizontal gouges
    wc.gouge(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: vy + 40 }, angle: 0, spacing: 9, width: 1.4, density: (x, y) => clamp(1 - y / (vy + 40)) * 0.8, seed: 11 });
    // cathedral spire at the vanishing point
    const sp = [[vx - 60, vy + 20], [vx - 60, vy - 260], [vx - 28, vy - 330], [vx, vy - 620], [vx + 28, vy - 330], [vx + 60, vy - 260], [vx + 60, vy + 20]];
    ctx.beginPath(); L.tracePath(ctx, sp, true); ctx.fillStyle = INK(); ctx.fill();
    ctx.strokeStyle = P.parch; ctx.lineWidth = 2;
    for (let y = vy - 300; y < vy; y += 26) { ctx.beginPath(); ctx.moveTo(vx - 44, y); ctx.lineTo(vx + 44, y); ctx.stroke(); }
    for (let y = vy - 560; y < vy - 330; y += 30) { ctx.beginPath(); ctx.arc(vx, y, 8, 0, TAU); ctx.stroke(); }
    // two rows of houses receding
    const rows = o.rows || 5;
    for (let side = -1; side <= 1; side += 2) for (let i = rows - 1; i >= 0; i--) {
      const k = Math.pow(0.68, i);
      const w = 300 * k, h = 520 * k;
      const near = side < 0 ? 0 : 1080;
      const x = side < 0 ? L.lerp(vx - 70, near - 40, k) - w : L.lerp(vx + 70, near + 40, k);
      const base = L.lerp(vy + 20, 1560, k);
      wc.house(ctx, x, base, w, h, i * 7 + (side > 0 ? 3 : 0), { lit: o.lit });
    }
    // cobbles
    const cob = [[0, 1560], [1080, 1560], [1080, 1920], [0, 1920]];
    ctx.beginPath(); L.tracePath(ctx, [[vx - 70, vy + 20], [vx + 70, vy + 20], [1120, 1560], [1120, 1920], [-40, 1920], [-40, 1560]], true); ctx.fillStyle = '#E2D4B4'; ctx.fill();
    ctx.strokeStyle = INK(); ctx.lineWidth = 2;
    for (let j = 0; j < 22; j++) {
      const k = Math.pow(j / 22, 1.8);
      const y = L.lerp(vy + 24, 1920, k), half = L.lerp(70, 760, k), sz = L.lerp(4, 46, k);
      for (let xx = vx - half; xx < vx + half; xx += sz * 1.4) { ctx.beginPath(); ctx.arc(xx + (j % 2) * sz * 0.7, y, sz * 0.5, Math.PI, 0); ctx.stroke(); }
    }
  };

  // a 16th-century dancer, stiff like a printed puppet. ph = dance phase (radians), o.still → standing
  wc.dancer = function dancer(ctx, x, y, s, ph, o = {}) {
    const ink = INK();
    const kind = o.kind || 'woman';
    const walk = !!o.walk;
    const still = !!o.still && !walk;
    const a = still ? 0 : Math.sin(ph) * (walk ? 0.55 : 1), b = still ? 0 : Math.cos(ph * 0.5);
    const hop = still ? 0 : walk ? Math.abs(Math.cos(ph)) * 10 : Math.max(0, Math.sin(ph * 2)) * 26;
    ctx.save();
    ctx.translate(x, y - hop * s);
    ctx.scale(s * (o.flip ? -1 : 1), s);
    ctx.rotate(still || walk ? a * 0.02 : a * 0.12);
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    const limb = (x0, y0, len, ang, w) => {
      const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
      ctx.strokeStyle = ink; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      return [x1, y1];
    };
    if (kind === 'woman') {
      // legs + shoes peeking under the skirt
      [[-26, a], [26, -a]].forEach(([lx, k]) => { const f = limb(lx, -150, 150, Math.PI + k * 0.5, 16); ctx.fillStyle = ink; ctx.fillRect(f[0] - 14, f[1] - 6, 34, 14); });
      // bell skirt with gouged folds, apron
      const sw = still ? 0 : a * 30;
      const skirt = [[-70, -430], [70, -430], [150 + sw, -110], [-150 + sw, -110]];
      ctx.beginPath(); L.tracePath(ctx, skirt, true); ctx.fillStyle = ink; ctx.fill();
      ctx.strokeStyle = P.parch; ctx.lineWidth = 3;
      for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(k * 15, -420); ctx.lineTo(k * 34 + sw, -118); ctx.stroke(); }
      const apron = [[-40, -420], [40, -420], [62 + sw * 0.6, -150], [-62 + sw * 0.6, -150]];
      ctx.beginPath(); L.tracePath(ctx, apron, true); ctx.fillStyle = '#EFE4CA'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
      wc.gouge(ctx, apron, { spacing: 7, width: 1.4, angle: 1.45, seed: 21 });
      // bodice
      const bod = [[-48, -560], [48, -560], [40, -420], [-40, -420]];
      ctx.beginPath(); L.tracePath(ctx, bod, true); ctx.fillStyle = ink; ctx.fill();
      ctx.strokeStyle = P.parch; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-14, -545 + k * 26); ctx.lineTo(14, -535 + k * 26); ctx.stroke(); }
    } else {
      // man / musician: hose legs, tunic, cap
      [[-24, a], [24, -a]].forEach(([lx, k]) => { const f = limb(lx, -260, 250, Math.PI + k * 0.6, 22); ctx.fillStyle = ink; ctx.fillRect(f[0] - 16, f[1] - 6, 40, 16); });
      const tun = [[-56, -560], [56, -560], [86, -250], [-86, -250]];
      ctx.beginPath(); L.tracePath(ctx, tun, true); ctx.fillStyle = '#EFE4CA'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
      wc.gouge(ctx, tun, { spacing: 6, width: 1.8, angle: 1.4, seed: 22, density: (xx) => clamp((xx + 10) / 80) });
      ctx.fillStyle = ink; ctx.fillRect(-60, -380, 120, 14);
    }
    // arms: raised and thrown in stamped poses (dancers) or holding an instrument (musicians)
    const sh = [-50, -548], sh2 = [50, -548];
    if (kind === 'piper') {
      limb(sh[0], sh[1], 90, 2.0, 14); limb(sh2[0], sh2[1], 90, -2.0, 14);
      ctx.save(); ctx.translate(0, -600); ctx.rotate(1.0 + a * 0.05); ctx.fillStyle = ink; ctx.fillRect(0, -6, 150, 12); ctx.restore();
    } else if (kind === 'drummer') {
      limb(sh[0], sh[1], 110, 2.4 + a * 0.4, 14); limb(sh2[0], sh2[1], 110, -2.4 + a * 0.4, 14);
      ctx.beginPath(); ctx.ellipse(0, -360, 70, 40, 0, 0, TAU); ctx.fillStyle = '#EFE4CA'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = ink; ctx.fillRect(-70, -360, 140, 70);
    } else if (walk || still) {
      // walking / standing: arms hang and swing against the stride
      const e1 = limb(sh[0], sh[1], 100, Math.PI + 0.12 - a * 0.45, 14); limb(e1[0], e1[1], 90, Math.PI + 0.05 - a * 0.6, 12);
      const e2 = limb(sh2[0], sh2[1], 100, Math.PI - 0.12 - a * 0.45, 14); limb(e2[0], e2[1], 90, Math.PI - 0.05 - a * 0.6, 12);
    } else {
      const e1 = limb(sh[0], sh[1], 100, -0.5 - 1.6 * (0.5 + 0.5 * a), 14); limb(e1[0], e1[1], 90, -0.2 - 2.2 * (0.5 + 0.5 * a), 12);
      const e2 = limb(sh2[0], sh2[1], 100, 0.5 + 1.6 * (0.5 - 0.5 * a), 14); limb(e2[0], e2[1], 90, 0.2 + 2.2 * (0.5 - 0.5 * b), 12);
    }
    // head: coif (woman) or cap (man), a simple woodcut profile — no cartoon face
    ctx.fillStyle = '#EFE4CA';
    ctx.beginPath(); ctx.ellipse(0, -612, 40, 50, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
    if (kind === 'woman') {
      ctx.beginPath(); ctx.ellipse(-4, -628, 52, 56, 0, Math.PI * 0.9, Math.PI * 2.1); ctx.fillStyle = '#F4ECD8'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-50, -610); ctx.quadraticCurveTo(-70, -560, -40, -545); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, -650, 48, 22, -0.1, Math.PI, 0); ctx.fillStyle = ink; ctx.fill();
    }
    // features: brow + eye stroke, nose line (woodcut economy)
    ctx.strokeStyle = ink; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(8, -622); ctx.lineTo(28, -620); ctx.moveTo(30, -612); ctx.lineTo(40, -596); ctx.lineTo(30, -592); ctx.moveTo(14, -576); ctx.lineTo(28, -578); ctx.stroke();
    wc.gouge(ctx, L.ellipsePts(0, -612, 40, 50, 30), { spacing: 6, width: 1.4, angle: 0.6, seed: 23, density: (xx) => clamp((-xx) / 30) });
    ctx.restore();
  };

  // Pip's window: the bright, soft world he lives in, cut into the print
  wc.porthole = function porthole(ctx, cx, cy, r, o = {}) {
    if (r < 2) return;
    if (!o.ring) {
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#E8FFF6');
      g.addColorStop(0.55, P.pipWorld);
      g.addColorStop(1, '#2E8C86');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      // soft bokeh dots of Pip's world
      for (let i = 0; i < 9; i++) { const a = i * 2.1, d = r * (0.3 + (i % 3) * 0.22); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.07, 0, TAU); ctx.fill(); }
      return;
    }
    ctx.save();
    ctx.strokeStyle = INK(); ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.stroke();
    ctx.strokeStyle = P.hcYellow; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.fillStyle = INK(); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6), 7, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  FILM.wc = wc;
})();

/*
 * FILM.sp — episode 4 SPACE kit (origin-film blueprint navy + curiosity yellow; per-pixel 3D bodies).
 *   space(ctx, T, o)                 deep-navy starfield plate (nebula haze, faint grid, twinkles) { zoom, ox, oy, dim }
 *   tex(kind)                        equirect textures: 'ns' neutron crust, 'sun', 'giant'
 *   star(ctx, kind, cx, cy, R, lon, o) emissive 3D sphere with limb darkening + corona { glow, glowR, tilt, flat }
 *   field(ctx, cx, cy, R, tilt, p, o) dipole magnetic field loops drawn as curiosity lines
 *   beams(ctx, cx, cy, ang, len, a)  twin pulsar beams (additive)
 *   burst(ctx, cx, cy, u, o)         supernova: flash, expanding shell, debris streaks
 *   ring(ctx, cx, cy, S, rx, ry, o)  ray-marched gold ring (torus), studio-lit
 *   spoon(ctx, x, y, s, rot)         engraved silver teaspoon
 *   everest(ctx, x, y, s)            engraved mountain (snow cap, hatched flank)
 *   balance(ctx, cx, cy, ang, o)     engraved balance scale → returns { L: [x,y], R: [x,y] } pan centres
 *   city(ctx, cx, cy, s, p)          blueprint city map (cached) drawn at scale s, reveal p
 *   pen(ctx, x, y, s, rot)           engraved ballpoint pen
 *   sparks(ctx, pts, a)              additive gold glints
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sp = {};
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const IV = '#F2E8D0', YEL = '#F2C230', NAVY = '#0D1630', DEEP = '#070C1E';

  // ------------------------------------------------------------ starfield plate (1300×2300, centred)
  sp.plate = () => L.cached('sp-plate-v3', () => {
    const W = 1300, H = 2300, c = cv(W, H), g = c.getContext('2d');
    const bg = g.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.45, H * 0.75);
    bg.addColorStop(0, '#16224A'); bg.addColorStop(0.5, NAVY); bg.addColorStop(1, '#03050C');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const r = L.rng(L.hash('sp-plate'));
    const neb = [['#8A6BD1', 0.10], ['#5EC8D8', 0.07], ['#D45F1E', 0.05], ['#8A6BD1', 0.08], ['#5EC8D8', 0.06]];
    neb.forEach(([col, a], i) => {
      const x = r() * W, y = r() * H, rr = 300 + r() * 500;
      const n = g.createRadialGradient(x, y, 0, x, y, rr);
      n.addColorStop(0, L.rgba(col, a)); n.addColorStop(1, L.rgba(col, 0));
      g.fillStyle = n; g.fillRect(0, 0, W, H);
    });
    g.strokeStyle = 'rgba(238,240,255,0.045)'; g.lineWidth = 1;
    for (let x = 10; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 10; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let i = 0; i < 1400; i++) {
      const x = r() * W, y = r() * H, s = Math.pow(r(), 3) * 1.8 + 0.4;
      g.fillStyle = `rgba(${230 + r() * 25},${232 + r() * 23},255,${0.25 + r() * 0.6})`;
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, s = 1.6 + r() * 1.6, col = r() > 0.7 ? '255,231,176' : '221,232,255', rl = 6 + r() * 8;
      const gg = g.createRadialGradient(x, y, 0, x, y, s * 6); gg.addColorStop(0, `rgba(${col},0.6)`); gg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gg; g.fillRect(x - s * 6, y - s * 6, s * 12, s * 12);
      g.strokeStyle = `rgba(${col},0.7)`; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x - s - rl, y); g.lineTo(x + s + rl, y); g.moveTo(x, y - s - rl); g.lineTo(x, y + s + rl); g.stroke();
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
    return c;
  });
  sp.space = function space(ctx, T, o = {}) {
    const z = o.zoom || 1, ox = o.ox || 0, oy = o.oy || 0;
    const pl = sp.plate();
    ctx.save();
    ctx.fillStyle = '#03050C'; ctx.fillRect(0, 0, 1080, 1920);
    ctx.translate(540 + ox, 960 + oy); ctx.scale(z, z); ctx.rotate(o.rot || 0);
    ctx.drawImage(pl, -650, -1150);
    ctx.restore();
    const r = L.rng(L.hash('sp-twinkle'));
    for (let i = 0; i < 24; i++) {
      const x = r() * 1080, y = r() * 1920, ph = r() * TAU, sp0 = 2 + r() * 3;
      const a = 0.5 + 0.5 * Math.sin(T * sp0 + ph);
      L.glowDot(ctx, x + ox * 0.3, y + oy * 0.3, 1.4, { color: '#EEF0FF', rays: 4, rayLen: 5 * a, glow: 5, intensity: a });
    }
    if (o.dim) { ctx.fillStyle = `rgba(3,5,12,${o.dim})`; ctx.fillRect(0, 0, 1080, 1920); }
  };

  // ------------------------------------------------------------ equirect textures
  sp.tex = (kind) => L.cached('sp-tex-' + kind, () => {
    const w = 512, h = 256, c = cv(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h, lat = (0.5 - v) * Math.PI;
      // seamless in u: sample noise on a circle
      const cx = Math.cos(u * TAU), sx = Math.sin(u * TAU);
      const n = (f, s) => L.noise2(cx * f + 9, sx * f + v * f * 2.2, s);
      let R, G, B;
      if (kind === 'ns') {
        const cell = Math.abs(n(6, 3)) * 0.6 + Math.abs(n(14, 5)) * 0.4;
        const crack = Math.pow(1 - Math.min(1, Math.abs(n(9, 7)) * 4), 6);
        const pole = Math.pow(Math.abs(Math.sin(lat)), 18);
        const k = 0.78 + 0.22 * cell - 0.35 * crack;
        R = 170 * k + 85 * pole; G = 205 * k + 50 * pole; B = 255 * Math.min(1, k + 0.1);
      } else if (kind === 'sun') {
        const gran = n(22, 2) * 0.5 + n(48, 3) * 0.3 + n(6, 4) * 0.4;
        const spot = clamp((n(3.5, 9) - 0.42) * 6) * (Math.abs(lat) < 0.6 ? 1 : 0);
        const k = 0.82 + 0.18 * gran - 0.55 * spot;
        R = 255 * Math.min(1, k + 0.12); G = 175 * k; B = 60 * k;
      } else {
        const cell = n(4, 11) * 0.6 + n(11, 12) * 0.4;
        const k = 0.75 + 0.25 * cell;
        R = 235 * k; G = 95 * k; B = 45 * k;
      }
      const i = (y * w + x) * 4;
      d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
  const GLOW = { ns: '#9FD0FF', sun: '#FFB347', giant: '#FF6A3A' };

  sp.star = function star(ctx, kind, cx, cy, R, lon0, o = {}) {
    if (R < 0.8) return;
    const glow = o.glow != null ? o.glow : 1;
    if (glow > 0) {
      const gr = R * (o.glowR || 2.6);
      const g0 = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, gr);
      const gc = o.glowColor || GLOW[kind];
      g0.addColorStop(0, L.rgba(gc, 0.55 * glow)); g0.addColorStop(0.35, L.rgba(gc, 0.18 * glow)); g0.addColorStop(1, L.rgba(gc, 0));
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g0; ctx.fillRect(cx - gr, cy - gr, 2 * gr, 2 * gr); ctx.restore();
    }
    if (R < 3) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); return; }
    const N = Math.max(16, Math.min(620, Math.round(2 * R)));
    const buf = L.cached('sp-buf-' + N + '-' + (o.slot || 0), () => cv(N, N));
    const g = buf.getContext('2d');
    const img = g.createImageData(N, N), d = img.data;
    const tex = sp.tex(kind);
    const tc = L.cached('sp-texdata-' + kind, () => tex.getContext('2d').getImageData(0, 0, tex.width, tex.height));
    const tw = tex.width, th = tex.height, td = tc.data;
    const tilt = o.tilt != null ? o.tilt : 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
    const limbP = kind === 'ns' ? 0.35 : 0.55;
    const heat = o.heat || 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const nx = (i + 0.5) / (N / 2) - 1, ny = (j + 0.5) / (N / 2) - 1;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const ty = ny * ct - nz * st, tz = ny * st + nz * ct;
      const lat = Math.asin(clamp(-ty, -1, 1));
      const lon = Math.atan2(nx, tz) + lon0;
      const u = ((lon / TAU) % 1 + 1) % 1, v = 0.5 - lat / Math.PI;
      const ti = ((Math.min(th - 1, Math.floor(v * th)) * tw) + Math.floor(u * tw)) * 4;
      const k = (1 - limbP) + limbP * Math.pow(nz, 0.7);
      const rim = Math.pow(1 - nz, 3) * 0.6;
      const p = (j * N + i) * 4;
      d[p] = Math.min(255, td[ti] * k + 255 * (rim + heat));
      d[p + 1] = Math.min(255, td[ti + 1] * k + 240 * (rim + heat));
      d[p + 2] = Math.min(255, td[ti + 2] * k + 230 * (rim + heat));
      d[p + 3] = 255 * clamp((1 - Math.sqrt(r2)) * N * 0.5);
    }
    g.putImageData(img, 0, 0);
    ctx.save();
    if (o.squash) { ctx.translate(cx, cy); ctx.scale(o.squash[0], o.squash[1]); ctx.translate(-cx, -cy); }
    ctx.drawImage(buf, cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
  };

  // dipole field loops r = Ls·R·sin²θ about an axis tilted by `tilt` (screen angle); p = draw-on
  sp.field = function field(ctx, cx, cy, R, tilt, p, o = {}) {
    if (p <= 0) return;
    const shells = o.shells || [1.7, 2.4, 3.4, 4.8];
    const ca = Math.cos(tilt), sa = Math.sin(tilt);
    const sq = o.sq != null ? o.sq : 1;
    shells.forEach((Ls, k) => {
      const th0 = Math.asin(Math.sqrt(1 / Ls));
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 60; i++) {
          const th = lerp(th0, Math.PI - th0, i / 60);
          const rr = Ls * R * Math.sin(th) * Math.sin(th);
          const ax = rr * Math.cos(th), px = side * rr * Math.sin(th) * sq;
          pts.push([cx + px * ca - ax * sa, cy + px * sa + ax * ca]);
        }
        FILM.hc.line(ctx, pts, { plate: 'blueprint', to: Math.max(0.02, clamp(p * 1.3 - k * 0.1)), width: o.width || 3.2, seed: 300 + k * 2 + (side > 0 ? 1 : 0), head: false, alpha: (o.alpha || 0.8) * (1 - k * 0.12), wobble: 0.5 });
      }
    });
  };

  sp.beams = function beams(ctx, cx, cy, ang, len, a, o = {}) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of [0, Math.PI]) {
      const d = ang + s;
      const tip = [cx + Math.cos(d) * len, cy + Math.sin(d) * len];
      const g = ctx.createLinearGradient(cx, cy, tip[0], tip[1]);
      g.addColorStop(0, `rgba(210,235,255,${0.85 * a})`); g.addColorStop(0.5, `rgba(120,190,255,${0.35 * a})`); g.addColorStop(1, 'rgba(120,190,255,0)');
      const w = o.spread || 0.13;
      for (const [ww, al] of [[w, 1], [w * 0.4, 1]]) {
        ctx.fillStyle = g; ctx.globalAlpha = al;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(d - ww) * len, cy + Math.sin(d - ww) * len);
        ctx.lineTo(cx + Math.cos(d + ww) * len, cy + Math.sin(d + ww) * len);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  };

  sp.burst = function burst(ctx, cx, cy, u, o = {}) {
    if (u <= 0 || u >= 1.6) return;
    const r = L.rng(L.hash('burst', o.seed || 1));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fl = Math.max(0, 1 - u * 3);
    if (fl > 0) { ctx.fillStyle = `rgba(255,250,235,${fl})`; ctx.fillRect(0, 0, 1080, 1920); }
    const R = (o.R || 900) * L.ease.outCubic(clamp(u));
    const fade = 1 - clamp((u - 0.5) / 1.1);
    // shell: many soft blobs on a ring
    for (let i = 0; i < 140; i++) {
      const a = r() * TAU, rr = R * (0.82 + r() * 0.3), s = 20 + r() * 60;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const col = r() > 0.5 ? '255,140,60' : r() > 0.5 ? '170,120,255' : '120,210,255';
      const gg = ctx.createRadialGradient(x, y, 0, x, y, s);
      gg.addColorStop(0, `rgba(${col},${0.5 * fade})`); gg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gg; ctx.fillRect(x - s, y - s, 2 * s, 2 * s);
    }
    ctx.strokeStyle = `rgba(255,230,180,${0.8 * fade})`; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const a = r() * TAU, r0 = R * (0.2 + r() * 0.5), r1 = r0 + 60 + r() * 160;
      ctx.strokeStyle = `rgba(255,${200 + r() * 55},${150 + r() * 100},${0.7 * fade})`;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ ray-marched gold ring
  sp.ring = function ring(ctx, cx, cy, S, rx, ry, o = {}) {
    const N = Math.min(520, Math.round(S));
    const buf = L.cached('sp-ringbuf-' + N, () => cv(N, N));
    const g = buf.getContext('2d');
    const img = g.createImageData(N, N), d = img.data;
    const Rm = 0.68, rm = 0.17, ext = 1.0;
    // world = Ry(ry)·Rx(rx)·obj ; obj torus in xz plane
    const cxr = Math.cos(rx), sxr = Math.sin(rx), cyr = Math.cos(ry), syr = Math.sin(ry);
    const toObj = (x, y, z) => { // inverse: Rx(-rx)·Ry(-ry)
      const x1 = x * cyr - z * syr, z1 = x * syr + z * cyr;
      return [x1, y * cxr + z1 * sxr, -y * sxr + z1 * cxr];
    };
    const toWorld = (x, y, z) => { // Ry(ry)·Rx(rx)
      const y1 = y * cxr - z * sxr, z1 = y * sxr + z * cxr;
      return [x * cyr + z1 * syr, y1, -x * syr + z1 * cyr];
    };
    const dO = toObj(0, 0, 1);
    const Lk = [-0.45, -0.7, -0.55], ln = Math.hypot(...Lk); const LL = Lk.map((v) => v / ln);
    const heat = o.heat || 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const px = ((i + 0.5) / N * 2 - 1) * ext, py = ((j + 0.5) / N * 2 - 1) * ext;
      if (px * px + py * py > (Rm + rm + 0.02) ** 2) continue;
      const oO = toObj(px, py, -2);
      let t = 1.0, hit = false, q;
      for (let k = 0; k < 48; k++) {
        const x = oO[0] + dO[0] * t, y = oO[1] + dO[1] * t, z = oO[2] + dO[2] * t;
        const a = Math.hypot(x, z) - Rm;
        const sd = Math.hypot(a, y) - rm;
        if (sd < 0.0015) { hit = true; q = [x, y, z]; break; }
        t += sd;
        if (t > 3.2) break;
      }
      if (!hit) continue;
      const hl = Math.hypot(q[0], q[2]) || 1e-6;
      let n = [q[0] - (q[0] / hl) * Rm, q[1], q[2] - (q[2] / hl) * Rm];
      const nl = Math.hypot(...n); n = n.map((v) => v / nl);
      const nw = toWorld(...n);
      // view dir (0,0,1); reflect
      const dn = nw[2];
      const rfl = [-2 * dn * nw[0], -2 * dn * nw[1], 1 - 2 * dn * nw[2]];
      const diff = Math.max(0, -(nw[0] * LL[0] + nw[1] * LL[1] + nw[2] * LL[2]));
      // studio environment: bright top softbox, dark floor, a side strip
      const up = clamp((-rfl[1] + 0.15) * 1.6);
      const strip = Math.pow(clamp(1 - Math.abs(rfl[0] - 0.55) * 4), 2) * 0.8;
      const box = Math.pow(Math.max(0, -(rfl[0] * LL[0] + rfl[1] * LL[1] + rfl[2] * LL[2])), 40) * 2.2;
      const env = 0.1 + 0.75 * up + strip + box;
      const fres = 0.65 + 0.35 * Math.pow(1 - Math.abs(dn), 3);
      const k = (0.18 + 0.35 * diff + env * fres) * (1 + heat);
      const p = (j * N + i) * 4;
      d[p] = Math.min(255, 255 * 0.98 * k + 40 * box);
      d[p + 1] = Math.min(255, 255 * 0.74 * k + 30 * box);
      d[p + 2] = Math.min(255, 255 * 0.30 * k + 20 * box);
      d[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    ctx.drawImage(buf, cx - S / 2, cy - S / 2, S, S);
  };

  // ------------------------------------------------------------ engraved props (ivory ink on navy)
  sp.spoon = function spoon(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    // handle (tapered), bowl at origin
    const handle = [[-40, -6], [-330, -16], [-352, -4], [-352, 10], [-330, 20], [-40, 8]];
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(handle, true, 4), true);
    let gr = ctx.createLinearGradient(0, -20, 0, 20);
    gr.addColorStop(0, '#F4F6FA'); gr.addColorStop(0.45, '#9AA3B2'); gr.addColorStop(1, '#4B5262');
    ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = '#05080F'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 92, 62, 0, 0, TAU);
    gr = ctx.createRadialGradient(-30, -24, 6, 0, 0, 100);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.4, '#B8C0CC'); gr.addColorStop(1, '#3B4150');
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 4, 74, 46, 0, 0, TAU);
    ctx.fillStyle = 'rgba(20,26,40,0.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(242,232,208,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  };

  sp.everest = function everest(ctx, x, y, s, o = {}) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    const m = [[-200, 0], [-150, -70], [-118, -60], [-70, -150], [-40, -135], [0, -230], [26, -196], [60, -170], [92, -110], [128, -96], [200, 0]];
    ctx.beginPath(); L.tracePath(ctx, m, true);
    const gr = ctx.createLinearGradient(-60, -230, 120, 0);
    gr.addColorStop(0, '#D9DEE8'); gr.addColorStop(1, '#5A6276');
    ctx.fillStyle = gr; ctx.fill();
    // shadow flank hatching
    L.hatch(ctx, [[0, -230], [26, -196], [60, -170], [92, -110], [128, -96], [200, 0], [-10, 0], [-30, -110]], { angle: -1.0, spacing: 6, width: 1.6, color: '#1A2238', alpha: 0.75, seed: 410 });
    // snow cap
    const snow = [[-70, -150], [-40, -135], [0, -230], [26, -196], [60, -170], [40, -150], [18, -165], [-5, -150], [-30, -128], [-52, -132]];
    ctx.beginPath(); L.tracePath(ctx, snow, true); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.beginPath(); L.tracePath(ctx, m, true);
    ctx.strokeStyle = '#05080F'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  };

  sp.balance = function balance(ctx, cx, cy, ang, o = {}) {
    const half = o.half || 330, drop = o.drop || 230;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const Lp = [cx - ca * half, cy - sa * half], Rp = [cx + ca * half, cy + sa * half];
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // post + base
    ctx.strokeStyle = IV; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + (o.post || 640)); ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(cx - 170, cy + (o.post || 640)); ctx.lineTo(cx + 170, cy + (o.post || 640)); ctx.stroke();
    // beam
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(Lp[0], Lp[1]); ctx.lineTo(Rp[0], Rp[1]); ctx.stroke();
    ctx.fillStyle = YEL; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, TAU); ctx.fill();
    ctx.strokeStyle = IV; ctx.lineWidth = 4; ctx.stroke();
    // needle
    ctx.strokeStyle = YEL; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * 110, cy - Math.cos(ang) * 110); ctx.stroke();
    // chains + pans
    const pans = {};
    for (const [k, p] of [['L', Lp], ['R', Rp]]) {
      const py = p[1] + drop;
      ctx.strokeStyle = L.rgba(IV, 0.85); ctx.lineWidth = 3;
      for (const dx of [-120, 0, 120]) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + dx, py); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(p[0] - 150, py); ctx.quadraticCurveTo(p[0], py + 70, p[0] + 150, py);
      ctx.closePath(); ctx.fillStyle = '#1B2A55'; ctx.fill();
      ctx.strokeStyle = IV; ctx.lineWidth = 6; ctx.stroke();
      pans[k] = [p[0], py];
    }
    ctx.restore();
    return pans;
  };

  sp.cityPlate = () => L.cached('sp-city-v1', () => {
    const S = 1400, c = cv(S, S), g = c.getContext('2d');
    const r = L.rng(L.hash('city'));
    g.fillStyle = '#0B1A3A'; g.fillRect(0, 0, S, S);
    // river
    g.fillStyle = 'rgba(94,200,216,0.28)';
    g.beginPath(); g.moveTo(0, 820); g.bezierCurveTo(400, 700, 700, 1050, 1400, 880); g.lineTo(1400, 960); g.bezierCurveTo(700, 1130, 400, 780, 0, 900); g.closePath(); g.fill();
    // blocks
    for (let y = 0; y < S; y += 46) for (let x = 0; x < S; x += 46) {
      if (r() < 0.12) continue;
      const w = 30 + r() * 10, h = 30 + r() * 10;
      g.fillStyle = `rgba(238,240,255,${0.06 + r() * 0.09})`; g.fillRect(x + 4, y + 4, w, h);
    }
    // avenues
    g.strokeStyle = 'rgba(242,232,208,0.55)'; g.lineWidth = 3;
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI; g.beginPath(); g.moveTo(700 - Math.cos(a) * 1000, 700 - Math.sin(a) * 1000); g.lineTo(700 + Math.cos(a) * 1000, 700 + Math.sin(a) * 1000); g.stroke(); }
    for (const rr of [220, 420, 610]) { g.beginPath(); g.arc(700, 700, rr, 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(242,232,208,0.18)'; g.lineWidth = 1.5;
    for (let x = 0; x < S; x += 46) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(S, x); g.stroke(); }
    // parks
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(120,200,140,0.18)'; g.beginPath(); g.ellipse(r() * S, r() * S, 40 + r() * 70, 30 + r() * 50, r() * 3, 0, TAU); g.fill(); }
    return c;
  });
  sp.city = function city(ctx, cx, cy, s, p = 1) {
    const pl = sp.cityPlate();
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.drawImage(pl, -700, -700);
    ctx.restore();
  };

  sp.pen = function pen(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    // vertical pen, tip at (0, 0) pointing down
    const body = [[-16, -40], [-16, -300], [16, -300], [16, -40]];
    ctx.beginPath(); L.tracePath(ctx, body, true);
    const gr = ctx.createLinearGradient(-16, 0, 16, 0);
    gr.addColorStop(0, '#9A3A1A'); gr.addColorStop(0.4, '#F07A3A'); gr.addColorStop(1, '#7A2A10');
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = '#05080F'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -40); ctx.lineTo(0, 0); ctx.lineTo(16, -40); ctx.closePath();
    ctx.fillStyle = '#C9CED8'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#05080F'; ctx.fillRect(-18, -322, 36, 26);
    ctx.fillRect(14, -300, 8, 90);
    ctx.restore();
  };

  sp.sparks = function sparks(ctx, pts, a = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, s] of pts) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
      g.addColorStop(0, `rgba(255,236,170,${a})`); g.addColorStop(0.3, `rgba(242,194,48,${0.6 * a})`); g.addColorStop(1, 'rgba(242,150,30,0)');
      ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
    }
    ctx.restore();
  };

  FILM.sp = sp;
})();

/*
 * FILM.df — episode 5 DARK FANTASY kit (Doré-style engraving on near-black; candle gold, crimson, bone; 3D nave).
 *   C                               palette
 *   bg(ctx, o)                      void background { top, bottom }
 *   fog(ctx, T, o)                  drifting fog bands { y, h, a, speed }
 *   grain(ctx, T, a)                film grain + vignette
 *   rain(ctx, T, o)                 slanted rain in depth
 *   flash(T, hits)                  lightning intensity at T for strike times
 *   candle(ctx, x, y, s, T, o)      candle + flickering flame + glow { out: 0..1 snuffed, smoke }
 *   glow(ctx, x, y, r, col, a)      additive glow
 *   skull(ctx, x, y, s, o)          engraved skull { ember 0..1, jaw 0..1, light 'below'|'left' }
 *   tiara(ctx, x, y, s)             papal triregnum
 *   corpse(ctx, x, y, s, T, o)      robed skeletal pope seated on a gothic throne { tilt, hands, cut }
 *   throne(ctx, x, y, s)
 *   figure(ctx, x, y, s, T, o)      robed silhouette { hat 'hood'|'mitre'|'cap', pose 'stand'|'point'|'walk'|'dig'|'torch', ph, rim }
 *   nave(ctx, T, cam, o)            3D perspective nave (columns, arches, floor, candles, end window) → returns project()
 *   glass(ctx, x, y, w, h, o)       stained-glass lancet window { fig: fn, tint, crack 0..1, glow }
 *   shaft(ctx, pts, col, a)         volumetric light shaft polygon
 *   rome(ctx, T, o)                 Rome skyline silhouettes with blood moon { px parallax }
 *   raven(ctx, x, y, s, ph)
 *   hand(ctx, x, y, s, o)           skeletal blessing hand { cut: [bool,bool,bool], ring }
 *   bone(ctx, x, y, s, rot, sq)     a finger bone (3D tumble via squash sq)
 *   water(ctx, T, o)                moonlit river in perspective { horizon, splash: [x, y, t] }
 *   stamp(ctx, str, x, y, size, k, o) Cinzel/Fraktur title slam (overshoot k = time since hit)
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const C = {
    black: '#07060A', void: '#100C16', crimson: '#A11F22', blood: '#5E0F12', ember: '#FF5A2A', candle: '#F3B04B',
    gold: '#D9A441', goldD: '#8A5E1A', bone: '#E9DEC4', boneS: '#9C8C70', boneD: '#4A3F30', ink: '#120D0A',
    stone: '#24202B', stoneL: '#4A4352', moon: '#DCE3F0', sky: '#1A1024', robeR: '#7E1518', robeW: '#D8D0C0',
  };
  const df = { C };
  const rgba = (hex, a) => L.rgba(hex, a);

  df.bg = (ctx, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, o.top || '#120C18'); g.addColorStop(1, o.bottom || '#050407');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
  };
  df.glow = (ctx, x, y, r, col, a = 1) => {
    if (a <= 0 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, 0.55 * a)); g.addColorStop(0.35, rgba(col, 0.18 * a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  };
  // fog: a cached soft-noise strip, scrolled
  const fogTex = () => L.cached('df-fog-v1', () => {
    const w = 540, h = 160, c = cv(w, h), g = c.getContext('2d');
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, cx = Math.cos(u * TAU), sx = Math.sin(u * TAU);
      const n = L.noise2(cx * 2 + 5, sx * 2 + y * 0.025, 3) * 0.6 + L.noise2(cx * 5, sx * 5 + y * 0.06, 4) * 0.4;
      const fall = Math.sin((y / h) * Math.PI);
      const v = clamp((n * 0.5 + 0.5) * fall * 1.4 - 0.25);
      const i = (y * w + x) * 4; d[i] = 200; d[i + 1] = 195; d[i + 2] = 215; d[i + 3] = 255 * v;
    }
    g.putImageData(img, 0, 0); return c;
  });
  df.fog = (ctx, T, o = {}) => {
    const t = fogTex(), y = o.y != null ? o.y : 1300, h = o.h || 500, a = o.a != null ? o.a : 0.35, sp = o.speed || 30;
    ctx.save(); ctx.globalAlpha = a;
    if (o.tint) { ctx.globalCompositeOperation = 'lighter'; }
    const W = 2160, off = ((T * sp) % W + W) % W;
    for (let k = -1; k <= 1; k++) ctx.drawImage(t, k * W - off, y - h / 2, W, h);
    ctx.restore();
  };
  const grainTex = () => L.cached('df-grain-v1', () => {
    const c = cv(256, 256), g = c.getContext('2d'), img = g.createImageData(256, 256), d = img.data;
    const r = L.rng(L.hash('grain'));
    for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 26; }
    g.putImageData(img, 0, 0); return c;
  });
  df.grain = (ctx, T, a = 1) => {
    const f = Math.floor(T * 24);
    const r = L.rng(f * 7919 + 13);
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor(r() * 256), oy = Math.floor(r() * 256);
    ctx.translate(-ox, -oy);
    for (let y = 0; y < 1920 + 256; y += 256) for (let x = 0; x < 1080 + 256; x += 256) ctx.drawImage(grainTex(), x, y);
    ctx.restore();
    const v = ctx.createRadialGradient(540, 900, 500, 540, 900, 1250);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.75 * a})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
  };
  df.rain = (ctx, T, o = {}) => {
    const r = L.rng(L.hash('df-rain', o.seed || 1));
    const n = o.n || 260, a = o.a != null ? o.a : 0.35;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const z = 0.3 + r() * 0.7, sp = 2600 * z, len = 70 * z;
      const x0 = r() * 1300 - 100, ph = r();
      const y = ((ph * 2200 + T * sp) % 2200) - 140;
      const x = x0 + (y + 140) * 0.18;
      ctx.strokeStyle = `rgba(190,200,225,${a * z})`; ctx.lineWidth = 1 + 1.6 * z;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.18, y + len); ctx.stroke();
    }
    ctx.restore();
  };
  df.flash = (T, hits) => {
    let f = 0;
    for (const h of hits) {
      const d = T - h;
      if (d < 0 || d > 0.6) continue;
      f = Math.max(f, Math.exp(-d * 9) * (d < 0.05 ? 1 : 0.7) + (d > 0.12 && d < 0.2 ? 0.5 : 0));
    }
    return clamp(f);
  };

  // ------------------------------------------------------------ candle
  df.candle = (ctx, x, y, s, T, o = {}) => {
    const out = clamp(o.out || 0), seed = o.seed || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // wax body with drips (3D cylinder shading)
    const g = ctx.createLinearGradient(-22, 0, 22, 0);
    g.addColorStop(0, '#6E5E44'); g.addColorStop(0.35, '#EFE3C4'); g.addColorStop(1, '#5A4C38');
    ctx.fillStyle = g; ctx.fillRect(-22, 0, 44, o.h || 160);
    ctx.fillStyle = '#EFE3C4';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, TAU); ctx.fill();
    const r = L.rng(L.hash('drip', seed));
    for (let k = 0; k < 3; k++) { const dx = -16 + r() * 32, dl = 20 + r() * 50; ctx.fillStyle = '#E6D8B6'; ctx.beginPath(); ctx.ellipse(dx, dl / 2, 5, dl / 2, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
    const fl = 1 + 0.12 * L.noise1(T * 9, seed) + 0.06 * Math.sin(T * 31 + seed);
    const sway = 4 * L.noise1(T * 3, seed + 5);
    if (out < 1) {
      ctx.globalAlpha = 1 - out;
      df.glow(ctx, 0, -50, 260 * fl, C.candle, 1 - out);
      const fg = ctx.createRadialGradient(0, -38, 2, 0, -46, 34);
      fg.addColorStop(0, '#FFFFFF'); fg.addColorStop(0.3, '#FFE6A0'); fg.addColorStop(0.7, '#F39A2B'); fg.addColorStop(1, 'rgba(240,120,30,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-12, -22);
      ctx.quadraticCurveTo(-14, -48 * fl, sway, -78 * fl);
      ctx.quadraticCurveTo(14, -48 * fl, 12, -22);
      ctx.quadraticCurveTo(0, -10, -12, -22); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (o.smoke && out > 0) {
      const st = o.smoke;
      for (let k = 0; k < 14; k++) {
        const u = k / 14, yy = -20 - u * 420 * clamp(st * 1.4), xx = Math.sin(u * 9 + T * 2) * 30 * u;
        ctx.fillStyle = `rgba(200,195,210,${0.18 * (1 - u) * clamp(2 - st)})`;
        ctx.beginPath(); ctx.arc(xx, yy, 8 + u * 30, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ the skull (engraved)
  const SK = (() => {
    const arc = (cx, cy, rx, ry, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
    const cran = arc(0, -18, 104, 120, Math.PI * 0.93, Math.PI * 2.07, 40)
      .concat([[98, 30], [92, 52], [84, 66], [66, 74], [54, 92], [46, 104], [-46, 104], [-54, 92], [-66, 74], [-84, 66], [-92, 52], [-98, 30]]);
    const jaw = [[-74, 70], [-70, 104], [-60, 132], [-30, 150], [0, 154], [30, 150], [60, 132], [70, 104], [74, 70], [58, 82], [48, 116], [-48, 116], [-58, 82]];
    const eye = (sx) => [[sx * 14, 2], [sx * 26, -10], [sx * 50, -12], [sx * 66, 0], [sx * 68, 22], [sx * 58, 40], [sx * 36, 44], [sx * 18, 34]];
    const nose = [[0, 48], [-14, 72], [-10, 84], [0, 80], [10, 84], [14, 72]];
    return { cran, jaw, eyeL: eye(-1), eyeR: eye(1), nose };
  })();
  df.skull = (ctx, x, y, s, o = {}) => {
    const jaw = (o.jaw || 0) * 26;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(o.rot || 0);
    const lx = o.light === 'left' ? -110 : 50, ly = o.light === 'left' ? -40 : 150;
    const boneFill = (pts) => {
      ctx.beginPath(); L.tracePath(ctx, L.smoothPts(pts, true, 3), true);
      const g = ctx.createRadialGradient(lx, ly, 10, lx * 0.3, ly * 0.3, 270);
      g.addColorStop(0, '#FFF0CC'); g.addColorStop(0.3, '#D9C7A0'); g.addColorStop(0.62, '#7A6A52'); g.addColorStop(1, '#1E1812');
      ctx.fillStyle = g; ctx.fill();
    };
    const tooth = (k, y0, h, up) => {
      const hh = h * (0.8 + 0.25 * Math.abs(Math.sin(k * 2.7))), w = 9.5;
      ctx.beginPath();
      if (up) { ctx.moveTo(k * 11 + 1, y0); ctx.lineTo(k * 11 + 1 + w, y0); ctx.lineTo(k * 11 + w - 0.5, y0 + hh); ctx.quadraticCurveTo(k * 11 + 1 + w / 2, y0 + hh + 3, k * 11 + 2, y0 + hh); }
      else { ctx.moveTo(k * 11 + 1, y0 + h); ctx.lineTo(k * 11 + 1 + w, y0 + h); ctx.lineTo(k * 11 + w - 0.5, y0 + h - hh); ctx.quadraticCurveTo(k * 11 + 1 + w / 2, y0 + h - hh - 3, k * 11 + 2, y0 + h - hh); }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, up ? '#CDBE9C' : '#8C7C60'); g.addColorStop(1, up ? '#8C7C60' : '#CDBE9C');
      ctx.fillStyle = Math.abs(k + 0.5) > 3 ? '#5A4C3A' : g; ctx.fill(); ctx.strokeStyle = '#1A120C'; ctx.lineWidth = 1.6; ctx.stroke();
    };
    // jaw (behind)
    ctx.save(); ctx.translate(0, jaw);
    boneFill(SK.jaw);
    L.hatch(ctx, SK.jaw, { angle: -0.6, spacing: 4.5, width: 1.3, color: '#120C08', alpha: 0.6, seed: 61, density: (px, py) => clamp((py - 100) / 50) + clamp((Math.abs(px) - 40) / 40) * 0.6 });
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(SK.jaw, true, 3), true); ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.stroke();
    for (let k = -4; k <= 3; k++) tooth(k, 104, 13, false);
    ctx.restore();
    if (jaw > 2) { ctx.fillStyle = '#050304'; ctx.fillRect(-46, 104, 92, jaw + 2); }
    boneFill(SK.cran);
    ctx.save(); ctx.beginPath(); L.tracePath(ctx, L.smoothPts(SK.cran, true, 3), true); ctx.clip();
    // hollow cheeks, temples and the brow's shadow
    const dark = (cx, cy, rx, ry, a) => { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, `rgba(10,6,4,${a})`); g.addColorStop(1, 'rgba(10,6,4,0)'); ctx.save(); ctx.translate(cx, cy); ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry)); ctx.translate(-cx, -cy); ctx.fillStyle = g; ctx.fillRect(cx - Math.max(rx, ry), cy - Math.max(rx, ry), 2 * Math.max(rx, ry), 2 * Math.max(rx, ry)); ctx.restore(); };
    dark(-80, 80, 40, 30, 0.85); dark(80, 80, 40, 30, 0.85); dark(-96, -10, 36, 60, 0.7); dark(96, -10, 36, 60, 0.7);
    dark(0, -40, 120, 40, 0.35); dark(0, -150, 120, 70, 0.55);
    L.hatch(ctx, SK.cran, { angle: -0.5, spacing: 4.5, width: 1.4, color: '#120C08', alpha: 0.75, seed: 62, density: (px, py) => clamp((Math.abs(px) - 45) / 55) * 0.9 + clamp((-py - 70) / 60) * 0.7 });
    L.hatch(ctx, SK.cran, { angle: 0.9, spacing: 6, width: 1.1, color: '#120C08', alpha: 0.5, seed: 63, density: (px, py) => clamp((Math.abs(px) - 65) / 40) + clamp((-py - 110) / 40) * 0.6 });
    ctx.restore();
    for (let k = -4; k <= 3; k++) tooth(k, 92, 14, true);
    // sockets + nose (deep, with a bone rim)
    for (const e of [SK.eyeL, SK.eyeR, SK.nose]) {
      ctx.beginPath(); L.tracePath(ctx, L.smoothPts(e, true, 3), true);
      ctx.fillStyle = '#030202'; ctx.fill(); ctx.strokeStyle = '#2A2016'; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,236,200,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    L.inkPath(ctx, [[-30, -120], [-20, -96], [-34, -80], [-24, -60]], { width: 2.2, color: '#120C08', seed: 64 });
    L.inkPath(ctx, [[60, -100], [48, -84], [56, -66]], { width: 1.8, color: '#120C08', seed: 65 });
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(SK.cran, true, 3), true); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    // crimson rim light on the right edge
    if (o.rim !== false) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(200,40,30,0.55)'; ctx.lineWidth = 5;
      ctx.beginPath(); L.tracePath(ctx, L.smoothPts(SK.cran, true, 3).filter(([px, py]) => px > 30 && py < 70), false); ctx.stroke(); ctx.restore();
    }
    const em = o.ember || 0;
    if (em > 0) for (const sx of [-1, 1]) { df.glow(ctx, sx * 42, 20, 80 * em, C.ember, em); ctx.fillStyle = rgba('#FFD2A0', em); ctx.beginPath(); ctx.arc(sx * 42, 20, 5.5 * em, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  df.tiara = (ctx, x, y, s, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // beehive body (origin = bottom centre)
    const body = [[-100, 0], [-112, -60], [-108, -120], [-92, -170], [-60, -208], [0, -226], [60, -208], [92, -170], [108, -120], [112, -60], [100, 0]];
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(body, true, 4), true);
    const g = ctx.createRadialGradient(-25, 10, 10, 0, -40, 290);
    g.addColorStop(0, '#F2EBDD'); g.addColorStop(0.35, '#A49C90'); g.addColorStop(0.7, '#3E3A38'); g.addColorStop(1, '#121012');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    // three crowns
    for (const [cy, w] of [[-14, 114], [-84, 114], [-152, 100]]) {
      const gg = ctx.createLinearGradient(-w, 0, w, 0);
      gg.addColorStop(0, C.goldD); gg.addColorStop(0.35, '#FFE08A'); gg.addColorStop(0.7, C.gold); gg.addColorStop(1, '#5A3A0C');
      ctx.fillStyle = gg; ctx.fillRect(-w, cy - 14, 2 * w, 22);
      const rowDark = cy < -100 ? 0.62 : cy < -40 ? 0.35 : 0;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(k * 26 - 10, cy - 12); ctx.lineTo(k * 26, cy - 34); ctx.lineTo(k * 26 + 10, cy - 12); ctx.fill();
        ctx.fillStyle = k % 2 ? '#B0202A' : '#2E56C8'; ctx.beginPath(); ctx.arc(k * 26, cy - 2, 4.5, 0, TAU); ctx.fill(); ctx.fillStyle = gg;
      }
      if (rowDark) { ctx.fillStyle = `rgba(10,7,9,${rowDark})`; ctx.fillRect(-w, cy - 40, 2 * w, 50); }
    }
    const sh = ctx.createLinearGradient(0, 0, 0, -260); sh.addColorStop(0, 'rgba(8,5,8,0)'); sh.addColorStop(0.45, 'rgba(8,5,8,0.5)'); sh.addColorStop(1, `rgba(8,5,8,${o.dark != null ? o.dark : 0.92})`);
    ctx.fillStyle = sh; ctx.fillRect(-120, -240, 240, 242);
    L.hatch(ctx, body, { angle: 0.4, spacing: 5, width: 1.2, color: '#000', alpha: 0.45, seed: 66, density: (px) => clamp((Math.abs(px) - 40) / 50) });
    ctx.restore();
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(body, true, 4), true); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
    // orb + cross
    ctx.fillStyle = '#6A4A16'; ctx.beginPath(); ctx.arc(0, -236, 13, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-4, -290, 8, 46); ctx.fillRect(-16, -276, 32, 8);
    ctx.restore();
  };

  df.throne = (ctx, x, y, s) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const back = [[-210, 40], [-210, -520], [-150, -640], [-80, -700], [0, -780], [80, -700], [150, -640], [210, -520], [210, 40]];
    ctx.beginPath(); L.tracePath(ctx, back, true);
    const g = ctx.createLinearGradient(-210, 0, 210, 0); g.addColorStop(0, '#1A0E08'); g.addColorStop(0.5, '#3E2414'); g.addColorStop(1, '#140A06');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.stroke();
    // inner crimson panel
    const inner = back.map(([px, py]) => [px * 0.78, py * 0.86 - 20]);
    ctx.beginPath(); L.tracePath(ctx, inner, true); ctx.fillStyle = '#4A0C10'; ctx.fill();
    L.hatch(ctx, inner, { angle: 0.6, spacing: 8, width: 1.2, color: '#000', alpha: 0.5, seed: 70 });
    ctx.strokeStyle = rgba(C.gold, 0.7); ctx.lineWidth = 3; ctx.stroke();
    // finials
    for (const fx of [-210, 210]) { ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(fx - 18, -520); ctx.lineTo(fx, -600); ctx.lineTo(fx + 18, -520); ctx.fill(); }
    // seat + arms
    ctx.fillStyle = '#2A170C'; ctx.fillRect(-260, 40, 520, 70); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.strokeRect(-260, 40, 520, 70);
    for (const ax of [-260, 200]) { ctx.fillStyle = '#2A170C'; ctx.fillRect(ax, -150, 60, 190); ctx.strokeRect(ax, -150, 60, 190); }
    ctx.restore();
  };

  df.hand = (ctx, x, y, s, o = {}) => {
    // skeletal right hand in benediction: thumb, index, middle raised; ring + little folded
    const cut = o.cut || [false, false, false];
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(o.rot || 0);
    ctx.lineCap = 'round';
    const boneSeg = (pts, w) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        ctx.strokeStyle = C.ink; ctx.lineWidth = w + 7; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        const g = ctx.createLinearGradient(ax - w, ay, ax + w, ay); g.addColorStop(0, C.boneS); g.addColorStop(0.4, '#FFF4DA'); g.addColorStop(1, C.boneS);
        ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = C.bone; ctx.beginPath(); ctx.arc(bx, by, w * 0.62, 0, TAU); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
      }
    };
    // radius/ulna + carpals
    boneSeg([[-30, 420], [-18, 150]], 30); boneSeg([[30, 420], [20, 150]], 26);
    ctx.fillStyle = C.bone; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    for (const [cx, cy] of [[-40, 120], [-10, 112], [20, 116], [48, 124], [-26, 92], [6, 86], [36, 92]]) { ctx.beginPath(); ctx.ellipse(cx, cy, 17, 14, 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
    // folded ring + little fingers
    boneSeg([[48, 80], [70, 10], [62, -26], [40, -10]], 18);
    boneSeg([[72, 92], [100, 34], [92, 0], [72, 14]], 15);
    // raised: thumb, index, middle (cut[i] removes the finger above the knuckle)
    const F = [[[-56, 100], [-110, 30], [-128, -40], [-130, -96]], [[-26, 70], [-36, -60], [-40, -150], [-42, -220]], [[8, 66], [8, -80], [8, -180], [8, -260]]];
    F.forEach((p, i) => { if (cut[i]) { boneSeg(p.slice(0, 2), 20); ctx.fillStyle = '#3A0A0C'; ctx.beginPath(); ctx.arc(p[1][0], p[1][1], 9, 0, TAU); ctx.fill(); } else boneSeg(p, i === 0 ? 21 : 19); });
    if (o.ring && !cut[2]) { ctx.strokeStyle = C.gold; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(8, -60, 18, 9, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = '#B0202A'; ctx.beginPath(); ctx.arc(8, -68, 9, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  df.F_TIPS = [[[-56, 100], [-110, 30], [-128, -40], [-130, -96]], [[-26, 70], [-36, -60], [-40, -150], [-42, -220]], [[8, 66], [8, -80], [8, -180], [8, -260]]];
  df.bone = (ctx, x, y, s, rot, sq, len = 160) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * Math.max(0.15, Math.abs(sq)), s);
    const g = ctx.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, C.boneS); g.addColorStop(0.4, '#FFF4DA'); g.addColorStop(1, C.boneD);
    ctx.fillStyle = g; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) { const y0 = -len / 2 + k * len / 3; ctx.beginPath(); ctx.ellipse(0, y0 + len / 6, 15, len / 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  };

  // ------------------------------------------------------------ robed corpse on the throne
  df.corpse = (ctx, x, y, s, T, o = {}) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    df.throne(ctx, 0, 0, 1);
    const robeK = o.robe != null ? clamp(o.robe) : 1;
    const tilt = o.tilt != null ? o.tilt : 0.18 + 0.03 * Math.sin(T * 0.8);
    // neck vertebrae (drawn first, the collar overlaps)
    for (let k = 0; k < 4; k++) { const vy = -470 + k * 34, vx = Math.sin(tilt) * (3 - k) * 14; ctx.fillStyle = k % 2 ? '#B8A888' : '#D8C8A6'; ctx.beginPath(); ctx.ellipse(vx, vy, 30 - k * 2, 15, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke(); }
    if (robeK > 0) {
      ctx.save(); ctx.globalAlpha = robeK; ctx.translate(0, -120 * (1 - L.ease.outCubic(robeK)));
      // knees + alb under the cope
      const alb = [[-150, 20], [-190, 330], [190, 330], [150, 20]];
      ctx.beginPath(); L.tracePath(ctx, alb, true);
      { const ag = ctx.createLinearGradient(0, 20, 0, 330); ag.addColorStop(0, '#B8AE9A'); ag.addColorStop(1, '#2A2620'); ctx.fillStyle = ag; } ctx.fill();
      for (let k = -3; k <= 3; k++) { ctx.strokeStyle = 'rgba(30,26,20,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(k * 40, 40); ctx.quadraticCurveTo(k * 48 + 10, 180, k * 54, 330); ctx.stroke(); }
      for (const kx of [-80, 80]) { const kg = ctx.createRadialGradient(kx - 10, 30, 5, kx, 40, 110); kg.addColorStop(0, 'rgba(255,245,225,0.35)'); kg.addColorStop(1, 'rgba(255,245,225,0)'); ctx.fillStyle = kg; ctx.fillRect(kx - 110, -70, 220, 220); }
      // bony feet below the hem
      // the cope: a heavy bell from the shoulders, folds catching the candle from the left
      const cope = [[-70, -430], [-150, -410], [-205, -330], [-235, -120], [-265, 90], [-170, 130], [-70, -10], [0, -40], [70, -10], [170, 130], [265, 90], [235, -120], [205, -330], [150, -410], [70, -430]];
      const cp = L.smoothPts(cope, true, 4);
      ctx.beginPath(); L.tracePath(ctx, cp, true);
      const g = ctx.createLinearGradient(-265, 0, 265, 0);
      g.addColorStop(0, '#8A1A1C'); g.addColorStop(0.3, '#B82A28'); g.addColorStop(0.55, '#6A1014'); g.addColorStop(1, '#1E0406');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      for (let k = 0; k < 9; k++) {
        const fx = -230 + k * 56, sway = Math.sin(k * 1.7) * 20;
        const fg = ctx.createLinearGradient(fx - 26, 0, fx + 26, 0);
        fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.45, 'rgba(10,0,2,0.55)'); fg.addColorStop(0.6, 'rgba(255,140,110,0.22)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(fx - 26 + sway * 0.3, -420); ctx.quadraticCurveTo(fx + sway, -120, fx - 30 + sway * 1.4, 140); ctx.lineTo(fx + 30 + sway * 1.4, 140); ctx.quadraticCurveTo(fx + 26 + sway, -120, fx + 26 + sway * 0.3, -420); ctx.fill();
      }
      L.hatch(ctx, cope, { angle: 1.3, spacing: 6, width: 1.3, color: '#120002', alpha: 0.55, seed: 81, density: (px) => clamp((px + 40) / 220) });
      ctx.restore();
      ctx.strokeStyle = '#2A0406'; ctx.lineWidth = 5; ctx.beginPath(); L.tracePath(ctx, cp, true); ctx.stroke();
      // gold orphreys down the front edges
      for (const sd of [-1, 1]) {
        ctx.strokeStyle = C.gold; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(sd * 70, -425); ctx.quadraticCurveTo(sd * 62, -200, sd * 72, -12); ctx.stroke();
        ctx.strokeStyle = '#6A4410'; ctx.lineWidth = 2; ctx.stroke();
        for (let k = 0; k < 9; k++) { ctx.fillStyle = k % 2 ? '#A11F22' : '#F2D27A'; ctx.beginPath(); ctx.arc(sd * (68 - k * 0.3), -400 + k * 44, 5, 0, TAU); ctx.fill(); }
      }
      // pallium
      ctx.strokeStyle = '#E6DECE'; ctx.lineWidth = 20;
      ctx.beginPath(); ctx.moveTo(-130, -390); ctx.quadraticCurveTo(-40, -330, 0, -270); ctx.quadraticCurveTo(40, -330, 130, -390); ctx.moveTo(0, -270); ctx.lineTo(0, -40); ctx.stroke();
      ctx.fillStyle = '#111';
      for (const [cx, cy] of [[-80, -350], [80, -350], [0, -180], [0, -80]]) { ctx.fillRect(cx - 3, cy - 9, 6, 18); ctx.fillRect(cx - 8, cy - 3, 16, 6); }
      ctx.restore();
    } else {
      ctx.strokeStyle = C.bone; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, -380); ctx.lineTo(0, 40); ctx.stroke();
      for (let k = 0; k < 6; k++) { ctx.lineWidth = 9; ctx.beginPath(); ctx.ellipse(0, -330 + k * 46, 120 - k * 6, 30, 0, 0.1, Math.PI - 0.1); ctx.stroke(); }
    }
    // sleeves to the armrests + skeletal hands
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#5A0C10';
      ctx.beginPath(); ctx.moveTo(sd * 180, -360); ctx.quadraticCurveTo(sd * 260, -250, sd * 250, -140); ctx.lineTo(sd * 200, -120); ctx.quadraticCurveTo(sd * 200, -260, sd * 150, -330); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sd * 250, -140); ctx.lineTo(sd * 200, -120); ctx.stroke();
    }
    const hk = o.cut || [false, false, false];
    df.hand(ctx, -232, -70, 0.3, { rot: 0.25, cut: [false, false, false] });
    df.hand(ctx, 232, -70, 0.3, { rot: -0.25, cut: hk, ring: true });
    // the head: ray-marched skull + tiara, slumped
    df.skull3d(ctx, Math.sin(tilt) * 60, -600, 260, { roll: -tilt, yaw: o.yaw != null ? o.yaw : 0.12 * Math.sin(T * 0.6), pitch: 0.12, jaw: o.jaw || 0.25, ember: o.ember || 0, slot: 7 });
    ctx.restore();
  };

  // ------------------------------------------------------------ medieval silhouettes (no faces), rim-lit
  df.figure = (ctx, x, y, s, T, o = {}) => {
    const pose = o.pose || 'stand', ph = o.ph != null ? o.ph : T * 7, hat = o.hat || 'hood';
    const rim = o.rim || C.candle, fill = o.fill || '#0A0709';
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.flip ? -1 : 1), s);
    const walk = pose === 'walk' || pose === 'torch';
    const sw = walk ? Math.sin(ph) : 0, bob = walk ? Math.abs(Math.cos(ph)) * 8 : 0;
    const tremble = o.tremble ? Math.sin(T * 47) * 3 * o.tremble : 0;
    ctx.translate(tremble, -bob);
    const lean = pose === 'dig' ? 0.45 + 0.15 * Math.sin(ph) : pose === 'point' ? -0.08 : 0;
    ctx.rotate(lean * (pose === 'dig' ? 1 : 1));
    // legs/feet under the hem
    ctx.fillStyle = fill;
    if (walk) for (const sd of [-1, 1]) { const k = sd * sw; ctx.beginPath(); ctx.ellipse(k * 34 + sd * 14, 0, 26, 10, 0, 0, TAU); ctx.fill(); }
    // robe (hem sways with the stride)
    const hem = 70 + Math.abs(sw) * 16;
    const robe = [[-hem, -6], [-58 - sw * 10, -220], [-52, -380], [-30, -420], [30, -420], [52, -380], [58 - sw * 10, -220], [hem, -6]];
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(robe, true, 3), true); ctx.fill();
    // head + hat
    ctx.beginPath();
    if (hat === 'hood') { ctx.moveTo(-46, -400); ctx.quadraticCurveTo(-50, -520, 0, -540); ctx.quadraticCurveTo(50, -520, 46, -400); ctx.closePath(); }
    else if (hat === 'mitre') { ctx.arc(0, -455, 36, 0, TAU); ctx.moveTo(-38, -480); ctx.lineTo(-30, -580); ctx.lineTo(0, -620); ctx.lineTo(30, -580); ctx.lineTo(38, -480); ctx.closePath(); }
    else { ctx.arc(0, -455, 36, 0, TAU); ctx.moveTo(-44, -470); ctx.lineTo(44, -470); ctx.lineTo(30, -500); ctx.lineTo(-30, -500); ctx.closePath(); }
    ctx.fill();
    // arms
    ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.lineWidth = 34;
    const arm = (sx, ex, ey, hx, hy) => { ctx.beginPath(); ctx.moveTo(sx, -380); ctx.quadraticCurveTo(ex, ey, hx, hy); ctx.stroke(); };
    const tips = {};
    if (pose === 'point') { arm(40, 150, -420, 260, -470); arm(-40, -70, -260, -50, -180); tips.hand = [260, -470]; }
    else if (pose === 'torch') { const a = Math.sin(ph) * 10; arm(40, 90, -470, 70 + a, -560); arm(-40, -70 - sw * 20, -260, -60 - sw * 30, -190); tips.torch = [70 + a, -600]; }
    else if (pose === 'dig') { arm(40, 110, -300, 150, -200); arm(-40, 60, -300, 120, -150); tips.shovel = [150, -200]; }
    else if (pose === 'pray') { arm(40, 50, -300, 8, -330); arm(-40, -50, -300, -8, -330); }
    else { arm(40, 70, -260, 52 + sw * 30, -180); arm(-40, -70, -260, -52 - sw * 30, -180); }
    // rim light along one side
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(rim, 0.7 * (o.rimA != null ? o.rimA : 1)); ctx.lineWidth = 3;
    ctx.beginPath(); L.tracePath(ctx, L.smoothPts(robe, true, 3).filter(([px]) => px > 0), false); ctx.stroke();
    ctx.restore();
    // world-space tips
    const tw = {};
    const ca = Math.cos(lean), sa = Math.sin(lean), fx = s * (o.flip ? -1 : 1);
    for (const k in tips) { const [px, py] = tips[k]; tw[k] = [x + tremble * s + (px * ca - py * sa) * fx, y - bob * s + (px * sa + py * ca) * s]; }
    return tw;
  };
  df.torch = (ctx, x, y, s, T, seed) => {
    df.glow(ctx, x, y - 20 * s, 150 * s, C.candle, 0.55);
    df.glow(ctx, x, y - 20 * s, 60 * s, C.ember, 0.6);
    const fl = 1 + 0.2 * L.noise1(T * 11, seed);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const g = ctx.createRadialGradient(0, -30, 4, 0, -40, 70);
    g.addColorStop(0, '#FFF6D0'); g.addColorStop(0.35, '#FFB040'); g.addColorStop(1, 'rgba(220,60,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-30, -60 * fl, 6 * Math.sin(T * 7 + seed), -120 * fl); ctx.quadraticCurveTo(30, -60 * fl, 26, 0); ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------ 3D nave
  df.nave = (ctx, T, cam, o = {}) => {
    const f = cam.f || 900, cx = 540, cy = cam.cy || 980, cz = cam.z || 0, camY = cam.y || 0;
    const P3 = (x, y, z) => { const zz = z - cz; return zz < 30 ? null : [cx + (x - (cam.x || 0)) * f / zz, cy + (y - camY) * f / zz, zz]; };
    // back wall + window glow
    df.bg(ctx, { top: '#0E0A12', bottom: '#060407' });
    const W = 520, Hc = 1500, Z0 = 400, DZ = 520, N = 9, ZE = Z0 + DZ * N;
    const ew = P3(0, -700, ZE);
    if (ew) {
      df.glow(ctx, ew[0], ew[1], 1200 * f / ew[2] * 1.4, '#6A4AC0', 0.7);
      ctx.save(); const sc = f / ew[2]; ctx.translate(ew[0], ew[1]); ctx.scale(sc, sc);
      ctx.fillStyle = '#5A3AA8'; ctx.beginPath(); ctx.moveTo(-160, 300); ctx.lineTo(-160, -200); ctx.quadraticCurveTo(0, -460, 160, -200); ctx.lineTo(160, 300); ctx.fill();
      ctx.strokeStyle = '#120C18'; ctx.lineWidth = 14; ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(0, -320); ctx.moveTo(-160, 40); ctx.lineTo(160, 40); ctx.stroke();
      ctx.restore();
    }
    // floor tiles
    for (let k = N * 2; k >= 0; k--) {
      const z0 = Z0 - 300 + k * DZ / 2, z1 = z0 + DZ / 2;
      for (let i = -4; i < 4; i++) {
        const a = P3(i * 130, 300, z0), b = P3((i + 1) * 130, 300, z0), c = P3((i + 1) * 130, 300, z1), d = P3(i * 130, 300, z1);
        if (!a || !d) continue;
        const dark = (i + k) % 2 === 0;
        const fogk = clamp(z0 / ZE);
        ctx.fillStyle = dark ? `rgb(${18 + 10 * (1 - fogk)},${14 + 8 * (1 - fogk)},${20 + 8 * (1 - fogk)})` : `rgb(${46 - 20 * fogk},${40 - 18 * fogk},${50 - 20 * fogk})`;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
      }
    }
    // columns + arches, far to near
    for (let k = N; k >= 0; k--) {
      const z = Z0 + k * DZ;
      const fogk = clamp((z - cz) / (ZE - cz));
      for (const side of [-1, 1]) {
        const base = P3(side * W, 300, z), top = P3(side * W, -Hc + 300, z);
        if (!base || !top) continue;
        const r = 70 * f / base[2];
        const g = ctx.createLinearGradient(base[0] - r, 0, base[0] + r, 0);
        const lit = side < 0 ? 1 : 0.6;
        g.addColorStop(0, `rgba(10,8,12,1)`); g.addColorStop(side < 0 ? 0.7 : 0.3, `rgba(${Math.round(110 * lit * (1 - fogk) + 20)},${Math.round(84 * lit * (1 - fogk) + 16)},${Math.round(60 * lit * (1 - fogk) + 22)},1)`); g.addColorStop(1, 'rgba(8,6,10,1)');
        ctx.fillStyle = g; ctx.fillRect(base[0] - r, top[1], 2 * r, base[1] - top[1]);
        // arch to the next column
        const nz = z + DZ, nt = P3(side * W, -Hc + 300, nz);
        if (nt) {
          ctx.strokeStyle = `rgba(${60 * (1 - fogk) + 14},${46 * (1 - fogk) + 12},${40 * (1 - fogk) + 16},1)`; ctx.lineWidth = Math.max(2, 40 * f / base[2]);
          ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.quadraticCurveTo((top[0] + nt[0]) / 2, Math.min(top[1], nt[1]) - 160 * f / base[2], nt[0], nt[1]); ctx.stroke();
        }
        // candle stand on each column
        const cpos = P3(side * (W - 110), 120, z - 60);
        if (cpos && o.candles !== false) df.candle(ctx, cpos[0], cpos[1], 0.9 * f / cpos[2], T, { seed: k * 2 + (side > 0 ? 1 : 0), h: 120 });
      }
    }
    // depth fog
    const fg = ctx.createLinearGradient(0, cy - 500, 0, cy + 300);
    fg.addColorStop(0, 'rgba(60,46,80,0)'); fg.addColorStop(0.6, 'rgba(60,46,80,0.18)'); fg.addColorStop(1, 'rgba(20,14,26,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, 1080, 1920);
    return P3;
  };

  // ------------------------------------------------------------ stained glass
  df.glassCells = (w, h, seed) => L.cached('df-cells-' + seed + '-' + w + 'x' + h, () => {
    const r = L.rng(L.hash('cells', seed)), pts = [];
    for (let i = 0; i < 46; i++) pts.push([r() * w - w / 2, r() * h - h]);
    return pts;
  });
  df.lancet = (ctx, x, y, w, h) => {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w * 0.55);
    ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.15); ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.55);
    ctx.lineTo(x + w / 2, y); ctx.closePath();
  };
  df.glass = (ctx, x, y, w, h, o = {}) => {
    const tint = o.tint || ['#2B4BB8', '#5B2A8A', '#1E5A8A', '#3A2A7A'];
    const glow = o.glow != null ? o.glow : 1;
    ctx.save();
    df.glow(ctx, x, y - h / 2, Math.max(w, h) * 0.8, tint[0], 0.5 * glow);
    df.lancet(ctx, x, y, w, h); ctx.save(); ctx.clip();
    // cells: nearest-seed colouring via a coarse raster
    const pts = df.glassCells(w, h, o.seed || 1);
    const step = 12;
    for (let yy = -h - w * 0.2; yy < 0; yy += step) for (let xx = -w / 2; xx < w / 2; xx += step) {
      let bi = 0, bd = 1e9;
      for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - xx) ** 2 + (pts[i][1] - yy) ** 2; if (d < bd) { bd = d; bi = i; } }
      const c = tint[bi % tint.length];
      const shade = 0.75 + 0.25 * Math.sin(bi * 1.7);
      ctx.fillStyle = c; ctx.globalAlpha = shade * glow; ctx.fillRect(x + xx, y + yy, step + 1, step + 1);
    }
    ctx.globalAlpha = 1;
    if (o.fig) o.fig(ctx, x, y, w, h);
    // lead came between cells (approximate: draw voronoi-ish edges by connecting near seeds)
    ctx.strokeStyle = '#0A0709'; ctx.lineWidth = 6;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < w * 0.28) { const mx = (pts[i][0] + pts[j][0]) / 2, my = (pts[i][1] + pts[j][1]) / 2, nx = -(pts[j][1] - pts[i][1]) / d, ny = (pts[j][0] - pts[i][0]) / d; ctx.beginPath(); ctx.moveTo(x + mx - nx * d * 0.35, y + my - ny * d * 0.35); ctx.lineTo(x + mx + nx * d * 0.35, y + my + ny * d * 0.35); ctx.stroke(); }
    }
    // cracks
    const ck = o.crack || 0;
    if (ck > 0) {
      const r = L.rng(L.hash('crack', o.seed || 1));
      ctx.strokeStyle = 'rgba(255,250,240,0.95)'; ctx.lineWidth = 3;
      const o0 = [o.cx || 0, o.cy || -h * 0.45];
      for (let b = 0; b < 9; b++) {
        let px = o0[0], py = o0[1], a = (b / 9) * TAU + r();
        ctx.beginPath(); ctx.moveTo(x + px, y + py);
        const n = Math.floor(8 * ck);
        for (let k = 0; k < n; k++) { a += (r() - 0.5) * 0.8; px += Math.cos(a) * 34; py += Math.sin(a) * 34; ctx.lineTo(x + px, y + py); }
        ctx.stroke();
      }
    }
    ctx.restore();
    df.lancet(ctx, x, y, w, h); ctx.strokeStyle = '#1A1418'; ctx.lineWidth = 22; ctx.stroke();
    ctx.strokeStyle = rgba(C.gold, 0.5); ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
  };
  df.shaft = (ctx, pts, col, a) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
    g.addColorStop(0, rgba(col, 0.35 * a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------ Rome skyline, ravens
  df.rome = (ctx, T, o = {}) => {
    const px = o.px || 0;
    const sky = ctx.createLinearGradient(0, 0, 0, 1400);
    sky.addColorStop(0, '#0B0710'); sky.addColorStop(0.55, '#2A0C14'); sky.addColorStop(1, '#4A1418');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 1080, 1920);
    // blood moon
    const m = o.moon || [700, 520], mr = o.moonR || 190;
    df.glow(ctx, m[0], m[1], mr * 3.2, '#C8322A', 0.9);
    const mg = ctx.createRadialGradient(m[0] - mr * 0.3, m[1] - mr * 0.3, 10, m[0], m[1], mr);
    mg.addColorStop(0, '#F2A07A'); mg.addColorStop(0.6, '#B8422E'); mg.addColorStop(1, '#5E1612');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(m[0], m[1], mr, 0, TAU); ctx.fill();
    L.hatch(ctx, L.ellipsePts(m[0], m[1], mr, mr, 40), { angle: -0.7, spacing: 6, width: 1.2, color: '#3A0A08', alpha: 0.35, seed: 90, density: (x, y) => clamp(((x - m[0]) + (y - m[1])) / mr) });
    // three skyline layers
    const layer = (seed, base, hgt, col, par) => {
      const r = L.rng(L.hash('rome', seed));
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-200, 1920);
      let x = -200 - ((px * par) % 400);
      while (x < 1300) {
        const kind = r(), w = 60 + r() * 120, h = hgt * (0.4 + r() * 0.6);
        ctx.lineTo(x, base);
        if (kind < 0.2) { ctx.lineTo(x, base - h); ctx.lineTo(x + w * 0.5, base - h - 50); ctx.lineTo(x + w, base - h); } // gabled
        else if (kind < 0.33) { ctx.lineTo(x, base - h * 0.6); ctx.quadraticCurveTo(x + w / 2, base - h * 1.25, x + w, base - h * 0.6); } // dome
        else if (kind < 0.48) { ctx.lineTo(x + w * 0.3, base); ctx.lineTo(x + w * 0.3, base - h * 1.6); ctx.lineTo(x + w * 0.45, base - h * 1.75); ctx.lineTo(x + w * 0.6, base - h * 1.6); ctx.lineTo(x + w * 0.6, base); } // tower
        else { ctx.lineTo(x, base - h * 0.7); ctx.lineTo(x + w, base - h * 0.7); }
        ctx.lineTo(x + w, base); x += w;
      }
      ctx.lineTo(1300, 1920); ctx.closePath(); ctx.fill();
      // lit windows
      const r2 = L.rng(L.hash('win', seed));
      for (let i = 0; i < 26; i++) { const wx = r2() * 1080, wy = base - r2() * hgt * 0.5; if (r2() < 0.5) continue; ctx.fillStyle = rgba(C.candle, 0.5 + 0.4 * Math.sin(T * 3 + i)); ctx.fillRect(wx, wy, 6, 9); }
    };
    layer(1, 1180, 260, '#1A0A10', 0.2);
    df.fog(ctx, T, { y: 1200, h: 300, a: 0.25, speed: 20 });
    layer(2, 1400, 330, '#100609', 0.5);
    layer(3, 1640, 380, '#060305', 1.0);
  };
  df.raven = (ctx, x, y, s, ph) => {
    const f = Math.sin(ph);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#050304';
    ctx.beginPath(); ctx.ellipse(0, 4, 9, 20, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -16, 8, 0, TAU); ctx.fill();
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(sd * 40, -30 * f - 18, sd * 86, -50 * f);
      ctx.lineTo(sd * 70, -38 * f + 10); ctx.lineTo(sd * 54, -26 * f + 14);
      ctx.quadraticCurveTo(sd * 30, 8, 0, 8); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(0, 38); ctx.lineTo(8, 20); ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------ river
  df.water = (ctx, T, o = {}) => {
    const hz = o.horizon || 900;
    const g = ctx.createLinearGradient(0, hz, 0, 1920);
    g.addColorStop(0, '#2A1A2A'); g.addColorStop(0.2, '#120C16'); g.addColorStop(1, '#050407');
    ctx.fillStyle = g; ctx.fillRect(0, hz, 1080, 1920 - hz);
    // moon path
    const mx = o.moonX || 640;
    for (let k = 0; k < 70; k++) {
      const z = 1 + k * 0.6, y = hz + 900 / z * 0 + (1920 - hz) * (1 - 1 / (1 + k * 0.08));
      const w = (30 + k * 4) * (0.6 + 0.4 * Math.sin(T * 2.3 + k * 1.7));
      ctx.fillStyle = `rgba(232,${150 + k},${120 + k},${0.5 * (1 - k / 80)})`;
      ctx.fillRect(mx - w / 2 + Math.sin(T * 1.7 + k) * 10, y, w, 2 + k * 0.08);
    }
    // perspective ripple lines
    ctx.strokeStyle = 'rgba(200,170,190,0.12)'; ctx.lineWidth = 1.5;
    for (let k = 1; k < 40; k++) {
      const y = hz + (1920 - hz) * (1 - 1 / (1 + k * 0.09)) + ((T * 30) % 20) * k * 0.02;
      ctx.beginPath(); for (let x = 0; x <= 1080; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02 + T * 2 + k) * (1 + k * 0.1)); ctx.stroke();
    }
    if (o.splash) {
      const [sx, sy, st] = o.splash;
      if (st > 0 && st < 1.6) {
        for (let k = 0; k < 4; k++) { const rr = (st - k * 0.18) * 360; if (rr <= 0) continue; ctx.strokeStyle = `rgba(230,220,235,${0.6 * (1 - st / 1.6)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, rr, rr * 0.18, 0, 0, TAU); ctx.stroke(); }
        const r = L.rng(L.hash('splash'));
        for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.15 + r() * 0.7), v = 400 + r() * 700; const px = sx + Math.cos(a) * v * st * 0.6, py = sy + Math.sin(a) * v * st + 1100 * st * st; if (py > sy + 10) continue; ctx.fillStyle = `rgba(230,225,240,${1 - st / 1.2})`; ctx.beginPath(); ctx.arc(px, py, 4 + r() * 4, 0, TAU); ctx.fill(); }
      }
    }
  };

  // ------------------------------------------------------------ title slam
  df.stamp = (ctx, str, x, y, size, d, o = {}) => {
    if (d < 0) return;
    const k = 1 + 0.6 * Math.pow(1 - clamp(d / 0.13), 2);
    const a = clamp(d / 0.04);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(o.rot || 0); ctx.globalAlpha = a * (o.alpha != null ? o.alpha : 1);
    const fam = o.fraktur ? '"UnifrakturMaguntia", serif' : '"Cinzel", "Fraunces", serif';
    const wt = o.fraktur ? 400 : (o.weight || 900);
    ctx.shadowColor = o.glowCol || 'rgba(255,60,30,0.75)'; ctx.shadowBlur = o.blur != null ? o.blur : 34;
    L.text(ctx, str, 0, 0, { size, family: fam, weight: wt, align: 'center', baseline: 'middle', color: o.color || C.crimson, tracking: o.tracking || '0.06em' });
    ctx.shadowBlur = 0;
    if (o.stroke) { ctx.font = `${wt} ${size}px ${fam}`; ctx.lineWidth = 2; ctx.strokeStyle = o.stroke; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(str, 0, 0); }
    ctx.restore();
  };

  FILM.df = df;
})();

/*
 * FILM.df.skull3d — a ray-marched 3D skull (+ papal triregnum) with candle key light, crimson rim, ambient occlusion
 * and an engraving-hatch shader (so it sits in the Doré print world). Pure function of its inputs.
 *   skull3d(ctx, cx, cy, H, o) → { proj(x,y,z) → [sx,sy] }   (cx,cy) = screen position of the skull origin,
 *   H = skull height (chin→crown) in px. o: { yaw, pitch, roll, jaw 0..1, tiara (true), res (0.34), ember 0..1,
 *   slot, key (light dir), hatch (true), warm 1 }
 */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const sqrt = Math.sqrt, abs = Math.abs;
  const ell = (x, y, z, rx, ry, rz) => {
    const a = x / rx, b = y / ry, c = z / rz, k0 = sqrt(a * a + b * b + c * c);
    const a2 = a / rx, b2 = b / ry, c2 = c / rz, k1 = sqrt(a2 * a2 + b2 * b2 + c2 * c2) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  };
  const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k); return b + (a - b) * h - k * h * (1 - h); };
  const ssub = (d1, d2, k) => { const h = clamp(0.5 - (0.5 * (d2 + d1)) / k); return d2 + (-d1 - d2) * h + k * h * (1 - h); };
  let JA = 0, JC = 1, JS = 0, TI = true; // per-call globals (jaw angle cos/sin, tiara on)
  let MAT = 0; // 0 bone, 1 tiara, 2 lower jaw
  const BANDS = [0.1, 0.56, 1.0];
  function tiaraR(h) {
    const u = clamp(h / 1.55);
    let r = 0.9 * sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) * (1 - 0.14 * u);
    for (const b of BANDS) { const d = (h - b) / 0.06; r += 0.03 * Math.exp(-d * d); }
    return r;
  }
  function sdf(x, y, z, wantMat) {
    const ax = abs(x);
    // cranium, brow, face, cheekbones (zygomatic arches), maxilla
    let d = ell(x, y - 0.36, z + 0.12, 0.84, 0.84, 1.0);
    d = smin(d, ell(x, y - 0.06, z - 0.5, 0.66, 0.16, 0.3), 0.12);              // brow ridge
    d = smin(d, ell(x, y + 0.3, z - 0.3, 0.6, 0.5, 0.5), 0.22);                  // mid-face
    d = smin(d, ell(ax - 0.52, y + 0.3, z - 0.3, 0.2, 0.12, 0.34), 0.1);        // cheekbones
    d = smin(d, ell(ax - 0.66, y + 0.36, z - 0.0, 0.07, 0.07, 0.36), 0.08);     // arches
    d = smin(d, ell(x, y + 0.68, z - 0.38, 0.4, 0.24, 0.34), 0.14);             // maxilla
    d = smin(d, ell(x, y + 0.86, z - 0.38, 0.33, 0.11, 0.3), 0.04);             // upper teeth
    d = ssub(ell(ax - 0.9, y + 0.08, z - 0.0, 0.2, 0.32, 0.42), d, 0.14);       // temples
    d = ssub(ell(ax - 0.29, y + 0.16, z - 0.62, 0.22, 0.2, 0.42), d, 0.04);     // sockets (deep)
    d = ssub(ell(ax - 0.29, y + 0.18, z - 0.3, 0.16, 0.14, 0.3), d, 0.04);      // socket depth
    d = ssub(ell(x, y + 0.48, z - 0.74, 0.085, 0.15, 0.26), d, 0.03);            // nasal cavity
    d = ssub(ell(ax - 0.06, y + 0.56, z - 0.74, 0.07, 0.06, 0.2), d, 0.02);
    let mat = 0;
    if (y < -0.25) {
      const jy = y + 0.52, jz = z + 0.1;
      const qy = jy * JC + jz * JS - 0.52, qz = -jy * JS + jz * JC - 0.1;
      const aqx = abs(x);
      let m = ell(x, qy + 1.06, qz - 0.24, 0.4 - 0.0, 0.17, 0.36);
      m = ssub(ell(x, qy + 0.98, qz - 0.12, 0.3, 0.24, 0.3), m, 0.05);
      m = smin(m, ell(x, qy + 1.17, qz - 0.48, 0.17, 0.1, 0.12), 0.08);           // chin
      m = smin(m, ell(aqx - 0.42, qy + 0.8, qz + 0.0, 0.08, 0.3, 0.14), 0.1);     // rami
      m = smin(m, ell(x, qy + 0.95, qz - 0.36, 0.31, 0.09, 0.28), 0.04);          // lower teeth
      if (m < d) { d = m; mat = 2; }
    }
    if (TI && y > 0.5) {
      const h = y - 0.66, rho = Math.hypot(x, z + 0.1);
      let t = Math.max((rho - tiaraR(clamp(h, 0, 1.55))) * 0.7, -h, h - 1.55);
      t = Math.min(t, ell(x, y - 2.26, z + 0.1, 0.1, 0.1, 0.1));
      if (t < d) { d = t; mat = 1; }
    }
    if (wantMat) MAT = mat;
    return d;
  }
  df.skull3d = function skull3d(ctx, cx, cy, H, o = {}) {
    TI = o.tiara !== false;
    const ja = clamp(o.jaw || 0) * 0.42; JA = ja; JC = Math.cos(ja); JS = Math.sin(ja);
    const unit = H / 2.45;
    const X0 = -1.45, X1 = 1.45, Y0 = -1.55, Y1 = TI ? 2.45 : 1.4;
    const res = o.res || 0.4;
    const mt = ctx.getTransform(), scr = Math.hypot(mt.a, mt.b) || 1;
    const NW = Math.max(40, Math.round((X1 - X0) * unit * res * scr)), NH = Math.max(40, Math.round((Y1 - Y0) * unit * res * scr));
    const buf = L.cached('df-s3d-' + NW + 'x' + NH + '-' + (o.slot || 0), () => { const c = document.createElement('canvas'); c.width = NW; c.height = NH; return c; });
    const g = buf.getContext('2d');
    const img = g.createImageData(NW, NH), dd = img.data;
    // rotation R = Ry(yaw) · Rx(pitch) · Rz(roll); object = Rᵀ · world
    const cy_ = Math.cos(o.yaw || 0), sy_ = Math.sin(o.yaw || 0), cp = Math.cos(o.pitch || 0), spp = Math.sin(o.pitch || 0), cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
    // R columns
    const R = [
      cy_ * cr + sy_ * spp * sr, -cy_ * sr + sy_ * spp * cr, sy_ * cp,
      cp * sr, cp * cr, -spp,
      -sy_ * cr + cy_ * spp * sr, sy_ * sr + cy_ * spp * cr, cy_ * cp,
    ];
    const toObj = (x, y, z) => [R[0] * x + R[3] * y + R[6] * z, R[1] * x + R[4] * y + R[7] * z, R[2] * x + R[5] * y + R[8] * z];
    const toWorld = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
    const CAM = [0, 0.4, 7];
    const ro = toObj(CAM[0], CAM[1], CAM[2]);
    const key = o.key || [0.45, -0.6, 0.66]; { const l = Math.hypot(...key); key[0] /= l; key[1] /= l; key[2] /= l; }
    const fill = [-0.7, 0.35, 0.6], rim = [0.75, 0.25, -0.62];
    const warm = o.warm != null ? o.warm : 1;
    const hatch = o.hatch !== false;
    const BC = [0, 0.55, 0], BR = TI ? 2.15 : 1.75;
    for (let j = 0; j < NH; j++) {
      const wy = Y1 - ((j + 0.5) / NH) * (Y1 - Y0);
      for (let i = 0; i < NW; i++) {
        const wx = X0 + ((i + 0.5) / NW) * (X1 - X0);
        let dx = wx - CAM[0], dy = wy - CAM[1], dz = -CAM[2];
        const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
        const rd = toObj(dx, dy, dz);
        // bounding sphere (object space)
        const ox = ro[0] - BC[0], oy = ro[1] - BC[1], oz = ro[2] - BC[2];
        const bb = ox * rd[0] + oy * rd[1] + oz * rd[2], cc = ox * ox + oy * oy + oz * oz - BR * BR, disc = bb * bb - cc;
        if (disc < 0) continue;
        let t = Math.max(0, -bb - sqrt(disc)); const tmax = -bb + sqrt(disc);
        let hit = false, px = 0, py = 0, pz = 0;
        for (let k = 0; k < 80; k++) {
          px = ro[0] + rd[0] * t; py = ro[1] + rd[1] * t; pz = ro[2] + rd[2] * t;
          const d = sdf(px, py, pz, false);
          if (d < 0.0025) { hit = true; break; }
          t += d * 0.9;
          if (t > tmax) break;
        }
        if (!hit) continue;
        sdf(px, py, pz, true); const mat = MAT;
        // normal (tetrahedron)
        const e = 0.004;
        const a1 = sdf(px + e, py - e, pz - e), a2 = sdf(px - e, py - e, pz + e), a3 = sdf(px - e, py + e, pz - e), a4 = sdf(px + e, py + e, pz + e);
        let nx = a1 - a2 - a3 + a4, ny = -a1 - a2 + a3 + a4, nz = -a1 + a2 - a3 + a4;
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        let ao = 0;
        for (let s = 1; s <= 3; s++) { const hh = 0.07 * s; ao += (hh - sdf(px + nx * hh, py + ny * hh, pz + nz * hh)) / (1 << s); }
        ao = clamp(1 - 3.2 * ao);
        const W = toWorld(nx, ny, nz);
        const vdot = -(W[0] * dx + W[1] * dy + W[2] * dz);
        const diff = Math.max(0, W[0] * key[0] + W[1] * key[1] + W[2] * key[2]);
        const fd = Math.max(0, W[0] * fill[0] + W[1] * fill[1] + W[2] * fill[2]);
        const rm = Math.pow(Math.max(0, W[0] * rim[0] + W[1] * rim[1] + W[2] * rim[2]), 2) + Math.pow(1 - clamp(vdot), 4) * 0.6;
        // reflection for spec
        const rx = dx + 2 * vdot * W[0], ry = dy + 2 * vdot * W[1], rz = dz + 2 * vdot * W[2];
        const sp = Math.pow(Math.max(0, rx * key[0] + ry * key[1] + rz * key[2]), mat === 1 ? 24 : 10);
        let ar, ag, ab, spk;
        if (mat === 1) {
          const h = py - 0.66;
          const band = BANDS.some((b) => abs(h - b) < 0.065) || py > 2.12;
          if (band) {
            const ang = Math.atan2(px, pz + 0.1), cell = ang * 8 / Math.PI, du = ((cell % 1) + 1) % 1 - 0.5;
            let jewel = false; for (const bb of BANDS) { const dv = h - bb, duu = du * (Math.PI / 8) * 0.9; if (duu * duu + dv * dv < 0.0011) jewel = true; }
            if (jewel) { const red = (Math.floor(cell + 40)) % 2; ar = red ? 0.75 : 0.1; ag = red ? 0.05 : 0.22; ab = red ? 0.06 : 0.8; spk = 2.2; }
            else { ar = 0.95; ag = 0.72; ab = 0.36; spk = 1.5; }
          } else { ar = 0.8; ag = 0.8; ab = 0.78; spk = 0.45; }
        } else {
          const n = 0.9 + 0.1 * Math.sin(px * 13 + Math.sin(py * 9)) * Math.sin(pz * 11 + px * 3);
          const dirt = 0.82 + 0.18 * Math.sin(px * 7.3 + Math.sin(pz * 5.1) * 2) * Math.sin(py * 6.1 + px * 2.3);
          ar = 0.8 * n * dirt; ag = 0.74 * n * dirt; ab = 0.62 * n * dirt; spk = 0.2;
          // teeth grooves
          const ty = mat === 2 ? null : py;
          if ((mat !== 2 && py < -0.76 && py > -0.98 && pz > 0.25) || (mat === 2 && pz > 0.2 && py < -0.85 && py > -1.06)) {
            const ang = Math.atan2(px, pz - 0.0), gv = abs(((ang * 14 / Math.PI) % 1 + 1) % 1 - 0.5);
            if (gv > 0.38) { ar *= 0.2; ag *= 0.18; ab *= 0.16; }
          }
          ar = ar * (0.35 + 0.65 * ao); ag = ag * (0.33 + 0.67 * ao); ab = ab * (0.3 + 0.7 * ao);
        }
        let r = ar * (diff * 1.5 * warm * 1.0 + fd * 0.22 * 0.6 + 0.04) * ao + rm * 0.7 * 0.62 + sp * spk * 0.9;
        let gg = ag * (diff * 1.5 * warm * 0.84 + fd * 0.22 * 0.66 + 0.035) * ao + rm * 0.7 * 0.1 + sp * spk * 0.85;
        let b = ab * (diff * 1.5 * warm * 0.64 + fd * 0.22 * 0.95 + 0.05) * ao + rm * 0.7 * 0.08 + sp * spk * 0.75;
        if (hatch) {
          const lum = 0.3 * r + 0.55 * gg + 0.15 * b;
          const l1 = ((i * 0.72 + j * 0.69) % 3.2) / 3.2, l2 = ((i * 0.72 - j * 0.69 + 1000) % 3.6) / 3.6;
          if (lum < 0.45 && l1 < (0.45 - lum) * 1.4) { r *= 0.45; gg *= 0.43; b *= 0.42; }
          if (lum < 0.2 && l2 < (0.2 - lum) * 2.4) { r *= 0.5; gg *= 0.48; b *= 0.46; }
        }
        const p = (j * NW + i) * 4;
        dd[p] = 255 * Math.min(1, r / (1 + r * 0.25)); dd[p + 1] = 255 * Math.min(1, gg / (1 + gg * 0.25)); dd[p + 2] = 255 * Math.min(1, b / (1 + b * 0.25)); dd[p + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const left = cx + X0 * unit, top = cy - Y1 * unit;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, left, top, (X1 - X0) * unit, (Y1 - Y0) * unit);
    ctx.restore();
    const proj = (x, y, z) => { const w = toWorld(x, y, z); const tt = CAM[2] / (CAM[2] - w[2]); return [cx + w[0] * tt * unit, cy - (CAM[1] + (w[1] - CAM[1]) * tt) * unit]; };
    // ember eyes
    const em = o.ember || 0;
    if (em > 0) for (const sx of [-0.29, 0.29]) { const [ex, ey] = proj(sx, -0.16, 0.5); df.glow(ctx, ex, ey, unit * 0.2 * em, df.C.ember, 0.8 * em); df.glow(ctx, ex, ey, unit * 0.06, '#FFC890', em); ctx.fillStyle = L.rgba('#FFE6C0', em); ctx.beginPath(); ctx.arc(ex, ey, unit * 0.018, 0, Math.PI * 2); ctx.fill(); }
    // tiara cross
    if (TI) { const [qx, qy] = proj(0, 2.35, -0.1), [q2x, q2y] = proj(0, 2.7, -0.1); const s = unit * 0.035; ctx.strokeStyle = '#C8932E'; ctx.lineWidth = s * 2; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(q2x, q2y); ctx.moveTo(qx - s * 4, qy + (q2y - qy) * 0.62); ctx.lineTo(qx + s * 4, qy + (q2y - qy) * 0.62); ctx.stroke(); }
    return { proj, unit };
  };
})();
