/* 10_core.js — renderer, HDR post stack, camera rig, light budget. OWNER: core-render agent.
 *
 * Pipeline (all hand-written; r128 core build has no EffectComposer):
 *   scene -> HDR RT (HalfFloat + DepthTexture)
 *   -> SSAO (half res, depth-only normals) -> bilateral blur
 *   -> SSR   (half res, ground-only, puddle masked) -> blur
 *   -> volumetric height fog (quarter-ish res, dithered raymarch, emitter coloured) -> blur
 *   -> resolve (scene * AO + SSR + fog)                      = the HDR "lit" frame
 *   -> bloom: bright pass (soft knee) -> 6 mip downsample -> tent upsample+add
 *   -> anamorphic streaks (2 wide horizontal passes on the bright buffer)
 *   -> composite: lens rain + chromatic aberration + bloom*dirt + streaks
 *                 + ACES filmic + lift/gamma/gain grade + split tone + S-curve
 *                 + vignette + grain  -> sRGB
 *   -> FXAA -> screen
 *
 * COLOUR MANAGEMENT NOTE for other agents: renderer.outputEncoding is LEFT LINEAR and
 * renderer.toneMapping is NoToneMapping on purpose — the scene is rendered into a linear
 * HDR buffer and the composite pass does ACES + sRGB itself. Set `texture.encoding =
 * THREE.sRGBEncoding` on your *albedo/colour* maps as usual; that is per-texture and
 * unaffected. Emissive colours may exceed 1.0 (e.g. color.setRGB(0,4,6)) — that is how you
 * get something to bloom.
 *
 * Public: init render resize setQuality shake hitstop registerLight camTarget
 *         camera renderer scene env sky stats grade fx
 */
