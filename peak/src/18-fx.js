// ============================================================ WIND
var Wind = {
  t: 0, dx: 1, dz: 0, gust: 0, ang: 0, noise: null, rain: 0,
  init: function (seed) { Wind.noise = new Noise(seed ^ 0x77aa33); Wind.ang = Math.random() * 6.283; },
  tick: function (dt) {
    if (!Wind.noise) Wind.init(1);
    Wind.t += dt;
    Wind.ang += dt * 0.055;
    Wind.dx = Math.cos(Wind.ang); Wind.dz = Math.sin(Wind.ang);
    var n = clamp(Wind.noise.n2(Wind.t * 0.14, 3.7) * 1.8 + 0.5, 0, 1);
    var burst = Math.pow(clamp(Wind.noise.n2(Wind.t * 0.42 + 11, 8.2) * 1.8 + 0.5, 0, 1), 3.0);
    Wind.gust = clamp(n * 0.55 + burst * 1.5, 0, 1.6);
    Wind.rain = clamp(Wind.noise.n2(Wind.t * 0.05 + 31, 2.1) * 2.2 + 0.35, 0, 1);
  },
  // how hard it is pushing at this altitude on exposed ground
  at: function (y, exposure) {
    if (y < 40) return 0;
    return Wind.gust * clamp((y - 40) / 170, 0, 1) * (0.35 + 0.65 * exposure);
  },
};

// ============================================================ PARTICLES
var FX = { burst: null, snow: null, snowN: 0, group: null };

var PART_VS = [
  'attribute float aSize; attribute float aAlpha; attribute vec3 aCol;',
  'varying vec3 vC; varying float vA;',
  'void main(){ vC = aCol; vA = aAlpha;',
  ' vec4 mv = modelViewMatrix * vec4(position,1.0);',
  ' gl_PointSize = aSize * (260.0 / max(0.1,-mv.z));',
  ' gl_Position = projectionMatrix * mv; }',
].join('\n');

var PART_FS = [
  'varying vec3 vC; varying float vA;',
  'void main(){ vec2 d = gl_PointCoord - vec2(0.5); float r = dot(d,d);',
  ' if (r > 0.25) discard;',
  ' float a = smoothstep(0.25, 0.04, r) * vA;',
  ' if (a < 0.01) discard;',
  ' gl_FragColor = vec4(vC, a);',
  ' #include <encodings_fragment>',
  '}',
].join('\n');

function partMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: PART_VS, fragmentShader: PART_FS,
    transparent: true, depthWrite: false,
  });
}

function ParticlePool(n) {
  this.n = n; this.head = 0;
  var g = new THREE.BufferGeometry();
  this.pos = new Float32Array(n * 3);
  this.col = new Float32Array(n * 3);
  this.size = new Float32Array(n);
  this.alpha = new Float32Array(n);
  this.vel = new Float32Array(n * 3);
  this.life = new Float32Array(n);
  this.maxLife = new Float32Array(n);
  this.grav = new Float32Array(n);
  this.drag = new Float32Array(n);
  for (var i = 0; i < n; i++) { this.pos[i * 3 + 1] = -9999; this.alpha[i] = 0; this.size[i] = 1; }
  g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  this.geo = g;
  this.points = new THREE.Points(g, partMaterial());
  this.points.frustumCulled = false;
}

ParticlePool.prototype.spawn = function (x, y, z, vx, vy, vz, col, size, life, grav, drag) {
  var i = this.head; this.head = (this.head + 1) % this.n;
  this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
  this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
  hexLin(col, this.col, i * 3, 1);
  this.size[i] = size; this.life[i] = life; this.maxLife[i] = life;
  this.grav[i] = grav === undefined ? 12 : grav;
  this.drag[i] = drag === undefined ? 1.4 : drag;
  this.alpha[i] = 1;
};

ParticlePool.prototype.tick = function (dt) {
  var p = this.pos, v = this.vel, l = this.life, a = this.alpha, i, k;
  for (i = 0; i < this.n; i++) {
    if (l[i] <= 0) { if (a[i] !== 0) { a[i] = 0; p[i * 3 + 1] = -9999; } continue; }
    l[i] -= dt;
    k = i * 3;
    var dr = Math.exp(-this.drag[i] * dt);
    v[k] *= dr; v[k + 2] *= dr;
    v[k + 1] = v[k + 1] * dr - this.grav[i] * dt;
    p[k] += v[k] * dt; p[k + 1] += v[k + 1] * dt; p[k + 2] += v[k + 2] * dt;
    a[i] = clamp(l[i] / this.maxLife[i], 0, 1);
  }
  this.geo.attributes.position.needsUpdate = true;
  this.geo.attributes.aAlpha.needsUpdate = true;
  this.geo.attributes.aCol.needsUpdate = true;
  this.geo.attributes.aSize.needsUpdate = true;
};

