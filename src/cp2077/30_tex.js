<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 03 — PROCEDURAL PBR MATERIAL SYNTHESIS
   Every surface in Night City is authored here in code. Nothing is downloaded.
   Each material writes four channel-buffers (albedo RGB, height, roughness,
   metalness); heights are differentiated with a Sobel kernel to produce
   tangent-space normals, then everything is packed into two GPU array textures:
       ALBEDO ARRAY : RGB = base colour, A = baked cavity/AO
       SURFACE ARRAY: RG  = normal.xy, B = roughness, A = metalness
   ========================================================================== */
const TEX = {
  S: 256, N: 0, names: [], idx: {},
  albArr: null, srfArr: null, _albBufs: [], _srfBufs: [],

  /* ---- per-material scratch buffers -------------------------------------- */
  _new() {
    const n = this.S * this.S;
    return { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n),
             h: new Float32Array(n), ro: new Float32Array(n), me: new Float32Array(n),
             ao: new Float32Array(n).fill(1), S: this.S, n };
  },

  /* ======================= PAINTING PRIMITIVES ============================ */
  fill(M, r, g, b, h, ro, me) {
    M.r.fill(r); M.g.fill(g); M.b.fill(b);
    if (h !== undefined) M.h.fill(h);
    if (ro !== undefined) M.ro.fill(ro);
    if (me !== undefined) M.me.fill(me);
  },
  /* seamless value-noise: samples a torus so the tile wraps perfectly */
  wrapNoise(M, freq, seed) {
    const S = M.S, out = new Float32Array(M.n);
    const f = max(1, freq | 0);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const gx = x * f / S, gy = y * f / S;
      const x0 = floor(gx), y0 = floor(gy), fx = gx - x0, fy = gy - y0;
      const u = smoother(fx), v = smoother(fy);
      const w = (i, j) => h3(((i % f) + f) % f, ((j % f) + f) % f, seed);
      out[y*S+x] = lerp(lerp(w(x0,y0), w(x0+1,y0), u), lerp(w(x0,y0+1), w(x0+1,y0+1), u), v);
    }
    return out;
  },
  wrapFbm(M, freq, oct, seed, gain) {
    gain = gain === undefined ? .5 : gain;
    const out = new Float32Array(M.n);
    let a = 1, tot = 0, f = freq;
    for (let o = 0; o < oct; o++) {
      const l = this.wrapNoise(M, f, seed + o * 977);
      for (let i = 0; i < M.n; i++) out[i] += l[i] * a;
      tot += a; a *= gain; f *= 2;
    }
    for (let i = 0; i < M.n; i++) out[i] /= tot;
    return out;
  },
  /* seamless voronoi — cracks, pebbles, cell-tiles, worn paint chips */
  wrapCells(M, cells, seed, jitter) {
    const S = M.S, F1 = new Float32Array(M.n), ID = new Float32Array(M.n), F2 = new Float32Array(M.n);
    jitter = jitter === undefined ? 1 : jitter;
    const cs = S / cells;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const cx = floor(x / cs), cy = floor(y / cs);
      let d1 = 1e9, d2 = 1e9, id = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const gx = cx + i, gy = cy + j;
        const wx = ((gx % cells) + cells) % cells, wy = ((gy % cells) + cells) % cells;
        const px = (gx + .5 + (h3(wx, wy, seed) - .5) * jitter) * cs;
        const py = (gy + .5 + (h3(wx, wy, seed + 71) - .5) * jitter) * cs;
        const d = hypot(px - x, py - y);
        if (d < d1) { d2 = d1; d1 = d; id = h3(wx, wy, seed + 313); }
        else if (d < d2) d2 = d;
      }
      const k = y*S+x; F1[k] = d1 / cs; F2[k] = d2 / cs; ID[k] = id;
    }
    return { F1, F2, ID };
  },
  /* running-bond masonry: returns {mask(mortar=0..1), id, u, v} */
  bricks(M, cols, rows, mortar, offset) {
    const S = M.S, mask = new Float32Array(M.n), ID = new Float32Array(M.n),
          UU = new Float32Array(M.n), VV = new Float32Array(M.n);
    const bw = S / cols, bh = S / rows;
    for (let y = 0; y < S; y++) {
      const row = floor(y / bh);
      const shift = (row % 2) * bw * (offset === undefined ? .5 : offset);
      for (let x = 0; x < S; x++) {
        const xs = (x + shift) % S;
        const col = floor(xs / bw);
        const lx = xs - col * bw, ly = y - row * bh;
        const e = min(min(lx, bw - lx), min(ly, bh - ly));
        const k = y*S+x;
        mask[k] = sat(e / mortar);
        ID[k] = h3(col, row, 17);
        UU[k] = lx / bw; VV[k] = ly / bh;
      }
    }
    return { mask, ID, u: UU, v: VV };
  },
  /* directed scratch/streak field — grime running down vertical surfaces */
  streaks(M, count, seed, vertical, len, wid) {
    const S = M.S, out = new Float32Array(M.n), r = rng(seed);
    for (let s = 0; s < count; s++) {
      const px = r() * S, py = r() * S;
      const L = len * (.3 + r() * .7) * S, W = wid * (.4 + r() * .9);
      const amp = .35 + r() * .65;
      const steps = L | 0;
      let x = px, y = py, ang = vertical ? PI/2 + (r()-.5)*.16 : r()*TAU;
      for (let i = 0; i < steps; i++) {
        x += cos(ang); y += sin(ang);
        ang += (r() - .5) * .06;
        const f = (1 - i / steps) * amp;
        const wi = max(1, W * (1 - i / steps * .5)) | 0;
        for (let j = -wi; j <= wi; j++) for (let k = -wi; k <= wi; k++) {
          const xx = ((x + j) | 0) & (S - 1), yy = ((y + k) | 0) & (S - 1);
          const fall = 1 - hypot(j, k) / (wi + 1);
          if (fall > 0) out[yy*S+xx] = max(out[yy*S+xx], f * fall);
        }
      }
    }
    return out;
  },
  /* irregular blotches — oil stains, rust blooms, damp patches */
  splotch(M, count, seed, rad, soft) {
    const S = M.S, out = new Float32Array(M.n), r = rng(seed);
    for (let s = 0; s < count; s++) {
      const cx = r() * S, cy = r() * S, R = rad * (.4 + r() * 1.3) * S;
      const lobes = 3 + (r() * 4 | 0), ph = r() * TAU, irr = .25 + r() * .5;
      const R2 = ceil(R * 1.6);
      for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
        const d = hypot(dx, dy); if (d > R2) continue;
        const a = atan2(dy, dx);
        const rr = R * (1 + sin(a * lobes + ph) * irr);
        if (d > rr) continue;
        const f = Math.pow(1 - d / rr, soft || 1.6);
        const xx = ((cx + dx) | 0 & (S - 1) + S) & (S - 1), yy = (((cy + dy) | 0) % S + S) % S;
        const k = yy*S+((((cx+dx)|0)%S+S)%S);
        out[k] = max(out[k], f);
      }
    }
    return out;
  },
  /* horizontal panel seams — corrugated metal, cladding, mullions */
  bands(M, count, w, vertical, sharp) {
    const S = M.S, out = new Float32Array(M.n), sp = S / count;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const t = (vertical ? x : y) % sp;
      const e = min(t, sp - t);
      out[y*S+x] = sharp ? (e < w ? 1 : 0) : sat(1 - e / w);
    }
    return out;
  },
  /* mix helper: dst = lerp(dst, val, mask*amount) */
  mixV(dst, mask, val, amt) {
    amt = amt === undefined ? 1 : amt;
    for (let i = 0; i < dst.length; i++) dst[i] = lerp(dst[i], val, mask[i] * amt);
  },
  mixC(M, mask, r, g, b, amt) {
    amt = amt === undefined ? 1 : amt;
    for (let i = 0; i < M.n; i++) { const t = mask[i] * amt;
      M.r[i] = lerp(M.r[i], r, t); M.g[i] = lerp(M.g[i], g, t); M.b[i] = lerp(M.b[i], b, t); }
  },
  addV(dst, src, amt) { for (let i = 0; i < dst.length; i++) dst[i] += src[i] * amt; },
  mulV(dst, src, amt) { for (let i = 0; i < dst.length; i++) dst[i] *= 1 + (src[i] - 1) * amt; },
  /* per-texel value variation, keeps flat colours from looking like plastic */
  grain(M, amt, seed) {
    const r = rng(seed);
    for (let i = 0; i < M.n; i++) { const v = (r() - .5) * amt;
      M.r[i] = sat(M.r[i] + v); M.g[i] = sat(M.g[i] + v); M.b[i] = sat(M.b[i] + v); }
  },
  /* tint the albedo by a height-derived cavity term (dirt collects in cracks) */
  cavity(M, strength) {
    const S = M.S;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = y*S+x;
      const l = M.h[y*S + ((x-1+S)&(S-1))], r = M.h[y*S + ((x+1)&(S-1))];
      const u = M.h[((y-1+S)&(S-1))*S + x], d = M.h[((y+1)&(S-1))*S + x];
      const lap = (l + r + u + d) * .25 - M.h[k];
      const c = sat(1 - lap * strength * 8);
      M.ao[k] *= c;
    }
  },

  /* =================== HEIGHT → TANGENT-SPACE NORMAL ====================== */
  packNormals(M, scale) {
    const S = M.S, alb = new Uint8ClampedArray(M.n * 4), srf = new Uint8ClampedArray(M.n * 4);
    const W = (x, y) => M.h[(((y % S) + S) % S) * S + (((x % S) + S) % S)];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      /* Sobel gradient of the height field */
      const tl = W(x-1,y-1), t = W(x,y-1), tr = W(x+1,y-1);
      const l  = W(x-1,y),                  r = W(x+1,y);
      const bl = W(x-1,y+1), b = W(x,y+1), br = W(x+1,y+1);
      const dx = (tr + 2*r + br) - (tl + 2*l + bl);
      const dy = (bl + 2*b + br) - (tl + 2*t + tr);
      let nx = -dx * scale, ny = -dy * scale, nz = 1;
      const il = 1 / hypot(nx, ny, nz); nx *= il; ny *= il;
      const k = y*S+x, o = k*4;
      alb[o]   = M.r[k] * 255; alb[o+1] = M.g[k] * 255;
      alb[o+2] = M.b[k] * 255; alb[o+3] = sat(M.ao[k]) * 255;
      srf[o]   = (nx * .5 + .5) * 255; srf[o+1] = (ny * .5 + .5) * 255;
      srf[o+2] = sat(M.ro[k]) * 255;   srf[o+3] = sat(M.me[k]) * 255;
    }
    return { alb, srf };
  },

  /* ============================ MATERIAL LIBRARY ========================== */
  build(onProgress) {
    const S = this.S, defs = this.LIB;
    const keys = Object.keys(defs);
    this.N = keys.length;
    this.albArr = GX.texArray(S, S, this.N, GX.gl.RGBA8, GX.gl.RGBA, GX.gl.UNSIGNED_BYTE, { mips: true, aniso: 8 });
    this.srfArr = GX.texArray(S, S, this.N, GX.gl.RGBA8, GX.gl.RGBA, GX.gl.UNSIGNED_BYTE, { mips: true, aniso: 8 });
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const M = this._new();
      const nscale = defs[k](this, M) || 3;
      const { alb, srf } = this.packNormals(M, nscale);
      GX.gl.bindTexture(GX.gl.TEXTURE_2D_ARRAY, this.albArr.t);
      GX.gl.texSubImage3D(GX.gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, S, S, 1, GX.gl.RGBA, GX.gl.UNSIGNED_BYTE, alb);
      GX.gl.bindTexture(GX.gl.TEXTURE_2D_ARRAY, this.srfArr.t);
      GX.gl.texSubImage3D(GX.gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, S, S, 1, GX.gl.RGBA, GX.gl.UNSIGNED_BYTE, srf);
      this.idx[k] = i; this.names.push(k);
      if (onProgress) onProgress(i / keys.length, k);
    }
    GX.genMips(this.albArr); GX.genMips(this.srfArr);
    return this;
  },
  id(name) { const v = this.idx[name]; return v === undefined ? 0 : v; },
};

