/* Tunables shared by server and client. One place to balance the game. */

export const TICK_HZ = 30;            // authoritative sim rate
export const SNAPSHOT_HZ = 15;        // state broadcast rate
export const MAX_PLAYERS = 4;
export const RECONNECT_GRACE_MS = 120000;

export const WORLD = {
  radius: 2600,       // mountain footprint radius (m)
  summit: 1400,       // peak altitude (m)
  seaLevel: 0,
  beachRadius: 2380,  // shoreline ring
};

/** Biome bands by altitude. `grip` scales climb speed, `warmth` shifts body temp. */
export const BIOMES = [
  { id: 'shore',   name: 'Shoreline',   from: -20,  to: 90,   grip: 1.00, warmth:  0.55, fog: 0.00016, tint: [0.62, 0.72, 0.68] },
  { id: 'jungle',  name: 'Deep Jungle', from: 90,   to: 340,  grip: 0.94, warmth:  0.42, fog: 0.00030, tint: [0.40, 0.60, 0.36] },
  { id: 'rock',    name: 'The Face',    from: 340,  to: 720,  grip: 1.06, warmth:  0.02, fog: 0.00016, tint: [0.54, 0.50, 0.47] },
  { id: 'alpine',  name: 'Alpine Snow', from: 720,  to: 1100, grip: 0.74, warmth: -0.62, fog: 0.00042, tint: [0.86, 0.90, 0.98] },
  { id: 'caldera', name: 'The Caldera', from: 1100, to: 2000, grip: 0.88, warmth:  0.95, fog: 0.00034, tint: [0.36, 0.24, 0.24] },
];
export const biomeAt = (y) => BIOMES.find((b) => y >= b.from && y < b.to) || BIOMES[BIOMES.length - 1];
export const biomeIndexAt = (y) => Math.max(0, BIOMES.findIndex((b) => y >= b.from && y < b.to));

export const PLAYER = {
  radius: 0.34,
  height: 1.78,
  eye: 1.62,
  walkSpeed: 4.3,
  sprintSpeed: 7.1,
  climbSpeed: 1.55,
  jump: 6.2,
  gravity: 21.5,
  maxSlopeWalk: 0.62,      // cos of max walkable slope (~52 deg)
  stepHeight: 0.55,
  carryMassPenalty: 0.055, // speed/stamina scale per kg over base
  reach: 1.9,
};

export const STAMINA = {
  max: 100,
  climbDrain: 8.4,      // per second climbing
  hangDrain: 2.9,       // per second holding still on a wall
  sprintDrain: 6.0,
  jumpCost: 5.5,
  regenGround: 17.0,
  regenFire: 34.0,
  exhaustPenalty: 0.55, // movement multiplier while empty
};

export const SURVIVAL = {
  hungerMax: 100,
  hungerDrain: 0.36,       // per second
  hungerClimbExtra: 0.42,
  starveDamage: 1.9,       // hp/s at zero hunger
  tempMax: 100,            // 50 = comfortable
  tempDrift: 3.1,          // per second toward biome target
  coldDamage: 1.5,
  heatDamage: 1.7,
  hpMax: 100,
  downedHp: 30,            // hp pool while downed
  reviveRate: 22,          // hp/s while a teammate revives
  fallSafe: 11.5,          // impact speed below which no damage
  fallScale: 5.4,
};

/** Status effects: dps is damage per second, mult scales stamina drain. */
export const STATUS = {
  injury:  { name: 'Injured',  dps: 0.0, staminaMult: 1.45, speed: 0.82, dur: 0,   color: '#ff7a6b' },
  poison:  { name: 'Poisoned', dps: 1.4, staminaMult: 1.15, speed: 0.94, dur: 45,  color: '#8ee06a' },
  drowsy:  { name: 'Drowsy',   dps: 0.0, staminaMult: 1.55, speed: 0.88, dur: 60,  color: '#b39bff' },
  cold:    { name: 'Freezing', dps: 1.5, staminaMult: 1.35, speed: 0.86, dur: 0,   color: '#7fd4ff' },
  burning: { name: 'Burning',  dps: 3.2, staminaMult: 1.20, speed: 1.06, dur: 8,   color: '#ff9d4a' },
  curse:   { name: 'Cursed',   dps: 0.6, staminaMult: 1.80, speed: 0.90, dur: 120, color: '#d46bff' },
};

export const PHASE = { LOBBY: 'lobby', FLIGHT: 'flight', DIVE: 'dive', CLIMB: 'climb', EXTRACT: 'extract', RESULTS: 'results' };

export const FLIGHT = { altitude: 1900, speed: 78, jumpWindow: 26, chuteAlt: 230, terminal: 85, chuteFall: 16, chuteGlide: 17 };

export const ROOM = { codeLen: 5, codeAlphabet: 'ACDEFGHJKLMNPQRTUVWXY3479' };

export const NET = {
  inputBuffer: 3,
  interpDelayMs: 110,
  maxExtrapolateMs: 220,
  heartbeatMs: 4000,
};
