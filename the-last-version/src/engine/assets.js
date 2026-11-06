// Asset loading: PBR texture sets, HDR environments, glTF props.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const texLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();
const cache = new Map();
let anisotropy = 8;
let progressCb = null;
let pending = 0, done = 0;

export function setAnisotropy(a) { anisotropy = a; }
export function onProgress(cb) { progressCb = cb; }
function track(p) { pending++; return p.finally(() => { done++; progressCb?.(done, pending); }); }

function loadTex(url, srgb) {
  const key = url + (srgb ? '#s' : '');
  if (!cache.has(key)) {
    cache.set(key, track(new Promise((res) => {
      texLoader.load(url, (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = anisotropy;
        res(t);
      }, undefined, () => res(null));
    })));
  }
  return cache.get(key);
}

const TEX_ROOT = 'assets/textures/';
/** Loads a Poly Haven texture set: { map, normalMap, arm } */
export async function textureSet(key) {
  const [map, normalMap, arm] = await Promise.all([
    loadTex(`${TEX_ROOT}${key}/diff.jpg`, true),
    loadTex(`${TEX_ROOT}${key}/nor.jpg`, false),
    loadTex(`${TEX_ROOT}${key}/arm.jpg`, false),
  ]);
  return { map, normalMap, arm };
}

const sets = {};
/** Preload texture sets so pbr() can be synchronous afterwards. */
export async function preloadSets(keys) {
  await Promise.all(keys.map(async (k) => { if (!sets[k]) sets[k] = await textureSet(k); }));
}

function cloneTex(t, repeat, rotation = 0) {
  if (!t) return null;
  const c = t.clone();
  c.repeat.set(repeat[0], repeat[1]);
  c.rotation = rotation;
  c.needsUpdate = true;
  return c;
}

/**
 * Physically based material from a preloaded set. `size` is the real-world
 * size in metres covered by one texture tile (geometry UVs are in metres).
 */
export function pbr(key, o = {}) {
  const s = sets[key];
  if (!s) console.warn('texture set not preloaded', key);
  const size = o.size ?? 2;
  const rep = Array.isArray(size) ? [1 / size[0], 1 / size[1]] : [1 / size, 1 / size];
  const m = new (o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
    map: o.noMap ? null : cloneTex(s?.map, rep, o.rotation),
    normalMap: cloneTex(s?.normalMap, rep, o.rotation),
    roughnessMap: cloneTex(s?.arm, rep, o.rotation),
    metalnessMap: o.metal ? cloneTex(s?.arm, rep, o.rotation) : null,
    aoMap: o.ao === false ? null : cloneTex(s?.arm, rep, o.rotation),
    color: o.color ?? 0xffffff,
    roughness: o.roughness ?? 1,
    metalness: o.metalness ?? (o.metal ? 1 : 0),
    normalScale: new THREE.Vector2(o.normal ?? 1, -(o.normal ?? 1)),
    envMapIntensity: o.env ?? 1,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.aoIntensity !== undefined) m.aoMapIntensity = o.aoIntensity;
  if (o.physical) Object.assign(m, o.physical);
  if (o.emissive) { m.emissive = new THREE.Color(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; }
  if (o.triplanar) triplanar(m, o.triplanar);
  return m;
}

/**
 * Object-space triplanar projection, used for sculpted meshes without UVs
 * (characters). Works with skinning because it projects the bind pose.
 */
export function triplanar(material, scale = 1, normalStrength = 1) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTriScale = { value: scale };
    sh.uniforms.uTriNormal = { value: normalStrength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos; varying vec3 vTriN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriPos = position; vTriN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTriPos; varying vec3 vTriN; uniform float uTriScale; uniform float uTriNormal;
        vec3 triW(){ vec3 w = pow(abs(normalize(vTriN)), vec3(4.0)); return w / (w.x + w.y + w.z); }
        vec4 tri(sampler2D t){ vec3 w = triW(); vec3 p = vTriPos * uTriScale;
          return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z; }`)
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'tri(map)'))
      .replace('#include <roughnessmap_fragment>', THREE.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )', 'tri(roughnessMap)'))
      .replace('#include <aomap_fragment>', THREE.ShaderChunk.aomap_fragment.replace('texture2D( aoMap, vAoMapUv )', 'tri(aoMap)'))
      .replace('#include <normal_fragment_maps>', `#ifdef USE_NORMALMAP
        { vec3 w = triW(); vec3 p = vTriPos * uTriScale;
          vec3 nx = texture2D(normalMap, p.zy).xyz * 2.0 - 1.0;
          vec3 ny = texture2D(normalMap, p.xz).xyz * 2.0 - 1.0;
          vec3 nz = texture2D(normalMap, p.xy).xyz * 2.0 - 1.0;
          vec3 n0 = normalize(vTriN);
          // whiteout blend into object space
          vec3 bx = vec3(0.0, nx.y, nx.x) * sign(n0.x);
          vec3 by = vec3(ny.x, 0.0, ny.y) * sign(n0.y);
          vec3 bz = vec3(nz.x, nz.y, 0.0) * sign(n0.z);
          vec3 d = (bx * w.x + by * w.y + bz * w.z) * uTriNormal;
          normal = normalize(normal + normalize(normalMatrix * d) * length(d));
        }
        #endif`);
    if (material.userData.extraShader) material.userData.extraShader(sh);
  };
  material.customProgramCacheKey = () => 'tri' + scale + (material.userData.extraKey || '');
  return material;
}

const hdrCache = new Map();
/** Loads an equirect HDR and returns a PMREM env texture (+ the raw texture for backgrounds). */
export function hdri(renderer, key) {
  if (!hdrCache.has(key)) {
    hdrCache.set(key, track(new Promise((res) => {
      rgbeLoader.load(`assets/hdri/${key}.hdr`, (t) => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        const env = renderer.pmrem.fromEquirectangular(t).texture;
        res({ env, raw: t });
      }, undefined, () => res({ env: null, raw: null }));
    })));
  }
  return hdrCache.get(key);
}

const modelCache = new Map();
/** Loads a Poly Haven glTF prop. Returns a template Object3D; use .clone(). */
export function model(id) {
  if (!modelCache.has(id)) {
    modelCache.set(id, track(new Promise((res) => {
      gltfLoader.load(`assets/models/${id}/${id}.gltf`, (g) => {
        g.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true; o.receiveShadow = true;
            if (o.material.map) o.material.map.anisotropy = anisotropy;
          }
        });
        res(g.scene);
      }, undefined, (e) => { console.warn('model failed', id, e); res(new THREE.Group()); });
    })));
  }
  return modelCache.get(id);
}

/** Merge all meshes of a model template into one geometry per material, for instancing. */
export function flattenModel(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    parts.push({ geometry: g, material: o.material });
  });
  return parts;
}

export function makeInstanced(parts, count, { shadows = true } = {}) {
  const group = new THREE.Group();
  const meshes = parts.map((p) => {
    const m = new THREE.InstancedMesh(p.geometry, p.material, count);
    m.castShadow = shadows; m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    group.add(m);
    return m;
  });
  group.setMatrixAt = (i, mat) => { for (const m of meshes) m.setMatrixAt(i, mat); };
  group.finish = (n = count) => { for (const m of meshes) { m.count = n; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } };
  return group;
}
