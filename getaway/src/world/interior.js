// GETAWAY! — "interior mapping": every window on every facade shows a real 3D room behind the glass (back wall, side
// walls, floor, ceiling, furniture, curtains, ceiling light) that shifts with parallax as you move — no extra geometry.
// Rooms are lit or dark at night following the facade's emissive map. One shared shader program for all facades.
import * as THREE from 'three';

// crushed-wall holes: each dent cuts a rectangle out of the facade (the deformed patch shows through) — see fx/dents.js
export const MAX_DENTS = 24; export const DENT_A = Array.from({ length: MAX_DENTS }, () => new THREE.Vector4()); export const DENT_B = Array.from({ length: MAX_DENTS }, () => new THREE.Vector4());
const VERT_DECL = 'varying vec3 vIMWorld; varying vec3 vIMNormal;\n';
const FRAG_DECL = `
varying vec3 vIMWorld; varying vec3 vIMNormal; uniform vec4 uIM; uniform vec4 uIM2; uniform vec4 uDentA[24]; uniform vec4 uDentB[24];
float imHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 imRoom(vec2 mapUv, out float lit, float night) {
  // uIM: x cols per tile, y floors per tile, z room width (m), w room height (m) | uIM2: x depth, y seed, z style (0 home,1 office,2 shop,3 industrial)
  vec2 cellF = mapUv * uIM.xy; vec2 cid = floor(cellF) + uIM2.y * 17.0; vec2 cuv = fract(cellF);
  vec3 N = normalize(vIMNormal); vec3 T = cross(vec3(0.0, 1.0, 0.0), N); T = length(T) < 0.01 ? vec3(1.0, 0.0, 0.0) : normalize(T);
  vec3 rd = normalize(vIMWorld - cameraPosition);
  vec3 r = vec3(dot(rd, T), rd.y, dot(rd, -N)) / vec3(uIM.z * 0.5, uIM.w * 0.5, uIM2.x * 0.5);
  vec3 p = vec3(cuv.x * 2.0 - 1.0, cuv.y * 2.0 - 1.0, -1.0);
  vec3 tb = (sign(r) - p) / r; float t = min(min(tb.x, tb.y), tb.z); vec3 h = p + r * t;
  float hA = imHash(cid), hB = imHash(cid + 3.7), hC = imHash(cid + 9.1);
  vec3 wall = uIM2.z > 0.5 && uIM2.z < 1.5 ? mix(vec3(0.78, 0.79, 0.8), vec3(0.62, 0.68, 0.74), hA) : mix(mix(vec3(0.86, 0.8, 0.66), vec3(0.6, 0.72, 0.68), step(0.5, hA)), vec3(0.75, 0.58, 0.55), step(0.82, hA));
  if (uIM2.z > 2.5) wall = vec3(0.45, 0.47, 0.5);
  vec3 floorC = uIM2.z > 0.5 && uIM2.z < 1.5 ? vec3(0.32, 0.34, 0.38) : mix(vec3(0.42, 0.28, 0.16), vec3(0.55, 0.42, 0.3), hB);
  vec3 col; float shade;
  if (t == tb.z) { // back wall + furniture
    vec2 u = h.xy * 0.5 + 0.5; col = wall; shade = 0.9;
    if (uIM2.z > 0.5 && uIM2.z < 1.5) { // office: desk rows + monitors
      float desk = step(0.18, u.y) * step(u.y, 0.36); col = mix(col, vec3(0.2, 0.2, 0.22), desk); float mon = step(0.36, u.y) * step(u.y, 0.5) * step(0.2, fract(u.x * 2.0)) * step(fract(u.x * 2.0), 0.55);
      col = mix(col, mix(vec3(0.05), vec3(0.25, 0.55, 0.9), night), mon); }
    else if (uIM2.z > 1.5 && uIM2.z < 2.5) { col = mix(col, vec3(0.5, 0.35, 0.25), step(fract(u.y * 4.0), 0.12)); col = mix(col, vec3(0.9, 0.3 + hB * 0.5, 0.2 + hC * 0.6), step(0.5, fract(u.x * 7.0 + hA)) * step(0.15, u.y) * step(u.y, 0.85) * 0.6); }
    else { float sofa = step(abs(u.x - 0.3 - hB * 0.4), 0.22) * step(u.y, 0.28); col = mix(col, mix(vec3(0.25, 0.2, 0.35), vec3(0.6, 0.25, 0.2), hC), sofa);
      float art = step(abs(u.x - 0.5 + (hA - 0.5) * 0.3), 0.12) * step(abs(u.y - 0.62), 0.1); col = mix(col, vec3(0.15 + hC * 0.6, 0.3, 0.45 - hC * 0.3), art);
      float door = step(abs(u.x - 0.85 + hB * 0.7), 0.1) * step(u.y, 0.7) * step(0.6, hC); col = mix(col, vec3(0.35, 0.24, 0.16), door); }
  } else if (t == tb.y) { col = h.y < 0.0 ? floorC * (0.8 + 0.2 * step(0.5, fract(h.z * 3.0))) : vec3(0.92); shade = h.y < 0.0 ? 0.6 : 1.05;
    if (h.y > 0.0) { float lamp = 1.0 - smoothstep(0.0, 0.35, length(h.xz - vec2(0.0, 0.1))); col += vec3(1.0, 0.9, 0.7) * lamp * night * 2.0; }
  } else { col = wall * 0.7; shade = 0.72; float shelf = step(0.85, hB) * step(abs(h.y + 0.1), 0.5) * step(h.z, 0.4); col = mix(col, vec3(0.3, 0.22, 0.15), shelf); }
  float depthFog = clamp((h.z + 1.0) * 0.5, 0.0, 1.0); shade *= 1.0 - depthFog * 0.45; // back of the room is darker
  vec2 cq = abs(h.xy); shade *= 1.0 - 0.35 * smoothstep(0.75, 1.0, max(cq.x, cq.y)); // ambient occlusion into the corners
  lit = step(0.5, night) * step(0.35, hC + 0.0); col *= shade;
  // curtains / blinds on some windows (on the glass plane, so they don't parallax)
  float curtain = step(0.72, hB) * (step(cuv.x, 0.22) + step(0.78, cuv.x)); float blinds = step(0.9, hA) * step(0.5, fract(cuv.y * 14.0)) * 0.6;
  col = mix(col, mix(vec3(0.7, 0.35, 0.3), vec3(0.85, 0.8, 0.7), hC), clamp(curtain, 0.0, 1.0)); col = mix(col, vec3(0.8), blinds);
  return col;
}
`;
const STYLE_ID = { house: 0, brick: 0, plaster: 0, deco: 0, office: 1, glass: 1, tower: 1, bank: 1, shop: 2, warehouse: 3, garage: 3, construction: 3 };

