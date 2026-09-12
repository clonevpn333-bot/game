#!/usr/bin/env node
/* =============================================================
 * Breachpoint — headless tests for the simulation core.
 *
 *   node tests/logic.test.js
 *
 * Modules 00–08 have no browser dependencies, so the ballistics,
 * movement, navigation, economy and full-match logic can all be
 * exercised without a renderer.
 * ============================================================= */
'use strict';
global.window = global;
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
['00_math', '01_config', '02_weapons', '03_maps', '04_world',
 '05_player', '06_grenades', '07_match', '08_bots'].forEach(f => require(path.join(SRC, f + '.js')));

const { M, C, W, P, G, Maps, World, Match, Bots } = CS;

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.01 : tol); }
function section(n) { console.log('\n' + n); }

/* ---------------- ballistics ---------------- */
section('Ballistics');
const ak = W.get('kr47');
ok('AK one-taps a helmeted head at 20 m',
   W.resolveDamage(ak, 20, C.HITGROUP.HEAD, 100, true).health > 100);
ok('AK body shot through armour is survivable',
   W.resolveDamage(ak, 10, C.HITGROUP.CHEST, 100, true).health < 40);
ok('Apex 700 body shot is lethal',
   W.resolveDamage(W.get('apex700'), 25, C.HITGROUP.CHEST, 100, true).health > 100);
ok('Leg shots ignore armour',
   W.resolveDamage(ak, 5, C.HITGROUP.LEG, 100, true).armor === 0);
ok('damage falls off with distance',
   W.falloff(W.get('viper10'), 40) < W.falloff(W.get('viper10'), 5));
ok('spray patterns are deterministic',
   JSON.stringify(W.patternCumulative(ak, 10)) === JSON.stringify(W.patternCumulative(ak, 10)));
ok('AK climbs then pulls left over the first ten rounds',
   W.patternCumulative(ak, 10).y > 6 && W.patternCumulative(ak, 10).x < 0);

/* ---------------- movement ---------------- */
section('Movement');
const world = new World(Maps.get('bazaar'));
const p = P.create({ team: C.TEAM.ATT });
P.spawn(p, { x: 0, y: 0.1, z: 20, yaw: Math.PI / 2 });   // straight down mid
P.giveWeapon(p, 'kr47');
const cmd = { forward: 1, side: 0, jump: false, duck: false, walk: false, yaw: p.yaw, pitch: 0 };
for (let i = 0; i < 96; i++) P.move(p, cmd, world, 1 / 64, false);
ok('rifle run speed matches the weapon', near(P.speed2D(p), 5.85, 0.05), P.speed2D(p).toFixed(2));
cmd.walk = true;
for (let i = 0; i < 64; i++) P.move(p, cmd, world, 1 / 64, false);
ok('walking is about half speed', near(P.speed2D(p), 5.85 * C.WALK_SCALE, 0.05));
cmd.walk = false; cmd.duck = true;
for (let i = 0; i < 128; i++) P.move(p, cmd, world, 1 / 64, false);
ok('crouching slows you and lowers the eye', near(P.speed2D(p), 5.85 * C.CROUCH_SCALE, 0.05) && near(p.eye, C.EYE_CROUCH, 0.02));
const fall = { pos: { x: 0, y: 12, z: 20 }, vel: { x: 0, y: 0, z: 0 }, onGround: false };
for (let i = 0; i < 200; i++) {
  if (!fall.onGround) fall.vel.y -= C.GRAVITY / 64;
  world.moveEntity(fall, 1 / 64, C.PLAYER_RADIUS, C.STAND_HEIGHT, C.STEP_HEIGHT);
}
ok('gravity settles an entity on the floor', fall.onGround && near(fall.pos.y, 0, 0.02));

/* ---------------- accuracy ---------------- */
section('Accuracy');
const still = P.create({ team: 1 }); P.spawn(still, Maps.get('bazaar').spawns[1][0]);
P.giveWeapon(still, 'kr47'); still.onGround = true;
const standing = P.inaccuracy(still);
still.vel.x = 5.8;
const running = P.inaccuracy(still);
still.vel.x = 0; still.ducking = true; still.duckAmount = 1;
const crouched = P.inaccuracy(still);
still.ducking = false; still.duckAmount = 0; still.onGround = false;
const airborne = P.inaccuracy(still);
ok('running is far less accurate than standing', running > standing * 20);
ok('crouching is more accurate than standing', crouched < standing);
ok('jumping is the least accurate of all', airborne > running);

