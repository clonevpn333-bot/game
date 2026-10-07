import * as THREE from 'three';

/**
 * Hand-painted animation look (Ghibli-style):
 *  - light falls off through one soft, brush-wobbled terminator instead of a
 *    physically smooth gradient; the shadow side shows the cool sky ambient
 *  - a faint second highlight band and painterly grain in object space
 *  - colour-matched ink: outlines and seam lines are a darkened shade of the
 *    surface's own colour, never pure black
 */
export const TOON = {
  edge: { value: 0.02 }, // terminator position in N·L
  soft: { value: 0.035 }, // terminator softness
  brush: { value: 0.14 }, // wobble of the terminator
  rim: { value: 0.14 },
  rimColor: { value: new THREE.Color('#fff2d8') },
  ink: { value: new THREE.Color(0.32, 0.22, 0.24) },
  res: { value: new THREE.Vector2(1280, 720) },
  outlinePx: { value: 1.6 },
};

const NOISE = /* glsl */ `
  float tHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float tNoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(tHash(i), tHash(i + vec3(1,0,0)), f.x), mix(tHash(i + vec3(0,1,0)), tHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(tHash(i + vec3(0,0,1)), tHash(i + vec3(1,0,1)), f.x), mix(tHash(i + vec3(0,1,1)), tHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`;

export interface GhibliOpts {
  /** object-space scale of the brush wobble / grain (1 = metres) */
  brushScale?: number;
  /** painterly grain amount (0 = crisp) */
  grain?: number;
  /** terminator wobble scale (1 = default) */
  wobble?: number;
  /** extra fragment code injected after colour (can modify diffuseColor) */
  color?: string;
  /** extra emissive code (can add to totalEmissiveRadiance) */
  emissive?: string;
  /** extra declarations for vertex / fragment */
  vertDecl?: string;
  vertBody?: string;
  fragDecl?: string;
  /** ink amount expression (0..1), e.g. 'vInk' */
  ink?: string;
}

/** Patch a MeshToonMaterial shader with the painted look. */
export function ghibli(s: THREE.WebGLProgramParametersWithUniforms, o: GhibliOpts = {}): void {
  s.uniforms.uTEdge = TOON.edge;
  s.uniforms.uTSoft = TOON.soft;
  s.uniforms.uTBrush = TOON.brush;
  s.uniforms.uTRim = TOON.rim;
  s.uniforms.uTRimColor = TOON.rimColor;
  s.uniforms.uTInk = TOON.ink;
  s.vertexShader = s.vertexShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vTObj;\n${o.vertDecl ?? ''}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvTObj = position;\n${o.vertBody ?? ''}`);
  const bs = (o.brushScale ?? 1).toFixed(4);
  s.fragmentShader = s.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vTObj;\nuniform float uTEdge, uTSoft, uTBrush, uTRim;\nuniform vec3 uTRimColor, uTInk;\n${NOISE}\n${o.fragDecl ?? ''}`,
    )
    .replace(
      '#include <gradientmap_pars_fragment>',
      `
      float tBrushN;
      vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection){
        float d = dot(normal, lightDirection) + (tBrushN - 0.5) * uTBrush;
        float lit = smoothstep(uTEdge - uTSoft, uTEdge + uTSoft, d);
        lit += 0.1 * smoothstep(0.62, 0.7, d);
        return vec3(lit);
      }`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec3 tP = vTObj / ${bs};
      tBrushN = tNoise(tP * 7.0) * 0.6 + tNoise(tP * 23.0) * 0.4;
      diffuseColor.rgb *= 1.0 + (tNoise(tP * 41.0 + 3.0) - 0.5) * ${(o.grain ?? 0.1).toFixed(3)};
      tBrushN = 0.5 + (tBrushN - 0.5) * ${(o.wobble ?? 1).toFixed(3)};
      ${o.color ?? ''}`,
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float tFres = 1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition)));
      totalEmissiveRadiance += uTRimColor * diffuseColor.rgb * smoothstep(0.7, 0.78, tFres) * uTRim;
      ${o.emissive ?? ''}`,
    )
    .replace(
      '#include <opaque_fragment>',
      o.ink ? `outgoingLight = mix(outgoingLight, diffuseColor.rgb * uTInk, clamp(${o.ink}, 0.0, 1.0) * 0.9);\n#include <opaque_fragment>` : '#include <opaque_fragment>',
    );
}

