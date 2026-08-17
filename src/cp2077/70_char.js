<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 08 — HUMAN CHARACTERS
   Anatomically-proportioned procedural humans: a 24-bone skeleton, a skinned
   body built from tapered cross-sections, an analytically-sculpted head, and
   a fully procedural animation set (no keyframe data anywhere in this file).

   Proportion reference is the standard 7.5-head canon at 1.78 m stature:
     head 0.237 m | shoulder span 0.44 m | hip 0.96 m | knee 0.50 m
   Every measurement below is metric and scales with the character's height.
   ========================================================================== */
const BONE = {
  ROOT:0, SPINE1:1, SPINE2:2, CHEST:3, NECK:4, HEAD:5,
  CLAV_L:6, UARM_L:7, FARM_L:8, HAND_L:9,
  CLAV_R:10, UARM_R:11, FARM_R:12, HAND_R:13,
  THIGH_L:14, SHIN_L:15, FOOT_L:16, TOE_L:17,
  THIGH_R:18, SHIN_R:19, FOOT_R:20, TOE_R:21,
  JAW:22, PROP:23, COUNT:24,
};
const BONE_PARENT = [-1,0,1,2,3,4, 3,6,7,8, 3,10,11,12, 0,14,15,16, 0,18,19,20, 5,13];

/* rest-pose bone origins in metres, for a 1.78 m body; scaled per character */
const BONE_REST = (() => {
  const P = [];
  P[BONE.ROOT]   = [0, 0.960, 0];
  P[BONE.SPINE1] = [0, 1.070, 0];
  P[BONE.SPINE2] = [0, 1.180, 0];
  P[BONE.CHEST]  = [0, 1.320, 0];
  P[BONE.NECK]   = [0, 1.480, 0];
  P[BONE.HEAD]   = [0, 1.560, 0];
  P[BONE.CLAV_L] = [ 0.055, 1.430, 0];
  P[BONE.UARM_L] = [ 0.195, 1.440, 0];
  P[BONE.FARM_L] = [ 0.205, 1.170, 0];
  P[BONE.HAND_L] = [ 0.212, 0.925, 0];
  P[BONE.CLAV_R] = [-0.055, 1.430, 0];
  P[BONE.UARM_R] = [-0.195, 1.440, 0];
  P[BONE.FARM_R] = [-0.205, 1.170, 0];
  P[BONE.HAND_R] = [-0.212, 0.925, 0];
  P[BONE.THIGH_L]= [ 0.098, 0.945, 0];
  P[BONE.SHIN_L] = [ 0.100, 0.512, 0];
  P[BONE.FOOT_L] = [ 0.100, 0.090, 0];
  P[BONE.TOE_L]  = [ 0.100, 0.030, 0.115];
  P[BONE.THIGH_R]= [-0.098, 0.945, 0];
  P[BONE.SHIN_R] = [-0.100, 0.512, 0];
  P[BONE.FOOT_R] = [-0.100, 0.090, 0];
  P[BONE.TOE_R]  = [-0.100, 0.030, 0.115];
  P[BONE.JAW]    = [0, 1.660, -0.052];   // temporomandibular joint, behind and above
  P[BONE.PROP]   = [-0.212, 0.925, 0.05];
  return P;
})();

class Skeleton {
  constructor(scale) {
    this.n = BONE.COUNT;
    this.scale = scale || 1;
    this.rest = new Float32Array(this.n*3);
    for (let i = 0; i < this.n; i++) {
      const r = BONE_REST[i];
      this.rest[i*3] = r[0]*this.scale; this.rest[i*3+1] = r[1]*this.scale; this.rest[i*3+2] = r[2]*this.scale;
    }
    this.local = new Float32Array(this.n*16);     // parent-relative pose
    this.world = new Float32Array(this.n*16);
    this.invBind = new Float32Array(this.n*16);
    this.skin = new Float32Array(this.n*16);
    this.tex = new Float32Array(this.n*16);       // upload buffer (row-major rows)
    this.rot = new Float32Array(this.n*3);        // euler xyz per bone
    this.trans = new Float32Array(this.n*3);      // additive translation
    this._m = M4.n(); this._p = M4.n(); this._q = Q4.n();
    this.computeInvBind();
  }
  computeInvBind() {
    const m = M4.n(), tmp = M4.n();
    for (let i = 0; i < this.n; i++) {
      const p = BONE_PARENT[i];
      const ox = this.rest[i*3], oy = this.rest[i*3+1], oz = this.rest[i*3+2];
      M4.trn(m, ox, oy, oz);
      this.world.set(m, i*16);
    }
    for (let i = 0; i < this.n; i++) {
      const w = this.world.subarray(i*16, i*16+16);
      M4.inv(tmp, w);
      this.invBind.set(tmp, i*16);
    }
  }
  reset() { this.rot.fill(0); this.trans.fill(0); }
  setRot(b, x, y, z) { this.rot[b*3]=x; this.rot[b*3+1]=y; this.rot[b*3+2]=z; }
  addRot(b, x, y, z) { this.rot[b*3]+=x; this.rot[b*3+1]+=y; this.rot[b*3+2]+=z; }
  pose() {
    const m = this._m, p = this._p, q = this._q;
    for (let i = 0; i < this.n; i++) {
      const par = BONE_PARENT[i];
      /* local offset from parent's rest position */
      let ox = this.rest[i*3], oy = this.rest[i*3+1], oz = this.rest[i*3+2];
      if (par >= 0) { ox -= this.rest[par*3]; oy -= this.rest[par*3+1]; oz -= this.rest[par*3+2]; }
      Q4.euler(q, this.rot[i*3], this.rot[i*3+1], this.rot[i*3+2]);
      M4.trs(m, ox + this.trans[i*3], oy + this.trans[i*3+1], oz + this.trans[i*3+2],
             q[0], q[1], q[2], q[3], 1, 1, 1);
      if (par < 0) this.world.set(m, i*16);
      else {
        M4.mul(p, this.world.subarray(par*16, par*16+16), m);
        this.world.set(p, i*16);
      }
    }
    for (let i = 0; i < this.n; i++) {
      M4.mul(m, this.world.subarray(i*16, i*16+16), this.invBind.subarray(i*16, i*16+16));
      this.skin.set(m, i*16);
      /* the shader reconstructs mat4 from four column texels, so upload as-is */
      this.tex.set(m, i*16);
    }
    return this;
  }
  bonePos(b, out) {
    const o = b*16;
    out[0] = this.world[o+12]; out[1] = this.world[o+13]; out[2] = this.world[o+14];
    return out;
  }
}

/* ==========================================================================
   BODY MESH
   ======================================================================== */
