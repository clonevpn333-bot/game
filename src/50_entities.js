/* =========================================================================
 * ENTITY RENDERING — cuboid part models with a transform stack, plus the
 * particle and weather batches.
 *
 * Every mob is a tree of boxes with a pivot; animation writes rotations onto
 * the parts each frame and the whole thing is flattened into one dynamic
 * vertex buffer.  Part skins are ordinary atlas tiles, so mobs use exactly
 * the same texture pipeline as blocks.
 * ========================================================================= */

var EBUF = { f: new Float32Array(60000 * 15), n: 0, vao: null, vbo: null, cap: 60000 };
var EV_STRIDE = 15;

function initEntityBuffers() {
  EBUF.vao = gl.createVertexArray();
  gl.bindVertexArray(EBUF.vao);
  EBUF.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, EBUF.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, EBUF.f.byteLength, gl.DYNAMIC_DRAW);
  var s = EV_STRIDE * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, s, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, s, 32);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, s, 36);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 2, gl.FLOAT, false, s, 52);
  gl.bindVertexArray(null);
  initParticleBuffers();
  initWeatherBuffers();
}

/* --------------------------------------------------- transform stack -- */
var _mstack = [], _msp = 0, _mcur = M4.create();
for (var _i = 0; _i < 32; _i++) _mstack.push(M4.create());
function mPush() { M4.copy(_mstack[_msp], _mcur); _msp++; }
function mPop() { _msp--; M4.copy(_mcur, _mstack[_msp]); }
function mIdent() { M4.identity(_mcur); }
function mTranslate(x, y, z) { M4.translate(_mcur, _mcur, x, y, z); }
function mRotX(r) { if (r) M4.rotX(_mcur, _mcur, r); }
function mRotY(r) { if (r) M4.rotY(_mcur, _mcur, r); }
function mRotZ(r) { if (r) M4.rotZ(_mcur, _mcur, r); }
function mScale(x, y, z) { M4.scale(_mcur, _mcur, x, y, z); }

