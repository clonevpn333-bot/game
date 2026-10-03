// 07 · line-to-moon · T 16.00–18.75 · navy, true 3D spheres (per-pixel lit, engraved equirect textures)
// Layers: (1) space plate: navy, engraved stars, orbital guide circles (2) the 1903 sky we are leaving, with
// cloud bands rushing past, dissolving 16.15–16.75 (3) Earth, from a flat horizon to a globe (radius 9200 → 150)
// (4) the Moon, travelling in to land exactly on G6 (540, 700) r 170 at 18.25 (5) the curiosity line as the
// free-return trajectory, with distance ticks (6) distance bracket + label, progress glyph.
(function () {
  'use strict';
  const rgbo = (L, c) => { const a = L.rgb(c); return { r: a[0], g: a[1], b: a[2] }; };
  const ID = 'line-to-moon';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const T0 = 16.0, MOON = 18.25;
  const G6 = [540, 700, 170];

  function earthTex(L, P) {
    return L.cached('hc-earth-tex-v1', () => {
      const w = 1024, h = 512;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      const d = img.data;
      const sea = rgbo(L, P.earthSea), seaD = rgbo(L, '#1d365d'), land = rgbo(L, P.earthLand), landD = rgbo(L, '#9c8452'), ink = rgbo(L, P.hcInk), ice = rgbo(L, '#EEF0EA');
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const lon = (x / w) * Math.PI * 2, lat = (y / h - 0.5) * Math.PI;
        const px = Math.cos(lat) * Math.cos(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.sin(lon);
        const n = L.noise2(px * 1.6 + pz * 0.7 + 3, py * 1.8 + pz * 1.1, 11) * 0.7 + L.noise2(px * 4 + 9, py * 4 + pz * 3, 12) * 0.3;
        const i = (y * w + x) * 4;
        let col;
        if (Math.abs(lat) > 1.25) col = ice;
        else if (n > 0.12) {
          const k = L.noise2(x * 0.05, y * 0.05, 13) > 0.2 ? landD : land;
          col = k;
          if ((x * 7 + y * 13) % 23 === 0) col = landD;
          if (n < 0.135) col = ink;
        } else {
          col = Math.sin(y * 0.9) > 0.55 ? seaD : sea;
          if (n > 0.07 && n < 0.085 && Math.sin(y * 0.9 + 1) > 0) col = seaD;
        }
        d[i] = col.r; d[i + 1] = col.g; d[i + 2] = col.b; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }
  function moonTex(L, P) {
    return L.cached('hc-moon-tex-v1', () => {
      const w = 512, h = 256;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = P.moon;
      g.fillRect(0, 0, w, h);
      const r = L.rng(L.hash('moon'));
      for (let i = 0; i < 9; i++) {
        g.fillStyle = L.rgba(P.moonShade, 0.75);
        L.tracePath(g, FILM.hx.blob(r() * w, 40 + r() * (h - 80), 30 + r() * 50, 20 + r() * 30, 30 + i, 24, 0.35), true);
        g.fill();
      }
      for (let i = 0; i < 90; i++) {
        const x = r() * w, y = r() * h, cr = 2 + Math.pow(r(), 3) * 18;
        g.strokeStyle = L.rgba('#6f6a60', 0.8);
        g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.stroke();
        g.fillStyle = L.rgba('#fbf8ef', 0.6);
        g.beginPath(); g.arc(x - cr * 0.2, y - cr * 0.2, cr * 0.7, 0, Math.PI * 2); g.fill();
      }
      for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(80,74,64,0.10)'; g.fillRect(0, y, w, 1); }
      return c;
    });
  }
  // per-pixel lit sphere into an offscreen buffer, drawn at (cx, cy) radius R
  function sphere(ctx, L, P, tex, cx, cy, R, lon0, o) {
    if (R < 2) return;
    if (cx + R < -50 || cx - R > 1130 || cy + R < -50 || cy - R > 1970) return;
    const N = Math.max(16, Math.min(640, Math.round(2 * R)));
    const buf = L.cached('hc-sphere-buf-' + N, () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; });
    const g = buf.getContext('2d');
    const img = g.createImageData(N, N);
    const d = img.data;
    const tc = L.cached('hc-texdata-' + o.key, () => tex.getContext('2d').getImageData(0, 0, tex.width, tex.height));
    const tw = tex.width, th = tex.height, td = tc.data;
    const lx = -0.62, ly = -0.42, lz = 0.66;
    const navy = rgbo(L, P.hcNavyDeep);
    const tilt = o.tilt || 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const nx = (i + 0.5) / (N / 2) - 1, ny = (j + 0.5) / (N / 2) - 1;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const ty = ny * ct - nz * st, tz = ny * st + nz * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, -ty)));
      const lon = Math.atan2(nx, tz) + lon0;
      const u = ((lon / (Math.PI * 2)) % 1 + 1) % 1, v = 0.5 - lat / Math.PI;
      const ti = ((Math.min(th - 1, Math.floor(v * th)) * tw) + Math.floor(u * tw)) * 4;
      let sh = nx * lx + ny * ly + nz * lz;
      sh = Math.max(0, Math.min(1, sh * 1.15 + 0.08));
      // engraved terminator: hatch lines in screen space on the night side
      const hl = Math.sin((i + j * 0.6) * (6.2 / Math.max(1, N / 120))) > 0.2 ? 1 : 0;
      const dark = sh < 0.35 ? (0.35 - sh) / 0.35 : 0;
      const k = 0.3 + 0.7 * sh - dark * 0.25 * hl;
      const p = (j * N + i) * 4;
      d[p] = td[ti] * k + navy.r * (1 - k) * 0.6;
      d[p + 1] = td[ti + 1] * k + navy.g * (1 - k) * 0.6;
      d[p + 2] = td[ti + 2] * k + navy.b * (1 - k) * 0.6;
      d[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(buf, cx - R, cy - R, 2 * R, 2 * R);
    ctx.restore();
    if (o.atmo) {
      const gr = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.12);
      gr.addColorStop(0, L.rgba(P.hcCyan, 0.55));
      gr.addColorStop(1, L.rgba(P.hcCyan, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = L.rgba(P.lineWhite, 0.85);
    ctx.lineWidth = Math.min(3, 1 + R / 120);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const TAU = Math.PI * 2;
      // space
      L.blueprint(ctx, { color: P.hcNavyDeep, seed: 77, grid: 0, circles: 2, diagonals: 3, center: [540, 900] });
      const r = L.rng(L.hash(ID, 'stars'));
      for (let i = 0; i < 520; i++) {
        const x = r() * 1080, y = r() * 1920, s = r();
        if (s > 0.985) { X.star8(ctx, x, y, 4 + s * 4, { fill: P.lineWhite, alpha: 0.9 }); continue; }
        ctx.fillStyle = L.rgba(P.lineWhite, 0.2 + s * 0.6);
        ctx.fillRect(x, y, 1 + s * 1.5, 1 + s * 1.5);
      }
      // Earth: flat horizon → globe (pull back), then drifting down-left as we travel
      const pb = L.ease.inOutCubic(L.clamp((T - 16.1) / 0.9));
      const tr = L.ease.inOutCubic(L.clamp((T - 17.0) / (MOON - 17.0)));
      const R0 = 230 * Math.pow(40, 1 - pb);
      const RE = L.lerp(R0, 150, tr);
      const top = L.lerp(1640, 1150, pb);
      const ecx = L.lerp(L.lerp(560, 380, pb), 250, tr);
      const ecy = L.lerp(top + R0, 1520, tr);
      // orbit guide around Earth
      if (pb > 0.6) L.guideCircle(ctx, ecx, ecy, RE * 1.9, { alpha: 0.18, width: 1.2, dash: [6, 8] });
      sphere(ctx, L, P, earthTex(L, P), ecx, ecy, RE, 0.9 + T * 0.08, { key: 'earth', atmo: true, tilt: 0.38 });
      // Moon: far up-right → G6
      const mv = L.ease.inOutCubic(L.clamp((T - 16.6) / (MOON - 16.6)));
      const mcx = L.lerp(880, G6[0], mv), mcy = L.lerp(360, G6[1], mv), mr = L.lerp(16, G6[2], Math.pow(mv, 1.6));
      if (T >= MOON) { /* exact G6 lock */ }
      const MC = T >= MOON ? G6 : [mcx, mcy, mr];
      sphere(ctx, L, P, moonTex(L, P), MC[0], MC[1], MC[2], 2.2, { key: 'moon', tilt: 0.1 });

      // the sky we are leaving (shot 06's sky), dissolving as cloud bands rush down past camera
      const sky = 1 - L.ease.inOutQuad(L.clamp((T - 16.15) / 0.6));
      if (sky > 0) {
        ctx.save();
        ctx.globalAlpha = sky;
        ctx.fillStyle = P.hcIvory;
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.fillStyle = L.rgba(P.skyPale, 0.7);
        ctx.fillRect(0, 0, 1080, 1920);
        L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: -0.04, spacing: 9, width: 1.1, color: P.hcInkSoft, alpha: 0.4, length: [40, 160], gap: [6, 30], seed: 61 });
        ctx.restore();
        for (let k = 0; k < 3; k++) {
          const yy = ((k * 420 + (T - T0) * 2600) % 2100) - 200;
          const sc = 1 + (T - T0) * 2;
          ctx.save();
          ctx.globalAlpha = sky;
          const band = [];
          for (let x = -40; x <= 1120; x += 30) band.push([x, yy + Math.sin(x * 0.01 + k) * 30 * sc]);
          const fill = band.concat(band.slice().reverse().map(([x, y]) => [x, y + 80 * sc]));
          L.tracePath(ctx, fill, true);
          ctx.fillStyle = P.hcIvory;
          ctx.fill();
          L.hatch(ctx, fill, { angle: -0.1, spacing: 7, width: 1, color: P.hcInkSoft, alpha: 0.3, seed: 300 + k, density: (x, y) => L.clamp(0.8 - Math.abs(y - yy - 40 * sc) / (60 * sc)) });
          L.inkPath(ctx, band, { width: 1.8, color: P.hcInkSoft, alpha: 0.6, seed: 320 + k });
          ctx.restore();
        }
      }

      // the curiosity line: from the launch point up, then the free-return loop around the Moon
      const lp = [ecx + RE * 0.12, ecy - RE * 0.99];
      const mcNow = MC;
      const loopR = mcNow[2] * 1.45;
      const out = L.smoothPts([lp, [lp[0] + 120, lp[1] - 260], [mcNow[0] + loopR * 1.3, mcNow[1] + loopR * 1.6], [mcNow[0] + loopR, mcNow[1]]], false, 6);
      const arc = [];
      for (let k = 0; k <= 40; k++) { const a = -(k / 40) * Math.PI * 1.25; arc.push([mcNow[0] + Math.cos(a) * loopR, mcNow[1] + Math.sin(a) * loopR]); }
      const back = L.smoothPts([arc[arc.length - 1], [mcNow[0] - loopR * 1.6, mcNow[1] + loopR * 0.4], [lp[0] - 40, lp[1] - 420]], false, 6);
      const path = sky > 0.5 ? L.smoothPts([[0, 1500], [300, 1250], [700, 700], [1100, 200]], false, 6) : out.concat(arc.slice(1), back.slice(1));
      const u = sky > 0.5 ? L.clamp((T - T0) / 0.35) : L.ease.inOutQuad(L.clamp((T - 16.5) / (MOON - 16.4)));
      HC.line(ctx, path, { plate: sky > 0.5 ? 'paper' : 'blueprint', to: Math.max(0.01, u), width: 6, seed: 5 });
      // distance ticks along the line
      if (sky <= 0.5) {
        let acc = 0;
        const lim = u * path.length;
        for (let i = 1; i < lim && i < path.length; i++) {
          acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          if (acc > 46) {
            acc = 0;
            const a = Math.atan2(path[i][1] - path[i - 1][1], path[i][0] - path[i - 1][0]) + Math.PI / 2;
            ctx.strokeStyle = L.rgba(P.lavender, 0.7);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(path[i][0] + Math.cos(a) * 9, path[i][1] + Math.sin(a) * 9);
            ctx.lineTo(path[i][0] - Math.cos(a) * 9, path[i][1] - Math.sin(a) * 9);
            ctx.stroke();
          }
        }
      }
      // distance bracket Earth → Moon
      const ba = L.ease.outExpo(L.clamp((T - 17.5) / 0.4));
      if (ba > 0) {
        L.bracket(ctx, ecx + RE * 0.7, ecy - RE * 0.7, mcNow[0] - mcNow[2] * 0.8, mcNow[1] + mcNow[2] * 0.8, { color: P.lavender, alpha: 0.75, width: 1.5, offset: -70, p: ba });
        L.text(ctx, '384,400 KM', 120, 1130, { size: 24, family: MONO, weight: 500, color: P.lineWhite, alpha: 0.85 * ba, tracking: '0.18em' });
        L.text(ctx, 'APOLLO 11 · 1969', 120, 1166, { size: 22, family: MONO, weight: 500, color: P.lavender, alpha: 0.7 * ba, tracking: '0.18em' });
      }
      if (T >= MOON) {
        const k = (T - MOON) / 0.4;
        if (k < 1) {
          ctx.strokeStyle = L.rgba(P.hcYellow, 1 - k);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(G6[0], G6[1], G6[2] + 120 * L.ease.outExpo(k), 0, TAU);
          ctx.stroke();
        }
      }
      X.progress(ctx, 4, T);
    },
  });
})();
