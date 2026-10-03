// "What would you see falling into a black hole?" — 3D layer, seeked from HyperFrames time.
import {
  THREE, RoundedBoxGeometry, W, H, clamp, lerp, seg, eio, eo, eo5, ei, back, jiggle, rng, V3, vlerp, keys,
  makeRenderer, INK, INK_CSS, withInk, inkMat, canvasTex, makeStage, makeCamera, aim, anchorTo, worldOf,
  glowTex, makeSmoke, makeBlob, BLOB_BASE, runShots,
} from "./lib.js";

const TOTAL = window.TIMING.total;
const canvas = document.getElementById("gl");
const { renderer, env: ENV } = makeRenderer(canvas, { exposure: 1.05, shadows: false });
renderer.autoClear = false;

// ================================================================== the black hole ray-marcher
// Null geodesics in Schwarzschild (rs = 1): a = -1.5 h^2 r / |r|^5. Disk in the BH's xz plane.
const BH = {
  pos: V3(0, 7.5, -42),
  rs: 2.6,
  tilt: new THREE.Matrix3(),
};
{
  const m = new THREE.Matrix4().makeRotationX(0.2).multiply(new THREE.Matrix4().makeRotationZ(-0.12));
  BH.tilt.setFromMatrix4(m);
}
const bhRT = new THREE.WebGLRenderTarget(540, 960, { type: THREE.HalfFloatType });
const bhMat = new THREE.ShaderMaterial({
  uniforms: {
    uCamPos: { value: V3() },
    uCamMat: { value: new THREE.Matrix3() },
    uTan: { value: 0.36 },
    uAspect: { value: W / H },
    uBhPos: { value: BH.pos },
    uRs: { value: BH.rs },
    uTilt: { value: BH.tilt },
    uTime: { value: 0 },
    uDisk: { value: 1 },
    uExposure: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform vec3 uCamPos; uniform mat3 uCamMat; uniform float uTan; uniform float uAspect;
    uniform vec3 uBhPos; uniform float uRs; uniform mat3 uTilt; uniform float uTime; uniform float uDisk; uniform float uExposure;
    float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
    vec3 stars(vec3 d){
      vec3 col = vec3(0.0);
      // nebula band
      float band = exp(-pow(dot(d, normalize(vec3(0.3,1.0,0.2)))*3.0, 2.0));
      float n = noise(d*3.0)*0.6 + noise(d*7.0)*0.3 + noise(d*15.0)*0.1;
      col += band * n * n * vec3(0.10,0.04,0.16) * 0.5;
      col += noise(d*2.0+4.0) * vec3(0.004,0.006,0.014);
      for (int k=0;k<2;k++){
        float sc = k==0 ? 90.0 : 220.0;
        vec3 c = floor(d*sc); vec3 f = fract(d*sc)-0.5;
        float h = hash(c + float(k)*7.1);
        if (h > (k==0 ? 0.985 : 0.992)){
          vec3 o = vec3(hash(c+1.3),hash(c+2.7),hash(c+5.1))-0.5;
          float dd = length(f - o*0.6);
          float b = smoothstep(0.22, 0.0, dd) * (k==0?2.2:1.2) * (0.4+h);
          vec3 tint = mix(vec3(0.7,0.8,1.0), vec3(1.0,0.85,0.6), hash(c+9.0));
          col += tint*b;
        }
      }
      return col;
    }
    vec3 diskColor(vec3 p, float r, vec3 v){
      float rin = 3.0, rout = 10.0;
      if (r < rin || r > rout) return vec3(-1.0);
      float x = (r - rin)/(rout - rin);
      float ang = atan(p.z, p.x);
      float omega = 1.8 / pow(r, 1.5);
      float a2 = ang + uTime*omega*6.0;
      float swirl = noise(vec3(cos(a2)*r*1.2, sin(a2)*r*1.2, r*3.0)) * 0.55 + noise(vec3(r*6.0, a2*3.0, 1.0))*0.45;
      float rings = 0.6 + 0.4*sin(r*7.0 + swirl*4.0);
      float I = pow(1.0 - x, 1.6) * smoothstep(0.0, 0.08, x) * (0.5 + 0.8*swirl) * rings;
      // doppler beaming: gas orbits counter-clockwise in xz
      vec3 vel = normalize(vec3(-p.z, 0.0, p.x));
      float beam = 1.0 + 0.85*dot(vel, -normalize(v));
      beam = pow(max(beam, 0.05), 2.2);
      vec3 hot = vec3(1.0, 0.97, 1.0);
      vec3 mid = vec3(0.45, 0.78, 1.0);
      vec3 cool = vec3(0.72, 0.22, 1.0);
      vec3 red = vec3(1.0, 0.12, 0.32);
      vec3 c = mix(hot, mid, smoothstep(0.0, 0.18, x));
      c = mix(c, cool, smoothstep(0.18, 0.5, x));
      c = mix(c, red, smoothstep(0.5, 1.0, x));
      return c * I * beam * 1.55;
    }
    void main(){
      vec2 ndc = vUv*2.0-1.0;
      vec3 rd = normalize(uCamMat * normalize(vec3(ndc.x*uTan*uAspect, ndc.y*uTan, -1.0)));
      // into BH frame (rs = 1)
      vec3 p = uTilt * ((uCamPos - uBhPos) / uRs);
      vec3 v = uTilt * rd;
      vec3 h = cross(p, v); float h2 = dot(h,h);
      vec3 col = vec3(0.0); float trans = 1.0; bool captured = false;
      for (int i=0;i<260;i++){
        float r2 = dot(p,p); float r = sqrt(r2);
        if (r < 1.0){ captured = true; break; }
        if (r > 80.0 && dot(p, v) > 0.0) break;
        float dt = clamp(0.06*r, 0.015, 2.5);
        vec3 a = -1.5 * h2 * p / (r2*r2*r);
        vec3 pn = p + v*dt + 0.5*a*dt*dt;
        v += a*dt;
        if (uDisk > 0.0 && p.y*pn.y < 0.0){
          float k = p.y/(p.y-pn.y);
          vec3 q = mix(p, pn, k);
          vec3 dc = diskColor(q, length(q), v);
          if (dc.x >= 0.0){
            float al = clamp(length(dc)*0.8, 0.0, 0.95) * uDisk;
            col += trans * dc * uDisk;
            trans *= (1.0 - al);
          }
        }
        p = pn;
      }
      if (!captured) col += trans * stars(normalize(v));
      // photon-ring glow hint near the shadow edge
      col *= uExposure;
      col = vec3(1.0) - exp(-col*1.1);
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
});
const quadGeo = new THREE.PlaneGeometry(2, 2);
const bhScene = new THREE.Scene();
bhScene.add(new THREE.Mesh(quadGeo, bhMat));
const bhCam = new THREE.Camera();
const blitMat = new THREE.MeshBasicMaterial({ map: bhRT.texture, toneMapped: false, depthTest: false, depthWrite: false });
const blitScene = new THREE.Scene();
const blit = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
blit.material.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace("#include <project_vertex>", "gl_Position = vec4(position.xy, 0.0, 1.0);");
};
blitScene.add(blit);
function drawBlackHole(r, cam, t, { disk = 1, exposure = 1 } = {}) {
  cam.updateMatrixWorld();
  bhMat.uniforms.uCamPos.value.copy(cam.position);
  bhMat.uniforms.uCamMat.value.setFromMatrix4(cam.matrixWorld);
  bhMat.uniforms.uTan.value = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  bhMat.uniforms.uTime.value = t;
  bhMat.uniforms.uDisk.value = disk;
  bhMat.uniforms.uExposure.value = exposure;
  r.setRenderTarget(bhRT);
  r.clear();
  r.render(bhScene, bhCam);
  r.setRenderTarget(null);
  r.clear();
  r.render(blitScene, bhCam);
}

// ================================================================== the astronaut
const highlightTex = canvasTex(256, 256, (c) => {
  c.strokeStyle = "rgba(255,255,255,0.9)";
  c.lineCap = "round";
  c.lineWidth = 16;
  c.beginPath();
  c.arc(128, 128, 96, Math.PI * 1.05, Math.PI * 1.45);
  c.stroke();
  c.lineWidth = 9;
  c.beginPath();
  c.arc(128, 128, 96, Math.PI * 1.52, Math.PI * 1.6);
  c.stroke();
});
function makeAstronaut() {
  const a = makeBlob({ color: 0xf1f3f8, footColor: 0x8d97ab, sheen: 0xffffff, rough: 0.5 });
  a.base = { blush: 0.75 };
  const grey = new THREE.MeshPhysicalMaterial({ color: 0x8d97ab, roughness: 0.4, clearcoat: 0.5 });
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 64, 48),
    new THREE.MeshPhysicalMaterial({ color: 0xd8ecff, transparent: true, opacity: 0.16, roughness: 0.02, clearcoat: 1, envMapIntensity: 2.5, depthWrite: false }),
  );
  helmet.position.y = BLOB_BASE + 0.32;
  helmet.scale.set(1.1, 1.0, 1.08);
  helmet.renderOrder = 4;
  a.squash.add(helmet);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.1, 16, 64), grey);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = BLOB_BASE - 0.36;
  collar.scale.set(1.06, 1.0, 1.0);
  withInk(collar, 0.02);
  a.squash.add(collar);
  const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: highlightTex, transparent: true, depthWrite: false, opacity: 0.9 }));
  hl.scale.set(1.9, 1.9, 1);
  hl.position.set(0, BLOB_BASE + 0.32, 0.5);
  hl.renderOrder = 6;
  a.squash.add(hl);
  const pack = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.2, 0.55, 4, 0.16), new THREE.MeshPhysicalMaterial({ color: 0xe4e8f0, roughness: 0.5, clearcoat: 0.4 }));
  pack.position.set(0, BLOB_BASE - 0.05, -0.92);
  withInk(pack, 0.025);
  a.squash.add(pack);
  const flames = [];
  for (const sx of [-0.3, 0.3]) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.22, 20), grey);
    n.position.set(sx, BLOB_BASE - 0.72, -0.95);
    withInk(n, 0.015);
    a.squash.add(n);
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a3c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    f.position.set(sx, BLOB_BASE - 1.0, -0.95);
    a.squash.add(f);
    flames.push(f);
  }
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.3, 0.12, 3, 0.05), grey);
  panel.position.set(0, BLOB_BASE - 0.56, 0.86);
  panel.rotation.x = -0.35;
  withInk(panel, 0.015);
  a.squash.add(panel);
  [0xff5a6a, 0xffd23f, 0x5fe0b0].forEach((col, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }));
    b.position.set(-0.17 + i * 0.17, 0.02, 0.07);
    panel.add(b);
  });
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), grey);
  ant.position.set(0.35, BLOB_BASE + 1.38, -0.1);
  ant.rotation.z = -0.25;
  a.squash.add(ant);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff3a4a, emissive: 0xff3a4a, emissiveIntensity: 1.5 }));
  bulb.position.set(0.41, BLOB_BASE + 1.6, -0.1);
  a.squash.add(bulb);
  a.flames = flames;
  a.bulb = bulb;
  a.helmet = helmet;
  return a;
}

