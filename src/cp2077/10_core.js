<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 01 — CORE MATH, RNG, NOISE
   Column-major mat4 (matches GLSL). All hot paths write into caller-supplied
   destinations so the per-frame allocation count stays at zero.
   ========================================================================== */
"use strict";
const NC = {};                       // one global namespace, no leaks
const PI = Math.PI, TAU = PI * 2, D2R = PI / 180, R2D = 180 / PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sat = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const invLerp = (a, b, v) => b === a ? 0 : (v - a) / (b - a);
const sign = Math.sign, abs = Math.abs, min = Math.min, max = Math.max;
const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, atan2 = Math.atan2;
const floor = Math.floor, ceil = Math.ceil, round = Math.round, hypot = Math.hypot;
/* shortest signed angular difference, wraps to (-PI,PI] */
function angDiff(a, b) { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; }
function angLerp(a, b, t) { return a + angDiff(a, b) * t; }
/* frame-rate independent exponential approach: 1-exp(-k*dt) */
function damp(a, b, k, dt) { return lerp(a, b, 1 - Math.exp(-k * dt)); }
function moveTo(a, b, step) { const d = b - a; return abs(d) <= step ? b : a + sign(d) * step; }

/* ---------------------------------------------------------------- vec3 --- */
const V3 = {
  n: (x = 0, y = 0, z = 0) => new Float32Array([x, y, z]),
  set: (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; },
  cpy: (o, a) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; },
  add: (o, a, b) => { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
  sub: (o, a, b) => { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
  mul: (o, a, b) => { o[0] = a[0] * b[0]; o[1] = a[1] * b[1]; o[2] = a[2] * b[2]; return o; },
  scl: (o, a, s) => { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; },
  mad: (o, a, b, s) => { o[0] = a[0] + b[0] * s; o[1] = a[1] + b[1] * s; o[2] = a[2] + b[2] * s; return o; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: a => sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
  len2: a => a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
  dist: (a, b) => hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dist2: (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; },
  nrm: (o, a) => { const l = sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1e-9; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
  crs: (o, a, b) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
  lerp: (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; },
  neg: (o, a) => { o[0] = -a[0]; o[1] = -a[1]; o[2] = -a[2]; return o; },
  /* transform as point (w=1) by column-major mat4 */
  xfm: (o, a, m) => { const x = a[0], y = a[1], z = a[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w; return o; },
  /* transform as direction (w=0) */
  xfmD: (o, a, m) => { const x = a[0], y = a[1], z = a[2];
    o[0] = m[0] * x + m[4] * y + m[8] * z;
    o[1] = m[1] * x + m[5] * y + m[9] * z;
    o[2] = m[2] * x + m[6] * y + m[10] * z; return o; },
};

/* ---------------------------------------------------------------- mat4 --- */
const M4 = {
  n: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  idt: o => { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  cpy: (o, a) => { o.set(a); return o; },
  mul(o, a, b) {                     // o = a * b
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7],
          a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i*4], b1 = b[i*4+1], b2 = b[i*4+2], b3 = b[i*4+3];
      o[i*4]   = a00*b0 + a10*b1 + a20*b2 + a30*b3;
      o[i*4+1] = a01*b0 + a11*b1 + a21*b2 + a31*b3;
      o[i*4+2] = a02*b0 + a12*b1 + a22*b2 + a32*b3;
      o[i*4+3] = a03*b0 + a13*b1 + a23*b2 + a33*b3;
    } return o;
  },
  trs(o, tx, ty, tz, qx, qy, qz, qw, sx, sy, sz) {   // translate·rotate·scale
    const x2=qx+qx, y2=qy+qy, z2=qz+qz;
    const xx=qx*x2, xy=qx*y2, xz=qx*z2, yy=qy*y2, yz=qy*z2, zz=qz*z2;
    const wx=qw*x2, wy=qw*y2, wz=qw*z2;
    o[0]=(1-(yy+zz))*sx; o[1]=(xy+wz)*sx;     o[2]=(xz-wy)*sx;     o[3]=0;
    o[4]=(xy-wz)*sy;     o[5]=(1-(xx+zz))*sy; o[6]=(yz+wx)*sy;     o[7]=0;
    o[8]=(xz+wy)*sz;     o[9]=(yz-wx)*sz;     o[10]=(1-(xx+yy))*sz;o[11]=0;
    o[12]=tx; o[13]=ty; o[14]=tz; o[15]=1; return o;
  },
  trn: (o, x, y, z) => { M4.idt(o); o[12]=x; o[13]=y; o[14]=z; return o; },
  scl: (o, x, y, z) => { M4.idt(o); o[0]=x; o[5]=y; o[10]=z; return o; },
  rotY(o, r) { const c=cos(r), s=sin(r); M4.idt(o); o[0]=c; o[2]=-s; o[8]=s; o[10]=c; return o; },
  rotX(o, r) { const c=cos(r), s=sin(r); M4.idt(o); o[5]=c; o[6]=s; o[9]=-s; o[10]=c; return o; },
  rotZ(o, r) { const c=cos(r), s=sin(r); M4.idt(o); o[0]=c; o[1]=s; o[4]=-s; o[5]=c; return o; },
  persp(o, fovy, asp, near, far) {
    const f = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = f / asp; o[5] = f; o[11] = -1;
    o[10] = (far + near) / (near - far); o[14] = 2 * far * near / (near - far); return o;
  },
  /* reversed-Z infinite projection — kills depth fighting on a 6 km city */
  perspInfRevZ(o, fovy, asp, near) {
    const f = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = f / asp; o[5] = f; o[11] = -1; o[10] = 0; o[14] = near; return o;
  },
  ortho(o, l, r, b, t, n, f) {
    o.fill(0); o[0] = 2/(r-l); o[5] = 2/(t-b); o[10] = -2/(f-n);
    o[12] = -(r+l)/(r-l); o[13] = -(t+b)/(t-b); o[14] = -(f+n)/(f-n); o[15] = 1; return o;
  },
  lookAt(o, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    let zx = ex-cx, zy = ey-cy, zz = ez-cz;
    let l = hypot(zx,zy,zz) || 1e-9; zx/=l; zy/=l; zz/=l;
    let xx = uy*zz - uz*zy, xy = uz*zx - ux*zz, xz = ux*zy - uy*zx;
    l = hypot(xx,xy,xz); if (l < 1e-6) { xx = 1; xy = 0; xz = 0; } else { xx/=l; xy/=l; xz/=l; }
    const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
    o[0]=xx; o[1]=yx; o[2]=zx; o[3]=0;
    o[4]=xy; o[5]=yy; o[6]=zy; o[7]=0;
    o[8]=xz; o[9]=yz; o[10]=zz; o[11]=0;
    o[12]=-(xx*ex+xy*ey+xz*ez); o[13]=-(yx*ex+yy*ey+yz*ez); o[14]=-(zx*ex+zy*ey+zz*ez); o[15]=1;
    return o;
  },
  inv(o, m) {
    const a00=m[0],a01=m[1],a02=m[2],a03=m[3], a10=m[4],a11=m[5],a12=m[6],a13=m[7],
          a20=m[8],a21=m[9],a22=m[10],a23=m[11], a30=m[12],a31=m[13],a32=m[14],a33=m[15];
    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10,
          b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
          b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30,
          b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    let d = b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if (!d) return M4.idt(o); d = 1/d;
    o[0]=(a11*b11-a12*b10+a13*b09)*d;  o[1]=(a02*b10-a01*b11-a03*b09)*d;
    o[2]=(a31*b05-a32*b04+a33*b03)*d;  o[3]=(a22*b04-a21*b05-a23*b03)*d;
    o[4]=(a12*b08-a10*b11-a13*b07)*d;  o[5]=(a00*b11-a02*b08+a03*b07)*d;
    o[6]=(a32*b02-a30*b05-a33*b01)*d;  o[7]=(a20*b05-a22*b02+a23*b01)*d;
    o[8]=(a10*b10-a11*b08+a13*b06)*d;  o[9]=(a01*b08-a00*b10-a03*b06)*d;
    o[10]=(a30*b04-a31*b02+a33*b00)*d; o[11]=(a21*b02-a20*b04-a23*b00)*d;
    o[12]=(a11*b07-a10*b09-a12*b06)*d; o[13]=(a00*b09-a01*b07+a02*b06)*d;
    o[14]=(a31*b01-a30*b03-a32*b00)*d; o[15]=(a20*b03-a21*b01+a22*b00)*d;
    return o;
  },
  /* inverse-transpose upper 3x3 packed into a mat4 (normal matrix) */
  nrm(o, m) { M4.inv(o, m); const t=[o[1],o[2],o[6]]; o[1]=o[4]; o[4]=t[0];
    o[2]=o[8]; o[8]=t[1]; o[6]=o[9]; o[9]=t[2];
    o[3]=o[7]=o[11]=o[12]=o[13]=o[14]=0; o[15]=1; return o; },
};

/* ---------------------------------------------------------------- quat --- */
const Q4 = {
  n: () => new Float32Array([0, 0, 0, 1]),
  euler(o, x, y, z) {  // YXZ order — matches yaw/pitch/roll camera convention
    const c1=cos(y*.5), s1=sin(y*.5), c2=cos(x*.5), s2=sin(x*.5), c3=cos(z*.5), s3=sin(z*.5);
    o[0]=s2*c1*c3 + c2*s1*s3; o[1]=c2*s1*c3 - s2*c1*s3;
    o[2]=c2*c1*s3 - s2*s1*c3; o[3]=c2*c1*c3 + s2*s1*s3; return o;
  },
  axis(o, ax, ay, az, r) { const h = r*.5, s = sin(h);
    o[0]=ax*s; o[1]=ay*s; o[2]=az*s; o[3]=cos(h); return o; },
  mul(o, a, b) {
    const ax=a[0],ay=a[1],az=a[2],aw=a[3], bx=b[0],by=b[1],bz=b[2],bw=b[3];
    o[0]=ax*bw+aw*bx+ay*bz-az*by; o[1]=ay*bw+aw*by+az*bx-ax*bz;
    o[2]=az*bw+aw*bz+ax*by-ay*bx; o[3]=aw*bw-ax*bx-ay*by-az*bz; return o;
  },
  slerp(o, a, b, t) {
    let ax=a[0],ay=a[1],az=a[2],aw=a[3], bx=b[0],by=b[1],bz=b[2],bw=b[3];
    let d = ax*bx+ay*by+az*bz+aw*bw;
    if (d < 0) { d = -d; bx=-bx; by=-by; bz=-bz; bw=-bw; }
    let s0, s1;
    if (1 - d > 1e-6) { const om = Math.acos(d), si = sin(om);
      s0 = sin((1-t)*om)/si; s1 = sin(t*om)/si; } else { s0 = 1-t; s1 = t; }
    o[0]=s0*ax+s1*bx; o[1]=s0*ay+s1*by; o[2]=s0*az+s1*bz; o[3]=s0*aw+s1*bw; return o;
  },
};

/* ------------------------------------------------------------ rng/noise --- */
/* mulberry32: fast, seedable, good enough distribution for world-gen */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* deterministic hash — the backbone of all "same city every launch" gen */
function h1(x) { x = ((x >> 16) ^ x) * 0x45d9f3b; x = ((x >> 16) ^ x) * 0x45d9f3b;
  return (((x >> 16) ^ x) >>> 0) / 4294967296; }
function h2(x, y) { return h1(Math.imul(x|0, 73856093) ^ Math.imul(y|0, 19349663)); }
function h3(x, y, z) { return h1(Math.imul(x|0,73856093) ^ Math.imul(y|0,19349663) ^ Math.imul(z|0,83492791)); }

/* value noise, 2D — cheap and adequate under fbm */
function vnoise(x, y) {
  const xi = floor(x), yi = floor(y), xf = x - xi, yf = y - yi;
  const u = smoother(xf), v = smoother(yf);
  const a = h2(xi, yi), b = h2(xi+1, yi), c = h2(xi, yi+1), d = h2(xi+1, yi+1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct = 4, lac = 2, gain = .5) {
  let s = 0, a = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x*f, y*f); n += a; a *= gain; f *= lac; }
  return s / n;
}
function ridge(x, y, oct = 4) {
  let s = 0, a = .5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (1 - abs(vnoise(x*f, y*f) * 2 - 1)); n += a; a *= .5; f *= 2; }
  return s / n;
}
/* 3D gradient noise — used for volumetric fog + cloud shaping */
function gnoise3(x, y, z) {
  const xi=floor(x), yi=floor(y), zi=floor(z), xf=x-xi, yf=y-yi, zf=z-zi;
  const u=smoother(xf), v=smoother(yf), w=smoother(zf);
  const g=(i,j,k)=>h3(i,j,k);
  return lerp(lerp(lerp(g(xi,yi,zi),g(xi+1,yi,zi),u), lerp(g(xi,yi+1,zi),g(xi+1,yi+1,zi),u), v),
              lerp(lerp(g(xi,yi,zi+1),g(xi+1,yi,zi+1),u), lerp(g(xi,yi+1,zi+1),g(xi+1,yi+1,zi+1),u), v), w);
}

