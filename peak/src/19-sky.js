// ============================================================ SKY & LIGHT
// The sky is a gradient dome whose colours, the sun angle and the fog all
// slide as you gain altitude - the mountain reveals itself in layers.
var Sky = {
  mesh: null, mat: null, sun: null, hemi: null, fill: null, cloud: null,
  sunDir: new THREE.Vector3(), tint: new THREE.Color(),
};

var SKY_VS = 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
var SKY_FS = [
  'uniform vec3 cLow; uniform vec3 cMid; uniform vec3 cHigh; uniform vec3 cSun;',
  'uniform vec3 sunDir; uniform float haze;',
  'varying vec3 vW;',
  'void main(){',
  '  float h = clamp(vW.y * 0.5 + 0.5, 0.0, 1.0);',
  '  vec3 c = mix(cLow, cMid, smoothstep(0.44, 0.56, h));',
  '  c = mix(c, cHigh, smoothstep(0.56, 0.92, h));',
  '  float d = max(0.0, dot(normalize(vW), normalize(sunDir)));',
  '  c += cSun * pow(d, 22.0) * 1.5;',
  '  c += cSun * pow(d, 4.0) * 0.20;',
  '  c = mix(c, cLow, haze * pow(1.0 - abs(vW.y), 5.0));',
  '  gl_FragColor = vec4(c, 1.0);',
  '  #include <encodings_fragment>',
  '}',
].join('\n');

function linCol(hex) {
  var c = new THREE.Color();
  c.setRGB(_lut[(hex >> 16) & 255], _lut[(hex >> 8) & 255], _lut[hex & 255]);
  return c;
}

// one keyframe per zone: shore, jungle, snow, volcanic, caldera, peak
var SKY_KEYS = [
  { y: 0,   low: 0xffe0b0, mid: 0x8fc8ee, high: 0x3f86d8, sun: 0xfff0c8, fog: 0xf0dcb8, dens: 0.0036, el: 0.20, amb: 0.92, sunI: 1.10 },
  { y: 62,  low: 0xdfd9a8, mid: 0x86bfe2, high: 0x3f7fcc, sun: 0xfff0cc, fog: 0xd8dcb8, dens: 0.0042, el: 0.28, amb: 0.95, sunI: 1.05 },
  { y: 132, low: 0xe6eef6, mid: 0x93c4ea, high: 0x2f6ec2, sun: 0xfff4e2, fog: 0xdae6f2, dens: 0.0030, el: 0.44, amb: 0.96, sunI: 1.30 },
  { y: 200, low: 0xffab68, mid: 0x7a9fc8, high: 0x2a4f96, sun: 0xffc07a, fog: 0xc9b2a4, dens: 0.0028, el: 0.34, amb: 0.72, sunI: 1.15 },
  { y: 256, low: 0x8a3a18, mid: 0x3f3a4c, high: 0x1a1826, sun: 0xff8a3a, fog: 0x2e2630, dens: 0.0036, el: 0.22, amb: 0.50, sunI: 0.75 },
  { y: 302, low: 0xffc78a, mid: 0x63a6e4, high: 0x123a86, sun: 0xfff0d0, fog: 0xc6d6e8, dens: 0.0016, el: 0.62, amb: 0.92, sunI: 1.55 },
];
function keyAt(y) {
  var i = 0;
  for (i = 0; i < SKY_KEYS.length - 1; i++) if (y < SKY_KEYS[i + 1].y) break;
  var a = SKY_KEYS[Math.min(i, SKY_KEYS.length - 1)], b = SKY_KEYS[Math.min(i + 1, SKY_KEYS.length - 1)];
  var u = a === b ? 0 : smooth(invl(a.y, b.y, y));
  return {
    low: mixHex(a.low, b.low, u), mid: mixHex(a.mid, b.mid, u), high: mixHex(a.high, b.high, u),
    sun: mixHex(a.sun, b.sun, u), fog: mixHex(a.fog, b.fog, u),
    dens: lerp(a.dens, b.dens, u), el: lerp(a.el, b.el, u),
    amb: lerp(a.amb, b.amb, u), sunI: lerp(a.sunI, b.sunI, u),
  };
}