// a floating 3D clock (canvas dial + real hands)
function makeClock(color = "#ffffff") {
  const g = new THREE.Group();
  const dial = canvasTex(512, 512, (c) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(256, 256, 250, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = INK_CSS;
    c.lineCap = "round";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      c.lineWidth = big ? 14 : 5;
      c.beginPath();
      c.moveTo(256 + Math.cos(a) * (big ? 190 : 210), 256 + Math.sin(a) * (big ? 190 : 210));
      c.lineTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232);
      c.stroke();
    }
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.22, 64), new THREE.MeshPhysicalMaterial({ color: 0xffd23f, roughness: 0.3, clearcoat: 1 }));
  body.rotation.x = Math.PI / 2;
  withInk(body, 0.04);
  g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.88, 64), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.4 }));
  face.position.z = 0.115;
  g.add(face);
  const handMat = new THREE.MeshStandardMaterial({ color: INK });
  const mk = (len, w) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, len, 0.04, 2, w / 2.2), handMat);
    m.position.y = len / 2 - 0.08;
    piv.add(m);
    piv.position.z = 0.15;
    g.add(piv);
    return piv;
  };
  const hour = mk(0.45, 0.1);
  const minute = mk(0.68, 0.07);
  const second = mk(0.78, 0.03);
  second.children[0].material = new THREE.MeshStandardMaterial({ color: 0xff4d5e, emissive: 0xff4d5e, emissiveIntensity: 0.3 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 20), handMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.18;
  g.add(cap);
  g.set = (secs) => {
    second.rotation.z = -(secs / 60) * Math.PI * 2;
    minute.rotation.z = -(secs / 3600) * Math.PI * 2;
    hour.rotation.z = -(secs / 43200) * Math.PI * 2;
  };
  return g;
}