/* ------------------------------------------------------------- helpers --- */
const pick = (arr, r) => arr[(r() * arr.length) | 0];
const pickH = (arr, hv) => arr[(hv * arr.length) | 0 % arr.length];
const rrange = (r, a, b) => a + r() * (b - a);
const irange = (r, a, b) => a + ((r() * (b - a + 1)) | 0);
const chance = (r, p) => r() < p;
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = (r()*(i+1))|0; const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
/* weighted pick: table = [[item,w],...] */
function wpick(table, r) {
  let tot = 0; for (const t of table) tot += t[1];
  let v = r() * tot;
  for (const t of table) { v -= t[1]; if (v <= 0) return t[0]; }
  return table[table.length - 1][0];
}
const fmt = n => n.toLocaleString("en-US");
const pad2 = n => (n < 10 ? "0" : "") + n;
/* HSL→RGB in 0..1, used everywhere for palette generation */
function hsl(h, s, l, out) {
  h = ((h % 1) + 1) % 1;
  const c = (1 - abs(2*l - 1)) * s, x = c * (1 - abs(((h*6) % 2) - 1)), m = l - c/2;
  let r, g, b;
  const seg = (h * 6) | 0;
  if (seg === 0) { r=c; g=x; b=0; } else if (seg === 1) { r=x; g=c; b=0; }
  else if (seg === 2) { r=0; g=c; b=x; } else if (seg === 3) { r=0; g=x; b=c; }
  else if (seg === 4) { r=x; g=0; b=c; } else { r=c; g=0; b=x; }
  out = out || [0,0,0]; out[0]=r+m; out[1]=g+m; out[2]=b+m; return out;
}
const hex2rgb = h => [((h>>16)&255)/255, ((h>>8)&255)/255, (h&255)/255];
const rgb2css = c => "rgb(" + (c[0]*255|0) + "," + (c[1]*255|0) + "," + (c[2]*255|0) + ")";

