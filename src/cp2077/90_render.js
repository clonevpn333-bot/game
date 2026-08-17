<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 11 — DEFERRED RENDERER
   Frame graph:
     [1] CSM depth x3        [2] G-buffer MRT      [3] SSAO + bilateral blur
     [4] tiled light cull    [5] deferred resolve  [6] SSR
     [7] volumetric march    [8] forward neon/particles
     [9] bloom mip chain    [10] composite/ACES   [11] FXAA
   ========================================================================== */
const MAXL = 256, TILES_X = 32, TILES_Y = 18;
/* holocall portrait target — 300x210 panel, so 10:7 */
const PORTRAIT_W = 400, PORTRAIT_H = 280;

const RENDER = {
  W: 1, H: 1, scale: 1, quality: 2,
  prog: {}, rt: {}, sh: [],
  lightData: new Float32Array(MAXL*3*4),
  lightTex: null, tileTex: null, idxTex: null,
  tileData: new Uint32Array(TILES_X*TILES_Y*2),
  idxData: new Uint32Array(16384),
  lights: [], nLights: 0,
  frustum: new Frustum(), shadowFrust: [new Frustum(), new Frustum(), new Frustum()],
  view: M4.n(), proj: M4.n(), vp: M4.n(), invView: M4.n(), invVP: M4.n(), prevVP: M4.n(),
  lvp: [M4.n(), M4.n(), M4.n()],
  camPos: V3.n(), sunDir: V3.n(0.4, 0.7, 0.35), moonDir: V3.n(-0.4,-0.7,-0.35),
  sunCol: V3.n(1,.96,.9),
  cascadeSplit: [42, 130, 420],
  settings: {
    shadows: 2, ssao: 1, ssr: 1, volumetrics: 1, bloom: 1, motionBlur: 1,
    fxaa: 1, grain: 0.035, aberration: 0.0022, vignette: 0.42, fov: 75,
    resScale: 1.0, shadowRes: 2048, drawDist: 2600, contrast: 1.13, sat: 1.10,
  },
  env: { time: 12*3600, nightAmt: 0, wetness: 0, rain: 0, cloud: 0.35, turb: 2.2,
         exposure: 1.0, fogDensity: 0.011, fogHeight: 26, fogFalloff: 0.028 },
  frameT: 0, tmpM: M4.n(), tmpV: V3.n(), tmpV2: V3.n(),

/* ------------------------------------------------------------------------ */
init(canvas) {
  const gl = GX.init(canvas);
  if (!gl) return false;
  this.gl = gl;
  this.buildPrograms();
  this.resize(true);
  /* light + tile lookup textures */
  this.lightTex = GX.tex2D(MAXL, 3, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, { filter: gl.NEAREST });
  this.tileTex = GX.tex2D(TILES_X, TILES_Y, gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT, null, { filter: gl.NEAREST });
  this.idxTex = GX.tex2D(2048, 8, gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, null, { filter: gl.NEAREST });
  for (let i = 0; i < 3; i++) this.sh[i] = GX.shadowFbo(this.settings.shadowRes);
  this.bones = GX.tex2D(4, BONE.COUNT, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, { filter: gl.NEAREST });
  this.prevBones = GX.tex2D(4, BONE.COUNT, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, { filter: gl.NEAREST });
  this.identBones = new Float32Array(BONE.COUNT*16);
  for (let i = 0; i < BONE.COUNT; i++) { this.identBones[i*16]=1; this.identBones[i*16+5]=1;
    this.identBones[i*16+10]=1; this.identBones[i*16+15]=1; }
  return true;
},

buildPrograms() {
  const P = this.prog;
  P.gbuf   = GX.program(SH.gbufVS, SH.gbufFS, "gbuf");
  P.facade = GX.program(SH.gbufVS, SH.facadeFS, "facade");
  P.skin   = GX.program(SH.skinVS, SH.gbufFS, "skin");
  P.shadow = GX.program(SH.shadowVS, SH.shadowFS, "shadow");
  P.shadowSkin = GX.program(SH.shadowSkinVS, SH.shadowFS, "shadowSkin");
  P.light  = GX.program(FST.vs, SH.lightFS, "light");
  P.ssao   = GX.program(FST.vs, SH.ssaoFS, "ssao");
  P.blur   = GX.program(FST.vs, SH.blurFS, "blur");
  P.ssr    = GX.program(FST.vs, SH.ssrFS, "ssr");
  P.vol    = GX.program(FST.vs, SH.volFS, "vol");
  P.bpre   = GX.program(FST.vs, SH.bloomPreFS, "bloomPre");
  P.down   = GX.program(FST.vs, SH.downFS, "down");
  P.up     = GX.program(FST.vs, SH.upFS, "up");
  P.comp   = GX.program(FST.vs, SH.compFS, "comp");
  P.fxaa   = GX.program(FST.vs, SH.fxaaFS, "fxaa");
  P.part   = GX.program(SH.partVS, SH.partFS, "part");
  P.neon   = GX.program(SH.neonVS, SH.neonFS, "neon");
  P.water  = GX.program(SH.waterVS, SH.waterFS, "water");
  P.decal  = GX.program(SH.decalVS, SH.decalFS, "decal");
  P.portrait = GX.program(SH.skinVS, SH.portraitFS, "portrait");
  P.blit   = GX.program(FST.vs, SH.blitFS, "blit");
},

resize(force) {
  const gl = this.gl, c = GX.canvas;
  const dpr = min(window.devicePixelRatio || 1, 2);
  const w = max(320, (c.clientWidth * dpr * this.settings.resScale) | 0);
  const h = max(240, (c.clientHeight * dpr * this.settings.resScale) | 0);
  if (!force && w === this.W && h === this.H) return;
  this.W = w; this.H = h; c.width = w; c.height = h;
  const F = gl.RGBA16F, HF = gl.R11F_G11F_B10F;
  const del = (rt) => { if (!rt) return; if (rt.f) gl.deleteFramebuffer(rt.f);
    for (const t of rt.cols||[]) gl.deleteTexture(t.t);
    if (rt.dep && rt.dep.t) gl.deleteTexture(rt.dep.t);
    if (rt.dep && rt.dep.rb) gl.deleteRenderbuffer(rt.dep.rb); };
  for (const k in this.rt) del(this.rt[k]);
  this.rt = {};
  this.rt.g = GX.fbo(w, h, [
    { ifmt: gl.RGBA8,  fmt: gl.RGBA, type: gl.UNSIGNED_BYTE },
    { ifmt: F,         fmt: gl.RGBA, type: gl.HALF_FLOAT },
    { ifmt: HF,        fmt: gl.RGB,  type: gl.HALF_FLOAT },
    { ifmt: gl.RG16F,  fmt: gl.RG,   type: gl.HALF_FLOAT },
  ], "tex");
  this.rt.lit = GX.fbo(w, h, [{ ifmt: F, fmt: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR }], false);
  const hw = max(160, w>>1), hh = max(120, h>>1);
  this.rt.ao  = GX.fbo(hw, hh, [{ ifmt: gl.R8, fmt: gl.RED, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR }], false);
  this.rt.ao2 = GX.fbo(hw, hh, [{ ifmt: gl.R8, fmt: gl.RED, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR }], false);
  this.rt.ssr = GX.fbo(hw, hh, [{ ifmt: F, fmt: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR }], false);
  this.rt.vol = GX.fbo(hw, hh, [{ ifmt: F, fmt: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR }], false);
  this.rt.post = GX.fbo(w, h, [{ ifmt: gl.RGBA8, fmt: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR }], false);
  /* Depth read-back copy. The forward pass keeps the real depth buffer bound
     for testing, so soft particles must sample a separate image or the driver
     reports a framebuffer feedback loop and drops the draw. */
  this.rt.dcopy = { f: gl.createFramebuffer(), w, h };
  this.rt.dcopy.dep = GX.tex2D(w, h, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT, null,
    { filter: gl.NEAREST });
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.dcopy.f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.rt.dcopy.dep.t, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  GX._fbo = null;
  if (this.rt.litD) { gl.deleteFramebuffer(this.rt.litD.f); this.rt.litD = null; }
  /* holocall portrait target, fixed size and independent of resolution scale */
  /* aspect must match the holocall panel or the face is stretched by the blit */
  this.rt.portrait = GX.fbo(PORTRAIT_W, PORTRAIT_H,
    [{ ifmt: gl.RGBA8, fmt: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR }], "tex");
  this.rt.bloom = [];
  let bw = w>>1, bh = h>>1;
  for (let i = 0; i < 6; i++) {
    this.rt.bloom.push(GX.fbo(max(2,bw), max(2,bh),
      [{ ifmt: HF, fmt: gl.RGB, type: gl.HALF_FLOAT, filter: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE }], false));
    bw >>= 1; bh >>= 1;
  }
},

/* ======================== CAMERA / ENVIRONMENT ========================== */
setCamera(px, py, pz, yaw, pitch, roll, fovDeg) {
  V3.set(this.camPos, px, py, pz);
  const cp = cos(pitch), sp = sin(pitch), cy = cos(yaw), sy = sin(yaw);
  const fx = -sy*cp, fy = sp, fz = cy*cp;
  const upx = sin(roll||0), upy = cos(roll||0);
  M4.lookAt(this.view, px, py, pz, px+fx, py+fy, pz+fz,
            upx*cy, upy, upx*sy);
  const asp = this.W/this.H;
  M4.perspInfRevZ(this.proj, (fovDeg||this.settings.fov)*D2R, asp, 0.06);
  M4.cpy(this.prevVP, this.vp);
  M4.mul(this.vp, this.proj, this.view);
  M4.inv(this.invView, this.view);
  M4.inv(this.invVP, this.vp);
  this.frustum.fromVP(this.vp);
  this.tanHalf = [Math.tan((fovDeg||this.settings.fov)*D2R/2)*asp, Math.tan((fovDeg||this.settings.fov)*D2R/2)];
  this.fwd = [fx, fy, fz];
  /* camera basis for billboards */
  const rl = hypot(fz, -fx) || 1;
  /* true screen-right for this basis is -X at yaw 0 */
  this.right = [-fz/rl, 0, fx/rl];
  this.up = [ this.right[2]*fy - 0*fz, 0*fx - this.right[0]*fz, this.right[0]*fy - this.right[2]*fx ];
  const ul = hypot(this.up[0], this.up[1], this.up[2]) || 1;
  this.up[0]/=ul; this.up[1]/=ul; this.up[2]/=ul;
},

updateEnv(dt) {
  const e = this.env;
  const dayFrac = (e.time % 86400) / 86400;
  /* sun follows a tilted arc so dawn/dusk sweep across the street grid */
  const ang = (dayFrac - 0.25) * TAU;
  const el = sin(ang), az = cos(ang);
  V3.nrm(this.sunDir, V3.set(this.tmpV, az*0.82, el, az*0.30 + 0.28));
  V3.set(this.moonDir, -this.sunDir[0], -this.sunDir[1], -this.sunDir[2]);
  e.nightAmt = sat(1 - (this.sunDir[1] + 0.12) * 4.2);
  const dayl = sat(this.sunDir[1]*2.4);
  /* warm at the horizon, neutral overhead */
  const warm = sat(1 - this.sunDir[1]*3.2);
  V3.set(this.sunCol, lerp(1.0, 1.0, warm), lerp(0.97, 0.55, warm), lerp(0.93, 0.24, warm));
  /* Exposure ladder, tuned against the ACES curve in the composite pass.
     Daylight was clipping to white before these were pulled down. */
  this.sunInt = lerp(0.05, 2.60, dayl);
  /* Night City is lit by its own signage, not by the sky, so the night floor
     for ambient is deliberately high and the exposure opens up with it. */
  this.ambInt = lerp(0.55, 0.80, dayl);
  e.exposure = lerp(1.48, 0.72, dayl);   // daylight was still clipping highlights
  e.turb = lerp(2.0, 3.1, e.rain);
  /* Density is per-metre: the ray-march multiplies by segment length, so this
     targets ~65% transmittance at 260 m on a clear day and ~25% in heavy rain. */
  e.fogDensity = lerp(0.0008, 0.0038, e.rain) * lerp(1.8, 1.0, dayl);
  e.wetness = damp(e.wetness, sat(e.rain*1.35), 0.35, dt);
},

/* ========================= TILED LIGHT CULLING ========================== */
gatherLights(px, pz, dyn) {
  const L = this.lights; L.length = 0;
  const R = 210;
  const st = WORLD.lightHash.query(px, pz, R, []);
  for (const l of st) {
    const d = hypot(l.x-px, l.z-pz);
    if (d > R) continue;
    l._d = d; L.push(l);
  }
  if (dyn) for (const l of dyn) { l._d = hypot(l.x-px, l.z-pz); L.push(l); }
  L.sort((a,b) => a._d - b._d);
  if (L.length > MAXL) L.length = MAXL;
  /* pack the data texture: pos+range | colour+type | dir+cone */
  const D = this.lightData;
  const t = this.frameT;
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    let cr = l.cr, cg = l.cg, cb = l.cb;
    if (l.blink) { const b = sin(t*l.blink*6.2) > 0 ? 1 : 0.05; cr*=b; cg*=b; cb*=b; }
    if (l.flicker) { const f = 0.72 + 0.28*sin(t*l.flicker*11.0 + l.x);
      cr*=f; cg*=f; cb*=f; }
    D[i*4+0]=l.x; D[i*4+1]=l.y; D[i*4+2]=l.z; D[i*4+3]=l.r;
    const o = MAXL*4 + i*4;
    D[o]=cr; D[o+1]=cg; D[o+2]=cb; D[o+3] = l.kind === 2 ? 2 : 1;
    const o2 = MAXL*8 + i*4;
    D[o2]=l.dx||0; D[o2+1]=l.dy||-1; D[o2+2]=l.dz||0; D[o2+3]=l.cone||0.5;
  }
  this.nLights = L.length;
  const gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.lightTex.t);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAXL, 3, gl.RGBA, gl.FLOAT, D);
  this.cullTiles();
},