// ================================================================== Earth (rendered into a portal bubble)
function fbm(x, y, r) {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let o = 0; o < 5; o++) {
    v += a * (Math.sin(x * f * 1.7 + r[o] * 6) * Math.cos(y * f * 2.3 + r[o + 5] * 6) * 0.5 + Math.sin((x + y) * f * 1.1 + r[o + 10] * 6) * 0.5);
    a *= 0.5;
    f *= 2.03;
  }
  return v;
}
const EARTH = (() => {
  const R = rng(404);
  const rr = Array.from({ length: 20 }, () => R());
  const W2 = 1024;
  const H2 = 512;
  const land = new Float32Array(W2 * H2);
  for (let y = 0; y < H2; y++)
    for (let x = 0; x < W2; x++) {
      const lon = (x / W2) * Math.PI * 2;
      const lat = (y / H2) * Math.PI;
      land[y * W2 + x] = fbm(Math.cos(lon) * 2 + Math.sin(lat), Math.sin(lon) * 2 + Math.cos(lat) * 1.5, rr);
    }
  const day = canvasTex(W2, H2, (c) => {
    const img = c.createImageData(W2, H2);
    for (let i = 0; i < W2 * H2; i++) {
      const v = land[i];
      const y = Math.floor(i / W2) / H2;
      let col;
      if (v > 0.12) {
        const g = clamp((v - 0.12) * 3);
        col = [lerp(92, 196, g * 0.6), lerp(170, 160, g), lerp(80, 110, g)];
      } else {
        const d = clamp((0.12 - v) * 2.5);
        col = [lerp(60, 18, d), lerp(150, 70, d), lerp(210, 160, d)];
      }
      const pole = clamp((Math.abs(y - 0.5) - 0.42) * 14);
      col = col.map((cc) => lerp(cc, 245, pole));
      img.data.set([col[0], col[1], col[2], 255], i * 4);
    }
    c.putImageData(img, 0, 0);
  });
  // city lights: alpha holds the "year" each light appears
  const lights = canvasTex(
    W2,
    H2,
    (c) => {
      const R2 = rng(77);
      for (let k = 0; k < 9000; k++) {
        const x = Math.floor(R2() * W2);
        const y = Math.floor(H2 * 0.15 + R2() * H2 * 0.7);
        if (land[y * W2 + x] < 0.14) continue;
        const born = R2();
        const s = 0.6 + R2() * 1.0;
        c.fillStyle = `rgba(255,${200 + Math.floor(R2() * 40)},120,${(0.05 + born * 0.95).toFixed(3)})`;
        c.fillRect(x, y, s > 1.2 ? 2 : 1, 1);
      }
    },
    { srgb: false },
  );
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(0, 0.4, 6.2);
  cam.lookAt(0, 0, 0);
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(5, 1, 3);
  scene.add(sun, new THREE.AmbientLight(0x223355, 0.25));
  const uGrowth = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ map: day, emissiveMap: lights, emissive: 0xffc070, emissiveIntensity: 1.3, roughness: 0.7 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uGrowth = uGrowth;
    s.fragmentShader = "uniform float uGrowth;\n" + s.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `vec4 emC = texture2D( emissiveMap, vEmissiveMapUv );
       float nightSide = 1.0;
       totalEmissiveRadiance *= emC.rgb * step(emC.a, uGrowth) * nightSide;`,
    );
  };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.5, 96, 64), mat);
  earth.rotation.z = 0.41;
  scene.add(earth);
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.53, 64, 48),
    new THREE.MeshStandardMaterial({
      transparent: true,
      depthWrite: false,
      alphaMap: canvasTex(512, 256, (c, w, h) => {
        const R3 = rng(8);
        c.fillStyle = "#000";
        c.fillRect(0, 0, w, h);
        for (let k = 0; k < 160; k++) {
          const x = R3() * w;
          const y = h * 0.1 + R3() * h * 0.8;
          const g = c.createRadialGradient(x, y, 0, x, y, 10 + R3() * 30);
          g.addColorStop(0, "rgba(255,255,255,0.7)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g;
          c.fillRect(x - 40, y - 40, 80, 80);
        }
      }),
      color: 0xffffff,
    }),
  );
  earth.add(clouds);
  // seasonal ice caps
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.4, transparent: true, opacity: 0.95 });
  const capN = new THREE.Mesh(new THREE.SphereGeometry(1.515, 48, 16, 0, Math.PI * 2, 0, 0.5), iceMat);
  const capS = new THREE.Mesh(new THREE.SphereGeometry(1.515, 48, 16, 0, Math.PI * 2, Math.PI - 0.5, 0.5), iceMat);
  earth.add(capN, capS);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.62, 64, 48), new THREE.MeshBasicMaterial({ color: 0x6fc8ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
  scene.add(atm);
  const pts = new THREE.BufferGeometry();
  const R4 = rng(5);
  const arr = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const v = V3(R4() - 0.5, R4() - 0.5, R4() - 0.5).normalize().multiplyScalar(40);
    arr.set([v.x, v.y, v.z], i * 3);
  }
  pts.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const starPts = new THREE.Points(pts, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, sizeAttenuation: true }));
  scene.add(starPts);
  const rt = new THREE.WebGLRenderTarget(1024, 1024, { type: THREE.HalfFloatType });
  function setYears(y) {
    // y = years elapsed (0 .. ~400): spin, clouds, flickering seasons, spreading cities
    earth.rotation.y = y * 2.1;
    clouds.rotation.y = y * 0.7;
    const season = Math.sin(y * Math.PI * 2 * 0.9);
    const q = (v) => Math.round(v * 50) / 50;
    capN.geometry = capGeo(q(0.25 + 0.3 * (0.75 + 0.35 * season)), false);
    capS.geometry = capGeo(q(0.25 + 0.3 * (0.75 - 0.35 * season)), true);
    uGrowth.value = clamp(y / 320);
    starPts.rotation.y = y * 0.02;
    sun.position.set(Math.cos(y * 0.6) * 5, 1, Math.sin(y * 0.6) * 5 + 2);
  }
  const capCache = new Map();
  function capGeo(th, south) {
    const key = (south ? "s" : "n") + th.toFixed(2);
    if (!capCache.has(key)) capCache.set(key, new THREE.SphereGeometry(1.515, 48, 12, 0, Math.PI * 2, south ? Math.PI - th : 0, th));
    return capCache.get(key);
  }
  function render(r, years) {
    setYears(years);
    r.setRenderTarget(rt);
    r.setClearColor(0x05040c, 1);
    r.clear();
    r.render(scene, cam);
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 0);
  }
  return { rt, render, cam, scene };
})();

function makePortal(rt) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ map: rt.texture }));
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 20, 96), new THREE.MeshPhysicalMaterial({ color: 0x7fe9ff, emissive: 0x2fb8ff, emissiveIntensity: 0.8, roughness: 0.2 }));
  withInk(ring, 0.03);
  g.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x5fd8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(3.4, 3.4, 1);
  glow.position.z = -0.05;
  g.add(glow);
  return g;
}


