import { Game } from './game.js';
import { Possession } from './play/possession.js';
import { HUD } from './ui/hud.js';
import { GodTools } from './play/godTools.js';
import { Interiors } from './render/interiors.js';
import { Activities } from './play/activities.js';
import { LifeUI } from './ui/lifeUI.js';
import { MapUI } from './ui/mapUI.js';
import { PlayerWeapons } from './play/weapons.js';
import { Audio } from './audio/audio.js';
import { loadSave, saveWorld, deserialize, clearSave } from './sim/save.js';
import { Anomalies } from './sim/anomaly.js';

const canvas = document.getElementById('view');
const fill = document.getElementById('boot-fill');
const msg = document.getElementById('boot-msg');
const params = new URLSearchParams(location.search);
const progress = (text, p) => { msg.textContent = text; fill.style.width = `${Math.round(p * 100)}%`; };
const tick = () => new Promise((r) => setTimeout(r, 0));

async function main() {
  let world = null, away = null;
  if (!params.has('fresh')) {
    progress('Looking for your city…', 0.05);
    let data = await loadSave().catch(() => null);
    if (data) {
      progress('Rebuilding your city…', 0.15);
      await tick();
      // an old or broken save: start a fresh city instead of failing
      try { world = deserialize(data); } catch (e) { console.warn('Discarding save:', e.message); await clearSave().catch(() => {}); world = null; data = null; }
    }
    if (data && world) {
      new Anomalies(world).attach();
      if (data.anom) world.anomalies.deserialize(data.anom);
      // the city kept living while you were gone
      const realMin = (Date.now() - data.savedAt) / 60000;
      const gameMin = Math.min(Math.round(realMin * 3), 1440 * 3);
      if (gameMin > 30) {
        const before = world.history.events.length;
        const logs = new Map(world.citizens.filter((c) => c.bookmarked).map((c) => [c.id, c.log.length]));
        progress(`Catching up on ${fmtSpan(gameMin)} of city life…`, 0.2);
        await tick();
        world.catchUp(gameMin, (p) => { fill.style.width = `${Math.round(20 + p * 30)}%`; });
        away = { gameMin, realMin, events: world.history.events.slice(before).filter((e) => !e.minor), bookmarks: [] };
        for (const [id, n] of logs) { const c = world.citizens[id]; const fresh = c.log.slice(n).filter((e) => e.major); if (fresh.length) away.bookmarks.push({ c, fresh }); }
      }
    }
  }
  const game = new Game(canvas, { seed: params.has('seed') ? +params.get('seed') : undefined, world });
  window.game = game;
  await game.boot(progress);
  if (!world) new Anomalies(game.world).attach();
  game.possession = new Possession(game);
  game.godTool = new GodTools(game);
  game.interiors = new Interiors(game);
  game.activities = new Activities(game);
  game.audio = new Audio(game);
  const hud = new HUD(game);
  game.hud = hud;
  game.lifeUI = new LifeUI(game);
  game.weapons = new PlayerWeapons(game);
  game.mapUI = new MapUI(game);
  game.world.__game = game;
  game.world.on('shot', (e) => { const s = e.shots[0]; if (s) game.audio.gunshot(s.from.x, s.from.z, e.noise); });
  game.on('frame', (dt) => { hud.update(dt); game.audio.update(dt); game.activities.update(dt); game.lifeUI.update(dt); game.world.heists.update(dt, game); });
  // persistence
  let saving = false;
  game.save = async () => {
    if (saving || (game.possession.c && !game.lifeMode) || game.rig.trans) return;
    saving = true;
    try { await saveWorld(game.world); } finally { saving = false; }
  };
  game.resetCity = async () => { await clearSave(); location.href = location.pathname + '?fresh'; };
  game.world.on('day', () => game.save());
  setInterval(() => game.save(), 120000);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') game.save(); });
  addEventListener('pagehide', () => game.save());
  document.getElementById('boot').classList.add('done');
  setTimeout(() => document.getElementById('boot').remove(), 900);
  game.start();
  const me = game.world.life && game.world.life.player;
  if (me && me.status !== 'dead' && !params.has('sandbox')) {
    game.lifeUI.startLife(me, false);
    if (away && (away.events.length || away.bookmarks.length)) hud.showAway(away);
  } else if (away && (away.events.length || away.bookmarks.length)) hud.showAway(away);
  else if (!world && !params.has('sandbox')) game.lifeUI.title(() => hud.showWelcome());
  else if (!world) hud.showWelcome();
  if (params.has('fresh')) history.replaceState(null, '', location.pathname);
}

function fmtSpan(min) {
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60);
  return d ? `${d} day${d > 1 ? 's' : ''}${h ? ` ${h}h` : ''}` : `${h} hours`;
}

main().catch((e) => { console.error(e); msg.textContent = 'Failed to start: ' + e.message; });
