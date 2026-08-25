/* =========================================================================
 * VIEWMODEL — first-person arms and held item.
 *
 * The animation is built the way the "Punchy!" mod does it: nothing snaps.
 * Every value the hand cares about (camera yaw/pitch delta, walk speed,
 * vertical velocity, swing progress) drives a critically-damped spring, and
 * the springs are allowed to overshoot slightly so the item keeps swinging a
 * beat after the camera stops.  Swings have anticipation, a fast strike and
 * a long settle rather than a symmetric sine.
 * ========================================================================= */

var VM = {
  swayX: 0, swayY: 0, swayVX: 0, swayVY: 0,      /* look-sway spring */
  rollZ: 0, rollVZ: 0,                            /* strafe roll */
  bobX: 0, bobY: 0, bobRot: 0,                    /* walk bob */
  dropY: 0, dropVY: 0,                            /* landing / jump drop */
  swing: 0, swingActive: false, swingKind: 0,
  useProg: 0,
  equipT: 1, lastItem: null, equipDrop: 0,
  lastYaw: 0, lastPitch: 0, lastVY: 0,
  sprintT: 0, sneakT: 0, blockT: 0,
  itemLayerCache: {}
};

/* critically damped spring with a little slack so it overshoots */
function springStep(pos, vel, target, stiff, damp, dt) {
  var a = (target - pos) * stiff - vel * damp;
  vel += a * dt;
  pos += vel * dt;
  return [pos, vel];
}

function updateViewModel(game, dt) {
  var p = game.player;
  dt = Math.min(dt, 1 / 30);

  /* ---- look sway: the hand lags behind the camera and overshoots back ---- */
  var dYaw = angleDiff(p.yaw, VM.lastYaw);
  var dPitch = p.pitch - VM.lastPitch;
  VM.lastYaw = p.yaw; VM.lastPitch = p.pitch;
  var tSwayX = clamp(-dYaw / Math.max(dt, 1e-4) * 0.028, -1.5, 1.5);
  var tSwayY = clamp(-dPitch / Math.max(dt, 1e-4) * 0.024, -1.2, 1.2);
  var s1 = springStep(VM.swayX, VM.swayVX, tSwayX, 150, 15, dt);
  VM.swayX = s1[0]; VM.swayVX = s1[1];
  var s2 = springStep(VM.swayY, VM.swayVY, tSwayY, 150, 15, dt);
  VM.swayY = s2[0]; VM.swayVY = s2[1];

  /* ---- strafe roll ---- */
  var sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  var lateral = p.vx * cosY + p.vz * sinY;
  var s3 = springStep(VM.rollZ, VM.rollVZ, clamp(-lateral * 0.045, -0.30, 0.30), 90, 13, dt);
  VM.rollZ = s3[0]; VM.rollVZ = s3[1];

  /* ---- vertical impulse: the arm sinks on landing, floats on a jump ---- */
  var dvy = p.vy - VM.lastVY;
  VM.lastVY = p.vy;
  if (Math.abs(dvy) > 1.5) VM.dropVY += clamp(-dvy * 0.020, -0.55, 0.55);
  var s4 = springStep(VM.dropY, VM.dropVY, p.onGround ? 0 : clamp(p.vy * 0.010, -0.14, 0.14), 110, 12, dt);
  VM.dropY = s4[0]; VM.dropVY = s4[1];

  /* ---- walk bob (figure-eight, weighted toward the down-beat) ---- */
  var amt = p.bobAmt * (p.sprinting ? 1.35 : 1) * (p.onGround ? 1 : 0.25);
  var ph = p.bobPhase;
  VM.bobX = Math.sin(ph) * 0.044 * amt;
  VM.bobY = (Math.cos(ph * 2) * 0.5 - 0.15) * 0.040 * amt;
  VM.bobRot = Math.sin(ph + 0.6) * 0.048 * amt;

  VM.sprintT = approach(VM.sprintT, p.sprinting && p.onGround ? 1 : 0, dt * 6);
  VM.sneakT = approach(VM.sneakT, p.sneaking ? 1 : 0, dt * 9);
  VM.blockT = approach(VM.blockT, game.input.use && heldItem(p) === 'shield' ? 1 : 0, dt * 10);

  /* ---- swing: anticipation → strike → settle ---- */
  if (VM.swingActive) {
    VM.swing += dt / (VM.swingKind === 1 ? 0.32 : 0.30);
    if (VM.swing >= 1) { VM.swing = 0; VM.swingActive = false; }
  }

  /* ---- equip animation when the held item changes ---- */
  var cur = heldItem(p);
  if (cur !== VM.lastItem) { VM.lastItem = cur; VM.equipT = 0; }
  VM.equipT = Math.min(1, VM.equipT + dt * 5.2);

  /* ---- item use progress (eating, drawing a bow) ---- */
  var target = 0;
  if (p.eating) target = 1;
  else if (p.charging) target = 1;
  VM.useProg = approach(VM.useProg, target, dt * 7);
  if (p.charging) p.chargeTime = (p.chargeTime || 0) + dt;
}
function startSwing(kind) {
  VM.swing = 0; VM.swingActive = true; VM.swingKind = kind || 0;
}

