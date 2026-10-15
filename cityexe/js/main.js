import { Game } from './game.js';
import { Possession } from './play/possession.js';
import { HUD } from './ui/hud.js';
import { GodTools } from './play/godTools.js';

const canvas = document.getElementById('view');
const fill = document.getElementById('boot-fill');
const msg = document.getElementById('boot-msg');
const params = new URLSearchParams(location.search);

async function main() {
  const game = new Game(canvas, { seed: params.has('seed') ? +params.get('seed') : undefined });
  window.game = game;
  await game.boot((text, p) => { msg.textContent = text; fill.style.width = `${Math.round(p * 100)}%`; });
  game.possession = new Possession(game);
  game.godTool = new GodTools(game);
  const hud = new HUD(game);
  game.hud = hud;
  game.on('frame', (dt) => hud.update(dt));
  document.getElementById('boot').classList.add('done');
  setTimeout(() => document.getElementById('boot').remove(), 900);
  game.start();
}
main().catch((e) => { console.error(e); msg.textContent = 'Failed to start: ' + e.message; });
