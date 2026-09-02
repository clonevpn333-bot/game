// ============================================================ CAMERA
// Third person by default.  The camera never steers itself - the mouse owns
// the aim.  All it does on a wall is slide outwards so rock never fills the
// screen, and pull in when something is behind it.
var CAM = {
  yaw: 0, pitch: -0.12, dist: 4.7, want: 4.7, first: false,
  pos: new THREE.Vector3(), look: new THREE.Vector3(),
  smoothTgt: new THREE.Vector3(), lift: 0, side: 0, shake: 0, shakeT: 0,
  fovBase: 76, fov: 76, wallBias: 0,
};
var _hit = { x: 0, y: 0, z: 0, d: 0, hit: false };
var _cdir = new THREE.Vector3(), _ctgt = new THREE.Vector3();

CAM.applyMouse = function (dx, dy) {
  CAM.yaw -= dx * IN.sens;
  CAM.pitch -= dy * IN.sens * (IN.invert ? -1 : 1);
  CAM.pitch = clamp(CAM.pitch, -1.42, 1.36);
  if (CAM.yaw > Math.PI) CAM.yaw -= Math.PI * 2;
  if (CAM.yaw < -Math.PI) CAM.yaw += Math.PI * 2;
};

CAM.kick = function (amt) { CAM.shake = Math.min(1.4, CAM.shake + amt); };

CAM.update = function (cam, P, dt) {
  var cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  _cdir.set(Math.sin(CAM.yaw) * cp, sp, Math.cos(CAM.yaw) * cp).normalize();

  // aim point: the head, nudged away from whatever the body is against
  var tx = P.pos.x, ty = P.pos.y + K.EYE, tz = P.pos.z;
  var wantBias = (P.state === ST.CLIMB) ? 1.0 : 0;
  CAM.wallBias = damp(CAM.wallBias, wantBias, 5, dt);
  if (P.wall.has) {
    tx += P.wall.nx * CAM.wallBias * 0.85;
    tz += P.wall.nz * CAM.wallBias * 0.85;
    ty += CAM.wallBias * 0.16;
  }
  _ctgt.set(tx, ty, tz);
  CAM.smoothTgt.lerp(_ctgt, 1 - Math.exp(-22 * dt));

  var fovT = CAM.fovBase + (P.sprinting ? 6 : 0) + clamp(-P.vel.y * 0.55, 0, 13);
  CAM.fov = damp(CAM.fov, fovT, 6, dt);
  if (Math.abs(cam.fov - CAM.fov) > 0.05) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); }

  if (CAM.first) {
    CAM.pos.copy(CAM.smoothTgt);
    CAM.pos.x -= _cdir.x * 0.05; CAM.pos.z -= _cdir.z * 0.05;
  } else {
    var want = CAM.want + (P.state === ST.CLIMB ? 0.8 : 0) + (P.carrying ? 0.5 : 0);
    // shoulder offset keeps the body out of the middle of the screen
    var rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
    var ox = rx * 0.55, oz = rz * 0.55;
    var bx = CAM.smoothTgt.x + ox, by = CAM.smoothTgt.y + 0.18, bz = CAM.smoothTgt.z + oz;
    var dx = -_cdir.x, dy = -_cdir.y, dz = -_cdir.z;

    // If the boom is blocked - which on a mountain means almost any time
    // you look downhill - lift it over the obstruction before shortening
    // it.  Rising above the slope reads far better than a lens pressed
    // into the climber's backpack.
    var best = -1, bd2 = -1, lift = 0, tp, tcp, tdx, tdy, tdz;
    for (var a = 0; a < 4; a++) {
      tp = clamp(CAM.pitch + a * 0.19, -1.45, 1.4);
      tcp = Math.cos(tp);
      tdx = -Math.sin(CAM.yaw) * tcp; tdy = -Math.sin(tp); tdz = -Math.cos(CAM.yaw) * tcp;
      T.ray(bx, by, bz, tdx, tdy, tdz, want + 0.6, 0.35, _hit);
      var got = _hit.hit ? _hit.d - 0.5 : want;
      if (got > bd2) { bd2 = got; best = a; }
      if (got >= want * 0.92) break;
    }
    lift = best * 0.19;
    CAM.lift = damp(CAM.lift, lift, 7, dt);
    var pp = clamp(CAM.pitch + CAM.lift, -1.45, 1.4), pcp = Math.cos(pp);
    dx = -Math.sin(CAM.yaw) * pcp; dy = -Math.sin(pp); dz = -Math.cos(CAM.yaw) * pcp;
    T.ray(bx, by, bz, dx, dy, dz, want + 0.6, 0.35, _hit);
    var d = _hit.hit ? Math.max(1.15, _hit.d - 0.5) : want;
    // pull in fast, ease out slowly so it does not pump on broken ground
    CAM.dist = d < CAM.dist ? d : damp(CAM.dist, d, 5.5, dt);
    CAM.pos.set(bx + dx * CAM.dist, by + dy * CAM.dist, bz + dz * CAM.dist);

    // The ray can still leave the lens inside a wall when the boom sweeps
    // across broken rock, so walk it back in until it is out in the open.
    for (var it = 0; it < 5; it++) {
      var g = T.hAt(CAM.pos.x, CAM.pos.z);
      if (g <= T.VOID) break;
      g = Props.capHeight(CAM.pos.x, CAM.pos.z, g);
      if (CAM.pos.y > g + 0.42) break;
      if (CAM.dist > 1.0) {
        CAM.dist *= 0.68;
        CAM.pos.set(bx + dx * CAM.dist, by + dy * CAM.dist, bz + dz * CAM.dist);
      } else { CAM.pos.y = g + 0.42; break; }
    }

    // when the boom is jammed short, lift the eye and let the body fade out
    // rather than filling the screen with a backpack
    var tight = invl(2.6, 1.15, CAM.dist);
    CAM.pos.y += tight * 0.34;
  }
  CAM.hideBody = CAM.first || CAM.dist < 1.55;

  if (CAM.shake > 0.002) {
    CAM.shakeT += dt * 34;
    var s = CAM.shake * 0.16;
    CAM.pos.x += Math.sin(CAM.shakeT * 1.7) * s;
    CAM.pos.y += Math.sin(CAM.shakeT * 2.3 + 1.1) * s;
    CAM.pos.z += Math.cos(CAM.shakeT * 1.9) * s;
    CAM.shake = damp(CAM.shake, 0, 6, dt);
  }

  cam.position.copy(CAM.pos);
  CAM.look.set(CAM.pos.x + _cdir.x, CAM.pos.y + _cdir.y, CAM.pos.z + _cdir.z);
  cam.lookAt(CAM.look);
};

CAM.forward = function (out) {
  var cp = Math.cos(CAM.pitch);
  out.set(Math.sin(CAM.yaw) * cp, Math.sin(CAM.pitch), Math.cos(CAM.yaw) * cp).normalize();
  return out;
};
CAM.flatForward = function (out) { out.set(Math.sin(CAM.yaw), 0, Math.cos(CAM.yaw)).normalize(); return out; };
CAM.flatRight = function (out) { out.set(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw)).normalize(); return out; };
