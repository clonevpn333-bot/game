// GETAWAY! — handcrafted landmarks: bank, construction site, parking garage, rooftop run, mall,
// Dez's garage (hideout), police HQ, train station, park, pier.
import * as THREE from 'three';
import { CURB, LANDMARKS as L, RAIL_Z } from './layout.js';
import { hex3, containerStacks, SHOP_NAMES } from './city.js';

const SIGN = (name) => Math.max(0, SHOP_NAMES.indexOf(name));

export function buildLandmarks(ctx) {
  bank(ctx); construction(ctx); garage(ctx); rooftops(ctx); mall(ctx); hideout(ctx); police(ctx); station(ctx); park(ctx); pier(ctx);
}

function wallWithDoor(ctx, mat, axis, c, a0, a1, y0, y1, t, doors = [], o = {}) {
  // wall along axis ('x' => runs along X at z=c ; 'z' => along Z at x=c) with door gaps [{a0,a1,h}]
  let a = a0; const segs = [];
  for (const d of [...doors].sort((p, q) => p.a0 - q.a0)) { segs.push([a, d.a0, y0, y1]); segs.push([d.a0, d.a1, y0 + d.h, y1]); a = d.a1; }
  segs.push([a, a1, y0, y1]);
  for (const [s0, s1, yy0, yy1] of segs) {
    if (s1 - s0 < 0.01 || yy1 - yy0 < 0.01) continue;
    if (axis === 'x') ctx.solid(mat, s0, yy0, c - t / 2, s1, yy1, c + t / 2, { tw: o.tw || 6, th: o.th, base: y0 });
    else ctx.solid(mat, c - t / 2, yy0, s0, c + t / 2, yy1, s1, { tw: o.tw || 6, th: o.th, base: y0 });
  }
}

// ---------------- First Meridian Bank ----------------
function bank(ctx) {
  const b = L.bank; const { S, B } = ctx; const x0 = -78, x1 = -22, z0 = -80, z1 = -40, hall = 10, top = 24;
  ctx.groundQuad('plaza', b.x0, b.z0, b.x1, b.z1, CURB + 0.01, 6);
  const fm = 'fac_bank_0';
  // exterior walls (hall level) with front door
  wallWithDoor(ctx, fm, 'x', z1, x0, x1, CURB, hall, 1, [{ a0: -54, a1: -46, h: 5 }], { tw: 12, th: 16 });
  wallWithDoor(ctx, fm, 'x', z0, x0, x1, CURB, hall, 1, [{ a0: -32, a1: -28, h: 3 }], { tw: 12, th: 16 });
  wallWithDoor(ctx, fm, 'z', x0, z0, z1, CURB, hall, 1, [], { tw: 12, th: 16 });
  wallWithDoor(ctx, fm, 'z', x1, z0, z1, CURB, hall, 1, [{ a0: -72, a1: -68, h: 3 }], { tw: 12, th: 16 });
  // upper floors
  ctx.building(x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, top, 'bank', 0, { y0: hall, clutter: true });
  B.box('plaza', x0, CURB, z0, x1, CURB + 0.02, z1, { faces: 'py', topScale: 3 });
  B.box('vc', x0 + 0.5, hall - 0.3, z0 + 0.5, x1 - 0.5, hall - 0.29, z1 - 0.5, { faces: 'ny', color: hex3(0xe8e2d0) });
  for (let x = x0 + 6; x < x1 - 3; x += 9) for (let z = z0 + 6; z < z1 - 3; z += 10) { ctx.glowBox(0xfff4dc, x - 1.5, hall - 0.35, z - 1.5, x + 1.5, hall - 0.3, z + 1.5); }
  ctx.interiorLights.push({ x: -50, y: hall - 1, z: -60, color: 0xfff0d0, intensity: 60, distance: 45 });
  // interior: marble pillars, teller counter, vault
  for (const px of [-66, -56, -44, -34]) for (const pz of [-50, -66]) ctx.solid('concrete', px - 0.6, CURB, pz - 0.6, px + 0.6, hall, pz + 0.6, { tw: 2 });
  ctx.vbox(0x6b4a2b, -70, CURB, -59.5, -30, CURB + 1.15, -58.5, true); ctx.vbox(0xd8c9a0, -70.2, CURB + 1.15, -59.7, -29.8, CURB + 1.25, -58.3);
  for (let x = -68; x < -31; x += 5) ctx.vbox(0x9ad0e0, x, CURB + 1.25, -59.1, x + 4, CURB + 2.6, -59.0); // glass partitions
  // vault room
  wallWithDoor(ctx, 'concrete', 'x', -70, -62, -38, CURB, hall, 0.8, [{ a0: -52.5, a1: -47.5, h: 4 }]);
  wallWithDoor(ctx, 'concrete', 'z', -62, z0, -70, CURB, hall, 0.8); wallWithDoor(ctx, 'concrete', 'z', -38, z0, -70, CURB, hall, 0.8);
  ctx.vbox(0x8f969c, -54, CURB, -70.6, -46, CURB + 4.6, -70.3, false, { metal: true });
  // vault door (dynamic, swings open)
  const door = new THREE.Group(); door.position.set(-52.5, CURB + 2, -69.5);
  const dm = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.6, 32), new THREE.MeshStandardMaterial({ color: 0xa8adb2, metalness: 0.9, roughness: 0.3 }));
  dm.rotation.x = Math.PI / 2; dm.position.x = 2.5; door.add(dm);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.25 })); wheel.position.set(2.5, 0, 0.35); door.add(wheel);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), wheel.material); sp.rotation.z = i * Math.PI / 4; sp.position.copy(wheel.position); door.add(sp); }
  ctx.root.add(door); const vaultBox = S.addBox(-54, CURB, -70.2, -46, CURB + 4.6, -69, { mat: 'metal', tag: 'vaultDoor' });
  // cash pallets inside vault
  const cash = []; for (let i = 0; i < 6; i++) { const cx = -59 + (i % 3) * 5, cz = -77 + Math.floor(i / 3) * 3.2; ctx.vbox(0x6d5b3a, cx - 1, CURB, cz - 0.6, cx + 1, CURB + 0.3, cz + 0.6, true); cash.push({ x: cx, y: CURB + 0.3, z: cz }); }
  // portico columns + pediment + steps
  for (let i = 0; i < 6; i++) { const cx = -71 + i * 8.4 - (i >= 3 ? 0 : 0); if (Math.abs(cx + 50) < 3) continue; const g = new THREE.CylinderGeometry(0.75, 0.85, 12.5, 16); B.geom('concrete', g, new THREE.Matrix4().makeTranslation(cx, CURB + 6.4, -36.2)); S.addBox(cx - 0.8, 0, -37, cx + 0.8, 12.8, -35.4); }
  ctx.vbox(0xe6e0d2, -78, 12.8, -40, -22, 14.2, -34.5, true);
  for (let k = 0; k < 5; k++) ctx.vbox(0xe6e0d2, -78 + k * 5.2, 14.2 + k * 0.55, -39.5, -22 - k * 5.2, 14.75 + k * 0.55, -35, true);
  for (let s = 0; s < 3; s++) ctx.solid('concrete', -76 + s, CURB + s * 0.2 - 0.2, -34.5 + s * 0.8 - 2.4, -24 - s, CURB + s * 0.2, -34.5, { tw: 4, top: 'concrete' });
  ctx.sign(SIGN('BANK ATM'), -38, 6, z1 + 0.6, 4, 0.8, 'pz');
  // bank name plate (dedicated texture)
  ctx.landmarks.bank = { door: { x: -50, z: -40 }, vault: { x: -50, z: -74 }, vaultDoor: door, vaultBox, cash, counter: { x: -50, z: -59 }, back: { x: -30, z: -80 }, plaza: { x: -50, z: -22 }, hall: { x0, z0, x1, z1, h: hall } };
  ctx.wander.push({ x0: -86, z0: -34, x1: -14, z1: -14, density: 2.5 });
  ctx.pedAreas.push({ x0: -86, z0: -34, x1: -14, z1: -14 });
  for (let i = 0; i < 8; i++) ctx.prop('bench', -82 + i * 9, -16, Math.PI);
  for (let i = 0; i < 6; i++) ctx.tree(-84 + i * 13, -26, 'round', 1.1);
}