export function addInteriorMapping(mat, style, F, seed) {
  const u1 = new THREE.Vector4(F.cols, F.floors, F.tw / F.cols, F.th / F.floors), u2 = new THREE.Vector4(style === 'shop' ? 5 : style === 'warehouse' ? 9 : 4.5, seed, STYLE_ID[style] ?? 0, 0);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uIM = { value: u1 }; sh.uniforms.uIM2 = { value: u2 }; sh.uniforms.uDentA = { value: DENT_A }; sh.uniforms.uDentB = { value: DENT_B };
    sh.vertexShader = VERT_DECL + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vIMWorld = (modelMatrix * vec4(transformed, 1.0)).xyz; vIMNormal = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = FRAG_DECL + sh.fragmentShader
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  for (int i = 0; i < 24; i++) { vec4 da = uDentA[i]; vec4 db = uDentB[i]; if (db.w < 0.5) continue; vec3 dn = vec3(db.x, 0.0, db.y); vec3 dd = vIMWorld - da.xyz;
    if (abs(dot(dd, dn)) < 0.003 && dot(normalize(vIMNormal), dn) > 0.9) { vec3 dt = vec3(-dn.z, 0.0, dn.x); if (abs(dot(dd, dt)) < da.w && abs(dd.y) < db.z) discard; } } // crushed section: the deformed patch is drawn instead`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
  float imWin = 0.0; vec3 imCol = vec3(0.0);
  #if defined(USE_METALNESSMAP) && defined(USE_MAP)
    imWin = step(0.6, texelMetalness.b);
    if (imWin > 0.5) { float night = clamp(emissive.r, 0.0, 1.0); float lit; vec3 room = imRoom(vMapUv, lit, night);
      #ifdef USE_EMISSIVEMAP
        lit = max(lit * 0.0, step(0.08, dot(texture2D(emissiveMap, vEmissiveMapUv).rgb, vec3(0.33))));
      #endif
      vec3 warm = vec3(1.0, 0.86, 0.62); imCol = room * ((1.0 - night) * 0.62 + night * (lit * 1.2 * warm + 0.02));
      diffuseColor.rgb *= 0.02; metalnessFactor *= 0.18; roughnessFactor = min(roughnessFactor, 0.1); }
  #endif`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  if (imWin > 0.5) totalEmissiveRadiance = imCol;');
  };
  mat.customProgramCacheKey = () => 'interiorMap1';
  return mat;
}
