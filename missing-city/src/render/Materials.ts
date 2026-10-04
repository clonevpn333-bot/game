import * as THREE from 'three';
import { G } from './Globals';
import * as T from './Textures';

export type EchoMode = 'echo' | 'present' | undefined;

/**
 * Inject world-state behaviour into a stock material:
 * - echo: only exists while inside an Echo (dissolves in with a cyan edge)
 * - present: only exists in the present (dissolves out during an Echo)
 * - warp: late-game reality wobble
 */
export function patchMaterial<M extends THREE.Material>(mat: M, opts: { echo?: EchoMode; warp?: boolean }): M {
  const echo = opts.echo;
  const warp = !!opts.warp;
  if (!echo && !warp) return mat;
  const key = `patch-${echo ?? 'n'}-${warp ? 'w' : 'n'}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uEcho = G.uEcho;
    shader.uniforms.uTime = G.uTime;
    shader.uniforms.uWarp = G.uWarp;
    shader.vertexShader =
      'uniform float uTime;\nuniform float uWarp;\nvarying vec3 vEchoWP;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `
        vec4 eWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          eWP = instanceMatrix * eWP;
        #endif
        eWP = modelMatrix * eWP;
        vEchoWP = eWP.xyz;
        ${warp ? `
        float wv = sin(eWP.y * 0.35 + uTime * 0.9) * cos(eWP.x * 0.21 - uTime * 0.6);
        transformed.x += wv * uWarp * 0.35;
        transformed.z += sin(eWP.x * 0.3 + uTime) * uWarp * 0.25;
        ` : ''}
        #include <project_vertex>
        `,
      );
    if (echo) {
      shader.fragmentShader =
        'uniform float uEcho;\nuniform float uTime;\nvarying vec3 vEchoWP;\n' +
        'float eHash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }\n' +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          float en = eHash(floor(vEchoWP * 5.0)) * 0.8 + 0.1;
          ${echo === 'echo'
            ? 'float eVis = uEcho - en; if (eVis < 0.0) discard;'
            : 'float eVis = en - uEcho; if (eVis < 0.0) discard;'}
          float eEdge = 1.0 - smoothstep(0.0, 0.08, eVis);
          gl_FragColor.rgb += vec3(0.35, 0.85, 1.0) * eEdge * 2.5;
          ${echo === 'echo' ? 'gl_FragColor.rgb += vec3(0.05, 0.12, 0.16) * (0.5 + 0.5 * sin(vEchoWP.y * 8.0 - uTime * 3.0));' : ''}
          #include <dithering_fragment>
          `,
        );
    }
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

const echoCache = new WeakMap<THREE.Material, Map<string, THREE.Material>>();
/** Get (cached) echo/present/warp variant of a material. */
export function variant<M extends THREE.Material>(mat: M, echo: EchoMode, warp = false): M {
  if (!echo && !warp) return mat;
  let m = echoCache.get(mat);
  if (!m) {
    m = new Map();
    echoCache.set(mat, m);
  }
  const key = `${echo}-${warp}`;
  let v = m.get(key) as M | undefined;
  if (!v) {
    v = mat.clone() as M;
    patchMaterial(v, { echo, warp });
    m.set(key, v);
  }
  return v;
}

// ------------------------------------------------------------------ library
type MatMap = Record<string, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial>;
let LIB: MatMap | null = null;

function std(p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(p);
}

export function M(): MatMap & ReturnType<typeof build> {
  if (!LIB) LIB = build();
  return LIB as MatMap & ReturnType<typeof build>;
}

