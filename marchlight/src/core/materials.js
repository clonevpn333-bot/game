// Material library built from procedural textures.
import * as THREE from 'three';
import { signTexture, radialTexture } from './textures.js';

// World-surface enhancer: macro colour variation, anti-tiling, rain streaks on walls,
// roughness breakup. Applied to every authored-geometry material.
const ENH_VS = `
  varying vec3 vWPos; varying vec3 vWNrm;`;
const ENH_FS = `
  varying vec3 vWPos; varying vec3 vWNrm;
  float eh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float en(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(eh(i), eh(i+vec2(1,0)), f.x), mix(eh(i+vec2(0,1)), eh(i+vec2(1,1)), f.x), f.y); }
  float efbm(vec2 p){ return en(p) * 0.5 + en(p * 2.1) * 0.3 + en(p * 4.3) * 0.2; }`;
function enhance(m, { streaks = true, antiTile = true, macro = 0.28 } = {}) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + ENH_VS)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + ENH_FS)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 mp = vWPos.xz * 0.045 + vWPos.y * vec2(0.031, 0.017);
          float macroN = efbm(mp);
          diffuseColor.rgb *= 1.0 - ${macro.toFixed(3)} * 0.5 + macroN * ${macro.toFixed(3)};
          ${antiTile ? `#ifdef USE_MAP
            vec4 lowF = texture2D(map, vMapUv * 0.173 + vec2(0.31, 0.17));
            diffuseColor.rgb *= mix(1.0, dot(lowF.rgb, vec3(0.33)) * 1.7, 0.3);
          #endif` : ''}
          ${streaks ? `float vert = 1.0 - smoothstep(0.25, 0.6, abs(vWNrm.y));
            float st = smoothstep(0.55, 0.95, en(vec2((vWPos.x + vWPos.z) * 2.7, vWPos.y * 0.22))) * en(vec2((vWPos.x - vWPos.z) * 0.6, vWPos.y * 0.05));
            diffuseColor.rgb *= 1.0 - vert * st * 0.28;` : ''}
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (0.82 + efbm(vWPos.xz * 0.21 + 3.0) * 0.36), 0.04, 1.0);`);
  };
  m.customProgramCacheKey = () => 'enh' + (streaks ? 1 : 0) + (antiTile ? 1 : 0) + macro;
  return m;
}

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
  M.brick = std(T.brick);
  M.corrugated = std(T.corrugated, { side: THREE.DoubleSide });
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
  for (const k of ['panel', 'rust', 'concrete', 'grate', 'tiles', 'wood', 'plaster', 'fabric', 'hazard', 'facade', 'paint', 'matte', 'steel', 'darkSteel', 'rubber', 'brick', 'corrugated']) M[k].name = k;
  for (const k of ['panel', 'rust', 'concrete', 'plaster', 'brick', 'corrugated', 'darkSteel']) enhance(M[k]);
  for (const k of ['tiles', 'wood', 'hazard', 'paint', 'steel']) enhance(M[k], { streaks: false, macro: 0.18 });
  enhance(M.facade, { streaks: true, antiTile: false, macro: 0.2 });
  return M;
}
