// ============================================================================
//  First-person view model: the player's arm + currently held item, with
//  idle/walk bobbing and a swing animation on use/attack.
// ============================================================================
import * as THREE from 'three';
import { getBlock, RENDER } from './blocks.js';
import { itemDef } from './items.js';

export class ViewModel {
  constructor(camera, atlasTexture, uvs) {
    this.camera = camera;
    this.tex = atlasTexture;
    this.uvs = uvs;
    this.root = new THREE.Group();
    this.root.frustumCulled = false;
    camera.add(this.root);

    // arm (skin-colored box), pivoting from the lower-right of the screen
    const armGeo = new THREE.BoxGeometry(0.16, 0.55, 0.16);
    armGeo.translate(0, -0.27, 0);
    this.armMat = new THREE.MeshBasicMaterial({ color: 0xe0a578 });
    this.armBase = new THREE.Color(0xe0a578);
    this.arm = new THREE.Mesh(armGeo, this.armMat);
    this.arm.frustumCulled = false;
    this.arm.position.set(0.42, -0.35, -0.55);
    this.arm.rotation.set(-0.25, -0.2, -0.35);
    this.root.add(this.arm);

    // held item holder
    this.holder = new THREE.Group();
    this.holder.position.set(0.5, -0.45, -0.7);
    this.root.add(this.holder);
    this.held = null;
    this.heldId = -2;

    this.bob = 0;
    this.swing = 0;          // 0..1 animation progress
    this.swinging = false;
  }

  triggerSwing() { if (!this.swinging) { this.swinging = true; this.swing = 0; } }

  _uv(name) { return this.uvs.get(name) || [0, 0, 1, 1]; }

  _makeHeldBlock(blockId) {
    const b = getBlock(blockId);
    const g = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const uvAttr = g.attributes.uv;
    const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    for (let f = 0; f < 6; f++) {
      const name = b.tex ? b.tex[order[f]] : null;
      const uv = this._uv(name);
      const i = f * 4;
      uvAttr.setXY(i + 0, uv[0], uv[1]);
      uvAttr.setXY(i + 1, uv[2], uv[1]);
      uvAttr.setXY(i + 2, uv[0], uv[3]);
      uvAttr.setXY(i + 3, uv[2], uv[3]);
    }
    uvAttr.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5 });
    const mesh = new THREE.Mesh(g, mat);
    mesh.rotation.set(0.1, -0.5, 0.0);
    return mesh;
  }

  _makeFlatItem(itemId) {
    const d = itemDef(itemId);
    let name = d && d.icon; if (!name && d && d.isBlock) name = getBlock(d.blockId).tex?.pz;
    const uv = this._uv(name);
    const g = new THREE.PlaneGeometry(0.42, 0.42);
    const u = g.attributes.uv;
    u.setXY(0, uv[0], uv[1]); u.setXY(1, uv[2], uv[1]); u.setXY(2, uv[0], uv[3]); u.setXY(3, uv[2], uv[3]);
    u.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.4, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, mat);
    mesh.rotation.set(0, -0.5, 0.6);
    return mesh;
  }

  setHeld(itemId) {
    if (itemId === this.heldId) return;
    this.heldId = itemId;
    if (this.held) { this.holder.remove(this.held); this.held.geometry.dispose(); this.held.material.dispose(); this.held = null; }
    if (itemId == null || itemId < 0) { this.arm.visible = true; return; }
    const d = itemDef(itemId);
    if (d && d.isBlock && getBlock(d.blockId).render === RENDER.CUBE) this.held = this._makeHeldBlock(d.blockId);
    else this.held = this._makeFlatItem(itemId);
    this.holder.add(this.held);
    this.arm.visible = true;
  }

  update(dt, player, heldId, light, time) {
    this.setHeld(heldId);
    const speed = Math.hypot(player.vel.x, player.vel.z);
    const moving = player.onGround && speed > 1.0;
    this.bob += dt * (moving ? 9 : 2.2);
    const amp = moving ? 0.025 : 0.008;
    const bx = Math.cos(this.bob) * amp;
    const by = Math.abs(Math.sin(this.bob)) * amp;

    if (this.swinging) {
      this.swing += dt * 4.0;
      if (this.swing >= 1) { this.swing = 0; this.swinging = false; }
    }
    const s = this.swinging ? Math.sin(this.swing * Math.PI) : 0;

    // arm transform
    this.arm.position.set(0.42 + bx, -0.35 + by - s * 0.12, -0.55 + s * 0.10);
    this.arm.rotation.set(-0.25 - s * 1.1, -0.2 + s * 0.3, -0.35);
    // held item transform
    this.holder.position.set(0.5 + bx, -0.45 + by - s * 0.18, -0.7 + s * 0.15);
    this.holder.rotation.set(-s * 1.2, 0, 0);

    // light tint to match world
    const l = THREE.MathUtils.clamp(light, 0.22, 1);
    this.armMat.color.copy(this.armBase).multiplyScalar(l);
    if (this.held) this.held.material.color.setRGB(l, l, l);
  }
}