/* -------------------------------------------------------------------------
   The library. Each entry paints one 256² PBR tile and returns the normal
   strength. Ordering here defines the array-layer indices used by the world.
   ------------------------------------------------------------------------- */
TEX.LIB = {

/* ---- 0. CONCRETE, poured, board-formed. Entropism's default surface ------ */
concrete(T, M) {
  T.fill(M, .40, .40, .405, .5, .82, 0);
  const big = T.wrapFbm(M, 4, 5, 11), fine = T.wrapFbm(M, 32, 3, 23);
  for (let i = 0; i < M.n; i++) {
    const v = big[i] * .7 + fine[i] * .3;
    const c = .30 + v * .22;
    M.r[i] = c; M.g[i] = c * 1.005; M.b[i] = c * 1.02;
    M.h[i] = .45 + fine[i] * .09 + big[i] * .05;
    M.ro[i] = .74 + fine[i] * .2;
  }
  /* board-form seams every 64px + tie-rod holes */
  const seam = T.bands(M, 4, 1.6, false, false);
  T.mixC(M, seam, .26, .26, .27, .5);
  T.addV(M.h, seam, -.05);
  const cl = T.wrapCells(M, 9, 5, .9);
  const crack = new Float32Array(M.n);
  for (let i = 0; i < M.n; i++) crack[i] = sat(1 - abs(cl.F2[i] - cl.F1[i]) * 9) * sat(big[i] * 1.8 - .35);
  T.mixC(M, crack, .16, .16, .17, .85); T.addV(M.h, crack, -.13);
  const dirt = T.streaks(M, 26, 91, true, .55, 1.3);
  T.mixC(M, dirt, .20, .19, .17, .58); T.mulV(M.ro, dirt, .3);
  const damp = T.splotch(M, 5, 55, .16, 2.1);
  T.mixC(M, damp, .27, .27, .29, .45);
  T.grain(M, .028, 7); T.cavity(M, 1.4);
  return 3.6;
},

/* ---- 1. CONCRETE, water-stained + moss. Watson back-alleys --------------- */
concreteWet(T, M) {
  TEX.LIB.concrete(T, M);
  const wet = T.splotch(M, 9, 404, .21, 1.4);
  const run = T.streaks(M, 40, 405, true, .8, 1.7);
  for (let i = 0; i < M.n; i++) {
    const w = max(wet[i], run[i] * .8);
    M.r[i] = lerp(M.r[i], .11, w * .6); M.g[i] = lerp(M.g[i], .13, w * .6);
    M.b[i] = lerp(M.b[i], .12, w * .6);
    M.ro[i] = lerp(M.ro[i], .17, w * .8);
  }
  const moss = T.splotch(M, 7, 909, .11, 2.4);
  T.mixC(M, moss, .13, .19, .10, .55);
  return 3.6;
},

/* ---- 2. ASPHALT road with aggregate + tyre polish ------------------------ */
asphalt(T, M) {
  T.fill(M, .085, .085, .09, .5, .9, 0);
  const agg = T.wrapCells(M, 44, 31, 1);
  const n2 = T.wrapFbm(M, 26, 3, 44);
  for (let i = 0; i < M.n; i++) {
    const st = sat(1 - agg.F1[i] * 1.7);
    const lum = .062 + n2[i] * .05 + st * agg.ID[i] * .17;
    M.r[i] = lum; M.g[i] = lum * 1.01; M.b[i] = lum * 1.06;
    M.h[i] = .46 + st * .1 + n2[i] * .05;
    M.ro[i] = .84 + n2[i] * .13;
  }
  /* wheel-path polish: two darker, smoother ribbons */
  const S = M.S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = min(abs(x - S*.27), abs(x - S*.73)) / (S*.1);
    const p = sat(1 - d);
    const k = y*S+x;
    M.ro[k] = lerp(M.ro[k], .42, p * .7);
    M.r[k] *= 1 - p*.16; M.g[k] *= 1 - p*.16; M.b[k] *= 1 - p*.16;
  }
  const oil = T.splotch(M, 6, 77, .1, 2.6);
  for (let i = 0; i < M.n; i++) { const o = oil[i];
    M.ro[i] = lerp(M.ro[i], .2, o * .85);
    M.r[i] = lerp(M.r[i], .04, o*.6); M.g[i] = lerp(M.g[i], .045, o*.6); M.b[i] = lerp(M.b[i], .05, o*.6); }
  const crk = new Float32Array(M.n);
  const cc = T.wrapCells(M, 6, 88, .8);
  for (let i = 0; i < M.n; i++) crk[i] = sat(1 - (cc.F2[i]-cc.F1[i]) * 11) * .7;
  T.mixC(M, crk, .03, .03, .035, .8); T.addV(M.h, crk, -.1);
  T.grain(M, .022, 5); T.cavity(M, 1.1);
  return 2.4;
},