cullTiles() {
  const tile = this.tileData, idx = this.idxData;
  tile.fill(0);
  let cursor = 0;
  const P00 = this.proj[0], P11 = this.proj[5];
  const V = this.view;
  const bins = this._bins || (this._bins = new Array(TILES_X*TILES_Y));
  for (let i = 0; i < bins.length; i++) bins[i] = null;
  for (let i = 0; i < this.nLights; i++) {
    const l = this.lights[i];
    /* view-space centre */
    const x = l.x - 0, y = l.y, z = l.z;
    const vx = V[0]*l.x + V[4]*l.y + V[8]*l.z + V[12];
    const vy = V[1]*l.x + V[5]*l.y + V[9]*l.z + V[13];
    const vz = V[2]*l.x + V[6]*l.y + V[10]*l.z + V[14];
    const d = -vz, r = l.r;
    if (d + r < 0.05) continue;
    let x0, x1, y0, y1;
    if (d - r < 0.2) { x0 = 0; x1 = TILES_X-1; y0 = 0; y1 = TILES_Y-1; }
    else {
      const inv = 1/d;
      const cxn = vx*P00*inv, cyn = vy*P11*inv;
      const rxn = r*P00*inv, ryn = r*P11*inv;
      const u0 = (cxn - rxn)*0.5+0.5, u1 = (cxn + rxn)*0.5+0.5;
      const v0 = (cyn - ryn)*0.5+0.5, v1 = (cyn + ryn)*0.5+0.5;
      if (u1 < 0 || u0 > 1 || v1 < 0 || v0 > 1) continue;
      x0 = clamp(floor(u0*TILES_X), 0, TILES_X-1);
      x1 = clamp(floor(u1*TILES_X), 0, TILES_X-1);
      y0 = clamp(floor(v0*TILES_Y), 0, TILES_Y-1);
      y1 = clamp(floor(v1*TILES_Y), 0, TILES_Y-1);
    }
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const k = ty*TILES_X + tx;
      let b = bins[k]; if (!b) { b = bins[k] = []; }
      if (b.length < 40) b.push(i);
    }
  }
  for (let k = 0; k < bins.length; k++) {
    const b = bins[k];
    tile[k*2] = cursor;
    tile[k*2+1] = b ? b.length : 0;
    if (b) for (let i = 0; i < b.length; i++) { if (cursor < idx.length) idx[cursor++] = b[i]; }
  }
  const gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.tileTex.t);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TILES_X, TILES_Y, gl.RG_INTEGER, gl.UNSIGNED_INT, tile);
  gl.bindTexture(gl.TEXTURE_2D, this.idxTex.t);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2048, 8, gl.RED_INTEGER, gl.UNSIGNED_INT, idx);
},