var _ev = new Float32Array(3), _en = new Float32Array(3);
function xfPoint(o, x, y, z) {
  var m = _mcur;
  o[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  o[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  o[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return o;
}
function xfDir(o, x, y, z) {
  var m = _mcur;
  o[0] = m[0] * x + m[4] * y + m[8] * z;
  o[1] = m[1] * x + m[5] * y + m[9] * z;
  o[2] = m[2] * x + m[6] * y + m[10] * z;
  var l = Math.hypot(o[0], o[1], o[2]) || 1;
  o[0] /= l; o[1] /= l; o[2] /= l;
  return o;
}

/* Emit one cuboid (model units, 1/16 block) under the current transform. */
var _ecol = [1, 1, 1, 0], _elight = [1, 0];
/* When boxUV is set the face UVs follow the box's own extents inside the
   16-unit cell, exactly like the chunk mesher does — without it a torch or a
   slab would stretch the whole tile across a sliver of geometry. */
function emitBox(buf, x, y, z, w, h, d, layer, inflate, boxUV) {
  inflate = inflate || 0;
  var S = 1 / 16;
  var x0 = (x - inflate) * S, y0 = (y - inflate) * S, z0 = (z - inflate) * S;
  var x1 = (x + w + inflate) * S, y1 = (y + h + inflate) * S, z1 = (z + d + inflate) * S;
  var xs = [x0, x1], ys = [y0, y1], zs = [z0, z1];
  var tx = [x, x + w], ty = [y, y + h], tz = [z, z + d];
  var perFace = typeof layer !== 'number';
  for (var f = 0; f < 6; f++) {
    var vs = FACE_V[f], d3 = FACE_DIR[f];
    var lay = perFace ? layer[f] : layer;
    xfDir(_en, d3[0], d3[1], d3[2]);
    var base = buf.n;
    if ((base / EV_STRIDE) + 6 > EBUF.cap) return;
    for (var q = 0; q < 6; q++) {
      var vi = [0, 1, 2, 0, 2, 3][q];
      var s = vs[vi];
      xfPoint(_ev, xs[s[0]], ys[s[1]], zs[s[2]]);
      var uu, vv;
      if (boxUV) {
        var cxu = tx[s[0]], cyu = ty[s[1]], czu = tz[s[2]];
        switch (f) {
          case 0: uu = (16 - czu) / 16; vv = (16 - cyu) / 16; break;
          case 1: uu = czu / 16; vv = (16 - cyu) / 16; break;
          case 2: uu = cxu / 16; vv = czu / 16; break;
          case 3: uu = cxu / 16; vv = (16 - czu) / 16; break;
          case 4: uu = cxu / 16; vv = (16 - cyu) / 16; break;
          default: uu = (16 - cxu) / 16; vv = (16 - cyu) / 16;
        }
      } else {
        switch (f) {
          case 0: uu = 1 - s[2]; vv = 1 - s[1]; break;
          case 1: uu = s[2]; vv = 1 - s[1]; break;
          case 2: uu = s[0]; vv = s[2]; break;
          case 3: uu = s[0]; vv = 1 - s[2]; break;
          case 4: uu = s[0]; vv = 1 - s[1]; break;
          default: uu = 1 - s[0]; vv = 1 - s[1];
        }
      }
      var o = buf.n;
      var F = buf.f;
      F[o] = _ev[0]; F[o + 1] = _ev[1]; F[o + 2] = _ev[2];
      F[o + 3] = _en[0]; F[o + 4] = _en[1]; F[o + 5] = _en[2];
      F[o + 6] = uu; F[o + 7] = vv;
      F[o + 8] = lay;
      F[o + 9] = _ecol[0]; F[o + 10] = _ecol[1]; F[o + 11] = _ecol[2]; F[o + 12] = _ecol[3];
      F[o + 13] = _elight[0]; F[o + 14] = _elight[1];
      buf.n = o + EV_STRIDE;
    }
  }
}

/* -------------------------------------------------------- part tiles -- */
var _partTiles = {};
function partTile(color, variance) {
  var key = color + '|' + (variance || 0);
  var t = _partTiles[key];
  if (t !== undefined) return t;
  t = tileLayer(T.solid(color, variance === undefined ? 0.045 : variance, 3));
  _partTiles[key] = t;
  return t;
}
function customTile(name, params) {
  return tileLayer(T.custom(name, params));
}

/* =============================== MODEL DSL ============================== */
/* part: {n, piv:[x,y,z], box:[x,y,z,w,h,d], col, tex, inflate, kids:[] }   */
function P(n, piv, box, col, opts) {
  var p = { n: n, piv: piv, box: box, col: col, kids: null, inflate: 0, tex: null };
  if (opts) for (var k in opts) p[k] = opts[k];
  return p;
}
function renderParts(buf, parts, pose) {
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p.hidden) continue;
    var r = pose ? pose[p.n] : null;
    mPush();
    mTranslate(p.piv[0] / 16, p.piv[1] / 16, p.piv[2] / 16);
    if (r) {
      if (r.ty || r.tx || r.tz) mTranslate((r.tx || 0) / 16, (r.ty || 0) / 16, (r.tz || 0) / 16);
      mRotY(r.ry || 0); mRotX(r.rx || 0); mRotZ(r.rz || 0);
      if (r.s) mScale(r.s, r.s, r.s);
    }
    if (p.col !== null && p.col !== undefined) {
      var layer;
      if (p.tex) {
        /* A face belongs on the front of the head only — painting it on all
           six sides is why every mob looked like it had eyes on its back. */
        var faceL = customTile(p.tex, p.texParams);
        var plain = partTile(p.col, p.v);
        layer = p.texAll ? faceL : [plain, plain, plain, plain, plain, faceL];
      } else layer = partTile(p.col, p.v);
      emitBox(buf, p.box[0], p.box[1], p.box[2], p.box[3], p.box[4], p.box[5], layer, p.inflate);
    }
    if (p.kids) renderParts(buf, p.kids, pose);
    mPop();
  }
}

/* ------------------------------------------------- generic body plans -- */
/* All measurements are in the game's own 1/16-block model units, matched to
   the proportions of the real mobs so silhouettes read correctly. */
function bipedModel(o) {
  o = o || {};
  var skin = o.skin || '#8f6a4a', shirt = o.shirt || skin, pants = o.pants || shirt;
  var hh = o.headH || 8, hw = o.headW || 8;
  var bodyY = o.bodyY || 12, legH = o.legH || 12, armH = o.armH || 12;
  var armW = o.armW || 4;
  var parts = [
    P('head', [0, bodyY + 12, 0], [-hw / 2, 0, -hw / 2, hw, hh, hw], o.head || skin, { tex: o.headTex, texParams: o.headTexP }),
    P('body', [0, bodyY, 0], [-4, 0, -2, 8, 12, 4], shirt, { tex: o.bodyTex }),
    /* the arm hangs from the shoulder: a long-armed mob used to have its
       limbs sticking up past its own head */
    P('armL', [4, bodyY + 10, 0], [0, -(armH - 2), -2, armW, armH, 4], o.arm || shirt),
    P('armR', [-4, bodyY + 10, 0], [-armW, -(armH - 2), -2, armW, armH, 4], o.arm || shirt),
    P('legL', [2, legH, 0], [-2, -legH, -2, 4, legH, 4], pants),
    P('legR', [-2, legH, 0], [-2, -legH, -2, 4, legH, 4], pants)
  ];
  if (o.hat) parts[0].kids = [P('hat', [0, 0, 0], [-hw / 2, 0, -hw / 2, hw, hh, hw], o.hat, { inflate: 0.55 })];
  if (o.extra) parts = parts.concat(o.extra);
  return { parts: parts, eye: (bodyY + 12 + hh * 0.6) / 16, plan: 'biped' };
}
function quadModel(o) {
  o = o || {};
  var c = o.body || '#b0855a';
  var bodyY = o.bodyY || 12, legH = o.legH || 12, bl = o.bodyLen || 16, bw = o.bodyW || 8, bh = o.bodyH || 8;
  var hs = o.headSize || 8;
  var parts = [
    P('head', [0, bodyY + (o.headY || 4), -(bl / 2) - (o.headZ || 0)],
      [-hs / 2, -hs / 2, -hs, hs, hs, hs], o.head || c, { tex: o.headTex, texParams: o.headTexP }),
    P('body', [0, bodyY, 0], [-bw / 2, 0, -bl / 2, bw, bh, bl], c, { tex: o.bodyTex }),
    P('legFL', [bw / 2 - 2, legH, -bl / 2 + 3], [-2, -legH, -2, 4, legH, 4], o.leg || c),
    P('legFR', [-bw / 2 + 2, legH, -bl / 2 + 3], [-2, -legH, -2, 4, legH, 4], o.leg || c),
    P('legBL', [bw / 2 - 2, legH, bl / 2 - 3], [-2, -legH, -2, 4, legH, 4], o.leg || c),
    P('legBR', [-bw / 2 + 2, legH, bl / 2 - 3], [-2, -legH, -2, 4, legH, 4], o.leg || c)
  ];
  if (o.extra) parts = parts.concat(o.extra);
  return { parts: parts, eye: (bodyY + (o.headY || 4) + hs * 0.3) / 16, plan: 'quad' };
}

/* --------------------------------------------------------- animation -- */
function poseWalk(pose, e, swing, amp, armAmp) {
  var s = Math.sin(swing) * amp;
  var c = Math.sin(swing + Math.PI) * amp;
  pose.legL = { rx: s };
  pose.legR = { rx: c };
  pose.armL = { rx: c * (armAmp === undefined ? 1 : armAmp), rz: Math.cos(swing * 0.5) * 0.05 };
  pose.armR = { rx: s * (armAmp === undefined ? 1 : armAmp), rz: -Math.cos(swing * 0.5) * 0.05 };
}
function poseQuadWalk(pose, swing, amp) {
  var s = Math.sin(swing) * amp, c = Math.sin(swing + Math.PI) * amp;
  pose.legFL = { rx: s }; pose.legFR = { rx: c };
  pose.legBL = { rx: c }; pose.legBR = { rx: s };
}

/* ================================ DRAW ================================= */
var _pose = {};
/* The player's own body. Looking down should show a torso and two legs, not
   an empty void, so the same character model everyone else is drawn with is
   drawn for you too — minus the head and arms in first person, because the
   head is inside the camera and the arms are already the view model. */
function selfBodyEntity(game) {
  var p = game.player;
  if (p.spectator || !R.settings.selfBody) return null;
  var skin = (typeof NET !== 'undefined' ? (NET.skin || 0) : 0) % PLAYER_SKINS.length;
  var want = 'player' + skin;
  var self = game.selfEnt;
  if (!self || self.type !== want) {
    self = game.selfEnt = makeEntity(want, p.dim, p.x, p.y, p.z, { persist: true });
    self.bodyYaw = p.yaw;
  }
  /* The eye sits only a tenth of a block above the chest, so a body drawn
     exactly on the player fills the screen the moment you glance down. In
     first person it is dropped a little under the real hitbox, which puts the
     chest, legs and feet in proportion when you look at them. Nobody else
     sees this copy, so the cheat costs nothing. */
  self.dim = p.dim; self.x = p.x; self.z = p.z;
  self.y = p.y - (game.cameraMode === 0 ? 0.42 : 0);
  self.pitch = p.pitch; self.headPitch = p.pitch;
  self.dead = false; self.hurtTime = 0;
  /* the legs point where you are going; the head leads and the body follows,
     and the twist between them is capped the way the real one is */
  var spd = Math.hypot(p.vx, p.vz);
  if (spd > 0.5) self.bodyYaw = Math.atan2(p.vx, -p.vz);
  var twist = angleDiff(p.yaw, self.bodyYaw);
  if (Math.abs(twist) > 0.85) self.bodyYaw = p.yaw - (twist > 0 ? 0.85 : -0.85);
  self.yaw += angleDiff(self.bodyYaw, self.yaw) * 0.30;
  self.headYaw = angleDiff(p.yaw, self.yaw);
  self.walkAmt = approach(self.walkAmt, Math.min(1, spd / 4.3), 0.25);
  self.walkPhase = p.bobPhase;
  self.sneaking = p.sneaking; self.onGround = p.onGround;
  if (game.sleeping) { self.walkAmt = 0; }
  return self;
}

function drawEntities(game, fogStart, fogEnd, underwater, uwv, shadowOn) {
  var world = game.world, p = game.player, dim = p.dim;
  var list = game.entities;
  EBUF.n = 0;
  var camX = p.camX, camY = p.camRenderY, camZ = p.camZ;
  var maxD = Math.min(R.settings.renderDistance * 16, 120);
  var maxD2 = maxD * maxD;
  var drew = 0;
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e.dim !== dim || e.dead) continue;
    var dx = e.x - camX, dy = e.y - camY, dz = e.z - camZ;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > maxD2) continue;
    if (!R.frustum.boxIn(e.x - 2, e.y - 1, e.z - 2, e.x + 2, e.y + e.h + 2, e.z + 2)) continue;
    buildEntityMesh(game, e);
    drew++;
  }
  var self = selfBodyEntity(game);
  if (self) {
    var sp = MOBS[self.type].model.parts;
    var first = game.cameraMode === 0;
    if (first) { sp[0].hidden = true; sp[2].hidden = true; sp[3].hidden = true; }
    buildEntityMesh(game, self);
    if (first) { sp[0].hidden = false; sp[2].hidden = false; sp[3].hidden = false; }
    drew++;
  }
  if (EBUF.n === 0) return;
  gl.bindVertexArray(EBUF.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, EBUF.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, EBUF.f, 0, EBUF.n);
  var ep = R.progEntity;
  gl.useProgram(ep.p);
  gl.uniformMatrix4fv(ep.u.uVP, false, R.vp);
  setSkyUniforms(ep, [camX, camY, camZ], dim, game.weather.rain, game.moonPhase, game.time);
  gl.uniform1f(ep.u.uFogStart, fogStart);
  gl.uniform1f(ep.u.uFogEnd, fogEnd);
  gl.uniform1i(ep.u.uUnderwater, underwater);
  gl.uniform3fv(ep.u.uUnderwaterCol, uwv);
  gl.uniform4f(ep.u.uOverlayCol, 1.0, 0.25, 0.25, 1.0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas); gl.uniform1i(ep.u.uAtlas, 0);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shadowOn ? R.shadowFBO.depth : R.noShadow); gl.uniform1i(ep.u.uShadowMap, 2);
  gl.uniformMatrix4fv(ep.u.uShadowMat, false, R.shadowMat);
  gl.uniform1f(ep.u.uShadowTexel, 1 / R.shadowSize);
  gl.uniform1i(ep.u.uShadowOn, shadowOn ? 1 : 0);
  gl.disable(gl.CULL_FACE);
  gl.drawArrays(gl.TRIANGLES, 0, EBUF.n / EV_STRIDE);
  gl.enable(gl.CULL_FACE);
}