/* ---- 3. SIDEWALK: cast pavers, chipped edges, gum ------------------------ */
sidewalk(T, M) {
  T.fill(M, .35, .345, .34, .5, .86, 0);
  const b = T.bricks(M, 4, 4, 2.4, 0);
  const n = T.wrapFbm(M, 30, 3, 12);
  for (let i = 0; i < M.n; i++) {
    const tone = .29 + b.ID[i] * .085 + n[i] * .06;
    M.r[i] = tone; M.g[i] = tone * .995; M.b[i] = tone * .985;
    M.h[i] = .34 + b.mask[i] * .3 + n[i] * .04;
    M.ro[i] = .82 + n[i] * .14;
  }
  const chip = T.wrapCells(M, 30, 61, 1);
  for (let i = 0; i < M.n; i++) if (b.mask[i] < .35 && chip.F1[i] < .3) M.h[i] -= .07;
  const gum = T.splotch(M, 12, 313, .022, 1.1);
  T.mixC(M, gum, .17, .16, .16, .8);
  const grime = T.streaks(M, 16, 141, false, .4, 1.1);
  T.mixC(M, grime, .21, .20, .19, .4);
  T.grain(M, .02, 3); T.cavity(M, 1.6);
  return 4.2;
},

/* ---- 4. BRICK, red — Watson tenements ----------------------------------- */
brick(T, M) {
  const b = T.bricks(M, 8, 16, 2.2, .5);
  const n = T.wrapFbm(M, 34, 4, 77), nb = T.wrapFbm(M, 8, 3, 78);
  for (let i = 0; i < M.n; i++) {
    const m = b.mask[i];
    const bv = b.ID[i];
    const br = .30 + bv * .18, bg = .118 + bv * .07, bb = .092 + bv * .05;
    const mr = .46 + n[i] * .09;
    M.r[i] = lerp(mr, br + n[i]*.05, m); M.g[i] = lerp(mr*.98, bg + n[i]*.03, m);
    M.b[i] = lerp(mr*.95, bb + n[i]*.03, m);
    M.h[i] = .3 + m * .32 + n[i] * .05 + nb[i] * .03;
    M.ro[i] = lerp(.9, .78 + n[i]*.16, m);
  }
  const eff = T.splotch(M, 8, 828, .1, 1.8);          // efflorescence
  T.mixC(M, eff, .62, .62, .60, .4);
  const soot = T.streaks(M, 30, 829, true, .6, 1.4);
  T.mixC(M, soot, .13, .11, .10, .55);
  T.grain(M, .025, 9); T.cavity(M, 1.8);
  return 5;
},

