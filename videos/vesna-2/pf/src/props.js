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
 * FILM.df (v2) — episode 5 "scratchboard illumination" kit. Everything is ENGRAVED: 2D forms are inked outlines + light
 * built from hatching/cross-hatching/stipple in bone, crimson and gold on a black plate; 3D heroes go through df.r3d, an
 * engraving renderer whose hatch lines follow the 3D surface at the same line density as the 2D. Gradients = light only.
 */
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sqrt = Math.sqrt, abs = Math.abs;
  const C = {
    ink: '#050404', plate: '#0D0A0B', bone: '#EEE4CC', boneD: '#A8987A', crimson: '#D8443A', crimsonD: '#7A1418',
    gold: '#E6B652', candle: '#F3B04B', ember: '#FF5A2A', moon: '#E9A68A', yellow: '#F2C230', ivory: '#F2E8D0',
    glassB: '#3E62D8', glassV: '#7A44C0', glassR: '#C8322A', glassG: '#D9A441', stone: '#B9AFA2', wax: '#E8DCC0', wood: '#B07A48',
  };
  const df = { C };
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };

  // ======================================================================== 3D ENGRAVING RENDERER
  const ell = (x, y, z, rx, ry, rz) => {
    const a = x / rx, b = y / ry, c = z / rz, k0 = sqrt(a * a + b * b + c * c);
    const a2 = a / rx, b2 = b / ry, c2 = c / rz, k1 = sqrt(a2 * a2 + b2 * b2 + c2 * c2) || 1e-6;
    return (k0 * (k0 - 1)) / k1;
  };
  const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k); return b + (a - b) * h - k * h * (1 - h); };
  const ssub = (d1, d2, k) => { const h = clamp(0.5 - (0.5 * (d2 + d1)) / k); return d2 + (-d1 - d2) * h + k * h * (1 - h); };
  const box = (x, y, z, hx, hy, hz, r = 0) => {
    const qx = abs(x) - hx + r, qy = abs(y) - hy + r, qz = abs(z) - hz + r;
    const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
    return sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
  const cap = (x, y, z, ax, ay, az, bx, by, bz, r) => {
    const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz));
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return sqrt(dx * dx + dy * dy + dz * dz) - r;
  };
  df.sd = { ell, smin, ssub, box, cap };

  /**
   * r3d(ctx, V, S) : ray-march an SDF scene and draw it as an engraving.
   *   V: { cx, cy  screen position of object (0,0,0)'s window anchor; unit px per object unit; win [X0,X1,Y0,Y1];
   *        yaw, pitch, roll; camD (9); res (0.38) low-res shading buffer scale; spacing (5.5) px between hatch lines;
   *        key, fill, rim light dirs (world, toward light); warm (light tint rgb); slot; flat (0..1 extra base fill) }
   *   S: { sdf(x,y,z) → d, mat(x,y,z) → id, col(id) → [r,g,b], uv(id,x,y,z,out) writes out[0]=u, out[1]=u2,
   *        bound: [cx, cy, cz, r] }
   * Returns { proj(x,y,z) → [sx, sy] } for anchoring 2D details (embers, labels) onto the 3D object.
   */
  df.r3d = function r3d(ctx, V, S) {
    const [X0, X1, Y0, Y1] = V.win;
    const unit = V.unit;
    const mt = ctx.getTransform(), scr = Math.hypot(mt.a, mt.b) || 1;
    const res = V.res || 0.38;
    const NW = Math.max(24, Math.round((X1 - X0) * unit * res * scr)), NH = Math.max(24, Math.round((Y1 - Y0) * unit * res * scr));
    const OW = Math.max(24, Math.round((X1 - X0) * unit * scr)), OH = Math.max(24, Math.round((Y1 - Y0) * unit * scr));
    const cyw = Math.cos(V.yaw || 0), syw = Math.sin(V.yaw || 0), cp = Math.cos(V.pitch || 0), sp = Math.sin(V.pitch || 0), cr = Math.cos(V.roll || 0), sr = Math.sin(V.roll || 0);
    const R = [cyw * cr + syw * sp * sr, -cyw * sr + syw * sp * cr, syw * cp, cp * sr, cp * cr, -sp, -syw * cr + cyw * sp * sr, syw * sr + cyw * sp * cr, cyw * cp];
    const toObj = (x, y, z) => [R[0] * x + R[3] * y + R[6] * z, R[1] * x + R[4] * y + R[7] * z, R[2] * x + R[5] * y + R[8] * z];
    const toWorld = (x, y, z) => [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z];
    const D = V.camD || 9, wcx = (X0 + X1) / 2, wcy = (Y0 + Y1) / 2;
    const ro = toObj(wcx, wcy, D);
    const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const key = nrm(V.key || [-0.5, 0.3, 0.8]), fil = nrm(V.fill || [0.7, -0.2, 0.6]), rim = nrm(V.rim || [0.7, 0.35, -0.6]);
    const B = S.bound;
    const n = NW * NH;
    const bufs = L.cached('df-r3d-bufs-' + n, () => ({ hit: new Uint8Array(n), mat: new Uint8Array(n), lum: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n), pz: new Float32Array(n), dep: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), nz: new Float32Array(n), edge: new Float32Array(n) }));
    const { hit, mat, lum, px, py, pz, dep, nx, ny, nz, edge } = bufs;
    hit.fill(0); edge.fill(0);
    for (let j = 0; j < NH; j++) {
      const wy = Y1 - ((j + 0.5) / NH) * (Y1 - Y0);
      for (let i = 0; i < NW; i++) {
        const wx = X0 + ((i + 0.5) / NW) * (X1 - X0);
        let dx = wx - wcx, dy = wy - wcy, dz = -D;
        const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
        const rd = toObj(dx, dy, dz);
        const ox = ro[0] - B[0], oy = ro[1] - B[1], oz = ro[2] - B[2];
        const bb = ox * rd[0] + oy * rd[1] + oz * rd[2], cc = ox * ox + oy * oy + oz * oz - B[3] * B[3], disc = bb * bb - cc;
        if (disc < 0) continue;
        let t = Math.max(0, -bb - sqrt(disc)); const tmax = -bb + sqrt(disc);
        let ok = false, x = 0, y = 0, z = 0;
        for (let k = 0; k < 96; k++) {
          x = ro[0] + rd[0] * t; y = ro[1] + rd[1] * t; z = ro[2] + rd[2] * t;
          const d = S.sdf(x, y, z);
          if (d < 0.002 * (1 + t * 0.1)) { ok = true; break; }
          t += d * 0.92;
          if (t > tmax) break;
        }
        if (!ok) continue;
        const id = j * NW + i;
        const e = 0.004;
        const a1 = S.sdf(x + e, y - e, z - e), a2 = S.sdf(x - e, y - e, z + e), a3 = S.sdf(x - e, y + e, z - e), a4 = S.sdf(x + e, y + e, z + e);
        let gx = a1 - a2 - a3 + a4, gy = -a1 - a2 + a3 + a4, gz = -a1 + a2 - a3 + a4;
        const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
        let ao = 0;
        for (let s = 1; s <= 3; s++) { const hh = 0.08 * s; ao += (hh - S.sdf(x + gx * hh, y + gy * hh, z + gz * hh)) / (1 << s); }
        ao = clamp(1 - 3.0 * ao);
        const W = toWorld(gx, gy, gz);
        const vd = -(W[0] * dx + W[1] * dy + W[2] * dz);
        const df_ = Math.max(0, W[0] * key[0] + W[1] * key[1] + W[2] * key[2]);
        const ff = Math.max(0, W[0] * fil[0] + W[1] * fil[1] + W[2] * fil[2]);
        const rr = Math.pow(Math.max(0, W[0] * rim[0] + W[1] * rim[1] + W[2] * rim[2]), 2) + Math.pow(1 - clamp(vd), 4) * 0.35;
        const rx = dx + 2 * vd * W[0], ry = dy + 2 * vd * W[1], rz = dz + 2 * vd * W[2];
        const spc = Math.pow(Math.max(0, rx * key[0] + ry * key[1] + rz * key[2]), 18);
        hit[id] = 1; mat[id] = S.mat(x, y, z);
        lum[id] = (df_ * 1.15 + ff * 0.14) * (0.25 + 0.75 * ao) + rr * 0.5 + spc * 0.55;
        px[id] = x; py[id] = y; pz[id] = z; dep[id] = t; nx[id] = W[0]; ny[id] = W[1]; nz[id] = W[2];
      }
    }
    // edges: silhouettes, depth breaks, material changes, creases
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const id = j * NW + i;
      if (!hit[id]) continue;
      let e = 0;
      for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= NW || jj >= NH) { e = 1; continue; }
        const q = jj * NW + ii;
        if (!hit[q]) { e = Math.max(e, 0.7); continue; }
        if (mat[q] !== mat[id]) e = Math.max(e, 0.8);
        if (abs(dep[q] - dep[id]) > 0.18) e = 1;
        const dn = nx[q] * nx[id] + ny[q] * ny[id] + nz[q] * nz[id];
        if (dn < 0.6) e = Math.max(e, 0.6);
      }
      edge[id] = e;
    }
    // full-resolution engraving pass
    const out = L.cached('df-r3d-out-' + OW + 'x' + OH + '-' + (V.slot || 0), () => { const c = document.createElement('canvas'); c.width = OW; c.height = OH; return c; });
    const og = out.getContext('2d');
    const img = og.createImageData(OW, OH), dd = img.data;
    const freq = unit / (V.spacing || 5.5);
    const aa = 1.15 / (V.spacing || 5.5) / scr;
    const bph = ((L.boil(L.T) * 0.6180339887) % 1) * 0.22;
    const uvo = [0, 0];
    const cols = {};
    const flat = V.flat != null ? V.flat : 0.1;
    const warm = V.warm || [1, 0.9, 0.78];
    for (let oy = 0; oy < OH; oy++) {
      const fy = ((oy + 0.5) / OH) * NH - 0.5;
      const j0 = Math.max(0, Math.min(NH - 1, Math.floor(fy))), j1 = Math.min(NH - 1, j0 + 1), ay = clamp(fy - j0);
      for (let ox = 0; ox < OW; ox++) {
        const fx = ((ox + 0.5) / OW) * NW - 0.5;
        const i0 = Math.max(0, Math.min(NW - 1, Math.floor(fx))), i1 = Math.min(NW - 1, i0 + 1), ax = clamp(fx - i0);
        const q00 = j0 * NW + i0, q10 = j0 * NW + i1, q01 = j1 * NW + i0, q11 = j1 * NW + i1;
        const w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
        const cov = w00 * hit[q00] + w10 * hit[q10] + w01 * hit[q01] + w11 * hit[q11];
        if (cov < 0.02) continue;
        const h00 = w00 * hit[q00], h10 = w10 * hit[q10], h01 = w01 * hit[q01], h11 = w11 * hit[q11];
        const iw = 1 / (h00 + h10 + h01 + h11);
        const l = (lum[q00] * h00 + lum[q10] * h10 + lum[q01] * h01 + lum[q11] * h11) * iw;
        const x = (px[q00] * h00 + px[q10] * h10 + px[q01] * h01 + px[q11] * h11) * iw;
        const y = (py[q00] * h00 + py[q10] * h10 + py[q01] * h01 + py[q11] * h11) * iw;
        const z = (pz[q00] * h00 + pz[q10] * h10 + pz[q01] * h01 + pz[q11] * h11) * iw;
        const eg = (edge[q00] * h00 + edge[q10] * h10 + edge[q01] * h01 + edge[q11] * h11) * iw;
        let best = q00, bw = h00; if (h10 > bw) { best = q10; bw = h10; } if (h01 > bw) { best = q01; bw = h01; } if (h11 > bw) { best = q11; }
        const m = mat[best];
        S.uv(m, x, y, z, uvo);
        const wob = 0.16 * Math.sin(x * 5.3 + z * 4.1 + y * 0.7) + 0.07 * Math.sin(x * 21 + y * 17 + z * 13);
        const u1 = uvo[0] * freq + wob + bph, u2 = uvo[1] * freq * 1.07 + wob * 0.7 - bph;
        const d1 = abs((u1 - Math.floor(u1)) - 0.5), d2 = abs((u2 - Math.floor(u2)) - 0.5);
        const tone = clamp(l * 0.7 - 0.1), hw1 = 0.5 * Math.pow(tone, 1.45), hw2 = 0.3 * clamp((tone - 0.56) * 2.2);
        let v = clamp((hw1 - d1) / aa + 0.5);
        if (hw2 > 0) v = Math.max(v, clamp((hw2 - d2) / aa + 0.5));
        if (l > 1.25) v = Math.max(v, clamp((l - 1.25) * 2));
        if (eg > 0.55) v *= 1 - clamp((eg - 0.55) * 2.8);
        let c = cols[m]; if (!c) c = cols[m] = S.col(m);
        const k = flat * clamp(l) + v * (0.5 + 0.6 * clamp(l, 0, 1.3));
        const p = (oy * OW + ox) * 4;
        dd[p] = 255 * Math.min(1, c[0] * k * warm[0]); dd[p + 1] = 255 * Math.min(1, c[1] * k * warm[1]); dd[p + 2] = 255 * Math.min(1, c[2] * k * warm[2]);
        dd[p + 3] = 255 * Math.min(1, cov * 1.15);
      }
    }
    og.putImageData(img, 0, 0);
    ctx.drawImage(out, V.cx + X0 * unit, V.cy - Y1 * unit, (X1 - X0) * unit, (Y1 - Y0) * unit);
    const proj = (x, y, z) => { const w = toWorld(x, y, z); const tt = D / (D - w[2]); return [V.cx + (wcx + (w[0] - wcx) * tt) * unit, V.cy - (wcy + (w[1] - wcy) * tt) * unit]; };
    return { proj };
  };

  // ------------------------------------------------------------------ SDF parts: skull + tiara (skull units: chin -1.25 … crown 1.2)
  const BANDS = [0.1, 0.56, 1.0];
  const tiaraR = (h) => { const u = clamp(h / 1.55); let r = 0.9 * sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) * (1 - 0.14 * u); for (const b of BANDS) { const d = (h - b) / 0.06; r += 0.03 * Math.exp(-d * d); } return r; };
  let JC = 1, JS = 0, TI = true;
  // returns distance; writes material into SKM (0 bone, 1 tiara silk, 2 tiara gold, 3 jewel red, 4 jewel blue)
  let SKM = 0;
  function skullSd(x, y, z, wantMat) {
    const ax = abs(x);
    let d = ell(x, y - 0.36, z + 0.12, 0.84, 0.84, 1.0);
    d = smin(d, ell(x, y - 0.06, z - 0.5, 0.66, 0.16, 0.3), 0.12);
    d = smin(d, ell(x, y + 0.3, z - 0.3, 0.6, 0.5, 0.5), 0.22);
    d = smin(d, ell(ax - 0.52, y + 0.3, z - 0.3, 0.2, 0.12, 0.34), 0.1);
    d = smin(d, ell(ax - 0.66, y + 0.36, z, 0.07, 0.07, 0.36), 0.08);
    d = smin(d, ell(x, y + 0.68, z - 0.38, 0.4, 0.24, 0.34), 0.14);
    d = smin(d, ell(x, y + 0.86, z - 0.38, 0.33, 0.11, 0.3), 0.04);
    d = ssub(ell(ax - 0.9, y + 0.08, z, 0.2, 0.32, 0.42), d, 0.14);
    d = ssub(ell(ax - 0.29, y + 0.16, z - 0.62, 0.22, 0.2, 0.42), d, 0.04);
    d = ssub(ell(ax - 0.29, y + 0.18, z - 0.3, 0.16, 0.14, 0.3), d, 0.04);
    d = ssub(ell(x, y + 0.48, z - 0.74, 0.085, 0.15, 0.26), d, 0.03);
    d = ssub(ell(ax - 0.06, y + 0.56, z - 0.74, 0.07, 0.06, 0.2), d, 0.02);
    let m = 0;
    if (y < -0.25) {
      const jy = y + 0.52, jz = z + 0.1;
      const qy = jy * JC + jz * JS - 0.52, qz = -jy * JS + jz * JC - 0.1;
      let jm = ell(x, qy + 1.06, qz - 0.24, 0.4, 0.17, 0.36);
      jm = ssub(ell(x, qy + 0.98, qz - 0.12, 0.3, 0.24, 0.3), jm, 0.05);
      jm = smin(jm, ell(x, qy + 1.17, qz - 0.48, 0.17, 0.1, 0.12), 0.08);
      jm = smin(jm, ell(ax - 0.42, qy + 0.8, qz, 0.08, 0.3, 0.14), 0.1);
      jm = smin(jm, ell(x, qy + 0.95, qz - 0.36, 0.31, 0.09, 0.28), 0.04);
      if (jm < d) { d = jm; m = 5; }
    }
    if (TI && y > 0.5) {
      const h = y - 0.66, rho = Math.hypot(x, z + 0.1);
      let t = Math.max((rho - tiaraR(clamp(h, 0, 1.55))) * 0.7, -h, h - 1.55);
      t = Math.min(t, ell(x, y - 2.26, z + 0.1, 0.1, 0.1, 0.1));
      if (t < d) { d = t; m = 1; }
    }
    if (wantMat) {
      if (m === 1) {
        const h = y - 0.66;
        if (y > 2.12) m = 2;
        else for (const b of BANDS) if (abs(h - b) < 0.065) {
          m = 2;
          const ang = Math.atan2(x, z + 0.1), cell = (ang * 8) / Math.PI, du = ((cell % 1) + 1) % 1 - 0.5, duu = du * (Math.PI / 8) * 0.9, dv = h - b;
          if (duu * duu + dv * dv < 0.0011) m = Math.floor(cell + 40) % 2 ? 3 : 4;
        }
      } else if (m === 0) {
        // teeth (upper) read as gold-free bone but darker grooves via a separate id
        if (y < -0.76 && y > -0.98 && z > 0.25) { const ang = Math.atan2(x, z), gv = abs(((ang * 14) / Math.PI % 1 + 1) % 1 - 0.5); if (gv > 0.38) m = 6; }
      } else if (m === 5) m = 0;
      SKM = m;
    }
    return d;
  }
  df.skullSd = skullSd;
  df.lastSkullMat = () => SKM;
  df.setSkull = (jaw, tiara) => { const a = clamp(jaw || 0) * 0.42; JC = Math.cos(a); JS = Math.sin(a); TI = tiara !== false; };
  const SKCOL = { 0: rgb('#EEE4CC'), 1: rgb('#E6E0D2'), 2: rgb('#E6B652'), 3: rgb('#E0403A'), 4: rgb('#4A72E8'), 6: rgb('#3A3026'), 7: rgb('#D8443A'), 8: rgb('#F0E8D8'), 9: rgb('#B07A48'), 10: rgb('#E6B652'), 11: rgb('#1A1414'), 12: rgb('#EEE4CC') };
  const skullUV = (m, x, y, z, o) => {
    if (m === 1 || m === 2) { o[0] = y; o[1] = Math.atan2(x, z + 0.1) * 0.9; }
    else { o[0] = y * 1.0 + 0.12 * x * x; o[1] = (x + z) * 0.72; }
  };
  df.SKULL = {
    sdf: (x, y, z) => skullSd(x, y, z, false),
    mat: (x, y, z) => { skullSd(x, y, z, true); return SKM; },
    col: (m) => SKCOL[m] || SKCOL[0],
    uv: skullUV,
    bound: [0, 0.55, 0, 2.2],
  };
  /** skull(ctx, cx, cy, H, o) : the engraved 3D skull + tiara. (cx,cy) = screen point of the skull origin, H = skull height px. */
  df.skull = (ctx, cx, cy, H, o = {}) => {
    df.setSkull(o.jaw, o.tiara);
    const unit = H / 2.45;
    const r = df.r3d(ctx, { cx, cy, unit, win: [-1.45, 1.45, -1.55, o.tiara === false ? 1.45 : 2.45], yaw: o.yaw, pitch: o.pitch, roll: o.roll, res: o.res || 0.36, spacing: o.spacing || 6.5, slot: o.slot || 0, key: o.key || [-0.62, -0.32, 0.6], fill: [0.75, 0.2, 0.5], rim: [0.85, 0.3, -0.45], flat: 0.05, warm: o.warm }, df.SKULL);
    const em = o.ember || 0;
    if (em > 0) for (const sx of [-0.29, 0.29]) { const [ex, ey] = r.proj(sx, -0.16, 0.5); df.glow(ctx, ex, ey, unit * 0.2 * em, C.ember, 0.8 * em); df.glow(ctx, ex, ey, unit * 0.06, '#FFC890', em); ctx.fillStyle = L.rgba('#FFE6C0', em); ctx.beginPath(); ctx.arc(ex, ey, unit * 0.018, 0, TAU); ctx.fill(); }
    if (o.tiara !== false) { const [qx, qy] = r.proj(0, 2.35, -0.1), [q2x, q2y] = r.proj(0, 2.7, -0.1); const s = unit * 0.035; L.inkPath(ctx, [[qx, qy], [q2x, q2y]], { width: s * 2, color: C.gold, seed: 3, taper: 2 }); L.inkPath(ctx, [[qx - s * 4, qy + (q2y - qy) * 0.62], [qx + s * 4, qy + (q2y - qy) * 0.62]], { width: s * 1.8, color: C.gold, seed: 4, taper: 2 }); }
    return r;
  };

  df.glow = (ctx, x, y, r, col, a = 1) => {
    if (a <= 0 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, L.rgba(col, 0.55 * a)); g.addColorStop(0.35, L.rgba(col, 0.18 * a)); g.addColorStop(1, L.rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
  };

  FILM.df = df;
})();