// ================================================================== INSANITY LAYER
// A full-frame post pass: screen-space lensing + swirl around the hole, RGB split, zoom blur toward
// the centre, shake, grain, and JJK-style impact frames (inverted / duotone strobes).
const fbTex = new THREE.FramebufferTexture(W, H);
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: fbTex },
    uC: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: W / H },
    uE: { value: 0 },
    uSwirl: { value: 0 },
    uCA: { value: 0 },
    uBlur: { value: 0 },
    uTaps: { value: 1 },
    uInv: { value: 0 },
    uDuo: { value: 0 },
    uDuoCol: { value: new THREE.Color(1, 1, 1) },
    uShake: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uVig: { value: 0.5 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex; uniform vec2 uC; uniform float uAspect; uniform float uE; uniform float uSwirl;
    uniform float uCA; uniform float uBlur; uniform int uTaps; uniform float uInv; uniform float uDuo; uniform vec3 uDuoCol;
    uniform vec2 uShake; uniform float uTime; uniform float uVig;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec2 warp(vec2 uv){
      vec2 d = uv - uC; d.x *= uAspect;
      float r = length(d) + 1e-4;
      float k = 1.0 - (uE*uE)/(r*r + 0.0003);
      k = max(k, -2.0);
      vec2 s = d * k;
      float ang = uSwirl / (r*7.0 + 0.12);
      float c = cos(ang), sn = sin(ang);
      s = vec2(c*s.x - sn*s.y, sn*s.x + c*s.y);
      s.x /= uAspect;
      return uC + s;
    }
    vec3 samp(vec2 uv){
      vec2 m = 1.0 - abs(fract(uv*0.5)*2.0 - 1.0); // identity inside [0,1], mirror-wrap past the edges
      return texture2D(uTex, m).rgb;
    }
    void main(){
      vec2 uv = vUv + uShake;
      vec2 w = warp(uv);
      vec3 col = vec3(0.0);
      float n = 0.0;
      for (int i = 0; i < 14; i++){
        if (i >= uTaps) break;
        float f = uTaps > 1 ? float(i)/float(uTaps-1) : 0.0;
        vec2 base = mix(w, uC, uBlur * f * f);
        vec2 dir = base - uC;
        col.r += samp(uC + dir*(1.0 + uCA)).r;
        col.g += samp(base).g;
        col.b += samp(uC + dir*(1.0 - uCA)).b;
        n += 1.0;
      }
      col /= n;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(col, 1.0 - col, uInv);
      float ll = mix(l, 1.0 - l, uInv);
      float th = smoothstep(0.30, 0.42, ll);
      vec3 duo = mix(vec3(0.02,0.0,0.035), uDuoCol, th);
      col = mix(col, duo, uDuo);
      vec2 q = vUv - 0.5;
      col *= 1.0 - uVig * dot(q, q) * 2.4;
      col += (hash(floor(vUv*vec2(540.0,960.0)) + fract(uTime*7.31)) - 0.5) * 0.07;
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
const IMPACTS = [
  [0.0, 0.1, "inv"], [0.1, 0.07, "duo"],
  [3.78, 0.08, "inv"], [3.86, 0.06, "red"],
  [6.73, 0.07, "duo"],
  [9.6, 0.06, "inv"],
  [17.2, 0.06, "red"],
  [25.0, 0.05, "inv"],
  [25.55, 0.07, "inv"], [25.62, 0.05, "duo"],
  [26.03, 0.08, "red"],
  [29.85, 0.07, "inv"], [29.92, 0.05, "red"],
  [31.6, 0.06, "inv"], [31.7, 0.05, "duo"], [31.82, 0.06, "inv"], [31.95, 0.05, "red"],
  [35.05, 0.08, "inv"],
  [37.07, 0.07, "duo"],
  [40.46, 0.07, "inv"],
  [42.33, 0.06, "red"],
  [44.19, 0.06, "inv"],
  [51.08, 0.06, "inv"], [51.15, 0.05, "red"], [51.22, 0.06, "inv"],
];
window.__IMPACTS = IMPACTS;
const CUTS = [1.6, 4.6, 10.6, 15.0, 19.85, 25.0, 35.0, 37.07, 40.46, 42.33];
const K_E = [[0, 0.06], [1.5, 0.01], [4.6, 0.012], [10.6, 0.006], [15, 0.01], [25, 0.012], [28, 0.05], [33.3, 0.15], [35, 0.04], [45, 0.06], [51.4, 0.13]];
const K_SW = [[0, 1.1], [1.5, 0.08], [4.6, 0.1], [10.6, 0.05], [15, 0.08], [25, 0.15], [28, 0.6], [33.3, 2.4], [35, 3.6], [35.6, 0.5], [45, 0.9], [51.3, 2.8]];
const K_CA = [[0, 0.035], [1.6, 0.008], [10.6, 0.004], [25, 0.012], [33.3, 0.045], [35, 0.06], [35.6, 0.006], [46, 0.01], [51.3, 0.05]];
const K_BL = [[0, 0.5], [1.4, 0.05], [4.6, 0.04], [10.6, 0.012], [15, 0.02], [25, 0.06], [30, 0.14], [33.3, 0.32], [35, 0.75], [35.4, 0.025], [46, 0.04], [48.5, 0.14], [51.3, 0.55]];
const K_SH = [[0, 0.005], [2, 0.0012], [24, 0.0018], [33, 0.012], [35, 0.003], [48, 0.004], [51.3, 0.012]];
const lin = (k) => k;
function FX(t) {
  let E = keys(t, K_E, lin);
  let sw = keys(t, K_SW, lin) * (1 + 0.18 * Math.sin(t * 3.1));
  let ca = keys(t, K_CA, lin);
  let bl = keys(t, K_BL, lin);
  const sh = keys(t, K_SH, lin);
  CUTS.forEach((c) => {
    const g = Math.exp(-Math.pow((t - c) / 0.11, 2));
    bl += 0.35 * g;
    ca += 0.03 * g;
    sw += 0.8 * g;
  });
  let inv = 0;
  let duo = 0;
  let col = [1, 1, 1];
  for (const [a, d, kind] of IMPACTS) {
    if (t >= a && t < a + d) {
      if (kind === "inv") {
        inv = 1;
        duo = 0.85;
        col = [1, 1, 1];
      } else if (kind === "duo") {
        duo = 1;
        col = [0.78, 0.4, 1.0];
      } else {
        duo = 1;
        col = [1.0, 0.18, 0.25];
      }
      bl += 0.12;
      ca += 0.03;
    }
  }
  return { E, sw, ca, bl, sh, inv, duo, col };
}
const _pc = new THREE.Vector3();
function postFX(r, cam, t, center3) {
  const fx = FX(t);
  const U = postMat.uniforms;
  let vis = 1;
  if (center3) {
    _pc.copy(center3).project(cam);
    if (_pc.z < 1) U.uC.value.set(_pc.x * 0.5 + 0.5, _pc.y * 0.5 + 0.5);
    else {
      vis = 0;
      U.uC.value.set(0.5, 0.5);
    }
    const off = Math.max(0, Math.max(Math.abs(U.uC.value.x - 0.5), Math.abs(U.uC.value.y - 0.5)) - 0.5);
    vis *= clamp(1 - off * 2.5);
  }
  U.uE.value = fx.E * vis;
  U.uSwirl.value = fx.sw * vis;
  U.uCA.value = fx.ca;
  U.uBlur.value = fx.bl;
  U.uTaps.value = fx.bl > 0.02 || fx.ca > 0.006 ? 12 : 1;
  U.uInv.value = fx.inv;
  U.uDuo.value = fx.duo;
  U.uDuoCol.value.setRGB(...fx.col);
  U.uShake.value.set(Math.sin(t * 91.7) * fx.sh, Math.cos(t * 73.3) * fx.sh * 0.7);
  U.uTime.value = t;
  U.uVig.value = 0.45 + 0.35 * seg(t, 25, 33);
  r.copyFramebufferToTexture(fbTex);
  r.render(postScene, bhCam);
}

// ---- rocks + debris spiralling into the hole (BH-local orbits, mapped to world)
const BH_INV = new THREE.Matrix4().setFromMatrix3(BH.tilt).transpose();
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const r = rng(seed);
  const off = Array.from({ length: 8 }, () => [r() * 6, r() * 6, r() * 6]);
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let d = 1;
    off.forEach(([a, b, c], k) => (d += 0.12 * Math.sin(v.x * (2 + k) + a) * Math.sin(v.y * (3 + k) + b) * Math.sin(v.z * (2 + k) + c)));
    v.multiplyScalar(d);
    v.y *= 0.8;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
function makeInfall(scene, { rocks = 240, streaks = 520, seed = 1 } = {}) {
  const rg = rockGeo(seed);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7b6b66, roughness: 0.95, flatShading: true, emissive: 0x2a1040, emissiveIntensity: 0.4 });
  const rockM = new THREE.InstancedMesh(rg, rockMat, rocks);
  const inkM = new THREE.InstancedMesh(rg, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), rocks);
  const stM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), streaks);
  const R = rng(seed + 7);
  const col = new THREE.Color();
  const pal = [0xbfe8ff, 0xd9b3ff, 0xff9ad0, 0xffffff, 0x8fd8ff];
  const rk = Array.from({ length: rocks }, () => ({ R0: R() > 0.5 ? 10 + R() * 7 : 21 + R() * 10, u0: R(), rate: 0.025 + R() * 0.04, a0: R() * 6.28, h: (R() - 0.5), s: 0.25 + Math.pow(R(), 3) * 1.6, spin: V3(R() * 3, R() * 3, R() * 3) }));
  const sk = Array.from({ length: streaks }, (_, i) => {
    col.setHex(pal[i % pal.length]);
    stM.setColorAt(i, col);
    return { R0: 6 + R() * 30, u0: R(), rate: 0.08 + R() * 0.12, a0: R() * 6.28, h: (R() - 0.5), w: 0.02 + R() * 0.04 };
  });
  stM.instanceColor.needsUpdate = true;
  scene.add(rockM, inkM, stM);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const vel = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const X = new THREE.Vector3(1, 0, 0);
  function orbit(o, tE, out, outV) {
    const p = (o.u0 + o.rate * tE) % 1;
    const r = lerp(o.R0, 2.4, Math.pow(p, 1.5));
    const a = o.a0 + 2.2 * p + 10 * p * p;
    const h = o.h * o.R0 * 0.18 * (1 - p);
    out.set(Math.cos(a) * r, h, Math.sin(a) * r).multiplyScalar(BH.rs).applyMatrix4(BH_INV).add(BH.pos);
    outV.set(-Math.sin(a), -0.3 * p, Math.cos(a)).applyMatrix4(BH_INV).normalize();
    return p;
  }
  function update(t, power = 1) {
    // time-warp: everything accelerates as we fall
    const tE = t + 0.12 * Math.pow(Math.max(0, t - 24), 2);
    rk.forEach((o, i) => {
      const p = orbit(o, tE, pos, vel);
      const str = 1 + 6 * Math.pow(p, 5);
      const s = p > 0.985 ? 0.0001 : o.s * (1 - 0.3 * p);
      q.setFromUnitVectors(X, vel);
      e.set(o.spin.x * t, o.spin.y * t, o.spin.z * t);
      q.multiply(new THREE.Quaternion().setFromEuler(e));
      sc.set(s * str, s / Math.sqrt(str), s / Math.sqrt(str));
      m4.compose(pos, q, sc);
      rockM.setMatrixAt(i, m4);
      sc.multiplyScalar(1.12);
      m4.compose(pos, q, sc);
      inkM.setMatrixAt(i, m4);
    });
    sk.forEach((o, i) => {
      const p = orbit(o, tE * 1.6, pos, vel);
      const len = (0.6 + 9 * Math.pow(p, 3)) * (0.6 + 0.8 * power);
      q.setFromUnitVectors(X, vel);
      sc.set(len, o.w, o.w);
      if (p > 0.99) sc.setScalar(0.0001);
      m4.compose(pos, q, sc);
      stM.setMatrixAt(i, m4);
    });
    rockM.instanceMatrix.needsUpdate = true;
    inkM.instanceMatrix.needsUpdate = true;
    stM.instanceMatrix.needsUpdate = true;
    stM.material.opacity = 0.35 + 0.6 * power;
  }
  return { update };
}

