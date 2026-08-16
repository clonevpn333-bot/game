/* 20_materials.js — procedural textures & PBR materials. Everything computed at runtime.
 * OWNER: main. Art bible: wet, dense, lived-in. Light comes from sources, never ambient wash.
 */
VH.Mat = (function () {
  const U = VH.util;
  const cache = {};
  const texCache = {};
  const stdMats = [];
  let renderer = null;
  let aniso = 4;

  /* ------------------------------------------------------------------ palette */
  const palette = {
    /* structure */
    asphalt: 0x0a0c0e, concrete: 0x2b2f33, concreteDark: 0x171b1e,
    metal: 0x32383d, rust: 0x6b3a22, glass: 0x05080b,
    /* light sources — the only saturated things in the frame */
    cyan: 0x00e5ff, magenta: 0xff2d6f, amber: 0xffb340,
    green: 0x7cff5a, red: 0xff3320, warmWhite: 0xffd9a8, coldWhite: 0xbfe4ff,
    /* faction accents */
    sable: 0x00e5ff, ninefold: 0xff2d6f, civic: 0xffb340, medical: 0x7cff5a,
    /* atmosphere */
    fog: 0x0e1a22, water: 0x060d12, skyLow: 0x121c26, skyHigh: 0x04070a,
  };

  /* ------------------------------------------------------------- canvas utils */
  function cvs(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function canvasTex(w, h, draw, repeat, opts) {
    const c = cvs(w, h);
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = aniso;
    if (opts && opts.srgb) t.encoding = THREE.sRGBEncoding;
    t.needsUpdate = true;
    t._canvas = c;
    return t;
  }

  /* Height field -> tangent-space normal map. The single most valuable helper here:
   * almost every surface reads as plastic until it has a normal map. */
  function heightToNormal(srcCanvas, strength, repeat) {
    const w = srcCanvas.width, h = srcCanvas.height;
    const sg = srcCanvas.getContext('2d');
    const src = sg.getImageData(0, 0, w, h).data;
    const out = new Uint8Array(w * h * 4);
    const s = strength === undefined ? 2.0 : strength;
    const at = (x, y) => {
      x = (x + w) % w; y = (y + h) % h;
      const i = (y * w + x) * 4;
      return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (at(x - 1, y) - at(x + 1, y)) * s;
        const dy = (at(x, y - 1) - at(x, y + 1)) * s;
        let nx = dx, ny = dy, nz = 1.0;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        const i = (y * w + x) * 4;
        out[i] = (nx * 0.5 + 0.5) * 255;
        out[i + 1] = (ny * 0.5 + 0.5) * 255;
        out[i + 2] = (nz * 0.5 + 0.5) * 255;
        out[i + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  }

  /* Pack a grayscale canvas into the green channel (roughness) / blue (metalness)
   * of an RGB texture, matching three's aoMap/roughnessMap/metalnessMap convention. */
  function packORM(aoC, roughC, metalC) {
    const w = roughC.width, h = roughC.height;
    const rd = c => c ? c.getContext('2d').getImageData(0, 0, w, h).data : null;
    const A = rd(aoC), R = rd(roughC), M = rd(metalC);
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4;
      out[j] = A ? A[j] : 255;
      out[j + 1] = R ? R[j] : 200;
      out[j + 2] = M ? M[j] : 0;
      out[j + 3] = 255;
    }
    const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  }

  /* deterministic per-texture rng so builds are reproducible */
  function noiseFill(g, w, h, amt, mono) {
    const img = g.getImageData(0, 0, w, h), d = img.data;
    const r = U.rng(12345);
    for (let i = 0; i < d.length; i += 4) {
      if (mono) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      else { d[i] += (r() - 0.5) * amt; d[i + 1] += (r() - 0.5) * amt; d[i + 2] += (r() - 0.5) * amt; }
    }
    g.putImageData(img, 0, 0);
  }

  /* fbm splotches — the workhorse for grime, wear, and puddle masks */
  function fbmField(g, w, h, o) {
    o = o || {};
    const scale = o.scale || 0.02, oct = o.oct || 5;
    const lo = o.lo === undefined ? 0 : o.lo, hi = o.hi === undefined ? 255 : o.hi;
    const ox = o.ox || 0, oy = o.oy || 0;
    const warp = o.warp || 0;
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sx = x * scale + ox, sy = y * scale + oy;
        if (warp) {
          sx += U.fbm(x * scale * 2.1, y * scale * 2.1, 3) * warp;
          sy += U.fbm(x * scale * 2.1 + 5.3, y * scale * 2.1 + 1.7, 3) * warp;
        }
        let v = U.fbm(sx, sy, oct) * 0.5 + 0.5;
        if (o.ridged) v = 1 - Math.abs(v * 2 - 1);
        if (o.pow) v = Math.pow(v, o.pow);
        const c = lo + v * (hi - lo);
        const i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  /* vertical grime streaks running DOWN from an edge — real buildings are dirtiest
   * under every horizontal ledge, and nothing says "real" faster than getting this right */
  function dripStreaks(g, w, h, o) {
    o = o || {};
    const r = U.rng(o.seed || 99);
    const n = o.count || 60;
    g.save();
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const top = o.fromTop ? 0 : r() * h * 0.6;
      const len = (o.len || 0.5) * h * (0.25 + r() * 0.9);
      const wid = 1 + r() * (o.width || 5);
      const a = (o.alpha || 0.16) * (0.35 + r() * 0.65);
      const grd = g.createLinearGradient(0, top, 0, top + len);
      grd.addColorStop(0, 'rgba(' + (o.col || '10,9,7') + ',' + a.toFixed(3) + ')');
      grd.addColorStop(0.25, 'rgba(' + (o.col || '10,9,7') + ',' + (a * 0.8).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(' + (o.col || '10,9,7') + ',0)');
      g.fillStyle = grd;
      g.fillRect(x, top, wid, len);
    }
    g.restore();
  }

  /* ------------------------------------------------------------------ surfaces */

  /* ---- WET ASPHALT: the hero surface. Aggregate + tyre polish + oil + puddles. */
  function asphaltMaps(wet) {
    const S = 1024;
    /* albedo */
    const alb = cvs(S, S);
    {
      const g = alb.getContext('2d');
      g.fillStyle = '#191c1f'; g.fillRect(0, 0, S, S);
      /* aggregate: thousands of small stones */
      const r = U.rng(4242);
      for (let i = 0; i < 14000; i++) {
        const x = r() * S, y = r() * S, rad = 0.6 + r() * 2.6;
        const v = 30 + r() * 56;
        g.fillStyle = 'rgba(' + v + ',' + (v + 2) + ',' + (v + 4) + ',' + (0.25 + r() * 0.5).toFixed(2) + ')';
        g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      }
      /* tyre polish lanes running along Z (v axis) */
      for (const lane of [0.22, 0.5, 0.78]) {
        const grd = g.createLinearGradient((lane - 0.09) * S, 0, (lane + 0.09) * S, 0);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.5, 'rgba(46,50,55,0.5)');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.fillRect((lane - 0.09) * S, 0, 0.18 * S, S);
      }
      /* patched repairs: darker rectangles with ragged edges */
      for (let i = 0; i < 7; i++) {
        const x = r() * S, y = r() * S, pw = 60 + r() * 200, ph = 40 + r() * 160;
        g.fillStyle = 'rgba(30,33,36,' + (0.35 + r() * 0.4).toFixed(2) + ')';
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 10; k++) {
          const t = k / 10 * 6.2832;
          g.lineTo(x + Math.cos(t) * pw * (0.4 + r() * 0.2), y + Math.sin(t) * ph * (0.4 + r() * 0.2));
        }
        g.closePath(); g.fill();
      }
      /* cracks */
      g.strokeStyle = 'rgba(20,22,24,0.75)';
      for (let i = 0; i < 26; i++) {
        g.lineWidth = 0.6 + r() * 1.8;
        g.beginPath();
        let x = r() * S, y = r() * S, a = r() * 6.2832;
        g.moveTo(x, y);
        for (let k = 0; k < 14; k++) {
          a += (r() - 0.5) * 1.1;
          x += Math.cos(a) * (6 + r() * 22); y += Math.sin(a) * (6 + r() * 22);
          g.lineTo(x, y);
        }
        g.stroke();
      }
      /* worn lane markings — broken, dirty, never bright white */
      g.save();
      g.globalAlpha = 0.5;
      for (const lane of [0.36, 0.64]) {
        for (let y = 0; y < S; y += 150) {
          const wear = 0.25 + U.fbm(lane * 8, y * 0.01, 3) * 0.5;
          g.fillStyle = 'rgba(150,140,118,' + wear.toFixed(2) + ')';
          g.fillRect(lane * S - 5, y, 10, 84);
        }
      }
      g.restore();
      noiseFill(g, S, S, 14, true);
    }

    /* height (for normal): aggregate bumps + cracks, plus puddle depressions */
    const hgt = cvs(512, 512);
    {
      const g = hgt.getContext('2d');
      fbmField(g, 512, 512, { scale: 0.09, oct: 5, lo: 100, hi: 165 });
      const r = U.rng(777);
      for (let i = 0; i < 5000; i++) {
        const x = r() * 512, y = r() * 512, rad = 0.6 + r() * 2.0;
        const v = 150 + r() * 80;
        g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.5)';
        g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      }
      /* cracks are LOW */
      g.strokeStyle = 'rgba(40,40,40,0.9)';
      for (let i = 0; i < 22; i++) {
        g.lineWidth = 0.8 + r() * 1.6;
        g.beginPath();
        let x = r() * 512, y = r() * 512, a = r() * 6.2832;
        g.moveTo(x, y);
        for (let k = 0; k < 12; k++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (5 + r() * 16); y += Math.sin(a) * (5 + r() * 16); g.lineTo(x, y); }
        g.stroke();
      }
    }

    /* roughness: this is where wetness lives.
     * dry asphalt ~0.82; puddles ~0.06 (near mirror). Soft edges. */
    const rgh = cvs(512, 512);
    {
      const g = rgh.getContext('2d');
      /* base variation */
      fbmField(g, 512, 512, { scale: 0.014, oct: 4, lo: 175, hi: 225 });
      if (wet) {
        /* puddle mask: large low-frequency blobs, thresholded with a soft edge,
         * biased to where the height field is low */
        const img = g.getImageData(0, 0, 512, 512), d = img.data;
        const hg = hgt.getContext('2d').getImageData(0, 0, 512, 512).data;
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 512; x++) {
            const i = (y * 512 + x) * 4;
            let p = U.fbm(x * 0.0075 + 11.3, y * 0.0075 + 4.1, 4) * 0.5 + 0.5;
            /* low ground collects water */
            const lowness = 1 - hg[i] / 255;
            p = p * 0.72 + lowness * 0.45;
            const puddle = U.smoothstep(0.52, 0.68, p);
            /* thin wet film everywhere, deep mirror in the puddles */
            const dry = d[i] / 255;
            const rough = U.lerp(dry * 0.72, 0.045, puddle);
            d[i] = d[i + 1] = d[i + 2] = rough * 255;
          }
        }
        g.putImageData(img, 0, 0);
      }
    }

    /* metalness: wet asphalt gets a touch of specular lift in puddles.
     * We fake water's fresnel by raising metalness slightly where roughness is low. */
    const met = cvs(512, 512);
    {
      const g = met.getContext('2d');
      const rd = rgh.getContext('2d').getImageData(0, 0, 512, 512).data;
      const img = g.createImageData(512, 512), d = img.data;
      for (let i = 0; i < 512 * 512; i++) {
        const j = i * 4;
        const rough = rd[j] / 255;
        const m = wet ? U.smoothstep(0.35, 0.06, rough) * 0.42 : 0.02;
        d[j] = d[j + 1] = d[j + 2] = m * 255; d[j + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }

    return { alb, hgt, rgh, met };
  }

  /* ---- CONCRETE: formwork lines, cold joints, rust bleed, downward staining */
  function concreteMaps(dark) {
    const S = 512;
    const alb = cvs(S, S);
    {
      const g = alb.getContext('2d');
      const base = dark ? '#2d3236' : '#454b50';
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      /* mottling */
      const tmp = cvs(S, S);
      fbmField(tmp.getContext('2d'), S, S, { scale: 0.02, oct: 5, lo: 0, hi: 255 });
      g.save(); g.globalAlpha = 0.24; g.globalCompositeOperation = 'overlay';
      g.drawImage(tmp, 0, 0); g.restore();
      /* formwork board lines: horizontal seams every ~1/6 with slight offset */
      const r = U.rng(31);
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      for (let i = 1; i < 6; i++) {
        const y = i * S / 6 + (r() - 0.5) * 4;
        g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.045)';
        g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 1.6); g.lineTo(S, y + 1.6); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.35)';
      }
      /* tie-rod holes */
      for (let i = 0; i < 26; i++) {
        const x = r() * S, y = r() * S;
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.beginPath(); g.arc(x, y, 2.2 + r() * 1.4, 0, 6.2832); g.fill();
        /* rust bleed below the hole */
        const grd = g.createLinearGradient(0, y, 0, y + 40);
        grd.addColorStop(0, 'rgba(120,62,30,0.34)');
        grd.addColorStop(1, 'rgba(120,62,30,0)');
        g.fillStyle = grd; g.fillRect(x - 2.5, y, 5, 40);
      }
      /* spalling: patches where the surface has broken away */
      for (let i = 0; i < 9; i++) {
        const x = r() * S, y = r() * S, rad = 8 + r() * 26;
        g.fillStyle = 'rgba(58,54,48,' + (0.3 + r() * 0.35).toFixed(2) + ')';
        g.beginPath();
        for (let k = 0; k <= 9; k++) { const t = k / 9 * 6.2832; const rr = rad * (0.6 + r() * 0.6); g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); }
        g.closePath(); g.fill();
      }
      /* the important part: dirt running DOWN */
      dripStreaks(g, S, S, { count: 90, alpha: 0.2, width: 7, len: 0.55, col: '8,8,7', seed: 5 });
      /* salt bloom — this is a coastal city eating itself */
      for (let i = 0; i < 40; i++) {
        const x = r() * S, y = r() * S, rad = 4 + r() * 22;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(196,200,196,0.14)');
        grd.addColorStop(1, 'rgba(196,200,196,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      }
      noiseFill(g, S, S, 12, true);
    }
    const hgt = cvs(S, S);
    {
      const g = hgt.getContext('2d');
      fbmField(g, S, S, { scale: 0.05, oct: 5, lo: 110, hi: 150 });
      const r = U.rng(31);
      g.strokeStyle = 'rgba(60,60,60,0.9)';
      for (let i = 1; i < 6; i++) { const y = i * S / 6 + (r() - 0.5) * 4; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
      for (let i = 0; i < 26; i++) { const x = r() * S, y = r() * S; g.fillStyle = 'rgba(50,50,50,0.9)'; g.beginPath(); g.arc(x, y, 2.4, 0, 6.2832); g.fill(); }
    }
    const rgh = cvs(S, S);
    fbmField(rgh.getContext('2d'), S, S, { scale: 0.03, oct: 4, lo: 190, hi: 240 });
    return { alb, hgt, rgh };
  }

  /* ---- METAL PANELS: panel grid, rivets, weld seams, edge wear, seam rust */
  function metalMaps(rusty) {
    const S = 512;
    const alb = cvs(S, S), hgt = cvs(S, S), rgh = cvs(S, S);
    const r = U.rng(rusty ? 808 : 202);
    {
      const g = alb.getContext('2d');
      g.fillStyle = rusty ? '#4d382a' : '#464e55'; g.fillRect(0, 0, S, S);
      const tmp = cvs(S, S);
      fbmField(tmp.getContext('2d'), S, S, { scale: 0.03, oct: 5, lo: 40, hi: 215 });
      g.save(); g.globalAlpha = 0.2; g.globalCompositeOperation = 'overlay'; g.drawImage(tmp, 0, 0); g.restore();
      /* panel grid with varied cell sizes */
      const cuts = [0, 0.28, 0.5, 0.77, 1];
      g.strokeStyle = 'rgba(0,0,0,0.62)'; g.lineWidth = 2.4;
      for (const c of cuts) {
        g.beginPath(); g.moveTo(c * S, 0); g.lineTo(c * S, S); g.stroke();
        g.beginPath(); g.moveTo(0, c * S); g.lineTo(S, c * S); g.stroke();
      }
      /* highlight on the lower/right side of each seam = a raised panel edge */
      g.strokeStyle = 'rgba(190,200,210,0.10)'; g.lineWidth = 1.2;
      for (const c of cuts) {
        g.beginPath(); g.moveTo(c * S + 2.5, 0); g.lineTo(c * S + 2.5, S); g.stroke();
        g.beginPath(); g.moveTo(0, c * S + 2.5); g.lineTo(S, c * S + 2.5); g.stroke();
      }
      /* rivets along every seam */
      for (const c of cuts) {
        for (let t = 8; t < S; t += 26) {
          for (const [x, y] of [[c * S, t], [t, c * S]]) {
            g.fillStyle = 'rgba(18,20,22,0.85)';
            g.beginPath(); g.arc(x, y, 2.4, 0, 6.2832); g.fill();
            g.fillStyle = 'rgba(210,218,226,0.16)';
            g.beginPath(); g.arc(x - 0.7, y - 0.7, 1.3, 0, 6.2832); g.fill();
          }
        }
      }
      if (rusty) {
        /* rust starts at seams and bleeds down */
        for (const c of cuts) {
          dripStreaks(g, S, S, { count: 26, alpha: 0.3, width: 6, len: 0.4, col: '128,58,24', seed: 9 + c * 40, fromTop: false });
          const grd = g.createLinearGradient(0, c * S, 0, c * S + 60);
          grd.addColorStop(0, 'rgba(122,56,24,0.42)');
          grd.addColorStop(1, 'rgba(122,56,24,0)');
          g.fillStyle = grd; g.fillRect(0, c * S, S, 60);
        }
        /* eaten-through patches */
        for (let i = 0; i < 20; i++) {
          const x = r() * S, y = r() * S, rad = 6 + r() * 30;
          const grd = g.createRadialGradient(x, y, 0, x, y, rad);
          grd.addColorStop(0, 'rgba(92,40,16,0.62)');
          grd.addColorStop(0.6, 'rgba(126,62,28,0.34)');
          grd.addColorStop(1, 'rgba(126,62,28,0)');
          g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
        }
      }
      noiseFill(g, S, S, 16, true);
    }
    {
      const g = hgt.getContext('2d');
      g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, S, S);
      const cuts = [0, 0.28, 0.5, 0.77, 1];
      g.strokeStyle = '#303030'; g.lineWidth = 3;
      for (const c of cuts) { g.beginPath(); g.moveTo(c * S, 0); g.lineTo(c * S, S); g.stroke(); g.beginPath(); g.moveTo(0, c * S); g.lineTo(S, c * S); g.stroke(); }
      for (const c of cuts) for (let t = 8; t < S; t += 26) for (const [x, y] of [[c * S, t], [t, c * S]]) { g.fillStyle = '#d8d8d8'; g.beginPath(); g.arc(x, y, 2.4, 0, 6.2832); g.fill(); }
    }
    {
      const g = rgh.getContext('2d');
      fbmField(g, S, S, { scale: 0.04, oct: 4, lo: rusty ? 190 : 90, hi: rusty ? 245 : 165 });
    }
    return { alb, hgt, rgh };
  }

  /* ---- LIT WINDOWS: the skyline's only light source. Irregular, varied warmth. */
  function windowTex(cols, rows, seed, opts) {
    opts = opts || {};
    const S = 512;
    return canvasTex(S, S, (g, w, h) => {
      const r = U.rng(seed || 11);
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          /* most windows are dark — a fully lit building looks fake */
          if (r() < (opts.darkChance === undefined ? 0.38 : opts.darkChance)) continue;
          const t = r();
          let col;
          if (t < 0.58) col = [255, 186, 112];       /* sodium/incandescent interior */
          else if (t < 0.84) col = [166, 214, 240];  /* cold fluorescent office */
          else if (t < 0.95) col = [120, 255, 160];  /* screen glow */
          else col = [255, 90, 130];                 /* something wrong in that room */
          const a = 0.30 + r() * 0.70;
          const px = x * cw, py = y * ch;
          const iw = cw * 0.62, ih = ch * 0.5;
          const ix = px + cw * 0.19, iy = py + ch * 0.26;
          g.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a.toFixed(2) + ')';
          g.fillRect(ix, iy, iw, ih);
          /* blinds / partial occlusion — this is what makes windows read as rooms */
          if (r() < 0.34) {
            g.fillStyle = 'rgba(0,0,0,0.62)';
            const bh = ih * (0.25 + r() * 0.6);
            g.fillRect(ix, iy, iw, bh);
          }
          if (r() < 0.2) {
            g.fillStyle = 'rgba(0,0,0,0.5)';
            g.fillRect(ix + iw * (0.2 + r() * 0.4), iy, iw * 0.16, ih);  /* someone standing */
          }
          /* hot core so bloom has something to grab */
          g.fillStyle = 'rgba(255,255,255,' + (a * 0.32).toFixed(2) + ')';
          g.fillRect(ix + iw * 0.2, iy + ih * 0.2, iw * 0.6, ih * 0.5);
        }
      }
    }, opts.repeat || [1, 1], { srgb: true });
  }

  /* ---- SIGNAGE: the storytelling workhorse. */
  const GLYPH_STACK = '"Helvetica Neue Condensed","Arial Narrow",Impact,"Haettenschweiler",sans-serif';

  function makeSign(text, o) {
    o = o || {};
    const vertical = !!o.vertical;
    const style = o.style || 'tube';            /* tube | matrix | backlit | painted */
    const col = o.color || palette.cyan;
    const decay = o.decay === undefined ? 0.25 : o.decay;
    const r = U.rng(o.seed || (text.length * 977 + 13));
    const cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
    const rgb = cr + ',' + cg + ',' + cb;

    const chars = String(text).split('');
    const W = vertical ? 128 : Math.max(128, Math.min(1024, 74 * chars.length));
    const H = vertical ? Math.max(128, Math.min(1024, 96 * chars.length)) : 128;

    return canvasTex(W, H, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);

      if (style === 'matrix') {
        /* LED dot matrix ticker */
        const dot = 5, gap = 2, step = dot + gap;
        g.font = '700 ' + Math.floor(h * 0.6) + 'px ' + GLYPH_STACK;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const tmp = cvs(w, h);
        const tg = tmp.getContext('2d');
        tg.fillStyle = '#fff'; tg.font = g.font; tg.textAlign = 'center'; tg.textBaseline = 'middle';
        tg.fillText(text, w / 2, h / 2);
        const d = tg.getImageData(0, 0, w, h).data;
        for (let y = 0; y < h; y += step) {
          for (let x = 0; x < w; x += step) {
            const i = ((y | 0) * w + (x | 0)) * 4;
            const on = d[i + 3] > 90;
            const a = on ? (r() < decay * 0.25 ? 0.15 : 0.95) : 0.045;
            g.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(2) + ')';
            g.fillRect(x, y, dot, dot);
          }
        }
        return;
      }

      if (style === 'painted') {
        /* painted-and-peeling wall logo — NOT emissive, used as an albedo decal */
        g.font = '700 ' + Math.floor((vertical ? w : h) * 0.62) + 'px ' + GLYPH_STACK;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(' + rgb + ',0.82)';
        if (vertical) {
          const per = h / chars.length;
          chars.forEach((c, i) => g.fillText(c, w / 2, per * (i + 0.5)));
        } else g.fillText(text, w / 2, h / 2);
        /* peel it */
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 260; i++) {
          const x = r() * w, y = r() * h, rad = 1 + r() * 9;
          g.fillStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.6).toFixed(2) + ')';
          g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        return;
      }

      /* tube / backlit: glow halo, then bright core, then tube ends */
      const fs = Math.floor((vertical ? w : h) * (vertical ? 0.74 : 0.62));
      g.font = '700 ' + fs + 'px ' + GLYPH_STACK;
      g.textAlign = 'center'; g.textBaseline = 'middle';

      if (style === 'backlit') {
        /* a lit panel with dark letterforms knocked out of it */
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, 'rgba(' + rgb + ',0.92)');
        grd.addColorStop(1, 'rgba(' + rgb + ',0.62)');
        g.fillStyle = grd; g.fillRect(4, 4, w - 8, h - 8);
        g.globalCompositeOperation = 'destination-out';
        if (vertical) { const per = h / chars.length; chars.forEach((c, i) => g.fillText(c, w / 2, per * (i + 0.5))); }
        else g.fillText(text, w / 2, h / 2);
        g.globalCompositeOperation = 'source-over';
        return;
      }

      /* neon tube: three passes — wide halo, tight halo, white-hot core */
      const draw = (alpha, blur, colStr, lw) => {
        g.save();
        g.shadowColor = 'rgba(' + rgb + ',' + alpha + ')';
        g.shadowBlur = blur;
        g.strokeStyle = colStr; g.lineWidth = lw; g.lineJoin = 'round';
        g.fillStyle = colStr;
        if (vertical) {
          const per = h / chars.length;
          chars.forEach((c, i) => {
            if (r() < decay * 0.18) return;              /* dead segment */
            g.strokeText(c, w / 2, per * (i + 0.5));
          });
        } else {
          g.strokeText(text, w / 2, h / 2);
        }
        g.restore();
      };
      draw(0.9, 34, 'rgba(' + rgb + ',0.30)', 13);
      draw(0.9, 16, 'rgba(' + rgb + ',0.75)', 7);
      draw(1.0, 7, 'rgba(255,255,255,0.95)', 2.6);
      /* tube end caps + mounting standoffs */
      g.fillStyle = 'rgba(40,44,48,0.9)';
      if (vertical) { g.fillRect(w * 0.5 - 2, 2, 4, 8); g.fillRect(w * 0.5 - 2, h - 10, 4, 8); }
      else { g.fillRect(4, h * 0.5 - 2, 8, 4); g.fillRect(w - 12, h * 0.5 - 2, 8, 4); }
    }, [1, 1], { srgb: true });
  }

  /* ---- SKIN / FABRIC / CHROME ------------------------------------------- */
  function skinTex(tone) {
    const tones = [[214, 168, 138], [178, 128, 98], [126, 86, 62], [88, 58, 42], [232, 192, 166]];
    const t = tones[(tone || 0) % tones.length];
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = 'rgb(' + t[0] + ',' + t[1] + ',' + t[2] + ')'; g.fillRect(0, 0, w, h);
      const tmp = cvs(w, h);
      fbmField(tmp.getContext('2d'), w, h, { scale: 0.06, oct: 5, lo: 90, hi: 175 });
      g.save(); g.globalAlpha = 0.28; g.globalCompositeOperation = 'overlay'; g.drawImage(tmp, 0, 0); g.restore();
      const r = U.rng(60 + (tone || 0));
      /* pores + blemishes */
      for (let i = 0; i < 2600; i++) {
        const x = r() * w, y = r() * h;
        g.fillStyle = 'rgba(' + (t[0] * 0.72 | 0) + ',' + (t[1] * 0.68 | 0) + ',' + (t[2] * 0.68 | 0) + ',' + (0.05 + r() * 0.14).toFixed(2) + ')';
        g.beginPath(); g.arc(x, y, 0.5 + r() * 1.3, 0, 6.2832); g.fill();
      }
      /* subsurface warmth in the thin areas */
      for (let i = 0; i < 20; i++) {
        const x = r() * w, y = r() * h, rad = 12 + r() * 40;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, 'rgba(198,86,74,0.10)');
        grd.addColorStop(1, 'rgba(198,86,74,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill();
      }
      noiseFill(g, w, h, 8, false);
    }, [1, 1], { srgb: true });
  }

  function fabricTex(base, seed) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base || '#14171a'; g.fillRect(0, 0, w, h);
      const r = U.rng(seed || 5);
      /* weave */
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = 'rgba(255,255,255,0.028)';
        g.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 2) {
        g.fillStyle = 'rgba(0,0,0,0.045)';
        g.fillRect(x, 0, 1, h);
      }
      const tmp = cvs(w, h);
      fbmField(tmp.getContext('2d'), w, h, { scale: 0.05, oct: 4, lo: 90, hi: 170 });
      g.save(); g.globalAlpha = 0.3; g.globalCompositeOperation = 'overlay'; g.drawImage(tmp, 0, 0); g.restore();
      /* wear at creases */
      for (let i = 0; i < 24; i++) {
        const x = r() * w, y = r() * h, len = 20 + r() * 90, a = r() * 6.2832;
        g.strokeStyle = 'rgba(190,190,185,0.05)'; g.lineWidth = 1 + r() * 2.4;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      }
      noiseFill(g, w, h, 10, true);
    }, [1, 1], { srgb: true });
  }

  /* ------------------------------------------------------------------ builders */
  function std(o) {
    const m = new THREE.MeshStandardMaterial(o);
    stdMats.push(m);
    return m;
  }

  function build(name) {
    switch (name) {

      case 'asphalt': case 'asphaltWet': {
        const wet = name === 'asphaltWet';
        const M = asphaltMaps(wet);
        const rep = [7, 7];
        const map = new THREE.CanvasTexture(M.alb);
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep[0], rep[1]);
        map.encoding = THREE.sRGBEncoding; map.anisotropy = aniso;
        const rgh = new THREE.CanvasTexture(M.rgh);
        rgh.wrapS = rgh.wrapT = THREE.RepeatWrapping; rgh.repeat.set(rep[0], rep[1]); rgh.anisotropy = aniso;
        const met = new THREE.CanvasTexture(M.met);
        met.wrapS = met.wrapT = THREE.RepeatWrapping; met.repeat.set(rep[0], rep[1]); met.anisotropy = aniso;
        const nrm = heightToNormal(M.hgt, wet ? 1.1 : 2.2, rep);
        return std({
          color: 0xffffff, map, roughnessMap: rgh, metalnessMap: met, normalMap: nrm,
          normalScale: new THREE.Vector2(wet ? 0.55 : 1.0, wet ? 0.55 : 1.0),
          roughness: 1.0, metalness: 1.0, envMapIntensity: wet ? 2.2 : 0.7,
        });
      }

      case 'concrete': case 'concreteStain': {
        const M = concreteMaps(name === 'concreteStain');
        const rep = [3, 3];
        const map = new THREE.CanvasTexture(M.alb);
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep[0], rep[1]);
        map.encoding = THREE.sRGBEncoding; map.anisotropy = aniso;
        const rgh = new THREE.CanvasTexture(M.rgh);
        rgh.wrapS = rgh.wrapT = THREE.RepeatWrapping; rgh.repeat.set(rep[0], rep[1]);
        return std({
          color: 0xffffff, map, roughnessMap: rgh, normalMap: heightToNormal(M.hgt, 1.6, rep),
          roughness: 1.0, metalness: 0.0, envMapIntensity: 0.5,
        });
      }

      case 'metalPanel': case 'metalRust': {
        const M = metalMaps(name === 'metalRust');
        const rep = [2, 2];
        const map = new THREE.CanvasTexture(M.alb);
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep[0], rep[1]);
        map.encoding = THREE.sRGBEncoding; map.anisotropy = aniso;
        const rgh = new THREE.CanvasTexture(M.rgh);
        rgh.wrapS = rgh.wrapT = THREE.RepeatWrapping; rgh.repeat.set(rep[0], rep[1]);
        return std({
          color: 0xffffff, map, roughnessMap: rgh, normalMap: heightToNormal(M.hgt, 1.9, rep),
          roughness: 1.0, metalness: name === 'metalRust' ? 0.35 : 0.85, envMapIntensity: 1.4,
        });
      }

      case 'glassDark':
        return std({ color: 0x05080b, roughness: 0.08, metalness: 0.55, envMapIntensity: 2.4 });

      case 'glassLit': {
        const t = windowTex(9, 14, 21);
        return new THREE.MeshBasicMaterial({ map: t, color: 0xffffff, toneMapped: true });
      }

      case 'trimLit':
        return new THREE.MeshBasicMaterial({ color: 0x9fe8ff, toneMapped: true });

      case 'neonCyan': return neon(palette.cyan);
      case 'neonMagenta': return neon(palette.magenta);
      case 'neonAmber': return neon(palette.amber);
      case 'neonRed': return neon(palette.red);
      case 'neonGreen': return neon(palette.green);

      case 'plasticBlack':
        return std({ color: 0x0d1013, roughness: 0.42, metalness: 0.0, envMapIntensity: 0.9 });

      case 'fabricDark': {
        const t = fabricTex('#14171a', 5);
        return std({ map: t, roughness: 0.92, metalness: 0.0, envMapIntensity: 0.35 });
      }

      case 'skin': {
        const t = skinTex(0);
        return std({ map: t, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.7 });
      }

      case 'chrome':
        return std({ color: 0xc8d2da, roughness: 0.18, metalness: 1.0, envMapIntensity: 2.0 });

      case 'water':
        return std({ color: 0x060d12, roughness: 0.035, metalness: 0.6, transparent: true, opacity: 0.94, envMapIntensity: 2.6 });

      case 'holo':
        return new THREE.MeshBasicMaterial({ color: palette.cyan, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

      case 'decal':
        return std({ color: 0x1a1d20, roughness: 0.9, metalness: 0, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });

      default:
        return std({ color: 0x33393e, roughness: 0.85, metalness: 0.08, envMapIntensity: 0.6 });
    }
  }

  /* Emissive neon. Values > 1 so the bloom bright-pass has real headroom to work with —
   * this is why the sign bleeds light instead of just being a bright rectangle. */
  function neon(color, intensity) {
    const m = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, emissive: new THREE.Color(color),
      emissiveIntensity: intensity === undefined ? 3.2 : intensity,
      roughness: 0.35, metalness: 0.0,
    });
    stdMats.push(m);
    return m;
  }

  /* ------------------------------------------------------------------- public */
  function get(name) {
    if (!cache[name]) cache[name] = build(name);
    return cache[name];
  }

  function tex(name, opts) {
    const key = name + JSON.stringify(opts || {});
    if (texCache[key]) return texCache[key];
    let t = null;
    if (name === 'windows') t = windowTex((opts && opts.cols) || 9, (opts && opts.rows) || 14, (opts && opts.seed) || 3, opts);
    else if (name === 'skin') t = skinTex((opts && opts.tone) || 0);
    else if (name === 'fabric') t = fabricTex(opts && opts.base, opts && opts.seed);
    texCache[key] = t;
    return t;
  }

  /* Called by Core once the PMREM env map exists. Reflections are most of the
   * "expensive" look — without this everything reads as flat paint. */
  function refreshEnv() {
    const env = VH.Core && VH.Core.env;
    if (!env) return;
    for (const m of stdMats) { m.envMap = env; m.needsUpdate = true; }
  }

  function init(r) {
    renderer = r;
    try { aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()); } catch (e) { aniso = 4; }
    /* Pre-build the surfaces the world leans on so the first frame is not a hitch. */
    ['asphaltWet', 'concrete', 'concreteStain', 'metalPanel', 'metalRust', 'glassDark'].forEach(get);
    refreshEnv();
  }

  return {
    init, get, tex, makeSign, refreshEnv, palette, neon,
    canvasTex, heightToNormal, fbmField, dripStreaks, packORM,
    noise2D: U.noise2D, fbm: U.fbm,
    get materials() { return cache; },
  };
})();
