/* In-process system test of the authoritative room: every co-op verb, the
 * survival systems, campfires, ghosts and the extraction. Runs in a second. */
import { Room } from '../site/games/summit/sim/room.js';
import { ACT, PHASE, SURVIVAL, STAMINA, ITEMS } from '../site/games/summit/sim/shared.js';

let fails = 0;
const check = (label, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} ${extra}`); if (!ok) fails++; };

const room = new Room('TEST1', 12345);
const fakeWs = () => ({ readyState: 1, send() {}, close() {} });
const A = room.addPlayer(fakeWs(), { id: 'pA', token: 'tA', name: 'Ada', cosmetics: {} });
const B = room.addPlayer(fakeWs(), { id: 'pB', token: 'tB', name: 'Bo', cosmetics: {} });
check('two climbers joined', room.players.size === 2);

const tick = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) room.update(dt); };
const put = (p, x, y, z) => { p.move.x = x; p.move.z = z; p.move.y = y ?? room.world.height(x, z); p.move.vx = p.move.vy = p.move.vz = 0; };

/* ---- lobby -> flight ---- */
A.ready = true; B.ready = true;
tick(200);
check('lobby -> flight', room.phase === PHASE.FLIGHT, room.phase);

/* ---- skip the flight and the dive: drop both on the beach ---- */
room.setPhase(PHASE.CLIMB);
for (const p of [A, B]) { p.inPlane = false; put(p, room.world.beach.x, null, room.world.beach.z); }
tick(5);
check('on the beach', Math.abs(A.move.y - room.world.beach.y) < 3, 'y=' + A.move.y.toFixed(1));

/* ---- loot: open a crate and take what is inside ---- */
const spot = [...room.items.values()].find((i) => i.kind === 'crate');
put(A, spot.x + 0.5, spot.y + 0.2, spot.z);
room.action(A, { a: ACT.PICKUP, id: spot.id });
check('container opens', spot.open === true);
const before = A.inv.length;
room.action(A, { a: ACT.PICKUP, id: spot.id });
check('loot goes into the pack', A.inv.length > before, JSON.stringify(A.inv.map((s) => s.id)));

/* ---- weight matters ---- */
A.inv = [{ id: 'rope', n: 1 }, { id: 'medkit', n: 1 }, { id: 'coconut', n: 2 }];
const kg = A.inv.reduce((n, s) => n + ITEMS[s.id].kg * s.n, 0);
check('inventory has real weight', kg > 6, kg.toFixed(1) + ' kg');

/* ---- consumables ---- */
A.vitals.hp = 40;
A.inv = [{ id: 'medkit', n: 1 }, { id: 'berry', n: 2 }, { id: 'thermos', n: 1 }];
room.action(A, { a: ACT.USE, slot: 0 });
check('medkit heals', A.vitals.hp > 90, 'hp=' + A.vitals.hp.toFixed(0));
A.vitals.hunger = 40;
room.action(A, { a: ACT.USE, slot: 0 });
check('food feeds', A.vitals.hunger > 50, 'hunger=' + A.vitals.hunger.toFixed(0));
A.vitals.temp = 12;
room.action(A, { a: ACT.USE, slot: A.inv.findIndex((s) => s.id === 'thermos') });
check('thermos warms', A.vitals.temp > 40, 'temp=' + A.vitals.temp.toFixed(0));

/* ---- gear: rope anchor, piton, grapple, zipline ---- */
A.inv = [{ id: 'rope', n: 1 }, { id: 'piton', n: 2 }, { id: 'grapple', n: 1 }, { id: 'zipline', n: 1 }];
room.action(A, { a: ACT.USE, slot: 0 });
check('rope anchor placed', room.anchors.some((x) => x.kind === 'rope'));
room.action(A, { a: ACT.USE, slot: A.inv.findIndex((s) => s.id === 'piton') });
check('piton placed', room.anchors.some((x) => x.kind === 'piton'));
A.move.pitch = -0.5;
room.action(A, { a: ACT.USE, slot: A.inv.findIndex((s) => s.id === 'grapple') });
check('grapple fires at the rock', !!A.grapple);
tick(40);
check('grapple pulls you up and releases', A.grapple === null);
const zi = () => A.inv.findIndex((s) => s.id === 'zipline');
room.action(A, { a: ACT.USE, slot: zi() });
check('zipline first anchor', !!A.zipStart);
put(A, A.move.x + 40, null, A.move.z + 12);
room.action(A, { a: ACT.USE, slot: zi() });
check('zipline rigged', room.ziplines.length === 1);

/* ---- co-op: boost, rope throw, downed, revive, carry ---- */
put(B, A.move.x + 1.2, A.move.y, A.move.z);
A.move.stamina = STAMINA.max;
room.action(A, { a: ACT.BOOST, id: B.id });
check('boost costs stamina and lifts', A.move.stamina < STAMINA.max && B.boostT > 0);
A.inv.push({ id: 'rope', n: 1 });
room.action(A, { a: ACT.ROPE_THROW, id: B.id });
check('rope reaches a teammate', B.ropeT > 0);

B.vitals.hp = 1;
room.action(B, { a: ACT.USE, slot: 99 });
B.vitals.hp = 0; B.vitals.downed = true; B.vitals.downedHp = SURVIVAL.downedHp * 0.5;
room.action(A, { a: ACT.REVIVE, id: B.id, done: false });
tick(30);
check('revive restores a downed climber', !B.vitals.downed || B.vitals.downedHp > SURVIVAL.downedHp * 0.5,
  'downed=' + B.vitals.downed + ' hp=' + B.vitals.downedHp.toFixed(1));

B.vitals.dead = true; B.vitals.ghost = true;
room.action(A, { a: ACT.GRAB_PLAYER, id: B.id });
check('you can pick a body up', A.carrying === B.id && B.carriedBy === A.id);
put(A, A.move.x + 4, null, A.move.z);
tick(20);
check('the body follows you', Math.hypot(B.move.x - A.move.x, B.move.z - A.move.z) < 3);
room.action(A, { a: ACT.RELEASE_PLAYER, id: B.id });
check('and you can put it down', A.carrying === null);

/* ---- campfire lights, ghosts come back ---- */
const camp = room.world.campfires[0];
put(A, camp.x, null, camp.z);
room.action(A, { a: ACT.CAMP });
check('campfire lights', room.camps[0] === true);
check('lighting it brings the dead back', B.vitals.dead === false && B.vitals.ghost === false);

/* ---- ping and horn ---- */
room.action(A, { a: ACT.PING, x: 1, y: 2, z: 3 });
check('ping is placed in the world', room.marks.length === 1);
room.action(A, { a: ACT.HORN });
check('horn fires with a cooldown', A.hornCd > 0);

/* ---- survival bites ---- */
A.vitals.hunger = 0; A.vitals.hp = 100;
tick(90);
check('starving hurts', A.vitals.hp < 100, 'hp=' + A.vitals.hp.toFixed(1));
A.vitals.hp = 100; A.vitals.hunger = 80;
A.move.y = 900; A.vitals.temp = 4;
tick(60);
check('freezing hurts', A.vitals.hp < 100, 'hp=' + A.vitals.hp.toFixed(1));

/* ---- extraction ---- */
const s = room.world.summitPos;
put(A, s.x + 5, null, s.z + 5);
put(B, s.x - 5, null, s.z - 5);
A.vitals.hp = 100; B.vitals.hp = 100; A.vitals.dead = false; B.vitals.dead = false;
A.vitals.hunger = 100; B.vitals.hunger = 100; A.vitals.temp = 50; B.vitals.temp = 50;
tick(3);
check('reaching the top calls the helicopter', room.phase === PHASE.EXTRACT && !!room.heli, room.phase);
for (let i = 0; i < 30 * 20 && room.heli.state !== 'landed'; i++) { put(A, s.x + 5, null, s.z + 5); tick(1); }
check('the helicopter lands', room.heli.state === 'landed');
put(A, room.heli.x, null, room.heli.z);
put(B, room.heli.x + 1, null, room.heli.z + 1);
room.action(A, { a: ACT.BOARD_HELI });
room.action(B, { a: ACT.BOARD_HELI });
check('the team boards', A.boarded && B.boarded);
for (let i = 0; i < 30 * 12 && room.phase !== PHASE.RESULTS; i++) tick(1);
check('extraction ends the run', room.phase === PHASE.RESULTS, room.phase);
check('results are computed', !!room.results && room.results.extracted === true);
check('badges are awarded', (room.results.badges || []).length > 0, JSON.stringify(room.results.badges?.map((b) => b.label)));
check('coins are earned', room.results.players.every((p) => p.reward > 0), JSON.stringify(room.results.players.map((p) => p.reward)));

/* ---- back to the hangar ---- */
for (let i = 0; i < 30 * 45 && room.phase !== PHASE.LOBBY; i++) tick(1);
check('run resets to the hangar', room.phase === PHASE.LOBBY, room.phase);

console.log(fails ? `\n${fails} FAILURES` : '\nall green');
process.exit(fails ? 1 : 0);