// ---------------- Construction site ----------------
function construction(ctx) {
  const c = L.construction; const { S, B } = ctx;
  ctx.groundQuad('dirt', c.x0, c.z0, c.x1, c.z1, CURB + 0.01, 8);
  // fence (breakable panels) with gates on west/east at z -140..-125
  for (let x = c.x0; x < c.x1; x += 3) { ctx.prop('fence', x + 1.5, c.z0, 0); ctx.prop('fence', x + 1.5, c.z1, 0); }
  for (let z = c.z0; z < c.z1; z += 3) { if (z + 1.5 > -142 && z + 1.5 < -122) continue; ctx.prop('fence', c.x0, z + 1.5, Math.PI / 2); ctx.prop('fence', c.x1, z + 1.5, Math.PI / 2); }
  ctx.prop('barrier', c.x0, -133, Math.PI / 2); ctx.prop('barrier', c.x1, -133, Math.PI / 2);
  // steel skeleton tower x 150..182, z -184..-150, 14 floors
  const tx0 = 150, tx1 = 182, tz0 = -184, tz1 = -150, fh = 4, floors = 14;
  for (let f = 1; f <= floors; f++) {
    const y = CURB + f * fh; const partial = f > 10;
    if (partial) ctx.solid('concrete', tx0, y - 0.35, tz0, tx0 + (tx1 - tx0) * 0.55, y, tz1, { tw: 4, top: 'concrete' });
    else ctx.solid('concrete', tx0, y - 0.35, tz0, tx1, y, tz1, { tw: 4, top: 'concrete' });
    // safety rail on edges
    ctx.vbox(0xe0a91c, tx0, y, tz1 - 0.1, partial ? tx0 + 17 : tx1, y + 1.1, tz1, true);
  }
  for (const x of [tx0, (tx0 + tx1) / 2, tx1 - 0.6]) for (const z of [tz0, (tz0 + tz1) / 2, tz1 - 0.6]) {
    const hgt = x > tx0 + 20 ? CURB + 10 * fh + 2 : CURB + floors * fh + 2; ctx.solid('steel', x, CURB, z, x + 0.6, hgt, z + 0.6, { tw: 2 });
  }
  // interior stair ramps (zig-zag) on west side for on-foot climbing
  for (let f = 0; f < floors; f++) { const y = CURB + f * fh; const dir = f % 2; S.addRamp(tx0 + 1, tz0 + 2, tx0 + 3, tz0 + 14, 'z', dir ? y + fh : y, dir ? y : y + fh, { tag: 'stairs', mat: 'metal' }); ctx.deco('metal', tx0 + 1, y, tz0 + 2, tx0 + 3, y + 0.1, tz0 + 14, { tw: 2 }); }
  // scaffolding on north face
  for (let f = 0; f < 6; f++) { const y = CURB + f * 2.5; ctx.vbox(0xb0b4b8, tx0, y, tz1 + 1.2, tx1, y + 0.08, tz1 + 2.4, true, { metal: true }); for (let x = tx0; x <= tx1; x += 4) ctx.vbox(0x8a8f96, x, y, tz1 + 2.3, x + 0.08, y + 2.5, tz1 + 2.38, false, { metal: true }); }
  // stunt dirt ramp + landing (mission 1 jump)
  ctx.S.addRamp(113, -141, 129, -125, 'x', CURB, 4.0, { mat: 'dirt', tag: 'stunt' });
  B.quad('dirt', [[113, CURB + 0.02, -125], [129, 4.02, -125], [129, 4.02, -141], [113, CURB + 0.02, -141]], [0, 0, 3, 0, 3, 3, 0, 3]);
  B.quad('dirt', [[129, 4.02, -125], [129, CURB, -125], [129, CURB, -141], [129, 4.02, -141]], [0, 0, 1, 0, 1, 1, 0, 1], [1, 0, 0]);
  for (const zz of [-141, -125]) { const s2 = zz === -141 ? -1 : 1; B.quad('dirt', s2 < 0 ? [[129, CURB, zz], [113, CURB, zz], [113, CURB + 0.02, zz], [129, 4.02, zz]] : [[113, CURB, zz], [129, CURB, zz], [129, 4.02, zz], [113, CURB + 0.02, zz]], [0, 0, 1, 0, 1, 1, 0, 1], [0, 0, s2]); }
  for (let i = 0; i < 6; i++) { ctx.prop('cone', 104 + (i % 2) * 2, -150 + i * 3, 0); ctx.prop('cone', 104 + (i % 2) * 2, -116 - i * 3, 0); }
  // pipes / pit between ramp and landing
  for (let i = 0; i < 4; i++) { const g = new THREE.CylinderGeometry(0.7, 0.7, 14, 14); g.rotateX(Math.PI / 2); B.geom('vc', g, new THREE.Matrix4().makeTranslation(146 + i * 1.6, CURB + 0.7, -133), { color: hex3(0x6d7378) }); }
  ctx.S.addBox(144.5, CURB, -140, 151.5, CURB + 1.4, -126, { mat: 'metal' });
  ctx.prop('barrel', 156, -128, 0); ctx.prop('barrel', 157, -137, 0); ctx.prop('barrel', 160, -131, 0);
  // material piles, porta-potties, site office container
  ctx.vbox(0xcfc1a0, 118, CURB, -186, 134, CURB + 2.5, -176, true); ctx.vbox(0x5b6b80, 120, CURB, -122, 132, CURB + 2.6, -114, true);
  ctx.sign(SIGN('HARDWARE'), 126, CURB + 3.4, -113.9, 6, 0.9, 'pz');
  // tower crane (visual) near tower
  const cx = 140, cz = -165;
  for (let y = 0; y < 70; y += 3) { ctx.vbox(0xe0a91c, cx - 1.2, y, cz - 1.2, cx - 1, y + 3, cz - 1, false); ctx.vbox(0xe0a91c, cx + 1, y, cz - 1.2, cx + 1.2, y + 3, cz - 1); ctx.vbox(0xe0a91c, cx - 1.2, y, cz + 1, cx - 1, y + 3, cz + 1.2); ctx.vbox(0xe0a91c, cx + 1, y, cz + 1, cx + 1.2, y + 3, cz + 1.2); ctx.vbox(0xe0a91c, cx - 1.2, y, cz - 1.2, cx + 1.2, y + 0.15, cz + 1.2); }
  S.addBox(cx - 1.2, 0, cz - 1.2, cx + 1.2, 70, cz + 1.2, { mat: 'metal', climb: true });
  ctx.vbox(0xe0a91c, cx - 18, 70, cz - 0.8, cx + 48, 72, cz + 0.8); ctx.vbox(0x666666, cx - 18, 66, cz - 2, cx - 10, 70, cz + 2); ctx.vbox(0xdddddd, cx - 1.5, 67, cz - 1.5, cx + 1.5, 70, cz + 1.5);
  const hook = new THREE.Group(); hook.position.set(cx + 30, 40, cz);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 30, 4), new THREE.MeshStandardMaterial({ color: 0x222222 })); cable.position.y = 15; hook.add(cable);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xc0562a, metalness: 0.5, roughness: 0.5 })); beam.position.y = -0.5; beam.castShadow = true; hook.add(beam);
  ctx.root.add(hook);
  ctx.landmarks.construction = { gateW: { x: 112, z: -133 }, gateE: { x: 188, z: -133 }, ramp: { x: 113, z: -133 }, tower: { x0: tx0, z0: tz0, x1: tx1, z1: tz1, floors, fh }, crane: { x: cx, z: cz, hook, beam } };
  ctx.wander.push({ x0: 118, z0: -186, x1: 148, z1: -146, density: 0.4, workers: true });
}

