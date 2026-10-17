// Persistence. The city layout is regenerated from its seed; everything that
// changes (people, businesses, buildings, vehicles, history) is saved.
// Saves go to IndexedDB (gzip when available) with a localStorage fallback.
import { World } from './world.js';
import { newCitizen, EXTRA_KEYS } from './citizens.js';

const VERSION = 4;
const KEY = 'cityexe.save';

export function serialize(W) {
  const t0 = performance.now();
  const B = W.city.buildings.map((b) => [b.state, +b.damage.toFixed(3), +b.fire.toFixed(2), +(b.built || 0).toFixed(3), b.residents, b.bizId, b.name, b.vacantSince ?? null, b.emptyDays || 0, b.abDays || 0, b.ruinedAt ?? null, b.rebuilt || 0, b.anomaly || null]);
  const biz = W.economy.biz.map((z) => ({ ...z, history: z.history.slice(-20) }));
  const jobs = W.economy.jobs;
  const cits = W.citizens.map((c) => {
    const rel = {};
    for (const id in c.rel) { const r = c.rel[id]; if (r.t !== 'acq' || Math.abs(r.a) > 0.3) rel[id] = [+r.a.toFixed(2), r.t]; }
    const logCap = c.bookmarked ? 200 : 14;
    const at = c.state === 'abstract' || c.trip ? (c.trip && c.trip.dest != null ? c.trip.dest : c.home) : c.at;
    return {
      i: c.id, f: c.first, l: c.last, a: c.age, bd: c.bday, lk: c.look, tr: c.traits, m: Math.round(c.money), h: c.home, u: c.unit, j: c.job, cr: c.career.slice(-8), v: c.vehicle, ob: c.ownedBiz,
      x: Object.fromEntries(EXTRA_KEYS.filter((k) => c[k] != null).map((k) => [k, c[k]])),
      r: rel, n: c.needs, hp: c.health, inj: c.injured, st: c.status, rec: c.record, ra: c.releaseAt, lg: c.log.slice(-logCap), at, act: c.activity, hl: c.homeless,
      bk: c.bookmarked ? 1 : 0, lc: c.lateCount, sl: c.sleepH, wk: c.wakeH, fl: { ageless: c.flags.ageless, anomalyNote: c.flags.anomalyNote, aware: c.flags.aware, dup: c.flags.dup }, mv: c.moves, dd: c.diedDay, dc: c.deathCause, ld: c.leftDay, hap: c.happiness, sx: c.stress,
    };
  });
  const veh = W.traffic.vehicles.filter((v) => !v.fleet).map((v) => ({
    i: v.id, t: v.type, c: v.color, o: v.owner, s: v.state === 'parked' ? 'p' : v.state === 'garage' ? 'g' : v.state === 'repair' ? 'r' : 'x', sl: v.slot, g: v.garage, d: +v.damage.toFixed(2), pl: v.plate, od: Math.round(v.odometer), ru: v.repairUntil, st: v.stolen ? 1 : 0, x: Math.round(v.x), z: Math.round(v.z),
  }));
  const data = {
    v: VERSION, seed: W.seed, time: W.time, savedAt: Date.now(), exe: W.exeMode, pop: W.targetPop,
    weather: { kind: W.weather.kind, next: W.weather.nextChange, temp: W.weather.temp, snow: W.weather.snowCover },
    power: Object.fromEntries(Object.entries(W.power.zones).map(([k, z]) => [k, { on: z.on, cause: z.cause, since: z.since, repair: z.repair, need: z.repairNeed }])),
    econ: { mult: W.economy.multiplier, trend: W.economy.trend, until: W.economy.trendUntil || 0, treasury: W.economy.treasury },
    B, biz, jobs, cits, veh,
    hist: { events: W.history.events, records: W.history.records, landmarks: W.history.landmarks, counters: W.history.counters },
    evo: W.evolution.projects.map((p) => ({ ...p, crew: null })),
    trees: Array.from(W.disasters.downTrees),
    anom: W.anomalies ? W.anomalies.serialize() : null,
    lanes: W.city.net.lanes.filter((l) => l.closed).map((l) => l.id),
    lotto: W.lottery ? W.lottery.serialize() : null,
    life: W.life ? W.life.serialize() : null,
    combat: W.combat ? W.combat.serialize() : null,
    heists: W.heists ? W.heists.serialize() : null,
    dark: W.dark ? W.dark.serialize() : null,
    tasks: W.tasks ? W.tasks.serialize() : null,
    street: W.street ? W.street.serialize() : null,
    cases: W.investigations ? W.investigations.serialize() : null,
    crime: W.crime ? { setup: W.crime.setup, mission: W.crime.mission } : null,
  };
  data.ms = Math.round(performance.now() - t0);
  return data;
}

