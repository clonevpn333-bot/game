// GETAWAY! — in-game HUD (DOM overlay + canvas minimap & speedometer)
import { G } from '../core/context.js';
import { clamp, fmtTime, lerp } from '../core/utils.js';
import { WEAPONS } from '../combat/combat.js';
import { DISTRICT_NAMES, RIVER, SEA_X, SEA_Z, HWY } from '../world/layout.js';
import * as THREE from 'three';
import { nearestNode, astar } from '../police/police.js';

const MAP = { x0: -2300, z0: -1400, x1: 900, z1: 1000, s: 0.5 };
const CHAR_COL = { KIT: '#ffd36b', DEZ: '#5ad1ff', JUNO: '#ff7be0', GRAMPS: '#b5e86b', DISPATCH: '#9aa7c0', HALCYON: '#ff5a4a', SAINT: '#d4af37', VANCE: '#ffd36b' };

export class HUD {
  constructor(root) {
    this.root = root; root.innerHTML = '';
    const el = (cls, parent = root, tag = 'div') => { const e = document.createElement(tag); e.className = cls; parent.appendChild(e); return e; };
    this.el = el;
    this.wrap = el('hud');
    // objective + timer
    this.obj = el('hud-obj', this.wrap); this.objText = el('hud-obj-text', this.obj); this.objSub = el('hud-obj-sub', this.obj);
    this.timer = el('hud-timer', this.wrap);
    // wanted
    this.wanted = el('hud-wanted', this.wrap); this.stars = []; for (let i = 0; i < 5; i++) { const s = el('star', this.wanted, 'span'); s.textContent = '★'; this.stars.push(s); }
    this.wantedLabel = el('hud-wanted-label', this.wrap);
    this.money = el('hud-money', this.wrap);
    // minimap
    this.mm = el('hud-minimap', this.wrap); this.mmc = el('', this.mm, 'canvas'); this.mmc.width = this.mmc.height = 230; this.mmx = this.mmc.getContext('2d');
    this.hp = el('hud-bars', this.wrap); this.hpBar = el('bar hp', this.hp); this.hpFill = el('fill', this.hpBar); this.arBar = el('bar ar', this.hp); this.arFill = el('fill', this.arBar);
    this.district = el('hud-district', this.wrap);
    // speedo & weapon
    this.speedo = el('hud-speedo', this.wrap); this.spc = el('', this.speedo, 'canvas'); this.spc.width = 260; this.spc.height = 200; this.spx = this.spc.getContext('2d');
    this.weapon = el('hud-weapon', this.wrap); this.wName = el('w-name', this.weapon); this.wAmmo = el('w-ammo', this.weapon);
    // center
    this.cross = el('hud-cross', this.wrap); this.hitm = el('hud-hitmark', this.wrap); this.prompt = el('hud-prompt', this.wrap);
    this.feed = el('hud-feed', this.wrap); this.subs = el('hud-subs', this.wrap); this.big = el('hud-big', this.wrap); this.stunt = el('hud-stunt', this.wrap);
    this.warn = el('hud-warn', this.wrap); this.fps = el('hud-fps', this.wrap);
    this.wpEl = el('hud-wp', this.wrap); this.wpEl.innerHTML = '<div class="wp-arrow"></div><div class="wp-dia"></div><div class="wp-dist"></div>'; this.wpDist = this.wpEl.querySelector('.wp-dist'); this.wpArrow = this.wpEl.querySelector('.wp-arrow');
    this.waypoint = null; this.route = null; this.routeT = 0; this._wv = new THREE.Vector3(); this.updateChevrons(); // create up front so its shader is warmed at load
    this.mapCanvas = this.buildMap(); this.blips = []; this.objTarget = null; this.subQ = []; this.subT = 0; this.lastDistrict = ''; this.hitT = 0; this.timerVal = null;
    G.on('playerHitTarget', (t, head) => { this.hitT = 0.15; this.hitm.classList.toggle('head', !!head); });
    G.on('policeIntel', (m) => this.notify(m, 'intel'));
    G.on('starsUp', (n) => this.flashWanted());
    G.on('escaped', (m) => this.bigText('ESCAPED', 'gold', 2.6, { highway: 'Highway escape', tunnel: 'Lost them in the tunnel', swaps: 'Switched cars', water: 'Took to the water', onfoot: 'Vanished on foot', offroad: 'Off-road escape', alley: 'Clean getaway' }[m]));
    G.on('weaponPickup', (id) => this.notify('Picked up ' + WEAPONS[id].name, 'pickup'));
    this.visible = true;
  }
  show(v) { this.visible = v; this.wrap.style.display = v ? '' : 'none'; }
  buildMap() {
    const W = (MAP.x1 - MAP.x0) * MAP.s, H = (MAP.z1 - MAP.z0) * MAP.s; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const X = (x) => (x - MAP.x0) * MAP.s, Z = (z) => (z - MAP.z0) * MAP.s;
    g.fillStyle = '#1b2a22'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1d232b'; g.fillRect(X(-830), Z(-830), (SEA_X + 830) * MAP.s, (612 + 830) * MAP.s);
    g.fillStyle = '#c9b58a55'; g.fillRect(X(-2300), Z(612), (SEA_X + 2300) * MAP.s, (SEA_Z - 612) * MAP.s);
    g.fillStyle = '#123a5a'; g.fillRect(X(RIVER.x0), 0, (RIVER.x1 - RIVER.x0) * MAP.s, H); g.fillRect(X(SEA_X), 0, W, H); g.fillRect(0, Z(SEA_Z), W, H);
    // buildings
    g.fillStyle = '#2c333d'; for (const b of G.world.static.boxes) { if (b.maxY < 3 || b.minY > 20 || (b.maxX - b.minX) * (b.maxZ - b.minZ) < 6) continue; g.fillRect(X(b.minX), Z(b.minZ), (b.maxX - b.minX) * MAP.s, (b.maxZ - b.minZ) * MAP.s); }
    // roads
    g.lineCap = 'square';
    for (const e of G.world.graph.live) { g.strokeStyle = e.hwy ? '#d9b44a' : e.tunnel ? '#6d7a88' : '#8d97a3'; g.lineWidth = e.hwy ? 13 : 8; g.setLineDash(e.tunnel ? [6, 5] : []); g.beginPath(); e.pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Z(p.z)) : g.moveTo(X(p.x), Z(p.z)))); g.stroke(); }
    g.setLineDash([]); g.strokeStyle = '#6b5a4a'; g.lineWidth = 6; g.beginPath(); g.moveTo(X(-1520), Z(-650)); g.lineTo(X(770), Z(-650)); g.stroke();
    return c;
  }
  // ---- API used by missions ----
  objective(text, sub = '') { this.obj.classList.remove('in'); void this.obj.offsetWidth; this.objText.textContent = text; this.objSub.textContent = sub; this.obj.classList.add('in'); if (G.audio) G.audio.ui('objective'); }
  clearObjective() { this.obj.classList.remove('in'); }
  setTimer(sec, urgent = false) { this.timerVal = sec; this.timer.style.display = sec === null ? 'none' : ''; if (sec !== null) { this.timer.textContent = fmtTime(sec).slice(0, -3); this.timer.classList.toggle('urgent', urgent || sec < 20); } }
  say(who, text, dur = null) { this.subQ.push({ who, text, dur: dur || clamp(1.6 + text.length * 0.055, 2, 6.5) }); }
  notify(text, kind = '') { const n = this.el('note ' + kind, this.feed); n.textContent = text; setTimeout(() => n.classList.add('out'), 4200); setTimeout(() => n.remove(), 4800); while (this.feed.children.length > 5) this.feed.firstChild.remove(); }
  bigText(text, cls = '', dur = 2.2, sub = '') { this.big.className = 'hud-big ' + cls; this.big.innerHTML = `<div class="t">${text}</div>${sub ? `<div class="s">${sub}</div>` : ''}`; void this.big.offsetWidth; this.big.classList.add('in'); clearTimeout(this._bigT); this._bigT = setTimeout(() => this.big.classList.remove('in'), dur * 1000); }
  stuntPop(text, pts) { const s = this.el('pop', this.stunt); s.innerHTML = `${text}${pts ? ` <b>+${pts}</b>` : ''}`; setTimeout(() => s.remove(), 1800); while (this.stunt.children.length > 3) this.stunt.firstChild.remove(); }
  setPrompt(t) { if (this._pr !== t) { this._pr = t; this.prompt.innerHTML = t || ''; this.prompt.style.opacity = t ? 1 : 0; } }
  setWarn(t) { if (this._wr !== t) { this._wr = t; this.warn.innerHTML = t || ''; this.warn.style.opacity = t ? 1 : 0; } }
  flashWanted() { this.wanted.classList.remove('flash'); void this.wanted.offsetWidth; this.wanted.classList.add('flash'); }
  // blips: {pos (Vector3|fn), color, kind:'target'|'enemy'|'police'|'dest', label}
  setWaypoint(pos, ref = null) { this.waypoint = pos; this.wpRef = ref; this.route = null; this.routeT = 0; }
  clearWaypoint(ref) { if (!ref || this.wpRef === ref) { this.waypoint = null; this.wpRef = null; this.route = null; } }
  wpPos() { const w = this.waypoint; return !w ? null : typeof w === 'function' ? w() : w; }
  updateRoute(dt) {
    const tgt = this.wpPos(); const P = G.player; if (!tgt || !P.vehicle) { this.route = null; return; }
    this.routeT -= dt; if (this.routeT > 0) return; this.routeT = 0.8;
    const f = P.focus; if (Math.hypot(tgt.x - f.x, tgt.z - f.z) < 40) { this.route = [f.clone(), tgt.clone()]; return; }
    const g = G.world.graph; const a = nearestNode(g, f.x, f.z), b = nearestNode(g, tgt.x, tgt.z); const path = astar(g, a, b); if (!path) { this.route = null; return; }
    if (path.length > 1 && Math.hypot(path[1].x - f.x, path[1].z - f.z) < Math.hypot(path[1].x - path[0].x, path[1].z - path[0].z)) path.shift();
    const pts = [new THREE.Vector3(f.x, f.y, f.z)];
    for (let i = 0; i < path.length; i++) { const n = path[i]; if (i > 0) { const prev = path[i - 1]; const e = prev.out.map((id) => g.edges[id]).find((e2) => e2.b === n.id); if (e && e.pts.length > 2) for (let k = 1; k < e.pts.length - 1; k++) pts.push(new THREE.Vector3(e.pts[k].x, e.pts[k].y, e.pts[k].z)); } pts.push(new THREE.Vector3(n.x, n.y, n.z)); }
    pts.push(new THREE.Vector3(tgt.x, tgt.y, tgt.z)); this.route = pts;
  }
  updateChevrons() {
    if (!this.chev) { const mk = (w, rot) => { const g = new THREE.BoxGeometry(w, 0.12, 0.55); g.translate(w / 2 - 0.15, 0, 0); g.rotateY(rot); return g; }; const a = mk(1.7, -0.75 + Math.PI / 2), b = mk(1.7, 0.75 + Math.PI / 2); b.scale(-1, 1, 1); const geo = new THREE.BufferGeometry(); const pa = [...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array]; geo.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3)); geo.computeVertexNormals();
      this.chev = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), 12); this.chev.frustumCulled = false; this.chev.renderOrder = 6; G.scene.add(this.chev); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0); }
    const r = this.route; const P = G.player; if (!r || r.length < 2 || !P.vehicle || G.cam.cine) { this.chev.count = 0; return; }
    const v = P.vehicle; const start = 12 + clamp(v.speed * 0.6, 0, 22), gap = 9 + clamp(v.speed * 0.3, 0, 12); let n = 0; const phase = (G.time * 1.6) % 1;
    let seg = 0, acc = 0; for (let i = 0; i < 12; i++) {
      const want = start + (i + phase) * gap; while (seg < r.length - 1) { const L = Math.hypot(r[seg + 1].x - r[seg].x, r[seg + 1].z - r[seg].z); if (acc + L >= want) break; acc += L; seg++; } if (seg >= r.length - 1) break;
      const a = r[seg], b = r[seg + 1]; const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; const t = (want - acc) / L; const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const y = G.world.static.groundAt(x, z, lerp(a.y, b.y, t) + 2, 0.5).h + 0.35; const yaw = Math.atan2(b.x - a.x, b.z - a.z); const fade = Math.min(1, i / 1.5) * (1 - i / 12);
      this._m.compose(this._p.set(x, y, z), this._q.setFromAxisAngle(this._up, yaw), this._s.setScalar(1.1 + fade * 0.9)); this.chev.setMatrixAt(n++, this._m);
    }
    this.chev.count = n; this.chev.instanceMatrix.needsUpdate = true;
  }
  updateMarker() {
    const tgt = this.wpPos(); const el = this.wpEl; if (!tgt || G.cam.cine) { el.style.display = 'none'; return; } el.style.display = '';
    const P = G.player; const d = Math.hypot(tgt.x - P.focus.x, tgt.z - P.focus.z); this.wpDist.textContent = d > 999 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
    const v = this._wv.set(tgt.x, tgt.y + 2.5, tgt.z).project(G.camera); let x = v.x, y = v.y; const behind = v.z > 1; if (behind) { x = -x; y = -y; }
    const off = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.82; if (off) { const k = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.82); x /= k; y /= k; if (behind) y = Math.min(y, -0.75); }
    el.style.left = ((x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - y) / 2 * innerHeight) + 'px'; el.classList.toggle('off', off);
    this.wpArrow.style.transform = `rotate(${Math.atan2(x, y)}rad)`; el.style.opacity = d < 6 ? 0.3 : 1;
  }
  addBlip(b) { this.blips.push(b); return b; } removeBlip(b) { const i = this.blips.indexOf(b); if (i >= 0) this.blips.splice(i, 1); } clearBlips() { this.blips = []; }
  update(dt) {
    if (!this.visible) return; const P = G.player, pol = G.police; const pv = P.vehicle;
    this.wrap.classList.toggle('cine', !!G.cam.cine);
    // subtitles
    this.subT -= dt; if (this.subT <= 0) { const s = this.subQ.shift(); if (s) { this.subT = s.dur; this.subs.innerHTML = `<span class="who" style="color:${CHAR_COL[s.who] || '#fff'}">${s.who}</span>${s.text}`; this.subs.classList.add('in'); if (G.audio) G.audio.voiceChirp(s.who === 'DEZ' ? 1.1 : s.who === 'JUNO' ? 1.5 : s.who === 'GRAMPS' ? 0.75 : s.who === 'KIT' ? 1.25 : 0.95, Math.min(6, 2 + (s.text.length / 12) | 0)); } else { this.subs.classList.remove('in'); this.subT = 0.2; } }
    // wanted
    const stars = pol ? pol.stars : 0; this.stars.forEach((s, i) => s.classList.toggle('on', i < stars));
    this.wanted.classList.toggle('search', !!(pol && pol.state === 'search')); this.wanted.style.opacity = stars ? 1 : 0.25;
    this.wantedLabel.textContent = pol && pol.state === 'search' ? `EVADING ${Math.round(clamp(pol.evadeT / pol.evadeNeed, 0, 1) * 100)}%` : stars ? 'PURSUIT' : '';
    this.money.textContent = '$' + Math.floor(P.money).toLocaleString();
    // health/armor
    this.hpFill.style.width = clamp(P.health / P.maxHealth, 0, 1) * 100 + '%'; this.arFill.style.width = clamp(P.armor / 100, 0, 1) * 100 + '%'; this.hpBar.classList.toggle('low', P.health < 35);
    // district
    const d = G.world.district(P.focus.x, P.focus.z); if (d !== this.lastDistrict) { this.lastDistrict = d; this.district.textContent = DISTRICT_NAMES[d] || ''; this.district.classList.remove('in'); void this.district.offsetWidth; this.district.classList.add('in'); }
    // speedo / weapon
    this.speedo.style.display = pv ? '' : 'none'; this.weapon.style.display = pv && !P.driveAim ? 'none' : '';
    if (pv) this.drawSpeedo(pv);
    const W = WEAPONS[P.weapon]; const inv = P.inv[P.weapon]; this.wName.textContent = W.name.toUpperCase(); this.wAmmo.innerHTML = W.melee ? '—' : `${inv.mag}<small>/${inv.res}</small>${P.reloading > 0 ? ' <i>RELOADING</i>' : ''}`;
    // crosshair
    const aim = (P.aiming || P.driveAim) && P.alive; this.cross.style.opacity = aim ? 1 : (pv ? 0 : 0.35); this.cross.classList.toggle('aim', aim);
    this.hitT -= dt; this.hitm.style.opacity = this.hitT > 0 ? 1 : 0;
    // prompts
    if (!pv && !P.entering && P.alive) { const v = P.nearestVehicle(4); this.setPrompt(v && !this.promptOverride ? `<kbd>F</kbd> ${v.hasDriver ? 'Hijack' : 'Enter'} <b>${v.spec.name}</b>` : this.promptOverride || ''); }
    else if (pv && pv.isUpsideDown() && pv.speed < 6) this.setPrompt('<kbd>E</kbd> Flip it back over &nbsp; <kbd>F</kbd> Get out'); else this.setPrompt(this.promptOverride || '');
    if (pv && pv.burnT > 0 && !pv.dead) this.setWarn(`VEHICLE ON FIRE — BAIL OUT! <kbd>F</kbd> ${pv.burnT.toFixed(1)}`); else if (pol && pol.bustedT > 1) this.setWarn('MOVE! YOU\'RE BEING BOXED IN'); else if (pol && pol.arrestT > 0.4) this.setWarn('GET AWAY FROM THE OFFICER!'); else this.setWarn(this.warnOverride || '');
    this.updateRoute(dt); this.updateChevrons(); this.updateMarker();
    this.drawMinimap();
    if (G.debug) this.fps.textContent = `${G.game ? G.game.fps.toFixed(0) : ''} fps · ${G.vehicles.list.length} veh · ${G.peds.list.length} peds`;
  }
  drawSpeedo(v) {
    const g = this.spx, W = 260, H = 200; g.clearRect(0, 0, W, H); const cx = 150, cy = 120, R = 82;
    const kmh = G.settings.units === 'mph' ? v.speed * 2.237 : v.speed * 3.6; const red = v.spec.engine === 'truck' || v.spec.engine === 'bus' || v.spec.engine === 'armored' ? 3200 : v.spec.engine === 'super' ? 8800 : 7200; const rf = clamp((v.rpm - 800) / (red - 800), 0, 1);
    const a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
    const grad = g.createLinearGradient(cx - R, 0, cx + R, 0); grad.addColorStop(0, '#5ad1ff'); grad.addColorStop(0.7, '#ffd36b'); grad.addColorStop(1, '#ff3b2f');
    g.strokeStyle = grad; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * rf); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - 14), cy + Math.sin(a) * (R - 14)); g.lineTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); g.stroke(); }
    g.fillStyle = '#fff'; g.font = 'italic 700 58px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillText(Math.round(kmh), cx, cy + 14);
    g.font = '600 14px Rajdhani, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillText(G.settings.units === 'mph' ? 'MPH' : 'KM/H', cx, cy + 34);
    g.font = 'italic 700 26px Rajdhani'; g.fillStyle = '#ffd36b'; g.fillText(v.reversing ? 'R' : v.spec.gears === 1 ? 'D' : v.gear, cx, cy - 34);
    // boost & damage bars
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(40, 182, 220, 6); g.fillStyle = v.ctrl.boost ? '#9fd8ff' : '#3fa9ff'; g.fillRect(40, 182, 220 * clamp(v.boost, 0, 1), 6);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(40, 192, 220, 4); const hp = clamp(v.hp / v.maxHp, 0, 1); g.fillStyle = hp > 0.5 ? '#7bd88f' : hp > 0.25 ? '#ffb02e' : '#ff3b2f'; g.fillRect(40, 192, 220 * hp, 4);
    g.font = '700 11px Rajdhani'; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText(v.spec.thrusters ? 'THRUSTERS' : 'NITRO', 0, 189); g.fillText('DAMAGE', 0, 198);
  }
  drawMinimap() {
    const g = this.mmx, S = 230, R = S / 2; const P = G.player; const f = P.focus; const yaw = G.cam.yaw; const zoom = P.vehicle ? clamp(1.2 - P.vehicle.speed / 90, 0.55, 1.2) : 1.4;
    g.save(); g.clearRect(0, 0, S, S); g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.clip(); g.fillStyle = '#10151b'; g.fillRect(0, 0, S, S);
    g.translate(R, R); g.rotate(yaw + Math.PI); g.scale(zoom, zoom);
    const mx = (f.x - MAP.x0) * MAP.s, mz = (f.z - MAP.z0) * MAP.s; g.drawImage(this.mapCanvas, -mx, -mz);
    const toM = (x, z) => [(x - f.x) * MAP.s, (z - f.z) * MAP.s];
    // police search zone
    const pol = G.police; if (pol && pol.state === 'search') { const [sx, sz] = toM(pol.searchCenter.x, pol.searchCenter.z); g.fillStyle = 'rgba(80,140,255,0.16)'; g.strokeStyle = 'rgba(120,170,255,0.5)'; g.lineWidth = 2 / zoom; g.beginPath(); g.arc(sx, sz, pol.searchR * MAP.s, 0, Math.PI * 2); g.fill(); g.stroke(); }
    const dot = (x, z, col, r = 4, shape = 'dot') => { let [bx, bz] = toM(x, z); const lim = (R - 10) / zoom; const l = Math.hypot(bx, bz); let edge = false; if (l > lim) { bx *= lim / l; bz *= lim / l; edge = true; } g.fillStyle = col; g.beginPath(); if (shape === 'sq') g.rect(bx - r / zoom, bz - r / zoom, 2 * r / zoom, 2 * r / zoom); else g.arc(bx, bz, (edge ? r * 0.8 : r) / zoom, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.2 / zoom; g.stroke(); };
    if (pol) { const blink = Math.floor(G.time * 4) % 2; for (const u of pol.units) if (!u.v.dead) dot(u.v.pos.x, u.v.pos.z, blink ? '#ff3b3b' : '#3b7bff', 4); if (pol.heli && pol.heli.alive) dot(pol.heli.pos.x, pol.heli.pos.z, blink ? '#ff3b3b' : '#3b7bff', 6, 'sq'); for (const o of pol.officers) if (o.alive) dot(o.pos.x, o.pos.z, '#6b8cff', 2.5); }
    if (G.npcs) for (const n of G.npcs.list) if (n.alive && n.team !== 'police' && !n.calm) dot(n.pos.x, n.pos.z, '#ff4a3a', 3);
    if (this.route) { g.strokeStyle = '#ffb21e'; g.lineWidth = 6 / zoom; g.lineJoin = 'round'; g.shadowColor = '#ffb21e'; g.shadowBlur = 6; g.beginPath(); this.route.forEach((p, i) => { const [x, z] = toM(p.x, p.z); i ? g.lineTo(x, z) : g.moveTo(x, z); }); g.stroke(); g.shadowBlur = 0; }
    for (const b of this.blips) { const p = typeof b.pos === 'function' ? b.pos() : b.pos; if (!p) continue; dot(p.x, p.z, b.color || '#ffd36b', b.size || 6, b.shape); }
    g.restore();
    // player arrow (fixed, pointing up = camera dir)
    const ang = (P.vehicle ? P.vehicle.yaw : P.human.yaw) - yaw;
    g.save(); g.translate(R, R); g.rotate(-ang); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.stroke(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.stroke();
    // north marker
    const na = -yaw + Math.PI; g.fillStyle = '#ffd36b'; g.font = '700 12px Rajdhani'; g.textAlign = 'center'; g.fillText('N', R + Math.sin(na) * (R - 12), R - Math.cos(na) * (R - 12) + 4);
  }
}
