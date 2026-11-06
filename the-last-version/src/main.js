import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { UI } from './engine/ui.js';
import { AudioEngine } from './audio/audio.js';
import { Music } from './audio/music.js';
import { Game } from './game/game.js';
import { Menu, applySettings } from './game/menu.js';
import { loadSettings } from './game/state.js';
import { onProgress, setAnisotropy } from './engine/assets.js';
import { MenuScene } from './game/menuScene.js';

const settings = loadSettings();
const qp = new URLSearchParams(location.search);
if (qp.get('quality')) settings.quality = qp.get('quality');
const canvas = document.getElementById('view');
const renderer = new Renderer(canvas, settings.quality);
setAnisotropy(Math.min(8, renderer.renderer.capabilities.getMaxAnisotropy()));
const input = new Input(canvas);
const audio = new AudioEngine();
const music = new Music(audio);
const ui = new UI(document.getElementById('ui'), audio);
const game = new Game({ renderer, input, audio, music, ui });
game.menu = new Menu(game);
window.__game = game; // debugging / automated tests

const fill = document.getElementById('boot-fill');
onProgress((d, p) => { fill.style.width = Math.round((d / p) * 100) + '%'; });
applySettings(game);

const params = new URLSearchParams(location.search);

(async () => {
  game.menuScene = new MenuScene(game);
  await game.menuScene.load();
  game.loop();
  game.boot(false);
  // Audio needs a user gesture; the first click anywhere unlocks it.
  const unlock = () => {
    audio.start(); applySettings(game);
    if (game.mode === 'menu') music.play('menu');
    removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock);
  };
  addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  // ?chapter=N&cp=ID jumps straight in (development / QA).
  if (params.get('chapter')) {
    game.mode = 'play';
    await game.enterChapter(+params.get('chapter'), params.get('cp') || 'start', { fromMenu: true });
  } else {
    game.menu.show();
  }
})();