/* FILM.df.CORPSE — the enthroned corpse as ONE 3D assembly: skull + tiara (shared SDF), neck, cope with folds, pallium,
   gold orphreys, lap and front drape, sleeves, skeletal hands on the armrests, gothic throne with finials and gold trim.
   Units: skull units (skull height 2.45). Seat top y = 0, floor y = -3.2, head origin at HEAD. */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, { ell, smin, ssub, box, cap } = df.sd;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const abs = Math.abs, sqrt = Math.sqrt;
  let HR = 0.2, HC = Math.cos(0.2), HS = Math.sin(0.2), HX = 0.15, HY = 6.05, HZ = 0.35, CUT = [0, 0, 0];
  let MAT = 0;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };
  // materials: 0 bone, 1 silk, 2 gold, 3 red jewel, 4 blue jewel, 6 tooth gap, 7 crimson cope, 8 white pallium/alb, 9 wood, 10 gold trim, 11 black cross
  function sdf(x, y, z, want) {
    let d = 1e9, m = 0;
    // throne
    if (z < 0 || abs(x) > 1.9 || y < -0.3) {
      let th = Math.max(box(x, y - 4.0, z + 0.95, 2.35, 4.7, 0.22, 0.04), y - (8.75 - 0.5 * x * x));
      th = Math.min(th, box(abs(x) - 2.42, y - 3.2, z + 0.8, 0.22, 5.4, 0.3, 0.05));
      th = Math.min(th, ell(abs(x) - 2.42, y - 8.75, z + 0.8, 0.24, 0.5, 0.24));
      th = Math.min(th, box(abs(x) - 2.3, y - 1.35, z - 0.55, 0.28, 0.16, 1.55, 0.06));
      th = Math.min(th, box(abs(x) - 2.3, y - 0.2, z - 2.0, 0.19, 1.1, 0.19, 0.04));
      th = Math.min(th, box(x, y + 0.15, z - 0.5, 2.3, 0.25, 1.6, 0.06));
      th = Math.min(th, box(x, y + 1.85, z - 0.45, 2.55, 1.4, 1.75, 0.05));
      if (th < d) { d = th; m = 9; }
    }
    // body: cope (bell, elliptical section, folds), yoke, lap, drape
    const ang = Math.atan2(x, z - 0.15);
    const fold = (0.13 * Math.sin(ang * 9 + y * 0.3) + 0.05 * Math.sin(ang * 23 - y * 0.8)) * clamp((4.5 - y) / 2.2);
    const ry = clamp((y - 0.2) / 4.2);
    const rr = 2.4 - 1.15 * ry * (2 - ry) * 0.62 - 0.45 * ry + fold;
    const rho = sqrt(x * x + ((z - 0.15) / 0.72) * ((z - 0.15) / 0.72));
    let body = Math.max((rho - rr) * 0.62, 0.15 - y, y - 4.45);
    body = smin(body, ell(x, y - 4.3, z - 0.1, 1.5, 0.58, 0.95), 0.35);
    body = smin(body, ell(x, y - 0.3, z - 1.15, 1.72, 0.62, 1.45), 0.3);
    body = smin(body, box(x, y + 1.55, z - 2.05, 1.5 + 0.05 * Math.sin(y * 3), 1.62, 0.42, 0.2) + 0.05 * Math.sin(x * 7 + y), 0.3);
    // sleeves
    const sx = x < 0 ? -1 : 1, axx = abs(x);
    body = smin(body, cap(axx, y, z, 1.3, 4.05, 0.2, 1.8, 2.2, 0.75, 0.46), 0.2);
    body = smin(body, cap(axx, y, z, 1.8, 2.2, 0.75, 1.98, 1.42, 1.62, 0.4), 0.15);
    if (body < d) { d = body; m = 7; }
    // hands on the armrests (skeletal): palm + four fingers curling over the front edge
    if (axx > 1.5 && axx < 2.5 && y > 0.3 && y < 1.8 && z > 1.3) {
      let hnd = ell(axx - 2.02, y - 1.58, z - 1.95, 0.24, 0.08, 0.3);
      for (let k = 0; k < 4; k++) {
        const fx = 1.86 + k * 0.1;
        if (sx > 0 && k >= 1 && k <= 3 && CUT[k - 1] && false) continue;
        hnd = Math.min(hnd, cap(axx, y, z, fx, 1.56, 2.18, fx, 1.38, 2.36, 0.045), cap(axx, y, z, fx, 1.38, 2.36, fx, 1.12, 2.3, 0.04));
      }
      if (hnd < d) { d = hnd; m = 0; }
    }
    // neck
    const nk = cap(x, y, z, 0.05, 4.35, 0.15, HX * 0.6, 5.05, 0.25, 0.17);
    if (nk < d) { d = nk; m = 0; }
    // head: skull + tiara (shared SDF), slumped by HR
    if (y > 4.4) {
      const qx = x - HX, qy = y - HY, qz = z - HZ;
      const lx = qx * HC + qy * HS, ly = -qx * HS + qy * HC;
      const hd = df.skullSd(lx, ly, qz, want);
      if (hd < d) { d = hd; m = -1; }
    }
    if (want) {
      if (m === -1) m = MATSK();
      else if (m === 7) {
        // pallium Y + crosses, gold orphreys, drape = alb (white) below the lap
        if (y < -0.1 && z > 1.6) m = 8;
        else if (z > 0.3) {
          const yArm = y > 3.55 ? abs(axx - (y - 3.55) * 0.95) : axx;
          if (y > 1.0 && y < 4.6 && yArm < 0.16) {
            m = 8;
            for (const [cx, cy] of [[0, 1.7], [0, 2.6], [0.75, 4.25]]) if (abs(axx - cx) < 0.09 && abs(y - cy) < 0.03 || abs(axx - cx) < 0.025 && abs(y - cy) < 0.11) m = 11;
          } else if (axx > 0.5 && axx < 0.66 && y > 0.3 && y < 4.4) m = 10;
        }
      } else if (m === 9) {
        if (abs(abs(x) - 2.13) < 0.07 && y > 0.5 || y > 8.2 - 0.5 * x * x || (abs(x) > 2.2 && y > 8.2)) m = 10;
      }
      MAT = m;
    }
    return d;
  }
  let skm = 0;
  const MATSK = () => { df.skullSd.last = 0; return df.lastSkullMat(); };
  df.CORPSE = {
    sdf: (x, y, z) => sdf(x, y, z, false),
    mat: (x, y, z) => { sdf(x, y, z, true); return MAT; },
    col: (m) => ({ 0: rgb('#EEE4CC'), 1: rgb('#E6E0D2'), 2: rgb('#E6B652'), 3: rgb('#E0403A'), 4: rgb('#4A72E8'), 6: rgb('#3A3026'), 7: rgb('#E0483C'), 8: rgb('#DCD2BE'), 9: rgb('#B07C4E'), 10: rgb('#EDBE5A'), 11: rgb('#141010') }[m] || [1, 1, 1]),
    uv: (m, x, y, z, o) => {
      if (m === 7 || m === 8 || m === 10) { o[0] = Math.atan2(x, z - 0.15) * 1.6; o[1] = y; }
      else if (m === 9) { o[0] = x * 0.9 + 0.08 * Math.sin(y * 3); o[1] = y; }
      else { o[0] = y + 0.12 * x * x; o[1] = (x + z) * 0.72; }
    },
    bound: [0, 2.9, 0.4, 7.4],
  };
  /** corpse(ctx, cx, cy, Hpx, o) : (cx,cy) = screen point of the floor centre under the throne; Hpx = throne height px. */
  df.corpse = (ctx, cx, cy, Hpx, T, o = {}) => {
    df.setSkull(o.jaw != null ? o.jaw : 0.25, true);
    HR = o.tilt != null ? o.tilt : 0.2 + 0.03 * Math.sin(T * 0.8); HC = Math.cos(HR); HS = Math.sin(HR);
    HX = 0.12 + Math.sin(HR) * 0.6;
    const unit = Hpx / 12.4;
    const r = df.r3d(ctx, { cx, cy: cy - 3.4 * unit, unit, win: [-3.2, 3.2, -3.4, 9.2], yaw: o.yaw || 0, pitch: o.pitch != null ? o.pitch : 0.06, res: o.res || 0.36, spacing: o.spacing || 6.0, slot: o.slot || 4, warm: o.warm,
      key: o.key || [-0.85, 0.3, 0.45], fill: [0.7, 0.1, 0.5], rim: [0.85, 0.4, -0.35], flat: 0.05, camD: 26 }, df.CORPSE);
    const em = o.ember || 0;
    if (em > 0) for (const sx of [-0.29, 0.29]) {
      const lx = sx, ly = -0.16, qx = lx * HC - ly * HS + HX, qy = lx * HS + ly * HC + HY;
      const [ex, ey] = r.proj(qx, qy, HZ + 0.5);
      df.glow(ctx, ex, ey, unit * 0.22 * em, df.C.ember, 0.8 * em); df.glow(ctx, ex, ey, unit * 0.07, '#FFC890', em);
    }
    return r;
  };
})();