FX.init = function (detail) {
  FX.group = new THREE.Group();
  FX.burst = new ParticlePool(detail ? 700 : 340);
  FX.group.add(FX.burst.points);

  // weather: a slab of flakes that follows the camera and wraps around it
  var n = FX.snowN = detail ? 1100 : 480;
  var g = new THREE.BufferGeometry();
  FX.sPos = new Float32Array(n * 3);
  FX.sCol = new Float32Array(n * 3);
  FX.sSize = new Float32Array(n);
  FX.sAlpha = new Float32Array(n);
  FX.sSpeed = new Float32Array(n);
  for (var i = 0; i < n; i++) {
    FX.sPos[i * 3] = (Math.random() - 0.5) * 60;
    FX.sPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    FX.sPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    hexLin(0xffffff, FX.sCol, i * 3, 1);
    FX.sSize[i] = 0.05 + Math.random() * 0.09;
    FX.sAlpha[i] = 0;
    FX.sSpeed[i] = 0.7 + Math.random() * 1.3;
  }
  g.setAttribute('position', new THREE.BufferAttribute(FX.sPos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(FX.sCol, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(FX.sSize, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(FX.sAlpha, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  FX.snowGeo = g;
  FX.snow = new THREE.Points(g, partMaterial());
  FX.snow.frustumCulled = false;
  FX.group.add(FX.snow);
  return FX.group;
};

FX.puff = function (x, y, z, n, col) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * 6.283, s = 0.7 + Math.random() * 2.1;
    FX.burst.spawn(x, y, z, Math.cos(a) * s, 0.6 + Math.random() * 1.4, Math.sin(a) * s,
      col, 0.18 + Math.random() * 0.16, 0.5 + Math.random() * 0.5, 5, 2.6);
  }
};

FX.debris = function (x, y, z, nx, nz) {
  for (var i = 0; i < 16; i++) {
    FX.burst.spawn(x, y - Math.random() * 0.6, z,
      nx * (1 + Math.random() * 2.4) + (Math.random() - 0.5) * 2,
      Math.random() * 1.8 - 0.6,
      nz * (1 + Math.random() * 2.4) + (Math.random() - 0.5) * 2,
      Math.random() < 0.5 ? 0x8a7360 : 0x6d5b4a, 0.11 + Math.random() * 0.16,
      1.1 + Math.random() * 0.9, 17, 0.4);
  }
};

FX.breath = function (x, y, z, dx, dz) {
  FX.burst.spawn(x, y, z, dx * 0.8 + (Math.random() - 0.5) * 0.3, 0.5, dz * 0.8 + (Math.random() - 0.5) * 0.3,
    0xdfeaf5, 0.14, 0.85, -0.6, 1.9);
};

FX.ember = function (x, y, z) {
  FX.burst.spawn(x + (Math.random() - 0.5) * 0.7, y, z + (Math.random() - 0.5) * 0.7,
    (Math.random() - 0.5) * 0.7, 1.4 + Math.random() * 1.7, (Math.random() - 0.5) * 0.7,
    Math.random() < 0.4 ? 0xffd646 : 0xff6a2a, 0.08 + Math.random() * 0.07,
    1.1 + Math.random(), -1.4, 0.9);
};

var _emberT = 0;
FX.tick = function (dt, cam, py) {
  FX.burst.tick(dt);

  // weather is whatever the biome in this slot brings with it
  var wx = biomeAt(py).weather, dens = 0, wind = 2.5 + Wind.gust * 13, fallV = 2.2, col = 0xffffff, sz = 1;
  var zn = zoneAt(py);
  if (wx === 'rain') { dens = 0.35 + Wind.rain * 0.75; fallV = 17; wind = 1.5; col = 0x9fc8e8; sz = 0.55; }
  else if (wx === 'spore') { dens = 0.7; fallV = -0.5; wind = 2.2; col = 0xc98ae8; sz = 1.5; }
  else if (wx === 'snow') { dens = 0.55 + Wind.gust * 0.45; fallV = 2.6; col = 0xffffff; sz = 1.1; }
  else if (wx === 'dust') { dens = 0.5 + Wind.gust * 0.5; fallV = 0.4; wind = 6 + Wind.gust * 12; col = 0xe0b482; sz = 0.9; }
  else if (wx === 'ash') { dens = 0.5; fallV = 1.1; wind = 1.2 + Wind.gust * 3; col = 0x6a5f58; sz = 0.75; }
  else if (wx === 'murk') { dens = 0.85; fallV = -0.35; wind = 0.8; col = 0x7a5ea8; sz = 2.0; }
  else if (wx === 'wind') { dens = 0.4 + Wind.gust * 0.5; fallV = 1.2; wind = 8 + Wind.gust * 16; col = 0xd8d0c0; sz = 0.7; }
  var n = FX.snowN, p = FX.sPos, al = FX.sAlpha, sc = FX.sCol, ss = FX.sSize;
  var cx = cam.x, cy = cam.y, cz = cam.z;
  if (FX.lastWx !== wx) {
    FX.lastWx = wx;
    for (var q = 0; q < n; q++) { hexLin(col, sc, q * 3, 1); ss[q] = (0.05 + Math.random() * 0.09) * sz * (wx === 'rain' ? 2.6 : 1); }
    FX.snowGeo.attributes.aCol.needsUpdate = true;
    FX.snowGeo.attributes.aSize.needsUpdate = true;
  }
  for (var i = 0; i < n; i++) {
    var k = i * 3;
    p[k] += (Wind.dx * wind * FX.sSpeed[i]) * dt;
    p[k + 2] += (Wind.dz * wind * FX.sSpeed[i]) * dt;
    p[k + 1] -= (fallV + FX.sSpeed[i]) * dt;
    var rx = p[k] - cx, ry = p[k + 1] - cy, rz = p[k + 2] - cz;
    if (rx > 30) p[k] -= 60; else if (rx < -30) p[k] += 60;
    if (rz > 30) p[k + 2] -= 60; else if (rz < -30) p[k + 2] += 60;
    if (ry < -20) p[k + 1] += 40; else if (ry > 20) p[k + 1] -= 40;
    al[i] = dens * 0.85;
  }
  FX.snowGeo.attributes.position.needsUpdate = true;
  FX.snowGeo.attributes.aAlpha.needsUpdate = true;

  // embers lifting off hot rock
  _emberT += dt;
  if (wx === 'ash' && _emberT > 0.04) {
    _emberT = 0;
    var a = Math.random() * 6.283, r = 4 + Math.random() * 30;
    var ex = cam.x + Math.cos(a) * r, ez = cam.z + Math.sin(a) * r;
    var eh = T.hAt(ex, ez);
    if (eh > T.VOID && T.surfAt(ex, ez) === SF.EMBER) FX.ember(ex, eh + 0.3, ez);
  }
  for (var c = 0; c < Camps.list.length; c++) {
    var cm = Camps.list[c];
    if (!cm.lit) continue;
    var ddx = cm.x - cam.x, ddz = cm.z - cam.z;
    if (ddx * ddx + ddz * ddz < 3600 && Math.random() < dt * 22) FX.ember(cm.x, cm.y + 1.1, cm.z);
  }
};

// ============================================================ RISING FOG
// The run has a clock, and this is it.  It starts at the sea and comes up.
var Fog = { level: -30, group: null, mesh: null, mat: null, t: 0 };

Fog.build = function () {
  Fog.group = new THREE.Group();
  Fog.level = -30; Fog.t = 0;
  Fog.mat = new THREE.MeshBasicMaterial({
    color: 0xb9c2cc, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false,
  });
  Fog.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 16, 16), Fog.mat);
  Fog.mesh.rotation.x = -Math.PI / 2;
  Fog.mesh.renderOrder = 2;
  Fog.group.add(Fog.mesh);
  return Fog.group;
};

Fog.tick = function (dt, runT, camPos) {
  Fog.t = runT;
  var over = runT - K.FOG_RISE_START;
  Fog.level = over > 0 ? -30 + over * K.FOG_RISE_RATE : -30;
  if (!Fog.mesh) return;
  Fog.mesh.position.set(camPos.x, Fog.level, camPos.z);
  Fog.mesh.visible = Fog.level > -12;
};
