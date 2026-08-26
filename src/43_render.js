/* =========================================================================
 * RENDERER — shadow pass, sky, terrain, entities, water, weather, post.
 * ========================================================================= */

var R = {
  progChunk: null, progWater: null, progShadow: null, progSky: null,
  progEntity: null, progView: null, progPart: null, progWeather: null,
  progBright: null, progBlur: null, progGod: null, progComposite: null, progFXAA: null,
  atlas: null, white: null,
  sceneFBO: null, sceneCopy: null, bloomA: null, bloomB: null, godFBO: null, ldrFBO: null,
  shadowFBO: null, shadowSize: 2048,
  width: 0, height: 0, scale: 1,
  settings: {
    renderDistance: 8, shadows: true, bloom: true, godRays: true, fxaa: false, dof: true,
    smoothLight: true, fancyWater: true, fov: 74, renderScale: 1.0, maxFps: 0, viewBob: true,
    viewModel: true, particles: true, entityShadows: true, clouds: true, waveGrass: true,
    sharpTextures: true, xray: false, fullbright: false, veinMiner: true,
    motionBlur: true
  },
  frame: 0,
  sunDir: new Float32Array([0, 1, 0]),
  moonDir: new Float32Array([0, -1, 0]),
  vp: M4.create(), invVP: M4.create(), proj: M4.create(), view: M4.create(),
  shadowMat: M4.create(),
  frustum: new Frustum(),
  drawn: 0, tris: 0,
  sky: { zenith: [0.30, 0.52, 0.92], horizon: [0.62, 0.76, 0.96], sun: [1.0, 0.96, 0.86], day: 1, fog: [0.72, 0.82, 0.95] }
};

function initRenderer(canvas) {
  R.progChunk = makeProgram('chunk', SH.chunkVS, SH.chunkFS);
  R.progWater = makeProgram('water', SH.chunkVS, SH.waterFS);
  R.progShadow = makeProgram('shadow', SH.shadowVS, SH.shadowFS);
  R.progSky = makeProgram('sky', SH.skyVS, SH.skyFS);
  R.progEntity = makeProgram('entity', SH.entityVS, SH.entityFS);
  R.progView = makeProgram('view', SH.viewVS, SH.viewFS);
  R.progPart = makeProgram('part', SH.partVS, SH.partFS);
  R.progCrack = makeProgram('crack', SH.crackVS, SH.crackFS);
  R.progWeather = makeProgram('weather', SH.weatherVS, SH.weatherFS);
  R.progBright = makeProgram('bright', SH.postVS, SH.brightFS);
  R.progBlur = makeProgram('blur', SH.postVS, SH.blurFS);
  R.progGod = makeProgram('god', SH.postVS, SH.godFS);
  R.progComposite = makeProgram('composite', SH.postVS, SH.compositeFS);
  R.progFXAA = makeProgram('fxaa', SH.postVS, SH.fxaaFS);
  R.atlas = uploadBlockTextures();
  R.white = makeWhiteTex();
  R.noShadow = makeDummyShadowTex();
  R.shadowFBO = new FBO(R.shadowSize, R.shadowSize, { color: false, depth: true, compare: true });
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  R.canvas = canvas;
  resizeRenderer();
  return true;
}

/* Sizes the canvas backing store to the display (the element only carries a
   CSS size, so without this the whole game renders at the 300x150 default and
   is stretched), then sizes the offscreen buffers to the render scale. */