/* FILM.df — 2D engraving kit + the skeletal HAND (3D). Every 2D object: black ink silhouette, bone rim on its lit side,
   light built from contour hatching, cross-hatching in the lights and stipple in the brightest highlights. */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, C = df.C, { ell, smin, cap } = df.sd;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };

  // ---------------------------------------------------------------- plate, light, atmosphere
  df.plate = (ctx, o = {}) => { L.paper(ctx, { color: o.color || '#0F0C0D', seed: o.seed || 5, grain: 1.5, fibres: 0.6, mottle: 1.3, vignette: o.vignette != null ? o.vignette : 0.65 }); };
  /** lights(list, amb) → fn(x,y) 0..1. list items: { x, y, r, k } point lights, or { dir: [dx,dy], at: [x,y], span, k } ramps. */
  df.lights = (list, amb = 0.06) => (x, y) => {
    let v = amb;
    for (const l of list) {
      if (l.dir) { const u = ((x - l.at[0]) * l.dir[0] + (y - l.at[1]) * l.dir[1]) / l.span; v += l.k * clamp(1 - u); }
      else { const d = Math.hypot(x - l.x, y - l.y) / l.r; if (d < 1) v += l.k * Math.pow(1 - d, 1.5); }
    }
    return clamp(v);
  };
  df.grain = (ctx, T, a = 1) => {
    const v = ctx.createRadialGradient(540, 900, 420, 540, 900, 1250);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.7 * a})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
  };
  df.flash = (T, hits) => { let f = 0; for (const h of hits) { const d = T - h; if (d < 0 || d > 0.6) continue; f = Math.max(f, Math.exp(-d * 9) * (d < 0.05 ? 1 : 0.7) + (d > 0.12 && d < 0.2 ? 0.45 : 0)); } return clamp(f); };
  df.rain = (ctx, T, o = {}) => {
    const r = L.rng(L.hash('df-rain', o.seed || 1)), n = o.n || 200, a = o.a != null ? o.a : 0.3;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const z = 0.3 + r() * 0.7, sp = 2600 * z, len = 80 * z, x0 = r() * 1300 - 100, ph = r();
      const y = ((ph * 2200 + T * sp) % 2200) - 140, x = x0 + (y + 140) * 0.16;
      ctx.strokeStyle = `rgba(214,206,190,${a * z})`; ctx.lineWidth = 0.8 + 1.4 * z;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * 0.16, y + len); ctx.stroke();
    }
    ctx.restore();
  };
  // fog drawn as drifting engraved horizontal strokes (no blur blobs)
  df.mist = (ctx, T, o = {}) => {
    const y0 = o.y != null ? o.y : 1500, h = o.h || 400, a = o.a != null ? o.a : 0.35, sp = o.speed || 25;
    L.hatch(ctx, null, { bounds: { x: -60, y: y0 - h / 2, w: 1200, h }, angle: 0.02, spacing: 7, width: 1, color: o.color || '#CFC6B8', alpha: a, seed: (o.seed || 31) + (Math.floor(T * 12) % 3), length: [40, 160], gap: [10, 60],
      density: (x, y) => { const u = (x + T * sp) * 0.004; return clamp((Math.sin(u * 3 + y * 0.01) * 0.5 + 0.5) * Math.sin(clamp((y - (y0 - h / 2)) / h) * Math.PI) * 0.9); } });
  };
  df.embers = (ctx, T, o = {}) => {
    const r = L.rng(L.hash('embers', o.seed || 1));
    for (let i = 0; i < (o.n || 50); i++) { const x = r() * 1080, sp = 100 + r() * 200, y = (o.y0 || 1900) - ((r() * 1900 + T * sp) % 1900); L.glowDot(ctx, x + Math.sin(T * 2 + i) * 18, y, 1.6 + r() * 1.6, { color: '#FF9A40', core: '#FFE0B0', rays: 0, glow: 7, additive: true }); }
  };

  // ---------------------------------------------------------------- the 2D workhorse
  df.engrave = (ctx, ptsIn, o = {}) => {
    const pts = o.smooth === false ? ptsIn : L.smoothPts(ptsIn, true, o.step || 7);
    const lit = o.light || (() => 0.5);
    const col = o.ink || C.bone, seed = o.seed || 1;
    const sp = o.spacing || 5.5, w = o.width || 1.2, a = o.alpha != null ? o.alpha : 0.92, ang = o.angle != null ? o.angle : -0.95;
    if (o.base !== 'none') { ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.fillStyle = o.base || '#0B0809'; ctx.fill(); }
    const g = o.gain || 1.05;
    L.hatch(ctx, pts, { angle: ang, spacing: sp, width: w, color: col, alpha: a, seed, density: (x, y) => clamp(Math.pow(lit(x, y), 0.72) * g), length: o.len || [20, 90], gap: [1, 5], bend: o.bend || 0, inset: 2, overshoot: 1 });
    if (o.cross !== false) L.hatch(ctx, pts, { angle: ang + (o.turn != null ? o.turn : 1.2), spacing: sp * 1.3, width: w * 0.85, color: col, alpha: a * 0.8, seed: seed + 5, density: (x, y) => clamp((lit(x, y) * g - 0.55) * 2.2), length: [14, 60], gap: [2, 7], inset: 3 });
    if (o.stip !== false) L.stipple(ctx, pts, { spacing: 4.6, r: [0.5, 1.2], color: col, alpha: 0.85, seed: seed + 9, density: (x, y) => clamp((lit(x, y) * g - 0.78) * 4) });
    if (o.outline !== false) {
      L.inkPath(ctx, pts, { closed: true, width: o.outW || 2.6, color: '#000', seed: seed + 11 });
      const runs = []; let cur = [];
      pts.forEach((p) => { if (lit(p[0], p[1]) > (o.rimT != null ? o.rimT : 0.5)) cur.push(p); else { if (cur.length > 3) runs.push(cur); cur = []; } });
      if (cur.length > 3) runs.push(cur);
      runs.forEach((r, i) => L.inkPath(ctx, r, { width: o.rimW || 1.5, color: o.rimCol || col, alpha: 0.95, seed: seed + 20 + i, taper: [8, 14] }));
    }
  };
  /** detail lines (folds, mortar, grain) that light up where lit: dark ink + a bone shadow-side line */
  df.lines = (ctx, list, lit, o = {}) => list.forEach((ln, i) => {
    const m = ln[Math.floor(ln.length / 2)], l = lit(m[0], m[1]);
    L.inkPath(ctx, ln, { width: o.w || 2, color: '#000', alpha: 0.95, seed: (o.seed || 40) + i, taper: [10, 20] });
    if (l > 0.25) L.inkPath(ctx, ln.map(([x, y]) => [x + (o.off || 2.2), y + (o.offY || 0)]), { width: (o.w || 2) * 0.55, color: o.col || C.bone, alpha: clamp(l * 1.2), seed: (o.seed || 40) + 50 + i, taper: [12, 22] });
  });

  // ---------------------------------------------------------------- candle + flame
  df.flame = (ctx, x, y, s, T, seed = 1, k = 1) => {
    if (k <= 0) return;
    const fl = 1 + 0.12 * L.noise1(T * 9, seed) + 0.05 * Math.sin(T * 31 + seed), sway = 5 * L.noise1(T * 3, seed + 5) * s;
    df.glow(ctx, x, y - 40 * s, 300 * s * fl, C.candle, 0.85 * k);
    ctx.save(); ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(x, y - 30 * s, 2, x, y - 40 * s, 40 * s);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, '#FFE6A0'); g.addColorStop(0.75, '#F39A2B'); g.addColorStop(1, 'rgba(240,120,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 13 * s, y - 16 * s);
    ctx.quadraticCurveTo(x - 15 * s, y - 50 * s * fl, x + sway, y - 86 * s * fl); ctx.quadraticCurveTo(x + 15 * s, y - 50 * s * fl, x + 13 * s, y - 16 * s);
    ctx.quadraticCurveTo(x, y - 4 * s, x - 13 * s, y - 16 * s); ctx.fill();
    L.inkPath(ctx, [[x - 6 * s, y - 20 * s], [x - 4 * s, y - 50 * s * fl], [x + sway * 0.8, y - 80 * s * fl]], { width: 1.6 * s, color: '#FFF4D0', alpha: 0.8, seed: seed + 3, taper: 6 });
    ctx.restore();
  };
  df.candle = (ctx, x, y, s, T, o = {}) => {
    const h = (o.h || 160) * s, w = 21 * s, seed = o.seed || 1, out = clamp(o.out || 0);
    const lit = (px, py) => clamp(0.9 - (py - y) / (h * 1.3) - Math.abs(px - x + w * 0.35) / (w * 2.4)) * (1 - out * 0.85);
    df.engrave(ctx, [[x - w, y], [x - w, y + h], [x + w, y + h], [x + w, y]], { ink: C.wax, light: lit, angle: 1.57, spacing: 4.2, width: 1.1, seed, outW: 2.2, smooth: false });
    L.inkPath(ctx, L.ellipsePts(x, y, w, 6 * s, 20), { closed: true, width: 1.6, color: C.wax, alpha: 0.8 * (1 - out), seed: seed + 2 });
    const r = L.rng(L.hash('drip', seed));
    for (let k = 0; k < 3; k++) { const dx = x - w * 0.8 + r() * w * 1.6, dl = (16 + r() * 40) * s; L.inkPath(ctx, [[dx, y], [dx + 1, y + dl * 0.6], [dx, y + dl]], { width: 5 * s, color: C.wax, alpha: 0.7 * (1 - out), seed: seed + 5 + k, taper: [2, 6] }); }
    L.inkPath(ctx, [[x, y], [x + 1, y - 15 * s]], { width: 2.4 * s, color: '#000', seed: seed + 9, taper: 2 });
    df.flame(ctx, x, y, s, T, seed, 1 - out);
    if (o.smoke && out > 0) {
      const st = o.smoke;
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let i = 0; i <= 40; i++) { const u = i / 40, yy = y - 16 * s - u * 460 * clamp(st * 1.3) * s; pts.push([x + Math.sin(u * 9 + T * 2 + k * 2) * 30 * u * s + k * 6, yy]); }
        L.inkPath(ctx, pts, { width: 2.2 * s, color: '#BDB4C4', alpha: 0.55 * clamp(2.2 - st), seed: seed + 30 + k, taper: [4, 40] });
      }
    }
    return lit;
  };

  // ---------------------------------------------------------------- robed figures (engraved, no faces)
  df.figure = (ctx, X, Y, s, T, o = {}) => {
    const pose = o.pose || 'stand', ph = o.ph != null ? o.ph : T * 7, hat = o.hat || 'hood';
    const lightW = o.light || (() => 0.4), ink = o.ink || C.bone, seed = o.seed || 7;
    const walk = pose === 'walk' || pose === 'torch';
    const sw = walk ? Math.sin(ph) : 0, bob = walk ? Math.abs(Math.cos(ph)) * 8 : 0;
    const trem = o.tremble ? Math.sin(T * 47) * 3 * o.tremble : 0;
    const lean = pose === 'dig' ? 0.38 + 0.14 * Math.sin(ph) : pose === 'point' ? -0.06 : 0;
    const fl = o.flip ? -1 : 1;
    const ca = Math.cos(lean), sa = Math.sin(lean);
    const W = (px, py) => { const qx = px * ca - py * sa, qy = px * sa + py * ca; return [X + (qx * fl + trem) * s, Y + (qy - bob) * s]; };
    const lit = (px, py) => lightW(px, py);
    const T_ = (pts) => pts.map(([a, b]) => W(a, b));
    const hem = 74 + Math.abs(sw) * 16;
    // feet
    if (walk) for (const sd of [-1, 1]) { const k = sd * sw; df.engrave(ctx, T_(L.ellipsePts(k * 34 + sd * 14, -2, 26, 11, 14)), { ink, light: lit, base: '#060405', spacing: 4, seed: seed + 60 + sd, outW: 1.8, cross: false, stip: false }); }
    // robe
    const robe = [[-hem, -4], [-62 - sw * 10, -200], [-54, -370], [-32, -418], [32, -418], [54, -370], [62 - sw * 10, -200], [hem, -4]];
    df.engrave(ctx, T_(robe), { ink, light: lit, angle: -1.35 * fl, spacing: 5.2, seed, outW: 2.8 });
    // folds: from the shoulders to the hem, swaying with the stride
    const folds = [];
    for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6, x0 = lerp(-40, 40, u), x1 = lerp(-hem + 10, hem - 10, u) + sw * 12 * (k % 2 ? 1 : -1); folds.push(T_([[x0, -380], [lerp(x0, x1, 0.5) + Math.sin(k * 2.1) * 8, -200], [x1, -10]])); }
    df.lines(ctx, folds, lit, { w: 1.8 * Math.min(1.2, s * 1.4), seed: seed + 100, off: 2 * fl });
    // hood / mitre / cap — the face is always a void
    let head;
    if (hat === 'hood') head = [[-50, -390], [-60, -470], [-36, -540], [0, -556], [36, -540], [60, -470], [50, -390]];
    else if (hat === 'mitre') head = [[-40, -400], [-44, -470], [-34, -590], [0, -640], [34, -590], [44, -470], [40, -400]];
    else head = [[-44, -400], [-48, -470], [-30, -508], [30, -508], [48, -470], [44, -400]];
    df.engrave(ctx, T_(head), { ink: hat === 'mitre' ? C.gold : ink, light: lit, angle: 1.2 * fl, spacing: 4.6, seed: seed + 3, outW: 2.6 });
    if (hat === 'mitre') df.lines(ctx, [T_([[0, -630], [0, -420]]), T_([[-40, -470], [40, -470]])], lit, { w: 2.4, col: C.gold, seed: seed + 140 });
    ctx.save(); ctx.beginPath(); L.tracePath(ctx, T_(L.ellipsePts(0, -462, 30, 38, 18)), true); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    // sleeves / arms
    const tips = {};
    const sleeve = (sx, ex, ey, hx, hy, k) => {
      const nx = -(hy - (-380)), ny = hx - sx, nl = Math.hypot(nx, ny) || 1, wv = 26;
      const pts = [[sx - 18, -392], [ex - 22, ey], [hx - wv * nx / nl, hy - wv * ny / nl], [hx + wv * nx / nl, hy + wv * ny / nl], [ex + 22, ey + 10], [sx + 22, -368]];
      df.engrave(ctx, T_(pts), { ink, light: lit, angle: -0.5 * fl, spacing: 5, seed: seed + 20 + k, outW: 2.4, cross: false });
      // bony hand at the cuff
      df.engrave(ctx, T_(L.ellipsePts(hx, hy, 15, 18, 12)), { ink: C.bone, light: (a, b) => lit(a, b) + 0.2, spacing: 3.6, seed: seed + 30 + k, outW: 1.8, cross: false });
    };
    if (pose === 'point') { sleeve(40, 150, -430, 270, -470, 0); sleeve(-40, -70, -260, -52, -190, 1); tips.hand = W(290, -470); }
    else if (pose === 'torch') { const a = Math.sin(ph) * 10; sleeve(40, 90, -480, 70 + a, -560, 0); sleeve(-40, -70 - sw * 20, -260, -60 - sw * 30, -190, 1); tips.torch = W(70 + a, -600); }
    else if (pose === 'dig') { sleeve(40, 110, -300, 150, -200, 0); sleeve(-40, 60, -300, 120, -150, 1); tips.shovel = W(150, -200); }
    else if (pose === 'pray') { sleeve(40, 60, -300, 12, -320, 0); sleeve(-40, -60, -300, -12, -320, 1); }
    else { sleeve(40, 70, -260, 52 + sw * 30, -180, 0); sleeve(-40, -70, -260, -52 - sw * 30, -180, 1); }
    return tips;
  };
  df.torch = (ctx, x, y, s, T, seed) => {
    df.glow(ctx, x, y - 20 * s, 220 * s, C.candle, 0.7); df.glow(ctx, x, y - 20 * s, 80 * s, C.ember, 0.6);
    const fl = 1 + 0.2 * L.noise1(T * 11, seed);
    ctx.save();
    const g = ctx.createRadialGradient(x, y - 30 * s, 4, x, y - 40 * s, 70 * s);
    g.addColorStop(0, '#FFF6D0'); g.addColorStop(0.35, '#FFB040'); g.addColorStop(1, 'rgba(220,60,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 26 * s, y); ctx.quadraticCurveTo(x - 30 * s, y - 60 * fl * s, x + 6 * Math.sin(T * 7 + seed) * s, y - 120 * fl * s); ctx.quadraticCurveTo(x + 30 * s, y - 60 * fl * s, x + 26 * s, y); ctx.fill();
    ctx.restore();
    L.inkPath(ctx, [[x, y], [x - 4 * s, y + 70 * s]], { width: 9 * s, color: '#2A1A10', seed, taper: 3 });
  };

  // ---------------------------------------------------------------- sky, moon, ravens, skyline
  df.sky = (ctx, T, o = {}) => {
    const m = o.moon || [700, 560];
    const lit = (x, y) => clamp(0.34 + 0.9 * Math.pow(clamp(1 - Math.hypot(x - m[0], (y - m[1]) * 1.4) / 1000), 1.3));
    ctx.fillStyle = o.base || '#100709'; ctx.fillRect(0, 0, 1080, o.h || 1400);
    L.hatch(ctx, null, { bounds: { x: -20, y: 0, w: 1120, h: o.h || 1400 }, angle: 0.0, spacing: 6.5, width: 1.05, color: o.ink || '#C8826E', alpha: 0.85, seed: 61, length: [60, 240], gap: [2, 14], density: lit, bow: 0.4 });
    // engraved cloud bands
    const r = L.rng(L.hash('clouds'));
    for (let k = 0; k < 6; k++) {
      const cy = 160 + r() * 900, cx = r() * 1080, w = 300 + r() * 500, drift = T * (6 + r() * 8);
      const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([cx - w / 2 + u * w + drift, cy + Math.sin(u * Math.PI) * -40 - Math.sin(u * 9 + k) * 8]); }
      for (let i = 24; i >= 0; i--) { const u = i / 24; pts.push([cx - w / 2 + u * w + drift, cy + 14 + Math.sin(u * 6 + k) * 6]); }
      df.engrave(ctx, pts, { ink: '#B27464', light: (x, y) => lit(x, y) * 0.8, base: '#0B0506', angle: 0.05, spacing: 4.4, seed: 70 + k, outW: 1.6, rimT: 0.35, cross: false });
    }
  };
  df.moon = (ctx, x, y, r, T, o = {}) => {
    df.glow(ctx, x, y, r * 3, o.glow || '#C8322A', 0.7);
    const pts = L.ellipsePts(x, y, r, r, 60);
    const lit = (px, py) => clamp(1.15 - Math.hypot(px - (x - r * 0.35), py - (y - r * 0.35)) / (r * 1.6));
    df.engrave(ctx, pts, { ink: o.ink || '#F0B094', base: '#3A0C0A', light: lit, angle: -0.6, spacing: 3.6, width: 1.05, seed: 81, outW: 2.2, rimT: 0.2, gain: 1.15 });
    const rr = L.rng(L.hash('craters'));
    for (let i = 0; i < 9; i++) { const a = rr() * TAU, d = rr() * r * 0.75, cr = r * (0.06 + rr() * 0.12); L.inkPath(ctx, L.ellipsePts(x + Math.cos(a) * d, y + Math.sin(a) * d, cr, cr * 0.9, 16), { closed: true, width: 1.3, color: '#4A0E0C', alpha: 0.8, seed: 90 + i }); }
  };
  df.raven = (ctx, x, y, s, ph, seed = 1) => {
    const f = Math.sin(ph);
    const body = [];
    for (const sd of [-1, 1]) { }
    const W = (px, py) => [x + px * s, y + py * s];
    const shape = [[0, -24], [7, -16], [9, 0], [54 + 0, -48 * f + 6], [90, -58 * f], [70, -40 * f + 14], [52, -26 * f + 18], [10, 12], [8, 34], [0, 40], [-8, 34], [-10, 12], [-52, -26 * f + 18], [-70, -40 * f + 14], [-90, -58 * f], [-54, -48 * f + 6], [-9, 0], [-7, -16]];
    ctx.beginPath(); L.tracePath(ctx, shape.map(([a, b]) => W(a, b)), true); ctx.fillStyle = '#050304'; ctx.fill();
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) { const u = 0.35 + k * 0.17; L.inkPath(ctx, [W(sd * 12, 4), W(sd * 90 * u, -58 * f * u + 10)], { width: 1, color: '#7A6E66', alpha: 0.7, seed: seed + k + (sd > 0 ? 9 : 0), taper: 4 }); }
  };
  df.skyline = (ctx, T, o = {}) => {
    const base = o.base || 1400, seed = o.seed || 1, lit = o.light || (() => 0.3), par = o.par || 0;
    const r = L.rng(L.hash('skyline', seed));
    let x = -120 - par;
    while (x < 1200) {
      const kind = r(), w = 70 + r() * 150, h = (o.h || 300) * (0.45 + r() * 0.6);
      let pts;
      if (kind < 0.2) pts = [[x, base], [x, base - h], [x + w / 2, base - h - 60], [x + w, base - h], [x + w, base]];
      else if (kind < 0.33) { pts = [[x, base], [x, base - h * 0.6]]; for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI; pts.push([x + w / 2 + Math.cos(a) * w / 2, base - h * 0.6 + Math.sin(a) * h * 0.45]); } pts.push([x + w, base - h * 0.6], [x + w, base]); }
      else if (kind < 0.48) { const tw = w * 0.42; pts = [[x, base], [x, base - h * 0.5], [x + (w - tw) / 2, base - h * 0.5], [x + (w - tw) / 2, base - h * 1.5], [x + w / 2, base - h * 1.7], [x + (w + tw) / 2, base - h * 1.5], [x + (w + tw) / 2, base - h * 0.5], [x + w, base - h * 0.5], [x + w, base]]; }
      else pts = [[x, base], [x, base - h * 0.75], [x + w, base - h * 0.75], [x + w, base]];
      df.engrave(ctx, pts, { ink: o.ink || '#CDB8A8', light: lit, angle: 1.45, spacing: o.spacing || 5, seed: seed * 50 + Math.floor(x), outW: 2.2, smooth: false, rimT: 0.35 });
      // windows
      for (let k = 0; k < 3; k++) if (r() < 0.5) { const wx = x + 12 + r() * (w - 24), wy = base - 30 - r() * h * 0.5; ctx.fillStyle = L.rgba(C.candle, 0.55 + 0.35 * Math.sin(T * 3 + wx)); ctx.fillRect(wx, wy, 6, 10); }
      x += w + 4;
    }
  };

  // ---------------------------------------------------------------- stained glass (lead lines, glass, painted figure)
  df.lancet = (ctx, x, y, w, h) => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + w * 0.55); ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h - w * 0.15); ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + w * 0.55); ctx.lineTo(x + w / 2, y); ctx.closePath(); };
  df.glass = (ctx, x, y, w, h, T, o = {}) => {
    const tint = o.tint || ['#3E62D8', '#7A44C0', '#2A4AA8', '#5A3AA0'];
    const glow = o.glow != null ? o.glow : 1, seed = o.seed || 1;
    df.glow(ctx, x, y - h / 2, Math.max(w, h) * 0.75, tint[0], 0.45 * glow);
    ctx.save(); df.lancet(ctx, x, y, w, h); ctx.clip();
    // diamond quarries
    const q = 46;
    for (let j = -1; j < (h + w) / q + 1; j++) for (let i = -1; i < w / q + 2; i++) {
      const cx = x - w / 2 + i * q + (j % 2 ? q / 2 : 0), cy = y - j * q * 0.62;
      const c = tint[(i * 7 + j * 3 + seed) % tint.length];
      ctx.fillStyle = c; ctx.globalAlpha = (0.55 + 0.35 * (((i * 13 + j * 7) % 5) / 5)) * glow;
      ctx.beginPath(); ctx.moveTo(cx, cy - q * 0.62); ctx.lineTo(cx + q / 2, cy); ctx.lineTo(cx, cy + q * 0.62); ctx.lineTo(cx - q / 2, cy); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // glass texture: fine hatching in darker glass
    L.hatch(ctx, null, { bounds: { x: x - w / 2, y: y - h - w * 0.2, w, h: h + w * 0.2 }, angle: 0.7, spacing: 5, width: 1, color: '#0A0612', alpha: 0.35, seed: seed + 3 });
    // painted figure (robe, mitre, halo) as coloured glass pieces
    if (o.fig) {
      const fx = x, fb = y - 40, fh = h * 0.62;
      const robe = [[fx - w * 0.3, fb], [fx - w * 0.2, fb - fh * 0.78], [fx + w * 0.2, fb - fh * 0.78], [fx + w * 0.3, fb]];
      ctx.beginPath(); L.tracePath(ctx, robe, true); ctx.fillStyle = o.fig.robe; ctx.globalAlpha = 0.95 * glow; ctx.fill(); ctx.globalAlpha = 1;
      L.hatch(ctx, robe, { angle: 1.5, spacing: 4.5, width: 1.1, color: '#0A0408', alpha: 0.55, seed: seed + 5, density: (px) => clamp(Math.abs(px - fx) / (w * 0.3)) });
      for (let k = -2; k <= 2; k++) L.inkPath(ctx, [[fx + k * w * 0.05, fb - fh * 0.76], [fx + k * w * 0.1, fb]], { width: 3, color: '#0A0709', seed: seed + 10 + k });
      ctx.fillStyle = '#E8D8C0'; ctx.globalAlpha = 0.9 * glow; ctx.beginPath(); ctx.ellipse(fx, fb - fh * 0.86, w * 0.09, w * 0.11, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      const mit = [[fx - w * 0.09, fb - fh * 0.9], [fx - w * 0.07, fb - fh * 1.02], [fx, fb - fh * 1.08], [fx + w * 0.07, fb - fh * 1.02], [fx + w * 0.09, fb - fh * 0.9]];
      ctx.beginPath(); L.tracePath(ctx, mit, true); ctx.fillStyle = C.glassG; ctx.fill();
      L.inkPath(ctx, L.ellipsePts(fx, fb - fh * 0.9, w * 0.2, w * 0.2, 40).slice(20, 41), { width: 5, color: '#F2D27A', alpha: 0.9 * glow, seed: seed + 20 });
      L.inkPath(ctx, robe, { closed: true, width: 7, color: '#0A0709', seed: seed + 21 });
      L.inkPath(ctx, mit, { closed: true, width: 5, color: '#0A0709', seed: seed + 22 });
      L.inkPath(ctx, L.ellipsePts(fx, fb - fh * 0.86, w * 0.09, w * 0.11, 20), { closed: true, width: 5, color: '#0A0709', seed: seed + 23 });
    }
    // lead came lattice
    for (let j = -1; j < (h + w) / q + 1; j++) for (let i = -1; i < w / q + 2; i++) {
      const cx = x - w / 2 + i * q + (j % 2 ? q / 2 : 0), cy = y - j * q * 0.62;
      L.inkPath(ctx, [[cx - q / 2, cy], [cx, cy - q * 0.62], [cx + q / 2, cy]], { width: 3.2, color: '#080507', seed: seed + 100 + i * 31 + j, taper: 0, wobble: 0.8 });
    }
    ctx.restore();
    // stone tracery frame: engraved
    const frame = []; const n = 40;
    for (let i = 0; i <= n; i++) { const u = i / n; frame.push([x - w / 2 - 34, y - u * (h - w * 0.55)]); }
    const outer = [[x - w / 2 - 34, y + 30], [x - w / 2 - 34, y - h + w * 0.55], [x, y - h - w * 0.3], [x + w / 2 + 34, y - h + w * 0.55], [x + w / 2 + 34, y + 30]];
    return { outer };
  };

  // ---------------------------------------------------------------- water (engraved)
  df.water = (ctx, T, o = {}) => {
    const hz = o.horizon || 900, mx = o.moonX || 640;
    ctx.fillStyle = '#070405'; ctx.fillRect(0, hz, 1080, 1920 - hz);
    const lit = (x, y) => { const k = (y - hz) / (1920 - hz); const col = Math.exp(-Math.pow((x - mx) / (80 + k * 300), 2)); return clamp(0.24 + 0.95 * col * (0.6 + 0.4 * Math.sin(T * 3 + y * 0.08 + x * 0.02))); };
    for (let k = 1; k < 90; k++) {
      const y = hz + (1920 - hz) * (1 - 1 / (1 + k * 0.045));
      const sp = 0.5 + k * 0.12;
      const pts = [];
      for (let x = -20; x <= 1100; x += 14) pts.push([x, y + Math.sin(x * 0.02 / sp + T * 2 + k) * sp * 1.4]);
      // break the line where it's dark (engraved water is dashes)
      let run = [];
      pts.forEach((p, i) => { const l = lit(p[0], p[1]); if (l > 0.18 + 0.2 * ((i * 7 + k) % 3) / 3) run.push(p); else { if (run.length > 1) L.inkPath(ctx, run, { width: 1.5 + k * 0.03, color: '#F0D2BC', alpha: clamp(lit(run[0][0], y) * 1.5), seed: k * 13 + i, taper: [4, 8], wobble: 0.6 }); run = []; } });
      if (run.length > 1) L.inkPath(ctx, run, { width: 1.5 + k * 0.03, color: '#F0D2BC', alpha: clamp(lit(run[0][0], y) * 1.5), seed: k * 17, taper: [4, 8], wobble: 0.6 });
    }
    if (o.splash) {
      const [sx, sy, st] = o.splash;
      if (st > 0 && st < 1.6) {
        for (let k = 0; k < 4; k++) { const rr = (st - k * 0.18) * 360; if (rr <= 0) continue; L.inkPath(ctx, L.ellipsePts(sx, sy, rr, rr * 0.16, 48), { closed: true, width: 2.2, color: '#EDE0D0', alpha: 0.8 * (1 - st / 1.6), seed: 300 + k }); }
        const r = L.rng(L.hash('splash'));
        for (let i = 0; i < 46; i++) { const a = -Math.PI * (0.15 + r() * 0.7), v = 400 + r() * 700; const px = sx + Math.cos(a) * v * st * 0.6, py = sy + Math.sin(a) * v * st + 1100 * st * st; if (py > sy + 10) continue; L.inkPath(ctx, [[px, py], [px - Math.cos(a) * 14, py - Math.sin(a) * 14]], { width: 2.4, color: '#EDE0D0', alpha: 1 - st / 1.2, seed: 400 + i, taper: 3 }); }
      }
    }
  };

  // ---------------------------------------------------------------- word reveal (Fraunces), one slam allowed
  df.word = (ctx, str, x, y, size, p, o = {}) => {
    if (p <= 0) return;
    const fam = o.family || '"Fraunces", Georgia, serif', wt = o.weight || 700;
    ctx.save(); ctx.font = `${wt} ${size}px ${fam}`;
    const w = ctx.measureText(str).width * 1.08, x0 = x - w / 2, u = L.ease.outCubic(clamp(p));
    ctx.beginPath(); ctx.rect(x0 - 20, y - size, (w + 40) * u, size * 1.5); ctx.clip();
    L.text(ctx, str, x, y, { size, family: fam, weight: wt, align: 'center', baseline: 'middle', color: o.color || C.ivory, tracking: o.tracking || '0.04em', alpha: o.alpha != null ? o.alpha : 1 });
    ctx.restore();
    if (u < 1) L.glowDot(ctx, x0 + w * u, y, 6, { color: C.yellow, core: '#FFF6D8', rays: 6, rayLen: 10, glow: 18, additive: true });
    if (o.under !== false) L.inkPath(ctx, [[x0, y + size * 0.55], [x0 + w * u, y + size * 0.57]], { width: 3, color: o.ucol || C.yellow, alpha: o.alpha != null ? o.alpha : 1, seed: o.seed || 3, taper: [4, 30] });
  };

  // ---------------------------------------------------------------- the skeletal HAND (3D) + loose finger
  let CUTF = false;
  let HM = 0;
  const F_RAISED = [
    [[-0.38, -0.55, 0.1], [-0.78, -0.12, 0.28], [-0.98, 0.3, 0.32], [-1.08, 0.62, 0.3]],
    [[-0.26, -0.45, 0], [-0.31, 0.58, 0.02], [-0.34, 1.18, 0.04], [-0.36, 1.58, 0.05], [-0.37, 1.86, 0.05]],
    [[-0.02, -0.45, 0], [0, 0.62, 0.02], [0, 1.32, 0.04], [0, 1.78, 0.05], [0, 2.08, 0.05]],
  ];
  const F_FOLD = [
    [[0.2, -0.45, 0], [0.26, 0.52, 0.04], [0.3, 0.86, 0.36], [0.28, 0.62, 0.6]],
    [[0.4, -0.45, 0], [0.48, 0.38, 0.04], [0.52, 0.66, 0.32], [0.5, 0.46, 0.52]],
  ];
  function chain(x, y, z, pts, r0, upto) {
    let d = 1e9;
    for (let i = 0; i < Math.min(pts.length - 1, upto); i++) {
      const a = pts[i], b = pts[i + 1], r = r0 * (1 - i * 0.12);
      d = Math.min(d, cap(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], r));
      d = smin(d, ell(x - b[0], y - b[1], z - b[2], r * 1.35, r * 1.2, r * 1.35), 0.04);
    }
    return d;
  }
  function handSd(x, y, z, want) {
    let d = cap(x, y, z, -0.26, -2.7, 0, -0.2, -0.95, 0, 0.13);
    d = Math.min(d, cap(x, y, z, 0.24, -2.7, -0.05, 0.2, -0.95, 0, 0.11));
    d = smin(d, ell(x + 0.2, y + 0.92, z, 0.2, 0.14, 0.16), 0.05);
    d = smin(d, ell(x - 0.2, y + 0.92, z, 0.17, 0.13, 0.14), 0.05);
    for (const [cx, cy] of [[-0.3, -0.72], [-0.1, -0.7], [0.1, -0.72], [0.3, -0.74], [-0.2, -0.56], [0.0, -0.55], [0.2, -0.56], [0.36, -0.58]]) d = smin(d, ell(x - cx, y - cy, z, 0.1, 0.085, 0.1), 0.03);
    let m = 0;
    F_RAISED.forEach((f) => { d = smin(d, chain(x, y, z, f, 0.075, CUTF ? 1 : 9), 0.03); });
    F_FOLD.forEach((f) => { d = smin(d, chain(x, y, z, f, 0.07, 9), 0.03); });
    // ring on the middle finger's first phalanx
    if (!CUTF) {
      const rx = x, ry = y - 0.95, rz = z - 0.03, q = Math.hypot(rx, rz) - 0.105, tr = Math.hypot(q, ry) - 0.045;
      if (tr < d) { d = tr; m = 2; }
      const jw = ell(x, y - 0.95, z - 0.17, 0.06, 0.06, 0.05);
      if (jw < d) { d = jw; m = 3; }
    } else {
      for (const f of F_RAISED) { const b = f[1]; const st = ell(x - b[0], y - b[1], z - b[2], 0.09, 0.05, 0.09); if (st < d) { d = st; m = 11; } }
    }
    if (want) HM = m;
    return d;
  }
  df.HAND = {
    sdf: (x, y, z) => handSd(x, y, z, false), mat: (x, y, z) => { handSd(x, y, z, true); return HM; },
    col: (m) => ({ 0: rgb('#EEE4CC'), 2: rgb('#E6B652'), 3: rgb('#E0403A'), 11: rgb('#5A1A18') }[m] || [1, 1, 1]),
    uv: (m, x, y, z, o) => { o[0] = y * 1.0 + 0.3 * Math.sin(x * 3); o[1] = (x - z) * 0.8; },
    bound: [-0.1, -0.3, 0.1, 2.6],
  };
  df.hand = (ctx, cx, cy, H, o = {}) => { CUTF = !!o.cut; return df.r3d(ctx, { cx, cy, unit: H / 4.9, win: [-1.5, 1.2, -2.8, 2.25], yaw: o.yaw || 0, pitch: o.pitch || 0, roll: o.roll || 0, res: o.res || 0.38, spacing: o.spacing || 6, slot: o.slot || 5, key: [-0.6, 0.25, 0.75], fill: [0.7, -0.1, 0.5], rim: [0.75, 0.4, -0.5], flat: 0.05 }, df.HAND); };
  // a loose finger (3 phalanges) for the tumble
  const FING = [[0, -0.55, 0], [0, 0.0, 0], [0, 0.42, 0], [0, 0.72, 0]];
  df.FINGER = { sdf: (x, y, z) => chain(x, y, z, FING, 0.085, 9), mat: () => 0, col: () => rgb('#EEE4CC'), uv: (m, x, y, z, o) => { o[0] = y; o[1] = x + z; }, bound: [0, 0.08, 0, 0.9] };
  df.finger = (ctx, cx, cy, H, o = {}) => df.r3d(ctx, { cx, cy, unit: H / 1.5, win: [-0.8, 0.8, -0.8, 0.95], yaw: o.yaw || 0, pitch: o.pitch || 0, roll: o.roll || 0, res: 0.45, spacing: 5, slot: 20 + (o.slot || 0), key: [-0.6, 0.3, 0.75], flat: 0.06 }, df.FINGER);
})();