/* ============================== SHADOWS ================================= */
setupCascades() {
  const s = this.cascadeSplit;
  for (let c = 0; c < 3; c++) {
    const ext = s[c];
    /* snap the light frustum to texel increments so shadows don't crawl */
    const texel = (ext*2) / this.settings.shadowRes;
    const fwd = this.fwd;
    const cx = this.camPos[0] + fwd[0]*ext*0.55;
    const cy = this.camPos[1] + fwd[1]*ext*0.25;
    const cz = this.camPos[2] + fwd[2]*ext*0.55;
    const sx = round(cx/texel)*texel, sy = round(cy/texel)*texel, sz = round(cz/texel)*texel;
    const D = this.sunDir[1] > 0.02 ? this.sunDir : this.moonDir;
    const dist = ext*2.4 + 120;
    const ex = sx + D[0]*dist, ey = sy + D[1]*dist, ez = sz + D[2]*dist;
    const v = this.tmpM;
    M4.lookAt(v, ex, ey, ez, sx, sy, sz, 0, 1, 0);
    const p = M4.n();
    M4.ortho(p, -ext, ext, -ext, ext, 1, dist*2.2);
    M4.mul(this.lvp[c], p, v);
    this.shadowFrust[c].fromVP(this.lvp[c]);
  }
},