function buildEntityMesh(game, e) {
  var def = MOBS[e.type];
  if (!def) return;
  if (def.isItem) { buildDroppedItem(game, e); return; }
  if (def.isXP) { buildXpOrb(game, e); return; }
  var model = def.model;
  var lightByte = game.world.getLight(e.dim, Math.floor(e.x), Math.floor(e.y + e.h * 0.5), Math.floor(e.z));
  _elight[0] = ((lightByte >> 4) & 15) / 15;
  _elight[1] = (lightByte & 15) / 15;
  _ecol[0] = e.tint ? e.tint[0] : 1;
  _ecol[1] = e.tint ? e.tint[1] : 1;
  _ecol[2] = e.tint ? e.tint[2] : 1;
  _ecol[3] = e.hurtTime > 0 ? clamp(e.hurtTime / 0.35, 0, 1) * 0.65 : 0;

  for (var k in _pose) delete _pose[k];
  var scale = (e.baby ? (def.babyScale || 0.55) : 1) * (def.scale || 1) * (e.sizeMul || 1);
  if (def.anim) def.anim(e, _pose, game.time, game);

  mIdent();
  mTranslate(e.x, e.y, e.z);
  mRotY(-e.yaw);
  if (e.deathTime > 0) mRotZ(Math.min(1, e.deathTime / 0.9) * Math.PI * 0.5);
  mScale(scale, scale, scale);
  if (e.baby && def.babyHeadScale) {
    /* baby mobs get an oversized head, as they should */
    _pose.head = _pose.head || {};
    _pose.head.s = def.babyHeadScale;
  }
  renderParts(EBUF, model.parts, _pose);
}

