// GETAWAY! — Mission 07: BRIDGE RUN
// On foot. Halcyon has Gramps in an armored van in the middle of the old swing bridge, and the bridge is wired to
// blow. Fight span by span across it with a rifle, grenade launcher and the new Breacher RPG, pull Gramps out,
// survive the gunship, then RUN — the spans detonate one after another behind you, and the only way out is the river.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand } from '../core/utils.js';
import { V3, baseSetup } from './helpers.js';
import { Gunship } from './air.js';
import { mergeParts } from '../world/props.js';

// ---------------- the old swing bridge: 6 spans that can each be blown into the river ----------------
const BZ = -200, X0 = 352, X1 = 448, HALF = 7, SPANS = 6, DY = 0.15;
let BR = null;
function bridge() {
  if (BR) return BR;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }); // same program as other vertex-coloured props
  const B = (w, h, d, x, y, z, c) => ({ geo: new THREE.BoxGeometry(w, h, d).translate(x, y, z), c });
  const L = (X1 - X0) / SPANS; const spans = [];
  for (let i = 0; i < SPANS; i++) {
    const x0 = X0 + i * L, cx = x0 + L / 2; const p = [B(L - 0.15, 1.0, HALF * 2, 0, -0.5, 0, 0x6f6a62), B(L - 0.15, 0.02, HALF * 2 - 1, 0, 0.01, 0, 0x34373b), B(L - 0.15, 0.03, 0.18, 0, 0.03, 0, 0xe8e1c8)];
    for (const s of [-1, 1]) { p.push(B(L - 0.15, 0.5, 0.25, 0, 1.1, s * (HALF - 0.15), 0x7d2f22), B(L - 0.15, 0.18, 0.18, 0, 0.6, s * (HALF - 0.15), 0x7d2f22)); for (let k = 0; k <= 4; k++) p.push(B(0.18, 1.2, 0.18, -L / 2 + 0.2 + k * (L - 0.4) / 4, 0.55, s * (HALF - 0.15), 0x5b2218)); p.push(B(0.25, 7, 0.25, 0, 3.5, s * (HALF + 0.2), 0x5b2218), B(L - 0.15, 0.25, 0.25, 0, 6.9, s * (HALF + 0.2), 0x5b2218)); }
    p.push(B(1.2, 0.5, 0.8, 0, -1.2, 0, 0xc0392b)); // demolition charge under the deck
    const g = new THREE.Group(); g.position.set(cx, DY, BZ); const m = new THREE.Mesh(mergeParts(p), mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })); led.position.set(0, -0.9, 0.42); g.add(led);
    spans.push({ i, g, led, x0, x1: x0 + L, cx, boxes: [], down: false, fall: 0 });
  }
  // the piers between spans (stay standing: they look great with a gap between them)
  const piers = new THREE.Mesh(mergeParts(Array.from({ length: SPANS + 1 }, (_, k) => B(2.2, 9, HALF * 2 + 1, X0 + k * L - (X0 + X1) / 2, -4.6, 0, 0x5d5953))), mat); piers.position.set((X0 + X1) / 2, DY, BZ);
  BR = { spans, piers, L, mat }; return BR;
}
function placeBridge() {
  const b = bridge(); const S = G.world.static;
  G.scene.add(b.piers);
  for (const s of b.spans) {
    s.down = false; s.fall = 0; s.g.position.set(s.cx, DY, BZ); s.g.rotation.set(0, 0, 0); s.g.visible = true; G.scene.add(s.g);
    if (!s.boxes.length) { s.boxes.push(S.addBox(s.x0, DY - 1, BZ - HALF, s.x1, DY, BZ + HALF, { mat: 'concrete', tag: 'bridge' })); for (const z of [-1, 1]) s.boxes.push(S.addBox(s.x0, DY, BZ + z * (HALF - 0.3) - 0.15, s.x1, DY + 1.35, BZ + z * (HALF - 0.3) + 0.15, { mat: 'metal', surface: false })); }
    for (const bx of s.boxes) bx.disabled = false;
  }
  return b;
}
function removeBridge() { if (!BR) return; G.scene.remove(BR.piers); for (const s of BR.spans) { G.scene.remove(s.g); for (const bx of s.boxes) bx.disabled = true; } }
function blowSpan(s) {
  if (s.down) return; s.down = true; for (const bx of s.boxes) bx.disabled = true;
  const c = V3(s.cx, DY, BZ); G.emit('explosion', c.clone().add(V3(0, -0.5, 0)), 2.2, 'charge', null); G.emit('explosion', c.clone().add(V3(rand(-5, 5), 0.5, rand(-5, 5))), 1.2, 'charge', null);
  if (G.fx) { G.fx.debris(c, 40, 0x6f6a62, 12, 0.5); G.fx.dust(c, 30, 6, 0.6); } G.cam.shake(0.8); if (G.audio) G.audio.rumble(c, 3, 1.2);
  // anything standing on it goes in the water too
  for (const v of G.vehicles.list) if (v.pos.x > s.x0 && v.pos.x < s.x1 && Math.abs(v.pos.z - BZ) < HALF + 1 && v.mode === 'drive') { v.toRigid(V3(rand(-2, 2), rand(-1, 1), rand(-2, 2))); }
}
function animateSpans(dt) {
  if (!BR) return; for (const s of BR.spans) { if (!s.down || s.fall > 6) continue; s.fall += dt; const k = Math.min(1, s.fall / 2.2);
    s.g.position.y = DY - k * k * 9; s.g.rotation.z = (s.i % 2 ? 1 : -1) * k * 0.6; s.g.rotation.x = k * 0.15;
    if (s.fall > 2.2 && !s.splashed) { s.splashed = true; if (G.fx) G.fx.splash(V3(s.cx, -0.8, BZ), 3); } if (s.fall > 6) s.g.visible = false; }
  for (const s of BR.spans) if (!s.down) s.led.visible = Math.floor(G.time * 3) % 2 === 0;
}