function resizeRenderer() {
  var canvas = R.canvas || (gl && gl.canvas);
  if (!canvas) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cssW = canvas.clientWidth || window.innerWidth;
  var cssH = canvas.clientHeight || window.innerHeight;
  var dw = Math.max(64, Math.round(cssW * dpr));
  var dh = Math.max(64, Math.round(cssH * dpr));
  if (canvas.width !== dw || canvas.height !== dh) { canvas.width = dw; canvas.height = dh; }
  var s = R.settings.renderScale;
  var rw = Math.max(64, Math.floor(dw * s)), rh = Math.max(64, Math.floor(dh * s));
  if (R.width === rw && R.height === rh) return;
  R.width = rw; R.height = rh;
  if (R.sceneFBO) { R.sceneFBO.dispose(); R.sceneCopy.dispose(); R.bloomA.dispose(); R.bloomB.dispose(); R.godFBO.dispose(); R.ldrFBO.dispose(); }
  R.sceneFBO = new FBO(rw, rh, { depth: true, float: true });
  R.sceneCopy = new FBO(rw, rh, { depth: true, float: true });
  R.bloomA = new FBO(Math.max(1, rw >> 2), Math.max(1, rh >> 2), { float: true });
  R.bloomB = new FBO(Math.max(1, rw >> 2), Math.max(1, rh >> 2), { float: true });
  R.godFBO = new FBO(Math.max(1, rw >> 1), Math.max(1, rh >> 1), { float: true });
  R.ldrFBO = new FBO(rw, rh, {});
  if (R.prevFBO) R.prevFBO.dispose();
  R.prevFBO = new FBO(rw, rh, {});
}

/* ---------------------------------------------------- mesh GL objects -- */
var CHUNK_ATTRS = [
  { loc: 0, size: 3, type: 'us', off: 0 },
  { loc: 1, size: 2, type: 'us', off: 6 },
  { loc: 2, size: 1, type: 'us', off: 10 },
  { loc: 3, size: 2, type: 'ub', off: 12 },
  { loc: 4, size: 2, type: 'ub', off: 14 }
];
function makeChunkVAO(vertData, idxData) {
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertData, gl.STATIC_DRAW);
  for (var i = 0; i < CHUNK_ATTRS.length; i++) {
    var a = CHUNK_ATTRS[i];
    gl.enableVertexAttribArray(a.loc);
    gl.vertexAttribIPointer(a.loc, a.size, a.type === 'us' ? gl.UNSIGNED_SHORT : gl.UNSIGNED_BYTE, 16, a.off);
  }
  var ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxData, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao: vao, vbo: vbo, ebo: ebo, count: idxData.length };
}
function disposeMesh(m) {
  if (!m) return;
  gl.deleteVertexArray(m.vao); gl.deleteBuffer(m.vbo); gl.deleteBuffer(m.ebo);
}

function uploadSectionMesh(chunk, sy, bufs) {
  var slot = chunk.mesh[sy];
  if (slot) { disposeMesh(slot[0]); disposeMesh(slot[1]); disposeMesh(slot[2]); }
  var out = [null, null, null];
  for (var p = 0; p < 3; p++) {
    var b = bufs[p];
    if (b.ni === 0) continue;
    out[p] = makeChunkVAO(new Uint16Array(b.v.buffer, 0, b.n), new Uint16Array(b.idx.buffer, 0, b.ni));
  }
  chunk.mesh[sy] = out;
}

/* per-chunk 32x16 tint texture: grass on the left, foliage on the right */
function buildTintTexture(world, chunk) {
  var data = new Uint8Array(32 * 16 * 4);
  var dim = chunk.dim;
  for (var z = 0; z < 16; z++) {
    for (var x = 0; x < 16; x++) {
      var gr = [0, 0, 0], fo = [0, 0, 0], n = 0;
      /* average a 5x5 footprint so biome borders blend instead of banding */
      for (var dz = -4; dz <= 4; dz += 2) for (var dx = -4; dx <= 4; dx += 2) {
        var b = world.getBiome(dim, chunk.cx * 16 + x + dx, chunk.cz * 16 + z + dz);
        var g = col(b.grass), f = col(b.foliage);
        gr[0] += g[0]; gr[1] += g[1]; gr[2] += g[2];
        fo[0] += f[0]; fo[1] += f[1]; fo[2] += f[2];
        n++;
      }
      var i1 = (z * 32 + x) * 4, i2 = (z * 32 + x + 16) * 4;
      data[i1] = gr[0] / n; data[i1 + 1] = gr[1] / n; data[i1 + 2] = gr[2] / n; data[i1 + 3] = 255;
      data[i2] = fo[0] / n; data[i2 + 1] = fo[1] / n; data[i2 + 2] = fo[2] / n; data[i2 + 3] = 255;
    }
  }
  if (!chunk.tintTex) {
    chunk.tintTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, chunk.tintTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 32, 16);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  } else gl.bindTexture(gl.TEXTURE_2D, chunk.tintTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 32, 16, gl.RGBA, gl.UNSIGNED_BYTE, data);
}