/* The swing the real game uses: the hand drops and sweeps across on a
   sqrt-eased arc, which is why it reads as a heavy blow rather than a twitch.
   Applied as a transform on the hand frame, so the arm and whatever it is
   holding move together. */
var DEG = Math.PI / 180;
function applySwingTransform(sp, side) {
  var fSq = Math.sin(sp * sp * Math.PI);
  var fRt = Math.sin(Math.sqrt(sp) * Math.PI);
  /* The real game's swing sweeps the hand toward the middle of the screen.
     At this field of view that puts the forearm right over the crosshair, so
     the lateral part is damped hard — the arc still reads, the view stays. */
  mTranslate(side * -0.40 * fRt * 0.38, 0.20 * Math.sin(Math.sqrt(sp) * Math.PI * 2) * 0.55,
    -0.20 * Math.sin(sp * Math.PI));
  mRotY(side * (45 + fSq * -20) * DEG);
  mRotZ(side * fRt * -20 * DEG);
  mRotX(fRt * -80 * DEG);
  mRotY(side * -45 * DEG);
}


/* --------------------------------------------------- solid item models --
   Tools held in the hand are built from real boxes rather than an extruded
   sprite, so a sword has an edge and a bucket has a rim. Units are the usual
   sixteenths of a block. Each entry is [x, y, z, w, h, d, colour]. */