function build() {
  const asp = T.asphalt();
  const side = T.concreteTiles('sidewalk', 4, [128, 124, 116]);
  const conc = T.concreteTiles('concrete', 1, [110, 108, 104]);
  const storeTiles = T.tiles('store-floor', '#d9d6cc', '#9aa1a4', 8, '#555', true, true);
  const subwayWall = T.tiles('subway-wall', '#d8d4c6', '#d8d4c6', 16, '#6d6a62', false, true);
  const subwayFloor = T.tiles('subway-floor', '#5d5a55', '#4c4a46', 6, '#333', true, false);
  const hospFloor = T.tiles('hosp-floor', '#c8cfc9', '#b3bdb6', 6, '#8a908b', true, true);
  const metal = T.metalPanel();
  const lib = {
    asphalt: std({ map: asp.map, roughnessMap: asp.rough, bumpMap: asp.bump, bumpScale: 0.6, color: 0x9aa0a8, roughness: 1, metalness: 0.0, envMapIntensity: 1.6 }),
    sidewalk: std({ map: side.map, roughnessMap: side.rough, color: 0xb8b4ac, roughness: 1, envMapIntensity: 1.2 }),
    curb: std({ map: conc.map, color: 0x9a968e, roughness: 0.6, envMapIntensity: 1 }),
    concrete: std({ map: conc.map, roughnessMap: conc.rough, color: 0xa8a49c, roughness: 1, envMapIntensity: 0.8 }),
    concreteDark: std({ map: conc.map, color: 0x5a5854, roughness: 0.9, envMapIntensity: 0.6 }),
    blackEarth: std({ color: 0x050505, roughness: 0.55, metalness: 0.0, envMapIntensity: 0.5, bumpMap: T.noiseTex('earth', 24), bumpScale: 0.5 }),
    lane: std({ color: 0xd8d2b8, roughness: 0.45, envMapIntensity: 1.2 }),
    laneYellow: std({ color: 0xd1a42a, roughness: 0.45, envMapIntensity: 1.2 }),
    brick: std({ map: T.brick(), color: 0xffffff, roughness: 0.85 }),
    brickDark: std({ map: T.brick('brick-dark', [70, 40, 34]), color: 0xffffff, roughness: 0.85 }),
    trim: std({ color: 0x3a3d42, roughness: 0.55, metalness: 0.5 }),
    trimLight: std({ color: 0x8c8a84, roughness: 0.6, metalness: 0.1 }),
    metal: std({ map: metal, color: 0xaab0b8, roughness: 0.45, metalness: 0.85 }),
    metalDark: std({ color: 0x24272b, roughness: 0.4, metalness: 0.8 }),
    steel: std({ color: 0xb8bec6, roughness: 0.28, metalness: 1.0 }),
    paintRed: std({ color: 0x8a1c1c, roughness: 0.5, metalness: 0.2 }),
    paintYellow: std({ color: 0xc89a1c, roughness: 0.5, metalness: 0.2 }),
    rubber: std({ color: 0x0b0b0c, roughness: 0.92, envMapIntensity: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x8aa4b8, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 2.2, depthWrite: false, clearcoat: 1 }),
    glassDark: new THREE.MeshPhysicalMaterial({ color: 0x223040, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 2.5, clearcoat: 1 }),
    storeFloor: std({ map: storeTiles.map, roughnessMap: storeTiles.rough, roughness: 1, envMapIntensity: 1.1 }),
    subwayWall: std({ map: subwayWall.map, roughnessMap: subwayWall.rough, roughness: 1, envMapIntensity: 0.9 }),
    subwayFloor: std({ map: subwayFloor.map, roughness: 0.75 }),
    hospFloor: std({ map: hospFloor.map, roughnessMap: hospFloor.rough, roughness: 1, envMapIntensity: 1.1 }),
    plasterWhite: std({ map: T.plaster('plaster-white', '#cfcac0'), roughness: 0.92 }),
    plasterGreen: std({ map: T.plaster('plaster-green', '#8fa595'), roughness: 0.92 }),
    plasterBlue: std({ map: T.plaster('plaster-blue', '#7d8fa6', true), roughness: 0.92 }),
    wallpaper: std({ map: T.plaster('wallpaper', '#b9a98a', true), roughness: 0.9 }),
    wallpaperKid: std({ map: T.plaster('wallpaper-kid', '#7c9ab5', true), roughness: 0.9 }),
    woodFloor: std({ map: T.wood('woodfloor', [120, 80, 48], 8), roughness: 0.55, envMapIntensity: 0.9 }),
    wood: std({ map: T.wood('wood', [100, 66, 40], 4), roughness: 0.7 }),
    woodPaint: std({ color: 0xe8e2d4, roughness: 0.6 }),
    carpet: std({ map: T.carpet('carpet', '#5c4a42'), roughness: 1 }),
    carpetOffice: std({ map: T.carpet('carpet-office', '#3d434c'), roughness: 1 }),
    fabric: std({ color: 0x4a5566, roughness: 0.95 }),
    fabricRed: std({ color: 0x7a2a2a, roughness: 0.95 }),
    plasticWhite: std({ color: 0xe6e4de, roughness: 0.5 }),
    plasticDark: std({ color: 0x1c1d20, roughness: 0.45 }),
    products: std({ map: T.productsTex(), roughness: 0.5 }),
    roofTar: std({ color: 0x1e1f21, roughness: 0.9 }),
    tunnel: std({ map: conc.map, color: 0x4a4744, roughness: 0.95 }),
    rail: std({ color: 0x7c7368, roughness: 0.35, metalness: 0.9 }),
    railTie: std({ color: 0x2b2420, roughness: 0.95 }),
    gravel: std({ map: T.noiseTex('gravel', 64), color: 0x5a5650, roughness: 1 }),
    grass: std({ map: T.noiseTex('grass', 32), color: 0x2a3a22, roughness: 1 }),
    hedge: std({ map: T.noiseTex('hedge', 48), color: 0x1d2c17, roughness: 1 }),
    bark: std({ color: 0x2e241c, roughness: 1 }),
    leaves: std({ map: T.noiseTex('leaves', 16), color: 0x24361e, roughness: 1 }),
    shingle: std({ map: T.wood('shingle', [60, 56, 54], 16), roughness: 0.85 }),
    siding: std({ map: T.wood('siding', [180, 176, 166], 16), roughness: 0.8 }),
    sidingBlue: std({ map: T.wood('siding-b', [110, 130, 150], 16), roughness: 0.8 }),
    sidingGreen: std({ map: T.wood('siding-g', [120, 140, 115], 16), roughness: 0.8 }),
    mattress: std({ color: 0xd8d4cc, roughness: 1 }),
    orpheus: new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.18, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 2.0 }),
    // emissive signal set
    lightWarm: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.72, 0.42).multiplyScalar(4) }),
    lightSodium: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.6, 0.25).multiplyScalar(5) }),
    lightCool: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.9, 1.0).multiplyScalar(3.5) }),
    lightFluor: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 1.0, 0.95).multiplyScalar(3) }),
    signalRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.08, 0.05).multiplyScalar(5) }),
    signalAmber: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.05).multiplyScalar(5) }),
    signalGreen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 1, 0.6).multiplyScalar(4) }),
    signalOff: std({ color: 0x111111, roughness: 0.3 }),
    neonPink: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.15, 0.55).multiplyScalar(4) }),
    neonCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.9, 1).multiplyScalar(4) }),
    echoCyan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.9, 1).multiplyScalar(3) }),
    orpheusGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.5, 1).multiplyScalar(4) }),
    black: new THREE.MeshBasicMaterial({ color: 0x000000 }),
  };
  for (const k of ['asphalt', 'sidewalk', 'concrete', 'storeFloor', 'subwayWall', 'subwayFloor', 'hospFloor', 'woodFloor', 'carpet', 'carpetOffice', 'gravel', 'grass', 'tunnel'] as const) {
    lib[k].map?.repeat.set(1, 1);
  }
  return lib;
}