const BODY = {
  /* ---------------------------------------------------------------------
     ANTHROPOMETRY
     Half-widths and half-depths in metres for a 1.78 m reference figure,
     sampled along the trunk from the pelvic floor (t=0) to the acromion
     (t=1). Values follow standard adult proportions rather than a tube:
     the waist is genuinely narrower than both hip and ribcage, the chest is
     deeper than it is wide, and the shoulders carry the widest span.
     --------------------------------------------------------------------- */
  TRUNK: [
    /* t      halfW   halfD   — pelvis */
    [0.00,  0.118,  0.094],
    [0.10,  0.133,  0.108],   // iliac crest
    [0.22,  0.126,  0.101],
    [0.36,  0.108,  0.089],   // natural waist — the narrowest point
    [0.50,  0.121,  0.101],
    [0.64,  0.142,  0.116],   // lower ribcage
    [0.78,  0.156,  0.124],   // sternum
    [0.90,  0.166,  0.118],   // upper chest
    [1.00,  0.196,  0.104],   // acromion span
  ],
  trunkAt(t, build, fem, out) {
    const T = this.TRUNK;
    let i = 0;
    while (i < T.length - 2 && T[i+1][0] < t) i++;
    const a = T[i], b = T[i+1];
    const f = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
    let w = lerp(a[1], b[1], f), d = lerp(a[2], b[2], f);
    /* build widens the trunk mostly through the ribcage and shoulders */
    const k = 0.72 + build * 0.56;
    w *= k; d *= k * (1 + build * 0.10);
    if (fem) {
      /* narrower shoulders, wider hips, defined waist */
      w *= lerp(1.09, 0.90, t);
      d *= lerp(1.03, 0.95, t);
      if (t > 0.66 && t < 0.94) { const c = 1 - abs(t - 0.80) / 0.14;
        d *= 1 + c * 0.16; w *= 1 + c * 0.03; }
    }
    out[0] = w; out[1] = d;
    return out;
  },

  /* ---------------------------------------------------------------------
     FACE FIELD
     A radial displacement applied to a unit sphere. Each term is a localised
     gaussian in (nx = left/right, ny = down/up, nz = back/front), so the
     features compose the way real anatomy does instead of reading as a
     lumpy ball. Tuned against a front and profile silhouette.
     --------------------------------------------------------------------- */
  faceDisplace(nx, ny, nz, f) {
    const ax = abs(nx);
    const G = (v) => Math.exp(-v);
    let r = 1;

    /* --- cranial mass: occiput fuller than the face, sides flattened --- */
    r *= 1 - 0.075 * sat(-nz) * sat(ny + 0.25);
    r *= 1 - 0.150 * ax * ax;                       // parietal flattening
    r *= 1 - 0.055 * sat(ny - 0.55);                // slightly flat crown

    /* --- the face plane: the front of a head is flat, not spherical ---- */
    const facePlane = sat(nz - 0.25) * sat(1 - ax * 1.25) * sat(ny + 0.75);
    r *= 1 - 0.085 * facePlane;

    /* --- jaw: angle at the back, taper to the chin -------------------- */
    const below = sat(-(ny + 0.05) * 1.9);
    r *= 1 - 0.34 * below * ax * (1 - sat(nz - 0.4)) - 0.075 * below;
    const gonion = G(Math.pow((ax - 0.62) * 5.2, 2) + Math.pow((ny + 0.45) * 4.4, 2)
                     + Math.pow((nz - 0.20) * 2.4, 2));
    r += 0.030 * gonion * f.jaw;

    /* --- chin: forward, narrow, with a mental crease above ------------ */
    const chin = G(Math.pow((ny + 0.74) * 3.0, 2) + Math.pow(nx * 4.6, 2)
                   + Math.pow((nz - 0.86) * 2.1, 2));
    r += 0.082 * chin * f.chin;
    r -= 0.016 * G(Math.pow((ny + 0.58) * 12.0, 2) + Math.pow(nx * 4.0, 2)) * sat(nz - 0.5);

    /* --- brow ridge and glabella -------------------------------------- */
    const brow = G(Math.pow((ny - 0.19) * 7.4, 2) + Math.pow((nz - 0.84) * 2.7, 2))
                 * sat(1 - ax * 1.35);
    r += 0.038 * brow * f.brow;
    r += 0.012 * G(Math.pow(nx * 9.0, 2) + Math.pow((ny - 0.15) * 9.0, 2)) * sat(nz - 0.6);

    /* --- orbits: sockets, with a lid ridge above and a bag below ------ */
    for (let s = -1; s <= 1; s += 2) {
      const dx = (nx - s * 0.335) * 4.9;
      const eye = G(dx*dx + Math.pow((ny - 0.045) * 7.2, 2) + Math.pow((nz - 0.78) * 2.1, 2));
      r -= 0.052 * eye;
      r += 0.020 * G(dx*dx + Math.pow((ny - 0.145) * 12.0, 2) + Math.pow((nz - 0.80) * 2.4, 2));
      r += 0.011 * G(dx*dx + Math.pow((ny + 0.075) * 13.0, 2) + Math.pow((nz - 0.80) * 2.4, 2));
    }

    /* --- nose: root, dorsum, tip, alae, nostril shadow ---------------- */
    const mid = G(Math.pow(nx * 10.5, 2));
    r -= 0.020 * mid * G(Math.pow((ny - 0.135) * 13.0, 2)) * sat(nz - 0.5);   // nasion
    const dorsum = mid * G(Math.pow((ny + 0.03) * 3.1, 2)) * sat(nz * 1.6 - 0.30);
    r += 0.050 * dorsum * f.nose;
    const tip = G(Math.pow(nx * 8.2, 2) + Math.pow((ny + 0.215) * 8.6, 2)
                  + Math.pow((nz - 0.94) * 2.5, 2));
    r += 0.061 * tip * f.nose;
    for (let s = -1; s <= 1; s += 2) {
      r += 0.024 * G(Math.pow((nx - s*0.115) * 13.0, 2) + Math.pow((ny + 0.245) * 11.0, 2)
                     + Math.pow((nz - 0.86) * 3.0, 2)) * f.nose;
      r -= 0.014 * G(Math.pow((nx - s*0.075) * 20.0, 2) + Math.pow((ny + 0.295) * 18.0, 2)
                     + Math.pow((nz - 0.88) * 4.0, 2));
    }

    /* --- cheekbones and the hollow beneath ---------------------------- */
    for (let s = -1; s <= 1; s += 2) {
      const dx = (nx - s * 0.50) * 3.7;
      r += 0.034 * G(dx*dx + Math.pow((ny - 0.02) * 5.4, 2) + Math.pow((nz - 0.58) * 2.1, 2)) * f.cheek;
      r -= 0.016 * G(Math.pow((nx - s*0.42) * 5.0, 2) + Math.pow((ny + 0.20) * 6.4, 2)
                     + Math.pow((nz - 0.64) * 2.3, 2)) * f.cheek;
    }

    /* --- mouth: upper and lower lip, philtrum, corner recess ---------- */
    const lipX = G(Math.pow(nx * 4.6, 2));
    r += 0.026 * lipX * G(Math.pow((ny + 0.345) * 15.0, 2) + Math.pow((nz - 0.90) * 2.9, 2)) * f.lips;
    r += 0.030 * lipX * G(Math.pow((ny + 0.430) * 14.0, 2) + Math.pow((nz - 0.89) * 2.9, 2)) * f.lips;
    r -= 0.018 * lipX * G(Math.pow((ny + 0.387) * 34.0, 2)) * sat(nz - 0.55);
    r -= 0.010 * G(Math.pow(nx * 16.0, 2) + Math.pow((ny + 0.285) * 16.0, 2)) * sat(nz - 0.7);
    for (let s = -1; s <= 1; s += 2)
      r -= 0.012 * G(Math.pow((nx - s*0.18) * 9.0, 2) + Math.pow((ny + 0.385) * 12.0, 2)
                     + Math.pow((nz - 0.80) * 3.0, 2));

    /* --- temple hollow and the mastoid behind the ear ---------------- */
    r -= 0.028 * G(Math.pow((ax - 0.80) * 5.2, 2) + Math.pow((ny - 0.27) * 4.6, 2));
    /* --- blend into the neck at the base ------------------------------ */
    r = lerp(r, 0.60, sat((-ny - 0.84) * 5.5));
    return r;
  },

  head(B, cx, cy, cz, size, f, skinCol, boneIdx, lod) {
    const seg = lod ? 18 : 30, rings = lod ? 16 : 26;
    const base = B.nv;
    B.mat(TEX.id("skin"), 1, 1, 1).colv(skinCol, 0).uv(2.6);
    B.bone1(boneIdx);
    for (let j = 0; j <= rings; j++) {
      const v = j/rings, th = v*PI, st = sin(th), ct = cos(th);
      for (let i = 0; i <= seg; i++) {
        const u = i/seg, ph = u*TAU;
        const nx = st*sin(ph), ny = ct, nz = st*cos(ph);
        /* Bind the lower front of the face to the jaw bone so speech actually
           opens the mouth. Weight ramps in below the lip line and only on the
           forward hemisphere, so the skull and ears stay put. */
        const jw = sat((-(ny) - 0.30) / 0.42) * sat(nz + 0.15) * 0.92;
        if (jw > 0.001) B.bones(boneIdx, 1-jw, BONE.JAW, jw, 0,0,0,0);
        else B.bone1(boneIdx);
        const r = this.faceDisplace(nx, ny, nz, f);
        /* head box is 0.152 wide x 0.222 tall x 0.196 deep at 1.78 m */
        B.vert(cx + nx*r*size*0.76, cy + ny*r*size*1.00, cz + nz*r*size*0.88,
               nx, ny, nz, u*2.4, v*2.0);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
    B.smoothNormals(0.0006);

    /* --- eyes: sclera, iris, pupil, and a lash line that reads at range - */
    const ex0 = 0.335*size*0.76, ey0 = 0.045*size*1.00, ez0 = 0.735*size*0.88;
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s*ex0, ey = cy + ey0, ez = cz + ez0;
      B.mat(TEX.id("marble"), .16, 0, 0).col(.90,.90,.91,0).uv(3);
      B.sphere(ex, ey, ez, size*0.098, 12, 10, 1);
      B.mat(TEX.id("tech"), .20, .1, 0).colv(f.eyeCol, f.eyeGlow||0).uv(4);
      B.sphere(ex, ey, ez + size*0.045, size*0.048, 12, 10, 1);
      B.mat(TEX.id("leather"), .45, 0, 0).col(.04,.035,.035,0);
      B.sphere(ex, ey, ez + size*0.070, size*0.023, 8, 6, 1);
      /* eyelid rim: a thin dark torus arc gives the eye a socket edge */
      B.mat(TEX.id("skin"), 1, 1, 1).col(skinCol[0]*.55, skinCol[1]*.48, skinCol[2]*.46, 0);
      const m0 = B.nv;
      B.cylinder(0, 0, 0, size*0.105, size*0.105, size*0.012, 14, false, 3);
      const M = M4.n(); M4.trs(M, ex, ey + size*0.052, ez - size*0.010,
                               0.7071, 0, 0, 0.7071, 1, 1, 0.55);
      B.transform(m0, M);
    }
    /* --- brows ------------------------------------------------------- */
    if (!lod) {
    B.mat(TEX.id("hair"), 1, .1, 0).colv(f.hairCol, 0).uv(4);
    for (let s = -1; s <= 1; s += 2) {
      for (let k = 0; k < 5; k++) {
        const t = k/4;
        const bx = cx + s*(0.20 + t*0.26)*size*0.76;
        const by = cy + (0.155 - t*t*0.030)*size*1.00;
        const bz = cz + (0.80 - t*0.10)*size*0.88;
        B.sphere(bx, by, bz, size*0.030*(1-t*0.35), 6, 4, 0.42);
      }
    }
    }
    /* --- ears: helix ring plus a concha bowl -------------------------- */
    B.mat(TEX.id("skin"), 1, 1, 1).colv(skinCol, 0).uv(3);
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s*size*0.705, ey = cy + size*0.015, ez = cz - size*0.075;
      let m0 = B.nv;
      B.lathe([0.052,-0.055, 0.070,-0.030, 0.074,0.010, 0.062,0.048, 0.030,0.068,
               0.0,0.070], 12, 0, 0, 0, 1, 1, 0);
      let M = M4.n();
      M4.trs(M, ex, ey, ez, 0.7071*s, 0, 0, 0.7071, size*0.95, size*0.95, size*0.62);
      B.transform(m0, M);
      m0 = B.nv;
      B.sphere(0, 0, 0, 0.040, 8, 6, 1);
      M4.trs(M, ex - s*size*0.012, ey, ez + size*0.012, 0,0,0,1,
             size*0.55, size*1.05, size*0.75);
      B.transform(m0, M);
    }
    /* --- hair: a shaped cap plus a style-dependent mass --------------- */
    if (f.hair > 0) {
      B.mat(TEX.id("hair"), 1, .2, 0).colv(f.hairCol, 0).uv(3.4);
      const hb = B.nv, hseg = 22, hrings = 16;
      const style = f.hairStyle || 0;
      for (let j = 0; j <= hrings; j++) {
        const v = j/hrings, th = v*PI*0.74, st = sin(th), ct = cos(th);
        for (let i = 0; i <= hseg; i++) {
          const u = i/hseg, ph = u*TAU;
          const nx = st*sin(ph), ny = ct, nz = st*cos(ph);
          let r = this.faceDisplace(nx, ny, nz, f) * (1.05 + 0.075*f.hair);
          /* pull the hairline back off the forehead */
          const fwd = sat(nz) * sat(ny*2.1);
          r *= 1 - 0.32 * fwd * (1 - f.hair*0.35);
          if (style === 1) r *= 1 - 0.55 * sat(abs(nx) * 2.4 - 0.45);      // mohawk
          if (style === 2) r *= 1 + 0.22 * sat(-nz) * sat(-ny + 0.4);      // back volume
          if (style === 3) r *= 0.94;                                       // buzz
          B.vert(cx + nx*r*size*0.76, cy + ny*r*size*1.00, cz + nz*r*size*0.88,
                 nx, ny, nz, u*3, v*3);
        }
      }
      for (let j = 0; j < hrings; j++) for (let i = 0; i < hseg; i++) {
        const a = hb+j*(hseg+1)+i, b = a+hseg+1;
        B.idx.push(a, b, a+1, a+1, b, b+1);
      }
      if (style === 2) {   // ponytail
        const m0 = B.nv;
        B.lathe([0.0,0, 0.030,0.02, 0.038,0.10, 0.030,0.22, 0.010,0.30, 0,0.32], 10, 0,0,0,1,1,0);
        const M = M4.n();
        M4.trs(M, cx, cy + size*0.30, cz - size*0.78, -0.30, 0, 0, 0.954, size*1.6, size*1.6, size*1.6);
        B.transform(m0, M);
      }
    }
  },

  /* ---------------------------------------------------------------------
     LIMB — an elliptical tapered tube with a muscle belly, blended across
     two bones. Limbs are not circular in section: forearms and calves are
     noticeably flatter than they are wide.
     --------------------------------------------------------------------- */
  limb(B, p0, p1, prof, boneA, boneB, seg, flat) {
    seg = (seg || 14);
    if (BODY._lod) seg = max(6, (seg*0.6)|0);
    flat = flat === undefined ? 0.86 : flat;
    const dx = p1[0]-p0[0], dy = p1[1]-p0[1], dz = p1[2]-p0[2];
    const len = hypot(dx,dy,dz) || 1e-4;
    const ux = dx/len, uy = dy/len, uz = dz/len;
    let ax = 1, ay = 0, az = 0;
    if (abs(uy) < .99) { ax = 0; ay = 1; az = 0; }
    let tx = uy*az - uz*ay, ty = uz*ax - ux*az, tz = ux*ay - uy*ax;
    const tl = hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
    const bx = uy*tz - uz*ty, by = uz*tx - ux*tz, bz = ux*ty - uy*tx;
    const rings = prof.length - 1, base = B.nv;
    for (let j = 0; j <= rings; j++) {
      const t = j/rings;
      const r = prof[j];
      const w = sat((t - 0.28) / 0.44);
      B.bones(boneA, 1-w, boneB, w, 0, 0, 0, 0);
      for (let i = 0; i <= seg; i++) {
        const a = i/seg*TAU, ca = cos(a), sa = sin(a);
        const rr = r * (1 - (1-flat) * sa * sa);
        const nx = tx*ca + bx*sa, ny = ty*ca + by*sa, nz = tz*ca + bz*sa;
        B.vert(p0[0] + ux*len*t + nx*rr, p0[1] + uy*len*t + ny*rr, p0[2] + uz*len*t + nz*rr,
               nx, ny, nz, i/seg*1.8, t*len*1.6);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
  },
  /* sample a taper profile: r0 at the proximal end, rm at the belly, r1 distal */
  prof(n, r0, rm, r1, bulge) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i/n;
      let r = t < .5 ? lerp(r0, rm, smooth(t*2)) : lerp(rm, r1, smooth((t-.5)*2));
      if (bulge) r *= 1 + bulge * sin(t*PI) * 0.30;
      out.push(r);
    }
    return out;
  },

  /* ---------------------------------------------------------------------
     HAND — palm, four fingers of three phalanges, an opposed thumb.
     This is what sells a first-person view, so it gets real geometry.
     --------------------------------------------------------------------- */
  hand(B, x, y, z, s, bone, side, curl, lod) {
    B.bone1(bone);
    curl = curl === undefined ? 0.25 : curl;
    const m0 = B.nv;
    if (lod) {
      /* distant crowd: a mitten silhouette instead of twenty phalanges */
      B.lathe([0,0, 0.042,-0.006, 0.046,-0.040, 0.040,-0.105, 0.024,-0.155, 0,-0.162],
              8, 0, 0, 0, 1, 0.46, 0);
      B.sphere(-0.040*(side<0?-1:1), -0.040, 0.004, 0.017, 6, 5, 1.3);
      const Mq = M4.n(); M4.trs(Mq, x, y, z, 0, 0, 0, 1, s, s, s);
      B.transform(m0, Mq);
      return;
    }
    /* metacarpal block — wedge shaped, thicker at the thumb side */
    const pw = 0.043, pd = 0.019, pl = 0.098;
    for (let i = 0; i < 4; i++) {
      const t = i/3;
      const w = pw * (1 - t*0.10);
      B.box(-w, -pl*0.98, -pd*(1 - t*0.18), w, 0.014, pd*(1 - t*0.18));
      break;
    }
    B.lathe([0,0, pw*0.9,-0.004, pw,-0.030, pw*0.98,-0.070, pw*0.80,-0.098, 0,-0.104],
            10, 0, 0, 0, 1, pd/pw*1.0, 0);
    /* four fingers */
    const fx0 = [-0.031, -0.010, 0.011, 0.031];
    const flen = [0.078, 0.086, 0.080, 0.062];
    for (let i = 0; i < 4; i++) {
      const fx = fx0[i] * (side < 0 ? -1 : 1);
      const L = flen[i];
      let px = fx, py = -pl*0.96, pz = 0;
      let ang = 0;
      for (let ph = 0; ph < 3; ph++) {
        const segL = L * [0.44, 0.33, 0.23][ph];
        const rad = 0.0092 * (1 - ph*0.16) * (1 - i*0.05);
        ang += curl * [0.55, 0.75, 0.65][ph];
        const nx2 = px, ny2 = py - segL*cos(ang), nz2 = pz + segL*sin(ang);
        this.limb(B, [px, py, pz], [nx2, ny2, nz2],
                  this.prof(2, rad*1.12, rad, rad*0.88), bone, bone, 8, 0.88);
        /* knuckle */
        B.sphere(px, py, pz, rad*1.16, 6, 5, 1);
        px = nx2; py = ny2; pz = nz2;
      }
      B.sphere(px, py, pz, 0.0072, 6, 5, 1);
    }
    /* thumb: offset, rotated out of the palm plane */
    {
      const sx = -0.046 * (side < 0 ? -1 : 1);
      let px = sx, py = -pl*0.30, pz = 0.006;
      let ang = 0.55, out = 0.9 * (side < 0 ? -1 : 1);
      for (let ph = 0; ph < 2; ph++) {
        const segL = [0.040, 0.032][ph];
        const rad = [0.0118, 0.0100][ph];
        ang += curl * 0.5;
        const nx2 = px - segL*sin(ang)*out*0.7;
        const ny2 = py - segL*cos(ang)*0.55;
        const nz2 = pz + segL*sin(ang)*0.8;
        this.limb(B, [px,py,pz], [nx2,ny2,nz2], this.prof(2, rad*1.1, rad, rad*0.9), bone, bone, 8, 0.9);
        B.sphere(px, py, pz, rad*1.15, 6, 5, 1);
        px = nx2; py = ny2; pz = nz2;
      }
      B.sphere(px, py, pz, 0.0082, 6, 5, 1);
    }
    /* scale the whole hand to the figure and place it */
    const M = M4.n();
    M4.trs(M, x, y, z, 0, 0, 0, 1, s, s, s);
    B.transform(m0, M);
  },

  foot(B, x, y, z, s, bone) {
    B.bone1(bone);
    const m0 = B.nv;
    /* ankle -> instep -> toe box, with a sole under it */
    const P = (a,b,c) => [a,b,c];
    const sec = [
      { z:-0.070, w:0.036, y0:-0.030, y1: 0.052 },
      { z:-0.020, w:0.044, y0:-0.078, y1: 0.040 },
      { z: 0.045, w:0.048, y0:-0.086, y1: 0.006 },
      { z: 0.110, w:0.046, y0:-0.088, y1:-0.014 },
      { z: 0.150, w:0.036, y0:-0.086, y1:-0.030 },
    ];
    for (let i = 0; i < sec.length-1; i++) {
      const a = sec[i], b = sec[i+1];
      const ring = (q) => [[-q.w, q.y0],[q.w, q.y0],[q.w, q.y1],[-q.w, q.y1]];
      const A = ring(a), Bg = ring(b);
      for (let k = 0; k < 4; k++) {
        const k2 = (k+1)%4;
        B.quad(P(A[k][0],A[k][1],a.z), P(A[k2][0],A[k2][1],a.z),
               P(Bg[k2][0],Bg[k2][1],b.z), P(Bg[k][0],Bg[k][1],b.z), 1, 1);
      }
    }
    B.smoothNormals(0.0008);
    const M = M4.n(); M4.trs(M, x, y, z, 0,0,0,1, s, s, s);
    B.transform(m0, M);
  },

  /* =====================================================================
     FULL FIGURE
     ===================================================================== */
  build(cfg) {
    const B = new MeshBuilder(true);
    const lod = cfg.lod || 0;
    const s = cfg.height / 1.78;
    const R = rng(cfg.seed >>> 0);
    const P = (b) => [BONE_REST[b][0]*s, BONE_REST[b][1]*s, BONE_REST[b][2]*s];
    const skinL = TEX.id("skin");
    const sk = cfg.skin, build = cfg.build, fem = !!cfg.fem;
    const wd = [0,0];
    BODY._lod = lod;

    /* ---------------- trunk ------------------------------------------- */
    const y0 = 0.855*s, y1 = 1.475*s;
    const rings = lod ? 14 : 22, seg = lod ? 16 : 26;
    const base = B.nv;
    B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.2);
    for (let j = 0; j <= rings; j++) {
      const t = j/rings;
      const yy = lerp(y0, y1, t);
      this.trunkAt(t, build, fem, wd);
      const w = wd[0]*s, d = wd[1]*s;
      let ba = BONE.ROOT, bb = BONE.SPINE1, bw = 0;
      if (t < .24) { bw = t/.24; }
      else if (t < .52) { ba = BONE.SPINE1; bb = BONE.SPINE2; bw = (t-.24)/.28; }
      else { ba = BONE.SPINE2; bb = BONE.CHEST; bw = min(1,(t-.52)/.34); }
      B.bones(ba, 1-bw, bb, bw, 0,0,0,0);
      for (let i = 0; i <= seg; i++) {
        const a = i/seg*TAU, ca = cos(a), sa = sin(a);
        /* superellipse section: flatter front and back, rounded flanks —
           this is what stops a torso reading as a cylinder */
        const n = 2.6;
        const cx2 = Math.sign(ca) * Math.pow(abs(ca), 2/n);
        const cz2 = Math.sign(sa) * Math.pow(abs(sa), 2/n);
        let px = cx2*w, pz = cz2*d;
        /* spinal furrow down the back */
        if (sa < -0.55) pz *= 1 - 0.055 * sat(-sa - 0.55) * Math.exp(-ca*ca*6.0);
        /* sternum flattening at the front of the chest */
        if (sa > 0.6 && t > 0.6) pz *= 1 - 0.05*sat(t-0.6);
        const nx = cx2/max(w,1e-4), nz = cz2/max(d,1e-4), nl = hypot(nx,nz)||1;
        B.vert(px, yy, pz, nx/nl, 0.05, nz/nl, i/seg*2.0, t*1.9);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
    B.smoothNormals(0.0008);
    /* pelvic cap + glutes */
    B.bone1(BONE.ROOT);
    this.trunkAt(0, build, fem, wd);
    B.sphere(0, y0+0.030*s, 0, wd[0]*s*1.02, 18, 10, 0.60);
    B.sphere(0, y0+0.010*s, -wd[1]*s*0.36, wd[0]*s*0.86, 14, 9, 0.52);
    /* trapezius wedge between neck and shoulders */
    B.bones(BONE.CHEST, .7, BONE.NECK, .3, 0,0,0,0);
    this.trunkAt(1, build, fem, wd);
    B.sphere(0, y1-0.030*s, -0.010*s, wd[0]*s*0.86, 18, 10, 0.40);

    /* ---------------- neck -------------------------------------------- */
    B.bones(BONE.CHEST, .35, BONE.NECK, .65, 0,0,0,0);
    this.limb(B, [0, 1.428*s, -0.004*s], [0, 1.566*s, 0.010*s],
              this.prof(5, 0.068*s, 0.058*s, 0.052*s), BONE.NECK, BONE.HEAD, 14, 0.90);

    /* ---------------- head -------------------------------------------- */
    this.head(B, 0, 1.663*s, 0.010*s, 0.116*s, cfg.face, sk, BONE.HEAD, lod);

    /* ---------------- arms -------------------------------------------- */
    for (let si = 0; si < 2; si++) {
      const sd = si ? -1 : 1;
      const CL = si ? BONE.CLAV_R : BONE.CLAV_L, UA = si ? BONE.UARM_R : BONE.UARM_L;
      const FA = si ? BONE.FARM_R : BONE.FARM_L, HD = si ? BONE.HAND_R : BONE.HAND_L;
      const pU = P(UA), pF = P(FA), pH = P(HD);
      B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.4);
      /* deltoid cap */
      B.bones(CL, .35, UA, .65, 0,0,0,0);
      let m0 = B.nv;
      B.sphere(pU[0], pU[1]+0.012*s, pU[2], 0.068*s*(0.92+build*0.34), 16, 11, 1.08);
      /* upper arm: biceps belly, taper to the elbow */
      this.limb(B, pU, pF,
        this.prof(7, 0.056*s*(.92+build*.30), 0.052*s*(.92+build*.38), 0.040*s),
        UA, FA, 14, 0.90, build*.5);
      /* elbow */
      B.bone1(FA);
      B.sphere(pF[0], pF[1], pF[2], 0.038*s, 10, 8, 1);
      /* forearm: brachioradialis swell then a flat wrist */
      this.limb(B, pF, pH,
        this.prof(7, 0.041*s, 0.038*s*(.95+build*.30), 0.026*s),
        FA, HD, 14, 0.80);
      this.hand(B, pH[0], pH[1]-0.006*s, pH[2], s, HD, sd, 0.22, lod);
    }

    /* ---------------- legs -------------------------------------------- */
    for (let si = 0; si < 2; si++) {
      const TH = si ? BONE.THIGH_R : BONE.THIGH_L, SH = si ? BONE.SHIN_R : BONE.SHIN_L;
      const FT = si ? BONE.FOOT_R : BONE.FOOT_L;
      const pT = P(TH), pS = P(SH), pF = P(FT);
      B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.2);
      /* thigh: quadriceps mass high, narrowing to the knee */
      this.limb(B, [pT[0], pT[1]+0.030*s, pT[2]], pS,
        this.prof(8, 0.092*s*(.92+build*.34)*(fem?1.05:1), 0.078*s*(.92+build*.36), 0.050*s),
        TH, SH, 16, 0.92);
      /* knee */
      B.bone1(SH);
      B.sphere(pS[0], pS[1], pS[2], 0.049*s, 12, 9, 1.05);
      /* calf: belly high on the shank, thin at the ankle */
      const cp = [];
      for (let i = 0; i <= 8; i++) {
        const t = i/8;
        cp.push(lerp(0.052, 0.026, smooth(t)) * s * (1 + (1-t)*0.30*sin(sat(t*2.4)*PI)*(0.9+build*0.5)));
      }
      this.limb(B, pS, pF, cp, SH, FT, 16, 0.86);
      this.foot(B, pF[0], pF[1], pF[2], s, FT);
    }

    this.clothe(B, cfg, s, P);
    this.cyber(B, cfg, s, P, R);

    BODY._lod = 0;
    const mesh = B.build();
    if (mesh) { mesh.height = cfg.height; mesh.cfg = cfg; }
    return mesh;
  },

  clothe(B, cfg, s, P) {
    const C = cfg.clothes, R = rng((cfg.seed ^ 0x1234) >>> 0);
    const fab = TEX.id("fabric"), lea = TEX.id("leather");
    const wd = [0,0];
    /* --- trousers ----------------------------------------------------- */
    if (C.legs !== "none") {
      const layer = C.legs === "leather" ? lea : fab;
      B.mat(layer, 1, C.legs === "leather" ? .1 : 0, 0).colv(C.legCol, 0).uv(1.8);
      for (let si = 0; si < 2; si++) {
        const TH = si ? BONE.THIGH_R : BONE.THIGH_L, SH = si ? BONE.SHIN_R : BONE.SHIN_L;
        const FT = si ? BONE.FOOT_R : BONE.FOOT_L;
        const pT = P(TH), pS = P(SH), pF = P(FT);
        const cut = C.legs === "shorts" ? .55 : 1;
        const mid = [lerp(pT[0],pS[0],cut), lerp(pT[1],pS[1],cut), lerp(pT[2],pS[2],cut)];
        this.limb(B, [pT[0],pT[1]+0.055*s,pT[2]], mid,
          this.prof(6, 0.104*s, 0.088*s, 0.062*s), TH, SH, 14, 0.94);
        if (cut >= 1) this.limb(B, pS, [pF[0], pF[1]+0.055*s, pF[2]],
          this.prof(6, 0.064*s, 0.060*s, 0.048*s), SH, FT, 14, 0.90);
      }
      B.bone1(BONE.ROOT);
      this.trunkAt(0.10, cfg.build, cfg.fem, wd);
      B.cylinder(0, 0.900*s, 0, wd[0]*s*1.09, wd[0]*s*1.07, 0.15*s, 22, false, 1.4);
    }
    /* --- boots -------------------------------------------------------- */
    B.mat(lea, 1, .15, 0).colv(C.bootCol, 0).uv(2.2);
    for (let si = 0; si < 2; si++) {
      const FT = si ? BONE.FOOT_R : BONE.FOOT_L, SH = si ? BONE.SHIN_R : BONE.SHIN_L;
      const pF = P(FT), pS = P(SH);
      B.bone1(FT);
      const m0 = B.nv;
      B.box(-0.054*s, -0.094*s, -0.082*s, 0.054*s, 0.048*s, 0.166*s);
      B.box(-0.058*s, -0.100*s, -0.086*s, 0.058*s, -0.062*s, 0.172*s);   // sole
      B.translate(m0, pF[0], pF[1], pF[2]);
      B.bones(SH, .5, FT, .5, 0,0,0,0);
      const m1 = B.nv;
      B.cylinder(0, 0, 0, 0.072*s, 0.068*s, C.bootHigh ? 0.24*s : 0.10*s, 14, false, 1.6);
      B.translate(m1, pF[0], pF[1]+0.036*s, pF[2]);
    }
    /* --- torso garment, following the real trunk section -------------- */
    if (C.torso !== "none") {
      const layer = C.torso === "jacket" || C.torso === "coat" ? lea : fab;
      B.mat(layer, 1, C.torso === "jacket" ? .12 : 0, 0).colv(C.torsoCol, 0).uv(1.7);
      const yA = 0.855*s, yB = 1.480*s;
      const bot = C.torso === "coat" ? 0.70*s : (C.torso === "crop" ? 1.12*s : yA - 0.02*s);
      const rings = 16, seg = 24, base = B.nv;
      for (let j = 0; j <= rings; j++) {
        const t = j/rings;
        const yy = lerp(bot, yB, t);
        const tt = sat(invLerp(yA, yB, yy));
        this.trunkAt(tt, cfg.build, cfg.fem, wd);
        const infl = 1.085 + (C.torso === "coat" ? .10 : 0) + (C.bulk||0);
        const w = wd[0]*s*infl, d = wd[1]*s*infl;
        let ba = BONE.ROOT, bb = BONE.SPINE1, bw = 0;
        if (tt < .24) { bw = tt/.24; }
        else if (tt < .52) { ba = BONE.SPINE1; bb = BONE.SPINE2; bw = (tt-.24)/.28; }
        else { ba = BONE.SPINE2; bb = BONE.CHEST; bw = min(1,(tt-.52)/.34); }
        B.bones(ba, 1-bw, bb, bw, 0,0,0,0);
        for (let i = 0; i <= seg; i++) {
          const a = i/seg*TAU, ca = cos(a), sa = sin(a);
          const n = 2.6;
          const cx2 = Math.sign(ca)*Math.pow(abs(ca), 2/n);
          const cz2 = Math.sign(sa)*Math.pow(abs(sa), 2/n);
          const nx = cx2/max(w,1e-4), nz = cz2/max(d,1e-4), nl = hypot(nx,nz)||1;
          B.vert(cx2*w, yy, cz2*d, nx/nl, 0.05, nz/nl, i/seg*2.0, t*2.2);
        }
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
        const a = base+j*(seg+1)+i, b = a+seg+1;
        B.idx.push(a, b, a+1, a+1, b, b+1);
      }
      B.smoothNormals(0.0008);
      /* front closure line */
      B.mat(layer, 1, .3, 0).col(C.torsoCol[0]*.5, C.torsoCol[1]*.5, C.torsoCol[2]*.5, 0);
      this.trunkAt(0.8, cfg.build, cfg.fem, wd);
      B.box(-0.012*s, bot, wd[1]*s*1.06, 0.012*s, yB-0.03*s, wd[1]*s*1.12);
      /* sleeves */
      if (C.sleeves) {
        B.mat(layer, 1, C.torso === "jacket" ? .12 : 0, 0).colv(C.torsoCol, 0).uv(1.7);
        for (let si = 0; si < 2; si++) {
          const UA = si ? BONE.UARM_R : BONE.UARM_L, FA = si ? BONE.FARM_R : BONE.FARM_L;
          const HD = si ? BONE.HAND_R : BONE.HAND_L;
          const pU = P(UA), pF = P(FA), pH = P(HD);
          this.limb(B, [pU[0], pU[1]+0.045*s, pU[2]], pF,
            this.prof(6, 0.080*s, 0.064*s, 0.050*s), UA, FA, 14, 0.92);
          if (C.sleeves === "long")
            this.limb(B, pF, [pH[0],pH[1]+0.030*s,pH[2]],
              this.prof(6, 0.050*s, 0.045*s, 0.036*s), FA, HD, 14, 0.88);
          if (C.pads) {
            B.bones(si?BONE.CLAV_R:BONE.CLAV_L, .45, UA, .55, 0,0,0,0);
            B.mat(lea, .9, .2, 0).colv(C.padCol||C.torsoCol, 0).uv(2);
            const m0 = B.nv;
            B.sphere(0,0,0, 0.090*s, 14, 10, .66);
            B.translate(m0, pU[0], pU[1]+0.030*s, pU[2]);
            B.mat(layer, 1, 0, 0).colv(C.torsoCol, 0);
          }
        }
      }
      /* collar */
      B.bones(BONE.CHEST, .45, BONE.NECK, .55, 0,0,0,0);
      B.mat(layer, 1, 0, 0).colv(C.torsoCol, 0).uv(2.4);
      B.cylinder(0, 1.446*s, 0.004*s, 0.084*s, 0.098*s, 0.078*s, 18, false, 2);
    }
    /* --- headgear ----------------------------------------------------- */
    if (C.head === "cap" || C.head === "beanie") {
      B.bone1(BONE.HEAD);
      B.mat(fab, 1, 0, 0).colv(C.headCol, 0).uv(2.6);
      const m0 = B.nv;
      B.sphere(0, 0, 0, 0.106*s, 18, 11, C.head === "cap" ? .80 : 1.02);
      B.translate(m0, 0, 1.690*s, 0.008*s);
      if (C.head === "cap") B.box(-0.086*s, 1.674*s, 0.068*s, 0.086*s, 1.688*s, 0.196*s);
    } else if (C.head === "visor") {
      B.bone1(BONE.HEAD);
      B.mat(TEX.id("holoPanel"), .12, .6, 0).colv(C.headCol, .9).uv(3);
      B.box(-0.094*s, 1.646*s, 0.060*s, 0.094*s, 1.692*s, 0.112*s);
    } else if (C.head === "respirator") {
      B.bone1(BONE.HEAD);
      B.mat(TEX.id("metalPanel"), .7, 1, 0).col(.2,.21,.23,0).uv(3);
      B.box(-0.060*s, 1.582*s, 0.066*s, 0.060*s, 1.650*s, 0.130*s);
      B.mat(TEX.id("perf"), 1, 1, 0).col(.3,.3,.32,0).uv(4);
      B.cylinder(-0.030*s, 1.594*s, 0.106*s, 0.021*s, 0.021*s, 0.030*s, 8, true, 3);
      B.cylinder( 0.030*s, 1.594*s, 0.106*s, 0.021*s, 0.021*s, 0.030*s, 8, true, 3);
    }
  },

  cyber(B, cfg, s, P, R) {
    const cw = cfg.cyber || {};
    const met = TEX.id("metalPanel"), tec = TEX.id("tech");
    if (cw.armL || cw.armR) {
      for (let si = 0; si < 2; si++) {
        if (si === 0 && !cw.armL) continue;
        if (si === 1 && !cw.armR) continue;
        const UA = si ? BONE.UARM_R : BONE.UARM_L, FA = si ? BONE.FARM_R : BONE.FARM_L;
        const HD = si ? BONE.HAND_R : BONE.HAND_L;
        const pU = P(UA), pF = P(FA), pH = P(HD);
        B.mat(met, .45, 1, 0).col(.42,.44,.48,0).uv(2.6);
        this.limb(B, pF, pH, this.prof(6, 0.052*s, 0.046*s, 0.030*s), FA, HD, 12, 0.82);
        B.mat(tec, .5, 1, 0).col(.5,.5,.55, .35).uv(3);
        this.limb(B, [pU[0],pU[1]-0.06*s,pU[2]], pF,
                  this.prof(5, 0.052*s, 0.048*s, 0.050*s), UA, FA, 12, 0.86);
      }
    }
    if (cw.optics) {
      B.bone1(BONE.HEAD);
      B.mat(tec, .3, 1, 0).col(.55,.58,.62, 0).uv(4);
      B.box(-0.100*s, 1.652*s, 0.030*s, -0.052*s, 1.694*s, 0.086*s);
      B.mat(TEX.id("holoPanel"), .1, .5, 0).colv(cw.opticCol||[0,.9,1], 2.2).uv(4);
      B.box(-0.098*s, 1.658*s, 0.084*s, -0.054*s, 1.688*s, 0.090*s);
    }
    if (cw.jaw) {
      B.bone1(BONE.HEAD);
      B.mat(met, .35, 1, 0).col(.5,.52,.55,0).uv(3.4);
      B.box(-0.062*s, 1.580*s, 0.040*s, 0.062*s, 1.622*s, 0.108*s);
    }
    if (cw.spine) {
      B.bones(BONE.SPINE2, .5, BONE.CHEST, .5, 0,0,0,0);
      B.mat(tec, .4, 1, 0).col(.4,.42,.46, .5).uv(3);
      const wd = [0,0];
      this.trunkAt(0.6, cfg.build, cfg.fem, wd);
      for (let i = 0; i < 4; i++)
        B.box(-0.030*s, (1.16+i*0.075)*s, -wd[1]*s*1.16,
               0.030*s, (1.20+i*0.075)*s, -wd[1]*s*1.02);
    }
    if (cw.legs) {
      for (let si = 0; si < 2; si++) {
        const SH = si ? BONE.SHIN_R : BONE.SHIN_L, FT = si ? BONE.FOOT_R : BONE.FOOT_L;
        const pS = P(SH), pF = P(FT);
        B.mat(met, .4, 1, 0).col(.46,.47,.5,0).uv(2.4);
        this.limb(B, pS, pF, this.prof(6, 0.062*s, 0.052*s, 0.034*s), SH, FT, 14, 0.86);
        B.mat(tec, .5, 1, 0).colv(cw.legCol||[.2,1,.7], .6).uv(3);
        this.limb(B, [pS[0],pS[1]-0.10*s,pS[2]], [pS[0],pS[1]-0.18*s,pS[2]],
                  this.prof(3, 0.058*s, 0.058*s, 0.058*s), SH, SH, 12, 0.86);
      }
    }
  },
};

