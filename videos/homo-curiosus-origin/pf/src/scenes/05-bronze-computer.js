// 05 · bronze-computer · T 11.00–13.75 · blueprint + true 3D (perspective-projected gear train, painter-sorted)
// Layers: (1) blueprint plate (2) Saros back-dial spiral, exploded-view axis lines, assembled-position ghosts
// (3) the gear train in 3D: sides then faces, corroded bronze pattern mapped per face, hatching, ink rims
// (4) the curiosity line tracing the main wheel's pitch circle, then leaving along y 1240 (G6a) at 13.5
// (5) labels, progress glyph. Beats: explode from 11.5, engage 11.875, glint 13.25.
(function () {
  'use strict';
  const rgbo = (L, c) => { const a = L.rgb(c); return { r: a[0], g: a[1], b: a[2] }; };
  const ID = 'bronze-computer';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const M = 400 / (223 / 2); // module: the main wheel's pitch radius is exactly G5's 400 px
  const GEARS = [
    { n: 223, x: 0, y: 0, z: 0, th: 16, spokes: 4 },
    { n: 127, x: -150, y: 120, z: -1, th: 12 },
    { n: 64, x: 70, y: 250, z: -2, th: 12 },
    { n: 38, x: 190, y: -170, z: -3, th: 14, engage: true },
    { n: 48, x: -230, y: -190, z: -2.5, th: 12 },
    { n: 32, x: 250, y: 130, z: -4, th: 10 },
    { n: 50, x: -60, y: -290, z: -4.5, th: 10 },
    { n: 24, x: -280, y: 260, z: -5, th: 10 },
  ];
  const T0 = 11.0, EXPLODE = 11.5, ENGAGE = 11.875, GLINT = 13.25, LEAVE = 13.5;
  const CAM0 = { yaw: 0, pitch: 0, dist: 1800, f: 1800, cx: 540, cy: 860 };

  function bronzeTex(L, P) {
    return L.cached('hc-bronze-tex-v1', () => {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const g = c.getContext('2d');
      g.fillStyle = P.bronze;
      g.fillRect(0, 0, 512, 512);
      const img = g.getImageData(0, 0, 512, 512);
      const d = img.data;
      const lt = rgbo(L, P.bronzeLight), dk = rgbo(L, '#5f3c18'), vg = rgbo(L, P.verdigris), vl = rgbo(L, P.verdigrisLight);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const i = (y * 512 + x) * 4;
        const n = L.noise2(x * 0.02, y * 0.02, 5) * 0.6 + L.noise2(x * 0.08, y * 0.08, 6) * 0.4;
        const v = L.noise2(x * 0.012 + 9, y * 0.012, 7) + L.noise2(x * 0.05, y * 0.05, 8) * 0.35;
        let r, gg, b;
        const k = Math.max(0, Math.min(1, n * 0.9 + 0.45));
        r = dk.r + (lt.r - dk.r) * k; gg = dk.g + (lt.g - dk.g) * k; b = dk.b + (lt.b - dk.b) * k;
        if (v > 0.42) {
          const q = Math.min(1, (v - 0.42) * 4);
          const c2 = L.noise2(x * 0.1, y * 0.1, 9) > 0 ? vl : vg;
          r += (c2.r - r) * q; gg += (c2.g - gg) * q; b += (c2.b - b) * q;
        }
        const pit = L.noise2(x * 0.3, y * 0.3, 10);
        if (pit > 0.62) { r *= 0.6; gg *= 0.6; b *= 0.6; }
        d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }
  const poly = (ctx, pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  };

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const TAU = Math.PI * 2;
      L.blueprint(ctx, { color: P.hcNavy, seed: 55, center: [540, 860], circles: 5 });

      // camera: face-on at the cut (G5), orbit to three-quarter by 12.6, slight push
      const o = L.ease.inOutCubic(L.clamp((T - 11.25) / 1.35));
      const cam = { yaw: 0.78 * o, pitch: -0.32 * o, dist: 1800 - 220 * o, f: 1800, cx: 540 + 40 * o, cy: 860 - 20 * o };
      const theta = 0.32 * (T - T0);

      // gear world states
      const gs = GEARS.map((G, i) => {
        const e = L.ease.outBack(L.clamp((T - EXPLODE - i * 0.06) / 0.55));
        let z = G.z * 95 * e;
        if (G.engage) z += -70 * (1 - L.ease.outBack(L.clamp((T - ENGAGE) / 0.2))) * (T < ENGAGE + 0.2 ? 1 : 0);
        const sign = i === 0 ? 1 : i % 2 ? -1 : 1;
        const ang = sign * theta * (223 / G.n) + i;
        const shape = X.gear(G.n, M, { depth: M * 1.15 });
        return { G, i, z, ang, shape };
      });
      const proj = (p) => X.project(p, cam);
      const toWorld = (g, lx, ly, dz) => {
        const c = Math.cos(g.ang), s = Math.sin(g.ang);
        return [g.G.x + lx * c - ly * s, g.G.y + lx * s + ly * c, g.z + dz];
      };

      // ghosts of the assembled positions + exploded axis lines (blueprint language)
      const ex = L.clamp((T - EXPLODE) / 0.5);
      gs.forEach((g) => {
        if (g.i === 0) return;
        const c0 = proj([g.G.x, g.G.y, 0]), c1 = proj([g.G.x, g.G.y, g.z]);
        ctx.strokeStyle = L.rgba(P.lavender, 0.35 * ex);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(c0[0], c0[1]);
        ctx.lineTo(c1[0], c1[1]);
        ctx.stroke();
        ctx.setLineDash([]);
        const ring = [];
        for (let k = 0; k <= 48; k++) ring.push(proj([g.G.x + Math.cos((k / 48) * TAU) * g.shape.rp, g.G.y + Math.sin((k / 48) * TAU) * g.shape.rp, 0]));
        ctx.strokeStyle = L.rgba(P.lavender, 0.22 * ex);
        poly(ctx, ring);
        ctx.stroke();
      });

      // Saros back-dial spiral, unwinding (upper left)
      {
        const sc = [215, 420];
        const p = L.ease.inOutQuad(L.clamp((T - 11.2) / 1.8));
        const pts = [];
        for (let a = 0; a < TAU * 4 * p; a += 0.05) pts.push([sc[0] + Math.cos(a - Math.PI / 2) * (24 + a * 3.6), sc[1] + Math.sin(a - Math.PI / 2) * (24 + a * 3.6)]);
        if (pts.length > 1) {
          ctx.strokeStyle = L.rgba(P.lavender, 0.75);
          ctx.lineWidth = 1.6;
          L.tracePath(ctx, pts, false);
          ctx.stroke();
          for (let i = 0; i < pts.length; i += 4) {
            const q = pts[i], a = Math.atan2(q[1] - sc[1], q[0] - sc[0]);
            ctx.beginPath();
            ctx.moveTo(q[0], q[1]);
            ctx.lineTo(q[0] + Math.cos(a) * 7, q[1] + Math.sin(a) * 7);
            ctx.stroke();
          }
        }
        L.guideCircle(ctx, sc[0], sc[1], 120, { alpha: 0.3, width: 1.2, cross: 10 });
        L.text(ctx, 'SAROS · 223', sc[0] - 70, sc[1] + 160, { size: 22, family: MONO, weight: 500, color: P.lavender, alpha: 0.8 * p, tracking: '0.18em' });
      }

      // painter's order: far gears first (camera-space depth of the centre)
      const order = gs.slice().sort((a, b) => proj([b.G.x, b.G.y, b.z])[2] - proj([a.G.x, a.G.y, a.z])[2]);
      const tex = bronzeTex(L, P);
      const light = [-0.45, -0.55, 0.7];
      order.forEach((g) => {
        const th = g.G.th;
        const F = g.shape.pts.map(([x, y]) => proj(toWorld(g, x, y, th / 2)));
        const B = g.shape.pts.map(([x, y]) => proj(toWorld(g, x, y, -th / 2)));
        // side walls (back-facing culled by screen winding)
        const n = F.length;
        for (let k = 0; k < n; k++) {
          const k2 = (k + 1) % n;
          const q = [F[k], F[k2], B[k2], B[k]];
          const cr = (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]);
          if (cr > 0) continue;
          const [x0, y0] = g.shape.pts[k], [x1, y1] = g.shape.pts[k2];
          const nx = y1 - y0, ny = -(x1 - x0), nl = Math.hypot(nx, ny) || 1;
          const wn = [(nx / nl) * Math.cos(g.ang) - (ny / nl) * Math.sin(g.ang), (nx / nl) * Math.sin(g.ang) + (ny / nl) * Math.cos(g.ang)];
          const sh = L.clamp(0.35 + 0.65 * (wn[0] * light[0] + wn[1] * light[1]));
          ctx.fillStyle = L.mix('#3a2410', P.bronzeLight, sh * 0.8);
          poly(ctx, q);
          ctx.fill();
        }
        // the face, with spoke holes on the main wheel
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(F[0][0], F[0][1]);
        for (let k = 1; k < n; k++) ctx.lineTo(F[k][0], F[k][1]);
        ctx.closePath();
        const holes = [];
        if (g.G.spokes) {
          const r0 = 70, r1 = g.shape.rp - 34;
          for (let sIdx = 0; sIdx < 4; sIdx++) {
            const a0 = (sIdx / 4) * TAU + 0.16, a1 = ((sIdx + 1) / 4) * TAU - 0.16;
            const h = [];
            for (let k = 0; k <= 16; k++) { const a = L.lerp(a0, a1, k / 16); h.push(proj(toWorld(g, Math.cos(a) * r1, Math.sin(a) * r1, th / 2))); }
            for (let k = 16; k >= 0; k--) { const a = L.lerp(a0 + 0.12, a1 - 0.12, k / 16); h.push(proj(toWorld(g, Math.cos(a) * r0 * 1.6, Math.sin(a) * r0 * 1.6, th / 2))); }
            holes.push(h);
            ctx.moveTo(h[0][0], h[0][1]);
            for (let k = 1; k < h.length; k++) ctx.lineTo(h[k][0], h[k][1]);
            ctx.closePath();
          }
        }
        const o0 = proj(toWorld(g, 0, 0, th / 2)), ox = proj(toWorld(g, 100, 0, th / 2)), oy = proj(toWorld(g, 0, 100, th / 2));
        const ax = [(ox[0] - o0[0]) / 100, (ox[1] - o0[1]) / 100], ay = [(oy[0] - o0[0]) / 100, (oy[1] - o0[1]) / 100];
        const pat = ctx.createPattern(tex, 'repeat');
        const a = 1.6 * ax[0], b = 1.6 * ax[1], c = 1.6 * ay[0], d = 1.6 * ay[1];
        pat.setTransform(new DOMMatrix([a, b, c, d, o0[0] - 256 * (a + c), o0[1] - 256 * (b + d)]));
        ctx.fillStyle = pat;
        ctx.fill('evenodd');
        ctx.clip('evenodd');
        // engraved scribe circles + face hatching (shade toward the lower right of each face)
        ctx.strokeStyle = L.rgba('#2a1606', 0.45);
        ctx.lineWidth = 1;
        [0.35, 0.55, 0.82, 0.9].forEach((f) => {
          const ring = [];
          for (let k = 0; k <= 64; k++) ring.push(proj(toWorld(g, Math.cos((k / 64) * TAU) * g.shape.rp * f, Math.sin((k / 64) * TAU) * g.shape.rp * f, th / 2)));
          poly(ctx, ring);
          ctx.stroke();
        });
        const bb = { x: Math.min(...F.map((p) => p[0])), y: Math.min(...F.map((p) => p[1])) };
        const bw = Math.max(...F.map((p) => p[0])) - bb.x, bh = Math.max(...F.map((p) => p[1])) - bb.y;
        L.hatch(ctx, null, { bounds: { x: bb.x, y: bb.y, w: bw, h: bh }, angle: -0.8, spacing: 6, width: 1.1, color: '#2a1606', alpha: 0.5, seed: 70 + g.i,
          density: (x, y) => L.clamp(((x - bb.x) / bw) * 0.7 + ((y - bb.y) / bh) * 0.6 - 0.45) });
        // the glint: a rim light sweeping across the bronze
        if (T > GLINT - 0.1 && T < GLINT + 0.45) {
          const u = (T - GLINT + 0.1) / 0.55;
          const gx = L.lerp(bb.x - 200, bb.x + bw + 200, u);
          const gr = ctx.createLinearGradient(gx - 90, bb.y, gx + 90, bb.y + 160);
          gr.addColorStop(0, 'rgba(255,240,200,0)');
          gr.addColorStop(0.5, 'rgba(255,240,200,0.75)');
          gr.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(bb.x, bb.y, bw, bh);
        }
        ctx.restore();
        // ink: rim, holes, axle
        ctx.strokeStyle = '#1a0f06';
        ctx.lineWidth = g.i === 0 ? 2.4 : 1.8;
        poly(ctx, F);
        ctx.stroke();
        holes.forEach((h) => { poly(ctx, h); ctx.stroke(); });
        const hub = [];
        for (let k = 0; k <= 32; k++) hub.push(proj(toWorld(g, Math.cos((k / 32) * TAU) * (g.i === 0 ? 46 : 12), Math.sin((k / 32) * TAU) * (g.i === 0 ? 46 : 12), th / 2 + 2)));
        poly(ctx, hub);
        ctx.fillStyle = '#4a2e12';
        ctx.fill();
        ctx.stroke();
      });

      // the curiosity line on the main wheel's pitch circle, then out along G6a
      const main = gs[0];
      const pc = [];
      for (let k = 0; k <= 160; k++) {
        const a = Math.PI / 2 - (k / 160) * TAU;
        pc.push(proj([Math.cos(a) * 400, Math.sin(a) * 400, main.z + main.G.th / 2 + 2]));
      }
      const pcu = L.ease.inOutCubic(L.clamp((T - T0) / 1.0));
      if (T < LEAVE) HC.line(ctx, pc.map((p) => [p[0], p[1]]), { plate: 'blueprint', to: Math.max(0.01, pcu), width: 6, seed: 5, alpha: 0.95 });
      else {
        const bottom = pc[0];
        const path = pc.map((p) => [p[0], p[1]]).concat(L.smoothPts([[bottom[0], bottom[1]], [bottom[0] + 120, 1240], [760, 1240], [1100, 1240]], false, 6));
        const u = L.ease.inCubic(L.clamp((T - LEAVE) / 0.24));
        const f0 = pc.length / path.length;
        HC.line(ctx, path, { plate: 'blueprint', from: f0 * u * 0.9, to: L.lerp(f0, 1, u), width: 6, seed: 5 });
      }

      // labels with leader lines
      const la = L.ease.outExpo(L.clamp((T - 11.6) / 0.4));
      if (la > 0) {
        const rim = proj(toWorld(main, Math.cos(-0.6) * 400, Math.sin(-0.6) * 400, 8));
        ctx.strokeStyle = L.rgba(P.lavender, 0.8 * la);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rim[0], rim[1]);
        ctx.lineTo(880, 470);
        ctx.lineTo(950, 470);
        ctx.stroke();
        L.text(ctx, '223 TEETH', 820, 455, { size: 24, family: MONO, weight: 500, color: P.lineWhite, alpha: 0.9 * la, tracking: '0.18em' });
        L.text(ctx, 'c. 150 BC · ANTIKYTHERA', 90, 1330, { size: 24, family: MONO, weight: 500, color: P.lavender, alpha: 0.85 * la, tracking: '0.18em' });
      }
      X.progress(ctx, 2, T);
    },
  });
})();
