// 02 · bridge-1978 · T 3.00–8.00 · hybrid 3D + 2D + PiP
// Layers: the 3D bridge (camera trucks right), the man waiting at a London bus stop → 2D: a hand-stamped date,
// a PiP map window (Thames, the bridges, Waterloo pinned) whose leader line lands on the man → a bracket label
// naming him as "exiled writer" is spoken → 3D rain.
(function () {
  'use strict';
  const ID = 'bridge-1978';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  function map(ctx, L, P, x, y, w, h, T) {
    ctx.fillStyle = P.hcIvory;
    ctx.fillRect(x, y, w, h);
    L.paper(ctx, { x, y, w, h, color: P.hcIvory, seed: 22, vignette: 0.3 });
    // the Thames: a curving band with engraved water hatching
    const top = [], bot = [];
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const cx = x + u * w, cy = y + h * (0.45 + 0.18 * Math.sin(u * 3.2 + 0.6));
      top.push([cx, cy - 26]);
      bot.push([cx, cy + 26]);
    }
    const river = top.concat(bot.slice().reverse());
    L.tracePath(ctx, river, true);
    ctx.fillStyle = L.mix(P.earthSea, P.hcIvory, 0.55);
    ctx.fill();
    L.hatch(ctx, river, { angle: 0, spacing: 5, width: 1, color: P.hcInkSoft, alpha: 0.6, seed: 23 });
    L.inkPath(ctx, top, { width: 2, color: P.hcInk, seed: 24 });
    L.inkPath(ctx, bot, { width: 2, color: P.hcInk, seed: 25 });
    // streets
    const r = L.rng(L.hash(ID, 'streets'));
    for (let i = 0; i < 16; i++) {
      const sx = x + r() * w, sy = y + r() * h, a = r() * Math.PI;
      L.inkPath(ctx, [[sx - Math.cos(a) * 120, sy - Math.sin(a) * 120], [sx + Math.cos(a) * 120, sy + Math.sin(a) * 120]], { width: 1.2, color: P.hcInkSoft, alpha: 0.6, seed: 30 + i });
    }
    // bridges; Waterloo highlighted
    [0.2, 0.42, 0.62, 0.82].forEach((u, i) => {
      const bx = x + u * w, by = y + h * (0.45 + 0.18 * Math.sin(u * 3.2 + 0.6));
      L.inkPath(ctx, [[bx - 6, by - 40], [bx + 6, by + 40]], { width: i === 2 ? 6 : 3, color: i === 2 ? P.hcRed : P.hcInk, seed: 40 + i });
    });
    const wb = [x + 0.62 * w, y + h * (0.45 + 0.18 * Math.sin(0.62 * 3.2 + 0.6))];
    const pulse = 1 + 0.15 * Math.sin(T * 8);
    L.inkCircle(ctx, wb[0], wb[1], 30 * pulse, { width: 3, color: P.hcRed, seed: 50 });
    L.text(ctx, 'WATERLOO BRIDGE', wb[0] - 150, wb[1] - 60, { size: 20, family: MONO, weight: 600, color: P.hcInk, tracking: '0.12em' });
    L.text(ctx, 'THAMES', x + 40, y + h * 0.7, { size: 18, family: MONO, weight: 600, color: P.hcInkSoft, tracking: '0.3em' });
    return wb;
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const c = M.cam({ x: -60 + (T - 3) * 30, y: 160, z: -200 + (T - 3) * 25, f: 1100, hz: 880 });
      M.street(ctx, T, c);
      // bus stop: post + the red roundel, beside the man
      const bp = M.P3(c, -380, 0, 460), bt = M.P3(c, -380, 330, 460);
      ctx.strokeStyle = '#0A0D14';
      ctx.lineWidth = 10 * bp[2];
      ctx.beginPath(); ctx.moveTo(bp[0], bp[1]); ctx.lineTo(bt[0], bt[1]); ctx.stroke();
      ctx.fillStyle = P.busRed;
      ctx.beginPath(); ctx.arc(bt[0], bt[1] - 10, 46 * bp[2], 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2EEE4';
      ctx.fillRect(bt[0] - 56 * bp[2], bt[1] - 22 * bp[2], 112 * bp[2], 24 * bp[2]);
      // the man waits (not walking), umbrella-less, shoulders hunched
      const mp = M.P3(c, -200, 0, 380);
      const ms = (180 * mp[2]) / 685;
      M.man(ctx, mp[0], mp[1], ms, T, { walk: false, rim: 1 });
      M.rain(ctx, T, c, { n: 900 });

      // 2D: the date, stamped
      const ds = L.clamp((T - 3.6) / 0.15);
      if (ds > 0) {
        ctx.save();
        ctx.translate(90, 330);
        ctx.rotate(-0.06);
        ctx.globalAlpha = ds;
        ctx.strokeStyle = P.hcRed;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, 400, 130);
        ctx.strokeRect(8, 8, 384, 114);
        L.text(ctx, '7 · IX · 1978', 200, 68, { size: 52, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: P.hcRed });
        L.text(ctx, 'LONDON', 200, 112, { size: 18, family: MONO, weight: 600, align: 'center', color: P.hcRed, tracking: '0.5em' });
        ctx.restore();
      }
      // PiP map window: opens 3.3, holds, closes 6.9
      const po = L.clamp((T - 3.3) / 0.35) * (1 - L.clamp((T - 6.9) / 0.3));
      const head = [mp[0], mp[1] - 600 * ms];
      let pin = null;
      M.pip(ctx, { kind: 'rect', x: 560, y: 260, w: 440, h: 440, p: po, label: 'MAP · WATERLOO', target: po > 0.2 ? head : null, plate: 'navy' }, (g) => { pin = map(g, L, P, 560, 260, 440, 440, T); });
      // who he is
      const wa = L.ease.outExpo(L.clamp((T - 4.3) / 0.4));
      if (wa > 0) {
        const x0 = mp[0] + 150 * ms + 30;
        L.bracket(ctx, x0, mp[1] - 690 * ms, x0, mp[1], { color: P.hcYellow, alpha: 0.9, width: 2.5, p: wa });
        M.label(ctx, 'GEORGI MARKOV', x0 + 30, mp[1] - 420 * ms, { size: 28, alpha: wa, p: wa });
        M.label(ctx, 'EXILED WRITER · BBC', x0 + 30, mp[1] - 370 * ms, { size: 20, alpha: wa, underline: false, color: '#B9C4DC' });
      }
    },
  });
})();