// ---------------- Parking garage (4 levels + roof) ----------------
function garage(ctx) {
  const g = L.garage; const { S, B } = ctx; const x0 = g.x0 + 2, x1 = g.x1 - 2, z0 = g.z0 + 2, z1 = g.z1 - 2, H = g.levelH;
  const rx0 = x1 - 12, rx1 = x1; // ramp column (east side)
  const rzA = z0 + 12, rzB = z1 - 12;  // ramp spans rzA..rzB ; landings outside
  ctx.groundQuad('lot', x0, z0, x1, z1, CURB + 0.01, 8);
  for (let lvl = 1; lvl <= g.levels; lvl++) {
    const y = CURB + lvl * H;
    // slab excluding ramp column between landings
    ctx.solid('concrete', x0, y - 0.4, z0, rx0, y, z1, { tw: 6, top: 'lot', topTw: 8 });
    const landNorth = lvl % 2 === 1; // ramps alternate; landing at far end
    if (landNorth) ctx.solid('concrete', rx0, y - 0.4, rzB, rx1, y, z1, { tw: 6, top: 'lot' }); else ctx.solid('concrete', rx0, y - 0.4, z0, rx1, y, rzA, { tw: 6, top: 'lot' });
    // perimeter parapets (open sides)
    const par = (a, b, c, axis) => axis === 'x' ? ctx.solid('concrete', a, y, c - 0.2, b, y + 1.0, c + 0.2, { tw: 4 }) : ctx.solid('concrete', c - 0.2, y, a, c + 0.2, y + 1.0, b, { tw: 4 });
    par(x0, x1, z0, 'x'); par(x0, x1, z1, 'x'); par(z0, z1, x0, 'z');
    if (lvl === g.levels) { par(z0, z0 + 3, x1, 'z'); par(z0 + 9, z1, x1, 'z'); } else par(z0, z1, x1, 'z');
    // lighting strips + painted stripes
    for (let x = x0 + 4; x < rx0 - 2; x += 10) ctx.glowBox(0xf2f6ff, x, y + H - 0.55, (z0 + z1) / 2 - 0.2, x + 4, y + H - 0.5, (z0 + z1) / 2 + 0.2);
    if (lvl < g.levels) for (let x = x0 + 3; x < rx0 - 3; x += 3) { ctx.parking.push(...((Math.random() < 0.35) ? [{ x, z: z0 + 4, yaw: 0, y }] : [])); ctx.parking.push(...((Math.random() < 0.3) ? [{ x, z: z1 - 4, yaw: Math.PI, y }] : [])); }
  }
  for (let x = x0 + 4; x < rx0 - 2; x += 10) ctx.glowBox(0xf2f6ff, x, CURB + H - 0.55, (z0 + z1) / 2 - 0.2, x + 4, CURB + H - 0.5, (z0 + z1) / 2 + 0.2);
  // ramps
  for (let lvl = 0; lvl < g.levels; lvl++) {
    const ya = CURB + lvl * H, yb = ya + H; const up = lvl % 2 === 0; // even: +z direction
    S.addRamp(rx0, rzA, rx1, rzB, 'z', up ? ya : yb, up ? yb : ya, { tag: 'garageRamp', mat: 'concrete' });
    const a = up ? ya : yb, b2 = up ? yb : ya;
    B.quad('lot', [[rx0, a + 0.02, rzA], [rx1, a + 0.02, rzA], [rx1, b2 + 0.02, rzB], [rx0, b2 + 0.02, rzB]].reverse(), [0, 0, 1, 0, 1, 4, 0, 4]);
    B.quad('concrete', [[rx0, a - 0.4, rzA], [rx1, a - 0.4, rzA], [rx1, b2 - 0.4, rzB], [rx0, b2 - 0.4, rzB]], [0, 0, 1, 0, 1, 4, 0, 4], [0, -1, 0]);
  }
  // divider wall between ramp column and floors (with openings at landings)
  for (let lvl = 0; lvl < g.levels; lvl++) { const y = CURB + lvl * H; ctx.solid('concrete', rx0 - 0.3, y + (lvl ? 0 : 0), rzA + 2, rx0, y + 1.0, rzB - 2, { tw: 4 }); }
  // columns
  for (let x = x0 + 8; x < rx0 - 2; x += 14) for (const z of [z0 + 9, z1 - 9]) ctx.solid('concrete', x - 0.5, CURB, z - 0.5, x + 0.5, CURB + g.levels * H, z + 0.5, { tw: 2 });
  // exterior signage + entrance barrier
  ctx.sign(SIGN('MOTEL 9') * 0 + SIGN('SPIN CYCLE') * 0 + 0, (x0 + x1) / 2, CURB + 3.2, z0 - 0.3, 10, 1.6, 'nz');
  ctx.prop('barrier', (x0 + rx0) / 2 + 10, z0 - 1, 0);
  ctx.landmarks.garage = { x0, z0, x1, z1, roofY: CURB + g.levels * H, entrance: { x: (x0 + rx0) / 2 + 10, z: z0 - 2 }, rampCol: { x0: rx0, x1: rx1 }, roofSpot: { x: x0 + 20, z: z0 + 8, y: CURB + g.levels * H } };
}

