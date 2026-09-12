/* =============================================================
 * BREACHPOINT — renderer
 *
 * Four small programs: world (baked-lit static geometry), skin
 * (animated characters and weapons), sprite (all effects) and sky.
 * Everything else is CPU-side batching, which keeps the draw-call
 * count in the low tens on integrated graphics.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, GL = CS.GL, Mat4 = CS.Mat4, Geo = CS.Geo, FX = CS.FX, W = CS.W, P = CS.P;

  /* ---------------------------------------------------------------
   * Shaders
   * ------------------------------------------------------------- */
  var VS_WORLD = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aNormal; attribute vec3 aColor; attribute vec2 aUV;',
    'uniform mat4 uViewProj; uniform vec3 uCam;',
    'varying vec3 vColor; varying vec2 vUV; varying float vDist; varying vec3 vNormal;',
    'void main(){',
    '  vColor = aColor; vUV = aUV; vNormal = aNormal;',
    '  vDist = length(aPos - uCam);',
    '  gl_Position = uViewProj * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  var FS_WORLD = [
    'precision mediump float;',
    'uniform sampler2D uDetail; uniform vec3 uFogColor; uniform vec2 uFogRange;',
    'uniform float uContrast; uniform float uFlat;',
    'varying vec3 vColor; varying vec2 vUV; varying float vDist; varying vec3 vNormal;',
    'void main(){',
    '  vec3 albedo = mix(texture2D(uDetail, vUV).rgb, vec3(0.62), uFlat);',
    '  vec3 col = albedo * vColor;',
    '  col = (col - 0.5) * uContrast + 0.5;',
    '  float f = clamp((vDist - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);',
    '  col = mix(col, uFogColor, f * f);',
    '  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);',
    '}'
  ].join('\n');

  var VS_SKIN = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec3 aNormal; attribute vec3 aColor; attribute float aBone;',
    'uniform mat4 uViewProj; uniform mat4 uModel; uniform mat4 uBones[12];',
    'uniform vec3 uCam;',
    'varying vec3 vColor; varying vec3 vNormal; varying float vDist; varying vec3 vView;',
    'mat4 boneAt(float idx){',
    '  for(int i = 0; i < 12; i++){ if(float(i) == idx) return uBones[i]; }',
    '  return uBones[0];',
    '}',
    'void main(){',
    '  mat4 b = boneAt(aBone);',
    '  vec4 local = b * vec4(aPos, 1.0);',
    '  vec4 world = uModel * local;',
    '  vec3 n = mat3(uModel) * (mat3(b) * aNormal);',
    '  vNormal = n;',
    '  vColor = aColor;',
    '  vView = world.xyz - uCam;',
    '  vDist = length(vView);',
    '  gl_Position = uViewProj * world;',
    '}'
  ].join('\n');

  var FS_SKIN = [
    'precision mediump float;',
    'uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbient;',
    'uniform vec3 uFogColor; uniform vec2 uFogRange; uniform vec4 uTint; uniform float uRim;',
    'uniform float uContrast;',
    'varying vec3 vColor; varying vec3 vNormal; varying float vDist; varying vec3 vView;',
    'void main(){',
    '  vec3 n = normalize(vNormal);',
    '  float ndl = max(dot(n, uSunDir), 0.0);',
    '  float wrap = max(dot(n, uSunDir) * 0.5 + 0.5, 0.0);',
    '  vec3 lit = uAmbient * (0.55 + 0.45 * wrap) + uSunCol * ndl;',
    '  vec3 col = vColor * lit;',
    '  vec3 v = normalize(-vView);',
    '  vec3 h = normalize(uSunDir + v);',
    '  float spec = pow(max(dot(n, h), 0.0), 48.0) * 0.14;',
    '  col += uSunCol * spec;',
    '  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5);',
    '  col += uTint.rgb * (rim * uRim);',
    '  col = mix(col, uTint.rgb, uTint.a);',
    '  col = (col - 0.5) * uContrast + 0.5;',
    '  float f = clamp((vDist - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);',
    '  col = mix(col, uFogColor, f * f);',
    '  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);',
    '}'
  ].join('\n');

  var VS_SPRITE = [
    'precision highp float;',
    'attribute vec3 aPos; attribute vec2 aUV; attribute vec4 aColor;',
    'uniform mat4 uViewProj;',
    'varying vec2 vUV; varying vec4 vColor;',
    'void main(){ vUV = aUV; vColor = aColor; gl_Position = uViewProj * vec4(aPos, 1.0); }'
  ].join('\n');

  var FS_SPRITE = [
    'precision mediump float;',
    'uniform sampler2D uAtlas;',
    'varying vec2 vUV; varying vec4 vColor;',
    'void main(){',
    '  vec4 t = texture2D(uAtlas, vUV);',
    '  gl_FragColor = vec4(vColor.rgb * t.rgb, t.a * vColor.a);',
    '  if (gl_FragColor.a < 0.004) discard;',
    '}'
  ].join('\n');

  var VS_SKY = [
    'precision highp float;',
    'attribute vec2 aPos; attribute vec3 aRay;',
    'varying vec3 vRay;',
    'void main(){ vRay = aRay; gl_Position = vec4(aPos, 0.999999, 1.0); }'
  ].join('\n');

  var FS_SKY = [
    'precision mediump float;',
    'uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uSunDir; uniform vec3 uSunCol;',
    'varying vec3 vRay;',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i), b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0)), d2 = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d2, f.x), f.y);',
    '}',
    'void main(){',
    '  vec3 d = normalize(vRay);',
    '  float t = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);',
    '  vec3 col = mix(uBottom, uTop, pow(t, 0.85));',
    // cloud band, projected onto the dome so it thins toward the horizon
    '  float up = max(d.y, 0.03);',
    '  vec2 cp = d.xz / up * 0.55;',
    '  float n = vnoise(cp * 1.3) * 0.55 + vnoise(cp * 3.1) * 0.30 + vnoise(cp * 7.0) * 0.15;',
    '  float cloud = smoothstep(0.52, 0.82, n) * smoothstep(0.02, 0.30, d.y);',
    '  col = mix(col, mix(vec3(1.0), uSunCol, 0.35), cloud * 0.55);',
    '  float sun = pow(max(dot(d, uSunDir), 0.0), 220.0);',
    '  col += uSunCol * sun * 1.2;',
    '  float halo = pow(max(dot(d, uSunDir), 0.0), 7.0);',
    '  col += uSunCol * halo * 0.14;',
    '  col = mix(col, uBottom, pow(1.0 - clamp(d.y * 3.0, 0.0, 1.0), 3.0) * 0.45);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------------
   * Renderer
   * ------------------------------------------------------------- */
  function Renderer(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    var q = C.QUALITY_PRESETS[settings.quality] || C.QUALITY_PRESETS.high;
    this.gl = GL.createContext(canvas, { antialias: q.aa && settings.quality !== 'low' });
    if (!this.gl) throw new Error('WebGL is not available in this browser.');
    var gl = this.gl;

    this.progWorld = GL.program(gl, VS_WORLD, FS_WORLD, 'world');
    this.progSkin = GL.program(gl, VS_SKIN, FS_SKIN, 'skin');
    this.progSprite = GL.program(gl, VS_SPRITE, FS_SPRITE, 'sprite');
    this.progSky = GL.program(gl, VS_SKY, FS_SKY, 'sky');

    this.matTex = {};
    var canvases = CS.Tex.buildAll();
    for (var mname in canvases) {
      this.matTex[mname] = GL.makeTexture(gl, canvases[mname], { aniso: q.anisotropy });
    }
    this.atlasTex = GL.makeTexture(gl, FX.makeAtlas(), { clamp: true, nomip: true });

    this.worldLayout = [
      { name: 'aPos', size: 3 }, { name: 'aNormal', size: 3 },
      { name: 'aColor', size: 3 }, { name: 'aUV', size: 2 }
    ];
    this.skinLayout = [
      { name: 'aPos', size: 3 }, { name: 'aNormal', size: 3 },
      { name: 'aColor', size: 3 }, { name: 'aBone', size: 1 }
    ];

    this.mapGroups = [];
    this.propMesh = null;
    this.charMeshes = {};
    this.weaponMeshes = {};
    this.handMesh = null;
    this.bombMesh = null;
    this.kitMesh = null;
    this.targetMesh = null;

    this.sprites = new FX.SpriteBatch(gl, 4200);
    this.particles = new FX.Particles(Math.round(900 * q.particles));
    this.decals = new FX.Decals(q.decals);
    this.tracers = new FX.Tracers(140);
    this.corpses = [];
    this.shells = [];

    // sky quad with per-corner rays
    this.skyData = new Float32Array(6 * 5);
    this.skyMesh = new GL.Mesh(gl, [{ name: 'aPos', size: 2 }, { name: 'aRay', size: 3 }]);

    this.viewProj = Mat4.create();
    this.proj = Mat4.create();
    this.view = Mat4.create();
    this.model = Mat4.create();
    this.tmp = Mat4.create();
    this.tmp2 = Mat4.create();
    this.bones = new Float32Array(12 * 16);
    this.boneMats = [];
    for (var i = 0; i < 12; i++) this.boneMats.push(this.bones.subarray(i * 16, i * 16 + 16));
    this.identityBones = new Float32Array(12 * 16);
    for (var b = 0; b < 12; b++) Mat4.identity(this.identityBones.subarray(b * 16, b * 16 + 16));

    this.env = null;
    this.quality = settings.quality;
    this.dpr = 1;
    this.width = 1; this.height = 1;
    this.frameCount = 0;
    this.drawCalls = 0;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearColor(0.05, 0.06, 0.08, 1);
  }

  /* Kept for reference; materials now come from CS.Tex. */
  function makeDetail() {
    var S = 256, cv = GL.makeCanvas(S), g = cv.getContext('2d');
    var img = g.createImageData(S, S);
    var d = img.data;
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var i = (y * S + x) * 4;
        // two octaves of value noise gives cloth/stone-like grain
        var n = (Math.sin(x * 0.37) * Math.cos(y * 0.29) * 0.5 + 0.5) * 0.35 +
                (Math.sin(x * 1.7 + y * 0.9) * 0.5 + 0.5) * 0.15 +
                Math.random() * 0.5;
        var v = 110 + n * 120;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    for (var s = 0; s < 22; s++) {
      g.lineWidth = Math.random() * 1.6;
      g.beginPath();
      var sx = Math.random() * S, sy = Math.random() * S;
      g.moveTo(sx, sy); g.lineTo(sx + (Math.random() - 0.5) * 70, sy + (Math.random() - 0.5) * 70);
      g.stroke();
    }
    return cv;
  }

  Renderer.prototype.applyQuality = function (quality) {
    this.quality = quality;
    var q = C.QUALITY_PRESETS[quality] || C.QUALITY_PRESETS.high;
    this.particles.max = Math.round(900 * q.particles);
    this.decals.max = q.decals;
    this.resize(true);
  };

  Renderer.prototype.resize = function (force) {
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    var scale = q.resScale * (this.settings.resolutionScale === undefined ? 1 : this.settings.resolutionScale);
    var dpr = Math.min(root.devicePixelRatio || 1, 2) * scale;
    var w = Math.max(2, Math.round(this.canvas.clientWidth * dpr));
    var h = Math.max(2, Math.round(this.canvas.clientHeight * dpr));
    if (!force && this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w; this.canvas.height = h;
    this.width = w; this.height = h;
    this.dpr = dpr;
  };

  /* ---------------------------------------------------------------
   * Map loading
   * ------------------------------------------------------------- */
  Renderer.prototype.loadMap = function (world, map) {
    var gl = this.gl;
    for (var d = 0; d < this.mapGroups.length; d++) this.mapGroups[d].mesh.dispose();
    this.mapGroups.length = 0;
    if (this.propMesh) this.propMesh.dispose();

    var built = Geo.buildMap(world, map, this.quality);
    for (var g = 0; g < built.groups.length; g++) {
      var grp = built.groups[g];
      this.mapGroups.push({
        mat: grp.mat,
        mesh: new GL.Mesh(gl, this.worldLayout).upload(grp.verts, grp.indices, false)
      });
    }
    this.mapStats = built.stats;

    var props = Geo.buildProps(map);
    this.propMesh = props.count ? new GL.Mesh(gl, this.worldLayout).upload(props.verts, props.indices, false) : null;

    this.env = map.env;
    this.skyTop = Geo.hexToRgb(map.env.sky[0]);
    this.skyBottom = Geo.hexToRgb(map.env.sky[1]);
    this.fogColor = Geo.hexToRgb(map.env.fog);
    var s = map.env.sun, sl = Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z) || 1;
    this.sunDir = [s.x / sl, s.y / sl, s.z / sl];
    this.sunCol = Geo.hexToRgb(map.env.sunColor);
    this.ambient = Geo.hexToRgb(map.env.ambient);
    this.sunI = map.env.sunIntensity;
    this.ambI = map.env.ambientIntensity;

    this.clearTransient();
    return built.stats;
  };

  Renderer.prototype.clearTransient = function () {
    this.particles.clear(); this.decals.clear(); this.tracers.clear();
    this.corpses.length = 0; this.shells.length = 0;
  };

  /* Meshes are built on demand and cached — nothing is loaded up front. */
  Renderer.prototype.charMesh = function (charId, gloveId, helmet) {
    var key = charId + '|' + gloveId + '|' + (helmet ? 1 : 0);
    if (!this.charMeshes[key]) {
      var m = Geo.buildCharacter(charId, gloveId, helmet);
      this.charMeshes[key] = new GL.Mesh(this.gl, this.skinLayout).upload(m.verts, m.indices, false);
    }
    return this.charMeshes[key];
  };
  Renderer.prototype.weaponMesh = function (weaponId, skinId) {
    var key = weaponId + '|' + (skinId || 'factory');
    if (!this.weaponMeshes[key]) {
      var m = Geo.buildWeapon(weaponId, skinId);
      this.weaponMeshes[key] = new GL.Mesh(this.gl, this.skinLayout).upload(m.verts, m.indices, false);
    }
    return this.weaponMeshes[key];
  };
  Renderer.prototype.simpleMesh = function (name, builder) {
    if (!this['_m_' + name]) {
      var m = builder();
      this['_m_' + name] = new GL.Mesh(this.gl, this.skinLayout).upload(m.verts, m.indices, false);
    }
    return this['_m_' + name];
  };

  /* ---------------------------------------------------------------
   * Character animation — procedural, driven by movement state
   * ------------------------------------------------------------- */
  var _m = Mat4.create(), _m2 = Mat4.create();

  function boneMatrix(out, off, rx, ry, rz) {
    Mat4.identity(out);
    Mat4.translate(out, out, off[0], off[1], off[2]);
    if (rz) Mat4.rotateZ(out, out, rz);
    if (ry) Mat4.rotateY(out, out, ry);
    if (rx) Mat4.rotateX(out, out, rx);
    return out;
  }

  Renderer.prototype.poseCharacter = function (p, time, dead, deadT) {
    var S = Geo.SKELETON, bones = this.boneMats;
    var speed = p.netSpeed !== undefined && !p.local ? p.netSpeed : P.speed2D(p);
    var moving = speed > 0.35;
    var cycle = (p.animPhase = (p.animPhase || 0) + (moving ? speed * 1.35 : 0) * (1 / 60));
    var swing = moving ? Math.sin(cycle) : 0;
    var swing2 = moving ? Math.sin(cycle * 2) : 0;
    var amp = M.clamp(speed / C.MAX_SPEED, 0, 1);
    var duck = p.duckAmount || 0;
    var pitch = M.clamp(p.pitch, -1.2, 1.2);

    // idle breathing
    var breathe = Math.sin(time * 1.6 + (p.animSeed || 0)) * 0.012;

    var pelvisY = -duck * 0.42 + (moving ? Math.abs(swing2) * 0.035 * amp : breathe);
    var lean = 0, twist = 0, collapse = 0;
    if (dead) {
      collapse = M.clamp(deadT / 0.55, 0, 1);
      pelvisY -= collapse * 0.62;
      lean = collapse * (Math.PI * 0.47);
    }

    // 0 pelvis
    var pm = boneMatrix(bones[0], [S[0].off[0], S[0].off[1] + pelvisY, S[0].off[2]], 0, 0, 0);
    if (dead) Mat4.rotateZ(pm, pm, -lean);
    if (moving) Mat4.rotateY(pm, pm, swing * 0.07 * amp);

    // 1 spine
    var spineRot = duck * 0.35 + (dead ? 0.1 : 0) + M.clamp(-pitch * 0.22, -0.3, 0.3);
    Mat4.identity(_m);
    Mat4.translate(_m, _m, S[1].off[0], S[1].off[1], S[1].off[2]);
    Mat4.rotateZ(_m, _m, spineRot);
    Mat4.rotateY(_m, _m, moving ? -swing * 0.11 * amp : 0);
    Mat4.multiply(bones[1], pm, _m);

    // 2 head — tracks aim pitch
    Mat4.identity(_m);
    Mat4.translate(_m, _m, S[2].off[0], S[2].off[1], S[2].off[2]);
    Mat4.rotateZ(_m, _m, M.clamp(pitch * 0.8, -0.9, 0.9) - spineRot * 0.55 + (dead ? 0.5 : 0));
    Mat4.multiply(bones[2], bones[1], _m);

    // arms — the right arm holds the weapon and follows the aim line
    var aimX = M.clamp(-pitch, -1.1, 1.1);
    var armRU = dead ? (1.1 + collapse * 0.5) : (-1.32 + aimX * 0.85);
    var armRL = dead ? -1.5 : (-0.55 - Math.abs(aimX) * 0.15);
    var armLU = dead ? (1.2 + collapse * 0.4) : (-1.44 + aimX * 0.8);
    var armLL = dead ? -1.3 : (-0.75);
    var armSwing = moving && !dead ? swing * 0.28 * amp : 0;

    Mat4.identity(_m);
    Mat4.translate(_m, _m, S[3].off[0], S[3].off[1], S[3].off[2]);
    Mat4.rotateY(_m, _m, 0.45);
    Mat4.rotateZ(_m, _m, armLU - armSwing * 0.4);
    Mat4.multiply(bones[3], bones[1], _m);
    Mat4.multiply(bones[4], bones[3], boneMatrix(_m2, S[4].off, 0, 0, armLL));

    Mat4.identity(_m);
    Mat4.translate(_m, _m, S[5].off[0], S[5].off[1], S[5].off[2]);
    Mat4.rotateY(_m, _m, -0.35);
    Mat4.rotateZ(_m, _m, armRU + armSwing * 0.4);
    Mat4.multiply(bones[5], bones[1], _m);
    Mat4.multiply(bones[6], bones[5], boneMatrix(_m2, S[6].off, 0, 0, armRL));

    // legs
    var legSwing = moving && !dead ? swing * 0.62 * amp : 0;
    var legSpread = dead ? 0.45 * collapse : 0;
    Mat4.multiply(bones[7], pm, boneMatrix(_m, S[7].off, legSpread, 0, legSwing + duck * 0.55));
    Mat4.multiply(bones[8], bones[7], boneMatrix(_m2, S[8].off, 0, 0, -Math.max(0, legSwing) * 0.9 - duck * 0.9 - (dead ? 0.8 : 0)));
    Mat4.multiply(bones[9], pm, boneMatrix(_m, S[9].off, -legSpread, 0, -legSwing + duck * 0.55));
    Mat4.multiply(bones[10], bones[9], boneMatrix(_m2, S[10].off, 0, 0, -Math.max(0, -legSwing) * 0.9 - duck * 0.9 - (dead ? 0.8 : 0)));

    // weapon attaches to the right hand
    Mat4.identity(_m);
    Mat4.translate(_m, _m, S[11].off[0], S[11].off[1], S[11].off[2]);
    Mat4.rotateZ(_m, _m, 1.35);
    Mat4.multiply(bones[11], bones[6], _m);

    return this.bones;
  };

  /* ---------------------------------------------------------------
   * Frame
   * ------------------------------------------------------------- */
  Renderer.prototype.render = function (scene) {
    var gl = this.gl;
    this.resize();
    this.drawCalls = 0;
    this.frameCount++;

    var cam = scene.camera;
    var aspect = this.width / this.height;
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;

    // Hor+ like every competitive shooter: the FOV number is the 4:3 vertical
    // field, and a wider monitor shows more to the sides rather than zooming in.
    // 90 here is ~106 degrees horizontal on 16:9, which is what CS feels like.
    var fov = M.clamp(this.settings.fov || 90, 60, 130) * M.DEG;
    var zoom = cam.zoom || 1;
    var vFov = 2 * Math.atan(Math.tan(fov / 2) * 0.75) / zoom;
    vFov = M.clamp(vFov, 0.05, 2.6);

    Mat4.perspective(this.proj, vFov, aspect, 0.03, q.viewDistance + 60);
    Mat4.fpsView(this.view, cam.x, cam.y, cam.z, cam.yaw, cam.pitch, cam.roll || 0);
    Mat4.multiply(this.viewProj, this.proj, this.view);

    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.drawSky(cam, vFov, aspect);
    this.drawWorld(cam);
    this.drawEntities(scene);
    this.drawEffects(scene, cam);
    if (scene.viewmodel) this.drawViewmodel(scene, aspect);

    return this.drawCalls;
  };

  Renderer.prototype.drawSky = function (cam, vFov, aspect) {
    var gl = this.gl;
    // rays for the four screen corners, so the gradient follows the view
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    var fx = cp * cy, fy = sp, fz = -cp * sy;
    var rl = Math.sqrt(fz * fz + fx * fx) || 1;
    var rx = -fz / rl, ry = 0, rz = fx / rl;
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    var th = Math.tan(vFov / 2), tw = th * aspect;

    var d = this.skyData, o = 0;
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (var i = 0; i < 6; i++) {
      var sx = corners[i][0], sy2 = corners[i][1];
      d[o++] = sx; d[o++] = sy2;
      d[o++] = fx + rx * sx * tw + ux * sy2 * th;
      d[o++] = fy + ry * sx * tw + uy * sy2 * th;
      d[o++] = fz + rz * sx * tw + uz * sy2 * th;
    }
    this.skyMesh.updateSub(d, 6);

    gl.useProgram(this.progSky.p);
    gl.depthMask(false);
    gl.uniform3fv(this.progSky.u.uTop, this.skyTop);
    gl.uniform3fv(this.progSky.u.uBottom, this.skyBottom);
    gl.uniform3fv(this.progSky.u.uSunDir, this.sunDir);
    gl.uniform3fv(this.progSky.u.uSunCol, this.sunCol);
    this.skyMesh.draw(this.progSky);
    gl.depthMask(true);
    this.drawCalls++;
  };

  Renderer.prototype.drawWorld = function (cam) {
    var gl = this.gl;
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    gl.useProgram(this.progWorld.p);
    gl.uniformMatrix4fv(this.progWorld.u.uViewProj, false, this.viewProj);
    gl.uniform3f(this.progWorld.u.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(this.progWorld.u.uFogColor, this.fogColor);
    gl.uniform2f(this.progWorld.u.uFogRange, this.env.fogNear, this.env.fogFar * q.fogDensity);
    gl.uniform1f(this.progWorld.u.uContrast, 1.04);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.progWorld.u.uDetail, 0);
    for (var i = 0; i < this.mapGroups.length; i++) {
      var grp = this.mapGroups[i];
      gl.bindTexture(gl.TEXTURE_2D, this.matTex[grp.mat] || this.matTex.concrete);
      grp.mesh.draw(this.progWorld);
      this.drawCalls++;
    }
    if (this.propMesh) {
      gl.bindTexture(gl.TEXTURE_2D, this.matTex.concrete);
      gl.uniform1f(this.progWorld.u.uFlat, 1);
      this.propMesh.draw(this.progWorld);
      gl.uniform1f(this.progWorld.u.uFlat, 0);
      this.drawCalls++;
    }
  };

  Renderer.prototype.beginSkin = function (cam) {
    var gl = this.gl;
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    gl.useProgram(this.progSkin.p);
    gl.uniformMatrix4fv(this.progSkin.u.uViewProj, false, this.viewProj);
    gl.uniform3f(this.progSkin.u.uCam, cam.x, cam.y, cam.z);
    gl.uniform3fv(this.progSkin.u.uSunDir, this.sunDir);
    gl.uniform3f(this.progSkin.u.uSunCol, this.sunCol[0] * this.sunI, this.sunCol[1] * this.sunI, this.sunCol[2] * this.sunI);
    gl.uniform3f(this.progSkin.u.uAmbient, this.ambient[0] * this.ambI, this.ambient[1] * this.ambI, this.ambient[2] * this.ambI);
    gl.uniform3fv(this.progSkin.u.uFogColor, this.fogColor);
    gl.uniform2f(this.progSkin.u.uFogRange, this.env.fogNear, this.env.fogFar * q.fogDensity);
    gl.uniform1f(this.progSkin.u.uContrast, 1.06);
    gl.uniform4f(this.progSkin.u.uTint, 0, 0, 0, 0);
    gl.uniform1f(this.progSkin.u.uRim, 0);
  };

  Renderer.prototype.drawSkinned = function (mesh, model, bones, tint, rim) {
    var gl = this.gl;
    gl.uniformMatrix4fv(this.progSkin.u.uModel, false, model);
    gl.uniformMatrix4fv(this.progSkin.u.uBones, false, bones || this.identityBones);
    if (tint) gl.uniform4f(this.progSkin.u.uTint, tint[0], tint[1], tint[2], tint[3]);
    else gl.uniform4f(this.progSkin.u.uTint, 0, 0, 0, 0);
    gl.uniform1f(this.progSkin.u.uRim, rim || 0);
    mesh.draw(this.progSkin);
    this.drawCalls++;
  };

  Renderer.prototype.drawEntities = function (scene) {
    var gl = this.gl, cam = scene.camera;
    this.beginSkin(cam);

    var i, p, model = this.model;
    var settings = this.settings;
    var localTeam = scene.local ? scene.local.team : 0;

    for (i = 0; i < scene.players.length; i++) {
      p = scene.players[i];
      if (!p.alive) continue;
      if (scene.local && p === scene.local && !scene.thirdPerson) continue;
      if (p.animSeed === undefined) p.animSeed = Math.random() * 10;

      var dist = M.vdist(cam, p.pos);
      if (dist > 180) continue;

      var bones = this.poseCharacter(p, scene.time, false, 0);
      Mat4.identity(model);
      Mat4.translate(model, model, p.pos.x, p.pos.y, p.pos.z);
      Mat4.rotateY(model, model, p.yaw);

      var charId = p.charId || (p.team === C.TEAM.ATT ? 'syn_default' : 'van_default');
      var mesh = this.charMesh(charId, p.gloveId || 'default', !!p.helmet);
      // enemies get a subtle rim light so silhouettes read against busy geometry
      var enemy = localTeam && p.team !== localTeam;
      var ti = C.TEAM_INFO[p.team];
      var rc = ti ? Geo.hexToRgb(ti.color) : [1, 1, 1];
      var tint = [rc[0], rc[1], rc[2], p.hitFlash ? Math.min(0.55, p.hitFlash) : 0];
      this.drawSkinned(mesh, model, bones, tint, enemy ? 0.30 : 0.12);

      // held weapon
      var wid = p.netWeapon || (P.curSlot(p) ? P.curWeapon(p).id : null);
      if (wid && wid !== 'bomb') {
        var wm = this.weaponMesh(wid, (settings.skins && settings.skins[wid]) || 'factory');
        Mat4.multiply(this.tmp, model, this.boneMats[11]);
        this.drawSkinned(wm, this.tmp, this.identityBones, null, 0);
      }
      if (p.bomb) {
        Mat4.identity(this.tmp2);
        Mat4.translate(this.tmp2, this.tmp2, p.pos.x, p.pos.y, p.pos.z);
        Mat4.rotateY(this.tmp2, this.tmp2, p.yaw);
        Mat4.translate(this.tmp2, this.tmp2, -0.18, 0.95 - (p.duckAmount || 0) * 0.42, 0);
        this.drawSkinned(this.simpleMesh('bomb', Geo.buildBomb), this.tmp2, this.identityBones, null, 0.3);
      }
    }

    // corpses
    for (i = 0; i < this.corpses.length; i++) {
      var c = this.corpses[i];
      var cb = this.poseCharacter(c.p, scene.time, true, c.t);
      Mat4.identity(model);
      Mat4.translate(model, model, c.x, c.y, c.z);
      Mat4.rotateY(model, model, c.yaw);
      this.drawSkinned(this.charMesh(c.charId, c.gloveId, c.helmet), model, cb, [0.25, 0.05, 0.05, 0.12], 0.15);
    }

    // dropped weapons
    if (scene.dropped) {
      for (i = 0; i < scene.dropped.length; i++) {
        var d = scene.dropped[i];
        Mat4.identity(model);
        Mat4.translate(model, model, d.x, d.y + 0.06, d.z);
        Mat4.rotateY(model, model, d.yaw || 0);
        Mat4.rotateZ(model, model, 0.06);
        this.drawSkinned(this.weaponMesh(d.wid, 'factory'), model, this.identityBones, null, 0.35);
      }
    }

    // planted / dropped bomb
    if (scene.bomb && (scene.bomb.planted || scene.bomb.dropped)) {
      Mat4.identity(model);
      Mat4.translate(model, model, scene.bomb.x, scene.bomb.y, scene.bomb.z);
      Mat4.rotateY(model, model, scene.time * 0.3);
      var blink = scene.bomb.planted ? (Math.sin(scene.time * 14) * 0.5 + 0.5) : 0;
      this.drawSkinned(this.simpleMesh('bomb', Geo.buildBomb), model, this.identityBones,
                       [1, 0.2, 0.15, blink * 0.5], 0.7);
    }

    // aim-training targets
    if (scene.targets) {
      for (i = 0; i < scene.targets.length; i++) {
        var t = scene.targets[i];
        Mat4.identity(model);
        Mat4.translate(model, model, t.x, t.y, t.z);
        Mat4.rotateY(model, model, Math.sin(scene.time + t.bob) * 0.5);
        this.drawSkinned(this.simpleMesh('target', Geo.buildTarget), model, this.identityBones, null, 0.4);
      }
    }

    // live grenades in flight
    if (scene.nades) {
      for (i = 0; i < scene.nades.proj.length; i++) {
        var g = scene.nades.proj[i];
        Mat4.identity(model);
        Mat4.translate(model, model, g.pos.x, g.pos.y, g.pos.z);
        Mat4.rotateY(model, model, g.spin);
        Mat4.rotateZ(model, model, g.spin * 1.7);
        this.drawSkinned(this.weaponMesh(g.wid, 'factory'), model, this.identityBones, null, 0.4);
      }
    }
  };

  /* ---------------------------------------------------------------
   * Effects pass
   * ------------------------------------------------------------- */
  Renderer.prototype.drawEffects = function (scene, cam) {
    var gl = this.gl;
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    var fx = cp * cy, fy = sp, fz = -cp * sy;
    var rl = Math.sqrt(fz * fz + fx * fx) || 1;
    var rx = -fz / rl, ry = 0, rz = fx / rl;
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;

    var b = this.sprites;
    b.begin();

    // ground shadows for every visible body
    var i, p;
    for (i = 0; i < scene.players.length; i++) {
      p = scene.players[i];
      if (!p.alive) continue;
      if (scene.local && p === scene.local && !scene.thirdPerson) continue;
      var gy = scene.world ? scene.world.dropToFloor(p.pos.x, p.pos.y + 0.3, p.pos.z, 4) : p.pos.y;
      var h = M.clamp(1 - (p.pos.y - gy) / 3, 0.25, 1);
      b.addOriented(p.pos.x, gy + 0.02, p.pos.z, 1.25 * h, FX.T.SHADOW, 0, 0, 0, 0.55 * h, 1, 0, 0, 0, 0, 1);
    }
    for (i = 0; i < this.corpses.length; i++) {
      var c = this.corpses[i];
      b.addOriented(c.x, c.gy + 0.02, c.z, 1.6, FX.T.SHADOW, 0, 0, 0, 0.45, 1, 0, 0, 0, 0, 1);
    }

    this.decals.draw(b);

    // fire
    if (scene.nades) {
      for (i = 0; i < scene.nades.fires.length; i++) {
        var f = scene.nades.fires[i];
        if (f.grow <= 0.02) continue;
        var puffs = this.quality === 'low' ? 3 : 6;
        for (var k = 0; k < puffs; k++) {
          var a = (k / puffs) * 6.283 + scene.time * 0.8 + f.id;
          var rr = f.radius * (0.25 + 0.6 * ((k * 37 % 11) / 11));
          var px = f.pos.x + Math.cos(a) * rr, pz = f.pos.z + Math.sin(a) * rr;
          var flick = 0.6 + 0.4 * Math.sin(scene.time * 11 + k * 2.1 + f.id);
          var hgt = 0.35 + flick * 0.65;
          b.add(px, f.pos.y + hgt * 0.5, pz, (0.9 + flick * 0.5) * f.grow, FX.T.FIRE,
                1, 0.72, 0.34, 0.72 * f.grow, 0, rx, ry, rz, ux, uy, uz);
        }
        b.addOriented(f.pos.x, f.pos.y + 0.03, f.pos.z, f.radius * 2.1, FX.T.SCORCH,
                      0.6, 0.25, 0.08, 0.4 * f.grow, 1, 0, 0, 0, 0, 1);
      }

      // smoke volumes — deterministic puff cloud so they look stable, not boiling
      var segs = (C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high).smokeSegments;
      for (i = 0; i < scene.nades.smokes.length; i++) {
        var sm = scene.nades.smokes[i];
        if (sm.opacity <= 0.01) continue;
        for (var s = 0; s < segs; s++) {
          var h1 = M.hash01(sm.id, s * 3 + 1), h2 = M.hash01(sm.id, s * 3 + 2), h3 = M.hash01(sm.id, s * 3 + 3);
          var theta = h1 * 6.283, phi = Math.acos(2 * h2 - 1);
          var rad = sm.radius * 0.78 * Math.pow(h3, 0.38);
          var px2 = sm.pos.x + Math.sin(phi) * Math.cos(theta) * rad;
          var py2 = sm.pos.y + Math.cos(phi) * rad * 0.82;
          var pz2 = sm.pos.z + Math.sin(phi) * Math.sin(theta) * rad;
          var drift = Math.sin(scene.time * 0.5 + s) * 0.06;
          b.add(px2 + drift, py2, pz2, sm.radius * 1.45, s % 3 === 0 ? FX.T.SMOKE2 : FX.T.PUFF,
                0.80, 0.81, 0.83, sm.opacity * 0.42, h1 * 6.283 + scene.time * 0.08,
                rx, ry, rz, ux, uy, uz);
        }
      }
    }

    this.particles.draw(b, rx, ry, rz, ux, uy, uz);
    this.tracers.draw(b, cam.x, cam.y, cam.z);

    // shells
    for (i = 0; i < this.shells.length; i++) {
      var sh = this.shells[i];
      b.add(sh.x, sh.y, sh.z, 0.05, FX.T.SHELL, 1, 1, 1, M.clamp((sh.max - sh.t) * 2, 0, 1),
            sh.rot, rx, ry, rz, ux, uy, uz, 2.2);
    }

    gl.useProgram(this.progSprite.p);
    gl.uniformMatrix4fv(this.progSprite.u.uViewProj, false, this.viewProj);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.uniform1i(this.progSprite.u.uAtlas, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    b.flush(this.progSprite);
    this.drawCalls++;
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  };

  /* ---------------------------------------------------------------
   * Viewmodel
   * ------------------------------------------------------------- */
  Renderer.prototype.drawViewmodel = function (scene, aspect) {
    var gl = this.gl;
    var vm = scene.viewmodel;
    var cam = scene.camera;
    if (vm.hidden) return;

    // viewmodel_fov is vertical, independent of the world FOV — that is what
    // keeps the weapon the same size when a player changes their world FOV.
    var vFov = M.clamp((this.settings.viewmodelFov || 68) * M.DEG, 0.5, 1.8);
    // Viewmodel lives in plain camera space: -Z forward, +X right, +Y up.
    Mat4.perspective(this.viewProj, vFov, aspect, 0.01, 12);

    gl.clear(gl.DEPTH_BUFFER_BIT);
    this.beginSkin({ x: 0, y: 0, z: 0 });
    gl.uniformMatrix4fv(this.progSkin.u.uViewProj, false, this.viewProj);
    // viewmodel lighting is view-relative so it never goes flat black indoors
    gl.uniform3f(this.progSkin.u.uSunDir, -0.34, 0.60, 0.72);
    gl.uniform3f(this.progSkin.u.uSunCol, this.sunCol[0] * 0.95, this.sunCol[1] * 0.93, this.sunCol[2] * 0.90);
    gl.uniform3f(this.progSkin.u.uAmbient, this.ambient[0] * (this.ambI + 0.62) + 0.10,
                 this.ambient[1] * (this.ambI + 0.62) + 0.10, this.ambient[2] * (this.ambI + 0.62) + 0.11);
    gl.uniform2f(this.progSkin.u.uFogRange, 900, 1000);

    var side = this.settings.viewmodelSide === undefined ? 1 : this.settings.viewmodelSide;
    var model = this.model;
    Mat4.identity(model);
    // model space: +X forward, +Y up, +Z right. Camera space: -Z forward, +X right.
    Mat4.translate(model, model, (vm.x) * side, vm.y, vm.z);
    Mat4.rotateY(model, model, Math.PI * 0.5 + vm.yaw * side);
    Mat4.rotateX(model, model, vm.roll * side);
    Mat4.rotateZ(model, model, vm.pitch);
    Mat4.scale(model, model, vm.scale, vm.scale, vm.scale * side);

    if (side < 0) gl.frontFace(gl.CW);
    if (vm.weaponId) {
      var mesh = this.weaponMesh(vm.weaponId, vm.skin || 'factory');
      this.drawSkinned(mesh, model, this.identityBones, vm.tint || null, 0.25);
      if (!vm.noHands) {
        var hkey = 'hands_' + vm.weaponId + '_' + (vm.glove || 'default');
        var wid = vm.weaponId, glove = vm.glove || 'default';
        this.drawSkinned(this.simpleMesh(hkey, function () {
          return Geo.buildHands(wid, glove);
        }), model, this.identityBones, null, 0.2);
      }
    }
    gl.frontFace(gl.CCW);
    gl.uniform2f(this.progSkin.u.uFogRange, this.env.fogNear, this.env.fogFar);

    // muzzle flash sits in view space too so it never clips into a wall
    if (vm.flash > 0) {
      var b = this.sprites;
      b.begin();
      var fpos = vm.flashPos || [0.55, -0.05, -0.9];
      b.add(fpos[0] * side, fpos[1], fpos[2], (0.11 + vm.flash * 0.10) * (vm.flashScale || 1), FX.T.FLASH,
            1, 0.93, 0.70, Math.min(1, vm.flash * 1.5), vm.flashRot || 0,
            1, 0, 0, 0, 1, 0);
      gl.useProgram(this.progSprite.p);
      gl.uniformMatrix4fv(this.progSprite.u.uViewProj, false, this.viewProj);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
      gl.uniform1i(this.progSprite.u.uAtlas, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      b.flush(this.progSprite);
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      this.drawCalls++;
    }
  };

  /* ---------------------------------------------------------------
   * Effect spawners
   * ------------------------------------------------------------- */
  Renderer.prototype.spawnImpact = function (x, y, z, nx, ny, nz, mat, power) {
    var surf = C.SURF[mat] || C.SURF.concrete;
    var col = Geo.hexToRgb(surf.dust);
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    var n = Math.round((4 + Math.random() * 4) * q.particles);
    for (var i = 0; i < n; i++) {
      var sx = nx + (Math.random() - 0.5) * 1.3;
      var sy = ny + (Math.random() - 0.5) * 1.3 + 0.3;
      var sz = nz + (Math.random() - 0.5) * 1.3;
      var sp = 1.4 + Math.random() * 3.4;
      this.particles.spawn({
        x: x, y: y, z: z, vx: sx * sp, vy: sy * sp, vz: sz * sp,
        size: 0.035 + Math.random() * 0.05, size2: 0.16 + Math.random() * 0.14,
        life: 0.32 + Math.random() * 0.4, tile: FX.T.DUST,
        r: col[0], g: col[1], b: col[2], a: 0.62, a2: 0, grav: 5.5, drag: 2.4,
        spin: (Math.random() - 0.5) * 6
      });
    }
    // a couple of sparks off hard surfaces
    if (surf.hard > 0.8) {
      for (var s = 0; s < 3; s++) {
        this.particles.spawn({
          x: x, y: y, z: z,
          vx: nx * 3 + (Math.random() - 0.5) * 4, vy: ny * 3 + Math.random() * 3, vz: nz * 3 + (Math.random() - 0.5) * 4,
          size: 0.09, size2: 0.02, life: 0.16 + Math.random() * 0.16, tile: FX.T.SPARK,
          r: 1, g: 0.86, b: 0.5, a: 1, a2: 0, grav: 9, drag: 1.2, aspect: 0.3,
          rot: Math.random() * 6.28, spin: 8
        });
      }
    }
    this.decals.add(x, y, z, nx, ny, nz, 0.16 + Math.random() * 0.07,
                    surf.hard > 1.05 ? FX.T.CRACK : FX.T.HOLE, 1, 1, 1, 0.92, 0);
  };

  Renderer.prototype.spawnBlood = function (x, y, z, dx, dy, dz, amount, world) {
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    var n = Math.round(M.clamp(amount * 0.28, 3, 14) * q.particles);
    for (var i = 0; i < n; i++) {
      this.particles.spawn({
        x: x, y: y, z: z,
        vx: dx * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2.2,
        vy: dy * 2 + Math.random() * 2.0,
        vz: dz * (1 + Math.random() * 3) + (Math.random() - 0.5) * 2.2,
        size: 0.05 + Math.random() * 0.06, size2: 0.03,
        life: 0.45 + Math.random() * 0.45, tile: FX.T.BLOOD,
        r: 0.75, g: 0.08, b: 0.09, a: 0.95, a2: 0, grav: 9.5, drag: 1.1, bounce: 0
      });
    }
    // a puff that reads instantly as "you hit them"
    this.particles.spawn({
      x: x, y: y, z: z, vx: dx, vy: dy + 0.3, vz: dz,
      size: 0.18, size2: 0.5, life: 0.28, tile: FX.T.SPLAT,
      r: 0.62, g: 0.05, b: 0.06, a: 0.6, a2: 0, drag: 3
    });
    if (world) {
      var h = world.rayWorld(x, y, z, dx, dy - 0.3, dz, 3.5);
      if (h) this.decals.add(h.x, h.y, h.z, h.nx, h.ny, h.nz, 0.35 + Math.random() * 0.3,
                             FX.T.SPLAT, 1, 1, 1, 0.72, 26);
    }
  };

  Renderer.prototype.spawnExplosion = function (x, y, z, radius, world) {
    var q = C.QUALITY_PRESETS[this.quality] || C.QUALITY_PRESETS.high;
    var n = Math.round(26 * q.particles);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, e = Math.random() * 1.2 - 0.1;
      var sp = 4 + Math.random() * 12;
      this.particles.spawn({
        x: x, y: y, z: z,
        vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 2, vz: Math.sin(a) * Math.cos(e) * sp,
        size: 0.25, size2: 1.5 + Math.random(), life: 0.5 + Math.random() * 0.7,
        tile: i % 3 === 0 ? FX.T.FIRE : FX.T.PUFF,
        r: i % 3 === 0 ? 1 : 0.55, g: i % 3 === 0 ? 0.7 : 0.53, b: i % 3 === 0 ? 0.28 : 0.5,
        a: 0.85, a2: 0, grav: 1.5, drag: 1.8, spin: (Math.random() - 0.5) * 3
      });
    }
    this.particles.spawn({ x: x, y: y, z: z, size: 0.6, size2: radius * 1.6, life: 0.28,
                           tile: FX.T.RING, r: 1, g: 0.9, b: 0.7, a: 0.8, a2: 0, drag: 0 });
    if (world) {
      var h = world.rayWorld(x, y, z, 0, -1, 0, 4);
      if (h) this.decals.add(h.x, h.y, h.z, h.nx, h.ny, h.nz, radius * 0.8, FX.T.SCORCH, 1, 1, 1, 0.8, 45);
    }
  };

  Renderer.prototype.spawnShell = function (x, y, z, vx, vy, vz) {
    if (this.shells.length > 60) this.shells.shift();
    this.shells.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, t: 0, max: 2.2, rot: Math.random() * 6.28, spin: 12 });
  };

  Renderer.prototype.addCorpse = function (p, world, charId, gloveId) {
    if (this.corpses.length > 12) this.corpses.shift();
    var gy = world ? world.dropToFloor(p.pos.x, p.pos.y + 0.4, p.pos.z, 5) : p.pos.y;
    this.corpses.push({
      p: { pitch: 0, duckAmount: 0, vel: { x: 0, y: 0, z: 0 }, netSpeed: 0, animPhase: 0, animSeed: 0, local: false },
      x: p.pos.x, y: p.pos.y, z: p.pos.z, gy: gy, yaw: p.yaw,
      charId: charId, gloveId: gloveId, helmet: p.helmet, t: 0, life: 22,
      vy: 0, slideX: (p.deathDir !== undefined ? Math.cos(p.deathDir) : 0) * 1.2,
      slideZ: (p.deathDir !== undefined ? -Math.sin(p.deathDir) : 0) * 1.2
    });
  };

  Renderer.prototype.updateFX = function (dt, world) {
    this.particles.update(dt, world);
    this.decals.update(dt);
    this.tracers.update(dt);

    var i;
    for (i = this.shells.length - 1; i >= 0; i--) {
      var s = this.shells[i];
      s.t += dt;
      if (s.t > s.max) { this.shells.splice(i, 1); continue; }
      s.vy -= C.GRAVITY * dt;
      var nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, nz = s.z + s.vz * dt;
      if (world && s.vy < 0) {
        var floor = world.dropToFloor(nx, s.y + 0.2, nz, 1.2);
        if (ny <= floor + 0.02) { ny = floor + 0.02; s.vy *= -0.32; s.vx *= 0.5; s.vz *= 0.5; }
      }
      s.x = nx; s.y = ny; s.z = nz;
      s.rot += s.spin * dt;
    }
    for (i = this.corpses.length - 1; i >= 0; i--) {
      var c = this.corpses[i];
      c.t += dt;
      if (c.t > c.life) { this.corpses.splice(i, 1); continue; }
      // slump to the floor and slide a little in the direction of the shot
      var k = Math.exp(-4 * dt);
      c.x += c.slideX * dt; c.z += c.slideZ * dt;
      c.slideX *= k; c.slideZ *= k;
      c.vy -= C.GRAVITY * dt;
      c.y += c.vy * dt;
      if (world) {
        c.gy = world.dropToFloor(c.x, c.y + 1.0, c.z, 6);
        if (c.y < c.gy) { c.y = c.gy; c.vy = 0; }
      }
    }
  };

  CS.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