/* ---- 5. CORRUGATED METAL — Santo Domingo industrial --------------------- */
corrugated(T, M) {
  const S = M.S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const w = (sin(x / S * TAU * 10) * .5 + .5);
    M.h[k] = .3 + w * .45;
    const c = .30 + w * .16;
    M.r[k] = c; M.g[k] = c * 1.03; M.b[k] = c * 1.07;
    M.ro[k] = .44 + (1 - w) * .22;
    M.me[k] = .85;
  }
  const rust = T.splotch(M, 14, 606, .13, 1.5);
  const run = T.streaks(M, 34, 607, true, .7, 1.5);
  for (let i = 0; i < M.n; i++) {
    const r = sat(max(rust[i], run[i] * .85));
    M.r[i] = lerp(M.r[i], .34, r); M.g[i] = lerp(M.g[i], .155, r); M.b[i] = lerp(M.b[i], .062, r);
    M.ro[i] = lerp(M.ro[i], .93, r); M.me[i] = lerp(M.me[i], .05, r);
    M.h[i] += r * .03;
  }
  const bolt = T.wrapCells(M, 8, 610, .05);
  for (let i = 0; i < M.n; i++) if (bolt.F1[i] < .10) { M.h[i] += .12; M.ro[i] = .35; }
  T.grain(M, .02, 11); T.cavity(M, 1.2);
  return 3.4;
},

/* ---- 6. RUSTED STEEL PLATE ---------------------------------------------- */
rust(T, M) {
  T.fill(M, .33, .15, .06, .5, .92, .1);
  const f1 = T.wrapFbm(M, 6, 5, 202), f2 = T.wrapFbm(M, 40, 3, 203);
  const flake = T.wrapCells(M, 18, 204, 1);
  for (let i = 0; i < M.n; i++) {
    const v = f1[i] * .7 + f2[i] * .3;
    M.r[i] = .21 + v * .30; M.g[i] = .085 + v * .175; M.b[i] = .04 + v * .08;
    M.h[i] = .4 + v * .16 + (1 - flake.F1[i]) * .07;
    M.ro[i] = .82 + v * .16;
    M.me[i] = sat(.55 - v * 1.4);
  }
  const pit = T.wrapCells(M, 34, 205, 1);
  for (let i = 0; i < M.n; i++) if (pit.F1[i] < .22) { M.h[i] -= .1; M.r[i]*=.65; M.g[i]*=.6; M.b[i]*=.6; }
  T.grain(M, .03, 13); T.cavity(M, 1.9);
  return 4.4;
},

/* ---- 7. BRUSHED ALUMINIUM PANEL — Neo-Militarist cladding --------------- */
metalPanel(T, M) {
  const S = M.S;
  const brush = T.wrapFbm(M, 128, 2, 300);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const line = brush[y*S + (x & (S-1))];
    const c = .52 + line * .06;
    M.r[k] = c; M.g[k] = c * 1.005; M.b[k] = c * 1.02;
    M.h[k] = .5 + line * .012;
    M.ro[k] = .21 + line * .09;
    M.me[k] = .96;
  }
  const seams = T.bands(M, 2, 1.4, false, false);
  const vs = T.bands(M, 2, 1.4, true, false);
  for (let i = 0; i < M.n; i++) { const s = max(seams[i], vs[i]);
    M.h[i] -= s * .12; M.ro[i] = lerp(M.ro[i], .5, s);
    M.r[i]*=1-s*.3; M.g[i]*=1-s*.3; M.b[i]*=1-s*.3; }
  const smear = T.streaks(M, 10, 302, true, .5, 1.1);
  T.mulV(M.ro, smear, .35);
  T.grain(M, .012, 15); T.cavity(M, .9);
  return 2.6;
},