/** Generic painted surface for props and architecture. */
export function toonMaterial(o: { color?: THREE.ColorRepresentation; map?: THREE.Texture | null; vertexColors?: boolean; brushScale?: number; side?: THREE.Side; emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; metal?: boolean } = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ color: o.color ?? '#ffffff', map: o.map ?? null, vertexColors: o.vertexColors ?? false, side: o.side ?? THREE.FrontSide });
  if (o.emissive) {
    m.emissive.set(o.emissive);
    m.emissiveIntensity = o.emissiveIntensity ?? 1;
  }
  const metal = o.metal ? 1 : 0;
  m.onBeforeCompile = (s) =>
    ghibli(s, {
      brushScale: o.brushScale ?? 1,
      // anime metal: a crisp sky-reflection band across the upper normals
      emissive: metal ? `vec3 vn = normalize(vNormal); totalEmissiveRadiance += diffuseColor.rgb * (smoothstep(0.3, 0.36, vn.y) - smoothstep(0.62, 0.7, vn.y) * 0.6) * 0.9;` : '',
      color: metal ? 'diffuseColor.rgb *= 0.75;' : '',
    });
  m.customProgramCacheKey = () => `toon-${metal}-${o.brushScale ?? 1}`;
  return m;
}

// ---------------------------------------------------------------------------- outlines
const outlineMats = new Map<string, THREE.MeshBasicMaterial>();

/**
 * Inverted-hull outline material: back faces pushed out along the normal by a
 * constant number of pixels, capped by a world-space width so distant objects
 * thin out gracefully. With vertex colours, the line takes a dark shade of the
 * local paint (coloured line art).
 */
export function outlineMaterial(o: { worldMax: number; color?: THREE.ColorRepresentation; vertexColors?: boolean; px?: number }): THREE.MeshBasicMaterial {
  const key = `${o.worldMax}|${o.color ?? ''}|${o.vertexColors ? 1 : 0}|${o.px ?? 1}`;
  const hit = outlineMats.get(key);
  if (hit) return hit;
  const m = new THREE.MeshBasicMaterial({ color: o.color ?? (o.vertexColors ? new THREE.Color(0.26, 0.18, 0.2) : '#2a1c1c'), vertexColors: o.vertexColors ?? false, side: THREE.BackSide });
  const world = { value: o.worldMax };
  const px = { value: o.px ?? 1 };
  m.onBeforeCompile = (s) => {
    s.uniforms.uORes = TOON.res;
    s.uniforms.uOPx = TOON.outlinePx;
    s.uniforms.uOScale = px;
    s.uniforms.uOWorld = world;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uORes; uniform float uOPx, uOWorld, uOScale;').replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      #ifdef USE_SKINNING
        vec3 oN = objectNormal;
      #else
        vec3 oN = normal;
      #endif
      #ifdef USE_INSTANCING
        oN = mat3(instanceMatrix) * oN;
      #endif
      vec3 nV = normalize(mat3(modelViewMatrix) * oN);
      vec2 dir = normalize(nV.xy + vec2(1e-5));
      float focal = projectionMatrix[1][1] * uORes.y * 0.5;
      float w = max(gl_Position.w, 1e-3);
      float pxw = min(uOPx * uOScale, uOWorld * focal / w);
      gl_Position.xy += dir * pxw * 2.0 / uORes * w;`,
    );
  };
  m.customProgramCacheKey = () => `outline-${o.vertexColors ? 1 : 0}`;
  outlineMats.set(key, m);
  return m;
}

/** Add an outline hull to a mesh (Mesh, InstancedMesh or SkinnedMesh). */
export function addOutline(mesh: THREE.Mesh, worldMax: number, px = 1, color?: THREE.ColorRepresentation, attach = false): THREE.Mesh {
  const vc = !!mesh.geometry.attributes.color && color === undefined;
  const mat = outlineMaterial({ worldMax, vertexColors: vc, color: color ?? (vc ? new THREE.Color(0.26, 0.18, 0.2) : undefined), px });
  let o: THREE.Mesh;
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    const sm = mesh as THREE.SkinnedMesh;
    const s = new THREE.SkinnedMesh(sm.geometry, mat);
    s.bind(sm.skeleton, sm.bindMatrix);
    s.frustumCulled = sm.frustumCulled;
    o = s;
  } else if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
    const im = mesh as THREE.InstancedMesh;
    const i = new THREE.InstancedMesh(im.geometry, mat, im.count);
    i.instanceMatrix = im.instanceMatrix;
    i.frustumCulled = im.frustumCulled;
    o = i;
  } else {
    o = new THREE.Mesh(mesh.geometry, mat);
  }
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.isOutline = true;
  if (attach && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    // rides along with the mesh (for objects that are moved/scaled later)
    mesh.add(o);
    return o;
  }
  o.position.copy(mesh.position);
  o.quaternion.copy(mesh.quaternion);
  o.scale.copy(mesh.scale);
  mesh.parent?.add(o);
  return o;
}
