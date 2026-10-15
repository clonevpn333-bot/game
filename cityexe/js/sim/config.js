// Global tuning. Distances in meters, speeds in m/s of "physical" time.
// One physical second at 1x speed = TIME_SCALE game seconds on the city clock.
export const C = {
  BLOCK: 88,
  NB: 10,
  ROAD_W: 12,
  LANE_OFF: 1.75,
  PARK_OFF: 4.55,
  WALK_OFF: 7.75,
  CURB: 6,
  SIDEWALK_W: 3.5,
  HW_OFF: 62,
  HW_Y: 9,
  TIME_SCALE: 20,
  POPULATION: 900,
  DAY_MIN: 1440,
  YEAR_DAYS: 40,
  SEASON_DAYS: 10,
};
C.HALF = (C.NB * C.BLOCK) / 2;
export const nodeX = (i) => (i - C.NB / 2) * C.BLOCK;
export const nodeZ = (j) => (j - C.NB / 2) * C.BLOCK;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Districts on the 10x10 block map (row = bz from north to south)
// O Old Town, R river, H harbor, W Riverside waterfront, I Ironworks industrial,
// C Midtown commercial, D Downtown, P Greenway Park, S suburbs (Westpoint west of river, Maple Heights east)
export const DISTRICT_MAP = [
  'OORHIIIIII',
  'OORHCCIIII',
  'OORWCCCCCI',
  'OORWDDDCCC',
  'OORWDDDPPC',
  'OORWDDDPPC',
  'SSRWCDCCCS',
  'SSRWCCCSSS',
  'SSRWSSSSSS',
  'SSRWSSSSSS',
];
export const DISTRICTS = {
  O: { name: 'Old Town', color: '#c08457' },
  R: { name: 'Silver River', color: '#4a7ea8' },
  H: { name: 'Harbor', color: '#7c8a96' },
  W: { name: 'Riverside', color: '#58b4a8' },
  I: { name: 'Ironworks', color: '#a09080' },
  C: { name: 'Midtown', color: '#d6b25e' },
  D: { name: 'Downtown', color: '#7fa7e0' },
  P: { name: 'Greenway Park', color: '#5fae5a' },
  SW: { name: 'Westpoint', color: '#b9a3d6' },
  SE: { name: 'Maple Heights', color: '#e09aa0' },
};
export function districtCode(bx, bz) {
  if (bx < 0 || bz < 0 || bx >= C.NB || bz >= C.NB) return null;
  const c = DISTRICT_MAP[bz][bx];
  if (c === 'S') return bx < 2 ? 'SW' : 'SE';
  return c;
}
export const BRIDGE_ROWS = [1, 4, 6, 9];
