// Assembles Meridian: sky, the walking city & its legs, the ground below, and the
// playable districts; then wires ambience, light pooling and ambient life.
import * as THREE from 'three';
import { Sky } from './sky.js';
import { City, Exterior } from './city.js';
import { Ground } from './ground.js';
import { LightPool } from './props.js';
import { buildCityDistrict } from './district_city.js';
import { buildLowerDecks, LD } from './district_lower.js';
import { buildSpine, SP } from './district_spine.js';
import { Tram } from './tram.js';
import { clamp, damp } from '../core/util.js';

const tick = () => new Promise(r => setTimeout(r, 0));

export async function buildMeridian(game, progress) {
  progress?.(0.42, 'Raising the sky…'); await tick();
  game.sky = new Sky(game, { elevation: 13, azimuth: 108 });
  progress?.(0.48, 'Setting Meridian on her legs…'); await tick();
  game.city = new City(game);
  game.exterior = new Exterior(game, game.city);
  progress?.(0.56, 'Unrolling the world below…'); await tick();
  game.ground = new Ground(game, game.city);
  const lights = game.lights = new LightPool(game, 6);
  progress?.(0.64, 'Opening the market…'); await tick();
  game.districts = {};
  game.districts.city = buildCityDistrict(game, lights);
  progress?.(0.74, 'Firing the Lower Decks…'); await tick();
  game.districts.lower = buildLowerDecks(game, lights);
  progress?.(0.82, 'Rigging the Spine…'); await tick();
  game.districts.spine = buildSpine(game, lights);
  game.tram = new Tram(game, lights);
  progress?.(0.9, 'Compiling shaders…'); await tick();
  game.killY = -380;

  // steam vents
  const steamAt = (pos, opts = {}) => game.fx.emitter({ pos, rate: opts.rate ?? 6, range: 60, spawn: (fx) => fx.alpha.spawn({ x: pos.x + (Math.random() - 0.5) * 0.3, y: pos.y, z: pos.z + (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5) * 0.4, vy: 1.4 + Math.random(), vz: (Math.random() - 0.5) * 0.4, life: 2.2, s0: 0.15, s1: 1.1, c0: [0.85, 0.85, 0.85, 0.09], c1: [0.9, 0.9, 0.9, 0], drag: 0.6 }) });
  game.districts.city.steam.forEach(p => steamAt(p, { rate: 4 }));
  game.districts.lower.steam.forEach(p => steamAt(p, { rate: 8 }));
  // dust motes in the apartment's sunbeam
  game.fx.emitter({ pos: new THREE.Vector3(190, 15.5, -21), rate: 3, range: 14, spawn: (fx) => fx.add.spawn({ x: 186 + Math.random() * 5.5, y: 14.3 + Math.random() * 2.6, z: -24 + Math.random() * 6, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.04, vz: (Math.random() - 0.5) * 0.05, life: 6, s0: 0.025, s1: 0.025, c0: [0.6, 0.5, 0.35, 0], c1: [0.6, 0.5, 0.35, 0.0] }) });
  // light shafts through Rook's window (soft additive volumes)
  game.sunShafts = [];
  {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.45), transparent: true, opacity: 0.022, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const g = new THREE.BoxGeometry(0.05, 2.0, 1.8);
      const m = new THREE.Mesh(g, mat);
      const sd = game.sky.sunDir; const len = 6;
      m.scale.set(len / 0.05, 1, 1);
      m.position.set(192 - sd.x * len / 2 * 0.95, 15.9 - sd.y * len / 2, -23 + i * 2 - sd.z * len / 2);
      m.lookAt(m.position.clone().add(sd)); m.rotateY(Math.PI / 2);
      game.engine.cityRoot.add(m); game.sunShafts.push(m);
    }
  }

  // per-frame world updates: ground, legs, ambience, district animation, light pool
  const L = game.districts.lower, S = game.districts.spine, C = game.districts.city;
  game.world = {
    update(dt) {
      const t = game.time;
      game.ground.update(dt);
      lights.update(dt);
      game.tram.update(dt);
      for (const f of L.anim) f(t, game.city, dt);
      for (const f of S.anim) f(t, game.city, dt);
      // occlusion by the hull: districts the camera cannot possibly see are switched off (draw
      // calls, culling and the shadow pass all skip them). The deck plates and hull walls are
      // solid, so the tests are simple boxes in city space.
      { const c = game.engine.camera.position, outside = c.x > 196;
        L.root.visible = c.y < -2 || outside;            // under the market deck, or through the bay tunnel
        S.root.visible = c.x > 186 || c.y < -30;         // starboard hull face (seen from Rook's window too)
        C.root.visible = !(c.y < -10 && !outside);       // not from inside the Lower Decks
        if (c.y < -250) { L.root.visible = false; C.root.visible = false; } // from the ground: the hull hides both
        if (game.cityHidden) { L.root.visible = false; C.root.visible = false; S.root.visible = false; } // chapters far from Meridian
        game.exterior.root.visible = !game.cityHidden;
      }
      // ambience by place
      const cam = game.engine.camera.position, p = game.player.pos;
      const inLower = p.y < -9 && p.y > -40 && p.x < 197 && p.z < -139 && p.z > -251;
      const exterior = p.x > 199.5 || p.y < -45 || (p.x > 196 && p.y < -30);
      const market = !inLower && !exterior && p.y > -2 && p.z < -38 && p.z > -135;
      const apt = game.sky.zoneAt(p.clone().setY(p.y + 1))?.name === 'apartment';
      const wind = exterior ? 0.9 : (p.y > 12 ? 0.18 : 0.08);
      game.audio.setBed('hum', 'hum', inLower ? 0.75 : exterior ? 0.35 : apt ? 0.22 : 0.3, 1.5);
      game.audio.setBed('wind', 'wind', wind * (game.windMul ?? 1), 1.2);
      const crowdLvl = market && !game.marketClosed ? clamp(1 - Math.abs(p.z + 85) / 70, 0.15, 1) * 0.55 : (p.y > 5 && p.y < 13 && p.z > -40 ? 0.12 : 0);
      game.audio.setBed('crowd', 'crowd', crowdLvl, 1.5);
      game.audio.setBed('machinery', 'machinery', inLower ? 0.55 : exterior ? 0.15 : 0.03, 1.5);
      game.audio.setBed('engine', 'engine', inLower ? 0.25 : exterior && p.y < -60 ? 0.3 : 0.02, 2);
      game.audio.setBed('room', 'room', apt ? 0.2 : 0, 1);
      // busker plays in the market
      game.audio.music?.busker(new THREE.Vector3(150.7, 1.4, -88.5), market && game.buskerOn !== false);
      // birds now and then
      game.birdT = (game.birdT || 0) - dt;
      if (game.birdT < 0) { game.birdT = 6 + Math.random() * 10; if (!inLower) game.audio.bird(cam.clone().add(new THREE.Vector3((Math.random() - 0.5) * 40, 10, (Math.random() - 0.5) * 40))); }
      // engine glow brightens below
      game.exterior.engineLight.intensity = 0;
      // apartment sun shafts only visible near the window
      game.sunShafts.forEach(m => (m.visible = p.y > 12 && p.x > 178 && p.z < -10 && p.z > -30));
    },
  };
  // hull rumble bed always on
  return game;
}
