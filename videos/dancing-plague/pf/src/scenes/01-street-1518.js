// 01 · street-1518 · T 0–5.0 · HOOK: a woodcut street already in a dancing frenzy from frame 0; the crowd keeps
// stamping in while the narration's key words are printed like woodblock type:
// "1518" (1.33) → "A WHOLE CITY" (2.86) → "CAUGHT A PLAGUE" (3.57/3.97) → "OF DANCING" in red (4.38). Captions off here.
(function () {
  'use strict';
  const KINDS = ['woman', 'man', 'woman', 'man', 'piper', 'woman', 'man', 'drummer'];
  // dancers: [x, baseY, scale, appear time]
  function crowd(L) {
    const r = L.rng(L.hash('hook', 'crowd'));
    const out = [];
    for (let i = 0; i < 34; i++) {
      const row = r();
      const y = L.lerp(1180, 1760, row);
      const s = L.lerp(0.22, 0.62, row);
      const x = 60 + r() * 960;
      const at = i < 7 ? -1 : 0.25 + ((i - 7) / 27) * 4.1 + r() * 0.08;
      out.push([x, y, s, at, KINDS[i % KINDS.length], r() * 6, r() > 0.5]);
    }
    return out.sort((a, b) => a[1] - b[1]);
  }
  let CROWD = null;
  const HITS = [1.33, 2.86, 3.97, 4.38];
  FILM.scene({ id: 'street-1518', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    CROWD = CROWD || crowd(L);
    // camera: slow push + a punch on every stamped word
    let punch = 0;
    for (const h of HITS) { const d = T - h; if (d >= 0 && d < 0.35) punch = Math.max(punch, (1 - d / 0.35) * 0.05); }
    const z = 1.04 + 0.06 * L.ease.inOutSine(t / info.dur) + punch;
    const sh = punch * 160 * Math.sin(T * 90);
    ctx.save(); ctx.translate(540 + sh, 1150); ctx.scale(z, z); ctx.translate(-540, -1150);
    W.street(ctx, T);
    const tw = L.onTwos(t);
    for (const [x, y, s, at, kind, ph0, flip] of CROWD) {
      const k = at < 0 ? 1 : L.ease.outBack(L.clamp((T - at) / 0.16));
      if (k <= 0) continue;
      const frenzy = T > 4.38 ? 12 : 9;
      W.dancer(ctx, x, y, s * k, ph0 + tw * frenzy, { kind, flip });
    }
    ctx.restore();
    // a darkening at the top so the type reads
    const gr = ctx.createLinearGradient(0, 0, 0, 1150);
    gr.addColorStop(0, L.rgba(P.wcInk, 0.55)); gr.addColorStop(1, L.rgba(P.wcInk, 0));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1080, 1150);
    // woodblock type, stamped: overshoot scale + ink plate
    const stamp = (str, y, size, at, o = {}) => {
      const d = T - at;
      if (d < 0) return;
      const k = 1 + 0.5 * Math.pow(1 - L.clamp(d / 0.12), 2);
      const a = L.clamp(d / 0.05);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(540, y); ctx.scale(k, k); ctx.rotate(o.rot || 0);
      ctx.font = `800 ${size}px Fraunces, Georgia, serif`;
      const w = Math.max(o.w || 0, ctx.measureText(str).width * 1.06 + 80), h = size * (o.h || 1.18);
      ctx.fillStyle = o.plate || P.parch; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = P.wcInk; ctx.lineWidth = 6; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 11, -h / 2 + 11, w - 22, h - 22);
      L.text(ctx, str, 0, 4, { size, family: '"Fraunces", Georgia, serif', weight: 800, align: 'center', baseline: 'middle', color: o.color || P.wcInk, tracking: '0.04em' });
      ctx.restore();
    };
    // frame 0: the hook question is already on screen
    if (T < 1.25) {
      stamp('THIS REALLY', 300, 96, -1, { color: P.parch, plate: P.wcInk, rot: -0.02 });
      stamp('HAPPENED.', 430, 96, -1, { color: P.parch, plate: P.wcRed, rot: 0.02 });
    }
    stamp('1518', 330, 210, 1.33, { w: 560, rot: -0.03 });
    stamp('A WHOLE CITY', 590, 92, 2.86, { rot: 0.02 });
    stamp('CAUGHT A PLAGUE', 735, 80, 3.57, { rot: -0.015 });
    stamp('OF DANCING', 905, 118, 4.38, { color: P.parch, plate: P.wcRed, rot: 0.025 });
    W.frame(ctx);
  } });
})();