/* ---------------- penetration ---------------- */
section('Wall penetration');
const penWorld = new World(Maps.get('foundry'));
const thin = penWorld.traceBullet(9.4, 1.3, -3, 1, 0, 0, 30, W.get('kr47'), [], 'x');
ok('a rifle round passes through sheet metal', thin.impacts.length >= 2 && thin.end.x > 12,
   thin.impacts.length + ' impacts, ends at x=' + thin.end.x.toFixed(1));
const thick = penWorld.traceBullet(9.4, 1.3, -3, 1, 0, 0, 30, W.get('gs18'), [], 'x');
ok('a pistol round is stopped by the same wall', thick.end.x < 11.5,
   'ends at x=' + thick.end.x.toFixed(1));

/* ---------------- navigation ---------------- */
section('Navigation');
for (const id of Maps.competitive) {
  const map = Maps.get(id), w = new World(map);
  const from = [map.spawns[1][0], map.spawns[2][0]];
  let allOk = true, lengths = [];
  for (const s of from) {
    for (const site of map.sites) {
      const route = w.findPath(s.x, s.y + 0.3, s.z, site.center.x, site.center.y + 0.3, site.center.z);
      if (!route) { allOk = false; continue; }
      let d = 0;
      for (let i = 1; i < route.length; i++) d += Math.hypot(route[i].x - route[i - 1].x, route[i].z - route[i - 1].z);
      lengths.push(Math.round(d));
    }
  }
  ok(id + ': both teams can reach both sites', allOk, lengths.join('m, ') + 'm');
  const spread = Math.max(...lengths) - Math.min(...lengths);
  ok(id + ': site approaches are balanced', spread < 30, spread + 'm spread');
}

/* ---------------- grenades ---------------- */
section('Grenades');
const gw = new World(Maps.get('bazaar'));
const gs = G.createState();
const thrower = P.create({ team: 1 });
P.spawn(thrower, { x: 0, y: 0.1, z: 20, yaw: Math.PI / 2 });
G.throwGrenade(gs, thrower, 'smoke', { x: 0, y: 1.6, z: 20 }, M.angleVectors(Math.PI / 2, 0.2), 1, 0);
let t = 0;
while (t < 4 && !gs.smokes.length) { t += 1 / 64; G.update(gs, gw, 1 / 64, t, [thrower], []); }
ok('a smoke deploys within its fuse', gs.smokes.length === 1, 't=' + t.toFixed(2));
for (let i = 0; i < 160; i++) { t += 1 / 64; G.update(gs, gw, 1 / 64, t, [thrower], []); }
const sm = gs.smokes[0];
ok('the cloud grows to full radius', near(sm.radius, W.get('smoke').radius, 0.1));
ok('the cloud blocks line of sight',
   !gw.canSee(sm.pos.x, sm.pos.y, sm.pos.z - 5, sm.pos.x, sm.pos.y, sm.pos.z + 5, gs.smokes));
const victim = P.create({ team: 2 });
P.spawn(victim, { x: 0, y: 0.1, z: 10, yaw: -Math.PI / 2 });
ok('a flash facing you blinds, behind you does not',
   G.flashEffect({ x: 0, y: 1.6, z: 16 }, victim, gw) !== null &&
   G.flashEffect({ x: 0, y: 1.6, z: 4 }, victim, gw) === null);
ok('HE peaks near 98 and fades to nothing',
   G.explosionDamage({ x: 0, y: 1.1, z: 10.2, radius: 7 }, victim, gw) > 90 &&
   G.explosionDamage({ x: 0, y: 1.1, z: 17, radius: 7 }, victim, gw) === 0);

/* ---------------- economy ---------------- */
section('Economy');
const em = new Match({ map: Maps.get('bazaar'), world: gw, rules: { mode: 'competitive' } });
const buyer = P.create({ team: C.TEAM.DEF, id: 'buyer' });
em.addPlayer(buyer);
em.beginRound();
buyer.money = 5000;
buyer.pos.x = 0; buyer.pos.y = 0.1; buyer.pos.z = -31;
ok('buying a rifle costs the listed price', em.buyFor(buyer, 'ar4').ok && buyer.money === 5000 - 3100);
ok('a vest then a helmet only charges the upgrade',
   em.buyFor(buyer, 'kevlar').ok && em.buyFor(buyer, 'kevlarHelmet').ok &&
   buyer.money === 5000 - 3100 - 650 - 350);
