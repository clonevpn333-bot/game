// Hand-authored landmark chunks. Each landmark generator builds all three
// eras of its chunk, consulting the chronicle for cause-and-effect variants.
import { lotsForChunk, district } from './layout.js';
import { emitLot, emitLotFar } from './buildings.js';

const GENERATORS = {};
const FAR = {};

export function registerLandmark(id, gen, far) {
  GENERATORS[id] = gen;
  if (far) FAR[id] = far;
}

export function buildLandmark(id, ctx, c, era) {
  const gen = GENERATORS[id];
  if (gen) { gen(ctx, c, era); return; }
  // fallback: generic lots
  const flat = district(c.ci, c.cj) !== 'W';
  for (const lot of lotsForChunk(c.ci, c.cj)) {
    lot.flat = flat;
    emitLot(ctx, lot, era);
  }
}

export function landmarkFar(id, gb, ci, cj, era, facts) {
  const f = FAR[id];
  if (f) { f(gb, ci, cj, era, facts); return; }
  const flat = district(ci, cj) !== 'W';
  for (const lot of lotsForChunk(ci, cj)) {
    lot.flat = flat;
    emitLotFar(gb, lot, era, facts);
  }
}
