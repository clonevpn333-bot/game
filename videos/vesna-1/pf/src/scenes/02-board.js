// 02 · board · T 3.0–5.5 · SECOND HOOK on the 3.0 hit. A split-flap departures board clacks into place on the beats:
// JAT 367 · BEOGRAD, then CREW: VESNA flaps in (3.04); on SUPPOSED (3.92) a red box slams round her name.
(function () {
  'use strict';
  const ROWS = [['JU 367', 'BEOGRAD', '15:00'], ['SK 412', 'OSLO', '15:20'], ['LH 031', 'FRANKFURT', '15:35'], ['BA 774', 'LONDON', '15:50']];
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:· ';
  function flap(ctx, L, PB, str, x, y, cw, chh, T, t0, seed, col) {
    for (let i = 0; i < str.length; i++) {
      const tc = t0 + i * 0.03, done = T >= tc + 0.18;
      const k = done ? -1 : Math.floor((T - tc) * 40 + seed + i * 7);
      const ch = done ? str[i] : (T < tc ? ' ' : CH[((k % CH.length) + CH.length) % CH.length]);
      const cx = x + i * (cw + 4);
      ctx.fillStyle = '#10131C'; ctx.fillRect(cx, y - chh / 2, cw, chh);
      ctx.fillStyle = '#05070C'; ctx.fillRect(cx, y - 1.5, cw, 3);
      L.text(ctx, ch, cx + cw / 2, y + 2, { size: chh * 0.72, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: col || '#F2E8D0' });
    }
  }
  FILM.scene({ id: 'board', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 91, color: '#0B0E18' });
    const push = 1 + 0.06 * L.ease.outCubic(L.clamp((T - 3.0) / 2.5));
    ctx.save(); ctx.translate(540, 1000); ctx.scale(push, push); ctx.translate(-540, -1000);
    // the board housing (engraved steel)
    const lit = D.lights([{ x: 540, y: 700, r: 1100, k: 0.45 }], 0.08);
    D.engrave(ctx, L.rrectPts(50, 560, 980, 900, 20), { ink: '#8A9AB8', base: '#161B28', light: lit, angle: 0.3, spacing: 5, seed: 700, smooth: false, outW: 5 });
    L.text(ctx, 'ODLASCI · DEPARTURES', 540, 625, { size: 30, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#C9D1E6', tracking: '0.25em' });
    ROWS.forEach((r, i) => { const y = 720 + i * 92; flap(ctx, L, PB, r[0].padEnd(7), 90, y, 40, 66, T, 3.0 + i * 0.06, i, i === 0 ? PB.Y : '#F2E8D0'); flap(ctx, L, PB, r[1].padEnd(9), 420, y, 40, 66, T, 3.05 + i * 0.06, i + 3); flap(ctx, L, PB, r[2], 840, y, 26, 66, T, 3.1 + i * 0.06, i + 5); });
    // crew line for JU 367
    L.text(ctx, 'JU 367 · CREW', 90, 1135, { size: 28, family: PB.MONO, weight: 600, align: 'left', baseline: 'middle', color: '#7FB89A', tracking: '0.2em' });
    flap(ctx, L, PB, 'VESNA V.', 90, 1225, 54, 86, T, 3.04, 9, PB.Y);
    flap(ctx, L, PB, 'STEWARDESS', 90, 1330, 40, 66, T, 3.2, 11);
    ctx.restore();
    // the red box slams round her name on SUPPOSED, with a question mark stamped beside it
    const bx = L.clamp((T - 3.92) / 0.08);
    if (bx > 0) {
      const sc = push, X = (x) => 540 + (x - 540) * sc, Y = (y) => 1000 + (y - 1000) * sc;
      const g = 1 + 0.4 * (1 - L.ease.outCubic(bx));
      ctx.save(); ctx.translate(X(330), Y(1225)); ctx.scale(g, g);
      L.inkPath(ctx, L.rrectPts(-270, -70, 540, 140, 10), { closed: true, width: 10, color: PB.RED, seed: 720 });
      ctx.restore();
      const q = L.clamp((T - 4.4) / 0.08);
      if (q > 0) { ctx.save(); ctx.translate(X(800), Y(1240)); ctx.rotate(0.15); const s2 = 1 + 0.6 * (1 - L.ease.outCubic(q)); ctx.scale(s2, s2); L.text(ctx, '?', 0, 0, { size: 230, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED }); ctx.restore(); }
    }
  } });
})();
