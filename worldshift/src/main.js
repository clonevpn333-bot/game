// WORLD//SHIFT — bootstrap and main loop
import * as THREE from 'three';
import { G } from './core/state.js';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { Events } from './core/events.js';
import { generateSurfaceTextures } from './world/textures.js';
import { MaterialLibrary, GU } from './world/materials.js';
import { initTerrain } from './world/layout.js';
import { CollisionWorld } from './world/collision.js';
import { buildPropTemplates } from './world/props.js';
import { SignAtlas } from './world/signs.js';
import { ChunkManager } from './world/chunks.js';
import { World } from './world/world.js';
import { Sky } from './world/sky.js';
import { Chronicle } from './timeline/chronicle.js';
import { ShiftSystem } from './timeline/shift.js';
import { Player } from './actors/player.js';
import { ThirdPersonCamera } from './actors/camera.js';
import { HUD } from './ui/hud.js';
import { Game } from './gameplay/game.js';
import { FX } from './gameplay/fx.js';
import { Combat } from './gameplay/combat.js';
import { Crowd } from './actors/crowd.js';
import { Vehicles } from './actors/vehicles.js';
import { Authority } from './gameplay/authority.js';
import { Interaction, Inventory, Progress } from './gameplay/interact.js';
import { Missions } from './gameplay/missions.js';
import { WorldEvents, Weather } from './gameplay/events.js';
import { Menus } from './ui/menus.js';

const params = new URLSearchParams(location.search);
G.debug = params.has('debug');
if (params.has('q')) G.settings.quality = params.get('q');
window.G = G;
window.THREE = THREE;

const loadFill = document.getElementById('loadfill');
const loadText = document.getElementById('loadtext');
const setLoad = (f, text) => {
  loadFill.style.width = `${Math.round(f * 100)}%`;
  if (text) loadText.textContent = text;
};
const tick = () => new Promise((r) => setTimeout(r, 0));

async function boot() {
  const canvas = document.getElementById('game');
  G.engine = new Engine(canvas);
  G.renderer = G.engine.renderer;
  G.scene = G.engine.scene;
  G.camera = G.engine.camera;
  G.events = new Events();
  G.input = new Input(canvas);
  G.audio = new Audio();
  G.chronicle = new Chronicle();

  setLoad(0.02, 'Weathering 193 years of surfaces…');
  await tick();
  const tex = await generateSurfaceTextures((f) => setLoad(0.02 + f * 0.4));
  setLoad(0.45, 'Surveying the land…');
  await tick();
  initTerrain();
  G.mats = new MaterialLibrary(tex);
  const signs = new SignAtlas();
  G.mats.setSignTexture(signs.texture);
  G.mats.sets.forEach((s) => { s.holo.map = signs.texture; s.holo.needsUpdate = true; });
  buildPropTemplates();
  G.collision = new CollisionWorld();
  G.sky = new Sky(G.scene, G.renderer);

  setLoad(0.55, 'Raising three skylines…');
  await tick();
  G.chunks = new ChunkManager(G.scene, G.mats, G.collision, signs);
  G.world = new World(G.scene, G.mats);
  G.world.build((f) => setLoad(0.55 + f * 0.2));

  G.shift = new ShiftSystem();
  G.player = new Player(G.scene);
  G.cam = new ThirdPersonCamera(G.camera);
  G.hud = new HUD();
  G.game = new Game();
  G.fx = new FX(G.scene);
  G.inventory = new Inventory();
  G.progress = new Progress();
  G.crowd = new Crowd(G.scene);
  G.vehicles = new Vehicles(G.scene);
  G.combat = new Combat();
  G.authority = new Authority();
  G.interact = new Interaction();
  G.missions = new Missions();
  G.worldEvents = new WorldEvents();
  G.weather = new Weather(G.scene);
  G.menus = new Menus();
  G.ui = G.menus;
  for (const s of [G.vehicles, G.crowd, G.combat, G.authority, G.interact, G.missions, G.worldEvents, G.weather, G.fx]) G.game.register(s);

  setLoad(0.8, 'Building your street…');
  await tick();
  G.game.init(params);
  // pre-build the starting area for all eras
  const p = G.player.pos;
  for (let i = 0; i < 60; i++) {
    const remaining = G.chunks.update(p.x, p.z, G.era, true);
    setLoad(0.8 + Math.min(0.19, i * 0.006), 'Building your street…');
    if (remaining === 0) break;
    await tick();
  }
  G.chunks.setVisibleEras([G.era]);
  G.world.setEraVisible([G.era]);
  G.sky.setEra(G.era);
  setLoad(1, 'Ready.');

  // warm up shaders
  G.sky.update(0.016, p);
  G.cam.update(0.016, G.input);
  G.renderer.compile(G.scene, G.camera);

  const title = document.getElementById('title');
  const btns = document.getElementById('startbtns');
  btns.style.display = '';
  loadText.textContent = '';
  const hasSave = G.game.hasSave();
  if (hasSave) document.getElementById('btn-continue').style.display = '';
  const start = (cont) => {
    G.audio.init();
    if (cont) G.game.loadGame(); else G.game.newGame();
    title.classList.add('fade');
    G.paused = false;
    G.started = true;
    G.input.requestLock();
  };
  document.getElementById('btn-new').onclick = () => start(false);
  document.getElementById('btn-continue').onclick = () => start(true);
  if (params.has('autostart')) start(false);

  canvas.addEventListener('click', () => {
    if (G.started && !G.paused && !G.input.locked && !G.ui?.modal) G.input.requestLock();
  });

  requestAnimationFrame(loop);
}

let last = performance.now();
G.fpsAvg = 60;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000;
  last = now;
  if (G.fixedDt) dt = G.fixedDt;
  dt = Math.min(dt, 1 / 20);
  G.fpsAvg = G.fpsAvg * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  step(dt);
}

function step(dt) {
  const input = G.input;
  G.frame++;
  if (!G.paused && G.started) {
    G.time += dt;
    G.dayTime = (G.dayTime + dt * G.daySpeed) % 24;
    GU.uTime.value = G.time;
    G.game.update(dt, input);
  } else if (G.game) {
    G.game.updatePaused(dt, input);
  }
  // keep the camera + sky alive even when paused (menus over the live world)
  const p = G.player;
  G.sky.update(dt, p.vehicle ? p.vehicle.pos : p.pos);
  G.sky.mesh.position.copy(G.camera.position);
  GU.uPlayerPos.value.copy(p.pos);
  G.engine.render(dt);
  input.endFrame();
}

boot().catch((e) => {
  console.error(e);
  loadText.textContent = 'Failed to start: ' + e.message;
});
