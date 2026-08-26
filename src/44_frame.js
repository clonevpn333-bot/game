/* =========================================================================
 * FRAME — the per-frame render pipeline.
 *   shadow depth -> sky -> opaque -> cutout -> entities -> copy ->
 *   water -> particles -> weather -> viewmodel -> bloom/godrays -> composite
 * ========================================================================= */

var _visible = [];      // [chunk, sy, dist] for this frame
var _tmpVec = new Float32Array(3);

function gatherVisible(world, dim, camX, camY, camZ, frustum, maxDist) {
  _visible.length = 0;
  var dims = world.dims[dim];
  var d2max = maxDist * maxDist;
  for (var key in dims) {
    var c = dims[key];
    if (!c.meshed) continue;
    var ox = c.cx * 16, oz = c.cz * 16;
    var dx = ox + 8 - camX, dz = oz + 8 - camZ;
    var d2 = dx * dx + dz * dz;
    if (d2 > d2max) continue;
    for (var sy = 0; sy < N_SECT; sy++) {
      var m = c.mesh[sy];
      if (!m || (!m[0] && !m[1] && !m[2])) continue;
      var oy = sy * 16;
      if (!frustum.boxIn(ox, oy, oz, ox + 16, oy + 16, oz + 16)) continue;
      var dy = oy + 8 - camY;
      _visible.push(c, sy, d2 + dy * dy);
    }
  }
}

/* The shadow pass only needs the sections the shadow map actually covers,
   which is a fraction of what the camera sees at a long render distance. */
var _shadowCull = 0, _shadowCam = [0, 0, 0];
function drawChunkPass(prog, pass, sortFar) {
  var n = _visible.length / 3;
  var order = null;
  if (sortFar) {
    order = [];
    for (var i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return _visible[b * 3 + 2] - _visible[a * 3 + 2]; });
  }
  var tris = 0;
  for (var k = 0; k < n; k++) {
    var idx = order ? order[k] : k;
    var c = _visible[idx * 3], sy = _visible[idx * 3 + 1];
    var m = c.mesh[sy][pass];
    if (!m) continue;
    if (_shadowCull > 0) {
      var ddx = c.cx * 16 + 8 - _shadowCam[0], ddz = c.cz * 16 + 8 - _shadowCam[2];
      var ddy = sy * 16 + 8 - _shadowCam[1];
      if (ddx * ddx + ddy * ddy + ddz * ddz > _shadowCull) continue;
    }
    gl.uniform3f(prog.u.uChunkOrigin, c.cx * 16, sy * 16, c.cz * 16);
    if (prog.u.uTintTex && c.tintTex) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, c.tintTex);
      gl.uniform1i(prog.u.uTintTex, 1);
    }
    gl.bindVertexArray(m.vao);
    gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_SHORT, 0);
    tris += m.count / 3;
    R.drawn++;
  }
  R.tris += tris;
}

