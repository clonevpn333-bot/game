<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 04 — GLSL ES 3.00 SHADER LIBRARY
   Pipeline: reversed-Z depth -> MRT G-buffer -> tiled deferred PBR ->
             SSAO -> SSR -> volumetric scattering -> bloom -> ACES -> FXAA
   ========================================================================== */
const SH = {};

/* ---------------------------------------------------------------- common -- */
SH.common = `
#define PI 3.14159265359
#define TAU 6.28318530718
/* --- octahedral normal packing: 2 channels, ~0.1 degree error ------------ */
vec2 octEnc(vec3 n){
  n /= (abs(n.x)+abs(n.y)+abs(n.z));
  vec2 e = n.xy;
  if (n.z < 0.0) e = (1.0 - abs(n.yx)) * vec2(n.x>=0.0?1.0:-1.0, n.y>=0.0?1.0:-1.0);
  return e;
}
vec3 octDec(vec2 e){
  vec3 n = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
  float t = max(-n.z, 0.0);
  n.x += n.x >= 0.0 ? -t : t;
  n.y += n.y >= 0.0 ? -t : t;
  return normalize(n);
}
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  vec2 uv = i.xy + vec2(37.0,17.0)*i.z + f.xy;
  float a = hash12(uv), b = hash12(uv+vec2(1,0)), c = hash12(uv+vec2(0,1)), d = hash12(uv+vec2(1,1));
  float n0 = mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  uv = i.xy + vec2(37.0,17.0)*(i.z+1.0) + f.xy;
  a = hash12(uv); b = hash12(uv+vec2(1,0)); c = hash12(uv+vec2(0,1)); d = hash12(uv+vec2(1,1));
  float n1 = mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  return mix(n0, n1, f.z);
}
float fbm3(vec3 p, int oct){
  float s=0.0, a=0.5, t=0.0;
  for(int i=0;i<6;i++){ if(i>=oct) break; s += a*vnoise(p); t += a; a*=0.5; p*=2.02; }
  return s/t;
}
vec3 srgb2lin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c){ return pow(c, vec3(1.0/2.2)); }
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
`;

/* -------------------------------------------------- reversed-Z depth math -- */
SH.depthUtil = `
uniform float uNear;
uniform vec2  uTanHalf;    // (tan(fovy/2)*aspect, tan(fovy/2))
/* device depth (0..1, reversed) -> positive distance along -Z */
float linDepth(float D){ return uNear / max(2.0*D - 1.0, 1e-7); }
vec3 viewFromDepth(vec2 uv, float D){
  float d = linDepth(D);
  return vec3((uv*2.0-1.0)*uTanHalf, -1.0) * d;
}
`;

/* ============================== G-BUFFER PASS ============================== */
SH.gbufVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aCol;     // rgb tint, a = emissive strength
layout(location=4) in vec4 aMat;     // x=texLayer y=roughMul z=metalMul w=shadingModel
uniform mat4 uVP, uModel, uPrevVP;
uniform vec3 uCamPos;
uniform float uTime;
uniform vec2 uWindow;                // x = window-lit probability, y = flicker seed
out vec3 vWPos; out vec3 vNrm; out vec2 vUv; out vec4 vCol; out vec4 vMat;
out vec4 vClip; out vec4 vPrevClip;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWPos = wp.xyz;
  vNrm  = mat3(uModel) * aNrm;
  vUv   = aUv; vCol = aCol;
  /* aMat arrives as 4 unorm bytes: layer/255, rough*2, metal*2, model*4 */
  vMat  = vec4(aMat.x*255.0, aMat.y*2.0, aMat.z*2.0, floor(aMat.w*255.0+0.5)/64.0);
  vClip = uVP * wp;
  vPrevClip = uPrevVP * wp;
  gl_Position = vClip;
}`;

SH.gbufFS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
${SH.common}
in vec3 vWPos; in vec3 vNrm; in vec2 vUv; in vec4 vCol; in vec4 vMat;
in vec4 vClip; in vec4 vPrevClip;
uniform sampler2DArray uAlb, uSrf;
uniform vec3 uCamPos;
uniform float uTime, uWetness;
layout(location=0) out vec4 oAlb;
layout(location=1) out vec4 oNrm;
layout(location=2) out vec4 oEmi;
layout(location=3) out vec4 oVel;

/* cotangent-frame normal mapping — no precomputed tangents needed, which
   keeps the streamed city vertex format at 48 bytes */
mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv){
  vec3 dp1 = dFdx(p), dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp*duv1.x + dp1perp*duv2.x;
  vec3 B = dp2perp*duv1.y + dp1perp*duv2.y;
  float inv = inversesqrt(max(dot(T,T), dot(B,B)) + 1e-8);
  return mat3(T*inv, B*inv, N);
}
void main(){
  float layer = vMat.x;
  vec4 A = texture(uAlb, vec3(vUv, layer));
  vec4 S = texture(uSrf, vec3(vUv, layer));
  vec3 N = normalize(vNrm);
  vec3 nT = vec3(S.xy*2.0-1.0, 0.0);
  nT.z = sqrt(max(1.0 - dot(nT.xy, nT.xy), 0.0));
  N = normalize(cotangentFrame(N, vWPos, vUv) * nT);

  float rough = clamp(S.z * vMat.y, 0.03, 1.0);
  float metal = clamp(S.w * vMat.z, 0.0, 1.0);
  vec3 alb = A.rgb * vCol.rgb;
  float ao = A.a;

  /* --- rain wetness: darkens albedo, smooths microfacets, only on up-faces */
  float upFace = clamp(N.y, 0.0, 1.0);
  float wet = uWetness * upFace * upFace;
  /* puddles pool in the low-frequency dips of the surface */
  float pud = smoothstep(0.45, 0.72, fbm3(vec3(vWPos.xz*0.35, 0.0), 3)) * wet;
  alb *= mix(1.0, 0.55, wet*0.8);
  rough = mix(rough, 0.06, max(wet*0.55, pud));
  N = normalize(mix(N, vec3(0.0,1.0,0.0), pud*0.85));

  /* --- emissive: window grids animate; sign panels use the vertex channel */
  vec3 emi = vec3(0.0);
  if (vCol.a > 0.0) emi = vCol.rgb * vCol.a;
  oAlb = vec4(alb, ao);
  oNrm = vec4(octEnc(N), rough, metal + vMat.w*2.0);
  oEmi = vec4(emi, 1.0);
  vec2 a = vClip.xy/vClip.w, b = vPrevClip.xy/vPrevClip.w;
  oVel = vec4((a-b)*0.5, 0.0, 1.0);
}`;

