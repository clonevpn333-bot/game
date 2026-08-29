/* Item catalogue. Weight is real: it slows you and costs stamina to haul. */
export const ITEMS = {
  rope:      { name: 'Rope',           kg: 2.4, cat: 'gear', use: 'anchor',   desc: 'Anchor a line a teammate can climb without burning stamina.' },
  piton:     { name: 'Piton',          kg: 0.5, cat: 'gear', use: 'piton',    stack: 4, desc: 'Hammer into rock for a permanent rest point.' },
  spike:     { name: 'Ice Spike',      kg: 0.9, cat: 'gear', use: 'piton',    stack: 3, desc: 'Bites into snow and ice where pitons will not hold.' },
  chalk:     { name: 'Chalk Bag',      kg: 0.4, cat: 'gear', use: 'chalk',    desc: 'Dries the hands. Grip up, stamina drain down, for a while.' },
  grapple:   { name: 'Grappling Hook', kg: 3.1, cat: 'gear', use: 'grapple',  desc: 'Fire at a ledge and haul yourself up fast.' },
  zipline:   { name: 'Zipline Kit',    kg: 4.0, cat: 'gear', use: 'zipline',  desc: 'Two anchors, one wire. Move the whole team sideways in seconds.' },
  flare:     { name: 'Flare',          kg: 0.6, cat: 'gear', use: 'flare',    stack: 3, desc: 'Burns hot and bright. Marks a spot, warms a body.' },
  bugle:     { name: 'Bugle',          kg: 1.1, cat: 'gear', use: 'bugle',    desc: 'Heard across the whole mountain. Call the team back.' },

  medkit:    { name: 'Medkit',         kg: 1.8, cat: 'med', use: 'heal',   amount: 65, cures: ['injury'], desc: 'Sets bones, closes wounds.' },
  bandage:   { name: 'Bandage',        kg: 0.3, cat: 'med', use: 'heal',   amount: 22, stack: 5, desc: 'Stops the bleeding. Barely.' },
  antidote:  { name: 'Antidote',       kg: 0.4, cat: 'med', use: 'cure',   cures: ['poison', 'curse'], stack: 2, desc: 'Bitter. Works.' },
  coffee:    { name: 'Field Coffee',   kg: 0.5, cat: 'med', use: 'cure',   cures: ['drowsy'], stamina: 30, stack: 2, desc: 'Wakes you up and tops the tank.' },

  berry:     { name: 'Cliff Berries',  kg: 0.2, cat: 'food', use: 'eat', hunger: 18, stack: 6, desc: 'Sweet. Safe. Everyone finds these.' },
  mushroom:  { name: 'Pale Mushroom',  kg: 0.2, cat: 'food', use: 'eat', hunger: 34, risk: 0.45, riskStatus: 'poison', stack: 4, desc: 'Filling. Roughly half of them are poison.' },
  coconut:   { name: 'Coconut',        kg: 1.4, cat: 'food', use: 'eat', hunger: 46, stack: 2, desc: 'Heavy, but it is a proper meal.' },
  jerky:     { name: 'Dried Meat',     kg: 0.4, cat: 'food', use: 'eat', hunger: 40, stack: 4, desc: 'Salt and protein.' },
  nightcap:  { name: 'Nightcap Fungus',kg: 0.2, cat: 'food', use: 'eat', hunger: 26, risk: 0.8, riskStatus: 'drowsy', stack: 3, desc: 'You will regret this on a ledge.' },
  thermos:   { name: 'Thermos',        kg: 1.0, cat: 'food', use: 'warm', warmth: 34, stack: 2, desc: 'Hot enough to push the cold back.' },

  parachute: { name: 'Parachute',      kg: 5.0, cat: 'gear', use: null, desc: 'Standard issue. Already on your back.' },
};

export const PACKS = {
  none:  { name: 'No Pack',      slots: 4,  capacity: 9,  speed: 1.00 },
  small: { name: 'Daypack',      slots: 6,  capacity: 16, speed: 0.98 },
  large: { name: 'Expedition',   slots: 9,  capacity: 27, speed: 0.94 },
};

/** Loot table per biome index (see BIOMES order). */
export const LOOT = [
  ['berry', 'coconut', 'bandage', 'rope', 'flare', 'berry', 'chalk'],
  ['berry', 'mushroom', 'coconut', 'bandage', 'antidote', 'rope', 'piton', 'nightcap'],
  ['piton', 'rope', 'chalk', 'medkit', 'grapple', 'jerky', 'bandage', 'zipline'],
  ['spike', 'thermos', 'jerky', 'medkit', 'rope', 'flare', 'coffee', 'spike'],
  ['thermos', 'medkit', 'coffee', 'antidote', 'jerky', 'grapple', 'bugle'],
];

export const itemWeight = (id, n = 1) => (ITEMS[id]?.kg || 0) * n;
export const stackMax = (id) => ITEMS[id]?.stack || 1;

/** Total carried weight of an inventory array of {id,n}. */
export function inventoryWeight(inv) {
  let kg = 0;
  for (const s of inv) if (s && s.id) kg += itemWeight(s.id, s.n || 1);
  return kg;
}
