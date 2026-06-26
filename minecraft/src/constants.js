// ============================================================================
//  Global constants & shared configuration
// ============================================================================

export const CHUNK_SX = 16;
export const CHUNK_SZ = 16;
export const WORLD_HEIGHT = 128;
export const SEA_LEVEL = 46;

export const CHUNK_AREA = CHUNK_SX * CHUNK_SZ;          // 256
export const CHUNK_VOL = CHUNK_AREA * WORLD_HEIGHT;     // 32768

// Block array index helper (local chunk coords)
export function idx(x, y, z) {
  return x + z * CHUNK_SX + y * CHUNK_AREA;
}

// Render distance presets (in chunks)
export const RENDER_DISTANCE = { value: 6 };

// Tick / time
export const TICKS_PER_SECOND = 20;
export const DAY_LENGTH_SECONDS = 600; // full day-night cycle (10 min)

// Physics
export const GRAVITY = 28.0;
export const TERMINAL_VELOCITY = 56.0;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE = 1.62;
export const PLAYER_WIDTH = 0.6;
export const WALK_SPEED = 4.317;
export const SPRINT_SPEED = 5.612;
export const SNEAK_SPEED = 1.3;
export const JUMP_VELOCITY = 8.4;
export const SWIM_SPEED = 3.0;
export const FLY_SPEED = 11.0;

// Dimensions
export const DIM = { OVERWORLD: 0, NETHER: 1, END: 2 };

// Faces: order matters for meshing (matches normals below)
export const FACES = [
  { dir: [ 1, 0, 0], name: 'east',  // +X
    corners: [[1,0,1],[1,1,1],[1,1,0],[1,0,0]] },
  { dir: [-1, 0, 0], name: 'west',  // -X
    corners: [[0,0,0],[0,1,0],[0,1,1],[0,0,1]] },
  { dir: [ 0, 1, 0], name: 'top',   // +Y
    corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { dir: [ 0,-1, 0], name: 'bottom',// -Y
    corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { dir: [ 0, 0, 1], name: 'south', // +Z
    corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { dir: [ 0, 0,-1], name: 'north', // -Z
    corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] },
];

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