/* --------------------- G-buffer variant for lit window facades ------------ */
SH.facadeFS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
${SH.common}
in vec3 vWPos; in vec3 vNrm; in vec2 vUv; in vec4 vCol; in vec4 vMat;
in vec4 vClip; in vec4 vPrevClip;
uniform sampler2DArray uAlb, uSrf;
uniform float uTime, uNightAmt, uWetness;
layout(location=0) out vec4 oAlb;
layout(location=1) out vec4 oNrm;
layout(location=2) out vec4 oEmi;
layout(location=3) out vec4 oVel;
mat3 cotangentFrame(vec3 N, vec3 p, vec2 uv){
  vec3 dp1 = dFdx(p), dp2 = dFdy(p); vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N), dp1perp = cross(N, dp1);
  vec3 T = dp2perp*duv1.x + dp1perp*duv2.x, B = dp2perp*duv1.y + dp1perp*duv2.y;
  float inv = inversesqrt(max(dot(T,T), dot(B,B)) + 1e-8);
  return mat3(T*inv, B*inv, N);
}
void main(){
  vec4 A = texture(uAlb, vec3(vUv, vMat.x));
  vec4 S = texture(uSrf, vec3(vUv, vMat.x));
  vec3 N = normalize(vNrm);
  vec3 nT = vec3(S.xy*2.0-1.0, 0.0); nT.z = sqrt(max(1.0-dot(nT.xy,nT.xy),0.0));
  N = normalize(cotangentFrame(N, vWPos, vUv) * nT);

  /* --- per-window occupancy: stable per cell, low-rate flicker ----------- */
  vec2 cell = floor(vUv * vec2(4.0, 6.0));          // matches glassPanel mullions
  vec2 gid  = cell + floor(vWPos.xz*0.5);
  float occ = hash12(gid);
  float lit = step(occ, mix(0.08, 0.74, uNightAmt));
  /* a small fraction blink / are fluorescent-flickery */
  float fl  = hash12(gid+7.7);
  float blink = fl < 0.06 ? step(0.5, fract(uTime*(0.4+fl*4.0)+fl*10.0)) : 1.0;
  /* colour temperature spread: warm domestic -> cold office -> neon accents */
  float ct = hash12(gid+31.3);
  vec3 wc = ct < 0.55 ? vec3(1.0,0.72,0.38)
          : ct < 0.85 ? vec3(0.72,0.86,1.0)
                      : (hash12(gid+91.1) < 0.5 ? vec3(1.0,0.25,0.55) : vec3(0.25,0.95,1.0));
  /* Mullion mask derived analytically from the UV grid — the glazing texture
     carries no AO, so the old albedo-alpha test masked out every window. */
  vec2 cellUv = vUv * vec2(4.0, 6.0);
  vec2 f = fract(cellUv);
  float pane = step(0.07, f.x) * step(0.10, f.y) * step(f.x, 0.93) * step(f.y, 0.90);
  /* how many cells does this pixel span? >1 means the grid is sub-pixel */
  float cellPerPixel = max(length(fwidth(cellUv)), 1e-4);
  float sharp = clamp(1.0 - (cellPerPixel - 0.35) / 0.9, 0.0, 1.0);
  float density = mix(0.10, 0.74, uNightAmt);         // expected lit fraction
  const float PANE_AREA = 0.86 * 0.80;                // expected pane coverage
  /* The distant mean is deliberately well below the lit-window peak: a facade
     averaged over many cells is a dim grid, not a glowing slab. Without this
     the far skyline integrates to solid white. */
  float meanFrac = density * PANE_AREA * 0.22;
  float amount = mix(meanFrac, lit * pane * mix(1.0, blink, sharp), sharp);
  /* Colour temperature and per-window brightness are also per-cell, so they
     alias into rainbow speckle at range unless they converge on their mean. */
  vec3 wcMean = vec3(0.86, 0.75, 0.62);
  vec3 wcAA = mix(wcMean, wc, sharp);
  float bright = 1.45 + hash12(gid+3.1) * 1.1 * sharp;
  vec3 emi = wcAA * amount * bright * uNightAmt;
  emi += vCol.rgb * vCol.a;

  float rough = clamp(S.z*vMat.y, 0.03, 1.0);
  float metal = clamp(S.w*vMat.z, 0.0, 1.0);
  float wet = uWetness * clamp(N.y,0.0,1.0);
  rough = mix(rough, 0.05, wet*0.6);

  oAlb = vec4(A.rgb*vCol.rgb, A.a);
  oNrm = vec4(octEnc(N), rough, metal + vMat.w*2.0);
  oEmi = vec4(emi, 1.0);
  vec2 a = vClip.xy/vClip.w, b = vPrevClip.xy/vPrevClip.w;
  oVel = vec4((a-b)*0.5, 0.0, 1.0);
}`;

/* ============================ SKINNED CHARACTERS =========================== */
SH.skinVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aCol;
layout(location=4) in vec4 aMat;
layout(location=5) in vec4 aBoneI;
layout(location=6) in vec4 aBoneW;
uniform mat4 uVP, uModel, uPrevVP, uPrevModel;
uniform sampler2D uBones;      // 4 texels per bone: rows of mat4 (current)
uniform sampler2D uPrevBones;
uniform float uBoneCount;
out vec3 vWPos; out vec3 vNrm; out vec2 vUv; out vec4 vCol; out vec4 vMat;
out vec4 vClip; out vec4 vPrevClip;
mat4 fetchBone(sampler2D tx, float i){
  float y = (i + 0.5) / uBoneCount;
  return mat4(texture(tx, vec2(0.125, y)), texture(tx, vec2(0.375, y)),
              texture(tx, vec2(0.625, y)), texture(tx, vec2(0.875, y)));
}
void main(){
  mat4 sk = fetchBone(uBones, aBoneI.x)*aBoneW.x + fetchBone(uBones, aBoneI.y)*aBoneW.y
          + fetchBone(uBones, aBoneI.z)*aBoneW.z + fetchBone(uBones, aBoneI.w)*aBoneW.w;
  mat4 pk = fetchBone(uPrevBones, aBoneI.x)*aBoneW.x + fetchBone(uPrevBones, aBoneI.y)*aBoneW.y
          + fetchBone(uPrevBones, aBoneI.z)*aBoneW.z + fetchBone(uPrevBones, aBoneI.w)*aBoneW.w;
  vec4 lp = sk * vec4(aPos, 1.0);
  vec4 wp = uModel * lp;
  vWPos = wp.xyz;
  vNrm = mat3(uModel) * (mat3(sk) * aNrm);
  vUv = aUv; vCol = aCol;
  vMat = vec4(aMat.x*255.0, aMat.y*2.0, aMat.z*2.0, floor(aMat.w*255.0+0.5)/64.0);
  vClip = uVP * wp;
  vPrevClip = uPrevVP * (uPrevModel * (pk * vec4(aPos,1.0)));
  gl_Position = vClip;
}`;

/* ============================== SHADOW PASSES ============================= */
SH.shadowVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uLVP, uModel;
void main(){ gl_Position = uLVP * uModel * vec4(aPos, 1.0); }`;

SH.shadowSkinVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=5) in vec4 aBoneI;
layout(location=6) in vec4 aBoneW;
uniform mat4 uLVP, uModel;
uniform sampler2D uBones;
uniform float uBoneCount;
mat4 fetchBone(float i){ float y = (i+0.5)/uBoneCount;
  return mat4(texture(uBones, vec2(0.125,y)), texture(uBones, vec2(0.375,y)),
              texture(uBones, vec2(0.625,y)), texture(uBones, vec2(0.875,y))); }
void main(){
  mat4 sk = fetchBone(aBoneI.x)*aBoneW.x + fetchBone(aBoneI.y)*aBoneW.y
          + fetchBone(aBoneI.z)*aBoneW.z + fetchBone(aBoneI.w)*aBoneW.w;
  gl_Position = uLVP * uModel * (sk * vec4(aPos,1.0));
}`;

SH.shadowFS = `#version 300 es
precision highp float;
void main(){}`;

/* ================================ SKY ==================================== */
/* Single-scattering Rayleigh+Mie with an analytic night term. Rendered to a
   fullscreen tri behind everything, and reused as the ambient IBL source.    */
