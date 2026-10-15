// Electricity grid: a power station feeds four zones through substations.
// Outages ripple into traffic lights, businesses, homes, streetlights, hospitals
// (backup generators), citizen behavior and crime opportunity.
import { POWER_ZONES, zoneOfDistrict } from './cityGen.js';
import { C, districtCode } from './config.js';
import { rand } from '../core/rng.js';
import { clamp } from '../core/math.js';

export class Power {
  constructor(world) {
    this.world = world;
    this.zones = {};
    for (const k in POWER_ZONES) this.zones[k] = { id: k, name: POWER_ZONES[k].name, on: true, cause: '', since: 0, repair: 0, needsCrew: false, crew: null, load: 0.6 };
    this.key = 'init';
    this.anyBlackout = false;
    this.capacity = 1.0;
    this.overloadT = 0;
  }

  zoneAt(x, z) {
    const bx = Math.floor(x / C.BLOCK + C.NB / 2), bz = Math.floor(z / C.BLOCK + C.NB / 2);
    const d = districtCode(clamp(bx, 0, C.NB - 1), clamp(bz, 0, C.NB - 1));
    return zoneOfDistrict(d);
  }
  isPoweredAt(x, z) { return this.zones[this.zoneAt(x, z)].on; }

  cut(zoneId, cause, opts = {}) {
    const W = this.world;
    const z = this.zones[zoneId];
    if (!z || !z.on) return;
    z.on = false; z.cause = cause; z.since = W.time; z.repair = 0;
    z.repairNeed = opts.repairNeed ?? (60 + rand.float() * 120); // crew-minutes
    z.needsCrew = true;
    W.history.counters.blackouts++;
    W.history.cityEvent(`Blackout in the ${z.name} (${cause})`, { type: 'blackout', zone: zoneId, x: this.subPos(zoneId).x, z: this.subPos(zoneId).z });
    W.incidents && W.incidents.create('power', { ...this.subPos(zoneId), zone: zoneId, building: W.city.substations[zoneId], title: `Power outage — ${z.name}` });
    this.apply();
  }

  restore(zoneId) {
    const W = this.world;
    const z = this.zones[zoneId];
    if (z.on) return;
    const mins = Math.round(W.time - z.since);
    z.on = true; z.cause = ''; z.needsCrew = false;
    W.history.cityEvent(`Power restored to the ${z.name} after ${Math.floor(mins / 60)}h ${mins % 60}m`, { type: 'power', zone: zoneId, minor: true });
    W.history.record('longestBlackout', mins, `Longest blackout: ${Math.floor(mins / 60)}h in the ${z.name}`);
    this.apply();
  }

  subPos(zoneId) {
    const W = this.world;
    const b = W.city.buildings[W.city.substations[zoneId]];
    return b ? { x: b.x, z: b.z } : { x: 0, z: 0 };
  }

  apply() {
    const W = this.world;
    this.anyBlackout = Object.values(this.zones).some((z) => !z.on);
    for (const b of W.city.buildings) {
      const on = this.zones[b.zone].on;
      b.powered = on || b.civic === 'hospital' || b.civic === 'police' || b.civic === 'fire';
      b.backup = !on && b.powered;
    }
    for (const n of W.city.net.nodes) {
      if (n.kind !== 'grid') { n.powered = true; continue; }
      n.powered = this.isPoweredAt(n.x + 1, n.z + 1) && this.isPoweredAt(n.x - 1, n.z - 1);
    }
    this.key = Object.values(this.zones).map((z) => (z.on ? 1 : 0)).join('');
    W.emit('power', { key: this.key });
  }

  // crew working on a zone (called by services each physical second on scene)
  work(zoneId, crewMinutes) {
    const z = this.zones[zoneId];
    if (!z || z.on) return true;
    z.repair += crewMinutes;
    if (z.repair >= z.repairNeed) { this.restore(zoneId); return true; }
    return false;
  }

  update(dtMin) {
    const W = this.world;
    // demand: evening peak, heat waves push air conditioning
    const h = W.minuteOfDay / 60;
    const base = 0.55 + 0.2 * Math.exp(-((h - 19) ** 2) / 8) + 0.12 * Math.exp(-((h - 9) ** 2) / 6);
    const heat = W.weather.heat ? 0.32 : W.weather.temp > 28 ? 0.12 : W.weather.temp < -3 ? 0.08 : 0;
    const plant = W.city.buildings[(W.city.special.powerplant || [])[0]];
    this.capacity = plant && plant.state !== 'ok' ? 0.55 : plant && plant.fire > 0.2 ? 0.75 : 1.0;
    const demand = base + heat;
    this.demand = demand;
    if (demand > this.capacity) {
      this.overloadT += dtMin;
      if (this.overloadT > 45 && rand.chance(0.02 * dtMin)) {
        const on = Object.values(this.zones).filter((z) => z.on && z.id !== 'I');
        if (on.length) { this.cut(rand.pick(on).id, W.weather.heat ? 'grid overload during the heat wave' : 'grid overload', { repairNeed: 40 }); this.overloadT = 0; }
      }
    } else this.overloadT = Math.max(0, this.overloadT - dtMin);
    // slow self-recovery if nobody comes (crews do it much faster)
    for (const z of Object.values(this.zones)) if (!z.on) { z.repair += dtMin * 0.08; if (z.repair >= z.repairNeed) this.restore(z.id); }
    // random equipment failure (rare)
    if (rand.chance(dtMin * 0.00004 * (1 + W.weather.wind * 2))) {
      const z = rand.pick(Object.values(this.zones));
      if (z.on) this.cut(z.id, W.weather.wind > 0.6 ? 'storm damage' : 'transformer failure');
    }
  }
}