/* A dropped item: block items tumble as little cubes, everything else as the
   flat extruded sprite, both spinning and bobbing the way they should. */
function buildDroppedItem(game, e) {
  if (!e.item) return;
  var it = ITEMS[e.item];
  var lightByte = game.world.getLight(e.dim, Math.floor(e.x), Math.floor(e.y + 0.2), Math.floor(e.z));
  _elight[0] = ((lightByte >> 4) & 15) / 15;
  _elight[1] = (lightByte & 15) / 15;
  _ecol[0] = _ecol[1] = _ecol[2] = 1; _ecol[3] = 0;

  var bob = Math.sin(game.time * 2.2 + e.seed) * 0.06;
  var spin = game.time * 1.1 + e.seed;

  /* a stack of more than one shows as a small pile */
  var copies = e.count > 32 ? 3 : (e.count > 8 ? 2 : 1);
  for (var c = 0; c < copies; c++) {
    mIdent();
    mTranslate(e.x + (c ? (c === 1 ? 0.07 : -0.06) : 0), e.y + 0.22 + bob + c * 0.045,
      e.z + (c ? (c === 1 ? -0.05 : 0.06) : 0));
    mRotY(spin + c * 0.7);
    if (it && it.block && BID[it.block] !== undefined) {
      var id = BID[it.block];
      var b = BLOCKS[id];
      var boxes = modelFor(id, 0);
      mScale(0.30, 0.30, 0.30);
      if (!boxes || b.render === 'cross' || b.render === 'flat' || b.render === 'crop') {
        drawExtrudedSprite(b.layers ? b.layers[4] : 0, 1.0);
      } else {
        mTranslate(-0.5, -0.5, -0.5);
        var lay = [0, 0, 0, 0, 0, 0];
        for (var k = 0; k < boxes.length; k++) {
          var q = boxes[k];
          for (var f = 0; f < 6; f++) lay[f] = faceLayer(q, b, f);
          emitBox(buf0(), q.x0, q.y0, q.z0, q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0, lay.slice(), 0, true);
        }
      }
    } else {
      var layer = ITEM_LAYER[e.item];
      if (layer === undefined) continue;
      mScale(0.42, 0.42, 0.42);
      drawExtrudedSprite(layer, 1.0);
    }
  }
}
function buf0() { return EBUF; }

