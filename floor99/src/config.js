// Floor registry. `status` is honest: only floors marked 'playable' are built and shippable.
const b1 = (n) => () => import('./floors/batch01.js').then((m) => ({ default: m['FLOOR_' + n] }));
const b2 = (n) => () => import('./floors/batch02.js').then((m) => ({ default: m['FLOOR_' + n] }));
export const FLOORS = {
  1: { id: 1, name: 'WELCOME TO THE SHOW', status: 'playable', tagline: 'The most entertaining tutorial ever broadcast.', load: () => import('./floors/floor01.js'), next: 2, tier: 0, music: 'f1' },
  2: { id: 2, name: 'THE CLEANUP CREW', status: 'playable', tagline: 'Closed for cleaning. Reopened for violence.', load: b1(2), next: 3, tier: 0, music: 'f1' },
  3: { id: 3, name: 'THE LOCKER ROOM', status: 'playable', tagline: 'Every contestant gets a locker. Nobody gets it back.', load: b1(3), next: 4, tier: 0, music: 'f1' },
  4: { id: 4, name: 'THE FACTORY', status: 'playable', tagline: 'Assembly lines. Hydraulic presses. Molten metal. Overtime.', load: () => import('./floors/floor04.js'), next: 5, tier: 0, music: 'f4' },
  5: { id: 5, name: 'THE FLOOR IS LAVA', status: 'playable', tagline: 'A game-show classic. The lava is real.', load: b1(5), next: 6, tier: 0, music: 'f1' },
  6: { id: 6, name: 'NEON DISTRICT', status: 'playable', tagline: 'Sponsors, billboards, and a lot of very loud robots.', load: b1(6), next: 7, tier: 1, music: 'f4' },
  7: { id: 7, name: 'THE ARCHIVE', status: 'playable', tagline: 'Every contestant has a file. Every file says the same thing.', load: b1(7), next: 8, tier: 1, music: 'f12' },
  8: { id: 8, name: 'THE BOILER ROOM', status: 'playable', tagline: 'Everything that lights the show burns down here.', load: b2(8), next: 9, tier: 1, music: 'f4' },
  9: { id: 9, name: 'THE VENTS', status: 'playable', tagline: 'No cameras. No audience. No rules.', load: b2(9), next: 10, tier: 1, music: 'f12' },
  10: { id: 10, name: 'ACT ONE FINALE', status: 'playable', tagline: 'Halo\'s body double takes the stage.', load: b2(10), next: 11, tier: 1, music: 'f1' },
  11: { id: 11, name: 'SECURITY', status: 'playable', tagline: 'Every camera in the tower routes through here.', load: b2(11), next: 12, tier: 1, music: 'f4' },
  12: { id: 12, name: 'AQUARIUM APOCALYPSE', status: 'playable', tagline: 'Ten thousand tonnes of water and a very large mechanical fish.', load: () => import('./floors/floor12.js'), next: 13, tier: 1, music: 'f12' },
  13: { id: 13, name: 'THE MACHINE LEVEL', status: 'playable', tagline: 'Billions of viewers. All of them on these racks.', load: b2(13), next: null, tier: 2, music: 'f12' },
};

// Signature floors that are designed but NOT built yet (shown as "IN PRODUCTION").
export const PLANNED = {
  23: { name: 'MECH CITY', tagline: 'Pilot a giant combat mech through a miniature city. A rival mech enters.' },
  38: { name: "YOU'RE TINY", tagline: 'Shrunk to a few inches tall in an enormous kitchen.' },
  51: { name: 'ZERO GRAVITY', tagline: 'A simulated orbital station loses gravity — and then air.' },
  76: { name: 'THE MACHINE LABYRINTH', tagline: 'A constantly transforming mechanical maze.' },
  90: { name: 'FINAL BROADCAST', tagline: 'The truth behind the show. Halo becomes desperate.' },
  99: { name: 'THE TOWER ITSELF', tagline: 'The entire skyscraper becomes the boss.' },
};