// ---------------- Rooftop run (fire escape, alley gaps, skybridge to garage roof) ----------------
function rooftops(ctx) {
  const r = L.rooftops; const { S, B } = ctx; const zA = r.z0 + 2, zB = r.z0 + 20;
  const R = [{ x0: -30, x1: -14, h: 8.15, st: 'brick', v: 1 }, { x0: -46, x1: -33, h: 10.15, st: 'plaster', v: 2 }, { x0: -62, x1: -49.5, h: 10.15, st: 'brick', v: 3 }, { x0: -88, x1: -66, h: CURB + 16, st: 'office', v: 1 }];
  for (const b of R) ctx.building(b.x0, zA, b.x1, zB, b.h, b.st, b.v, { parapet: false, clutter: false, climb: true });
  ctx.shopfront(-29, -15, zA, 'nz', ctx.rng, { sign: SIGN('BOMBSHELL SALON') }); ctx.shopfront(-45, -34, zA, 'nz', ctx.rng, { sign: SIGN('TACO TORNADO') }); ctx.shopfront(-61, -50.5, zA, 'nz', ctx.rng, { sign: SIGN('VINYL VAULT') });
  // fire escape on east face of R1 (x = -14): two flights + top landing
  const fx0 = -14, fx1 = -12.4;
  S.addRamp(fx0, zA + 2, fx1, zB - 2, 'z', CURB, 4.2, { tag: 'stairs', mat: 'metal' });
  S.addRamp(fx0, zA + 2, fx1, zB - 2, 'z', 8.15, 4.2, { tag: 'stairs', mat: 'metal' });
  S.addBox(fx0, 4.0, zB - 2, fx1, 4.2, zB, { mat: 'metal' }); S.addBox(fx0, 8.0, zA, fx1, 8.15, zA + 2, { mat: 'metal' });
  const metal = 0x3b3f44;
  for (const [ya, yb] of [[CURB, 4.2], [8.15, 4.2]]) { const geo = new THREE.BoxGeometry(1.6, 0.12, zB - zA - 4); const ang = Math.atan2(yb - ya, zB - zA - 4); const m = new THREE.Matrix4().makeTranslation((fx0 + fx1) / 2, (ya + yb) / 2, (zA + zB) / 2).multiply(new THREE.Matrix4().makeRotationX(-ang)); B.geom('vc', geo, m, { color: hex3(metal) }); }
  ctx.vbox(metal, fx0, 4.0, zB - 2, fx1, 4.2, zB); ctx.vbox(metal, fx0, 8.0, zA, fx1, 8.15, zA + 2);
  for (let z = zA; z <= zB; z += 2) { ctx.vbox(metal, fx1 - 0.06, CURB, z, fx1, 9.2, z + 0.06); }
  ctx.vbox(metal, fx1 - 0.06, 5.1, zA, fx1, 5.16, zB); ctx.vbox(metal, fx1 - 0.06, 9.1, zA, fx1, 9.16, zB);
  // dumpster at alley mouth and crates to help the climbs
  ctx.prop('dumpster', -12, zB + 3, 0);
  ctx.vbox(0x8a6440, -49.5 - 2.2, 10.15, zA + 6, -49.5 - 0.2, 11.9, zA + 9, true); // crate on R3 roof near R4 wall
  ctx.vbox(0x8a6440, -64, 10.15, zA + 5, -62.2, 12.0, zA + 7.4, true); ctx.vbox(0x7a5636, -64.6, 12.0, zA + 5.4, -63.0, 13.75, zA + 7.0, true);
  // rooftop clutter
  ctx.vbox(0xb8bcc0, -26, 8.15, zA + 3, -22, 9.4, zA + 6, true, { metal: true }); ctx.vbox(0xb8bcc0, -42, 10.15, zA + 10, -38, 11.3, zA + 13, true, { metal: true });
  ctx.vbox(0xb8bcc0, -84, 16.15, zA + 3, -80, 17.6, zA + 7, true, { metal: true }); ctx.vbox(0x9aa0a6, -76, 16.15, zA + 10, -72, 19, zA + 14, true, { metal: true });
  // skybridge from R4 (x=-88) to garage roof (x=-114) at z 117..121, deck top = CURB+16
  const y = CURB + 16, sz0 = r.z0 + 5, sz1 = r.z0 + 9; const bx0 = -114.5, bx1 = -88;
  ctx.solid('concrete', bx0, y - 0.5, sz0, bx1, y, sz1, { tw: 4, top: 'walk' });
  ctx.vbox(0xdddddd, bx0, y + 3, sz0, bx1, y + 3.3, sz1, true);
  for (let x = bx0; x < bx1; x += 3.25) { ctx.vbox(0xdddddd, x, y, sz0, x + 0.15, y + 3, sz0 + 0.15); ctx.vbox(0xdddddd, x, y, sz1 - 0.15, x + 0.15, y + 3, sz1); ctx.glass.push({ face: 'pz', along: true, a0: x + 0.15, a1: x + 3.25, c: sz1 - 0.08, y0: y + 0.1, y1: y + 2.95, sky: true }); ctx.glass.push({ face: 'nz', along: true, a0: x + 0.15, a1: x + 3.25, c: sz0 + 0.08, y0: y + 0.1, y1: y + 2.95, sky: true }); }
  ctx.glowBox(0xfff4e0, bx0, y + 2.95, (sz0 + sz1) / 2 - 0.2, bx1, y + 3.0, (sz0 + sz1) / 2 + 0.2);
  // remaining block: normal buildings north part
  const zN0 = r.z0 + 30;
  ctx.building(-88, zN0, -60, r.z1, 18, 'brick', 0); ctx.building(-58, zN0, -36, r.z1, 22, 'plaster', 1); ctx.building(-34, zN0, -12, r.z1, 14, 'office', 2);
  ctx.shopfront(-86, -62, r.z1, 'pz', ctx.rng); ctx.shopfront(-56, -38, r.z1, 'pz', ctx.rng); ctx.shopfront(-32, -14, r.z1, 'pz', ctx.rng);
  ctx.groundQuad('lot', -88, zB, -12, zN0, CURB + 0.01, 8);
  ctx.landmarks.rooftops = { alley: { x: -10, z: zB + 4 }, fireEscape: { x: -13.2, z: zA + 3 }, roofs: R.map((b) => ({ x: (b.x0 + b.x1) / 2, z: (zA + zB) / 2, y: b.h })), skybridge: { x0: bx0, x1: bx1, z: (sz0 + sz1) / 2, y }, zA, zB };
  ctx.wander.push({ x0: -88, z0: zB, x1: -12, z1: zN0, density: 0.3 });
}

