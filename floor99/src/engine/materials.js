// Shared materials + special shaders (molten metal, water, light cones, holograms).
import * as THREE from 'three';
import { panelTextures, hazardTexture, gratingTextures, stageFloorTextures, concreteTextures, tileTextures, detailedSurface } from './textures.js';

const cache = new Map();
export const shaderClock = { value: 0 };
let ENV = null;
export function setEnvMap(env) { ENV = env; }

function std(key, params) {
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshStandardMaterial(params);
  if (ENV && params.envMapIntensity !== 0) { m.envMap = ENV; m.envMapIntensity = params.envMapIntensity ?? 0.6; }
  cache.set(key, m);
  return m;
}
// shared PBR detail maps for simple tinted materials (see textures.detailedSurface)
function surf(kind, n) { const s = detailedSurface(kind); return { map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(n, n), roughnessMap: s.roughnessMap }; }
function cloneRepeat(t, r) { if (!t) return t; const c = t.clone(); c.repeat.set(r, r); c.needsUpdate = true; return c; }

export const Mat = {
  panel(color = '#2b3038', rep = 1) {
    const t = panelTextures(color);
    return std('panel' + color + rep, { map: cloneRepeat(t.map, rep), normalMap: cloneRepeat(t.normalMap, rep), roughnessMap: cloneRepeat(t.roughnessMap, rep), normalScale: new THREE.Vector2(0.8, 0.8), metalness: 0.5, roughness: 0.62 });
  },
  metal(color = '#8a929c', rough = 0.35, metal = 0.9) {
    return std('metal' + color + rough + metal, { color, metalness: metal, roughness: rough, ...surf('metal', 0.14) });
  },
  paint(color = '#d43b3b', rough = 0.45, metal = 0.25) {
    return std('paint' + color + rough + metal, { color, metalness: metal, roughness: rough, ...surf('paint', 0.22) });
  },
  plastic(color = '#eeeeee', rough = 0.5) {
    return std('plastic' + color + rough, { color, metalness: 0.0, roughness: rough, ...surf('paint', 0.08) });
  },
  rubber(color = '#1a1a1e') { return std('rubber' + color, { color, metalness: 0, roughness: 0.9, ...surf('rubber', 0.28) }); },
  glow(color = '#ff2d6f', intensity = 3) {
    return std('glow' + color + intensity, { color: '#000000', emissive: color, emissiveIntensity: intensity, metalness: 0, roughness: 1, envMapIntensity: 0 });
  },
  glass(color = '#9fe6ff', opacity = 0.18) {
    const key = 'glass' + color + opacity;
    if (cache.has(key)) return cache.get(key);
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.05, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.2 });
    if (ENV) m.envMap = ENV;
    cache.set(key, m);
    return m;
  },
  hazard(rep = 1) {
    const t = hazardTexture();
    return std('hazard' + rep, { map: cloneRepeat(t, rep), metalness: 0.3, roughness: 0.6 });
  },
  grate(rep = 1) {
    const t = gratingTextures();
    return std('grate' + rep, { map: cloneRepeat(t.map, rep), normalMap: cloneRepeat(t.normalMap, rep), metalness: 0.8, roughness: 0.5 });
  },
  stage(rep = 1) {
    const t = stageFloorTextures();
    return std('stage' + rep, { map: cloneRepeat(t.map, rep), normalMap: cloneRepeat(t.normalMap, rep), emissiveMap: cloneRepeat(t.emissiveMap, rep), emissive: '#ffffff', emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4, roughnessMap: detailedSurface('metal').roughnessMap });
  },
  concrete(color = '#5a5c60', rep = 1) {
    const t = concreteTextures(color);
    return std('concrete' + color + rep, { map: cloneRepeat(t.map, rep), normalMap: cloneRepeat(t.normalMap, rep), normalScale: new THREE.Vector2(0.35, 0.35), roughnessMap: detailedSurface('concrete').roughnessMap, metalness: 0.05, roughness: 0.9 });
  },
  tile(base, grout, tiles = 8, rep = 1, rough = 0.25) {
    const t = tileTextures(base, grout, tiles);
    return std('tile' + base + grout + tiles + rep + rough, { map: cloneRepeat(t.map, rep), normalMap: cloneRepeat(t.normalMap, rep), metalness: 0.1, roughness: rough });
  },
};

const fogPars = /* glsl */`
  #include <fog_pars_fragment>
`;

