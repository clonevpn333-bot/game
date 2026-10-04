import * as THREE from 'three';
import { G } from '../render/Globals';
import { coneMaterial } from '../render/Materials';

/** The Orpheus Structure: older than the rock around it, it answers to memory. */
export function orpheusStructure(scale = 1): { group: THREE.Group; rings: THREE.Object3D[]; core: THREE.Mesh; mat: THREE.MeshPhysicalMaterial; beam: THREE.Mesh } {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x040406, roughness: 0.15, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2.2 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = G.uTime;
    s.uniforms.uPulse = { value: 0.3 };
    mat.userData.shader = s;
    s.vertexShader = 'varying vec3 vOP;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
    s.fragmentShader = 'uniform float uTime;\nuniform float uPulse;\nvarying vec3 vOP;\n' + s.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       // glyph lines: non-human, irregular, crawling upward
       vec3 p = vOP * 1.3;
       float a = atan(p.z, p.x);
       float l1 = abs(fract(p.y * 0.9 + sin(a * 5.0) * 0.18 - uTime * 0.05) - 0.5);
       float l2 = abs(fract(a * 3.0 / 6.2831 + p.y * 0.21) - 0.5);
       float line = smoothstep(0.03, 0.0, min(l1, l2 * 0.6));
       float flick = 0.6 + 0.4 * sin(uTime * 1.7 + p.y * 2.0);
       totalEmissiveRadiance += vec3(0.65, 0.45, 1.0) * line * flick * (0.6 + uPulse * 3.0);`,
    );
  };
  mat.customProgramCacheKey = () => 'orpheus';
  // twisted monolith: star cross-section lofted with twist
  const segs = 64;
  const height = 26 * scale;
  const shape: THREE.Vector2[] = [];
  const pts = 7;
  for (let i = 0; i < pts * 2; i++) {
    const r = (i % 2 ? 1.2 : 3.2) * scale;
    const a = (i / (pts * 2)) * Math.PI * 2;
    shape.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const geo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const idx: number[] = [];
  const n = shape.length;
  for (let j = 0; j <= segs; j++) {
    const t = j / segs;
    const y = t * height;
    const tw = t * Math.PI * 1.4;
    const sc = 1 - Math.pow(t, 2.5) * 0.85 + Math.sin(t * Math.PI) * 0.15;
    for (let i = 0; i < n; i++) {
      const p = shape[i];
      const x = (p.x * Math.cos(tw) - p.y * Math.sin(tw)) * sc;
      const z = (p.x * Math.sin(tw) + p.y * Math.cos(tw)) * sc;
      verts.push(x, y, z);
    }
  }
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * n + i;
      const b = j * n + ((i + 1) % n);
      const c = (j + 1) * n + i;
      const d = (j + 1) * n + ((i + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const core = new THREE.Mesh(geo, mat);
  core.castShadow = true;
  g.add(core);
  // floating rings
  const rings: THREE.Object3D[] = [];
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry((6 + i * 2.2) * scale, 0.18 * scale, 8, 96), mat);
    r.position.y = (6 + i * 3.5) * scale;
    r.rotation.x = Math.PI / 2 + (i % 2 ? 0.2 : -0.15);
    rings.push(r);
    g.add(r);
  }
  // shards orbiting
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Mesh(new THREE.OctahedronGeometry((0.3 + (i % 4) * 0.25) * scale, 0), mat);
    const a = i * 2.4;
    const rr = (9 + (i % 7) * 1.6) * scale;
    s.position.set(Math.cos(a) * rr, (2 + (i % 9) * 2.5) * scale, Math.sin(a) * rr);
    s.userData.orbit = { a, rr, y: s.position.y, sp: 0.05 + (i % 5) * 0.02 };
    rings.push(s);
    g.add(s);
  }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.5 * scale, 4 * scale, 200, 24, 1, true), coneMaterial('#b8a0ff', 0.0));
  beam.position.y = 100;
  beam.rotation.x = Math.PI;
  g.add(beam);
  return { group: g, rings, core, mat, beam };
}

export function animateOrpheus(o: ReturnType<typeof orpheusStructure>, dt: number, t: number, pulse: number): void {
  o.rings.forEach((r, i) => {
    const ob = r.userData.orbit as { a: number; rr: number; y: number; sp: number } | undefined;
    if (ob) {
      ob.a += dt * ob.sp * (1 + pulse * 3);
      r.position.set(Math.cos(ob.a) * ob.rr, ob.y + Math.sin(t + i) * 0.4, Math.sin(ob.a) * ob.rr);
      r.rotation.x += dt * 0.3;
      r.rotation.y += dt * 0.4;
    } else {
      r.rotation.z += dt * (0.05 + i * 0.02) * (i % 2 ? 1 : -1) * (1 + pulse * 4);
    }
  });
  const sh = o.mat.userData.shader as { uniforms: { uPulse: { value: number } } } | undefined;
  if (sh) sh.uniforms.uPulse.value = pulse;
  (o.beam.material as THREE.ShaderMaterial).uniforms.uInt.value = pulse * 0.4;
}
