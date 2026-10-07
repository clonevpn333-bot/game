// 03 · cards · T 5.5–9.0 · THE WRONG VESNA. Her name flies off the board into a crew card (5.55); a second card, ALSO
// "VESNA", slides in (7.1, "another"); the airline shuffles them (6.14 "confused" / 7.66); ASSIGNED · JU 367 stamps HER
// card (8.2); at 8.6 her card shrinks into the night sky and becomes the jet's light (→ jet).
(function () {
  'use strict';
  function card(ctx, L, D, PB, x, y, rot, s, who, T, slot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const W = 400, H = 560;
    D.engrave(ctx, L.rectPts(-W / 2, -H / 2, W, H, 40), { ink: '#F2E8D0', base: '#D8CCAE', light: () => 0.12, angle: 0.6, spacing: 5, seed: 300 + slot, smooth: false, outW: 4, cross: false, stip: false });
    ctx.fillStyle = '#3A5AA8'; ctx.fillRect(-W / 2 + 8, -H / 2 + 8, W - 16, 70);
    L.text(ctx, 'JAT · CREW', 0, -H / 2 + 44, { size: 30, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#F2E8D0', tracking: '0.2em' });
    // portrait window
    const px = 0, py = -40, pr = 140;
    ctx.save(); ctx.beginPath(); ctx.rect(px - pr, py - pr, pr * 2, pr * 2); ctx.clip();
    ctx.fillStyle = '#1A2138'; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    if (who === 'her') FILM.pb.fem(ctx, px, py + 30, 240, { yaw: 0.35, key: [-0.4, 0.5, 0.75], res: 0.5, spacing: 4, slot });
    else {
      // the other Vesna: unknown — a dark engraved silhouette with a question mark
      D.engrave(ctx, L.ellipsePts(px, py - 10, 70, 88, 30).concat([]), { ink: '#4A5478', base: '#0C1020', light: () => 0.3, angle: 0.9, spacing: 4, seed: 330, outW: 3, cross: false, stip: false });
      D.engrave(ctx, [[px - 140, py + 140], [px - 110, py + 70], [px - 40, py + 60], [px + 40, py + 60], [px + 110, py + 70], [px + 140, py + 140]], { ink: '#4A5478', base: '#0C1020', light: () => 0.3, angle: 0.9, spacing: 4, seed: 331, outW: 3, cross: false, stip: false });
      L.text(ctx, '?', px, py - 10, { size: 120, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#C9D1E6' });
    }
    ctx.restore();
    L.inkPath(ctx, L.rectPts(px - pr, py - pr, pr * 2, pr * 2, 30), { closed: true, width: 3, color: '#1A1206', seed: 340 + slot });
    L.text(ctx, 'VESNA', 0, 170, { size: 72, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.08em' });
    L.text(ctx, 'STEWARDESS', 0, 228, { size: 22, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#4A3A20', tracking: '0.3em' });
    ctx.restore();
  }
  FILM.scene({ id: 'cards', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 101, color: '#0B0E18' });
    PB.grid(ctx, 0.05, 60);
    const fly = L.ease.inCubic(L.clamp((T - 8.6) / 0.4));
    if (fly > 0) { const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, `rgba(20,32,70,${fly})`); g.addColorStop(1, `rgba(6,8,18,${fly})`); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920); }
    // positions: her card enters from the top-left (from the board), the other from the right; two shuffles
    const inA = L.ease.outBack(L.clamp((T - 5.5) / 0.3)), inB = L.ease.outBack(L.clamp((T - 7.05) / 0.3));
    const sh1 = L.ease.inOutCubic(L.clamp((T - 6.14) / 0.35)), sh2 = L.ease.inOutCubic(L.clamp((T - 7.6) / 0.35));
    const swap = (sh1 + sh2) % 2;                                              // 0 → 1 → 0 … (they end where they started)
    const slotX = [290, 790], baseY = 1080;
    let ax, ay;
    if (T < 7.05) { ax = L.lerp(300, 540, 1 - inA * 0 ) ; ax = 540 + (1 - inA) * -700; ay = baseY - (1 - inA) * 500 + Math.sin(sh1 * Math.PI) * -80; }
    else { ax = L.lerp(540, slotX[0], L.clamp((T - 7.05) / 0.3)); ax = L.lerp(ax, slotX[1], sh2 > 0 && sh2 < 1 ? Math.sin(sh2 * Math.PI) * 0.5 + 0 : 0); ay = baseY + Math.sin(sh2 * Math.PI) * -90; }
    const bx = 1080 + 400 - inB * (1480 - slotX[1]) + (sh2 > 0 && sh2 < 1 ? -Math.sin(sh2 * Math.PI) * 240 : 0), by = baseY + Math.sin(sh2 * Math.PI) * 90;
    // her card flies into the sky at the end: shrinks to a point of light
    const herS = 1.2 * (1 - fly * 0.97), herX = L.lerp(ax, 540, fly), herY = L.lerp(ay, 760, fly);
    if (T >= 7.05 && fly < 1) card(ctx, L, D, PB, bx, by, 0.06, 1.15 * (1 - fly), 'other', T, 2);
    if (herS > 0.05) card(ctx, L, D, PB, herX, herY, -0.05 + 0.2 * Math.sin(sh1 * Math.PI) * (1 - fly), herS, 'her', T, 1);
    else PB.burst(ctx, 540, 760, 60, 1, '255,240,200');
    // ASSIGNED stamp on HER card (8.2)
    const st = L.clamp((T - 8.2) / 0.07) * (1 - fly);
    if (st > 0) {
      ctx.save(); ctx.translate(herX, herY + 40 * herS); ctx.rotate(-0.25); const g = herS * (1 + 0.5 * (1 - L.ease.outCubic(L.clamp((T - 8.2) / 0.07)))); ctx.scale(g, g); ctx.globalAlpha = st;
      L.inkPath(ctx, L.rrectPts(-210, -70, 420, 140, 12), { closed: true, width: 9, color: PB.RED, seed: 360 });
      L.text(ctx, 'ASSIGNED', 0, -18, { size: 64, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.06em' });
      L.text(ctx, 'FLIGHT JU 367', 0, 38, { size: 28, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.2em' });
      ctx.restore();
    }
  } });
})();
