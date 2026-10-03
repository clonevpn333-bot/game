import * as THREE from 'three';

// Visual + atmospheric definition of each era. Palettes are keyed by time of
// day (day / golden / night) and blended continuously by the sky system.
const c = (hex) => new THREE.Color(hex);

export const ERA_DEF = [
  {
    year: 1996,
    name: 'THE OLD CITY',
    accent: '#ffb347',
    accentColor: c('#ffb347'),
    edge: c('#ffaa44'),
    day: { zenith: c('#3f7fd6'), horizon: c('#bcd3e8'), sun: c('#fff1d6'), sunI: 3.1, amb: c('#8aa7c8'), ambI: 0.9, fog: c('#b9c8d6'), fogD: 0.0016 },
    golden: { zenith: c('#3b5fa8'), horizon: c('#ffb27a'), sun: c('#ffb36b'), sunI: 2.6, amb: c('#8b7a9a'), ambI: 0.75, fog: c('#e8a77e'), fogD: 0.0018 },
    night: { zenith: c('#070b1c'), horizon: c('#26304f'), sun: c('#9fb4ff'), sunI: 0.25, amb: c('#2c3a62'), ambI: 0.35, fog: c('#1b2238'), fogD: 0.0022 },
    grade: { lift: [0.02, 0.012, 0.0], gamma: [1.0, 0.98, 0.94], gain: [1.05, 1.0, 0.92], sat: 1.12, contrast: 1.06, tint: [1.04, 1.0, 0.92], shadowTint: [0.92, 0.98, 1.06], vignette: 0.38, grain: 0.05, exposure: 1.0 },
    window: { litA: c('#ffb866'), litB: c('#ffe2a8'), litFrac: 0.55, grime: 0.35, broken: 0.0, over: 0.0, glass: c('#1c2630') },
    weather: { rain: 0.18, storm: 0.04 },
    streetLight: c('#ffab52'),
  },
  {
    year: 2047,
    name: 'THE MEGACITY',
    accent: '#3cf2ff',
    accentColor: c('#3cf2ff'),
    edge: c('#33e6ff'),
    day: { zenith: c('#3a78c9'), horizon: c('#c7d9ea'), sun: c('#fff8ee'), sunI: 2.8, amb: c('#94b3d6'), ambI: 0.95, fog: c('#a9bed2'), fogD: 0.0022 },
    golden: { zenith: c('#3a3f9e'), horizon: c('#ff7aa8'), sun: c('#ffa080'), sunI: 2.3, amb: c('#8a6aa8'), ambI: 0.8, fog: c('#c97aa0'), fogD: 0.0024 },
    night: { zenith: c('#05030f'), horizon: c('#2a1240'), sun: c('#b0a0ff'), sunI: 0.2, amb: c('#2b2050'), ambI: 0.4, fog: c('#2a1438'), fogD: 0.0028 },
    grade: { lift: [0.0, 0.01, 0.03], gamma: [0.98, 1.0, 1.04], gain: [1.02, 1.0, 1.06], sat: 1.22, contrast: 1.1, tint: [1.04, 0.96, 1.06], shadowTint: [0.86, 0.98, 1.14], vignette: 0.42, grain: 0.03, exposure: 1.0 },
    window: { litA: c('#cfe8ff'), litB: c('#ff6ad5'), litFrac: 0.75, grime: 0.08, broken: 0.0, over: 0.0, glass: c('#0e2a3a') },
    weather: { rain: 0.38, storm: 0.08 },
    streetLight: c('#9fe8ff'),
  },
  {
    year: 2189,
    name: 'THE DEAD FUTURE',
    accent: '#9dff6a',
    accentColor: c('#9dff6a'),
    edge: c('#8cff7a'),
    day: { zenith: c('#3d8fc4'), horizon: c('#d8e6c4'), sun: c('#fff0c8'), sunI: 3.0, amb: c('#8cb89a'), ambI: 0.95, fog: c('#b6cfae'), fogD: 0.0021 },
    golden: { zenith: c('#2f6a8e'), horizon: c('#ffc878'), sun: c('#ffc070'), sunI: 2.7, amb: c('#8e9a7a'), ambI: 0.8, fog: c('#e2be86'), fogD: 0.0024 },
    night: { zenith: c('#020812'), horizon: c('#0f2b33'), sun: c('#9fd8ff'), sunI: 0.3, amb: c('#17343a'), ambI: 0.42, fog: c('#0d2329'), fogD: 0.0026 },
    grade: { lift: [0.0, 0.015, 0.01], gamma: [1.0, 1.03, 1.0], gain: [1.02, 1.05, 0.97], sat: 1.18, contrast: 1.07, tint: [1.02, 1.04, 0.94], shadowTint: [0.9, 1.0, 1.08], vignette: 0.45, grain: 0.045, exposure: 1.02 },
    window: { litA: c('#5cffb0'), litB: c('#ffd27a'), litFrac: 0.0, grime: 0.6, broken: 0.75, over: 1.0, glass: c('#14201a') },
    weather: { rain: 0.22, storm: 0.06 },
    streetLight: c('#000000'),
  },
];

// Blend palette by sun elevation: returns day/golden/night weights
export function paletteWeights(sunElev) {
  // sunElev in radians: >0.35 day, ~0.05 golden, < -0.12 night
  const day = THREE.MathUtils.smoothstep(sunElev, 0.12, 0.45);
  const night = 1 - THREE.MathUtils.smoothstep(sunElev, -0.16, 0.02);
  const golden = Math.max(0, 1 - day - night);
  return { day, golden, night };
}

const _c = new THREE.Color();
export function blendPalette(era, w, key, out) {
  const d = ERA_DEF[era];
  out.setRGB(0, 0, 0);
  _c.copy(d.day[key]).multiplyScalar(w.day); out.add(_c);
  _c.copy(d.golden[key]).multiplyScalar(w.golden); out.add(_c);
  _c.copy(d.night[key]).multiplyScalar(w.night); out.add(_c);
  return out;
}
export function blendScalar(era, w, key) {
  const d = ERA_DEF[era];
  return d.day[key] * w.day + d.golden[key] * w.golden + d.night[key] * w.night;
}
