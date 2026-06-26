// ============================================================================
//  Deterministic noise + RNG (seeded simplex 2D/3D, value noise, fbm)
// ============================================================================

// --- Mulberry32 seeded PRNG ---------------------------------------------------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash a string seed to a 32-bit int
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

export class Noise {
  constructor(seed = 1337) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  // 2D simplex noise -> [-1, 1]
  simplex2(xin, yin) {
    const perm = this.perm, permMod12 = this.permMod12;
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0; else {
      const gi0 = permMod12[ii + perm[jj]]; t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0; else {
      const gi1 = permMod12[ii + i1 + perm[jj + j1]]; t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0; else {
      const gi2 = permMod12[ii + 1 + perm[jj + 1]]; t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  }

  // 3D simplex noise -> [-1, 1]
  simplex3(xin, yin, zin) {
    const perm = this.perm, permMod12 = this.permMod12;
    const F3 = 1 / 3, G3 = 1 / 6;
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0)      { i1=1;j1=0;k1=0; i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0; i2=1;j2=0;k2=1; }
      else               { i1=0;j1=0;k1=1; i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0)       { i1=0;j1=0;k1=1; i2=0;j2=1;k2=1; }
      else if (x0 < z0)  { i1=0;j1=1;k1=0; i2=0;j2=1;k2=1; }
      else               { i1=0;j1=1;k1=0; i2=1;j2=1;k2=0; }
    }
    const x1=x0-i1+G3, y1=y0-j1+G3, z1=z0-k1+G3;
    const x2=x0-i2+2*G3, y2=y0-j2+2*G3, z2=z0-k2+2*G3;
    const x3=x0-1+3*G3, y3=y0-1+3*G3, z3=z0-1+3*G3;
    const ii=i&255, jj=j&255, kk=k&255;
    let t0=0.6-x0*x0-y0*y0-z0*z0;
    if (t0<0) n0=0; else { const gi=permMod12[ii+perm[jj+perm[kk]]]; t0*=t0; n0=t0*t0*(GRAD3[gi][0]*x0+GRAD3[gi][1]*y0+GRAD3[gi][2]*z0); }
    let t1=0.6-x1*x1-y1*y1-z1*z1;
    if (t1<0) n1=0; else { const gi=permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]]; t1*=t1; n1=t1*t1*(GRAD3[gi][0]*x1+GRAD3[gi][1]*y1+GRAD3[gi][2]*z1); }
    let t2=0.6-x2*x2-y2*y2-z2*z2;
    if (t2<0) n2=0; else { const gi=permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]]; t2*=t2; n2=t2*t2*(GRAD3[gi][0]*x2+GRAD3[gi][1]*y2+GRAD3[gi][2]*z2); }
    let t3=0.6-x3*x3-y3*y3-z3*z3;
    if (t3<0) n3=0; else { const gi=permMod12[ii+1+perm[jj+1+perm[kk+1]]]; t3*=t3; n3=t3*t3*(GRAD3[gi][0]*x3+GRAD3[gi][1]*y3+GRAD3[gi][2]*z3); }
    return 32 * (n0 + n1 + n2 + n3);
  }

  // Fractal brownian motion (2D)
  fbm2(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.simplex2(x * freq, y * freq);
      norm += amp; amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  fbm3(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.simplex3(x * freq, y * freq, z * freq);
      norm += amp; amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  // Ridged noise for mountains
  ridge2(x, y, octaves = 4) {
    let amp = 0.5, freq = 1, sum = 0;
    for (let o = 0; o < octaves; o++) {
      let n = 1 - Math.abs(this.simplex2(x * freq, y * freq));
      n *= n;
      sum += n * amp; amp *= 0.5; freq *= 2;
    }
    return sum;
  }
}
