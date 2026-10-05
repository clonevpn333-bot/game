import * as THREE from 'three';
import { Tex } from './Textures';

/** Shared uniforms for every material carrying the retro vertex wobble. */
export const RetroUniforms = {
  uSnap: { value: new THREE.Vector2(320, 180) },
  uWobble: { value: 1 },
};

/**
 * A subtle PS1-era vertex snap: clip-space positions are quantised to a coarse grid, so
 * silhouettes shimmer very slightly as they move. Only applied to characters and props.
 */
export function retro<T extends THREE.Material>(material: T, key = 'retro'): T {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uSnap = RetroUniforms.uSnap;
    shader.uniforms.uWobble = RetroUniforms.uWobble;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uSnap;\nuniform float uWobble;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         if (uWobble > 0.5) {
           vec4 sp = gl_Position;
           sp.xy = floor(sp.xy / sp.w * uSnap + 0.5) / uSnap * sp.w;
           gl_Position = sp;
         }`,
      );
  };
  const prevKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${prevKey()}|${key}`;
  return material;
}

function repeatTex(t: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

/** Material roles shared across the whole chapter. */
export class MaterialLibrary {
  // Characters (retro wobble, stylized: smooth shading for cloth, flat for plate edges handled in geometry).
  readonly plate = retro(std({ map: Tex.armor(), color: '#b7bcc6', metalness: 0.78, roughness: 0.42 }));
  readonly plateDark = retro(std({ map: Tex.armor(), color: '#5d6068', metalness: 0.7, roughness: 0.5 }));
  readonly plateGold = retro(std({ map: Tex.armor(), color: '#c39a4c', metalness: 0.85, roughness: 0.35 }));
  readonly mail = retro(std({ map: repeatTex(Tex.chainmail(), 3, 3), color: '#c8ccd4', metalness: 0.6, roughness: 0.55 }));
  readonly leather = retro(std({ map: Tex.leather(), color: '#c8a888', roughness: 0.82 }));
  readonly leatherDark = retro(std({ map: Tex.leather(), color: '#6a5444', roughness: 0.85 }));
  readonly cloak = retro(
    std({ map: Tex.cloth(92, 26, 24, 'cloak'), color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide }),
  );
  readonly tabard = retro(std({ map: Tex.sigil(), roughness: 0.9, side: THREE.DoubleSide }));
  readonly steel = retro(std({ color: '#d8dde6', metalness: 0.95, roughness: 0.22 }));
  readonly steelEdge = retro(std({ color: '#f2f5fa', metalness: 1, roughness: 0.12, emissive: '#1a2230', emissiveIntensity: 0.4 }));
  readonly gold = retro(std({ color: '#d0a050', metalness: 0.9, roughness: 0.3 }));
  readonly skin = retro(std({ color: '#c99878', roughness: 0.8 }));
  readonly visorDark = retro(std({ color: '#050506', roughness: 1 }));
  readonly robeBrown = retro(std({ map: Tex.cloth(86, 66, 48, 'robeBrown'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly robeGrey = retro(std({ map: Tex.cloth(70, 72, 80, 'robeGrey'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly robeGreen = retro(std({ map: Tex.cloth(46, 66, 44, 'robeGreen'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly robeRed = retro(std({ map: Tex.cloth(110, 40, 36, 'robeRed'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly robeBlack = retro(std({ map: Tex.cloth(30, 28, 32, 'robeBlack'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly robeWhite = retro(std({ map: Tex.cloth(170, 162, 146, 'robeWhite'), roughness: 0.95, side: THREE.DoubleSide }));
  readonly bronze = retro(std({ map: Tex.bronze(), metalness: 0.8, roughness: 0.38 }));
  readonly bone = retro(std({ map: Tex.bone(), roughness: 0.7 }));
  readonly marrowGlow = std({ color: '#200400', emissive: '#ff5a1a', emissiveIntensity: 3.2, roughness: 0.6 });
  readonly goldGlow = std({ color: '#201400', emissive: '#ffc04a', emissiveIntensity: 3.6, roughness: 0.6 });
  readonly horseCoat = retro(std({ map: Tex.horse(), roughness: 0.8 }));
  readonly horseMane = retro(std({ color: '#141010', roughness: 0.9, side: THREE.DoubleSide }));
  readonly barding = retro(
    std({ map: Tex.cloth(36, 44, 90, 'barding'), roughness: 0.9, side: THREE.DoubleSide }),
  );
  readonly hair = retro(std({ color: '#2b1d15', roughness: 0.9 }));
  readonly lanternGlow = std({ color: '#3a2008', emissive: '#ffb050', emissiveIntensity: 4 });
  readonly fur = retro(std({ color: '#3b3029', roughness: 0.95 }));

  // World.
  readonly cobble = std({ map: Tex.cobble(), roughness: 0.86, color: '#cfd2da' });
  readonly dirt = std({ map: Tex.dirt(), roughness: 0.95, color: '#8e7c66' });
  readonly rock = std({ map: Tex.rock(), roughness: 0.92, vertexColors: true });
  readonly terrain = std({ map: Tex.rock(), roughness: 0.95, vertexColors: true });
  readonly houses = [0, 1, 2].map((v) =>
    std({
      map: Tex.houseWall(v),
      emissiveMap: Tex.houseEmissive(v),
      emissive: '#ffffff',
      emissiveIntensity: 1.6,
      roughness: 0.9,
    }),
  );
  readonly stone = std({ map: Tex.stoneBlocks(0), roughness: 0.88, color: '#c6cad6' });
  readonly stoneWarm = std({ map: Tex.stoneBlocks(1), roughness: 0.88, color: '#cdbfae' });
  readonly stoneDark = std({ map: Tex.stoneBlocks(0), roughness: 0.92, color: '#6a6e7c' });
  readonly slate = std({ map: Tex.slate(), roughness: 0.7, metalness: 0.1, color: '#a9b0c4' });
  readonly wood = std({ map: Tex.wood(), roughness: 0.85 });
  readonly ironDark = std({ color: '#25262b', metalness: 0.8, roughness: 0.55 });
  readonly lancet = std({ color: '#000', emissiveMap: Tex.lancet(), emissive: '#ffffff', emissiveIntensity: 2.2 });
  readonly rose = std({ color: '#000', emissiveMap: Tex.rose(), emissive: '#ffffff', emissiveIntensity: 2.4 });
  readonly water = new THREE.MeshStandardMaterial({ color: '#1a2a3a', metalness: 0.4, roughness: 0.08, transparent: true, opacity: 0.85 });
  /** Surface relief from each albedo's luminance on every textured world material. */
  readonly reliefApplied = (() => {
    const pairs: Array<[THREE.MeshStandardMaterial, number]> = [
      [this.cobble, 5], [this.dirt, 3], [this.stone, 4], [this.stoneWarm, 4], [this.stoneDark, 4],
      [this.slate, 3], [this.wood, 2.5], [this.rock, 4], ...this.houses.map((h) => [h, 2.5] as [THREE.MeshStandardMaterial, number]),
    ];
    for (const [mat, k] of pairs) {
      mat.bumpMap = mat.map;
      mat.bumpScale = k;
    }
    return true;
  })();

  readonly crackGlow = new THREE.MeshBasicMaterial({
    map: Tex.crack(),
    color: '#ff7a30',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  readonly contactShadow = new THREE.MeshBasicMaterial({
    map: Tex.radial('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)', 'contact'),
    transparent: true,
    depthWrite: false,
  });
  readonly flame = new THREE.SpriteMaterial({
    map: Tex.flame(),
    color: '#ffffff',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  readonly glow = new THREE.SpriteMaterial({
    map: Tex.radial('rgba(255,180,90,0.9)', 'rgba(255,120,40,0)', 'glow'),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

let lib: MaterialLibrary | null = null;
export const Mats = (): MaterialLibrary => {
  if (!lib) lib = new MaterialLibrary();
  return lib;
};
