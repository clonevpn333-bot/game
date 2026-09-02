#!/usr/bin/env node
/* Drives the co-op, survival and networking systems and checks they behave.
   Two pages are wired together through the test runner so the wire protocol
   is exercised end to end without needing a signalling server. */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'dist', 'test.html');

const fails = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' :: ' + detail : ''));
}

async function boot(browser, seed) {
  const page = await browser.newPage({ viewport: { width: 400, height: 260 } });
  page.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); fails.push('pageerror: ' + e.message); });
  await page.goto(URL);
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  await page.evaluate((s) => {
    window.__seed = s;
    window.CRUX.Menu.solo();
  }, seed);
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = false;   // a 2048 map clear costs
    C.Game.renderer.setSize(120, 80, false);      // ~300ms under swiftshader
    C.Game.world.visible = false;
    C.Sky.mesh.visible = false;
    C.HUD.blocked = false;
    document.getElementById('pause').classList.add('hidden');
    // Wall-clock waits are useless here: swiftshader runs the loop at a few
    // frames a second, so tests wait on simulated time instead.
    window.__sim = function (secs) {
      return new Promise(function (res) {
        var start = C.Game.t;
        var id = setInterval(function () {
          if (C.Game.t - start >= secs) { clearInterval(id); res(); }
        }, 8);
      });
    };
  });
  return page;
}