// Molten metal / lava: animated, self-lit, crusty
export function moltenMaterial(opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: shaderClock,
      uScale: { value: opts.scale ?? 0.35 },
      uFlow: { value: new THREE.Vector2(opts.flowX ?? 0.05, opts.flowY ?? 0.02) },
      uHot: { value: new THREE.Color(opts.hot ?? '#ffd25a') },
      uMid: { value: new THREE.Color(opts.mid ?? '#ff5a10') },
      uCrust: { value: new THREE.Color(opts.crust ?? '#2a0700') },
      uIntensity: { value: opts.intensity ?? 2.2 },
    }]),
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime, uScale, uIntensity;
      uniform vec2 uFlow;
      uniform vec3 uHot, uMid, uCrust;
      varying vec3 vWorld;
      ${fogPars}
      vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3))); return fract(sin(p) * 43758.5453); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      // voronoi: returns (distance to nearest cell edge, cell id)
      vec2 voronoi(vec2 x){
        vec2 n = floor(x), f = fract(x);
        vec2 mg, mr; float md = 8.0; float id = 0.0;
        for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.45 * sin(uTime * 0.35 + 6.2831 * o);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < md) { md = d; mr = r; mg = g; id = hash(n + g); }
        }
        md = 8.0;
        for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++) {
          vec2 g = mg + vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          o = 0.5 + 0.45 * sin(uTime * 0.35 + 6.2831 * o);
          vec2 r = g + o - f;
          if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
        }
        return vec2(md, id);
      }
      void main(){
        vec2 p = vWorld.xz * uScale * 2.6 + uFlow * uTime;
        p += vec2(fbm(p * 0.6 + uTime * 0.05), fbm(p * 0.6 - uTime * 0.04)) * 0.9;
        vec2 v = voronoi(p);
        float edge = v.x;
        float crack = 1.0 - smoothstep(0.0, 0.05, edge);       // white-hot seams
        float glow = 1.0 - smoothstep(0.0, 0.2, edge);        // orange halo around seams
        float n = fbm(p * 2.5 + v.y * 10.0);
        // cooled crust plates: dark red-brown with mottling, some plates hotter than others
        float heat = 0.25 + 0.75 * smoothstep(0.2, 1.0, v.y + n * 0.4);
        vec3 col = uCrust * (0.5 + n * 0.9) + uMid * 0.18 * heat * (0.5 + n);
        col = mix(col, uMid * 1.25, glow * glow * 0.9);
        col = mix(col, uHot * 2.2, crack);
        float pulse = 0.88 + 0.12 * sin(uTime * 2.3 + v.y * 20.0);
        gl_FragColor = vec4(col * uIntensity * 0.5 * pulse, 1.0);
        #include <fog_fragment>
      }
    `,
    fog: true,
  });
  return m;
}

// Stylized water surface
export function waterMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: shaderClock,
      uDeep: { value: new THREE.Color(opts.deep ?? '#03304a') },
      uShallow: { value: new THREE.Color(opts.shallow ?? '#1aa6c8') },
      uFoam: { value: new THREE.Color('#d8fbff') },
      uOpacity: { value: opts.opacity ?? 0.78 },
      uChop: { value: opts.chop ?? 1.0 },
    }]),
    vertexShader: /* glsl */`
      uniform float uTime, uChop;
      varying vec3 vWorld; varying vec3 vNormalW;
      #include <fog_pars_vertex>
      void main(){
        vec3 p = position;
        vec4 wp = modelMatrix * vec4(p,1.0);
        float w = sin(wp.x*0.6 + uTime*1.6)*0.06 + sin(wp.z*0.9 - uTime*1.3)*0.05 + sin((wp.x+wp.z)*1.7 + uTime*2.4)*0.02;
        wp.y += w * uChop;
        vWorld = wp.xyz;
        float dx = cos(wp.x*0.6 + uTime*1.6)*0.036 + cos((wp.x+wp.z)*1.7 + uTime*2.4)*0.034;
        float dz = cos(wp.z*0.9 - uTime*1.3)*0.045 + cos((wp.x+wp.z)*1.7 + uTime*2.4)*0.034;
        vNormalW = normalize(vec3(-dx*uChop, 1.0, -dz*uChop));
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime, uOpacity;
      uniform vec3 uDeep, uShallow, uFoam;
      varying vec3 vWorld; varying vec3 vNormalW;
      ${fogPars}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = normalize(vNormalW + vec3(noise(vWorld.xz*3.0+uTime)*0.15-0.075, 0.0, noise(vWorld.zx*3.0-uTime)*0.15-0.075));
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(uShallow, uDeep, 0.55);
        // caustic-ish sparkle
        float c = noise(vWorld.xz * 2.2 + uTime * 0.7) * noise(vWorld.xz * 3.1 - uTime * 0.5);
        col += uFoam * smoothstep(0.45, 0.7, c) * 0.35;
        // sky/light reflection
        vec3 L = normalize(vec3(0.3, 1.0, 0.2));
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(N, H), 0.0), 80.0);
        col += vec3(1.0) * spec * 1.4;
        col = mix(col, vec3(0.75, 0.92, 1.0), fres * 0.6);
        gl_FragColor = vec4(col, mix(uOpacity, 0.97, fres));
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
}

// Additive volumetric light cone (open cylinder), brightness fades along length & at edges.
export function lightConeMaterial(color = '#ffffff', intensity = 0.35) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uTime: shaderClock },
    vertexShader: /* glsl */`
      varying float vY; varying vec3 vN; varying vec3 vV; varying float vDist;
      void main(){
        vY = uv.y;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vDist = distance(cameraPosition, wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uIntensity, uTime;
      varying float vY; varying vec3 vN; varying vec3 vV; varying float vDist;
      void main(){
        float edge = pow(abs(dot(vN, vV)), 1.6);
        float fall = pow(vY, 1.4);
        // never veil the screen: beams fade out as the camera gets close to / inside them
        float nearFade = smoothstep(4.0, 18.0, vDist);
        float a = edge * fall * uIntensity * nearFade;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// Hologram material (scanlines + fresnel), for audience holograms & UI in-world
export function hologramMaterial(color = '#38e8ff', opacity = 0.8) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: shaderClock, uOpacity: { value: opacity } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #ifdef USE_INSTANCING
      #endif
      void main(){
        vec4 lp = vec4(position,1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
        vec4 wp = modelMatrix * lp;
        vW = wp.xyz;
        mat3 nm = mat3(modelMatrix);
        #ifdef USE_INSTANCING
          nm = nm * mat3(instanceMatrix);
        #endif
        vN = normalize(nm * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uTime, uOpacity;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), vV));
        float scan = 0.6 + 0.4 * sin(vW.y * 40.0 - uTime * 6.0);
        float a = (0.25 + f * 0.9) * scan * uOpacity;
        gl_FragColor = vec4(uColor * (0.6 + f), a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function getCachedMaterial(key, make) {
  if (cache.has(key)) return cache.get(key);
  const m = make();
  cache.set(key, m);
  return m;
}