function renderFrame(game) {
  var world = game.world, p = game.player;
  var dim = p.dim;
  var camX = p.camX, camY = p.camRenderY, camZ = p.camZ;
  var W = R.width, H = R.height;
  R.drawn = 0; R.tris = 0; R.frame++;

  var biome = world.getBiome(dim, Math.floor(camX), Math.floor(camZ));
  updateSky(game.timeOfDay, dim, game.weather.rain, biome);

  /* --- camera --- */
  var fov = R.settings.fov * (Math.PI / 180) * p.fovMul;
  var far = Math.max(160, R.settings.renderDistance * 16 + 64);
  M4.perspective(R.proj, fov, W / H, 0.05, far);
  R.zNear = 0.05; R.zFar = far;
  var dirX = Math.cos(p.pitch) * Math.sin(p.yaw);
  var dirY = Math.sin(p.pitch);
  var dirZ = -Math.cos(p.pitch) * Math.cos(p.yaw);
  var up = [0, 1, 0];
  M4.lookAt(R.view, [camX, camY, camZ], [camX + dirX, camY + dirY, camZ + dirZ], up);
  if (p.roll) { var rr = M4.create(); M4.rotZ(rr, M4.identity(rr), p.roll); M4.mul(R.view, rr, R.view); }
  M4.mul(R.vp, R.proj, R.view);
  M4.invert(R.invVP, R.vp);
  R.frustum.set(R.vp);
  gatherVisible(world, dim, camX, camY, camZ, R.frustum, far);

  var underwater = p.eyeInLiquid === 'water' ? 1 : 0;
  var uwCol = underwater ? col(biome.waterFog) : [0, 0, 0];
  var uwv = [uwCol[0] / 255 * 1.6, uwCol[1] / 255 * 1.6, uwCol[2] / 255 * 1.6];
  var fogEnd = far * (underwater ? 0.10 : 0.98);
  var fogStart = fogEnd * (underwater ? 0.02 : 0.72);
  if (game.weather.rain > 0.1) { fogEnd *= 1 - game.weather.rain * 0.35; fogStart *= 0.7; }
  if (dim === DIM_NETHER) { fogEnd = Math.min(fogEnd, 116); fogStart = 26; }
  else if (dim === DIM_END) { fogStart = fogEnd * 0.86; }

  /* ------------------------------- shadow pass ------------------------- */
  var shadowOn = R.settings.shadows && dim === DIM_OVERWORLD && R.sky.day > 0.05;
  if (shadowOn) {
    var range = Math.min(78, R.settings.renderDistance * 12);
    buildShadowMatrix(camX, camY, camZ, range);
    _shadowCull = (range * 1.9) * (range * 1.9);
    _shadowCam[0] = camX; _shadowCam[1] = camY; _shadowCam[2] = camZ;
    R.shadowFBO.bind();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    var sp = R.progShadow;
    gl.useProgram(sp.p);
    gl.uniformMatrix4fv(sp.u.uVP, false, R.shadowMat);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas);
    gl.uniform1i(sp.u.uAtlas, 0);
    gl.uniform1f(sp.u.uAlphaTest, 0);
    drawChunkPass(sp, PASS_OPAQUE, false);
    gl.uniform1f(sp.u.uAlphaTest, 1);
    drawChunkPass(sp, PASS_CUTOUT, false);
    gl.enable(gl.CULL_FACE);
    _shadowCull = 0;
  }

  /* --------------------------------- scene ----------------------------- */
  R.sceneFBO.bind();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.BLEND);

  /* sky */
  var sk = R.progSky;
  gl.useProgram(sk.p);
  gl.depthMask(false);
  gl.uniformMatrix4fv(sk.u.uInvVP, false, R.invVP);
  setSkyUniforms(sk, [camX, camY, camZ], dim, game.weather.rain, game.moonPhase, game.time);
  gl.uniform1f(sk.u.uCloudY, CLOUD_Y);
  gl.uniform1i(sk.u.uUnderwater, underwater);
  gl.uniform3fv(sk.u.uUnderwaterCol, uwv);
  fullscreenQuad();
  gl.depthMask(true);

  /* terrain */
  var cp = R.progChunk;
  gl.useProgram(cp.p);
  gl.uniformMatrix4fv(cp.u.uVP, false, R.vp);
  setSkyUniforms(cp, [camX, camY, camZ], dim, game.weather.rain, game.moonPhase, game.time);
  gl.uniform1f(cp.u.uFogStart, fogStart);
  gl.uniform1f(cp.u.uFogEnd, fogEnd);
  gl.uniform1i(cp.u.uUnderwater, underwater);
  gl.uniform3fv(cp.u.uUnderwaterCol, uwv);
  gl.uniform1f(cp.u.uWind, 0.25 + game.weather.rain * 0.7);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas);
  gl.uniform1i(cp.u.uAtlas, 0);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, shadowOn ? R.shadowFBO.depth : R.noShadow);
  gl.uniform1i(cp.u.uShadowMap, 2);
  gl.uniformMatrix4fv(cp.u.uShadowMat, false, R.shadowMat);
  gl.uniform1f(cp.u.uShadowTexel, 1 / R.shadowSize);
  gl.uniform1i(cp.u.uShadowOn, shadowOn ? 1 : 0);
  gl.uniform1f(cp.u.uAlphaTest, 0);
  drawChunkPass(cp, PASS_OPAQUE, false);
  gl.uniform1f(cp.u.uAlphaTest, 1);
  gl.disable(gl.CULL_FACE);
  drawChunkPass(cp, PASS_CUTOUT, false);
  gl.enable(gl.CULL_FACE);

  /* entities */
  drawEntities(game, fogStart, fogEnd, underwater, uwv, shadowOn);

  /* block break overlay + selection box */
  drawSelection(game);

  /* --- copy the opaque scene so water can refract it --- */
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, R.sceneFBO.fb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, R.sceneCopy.fb);
  gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.sceneFBO.fb);
  gl.viewport(0, 0, W, H);

  /* water / translucent */
  var wp = R.progWater;
  gl.useProgram(wp.p);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.disable(gl.CULL_FACE);
  gl.uniformMatrix4fv(wp.u.uVP, false, R.vp);
  setSkyUniforms(wp, [camX, camY, camZ], dim, game.weather.rain, game.moonPhase, game.time);
  gl.uniform1f(wp.u.uFogStart, fogStart);
  gl.uniform1f(wp.u.uFogEnd, fogEnd);
  gl.uniform2f(wp.u.uScreen, W, H);
  gl.uniform1i(wp.u.uUnderwater, underwater);
  gl.uniform3fv(wp.u.uUnderwaterCol, uwv);
  gl.uniform1f(wp.u.uNear, 0.05);
  gl.uniform1f(wp.u.uFar, far);
  gl.uniform1i(wp.u.uIsLava, 0);
  gl.uniform1f(wp.u.uWind, 0.3);
  var wt = col(biome.water);
  gl.uniform3f(wp.u.uWaterTint, wt[0] / 255, wt[1] / 255, wt[2] / 255);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas); gl.uniform1i(wp.u.uAtlas, 0);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, R.sceneCopy.color); gl.uniform1i(wp.u.uSceneColor, 3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, R.sceneCopy.depth); gl.uniform1i(wp.u.uSceneDepth, 4);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadowOn ? R.shadowFBO.depth : R.noShadow); gl.uniform1i(wp.u.uShadowMap, 2);
  gl.uniformMatrix4fv(wp.u.uShadowMat, false, R.shadowMat);
  gl.uniform1f(wp.u.uShadowTexel, 1 / R.shadowSize);
  gl.uniform1i(wp.u.uShadowOn, shadowOn ? 1 : 0);
  drawChunkPass(wp, PASS_TRANS, true);
  gl.enable(gl.CULL_FACE);

  /* particles + weather */
  drawParticles(game, fogStart, fogEnd);
  drawWeather(game);
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  /* first-person arms and held item, on a cleared depth range */
  gl.clear(gl.DEPTH_BUFFER_BIT);
  drawViewModel(game);

  /* ------------------------------- post ------------------------------- */
  postProcess(game, camX, camY, camZ, underwater, biome);
}

