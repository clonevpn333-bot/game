// 05 · pinhead-dive · T 15.25–18.25 · HERO hybrid: 3D perspective tunnel + 2D labels + ruler + PiP
// The red callout from shot 03 becomes a macro of the skin; the camera dives down the wound track through
// perspective tissue layers (epidermis → dermis → fat → muscle), each labelled in 2D as it passes, while a
// millimetre ruler scrolls on the left. It surfaces in a dark chamber where the 3D pellet turns; on "pinhead"
// (17.59) a PiP compares it with the head of a pin.
(function () {
  'use strict';
  const ID = 'pinhead-dive';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const C = [540, 860];
  const LAYERS = [
    { name: 'SKIN', col: '#E9B9A6', deep: '#B97C6A', kind: 'skin' },
    { name: 'DERMIS', col: '#E09A8E', deep: '#A85B52', kind: 'fibre' },
    { name: 'FAT', col: '#F0D7A0', deep: '#C9A55C', kind: 'cells' },
    { name: 'MUSCLE', col: '#B5524C', deep: '#6E2626', kind: 'muscle' },
    { name: '', col: '#2A0D10', deep: '#14060A', kind: 'chamber' },
  ];
  // depth D: 0 at the skin, 4 = inside the muscle chamber
  function depth(T, L) {
    if (T < 15.5) return 0.15 * L.ease.inQuad(L.clamp((T - 15.25) / 0.25));
    if (T < 16.95) return 0.15 + 3.75 * L.ease.inOutSine(L.clamp((T - 15.5) / 1.45));
    return 3.9 + 0.35 * L.ease.outCubic(L.clamp((T - 16.95) / 0.6));
  }
  function layerTexture(ctx, L, P, lay, R, seed, T) {
    // drawn in screen space around C, scaled by the layer's perspective radius R (the hole radius)
    const r = L.rng(L.hash(ID, seed));
    const s = R / 170;
    if (lay.kind === 'skin') {
      for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2, d = (1.6 + r() * 14) * 60 * s;
        const x = C[0] + Math.cos(a) * d, y = C[1] + Math.sin(a) * d;
        ctx.fillStyle = L.rgba(lay.deep, 0.5);
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, 4 * s), 0, Math.PI * 2); ctx.fill();
        if (i % 3 === 0) {
          ctx.strokeStyle = L.rgba('#3A2018', 0.8);
          ctx.lineWidth = Math.max(1, 2.2 * s);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30 * s, y - 40 * s, x + 50 * s, y - 110 * s); ctx.stroke();
        }
      }
      for (let k = 0; k < 14; k++) {
        const a0 = r() * Math.PI * 2;
        ctx.strokeStyle = L.rgba(lay.deep, 0.35);
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath(); ctx.arc(C[0], C[1], (2 + k * 1.2) * 60 * s, a0, a0 + 1.2); ctx.stroke();
      }
    } else if (lay.kind === 'fibre') {
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2, d0 = (1.3 + r() * 3) * 60 * s, d1 = d0 + (2 + r() * 8) * 60 * s;
        ctx.strokeStyle = L.rgba(lay.deep, 0.5);
        ctx.lineWidth = Math.max(1, 3 * s);
        ctx.beginPath(); ctx.moveTo(C[0] + Math.cos(a) * d0, C[1] + Math.sin(a) * d0); ctx.quadraticCurveTo(C[0] + Math.cos(a + 0.3) * (d0 + d1) / 2, C[1] + Math.sin(a + 0.3) * (d0 + d1) / 2, C[0] + Math.cos(a + 0.1) * d1, C[1] + Math.sin(a + 0.1) * d1); ctx.stroke();
      }
    } else if (lay.kind === 'cells') {
      for (let i = 0; i < 80; i++) {
        const a = r() * Math.PI * 2, d = (1.6 + Math.pow(r(), 0.7) * 12) * 60 * s, cr = (0.6 + r() * 0.6) * 60 * s;
        const x = C[0] + Math.cos(a) * d, y = C[1] + Math.sin(a) * d;
        ctx.fillStyle = L.rgba('#FFF0C8', 0.55);
        ctx.beginPath(); ctx.arc(x, y, cr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = L.rgba(lay.deep, 0.8);
        ctx.lineWidth = Math.max(1, 2.4 * s);
        ctx.stroke();
      }
    } else if (lay.kind === 'muscle') {
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2;
        ctx.strokeStyle = L.rgba(i % 2 ? lay.deep : '#D97A6E', 0.6);
        ctx.lineWidth = Math.max(1, 8 * s);
        ctx.beginPath(); ctx.moveTo(C[0] + Math.cos(a) * 70 * s, C[1] + Math.sin(a) * 70 * s); ctx.lineTo(C[0] + Math.cos(a + 0.05) * 1400 * s, C[1] + Math.sin(a + 0.05) * 1400 * s); ctx.stroke();
      }
      // striations
      for (let k = 1; k < 30; k++) {
        ctx.strokeStyle = L.rgba('#3A0E0E', 0.35);
        ctx.lineWidth = Math.max(1, 1.5 * s);
        ctx.beginPath(); ctx.arc(C[0], C[1], (1.2 + k * 0.9) * 60 * s, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const D = depth(T, L);
      const sway = Math.sin(T * 2.3) * 8;
      ctx.fillStyle = '#14060A';
      ctx.fillRect(0, 0, 1080, 1920);
      // tunnel: far layers first; each layer is the full frame with a wound-channel hole of radius 60 / r
      ctx.save();
      ctx.translate(sway, 0);
      for (let i = LAYERS.length - 1; i >= 0; i--) {
        const r = i - D + 1;
        if (r <= 0.04) continue;
        const R = 170 / r;
        const lay = LAYERS[i];
        if (lay.kind === 'chamber') {
          const g = ctx.createRadialGradient(C[0], C[1], 0, C[0], C[1], Math.max(200, R * 6));
          g.addColorStop(0, '#5A1A1E');
          g.addColorStop(1, '#14060A');
          ctx.fillStyle = g;
          ctx.fillRect(-40, 0, 1160, 1920);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(-40, 0, 1160, 1920);
        ctx.arc(C[0], C[1], R, 0, Math.PI * 2, true);
        ctx.fillStyle = lay.col;
        ctx.fill('evenodd');
        ctx.clip('evenodd');
        layerTexture(ctx, L, P, lay, R, i, T);
        // shade toward the hole: the channel wall darkens
        const g = ctx.createRadialGradient(C[0], C[1], R, C[0], C[1], R * 3.2);
        g.addColorStop(0, L.rgba('#14060A', 0.75));
        g.addColorStop(1, L.rgba('#14060A', 0));
        ctx.fillStyle = g;
        ctx.fillRect(-40, 0, 1160, 1920);
        // depth fog on far layers
        ctx.fillStyle = L.rgba('#14060A', L.clamp((r - 1) * 0.45));
        ctx.fillRect(-40, 0, 1160, 1920);
        ctx.restore();
        // ink rim on the hole
        ctx.strokeStyle = L.rgba('#1A0608', 0.9);
        ctx.lineWidth = Math.max(1.5, 5 / r);
        ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, Math.PI * 2); ctx.stroke();
        // 2D label as the layer approaches
        const la = L.clamp(1 - Math.abs(r - 0.75) / 0.45);
        if (lay.name && la > 0) {
          const a = -0.6 - i * 0.25;
          const x = C[0] + Math.cos(a) * R, y = C[1] + Math.sin(a) * R;
          ctx.strokeStyle = L.rgba(P.hcIvory, la);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 90, y - 60); ctx.lineTo(x + 200, y - 60); ctx.stroke();
          M.label(ctx, lay.name, x + 96, y - 72, { size: 28, alpha: la });
        }
      }
      ctx.restore();
      // the wound track: a thin bright line down the centre, which reads as a scale
      if (D > 0.1 && D < 3.95) {
        ctx.strokeStyle = L.rgba(P.hcYellow, 0.55);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(C[0] + sway, C[1] - 40); ctx.lineTo(C[0] + sway, C[1] + 40); ctx.stroke();
      }
      // the millimetre ruler on the left (2D), scrolling with depth
      {
        const x = 96;
        ctx.strokeStyle = L.rgba(P.hcIvory, 0.85);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1500); ctx.stroke();
        for (let k = -20; k < 60; k++) {
          const y = 300 + ((k * 40 - D * 260) % 2400);
          if (y < 300 || y > 1500) continue;
          const big = k % 10 === 0;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (big ? 36 : k % 5 === 0 ? 24 : 12), y); ctx.stroke();
        }
        L.text(ctx, 'MM', x + 10, 280, { size: 20, family: MONO, weight: 600, color: P.hcIvory, tracking: '0.2em' });
      }
      // the pellet appears in the chamber
      const pa = L.ease.outCubic(L.clamp((T - 16.85) / 0.7));
      if (pa > 0) {
        const R = 30 + 150 * pa;
        const glow = ctx.createRadialGradient(C[0], C[1], R * 0.8, C[0], C[1], R * 2.4);
        glow.addColorStop(0, L.rgba(P.hcYellow, 0.25 * pa));
        glow.addColorStop(1, L.rgba(P.hcYellow, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 1080, 1920);
        M.sphere(ctx, M.pelletTex(), 'pellet', C[0], C[1], R, T * 1.1, { spec: 0.9, ambient: 0.3, tilt: 0.25 });
        ctx.strokeStyle = L.rgba('#0A0A0E', 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, Math.PI * 2); ctx.stroke();
        M.callout(ctx, C[0], C[1], R + 34, L.clamp((T - 17.3) / 0.35), { color: P.hcYellow, width: 4, seed: 51 });
      }
      // PiP: the pin head comparison, on "pinhead"
      const pp = L.clamp((T - 17.5) / 0.3);
      M.pip(ctx, { kind: 'rect', x: 600, y: 1090, w: 400, h: 300, p: pp, label: 'TO SCALE', plate: 'paper' }, (g) => {
        g.fillStyle = P.hcIvory;
        g.fillRect(600, 1090, 400, 300);
        L.paper(g, { x: 600, y: 1090, w: 400, h: 300, color: P.hcIvory, seed: 52, vignette: 0.25 });
        // a dressmaker's pin: shaft + round head (≈2 mm) vs the pellet (1.70 mm), same scale: 50 px per mm
        L.inkPath(g, [[700, 1240], [990, 1252]], { width: 6, color: '#8C9098', seed: 53 });
        L.inkCircle(g, 700, 1240, 50, { width: 3, color: P.hcInk, seed: 54, fill: '#C8CCD3' });
        L.inkCircle(g, 700, 1340, 42.5, { width: 3, color: P.hcInk, seed: 55, fill: '#E6E8EC' });
        L.text(g, 'PIN HEAD ~2 MM', 770, 1200, { size: 18, family: MONO, weight: 600, color: P.hcInk, tracking: '0.08em' });
        L.text(g, 'PELLET 1.70 MM', 770, 1348, { size: 18, family: MONO, weight: 700, color: P.hcRed, tracking: '0.08em' });
      });
    },
  });
})();