/* ===================================================================== episode 6 — THE MAN IN THE IRON MASK
 * df.BUST    3D masked bust: head under a riveted iron mask (eye slits, mouth grille, strap) that can morph to black
 *            velvet (o.velvet 0..1 sweeps top→bottom), baroque hair, lace cravat, coat. No face is ever shown.
 * df.BASTILLE 3D fortress: eight crenellated towers + curtain walls.
 * df.person  2D jointed human (≈7.5 heads tall): head, tricorne, long coat, breeches, boots, sword; walk/stand/hand-on-hilt;
 *            engraved and rim-lit, real knee/elbow articulation. Faces are never drawn.
 */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, { ell, smin, ssub, box, cap } = df.sd;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const abs = Math.abs, sqrt = Math.sqrt;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };

  // ------------------------------------------------------------------ the masked bust
  let VEL = 0, BM = 0;
  function bustSd(x, y, z, want) {
    const ax = abs(x);
    let d = ell(x, y - 0.2, z, 0.76, 1.0, 0.84);
    d = smin(d, ell(x, y + 0.62, z - 0.2, 0.52, 0.42, 0.52), 0.25);
    d = smin(d, cap(x, y, z, 0, -0.7, -0.12, 0, -1.65, -0.1, 0.38), 0.18);
    let body = ell(x, y + 2.55, z + 0.02, 1.2, 1.1, 0.72);
    body = smin(body, ell(ax - 0.78, y + 1.98, z + 0.02, 0.62, 0.36, 0.55), 0.3);
    body = Math.max(body, -(y + 3.05 - 0.25 * (1 - x * x / 2.2)));
    d = smin(d, body, 0.22);
    let m = 7;
    // hair: crown + long side locks with curls
    const curl = 0.045 * Math.sin(y * 13 + ax * 4) * Math.sin(ax * 11 + z * 6);
    let hair = ell(x, y - 0.38, z + 0.3, 0.9, 1.04, 0.86) + curl;
    hair = smin(hair, ell(ax - 0.72, y + 0.85, z + 0.12, 0.34, 1.15, 0.45) + curl, 0.2);
    hair = Math.max(hair, -(z - 0.15 - 0.25 * clamp(y - 0.6)) - 0.0);
    if (hair < d) { d = hair; m = 2; }
    // lace cravat
    const lace = ell(x, y + 1.72, z - 0.42, 0.3 + 0.025 * Math.sin(y * 24), 0.34, 0.2) + 0.015 * Math.sin(x * 30);
    if (lace < d) { d = lace; m = 3; }
    // the mask: a shell over the front of the face, eye slits, strap round the head
    let mk = Math.max(ell(x, y - 0.05, z - 0.05, 0.82, 1.06, 0.92), z < 0.12 ? 0.12 - z : -1, y - 0.98, -(y + 1.02));
    mk = Math.max(mk, -(ell(x, y - 0.05, z - 0.05, 0.78, 1.02, 0.88)));
    mk = ssub(ell(ax - 0.3, y - 0.08, z - 0.86, 0.16, 0.075, 0.4), mk, 0.02);
    const strap = Math.max(abs(ell(x, y - 0.05, z - 0.02, 0.8, 1.04, 0.9)) - 0.02, abs(y - 0.45) - 0.07, -(ell(x, y - 0.42, z + 0.3, 0.93, 1.0, 0.88)) - 0.03);
    mk = Math.min(mk, strap);
    if (mk < d) { d = mk; m = 4; }
    if (want) {
      if (m === 4) {
        const vel = y > lerp(1.3, -1.4, VEL);
        if (vel) m = 5;
        else {
          if (y < -0.42 && y > -0.78 && z > 0.5 && ax < 0.36 && Math.sin(x * 46) > 0.3) m = 6;           // grille slits
          const edge = abs(ell(x, y - 0.05, z - 0.05, 0.82, 1.06, 0.92));
          if ((y > 0.9 || y < -0.95 || abs(y - 0.45) < 0.07) && Math.sin(Math.atan2(x, z) * 22) > 0.85) m = 8;   // rivets
        }
      } else if (m === 7 && y > -1.6 && y < -0.5) m = 1;  // neck shows pale
      BM = m;
    }
    return d;
  }
  df.BUST = {
    sdf: (x, y, z) => bustSd(x, y, z, false), mat: (x, y, z) => { bustSd(x, y, z, true); return BM; },
    col: (m) => ({ 1: rgb('#E2C4AC'), 2: rgb('#9A7658'), 3: rgb('#F2ECE0'), 4: rgb('#B8C2D0'), 5: rgb('#6A5E78'), 6: rgb('#141218'), 7: rgb('#3A4E86'), 8: rgb('#E8D8A8') }[m] || [1, 1, 1]),
    uv: (m, x, y, z, o) => {
      if (m === 2) { o[0] = y + 0.22 * Math.sin(x * 6 + z * 3); o[1] = Math.atan2(x, z) * 0.8; }
      else if (m === 4 || m === 6 || m === 8) { o[0] = y; o[1] = Math.atan2(x, z) * 0.9; }
      else if (m === 5) { o[0] = y * 0.9 + 0.1 * Math.sin(x * 4); o[1] = x * 0.7; }
      else { o[0] = y; o[1] = (x + z) * 0.7; }
    },
    bound: [0, -0.7, 0, 2.6],
  };
  /** bust(ctx, cx, cy, H, o) : (cx,cy) = screen point of the head centre; H = head height px (≈2.1 units). */
  df.bust = (ctx, cx, cy, H, o = {}) => {
    VEL = clamp(o.velvet || 0);
    const unit = H / 2.1;
    const r = df.r3d(ctx, { cx, cy, unit, win: [-2.1, 2.1, -3.0, 1.45], yaw: o.yaw || 0, pitch: o.pitch || 0.05, roll: o.roll || 0, res: o.res || 0.36, spacing: o.spacing || 6.0, slot: o.slot || 0,
      key: o.key || [-0.6, 0.35, 0.72], fill: [0.7, -0.1, 0.5], rim: [0.8, 0.35, -0.5], flat: 0.05, warm: o.warm }, df.BUST);
    // eyes in the slits: two cold glints (the only life in the face)
    const g = o.glint != null ? o.glint : 0.8;
    if (g > 0) for (const sx of [-0.3, 0.3]) { const [ex, ey] = r.proj(sx, -0.08, 0.72); L.glowDot(ctx, ex, ey, unit * 0.022, { color: '#DDE8FF', core: '#FFFFFF', rays: 0, glow: unit * 0.08, intensity: g, additive: true }); }
    return r;
  };

  // ------------------------------------------------------------------ the Bastille
  const TW = [[-1.7, -3.2], [1.7, -3.2], [-1.9, -1.05], [1.9, -1.05], [-1.9, 1.05], [1.9, 1.05], [-1.7, 3.2], [1.7, 3.2]];
  let BB = 0;
  function bastSd(x, y, z, want) {
    let d = 1e9, m = 0;
    for (const [tx, tz] of TW) {
      const dx = x - tx, dz = z - tz, rho = sqrt(dx * dx + dz * dz);
      const crenel = y > 3.9 ? (Math.sin(Math.atan2(dx, dz) * 9) > 0 ? 0 : 0.18) : 0;
      const t = Math.max(rho - 0.78 - 0.04 * clamp(-y + 0.5), abs(y - 1.9) - 1.9 - 0.12 + crenel);
      if (t < d) { d = t; m = 0; }
    }
    // curtain walls (perimeter)
    const wall = box(x, y - 1.55, z, 1.85, 1.6, 3.2);
    const inner = box(x, y - 2.2, z, 1.55, 2.6, 2.9);
    const w = Math.max(wall, -inner);
    if (w < d) { d = w; m = 0; }
    if (want) {
      if (m === 0) {
        // windows: small dark slits in a grid
        const fx = Math.sin(y * 6.5), fa = Math.sin((x + z) * 7.3);
        if (y > 0.6 && y < 3.6 && fx > 0.9 && fa > 0.75) m = 1;
      }
      BB = m;
    }
    return d;
  }
  df.BASTILLE = {
    sdf: (x, y, z) => bastSd(x, y, z, false), mat: (x, y, z) => { bastSd(x, y, z, true); return BB; },
    col: (m) => ({ 0: rgb('#D8CFC2'), 1: rgb('#F3B04B'), 2: rgb('#6A6058') }[m]),
    uv: (m, x, y, z, o) => { if (m === 2) { o[0] = z * 0.8 + x * 0.3; o[1] = x; } else { o[0] = y * 1.2; o[1] = Math.atan2(x, z) * 2.2; } },
    bound: [0, 2.0, 0, 5.4],
  };
  df.bastille = (ctx, cx, cy, unit, o = {}) => df.r3d(ctx, { cx, cy, unit, win: [-4.6, 4.6, -1.2, 6.6], yaw: o.yaw || 0.6, pitch: o.pitch != null ? o.pitch : -0.2, res: o.res || 0.34, spacing: o.spacing || 5.5, slot: o.slot || 6,
    key: o.key || [0.85, 0.45, 0.25], fill: [-0.6, 0.2, 0.5], rim: [-0.7, 0.4, -0.6], flat: 0.05, camD: 30, warm: o.warm || [0.85, 0.88, 1.0] }, df.BASTILLE);

  // ------------------------------------------------------------------ the jointed human (2D, engraved, faceless)
  // Units: px at s = 1, feet at (0,0), ≈ 360 px tall. Pose: { walk ph | stand, hilt 0..1 (hand to sword), look -1..1 }
  df.person = (ctx, X, Y, s, T, o = {}) => {
    const lit = o.light || (() => 0.4), ink = o.ink || df.C.bone, seed = o.seed || 3;
    const fl = o.flip ? -1 : 1;
    const walk = !!o.walk, ph = o.ph != null ? o.ph : T * 6.5;
    const breathe = Math.sin(T * 2.1) * 1.2;
    const P = (x, y) => [X + x * s * fl, Y + y * s];
    const bob = walk ? Math.abs(Math.sin(ph)) * 5 : 0;
    const hip = [0, -170 - bob], chest = [0, -262 - bob + breathe * 0.4], neck = [0, -300 - bob + breathe * 0.3], head = [3, -322 - bob + breathe * 0.2];
    const leg = (side) => {
      const a = walk ? Math.sin(ph + (side > 0 ? 0 : Math.PI)) : 0;
      const th = a * 0.42, kn = walk ? Math.max(0, -Math.cos(ph + (side > 0 ? 0 : Math.PI))) * 0.75 + 0.05 : 0.04;
      const hp = [hip[0] + side * 9, hip[1]];
      const k = [hp[0] + Math.sin(th) * 82, hp[1] + Math.cos(th) * 82];
      const ank = [k[0] + Math.sin(th - kn) * 84, k[1] + Math.cos(th - kn) * 84];
      return { hp, k, ank, toe: [ank[0] + 24, ank[1] + 2] };
    };
    const arm = (side, hilt) => {
      const a = walk ? -Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 0.35 : 0.06 * side;
      const sh = [side * 22, -292 - bob + breathe * 0.3];
      let el = [sh[0] + Math.sin(a) * 60 + side * 6, sh[1] + Math.cos(a) * 60];
      let hd = [el[0] + Math.sin(a + 0.25) * 58, el[1] + Math.cos(a + 0.25) * 58];
      if (hilt > 0) { const tgt = [-26, -178]; el = [lerp(el[0], -40, hilt), lerp(el[1], -232, hilt)]; hd = [lerp(hd[0], tgt[0], hilt), lerp(hd[1], tgt[1], hilt)]; }
      return { sh, el, hd };
    };
    const limb = (pts, w0, w1, col, sd, dark) => {
      // tapered limb polygon from a polyline
      const left = [], right = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = lerp(w0, w1, i / (pts.length - 1)) / 2;
        left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); right.unshift([pts[i][0] - nx * w, pts[i][1] - ny * w]);
      }
      df.engrave(ctx, left.concat(right).map(([a, b]) => P(a, b)), { ink: col, base: dark || '#0A0809', light: lit, angle: 1.3 * fl, spacing: 4.4, width: 1, seed: sd, outW: 2.2, cross: false });
    };
    const Lb = leg(-1), Lf = leg(1);
    const Ab = arm(-1, 0), Af = arm(1, clamp(o.hilt || 0));
    // back limbs
    limb([Ab.sh, Ab.el, Ab.hd], 26, 18, ink, seed + 1);
    limb([Lb.hp, Lb.k, Lb.ank], 30, 20, ink, seed + 2);
    limb([[Lb.k[0], Lb.k[1] + 10], Lb.ank, Lb.toe], 26, 20, '#8A7A6A', seed + 3, '#050404');
    // sword (scabbard at the left hip)
    L.inkPath(ctx, [P(-30, -176), P(-58, -40)], { width: 6 * s, color: '#C8BCA8', seed: seed + 4, taper: 2 });
    L.inkPath(ctx, [P(-34, -190), P(-20, -168)], { width: 4 * s, color: df.C.gold, seed: seed + 5, taper: 1 });
    // long coat (justaucorps): flares from the waist, swings with the stride
    const sw = walk ? Math.sin(ph) * 10 : 0;
    const coat = [[-30, -300], [-38, -250], [-40, -190], [-60 - sw, -96], [-12, -84], [12, -84], [60 - sw, -96], [40, -190], [38, -250], [30, -300], [12, -306], [-12, -306]];
    df.engrave(ctx, coat.map(([a, b]) => P(a, b - bob)), { ink, light: lit, angle: -1.4 * fl, spacing: 4.6, seed: seed + 6, outW: 2.6 });
    df.lines(ctx, [[[0, -300], [2, -200], [0, -86]], [[-22, -200], [-34, -96]], [[22, -200], [34, -96]]].map((ln) => ln.map(([a, b]) => P(a, b - bob))), lit, { w: 1.6, seed: seed + 7 });
    for (let k = 0; k < 6; k++) { const [bx, by] = P(5, -290 + k * 18 - bob); L.inkPath(ctx, L.ellipsePts(bx, by, 2.6 * s, 2.6 * s, 8), { closed: true, width: 1, color: '#000', fill: df.C.gold, seed: seed + 20 + k }); }
    // front limbs
    limb([Lf.hp, Lf.k, Lf.ank], 30, 20, ink, seed + 8);
    limb([[Lf.k[0], Lf.k[1] + 10], Lf.ank, Lf.toe], 26, 20, '#8A7A6A', seed + 9, '#050404');
    limb([Af.sh, Af.el, Af.hd], 26, 18, ink, seed + 10);
    df.engrave(ctx, L.ellipsePts(...P(Af.hd[0], Af.hd[1]), 8 * s, 9 * s, 10), { ink: '#E2C4AC', light: (a, b) => lit(a, b) + 0.2, spacing: 3, seed: seed + 11, outW: 1.5, cross: false, stip: false });
    // neck, head (seen in shadow — no features), hair tied back, tricorne
    df.engrave(ctx, L.ellipsePts(...P(neck[0], neck[1]), 9 * s, 14 * s, 12), { ink: '#E2C4AC', light: lit, spacing: 3.4, seed: seed + 12, outW: 1.6, cross: false });
    const hd = L.ellipsePts(...P(head[0], head[1]), 19 * s, 24 * s, 24, 0.08 * fl);
    df.engrave(ctx, hd, { ink: '#E2C4AC', light: (a, b) => lit(a, b) * 0.7, angle: 0.4, spacing: 3.6, seed: seed + 13, outW: 2.2 });
    df.engrave(ctx, [[-20, -330], [-24, -300], [-14, -288], [-8, -312]].map(([a, b]) => P(a, b - bob)), { ink: '#B8A08A', light: lit, spacing: 3, seed: seed + 14, outW: 1.6, cross: false });
    const hat = [[-40, -332], [-30, -350], [-12, -362], [14, -360], [32, -350], [44, -334], [16, -340], [0, -344], [-18, -340]];
    df.engrave(ctx, hat.map(([a, b]) => P(a, b - bob)), { ink: o.hatInk || '#8A8098', base: '#050405', light: lit, angle: 0.1, spacing: 3.8, seed: seed + 15, outW: 2.4 });
    L.inkPath(ctx, [P(-40, -333 - bob), P(0, -342 - bob), P(44, -335 - bob)], { width: 2 * s, color: df.C.gold, alpha: 0.85, seed: seed + 16 });
  };
})();

