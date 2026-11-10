// FRAMEBREAK boot.
import { Game } from './core/game.js';
import { Menu } from './ui/menu.js';

const game = new Game();
window.__fb = game; // debug / automated-test handle
const q = new URLSearchParams(location.search);
const boot = document.getElementById('boot'), fill = document.getElementById('boot-fill'), msg = document.getElementById('boot-msg');

(async () => {
  try {
    fill.style.width = '30%';
    const menu = new Menu(game); game.menu = menu;
    await new Promise((r) => setTimeout(r, 30));
    msg.textContent = 'drawing pixels…';
    await game.director.preload(1);
    fill.style.width = '100%';
    game.start();
    if (q.get('mute')) { game.settings.master = 0; }
    const forced = window.__FB_CHAPTER;
    if (q.get('ch')) { await game.director.startChapter(+q.get('ch'), { checkpoint: q.get('cp') || null, replay: true }); }
    else if (forced) { await game.director.startChapter(forced, { replay: true }); }
    else menu.openMain();
    boot.classList.add('hide');
    window.__ready = true;
  } catch (e) {
    console.error(e); msg.textContent = 'failed to start: ' + e.message;
  }
})();
