// God / sandbox tools. Each tool pokes the simulation; consequences play out
// through the normal systems (and can then be possessed from the inside).
import { dist } from '../core/math.js';
import { rand } from '../core/rng.js';

const TOOLS = [
  { id: 'fire', icon: '🔥', label: 'Start fire', target: 'building', hint: 'Click a building to set it on fire' },
  { id: 'blackout', icon: '⚡', label: 'Blackout', target: 'ground', hint: 'Click a district to cut its power' },
  { id: 'signal', icon: '🚦', label: 'Break signal', target: 'ground', hint: 'Click near an intersection to knock out its lights' },
  { id: 'accident', icon: '💥', label: 'Accident', target: 'ground', hint: 'Click a road: two nearby cars collide' },
  { id: 'surge', icon: '🚗', label: 'Gridlock', target: null },
  { id: 'crime', icon: '🦹', label: 'Crime wave', target: null },
  { id: 'riot', icon: '📢', label: 'Riot', target: 'ground', hint: 'Click where the riot starts' },
  { id: 'animals', icon: '🐘', label: 'Zoo escape', target: null },
  { id: 'tornado', icon: '🌪', label: 'Tornado', target: 'ground', hint: 'Click where the tornado touches down' },
  { id: 'meteor', icon: '☄', label: 'Meteor', target: 'ground', hint: 'Click the impact point' },
  { id: 'flood', icon: '🌊', label: 'Flood', target: null },
  { id: 'boom', icon: '📈', label: 'Econ. boom', target: null },
  { id: 'crash', icon: '📉', label: 'Econ. crash', target: null },
  { id: 'w:clear', icon: '☀', label: 'Clear', target: null, weather: 'clear' },
  { id: 'w:rain', icon: '🌧', label: 'Rain', target: null, weather: 'rain' },
  { id: 'w:storm', icon: '⛈', label: 'Storm', target: null, weather: 'storm' },
  { id: 'w:fog', icon: '🌫', label: 'Fog', target: null, weather: 'fog' },
  { id: 'w:snow', icon: '🌨', label: 'Snow', target: null, weather: 'snow' },
  { id: 'w:blizzard', icon: '❄', label: 'Blizzard', target: null, weather: 'blizzard' },
  { id: 'w:heatwave', icon: '🥵', label: 'Heat wave', target: null, weather: 'heatwave' },
  { id: 'night', icon: '🌙', label: 'Skip to night', target: null },
  { id: 'morning', icon: '🌅', label: 'Skip to morning', target: null },
  { id: 'anomaly', icon: '░', label: '???', target: null, exe: true },
];

export class GodTools {
  constructor(game) {
    this.game = game;
    this.active = null;
  }
  get W() { return this.game.world; }

  panelHTML() {
    const W = this.W;
    const tools = TOOLS.filter((t) => !t.exe || W.exeMode);
    return `<h2>⚡ God tools</h2><p class="muted">${this.active ? esc(this.active.hint) + ' · <kbd>Esc</kbd> cancel' : 'Interfere with the city. Everything you start plays out through the simulation — and you can possess anyone caught up in it.'}</p>
      <h3>Events</h3><div class="god">${tools.filter((t) => !t.weather && !['night', 'morning'].includes(t.id)).map((t) => btn(t, this.active)).join('')}</div>
      <h3>Weather</h3><div class="god">${tools.filter((t) => t.weather).map((t) => btn(t, this.active, W.weather.kind === t.weather)).join('')}</div>
      <h3>Time</h3><div class="god">${tools.filter((t) => ['night', 'morning'].includes(t.id)).map((t) => btn(t, this.active)).join('')}</div>`;
  }

  bind(P) {
    P.querySelectorAll('[data-tool]').forEach((b) => b.onclick = () => this.pick(b.dataset.tool));
  }

  pick(id) {
    const t = TOOLS.find((x) => x.id === id);
    if (!t) return;
    if (t.target) { this.active = t; this.game.toast(t.hint); this.game.hud.renderPanel(); return; }
    this.run(t, null, null);
    this.game.hud.renderPanel();
  }

  cancel() { this.active = null; this.game.hud.panel === 'god' && this.game.hud.renderPanel(); }

  click(pick, ground) {
    const t = this.active;
    if (!t) return;
    this.run(t, pick, ground);
    this.active = null;
    if (this.game.hud.panel === 'god') this.game.hud.renderPanel();
  }

