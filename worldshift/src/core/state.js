// Global game context. Systems register themselves here so modules can reach
// each other at runtime without circular-import headaches.
export const G = {
  engine: null,
  scene: null,
  camera: null,
  renderer: null,
  input: null,
  audio: null,
  assets: null,

  layout: null,
  world: null,
  chunks: null,
  collision: null,
  sky: null,
  weather: null,

  player: null,
  cam: null,

  chronicle: null,
  shift: null,

  crowd: null,
  traffic: null,
  vehicles: null,
  combat: null,
  authority: null,
  events: null,
  missions: null,
  fx: null,
  hud: null,
  ui: null,

  era: 0,            // 0 = 1996, 1 = 2047, 2 = 2189
  time: 0,           // seconds since start (unpaused)
  frame: 0,
  dayTime: 17.4,     // hours 0..24
  daySpeed: 1 / 120, // game hours per real second (48 min days)
  paused: true,
  started: false,
  debug: false,

  settings: {
    quality: 'high',   // low | medium | high
    sensitivity: 1.0,
    invertY: false,
    fov: 68,
    volume: 0.8,
    music: 0.5,
  },
};

export const ERA_YEARS = [1996, 2047, 2189];
export const ERA_NAMES = ['THE OLD CITY', 'THE MEGACITY', 'THE DEAD FUTURE'];
export const ERA_COUNT = 3;