/* =============================== FRAME ================================== */
begin(dt) {
  this.frameT += dt;
  GX.resetFrameStats();
  this.resize(false);
  this.setupCascades();
},

/* -- pass 1: cascaded shadow maps -- */
shadowPass(drawScene) {
  const gl = this.gl;
  if (!this.settings.shadows) return;
  const n = this.settings.shadows >= 2 ? 3 : 2;
  GX.cull(gl.FRONT);
  for (let c = 0; c < n; c++) {
    GX.bindFbo(this.sh[c]);
    gl.clearDepth(1); gl.depthMask(true); GX._depth = null;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    GX.depth(true, true, gl.LEQUAL);
    GX.blend(0);
    drawScene(c, this.lvp[c], this.shadowFrust[c]);
  }
  GX.cull(gl.BACK);
},

/* -- pass 2: G-buffer -- */
gbufBegin() {
  const gl = this.gl;
  GX.bindFbo(this.rt.g);
  gl.clearBufferfv(gl.COLOR, 0, [0,0,0,1]);
  gl.clearBufferfv(gl.COLOR, 1, [0,0,0,0]);
  gl.clearBufferfv(gl.COLOR, 2, [0,0,0,1]);
  gl.clearBufferfv(gl.COLOR, 3, [0,0,0,1]);
  gl.clearDepth(0); gl.depthMask(true); GX._depth = null;
  gl.clear(gl.DEPTH_BUFFER_BIT);
  GX.depth(true, true, gl.GEQUAL);
  GX.cull(gl.BACK);
  GX.blend(0);
},
useGbuf(kind) {
  const gl = this.gl;
  const p = GX.use(this.prog[kind]);
  gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
  gl.uniformMatrix4fv(p.u.uPrevVP, false, this.prevVP);
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uWetness, this.env.wetness);
  if (p.u.uNightAmt) gl.uniform1f(p.u.uNightAmt, this.env.nightAmt);
  GX.bindTex(0, TEX.albArr); gl.uniform1i(p.u.uAlb, 0);
  GX.bindTex(1, TEX.srfArr); gl.uniform1i(p.u.uSrf, 1);
  return p;
},
drawMesh(p, mesh, model) {
  if (!mesh) return;
  this.gl.uniformMatrix4fv(p.u.uModel, false, model);
  GX.draw(mesh);
},

/* -- pass 3: SSAO -- */
ssaoPass() {
  const gl = this.gl;
  if (!this.settings.ssao) {
    GX.bindFbo(this.rt.ao2); GX.clear(1,1,1,1); return;
  }
  GX.bindFbo(this.rt.ao);
  GX.depth(false, false);
  const p = GX.use(this.prog.ssao);
  GX.bindTex(0, this.rt.g.dep); gl.uniform1i(p.u.uDepthT, 0);
  GX.bindTex(1, this.rt.g.cols[1]); gl.uniform1i(p.u.uNrmT, 1);
  gl.uniformMatrix4fv(p.u.uProj, false, this.proj);
  gl.uniform2f(p.u.uRes, this.rt.ao.w, this.rt.ao.h);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  gl.uniform1f(p.u.uRadius, 0.85);
  gl.uniform1f(p.u.uBias, 0.022);
  gl.uniform1f(p.u.uInt, 1.05);
  gl.uniform1f(p.u.uTime, this.frameT);
  FST.draw();
  /* separable bilateral blur, depth-aware so edges survive */
  const bp = GX.use(this.prog.blur);
  gl.uniform1f(bp.u.uNear, 0.06);
  GX.bindFbo(this.rt.ao2);
  GX.bindTex(0, this.rt.ao.cols[0]); gl.uniform1i(bp.u.uTex, 0);
  GX.bindTex(1, this.rt.g.dep); gl.uniform1i(bp.u.uDepthT, 1);
  gl.uniform2f(bp.u.uDir, 1, 0);
  gl.uniform2f(bp.u.uTexel, 1/this.rt.ao.w, 1/this.rt.ao.h);
  FST.draw();
  GX.bindFbo(this.rt.ao);
  GX.bindTex(0, this.rt.ao2.cols[0]); gl.uniform1i(bp.u.uTex, 0);
  gl.uniform2f(bp.u.uDir, 0, 1);
  FST.draw();
  const t = this.rt.ao; this.rt.ao = this.rt.ao2; this.rt.ao2 = t;
},

