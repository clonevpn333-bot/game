/* Procedural cover art. Every game gets a deterministic, hand-composed-looking
 * key image from its `art` spec — no binary assets, no stock imagery. */
const cache = new Map();

const rng = (seed) => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;
const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;

function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}
function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/* ---- shared atmosphere passes ---- */
function sky(ctx, w, h, hue, spec) {
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [
    [0, hsl(hue + 12, spec.sat * 0.7, 8)],
    [0.42, hsl(hue, spec.sat, spec.dark)],
    [1, hsl(hue - 22, spec.sat * 1.1, spec.deep)],
  ]);
  ctx.fillRect(0, 0, w, h);
}
function bloom(ctx, w, h, x, y, r, hue, sat, light, alpha) {
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = radial(ctx, x, y, r, [
    [0, hsl(hue, sat, light, alpha)], [0.45, hsl(hue, sat, light * 0.7, alpha * 0.4)], [1, hsl(hue, sat, 0, 0)],
  ]);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}
function grain(ctx, w, h, r, amount) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}
function vignette(ctx, w, h, strength = 0.72) {
  ctx.fillStyle = radial(ctx, w / 2, h * 0.44, Math.max(w, h) * 0.78, [
    [0.42, 'rgba(0,0,0,0)'], [1, `rgba(3,4,6,${strength})`],
  ]);
  ctx.fillRect(0, 0, w, h);
}
function ridge(ctx, w, h, baseY, amp, rough, r, fill, seedShift) {
  // Ridged fractal silhouette — sharp peaks, soft saddles.
  ctx.beginPath(); ctx.moveTo(0, h);
  const pts = 220;
  for (let i = 0; i <= pts; i++) {
    const t = i / pts, x = t * w;
    let y = baseY, a = amp, f = 2.0;
    for (let o = 0; o < 5; o++) {
      const s = Math.sin(t * f * Math.PI + seedShift * (o * 1.7 + 1));
      y -= Math.pow(Math.abs(s), 0.62) * a * Math.sign(s > 0 ? 1 : 0.28);
      a *= rough; f *= 2.03;
    }
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}

/* ---- motifs ---- */
const MOTIF = {
  summit(ctx, w, h, r, hue, spec) {
    sky(ctx, w, h, hue, spec);
    // dawn band along the horizon, warm against the cold sky
    ctx.fillStyle = grad(ctx, 0, h * 0.24, 0, h * 0.66, [
      [0, hsl(hue + 8, spec.sat, 12, 0)], [0.62, hsl(hue + 46, 58, 40, 0.5)], [1, hsl(hue + 30, 46, 24, 0.25)]]);
    ctx.fillRect(0, h * 0.24, w, h * 0.44);
    bloom(ctx, w, h, w * 0.68, h * 0.36, h * 0.62, hue + 40, 78, 62, 0.62);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = radial(ctx, w * 0.68, h * 0.38, w * 0.085, [[0, hsl(hue + 44, 92, 92, 0.98)], [0.6, hsl(hue + 40, 92, 70, 0.5)], [1, hsl(hue + 38, 90, 60, 0)]]);
    ctx.beginPath(); ctx.arc(w * 0.68, h * 0.38, w * 0.085, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const top = h * lerp(0.56, 0.97, t), amp = h * lerp(0.23, 0.04, t), shift = i * 2.3 + 0.7;
      // atmospheric perspective: far ridges pale and blue, near ones near-black
      const lo = lerp(46, 4, Math.pow(t, 0.78)), hi = lerp(58, 9, Math.pow(t, 0.78));
      ridge(ctx, w, h, top, amp, 0.5, r,
        grad(ctx, 0, top - amp, 0, h, [
          [0, hsl(hue + 10 - i * 3, spec.sat * lerp(0.55, 1, t), hi)],
          [1, hsl(hue - 14, spec.sat, lo * 0.55)]]),
        shift);
      if (i < 3) { // snow catching the light on the upper faces
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.42 - i * 0.12;
        ridge(ctx, w, h, top - h * 0.006, amp, 0.5, r, hsl(hue + 34, 26, 88), shift);
        ctx.restore();
      }
    }
    // haze bands between ridges
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const y = h * (0.6 + i * 0.095);
      ctx.fillStyle = grad(ctx, 0, y - h * 0.06, 0, y + h * 0.05, [[0, hsl(hue + 10, 40, 60, 0)], [0.5, hsl(hue + 10, 40, 60, 0.13)], [1, hsl(hue + 10, 40, 60, 0)]]);
      ctx.fillRect(0, y - h * 0.06, w, h * 0.11);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
  neon(ctx, w, h, r, hue, spec) {
    sky(ctx, w, h, hue, spec);
    const hz = h * 0.56;
    bloom(ctx, w, h, w * 0.5, hz, w * 0.7, hue + 18, 92, 58, 0.55);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = hsl(hue + 28, 95, 62, 0.9);
    ctx.beginPath(); ctx.arc(w * 0.5, hz - h * 0.02, w * 0.19, Math.PI, 0); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) { const y = hz - h * 0.02 - i * h * 0.016 - h * 0.006; ctx.fillRect(0, y, w, h * 0.008); }
    ctx.restore();
    ctx.strokeStyle = hsl(hue + 40, 90, 66, 0.55); ctx.lineWidth = 1.2;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath(); ctx.moveTo(w / 2 + i * w * 0.028, hz); ctx.lineTo(w / 2 + i * w * 0.42, h * 1.1); ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const t = Math.pow(i / 16, 2.1), y = hz + (h - hz) * t;
      ctx.globalAlpha = 0.25 + t * 0.55;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  vector(ctx, w, h, r, hue, spec) {
    sky(ctx, w, h, hue, { ...spec, dark: spec.dark - 3 });
    for (let i = 0; i < 220; i++) {
      const x = r() * w, y = r() * h, s = r() * 1.5 + 0.3;
      ctx.fillStyle = hsl(hue + r() * 60, 40, 60 + r() * 35, 0.1 + r() * 0.6);
      ctx.fillRect(x, y, s, s);
    }
    bloom(ctx, w, h, w * 0.3, h * 0.34, h * 0.6, hue + 40, 80, 55, 0.42);
    const cx = w * 0.5, cy = h * 0.48;
    for (let k = 0; k < 9; k++) {
      const rad = w * (0.1 + k * 0.055), n = 3 + (k % 4);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(r() * 6.28);
      ctx.strokeStyle = hsl(hue + 30 + k * 8, 85, 68, 0.14 + 0.4 / (k + 1)); ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = (i / n) * 6.283; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad * 0.92); }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
  },
  prism(ctx, w, h, r, hue, spec) {
    sky(ctx, w, h, hue, spec);
    bloom(ctx, w, h, w * 0.5, h * 0.62, h * 0.66, hue + 30, 70, 55, 0.38);
    const cols = 7, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const stack = 2 + Math.floor(r() * 5);
      for (let s = 0; s < stack; s++) {
        const bh = h * (0.055 + r() * 0.05);
        const y = h * 0.92 - s * bh * 1.06 - r() * 6;
        const g = grad(ctx, c * cw, y, c * cw + cw, y + bh, [
          [0, hsl(hue + c * 14 + s * 6, 68, 58, 0.92)], [1, hsl(hue + c * 14 + s * 6 - 18, 62, 32, 0.92)]]);
        ctx.fillStyle = g;
        ctx.fillRect(c * cw + cw * 0.09, y - bh, cw * 0.82, bh);
        ctx.fillStyle = hsl(hue + c * 14, 70, 82, 0.5);
        ctx.fillRect(c * cw + cw * 0.09, y - bh, cw * 0.82, 1.6);
      }
    }
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad(ctx, 0, h * 0.5, 0, h, [[0, hsl(hue, 60, 50, 0)], [1, hsl(hue + 20, 70, 50, 0.22)]]);
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.globalCompositeOperation = 'source-over';
  },
  metro(ctx, w, h, r, hue, spec) {
    sky(ctx, w, h, hue, spec);
    bloom(ctx, w, h, w * 0.24, h * 0.3, h * 0.66, hue + 30, 60, 52, 0.36);
    for (let layer = 0; layer < 3; layer++) {
      const base = h * (0.62 + layer * 0.12), shade = 14 - layer * 4;
      let x = -20;
      while (x < w + 20) {
        const bw = w * (0.05 + r() * 0.09), bh = h * (0.14 + r() * (0.3 - layer * 0.07));
        ctx.fillStyle = hsl(hue - 8, spec.sat * 0.8, shade);
        ctx.fillRect(x, base - bh, bw, bh + h);
        ctx.fillStyle = hsl(hue + 42, 78, 66, 0.5 - layer * 0.14);
        for (let wy = base - bh + 8; wy < base - 8; wy += 11) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (r() > 0.62) ctx.fillRect(wx, wy, 3, 4.5);
        }
        x += bw + w * 0.012;
      }
    }
  },
};

/** Renders (and caches) a cover for a game spec. Returns an HTMLCanvasElement. */
export function coverCanvas(game, w = 420, h = 560) {
  const key = `${game.id}:${w}x${h}`;
  let src = cache.get(key);
  if (!src) {
    src = document.createElement('canvas');
    src.width = w; src.height = h;
    const ctx = src.getContext('2d');
    const a = game.art || {};
    const r = rng((a.seed ?? 7) * 2654435761);
    const spec = { sat: a.sat ?? 46, dark: a.dark ?? 16, deep: a.deep ?? 6 };
    (MOTIF[a.motif] || MOTIF.summit)(ctx, w, h, r, a.hue ?? 210, spec);
    vignette(ctx, w, h, a.vignette ?? 0.7);
    grain(ctx, w, h, r, 14);
    cache.set(key, src);
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').drawImage(src, 0, 0);
  return out;
}
