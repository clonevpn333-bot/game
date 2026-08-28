/* The airfield: hangar, apron, the plane waiting, crates and a noticeboard.
 * This is the lobby you stand in before the run. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { makeHangar, makePlane } from '../world/vehicles.js';
import { materials } from '../gfx/materials.js';
import { propGeo, Fire } from '../world/props.js';
import { flora } from '../world/flora.js';
import { rng } from '../../shared/rng.js';

export class Airfield {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    const M = materials();
    const P = propGeo();

    const ground = new THREE.Mesh(new THREE.CircleGeometry(150, 64), M.sandProp);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const apron = new THREE.Mesh(new THREE.PlaneGeometry(64, 120), M.rockProp);
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(6, 0.01, -10);
    apron.receiveShadow = true;
    this.group.add(apron);

    const hangar = makeHangar();
    hangar.position.set(-24, 0, 4);
    hangar.rotation.y = Math.PI * 0.5;
    this.group.add(hangar);

    this.plane = makePlane();
    this.plane.position.set(16, 2.4, -14);
    this.plane.rotation.y = -0.5;
    this.group.add(this.plane);

    // noticeboard
    const board = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.12), M.wood);
    panel.position.y = 1.9;
    panel.castShadow = true;
    const legs = new THREE.Group();
    for (const x of [-1.3, 1.3]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.9, 8), M.wood);
      l.position.set(x, 0.95, 0);
      legs.add(l);
    }
    board.add(panel, legs);
    board.position.set(-6, 0, 8);
    board.rotation.y = 0.5;
    this.group.add(board);

    // scattered crates and luggage waiting to be loaded
    const r = rng(9091);
    for (let i = 0; i < 14; i++) {
      const kind = r() < 0.55 ? 'crate' : 'luggage';
      const geo = kind === 'crate' ? P.crate : P.luggage;
      const m = new THREE.Mesh(geo.geo, geo.mat);
      const extra = new THREE.Mesh(kind === 'crate' ? P.crate.bands.geo : P.luggage.straps.geo,
        kind === 'crate' ? P.crate.bands.mat : P.luggage.straps.mat);
      m.castShadow = extra.castShadow = true;
      m.receiveShadow = true;
      const g = new THREE.Group();
      g.add(m, extra);
      g.position.set(-4 + r() * 26, 0, -22 + r() * 34);
      g.rotation.y = r() * 6.28;
      this.group.add(g);
    }

    // a few palms around the strip so it reads as an island field
    const F = flora();
    const palms = new THREE.InstancedMesh(F.palm.parts[0].geo, F.palm.parts[0].mat, 18);
    const fronds = new THREE.InstancedMesh(F.palm.parts[1].geo, F.palm.parts[1].mat, 18);
    palms.castShadow = fronds.castShadow = true;
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + r() * 0.3;
      const rad = 62 + r() * 42;
      m4.makeRotationY(r() * 6.28);
      m4.setPosition(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      palms.setMatrixAt(i, m4);
      fronds.setMatrixAt(i, m4);
    }
    this.group.add(palms, fronds);

    this.fire = new Fire(scene, 0.9);
    this.fire.group.position.set(2, 0.1, 12);
    const stones = new THREE.Mesh(P.campfire.geo, P.campfire.mat);
    stones.position.copy(this.fire.group.position);
    stones.receiveShadow = true;
    this.group.add(stones);

    scene.add(this.group);
  }

  update(dt) {
    this.plane.userData.update?.(dt * 0.15);
    this.fire.update(dt);
  }

  setVisible(v) { this.group.visible = v; this.fire.group.visible = v; }
  dispose() { this.scene.remove(this.group); this.fire.dispose(); }
}
