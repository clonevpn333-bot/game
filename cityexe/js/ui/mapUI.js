// The city map (M): every task pinned with its deadline, home, work, you;
// click a pin or a list entry to route there, or click anywhere on the map
// to drop your own pin on the nearest building.
import { openPanel, esc } from './panels.js';
import { C } from '../sim/config.js';
import { dist } from '../core/math.js';

export class MapUI {
  constructor(game) {
    this.game = game;
    game.world.on('task', (t) => this.onTask(t));
    addEventListener('keydown', (e) => {
      if (e.code !== 'KeyM' || game.mode !== 'possess' || document.querySelector('.panel-modal') || e.target.tagName === 'INPUT') return;
      e.preventDefault(); this.open();
    });
  }
  get W() { return this.game.world; }
  route(t) { this.game.waypoint = { x: t.x, z: t.z, b: t.b, label: t.label }; }
  onTask(t) {
    const g = this.game;
    if (!g.lifeMode && !(g.possession && g.possession.c)) return;
    this.route(t);
    g.toast(`${t.icon} ${t.label} — marked on your map (M). Follow the yellow marker.`, 5);
  }
  pins() {
    const W = this.W, c = this.game.possession?.c;
    const out = W.tasks ? W.tasks.active().map((t) => ({ ...t, task: true })) : [];
    if (c) {
      const home = W.city.buildings[c.home];
      if (home && !c.homeless) out.push({ key: 'home', icon: '🏠', label: 'Home', b: home.id, x: home.door[0], z: home.door[1], place: W.citizenAI.buildingName(home.id) });
      if (c.job) { const wb = W.city.buildings[W.economy.biz[c.job.biz]?.b]; if (wb) out.push({ key: 'work', icon: '💼', label: 'Work', b: wb.id, x: wb.door[0], z: wb.door[1], place: W.citizenAI.buildingName(wb.id) }); }
      const p = W.citizenPos(c) || { x: 0, z: 0 };
      for (const [type, icon, label] of [['nightclub', '🪩', 'Nightclub'], ['casino', '🎰', 'Casino'], ['bank', '🏦', 'Bank'], ['grocery', '🛒', 'Grocery'], ['gunstore', '🔫', 'Gun store'], ['bar', '🍺', 'Bar'], ['hospital', '🏥', 'Hospital'], ['police', '🚔', 'Police']]) {
        const near = W.economy.ofType(type).map((bz) => W.city.buildings[bz.b]).filter(Boolean).sort((a, b) => dist(a.x, a.z, p.x, p.z) - dist(b.x, b.z, p.x, p.z))[0];
        if (near) out.push({ key: 'poi-' + type, icon, label, b: near.id, x: near.door[0], z: near.door[1], place: W.citizenAI.buildingName(near.id), poi: true });
      }
    }
    return out;
  }
  open() {
    const g = this.game, W = this.W, hud = g.hud;
    if (!hud || !hud.mmBase) return;
    const c = g.possession?.c;
    const pos = (c && W.citizenPos(c)) || { x: 0, z: 0 };
    const pins = this.pins();
    const S = 560, s = S / (C.HALF * 2 + 160);
    const tx = (x) => (x + C.HALF + 80) * s;
    const fmt = (t) => (t.until != null ? ` · ${Math.max(0, Math.round((t.until - W.time) / 60 * 10) / 10)} h left` : '');
    const d = (t) => `${Math.round(dist(t.x, t.z, pos.x, pos.z))} m`;
    const tasks = pins.filter((t) => t.task), places = pins.filter((t) => !t.task);
    const row = (t, i) => `<button class="mp-row ${g.waypoint && Math.abs(g.waypoint.x - t.x) < 1 && Math.abs(g.waypoint.z - t.z) < 1 ? 'sel' : ''}" data-pin="${i}"><span>${t.icon}</span><span><b>${esc(t.label)}</b><small>${esc(t.place || '')} · ${d(t)}${fmt(t)}</small></span></button>`;
    const html = `<div class="mp"><canvas width="${S}" height="${S}"></canvas><div class="mp-side">
      <h4>Tasks</h4>${tasks.map((t) => row(t, pins.indexOf(t))).join('') || '<p class="muted">Nothing pending. Check your phone and objectives.</p>'}
      <h4>Places</h4>${places.map((t) => row(t, pins.indexOf(t))).join('')}
      ${g.waypoint ? '<button data-clear class="danger">Clear route</button>' : ''}
      <p class="muted"><small>Click a pin or a row to route there. Click anywhere on the map to drop your own pin.</small></p></div></div>`;
    openPanel(g, {
      title: '🗺 City map', cls: 'wide', html,
      onBind: (a) => {
        const cv = a.el.querySelector('canvas'), x = cv.getContext('2d');
        x.drawImage(hud.mmBase, 0, 0, S, S);
        const pin = (t, i) => {
          const px = tx(t.x), pz = tx(t.z);
          const routed = g.waypoint && Math.abs(g.waypoint.x - t.x) < 1 && Math.abs(g.waypoint.z - t.z) < 1;
          x.fillStyle = t.task ? (routed ? '#ffd040' : '#ffb030') : routed ? '#ffd040' : 'rgba(255,255,255,0.75)';
          x.beginPath(); x.arc(px, pz, t.task ? 9 : 6.5, 0, Math.PI * 2); x.fill();
          x.font = `${t.task ? 12 : 10}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t.icon, px, pz + 1);
          if (t.task) { x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textBaseline = 'bottom'; x.fillText(t.label.slice(0, 28), px, pz - 11); }
          void i;
        };
        pins.filter((t) => !t.task).forEach(pin); pins.filter((t) => t.task).forEach(pin);
        if (g.waypoint && !pins.some((t) => Math.abs(g.waypoint.x - t.x) < 1 && Math.abs(g.waypoint.z - t.z) < 1)) { x.fillStyle = '#ffd040'; x.beginPath(); x.arc(tx(g.waypoint.x), tx(g.waypoint.z), 8, 0, Math.PI * 2); x.fill(); }
        // you
        x.save(); x.translate(tx(pos.x), tx(pos.z)); x.rotate(-(c?.ped?.h ?? 0) + Math.PI);
        x.fillStyle = '#5fe3d0'; x.beginPath(); x.moveTo(0, -9); x.lineTo(7, 7); x.lineTo(0, 3); x.lineTo(-7, 7); x.closePath(); x.fill(); x.restore();
        const go = (t) => { this.route(t); g.toast(`Route set: ${t.label}${t.place ? ` (${t.place})` : ''}`, 3); a.close(); };
        a.el.querySelectorAll('[data-pin]').forEach((b) => b.onclick = () => go(pins[+b.dataset.pin]));
        a.el.querySelectorAll('[data-clear]').forEach((b) => b.onclick = () => { g.waypoint = null; a.close(); });
        cv.onclick = (ev) => {
          const r = cv.getBoundingClientRect();
          const mx = (ev.clientX - r.left) / r.width * S, mz = (ev.clientY - r.top) / r.height * S;
          const hit = pins.find((t) => Math.hypot(tx(t.x) - mx, tx(t.z) - mz) < 11);
          if (hit) return go(hit);
          const wx = mx / s - C.HALF - 80, wz = mz / s - C.HALF - 80;
          let best = null, bd = 60;
          for (const b of W.city.buildings) { const dd = dist(b.x, b.z, wx, wz); if (dd < bd) { bd = dd; best = b; } }
          if (best) go({ x: best.door[0], z: best.door[1], b: best.id, label: 'Your pin', place: W.citizenAI.buildingName(best.id) });
          else go({ x: wx, z: wz, label: 'Your pin' });
        };
      },
    });
  }
}
