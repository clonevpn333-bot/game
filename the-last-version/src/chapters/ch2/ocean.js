// Storm ocean: Gerstner waves evaluated identically on GPU (rendering) and
// CPU (buoyancy), with crest foam, subsurface glow, rain and lightning.
import * as THREE from 'three';

// [dirX, dirZ, wavelength, steepness, speedMul]
export const WAVES = [
  [1.0, 0.25, 62, 0.22, 1.0],
  [0.8, -0.6, 37, 0.2, 1.0],
  [0.3, 1.0, 24, 0.18, 1.0],
  [-0.6, 0.8, 15, 0.15, 1.0],
  [0.95, -0.2, 9, 0.12, 1.0],
  [-0.2, -1.0, 6, 0.1, 1.0],
];
const G = 9.81;
const PRE = WAVES.map(([dx, dz, L, S, sm]) => {
  const l = Math.hypot(dx, dz), k = (2 * Math.PI) / L;
  // height amplitude from steepness; horizontal (choppiness) factor Q kept below the fold limit
  // long swells keep their height (a 9 m hull can ride them); short chop is kept low so it never washes through the boat
  return { dx: dx / l, dz: dz / l, k, a: (S / k) * (L >= 24 ? 1.15 : 0.45), c: Math.sqrt(G / k) * sm, S: 0.55 };
});

export const OCEAN = { amp: 1.0, time: 0 };

/** Gerstner displacement of the rest point (x,z) → out {x,y,z}. */
export function gerstner(x, z, t, out = { x: 0, y: 0, z: 0 }) {
  let ox = x, oy = 0, oz = z;
  const A = OCEAN.amp;
  for (const w of PRE) {
    const f = w.k * (w.dx * x + w.dz * z - w.c * t);
    const ca = Math.cos(f) * w.a * A;
    ox += w.dx * ca * w.S * 1.0; oz += w.dz * ca * w.S * 1.0; oy += Math.sin(f) * w.a * A;
  }
  out.x = ox; out.y = oy; out.z = oz;
  return out;
}

const _o = { x: 0, y: 0, z: 0 };
/** Water height at world (x,z): invert the horizontal displacement (2 iterations). */
export function waterHeight(x, z, t = OCEAN.time) {
  let px = x, pz = z;
  for (let i = 0; i < 3; i++) { gerstner(px, pz, t, _o); px -= _o.x - x; pz -= _o.z - z; }
  gerstner(px, pz, t, _o);
  return _o.y;
}

/** Surface normal at (x,z) via finite differences. */
export function waterNormal(x, z, t = OCEAN.time, out = new THREE.Vector3()) {
  const e = 0.8;
  const h = waterHeight(x, z, t), hx = waterHeight(x + e, z, t), hz = waterHeight(x, z + e, t);
  return out.set(h - hx, e, h - hz).normalize();
}

const WAVE_GLSL = `
uniform float uTime; uniform float uAmp;
uniform vec4 uW[${WAVES.length}]; // dirx, dirz, k, a
uniform vec2 uWS[${WAVES.length}]; // c, steepness
vec3 gerst(vec2 p, out vec3 nrm, out float jac){
  vec3 o = vec3(p.x, 0.0, p.y);
  vec3 tx = vec3(1.0, 0.0, 0.0), tz = vec3(0.0, 0.0, 1.0);
  float jxx = 1.0, jzz = 1.0, jxz = 0.0;
  for (int i = 0; i < ${WAVES.length}; i++) {
    vec2 d = uW[i].xy; float k = uW[i].z; float a = uW[i].w * uAmp; float c = uWS[i].x; float S = uWS[i].y;
    float f = k * (dot(d, p) - c * uTime);
    float ca = cos(f), sa = sin(f);
    o.x += d.x * ca * a * S; o.z += d.y * ca * a * S; o.y += sa * a;
    float ka = k * a;
    tx += vec3(-d.x * d.x * S * sa * ka, d.x * ca * ka, -d.x * d.y * S * sa * ka);
    tz += vec3(-d.x * d.y * S * sa * ka, d.y * ca * ka, -d.y * d.y * S * sa * ka);
    jxx -= d.x * d.x * S * sa * ka; jzz -= d.y * d.y * S * sa * ka; jxz -= d.x * d.y * S * sa * ka;
  }
  nrm = normalize(cross(tz, tx));
  jac = jxx * jzz - jxz * jxz;
  return o;
}`;

const WAKE_N = 24, HULL_N = 6;

