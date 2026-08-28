/* The jump plane and the extraction helicopter. Built from primitives, animated
 * in code — rotors spin, gear sways, lights blink. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { materials, glowSprite } from '../gfx/materials.js';
import { mergeGeometries } from './flora.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Twin-engine drop plane with an open rear ramp. */
export function makePlane() {
  const M = materials();
  const g = new THREE.Group();

  const fuse = new THREE.CylinderGeometry(1.55, 1.15, 15.5, 16, 1, false);
  fuse.rotateX(Math.PI / 2);
  const nose = new THREE.SphereGeometry(1.55, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  nose.rotateX(-Math.PI / 2);
  nose.scale(1, 1, 1.5);
  nose.translate(0, 0, 7.75);
  const tailCone = new THREE.ConeGeometry(1.15, 4.2, 14);
  tailCone.rotateX(-Math.PI / 2);
  tailCone.translate(0, 0.35, -9.6);
  const body = mergeGeometries([fuse, nose, tailCone]);
  const bodyMesh = new THREE.Mesh(body, M.metal);
  bodyMesh.castShadow = true;
  g.add(bodyMesh);

  const wing = new THREE.BoxGeometry(21, 0.42, 3.2, 4, 1, 2);
  taper(wing, 21, 0.34);
  wing.translate(0, 1.15, 0.6);
  const tailPlane = new THREE.BoxGeometry(7.4, 0.3, 1.7);
  taper(tailPlane, 7.4, 0.4);
  tailPlane.translate(0, 1.5, -10.3);
  const fin = new THREE.BoxGeometry(0.34, 3.6, 2.4);
  fin.translate(0, 3.1, -10.2);
  g.add(new THREE.Mesh(mergeGeometries([wing, tailPlane, fin]), M.metal));

  const props = [];
  for (const x of [-4.6, 4.6]) {
    const nac = new THREE.CylinderGeometry(0.72, 0.6, 3.6, 12);
    nac.rotateX(Math.PI / 2);
    nac.translate(x, 1.15, 1.5);
    g.add(new THREE.Mesh(nac, M.metal));
    const hub = new THREE.Group();
    hub.position.set(x, 1.15, 3.4);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.BoxGeometry(0.22, 3.1, 0.09);
      blade.translate(0, 1.55, 0);
      const m = new THREE.Mesh(blade, M.metalWarm);
      m.rotation.z = (i / 4) * Math.PI * 2;
      hub.add(m);
    }
    g.add(hub);
    props.push(hub);
  }

  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), M.glass);
  glass.rotation.x = -Math.PI / 2 + 0.2;
  glass.position.set(0, 0.75, 7.0);
  glass.scale.set(1, 1, 1.15);
  g.add(glass);

  // open rear ramp — where the team jumps from
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 3.6), M.metal);
  ramp.position.set(0, -0.85, -8.2);
  ramp.rotation.x = -0.55;
  g.add(ramp);

  g.userData.props = props;
  g.userData.update = (dt) => { for (const p of props) p.rotation.z += dt * 34; };
  return g;
}

function taper(geo, span, tipScale) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = Math.abs(v.x) / (span * 0.5);
    v.z *= THREE.MathUtils.lerp(1, tipScale, k);
    v.y *= THREE.MathUtils.lerp(1, tipScale + 0.2, k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
}

/** Extraction helicopter: main rotor, tail rotor, skids, beacon. */
export function makeHelicopter() {
  const M = materials();
  const g = new THREE.Group();

  const cabin = new THREE.SphereGeometry(1.75, 18, 12);
  cabin.scale(1.0, 0.92, 1.5);
  cabin.translate(0, 1.9, 0.6);
  const boom = new THREE.CylinderGeometry(0.44, 0.24, 7.2, 12);
  boom.rotateX(Math.PI / 2);
  boom.translate(0, 2.2, -4.2);
  const fin = new THREE.BoxGeometry(0.2, 1.7, 1.1);
  fin.translate(0, 2.9, -7.3);
  const stab = new THREE.BoxGeometry(2.7, 0.16, 0.7);
  stab.translate(0, 2.5, -6.9);
  const bodyMesh = new THREE.Mesh(mergeGeometries([cabin, boom, fin, stab]), M.metalWarm);
  bodyMesh.castShadow = true;
  g.add(bodyMesh);

  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M.glass);
  glass.rotation.x = -Math.PI / 2 + 0.35;
  glass.position.set(0, 1.95, 1.55);
  glass.scale.set(1, 1, 1.1);
  g.add(glass);

  const skids = [];
  for (const x of [-1.25, 1.25]) {
    const rail = new THREE.CylinderGeometry(0.09, 0.09, 4.4, 8);
    rail.rotateX(Math.PI / 2);
    rail.translate(x, 0.12, 0.4);
    skids.push(rail);
    for (const z of [-1.1, 1.4]) {
      const leg = new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6);
      leg.translate(x * 0.85, 0.66, z);
      skids.push(leg);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(skids), M.metal));

  const rotor = new THREE.Group();
  rotor.position.set(0, 3.35, 0.4);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.8, 8), M.metal);
  mast.position.y = -0.35;
  rotor.add(mast);
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.09, 0.44), M.metal);
    blade.position.x = 4.7;
    const arm = new THREE.Group();
    arm.rotation.y = (i / 5) * Math.PI * 2;
    arm.add(blade);
    rotor.add(arm);
  }
  g.add(rotor);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.35, 2.9, -7.3);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.9, 0.22), M.metal);
    blade.position.y = 0.95;
    const arm = new THREE.Group();
    arm.rotation.z = (i / 3) * Math.PI * 2;
    arm.add(blade);
    tailRotor.add(arm);
  }
  g.add(tailRotor);

  const beacon = new THREE.Sprite(glowSprite([1, 0.2, 0.18], 64));
  beacon.scale.setScalar(0.8);
  beacon.position.set(0, 3.6, -3.4);
  g.add(beacon);

  const light = new THREE.PointLight(0xfff0d0, 0, 26, 2);
  light.position.set(0, 1.4, 2.2);
  g.add(light);

  g.userData.update = (dt, t, landed) => {
    rotor.rotation.y += dt * (landed ? 22 : 34);
    tailRotor.rotation.z += dt * (landed ? 34 : 52);
    beacon.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 3.1));
    light.intensity = landed ? 14 : 6;
  };
  return g;
}

/** Hangar shell for the airfield. */
export function makeHangar() {
  const M = materials();
  const g = new THREE.Group();
  const shell = new THREE.CylinderGeometry(13, 13, 34, 26, 1, true, 0, Math.PI);
  shell.rotateZ(Math.PI / 2);
  shell.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(shell, M.metal);
  mesh.material = M.metal.clone();
  mesh.material.side = THREE.DoubleSide;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  const back = new THREE.Mesh(new THREE.CircleGeometry(13, 26, 0, Math.PI), M.metal);
  back.rotation.z = Math.PI;
  back.position.z = -17;
  back.rotation.y = Math.PI;
  g.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), M.rockProp);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.receiveShadow = true;
  g.add(floor);
  return g;
}