/* XP orbs: a small glowing lozenge that pulses. */
function buildXpOrb(game, e) {
  _elight[0] = 1; _elight[1] = 1;
  _ecol[0] = 0.72; _ecol[1] = 1.0; _ecol[2] = 0.42; _ecol[3] = 0;
  var pulse = 1 + Math.sin(game.time * 5 + e.seed) * 0.16;
  var sz = (e.count > 16 ? 1.5 : (e.count > 6 ? 1.2 : 0.95)) * pulse;
  mIdent();
  mTranslate(e.x, e.y + 0.18 + Math.sin(game.time * 3 + e.seed) * 0.04, e.z);
  mRotY(game.time * 2.4 + e.seed);
  emitBox(EBUF, -sz, -sz, -sz, sz * 2, sz * 2, sz * 2, partTile('#b8f048', 0.02), 0);
  _ecol[0] = _ecol[1] = _ecol[2] = 1;
}

/* ============================= PARTICLES ================================ */
var PV = 13;                     /* floats per particle vertex */
var PART = { f: new Float32Array(4000 * 6 * PV), n: 0, vao: null, vbo: null, max: 4000 };
function initParticleBuffers() {
  PART.vao = gl.createVertexArray();
  gl.bindVertexArray(PART.vao);
  PART.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, PART.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, PART.f.byteLength, gl.DYNAMIC_DRAW);
  var s = PV * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);   // aPos
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, s, 12);  // aCorner
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, s, 20);  // aColor
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, s, 36);  // aSizeLayer
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 2, gl.FLOAT, false, s, 44);  // aLight
  gl.bindVertexArray(null);
}
var CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
function drawParticles(game, fogStart, fogEnd) {
  var ps = game.particles;
  if (!ps.length) return;
  var p = game.player;
  PART.n = 0;
  var F = PART.f, count = 0;
  for (var i = 0; i < ps.length && count < PART.max; i++) {
    var q = ps[i];
    if (q.dim !== p.dim) continue;
    var lb = game.world.getLight(q.dim, Math.floor(q.x), Math.floor(q.y), Math.floor(q.z));
    var sky = ((lb >> 4) & 15) / 15, blk = (lb & 15) / 15;
    var lay = q.layer === undefined ? 0 : q.layer;
    for (var c = 0; c < 6; c++) {
      var o = PART.n;
      F[o] = q.x; F[o + 1] = q.y; F[o + 2] = q.z;
      F[o + 3] = CORNERS[c][0]; F[o + 4] = CORNERS[c][1];
      F[o + 5] = q.r; F[o + 6] = q.g; F[o + 7] = q.b; F[o + 8] = q.a;
      F[o + 9] = q.size; F[o + 10] = lay;
      F[o + 11] = sky; F[o + 12] = blk;
      PART.n = o + PV;
    }
    count++;
  }
  if (!PART.n) return;
  gl.bindVertexArray(PART.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, PART.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, PART.f, 0, PART.n);
  var pp = R.progPart;
  gl.useProgram(pp.p);
  gl.uniformMatrix4fv(pp.u.uVP, false, R.vp);
  gl.uniform3f(pp.u.uRight, R.view[0], R.view[4], R.view[8]);
  gl.uniform3f(pp.u.uUp, R.view[1], R.view[5], R.view[9]);
  setSkyUniforms(pp, [p.camX, p.camY, p.camZ], p.dim, game.weather.rain, game.moonPhase, game.time);
  gl.uniform1f(pp.u.uFogStart, fogStart);
  gl.uniform1f(pp.u.uFogEnd, fogEnd);
  gl.uniform1i(pp.u.uTextured, 1);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas); gl.uniform1i(pp.u.uAtlas, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.drawArrays(gl.TRIANGLES, 0, PART.n / PV);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
}

