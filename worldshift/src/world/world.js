// World orchestration: far LOD skyline, far terrain/forest, water and era
// visibility. Near detail lives in ChunkManager.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { buildFarLod, buildFarTerrain, buildFarForest } from './chunks.js';
import { WATER_Y, HALF } from './layout.js';
import { GU, EU, patchActorMaterial } from './materials.js';
import { LAYER as L } from './textures.js';

function makeWaterMaterial(era) {
  const cols = ['#24434a', '#14232e', '#1d4a48'];
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(cols[era]), roughness: 0.06, metalness: 0.15, transparent: true, opacity: 0.92 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTimeW = GU.uTime;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTimeW;')
      .replace('#include <normal_fragment_maps>', `
        {
          vec2 wp = vWsPos.xz;
          float t = uTimeW;
          vec2 g = vec2(0.0);
          g += vec2(cos(wp.x * 0.31 + t * 1.1), cos(wp.y * 0.27 - t * 0.9)) * 0.05;
          g += vec2(cos(dot(wp, vec2(0.71, 0.53)) * 0.9 + t * 1.7)) * vec2(0.71, 0.53) * 0.05;
          g += vec2(cos(dot(wp, vec2(-0.4, 0.9)) * 2.1 - t * 2.3)) * vec2(-0.4, 0.9) * 0.03;
          g += vec2(cos(dot(wp, vec2(0.9, -0.2)) * 4.3 + t * 3.1)) * vec2(0.9, -0.2) * 0.015;
          vec3 nW = normalize(vec3(-g.x, 1.0, -g.y));
          normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
        }`);
  };
  m.customProgramCacheKey = () => 'ws-water';
  patchActorMaterial(m, era);
  return m;
}

export class World {
  constructor(scene, mats) {
    this.scene = scene;
    this.mats = mats;
    this.eraGroups = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    for (const g of this.eraGroups) scene.add(g);
    this.far = [null, null, null];
    this.farDirty = [false, false, false];
    this.farTimer = 0;
  }

  build(onProgress) {
    for (let e = 0; e < 3; e++) {
      // far city skyline
      this._buildFar(e);
      // far terrain
      const tg = buildFarTerrain(e);
      const tm = new THREE.Mesh(tg, this.mats.sets[e].terrain);
      tm.receiveShadow = true;
      tm.matrixAutoUpdate = false;
      this.eraGroups[e].add(tm);
      // far forest (instanced)
      this._buildForest(e);
      // water
      const wg = new THREE.PlaneGeometry(HALF * 2 + 2400, HALF * 2 + 2400, 1, 1);
      wg.rotateX(-Math.PI / 2);
      const w = new THREE.Mesh(wg, makeWaterMaterial(e));
      w.position.y = WATER_Y[e];
      w.renderOrder = 1;
      w.receiveShadow = true;
      this.eraGroups[e].add(w);
      onProgress && onProgress((e + 1) / 3);
    }
  }

  _buildFar(e) {
    const old = this.far[e];
    const g = buildFarLod(e, G.chronicle);
    const m = new THREE.Mesh(g, this.mats.sets[e].far);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = false;
    this.eraGroups[e].add(m);
    this.far[e] = m;
    if (old) { this.eraGroups[e].remove(old); old.geometry.dispose(); }
  }

  _buildForest(e) {
    const pts = buildFarForest(e);
    // simple tree: trunk + two stacked cones, baked aMat + colour
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 3, 5);
    trunk.translate(0, 1.5, 0);
    const c1 = new THREE.ConeGeometry(2.8, 6, 7);
    c1.translate(0, 5.5, 0);
    const c2 = new THREE.ConeGeometry(2.0, 4.5, 7);
    c2.translate(0, 8.2, 0);
    const parts = [[trunk, [0.45, 0.36, 0.28], L.bark], [c1, era2(e) ? [0.32, 0.5, 0.26] : [0.24, 0.38, 0.22], L.moss], [c2, era2(e) ? [0.36, 0.54, 0.28] : [0.27, 0.42, 0.24], L.moss]];
    const geos = parts.map(([g, col, layer]) => {
      const n = g.attributes.position.count;
      const c = new Float32Array(n * 3), am = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { c.set(col, i * 3); am.set([layer, -1, 0, 0], i * 4); }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.setAttribute('aMat', new THREE.BufferAttribute(am, 4));
      return g.index ? g.toNonIndexed() : g;
    });
    const merged = mergeSimple(geos);
    const im = new THREE.InstancedMesh(merged, this.mats.sets[e].far, pts.length);
    const ch = new Float32Array(pts.length * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    pts.forEach((pt, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pt[6] * 6.28);
      s.set(pt[3], pt[3] * (0.9 + pt[6] * 0.4), pt[3]);
      p.set(pt[0], pt[1], pt[2]);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
      ch[i * 2] = pt[4]; ch[i * 2 + 1] = pt[5];
    });
    im.geometry.setAttribute('aChunk', new THREE.InstancedBufferAttribute(ch, 2));
    im.frustumCulled = false;
    im.castShadow = false;
    this.eraGroups[e].add(im);
  }

  setEraVisible(list) {
    this.eraGroups.forEach((g, i) => { g.visible = !this.hidden && list.includes(i); });
  }

  onFactChanged(id, era) {
    for (let e = era; e < 3; e++) this.farDirty[e] = true;
  }

  update(dt) {
    if (this.farDirty.some((d) => d)) {
      this.farTimer -= dt;
      if (this.farTimer <= 0) {
        for (let e = 0; e < 3; e++) if (this.farDirty[e]) { this._buildFar(e); this.farDirty[e] = false; break; }
        this.farTimer = 0.25;
      }
    }
  }
}

function era2(e) { return e === 2; }

function mergeSimple(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color', 'aMat']) {
    const size = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(n * size);
    let o = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

export { EU };