// ---------------- mission ----------------
function setup(m) {
  baseSetup(m, { hour: 7.2, weather: 'fog', tier: 2, maxStars: 3, dmg: 0.55, acc: 0.5, weapons: ['smg', 'rifle', 'heavy'] });
  const P = G.player; P.inv.rpg = { mag: 1, res: 6 }; P.inv.heavy.res = 12; P.inv.rifle.res = 240; P.setWeapon('rifle');
  G.police.enabled = false; m.ents.offs.push(() => { G.police.enabled = true; });
  G.traffic.populate(); G.peds.populate();
  placeBridge(); m.track({ dispose: removeBridge });
  const off = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r) animateSpans(dt); }); m.ents.offs.push(off);
}
function merc(m, x, z, role = 'hold', kind = 'halcyon') { return m.npc(kind, x, DY + 0.1, z, -Math.PI / 2, { role, acc: 0.45 }); }
function wreck(m, x, z, yaw) { const v = m.vehicle(Math.random() < 0.5 ? 'sedan' : 'van', { x, z, yaw }); v.hp = 1; v.explode(); return v; }

async function cp0(m) {
  setup(m); G.player.teleport(322, 0.2, BZ, Math.PI / 2); m.music('desert', 3);
  m.r.flow.showIntro(m.def); m.lock(true);
  await m.cine({ dur: 6, fov: 42, pos: (k) => V3(330 + k * 40, 14 - k * 6, BZ - 30 + k * 10), look: () => V3(400, 1, BZ) });
  m.r.flow.hideIntro(); m.lock(false);
  m.say('DEZ', 'They\'ve got Gramps in that van in the middle. And Kit — the whole bridge is wired. Every span.');
  // first line: wrecks for cover, mercs dug in on spans 1-3
  wreck(m, 372, BZ - 3, 1.2); wreck(m, 384, BZ + 4, -0.4); const crew = [];
  for (const [x, z, r] of [[368, -4, 'hold'], [375, 4, 'flank'], [380, -5, 'hold'], [388, 3, 'hold'], [366, 5, 'flank'], [392, -2, 'hold']]) crew.push(merc(m, x, BZ + z, r));
  m.objective('PUSH ONTO THE BRIDGE', 'TAKE OUT THE FIRST LINE (0/6) · 4 = GRENADES · 6 = RPG');
  const off = m.r.flow.game.addUpdater(() => { const n = crew.filter((c) => !c.alive).length; G.hud.objective('PUSH ONTO THE BRIDGE', `TAKE OUT THE FIRST LINE (${n}/6) · 4 = GRENADES · 6 = RPG`); }); m.ents.offs.push(off);
  await m.until(() => crew.every((c) => !c.alive)); off();
}
async function cp1(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(366, DY + 0.2, BZ, Math.PI / 2); m.music('desert', 3); }
  const van = m.vehicle('armored', { x: 404, z: BZ, yaw: Math.PI / 2, color: 0x15171b }); van.siren = false; m.vars.van = van; van.armor = 30;
  wreck(m, 412, BZ + 4, 0.3); const crew = [];
  for (const [x, z, r, k] of [[410, -4, 'hold', 'halcyon'], [414, 3, 'hold', 'halcyon'], [420, -3, 'flank', 'halcyon'], [426, 4, 'hold', 'swat'], [432, -1, 'hold', 'halcyon'], [398, 5, 'flank', 'halcyon'], [440, 2, 'hold', 'swat']]) crew.push(merc(m, x, BZ + z, r, k));
  m.say('GRAMPS', '(muffled) …is somebody SHOOTING out there? Good. About time.');
  m.objective('GET TO THE VAN', 'GRAMPS IS INSIDE — CLEAR THE ESCORT');
  await m.until(() => crew.filter((c) => c.alive).length <= 1 && G.player.pos.x > 392, { timeout: 200 });
  m.objective('FREE GRAMPS', 'PRESS E AT THE VAN DOORS'); const mk = m.marker(V3(399, DY, BZ), { r: 1.6, h: 3 });
  await m.until(() => { const near = Math.hypot(G.player.pos.x - 399, G.player.pos.z - BZ) < 3; G.hud.promptOverride = near ? '<kbd>E</kbd> Rip the doors open' : null; return near && G.input.pressed('interact'); });
  G.hud.promptOverride = null; m.unmark(mk); van.setDoor && (van.setDoor(1, true), van.setDoor(-1, true)); if (G.audio) G.audio.creak(van.pos, 2);
  m.say('GRAMPS', 'Took you long enough! Now what\'s that beeping— oh. OH.');
}
async function cp2(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(398, DY + 0.2, BZ - 2, -Math.PI / 2); m.music('desert', 4); }
  m.intensity(4); m.say('JUNO', 'Halcyon gunship, inbound from the docks! It\'s going to cut you to pieces out there — RPG, Kit, NOW!');
  const gs = new Gunship(V3(520, 40, BZ + 60), { hp: 520, aggro: 1.1 }); m.track({ dispose: () => gs.dispose() });
  const off = m.r.flow.game.addUpdater((dt) => { if (G.mission === m.r && !gs.gone) gs.update(dt, G.player.pos); }); m.ents.offs.push(off);
  const P = G.player; if (P.inv.rpg.res < 4) P.inv.rpg.res = 4; P.setWeapon('rpg');
  m.objective('SHOOT DOWN THE GUNSHIP', 'RPG (6) LOCKS ON IF THE CROSSHAIR IS NEAR IT');
  const b = m.blip(() => (gs.alive ? gs.pos : null), { color: '#ff3b2f', size: 7 });
  // reinforcements rope in while it circles
  for (const [x, z] of [[446, -4], [446, 4]]) merc(m, x, BZ + z, 'flank');
  await m.until(() => !gs.alive, { timeout: 240 }); m.unblip(b); m.slowmo(1.6, 0.3);
  if (G.stunts) G.stunts.award('GUNSHIP DOWN ON FOOT', 1500);
}
async function cp3(m, fresh) {
  if (fresh) { setup(m); G.player.teleport(398, DY + 0.2, BZ - 2, -Math.PI / 2); m.music('desert', 4); }
  m.intensity(4); m.say('DEZ', 'They\'re blowing it from the far end! RUN, KIT — WEST, WEST, WEST!');
  const b = bridge(); const order = [5, 4, 3, 2, 1, 0]; let k = 0; m.timer(26, { failReason: 'THE BRIDGE CAME DOWN ON YOU' });
  m.objective('RUN!', 'GET OFF THE BRIDGE — THE SPANS ARE GOING');
  const chain = m.r.flow.game.addUpdater(() => { if (G.mission !== m.r) return; const t = 26 - (m.r.timerLeft || 0); while (k < order.length && t > 3 + k * 4) blowSpan(b.spans[order[k++]]); }); m.ents.offs.push(chain);
  // the west end gets blocked: a fuel tanker detonates there — the river is the only way out
  await m.until(() => G.player.pos.x < 372 || k >= 3);
  const tk = m.vehicle('truck', { x: 344, z: BZ + 2, yaw: 0.3 }); tk.hp = 1; tk.explode(); G.emit('explosion', V3(346, 1, BZ), 2.6, 'tanker', null); G.emit('explosion', V3(340, 1, BZ - 4), 1.8, 'tanker', null);
  m.slowmo(1.2, 0.3); m.say('GRAMPS', 'Tanker! The road\'s on FIRE — over the rail, kid, INTO THE RIVER!');
  m.objective('JUMP INTO THE RIVER', 'OVER THE SIDE RAIL');
  const water = V3(380, -0.8, BZ - 16); const mk = m.marker(water, { r: 5, h: 6 }); const bl = m.blip(water, { color: '#ffd36b', size: 7 });
  await m.until(() => G.player.swimming || (G.player.pos.y < -0.3 && G.player.pos.x > 358 && G.player.pos.x < 442)); m.unmark(mk); m.unblip(bl); m.stopTimer(); chain();
  for (let i = k; i < order.length; i++) blowSpan(b.spans[order[i]]);
  // Juno's chopper hauls you out under the burning bridge
  G.police.reset(); m.intensity(1); m.lock(true);
  const p = m.cine({ dur: 11, fov: 46, pos: (q) => V3(330 + q * 30, 3 + q * 22, BZ - 50 - q * 10), look: (q) => V3(400, 2 + q * 10, BZ) });
  await m.sayWait('JUNO', 'Got you on thermals. Two very wet idiots in the river. Lowering the line.', 3.4);
  await m.sayWait('GRAMPS', 'Fifty years I\'ve lived in this city. First time I\'ve swum in that river. Never again.', 3.6);
  await m.sayWait('DEZ', 'Halcyon blew a bridge to keep one van quiet. What was Gramps carrying?', 3.4);
  await m.sayWait('GRAMPS', '…An invoice. With a very interesting airline on it.', 2.8);
  await p; m.lock(false);
}
export const M07 = {
  id: 'm07', num: 7, act: 1, title: 'BRIDGE RUN', music: 'desert', par: 540,
  desc: 'On foot. Gramps is in a van on a bridge wired to blow. Fight across it, kill the gunship with an RPG, then run as the spans fall.',
  unlocks: [{ track: 'desert' }], deathText: 'KIT WENT DOWN ON THE BRIDGE', checkpoints: [cp0, cp1, cp2, cp3],
};
