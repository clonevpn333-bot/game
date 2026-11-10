// Pixel-world effects: animated sprite effects, single-pixel particles,
// afterimages, gibs, floating combo text. Everything snaps to the pixel grid.
import { PAL, ptext } from './pix.js';

export class Fx {
  constructor(ch) { this.ch = ch; this.sprites = []; this.parts = []; this.ghosts = []; this.texts = []; this.gibs = []; }
  clear() { this.sprites.length = this.parts.length = this.ghosts.length = this.texts.length = this.gibs.length = 0; }
  // animated one-shot: frames base0..base(n-1)
  sprite(base, x, y, n, fps, flip = false, follow = null) { this.sprites.push({ base, x, y, n, fps, t: 0, flip, follow }); }
  slash(base, pl) { this.sprites.push({ base: base + '_', x: pl.x, y: pl.y, n: 3, fps: 26, t: 0, flip: pl.facing < 0, follow: pl }); }
  hit(x, y, big = false) { this.sprite('fx_hit', x, y, 4, big ? 22 : 30); this.burst(x, y, big ? 10 : 5, ['W', 'y', 'O']); }
  boom(x, y) { this.sprite('fx_boom', x, y, 6, 16); this.burst(x, y, 14, ['y', 'O', 'R', 'h']); for (let i = 0; i < 3; i++) this.sprites.push({ base: 'fx_smoke', x: x + (Math.random() - 0.5) * 20, y: y - 6 - i * 6, n: 4, fps: 7, t: -0.12 * i, vy: -18 }); }
  burst(x, y, n, cols, speed = 110, grav = 320) {
    const max = 500 * (this.ch.game.settings.particles ?? 1);
    for (let i = 0; i < n && this.parts.length < max; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.9);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.25 + Math.random() * 0.45, c: PAL[cols[i % cols.length]], g: grav, s: Math.random() < 0.3 ? 2 : 1 });
    }
  }
  spark(x, y, vx, vy, col = 'y', life = 0.3, g = 300, s = 1) { this.parts.push({ x, y, vx, vy, life, c: PAL[col] || col, g, s }); }
  chargeMote(pl) { const a = Math.random() * 6.28, r = 18; this.parts.push({ x: pl.x + pl.facing * 8 + Math.cos(a) * r, y: pl.y - 15 + Math.sin(a) * r, vx: -Math.cos(a) * 70, vy: -Math.sin(a) * 70, life: 0.24, c: PAL.C, g: 0, s: 1 }); }
  afterimage(pl) { this.ghosts.push({ frame: pl.frameName(), x: pl.x, y: pl.y, flip: pl.facing < 0, t: 0.22 }); }
  text(str, x, y, color = '#fff3b0') { this.texts.push({ str, x, y, t: 0, color }); }
  gib(x, y, n = 4) { for (let i = 0; i < n; i++) this.gibs.push({ k: i % 4, x, y, vx: (Math.random() - 0.5) * 220, vy: -120 - Math.random() * 160, t: 0, life: 1.1 + Math.random() * 0.5 }); }
  update(dt) {
    for (const s of this.sprites) { s.t += dt; if (s.vy) s.y += s.vy * dt; }
    this.sprites = this.sprites.filter((s) => s.t * s.fps < s.n);
    for (const p of this.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const g of this.ghosts) g.t -= dt; this.ghosts = this.ghosts.filter((g) => g.t > 0);
    for (const t of this.texts) { t.t += dt; t.y -= 22 * dt; } this.texts = this.texts.filter((t) => t.t < 0.8);
    for (const g of this.gibs) { g.t += dt; g.vy += 520 * dt; g.x += g.vx * dt; g.y += g.vy * dt; } this.gibs = this.gibs.filter((g) => g.t < g.life);
  }
  drawBack(ctx, atlas, cam) {
    for (const g of this.ghosts) { ctx.globalAlpha = g.t > 0.14 ? 0.6 : g.t > 0.07 ? 0.35 : 0.18; atlas.draw(ctx, g.frame, g.x - cam.x, g.y - cam.y, g.flip, true); }
    ctx.globalAlpha = 1;
  }
  draw(ctx, atlas, cam) {
    for (const g of this.gibs) { if (g.life - g.t < 0.3 && Math.floor(g.t * 30) % 2) continue; atlas.draw(ctx, 'gib' + g.k, g.x - cam.x, g.y - cam.y, g.vx < 0); }
    for (const s of this.sprites) { if (s.t < 0) continue; const f = Math.min(s.n - 1, Math.floor(s.t * s.fps)); const x = s.follow ? s.follow.x : s.x, y = s.follow ? s.follow.y : s.y; atlas.draw(ctx, s.base + f, x - cam.x, y - cam.y, s.flip); }
    for (const p of this.parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.s, p.s); }
    for (const t of this.texts) { if (t.t > 0.55 && Math.floor(t.t * 30) % 2) continue; ptext(ctx, t.str, t.x - cam.x, t.y - cam.y, t.color, 0.5); }
  }
}

// Combo meter: every connected hit counts; dropping it resets the rank.
export class Combo {
  constructor(ch) { this.ch = ch; this.n = 0; this.t = 0; this.best = 0; this.pop = 0; }
  add(k = 1) { this.n += k; this.t = 2.4; this.pop = 1; if (this.n > this.best) this.best = this.n; }
  drop() { this.n = 0; this.t = 0; }
  update(dt) { this.pop = Math.max(0, this.pop - dt * 6); if (this.n > 0) { this.t -= dt; if (this.t <= 0) this.n = 0; } }
  get rank() { const n = this.n; return n >= 40 ? 'S' : n >= 25 ? 'A' : n >= 14 ? 'B' : n >= 7 ? 'C' : 'D'; }
}
