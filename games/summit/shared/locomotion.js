/* The one movement function. The server runs it authoritatively; every client
 * runs the exact same code to predict its own player. Pure: no globals, no
 * randomness, no rendering. Determinism here is what makes reconciliation work. */
import { PLAYER, STAMINA, PHASE, FLIGHT, WORLD } from './constants.js';
import { clamp } from './rng.js';

const UP = 0.0001;

/** Creates the mutable movement state carried by every player. */
export function newMoveState(x = 0, y = 0, z = 0) {
  return {
    x, y, z, vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    onGround: false, climbing: false, sliding: false, swimming: false,
    stamina: STAMINA.max, exhausted: false,
    chute: false, freefall: false,
    lastFallSpeed: 0, impact: 0,
    grabCooldown: 0, coyote: 0,
  };
}

/** Per-tick modifiers assembled by the caller from statuses, gear and helpers. */
export function newModifiers() {
  return { speed: 1, staminaMult: 1, grip: 1, mass: 0, boost: 0, rope: 0, chalk: 0, nearFire: false, downed: false, ghost: false };
}

function moveDir(input, yaw) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  // forward is -Z in view space; mv.y>0 means forward
  const fx = -s, fz = -c, rx = c, rz = -s;
  let dx = fx * input.mv.y + rx * input.mv.x;
  let dz = fz * input.mv.y + rz * input.mv.x;
  const m = Math.hypot(dx, dz);
  if (m > 1) { dx /= m; dz /= m; }
  return { dx, dz, mag: Math.min(1, m) };
}

/**
 * Advances one player by dt.
 * @param s   move state (mutated)
 * @param input {mv:{x,y}, yaw, pitch, jump, sprint, grab, dt}
 * @param world createWorld() result
 * @param mod  modifiers
 * @param phase current run phase
 */
export function step(s, input, world, mod, phase = PHASE.CLIMB) {
  const dt = clamp(input.dt, 0.001, 0.1);
  s.yaw = input.yaw; s.pitch = input.pitch;
  s.impact = 0;

  if (mod.ghost) return stepGhost(s, input, dt);
  if (phase === PHASE.DIVE) return stepDive(s, input, world, dt);

  const h = world.height(s.x, s.z);
  const n = world.normal(s.x, s.z);
  const steep = n.y < PLAYER.maxSlopeWalk;
  const { dx, dz, mag } = moveDir(input, s.yaw);

  s.swimming = s.y < WORLD.seaLevel + 0.4 && h < WORLD.seaLevel;
  s.onGround = s.y <= h + 0.08;
  if (s.onGround) s.coyote = 0.16; else s.coyote = Math.max(0, s.coyote - dt);

  const canClimb = steep && !mod.downed && s.stamina > 0.5;
  const wantsClimb = input.grab && canClimb && (s.onGround || s.climbing);
  s.climbing = wantsClimb;
  s.sliding = steep && !s.climbing && s.onGround;

  /* ---------- stamina ---------- */
  const drainMult = mod.staminaMult * (1 + Math.max(0, mod.mass - 6) * PLAYER.carryMassPenalty) * (1 - mod.rope * 0.62) * (1 - mod.chalk * 0.28);
  if (s.climbing) {
    const effort = mag > 0.05 ? STAMINA.climbDrain : STAMINA.hangDrain;
    s.stamina -= effort * drainMult * dt;
  } else if (s.onGround && !s.sliding) {
    const sprinting = input.sprint && mag > 0.1 && !mod.downed;
    if (sprinting) s.stamina -= STAMINA.sprintDrain * drainMult * dt;
    else s.stamina += (mod.nearFire ? STAMINA.regenFire : STAMINA.regenGround) * dt;
  } else if (s.swimming) {
    s.stamina -= STAMINA.hangDrain * 1.4 * dt;
  }
  s.stamina = clamp(s.stamina, 0, STAMINA.max);
  s.exhausted = s.stamina <= 0.5;

  /* ---------- horizontal intent ---------- */
  let speed;
  if (mod.downed) speed = 1.15;
  else if (s.swimming) speed = 2.6;
  else speed = (input.sprint && !s.exhausted ? PLAYER.sprintSpeed : PLAYER.walkSpeed);
  speed *= mod.speed * (s.exhausted ? STAMINA.exhaustPenalty : 1);
  if (s.climbing) speed = PLAYER.climbSpeed * mod.grip * (s.exhausted ? 0.4 : 1) * mod.speed;

  if (s.climbing) {
    // Glue to the face: move across it, height follows the surface.
    s.vx = dx * speed; s.vz = dz * speed; s.vy = 0;
    s.x += s.vx * dt; s.z += s.vz * dt;
    const nh = world.height(s.x, s.z);
    s.y = nh;
    if (mod.boost > 0) { s.y += mod.boost * dt; }
    if (input.jump && s.stamina > STAMINA.jumpCost) {
      // mantle: short hop up the face
      s.stamina -= STAMINA.jumpCost;
      const up = 1.15;
      s.x -= n.x * up * 0.9; s.z -= n.z * up * 0.9;
      s.y = world.height(s.x, s.z);
    }
  } else if (s.swimming) {
    s.vx += (dx * speed - s.vx) * Math.min(1, dt * 5);
    s.vz += (dz * speed - s.vz) * Math.min(1, dt * 5);
    s.vy += ((input.jump ? 2.2 : -0.4) - s.vy) * Math.min(1, dt * 4);
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (s.y > WORLD.seaLevel) { s.y = WORLD.seaLevel; s.vy = Math.min(0, s.vy); }
    const bed = world.height(s.x, s.z);
    if (s.y < bed) { s.y = bed; s.vy = 0; s.onGround = true; }   // stand on the seabed
  } else {
    const accel = s.onGround ? 15 : 3.4;
    s.vx += (dx * speed * mag - s.vx) * Math.min(1, dt * accel);
    s.vz += (dz * speed * mag - s.vz) * Math.min(1, dt * accel);
    if (s.sliding) { // shed down the fall line
      const slideK = (1 - n.y) * 26;
      s.vx += n.x * slideK * dt; s.vz += n.z * slideK * dt;
    }
    if (input.jump && (s.onGround || s.coyote > 0) && !mod.downed && s.stamina > STAMINA.jumpCost && !s.sliding) {
      s.vy = PLAYER.jump; s.stamina -= STAMINA.jumpCost; s.onGround = false; s.coyote = 0;
    }
    if (mod.boost > 0 && s.onGround) { s.vy = Math.max(s.vy, mod.boost); }
    s.vy -= PLAYER.gravity * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;

    const gh = world.height(s.x, s.z);
    if (s.y <= gh) {
      if (s.vy < -UP) { s.lastFallSpeed = -s.vy; s.impact = -s.vy; }
      s.y = gh; s.vy = 0; s.onGround = true;
      // a hard landing scrubs momentum; a normal step does not
      if (s.impact > 12) { s.vx *= 0.45; s.vz *= 0.45; }
    } else s.onGround = false;
  }

  keepInBounds(s);
  return s;
}