/* --------------------------------------------------------------- post -- */
function postProcess(game, camX, camY, camZ, underwater, biome) {
  var W = R.width, H = R.height;
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  /* bloom */
  if (R.settings.bloom) {
    R.bloomA.bind();
    var bp = R.progBright;
    gl.useProgram(bp.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.sceneFBO.color);
    gl.uniform1i(bp.u.uTex, 0);
    gl.uniform1f(bp.u.uThreshold, 1.02);
    fullscreenQuad();
    var blur = R.progBlur;
    gl.useProgram(blur.p);
    for (var i = 0; i < 2; i++) {
      R.bloomB.bind();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.bloomA.color);
      gl.uniform1i(blur.u.uTex, 0);
      gl.uniform2f(blur.u.uDir, 1 / R.bloomA.w, 0);
      fullscreenQuad();
      R.bloomA.bind();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.bloomB.color);
      gl.uniform2f(blur.u.uDir, 0, 1 / R.bloomA.h);
      fullscreenQuad();
    }
  }

  /* god rays, only while the sun is actually on screen */
  var godAmt = 0;
  if (R.settings.godRays && game.player.dim === DIM_OVERWORLD && R.sky.day > 0.1 && !underwater) {
    var sp = [0, 0, 0];
    var sx = camX + R.sunDir[0] * 100, sy2 = camY + R.sunDir[1] * 100, sz = camZ + R.sunDir[2] * 100;
    M4.transformPoint(sp, R.vp, sx, sy2, sz);
    var behind = (R.sunDir[0] * (sx - camX) + R.sunDir[1] * (sy2 - camY) + R.sunDir[2] * (sz - camZ)) < 0;
    var su = sp[0] * 0.5 + 0.5, sv = sp[1] * 0.5 + 0.5;
    if (!behind && sp[2] < 1 && su > -0.6 && su < 1.6 && sv > -0.6 && sv < 1.6) {
      var edge = Math.max(Math.abs(su - 0.5), Math.abs(sv - 0.5));
      godAmt = clamp(1.25 - edge * 1.5, 0, 1) * R.sky.day * (1 - game.weather.rain * 0.8) * 0.55;
      R.godFBO.bind();
      var gp = R.progGod;
      gl.useProgram(gp.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.sceneFBO.color); gl.uniform1i(gp.u.uTex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.sceneFBO.depth); gl.uniform1i(gp.u.uDepth, 1);
      gl.uniform2f(gp.u.uSunUV, su, sv);
      gl.uniform1f(gp.u.uStrength, 1.0);
      fullscreenQuad();
    }
  }

  /* composite + tonemap into the LDR buffer, then FXAA to screen */
  var target = (R.settings.fxaa || R.settings.motionBlur) ? R.ldrFBO : null;
  if (target) target.bind();
  else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); }
  var comp = R.progComposite;
  gl.useProgram(comp.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.sceneFBO.color); gl.uniform1i(comp.u.uScene, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.settings.bloom ? R.bloomA.color : R.white); gl.uniform1i(comp.u.uBloom, 1);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, godAmt > 0 ? R.godFBO.color : R.white); gl.uniform1i(comp.u.uGod, 2);
  gl.uniform1f(comp.u.uBloomAmt, R.settings.bloom ? 0.26 : 0);
  gl.uniform1f(comp.u.uGodAmt, godAmt);
  gl.uniform1f(comp.u.uExposure, game.exposure);
  gl.uniform1f(comp.u.uVignette, underwater ? 0.55 : 0.30);
  gl.uniform3fv(comp.u.uTintCol, game.screenTint);
  gl.uniform1f(comp.u.uTintAmt, game.screenTintAmt);
  gl.uniform1f(comp.u.uTime, game.time);
  /* Motion blur: how much of the previous frame to carry, driven by how fast
     the view is actually turning and moving. Static views stay perfectly sharp. */
  var pp = game.player;
  var mbTurn = Math.abs(angleDiff(pp.yaw, R.lastYaw === undefined ? pp.yaw : R.lastYaw)) +
    Math.abs(pp.pitch - (R.lastPitch === undefined ? pp.pitch : R.lastPitch));
  var mbMove = Math.hypot(pp.vx, pp.vz) * 0.012;
  R.lastYaw = pp.yaw; R.lastPitch = pp.pitch;
  /* A per-frame yaw delta is a few hundredths of a radian even when spinning
     hard, so the old gain blended two percent of the last frame — nothing.
     This is scaled so a fast turn actually smears. */
  var mb = R.settings.motionBlur ? Math.min(0.58, mbTurn * 12 + mbMove * 2.6) : 0;
  gl.uniform1f(comp.u.uBlurAmt, mb);
  var dofAmt = R.settings.dof ? (underwater ? 1.9 : 0.78) : 0;
  gl.uniform4f(comp.u.uDof, 0, dofAmt, R.zNear || 0.05, R.zFar || 256);
  gl.uniform2f(comp.u.uCTexel, 1 / W, 1 / H);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, R.sceneFBO.depth);
  gl.uniform1i(comp.u.uDofDepth, 4);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, R.prevFBO.color); gl.uniform1i(comp.u.uPrev, 3);
  fullscreenQuad();

  /* keep this frame for the next one to blend against */
  if (R.settings.motionBlur && target) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, R.ldrFBO.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, R.prevFBO.fb);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    var fx = R.progFXAA;
    gl.useProgram(fx.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.ldrFBO.color); gl.uniform1i(fx.u.uTex, 0);
    gl.uniform2f(fx.u.uTexel, 1 / W, 1 / H);
    fullscreenQuad();
  }
  gl.enable(gl.DEPTH_TEST);
}