// ---------------- Galleria Mall (drive-through promenade) ----------------
function mall(ctx) {
  const m = L.mall; const { S, B } = ctx; const cx0 = -160, cx1 = -140, H = 14, ceil = 9;
  ctx.building(m.x0, m.z0, cx0, m.z1, H, 'deco', 2, { clutter: true }); ctx.building(cx1, m.z0, m.x1, m.z1, H, 'deco', 2, { clutter: true });
  ctx.solid('glassDark', cx0, ceil, m.z0, cx1, ceil + 0.4, m.z1, { tw: 4 });
  ctx.vbox(0xdedad0, cx0, ceil + 0.4, m.z0, cx1, H, m.z0 + 2, true); ctx.vbox(0xdedad0, cx0, ceil + 0.4, m.z1 - 2, cx1, H, m.z1, true);
  B.box('plaza', cx0, CURB, m.z0, cx1, CURB + 0.02, m.z1, { faces: 'py', topScale: 4 });
  for (let z = m.z0 + 4; z < m.z1 - 4; z += 12) {
    ctx.shopfront(z, z + 11, cx0, 'px', ctx.rng); ctx.shopfront(z, z + 11, cx1, 'nx', ctx.rng);
    ctx.glowBox(0xfff4dc, cx0 + 2, ceil - 0.05, z + 2, cx1 - 2, ceil, z + 3);
  }
  for (let z = m.z0 + 20; z < m.z1 - 20; z += 36) { ctx.prop('planter', (cx0 + cx1) / 2, z, 0); ctx.prop('kiosk', (cx0 + cx1) / 2, z + 16, 0); }
  // escalators to a mezzanine on the walls (visual)
  for (const z of [m.z0 + 60, m.z1 - 70]) { const geo = new THREE.BoxGeometry(2.4, 0.3, 14); const mtx = new THREE.Matrix4().makeTranslation(cx0 + 1.6, CURB + 2.6, z).multiply(new THREE.Matrix4().makeRotationX(-0.38)); B.geom('vcMetal', geo, mtx, { color: hex3(0xb8bcc0) }); S.addBox(cx0, CURB, z - 7, cx0 + 2.8, CURB + 5.5, z + 7, { mat: 'metal' }); }
  // entrance glass doors
  for (const z of [m.z0, m.z1]) for (let x = cx0; x < cx1; x += 4) ctx.glass.push({ face: z === m.z0 ? 'nz' : 'pz', along: true, a0: x + 0.1, a1: x + 3.9, c: z, y0: CURB, y1: CURB + 4.2, door: true });
  ctx.sign(SIGN('LUXE JEWELS'), -150, 11, m.z0 - 0.3, 14, 2.4, 'nz'); ctx.sign(SIGN('LUXE JEWELS'), -150, 11, m.z1 + 0.3, 14, 2.4, 'pz');
  ctx.interiorLights.push({ x: -150, y: 7, z: 360, color: 0xfff0d8, intensity: 40, distance: 50 }, { x: -150, y: 7, z: 440, color: 0xfff0d8, intensity: 40, distance: 50 });
  ctx.landmarks.mall = { x0: cx0, x1: cx1, z0: m.z0, z1: m.z1 };
  ctx.wander.push({ x0: cx0 + 1, z0: m.z0 + 2, x1: cx1 - 1, z1: m.z1 - 2, density: 2.5, indoor: true }); ctx.pedAreas.push({ x0: cx0, z0: m.z0, x1: cx1, z1: m.z1 });
  ctx.wander.push({ x0: m.x0 - 6, z0: m.z0 - 6, x1: m.x1 + 6, z1: m.z0, density: 1.5 });
}

