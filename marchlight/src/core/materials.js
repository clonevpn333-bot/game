// Material library built from procedural textures.
import * as THREE from 'three';
import { signTexture, radialTexture } from './textures.js';

export function buildMaterials(T) {
  const M = {};
  const std = (t, o = {}) => new THREE.MeshStandardMaterial({
    map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, metalnessMap: t.roughnessMap,
    roughness: 1, metalness: 1, vertexColors: true, ...o,
  });
  M.panel = std(T.panel, { normalScale: new THREE.Vector2(0.8, 0.8) });
  M.rust = std(T.rust);
  M.concrete = std(T.concrete);
  M.grate = std(T.grate, { alphaTest: 0.5, side: THREE.DoubleSide });
  M.tiles = std(T.tiles);
  M.wood = std(T.wood);
  M.plaster = std(T.plaster);
  M.fabric = std(T.fabric, { side: THREE.DoubleSide });
  M.hazard = std(T.hazard);
  M.facade = std(T.facade, { emissiveMap: T.facade.emissiveMap, emissive: new THREE.Color(1.6, 1.4, 1.1) });
  M.leaf = std(T.leaf, { alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0 });
  // Flat / untextured
  M.paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.2 });
  M.matte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  M.steel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.9 });
  M.darkSteel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.8, normalMap: T.panel.normalMap, normalScale: new THREE.Vector2(0.4, 0.4) });
  M.rubber = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  M.glass = new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25, depthWrite: false, envMapIntensity: 2 });
  M.glassDark = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.5 });
  M.cable = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.6, metalness: 0.4 });
  M.cableSteel = new THREE.MeshStandardMaterial({ color: 0x6c6c70, roughness: 0.4, metalness: 0.9 });
  // Emissives (bloom)
  const glow = (c, i = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: true, fog: true });
  M.lampWarm = glow(0xffc77a, 4); M.lampCool = glow(0xbfe3ff, 3.5); M.lampRed = glow(0xff3020, 4); M.lampGreen = glow(0x40ff90, 3);
  M.neonPink = glow(0xff4f9a, 4); M.neonCyan = glow(0x3fe8ff, 4); M.neonAmber = glow(0xffa630, 4); M.engineGlow = glow(0x6fd6ff, 6);
  M.tether = glow(0xffa040, 5); M.tetherCold = glow(0x60d8ff, 5);
  M.screen = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x58c8ff).multiplyScalar(1.6) });
  M.black = new THREE.MeshBasicMaterial({ color: 0x050505 });
  M.glowSprite = radialTexture(128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  M.sign = (text, color, opts = {}) => {
    const tex = signTexture(text, { color, ...opts });
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: new THREE.Color(1, 1, 1).multiplyScalar(opts.intensity ?? 2.6), depthWrite: false, side: THREE.DoubleSide, fog: true });
  };
  M.board = (text, opts = {}) => { // unlit painted signage
    const tex = signTexture(text, { glow: false, ...opts });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, transparent: !opts.bg, side: THREE.DoubleSide });
  };
  for (const k of ['panel', 'rust', 'concrete', 'grate', 'tiles', 'wood', 'plaster', 'fabric', 'hazard', 'facade', 'paint', 'matte', 'steel', 'darkSteel', 'rubber']) M[k].name = k;
  return M;
}