var ITEM_MODELS = {
  sword: function (c) { return [
    [-0.6, -7, -0.6, 1.2, 5, 1.2, '#5b3f20'],
    [-0.9, -7.6, -0.9, 1.8, 0.9, 1.8, '#3f2a14'],
    [-2.6, -2.2, -0.7, 5.2, 1.2, 1.4, '#6a4a26'],
    [-0.75, -1, -0.5, 1.5, 9, 1.0, c],
    [-0.4, 8, -0.35, 0.8, 1.6, 0.7, c]
  ]; },
  pickaxe: function (c) { return [
    [-0.6, -8, -0.6, 1.2, 12, 1.2, '#6b4d28'],
    [-5.5, 4.2, -0.7, 11, 1.6, 1.4, c],
    [-6.4, 3.0, -0.6, 1.4, 1.6, 1.2, c],
    [5.0, 3.0, -0.6, 1.4, 1.6, 1.2, c],
    [-1.1, 3.4, -0.9, 2.2, 1.6, 1.8, '#4a3520']
  ]; },
  axe: function (c) { return [
    [-0.6, -8, -0.6, 1.2, 12, 1.2, '#6b4d28'],
    [0.4, 1.4, -0.7, 2.0, 5.6, 1.4, c],
    [2.2, 0.6, -0.8, 2.2, 7.2, 1.6, c],
    [4.2, 1.6, -0.6, 1.0, 5.2, 1.2, c],
    [-1.0, 3.0, -0.9, 1.8, 1.4, 1.8, '#4a3520']
  ]; },
  shovel: function (c) { return [
    [-0.6, -8, -0.6, 1.2, 12, 1.2, '#6b4d28'],
    [-1.9, 3.4, -0.6, 3.8, 4.4, 1.2, c],
    [-1.4, 2.6, -0.6, 2.8, 1.0, 1.2, c],
    [-1.0, 2.2, -0.9, 2.0, 1.2, 1.8, '#4a3520']
  ]; },
  hoe: function (c) { return [
    [-0.6, -8, -0.6, 1.2, 12, 1.2, '#6b4d28'],
    [-4.6, 4.0, -0.6, 5.4, 1.4, 1.2, c],
    [-4.6, 2.4, -0.6, 1.3, 1.8, 1.2, c],
    [-1.0, 3.2, -0.9, 1.8, 1.4, 1.8, '#4a3520']
  ]; },
  bucket: function (c) { return [
    [-2.6, -4, -2.6, 5.2, 0.9, 5.2, '#9a9a9a'],
    [-3.0, -3.2, -3.0, 0.9, 7.0, 6.0, '#c6c6c6'],
    [2.1, -3.2, -3.0, 0.9, 7.0, 6.0, '#a4a4a4'],
    [-3.0, -3.2, -3.0, 6.0, 7.0, 0.9, '#b8b8b8'],
    [-3.0, -3.2, 2.1, 6.0, 7.0, 0.9, '#9a9a9a'],
    [-2.2, 3.0, -2.2, 4.4, 0.6, 4.4, c],
    [-3.2, 3.6, -3.2, 6.4, 0.9, 6.4, '#d4d4d4'],
    [-2.1, 4.4, -0.5, 4.2, 0.7, 1.0, '#8f8f8f']
  ]; },
  rod: function (c) { return [
    [-0.5, -7, -0.5, 1.0, 13, 1.0, '#6b4d28'],
    [-0.35, 6, -0.35, 0.7, 3.5, 0.7, '#8b6a3d'],
    [-0.2, 2, -3.6, 0.4, 0.4, 3.6, '#e8e8e8']
  ]; },
  ingot: function (c) { return [
    [-3.4, -1.1, -2.0, 6.8, 2.2, 4.0, c],
    [-2.6, 1.0, -1.4, 5.2, 0.6, 2.8, c]
  ]; },
  gem: function (c) { return [
    [-1.8, -2.2, -1.4, 3.6, 2.2, 2.8, c],
    [-2.4, 0, -1.8, 4.8, 2.0, 3.6, c],
    [-1.6, 2.0, -1.2, 3.2, 1.8, 2.4, c]
  ]; }
};
var ITEM_MODEL_FOR = {
  sword: 'sword', pickaxe: 'pickaxe', axe: 'axe', shovel: 'shovel', hoe: 'hoe',
  bucket: 'bucket', rod: 'rod', ingot: 'ingot', gem: 'gem'
};
/* Where along the model the fingers close, in the same sixteenths — a sword is
   held near the pommel, an ingot in the middle of the palm. */
var ITEM_GRIP = { sword: 4.6, pickaxe: 5.2, axe: 5.2, shovel: 5.2, hoe: 5.2, rod: 4.0,
  bucket: 0, ingot: 0, gem: 0 };
function drawSolidItem(game, kind, colour) {
  var build = ITEM_MODELS[kind];
  if (!build) return false;
  var boxes = build(colour || '#c0c0c0');
  var gy = ITEM_GRIP[kind] || 0;
  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];
    emitBox(EBUF, b[0], b[1] + gy, b[2], b[3], b[4], b[5], partTile(b[6], 0.035), 0);
  }
  return true;
}

/* ---------------------------------------------------------------- draw -- */
var _vmProj = M4.create(), _vmView = M4.create(), _vmVP = M4.create();

