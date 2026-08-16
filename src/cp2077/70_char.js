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
  P[BONE.JAW]    = [0, 1.612, 0.030];
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
  /* silhouette half-widths along the torso, from hips (0) to shoulders (1) */
  torsoProfile(t, build) {
    /* build: 0 = slight, .5 = average, 1 = heavy/augmented */
    const hip = lerp(.128, .175, build);
    const waist = lerp(.104, .166, build);
    const rib = lerp(.140, .196, build);
    const shoulder = lerp(.168, .232, build);
    if (t < .34) return lerp(hip, waist, t/.34);
    if (t < .72) return lerp(waist, rib, (t-.34)/.38);
    return lerp(rib, shoulder, (t-.72)/.28);
  },
  torsoDepth(t, build) {
    const hip = lerp(.098, .132, build), waist = lerp(.082, .126, build);
    const rib = lerp(.106, .142, build), chest = lerp(.112, .150, build);
    if (t < .34) return lerp(hip, waist, t/.34);
    if (t < .72) return lerp(waist, rib, (t-.34)/.38);
    return lerp(rib, chest, (t-.72)/.28);
  },

  /* ---- analytic face field: displaces a sphere into a believable head ---- */
  faceDisplace(nx, ny, nz, f) {
    /* nx: -1 left..1 right, ny: -1 chin..1 crown, nz: -1 back..1 front */
    let r = 1;
    const front = sat(nz);
    const up = ny;
    /* cranium: flatten the back and the sides */
    r *= 1 - 0.10*sat(-nz)*sat(up+0.3);
    r *= 1 - 0.13*abs(nx)*abs(nx);
    /* jaw taper: narrow and shorten below the mouth line */
    const below = sat(-up*1.6);
    r *= 1 - 0.30*below*abs(nx) - 0.10*below;
    /* chin: a forward, narrow protrusion */
    const chin = Math.exp(-(Math.pow((up+0.72)*3.1,2) + Math.pow(nx*4.2,2) + Math.pow((nz-0.85)*2.0,2)));
    r += 0.085*chin*f.chin;
    /* brow ridge */
    const brow = Math.exp(-(Math.pow((up-0.20)*7.0,2) + Math.pow((nz-0.86)*2.6,2))) * sat(1-abs(nx)*1.4);
    r += 0.040*brow*f.brow;
    /* eye sockets */
    for (let s = -1; s <= 1; s += 2) {
      const e = Math.exp(-(Math.pow((nx-s*0.36)*4.6,2) + Math.pow((up-0.06)*7.4,2) + Math.pow((nz-0.80)*2.2,2)));
      r -= 0.055*e;
    }
    /* nose: bridge + tip + nostrils */
    const bridge = Math.exp(-(Math.pow(nx*11.0,2) + Math.pow((up-0.02)*3.4,2))) * sat(nz*1.5-0.25);
    r += 0.052*bridge*f.nose;
    const tip = Math.exp(-(Math.pow(nx*9.0,2) + Math.pow((up+0.20)*9.0,2) + Math.pow((nz-0.95)*2.6,2)));
    r += 0.062*tip*f.nose;
    /* cheekbones */
    for (let s = -1; s <= 1; s += 2) {
      const c = Math.exp(-(Math.pow((nx-s*0.52)*3.6,2) + Math.pow((up+0.05)*5.0,2) + Math.pow((nz-0.55)*2.0,2)));
      r += 0.036*c*f.cheek;
    }
    /* lips */
    const lip = Math.exp(-(Math.pow(nx*5.4,2) + Math.pow((up+0.40)*12.0,2) + Math.pow((nz-0.90)*3.0,2)));
    r += 0.030*lip*f.lips;
    /* mouth line recess */
    const mouth = Math.exp(-(Math.pow(nx*5.0,2) + Math.pow((up+0.345)*30.0,2))) * front;
    r -= 0.016*mouth;
    /* temples */
    r -= 0.030*Math.exp(-(Math.pow((abs(nx)-0.78)*5.0,2) + Math.pow((up-0.28)*4.4,2)));
    /* neck blend at the very bottom */
    r = lerp(r, 0.62, sat((-up-0.86)*5.0));
    return r;
  },

  head(B, cx, cy, cz, size, f, skinCol, boneIdx) {
    const seg = 22, rings = 18;
    const base = B.nv;
    B.mat(TEX.id("skin"), 1, 1, 1).colv(skinCol, 0).uv(2.6);
    B.bone1(boneIdx);
    const P = [];
    for (let j = 0; j <= rings; j++) {
      const v = j/rings, th = v*PI, st = sin(th), ct = cos(th);
      for (let i = 0; i <= seg; i++) {
        const u = i/seg, ph = u*TAU;
        let nx = st*sin(ph), ny = ct, nz = st*cos(ph);
        const r = this.faceDisplace(nx, ny, nz, f);
        /* head is taller than wide and deeper than wide: 0.155 x 0.19 x 0.20 */
        const px = nx*r*size*0.78, py = ny*r*size*0.98, pz = nz*r*size*0.86;
        P.push(px, py, pz);
        B.vert(cx+px, cy+py, cz+pz, nx, ny, nz, u*2.4, v*2.0);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
    B.smoothNormals(0.0008);
    /* --- eyes: sclera sphere + dark iris disc, inset into the socket ----- */
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s*0.36*size*0.78, ey = cy + 0.06*size*0.98, ez = cz + 0.72*size*0.86;
      B.mat(TEX.id("marble"), .18, 0, 0).col(.92,.92,.93,0).uv(3);
      B.sphere(ex, ey, ez, size*0.105, 10, 8, 1);
      B.mat(TEX.id("tech"), .22, .1, 0).colv(f.eyeCol, f.eyeGlow||0).uv(4);
      B.sphere(ex + s*0.004, ey, ez + size*0.048, size*0.052, 10, 8, 1);
      B.mat(TEX.id("leather"), .5, 0, 0).col(.05,.04,.04,0);
      B.sphere(ex + s*0.004, ey, ez + size*0.075, size*0.026, 8, 6, 1);
    }
    /* --- ears --------------------------------------------------------- */
    B.mat(TEX.id("skin"), 1, 1, 1).colv(skinCol, 0).uv(3);
    for (let s = -1; s <= 1; s += 2) {
      const ex = cx + s*size*0.72, ey = cy + size*0.02, ez = cz - size*0.06;
      const m0 = B.nv;
      B.sphere(0, 0, 0, size*0.115, 8, 6, 1.35);
      const M = M4.n(); M4.trs(M, ex, ey, ez, 0, 0, 0, 1, 0.34, 1, 0.72);
      B.transform(m0, M);
    }
    /* --- hair cap ------------------------------------------------------ */
    if (f.hair > 0) {
      B.mat(TEX.id("hair"), 1, .2, 0).colv(f.hairCol, 0).uv(3.4);
      const hb = B.nv;
      const hseg = 16, hrings = 10;
      for (let j = 0; j <= hrings; j++) {
        const v = j/hrings, th = v*PI*0.62, st = sin(th), ct = cos(th);
        for (let i = 0; i <= hseg; i++) {
          const u = i/hseg, ph = u*TAU;
          let nx = st*sin(ph), ny = ct, nz = st*cos(ph);
          const r = this.faceDisplace(nx, ny, nz, f) * (1.045 + 0.05*f.hair);
          /* pull the hairline back from the forehead */
          const fwd = sat(nz)*sat(ny*2.0);
          const rr = r * (1 - 0.30*fwd*(1-f.hair*0.4));
          B.vert(cx+nx*rr*size*0.78, cy+ny*rr*size*0.98, cz+nz*rr*size*0.86, nx, ny, nz, u*3, v*3);
        }
      }
      for (let j = 0; j < hrings; j++) for (let i = 0; i < hseg; i++) {
        const a = hb+j*(hseg+1)+i, b = a+hseg+1;
        B.idx.push(a, b, a+1, a+1, b, b+1);
      }
    }
  },

  /* ---- a limb: tapered lathe with a muscle bulge, split across 2 bones -- */
  limb(B, p0, p1, r0, rm, r1, boneA, boneB, seg, bulge) {
    seg = seg || 10;
    const dx = p1[0]-p0[0], dy = p1[1]-p0[1], dz = p1[2]-p0[2];
    const len = hypot(dx,dy,dz) || 1e-4;
    /* orthonormal frame with Y along the limb */
    const ux = dx/len, uy = dy/len, uz = dz/len;
    let ax = 1, ay = 0, az = 0;
    if (abs(uy) < .99) { ax = 0; ay = 1; az = 0; }
    let tx = uy*az - uz*ay, ty = uz*ax - ux*az, tz = ux*ay - uy*ax;
    let tl = hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
    const bx = uy*tz - uz*ty, by = uz*tx - ux*tz, bz = ux*ty - uy*tx;
    const rings = 7, base = B.nv;
    for (let j = 0; j <= rings; j++) {
      const t = j/rings;
      let r = t < .5 ? lerp(r0, rm, t*2) : lerp(rm, r1, (t-.5)*2);
      if (bulge) r *= 1 + bulge*sin(t*PI)*0.35;
      const w = sat((t-0.30)/0.40);
      B.bones(boneA, 1-w, boneB, w, 0, 0, 0, 0);
      for (let i = 0; i <= seg; i++) {
        const a = i/seg*TAU, ca = cos(a), sa = sin(a);
        const nx = tx*ca + bx*sa, ny = ty*ca + by*sa, nz = tz*ca + bz*sa;
        const px = p0[0] + ux*len*t + nx*r;
        const py = p0[1] + uy*len*t + ny*r;
        const pz = p0[2] + uz*len*t + nz*r;
        B.vert(px, py, pz, nx, ny, nz, i/seg*1.8, t*len*1.6);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
  },

  /* ---- hand: palm block + four fingers + thumb ------------------------ */
  hand(B, x, y, z, s, bone, side) {
    B.bone1(bone);
    const m0 = B.nv;
    B.box(-0.042*s, -0.095*s, -0.020*s, 0.042*s, 0.010*s, 0.020*s);
    for (let i = 0; i < 4; i++) {
      const fx = (-0.030 + i*0.020)*s;
      B.box(fx-0.008*s, -0.170*s, -0.012*s, fx+0.008*s, -0.090*s, 0.012*s);
    }
    B.box(-0.062*s*side, -0.075*s, -0.014*s, -0.030*s*side, -0.020*s, 0.016*s);
    B.translate(m0, x, y, z);
  },

  /* ---- foot / boot ---------------------------------------------------- */
  foot(B, x, y, z, s, bone) {
    B.bone1(bone);
    const m0 = B.nv;
    B.box(-0.048*s, -0.088*s, -0.062*s, 0.048*s, 0.030*s, 0.145*s);
    B.box(-0.052*s, -0.092*s, -0.066*s, 0.052*s, -0.060*s, 0.150*s);
    B.translate(m0, x, y, z);
  },

  /* =====================================================================
     Full character. `cfg` describes body, face, clothing and cyberware.
     ===================================================================== */
  build(cfg) {
    const B = new MeshBuilder(true);
    const s = cfg.height / 1.78;
    const R = rng(cfg.seed >>> 0);
    const P = (b) => [BONE_REST[b][0]*s, BONE_REST[b][1]*s, BONE_REST[b][2]*s];
    const skinL = TEX.id("skin");
    const sk = cfg.skin, build = cfg.build;

    /* ---- torso: stacked elliptical rings from pelvis to shoulders ----- */
    const y0 = 0.860*s, y1 = 1.470*s;
    const rings = 12, seg = 16;
    const base = B.nv;
    B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.2);
    for (let j = 0; j <= rings; j++) {
      const t = j/rings;
      const yy = lerp(y0, y1, t);
      const w = this.torsoProfile(t, build)*s, d = this.torsoDepth(t, build)*s;
      /* bone blend up the spine */
      let ba = BONE.ROOT, bb = BONE.SPINE1, bw = 0;
      if (t < .25) { ba = BONE.ROOT; bb = BONE.SPINE1; bw = t/.25; }
      else if (t < .5) { ba = BONE.SPINE1; bb = BONE.SPINE2; bw = (t-.25)/.25; }
      else { ba = BONE.SPINE2; bb = BONE.CHEST; bw = min(1,(t-.5)/.35); }
      B.bones(ba, 1-bw, bb, bw, 0,0,0,0);
      for (let i = 0; i <= seg; i++) {
        const a = i/seg*TAU, ca = cos(a), sa = sin(a);
        /* soft-square cross-section reads more like a ribcage than an ellipse */
        const k = 1 - 0.18*abs(sin(a*2));
        const px = ca*w*k, pz = sa*d*k;
        const nx = ca/w, nz = sa/d, nl = hypot(nx,nz)||1;
        B.vert(px, yy, pz, nx/nl, 0.06, nz/nl, i/seg*2.0, t*1.9);
      }
    }
    for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
      const a = base+j*(seg+1)+i, b = a+seg+1;
      B.idx.push(a, b, a+1, a+1, b, b+1);
    }
    /* pelvis + shoulder caps */
    B.bone1(BONE.ROOT);
    B.sphere(0, y0+0.02*s, 0, this.torsoProfile(0,build)*s*1.02, 14, 8, 0.62);
    B.bone1(BONE.CHEST);
    B.sphere(0, y1-0.02*s, 0, this.torsoProfile(1,build)*s*0.98, 14, 8, 0.52);

    /* ---- neck --------------------------------------------------------- */
    B.bones(BONE.CHEST, .4, BONE.NECK, .6, 0,0,0,0);
    this.limb(B, [0, 1.440*s, 0], [0, 1.560*s, 0.008*s],
              0.062*s, 0.056*s, 0.052*s, BONE.NECK, BONE.HEAD, 10, 0);

    /* ---- head --------------------------------------------------------- */
    this.head(B, 0, 1.660*s, 0.012*s, 0.118*s, cfg.face, sk, BONE.HEAD);

    /* ---- arms --------------------------------------------------------- */
    for (let si = 0; si < 2; si++) {
      const sd = si ? -1 : 1;
      const CL = si ? BONE.CLAV_R : BONE.CLAV_L, UA = si ? BONE.UARM_R : BONE.UARM_L;
      const FA = si ? BONE.FARM_R : BONE.FARM_L, HD = si ? BONE.HAND_R : BONE.HAND_L;
      const pC = P(CL), pU = P(UA), pF = P(FA), pH = P(HD);
      /* deltoid */
      B.bones(CL, .4, UA, .6, 0,0,0,0);
      B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.4);
      const d0 = B.nv;
      B.sphere(pU[0], pU[1], pU[2], 0.070*s*(0.9+build*0.35), 12, 8, 1);
      /* upper arm + forearm */
      this.limb(B, pU, pF, 0.058*s*(.9+build*.3), 0.050*s*(.9+build*.35), 0.043*s, UA, FA, 10, build*.5);
      this.limb(B, pF, pH, 0.043*s, 0.038*s, 0.028*s, FA, HD, 10, build*.3);
      this.hand(B, pH[0], pH[1]-0.010*s, pH[2], s, HD, sd);
    }
    /* ---- legs --------------------------------------------------------- */
    for (let si = 0; si < 2; si++) {
      const TH = si ? BONE.THIGH_R : BONE.THIGH_L, SH = si ? BONE.SHIN_R : BONE.SHIN_L;
      const FT = si ? BONE.FOOT_R : BONE.FOOT_L;
      const pT = P(TH), pS = P(SH), pF = P(FT);
      B.mat(skinL, 1, 1, 1).colv(sk, 0).uv(2.2);
      this.limb(B, pT, pS, 0.088*s*(.92+build*.3), 0.076*s*(.92+build*.35), 0.056*s, TH, SH, 12, build*.45);
      this.limb(B, pS, pF, 0.056*s, 0.050*s*(.95+build*.3), 0.034*s, SH, FT, 12, build*.35);
      this.foot(B, pF[0], pF[1], pF[2], s, FT);
    }

    /* ---- clothing: an inflated shell over the same bones -------------- */
    this.clothe(B, cfg, s, P);
    /* ---- cyberware ---------------------------------------------------- */
    this.cyber(B, cfg, s, P, R);

    const mesh = B.build();
    if (mesh) { mesh.height = cfg.height; mesh.cfg = cfg; }
    return mesh;
  },

  clothe(B, cfg, s, P) {
    const C = cfg.clothes, R = rng((cfg.seed ^ 0x1234) >>> 0);
    const fab = TEX.id("fabric"), lea = TEX.id("leather"), met = TEX.id("metalPanel");
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
        this.limb(B, [pT[0],pT[1]+0.05*s,pT[2]], mid,
                  0.100*s, 0.086*s, 0.066*s, TH, SH, 12, 0);
        if (cut >= 1) this.limb(B, pS, [pF[0], pF[1]+0.06*s, pF[2]],
                  0.066*s, 0.062*s, 0.050*s, SH, FT, 12, 0);
      }
      /* hip band */
      B.bone1(BONE.ROOT);
      B.cylinder(0, 0.905*s, 0, this.torsoProfile(0,cfg.build)*s*1.08,
                 this.torsoProfile(.1,cfg.build)*s*1.06, 0.14*s, 16, false, 1.4);
    }
    /* --- boots -------------------------------------------------------- */
    B.mat(lea, 1, .15, 0).colv(C.bootCol, 0).uv(2.2);
    for (let si = 0; si < 2; si++) {
      const FT = si ? BONE.FOOT_R : BONE.FOOT_L, SH = si ? BONE.SHIN_R : BONE.SHIN_L;
      const pF = P(FT), pS = P(SH);
      B.bone1(FT);
      const m0 = B.nv;
      B.box(-0.056*s, -0.096*s, -0.072*s, 0.056*s, 0.045*s, 0.155*s);
      B.translate(m0, pF[0], pF[1], pF[2]);
      B.bones(SH, .5, FT, .5, 0,0,0,0);
      const m1 = B.nv;
      B.cylinder(0, 0, 0, 0.070*s, 0.066*s, C.bootHigh ? 0.22*s : 0.09*s, 12, false, 1.6);
      B.translate(m1, pF[0], pF[1]+0.03*s, pF[2]);
    }
    /* --- torso garment ------------------------------------------------ */
    if (C.torso !== "none") {
      const layer = C.torso === "jacket" || C.torso === "coat" ? lea : fab;
      B.mat(layer, 1, C.torso === "jacket" ? .12 : 0, 0).colv(C.torsoCol, 0).uv(1.7);
      const y0 = 0.885*s, y1 = 1.478*s;
      const rings = 10, seg = 16, base = B.nv;
      const bot = C.torso === "coat" ? 0.72*s : (C.torso === "crop" ? 1.10*s : y0);
      for (let j = 0; j <= rings; j++) {
        const t = j/rings;
        const yy = lerp(bot, y1, t);
        const tt = sat(invLerp(0.860*s, 1.470*s, yy));
        const infl = 1.10 + (C.torso === "coat" ? .12 : 0) + (C.bulk||0);
        const w = this.torsoProfile(tt, cfg.build)*s*infl;
        const d = this.torsoDepth(tt, cfg.build)*s*infl;
        let ba = BONE.ROOT, bb = BONE.SPINE1, bw = 0;
        if (tt < .25) { bw = tt/.25; }
        else if (tt < .5) { ba = BONE.SPINE1; bb = BONE.SPINE2; bw = (tt-.25)/.25; }
        else { ba = BONE.SPINE2; bb = BONE.CHEST; bw = min(1,(tt-.5)/.35); }
        B.bones(ba, 1-bw, bb, bw, 0,0,0,0);
        for (let i = 0; i <= seg; i++) {
          const a = i/seg*TAU, ca = cos(a), sa = sin(a);
          const k = 1 - 0.16*abs(sin(a*2));
          const nx = ca/w, nz = sa/d, nl = hypot(nx,nz)||1;
          B.vert(ca*w*k, yy, sa*d*k, nx/nl, 0.05, nz/nl, i/seg*2.0, t*2.2);
        }
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
        const a = base+j*(seg+1)+i, b = a+seg+1;
        B.idx.push(a, b, a+1, a+1, b, b+1);
      }
      /* sleeves */
      if (C.sleeves) {
        for (let si = 0; si < 2; si++) {
          const UA = si ? BONE.UARM_R : BONE.UARM_L, FA = si ? BONE.FARM_R : BONE.FARM_L;
          const HD = si ? BONE.HAND_R : BONE.HAND_L;
          const pU = P(UA), pF = P(FA), pH = P(HD);
          const end = C.sleeves === "long" ? pH : [lerp(pU[0],pF[0],1), lerp(pU[1],pF[1],1), pF[2]];
          this.limb(B, [pU[0], pU[1]+0.03*s, pU[2]], pF,
                    0.078*s, 0.062*s, 0.050*s, UA, FA, 10, 0);
          if (C.sleeves === "long")
            this.limb(B, pF, [pH[0],pH[1]+0.03*s,pH[2]], 0.050*s, 0.044*s, 0.036*s, FA, HD, 10, 0);
          /* shoulder pad — the ubiquitous Night City silhouette */
          if (C.pads) {
            B.bones(si?BONE.CLAV_R:BONE.CLAV_L, .5, UA, .5, 0,0,0,0);
            B.mat(lea, .9, .2, 0).colv(C.padCol||C.torsoCol, 0).uv(2);
            const m0 = B.nv;
            B.sphere(0,0,0, 0.092*s, 12, 8, .68);
            B.translate(m0, pU[0], pU[1]+0.02*s, pU[2]);
          }
        }
      }
      /* collar */
      B.bones(BONE.CHEST, .5, BONE.NECK, .5, 0,0,0,0);
      B.mat(layer, 1, 0, 0).colv(C.torsoCol, 0).uv(2.4);
      B.cylinder(0, 1.452*s, 0.004*s, 0.082*s, 0.094*s, 0.075*s, 14, false, 2);
    }
    /* --- headgear ----------------------------------------------------- */
    if (C.head === "cap" || C.head === "beanie") {
      B.bone1(BONE.HEAD);
      B.mat(fab, 1, 0, 0).colv(C.headCol, 0).uv(2.6);
      const m0 = B.nv;
      B.sphere(0, 0, 0, 0.108*s, 14, 8, C.head === "cap" ? .78 : 1.0);
      B.translate(m0, 0, 1.688*s, 0.010*s);
      if (C.head === "cap") B.box(-0.085*s, 1.672*s, 0.070*s, 0.085*s, 1.686*s, 0.190*s);
    } else if (C.head === "visor") {
      B.bone1(BONE.HEAD);
      B.mat(TEX.id("holoPanel"), .12, .6, 0).colv(C.headCol, .9).uv(3);
      B.box(-0.092*s, 1.648*s, 0.062*s, 0.092*s, 1.690*s, 0.106*s);
    } else if (C.head === "respirator") {
      B.bone1(BONE.HEAD);
      B.mat(TEX.id("metalPanel"), .7, 1, 0).col(.2,.21,.23,0).uv(3);
      B.box(-0.058*s, 1.586*s, 0.070*s, 0.058*s, 1.648*s, 0.124*s);
      B.mat(TEX.id("perf"), 1, 1, 0).col(.3,.3,.32,0).uv(4);
      B.cylinder(-0.030*s, 1.596*s, 0.100*s, 0.020*s, 0.020*s, 0.030*s, 8, true, 3);
      B.cylinder( 0.030*s, 1.596*s, 0.100*s, 0.020*s, 0.020*s, 0.030*s, 8, true, 3);
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
        this.limb(B, pF, pH, 0.052*s, 0.046*s, 0.036*s, FA, HD, 10, 0);
        B.mat(tec, .5, 1, 0).col(.5,.5,.55, .35).uv(3);
        this.limb(B, [pU[0],pU[1]-0.06*s,pU[2]], pF, 0.050*s, 0.046*s, 0.048*s, UA, FA, 8, 0);
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
      for (let i = 0; i < 4; i++)
        B.box(-0.030*s, (1.16+i*0.075)*s, -this.torsoDepth(.6,cfg.build)*s*1.16,
               0.030*s, (1.20+i*0.075)*s, -this.torsoDepth(.6,cfg.build)*s*1.02);
    }
    if (cw.legs) {
      for (let si = 0; si < 2; si++) {
        const SH = si ? BONE.SHIN_R : BONE.SHIN_L, FT = si ? BONE.FOOT_R : BONE.FOOT_L;
        const pS = P(SH), pF = P(FT);
        B.mat(met, .4, 1, 0).col(.46,.47,.5,0).uv(2.4);
        this.limb(B, pS, pF, 0.062*s, 0.052*s, 0.036*s, SH, FT, 10, 0);
        B.mat(tec, .5, 1, 0).colv(cw.legCol||[.2,1,.7], .6).uv(3);
        this.limb(B, [pS[0],pS[1]-0.10*s,pS[2]], [pS[0],pS[1]-0.18*s,pS[2]],
                  0.058*s, 0.058*s, 0.058*s, SH, SH, 8, 0);
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
