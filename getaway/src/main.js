// GETAWAY! — entry point
import { G } from './core/context.js';
import { Game } from './game.js';

const fill = document.getElementById('boot-fill'), msg = document.getElementById('boot-msg');
const game = new Game();
await game.boot((p, m) => { fill.style.width = (p * 100).toFixed(0) + '%'; msg.textContent = m; });
const unlockAudio = () => { G.audio.init(); G.music.init(); G.audio.setVolumes(G.settings.master, G.settings.music, G.settings.sfx); };
addEventListener('pointerdown', unlockAudio); addEventListener('keydown', unlockAudio);

const { setupFlow } = await import('./flow.js');
await setupFlow(game);
document.getElementById('boot').classList.add('done');
game.start();
window.__ready = true;
