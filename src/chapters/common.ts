import * as THREE from 'three';
import { createSeededRandom } from '../core/rng';
import { CloudBank } from '../render/Sky';
import { Tex } from '../render/Textures';
import type { Level } from '../game/Level';
import type { RigStyle } from '../entities/Rig';
import type { AudioPreset } from '../systems/Audio';
import { dreamify } from '../render/DreamShading';

/** Ring of soft billboard cloud banks to close the horizon (distant layer). */
export function cloudHorizon(
  lv: Level, cx: number, cz: number,
  o: { radius?: number; count?: number; y?: number; ySpread?: number; size?: number; lit?: string; shade?: string; seed?: number; opacity?: number } = {},
): CloudBank {
  const rnd = createSeededRandom(o.seed ?? 3);
  const puffs: Array<{ x: number; y: number; z: number; s: number }> = [];
  const R = o.radius ?? 320;
  const n = o.count ?? 260;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r = R * (0.75 + rnd() * 0.5);
    puffs.push({
      x: cx + Math.cos(a) * r,
      y: (o.y ?? -20) + (rnd() - 0.4) * (o.ySpread ?? 40),
      z: cz + Math.sin(a) * r,
      s: (o.size ?? 60) * (0.6 + rnd() * 0.9),
    });
  }
  // far → near so alpha blends sensibly from the play area
  puffs.sort((a, b) => Math.hypot(b.x - cx, b.z - cz) - Math.hypot(a.x - cx, a.z - cz));
  const bank = new CloudBank(puffs, o.lit, o.shade, o.opacity ?? 1);
  lv.root.add(bank.mesh);
  return bank;
}

/** Scattered billboard puffs inside a box (mid-distance cloud layers, cloud sea). */
export function cloudField(
  lv: Level, x0: number, x1: number, z0: number, z1: number, y: number,
  o: { count?: number; ySpread?: number; size?: number; lit?: string; shade?: string; seed?: number; opacity?: number; avoid?: (x: number, z: number) => boolean } = {},
): CloudBank {
  const rnd = createSeededRandom(o.seed ?? 11);
  const puffs: Array<{ x: number; y: number; z: number; s: number }> = [];
  const n = o.count ?? 120;
  let guard = 0;
  while (puffs.length < n && guard++ < n * 10) {
    const x = x0 + rnd() * (x1 - x0);
    const z = z0 + rnd() * (z1 - z0);
    if (o.avoid?.(x, z)) continue;
    puffs.push({ x, y: y + (rnd() - 0.5) * (o.ySpread ?? 6), z, s: (o.size ?? 18) * (0.6 + rnd() * 0.8) });
  }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  puffs.sort((a, b) => Math.hypot(b.x - cx, b.z - cz) - Math.hypot(a.x - cx, a.z - cz));
  const bank = new CloudBank(puffs, o.lit, o.shade, o.opacity ?? 1);
  lv.root.add(bank.mesh);
  return bank;
}

/** Huge pale moon / planet in the sky (unlit, fogged). */
export function skyOrb(lv: Level, x: number, y: number, z: number, r: number, color: string, ring = false): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 32),
    dreamify(new THREE.MeshBasicMaterial({ color: new THREE.Color(color) }), { rim: false, wobble: false }),
  );
  m.position.set(x, y, z);
  lv.root.add(m);
  if (ring) {
    const rg = new THREE.Mesh(
      new THREE.RingGeometry(r * 1.4, r * 2.1, 96),
      dreamify(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3), transparent: true, opacity: 0.45, side: THREE.DoubleSide }), { rim: false, wobble: false }),
    );
    rg.rotation.x = -1.2;
    rg.rotation.y = 0.3;
    m.add(rg);
  }
  return m;
}

