// Gun architecture. Every gun is built from the same kit and exposes the same contract:
//   userData.muzzle / eject     — where shots and shells come from
//   userData.rightGrip          — the trigger-hand grip (right hand is IK'd here)
//   userData.leftGrip           — the support-hand grip (left hand is IK'd here when two-handed / aiming)
//   userData.parts              — moving parts the arsenal animates (pump, cylinder, mag, coils, rings...)
// plus a GUN_FEEL entry (recoil pitch / travel / roll / return time) and an optional SIZE profile
// that enlarges body + barrel for third-person readability while keeping stock length and trigger reach.
// Adding a gun = a WEAPONS def + a GUN_BUILDERS entry + a GUN_FEEL entry.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { BUILD } from '../build.js';

export const GUN_FEEL = {
  revolver: { pitch: 0.26, travel: 0.075, roll: 0.025, returnTime: 0.22 },
  rifle: { pitch: 0.14, travel: 0.065, roll: 0.025, returnTime: 0.14 },
  shotgun: { pitch: 0.36, travel: 0.14, roll: 0.035, returnTime: 0.32 },
  rail: { pitch: 0.42, travel: 0.17, roll: 0.03, returnTime: 0.4 },
  gravity: { pitch: 0.3, travel: 0.12, roll: 0.04, returnTime: 0.3 },
  smg: { pitch: 0.1, travel: 0.05, roll: 0.03, returnTime: 0.1 },
  launcher: { pitch: 0.4, travel: 0.16, roll: 0.03, returnTime: 0.42 },
  minigun: { pitch: 0.05, travel: 0.03, roll: 0.012, returnTime: 0.08 },
  beam: { pitch: 0.03, travel: 0.02, roll: 0.01, returnTime: 0.1 },
  arc: { pitch: 0.2, travel: 0.09, roll: 0.03, returnTime: 0.24 },
};
// [width, height, front] growth for third-person readability
const SIZE = {
  shotgun: [1.5, 1.4, 1.65], rifle: [1.45, 1.35, 1.6], rail: [1.7, 1.5, 2], gravity: [1.85, 1.6, 1.85],
  smg: [1.45, 1.35, 1.5], launcher: [1.6, 1.5, 1.7], minigun: [1.6, 1.5, 1.6], beam: [1.55, 1.45, 1.75], arc: [1.6, 1.5, 1.7],
};

function makeKit(m) {
  const root = new THREE.Group(), parts = {}, segs = BUILD.fast ? 12 : 20;
  const k = {
    m, root, parts,
    box(parent, size, pos, mat, r = 0.012) {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, BUILD.fast ? 1 : 2, Math.min(r, ...size.map((v) => v * 0.4))), mat);
      mesh.position.set(...pos); parent.add(mesh); return mesh;
    },
    barrel(parent, radius, length, pos, mat, seg = segs) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, seg), mat);
      mesh.rotation.x = Math.PI / 2; mesh.position.set(...pos); parent.add(mesh); return mesh;
    },
    cone(parent, r0, r1, length, pos, mat, open = false) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, length, segs, 1, open), mat);
      mesh.rotation.x = Math.PI / 2; mesh.position.set(...pos); parent.add(mesh); return mesh;
    },
    ring(parent, radius, tube, pos, mat, arc = Math.PI * 2) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 24, arc), mat);
      mesh.position.set(...pos); parent.add(mesh); return mesh;
    },
    marker(name, parent, pos) { const o = new THREE.Object3D(); o.name = name; o.position.set(...pos); parent.add(o); return o; },
    group(parent, pos) { const g = new THREE.Group(); g.position.set(...pos); parent.add(g); return g; },
    // shared receiver: body, colored top plate, pistol grip, stock, trigger guard
    receiver(palette, o = {}) {
      const { len = 0.23, stock = true } = o;
      k.box(root, [0.085, 0.105, len], [0, 0.005, -0.025], m.gun, 0.016);
      k.box(root, [0.087, 0.027, len * 0.78], [0, 0.057, -0.012], palette, 0.009);
      const handle = k.box(root, [0.052, 0.13, 0.061], [0, -0.1, -0.078], m.grip, 0.016); handle.rotation.x = 0.22;
      if (stock) {
        const st = k.box(root, [0.057, 0.068, 0.16], [-0.025, -0.01, -0.205], palette, 0.015); st.rotation.y = 0.13;
        k.box(root, [0.07, 0.098, 0.028], [-0.036, -0.02, -0.295], m.dark, 0.008);
      }
      const guard = k.ring(root, 0.036, 0.006, [0, -0.056, -0.018], m.steel, Math.PI * 1.65); guard.rotation.y = Math.PI / 2;
      k.box(root, [0.01, 0.03, 0.012], [0, -0.044, -0.018], m.steel, 0.003);
      return k.marker('right-grip', root, [0, -0.104, -0.066]);
    },
  };
  return k;
}

