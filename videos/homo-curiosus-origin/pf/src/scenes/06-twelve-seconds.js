// 06 · twelve-seconds · T 13.75–16.00 · paper
// Layers: (1) ivory sky with wind-streak hatching, engraved clouds (2) Kill Devil Hill + camp shed (parallax 0.3)
// (3) mid dunes (0.6) (4) the launch rail on G6a y 1240 + foreground sand (1.0) (5) the flight path = the curiosity line,
// with a 0–12 s ruler (6) the 1903 Flyer as a projected 3D wire model (canard front, pushers behind, pilot prone)
// (7) Wilbur running at the wingtip (on twos) (8) foreground grass (1.3) and kicked sand (9) 120 FT bracket.
// Beats: liftoff 14.5, line breaks free 15.5 and exits at G6b (1080, 560).
(function () {
  'use strict';
  const ID = 'twelve-seconds';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const T0 = 13.75, LIFT = 14.5, FREE = 15.5;
  const PX = 62; // px per metre at the model's anchor
  const RAIL_Y = 1240;

  const pan = (T) => 170 * (T - T0) + (T > LIFT ? 260 * (T - LIFT) * (T - LIFT) : 0);
  function anchor(T, L) {
    if (T <= LIFT) return [L.lerp(330, 470, (T - T0) / (LIFT - T0)), RAIL_Y - 48];
    const u = (T - LIFT) / (16.0 - LIFT);
    return [470 + 330 * L.ease.inOutQuad(u), RAIL_Y - 48 - 380 * L.ease.inOutSine(u)];
  }
  // the model, in metres: x span, y up, z forward
  let MODEL = null;
  function model() {
    if (MODEL) return MODEL;
    const S = 6.15, C = 0.99, UY = 1.8;
    const struts = [];
    const xs = [0.62, 1.9, 3.18, 4.46, 5.74];
    xs.forEach((x) => [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => struts.push([[sx * x, 0, sz * C * 0.92], [sx * x, UY, sz * C * 0.92]]))));
    const wires = [];
    const bays = [-5.74, -4.46, -3.18, -1.9, -0.62, 0.62, 1.9, 3.18, 4.46, 5.74];
    for (let i = 0; i < bays.length - 1; i++) if (i !== 4) [-1, 1].forEach((sz) => {
      wires.push([[bays[i], 0, sz * C * 0.92], [bays[i + 1], UY, sz * C * 0.92]]);
      wires.push([[bays[i], UY, sz * C * 0.92], [bays[i + 1], 0, sz * C * 0.92]]);
    });
    const ribs = [];
    for (let x = -S + 0.15; x <= S; x += 0.31) ribs.push(x);
    MODEL = { S, C, UY, struts, wires, ribs };
    return MODEL;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const Tw = info.shot.start + L.onTwos(t);
      const TAU = Math.PI * 2;
      const pn = pan(T);
      L.paper(ctx, { color: P.hcIvory, seed: 6, vignette: 0.3 });

      // sky: wind-streak hatching, denser toward the top
      ctx.save();
      ctx.fillStyle = L.rgba(P.skyPale, 0.6);
      ctx.fillRect(0, 0, 1080, 1100);
      L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1080 }, angle: -0.04, spacing: 9, width: 1.1, color: P.hcInkSoft, alpha: 0.45, length: [40, 160], gap: [6, 30], seed: 61,
        density: (x, y) => L.clamp(1 - y / 1000) * (0.55 + 0.45 * L.noise2((x + pn * 0.15) * 0.004, y * 0.01, 62)) });
      ctx.restore();
      // engraved clouds drifting
      [[250, 520, 1], [760, 640, 0.8], [1180, 470, 1.2], [560, 760, 0.6]].forEach(([x, y, s], i) => {
        const cx = ((x - pn * 0.12) % 1500 + 1500) % 1500 - 200;
        const c = [];
        for (let k = 0; k < 7; k++) c.push(X.blob(cx + (k - 3) * 52 * s, y - Math.sin((k / 6) * Math.PI) * 50 * s, 60 * s, 44 * s, 70 + i * 10 + k, 20, 0.12));
        c.forEach((b, k) => {
          L.tracePath(ctx, b, true);
          ctx.fillStyle = P.hcIvory;
          ctx.fill();
          L.inkPath(ctx, b.slice(10, 20).concat(b.slice(0, 3)), { width: 1.8, color: P.hcInkSoft, alpha: 0.8, seed: 80 + i * 10 + k });
          L.hatch(ctx, b, { angle: -0.1, spacing: 6, width: 1, color: P.hcInkSoft, alpha: 0.5, seed: 90 + k, density: (xx, yy) => L.clamp((yy - (y - 20 * s)) / (50 * s)) });
        });
      });

      // far: Kill Devil Hill and the camp shed
      const far = [];
      for (let x = -40; x <= 1120; x += 12) {
        const wx = x + pn * 0.3;
        far.push([x, 1110 - 150 * Math.exp(-Math.pow((wx - 380) / 260, 2)) - 18 * L.noise1(wx * 0.006, 63)]);
      }
      const farFill = far.concat([[1120, 1300], [-40, 1300]]);
      L.tracePath(ctx, farFill, true);
      ctx.fillStyle = L.mix(P.sand, P.skyPale, 0.35);
      ctx.fill();
      L.hatch(ctx, farFill, { angle: 0.2, spacing: 7, width: 1, color: P.sandShade, alpha: 0.55, seed: 64 });
      L.inkPath(ctx, far, { width: 2, color: P.hcInkSoft, seed: 65 });
      {
        const sx = 900 - pn * 0.3;
        if (sx > -200) {
          const base = 1098;
          const shed = [[sx, base], [sx, base - 54], [sx + 60, base - 82], [sx + 150, base - 64], [sx + 150, base]];
          L.tracePath(ctx, shed, true);
          ctx.fillStyle = P.spruce;
          ctx.fill();
          L.hatch(ctx, shed, { angle: Math.PI / 2, spacing: 6, width: 1.1, color: P.hcInkSoft, alpha: 0.8, seed: 66 });
          L.inkPath(ctx, shed, { closed: true, width: 2, color: P.hcInk, seed: 67 });
          L.inkPath(ctx, [[sx + 60, base], [sx + 60, base - 40], [sx + 90, base - 40], [sx + 90, base]], { width: 1.6, color: P.hcInk, seed: 68, fill: P.hcInk });
        }
      }
      // mid dunes
      const mid = [];
      for (let x = -40; x <= 1120; x += 12) { const wx = x + pn * 0.6; mid.push([x, 1190 + 40 * Math.sin(wx * 0.004) + 22 * L.noise1(wx * 0.008, 69)]); }
      const midFill = mid.concat([[1120, 1400], [-40, 1400]]);
      L.tracePath(ctx, midFill, true);
      ctx.fillStyle = P.sand;
      ctx.fill();
      for (let k = 1; k < 6; k++) {
        ctx.strokeStyle = L.rgba(P.sandShade, 0.7);
        ctx.lineWidth = 1.2;
        L.tracePath(ctx, mid.map(([x, y]) => [x, y + k * 16 + Math.sin(x * 0.01 + k) * 4]), false);
        ctx.stroke();
      }
      L.inkPath(ctx, mid, { width: 2.2, color: P.hcInkSoft, seed: 70 });
      // foreground ground
      ctx.fillStyle = L.mix(P.sand, P.hcIvory, 0.25);
      ctx.fillRect(0, RAIL_Y + 6, 1080, 1920);
      L.hatch(ctx, null, { bounds: { x: 0, y: RAIL_Y + 6, w: 1080, h: 680 }, angle: 0.05, spacing: 8, width: 1.2, color: P.sandShade, alpha: 0.65, seed: 71,
        density: (x, y) => 0.25 + 0.6 * L.clamp((y - RAIL_Y) / 600) * (0.6 + 0.4 * L.noise2((x + pn) * 0.004, y * 0.005, 72)) });
      // footprints in the sand
      for (let i = 0; i < 18; i++) {
        const fx = ((i * 97 - pn) % 1400 + 1400) % 1400 - 160;
        L.inkPath(ctx, L.ellipsePts(fx, 1300 + (i % 2) * 22 + (i % 5) * 30, 13, 6, 14), { closed: true, width: 1.4, color: P.sandShade, seed: 73 + i, fill: L.rgba(P.sandShade, 0.4) });
      }

      // the launch rail (G6a)
      {
        const r0 = 120 - pn, r1 = r0 + 640;
        ctx.fillStyle = P.spruce;
        ctx.fillRect(r0, RAIL_Y - 6, r1 - r0, 12);
        L.hatch(ctx, [[r0, RAIL_Y - 6], [r1, RAIL_Y - 6], [r1, RAIL_Y + 6], [r0, RAIL_Y + 6]], { angle: 0, spacing: 4, width: 1, color: P.hcInkSoft, alpha: 0.7, seed: 74 });
        L.inkLine(ctx, r0, RAIL_Y - 6, r1, RAIL_Y - 6, { width: 2.2, color: P.hcInk, seed: 75 });
        L.inkLine(ctx, r0, RAIL_Y + 6, r1, RAIL_Y + 6, { width: 1.6, color: P.hcInk, seed: 76 });
        for (let x = r0; x < r1; x += 48) L.inkPath(ctx, [[x - 14, RAIL_Y + 14], [x + 14, RAIL_Y + 14]], { width: 5, color: P.hcInkSoft, seed: 77 + Math.round(x) });
      }

      // flight path = the curiosity line, trailing behind the flyer in ground coordinates
      const path = [];
      for (let Tk = LIFT; Tk <= Math.min(T, FREE + 0.001); Tk += 1 / 48) {
        const a = anchor(Tk, L);
        path.push([a[0] - (pn - pan(Tk)), a[1] + 40]);
      }
      if (T > FREE) {
        const a = path[path.length - 1];
        const free = L.smoothPts([a, [a[0] + 120, a[1] - 120], [960, 700], [1100, 520]], false, 6);
        const u = L.ease.inCubic(L.clamp((T - FREE) / 0.45));
        const n = Math.max(2, Math.round(free.length * u));
        path.push(...free.slice(1, n));
      }
      if (path.length > 1) {
        HC.line(ctx, path, { plate: 'paper', width: 6, seed: 5, head: T > FREE });
        // 0–12 s ruler ticks along the path
        const total = path.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0), 0);
        const flightLen = Math.min(total, 9999);
        for (let k = 0; k <= 12; k++) {
          const target = (k / 12) * Math.min(flightLen, 720);
          let acc = 0;
          for (let i = 1; i < path.length; i++) {
            const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
            if (acc + d >= target) {
              const p = path[i], q = path[i - 1];
              const ang = Math.atan2(p[1] - q[1], p[0] - q[0]) + Math.PI / 2;
              const len = k % 6 === 0 ? 26 : 13;
              ctx.strokeStyle = P.annBlue;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(p[0], p[1]);
              ctx.lineTo(p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len);
              ctx.stroke();
              break;
            }
            acc += d;
          }
        }
      }

      // the Flyer, projected
      const m = model();
      const a = anchor(T, L);
      const climb = T > LIFT ? 0.14 * Math.sin(L.clamp((T - LIFT) / 1.2) * Math.PI * 0.6) : 0;
      const bob = T > LIFT ? Math.sin(T * 7) * 0.03 : 0;
      const cam = { yaw: -0.62, pitch: -0.2, dist: 1500, f: 1500, cx: a[0], cy: a[1] };
      const pr = (p) => {
        let q = X.rotX([p[0], p[1], p[2]], -(climb + bob));
        q = [q[2] * PX, -q[1] * PX, -q[0] * PX]; // z forward → screen right; x span → depth
        return X.project(q, cam);
      };
      const quad = (pts, fill, alpha, seed, hatchDir) => {
        const q = pts.map(pr);
        L.tracePath(ctx, q, true);
        ctx.fillStyle = L.rgba(fill, alpha);
        ctx.fill();
        if (hatchDir != null) L.hatch(ctx, q, { angle: hatchDir, spacing: 6, width: 1, color: P.hcInkSoft, alpha: 0.45, seed });
        L.inkPath(ctx, q, { closed: true, width: 2.4, color: P.hcInk, seed: seed + 1 });
        return q;
      };
      const seg = (p0, p1, w, col, al) => {
        const a0 = pr(p0), a1 = pr(p1);
        ctx.strokeStyle = L.rgba(col, al);
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(a0[0], a0[1]);
        ctx.lineTo(a1[0], a1[1]);
        ctx.stroke();
      };
      // rudders (rear), props, lower wing, skids, pilot + engine, struts + wires, upper wing, canard (front)
      [-0.35, 0.35].forEach((x, i) => quad([[x, 0.25, -2.7], [x, 1.85, -2.7], [x, 1.85, -3.25], [x, 0.25, -3.25]], P.canvasCloth, 0.95, 100 + i * 3, 1.4));
      seg([0, 0.9, -1.1], [0, 0.9, -2.7], 2, P.hcInk, 0.9);
      const pspin = Tw * 40;
      [-2.6, 2.6].forEach((x, i) => {
        const disc = [];
        for (let k = 0; k <= 28; k++) { const an = (k / 28) * TAU; disc.push(pr([x + Math.cos(an) * 1.3, 0.9 + Math.sin(an) * 1.3, -1.25])); }
        L.tracePath(ctx, disc, true);
        ctx.fillStyle = L.rgba(P.hcInkSoft, 0.12);
        ctx.fill();
        ctx.strokeStyle = L.rgba(P.hcInkSoft, 0.4);
        ctx.lineWidth = 1;
        ctx.stroke();
        const an = pspin * (i ? 1 : -1);
        seg([x - Math.cos(an) * 1.3, 0.9 - Math.sin(an) * 1.3, -1.25], [x + Math.cos(an) * 1.3, 0.9 + Math.sin(an) * 1.3, -1.25], 5, P.spruce, 0.95);
        seg([x, 0.9, -1.25], [0.6, 0.35, -0.9], 1.4, P.hcInk, 0.9); // chain drive
      });
      const lw = quad([[-m.S, 0, m.C], [m.S, 0, m.C], [m.S, 0, -m.C], [-m.S, 0, -m.C]], P.canvasCloth, 0.95, 110, null);
      m.ribs.forEach((x) => seg([x, 0, m.C], [x, 0, -m.C], 1, P.hcInkSoft, 0.7));
      [-0.5, 0.5].forEach((x) => seg([x, -0.45, -1.0], [x, -0.45, 3.1], 3, P.spruce, 1));
      // pilot lying prone left of centre, engine right of centre
      {
        const head = pr([-0.55, 0.28, 0.75]), feet = pr([-0.55, 0.22, -0.9]);
        L.inkPath(ctx, [feet, head], { width: 16 * (head[3] || 1), color: '#2b2622', seed: 120 });
        L.inkCircle(ctx, head[0], head[1] - 6, 9 * (head[3] || 1), { width: 1.6, color: P.hcInk, fill: '#2b2622', seed: 121 });
        const e0 = pr([0.45, 0.05, 0.2]), e1 = pr([0.85, 0.55, -0.4]);
        ctx.fillStyle = '#3d3a36';
        ctx.fillRect(Math.min(e0[0], e1[0]), Math.min(e0[1], e1[1]), Math.abs(e1[0] - e0[0]) + 6, Math.abs(e1[1] - e0[1]) + 6);
        ctx.strokeStyle = P.hcInk;
        ctx.strokeRect(Math.min(e0[0], e1[0]), Math.min(e0[1], e1[1]), Math.abs(e1[0] - e0[0]) + 6, Math.abs(e1[1] - e0[1]) + 6);
      }
      m.wires.forEach(([p0, p1]) => seg(p0, p1, 0.9, P.hcInk, 0.55));
      m.struts.forEach(([p0, p1]) => seg(p0, p1, 2.2, P.hcInk, 0.95));
      quad([[-m.S, m.UY, m.C], [m.S, m.UY, m.C], [m.S, m.UY, -m.C], [-m.S, m.UY, -m.C]], P.canvasCloth, 0.97, 130, 0.3);
      m.ribs.forEach((x) => seg([x, m.UY, m.C], [x, m.UY, -m.C], 1, P.hcInkSoft, 0.75));
      seg([-m.S, m.UY, m.C * 0.6], [m.S, m.UY, m.C * 0.6], 1.2, P.hcInkSoft, 0.6);
      // canard elevator out front on outriggers
      [[-0.5, 0], [0.5, 0]].forEach(([x]) => { seg([x, 0, 0.9], [x, 0.7, 2.9], 1.6, P.hcInk, 0.9); seg([x, 1.8, 0.9], [x, 1.1, 2.9], 1.6, P.hcInk, 0.9); });
      [0.7, 1.1].forEach((y, i) => quad([[-2.3, y, 3.35], [2.3, y, 3.35], [2.3, y, 2.6], [-2.3, y, 2.6]], P.canvasCloth, 0.97, 140 + i * 3, i ? 0.3 : null));

      // Wilbur running at the right (near) wingtip, on twos; he lets go and watches from 15.0
      {
        const tip = pr([m.S, 0, 0]);
        const run = Tw < 15.0;
        const wx = run ? tip[0] - 10 : tip[0] - 10 - (Tw - 15.0) * 330;
        const wy = RAIL_Y + 70;
        const f = Math.floor(Tw * 12) % 4;
        const legA = run ? [0.6, -0.2, -0.6, 0.2][f] : 0.05;
        const s = 1.15;
        L.inkPath(ctx, [[wx, wy - 120 * s], [wx + 6, wy - 60 * s]], { width: 13, color: '#2b2622', seed: 150 });
        L.inkCircle(ctx, wx - 2, wy - 136 * s, 11 * s, { width: 1.6, color: P.hcInk, fill: '#2b2622', seed: 151 });
        L.inkPath(ctx, [[wx - 14, wy - 150 * s], [wx + 14, wy - 150 * s]], { width: 4, color: P.hcInk, seed: 152 });
        [legA, -legA].forEach((la, i) => L.inkPath(ctx, [[wx + 6, wy - 60 * s], [wx + 6 + Math.sin(la) * 34, wy - 30 * s], [wx + 6 + Math.sin(la * 1.4) * 52, wy]], { width: 6, color: P.hcInk, seed: 153 + i }));
        const arm = run ? -1.0 : -0.4;
        L.inkPath(ctx, [[wx + 2, wy - 112 * s], [wx + Math.cos(arm) * 40, wy - 112 * s + Math.sin(arm) * 40]], { width: 5, color: P.hcInk, seed: 155 });
        L.inkPath(ctx, [[wx - 4, wy - 100 * s], [wx - 30 - f * 3, wy - 70 * s]], { width: 3, color: '#2b2622', seed: 156 });
      }

      // kicked sand at liftoff
      if (T > LIFT - 0.1 && T < LIFT + 0.6) {
        const r = L.rng(L.hash(ID, 'sand'));
        const u = T - (LIFT - 0.1);
        for (let i = 0; i < 90; i++) {
          const vx = -80 - r() * 220, vy = -120 - r() * 160;
          const x = 470 + r() * 160 + vx * u, y = RAIL_Y + vy * u + 300 * u * u;
          ctx.fillStyle = L.rgba(P.sandShade, 0.8 * (1 - u / 0.7));
          ctx.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
        }
      }
      // foreground grass, bent by the wind from the north (right to left)
      for (let i = 0; i < 26; i++) {
        const gx = ((i * 83 - pn * 1.3) % 1300 + 1300) % 1300 - 110;
        const gy = 1420 + (i % 4) * 90;
        for (let b = 0; b < 7; b++) {
          const sway = Math.sin(T * 6 + i + b) * 6;
          const h = 60 + ((i * 7 + b * 13) % 50);
          L.inkPath(ctx, [[gx + b * 5, gy], [gx + b * 5 - 14 + sway * 0.4, gy - h * 0.5], [gx + b * 5 - 34 + sway, gy - h]], { width: 2, color: P.hcInk, alpha: 0.85, seed: 200 + i * 7 + b, taper: [2, 18] });
        }
      }
      // 120 FT bracket under the flight
      if (T > LIFT + 0.2) {
        const x0 = 470 - (pn - pan(LIFT));
        const x1 = Math.min(1040, anchor(T, L)[0]);
        L.bracket(ctx, x0, RAIL_Y + 40, x1, RAIL_Y + 40, { color: P.annYellow, alpha: 0.95, width: 2.2, offset: 0 });
        L.text(ctx, '120 FT · 12 S', (x0 + x1) / 2, RAIL_Y + 92, { size: 24, family: MONO, weight: 500, align: 'center', color: P.hcInk, alpha: 0.9, tracking: '0.16em' });
      }
    },
  });
})();
