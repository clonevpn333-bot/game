// ============================================================================
//  Built-in stylized shader pack:
//   - chunk materials (baked light + tint + AO + fog + waving water/foliage)
//   - dynamic sky dome, sun, moon, stars
//   - post FX: volumetric god rays, bloom, color grading, ACES tonemap
// ============================================================================
import * as THREE from 'three';

// ---- shared uniforms (referenced by chunk materials + sky) -------------------
export function createUniforms() {
  return {
    uTime: { value: 0 },
    uDayLight: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0.3, 0.9, 0.2) },
    uFogColor: { value: new THREE.Color(0x88bbff) },
    uFogNear: { value: 40 },
    uFogFar: { value: 170 },
    uAmbient: { value: 0.07 },
    uCamPos: { value: new THREE.Vector3() },
    uUnderwater: { value: 0 },
  };
}

// ---- atlas texture ----------------------------------------------------------
export function createAtlasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}

// ---- chunk materials --------------------------------------------------------
const VERT = /* glsl */`
attribute vec2 alight;
attribute float ao;
attribute float wave;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vAo;
varying float vFog; varying vec3 vNormalW;
uniform float uTime; uniform float uFogNear; uniform float uFogFar;
void main(){
  vUv = uv; vColor = color; vLight = alight; vAo = ao; vNormalW = normal;
  vec4 wpos = modelMatrix * vec4(position, 1.0);
#ifdef WATER
  if (normal.y > 0.5) {
    wpos.y += sin(uTime*1.6 + wpos.x*0.7 + wpos.z*0.7)*0.05
            + cos(uTime*1.1 + wpos.x*0.3 - wpos.z*0.5)*0.04 - 0.11;
  }
#endif
#ifdef FOLIAGE
  if (wave > 0.5) {
    float s = sin(uTime*2.2 + wpos.x*0.8 + wpos.z*0.8);
    wpos.x += s*0.09*wave;
    wpos.z += cos(uTime*1.9 + wpos.x*0.6)*0.06*wave;
  }
#endif
  vec4 mv = viewMatrix * wpos;
  float d = length(mv.xyz);
  vFog = clamp((d - uFogNear)/(uFogFar - uFogNear), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform sampler2D map;
uniform float uDayLight; uniform vec3 uFogColor; uniform float uAmbient;
uniform vec3 uSunDir; uniform float uUnderwater;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vAo;
varying float vFog; varying vec3 vNormalW;
void main(){
  vec4 tex = texture2D(map, vUv);
#ifdef CUTOUT
  if (tex.a < 0.5) discard;
#endif
  tex.rgb = pow(tex.rgb, vec3(2.2)); // sRGB -> linear
  float sky = vLight.x;
  float blk = vLight.y;
  float skyContrib = sky * uDayLight;
  float light = max(blk, skyContrib);
  light = max(light, uAmbient);
  // gentle ambient curve + slight directional bump
  float ndl = clamp(dot(normalize(vNormalW), normalize(uSunDir)), 0.0, 1.0);
  light *= (0.86 + 0.14 * ndl * uDayLight);
  // warm tint where block light dominates
  float warm = clamp(blk - skyContrib, 0.0, 1.0);
  vec3 lightCol = mix(vec3(1.0), vec3(1.15, 0.82, 0.5), warm);
  vec3 col = tex.rgb * vColor * light * (0.55 + 0.45*vAo) * lightCol;
  float alpha = tex.a;
#ifdef WATER
  alpha = 0.74;
  col += vec3(0.02,0.05,0.09) * uDayLight;
#endif
  vec3 fog = pow(uFogColor, vec3(2.2));
  col = mix(col, fog, vFog);
  if (uUnderwater > 0.5) col = mix(col, vec3(0.05,0.18,0.35), 0.35);
  gl_FragColor = vec4(col, alpha);
}`;

function makeMat(texture, uniforms, defines, opts) {
  const u = Object.assign({ map: { value: texture } }, uniforms);
  const m = new THREE.ShaderMaterial({
    uniforms: u, vertexShader: VERT, fragmentShader: FRAG,
    defines, vertexColors: true,
    transparent: !!opts.transparent,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
  });
  return m;
}