export function deserialize(data, opts = {}) {
  const W = new World(data.seed, { time: data.time });
  W.exeMode = !!data.exe;
  W.targetPop = data.pop || W.targetPop;
  const city = W.city;
  // a save from a different city layout can't be mapped onto this one
  if (!data.B || data.B.length !== city.buildings.length) throw new Error('incompatible save');
  // buildings
  data.B.forEach((r, i) => {
    const b = city.buildings[i];
    if (!b) return;
    [b.state, b.damage, b.fire, b.built, b.residents, b.bizId, b.name, b.vacantSince, b.emptyDays, b.abDays, b.ruinedAt, b.rebuilt, b.anomaly] = r;
    b.name = b.name || '';
    b.vacantSince = b.vacantSince ?? undefined;
    b.ruinedAt = b.ruinedAt ?? undefined;
    b.occupants = new Set();
  });
  // economy
  W.economy.biz = data.biz;
  W.economy.jobs = data.jobs;
  W.economy.multiplier = data.econ.mult; W.economy.trend = data.econ.trend; W.economy.trendUntil = data.econ.until; W.economy.treasury = data.econ.treasury;
  for (const z of W.economy.biz) z.orderPending = false;
  // citizens
  W.citizens = data.cits.map((s) => {
    const c = newCitizen({ pick: (a) => a[0], range: (a) => a, int: (a) => a, chance: () => false, gauss: (m) => m, float: () => 0.5 }, { id: s.i, first: s.f, last: s.l, age: s.a });
    Object.assign(c, {
      bday: s.bd, look: s.lk, traits: s.tr, money: s.m, home: s.h, unit: s.u, job: s.j, career: s.cr || [], vehicle: s.v, ownedBiz: s.ob,
      needs: s.n, health: s.hp, injured: s.inj, status: s.st, record: s.rec, releaseAt: s.ra, log: s.lg || [], activity: s.act || 'home', homeless: !!s.hl,
      bookmarked: !!s.bk, lateCount: s.lc || 0, sleepH: s.sl, wakeH: s.wk, flags: { ...(s.fl || {}) }, moves: s.mv || 0, diedDay: s.dd, deathCause: s.dc, leftDay: s.ld, happiness: s.hap ?? 0.6, stress: s.sx || 0,
    });
    if (s.x) Object.assign(c, s.x);
    c.rel = {};
    for (const id in s.r) c.rel[id] = { a: s.r[id][0], t: s.r[id][1] };
    c.state = 'inside'; c.at = null; c.lastNeedT = W.time; c.nextThink = W.time + Math.random() * 20; c.until = 0;
    c._at = s.at;
    return c;
  });
  // vehicles
  for (const s of data.veh) {
    const v = W.traffic.add(s.t, { id: s.i, color: s.c, owner: s.o, damage: s.d, plate: s.pl });
    v.odometer = s.od || 0;
    if (s.o != null && W.citizens[s.o]) v.ownerName = W.citizens[s.o].name;
    if (s.s === 'p' && s.sl != null && city.net.slots[s.sl] && city.net.slots[s.sl].car == null) W.traffic.parkAtSlot(v, s.sl);
    else if (s.s === 'r') { W.traffic.parkInGarage(v, s.g ?? (city.special.towyard || [0])[0]); v.state = 'repair'; v.repairUntil = s.ru || W.time; }
    else if (s.s === 'g' && s.g != null) W.traffic.parkInGarage(v, s.g);
    else {
      const sl = W.traffic.findSlotNear(s.x, s.z, [], 300);
      if (sl) W.traffic.parkAtSlot(v, sl.id); else W.traffic.parkInGarage(v, W.citizenAI.nearestGarage(s.x, s.z));
    }
    if (s.st) v.stolen = { by: null, t: W.time };
  }
  // place people
  for (const c of W.citizens) {
    if (c.status === 'dead' || c.status === 'left') continue;
    let at = c._at;
    if (at == null || !city.buildings[at] || city.buildings[at].state === 'ruin') at = c.home;
    if (at == null || !city.buildings[at]) at = (city.special.metro || [0])[0];
    W.citizenAI.placeInside(c, at);
    c.working = !!(c.job && W.economy.biz[c.job.biz] && W.economy.biz[c.job.biz].b === at && W.citizenAI.inShift(c, W.minuteOfDay, 0));
    delete c._at;
  }
  W.services.init();
  W.transit.init();
  W.helis.init();
  for (const c of W.citizens) if (c.working && c.job) W.services.onArriveWork(c);
  // world state
  W.weather.set(data.weather.kind, Math.max(30, data.weather.next - W.time), false);
  W.weather.temp = data.weather.temp; W.weather.snowCover = data.weather.snow || 0;
  for (const k in data.power) { const z = W.power.zones[k]; const s = data.power[k]; Object.assign(z, { on: s.on, cause: s.cause, since: s.since, repair: s.repair, repairNeed: s.need || 120 }); }
  W.power.apply();
  W.history.events = data.hist.events || [];
  W.history.records = data.hist.records || W.history.records;
  W.history.landmarks = data.hist.landmarks || [];
  W.history.counters = { ...W.history.counters, ...(data.hist.counters || {}) };
  W.evolution.projects = data.evo || [];
  W.disasters.downTrees = new Set(data.trees || []);
  W.disasters.treesDirty = W.disasters.downTrees.size > 0;
  for (const id of data.lanes || []) { const l = W.city.net.links[id]; if (l) l.closed = true; }
  if (data.anom && W.anomalies) W.anomalies.deserialize(data.anom);
  if (data.lotto && W.lottery) W.lottery.deserialize(data.lotto);
  if (data.life && W.life) W.life.deserialize(data.life);
  if (data.combat && W.combat) W.combat.deserialize(data.combat);
  if (data.heists && W.heists) W.heists.deserialize(data.heists);
  if (data.dark && W.dark) W.dark.deserialize(data.dark);
  if (data.tasks && W.tasks) W.tasks.deserialize(data.tasks);
  if (data.street && W.street) W.street.deserialize(data.street);
  if (data.cases && W.investigations) W.investigations.deserialize(data.cases);
  if (data.crime && W.crime) { W.crime.setup = !!data.crime.setup; W.crime.mission = data.crime.mission; }
  W.lastHour = Math.floor(W.time / 60);
  W.lastDay = W.day;
  for (const b of city.buildings) if (b.fire > 0) b.fire = Math.min(b.fire, 0.2);
  return W;
}

