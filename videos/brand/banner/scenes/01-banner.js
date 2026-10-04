// WHY WE WONDER banner. The curiosity line runs the full width, threading every episode's motif — 2D engravings
// (ochre hand stencil, Orion, a gear, the Wright Flyer, a woodcut dancer, an umbrella) and lit 3D spheres
// (Earth, the platinum pellet, the Moon) — and passes the wordmark it has just written in the mobile-safe centre.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const W = 2560, H = 1440, CY = 720; // desktop strip y 508–931, mobile safe x 507–2053
  const arc = (cx, cy, rx, ry, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const G = {
    H: { w: 0.72, s: [[[0, 0], [0, 1]], [[0.72, 0], [0.72, 1]], [[0, 0.52], [0.72, 0.52]]] },
    O: { w: 0.86, s: [arc(0.43, 0.5, 0.43, 0.5, -Math.PI / 2, -Math.PI / 2 - TAU, 48)] },
    R: { w: 0.72, s: [[[0, 1], [0, 0], [0.4, 0]].concat(arc(0.4, 0.26, 0.28, 0.26, -Math.PI / 2, Math.PI / 2, 18)).concat([[0, 0.52]]), [[0.32, 0.52], [0.72, 1]]] },
    W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.22], [0.78, 1], [1.0, 0]]] },
    Y: { w: 0.74, s: [[[0, 0], [0.37, 0.5]], [[0.74, 0], [0.37, 0.5], [0.37, 1]]] },
    E: { w: 0.62, s: [[[0.62, 0], [0, 0], [0, 1], [0.62, 1]], [[0, 0.5], [0.5, 0.5]]] },
    N: { w: 0.74, s: [[[0, 1], [0, 0], [0.74, 1], [0.74, 0]]] },
    D: { w: 0.78, s: [[[0, 1], [0, 0], [0.3, 0]].concat(arc(0.3, 0.5, 0.48, 0.5, -Math.PI / 2, Math.PI / 2, 26)).concat([[0, 1]])] },
    ' ': { w: 0.34, s: [] },
  };
  function earthTex(L, P) {
    return L.cached('bn-earth', () => {
      const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = P.earthSea; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 5) { g.fillStyle = 'rgba(10,20,50,0.35)'; g.fillRect(0, y, w, 1.5); }
      const r = L.rng(L.hash('bn-land'));
      for (let i = 0; i < 10; i++) {
        const b = FILM.hx.blob(r() * w, 40 + r() * 170, 30 + r() * 55, 18 + r() * 30, 70 + i, 22, 0.35);
        g.beginPath(); L.tracePath(g, b, true); g.fillStyle = P.earthLand; g.fill();
        L.hatch(g, b, { angle: -0.7, spacing: 5, width: 1.3, color: '#5A4A22', alpha: 0.7, boilAmp: 0, seed: 80 + i });
        g.strokeStyle = '#2A2010'; g.lineWidth = 2; g.stroke();
      }
      return c;
    });
  }
  function moonTex(L, P) {
    return L.cached('bn-moon', () => {
      const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = P.moon; g.fillRect(0, 0, w, h);
      const r = L.rng(L.hash('bn-moon'));
      for (let i = 0; i < 8; i++) { g.beginPath(); L.tracePath(g, FILM.hx.blob(r() * w, 40 + r() * 170, 30 + r() * 50, 20 + r() * 30, 90 + i, 22, 0.35), true); g.fillStyle = P.moonShade; g.fill(); }
      for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, cr = 2 + Math.pow(r(), 3) * 16; g.strokeStyle = 'rgba(90,86,76,0.85)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, cr, 0, TAU); g.stroke(); }
      return c;
    });
  }
  FILM.scene({ id: 'banner', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, HC = FILM.hc, M = FILM.mk, X = FILM.hx, WC = FILM.wc;
    // field: midnight navy, blueprint grid, starfield (TV-visible margins get the most texture)
    const bg = ctx.createRadialGradient(W / 2, CY, 100, W / 2, CY, 1500);
    bg.addColorStop(0, '#1C2B57'); bg.addColorStop(0.55, P.hcNavy); bg.addColorStop(1, P.hcNavyDeep);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = L.rgba(P.grid, 0.2); ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const r = L.rng(L.hash('bn-stars'));
    for (let i = 0; i < 700; i++) { const x = r() * W, y = r() * H, s = r(); ctx.fillStyle = L.rgba(P.lineWhite, 0.15 + s * 0.6); ctx.beginPath(); ctx.arc(x, y, 0.8 + s * 2, 0, TAU); ctx.fill(); }
    [[W / 2, CY, 1180], [W / 2, CY, 980], [380, 300, 420], [2200, 1160, 460]].forEach(([x, y, rr], i) => L.guideCircle(ctx, x, y, rr, { alpha: i < 2 ? 0.14 : 0.1, width: 1.5, dash: i % 2 ? [8, 10] : null }));
    ctx.strokeStyle = L.rgba(P.lavender, 0.12); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke();

    // the curiosity line: a long path across the strip, weaving through the motifs
    const path = L.smoothPts([[-40, 760], [160, 690], [330, 600], [470, 720], [560, 900], [760, 940], [1280, 930], [1800, 940], [2040, 880], [2130, 720], [2250, 610], [2420, 700], [2620, 640]], false, 6);
    const stroke = (w, col, blur, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = blur ? L.rgba(P.hcYellow, 0.9) : 'transparent'; ctx.shadowBlur = blur || 0; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]); for (const p of path) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore(); };
    stroke(14, P.hcInk, 0); stroke(9, P.hcYellow, 22); stroke(3, '#FFF6D8', 0);
    // distance ticks along it
    let acc = 0;
    for (let i = 1; i < path.length; i++) { acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (acc > 60) { acc = 0; const a = Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]) + Math.PI / 2; ctx.strokeStyle = L.rgba(P.lavender, 0.55); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(path[i][0] + Math.cos(a) * 10, path[i][1] + Math.sin(a) * 10); ctx.lineTo(path[i][0] - Math.cos(a) * 10, path[i][1] - Math.sin(a) * 10); ctx.stroke(); } }

    // LEFT motifs (desktop strip, outside the mobile-safe area)
    // ochre hand stencil on a disc of cave stone
    ctx.save(); ctx.beginPath(); ctx.arc(160, 640, 120, 0, TAU); ctx.clip();
    ctx.drawImage(X.wallCanvas(), 300, 500, 600, 600, 40, 520, 240, 240);
    const hand = HC.hand({ cx: 160, cy: 660, s: 0.17, narrow: 0.55 });
    const hr = L.rng(L.hash('bn-hand'));
    for (let k = 0; k < 1400; k++) { const p = hand.outline[Math.floor(hr() * hand.outline.length)]; const a = hr() * TAU, d = 2 + -Math.log(1 - hr() * 0.98) * 12; const x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d; if (L.polyContains(hand.outline, x, y)) continue; ctx.fillStyle = L.rgba(P.ochre, 0.4 + hr() * 0.5); ctx.beginPath(); ctx.arc(x, y, 0.8 + hr() * 1.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = P.hcIvory; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(160, 640, 120, 0, TAU); ctx.stroke();
    // Orion, engraved
    const ori = [[290, 880], [328, 840], [350, 830], [372, 822], [282, 770], [390, 780], [320, 740], [385, 900]];
    [[0, 1], [1, 2], [2, 3], [1, 4], [3, 5], [4, 6], [5, 6], [3, 7]].forEach(([a, b]) => { ctx.strokeStyle = L.rgba(P.hcOrange, 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ori[a][0], ori[a][1]); ctx.lineTo(ori[b][0], ori[b][1]); ctx.stroke(); });
    ori.forEach(([x, y], i) => X.star8(ctx, x, y, i === 0 || i === 4 ? 13 : 9, { fill: P.hcIvory }));
    // the bronze gear (2D engraving of the Antikythera wheel)
    const GX = 365, GY = 560;
    const gp = X.gear(40, 4.8).pts.map(([x, y]) => [GX + x, GY + y]);
    ctx.beginPath(); L.tracePath(ctx, gp, true); ctx.fillStyle = P.bronze; ctx.fill();
    L.hatch(ctx, gp, { angle: -0.8, spacing: 5, width: 1.3, color: '#3A2410', alpha: 0.7, seed: 31, density: (x) => L.clamp((x - GX + 20) / 90) });
    ctx.strokeStyle = P.hcInk; ctx.lineWidth = 3; ctx.stroke();
    [[GX, GY, 16]].forEach(([x, y, rr]) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fillStyle = P.hcNavy; ctx.fill(); ctx.stroke(); });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; ctx.beginPath(); ctx.moveTo(GX + Math.cos(a) * 16, GY + Math.sin(a) * 16); ctx.lineTo(GX + Math.cos(a) * 88, GY + Math.sin(a) * 88); ctx.lineWidth = 8; ctx.strokeStyle = P.hcInk; ctx.stroke(); }

    // CENTRE (mobile safe): the wordmark, already written by the line
    const lay = (word, cap, base, gap) => { let tot = 0; for (const ch of word) tot += G[ch].w * cap; tot += gap * (word.length - 1); let x = W / 2 - tot / 2; const out = []; for (const ch of word) { G[ch].s.forEach((st) => out.push(st.map(([u, v]) => [x + u * cap, base - cap + v * cap]))); x += G[ch].w * cap + gap; } return out; };
    const strokes = lay('WHY WE WONDER', 114, 792, 24);
    const draw = (w, col, blur) => strokes.forEach((s) => { ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = blur ? L.rgba(P.hcYellow, 0.95) : 'transparent'; ctx.shadowBlur = blur || 0; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); for (const p of s) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore(); });
    draw(20, P.hcInk, 0); draw(13, P.hcYellow, 28); draw(4, '#FFF6D8', 0);
    // construction lines + tagline
    ctx.strokeStyle = L.rgba(P.lavender, 0.3); ctx.lineWidth = 1.5;
    [672, 800].forEach((y) => { ctx.beginPath(); ctx.moveTo(560, y); ctx.lineTo(2000, y); ctx.stroke(); });
    L.text(ctx, 'SCIENCE  ·  MYSTERY  ·  HISTORY  ·  ENGINEERING', W / 2, 600, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: '#C9D1E6', tracking: '0.3em' });
    L.text(ctx, 'STAY CURIOUS.', W / 2, 880, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcIvory, tracking: '0.5em' });

    // RIGHT motifs: the Moon and Earth (3D), a woodcut dancer, the umbrella and its pellet (3D)
    const glowAt = (x, y, rr, col, a) => { const g = ctx.createRadialGradient(x, y, rr * 0.8, x, y, rr * 2.2); g.addColorStop(0, L.rgba(col, a)); g.addColorStop(1, L.rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - rr * 3, y - rr * 3, rr * 6, rr * 6); };
    glowAt(2205, 640, 90, P.hcCyan, 0.25);
    M.sphere(ctx, earthTex(L, P), 'bn-earth', 2205, 640, 90, 1.2, { spec: 0.5, ambient: 0.3, tilt: 0.35, slot: 1 });
    ctx.strokeStyle = L.rgba(P.lineWhite, 0.85); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(2205, 640, 90, 0, TAU); ctx.stroke();
    M.sphere(ctx, moonTex(L, P), 'bn-moon', 2300, 520, 38, 0.6, { spec: 0.2, ambient: 0.3, tilt: 0.1, slot: 2 });
    ctx.beginPath(); ctx.arc(2300, 520, 38, 0, TAU); ctx.stroke();
    ctx.save(); ctx.filter = 'invert(1)'; WC.dancer(ctx, 2310, 880, 0.26, 1.3); ctx.restore();
    ctx.save(); ctx.translate(2440, 860); ctx.rotate(0.35); ctx.fillStyle = P.hcIvory; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -60); ctx.lineTo(-7, -230); ctx.lineTo(7, -230); ctx.lineTo(10, -60); ctx.closePath(); ctx.fill(); ctx.strokeStyle = P.hcIvory; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, -230); ctx.lineTo(0, -270); ctx.arc(-14, -270, 14, 0, -Math.PI, true); ctx.stroke(); ctx.restore();
    glowAt(2462, 905, 16, P.hcYellow, 0.5);
    M.sphere(ctx, M.pelletTex(), 'pellet', 2462, 905, 16, 0.8, { spec: 1, ambient: 0.3, tilt: 0.25, slot: 3 });
    // the Wright Flyer, a quick engraved silhouette riding the line on the left of centre
    ctx.save(); ctx.translate(650, 900); ctx.rotate(-0.12); ctx.strokeStyle = P.hcIvory; ctx.lineWidth = 3;
    ctx.strokeRect(-70, -22, 140, 6); ctx.strokeRect(-70, 6, 140, 6);
    for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 22, -16); ctx.lineTo(k * 22, 6); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-70, -5); ctx.lineTo(-100, -5); ctx.moveTo(70, -5); ctx.lineTo(92, -5); ctx.stroke(); ctx.strokeRect(-110, -16, 8, 24); ctx.strokeRect(92, -18, 6, 28);
    ctx.restore();
    // the line's head: a spark leaving the frame
    L.glowDot(ctx, 2560 - 30, 652, 9, { color: P.hcYellow, core: '#FFFBEA', rays: 12, rayLen: 4, seed: 3 });
  } });
})();