ok('attacker-only gear is refused to defenders', !P.canBuy(buyer, 'kr47', gw, em.rules, true).ok);
buyer.money = 50;
ok('you cannot buy what you cannot afford', !em.buyFor(buyer, 'apex700').ok);
ok('grenades cap at four', (function () {
  buyer.money = 16000;
  for (let i = 0; i < 8; i++) em.buyFor(buyer, 'flash');
  em.buyFor(buyer, 'he'); em.buyFor(buyer, 'smoke'); em.buyFor(buyer, 'incendiary');
  return P.grenadeCount(buyer) <= W.MAX_GRENADES;
})());

/* ---------------- full match ---------------- */
section('Full match');
for (const mapId of Maps.competitive) {
  const map = Maps.get(mapId), w = new World(map);
  const m = new Match({ map, world: w, rules: { mode: 'competitive', freezeTime: 2, roundTime: 55, botDifficulty: 'hard' } });
  m.fillBots(5, 'hard');
  m.startWarmup(0.5);
  let plants = 0, defuses = 0, explodes = 0, nades = 0, halftimes = 0, ended = null;
  for (let i = 0; i < 32 * 4000 && !m.matchOver; i++) {
    m.tick(1 / 32, null);
    for (const ev of m.events) {
      if (ev.t === 'bombPlanted') plants++;
      else if (ev.t === 'bombDefused') defuses++;
      else if (ev.t === 'bombExploded') explodes++;
      else if (ev.t === 'throw') nades++;
      else if (ev.t === 'halftime') halftimes++;
      else if (ev.t === 'matchEnd') ended = ev;
    }
    m.events.length = 0;
  }
  ok(mapId + ': the match reaches a result', !!ended,
     'score ' + m.score[1] + '-' + m.score[2] + ', ' + m.round + ' rounds');
  ok(mapId + ': sides swap at half time', halftimes === 1);
  ok(mapId + ': bots plant the bomb', plants > 0, plants + ' plants, ' + explodes + ' detonations, ' + defuses + ' defuses');
  ok(mapId + ': bots use their utility', nades > 0, nades + ' grenades thrown');
  const kills = m.players.reduce((a, x) => a + x.kills, 0);
  ok(mapId + ': kills are recorded', kills > 20, kills + ' kills');
}

/* ---------------- aim training ---------------- */
section('Aim training');
const aw = new World(Maps.get('arena'));
const am = new Match({ map: Maps.get('arena'), world: aw, rules: { mode: 'aim' } });
const shooter = P.create({ id: 'shooter', team: C.TEAM.DEF });
am.addPlayer(shooter);
am.startWarmup(0.1);
for (let i = 0; i < 30; i++) am.tick(1 / 64, {});
P.giveWeapon(shooter, 'kr47'); P.switchTo(shooter, 'primary'); shooter.deployTimer = 0;
let hits = 0, shots = 0;
for (let r = 0; r < 20; r++) {
  const tgt = am.targets[0];
  if (!tgt) break;
  const eye = P.eyePos(shooter);
  const d = { x: tgt.x - eye.x, y: tgt.y + 1.6 - eye.y, z: tgt.z - eye.z };
  const L = Math.hypot(d.x, d.y, d.z);
  const ang = M.vectorAngles({ x: d.x / L, y: d.y / L, z: d.z / L });
  shooter.yaw = ang.yaw; shooter.pitch = ang.pitch;
  shooter.recoilYaw = shooter.recoilPitch = shooter.fireSpread = 0; shooter.fireTimer = 0;
  const shot = P.tryFire(shooter, false);
  if (!shot) continue;
  shot.cone = 0; shots++;
  const before = am.aimStats.hits;
  am.resolveShot(shooter, shot);
  if (am.aimStats.hits > before) hits++;
  for (let k = 0; k < 8; k++) am.tick(1 / 64, {});
}
ok('every pop-up target has a clear line of sight', shots > 0 && hits === shots, hits + '/' + shots);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
