/* Hunger, body temperature, status effects and downed/death bookkeeping.
 * Authoritative on the server; clients run it only to smooth HUD readouts. */
import { SURVIVAL, STATUS, BIOMES, biomeIndexAt, STAMINA } from './constants.js';
import { clamp } from './rng.js';

export function newVitals() {
  return {
    hp: SURVIVAL.hpMax,
    hunger: SURVIVAL.hungerMax,
    temp: 50,
    status: {},          // id -> seconds remaining (0 = permanent until cured)
    downed: false, dead: false, ghost: false,
    downedHp: SURVIVAL.downedHp,
    reviving: null,
  };
}

export function addStatus(v, id, seconds) {
  const def = STATUS[id]; if (!def) return;
  const dur = seconds ?? def.dur;
  v.status[id] = dur === 0 ? 0 : Math.max(v.status[id] || 0, dur);
}
export const hasStatus = (v, id) => id in v.status;
export function cureStatus(v, id) { delete v.status[id]; }

/** Aggregates the movement modifiers a set of statuses implies. */
export function statusModifiers(v, out) {
  out.speed = 1; out.staminaMult = 1;
  for (const id of Object.keys(v.status)) {
    const d = STATUS[id];
    out.speed *= d.speed;
    out.staminaMult *= d.staminaMult;
  }
  if (v.downed) { out.speed *= 0.42; out.downed = true; }
  return out;
}

/**
 * One survival tick.
 * @returns array of event strings for the feed ('poisoned', 'downed', 'died'...)
 */
export function tickVitals(v, dt, ctx) {
  const events = [];
  if (v.dead) return events;

  const bi = biomeIndexAt(ctx.altitude);
  const biome = BIOMES[bi];

  /* hunger */
  const burn = SURVIVAL.hungerDrain + (ctx.climbing ? SURVIVAL.hungerClimbExtra : 0);
  v.hunger = clamp(v.hunger - burn * dt, 0, SURVIVAL.hungerMax);

  /* body temperature drifts toward what the band does to you */
  const target = 50 + biome.warmth * 42 + (ctx.nearFire ? 34 : 0) + (ctx.warmthBoost || 0);
  v.temp += (target - v.temp) * Math.min(1, dt * (SURVIVAL.tempDrift / 12));
  v.temp = clamp(v.temp, 0, SURVIVAL.tempMax);

  if (v.temp < 22 && !hasStatus(v, 'cold')) { addStatus(v, 'cold', 0); events.push('cold'); }
  if (v.temp > 30 && hasStatus(v, 'cold')) { cureStatus(v, 'cold'); events.push('warmed'); }
  if (v.temp > 88 && !hasStatus(v, 'burning')) { addStatus(v, 'burning'); events.push('burning'); }

  /* statuses tick down and bite */
  let dps = 0;
  for (const id of Object.keys(v.status)) {
    const def = STATUS[id];
    dps += def.dps;
    if (v.status[id] > 0) {
      v.status[id] -= dt;
      if (v.status[id] <= 0) { delete v.status[id]; events.push('cured:' + id); }
    }
  }
  if (v.hunger <= 0) dps += SURVIVAL.starveDamage;
  if (v.temp <= 6) dps += SURVIVAL.coldDamage;
  if (v.temp >= 97) dps += SURVIVAL.heatDamage;

  if (dps > 0) damage(v, dps * dt, events);

  /* downed players bleed out unless someone gets to them */
  if (v.downed) {
    if (v.reviving) {
      v.downedHp = Math.min(SURVIVAL.downedHp, v.downedHp + SURVIVAL.reviveRate * dt);
      if (v.downedHp >= SURVIVAL.downedHp) {
        v.downed = false; v.hp = Math.max(v.hp, 34); v.downedHp = SURVIVAL.downedHp;
        addStatus(v, 'injury', 0);
        events.push('revived');
      }
    } else {
      v.downedHp -= 1.55 * dt;
      if (v.downedHp <= 0) { v.dead = true; v.ghost = true; events.push('died'); }
    }
  }
  return events;
}

export function damage(v, amount, events = []) {
  if (v.dead) return events;
  if (v.downed) { v.downedHp -= amount * 1.6; if (v.downedHp <= 0) { v.dead = true; v.ghost = true; events.push('died'); } return events; }
  v.hp -= amount;
  if (v.hp <= 0) { v.hp = 0; v.downed = true; v.downedHp = SURVIVAL.downedHp; events.push('downed'); }
  return events;
}

/** Fall impact -> damage. Below fallSafe you just grunt. */
export function fallDamage(impactSpeed) {
  if (impactSpeed <= SURVIVAL.fallSafe) return 0;
  const over = impactSpeed - SURVIVAL.fallSafe;
  return over * SURVIVAL.fallScale;
}

/** Applies a consumable. Returns {ok, events} */
export function consume(v, item, roll) {
  const events = [];
  if (!item) return { ok: false, events };
  if (item.use === 'heal') {
    v.hp = Math.min(SURVIVAL.hpMax, v.hp + item.amount);
    (item.cures || []).forEach((c) => { if (hasStatus(v, c)) { cureStatus(v, c); events.push('cured:' + c); } });
    events.push('healed');
  } else if (item.use === 'cure') {
    (item.cures || []).forEach((c) => { if (hasStatus(v, c)) { cureStatus(v, c); events.push('cured:' + c); } });
    if (item.stamina) events.push('stamina:' + item.stamina);
    events.push('cured');
  } else if (item.use === 'eat') {
    v.hunger = Math.min(SURVIVAL.hungerMax, v.hunger + item.hunger);
    if (item.risk && roll < item.risk) { addStatus(v, item.riskStatus); events.push('bad:' + item.riskStatus); }
    else events.push('ate');
  } else if (item.use === 'warm') {
    v.temp = clamp(v.temp + item.warmth, 0, SURVIVAL.tempMax);
    if (hasStatus(v, 'cold') && v.temp > 30) { cureStatus(v, 'cold'); events.push('warmed'); }
    events.push('warm');
  } else return { ok: false, events };
  return { ok: true, events };
}

/** Campfire rest: full stamina, warmth, a little health. */
export function restAtFire(v, move, dt) {
  move.stamina = Math.min(STAMINA.max, move.stamina + STAMINA.regenFire * dt);
  v.hp = Math.min(SURVIVAL.hpMax, v.hp + 6 * dt);
  v.temp = clamp(v.temp + 12 * dt, 0, SURVIVAL.tempMax);
  if (hasStatus(v, 'cold') && v.temp > 30) cureStatus(v, 'cold');
}
