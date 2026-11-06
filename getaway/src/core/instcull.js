// GETAWAY! — per-instance culling for the big static instanced batches (props, trees, signal poles). Three.js culls an
// InstancedMesh as a whole, so a 400 m chunk of 300 trees was drawn in full even if one tree was on screen. A few
// times a second (or when the camera moves / turns) this keeps only the instances that are near enough and inside
// a padded view frustum, packed to the front of the instance buffer. An empty batch issues no draw call at all.
import * as THREE from 'three';
import { G } from './context.js';

const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _s = new THREE.Sphere(), _d = new THREE.Vector3();
export class InstanceCuller {
  constructor() { this.items = []; this.t = 0; this.lastPos = new THREE.Vector3(1e9, 0, 0); this.lastDir = new THREE.Vector3(); this.scale = 1; }
  // im: InstancedMesh (already filled); maxD: draw distance; r: rough instance radius; linked: meshes sharing the same indices (glow parts)
  add(im, maxD, r = 3, linked = []) {
    const n = im.count; if (!n) return; const src = im.instanceMatrix.array.slice(0, n * 16); const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = src[i * 16 + 12]; pos[i * 3 + 1] = src[i * 16 + 13]; pos[i * 3 + 2] = src[i * 16 + 14]; }
    const it = { im, n, src, pos, maxD, r, hidden: new Uint8Array(n), col: im.instanceColor ? im.instanceColor.array.slice(0, n * 3) : null, linked: linked.filter(Boolean).map((l) => ({ im: l, src: l.instanceMatrix.array.slice(0, n * 16), col: l.instanceColor ? l.instanceColor.array.slice(0, n * 3) : null })) };
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.items.push(it); this.byMesh = this.byMesh || new Map(); this.byMesh.set(im, it); this.dirty = true; return it;
  }
  // a prop got knocked over: never draw that instance again
  hide(im, i) { const it = this.byMesh && this.byMesh.get(im); if (!it) return false; it.hidden[i] = 1; this.dirty = true; return true; }
  update(dt) {
    const cam = G.camera; if (!cam || !this.items.length) return; this.t -= dt; const p = cam.position; cam.getWorldDirection(_d);
    const moved = p.distanceToSquared(this.lastPos) > 36 || _d.dot(this.lastDir) < 0.985; if (!this.dirty && !moved && this.t > 0) return;
    this.t = 0.3; this.dirty = false; this.lastPos.copy(p); this.lastDir.copy(_d);
    cam.updateMatrixWorld(); _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _f.setFromProjectionMatrix(_pm);
    const k = this.scale; const px = p.x, py = p.y, pz = p.z;
    for (const it of this.items) {
      const md = it.maxD * k, md2 = md * md; const dst = it.im.instanceMatrix.array; const dc = it.col && it.im.instanceColor ? it.im.instanceColor.array : null; let c = 0;
      for (let i = 0; i < it.n; i++) { if (it.hidden[i]) continue; const x = it.pos[i * 3], y = it.pos[i * 3 + 1], z = it.pos[i * 3 + 2]; const dx = x - px, dy = y - py, dz = z - pz; const d2 = dx * dx + dy * dy + dz * dz; if (d2 > md2) continue;
        if (d2 > 400) { _s.center.set(x, y, z); _s.radius = it.r + 6 + Math.sqrt(d2) * 0.04; if (!_f.intersectsSphere(_s)) continue; } // padded so turning doesn't pop
        { for (let q = 0; q < 16; q++) dst[c * 16 + q] = it.src[i * 16 + q]; if (dc) { dc[c * 3] = it.col[i * 3]; dc[c * 3 + 1] = it.col[i * 3 + 1]; dc[c * 3 + 2] = it.col[i * 3 + 2]; }
          for (const l of it.linked) { const ld = l.im.instanceMatrix.array; for (let q = 0; q < 16; q++) ld[c * 16 + q] = l.src[i * 16 + q]; if (l.col && l.im.instanceColor) { const lc = l.im.instanceColor.array; lc[c * 3] = l.col[i * 3]; lc[c * 3 + 1] = l.col[i * 3 + 1]; lc[c * 3 + 2] = l.col[i * 3 + 2]; } } }
        c++; }
      it.im.count = c; it.im.instanceMatrix.needsUpdate = true; if (dc) it.im.instanceColor.needsUpdate = true;
      for (const l of it.linked) { l.im.count = c; l.im.instanceMatrix.needsUpdate = true; if (l.col && l.im.instanceColor) l.im.instanceColor.needsUpdate = true; }
    }
  }
}

// dissolve objects over the last quarter of their draw distance (screen-door dither: no sorting, no transparency
// cost) so culled props / trees never visibly pop in or out. Works for instanced and plain meshes.
export function addDistanceFade(mat, end) {
  const u = { value: new THREE.Vector2(end * 0.74, end) }; mat.userData.fade = u;
  mat.onBeforeCompile = (sh) => { sh.uniforms.uFade = u;
    sh.vertexShader = 'varying float vFadeD;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_INSTANCING
        vFadeD = distance((modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
      #else
        vFadeD = distance((modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz, cameraPosition);
      #endif`);
    sh.fragmentShader = 'varying float vFadeD; uniform vec2 uFade;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      { float fk = 1.0 - smoothstep(uFade.x, uFade.y, vFadeD); if (fk < 0.999) { float dn = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))); if (fk <= dn) discard; } }`); };
  mat.customProgramCacheKey = () => 'distFade1:' + mat.type; return u;
}