/* ==========================================================================
   PROCEDURAL ANIMATION
   Every clip is an analytic function of phase. No data, no interpolation
   tables — which is why 120 pedestrians can each run their own cycle.
   ======================================================================== */
const ANIM = {
  /* ---- neutral standing pose with breathing and idle sway ------------- */
  idle(sk, t, seed, weapon) {
    sk.reset();
    const br = sin(t*1.15 + seed)*0.5+0.5;
    const sway = sin(t*0.44 + seed*2.1);
    const sway2 = sin(t*0.31 + seed*3.7);
    sk.setRot(BONE.ROOT, 0.02 + br*0.012, sway*0.028, sway2*0.020);
    sk.trans[BONE.ROOT*3+1] = br*0.008;
    sk.setRot(BONE.SPINE1, -0.02 - br*0.010, sway*0.020, -sway2*0.012);
    sk.setRot(BONE.SPINE2, -0.02, sway*0.016, 0);
    sk.setRot(BONE.CHEST, br*0.028, sway*0.012, 0);
    sk.setRot(BONE.NECK, -0.03, sin(t*0.29+seed*5)*0.10, 0);
    sk.setRot(BONE.HEAD, sin(t*0.23+seed*7)*0.05, sin(t*0.19+seed*4)*0.16, 0);
    /* arms hang with a natural carry angle, elbows slightly flexed */
    const armSw = sin(t*0.44 + seed*2.1)*0.03;
    sk.setRot(BONE.UARM_L, 0.04+armSw, 0, -0.11);
    sk.setRot(BONE.FARM_L, 0.20, 0, -0.05);
    sk.setRot(BONE.UARM_R, 0.04-armSw, 0, 0.11);
    sk.setRot(BONE.FARM_R, 0.20, 0, 0.05);
    sk.setRot(BONE.THIGH_L, -0.02, 0, 0.012);
    sk.setRot(BONE.THIGH_R, -0.02, 0, -0.012);
    sk.setRot(BONE.SHIN_L, 0.04, 0, 0);
    sk.setRot(BONE.SHIN_R, 0.04, 0, 0);
    if (weapon) this.aimOverlay(sk, weapon, 0);
    return sk;
  },

  /* ---- locomotion: one function covers walk through sprint ------------ */
  locomotion(sk, phase, speed, t, seed, strafe) {
    sk.reset();
    const run = sat((speed - 1.8)/3.4);          // 0 walk .. 1 sprint
    const amp = lerp(0.42, 1.0, run);
    const p = phase*TAU;
    const sp = sin(p), cp = cos(p);
    const sp2 = sin(p*2);

    /* pelvis: vertical bob at 2x, lateral sway at 1x, counter-rotation */
    sk.trans[BONE.ROOT*3+1] = (-abs(sp2)*0.030 - 0.006) * amp - run*0.055;
    sk.trans[BONE.ROOT*3]   = cos(p)*0.022*amp;
    sk.setRot(BONE.ROOT, 0.05 + run*0.30, -sp*0.14*amp, cos(p)*0.055*amp);

    /* spine leans into the run and counter-twists against the pelvis */
    sk.setRot(BONE.SPINE1, 0.02 + run*0.12, sp*0.07*amp, 0);
    sk.setRot(BONE.SPINE2, 0.01 + run*0.08, sp*0.06*amp, 0);
    sk.setRot(BONE.CHEST, -0.02, sp*0.10*amp, 0);
    sk.setRot(BONE.NECK, -run*0.16, -sp*0.05*amp, 0);
    sk.setRot(BONE.HEAD, -run*0.08 + abs(sp2)*0.02, -sp*0.03*amp, 0);

    /* legs: thigh swing, knee flex gated to the swing phase, ankle roll */
    for (let si = 0; si < 2; si++) {
      const o = si ? PI : 0;
      const ph = p + o;
      const s1 = sin(ph), c1 = cos(ph);
      const TH = si ? BONE.THIGH_R : BONE.THIGH_L;
      const SH = si ? BONE.SHIN_R : BONE.SHIN_L;
      const FT = si ? BONE.FOOT_R : BONE.FOOT_L;
      const swing = s1*0.62*amp;
      /* knee bends hard while the foot is off the ground (s1 > 0) */
      const lift = sat(s1);
      const knee = (lift*lift*1.35 + 0.06) * amp + run*0.16;
      sk.setRot(TH, -swing - run*0.22, 0, (si?-1:1)*0.03);
      sk.setRot(SH, knee, 0, 0);
      sk.setRot(FT, swing*0.42 - knee*0.55 + 0.06, 0, 0);
      sk.setRot(si ? BONE.TOE_R : BONE.TOE_L, sat(-s1)*0.5*amp, 0, 0);
    }
    /* arms counter-swing; elbow flexion rises with speed */
    for (let si = 0; si < 2; si++) {
      const o = si ? 0 : PI;
      const ph = p + o;
      const s1 = sin(ph);
      const UA = si ? BONE.UARM_R : BONE.UARM_L;
      const FA = si ? BONE.FARM_R : BONE.FARM_L;
      const sd = si ? 1 : -1;
      sk.setRot(UA, s1*0.72*amp - run*0.30, 0, sd*(0.11 + run*0.10));
      sk.setRot(FA, 0.22 + run*0.85 + sat(s1)*0.42*amp, 0, sd*0.05);
      sk.setRot(si?BONE.HAND_R:BONE.HAND_L, 0.1, 0, 0);
    }
    if (strafe) {
      sk.addRot(BONE.ROOT, 0, strafe*0.22, 0);
      sk.addRot(BONE.CHEST, 0, -strafe*0.14, 0);
    }
    return sk;
  },

  /* ---- weapon carry / aim, layered on top of any base pose ------------ */
  aimOverlay(sk, w, aimAmt, pitch) {
    /* w: 0 = pistol one-handed, 1 = two-handed long gun, 2 = melee */
    const a = sat(aimAmt);
    pitch = pitch || 0;
    if (w === 2) {
      sk.setRot(BONE.UARM_R, -0.55 - a*0.5, -0.3, 0.5);
      sk.setRot(BONE.FARM_R, 1.10, 0, 0);
      sk.setRot(BONE.UARM_L, -0.12, 0, -0.3);
      sk.setRot(BONE.FARM_L, 0.55, 0, 0);
      sk.addRot(BONE.CHEST, 0, -0.22, 0);
      return;
    }
    /* right arm presents the weapon */
    sk.setRot(BONE.UARM_R, lerp(-0.30, -1.32, a) + pitch*0.6, lerp(-0.10, -0.24, a), lerp(0.28, 0.14, a));
    sk.setRot(BONE.FARM_R, lerp(1.05, 0.22, a), 0, 0);
    sk.setRot(BONE.HAND_R, 0, 0, -0.12);
    if (w === 1) {
      /* support hand comes across to the handguard */
      sk.setRot(BONE.UARM_L, lerp(-0.35, -1.18, a) + pitch*0.55, lerp(0.20, 0.52, a), lerp(-0.30, -0.42, a));
      sk.setRot(BONE.FARM_L, lerp(1.15, 0.86, a), 0, 0);
      sk.addRot(BONE.CHEST, 0, -0.16*a, 0);
      sk.addRot(BONE.NECK, pitch*0.3, -0.08*a, 0);
    } else {
      sk.setRot(BONE.UARM_L, lerp(-0.18, -0.95, a), lerp(0.05, 0.40, a), lerp(-0.16, -0.34, a));
      sk.setRot(BONE.FARM_L, lerp(0.90, 0.95, a), 0, 0);
      sk.addRot(BONE.CHEST, 0, -0.12*a, 0);
    }
    sk.addRot(BONE.SPINE2, pitch*0.18, 0, 0);
  },

  /* ---- hit reaction, additive impulse that decays -------------------- */
  hit(sk, amt, dirX, dirZ) {
    if (amt <= 0) return;
    sk.addRot(BONE.SPINE1, dirZ*0.5*amt, 0, -dirX*0.4*amt);
    sk.addRot(BONE.CHEST, dirZ*0.35*amt, 0, -dirX*0.3*amt);
    sk.addRot(BONE.NECK, dirZ*0.55*amt, 0, -dirX*0.4*amt);
    sk.addRot(BONE.HEAD, dirZ*0.4*amt, dirX*0.3*amt, 0);
    sk.addRot(BONE.UARM_L, -amt*0.5, 0, -amt*0.3);
    sk.addRot(BONE.UARM_R, -amt*0.5, 0, amt*0.3);
  },

  /* ---- death: a two-stage collapse that settles into a slump --------- */
  death(sk, t, variant) {
    sk.reset();
    const a = sat(t/0.85), b = sat((t-0.5)/1.4);
    const fall = smooth(a), settle = smooth(b);
    sk.trans[BONE.ROOT*3+1] = -0.82*fall;
    sk.setRot(BONE.ROOT, 1.42*fall + (variant?0.1:-0.08), (variant?0.7:-0.6)*fall, (variant?0.4:-0.5)*fall);
    sk.setRot(BONE.SPINE1, 0.28*fall - 0.1*settle, 0.12*fall, 0.1*fall);
    sk.setRot(BONE.SPINE2, 0.20*fall, 0.10*fall, 0);
    sk.setRot(BONE.CHEST, 0.10*fall, 0, 0);
    sk.setRot(BONE.NECK, 0.42*fall - 0.2*settle, (variant?-0.5:0.5)*fall, 0);
    sk.setRot(BONE.HEAD, 0.30*fall, (variant?-0.4:0.4)*fall, 0);
    sk.setRot(BONE.UARM_L, -0.9*fall, 0.3*fall, -0.8*fall);
    sk.setRot(BONE.FARM_L, 0.7*fall, 0, 0);
    sk.setRot(BONE.UARM_R, -0.8*fall, -0.3*fall, 0.9*fall);
    sk.setRot(BONE.FARM_R, 0.6*fall, 0, 0);
    sk.setRot(BONE.THIGH_L, -1.15*fall, 0.2*fall, 0.25*fall);
    sk.setRot(BONE.SHIN_L, 0.95*fall, 0, 0);
    sk.setRot(BONE.THIGH_R, -0.95*fall, -0.2*fall, -0.3*fall);
    sk.setRot(BONE.SHIN_R, 1.15*fall, 0, 0);
    return sk;
  },

  /* ---- sitting (bar patrons, metro passengers) ----------------------- */
  sit(sk, t, seed) {
    sk.reset();
    const br = sin(t*1.1 + seed)*0.5+0.5;
    sk.trans[BONE.ROOT*3+1] = -0.42;
    sk.setRot(BONE.ROOT, -0.06, 0, 0);
    sk.setRot(BONE.SPINE1, 0.10 + br*0.01, sin(t*0.3+seed)*0.03, 0);
    sk.setRot(BONE.CHEST, 0.04, 0, 0);
    sk.setRot(BONE.NECK, 0.10, sin(t*0.25+seed*3)*0.12, 0);
    sk.setRot(BONE.THIGH_L, -1.52, 0.10, 0.06);
    sk.setRot(BONE.SHIN_L, 1.48, 0, 0);
    sk.setRot(BONE.FOOT_L, 0.10, 0, 0);
    sk.setRot(BONE.THIGH_R, -1.52, -0.10, -0.06);
    sk.setRot(BONE.SHIN_R, 1.48, 0, 0);
    sk.setRot(BONE.FOOT_R, 0.10, 0, 0);
    sk.setRot(BONE.UARM_L, -0.30, 0.1, -0.15);
    sk.setRot(BONE.FARM_L, 0.85, 0, 0);
    sk.setRot(BONE.UARM_R, -0.30, -0.1, 0.15);
    sk.setRot(BONE.FARM_R, 0.85, 0, 0);
    return sk;
  },

  /* ---- conversation gesture set for story scenes --------------------- */
  talk(sk, t, seed, energy) {
    this.idle(sk, t, seed);
    const e = energy === undefined ? 1 : energy;
    const g = sin(t*2.3 + seed)*0.5 + sin(t*3.7 + seed*2)*0.3;
    sk.addRot(BONE.HEAD, sin(t*4.1+seed)*0.045*e, sin(t*2.7+seed*3)*0.09*e, sin(t*3.3)*0.03*e);
    sk.addRot(BONE.JAW, (sin(t*11+seed)*0.5+0.5)*0.22*e, 0, 0);
    sk.addRot(BONE.UARM_R, -0.25*e*(g*0.5+0.5), 0, 0.12*g*e);
    sk.addRot(BONE.FARM_R, 0.55*e*(g*0.4+0.6), 0, 0);
    sk.addRot(BONE.UARM_L, -0.12*e*(sin(t*1.9+seed)*0.5+0.5), 0, -0.08*e);
    sk.addRot(BONE.FARM_L, 0.35*e, 0, 0);
    sk.addRot(BONE.CHEST, 0, sin(t*1.3+seed)*0.05*e, 0);
    return sk;
  },
};
</script>
