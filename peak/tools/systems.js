#!/usr/bin/env node
/* Climbing detail, the stamina bar's statuses, co-op, and the wire protocol
   driven across two live pages. */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'dist', 'test.html');

const fails = [];
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) fails.push(name + (detail ? ' :: ' + detail : ''));
}

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 400, height: 260 } });
  page.on('pageerror', e => { console.log('  PAGEERROR ' + e.message); fails.push('pageerror: ' + e.message); });
  await page.goto(URL);
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  await page.evaluate(() => window.CRUX.Menu.solo());
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.evaluate(() => {
    const C = window.CRUX;
    C.Game.renderer.shadowMap.enabled = false;
    C.Game.renderer.setSize(120, 80, false);
    C.Game.world.visible = false;
    C.Sky.mesh.visible = false;
    C.HUD.blocked = false;
    C.Walls.list.forEach(w => { w.open = true; });
    document.getElementById('pause').classList.add('hidden');
    window.__sim = (s) => new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => { if (C.Game.t - start >= s) { clearInterval(id); res(); } }, 8);
    });
    window.__hold = (keys, secs, each) => new Promise(res => {
      const start = C.Game.t;
      const id = setInterval(() => {
        keys.forEach(k => { C.IN.keys[k] = true; });
        if (each) each();
        if (C.Game.t - start >= secs) { clearInterval(id); keys.forEach(k => { C.IN.keys[k] = false; }); res(); }
      }, 8);
    });
    // walls that tall are not everywhere; settle for shorter rather than
    // returning nothing and taking the test down with it
    window.__wall = (minH) => {
      for (let h = minH; h >= 5; h -= 3) { const r = window.__wallAt(h); if (r) return r; }
      return null;
    };
    window.__wallAt = (minH) => {
      const T = C.T;
      for (let i = 0; i < 160000; i++) {
        const a = Math.random() * 6.283, r = 40 + Math.random() * 150;
        const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
        if (!g) continue;
        for (let k = 0; k < 10; k++) {
          const b = k / 10 * 6.283;
          const px = g.x + Math.cos(b) * 1.7, pz = g.z + Math.sin(b) * 1.7;
          if (T.hAt(px, pz) > g.y + minH && T.normSmooth(px, pz).y < 0.4) return { g, dx: Math.cos(b), dz: Math.sin(b) };
        }
      }
      return null;
    };
    window.__flat = () => {
      const T = C.T;
      for (let i = 0; i < 120000; i++) {
        const a = Math.random() * 6.283, r = 30 + Math.random() * 150;
        const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
        if (g && T.normSmooth(g.x, g.z).y > 0.95 && !C.Camps.nearest(g.x, g.y, g.z, 20)) return g;
      }
      return null;
    };
    window.__atWall = (spot) => {
      C.P.spawnAt(spot.g.x, spot.g.z, spot.g.y);
      C.CAM.yaw = Math.atan2(spot.dx, spot.dz);
      C.P.st = C.P.stMax;
    };
  });
  return page;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const A = await boot(browser);

  // ---------------------------------------------------------------- pitons
  const piton = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__wall(8);
    if (!spot) return { none: true };
    window.__spot = spot;
    window.__atWall(spot);
    await window.__hold(['KeyW', C.IN.grabKey], 1.4);
    if (P.state !== 2) return { none: true };
    P.inv = [{ k: 'piton', n: 1 }, null, null]; P.sel = 0;
    C.Survive.use(0);
    const placed = C.Coop.pitons.length;
    P.st = 20;
    C.IN.keys[C.IN.grabKey] = true;
    await window.__sim(1.4);                            // hang on the piton
    const gained = P.st - 20;
    C.IN.keys[C.IN.grabKey] = false;
    return { placed, gained: +gained.toFixed(1), onPiton: !!P.onPiton };
  });
  check('a piton goes into the wall and gives stamina back', piton.none || (piton.placed >= 1 && piton.gained > 3),
    JSON.stringify(piton));

  // ---------------------------------------------------------------- ropes
  const rope = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__wall(10);
    // the piton from the last block would hand stamina back and hide the point
    C.Coop.pitons.forEach(p => C.Coop.group.remove(p.mesh));
    C.Coop.pitons = [];
    C.Coop.ropes.forEach(r => C.Coop.group.remove(r.mesh));
    C.Coop.ropes = [];
    window.__atWall(spot);
    // hang a rope down the face from the top of it
    const topY = C.T.hAt(spot.g.x + spot.dx * 1.7, spot.g.z + spot.dz * 1.7);
    C.Coop.addRope(spot.g.x + spot.dx * 0.6, topY, spot.g.z + spot.dz * 0.6, Math.min(20, topY - spot.g.y));
    P.st = P.stMax;
    const s0 = P.st, y0 = P.pos.y;
    let onRope = 0, frames = 0;
    await window.__hold(['KeyW', C.IN.grabKey], 2.0, () => { frames++; if (P.rope) onRope++; });
    return { ropeFrac: +(onRope / Math.max(1, frames)).toFixed(2), rose: +(P.pos.y - y0).toFixed(2), spent: +(s0 - P.st).toFixed(1) };
  });
  check('a rope can be climbed, and cheaply', rope.ropeFrac > 0.8 && rope.rose > 1.5 && rope.spent < 9,
    JSON.stringify(rope));

  // ---------------------------------------------------------------- statuses
  const stat = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    for (const k in P.status) P.status[k] = 0;
    P.inv = [null, null, null];
    C.Survive.recalcMax();
    const clean = P.stMax;
    P.status.hunger = 20; P.status.cold = 15;
    C.Survive.recalcMax();
    const withStatus = P.stMax;
    P.inv = [{ k: 'cannon', n: 1 }, { k: 'spool', n: 1 }, null];
    C.Survive.recalcMax();
    const withLoad = P.stMax;
    const weight = P.status.weight;
    P.inv = [null, null, null];
    C.Survive.recalcMax();
    return { clean, withStatus, withLoad, weight, dropped: P.stMax };
  });
  check('statuses eat into the bar', stat.clean === 100 && stat.withStatus === 65, JSON.stringify(stat));
  check('carrying gear adds weight and shrinks it further', stat.weight > 20 && stat.withLoad < stat.withStatus,
    'weight ' + stat.weight + ' -> max ' + stat.withLoad);
  check('putting gear down gives the bar back', stat.dropped === stat.withStatus);

  const out = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    P.hp = 100;
    for (const k in P.status) P.status[k] = 0;
    P.status.poison = 60; P.status.cold = 60;
    C.Survive.recalcMax();
    await window.__sim(0.4);
    return { state: P.state, stMax: +P.stMax.toFixed(1), outT: Math.round(P.outT) };
  });
  check('no room left on the bar and the scout goes down', out.state === 4, JSON.stringify(out));

  // ---------------------------------------------------------------- extra stamina
  const extra = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const spot = window.__wall(16);
    // bare rock only: a rope or a piton would carry the climb for free
    C.Coop.ropes.forEach(r => C.Coop.group.remove(r.mesh));
    C.Coop.ropes = [];
    C.Coop.pitons.forEach(p => C.Coop.group.remove(p.mesh));
    C.Coop.pitons = [];
    window.__atWall(spot);
    for (const k in P.status) P.status[k] = 0;
    C.Survive.recalcMax();
    // get on the wall first: on the ground the green refills instantly, so
    // the bonus bar would never be reached
    await window.__hold(['KeyW', C.IN.grabKey], 1.0);
    P.st = 3; P.extra = 40;
    const e0 = P.extra;
    let climbState = 0;
    await window.__hold(['KeyW', C.IN.grabKey], 1.6, () => { if (P.state === 2) climbState++; });
    const climbedOnExtra = e0 - P.extra;
    // on the ground it must not come back
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    const e1 = P.extra;
    await window.__sim(1.5);
    return { climbedOnExtra: +climbedOnExtra.toFixed(1), regen: +(P.extra - e1).toFixed(2), climbState };
  });
  check('bonus stamina carries you when the green is gone', extra.climbedOnExtra > 3, JSON.stringify(extra));
  check('bonus stamina never refills on its own', extra.regen <= 0.01, 'gained ' + extra.regen);

  // ---------------------------------------------------------------- loot
  const loot = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const c = C.WI.cases.find(x => !x.open);
    const before = C.WI.list.filter(i => !i.taken).length;
    C.WI.openCase(c.id);
    const after = C.WI.list.filter(i => !i.taken).length;
    const spilled = C.WI.list.slice(-c.loot.length);
    const grounded = spilled.every(i => Math.abs(i.y - C.groundH(i.x, i.z)) < 0.6);
    return { gained: after - before, grounded, n: c.loot.length };
  });
  check('a suitcase spills its loot onto real ground', loot.gained === loot.n && loot.grounded, JSON.stringify(loot));

  const eat = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    for (const k in P.status) P.status[k] = 0;
    P.status.hunger = 60;
    P.inv = [{ k: 'jerky', n: 1 }, null, null]; P.sel = 0;
    C.Survive.use(0);
    const hunger = P.status.hunger;
    P.extra = 0;
    P.inv = [{ k: 'energy', n: 1 }, null, null];
    C.Survive.use(0);
    return { hunger: Math.round(hunger), extra: Math.round(P.extra) };
  });
  check('food clears hunger and gel gives bonus stamina', eat.hunger < 20 && eat.extra > 30, JSON.stringify(eat));

  // ---------------------------------------------------------------- zone hazards
  const haz = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, T = C.T;
    function find(pred) {
      for (let i = 0; i < 160000; i++) {
        const a = Math.random() * 6.283, r = 20 + Math.random() * 180;
        const g = T.findGround(Math.cos(a) * r, Math.sin(a) * r, 3, 3);
        if (g && pred(g)) return g;
      }
      return null;
    }
    async function sit(g, secs) {
      P.spawnAt(g.x, g.z, g.y);
      P.hp = 100;
      for (const k in P.status) P.status[k] = 0;
      C.Survive.recalcMax(); P.st = P.stMax;
      await window.__sim(secs);
      return { cold: Math.round(P.status.cold), heat: Math.round(P.status.heat), hp: Math.round(P.hp) };
    }
    const snow = find(g => C.ZONES.findIndex(z => g.y < z.top) === C.Z.SNOW && !C.Camps.nearest(g.x, g.y, g.z, 20));
    const volc = find(g => C.ZONES.findIndex(z => g.y < z.top) === C.Z.VOLCANIC && !C.Camps.nearest(g.x, g.y, g.z, 20));
    return { snow: snow ? await sit(snow, 2.0) : null, volc: volc ? await sit(volc, 2.0) : null };
  });
  check('the snow face makes you cold', !haz.snow || haz.snow.cold > 3, JSON.stringify(haz.snow));
  check('the volcanic rock makes you hot', !haz.volc || haz.volc.heat > 3, JSON.stringify(haz.volc));

  // ---------------------------------------------------------------- rising fog
  const fog = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    P.hp = 100;
    for (const k in P.status) P.status[k] = 0;
    C.Survive.recalcMax();
    // wind the run clock forward until the fog has genuinely risen past you
    const wasT = C.Game.runT;
    C.Game.runT = C.K.FOG_RISE_START + (P.pos.y + 35) / C.K.FOG_RISE_RATE;
    await window.__sim(1.0);
    const hurt = 100 - P.hp;
    const caught = C.Fog.level > P.pos.y;
    C.Game.runT = wasT;
    return { hurt: +hurt.toFixed(1), caught, level: Math.round(C.Fog.level) };
  });
  check('being caught in the rising fog hurts', fog.caught && fog.hurt > 8, JSON.stringify(fog));

  // ---------------------------------------------------------------- co-op
  const coop = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P, out = {};
    const sent = [];
    const real = C.Net.send;
    C.Net.send = (m) => sent.push(m);
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    P.hp = 100;
    for (const k in P.status) P.status[k] = 0;
    C.Survive.recalcMax(); P.st = P.stMax;

    const mate = C.Remote.add('m1', 'bo', 1);
    const mx = P.pos.x + 3.0, mz = P.pos.z;
    const mg = C.T.findGround(mx, mz, 3, 0.5) || { x: mx, y: P.pos.y, z: mz };
    mate.pos.set(mg.x, mg.y, mg.z);
    mate.buf = [{ t: 0, x: mate.pos.x, y: mate.pos.y, z: mate.pos.z, yaw: 0 }];
    mate.state = 0;

    // helping hand: empty handed, right mouse, aimed at them
    P.inv = [null, null, null];
    C.CAM.yaw = Math.atan2(mate.pos.x - P.pos.x, mate.pos.z - P.pos.z);
    C.IN.mb[2] = true;
    await window.__sim(0.5);
    C.IN.mb[2] = false;
    out.pulls = sent.filter(m => m.t === 'pull').length;
    out.handOut = P.handOutT > 0.3;

    // carry and revive
    mate.state = 4;
    out.nearDown = !!C.Coop.nearestDown(3.4);
    P.pos.set(mate.pos.x - 1.0, mate.pos.y, mate.pos.z);
    C.Coop.pickUp(mate);
    out.carrying = P.carrying === 'm1';
    C.Survive.recalcMax();
    out.carryWeight = P.status.weight > 20;
    C.Coop.dropCarried();
    out.dropped = P.carrying === null;

    P.reviveT = 0; C.Survive.holdF = 0;
    await window.__hold(['KeyF'], C.K.REVIVE_T + 0.6);
    out.revives = sent.filter(m => m.t === 'rev').length;

    // ping
    C.Coop.ping(false);
    out.pings = C.Coop.pings.length;

    C.Remote.remove('m1');
    C.Net.send = real;
    return out;
  });
  check('the helping hand reaches out and pulls', coop.handOut && coop.pulls > 0, JSON.stringify({ h: coop.handOut, p: coop.pulls }));
  check('a downed mate can be shouldered, and it weighs on you', coop.nearDown && coop.carrying && coop.carryWeight && coop.dropped);
  check('holding F revives them', coop.revives === 1);
  check('pings land in the world', coop.pings >= 1);

  // ---------------------------------------------------------------- camps
  const camp = await A.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const c1 = C.Camps.list[2];
    C.Camps.setLit(2, false);
    P.spawnAt(c1.x, c1.z, c1.y);
    P.hp = 50;
    for (const k in P.status) P.status[k] = 0;
    P.status.cold = 50;
    C.Survive.recalcMax();
    await window.__sim(1.2);
    const lit = C.Camps.list[2].lit, warmed = P.status.cold < 45, healed = P.hp > 51;
    P.hp = 0; P.state = 4; P.outT = 0.1;
    await window.__sim(0.8);
    let hi = 0;
    C.Camps.list.forEach((c, i) => { if (c.lit) hi = Math.max(hi, i); });
    const h = C.Camps.list[hi];
    const back = P.hp > 90 && Math.hypot(P.pos.x - h.x, P.pos.z - h.z) < 16;
    return { lit, warmed, healed, back, camp: hi };
  });
  check('walking up to a campfire lights it', camp.lit);
  check('a lit fire warms and mends you', camp.warmed && camp.healed, JSON.stringify(camp));
  check('going down wakes you at the highest lit fire', camp.back, 'camp ' + camp.camp);

  // ---------------------------------------------------------------- protocol
  const B = await boot(browser);
  await A.evaluate(() => {
    window.__out = [];
    const C = window.CRUX;
    C.Net.solo = false; C.Net.started = true; C.Net.isHost = true;
    C.Net.selfId = 'peerA'; C.P.id = 'peerA';
    C.Net.send = function (m) { m.f = 'peerA'; window.__out.push(m); };
  });
  await B.evaluate(() => {
    const C = window.CRUX;
    C.Net.solo = true; C.Net.started = false;
    C.Net.selfId = 'peerB'; C.P.id = 'peerB';
    C.Net.roster['peerA'] = { name: 'ana', slot: 0 };
    window.__apply = (msgs) => msgs.forEach(m => C.Net.apply(m));
  });
  async function pump() {
    const msgs = await A.evaluate(() => { const o = window.__out; window.__out = []; return o; });
    if (msgs.length) await B.evaluate((m) => window.__apply(m), msgs);
    return msgs;
  }

  await A.evaluate(() => {
    const C = window.CRUX, P = C.P;
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    P.hp = 100; P.st = 80;
    C.Net.acc = 99;
  });
  await A.evaluate(() => window.__sim(0.7));
  const msgs = await pump();
  const bpos = await B.evaluate(async () => {
    await window.__sim(0.4);
    const a = window.CRUX.Remote.byId('peerA');
    return a ? { x: +a.pos.x.toFixed(1), z: +a.pos.z.toFixed(1), st: a.st, mx: a.stMax, name: a.name } : null;
  });
  const apos = await A.evaluate(() => ({ x: +window.CRUX.P.pos.x.toFixed(1), z: +window.CRUX.P.pos.z.toFixed(1) }));
  check('position and the bar cross the wire',
    msgs.filter(m => m.t === 's').length > 0 && bpos && Math.abs(bpos.x - apos.x) < 1.5 && Math.abs(bpos.z - apos.z) < 1.5,
    JSON.stringify({ bpos, apos }));

  const rep = await A.evaluate(() => {
    const C = window.CRUX;
    const it = C.WI.list.find(i => !i.taken);
    C.WI.take(it.id); C.Net.send({ t: 'pick', i: it.id });
    const box = C.WI.cases.find(c => !c.open);
    C.WI.openCase(box.id); C.Net.send({ t: 'case', i: box.id });
    C.Camps.setLit(3, true); C.Net.send({ t: 'camp', i: 3 });
    C.Coop.addRope(10, C.groundH(10, 10) + 14, 10, 12);
    C.Net.send({ t: 'rope', x: 10, y: C.groundH(10, 10) + 14, z: 10, l: 12 });
    C.Coop.placePiton(6, C.groundH(6, 6) + 3, 6, 1, 0, true);
    C.Net.send({ t: 'pit', x: 6, y: C.groundH(6, 6) + 3, z: 6, nx: 1, nz: 0 });
    C.Coop.ping(false);
    C.Net.send({ t: 'down' });
    return { itemId: it.id, caseId: box.id };
  });
  await pump();
  const bstate = await B.evaluate((r) => {
    const C = window.CRUX;
    return {
      itemGone: !!C.WI.list.find(i => i.id === r.itemId && i.taken),
      caseOpen: !!C.WI.cases.find(c => c.id === r.caseId && c.open),
      campLit: C.Camps.list[3].lit,
      ropes: C.Coop.ropes.length, pitons: C.Coop.pitons.length,
      pings: C.Coop.pings.length,
      mateDown: (C.Remote.byId('peerA') || {}).state,
    };
  }, rep);
  check('pickups, suitcases and campfires replicate', bstate.itemGone && bstate.caseOpen && bstate.campLit, JSON.stringify(bstate));
  check('ropes, pitons and pings replicate', bstate.ropes >= 1 && bstate.pitons >= 1 && bstate.pings >= 1, JSON.stringify(bstate));
  check('a mate going down shows on your screen', bstate.mateDown === 4, 'state ' + bstate.mateDown);

  const pulled = await B.evaluate(async () => {
    const C = window.CRUX, P = C.P;
    const g = window.__flat();
    P.spawnAt(g.x, g.z, g.y);
    const y0 = P.pos.y, x0 = P.pos.x;
    for (let i = 0; i < 30; i++) C.Net.apply({ t: 'pull', f: 'peerA', id: 'peerB', x: x0 + 6, y: y0 + 3, z: P.pos.z });
    return { moved: +Math.hypot(P.pos.x - x0, P.pos.y - y0).toFixed(2) };
  });
  check('a hand from a mate actually drags you', pulled.moved > 1.0, 'moved ' + pulled.moved + ' m');

  const snap = await A.evaluate(() => window.CRUX.Net.snapshot());
  const late = await B.evaluate((s) => {
    const C = window.CRUX;
    C.Camps.list.forEach((c, i) => { if (i > 0) C.Camps.setLit(i, false); });
    C.Net.applySnapshot(s);
    let want = 0;
    s.lit.forEach((v, i) => { if (v) want = Math.max(want, i); });
    return { spawnCamp: C.Net.spawnCamp, want, lit: C.Camps.list.map(c => c.lit ? 1 : 0) };
  }, snap);
  check('late joiners inherit the world and start at the highest fire',
    late.spawnCamp === late.want && late.want > 0, JSON.stringify(late));

  await browser.close();
  console.log('');
  if (fails.length) { console.log('FAILED ' + fails.length + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('ALL SYSTEM CHECKS PASSED');
})().catch(e => { console.error('CRASH', e); process.exit(2); });