/* ep6 2D helpers: fleur-de-lis, the Sun King medallion (coin flip via cosFlip), a small mask icon */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, C = df.C;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  df.fleur = (ctx, x, y, s, lit, seed = 1, ink) => {
    const P = (pts) => pts.map(([a, b]) => [x + a * s, y + b * s]);
    const col = ink || C.gold, l = typeof lit === 'function' ? lit : () => lit;
    df.engrave(ctx, P([[0, -110], [24, -70], [26, -20], [12, 20], [0, 34], [-12, 20], [-26, -20], [-24, -70]]), { ink: col, light: l, spacing: 3.4, width: 1, seed, outW: 2, cross: false, stip: false });
    for (const sd of [-1, 1]) df.engrave(ctx, P([[sd * 14, 10], [sd * 50, -30], [sd * 86, -40], [sd * 96, -14], [sd * 70, 0], [sd * 56, 22], [sd * 30, 30]]), { ink: col, light: l, spacing: 3.4, width: 1, seed: seed + (sd > 0 ? 2 : 3), outW: 2, cross: false, stip: false });
    df.engrave(ctx, P([[-52, 26], [52, 26], [52, 44], [-52, 44]]), { ink: col, light: l, spacing: 3, width: 1, seed: seed + 5, outW: 2, cross: false, stip: false, smooth: false });
    df.engrave(ctx, P([[-10, 44], [10, 44], [16, 84], [0, 100], [-16, 84]]), { ink: col, light: l, spacing: 3, width: 1, seed: seed + 6, outW: 2, cross: false, stip: false });
  };
  const PROFILE = [[-0.05, -0.62], [0.12, -0.55], [0.2, -0.42], [0.22, -0.31], [0.25, -0.24], [0.37, -0.11], [0.27, -0.06], [0.28, 0.0], [0.24, 0.04], [0.27, 0.08], [0.23, 0.19], [0.13, 0.26], [0.1, 0.42], [0.36, 0.64], [-0.5, 0.64], [-0.22, 0.32], [-0.36, -0.2]];
  df.medallion = (ctx, x, y, R, cf, T) => {
    const k = Math.max(0.04, Math.abs(cf));
    ctx.save(); ctx.translate(x, y); ctx.scale(k, 1);
    const lit = (a, b) => clamp(0.85 - Math.hypot(a - x + R * 0.4 * k, b - y + R * 0.4) / (R * 2.2));
    // edge thickness (3D coin)
    df.engrave(ctx, L.ellipsePts(0, 0, R, R, 64).map(([a, b]) => [a + 10 * (cf > 0 ? 1 : -1), b]), { ink: '#8A6A2A', base: '#2A1A06', light: () => 0.35, spacing: 3, seed: 900, outW: 2.4, cross: false, stip: false });
    df.engrave(ctx, L.ellipsePts(0, 0, R, R, 64), { ink: C.gold, base: '#4A3208', light: (a, b) => lit(x + a * k, y + b), angle: -0.7, spacing: 4, seed: 901, outW: 3 });
    L.inkPath(ctx, L.ellipsePts(0, 0, R * 0.88, R * 0.88, 64), { closed: true, width: 3, color: '#2A1A06', seed: 902 });
    if (cf > 0) {
      // wig: a cascade of curls behind the profile
      const S = R * 1.05;
      const wig = [[-0.02, -0.66], [-0.3, -0.62], [-0.5, -0.4], [-0.58, -0.1], [-0.62, 0.25], [-0.5, 0.58], [-0.25, 0.66], [-0.15, 0.3], [-0.05, -0.1], [0.08, -0.5]].map(([a, b]) => [a * S, b * S]);
      df.engrave(ctx, wig, { ink: '#FFE6A0', base: '#6A4A10', light: (a, b) => lit(x + a * k, y + b) + 0.1, angle: 1.2, spacing: 3.4, seed: 905, outW: 2.4 });
      const rr = L.rng(L.hash('curls'));
      for (let i = 0; i < 22; i++) { const cx = (-0.45 + rr() * 0.4) * S, cy = (-0.55 + rr() * 1.15) * S, sp = []; for (let a = 0; a < Math.PI * 2.6; a += 0.3) sp.push([cx + Math.cos(a) * (2 + a * 3.2) * S / 200, cy + Math.sin(a) * (2 + a * 3.2) * S / 200]); L.inkPath(ctx, sp, { width: 1.8, color: '#3A2406', alpha: 0.85, seed: 910 + i }); }
      const prof = PROFILE.map(([a, b]) => [a * S, b * S]);
      df.engrave(ctx, prof, { ink: '#FFE6A0', base: '#8A6418', light: (a, b) => lit(x + a * k, y + b) + 0.15, angle: -0.9, spacing: 3.4, seed: 940, outW: 2.6 });
      L.text(ctx, 'LUDOVICUS · MAGNUS · REX', 0, R * 0.78, { size: R * 0.09, family: '"Fraunces", serif', weight: 700, align: 'center', color: '#3A2406' });
    }
    ctx.restore();
  };
  df.maskIcon = (ctx, x, y, s, seed = 1) => {
    const pts = L.ellipsePts(x, y, 26 * s, 34 * s, 24);
    df.engrave(ctx, pts, { ink: '#C8D0DC', base: '#1A1C24', light: () => 0.6, spacing: 3, seed, outW: 2, cross: false, stip: false });
    for (const sx of [-1, 1]) { ctx.fillStyle = '#000'; ctx.fillRect(x + sx * 10 * s - 7 * s, y - 6 * s, 14 * s, 4 * s); }
  };
})();

