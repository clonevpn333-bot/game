// 03 · the-sting · T 8.00–12.00 · 3D → freeze → 2D sketch + PiP
// Layers: low close shot of the man's legs from behind, a stranger's furled umbrella entering from the left;
// 8.71 "sting": the ferrule touches the back of the right thigh (flash + ring) → 8.8 the world FREEZES (rain hangs)
// and bleaches into an ivory ink sketch by 9.25 → PiP circle magnifies the puncture with a forensic crosshair →
// 9.7–11.6 the stranger's escape is drawn as a dashed 2D path to a taxi → "gone" 11.59: the stranger is scribbled out.
(function () {
  'use strict';
  const ID = 'the-sting';
  const STING = 8.71, FREEZE = 8.8, SKETCH = 9.25;
  const HIT = [610, 1010];
  // the victim from behind, close: overcoat hem with folds, tapered trousers with knee creases, shoes
  function legPaths(L) {
    const leg = (x0, x1, kx, ax0, ax1) => L.smoothPts([[x0, 600], [kx - 6, 980], [ax0, 1600], [ax1, 1600], [kx + (x1 - x0) * 0.55, 980], [x1, 600]], true, 6);
    const coat = L.smoothPts([[300, -40], [880, -40], [905, 300], [930, 640], [800, 668], [640, 652], [520, 672], [380, 650], [262, 640], [282, 300]], true, 6);
    return { coat, legL: leg(372, 560, 392, 418, 548), legR: leg(566, 762, 590, 600, 724) };
  }
  function legs(ctx, L, P, sketch) {
    const g = legPaths(L);
    const ink = P.hcInk;
    const fill = (pts, col) => { ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.fillStyle = col; ctx.fill(); };
    const shoes = (col) => {
      [[410, 1590, 160], [596, 1590, 150]].forEach(([x, y, w]) => {
        ctx.beginPath();
        ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 20, y + 70, x + w * 0.4, y + 74); ctx.quadraticCurveTo(x + w + 10, y + 70, x + w - 4, y); ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
      });
    };
    if (!sketch) {
      fill(g.legL, '#0D0E13'); fill(g.legR, '#101118');
      // trouser creases + knee folds, lit faintly by the lamp
      ctx.strokeStyle = L.rgba(P.lampPale, 0.12); ctx.lineWidth = 3;
      [[466, 600, 482, 1600], [664, 600, 662, 1600]].forEach(([a, b2, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b2); ctx.lineTo(c, d); ctx.stroke(); });
      [[420, 1000], [610, 990]].forEach(([x, y]) => { for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x, y + k * 22); ctx.quadraticCurveTo(x + 60, y + k * 22 - 14, x + 120, y + k * 22 + 4); ctx.stroke(); } });
      shoes('#040508');
      fill(g.coat, P.coat);
      L.hatch(ctx, g.coat, { angle: 1.4, spacing: 11, width: 1.6, color: '#05060A', alpha: 0.55, seed: 300 });
      ctx.strokeStyle = L.rgba('#05060A', 0.8); ctx.lineWidth = 4;
      [[420, 200, 400, 650], [600, 100, 590, 660], [760, 220, 790, 660]].forEach(([a, b2, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b2); ctx.quadraticCurveTo((a + c) / 2 + 20, (b2 + d) / 2, c, d); ctx.stroke(); });
      // rim light on the right edges
      ctx.strokeStyle = L.rgba(P.lampPale, 0.55); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(762, 600); ctx.quadraticCurveTo(735, 980, 724, 1600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(880, -40); ctx.lineTo(930, 640); ctx.stroke();
    } else {
      fill(g.legL, L.rgba(P.hcIvoryShade, 0.6)); fill(g.legR, L.rgba(P.hcIvoryShade, 0.6));
      shoes(L.rgba(P.hcInkSoft, 0.5));
      fill(g.coat, L.rgba(P.hcIvoryShade, 0.85));
      L.hatch(ctx, g.legL, { angle: 1.4, spacing: 8, width: 1.3, color: ink, alpha: 0.55, seed: 301 });
      L.hatch(ctx, g.coat, { angle: 1.35, spacing: 9, width: 1.3, color: ink, alpha: 0.45, seed: 302 });
      [g.coat, g.legL, g.legR].forEach((p, i) => L.inkPath(ctx, p, { closed: true, width: 4, color: ink, seed: 310 + i }));
      [[420, 200, 400, 650], [600, 100, 590, 660], [760, 220, 790, 660]].forEach(([a, b2, c, d], i) => L.inkPath(ctx, [[a, b2], [(a + c) / 2 + 20, (b2 + d) / 2], [c, d]], { width: 2, color: ink, seed: 320 + i }));
    }
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const Tf = Math.min(T, FREEZE); // the frozen clock for the 3D world
      const sk = L.ease.inOutCubic(L.clamp((T - FREEZE) / (SKETCH - FREEZE)));
      // 3D world (frozen after 8.8)
      const c = M.cam({ x: 0, y: 80, z: Tf * 20, f: 900, hz: 700 });
      M.street(ctx, Tf, c);
      legs(ctx, L, P, false);
      // the stranger's umbrella: enters from the left, ferrule jabs at HIT on the sting
      const jab = L.ease.outCubic(L.clamp((Tf - 8.2) / (STING - 8.2)));
      const back = T > STING ? L.ease.inCubic(L.clamp((Tf - STING) / 0.25)) * 0.2 : 0;
      const tip = [L.lerp(-160, HIT[0], jab - back), L.lerp(1260, HIT[1], jab - back)];
      M.brolly(ctx, tip[0], tip[1], 1.25, { open: false, rot: -1.2 });
      M.rain(ctx, Tf, c, { n: 900 });

      // freeze → the frame bleaches into an ink sketch on ivory
      if (sk > 0) {
        ctx.save();
        ctx.globalAlpha = sk;
        L.paper(ctx, { color: P.hcIvory, seed: 31, vignette: 0.35 });
        legs(ctx, L, P, true);
        // the umbrella, re-inked
        ctx.save();
        ctx.translate(tip[0], tip[1]);
        ctx.rotate(-1.2);
        L.inkPath(ctx, [[0, 0], [-27, -137], [-20, -587], [20, -587], [27, -137]], { closed: true, width: 3.5, color: P.hcInk, seed: 330, fill: L.rgba(P.hcInkSoft, 0.25) });
        L.inkPath(ctx, [[0, -587], [0, -700], [-30, -730], [-62, -700]], { width: 4, color: P.hcInk, seed: 331 });
        ctx.restore();
        // the frozen rain, as ink ticks
        const r = L.rng(L.hash(ID, 'rain'));
        ctx.strokeStyle = L.rgba(P.hcInkSoft, 0.55);
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 260; i++) {
          const x = r() * 1080, y = r() * 1920, l = 14 + r() * 26;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.18, y + l); ctx.stroke();
        }
        ctx.restore();
      }
      // the impact flash + ring
      if (T >= STING && T < STING + 0.4) {
        const u = (T - STING) / 0.4;
        L.glowDot(ctx, HIT[0], HIT[1], 14 * (1 - u) + 3, { color: P.hcYellow, rays: 10, rayLen: 4, additive: sk < 0.5 });
        ctx.strokeStyle = L.rgba(P.hcRed, 1 - u);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(HIT[0], HIT[1], 20 + 160 * L.ease.outExpo(u), 0, Math.PI * 2); ctx.stroke();
      }
      // forensic callout on the puncture + PiP magnifier
      const ca = L.ease.outCubic(L.clamp((T - 8.95) / 0.35));
      if (ca > 0) {
        M.callout(ctx, HIT[0], HIT[1], 46, ca, { color: P.hcRed, width: 4 });
        const pp = L.clamp((T - 9.2) / 0.35) * (1 - L.clamp((T - 11.7) / 0.3));
        M.pip(ctx, { kind: 'circle', x: 760, y: 480, r: 220, p: pp, label: 'RIGHT THIGH · 1:40', target: HIT, plate: 'paper' }, (g) => {
          g.fillStyle = '#2A2C35';
          g.fillRect(500, 220, 520, 520);
          // magnified wool weave
          for (let y = 260; y < 720; y += 14) for (let x = 540; x < 980; x += 14) {
            g.fillStyle = (x / 14 + y / 14) % 2 ? '#3A3C48' : '#30323D';
            g.fillRect(x, y, 12, 12);
          }
          g.strokeStyle = 'rgba(10,10,14,0.6)';
          g.lineWidth = 2;
          for (let y = 260; y < 720; y += 14) { g.beginPath(); g.moveTo(540, y); g.lineTo(980, y + 6); g.stroke(); }
          // the puncture: torn threads around a tiny hole
          g.fillStyle = '#05060A';
          g.beginPath(); g.arc(760, 480, 14, 0, Math.PI * 2); g.fill();
          for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; L.inkPath(g, [[760 + Math.cos(a) * 14, 480 + Math.sin(a) * 14], [760 + Math.cos(a + 0.2) * 34, 480 + Math.sin(a + 0.2) * 34]], { width: 2, color: '#6A6E80', seed: 340 + k }); }
          // crosshair + scale
          g.strokeStyle = L.rgba(P.hcYellow, 0.9);
          g.lineWidth = 2;
          g.beginPath(); g.moveTo(560, 480); g.lineTo(720, 480); g.moveTo(800, 480); g.lineTo(960, 480); g.moveTo(760, 280); g.lineTo(760, 440); g.moveTo(760, 520); g.lineTo(760, 680); g.stroke();
          g.beginPath(); g.arc(760, 480, 60, 0, Math.PI * 2); g.stroke();
          L.text(g, '< 2 MM', 800, 420, { size: 22, family: '"JetBrains Mono", monospace', weight: 600, color: P.hcYellow, tracking: '0.12em' });
        });
      }
      // the stranger's escape, drawn: footprints dotted to a taxi on the left
      const ea = L.clamp((T - 9.7) / 1.4);
      if (ea > 0 && sk > 0.5) {
        const path = L.smoothPts([[200, 1240], [150, 1100], [210, 900], [160, 760]], false, 6);
        ctx.save();
        ctx.setLineDash([10, 12]);
        L.inkPath(ctx, path, { width: 3, color: P.hcRed, draw: ea, seed: 350 });
        ctx.restore();
        // the taxi: a quick ink sketch of a black cab
        const tx = 70, ty = 600;
        L.inkPath(ctx, [[tx, ty + 80], [tx + 20, ty + 20], [tx + 70, ty], [tx + 190, ty], [tx + 230, ty + 40], [tx + 250, ty + 80], [tx + 250, ty + 120], [tx, ty + 120]], { closed: true, width: 3.5, color: P.hcInk, seed: 360, fill: L.rgba(P.hcInkSoft, 0.35), draw: L.clamp(ea * 2) });
        L.inkCircle(ctx, tx + 55, ty + 122, 22, { width: 3, color: P.hcInk, seed: 361, fill: P.hcInk });
        L.inkCircle(ctx, tx + 200, ty + 122, 22, { width: 3, color: P.hcInk, seed: 362, fill: P.hcInk });
        FILM.mk.label(ctx, 'TAXI', tx + 80, ty - 24, { size: 22, color: P.hcInk, ucolor: P.hcRed, alpha: L.clamp(ea * 2) });
        // the stranger: an ink silhouette walking the path, scribbled out on "gone"
        const sp = FILM.hc.headAt(path, Math.min(0.98, ea));
        const gone = L.clamp((T - 11.55) / 0.3);
        ctx.save();
        ctx.globalAlpha = 1 - gone * 0.85;
        FILM.mk.man(ctx, sp[0], sp[1], 0.32, T, { ink: P.hcInk, rim: 0, reflect: false });
        ctx.restore();
        if (gone > 0) {
          const sc = [];
          for (let k = 0; k < 18 * gone; k++) sc.push([sp[0] - 70 + (k % 2) * 140, sp[1] - 220 + k * 12]);
          if (sc.length > 1) L.inkPath(ctx, sc, { width: 5, color: P.hcRed, seed: 370, smooth: false });
        }
      }
    },
  });
})();