// ---------------- Dez's garage (hideout) ----------------
function hideout(ctx) {
  const h = L.hideout; const { S, B } = ctx; const x0 = 520, x1 = 580, z0 = 120, z1 = 176, H = 10;
  ctx.groundQuad('lot', h.x0, h.z0, h.x1, h.z1, CURB + 0.01, 8);
  wallWithDoor(ctx, 'fac_warehouse_2', 'x', z0, x0, x1, CURB, H, 0.8, [{ a0: 542, a1: 558, h: 6 }], { tw: 16, th: 10 });
  wallWithDoor(ctx, 'fac_warehouse_2', 'x', z1, x0, x1, CURB, H, 0.8, [], { tw: 16, th: 10 });
  wallWithDoor(ctx, 'fac_warehouse_2', 'z', x0, z0, z1, CURB, H, 0.8, [], { tw: 16, th: 10 });
  wallWithDoor(ctx, 'fac_warehouse_2', 'z', x1, z0, z1, CURB, H, 0.8, [], { tw: 16, th: 10 });
  ctx.solid('roof', x0 - 0.5, H, z0 - 0.5, x1 + 0.5, H + 0.4, z1 + 0.5, { tw: 8, top: 'roof' });
  B.box('lot', x0, CURB, z0, x1, CURB + 0.02, z1, { faces: 'py', topScale: 6 });
  for (let x = x0 + 8; x < x1; x += 14) ctx.glowBox(0xfff0d8, x - 2, H - 0.1, (z0 + z1) / 2 - 0.3, x + 2, H - 0.05, (z0 + z1) / 2 + 0.3);
  ctx.interiorLights.push({ x: 550, y: H - 1.5, z: 148, color: 0xffe0b0, intensity: 50, distance: 40 });
  // workbenches, tool walls, car lift, sofa
  ctx.vbox(0x7a2e1f, x0 + 1, CURB, z1 - 3, x0 + 14, CURB + 1, z1 - 1, true); ctx.vbox(0x30363c, x0 + 1, CURB + 1, z1 - 1.2, x0 + 14, CURB + 3.5, z1 - 0.9);
  ctx.vbox(0xc0392b, x1 - 12, CURB, z1 - 3, x1 - 1, CURB + 1.2, z1 - 1, true);
  ctx.vbox(0x2d4a7a, x1 - 10, CURB, z0 + 8, x1 - 2, CURB + 0.9, z0 + 11, true); ctx.vbox(0x2d4a7a, x1 - 10, CURB, z0 + 10, x1 - 2, CURB + 1.8, z0 + 11, true);
  for (const lx of [x0 + 20, x0 + 25]) ctx.vbox(0xd4ac0d, lx, CURB, z1 - 18, lx + 0.4, CURB + 3.5, z1 - 17.6, true);
  ctx.sign(SIGN('THE GREASE PIT'), 550, CURB + 7.8, z0 - 0.5, 12, 2, 'nz');
  // roll-up door (dynamic)
  const door = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.25), new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.6, roughness: 0.4 }));
  door.position.set(550, CURB + 3, z0); ctx.root.add(door); const doorBox = S.addBox(542, CURB, z0 - 0.2, 558, CURB + 6, z0 + 0.2, { mat: 'metal', tag: 'hideoutDoor' });
  ctx.landmarks.hideout = { door, doorBox, inside: { x: 550, z: 150 }, front: { x: 550, z: 104 }, x0, z0, x1, z1 };
}

