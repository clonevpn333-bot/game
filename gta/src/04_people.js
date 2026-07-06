// ============================================================================
// NEON BAY · 04_people.js — people: palettes, rigged human figure builder (male + female), procedural animation
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
const SKIN = [0xf6d3ab, 0xecbd90, 0xcf9058, 0xa06a40, 0x7a4a28, 0xffe0bd];
const SHIRTS = [0x3f7cb4, 0xd8484c, 0x4caf50, 0xf0b83a, 0x9a5ec8, 0x3a3f48, 0xe07bb0, 0x2ab5a0, 0xe8e8e8, 0xf07a34, 0x2f74a8];
const PANTS = [0x2c3242, 0x3a2e26, 0x45454e, 0x2a3b30, 0x554050, 0x1f2530, 0x5a5148];
const HAIR = [0x241810, 0x0e0e0e, 0x6b4a2a, 0xd0a63a, 0x7a3a20, 0x4a4a4a, 0x2b2b2b, 0x8a2f2f, 0xc0c0c8, 0x5a3fa0];
const HATS = [0x2a2f3a, 0xb43b3b, 0x2f6fd4, 0x2f9e54, 0xf0b83a, 0xe8e8e8, 0x8a4fd0, 0x101216];
const HAIR_STYLES = ['buzz', 'bowl', 'bowl', 'mop', 'spiky', 'afro', 'cap', 'beanie', 'bald', 'pony', 'cap'];
const CARDS = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
function cap(r, len, m, rs) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 14, rs || 22), m); } // higher-poly limbs — smoother, less blocky
function humanFigure(p) {
  const fem = !!p.fem, shOff = fem ? 0.172 : 0.2;
  const skin = p.skin || pick(SKIN), shirt = p.shirt || pick(SHIRTS), pants = p.pants || pick(PANTS), hair = p.hair || pick(HAIR);
  const Sk = skinMat(skin), Sh = mat(shirt), Pa = mat(pants), Ha = mat(hair), Bo = mat(0x16161c);
  const group = new THREE.Group();
  // pelvis / hips (fuller hips on female builds)
  const hips = new THREE.Group(); hips.position.y = 0.9; group.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), Pa); pelvis.scale.set(fem ? 1.22 : 1.1, 0.7, fem ? 0.86 : 0.8); pelvis.position.y = 0.02; hips.add(pelvis);
  // legs: thigh + shin + foot, reaching the ground
  const legs = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? -1 : 1; const leg = new THREE.Group(); leg.position.set(sx * 0.1, 0, 0); hips.add(leg);
    const thigh = cap(0.1, 0.34, Pa); thigh.position.y = -0.22; leg.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 13), Pa); knee.position.y = -0.45; leg.add(knee);
    const shin = new THREE.Group(); shin.position.y = -0.46; leg.add(shin);
    const shinM = cap(0.08, 0.32, Pa); shinM.position.y = -0.2; shin.add(shinM);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), Bo); foot.position.set(0, -0.4, 0.08); shin.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), Bo); toe.position.set(0, -0.42, 0.22); toe.scale.set(1, 0.72, 1); shin.add(toe);
    legs[s] = { leg, shin };
  }
  // torso (waist -> shoulders) + belt + collar
  const chest = new THREE.Group(); chest.position.y = 0.1; hips.add(chest);
  const prof = [[0.04, 0], [0.15, 0.02], [0.18, 0.14], [0.205, 0.3], [0.215, 0.42], [0.17, 0.5], [0.08, 0.55], [0.03, 0.57]].map(a => new THREE.Vector2(a[0], a[1]));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), Sh); torso.scale.z = 0.72; chest.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.17, 0.06, 20), mat(0x1a1a20)); belt.position.y = 0.03; belt.scale.z = 0.76; chest.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), mat(0xc9b25a)); buckle.position.set(0, 0.03, 0.13); chest.add(buckle);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.05, 16), mat(new THREE.Color(shirt).multiplyScalar(0.82).getHex())); collar.position.y = 0.55; collar.scale.z = 0.8; chest.add(collar);
  if (fem) torso.scale.set(0.9, 1, 0.66); // slimmer waist on female builds
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(fem ? 0.066 : 0.078, 20, 16), Sh); sh.position.set(sx * shOff, 0.44, 0); chest.add(sh); } // rounded shoulder caps (narrower for fem)
  // head — ~1/7 of body height (no more bobblehead)
  const head = new THREE.Group(); head.position.y = 0.62; chest.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.1, 12), Sk); neck.position.y = -0.04; head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 22), Sk); skull.position.y = 0.08; skull.scale.set(0.96, 1.06, 1.0); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), Sk); jaw.position.set(0, 0.0, 0.02); jaw.scale.set(0.86, 0.82, 0.92); head.add(jaw);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), mat(0xffffff)); eye.position.set(sx * 0.05, 0.09, 0.108); head.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), mat(0x241a12)); iris.position.set(sx * 0.05, 0.09, 0.124); head.add(iris);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.016), Ha); brow.position.set(sx * 0.05, 0.125, 0.112); head.add(brow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), Sk); ear.position.set(sx * 0.125, 0.06, 0.0); ear.scale.set(0.45, 1, 0.7); head.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.055, 8), Sk); nose.position.set(0, 0.06, 0.122); nose.rotation.x = Math.PI / 2 + 0.4; head.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.045, fem ? 0.016 : 0.012, 0.014), mat(fem && Math.random() < 0.6 ? pick([0xc85a6a, 0xb84a5a, 0xd06a78, 0xa83a4a]) : 0x8a4444)); mouth.position.set(0, 0.025, 0.114); head.add(mouth); // lips / lipstick
  // ---- varied hair / headwear (sits above the brow so it never covers the face) ----
  const style = p.style || (fem ? pick(['long', 'bob', 'bun', 'pony', 'long', 'bob', 'long', 'cap']) : pick(HAIR_STYLES));
  const capHair = (r, y, tl, z) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16, 0, TAU, 0, tl), Ha); h.position.set(0, y, z === undefined ? -0.012 : z); head.add(h); return h; };
  if (style === 'buzz') capHair(0.134, 0.12, 1.35);
  else if (style === 'bowl') capHair(0.147, 0.13, 1.3);
  else if (style === 'mop') { capHair(0.15, 0.125, 1.36); const back = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14, 0, TAU, 0, 1.7), Ha); back.position.set(0, 0.05, -0.07); back.scale.set(1, 1.05, 0.8); head.add(back); }
  else if (style === 'spiky') { capHair(0.136, 0.125, 1.3); for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 5), Ha); s.position.set(rnd(-0.08, 0.08), 0.245, rnd(-0.07, 0.03)); s.rotation.set(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3)); head.add(s); } }
  else if (style === 'afro') capHair(0.17, 0.16, 1.55, -0.02);
  else if (style === 'pony') { capHair(0.143, 0.13, 1.3); const tail = cap(0.04, 0.22, Ha, 8); tail.position.set(0, 0.02, -0.15); head.add(tail); }
  else if (style === 'cap') { const col = pick(HATS); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.147, 20, 14, 0, TAU, 0, 1.5), mat(col)); dome.position.set(0, 0.12, -0.01); head.add(dome); const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.17), mat(col)); brim.position.set(0, 0.12, 0.15); head.add(brim); }
  else if (style === 'beanie') { const col = pick(HATS); const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16, 0, TAU, 0, 1.55), mat(col)); b.position.set(0, 0.115, -0.006); head.add(b); }
  else if (style === 'long') { capHair(0.15, 0.125, 1.5, -0.01); const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 8, 16), Ha); back.position.set(0, -0.06, -0.09); back.scale.set(1.05, 1, 0.6); head.add(back); for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.24, 6, 12), Ha); side.position.set(sx * 0.12, -0.04, 0.02); head.add(side); } }
  else if (style === 'bob') { capHair(0.152, 0.125, 1.55, -0.01); const back = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14, 0, TAU, 0, 2.0), Ha); back.position.set(0, 0.0, -0.03); back.scale.set(1.02, 1.0, 0.85); head.add(back); }
  else if (style === 'bun') { capHair(0.144, 0.128, 1.35); const bun = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), Ha); bun.position.set(0, 0.2, -0.08); head.add(bun); }
  // 'bald' adds nothing. occasional beard/stubble on the chin (male builds only).
  if (!fem && style !== 'afro' && Math.random() < 0.3) { const beard = new THREE.Mesh(new THREE.SphereGeometry(0.096, 16, 12, 0, TAU, 1.4, 1.2), Ha); beard.position.set(0, -0.01, 0.03); beard.scale.set(0.92, 0.8, 0.9); head.add(beard); }
  // a skirt on some female builds (moves with the hips, over the legs)
  if (fem && Math.random() < 0.5) { const skCol = pick([shirt, pants, 0x2a2f3a, 0x8a3a58, 0x3a4a6a, 0x5a3a5a, 0x6a2f4a]); const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 0.44, 22, 1, true), mat(skCol, { side: THREE.DoubleSide })); skirt.position.y = -0.2; hips.add(skirt); }
  // arms: shirt-sleeved upper arm, bare (skin) forearm, small hand pad — hang at sides
  const arms = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? -1 : 1; const arm = new THREE.Group(); arm.position.set(sx * shOff, 0.42, 0); arm.rotation.z = sx * 0.05; chest.add(arm);
    const up = cap(0.056, 0.24, Sh); up.position.y = -0.16; arm.add(up);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), Sk); elbow.position.y = -0.33; arm.add(elbow);
    const fore = new THREE.Group(); fore.position.y = -0.34; arm.add(fore);
    const foreM = cap(0.046, 0.22, Sk); foreM.position.y = -0.14; fore.add(foreM);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), Sk); hand.position.y = -0.29; hand.scale.set(1, 1.15, 0.7); fore.add(hand);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), Sk); thumb.position.set(sx * -0.04, -0.27, 0.02); fore.add(thumb);
    arms[s] = { arm, fore };
  }
  if (!p.noScale) { const bs = fem ? rnd(0.85, 1.03) : rnd(0.92, 1.16); group.scale.set(bs * rnd(0.93, 1.08), bs, bs * rnd(0.95, 1.05)); } // varied heights & builds (fem slightly shorter on average)
  const f = { group, kind: 'proc', head, t: rnd(10), j: { hips, chest, head, armL: arms.L.arm, armR: arms.R.arm, foreL: arms.L.fore, foreR: arms.R.fore, legL: legs.L.leg, legR: legs.R.leg, shinL: legs.L.shin, shinR: legs.R.shin } };
  f.update = (dt, o) => animateHuman(f, dt, o || {}); animateHuman(f, 0, { state: 'idle' });
  return f;
}
function animateHuman(f, dt, o) {
  const j = f.j, state = o.state || 'idle'; f.t += dt; const t = f.t;
  const set = (n, x, y, z) => { const g = j[n]; if (x !== undefined) g.rotation.x = x; if (y !== undefined) g.rotation.y = y; if (z !== undefined) g.rotation.z = z; };
  j.chest.scale.set(1, 1, 1); f.group.rotation.x = 0; f.group.rotation.z = 0;
  if (state === 'walk' || state === 'run') {
    const run = state === 'run', amp = run ? 0.9 : 0.55, ph = t * (run ? 10.5 : 7.2);
    set('legL', Math.sin(ph) * amp); set('legR', Math.sin(ph + Math.PI) * amp);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * (amp + 0.6)); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * (amp + 0.6));
    j.armL.rotation.x = Math.sin(ph + Math.PI) * amp * 0.85; j.armR.rotation.x = Math.sin(ph) * amp * 0.85; j.armL.rotation.z = 0.08; j.armR.rotation.z = -0.08;
    j.foreL.rotation.x = -0.28 - Math.max(0, Math.sin(ph)) * 0.4; j.foreR.rotation.x = -0.28 - Math.max(0, Math.sin(ph + Math.PI)) * 0.4;
    set('hips', 0, Math.sin(ph) * 0.09, 0); j.chest.rotation.x = run ? 0.3 : 0.12; j.chest.rotation.y = -Math.sin(ph) * 0.08; j.head.rotation.x = 0; j.head.rotation.y = 0;
    const bob = Math.abs(Math.sin(ph)); f.group.position.y = bob * (run ? 0.09 : 0.05); j.chest.scale.set(1 - bob * 0.03, 1 + bob * 0.05, 1 - bob * 0.03); // squash/stretch = bouncy
  } else if (state === 'sit') {
    set('legL', -1.5); set('legR', -1.5); set('shinL', 1.7); set('shinR', 1.7);
    j.armL.rotation.x = -0.5; j.armR.rotation.x = -0.5; j.armL.rotation.z = 0.15; j.armR.rotation.z = -0.15; j.foreL.rotation.x = -0.6; j.foreR.rotation.x = -0.6;
    j.chest.rotation.x = 0.12 + Math.sin(t * 1.1) * 0.02; j.head.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.05; set('hips', 0, 0, 0); f.group.position.y = -0.42;
  } else if (state === 'talk') {
    const ph = t * 2.4;
    j.chest.rotation.x = 0.03 + Math.sin(t * 1.2) * 0.02; j.chest.rotation.y = Math.sin(t * 0.8) * 0.05;
    j.head.rotation.x = Math.sin(t * 1.7) * 0.07; j.head.rotation.y = Math.sin(t * 0.9) * 0.14;
    j.armR.rotation.x = -0.55 + Math.sin(ph) * 0.35; j.armR.rotation.z = -0.25; j.foreR.rotation.x = -0.8 + Math.sin(ph + 1) * 0.45;
    j.armL.rotation.x = Math.sin(t * 1.1) * 0.06; j.armL.rotation.z = 0.12; j.foreL.rotation.x = -0.35;
    set('legL', 0); set('legR', 0); set('shinL', 0); set('shinR', 0); set('hips', 0, 0, 0); f.group.position.y = 0;
  } else if (state === 'dance') {
    const ph = t * 4.4;
    j.armL.rotation.x = -2.2 + Math.sin(ph) * 0.5; j.armR.rotation.x = -2.2 + Math.sin(ph + Math.PI) * 0.5; j.armL.rotation.z = 0.5; j.armR.rotation.z = -0.5; j.foreL.rotation.x = -0.5; j.foreR.rotation.x = -0.5;
    set('hips', 0, Math.sin(ph * 0.5) * 0.28, 0); j.chest.rotation.y = Math.sin(ph * 0.5 + 1) * 0.22; j.chest.rotation.x = 0.05; j.head.rotation.y = Math.sin(ph * 0.5) * 0.22;
    set('legL', Math.sin(ph) * 0.18); set('legR', -Math.sin(ph) * 0.18); set('shinL', 0.12); set('shinR', 0.12);
    const bob = Math.abs(Math.sin(ph)); f.group.position.y = bob * 0.1; j.chest.scale.set(1 - bob * 0.05, 1 + bob * 0.08, 1 - bob * 0.05);
  } else if (state === 'wave') {
    zero(j, f); j.armR.rotation.x = -2.6; j.armR.rotation.z = -0.35; j.foreR.rotation.x = -0.3; j.foreR.rotation.z = Math.sin(t * 7) * 0.55;
    j.head.rotation.y = Math.sin(t * 1.2) * 0.06; j.chest.rotation.x = 0.02;
  } else if (state === 'phone') {
    zero(j, f); j.armR.rotation.x = -0.5; j.foreR.rotation.x = -2.15; j.armR.rotation.z = -0.25;
    j.head.rotation.x = 0.28; j.head.rotation.y = -0.12 + Math.sin(t * 0.7) * 0.03; j.chest.rotation.x = 0.06;
  } else if (state === 'smoke') {
    zero(j, f); const cyc = (t % 5) / 5, up = cyc < 0.3 ? Math.sin(cyc / 0.3 * Math.PI) : 0;
    j.armR.rotation.x = -0.3 - up * 1.35; j.foreR.rotation.x = -0.5 - up * 0.9; j.head.rotation.x = up * 0.14; j.chest.rotation.x = 0.04;
  } else if (state === 'lean') {
    zero(j, f); j.chest.rotation.x = -0.14; f.group.position.y = -0.05; f.group.rotation.x = -0.18;
    j.armL.rotation.z = 0.3; j.armR.rotation.z = -0.3; j.foreL.rotation.x = -0.9; j.foreR.rotation.x = -0.9;
    set('legL', 0.25); set('legR', 0.25); set('shinL', -0.1); set('shinR', -0.1); j.head.rotation.y = Math.sin(t * 0.5) * 0.12;
  } else if (state === 'panhandle') {
    set('legL', -1.5); set('legR', -1.5); set('shinL', 1.7); set('shinR', 1.7); f.group.position.y = -0.42;
    j.chest.rotation.x = 0.22; j.head.rotation.x = 0.12 + Math.sin(t * 0.9) * 0.05;
    j.armR.rotation.x = -0.95; j.foreR.rotation.x = -0.35; j.armL.rotation.x = -0.25; j.foreL.rotation.x = -0.7; // cup held out
  } else if (state === 'sleep') {
    zero(j, f); f.group.rotation.z = Math.PI / 2; f.group.position.y = -0.62;
    set('legL', -0.5); set('legR', -0.4); set('shinL', 0.8); set('shinR', 0.7); j.armL.rotation.x = -1.3; j.foreL.rotation.x = -1.1; j.armR.rotation.x = -0.3;
    j.chest.rotation.x = 0.2; j.head.rotation.x = 0.3;
  } else if (state === 'workout') {
    const ph = Math.sin(t * 3.2), dn = (ph + 1) / 2; zero(j, f);
    set('legL', -dn * 1.5); set('legR', -dn * 1.5); set('shinL', dn * 1.9); set('shinR', dn * 1.9); f.group.position.y = -dn * 0.4;
    j.armL.rotation.x = -1.5; j.armR.rotation.x = -1.5; j.foreL.rotation.x = -0.15; j.foreR.rotation.x = -0.15; j.chest.rotation.x = 0.1;
  } else if (state === 'point') {
    zero(j, f); j.armR.rotation.x = -1.5; j.foreR.rotation.x = -0.06; j.head.rotation.y = -0.1; j.chest.rotation.y = -0.08;
  } else if (state === 'cheer') {
    const ph = t * 5, up = Math.abs(Math.sin(ph)); zero(j, f);
    j.armL.rotation.x = -2.5 - up * 0.4; j.armR.rotation.x = -2.5 - up * 0.4; j.armL.rotation.z = 0.35; j.armR.rotation.z = -0.35;
    f.group.position.y = up * 0.14; j.head.rotation.x = -0.15; j.chest.scale.set(1, 1 + up * 0.04, 1);
  } else if (state === 'cower') {
    zero(j, f); j.chest.rotation.x = 0.85; j.head.rotation.x = 0.5; f.group.position.y = -0.3;
    set('legL', -0.9); set('legR', -0.9); set('shinL', 1.3); set('shinR', 1.3);
    j.armL.rotation.x = -2.4; j.armR.rotation.x = -2.4; j.foreL.rotation.x = -1.2; j.foreR.rotation.x = -1.2; // arms over head
  } else if (state === 'handsup') {
    zero(j, f); j.armL.rotation.x = -2.9; j.armR.rotation.x = -2.9; j.armL.rotation.z = 0.25; j.armR.rotation.z = -0.25;
    j.foreL.rotation.x = -0.15; j.foreR.rotation.x = -0.15; j.head.rotation.x = 0.08 + Math.sin(t * 3) * 0.02;
  } else if (state === 'drunk') {
    const ph = t * 4.6;
    set('legL', Math.sin(ph) * 0.5); set('legR', Math.sin(ph + Math.PI) * 0.5);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * 1.0); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * 1.0);
    j.armL.rotation.x = Math.sin(ph * 0.7) * 0.6 - 0.2; j.armR.rotation.x = -Math.sin(ph * 0.6) * 0.6 - 0.2; j.foreL.rotation.x = -0.4; j.foreR.rotation.x = -0.4;
    j.chest.rotation.z = Math.sin(t * 1.7) * 0.16; j.chest.rotation.x = 0.1; j.head.rotation.z = Math.sin(t * 1.3) * 0.2;
    set('hips', 0, Math.sin(t * 1.1) * 0.2, 0); f.group.position.y = Math.abs(Math.sin(ph)) * 0.04;
  } else if (state === 'argue') {
    const ph = t * 3.4; zero(j, f);
    j.armR.rotation.x = -1.1 + Math.sin(ph) * 0.5; j.foreR.rotation.x = -0.5 + Math.sin(ph + 1) * 0.4;
    j.armL.rotation.x = -0.4 + Math.sin(ph * 0.7) * 0.3; j.foreL.rotation.x = -0.6;
    j.head.rotation.x = -0.06 + Math.sin(ph) * 0.06; j.chest.rotation.x = -0.05; j.head.rotation.y = Math.sin(t * 1.4) * 0.1;
  } else if (state === 'sweep') {
    const ph = Math.sin(t * 2.6); zero(j, f);
    j.armL.rotation.x = -0.8 + ph * 0.25; j.armR.rotation.x = -0.6 - ph * 0.25; j.foreL.rotation.x = -0.5; j.foreR.rotation.x = -0.4;
    j.chest.rotation.x = 0.28; j.chest.rotation.y = ph * 0.18; j.head.rotation.x = 0.24;
  } else if (state === 'yank') {
    // grab the door / driver and haul them out
    const pull = (Math.sin(t * 6.5) + 1) / 2; zero(j, f);
    j.armL.rotation.x = -1.55 + pull * 1.05; j.armR.rotation.x = -1.55 + pull * 1.05; j.foreL.rotation.x = -0.35; j.foreR.rotation.x = -0.35;
    j.chest.rotation.x = 0.3 - pull * 0.42; set('legL', -0.15 + pull * 0.1); set('legR', 0.2 - pull * 0.1); j.head.rotation.x = 0.1;
  } else if (state === 'limp') {
    // wounded hobble: favour one leg, hunch, clutch the ribs
    const ph = t * 4.6, hurt = Math.max(0, Math.sin(ph));
    set('legL', Math.sin(ph) * 0.35); set('legR', Math.sin(ph + Math.PI) * 0.6);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * 0.5); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * 1.1);
    j.chest.rotation.x = 0.28; j.chest.rotation.z = Math.sin(ph) * 0.08; j.head.rotation.x = 0.16;
    j.armL.rotation.x = -0.7; j.foreL.rotation.x = -1.1; j.armL.rotation.z = 0.35; // hand pressed to the side
    j.armR.rotation.x = Math.sin(ph) * 0.3; j.foreR.rotation.x = -0.2;
    f.group.position.y = -0.06 - hurt * 0.05;
  } else if (state === 'cuffed') {
    // on your knees, hands behind your back — the ride downtown is coming
    zero(j, f); set('legL', -1.25); set('legR', -1.25); set('shinL', 1.95); set('shinR', 1.95); f.group.position.y = -0.5;
    j.armL.rotation.x = 0.55; j.armR.rotation.x = 0.55; j.armL.rotation.z = 0.32; j.armR.rotation.z = -0.32; j.foreL.rotation.x = -0.55; j.foreR.rotation.x = -0.55;
    j.chest.rotation.x = 0.3; j.head.rotation.x = 0.35 + Math.sin(t * 2) * 0.03;
  } else if (state === 'knockout') {
    zero(j, f); f.group.rotation.x = -1.5; f.group.position.y = -0.62; // flat on their back, out cold
    j.armL.rotation.z = 0.9; j.armR.rotation.z = -0.7; set('legL', -0.25); set('shinL', 0.55); j.head.rotation.x = 0.15;
  } else if (state === 'hitstun') {
    zero(j, f); const k = Math.sin(t * 16) * 0.06;
    j.chest.rotation.x = -0.3 + k; j.head.rotation.x = -0.25; f.group.position.y = -0.06;
    j.armL.rotation.x = -0.9; j.armR.rotation.x = -0.9; j.foreL.rotation.x = -0.8; j.foreR.rotation.x = -0.8; set('legL', -0.2); set('legR', 0.24);
  } else {
    const b = Math.sin(t * 1.5); zero(j, f);
    j.chest.rotation.x = 0.02 + b * 0.014; j.chest.rotation.y = Math.sin(t * 0.6) * 0.03; j.chest.scale.set(1, 1 + b * 0.02, 1);
    j.armL.rotation.x = b * 0.04; j.armR.rotation.x = -b * 0.04; j.armL.rotation.z = 0.06; j.armR.rotation.z = -0.06; j.foreL.rotation.x = -0.06; j.foreR.rotation.x = -0.06;
    j.head.rotation.y = Math.sin(t * 0.5) * 0.09; j.head.rotation.x = Math.sin(t * 0.7) * 0.03;
    set('hips', 0, Math.sin(t * 0.7) * 0.02, 0);
  }
}
function zero(j, f) {
  j.legL.rotation.x = 0; j.legR.rotation.x = 0; j.shinL.rotation.x = 0; j.shinR.rotation.x = 0;
  j.armL.rotation.set(0, 0, 0.06); j.armR.rotation.set(0, 0, -0.06); j.foreL.rotation.set(-0.06, 0, 0); j.foreR.rotation.set(-0.06, 0, 0);
  j.hips.rotation.set(0, 0, 0); j.chest.rotation.set(0, 0, 0); j.head.rotation.set(0, 0, 0);
  f.group.position.y = 0; f.group.rotation.x = 0; f.group.rotation.z = 0;
}
function buildPerson(p) { return humanFigure(p); }
function buildPlane() {
  const g = new THREE.Group();
  const body = mat(0xeef1f6), wingm = mat(0xccd2db), trim = mat(0x2f6fd4), glass = mat(0x0e1420);
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 30, 16), body); fus.rotation.x = Math.PI / 2; fus.castShadow = true; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), body); nose.scale.set(1, 1, 1.6); nose.position.set(0, 0, 16); g.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 16), body); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0, -16.5); g.add(tail);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 7), wingm); wing.position.set(0, -0.7, 0); wing.castShadow = true; g.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 5), trim); fin.position.set(0, 4, -13); g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 4), wingm); stab.position.set(0, 1.6, -13); g.add(stab);
  for (let i = -6; i <= 6; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.6), glass); w.position.set(2.35, 0.6, i * 2); g.add(w); const w2 = w.clone(); w2.position.x = -2.35; g.add(w2); }
  for (const sx of [-9, 9]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 12), trim); e.rotation.x = Math.PI / 2; e.position.set(sx, -1.7, 1); g.add(e); }
  return g;
}
function buildPistol() {
  const g = new THREE.Group(); const m = mat(0x20242c), m2 = mat(0x3a3f48);
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.2), m); slide.position.set(0, 0, 0.06); g.add(slide);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), m2); barrel.position.set(0, 0.01, 0.17); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.05), m); grip.position.set(0, -0.07, -0.01); grip.rotation.x = -0.25; g.add(grip);
  return g;
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
const CAR_COLORS = [0xd23b3b, 0x2f6fd4, 0x24272f, 0xf0f0f4, 0x2fb85e, 0xe8b83a, 0x8a4fd0, 0xf07d2a, 0x18b0b0, 0xf04a7a];
const PROP = { shop: { cost: 500, rate: 12 }, diner: { cost: 800, rate: 18 }, hotel: { cost: 1500, rate: 32 }, club: { cost: 2500, rate: 55 } };
