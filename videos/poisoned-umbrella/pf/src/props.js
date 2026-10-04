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

  // a coated man, walking on twos. (x, y) = feet, s = height in px / 600
  mk.man = function man(ctx, x, y, s, T, o = {}) {
    const f = o.walk === false ? 0 : Math.floor(T * 12 + 1e-6) % 4;
    const sw = [0.35, 0.1, -0.35, -0.1][f] * (o.walk === false ? 0 : 1);
    const ink = o.ink || '#07090F';
    const rim = o.rim != null ? o.rim : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (o.flip) ctx.scale(-1, 1);
    // legs
    [sw, -sw].forEach((a, i) => {
      ctx.save();
      ctx.translate(i ? 18 : -18, -270);
      ctx.rotate(a);
      ctx.fillStyle = i ? '#15161C' : '#0E0F14';
      ctx.fillRect(-20, 0, 40, 262);
      ctx.fillStyle = '#050608';
      ctx.fillRect(-22, 250, 58, 22);
      ctx.restore();
    });
    // coat
    const coat = [[-95, -560], [95, -560], [118, -300], [100, -250], [-100, -250], [-118, -300]];
    L.tracePath(ctx, coat, true);
    ctx.fillStyle = P.coat;
    ctx.fill();
    L.hatch(ctx, coat, { angle: 1.3, spacing: 9, width: 1.6, color: ink, alpha: 0.6, seed: 900 });
    // rim light (lamp from screen-right)
    ctx.strokeStyle = L.rgba(P.lampPale, 0.75 * rim);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(95, -555); ctx.lineTo(118, -300); ctx.lineTo(100, -250); ctx.stroke();
    // arms
    ctx.fillStyle = '#1D1E25';
    ctx.save(); ctx.translate(-95, -540); ctx.rotate(-sw * 0.6 + 0.05); ctx.fillRect(-24, 0, 38, 250); ctx.restore();
    ctx.save(); ctx.translate(95, -540); ctx.rotate(sw * 0.6 - 0.05); ctx.fillRect(-14, 0, 38, 250); ctx.restore();
    // head + hat brim
    ctx.fillStyle = '#C8A38C';
    ctx.beginPath(); ctx.ellipse(0, -620, 46, 58, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.ellipse(0, -655, 52, 30, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#7A5A48';
    ctx.beginPath(); ctx.ellipse(-12, -610, 30, 48, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    L.inkPath(ctx, coat, { closed: true, width: 4, color: ink, seed: 901 });
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
    ctx.beginPath();
    if (o.kind === 'circle') ctx.arc(o.x, o.y, o.r * e, 0, TAU);
    else {
      const w = o.w * e, h = o.h * e;
      ctx.rect(o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h);
    }
    ctx.save();
    ctx.clip();
    if (inner) inner(ctx, p);
    ctx.restore();
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
