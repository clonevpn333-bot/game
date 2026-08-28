/* Material library. Everything shares one atmosphere block (height fog tinted
 * toward the sun) so terrain, props, characters and clouds sit in the same air. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { materialMaps, waterNormal, cloudSprite, softBlob, leafCard, grassCard } from './textures.js';

/* Shared uniforms — mutate these and every material updates. */
export const ATMO = {
  uFogColor: { value: new THREE.Color(0x9fb4cc) },
  uFogDensity: { value: 0.00022 },
  uFogHeight: { value: 40 },
  uFogFalloff: { value: 0.0016 },
  uSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.2) },
  uSunColor: { value: new THREE.Color(0xffd9a8) },
  uTime: { value: 0 },
};

const FOG_VERT = `
  #include <common>
  varying vec3 vWorldP;
  uniform float uTime;
`;
const FOG_FRAG = `
  #include <common>
  varying vec3 vWorldP;
  uniform vec3 uFogColor; uniform float uFogDensity; uniform float uFogHeight;
  uniform float uFogFalloff; uniform vec3 uSunDir; uniform vec3 uSunColor;
  uniform float uTime;
`;
const FOG_BODY = `
  {
    vec3 toFrag = vWorldP - cameraPosition;
    float dist = length(toFrag);
    float hFall = exp(-max(0.0, vWorldP.y - uFogHeight) * uFogFalloff);
    float f = 1.0 - exp(-dist * uFogDensity * hFall);
    float sunAmt = pow(max(dot(normalize(toFrag), uSunDir), 0.0), 7.0);
    vec3 fc = mix(uFogColor, uSunColor, sunAmt * 0.7);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, clamp(f, 0.0, 1.0));
  }
`;

/** Adds sun-tinted exponential height fog to any standard material. */
export function heightFog(mat, extra, key = 'fog') {
  mat.fog = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    Object.assign(shader.uniforms, ATMO);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', FOG_VERT)
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vWorldP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FOG_FRAG)
      .replace('#include <fog_fragment>', FOG_BODY);
    if (extra) extra(shader);
    if (prev) prev(shader, renderer);
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

const std = (opts) => heightFog(new THREE.MeshStandardMaterial(opts), null, 'std');

let LIB = null;
export function materials() {
  if (LIB) return LIB;
  const rock = materialMaps('rock', 11, null, 1);
  const snow = materialMaps('snow', 23, null, 1);
  LIB = {
    rock, snow,
    wood: std({ ...materialMaps('wood', 31, null, 2), roughness: 0.9 }),
    metal: std({ ...materialMaps('metal', 41, 0.58, 2) }),
    metalWarm: std({ ...materialMaps('metal', 47, 0.09, 2) }),
    bark: std({ ...materialMaps('bark', 53, null, 1) }),
    canvasBag: std({ ...materialMaps('fabric', 61, 0.11, 2) }),
    rockProp: std({ ...rock, map: rock.map.clone(), color: 0x8f8a84, roughness: 0.96 }),
    sandProp: std({ ...materialMaps('sand', 67, null, 3) }),
    glass: heightFog(new THREE.MeshStandardMaterial({ color: 0x88a4c0, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.45 })),
  };
  LIB.rockProp.map.repeat.set(2, 2);
  return LIB;
}