/* ---- 8. GLASS CURTAIN WALL with mullion grid ---------------------------- */
glassPanel(T, M) {
  T.fill(M, .06, .075, .09, .5, .07, .1);
  const grid = T.bricks(M, 4, 6, 3.0, 0);
  const smudge = T.wrapFbm(M, 12, 4, 401);
  for (let i = 0; i < M.n; i++) {
    const m = grid.mask[i];
    /* pane tint varies slightly per-pane, like real float glass */
    const tint = grid.ID[i] * .05;
    M.r[i] = lerp(.19, .045 + tint, m); M.g[i] = lerp(.20, .062 + tint, m); M.b[i] = lerp(.21, .085 + tint*1.4, m);
    M.h[i] = .5 + (1 - m) * .11;
    M.ro[i] = lerp(.44, .045 + smudge[i] * .10, m);
    M.me[i] = lerp(.85, .06, m);
  }
  const dust = T.streaks(M, 14, 402, true, .55, 1.0);
  T.mulV(M.ro, dust, .5);
  T.mixC(M, dust, .13, .14, .15, .28);
  return 3.8;
},

/* ---- 9. KITSCH PAINT — bold, glossy, chipped ---------------------------- */
paintKitsch(T, M) {
  T.fill(M, .90, .62, .10, .5, .26, 0);
  const n = T.wrapFbm(M, 20, 3, 500);
  for (let i = 0; i < M.n; i++) {
    M.r[i] = .93 - n[i]*.12; M.g[i] = .60 - n[i]*.1; M.b[i] = .09 + n[i]*.05;
    M.h[i] = .5 + n[i]*.02; M.ro[i] = .19 + n[i]*.12;
  }
  const chip = T.wrapCells(M, 22, 501, 1);
  const worn = T.splotch(M, 9, 502, .07, 1.3);
  for (let i = 0; i < M.n; i++) {
    const c = (chip.F1[i] < .26 ? 1 : 0) * worn[i];
    M.r[i] = lerp(M.r[i], .30, c); M.g[i] = lerp(M.g[i], .28, c); M.b[i] = lerp(M.b[i], .27, c);
    M.ro[i] = lerp(M.ro[i], .84, c); M.me[i] = lerp(M.me[i], .5, c*.5);
    M.h[i] -= c * .05;
  }
  const grime = T.streaks(M, 18, 503, true, .5, 1.2);
  T.mixC(M, grime, .25, .19, .09, .38);
  T.grain(M, .015, 17); T.cavity(M, 1.2);
  return 3;
},

/* ---- 10. PLASTER / STUCCO — Heywood, Vista Del Rey ---------------------- */
stucco(T, M) {
  T.fill(M, .62, .56, .47, .5, .88, 0);
  const c = T.wrapCells(M, 46, 601, 1), n = T.wrapFbm(M, 9, 4, 602);
  for (let i = 0; i < M.n; i++) {
    const bump = 1 - c.F1[i];
    const v = .52 + n[i] * .22;
    M.r[i] = v * 1.09; M.g[i] = v * .98; M.b[i] = v * .82;
    M.h[i] = .42 + bump * .17 + n[i] * .06;
    M.ro[i] = .84 + bump * .12;
  }
  const crack = new Float32Array(M.n), cc = T.wrapCells(M, 5, 603, .9);
  for (let i = 0; i < M.n; i++) crack[i] = sat(1 - (cc.F2[i]-cc.F1[i]) * 13) * sat(n[i]*1.7-.3);
  T.mixC(M, crack, .32, .28, .24, .8); T.addV(M.h, crack, -.12);
  const stain = T.streaks(M, 22, 604, true, .65, 1.4);
  T.mixC(M, stain, .34, .30, .24, .45);
  T.grain(M, .026, 19); T.cavity(M, 1.7);
  return 4.6;
},

/* ---- 11. GRAFFITI-TAGGED CONCRETE — gang territory markers -------------- */
graffiti(T, M) {
  TEX.LIB.concreteWet(T, M);
  const S = M.S, r = rng(1234);
  /* spray strokes: a few looping bezier ribbons in gang colours */
  const pals = [[1,.05,.28],[.05,.95,1],[1,.93,.04],[.55,.15,1],[.1,1,.45]];
  for (let g = 0; g < 5; g++) {
    const col = pals[g % pals.length];
    let x = r()*S, y = r()*S;
    const steps = 200 + r()*250, amp = 20 + r()*45;
    let ang = r()*TAU;
    for (let i = 0; i < steps; i++) {
      ang += (r()-.5)*.5 + sin(i*.05)*.09;
      x += cos(ang)*2.1; y += sin(ang)*2.1;
      const w = 2.2 + sin(i*.11)*1.5;
      for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
        const d = hypot(dx,dy); if (d > w) continue;
        const f = (1 - d/w) * .82;
        const xx = ((((x+dx)|0)%S)+S)%S, yy = ((((y+dy)|0)%S)+S)%S, k = yy*S+xx;
        M.r[k] = lerp(M.r[k], col[0], f); M.g[k] = lerp(M.g[k], col[1], f); M.b[k] = lerp(M.b[k], col[2], f);
        M.ro[k] = lerp(M.ro[k], .42, f);
      }
      if (i % 60 === 0 && r() < .4) { x = r()*S; y = r()*S; ang = r()*TAU; }
    }
  }
  const over = T.streaks(M, 12, 88, true, .5, 1.2);
  T.mixC(M, over, .22, .21, .20, .35);
  return 3.4;
},

/* ---- 12. NEON SIGN BACKING — dark board, bright tube channels ----------- */
signBoard(T, M) {
  T.fill(M, .045, .05, .06, .5, .5, .55);
  const n = T.wrapFbm(M, 24, 3, 700);
  for (let i = 0; i < M.n; i++) { M.h[i] = .5 + n[i]*.03; M.ro[i] = .42 + n[i]*.2; }
  const rivets = T.wrapCells(M, 10, 701, .1);
  for (let i = 0; i < M.n; i++) if (rivets.F1[i] < .12) { M.h[i] += .11; M.ro[i] = .3; M.me[i] = .9; }
  const wear = T.streaks(M, 14, 702, true, .6, 1.1);
  T.mixC(M, wear, .11, .10, .09, .4);
  return 3;
},