// ---- purple / red lightning arcs crackling around the horizon
function makeArcs(scene, n = 7) {
  const mats = [0xb06bff, 0xff3a5a, 0x8fd8ff].map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const arcs = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mats[i % 3]);
    scene.add(m);
    return m;
  });
  function update(t, power) {
    const frame = Math.floor(t * 15);
    arcs.forEach((m, i) => {
      const r = rng(frame * 31 + i * 7);
      const on = power > 0.05 && r() < 0.35 + 0.6 * power;
      m.visible = on;
      if (!on) return;
      const a0 = r() * Math.PI * 2;
      const sweep = 0.6 + r() * 1.2;
      const R0 = 2.7 + r() * 1.2;
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const a = a0 + (k / 12) * sweep;
        const rr = R0 + (r() - 0.5) * 0.7;
        pts.push(V3(Math.cos(a) * rr, (r() - 0.5) * 1.1, Math.sin(a) * rr).multiplyScalar(BH.rs).applyMatrix4(BH_INV).add(BH.pos));
      }
      const path = new THREE.CurvePath();
      for (let k = 0; k < pts.length - 1; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
      m.geometry.dispose();
      m.geometry = new THREE.TubeGeometry(path, 48, 0.09 + 0.12 * power, 5, false);
      m.material.opacity = 0.7 + 0.3 * r();
    });
  }
  return { update };
}

