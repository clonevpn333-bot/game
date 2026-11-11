// CHAPTER 5 — 1996. A genuine software raycaster: 320x148 view, DDA walls
// with 32px textures, banded distance lighting, billboard sprites with a
// z-buffer, sliding doors, a push-wall secret and a room section that rotates.
// Nothing here is modern 3D behind a filter.
import { Pix, PAL, ptext } from '../ch1/pix.js';
import { makeCanvas, clamp, hexToRgb, hash2 } from '../core/util.js';
import { wrapText } from '../core/dialogue.js';

const VW = 320, VH = 180, RH = 148, TX = 32;
const MAP = [
  '########################', '#P..#.....#......T.....#', '#...D..e..#..e...T..h..#', '#...#.....D......D.....#', '##S##..a..#......T..m..#', '#m.a#######......TTTDTT#',
  '#####.....####D###.....#', '#.....e........e..#..i.#', '#.###.............D....#', '#.#a####.....11111#....#', '#.#.S..#.....1...1###D##', '#.####.R.....1.k..#....#',
  '#......#.....1...1#.e..#', '#####D##.....11111#....#', '#.......#.........####D#', '#..i....#.e...e....#...#', '#.......D..........X...#', '#..a....#..m.......#.a.#', '#.......#..........#..E#', '########################',
];
const SONG = (() => { const bars = {}, riff = ['E2 E2 E3 E2 F2 E2 G2 E2 E2 E3 E2 F2 E2 A#2 A2 G2', 'E2 E2 E3 E2 F2 E2 G2 E2 E2 E3 E2 G2 A2 A#2 B2 D3'], lead = ['E4 . . G4 . . A4 . A#4 . A4 . G4 . E4 .', 'E4 . . B4 . . A#4 . A4 . . . G4 . F4 .', 'E5 . . D5 . . B4 . A4 . B4 . D5 . . .', 'E5 . F5 . E5 . D5 . B4 . A#4 . A4 . G4 .'];
  const A = [0, 1, 2, 3].map((i) => { bars['a' + i] = { bass: riff[i % 2], lead: lead[i], drums: i === 3 ? 'k . h k s . h k k . s k s s t l' : 'k . h . s . h k . k h . s . h h', stab: i % 2 ? '. . . . E3+B3 . . . . . . . E3+B3 . . .' : 'E3+B3 . . . . . . . . . E3+A#3 . . . . .' }; return 'a' + i; });
  return { bpm: 136, gain: 0.95, reverb: 0.08, start: 'A', tracks: { bass: { inst: 'fmbass', vol: 0.9 }, lead: { inst: 'saw', vol: 0.6, pan: 0.1, layer: 1 }, stab: { inst: 'stab', vol: 0.7, pan: -0.2 }, drums: { kit: 'electro', vol: 0.9 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH5 };

function toTex(p) { const c = p.toCanvas().getContext('2d').getImageData(0, 0, p.w, p.h).data, o = new Uint32Array(p.w * p.h); for (let i = 0; i < o.length; i++) o[i] = c[i * 4 + 3] ? (255 << 24) | (c[i * 4 + 2] << 16) | (c[i * 4 + 1] << 8) | c[i * 4] : 0; return o; }
function wallTex(kind) {
  const p = new Pix(TX, TX);
  if (kind === '#') { p.rect(0, 0, TX, TX, 'e'); for (let r = 0; r < 4; r++) { p.rect(0, r * 8 + 7, TX, 1, 'd'); for (let x = (r % 2) * 8; x < TX + 16; x += 16) p.rect((x + 15) % TX, r * 8, 1, 7, 'd'); for (let b = 0; b < 2; b++) if (hash2(r, b) > 0.5) p.rect(((r % 2) * 8 + b * 16) % TX, r * 8, 15, 1, 'E'); } }
  else if (kind === 'T' || kind === '1') { p.rect(0, 0, TX, TX, kind === '1' ? 'N' : 'G'); p.frame(1, 1, 30, 30, kind === '1' ? 'b' : 'h'); p.rect(4, 4, 24, 3, 'K'); p.rect(5, 5, 22, 1, kind === '1' ? 'c' : 'y'); for (let y = 12; y < 28; y += 4) p.rect(6, y, 20, 2, 'g'); p.set(3, 28, 'i'); p.set(28, 28, 'i'); p.set(3, 3, 'i'); p.set(28, 3, 'i'); }
  else if (kind === 'D' || kind === 'X') { p.rect(0, 0, TX, TX, 'h'); p.rect(0, 0, TX, 2, 'i'); for (let x = 3; x < TX; x += 6) p.rect(x, 3, 1, 26, 'G'); p.rect(0, 13, TX, 6, kind === 'X' ? 'R' : 'y'); for (let x = 0; x < TX; x += 8) p.poly([[x, 18], [x + 3, 18], [x + 7, 13], [x + 4, 13]], 'K'); p.rect(13, 22, 6, 5, 'K'); p.rect(14, 23, 4, 3, kind === 'X' ? 'R' : 'J'); }
  else if (kind === 'S') { const q = wallTex('#'); p.blit(q); p.set(15, 15, 'D'); p.set(16, 16, 'D'); p.rect(13, 20, 6, 1, 'D'); }
  else if (kind === 'R') { p.blit(wallTex('T')); p.rect(11, 9, 10, 14, 'K'); p.rect(12, 10, 8, 12, 'n'); p.rect(14, 12, 4, 5, 'R'); p.rect(14, 12, 4, 1, 'O'); p.arc(16, 18, 2, 4, 0.5, 5.5, 'y'); }
  return p;
}
function botSprite(type, f) { // 32x32 billboard frames: 0/1 walk, 2 attack, 3 hurt, 4/5 death
  const p = new Pix(32, 32), c = { e: ['e', 'E', 'a'], i: ['u', 'U', 'm'], h: ['G', 'h', 'i'] }[type], bob = f === 1 ? 1 : 0;
  if (f >= 4) { p.ellipse(16, 28 - (f === 4 ? 4 : 0), 11, f === 4 ? 6 : 3, c[0]); p.ellipse(14, 27 - (f === 4 ? 5 : 0), 6, 2, c[1]); for (let i = 0; i < 5; i++) p.set(6 + i * 5, 24 - (f === 4 ? 8 : 1), 'O'); return p; }
  for (const s of [-1, 1]) { p.rect(16 + s * 5 - 2, 24 + (s > 0 ? bob : 1 - bob), 4, 7, 'G'); p.rect(16 + s * 5 - 3, 30, 6, 2, 'K'); }
  p.ellipse(16, 16 + bob, type === 'h' ? 11 : 8, type === 'h' ? 10 : 9, c[0]); p.ellipse(14, 13 + bob, type === 'h' ? 8 : 5, 5, c[1]); p.set(11, 10 + bob, c[2]);
  p.rect(9, 12 + bob, 14, 5, 'K'); p.rect(10, 13 + bob, 12, 3, f === 2 ? 'Y' : 'R'); p.rect(14, 13 + bob, 4, 3, f === 2 ? 'W' : 'O');
  for (const s of [-1, 1]) { const ay = f === 2 ? 10 : 18; p.line(16 + s * 9, 16 + bob, 16 + s * 13, ay + bob, 'G', 2); p.rect(16 + s * 13 - 1, ay + bob - 1, 3, 3, f === 2 ? 'Y' : 'i'); }
  if (type === 'i') { p.poly([[10, 8], [8, 2], [13, 7]], 'm'); p.poly([[22, 8], [24, 2], [19, 7]], 'm'); }
  if (type === 'h') { p.rect(8, 22, 16, 3, 'y'); for (let x = 9; x < 24; x += 4) p.rect(x, 22, 2, 3, 'K'); }
  if (f === 3) p.remapAll({ [c[0]]: 'W', [c[1]]: 'W' });
  return p.outline('K');
}
function itemSprite(k) { const p = new Pix(32, 32); if (k === 'a') { p.rect(10, 20, 12, 9, 'G'); p.rect(10, 20, 12, 2, 'i'); p.rect(12, 23, 8, 4, 'y'); p.frame(14, 23, 4, 4, 'K'); } if (k === 'm') { p.rect(10, 19, 12, 10, 'W'); p.rect(15, 21, 2, 6, 'R'); p.rect(13, 23, 6, 2, 'R'); } if (k === 'k') { p.frame(11, 12, 10, 10, 'y'); p.frame(12, 13, 8, 8, 'Y'); p.rect(15, 22, 2, 8, 'y'); p.rect(17, 26, 3, 2, 'y'); } if (k === 'o') { p.ellipse(16, 16, 5, 5, 'R'); p.ellipse(16, 16, 3, 3, 'O'); p.ellipse(15, 15, 1, 1, 'Y'); } if (k === 'v') { p.rect(9, 9, 13, 11, 'U'); p.rect(10, 8, 11, 13, 'U'); p.rect(10, 9, 9, 3, 'm'); p.rect(11, 12, 5, 5, 'W'); p.rect(13, 13, 2, 3, 'K'); p.rect(18, 13, 2, 2, 'W'); } return k === 'o' ? p : p.outline('K'); }

export default class Chapter5 {
  constructor(game) { this.game = game; this.id = 5; this.compositesOutgoing = true; }
  async load() {
    this.buf = makeCanvas(VW, VH); this.bx = this.buf.getContext('2d'); this.img = this.bx.createImageData(VW, RH); this.px = new Uint32Array(this.img.data.buffer); this.zb = new Float32Array(VW);
    this.tex = {}; for (const k of ['#', 'T', '1', 'D', 'X', 'S', 'R']) this.tex[k] = toTex(wallTex(k));
    this.spr = {}; for (const t of ['e', 'i', 'h']) this.spr[t] = [0, 1, 2, 3, 4, 5].map((f) => toTex(botSprite(t, f))); for (const k of ['a', 'm', 'k', 'o', 'v']) this.spr[k] = [toTex(itemSprite(k))];
    this.shade = [1, 0.82, 0.66, 0.5, 0.36, 0.24, 0.14];
  }
  controlsHelp() { return '<b>W/S</b> move · <b>A/D</b> strafe · <b>← →</b> or mouse: turn · <b>J</b> / click: fire · <b>L</b>: wide blast (4 ammo) · <b>E</b>: use doors, switches, suspicious walls'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; this.introT = handoff ? 0 : 9; g.show3d(false); g.c2d.style.imageRendering = 'pixelated'; g.c2d.style.opacity = '1';
    this.map = MAP.map((r) => r.split('')); this.doors = {}; this.things = []; this.shots = []; this.t = 0; this.said = {}; this.fin = null; this.noPause = false; this.msg = null; this.title = 3.5;
    this.p = { x: 1.5, y: 1.5, a: 0.4, hp: 100, ammo: 40, key: false, bob: 0, fire: 0, hurt: 0, kick: 0 };
    this.map.forEach((row, y) => row.forEach((c, x) => { if (c === 'P') { this.p.x = x + 0.5; this.p.y = y + 0.5; row[x] = '.'; } else if ('eih'.includes(c)) { this.things.push({ k: c, x: x + 0.5, y: y + 0.5, hp: c === 'h' ? 9 : c === 'i' ? 2 : 4, st: 'idle', t: Math.random() * 2, cool: 1 }); row[x] = '.'; } else if ('amk'.includes(c)) { this.things.push({ k: c, x: x + 0.5, y: y + 0.5, item: true }); row[x] = '.'; } else if (c === 'D' || c === 'X' || c === 'S') this.doors[x + ',' + y] = { open: 0, dir: 0 }; }));
    this.vell = { k: 'v', x: 2.5, y: 2.5, item: true, vell: true }; this.things.push(this.vell);
    g.director.releaseOutgoing(); g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 0.3 });
    g.dialogue.say([{ who: 'vell', text: "Everything's flat again but it THINKS it's deep. Don't tell it." }, { who: 'rin', text: 'I have a gun for a hand.' }, { who: 'vell', text: "It was 1996. Everyone did." }]);
    g.director.preload(6);
  }
  stop() { this.game.c2d.style.imageRendering = ''; this.game.input.exitLock(); }
  respawn() { this.start(); }
  onResume() {}
  solid(x, y) { const c = this.map[y | 0]?.[x | 0]; if (!c || c === '.' || c === 'E') return false; const d = this.doors[(x | 0) + ',' + (y | 0)]; return !(d && d.open > 0.8); }
  los(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4); for (let i = 1; i < n; i++) if (this.solid(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false; return true; }
  tryMove(o, dx, dy, r = 0.22) { if (!this.solid(o.x + dx + Math.sign(dx) * r, o.y - r) && !this.solid(o.x + dx + Math.sign(dx) * r, o.y + r)) o.x += dx; if (!this.solid(o.x - r, o.y + dy + Math.sign(dy) * r) && !this.solid(o.x + r, o.y + dy + Math.sign(dy) * r)) o.y += dy; }
  note(s) { this.msg = { s, t: 2.4 }; }

  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; this.title -= dt; if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    if (this.fin) return this.updateFinale(dt);
    if (inp.mouse.left && !inp.locked) inp.requestLock();
    p.a += ((inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('ArrowLeft') ? 1 : 0)) * 2.6 * dt + (inp.locked ? inp.mouse.dx * 0.0035 : 0); inp.mouse.dx = 0;
    const f = (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) - (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0), s = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0), sp = 3.6 * dt;
    const ca = Math.cos(p.a), sa = Math.sin(p.a); this.tryMove(p, (ca * f - sa * s) * sp, (sa * f + ca * s) * sp); if (f || s) p.bob += dt * 10;
    p.fire -= dt; p.hurt -= dt; p.kick = Math.max(0, p.kick - dt * 6);
    // use: doors / secrets / the rotator
    if (inp.pressed.interact) { const ux = (p.x + ca * 0.9) | 0, uy = (p.y + sa * 0.9) | 0, c = this.map[uy]?.[ux], d = this.doors[ux + ',' + uy];
      if (c === 'X' && !p.key) { this.note('LOCKED. NEEDS THE FRAME KEY.'); sfx.play('ui.back'); } else if (d && d.dir === 0 && d.open < 0.1) { d.dir = 1; d.hold = c === 'S' ? 1e9 : 4; sfx.play(c === 'S' ? 'pp.rumble' : 'px.clank'); if (c === 'S') this.note('A SECRET!'); }
      else if (c === 'R') this.rotateBlock(); else sfx.play('ui.move', { pitch: 0.5 }); }
    for (const k in this.doors) { const d = this.doors[k]; if (d.dir > 0) { d.open = Math.min(1, d.open + dt * 1.6); if (d.open >= 1) { d.hold -= dt; if (d.hold <= 0) { const [x, y] = k.split(',').map(Number); if (Math.hypot(p.x - x - 0.5, p.y - y - 0.5) > 1.1) d.dir = -1; } } } else if (d.dir < 0) { d.open -= dt * 1.6; if (d.open <= 0) { d.open = 0; d.dir = 0; } } }
    // weapons
    const fire = inp.pressed.attack || inp.pressed.mouseL, blast = inp.pressed.shoot || inp.pressed.mouseR;
    if ((fire || blast) && p.fire <= 0) { const cost = blast ? 4 : 1; if (p.ammo >= cost) { p.ammo -= cost; p.fire = blast ? 0.55 : 0.2; p.kick = 1; p.flash = 0.07; sfx.play(blast ? 'px.charge' : 'px.shot', { pitch: 0.8 }); this.hitscan(blast ? 0.3 : 0.05, blast ? 4 : 2, blast); } else { sfx.play('ui.back'); this.note('OUT OF AMMO'); } }
    p.flash -= dt;
    // things
    for (const e of this.things) {
      if (e.vell) { const tx = p.x - ca * 0.2 + sa * 0.9, ty = p.y - sa * 0.2 - ca * 0.9; e.x += (p.x + ca * 1.6 + sa * 0.5 - e.x) * dt * 2; e.y += (p.y + sa * 1.6 - ca * 0.5 - e.y) * dt * 2; void tx; void ty; continue; }
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.item) { if (d < 0.6) { e.dead = true; sfx.play('px.pickup'); if (e.k === 'a') { p.ammo += 20; this.note('AMMO +20'); } if (e.k === 'm') { p.hp = Math.min(100, p.hp + 25); this.note('HEALTH +25'); } if (e.k === 'k') { p.key = true; this.note('FRAME KEY'); g.music.setIntensity(1); } } continue; }
      e.t += dt; if (e.st === 'dead') continue; if (e.st === 'hurt') { if (e.t > 0.2) e.st = 'chase'; continue; }
      const see = d < 11 && this.los(e.x, e.y, p.x, p.y); if (e.st === 'idle' && see) { e.st = 'chase'; sfx.play('px.telegraph', { pitch: 0.5, vol: 0.5 }); }
      if (e.st === 'chase') { const sp2 = (e.k === 'i' ? 2.6 : e.k === 'h' ? 1 : 1.6) * dt, min = e.k === 'i' ? 0.7 : 3; if (d > min) this.tryMove(e, ((p.x - e.x) / d) * sp2, ((p.y - e.y) / d) * sp2, 0.25); e.cool -= dt; if (e.cool <= 0 && see && (e.k !== 'i' || d < 1)) { e.st = 'atk'; e.t = 0; } }
      if (e.st === 'atk' && e.t > 0.35) { e.st = 'chase'; e.cool = e.k === 'h' ? 0.7 : 1.4; if (e.k === 'i') { if (d < 1.1) this.hurt(8); } else { const a = Math.atan2(p.y - e.y, p.x - e.x); this.shots.push({ k: 'o', x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, item: true }); sfx.play('px.shot', { pitch: 0.5, vol: 0.5 }); } }
    }
    for (const s2 of this.shots) { s2.x += s2.vx * dt; s2.y += s2.vy * dt; if (this.solid(s2.x, s2.y)) s2.dead = true; else if (Math.hypot(p.x - s2.x, p.y - s2.y) < 0.35) { s2.dead = true; this.hurt(e2dmg); } }
    this.shots = this.shots.filter((q) => !q.dead); this.things = this.things.filter((q) => !q.dead);
    if (this.map[p.y | 0][p.x | 0] === 'E') this.startFinale();
    if (p.x > 10 && p.y < 5) this.say('a', 'vell', 'Doors open with E. So do walls that look a little TOO innocent.');
    if (p.y > 8 && p.y < 13 && p.x > 7 && p.x < 13) this.say('b', 'vell', 'The key is inside that ring and the opening faces a wall. Find the switch. Rooms rotate here.');
    if (p.hp <= 0) { g.save.data.stats.deaths++; g.sfx.play('px.die'); this.start(); }
  }
  say(k, who, text) { if (!this.said[k]) { this.said[k] = true; this.game.dialogue.say(who, text); } }
  hurt(n) { const p = this.p; p.hp -= this.game.easy ? n * 0.35 : n; p.hurt = 0.3; this.game.sfx.play('px.hurt'); }
  hitscan(spread, dmg, wide) {
    const p = this.p; let best = null, bd = 99;
    for (const e of this.things) { if (e.item || e.st === 'dead') continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - p.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.abs(da) < spread + 0.3 / d && this.los(p.x, p.y, e.x, e.y)) { if (wide) this.damage(e, dmg); else if (d < bd) { bd = d; best = e; } } }
    if (best) this.damage(best, dmg);
  }
  damage(e, n) { e.hp -= n; e.st = 'hurt'; e.t = 0; this.game.sfx.play('px.hit'); if (e.hp <= 0) { e.st = 'dead'; e.t = 0; this.game.sfx.play('px.explode', { vol: 0.6 }); if (Math.random() < 0.4) this.things.push({ k: 'a', x: e.x + 0.2, y: e.y, item: true }); } }
  rotateBlock() { // rotate the 5x5 section (13..17, 9..13) a quarter turn
    const x0 = 13, y0 = 9, n = 5, old = []; for (let y = 0; y < n; y++) old.push(this.map[y0 + y].slice(x0, x0 + n));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) this.map[y0 + y][x0 + x] = old[x][n - 1 - y];
    this.rot = 0.9; this.game.sfx.play('pp.rumble'); this.game.sfx.play('px.clank'); this.note('THE ROOM TURNS');
    for (const e of this.things) if (e.x > x0 && e.x < x0 + n && e.y > y0 && e.y < y0 + n) { const lx = e.x - x0, ly = e.y - y0; e.x = x0 + ly; e.y = y0 + n - lx; }
  }
  // ---- PSEUDO-3D → VOXEL: sprites swell, walls come apart into cubes ----------------
  startFinale() { const g = this.game; this.fin = { t: 0 }; this.noPause = true; g.input.exitLock(); g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'That one has a SIDE. Sprites do not have sides.' }, { who: 'vell', text: 'The walls are coming apart into... cubes. Oh, this is the blocky one!' }]); }
  updateFinale(dt) { const f = this.fin, g = this.game; f.t += dt; this.p.a += dt * 0.25; g.audio.muffle(clamp(f.t / 6, 0, 0.6)); if (f.t > 6.5 && !f.done) { f.done = true; const ok = g.director.handoff(6, { from5: true }); if (!ok) { g.save.complete(5); g.audio.muffle(0); g.director.end({ chapter: 5 }); } } }

  render() {
    const g = this.game, p = this.p, px = this.px, zb = this.zb, k = this.fin ? clamp(this.fin.t / 5, 0, 1) : 0, t = this.t;
    const rot = this.rot > 0 ? (this.rot -= 1 / 60, Math.sin(this.rot * 40) * this.rot * 0.05) : 0, pa = p.a + rot;
    const dirX = Math.cos(pa), dirY = Math.sin(pa), plX = -dirY * 0.72, plY = dirX * 0.72, horizon = (RH >> 1) + Math.round(Math.sin(p.bob) * 1.5);
    // ceiling + floor: banded gradient with ordered dither
    for (let y = 0; y < RH; y++) { const d = Math.abs(y - horizon) / (RH / 2), band = Math.min(6, Math.floor((1 - d) * 7)), top = y < horizon; for (let x = 0; x < VW; x++) { const dz = ((x + y) & 1) && ((1 - d) * 7) % 1 > 0.5 ? 1 : 0, s = this.shade[Math.min(6, band + dz)]; px[y * VW + x] = top ? (255 << 24) | ((70 * s) << 16) | ((40 * s) << 8) | (46 * s) : (255 << 24) | ((60 * s) << 16) | ((64 * s) << 8) | (78 * s); } }
    for (let x = 0; x < VW; x++) {
      const cam = (2 * x) / VW - 1, rx = dirX + plX * cam, ry = dirY + plY * cam; let mx = p.x | 0, my = p.y | 0; const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1; let sdx = (rx < 0 ? p.x - mx : mx + 1 - p.x) * ddx, sdy = (ry < 0 ? p.y - my : my + 1 - p.y) * ddy, side = 0, c = '.', dist = 0, u = 0;
      for (let i = 0; i < 48; i++) { if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; } c = this.map[my]?.[mx] || '#'; if (c === '.' || c === 'E') continue; dist = side ? sdy - ddy : sdx - ddx; u = side ? p.x + dist * rx : p.y + dist * ry; u -= Math.floor(u); const d = this.doors[mx + ',' + my]; if (d && u < d.open) continue; if (d) u -= d.open; break; }
      zb[x] = dist; const h = RH / Math.max(dist, 0.05), y0 = horizon - h / 2, tex = this.tex[c] || this.tex['#'], tx = (u * TX) & 31, sh = Math.min(6, Math.floor(dist * 0.55) + side);
      const ys = Math.max(0, Math.floor(y0)), ye = Math.min(RH, Math.floor(y0 + h));
      for (let y = ys; y < ye; y++) {
        let ty = ((y - y0) / h) * TX; if (k > 0) { // walls separate into cubes: gaps open on a 8-texel grid and the blocks drift
          const gx = (tx & 7) / 8, gy = (ty & 7) / 8, gap = k * 0.42; if (gx < gap || gy < gap || gx > 1 - gap * 0.3) { px[y * VW + x] = 0xff0d0f1f | 0; continue; } ty += Math.sin(t * 3 + (tx >> 3) * 2 + (ty >> 3)) * k * 3; }
        const col = tex[((ty & 31) << 5) | tx], s = this.shade[sh]; px[y * VW + x] = (255 << 24) | ((((col >> 16) & 255) * s) << 16) | ((((col >> 8) & 255) * s) << 8) | ((col & 255) * s);
      }
    }
    // sprites (far to near)
    const list = [...this.things, ...this.shots].map((e) => ({ e, d: (e.x - p.x) ** 2 + (e.y - p.y) ** 2 })).sort((a, b) => b.d - a.d);
    for (const { e } of list) {
      const dx = e.x - p.x, dy = e.y - p.y, inv = 1 / (plX * dirY - dirX * plY), tx2 = inv * (dirY * dx - dirX * dy), tz = inv * (-plY * dx + plX * dy); if (tz < 0.15) continue;
      const scr = (VW / 2) * (1 + tx2 / tz), sz = RH / tz, fat = e.item ? 1 : 1 + k * 1.6, w = sz * fat, x0 = Math.floor(scr - w / 2), y0 = Math.floor(horizon - sz / 2 + (e.vell ? Math.sin(t * 3) * sz * 0.06 - sz * 0.1 : 0));
      let fr = 0; if (!e.item) fr = e.st === 'dead' ? (e.t < 0.2 ? 4 : 5) : e.st === 'hurt' ? 3 : e.st === 'atk' ? 2 : Math.floor(e.t * 5) % 2; const tex = this.spr[e.k][fr], sh = this.shade[Math.min(5, Math.floor(tz * 0.45))];
      for (let x = Math.max(0, x0); x < Math.min(VW, x0 + w); x++) { if (zb[x] < tz) continue; const u = (((x - x0) / w) * 32) | 0; for (let y = Math.max(0, y0); y < Math.min(RH, y0 + sz); y++) { const col = tex[((((y - y0) / sz) * 32) | 0) * 32 + u]; if (col) { let r = (col & 255) * sh, gg = ((col >> 8) & 255) * sh, b = ((col >> 16) & 255) * sh; if (k > 0 && !e.item && (u < 5 || u > 26)) { r *= 0.6; gg *= 0.6; b *= 0.6; } px[y * VW + x] = (255 << 24) | (b << 16) | (gg << 8) | r; } } }
    }
    const bx = this.bx; bx.putImageData(this.img, 0, 0);
    // weapon: the frame-gun
    const wy = RH - 46 + Math.abs(Math.sin(p.bob * 0.5)) * 4 + p.kick * 8, wx = 160 + Math.sin(p.bob * 0.5) * 5, R = (c, x, y, w, h) => { bx.fillStyle = PAL[c]; bx.fillRect(Math.round(wx + x), Math.round(wy + y), w, h); };
    if (p.flash > 0) { R('Y', -12, -16, 24, 18); R('W', -7, -12, 14, 12); }
    R('K', -13, 0, 26, 46); R('h', -11, 2, 22, 44); R('i', -11, 2, 4, 44); R('G', 5, 2, 6, 44); R('K', -7, 2, 14, 8); R('c', -5, 4, 10, 4); R('y', -11, 20, 22, 4); R('K', -11, 24, 22, 1); R('f', -20, 30, 9, 16); R('S', -20, 30, 2, 16);
    // chunky status bar
    bx.fillStyle = PAL.g; bx.fillRect(0, RH, VW, VH - RH); bx.fillStyle = PAL.i; bx.fillRect(0, RH, VW, 1); bx.fillStyle = PAL.K; bx.fillRect(0, RH + 1, VW, 1);
    const cell = (x, w, label, val, col) => { bx.fillStyle = PAL.K; bx.fillRect(x, RH + 4, w, 24); bx.fillStyle = PAL.n; bx.fillRect(x + 1, RH + 5, w - 2, 22); ptext(bx, label, x + w / 2, RH + 7, PAL.h, 0.5, null); bx.save(); bx.translate(x + w / 2, RH + 15); bx.scale(1.5, 1.5); ptext(bx, val, 0, 0, col, 0.5, PAL.K); bx.restore(); };
    cell(4, 70, 'HEALTH', Math.max(0, p.hp | 0) + '%', p.hp > 30 ? PAL.J : PAL.R); cell(78, 60, 'AMMO', p.ammo, PAL.y); cell(246, 70, 'KEY', p.key ? 'FRAME' : '----', p.key ? PAL.y : PAL.G);
    bx.fillStyle = PAL.K; bx.fillRect(142, RH + 4, 100, 24); const at = g.director.modules[1]?.atlas; if (at) { bx.save(); bx.beginPath(); bx.rect(143, RH + 5, 52, 22); bx.clip(); bx.translate(168, RH + 78); bx.scale(2, 2); at.draw(bx, p.hurt > 0 ? 'rin_hurt0' : 'rin_idle0', 0, 0, Math.sin(t * 0.7) > 0); bx.restore(); } ptext(bx, 'RIN', 200, RH + 8, PAL.c, 0, null); ptext(bx, '1996', 200, RH + 18, PAL.O, 0, null);
    if (p.hurt > 0) { bx.fillStyle = 'rgba(194,54,47,0.35)'; bx.fillRect(0, 0, VW, RH); }
    if (this.msg) ptext(bx, this.msg.s, VW / 2, 12, PAL.Y, 0.5);
    if (this.title > 0) { ptext(bx, 'CHAPTER 5', VW / 2, 40, PAL.O, 0.5); bx.save(); bx.translate(VW / 2, 52); bx.scale(3, 3); ptext(bx, '1996', 0, 0, PAL.W, 0.5); bx.restore(); }
    const d = g.dialogue.current; if (d) { const lines = wrapText(g.dialogue.visibleText, 44), full = wrapText(d.text, 44), h = 14 + full.length * 9; const y = this.title > 0 ? 78 : 22; bx.globalAlpha = 0.85; bx.fillStyle = PAL.K; bx.fillRect(20, y, VW - 40, h); bx.globalAlpha = 1; bx.fillStyle = d.speaker.color; bx.fillRect(20, y, 2, h); ptext(bx, d.speaker.name, 26, y + 3, d.speaker.color, 0, null); lines.forEach((ln, i) => ptext(bx, ln, 26, y + 12 + i * 9, PAL.W, 0, null)); }
    if (this.introT < 3.2) { this.introT += 1 / 60; const it = this.introT, step = it < 0.8 ? 32 : it < 1.3 ? 16 : it < 1.8 ? 8 : it < 2.3 ? 4 : it < 2.8 ? 2 : 1; bx.imageSmoothingEnabled = false;
      if (this.snap && it < 1.3) { bx.globalAlpha = Math.min(1, (1.3 - it) / 0.7); bx.drawImage(this.snap, 0, 0, this.snap.width, this.snap.height, 0, 0, VW, RH); bx.globalAlpha = 1; }
      if (step > 1) { for (let x = 0; x < VW; x += step) bx.drawImage(this.buf, x, 0, 1, RH, x, 0, step, RH); for (let y = 0; y < RH; y += step) bx.drawImage(this.buf, 0, y, VW, 1, 0, y, VW, step); }
      const hud = Math.max(0, 1 - (it - 1.4) / 0.6); if (hud > 0) { bx.fillStyle = '#000'; bx.fillRect(0, RH, VW, VH - RH); bx.drawImage(this.buf, 0, RH - 1, VW, 1, 0, RH, VW, Math.round((VH - RH) * hud)); }
      if (Math.floor(it * 2) !== Math.floor((it - 1 / 60) * 2) && it < 2.8) g.sfx.play('px.glitch', { vol: 0.5, pitch: 0.6 + it * 0.3 }); }
    const ctx = g.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, g.W, g.H); const sc = Math.max(1, Math.floor(Math.min(g.W / VW, g.H / VH))); ctx.drawImage(this.buf, 0, 0, VW, VH, (g.W - VW * sc) >> 1, (g.H - VH * sc) >> 1, VW * sc, VH * sc);
  }
}
const e2dmg = 10;
void hexToRgb;