/* ---- 13. INTERIOR FLOOR — polished screed, corpo lobbies ---------------- */
floorPolish(T, M) {
  T.fill(M, .17, .175, .19, .5, .12, .05);
  const grid = T.bricks(M, 3, 3, 1.4, 0);
  const swirl = T.wrapFbm(M, 5, 4, 800), micro = T.wrapFbm(M, 60, 2, 801);
  for (let i = 0; i < M.n; i++) {
    const m = grid.mask[i];
    const v = .13 + swirl[i]*.09;
    M.r[i] = v; M.g[i] = v*1.03; M.b[i] = v*1.12;
    M.h[i] = .5 + m*.03;
    M.ro[i] = lerp(.4, .08 + micro[i]*.07, m);
  }
  const scuff = T.streaks(M, 26, 802, false, .5, .9);
  T.mulV(M.ro, scuff, .5); T.mixC(M, scuff, .22, .22, .24, .22);
  return 2.2;
},

/* ---- 14. MARBLE — Corpo Plaza lobbies ----------------------------------- */
marble(T, M) {
  const S = M.S;
  const base = T.wrapFbm(M, 3, 5, 900);
  const warp = T.wrapFbm(M, 6, 3, 901);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const v = sin((x/S*3 + base[k]*3.2 + warp[k]*1.5) * TAU);
    const vein = Math.pow(sat(1 - abs(v)), 9);
    const c = .78 - base[k]*.1;
    M.r[k] = c - vein*.42; M.g[k] = c - vein*.40; M.b[k] = c*1.01 - vein*.36;
    M.h[k] = .5 + vein*.01;
    M.ro[k] = .09 + vein*.06;
    M.me[k] = .02;
  }
  const grid = T.bricks(M, 2, 2, 1.2, 0);
  for (let i = 0; i < M.n; i++) if (grid.mask[i] < .5) { M.h[i] -= .06; M.ro[i] = .3;
    M.r[i]*=.8; M.g[i]*=.8; M.b[i]*=.8; }
  return 2;
},

/* ---- 15. SAND / BADLANDS regolith --------------------------------------- */
sand(T, M) {
  T.fill(M, .55, .44, .30, .5, .93, 0);
  const dune = T.wrapFbm(M, 5, 4, 1000), gr = T.wrapCells(M, 62, 1001, 1);
  for (let i = 0; i < M.n; i++) {
    const v = dune[i];
    M.r[i] = .48 + v*.19; M.g[i] = .385 + v*.16; M.b[i] = .265 + v*.115;
    M.h[i] = .45 + v*.12 + (1-gr.F1[i])*.04;
    M.ro[i] = .9 + v*.08;
  }
  const rock = T.wrapCells(M, 13, 1002, 1);
  for (let i = 0; i < M.n; i++) if (rock.F1[i] < .2) {
    const d = 1 - rock.F1[i]/.2;
    M.r[i] = lerp(M.r[i], .33, d*.8); M.g[i] = lerp(M.g[i], .28, d*.8); M.b[i] = lerp(M.b[i], .23, d*.8);
    M.h[i] += d*.09; M.ro[i] = lerp(M.ro[i], .78, d); }
  T.grain(M, .02, 21); T.cavity(M, 1.3);
  return 3;
},

/* ---- 16. DRY SCRUB — badlands vegetation mat ---------------------------- */
scrub(T, M) {
  T.fill(M, .30, .30, .19, .5, .92, 0);
  const patch = T.wrapFbm(M, 8, 4, 1100), blade = T.wrapCells(M, 50, 1101, 1);
  for (let i = 0; i < M.n; i++) {
    const p = patch[i];
    M.r[i] = .21 + p*.24; M.g[i] = .22 + p*.22; M.b[i] = .11 + p*.11;
    M.h[i] = .44 + (1-blade.F1[i])*.14 + p*.06;
    M.ro[i] = .88 + p*.1;
  }
  const dead = T.splotch(M, 12, 1102, .1, 1.6);
  T.mixC(M, dead, .42, .35, .19, .6);
  T.grain(M, .035, 23); T.cavity(M, 1.4);
  return 4;
},

/* ---- 17. SKIN — layered dermis for realistic characters ----------------- */
skin(T, M) {
  T.fill(M, .78, .58, .49, .5, .48, 0);
  const pore = T.wrapCells(M, 76, 1200, 1);
  const macro = T.wrapFbm(M, 6, 4, 1201);
  const micro = T.wrapFbm(M, 48, 3, 1202);
  for (let i = 0; i < M.n; i++) {
    /* subtle hue drift emulates subdermal blood + melanin variation */
    const m = macro[i], mi = micro[i];
    M.r[i] = .80 + m*.09 - mi*.03;
    M.g[i] = .585 + m*.07 - mi*.035;
    M.b[i] = .50 + m*.055 - mi*.03;
    M.h[i] = .5 + (1-pore.F1[i])*.05 + mi*.03;
    M.ro[i] = .46 + mi*.2 + (1-pore.F1[i])*.06;
  }
  /* fine crease network — knuckles, brow, neck read as skin because of this */
  const cr = T.wrapCells(M, 20, 1203, 1);
  for (let i = 0; i < M.n; i++) { const c = sat(1 - (cr.F2[i]-cr.F1[i])*10) * .5;
    M.h[i] -= c*.05; M.r[i]*=1-c*.09; M.g[i]*=1-c*.1; M.b[i]*=1-c*.1; }
  const blem = T.splotch(M, 16, 1204, .012, 1.2);
  T.mixC(M, blem, .61, .38, .33, .5);
  T.grain(M, .012, 25); T.cavity(M, 2.2);
  return 2.6;
},