export const PLAYABLE_ORDER = Object.keys(FLOORS).map(Number).sort((a, b) => a - b);

export const SHOP = [
  { id: 'mod_fastHands', type: 'mod', key: 'fastHands', name: 'FAST HANDS', price: 300, desc: 'Reloads 30% faster.' },
  { id: 'mod_airDash', type: 'mod', key: 'airDash', name: 'AIR DASH+', price: 450, desc: 'Two dodges in mid-air instead of one.' },
  { id: 'mod_lungs', type: 'mod', key: 'lungs', name: 'IRON LUNGS', price: 250, desc: 'Hold your breath far longer underwater.' },
  { id: 'mod_armor', type: 'mod', key: 'armor', name: 'THICK PLATING', price: 500, desc: '+25 max health.' },
  { id: 'mod_regen', type: 'mod', key: 'regen', name: 'NANO-STITCH', price: 400, desc: 'Health regenerates much faster out of combat.' },
  { id: 'mod_trigger', type: 'mod', key: 'trigger', name: 'HAIR TRIGGER', price: 350, desc: 'All guns fire 15% faster.' },
  { id: 'mod_glass', type: 'mod', key: 'glass', name: 'GLASS CANNON', price: 200, desc: '+50% damage dealt. +50% damage taken. The audience adores risk.' },
  { id: 'suit_4', type: 'cosmetic', slot: 'suit', idx: 4, name: 'GOLD RUSH SUIT', price: 150 },
  { id: 'suit_3', type: 'cosmetic', slot: 'suit', idx: 3, name: 'HOT PINK SUIT', price: 150 },
  { id: 'suit_7', type: 'cosmetic', slot: 'suit', idx: 7, name: 'ULTRAVIOLET SUIT', price: 200 },
  { id: 'suit_5', type: 'cosmetic', slot: 'suit', idx: 5, name: 'BLACKOUT SUIT', price: 250 },
  { id: 'armor_2', type: 'cosmetic', slot: 'armor', idx: 2, name: 'GILDED PLATING', price: 300 },
  { id: 'armor_4', type: 'cosmetic', slot: 'armor', idx: 4, name: 'CRIMSON PLATING', price: 200 },
  { id: 'visor_2', type: 'cosmetic', slot: 'visor', idx: 2, name: 'SUNBURST VISOR', price: 100 },
  { id: 'visor_3', type: 'cosmetic', slot: 'visor', idx: 3, name: 'TOXIC VISOR', price: 100 },
  { id: 'visor_4', type: 'cosmetic', slot: 'visor', idx: 4, name: 'ULTRA VISOR', price: 120 },
  { id: 'helmet_1', type: 'cosmetic', slot: 'helmet', idx: 1, name: 'CREST HELMET', price: 250 },
  { id: 'helmet_2', type: 'cosmetic', slot: 'helmet', idx: 2, name: 'ANTENNA HELMET', price: 250 },
  { id: 'helmet_3', type: 'cosmetic', slot: 'helmet', idx: 3, name: 'SLIT-EYE HELMET', price: 300 },
];

export const CHALLENGES = [
  { id: 'oneHit', name: 'ONE-HIT WONDER', desc: 'You die in one hit. You deal 50% more damage. Pure ratings.', stars: 3 },
  { id: 'lowGrav', name: 'LOW GRAVITY SEASON', desc: 'Permanent low gravity for everyone.', stars: 2 },
  { id: 'bigHeads', name: 'BIG HEAD MODE', desc: 'Robot heads are enormous. Headshots for everyone.', stars: 1 },
  { id: 'chaos', name: 'MAXIMUM CHAOS', desc: 'The audience votes twice as often.', stars: 4 },
  { id: 'turbo', name: 'TURBO BROADCAST', desc: 'The whole show runs 20% faster.', stars: 5 },
];
