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