/* -- pass 5: deferred resolve -- */
lightPass() {
  const gl = this.gl;
  GX.bindFbo(this.rt.lit);
  GX.depth(false, false);
  GX.blend(0);
  const p = GX.use(this.prog.light);
  GX.bindTex(0, this.rt.g.cols[0]); gl.uniform1i(p.u.uAlbT, 0);
  GX.bindTex(1, this.rt.g.cols[1]); gl.uniform1i(p.u.uNrmT, 1);
  GX.bindTex(2, this.rt.g.cols[2]); gl.uniform1i(p.u.uEmiT, 2);
  GX.bindTex(3, this.rt.g.dep);     gl.uniform1i(p.u.uDepthT, 3);
  GX.bindTex(4, this.rt.ao2.cols[0]); gl.uniform1i(p.u.uAoT, 4);
  GX.bindTex(5, this.sh[0].dep); gl.uniform1i(p.u.uShadow0, 5);
  GX.bindTex(6, this.sh[1].dep); gl.uniform1i(p.u.uShadow1, 6);
  GX.bindTex(7, this.sh[2].dep); gl.uniform1i(p.u.uShadow2, 7);
  GX.bindTex(8, this.lightTex);  gl.uniform1i(p.u.uLightT, 8);
  GX.bindTex(9, this.tileTex);   gl.uniform1i(p.u.uTileT, 9);
  GX.bindTex(10, this.idxTex);   gl.uniform1i(p.u.uIdxT, 10);
  gl.uniformMatrix4fv(p.u.uInvView, false, this.invView);
  gl.uniformMatrix4fv(p.u.uLVP0, false, this.lvp[0]);
  gl.uniformMatrix4fv(p.u.uLVP1, false, this.lvp[1]);
  gl.uniformMatrix4fv(p.u.uLVP2, false, this.lvp[2]);
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  gl.uniform3fv(p.u.uSunDir, this.sunDir);
  gl.uniform3fv(p.u.uMoonDir, this.moonDir);
  gl.uniform3fv(p.u.uSunCol, this.sunCol);
  gl.uniform2f(p.u.uRes, this.W, this.H);
  gl.uniform2f(p.u.uTiles, TILES_X, TILES_Y);
  gl.uniform3f(p.u.uCascadeSplit, this.cascadeSplit[0], this.cascadeSplit[1], this.cascadeSplit[2]);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uNightAmt, this.env.nightAmt);
  gl.uniform1f(p.u.uTurb, this.env.turb);
  gl.uniform1f(p.u.uCloud, this.env.cloud);
  gl.uniform1f(p.u.uShadowTexel, 1/this.settings.shadowRes);
  gl.uniform1f(p.u.uAmbInt, this.ambInt);
  gl.uniform1f(p.u.uSunInt, this.sunInt);
  FST.draw();
},

/* -- pass 6: screen-space reflections -- */
ssrPass() {
  const gl = this.gl;
  GX.bindFbo(this.rt.ssr);
  if (!this.settings.ssr) { GX.clear(0,0,0,0); return; }
  GX.depth(false, false); GX.blend(0);
  const p = GX.use(this.prog.ssr);
  GX.bindTex(0, this.rt.lit.cols[0]); gl.uniform1i(p.u.uColT, 0);
  GX.bindTex(1, this.rt.g.dep); gl.uniform1i(p.u.uDepthT, 1);
  GX.bindTex(2, this.rt.g.cols[1]); gl.uniform1i(p.u.uNrmT, 2);
  gl.uniformMatrix4fv(p.u.uProj, false, this.proj);
  gl.uniformMatrix4fv(p.u.uView, false, this.view);
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  gl.uniform2f(p.u.uRes, this.rt.ssr.w, this.rt.ssr.h);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  gl.uniform1f(p.u.uTime, this.frameT);
  FST.draw();
},

/* -- pass 7: volumetric scattering -- */
volPass() {
  const gl = this.gl;
  GX.bindFbo(this.rt.vol);
  if (!this.settings.volumetrics) { GX.clear(0,0,0,1); return; }
  GX.depth(false, false); GX.blend(0);
  const p = GX.use(this.prog.vol);
  GX.bindTex(0, this.rt.g.dep); gl.uniform1i(p.u.uDepthT, 0);
  GX.bindTex(1, this.sh[0].dep); gl.uniform1i(p.u.uShadow0, 1);
  GX.bindTex(2, this.sh[1].dep); gl.uniform1i(p.u.uShadow1, 2);
  GX.bindTex(3, this.lightTex); gl.uniform1i(p.u.uLightT, 3);
  GX.bindTex(4, this.tileTex); gl.uniform1i(p.u.uTileT, 4);
  GX.bindTex(5, this.idxTex); gl.uniform1i(p.u.uIdxT, 5);
  gl.uniformMatrix4fv(p.u.uInvView, false, this.invView);
  gl.uniformMatrix4fv(p.u.uLVP0, false, this.lvp[0]);
  gl.uniformMatrix4fv(p.u.uLVP1, false, this.lvp[1]);
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  gl.uniform3fv(p.u.uSunDir, this.sunDir);
  gl.uniform3fv(p.u.uSunCol, this.sunCol);
  gl.uniform2f(p.u.uTiles, TILES_X, TILES_Y);
  gl.uniform2f(p.u.uCascadeSplit, this.cascadeSplit[0], this.cascadeSplit[1]);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uDensity, this.env.fogDensity);
  gl.uniform1f(p.u.uNightAmt, this.env.nightAmt);
  gl.uniform1f(p.u.uFogHeight, this.env.fogHeight);
  gl.uniform1f(p.u.uFogFalloff, this.env.fogFalloff);
  gl.uniform1f(p.u.uRainAmt, this.env.rain);
  FST.draw();
},

/* -- pass 8: forward emissive + particles, into the lit target -- */
copyDepth() {
  const gl = this.gl;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.rt.g.f);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.rt.dcopy.f);
  gl.blitFramebuffer(0, 0, this.W, this.H, 0, 0, this.W, this.H, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  GX._fbo = null;
},
forwardBegin() {
  const gl = this.gl;
  /* re-bind lit with the g-buffer depth so forward geometry occludes properly */
  if (!this.rt.litD) {
    this.rt.litD = { f: gl.createFramebuffer(), w: this.rt.lit.w, h: this.rt.lit.h, cols: this.rt.lit.cols };
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.litD.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rt.lit.cols[0].t, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.rt.g.dep.t, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    GX._fbo = null;
  } else if (this.rt.litD.w !== this.rt.lit.w || this.rt.litD.h !== this.rt.lit.h) {
    gl.deleteFramebuffer(this.rt.litD.f); this.rt.litD = null; return this.forwardBegin();
  }
  GX.bindFbo(this.rt.litD);
  GX.depth(true, false, gl.GEQUAL);
  GX.blend(2);
  GX.cull(0);
},
useNeon() {
  const gl = this.gl;
  const p = GX.use(this.prog.neon);
  gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uNightAmt, this.env.nightAmt);
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  GX.bindTex(0, this.rt.dcopy.dep); gl.uniform1i(p.u.uDepthT, 0);
  return p;
},
useParticles() {
  const gl = this.gl;
  const p = GX.use(this.prog.part);
  gl.uniformMatrix4fv(p.u.uVP, false, this.vp);
  gl.uniform3fv(p.u.uRight, new Float32Array(this.right));
  gl.uniform3fv(p.u.uUp, new Float32Array(this.up));
  gl.uniform3fv(p.u.uCamPos, this.camPos);
  gl.uniform2f(p.u.uRes, this.W, this.H);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  GX.bindTex(0, this.rt.dcopy.dep); gl.uniform1i(p.u.uDepthT, 0);
  return p;
},