async function frames(page, secs) { await page.evaluate((s) => window.__sim(s), secs); }

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const A = await boot(browser, 12345);

  // ---------------------------------------------------------------- climbing surfaces
  const surf = await A.evaluate(async () => {
    const C = window.CRUX, T = C.T, P = C.P, SF = { ROCK: 0, ICE: 1, LOOSE: 2, VINE: 3 };
    function findWall(want) {
      for (let i = 0; i < 300000; i++) {
        const a = Math.random() * 6.283, r = 30 + Math.random() * 160;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = T.hAt(x, z);
        if (h <= T.VOID || h < 15) continue;
        if (T.normSmooth(x, z).y > 0.42) continue;
        if (T.surfAt(x, z) !== want) continue;
        const n = T.normSmooth(x, z);
        const l = Math.hypot(n.x, n.z) || 1;
        return { x: x + n.x / l * 0.42, y: h, z: z + n.z / l * 0.42, nx: n.x / l, nz: n.z / l };
      }
      return null;
    }
    function place(w, want) {
      P.pos.set(w.x, w.y, w.z);
      P.vel.set(0, 0, 0); P.fallFrom = w.y; P.grounded = false;
      P.wall.has = true; P.wall.nx = w.nx; P.wall.nz = w.nz;
      P.wall.surf = want; P.wall.ny = 0.3; P.wall.cell = T.cellOf(w.x - w.nx, w.z - w.nz);
      P.state = 2; P.climbing = true; P.st = 100; P.hunger = 100;
      P.inj.arm = 0; P.carrying = null; P.looseT = 0; P.looseCell = -1;
    }
    // the wall probe re-reads the surface every frame, so only a spot the
    // probe itself agrees about is a valid test of that surface
    async function settle(want) {
      for (let tries = 0; tries < 40; tries++) {
        const w = findWall(want);
        if (!w) return null;
        place(w, want);
        await window.__sim(0.12);
        if (P.state === 2 && P.wall.surf === want) { place(w, want); return w; }
      }
      return null;
    }
    async function drain(want, secs, still) {
      const w = await settle(want);
      if (!w) return null;
      const t0 = P.st, cell0 = P.wall.cell;
      return await new Promise(res => {
        const start = C.Game.t;
        const id = setInterval(() => {
          if (!still) C.IN.keys['KeyW'] = true;
          if (C.Game.t - start >= secs) {
            clearInterval(id); C.IN.keys['KeyW'] = false;
            res({ drained: t0 - P.st, state: P.state, surf: P.wall.surf, broken: !!T.BROKEN[cell0] });
          }
        }, 8);
      });
    }
    const rock = await drain(SF.ROCK, 1.4, true);
    const ice = await drain(SF.ICE, 1.4, true);
    const vine = await drain(SF.VINE, 1.4, true);
    let loose = null;
    for (let k = 0; k < 6; k++) {
      loose = await drain(SF.LOOSE, 2.4, true);
      if (!loose || loose.broken) break;
    }
    return { rock, ice, vine, loose };
  });
  check('rock costs stamina to hang on', surf.rock && surf.rock.drained > 2, JSON.stringify(surf.rock));
  check('ice burns stamina faster than rock', surf.ice && surf.rock && surf.ice.drained > surf.rock.drained * 1.4,
    'ice ' + (surf.ice ? surf.ice.drained.toFixed(1) : '-') + ' vs rock ' + (surf.rock ? surf.rock.drained.toFixed(1) : '-'));
  check('roots and vines are a free hold', surf.vine && surf.vine.drained < 0.5, JSON.stringify(surf.vine));
  check('loose rock tears out and drops you', !surf.loose || (surf.loose.broken && surf.loose.state !== 2), JSON.stringify(surf.loose));

  // ---------------------------------------------------------------- stamina rules
  const stam = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    // find flat ground
    let spot = null;
    for (let i = 0; i < 60000 && !spot; i++) {
      const a = Math.random() * 6.283, r = 20 + Math.random() * 150;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = T.hAt(x, z);
      if (h > T.VOID && h > 8 && T.normSmooth(x, z).y > 0.94) spot = { x, z, h };
    }
    P.pos.set(spot.x, spot.h, spot.z); P.state = 0; P.vel.set(0, 0, 0);
    P.fallFrom = spot.h; P.grounded = true;
    P.st = 20; P.hunger = 100; P.hp = 100; P.temp = 100; P.sprinting = false;
    await window.__sim(0.9);
    const flat = P.st;
    P.st = 20; P.hunger = 10;
    await window.__sim(0.9);
    return { flatRegen: flat - 20, cappedMax: P.stMax, hungryCap: P.st };
  });
  check('stamina comes back on flat ground', stam.flatRegen > 4, 'regained ' + stam.flatRegen.toFixed(1));
  check('hunger caps maximum stamina', stam.cappedMax < 70, 'cap ' + stam.cappedMax.toFixed(0));

  // ---------------------------------------------------------------- cold
  const cold = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    let spot = null;
    for (let i = 0; i < 90000 && !spot; i++) {
      const a = Math.random() * 6.283, r = 20 + Math.random() * 90;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = T.hAt(x, z);
      if (h > 200 && T.normSmooth(x, z).y > 0.9 && !C.Camps.nearest(x, h, z, 22)) spot = { x, z, h };
    }
    if (!spot) return null;
    async function run(parka) {
      P.pos.set(spot.x, spot.h, spot.z); P.state = 0; P.vel.set(0, 0, 0);
      P.fallFrom = spot.h; P.grounded = true;
      P.temp = 100; P.parka = parka; P.hp = 100; P.torchOn = false;
      await window.__sim(1.4);
      return 100 - P.temp;
    }
    const bare = await run(false);
    const clad = await run(true);
    return { bare, clad, y: Math.round(spot.h) };
  });
  check('the cold bites above the alpine line', cold && cold.bare > 1, cold ? 'lost ' + cold.bare.toFixed(1) + ' at ' + cold.y + 'm' : 'no alpine spot');
  check('a parka slows the freeze', cold && cold.clad < cold.bare * 0.8, cold ? 'bare ' + cold.bare.toFixed(1) + ' vs parka ' + cold.clad.toFixed(1) : '');

  // ---------------------------------------------------------------- co-op
  const coop = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T, out = {};
    C.IN.keys = {};
    const sent = [];
    const realSend = C.Net.send;
    C.Net.send = function (m) { sent.push(m); };

    // flat ground with room
    let spot = null;
    for (let i = 0; i < 200000 && !spot; i++) {
      const a = Math.random() * 6.283, r = 120 + Math.random() * 85;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = T.hAt(x, z);
      // low and sheltered: gusts on an exposed ledge would walk the test
      // subject off its mark over the seconds a revive takes
      if (h > T.VOID && h > 4 && h < 42 && T.normSmooth(x, z).y > 0.94) spot = { x, z, h };
    }
    function stand() {
      P.pos.set(spot.x, spot.h, spot.z); P.state = 0; P.vel.set(0, 0, 0);
      P.fallFrom = spot.h; P.grounded = true;
    }
    stand();
    P.parka = false; P.hunger = 100;
    P.hp = 100; P.st = 100; P.summited = false;

    // ping
    const pings0 = C.Coop.pings.length;
    C.Coop.ping(false);
    out.ping = C.Coop.pings.length - pings0;
    out.pingSent = sent.filter(m => m.t === 'ping').length;

    // rope
    P.inv = [{ k: 'rope', n: 1 }, null, null, null]; P.sel = 0;
    C.Coop.plantAnchor();
    out.anchors = C.Coop.anchors.length;
    out.ropeConsumed = !P.inv[0];
    out.ropeSent = sent.filter(m => m.t === 'rope').length;

    // piton on a wall
    P.state = 2; P.wall.has = true; P.wall.nx = 1; P.wall.nz = 0;
    P.inv = [{ k: 'piton', n: 1 }, null, null, null];
    C.Survive.use(0);
    out.pitons = C.Coop.pitons.length;
    P.state = 0;

    // a downed mate: carry, then revive
    const mate = C.Remote.add('mate1', 'bo', 1);
    mate.pos.set(P.pos.x + 1.1, P.pos.y, P.pos.z);
    mate.buf = [{ t: 0, x: mate.pos.x, y: mate.pos.y, z: mate.pos.z, yaw: 0 }];
    mate.state = 3;
    out.nearestDown = !!C.Coop.nearestDown(2.6);
    C.Coop.pickUp(mate);
    out.carrying = P.carrying === 'mate1';
    C.Coop.dropCarried();
    out.dropped = P.carrying === null;

    // hold E long enough to revive
    stand();
    mate.pos.set(P.pos.x + 1.1, P.pos.y, P.pos.z);
    mate.buf = [{ t: 0, x: mate.pos.x, y: mate.pos.y, z: mate.pos.z, yaw: 0 }];
    mate.state = 3; mate.carriedBy = null;
    P.reviveT = 0; C.Survive.eHold = 0;
    await new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => {
        C.IN.keys['KeyE'] = true;
        if (C.Game.t - start >= C.K.REVIVE_T + 0.6) { clearInterval(id); C.IN.keys['KeyE'] = false; res(); }
      }, 8);
    });
    out.reviveSent = sent.filter(m => m.t === 'rev').length;

    // pass an item to a mate
    mate.state = 0;
    stand();
    P.inv = [{ k: 'jerky', n: 1 }, null, null, null]; P.sel = 0;
    const thrown0 = C.WI.thrown.length;
    C.Coop.passItem();
    out.tossed = C.WI.thrown.length - thrown0;
    out.gaveSent = sent.filter(m => m.t === 'give').length;
    out.handEmptied = !P.inv[0];

    // brace: a mate becomes a platform to stand on
    stand();
    mate.brace = true;
    mate.pos.set(P.pos.x, P.pos.y, P.pos.z);
    mate.buf = [{ t: 0, x: mate.pos.x, y: mate.pos.y, z: mate.pos.z, yaw: 0 }];
    const braceFloor = mate.pos.y;
    P.pos.y += 2.2;
    P.state = 1; P.vel.set(0, 0, 0); P.fallFrom = P.pos.y; P.hp = 100;
    await window.__sim(1.4);
    out.stoodOnMate = P.pos.y > braceFloor + 1.0 && P.pos.y < braceFloor + 1.5;
    out.braceY = +(P.pos.y - braceFloor).toFixed(2);

    C.Remote.remove('mate1');
    C.Net.send = realSend;
    return out;
  });
  check('ping marks a route for everyone', coop.ping === 1 && coop.pingSent === 1, JSON.stringify({ p: coop.ping, s: coop.pingSent }));
  check('rope anchor plants and is spent', coop.anchors >= 1 && coop.ropeConsumed && coop.ropeSent === 1, JSON.stringify(coop));
  check('piton hammers into the wall', coop.pitons >= 1, 'pitons ' + coop.pitons);
  check('a downed mate can be shouldered and set down', coop.nearestDown && coop.carrying && coop.dropped);
  check('holding E revives a mate', coop.reviveSent === 1);
  check('gear can be thrown to a mate', coop.tossed === 1 && coop.gaveSent === 1 && coop.handEmptied);
  check('you can stand on a braced mate', coop.stoodOnMate, 'height over mate ' + coop.braceY);

  // ---------------------------------------------------------------- camps & summit
  const run = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, out = {};
    C.IN.keys = {};
    const c1 = C.Camps.list[1];
    C.Camps.setLit(1, false);
    P.pos.set(c1.x, c1.y + 0.4, c1.z); P.state = 0; P.vel.set(0, 0, 0);
    P.fallFrom = c1.y + 0.4; P.grounded = true; P.hunger = 100;
    P.hp = 40; P.temp = 40; P.summited = false;
    const origSpawn = P.spawnAt, origHurt = C.Survive.hurt;
    P.spawnAt = function (x, y, z) { out.spawnTrace = out.spawnTrace || (new Error('spawn')).stack; return origSpawn(x, y, z); };
    C.Survive.hurt = function (d, c) { if (d > 5) out.bigHurt = out.bigHurt || { d: +d.toFixed(1), c: c, st: (new Error('h')).stack }; return origHurt(d, c); };
    await window.__sim(0.8);
    P.spawnAt = origSpawn; C.Survive.hurt = origHurt;
    out.lit = C.Camps.list[1].lit;
    out.warmed = P.temp > 45;
    out.healed = P.hp > 41;

    P.hp = 0; P.state = 3; P.downT = 0.1;
    await window.__sim(0.8);
    let hi = 0;
    C.Camps.list.forEach((c, i) => { if (c.lit) hi = Math.max(hi, i); });
    const hc = C.Camps.list[hi];
    out.respawnedAtCamp = P.hp > 40 && Math.hypot(P.pos.x - hc.x, P.pos.z - hc.z) < 14;
    out.respawnCamp = hi;

    P.pos.set(1, C.Summit.pos.y + 1, 1); P.state = 0; P.fallFrom = C.Summit.pos.y + 1;
    await window.__sim(0.4);
    out.summit = P.summited && !document.getElementById('over').classList.contains('hidden');
    P.summited = false;
    document.getElementById('over').classList.add('hidden');
    C.HUD.blocked = false;
    return out;
  });
  check('walking into a camp lights it', run.lit);
  check('a lit camp warms and mends you', run.warmed && run.healed, JSON.stringify(run));
  check('going down respawns you at the highest camp', run.respawnedAtCamp, 'camp ' + run.respawnCamp);
  check('reaching the top ends the run', run.summit);

  // ---------------------------------------------------------------- view toggle
  const view = await A.evaluate(async () => {
    const C = window.CRUX;
    const was = C.CAM.first;
    C.IN.hit['KeyV'] = true;
    await window.__sim(0.1);
    const flipped = C.CAM.first !== was;
    const hidden = C.CAM.first ? C.CAM.hideBody : true;
    C.CAM.first = false;
    return { flipped, hidden };
  });
  check('first person toggles and hides the body', view.flipped && view.hidden, JSON.stringify(view));

  // ---------------------------------------------------------------- camera
  const cam = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    let tested = 0, inside = 0, worst = 0, worstAt = null;
    for (let i = 0; i < 90; i++) {
      let spot = null;
      for (let k = 0; k < 4000 && !spot; k++) {
        const a = Math.random() * 6.283, r = Math.random() * (C.K.BASE_R - 6);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = T.hAt(x, z);
        if (h > T.VOID && h > 3 && T.normSmooth(x, z).y > C.K.WALK_COS) spot = { x, z, h };
      }
      if (!spot) continue;
      P.pos.set(spot.x, spot.h, spot.z); P.state = 0; P.vel.set(0, 0, 0);
      P.fallFrom = spot.h; P.grounded = true; P.hp = 100; P.temp = 100; P.summited = false;
      C.CAM.yaw = Math.random() * 6.283 - 3.14;
      C.CAM.pitch = Math.random() * 1.6 - 0.8;
      C.CAM.dist = 4.7; C.CAM.lift = 0; C.CAM.first = false;
      C.CAM.smoothTgt.set(P.pos.x, P.pos.y + C.K.EYE, P.pos.z);
      await window.__sim(0.28);
      const g = C.groundH(C.CAM.pos.x, C.CAM.pos.z);
      tested++;
      if (g > T.VOID && C.CAM.pos.y < g) {
        inside++;
        const d = g - C.CAM.pos.y;
        if (d > worst) { worst = d; worstAt = { y: +P.pos.y.toFixed(1), yaw: +C.CAM.yaw.toFixed(2), pitch: +C.CAM.pitch.toFixed(2) }; }
      }
    }
    return { tested, inside, worst: +worst.toFixed(2), worstAt };
  });
  check('the camera never ends up inside the rock', cam.inside === 0,
    cam.inside + '/' + cam.tested + ' buried, worst ' + cam.worst + 'm ' + JSON.stringify(cam.worstAt));

  // ---------------------------------------------------------------- protocol, two pages
  const B = await boot(browser, 12345);
  const proto = { };
  await A.evaluate(() => {
    window.__out = [];
    window.CRUX.Net.solo = false; window.CRUX.Net.started = true;
    window.CRUX.Net.selfId = 'peerA'; window.CRUX.P.id = 'peerA';
    window.CRUX.Net.isHost = true;
    window.CRUX.Net.send = function (m) { m.f = 'peerA'; window.__out.push(m); };
  });
  await B.evaluate(() => {
    const C = window.CRUX;
    C.Net.solo = true; C.Net.started = false;
    C.Net.selfId = 'peerB'; C.P.id = 'peerB';
    C.Net.roster['peerA'] = { name: 'ana', slot: 0 };
    C.Net.roster['peerB'] = { name: 'bo', slot: 1 };
    window.__apply = (msgs) => { msgs.forEach(m => C.Net.apply(m)); };
  });

  async function pump() {
    const msgs = await A.evaluate(() => { const o = window.__out; window.__out = []; return o; });
    if (msgs.length) await B.evaluate((m) => window.__apply(m), msgs);
    return msgs;
  }

  // A moves; B should see a climber appear and follow
  await A.evaluate(() => {
    const C = window.CRUX, P = C.P;
    P.pos.set(20, C.groundH(20, 20) + 0.2, 20); P.state = 0; P.yaw = 1.1;
    P.fallFrom = P.pos.y; P.grounded = true; P.hp = 100; P.hunger = 100; P.temp = 100;
    C.Net.acc = 99;
  });
  await frames(A, 0.6);
  let msgs = await pump();
  const seenState = msgs.filter(m => m.t === 's').length;
  const bpos = await B.evaluate(async () => {
    await window.__sim(0.4);
    const a = window.CRUX.Remote.byId('peerA');
    return a ? { x: +a.pos.x.toFixed(1), z: +a.pos.z.toFixed(1), name: a.name, slot: a.slot, hp: a.hp } : null;
  });
  check('position and vitals cross the wire', seenState > 0 && bpos && Math.abs(bpos.x - 20) < 1.5 && Math.abs(bpos.z - 20) < 1.5,
    JSON.stringify({ seenState, bpos }));

  // item pickup, camp lighting, crumbling rock and pings all replicate
  const rep = await A.evaluate(() => {
    const C = window.CRUX;
    const it = C.WI.list.find(i => !i.taken);
    C.WI.take(it.id); C.Net.send({ t: 'pick', i: it.id });
    C.Camps.setLit(2, true); C.Net.send({ t: 'camp', i: 2 });
    const cell = C.T.cellOf(30, 30);
    C.T.BROKEN[cell] = 1; C.Net.send({ t: 'brk', c: cell });
    C.Coop.ping(false);
    const anchorId = 'a1';
    C.Coop.addAnchor({ id: anchorId, owner: 'peerA', x: 5, y: C.groundH(5, 5), z: 5, slot: 0 });
    C.Net.send({ t: 'rope', id: anchorId, x: 5, y: C.groundH(5, 5), z: 5, slot: 0, owner: 'peerA' });
    return { itemId: it.id, cell: cell };
  });
  await pump();
  const bstate = await B.evaluate((r) => {
    const C = window.CRUX;
    return {
      itemGone: !!C.WI.list.find(i => i.id === r.itemId && i.taken),
      campLit: C.Camps.list[2].lit,
      broken: !!C.T.BROKEN[r.cell],
      pings: C.Coop.pings.length,
      anchors: C.Coop.anchors.length,
    };
  }, rep);
  check('item pickups replicate', bstate.itemGone);
  check('camp checkpoints replicate', bstate.campLit);
  check('crumbled holds replicate', bstate.broken);
  check('pings replicate', bstate.pings >= 1);
  check('rope anchors replicate', bstate.anchors >= 1);

  // a late joiner gets the world state and spawns at the group's high camp
  const snap = await A.evaluate(() => window.CRUX.Net.snapshot());
  const late = await B.evaluate((s) => {
    const C = window.CRUX;
    C.Camps.list.forEach((c, i) => { if (i > 0) C.Camps.setLit(i, false); });
    C.Net.applySnapshot(s);
    let want = 0;
    s.lit.forEach((v, i) => { if (v) want = Math.max(want, i); });
    return { spawnCamp: C.Net.spawnCamp, want: want, lit: C.Camps.list.map(c => c.lit ? 1 : 0), snapLit: s.lit };
  }, snap);
  check('late joiners inherit the world and start at the high camp',
    late.spawnCamp === late.want && late.want > 0 && late.lit[late.want] === 1, JSON.stringify(late));

  // a downed mate shows on the other screen
  await A.evaluate(() => { window.CRUX.Net.send({ t: 'down' }); });
  await pump();
  const downSeen = await B.evaluate(() => {
    const a = window.CRUX.Remote.byId('peerA');
    return a ? a.state : -1;
  });
  check('a mate going down shows on your screen', downSeen === 3, 'state ' + downSeen);

  await browser.close();
  console.log('');
  if (fails.length) { console.log('FAILED ' + fails.length + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL SYSTEM CHECKS PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
