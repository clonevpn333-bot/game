// 08 · bigger-question · T 18.75–21.75 · paper
// One continuous Droste zoom through six nested engravings. Level n is drawn in its own local frame; its "portal"
// (centre c, radius r) is where level n+1 lives. As z runs 0→5 the portal grows to fill the container of the next level.
//   L0 the Moon on G6 is the dot of a "?" (hook drawn by the curiosity line)   portal: the hook's curl
//   L1 a human eye                                                              portal: the pupil
//   L2 a cell                                                                   portal: the nucleus
//   L3 the DNA double helix                                                     portal: one base pair
//   L4 a spiral galaxy                                                          portal: the core
//   L5 a new "?" whose dot is a star (21.0: red ring), which unravels into a line exiting right at G7 (y 760).
(function () {
  'use strict';
  const ID = 'bigger-question';
  const A = [540, 900], RC = 520;
  const Z0 = 19.1, Z1 = 21.0, UNRAVEL = 21.0;
  const Q0 = { cx: 540, cy: 330, size: 570 }; // level-0 question mark (screen coords at z = 0)
  const PORT = [
    { c: [0, 330 - 0.95 * 150 - 900], r: 120 }, // L0 (local = screen − A): the hook's curl
    { c: [0, 0], r: 130 },
    { c: [0, 0], r: 130 },
    { c: [0, 0], r: 125 },
    { c: [0, 0], r: 120 },
  ];
  let GAL = null;
  function galaxy(L) {
    if (GAL) return GAL;
    const r = L.rng(L.hash(ID, 'gal'));
    const pts = [];
    for (let i = 0; i < 3200; i++) {
      const arm = i % 2;
      const tt = Math.pow(r(), 0.7) * 3.4;
      const a = tt * 1.9 + arm * Math.PI + (r() - 0.5) * 0.5;
      const rad = 60 + tt * 135 + (r() - 0.5) * 40;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.82, r()]);
    }
    GAL = pts;
    return pts;
  }
  function moon(ctx, L, P, cx, cy, R) {
    const disc = L.ellipsePts(cx, cy, R, R, 72);
    L.tracePath(ctx, disc, true);
    ctx.fillStyle = P.moon;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const r = L.rng(L.hash(ID, 'moon'));
    for (let i = 0; i < 6; i++) {
      const b = FILM.hx.blob(cx + (r() - 0.5) * R * 1.2, cy + (r() - 0.5) * R * 1.2, R * (0.18 + r() * 0.2), R * (0.12 + r() * 0.14), 400 + i, 20, 0.3);
      L.tracePath(ctx, b, true);
      ctx.fillStyle = L.rgba(P.moonShade, 0.8);
      ctx.fill();
    }
    for (let i = 0; i < 22; i++) {
      const x = cx + (r() - 0.5) * R * 1.8, y = cy + (r() - 0.5) * R * 1.8, cr = R * (0.03 + Math.pow(r(), 3) * 0.12);
      L.inkCircle(ctx, x, y, cr, { width: 1.4, color: P.hcInkSoft, seed: 410 + i });
    }
    L.crossHatch(ctx, disc, { tone: 0.8, spacing: 6, width: 1.2, color: P.hcInk, alpha: 0.75, seed: 420, density: (x, y) => L.clamp(((x - cx) * 0.7 + (y - cy) * 0.5) / R + 0.1) });
    ctx.restore();
    L.inkPath(ctx, disc, { closed: true, width: 4, color: P.hcInk, seed: 421, double: true });
  }
  // ---- the six levels (local coords, container radius RC)
  const LEVEL = [
    (ctx, L, P, T) => {
      // L0: local = screen − A; the Moon at G6 and the hook above it
      moon(ctx, L, P, 0, 700 - 900, 170);
      const q = FILM.hc.question(Q0.cx - 540, Q0.cy - 900, Q0.size);
      const u = L.ease.outCubic(L.clamp((T - 18.75) / 0.35));
      const hook = q.hook.filter((p) => p[1] < 700 - 900 - 175);
      FILM.hc.line(ctx, hook, { plate: 'paper', to: Math.max(0.02, u), width: 9, seed: 5 });
      L.guideCircle(ctx, PORT[0].c[0], PORT[0].c[1], 0.95 * 150 + 40, { color: P.hcInkSoft, alpha: 0.3, width: 1.2, dash: [8, 8] });
    },
    (ctx, L, P) => {
      // L1: an eye
      const lid = [];
      for (let i = 0; i <= 40; i++) { const x = -470 + (940 * i) / 40; lid.push([x, -Math.pow(1 - Math.pow(x / 470, 2), 0.8) * 250]); }
      const low = lid.map(([x, y]) => [x, -y * 0.78]).reverse();
      const eye = lid.concat(low);
      L.tracePath(ctx, eye, true);
      ctx.fillStyle = '#FBF5E6';
      ctx.fill();
      ctx.save();
      ctx.clip();
      L.hatch(ctx, eye, { angle: 0.1, spacing: 7, width: 1.1, color: P.hcInkSoft, alpha: 0.45, seed: 501, density: (x, y) => L.clamp(Math.abs(x) / 470 * 1.2 - 0.35) });
      const ir = L.ellipsePts(0, 0, 230, 230, 96);
      L.tracePath(ctx, ir, true);
      ctx.fillStyle = L.mix(L.mix(P.hcOrange, P.ochre, 0.4), P.hcIvory, 0.45);
      ctx.fill();
      const r = L.rng(L.hash(ID, 'iris'));
      for (let i = 0; i < 260; i++) {
        const a = (i / 260) * Math.PI * 2 + (r() - 0.5) * 0.02;
        const r0 = 128 + r() * 10, r1 = 200 + r() * 28;
        ctx.strokeStyle = L.rgba(i % 3 ? P.hcOrangeDeep : P.hcInk, 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.quadraticCurveTo(Math.cos(a + 0.05) * (r0 + r1) / 2, Math.sin(a + 0.05) * (r0 + r1) / 2, Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.2;
        L.inkPath(ctx, L.ellipsePts(Math.cos(a) * 172, Math.sin(a) * 172, 14, 8, 12, a), { closed: true, width: 1.4, color: P.hcInk, seed: 530 + i, fill: L.rgba(P.hcOrangeDeep, 0.6) });
      }
      L.crossHatch(ctx, ir, { tone: 0.6, spacing: 5, width: 1, color: P.hcInk, alpha: 0.55, seed: 540, density: (x, y) => L.clamp((-y - 40) / 190) });
      ctx.fillStyle = 'rgba(255,252,240,0.92)';
      ctx.fillRect(-120, -150, 34, 44);
      ctx.fillRect(-80, -150, 34, 44);
      ctx.fillRect(-120, -100, 34, 44);
      ctx.fillRect(-80, -100, 34, 44);
      L.inkCircle(ctx, 0, 0, 230, { width: 6, color: P.hcInk, seed: 502 });
      L.inkCircle(ctx, 0, 0, 175, { width: 1.5, color: P.hcInk, alpha: 0.5, seed: 503 });
      L.crossHatch(ctx, eye, { tone: 0.7, spacing: 6, width: 1.2, color: P.hcInk, alpha: 0.5, seed: 504, density: (x, y) => L.clamp((-y - 120) / 140) });
      ctx.restore();
      L.inkPath(ctx, eye, { closed: true, width: 5, color: P.hcInk, seed: 505 });
      for (let i = 0; i < 34; i++) {
        const p = lid[2 + i];
        const ang = -Math.PI / 2 + (p[0] / 470) * 0.9;
        L.inkPath(ctx, [p, [p[0] + Math.cos(ang) * 30, p[1] + Math.sin(ang) * 34], [p[0] + Math.cos(ang + 0.4) * 52, p[1] + Math.sin(ang + 0.4) * 50]], { width: 3, color: P.hcInk, seed: 520 + i, taper: [2, 24] });
      }
      L.inkPath(ctx, lid.map(([x, y]) => [x * 1.05, y * 1.25 - 40]), { width: 2.4, color: P.hcInkSoft, seed: 560 });
    },
    (ctx, L, P) => {
      // L2: a cell
      const mem = L.ellipsePts(0, 0, 470, 450, 120);
      L.tracePath(ctx, mem, true);
      ctx.fillStyle = L.mix(P.hcIvory, P.hcYellowPale, 0.35);
      ctx.fill();
      L.stipple(ctx, mem, { spacing: 9, r: [0.6, 1.5], color: P.hcInkSoft, alpha: 0.6, seed: 601 });
      const r = L.rng(L.hash(ID, 'cell'));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + r(), d = 260 + r() * 110;
        const mx = Math.cos(a) * d, my = Math.sin(a) * d;
        const cap = L.capsulePts(mx, my, 110, 34, a + 1.2, 40);
        L.inkPath(ctx, cap, { closed: true, width: 2.4, color: P.hcInk, seed: 610 + i, fill: L.mix(P.hcOrange, P.hcIvory, 0.55) });
        const zz = [];
        for (let k = 0; k <= 10; k++) { const s = -45 + k * 9; zz.push([mx + Math.cos(a + 1.2) * s + Math.cos(a + 2.77) * (k % 2 ? 18 : -18), my + Math.sin(a + 1.2) * s + Math.sin(a + 2.77) * (k % 2 ? 18 : -18)]); }
        L.inkPath(ctx, zz, { width: 1.5, color: P.hcOrangeDeep, seed: 620 + i, smooth: false });
      }
      for (let k = 0; k < 5; k++) {
        const pts = [];
        for (let a = 0; a < 2.4; a += 0.08) pts.push([Math.cos(a + k * 1.3) * (170 + k * 12 + Math.sin(a * 9) * 10), Math.sin(a + k * 1.3) * (170 + k * 12 + Math.sin(a * 9) * 10)]);
        L.inkPath(ctx, pts, { width: 1.6, color: P.hcInkSoft, seed: 630 + k });
      }
      for (let i = 0; i < 24; i++) L.inkCircle(ctx, (r() - 0.5) * 760, (r() - 0.5) * 740, 6 + r() * 12, { width: 1.3, color: P.hcInkSoft, seed: 640 + i });
      L.inkPath(ctx, mem, { closed: true, width: 4.5, color: P.hcInk, seed: 650, double: true });
      const nuc = L.ellipsePts(0, 0, 135, 135, 64);
      L.inkPath(ctx, nuc, { closed: true, width: 3.5, color: P.hcInk, seed: 651, fill: L.mix(P.hcViolet, P.hcIvory, 0.7) });
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; L.inkCircle(ctx, Math.cos(a) * 135, Math.sin(a) * 135, 5, { width: 1.2, color: P.hcInk, seed: 660 + i, fill: P.hcIvory }); }
    },
    (ctx, L, P, T) => {
      // L3: DNA
      const ph = T * 1.2;
      const strand = (sgn) => { const pts = []; for (let y = -560; y <= 560; y += 10) pts.push([sgn * 190 * Math.sin(y * 0.011 + ph), y]); return pts; };
      const sA = strand(1), sB = strand(-1);
      for (let y = -540; y <= 540; y += 34) {
        const xa = 190 * Math.sin(y * 0.011 + ph), xb = -xa;
        const mid = Math.abs(y) < 18;
        ctx.strokeStyle = mid ? P.hcOrange : L.rgba(P.hcInkSoft, 0.85);
        ctx.lineWidth = mid ? 6 : 3;
        ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(0, y); ctx.stroke();
        ctx.strokeStyle = mid ? P.hcYellow : L.rgba(P.hcInk, 0.85);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(xb, y); ctx.stroke();
      }
      [[sA, 701], [sB, 702]].forEach(([s, sd]) => {
        L.inkPath(ctx, s, { width: 26, color: P.hcInk, seed: sd });
        L.inkPath(ctx, s, { width: 18, color: sd === 701 ? L.mix(P.hcOrange, P.hcIvory, 0.45) : L.mix(P.hcCyan, P.hcIvory, 0.5), seed: sd + 10 });
      });
    },
    (ctx, L, P) => {
      // L4: a spiral galaxy
      const g = galaxy(L);
      for (const [x, y, s] of g) {
        ctx.fillStyle = L.rgba(s > 0.9 ? P.hcOrangeDeep : P.hcInk, 0.35 + s * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, 0.8 + s * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let arm = 0; arm < 2; arm++) {
        const pts = [];
        for (let tt = 0.2; tt < 3.3; tt += 0.05) { const a = tt * 1.9 + arm * Math.PI + 0.25; pts.push([Math.cos(a) * (60 + tt * 135), Math.sin(a) * (60 + tt * 135) * 0.82]); }
        L.inkPath(ctx, pts, { width: 3, color: P.hcInkSoft, alpha: 0.7, seed: 801 + arm });
      }
      L.stipple(ctx, L.ellipsePts(0, 0, 120, 100, 40), { spacing: 3.5, r: [0.6, 1.4], color: P.hcInk, alpha: 0.8, seed: 810 });
    },
    (ctx, L, P, T) => {
      // L5: the bigger question
      const q = FILM.hc.question(0, -60, 760);
      if (T < UNRAVEL) {
        FILM.hc.line(ctx, q.hook, { plate: 'paper', width: 9, seed: 5, head: false });
        FILM.hx.star8(ctx, q.dot[0], q.dot[1], 40, { fill: P.hcInk });
      }
    },
  ];

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const TAU = Math.PI * 2;
      L.paper(ctx, { color: P.hcIvory, seed: 8, vignette: 0.4 });
      const z = 5 * L.ease.inOutCubic(L.clamp((T - Z0) / (Z1 - Z0)));
      const n = Math.min(4, Math.floor(z)), f = z >= 5 ? 1 : z - n;
      const rot = 0.1 * z;
      // frames for levels n-1 … n+2
      const frames = {};
      const s = Math.pow(RC / PORT[n].r, f);
      const Q = [A[0] + PORT[n].c[0] * (1 - f), A[1] + PORT[n].c[1] * (1 - f)];
      frames[n] = { o: [Q[0] - PORT[n].c[0] * s, Q[1] - PORT[n].c[1] * s], s };
      if (n > 0) { const sp = (s * RC) / PORT[n - 1].r; frames[n - 1] = { o: [frames[n].o[0] - PORT[n - 1].c[0] * sp, frames[n].o[1] - PORT[n - 1].c[1] * sp], s: sp }; }
      let cur = frames[n];
      for (let k = n + 1; k <= Math.min(5, n + 2); k++) {
        const pk = PORT[k - 1];
        const nf = { o: [cur.o[0] + pk.c[0] * cur.s, cur.o[1] + pk.c[1] * cur.s], s: (cur.s * pk.r) / RC };
        frames[k] = nf;
        cur = nf;
      }
      const keys = Object.keys(frames).map(Number).sort((a, b) => a - b);
      ctx.save();
      ctx.translate(A[0], A[1]);
      ctx.rotate(rot);
      ctx.translate(-A[0], -A[1]);
      keys.forEach((k, idx) => {
        const fr = frames[k];
        const rScreen = RC * fr.s;
        if (rScreen < 6) return;
        ctx.save();
        if (idx > 0 && k > 0) {
          // the lens: a container circle cut into the parent
          ctx.beginPath();
          ctx.arc(fr.o[0], fr.o[1], rScreen, 0, TAU);
          ctx.fillStyle = P.hcIvory;
          ctx.fill();
          ctx.clip();
        }
        ctx.translate(fr.o[0], fr.o[1]);
        ctx.scale(fr.s, fr.s);
        LEVEL[k](ctx, L, P, T);
        ctx.restore();
        if (idx > 0 && k > 0) {
          ctx.strokeStyle = L.rgba(P.hcInk, 0.8);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(fr.o[0], fr.o[1], rScreen, 0, TAU);
          ctx.stroke();
          ctx.strokeStyle = L.rgba(P.hcOrange, 0.6);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(fr.o[0], fr.o[1], rScreen + 8, 0, TAU);
          ctx.stroke();
        }
      });
      ctx.restore();

      // 21.0: the bigger question arrives (level 5 at scale 1, centred on A): red ring, then it unravels into a line
      if (T >= UNRAVEL) {
        const q = HC.question(0, -60, 760);
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const scr = (p) => [A[0] + p[0] * cs - p[1] * sn, A[1] + p[0] * sn + p[1] * cs];
        const pts = HC.resample(q.hook.map(scr), 6);
        const u = L.ease.inOutCubic(L.clamp((T - UNRAVEL - 0.1) / 0.45));
        const v = L.ease.inCubic(L.clamp((T - UNRAVEL - 0.35) / 0.4));
        const N = pts.length;
        const morphed = pts.map((p, i) => {
          const tx = L.lerp(120, 1000, i / (N - 1)), ty = 760 + Math.sin(i * 0.3) * 6;
          return [L.lerp(p[0], tx, u) + v * 1100, L.lerp(p[1], ty, u)];
        });
        HC.line(ctx, morphed, { plate: 'paper', width: 9, seed: 5, head: v > 0 });
        const dot = scr(q.dot);
        const fade = 1 - L.clamp((T - UNRAVEL) / 0.3);
        if (fade > 0) FILM.hx.star8(ctx, dot[0], dot[1], 40, { fill: P.hcInk, alpha: fade });
        const rr = (T - UNRAVEL) / 0.35;
        if (rr < 1) {
          ctx.strokeStyle = L.rgba(P.hcRed, 1 - rr);
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(dot[0], dot[1], 50 + 300 * L.ease.outExpo(rr), 0, TAU);
          ctx.stroke();
        }
      }
    },
  });
})();
