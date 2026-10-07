import * as THREE from 'three';
import { toonMaterial } from '../gfx/Toon';

/** Material shim: standard-material options mapped onto the painted toon look. */
export function toonMat(o: { color?: THREE.ColorRepresentation; map?: THREE.Texture | null; emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; metalness?: number; side?: THREE.Side; transparent?: boolean; opacity?: number; roughness?: number; flatShading?: boolean } = {}): THREE.MeshToonMaterial {
  const m = toonMaterial({ color: o.color ?? '#ffffff', map: o.map ?? null, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity, metal: (o.metalness ?? 0) > 0.5, side: o.side });
  if (o.transparent) {
    m.transparent = true;
    m.opacity = o.opacity ?? 1;
  }
  return m;
}

/** Painted terrain ignores bitmap ground textures. */
export function groundTexture(..._a: unknown[]): undefined {
  return undefined;
}

export function panelTexture(..._a: unknown[]): undefined {
  return undefined;
}

/** Grass is streamed per chapter (Chapter.addGrass); these are inert. */
export function makeGrass(..._a: unknown[]): { mesh: THREE.Group; mat: THREE.Material } {
  return { mesh: new THREE.Group(), mat: new THREE.MeshBasicMaterial() };
}
export function updateGrass(..._a: unknown[]): void {}