function drawViewModel(game) {
  var p = game.player;
  if (p.spectator || game.cameraMode !== 0) return;
  if (!R.settings.viewModel) return;

  EBUF.n = 0;

  var aspect = R.width / R.height;
  M4.perspective(_vmProj, 70 * Math.PI / 180, aspect, 0.02, 12);
  M4.identity(_vmView);
  M4.mul(_vmVP, _vmProj, _vmView);

  /* light the hand with the block light where the player stands, so a torch
     in a dark cave actually lights the arm holding it */
  var lb = game.world.getLight(p.dim, Math.floor(p.x), Math.floor(p.camY), Math.floor(p.z));
  _elight[0] = p.dim === DIM_OVERWORLD ? ((lb >> 4) & 15) / 15 : 0.85;
  _elight[1] = Math.max(((lb) & 15) / 15, heldEmissive(p) ? 0.85 : 0);
  _ecol[0] = _ecol[1] = _ecol[2] = 1; _ecol[3] = 0;

  var stack = heldStack(p);
  var itemName = stack ? stack.item : null;
  var it = itemName ? ITEMS[itemName] : null;

  var t = VM.swingActive ? VM.swing : 0;
  var lift = 0;
  var eq = 1 - VM.equipT;
  var eqDrop = eq * eq * 0.55;

  /* ---------------------------- right hand ----------------------------
     The origin of this frame is the hand.  Everything downstream (the arm
     going back to the shoulder, the item held in the fingers) hangs off it,
     so the swing arc moves hand and item together the way a real arm does. */
  mIdent();
  mTranslate(
    0.40 + VM.swayX * 0.075 + VM.bobX - VM.sprintT * 0.02,
    -0.34 + VM.swayY * 0.070 + VM.bobY + VM.dropY - eqDrop - VM.sneakT * 0.075 - VM.useProg * 0.05,
    -0.66 + VM.sprintT * 0.07 + lift * 0.28
  );
  mRotZ(VM.rollZ + VM.bobRot * 0.5 + eq * 0.5);
  mRotY(-VM.swayX * 0.18 - VM.sprintT * 0.22);
  mRotX(VM.swayY * 0.16 + VM.bobRot * 0.4 + VM.sprintT * 0.34);
  if (VM.swingActive) applySwingTransform(t, 1);

  if (p.eating) {
    var bite = Math.sin(game.time * 22) * 0.06 * VM.useProg;
    mTranslate(-0.10 * VM.useProg, 0.13 * VM.useProg + bite, 0.16 * VM.useProg);
    mRotX(VM.useProg * 0.7);
    mRotZ(-VM.useProg * 0.5);
  }
  if (p.charging) {
    var c = Math.min(1, (p.chargeTime || 0) / 1.0);
    mTranslate(-0.16 * VM.useProg, 0.06 * VM.useProg, 0.10 * VM.useProg + c * 0.03);
    mRotY(VM.useProg * 0.5);
    mRotX(-VM.useProg * 0.25);
  }

  mPush();
  if (it && it.block && BID[it.block] !== undefined) drawHeldBlock(game, BID[it.block], stack);
  else if (itemName) drawHeldItem(game, itemName, it);
  mPop();

  drawArm(game, 1, !!itemName);

  /* ---------------------------- left hand ----------------------------- */
  var off = p.offhand;
  mIdent();
  var blockT = VM.blockT;
  mTranslate(
    -0.50 - VM.swayX * 0.075 - VM.bobX + blockT * 0.16,
    -0.36 + VM.swayY * 0.070 - VM.bobY * 0.8 + VM.dropY - VM.sneakT * 0.075 - blockT * 0.06,
    -0.66 + VM.sprintT * 0.07 + blockT * 0.12
  );
  mRotZ(VM.rollZ * 0.7 - VM.bobRot * 0.5);
  mRotY(-VM.swayX * 0.18 + VM.sprintT * 0.22 - blockT * 0.5);
  mRotX(VM.swayY * 0.16 - VM.bobRot * 0.4 + VM.sprintT * 0.34);
  if (off || blockT > 0.01) {
    mPush();
    var oit = off ? ITEMS[off.item] : null;
    if (oit && oit.block && BID[oit.block] !== undefined) drawHeldBlock(game, BID[oit.block], off);
    else if (off) drawHeldItem(game, off.item, oit);
    mPop();
    drawArm(game, -1, !!off);
  }
  /* The off hand only appears when it is holding something — running with two
     bare arms in shot looked like a swimming animation. */

  if (EBUF.n === 0) return;

  gl.bindVertexArray(EBUF.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, EBUF.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, EBUF.f, 0, EBUF.n);
  var vp = R.progView;
  gl.useProgram(vp.p);
  gl.uniformMatrix4fv(vp.u.uVP, false, _vmVP);
  gl.uniform3fv(vp.u.uSunDir, R.sunDir);
  gl.uniform3fv(vp.u.uSunCol, R.sky.sun);
  gl.uniform3fv(vp.u.uSkyLightCol, R.sky.skyLight);
  gl.uniform3fv(vp.u.uBlockLightCol, R.sky.blockLight);
  gl.uniform1f(vp.u.uAmbient, R.sky.ambient);
  gl.uniform1f(vp.u.uDay, R.sky.day);
  gl.uniform4f(vp.u.uOverlayCol, 1.0, 0.25, 0.25, p.hurtTime > 0 ? 0.30 : 0.0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, R.atlas); gl.uniform1i(vp.u.uAtlas, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  gl.disable(gl.CULL_FACE);
  gl.drawArrays(gl.TRIANGLES, 0, EBUF.n / EV_STRIDE);
  gl.enable(gl.CULL_FACE);
}

function heldEmissive(p) {
  var s = heldStack(p);
  if (!s) return false;
  var it = ITEMS[s.item];
  if (!it || !it.block) return false;
  var id = BID[it.block];
  return id !== undefined && BLOCKS[id].light > 0;
}

/* ------------------------------------------------------------- arms --- */
var SKIN = '#c58c5b', SKIN_D = '#a5714a', SLEEVE = '#3f74b8', SLEEVE_D = '#2f5992';
/* The arm is a 4x4 limb that starts at the hand (the current frame origin)
   and recedes toward the shoulder, off the bottom corner of the screen.
   Working outward from the hand rather than down from the shoulder keeps the
   grip locked to the item through the whole swing. */
function drawArm(game, side, holding) {
  mPush();
  mScale(side, 1, 1);
  /* The limb runs back from the fist and is tilted hard down and outward so
     the shoulder end leaves the frame at the bottom corner instead of
     ploughing through the near plane. */
  /* Outward is +X for the right hand: the shoulder end has to leave through
     the bottom corner of its own side, not cut back across the screen. */
  mRotZ(0.54);
  mRotY(0.12);
  mRotX(1.12 + (holding ? 0.0 : 0.06));
  _ecol[3] = 0;
  /* fist */
  emitBox(EBUF, -1.45, -1.45, -1.3, 2.9, 2.9, 3.0, partTile(SKIN, 0.05), 0);
  /* wrist and forearm */
  emitBox(EBUF, -1.35, -1.35, 1.7, 2.7, 2.7, 2.8, partTile(SKIN, 0.04), 0);
  /* rolled sleeve */
  emitBox(EBUF, -1.6, -1.6, 4.4, 3.2, 3.2, 9.4, partTile(SLEEVE, 0.05), 0.03);
  /* cuff line where the sleeve meets the skin */
  emitBox(EBUF, -1.7, -1.7, 4.3, 3.4, 3.4, 0.9, partTile(SLEEVE_D, 0.03), 0.05);
  mPop();
}

/* ------------------------------------------------------- held things -- */
function drawHeldBlock(game, id, stack) {
  var b = BLOCKS[id];
  /* pick the upright variant for blocks whose default state is wall-mounted */
  var heldState = 0;
  if (b.render === 'torch') heldState = 2;
  else if (b.render === 'lever') heldState = 5;
  var boxes = modelFor(id, heldState);
  if (!boxes || b.render === 'cross' || b.render === 'flat' || b.render === 'crop') {
    /* plants and other sprite blocks hang flat in the hand */
    mPush();
    mTranslate(-0.06, 0.12, -0.14);
    mRotY(0.66); mRotZ(-0.18); mRotX(0.26);
    mScale(0.56, 0.56, 0.56);
    drawExtrudedSprite(b.layers ? b.layers[4] : 0, 1.0);
    mPop();
    return;
  }
  /* Fit whatever the model actually is into the hand: a torch, a slab and a
     full cube all want to end up about the same apparent size. */
  var x0 = 16, y0 = 16, z0 = 16, x1 = 0, y1 = 0, z1 = 0;
  for (var i = 0; i < boxes.length; i++) {
    var q = boxes[i];
    if (q.x0 < x0) x0 = q.x0; if (q.y0 < y0) y0 = q.y0; if (q.z0 < z0) z0 = q.z0;
    if (q.x1 > x1) x1 = q.x1; if (q.y1 > y1) y1 = q.y1; if (q.z1 > z1) z1 = q.z1;
  }
  var ext = Math.max(x1 - x0, Math.max(y1 - y0, z1 - z0)) || 16;
  var fit = 0.42 * (16 / ext);
  fit = Math.min(fit, 0.90);
  mPush();
  mTranslate(-0.05, 0.12, -0.15);
  mRotY(0.70);
  mRotX(0.22);
  mRotZ(0.06);
  mScale(fit, fit, fit);
  mTranslate(-(x0 + x1) / 32, -(y0 + y1) / 32, -(z0 + z1) / 32);
  var lay = [0, 0, 0, 0, 0, 0];
  for (var k = 0; k < boxes.length; k++) {
    var r = boxes[k];
    for (var f = 0; f < 6; f++) lay[f] = faceLayer(r, b, f);
    emitBox(EBUF, r.x0, r.y0, r.z0, r.x1 - r.x0, r.y1 - r.y0, r.z1 - r.z0, lay.slice(), 0, true);
  }
  mPop();
}
function drawHeldItem(game, name, it) {
  var layer = ITEM_LAYER[name];
  if (layer === undefined) {
    if (it && it.block && BID[it.block] !== undefined) { drawHeldBlock(game, BID[it.block], null); return; }
    return;
  }
  mPush();
  /* Tools sit above and slightly in front of the fist with the blade angled
     up and toward the middle of the screen, so the silhouette clears the arm
     instead of hiding behind it. */
  var toolish = it && (it.tool || it.durability);
  var solid = it && ITEM_MODEL_FOR[it.icon];
  if (solid) {
    /* A built model is gripped, not pinned to a plane: the fist closes around
       the handle and the head of the tool leans away over the knuckles. */
    var upright = solid === 'bucket' || solid === 'ingot' || solid === 'gem';
    mTranslate(-0.04, 0.10, -0.16);
    mRotY(upright ? 0.42 : 0.30);
    mRotZ(upright ? 0.06 : 0.40);
    mRotX(upright ? 0.10 : -0.06);
    mScale(0.44, 0.44, 0.44);
    drawSolidItem(game, solid, it.color);
  } else {
    mTranslate(-0.06, 0.12, -0.15);
    mRotY(toolish ? 0.48 : 0.64);
    mRotZ(toolish ? 0.52 : 0.14);
    mRotX(toolish ? 0.10 : 0.24);
    mScale(0.46, 0.46, 0.46);
    drawExtrudedSprite(layer, 1.0);
  }
  mPop();
}

/* A 16x16 sprite extruded to a slab, exactly like an item in a real hand:
   two textured faces plus a rim of side quads generated from the alpha mask. */
var _extrudeCache = {};
function drawExtrudedSprite(layer, scale) {
  var d = TEX_LAYERS[layer];
  if (!d) return;
  var TH = 1.15;             /* thickness in model units */
  var S = scale === undefined ? 1 : scale;
  mPush();
  mScale(S, S, S);
  /* the sprite lives in 16-unit space, so centre it in world units */
  mTranslate(-0.5, -0.5, -TH / 32);
  /* front and back faces as a single thin box carrying the full sprite */
  spriteFace(layer, 0, 0, 16, 16, TH);
  /* rim: walk the alpha mask and emit a side quad on every silhouette edge */
  var mask = _extrudeCache[layer];
  if (!mask) {
    mask = new Uint8Array(256);
    for (var i = 0; i < 256; i++) mask[i] = d[i * 4 + 3] > 128 ? 1 : 0;
    _extrudeCache[layer] = mask;
  }
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    if (!mask[y * 16 + x]) continue;
    if (x === 0 || !mask[y * 16 + x - 1]) rimQuad(layer, x, y, TH, 0);
    if (x === 15 || !mask[y * 16 + x + 1]) rimQuad(layer, x, y, TH, 1);
    if (y === 0 || !mask[(y - 1) * 16 + x]) rimQuad(layer, x, y, TH, 2);
    if (y === 15 || !mask[(y + 1) * 16 + x]) rimQuad(layer, x, y, TH, 3);
  }
  mPop();
}
var _sv = [0, 0, 0], _sn = [0, 0, 0];
function pushSpriteVert(x, y, z, nx, ny, nz, u, v, layer) {
  if ((EBUF.n / EV_STRIDE) + 1 > EBUF.cap) return;
  xfPoint(_sv, x / 16, y / 16, z / 16);
  xfDir(_sn, nx, ny, nz);
  var F = EBUF.f, o = EBUF.n;
  F[o] = _sv[0]; F[o + 1] = _sv[1]; F[o + 2] = _sv[2];
  F[o + 3] = _sn[0]; F[o + 4] = _sn[1]; F[o + 5] = _sn[2];
  F[o + 6] = u; F[o + 7] = v;
  F[o + 8] = layer;
  F[o + 9] = _ecol[0]; F[o + 10] = _ecol[1]; F[o + 11] = _ecol[2]; F[o + 12] = _ecol[3];
  F[o + 13] = _elight[0]; F[o + 14] = _elight[1];
  EBUF.n = o + EV_STRIDE;
}
function spriteFace(layer, x0, y0, w, h, th) {
  var x1 = x0 + w, y1 = y0 + h;
  /* front (+Z) — sprite v runs top-down, so flip */
  pushSpriteVert(x0, y0, th, 0, 0, 1, 0, 1, layer);
  pushSpriteVert(x1, y0, th, 0, 0, 1, 1, 1, layer);
  pushSpriteVert(x1, y1, th, 0, 0, 1, 1, 0, layer);
  pushSpriteVert(x0, y0, th, 0, 0, 1, 0, 1, layer);
  pushSpriteVert(x1, y1, th, 0, 0, 1, 1, 0, layer);
  pushSpriteVert(x0, y1, th, 0, 0, 1, 0, 0, layer);
  /* back (-Z) */
  pushSpriteVert(x1, y0, 0, 0, 0, -1, 1, 1, layer);
  pushSpriteVert(x0, y0, 0, 0, 0, -1, 0, 1, layer);
  pushSpriteVert(x0, y1, 0, 0, 0, -1, 0, 0, layer);
  pushSpriteVert(x1, y0, 0, 0, 0, -1, 1, 1, layer);
  pushSpriteVert(x0, y1, 0, 0, 0, -1, 0, 0, layer);
  pushSpriteVert(x1, y1, 0, 0, 0, -1, 1, 0, layer);
}
function rimQuad(layer, x, y, th, dir) {
  /* texel (x,y) with y counted from the top of the sprite */
  var gy = 15 - y;
  var u0 = (x + 0.5) / 16, v0 = (y + 0.5) / 16;
  var a, b, c, e, nx = 0, ny = 0;
  if (dir === 0) { a = [x, gy, 0]; b = [x, gy, th]; c = [x, gy + 1, th]; e = [x, gy + 1, 0]; nx = -1; }
  else if (dir === 1) { a = [x + 1, gy + 1, 0]; b = [x + 1, gy + 1, th]; c = [x + 1, gy, th]; e = [x + 1, gy, 0]; nx = 1; }
  else if (dir === 2) { a = [x, gy + 1, 0]; b = [x, gy + 1, th]; c = [x + 1, gy + 1, th]; e = [x + 1, gy + 1, 0]; ny = 1; }
  else { a = [x + 1, gy, 0]; b = [x + 1, gy, th]; c = [x, gy, th]; e = [x, gy, 0]; ny = -1; }
  pushSpriteVert(a[0], a[1], a[2], nx, ny, 0, u0, v0, layer);
  pushSpriteVert(b[0], b[1], b[2], nx, ny, 0, u0, v0, layer);
  pushSpriteVert(c[0], c[1], c[2], nx, ny, 0, u0, v0, layer);
  pushSpriteVert(a[0], a[1], a[2], nx, ny, 0, u0, v0, layer);
  pushSpriteVert(c[0], c[1], c[2], nx, ny, 0, u0, v0, layer);
  pushSpriteVert(e[0], e[1], e[2], nx, ny, 0, u0, v0, layer);
}