// ================================================================== SPACE shot (S1 – S8): astronaut near the hole
const SPACE = (() => {
  const st = makeStage(ENV, { key: 2.6, keyColor: 0xffe2c0, keyPos: [-2, 6, -10], rim: 2.4, rimColor: 0x9fd8ff, hemi: 0.55, hemiSky: 0xcfe0ff, hemiGround: 0x2a1a3a, envI: 0.7, shadow: false });
  const { scene } = st;
  // fill light from the camera side so the face reads
  const fill = new THREE.DirectionalLight(0xdfe8ff, 1.3);
  fill.position.set(2, 2, 8);
  scene.add(fill);
  const cam = makeCamera(40);
  const astro = makeAstronaut();
  scene.add(astro.root);
  const clock = makeClock();
  clock.scale.setScalar(0.62);
  scene.add(clock);
  const portal = makePortal(EARTH.rt);
  scene.add(portal);
  const dust = makeSmoke(40, 0xbfd8ff, 14, 0.6, true, glowTex);
  dust.forEach((d) => scene.add(d));
  const bhLight = new THREE.PointLight(0xb98bff, 2.6, 0, 0);
  bhLight.position.copy(BH.pos);
  scene.add(bhLight);
  const infall = makeInfall(scene, { rocks: 240, streaks: 520, seed: 3 });
  const arcs = makeArcs(scene, 8);
  const aura = makeSmoke(16, 0x7a3bff, 61, 0.55, true);
  const auraDark = makeSmoke(10, 0x1a0628, 62, 0.6, false);
  aura.concat(auraDark).forEach((a) => scene.add(a));
  // the astronaut's body position along the fall
  function astroPos(t) {
    const fall = ei(seg(t, 25.4, 33.6));
    return V3(0, 0, 0).lerp(V3(0, 4.2, -22), fall);
  }
  function update(t) {
    const P = astroPos(t);
    astro.root.position.copy(P);
    const bob = Math.sin(t * 1.3) * 0.08;
    astro.root.position.y += bob * (1 - seg(t, 25, 26));
    // turn toward the hole as we fall
    astro.root.rotation.set(lerp(0.1, 0.7, eio(seg(t, 25.2, 27.5))), lerp(0.35, 0, seg(t, 0, 4)) + Math.sin(t * 0.4) * 0.08, Math.sin(t * 0.7) * 0.06);
    // stretch (spaghettification)
    const stretch = 1 + 1.9 * eio(seg(t, 28.0, 32.4)) + Math.sin(t * 9) * 0.05 * seg(t, 29, 31);
    const flail = seg(t, 25.5, 26.0);
    const pose = {
      t,
      stretch,
      armL: lerp(0.5 + Math.sin(t * 1.7) * 0.15, 2.6 + Math.sin(t * 13) * 0.35, flail),
      armR: lerp(0.5 + Math.cos(t * 1.5) * 0.15, 2.6 + Math.cos(t * 12) * 0.35, flail),
      sq: jiggle(t, 25.1, 0.12, 14, 5),
    };
    if (t > 10.6 && t < 15.0) pose.armR = lerp(0.5, 1.4, eio(seg(t, 10.7, 11.2))) * (1 - seg(t, 14.6, 15)) + 0.5 * seg(t, 14.6, 15);
    astro.pose(pose);
    let face = { time: t, lookX: 0, lookY: -0.2 };
    if (t < 4.6) face = { time: t, eyes: "open", mouth: t < 3.0 ? "smile" : "o", wide: seg(t, 3.0, 3.2), lookY: -0.4, lookX: 0.2 };
    else if (t < 10.6) face = { time: t, mouth: "o", lookY: -0.6, wide: 0.6 };
    else if (t < 15.0) face = { time: t, mouth: "smile", lookX: 0.8, lookY: 0.1 };
    else if (t < 25.0) face = { time: t, mouth: t < 20 ? "o" : "grin", wide: 0.5, lookX: -0.7, lookY: -0.3 };
    else face = { time: t, mouth: "scream", mouthOpen: 0.55 + 0.45 * Math.abs(Math.sin(t * 7)), wide: 1, sad: 0.6, browUp: 1, sweat: seg(t, 26, 27), lookY: -0.8 };
    astro.setFace(face);
    // thrusters on while hovering
    const thrust = (t > 10.4 && t < 25.3 ? 1 : 0.25 * (t < 10.4)) * (0.8 + 0.2 * Math.sin(t * 40));
    astro.flames.forEach((f) => {
      const s = 0.55 * thrust;
      f.scale.set(s * 0.8, s * 1.6, 1);
      f.material.opacity = clamp(thrust);
    });
    astro.bulb.material.emissiveIntensity = Math.sin(t * 6) > 0 ? 2.2 : 0.2;
    // clock: normal ticks (one per second), floats beside the astronaut
    clock.visible = t > 10.5 && t < 25.6;
    clock.position.copy(P).add(V3(-1.55, 2.3 + Math.sin(t * 1.1) * 0.06, 0.5));
    clock.rotation.set(0, 0.2, Math.sin(t) * 0.05);
    const cs = back(seg(t, 10.7, 11.2)) * (1 - seg(t, 25.0, 25.5));
    clock.scale.setScalar(0.62 * Math.max(0.001, cs));
    clock.set(Math.floor(t - 10.6) + 0.15 * Math.pow(seg((t - 10.6) % 1, 0, 0.12), 0.5) + 7 * 3600 + 5 * 60);
    // Earth portal
    const pin = back(seg(t, 15.3, 15.9));
    const big = eio(seg(t, 19.9, 20.6)) * (1 - eio(seg(t, 24.5, 25.1)));
    portal.visible = t > 15.2 && t < 25.1;
    if (portal.visible) {
      const years = Math.pow(Math.max(0, t - 15.6), 1.6) * 18;
      EARTH.render(renderer, years);
    }
    // power: how hard the hole is pulling on everything right now
    const power = clamp(keys(t, [[0, 0.9], [1.6, 0.35], [4.6, 0.4], [10.6, 0.12], [15, 0.2], [25, 0.45], [33.6, 1.0]], (k) => k));
    infall.update(t, power);
    arcs.update(t, t < 1.8 ? 1 : t > 25 ? power : power * 0.5);
    [...aura, ...auraDark].forEach((a, i) => {
      const u = a.userData;
      const on = t > 25.3;
      a.visible = on;
      if (!on) return;
      const life = 0.9;
      const k = ((t * (1.2 + u.r1) + u.r2 * life) % life) / life;
      const away = V3(0, 0, 1).applyQuaternion(astro.root.quaternion);
      a.position.copy(P).add(V3((u.r3 - 0.5) * 1.6, 0.8 + (u.r4 - 0.5) * 1.6 * stretch, 0)).addScaledVector(away, k * 3.5);
      const sc = (0.8 + k * 2.2) * (0.6 + power);
      a.scale.set(sc, sc, 1);
      a.material.opacity = (i < aura.length ? 0.55 : 0.5) * Math.sin(Math.PI * k) * seg(t, 25.3, 26.5);
      a.material.rotation = u.r1 * 6 + t * 2;
    });
    // camera rig
    let camPos;
    let look;
    let fov = 40;
    let roll = 0;
    if (t < 4.6) {
      // hook: warp-speed rush in from deep space, then whip around the astronaut
      const a = lerp(-0.5, 0.35, eio(seg(t, 1.6, 4.6)));
      const orbitPos = V3(Math.sin(a) * 9.6, 1.5 + Math.sin(t * 0.5) * 0.2, Math.cos(a) * 9.6);
      const rush = eo5(seg(t, 0, 1.6));
      camPos = vlerp(V3(3, 9, 80), orbitPos, rush);
      look = vlerp(V3(0, 4, -20), vlerp(V3(0, 1.6, 0), V3(0, 2.6, -6), 0.3), eo(seg(t, 0.4, 1.6)));
      roll = lerp(1.4, -0.12, eo5(seg(t, 0, 1.7))) + lerp(0, 0.15, eio(seg(t, 1.7, 4.6)));
      fov = lerp(85, 40, eo5(seg(t, 0, 1.6)));
    } else if (t < 10.6) {
      // pull back: see the whole ring
      const k = eio(seg(t, 4.6, 10.6));
      camPos = vlerp(V3(1.5, 1.2, 6.8), V3(0.6, -0.4, 14), k);
      look = vlerp(V3(0, 3, -10), V3(0, 4.5, -20), k);
      fov = lerp(40, 46, k);
    } else if (t < 15.0) {
      const k = eio(seg(t, 10.6, 15.0));
      camPos = vlerp(V3(-1.8, 1.7, 10.2), V3(-1.0, 1.6, 9.0), k);
      look = V3(0.6, 1.7, -4);
    } else if (t < 25.0) {
      const k = eio(seg(t, 15.0, 19.9));
      camPos = vlerp(V3(-0.8, 1.6, 8.6), V3(-1.6, 1.8, 9.6), k);
      look = vlerp(V3(0.3, 1.8, -4), V3(0.8, 2.2, -4), k);
      // dive at the portal (cities / seasons)
      const pd = eio(seg(t, 19.8, 20.6)) * (1 - eio(seg(t, 24.4, 25.0)));
      const portalPos = P.clone().add(V3(0.45, 3.3, 0.6));
      camPos = vlerp(camPos, portalPos.clone().add(V3(0, 0, 3.3)), pd);
      look = vlerp(look, portalPos, pd);
    } else {
      // follow the fall from the front-side, the hole looming beyond the feet
      const k = eio(seg(t, 25.0, 26.5));
      const off = vlerp(V3(-1.6, 1.8, 9.6), V3(3.0, 0.9, 8.6), k);
      camPos = P.clone().add(off);
      look = P.clone().add(V3(0, 0.6, -4));
      roll = Math.sin(t * 1.4) * 0.06 * seg(t, 26, 28);
      fov = lerp(40, 48, seg(t, 28, 32));
      // dive through the visor into the eye
      const dk = ei(seg(t, 33.3, 35.0));
      if (dk > 0) {
        const eye = astro.eyeWorld(-1);
        const n = worldOf(astro.body, V3(-0.31, 0.32, 2.0)).sub(eye).normalize();
        camPos = vlerp(camPos, eye.clone().addScaledVector(n, 0.32), dk);
        look = vlerp(look, eye, eo(seg(t, 33.3, 34.2)));
        fov = lerp(fov, 30, dk);
      }
    }
    // whip-roll impulses on every cut + dutch drift
    [4.6, 10.6, 15.0, 25.0].forEach((c) => (roll += jiggle(t, c, 0.35, 16, 6)));
    roll += Math.sin(t * 0.9) * 0.05 + (t > 25 ? Math.sin(t * 2.3) * 0.12 * power : 0);
    aim(cam, camPos, look, fov, roll);
    // portal placement (always facing the camera)
    portal.position.copy(P).add(V3(0.45, 3.3, 0.6));
    portal.quaternion.copy(cam.quaternion);
    portal.scale.setScalar(Math.max(0.001, pin) * lerp(0.9, 1.05, big));
    // passing dust streaks give speed during the fall
    dust.forEach((d) => {
      const u = d.userData;
      const sp = t > 25 ? 6 * ei(seg(t, 25, 30)) : 0.2;
      const z = ((u.r1 * 30 + t * sp) % 30) - 15;
      d.position.set(P.x + (u.r2 - 0.5) * 10, P.y + (u.r3 - 0.5) * 12, P.z - z);
      const s = 0.05 + u.r4 * 0.08;
      d.scale.set(s, s * (1 + sp * 0.6), 1);
    });
    scene.updateMatrixWorld();
    anchorTo("bh-anchor", BH.pos, cam);
    anchorTo("sl-anchor", BH.pos, cam);
    anchorTo("astro-anchor", astro.headWorld(1.6), cam);
    anchorTo("feet-anchor", worldOf(astro.body, V3(0, -1.0, 0)), cam);
    anchorTo("clock-anchor", clock.position.clone().add(V3(0, 0.75, 0)), cam);
    anchorTo("portal-anchor", portal.position.clone().add(V3(0, -1.15 * portal.scale.x, 0)), cam);
  }
  function render(r, t) {
    const disk = 1;
    const exposure = 1 + 0.4 * seg(t, 28, 33);
    drawBlackHole(r, cam, t, { disk, exposure: exposure * (1 + 0.25 * Math.sin(t * 5.3) * seg(t, 25, 33)) });
    r.clearDepth();
    r.render(scene, cam);
    postFX(r, cam, t, BH.pos);
  }
  return { scene, cam, update, render };
})();