/* -- pass 9-11: bloom, composite, AA -- */
post(fx) {
  const gl = this.gl;
  GX.depth(false, false); GX.blend(0);
  if (this.settings.bloom) {
    const b = this.rt.bloom;
    GX.bindFbo(b[0]);
    let p = GX.use(this.prog.bpre);
    GX.bindTex(0, this.rt.lit.cols[0]); gl.uniform1i(p.u.uTex, 0);
    gl.uniform2f(p.u.uTexel, 1/this.W, 1/this.H);
    gl.uniform1f(p.u.uThresh, 1.15);
    gl.uniform1f(p.u.uKnee, 0.55);
    FST.draw();
    p = GX.use(this.prog.down);
    for (let i = 1; i < b.length; i++) {
      GX.bindFbo(b[i]);
      GX.bindTex(0, b[i-1].cols[0]); gl.uniform1i(p.u.uTex, 0);
      gl.uniform2f(p.u.uTexel, 1/b[i-1].w, 1/b[i-1].h);
      FST.draw();
    }
    p = GX.use(this.prog.up);
    for (let i = b.length-2; i >= 0; i--) {
      /* additive upsample: read the smaller mip, add onto this level */
      GX.bindFbo(this.rt.post);            // scratch not used; do in-place below
      GX.bindFbo(b[i]);
      GX.blend(2);
      GX.bindTex(0, b[i+1].cols[0]); gl.uniform1i(p.u.uTex, 0);
      GX.bindTex(1, b[i+1].cols[0]); gl.uniform1i(p.u.uPrev, 1);
      gl.uniform2f(p.u.uTexel, 1/b[i+1].w, 1/b[i+1].h);
      gl.uniform1f(p.u.uRadius, 1.0);
      FST.draw();
      GX.blend(0);
    }
  }
  /* composite */
  GX.bindFbo(this.settings.fxaa ? this.rt.post : null);
  const p = GX.use(this.prog.comp);
  GX.bindTex(0, this.rt.lit.cols[0]); gl.uniform1i(p.u.uColT, 0);
  GX.bindTex(1, this.settings.bloom ? this.rt.bloom[0].cols[0] : this.rt.lit.cols[0]); gl.uniform1i(p.u.uBloomT, 1);
  GX.bindTex(2, this.rt.vol.cols[0]); gl.uniform1i(p.u.uVolT, 2);
  GX.bindTex(3, this.rt.ssr.cols[0]); gl.uniform1i(p.u.uSsrT, 3);
  GX.bindTex(4, this.rt.g.dep); gl.uniform1i(p.u.uDepthT, 4);
  GX.bindTex(5, this.rt.g.cols[1]); gl.uniform1i(p.u.uNrmT, 5);
  GX.bindTex(6, this.rt.g.cols[3]); gl.uniform1i(p.u.uVelT, 6);
  gl.uniform2f(p.u.uRes, this.W, this.H);
  gl.uniform1f(p.u.uNear, 0.06);
  gl.uniform2f(p.u.uTanHalf, this.tanHalf[0], this.tanHalf[1]);
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uExposure, this.env.exposure * (fx.exposure||1));
  gl.uniform1f(p.u.uBloomInt, this.settings.bloom ? 0.26 : 0);
  gl.uniform1f(p.u.uVignette, this.settings.vignette);
  gl.uniform1f(p.u.uGrain, this.settings.grain);
  gl.uniform1f(p.u.uAberr, this.settings.aberration);
  gl.uniform1f(p.u.uSat, this.settings.sat);
  gl.uniform1f(p.u.uContrast, this.settings.contrast);
  gl.uniform1f(p.u.uLift, 0.004);
  gl.uniform1f(p.u.uScanline, 0.35);
  gl.uniform1f(p.u.uMotionBlur, this.settings.motionBlur ? 1.6 : 0);
  gl.uniform1f(p.u.uGlitch, fx.glitch||0);
  gl.uniform1f(p.u.uHackFx, fx.hack||0);
  gl.uniform1f(p.u.uDamage, fx.damage||0);
  FST.draw();

  if (this.settings.fxaa) {
    GX.bindFbo(null);
    const f = GX.use(this.prog.fxaa);
    GX.bindTex(0, this.rt.post.cols[0]); gl.uniform1i(f.u.uTex, 0);
    gl.uniform2f(f.u.uTexel, 1/this.W, 1/this.H);
    FST.draw();
  }
},