/* ------------------------------------------------ selection highlight -- */
var _selVAO = null, _selBuf = null, _selProg = null;
function initSelection() {
  _selProg = makeProgram('sel', `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP; uniform vec3 uOrigin; uniform vec3 uSize;
void main(){ gl_Position = uVP*vec4(uOrigin + aPos*uSize,1.0); }`,
    `#version 300 es
precision mediump float;
uniform vec4 uColor;
layout(location=0) out vec4 o;
void main(){ o = uColor; }`);
  _selVAO = gl.createVertexArray();
  gl.bindVertexArray(_selVAO);
  _selBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _selBuf);
  var e = [];
  var c = [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1], [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]];
  var pairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (var i = 0; i < pairs.length; i++) { e.push.apply(e, c[pairs[i][0]]); e.push.apply(e, c[pairs[i][1]]); }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(e), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
}
function drawSelection(game) {
  var hit = game.hit;
  var p = game.player;
  if (!hit || UI.screen || p.dead || game.cameraMode !== 0 && false) return;
  if (!_selProg) initSelection();

  /* the outline follows the block's own shape, so a slab or a fence reads */
  var boxes = blockBoxesFor(hit.id, hit.st) || FULLBOX1;
  var bx0 = 1, by0 = 1, bz0 = 1, bx1 = 0, by1 = 0, bz1 = 0;
  for (var i = 0; i < boxes.length; i++) {
    var q = boxes[i];
    if (q[0] < bx0) bx0 = q[0]; if (q[1] < by0) by0 = q[1]; if (q[2] < bz0) bz0 = q[2];
    if (q[3] > bx1) bx1 = q[3]; if (q[4] > by1) by1 = q[4]; if (q[5] > bz1) bz1 = q[5];
  }

  gl.useProgram(_selProg.p);
  gl.uniformMatrix4fv(_selProg.u.uVP, false, R.vp);
  gl.uniform3f(_selProg.u.uOrigin, hit.x + bx0 - 0.006, hit.y + by0 - 0.006, hit.z + bz0 - 0.006);
  gl.uniform3f(_selProg.u.uSize, (bx1 - bx0) + 0.012, (by1 - by0) + 0.012, (bz1 - bz0) + 0.012);
  gl.uniform4f(_selProg.u.uColor, 0.02, 0.02, 0.03, 0.7);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.bindVertexArray(_selVAO);
  gl.drawArrays(gl.LINES, 0, 24);
  gl.depthMask(true);
  gl.disable(gl.BLEND);

  /* crack overlay while the block is being mined */
  if (p.breaking && p.breakTotal > 0 && p.breakProgress > 0 &&
    p.breaking.x === hit.x && p.breaking.y === hit.y && p.breaking.z === hit.z && CRACK_LAYERS.length) {
    var stage = clamp(Math.floor(p.breakProgress / p.breakTotal * 10), 0, 9);
    EBUF.n = 0;
    _ecol[0] = _ecol[1] = _ecol[2] = 1; _ecol[3] = 0;
    _elight[0] = 1; _elight[1] = 0;
    mIdent();
    mTranslate(hit.x, hit.y, hit.z);
    for (var k = 0; k < boxes.length; k++) {
      var b2 = boxes[k];
      emitBox(EBUF, b2[0] * 16, b2[1] * 16, b2[2] * 16,
        (b2[3] - b2[0]) * 16, (b2[4] - b2[1]) * 16, (b2[5] - b2[2]) * 16, CRACK_LAYERS[stage], 0.10, true);
    }
    if (EBUF.n) {
      gl.bindVertexArray(EBUF.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, EBUF.vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, EBUF.f, 0, EBUF.n);
      var ep = R.progCrack;
      gl.useProgram(ep.p);
      gl.uniformMatrix4fv(ep.u.uVP, false, R.vp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas); gl.uniform1i(ep.u.uAtlas, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, EBUF.n / EV_STRIDE);
      gl.enable(gl.CULL_FACE);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }
}
