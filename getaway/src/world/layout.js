// GETAWAY! — Port Sol city layout constants (shared by world gen, traffic, missions, minimap)
export const ROAD_W = 16, HR = 8, WALK = 4, CURB = 0.15;
export const XS = [-800, -700, -600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 500, 600, 700];
export const ZS = [-800, -700, -600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500, 600];
export const RIVER = { x0: 360, x1: 440, bed: -5 };
export const WATER_Y = -0.8;
export const SEA_X = 790, SEA_Z = 745, BEACH_Z0 = 612;
export const BRIDGES_Z = [-300, 0, 500];
export const TUNNEL = { z: 300, x0: 208, x1: 592, floor: -12, ceil: -6.5, rampW: 292, rampE: 508 };
export const HWY = { z: -550, y: 12, x0: -1000, x1: 550, half: 12, rampW0: -1150, rampE1: 700 };
export const MIDRAMP = { s: { z0: -537, z1: -527, x0: -250, x1: -108 }, n: { z0: -573, z1: -563, x0: -92, x1: 50 } };
export const RAIL_Z = -650;
export const AIRPORT = { x0: -2250, x1: -1060, z0: -900, z1: -60, runwayZ: -320, runwayX0: -2180, runwayX1: -1180, runwayHalf: 24 };
// removed east-west road segments (x of west node) for merged mega-blocks
export const REMOVED_EW = [{ z: 400, xa: -200, xb: -100 }];

export function district(x, z) {
  if (x < -1050) return 'airport';
  if (z < -800) return 'hills';
  if (z > BEACH_Z0) return 'beach';
  if (x > RIVER.x1) return 'port';
  if (x > 300 && x < RIVER.x1) return 'river';
  if (x >= -300 && x <= 300 && z >= -300 && z <= 200) return 'downtown';
  if (x >= -350 && x <= 300 && z > 200) return 'shopping';
  if (x < -350 && z > -450) return 'suburbs';
  if (z < -450) return 'north';
  return 'midtown';
}
export const DISTRICT_NAMES = {
  downtown: 'MERIDIAN DOWNTOWN', shopping: 'GALLERIA DISTRICT', suburbs: 'PALISADE HEIGHTS', port: 'IRONSIDE DOCKS', beach: 'SUNSTRIP BEACH',
  north: 'RAILSIDE', midtown: 'MIDTOWN', airport: 'SOL INTERNATIONAL AIRPORT', hills: 'CROWN HILLS', river: 'SOL RIVER',
};
export const roadKind = (x, z) => { const d = district(x, z); return d === 'suburbs' || d === 'port' || d === 'beach' ? 'res' : 'city'; };

export const LANDMARKS = {
  bank: { x0: -88, z0: -88, x1: -12, z1: -12, name: 'FIRST MERIDIAN BANK' },
  construction: { x0: 112, z0: -188, x1: 188, z1: -112 },
  garage: { x0: -188, z0: 112, x1: -112, z1: 188, levels: 4, levelH: 4 },
  rooftops: { x0: -88, z0: 112, x1: -12, z1: 188 },
  mall: { x0: -188, z0: 312, x1: -112, z1: 488 },
  hideout: { x0: 512, z0: 112, x1: 588, z1: 188, door: { x: 550, z: 112 } },
  station: { x0: -288, x1: -112 },
  police: { x0: 112, z0: 12, x1: 188, z1: 88 },
  park: { x0: 12, z0: -288, x1: 88, z1: -212 },
  pier: { x: -44, z0: 700, z1: 930 },
};
