// Boot sequence and top-level flow: loading → title → customization → prologue.
import { initPhysics } from './core/physics.js';
import { Game } from './game.js';
import * as THREE from 'three';

const q = new URLSearchParams(location.search);
const bootEl = document.getElementById('boot'), fill = document.getElementById('boot-fill'), msg = document.getElementById('boot-msg');
const progress = (p, m) => { fill.style.width = (p * 100).toFixed(0) + '%'; if (m) msg.textContent = m; };

async function boot() {
  progress(0.02, 'Waking the city…');
  await initPhysics();
  const game = new Game(document.getElementById('view'));
  window.__game = game; window.__THREE = THREE; // for the test tools
  // people are sculpted in worker threads while the city is built on this one
  const { prewarmAnatomy } = await import('./characters/sculptpool.js');
  let sculpted = 0;
  game.anatomyReady = prewarmAnatomy(p => { sculpted = p; });
  game.anatomyProgress = () => sculpted;
  await game.init(progress);
  if (q.get('fps')) document.getElementById('fps').style.display = 'block';
  if (q.get('test') === 'arena') {
    const { buildArena } = await import('./world/arena.js');
    buildArena(game);
    finishBoot(game);
    game.start();
    game.input.wantLock = true;
    window.__ready = true;
    return;
  }
  const { buildMeridian } = await import('./world/meridian.js');
  await buildMeridian(game, progress);
  const { Menu } = await import('./ui/menu.js');
  const { Prologue } = await import('./story/prologue.js');
  game.story = new Prologue(game);
  game.menu = new Menu(game);
  finishBoot(game);
  game.start();
  window.__ready = true;
  if (q.get('view')) { game.player.teleport(new (await import('three')).Vector3(205, -38, -190), Math.PI); return; }
  if (q.get('beat')) { await game.menu.quickStart(q.get('beat')); return; }
  game.menu.showTitle();
}

function finishBoot(game) {
  progress(1, 'Ready');
  setTimeout(() => bootEl.classList.add('gone'), 200);
  setTimeout(() => bootEl.remove(), 1600);
}

boot().catch(e => { console.error(e); msg.textContent = 'Failed to start: ' + e.message; msg.style.color = '#ff7a6a'; });