function keepInBounds(s, lim = WORLD.beachRadius + 190) {
  const r = Math.hypot(s.x, s.z);
  if (r > lim) { const k = lim / r; s.x *= k; s.z *= k; s.vx *= 0.2; s.vz *= 0.2; }
}

function stepGhost(s, input, dt) {
  const { dx, dz, mag } = moveDir(input, s.yaw);
  const sp = input.sprint ? 44 : 17;
  const climb = (input.jump ? 1 : 0) - (input.grab ? 1 : 0);
  s.vx += (dx * sp * mag - s.vx) * Math.min(1, dt * 4);
  s.vz += (dz * sp * mag - s.vz) * Math.min(1, dt * 4);
  s.vy += (climb * sp * 0.7 - s.vy) * Math.min(1, dt * 4);
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  s.onGround = false; s.climbing = false;
  keepInBounds(s);
  return s;
}

/** Freefall and parachute — used between the plane and the beach. */
function stepDive(s, input, world, dt) {
  const { dx, dz, mag } = moveDir(input, s.yaw);
  s.diveT = (s.diveT || 0) + dt;
  s.freefall = !s.chute;
  if (input.jump && s.diveT > 0.8) s.chute = true;
  const h = world.height(s.x, s.z);
  if (s.y - h < FLIGHT.chuteAlt) s.chute = true;

  if (s.chute) {
    s.vy += (-FLIGHT.chuteFall - s.vy) * Math.min(1, dt * 1.7);
    const glide = FLIGHT.chuteGlide;
    if (mag > 0.05) {
      s.vx += (dx * glide - s.vx) * Math.min(1, dt * 1.5);
      s.vz += (dz * glide - s.vz) * Math.min(1, dt * 1.5);
    } else { const k = 1 - Math.min(1, dt * 0.35); s.vx *= k; s.vz *= k; }
  } else {
    s.vy -= PLAYER.gravity * dt;
    s.vy = Math.max(s.vy, -FLIGHT.terminal);
    const drift = 30;
    // momentum out of the plane door carries you; steering bends it, letting go does not kill it
    if (mag > 0.05) {
      s.vx += (dx * drift - s.vx) * Math.min(1, dt * 0.9);
      s.vz += (dz * drift - s.vz) * Math.min(1, dt * 0.9);
    } else { const k = 1 - Math.min(1, dt * 0.05); s.vx *= k; s.vz *= k; }
  }
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  if (s.y <= h) {
    s.y = h; s.impact = s.chute ? 0 : -s.vy;
    s.vy = 0; s.onGround = true; s.chute = false; s.freefall = false; s.diveT = 0;
  }
  keepInBounds(s, WORLD.beachRadius * 2.8);   // the drop happens well out over the water
  return s;
}