/* ---- holocall portrait: a second, tiny camera on one character --------- */
portraitPass(mesh, sk, tint) {
  const gl = this.gl;
  if (!mesh || !this.rt.portrait) return;
  GX.bindFbo(this.rt.portrait);
  gl.clearColor(0.02, 0.03, 0.05, 1); gl.clearDepth(0);
  gl.depthMask(true); GX._depth = null;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  GX.depth(true, true, gl.GEQUAL);
  GX.cull(0); GX.blend(0);

  /* frame the head: camera 0.85 m out, slightly above eye height */
  const h = mesh.height || 1.78;
  /* framed like a video call: head and shoulders, camera just off-axis */
  const eye = [0.24, h*0.985, 1.18];
  const tgt = [0.0,  h*0.945, 0.02];
  const view = this._pv || (this._pv = M4.n());
  const proj = this._pp2 || (this._pp2 = M4.n());
  const vp = this._pvp || (this._pvp = M4.n());
  M4.lookAt(view, eye[0], eye[1], eye[2], tgt[0], tgt[1], tgt[2], 0, 1, 0);
  /* must match the engine's reversed-Z depth state (clear 0, test GEQUAL) —
     a standard projection here inverts the test and eats the whole model */
  M4.perspInfRevZ(proj, 21*D2R, PORTRAIT_W/PORTRAIT_H, 0.05);
  M4.mul(vp, proj, view);

  const p = GX.use(this.prog.portrait);
  gl.uniformMatrix4fv(p.u.uVP, false, vp);
  gl.uniformMatrix4fv(p.u.uPrevVP, false, vp);
  const ident = this._ident || (this._ident = M4.n());
  gl.uniformMatrix4fv(p.u.uModel, false, ident);
  gl.uniformMatrix4fv(p.u.uPrevModel, false, ident);
  gl.uniform3fv(p.u.uCamPos, new Float32Array(eye));
  gl.uniform1f(p.u.uTime, this.frameT);
  gl.uniform1f(p.u.uBoneCount, BONE.COUNT);
  const kc = tint || [1.0, 0.95, 0.88];
  gl.uniform3f(p.u.uKeyCol, kc[0]*1.15, kc[1]*1.10, kc[2]*1.05);
  gl.uniform3f(p.u.uFillCol, 0.22, 0.30, 0.44);
  gl.uniform3f(p.u.uRimCol, kc[0]*0.55, kc[1]*0.75, kc[2]*1.0);
  GX.bindTex(0, TEX.albArr); gl.uniform1i(p.u.uAlb, 0);
  GX.bindTex(1, TEX.srfArr); gl.uniform1i(p.u.uSrf, 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, this.bones.t);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, BONE.COUNT, gl.RGBA, gl.FLOAT, sk.tex);
  gl.uniform1i(p.u.uBones, 2);
  gl.viewport(0, 0, PORTRAIT_W, PORTRAIT_H);
  GX.bindTex(3, this.bones); gl.uniform1i(p.u.uPrevBones, 3);
  GX.draw(mesh);
  GX.cull(gl.BACK);
},
/* draw the portrait over the finished frame, in normalised screen coords */
blitPortrait(rect, fade) {
  const gl = this.gl;
  GX.bindFbo(null);
  GX.depth(false, false);
  GX.blend(1);
  const p = GX.use(this.prog.blit);
  GX.bindTex(0, this.rt.portrait.cols[0]); gl.uniform1i(p.u.uTex, 0);
  gl.uniform4f(p.u.uRect, rect[0], rect[1], rect[2], rect[3]);
  gl.uniform1f(p.u.uFade, fade);
  FST.draw();
  GX.blend(0);
},

applyQuality(q) {
  const s = this.settings;
  this.quality = q;
  if (q === 0) {        // performance
    s.shadows = 1; s.ssao = 0; s.ssr = 0; s.volumetrics = 0; s.bloom = 1;
    s.motionBlur = 0; s.fxaa = 1; s.resScale = 0.68; s.shadowRes = 1024; s.drawDist = 1400;
  } else if (q === 1) { // balanced
    s.shadows = 2; s.ssao = 1; s.ssr = 0; s.volumetrics = 1; s.bloom = 1;
    s.motionBlur = 1; s.fxaa = 1; s.resScale = 0.85; s.shadowRes = 1536; s.drawDist = 2000;
  } else if (q === 2) { // high
    s.shadows = 2; s.ssao = 1; s.ssr = 1; s.volumetrics = 1; s.bloom = 1;
    s.motionBlur = 1; s.fxaa = 1; s.resScale = 1.0; s.shadowRes = 2048; s.drawDist = 2600;
  } else {              // ultra
    s.shadows = 2; s.ssao = 1; s.ssr = 1; s.volumetrics = 1; s.bloom = 1;
    s.motionBlur = 1; s.fxaa = 1; s.resScale = 1.0; s.shadowRes = 3072; s.drawDist = 3400;
  }
  for (let i = 0; i < 3; i++) {
    if (this.sh[i]) { this.gl.deleteFramebuffer(this.sh[i].f); this.gl.deleteTexture(this.sh[i].dep.t); }
    this.sh[i] = GX.shadowFbo(s.shadowRes);
  }
  this.resize(true);
},
};

/* ==========================================================================
   PARTICLE SYSTEM — one dynamic instanced buffer for everything
   ======================================================================== */
