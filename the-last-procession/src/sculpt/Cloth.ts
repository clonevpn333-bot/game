import * as THREE from 'three';
import type { Material } from './Sculpt';

/**
 * Thin, double-sided cloth geometry (skirts, robes, capes, scarves) built with
 * the same vertex attributes as sculpted bodies so it merges into one draw
 * call. Skin weights blend smoothly between bones along the fabric, so hems
 * follow the legs and capes bend over their simulated chains.
 */

type V = [number, number, number];

interface Out {
  pos: number[];
  nor: number[];
  col: number[];
  surf: number[];
  tint: number[];
  ink: number[];
  si: number[];
  sw: number[];
  idx: number[];
}

function newOut(): Out {
  return { pos: [], nor: [], col: [], surf: [], tint: [], ink: [], si: [], sw: [], idx: [] };
}

function pushVert(o: Out, p: THREE.Vector3, n: THREE.Vector3, m: Material, c: THREE.Color, w: [number, number][]): void {
  o.pos.push(p.x, p.y, p.z);
  o.nor.push(n.x, n.y, n.z);
  o.col.push(c.r, c.g, c.b);
  o.surf.push(m.rough ?? 0.85, m.metal ?? 0, m.sss ?? 0, m.glow ?? 0);
  o.tint.push(m.tint ?? 0);
  o.ink.push(0);
  const top = w.filter((x) => x[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tot = top.reduce((s, x) => s + x[1], 0) || 1;
  for (let k = 0; k < 4; k++) {
    o.si.push(top[k] ? top[k][0] : 0);
    o.sw.push(top[k] ? top[k][1] / tot : 0);
  }
}

function finish(o: Out): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
  g.setAttribute('surf', new THREE.Float32BufferAttribute(o.surf, 4));
  g.setAttribute('tint', new THREE.Float32BufferAttribute(o.tint, 1));
  g.setAttribute('ink', new THREE.Float32BufferAttribute(o.ink, 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(o.si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(o.sw, 4));
  g.setIndex(o.idx);
  return g;
}

const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export interface SkirtOpts {
  yTop: number;
  yHem: number;
  rTop: number;
  rHem: number;
  /** front/back squash of the cross-section */
  depth?: number;
  zOff?: number;
  mat: Material;
  /** optional trim band at the hem */
  hemMat?: Material;
  folds?: number; // vertical fold count
  foldDepth?: number;
}

/** Tapered tube from waist to hem with soft folds; follows hips → thighs → shins. */
export function skirt(o: SkirtOpts, bones: Map<string, number>): THREE.BufferGeometry {
  const out = newOut();
  const segA = 40;
  const segY = 14;
  const depth = o.depth ?? 0.82;
  const folds = o.folds ?? 9;
  const fd = o.foldDepth ?? 0.01;
  const col = new THREE.Color(o.mat.color);
  const hemCol = o.hemMat ? new THREE.Color(o.hemMat.color) : col;
  const B = (n: string) => bones.get(n) ?? 0;
  const ring = (inner: boolean) => {
    const base = out.pos.length / 3;
    for (let j = 0; j <= segY; j++) {
      const v = j / segY;
      const y = o.yTop + (o.yHem - o.yTop) * v;
      const r0 = o.rTop + (o.rHem - o.rTop) * Math.pow(v, 0.85);
      for (let i = 0; i <= segA; i++) {
        const a = (i / segA) * Math.PI * 2;
        const fold = Math.sin(a * folds) * fd * v;
        const r = r0 + fold - (inner ? 0.008 : 0);
        const x = Math.sin(a) * r;
        const z = Math.cos(a) * r * depth + (o.zOff ?? 0);
        const p = new THREE.Vector3(x, y, z);
        const n = new THREE.Vector3(Math.sin(a), (o.rHem - o.rTop) / Math.abs(o.yTop - o.yHem) * 0.5, Math.cos(a) / depth).normalize();
        if (inner) n.negate();
        // weights: hips at the waist → legs below; long robes hand over to the shins
        const side = ss(-0.45, 0.45, Math.sin(a));
        const hipW = 1 - ss(0.05, 0.55, v);
        const legW = 1 - hipW;
        const shinW = ss(0.5, 0.48, y) > 0 ? 0 : ss(0.52, 0.32, y);
        const thighW = legW * (1 - shinW);
        const w: [number, number][] = [
          [B('hips'), hipW],
          [B('thigh.L'), thighW * side],
          [B('thigh.R'), thighW * (1 - side)],
          [B('shin.L'), legW * shinW * side],
          [B('shin.R'), legW * shinW * (1 - side)],
        ];
        const isHem = o.hemMat && v > 0.92;
        pushVert(out, p, n, isHem ? o.hemMat! : o.mat, isHem ? hemCol : col, w);
      }
    }
    for (let j = 0; j < segY; j++) {
      for (let i = 0; i < segA; i++) {
        const a = base + j * (segA + 1) + i;
        const b = a + segA + 1;
        if (inner) out.idx.push(a, a + 1, b, b, a + 1, b + 1);
        else out.idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  };
  ring(false);
  ring(true);
  return finish(out);
}

export interface RibbonOpts {
  /** centreline points from attachment to tip */
  pts: V[];
  widths: number[];
  /** bone owning each point (blended between neighbours) */
  bones: string[];
  mat: Material;
  edgeMat?: Material;
  /** sideways axis of the ribbon at rest */
  side?: V;
  thickness?: number;
}

/** Flat double-sided strip (cape, scarf tail, banner) skinned along a bone chain. */
export function ribbon(o: RibbonOpts, bones: Map<string, number>): THREE.BufferGeometry {
  const out = newOut();
  const across = 6;
  const side = new THREE.Vector3(...(o.side ?? [1, 0, 0])).normalize();
  const col = new THREE.Color(o.mat.color);
  const edgeCol = o.edgeMat ? new THREE.Color(o.edgeMat.color) : col;
  const pts = o.pts.map((p) => new THREE.Vector3(...p));
  const th = o.thickness ?? 0.006;
  const along = 6;
  const samples: { p: THREE.Vector3; w: number; t: THREE.Vector3; bw: [number, number][] }[] = [];
  for (let s = 0; s < pts.length - 1; s++) {
    for (let k = 0; k < along; k++) {
      const f = k / along;
      const p = pts[s].clone().lerp(pts[s + 1], f);
      const w = o.widths[s] + (o.widths[s + 1] - o.widths[s]) * f;
      const t = pts[s + 1].clone().sub(pts[s]).normalize();
      const b0 = bones.get(o.bones[s]) ?? 0;
      const b1 = bones.get(o.bones[Math.min(o.bones.length - 1, s + 1)]) ?? b0;
      const blend = ss(0.4, 1, f);
      samples.push({ p, w, t, bw: [[b0, 1 - blend], [b1, blend]] });
    }
  }
  const last = pts.length - 1;
  samples.push({ p: pts[last], w: o.widths[last], t: pts[last].clone().sub(pts[last - 1]).normalize(), bw: [[bones.get(o.bones[o.bones.length - 1]) ?? 0, 1]] });
  for (const face of [1, -1]) {
    const base = out.pos.length / 3;
    for (const sm of samples) {
      const n = side.clone().cross(sm.t).normalize().multiplyScalar(face);
      for (let i = 0; i <= across; i++) {
        const u = i / across - 0.5;
        const curve = (u * u - 0.25) * sm.w * 0.25; // slight cupping
        const p = sm.p.clone().addScaledVector(side, u * sm.w).addScaledVector(n, curve * face + th * face);
        const edge = o.edgeMat && Math.abs(u) > 0.42;
        pushVert(out, p, n, edge ? o.edgeMat! : o.mat, edge ? edgeCol : col, sm.bw);
      }
    }
    for (let j = 0; j < samples.length - 1; j++) {
      for (let i = 0; i < across; i++) {
        const a = base + j * (across + 1) + i;
        const b = a + across + 1;
        if (face > 0) out.idx.push(a, a + 1, b, b, a + 1, b + 1);
        else out.idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  return finish(out);
}