SH.skyCommon = `
const vec3 BETA_R = vec3(5.8e-6, 13.5e-6, 33.1e-6) * 4.2e5;
const vec3 BETA_M = vec3(21e-6) * 4.2e5;
float rayleighPhase(float c){ return 3.0/(16.0*PI) * (1.0 + c*c); }
float miePhase(float c, float g){
  float g2 = g*g;
  return 3.0/(8.0*PI) * ((1.0-g2)*(1.0+c*c)) / ((2.0+g2)*pow(1.0+g2-2.0*g*c, 1.5));
}
vec3 skyRadiance(vec3 dir, vec3 sunDir, float turb, float exposure){
  float h = max(dir.y, -0.05);
  float cosT = dot(dir, sunDir);
  /* Optical-depth approximation for a spherical-shell atmosphere. The offsets
     bound the grazing-angle singularity: with a tighter epsilon the horizon
     band reached ~14x the zenith radiance, and every glass tower in the city
     mirrored it back as a flat grey slab. */
  float sR = 1.0 / (h + 0.28);
  float sM = 1.0 / (h + 0.20);
  vec3 er = exp(-BETA_R * sR * 0.9);
  vec3 em = exp(-BETA_M * sM * turb);
  float sunUp = clamp(sunDir.y*1.6+0.16, 0.0, 1.0);
  vec3 sunTint = mix(vec3(1.0,0.42,0.16), vec3(1.0,0.97,0.94), smoothstep(0.0,0.32,sunDir.y));
  vec3 inR = BETA_R * rayleighPhase(cosT) * sR * 0.9;
  vec3 inM = BETA_M * miePhase(cosT, 0.76) * sM * turb;
  /* scaled so a clear zenith sits near 2.0 — the ambient IBL and the
     composite exposure are both calibrated against that. */
  vec3 col = (inR + inM) * sunTint * sunUp * 2.4;
  col *= mix(er, vec3(1.0), 0.55);
  /* horizon haze — Night City sits in a permanent smog inversion layer */
  float haze = pow(1.0 - clamp(abs(dir.y)*2.4, 0.0, 1.0), 3.0);
  col += mix(vec3(0.10,0.11,0.14), vec3(0.62,0.42,0.30), sunUp) * haze * (0.35 + turb*0.25);
  return col * exposure;
}

/* full sky including night sky, sun disc and cloud deck — shared by the sky
   pass and by the deferred resolve for background pixels */
vec3 skyFull(vec3 dir, vec3 sunDir, vec3 moonDir, vec3 sunCol,
             float turb, float nightAmt, float cloud, float time){
  vec3 col = skyRadiance(dir, sunDir, turb, 1.0);
  if (nightAmt > 0.01 && dir.y > -0.05) {
    /* cube-face chart: stable cell size in every direction, no horizon
       singularity and therefore no moire rings */
    vec3 ad = abs(dir);
    vec2 sc = (ad.y >= max(ad.x, ad.z)) ? dir.xz / ad.y
            : (ad.x >= ad.z)            ? dir.yz / ad.x
                                        : dir.xy / ad.z;
    vec2 gc = floor(sc * 240.0);
    float st = hash12(gc);
    float twinkle = 0.6 + 0.4*sin(time*2.2 + st*63.0);
    float star = pow(max(st - 0.982, 0.0) * 55.0, 3.0) * twinkle;
    vec3 stc = mix(vec3(0.72,0.82,1.0), vec3(1.0,0.86,0.68), hash12(gc+3.3));
    float pol = smoothstep(0.02, 0.55, dir.y);
    col += stc * star * nightAmt * pol * 1.6;
    float band = exp(-pow((dir.y*1.7 - dir.x*0.55 - 0.15), 2.0)*7.0);
    col += vec3(0.055,0.06,0.10) * band * nightAmt * pol;
    float md = dot(dir, moonDir);
    float disc = smoothstep(0.9985, 0.9994, md);
    float crat = fbm3(dir*40.0, 3);
    col += vec3(0.85,0.88,1.0) * disc * (0.72 + crat*0.5) * nightAmt * 3.0;
    col += vec3(0.28,0.33,0.5) * pow(max(md,0.0), 220.0) * nightAmt;
  }
  float sd = dot(dir, sunDir);
  col += sunCol * smoothstep(0.99965, 0.99985, sd) * 60.0;
  col += sunCol * pow(max(sd,0.0), 900.0) * 3.0;
  if (dir.y > 0.008) {
    /* clamping the divisor bounds how far the plane stretches at grazing
       angles, which is what was generating ring-shaped aliasing */
    vec3 cp = dir / max(dir.y, 0.14);
    vec2 uvC = cp.xz * 0.055 + vec2(time*0.0035, time*0.0018);
    float d = fbm3(vec3(uvC, time*0.01), 5);
    float cov = smoothstep(0.52 - cloud*0.34, 0.78, d) * smoothstep(0.02, 0.20, dir.y);
    /* After dark a cloud deck should occlude starlight, not emit — the old
       night floor here rendered as pale radial streaks across the sky. */
    vec3 lit = mix(vec3(0.020,0.022,0.030), sunCol*1.25, clamp(sunDir.y*1.5+0.25,0.0,1.0));
    vec3 shd = mix(vec3(0.008,0.009,0.014), vec3(0.30,0.32,0.38), clamp(sunDir.y,0.0,1.0));
    float sh = smoothstep(0.35, 0.85, fbm3(vec3(uvC*2.4, time*0.02), 3));
    col = mix(col, mix(shd, lit, sh), cov*0.88);
  }
  col = mix(col, mix(vec3(0.020,0.022,0.028), vec3(0.10,0.09,0.085),
            clamp(sunDir.y*2.0,0.0,1.0)), smoothstep(0.0, -0.09, dir.y));
  return col;
}
`;

SH.skyFS = `#version 300 es
precision highp float;
${SH.common}
${SH.skyCommon}
in vec2 vUv;
uniform mat4 uInvVP;
uniform vec3 uCamPos, uSunDir, uMoonDir, uSunCol;
uniform float uTime, uTurb, uNightAmt, uCloud, uExposure;
layout(location=0) out vec4 oCol;
void main(){
  vec4 p = uInvVP * vec4(vUv*2.0-1.0, 1.0, 1.0);
  vec3 dir = normalize(p.xyz/p.w - uCamPos);
  oCol = vec4(skyFull(dir, uSunDir, uMoonDir, uSunCol, uTurb, uNightAmt, uCloud, uTime) * uExposure, 1.0);
}`;

/* ========================= TILED DEFERRED LIGHTING ======================== */
SH.lightFS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
precision highp usampler2D;
${SH.common}
${SH.depthUtil}
${SH.skyCommon}
in vec2 vUv;
uniform sampler2D uAlbT, uNrmT, uEmiT, uDepthT, uAoT;
uniform sampler2DShadow uShadow0, uShadow1, uShadow2;
uniform sampler2D uLightT;       // RGBA32F, 3 rows: pos+range | col+intens | dir+cone
uniform usampler2D uTileT;       // RG32UI: offset,count
uniform usampler2D uIdxT;        // R32UI light indices
uniform mat4 uInvView, uInvProj, uLVP0, uLVP1, uLVP2;
uniform vec3 uCamPos, uSunDir, uSunCol, uMoonDir;
uniform vec2 uRes, uTiles;
uniform vec3 uCascadeSplit;
uniform float uTime, uNightAmt, uTurb, uShadowTexel, uAmbInt, uSunInt, uCloud;
layout(location=0) out vec4 oCol;