/* ---- 18. TECHWEAR FABRIC — woven twill with sheen ---------------------- */
fabric(T, M) {
  const S = M.S;
  T.fill(M, .13, .14, .17, .5, .78, 0);
  const w = T.wrapFbm(M, 40, 2, 1300);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    /* twill: diagonal over-under weave */
    const t = ((x + y) % 4) < 2 ? 1 : 0;
    const u = ((x - y + S) % 4) < 2 ? 1 : 0;
    const v = .10 + (t*.5 + u*.5)*.045 + w[k]*.05;
    M.r[k] = v; M.g[k] = v*1.05; M.b[k] = v*1.24;
    M.h[k] = .45 + t*.06 + u*.05 + w[k]*.03;
    M.ro[k] = .7 + (1-t)*.15 + w[k]*.1;
  }
  const wear = T.streaks(M, 14, 1301, false, .4, 1.0);
  T.mixC(M, wear, .2, .21, .25, .3); T.mulV(M.ro, wear, .3);
  T.grain(M, .014, 27); T.cavity(M, 1.6);
  return 3.6;
},

/* ---- 19. LEATHER — jackets, seats ------------------------------------- */
leather(T, M) {
  T.fill(M, .12, .09, .085, .5, .55, 0);
  const c = T.wrapCells(M, 26, 1400, 1), n = T.wrapFbm(M, 60, 3, 1401);
  for (let i = 0; i < M.n; i++) {
    const grain = 1 - c.F1[i];
    const v = .085 + n[i]*.055 + grain*.035;
    M.r[i] = v*1.25; M.g[i] = v*.95; M.b[i] = v*.9;
    M.h[i] = .44 + grain*.14 + n[i]*.05;
    M.ro[i] = .44 + n[i]*.24 - grain*.1;
  }
  const shine = T.splotch(M, 8, 1402, .13, 2);
  T.mulV(M.ro, shine, .45);
  const crease = new Float32Array(M.n), cc = T.wrapCells(M, 7, 1403, .9);
  for (let i = 0; i < M.n; i++) crease[i] = sat(1 - (cc.F2[i]-cc.F1[i])*12);
  T.addV(M.h, crease, -.09); T.mixC(M, crease, .06, .05, .045, .55);
  T.grain(M, .012, 29); T.cavity(M, 2);
  return 3.8;
},

/* ---- 20. GUN METAL — parkerised, worn at the edges --------------------- */
gunmetal(T, M) {
  T.fill(M, .16, .165, .18, .5, .42, .95);
  const n = T.wrapFbm(M, 70, 3, 1500), c = T.wrapCells(M, 90, 1501, 1);
  for (let i = 0; i < M.n; i++) {
    const v = .13 + n[i]*.06 + (1-c.F1[i])*.02;
    M.r[i] = v; M.g[i] = v*1.02; M.b[i] = v*1.1;
    M.h[i] = .5 + n[i]*.03;
    M.ro[i] = .36 + n[i]*.22;
  }
  const wear = T.streaks(M, 16, 1502, false, .35, .9);
  for (let i = 0; i < M.n; i++) { const w = wear[i];
    M.r[i] = lerp(M.r[i], .48, w*.7); M.g[i] = lerp(M.g[i], .49, w*.7); M.b[i] = lerp(M.b[i], .52, w*.7);
    M.ro[i] = lerp(M.ro[i], .16, w*.8); }
  T.grain(M, .01, 31); T.cavity(M, 1.1);
  return 2.4;
},

/* ---- 21. CAR PAINT — clearcoat over metallic flake --------------------- */
carPaint(T, M) {
  T.fill(M, .6, .6, .62, .5, .13, .55);
  const flake = T.wrapCells(M, 110, 1600, 1), n = T.wrapFbm(M, 18, 3, 1601);
  for (let i = 0; i < M.n; i++) {
    const f = (1 - flake.F1[i]);
    M.r[i] = .55 + f*.14; M.g[i] = .56 + f*.14; M.b[i] = .59 + f*.14;
    M.h[i] = .5 + n[i]*.006;
    M.ro[i] = .10 + f*.09 + n[i]*.04;
    M.me[i] = .55 + f*.3;
  }
  const swirl = T.streaks(M, 22, 1602, false, .3, .7);
  T.addV(M.ro, swirl, .08);
  const dust = T.wrapFbm(M, 12, 3, 1603);
  for (let i = 0; i < M.n; i++) M.ro[i] += dust[i]*.05;
  return 1.6;
},

/* ---- 22. TYRE RUBBER --------------------------------------------------- */
rubber(T, M) {
  T.fill(M, .045, .045, .048, .5, .88, 0);
  const S = M.S;
  const n = T.wrapFbm(M, 34, 3, 1700);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const tread = ((floor(x / 14) + (floor(y/26) % 2)) % 2) ? 1 : 0;
    const v = .036 + n[k]*.03 + tread*.012;
    M.r[k] = v; M.g[k] = v; M.b[k] = v*1.05;
    M.h[k] = .38 + tread*.28 + n[k]*.05;
    M.ro[k] = .82 + n[k]*.14;
  }
  T.grain(M, .012, 33); T.cavity(M, 1.4);
  return 4.5;
},

