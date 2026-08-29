/* The ocean around the island and the shallow lagoon over the sand shelf. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { waterMaterial } from '../gfx/materials.js';
import { WORLD } from '../../shared/constants.js';

export class Water {
  constructor(scene) {
    const geo = new THREE.RingGeometry(1, WORLD.beachRadius * 3.4, 96, 40);
    geo.rotateX(-Math.PI / 2);
    this.material = waterMaterial();
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = WORLD.seaLevel;
    this.mesh.renderOrder = 6;
    this.mesh.receiveShadow = false;
    scene.add(this.mesh);
    this.scene = scene;
  }
  update(camX, camZ) { this.mesh.position.x = camX; this.mesh.position.z = camZ; }
  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.material.dispose(); }
}