VH.Core = (function () {
  const U = VH.util;

  /* ------------------------------------------------------------------ state */
  let renderer, scene, camera, ready = false, postOK = false;
  let pmrem = null;
  let W = 2, H = 2;                    // drawing buffer size (device px)
  let time = 0, frames = 0;

  const camTarget = {
    pos: new THREE.Vector3(0, 3.1, 8),
    look: new THREE.Vector3(0, 1.6, 0),
    fov: 55,
    shakeMul: 1,
  };

  /* smoothed camera state */
  const camPos = new THREE.Vector3(0, 3.1, 8);
  const camVel = new THREE.Vector3();
  const camLook = new THREE.Vector3(0, 1.6, 0);
  const lookVel = new THREE.Vector3();
  let curFov = 55, fovVel = 0;
  let trauma = 0, traumaDecay = 1.4, hitstopT = 0, shakeSeed = Math.random() * 1000;
  let fovKick = 0, fovKickVel = 0;

  const stats = { calls: 0, tris: 0, programs: 0, sceneCalls: 0, sceneTris: 0, lights: 0, q: 2, rt: '0x0' };

  /* art-direction knobs — live-tweakable from the console while iterating */
  const grade = {
    exposure: 1.30,
    bloom: 0.018,
    bloomDirt: 0.10,
    streak: 0.008,
    lift: [0.004, 0.010, 0.016],
    gamma: [1.00, 1.00, 1.02],
    gain: [1.02, 0.99, 0.97],
    shadowTint: [-0.010, 0.016, 0.040],
    highTint: [0.045, 0.020, -0.020],
    sat: 1.10,
    contrast: 0.22,
    vignette: 0.36,
    grain: 0.032,
    ca: 0.85,
    rain: 0.55,
    fogDensity: 0.030,
    fogHeight: 0.075,
    fogBaseY: -1.0,
    fogColor: [0.055, 0.085, 0.115],
    fogAmb: 0.11,
    fogScatter: 0.010,
    aoStrength: 0.85,
    ssr: 0.90,
  };

  /* quality profile */
  const Q = {
    level: 2, scale: 1.0, bloomMips: 6,
    ao: true, aoTaps: 10, aoScale: 0.5,
    ssr: true, ssrSteps: 26, ssrScale: 0.5,
    vol: true, volSteps: 18, volScale: 0.42,
    streaks: true, lensRain: true, maxLights: 10,
  };

  /* ------------------------------------------------------------ GLSL library */
  const VERT = [
    'precision highp float;',
    'attribute vec3 position;',
    'varying vec2 vUv;',
    'void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }'
  ].join('\n');

  const LIB = [
    'precision highp float;',
    'precision highp int;',
    'varying vec2 vUv;',
    'float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }',
    'float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }',
    'vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973)); p3 += dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }',
    /* interleaved gradient noise — good cheap dither */
    'float ign(vec2 p){ return fract(52.9829189*fract(0.06711056*p.x + 0.00583715*p.y)); }',
    'float h1(float n){ return fract(sin(n)*43758.5453123); }',
    'float vnoise(vec3 x){',
    '  vec3 p = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);',
    '  float n = p.x + p.y*57.0 + p.z*113.0;',
    '  return mix(mix(mix(h1(n), h1(n+1.0),f.x), mix(h1(n+57.0), h1(n+58.0),f.x),f.y),',
    '             mix(mix(h1(n+113.0),h1(n+114.0),f.x), mix(h1(n+170.0),h1(n+171.0),f.x),f.y),f.z);',
    '}'
  ].join('\n');

  /* depth helpers, expects uNear uFar uTan uAspect */
  const DEPTH = [
    'uniform float uNear, uFar, uTan, uAspect;',
    'uniform sampler2D tDepth;',
    'float linDepth(float d){ float z = d*2.0-1.0; return (2.0*uNear*uFar)/(uFar+uNear - z*(uFar-uNear)); }',
    'vec3 rayOf(vec2 uv){ return vec3((uv.x*2.0-1.0)*uTan*uAspect, (uv.y*2.0-1.0)*uTan, -1.0); }',
    'vec3 viewPos(vec2 uv, float d){ return rayOf(uv) * linDepth(d); }',
    'vec3 viewPosAt(vec2 uv){ return viewPos(uv, texture2D(tDepth,uv).x); }',
    'vec2 viewToUv(vec3 p){ return vec2( p.x/(-p.z*uTan*uAspect), p.y/(-p.z*uTan) )*0.5+0.5; }',
    'vec3 normalAt(vec2 uv, vec2 tx){',
    '  vec3 p  = viewPosAt(uv);',
    '  vec3 pr = viewPosAt(uv+vec2(tx.x,0.0)), pl = viewPosAt(uv-vec2(tx.x,0.0));',
    '  vec3 pu = viewPosAt(uv+vec2(0.0,tx.y)), pd = viewPosAt(uv-vec2(0.0,tx.y));',
    '  vec3 dx = (abs(pr.z-p.z) < abs(p.z-pl.z)) ? (pr-p) : (p-pl);',
    '  vec3 dy = (abs(pu.z-p.z) < abs(p.z-pd.z)) ? (pu-p) : (p-pd);',
    '  return normalize(cross(dx,dy));',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------ pass framework */
  let quadScene, quadCam, quadMesh;
  const passes = {};
  let whiteTex, blackTex, dirtTex;

  function makeQuad() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    quadMesh = new THREE.Mesh(g, null);
    quadMesh.frustumCulled = false;
    quadScene = new THREE.Scene();
    quadScene.add(quadMesh);
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  function mkPass(frag, uniforms) {
    return new THREE.RawShaderMaterial({
      vertexShader: VERT,
      fragmentShader: LIB + '\n' + frag,
      uniforms: uniforms || {},
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
  }

  function blit(mat, target) {
    quadMesh.material = mat;
    renderer.setRenderTarget(target || null);
    renderer.render(quadScene, quadCam);
  }

  /* ------------------------------------------------------------ render targets */
  let RTType = THREE.HalfFloatType;
  const rt = {};                       // named targets
  let bloomDown = [], bloomUp = [];

  function mkRT(w, h, o) {
    o = o || {};
    const t = new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
      minFilter: o.nearest ? THREE.NearestFilter : THREE.LinearFilter,
      magFilter: o.nearest ? THREE.NearestFilter : THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
      format: THREE.RGBAFormat,
      type: o.type || RTType,
      depthBuffer: !!o.depth, stencilBuffer: false, generateMipmaps: false,
    });
    t.texture.generateMipmaps = false;
    return t;
  }

  function disposeTargets() {
    for (const k in rt) { if (rt[k]) { if (rt[k].depthTexture) rt[k].depthTexture.dispose(); rt[k].dispose(); } delete rt[k]; }
    bloomDown.forEach(t => t.dispose()); bloomUp.forEach(t => t.dispose());
    bloomDown = []; bloomUp = [];
  }

  function buildTargets() {
    disposeTargets();
    const w = Math.max(4, Math.floor(W * Q.scale)), h = Math.max(4, Math.floor(H * Q.scale));
    stats.rt = w + 'x' + h;

    rt.scene = mkRT(w, h, { depth: true });
    const dtex = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    dtex.format = THREE.DepthFormat;
    dtex.minFilter = THREE.NearestFilter; dtex.magFilter = THREE.NearestFilter;
    rt.scene.depthTexture = dtex;

    rt.lit = mkRT(w, h);
    rt.ldr = mkRT(w, h, { type: THREE.UnsignedByteType });

    const aw = Math.max(4, Math.floor(w * Q.aoScale)), ah = Math.max(4, Math.floor(h * Q.aoScale));
    rt.ao = mkRT(aw, ah, { type: THREE.UnsignedByteType });
    rt.ao2 = mkRT(aw, ah, { type: THREE.UnsignedByteType });

    const sw = Math.max(4, Math.floor(w * Q.ssrScale)), sh = Math.max(4, Math.floor(h * Q.ssrScale));
    rt.ssr = mkRT(sw, sh);
    rt.ssr2 = mkRT(sw, sh);

    const vw = Math.max(4, Math.floor(w * Q.volScale)), vh = Math.max(4, Math.floor(h * Q.volScale));
    rt.vol = mkRT(vw, vh);
    rt.vol2 = mkRT(vw, vh);

    for (let i = 0; i < Q.bloomMips; i++) {
      const bw = Math.max(2, w >> (i + 1)), bh = Math.max(2, h >> (i + 1));
      bloomDown.push(mkRT(bw, bh));
      bloomUp.push(mkRT(bw, bh));
    }
    rt.streakA = mkRT(Math.max(4, w >> 3), Math.max(4, h >> 3));
    rt.streakB = mkRT(Math.max(4, w >> 3), Math.max(4, h >> 3));
  }

  /* ------------------------------------------------------------------ shaders */
  function buildPasses() {
    const V2 = (x, y) => new THREE.Vector2(x, y);

    /* ---- SSAO ---------------------------------------------------------- */
    passes.ssao = mkPass([
      DEPTH,
      'uniform vec2 uTexel;',
      'uniform float uRadius, uBias, uIntensity, uTaps, uTime;',
      '#define MAXT 12',
      'void main(){',
      '  float d = texture2D(tDepth, vUv).x;',
      '  if (d >= 0.9999) { gl_FragColor = vec4(1.0); return; }',
      '  vec3 p = viewPos(vUv, d);',
      '  vec3 n = normalAt(vUv, uTexel);',
      '  vec3 t0 = normalize(abs(n.y) < 0.9 ? cross(vec3(0.0,1.0,0.0), n) : cross(vec3(1.0,0.0,0.0), n));',
      '  vec3 b0 = cross(n, t0);',
      '  float rot = ign(gl_FragCoord.xy) * 6.28318;',
      '  float occ = 0.0; float tot = 0.0;',
      '  float rad = uRadius;',
      '  for (int i = 0; i < MAXT; i++) {',
      '    if (float(i) >= uTaps) break;',
      '    float fi = (float(i)+0.5)/uTaps;',
      '    float ang = float(i)*2.39996323 + rot;',
      '    float rr = sqrt(fi);',
      '    vec3 dir = t0*cos(ang)*rr + b0*sin(ang)*rr + n*(0.25+0.75*fi);',
      '    vec3 sp = p + dir*rad*(0.35+0.65*fi);',
      '    vec2 su = viewToUv(sp);',
      '    if (su.x<0.0||su.x>1.0||su.y<0.0||su.y>1.0) { tot += 1.0; continue; }',
      '    float sd = texture2D(tDepth, su).x;',
      '    float sceneZ = -linDepth(sd);',
      '    float dz = sceneZ - sp.z;',
      '    float range = smoothstep(0.0, 1.0, rad/max(0.0001, abs(p.z - sceneZ)));',
      '    occ += (dz > uBias ? 1.0 : 0.0) * range;',
      '    tot += 1.0;',
      '  }',
      '  float ao = 1.0 - (occ/max(tot,1.0)) * uIntensity;',
      '  gl_FragColor = vec4(clamp(ao,0.0,1.0));',
      '}'
    ].join('\n'), {
      tDepth: { value: null }, uTexel: { value: V2(1, 1) },
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uTan: { value: 0.5 }, uAspect: { value: 1.7 },
      uRadius: { value: 0.85 }, uBias: { value: 0.035 }, uIntensity: { value: 1.0 },
      uTaps: { value: 10 }, uTime: { value: 0 },
    });

    /* ---- depth aware blur (used for AO / SSR / fog) ---------------------- */
    const blurFrag = [
      'uniform sampler2D tSrc;',
      'uniform sampler2D tDepthTex;',
      'uniform vec2 uDir;',      // texel-sized direction
      'uniform float uSharp;',   // 0 = plain gaussian, 1 = depth aware
      'void main(){',
      '  float dc = texture2D(tDepthTex, vUv).x;',
      '  vec4 sum = vec4(0.0); float wsum = 0.0;',
      '  for (int i = -3; i <= 3; i++) {',
      '    float fi = float(i);',
      '    vec2 uv = vUv + uDir*fi;',
      '    float w = exp(-fi*fi*0.22);',
      '    if (uSharp > 0.5) {',
      '      float ds = texture2D(tDepthTex, uv).x;',
      '      w *= exp(-abs(ds-dc)*900.0);',
      '    }',
      '    sum += texture2D(tSrc, uv)*w; wsum += w;',
      '  }',
      '  gl_FragColor = sum/max(wsum,0.0001);',
      '}'
    ].join('\n');
    passes.blur = mkPass(blurFrag, {
      tSrc: { value: null }, tDepthTex: { value: null },
      uDir: { value: V2(0, 0) }, uSharp: { value: 1 },
    });

    /* ---- SSR ------------------------------------------------------------ */
    passes.ssr = mkPass([
      DEPTH,
      'uniform sampler2D tColor;',
      'uniform vec2 uTexel;',
      'uniform mat4 uCamMat;',
      'uniform float uSteps, uThickness, uTime, uStrength, uMaxDist;',
      '#define MAXS 32',
      'void main(){',
      '  float d = texture2D(tDepth, vUv).x;',
      '  if (d >= 0.9999) { gl_FragColor = vec4(0.0); return; }',
      '  vec3 p = viewPos(vUv, d);',
      '  if (-p.z > uMaxDist) { gl_FragColor = vec4(0.0); return; }',
      '  vec3 n = normalAt(vUv, uTexel);',
      /* world normal + world pos so we can restrict to floors and mask by puddles */
      '  vec3 wn = normalize((uCamMat*vec4(n,0.0)).xyz);',
      '  if (wn.y < 0.55) { gl_FragColor = vec4(0.0); return; }',
      '  vec3 wp = (uCamMat*vec4(p,1.0)).xyz;',
      /* puddle mask: broad blotches + fine ripple */
      '  float pud = vnoise(vec3(wp.xz*0.09, 0.0));',
      '  pud += 0.5*vnoise(vec3(wp.xz*0.23, 3.7));',
      '  float wet = smoothstep(0.62, 0.95, pud);',
      '  if (wet < 0.02) { gl_FragColor = vec4(0.0); return; }',
      /* ripple perturbation of the normal (rain hitting water) */
      '  float rip = vnoise(vec3(wp.xz*2.1, uTime*0.7)) - 0.5;',
      '  float rip2 = vnoise(vec3(wp.zx*3.7 + 11.0, uTime*1.1)) - 0.5;',
      '  vec3 nn = normalize(n + vec3(rip, 0.0, rip2)*0.055);',
      '  vec3 v = normalize(p);',
      '  vec3 r = reflect(v, nn);',
      '  float fres = pow(1.0 - max(dot(-v, nn), 0.0), 4.0);',
      '  fres = 0.04 + 0.96*fres;',
      '  float stepLen = max(0.12, -p.z*0.045);',
      '  float jit = ign(gl_FragCoord.xy + vec2(uTime*37.0));',
      '  vec3 sp = p + nn*0.02 + r*stepLen*(0.35+jit*0.65);',
      '  float hit = 0.0; vec2 huv = vec2(0.0); float travelled = 0.0;',
      '  for (int i = 0; i < MAXS; i++) {',
      '    if (float(i) >= uSteps) break;',
      '    sp += r*stepLen; travelled += stepLen;',
      '    vec2 su = viewToUv(sp);',
      '    if (su.x < 0.0 || su.x > 1.0 || su.y < 0.0 || su.y > 1.0) break;',
      '    float sd = texture2D(tDepth, su).x;',
      '    if (sd >= 0.9999) { stepLen *= 1.10; continue; }',
      '    float sceneZ = -linDepth(sd);',
      '    float dz = sceneZ - sp.z;',
      '    if (dz > 0.0 && dz < uThickness + stepLen) {',
      /* binary refine */
      '      vec3 a = sp - r*stepLen, b = sp;',
      '      for (int k = 0; k < 5; k++) {',
      '        vec3 m = (a+b)*0.5;',
      '        vec2 mu = viewToUv(m);',
      '        float mz = -linDepth(texture2D(tDepth, mu).x);',
      '        if (mz - m.z > 0.0) b = m; else a = m;',
      '      }',
      '      huv = viewToUv(b); hit = 1.0; break;',
      '    }',
      '    stepLen *= 1.10;',
      '  }',
      '  if (hit < 0.5) { gl_FragColor = vec4(0.0); return; }',
      '  vec2 e = smoothstep(vec2(0.0), vec2(0.16), huv) * (1.0-smoothstep(vec2(0.84), vec2(1.0), huv));',
      '  float edge = e.x*e.y;',
      '  vec3 col = texture2D(tColor, huv).rgb;',
      '  col = min(col, vec3(24.0));',
      '  float w = edge * wet * fres * uStrength * (1.0 - smoothstep(uMaxDist*0.55, uMaxDist, -p.z));',
      '  gl_FragColor = vec4(col*w, w);',
      '}'
    ].join('\n'), {
      tDepth: { value: null }, tColor: { value: null }, uTexel: { value: V2(1, 1) },
      uCamMat: { value: new THREE.Matrix4() },
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uTan: { value: 0.5 }, uAspect: { value: 1.7 },
      uSteps: { value: 26 }, uThickness: { value: 0.6 }, uTime: { value: 0 },
      uStrength: { value: 0.9 }, uMaxDist: { value: 70 },
    });

    /* ---- volumetric fog -------------------------------------------------- */
    passes.vol = mkPass([
      DEPTH,
      'uniform mat4 uCamMat;',
      'uniform vec3 uCamPos;',
      'uniform float uSteps, uMaxDist, uDensity, uHeight, uBaseY, uTime, uAmb, uNoise, uScatter;',
      'uniform vec3 uFogCol;',
      'uniform vec3 uLPos[8];',
      'uniform vec3 uLCol[8];',
      'uniform float uLR[8];',
      'uniform int uLCount;',
      '#define MAXSTEP 28',
      'float hg(float c, float g){ float g2=g*g; return (1.0-g2)/pow(1.0+g2-2.0*g*c, 1.5)*0.25; }',
      'void main(){',
      '  vec3 rv = rayOf(vUv);',
      '  float rl = length(rv);',
      '  vec3 wd = normalize((uCamMat*vec4(rv,0.0)).xyz);',
      '  float d = texture2D(tDepth, vUv).x;',
      '  float dist = (d >= 0.9999) ? uMaxDist : min(linDepth(d)*rl, uMaxDist);',
      '  float n = max(uSteps, 1.0);',
      '  float dt = dist/n;',
      '  float jitter = ign(gl_FragCoord.xy + vec2(fract(uTime)*57.0));',
      '  float T = 1.0; vec3 acc = vec3(0.0);',
      '  vec3 amb = uFogCol*uAmb;',
      '  for (int i = 0; i < MAXSTEP; i++) {',
      '    if (float(i) >= uSteps) break;',
      '    float t = (float(i)+jitter)*dt;',
      '    vec3 p = uCamPos + wd*t;',
      '    float hf = exp(-max(p.y-uBaseY, 0.0)*uHeight);',
      '    float nz = 1.0;',
      '    if (uNoise > 0.01) nz = 0.55 + 0.9*vnoise(p*0.035 + vec3(uTime*0.05, 0.0, uTime*0.02));',
      '    float dens = uDensity*hf*nz;',
      '    if (dens > 0.00001) {',
      '      vec3 sc = amb;',
      '      for (int l = 0; l < 8; l++) {',
      '        if (l >= uLCount) break;',
      '        vec3 L = uLPos[l] - p;',
      '        float d2 = dot(L,L);',
      '        float r = uLR[l];',
      '        float att = 1.0/(1.0 + d2/(r*r));',
      '        att *= att;',
      '        float ph = hg(dot(L*inversesqrt(max(d2,0.0001)), wd), 0.45);',
      '        sc += uLCol[l]*att*ph*uScatter;',
      '      }',
      '      sc = min(sc, vec3(0.22));',
      '      float ext = dens*dt;',
      '      acc += sc*dens*dt*T;',
      '      T *= exp(-ext);',
      '    }',
      '    if (T < 0.006) break;',
      '  }',
      '  gl_FragColor = vec4(acc, T);',
      '}'
    ].join('\n'), {
      tDepth: { value: null },
      uCamMat: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uTan: { value: 0.5 }, uAspect: { value: 1.7 },
      uSteps: { value: 18 }, uMaxDist: { value: 130 }, uDensity: { value: 0.03 },
      uHeight: { value: 0.075 }, uBaseY: { value: -1 }, uTime: { value: 0 },
      uAmb: { value: 0.30 }, uNoise: { value: 1 }, uScatter: { value: 0.018 },
      uFogCol: { value: new THREE.Vector3(0.055, 0.085, 0.115) },
      uLPos: { value: mkVecArr(8) }, uLCol: { value: mkVecArr(8) },
      uLR: { value: new Float32Array(8) }, uLCount: { value: 0 },
    });

    /* ---- resolve: scene * AO + SSR + fog --------------------------------- */
    passes.resolve = mkPass([
      DEPTH,
      'uniform sampler2D tScene, tAO, tSSR, tVol;',
      'uniform float uAO, uSSR, uFogMul;',
      'void main(){',
      '  vec3 c = texture2D(tScene, vUv).rgb;',
      '  float ao = texture2D(tAO, vUv).r;',
      /* never let AO dirty an emissive/bright pixel */
      '  float bright = smoothstep(0.5, 3.0, luma(c));',
      '  ao = mix(mix(1.0, ao, uAO), 1.0, bright);',
      '  c *= ao;',
      '  vec4 s = texture2D(tSSR, vUv);',
      '  c += s.rgb*uSSR;',
      '  vec4 f = texture2D(tVol, vUv);',
      '  c = c*f.a + f.rgb*uFogMul;',
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n'), {
      tScene: { value: null }, tAO: { value: null }, tSSR: { value: null }, tVol: { value: null },
      tDepth: { value: null },
      uNear: { value: 0.1 }, uFar: { value: 1000 }, uTan: { value: 0.5 }, uAspect: { value: 1.7 },
      uAO: { value: 0.85 }, uSSR: { value: 0.9 }, uFogMul: { value: 1.0 },
    });

    /* ---- bloom bright pass ---------------------------------------------- */
    passes.bright = mkPass([
      'uniform sampler2D tSrc;',
      'uniform vec2 uTexel;',
      'uniform float uThreshold, uKnee, uClamp;',
      'void main(){',
      '  vec3 c = texture2D(tSrc, vUv + vec2(-1.0,-1.0)*uTexel).rgb;',
      '  c += texture2D(tSrc, vUv + vec2(1.0,-1.0)*uTexel).rgb;',
      '  c += texture2D(tSrc, vUv + vec2(-1.0,1.0)*uTexel).rgb;',
      '  c += texture2D(tSrc, vUv + vec2(1.0,1.0)*uTexel).rgb;',
      '  c *= 0.25;',
      '  c = min(c, vec3(uClamp));',
      '  float br = max(c.r, max(c.g, c.b));',
      '  float soft = br - uThreshold + uKnee;',
      '  soft = clamp(soft, 0.0, 2.0*uKnee);',
      '  soft = soft*soft/(4.0*uKnee + 0.0001);',
      '  float contrib = max(soft, br - uThreshold)/max(br, 0.0001);',
      '  gl_FragColor = vec4(c*contrib, 1.0);',
      '}'
    ].join('\n'), {
      tSrc: { value: null }, uTexel: { value: V2(1, 1) },
      uThreshold: { value: 1.0 }, uKnee: { value: 0.65 }, uClamp: { value: 8 },
    });

    /* ---- bloom downsample (13 tap) --------------------------------------- */
    passes.down = mkPass([
      'uniform sampler2D tSrc;',
      'uniform vec2 uTexel;',
      'void main(){',
      '  vec2 t = uTexel;',
      '  vec3 a = texture2D(tSrc, vUv + vec2(-2.0, 2.0)*t).rgb;',
      '  vec3 b = texture2D(tSrc, vUv + vec2( 0.0, 2.0)*t).rgb;',
      '  vec3 c = texture2D(tSrc, vUv + vec2( 2.0, 2.0)*t).rgb;',
      '  vec3 d = texture2D(tSrc, vUv + vec2(-2.0, 0.0)*t).rgb;',
      '  vec3 e = texture2D(tSrc, vUv).rgb;',
      '  vec3 f = texture2D(tSrc, vUv + vec2( 2.0, 0.0)*t).rgb;',
      '  vec3 g = texture2D(tSrc, vUv + vec2(-2.0,-2.0)*t).rgb;',
      '  vec3 h = texture2D(tSrc, vUv + vec2( 0.0,-2.0)*t).rgb;',
      '  vec3 i = texture2D(tSrc, vUv + vec2( 2.0,-2.0)*t).rgb;',
      '  vec3 j = texture2D(tSrc, vUv + vec2(-1.0, 1.0)*t).rgb;',
      '  vec3 k = texture2D(tSrc, vUv + vec2( 1.0, 1.0)*t).rgb;',
      '  vec3 l = texture2D(tSrc, vUv + vec2(-1.0,-1.0)*t).rgb;',
      '  vec3 m = texture2D(tSrc, vUv + vec2( 1.0,-1.0)*t).rgb;',
      '  vec3 o = e*0.125 + (a+c+g+i)*0.03125 + (b+d+f+h)*0.0625 + (j+k+l+m)*0.125;',
      '  gl_FragColor = vec4(o, 1.0);',
      '}'
    ].join('\n'), { tSrc: { value: null }, uTexel: { value: V2(1, 1) } });

    /* ---- bloom upsample (9 tap tent) + add ------------------------------- */
    passes.up = mkPass([
      'uniform sampler2D tSrc, tPrev;',
      'uniform vec2 uTexel;',
      'uniform float uRadius, uMix;',
      'void main(){',
      '  vec2 t = uTexel*uRadius;',
      '  vec3 s = texture2D(tSrc, vUv + vec2(-1.0, 1.0)*t).rgb;',
      '  s += texture2D(tSrc, vUv + vec2(0.0, 1.0)*t).rgb*2.0;',
      '  s += texture2D(tSrc, vUv + vec2(1.0, 1.0)*t).rgb;',
      '  s += texture2D(tSrc, vUv + vec2(-1.0, 0.0)*t).rgb*2.0;',
      '  s += texture2D(tSrc, vUv).rgb*4.0;',
      '  s += texture2D(tSrc, vUv + vec2(1.0, 0.0)*t).rgb*2.0;',
      '  s += texture2D(tSrc, vUv + vec2(-1.0,-1.0)*t).rgb;',
      '  s += texture2D(tSrc, vUv + vec2(0.0,-1.0)*t).rgb*2.0;',
      '  s += texture2D(tSrc, vUv + vec2(1.0,-1.0)*t).rgb;',
      '  s /= 16.0;',
      '  gl_FragColor = vec4(texture2D(tPrev, vUv).rgb + s*uMix, 1.0);',
      '}'
    ].join('\n'), {
      tSrc: { value: null }, tPrev: { value: null }, uTexel: { value: V2(1, 1) },
      uRadius: { value: 1.6 }, uMix: { value: 1.0 },
    });

    /* ---- anamorphic streak (separable, wide) ----------------------------- */
    passes.streak = mkPass([
      'uniform sampler2D tSrc;',
      'uniform vec2 uTexel;',
      'uniform float uSpread, uThresh;',
      'void main(){',
      '  vec3 sum = vec3(0.0); float wsum = 0.0;',
      '  for (int i = -6; i <= 6; i++) {',
      '    float fi = float(i);',
      '    float w = exp(-fi*fi*0.10);',
      '    vec3 c = texture2D(tSrc, vUv + vec2(uTexel.x*fi*uSpread, 0.0)).rgb;',
      '    c = max(c - vec3(uThresh), vec3(0.0));',
      '    sum += c*w; wsum += w;',
      '  }',
      '  gl_FragColor = vec4(sum/wsum, 1.0);',
      '}'
    ].join('\n'), {
      tSrc: { value: null }, uTexel: { value: V2(1, 1) },
      uSpread: { value: 1.0 }, uThresh: { value: 0.0 },
    });

    /* ---- composite ------------------------------------------------------- */
    passes.comp = mkPass([
      'uniform sampler2D tLit, tBloom, tStreak, tDirt;',
      'uniform vec2 uRes;',
      'uniform float uExposure, uBloom, uDirt, uStreak, uCA, uVig, uGrain, uTime, uRain, uAspectR;',
      'uniform vec3 uLift, uGamma, uGain, uShadowTint, uHighTint;',
      'uniform float uSat, uContrast, uFade;',
      'const mat3 ACESIn = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);',
      'const mat3 ACESOut = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);',
      'vec3 rrt(vec3 v){ vec3 a = v*(v+0.0245786)-0.000090537; vec3 b = v*(0.983729*v+0.4329510)+0.238081; return a/b; }',
      'vec3 aces(vec3 c){ c = ACESIn*c; c = rrt(c); c = ACESOut*c; return clamp(c, 0.0, 1.0); }',
      'vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c,vec3(0.0)), vec3(0.41666))-0.055, step(0.0031308, c)); }',
      /* procedural rain on the lens: a few slow drops + trails, kept faint */
      'vec2 lensRain(vec2 uv, float amt){',
      '  if (amt < 0.001) return vec2(0.0);',
      '  vec2 off = vec2(0.0);',
      '  vec2 q = vec2(uv.x*uAspectR, uv.y);',
      '  for (int L = 0; L < 2; L++) {',
      '    float sc = 7.0 + float(L)*6.0;',
      '    vec2 g = q*sc;',
      '    vec2 id = floor(g);',
      '    vec2 f = fract(g) - 0.5;',
      '    vec2 rnd = hash22(id + float(L)*31.7);',
      '    float speed = 0.06 + rnd.y*0.16;',
      '    float t = fract(uTime*speed + rnd.x);',
      '    vec2 c = vec2((rnd.x-0.5)*0.7, 0.5 - t*1.4);',
      '    vec2 dv = f - c;',
      '    dv.y *= 1.0 + smoothstep(0.0,0.4,t)*1.6;',   /* stretch into a streak */
      '    float r = length(dv);',
      '    float rad = 0.10 + rnd.y*0.10;',
      '    float m = smoothstep(rad, rad*0.25, r) * step(0.05, rnd.y);',
      '    off += normalize(dv + 1e-5)*m*0.010;',
      '  }',
      '  return off*amt;',
      '}',
      'void main(){',
      '  vec2 uv = vUv;',
      '  vec2 d = uv - 0.5;',
      '  float r2 = dot(d,d);',
      '  vec2 rain = lensRain(uv, uRain);',
      '  vec2 base = uv + rain;',
      '  float ca = uCA*r2*0.006;',
      '  vec3 col;',
      '  col.r = texture2D(tLit, base + d*ca).r;',
      '  col.g = texture2D(tLit, base).g;',
      '  col.b = texture2D(tLit, base - d*ca).b;',
      '  vec3 bloom = texture2D(tBloom, base).rgb;',
      '  float dirt = texture2D(tDirt, uv).r;',
      '  col += bloom*uBloom*(1.0 + dirt*uDirt*3.0);',
      '  vec3 st = texture2D(tStreak, base).rgb;',
      '  col += st*uStreak*vec3(0.55,0.75,1.0);',
      '  col *= uExposure;',
      /* tone map */
      '  vec3 c = aces(col);',
      /* grade */
      '  c = pow(max(c, vec3(0.0)), 1.0/uGamma);',
      '  c = c*uGain + uLift*(1.0-c);',
      '  float l = luma(c);',
      '  c += uShadowTint*(1.0 - smoothstep(0.0, 0.42, l));',
      '  c += uHighTint*smoothstep(0.45, 1.0, l);',
      '  c = mix(vec3(luma(c)), c, uSat);',
      '  vec3 sc = c*c*(3.0-2.0*c);',
      '  c = mix(c, sc, uContrast);',
      /* vignette */
      '  float vig = 1.0 - uVig*smoothstep(0.18, 0.95, r2*2.0);',
      '  c *= vig;',
      /* grain, stronger in the dark */
      '  float g = hash12(gl_FragCoord.xy + vec2(fract(uTime)*443.0, fract(uTime*1.7)*197.0)) - 0.5;',
      '  c += g*uGrain*(0.35 + 0.9*(1.0 - smoothstep(0.0, 0.55, luma(c))));',
      '  c = max(c, vec3(0.0))*uFade;',
      '  gl_FragColor = vec4(toSRGB(c), 1.0);',
      '}'
    ].join('\n'), {
      tLit: { value: null }, tBloom: { value: null }, tStreak: { value: null }, tDirt: { value: null },
      uRes: { value: V2(1, 1) }, uExposure: { value: 1.05 }, uBloom: { value: 0.85 },
      uDirt: { value: 0.55 }, uStreak: { value: 0.35 }, uCA: { value: 1.3 }, uVig: { value: 0.42 },
      uGrain: { value: 0.055 }, uTime: { value: 0 }, uRain: { value: 0.55 }, uAspectR: { value: 1.7 },
      uLift: { value: new THREE.Vector3() }, uGamma: { value: new THREE.Vector3(1, 1, 1) },
      uGain: { value: new THREE.Vector3(1, 1, 1) },
      uShadowTint: { value: new THREE.Vector3() }, uHighTint: { value: new THREE.Vector3() },
      uSat: { value: 1.1 }, uContrast: { value: 0.22 }, uFade: { value: 1 },
    });

    /* ---- FXAA ------------------------------------------------------------ */
    passes.fxaa = mkPass([
      'uniform sampler2D tSrc;',
      'uniform vec2 uTexel;',
      'float lum(vec3 c){ return c.g*0.587 + c.r*0.299 + c.b*0.114; }',
      'void main(){',
      '  vec2 t = uTexel;',
      '  vec3 nw = texture2D(tSrc, vUv + vec2(-1.0,-1.0)*t).rgb;',
      '  vec3 ne = texture2D(tSrc, vUv + vec2( 1.0,-1.0)*t).rgb;',
      '  vec3 sw = texture2D(tSrc, vUv + vec2(-1.0, 1.0)*t).rgb;',
      '  vec3 se = texture2D(tSrc, vUv + vec2( 1.0, 1.0)*t).rgb;',
      '  vec3 m  = texture2D(tSrc, vUv).rgb;',
      '  float lnw=lum(nw), lne=lum(ne), lsw=lum(sw), lse=lum(se), lm=lum(m);',
      '  float lmin = min(lm, min(min(lnw,lne), min(lsw,lse)));',
      '  float lmax = max(lm, max(max(lnw,lne), max(lsw,lse)));',
      '  vec2 dir = vec2(-((lnw+lne)-(lsw+lse)), ((lnw+lsw)-(lne+lse)));',
      '  float dr = max((lnw+lne+lsw+lse)*0.03125, 0.0078125);',
      '  float rcp = 1.0/(min(abs(dir.x),abs(dir.y)) + dr);',
      '  dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*t;',
      '  vec3 a = 0.5*(texture2D(tSrc, vUv + dir*(1.0/3.0-0.5)).rgb + texture2D(tSrc, vUv + dir*(2.0/3.0-0.5)).rgb);',
      '  vec3 b = a*0.5 + 0.25*(texture2D(tSrc, vUv - dir*0.5).rgb + texture2D(tSrc, vUv + dir*0.5).rgb);',
      '  float lb = lum(b);',
      '  gl_FragColor = vec4((lb < lmin || lb > lmax) ? a : b, 1.0);',
      '}'
    ].join('\n'), { tSrc: { value: null }, uTexel: { value: V2(1, 1) } });

    /* ---- plain copy (fallback) ------------------------------------------- */
    passes.copy = mkPass([
      'uniform sampler2D tSrc;',
      'void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }'
    ].join('\n'), { tSrc: { value: null } });
  }

  function mkVecArr(n) { const a = []; for (let i = 0; i < n; i++) a.push(new THREE.Vector3()); return a; }

  /* ------------------------------------------------------------- tiny textures */
  function makeSmallTextures() {
    whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    whiteTex.needsUpdate = true;
    blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    blackTex.needsUpdate = true;

    /* procedural lens dirt: smudges + a few scratches. Computed, never loaded. */
    const S = 256, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    const rnd = U.rng(90210);
    for (let i = 0; i < 70; i++) {
      const x = rnd() * S, y = rnd() * S, r = 4 + rnd() * 42;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.05 + rnd() * 0.30;
      grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = 'rgba(255,255,255,' + (0.04 + rnd() * 0.16).toFixed(3) + ')';
      g.lineWidth = 0.5 + rnd() * 2.4;
      g.beginPath();
      const x = rnd() * S, y = rnd() * S, l = 12 + rnd() * 90, a = rnd() * 6.2832;
      g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 20, y + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 20, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    dirtTex = new THREE.CanvasTexture(cv);
    dirtTex.wrapS = dirtTex.wrapT = THREE.ClampToEdgeWrapping;
  }

  /* ------------------------------------------------------------------ sky/env */
  const SKY_FRAG = [
    'varying vec3 vDir;',
    'uniform float uTime;',
    'float h1(float n){ return fract(sin(n)*43758.5453123); }',
    'float vn(vec3 x){',
    '  vec3 p = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);',
    '  float n = p.x + p.y*57.0 + p.z*113.0;',
    '  return mix(mix(mix(h1(n),h1(n+1.0),f.x), mix(h1(n+57.0),h1(n+58.0),f.x),f.y),',
    '             mix(mix(h1(n+113.0),h1(n+114.0),f.x), mix(h1(n+170.0),h1(n+171.0),f.x),f.y),f.z);',
    '}',
    'float fbm(vec3 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=vn(p)*a; p*=2.03; a*=0.5; } return s; }',
    'void main(){',
    '  vec3 d = normalize(vDir);',
    '  float h = d.y;',
    '  vec3 zen = vec3(0.0045, 0.0075, 0.0135);',
    '  vec3 hor = vec3(0.022, 0.033, 0.046);',
    '  vec3 col = mix(hor, zen, smoothstep(-0.02, 0.60, h));',
    /* low cloud deck lit from below by the city */
    '  float cl = fbm(vec3(d.xz/max(abs(h)+0.14,0.14)*0.85, uTime*0.004));',
    '  float deck = smoothstep(0.02, 0.55, h)*(1.0-smoothstep(0.35,0.9,h));',
    '  float clm = smoothstep(0.42, 0.85, cl)*deck;',
    '  col = mix(col, vec3(0.075,0.062,0.058), clm*0.55);',
    /* city glow band hugging the horizon */
    '  float band = exp(-max(h, 0.0)*8.5)*smoothstep(-0.30, 0.03, h);',
    '  float az = atan(d.z, d.x);',
    '  col += vec3(0.30,0.155,0.052)*band*1.15;',
    '  col += vec3(0.30,0.045,0.125)*band*(0.5+0.5*sin(az*2.0+1.1))*0.85;',
    '  col += vec3(0.020,0.135,0.185)*band*(0.5+0.5*sin(az*3.0-2.3))*0.75;',
    '  col += vec3(0.16,0.10,0.05)*clm*band*2.2;',
    /* below horizon: the drowned harbour, near black */
    '  col = mix(col, vec3(0.006,0.009,0.013), smoothstep(0.0,-0.16,h));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  const SKY_VERT = [
    'varying vec3 vDir;',
    'void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
  ].join('\n');

  let skyMat = null, skyMesh = null;

  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      uniforms: { uTime: { value: 0 } },
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    });
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 20), skyMat);
    skyMesh.frustumCulled = false;
    skyMesh.renderOrder = -1000;
    skyMesh.matrixAutoUpdate = false;
    scene.add(skyMesh);
  }

  function buildEnv() {
    /* a small scene rendered to a cube then PMREM'd: sky dome + a few sign-glow blobs
       so that reflective materials catch something other than a flat gradient. */
    const s = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), skyMat.clone());
    dome.material.side = THREE.BackSide; dome.material.depthWrite = false; dome.material.depthTest = false;
    s.add(dome);
    const blobs = [
      [0x00e5ff, 3.0, -18, 3, -22, 7, 9],
      [0xff2d6f, 2.4, 20, 5, -14, 6, 12],
      [0xffb340, 3.6, -6, 2, 24, 14, 5],
      [0xffb340, 1.6, 26, 8, 12, 5, 14],
      [0x7cff5a, 1.1, 8, 1.5, -28, 4, 3],
      [0x9fd0e0, 0.7, 0, 26, 0, 30, 30],
    ];
    for (const b of blobs) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b[5], b[6]),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(b[0]).multiplyScalar(b[1]), side: THREE.DoubleSide, toneMapped: false, fog: false }));
      m.position.set(b[2], b[3], b[4]);
      m.lookAt(0, b[3], 0);
      s.add(m);
    }
    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      const target = pmrem.fromScene(s, 0.04, 0.5, 120);
      API.env = target.texture;
      scene.environment = target.texture;
      pmrem.dispose(); pmrem = null;
    } catch (e) {
      API.env = null;
    }
    s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  /* ------------------------------------------------------------ light budget */
  const regLights = [];
  let pool = [];
  const _wp = new THREE.Vector3(), _wp2 = new THREE.Vector3();

  function buildPool() {
    pool.forEach(l => { if (l.parent) l.parent.remove(l); l.dispose && l.dispose(); });
    pool = [];
    for (let i = 0; i < Q.maxLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.castShadow = false;
      l.visible = false;
      scene.add(l);
      pool.push(l);
    }
  }

  function registerLight(obj, opts) {
    opts = opts || {};
    const e = {
      obj: obj || null,
      pos: opts.pos ? opts.pos.clone() : new THREE.Vector3(),
      color: new THREE.Color(opts.color === undefined ? 0xffffff : opts.color),
      intensity: opts.intensity === undefined ? 1.5 : opts.intensity,
      range: opts.range || opts.distance || 12,
      importance: opts.importance === undefined ? 1 : opts.importance,
      fog: opts.fog !== false,
      fogGain: opts.fogGain === undefined ? 1 : opts.fogGain,
      fogRange: opts.fogRange || (opts.range || opts.distance || 12) * 0.85,
      lightOnly: !!opts.lightOnly,
      fogOnly: !!opts.fogOnly,
      enabled: opts.enabled !== false,
      slot: -1, cur: 0, score: 0, dist: 1e9,
      remove() { const i = regLights.indexOf(e); if (i > -1) regLights.splice(i, 1); if (e.slot > -1 && pool[e.slot]) { pool[e.slot].visible = false; pool[e.slot].intensity = 0; } e.slot = -1; },
      set(o) {
        if (!o) return e;
        if (o.color !== undefined) e.color.set(o.color);
        if (o.intensity !== undefined) e.intensity = o.intensity;
        if (o.range !== undefined) e.range = o.range;
        if (o.enabled !== undefined) e.enabled = o.enabled;
        if (o.importance !== undefined) e.importance = o.importance;
        return e;
      },
      worldPos(out) {
        if (e.obj && e.obj.isObject3D) return e.obj.getWorldPosition(out);
        if (e.obj && e.obj.isVector3) return out.copy(e.obj);
        return out.copy(e.pos);
      },
    };
    regLights.push(e);
    return e;
  }

  const fogList = [];
  function updateLights(dt) {
    const cp = camera.position;
    const fwd = _wp2.set(0, 0, -1).applyQuaternion(camera.quaternion);
    let live = 0;
    for (let i = 0; i < regLights.length; i++) {
      const e = regLights[i];
      e.worldPos(_wp);
      const dx = _wp.x - cp.x, dy = _wp.y - cp.y, dz = _wp.z - cp.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      e.dist = Math.sqrt(d2);
      const facing = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / (e.dist + 0.001);
      const front = 0.45 + 0.55 * U.smoothstep(-0.5, 0.4, facing);
      e.score = e.enabled ? (e.importance * e.intensity * e.range * e.range * front) / (d2 + 4) : -1;
      e.wx = _wp.x; e.wy = _wp.y; e.wz = _wp.z;
      if (e.enabled) live++;
    }
    stats.lights = live;

    /* --- real point lights: top N by score, excluding fog-only emitters --- */
    const cands = [];
    for (let i = 0; i < regLights.length; i++) { const e = regLights[i]; if (e.enabled && !e.fogOnly && e.score > 0) cands.push(e); }
    cands.sort((a, b) => b.score - a.score);
    const n = Math.min(pool.length, cands.length);
    const taken = new Uint8Array(pool.length);
    const winners = cands.slice(0, n);
    /* keep existing slots to avoid popping */
    for (const e of winners) { if (e.slot > -1 && !taken[e.slot]) taken[e.slot] = 1; else e.slot = -1; }
    for (const e of winners) {
      if (e.slot > -1) continue;
      for (let s = 0; s < pool.length; s++) if (!taken[s]) { e.slot = s; taken[s] = 1; break; }
    }
    /* release losers */
    for (const e of regLights) if (winners.indexOf(e) < 0 && e.slot > -1) { if (pool[e.slot]) { pool[e.slot].intensity = 0; pool[e.slot].visible = false; } e.slot = -1; }
    for (let s = 0; s < pool.length; s++) if (!taken[s]) { pool[s].intensity = 0; pool[s].visible = false; }
    const k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
    for (const e of winners) {
      const l = pool[e.slot]; if (!l) continue;
      l.visible = true;
      l.color.copy(e.color);
      l.distance = e.range;
      l.decay = 2;
      l.position.set(e.wx, e.wy, e.wz);
      e.cur += (e.intensity - e.cur) * k;
      l.intensity = e.cur;
    }

    /* --- fog emitters: top 8 by score among fog participants -------------- */
    fogList.length = 0;
    for (const e of regLights) if (e.enabled && e.fog && !e.lightOnly && e.score > 0) fogList.push(e);
    fogList.sort((a, b) => b.score - a.score);
    const fc = Math.min(8, fogList.length);
    const u = passes.vol.uniforms;
    for (let i = 0; i < fc; i++) {
      const e = fogList[i];
      u.uLPos.value[i].set(e.wx, e.wy, e.wz);
      u.uLCol.value[i].set(e.color.r, e.color.g, e.color.b).multiplyScalar(e.intensity * e.fogGain * 0.85);
      u.uLR.value[i] = e.fogRange;
    }
    u.uLCount.value = fc;
  }

  /* ------------------------------------------------------------- camera rig */
  function spring(cur, vel, target, freq, dt) {
    /* critically damped */
    const w = freq, k = w * w, c = 2 * w;
    vel.x += (-k * (cur.x - target.x) - c * vel.x) * dt;
    vel.y += (-k * (cur.y - target.y) - c * vel.y) * dt;
    vel.z += (-k * (cur.z - target.z) - c * vel.z) * dt;
    cur.x += vel.x * dt; cur.y += vel.y * dt; cur.z += vel.z * dt;
  }

  const _q1 = new THREE.Quaternion(), _e1 = new THREE.Euler();
  const _m1 = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);

  function snoise1(t, seed) {
    /* smooth 1d noise from the shared value noise */
    return U.noise2D(t, seed * 13.37);
  }

  function updateCamera(raw) {
    const dt = Math.min(raw, 1 / 20);
    /* hitstop freezes camera integration but not shake */
    const move = hitstopT > 0 ? dt * 0.15 : dt;

    spring(camPos, camVel, camTarget.pos, 13.0, move);
    spring(camLook, lookVel, camTarget.look, 15.5, move);

    /* fov: smooth + kick */
    const fovT = camTarget.fov + fovKick;
    const fw = 9.0, fk = fw * fw, fc2 = 2 * fw;
    fovVel += (-fk * (curFov - fovT) - fc2 * fovVel) * move;
    curFov += fovVel * move;
    fovKick += (0 - fovKick) * (1 - Math.exp(-7 * dt));

    /* handheld drift — tiny, so a static shot is never dead */
    const t = time;
    const driftX = snoise1(t * 0.23, 1) * 0.010 + snoise1(t * 0.61, 5) * 0.004;
    const driftY = snoise1(t * 0.19, 2) * 0.008 + snoise1(t * 0.53, 6) * 0.003;
    const driftR = snoise1(t * 0.13, 3) * 0.008;
    const breathe = Math.sin(t * 0.9) * 0.10;

    /* trauma -> rotational shake */
    trauma = Math.max(0, trauma - traumaDecay * dt);
    const sh = trauma * trauma * (camTarget.shakeMul === undefined ? 1 : camTarget.shakeMul);
    const st = t * 26.0 + shakeSeed;
    const shX = snoise1(st, 11) * sh * 0.075;
    const shY = snoise1(st * 1.13, 12) * sh * 0.075;
    const shR = snoise1(st * 0.87, 13) * sh * 0.11;
    const shPos = sh * 0.05;

    camera.position.copy(camPos);
    camera.position.x += snoise1(st * 1.7, 21) * shPos + driftX * 0.35;
    camera.position.y += snoise1(st * 1.9, 22) * shPos + driftY * 0.35;

    _m1.lookAt(camera.position, camLook, _up);
    _q1.setFromRotationMatrix(_m1);
    _e1.setFromQuaternion(_q1, 'YXZ');
    _e1.y += shX + driftX;
    _e1.x += shY + driftY;
    _e1.z += shR + driftR;
    camera.quaternion.setFromEuler(_e1);

    const fovFinal = curFov + breathe + sh * 1.2;
    if (Math.abs(camera.fov - fovFinal) > 0.001) { camera.fov = fovFinal; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();

    if (hitstopT > 0) hitstopT -= raw;
  }

  /* ------------------------------------------------------------------- init */
  function init(canvas) {
    const cap = !!(VH.q.cap || VH.q.coretest);
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, stencil: false, depth: true,
      powerPreference: 'high-performance', preserveDrawingBuffer: cap,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    /* we tone map + encode ourselves in the composite pass */
    renderer.outputEncoding = THREE.LinearEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.physicallyCorrectLights = false;
    renderer.shadowMap.enabled = false;
    renderer.info.autoReset = false;
    renderer.setClearColor(0x000000, 1);
    renderer.autoClear = true;

    scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0a141c, 0.0062);

    const fill = new THREE.HemisphereLight(0x223441, 0x0a0f14, 0.55);
    scene.add(fill);
    API.fill = fill;

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 1000);
    camera.position.copy(camTarget.pos);
    scene.add(camera);

    API.scene = scene; API.camera = camera; API.renderer = renderer;

    /* quality from ?quality= before any target is built */
    const ql = VH.q.quality !== undefined ? Math.max(0, Math.min(2, +VH.q.quality | 0)) : 2;
    applyQuality(ql);

    makeQuad();
    makeSmallTextures();
    buildSky();
    buildEnv();
    buildPool();

    /* capability probe */
    postOK = true;
    try {
      const c = renderer.capabilities;
      if (!c.isWebGL2) {
        if (!renderer.extensions.has('OES_texture_half_float') || !renderer.extensions.has('OES_texture_half_float_linear')) RTType = THREE.UnsignedByteType;
        if (!renderer.extensions.has('WEBGL_depth_texture')) postOK = false;
      } else if (!renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('EXT_color_buffer_half_float')) {
        RTType = THREE.UnsignedByteType;
      }
      if (!c.isWebGL2 && !renderer.extensions.has('OES_standard_derivatives')) { /* not used, but note */ }
    } catch (e) { postOK = false; }

    if (postOK) {
      buildPasses();
      resize();
    } else {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    window.addEventListener('resize', resize);

    if (VH.q.coretest) buildTestScene();

    /* fold gfx counters into the harness debug state */
    try {
      if (VH.debug && VH.debug.state && !VH.debug._coreWrapped) {
        const prev = VH.debug.state;
        VH.debug.state = function () { const o = prev.call(VH.debug) || {}; o.gfx = gfx(); return o; };
        VH.debug._coreWrapped = true;
      }
    } catch (e) { /* non fatal */ }

    VH.on('shake', p => shake(p && p.amount, p && p.dur));
    VH.on('hitstop', p => { hitstopT = Math.max(hitstopT, (p && p.dur) || 0.05); });

    ready = true;
  }

  function gfx() {
    return {
      calls: stats.calls, tris: stats.tris, programs: stats.programs,
      sceneCalls: stats.sceneCalls, sceneTris: stats.sceneTris,
      lights: stats.lights, q: Q.level, rt: stats.rt, post: postOK,
    };
  }

  function applyQuality(l) {
    Q.level = l;
    if (l <= 0) {
      Q.scale = 0.72; Q.bloomMips = 4; Q.ao = false; Q.ssr = false; Q.vol = true;
      Q.volSteps = 8; Q.volScale = 0.30; Q.streaks = false; Q.lensRain = false; Q.maxLights = 5;
      Q.aoScale = 0.5; Q.ssrScale = 0.5;
    } else if (l === 1) {
      Q.scale = 0.9; Q.bloomMips = 5; Q.ao = true; Q.aoTaps = 8; Q.aoScale = 0.5;
      Q.ssr = true; Q.ssrSteps = 18; Q.ssrScale = 0.45;
      Q.vol = true; Q.volSteps = 13; Q.volScale = 0.36; Q.streaks = true; Q.lensRain = true; Q.maxLights = 8;
    } else {
      Q.scale = 1.0; Q.bloomMips = 6; Q.ao = true; Q.aoTaps = 10; Q.aoScale = 0.5;
      Q.ssr = true; Q.ssrSteps = 26; Q.ssrScale = 0.5;
      Q.vol = true; Q.volSteps = 18; Q.volScale = 0.42; Q.streaks = true; Q.lensRain = true; Q.maxLights = 10;
    }
    stats.q = l;
  }

  function setQuality(l) {
    l = Math.max(0, Math.min(2, l | 0));
    if (l === Q.level && ready) return;
    applyQuality(l);
    if (!ready) return;
    buildPool();
    if (postOK) resize();
  }

  function resize() {
    if (!renderer) return;
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    renderer.setSize(w, h, false);
    const v = renderer.getDrawingBufferSize(new THREE.Vector2());
    W = Math.max(4, v.x | 0); H = Math.max(4, v.y | 0);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (postOK) buildTargets();
  }

  /* --------------------------------------------------------------- rendering */
  const _v2 = new THREE.Vector2();

  function setDepthUniforms(u) {
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uTan.value = Math.tan(camera.fov * 0.5 * Math.PI / 180);
    u.uAspect.value = camera.aspect;
  }

  function render(dt, raw) {
    if (!ready) return;
    const rdt = (raw === undefined || raw === null) ? (dt || 1 / 60) : raw;
    time += rdt;
    frames++;

    if (VH.q.coretest) updateTestScene(rdt);
    updateCamera(rdt);
    updateLights(rdt);

    if (skyMesh) { skyMesh.position.copy(camera.position); skyMesh.updateMatrix(); skyMesh.updateMatrixWorld(true); }
    if (skyMat) skyMat.uniforms.uTime.value = time;

    renderer.info.reset();

    if (!postOK) {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      stats.calls = renderer.info.render.calls; stats.tris = renderer.info.render.triangles;
      stats.programs = renderer.info.programs ? renderer.info.programs.length : 0;
      return;
    }

    /* ---- 1. scene into HDR --------------------------------------------- */
    renderer.setRenderTarget(rt.scene);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    stats.sceneCalls = renderer.info.render.calls;
    stats.sceneTris = renderer.info.render.triangles;

    const depth = rt.scene.depthTexture;

    /* ---- 2. SSAO -------------------------------------------------------- */
    let aoTex = whiteTex;
    if (Q.ao) {
      const u = passes.ssao.uniforms;
      u.tDepth.value = depth;
      u.uTexel.value.set(1 / rt.ao.width, 1 / rt.ao.height);
      u.uTaps.value = Q.aoTaps; u.uTime.value = time;
      setDepthUniforms(u);
      blit(passes.ssao, rt.ao);
      const b = passes.blur.uniforms;
      b.tDepthTex.value = depth; b.uSharp.value = 1;
      b.tSrc.value = rt.ao.texture; b.uDir.value.set(1.35 / rt.ao.width, 0);
      blit(passes.blur, rt.ao2);
      b.tSrc.value = rt.ao2.texture; b.uDir.value.set(0, 1.35 / rt.ao.height);
      blit(passes.blur, rt.ao);
      aoTex = rt.ao.texture;
    }

    /* ---- 3. SSR --------------------------------------------------------- */
    let ssrTex = blackTex;
    if (Q.ssr) {
      const u = passes.ssr.uniforms;
      u.tDepth.value = depth; u.tColor.value = rt.scene.texture;
      u.uTexel.value.set(1 / rt.ssr.width, 1 / rt.ssr.height);
      u.uCamMat.value.copy(camera.matrixWorld);
      u.uSteps.value = Q.ssrSteps; u.uTime.value = time;
      u.uStrength.value = grade.ssr;
      setDepthUniforms(u);
      blit(passes.ssr, rt.ssr);
      const b = passes.blur.uniforms;
      b.tDepthTex.value = depth; b.uSharp.value = 1;
      b.tSrc.value = rt.ssr.texture; b.uDir.value.set(1.0 / rt.ssr.width, 0);
      blit(passes.blur, rt.ssr2);
      b.tSrc.value = rt.ssr2.texture; b.uDir.value.set(0, 1.0 / rt.ssr.height);
      blit(passes.blur, rt.ssr);
      ssrTex = rt.ssr.texture;
    }

    /* ---- 4. volumetric fog ---------------------------------------------- */
    let volTex = null;
    if (Q.vol) {
      const u = passes.vol.uniforms;
      u.tDepth.value = depth;
      u.uCamMat.value.copy(camera.matrixWorld);
      u.uCamPos.value.copy(camera.position);
      u.uSteps.value = Q.volSteps; u.uTime.value = time;
      u.uDensity.value = grade.fogDensity; u.uHeight.value = grade.fogHeight;
      u.uBaseY.value = grade.fogBaseY; u.uAmb.value = grade.fogAmb;
      u.uScatter.value = grade.fogScatter;
      u.uNoise.value = Q.level >= 1 ? 1 : 0;
      u.uFogCol.value.set(grade.fogColor[0], grade.fogColor[1], grade.fogColor[2]);
      setDepthUniforms(u);
      blit(passes.vol, rt.vol);
      const b = passes.blur.uniforms;
      b.tDepthTex.value = depth; b.uSharp.value = 0;
      b.tSrc.value = rt.vol.texture; b.uDir.value.set(1.0 / rt.vol.width, 0);
      blit(passes.blur, rt.vol2);
      b.tSrc.value = rt.vol2.texture; b.uDir.value.set(0, 1.0 / rt.vol.height);
      blit(passes.blur, rt.vol);
      volTex = rt.vol.texture;
    }

    /* ---- 5. resolve ------------------------------------------------------ */
    {
      const u = passes.resolve.uniforms;
      u.tScene.value = rt.scene.texture;
      u.tAO.value = aoTex;
      u.tSSR.value = ssrTex;
      u.tVol.value = volTex || blackTex;
      u.tDepth.value = depth;
      u.uAO.value = Q.ao ? grade.aoStrength : 0;
      u.uSSR.value = Q.ssr ? 1 : 0;
      u.uFogMul.value = volTex ? 1 : 0;
      if (!volTex) { /* blackTex has a=1 so transmittance stays 1 */ }
      setDepthUniforms(u);
      blit(passes.resolve, rt.lit);
    }

    /* ---- 6. bloom -------------------------------------------------------- */
    {
      const u = passes.bright.uniforms;
      u.tSrc.value = rt.lit.texture;
      u.uTexel.value.set(1 / rt.lit.width, 1 / rt.lit.height);
      u.uThreshold.value = RTType === THREE.HalfFloatType ? 2.2 : 0.90;
      u.uKnee.value = 0.62;
      blit(passes.bright, bloomDown[0]);

      const du = passes.down.uniforms;
      for (let i = 1; i < bloomDown.length; i++) {
        du.tSrc.value = bloomDown[i - 1].texture;
        du.uTexel.value.set(1 / bloomDown[i - 1].width, 1 / bloomDown[i - 1].height);
        blit(passes.down, bloomDown[i]);
      }
      /* deepest mip: copy across */
      const last = bloomDown.length - 1;
      passes.copy.uniforms.tSrc.value = bloomDown[last].texture;
      blit(passes.copy, bloomUp[last]);
      const uu = passes.up.uniforms;
      for (let i = last - 1; i >= 0; i--) {
        uu.tSrc.value = bloomUp[i + 1].texture;
        uu.tPrev.value = bloomDown[i].texture;
        uu.uTexel.value.set(1 / bloomUp[i + 1].width, 1 / bloomUp[i + 1].height);
        uu.uRadius.value = 1.9;
        uu.uMix.value = 0.55;
        blit(passes.up, bloomUp[i]);
      }
    }

    /* ---- 7. anamorphic streaks ------------------------------------------ */
    let streakTex = blackTex;
    if (Q.streaks) {
      const su = passes.streak.uniforms;
      const src = bloomDown[Math.min(1, bloomDown.length - 1)];
      su.tSrc.value = src.texture;
      su.uTexel.value.set(1 / rt.streakA.width, 1 / rt.streakA.height);
      su.uSpread.value = 1.0; su.uThresh.value = 0.35;
      blit(passes.streak, rt.streakA);
      su.tSrc.value = rt.streakA.texture; su.uSpread.value = 7.0; su.uThresh.value = 0.0;
      blit(passes.streak, rt.streakB);
      su.tSrc.value = rt.streakB.texture; su.uSpread.value = 25.0; su.uThresh.value = 0.0;
      blit(passes.streak, rt.streakA);
      streakTex = rt.streakA.texture;
    }

    /* ---- 8. composite ---------------------------------------------------- */
    {
      const u = passes.comp.uniforms;
      u.tLit.value = rt.lit.texture;
      u.tBloom.value = bloomUp[0].texture;
      u.tStreak.value = streakTex;
      u.tDirt.value = dirtTex;
      u.uRes.value.set(rt.lit.width, rt.lit.height);
      u.uAspectR.value = rt.lit.width / Math.max(1, rt.lit.height);
      u.uExposure.value = grade.exposure;
      u.uBloom.value = grade.bloom;
      u.uDirt.value = grade.bloomDirt;
      u.uStreak.value = Q.streaks ? grade.streak : 0;
      u.uCA.value = grade.ca;
      u.uVig.value = grade.vignette;
      u.uGrain.value = grade.grain;
      u.uRain.value = Q.lensRain ? grade.rain : 0;
      u.uTime.value = time;
      u.uLift.value.fromArray(grade.lift);
      u.uGamma.value.fromArray(grade.gamma);
      u.uGain.value.fromArray(grade.gain);
      u.uShadowTint.value.fromArray(grade.shadowTint);
      u.uHighTint.value.fromArray(grade.highTint);
      u.uSat.value = grade.sat;
      u.uContrast.value = grade.contrast;
      u.uFade.value = API.fade;
      blit(passes.comp, rt.ldr);
    }

    /* ---- 8b. buffer viewer: ?showpass=scene|lit|ao|ssr|vol|bloom|ldr ------ */
    if (VH.q.showpass) {
      const map = { scene: rt.scene, lit: rt.lit, ao: rt.ao, ssr: rt.ssr, vol: rt.vol, ldr: rt.ldr,
                    bloom: (bloomUp && bloomUp[0]) ? bloomUp[0] : null };
      const t = map[VH.q.showpass];
      if (t) {
        passes.copy.uniforms.tSrc.value = t.texture;
        blit(passes.copy, null);
        stats.calls = renderer.info.render.calls;
        stats.tris = renderer.info.render.triangles;
        return;
      }
    }

    /* ---- 9. FXAA to screen ----------------------------------------------- */
    if (VH.q.nofxaa) {
      passes.copy.uniforms.tSrc.value = rt.ldr.texture;
      blit(passes.copy, null);
    } else {
      const u = passes.fxaa.uniforms;
      u.tSrc.value = rt.ldr.texture;
      u.uTexel.value.set(1 / rt.ldr.width, 1 / rt.ldr.height);
      blit(passes.fxaa, null);
    }

    stats.calls = renderer.info.render.calls;
    stats.tris = renderer.info.render.triangles;
    stats.programs = renderer.info.programs ? renderer.info.programs.length : 0;
  }

  /* ------------------------------------------------------------------ shake */
  function shake(amount, dur) {
    const a = amount === undefined ? 0.4 : amount;
    trauma = Math.min(1, trauma + a);
    traumaDecay = 1 / Math.max(0.12, dur || 0.45);
    fovKick += a * 2.2;
  }
  function hitstop(dur) {
    hitstopT = Math.max(hitstopT, dur || 0.06);
    VH.emit('hitstop', { dur: dur || 0.06 });
  }

  /* ==========================================================================
   *  CORE TEST SCENE  (?coretest=1) — exists only to judge the renderer.
   *  A wet street corridor, neon blades, window grids, a slow dolly.
   * ====================================================================== */
  let testRoot = null, testT = 0;

  function canvasTex(w, h, draw, rep) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.anisotropy = 4;
    return t;
  }

  function buildTestScene() {
    const rnd = U.rng(7);
    testRoot = new THREE.Group();
    scene.add(testRoot);

    /* --- ground: wet asphalt ------------------------------------------- */
    const roughTex = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 240; i++) {
        const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 70;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const v = Math.floor(10 + rnd() * 45);
        grd.addColorStop(0, 'rgba(' + v + ',' + v + ',' + v + ',0.85)');
        grd.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
      }
      /* grain */
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(img, 0, 0);
    }, [7, 7]);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x0b0e11, roughness: 1.0, metalness: 0.35, roughnessMap: roughTex, envMapIntensity: 1.5 }));
    ground.rotation.x = -Math.PI / 2;
    testRoot.add(ground);

    /* kerbs + sidewalks */
    const kerbMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.82, metalness: 0.05, envMapIntensity: 1.0 });
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(14, 0.34, 220), kerbMat);
      side.position.set(s * 13.5, 0.17, -60);
      testRoot.add(side);
    }

    /* --- window grid texture (emissive) -------------------------------- */
    const winTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      const cols = 8, rows = 12;
      const cw = w / cols, ch = h / rows;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (rnd() < 0.42) continue;
        const warm = rnd();
        let col;
        if (warm < 0.62) col = [255, 190, 120];
        else if (warm < 0.86) col = [150, 205, 235];
        else col = [255, 120, 150];
        const a = 0.20 + rnd() * 0.80;
        g.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + a.toFixed(2) + ')';
        const pw2 = cw * 0.52, ph = ch * 0.45;
        g.fillRect(x * cw + cw * 0.24, y * ch + ch * 0.28, pw2, ph);
        if (rnd() < 0.3) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x * cw + cw * 0.24, y * ch + ch * 0.28 + ph * 0.4, pw2 * (0.3 + rnd() * 0.6), ph * 0.6); }
      }
    }, [1, 1]);

    /* --- buildings ------------------------------------------------------ */
    const bMatBase = { color: 0x0a0d10, roughness: 0.93, metalness: 0.06, envMapIntensity: 0.9 };
    let z = 8;
    const facadeMats = [];
    for (let i = 0; i < 16; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const depth = 9 + rnd() * 14;
      const hgt = 16 + rnd() * 46;
      const wid = 12 + rnd() * 10;
      const zz = 6 - (i >> 1) * 22 - rnd() * 6;
      const wt = winTex.clone();
      wt.needsUpdate = true;
      wt.repeat.set(Math.max(1, Math.round(wid / 5)), Math.max(2, Math.round(hgt / 6)));
      const m = new THREE.MeshStandardMaterial(Object.assign({}, bMatBase, {
        emissive: new THREE.Color(0xffffff), emissiveMap: wt, emissiveIntensity: 2.1,
      }));
      facadeMats.push(m);
      const b = new THREE.Mesh(new THREE.BoxGeometry(wid, hgt, depth), m);
      b.position.set(side * (20 + wid * 0.5 + rnd() * 3), hgt * 0.5, zz);
      testRoot.add(b);

      /* a darker setback block on top for silhouette variety */
      if (rnd() < 0.6) {
        const t = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.55, 4 + rnd() * 9, depth * 0.55),
          new THREE.MeshStandardMaterial({ color: 0x090c0f, roughness: 0.95, metalness: 0.05 }));
        t.position.set(b.position.x, hgt + t.geometry.parameters.height * 0.5, zz);
        testRoot.add(t);
      }
    }

    /* far skyline silhouettes so the fog has something to eat */
    for (let i = 0; i < 22; i++) {
      const h2 = 30 + rnd() * 80;
      const b = new THREE.Mesh(new THREE.BoxGeometry(10 + rnd() * 22, h2, 10 + rnd() * 20),
        new THREE.MeshStandardMaterial({ color: 0x070a0d, roughness: 1.0, metalness: 0.0 }));
      b.position.set((rnd() - 0.5) * 260, h2 * 0.5, -120 - rnd() * 130);
      testRoot.add(b);
    }

    /* --- neon signs ----------------------------------------------------- */
    const signs = [
      /* [colorHex, intensity, x, y, z, w, h, vertical] */
      [0x00e5ff, 7.0, -19.2, 12.0, -6, 1.5, 9, 1],
      [0xff2d6f, 8.5, 19.2, 9.0, -14, 1.7, 11, 1],
      [0xffb340, 5.5, -19.2, 5.2, -30, 6.5, 1.5, 0],
      [0x00e5ff, 6.0, 19.2, 16.0, -40, 1.4, 8, 1],
      [0xff2d6f, 5.0, -19.2, 20.0, -52, 5.5, 1.3, 0],
      [0xffb340, 6.5, 19.2, 4.6, -60, 1.3, 7, 1],
      [0x7cff5a, 4.0, -19.2, 3.4, -76, 3.6, 1.1, 0],
      [0x00e5ff, 5.0, 19.2, 11.0, -88, 1.2, 6, 1],
      [0xffb340, 7.5, 0.0, 7.0, -104, 9.0, 2.2, 0],
    ];
    for (const s of signs) {
      const col = new THREE.Color(s[0]);
      const mat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(s[1]), toneMapped: false, fog: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s[5], s[6]), mat);
      m.position.set(s[2], s[3], s[4]);
      m.rotation.y = s[2] < 0 ? Math.PI / 2 : (s[2] > 0 ? -Math.PI / 2 : 0);
      testRoot.add(m);
      /* backing box so the sign is not a floating plane */
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.35, s[6] * 1.15, s[5] * 1.15),
        new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.7, metalness: 0.4 }));
      back.position.copy(m.position);
      back.position.x += s[2] < 0 ? -0.25 : 0.25;
      if (s[2] === 0) { back.position.x = 0; back.position.z = s[4] - 0.25; back.rotation.y = Math.PI / 2; }
      testRoot.add(back);

      registerLight(m, { color: s[0], intensity: s[1] * 0.42, range: 16 + s[1], importance: 1.2, fogGain: 1.25, fogRange: 10 + s[1] * 1.2 });
    }

    /* street level warm sodium pools (lights only, no visible fixture geo needed) */
    for (let i = 0; i < 6; i++) {
      const zz = 2 - i * 20;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6),
        new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.6, metalness: 0.7 }));
      const sx = (i % 2 === 0 ? -1 : 1) * 12.4;
      pole.position.set(sx, 3.5, zz);
      testRoot.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.5),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb340).multiplyScalar(3.2), toneMapped: false, fog: false }));
      head.position.set(sx - Math.sign(sx) * 0.8, 6.9, zz);
      testRoot.add(head);
      registerLight(head, { color: 0xffc46a, intensity: 2.4, range: 15, importance: 0.9, fogGain: 0.7, fogRange: 7 });
    }

    /* --- props: bollards, pipes, a couple of vehicles ------------------- */
    const propMat = new THREE.MeshStandardMaterial({ color: 0x0e1216, roughness: 0.75, metalness: 0.35, envMapIntensity: 1.2 });
    for (let i = 0; i < 26; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.0, 6), propMat);
      b.position.set((i % 2 ? 1 : -1) * (12.2 + rnd() * 0.5), 0.5, 4 - i * 4.2 - rnd() * 2);
      testRoot.add(b);
    }
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 4.6), new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.25, metalness: 0.8, envMapIntensity: 1.6 }));
      body.position.y = 0.75; car.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.12, metalness: 0.6, envMapIntensity: 2.0 }));
      cab.position.set(0, 1.42, -0.2); car.add(cab);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2d3f).multiplyScalar(4.0), toneMapped: false, fog: false }));
      tail.position.set(0, 0.95, 2.31); car.add(tail);
      car.position.set((i % 2 ? 1 : -1) * 8.4, 0, -14 - i * 26);
      car.rotation.y = Math.PI * (i % 2);
      testRoot.add(car);
      registerLight(tail, { color: 0xff2d3f, intensity: 0.8, range: 7, importance: 0.5, fogGain: 0.8, fogRange: 4 });
    }

    /* foreground occluder: a pipe running down the left edge */
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 26, 10),
      new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.55, metalness: 0.6, envMapIntensity: 1.4 }));
    pipe.position.set(-11.0, 9, 9.5);
    testRoot.add(pipe);

    /* steam grates: faint additive cards */
    for (let i = 0; i < 5; i++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 5.5),
        new THREE.MeshBasicMaterial({ color: 0x2a3a44, transparent: true, opacity: 0.10, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
      st.position.set((rnd() - 0.5) * 16, 2.6, -8 - i * 21);
      testRoot.add(st);
    }

    camTarget.fov = 46;
  }

  function updateTestScene(dt) {
    if (!testRoot) return;
    testT += dt;
    const t = testT * 0.12;
    if (!(VH.debug && VH.debug._free)) {
      camTarget.pos.set(Math.sin(t) * 4.2, 2.0 + Math.sin(t * 0.7) * 0.55, 12.0 + Math.cos(t * 0.55) * 5.0);
      camTarget.look.set(Math.sin(t * 0.8) * 3.0, 5.0 + Math.sin(t * 0.4) * 2.0, -46.0);
    }
  }

  /* -------------------------------------------------------------------- API */
  /* Read a pixel out of each intermediate target. Guessing at a blown-out frame from
   * screenshots alone is guesswork; this gives the actual numbers per stage. */
  function probe(px, py) {
    const out = {};
    const x = px === undefined ? (W / 2) | 0 : px | 0;
    const y = py === undefined ? (H * 0.78) | 0 : py | 0;
    const rd = (target, name, scale) => {
      if (!target) { out[name] = null; return; }
      try {
        const isF = target.texture.type !== THREE.UnsignedByteType;
        const b = isF ? new Float32Array(4) : new Uint8Array(4);
        const sx = Math.min(target.width - 1, Math.max(0, (x * (scale || 1)) | 0));
        const sy = Math.min(target.height - 1, Math.max(0, (y * (scale || 1)) | 0));
        renderer.readRenderTargetPixels(target, sx, sy, 1, 1, b);
        out[name] = [+b[0].toFixed(4), +b[1].toFixed(4), +b[2].toFixed(4), +b[3].toFixed(3)];
      } catch (e) { out[name] = 'ERR ' + e.message; }
    };
    rd(rt.scene, 'scene');
    rd(rt.lit, 'lit');
    if (Q.ao) rd(rt.ao, 'ao', Q.aoScale);
    if (Q.ssr) rd(rt.ssr, 'ssr', Q.ssrScale);
    if (Q.vol) rd(rt.vol, 'vol', Q.volScale);
    if (bloomUp && bloomUp[0]) rd(bloomUp[0], 'bloom');
    rd(rt.ldr, 'ldr');
    out.rtType = (RTType === THREE.HalfFloatType) ? 'half' : 'byte';
    out.at = [x, y];
    return out;
  }

  const API = {
    init, render, resize, setQuality, shake, hitstop, registerLight, probe,
    camTarget,
    scene: null, camera: null, renderer: null, env: null,
    get sky() { return skyMesh; },
    stats, grade, gfx,
    fade: 1,
    get quality() { return Q.level; },
    get time() { return time; },
    /* let other modules ask whether the post stack is live */
    get post() { return postOK; },
  };
  return API;
})();