/** Per-facade building materials, cached by style+seed. */
const facadeCache = new Map<string, THREE.MeshStandardMaterial>();
export function facadeMaterial(style: T.FacadeStyle, seed: number, emissiveBoost = 1.6): THREE.MeshStandardMaterial {
  const key = `${style}-${seed}-${emissiveBoost}`;
  let m = facadeCache.get(key);
  if (!m) {
    const f = T.facade(style, seed);
    m = new THREE.MeshStandardMaterial({
      map: f.map,
      emissiveMap: f.emissive,
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: emissiveBoost,
      roughness: style === 'office' ? 0.25 : 0.8,
      metalness: style === 'office' ? 0.6 : 0.05,
      envMapIntensity: style === 'office' ? 1.6 : 0.6,
    });
    facadeCache.set(key, m);
  }
  return m;
}

const signCache = new Map<string, THREE.MeshBasicMaterial>();
export function signMaterial(text: string, opts: Parameters<typeof T.signTexture>[1] & { intensity?: number } = {}): THREE.MeshBasicMaterial {
  const key = JSON.stringify([text, opts]);
  let m = signCache.get(key);
  if (!m) {
    const tex = T.signTexture(text, opts);
    m = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1).multiplyScalar(opts.intensity ?? 2.2), toneMapped: true });
    signCache.set(key, m);
  }
  return m;
}

