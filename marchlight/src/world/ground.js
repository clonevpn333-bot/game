// The world below Meridian: endless scrolling terrain with the city's own
// footprints trailing behind it, old roads and rivers, ruins, low clouds,
// Stillness regions — and Callow Reach, the settlement that should be empty.
import * as THREE from 'three';
import { GLSL_NOISE, rng, clamp } from '../core/util.js';
import { GROUND_Y, HULL } from './city.js';
import { Actor } from '../characters/npc.js';
import { randomLook } from '../characters/rig.js';
import { Builder } from './builder.js';

const VS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_vertex>
  uniform float uTravel;
  varying vec3 vPos; varying vec2 vW; varying float vFogDepth;
  ${GLSL_NOISE}
  void main(){
    vec3 p = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec2 W = vec2(wp.x, wp.z - uTravel);
    float far = smoothstep(500.0, 3000.0, abs(wp.x) + max(0.0, -wp.z - 1200.0) * 0.4);
    float h = (fbm(W * 0.0006) - 0.45) * 520.0 + fbm(W * 0.003) * 60.0;
    wp.y += h * far + (fbm(W * 0.01) - 0.5) * 3.0;
    vPos = wp.xyz; vW = W;
    vec4 mv = viewMatrix * wp;
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }`;
const FS = /* glsl */`
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uTravel, uTime, uStride, uFogDensity, uStillAmt;
  uniform vec3 uSun, uSunCol, uSky, uFog;
  uniform vec3 uHullMin, uHullMax;
  uniform vec3 uLegA[4], uLegB[4], uLegC[4];
  uniform vec4 uFootOff; uniform vec4 uFootX; uniform vec4 uFootFront;
  uniform vec2 uStill; uniform float uStillR;
  varying vec3 vPos; varying vec2 vW; varying float vFogDepth;
  ${GLSL_NOISE}
  float boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax){
    vec3 t0 = (bmin - ro) / rd, t1 = (bmax - ro) / rd;
    vec3 tmin = min(t0, t1), tmax = max(t0, t1);
    float tn = max(max(tmin.x, tmin.y), tmin.z), tf = min(min(tmax.x, tmax.y), tmax.z);
    return (tf > max(tn, 0.0)) ? 1.0 : 0.0;
  }
  float segRay(vec3 ro, vec3 rd, vec3 a, vec3 b, float r){
    // distance between ray and segment
    vec3 ba = b - a, oa = ro - a;
    float baba = dot(ba, ba), bard = dot(ba, rd), baoa = dot(ba, oa), rdoa = dot(rd, oa);
    float d = baba - bard * bard;
    float t = clamp((baba * rdoa - baoa * bard) / max(d, 1e-4), 0.0, 1e5);
    float s = clamp((baoa + t * bard) / baba, 0.0, 1.0);
    vec3 p = ro + rd * t, q = a + ba * s;
    return 1.0 - smoothstep(r * 0.85, r * 1.15, length(p - q));
  }
  float lineD(vec2 p, vec2 a, vec2 dir){ vec2 n = vec2(-dir.y, dir.x); return abs(dot(p - a, n)); }
  void main(){
    #include <logdepthbuf_fragment>
    vec2 W = vW;
    float n1 = fbm(W * 0.004), n2 = fbm(W * 0.02 + 7.0), n3 = fbm(W * 0.0012 + 3.0), n4 = vnoise(W * 0.15);
    vec3 dry = vec3(0.56, 0.5, 0.33), green = vec3(0.3, 0.38, 0.19), earth = vec3(0.42, 0.34, 0.25), rock = vec3(0.5, 0.48, 0.45);
    vec3 col = mix(dry, green, smoothstep(0.42, 0.62, n1));
    col = mix(col, earth, smoothstep(0.55, 0.75, n2) * 0.5);
    // old farmland: irregular parcels (warped Voronoi) with their own crop and furrow direction
    vec2 Wp = W + (vec2(fbm(W * 0.0021 + 2.0), fbm(W * 0.0021 + 9.0)) - 0.5) * 140.0;
    vec2 cid; float cedge; vec2 gq = Wp / 170.0, gi = floor(gq), gf = fract(gq);
    { float d1 = 8.0, d2 = 8.0; vec2 best = vec2(0.0);
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j)), c = gi + o;
        vec2 r = o + vec2(hash12(c), hash12(c + 17.3)) * 0.85 + 0.075 - gf;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; best = c; } else if (d < d2) d2 = d;
      }
      cid = best; cedge = (sqrt(d2) - sqrt(d1)) * 170.0; }
    float fh = hash12(cid), fk = hash12(cid + 5.1);
    float field = step(0.32, fh) * (1.0 - smoothstep(0.5, 0.62, fbm(cid * 0.21)));
    float ang = fk * 3.14159; vec2 fdir = vec2(cos(ang), sin(ang));
    float px = max(fwidth(dot(W, fdir)) * 0.6, 1e-3);
    float furrow = 0.5 + 0.5 * sin(dot(W, fdir) * (0.9 + fh * 0.8));
    furrow = mix(0.5, furrow, 1.0 - smoothstep(0.6, 2.0, px)); // fade furrows before they alias
    vec3 crops[5]; crops[0] = vec3(0.66, 0.58, 0.3); crops[1] = vec3(0.42, 0.48, 0.22); crops[2] = vec3(0.36, 0.29, 0.2); crops[3] = vec3(0.7, 0.64, 0.26); crops[4] = vec3(0.5, 0.5, 0.3);
    vec3 fieldCol = crops[int(fk * 4.99)] * (0.88 + furrow * 0.16) * (0.9 + fbm(W * 0.03 + cid) * 0.2);
    col = mix(col, fieldCol, field * 0.8);
    // hedgerows and tree lines along most parcel boundaries
    float hedge = (1.0 - smoothstep(2.0, 5.5, cedge)) * step(0.3, hash12(cid + 3.0));
    col = mix(col, vec3(0.17, 0.23, 0.12) * (0.8 + vnoise(W * 0.4) * 0.4), hedge * 0.85);
    // fine grass / soil variation, and scrub in clumps (not on a grid)
    float fine = vnoise(W * 0.35) * 0.6 + vnoise(W * 1.3) * 0.4;
    col *= 0.88 + fine * 0.24;
    float scrub = smoothstep(0.62, 0.72, fbm(W * 0.045 + 31.0)) * smoothstep(0.3, 0.7, vnoise(W * 0.6));
    col = mix(col, vec3(0.18, 0.23, 0.12), scrub * (1.0 - field) * 0.8);
    // forests
    float forest = smoothstep(0.58, 0.66, fbm(W * 0.0025 + 11.0));
    col = mix(col, vec3(0.16, 0.22, 0.12) * (0.8 + n4 * 0.4), forest);
    // rock outcrops in the hills
    col = mix(col, rock * (0.8 + n2 * 0.3), smoothstep(80.0, 200.0, vPos.y - ${GROUND_Y.toFixed(1)}) * 0.7);
    // river
    float rv = abs(W.x - 1300.0 - 380.0 * sin(W.y / 900.0) - 120.0 * sin(W.y / 230.0));
    float water = 1.0 - smoothstep(18.0, 26.0, rv);
    col = mix(col, vec3(0.32, 0.27, 0.2), (1.0 - smoothstep(26.0, 60.0, rv)) * 0.5);
    // old roads (asphalt, cracked)
    float road = 0.0;
    road = max(road, 1.0 - smoothstep(9.0, 11.0, lineD(W, vec2(-700.0, 0.0), vec2(0.0, 1.0))));
    road = max(road, 1.0 - smoothstep(7.0, 9.0, lineD(W, vec2(0.0, -300.0), normalize(vec2(1.0, 0.18)))));
    road = max(road, 1.0 - smoothstep(6.0, 8.0, lineD(W, vec2(900.0, 1500.0), normalize(vec2(0.55, 1.0)))));
    road *= step(0.28, fbm(W * 0.01 + 5.0));
    col = mix(col, vec3(0.2, 0.2, 0.21) * (0.85 + n4 * 0.3), road);
    // Marcher trail: trampled band and the city's own footprints
    float trail = 1.0 - smoothstep(230.0, 300.0, abs(W.x));
    col = mix(col, vec3(0.47, 0.4, 0.31) * (0.85 + n2 * 0.25), trail * 0.65);
    float crater = 0.0, rim = 0.0;
    for (int i = 0; i < 4; i++) {
      float fx = uFootX[i];
      float zl = W.y - uFootOff[i];
      float k = floor(zl / uStride + 0.5);
      float cz = uFootOff[i] + k * uStride;
      // only footprints already made (behind the planted foot)
      float made = step(uFootOff[i] - 4.0, cz);
      vec2 d = vec2(W.x - fx, W.y - cz);
      float r = length(d / vec2(1.0, 1.15));
      crater = max(crater, made * (1.0 - smoothstep(19.0, 22.0, r)));
      rim = max(rim, made * (smoothstep(19.0, 22.0, r) - smoothstep(22.0, 30.0, r)));
    }
    col = mix(col, vec3(0.28, 0.23, 0.18), crater * 0.75);
    col = mix(col, vec3(0.6, 0.53, 0.42), rim * 0.4);
    // Stillness: drained of colour, pale and glassy
    float still = smoothstep(0.66, 0.7, fbm(W * 0.0018 + 21.0)) * 0.85;
    float sd = length(W - uStill); still = max(still, (1.0 - smoothstep(uStillR * 0.8, uStillR, sd)) * uStillAmt);
    float lum = dot(col, vec3(0.3, 0.59, 0.11));
    vec3 stillCol = vec3(lum) * vec3(0.86, 0.92, 1.02) + 0.06;
    float glint = step(0.996, hash12(floor(W * 2.0))) * 0.5;
    col = mix(col, stillCol + glint, still);
    col = mix(col, vec3(0.75, 0.8, 0.86), (smoothstep(0.66, 0.67, fbm(W * 0.0018 + 21.0)) - smoothstep(0.67, 0.69, fbm(W * 0.0018 + 21.0))) * 0.4);
    // lighting
    vec3 N = normalize(cross(dFdx(vPos), dFdy(vPos)));
    float diff = max(dot(N, uSun), 0.0);
    float sh = 0.0;
    vec3 ro = vPos + N * 0.5;
    sh = max(sh, boxHit(ro, uSun, uHullMin, uHullMax));
    for (int i = 0; i < 4; i++) { sh = max(sh, segRay(ro, uSun, uLegA[i], uLegB[i], 10.0)); sh = max(sh, segRay(ro, uSun, uLegB[i], uLegC[i], 8.0)); }
    sh = max(sh, segRay(ro, uSun, vec3(0.0, -150.0, -10.0), vec3(0.0, -195.0, -10.0), 40.0));
    float cloud = smoothstep(0.5, 0.68, fbm(W * 0.0009 + vec2(uTime * 0.004, uTime * 0.0015) + 40.0));
    col = mix(col, col * vec3(0.95, 0.88, 0.8), smoothstep(0.75, 0.45, N.y) * 0.6); // bare, warmer slopes
    vec3 lit = col * (uSunCol * diff * (1.0 - sh * 0.82) * (1.0 - cloud * 0.55) + uSky * 0.55);
    // water sheen
    lit = mix(lit, mix(vec3(0.25, 0.32, 0.38), uSky * 0.9, 0.5) + pow(max(dot(reflect(normalize(vPos - cameraPosition), vec3(0,1,0)), uSun), 0.0), 60.0) * uSunCol * 0.8, water);
    // aerial perspective
    float fog = 1.0 - exp(-pow(vFogDepth * uFogDensity, 2.0));
    lit = mix(lit, uFog, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(lit, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export class Ground {
  constructor(game, city) {
    this.game = game; this.city = city;
    const geo = new THREE.PlaneGeometry(26000, 26000, 220, 220); geo.rotateX(-Math.PI / 2);
    // concentrate resolution near the center (warp grid)
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const f = (v) => Math.sign(v) * Math.pow(Math.abs(v) / 13000, 1.8) * 13000;
      P.setXYZ(i, f(x), 0, f(z));
    }
    this.u = {
      uTravel: { value: 0 }, uTime: { value: 0 }, uStride: { value: city.speed * city.T }, uFogDensity: { value: 0.00016 },
      uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color(1.6, 1.35, 1.05) }, uSky: { value: new THREE.Color(0.55, 0.65, 0.78) }, uFog: { value: new THREE.Color(0.75, 0.78, 0.8) },
      uHullMin: { value: new THREE.Vector3(HULL.x0, HULL.bottom - 10, HULL.z0) }, uHullMax: { value: new THREE.Vector3(HULL.x1, 120, HULL.z1) },
      uLegA: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLegB: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLegC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
      uFootOff: { value: new THREE.Vector4(0, 0, 0, 0) }, uFootX: { value: new THREE.Vector4(174, -174, -174, 174) }, uFootFront: { value: new THREE.Vector4() },
      uStill: { value: new THREE.Vector2(99999, 0) }, uStillR: { value: 260 }, uStillAmt: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, extensions: { derivatives: true } });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.mesh.position.y = GROUND_Y;
    game.engine.scene.add(this.mesh);
    // footprint offsets: world z of plants for each leg, derived from the gait
    this.footInit = false;
    this.buildRuins();
    this.buildClouds();
    this.buildBirds();
    this.settlement = null;
  }

  // ------------------------------------------------------------- ruins (world-anchored, recycled)
  buildRuins() {
    const r = rng(404), M = this.game.materials;
    this.span = 14000; // recycling span along z
    const items = [];
    // towns: clusters of broken buildings away from the trail
    for (let t = 0; t < 26; t++) {
      const side = r() < 0.5 ? -1 : 1;
      const cx = side * (420 + r() * 2600), cz = -this.span / 2 + r() * this.span;
      const n = 6 + Math.floor(r() * 18);
      for (let i = 0; i < n; i++) {
        const tall = r() < 0.25;
        items.push({ kind: 'bldg', x: cx + (r() - 0.5) * 260, z: cz + (r() - 0.5) * 260, w: 12 + r() * 26, d: 12 + r() * 26, h: tall ? 40 + r() * 70 : 6 + r() * 18, tilt: r() < 0.3 ? (r() - 0.5) * 0.4 : 0, ry: r() * Math.PI });
      }
    }
    // highway viaduct segments along x = -700, broken in places
    for (let z = -this.span / 2; z < this.span / 2; z += 60) {
      if (r() < 0.22) continue;
      items.push({ kind: 'deck', x: -700, z, w: 22, d: 58, h: 2.5, y: 26 - (r() < 0.1 ? r() * 20 : 0), tilt: r() < 0.08 ? 0.3 : 0, ry: 0 });
      items.push({ kind: 'pier', x: -700, z: z, w: 5, d: 5, h: 26, ry: 0 });
    }
    // power pylons marching across the land
    for (let z = -this.span / 2; z < this.span / 2; z += 320) items.push({ kind: 'pylon', x: 1700 + (r() - 0.5) * 80, z, w: 10, d: 10, h: 55, ry: 0.2, tilt: r() < 0.2 ? 0.25 : 0 });
    this.ruinItems = items;
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    this.ruins = new THREE.InstancedMesh(geo, M.concrete, items.length);
    this.ruins.frustumCulled = false;
    const c = new THREE.Color();
    items.forEach((it, i) => { c.setHSL(0.08, 0.06 + r() * 0.06, it.kind === 'pylon' ? 0.25 : 0.32 + r() * 0.2); this.ruins.setColorAt(i, c); });
    this.game.engine.worldRoot.add(this.ruins);
    // trees as instanced cones in forest-ish clumps
    const tgeo = new THREE.ConeGeometry(1, 1, 6); tgeo.translate(0, 0.5, 0);
    tgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(tgeo.attributes.position.count * 3).fill(1), 3));
    this.treeItems = [];
    for (let i = 0; i < 1400; i++) {
      const side = r() < 0.5 ? -1 : 1; const x = side * (320 + Math.pow(r(), 0.7) * 3000), z = -this.span / 2 + r() * this.span;
      this.treeItems.push({ x, z, s: 6 + r() * 9 });
    }
    this.trees = new THREE.InstancedMesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x2a3a20, roughness: 1 }), this.treeItems.length);
    this.trees.frustumCulled = false;
    this.treeItems.forEach((t, i) => { c.setHSL(0.25 + r() * 0.06, 0.3, 0.12 + r() * 0.08); this.trees.setColorAt(i, c); });
    this.game.engine.worldRoot.add(this.trees);
    this.layoutRuins(true);
  }
  layoutRuins(force = false) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const travel = this.city.travel; let changed = force;
    const gy = GROUND_Y;
    for (const it of this.ruinItems) {
      const sz = it.z + travel;
      if (sz > this.span / 2) { it.z -= this.span; changed = true; } else if (sz < -this.span / 2) { it.z += this.span; changed = true; }
    }
    for (const t of this.treeItems) { const sz = t.z + travel; if (sz > this.span / 2) { t.z -= this.span; changed = true; } }
    if (!changed) return;
    this.ruinItems.forEach((it, i) => {
      q.setFromEuler(e.set(it.tilt || 0, it.ry || 0, (it.tilt || 0) * 0.5));
      m.compose(new THREE.Vector3(it.x, gy + (it.y || 0) - (it.kind === 'bldg' ? 1 : 0), it.z), q, new THREE.Vector3(it.w, it.h, it.d));
      this.ruins.setMatrixAt(i, m);
    });
    this.ruins.instanceMatrix.needsUpdate = true;
    this.treeItems.forEach((t, i) => { m.compose(new THREE.Vector3(t.x, gy - 1, t.z), q.identity(), new THREE.Vector3(t.s * 0.45, t.s, t.s * 0.45)); this.trees.setMatrixAt(i, m); });
    this.trees.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------- low clouds (parallax sells the height and the motion)
  buildClouds() {
    const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      for (let i = 0; i < 40; i++) { const px = 40 + Math.random() * 176, py = 80 + Math.random() * 96, rr = 20 + Math.random() * 50; const g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    this.clouds = [];
    const r = rng(55);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xf4efe8, transparent: true, opacity: 0.7, depthWrite: false, fog: true }));
      const s = 400 + r() * 700; m.scale.set(s, s * 0.45, 1);
      m.position.set((r() - 0.5) * 7000, -150 + r() * 120 + (r() < 0.4 ? 400 : 0), -6000 + r() * 12000);
      this.game.engine.worldRoot.add(m); this.clouds.push(m);
    }
  }
  // ------------------------------------------------------------- birds circling the city
  buildBirds() {
    // gull silhouette: slim body, wings with an inner and outer panel (aWing: 0 body .. 1 tip);
    // the vertex shader flaps them per instance, gliding now and then
    const P = [], W = [];
    const tri = (a, b, c) => { for (const v of [a, b, c]) { P.push(v[0], v[1], v[2]); W.push(Math.min(1, Math.abs(v[0]) / 0.66)); } };
    tri([0, 0, 0.32], [-0.05, 0, -0.05], [0.05, 0, -0.05]); tri([-0.05, 0, -0.05], [0, 0, -0.3], [0.05, 0, -0.05]);
    tri([0.05, 0, -0.18], [0, 0, -0.32], [0.11, 0, -0.36]); tri([-0.05, 0, -0.18], [-0.11, 0, -0.36], [0, 0, -0.32]); // tail
    for (const sx of [-1, 1]) {
      const r0 = [sx * 0.04, 0, 0.08], r1 = [sx * 0.04, 0, -0.1], e0 = [sx * 0.34, 0.05, 0.04], e1 = [sx * 0.34, 0.05, -0.12], tip = [sx * 0.66, -0.02, -0.18];
      tri(r0, sx > 0 ? e0 : r1, sx > 0 ? r1 : e0); tri(r1, sx > 0 ? e0 : e1, sx > 0 ? e1 : e0); tri(e0, sx > 0 ? tip : e1, sx > 0 ? e1 : tip);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aWing', new THREE.Float32BufferAttribute(W, 1));
    g.computeVertexNormals();
    this.birdMat = new THREE.MeshLambertMaterial({ color: 0x4a4744, side: THREE.DoubleSide });
    this.birdTime = { value: 0 };
    this.birdMat.onBeforeCompile = (sh) => {
      sh.uniforms.uBirdT = this.birdTime;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aWing; uniform float uBirdT;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
          #else
            float ph = 0.0;
          #endif
          float flapOn = smoothstep(-0.2, 0.4, sin(uBirdT * 0.45 + ph * 1.7));
          float fl = sin(uBirdT * 7.5 + ph) * flapOn;
          transformed.y += (fl * 0.32 * aWing * aWing + 0.06 * aWing) * (1.0 - flapOn * 0.2);
          transformed.x *= 1.0 - abs(fl) * 0.08 * aWing;`);
    };
    this.birds = new THREE.InstancedMesh(g, this.birdMat, 36); this.birds.frustumCulled = false;
    this.birdData = []; const r = rng(8);
    for (let i = 0; i < 36; i++) this.birdData.push({ flock: i < 20 ? 0 : 1, a: r() * 6.28, r: 30 + r() * 25, y: (r() - 0.5) * 12, sp: 0.1 + r() * 0.05, ph: r() * 6 });
    this.game.engine.cityRoot.add(this.birds);
    this.birdCenters = [new THREE.Vector3(250, -40, -170), new THREE.Vector3(260, 30, -40)];
  }

  // ------------------------------------------------------------- Callow Reach
  buildSettlement() {
    const g = new THREE.Group(); g.name = 'callowReach';
    const b = new Builder(this.game, g, { cell: 500 });
    const r = rng(1919);
    const houses = [];
    // a crossroads with houses along two streets
    for (let i = 0; i < 16; i++) {
      const street = i % 2, along = -70 + Math.floor(i / 2) * 20 + r() * 4, off = (i % 4 < 2 ? -1 : 1) * (11 + r() * 3);
      const x = street ? along : off, z = street ? off : along;
      const w = 8 + r() * 4, d = 7 + r() * 4, h = 3.5 + r() * 2.5;
      const col = [0xc8b8a0, 0xa89880, 0xb0a088, 0x8a7a6a, 0xd0c8b0][i % 5];
      b.box('plaster', [x, h / 2, z], [w, h, d], { color: col, collide: false });
      b.box('rust', [x, h + 0.9, z], [w + 0.8, 1.8, d + 0.8], { color: [0x8a4a32, 0x5a4a3a, 0x6a6a6a][i % 3], collide: false, rz: (r() - 0.5) * 0.1 });
      b.box('wood', [x + (street ? 0 : -Math.sign(off) * (w / 2 + 0.02)), 1.1, z + (street ? -Math.sign(off) * (d / 2 + 0.02) : 0)], street ? [1.2, 2.2, 0.1] : [0.1, 2.2, 1.2], { color: 0x5a4030, collide: false });
      houses.push({ x, z });
    }
    // roads, square, water tower, greenhouse, fences, a tractor, washing lines
    b.box('concrete', [0, 0.05, 0], [8, 0.1, 170], { color: 0x6a6660, collide: false });
    b.box('concrete', [0, 0.05, 0], [170, 0.1, 8], { color: 0x6a6660, collide: false });
    b.box('concrete', [0, 0.08, 0], [22, 0.1, 22], { color: 0x7a7670, collide: false });
    b.cyl('rust', [26, 14, 26], 4.5, 6, { color: 0x8a6a50, seg: 16 });
    for (const [x, z] of [[23, 23], [29, 23], [23, 29], [29, 29]]) b.tube('darkSteel', [x, 0, z], [x, 11, z], 0.3);
    b.box('glass', [-28, 2, 30], [12, 4, 7], { collide: false });
    b.box('matte', [-28, 0.4, 30], [12.2, 0.8, 7.2], { color: 0x4a6a3a, collide: false });
    b.box('paint', [12, 1.2, -32], [3, 2, 5], { color: 0x9a3a2a, collide: false });
    b.cyl('rubber', [10.5, 1, -30.5], 1, 0.6, { rz: Math.PI / 2, color: 0x222222, seg: 12 });
    for (let i = -80; i < 80; i += 4) { b.box('wood', [-40, 0.6, i], [0.15, 1.2, 0.15], { color: 0x5a4a3a, collide: false }); }
    b.box('fabric', [16, 2.2, 10], [0.05, 0.8, 6], { color: 0xe8e0d0, collide: false });
    b.finalize();
    // the people of Callow Reach — caught mid-life
    this.stillPeople = [];
    const poses = [
      { x: 2, z: -12, yaw: 0.4, pose: 'walk' }, { x: -3, z: 6, yaw: 2.2, pose: 'reach' }, { x: 4, z: 4, yaw: -1.2, pose: 'carry' },
      { x: 18, z: 1, yaw: 1.7, pose: 'walk' }, { x: -16, z: -2, yaw: -1.5, pose: 'stand' }, { x: 1, z: 22, yaw: 3.0, pose: 'kneel' },
      { x: -6, z: -30, yaw: 0.1, pose: 'wave' }, { x: 10, z: 18, yaw: -2.6, pose: 'walk' }, { x: -2, z: 40, yaw: 3.1, pose: 'stand' },
      { x: 26, z: 20, yaw: -0.8, pose: 'reach' }, { x: -22, z: 28, yaw: 1.0, pose: 'kid' }, { x: 6, z: -46, yaw: 0.0, pose: 'walk' },
    ];
    poses.forEach((p, i) => {
      const a = new Actor(this.game, { look: randomLook(500 + i, { kid: p.pose === 'kid' }), pos: new THREE.Vector3(p.x, 0, p.z), yaw: p.yaw, parent: g });
      a.cull = 1e9; a.lodDist = 0; a.char.setLOD('low'); // seen from far through the visor
      if (p.pose === 'walk') { a.anim.speed = 1.4; a.anim.phase = r() * 6; }
      if (p.pose === 'reach') a.anim.point = 1;
      if (p.pose === 'carry') a.anim.carry = 1;
      if (p.pose === 'wave') a.anim.wave = 1;
      if (p.pose === 'kneel') a.pose('kneel');
      a.stillIndex = i;
      this.stillPeople.push(a);
    });
    // pose them for a moment, then freeze
    for (let k = 0; k < 20; k++) this.stillPeople.forEach(a => { a.anim.update(0.05); });
    this.stillPeople.forEach(a => { a.anim.setMode('freeze'); a.anim.speed = 0; a.char.mesh.castShadow = false; a.noShadow = true; a.char.setLOD('high'); });
    // motionless dust hanging in the air above the town
    const dustG = new THREE.BufferGeometry(); const dp = [];
    for (let i = 0; i < 400; i++) dp.push((r() - 0.5) * 120, r() * 25, (r() - 0.5) * 120);
    dustG.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
    const dust = new THREE.Points(dustG, new THREE.PointsMaterial({ color: 0xd8d8e0, size: 0.35, transparent: true, opacity: 0.7, sizeAttenuation: true }));
    g.add(dust);
    // birds frozen mid-flight
    const stillBirdMat = new THREE.MeshLambertMaterial({ color: 0x4a4744, side: THREE.DoubleSide }); // no flapping: they are still
    for (let i = 0; i < 9; i++) { const bm = new THREE.Mesh(this.birds.geometry, stillBirdMat); bm.position.set((r() - 0.5) * 60, 12 + r() * 14, (r() - 0.5) * 60); bm.rotation.set(0.3, r() * 6, (r() - 0.5) * 0.6); bm.scale.setScalar(0.7); g.add(bm); }
    this.settlement = g;
    g.visible = false;
    this.game.engine.worldRoot.add(g);
    return g;
  }
  // place the settlement at a city-frame position (it then scrolls with the ground)
  placeSettlement(sx, sz) {
    if (!this.settlement) this.buildSettlement();
    const travel = this.city.travel;
    this.settlement.position.set(sx, GROUND_Y + 1, sz - travel);
    this.settlement.visible = true;
    this.u.uStill.value.set(sx, sz - travel);
  }
  settlementCityPos() { const s = this.settlement; return s ? new THREE.Vector3(s.position.x, s.position.y, s.position.z + this.city.travel) : null; }

  update(dt) {
    const c = this.city, u = this.u;
    u.uTravel.value = c.travel; u.uTime.value += dt;
    this.mesh.position.y = GROUND_Y - c.bob;
    const sky = this.game.sky;
    if (sky) { u.uSun.value.copy(sky.sunDir); u.uFog.value.copy(sky.fogColor); u.uSunCol.value.copy(sky.sun.color).multiplyScalar(1.65); }
    // legs for shadows
    const ext = c.exterior;
    if (ext) ext.legs.forEach((leg, i) => {
      leg.thigh.updateMatrixWorld(true);
      u.uLegA.value[i].setFromMatrixPosition(leg.thigh.matrixWorld);
      u.uLegB.value[i].setFromMatrixPosition(leg.knee.matrixWorld);
      u.uLegC.value[i].copy(leg.foot.position);
    });
    // footprint lattice: world z where each leg last planted
    c.legStates.forEach((L, i) => {
      const p = (c.phase + L.off) % 1;
      const plantWorldZ = -(-L.hip.z + c.stride / 2) - (c.travel - c.speed * p * c.T); // world z when this foot last planted
      u.uFootOff.value.setComponent(i, plantWorldZ);
      u.uFootX.value.setComponent(i, L.hip.x);
      u.uFootFront.value.setComponent(i, -(-L.hip.z + c.stride / 2) + 0.0);
    });
    u.uStride.value = c.speed * c.T;
    this.ruinT = (this.ruinT || 0) + dt; if (this.ruinT > 1) { this.ruinT = 0; this.layoutRuins(); }
    for (const cl of this.clouds) { if (cl.position.z + c.travel > 6000) cl.position.z -= 12000; }
    // birds
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), t = this.game.time;
    this.birdTime.value = t;
    this.birdData.forEach((b, i) => {
      b.a += b.sp * dt;
      const C = this.birdCenters[b.flock];
      const x = C.x + Math.cos(b.a) * b.r, z = C.z + Math.sin(b.a) * b.r * 1.4, y = C.y + b.y + Math.sin(b.a * 3 + b.ph) * 3;
      // bank into the circle; flapping happens in the vertex shader
      q.setFromEuler(new THREE.Euler(0, -b.a, -0.35 + Math.sin(b.a * 2 + b.ph) * 0.1));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1.1, 1.1, 1.1));
      this.birds.setMatrixAt(i, m);
    });
    this.birds.instanceMatrix.needsUpdate = true;
  }
}
