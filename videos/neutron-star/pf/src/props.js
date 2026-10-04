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