  run(t, pick, ground) {
    const W = this.W, g = this.game;
    const D = W.disasters;
    const say = (s) => g.toast(s);
    switch (t.id) {
      case 'fire': {
        const b = pick && pick.kind === 'building' ? W.city.buildings[pick.id] : ground ? nearestBuilding(W, ground.x, ground.z) : null;
        if (!b) return say('Click a building.');
        W.incidents.ignite(b, 'a fire of unknown origin', 0.22);
        W.history.cityEvent(`Fire broke out at ${W.citizenAI.buildingName(b.id)}`, { type: 'fire', x: b.x, z: b.z, b: b.id });
        say(`🔥 ${W.citizenAI.buildingName(b.id)} is burning. Watch who comes — or possess a firefighter.`);
        break;
      }
      case 'blackout': {
        if (!ground) return;
        const z = W.power.zoneAt(ground.x, ground.z);
        W.power.cut(z, 'a catastrophic grid failure', { repairNeed: 180 });
        say(`⚡ The ${W.power.zones[z].name} went dark. Traffic lights, shops and streetlights are out.`);
        break;
      }
      case 'signal': {
        if (!ground) return;
        let best = null, bd = 60;
        for (const n of W.city.net.nodes) if (n.signal && !n.failed) { const d = dist(n.x, n.z, ground.x, ground.z); if (d < bd) { bd = d; best = n; } }
        if (!best) return say('No traffic light nearby.');
        W.incidents.failSignal(best, 'a power surge');
        say(`🚦 Lights out at ${W.nodeName(best)}. Drivers will treat it as an all-way stop… mostly.`);
        break;
      }
      case 'accident': {
        if (!ground) return;
        const cars = W.traffic.vehicles.filter((v) => v.state === 'lane' && !v.fleet && dist(v.x, v.z, ground.x, ground.z) < 70).sort((a, b) => dist(a.x, a.z, ground.x, ground.z) - dist(b.x, b.z, ground.x, ground.z));
        if (cars.length < 2) return say('Not enough traffic there.');
        const [a, b] = cars;
        // the first car swerves into the second
        a.v = Math.max(a.v, 12); b.v = Math.max(b.v, 6);
        W.traffic.crashPair(a, b);
        const nx = b.x - a.x, nz = b.z - a.z;
        a.x = b.x - nx * 0.4; a.z = b.z - nz * 0.4;
        say('💥 Collision! Emergency services have been called.');
        break;
      }
      case 'surge': { const n = D.trafficSurge(); say(`🚗 ${n} drivers just decided to go somewhere. Good luck.`); break; }
      case 'crime': D.crimeWave(); say('🦹 Desperation spreads. Expect robberies and stolen cars.'); break;
      case 'riot': if (ground) { const r = D.riot(ground.x, ground.z); say(`📢 ${r.members.length} angry citizens take to the streets.`); } break;
      case 'animals': D.escapeAnimals(); say('🐘 The zoo gates are open. Police are on the way.'); break;
      case 'tornado': if (ground) { D.tornado(ground.x, ground.z); say('🌪 Tornado on the ground!'); g.audio && g.audio.siren(true); } break;
      case 'meteor': if (ground) { D.meteor(ground.x, ground.z); say('☄ Something is falling from the sky…'); } break;
      case 'flood': D.startFlood(); say('🌊 The river is rising.'); break;
      case 'boom': D.economy(1); say('📈 Money is flowing. New businesses will open.'); break;
      case 'crash': D.economy(-1); say('📉 The markets crashed. Layoffs and closures will follow.'); break;
      case 'night': W.time = Math.ceil((W.time - 21 * 60) / 1440) * 1440 + 21 * 60; break;
      case 'morning': W.time = Math.ceil((W.time - 7 * 60) / 1440) * 1440 + 7 * 60; break;
      case 'anomaly': W.anomalies && W.anomalies.force(); say('…'); break;
      default:
        if (t.weather) { W.weather.set(t.weather, 480, true); if (t.weather === 'snow' || t.weather === 'blizzard') W.weather.temp = -4; say(`Weather: ${t.label}`); }
    }
  }
}

function nearestBuilding(W, x, z) {
  let best = null, bd = 40;
  for (const b of W.city.buildings) { const d = dist(b.x, b.z, x, z); if (d < bd) { bd = d; best = b; } }
  return best;
}
function btn(t, active, on) { return `<button data-tool="${t.id}" class="${(active && active.id === t.id) || on ? 'on' : ''} ${t.exe ? 'exe' : ''}"><b>${t.icon}</b>${t.label}</button>`; }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