export function texturedMaterial(tex: THREE.Texture, rough = 0.7, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: rough,
    emissiveMap: emissive > 0 ? tex : null,
    emissive: emissive > 0 ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0),
    emissiveIntensity: emissive,
  });
}

/** Additive glow sprite material (bulb halos, pools). */
const glowCache = new Map<string, THREE.MeshBasicMaterial>();
export function glowMaterial(color: THREE.ColorRepresentation, intensity = 1, key = 'g'): THREE.MeshBasicMaterial {
  const c = new THREE.Color(color);
  const k = `${c.getHexString()}-${intensity}-${key}`;
  let m = glowCache.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: T.radial(),
      color: c.multiplyScalar(intensity),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: true,
      fog: true,
    });
    glowCache.set(k, m);
  }
  return m;
}

const streakCache = new Map<string, THREE.MeshBasicMaterial>();
export function streakMaterial(color: THREE.ColorRepresentation, intensity = 1): THREE.MeshBasicMaterial {
  const c = new THREE.Color(color);
  const k = `${c.getHexString()}-${intensity}`;
  let m = streakCache.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      map: T.streak(),
      color: c.multiplyScalar(intensity),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    streakCache.set(k, m);
  }
  return m;
}

/** Volumetric-looking light cone (fresnel-faded additive shell). */
const coneCache = new Map<string, THREE.ShaderMaterial>();
export function coneMaterial(color: THREE.ColorRepresentation, intensity = 0.35): THREE.ShaderMaterial {
  const c = new THREE.Color(color);
  const k = `${c.getHexString()}-${intensity}`;
  let m = coneCache.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: c }, uInt: { value: intensity }, uTime: G.uTime, uEcho: G.uEcho },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vWP;
        void main(){
          vec4 wp = modelMatrix * vec4(position,1.0);
          vWP = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          vH = uv.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uInt; uniform float uTime;
        varying vec3 vN; varying vec3 vV; varying float vH; varying vec3 vWP;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){
          float f = abs(dot(normalize(vN), normalize(vV)));
          float edge = pow(f, 1.6);
          float along = pow(vH, 1.4);
          float dust = 0.85 + 0.15 * sin(vWP.y * 3.0 + uTime * 0.7 + vWP.x * 2.0);
          float a = edge * along * uInt * dust;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    coneMaterial.all.push(m);
    coneCache.set(k, m);
  }
  return m;
}
coneMaterial.all = [] as THREE.ShaderMaterial[];

export function disposeMaterialCaches(): void {
  // textures are cached globally on purpose (reused across chapters)
}