export function createChunkMaterials(texture, uniforms) {
  return {
    0: makeMat(texture, uniforms, { CUTOUT: '', FOLIAGE: '' }, { transparent: false }),
    1: makeMat(texture, uniforms, {}, { transparent: true, depthWrite: true }),
    2: makeMat(texture, uniforms, { WATER: '' }, { transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  };
}

// ---- sky / sun / moon / stars ----------------------------------------------
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */`
varying vec3 vDir;
uniform vec3 uTop, uMid, uBottom, uSunColor; uniform vec3 uSunDir; uniform float uDay;
uniform float uTime; uniform vec3 uCamPos; uniform float uClouds;
float hash(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.0; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 col = mix(uBottom, uMid, smoothstep(0.28, 0.5, h));
  col = mix(col, uTop, smoothstep(0.5, 0.95, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  // soft volumetric cloud layer on a projected plane
  if (uClouds > 0.5 && d.y > 0.015) {
    float t = 2.6 / max(d.y, 0.02);
    vec2 cp = (uCamPos.xz * 0.30 + d.xz * t) * 0.085;
    cp += vec2(uTime * 0.004, uTime * 0.0026);
    float n = fbm(cp);
    float n2 = fbm(cp * 2.4 + 11.0);
    float shape = n * 0.68 + n2 * 0.32;
    float dens = smoothstep(0.34, 0.60, shape);
    float fade = smoothstep(0.02, 0.10, d.y);
    float cover = dens * fade;
    float rim = 0.6 + 0.4 * pow(sd, 2.0);
    vec3 baseC = vec3(0.78, 0.81, 0.86);
    vec3 lit = mix(baseC, vec3(1.0, 0.99, 0.96), dens);
    lit *= rim * mix(0.5, 1.05, uDay);
    lit += uSunColor * pow(sd, 5.0) * 0.5 * cover;
    col = mix(col, lit, cover);
  }
  // sun disk + glow (softened)
  col += uSunColor * pow(sd, 220.0) * 2.0;
  col += uSunColor * pow(sd, 8.0) * 0.12 * uDay;
  col += uSunColor * pow(sd, 3.0) * (1.0 - h) * 0.18;
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);
}`;

// tiling cloud texture (white puffs on transparent) for the 3D cloud layer
function makeCloudTexture() {
  const S = 128;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  // simple tiling value noise
  const R = 16, grid = new Float32Array((R + 1) * (R + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
  const at = (x, y) => grid[((y % R) * (R + 1)) + (x % R)];
  const smooth = t => t * t * (3 - 2 * t);
  const noise = (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = smooth(fx - x0), ty = smooth(fy - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), cc = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
  };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let n = 0, amp = 0.6, f = R / S;
    for (let o = 0; o < 4; o++) { n += amp * noise(x * f, y * f); f *= 2; amp *= 0.5; }
    const a = Math.max(0, Math.min(1, (n - 0.45) / 0.25));
    const i = (y * S + x) * 4;
    const shade = 235 + (n - 0.5) * 30;
    img.data[i] = shade; img.data[i + 1] = shade; img.data[i + 2] = shade + 8;
    img.data[i + 3] = a * a * 235;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

export function createSky(uniforms) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const skyU = {
    uTop: { value: new THREE.Color(0x3a7bd5) },
    uMid: { value: new THREE.Color(0x8fbcef) },
    uBottom: { value: new THREE.Color(0xcfe3f4) },
    uSunColor: { value: new THREE.Color(0xfff2cc) },
    uSunDir: uniforms.uSunDir,
    uDay: uniforms.uDayLight,
    uTime: uniforms.uTime,
    uCamPos: uniforms.uCamPos,
    uClouds: { value: 0 }, // shader haze off — using the real 3D cloud layer below
  };
  const mat = new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  group.add(dome);

  // sun
  const sun = new THREE.Mesh(new THREE.CircleGeometry(60, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  group.add(sun);
  // moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(42, 24),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ff, transparent: true, depthWrite: false, fog: false }));
  group.add(moon);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const N = 1400, pos = [];
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(820);
    if (v.y < 0) v.y = -v.y;
    pos.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3.0, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false }));
  stars.frustumCulled = false;
  group.add(stars);

  // 3D cloud layer: a big horizontal textured plane that scrolls (Minecraft-style)
  const CLOUD_Y = 128;
  const cloudTex = makeCloudTexture();
  cloudTex.repeat.set(10, 10);
  const cloud = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  cloud.rotation.x = -Math.PI / 2;
  cloud.frustumCulled = false;
  group.add(cloud);

  return {
    group, dome, sun, moon, stars, cloud, skyU,
    setColors(top, mid, bottom, sunCol) { skyU.uTop.value.copy(top); skyU.uMid.value.copy(mid); skyU.uBottom.value.copy(bottom); skyU.uSunColor.value.copy(sunCol); },
    update(camera, sunDir, dayLight) {
      group.position.copy(camera.position);
      const R = 700;
      sun.position.copy(camera.position).addScaledVector(sunDir, R);
      sun.lookAt(camera.position);
      moon.position.copy(camera.position).addScaledVector(sunDir, -R);
      moon.lookAt(camera.position);
      stars.material.opacity = Math.pow(1.0 - dayLight, 1.5);
      sun.material.opacity = THREE.MathUtils.clamp(dayLight * 1.3, 0, 1);
      moon.material.opacity = THREE.MathUtils.clamp(1.0 - dayLight, 0, 1);
      // clouds: fixed world height, scroll slowly, brighten with daylight
      cloud.position.y = CLOUD_Y - camera.position.y;
      cloudTex.offset.x = (uniforms.uTime.value * 0.0015) % 1;
      cloud.material.opacity = (0.35 + 0.55 * dayLight) * 0.95;
    },
  };
}

// ---- god rays pass ----------------------------------------------------------
const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSun: { value: new THREE.Vector2(0.5, 0.7) },
    uVisible: { value: 0 },
    uDensity: { value: 0.9 },
    uWeight: { value: 0.24 },
    uDecay: { value: 0.95 },
    uExposure: { value: 0.38 },
    uThreshold: { value: 0.62 },
    uColor: { value: new THREE.Color(0xfff0c8) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    #define SAMPLES 64
    varying vec2 vUv; uniform sampler2D tDiffuse;
    uniform vec2 uSun; uniform float uVisible, uDensity, uWeight, uDecay, uExposure, uThreshold;
    uniform vec3 uColor;
    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      if (uVisible < 0.5) { gl_FragColor = vec4(base,1.0); return; }
      vec2 delta = (vUv - uSun) * (uDensity / float(SAMPLES));
      vec2 coord = vUv;
      float illum = uExposure;
      vec3 sum = vec3(0.0);
      for (int i=0;i<SAMPLES;i++){
        coord -= delta;
        vec3 s = texture2D(tDiffuse, coord).rgb;
        float l = dot(s, vec3(0.299,0.587,0.114));
        float m = smoothstep(uThreshold, uThreshold+0.4, l);
        sum += s * m * illum * uWeight;
        illum *= uDecay;
      }
      gl_FragColor = vec4(base + sum * uColor * uVisible, 1.0);
    }`,
};

// ---- color grade pass -------------------------------------------------------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 0.90 },
    uContrast: { value: 1.0 },
    uBrightness: { value: 1.06 },
    uVignette: { value: 0.22 },
    uTint: { value: new THREE.Color(1.0, 1.0, 1.0) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform sampler2D tDiffuse;
    uniform float uSat, uContrast, uBrightness, uVignette; uniform vec3 uTint;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c *= uBrightness; c *= uTint;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 q = vUv - 0.5;
      float vig = smoothstep(0.85, 0.35, length(q));
      c *= mix(1.0, vig, uVignette);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

// ---- self-contained composer (no addons): scene -> god rays -> bloom -> grade ----
const QUAD_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

function fsMaterial(uniforms, frag) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: QUAD_VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
}

export function createPostFX(renderer, scene, camera) {
  const dpr = renderer.getPixelRatio();
  let W = Math.floor(window.innerWidth * dpr), H = Math.floor(window.innerHeight * dpr);
  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: true, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };
  const rtScene = new THREE.WebGLRenderTarget(W, H, rtOpts);
  const rtGod = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  let bw = Math.floor(W / 2), bh = Math.floor(H / 2);
  const rtA = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
  const rtB = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quadScene.add(quadMesh);
  const draw = (mat, target) => { quadMesh.material = mat; renderer.setRenderTarget(target || null); renderer.render(quadScene, quadCam); };

  const godMat = fsMaterial(THREE.UniformsUtils.clone(GodRaysShader.uniforms), GodRaysShader.fragmentShader);
  const brightMat = fsMaterial({ tDiffuse: { value: null }, uThreshold: { value: 1.0 } }, /* glsl */`
    varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uThreshold;
    void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(0.2126,0.7152,0.0722));
      gl_FragColor = l>uThreshold ? vec4(c*(l-uThreshold)/max(l,1e-4),1.0) : vec4(0.0,0.0,0.0,1.0); }`);
  const blurMat = fsMaterial({ tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRes: { value: new THREE.Vector2(bw, bh) } }, /* glsl */`
    varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uDir, uRes;
    void main(){ vec2 px=uDir/uRes; vec3 c=vec3(0.0);
      c+=texture2D(tDiffuse,vUv).rgb*0.227027;
      c+=texture2D(tDiffuse,vUv+px*1.3846).rgb*0.316216;
      c+=texture2D(tDiffuse,vUv-px*1.3846).rgb*0.316216;
      c+=texture2D(tDiffuse,vUv+px*3.2307).rgb*0.070270;
      c+=texture2D(tDiffuse,vUv-px*3.2307).rgb*0.070270;
      gl_FragColor=vec4(c,1.0); }`);
  const finalMat = fsMaterial(Object.assign(THREE.UniformsUtils.clone(GradeShader.uniforms), {
    tScene: { value: null }, tBloom: { value: null }, uBloom: { value: 0.85 },
  }), /* glsl */`
    varying vec2 vUv; uniform sampler2D tScene, tBloom;
    uniform float uBloom, uSat, uContrast, uBrightness, uVignette; uniform vec3 uTint;
    vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
    void main(){
      vec3 col = texture2D(tScene,vUv).rgb + texture2D(tBloom,vUv).rgb * uBloom;
      col *= uBrightness; col *= uTint;
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      vec2 q = vUv - 0.5;
      col *= mix(1.0, smoothstep(0.9, 0.32, length(q)), uVignette);
      col = aces(max(col, 0.0));
      col = pow(col, vec3(1.0/2.2));
      gl_FragColor = vec4(col, 1.0);
    }`);

  const api = {
    godrays: { enabled: true, uniforms: godMat.uniforms },
    bloom: { enabled: true, strength: 0.5 },
    grade: { uniforms: finalMat.uniforms },
    render() {
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, camera);
      let srcTex = rtScene.texture;
      if (this.godrays.enabled) { godMat.uniforms.tDiffuse.value = rtScene.texture; draw(godMat, rtGod); srcTex = rtGod.texture; }
      if (this.bloom.enabled) {
        brightMat.uniforms.tDiffuse.value = srcTex; draw(brightMat, rtA);
        for (let i = 0; i < 3; i++) {
          blurMat.uniforms.tDiffuse.value = rtA.texture; blurMat.uniforms.uDir.value.set(1, 0); draw(blurMat, rtB);
          blurMat.uniforms.tDiffuse.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, 1); draw(blurMat, rtA);
        }
        finalMat.uniforms.tBloom.value = rtA.texture;
        finalMat.uniforms.uBloom.value = this.bloom.strength;
      } else { finalMat.uniforms.tBloom.value = null; finalMat.uniforms.uBloom.value = 0; }
      finalMat.uniforms.tScene.value = srcTex;
      draw(finalMat, null);
      renderer.setRenderTarget(null);
    },
    setSize(w, h) {
      W = Math.floor(w * dpr); H = Math.floor(h * dpr); bw = Math.floor(W / 2); bh = Math.floor(H / 2);
      rtScene.setSize(W, H); rtGod.setSize(W, H); rtA.setSize(bw, bh); rtB.setSize(bw, bh);
      blurMat.uniforms.uRes.value.set(bw, bh);
    },
  };
  return api;
}