function cloudTexture() {
  var S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  var ctx = cv.getContext('2d'), img = ctx.createImageData(S, S);
  var n = new Noise(20260902), i, j;
  for (j = 0; j < S; j++) for (i = 0; i < S; i++) {
    var u = i / S * 7, v = j / S * 7;
    var f = n.fbm(u, v, 5, 2.1, 0.55) * 0.5 + 0.5;
    var dx = (i / S - 0.5) * 2, dy = (j / S - 0.5) * 2;
    var r = Math.sqrt(dx * dx + dy * dy);
    // thin right under the viewer, thickest in the middle distance, gone
    // at the rim, so the layer reads as depth instead of a lid
    var a = clamp((f * 0.5 + 0.5 - 0.30) * 1.9, 0, 1);
    a *= smooth(clamp((r - 0.06) / 0.16, 0, 1)) * (1 - smooth(clamp((r - 0.30) / 0.62, 0, 1)));
    a *= a;
    var o = (j * S + i) * 4;
    img.data[o] = 255; img.data[o + 1] = 254; img.data[o + 2] = 250;
    img.data[o + 3] = (a * 205) | 0;
  }
  ctx.putImageData(img, 0, 0);
  var tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

Sky.build = function (scene) {
  var k = keyAt(0);
  Sky.mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false,
    uniforms: {
      cLow: { value: linCol(k.low) }, cMid: { value: linCol(k.mid) },
      cHigh: { value: linCol(k.high) }, cSun: { value: linCol(k.sun) },
      sunDir: { value: new THREE.Vector3(0.4, 0.3, 0.85) }, haze: { value: 0.5 },
    },
  });
  Sky.mesh = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 16), Sky.mat);
  Sky.mesh.frustumCulled = false;
  Sky.mesh.renderOrder = -10;
  scene.add(Sky.mesh);

  Sky.hemi = new THREE.HemisphereLight(0xbcd7f2, 0x8e8474, 0.9);
  scene.add(Sky.hemi);

  Sky.sun = new THREE.DirectionalLight(0xfff0d8, 1.2);
  Sky.sun.castShadow = true;
  var s = Sky.sun.shadow;
  s.mapSize.width = s.mapSize.height = 2048;
  s.camera.near = 1; s.camera.far = 190;
  s.camera.left = -46; s.camera.right = 46; s.camera.top = 46; s.camera.bottom = -46;
  s.bias = -0.0016; s.normalBias = 0.6;
  scene.add(Sky.sun);
  scene.add(Sky.sun.target);

  Sky.fill = new THREE.DirectionalLight(0x9ec4e8, 0.42);
  Sky.fill.position.set(-0.6, 0.4, -0.7);
  scene.add(Sky.fill);

  // a sea of cloud that the climb eventually breaks through
  var tex = cloudTexture();
  var cm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.0, side: THREE.DoubleSide });
  Sky.cloud = new THREE.Mesh(new THREE.PlaneGeometry(1300, 1300, 28, 28), cm);
  Sky.cloud.rotation.x = -Math.PI / 2;
  Sky.cloud.position.y = 84;
  Sky.cloud.renderOrder = -5;
  scene.add(Sky.cloud);

  scene.fog = new THREE.FogExp2(linCol(k.fog).getHex(), k.dens);
  return Sky;
};

Sky.setQuality = function (detail) {
  if (!Sky.sun) return;
  Sky.sun.shadow.mapSize.width = Sky.sun.shadow.mapSize.height = detail ? 2048 : 1024;
};

Sky.update = function (dt, t, py, camPos) {
  var k = keyAt(py);
  var u = Sky.mat.uniforms;
  u.cLow.value.lerp(linCol(k.low), 1 - Math.exp(-2.5 * dt));
  u.cMid.value.lerp(linCol(k.mid), 1 - Math.exp(-2.5 * dt));
  u.cHigh.value.lerp(linCol(k.high), 1 - Math.exp(-2.5 * dt));
  u.cSun.value.lerp(linCol(k.sun), 1 - Math.exp(-2.5 * dt));
  u.haze.value = damp(u.haze.value, clamp(0.75 - py / 420, 0.12, 0.8), 2, dt);

  // sun climbs and swings round as you gain height
  var az = 0.9 + py * 0.0034;
  var el = k.el;
  Sky.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
  u.sunDir.value.copy(Sky.sunDir);

  Sky.sun.color.copy(linCol(k.sun));
  Sky.sun.intensity = damp(Sky.sun.intensity, k.sunI, 2, dt);
  Sky.hemi.intensity = damp(Sky.hemi.intensity, k.amb, 2, dt);
  Sky.hemi.color.copy(linCol(k.mid));
  Sky.fill.position.set(-Sky.sunDir.x, 0.55, -Sky.sunDir.z);

  Sky.sun.target.position.set(camPos.x, camPos.y, camPos.z);
  Sky.sun.position.set(camPos.x + Sky.sunDir.x * 90, camPos.y + Sky.sunDir.y * 90, camPos.z + Sky.sunDir.z * 90);

  Sky.mesh.position.copy(camPos);

  var fog = Game.scene.fog;
  fog.color.lerp(linCol(k.fog), 1 - Math.exp(-2.5 * dt));
  fog.density = damp(fog.density, k.dens, 2, dt);

  // the cloud sea fades in once you are above it and thins out again near
  // the top, so it reads as a layer you broke through rather than a lid
  var band = clamp((py - 96) / 42, 0, 1) * clamp(1 - (py - 200) / 90, 0, 1);
  Sky.cloud.material.opacity = damp(Sky.cloud.material.opacity, band * 0.34, 2.5, dt);
  Sky.cloud.visible = Sky.cloud.material.opacity > 0.01;
  Sky.cloud.position.x = camPos.x + Math.sin(t * 0.01) * 30;
  Sky.cloud.position.z = camPos.z + Math.cos(t * 0.008) * 30;
  Sky.cloud.rotation.z = t * 0.004;
};