/* --- axis-aligned ray/box + segment helpers used by physics and hitscan --- */
function rayAABB(ox, oy, oz, dx, dy, dz, minx, miny, minz, maxx, maxy, maxz) {
  const ix = 1/dx, iy = 1/dy, iz = 1/dz;
  let t1 = (minx-ox)*ix, t2 = (maxx-ox)*ix;
  let tmin = min(t1,t2), tmax = max(t1,t2);
  t1 = (miny-oy)*iy; t2 = (maxy-oy)*iy;
  tmin = max(tmin, min(t1,t2)); tmax = min(tmax, max(t1,t2));
  t1 = (minz-oz)*iz; t2 = (maxz-oz)*iz;
  tmin = max(tmin, min(t1,t2)); tmax = min(tmax, max(t1,t2));
  return tmax >= max(tmin, 0) ? tmin : -1;
}
/* closest approach of a ray to a sphere — capsule-ish body hits */
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const mx = ox-cx, my = oy-cy, mz = oz-cz;
  const b = mx*dx + my*dy + mz*dz;
  const c = mx*mx + my*my + mz*mz - r*r;
  if (c > 0 && b > 0) return -1;
  const disc = b*b - c;
  if (disc < 0) return -1;
  const t = -b - sqrt(disc);
  return t < 0 ? 0 : t;
}
function pointInPoly(px, pz, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
    const xi = poly[i], zi = poly[i+1], xj = poly[j], zj = poly[j+1];
    if ((zi > pz) !== (zj > pz) && px < (xj - xi) * (pz - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
</script>