/** Glowing painted sign (unlit plane). */
export function sign(lv: Level, text: string, x: number, y: number, z: number, w: number, h: number, ry = 0, o: { bg?: string; fg?: string; glow?: number; double?: boolean } = {}): THREE.Mesh {
  const tex = Tex.sign(text, { bg: o.bg, fg: o.fg, w: Math.round(256 * (w / h)), h: 256 });
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1).multiplyScalar(o.glow ?? 1.15), toneMapped: (o.glow ?? 1.15) <= 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide });
  dreamify(mat, { rim: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  lv.root.add(m);
  return m;
}

export const STYLES = {
  mabel: { headSize: 0.33, bodyW: 0.46, top: '#8fb6ff', topAccent: '#ffffff', bottom: '#5b6fc2', skin: '#ffe2cf', hair: '#d9a3ff', hat: 'bowler', hatColor: '#5b6fc2', face: 'simple', skirt: true, shoes: '#3b3f6b' } as RigStyle,
  elder: { scale: 0.92, headSize: 0.29, bodyW: 0.4, top: '#ffc2d6', topAccent: '#fff4ea', bottom: '#b88cc8', skin: '#f4d2bf', hair: '#f4f0f6', hat: 'none', face: 'simple', skirt: true, shoes: '#7a5c9e' } as RigStyle,
  shopkeeper: { scale: 1.05, headSize: 0.3, bodyW: 0.5, top: '#ffd8a8', topAccent: '#ffffff', bottom: '#9b7a5c', skin: '#e8b89a', hair: '#7a4a3a', hat: 'beanie', hatColor: '#ff9fb2', face: 'simple' } as RigStyle,
  commuter: { scale: 1.1, headSize: 0.25, bodyW: 0.36, legLen: 0.82, top: '#8c84b8', bottom: '#4b4670', skin: '#f2cdb8', hair: '#3a2f4a', hat: 'top', hatColor: '#3a2f4a', face: 'simple', umbrella: '#ffb8d6', briefcase: false } as RigStyle,
  kid: (c: string, h: string) => ({ scale: 0.68, headSize: 0.32, bodyW: 0.34, top: c, bottom: '#6a7ac8', skin: '#ffdcc8', hair: h, face: 'simple', hat: 'none' }) as RigStyle,
  clerk: { scale: 1.12, headSize: 0.27, bodyW: 0.38, legLen: 0.8, top: '#5a2a52', topAccent: '#e8c27a', bottom: '#3a1a36', skin: '#fdf6ee', hair: '#2a1a2e', hat: 'bowler', hatColor: '#2a1a2e', face: 'mask', maskColor: '#fdf6ee' } as RigStyle,
  worker: (c: string) => ({ scale: 1.0, headSize: 0.27, top: c, bottom: '#4a4a5e', skin: '#f0cdb8', hair: '#4a3a3a', hat: 'beanie', hatColor: '#ffb05a', face: 'simple' }) as RigStyle,
};

/** Build an AudioPreset with sensible defaults. */
export function audio(p: Partial<AudioPreset> & { chords: number[][] }): AudioPreset {
  return {
    chordDur: 5,
    padType: 'sine',
    padGain: 0.9,
    bellGain: 0.8,
    arpEvery: 0.7,
    wobble: 0.02,
    pitch: 1,
    lowpass: 3600,
    reverb: 0.55,
    ...p,
  };
}

/** Hot-air-balloon / lantern drifter for the extended layer (animated group). */
export function balloon(lv: Level, x: number, y: number, z: number, color: string, s = 1): THREE.Group {
  const g = new THREE.Group();
  const env = new THREE.Mesh(new THREE.SphereGeometry(2.2 * s, 18, 14), solidMat(color, 0.45));
  env.scale.y = 1.15;
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * s, 0.5 * s, 0.7 * s, 10), solidMat('#c99a6b', 0.9));
  basket.position.y = -3.4 * s;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3 * s, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.2), toneMapped: false }));
  glow.position.y = -2.4 * s;
  g.add(env, basket, glow);
  g.position.set(x, y, z);
  lv.root.add(g);
  return g;
}

/** A plain coloured dream-shaded material (for animated, non-batched meshes). */
export function solidMat(color: string, roughness = 0.7, o: { emissive?: string; emissiveIntensity?: number; metalness?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshStandardMaterial {
  return dreamify(new THREE.MeshStandardMaterial({
    color, roughness, metalness: o.metalness ?? 0,
    emissive: o.emissive ?? '#000000', emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: o.transparent ?? false, opacity: o.opacity ?? 1,
  }));
}

/** Unlit glowing material (feeds bloom). */
export function glowMat(color: string, k = 2.2): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
}