/* ------------------------------- BRDF ---------------------------------- */
float D_GGX(float NoH, float a){
  float a2 = a*a; float d = (NoH*a2 - NoH)*NoH + 1.0;
  return a2 / (PI*d*d + 1e-7);
}
float V_SmithGGX(float NoV, float NoL, float a){
  float a2 = a*a;
  float gv = NoL * sqrt(NoV*NoV*(1.0-a2)+a2);
  float gl = NoV * sqrt(NoL*NoL*(1.0-a2)+a2);
  return 0.5 / max(gv+gl, 1e-5);
}
vec3 F_Schlick(vec3 f0, float u){ float f = pow(1.0-u, 5.0); return f0 + (1.0-f0)*f; }
/* Karis' analytic env BRDF — no LUT texture needed */
vec3 envBRDFApprox(vec3 f0, float rough, float NoV){
  const vec4 c0 = vec4(-1.0,-0.0275,-0.572,0.022);
  const vec4 c1 = vec4( 1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough*c0 + c1;
  float a004 = min(r.x*r.x, exp2(-9.28*NoV))*r.x + r.y;
  vec2 ab = vec2(-1.04,1.04)*a004 + r.zw;
  return f0*ab.x + ab.y;
}
/* diffuse wrap for skin: cheap two-lobe subsurface */
vec3 sssWrap(float NoL, vec3 tint){
  float w = 0.45;
  float d = clamp((NoL + w) / ((1.0+w)*(1.0+w)), 0.0, 1.0);
  float back = clamp((-NoL + 0.35)/1.35, 0.0, 1.0);
  return vec3(d) + tint * back * 0.55;
}

/* ------------------------- cascaded shadow lookup ----------------------- */
float pcf(sampler2DShadow s, vec3 pr, float texel){
  float sum = 0.0;
  /* 9-tap rotated poisson — good quality/cost point for a 2k cascade */
  const vec2 P[9] = vec2[9](vec2(0.0,0.0), vec2(0.94,0.33), vec2(-0.31,0.95),
    vec2(-0.90,-0.42), vec2(0.42,-0.90), vec2(0.62,0.62), vec2(-0.66,0.58),
    vec2(-0.58,-0.66), vec2(0.70,-0.55));
  float ang = hash12(gl_FragCoord.xy)*TAU;
  float ca = cos(ang), sa = sin(ang);
  mat2 R = mat2(ca,-sa,sa,ca);
  for(int i=0;i<9;i++) sum += texture(s, vec3(pr.xy + R*P[i]*texel*1.35, pr.z));
  return sum/9.0;
}
float sunShadow(vec3 wp, float dist, float NoL){
  float bias = mix(0.0016, 0.006, 1.0-NoL);
  vec4 c;
  if (dist < uCascadeSplit.x){
    c = uLVP0*vec4(wp,1.0); vec3 pr = c.xyz/c.w*0.5+0.5; pr.z -= bias;
    if (all(greaterThan(pr.xy, vec2(0.01))) && all(lessThan(pr.xy, vec2(0.99))))
      return pcf(uShadow0, pr, uShadowTexel);
  }
  if (dist < uCascadeSplit.y){
    c = uLVP1*vec4(wp,1.0); vec3 pr = c.xyz/c.w*0.5+0.5; pr.z -= bias*2.2;
    if (all(greaterThan(pr.xy, vec2(0.01))) && all(lessThan(pr.xy, vec2(0.99))))
      return pcf(uShadow1, pr, uShadowTexel);
  }
  if (dist < uCascadeSplit.z){
    c = uLVP2*vec4(wp,1.0); vec3 pr = c.xyz/c.w*0.5+0.5; pr.z -= bias*5.0;
    if (all(greaterThan(pr.xy, vec2(0.01))) && all(lessThan(pr.xy, vec2(0.99))))
      return pcf(uShadow2, pr, uShadowTexel);
  }
  return 1.0;
}

void main(){
  float D = texture(uDepthT, vUv).r;
  vec4 emi = texture(uEmiT, vUv);
  if (D <= 0.0000001) {
    /* background pixel: resolve the sky analytically right here, which saves a
       full-screen pass and keeps the horizon consistent with the ambient IBL */
    vec3 dir = normalize(mat3(uInvView) * vec3((vUv*2.0-1.0)*uTanHalf, -1.0));
    oCol = vec4(skyFull(dir, uSunDir, uMoonDir, uSunCol, uTurb, uNightAmt, uCloud, uTime), 1.0);
    return;
  }

  vec4 nrmT = texture(uNrmT, vUv);
  vec4 albT = texture(uAlbT, vUv);
  vec3 N = octDec(nrmT.xy);
  float rough = max(nrmT.z, 0.035);
  float mm = nrmT.w;
  float model = floor(mm*0.5);
  float metal = mm - model*2.0;
  vec3 alb = albT.rgb;
  float mao = albT.a * texture(uAoT, vUv).r;

  vec3 vp = viewFromDepth(vUv, D);
  vec3 wp = (uInvView * vec4(vp,1.0)).xyz;
  vec3 V = normalize(uCamPos - wp);
  float dist = length(vp);
  float NoV = clamp(dot(N,V), 1e-4, 1.0);
  float a = rough*rough;
  vec3 f0 = mix(vec3(0.04), alb, metal);
  vec3 diffAlb = alb*(1.0-metal);

  vec3 Lo = vec3(0.0);

  /* ---------------- key light: sun by day, moon by night --------------- */
  vec3 L = uSunDir;
  vec3 kc = uSunCol*uSunInt;
  if (uSunDir.y < -0.02) { L = uMoonDir; kc = vec3(0.30,0.40,0.66)*0.55; }
  float NoL = dot(N,L);
  if (NoL > -0.3) {
    float sh = sunShadow(wp, dist, max(NoL,0.0));
    vec3 H = normalize(L+V);
    float NoH = clamp(dot(N,H),0.0,1.0), VoH = clamp(dot(V,H),0.0,1.0);
    vec3 F = F_Schlick(f0, VoH);
    float Dt = D_GGX(NoH, a), Vt = V_SmithGGX(NoV, max(NoL,1e-4), a);
    vec3 spec = F*Dt*Vt;
    vec3 dif;
    if (model > 0.5 && model < 1.5) dif = diffAlb/PI * sssWrap(NoL, vec3(0.62,0.16,0.11));
    else dif = diffAlb/PI * max(NoL,0.0);
    Lo += (dif + spec*max(NoL,0.0)) * kc * sh;
  }

  /* ---------------- tiled point / spot lights -------------------------- */
  ivec2 tile = ivec2(vUv * uTiles);
  uvec2 tv = texelFetch(uTileT, tile, 0).xy;
  uint off = tv.x, cnt = tv.y;
  for (uint i = 0u; i < cnt; i++) {
    uint li = texelFetch(uIdxT, ivec2(int((off+i) & 2047u), int((off+i) >> 11)), 0).r;
    ivec2 lt = ivec2(int(li), 0);
    vec4 P = texelFetch(uLightT, lt, 0);
    vec4 C = texelFetch(uLightT, ivec2(int(li),1), 0);
    vec3 dl = P.xyz - wp;
    float d2 = dot(dl,dl);
    float rng = P.w;
    if (d2 > rng*rng) continue;
    float d = sqrt(d2);
    vec3 Ld = dl/max(d,1e-4);
    /* inverse-square with a smooth window so lights end exactly at range */
    float win = clamp(1.0 - pow(d/rng, 4.0), 0.0, 1.0); win *= win;
    float atten = win / (d2 + 1.0);
    if (C.w > 1.5) {                       // spot: dir + cosines in row 2
      vec4 S = texelFetch(uLightT, ivec2(int(li),2), 0);
      float cd = dot(-Ld, S.xyz);
      float sp = clamp((cd - S.w) / max(1e-3, (1.0 - S.w)), 0.0, 1.0);
      atten *= sp*sp;
    }
    float nl = dot(N, Ld);
    if (nl <= -0.25) continue;
    vec3 H = normalize(Ld+V);
    float NoH = clamp(dot(N,H),0.0,1.0), VoH = clamp(dot(V,H),0.0,1.0);
    vec3 F = F_Schlick(f0, VoH);
    vec3 spec = F*D_GGX(NoH,a)*V_SmithGGX(NoV, max(nl,1e-4), a);
    vec3 dif;
    if (model > 0.5 && model < 1.5) dif = diffAlb/PI * sssWrap(nl, vec3(0.62,0.16,0.11));
    else dif = diffAlb/PI * max(nl,0.0);
    Lo += (dif + spec*max(nl,0.0)) * C.rgb * atten;
  }

  /* ---------------- ambient IBL from the analytic sky ------------------ */
  vec3 skyUp   = skyRadiance(vec3(0.0,1.0,0.0), uSunDir, uTurb, 1.0);
  vec3 skyHorz = skyRadiance(normalize(vec3(V.x,0.06,V.z)), uSunDir, uTurb, 1.0);
  vec3 gnd     = mix(vec3(0.035,0.032,0.030), vec3(0.10,0.09,0.085), clamp(uSunDir.y,0.0,1.0));
  /* hemisphere irradiance, biased to the normal */
  float up = N.y*0.5+0.5;
  vec3 irr = mix(gnd, mix(skyHorz, skyUp, up), up) * uAmbInt;
  /* night: the city itself is the dominant bounce source — warm sodium glow */
  /* the city's own bounce: warm sodium near the ground, cooler and weaker as
     you climb above the sign line. This is what actually lights Night City. */
  float streetLevel = clamp(1.0 - (wp.y - 2.0) * 0.016, 0.0, 1.0);
  vec3 cityGlow = mix(vec3(0.055,0.048,0.082), vec3(0.30,0.15,0.085), streetLevel);
  irr += cityGlow * uNightAmt * (0.55 + uAmbInt * 0.85) * 3.6;
  vec3 R = reflect(-V, N);
  vec3 envSpec = skyRadiance(normalize(vec3(R.x, max(R.y,-0.05), R.z)), uSunDir, uTurb, 1.0)*uAmbInt;
  envSpec = mix(envSpec, irr*1.4, rough*rough);
  vec3 amb = irr*diffAlb*mao + envSpec*envBRDFApprox(f0, rough, NoV)*mao;

  vec3 col = Lo + amb + emi.rgb;
  oCol = vec4(col, 1.0);
}`;

/* ================================ SSAO =================================== */
SH.ssaoFS = `#version 300 es
precision highp float;
${SH.common}
${SH.depthUtil}
in vec2 vUv;
uniform sampler2D uDepthT, uNrmT;
uniform mat4 uProj;
uniform vec2 uRes;
uniform float uRadius, uBias, uInt, uTime;
out vec4 oCol;
void main(){
  float D = texture(uDepthT, vUv).r;
  if (D <= 0.0000001) { oCol = vec4(1.0); return; }
  vec3 P = viewFromDepth(vUv, D);
  vec3 N = octDec(texture(uNrmT, vUv).xy);
  /* world normal -> view normal via the transpose of the view rotation is
     folded into the caller's uProj-space; we re-derive from depth instead to
     avoid needing the view matrix here */
  vec3 dx = dFdx(P), dy = dFdy(P);
  vec3 Nv = normalize(cross(dx, dy));
  float ang = hash12(gl_FragCoord.xy + uTime*0.0)*TAU;
  float ca = cos(ang), sa = sin(ang);
  float occ = 0.0;
  const int K = 16;
  for (int i = 0; i < K; i++) {
    float fi = float(i);
    /* golden-spiral hemisphere kernel, radius grows with sample index */
    float r = sqrt((fi+0.5)/float(K));
    float th = fi*2.39996323 + ang;
    vec3 s = vec3(cos(th)*r, sin(th)*r, 0.35 + 0.65*hash11(fi*17.3));
    if (dot(s, Nv) < 0.0) s = -s + Nv*0.4;
    vec3 sp = P + s * uRadius * (0.35 + 0.65*r);
    vec4 cp = uProj * vec4(sp, 1.0);
    vec2 su = (cp.xy/cp.w)*0.5+0.5;
    if (su.x < 0.0 || su.x > 1.0 || su.y < 0.0 || su.y > 1.0) continue;
    float sd = linDepth(texture(uDepthT, su).r);
    float sampleDepth = -sp.z;
    float rangeChk = smoothstep(0.0, 1.0, uRadius / max(abs(sampleDepth - sd), 1e-4));
    occ += (sd < sampleDepth - uBias ? 1.0 : 0.0) * rangeChk;
  }
  float ao = 1.0 - (occ/float(K)) * uInt;
  oCol = vec4(clamp(ao, 0.0, 1.0));
}`;

SH.blurFS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex, uDepthT;
uniform vec2 uDir, uTexel;
uniform float uNear;
out vec4 oCol;
float lz(float D){ return uNear/max(2.0*D-1.0,1e-7); }
void main(){
  float c = lz(texture(uDepthT, vUv).r);
  float sum = 0.0, wsum = 0.0;
  for (int i = -4; i <= 4; i++) {
    vec2 uv = vUv + uDir*uTexel*float(i);
    float d = lz(texture(uDepthT, uv).r);
    float w = exp(-float(i*i)*0.14) * exp(-abs(d-c)*1.5);
    sum += texture(uTex, uv).r * w; wsum += w;
  }
  oCol = vec4(sum/max(wsum,1e-5));
}`;

/* ============================ SSR (wet streets) ========================== */
SH.ssrFS = `#version 300 es
precision highp float;
${SH.common}
${SH.depthUtil}
in vec2 vUv;
uniform sampler2D uColT, uDepthT, uNrmT;
uniform mat4 uProj, uView;
uniform vec3 uCamPos;
uniform vec2 uRes;
uniform float uTime;
out vec4 oCol;
void main(){
  vec4 nt = texture(uNrmT, vUv);
  float rough = nt.z;
  float D = texture(uDepthT, vUv).r;
  if (D <= 0.0000001 || rough > 0.42) { oCol = vec4(0.0); return; }
  vec3 P = viewFromDepth(vUv, D);
  vec3 Nw = octDec(nt.xy);
  vec3 Nv = normalize(mat3(uView) * Nw);
  vec3 V = normalize(P);
  vec3 R = reflect(V, Nv);
  if (R.z > 0.0 && P.z + R.z*0.1 > -uNear) { oCol = vec4(0.0); return; }
  /* jitter start to break up banding, then march in view space */
  float jit = hash12(gl_FragCoord.xy + fract(uTime)*13.0);
  float step0 = 0.30 + jit*0.18;
  vec3 pos = P + R*step0;
  float hit = 0.0; vec2 huv = vec2(0.0); float stepLen = 0.30;
  for (int i = 0; i < 40; i++) {
    vec4 cp = uProj*vec4(pos,1.0);
    vec2 uv = (cp.xy/cp.w)*0.5+0.5;
    if (uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) break;
    float sd = linDepth(texture(uDepthT, uv).r);
    float pd = -pos.z;
    float diff = pd - sd;
    if (diff > 0.02 && diff < stepLen*3.0 + 0.35) {
      /* binary refine for a tight contact */
      vec3 lo = pos - R*stepLen, hi = pos;
      for (int j = 0; j < 5; j++) {
        vec3 mid = (lo+hi)*0.5;
        vec4 mc = uProj*vec4(mid,1.0);
        vec2 mu = (mc.xy/mc.w)*0.5+0.5;
        float md = linDepth(texture(uDepthT, mu).r);
        if (-mid.z - md > 0.0) hi = mid; else lo = mid;
      }
      vec4 fc = uProj*vec4((lo+hi)*0.5,1.0);
      huv = (fc.xy/fc.w)*0.5+0.5; hit = 1.0; break;
    }
    pos += R*stepLen;
    stepLen *= 1.19;
  }
  if (hit < 0.5) { oCol = vec4(0.0); return; }
  /* fade at screen borders + at grazing/backfacing angles */
  vec2 e = smoothstep(vec2(0.0), vec2(0.14), huv) * smoothstep(vec2(0.0), vec2(0.14), 1.0-huv);
  float fade = e.x*e.y * (1.0 - smoothstep(0.14, 0.42, rough)) * clamp(-R.z*1.6, 0.0, 1.0);
  vec3 c = texture(uColT, huv).rgb;
  oCol = vec4(c, fade);
}`;

/* ===================== VOLUMETRIC SCATTERING (god rays) ================== */
SH.volFS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
precision highp usampler2D;
${SH.common}
${SH.depthUtil}
in vec2 vUv;
uniform sampler2D uDepthT;
uniform sampler2DShadow uShadow0, uShadow1;
uniform sampler2D uLightT;
uniform usampler2D uTileT, uIdxT;
uniform mat4 uInvView, uLVP0, uLVP1;
uniform vec3 uCamPos, uSunDir, uSunCol;
uniform vec2 uTiles;
uniform vec2 uCascadeSplit;
uniform float uTime, uDensity, uNightAmt, uFogHeight, uFogFalloff, uRainAmt;
out vec4 oCol;
float phaseHG(float c, float g){ float g2=g*g; return (1.0-g2)/(4.0*PI*pow(1.0+g2-2.0*g*c,1.5)); }
void main(){
  float D = texture(uDepthT, vUv).r;
  float far = D <= 0.0000001 ? 260.0 : min(linDepth(D), 260.0);
  vec3 vdir = normalize((uInvView * vec4((vUv*2.0-1.0)*vec2(1.0), -1.0, 0.0)).xyz);
  /* rebuild the true world ray through this pixel */
  vec3 vp = viewFromDepth(vUv, max(D, 0.5000001));
  vec3 wpFar = (uInvView*vec4(normalize(vp)*far, 1.0)).xyz;
  vec3 ro = uCamPos, rd = normalize(wpFar - ro);
  const int STEPS = 24;
  float jitter = hash12(gl_FragCoord.xy + fract(uTime)*57.0);
  float dt = far/float(STEPS);
  vec3 acc = vec3(0.0); float trans = 1.0;
  float cosS = dot(rd, uSunDir);
  float phS = phaseHG(cosS, 0.62);
  for (int i = 0; i < STEPS; i++) {
    float t = (float(i)+jitter)*dt;
    vec3 p = ro + rd*t;
    /* exponential height fog + drifting smog cells */
    float hf = exp(-max(p.y - uFogHeight, 0.0)*uFogFalloff);
    float turb = fbm3(p*0.012 + vec3(uTime*0.02,0.0,uTime*0.014), 3);
    float dens = uDensity * hf * (0.55 + turb*0.95) * dt;
    dens *= 1.0 + uRainAmt*1.6;
    if (dens < 1e-5) continue;
    /* sun/moon transmittance through the cascades */
    float sh = 1.0;
    if (t < uCascadeSplit.x) { vec4 c = uLVP0*vec4(p,1.0); vec3 pr = c.xyz/c.w*0.5+0.5;
      if (all(greaterThan(pr.xy, vec2(0.0))) && all(lessThan(pr.xy, vec2(1.0)))) sh = texture(uShadow0, vec3(pr.xy, pr.z-0.0035)); }
    else if (t < uCascadeSplit.y) { vec4 c = uLVP1*vec4(p,1.0); vec3 pr = c.xyz/c.w*0.5+0.5;
      if (all(greaterThan(pr.xy, vec2(0.0))) && all(lessThan(pr.xy, vec2(1.0)))) sh = texture(uShadow1, vec3(pr.xy, pr.z-0.006)); }
    vec3 inScat = uSunCol * sh * phS * 3.2;
    /* neon in-scatter: the tile's lights bleed into the fog — the single
       biggest contributor to the "Night City glow" look */
    ivec2 tile = ivec2(vUv*uTiles);
    uvec2 tv = texelFetch(uTileT, tile, 0).xy;
    uint cnt = min(tv.y, 6u);
    for (uint k = 0u; k < cnt; k++) {
      uint li = texelFetch(uIdxT, ivec2(int((tv.x+k)&2047u), int((tv.x+k)>>11)), 0).r;
      vec4 LP = texelFetch(uLightT, ivec2(int(li),0), 0);
      vec4 LC = texelFetch(uLightT, ivec2(int(li),1), 0);
      vec3 dl = LP.xyz - p; float d2 = dot(dl,dl);
      if (d2 > LP.w*LP.w) continue;
      float d = sqrt(d2);
      float win = clamp(1.0-pow(d/LP.w,4.0),0.0,1.0); win*=win;
      float ph = phaseHG(dot(rd, dl/max(d,1e-4)), 0.35);
      inScat += LC.rgb * (win/(d2+1.0)) * ph * 9.0;
    }
    vec3 ambS = mix(vec3(0.05,0.06,0.09), vec3(0.16,0.10,0.07), uNightAmt)*0.5;
    acc += trans * (inScat + ambS) * dens;
    trans *= exp(-dens*1.35);
    if (trans < 0.012) break;
  }
  oCol = vec4(acc, trans);
}`;

/* ============================== BLOOM ==================================== */
SH.bloomPreFS = `#version 300 es
precision highp float;
${SH.common}
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThresh, uKnee;
out vec4 oCol;
void main(){
  vec3 c = vec3(0.0);
  /* 4-tap box prefilter kills most fireflies before the mip chain */
  c += texture(uTex, vUv + uTexel*vec2(-1,-1)).rgb;
  c += texture(uTex, vUv + uTexel*vec2( 1,-1)).rgb;
  c += texture(uTex, vUv + uTexel*vec2(-1, 1)).rgb;
  c += texture(uTex, vUv + uTexel*vec2( 1, 1)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThresh + uKnee, 0.0, 2.0*uKnee);
  soft = soft*soft/(4.0*uKnee + 1e-5);
  float w = max(soft, br - uThresh)/max(br, 1e-5);
  oCol = vec4(c*w, 1.0);
}`;

SH.downFS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; out vec4 oCol;
void main(){
  /* Jimenez 13-tap downsample — stable under motion, no pulsing */
  vec3 a = texture(uTex, vUv + uTexel*vec2(-2,-2)).rgb;
  vec3 b = texture(uTex, vUv + uTexel*vec2( 0,-2)).rgb;
  vec3 c = texture(uTex, vUv + uTexel*vec2( 2,-2)).rgb;
  vec3 d = texture(uTex, vUv + uTexel*vec2(-1,-1)).rgb;
  vec3 e = texture(uTex, vUv + uTexel*vec2( 1,-1)).rgb;
  vec3 f = texture(uTex, vUv + uTexel*vec2(-2, 0)).rgb;
  vec3 g = texture(uTex, vUv).rgb;
  vec3 h = texture(uTex, vUv + uTexel*vec2( 2, 0)).rgb;
  vec3 i = texture(uTex, vUv + uTexel*vec2(-1, 1)).rgb;
  vec3 j = texture(uTex, vUv + uTexel*vec2( 1, 1)).rgb;
  vec3 k = texture(uTex, vUv + uTexel*vec2(-2, 2)).rgb;
  vec3 l = texture(uTex, vUv + uTexel*vec2( 0, 2)).rgb;
  vec3 m = texture(uTex, vUv + uTexel*vec2( 2, 2)).rgb;
  vec3 o = (d+e+i+j)*0.125 + (a+b+g+f)*0.03125 + (b+c+h+g)*0.03125
         + (f+g+l+k)*0.03125 + (g+h+m+l)*0.03125;
  oCol = vec4(o, 1.0);
}`;

SH.upFS = `#version 300 es
precision highp float;
in vec2 vUv; uniform sampler2D uTex, uPrev; uniform vec2 uTexel; uniform float uRadius;
out vec4 oCol;
void main(){
  vec2 t = uTexel*uRadius;
  vec3 s = texture(uTex, vUv + vec2(-t.x, -t.y)).rgb
         + texture(uTex, vUv + vec2( 0.0, -t.y)).rgb*2.0
         + texture(uTex, vUv + vec2( t.x, -t.y)).rgb
         + texture(uTex, vUv + vec2(-t.x, 0.0)).rgb*2.0
         + texture(uTex, vUv).rgb*4.0
         + texture(uTex, vUv + vec2( t.x, 0.0)).rgb*2.0
         + texture(uTex, vUv + vec2(-t.x, t.y)).rgb
         + texture(uTex, vUv + vec2( 0.0, t.y)).rgb*2.0
         + texture(uTex, vUv + vec2( t.x, t.y)).rgb;
  oCol = vec4(s*(1.0/16.0), 1.0);   // additive blend supplies the previous level
}`;

/* ========================= COMPOSITE / TONEMAP / POST ==================== */
SH.compFS = `#version 300 es
precision highp float;
${SH.common}
${SH.depthUtil}
in vec2 vUv;
uniform sampler2D uColT, uBloomT, uVolT, uSsrT, uDepthT, uNrmT, uVelT;
uniform vec2 uRes;
uniform float uTime, uExposure, uBloomInt, uVignette, uGrain, uAberr, uSat,
              uMotionBlur, uGlitch, uHackFx, uDamage, uContrast, uLift, uScanline;
out vec4 oCol;
/* ACES fitted RRT+ODT (Narkowicz) — the AAA default */
vec3 aces(vec3 x){
  const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
}
vec3 sampleScene(vec2 uv){
  vec3 c = texture(uColT, uv).rgb;
  vec4 ssr = texture(uSsrT, uv);
  vec4 nt = texture(uNrmT, uv);
  float metal = nt.w - floor(nt.w*0.5)*2.0;
  c = mix(c, c + ssr.rgb*mix(0.55, 1.0, metal), ssr.a);
  vec4 vol = texture(uVolT, uv);
  c = c*vol.a + vol.rgb;
  return c;
}
void main(){
  vec2 uv = vUv;
  /* --- glitch: horizontal block displacement, ramps with damage/hacks --- */
  float gAmt = max(uGlitch, max(uDamage*0.35, uHackFx*0.6));
  if (gAmt > 0.001) {
    float band = floor(uv.y*38.0);
    float t = floor(uTime*14.0);
    float r = hash12(vec2(band, t));
    if (r > 1.0 - gAmt*0.42) uv.x += (hash12(vec2(band, t+1.0))-0.5)*0.09*gAmt;
    if (hash12(vec2(t, 3.7)) > 0.985 - gAmt*0.1) uv.y = fract(uv.y + 0.012*gAmt);
  }
  /* --- camera motion blur along the velocity vector --------------------- */
  vec3 col;
  vec2 vel = texture(uVelT, uv).xy * uMotionBlur;
  float vl = length(vel);
  if (vl > 0.0012) {
    vel = normalize(vel) * min(vl, 0.028);
    col = vec3(0.0); float wsum = 0.0;
    for (int i = 0; i < 7; i++) {
      float f = (float(i)/6.0 - 0.5);
      float w = 1.0 - abs(f)*1.2;
      col += sampleScene(uv - vel*f) * w; wsum += w;
    }
    col /= wsum;
  } else col = sampleScene(uv);

  /* --- lateral chromatic aberration, stronger toward the edges ---------- */
  float ab = uAberr*(1.0 + gAmt*7.0);
  if (ab > 0.0001) {
    vec2 d = (uv-0.5);
    float r2 = dot(d,d);
    vec3 s1 = sampleScene(uv - d*ab*r2*2.2);
    vec3 s2 = sampleScene(uv + d*ab*r2*2.2);
    col = vec3(s1.r, col.g, s2.b);
  }
  /* additive bloom from the mip chain — this was computed every frame and
     then dropped on the floor, which is why emissive surfaces had no glow */
  if (uBloomInt > 0.0) col += texture(uBloomT, uv).rgb * uBloomInt;
  col *= uExposure;
  col = aces(col);
  /* contrast + lift in display space, then saturation */
  col = clamp((col - 0.5)*uContrast + 0.5 + uLift, 0.0, 1.0);
  float l = luma(col);
  col = clamp(mix(vec3(l), col, uSat), 0.0, 1.0);
  /* --- quickhack overlay: cyan channel push + scanline crawl ------------ */
  if (uHackFx > 0.001) {
    float sl = sin((uv.y*uRes.y*0.9) - uTime*40.0)*0.5+0.5;
    col = mix(col, vec3(col.r*0.35, col.g*0.9, col.b*1.5) + vec3(0.0,0.06,0.13)*sl, uHackFx*0.75);
  }
  if (uDamage > 0.001) col = mix(col, vec3(col.r*1.25, col.g*0.42, col.b*0.42), uDamage*0.55);
  /* --- vignette / grain / scanlines ------------------------------------- */
  vec2 vd = (uv-0.5)*vec2(uRes.x/uRes.y, 1.0);
  col *= 1.0 - clamp(dot(vd,vd)*uVignette, 0.0, 0.94);
  float gr = (hash12(gl_FragCoord.xy + fract(uTime)*311.7)-0.5);
  col += gr*uGrain*(1.0 - luma(col)*0.55);
  col *= 1.0 - uScanline*(sin(uv.y*uRes.y*3.14159)*0.5+0.5)*0.06;
  oCol = vec4(col, 1.0);
}`;

/* ================================ FXAA =================================== */
SH.fxaaFS = `#version 300 es
precision highp float;
${SH.common}
in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; out vec4 oCol;
void main(){
  vec3 rgbNW = texture(uTex, vUv + vec2(-1,-1)*uTexel).rgb;
  vec3 rgbNE = texture(uTex, vUv + vec2( 1,-1)*uTexel).rgb;
  vec3 rgbSW = texture(uTex, vUv + vec2(-1, 1)*uTexel).rgb;
  vec3 rgbSE = texture(uTex, vUv + vec2( 1, 1)*uTexel).rgb;
  vec3 rgbM  = texture(uTex, vUv).rgb;
  float lNW = luma(rgbNW), lNE = luma(rgbNE), lSW = luma(rgbSW), lSE = luma(rgbSE), lM = luma(rgbM);
  float lMin = min(lM, min(min(lNW,lNE), min(lSW,lSE)));
  float lMax = max(lM, max(max(lNW,lNE), max(lSW,lSE)));
  if (lMax - lMin < max(0.0312, lMax*0.125)) { oCol = vec4(rgbM,1.0); return; }
  vec2 dir = vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
  float dr = max((lNW+lNE+lSW+lSE)*0.25*0.125, 0.0078125);
  float rcp = 1.0/(min(abs(dir.x),abs(dir.y))+dr);
  dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*uTexel;
  vec3 rA = 0.5*(texture(uTex, vUv+dir*(1.0/3.0-0.5)).rgb + texture(uTex, vUv+dir*(2.0/3.0-0.5)).rgb);
  vec3 rB = rA*0.5 + 0.25*(texture(uTex, vUv+dir*-0.5).rgb + texture(uTex, vUv+dir*0.5).rgb);
  float lB = luma(rB);
  oCol = vec4((lB < lMin || lB > lMax) ? rA : rB, 1.0);
}`;

/* ========================= FORWARD: PARTICLES / DECALS =================== */
SH.partVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPosSize;    // xyz pos, w size
layout(location=2) in vec4 aColLife;    // rgb col, a life 0..1
layout(location=3) in vec4 aExtra;      // x rot, y kind, z stretchX, w stretchY
uniform mat4 uVP; uniform vec3 uRight, uUp, uCamPos;
out vec2 vUv; out vec4 vCol; out float vKind; out vec3 vW;
void main(){
  float s = aPosSize.w;
  float c = cos(aExtra.x), sn = sin(aExtra.x);
  vec2 q = vec2(aCorner.x*c - aCorner.y*sn, aCorner.x*sn + aCorner.y*c);
  q *= vec2(aExtra.z, aExtra.w);
  vec3 w = aPosSize.xyz + (uRight*q.x + uUp*q.y)*s;
  vW = w; vUv = aCorner*0.5+0.5; vCol = aColLife; vKind = aExtra.y;
  gl_Position = uVP*vec4(w,1.0);
}`;

SH.partFS = `#version 300 es
precision highp float;
${SH.common}
${SH.depthUtil}
in vec2 vUv; in vec4 vCol; in float vKind; in vec3 vW;
uniform sampler2D uDepthT; uniform vec2 uRes; uniform float uTime;
out vec4 oCol;
void main(){
  vec2 p = vUv*2.0-1.0;
  float r = length(p);
  float a = 0.0;
  int k = int(vKind + 0.5);
  if (k == 0) {                    // soft smoke puff
    a = smoothstep(1.0, 0.05, r) * (0.35 + 0.65*fbm3(vec3(vUv*4.0, uTime*0.4 + vCol.a*8.0), 3));
  } else if (k == 1) {             // spark / tracer core
    a = smoothstep(1.0, 0.0, r); a *= a*a;
  } else if (k == 2) {             // muzzle flash petals
    float ang = atan(p.y,p.x);
    float pet = 0.55 + 0.45*cos(ang*6.0 + vCol.a*20.0);
    a = smoothstep(pet, pet*0.15, r);
  } else if (k == 3) {             // rain streak
    a = smoothstep(1.0, 0.2, abs(p.x)) * smoothstep(1.0, 0.0, abs(p.y));
  } else if (k == 4) {             // blood mist
    a = smoothstep(1.0, 0.1, r) * (0.4+0.6*hash12(vUv*31.0));
  } else {                         // generic glow
    a = pow(smoothstep(1.0, 0.0, r), 2.2);
  }
  /* soft-particle depth fade so smoke doesn't slice through geometry */
  float sd = linDepth(texelFetch(uDepthT, ivec2(gl_FragCoord.xy), 0).r);
  float pd = linDepth(gl_FragCoord.z);
  a *= clamp((sd - pd)*0.9, 0.0, 1.0);
  a *= vCol.a;
  if (a < 0.004) discard;
  oCol = vec4(vCol.rgb*a, a);
}`;

/* ========================= FORWARD: EMISSIVE STRIPS ====================== */
/* Neon tubes / holo panels drawn after the deferred resolve so they can glow
   without polluting the G-buffer's material channels.                        */
SH.neonVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aCol;
layout(location=4) in vec4 aMat;      // x=kind y=flicker seed z=scrollSpeed w=intensity
uniform mat4 uVP, uModel; uniform float uTime; uniform vec3 uCamPos;
out vec2 vUv; out vec4 vCol; out vec4 vMat; out vec3 vW; out vec3 vN;
void main(){
  vec4 w = uModel*vec4(aPos,1.0);
  vW = w.xyz; vN = mat3(uModel)*aNrm; vUv = aUv; vCol = aCol;
  vMat = vec4(floor(aMat.x*255.0+0.5)/64.0, aMat.y, aMat.z, aMat.w*8.0);
  gl_Position = uVP*w;
}`;

SH.neonFS = `#version 300 es
precision highp float;
${SH.common}
${SH.depthUtil}
in vec2 vUv; in vec4 vCol; in vec4 vMat; in vec3 vW; in vec3 vN;
uniform float uTime, uNightAmt; uniform vec3 uCamPos;
uniform sampler2D uDepthT;
out vec4 oCol;
/* 5x7 pixel font — enough for the ad tickers to read as real text */
float glyph(vec2 uv, int ch){
  if (uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) return 0.0;
  ivec2 p = ivec2(uv*vec2(5.0,7.0));
  int bit = p.y*5 + p.x;
  int row = p.y;
  /* procedural pseudo-glyphs: deterministic per (ch,row) bit patterns that
     read as dense kanji/latin signage at distance */
  float h = hash12(vec2(float(ch)*7.3, float(row)*3.1));
  int mask = int(h*31.0);
  return float((mask >> p.x) & 1);
}
void main(){
  int kind = int(vMat.x+0.5);
  vec3 c = vCol.rgb;
  float a = 1.0, e = vMat.w;
  float fl = 1.0;
  /* dying-tube flicker: most tubes steady, a few stutter hard */
  float fseed = vMat.y;
  if (fseed > 0.72) {
    float t = uTime*(3.0 + fseed*9.0) + fseed*40.0;
    fl = step(0.22, fract(sin(t)*43758.5453)) * (0.55+0.45*sin(uTime*60.0*fseed));
    fl = clamp(fl, 0.25, 1.0);
  } else if (fseed > 0.55) fl = 0.86 + 0.14*sin(uTime*8.0 + fseed*30.0);

  if (kind == 0) {                 // neon tube: bright core, falloff shoulder
    float d = abs(vUv.y-0.5)*2.0;
    float core = smoothstep(1.0, 0.0, d);
    e *= (core*core*2.4 + 0.35);
    a = 1.0;
  } else if (kind == 1) {          // scrolling ticker board
    vec2 uv = vUv;
    uv.x = fract(uv.x + uTime*vMat.z*0.06);
    float cols = 24.0;
    vec2 cell = vec2(uv.x*cols, uv.y);
    int ci = int(cell.x);
    float g = glyph(vec2(fract(cell.x)*1.25-0.12, (cell.y-0.18)*1.55), ci + int(floor(uTime*vMat.z*0.06*cols)));
    e *= g*2.2 + 0.05;
    c = mix(c*0.25, c, g);
  } else if (kind == 2) {          // holo ad plate: vertical scan + parallax bands
    float band = sin((vUv.y*46.0) - uTime*3.4)*0.5+0.5;
    float wob = fbm3(vec3(vUv*6.0, uTime*0.35), 3);
    e *= (0.4 + band*0.55 + wob*0.5);
    a = 0.82 + band*0.18;
    c = mix(c, c.bgr, wob*0.35);
  } else if (kind == 3) {          // street lamp lens
    float d = length(vUv-0.5)*2.0;
    e *= smoothstep(1.0, 0.0, d)*2.0;
  } else if (kind == 4) {          // window emissive strip
    e *= uNightAmt;
  }
  e *= fl;
  /* view-dependent bloom booster at grazing angles sells the glass tube */
  vec3 V = normalize(uCamPos - vW);
  float rim = pow(1.0 - abs(dot(normalize(vN), V)), 2.0);
  oCol = vec4(c*e*(1.0+rim*0.85), a);
}`;

/* ============================= WATER SURFACE ============================= */
SH.waterVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP, uModel; uniform float uTime; uniform vec3 uCamPos;
out vec3 vW; out vec2 vUv;
void main(){
  vec3 p = aPos;
  /* two crossed gerstner-ish trains keep the bay from looking like a plane */
  float w1 = sin(p.x*0.055 + uTime*0.75)*0.36;
  float w2 = sin(p.z*0.041 - uTime*0.55 + p.x*0.02)*0.28;
  p.y += w1 + w2;
  vec4 w = uModel*vec4(p,1.0);
  vW = w.xyz; vUv = p.xz*0.02;
  gl_Position = uVP*w;
}`;

SH.waterFS = `#version 300 es
precision highp float;
${SH.common}
${SH.skyCommon}
in vec3 vW; in vec2 vUv;
uniform vec3 uCamPos, uSunDir, uSunCol;
uniform float uTime, uTurb, uNightAmt;
layout(location=0) out vec4 oAlb;
layout(location=1) out vec4 oNrm;
layout(location=2) out vec4 oEmi;
layout(location=3) out vec4 oVel;
void main(){
  vec2 uv = vUv;
  float n1 = fbm3(vec3(uv*7.0 + vec2(uTime*0.06, 0.0), uTime*0.11), 4);
  float n2 = fbm3(vec3(uv*19.0 - vec2(0.0, uTime*0.09), uTime*0.17), 3);
  vec3 N = normalize(vec3((n1-0.5)*1.1 + (n2-0.5)*0.55, 1.0, (n2-0.5)*1.1 + (n1-0.5)*0.55));
  oAlb = vec4(vec3(0.010,0.021,0.030), 1.0);
  oNrm = vec4(octEnc(N), 0.035, 0.02);
  oEmi = vec4(0.0,0.0,0.0,1.0);
  oVel = vec4(0.0);
}`;

/* ======================= 2D SPRITE (viewmodel decals) ==================== */
SH.decalVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aCol;
uniform mat4 uVP, uModel;
out vec2 vUv; out vec4 vCol; out vec3 vN; out vec3 vW;
void main(){ vec4 w = uModel*vec4(aPos,1.0); vW = w.xyz; vN = mat3(uModel)*aNrm;
  vUv = aUv; vCol = aCol; gl_Position = uVP*w; }`;

SH.decalFS = `#version 300 es
precision highp float;
${SH.common}
in vec2 vUv; in vec4 vCol; in vec3 vN; in vec3 vW;
uniform float uTime;
out vec4 oCol;
void main(){
  vec2 p = vUv*2.0-1.0;
  float r = length(p);
  /* impact crater: dark centre, bright rim, radial cracks */
  float crack = 0.0;
  float ang = atan(p.y,p.x);
  for (int i=0;i<6;i++){
    float a0 = hash11(float(i)*3.7 + vCol.a*100.0)*TAU;
    crack = max(crack, smoothstep(0.14, 0.0, abs(mod(ang-a0+PI, TAU)-PI)) * smoothstep(1.0, 0.15, r));
  }
  float core = smoothstep(0.55, 0.0, r);
  float a = clamp(core + crack*0.75, 0.0, 1.0) * vCol.a;
  if (a < 0.01) discard;
  oCol = vec4(vCol.rgb*mix(1.0, 0.25, core), a);
}`;
</script>
