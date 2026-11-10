// Main-menu backdrop. The same skyline is rendered in several "formats" at
// once: vertical bands sweep across the screen and whatever they pass over is
// redrawn in that band's visual language (pixel art, ink line-art, layered
// paper, blueprint wireframe). The title logo breaks along the band edges.
import { VW, VH } from '../ch1/background.js';
import { makeCanvas, noise1, hash2, clamp, lerp } from '../core/util.js';

const CREAM = '#f3ead2', INK = '#17131f';

export class MenuBackground {
  constructor(game) { this.game = game; this.t = 0; this.pix = makeCanvas(VW, VH); this.pctx = this.pix.getContext('2d'); this.pctx.imageSmoothingEnabled = false; this.sky = null; }

  // --- format 1: the real Chapter 1 pixel background --------------------------------
  drawPixel(t) {
    const ch = this.game.director.modules[1], ctx = this.pctx; if (!ch) return false;
    const bg = ch.bg, px = t * 14;
    ctx.drawImage(bg.sky, 0, 0); ctx.drawImage(bg.framework, 168, 8);
    const strip = (img, w, f, y) => { const o = -Math.floor(px * f) % w; for (let x = o - w; x < VW; x += w) ctx.drawImage(img, x, y); return o; };
    strip(bg.far, bg.farW, 0.2, 62); const mo = strip(bg.mid, bg.midW, 0.5, 46);
    const gf = Math.floor(t * 7) % 8;
    for (let rep = -1; rep < 2; rep++) { const ox = mo + rep * bg.midW; ctx.drawImage(bg.gearBig[gf], ox + 140, 108); ctx.drawImage(bg.gearSmall[7 - gf], ox + 198, 130); ctx.drawImage(bg.gearBig[7 - gf], ox + 470, 116); }
    strip(bg.near, bg.nearW, 1, 70);
    // Rin running along a rooftop ledge
    ctx.fillStyle = '#0d0f1f'; ctx.fillRect(0, 164, VW, 16); ctx.fillStyle = '#98a2bd'; ctx.fillRect(0, 164, VW, 1);
    ch.atlas.draw(ctx, 'rin_run' + (Math.floor(t * 14) % 8), 118, 164);
    ch.atlas.draw(ctx, 'vell' + [0, 0, 1, 0, 2, 0, 0, 3][Math.floor(t * 5) % 8], 92, 136 + Math.sin(t * 2.2) * 4);
    return true;
  }
  // skyline profile shared by the vector formats (so the bands line up)
  h(i, layer) { return 0.16 + 0.5 * hash2(i * 3 + layer * 17, layer) * (layer === 0 ? 0.7 : 1); }

