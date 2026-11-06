// The reality bend shared by the GPU (city shaders) and CPU (vehicles,
// camera): beyond a start line the world wraps around a horizontal axis like
// a page curling upward; buildings near the avenue lean in ("fold").
import * as THREE from 'three';

export const WARP = {
  uniforms: {
    uBend: { value: new THREE.Vector4(0, 1e6, 1e5, 0) }, // x: on(0/1), y: start z, z: radius R, w: time
    uFold: { value: new THREE.Vector4(0, 0, 0, 0) },      // x: amount, y: avenue x, z: from z, w: shatter
    uVersion: { value: new THREE.Vector4(0, 0, 0, 0) },   // x: amount, yz: centre xz, w: radius
  },
  set bend(v) { this.uniforms.uBend.value.x = v; },
};

export const WARP_GLSL = /* glsl */`
uniform vec4 uBend; uniform vec4 uFold; uniform vec4 uVersion;
vec3 tlvFold(vec3 p) {
  if (uFold.x > 0.0) {
    float side = sign(uFold.y - p.x);
    float nearAve = exp(-pow(abs(p.x - uFold.y) / 140.0, 2.0));
    float ramp = smoothstep(uFold.z - 250.0, uFold.z + 150.0, p.z);
    p.x += side * uFold.x * p.y * p.y * 0.0011 * nearAve * ramp;
    p.y -= uFold.x * p.y * p.y * 0.0002 * nearAve * ramp;
  }
  return p;
}
vec3 tlvBend(vec3 p) {
  if (uBend.x > 0.0 && p.z > uBend.y) {
    float R = uBend.z;
    float th = (p.z - uBend.y) / R;
    float rr = R - p.y;
    p.z = uBend.y + rr * sin(th);
    p.y = R - rr * cos(th);
  }
  return p;
}
vec3 tlvWarp(vec3 p) { return tlvBend(tlvFold(p)); }
`;

/** Replace three's project_vertex so world positions are warped. */
export function warpVertex(sh, { fold = false } = {}) {
  Object.assign(sh.uniforms, WARP.uniforms);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\n' + WARP_GLSL)
    .replace('#include <project_vertex>', `
      vec4 tlvLocal = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        tlvLocal = instanceMatrix * tlvLocal;
      #endif
      vec4 tlvW = modelMatrix * tlvLocal;
      tlvW.xyz = ${fold ? 'tlvWarp(tlvW.xyz)' : 'tlvBend(tlvW.xyz)'};
      vec4 mvPosition = viewMatrix * tlvW;
      gl_Position = projectionMatrix * mvPosition;`);
}

/** Attach the warp to any material (keeps any existing onBeforeCompile). */
export function warpMaterial(m, opts = {}) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); warpVertex(sh, opts); };
  const prevKey = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|warp' + (opts.fold ? 'f' : '');
  m.needsUpdate = true;
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
/** CPU version: warped position and the pitch the bend adds at that point. */
export function warpPoint(p, out = new THREE.Vector3()) {
  const b = WARP.uniforms.uBend.value;
  out.copy(p);
  let pitch = 0;
  if (b.x > 0 && p.z > b.y) {
    const R = b.z, th = (p.z - b.y) / R, rr = R - p.y;
    out.z = b.y + rr * Math.sin(th); out.y = R - rr * Math.cos(th);
    pitch = th;
  }
  return { p: out, pitch };
}

/** Apply the bend to an object driven by unwarped physics (pos, yaw). */
export function placeWarped(obj, pos, yaw, extraPitch = 0, extraRoll = 0) {
  const { p, pitch } = warpPoint(pos, obj.position);
  // rotate about the world X axis by -pitch (the surface tilts up toward +z)
  _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
  obj.quaternion.setFromEuler(_e.set(extraPitch, yaw, extraRoll, 'YXZ')).premultiply(_q);
  return pitch;
}
