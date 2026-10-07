import * as THREE from 'three';

/**
 * Global "dream" uniforms shared by every material in the game. One object,
 * referenced by every patched shader, so a single write updates the world.
 */
export const dreamUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() },
  uFogColor: { value: new THREE.Color('#f6d9e6') },
  uFogSunColor: { value: new THREE.Color('#ffe9c4') },
  uFogLowColor: { value: new THREE.Color('#d8c8f0') },
  uFogDensity: { value: 0.012 },
  uFogBase: { value: 0 },
  uFogHeightFalloff: { value: 0.03 },
  uFogHeightMix: { value: 0.5 },
  uFogMax: { value: 0.96 },
  uRimColor: { value: new THREE.Color('#fff2f8') },
  uRimStrength: { value: 0.35 },
  uWobble: { value: 0 },
  uDread: { value: 0 },
};

/** GLSL fog function shared with custom ShaderMaterials (sky, sprites). */
export const DREAM_FOG_PARS = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform vec3 uFogSunColor;
uniform vec3 uFogLowColor;
uniform float uFogDensity;
uniform float uFogBase;
uniform float uFogHeightFalloff;
uniform float uFogHeightMix;
uniform float uFogMax;
vec3 dreamFogColor(vec3 dir) {
  float sunAmt = pow(max(dot(dir, normalize(uSunDir)), 0.0), 5.0);
  vec3 c = mix(uFogColor, uFogSunColor, sunAmt);
  c = mix(c, uFogLowColor, smoothstep(0.02, -0.45, dir.y) * 0.85);
  return c;
}
float dreamFogAmount(vec3 worldPos) {
  vec3 dv = worldPos - cameraPosition;
  float dist = length(dv);
  float f = 1.0 - exp(-uFogDensity * dist);
  float hf = exp(-max(worldPos.y - uFogBase, 0.0) * uFogHeightFalloff);
  f *= mix(1.0, hf, uFogHeightMix);
  return clamp(f, 0.0, 1.0) * uFogMax;
}
`;

const VERT_PARS = /* glsl */ `
uniform float uTime;
uniform float uWobble;
varying vec3 vDreamWorld;
`;

const VERT_MAIN = /* glsl */ `
#include <project_vertex>
{
  vec4 dwp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    dwp = instanceMatrix * dwp;
  #endif
  dwp = modelMatrix * dwp;
  if (uWobble > 0.0) {
    vec3 w = dwp.xyz;
    vec3 off = vec3(sin(w.y * 0.9 + uTime * 0.7 + w.z * 0.3), sin(w.x * 0.7 + uTime * 0.5), sin(w.z * 0.8 + uTime * 0.6 + w.x * 0.2)) * uWobble;
    dwp.xyz += off;
    gl_Position = projectionMatrix * viewMatrix * dwp;
  }
  vDreamWorld = dwp.xyz;
}
`;

const FRAG_PARS = /* glsl */ `
varying vec3 vDreamWorld;
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uDread;
${DREAM_FOG_PARS}
`;

const FRAG_FOG = /* glsl */ `
{
  vec3 dvd = normalize(vDreamWorld - cameraPosition);
  float fa = dreamFogAmount(vDreamWorld);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, dreamFogColor(dvd), fa);
}
`;

const FRAG_RIM = /* glsl */ `
#include <emissivemap_fragment>
{
  float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
  totalEmissiveRadiance += uRimColor * pow(rimF, 3.0) * uRimStrength;
}
`;

export interface DreamifyOptions {
  rim?: boolean;
  wobble?: boolean;
  fog?: boolean;
}

/**
 * Patch a stock material with dream fog, rim light and optional wobble.
 * Keeps PBR lighting from three.js.
 */
export function dreamify<T extends THREE.Material>(material: T, opts: DreamifyOptions = {}): T {
  const rim = opts.rim ?? true;
  const wobble = opts.wobble ?? true;
  const fog = opts.fog ?? true;
  const key = `dream-${rim ? 1 : 0}${wobble ? 1 : 0}${fog ? 1 : 0}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = dreamUniforms.uTime;
    shader.uniforms.uWobble = wobble ? dreamUniforms.uWobble : { value: 0 };
    for (const k of [
      'uSunDir', 'uFogColor', 'uFogSunColor', 'uFogLowColor', 'uFogDensity', 'uFogBase',
      'uFogHeightFalloff', 'uFogHeightMix', 'uFogMax', 'uRimColor', 'uRimStrength', 'uDread',
    ] as const) {
      shader.uniforms[k] = dreamUniforms[k];
    }
    if (!fog) shader.uniforms.uFogMax = { value: 0 };
    shader.vertexShader = VERT_PARS + shader.vertexShader.replace('#include <project_vertex>', VERT_MAIN);
    let frag = FRAG_PARS + shader.fragmentShader;
    frag = frag.replace('#include <fog_fragment>', FRAG_FOG);
    if (rim && frag.includes('#include <emissivemap_fragment>') && frag.includes('vViewPosition')) {
      frag = frag.replace('#include <emissivemap_fragment>', FRAG_RIM);
    }
    shader.fragmentShader = frag;
  };
  material.customProgramCacheKey = () => key;
  return material;
}