// ---------------- Police HQ ----------------
function police(ctx) {
  const p = L.police; ctx.groundQuad('lot', p.x0, p.z0, p.x1, p.z1, CURB + 0.01, 8);
  ctx.building(p.x0 + 2, p.z0 + 2, p.x1 - 2, p.z0 + 34, 20, 'office', 3, {});
  ctx.shopfront(p.x0 + 20, p.x1 - 20, p.z0 + 34, 'pz', ctx.rng, { sign: SIGN('POLICE') });
  ctx.vbox(0x1b2a6b, p.x0 + 2, 20, p.z0 + 2, p.x1 - 2, 21, p.z0 + 34, true);
  for (let x = p.x0 + 4; x < p.x1 - 4; x += 3.4) ctx.parking.push({ x, z: p.z1 - 6, yaw: Math.PI, police: true });
  ctx.landmarks.police = { x: (p.x0 + p.x1) / 2, z: p.z1 - 6, exit: { x: (p.x0 + p.x1) / 2, z: p.z1 + 4 } };
}

// ---------------- Train station ----------------
function station(ctx) {
  const s = L.station; const z = RAIL_Z;
  for (const [pz0, pz1] of [[z - 12, z - 7], [z + 7, z + 12]]) {
    ctx.solid('concrete', s.x0, 0, pz0, s.x1, 1.1, pz1, { tw: 4, top: 'walk' });
    ctx.glowBox(0xf1c40f, s.x0, 1.1, pz0 === z - 12 ? pz1 - 0.4 : pz0, s.x1, 1.12, pz0 === z - 12 ? pz1 : pz0 + 0.4);
    for (let x = s.x0 + 6; x < s.x1; x += 14) { ctx.vbox(0x6d7378, x, 1.1, (pz0 + pz1) / 2 - 0.15, x + 0.3, 5, (pz0 + pz1) / 2 + 0.15, true, { metal: true }); ctx.prop('bench', x + 5, (pz0 + pz1) / 2, pz0 === z - 12 ? 0 : Math.PI, 1.1); }
    ctx.vbox(0xc9ccd0, s.x0, 5, pz0 - 0.5, s.x1, 5.3, pz1 + 0.5, true, { metal: true });
    ctx.wander.push({ x0: s.x0 + 2, z0: pz0 + 0.5, x1: s.x1 - 2, z1: pz1 - 0.5, density: 1.4, y: 1.1 });
  }
  ctx.landmarks.station = { x0: s.x0, x1: s.x1, z, platformY: 1.1 };
}

