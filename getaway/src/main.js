// GETAWAY! — entry point
import { G } from './core/context.js';
import { Guard } from './core/guard.js';
import { Game } from './game.js';

const fill = document.getElementById('boot-fill'), msg = document.getElementById('boot-msg');
// a failure while loading shows what broke (instead of a black screen) and offers a safe-mode retry
function bootFailed(e) {
  Guard.report('boot', e); const safe = new URLSearchParams(location.search).get('safe');
  msg.innerHTML = `<b style="color:#ff6b5a">Couldn't start: ${String(e && e.message || e).replace(/</g, '&lt;')}</b><br>` + (safe ? 'Press F9 for details.' : `<a href="?safe=1" style="color:#ffd36b">Retry in safe mode (low graphics)</a> · F9 for details`);
  throw e;
}
try {
  if (new URLSearchParams(location.search).get('safe')) { try { const k = 'getaway_settings_v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); Object.assign(s, { quality: 'low', shadows: false, bloom: false }); localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }
  const game = new Game();
  await game.boot((p, m) => { fill.style.width = (p * 100).toFixed(0) + '%'; msg.textContent = m; });
  const unlockAudio = () => { try { G.audio.init(); G.music.init(); G.audio.setVolumes(G.settings.master, G.settings.music, G.settings.sfx); } catch (e) { Guard.report('audio', e); } };
  addEventListener('pointerdown', unlockAudio); addEventListener('keydown', unlockAudio);
  const { setupFlow } = await import('./flow.js');
  await setupFlow(game);
  document.getElementById('boot').classList.add('done');
  game.start();
  window.__ready = true;
} catch (e) { bootFailed(e); }