// ---------------------------------------------------------------- storage
function idb() {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) { rej(new Error('no idb')); return; }
    const r = indexedDB.open('cityexe', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('saves');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function gzip(str) {
  if (!window.CompressionStream) return null;
  const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  return await new Response(cs).blob();
}
async function gunzip(blob) {
  const ds = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(ds).text();
}

export async function saveWorld(W) {
  const data = serialize(W);
  const json = JSON.stringify(data);
  try {
    const db = await idb();
    const z = await gzip(json);
    await new Promise((res, rej) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put(z ? { z: true, blob: z } : { z: false, json }, KEY);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    try { localStorage.setItem(KEY + '.meta', JSON.stringify({ savedAt: data.savedAt, time: data.time, seed: data.seed })); } catch (e) { /* ignore */ }
    return { bytes: z ? z.size : json.length, ms: data.ms };
  } catch (e) {
    try { localStorage.setItem(KEY, json); return { bytes: json.length, ms: data.ms, fallback: true }; } catch (e2) { console.warn('save failed', e2); return null; }
  }
}

export async function loadSave() {
  try {
    const db = await idb();
    const rec = await new Promise((res, rej) => { const tx = db.transaction('saves', 'readonly'); const r = tx.objectStore('saves').get(KEY); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    if (rec) { const json = rec.z ? await gunzip(rec.blob) : rec.json; const d = JSON.parse(json); if (d.v === VERSION) return d; }
  } catch (e) { /* fall through */ }
  try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d.v === VERSION) return d; } } catch (e) { /* ignore */ }
  return null;
}

export async function clearSave() {
  try { const db = await idb(); await new Promise((res) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').delete(KEY); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { /* ignore */ }
  try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '.meta'); } catch (e) { /* ignore */ }
}
