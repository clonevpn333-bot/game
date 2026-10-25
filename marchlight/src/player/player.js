// Rook: third-person character controller built on Rapier's kinematic
// character controller. Handles locomotion, jumping, mantling, ledge hangs,
// wall/ladder climbing, moving platforms, seated/scripted states and health.
import * as THREE from 'three';
import RAPIER from 'rapier';
import { G, groups } from '../core/physics.js';
import { buildCharacter } from '../characters/rig.js';
import { Animator } from '../characters/anim.js';
import { clamp, damp, dampAngle, lerp, wrapAngle, smoothstep } from '../core/util.js';

const HALF = 0.55, RAD = 0.3, CENTER = HALF + RAD; // capsule center height above feet
const GRAV = 20;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion();
const DOWN = new THREE.Vector3(0, -1, 0);

export class Player {
  constructor(game, look) {
    this.game = game;
    this.physics = game.physics;
    this.pos = new THREE.Vector3(0, 0, 0);    // feet position (city frame)
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.targetYaw = 0;
    this.state = 'ground';
    this.grounded = true; this.coyote = 0; this.jumpBuffer = 0; this.airTime = 0; this.maxFall = 0;
    this.relaxed = true; // calm city pace
    this.crouch = false; this.crouchS = 0;
    this.health = 100; this.maxHealth = 100; this.regenDelay = 0; this.dead = false; this.invuln = 0;
    this.groundCollider = null; this.surface = 'metal';
    this.stepDist = 0; this.lastFoot = 0;
    this.hang = null; this.climb = null; this.mantle = null; this.seat = null; this.latch = null;
    this.externalImpulse = new THREE.Vector3();
    this.controlsLocked = false;
    this.speedMul = 1;
    this.leapCooldown = 0;

    const R = this.physics.R;
    this.body = this.physics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CENTER, 0));
    this.collider = this.physics.world.createCollider(R.ColliderDesc.capsule(HALF, RAD).setCollisionGroups(groups(G.PLAYER, G.STATIC | G.PROP | G.PLATFORM | G.ENEMY)), this.body);
    this.physics.setMeta(this.collider, { kind: 'player' });
    this.kcc = this.physics.world.createCharacterController(0.03);
    this.kcc.enableAutostep(0.42, 0.18, false);
    this.kcc.enableSnapToGround(0.35);
    this.kcc.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    this.kcc.setMinSlopeSlideAngle(55 * Math.PI / 180);
    this.kcc.setApplyImpulsesToDynamicBodies(true);
    this.kcc.setCharacterMass(80);
    this.kcc.setSlideEnabled(true);

    this.setLook(look);
  }

  setLook(look) {
    const old = this.char;
    if (old) old.group.removeFromParent();
    this.look = look;
    this.char = buildCharacter({ ...look, tetherArm: look.tetherArm ?? true }, { lods: false }); // the player is always the hero LOD
    this.anim = new Animator(this.char);
    this.game.engine.cityRoot.add(this.char.group);
    this.char.group.position.copy(this.pos);
    this.game.weapons?.attach(this);
    this.game.tether?.attach(this);
  }

  // ------------------------------------------------------------------ teleport
  teleport(p, yaw = this.yaw) {
    this.pos.copy(p); this.vel.set(0, 0, 0); this.yaw = this.targetYaw = yaw;
    this.body.setTranslation({ x: p.x, y: p.y + CENTER, z: p.z }, true);
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + CENTER, z: p.z });
    this.state = 'ground'; this.hang = this.climb = this.mantle = null; this.grounded = true; this.maxFall = 0;
    this.char.group.position.copy(p); this.char.group.rotation.y = yaw;
  }

  get headPos() { return _v3.set(this.pos.x, this.pos.y + 1.6 * this.char.group.scale.y, this.pos.z); }
  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + CENTER, this.pos.z); }
  forward(out = new THREE.Vector3()) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }

  // ------------------------------------------------------------------ update
  update(dt) {
    const g = this.game, inp = g.input, cam = g.camera;
    this.leapCooldown = Math.max(0, this.leapCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    // health regen
    if (!this.dead) {
      this.regenDelay -= dt;
      if (this.regenDelay < 0 && this.health < this.maxHealth) this.health = Math.min(this.maxHealth, this.health + 22 * dt);
    }

    const canControl = !this.controlsLocked && !g.director.active && !this.dead;
    const mv = canControl ? inp.moveVector() : { x: 0, y: 0 };
    // camera-relative wish dir
    const cy = cam.yaw;
    const fx = Math.sin(cy), fz = Math.cos(cy);
    // forward = (sin, 0, cos); screen-right = (-cos, 0, sin)
    const wish = (this._wish ||= new THREE.Vector3()).set(fx * mv.y - fz * mv.x, 0, fz * mv.y + fx * mv.x);
    const wishLen = Math.min(1, Math.hypot(mv.x, mv.y));

    // moving platform carry (before our own movement)
    this.applyPlatformCarry();

    switch (this.state) {
      case 'ground': case 'air': this.updateLocomotion(dt, wish, wishLen, canControl); break;
      case 'hang': this.updateHang(dt, mv, canControl); break;
      case 'climb': case 'ladder': this.updateClimb(dt, mv, canControl); break;
      case 'mantle': this.updateMantle(dt); break;
      case 'latch': this.updateLatch(dt, wish, wishLen, canControl); break;
      case 'seated': this.updateSeated(dt); break;
      case 'scripted': break;
    }
    // sync visuals
    this.char.group.position.copy(this.pos);
    this.char.group.rotation.y = this.yaw;
    // bank into turns, lean into acceleration
    const yawRate = (this.yaw - (this._prevYaw ?? this.yaw)) / Math.max(dt, 1e-4); this._prevYaw = this.yaw;
    const hsp = Math.hypot(this.vel.x, this.vel.z);
    this.anim.lean = this.state === 'ground' ? clamp(-yawRate * hsp * 0.025, -0.22, 0.22) : 0;
    this.anim.accelLean = damp(this.anim.accelLean, clamp((hsp - (this._prevSp ?? hsp)) / Math.max(dt, 1e-4) * 0.04, -0.3, 0.3), 8, dt); this._prevSp = hsp;
    // Rook looks where the player looks (head & eyes), unless a scene has set a target
    if (!this.game.director.active && !this.lookOverride) {
      const cam = this.game.engine.camera; const f = cam.getWorldDirection(new THREE.Vector3());
      this.anim.lookTarget = cam.position.clone().addScaledVector(f, 25);
    }
    this.anim.update(dt);
    // plant feet on stairs/slopes
    if (g.weapons?.drawn) this.anim.weaponIK(g.engine.camera.getWorldDirection(new THREE.Vector3()));
    if (this.state === 'ground') this.anim.footIK((x, y, z) => { const h = this.physics.raycastFilter(new THREE.Vector3(x, y, z), DOWN, 1.1, G.STATIC | G.PLATFORM, c => c.handle !== this.collider.handle); return h ? h.point.y : null; });

    // fell off the world
    if (this.pos.y < g.killY && !this.dead) g.onPlayerFell?.();
  }

  applyPlatformCarry() {
    const gc = this.groundCollider;
    const ride = (this.state === 'ground' || this.state === 'hang' || this.state === 'climb') ? gc : null;
    const rm = ride ? this.physics.getMeta(ride) : null;
    const plat = this.ridePlatform || (rm?.kind === 'platform' ? rm.obj.userData.kinematic : null);
    if (!plat) { this.platformVel = null; return; }
    // delta = cur * prev^-1
    _m.copy(plat.prev).invert(); _m2.multiplyMatrices(plat.cur, _m);
    const before = _v2.copy(this.pos);
    this.pos.applyMatrix4(_m2);
    // yaw change
    _q.setFromRotationMatrix(_m2);
    const e = new THREE.Euler().setFromQuaternion(_q, 'YXZ');
    this.yaw += e.y; this.targetYaw += e.y;
    if (this.state === 'hang' && this.hang) { this.hang.point.applyMatrix4(_m2); this.hang.normal.transformDirection(_m2); }
    this.platformVel = before.sub(this.pos).multiplyScalar(-1 / Math.max(this.game.dt, 1e-4));
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
    this.body.setTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z }, false);
  }

  moveBy(delta) {
    this.kcc.computeColliderMovement(this.collider, { x: delta.x, y: delta.y, z: delta.z }, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, groups(G.PLAYER, G.STATIC | G.PROP | G.PLATFORM | G.ENEMY));
    const m = this.kcc.computedMovement();
    this.pos.x += m.x; this.pos.y += m.y; this.pos.z += m.z;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
    this.body.setTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z }, false);
    // find what we're standing on / bumped into
    let hitWall = null;
    for (let i = 0; i < this.kcc.numComputedCollisions(); i++) {
      const c = this.kcc.computedCollision(i);
      if (!c) continue;
      if (c.normal1 && Math.abs(c.normal1.y) < 0.4) hitWall = c;
    }
    return { moved: m, grounded: this.kcc.computedGrounded(), hitWall };
  }

  probeGround() {
    const o = _v2.set(this.pos.x, this.pos.y + 0.3, this.pos.z);
    const h = this.physics.raycastFilter(o, DOWN, 0.7, G.STATIC | G.PLATFORM | G.PROP, (c) => c.handle !== this.collider.handle);
    this.groundCollider = h ? h.collider : null;
    this.surface = h?.meta?.surface || 'metal';
    return h;
  }

  speedTarget() {
    const g = this.game, inp = g.input;
    const aiming = g.weapons?.aiming || g.tether?.aiming;
    if (this.crouch) return 2.1;
    if (aiming) return 2.9;
    const sprint = inp.down('sprint');
    if (this.relaxed) return sprint ? 5.4 : 2.5;
    return sprint ? 7.3 : 4.7;
  }

  updateLocomotion(dt, wish, wishLen, canControl) {
    const g = this.game, inp = g.input;
    const grounded = this.state === 'ground';
    // crouch toggle
    if (canControl && inp.pressed('crouch') && grounded) this.crouch = !this.crouch;
    if (inp.down('sprint') && this.crouch && wishLen > 0.5) this.crouch = false;
    this.crouchS = damp(this.crouchS, this.crouch ? 1 : 0, 10, dt);

    const target = this.speedTarget() * this.speedMul;
    const desired = _v2.copy(wish).multiplyScalar(target * wishLen);
    const accel = grounded ? (wishLen > 0.05 ? 28 : 22) : 6;
    const k = 1 - Math.exp(-accel * dt / Math.max(1, target * 0.35));
    this.vel.x += (desired.x - this.vel.x) * (grounded ? Math.min(1, k * 2.4) : k * 0.8);
    this.vel.z += (desired.z - this.vel.z) * (grounded ? Math.min(1, k * 2.4) : k * 0.8);

    // jumping
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (canControl && inp.pressed('jump')) this.jumpBuffer = 0.14;
    if (grounded) this.coyote = 0.12; else this.coyote = Math.max(0, this.coyote - dt);

    if (this.jumpBuffer > 0 && canControl) {
      // try mantle first (vault onto things in front)
      if (this.tryMantle(true)) { this.jumpBuffer = 0; return; }
      if (this.coyote > 0) {
        this.vel.y = 6.6; this.state = 'air'; this.coyote = 0; this.jumpBuffer = 0; this.crouch = false;
        if (this.platformVel) { this.vel.x += this.platformVel.x; this.vel.z += this.platformVel.z; }
        g.audio.footstep(this.pos, this.surface, 0.8); g.audio.whoosh(0.3);
      } else if (this.state === 'air' && g.tether?.cells >= 1 && this.leapCooldown <= 0 && !g.tether.locked) {
        // Kinetic leap: spend a stored cell to launch along the camera
        this.kineticLeap(); this.jumpBuffer = 0;
      }
    }
    if (this.state === 'air' && canControl && inp.released('jump') && this.vel.y > 2.5 && !this.leaping) this.vel.y *= 0.55;

    // gravity
    // (use the current state: a jump this frame has already left the ground, so don't clamp its lift-off speed)
    if (this.state !== 'ground') { this.vel.y -= GRAV * dt; this.airTime += dt; this.maxFall = Math.max(this.maxFall, -this.vel.y); }
    else { this.vel.y = Math.min(this.vel.y, 0) - 2 * dt; this.airTime = 0; }
    this.vel.y = Math.max(this.vel.y, -48);

    // external impulses (tether pushes, explosions)
    if (this.externalImpulse.lengthSq() > 0) { this.vel.add(this.externalImpulse); this.externalImpulse.set(0, 0, 0); if (this.vel.y > 0) this.state = 'air'; }

    const res = this.moveBy(_v.copy(this.vel).multiplyScalar(dt));
    // ceiling bonk
    if (this.vel.y > 0 && res.moved.y < this.vel.y * dt * 0.5) this.vel.y = 0;
    const wasAir = this.state === 'air';
    const nowGrounded = res.grounded && this.vel.y <= 0.5;
    if (nowGrounded) {
      if (wasAir) this.onLand();
      this.state = 'ground'; this.leaping = false;
      this.probeGround();
    } else {
      if (this.state === 'ground') { this.state = 'air'; if (this.vel.y < 0) this.vel.y = -1; }
      this.groundCollider = null;
      // ledge grab while airborne
      if (this.vel.y < 1.5 && canControl && this.airTime > 0.12) this.tryLedgeGrab();
      // wall climb attach
      if (res.hitWall && canControl && wishLen > 0.4) this.tryWallAttach(res.hitWall);
    }
    // ladder/wall from ground: walking into a climbable surface
    if (this.state === 'ground' && res.hitWall && canControl && wishLen > 0.5) this.tryWallAttach(res.hitWall);
    // auto-vault low obstacles while sprinting
    if (this.state === 'ground' && res.hitWall && canControl && wishLen > 0.8 && inp.down('sprint')) this.tryMantle(false, 1.2);

    // facing
    const hv = Math.hypot(this.vel.x, this.vel.z);
    const aiming = g.weapons?.aiming || g.tether?.aiming;
    if (aiming || g.weapons?.firingRecently) this.targetYaw = g.camera.yaw;
    else if (hv > 0.3 && wishLen > 0.1) this.targetYaw = Math.atan2(this.vel.x, this.vel.z);
    this.yaw = dampAngle(this.yaw, this.targetYaw, aiming ? 18 : (grounded ? 11 : 4), dt);

    // anim drive
    const a = this.anim;
    a.mode = 'loco'; a.speed = hv; a.grounded = this.state === 'ground' || this.coyote > 0.08; a.vy = this.vel.y; a.crouch = this.crouchS;
    const rel = wrapAngle(Math.atan2(this.vel.x, this.vel.z) - this.yaw);
    a.moveAngle = hv > 0.2 ? rel : 0;

    // footsteps
    if (this.state === 'ground' && hv > 0.5) {
      this.stepDist += hv * dt;
      const stride = hv > 5 ? 1.25 : hv > 3 ? 1.0 : 0.72;
      if (this.stepDist > stride) { this.stepDist = 0; g.audio.footstep(this.pos, this.surface, clamp(hv / 5, 0.25, 1) * (this.crouch ? 0.4 : 1)); g.noise?.(this.pos, this.crouch ? 2 : hv > 5 ? 14 : 7); }
    }
  }

  kineticLeap() {
    const g = this.game;
    const dir = g.camera.forwardFlat(_v.set(0, 0, 0));
    const pitch = clamp(-g.camera.pitch, -0.2, 0.9);
    const f = 11.5;
    this.vel.set(dir.x * f * Math.cos(pitch * 0.5), 9.5 + Math.max(0, pitch) * 5, dir.z * f * Math.cos(pitch * 0.5));
    this.state = 'air'; this.leaping = true; this.leapCooldown = 0.35;
    g.tether.spend(1, 'leap');
    g.fx.kineticBurst(this.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 1);
    g.camera.shake(0.25); g.camera.kick(-0.03);
    g.audio.tetherRelease(0.8);
    this.anim.land(0.3);
  }

  onLand() {
    const g = this.game, f = this.maxFall;
    this.anim.land(clamp((f - 4) / 10, 0.15, 1));
    if (f > 6) { g.audio.land(this.pos, clamp(f / 14, 0.4, 1.4)); g.camera.shake(clamp((f - 6) / 18, 0, 0.6)); g.camera.dip(clamp(f / 30, 0.05, 0.4)); g.fx?.dust(this.pos, clamp(f / 12, 0.3, 1.5)); }
    else g.audio.footstep(this.pos, this.surface, 0.7);
    if (f > 17) this.damage((f - 17) * 9, null, 'fall');
    this.maxFall = 0;
  }

  // ------------------------------------------------------------------ mantle / vault
  tryMantle(fromJump, maxH = 2.35) {
    const fwd = this.forward(_v);
    if (fromJump) { const mv = this.game.input.moveVector(); if (Math.hypot(mv.x, mv.y) < 0.2 && this.state === 'ground') return false; }
    const wallHit = this.physics.raycastFilter(_v2.set(this.pos.x, this.pos.y + 0.6, this.pos.z), fwd, 0.85, G.STATIC | G.PLATFORM | G.PROP, c => c.handle !== this.collider.handle && !this.physics.getMeta(c)?.rail) ||
      this.physics.raycastFilter(_v2.set(this.pos.x, this.pos.y + 1.4, this.pos.z), fwd, 0.85, G.STATIC | G.PLATFORM | G.PROP, c => c.handle !== this.collider.handle && !this.physics.getMeta(c)?.rail);
    if (!wallHit) return false;
    const n = wallHit.normal; if (Math.abs(n.y) > 0.5) return false;
    const inward = _v3.set(-n.x, 0, -n.z).normalize();
    const top = this.physics.raycastFilter(new THREE.Vector3(wallHit.point.x + inward.x * 0.35, this.pos.y + maxH + 0.25, wallHit.point.z + inward.z * 0.35), DOWN, maxH + 0.1, G.STATIC | G.PLATFORM | G.PROP, c => c.handle !== this.collider.handle);
    if (!top || top.normal.y < 0.7) return false;
    const h = top.point.y - this.pos.y;
    if (h < 0.45 || h > maxH) return false;
    // clearance above the top for the capsule
    const clear = this.physics.raycastFilter(top.point.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, 1, 0), 1.6, G.STATIC | G.PLATFORM, c => c.handle !== this.collider.handle);
    if (clear && clear.toi < 1.5) return false;
    this.startMantle(top.point.clone().add(inward.clone().multiplyScalar(0.25)), h, Math.atan2(inward.x, inward.z), top.collider);
    return true;
  }
  startMantle(target, h, yaw, collider = null) {
    this.state = 'mantle';
    const vault = h < 1.15;
    this.mantle = { from: this.pos.clone(), to: target, t: 0, dur: vault ? 0.32 : 0.55, h, vault, collider, colPrev: null };
    this.targetYaw = yaw; this.vel.set(0, 0, 0); this.hang = null; this.climb = null;
    this.anim.setMode('mantle');
    this.game.audio.footstep(this.pos, 'metal', 0.7); this.game.audio.whoosh(0.25);
  }
  updateMantle(dt) {
    const m = this.mantle; m.t += dt;
    const k = clamp(m.t / m.dur, 0, 1);
    const up = smoothstep(0, 0.55, k), fw = smoothstep(0.35, 1, k);
    this.pos.set(lerp(m.from.x, m.to.x, fw), lerp(m.from.y, m.to.y + 0.02, up), lerp(m.from.z, m.to.z, fw));
    this.yaw = dampAngle(this.yaw, this.targetYaw, 16, dt);
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
    this.body.setTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z }, false);
    this.anim.modeT = k * 0.45;
    if (k >= 1) { this.state = 'ground'; this.anim.setMode('loco'); this.vel.set(0, 0, 0); this.mantle = null; this.anim.land(0.2); }
  }

  // ------------------------------------------------------------------ ledge hang
  tryLedgeGrab() {
    const fwd = this.forward(_v);
    // only surfaces marked as ledges (painted edges) can be hung from
    const hit = this.physics.raycastFilter(_v2.set(this.pos.x, this.pos.y + 1.75, this.pos.z), fwd, 0.75, G.STATIC | G.PLATFORM, c => !!this.physics.getMeta(c)?.ledge);
    if (!hit || Math.abs(hit.normal.y) > 0.4) return false;
    const inward = _v3.set(-hit.normal.x, 0, -hit.normal.z).normalize();
    const top = this.physics.raycastFilter(new THREE.Vector3(hit.point.x + inward.x * 0.12, this.pos.y + 2.6, hit.point.z + inward.z * 0.12), DOWN, 1.4, G.STATIC | G.PLATFORM, () => true);
    if (!top || top.normal.y < 0.6) return false;
    const ledgeY = top.point.y;
    if (ledgeY - this.pos.y > 2.45 || ledgeY - this.pos.y < 1.45) return false;
    this.state = 'hang';
    this.hang = { point: new THREE.Vector3(hit.point.x, ledgeY, hit.point.z), normal: hit.normal.clone().setY(0).normalize(), collider: top.collider, cool: 0.25 };
    this.vel.set(0, 0, 0); this.maxFall = 0;
    this.yaw = this.targetYaw = Math.atan2(inward.x, inward.z);
    this.groundCollider = top.collider;
    this.snapHang();
    this.anim.setMode('hang');
    this.game.audio.footstep(this.pos, 'metal', 0.6); this.game.audio.clank(this.hang.point, 0.25, 1.4);
    this.game.camera.shake(0.08);
    return true;
  }
  snapHang() {
    const h = this.hang;
    this.pos.set(h.point.x + h.normal.x * 0.36, h.point.y - 2.02, h.point.z + h.normal.z * 0.36);
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z });
    this.body.setTranslation({ x: this.pos.x, y: this.pos.y + CENTER, z: this.pos.z }, false);
  }
  updateHang(dt, mv, canControl) {
    const h = this.hang, inp = this.game.input;
    h.cool -= dt;
    const right = _v.set(-h.normal.z, 0, h.normal.x); // along the ledge (character's right when facing wall)
    let sh = 0;
    if (canControl && Math.abs(mv.x) > 0.3) {
      // test ledge continuity at the new position
      const step = -mv.x * 1.3 * dt;
      const test = h.point.clone().addScaledVector(right, step * 4 + Math.sign(step) * 0.3);
      const ok = this.physics.raycastFilter(new THREE.Vector3(test.x - h.normal.x * 0.15, h.point.y + 0.3, test.z - h.normal.z * 0.15), DOWN, 0.6, G.STATIC | G.PLATFORM, c => !!this.physics.getMeta(c)?.ledge || true);
      const wall = this.physics.raycastFilter(new THREE.Vector3(test.x + h.normal.x * 0.4, h.point.y - 0.1, test.z + h.normal.z * 0.4), h.normal.clone().negate(), 0.8, G.STATIC | G.PLATFORM, c => !!this.physics.getMeta(c)?.ledge);
      if (ok && wall && Math.abs(ok.point.y - h.point.y) < 0.25) { h.point.addScaledVector(right, step); sh = -mv.x; }
    }
    this.anim.shimmy = damp(this.anim.shimmy, sh, 10, dt);
    this.snapHang();
    if (!canControl || h.cool > 0) return;
    if (inp.pressed('jump') || (mv.y > 0.6 && inp.down('forward') && h.cool < -0.3)) {
      if (mv.y < -0.5) { // leap backward off the wall
        this.state = 'air'; this.vel.set(h.normal.x * 5, 6, h.normal.z * 5); this.hang = null; this.anim.setMode('loco'); this.targetYaw = Math.atan2(h.normal.x, h.normal.z); return;
      }
      const inward = h.normal.clone().negate();
      const target = h.point.clone().addScaledVector(inward, 0.4);
      const clear = this.physics.raycastFilter(target.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(0, 1, 0), 1.7, G.STATIC | G.PLATFORM, () => true);
      if (!clear) { this.startMantle(target, 2, Math.atan2(inward.x, inward.z)); this.mantle.from.copy(this.pos); this.mantle.dur = 0.65; }
      return;
    }
    if (inp.pressed('crouch') || (mv.y < -0.6 && inp.pressed('back'))) { this.state = 'air'; this.hang = null; this.vel.set(h.normal.x * 0.8, -1, h.normal.z * 0.8); this.anim.setMode('loco'); this.airTime = -0.25; }
  }

  // ------------------------------------------------------------------ wall / ladder climbing
  tryWallAttach(hit) {
    if (!hit || !hit.collider) return false;
    const meta = this.physics.getMeta(hit.collider);
    if (!meta || (meta.climb !== 'wall' && meta.climb !== 'ladder')) return false;
    const n = new THREE.Vector3(hit.normal1.x, 0, hit.normal1.z).normalize();
    const fwd = this.forward(_v);
    if (fwd.dot(n) > -0.4) return false;
    this.state = meta.climb === 'ladder' ? 'ladder' : 'climb';
    this.climb = { normal: n, collider: hit.collider, meta, phase: 0 };
    if (meta.climb === 'ladder') { // snap onto ladder line
      const t = hit.collider.translation();
      const r = new THREE.Vector3(Math.sin(meta.ladderRy), 0, Math.cos(meta.ladderRy));
      this.pos.x = t.x + r.x * 0.08 + n.x * 0.42; this.pos.z = t.z + r.z * 0.08 + n.z * 0.42;
      this.climb.normal.copy(r).negate();
      this.pos.x = t.x - r.x * 0.38; this.pos.z = t.z - r.z * 0.38;
    }
    this.vel.set(0, 0, 0); this.maxFall = 0;
    this.yaw = this.targetYaw = Math.atan2(-this.climb.normal.x, -this.climb.normal.z);
    this.anim.setMode(this.state === 'ladder' ? 'ladder' : 'wallclimb');
    this.game.audio.clank(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.25, 1.5);
    return true;
  }
  updateClimb(dt, mv, canControl) {
    const c = this.climb, inp = this.game.input;
    const ladder = this.state === 'ladder';
    const n = c.normal;
    const right = _v.set(-n.z, 0, n.x).negate();
    const speed = ladder ? 2.4 : 2.0;
    const dx = ladder ? 0 : mv.x * speed * dt, dy = mv.y * speed * dt;
    const delta = _v2.set(right.x * dx, dy, right.z * dx);
    // stay pressed against the wall
    delta.addScaledVector(n, -0.5 * dt);
    const res = this.moveBy(delta);
    this.anim.climbPhase += (Math.abs(mv.y) + Math.abs(ladder ? 0 : mv.x)) * dt * 6;
    if (Math.abs(mv.y) + Math.abs(mv.x) > 0.1) {
      c.stepT = (c.stepT || 0) + dt; if (c.stepT > 0.4) { c.stepT = 0; this.game.audio.footstep(this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 'metal', 0.35); }
    }
    // reached top: is there still wall in front of our chest?
    const chest = this.physics.raycastFilter(new THREE.Vector3(this.pos.x, this.pos.y + 1.45, this.pos.z), n.clone().negate(), 0.9, G.STATIC | G.PLATFORM, () => true);
    if (!chest && mv.y > 0.2) {
      const inward = n.clone().negate();
      const top = this.physics.raycastFilter(new THREE.Vector3(this.pos.x + inward.x * 0.7, this.pos.y + 2.4, this.pos.z + inward.z * 0.7), DOWN, 2.0, G.STATIC | G.PLATFORM, () => true);
      if (top && top.normal.y > 0.6) { this.startMantle(top.point.clone().addScaledVector(inward, 0.15), top.point.y - this.pos.y, Math.atan2(inward.x, inward.z)); return; }
    }
    // hit ground going down
    if (mv.y < -0.2 && res.grounded) { this.state = 'ground'; this.climb = null; this.anim.setMode('loco'); return; }
    // left the climbable surface?
    const still = this.physics.raycastFilter(new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z), n.clone().negate(), 0.9, G.STATIC | G.PLATFORM, col => { const m = this.physics.getMeta(col); return m?.climb === 'wall' || m?.climb === 'ladder'; });
    if (!still && !chest) { this.state = 'air'; this.climb = null; this.anim.setMode('loco'); return; }
    if (canControl && inp.pressed('jump')) { // kick off
      this.state = 'air'; this.vel.set(n.x * 5.5 + right.x * mv.x * 3, 5.5, n.z * 5.5 + right.z * mv.x * 3); this.climb = null; this.anim.setMode('loco'); this.targetYaw = Math.atan2(n.x, n.z);
      this.game.audio.whoosh(0.3);
    } else if (canControl && inp.pressed('crouch')) { this.state = 'air'; this.vel.set(n.x * 1.5, 0, n.z * 1.5); this.climb = null; this.anim.setMode('loco'); }
  }

  // ------------------------------------------------------------------ tether latch (rope)
  startLatch(anchor) {
    this.state = 'latch';
    this.latch = { anchor, len: anchor.getPoint().distanceTo(this.center), reel: true, t: 0 };
    this.anim.setMode('swing');
    this.hang = this.climb = null; this.groundCollider = null;
  }
  endLatch(boost = true) {
    if (this.state !== 'latch') return;
    this.state = 'air'; this.anim.setMode('loco'); this.airTime = 0.2;
    if (boost) this.vel.y = Math.max(this.vel.y, 2.5);
    this.latch = null;
  }
  updateLatch(dt, wish, wishLen, canControl) {
    const L = this.latch, g = this.game;
    L.t += dt;
    const ap = L.anchor.getPoint();
    const av = L.anchor.getVelocity ? L.anchor.getVelocity() : null;
    const c = this.center;
    const toA = _v2.copy(ap).sub(c); const dist = toA.length(); toA.divideScalar(Math.max(dist, 1e-3));
    // reel in toward the anchor; carried along with a moving anchor
    const reelSpeed = 19;
    if (L.reel) L.len = Math.max(1.6, L.len - reelSpeed * dt);
    this.vel.y -= GRAV * 0.35 * dt;
    // spring toward rope length
    const stretch = dist - L.len;
    if (stretch > 0) this.vel.addScaledVector(toA, stretch * 40 * dt + 6 * dt);
    // match a moving anchor's velocity (this is how pistons/trams fling you)
    if (av) { this.vel.lerp(_v3.copy(av).addScaledVector(toA, reelSpeed * 0.5), 1 - Math.exp(-4 * dt)); }
    this.vel.addScaledVector(wish, wishLen * 6 * dt);
    this.vel.multiplyScalar(1 - 0.6 * dt);
    if (this.vel.length() > 30) this.vel.setLength(30);
    const res = this.moveBy(_v.copy(this.vel).multiplyScalar(dt));
    this.yaw = dampAngle(this.yaw, Math.atan2(toA.x, toA.z), 8, dt);
    this.anim.tetherPitch = -Math.asin(clamp(toA.y, -1, 1));
    // arrived
    if (dist < 2.0 && L.anchor.onArrive) { L.anchor.onArrive(this); return; }
    if (dist < 1.9 || (L.t > 3.5)) { this.endLatch(true); if (L.anchor.mantle !== false) this.tryMantle(false, 2.5); return; }
    if (canControl && (g.input.released('use') && L.t > 0.25)) this.endLatch(true);
    if (canControl && g.input.pressed('jump')) { this.endLatch(false); this.vel.y += 5; }
    if (res.grounded && L.t > 0.4 && this.vel.y < 0) { this.state = 'ground'; this.latch = null; this.anim.setMode('loco'); }
  }

  // ------------------------------------------------------------------ seats / scripted
  sit(seat) { // seat: { obj: Object3D (seat transform), exit: Vector3 }
    this.state = 'seated'; this.seat = seat; this.vel.set(0, 0, 0);
    this.anim.setMode(seat.pose || 'sit');
  }
  stand(exitPos) {
    this.state = 'ground'; this.anim.setMode('loco');
    if (exitPos) this.teleport(exitPos, this.yaw);
    this.seat = null;
  }
  updateSeated(dt) {
    const s = this.seat; if (!s) return;
    s.obj.updateMatrixWorld();
    const p = _v.setFromMatrixPosition(s.obj.matrixWorld);
    this.pos.copy(p);
    _q.setFromRotationMatrix(s.obj.matrixWorld);
    this.yaw = new THREE.Euler().setFromQuaternion(_q, 'YXZ').y;
    this.body.setNextKinematicTranslation({ x: p.x, y: p.y + CENTER + 0.5, z: p.z });
    this.anim.speed = 0;
  }
  setScripted(on) { this.state = on ? 'scripted' : 'ground'; if (!on) this.anim.setMode('loco'); }
  placeScripted(p, yaw) { this.pos.copy(p); if (yaw !== undefined) this.yaw = yaw; this.body.setNextKinematicTranslation({ x: p.x, y: p.y + CENTER, z: p.z }); this.body.setTranslation({ x: p.x, y: p.y + CENTER, z: p.z }, false); }

  // ------------------------------------------------------------------ damage
  damage(amount, from = null, kind = 'hit') {
    if (this.dead || this.invuln > 0 || this.game.godMode) return;
    const g = this.game;
    const diff = g.settings?.difficulty ?? 1;
    this.health -= amount * diff; this.regenDelay = 4;
    g.hud.damage(from, amount);
    g.audio.ui('hurt'); g.camera.shake(0.3);
    let dir = 0; if (from) { const d = from.clone().sub(this.pos); dir = Math.sign(Math.sin(Math.atan2(d.x, d.z) - this.yaw)); }
    this.anim.hit(dir);
    if (this.health <= 0) { this.health = 0; this.dead = true; g.onPlayerDeath?.(kind); }
  }
  revive() { this.dead = false; this.health = this.maxHealth; this.state = 'ground'; this.anim.setMode('loco'); this.invuln = 2; }
}