  drawInk(ctx, W, H, t) {
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    // halftone sun
    const sx = W * 0.3, sy = H * 0.72, R = H * 0.3; ctx.fillStyle = '#e9c46a';
    for (let y = -R; y < R; y += H * 0.022) for (let x = -R; x < R; x += H * 0.022) { const d = Math.hypot(x, y) / R; if (d < 1) { ctx.beginPath(); ctx.arc(sx + x, sy + y, H * 0.008 * (1.2 - d), 0, 7); ctx.fill(); } }
    const boil = Math.floor(t * 8);
    for (let layer = 0; layer < 3; layer++) {
      const n = 14 + layer * 4, bw = W / n * 1.5, off = (t * (20 + layer * 30)) % bw;
      ctx.fillStyle = ['#d9cfb4', '#8f8a84', INK][layer]; ctx.strokeStyle = INK; ctx.lineWidth = H * (0.003 + layer * 0.0015); ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-bw, H);
      for (let i = -1; i < n; i++) {
        const k = i + Math.floor((t * (20 + layer * 30)) / bw), x0 = i * bw - off, hh = this.h(k, layer) * H * (0.5 + layer * 0.14), wob = (j) => noise1(k * 7 + j * 3 + boil * 13, layer) * H * 0.006;
        ctx.lineTo(x0 + wob(1), H - hh + wob(2)); ctx.lineTo(x0 + bw * 0.86 + wob(3), H - hh * (0.96 + 0.08 * hash2(k, 9)) + wob(4)); ctx.lineTo(x0 + bw * 0.86 + wob(5), H);
      }
      ctx.lineTo(W + bw, H); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // speed strokes
    ctx.strokeStyle = INK; ctx.lineWidth = H * 0.004; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const y = H * (0.2 + 0.1 * i) + noise1(i + boil, 3) * 6, x = W - ((t * 500 + i * 331) % (W * 1.4)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + W * 0.09, y + noise1(i * 5 + boil, 1) * 4); ctx.stroke(); }
  }
  drawPaper(ctx, W, H, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f6d9a8'); g.addColorStop(1, '#f2b59a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(W * 0.3, H * 0.72, H * 0.3, 0, 7); ctx.fill();
    const cols = ['#e9a178', '#c9705f', '#7d4a5c', '#3d2c47'];
    for (let layer = 0; layer < 4; layer++) {
      const n = 10 + layer * 3, bw = W / n * 1.6, sp = 12 + layer * 26, off = (t * sp) % bw;
      ctx.save(); ctx.shadowColor = 'rgba(40,15,30,0.45)'; ctx.shadowBlur = H * 0.03; ctx.shadowOffsetY = H * 0.012; ctx.fillStyle = cols[layer];
      ctx.beginPath(); ctx.moveTo(-bw, H);
      for (let i = -1; i < n; i++) { const k = i + Math.floor((t * sp) / bw), x0 = i * bw - off, hh = this.h(k, layer + 1) * H * (0.62 - layer * 0.06) + H * 0.06; ctx.lineTo(x0, H - hh); if (hash2(k, layer) > 0.5) { ctx.lineTo(x0 + bw * 0.42, H - hh - H * 0.05); } ctx.lineTo(x0 + bw * 0.84, H - hh); ctx.lineTo(x0 + bw * 0.84, H - hh * 0.7); ctx.lineTo(x0 + bw, H - hh * 0.7); }
      ctx.lineTo(W + bw, H); ctx.closePath(); ctx.fill(); ctx.restore();
      // cut-out windows
      ctx.fillStyle = 'rgba(255,240,200,0.75)';
      for (let i = -1; i < n; i++) { const k = i + Math.floor((t * sp) / bw), x0 = i * bw - off, hh = this.h(k, layer + 1) * H * (0.62 - layer * 0.06) + H * 0.06; if (layer > 0 && hash2(k, layer + 4) > 0.45) for (let r = 0; r < 3; r++) ctx.fillRect(x0 + bw * 0.2, H - hh + H * 0.04 + r * H * 0.05, bw * 0.12, H * 0.025); }
    }
  }
  drawWire(ctx, W, H, t) {
    ctx.fillStyle = '#0b1830'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,190,255,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = -((t * 40) % (H * 0.06)); x < W; x += H * 0.06) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = 0; y < H; y += H * 0.06) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    ctx.strokeStyle = '#8fe0ff'; ctx.lineWidth = Math.max(1, H * 0.0025);
    for (let layer = 1; layer < 3; layer++) {
      const n = 12 + layer * 4, bw = W / n * 1.5, sp = 20 + layer * 30, off = (t * sp) % bw, d = H * 0.03;
      for (let i = -1; i < n; i++) { const k = i + Math.floor((t * sp) / bw), x0 = i * bw - off, hh = this.h(k, layer) * H * (0.5 + layer * 0.14), w = bw * 0.84, y = H - hh;
        ctx.beginPath(); ctx.rect(x0, y, w, hh); ctx.moveTo(x0, y); ctx.lineTo(x0 + d, y - d); ctx.lineTo(x0 + w + d, y - d); ctx.lineTo(x0 + w, y); ctx.moveTo(x0 + w + d, y - d); ctx.lineTo(x0 + w + d, H); ctx.stroke(); }
    }
  }

  render(ctx, W, H, dt) {
    this.t += dt; const t = this.t;
    if (!this.layers) this.layers = [0, 1, 2].map(() => makeCanvas(2, 2));
    for (const c of this.layers) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    // base: pixel format, integer scaled
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0d0f1f'; ctx.fillRect(0, 0, W, H);
    if (this.drawPixel(t)) { const s = Math.max(1, Math.ceil(Math.max(W / VW, H / VH))); ctx.drawImage(this.pix, 0, 0, VW, VH, (W - VW * s) >> 1, (H - VH * s) >> 1, VW * s, VH * s); }
    // format bands sweeping right-to-left, each a slanted "frame"
    const fns = [this.drawInk, this.drawPaper, this.drawWire], period = 21;
    this.bands = [];
    for (let i = 0; i < 3; i++) {
      const ph = ((t + i * (period / 3)) % period) / period, bw = W * 0.3, x = lerp(W * 1.25, -W * 0.55, ph), lc = this.layers[i].getContext('2d');
      if (x > W || x + bw + H * 0.3 < 0) continue;
      lc.setTransform(1, 0, 0, 1, 0, 0); lc.imageSmoothingEnabled = true; fns[i].call(this, lc, W, H, t);
      const sl = H * 0.22;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x + sl, 0); ctx.lineTo(x + bw + sl, 0); ctx.lineTo(x + bw, H); ctx.lineTo(x, H); ctx.closePath(); ctx.clip(); ctx.drawImage(this.layers[i], 0, 0); ctx.restore();
      // frame edges
      ctx.strokeStyle = '#f4f6ff'; ctx.lineWidth = Math.max(2, H * 0.006); ctx.beginPath(); ctx.moveTo(x + sl, 0); ctx.lineTo(x, H); ctx.moveTo(x + bw + sl, 0); ctx.lineTo(x + bw, H); ctx.stroke();
      ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = Math.max(1, H * 0.002); ctx.beginPath(); ctx.moveTo(x + sl + H * 0.012, 0); ctx.lineTo(x + H * 0.012, H); ctx.stroke();
      this.bands.push({ x, bw, sl, i });
    }
    // vignette for menu legibility
    const g = ctx.createLinearGradient(0, 0, W * 0.6, 0); g.addColorStop(0, 'rgba(13,15,31,0.82)'); g.addColorStop(1, 'rgba(13,15,31,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    this.drawLogo(ctx, W, H, t);
  }

  // The logo: heavy letters, each broken by a slipping "frame".
  drawLogo(ctx, W, H, t) {
    const text = 'FRAMEBREAK', size = H * 0.15, x0 = W * 0.07, y0 = H * 0.3;
    ctx.save(); ctx.font = `900 ${size}px Impact, 'Arial Black', sans-serif`; ctx.textBaseline = 'alphabetic';
    let x = x0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], w = ctx.measureText(ch).width, slip = Math.sin(t * 1.3 + i * 0.9) * size * 0.035, broke = i >= 5;
      const cut = y0 - size * (0.36 + 0.1 * Math.sin(i * 1.7));
      for (let half = 0; half < 2; half++) {
        ctx.save(); ctx.beginPath(); if (half === 0) ctx.rect(x - 4, y0 - size, w + 8, cut - (y0 - size)); else ctx.rect(x - 4, cut, w + 8, size * 0.6); ctx.clip();
        const dx = broke ? (half ? slip : -slip) * 2.2 : 0, dy = broke && half ? size * 0.02 : 0;
        ctx.fillStyle = '#0d0f1f'; ctx.fillText(ch, x + dx + size * 0.04, y0 + dy + size * 0.045);
        ctx.fillStyle = broke ? (half ? '#ff9a3c' : '#f4f6ff') : '#f4f6ff'; ctx.fillText(ch, x + dx, y0 + dy);
        ctx.restore();
      }
      if (broke) { ctx.fillStyle = '#2fd3c6'; ctx.fillRect(x - 2 + slip, cut - size * 0.008, w + 4, size * 0.016); }
      x += w + size * 0.035;
    }
    ctx.font = `700 ${H * 0.022}px 'Trebuchet MS', sans-serif`; ctx.fillStyle = '#ff9a3c'; ctx.letterSpacing = `${H * 0.008}px`;
    ctx.fillText('ONE UNIVERSE. TOO MANY WAYS TO EXIST.', x0 + 4, y0 + H * 0.055);
    ctx.restore();
  }
}