/* ---- 23. CIRCUIT / TECH PANEL — cyberware, terminals ------------------- */
tech(T, M) {
  T.fill(M, .07, .08, .095, .5, .35, .8);
  const S = M.S, r = rng(1800);
  const trace = new Float32Array(M.n);
  /* orthogonal PCB routing with vias */
  for (let t = 0; t < 46; t++) {
    let x = (r()*S)|0, y = (r()*S)|0, horiz = r() < .5;
    for (let s = 0; s < 40; s++) {
      const L = 6 + (r()*26|0);
      for (let i = 0; i < L; i++) {
        if (horiz) x = (x+1) & (S-1); else y = (y+1) & (S-1);
        for (let w = -1; w <= 1; w++) {
          const xx = horiz ? x : (x+w)&(S-1), yy = horiz ? (y+w)&(S-1) : y;
          trace[yy*S+xx] = 1;
        }
      }
      horiz = !horiz;
      if (r() < .18) break;
    }
    for (let w = -2; w <= 2; w++) for (let v = -2; v <= 2; v++)
      if (w*w+v*v <= 4) trace[(((y+v)&(S-1))*S) + ((x+w)&(S-1))] = 1;
  }
  const n = T.wrapFbm(M, 30, 3, 1801);
  for (let i = 0; i < M.n; i++) {
    const t = trace[i];
    M.r[i] = lerp(.05 + n[i]*.03, .55, t); M.g[i] = lerp(.06 + n[i]*.03, .48, t);
    M.b[i] = lerp(.075 + n[i]*.035, .16, t);
    M.h[i] = .48 + t*.09;
    M.ro[i] = lerp(.44 + n[i]*.16, .26, t);
    M.me[i] = lerp(.25, .95, t);
  }
  const chip = T.bricks(M, 6, 6, 3, 0);
  for (let i = 0; i < M.n; i++) if (chip.mask[i] > .8 && trace[i] < .5) { M.h[i] += .05; M.ro[i] = .3; }
  T.cavity(M, 1.3);
  return 3.2;
},

/* ---- 24. HOLO-AD PANEL BACKING (dark, high spec) ----------------------- */
holoPanel(T, M) {
  T.fill(M, .02, .025, .035, .5, .12, .3);
  const n = T.wrapFbm(M, 90, 2, 1900);
  const S = M.S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const sub = (x % 3) / 3;                      // RGB subpixel stripe
    M.r[k] = .016 + (sub < .34 ? .04 : 0) + n[k]*.02;
    M.g[k] = .018 + (sub >= .34 && sub < .67 ? .04 : 0) + n[k]*.02;
    M.b[k] = .026 + (sub >= .67 ? .05 : 0) + n[k]*.02;
    M.h[k] = .5;
    M.ro[k] = .09 + n[k]*.06;
  }
  return 1.2;
},

/* ---- 25. WATER — Del Coronado Bay ------------------------------------- */
water(T, M) {
  T.fill(M, .015, .035, .05, .5, .04, .02);
  const w1 = T.wrapFbm(M, 8, 4, 2000), w2 = T.wrapFbm(M, 22, 3, 2001);
  for (let i = 0; i < M.n; i++) {
    M.h[i] = .5 + w1[i]*.35 + w2[i]*.13;
    M.ro[i] = .035 + w2[i]*.03;
  }
  return 2.2;
},

/* ---- 26. CERAMIC TILE — bathrooms, metro interiors --------------------- */
tile(T, M) {
  const b = T.bricks(M, 8, 8, 2.0, 0);
  const n = T.wrapFbm(M, 40, 3, 2100);
  for (let i = 0; i < M.n; i++) {
    const m = b.mask[i];
    const t = .60 + b.ID[i]*.10 + n[i]*.05;
    M.r[i] = lerp(.34, t*.97, m); M.g[i] = lerp(.34, t, m); M.b[i] = lerp(.33, t*.98, m);
    M.h[i] = .36 + m*.28;
    M.ro[i] = lerp(.82, .13 + n[i]*.08, m);
  }
  const dirt = T.streaks(M, 20, 2101, true, .5, 1.0);
  T.mixC(M, dirt, .25, .24, .21, .35);
  T.cavity(M, 1.7);
  return 4.4;
},

/* ---- 27. CHAIN-LINK / PERFORATED SCREEN ------------------------------- */
perf(T, M) {
  const S = M.S;
  T.fill(M, .22, .225, .24, .5, .5, .85);
  const n = T.wrapFbm(M, 30, 3, 2200);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const fx = ((x % 16) - 8), fy = ((y % 16) - 8);
    const d = hypot(fx, fy);
    const hole = d < 5 ? 1 : 0;
    M.h[k] = .58 - hole*.34;
    const v = .19 + n[k]*.07;
    M.r[k] = v; M.g[k] = v*1.01; M.b[k] = v*1.05;
    M.ro[k] = .48 + n[k]*.2 + hole*.25;
    M.me[k] = hole ? .1 : .9;
  }
  const rst = T.splotch(M, 8, 2201, .1, 1.5);
  for (let i = 0; i < M.n; i++) { const r = rst[i];
    M.r[i] = lerp(M.r[i], .3, r*.7); M.g[i] = lerp(M.g[i], .14, r*.7); M.b[i] = lerp(M.b[i], .06, r*.7);
    M.ro[i] = lerp(M.ro[i], .9, r); }
  T.cavity(M, 1.4);
  return 4.8;
},

/* ---- 28. HAIR CARD SHEET --------------------------------------------- */
hair(T, M) {
  const S = M.S;
  T.fill(M, .07, .055, .05, .5, .35, 0);
  const strand = T.wrapFbm(M, 150, 2, 2300);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const s = strand[(y*S + x) % M.n];
    const v = .045 + s*.075;
    M.r[k] = v*1.15; M.g[k] = v*.92; M.b[k] = v*.82;
    M.h[k] = .5 + s*.12;
    M.ro[k] = .28 + s*.28;
  }
  return 3;
},

/* ---- 29. METRO PLATFORM SURFACE — tactile paving + grime -------------- */
platform(T, M) {
  TEX.LIB.sidewalk(T, M);
  const S = M.S;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y*S+x;
    const dx = (x % 22) - 11, dy = (y % 22) - 11;
    if (dx*dx + dy*dy < 22) { M.h[k] += .16; M.ro[k] = .68;
      M.r[k] = lerp(M.r[k], .72, .5); M.g[k] = lerp(M.g[k], .62, .5); M.b[k] = lerp(M.b[k], .08, .5); }
  }
  const grime = T.streaks(M, 30, 2400, false, .6, 1.4);
  T.mixC(M, grime, .16, .155, .15, .5);
  return 4.6;
},
};
</script>