/* ep7 kit FILM.pb — the man and the beam. A sculpted engraved 3D head (classical-bust realism, no cartoon features),
   with the proton beam's entry/exit, a swelling parameter for the left half of the face, and burn scars. */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, { ell, smin, ssub, box, cap } = df.sd;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const abs = Math.abs, sqrt = Math.sqrt;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };
  const pb = {};
  // beam path in head units: in at the back of the head, out beside the left nostril (subject's left = +x)
  pb.BEAM_IN = [0.2, 0.02, -0.92];
  pb.BEAM_OUT = [0.15, -0.56, 0.97];
  let SW = 0, SC = 0, HM = 0, XR = 0;
  const segD = (x, y, z, a, b) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2], bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz));
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h);
  };
  function headSd(x, y, z, want) {
    const ax = abs(x);
    // swelling: the subject's left half (x > 0) puffs out around cheek and eye
    const sw = SW * clamp(x / 0.22 + 0.15) * Math.exp(-((y + 0.32) * (y + 0.32)) / 0.3) * clamp(z + 0.6);
    // cranium + face + jaw (adult male proportions: long face, defined jaw angle)
    let d = ell(x, y - 0.2, z + 0.12, 0.7, 0.84, 0.86);
    d = smin(d, ell(x, y + 0.34, z - 0.18, 0.56, 0.84, 0.64), 0.26);
    d = smin(d, ell(x, y + 0.86, z - 0.24, 0.44, 0.3, 0.48), 0.2);
    d = smin(d, ell(ax - 0.36, y + 0.72, z + 0.02, 0.12, 0.24, 0.24), 0.16);            // jaw angle
    d = smin(d, ell(x, y + 1.08, z - 0.56, 0.19, 0.13, 0.16), 0.12);                    // chin
    d = smin(d, ell(ax - 0.36, y + 0.2, z - 0.46, 0.19, 0.12, 0.18), 0.14);             // cheekbones
    d += 0.03 * Math.exp(-(((ax - 0.33) / 0.13) ** 2 + ((y + 0.55) / 0.18) ** 2 + ((z - 0.45) / 0.2) ** 2));   // cheek hollows
    d = smin(d, ell(x, y + 0.0, z - 0.66, 0.5, 0.1, 0.13), 0.12);                      // brow ridge
    d = ssub(ell(ax - 0.24, y + 0.16, z - 0.8, 0.17, 0.1, 0.16), d, 0.07);             // deep sockets
    d = smin(d, sqrt((ax - 0.24) * (ax - 0.24) + (y + 0.17) * (y + 0.17) + (z - 0.6) * (z - 0.6)) - 0.11, 0.03);
    d = smin(d, ell(ax - 0.24, y + 0.12, z - 0.665, 0.14, 0.05, 0.085), 0.025);         // upper lids
    // nose: strong bridge, tip, wings
    d = smin(d, cap(x, y, z, 0, -0.08, 0.76, 0, -0.52, 0.99, 0.07), 0.08);
    d = smin(d, ell(x, y + 0.56, z - 0.95, 0.11, 0.1, 0.1), 0.06);
    d = smin(d, ell(ax - 0.1, y + 0.62, z - 0.83, 0.08, 0.065, 0.075), 0.05);
    d = ssub(ell(ax - 0.07, y + 0.66, z - 0.89, 0.032, 0.024, 0.045), d, 0.015);
    // mouth
    d = smin(d, ell(x, y + 0.79, z - 0.76, 0.21, 0.042, 0.08), 0.04);
    d = smin(d, ell(x, y + 0.88, z - 0.73, 0.18, 0.05, 0.08), 0.04);
    d = ssub(box(x, y + 0.835, z - 0.84, 0.2, 0.006, 0.08), d, 0.012);
    // ears
    let ear = ell(ax - 0.71, y + 0.22, z + 0.04, 0.08, 0.25, 0.15);
    ear = ssub(ell(ax - 0.76, y + 0.2, z + 0.02, 0.05, 0.17, 0.09), ear, 0.03);
    d = smin(d, ear, 0.05);
    d -= sw * 0.12;
    // neck, shoulders, ribbed crew-neck sweater
    d = smin(d, cap(x, y, z, 0, -0.85, -0.16, 0, -1.6, -0.1, 0.36), 0.18);
    let m = 1;
    let jum = ell(x, y + 2.12, z + 0.1, 1.62, 0.74, 0.52);
    jum = smin(jum, ell(ax - 1.02, y + 1.66, z + 0.1, 0.55, 0.28, 0.42), 0.32);
    jum = smin(jum, ell(x, y + 1.42, z + 0.1, 0.46, 0.12, 0.44), 0.1);                   // ribbed collar
    jum = Math.max(jum, -(y + 2.95));
    if (jum < d + 0.02 && y < -1.28) { d = smin(d, jum, 0.03); m = 4; }
    // hair: short, combed back; receding a touch at the temples
    const hl = lerp(-0.66, 0.52, clamp((z + 0.35) / 1.0)) - 0.16 * clamp((ax - 0.3) * 2.5) * clamp(z * 2);
    let hair = ell(x, y - 0.25, z + 0.1, 0.75, 0.87, 0.93) + 0.006 * Math.sin(x * 34 + z * 9 + y * 5);
    hair = Math.max(hair, hl - y);
    hair = Math.max(hair, ax - 0.77);
    if (hair < d) { d = smin(d, hair, 0.02); m = 2; }
    if (want) {
      if (m === 1 && SC > 0 && (segD(x, y, z, pb.BEAM_IN, pb.BEAM_IN) < 0.09 * SC || segD(x, y, z, pb.BEAM_OUT, pb.BEAM_OUT) < 0.07 * SC)) m = 6;
      HM = m;
    }
    return d;
  }
  pb.HEAD = {
    sdf: (x, y, z) => headSd(x, y, z, false), mat: (x, y, z) => { headSd(x, y, z, true); return HM; },
    col: (m) => (XR ? { 1: rgb('#9FE6F2'), 2: rgb('#6FB8D0'), 3: rgb('#7FC8DA'), 4: rgb('#4A8AB0'), 5: rgb('#9FE6F2'), 6: rgb('#F2C230') }[m] : { 1: rgb('#E8CDB4'), 2: rgb('#6E5A50'), 3: rgb('#F2ECE0'), 4: rgb('#4E5874'), 6: rgb('#D8443A') }[m]) || [1, 1, 1],
    uv: (m, x, y, z, o) => {
      if (m === 2) { o[0] = z * 1.1 + 0.15 * Math.sin(x * 5); o[1] = Math.atan2(x, z) * 0.8; }
      else if (m === 4) { const rib = y > -1.58; o[0] = rib ? Math.atan2(x, z) * 2.2 : y + 0.06 * Math.sin(x * 3); o[1] = rib ? y : x * 0.8; }
      else { o[0] = y * 0.95 + 0.05 * Math.sin(x * 4); o[1] = (x + z * 0.6) * 0.75; }
    },
    bound: [0, -0.9, 0, 2.7],
  };
  /** head(ctx, cx, cy, H, o) : (cx,cy) = screen point of head centre; H = head height px (≈2.2 units).
   *  o: yaw pitch roll res spacing slot key swell scar xray. Returns r3d { proj }. */
  pb.head = (ctx, cx, cy, H, o = {}) => {
    SW = clamp(o.swell || 0); SC = clamp(o.scar || 0); XR = o.xray ? 1 : 0;
    const unit = H / 2.2;
    return df.r3d(ctx, { cx, cy, unit, win: o.win || [-2.1, 2.1, -3.1, 1.25], yaw: o.yaw || 0, pitch: o.pitch || 0.04, roll: o.roll || 0, res: o.res || 0.36, spacing: o.spacing || 7.5, slot: o.slot || 0,
      key: o.key || [-0.55, 0.4, 0.72], fill: o.fill || [0.7, -0.1, 0.5], rim: o.rim || [0.8, 0.35, -0.5], flat: o.flat != null ? o.flat : 0.1, warm: o.warm }, pb.HEAD);
  };
  FILM.pb = pb;
})();

