// ============================================================================
// NEON BAY · 05_vehicles.js — vehicle bodies: sedans, taxi sign, sports/monster/bike/bus builders
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
function buildCar(color) {
  const g = new THREE.Group(); const paint = mat(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.6), paint); body.position.y = 0.6; body.castShadow = true; g.add(body);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.5), mat(0x15171c)); skirt.position.y = 0.33; g.add(skirt);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 2.3), paint); cabin.position.set(0, 1.12, -0.15); cabin.castShadow = true; g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.5, 2.34), mat(0x0c1018, { transparent: true, opacity: 0.6 })); glass.position.set(0, 1.12, -0.15); g.add(glass);
  const capm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 2.0), paint); capm.position.set(0, 1.44, -0.15); g.add(capm);
  // someone is actually driving: low-poly driver visible through the glass
  const drv = new THREE.Group();
  const dTor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.32), mat(pick(SHIRTS))); drv.add(dTor);
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8), skinMat(pick(SKIN))); dHead.position.y = 0.46; drv.add(dHead);
  const dHair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), mat(pick(HAIR))); dHair.position.y = 0.58; drv.add(dHair);
  const dArms = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.34), mat(pick(SHIRTS))); dArms.position.set(0, 0.05, -0.28); drv.add(dArms);
  drv.position.set(0.45, 1.02, -0.5); drv.visible = false; g.add(drv); g.userData.driver = drv;
  g.userData.wheels = [];
  for (const sz of [-1.52, 1.48]) for (const sx of [-1.0, 1.0]) { const wg = new THREE.Group(); wg.position.set(sx, 0.45, sz); const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 18), mat(0x0c0d11)); tire.rotation.z = Math.PI / 2; tire.castShadow = true; wg.add(tire); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.34, 10), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
  const hl = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), hl); l.position.set(sx, 0.72, -2.32); g.add(l); }
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 }); for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tl); l.position.set(sx, 0.74, 2.32); g.add(l); }
  // detail: bumpers, side mirrors, plates, door seams
  const chrome = mat(0xd8dde4);
  for (const sz of [-2.36, 2.36]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 0.16), chrome); b.position.set(0, 0.5, sz); g.add(b); }
  for (const sx of [-1.03, 1.03]) { const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), chrome); arm2.position.set(sx, 1.02, -1.15); g.add(arm2); const mir = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.16), mat(0x14161b)); mir.position.set(sx * 1.08, 1.02, -1.15); g.add(mir); }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.02), mat(0xe8e8d8)); plate.position.set(0, 0.55, 2.46); g.add(plate);
  return g;
}
function taxiSign() { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.4), mat(0xffd23a, { emissive: 0xffd23a, emissiveIntensity: 1.4 })); s.position.set(0, 1.66, -0.15); return s; }
function buildSpecial(kind, color) {
  const g = new THREE.Group(); const paint = mat(color);
  if (kind === 'sports') { // low, wide, winged
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 4.7), paint); body.position.y = 0.5; body.castShadow = true; g.add(body);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1.2, 1.4, 4), paint); nose.rotation.x = -Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.position.set(0, 0.5, -3.0); g.add(nose);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 1.9), mat(0x0c1018)); cab.position.set(0, 0.9, 0.2); g.add(cab);
    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), paint); cap2.position.set(0, 1.14, 0.25); g.add(cap2);
    for (const sx of [-0.85, 0.85]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), paint); post.position.set(sx, 0.9, 2.05); g.add(post); }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.55), paint); wing.position.set(0, 1.12, 2.05); g.add(wing);
    g.userData.wheels = [];
    for (const sz of [-1.55, 1.5]) for (const sx of [-1.05, 1.05]) { const wg = new THREE.Group(); wg.position.set(sx, 0.4, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.34, 16), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; wg.add(t2); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 8), mat(0xd8b04a)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
    const hl2 = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.1), hl2); l.position.set(sx, 0.56, -2.4); g.add(l); }
  } else if (kind === 'bike') { // motorcycle: narrow frame, two inline wheels, a rider hunched over the bars
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 1.9), paint); frame.position.y = 0.72; frame.castShadow = true; g.add(frame);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), paint); tank.position.set(0, 0.92, -0.35); tank.scale.set(0.8, 0.7, 1.3); g.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.7), mat(0x16161c)); seat.position.set(0, 0.94, 0.42); g.add(seat);
    const forks = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 8), mat(0xc4c9d1)); forks.position.set(0, 0.72, -0.95); forks.rotation.x = 0.4; g.add(forks);
    const bars = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.05), mat(0x2a2e36)); bars.position.set(0, 1.12, -0.82); g.add(bars);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8), mat(0xb8c0ca)); pipe.rotation.x = Math.PI / 2; pipe.position.set(0.2, 0.5, 0.4); g.add(pipe);
    g.userData.wheels = [];
    for (const sz of [-0.98, 0.95]) { const wg = new THREE.Group(); wg.position.set(0, 0.42, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.13, 16), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; t2.castShadow = true; wg.add(t2); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.15, 8), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
    const hl3 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.6 })); hl3.position.set(0, 0.98, -1.12); g.add(hl3);
    const tl3 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 })); tl3.position.set(0, 0.82, 1.05); g.add(tl3);
    const rider = new THREE.Group();
    const rTor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.3), mat(pick(SHIRTS))); rTor.rotation.x = 0.5; rider.add(rTor);
    const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0x16161c)); rHead.position.set(0, 0.38, -0.18); rider.add(rHead); // helmet
    const rLegL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.14), mat(pick(PANTS))); rLegL.position.set(-0.2, -0.38, 0.05); rider.add(rLegL);
    const rLegR = rLegL.clone(); rLegR.position.x = 0.2; rider.add(rLegR);
    rider.position.set(0, 1.28, 0.3); rider.visible = false; g.add(rider); g.userData.driver = rider;
  } else if (kind === 'bus') { // city bus: long body, window band, route sign
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.9, 9.4), paint); body.position.y = 1.45; body.castShadow = true; g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.62, 8.6), mat(0x0e1622, { emissive: 0x2a3c55, emissiveIntensity: 0.5, transparent: true, opacity: 0.9 })); band.position.set(0, 1.86, 0.1); g.add(band);
    const winShield = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.1), mat(0x0c1018, { transparent: true, opacity: 0.7 })); winShield.position.set(0, 1.8, -4.66); g.add(winShield);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.06), mat(0x141414, { emissive: 0xffb020, emissiveIntensity: 1.6 })); sign.position.set(0, 2.55, -4.62); g.add(sign);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 1.1), mat(0x10141c)); door.position.set(1.26, 1.1, -2.9); g.add(door);
    const skirt2 = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.4, 9.2), mat(0x15171c)); skirt2.position.y = 0.42; g.add(skirt2);
    g.userData.wheels = [];
    for (const sz of [-3.1, 3.1]) for (const sx of [-1.16, 1.16]) { const wg = new THREE.Group(); wg.position.set(sx, 0.5, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 16), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; t2.castShadow = true; wg.add(t2); g.add(wg); g.userData.wheels.push(wg); }
    const hl4 = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.85, 0.85]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.1), hl4); l.position.set(sx, 0.9, -4.72); g.add(l); }
    const tl4 = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 }); for (const sx of [-0.9, 0.9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.1), tl4); l.position.set(sx, 1.0, 4.72); g.add(l); }
    // a driver + a few silhouetted passengers in the window band
    const drv2 = new THREE.Group(); const dT = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.32), mat(pick(SHIRTS))); drv2.add(dT); const dH = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8), skinMat(pick(SKIN))); dH.position.y = 0.46; drv2.add(dH);
    drv2.position.set(0.7, 1.5, -4.0); drv2.visible = false; g.add(drv2); g.userData.driver = drv2;
    for (let i = 0; i < 4; i++) { if (Math.random() < 0.6) { const pas = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(0x0a0d13)); pas.position.set(Math.random() < 0.5 ? -0.8 : 0.8, 1.95, -3 + i * 1.8); g.add(pas); } }
  } else { // monster: lifted body on comically big wheels
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.2), paint); body.position.y = 1.75; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.8), paint); cab.position.set(0, 2.35, -0.3); g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.5, 1.84), mat(0x0c1018)); glass.position.set(0, 2.35, -0.3); g.add(glass);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.14), mat(0x2a2e36)); bar.position.set(0, 2.8, 0.7); g.add(bar);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xfff0b0, { emissive: 0xffe6a0, emissiveIntensity: 2 })); s.position.set(-0.75 + i * 0.5, 2.88, 0.7); g.add(s); }
    g.userData.wheels = [];
    for (const sz of [-1.5, 1.5]) for (const sx of [-1.25, 1.25]) { const wg = new THREE.Group(); wg.position.set(sx, 0.95, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 18), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; t2.castShadow = true; wg.add(t2); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.62, 10), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Planar ground reflection — a mirrored camera renders the world above into a
// render target, projected back onto a wet ground plane that follows the
// player and BLENDS over the textured asphalt via a Fresnel + wetness term.
// ---------------------------------------------------------------------------
