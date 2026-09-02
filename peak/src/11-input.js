// ============================================================ INPUT
var IN = {
  keys: {}, hit: {}, mx: 0, my: 0, mb: [false, false, false], mbHit: [false, false, false],
  locked: false, sens: 0.0014, invert: false, el: null, onLockChange: null,
};

IN.init = function (el) {
  IN.el = el;
  window.addEventListener('keydown', function (e) {
    if (e.repeat) { IN.keys[e.code] = true; return; }
    if (!IN.keys[e.code]) IN.hit[e.code] = true;
    IN.keys[e.code] = true;
    if (IN.locked && (e.code === 'Tab' || e.code.indexOf('Arrow') === 0 || e.code === 'Space' || e.code === 'Slash')) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { IN.keys[e.code] = false; });
  window.addEventListener('blur', function () { IN.keys = {}; IN.mb = [false, false, false]; });

  document.addEventListener('mousemove', function (e) {
    if (!IN.locked) return;
    IN.mx += e.movementX || 0;
    IN.my += e.movementY || 0;
  });
  document.addEventListener('mousedown', function (e) {
    if (!IN.locked) return;
    if (!IN.mb[e.button]) IN.mbHit[e.button] = true;
    IN.mb[e.button] = true;
    e.preventDefault();
  });
  document.addEventListener('mouseup', function (e) { IN.mb[e.button] = false; });
  document.addEventListener('contextmenu', function (e) { if (IN.locked) e.preventDefault(); });

  document.addEventListener('pointerlockchange', function () {
    IN.locked = document.pointerLockElement === IN.el;
    if (!IN.locked) { IN.mb = [false, false, false]; IN.keys = {}; }
    if (IN.onLockChange) IN.onLockChange(IN.locked);
  });
  document.addEventListener('pointerlockerror', function () {
    IN.locked = false;
    if (IN.onLockChange) IN.onLockChange(false);
  });
};

IN.lock = function () {
  if (IN.locked || !IN.el) return;
  var p = IN.el.requestPointerLock({ unadjustedMovement: true });
  if (p && p.catch) p.catch(function () { try { IN.el.requestPointerLock(); } catch (e) { } });
};
IN.unlock = function () { if (document.pointerLockElement) document.exitPointerLock(); };

IN.down = function (c) { return !!IN.keys[c]; };
IN.press = function (c) { return !!IN.hit[c]; };
IN.mdown = function (b) { return IN.mb[b]; };
IN.mpress = function (b) { return IN.mbHit[b]; };
IN.axis = function (neg, pos) { return (IN.keys[neg] ? -1 : 0) + (IN.keys[pos] ? 1 : 0); };
IN.flush = function () { IN.hit = {}; IN.mbHit = [false, false, false]; IN.mx = 0; IN.my = 0; };

// named bindings, so remapping later is a one-line change
IN.moveX = function () { return IN.axis('KeyA', 'KeyD'); };
IN.moveZ = function () { return IN.axis('KeyS', 'KeyW'); };
IN.sprint = function () { return IN.down('ShiftLeft') || IN.down('ShiftRight'); };
IN.jump = function () { return IN.press('Space'); };
IN.jumpHeld = function () { return IN.down('Space'); };
IN.grip = function () { return IN.mdown(0); };   // hold to hang on
IN.use = function () { return IN.press('KeyC'); };
IN.interactHeld = function () { return IN.down('KeyE'); };
IN.interact = function () { return IN.press('KeyE'); };
IN.rope = function () { return IN.press('KeyR'); };
IN.brace = function () { return IN.press('KeyF'); };
IN.pass = function () { return IN.press('KeyG'); };
IN.pingHeld = function () { return IN.down('KeyQ'); };
IN.pingHit = function () { return IN.press('KeyQ'); };
IN.view = function () { return IN.press('KeyV'); };
IN.roster = function () { return IN.down('Tab'); };