/* ep7 kit FILM.pb (2): the beam, sliced type, suns, USSR map, engraved panels */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, pb = FILM.pb, C = df.C;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  pb.SERIF = '"Fraunces", Georgia, serif';
  pb.MONO = '"JetBrains Mono", ui-monospace, monospace';
  pb.Y = '#F2C230'; pb.IV = '#F2E8D0'; pb.NAVY = '#0D1630'; pb.OR = '#D45F1E'; pb.RED = '#C8321E'; pb.CY = '#7FD8E8';

  /** extend segment a→b to cross the whole frame (returns two points beyond the frame edges) */
  pb.extend = (a, b, k = 3000) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [[a[0] - dx / l * k, a[1] - dy / l * k], [b[0] + dx / l * k, b[1] + dy / l * k]]; };
  /** the proton beam: a hot white core in yellow glow, with particles streaming a→b. o: k (0..1 intensity), T, w (core px), from/to (0..1 drawn span), dots */
  pb.beam = (ctx, a, b, o = {}) => {
    const k = o.k != null ? o.k : 1; if (k <= 0) return;
    const f0 = o.from || 0, f1 = o.to != null ? o.to : 1;
    const A = [lerp(a[0], b[0], f0), lerp(a[1], b[1], f0)], B = [lerp(a[0], b[0], f1), lerp(a[1], b[1], f1)];
    const w = o.w || 5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const lay = [[w * 9, 0.06], [w * 4.5, 0.12], [w * 2.2, 0.3], [w, 0.9]];
    lay.forEach(([lw, al], i) => { ctx.strokeStyle = i === 3 ? `rgba(255,250,228,${al * k})` : `rgba(242,194,48,${al * k})`; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); });
    if (o.dots !== false) {
      const L_ = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), uy = (b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1);
      const sp = o.speed || 2400, gap = o.gap || 46, T = o.T || 0, r = L.rng(L.hash('beamdots', o.seed || 1));
      const off = (T * sp) % gap;
      for (let s = off; s < L_; s += gap) {
        const j = (r() - 0.5) * w * 1.4, x = A[0] + ux * s - uy * j, y = A[1] + uy * s + ux * j;
        ctx.fillStyle = `rgba(255,246,210,${0.85 * k})`; ctx.beginPath(); ctx.arc(x, y, w * 0.55, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,220,120,${0.35 * k})`; ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - ux * w * 5, y - uy * w * 5); ctx.stroke();
      }
    }
    ctx.restore();
  };
  /** a burst of light at a point (gradient = light only) */
  pb.burst = (ctx, x, y, r, k = 1, col = '255,226,140') => {
    if (k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,252,236,${k})`); g.addColorStop(0.18, `rgba(${col},${0.55 * k})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  /** engraved light rays (ink strokes, not a gradient) radiating from (x,y) */
  pb.rays = (ctx, x, y, r0, r1, n, k, seed = 1, col = pb.Y, T = 0) => {
    if (k <= 0) return;
    const rr = L.rng(L.hash('rays', seed));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rr() * 0.05, l0 = r0 * (0.9 + rr() * 0.3), l1 = r1 * (0.55 + rr() * 0.6) * (0.9 + 0.1 * Math.sin(T * 9 + i));
      L.inkPath(ctx, [[x + Math.cos(a) * l0, y + Math.sin(a) * l0], [x + Math.cos(a) * l1, y + Math.sin(a) * l1]], { width: 2 + rr() * 2.5, color: col, alpha: k * (0.5 + rr() * 0.5), seed: seed * 50 + i, taper: [2, 40] });
    }
  };
  /** type sliced by a line through (x,y) at angle ang: halves pushed apart by gap px along the normal */
  pb.slice = (ctx, str, x, y, size, ang, gap, o = {}) => {
    const fam = o.family || pb.SERIF, wt = o.weight || 700, col = o.color || pb.IV, al = o.alpha != null ? o.alpha : 1;
    const nx = -Math.sin(ang), ny = Math.cos(ang), BIG = 3000;
    for (const side of [-1, 1]) {
      ctx.save();
      // clip half-plane
      ctx.beginPath();
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const p1 = [x - ux * BIG, y - uy * BIG], p2 = [x + ux * BIG, y + uy * BIG];
      ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p2[0] + nx * side * BIG, p2[1] + ny * side * BIG); ctx.lineTo(p1[0] + nx * side * BIG, p1[1] + ny * side * BIG); ctx.closePath(); ctx.clip();
      const sh = side * gap / 2, slide = side * (o.slide || 0);
      L.text(ctx, str, x + nx * sh + ux * slide, y + ny * sh + uy * slide, { size, family: fam, weight: wt, align: 'center', baseline: 'middle', color: col, alpha: al, tracking: o.tracking || '0.02em' });
      ctx.restore();
    }
  };
  /** kinetic word: mask reveal from a direction + slight scale settle. p 0..1 */
  pb.word = (ctx, str, x, y, size, p, o = {}) => {
    if (p <= 0) return;
    const u = L.ease.outCubic(clamp(p)), fam = o.family || pb.SERIF, wt = o.weight || 700;
    ctx.save(); ctx.font = `${wt} ${size}px ${fam}`;
    const w = ctx.measureText(str).width * 1.06;
    const dir = o.dir || 'up';
    ctx.beginPath();
    if (dir === 'up') ctx.rect(x - w, y - size * 0.75, w * 2, size * 1.5);
    else ctx.rect(x - w / 2 - 20, y - size, (w + 40) * u, size * 2);
    ctx.clip();
    const dy = dir === 'up' ? (1 - u) * size * 0.9 : 0;
    L.text(ctx, str, x, y + dy, { size, family: fam, weight: wt, align: o.align || 'center', baseline: 'middle', color: o.color || pb.IV, alpha: o.alpha != null ? o.alpha : 1, tracking: o.tracking || '0.02em' });
    ctx.restore();
  };
  /** small engraved sun (disc + rays), for the thousand suns */
  pb.sun = (ctx, x, y, r, k, seed = 1) => {
    if (k <= 0) return;
    const s = r * L.ease.outBack(clamp(k));
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
    ctx.fillStyle = '#FFF1C0'; ctx.beginPath(); ctx.arc(x, y, s * 0.45, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + seed; ctx.strokeStyle = pb.Y; ctx.lineWidth = Math.max(1, s * 0.12); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62); ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.stroke(); }
    ctx.restore();
  };
  /** plate: midnight-navy engraved blueprint with paper grain */
  pb.plate = (ctx, o = {}) => {
    L.paper(ctx, { color: o.color || '#0B1226', seed: o.seed || 7, grain: 1.4, fibres: 0.5, mottle: 1.2, vignette: o.vignette != null ? o.vignette : 0.7 });
  };
  pb.grid = (ctx, a = 0.12, step = 60, ox = 0, oy = 0) => {
    ctx.save(); ctx.strokeStyle = `rgba(127,180,232,${a})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = ((ox % step) + step) % step; x < 1080; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, 1920); }
    for (let y = ((oy % step) + step) % step; y < 1920; y += step) { ctx.moveTo(0, y); ctx.lineTo(1080, y); }
    ctx.stroke(); ctx.restore();
  };
  /** mono label with a tick leader */
  pb.label = (ctx, str, x, y, p, o = {}) => {
    if (p <= 0) return;
    const sz = o.size || 30, al = clamp(p * 1.4);
    ctx.save(); ctx.font = `600 ${sz}px ${pb.MONO}`;
    const w = ctx.measureText(str).width + sz * 0.9 + str.length * sz * 0.12;
    const u = L.ease.outCubic(clamp(p)), ax = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.beginPath(); ctx.rect(ax - 4, y - sz, w * u + 8, sz * 2); ctx.clip();
    if (o.box !== false) { ctx.fillStyle = o.bg || 'rgba(6,10,24,0.82)'; ctx.fillRect(ax, y - sz * 0.8, w, sz * 1.6); ctx.strokeStyle = o.col || pb.Y; ctx.lineWidth = 2; ctx.strokeRect(ax, y - sz * 0.8, w, sz * 1.6); }
    L.text(ctx, str, ax + sz * 0.45, y, { size: sz, family: pb.MONO, weight: 600, align: 'left', baseline: 'middle', color: o.col || pb.Y, alpha: al, tracking: '0.12em' });
    ctx.restore();
  };

  // ------------------------------------------------------------------ USSR outline (lon, lat) and a conic projection
  pb.USSR = [[21.0,55.3],[21.1,56.8],[22.6,57.7],[24.4,57.3],[23.5,59.2],[28.0,59.5],[30.2,59.9],[29.5,61.7],[31.5,62.9],[29.6,64.2],[30.1,65.7],[29.2,67.5],[28.6,68.9],[30.9,69.8],[33.0,69.4],[36.5,69.1],[41.0,67.7],[40.3,66.3],[44.0,66.3],[44.2,68.4],[53.5,68.3],[59.0,68.6],[60.8,69.8],[66.5,70.7],[68.5,72.8],[72.8,72.8],[75.0,72.5],[80.0,73.5],[87.0,74.5],[98.0,76.2],[104.3,77.7],[112.0,76.0],[113.5,73.5],[119.0,73.1],[129.5,72.2],[131.0,71.0],[139.5,72.4],[146.0,72.3],[152.0,70.9],[160.0,70.0],[170.0,70.1],[176.0,69.8],[180.0,68.9],[186.0,67.0],[190.2,66.0],[186.5,64.5],[182.0,65.0],[179.0,64.4],[177.0,62.5],[173.5,61.7],[170.0,60.0],[164.0,59.9],[162.8,58.6],[163.2,56.2],[160.0,54.4],[158.4,52.9],[156.7,50.9],[156.0,52.8],[155.6,55.8],[157.0,58.0],[159.5,61.5],[155.0,59.3],[151.5,59.5],[143.0,59.3],[140.5,57.9],[137.0,54.0],[140.5,53.4],[141.3,52.0],[140.4,48.4],[138.2,46.3],[135.1,43.5],[132.5,42.8],[131.0,42.6],[130.6,42.3],[130.9,44.0],[131.3,44.9],[133.0,45.2],[134.7,48.3],[130.6,48.9],[127.6,49.8],[125.0,53.1],[121.0,53.3],[119.7,52.6],[117.8,49.5],[116.7,49.8],[114.4,50.3],[108.0,49.6],[106.2,50.3],[102.3,50.5],[98.3,52.0],[97.8,49.8],[94.2,50.6],[90.0,50.0],[87.8,49.2],[85.5,47.0],[82.5,45.5],[80.2,45.0],[80.4,42.6],[78.5,41.6],[75.6,40.7],[73.6,39.5],[73.6,37.4],[71.4,36.9],[68.0,37.2],[66.5,37.4],[62.5,35.6],[60.9,36.6],[56.5,38.1],[54.8,37.4],[53.9,37.3],[48.9,38.4],[48.0,38.9],[46.5,38.9],[44.8,39.7],[43.6,40.4],[43.0,41.1],[41.6,41.5],[40.0,43.4],[38.0,44.5],[36.6,45.3],[35.4,45.0],[33.5,44.5],[32.6,45.4],[33.6,46.0],[31.8,46.6],[30.7,46.5],[29.6,45.4],[28.2,45.5],[26.6,48.3],[24.9,47.9],[22.6,48.1],[22.1,48.4],[22.6,49.1],[24.0,50.4],[24.1,51.6],[23.6,52.6],[23.5,53.9],[22.8,54.4],[19.6,54.4],[20.0,54.95]];
  pb.CASPIAN = [[47.0,44.6],[49.5,46.5],[53.0,46.8],[53.2,45.3],[51.3,44.4],[52.8,41.8],[53.9,40.8],[53.0,39.2],[53.9,37.3],[48.9,38.4],[49.5,40.3],[48.6,41.8],[47.5,43.0]];
  /** proj(lon, lat) → screen [x, y]; box { cx, cy, k } (k px per degree) */
  pb.mapProj = (box) => (lon, lat) => {
    const th = (lon - 100) * 0.62 * Math.PI / 180, rho = (90 - lat) * box.k;
    return [box.cx + rho * Math.sin(th), box.cy + rho * Math.cos(th) - 52 * box.k];
  };
})();

/* ep8 kit: Vesna — sculpted engraved 3D head of a 1972 stewardess (bob, pillbox cap, jacket, scarf). Classical-bust
   realism, no cartoon features. pb.fem(ctx, cx, cy, H, o) mirrors pb.head (o: yaw pitch roll res spacing slot key xray). */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, pb = FILM.pb, { ell, smin, ssub, box, cap } = df.sd;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const abs = Math.abs, sqrt = Math.sqrt;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };
  let FM = 0, XR = 0, CAP = 1, WIND = 0;
  function femSd(x, y, z, want) {
    const ax = abs(x);
    let d = ell(x, y - 0.2, z + 0.1, 0.66, 0.8, 0.82);
    d = smin(d, ell(x, y + 0.3, z - 0.18, 0.52, 0.74, 0.6), 0.26);
    d = smin(d, ell(x, y + 0.76, z - 0.24, 0.38, 0.27, 0.44), 0.2);
    d = smin(d, ell(x, y + 0.95, z - 0.5, 0.15, 0.11, 0.13), 0.1);
    d = smin(d, ell(ax - 0.33, y + 0.2, z - 0.45, 0.18, 0.12, 0.17), 0.14);
    d = smin(d, ell(x, y + 0.0, z - 0.62, 0.44, 0.07, 0.1), 0.1);
    d = ssub(ell(ax - 0.23, y + 0.15, z - 0.76, 0.16, 0.085, 0.13), d, 0.06);
    d = smin(d, sqrt((ax - 0.23) * (ax - 0.23) + (y + 0.16) * (y + 0.16) + (z - 0.6) * (z - 0.6)) - 0.105, 0.03);
    d = smin(d, ell(ax - 0.23, y + 0.11, z - 0.655, 0.135, 0.048, 0.08), 0.025);
    d = smin(d, cap(x, y, z, 0, -0.1, 0.72, 0, -0.46, 0.9, 0.05), 0.07);
    d = smin(d, ell(x, y + 0.5, z - 0.88, 0.08, 0.075, 0.08), 0.05);
    d = smin(d, ell(ax - 0.075, y + 0.56, z - 0.8, 0.065, 0.05, 0.06), 0.04);
    d = ssub(ell(ax - 0.055, y + 0.6, z - 0.85, 0.025, 0.018, 0.035), d, 0.012);
    d = smin(d, ell(x, y + 0.735, z - 0.73, 0.18, 0.05, 0.085), 0.035);
    d = smin(d, ell(x, y + 0.835, z - 0.71, 0.16, 0.06, 0.09), 0.035);
    d = ssub(box(x, y + 0.785, z - 0.8, 0.17, 0.005, 0.08), d, 0.01);
    d = smin(d, cap(x, y, z, 0, -0.85, -0.12, 0, -1.55, -0.08, 0.27), 0.16);
    let m = 1;
    // jacket + scarf
    let jk = ell(x, y + 2.1, z + 0.08, 1.25, 0.7, 0.42);
    jk = smin(jk, ell(ax - 0.82, y + 1.6, z + 0.08, 0.42, 0.2, 0.34), 0.28);
    jk = Math.max(jk, -(y + 2.75));
    if (jk < d + 0.02 && y < -1.25) { d = smin(d, jk, 0.03); m = 4; }
    const scarf = ell(x, y + 1.36, z - 0.04, 0.36, 0.11, 0.36) + 0.01 * Math.sin(Math.atan2(x, z) * 9);
    if (scarf < d) { d = smin(d, scarf, 0.02); m = 9; }
    // 70s bob: soft shell to the jaw, side-swept fringe across the forehead; the wind lifts the ends
    const wl = WIND * clamp((-y + 0.1) / 0.9) * 0.25;
    let hair = ell(x, y - 0.16 - wl * 0.4, z + 0.12, 0.76 + wl * 0.5, 0.98, 0.9) + 0.006 * Math.sin(y * 34 + Math.atan2(x, z) * 7);
    hair = Math.max(hair, -(y + 0.74 - wl * 1.2 - 0.06 * clamp(ax - 0.4) * 3));
    const fringe = 0.42 - 0.18 * clamp((x + 0.5) / 1.0);                 // swept: lower on the right
    hair = Math.max(hair, Math.min(z - 0.22 - 0.4 * clamp((y + 0.2) / 0.6), y - fringe < 0 ? z - 0.22 : 9));
    hair = Math.max(hair, -(ell(x, y - 0.2, z + 0.1, 0.62, 0.76, 0.79)) - 0.12);
    if (hair < d) { d = smin(d, hair, 0.015); m = 2; }
    // pillbox cap with a gold badge, perched forward on the crown
    if (CAP) {
      const cy = y - 1.0 + 0.2 * z, cz = z + 0.02;
      let cp = Math.max(sqrt(x * x + cz * cz) - 0.47, abs(cy) - 0.14);
      cp = smin(cp, Math.max(sqrt(x * x + cz * cz) - 0.54, abs(cy + 0.14) - 0.03), 0.02);
      if (cp < d) { d = Math.min(d, cp); m = 7; }
      if (want && m === 7 && cz > 0.42 && ax < 0.09 && abs(cy) < 0.08) m = 8;
    }
    if (want) FM = m;
    return d;
  }
  pb.FEM = {
    sdf: (x, y, z) => femSd(x, y, z, false), mat: (x, y, z) => { femSd(x, y, z, true); return FM; },
    col: (m) => (XR ? { 1: rgb('#9FE6F2'), 2: rgb('#6FB8D0'), 4: rgb('#4A8AB0'), 7: rgb('#4A8AB0'), 8: rgb('#F2C230'), 9: rgb('#7FC8DA') }[m] : { 1: rgb('#EBCDB6'), 2: rgb('#6A4A36'), 4: rgb('#3E4E80'), 7: rgb('#3E4E80'), 8: rgb('#F2C230'), 9: rgb('#D0483C') }[m]) || [1, 1, 1],
    uv: (m, x, y, z, o) => {
      if (m === 2) { o[0] = y * 0.9 + 0.12 * Math.sin(Math.atan2(x, z) * 3); o[1] = Math.atan2(x, z) * 0.9; }
      else if (m === 7 || m === 8) { o[0] = y * 1.5; o[1] = Math.atan2(x, z) * 1.2; }
      else if (m === 4 || m === 9) { o[0] = y + 0.06 * Math.sin(x * 3); o[1] = x * 0.8; }
      else { o[0] = y * 0.95 + 0.05 * Math.sin(x * 4); o[1] = (x + z * 0.6) * 0.75; }
    },
    bound: [0, -0.7, 0, 2.6],
  };
  pb.fem = (ctx, cx, cy, H, o = {}) => {
    XR = o.xray ? 1 : 0; CAP = o.cap === false ? 0 : 1; WIND = o.wind || 0;
    const unit = H / 2.2;
    return df.r3d(ctx, { cx, cy, unit, win: o.win || [-2.0, 2.0, -2.9, 1.35], yaw: o.yaw || 0, pitch: o.pitch || 0.04, roll: o.roll || 0, res: o.res || 0.36, spacing: o.spacing || 7.5, slot: o.slot || 0,
      key: o.key || [-0.55, 0.4, 0.72], fill: o.fill || [0.7, -0.1, 0.5], rim: o.rim || [0.8, 0.35, -0.5], flat: o.flat != null ? o.flat : 0.1, warm: o.warm }, pb.FEM);
  };
})();