export function makeOcean(scene, { size = 900, seg = 256, color = 0x06222b, deep = 0x020b10, envIntensity = 1 } = {}) {
  const U = {
    uTime: { value: 0 }, uAmp: { value: 1 },
    uW: { value: PRE.map((w) => new THREE.Vector4(w.dx, w.dz, w.k, w.a)) },
    uWS: { value: PRE.map((w) => new THREE.Vector2(w.c, w.S)) },
    uDeep: { value: new THREE.Color(deep) }, uShallow: { value: new THREE.Color(color) },
    uFlash: { value: 0 }, uFoamCol: { value: new THREE.Color(0xd8e6ea) },
    // wake trail behind the player's boat: x, z, half-width, strength
    uWake: { value: Array.from({ length: WAKE_N }, () => new THREE.Vector4()) },
    // boats on the water: x, z, yaw, strength (foam ring around the hull)
    uHull: { value: Array.from({ length: HULL_N }, () => new THREE.Vector4()) },
  };
  // radial grid: dense near the camera, sparse far away
  const geo = new THREE.BufferGeometry();
  const pos = [], idx = [];
  const rings = seg, spokes = 128;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings, rad = Math.pow(t, 2.2) * size;
    for (let s = 0; s < spokes; s++) { const a = (s / spokes) * Math.PI * 2; pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad); }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < spokes; s++) {
    const a = r * spokes + s, b = r * spokes + ((s + 1) % spokes), c = a + spokes, d = b + spokes;
    idx.push(a, b, c, b, d, c); // counter-clockwise seen from above, so the surface faces up
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
  // double-sided so the surface is also visible from below; a heightfield seen from above always
  // hits a front face first, so the underside shading never shows from the air
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.16, metalness: 0, clearcoat: 0.0, envMapIntensity: envIntensity, specularIntensity: 0.6, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + WAVE_GLSL + '\nvarying float vH; varying float vJac; varying vec3 vOW; varying float vDist;')
      .replace('#include <beginnormal_vertex>', `
        vec3 wp0 = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 gn; float gj;
        vec3 gp = gerst(wp0.xz, gn, gj);
        vec3 objectNormal = gn;`)
      .replace('#include <begin_vertex>', `vec3 transformed = gp - vec3(modelMatrix[3].x, 0.0, modelMatrix[3].z); vH = gp.y; vJac = gj; vOW = gp; vDist = length(wp0.xz - cameraPosition.xz);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uFlash; uniform vec3 uDeep, uShallow, uFoamCol;
        uniform vec4 uWake[${WAKE_N}]; uniform vec4 uHull[${HULL_N}];
        varying float vH; varying float vJac; varying vec3 vOW; varying float vDist;
        float oh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float on(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(oh(i), oh(i+vec2(1,0)), f.x), mix(oh(i+vec2(0,1)), oh(i+vec2(1,1)), f.x), f.y); }
        float ofbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * on(p); p *= 2.1; a *= 0.5; } return s; }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float crest = clamp((vH + 3.0) / 7.0, 0.0, 1.0);
        diffuseColor.rgb = mix(uDeep, uShallow, crest);
        float foamMask = smoothstep(0.3, -0.15, vJac) * 0.85 + smoothstep(2.8, 4.2, vH) * 0.35;
        float foamTex = ofbm(vOW.xz * 0.35 + vec2(uTime * 0.2, 0.0)) * ofbm(vOW.xz * 1.3 - uTime * 0.1);
        float foam = clamp(foamMask * (0.4 + foamTex * 1.4), 0.0, 1.0);
        // streaks of wind-blown foam
        foam = max(foam, smoothstep(0.66, 0.82, ofbm(vec2(vOW.x * 0.05, vOW.z * 0.4) + uTime * 0.05)) * 0.18 * crest);
        // boat wakes: a churned trail with brighter spreading edges, and a ring where hulls push the water aside
        float wk = 0.0;
        for (int i = 0; i < ${WAKE_N - 1}; i++) {
          vec4 wa = uWake[i], wb = uWake[i + 1];
          if (wa.w <= 0.0 || wb.w <= 0.0) continue;
          vec2 pa = vOW.xz - wa.xy, ba = wb.xy - wa.xy;
          float hr = dot(pa, ba) / max(dot(ba, ba), 1e-4), hh = clamp(hr, 0.0, 1.0);
          float d = length(pa - ba * hh), hw = mix(wa.z, wb.z, hh), st = mix(wa.w, wb.w, hh);
          float age = (hw - 1.1) / 2.4;
          // churned centre dies out in ~2 s; the two spreading edges (the V) last longer
          float body = (1.0 - smoothstep(hw * 0.25, hw * 0.6, d)) * max(0.0, 1.0 - age / 2.0);
          float ew = 0.35 + age * 0.25;
          // edges only beside the segment (not around its end caps, which would draw rings)
          float edge = (1.0 - smoothstep(0.0, ew, abs(d - hw))) * step(-0.02, hr) * step(hr, 1.02);
          wk = max(wk, st * max(body * 0.75, edge * 0.55));
        }
        for (int i = 0; i < ${HULL_N}; i++) {
          vec4 hb = uHull[i];
          if (hb.w <= 0.0) continue;
          vec2 r = vOW.xz - hb.xy; float cy = cos(hb.z), sy = sin(hb.z);
          float lz = r.x * sy + r.y * cy, lx = r.x * cy - r.y * sy;
          float e = length(vec2(lx / 1.8, lz / (lz > 0.0 ? 4.9 : 4.4)));
          wk = max(wk, hb.w * smoothstep(0.82, 1.0, e) * (1.0 - smoothstep(1.0, 1.5, e)));
        }
        wk *= smoothstep(0.2, 0.62, ofbm(vOW.xz * 0.7 + vec2(uTime * 0.4, -uTime * 0.2)) + wk * 0.25);
        foam = clamp(max(foam, wk), 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFoamCol, foam);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.08, 0.7, foam);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // fine ripples
        vec2 rp = vOW.xz * 1.7;
        vec3 rn = vec3(on(rp + uTime) - 0.5, 0.0, on(rp.yx - uTime * 1.3) - 0.5) * 0.5;
        normal = normalize(normal + mat3(viewMatrix) * rn * smoothstep(120.0, 10.0, vDist));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // light passing through thin crests
        totalEmissiveRadiance += vec3(0.02, 0.12, 0.11) * pow(crest, 3.0) * (1.0 - foam) + uFoamCol * foam * 0.03 + vec3(0.6, 0.7, 0.9) * uFlash * 0.15;`)
      .replace('#include <opaque_fragment>', `
        // seen from below (the intro surfaces from underwater): a dark ceiling with the bright
        // window of sky straight overhead, foam as dark patches
        if (!gl_FrontFacing) {
          vec3 vd = normalize(vOW - cameraPosition);
          float win = smoothstep(0.55, 0.8, vd.y);
          outgoingLight = mix(vec3(0.012, 0.05, 0.06), vec3(0.2, 0.34, 0.38) * (1.0 + uFlash * 2.0), win) * (1.0 - foam * 0.6);
        }
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'ocean';
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.receiveShadow = true;
  scene.add(mesh);
  const wake = [];
  let wakeT = 0;
  return {
    mesh, U,
    /** Drop a wake point at the stern; call every frame with the boat's state. */
    wake(dt, x, z, speed) {
      wakeT -= dt;
      for (const w of wake) w.age += dt;
      while (wake.length && wake[wake.length - 1].age > 5) wake.pop();
      if (wakeT <= 0) { wakeT = 0.12; wake.unshift({ x, z, age: 0, s: Math.min(1, speed / 14) }); if (wake.length > WAKE_N) wake.pop(); }
      else if (wake.length) { wake[0].x = x; wake[0].z = z; wake[0].s = Math.min(1, speed / 14); }
      for (let i = 0; i < WAKE_N; i++) {
        const w = wake[i];
        if (!w) { U.uWake.value[i].set(0, 0, 0, 0); continue; }
        U.uWake.value[i].set(w.x, w.z, 1.1 + w.age * 2.4, w.s * Math.max(0, 1 - w.age / 5));
      }
    },
    clearWake() { wake.length = 0; for (const v of U.uWake.value) v.set(0, 0, 0, 0); },
    /** Hull foam rings: list of {x, z, yaw, s}. */
    hulls(list) { for (let i = 0; i < HULL_N; i++) { const h = list[i]; U.uHull.value[i].set(h ? h.x : 0, h ? h.z : 0, h ? h.yaw : 0, h ? h.s : 0); } },
    update(t, camera) {
      U.uTime.value = t; OCEAN.time = t; U.uAmp.value = OCEAN.amp;
      // follow the camera in 6 m steps so the grid doesn't swim
      mesh.position.set(Math.round(camera.position.x / 6) * 6, 0, Math.round(camera.position.z / 6) * 6);
    },
  };
}

/** Wind-driven rain streaks around the camera. */
export function makeRain(scene, { count = 9000, area = 60 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 2 * 3), seed = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * area, y = Math.random() * 40, z = (Math.random() - 0.5) * area, s = Math.random();
    pos.set([x, y, z, x, y, z], i * 6); seed[i * 2] = s; seed[i * 2 + 1] = s + 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const U = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector2(6, 2) }, uArea: { value: area }, uI: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uArea; uniform vec3 uCam; uniform vec2 uWind; varying float vA;
      void main(){ vec3 p = position; float s = fract(aSeed);
        float fall = 28.0 + s * 8.0;
        p.y = mod(p.y - uTime * fall, 40.0) - 8.0;
        p.xz += uWind * (p.y / fall) * -1.0;
        p.xz = mod(p.xz - uCam.xz + uArea * 0.5, uArea) - uArea * 0.5 + uCam.xz;
        p.y += uCam.y;
        if (aSeed > 9.0) { p.y += 0.9; p.xz -= uWind * 0.03; }
        vA = aSeed > 9.0 ? 0.0 : 0.35;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: 'uniform float uI; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.7, 0.78, 0.85) * (0.18 + vA) * uI, 1.0); }',
  });
  const lines = new THREE.LineSegments(geo, m); lines.frustumCulled = false; scene.add(lines);
  return { lines, U, update(t, cam) { U.uTime.value = t; U.uCam.value.copy(cam.position); } };
}
