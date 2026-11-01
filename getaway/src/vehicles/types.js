// GETAWAY! — vehicle roster: handling characteristics + procedural model parameters.
// Body stations: [t (0=rear..1=front), yBottom, yTop, halfWidthFactor]
// Cabin: t0/t1 base span, r0/r1 flat-roof span, belt & roof heights, belt/roof half width factors.
export const VEHICLES = {
  saetta: {
    name: 'Saetta GT', cls: 'Sports', engine: 'sports', mass: 1350, L: 4.45, W: 1.95, H: 1.28, top: 76, accel: 9.5, grip: 1.18, steer: 0.62, drift: 0.9, cgH: 0.45, brake: 15, drive: 'RWD', hp: 110, gears: 6,
    colors: [0xe8b923, 0xc0392b, 0x1e3a8a, 0xf2f2f2, 0x111111],
    body: [[0, 0.32, 0.78, 0.88], [0.06, 0.24, 0.86, 0.96], [0.25, 0.24, 0.93, 1], [0.5, 0.24, 0.86, 1], [0.75, 0.22, 0.74, 0.99], [0.93, 0.22, 0.64, 0.95], [1, 0.3, 0.55, 0.84]],
    cabin: { t0: 0.18, t1: 0.66, r0: 0.3, r1: 0.5, belt: 0.84, roof: 1.27, wb: 0.86, wr: 0.68 },
    wheels: { r: 0.34, w: 0.27, f: 0.79, b: 0.2, track: 0.84 }, spoiler: 'lip', grille: 'sport', lights: 'slim',
  },
  rostr: {
    name: 'ROSTR', cls: 'Hyper EV', engine: 'electric', mass: 1700, L: 4.65, W: 2.02, H: 1.22, top: 104, accel: 16, grip: 1.32, steer: 0.6, drift: 0.85, cgH: 0.38, brake: 19, drive: 'AWD', hp: 120, gears: 1, facet: true, thrusters: true, rostr: true,
    colors: [0xe8e4da, 0x121314, 0xb9bdc3, 0x7a1b1b, 0x1c2b4a],
    body: [[0, 0.36, 0.98, 0.95], [0.04, 0.3, 1.0, 1], [0.3, 0.26, 0.9, 1], [0.55, 0.25, 0.78, 1], [0.78, 0.24, 0.64, 0.99], [0.94, 0.25, 0.53, 0.95], [1, 0.3, 0.46, 0.86]],
    cabin: { t0: 0.24, t1: 0.9, r0: 0.4, r1: 0.52, belt: 0.74, roof: 1.15, wb: 0.9, wr: 0.66 },
    wheels: { r: 0.37, w: 0.31, f: 0.8, b: 0.2, track: 0.86 }, spoiler: 'bigwing', grille: 'ev', lights: 'bar',
  },
  rivolta: {
    name: 'Toro Rivolta', cls: 'Hyper', engine: 'super', mass: 1770, L: 4.95, W: 2.03, H: 1.16, top: 97, accel: 15, grip: 1.36, steer: 0.6, drift: 0.85, cgH: 0.38, brake: 19, drive: 'AWD', hp: 120, gears: 8, crease: 'rivolta',
    colors: [0x2aa7e6, 0xf2f2f2, 0x1a1a1a, 0xf6c200, 0x7bc043],
    body: [[0, 0.3, 0.98, 0.94], [0.08, 0.24, 1.0, 1], [0.3, 0.24, 0.94, 1], [0.55, 0.24, 0.88, 0.98], [0.8, 0.25, 0.8, 0.96], [0.95, 0.2, 0.6, 0.9], [1, 0.17, 0.53, 0.8]],
    cabin: { t0: 0.25, t1: 0.68, r0: 0.34, r1: 0.5, belt: 0.9, roof: 1.16, wb: 0.76, wr: 0.52 },
    wheels: { r: 0.355, w: 0.31, f: 0.7626, b: 0.201, track: 0.86 }, grille: 'ev', lights: 'slim',
  },
  strada: {
    name: 'Strada SV', cls: 'SUV', engine: 'muscle', mass: 2350, L: 4.946, W: 2.047, H: 1.82, top: 80, accel: 10, grip: 1.12, steer: 0.6, drift: 0.7, cgH: 0.72, brake: 15, drive: 'AWD', hp: 170, gears: 8, crease: 'strada',
    colors: [0x23333d, 0x8c3a2e, 0x111214, 0xe6e6e6, 0x3b4a3a],
    body: [[0, 0.42, 1.12, 0.96], [0.04, 0.42, 1.2, 1], [0.5, 0.42, 1.18, 1], [0.88, 0.42, 1.12, 1], [1, 0.45, 1.08, 0.96]],
    cabin: { t0: 0.03, t1: 0.73, r0: 0.07, r1: 0.56, belt: 1.33, roof: 1.83, wb: 0.86, wr: 0.72 },
    wheels: { r: 0.41, w: 0.31, f: 0.872, b: 0.1987, track: 0.86 }, grille: 'chrome', lights: 'slim',
  },
  super: {
    name: 'Vortice V12', cls: 'Super', engine: 'super', mass: 1450, L: 4.6, W: 2.02, H: 1.15, top: 92, accel: 12, grip: 1.3, steer: 0.58, drift: 0.85, cgH: 0.4, brake: 18, drive: 'AWD', hp: 110, gears: 7,
    colors: [0x2ecc71, 0xff6b00, 0x8e44ad, 0xecf0f1, 0x1a1a1a],
    body: [[0, 0.3, 0.84, 0.92], [0.08, 0.22, 0.9, 1], [0.3, 0.2, 0.86, 1], [0.55, 0.2, 0.72, 1], [0.8, 0.2, 0.6, 0.98], [0.95, 0.2, 0.5, 0.92], [1, 0.26, 0.42, 0.82]],
    cabin: { t0: 0.3, t1: 0.74, r0: 0.4, r1: 0.55, belt: 0.72, roof: 1.14, wb: 0.84, wr: 0.62 },
    wheels: { r: 0.35, w: 0.3, f: 0.8, b: 0.19, track: 0.86 }, spoiler: 'wing', grille: 'sport', lights: 'slim',
  },
  muscle: {
    name: 'Bruiser V8', cls: 'Muscle', engine: 'muscle', mass: 1650, L: 4.85, W: 1.98, H: 1.36, top: 72, accel: 9, grip: 1.0, steer: 0.6, drift: 0.75, cgH: 0.52, brake: 12, drive: 'RWD', hp: 130, gears: 5,
    colors: [0x2c3e50, 0xb03a2e, 0xf39c12, 0x1abc9c, 0x111111],
    body: [[0, 0.34, 0.9, 0.94], [0.05, 0.3, 0.96, 1], [0.3, 0.3, 0.98, 1], [0.6, 0.3, 0.96, 1], [0.92, 0.3, 0.92, 1], [1, 0.34, 0.86, 0.96]],
    cabin: { t0: 0.22, t1: 0.6, r0: 0.3, r1: 0.47, belt: 0.95, roof: 1.35, wb: 0.86, wr: 0.7 },
    wheels: { r: 0.36, w: 0.3, f: 0.8, b: 0.2, track: 0.84 }, spoiler: 'duck', grille: 'muscle', lights: 'round', stripes: true,
  },
  sedan: {
    name: 'Meridian Sedan', cls: 'Sedan', engine: 'sedan', mass: 1450, L: 4.7, W: 1.86, H: 1.48, top: 54, accel: 6, grip: 0.95, steer: 0.62, drift: 0.65, cgH: 0.55, brake: 11, drive: 'FWD', hp: 100, gears: 5,
    colors: [0x95a5a6, 0x34495e, 0x7f8c8d, 0xecf0f1, 0x8e2a2a, 0x2b4c7e, 0x556b4f, 0xc9b79c],
    body: [[0, 0.34, 0.92, 0.92], [0.06, 0.3, 0.98, 0.98], [0.28, 0.3, 0.98, 1], [0.6, 0.3, 0.92, 1], [0.86, 0.3, 0.86, 0.99], [1, 0.34, 0.74, 0.92]],
    cabin: { t0: 0.18, t1: 0.7, r0: 0.3, r1: 0.55, belt: 0.95, roof: 1.47, wb: 0.9, wr: 0.76 },
    wheels: { r: 0.33, w: 0.23, f: 0.8, b: 0.2, track: 0.84 }, grille: 'chrome', lights: 'wide',
  },
  hatch: {
    name: 'Pico Hatch', cls: 'Compact', engine: 'hatch', mass: 1100, L: 3.9, W: 1.75, H: 1.5, top: 50, accel: 6.5, grip: 1.0, steer: 0.68, drift: 0.7, cgH: 0.52, brake: 12, drive: 'FWD', hp: 85, gears: 5,
    colors: [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x16a085, 0xff7f50],
    body: [[0, 0.34, 0.98, 0.96], [0.05, 0.3, 1.0, 1], [0.5, 0.3, 0.95, 1], [0.82, 0.3, 0.86, 0.99], [1, 0.34, 0.72, 0.92]],
    cabin: { t0: 0.04, t1: 0.72, r0: 0.08, r1: 0.55, belt: 0.98, roof: 1.49, wb: 0.92, wr: 0.8 },
    wheels: { r: 0.31, w: 0.21, f: 0.81, b: 0.17, track: 0.85 }, grille: 'plain', lights: 'round',
  },
  taxi: { base: 'sedan', name: 'Port Sol Cab', colors: [0xf4c20d], taxi: true },
  police: { base: 'sedan', name: 'PSPD Cruiser', cls: 'Police', engine: 'police', top: 66, accel: 8, grip: 1.05, mass: 1600, hp: 140, colors: [0x111418], police: true, grille: 'bullbar' },
  interceptor: { base: 'saetta', name: 'PSPD Interceptor', cls: 'Police', engine: 'police', top: 82, accel: 10.5, grip: 1.2, hp: 130, colors: [0x0f1a33], police: true, spoiler: 'lip' },
  suv: {
    name: 'Halcyon Warden', cls: 'SUV', engine: 'muscle', mass: 2300, L: 4.95, W: 2.0, H: 1.9, top: 60, accel: 7.5, grip: 0.95, steer: 0.58, drift: 0.6, cgH: 0.8, brake: 11, drive: 'AWD', hp: 180, gears: 6,
    colors: [0x0b0d10, 0x1c1f24, 0xdedede, 0x2f3b2f],
    body: [[0, 0.42, 1.12, 0.96], [0.04, 0.42, 1.16, 1], [0.5, 0.42, 1.16, 1], [0.88, 0.42, 1.1, 1], [1, 0.45, 1.0, 0.96]],
    cabin: { t0: 0.04, t1: 0.75, r0: 0.06, r1: 0.62, belt: 1.15, roof: 1.88, wb: 0.94, wr: 0.86 },
    wheels: { r: 0.4, w: 0.28, f: 0.8, b: 0.18, track: 0.86 }, grille: 'bullbar', lights: 'wide', roofRack: true,
  },
  van: {
    name: 'Cargo Van', cls: 'Van', engine: 'truck', mass: 2400, L: 5.4, W: 2.0, H: 2.35, top: 46, accel: 5, grip: 0.9, steer: 0.6, drift: 0.55, cgH: 0.95, brake: 10, drive: 'RWD', hp: 160, gears: 5,
    colors: [0xf5f5f5, 0x2d3436, 0x0984e3, 0xd63031],
    body: [[0, 0.42, 2.3, 0.98], [0.03, 0.42, 2.34, 1], [0.69, 0.42, 2.34, 1], [0.73, 0.42, 1.25, 1], [0.92, 0.42, 1.2, 0.99], [1, 0.45, 1.05, 0.95]],
    cabin: { t0: 0.66, t1: 0.93, r0: 0.68, r1: 0.77, belt: 1.24, roof: 2.33, wb: 0.98, wr: 0.97 },
    wheels: { r: 0.38, w: 0.25, f: 0.84, b: 0.15, track: 0.86 }, grille: 'plain', lights: 'wide', boxy: true,
  },
  truck: {
    name: 'Hauler Box Truck', cls: 'Truck', engine: 'truck', mass: 6500, L: 7.6, W: 2.4, H: 3.4, top: 36, accel: 3.2, grip: 0.85, steer: 0.55, drift: 0.5, cgH: 1.3, brake: 8, drive: 'RWD', hp: 260, gears: 6,
    colors: [0xecf0f1, 0xc0392b, 0x2c3e50, 0xf39c12],
    body: [[0, 0.6, 3.35, 0.98], [0.02, 0.6, 3.4, 1], [0.7, 0.6, 3.4, 1], [0.72, 0.6, 1.75, 0.96], [0.95, 0.6, 1.75, 0.96], [1, 0.62, 1.4, 0.94]],
    cabin: { t0: 0.8, t1: 0.985, r0: 0.81, r1: 0.9, belt: 1.75, roof: 2.75, wb: 0.97, wr: 0.95 },
    wheels: { r: 0.5, w: 0.32, f: 0.86, b: 0.16, track: 0.82 }, grille: 'truck', lights: 'wide', boxy: true, cargoBox: true,
  },
  bus: {
    name: 'Metro Bus', cls: 'Bus', engine: 'bus', mass: 11000, L: 11.5, W: 2.55, H: 3.2, top: 30, accel: 2.4, grip: 0.85, steer: 0.55, drift: 0.5, cgH: 1.2, brake: 7, drive: 'RWD', hp: 350, gears: 5,
    colors: [0x1f6fb2, 0xd35400, 0x27ae60],
    body: [[0, 0.45, 1.55, 0.98], [0.02, 0.45, 1.6, 1], [0.98, 0.45, 1.6, 1], [1, 0.45, 1.5, 0.97]],
    cabin: { t0: 0.005, t1: 0.995, r0: 0.012, r1: 0.988, belt: 1.55, roof: 3.15, wb: 1.0, wr: 0.97 },
    wheels: { r: 0.5, w: 0.3, f: 0.82, b: 0.18, track: 0.84 }, grille: 'plain', lights: 'wide', boxy: true, bus: true,
  },
  armored: {
    name: 'Bastion Armored Truck', cls: 'Armored', engine: 'armored', mass: 9000, L: 6.6, W: 2.45, H: 2.9, top: 40, accel: 3.6, grip: 0.9, steer: 0.55, drift: 0.5, cgH: 1.1, brake: 9, drive: 'AWD', hp: 600, armor: 4, gears: 6,
    colors: [0x5c6670, 0x2f3640],
    body: [[0, 0.62, 2.8, 0.98], [0.03, 0.62, 2.85, 1], [0.64, 0.62, 2.85, 1], [0.68, 0.62, 1.75, 0.98], [0.92, 0.62, 1.7, 0.97], [1, 0.65, 1.3, 0.94]],
    cabin: { t0: 0.63, t1: 0.93, r0: 0.66, r1: 0.8, belt: 1.72, roof: 2.6, wb: 0.96, wr: 0.92 },
    wheels: { r: 0.52, w: 0.34, f: 0.84, b: 0.17, track: 0.84 }, grille: 'truck', lights: 'wide', boxy: true, armoredPlates: true,
  },
  pickup: {
    name: 'Ranchero Pickup', cls: 'Pickup', engine: 'truck', mass: 2100, L: 5.3, W: 2.0, H: 1.85, top: 56, accel: 6.5, grip: 0.95, steer: 0.58, drift: 0.65, cgH: 0.8, brake: 11, drive: 'AWD', hp: 160, gears: 5,
    colors: [0x8e2a2a, 0x2c3e50, 0xdcdcdc, 0x4a6b3a, 0xc7a45a],
    body: [[0, 0.5, 1.15, 0.98], [0.03, 0.5, 1.18, 1], [0.5, 0.5, 1.18, 1], [0.86, 0.5, 1.12, 1], [1, 0.52, 1.0, 0.96]],
    cabin: { t0: 0.4, t1: 0.76, r0: 0.43, r1: 0.62, belt: 1.17, roof: 1.84, wb: 0.94, wr: 0.86 },
    wheels: { r: 0.42, w: 0.28, f: 0.8, b: 0.17, track: 0.86 }, grille: 'truck', lights: 'wide', bed: true,
  },
  moto: {
    name: 'Furia 900', cls: 'Motorcycle', engine: 'moto', mass: 260, L: 2.1, W: 0.8, H: 1.15, top: 80, accel: 11, grip: 1.15, steer: 0.5, drift: 0.8, cgH: 0.6, brake: 14, drive: 'RWD', hp: 50, gears: 6, bike: true,
    colors: [0xc0392b, 0x111111, 0x2980b9, 0xf1c40f, 0x27ae60],
    wheels: { r: 0.32, w: 0.16, f: 0.86, b: 0.12, track: 0 },
  },
  policebike: { base: 'moto', name: 'PSPD Moto', engine: 'police', colors: [0xffffff], police: true, top: 74 },
};
// resolve inheritance
for (const [k, v] of Object.entries(VEHICLES)) { if (v.base) { const b = VEHICLES[v.base]; VEHICLES[k] = { ...b, ...v, id: k }; } else v.id = k; }
export const TRAFFIC_MIX = { city: ['sedan', 'sedan', 'hatch', 'hatch', 'taxi', 'suv', 'van', 'pickup', 'muscle', 'sedan', 'truck', 'saetta', 'bus', 'moto'], res: ['sedan', 'hatch', 'pickup', 'suv', 'hatch', 'sedan', 'van', 'muscle'], hwy: ['sedan', 'truck', 'suv', 'saetta', 'van', 'truck', 'pickup', 'super', 'sedan'] };
export const GARAGE_ORDER = ['rostr', 'rivolta', 'strada', 'saetta', 'sedan', 'hatch', 'muscle', 'moto', 'pickup', 'suv', 'van', 'taxi', 'super', 'truck', 'interceptor', 'police', 'bus', 'armored'];
