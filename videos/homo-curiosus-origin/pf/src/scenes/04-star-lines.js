// 04 · star-lines · T 8.25–11.00 · paper
// Layers: (1) ivory paper (2) graticule + Milky Way stipple inside the planisphere (3) background engraved stars
// (4) zodiac band with planetary sigils, outer G5 ring with degree ticks (5) rotating rete
// (6) the engraved hunter fading up 9.5–10.4 (7) Orion's stars, popping as the line arrives on the 8ths
// (8) the curiosity line hopping star to star (9) overlays: angle arc, ruler. Lock at 10.5.
(function () {
  'use strict';
  const ID = 'star-lines';
  const C = [540, 860], R = 400;
  const S = {
    rigel: [650, 1186], mintaka: [590, 878], alnilam: [545, 890], alnitak: [500, 900],
    betel: [420, 640], meissa: [540, 560], bella: [640, 680], saiph: [450, 1160],
  };
  const HOPS = [['rigel', 8.25], ['mintaka', 8.75], ['alnilam', 9.0], ['alnitak', 9.25], ['betel', 9.75], ['meissa', 10.0], ['bella', 10.25], ['mintaka', 10.5]];
  const LOCK = 10.5;
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const r = L.rng(L.hash(ID, 'stars'));
    const bg = [];
    for (let i = 0; i < 700; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - 70);
      bg.push([C[0] + Math.cos(a) * d, C[1] + Math.sin(a) * d, r()]);
    }
    GEO = { bg };
    return GEO;
  }
  function sigil(ctx, L, P, x, y, i, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = P.hcInk;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const k = i % 6;
    if (k === 0) { ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.moveTo(1.5, 0); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); }
    if (k === 1) { ctx.arc(-3, 0, 9 * s, -1.2, 1.2, true); ctx.arc(2, 0, 7 * s, 1.1, -1.1, false); }
    if (k === 2) { ctx.arc(-2, 3, 7 * s, 0, Math.PI * 2); ctx.moveTo(3, -2); ctx.lineTo(10, -9); ctx.lineTo(4, -9); ctx.moveTo(10, -9); ctx.lineTo(10, -3); }
    if (k === 3) { ctx.arc(0, -3, 7 * s, 0, Math.PI * 2); ctx.moveTo(0, 4); ctx.lineTo(0, 13); ctx.moveTo(-5, 9); ctx.lineTo(5, 9); }
    if (k === 4) { ctx.moveTo(-8, -8); ctx.lineTo(-8, 8); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(8, -10, 4, 9); ctx.moveTo(-12, -4); ctx.lineTo(-4, -4); }
    if (k === 5) { ctx.moveTo(-6, -10); ctx.lineTo(-6, 6); ctx.quadraticCurveTo(-6, 12, 2, 9); ctx.moveTo(-10, -6); ctx.lineTo(-2, -6); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(6, -6, 6, 4); }
    ctx.stroke();
    ctx.restore();
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const g = geo(L);
      const TAU = Math.PI * 2;
      L.paper(ctx, { color: P.hcIvory, seed: 4, vignette: 0.45 });
      // engraved cartouche ribbon at the top and a horizon with a stargazer below: the chart sits in a world
      {
        const rb = [];
        for (let x = 150; x <= 930; x += 15) rb.push([x, 300 + Math.sin((x - 150) / 780 * Math.PI) * -26]);
        const top = rb.map(([x, y]) => [x, y - 44]), bot = rb.map(([x, y]) => [x, y + 44]).reverse();
        const band = top.concat(bot);
        L.tracePath(ctx, band, true);
        ctx.fillStyle = L.rgba(P.hcIvoryShade, 0.9);
        ctx.fill();
        L.hatch(ctx, band, { angle: 0, spacing: 5, width: 1, color: P.hcInkSoft, alpha: 0.4, seed: 51, density: (x, y) => L.clamp((y - 270) / 80) });
        L.inkPath(ctx, band, { closed: true, width: 2.4, color: P.hcInk, seed: 52 });
        [[150, -1], [930, 1]].forEach(([x, d], i) => {
          const curl = [[x, 256], [x - d * 40, 250], [x - d * 70, 290], [x - d * 40, 330], [x, 344]];
          L.inkPath(ctx, curl, { width: 2.2, color: P.hcInk, seed: 53 + i });
          L.inkPath(ctx, L.ellipsePts(x - d * 46, 296, 16, 26, 20), { closed: true, width: 1.6, color: P.hcInk, seed: 55 + i, fill: L.rgba(P.hcIvoryDeep, 0.8) });
        });
        L.text(ctx, 'O R I O N', 540, 296, { size: 58, weight: 600, family: '"Fraunces", Georgia, serif', align: 'center', baseline: 'middle', color: P.hcInk, alpha: 0.9 });
        // horizon: engraved hills, a stargazer with a staff pointing up
        const hill = [];
        for (let x = -20; x <= 1100; x += 16) hill.push([x, 1640 + Math.sin(x * 0.006) * 40 + L.noise1(x * 0.01, 56) * 30]);
        const land = hill.concat([[1100, 1920], [-20, 1920]]);
        L.tracePath(ctx, land, true);
        ctx.fillStyle = L.rgba(P.hcIvoryShade, 0.95);
        ctx.fill();
        L.hatch(ctx, land, { angle: -0.1, spacing: 6, width: 1.2, color: P.hcInkSoft, alpha: 0.6, seed: 57, density: (x, y) => L.clamp((y - 1640) / 160) });
        L.inkPath(ctx, hill, { width: 2.6, color: P.hcInk, seed: 58 });
        const sg = [800, 1612];
        const bob = Math.sin(T * 3) * 2;
        L.inkPath(ctx, [[sg[0], sg[1]], [sg[0] - 4, sg[1] - 70 + bob]], { width: 9, color: P.hcInk, seed: 59 });
        L.inkCircle(ctx, sg[0] - 6, sg[1] - 88 + bob, 13, { width: 2, color: P.hcInk, seed: 60, fill: P.hcInk });
        L.inkPath(ctx, [[sg[0] - 4, sg[1] - 62 + bob], [sg[0] - 40, sg[1] - 118], [sg[0] - 58, sg[1] - 150]], { width: 3, color: P.hcInk, seed: 61 });
        L.inkPath(ctx, [[sg[0] + 18, sg[1] + 6], [sg[0] + 30, sg[1] - 120]], { width: 2.4, color: P.hcInk, seed: 62 });
        L.inkPath(ctx, [[sg[0] - 2, sg[1] - 64], [sg[0] + 24, sg[1] - 40]], { width: 3, color: P.hcInk, seed: 63 });
        L.arcAnnotation(ctx, sg[0] - 58, sg[1] - 150, 70, -2.3, -1.2, { color: P.annBlue, width: 2, dash: [10, 8], alpha: 0.8 });
      }
      const zoom = 1 + 0.05 * Math.sin(Math.PI * L.clamp((T - 8.25) / (LOCK - 8.25)));
      ctx.save();
      ctx.translate(C[0], C[1]);
      ctx.scale(zoom, zoom);
      ctx.translate(-C[0], -C[1]);
      const circ = L.ellipsePts(C[0], C[1], R, R, 128);

      // inside the planisphere: wash, graticule, Milky Way
      ctx.save();
      L.tracePath(ctx, circ, true);
      ctx.fillStyle = L.rgba(P.hcIvoryShade, 0.55);
      ctx.fill();
      ctx.clip();
      ctx.strokeStyle = L.rgba(P.hcInkSoft, 0.28);
      ctx.lineWidth = 1.2;
      for (let k = 1; k < 6; k++) {
        ctx.beginPath();
        ctx.ellipse(C[0], C[1], (R * k) / 6, R, 0, 0, TAU);
        ctx.stroke();
        const y = C[1] + ((k - 3) * R) / 3;
        ctx.beginPath();
        ctx.ellipse(C[0], y + R * 0.9, R * 1.5, R * 0.9, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      L.stipple(ctx, null, { bounds: { x: C[0] - R, y: C[1] - R, w: 2 * R, h: 2 * R }, spacing: 6, r: [0.5, 1.5], color: P.hcInkSoft, alpha: 0.55, seed: 21,
        density: (x, y) => { const d = Math.abs((x - C[0]) * 0.8 + (y - C[1]) * 0.6 + 60) / 120; return L.clamp(1 - d) * (0.5 + 0.5 * L.noise2(x * 0.01, y * 0.01, 22)); } });
      g.bg.forEach(([x, y, s], i) => {
        if (s > 0.93) X.star8(ctx, x, y, 3 + s * 6, { fill: P.hcInk, rot: (i % 7) * 0.2 });
        else {
          ctx.fillStyle = L.rgba(P.hcInk, 0.35 + s * 0.5);
          ctx.beginPath();
          ctx.arc(x, y, 0.6 + s * 1.6, 0, TAU);
          ctx.fill();
        }
      });
      ctx.restore();

      // rete: an eccentric ecliptic ring with flame pointers, turning until the lock
      const lockE = L.ease.outBack(L.clamp((T - LOCK) / 0.25));
      const rot = (T < LOCK ? (T - 8.25) * 0.22 : (LOCK - 8.25) * 0.22) * (1 - lockE) + 0.42 * lockE;
      ctx.save();
      ctx.translate(C[0], C[1]);
      ctx.rotate(rot);
      ctx.strokeStyle = L.rgba(P.hcInk, 0.8);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, -40, 270, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -40, 258, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        const bx = Math.cos(a) * 262, by = -40 + Math.sin(a) * 262;
        const tx = Math.cos(a + 0.25) * 170, ty = Math.sin(a + 0.25) * 170;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + tx) / 2 + Math.cos(a + 1.6) * 30, (by + ty) / 2 + Math.sin(a + 1.6) * 30, tx, ty);
        ctx.quadraticCurveTo((bx + tx) / 2 + Math.cos(a + 1.6) * 12, (by + ty) / 2 + Math.sin(a + 1.6) * 12, bx + Math.cos(a + 1.57) * 10, by + Math.sin(a + 1.57) * 10);
        ctx.fillStyle = L.rgba(P.hcInkSoft, 0.35);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // zodiac band + sigils, outer G5 ring with ticks
      ctx.strokeStyle = P.hcInk;
      ctx.lineWidth = 1.6;
      [330, 380].forEach((r) => { ctx.beginPath(); ctx.arc(C[0], C[1], r, 0, TAU); ctx.stroke(); });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(C[0] + Math.cos(a) * 330, C[1] + Math.sin(a) * 330);
        ctx.lineTo(C[0] + Math.cos(a) * 380, C[1] + Math.sin(a) * 380);
        ctx.stroke();
        const am = a + Math.PI / 12;
        sigil(ctx, L, P, C[0] + Math.cos(am) * 355, C[1] + Math.sin(am) * 355, i, 1);
      }
      L.hatch(ctx, (c) => { c.arc(C[0], C[1], 330, 0, TAU); c.arc(C[0], C[1], 300, 0, TAU, true); }, { bounds: { x: C[0] - 340, y: C[1] - 340, w: 680, h: 680 }, angle: 0.6, spacing: 5, width: 1, color: P.hcInkSoft, alpha: 0.45, seed: 23 });
      const ringW = T < LOCK ? 3 : L.lerp(3, 7, L.ease.outBack(L.clamp((T - LOCK) / 0.2)));
      L.inkCircle(ctx, C[0], C[1], R, { width: ringW, color: P.hcInk, seed: 24 });
      ctx.strokeStyle = L.rgba(P.hcInk, 0.85);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(C[0], C[1], R + 14, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * TAU;
        const l = i % 5 === 0 ? 18 : 9;
        ctx.lineWidth = i % 5 === 0 ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R);
        ctx.lineTo(C[0] + Math.cos(a) * (R - l), C[1] + Math.sin(a) * (R - l));
        ctx.stroke();
      }

      // the hunter, engraved, fading up behind the stars
      const hf = L.ease.inOutQuad(L.clamp((T - 9.5) / 0.9));
      if (hf > 0) {
        const body = [[432, 652], [628, 690], [604, 872], [690, 1180], [640, 1206], [560, 968], [474, 1172], [428, 1152], [496, 886]];
        L.tracePath(ctx, body, true);
        ctx.fillStyle = L.rgba(P.hcIvoryDeep, 0.35 * hf);
        ctx.fill();
        L.hatch(ctx, body, { angle: -0.8, spacing: 6, width: 1.1, color: P.hcInkSoft, alpha: 0.55 * hf, seed: 31, density: (x, y) => L.clamp((x - 430) / 260) });
        L.inkPath(ctx, body, { closed: true, width: 2, color: P.hcInk, alpha: 0.7 * hf, seed: 32 });
        L.inkCircle(ctx, 540, 590, 40, { width: 2, color: P.hcInk, alpha: 0.7 * hf, seed: 33 });
        L.inkPath(ctx, [[432, 652], [398, 520], [392, 430]], { width: 3, color: P.hcInk, alpha: 0.7 * hf, seed: 34 });
        L.inkPath(ctx, L.capsulePts(400, 400, 110, 16, -1.35, 30), { closed: true, width: 2, color: P.hcInk, alpha: 0.7 * hf, seed: 35, fill: L.rgba(P.hcInkSoft, 0.25 * hf) });
        L.inkPath(ctx, [[640, 660], [716, 628], [744, 712], [742, 790], [720, 846]], { width: 2.2, color: P.hcInk, alpha: 0.7 * hf, seed: 36 });
        L.hatch(ctx, [[640, 660], [716, 628], [744, 712], [742, 790], [720, 846], [660, 760]], { angle: 1.2, spacing: 5, width: 1, color: P.hcInkSoft, alpha: 0.5 * hf, seed: 37 });
      }

      // the hops: line + star pops
      const pts = HOPS.map(([n]) => S[n]);
      const segLen = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segLen.push(d); total += d; }
      let drawn = 0;
      for (let i = 1; i < HOPS.length; i++) {
        const u = L.ease.inOutCubic(L.clamp((T - HOPS[i - 1][1]) / (HOPS[i][1] - HOPS[i - 1][1])));
        drawn += segLen[i - 1] * u;
        if (u < 1) break;
      }
      // dense resample so the line's draw fraction follows arc length
      const path = [];
      for (let i = 1; i < pts.length; i++) for (let s = 0; s < 1; s += 0.02) path.push([L.lerp(pts[i - 1][0], pts[i][0], s), L.lerp(pts[i - 1][1], pts[i][1], s)]);
      path.push(pts[pts.length - 1]);
      HC.line(ctx, path, { plate: 'paper', from: 0, to: Math.max(0.004, drawn / total), width: 6, seed: 5, wobble: 0.8 });
      if (T > 10.0) {
        const fa = L.clamp((T - 10.0) / 0.5);
        [[S.alnitak, S.saiph], [S.betel, [398, 520]], [S.bella, [716, 628]]].forEach(([a, b], i) => L.inkPath(ctx, [a, b], { width: 2, color: P.hcOrangeDeep, alpha: 0.7, draw: fa, seed: 40 + i, taper: 6 }));
      }
      Object.keys(S).forEach((n, i) => {
        const hit = HOPS.find(([m]) => m === n);
        const at = hit ? hit[1] : 10.4;
        const big = n === 'rigel' || n === 'betel';
        let sc = 0.55;
        if (T >= at) sc = [0.75, 1.25, 1.0][Math.min(2, Math.floor((T - at) * 12 + 1e-6))];
        X.star8(ctx, S[n][0], S[n][1], (big ? 26 : 17) * sc, { fill: T >= at ? P.hcInk : P.hcInkSoft, rot: 0.1 * i });
        if (T >= at && T < at + 0.3) {
          const u = (T - at) / 0.3;
          ctx.strokeStyle = L.rgba(P.hcOrange, 1 - u);
          ctx.lineWidth = 1.6;
          for (let r = 0; r < 12; r++) {
            const a = (r / 12) * TAU;
            ctx.beginPath();
            ctx.moveTo(S[n][0] + Math.cos(a) * (20 + 30 * u), S[n][1] + Math.sin(a) * (20 + 30 * u));
            ctx.lineTo(S[n][0] + Math.cos(a) * (32 + 48 * u), S[n][1] + Math.sin(a) * (32 + 48 * u));
            ctx.stroke();
          }
        }
      });
      // Rigel arrives as the question mark's dot: a yellow core that cools into the engraved star
      if (T < 8.6) {
        const u = L.clamp((T - 8.25) / 0.35);
        ctx.fillStyle = L.rgba(P.hcYellow, 1 - u);
        ctx.beginPath();
        ctx.arc(S.rigel[0], S.rigel[1], 35.5 * (1 - 0.4 * u), 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // overlays (screen-fixed): an angular measure Betelgeuse→Rigel, a ruler under the ring
      const oa = L.ease.outExpo(L.clamp((T - 9.9) / 0.4));
      if (oa > 0) {
        const a0 = Math.atan2(S.betel[1] - C[1], S.betel[0] - C[0]), a1 = Math.atan2(S.rigel[1] - C[1], S.rigel[0] - C[0]);
        const sweep = (((a0 - a1) % TAU) + TAU) % TAU;
        L.arcAnnotation(ctx, C[0], C[1], 455, a1, a1 + sweep * oa, { color: P.annYellow, width: 2.5, endTicks: 10, arrow: 9 });
      }
      const ra = L.ease.outExpo(L.clamp((T - 8.4) / 0.5));
      ctx.strokeStyle = L.rgba(P.annBlue, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(140, 1320);
      ctx.lineTo(140 + 800 * ra, 1320);
      ctx.stroke();
      for (let i = 0; i <= 40; i++) {
        if (i / 40 > ra) break;
        const x = 140 + i * 20;
        ctx.beginPath();
        ctx.moveTo(x, 1320);
        ctx.lineTo(x, 1320 - (i % 5 === 0 ? 24 : 11));
        ctx.stroke();
      }
    },
  });
})();
