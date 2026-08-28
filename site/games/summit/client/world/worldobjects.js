/* Mirrors the server's world state into the scene: loot, campfires, anchors,
 * ziplines, flares and pings. Everything is pooled — no per-frame allocation. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { propGeo, Fire, makeLine, placeLine, pingMarker } from './props.js';
import { materials, glowSprite } from '../gfx/materials.js';
import { ITEMS } from '../../shared/items.js';

const V = new THREE.Vector3();

export class WorldObjects {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.geo = propGeo();
    const M = materials();

    this.itemGroup = new THREE.Group();
    this.otherGroup = new THREE.Group();
    scene.add(this.itemGroup, this.otherGroup);

    this.pools = {};
    for (const kind of ['crate', 'luggage', 'cache', 'bush', 'drop']) this.pools[kind] = [];
    this.itemNodes = new Map();

    this.anchorNodes = new Map();
    this.zipNodes = new Map();
    this.markNodes = new Map();
    this.flareNodes = new Map();

    this.ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a6b3f, roughness: 0.95 });
    this.wireMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.7 });

    /* campfires: one per checkpoint, lit when the team reaches it */
    this.camps = world.campfires.map((c) => {
      const g = new THREE.Group();
      const stones = new THREE.Mesh(this.geo.campfire.geo, this.geo.campfire.mat);
      stones.castShadow = true; stones.receiveShadow = true;
      const logs = new THREE.Mesh(this.geo.campfireLogs.geo, this.geo.campfireLogs.mat);
      logs.castShadow = true;
      g.add(stones, logs);
      g.position.set(c.x, world.height(c.x, c.z), c.z);
      scene.add(g);
      const fire = new Fire(scene, 1.15);
      fire.group.position.copy(g.position);
      fire.setLit(false);
      return { def: c, group: g, fire, lit: false };
    });
    this.itemDropGeo = new THREE.BoxGeometry(0.3, 0.24, 0.22);
    this.markGroup = new THREE.Group();
    scene.add(this.markGroup);
  }

  node(kind) {
    const pool = this.pools[kind] || this.pools.drop;
    for (const n of pool) if (!n.used) { n.used = true; n.obj.visible = true; return n; }
    const obj = this.makeNode(kind);
    const n = { obj, used: true, kind };
    pool.push(n);
    this.itemGroup.add(obj);
    return n;
  }

  makeNode(kind) {
    const g = new THREE.Group();
    const M = materials();
    if (kind === 'crate') {
      const m = new THREE.Mesh(this.geo.crate.geo, this.geo.crate.mat);
      const b = new THREE.Mesh(this.geo.crate.bands.geo, this.geo.crate.bands.mat);
      m.castShadow = b.castShadow = true; m.receiveShadow = true;
      g.add(m, b);
    } else if (kind === 'luggage') {
      const m = new THREE.Mesh(this.geo.luggage.geo, this.geo.luggage.mat);
      const s = new THREE.Mesh(this.geo.luggage.straps.geo, this.geo.luggage.straps.mat);
      m.castShadow = s.castShadow = true; m.receiveShadow = true;
      g.add(m, s);
    } else if (kind === 'cache') {
      const m = new THREE.Mesh(this.geo.cache.geo, this.geo.cache.mat);
      const c = new THREE.Mesh(this.geo.cache.cover.geo, this.geo.cache.cover.mat);
      m.castShadow = c.castShadow = true;
      g.add(m, c);
    } else if (kind === 'bush') {
      const m = new THREE.Mesh(this.geo.bush.geo, this.geo.bush.mat);
      m.castShadow = true;
      g.add(m);
    } else {
      const m = new THREE.Mesh(this.itemDropGeo, M.canvasBag);
      m.castShadow = true;
      g.add(m);
    }
    const glow = new THREE.Sprite(glowSprite([1, 0.86, 0.55], 64));
    glow.scale.setScalar(0.9);
    glow.position.y = 0.55;
    glow.material.opacity = 0.0;
    g.add(glow);
    g.userData.glow = glow;
    return g;
  }

  /** @param snap latest snapshot from the server */
  sync(snap, camPos) {
    if (!snap) return;
    if (snap.it) this.syncItems(snap.it);
    this.syncAnchors(snap.an || []);
    this.syncZips(snap.zp || []);
    this.syncMarks(snap.mk || []);
    this.syncFlares(snap.fl || []);
    const camps = snap.cp || [];
    this.camps.forEach((c, i) => {
      const lit = !!camps[i];
      if (lit !== c.lit) { c.lit = lit; c.fire.setLit(lit); }
    });
    this.camPos = camPos;
  }

  syncItems(list) {
    for (const pool of Object.values(this.pools)) for (const n of pool) n.used = false;
    const seen = new Set();
    for (const [id, kind, x, y, z, open, contents] of list) {
      seen.add(id);
      let n = this.itemNodes.get(id);
      if (!n || n.kind !== kind) {
        n = this.node(kind);
        n.id = id;
        this.itemNodes.set(id, n);
        n.obj.position.set(x, y, z);
        n.obj.rotation.y = (hashStr(id) % 628) / 100;
      }
      n.used = true;
      n.obj.visible = true;
      n.open = open === 1;
      n.contents = contents;
      n.obj.userData.glow.material.opacity = open ? 0.55 : 0.0;
      n.obj.position.set(x, y, z);
    }
    for (const [id, n] of this.itemNodes) {
      if (!seen.has(id)) { n.obj.visible = false; n.used = false; this.itemNodes.delete(id); }
    }
    for (const pool of Object.values(this.pools)) for (const n of pool) if (!n.used) n.obj.visible = false;
  }

  syncAnchors(list) {
    const seen = new Set();
    for (const a of list) {
      seen.add(a.id);
      let n = this.anchorNodes.get(a.id);
      if (!n) {
        const g = new THREE.Group();
        const head = new THREE.Mesh(a.kind === 'rope' ? this.geo.anchor.geo : this.geo.piton.geo,
          a.kind === 'rope' ? this.geo.anchor.mat : this.geo.piton.mat);
        head.castShadow = true;
        g.add(head);
        if (a.kind === 'rope') {
          const line = makeLine(this.ropeMat, 6);
          g.add(line);
          g.userData.line = line;
        }
        g.position.set(a.x, a.y + 1.1, a.z);
        this.otherGroup.add(g);
        n = { obj: g };
        this.anchorNodes.set(a.id, n);
        if (a.kind === 'rope') {
          const bottom = new THREE.Vector3(a.x, this.world.height(a.x, a.z) - Math.min(a.len, 20), a.z);
          placeLine(g.userData.line, new THREE.Vector3(0, 0, 0), bottom.clone().sub(g.position), 0.028);
        }
      }
    }
    for (const [id, n] of this.anchorNodes) if (!seen.has(id)) { this.otherGroup.remove(n.obj); this.anchorNodes.delete(id); }
  }

  syncZips(list) {
    const seen = new Set();
    for (const z of list) {
      seen.add(z.id);
      let n = this.zipNodes.get(z.id);
      if (!n) {
        const line = makeLine(this.wireMat, 5);
        this.otherGroup.add(line);
        n = { obj: line };
        this.zipNodes.set(z.id, n);
      }
      placeLine(n.obj, new THREE.Vector3(z.a.x, z.a.y, z.a.z), new THREE.Vector3(z.b.x, z.b.y, z.b.z), 0.035);
    }
    for (const [id, n] of this.zipNodes) if (!seen.has(id)) { this.otherGroup.remove(n.obj); this.zipNodes.delete(id); }
  }

  syncMarks(list) {
    const seen = new Set();
    for (const m of list) {
      seen.add(m.id);
      let n = this.markNodes.get(m.id);
      if (!n) {
        const obj = pingMarker(m.kind === 'danger' ? 0xff6b6b : 0xffd36e);
        obj.position.set(m.x, m.y, m.z);
        this.markGroup.add(obj);
        n = { obj };
        this.markNodes.set(m.id, n);
      }
    }
    for (const [id, n] of this.markNodes) if (!seen.has(id)) { this.markGroup.remove(n.obj); this.markNodes.delete(id); }
  }

  syncFlares(list) {
    const seen = new Set();
    for (const f of list) {
      seen.add(f.id);
      let n = this.flareNodes.get(f.id);
      if (!n) {
        const fire = new Fire(this.scene, 0.55);
        fire.group.position.set(f.x, f.y + 0.1, f.z);
        n = { fire };
        this.flareNodes.set(f.id, n);
      }
    }
    for (const [id, n] of this.flareNodes) if (!seen.has(id)) { n.fire.dispose(); this.flareNodes.delete(id); }
  }

  update(dt) {
    for (const c of this.camps) c.fire.update(dt);
    for (const [, n] of this.flareNodes) n.fire.update(dt);
    const t = performance.now() * 0.001;
    for (const [, n] of this.markNodes) {
      n.obj.userData.spin.rotation.y = t * 1.7;
      n.obj.userData.spin.position.y = 1.5 + Math.sin(t * 2.4) * 0.12;
    }
    for (const [, n] of this.itemNodes) {
      const g = n.obj.userData.glow;
      if (g && g.material.opacity > 0) g.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.18;
    }
  }

  /** Nearest interactable within range of a point. */
  nearestItem(p, range = 2.6) {
    let best = null, bd = range * range;
    for (const [id, n] of this.itemNodes) {
      if (!n.obj.visible) continue;
      const d = n.obj.position.distanceToSquared(p);
      if (d < bd) { bd = d; best = { id, node: n, dist: Math.sqrt(d) }; }
    }
    return best;
  }

  nearestCamp(p, range = 7) {
    let best = null, bd = range * range;
    this.camps.forEach((c, i) => {
      const d = c.group.position.distanceToSquared(p);
      if (d < bd) { bd = d; best = { index: i, camp: c, dist: Math.sqrt(d) }; }
    });
    return best;
  }

  dispose() {
    this.scene.remove(this.itemGroup, this.otherGroup, this.markGroup);
    for (const c of this.camps) { this.scene.remove(c.group); c.fire.dispose(); }
    for (const [, n] of this.flareNodes) n.fire.dispose();
  }
}

export function describeContents(str) {
  if (!str) return '';
  return str.split(',').filter(Boolean).map((c) => {
    const [id, n] = c.split(':');
    return `${ITEMS[id]?.name || id}${Number(n) > 1 ? ' ×' + n : ''}`;
  }).join(', ');
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
