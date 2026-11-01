// GETAWAY! — the 30-mission campaign. `impl` points at a playable script; others are listed as in development.
import { M01 } from './m01.js';
import { M02 } from './m02.js';
import { M03 } from './m03.js';
import { M04 } from './m04.js';

export const ACTS = ['ACT I — THE CITY GOES LOUD', 'ACT II — NO ROAD HOME', 'ACT III — ITALIAN TROUBLE', 'ACT IV — INTERNATIONAL MAYHEM', 'ACT V — EVERYONE WANTS YOU'];
const L = (num, act, title, desc, music) => ({ id: 'm' + String(num).padStart(2, '0'), num, act, title, desc, music });
export const CAMPAIGN = [
  { ...L(1, 0, 'WRONG CAR', 'A simple vehicle pickup becomes a high-speed pursuit through downtown.', 'wrongcar'), impl: M01 },
  { ...L(2, 0, 'BANKROLL', 'Walk into First Meridian, crack the vault, and escape out the back as SWAT storms the front.', 'bankroll'), impl: M02 },
  { ...L(3, 0, 'SHOPPING SPREE', 'Lift a Halcyon key from the Galleria, fight through a lockdown, steal the grand-prize car and drive it into the sea.', 'mall'), impl: M03 },
  { ...L(4, 0, 'ARMORED DELIVERY', 'Tail an armored convoy in the rain, fend off a rival crew, leap onto the moving truck and drive it through a roadblock and the river tunnel.', 'armored'), impl: M04 },
  L(5, 0, 'THE SKYLINE JOB', 'A half-built high-rise becomes an action playground — and then it comes down.', 'skyline'),
  L(6, 0, 'FIVE-STAR CITY', 'An all-out citywide pursuit ending in the harbor.', 'fivestar'),
  L(7, 1, 'BRIDGE RUN', 'A damaged bridge, emergency machinery, and pursuers closing in.', 'fivestar'),
  L(8, 1, 'FLOOD WARNING', 'A flood-control facility floods while you try to escape it.', 'armored'),
  L(9, 1, 'DESERT THUNDER', 'Armored trucks, motorcycles and dust storms on the desert highway.', 'desert'),
  L(10, 1, 'THE FREIGHT TRAIN', 'Fight across a moving freight train before the tunnel complex.', 'desert'),
  L(11, 1, 'AIRPORT CHAOS', 'Service roads, hangars, taxiways and moving aircraft.', 'fivestar'),
  L(12, 1, 'NO PASSPORT', 'Steal an aircraft and fly through a storm to Italy.', 'skyline'),
  L(13, 2, 'CIAO, TROUBLE', 'Markets, alleys and steep streets the moment you land.', 'italia'),
  L(14, 2, 'THE ROMAN JOB', 'Infiltration, rooftop escape, motorbike chase.', 'italia'),
  L(15, 2, 'ROOFTOP EXPRESS', 'Deliver sensitive cargo through a historic district.', 'italia'),
  L(16, 2, 'TWO MINUTES', 'A blocked mountain pass, demolition charges, and exactly two minutes.', 'twominutes'),
  L(17, 2, 'CANAL CHAOS', 'Speedboats, bridges and waterfront buildings.', 'italia'),
  L(18, 2, 'LAST FERRY OUT', 'Drive aboard a departing ferry and repel boarders.', 'armored'),
  L(19, 3, 'WHITEOUT', 'Alpine roads, avalanches, tunnels and cliffs.', 'whiteout'),
  L(20, 3, 'ALL IN', 'A coastal casino job turns into a full-scale escape.', 'bankroll'),
  L(21, 3, 'LIGHTS OUT', 'A citywide blackout — use the darkness.', 'fivestar'),
  L(22, 3, 'HELICOPTER PROBLEM', 'An on-foot chase becomes a helicopter hijacking.', 'skyline'),
  L(23, 3, 'GLASS HIGHWAY', 'An elevated interchange collapsing under you.', 'fivestar'),
  L(24, 3, 'THE LONG FLIGHT', 'A cargo-plane emergency and an unexpected landing.', 'whiteout'),
  L(25, 4, 'MOST WANTED', 'Back in Port Sol. They know your patterns now.', 'fivestar'),
  L(26, 4, 'TOTAL GRIDLOCK', 'A coordinated operation traps the crew downtown.', 'armored'),
  L(27, 4, 'THE EVIDENCE', 'Infiltrate Halcyon HQ. A betrayal. A building-wide emergency.', 'skyline'),
  L(28, 4, 'THE CARRIER', 'A gigantic cargo ship full of cranes and containers.', 'armored'),
  L(29, 4, 'ALL UNITS', 'Every faction converges. The ultimate pursuit.', 'fivestar'),
  L(30, 4, 'LAST EXIT', 'One final chance. Everything at once.', 'lastexit'),
];
export function isUnlocked(m, save) { if (!m.impl) return false; if (m.num === 1) return true; const prev = CAMPAIGN[m.num - 2]; return !!save.completed[prev.id] || !!save.completed[m.id]; }
export function nextMission(save) { return CAMPAIGN.find((m) => m.impl && !save.completed[m.id]) || CAMPAIGN[0]; }
