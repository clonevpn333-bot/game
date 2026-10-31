// @ts-nocheck
// HAUNTED SHIFT · the whole film as one clay world. render(T) poses everyone and the camera for global time T.
import { THREE, makeRenderer, makeCamera, aim, V3, clamp, lerp, seg, eio, eo, ei, back, rng } from "./base.js";
import { makeChar, SKIN, clay, glossy, glow, mesh, ball, limb, boxG, cylG, textTex } from "./clay.js";
import { tick, pumpkin, tree, manor, nightGround, skyDome, corridor, mirror, street, car, fire, armyTruck, searchBeam, rain, phone, fogCard, halo } from "./sets.js";
import LIPS from "./lips.json";

const FPS = 30;
const lip = (who, T) => { const a = LIPS[who]; if (!a) return 0; const f = T * FPS, i = Math.floor(f), k = f - i; return lerp(a[i] || 0, a[i + 1] || 0, k); };
const blinkAt = (T, seed = 0) => { const p = (T + seed * 1.37) % 3.1; return p < 0.12 ? Math.sin((p / 0.12) * Math.PI) : 0; };
const wob = (T, a = 1, f = 1, s = 0) => a * (Math.sin(T * f * 1.3 + s) * 0.6 + Math.sin(T * f * 2.9 + s * 2) * 0.4);

