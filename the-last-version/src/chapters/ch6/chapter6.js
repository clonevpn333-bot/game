// CHAPTER 6 — THE GENERAL. Real-time tactics on an inked war map.
// The world goes abstract: the valley is paper, the armies are tokens in military symbols.
// Infantry beat cavalry, cavalry beat archers, archers wear down infantry; flanks and rear
// attacks break morale; units rout and rally; forests hide from arrows, hills hold; the river
// is crossed only at the bridge and the ford; line or column formations; a catapult that does
// not care whose men it lands on; tactical pause. Venn commands the other side. Every token has
// a name, and the map never shows you the people — until they're crossed out.
import { overlay2D, rng } from '../../engine/canvas2d.js';
import { wait } from '../../engine/ui.js';
import { setFlag } from '../../game/state.js';

const MAP = { w: 1600, h: 1000 };
const CORE = { x: 800, y: 175, r: 120 }, CAMP = { x: 800, y: 905, r: 95 };
const riverY = (x) => 478 + Math.sin(x / 240) * 58 + Math.sin(x / 90) * 10;
const CROSSINGS = [{ x: 420, w: 34, name: 'bridge' }, { x: 1185, w: 46, name: 'ford' }];
const FORESTS = [[290, 250, 95], [1310, 300, 105], [450, 735, 90], [1150, 710, 100], [930, 610, 60]];
const HILLS = [[CORE.x, CORE.y, 150], [300, 610, 85], [1260, 230, 80]];
const TYPES = {
  inf: { label: 'INFANTRY', speed: 22, reach: 18, dps: 5.2, max: 120 },
  cav: { label: 'CAVALRY', speed: 52, reach: 18, dps: 6.8, max: 80 },
  arc: { label: 'ARCHERS', speed: 24, reach: 12, range: 175, dps: 3.4, max: 70 },
  sie: { label: 'CATAPULT', speed: 12, reach: 8, range: 310, dps: 0, max: 40 },
};
const MATCH = { inf: { cav: 1.6 }, cav: { arc: 1.9, sie: 2, inf: 0.6 }, arc: { inf: 1.3 } };
const NAMES = ['Merrin', 'Halloway', 'Asta', 'Corwin', 'Vael', 'Brannock', 'Idris', 'Tamsin', 'Oduya', 'Pell', 'Rhoswen', 'Ketter', 'Marlo', 'Senna', 'Yorick', 'Daleth'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const inForest = (x, y) => FORESTS.some(([fx, fy, r]) => Math.hypot(x - fx, y - fy) < r);
const onHill = (x, y) => HILLS.some(([hx, hy, r]) => Math.hypot(x - hx, y - hy) < r * 0.8);
const side = (y, x) => (y < riverY(x) ? -1 : 1);

export default class Chapter6 {
  constructor(game) { this.game = game; this.usesPointerLock = false; }

  async load(cp) {
    this.O = overlay2D(this.game, { cursor: 'crosshair' });
    this.paper = this.drawPaper();
    this.reset(cp);
  }

  // ---------------------------------------------------------------- the map, inked once
  drawPaper() {
    const c = document.createElement('canvas'); c.width = MAP.w * 2; c.height = MAP.h * 2; const g = c.getContext('2d'); g.scale(2, 2);
    const R = rng(66);
    g.fillStyle = '#e6d9bb'; g.fillRect(0, 0, MAP.w, MAP.h);
    for (let i = 0; i < 9000; i++) { const v = R(); g.fillStyle = `rgba(${v < 0.5 ? '120,90,50' : '255,250,235'},${R() * 0.05})`; g.fillRect(R() * MAP.w, R() * MAP.h, 2 + R() * 5, 2 + R() * 5); }
    for (let i = 0; i < 14; i++) { const x = R() * MAP.w, y = R() * MAP.h, r = 30 + R() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,110,60,0.12)'); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const ink = (a = 0.85) => `rgba(42,32,24,${a})`;
    // hills: contour rings and hachures
    for (const [x, y, r] of HILLS) { for (let k = 1; k <= 4; k++) { g.strokeStyle = ink(0.35); g.lineWidth = 1; g.beginPath(); for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, rr = r * (k / 4) * (1 + Math.sin(t * 3 + k) * 0.08); a ? g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.75) : g.moveTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * 0.75); } g.stroke(); }
      for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(t) * r, y + Math.sin(t) * r * 0.75); g.lineTo(x + Math.cos(t) * r * 1.12, y + Math.sin(t) * r * 0.84); g.stroke(); } }
    // forests: little inked trees
    for (const [x, y, r] of FORESTS) for (let i = 0; i < r * 0.9; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d * 0.8; g.strokeStyle = ink(0.6); g.fillStyle = 'rgba(70,100,50,0.25)'; g.beginPath(); g.arc(tx, ty - 6, 6, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx, ty + 6); g.stroke(); }
    // roads
    g.setLineDash([8, 6]); g.strokeStyle = ink(0.5); g.lineWidth = 2;
    g.beginPath(); g.moveTo(CAMP.x, CAMP.y); g.bezierCurveTo(700, 760, 450, 640, 420, 490); g.bezierCurveTo(400, 380, 650, 260, CORE.x, CORE.y); g.stroke();
    g.beginPath(); g.moveTo(CAMP.x, CAMP.y); g.bezierCurveTo(950, 760, 1180, 640, 1185, 500); g.bezierCurveTo(1190, 380, 950, 260, CORE.x, CORE.y); g.stroke();
    g.setLineDash([]);
    // the river
    g.lineCap = 'round';
    for (const [w, col] of [[30, 'rgba(70,110,150,0.35)'], [3, 'rgba(40,60,90,0.8)']]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let x = 0; x <= MAP.w; x += 8) x ? g.lineTo(x, riverY(x)) : g.moveTo(x, riverY(x)); g.stroke(); }
    for (let x = 0; x < MAP.w; x += 14) { g.strokeStyle = 'rgba(40,60,90,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, riverY(x) - 6); g.lineTo(x + 7, riverY(x + 7) - 6); g.stroke(); }
    // bridge and ford
    { const b = CROSSINGS[0], y = riverY(b.x); g.fillStyle = '#d8c8a0'; g.strokeStyle = ink(); g.lineWidth = 2; g.fillRect(b.x - b.w / 2, y - 24, b.w, 48); g.strokeRect(b.x - b.w / 2, y - 24, b.w, 48); for (let k = -18; k <= 18; k += 6) { g.beginPath(); g.moveTo(b.x - b.w / 2, y + k); g.lineTo(b.x + b.w / 2, y + k); g.stroke(); } }
    { const f = CROSSINGS[1], y = riverY(f.x); g.setLineDash([3, 4]); g.strokeStyle = ink(0.7); for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(f.x - f.w / 2 + 6, y - 24 + k * 3); g.lineTo(f.x + f.w / 2 - 6, y + 24 + k * 3); g.stroke(); } g.setLineDash([]); }
    // the camp, the village and the Version Core
    g.strokeStyle = ink(); g.lineWidth = 2; g.beginPath(); g.arc(CAMP.x, CAMP.y, CAMP.r, 0, Math.PI * 2); g.setLineDash([10, 6]); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, x = CAMP.x + Math.cos(a) * 45, y = CAMP.y + Math.sin(a) * 35; g.beginPath(); g.moveTo(x - 9, y + 7); g.lineTo(x, y - 9); g.lineTo(x + 9, y + 7); g.closePath(); g.stroke(); }
    for (let i = 0; i < 9; i++) { const x = 1020 + (i % 3) * 22, y = 840 + Math.floor(i / 3) * 18; g.strokeRect(x, y, 14, 10); g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 7, y - 7); g.lineTo(x + 16, y); g.stroke(); }
    g.font = 'italic 16px Georgia, serif'; g.fillStyle = ink(0.75);
    g.fillText('Arlen Water', 620, riverY(620) + 36); g.fillText('Mill', 1040, 905); g.fillText('Camp', CAMP.x - 18, CAMP.y + CAMP.r + 22); g.fillText('The Kept Hill', CORE.x - 50, CORE.y + 115);
    g.font = '13px Georgia, serif'; g.fillText('bridge', CROSSINGS[0].x + 22, riverY(CROSSINGS[0].x) + 4); g.fillText('ford', CROSSINGS[1].x + 28, riverY(CROSSINGS[1].x) + 4);
    // compass rose and frame
    g.strokeStyle = ink(0.7); g.lineWidth = 1.5; g.save(); g.translate(1490, 110); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, i % 2 ? -26 : -46); g.stroke(); } g.restore(); g.font = 'bold 15px Georgia, serif'; g.fillText('N', 1484, 52);
    g.lineWidth = 6; g.strokeRect(8, 8, MAP.w - 16, MAP.h - 16); g.lineWidth = 1; g.strokeRect(18, 18, MAP.w - 36, MAP.h - 36);
    return c;
  }

  // ---------------------------------------------------------------- armies
  unit(team, type, x, y, face = team === 'blue' ? -Math.PI / 2 : Math.PI / 2) {
    const T = TYPES[type];
    const u = { id: this.uid++, team, type, x, y, face, str: T.max, max: T.max, morale: 100, order: null, target: null, form: 'line', state: 'idle', rallyT: 0, fireT: Math.random() * 2, name: team === 'blue' ? `${NAMES[this.nameI++ % NAMES.length]} ${T.label.toLowerCase()}` : `${T.label.toLowerCase()} of the Kept`, sel: false };
    this.units.push(u); return u;
  }
  reset() {
    this.units = []; this.uid = 0; this.nameI = 0; this.shots = []; this.marks = []; this.floaters = [];
    const B = (t, x, y) => this.unit('blue', t, x, y);
    B('inf', 690, 790); B('inf', 760, 780); B('inf', 840, 780); B('inf', 910, 790); B('arc', 730, 840); B('arc', 870, 840); B('cav', 600, 830); B('cav', 1000, 830); B('sie', 800, 870);
    const R = (t, x, y, grp) => { const u = this.unit('red', t, x, y); u.grp = grp; u.home = { x, y }; return u; };
    R('inf', 740, 240, 'garrison'); R('inf', 860, 240, 'garrison'); R('arc', 800, 160, 'garrison');
    R('cav', 1300, 250, 'cav'); R('cav', 1340, 300, 'cav');
    R('inf', 470, 330, 'assault'); R('inf', 540, 320, 'assault'); R('inf', 400, 300, 'assault'); R('arc', 470, 260, 'assault');
    this.t = 0; this.paused = false; this.capture = 0; this.campThreat = 0; this.over = false; this.said = new Set(); this.reinforced = 0;
    this.cam = { x: MAP.w / 2, y: MAP.h / 2, z: 0 }; this.fitZoom(); this.drag = null;
  }
  fitZoom() { this.cam.z = Math.min(this.O.W / (MAP.w + 80), this.O.H / (MAP.h + 120)); this.cam.min = this.cam.z; this.cam.x = MAP.w / 2; this.cam.y = MAP.h / 2 + 20; }

  start() {
    const g = this.game;
    g.music.play('table', { intensity: 0.2 });
    this.intro();
  }
  async restart() { this.game.ui.subs.innerHTML = ''; this.reset(); this.paused = false; this.introDone = true; }
  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); this.game.ui.conversation(lines, () => this.disposed); }

  async intro() {
    const g = this.game, ui = g.ui;
    this.introDone = false; this.paused = true;
    ui.fadeColor('#fff6e0'); await ui.fade(1, 0.01); ui.fade(0, 2);
    ui.letterbox(true);
    await ui.say('NONE', '<i>The Works fold shut. Canvas walls, a lamp, a table. On the table, the valley.</i>', { duration: 3.2 });
    ui.chapterCard(6, 'THE GENERAL', 'Real-time tactics', 3);
    await ui.say('ANCHOR', 'COMMAND PRIVILEGES: GRANTED. LOCAL VERSION: THE TABLE.', { duration: 2.8 });
    await ui.say('SERA', 'It\'s the same valley, Kai. From above. Those blue blocks are the men we fought beside.', { duration: 3.4 });
    await ui.say('VENN', 'Mr. Voss. In this version nobody bleeds. They are simply… removed from the table. Shall we?', { duration: 3.8 });
    ui.letterbox(false);
    ui.objective('Take the Kept Hill', 'Clear it and hold it with no enemy on it · don\'t lose the camp');
    ui.hint('<b>Click</b> or <b>drag</b> to select · <b>Right-click</b> to move / attack · <kbd>F</kbd> line ⇄ column · <kbd>Space</kbd> pause · <kbd>WASD</kbd> pan · wheel zoom · <kbd>A</kbd>+<kbd>Ctrl</kbd> select all', 12000);
    this.introDone = true; this.paused = false;
    g.music.play('table', { intensity: 0.5 });
  }

  // ---------------------------------------------------------------- input
  toMap(sx, sy) { return { x: (sx - this.O.W / 2) / this.cam.z + this.cam.x, y: (sy - this.O.H / 2) / this.cam.z + this.cam.y }; }
  input(dt) {
    const O = this.O, m = O.mouse, inp = this.game.input, cam = this.cam;
    const pan = 520 / cam.z * dt;
    if (inp.any('KeyW', 'ArrowUp')) cam.y -= pan; if (inp.any('KeyS', 'ArrowDown')) cam.y += pan;
    if (inp.any('KeyA', 'ArrowLeft') && !inp.any('ControlLeft', 'ControlRight')) cam.x -= pan; if (inp.any('KeyD', 'ArrowRight')) cam.x += pan;
    if (m.wheel) { const before = this.toMap(m.x, m.y); cam.z = clamp(cam.z * (m.wheel < 0 ? 1.15 : 1 / 1.15), cam.min, cam.min * 3.2); const after = this.toMap(m.x, m.y); cam.x += before.x - after.x; cam.y += before.y - after.y; }
    cam.x = clamp(cam.x, 0, MAP.w); cam.y = clamp(cam.y, 0, MAP.h);
    if (inp.hit('Space')) { this.paused = !this.paused; this.game.audio.ui('click'); }
    const mine = this.units.filter((u) => u.team === 'blue' && u.str > 0);
    if (inp.hit('KeyA') && inp.any('ControlLeft', 'ControlRight')) for (const u of mine) u.sel = true;
    if (inp.hit('KeyF')) { for (const u of mine) if (u.sel) u.form = u.form === 'line' ? 'column' : 'line'; this.game.audio.ui('click'); }
    if (inp.hit('KeyH')) for (const u of mine) if (u.sel) { u.order = null; u.target = null; }
    const p = this.toMap(m.x, m.y);
    if (m.pressed.has(0)) this.drag = { x0: m.x, y0: m.y };
    if (m.released.has(0) && this.drag) {
      const add = inp.any('ShiftLeft', 'ShiftRight');
      if (!add) for (const u of mine) u.sel = false;
      const dx = Math.abs(m.x - this.drag.x0), dy = Math.abs(m.y - this.drag.y0);
      if (dx < 6 && dy < 6) { const hit = mine.filter((u) => dist(u, p) < 26).sort((a, b) => dist(a, p) - dist(b, p))[0]; if (hit) hit.sel = !add || !hit.sel; }
      else { const a = this.toMap(Math.min(m.x, this.drag.x0), Math.min(m.y, this.drag.y0)), b = this.toMap(Math.max(m.x, this.drag.x0), Math.max(m.y, this.drag.y0)); for (const u of mine) if (u.x > a.x && u.x < b.x && u.y > a.y && u.y < b.y) u.sel = true; }
      this.drag = null;
      if (mine.some((u) => u.sel)) this.game.audio.ui('click');
    }
    if (m.pressed.has(2)) {
      const sel = mine.filter((u) => u.sel && u.state !== 'rout'); if (!sel.length) return;
      const foe = this.units.filter((u) => u.team === 'red' && u.str > 0).find((u) => dist(u, p) < 28);
      if (foe) { for (const u of sel) { u.target = foe; u.order = null; } this.orderMark(foe.x, foe.y, true); }
      else {
        // spread the group into a line facing the direction of travel
        const cx = sel.reduce((s, u) => s + u.x, 0) / sel.length, cy = sel.reduce((s, u) => s + u.y, 0) / sel.length;
        const dir = Math.atan2(p.y - cy, p.x - cx), px = -Math.sin(dir), py = Math.cos(dir);
        const order = sel.slice().sort((a, b) => ((a.x - cx) * px + (a.y - cy) * py) - ((b.x - cx) * px + (b.y - cy) * py));
        order.forEach((u, i) => { const o = (i - (order.length - 1) / 2) * 48; u.order = { x: p.x + px * o, y: p.y + py * o, face: dir }; u.target = null; });
        this.orderMark(p.x, p.y, false);
      }
      this.game.audio.tone({ freq: 520, freqEnd: 400, dur: 0.06, vol: 0.06 });
    }
  }
  orderMark(x, y, attack) { this.marks.push({ x, y, t: 0, attack }); }

  // ---------------------------------------------------------------- simulation
  waypoint(u, goal) {
    // crossing the river only at the bridge or the ford
    if (side(u.y, u.x) === side(goal.y, goal.x)) return goal;
    const c = CROSSINGS.slice().sort((a, b) => (Math.abs(a.x - u.x) + Math.abs(a.x - goal.x)) - (Math.abs(b.x - u.x) + Math.abs(b.x - goal.x)))[0];
    const ry = riverY(c.x), s = side(u.y, u.x);
    if (Math.abs(u.x - c.x) > c.w * 0.3 || Math.abs(u.y - ry) > 34) return { x: c.x, y: ry + s * 30 };
    return { x: c.x, y: ry - s * 34 };
  }
  step(dt) {
    this.t += dt;
    const alive = this.units.filter((u) => u.str > 0);
    const foesOf = (u) => alive.filter((o) => o.team !== u.team);
    for (const u of alive) {
      const T = TYPES[u.type];
      const foes = foesOf(u);
      let near = null, nd = 1e9; for (const f of foes) { const d = dist(u, f); if (d < nd) { nd = d; near = f; } }
      const rad = u.form === 'line' ? 22 : 14;
      // rout: flee, then rally
      if (u.state === 'rout') {
        u.rallyT -= dt;
        const away = near ? Math.atan2(u.y - near.y, u.x - near.x) : (u.team === 'blue' ? Math.PI / 2 : -Math.PI / 2);
        this.move(u, { x: u.x + Math.cos(away) * 100, y: u.y + Math.sin(away) * 100 }, T.speed * 1.25, dt);
        if (u.rallyT < 0 && (!near || nd > 150)) { u.state = 'idle'; u.morale = 45; this.floater(u, 'RALLIED'); }
        if (u.x < 0 || u.y < 0 || u.x > MAP.w || u.y > MAP.h) { u.str = 0; this.cross(u, 'fled'); }
        continue;
      }
      // melee contact
      const contact = near && nd < rad + 20 + T.reach;
      u.fighting = contact ? near : null;
      if (contact) {
        u.face = Math.atan2(near.y - u.y, near.x - u.x);
        this.strike(u, near, T.dps * (u.type === 'arc' ? 0.4 : 1) * (u.type === 'sie' ? 0.2 : 1), dt);
        u.state = 'fight';
      } else {
        // ranged: archers and the catapult shoot whatever they can see
        if (T.range) {
          const tgt = (u.target && u.target.str > 0 && dist(u, u.target) < T.range ? u.target : null) || foes.filter((f) => dist(u, f) < T.range).sort((a, b) => dist(u, a) - dist(u, b))[0];
          if (tgt) {
            u.face = Math.atan2(tgt.y - u.y, tgt.x - u.x);
            if (u.type === 'arc') { this.strike(u, tgt, T.dps * (inForest(tgt.x, tgt.y) ? 0.45 : 1), dt, true); u.fireT -= dt; if (u.fireT < 0) { u.fireT = 0.35; this.shots.push({ x: u.x, y: u.y, tx: tgt.x + (Math.random() - 0.5) * 30, ty: tgt.y + (Math.random() - 0.5) * 20, t: 0, T: 0.6, kind: 'arrow' }); } }
            if (u.type === 'sie') { u.fireT -= dt; if (u.fireT < 0) { u.fireT = 4.2; this.shots.push({ x: u.x, y: u.y, tx: tgt.x + (Math.random() - 0.5) * 30, ty: tgt.y + (Math.random() - 0.5) * 30, t: 0, T: 1.6, kind: 'stone', team: u.team }); this.game.audio.burst({ freq: 300, freqEnd: 90, type: 'lowpass', dur: 0.25, vol: 0.3 }); } }
            if (!u.order && !u.target) { u.state = 'idle'; continue; }
          }
        }
        // orders
        let goal = null;
        if (u.target && u.target.str > 0) goal = { x: u.target.x, y: u.target.y }; else u.target = null;
        if (!goal && u.order) goal = u.order;
        if (u.team === 'red' && !goal) goal = this.redThink(u, near, nd);
        if (goal && (dist(u, goal) > 6 || u.target)) {
          const spd = T.speed * (u.form === 'column' ? 1.3 : 0.85) * (inForest(u.x, u.y) && u.type !== 'inf' ? 0.55 : 1) * (onHill(u.x, u.y) ? 0.85 : 1);
          this.move(u, this.waypoint(u, goal), spd, dt); u.state = 'move';
        } else { if (u.order && u.order.face !== undefined) u.face += wrap(u.order.face - u.face) * Math.min(1, dt * 3); u.order = null; u.state = 'idle'; }
      }
      // morale: recovers out of the fight, collapses under losses and flanking
      if (!u.fighting) u.morale = Math.min(100, u.morale + dt * (u.str / u.max > 0.3 ? 2.5 : 0.6));
      if (u.morale < 18 && u.str > 0) { u.state = 'rout'; u.rallyT = 7; u.sel = false; u.target = null; u.order = null; this.floater(u, 'ROUTING'); if (u.team === 'blue') this.game.audio.burst({ freq: 600, freqEnd: 200, dur: 0.4, vol: 0.2 }); }
    }
    // separation between tokens
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) { const a = alive[i], b = alive[j], d = dist(a, b), m = 30; if (d < m && d > 0.01) { const k = (m - d) / 2 / d; const fa = a.team !== b.team ? 0.3 : 1; a.x -= (b.x - a.x) * k * fa; a.y -= (b.y - a.y) * k * fa; b.x += (b.x - a.x) * k * fa; b.y += (b.y - a.y) * k * fa; } }
    // missiles
    for (let i = this.shots.length - 1; i >= 0; i--) { const s = this.shots[i]; s.t += dt; if (s.t >= s.T) { if (s.kind === 'stone') this.stoneLands(s); this.shots.splice(i, 1); } }
    for (let i = this.marks.length - 1; i >= 0; i--) if ((this.marks[i].t += dt) > 0.9) this.marks.splice(i, 1);
    for (let i = this.floaters.length - 1; i >= 0; i--) if ((this.floaters[i].t += dt) > 2.6) this.floaters.splice(i, 1);
    this.objectives(dt, alive);
  }
  move(u, goal, speed, dt) {
    const a = Math.atan2(goal.y - u.y, goal.x - u.x);
    u.face += wrap(a - u.face) * Math.min(1, dt * 4);
    const nx = u.x + Math.cos(a) * speed * dt, ny = u.y + Math.sin(a) * speed * dt;
    // the river stops you anywhere but a crossing
    const crossing = CROSSINGS.some((c) => Math.abs(nx - c.x) < c.w * 0.5);
    if (!crossing && Math.abs(ny - riverY(nx)) < 16) return;
    u.x = clamp(nx, -60, MAP.w + 60); u.y = clamp(ny, -60, MAP.h + 60);
  }
  strike(a, b, dps, dt, ranged = false) {
    let k = dps * Math.sqrt(a.str / a.max) * (MATCH[a.type]?.[b.type] || 1);
    if (a.form === 'line') k *= 1.15; else k *= 0.75;
    if (b.form === 'column' && !ranged) k *= 1.25;
    if (onHill(b.x, b.y) && !onHill(a.x, a.y)) k *= 0.75;
    // flanks: blows from the side and rear land harder and shatter morale
    const from = Math.atan2(a.y - b.y, a.x - b.x), off = Math.abs(wrap(from - b.face));
    const flank = !ranged && off > 1.0 ? (off > 2.0 ? 2.2 : 1.5) : 1;
    if (a.type === 'cav' && a.state === 'move') k *= 1.6; // the charge
    k *= flank;
    b.str -= k * dt; b.morale -= k * dt * (0.55 + (flank - 1) * 0.8);
    if (flank > 1 && b.team === 'blue') this.line('flank', [['SERA', 'They\'re hitting us from the side — turn them, or they\'ll break!']]);
    if (b.str <= 6 && b.str + k * dt > 6) { b.str = 0; this.cross(b, 'killed'); }
  }
  stoneLands(s) {
    this.game.audio.explosion(null, 0.25);
    this.marks.push({ x: s.tx, y: s.ty, t: 0, splash: true });
    for (const u of this.units) if (u.str > 0 && Math.hypot(u.x - s.tx, u.y - s.ty) < 30) { u.str -= 20; u.morale -= 18; if (u.team === s.team) this.line('ff', [['SERA', 'Kai — that stone landed on our own line.']]); if (u.str <= 6) { u.str = 0; this.cross(u, 'killed'); } }
  }
  cross(u, how) {
    this.floater(u, u.team === 'blue' ? `${u.name.toUpperCase()} — ${how === 'fled' ? 'SCATTERED' : 'STRUCK FROM THE TABLE'}` : 'REMOVED');
    u.deadAt = { x: u.x, y: u.y };
    this.game.audio.tone({ freq: u.team === 'blue' ? 180 : 330, freqEnd: u.team === 'blue' ? 90 : 220, dur: 0.4, vol: 0.12 });
    if (u.team === 'blue') {
      this.losses = (this.losses || 0) + 1;
      if (this.losses === 1) this.line('loss1', [['SERA', `That was the ${u.name.split(' ')[0]} company. Twelve of them were from the mill.`], ['VENN', 'On the table, Sera, they\'re a colour.']]);
      if (this.losses === 3) this.line('loss3', [['KAI', 'Stop narrating them.'], ['SERA', 'Somebody has to remember them.']]);
    }
  }
  floater(u, text) { this.floaters.push({ x: u.x, y: u.y, text, t: 0, team: u.team }); }

  /** Venn's generalship: a garrison that holds the hill, a cavalry wing hunting soft targets, an assault column. */
  redThink(u, near, nd) {
    const blue = this.units.filter((b) => b.team === 'blue' && b.str > 0 && b.state !== 'rout');
    if (u.grp === 'garrison') {
      const intruder = blue.filter((b) => dist(b, CORE) < CORE.r + 60).sort((a, b) => dist(u, a) - dist(u, b))[0];
      if (intruder && u.type !== 'arc' && dist(u, u.home) < 220) return { x: intruder.x, y: intruder.y };
      return u.home;
    }
    if (u.grp === 'cav') {
      // hunt archers and the catapult that stray from their infantry
      const soft = blue.filter((b) => (b.type === 'arc' || b.type === 'sie') && !blue.some((o) => o.type === 'inf' && dist(o, b) < 70)).sort((a, b) => dist(u, a) - dist(u, b))[0];
      if (soft && this.t > 25) { this.line('cav', [['SERA', 'Their horse is going for our archers! Put spears beside them!']]); return { x: soft.x, y: soft.y }; }
      if (u.str < u.max * 0.4) return u.home;
      if (near && nd < 120 && near.type !== 'inf') return { x: near.x, y: near.y };
      return u.home;
    }
    if (u.grp === 'assault') {
      if (this.t < 50) return u.home;
      if (near && nd < 260) return { x: near.x, y: near.y };
      this.line('assault', [['VENN', 'Your camp, Mr. Voss. Who\'s watching your camp?']]);
      return { x: CAMP.x + (u.id % 3 - 1) * 40, y: CAMP.y };
    }
    return near && nd < 200 ? { x: near.x, y: near.y } : u.home || { x: u.x, y: u.y };
  }

  objectives(dt, alive) {
    if (this.over) return;
    const g = this.game, ui = g.ui;
    const blue = alive.filter((u) => u.team === 'blue'), red = alive.filter((u) => u.team === 'red');
    // reinforcements for Venn
    if (this.reinforced === 0 && this.t > 140 || this.reinforced === 1 && this.t > 260) {
      this.reinforced++;
      for (const [t, dx] of [['inf', -60], ['inf', 60], ['cav', 0]]) { const u = this.unit('red', t, 800 + dx, -20); u.grp = 'assault'; u.home = { x: 800 + dx, y: 280 }; }
      this.line('reinf' + this.reinforced, [['SERA', 'More of them, from the north road!'], ['VENN', 'There are always more pieces, Mr. Voss. That\'s rather the point of a table.']]);
    }
    // the hill: hold it with no enemy on it
    const holders = blue.filter((u) => u.state !== 'rout' && dist(u, CORE) < CORE.r), contest = red.some((u) => dist(u, CORE) < CORE.r);
    if (holders.length && !contest) { this.capture += dt; if (this.capture > 0.5) this.line('cap', [['VENN', 'You would delete a version to save one woman?'], ['KAI', 'I\'d stop you choosing.']]); }
    else this.capture = Math.max(0, this.capture - dt * 0.5);
    ui.objectiveDetail(`Hill ${Math.round(this.capture / 14 * 100)}% · your companies ${blue.length} · theirs ${red.length}`);
    if (this.capture >= 14) return this.victory();
    // the camp
    const raiders = red.filter((u) => dist(u, CAMP) < CAMP.r), guards = blue.filter((u) => dist(u, CAMP) < CAMP.r + 30);
    if (raiders.length && !guards.length) { this.campThreat += dt; this.line('campfall', [['SERA', 'The camp! They\'re in the camp!']]); } else this.campThreat = Math.max(0, this.campThreat - dt);
    if (this.campThreat > 15 || !blue.length) { this.over = true; g.fail(blue.length ? 'THE CAMP FELL' : 'THE LINE BROKE'); }
  }

  async victory() {
    this.over = true;
    const g = this.game, ui = g.ui;
    setFlag('ch6_losses', this.losses || 0);
    g.music.stop(2);
    for (const u of this.units) if (u.team === 'red' && u.str > 0) { u.state = 'rout'; u.rallyT = 99; }
    ui.objective(null);
    await ui.say('ANCHOR', 'THE KEPT HILL IS YOURS. THE TABLE IS FAILING.', { duration: 2.6 });
    this.dissolve = 0.001;
    await ui.say('VENN', 'Then go and see what a version costs from the inside. You won\'t like the view.', { duration: 3.4 });
    await ui.say('SERA', 'Kai… the ink is running. Everything\'s going square.', { duration: 2.8 });
    await wait(2600);
    ui.fadeColor('#000'); await ui.fade(1, 1.2);
    g.nextChapter();
  }

  // ---------------------------------------------------------------- frame
  update(dt) {
    const O = this.O;
    if (this.introDone && !this.over) this.input(dt);
    if (!this.paused) this.step(Math.min(dt, 0.05) * 1.5); // the table runs a little faster than life
    this.draw();
    O.endFrame();
    const engaged = this.units.some((u) => u.str > 0 && u.fighting);
    if (!this.over) this.game.music.setIntensity(this.paused ? 0.25 : engaged ? 0.9 : 0.5);
  }

  draw() {
    const O = this.O, g = O.ctx, cam = this.cam, W = O.W, H = O.H, z = cam.z;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#1a1410'; g.fillRect(0, 0, W, H);
    // the table: lamp-lit wood around the map
    const lamp = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); lamp.addColorStop(0, '#4a3422'); lamp.addColorStop(1, '#120c08'); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
    g.setTransform(z, 0, 0, z, W / 2 - cam.x * z, H / 2 - cam.y * z);
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30 * z; g.drawImage(this.paper, 0, 0, MAP.w, MAP.h); g.shadowBlur = 0;
    // the Version Core glyph: a cube drawn in ink that isn't quite ink
    { const t = this.t, k = Math.min(1, this.capture / 14); g.save(); g.translate(CORE.x, CORE.y); g.rotate(t * 0.2); g.strokeStyle = `rgba(${Math.round(40 + 200 * k)},${Math.round(32 + 120 * k)},24,0.9)`; g.lineWidth = 2.5; g.strokeRect(-18, -18, 36, 36); g.rotate(Math.PI / 4); g.strokeRect(-14, -14, 28, 28); g.restore();
      if (this.capture > 0) { g.strokeStyle = 'rgba(44,74,122,0.8)'; g.lineWidth = 5; g.beginPath(); g.arc(CORE.x, CORE.y, 40, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke(); } }
    // ink marks of the fallen
    g.lineWidth = 2.5;
    for (const u of this.units) if (u.str <= 0 && u.deadAt) { g.strokeStyle = u.team === 'blue' ? 'rgba(44,74,122,0.55)' : 'rgba(138,30,30,0.5)'; g.beginPath(); g.moveTo(u.deadAt.x - 12, u.deadAt.y - 12); g.lineTo(u.deadAt.x + 12, u.deadAt.y + 12); g.moveTo(u.deadAt.x + 12, u.deadAt.y - 12); g.lineTo(u.deadAt.x - 12, u.deadAt.y + 12); g.stroke(); }
    // orders: inked arrows
    for (const u of this.units) if (u.str > 0 && u.team === 'blue' && (u.order || u.target)) { const t = u.target || u.order; g.strokeStyle = u.target ? 'rgba(138,30,30,0.7)' : 'rgba(42,32,24,0.55)'; g.lineWidth = 2; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(t.x, t.y); g.stroke(); g.setLineDash([]); const a = Math.atan2(t.y - u.y, t.x - u.x); g.beginPath(); g.moveTo(t.x, t.y); g.lineTo(t.x - Math.cos(a - 0.4) * 12, t.y - Math.sin(a - 0.4) * 12); g.moveTo(t.x, t.y); g.lineTo(t.x - Math.cos(a + 0.4) * 12, t.y - Math.sin(a + 0.4) * 12); g.stroke(); }
    // tokens in military symbols
    for (const u of this.units) if (u.str > 0) this.drawToken(g, u);
    // missiles
    for (const s of this.shots) { const k = s.t / s.T, x = s.x + (s.tx - s.x) * k, y = s.y + (s.ty - s.y) * k - Math.sin(k * Math.PI) * (s.kind === 'stone' ? 120 : 30); g.fillStyle = g.strokeStyle = 'rgba(30,24,18,0.9)'; if (s.kind === 'stone') { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); } else { const a = Math.atan2(s.ty - s.y, s.tx - s.x); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); g.stroke(); } }
    for (const m of this.marks) { const k = m.t / 0.9; g.strokeStyle = m.splash ? `rgba(60,40,20,${0.6 * (1 - k)})` : m.attack ? `rgba(138,30,30,${1 - k})` : `rgba(42,32,24,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(m.x, m.y, (m.splash ? 30 : 10) + k * 14, 0, Math.PI * 2); g.stroke(); }
    // floating labels: the names the map leaves out
    for (const f of this.floaters) { const k = f.t / 2.6; g.font = `italic ${15 / Math.max(0.6, z)}px Georgia, serif`; g.fillStyle = f.team === 'blue' ? `rgba(30,50,90,${1 - k})` : `rgba(110,20,20,${1 - k})`; g.textAlign = 'center'; g.fillText(f.text, f.x, f.y - 30 - k * 24); g.textAlign = 'left'; }
    // selection box
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (this.drag) { const m = O.mouse; g.strokeStyle = 'rgba(240,230,200,0.9)'; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.strokeRect(this.drag.x0, this.drag.y0, m.x - this.drag.x0, m.y - this.drag.y0); g.setLineDash([]); }
    this.drawPanel(g);
    if (this.paused && this.introDone && !this.over) { g.fillStyle = 'rgba(240,225,190,0.9)'; g.font = `${Math.round(22 * O.dpr)}px Georgia, serif`; g.textAlign = 'center'; g.fillText('— THE TABLE HOLDS ITS BREATH —  (Space)', W / 2, 60 * O.dpr); g.textAlign = 'left'; }
    // victory: the ink bleeds and the paper goes square (into the next version)
    if (this.dissolve) { this.dissolve = Math.min(1, this.dissolve + 0.004); const px = Math.max(1, Math.round(this.dissolve * 48)); const tmp = this.tmp ||= document.createElement('canvas'); tmp.width = Math.ceil(W / px); tmp.height = Math.ceil(H / px); const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false; tg.drawImage(O.canvas, 0, 0, tmp.width, tmp.height); g.imageSmoothingEnabled = false; g.drawImage(tmp, 0, 0, W, H); g.imageSmoothingEnabled = true; }
  }
  drawToken(g, u) {
    const line = u.form === 'line', w = line ? 46 : 26, h = line ? 22 : 36;
    g.save(); g.translate(u.x, u.y); g.rotate(u.face + Math.PI / 2);
    const blue = u.team === 'blue';
    if (u.sel) { g.strokeStyle = 'rgba(240,200,80,0.95)'; g.lineWidth = 3; g.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10); }
    g.fillStyle = blue ? (u.state === 'rout' ? '#7f93b3' : '#2c4a7a') : (u.state === 'rout' ? '#b37f7f' : '#8a1e1e');
    g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    g.fillRect(-w / 2, -h / 2, w, h); g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.strokeStyle = '#f2e6c8'; g.lineWidth = 1.6; g.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    // NATO-style symbols: infantry ✕, cavalry ╱, archers ●, catapult ◯
    const iw = w / 2 - 6, ih = h / 2 - 6;
    g.beginPath();
    if (u.type === 'inf') { g.moveTo(-iw, -ih); g.lineTo(iw, ih); g.moveTo(iw, -ih); g.lineTo(-iw, ih); }
    if (u.type === 'cav') { g.moveTo(-iw, ih); g.lineTo(iw, -ih); }
    g.stroke();
    if (u.type === 'arc') { g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill(); }
    if (u.type === 'sie') { g.beginPath(); g.arc(0, 0, Math.min(iw, ih) * 0.8, 0, Math.PI * 2); g.stroke(); }
    // the front edge
    g.fillStyle = '#f2e6c8'; g.fillRect(-w / 2, -h / 2 - 3, w, 2);
    g.restore();
    // strength and morale pips
    const k = u.str / u.max; g.fillStyle = 'rgba(30,24,18,0.6)'; g.fillRect(u.x - 22, u.y + 22, 44, 5); g.fillStyle = blue ? '#2c4a7a' : '#8a1e1e'; g.fillRect(u.x - 22, u.y + 22, 44 * k, 5);
    g.fillStyle = 'rgba(200,150,40,0.85)'; g.fillRect(u.x - 22, u.y + 28, 44 * clamp(u.morale / 100, 0, 1), 2);
    if (u.fighting) { g.strokeStyle = 'rgba(30,24,18,0.5)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; g.beginPath(); g.moveTo(u.x + Math.cos(a) * 18, u.y + Math.sin(a) * 18); g.lineTo(u.x + Math.cos(a) * 26, u.y + Math.sin(a) * 26); g.stroke(); } }
  }
  drawPanel(g) {
    const O = this.O, s = O.dpr, sel = this.units.filter((u) => u.sel && u.str > 0);
    if (!sel.length) return;
    const y0 = O.H - 92 * s;
    g.fillStyle = 'rgba(20,14,10,0.78)'; g.fillRect(0, y0, O.W, 92 * s);
    sel.slice(0, 9).forEach((u, i) => {
      const x = 24 * s + i * 170 * s; g.fillStyle = '#f2e6c8'; g.font = `${13 * s}px Georgia, serif`;
      g.fillText(u.name, x, y0 + 24 * s);
      g.fillStyle = 'rgba(242,230,200,0.6)'; g.fillText(`${Math.round(u.str / u.max * 100)}% · morale ${Math.round(u.morale)} · ${u.form}`, x, y0 + 46 * s);
      g.fillText(u.state === 'rout' ? 'ROUTING' : u.state.toUpperCase(), x, y0 + 66 * s);
    });
  }

  dispose() { this.disposed = true; this.O?.dispose(); }
}