function park(ctx) {
  const p = L.park; ctx.groundQuad('grass', p.x0, p.z0, p.x1, p.z1, CURB + 0.01, 10);
  const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
  ctx.groundQuad('plaza', cx - 14, cz - 14, cx + 14, cz + 14, CURB + 0.02, 5);
  ctx.solid('concrete', cx - 7, CURB, cz - 7, cx + 7, CURB + 0.8, cz + 7, { tw: 4 }); ctx.glowBox(0x9fe7ff, cx - 6.5, CURB + 0.75, cz - 6.5, cx + 6.5, CURB + 0.78, cz + 6.5);
  ctx.vbox(0xe8e2d0, cx - 1, CURB, cz - 1, cx + 1, CURB + 4.5, cz + 1, true);
  for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; const r2 = 26 + (i % 3) * 4; ctx.tree(cx + Math.cos(a) * r2, cz + Math.sin(a) * r2, i % 4 ? 'round' : 'pine', 1 + (i % 5) * 0.12); }
  ctx.landmarks.park = { x: cx, z: cz };
  ctx.wander.push({ x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1, density: 1.6 }); ctx.pedAreas.push({ x0: p.x0, z0: p.z0, x1: p.x1, z1: p.z1 });
}

function pier(ctx) {
  const p = L.pier; const { S, B } = ctx; const x0 = p.x - 7, x1 = p.x + 7;
  S.addBox(x0, -0.5, 630, x1, 0.5, p.z1, { mat: 'wood', solid: false }); B.box('wood', x0, -0.5, 630, x1, 0.5, p.z1, { tw: 3, faces: 'py px nx pz' });
  for (let z = 640; z < p.z1; z += 8) for (const x of [x0 + 0.5, x1 - 0.5]) ctx.vbox(0x5a4128, x - 0.3, -5, z - 0.3, x + 0.3, 0.4, z + 0.3);
  for (let z = 632; z < p.z1; z += 4) { ctx.prop('rail', x0 + 0.2, z, Math.PI / 2, 0.5); ctx.prop('rail', x1 - 0.2, z, Math.PI / 2, 0.5); }
  for (let z = 650; z < p.z1 - 40; z += 30) ctx.prop('lamp', p.x, z, 0, 0.5);
  ctx.vbox(0xe74c3c, x0 + 1, 0.5, 860, x0 + 5, 3.5, 868, true); ctx.sign(SIGN('CRAB SHACK'), x0 + 3, 4.2, 868.2, 4, 0.8, 'pz');
  // Ferris wheel (dynamic, spins)
  const wheel = new THREE.Group(); wheel.position.set(p.x, 24, p.z1 - 15);
  const wm = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.6, roughness: 0.4 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 0.35, 8, 64), wm); ring.rotation.y = Math.PI / 2; wheel.add(ring);
  const ring2 = ring.clone(); ring2.position.x = 2; wheel.add(ring2);
  const lights = new THREE.Mesh(new THREE.TorusGeometry(20.4, 0.15, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff7be0, toneMapped: false })); lights.rotation.y = Math.PI / 2; wheel.add(lights);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 40, 0.2), wm); sp.rotation.x = a; sp.position.x = 1; wheel.add(sp); const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71][i % 4] })); cab.position.set(1, Math.cos(a) * 20, Math.sin(a) * 20); cab.userData.cab = true; wheel.add(cab); }
  wheel.userData.spin = 0.06; ctx.root.add(wheel);
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.6, 26, 0.6); const m = new THREE.Matrix4().makeTranslation(p.x + s * 3, 12, p.z1 - 15).multiply(new THREE.Matrix4().makeRotationZ(s * 0.12)); B.geom('vcMetal', g, m, { color: hex3(0xdddddd) }); }
  ctx.landmarks.pier = { x: p.x, z0: 630, z1: p.z1, wheel };
  ctx.wander.push({ x0: x0 + 1, z0: 640, x1: x1 - 1, z1: p.z1 - 30, density: 1.5, y: 0.5 });
}
