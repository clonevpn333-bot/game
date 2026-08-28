/* Outfits, hats and packs. Everything is generated, so a new cosmetic is a few
 * numbers rather than an asset. Shop entries reference these ids. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { materialMaps } from '../gfx/textures.js';
import { heightFog } from '../gfx/materials.js';
import { mergeGeometries, boulder } from '../world/flora.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const OUTFITS = {
  expedition: { name: 'Expedition Red', jacket: 0xff5a3c, trousers: 0x35406b, accent: 0xe8c07d, price: 0 },
  glacier:    { name: 'Glacier Blue',   jacket: 0x3aa0ff, trousers: 0x243050, accent: 0xd8e6f2, price: 400 },
  forest:     { name: 'Forest Green',   jacket: 0x4fc45a, trousers: 0x35301f, accent: 0xc9b483, price: 400 },
  dust:       { name: 'Dust Tan',       jacket: 0xffc46b, trousers: 0x4a4038, accent: 0x2f2a25, price: 650 },
  ash:        { name: 'Ashfall Black',  jacket: 0x8d5bff, trousers: 0x1d1f22, accent: 0xff7a3c, price: 900 },
  summit:     { name: 'Summit Gold',    jacket: 0xffd54a, trousers: 0x2a2622, accent: 0xfff2cf, price: 1600 },
};

export const HATS = {
  none:    { name: 'Bare Head', price: 0 },
  beanie:  { name: 'Wool Beanie', price: 250 },
  helmet:  { name: 'Climbing Helmet', price: 500 },
  brim:    { name: 'Wide Brim', price: 600 },
  hood:    { name: 'Storm Hood', price: 850 },
  crown:   { name: 'Summit Crown', price: 2400 },
};

export const PACKS_COSMETIC = {
  none:  { name: 'No Pack', slots: 'none', price: 0 },
  small: { name: 'Daypack', slots: 'small', price: 0 },
  large: { name: 'Expedition Pack', slots: 'large', price: 1200 },
};

export const SKIN_TONES = 5;

export const defaultLook = () => ({ outfit: 'expedition', hat: 'none', pack: 'small', tone: 1, bulk: 1 });

const cache = new Map();

export function makeMaterials(look) {
  const o = OUTFITS[look.outfit] || OUTFITS.expedition;
  const key = `${look.outfit}:${look.tone}`;
  if (cache.has(key)) return cache.get(key);
  const fabric = materialMaps('fabric', 61, 0.11, 3);
  const leather = materialMaps('leather', 67, 0.07, 3);
  const skinMaps = materialMaps('skin', 73, look.tone ?? 1, 1);
  const mk = (maps, color, rough, metal = 0) => heightFog(new THREE.MeshStandardMaterial({
    map: maps.map, normalMap: maps.normalMap, color, roughness: rough, metalness: metal,
    normalScale: new THREE.Vector2(0.35, 0.35),
  }), null, 'std');
  const mats = {
    skin: mk(skinMaps, 0xffffff, 0.74),
    jacket: mk(fabric, o.jacket, 0.85),
    sleeve: mk(fabric, mix(o.jacket, 0x000000, 0.22), 0.85),
    glove: mk(leather, mix(o.trousers, 0x000000, 0.25), 0.7),
    trousers: mk(fabric, o.trousers, 0.9),
    boot: mk(leather, 0x2b2420, 0.62),
    gear: mk(leather, o.accent, 0.55),
    hair: mk(skinMaps, 0x35271c, 0.9),
    eye: heightFog(new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.35, metalness: 0 }), null, 'std'),
  };
  cache.set(key, mats);
  return mats;
}

function mix(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t).getHex();
}

/** Hat + pack geometry, positioned against the rest pose. */
export function makeExtras(look, rest) {
  const out = [];
  const head = rest.get('head').clone();
  const chest = rest.get('chest').clone();

  switch (look.hat) {
    case 'beanie': {
      const g = new THREE.SphereGeometry(0.166, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
      g.scale(1, 1.06, 1.02);
      g.translate(head.x, head.y + 0.104, head.z);
      const brim = new THREE.TorusGeometry(0.160, 0.024, 8, 18);
      brim.rotateX(Math.PI / 2);
      brim.translate(head.x, head.y + 0.082, head.z);
      out.push({ geo: mergeGeometries([g, brim]), mat: 'gear' });
      break;
    }
    case 'helmet': {
      const g = new THREE.SphereGeometry(0.172, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
      g.scale(1, 0.95, 1.05);
      g.translate(head.x, head.y + 0.110, head.z);
      const vent = new THREE.BoxGeometry(0.03, 0.02, 0.16);
      vent.translate(head.x, head.y + 0.24, head.z);
      out.push({ geo: mergeGeometries([g, vent]), mat: 'gear' });
      break;
    }
    case 'brim': {
      const cap = new THREE.SphereGeometry(0.162, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      cap.translate(head.x, head.y + 0.104, head.z);
      const brim = new THREE.CylinderGeometry(0.290, 0.290, 0.014, 22);
      brim.translate(head.x, head.y + 0.132, head.z);
      out.push({ geo: mergeGeometries([cap, brim]), mat: 'gear' });
      break;
    }
    case 'hood': {
      const g = new THREE.SphereGeometry(0.200, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
      g.scale(1.02, 1.1, 1.16);
      g.translate(head.x, head.y + 0.070, head.z - 0.022);
      const neck = new THREE.CylinderGeometry(0.15, 0.19, 0.14, 16, 1, true);
      neck.translate(head.x, head.y - 0.05, head.z - 0.02);
      out.push({ geo: mergeGeometries([g, neck]), mat: 'jacket' });
      break;
    }
    case 'crown': {
      const band = new THREE.TorusGeometry(0.162, 0.018, 8, 20);
      band.rotateX(Math.PI / 2);
      band.translate(head.x, head.y + 0.142, head.z);
      const spikes = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const s = new THREE.ConeGeometry(0.017, 0.075 + (i % 2) * 0.035, 5);
        s.translate(head.x + Math.cos(a) * 0.155, head.y + 0.198, head.z + Math.sin(a) * 0.155);
        spikes.push(s);
      }
      out.push({ geo: mergeGeometries([band, ...spikes]), mat: 'gear' });
      break;
    }
    default: break;
  }

  // hair, where the headwear leaves room for it
  if (look.hat === 'none' || look.hat === 'brim' || look.hat === 'crown') {
    const cap = new THREE.SphereGeometry(0.160, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
    cap.scale(1.02, 1.08, 1.06);
    cap.translate(head.x, head.y + 0.092, head.z - 0.004);
    const back = new THREE.SphereGeometry(0.150, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.9);
    back.scale(1.0, 1.0, 0.62);
    back.translate(head.x, head.y + 0.082, head.z - 0.055);
    const brow = new THREE.BoxGeometry(0.13, 0.016, 0.02);
    brow.translate(head.x, head.y + 0.132, head.z + 0.098);
    out.push({ geo: mergeGeometries([cap, back, brow]), mat: 'hair' });
  }

  const packSize = look.pack === 'large' ? 1.22 : look.pack === 'none' ? 0 : 1;
  if (packSize > 0) {
    const w = 0.31 * packSize, h = 0.42 * packSize, d = 0.19 * packSize;
    const backZ = chest.z - 0.20 - d * 0.45;
    const midY = chest.y - 0.20;
    const body = new THREE.BoxGeometry(w, h, d, 2, 3, 2);
    round(body, 0.05 * packSize);
    body.translate(chest.x, midY, backZ);
    const lid = new THREE.CylinderGeometry(w * 0.46, w * 0.46, d * 0.9, 12);
    lid.rotateZ(Math.PI / 2);
    lid.translate(chest.x, midY + h * 0.5, backZ);
    const roll = new THREE.TorusGeometry(w * 0.30, 0.022, 6, 14);
    roll.rotateX(Math.PI / 2);
    roll.translate(chest.x, midY - h * 0.42, backZ - d * 0.3);
    const straps = [];
    for (const sgn of [1, -1]) {
      const st = new THREE.BoxGeometry(0.052, 0.30, 0.038);
      st.translate(chest.x + 0.098 * sgn, chest.y - 0.02, chest.z + 0.055);
      straps.push(st);
      const over = new THREE.BoxGeometry(0.052, 0.038, 0.20);
      over.translate(chest.x + 0.098 * sgn, chest.y + 0.115, chest.z - 0.045);
      straps.push(over);
    }
    out.push({ geo: mergeGeometries([body, lid, roll, ...straps]), mat: 'gear' });
  }
  return out;
}

/** Softens box corners so gear does not read as programmer art. */
function round(geo, r) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const size = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    for (const ax of ['x', 'y', 'z']) {
      const lim = size[ax] - r;
      if (Math.abs(v[ax]) > lim) v[ax] = Math.sign(v[ax]) * (lim + r * 0.72);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
}

/** Small pile of gear used for dropped packs and crates in the world. */
export function gearPile(seed) { return boulder(0.4, seed, 1); }