export const GUN_BUILDERS = {
  revolver(k) {
    const { m, root, parts } = k;
    const handle = k.box(root, [0.058, 0.115, 0.075], [0, -0.087, -0.055], m.grip, 0.024); handle.rotation.x = 0.25;
    k.box(root, [0.065, 0.075, 0.15], [0, -0.005, -0.015], m.gun); k.box(root, [0.04, 0.018, 0.23], [0, 0.047, 0.13], m.steel, 0.006);
    parts.cyl = k.group(root, [0, 0.012, 0.02]); k.barrel(parts.cyl, 0.049, 0.078, [0, 0, 0], m.steel);
    for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; k.barrel(parts.cyl, 0.009, 0.082, [Math.cos(a) * 0.032, Math.sin(a) * 0.032, 0], m.dark, 8); }
    k.barrel(root, 0.022, 0.235, [0, 0.017, 0.19], m.steel); k.barrel(root, 0.011, 0.17, [0, -0.026, 0.16], m.gun); k.barrel(root, 0.027, 0.026, [0, 0.017, 0.314], m.dark);
    k.box(root, [0.008, 0.018, 0.025], [0, 0.059, 0.29], m.glowPink, 0.003); k.box(root, [0.043, 0.018, 0.023], [0, 0.058, -0.075], m.dark, 0.004);
    const guard = k.ring(root, 0.033, 0.006, [0, -0.055, 0.01], m.steel, Math.PI * 1.65); guard.rotation.y = Math.PI / 2;
    k.box(root, [0.009, 0.031, 0.012], [0, -0.043, 0.01], m.steel, 0.003); k.box(root, [0.055, 0.018, 0.03], [0, 0.034, -0.096], m.gun, 0.003);
    return { muzzle: [0, 0.017, 0.332], eject: [0.05, 0.015, 0.02], rightGrip: k.marker('right-grip', root, [0, -0.09, -0.045]), leftGrip: k.marker('support-grip', root, [0.055, -0.1, -0.068]) };
  },
  shotgun(k) {
    const { m, root, parts } = k, pal = m.yellow;
    const rightGrip = k.receiver(pal);
    k.barrel(root, 0.024, 0.41, [0, 0.027, 0.24], m.steel); k.barrel(root, 0.018, 0.31, [0, -0.027, 0.19], m.dark); k.barrel(root, 0.03, 0.035, [0, 0.027, 0.462], m.dark);
    parts.pump = k.group(root, [0, -0.026, 0.17]); parts.pump.userData.restZ = 0.17;
    k.box(parts.pump, [0.085, 0.06, 0.15], [0, 0, 0], pal, 0.018);
    for (let n = 0; n < 6; n++) k.box(parts.pump, [0.087, 0.009, 0.008], [0, 0, -0.055 + n * 0.023], m.dark, 0.002);
    for (let n = 0; n < 3; n++) k.barrel(root, 0.012, 0.05, [0.055, 0.015 - n * 0.025, -0.04], m.red, 8);
    k.box(root, [0.009, 0.022, 0.022], [0, 0.061, 0.427], m.glowYellow, 0.003);
    return { muzzle: [0, 0.027, 0.487], eject: [0.052, 0.018, -0.01], rightGrip, leftGrip: k.marker('support-grip', parts.pump, [0.037, -0.035, -0.055]) };
  },
  rifle(k) {
    const { m, root, parts } = k, pal = m.white;
    const rightGrip = k.receiver(pal);
    k.box(root, [0.075, 0.078, 0.25], [0, 0.018, 0.2], pal, 0.014);
    for (let n = 0; n < 6; n++) { k.box(root, [0.078, 0.009, 0.012], [0, 0.052, 0.1 + n * 0.034], m.dark, 0.003); k.box(root, [0.079, 0.014, 0.018], [0, 0.01, 0.1 + n * 0.034], m.dark, 0.003); }
    k.barrel(root, 0.017, 0.17, [0, 0.023, 0.38], m.steel); k.barrel(root, 0.026, 0.045, [0, 0.023, 0.478], m.dark);
    parts.mag = k.group(root, [0, -0.07, 0.035]); k.box(parts.mag, [0.045, 0.105, 0.068], [0, -0.042, 0.005], m.dark, 0.009);
    const tip = k.box(parts.mag, [0.045, 0.055, 0.06], [0, -0.112, 0.018], m.dark, 0.008); tip.rotation.x = -0.15;
    k.box(root, [0.042, 0.025, 0.065], [0, 0.083, -0.02], m.dark, 0.007);
    parts.ring = k.ring(root, 0.019, 0.004, [0, 0.111, -0.005], m.glowCyan);
    k.box(root, [0.035, 0.012, 0.14], [0, -0.028, 0.21], m.dark, 0.004);
    return { muzzle: [0, 0.023, 0.505], eject: [0.052, 0.018, -0.01], rightGrip, leftGrip: k.marker('support-grip', root, [0.035, -0.046, 0.075]) };
  },
  rail(k) {
    const { m, root, parts } = k;
    const rightGrip = k.receiver(m.white);
    parts.coils = [];
    for (const x of [-0.047, 0.047]) k.box(root, [0.022, 0.035, 0.39], [x, 0.025, 0.26], m.steel, 0.004);
    for (let n = 0; n < 6; n++) parts.coils.push(k.ring(root, 0.059, 0.01, [0, 0.026, 0.12 + n * 0.062], m.glowCyan.clone()));
    k.barrel(root, 0.031, 0.17, [0, 0.099, -0.02], m.dark); k.barrel(root, 0.024, 0.012, [0, 0.099, 0.072], m.glowCyan); k.box(root, [0.08, 0.045, 0.1], [0, -0.07, 0.07], m.glowCyan, 0.009);
    return { muzzle: [0, 0.025, 0.488], eject: [0.052, 0.018, -0.01], rightGrip, leftGrip: k.marker('support-grip', root, [0.035, -0.065, 0.07]) };
  },
  gravity(k) {
    const { m, root, parts } = k;
    const rightGrip = k.receiver(m.red);
    k.box(root, [0.135, 0.145, 0.17], [0, 0.012, 0.06], m.gun, 0.034); parts.rings = [];
    for (let n = 0; n < 3; n++) parts.rings.push(k.ring(root, 0.09 + n * 0.012, 0.012, [0, 0.025, 0.16 + n * 0.06], m.glowPurple));
    parts.core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), m.glowPurple); parts.core.position.set(0, 0.025, 0.18); root.add(parts.core);
    for (const x of [-0.095, 0.095]) k.box(root, [0.025, 0.035, 0.22], [x, 0.025, 0.24], m.steel, 0.008);
    return { muzzle: [0, 0.025, 0.36], eject: [0.052, 0.018, -0.01], rightGrip, leftGrip: k.marker('support-grip', root, [0.045, -0.07, 0.075]) };
  },
  // AD-BREAK SMG: compact pink-and-chrome receiver, shrouded barrel, straight mag, vertical foregrip, red-dot
  smg(k) {
    const { m, root, parts } = k, pal = m.pink || m.red;
    const rightGrip = k.receiver(pal, { len: 0.2, stock: false });
    k.box(root, [0.07, 0.03, 0.12], [-0.02, 0.0, -0.17], m.dark, 0.008); // folded stock bar
    const shroud = k.barrel(root, 0.03, 0.17, [0, 0.025, 0.15], m.dark);
    for (let n = 0; n < 5; n++) k.box(root, [0.064, 0.008, 0.012], [0, 0.056, 0.09 + n * 0.028], pal, 0.002);
    k.barrel(root, 0.014, 0.08, [0, 0.025, 0.27], m.steel); k.barrel(root, 0.02, 0.03, [0, 0.025, 0.31], m.dark);
    parts.mag = k.group(root, [0, -0.06, 0.02]);
    k.box(parts.mag, [0.04, 0.17, 0.05], [0, -0.075, 0], m.dark, 0.008);
    k.box(parts.mag, [0.042, 0.02, 0.052], [0, -0.16, 0], pal, 0.004);
    const fg = k.box(root, [0.035, 0.09, 0.035], [0, -0.06, 0.15], m.grip, 0.01); fg.rotation.x = -0.1;
    k.box(root, [0.035, 0.03, 0.05], [0, 0.085, 0.0], m.dark, 0.006);
    parts.ring = k.ring(root, 0.014, 0.003, [0, 0.11, 0.0], m.glowPink);
    k.box(root, [0.075, 0.012, 0.09], [0, -0.03, 0.06], m.glowPink, 0.003);
    shroud.userData.vent = true;
    return { muzzle: [0, 0.025, 0.33], eject: [0.05, 0.02, 0.0], rightGrip, leftGrip: k.marker('support-grip', root, [0.0, -0.11, 0.15]) };
  },
  // CONFETTI CANNON: chunky striped drum launcher with a flared party-horn muzzle and a top carry handle
  launcher(k) {
    const { m, root, parts } = k;
    const rightGrip = k.receiver(m.yellow, { len: 0.22 });
    parts.spin = k.group(root, [0, 0.02, 0.08]);
    k.barrel(parts.spin, 0.085, 0.13, [0, 0, 0], m.white);
    for (let n = 0; n < 6; n++) { const a = n / 6 * Math.PI * 2; k.barrel(parts.spin, 0.022, 0.135, [Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0], n % 2 ? m.red : m.yellow, 10); }
    k.barrel(root, 0.05, 0.22, [0, 0.03, 0.25], m.gun);
    for (let n = 0; n < 4; n++) k.ring(root, 0.052, 0.008, [0, 0.03, 0.17 + n * 0.05], n % 2 ? m.glowPink : m.glowYellow);
    k.cone(root, 0.05, 0.09, 0.08, [0, 0.03, 0.39], m.yellow, true).material = m.yellow;
    const handle = k.box(root, [0.03, 0.025, 0.16], [0, 0.135, 0.06], m.dark, 0.008);
    for (const z of [-0.01, 0.13]) k.box(root, [0.025, 0.06, 0.02], [0, 0.105, z], m.dark, 0.006);
    handle.userData.handle = true;
    return { muzzle: [0, 0.03, 0.43], eject: [0.06, 0.03, 0.05], rightGrip, leftGrip: k.marker('support-grip', root, [0.04, -0.06, 0.22]) };
  },
  // PRIME-TIME SPOTLIGHT: a theatre spotlight with cooling fins, barn doors and a hot cyan lens
  beam(k) {
    const { m, root, parts } = k;
    const rightGrip = k.receiver(m.white, { len: 0.2 });
    k.barrel(root, 0.075, 0.24, [0, 0.03, 0.17], m.gun);
    for (let n = 0; n < 7; n++) k.ring(root, 0.08, 0.012, [0, 0.03, 0.07 + n * 0.03], m.dark);
    k.barrel(root, 0.09, 0.03, [0, 0.03, 0.3], m.steel);
    parts.lens = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), m.glowCyan); parts.lens.position.set(0, 0.03, 0.316); root.add(parts.lens);
    for (let n = 0; n < 4; n++) { const door = new THREE.Group(); door.position.set(0, 0.03, 0.315); door.rotation.z = n * Math.PI / 2; root.add(door); const flap = k.box(door, [0.12, 0.006, 0.07], [0, 0.095, 0.03], m.dark, 0.002); flap.rotation.x = -0.5; }
    k.box(root, [0.03, 0.03, 0.18], [0, 0.125, 0.12], m.steel, 0.006);
    for (const z of [0.05, 0.19]) k.box(root, [0.025, 0.04, 0.02], [0, 0.1, z], m.dark, 0.005);
    return { muzzle: [0, 0.03, 0.34], eject: [0.06, 0.03, 0.05], rightGrip, leftGrip: k.marker('support-grip', root, [0.05, -0.05, 0.16]) };
  },
  // ARC CASTER: copper coil stack, three tesla prongs and a crackling glass capacitor
  arc(k) {
    const { m, root, parts } = k;
    const rightGrip = k.receiver(m.dark, { len: 0.22 });
    const copper = m.brass;
    parts.coils = [];
    for (let n = 0; n < 5; n++) parts.coils.push(k.ring(root, 0.05, 0.016, [0, 0.03, 0.1 + n * 0.035], copper));
    k.barrel(root, 0.03, 0.2, [0, 0.03, 0.17], m.steel);
    for (let n = 0; n < 3; n++) { const a = n / 3 * Math.PI * 2 + Math.PI / 2; const prong = k.box(root, [0.012, 0.012, 0.12], [Math.cos(a) * 0.05, 0.03 + Math.sin(a) * 0.05, 0.31], copper, 0.004); prong.rotation.set(Math.sin(a) * 0.25, -Math.cos(a) * 0.25, 0); }
    parts.core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), m.glowCyan); parts.core.position.set(0, 0.03, 0.35); root.add(parts.core);
    const cap = k.barrel(root, 0.03, 0.09, [0, 0.105, 0.02], new THREE.MeshStandardMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.5, roughness: 0.1, metalness: 0 }));
    cap.rotation.z = 0;
    k.box(root, [0.02, 0.02, 0.1], [0, 0.105, 0.02], m.glowCyan, 0.004);
    return { muzzle: [0, 0.03, 0.37], eject: [0.06, 0.03, 0.05], rightGrip, leftGrip: k.marker('support-grip', root, [0.04, -0.05, 0.15]) };
  },
};

// Build a gun from its builder, apply the readability size profile, and publish the contract.
export function buildGun(id, m) {
  const k = makeKit(m), spec = GUN_BUILDERS[id](k), root = k.root;
  const muzzle = k.marker('muzzle', root, spec.muzzle), eject = k.marker('eject', root, spec.eject);
  const size = SIZE[id];
  if (size) {
    const [width, height, front] = size, gy = spec.rightGrip.position.y;
    const grow = (v) => { v.x *= width; v.y = gy + (v.y - gy) * height; if (v.z > 0) v.z *= front; return v; };
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4(), v = new THREE.Vector3();
    root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      inv.copy(mesh.matrixWorld).invert();
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); grow(v).applyMatrix4(inv); pos.setXYZ(i, v.x, v.y, v.z); }
      pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
    });
    for (const point of [muzzle, eject, spec.rightGrip, spec.leftGrip]) { const wp = grow(point.getWorldPosition(new THREE.Vector3())); point.position.copy(point.parent.worldToLocal(wp)); }
  }
  root.userData = { parts: k.parts, muzzle, eject, rightGrip: spec.rightGrip, leftGrip: spec.leftGrip, weaponId: id };
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}