/* ------------------------------------------------------ sky / lighting -- */
var SKY_KEYS = [
  /* t (0..1 of day), zenith, horizon, sun colour, day amount */
  [0.00, [0.015, 0.020, 0.055], [0.045, 0.055, 0.11], [0.30, 0.34, 0.52], 0.0],
  [0.21, [0.035, 0.045, 0.10], [0.12, 0.10, 0.16], [0.45, 0.35, 0.42], 0.0],
  [0.25, [0.16, 0.20, 0.40], [0.72, 0.42, 0.28], [1.25, 0.60, 0.32], 0.25],
  [0.29, [0.24, 0.42, 0.80], [0.86, 0.66, 0.52], [1.30, 0.92, 0.68], 0.72],
  [0.36, [0.26, 0.48, 0.90], [0.66, 0.79, 0.97], [1.16, 1.06, 0.94], 1.0],
  [0.50, [0.25, 0.47, 0.92], [0.63, 0.77, 0.97], [1.15, 1.10, 1.02], 1.0],
  [0.64, [0.26, 0.48, 0.90], [0.66, 0.79, 0.97], [1.16, 1.06, 0.94], 1.0],
  [0.71, [0.23, 0.38, 0.74], [0.90, 0.60, 0.42], [1.35, 0.80, 0.50], 0.7],
  [0.75, [0.14, 0.17, 0.38], [0.78, 0.38, 0.24], [1.30, 0.52, 0.28], 0.22],
  [0.79, [0.035, 0.045, 0.10], [0.13, 0.10, 0.15], [0.45, 0.35, 0.42], 0.0],
  [1.00, [0.015, 0.020, 0.055], [0.045, 0.055, 0.11], [0.30, 0.34, 0.52], 0.0]
];
function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function updateSky(timeOfDay, dim, rain, biome) {
  var t = fract(timeOfDay);
  var i = 0;
  while (i < SKY_KEYS.length - 2 && t > SKY_KEYS[i + 1][0]) i++;
  var a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  var f = clamp((t - a[0]) / Math.max(0.0001, b[0] - a[0]), 0, 1);
  f = smoothstep(f);
  var zen = lerp3(a[1], b[1], f), hor = lerp3(a[2], b[2], f);
  var sun = lerp3(a[3], b[3], f), day = lerp(a[4], b[4], f);

  var ang = (t - 0.25) * Math.PI * 2;
  R.sunDir[0] = -Math.sin(ang) * 0.35;
  R.sunDir[1] = Math.sin(ang + Math.PI / 2) * 0 + Math.cos(ang) * 0;
  /* sun rises in the east and sets in the west, tilted a little south */
  R.sunDir[0] = Math.cos(ang);
  R.sunDir[1] = Math.sin(ang);
  R.sunDir[2] = -0.28;
  var len = Math.hypot(R.sunDir[0], R.sunDir[1], R.sunDir[2]);
  R.sunDir[0] /= len; R.sunDir[1] /= len; R.sunDir[2] /= len;
  R.moonDir[0] = -R.sunDir[0]; R.moonDir[1] = -R.sunDir[1]; R.moonDir[2] = -R.sunDir[2];

  if (rain > 0) {
    var grey = [0.30, 0.33, 0.37];
    zen = lerp3(zen, [grey[0] * (0.3 + day * 0.9), grey[1] * (0.3 + day * 0.9), grey[2] * (0.3 + day * 0.9)], rain * 0.85);
    hor = lerp3(hor, [grey[0] * (0.45 + day), grey[1] * (0.45 + day), grey[2] * (0.45 + day)], rain * 0.85);
    sun = lerp3(sun, [0.5, 0.52, 0.55], rain * 0.8);
    day *= 1 - rain * 0.34;
  }
  if (dim === DIM_NETHER) {
    zen = [0.22, 0.045, 0.035]; hor = [0.34, 0.07, 0.05]; sun = [0.9, 0.42, 0.28]; day = 0.55;
    R.sunDir[0] = 0.2; R.sunDir[1] = 0.9; R.sunDir[2] = 0.35;
  } else if (dim === DIM_END) {
    zen = [0.035, 0.020, 0.055]; hor = [0.07, 0.045, 0.10]; sun = [0.55, 0.48, 0.72]; day = 0.42;
    R.sunDir[0] = 0.25; R.sunDir[1] = 0.86; R.sunDir[2] = 0.45;
  }
  R.sky.zenith = zen; R.sky.horizon = hor; R.sky.sun = sun; R.sky.day = day;
  if (biome) {
    var fc = col(biome.fog);
    R.sky.fog = [fc[0] / 255, fc[1] / 255, fc[2] / 255];
  }
  R.sky.ambient = 0.24;
  /* the Nether and the End have no sky light at all, so their ambient has to
     carry the whole scene — otherwise everything reads as pure black */
  if (dim === DIM_NETHER) R.sky.ambient = 1.0;      /* no sky light at all */
  else if (dim === DIM_END) R.sky.ambient = 0.18;   /* the End does have sky light */
  /* the sky fill is a soft, only slightly cool ambient; the sun carries the
     warmth and most of the intensity on lit faces */
  /* night keeps a floor so the world is still readable by moonlight */
  R.sky.skyLight = [lerp(0.23, 0.43, day) + zen[0] * 0.13, lerp(0.24, 0.435, day) + zen[1] * 0.12, lerp(0.29, 0.47, day) + zen[2] * 0.12];
  if (dim === DIM_NETHER) R.sky.skyLight = [0.74, 0.42, 0.33];
  else if (dim === DIM_END) R.sky.skyLight = [0.40, 0.36, 0.50];
  R.sky.blockLight = [1.0, 0.72, 0.42];
}

