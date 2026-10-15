// Helicopters: the Channel 6 news chopper covers big events; police Air 1 joins
// pursuits (a tracking helicopter makes escape much harder). Both are crewed by
// on-shift citizens and can be possessed and flown.
import { clamp, dist, wrapAngle } from '../core/math.js';


let HID = 1;
export class Helis {
  constructor(world) {
    this.world = world;
    this.list = [];
  }

  init() {
    const W = this.world;
    const news = (W.city.special.news || [])[0];
    const police = (W.city.special.police || [])[0];
    const pad = (bid) => {
      const b = W.city.buildings[bid];
      const top = Math.max(...b.parts.filter((p) => !p.antenna).map((p) => p.y + p.h / 2));
      return { x: b.x, y: top + 0.5, z: b.z };
    };
    if (news != null) this.list.push(this.make('news', news, pad(news), 'Channel 6 News'));
    if (police != null) this.list.push(this.make('police', police, pad(police), 'Air 1'));
  }

  make(kind, base, pad, name) {
    return { id: HID++, kind, base, pad, name, x: pad.x, y: pad.y, z: pad.z, h: 0, vx: 0, vy: 0, vz: 0, pilot: null, state: 'pad', target: null, orbitA: 0, rotor: 0, t: 0, player: false, spot: false, input: null, story: null };
  }

  onPilotArrive(c) {
    const role = c.job.role;
    const h = this.list.find((h) => h.pilot == null && (role === 'pilot' ? h.kind === 'news' : h.kind === 'police'));
    if (!h) return false;
    h.pilot = c.id;
    c.duty = 'heli';
    c.dutyHeli = h;
    return true;
  }

  release(h) {
    const W = this.world;
    const c = h.pilot != null ? W.citizens[h.pilot] : null;
    if (c) { c.duty = null; c.dutyHeli = null; c.veh = null; if (c.at == null) W.citizenAI.placeInside(c, h.base); c.nextThink = W.time; c.until = 0; }
    h.pilot = null;
  }

  tracking(s) {
    const pos = this.world.citizenPos(s);
    if (!pos) return false;
    return this.list.some((h) => h.kind === 'police' && h.state !== 'pad' && h.pilot != null && dist(h.x, h.z, pos.x, pos.z) < 180);
  }

  // what is worth flying to?
  pickStory(h) {
    const W = this.world;
    let best = null, bs = 0;
    for (const inc of W.incidents.active()) {
      if (!inc.reported) continue;
      let s = 0;
      if (inc.data.pursuitBy != null) s = 10;
      else if (h.kind === 'police') continue;
      else if (inc.type === 'fire') s = 3 + (inc.data.big ? 4 : 0);
      else if (inc.type === 'riot') s = 8;
      else if (inc.type === 'animal') s = 5;
      else if (inc.type === 'accident' && inc.severity > 12) s = 2;
      if (s > bs) { bs = s; best = inc; }
    }
    if (h.kind === 'news') for (const t of W.disasters.tornadoes) { best = { tornado: t }; bs = 20; }
    return best;
  }

  storyPos(h) {
    const W = this.world;
    const st = h.story;
    if (!st) return null;
    if (st.tornado) return W.disasters.tornadoes.includes(st.tornado) ? { x: st.tornado.x, z: st.tornado.z } : null;
    if (st.closed) return null;
    if (st.data && st.data.pursuitBy != null) {
      const u = W.services.unit(st.data.pursuitBy);
      const s = u && u.pursuit ? W.citizens[u.pursuit.cid] : null;
      const p = s ? W.citizenPos(s) : null;
      if (p && !p.inside) return p;
    }
    return { x: st.x, z: st.z };
  }