// ================================================================== INSIDE REALITY (S9 – S12): the spacetime funnel
const GRID = (() => {
  const scene = new THREE.Scene();
  scene.environment = ENV;
  const cam = makeCamera(44);
  const depth = (r) => -9 / Math.sqrt(r * r + 0.6);
  // funnel: polar mesh
  const RS = 64;
  const AS = 128;
  const Rmax = 26;
  const pos = [];
  const uvs = [];
  const idx = [];
  for (let i = 0; i <= RS; i++) {
    const r = 0.35 + Math.pow(i / RS, 1.6) * Rmax;
    for (let j = 0; j <= AS; j++) {
      const a = (j / AS) * Math.PI * 2;
      pos.push(Math.cos(a) * r, depth(r), Math.sin(a) * r);
      uvs.push(r, j / AS);
    }
  }
  for (let i = 0; i < RS; i++)
    for (let j = 0; j < AS; j++) {
      const a = i * (AS + 1) + j;
      const b = a + AS + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  const gridMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying float vD; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vD; uniform float uTime; uniform float uFlow;
      float line(float x, float w){ float f = abs(fract(x)-0.5); float d = fwidth(x); return 1.0 - smoothstep(w*d, (w+1.5)*d, 0.5 - f + 0.0*d) ; }
      void main(){
        float r = vUv.x; float a = vUv.y;
        float rr = r*1.2 + uFlow;
        float lr = 1.0 - smoothstep(0.0, fwidth(rr)*1.8, abs(fract(rr)-0.5)*-1.0+0.5);
        float aa = a*48.0;
        float la = 1.0 - smoothstep(0.0, fwidth(aa)*1.8, abs(fract(aa)-0.5)*-1.0+0.5);
        float g = max(lr, la);
        float fade = smoothstep(26.0, 14.0, r) * smoothstep(0.35, 1.6, r);
        vec3 col = mix(vec3(0.25,0.95,1.0), vec3(0.85,0.45,1.0), smoothstep(8.0, 1.0, r));
        float glow = g*1.5 + 0.07;
        gl_FragColor = vec4(col*glow*fade, glow*fade);
      }`,
  });
  const funnel = new THREE.Mesh(geo, gridMat);
  scene.add(funnel);
  // glowing debris spiralling down the throat
  const DN = 420;
  const deb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), DN);
  const dR = rng(77);
  const dcol = new THREE.Color();
  const debInfo = Array.from({ length: DN }, (_, i) => {
    dcol.setHex([0x7fe9ff, 0xc08bff, 0xff7ab0, 0xffffff][i % 4]);
    deb.setColorAt(i, dcol);
    return { u0: dR(), rate: 0.06 + dR() * 0.1, a0: dR() * 6.28, R0: 6 + dR() * 20, s: 0.03 + dR() * 0.07 };
  });
  deb.instanceColor.needsUpdate = true;
  scene.add(deb);
  // the abyss at the center
  const abyss = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  abyss.position.y = depth(0.35) - 0.3;
  scene.add(abyss);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xb36bff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(9, 9, 1);
  halo.position.copy(abyss.position);
  scene.add(halo);
  // starfield
  {
    const R = rng(33);
    const arr = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      const v = V3(R() - 0.5, R() - 0.2, R() - 0.5).normalize().multiplyScalar(60 + R() * 40);
      arr.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe6ff, size: 0.35 })));
  }
  // light cones along a radial line: they tip toward the center, then point straight in
  const coneMat = new THREE.MeshPhysicalMaterial({ color: 0xffe27a, emissive: 0xffb02e, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const cones = [];
  const radii = [16, 12, 9, 6.5, 4.5, 3.0, 2.0];
  radii.forEach((r, i) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 32, 1, true), coneMat);
    c.rotation.x = Math.PI; // apex down at the event, opening upward = future
    c.position.y = 0.6;
    g.add(c);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.2;
    g.add(ring);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(dot);
    g.userData = { r, i };
    scene.add(g);
    cones.push(g);
  });
  // world lines spiralling in
  const lines = [];
  const R = rng(9);
  for (let k = 0; k < 14; k++) {
    const a0 = R() * Math.PI * 2;
    const r0 = 10 + R() * 12;
    const turn = 2.5 + R() * 1.5;
    const pts = [];
    for (let s = 0; s <= 80; s++) {
      const u = s / 80;
      const r = lerp(r0, 0.4, Math.pow(u, 0.7));
      const a = a0 + u * turn;
      pts.push(V3(Math.cos(a) * r, depth(r) + 0.08, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.05, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffe27a : 0x7fe9ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    tube.geometry.setDrawRange(0, 0);
    scene.add(tube);
    lines.push(tube);
  }
  // little astronaut sliding in
  const mini = makeAstronaut();
  mini.root.scale.setScalar(0.42);
  scene.add(mini.root);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a1a3a, 1.2));
  const kl = new THREE.DirectionalLight(0xffffff, 1.8);
  kl.position.set(3, 8, 6);
  scene.add(kl);
  function update(t) {
    gridMat.uniforms.uFlow.value = t * 0.9 * seg(t, 38, 42) + t * 0.15;
    // the whole funnel turns into a vortex, faster and faster
    funnel.rotation.y = -(t - 35) * 0.35 - 0.06 * Math.pow(Math.max(0, t - 44), 2);
    {
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const tE = t + 0.08 * Math.pow(Math.max(0, t - 44), 2);
      debInfo.forEach((o, i) => {
        const p = (o.u0 + o.rate * tE) % 1;
        const r = lerp(o.R0, 0.4, Math.pow(p, 1.3));
        const a = o.a0 - 2 * p - 9 * p * p;
        const s = p > 0.97 ? 0.0001 : o.s * (1 + 2 * p);
        m4.compose(V3(Math.cos(a) * r, depth(r) + 0.15, Math.sin(a) * r), q, V3(s, s, s));
        deb.setMatrixAt(i, m4);
      });
      deb.instanceMatrix.needsUpdate = true;
    }
    // light cones tip toward the center (x- direction along the line)
    cones.forEach((g) => {
      const { r, i } = g.userData;
      const tipK = eio(seg(t, 38.6 + i * 0.12, 39.6 + i * 0.12));
      const inside = r < 4.6;
      const tilt = tipK * (inside ? Math.PI / 2 : (Math.PI / 2) * Math.pow(4.6 / r, 1.4) * 0.8);
      g.position.set(r, depth(r) + 0.05, 0);
      g.rotation.set(0, 0, tilt);
      const pop = back(seg(t, 37.9 + i * 0.08, 38.4 + i * 0.08));
      g.scale.setScalar(Math.max(0.001, pop) * lerp(1.0, 0.6, clamp((16 - r) / 14)));
    });
    // world lines draw in on "every path leads there"
    lines.forEach((l, k) => {
      const d = eio(seg(t, 41.7 + k * 0.05, 43.0 + k * 0.05));
      l.geometry.setDrawRange(0, Math.floor(d * l.geometry.index.count));
      l.material.opacity = 0.85 * seg(t, 41.6, 41.9);
    });
    // mini astronaut: tries to swim back, slides in anyway
    const slide = eio(seg(t, 43.2, 51.0));
    const r = lerp(7.5, 0.9, slide);
    const a = slide * 2.2;
    mini.root.position.set(Math.cos(a) * r, depth(r) + 0.05, Math.sin(a) * r);
    mini.root.rotation.set(0, -a + Math.PI / 2 + Math.PI, 0);
    mini.root.visible = t > 43.0;
    const swim = Math.sin(t * 14);
    mini.pose({ t, armL: 2.2 + swim * 0.5, armR: 2.2 - swim * 0.5, stretch: 1 + 0.6 * seg(t, 47, 51), sq: Math.abs(swim) * 0.05 });
    mini.setFace({ time: t, mouth: t < 47 ? "wobble" : "scream", wide: 1, sad: 1, browUp: 0.8, sweat: 1 });
    // camera: tear in, fly over the rim, then dive down the throat
    let p;
    let look;
    if (t < 38.0) {
      const k = eo5(seg(t, 35.0, 38.0));
      p = vlerp(V3(0, 30, 48), V3(18, 9, 20), k);
      look = vlerp(V3(0, -4, 0), V3(2, -2, 0), k);
    } else if (t < 43.2) {
      const k = eio(seg(t, 38.0, 43.2));
      p = vlerp(V3(18, 9, 20), V3(10, 6.5, 13), k);
      look = vlerp(V3(6, -2, 0), V3(1, -5, 0), k);
    } else {
      const k = eio(seg(t, 43.2, 51.3));
      const m = mini.root.position.clone();
      p = vlerp(V3(10, 6.5, 13), m.clone().add(V3(1.6, 2.2, 2.2)), k);
      look = vlerp(V3(1, -5, 0), abyss.position, k);
    }
    aim(cam, p, look, 44, Math.sin(t * 0.6) * 0.05);
    scene.updateMatrixWorld();
    anchorTo("future-anchor", V3(2.2, depth(2.2) + 1.7, 0), cam);
    anchorTo("center-anchor", abyss.position.clone().add(V3(0, 1.4, 0)), cam);
    anchorTo("sl-anchor", abyss.position, cam);
  }
  function render(r, t) {
    r.setClearColor(0x05030c, 1);
    r.clear();
    r.render(scene, cam);
    r.setClearColor(0x000000, 0);
    postFX(r, cam, t, abyss.position);
  }
  return { scene, cam, update, render };
})();

// ================================================================== the void (final black)
const VOID = (() => {
  const scene = new THREE.Scene();
  const cam = makeCamera(40);
  return {
    scene,
    cam,
    update() {},
    render(r) {
      r.setClearColor(0x000000, 1);
      r.clear();
      r.setClearColor(0x000000, 0);
    },
  };
})();

runShots(
  renderer,
  [
    [0, 35.0, SPACE],
    [35.0, 51.5, GRID],
    [51.5, 1e9, VOID],
  ],
  TOTAL,
);