/* ep8 kit: the DC-9 (engraved SDF, JAT livery) with a breakup parameter; engraved cloud banks; the altimeter. */
(function () {
  'use strict';
  const FILM = window.FILM, L = FILM.lib, df = FILM.df, pb = FILM.pb, { ell, smin, box, cap } = df.sd;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const abs = Math.abs, sqrt = Math.sqrt;
  const rgb = (hex) => { const a = L.rgb(hex); return [a[0] / 255, a[1] / 255, a[2] / 255]; };
  let JM = 0, BRK = 0;
  function planeSd(x, y, z, want) {
    const az = abs(z);
    let d = cap(x, y, z, -3.9, 0, 0, 3.6, 0, 0, 0.55);
    d = smin(d, ell(x - 3.75, y + 0.04, z, 1.25, 0.52, 0.55), 0.2);                 // nose
    d = smin(d, ell(x + 4.3, y - 0.18, z, 1.4, 0.36, 0.4), 0.3);                    // tailcone
    // swept wings with dihedral
    const xs = x + 0.5 * (az - 0.5), hc = 0.85 - 0.13 * az;
    const wing = Math.max(abs(xs - 0.2) - hc, abs(y + 0.36 - 0.06 * az) - 0.06 * (1 - az / 6), az - 4.3, 0.3 - az);
    d = smin(d, wing, 0.12);
    // T-tail: swept fin + stabiliser on top
    const xf = x + 0.75 * (y - 0.4), fin = Math.max(abs(xf + 4.15) - (0.75 - 0.12 * (y - 0.4)), abs(z) - 0.06, y - 2.3, 0.3 - y);
    d = smin(d, fin, 0.08);
    const xt = x + 0.5 * az + 0.75 * 1.9, stab = Math.max(abs(xt + 4.1) - (0.55 - 0.1 * az), abs(y - 2.28) - 0.05, az - 1.7);
    d = Math.min(d, stab);
    // rear engines on pylons
    let eng = Math.min(cap(x, y, z - 0.98, -3.45, 0.28, 0, -2.2, 0.28, 0, 0.28), cap(x, y, z + 0.98, -3.45, 0.28, 0, -2.2, 0.28, 0, 0.28));
    eng = smin(eng, Math.max(abs(x + 2.8) - 0.35, abs(y - 0.25) - 0.05, az - 0.95, 0.3 - az), 0.05);
    let m = 1;
    if (eng < d) { d = eng; m = 5; }
    if (want) {
      if (m === 1 && wing > d + 0.03 && fin > d + 0.03 && stab > d + 0.03 && x > -4.6 && x < 4.4) {
        if (y > -0.1 && y < 0.04) m = 2;                                             // blue cheatline
        else if (y > 0.1 && y < 0.24 && x > -3.2 && x < 3.2 && Math.sin(x * 11) > 0.35) m = 3;   // windows
        else if (y > 0.3 && x > 3.9 && x < 4.4 && z * 0 === 0 && y < 0.42) m = 3;    // cockpit
      }
      if (fin <= d + 0.01 && y > 1.2) m = 2;
      JM = m;
    }
    return d;
  }
  // breakup: nose / middle (with wings) / tail drift apart and tumble
  const PIECES = [[1.4, 9], [-1.6, 1.4], [-9, -1.6]];
  const OFF = [[1.1, 0.7, 0.2, 0.5], [0, -0.4, 0, -0.25], [-1.0, 0.9, -0.3, 0.7]];
  function brokenSd(x, y, z, want) {
    if (BRK <= 0) return planeSd(x, y, z, want);
    let best = 1e9, bm = 0;
    for (let i = 0; i < 3; i++) {
      const [ox, oy, oz, rot] = OFF[i];
      const k = BRK, a = -rot * k, c = Math.cos(a), s = Math.sin(a);
      let qx = x - ox * k * 1.6, qy = y - oy * k * 1.6, qz = z - oz * k;
      const cx = (PIECES[i][0] + PIECES[i][1]) / 2;
      const rx = (qx - cx) * c - qy * s + cx, ry = (qx - cx) * s + qy * c;
      let dd = planeSd(rx, ry, qz, want);
      dd = Math.max(dd, PIECES[i][1] - rx - 0.0, rx - PIECES[i][0]) ;
      dd = Math.max(planeSd(rx, ry, qz, want), Math.max(rx - PIECES[i][1], PIECES[i][0] - rx));
      if (dd < best) { best = dd; bm = JM; }
    }
    JM = bm;
    return best;
  }
  pb.JET = {
    sdf: (x, y, z) => brokenSd(x, y, z, false), mat: (x, y, z) => { brokenSd(x, y, z, true); return JM; },
    col: (m) => ({ 1: rgb('#E6E2DA'), 2: rgb('#3A5AA8'), 3: rgb('#1A1E2A'), 5: rgb('#B8BCC6') }[m] || [1, 1, 1]),
    uv: (m, x, y, z, o) => { o[0] = x * 0.6; o[1] = (y + z) * 0.7; },
    bound: [-0.3, 0.6, 0, 7.2],
  };
  /** jet(ctx, cx, cy, unit, o): o.yaw pitch roll brk res spacing slot key */
  pb.jet = (ctx, cx, cy, unit, o = {}) => {
    BRK = clamp(o.brk || 0);
    const W = 6.4 + 3 * BRK;
    return df.r3d(ctx, { cx, cy, unit, win: o.win || [-W, W, -3.2 - 2 * BRK, 3.4 + 2 * BRK], yaw: o.yaw || 0, pitch: o.pitch || 0, roll: o.roll || 0, res: o.res || 0.32, spacing: o.spacing || 5.5, slot: o.slot || 30,
      key: o.key || [-0.3, 0.8, 0.5], fill: [0.6, -0.3, 0.5], rim: [0.8, 0.4, -0.5], flat: o.flat != null ? o.flat : 0.12, warm: o.warm || [0.9, 0.95, 1.05] }, pb.JET);
  };

  // ------------------------------------------------------------------ engraved cloud banks (2D, parallax)
  /** clouds(ctx, T, o): o.vy (px/s, + = clouds rise past camera = falling), o.vx, o.n, o.seed, o.alpha, o.y0/y1 band, o.scale */
  pb.clouds = (ctx, T, o = {}) => {
    const r = L.rng(L.hash('clouds', o.seed || 1)), n = o.n || 7, sc = o.scale || 1;
    const H = 2600;
    const items = [];
    for (let i = 0; i < n; i++) items.push({ x: r() * 1300 - 110, y: r() * H, w: (260 + r() * 360) * sc, h: (90 + r() * 90) * sc, s: r() * 1000 | 0, z: 0.5 + r() * 0.8 });
    items.sort((a, b) => a.z - b.z).forEach((c, i) => {
      const yy = ((c.y - T * (o.vy || 0) * c.z) % H + H) % H - 300 + (o.yOff || 0);
      const xx = ((c.x + T * (o.vx || 0) * c.z) % 1500 + 1500) % 1500 - 200;
      if (o.y0 != null && (yy < o.y0 || yy > o.y1)) return;
      const pts = []; const rr = L.rng(L.hash('cl', c.s));
      const lobes = 7;
      for (let k = 0; k <= 40; k++) {
        const a = Math.PI + (k / 40) * Math.PI;                                   // top half: billows
        const bump = 1 + 0.18 * Math.abs(Math.sin(a * lobes * 0.5 + c.s));
        pts.push([xx + Math.cos(a) * c.w * 0.5 * bump, yy + Math.sin(a) * c.h * bump]);
      }
      for (let k = 0; k <= 12; k++) pts.push([xx + c.w * 0.5 - (k / 12) * c.w, yy + c.h * 0.18 + 6 * Math.sin(k + c.s)]);
      ctx.save(); ctx.globalAlpha = (o.alpha != null ? o.alpha : 0.9) * clamp(c.z);
      df.engrave(ctx, pts, { ink: o.ink || '#C8D2EC', base: o.base || '#141C38', light: (x, y) => clamp(0.75 - (y - (yy - c.h)) / (c.h * 2.2)), angle: 0.15, spacing: 5, seed: 600 + c.s, outW: 2, stip: false, cross: true, smooth: false });
      ctx.restore();
    });
  };

  // ------------------------------------------------------------------ altimeter readout (drum counter + tape)
  pb.alt = (ctx, x, y, ft, o = {}) => {
    const s = o.s || 1, w = 330 * s, h = 96 * s;
    ctx.save(); ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    ctx.fillStyle = 'rgba(6,9,20,0.9)'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    L.inkPath(ctx, L.rectPts(x - w / 2, y - h / 2, w, h, 30), { closed: true, width: 3, color: o.col || pb.Y, seed: 640 });
    const str = Math.max(0, Math.round(ft)).toLocaleString('en-US');
    L.text(ctx, str, x + w / 2 - 20 * s, y + 4 * s, { size: 64 * s, family: pb.MONO, weight: 600, align: 'right', baseline: 'middle', color: o.col || pb.Y });
    L.text(ctx, 'FT', x - w / 2 + 18 * s, y + 4 * s, { size: 26 * s, family: pb.MONO, weight: 600, align: 'left', baseline: 'middle', color: pb.IV });
    ctx.restore();
  };
})();

/* ep8 part 2: shared certificate (from part 1) + an engraved MiG-21 silhouette */
(function () {
  'use strict';
  const FILM = window.FILM;
  // the certificate (shared with the cliffhanger)
  FILM.pbCert = (ctx, L, D, PB, x, y, s, clip) => {
    const W = 760 * s, H = 470 * s;
    D.engrave(ctx, L.rectPts(x - W / 2, y - H / 2, W, H, 40), { ink: '#F2E8D0', base: '#E2D6B8', light: () => 0.1, angle: 0.5, spacing: 5, seed: 180, smooth: false, outW: 4, cross: false, stip: false });
    L.inkPath(ctx, L.rectPts(x - W / 2 + 18 * s, y - H / 2 + 18 * s, W - 36 * s, H - 36 * s, 40), { closed: true, width: 3, color: '#B08A3A', seed: 181 });
    L.inkPath(ctx, L.rectPts(x - W / 2 + 28 * s, y - H / 2 + 28 * s, W - 56 * s, H - 56 * s, 40), { closed: true, width: 1.5, color: '#B08A3A', seed: 182 });
    L.text(ctx, 'WORLD RECORD', x, y - 130 * s, { size: 66 * s, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.06em' });
    L.text(ctx, 'HIGHEST FALL SURVIVED', x, y - 45 * s, { size: 34 * s, family: PB.SERIF, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10' });
    L.text(ctx, 'WITHOUT A PARACHUTE', x, y + 2 * s, { size: 34 * s, family: PB.SERIF, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10' });
    L.text(ctx, '10,160 m · 33,330 ft · 1972', x, y + 70 * s, { size: 28 * s, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10', tracking: '0.1em' });
    L.text(ctx, 'VESNA VULOVIĆ', x, y + 140 * s, { size: 36 * s, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.1em' });
    L.inkCircle(ctx, x + W / 2 - 90 * s, y + H / 2 - 90 * s, 46 * s, { width: 3, color: '#5A0A08', fill: '#C8321E', seed: 185 });
  };
  FILM.pbMig = (ctx, L, D, x, y, s, rot, seed = 1) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const body = [[-260, -14], [-200, -24], [120, -26], [200, -18], [250, -6], [262, 0], [250, 6], [200, 16], [120, 22], [-200, 22], [-260, 14]];
    D.engrave(ctx, body, { ink: '#B8C0CE', base: '#1A1E28', light: (a, b) => 0.3 + 0.3 * (b < y ? 1 : 0), angle: 0.1, spacing: 3.5, seed: seed, smooth: false, outW: 3, cross: false, stip: false });
    D.engrave(ctx, [[-60, 10], [60, 10], [-150, 120], [-190, 120]], { ink: '#9AA2B4', base: '#14181F', light: () => 0.4, angle: 1.0, spacing: 3.5, seed: seed + 1, smooth: false, outW: 3, cross: false, stip: false });
    D.engrave(ctx, [[-180, -22], [-120, -22], [-200, -120], [-236, -120]], { ink: '#9AA2B4', base: '#14181F', light: () => 0.45, angle: 1.0, spacing: 3.5, seed: seed + 2, smooth: false, outW: 3, cross: false, stip: false });
    D.engrave(ctx, [[150, -24], [210, -24], [196, -42], [160, -42]], { ink: '#7FD8E8', base: '#10303A', light: () => 0.5, spacing: 3, seed: seed + 3, smooth: false, outW: 2, cross: false, stip: false });
    L.inkCircle(ctx, 258, 0, 9, { width: 2, color: '#000', fill: '#3A3E48', seed: seed + 4 });
    L.inkCircle(ctx, -30, 0, 14, { width: 2, color: '#000', fill: '#C8321E', seed: seed + 5 });
    ctx.restore();
  };
})();
