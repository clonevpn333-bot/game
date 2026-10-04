// WHY WE WONDER avatar: the curiosity line draws a giant "?" (2D light line) whose dot is a lit 3D globe with an
// engraved surface and a hand-inked orbit ring crossing behind and in front of it. Built to read at 48 px in a circle.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  function globeTex(L, P) {
    return L.cached('pfp-globe-v1', () => {
      const w = 512, h = 256, c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#F08A3A'); gr.addColorStop(0.5, P.hcOrange); gr.addColorStop(1, '#B9481A');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // engraved continents: hatched blobs
      const r = L.rng(L.hash('pfp-land'));
      for (let i = 0; i < 9; i++) {
        const b = FILM.hx.blob(r() * w, 50 + r() * 150, 30 + r() * 50, 18 + r() * 28, 50 + i, 22, 0.35);
        g.beginPath(); L.tracePath(g, b, true); g.fillStyle = '#F6B26B'; g.fill();
        L.hatch(g, b, { angle: -0.7, spacing: 5, width: 1.4, color: '#5A2208', alpha: 0.7, boilAmp: 0, seed: 60 + i });
        g.strokeStyle = '#3A1606'; g.lineWidth = 2; g.stroke();
      }
      // graticule: meridians + parallels, like an engraved globe
      g.strokeStyle = 'rgba(40,14,4,0.55)'; g.lineWidth = 1.6;
      for (let x = 0; x <= w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = h / 8; y < h; y += h / 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(255,236,200,0.7)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
      return c;
    });
  }
  FILM.scene({ id: 'pfp', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, HC = FILM.hc, M = FILM.mk, X = FILM.hx;
    const C = 540;
    // midnight field + blueprint engraving
    const bg = ctx.createRadialGradient(C, 470, 60, C, C, 760);
    bg.addColorStop(0, '#1B2A55'); bg.addColorStop(0.6, P.hcNavy); bg.addColorStop(1, P.hcNavyDeep);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080);
    ctx.strokeStyle = L.rgba(P.grid, 0.22); ctx.lineWidth = 1;
    for (let x = 0; x <= 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1080); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(1080, x); ctx.stroke(); }
    L.guideCircle(ctx, C, C, 470, { alpha: 0.35, width: 2, quadrants: 22 });
    L.guideCircle(ctx, C, C, 430, { alpha: 0.16, width: 1.2, dash: [8, 10] });
    for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU, l = i % 10 === 0 ? 22 : 9; ctx.strokeStyle = L.rgba(P.lineWhite, i % 10 === 0 ? 0.6 : 0.3); ctx.lineWidth = i % 10 === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(C + Math.cos(a) * 470, C + Math.sin(a) * 470); ctx.lineTo(C + Math.cos(a) * (470 - l), C + Math.sin(a) * (470 - l)); ctx.stroke(); }
    // stars
    const r = L.rng(L.hash('pfp-stars'));
    for (let i = 0; i < 60; i++) { const a = r() * TAU, d = 120 + r() * 330; ctx.fillStyle = L.rgba(P.lineWhite, 0.25 + r() * 0.5); ctx.beginPath(); ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 1 + r() * 1.8, 0, TAU); ctx.fill(); }
    [[300, 300], [800, 360], [760, 820]].forEach(([x, y], i) => L.glowDot(ctx, x, y, 4, { color: P.hcYellow, rays: 8, rayLen: 3.5, seed: 5 + i, boil: 0 }));
    // the question mark: thick curiosity line
    const q = HC.question(C, 470, 700);
    const hook = HC.resample(q.hook, 3);
    const stroke = (w, col, blur) => { ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = blur ? L.rgba(P.hcYellow, 0.9) : 'transparent'; ctx.shadowBlur = blur || 0; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hook[0][0], hook[0][1]); for (const p of hook) ctx.lineTo(p[0], p[1]); ctx.stroke(); ctx.restore(); };
    stroke(64, P.hcInk, 0);
    stroke(48, P.hcYellow, 40);
    stroke(14, '#FFF6D8', 0);
    // a hand-drawn ink echo beside the light line (the 2D pen behind the glow)
    L.inkPath(ctx, hook.map(([x, y]) => [x - 34, y + 6]), { width: 3, color: P.hcIvory, alpha: 0.55, seed: 7, boil: false });
    // the dot = a 3D globe, with an inked orbit ring crossing it
    const D = [q.dot[0], q.dot[1] - 18], R = 100;
    const ring = (front) => {
      ctx.save();
      ctx.translate(D[0], D[1]); ctx.rotate(-0.35);
      ctx.beginPath(); ctx.ellipse(0, 0, R * 1.75, R * 0.48, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.strokeStyle = P.hcIvory; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = P.hcInk; ctx.lineWidth = 2; ctx.setLineDash([2, 10]); ctx.stroke();
      ctx.restore();
    };
    ring(false);
    const glow = ctx.createRadialGradient(D[0], D[1], R * 0.9, D[0], D[1], R * 2.1);
    glow.addColorStop(0, L.rgba(P.hcYellow, 0.4)); glow.addColorStop(1, L.rgba(P.hcYellow, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1080);
    M.sphere(ctx, globeTex(L, P), 'pfp-globe', D[0], D[1], R, 0.9, { spec: 1.1, ambient: 0.32, tilt: 0.42 });
    ctx.strokeStyle = P.hcInk; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(D[0], D[1], R, 0, TAU); ctx.stroke();
    ring(true);
    L.glowDot(ctx, D[0] + R * 1.62, D[1] - R * 0.62, 7, { color: P.hcYellow, core: '#FFFBEA', rays: 10, rayLen: 4, seed: 9 });
  } });
})();