export function makeFilm(canvas) {
  const { renderer, env } = makeRenderer(canvas, { exposure: 1.0, shadows: true });
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x0a0814, 1);
  const scene = new THREE.Scene();
  scene.environment = env; scene.environmentIntensity = 0.35;
  const hemi = new THREE.HemisphereLight(0x9a8ad8, 0x2a1a30, 0.55); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xbcd0ff, 2.0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 60 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xff9a50, 0.8); scene.add(fill, fill.target);
  const rimL = new THREE.DirectionalLight(0xb080ff, 1.4); scene.add(rimL, rimL.target);
  const cam = makeCamera(32);

  // ---------------------------------------------------------------- sets
  const SET = {};
  const addSet = (name, g, x) => { g.position.x = x; scene.add(g); SET[name] = g; return g; };
  const corr = addSet("corr", corridor(14), 0);
  const ext = addSet("ext", new THREE.Group(), 100);
  ext.add(nightGround(60, 60, 0x2c3a2a)); const mn = manor(); mn.position.z = -2; ext.add(mn);
  [[-6, -4, 3.4, 1], [6.5, -5, 3.0, 2], [-9, 3, 2.6, 3], [9, 2, 2.8, 4]].forEach(([x, z, h, s]) => { const t = tree(h, s); t.position.set(x, 0, z); ext.add(t); });
  const path = mesh(boxG(1.6, 0.04, 9, 0.02), clay(0x5a5060), 0, 0.01, 3.5); ext.add(path);
  const str = addSet("street", new THREE.Group(), 200); str.add(street());
  const wreck = car(0xc83a2a, true); wreck.position.set(-1.6, 0, -9); str.add(wreck);
  const f1 = fire(1.3, 3); f1.position.set(-1.2, 1.1, -7.6); str.add(f1);
  const f2 = fire(1.0, 5); f2.position.set(3.2, 0, -18); str.add(f2);
  const car2 = car(0x3a6ac8, true); car2.position.set(2.4, 0, -20); car2.rotation.y = -0.9; str.add(car2);
  const trucks = [armyTruck(), armyTruck()]; trucks[0].position.set(-1.8, 0, -40); trucks[0].rotation.y = 0.15; trucks[1].position.set(2.2, 0, -43); trucks[1].rotation.y = -0.2; trucks.forEach((t) => str.add(t));
  const beams = [searchBeam(34), searchBeam(34)]; beams.forEach((b, i) => { b.position.set(i ? 2.4 : -1.6, 3.2, i ? -43 : -40); str.add(b); });
  const fogS = fogCard(30, 4, 0x9a90c8, 0.45); fogS.position.set(0, 1.2, -14); str.add(fogS);
  const fogS2 = fogCard(30, 3, 0x9a90c8, 0.35); fogS2.position.set(0, 0.8, -26); str.add(fogS2);
  const rainL = rain(1800, [16, 12, 26], 0, -4); str.add(rainL);
  const mir = addSet("mirror", new THREE.Group(), 300); mir.add(mirror());
  mir.add(mesh(boxG(6, 0.2, 6, 0.05), clay(0x3a2a24), 0, -0.1, 0)); mir.add(mesh(boxG(6, 4, 0.2, 0.05), clay(0x5a3a4a), 0, 2, -0.75));
  const brk = addSet("brk", new THREE.Group(), 400);
  brk.add(mesh(boxG(8, 0.2, 6, 0.05), clay(0x4a3020), 0, -0.1, 0)); brk.add(mesh(boxG(8, 4, 0.2, 0.05), clay(0x6a5a40), 0, 2, -1));
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: textTex([{ t: "STAFF BREAK", size: 110, c: "#1a1a1a", y: 90 }, { t: "15 MIN EVERY HOUR", size: 56, c: "#b01818", y: 180 }], { w: 512, h: 256, bg: "#f2e8d0" }), toneMapped: true }));
  bs.position.set(-1.0, 2.0, -0.88); brk.add(bs);
  const clock = new THREE.Group(); clock.position.set(1.0, 2.4, -0.85); brk.add(clock);
  clock.add(mesh(cylG(0.45, 0.45, 0.08, 40), clay(0xf6f0e0), 0, 0, 0)).children; clock.children[0].rotation.x = Math.PI / 2;
  clock.add(mesh(new THREE.TorusGeometry(0.46, 0.05, 10, 40), clay(0x2a2a30), 0, 0, 0.02));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; clock.add(ball(clay(0x2a2a30), Math.sin(a) * 0.36, Math.cos(a) * 0.36, 0.05, 0.025)); }
  const hH = new THREE.Group(), hM = new THREE.Group(); hH.position.z = 0.06; hM.position.z = 0.07; clock.add(hH, hM);
  hH.add(limb(clay(0x1a1a1a), [0, 0, 0], [0, 0.2, 0], 0.025)); hM.add(limb(clay(0x1a1a1a), [0, 0, 0], [0, 0.32, 0], 0.018));
  const donut = new THREE.Group(); donut.position.set(-2.3, 0, 0.2); brk.add(donut);
  donut.add(mesh(cylG(0.5, 0.45, 0.06, 30), clay(0x7a5030), 0, 0.85, 0)); donut.add(limb(clay(0x5a3a20), [0, 0, 0], [0, 0.82, 0], 0.05));
  const dn = mesh(new THREE.TorusGeometry(0.1, 0.05, 14, 30), clay(0xe890b8), 0, 0.93, 0); dn.rotation.x = Math.PI / 2; donut.add(dn);
  const sky = skyDome(0x120a2a, 0x3a2050); scene.add(sky);

  // ---------------------------------------------------------------- cast
  const ch = (o) => { const c = makeChar(o); scene.add(c.root); return c; };
  const you = ch({ seed: 1, makeup: true, outfit: "staff", shirt: 0x1d1d24, pants: 0x30343c, hair: "messy", hairColor: 0x2a1a14 });
  const bro = ch({ seed: 2, outfit: "jacket", shirt: 0xb8242a, trim: 0xf2ead8, pants: 0x34507a, hair: "cap", capC: 0x1f5fb8, skin: SKIN.tan, girth: 1.12, h: 1.04 });
  const girl = ch({ seed: 3, outfit: "hoodie", shirt: 0x8a4fd6, pants: 0x2a2f45, hair: "pony", hairColor: 0xc8762a, skin: SKIN.pale, girth: 0.9, h: 0.95, eyeR: 0.062 });
  const kid = ch({ seed: 4, outfit: "pumpkin", pants: 0x2a2a2a, hair: "stem", skin: SKIN.brown, h: 0.62, eyeR: 0.066 });
  const granny = ch({ seed: 7, outfit: "cardigan", shirt: 0x6a9a8a, trim: 0xe8dcc0, pants: 0x5a4a6a, hair: "bun", hairColor: 0xd8d8e0, glasses: true, h: 0.9, girth: 1.05 });
  const g1 = ch({ seed: 11, outfit: "tee", print: "BOO!", printC: "#ffffff", shirt: 0xe07a1a, pants: 0x2a2a3a, hair: "spiky", hairColor: 0xe8c040, skin: SKIN.pink, h: 0.98 });
  const g2 = ch({ seed: 12, outfit: "dress", shirt: 0x1a1a22, hair: "long", hairColor: 0x1a1a1a, skin: SKIN.tan, h: 0.94 });
  const soldier = ch({ seed: 13, outfit: "soldier", shirt: 0x4c5a34, pants: 0x3c4a28, hair: "helmet", skin: SKIN.brown, girth: 1.1 });
  const ZV = [
    { outfit: "suit", shirt: 0x3a3e4a, pants: 0x2a2c34, hair: "messy", hairColor: 0x2a2a1a, girth: 1.05 },
    { outfit: "tee", shirt: 0x8a8a6a, pants: 0x4a4a6a, hair: "bald", skin: SKIN.zombie2, girth: 1.2 },
    { outfit: "dress", shirt: 0x6a3a5a, hair: "long", hairColor: 0x3a2a20, girth: 0.92, h: 0.96 },
    { outfit: "hoodie", shirt: 0x3a5a3a, pants: 0x2a2a2a, hair: "short", hairColor: 0x4a3a2a, skin: SKIN.zombie2 },
    { outfit: "jacket", shirt: 0x5a4a3a, trim: 0x8a7a6a, pants: 0x3a3a4a, hair: "spiky", hairColor: 0x5a5a3a, girth: 1.1 },
    { outfit: "cardigan", shirt: 0x7a6a8a, trim: 0xc8c0b0, pants: 0x4a3a3a, hair: "bun", hairColor: 0x8a8a8a, h: 0.9 },
  ];
  const Z = Array.from({ length: 14 }, (_, i) => ch({ seed: 100 + i, zombie: true, ...ZV[i % ZV.length] }));
  const ALL = [you, bro, girl, kid, granny, g1, g2, soldier, ...Z];
  const ph = { bro: phone(true), girl: phone(false) };
  bro.held.add(ph.bro); ph.bro.rotation.set(-0.2, 0, 0); girl.held.add(ph.girl);
  const bigP = phone(true); scene.add(bigP);
  const thumb = limb(clay(SKIN.tan), [0, 0, 0], [0.02, -0.06, 0.01], 0.014); scene.add(thumb);
  const brush = limb(clay(0x8a5a3a), [0, 0, 0], [0, -0.16, 0.05], 0.012); brush.add(ball(clay(SKIN.makeup), 0, -0.17, 0.055, 0.025)); you.held.add(brush);
  const torch = new THREE.Group(); torch.add(mesh(cylG(0.03, 0.025, 0.2), clay(0x2a2a2a), 0, -0.05, 0.02)); you.heldL.add(torch);
  const candy = new THREE.Group(); candy.add(pumpkin(0.45, 99, false)); kid.held.add(candy); candy.position.set(0, -0.22, 0.05);
  const sweat = [0, 1, 2].map((i) => { const s = ball(glossy(0x9ad0ff, { rough: 0.05, transparent: true, opacity: 0.85 }), 0, 0, 0, 0.018, 0.026, 0.015); you.head.add(s); return s; });
  const glowEyes = [];
  Z.forEach((z) => z.eyes.forEach((e) => { const h = halo(0xff2a10, 0.22, 0); e.look.add(h); h.position.z = 0.07; glowEyes.push(h); }));

  // ---------------------------------------------------------------- helpers
  const show = (...names) => { for (const k in SET) SET[k].visible = names.includes(k); sky.visible = names.includes("ext") || names.includes("street"); };
  const put = (c, set, x, z, ry = 0, p = {}, y = 0) => { c.root.visible = true; c.root.position.set(SET[set].position.x + x, y, z); c.root.rotation.set(0, ry, 0); c.pose({ T: TT, smile: 0.35, blink: blinkAt(TT, c.o.seed), ...p }); return c; };
  const at = (set, x, y, z) => V3(SET[set].position.x + x, y, z);
  const shot = (set, pos, look, fov = 32, roll = 0) => aim(cam, at(set, ...pos), at(set, ...look), fov, roll);
  const light = (set, o) => {
    const P = SET[set].position.x;
    hemi.color.set(o.sky ?? 0x9a8ad8); hemi.groundColor.set(o.gnd ?? 0x2a1a30); hemi.intensity = o.hemi ?? 0.55;
    key.color.set(o.key ?? 0xbcd0ff); key.intensity = o.ki ?? 2.0; key.position.set(P + (o.kp?.[0] ?? -4), o.kp?.[1] ?? 8, o.kp?.[2] ?? 6); key.target.position.set(P + (o.kt?.[0] ?? 0), 0, o.kt?.[1] ?? 0);
    fill.color.set(o.fill ?? 0xff9a50); fill.intensity = o.fi ?? 0.7; fill.position.set(P + 5, 2, 4); fill.target.position.set(P, 1, 0);
    rimL.intensity = o.ri ?? 1.4; rimL.position.set(P + 3, 4, -6); rimL.target.position.set(P, 1, 0);
    renderer.toneMappingExposure = o.exp ?? 1.0;
    scene.fog = o.fog ? new THREE.FogExp2(o.fog, o.fd ?? 0.04) : null;
  };
  const shake = (amt, T) => [wob(T, amt, 21), wob(T, amt, 17, 3), 0];
  const zwalk = (i, T, sp = 2.2) => ({ walk: T * sp + i * 1.7, zarms: 1, open: 0.35 + 0.25 * Math.sin(T * 2 + i), T: T + i, headTilt: 0.2 * Math.sin(i * 3), lids: 0.2 });
  let TT = 0;

  // ---------------------------------------------------------------- shots [a, b, fn(t, T)]
  const CORRL = { sky: 0x8a6ab0, gnd: 0x2a1424, hemi: 0.5, key: 0xffc890, ki: 1.2, kp: [2, 6, 5], fill: 0x8a50ff, fi: 0.5, ri: 1.6, fog: 0x1a0f22, fd: 0.07, exp: 1.15 };
  const EXTL = { sky: 0x6a6ad8, gnd: 0x1a2a20, hemi: 0.6, key: 0xa8c0ff, ki: 1.8, kp: [-6, 9, 8], fill: 0xff8a40, fi: 1.0, ri: 1.8, fog: 0x1a1430, fd: 0.025, exp: 1.1 };
  const STRL = { sky: 0x6a60c8, gnd: 0x2a1a20, hemi: 0.6, key: 0xa8c0ff, ki: 1.6, kp: [-5, 10, 4], fill: 0xff7a30, fi: 1.4, ri: 1.6, fog: 0x1a1230, fd: 0.03, exp: 1.1 };
  const S = [];
  const add = (a, b, f) => S.push({ a, b, f });

  // A · 0.0 CHOMP — frame 1: a zombie's teeth already sunk in a laughing guest's arm (extreme close, shaking)
  add(0, 1.1, (t, T) => {
    show("corr"); light("corr", { ...CORRL, ki: 1.6, fi: 1.2, fill: 0xff3020 });
    const chomp = Math.abs(Math.sin(t * 9));
    put(bro, "corr", -0.3, -1, 0.55, { armL: [1.4, -0.35, 0], elL: 0.2, armR: [2.3, 0.3, 0], elR: 1.3, open: 0.55 + lip("bro", T) * 0.4, smile: 1, lids: 0.35, brow: 0.7, headTilt: -0.2, headYaw: -0.5, lookX: 0.5, sq: chomp * 0.2 });
    put(Z[0], "corr", 0.55, -0.55, -1.75, { zarms: 0.55, open: 0.3 + chomp * 0.55, headPitch: 0.55 + chomp * 0.12, lids: 0.6, T, sq: chomp * 0.3 });
    const s = shake(0.02 + 0.05 * Math.exp(-t * 3), T);
    shot("corr", [0.25 + s[0], 1.5 + s[1], 1.25 - t * 0.25], [0.1, 1.32, -0.8], 36, -0.05);
  });
  // B · 1.1 "these actors are so real" — bro + girl laughing, filming
  add(1.1, 2.3, (t, T) => {
    show("corr"); light("corr", CORRL);
    const chomp = Math.abs(Math.sin(T * 9));
    put(bro, "corr", -0.3, -1, 0.35, { armL: [1.45, -0.25, 0], elL: 0.25, armR: [2.0, 0.25, 0], elR: 1.3, open: 0.15 + lip("bro", T) * 0.8, smile: 1, brow: 0.5, headYaw: 0.3, lookX: 0.4, sq: chomp * 0.15 });
    put(Z[0], "corr", 0.35, -0.42, -2.0, { zarms: 0.6, open: 0.2 + chomp * 0.5, headPitch: 0.5, lids: 0.6, T });
    put(girl, "corr", -1.0, -0.4, 0.5, { armR: [1.6, 0.3, 0], elR: 1.2, open: 0.5 + 0.3 * Math.abs(Math.sin(T * 7)), smile: 1, lids: 0.4, brow: 0.6, sq: Math.abs(Math.sin(T * 7)) * 0.2, headTilt: 0.2 });
    shot("corr", [-0.2 + t * 0.15, 1.45, 2.9 - t * 0.35], [-0.05, 1.3, -0.8], 36);
  });
  // C · 2.3 SCREAM MANOR — lightning, crane down from the moon to the line of guests
  add(2.3, 4.0, (t, T) => {
    show("ext"); light("ext", { ...EXTL, ki: 1.8 + 6 * Math.exp(-t * 6) });
    const line = [g1, granny, kid, g2, girl, bro];
    line.forEach((c, i) => put(c, "ext", 0.5 * Math.sin(i * 2.3), 2.4 + i * 0.85, Math.PI + 0.3 * Math.sin(i), { headPitch: -0.2, headYaw: 0.2 * Math.sin(i + T), lookY: 0.4, smile: 0.6 }));
    put(Z[1], "ext", 3.5, 6.5 - t * 0.6, Math.PI * 0.85, zwalk(1, T));
    const k = eio(clamp(t / 1.6));
    shot("ext", [lerp(-1.5, 1.6, k), lerp(9.5, 2.4, k), lerp(17, 12.5, k)], [0, lerp(4.5, 2.6, k), lerp(-2, 0, k)], 38);
  });
  // D · 4.0 "on Halloween night" — dolly through the door into the dark corridor, guests walk in ahead
  add(4.0, 5.75, (t, T) => {
    show("corr"); light("corr", CORRL);
    const k = eo(clamp(t / 1.75));
    [bro, girl, kid, granny].forEach((c, i) => put(c, "corr", [-0.5, 0.4, 0.05, -0.2][i], 0.2 - i * 0.7 - t * 1.0, Math.PI, { walk: T * 6 + i, smile: 0.5 }));
    shot("corr", [0, 1.55, lerp(4.2, 1.6, k)], [0, 1.3, -6], 36, wob(T, 0.01));
  });
  // E · 5.75 the phone: EMERGENCY ALERT — swiped away
  add(5.75, 7.25, (t, T) => {
    show("corr"); light("corr", { ...CORRL, exp: 1.0 });
    const ap = back(clamp(t / 0.2)), sw = eio(seg(t, 0.95, 1.2));
    bigP.visible = true; bigP.position.set(0, 1.5, -1.3); bigP.rotation.set(0, 0, 0.05 * Math.sin(T * 2)); bigP.scale.setScalar(1);
    const scr = bigP.userData.screen; scr.visible = true; scr.position.x = sw * -0.08; scr.scale.setScalar(Math.max(0.01, ap)); bigP.userData.halo.material.opacity = 0.5 * (1 - sw);
    thumb.visible = true; thumb.position.set(lerp(0.03, -0.05, sw), lerp(1.43, 1.52, seg(t, 0.7, 0.95)), -1.28);
    put(bro, "corr", 0.1, -2.4, 0, { armR: [1.1, 0.15, 0], elR: 1.3, headPitch: 0.35, lookY: -0.5, smile: -0.2 + sw * 0.9, brow: sw > 0.5 ? -0.3 : 0.5 });
    const s = shake(0.002 * (1 - clamp(t / 0.2)), T);
    aim(cam, V3(s[0], 1.52 + s[1], -1.3 + lerp(0.36, 0.3, t / 1.5)), V3(0, 1.5, -1.3), 34);
  });
  // F · 7.25 outside: the horde shambles out of the fog under the streetlights
  add(7.25, 8.75, (t, T) => {
    show("street"); light("street", STRL);
    for (let i = 0; i < 10; i++) put(Z[i], "street", -3 + (i % 5) * 1.5 + 0.3 * Math.sin(i * 7), -14 + Math.floor(i / 5) * -2.2 + t * 1.0 + (i % 3) * 0.4, 0.1 * Math.sin(i), zwalk(i, T));
    rainL.userData.set(T, 0);
    shot("street", [0.4, 0.45, -7.5 - t * 0.4], [0, 1.6, -16], 30);
  });
  // G · 8.75 YOU, backstage: green makeup, a wink in the mirror
  add(8.75, 10.9, (t, T) => {
    show("mirror"); light("mirror", { sky: 0xffe0c0, gnd: 0x3a2020, hemi: 0.7, key: 0xfff0d0, ki: 1.6, kp: [0, 3, 5], fill: 0xffc080, fi: 0.8, ri: 1.2, exp: 1.05 });
    const dab = Math.sin(t * 10) * 0.08, wink = seg(t, 1.5, 1.6) * (1 - seg(t, 1.85, 1.95));
    brush.visible = true;
    put(you, "mirror", 0, 0.75, Math.PI, { armR: [1.55 + dab, -0.55, 0], elR: 2.1, makeup: lerp(0.55, 1, seg(t, 0, 1.4)), smile: 0.8, headYaw: 0.15, brow: 0.3, browL: wink > 0.5 ? -0.5 : 0.3 });
    you.eyes[0].lid.rotation.x = lerp(you.eyes[0].lid.rotation.x, Math.PI / 2, wink);
    shot("mirror", [0.12, 1.62, -0.42], [0, 1.52, 0.75], 34);
  });
  // H · 10.9 hiding behind the coffin, waiting; guests come down the hall
  add(10.9, 13.15, (t, T) => {
    show("corr"); light("corr", CORRL); brush.visible = false;
    put(you, "corr", 1.25, -1.55, Math.PI - 0.35, { crouch: 0.7, armL: [0.8, 0.3, 0], elL: 1.4, armR: [0.9, 0.2, 0], elR: 1.4, smile: 0.9, lookX: 0.6, brow: -0.3, headYaw: 0.3, open: 0 });
    [bro, girl, kid].forEach((c, i) => put(c, "corr", [-0.6, -0.15, 0.25][i], -8.5 + i * 0.6 + t * 1.6, 0, { walk: T * 6 + i, smile: 0.4, lookX: 0.3 }));
    shot("corr", [1.4, 1.2, 0.4], [0.1, 0.95, -6], 36);
  });
  // I · 13.15 "BRAAAINS!" — jump scare: you pop up, arms high, mouth wide, snap zoom
  add(13.15, 14.5, (t, T) => {
    show("corr"); light("corr", { ...CORRL, ki: 2.2, fill: 0x50ff60, fi: 1.4 });
    const up = back(clamp(t / 0.25));
    put(you, "corr", lerp(1.2, 0.6, up), lerp(-1.55, -2.7, up), Math.PI - 0.5, { crouch: lerp(0.7, 0, up), armL: [lerp(0.8, 2.7, up), 0.45, 0], armR: [lerp(0.8, 2.7, up), 0.45, 0], elL: 0.5, elR: 0.5, open: 0.4 + lip("you", T) * 0.6, wide: up, brow: -0.8, sq: -0.25 * up, headPitch: 0.12 });
    put(kid, "corr", -0.4, -4.3, -0.4, { smile: -0.1, lids: 0.3, armR: [0.6, 0.1, 0], elR: 1.3 });
    put(bro, "corr", -1.0, -5.3, 0.1, { smile: 0.4 }); put(girl, "corr", 0.1, -5.6, -0.1, { smile: 0.4 });
    const z = 1 - eo(clamp(t / 0.2)) * 0.35;
    shot("corr", [-0.4, 1.3, -6.0 + 2.2 * (1 - z)], [0.6, 1.62, -2.7], 34 * z + 6, wob(T, 0.02, 3));
  });
  // J · 14.55 "Lame." — the pumpkin kid, deadpan, walks past
  add(14.5, 15.55, (t, T) => {
    show("corr"); light("corr", CORRL);
    put(kid, "corr", 0.1 - t * 0.4, -4.3 + t * 0.25, -0.9, { walk: T * 5, amp: 0.6, lids: 0.65, smile: -0.25, open: lip("kid", T) * 0.6, brow: -0.2, headYaw: 0.4, lookX: 0.7, armR: [0.5, 0.1, 0], elR: 1.2 });
    put(you, "corr", 0.65, -2.9, Math.PI - 0.6, { armL: [2.4, 0.45, 0], armR: [2.4, 0.45, 0], elL: 0.5, elR: 0.5, open: 0.1, wide: 0.6, brow: 0.7, smile: -0.5 });
    shot("corr", [-0.9, 0.62, -2.2], [0.0, 0.62, -4.4], 34);
  });
  // K · 15.6 "But tonight, the new actors are different." — three zombies shuffle out from the curtain
  add(15.55, 17.95, (t, T) => {
    show("corr"); light("corr", { ...CORRL, fd: 0.09 });
    for (let i = 0; i < 3; i++) put(Z[i + 1], "corr", -0.8 + i * 0.8, -10.5 + t * 0.8 + (i % 2) * 0.5, 0, zwalk(i, T, 2.0));
    put(you, "corr", 1.25, -2.4, Math.PI - 0.5, { brow: 0.7, headTilt: 0.25, smile: -0.3, lookX: 0.2 });
    shot("corr", [1.95, 1.65, -0.4 - t * 0.3], [-0.3, 1.3, -9], 34);
  });
  // L · 17.95 "They don't blink." — extreme close on a zombie's open, unblinking eyes (yours blink in the reverse)
  add(17.95, 19.2, (t, T) => {
    show("corr"); light("corr", { ...CORRL, ki: 1.5, fi: 1.0 });
    put(Z[1], "corr", 0, -6, 0, { ...zwalk(1, T, 0), walk: null, zarms: 1, lids: -0.4, wide: 0.6, blink: 0, open: 0.25, lookX: 0.15 * Math.sin(T * 9) * (Math.sin(T * 3) > 0.6 ? 1 : 0) });
    shot("corr", [0.02, 1.68, -4.35 + t * 0.15], [0, 1.66, -6], 28);
  });
  // M · 19.2 "They don't take breaks." — STAFF BREAK sign, the clock races, the zombie keeps shuffling
  add(19.2, 20.45, (t, T) => {
    show("brk"); light("brk", { sky: 0xffe8c0, gnd: 0x2a2020, hemi: 0.6, key: 0xfff0d0, ki: 1.6, kp: [2, 5, 6], fi: 0.5, exp: 1.0 });
    hM.rotation.z = -T * 12; hH.rotation.z = -T * 1.0;
    put(Z[2], "brk", lerp(-2.5, 2.5, ((t * 0.9) % 1)), 0.0, Math.PI / 2, zwalk(2, T, 3));
    put(Z[3], "brk", lerp(-3.5, 1.5, ((t * 0.9 + 0.5) % 1)), 0.3, Math.PI / 2, zwalk(3, T, 3));
    shot("brk", [0.2, 1.7, 6.6], [0, 1.55, -0.5], 40);
  });
  // N · 20.45 "And they're biting the customers." — a zombie chomps the BOO guy, who gives a thumbs up
  add(20.45, 21.8, (t, T) => {
    show("corr"); light("corr", { ...CORRL, fill: 0xff3020, fi: 1.2 });
    const chomp = Math.abs(Math.sin(t * 8));
    put(g1, "corr", 0, -1.5, 0.3, { armR: [1.3, 0.3, 0], elR: 1.5, armL: [0.3, 0.3, 0], open: 0.7, smile: 1, lids: 0.35, brow: 0.7, headTilt: 0.3, sq: chomp * 0.15 });
    put(Z[4], "corr", -0.35, -1.85, 0.9, { zarms: 0.7, open: 0.3 + chomp * 0.5, headPitch: 0.45, headTilt: 0.4, lids: 0.5, T });
    shot("corr", [0.3, 1.45, 0.6 - t * 0.2], [-0.05, 1.45, -1.6], 32);
  });
  // O · 21.85 "Five stars! Best haunted house ever!" — her LIVE selfie, a zombie gnawing her shoulder
  add(21.8, 24.2, (t, T) => {
    show("corr"); light("corr", { ...CORRL, ki: 1.6, key: 0xd8e8ff, kp: [0, 2, 6] });
    const chomp = Math.abs(Math.sin(t * 7));
    put(girl, "corr", 0, -1, 0, { armR: [1.5, 0.15, 0], elR: 0.4, armL: [1.4, -0.2, 0], elL: 1.6, open: 0.1 + lip("girl", T) * 0.8, smile: 1, brow: 0.6, wide: 0.2, sq: chomp * 0.1, headTilt: -0.15 });
    put(Z[2], "corr", -0.42, -1.3, 0.55, { zarms: 0.5, open: 0.3 + chomp * 0.55, headPitch: 0.4, headTilt: -0.4, lids: 0.5, T });
    shot("corr", [0.05, 1.62, 0.35], [-0.15, 1.5, -1.1], 48, -0.05);
  });
  // P · 24.25 "Nobody runs. Everyone thinks it's part of the show." — applause; you turn to camera, horrified
  add(24.2, 27.55, (t, T) => {
    show("corr"); light("corr", CORRL);
    const clap = Math.abs(Math.sin(T * 9));
    put(bro, "corr", -0.9, -3.0, 0.4, { armL: [1.3, -0.35 + clap * 0.25, 0], armR: [1.3, -0.35 + clap * 0.25, 0], elL: 1.2, elR: 1.2, smile: 1, open: 0.5, lids: 0.3 });
    put(granny, "corr", -0.2, -3.6, 0.2, { armL: [1.3, -0.35 + clap * 0.25, 0], armR: [1.3, -0.35 + clap * 0.25, 0], elL: 1.2, elR: 1.2, smile: 1, open: 0.3 });
    put(kid, "corr", 0.5, -3.2, -0.2, { armR: [0.5, 0.1, 0], elR: 1.3, smile: 0.2, lids: 0.4 });
    put(g1, "corr", 0.2, -5.0, 0.1, { smile: 1, open: 0.6, armR: [1.3, 0.3, 0], elR: 1.5 });
    put(Z[4], "corr", -0.15, -5.3, 0.6, { zarms: 0.7, open: 0.6, headPitch: 0.45, T });
    put(Z[0], "corr", 1.1, -4.4, -0.6, zwalk(0, T, 0));
    const turn = eio(seg(t, 1.6, 2.0));
    put(you, "corr", 0.5, -1.2, lerp(Math.PI + 0.6, 0.15, turn), { wide: turn, brow: 0.9, smile: -0.7 * turn, open: 0.15 * turn, lookX: -0.1 });
    shot("corr", [0.55, 1.6, 1.1 - turn * 0.5], [0.45, 1.42, -3.2], 40 - turn * 6);
  });
  // Q · 27.6 "So you sneak out the back door..." — tiptoe, push the EXIT door, light floods in
  add(27.55, 29.2, (t, T) => {
    show("corr"); light("corr", CORRL);
    const door = corr.userData.door, op = eio(seg(t, 0.9, 1.3));
    door.rotation.y = Math.PI / 2 + op * 1.4;
    put(you, "corr", lerp(-0.7, -1.25, seg(t, 0, 0.9)), lerp(-8.3, -9.3, seg(t, 0, 0.9)), -1.2, { walk: t < 0.9 ? T * 5 : null, amp: 0.6, crouch: 0.25, armR: [1.4 + op * 0.3, -0.4, 0], elR: 0.4, lookX: 0.6, brow: 0.6, smile: -0.2 });
    shot("corr", [0.9, 1.5, -6.6], [-1.3, 1.2, -9.4], 36);
  });
  // R · 29.2 "...and the whole town is screaming." — chaos street, crane up
  add(29.2, 31.45, (t, T) => {
    show("street"); light("street", STRL); rainL.userData.set(T, 0);
    for (let i = 0; i < 12; i++) { const runner = i >= 10; const c = runner ? [g1, g2][i - 10] : Z[i]; const rz = runner ? -2 - ((t * 4 + i * 2) % 10) : -12 + (i % 4) * 2.6 + t * 1.1 * (1 + (i % 3) * 0.2); put(c, "street", -3.4 + (i % 6) * 1.35 + 0.4 * Math.sin(i * 5), rz, runner ? Math.PI : 0.15 * Math.sin(i), runner ? { run: 1, walk: T * 10 + i, armL: [2.6, 0.4, 0], armR: [2.6, 0.4, 0], open: 0.9, wide: 1, brow: 0.9 } : zwalk(i, T, 2.6)); }
    const k = eio(clamp(t / 2.2));
    shot("street", [lerp(1.5, 3.5, k), lerp(1.2, 6.5, k), lerp(4, 7, k)], [0, lerp(1.5, 0.5, k), -10], 38);
  });
  // S · 31.45 "A real zombie walks right up to you. It sniffs you..." — nose to nose, sweat
  add(31.45, 34.85, (t, T) => {
    show("street"); light("street", { ...STRL, fi: 1.6 });
    const walkIn = clamp(t / 1.1), sn = t > 1.4 ? Math.sin(t * 16) : 0;
    put(Z[0], "street", lerp(2.2, 0.4, eo(walkIn)), -0.6, -Math.PI / 2 + 0.55, { ...zwalk(0, T), walk: walkIn < 1 ? T * 2.4 : null, zarms: 0.6, headPitch: 0.15 + sn * 0.06, headYaw: 0.3 * Math.sin(t * 2.3), lean: 0.15, open: 0.1, lids: 0.1 });
    put(you, "street", -0.4, -0.6, Math.PI / 2 - 0.6, { brow: 0.95, wide: 0.6, smile: -0.4, lookX: 0.5 * Math.sin(t * 5) * (t > 1.5 ? 1 : 0), lookY: 0.2, sq: 0.08, blink: 0 });
    sweat.forEach((s, i) => { s.visible = t > 1.6; const u = ((t * 0.6 + i * 0.33) % 1); s.position.set(-0.18 + i * 0.03, 0.34 - u * 0.25, 0.17); });
    shot("street", [0.0, 1.62, 2.5 - t * 0.2], [0.0, 1.55, -0.6], 32);
  });
  // T · 34.9 "...and walks away." — it turns and shuffles off; you exhale
  add(34.85, 36.2, (t, T) => {
    show("street"); light("street", STRL); sweat.forEach((s) => (s.visible = false));
    const tr = eio(clamp(t / 0.5));
    put(Z[0], "street", 0.32 + t * 0.5 * tr, -0.6 - t * 0.9 * tr, lerp(-Math.PI / 2, -Math.PI * 1.15, tr), { ...zwalk(0, T), walk: T * 2.4 });
    put(you, "street", -0.32, -0.6, Math.PI / 2 - 0.35 + 0.3 * tr, { sq: -0.2 * seg(t, 0.6, 1.0), open: 0.25 * seg(t, 0.6, 0.9), brow: 0.5, smile: 0.1, lids: 0.3 * seg(t, 0.6, 1) });
    shot("street", [-0.2, 1.6, 2.1], [0.2, 1.45, -1.0], 32);
  });
  // U · 36.2 "Your makeup is so good, they think you're one of them." — you zombie-walk in the horde; one nods to you
  add(36.2, 39.3, (t, T) => {
    show("street"); light("street", STRL);
    put(you, "street", 0, -t * 0.8, Math.PI, { ...zwalk(0, T), smile: 0.1, lids: 0.3, open: 0.2, T });
    for (let i = 0; i < 8; i++) put(Z[i + 1], "street", -2.4 + (i % 4) * 1.6 + 0.3 * Math.sin(i * 3), -1.5 - Math.floor(i / 4) * 2.4 + (i % 2) - t * 0.8, Math.PI + 0.2 * Math.sin(i), zwalk(i + 1, T));
    const nod = seg(t, 1.4, 1.7) * (1 - seg(t, 2.2, 2.5));
    Z[1].pose({ ...zwalk(1, T), headYaw: -1.0 * nod, headPitch: 0.4 * nod * Math.abs(Math.sin(t * 8)), T });
    shot("street", [0.5, 1.85, -3.6 - t * 0.8], [0, 1.45, 0.5 - t * 0.8], 38);
  });
  // V · 39.3 "Oh. My. God." — close on your face: shock, then a slow grin
  add(39.3, 40.6, (t, T) => {
    show("street"); light("street", { ...STRL, fi: 1.8 });
    put(you, "street", 0, -3, 0, { wide: 1 - seg(t, 0.8, 1.1) * 0.6, brow: 0.9 - seg(t, 0.8, 1.1) * 1.4, open: lip("you", T) * 0.7, smile: lerp(-0.3, 1, seg(t, 0.8, 1.1)), lookX: 0.2 });
    shot("street", [0.05, 1.7, -1.55 - t * 0.2], [0, 1.66, -3], 30);
  });
  // W · 40.6 "So you run back inside, and tell the last guests it's the grand finale." — run in, rally the huddle
  add(40.6, 45.0, (t, T) => {
    show("corr"); light("corr", CORRL);
    const runIn = clamp(t / 1.3);
    put(you, "corr", 0, lerp(-9, -3.4, eo(runIn)), 0, runIn < 1 ? { run: 1, walk: T * 11, smile: 0.6 } : { armL: [1.6 + 0.4 * Math.sin(T * 5), 0.6, 0], armR: [2.6, 0.3, 0], elR: 0.3, elL: 0.8, smile: 0.9, open: 0.3 + 0.2 * Math.abs(Math.sin(T * 6)), brow: 0.5, headYaw: 0.3 * Math.sin(T * 2) });
    [bro, girl, kid, granny].forEach((c, i) => put(c, "corr", [-0.8, -0.25, 0.3, 0.85][i], -1.6 + (i % 2) * 0.25, Math.PI + [0.3, 0.1, -0.1, -0.3][i], { crouch: 0.15, armL: [1.0, 0.4, 0], armR: [1.0, 0.4, 0], elL: 1.6, elR: 1.6, brow: 0.9, wide: 0.7, smile: -0.6 + seg(t, 2.6, 3.2) * 1.2, sq: 0.1 * Math.sin(T * 30 + i) }));
    shot("corr", [0.4, 1.1, 1.2], [0, 1.25, -4], 36);
  });
  // X · 45.0 "Single file, folks! Groan if you love Halloween!" — you lead the line, zombie arms, walking at camera
  add(45.0, 47.6, (t, T) => {
    show("corr"); light("corr", CORRL);
    put(you, "corr", 0, -2 + t * 0.6, 0, { walk: T * 4, zarms: 0.9, open: 0.1 + lip("you", T) * 0.8, smile: 0.8, brow: 0.5, T });
    [bro, girl, granny, kid].forEach((c, i) => put(c, "corr", 0.15 * Math.sin(i * 2), -3 - i * 0.85 + t * 0.6, 0, { walk: T * 4 + i * 0.8, zarms: seg(t, 0.4 + i * 0.25, 0.9 + i * 0.25), smile: 0.2, brow: 0.6, lids: 0.2, T: T + i }));
    shot("corr", [0.55, 1.35, 1.4 + t * 0.6], [0, 1.25, -3 + t * 0.6], 34);
  });
  // Y · 47.6 "UUUURGH!" — the whole line groans, low angle
  add(47.6, 48.75, (t, T) => {
    show("corr"); light("corr", { ...CORRL, ki: 1.6 });
    const g = lip("grp", T);
    [you, bro, girl, granny, kid].forEach((c, i) => put(c, "corr", -1.2 + i * 0.6, -2.4 - (i % 2) * 0.35, 0, { zarms: 1, open: 0.3 + g * 0.7, lids: 0.35, brow: -0.6, headTilt: 0.2 * Math.sin(i * 2), sq: g * 0.15, T: T + i }));
    shot("corr", [0, 0.55, 1.1], [0, 1.35, -2.4], 40);
  });
  // Z · 48.75 "...straight through the horde..." — high angle: the fake-zombie line threads the real horde
  add(48.75, 51.0, (t, T) => {
    show("street"); light("street", STRL); rainL.userData.set(T, 0);
    const z0 = -2 - t * 1.0;
    [you, bro, girl, granny, kid].forEach((c, i) => put(c, "street", 0.2 * Math.sin(i), z0 + i * 0.9, Math.PI, { walk: T * 4 + i, zarms: 1, open: 0.4, lids: 0.3, T: T + i }));
    for (let i = 0; i < 12; i++) put(Z[i], "street", (i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.9), -1 - Math.floor(i / 2) * 1.8 - t * 0.2, (i % 2 ? -1 : 1) * 0.6 + Math.PI, zwalk(i, T, 1.8));
    shot("street", [3.5, 7.5, 3 - t * 1.0], [0, 0, -4 - t * 1.0], 40);
  });
  // AA · 51.0 "...to the army trucks." — searchlights, a soldier waves them in
  add(51.0, 52.6, (t, T) => {
    show("street"); light("street", { ...STRL, fi: 0.8, ki: 2.2 }); rainL.userData.set(T, 0);
    beams.forEach((b, i) => { b.rotation.set(0.5 + 0.2 * Math.sin(T * 0.8 + i * 2), 0, 0.6 * Math.sin(T * 0.6 + i * 3)); });
    put(soldier, "street", 0.4, -35, Math.PI * 0.05, { armR: [2.6, 0.5, 0], elR: 0.2 + 0.6 * Math.abs(Math.sin(T * 6)), smile: 0.6, open: 0.4 });
    [you, bro, girl, granny, kid].forEach((c, i) => put(c, "street", 0.2 * Math.sin(i), -30 - t * 1.2 + i * 0.9, Math.PI, { walk: T * 6 + i, zarms: 0.3, smile: 0.7 }));
    shot("street", [1.2, 1.4, -24 - t * 0.8], [0, 2.0, -40], 36);
  });
  // AB · 52.6 "You made it." — relief at the truck, soldier thumbs-up
  add(52.6, 53.95, (t, T) => {
    show("street"); light("street", { ...STRL, key: 0xe0e8ff, ki: 2.2 }); rainL.userData.set(T, 0);
    put(you, "street", 0, -34, 0.2, { sq: -0.15 * Math.sin(Math.min(t * 3, Math.PI)), smile: 1, lids: 0.3, open: 0.2, armL: [0.2, 0.3, 0], armR: [0.2, 0.3, 0] });
    put(soldier, "street", 0.9, -34.8, -0.6, { armR: [1.3, 0.3, 0], elR: 1.6, smile: 0.7 });
    shot("street", [-0.3, 1.6, -31.6], [0.25, 1.55, -34.4], 32);
  });
  // AC · 53.95 "And then... it starts to rain." — a drop on your nose, you look up
  add(53.95, 55.2, (t, T) => {
    show("street"); light("street", { ...STRL, ki: 1.4, exp: 0.95 }); rainL.userData.set(T, seg(t, 0.4, 1.2));
    rainL.position.set(0, 0, -30);
    put(you, "street", 0, -34, 0, { headPitch: -0.6 * seg(t, 0.3, 0.6), lookY: 0.8, smile: lerp(1, -0.1, seg(t, 0.2, 0.6)), brow: 0.4, blink: t > 0.15 && t < 0.25 ? 1 : 0 });
    shot("street", [0, 1.75, -32.6], [0, 1.65, -34], 30);
  });
  // AD · 55.2 the makeup washes off — green streaks run, pink skin shows through
  add(55.2, 56.6, (t, T) => {
    show("street"); light("street", { ...STRL, ki: 1.4, exp: 0.95 }); rainL.userData.set(T, 1);
    const w = clamp(t / 1.3);
    put(you, "street", 0, -34, 0, { makeup: 1 - w, wash: w, armL: [1.5, -0.1, 0], armR: [1.5, -0.1, 0], elL: 1.0, elR: 1.0, headPitch: 0.35, lookY: -0.5, brow: 0.8, smile: -0.5, wide: 0.4 });
    shot("street", [0.15, 1.62, -32.5], [0, 1.5, -34], 32);
  });
  // AE · 56.6 every zombie SNAPS its head toward you — red eyes ignite
  add(56.6, 57.95, (t, T) => {
    show("street"); light("street", { ...STRL, ki: 1.3, exp: 0.9 }); rainL.userData.set(T, 1);
    const snap = clamp(t / 0.12);
    put(you, "street", 0, -34, Math.PI, { makeup: 0, wash: 1, smile: -0.6, brow: 0.9 });
    for (let i = 0; i < 12; i++) put(Z[i], "street", -3.2 + (i % 6) * 1.3, -29.8 - Math.floor(i / 6) * 2.0, Math.PI + 0.3 * Math.sin(i), { zarms: 0.8, headYaw: lerp(1.6 * (i % 2 ? 1 : -1), 0, snap), headPitch: 0, open: 0.2 + snap * 0.6, lids: -0.3, wide: snap, T });
    glowEyes.forEach((h) => (h.material.opacity = 0.9 * snap));
    shot("street", [1.5, 1.75, -37.6], [-0.4, 1.45, -30], 46);
  });
  // AF · 57.95 "Would you have survived?" — your face; behind you the horde charges
  add(57.95, 59.35, (t, T) => {
    show("street"); light("street", { ...STRL, ki: 1.3, exp: 0.9 }); rainL.userData.set(T, 1);
    put(you, "street", 0, -34, 0, { makeup: 0, wash: 1, wide: 1, brow: 1, smile: -0.8, open: 0.25, lookX: 0.8 });
    for (let i = 0; i < 8; i++) put(Z[i], "street", -2.5 + (i % 4) * 1.7, -38 - Math.floor(i / 4) * 2 + t * 2.5, 0, { run: 1, walk: T * 9 + i, zarms: 1, open: 0.8, wide: 1, T });
    glowEyes.forEach((h) => (h.material.opacity = 0.9));
    shot("street", [0, 1.65, -32.2 + t * 0.2], [0, 1.6, -34.5], 34, wob(T, 0.02, 4));
  });
  // AG · 59.35 end: you RUN at camera, horde behind (under the SUBSCRIBE card)
  add(59.35, 61.0, (t, T) => {
    show("street"); light("street", { ...STRL, ki: 1.3, exp: 0.85 }); rainL.userData.set(T, 1);
    put(you, "street", 0, -30 + t * 4, 0, { run: 1, walk: T * 11, makeup: 0, wash: 1, wide: 1, open: 0.7, brow: 1, armL: [1, 0.3, 0], armR: [1, 0.3, 0] });
    for (let i = 0; i < 10; i++) put(Z[i], "street", -3 + (i % 5) * 1.5, -34 - Math.floor(i / 5) * 1.8 + t * 3.8, 0, { run: 1, walk: T * 9 + i, zarms: 1, open: 0.8, wide: 1, T });
    glowEyes.forEach((h) => (h.material.opacity = 0.9));
    shot("street", [0.4, 1.1, -24 + t * 3.6], [0, 1.5, -32 + t * 4], 38);
  });

  return { render(T) {
    TT = T;
    ALL.forEach((c) => (c.root.visible = false));
    sweat.forEach((s) => (s.visible = false)); glowEyes.forEach((h) => (h.material.opacity = 0));
    brush.visible = false; bigP.visible = false; thumb.visible = false; ph.bro.userData.screen.visible = false; ph.bro.userData.screen.position.x = 0; ph.bro.userData.halo.material.opacity = 0;
    corr.userData.door.rotation.y = Math.PI / 2; rainL.position.set(0, 0, -4); rainL.userData.set(T, 0);
    tick(T);
    const s = S.find((x) => T >= x.a && T < x.b) || S[S.length - 1];
    s.f(T - s.a, T);
    sky.position.copy(cam.position);
    renderer.render(scene, cam);
  } };
}
export const SHOT_TIMES = null;
