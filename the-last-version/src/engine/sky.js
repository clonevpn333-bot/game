// Procedural sky dome: gradient atmosphere, sun disk + halo, layered fbm clouds.
import * as THREE from 'three';

export function makeSky({ top = 0x1d2b4a, mid = 0xe0763a, horizon = 0xffb070, sunColor = 0xffd7a0, sunDir = new THREE.Vector3(-0.6, 0.08, 0.8), cloud = 0.6, cloudColor = 0x5a4050, storm = 0, radius = 3000 } = {}) {
  const U = {
    uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uHor: { value: new THREE.Color(horizon) },
    uSun: { value: new THREE.Color(sunColor) }, uSunDir: { value: sunDir.clone().normalize() }, uCloud: { value: cloud },
    uCloudCol: { value: new THREE.Color(cloudColor) }, uTime: { value: 0 }, uStorm: { value: storm }, uFlash: { value: 0 }, uRewrite: { value: 0 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position.z = gl_Position.w * 0.99999; }`,
    fragmentShader: `
      uniform vec3 uTop, uMid, uHor, uSun, uSunDir, uCloudCol; uniform float uCloud, uTime, uStorm, uFlash, uRewrite;
      varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ s += a * n(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = mix(uHor, uMid, smoothstep(-0.02, 0.12, y));
        col = mix(col, uTop, smoothstep(0.1, 0.65, y));
        if (y < 0.0) col = mix(uHor, uHor * 0.35, smoothstep(0.0, -0.2, y));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSun * (pow(sd, 900.0) * 30.0 + pow(sd, 18.0) * 0.6 + pow(sd, 4.0) * 0.25) * (1.0 - uStorm * 0.85);
        // clouds on a plane projection
        if (y > 0.0) {
          vec2 uv = d.xz / (y + 0.12) * 0.8 + vec2(uTime * 0.004, uTime * 0.002);
          float c = fbm(uv * 1.3);
          float c2 = fbm(uv * 3.0 + c);
          float cov = smoothstep(1.0 - uCloud, 1.05 - uCloud * 0.6, c * 0.75 + c2 * 0.35);
          vec3 lit = mix(uCloudCol, uSun * 1.2, pow(sd, 3.0) * 0.8 * (1.0 - uStorm));
          vec3 cc = mix(lit, uCloudCol * 0.6, c2 * 0.6);
          col = mix(col, cc, cov * smoothstep(0.0, 0.15, y));
        }
        col += vec3(0.75, 0.8, 1.0) * uFlash * (0.5 + 0.5 * smoothstep(0.0, 0.5, y));
        if (uRewrite > 0.0) {
          // seams of another reality: thin bright cracks across the sky
          float cr = abs(fbm(d.xz * 6.0 + uTime * 0.2) - 0.5);
          col += vec3(0.4, 0.9, 1.0) * smoothstep(0.012, 0.0, cr) * uRewrite * 3.0;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), m);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  mesh.userData.u = U;
  return mesh;
}