/* ------------------------------------------------------- shadow matrix -- */
function buildShadowMatrix(camX, camY, camZ, range) {
  var d = R.sunDir;
  var cx = camX + d[0] * 0, cy = camY, cz = camZ;
  /* centre the map a bit ahead of the camera so the visible region is covered */
  var eye = [cx + d[0] * range * 1.6, cy + d[1] * range * 1.6, cz + d[2] * range * 1.6];
  var up = Math.abs(d[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
  var lv = M4.create(), lp = M4.create();
  M4.lookAt(lv, eye, [cx, cy, cz], up);
  M4.ortho(lp, -range, range, -range, range, 1, range * 3.6);
  M4.mul(R.shadowMat, lp, lv);
  return R.shadowMat;
}

/* ------------------------------------------------------- uniform setup -- */
function setSkyUniforms(p, camPos, dim, rain, moonPhase, time) {
  if (p.u.uSunDir) gl.uniform3fv(p.u.uSunDir, R.sunDir);
  if (p.u.uMoonDir) gl.uniform3fv(p.u.uMoonDir, R.moonDir);
  if (p.u.uZenith) gl.uniform3fv(p.u.uZenith, R.sky.zenith);
  if (p.u.uHorizon) gl.uniform3fv(p.u.uHorizon, R.sky.horizon);
  if (p.u.uSunCol) gl.uniform3fv(p.u.uSunCol, R.sky.sun);
  if (p.u.uDay) gl.uniform1f(p.u.uDay, R.sky.day);
  if (p.u.uRain) gl.uniform1f(p.u.uRain, rain);
  if (p.u.uTime) gl.uniform1f(p.u.uTime, time);
  if (p.u.uMoonPhase) gl.uniform1f(p.u.uMoonPhase, moonPhase);
  if (p.u.uFogTint) gl.uniform3fv(p.u.uFogTint, R.sky.fog);
  if (p.u.uDimension) gl.uniform1i(p.u.uDimension, dim);
  if (p.u.uCamPos) gl.uniform3f(p.u.uCamPos, camPos[0], camPos[1], camPos[2]);
  if (p.u.uSkyLightCol) gl.uniform3fv(p.u.uSkyLightCol, R.sky.skyLight);
  if (p.u.uBlockLightCol) gl.uniform3fv(p.u.uBlockLightCol, R.sky.blockLight);
  if (p.u.uAmbient) gl.uniform1f(p.u.uAmbient, R.sky.ambient);
  if (p.u.uMinLight) gl.uniform1f(p.u.uMinLight, R.settings.fullbright ? 0.88 : 0.0);
}