/** Shared material roles for one chapter. Recreated on chapter load. */
export class MaterialKit {
  readonly paint = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }));
  readonly satin = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.02 }));
  readonly gloss = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 0.0, envMapIntensity: 1.2 }));
  readonly metal = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85 }));
  readonly cloud = dreamify(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: new THREE.Color('#6a4a7a'), emissiveIntensity: 0.32 }),
  );
  readonly glow = dreamify(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false }), {
    rim: false,
  });
  readonly softGlow = dreamify(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.1, 1.1, 1.1) }), { rim: false });
  readonly glass = dreamify(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  readonly water = dreamify(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.04, metalness: 0.35, transparent: true, opacity: 0.82, envMapIntensity: 1.6 }),
    { wobble: false },
  );
  readonly textured = new Map<string, THREE.MeshStandardMaterial>();

  constructor() {
    this.water.depthWrite = false;
  }

  /** A textured material keyed by texture name. Textures repeat in world units (UVs are metric). */
  tex(name: string, map: THREE.Texture, opts: { roughness?: number; metalness?: number; emissive?: number } = {}): THREE.MeshStandardMaterial {
    let m = this.textured.get(name);
    if (!m) {
      m = dreamify(
        new THREE.MeshStandardMaterial({
          map,
          vertexColors: true,
          roughness: opts.roughness ?? 0.85,
          metalness: opts.metalness ?? 0,
          emissive: new THREE.Color(1, 1, 1),
          emissiveMap: opts.emissive ? map : null,
          emissiveIntensity: opts.emissive ?? 0,
        }),
      );
      this.textured.set(name, m);
    }
    return m;
  }

  all(): THREE.Material[] {
    return [this.paint, this.satin, this.gloss, this.metal, this.cloud, this.glow, this.softGlow, this.glass, this.water, ...this.textured.values()];
  }

  dispose(): void {
    for (const m of this.all()) m.dispose();
  }
}

export interface ColorField {
  center: { value: THREE.Vector3 };
  radius: { value: number };
}

/**
 * Material whose colour is drained (greyscale + lilac fog tint) outside a
 * radius, and fully coloured inside. Animate `radius` for restore waves.
 */
export function fieldMaterial(base: THREE.MeshStandardMaterial, field: ColorField, key: string): THREE.MeshStandardMaterial {
  const m = base.clone();
  dreamify(m);
  const inner = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    inner(shader, r);
    shader.uniforms.uFieldCenter = field.center;
    shader.uniforms.uFieldRadius = field.radius;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uFieldCenter;\nuniform float uFieldRadius;\nvoid main() {')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           float fd = distance(vDreamWorld, uFieldCenter);
           float drained = smoothstep(uFieldRadius - 2.5, uFieldRadius, fd);
           float g = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
           vec3 grey = mix(vec3(g), vec3(0.78, 0.76, 0.84), 0.35) * 0.92;
           float edge = smoothstep(uFieldRadius - 2.5, uFieldRadius - 1.0, fd) * (1.0 - smoothstep(uFieldRadius - 1.0, uFieldRadius, fd));
           diffuseColor.rgb = mix(diffuseColor.rgb, grey, drained) + vec3(1.0, 0.85, 0.6) * edge * 0.6;
         }`,
      );
  };
  m.customProgramCacheKey = () => `field-${key}`;
  return m;
}
