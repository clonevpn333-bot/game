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
  function legs(ctx, L, P, sketch) {
    // the victim from behind: coat hem, both trouser legs, shoes, wet pavement
    const ink = P.hcInk;
    const coat = [[330, -40], [860, -40], [900, 640], [300, 640]];
    const legL = [[380, 620], [560, 620], [545, 1640], [405, 1640]];
    const legR = [[560, 620], [745, 620], [720, 1640], [585, 1640]];
    const fill = (pts, col) => { L.tracePath(ctx, pts, true); ctx.fillStyle = col; ctx.fill(); };
    if (!sketch) {
      fill(legL, '#121319'); fill(legR, '#16171E'); fill(coat, P.coat);
      ctx.fillStyle = '#06070A';
      ctx.fillRect(390, 1610, 170, 70); ctx.fillRect(578, 1610, 160, 70);
      // rim light on the right leg from a lamp
      ctx.strokeStyle = L.rgba(P.lampPale, 0.6); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(745, 620); ctx.lineTo(720, 1640); ctx.stroke();
      L.hatch(ctx, coat, { angle: 1.35, spacing: 10, width: 1.6, color: '#05060A', alpha: 0.6, seed: 300 });
    } else {
      fill(legL, L.rgba(P.hcIvoryShade, 0.6)); fill(legR, L.rgba(P.hcIvoryShade, 0.6)); fill(coat, L.rgba(P.hcIvoryShade, 0.8));
      L.hatch(ctx, legL, { angle: 1.4, spacing: 8, width: 1.3, color: ink, alpha: 0.6, seed: 301 });
      L.hatch(ctx, coat, { angle: 1.35, spacing: 9, width: 1.3, color: ink, alpha: 0.5, seed: 302 });
      [coat, legL, legR].forEach((p, i) => L.inkPath(ctx, p, { closed: true, width: 4, color: ink, seed: 310 + i }));
      L.inkPath(ctx, [[390, 1640], [560, 1640], [560, 1680], [390, 1680]], { closed: true, width: 3, color: ink, seed: 320 });
      L.inkPath(ctx, [[578, 1640], [738, 1640], [738, 1680], [578, 1680]], { closed: true, width: 3, color: ink, seed: 321 });
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
        FILM.mk.man(ctx, sp[0], sp[1], 0.32, T, { ink: P.hcInk, rim: 0 });
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