/* ============================== WEATHER ================================= */
var WEA = { f: new Float32Array(3200 * 6 * 7), n: 0, vao: null, vbo: null };
function initWeatherBuffers() {
  WEA.vao = gl.createVertexArray();
  gl.bindVertexArray(WEA.vao);
  WEA.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, WEA.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, WEA.f.byteLength, gl.DYNAMIC_DRAW);
  var s = 7 * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, s, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, s, 20);
  gl.bindVertexArray(null);
}
function drawWeather(game) {
  var w = game.weather;
  if (w.rain < 0.02 || game.player.dim !== DIM_OVERWORLD) return;
  var p = game.player;
  var biome = game.world.getBiome(p.dim, Math.floor(p.x), Math.floor(p.z));
  var snowy = biome.snow;
  var n = Math.floor(w.rain * (snowy ? 1100 : 2800));
  WEA.n = 0;
  var F = WEA.f;
  var t = game.time;
  var R2 = 22;
  for (var i = 0; i < n; i++) {
    var h = hash3(i * 31, 7, 11, 5) / 4294967296;
    var h2 = hash3(i * 17, 13, 3, 9) / 4294967296;
    var ang = h * Math.PI * 2, rad = Math.sqrt(h2) * R2;
    var px = Math.floor(p.x) + Math.cos(ang) * rad;
    var pz = Math.floor(p.z) + Math.sin(ang) * rad;
    var fall = snowy ? 2.4 : 22.0;
    var seed = (h + h2) * 40;
    var py = p.y + 14 - mod(t * fall + seed * 20, 26);
    if (snowy) { px += Math.sin(t * 0.7 + seed) * 0.9; pz += Math.cos(t * 0.55 + seed) * 0.9; }
    var top = game.world.getHeight(p.dim, Math.floor(px), Math.floor(pz));
    if (py < top) continue;
    for (var c = 0; c < 6; c++) {
      var o = WEA.n;
      F[o] = px; F[o + 1] = py; F[o + 2] = pz;
      F[o + 3] = CORNERS[c][0]; F[o + 4] = CORNERS[c][1];
      F[o + 5] = snowy ? 0.5 : 0.9; F[o + 6] = snowy ? 1 : 0;
      WEA.n = o + 7;
    }
  }
  if (!WEA.n) return;
  gl.bindVertexArray(WEA.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, WEA.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, WEA.f, 0, WEA.n);
  var wp = R.progWeather;
  gl.useProgram(wp.p);
  gl.uniformMatrix4fv(wp.u.uVP, false, R.vp);
  gl.uniform3f(wp.u.uRight, R.view[0], R.view[4], R.view[8]);
  gl.uniform1f(wp.u.uTime, game.time);
  gl.uniform1f(wp.u.uAlpha, (snowy ? 0.55 : 0.30) * w.rain);
  gl.uniform3f(wp.u.uColor, snowy ? 0.95 : 0.62, snowy ? 0.97 : 0.70, snowy ? 1.0 : 0.86);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  gl.drawArrays(gl.TRIANGLES, 0, WEA.n / 7);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
}
