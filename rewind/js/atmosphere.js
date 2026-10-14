/* Atmosphere: one subtle canvas whose scene crossfades between eras.
 *   y2020 — blurred LED bokeh, a slow-shifting LED strip along the floor, drifting dust
 *   fall  — warm bokeh, slowly falling leaves, (Nov) faint rain, (Dec) cool motes
 * Respects intensity / depth / reduced-motion and pauses when the tab is hidden. */
(function () {
  'use strict';
  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  function leafPath(ctx, s) {
    ctx.beginPath(); ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.9, -s * 0.5, s * 0.8, s * 0.6, 0, s);
    ctx.bezierCurveTo(-s * 0.8, s * 0.6, -s * 0.9, -s * 0.5, 0, -s); ctx.closePath();
  }

  class Atmosphere {
    constructor(canvas) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.scene = null; this.variant = null; this.parts = []; this.fade = 1; this.target = 1;
      this.intensity = 0.7; this.depth = 0.5; this.reduce = false; this.t = 0; this.last = 0; this.running = false; this.pending = null;
      this.resize = this.resize.bind(this); this.frame = this.frame.bind(this);
      addEventListener('resize', this.resize); this.resize();
      document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    }
    resize() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      this.w = innerWidth; this.h = innerHeight;
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.scene) this.populate(); this.drawStatic();
    }
    configure({ intensity, depth, reduceMotion }) {
      if (intensity != null) this.intensity = intensity / 100;
      if (depth != null) { const d = depth / 100; if (Math.abs(d - this.depth) > 0.01) { this.depth = d; if (this.scene) this.populate(); } }
      if (reduceMotion != null) this.reduce = reduceMotion;
      this.reduce ? (this.stop(), this.drawStatic()) : this.start();
    }
    setScene(scene, variant = null) {
      if (scene === this.scene && variant === this.variant) return;
      const swap = () => { this.scene = scene; this.variant = variant; this.populate(); this.target = 1; this.drawStatic(); };
      if (!this.scene || this.reduce) return swap();
      this.target = 0; this.pending = swap;   // fade out, swap, fade in (see frame())
    }
    populate() {
      const n = (base) => Math.round(base * (this.w < 700 ? 0.6 : 1));
      const z = () => rand(0.4, 1);   // z = parallax layer; deeper -> slower/blurrier/larger
      const P = [];
      if (this.scene === 'y2020') {
        const leds = ['#7b4dff', '#3b82ff', '#ff4fd8', '#35d0ff', '#9b6bff'];
        for (let i = 0; i < n(16); i++) P.push({ k: 'orb', x: rand(0, this.w), y: rand(0, this.h), r: rand(50, 170) * (0.6 + this.depth), z: z(), c: leds[i % leds.length], a: rand(0.08, 0.2), ph: rand(0, TAU), vx: rand(-6, 6), vy: rand(-4, 4) });
        for (let i = 0; i < n(46); i++) P.push({ k: 'dust', x: rand(0, this.w), y: rand(0, this.h), r: rand(0.6, 1.8), z: z(), a: rand(0.15, 0.5), ph: rand(0, TAU), vx: rand(-3, 3), vy: rand(-5, -1) });
        P.push({ k: 'strip' });
      } else if (this.scene === 'fall') {
        const warm = ['#ffb347', '#ff8a3d', '#e0662b', '#f6d28b', '#c97a2c'];
        const v = this.variant || 'fall';
        for (let i = 0; i < n(15); i++) P.push({ k: 'orb', x: rand(0, this.w), y: rand(0, this.h), r: rand(40, 150) * (0.6 + this.depth), z: z(), c: v === '2023-12' ? ['#ffcf8a', '#9fb4d9', '#f1a35a'][i % 3] : warm[i % warm.length], a: rand(0.07, 0.17), ph: rand(0, TAU), vx: rand(-4, 4), vy: rand(-3, 3) });
        const leaves = v === '2023-12' ? 5 : v === '2023-10' ? 20 : v === '2023-09' ? 10 : 14;
        const lc = ['#d9822b', '#b5521d', '#e8a64a', '#8a3b12', '#c4661f'];
        for (let i = 0; i < n(leaves); i++) P.push({ k: 'leaf', x: rand(0, this.w), y: rand(-this.h * 0.2, this.h), s: rand(7, 15) * (0.7 + this.depth * 0.7), z: z(), c: lc[i % lc.length], a: rand(0.22, 0.45), rot: rand(0, TAU), vr: rand(-0.5, 0.5), ph: rand(0, TAU), vy: rand(16, 34) });
        if (v === '2023-11') for (let i = 0; i < n(70); i++) P.push({ k: 'rain', x: rand(0, this.w), y: rand(0, this.h), l: rand(10, 24), z: z(), vy: rand(380, 560), a: rand(0.04, 0.1) });
        if (v === '2023-12') for (let i = 0; i < n(40); i++) P.push({ k: 'dust', x: rand(0, this.w), y: rand(0, this.h), r: rand(0.8, 2.2), z: z(), a: rand(0.2, 0.55), ph: rand(0, TAU), vx: rand(-4, 4), vy: rand(6, 14) });
      }
      this.parts = P;
    }
    start() { if (this.running || this.reduce || document.hidden) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.frame); }
    stop() { this.running = false; }
    frame(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
      const dir = this.target - this.fade;
      if (Math.abs(dir) > 0.001) { this.fade += Math.sign(dir) * Math.min(Math.abs(dir), dt / 0.45); }
      if (this.fade <= 0.001 && this.pending) { const p = this.pending; this.pending = null; p(); }
      this.draw(dt); requestAnimationFrame(this.frame);
    }
    drawStatic() { if (this.reduce || !this.running) this.draw(0); }
    draw(dt) {
      const { ctx, w, h } = this; ctx.clearRect(0, 0, w, h);
      const A = this.intensity * this.fade; if (A <= 0.003) return;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        if (p.k === 'orb') {
          p.x += p.vx * p.z * dt; p.y += p.vy * p.z * dt;
          if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r; if (p.y < -p.r) p.y = h + p.r; if (p.y > h + p.r) p.y = -p.r;
          const pulse = 0.75 + 0.25 * Math.sin(this.t * 0.35 + p.ph);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, p.c + hex(p.a * pulse * A * 1.4)); g.addColorStop(0.55, p.c + hex(p.a * pulse * A * 0.5)); g.addColorStop(1, p.c + '00');
          ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        } else if (p.k === 'dust') {
          p.x += p.vx * p.z * dt; p.y += p.vy * p.z * dt;
          if (p.y < -4) p.y = h + 4; if (p.y > h + 4) p.y = -4; if (p.x < -4) p.x = w + 4; if (p.x > w + 4) p.x = -4;
          const tw = 0.5 + 0.5 * Math.sin(this.t * 0.8 + p.ph);
          ctx.fillStyle = (this.scene === 'fall' ? 'rgba(255,214,160,' : 'rgba(200,190,255,') + (p.a * tw * A) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + this.depth * 0.8), 0, TAU); ctx.fill();
        } else if (p.k === 'leaf') {
          p.y += p.vy * p.z * dt; p.rot += p.vr * dt; p.x += Math.sin(this.t * 0.5 + p.ph) * 14 * p.z * dt;
          if (p.y > h + 30) { p.y = -30; p.x = rand(0, w); }
          ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(this.t * 0.7 + p.ph) * 0.5);
          ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(this.t * 0.4 + p.ph))); ctx.globalAlpha = p.a * A * (0.5 + p.z * 0.5); ctx.fillStyle = p.c;
          leafPath(ctx, p.s * p.z); ctx.fill(); ctx.restore();
        } else if (p.k === 'rain') {
          p.y += p.vy * p.z * dt; p.x -= 40 * p.z * dt; if (p.y > h) { p.y = -p.l; p.x = rand(0, w + 80); }
          ctx.strokeStyle = 'rgba(190,210,235,' + p.a * A * 1.6 + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 3 * p.z, p.y + p.l * p.z); ctx.stroke();
        } else if (p.k === 'strip') {
          const hue = 262 + Math.sin(this.t * 0.12) * 60;   // violet <-> blue <-> magenta
          const g = ctx.createLinearGradient(0, h - 120, 0, h);
          g.addColorStop(0, `hsla(${hue},95%,60%,0)`); g.addColorStop(1, `hsla(${hue},95%,62%,${0.22 * A})`);
          ctx.fillStyle = g; ctx.fillRect(0, h - 120, w, 120);
          const g2 = ctx.createLinearGradient(0, 0, w, 0);
          g2.addColorStop(0, `hsla(${hue + 50},90%,60%,${0.12 * A})`); g2.addColorStop(0.5, `hsla(${hue},90%,60%,${0.32 * A})`); g2.addColorStop(1, `hsla(${hue - 50},90%,60%,${0.12 * A})`);
          ctx.fillStyle = g2; ctx.fillRect(0, h - 3, w, 3);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  const hex = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  window.Atmosphere = Atmosphere;
})();