/* ---------------- terrain ---------------- */
export function terrainMaterial() {
  const rock = materialMaps('rock', 11, null, 1);
  const snow = materialMaps('snow', 23, null, 1);
  const mat = new THREE.MeshStandardMaterial({
    map: rock.map, normalMap: rock.normalMap, roughness: 0.97, metalness: 0.0,
    vertexColors: true, normalScale: new THREE.Vector2(0.9, 0.9),
  });
  mat.userData.snowMap = { value: snow.map };
  mat.userData.snowNormal = { value: snow.normalMap };
  mat.userData.detail = { value: 0.055 };
  heightFog(mat, (shader) => {
    shader.uniforms.uSnowMap = mat.userData.snowMap;
    shader.uniforms.uSnowNormal = mat.userData.snowNormal;
    shader.uniforms.uDetail = mat.userData.detail;
    shader.vertexShader = shader.vertexShader
      .replace('varying vec3 vWorldP;', 'varying vec3 vWorldP;\nvarying vec3 vNW;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  vNW = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('varying vec3 vWorldP;', 'varying vec3 vWorldP;\nvarying vec3 vNW;\nuniform sampler2D uSnowMap;\nuniform sampler2D uSnowNormal;\nuniform float uDetail;')
      .replace('#include <map_fragment>', `
        vec2 uvXZ = vWorldP.xz * uDetail;
        vec2 uvXY = vec2(vWorldP.x + vWorldP.z, vWorldP.y) * uDetail;
        float upness = smoothstep(0.35, 0.92, abs(vNW.y));
        vec4 rockTex = mix(texture2D(map, uvXY), texture2D(map, uvXZ), upness);
        vec4 snowTex = texture2D(uSnowMap, uvXZ * 0.7);
        vec4 blended = mix(rockTex, snowTex, vColor.a);
        // large-scale variation so tiling never reads as a grid
        float macro = texture2D(map, uvXZ * 0.055).r * 0.34 + 0.83;
        diffuseColor *= vec4(blended.rgb * macro, 1.0);
      `)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapNrock = mix(texture2D(normalMap, uvXY).xyz, texture2D(normalMap, uvXZ).xyz, upness) * 2.0 - 1.0;
        vec3 mapNsnow = texture2D(uSnowNormal, uvXZ * 0.7).xyz * 2.0 - 1.0;
        vec3 mapN = mix(mapNrock, mapNsnow, vColor.a);
        mapN.xy *= normalScale;
        normal = normalize(tbn * mapN);
      `);
  }, 'terrain');
  return mat;
}

/* ---------------- water ---------------- */
export function waterMaterial() {
  const n1 = waterNormal(3), n2 = waterNormal(9);
  n1.repeat.set(60, 60); n2.repeat.set(23, 23);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0d3f57, roughness: 0.06, metalness: 0.22, normalMap: n1,
    transparent: true, opacity: 0.92,
  });
  mat.userData.n2 = { value: n2 };
  heightFog(mat, (shader) => {
    shader.uniforms.uN2 = mat.userData.n2;
    shader.fragmentShader = shader.fragmentShader
      .replace('varying vec3 vWorldP;', 'varying vec3 vWorldP;\nuniform sampler2D uN2;')
      .replace('#include <normal_fragment_maps>', `
        vec2 w1 = vWorldP.xz * 0.008 + vec2(uTime * 0.012, uTime * 0.007);
        vec2 w2 = vWorldP.xz * 0.021 - vec2(uTime * 0.019, uTime * 0.013);
        vec3 nA = texture2D(normalMap, w1).xyz * 2.0 - 1.0;
        vec3 nB = texture2D(uN2, w2).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(nA + nB * 0.7);
        mapN.xy *= 0.55;
        normal = normalize(tbn * mapN);
      `)
      .replace('#include <map_fragment>', `
        float foam = smoothstep(0.0, 1.0, texture2D(normalMap, vWorldP.xz * 0.06 + uTime * 0.02).b);
        float shallow = 1.0 - smoothstep(0.0, 26.0, abs(vWorldP.y) + 6.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.52, 0.58), shallow * 0.7);
        diffuseColor.rgb += foam * shallow * 0.20;
      `);
  }, 'water');
  return mat;
}

/* ---------------- foliage / clouds / sprites ---------------- */
export function foliageMaterial(seed, hue) {
  const mat = new THREE.MeshStandardMaterial({
    map: leafCard(seed, hue), transparent: true, alphaTest: 0.42, side: THREE.DoubleSide,
    roughness: 0.9, metalness: 0,
  });
  mat.userData.wind = { value: 1 };
  return heightFog(mat, (shader) => {
    shader.uniforms.uWind = mat.userData.wind;
    shader.vertexShader = shader.vertexShader
      .replace('varying vec3 vWorldP;', 'varying vec3 vWorldP;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float sway = uv.y * uv.y * uWind;
        vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
        transformed.x += sin(uTime * 1.6 + wp.z * 0.35 + wp.x * 0.2) * sway * 0.16;
        transformed.z += cos(uTime * 1.3 + wp.x * 0.31) * sway * 0.12;
      `);
  }, 'foliage');
}

export function grassMaterial(seed, hue) {
  const m = foliageMaterial(seed + 500, hue);
  m.map = grassCard(seed, hue);
  m.alphaTest = 0.35;
  return m;
}

export function cloudMaterial(seed) {
  return new THREE.MeshBasicMaterial({
    map: cloudSprite(seed), transparent: true, depthWrite: false,
    opacity: 0.9, side: THREE.DoubleSide, fog: false, blending: THREE.NormalBlending,
  });
}

export function glowSprite(color, size = 128) {
  return new THREE.SpriteMaterial({
    map: softBlob(size, 0.4, color), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  });
}

export function updateAtmosphere({ fogColor, density, sunDir, sunColor, height, falloff, time }) {
  if (fogColor) ATMO.uFogColor.value.copy(fogColor);
  if (density !== undefined) ATMO.uFogDensity.value = density;
  if (sunDir) ATMO.uSunDir.value.copy(sunDir);
  if (sunColor) ATMO.uSunColor.value.copy(sunColor);
  if (height !== undefined) ATMO.uFogHeight.value = height;
  if (falloff !== undefined) ATMO.uFogFalloff.value = falloff;
  if (time !== undefined) ATMO.uTime.value = time;
}
