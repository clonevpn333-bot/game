// Weather: drifts naturally by season; god tools can force states. Effects are read
// by traffic (speed/grip/braking), citizens (outdoor plans), power (heat demand),
// incidents (accident/fire rates) and rendering.
import { clamp, lerp } from '../core/math.js';
import { rand } from '../core/rng.js';

export const WEATHER = {
  clear: { cloud: 0.05, precip: 0, fog: 0, wind: 0.1, label: 'Clear' },
  cloudy: { cloud: 0.6, precip: 0, fog: 0.05, wind: 0.25, label: 'Overcast' },
  rain: { cloud: 0.85, precip: 0.6, fog: 0.15, wind: 0.35, label: 'Rain' },
  storm: { cloud: 1, precip: 1, fog: 0.2, wind: 0.8, label: 'Thunderstorm', lightning: true },
  fog: { cloud: 0.5, precip: 0, fog: 1, wind: 0.05, label: 'Fog' },
  snow: { cloud: 0.85, precip: 0.5, fog: 0.25, wind: 0.3, label: 'Snow', snow: true },
  blizzard: { cloud: 1, precip: 1, fog: 0.7, wind: 1, label: 'Blizzard', snow: true },
  heatwave: { cloud: 0.0, precip: 0, fog: 0.1, wind: 0.05, label: 'Heat wave', heat: true },
};
const SEASON_TEMP = [14, 27, 12, -2];
const SEASON_ODDS = [
  { clear: 4, cloudy: 3, rain: 3, storm: 1, fog: 1 },
  { clear: 6, cloudy: 2, rain: 1, storm: 2, heatwave: 0.6 },
  { clear: 3, cloudy: 4, rain: 4, storm: 1, fog: 2 },
  { clear: 3, cloudy: 4, snow: 4, blizzard: 0.7, fog: 1 },
];

export class Weather {
  constructor(world) {
    this.world = world;
    this.kind = 'clear';
    this.cloud = 0.1; this.precip = 0; this.fog = 0; this.wind = 0.1; this.temp = 15;
    this.snowing = false; this.heat = false; this.flash = 0; this.snowCover = 0; this.wet = 0;
    this.nextChange = 0; this.forcedUntil = 0;
    this.lightningT = 3;
  }
  get label() { return WEATHER[this.kind].label; }

  set(kind, durationMin = 360, forced = true) {
    const W = this.world;
    if (!WEATHER[kind]) return;
    const prev = this.kind;
    this.kind = kind;
    this.nextChange = W.time + durationMin;
    if (forced) this.forcedUntil = W.time + durationMin;
    if (kind !== prev) W.emit('weather', { kind, prev });
    if (kind === 'blizzard' || kind === 'heatwave' || kind === 'storm') W.history.cityEvent(`${WEATHER[kind].label} hit the city`, { type: 'weather', minor: kind === 'storm' });
  }

  update(dtMin, dtPhys) {
    const W = this.world;
    if (W.time >= this.nextChange) {
      const odds = SEASON_ODDS[W.season];
      const k = rand.weighted(Object.keys(odds), (x) => odds[x]);
      this.set(k, 180 + rand.float() * 600, false);
    }
    const t = WEATHER[this.kind];
    const k = 1 - Math.exp(-dtMin / 40);
    this.cloud = lerp(this.cloud, t.cloud, k);
    this.precip = lerp(this.precip, t.precip, k);
    this.fog = lerp(this.fog, t.fog, k);
    this.wind = lerp(this.wind, t.wind, k);
    this.snowing = !!t.snow && this.precip > 0.1;
    this.heat = !!t.heat;
    const hour = W.minuteOfDay / 60;
    const diurnal = Math.sin(((hour - 9) / 24) * Math.PI * 2) * 4;
    const targetT = SEASON_TEMP[W.season] + diurnal + (t.heat ? 14 : 0) + (t.snow ? -6 : 0) - this.cloud * 2;
    this.temp = lerp(this.temp, targetT, 1 - Math.exp(-dtMin / 90));
    // ground state
    if (this.snowing) this.snowCover = clamp(this.snowCover + dtMin * 0.004 * this.precip, 0, 1);
    else this.snowCover = clamp(this.snowCover - dtMin * (this.temp > 2 ? 0.003 : 0.0004), 0, 1);
    if (this.precip > 0.1 && !this.snowing) this.wet = clamp(this.wet + dtMin * 0.02 * this.precip, 0, 1);
    else this.wet = clamp(this.wet - dtMin * (this.heat ? 0.01 : 0.004), 0, 1);
    // lightning
    this.flash = Math.max(0, this.flash - dtPhys * 4);
    if (t.lightning && this.precip > 0.6) {
      this.lightningT -= dtPhys;
      if (this.lightningT <= 0) {
        this.lightningT = 4 + rand.float() * 14;
        this.flash = 1;
        W.emit('thunder', { delay: 0.5 + rand.float() * 2.5 });
        if (rand.chance(0.05)) W.incidents && W.incidents.lightningStrike();
      }
    }
    // driving conditions
    const grip = this.snowCover > 0.3 ? 0.55 : this.wet > 0.4 ? 0.82 : 1;
    W.traffic.weatherFactor = clamp(1 - this.precip * 0.12 - this.fog * 0.15 - this.snowCover * 0.35, 0.45, 1);
    W.traffic.brakeFactor = grip;
    W.groundGrip = grip;
  }
}