  update(dt) {
    const W = this.world;
    for (const h of this.list) {
      h.rotor += dt * (h.state === 'pad' && !h.player ? 0 : 38);
      h.t += dt;
      const c = h.pilot != null ? W.citizens[h.pilot] : null;
      // shift over and nothing going on: land and go home
      if (c && !c.possessed && !W.citizenAI.inShift(c, W.minuteOfDay, 0) && (h.state === 'pad')) { this.release(h); continue; }
      if (h.player) { this.flyPlayer(h, dt); continue; }
      if (!c) { if (h.state !== 'pad') this.goHome(h); this.move(h, dt); continue; }
      if (c.possessed) continue;
      if (h.state === 'pad') {
        h.y = h.pad.y; h.vx = h.vz = h.vy = 0;
        if (Math.floor(h.t * 2) % 2 === 0 && !h._looked) { h._looked = true; const st = this.pickStory(h); if (st) { h.story = st; h.state = 'fly'; if (h.kind === 'news') W.history.citizenLog(c, 'Flew Channel 6 coverage of a breaking story', false); } }
        if (Math.floor(h.t * 2) % 2 === 1) h._looked = false;
        continue;
      }
      const tp = this.storyPos(h);
      if (!tp && h.state !== 'return') { const st = this.pickStory(h); if (st) h.story = st; else this.goHome(h); }
      if (h.state === 'return') {
        const dd = dist(h.x, h.z, h.pad.x, h.pad.z);
        this.steer(h, h.pad.x, h.pad.z, dd < 30 ? h.pad.y : 70, dt, dd < 60 ? 8 : 34);
        if (dd < 2 && Math.abs(h.y - h.pad.y) < 0.6) { h.state = 'pad'; h.x = h.pad.x; h.z = h.pad.z; h.y = h.pad.y; }
      } else if (tp) {
        h.orbitA += dt * 0.25;
        const R = h.kind === 'police' ? 45 : 90;
        const ox = tp.x + Math.cos(h.orbitA) * R, oz = tp.z + Math.sin(h.orbitA) * R;
        this.steer(h, ox, oz, h.kind === 'police' ? 55 : 85, dt, 32);
        h.look = tp;
        h.spot = h.kind === 'police' && W.env.night > 0.4;
      }
      this.move(h, dt);
    }
  }

  goHome(h) { h.state = 'return'; h.story = null; h.look = null; h.spot = false; }

  steer(h, tx, tz, ty, dt, vmax) {
    const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz) || 1;
    const sp = Math.min(vmax, d * 0.6);
    const ax = (dx / d * sp - h.vx) * 1.2, az = (dz / d * sp - h.vz) * 1.2;
    h.vx += ax * dt; h.vz += az * dt;
    h.vy += ((ty - h.y) * 0.8 - h.vy) * dt * 1.5;
    const want = h.look ? Math.atan2(h.look.x - h.x, h.look.z - h.z) : Math.atan2(h.vx, h.vz);
    if (Math.hypot(h.vx, h.vz) > 2 || h.look) h.h += wrapAngle(want - h.h) * Math.min(1, dt * 1.5);
    h.tilt = clamp((ax * Math.sin(h.h) + az * Math.cos(h.h)) * 0.02, -0.3, 0.3);
    h.roll = clamp((ax * Math.cos(h.h) - az * Math.sin(h.h)) * 0.02, -0.3, 0.3);
  }

  move(h, dt) {
    h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
    const W = this.world;
    // don't fly into buildings: climb over them
    const hit = W.collideBox(h.x, h.z, 6, h.y - 2);
    if (hit) { h.vy = Math.max(h.vy, 6); h.x += hit.nx * hit.pen * 0.5; h.z += hit.nz * hit.pen * 0.5; }
    const g = W.groundHeight(h.x, h.z, h.y) + 0.8;
    if (h.y < g) { if (h.vy < -8 && h.player) { W.emit('impact', { x: h.x, z: h.z, power: -h.vy * 2 }); } h.y = g; h.vy = Math.max(0, h.vy); h.vx *= 0.9; h.vz *= 0.9; }
  }

  flyPlayer(h, dt) {
    const I = h.input || {};
    // arcade helicopter: W/S forward, A/D turn, Space/C altitude, Shift boost
    const fwd = (I.f || 0) * (I.boost ? 48 : 30);
    const side = (I.s || 0) * 14;
    h.h -= (I.turn || 0) * dt * 1.4;
    const tvx = Math.sin(h.h) * fwd + Math.cos(h.h) * side, tvz = Math.cos(h.h) * fwd - Math.sin(h.h) * side;
    h.vx += (tvx - h.vx) * dt * 1.4; h.vz += (tvz - h.vz) * dt * 1.4;
    h.vy += ((I.up || 0) * 14 - h.vy) * dt * 2;
    h.tilt = clamp((I.f || 0) * 0.22, -0.25, 0.25);
    h.roll = clamp(-(I.turn || 0) * 0.18 + (I.s || 0) * 0.15, -0.3, 0.3);
    this.move(h, dt);
    h.state = h.y > h.pad.y + 1 || Math.hypot(h.vx, h.vz) > 1 ? 'fly' : h.state;
  }
}
