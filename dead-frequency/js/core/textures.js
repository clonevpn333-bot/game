'use strict';
// Canvas-generated textures. Everything is drawn in code.

const TEX = {
  cache: {},
  maxAniso: 4,

  canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
  make(c, o = {}) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = o.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.anisotropy = this.maxAniso;
    if (o.nearest) { t.magFilter = THREE.NearestFilter; }
    return t;
  },
  get(name, ...args) {
    const key = name + (args.length ? JSON.stringify(args) : '');
    if (this.cache[key]) return this.cache[key];
    const fn = this.gen[name];
    if (!fn) { console.warn('no texture', name); return null; }
    const t = fn.apply(this, args);
    this.cache[key] = t;
    return t;
  },
  // speckle/grime overlay
  grime(ctx, w, h, amt = 0.08, seed = 1, scale = 1) {
    const r = U.seeded(seed);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = (U.fbm(x / (40 * scale), y / (40 * scale), seed, 3) - 0.5) * 2 * amt * 255 + (r() - 0.5) * amt * 120;
      const i = (y * w + x) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  },
  rgb(c) { return typeof c === 'string' ? c : `rgb(${c[0]},${c[1]},${c[2]})`; },

  gen: {
    plain(color, amt = 0.05, seed = 3) {
      const c = TEX.canvas(128, 128), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 128, 128); TEX.grime(x, 128, 128, amt, seed);
      return TEX.make(c);
    },
    vct(base = '#c9c3b2', alt = '#b9b4a6') { // vinyl composition tile, 1 tile per texture
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(7);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        x.fillStyle = (i + j) % 2 ? alt : base; x.fillRect(i * 128, j * 128, 128, 128);
        for (let k = 0; k < 500; k++) { x.fillStyle = r() < 0.5 ? 'rgba(80,70,60,.25)' : 'rgba(255,255,255,.18)'; x.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 1 + r() * 2, 1 + r() * 2); }
      }
      x.strokeStyle = 'rgba(60,55,45,.35)'; x.lineWidth = 2; x.strokeRect(0, 0, 128, 128); x.strokeRect(128, 128, 128, 128); x.strokeRect(128, 0, 128, 128); x.strokeRect(0, 128, 128, 128);
      TEX.grime(x, 256, 256, 0.07, 9);
      return TEX.make(c);
    },
    carpet(color = '#4a5260') {
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(11);
      x.fillStyle = color; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 9000; k++) { const v = r(); x.fillStyle = v < 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.08)'; x.fillRect(r() * 256, r() * 256, 1, 1); }
      TEX.grime(x, 256, 256, 0.06, 12, 2);
      return TEX.make(c);
    },
    drywall(color = '#d8d2c2') {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 256, 256); TEX.grime(x, 256, 256, 0.045, 21, 3);
      return TEX.make(c);
    },
    paneling() { // 70s wood paneling, 1.2m per tile
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(31);
      x.fillStyle = '#6b4a2e'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 256; i++) { x.fillStyle = `rgba(${40 + r() * 30},${20 + r() * 20},${8},${0.15 + r() * 0.2})`; x.fillRect(0, i, 256, 1); }
      for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(30,15,5,.25)'; x.beginPath(); const y0 = r() * 256; x.moveTo(0, y0); for (let xx = 0; xx < 256; xx += 16) x.lineTo(xx, y0 + Math.sin(xx / 30 + k) * 4); x.stroke(); }
      x.save(); x.translate(128, 128); x.rotate(Math.PI / 2); x.drawImage(c, -128, -128); x.restore();
      for (let g = 0; g < 4; g++) { x.fillStyle = 'rgba(20,10,4,.75)'; x.fillRect(g * 64, 0, 2, 256); x.fillStyle = 'rgba(255,220,180,.08)'; x.fillRect(g * 64 + 2, 0, 1, 256); }
      TEX.grime(x, 256, 256, 0.06, 32);
      return TEX.make(c);
    },
    acoustic() { // studio acoustic panels
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(41);
      x.fillStyle = '#3d4552'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 7000; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.06)'; x.fillRect(r() * 256, r() * 256, 1, 1); }
      x.strokeStyle = 'rgba(15,18,24,.9)'; x.lineWidth = 3;
      for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(256, i * 128); x.stroke(); }
      return TEX.make(c);
    },
    ceiling() { // drop ceiling tiles
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(51);
      x.fillStyle = '#d9d5c9'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 2500; k++) { x.fillStyle = 'rgba(90,85,75,.35)'; const s = r() * 2; x.fillRect(r() * 256, r() * 256, s, s); }
      x.fillStyle = '#a9a69c'; x.fillRect(0, 0, 256, 5); x.fillRect(0, 0, 5, 256);
      // water stain
      const g = x.createRadialGradient(170, 150, 4, 170, 150, 50); g.addColorStop(0, 'rgba(140,110,60,.25)'); g.addColorStop(0.8, 'rgba(140,110,60,.1)'); g.addColorStop(1, 'rgba(140,110,60,0)');
      x.fillStyle = g; x.fillRect(110, 90, 120, 120);
      return TEX.make(c);
    },
    concrete(tone = 128) {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = `rgb(${tone},${tone - 2},${tone - 6})`; x.fillRect(0, 0, 256, 256); TEX.grime(x, 256, 256, 0.16, 61, 1.2);
      const r = U.seeded(62); x.strokeStyle = 'rgba(40,40,40,.35)'; x.lineWidth = 1;
      for (let k = 0; k < 3; k++) { x.beginPath(); let px = r() * 256, py = r() * 256; x.moveTo(px, py); for (let s = 0; s < 8; s++) { px += (r() - 0.5) * 40; py += (r() - 0.3) * 30; x.lineTo(px, py); } x.stroke(); }
      return TEX.make(c);
    },
    cinder(color = '#a8a49a') {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 256, 256); TEX.grime(x, 256, 256, 0.12, 71);
      x.fillStyle = 'rgba(60,58,52,.6)';
      for (let row = 0; row < 4; row++) { x.fillRect(0, row * 64, 256, 4); const off = row % 2 ? 64 : 0; for (let k = -1; k < 3; k++) x.fillRect(off + k * 128, row * 64, 4, 64); }
      return TEX.make(c);
    },
    siding(color = '#c8c0a8') {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(0, i * 32, 0, i * 32 + 32); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.15, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); x.fillStyle = g; x.fillRect(0, i * 32, 256, 32); }
      TEX.grime(x, 256, 256, 0.08, 81, 2);
      // runoff stains
      const r = U.seeded(82); for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(60,50,30,.07)'; x.fillRect(r() * 256, 0, 3 + r() * 8, 256); }
      return TEX.make(c);
    },
    asphalt() {
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(91);
      x.fillStyle = '#2b2b2c'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 12000; k++) { const v = r(); x.fillStyle = v < 0.5 ? 'rgba(0,0,0,.35)' : `rgba(${150 + r() * 60},${150 + r() * 60},${150 + r() * 60},.18)`; x.fillRect(r() * 256, r() * 256, 1, 1); }
      TEX.grime(x, 256, 256, 0.1, 92, 2);
      x.strokeStyle = 'rgba(10,10,10,.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(20, 0); x.bezierCurveTo(60, 80, 10, 160, 50, 256); x.stroke();
      return TEX.make(c);
    },
    road() { // two-lane road, texture spans road width (u) and 8m (v)
      const c = TEX.canvas(256, 512), x = c.getContext('2d'); const r = U.seeded(93);
      x.fillStyle = '#29292a'; x.fillRect(0, 0, 256, 512);
      for (let k = 0; k < 16000; k++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.35)' : 'rgba(190,190,190,.12)'; x.fillRect(r() * 256, r() * 512, 1, 1); }
      TEX.grime(x, 256, 512, 0.08, 94, 2);
      // edge lines (white) and center (double yellow, worn)
      x.fillStyle = 'rgba(220,220,210,.7)'; x.fillRect(8, 0, 5, 512); x.fillRect(243, 0, 5, 512);
      x.fillStyle = 'rgba(210,170,40,.8)'; x.fillRect(122, 0, 4, 512); x.fillRect(130, 0, 4, 512);
      for (let k = 0; k < 60; k++) { x.fillStyle = 'rgba(41,41,42,.8)'; x.fillRect(110 + r() * 40, r() * 512, 10 + r() * 20, 2 + r() * 6); }
      // tire tracks
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(40, 0, 30, 512); x.fillRect(186, 0, 30, 512);
      return TEX.make(c);
    },
    gravel() {
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(101);
      x.fillStyle = '#6d665b'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 3000; k++) { const s = 1 + r() * 3; const v = 70 + r() * 90; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.beginPath(); x.ellipse(r() * 256, r() * 256, s, s * 0.7, r() * 3, 0, 7); x.fill(); }
      TEX.grime(x, 256, 256, 0.1, 102);
      return TEX.make(c);
    },
    grass() {
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(111);
      x.fillStyle = '#3a4228'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 7000; k++) { const v = r(); x.strokeStyle = v < 0.3 ? 'rgba(120,110,60,.5)' : v < 0.6 ? 'rgba(30,45,20,.6)' : 'rgba(80,95,50,.5)'; const px = r() * 256, py = r() * 256; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 4, py - 2 - r() * 5); x.stroke(); }
      TEX.grime(x, 256, 256, 0.1, 112, 2);
      return TEX.make(c);
    },
    forestFloor() {
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(121);
      x.fillStyle = '#2e2a22'; x.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 2500; k++) { const v = r(); x.strokeStyle = v < 0.4 ? 'rgba(96,74,48,.6)' : v < 0.7 ? 'rgba(60,50,36,.7)' : 'rgba(118,100,70,.5)'; x.lineWidth = 1; const px = r() * 256, py = r() * 256, a = r() * 6.28, l = 2 + r() * 6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
      for (let k = 0; k < 150; k++) { x.fillStyle = `rgba(${80 + r() * 40},${66 + r() * 30},${40},.45)`; x.beginPath(); x.ellipse(r() * 256, r() * 256, 2 + r() * 4, 1 + r() * 2, r() * 3, 0, 7); x.fill(); }
      for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(${40 + r() * 30},${55 + r() * 30},${35},.35)`; x.fillRect(r() * 256, r() * 256, 2 + r() * 3, 1 + r() * 2); }
      TEX.grime(x, 256, 256, 0.14, 122, 2);
      return TEX.make(c);
    },
    dirt() {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#4c4033'; x.fillRect(0, 0, 256, 256); TEX.grime(x, 256, 256, 0.2, 131, 1.5);
      const r = U.seeded(132); for (let k = 0; k < 800; k++) { const v = 80 + r() * 60; x.fillStyle = `rgb(${v},${v - 10},${v - 25})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
      return TEX.make(c);
    },
    bark() {
      const c = TEX.canvas(128, 256), x = c.getContext('2d'); const r = U.seeded(141);
      x.fillStyle = '#3a2c22'; x.fillRect(0, 0, 128, 256);
      for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(${20 + r() * 20},${12 + r() * 10},${8},.6)`; const px = r() * 128; x.fillRect(px, 0, 2 + r() * 4, 256); }
      for (let k = 0; k < 200; k++) { x.fillStyle = 'rgba(90,75,60,.35)'; x.fillRect(r() * 128, r() * 256, 3 + r() * 6, 1 + r() * 3); }
      return TEX.make(c);
    },
    pine() { // foliage (used on cone geometry)
      const c = TEX.canvas(128, 128), x = c.getContext('2d'); const r = U.seeded(151);
      x.fillStyle = '#18241a'; x.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 1500; k++) { const v = r(); x.strokeStyle = v < 0.5 ? 'rgba(40,62,40,.8)' : 'rgba(10,16,10,.8)'; const px = r() * 128, py = r() * 128; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py + 3 + r() * 5); x.stroke(); }
      return TEX.make(c);
    },
    metal(color = '#8a8d90') {
      const c = TEX.canvas(128, 128), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 128, 128); TEX.grime(x, 128, 128, 0.08, 161, 0.8);
      const r = U.seeded(162); for (let k = 0; k < 200; k++) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(0, r() * 128, 128, 1); }
      return TEX.make(c);
    },
    corrugated(color = '#7d8186') {
      const c = TEX.canvas(128, 128), x = c.getContext('2d');
      for (let i = 0; i < 128; i++) { const s = Math.sin(i / 128 * Math.PI * 8); const v = 0.8 + s * 0.2; x.fillStyle = `rgba(${parseInt(color.substr(1, 2), 16) * v | 0},${parseInt(color.substr(3, 2), 16) * v | 0},${parseInt(color.substr(5, 2), 16) * v | 0},1)`; x.fillRect(i, 0, 1, 128); }
      TEX.grime(x, 128, 128, 0.1, 171);
      const r = U.seeded(172); for (let k = 0; k < 10; k++) { x.fillStyle = 'rgba(120,60,20,.15)'; x.fillRect(r() * 128, r() * 128, 4 + r() * 10, 10 + r() * 40); }
      return TEX.make(c);
    },
    woodDoor(color = '#7a5536') {
      const c = TEX.canvas(128, 256), x = c.getContext('2d'); const r = U.seeded(181);
      x.fillStyle = color; x.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 128; i++) { x.fillStyle = `rgba(30,15,5,${0.05 + r() * 0.12})`; x.fillRect(i, 0, 1, 256); }
      TEX.grime(x, 128, 256, 0.05, 182);
      return TEX.make(c);
    },
    paintedDoor(color = '#5a6e58') {
      const c = TEX.canvas(128, 256), x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 128, 256); TEX.grime(x, 128, 256, 0.06, 191);
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; x.strokeRect(14, 16, 100, 100); x.strokeRect(14, 136, 100, 104);
      x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(90, 120, 30, 30); // grime around handle
      return TEX.make(c);
    },
    sky() { // night sky dome gradient + stars
      const c = TEX.canvas(512, 256), x = c.getContext('2d'); const r = U.seeded(201);
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#02030a'); g.addColorStop(0.6, '#070a16'); g.addColorStop(1, '#141a26');
      x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      void r;
      return TEX.make(c, { clamp: true });
    },
    face(skin = '#d9a988', o = {}) { // simple painted face for NPC heads (front-facing)
      const c = TEX.canvas(128, 128), x = c.getContext('2d');
      x.fillStyle = skin; x.fillRect(0, 0, 128, 128);
      TEX.grime(x, 128, 128, 0.04, 211);
      const eyeY = 54, col = o.eye || '#2a2018';
      // brows
      x.fillStyle = o.brow || 'rgba(50,35,25,.75)'; x.fillRect(38, eyeY - 12, 20, 3); x.fillRect(70, eyeY - 12, 20, 3);
      // eyes
      x.fillStyle = '#eee9e0'; x.beginPath(); x.ellipse(48, eyeY, 7, 3.5, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(80, eyeY, 7, 3.5, 0, 0, 7); x.fill();
      x.fillStyle = col; x.beginPath(); x.arc(48, eyeY, 3, 0, 7); x.fill(); x.beginPath(); x.arc(80, eyeY, 3, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(40, eyeY - 6, 16, 2); x.fillRect(72, eyeY - 6, 16, 2);
      // nose
      x.fillStyle = 'rgba(120,70,50,.35)'; x.fillRect(62, eyeY + 6, 4, 18); x.fillRect(58, eyeY + 22, 12, 3);
      // mouth
      x.fillStyle = o.lip || 'rgba(140,70,60,.8)'; x.fillRect(53, eyeY + 33, 22, 3);
      if (o.mustache) { x.fillStyle = o.mustache; x.fillRect(48, eyeY + 27, 32, 6); }
      if (o.stubble) { x.fillStyle = 'rgba(60,50,45,.25)'; x.fillRect(36, eyeY + 25, 56, 30); }
      if (o.glasses) { x.strokeStyle = '#222'; x.lineWidth = 2; x.strokeRect(38, eyeY - 7, 20, 14); x.strokeRect(70, eyeY - 7, 20, 14); x.beginPath(); x.moveTo(58, eyeY); x.lineTo(70, eyeY); x.stroke(); }
      if (o.makeup) { x.fillStyle = 'rgba(200,90,90,.12)'; x.beginPath(); x.arc(40, eyeY + 20, 9, 0, 7); x.arc(88, eyeY + 20, 9, 0, 7); x.fill(); }
      if (o.bruise) { x.fillStyle = 'rgba(90,40,70,.35)'; x.beginPath(); x.arc(84, eyeY + 4, 12, 0, 7); x.fill(); x.fillStyle = 'rgba(120,20,20,.6)'; x.fillRect(64, eyeY + 25, 3, 12); }
      return TEX.make(c, { clamp: true });
    },
    // ---- labeled / signage ----
    sign(text, o = {}) {
      const w = o.w || 512, h = o.h || 128;
      const c = TEX.canvas(w, h), x = c.getContext('2d');
      x.fillStyle = o.bg || '#f2efe6'; x.fillRect(0, 0, w, h);
      if (o.border) { x.strokeStyle = o.border; x.lineWidth = o.bw || 8; x.strokeRect(o.bw / 2 || 4, o.bw / 2 || 4, w - (o.bw || 8), h - (o.bw || 8)); }
      x.fillStyle = o.fg || '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = String(text).split('\n');
      const fs = o.size || Math.floor(h / (lines.length + 0.6));
      x.font = `${o.weight || 'bold'} ${fs}px ${o.font || 'Arial, Helvetica, sans-serif'}`;
      lines.forEach((ln, i) => x.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.05));
      if (o.grime !== false) TEX.grime(x, w, h, o.grimeAmt || 0.05, 221);
      return TEX.make(c, { clamp: true });
    },
    paper(lines, o = {}) { // small paper notes on walls (illegible at distance, readable when inspected)
      const w = o.w || 128, h = o.h || 160;
      const c = TEX.canvas(w, h), x = c.getContext('2d');
      x.fillStyle = o.bg || '#efe9d8'; x.fillRect(0, 0, w, h);
      x.fillStyle = o.fg || '#333'; x.font = `${o.fs || 10}px ${o.font || 'Courier New, monospace'}`;
      (lines || []).forEach((ln, i) => x.fillText(ln, 8, 16 + i * (o.fs || 10) * 1.3));
      if (o.title) { x.font = `bold ${o.tfs || 16}px Arial`; x.fillStyle = o.tcol || '#111'; x.textAlign = 'center'; x.fillText(o.title, w / 2, o.ty || 22); }
      if (o.photo) { x.fillStyle = '#555'; x.fillRect(w * 0.2, 34, w * 0.6, h * 0.35); x.fillStyle = '#888'; x.beginPath(); x.arc(w / 2, 34 + h * 0.13, h * 0.08, 0, 7); x.fill(); x.fillRect(w * 0.35, 34 + h * 0.22, w * 0.3, h * 0.13); }
      TEX.grime(x, w, h, 0.05, 231);
      return TEX.make(c, { clamp: true });
    },
    cdSpines(seed = 1) { // a row of CD jewel case spines
      const c = TEX.canvas(512, 64), x = c.getContext('2d'); const r = U.seeded(seed);
      x.fillStyle = '#111'; x.fillRect(0, 0, 512, 64);
      let px = 0;
      while (px < 512) { const w = 6 + Math.floor(r() * 2); const hue = Math.floor(r() * 360); const l = 20 + r() * 50; x.fillStyle = `hsl(${hue},${20 + r() * 50}%,${l}%)`; x.fillRect(px, 2, w - 1, 60); x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; for (let k = 0; k < 4; k++) x.fillRect(px + 2, 8 + r() * 46, w - 4, 2 + r() * 5); px += w; }
      return TEX.make(c);
    },
    lpSpines(seed = 2) {
      const c = TEX.canvas(512, 128), x = c.getContext('2d'); const r = U.seeded(seed);
      x.fillStyle = '#1a1612'; x.fillRect(0, 0, 512, 128);
      let px = 0;
      while (px < 512) { const w = 3 + Math.floor(r() * 3); x.fillStyle = `hsl(${Math.floor(r() * 360)},${10 + r() * 30}%,${15 + r() * 45}%)`; x.fillRect(px, 0, w - 0.5, 128); px += w; }
      TEX.grime(x, 512, 128, 0.08, 241);
      return TEX.make(c);
    },
    shelfGoods(seed = 3) { // gas station shelf products
      const c = TEX.canvas(256, 128), x = c.getContext('2d'); const r = U.seeded(seed);
      x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, 256, 128);
      let px = 2;
      while (px < 254) { const w = 14 + r() * 22, h = 40 + r() * 80; const hue = [0, 30, 50, 200, 120, 280, 10][Math.floor(r() * 7)]; x.fillStyle = `hsl(${hue},${55 + r() * 35}%,${35 + r() * 25}%)`; x.fillRect(px, 128 - h, w - 2, h); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(px + 2, 128 - h + 6, w - 6, 6); x.fillStyle = 'rgba(255,240,120,.7)'; x.beginPath(); x.arc(px + w / 2, 128 - h * 0.45, w * 0.25, 0, 7); x.fill(); px += w; }
      return TEX.make(c);
    },
    cooler(seed = 4) { // drinks behind cooler glass
      const c = TEX.canvas(256, 256), x = c.getContext('2d'); const r = U.seeded(seed);
      x.fillStyle = '#d8e4ea'; x.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 5; row++) { x.fillStyle = '#999'; x.fillRect(0, row * 51 + 48, 256, 3); for (let k = 0; k < 11; k++) { const hue = [0, 210, 120, 45, 280, 15][Math.floor(r() * 6)]; x.fillStyle = `hsl(${hue},70%,${35 + r() * 20}%)`; x.fillRect(4 + k * 23, row * 51 + 12, 18, 36); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(6 + k * 23, row * 51 + 24, 14, 8); } }
      return TEX.make(c);
    },
    vending() {
      const c = TEX.canvas(256, 512), x = c.getContext('2d'); const r = U.seeded(251);
      x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, 256, 512);
      x.fillStyle = '#26303a'; x.fillRect(12, 12, 170, 380);
      for (let row = 0; row < 6; row++) { x.fillStyle = '#555'; x.fillRect(12, 70 + row * 60, 170, 3); for (let k = 0; k < 5; k++) { x.fillStyle = `hsl(${Math.floor(r() * 360)},60%,45%)`; x.fillRect(18 + k * 33, 30 + row * 60, 26, 38); x.fillStyle = '#ddd'; x.font = '9px Arial'; x.fillText(`${String.fromCharCode(65 + row)}${k + 1}`, 24 + k * 33, 80 + row * 60); } }
      x.fillStyle = '#333'; x.fillRect(192, 40, 52, 300); x.fillStyle = '#0c3'; x.fillRect(198, 50, 40, 18); x.fillStyle = '#888'; for (let k = 0; k < 12; k++) x.fillRect(200 + (k % 3) * 13, 90 + Math.floor(k / 3) * 22, 10, 16);
      x.fillStyle = '#222'; x.fillRect(200, 200, 36, 6); x.fillStyle = '#111'; x.fillRect(30, 420, 140, 60);
      x.fillStyle = '#c22'; x.font = 'bold 22px Arial'; x.fillText('SNACKS', 50, 505);
      return TEX.make(c, { clamp: true });
    },
    rack(seed = 5, label = '') { // equipment rack front
      const c = TEX.canvas(128, 512), x = c.getContext('2d'); const r = U.seeded(seed);
      x.fillStyle = '#16181b'; x.fillRect(0, 0, 128, 512);
      let y = 8;
      while (y < 500) { const u = [1, 1, 2, 2, 3, 4][Math.floor(r() * 6)]; const h = u * 17; const shade = 30 + r() * 50; x.fillStyle = `rgb(${shade},${shade},${shade + 4})`; x.fillRect(6, y, 116, h - 2);
        x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(6, y, 116, 1);
        for (let k = 0; k < 1 + r() * 5; k++) { x.fillStyle = r() < 0.6 ? '#3f6' : (r() < 0.5 ? '#fc3' : '#f43'); x.fillRect(12 + r() * 100, y + 4 + r() * (h - 10), 3, 3); }
        if (r() < 0.4) { x.fillStyle = '#0a0'; x.fillRect(60, y + 4, 40, Math.min(10, h - 8)); }
        x.fillStyle = '#888'; x.beginPath(); x.arc(10, y + h / 2, 1.5, 0, 7); x.arc(118, y + h / 2, 1.5, 0, 7); x.fill();
        y += h; }
      if (label) { x.fillStyle = '#ddd'; x.font = 'bold 11px Arial'; x.fillText(label, 8, 506); }
      return TEX.make(c, { clamp: true });
    },
    board() { // radio mixing console surface
      const c = TEX.canvas(512, 256), x = c.getContext('2d'); const r = U.seeded(261);
      x.fillStyle = '#2c2e33'; x.fillRect(0, 0, 512, 256);
      for (let ch = 0; ch < 12; ch++) {
        const px = 14 + ch * 41;
        x.fillStyle = '#1b1c20'; x.fillRect(px, 10, 34, 236);
        for (let k = 0; k < 4; k++) { x.fillStyle = '#555'; x.beginPath(); x.arc(px + 17, 26 + k * 24, 8, 0, 7); x.fill(); x.fillStyle = '#ddd'; x.fillRect(px + 16, 18 + k * 24, 2, 7); }
        x.fillStyle = ['#c33', '#3a3', '#ddd', '#36c'][ch % 4]; x.fillRect(px + 6, 118, 22, 12);
        x.fillStyle = '#0a0a0a'; x.fillRect(px + 15, 140, 4, 96);
        const fy = 150 + r() * 60; x.fillStyle = '#aaa'; x.fillRect(px + 6, fy, 22, 12); x.fillStyle = '#fff'; x.fillRect(px + 6, fy + 5, 22, 2);
        x.fillStyle = '#ccc'; x.font = '9px Arial'; x.fillText(['MIC 1', 'MIC 2', 'CD 1', 'CD 2', 'TT', 'AUTO', 'PHONE', 'CART', 'AUX', 'TAPE', 'NET', 'PGM'][ch], px + 3, 252);
      }
      return TEX.make(c, { clamp: true });
    },
    keyboard() {
      const c = TEX.canvas(256, 96), x = c.getContext('2d');
      x.fillStyle = '#c9c4b5'; x.fillRect(0, 0, 256, 96);
      for (let row = 0; row < 5; row++) for (let k = 0; k < 15; k++) { x.fillStyle = '#e6e1d3'; x.fillRect(6 + k * 16.4, 8 + row * 17, 14, 14); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(6 + k * 16.4, 20 + row * 17, 14, 2); }
      TEX.grime(x, 256, 96, 0.08, 271);
      return TEX.make(c, { clamp: true });
    },
    meterPanel(title = 'TRANSMITTER') {
      const c = TEX.canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#5f6a64'; x.fillRect(0, 0, 256, 256); TEX.grime(x, 256, 256, 0.07, 281);
      x.fillStyle = '#ddd'; x.font = 'bold 14px Arial'; x.fillText(title, 10, 20);
      const labels = ['PLATE V', 'PLATE I', 'FWD PWR', 'REFL PWR'];
      for (let k = 0; k < 4; k++) { const px = 12 + (k % 2) * 122, py = 34 + Math.floor(k / 2) * 98; x.fillStyle = '#f4f0e0'; x.fillRect(px, py, 110, 76); x.strokeStyle = '#222'; x.strokeRect(px, py, 110, 76); x.beginPath(); x.arc(px + 55, py + 70, 50, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); x.fillStyle = '#111'; x.font = '10px Arial'; x.fillText(labels[k], px + 30, py + 72); }
      return TEX.make(c, { clamp: true });
    },
    poster(title, sub, hue = 20) {
      const c = TEX.canvas(192, 256), x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, `hsl(${hue},60%,30%)`); g.addColorStop(1, `hsl(${hue + 40},50%,12%)`);
      x.fillStyle = g; x.fillRect(0, 0, 192, 256);
      x.fillStyle = `hsla(${hue + 180},60%,70%,.5)`; x.beginPath(); x.arc(96, 110, 50, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 22px Impact, Arial'; x.textAlign = 'center'; x.fillText(title, 96, 200);
      x.font = '12px Arial'; x.fillText(sub || '', 96, 222);
      TEX.grime(x, 192, 256, 0.08, 291);
      return TEX.make(c, { clamp: true });
    },
    window(night = true) {
      const c = TEX.canvas(64, 64), x = c.getContext('2d');
      x.fillStyle = night ? '#05070c' : '#9bb'; x.fillRect(0, 0, 64, 64);
      return TEX.make(c, { clamp: true });
    },
    gauge() { // car instrument cluster
      const c = TEX.canvas(512, 160), x = c.getContext('2d');
      x.fillStyle = '#050505'; x.fillRect(0, 0, 512, 160);
      const dial = (cx, label, max, step) => { x.strokeStyle = '#7ae0b0'; x.lineWidth = 2; x.beginPath(); x.arc(cx, 90, 62, Math.PI * 0.8, Math.PI * 2.2); x.stroke();
        x.fillStyle = '#7ae0b0'; x.font = '12px Arial'; x.textAlign = 'center';
        for (let v = 0; v <= max; v += step) { const a = Math.PI * 0.8 + (v / max) * Math.PI * 1.4; x.fillText(String(v), cx + Math.cos(a) * 48, 94 + Math.sin(a) * 48); }
        x.fillText(label, cx, 140); };
      dial(130, 'MPH', 100, 20); dial(382, 'RPM x1000', 6, 1);
      x.fillStyle = '#7ae0b0'; x.font = '11px Arial'; x.fillText('E      F', 256, 130); x.fillText('FUEL', 256, 146);
      return TEX.make(c, { clamp: true });
    },
    tarp() { const c = TEX.canvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#2f4b6a'; x.fillRect(0, 0, 128, 128); TEX.grime(x, 128, 128, 0.2, 301, 0.6); return TEX.make(c); },
    chainlink() {
      const c = TEX.canvas(64, 64), x = c.getContext('2d');
      x.clearRect(0, 0, 64, 64); x.strokeStyle = 'rgba(170,175,180,1)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke();
      const t = TEX.make(c); return t;
    },
  },

  // derive a tangent-space normal map from a texture's luminance (cached)
  normals: {},
  normalFrom(tex, key, strength = 1) {
    const k = key + strength;
    if (this.normals[k]) return this.normals[k];
    const img = tex.image; const w = img.width, h = img.height;
    const c = this.canvas(w, h), x = c.getContext('2d');
    const src = img.getContext ? img.getContext('2d').getImageData(0, 0, w, h).data : null;
    if (!src) return null;
    const hgt = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) hgt[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
    // light blur so pixel noise doesn't dominate
    const hb = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { let sum = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += hgt[((y + dy + h) % h) * w + ((xx + dx + w) % w)]; hb[y * w + xx] = sum / 9; }
    const out = x.createImageData(w, h), d = out.data;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const L = hb[y * w + (xx - 1 + w) % w], R = hb[y * w + (xx + 1) % w], T = hb[((y - 1 + h) % h) * w + xx], Bt = hb[((y + 1) % h) * w + xx];
      let nx = (L - R) * strength * 4, ny = (Bt - T) * strength * 4, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + xx) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    x.putImageData(out, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = this.maxAniso;
    this.normals[k] = t;
    return t;
  },
  // dynamic canvas texture with redraw function
  dynamic(w, h, draw) {
    const c = TEX.canvas(w, h), ctx = c.getContext('2d');
    const t = TEX.make(c, { clamp: true });
    const obj = { canvas: c, ctx, tex: t, draw, redraw(...a) { draw(ctx, w, h, ...a); t.needsUpdate = true; } };
    obj.redraw();
    return obj;
  },
};