const PARTICLES = {
  MAX: 3000, n: 0,
  pos: null, vel: null, dat: null, col: null,
  inst: null, mesh: null, dirty: true,
  init() {
    this.pos = new Float32Array(this.MAX*4);
    this.vel = new Float32Array(this.MAX*4);
    this.col = new Float32Array(this.MAX*4);
    this.ext = new Float32Array(this.MAX*4);
    this.life = new Float32Array(this.MAX*2);
    this.inst = new Float32Array(this.MAX*12);
    const B = new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]);
    const gl = GX.gl;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, B, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib);
    gl.bufferData(gl.ARRAY_BUFFER, this.inst.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(1+i);
      gl.vertexAttribPointer(1+i, 4, gl.FLOAT, false, 48, i*16);
      gl.vertexAttribDivisor(1+i, 1);
    }
    gl.bindVertexArray(null);
    this.vao = vao; this.ib = ib;
    return this;
  },
  spawn(x,y,z, vx,vy,vz, size, r,g,b, life, kind, drag, grav, stretch) {
    let i = this.n;
    if (i >= this.MAX) { i = (Math.random()*this.MAX)|0; } else this.n++;
    this.pos[i*4]=x; this.pos[i*4+1]=y; this.pos[i*4+2]=z; this.pos[i*4+3]=size;
    this.vel[i*4]=vx; this.vel[i*4+1]=vy; this.vel[i*4+2]=vz; this.vel[i*4+3]=drag===undefined?1.6:drag;
    this.col[i*4]=r; this.col[i*4+1]=g; this.col[i*4+2]=b; this.col[i*4+3]=1;
    this.life[i*2]=life; this.life[i*2+1]=life;
    this.ext[i*4]=Math.random()*TAU; this.ext[i*4+1]=kind;
    this.ext[i*4+2]=grav===undefined?-9.8:grav; this.ext[i*4+3]=stretch||1;
  },
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i*2] -= dt;
      if (this.life[i*2] <= 0) {
        const l = --this.n;
        if (l !== i) {
          this.pos.copyWithin(i*4, l*4, l*4+4);
          this.vel.copyWithin(i*4, l*4, l*4+4);
          this.col.copyWithin(i*4, l*4, l*4+4);
          this.ext.copyWithin(i*4, l*4, l*4+4);
          this.life.copyWithin(i*2, l*2, l*2+2);
        }
        i--; continue;
      }
      const d = Math.exp(-this.vel[i*4+3]*dt);
      this.vel[i*4] *= d; this.vel[i*4+2] *= d;
      this.vel[i*4+1] = this.vel[i*4+1]*d + this.ext[i*4+2]*dt;
      this.pos[i*4] += this.vel[i*4]*dt;
      this.pos[i*4+1] += this.vel[i*4+1]*dt;
      this.pos[i*4+2] += this.vel[i*4+2]*dt;
      this.ext[i*4] += dt*0.6;
    }
    const I = this.inst;
    for (let i = 0; i < this.n; i++) {
      const t = this.life[i*2]/this.life[i*2+1];
      I[i*12+0]=this.pos[i*4]; I[i*12+1]=this.pos[i*4+1]; I[i*12+2]=this.pos[i*4+2];
      I[i*12+3]=this.pos[i*4+3]*(this.ext[i*4+1]===0 ? (2.0-t*1.0) : 1.0);
      I[i*12+4]=this.col[i*4]; I[i*12+5]=this.col[i*4+1]; I[i*12+6]=this.col[i*4+2];
      I[i*12+7]=this.ext[i*4+1]===0 ? t*0.55 : t;
      I[i*12+8]=this.ext[i*4]; I[i*12+9]=this.ext[i*4+1];
      I[i*12+10]=1; I[i*12+11]=this.ext[i*4+3];
    }
  },
  draw() {
    if (!this.n) return;
    const gl = GX.gl;
    gl.bindVertexArray(this.vao); GX._vao = this.vao;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.inst.subarray(0, this.n*12));
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.n);
    GX.stats.draws++;
  },
  /* ---- effect presets --------------------------------------------------- */
  muzzle(x,y,z, dx,dy,dz, scale) {
    scale = scale || 1;
    this.spawn(x,y,z, dx*2,dy*2,dz*2, 0.30*scale, 1.0,0.72,0.30, 0.055, 2, 12, 0, 1);
    for (let i = 0; i < 5; i++)
      this.spawn(x,y,z, dx*10+(Math.random()-.5)*4, dy*10+(Math.random()-.5)*4, dz*10+(Math.random()-.5)*4,
                 0.035*scale, 1,0.85,0.5, 0.09+Math.random()*0.09, 1, 3, -6, 3);
    this.spawn(x+dx*0.3,y+dy*0.3,z+dz*0.3, dx*1.2,dy*1.2+0.4,dz*1.2, 0.22*scale, 0.4,0.4,0.42, 0.5, 0, 2.4, 0.5);
  },
  impact(x,y,z, nx,ny,nz, kind) {
    const c = kind === "flesh" ? [0.55,0.06,0.08] : kind === "metal" ? [1,0.8,0.4] : [0.6,0.58,0.55];
    for (let i = 0; i < (kind === "flesh" ? 9 : 7); i++) {
      const sx = nx + (Math.random()-.5)*1.1, sy = ny + (Math.random()-.5)*1.1, sz = nz + (Math.random()-.5)*1.1;
      const sp = 2.5 + Math.random()*5.5;
      this.spawn(x,y,z, sx*sp, sy*sp+1.5, sz*sp, kind==="flesh"?0.05:0.026,
                 c[0],c[1],c[2], 0.28+Math.random()*0.4, kind==="flesh"?4:1, 1.2, -11, 1.6);
    }
    if (kind !== "flesh")
      this.spawn(x+nx*0.1,y+ny*0.1,z+nz*0.1, nx*0.5,ny*0.5+0.4,nz*0.5, 0.22, 0.45,0.44,0.42, 0.55, 0, 2.2, 0.4);
  },
  blood(x,y,z, dx,dy,dz) {
    for (let i = 0; i < 12; i++)
      this.spawn(x,y,z, dx*4+(Math.random()-.5)*3, dy*4+Math.random()*2, dz*4+(Math.random()-.5)*3,
                 0.06+Math.random()*0.05, 0.42,0.03,0.05, 0.5+Math.random()*0.5, 4, 1.4, -10, 1);
  },
  explosion(x,y,z, r) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random()*TAU, e = Math.random()*PI - PI/2;
      const sp = 6+Math.random()*16;
      this.spawn(x,y,z, cos(a)*cos(e)*sp, sin(e)*sp+4, sin(a)*cos(e)*sp,
                 0.4+Math.random()*0.7, 1, 0.5+Math.random()*0.4, 0.15, 0.7+Math.random()*0.7, 0, 1.6, -3);
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random()*TAU;
      this.spawn(x,y,z, cos(a)*16, 6+Math.random()*10, sin(a)*16, 0.07, 1,0.85,0.4,
                 0.4+Math.random()*0.4, 1, 1.0, -14, 3);
    }
    this.spawn(x,y+1,z, 0,1.2,0, r*1.4, 1,0.55,0.18, 0.85, 5, 1.2, 1.5);
  },
  sparks(x,y,z, n, cr,cg,cb) {
    for (let i = 0; i < n; i++) {
      const a = Math.random()*TAU, e = Math.random()*PI;
      const sp = 2+Math.random()*7;
      this.spawn(x,y,z, cos(a)*sin(e)*sp, cos(e)*sp, sin(a)*sin(e)*sp, 0.024,
                 cr,cg,cb, 0.25+Math.random()*0.4, 1, 1.0, -13, 2.2);
    }
  },
};
</script>
