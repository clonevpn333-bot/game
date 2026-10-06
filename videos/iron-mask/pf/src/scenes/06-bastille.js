// 06 · bastille · T 18.75–23.45 · the Bastille in 3D at night, the camera orbiting; THE BASTILLE · PARIS (20.4), 1703
// (21.7). "fake name" (22.5): PiP — the burial record, written MARCHIOLY, stamped A FAKE NAME.
(function () {
  'use strict';
  FILM.scene({ id: 'bastille', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.OFF2;
    D.plate(ctx, { color: '#0A0E1E' });
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1500 }, angle: 0.0, spacing: 6.5, width: 1, color: '#7A86B0', alpha: 0.6, seed: 51, length: [60, 240], density: (x, y) => L.clamp(0.45 - y / 2600 + 0.4 * Math.max(0, 1 - Math.hypot(x - 820, y - 330) / 600)) });
    D.moon(ctx, 820, 330, 90, T, { ink: '#E8ECF8', glow: '#9AA8E0' });
    L.stipple(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 900 }, spacing: 38, r: [0.8, 2], color: '#E8ECF8', alpha: 0.8, seed: 52 });
    D.bastille(ctx, 540, 1480, 118, { yaw: 0.35 + 0.16 * t, pitch: -0.16 });
    D.mist(ctx, T, { y: 1500, h: 360, a: 0.35, speed: 25, color: '#C8CCE0' });
    D.grain(ctx, T, 1);
    const MONO = '"JetBrains Mono", monospace';
    L.text(ctx, 'THE BASTILLE · PARIS', 540, 260, { size: 36, family: MONO, weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((T - 20.3) / 0.2), tracking: '0.24em' });
    D.word(ctx, '1703', 540, 400, 150, (T - 21.72) / 0.15, { color: C.yellow, seed: 16 });
    const pp = L.clamp((T - 22.4) / 0.3);
    M.pip(ctx, { kind: 'rect', x: 140, y: 880, w: 800, h: 330, p: pp, label: 'BURIAL RECORD · 1703', plate: 'paper' }, (g) => {
      g.translate(0, -200);
      L.paper(g, { x: 140, y: 1080, w: 800, h: 330, color: '#DCCBA4', seed: 53, vignette: 0.5 });
      for (let i = 0; i < 3; i++) { const pts = []; for (let x = 180; x <= 900; x += 6) pts.push([x, 1130 + i * 34 + Math.sin(x * 0.2 + i) * 5]); L.inkPath(g, pts, { width: 1.6, color: '#5A4A2A', alpha: 0.6, seed: 1100 + i }); }
      const u = L.clamp((T - 22.6) / 0.5);
      g.save(); g.beginPath(); g.rect(180, 1220, 620 * u, 120); g.clip();
      L.text(g, 'Marchioly', 200, 1300, { size: 84, family: '"Fraunces", serif', weight: 600, color: '#1A0E06' });
      g.restore();
      if (T > 23.0) { g.save(); g.translate(760, 1290); g.rotate(-0.12); L.inkPath(g, [[-120, -40], [120, -40], [120, 40], [-120, 40]], { closed: true, width: 4, color: '#C8221A', seed: 1110, smooth: false }); L.text(g, 'FAKE NAME', 0, 12, { size: 32, family: MONO, weight: 700, align: 'center', color: '#C8221A', tracking: '0.1em' }); g.restore(); }
    });
  } });
})();
