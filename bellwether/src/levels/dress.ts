import * as THREE from 'three';
import type { World } from '../world/World';
import { M } from '../render/Materials';
import { mulberry } from '../actors/Blocky';

/** Interior/exterior dressing kit: the details that make a space feel lived in. */

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function paint(color: string, rough = 0.8, emissive = 0): THREE.MeshStandardMaterial {
  const k = `${color}-${rough}-${emissive}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: emissive ? new THREE.Color(color) : undefined, emissiveIntensity: emissive });
    matCache.set(k, m);
  }
  return m;
}

const texCache = new Map<string, THREE.CanvasTexture>();
function canvasTex(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d')!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
}

/** Cork board with pinned coloured papers, a heading strip. */
export function bulletinBoard(W: World, x: number, y: number, z: number, yaw: number, w: number, h: number, seed: number, title?: string): void {
  const tex = canvasTex(`board${seed}${title}`, 512, Math.round((512 * h) / w), (c) => {
    const r = mulberry(seed);
    const H = c.canvas.height;
    c.fillStyle = '#b8895a';
    c.fillRect(0, 0, 512, H);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(${90 + r() * 60},${60 + r() * 40},${30 + r() * 20},0.35)`;
      c.fillRect(r() * 512, r() * H, 2, 2);
    }
    const cols = ['#ffffff', '#ffe066', '#ff8fab', '#8fd3ff', '#a8f0a0', '#ffb36b'];
    for (let i = 0; i < 9; i++) {
      const pw = 70 + r() * 70;
      const ph = 60 + r() * 70;
      const px = 14 + r() * (512 - pw - 28);
      const py = (title ? 60 : 14) + r() * (H - ph - (title ? 74 : 28));
      c.save();
      c.translate(px + pw / 2, py + ph / 2);
      c.rotate((r() - 0.5) * 0.12);
      c.fillStyle = cols[i % cols.length];
      c.fillRect(-pw / 2, -ph / 2, pw, ph);
      c.fillStyle = 'rgba(40,40,60,0.55)';
      for (let l = 0; l < 4; l++) c.fillRect(-pw / 2 + 8, -ph / 2 + 12 + l * 12, pw * (0.4 + r() * 0.45), 4);
      // crayon doodle
      c.strokeStyle = ['#e74c3c', '#2e86c1', '#27ae60', '#8e44ad'][i % 4];
      c.lineWidth = 3;
      c.beginPath();
      c.arc(r() * 20 - 10, ph * 0.15, 10 + r() * 8, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      c.fillStyle = '#c0392b';
      c.beginPath();
      c.arc(px + pw / 2, py + 4, 4, 0, Math.PI * 2);
      c.fill();
    }
    if (title) {
      c.fillStyle = '#1f3a5f';
      c.fillRect(0, 0, 512, 46);
      c.fillStyle = '#fff';
      c.font = '700 30px "Barlow Condensed", Arial Narrow, sans-serif';
      c.fillText(title, 16, 33);
    }
    c.strokeStyle = '#6b4a2e';
    c.lineWidth = 14;
    c.strokeRect(0, 0, 512, H);
  });
  W.quad(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { x, y, z }, w, h, yaw);
}

/** A row of big alphabet cards above a chalkboard. */
export function alphabet(W: World, x: number, y: number, z: number, yaw: number, w: number): void {
  const tex = canvasTex('abc', 1024, 64, (c) => {
    const cols = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#2e86c1', '#8e44ad'];
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cw = 1024 / L.length;
    for (let i = 0; i < L.length; i++) {
      c.fillStyle = '#fbf7ec';
      c.fillRect(i * cw + 2, 2, cw - 4, 60);
      c.fillStyle = cols[i % cols.length];
      c.font = '700 44px Arial';
      c.fillText(L[i] + L[i].toLowerCase(), i * cw + 4, 48);
    }
  });
  W.quad(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), { x, y, z }, w, w / 16, yaw);
}

/** Paper bunting strung across a space (between two points). */
export function bunting(W: World, a: THREE.Vector3, b: THREE.Vector3, sag = 0.4, seed = 1): void {
  const r = mulberry(seed);
  const cols = ['#e74c3c', '#f1c40f', '#2e86c1', '#27ae60', '#ff8fab', '#ffb36b'];
  const n = Math.max(4, Math.round(a.distanceTo(b) / 0.5));
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.32, 0], 3));
  tri.computeVertexNormals();
  const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    const m = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], roughness: 0.8, side: THREE.DoubleSide }));
    m.position.copy(p);
    m.rotation.y = yaw;
    W.add(m);
  }
}

export function bookshelf(W: World, x: number, z: number, yaw: number, w = 1.6, h = 1.2, seed = 3): void {
  const L = M();
  const r = mulberry(seed);
  const g = new THREE.Group();
  const wood = L.wood;
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(px, py, pz);
    g.add(o);
  };
  mk(new THREE.BoxGeometry(w, h, 0.04), wood, 0, h / 2, -0.17);
  for (const sx of [-1, 1]) mk(new THREE.BoxGeometry(0.04, h, 0.36), wood, (sx * w) / 2, h / 2, 0);
  const shelves = Math.max(2, Math.round(h / 0.4));
  const cols = ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  for (let s = 0; s <= shelves; s++) {
    const y = (s * h) / shelves;
    mk(new THREE.BoxGeometry(w, 0.03, 0.34), wood, 0, y, 0);
    if (s === shelves) break;
    let bx = -w / 2 + 0.05;
    while (bx < w / 2 - 0.08) {
      const bw = 0.04 + r() * 0.05;
      const bh = 0.2 + r() * 0.12;
      mk(new THREE.BoxGeometry(bw, bh, 0.24), paint(cols[Math.floor(r() * cols.length)], 0.7), bx + bw / 2, y + bh / 2 + 0.015, 0);
      bx += bw + 0.008;
    }
  }
  W.prop(g, new THREE.Vector3(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: h / 2, cz: z, hx: w / 2, hy: h / 2, hz: 0.2, yaw });
}

/** Coat cubbies with hanging backpacks. */
export function cubbies(W: World, x: number, z: number, yaw: number, n = 6, seed = 5): void {
  const L = M();
  const r = mulberry(seed);
  const g = new THREE.Group();
  const cols = ['#e74c3c', '#2e86c1', '#f1c40f', '#27ae60', '#ff8fab', '#8e44ad'];
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(px, py, pz);
    g.add(o);
  };
  const w = n * 0.42;
  mk(new THREE.BoxGeometry(w, 1.5, 0.04), L.woodPaint, 0, 0.75, -0.2);
  for (let i = 0; i <= n; i++) mk(new THREE.BoxGeometry(0.03, 1.5, 0.4), L.woodPaint, -w / 2 + i * 0.42, 0.75, 0);
  mk(new THREE.BoxGeometry(w, 0.03, 0.4), L.woodPaint, 0, 0.4, 0);
  mk(new THREE.BoxGeometry(w, 0.03, 0.4), L.woodPaint, 0, 1.5, 0);
  for (let i = 0; i < n; i++) {
    if (r() < 0.25) continue;
    const bp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.16), paint(cols[Math.floor(r() * cols.length)], 0.7));
    bp.position.set(-w / 2 + 0.21 + i * 0.42, 0.95, 0.02);
    g.add(bp);
  }
  W.prop(g, new THREE.Vector3(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.75, cz: z, hx: w / 2, hy: 0.75, hz: 0.22, yaw });
}

/** Patterned rug decal on the floor. */
export function rug(W: World, x: number, z: number, w: number, d: number, colors: [string, string], y = 0.16): void {
  const tex = canvasTex(`rug${colors.join()}`, 256, 256, (c) => {
    c.fillStyle = colors[0];
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = colors[1];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) c.fillRect(i * 32 + 4, j * 32 + 4, 24, 24);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 8;
    c.strokeRect(6, 6, 244, 244);
  });
  W.quad(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), { x, y, z }, w, d, 0, { pitch: -Math.PI / 2 });
}

/** Bright daylight window seen from inside: sky panel, mullions, sill, and a sun shaft. */
export function dayWindow(W: World, x: number, y: number, z: number, yaw: number, w = 2.4, h = 1.8, shaft = true): void {
  const L = M();
  const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const sky = canvasTex('daysky', 128, 128, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#8ec0ec');
    g.addColorStop(0.7, '#d8ecfa');
    g.addColorStop(1, '#bcd8a0');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  });
  W.quad(new THREE.MeshBasicMaterial({ map: sky, toneMapped: true, color: new THREE.Color(1.6, 1.6, 1.6) }), { x, y, z }, w, h, yaw);
  const frame = L.trimLight;
  const fx = Math.abs(n.z) > 0.5;
  const thick = (a: number, b: number): [number, number, number] => (fx ? [a, b, 0.08] : [0.08, b, a]);
  W.boxC([x + n.x * 0.04, y, z + n.z * 0.04], thick(0.08, h), frame, 0, { collide: false });
  W.boxC([x + n.x * 0.04, y, z + n.z * 0.04], thick(w, 0.08), frame, 0, { collide: false });
  W.boxC([x + n.x * 0.04, y + h / 2, z + n.z * 0.04], thick(w + 0.1, 0.1), frame, 0, { collide: false });
  W.boxC([x + n.x * 0.04, y - h / 2, z + n.z * 0.04], thick(w + 0.1, 0.1), frame, 0, { collide: false });
  W.boxC([x + n.x * 0.12, y - h / 2 - 0.04, z + n.z * 0.12], thick(w + 0.2, 0.06).map((v, i) => (i === (fx ? 2 : 0) ? 0.25 : v)) as [number, number, number], frame, 0, { collide: false });
  W.light({ x: x + n.x * 1.2, y: y + 0.2, z: z + n.z * 1.2 }, '#fff2d8', { intensity: 7, distance: 7, glow: 0, pool: false });
  if (shaft) {
    // dusty sunbeam slanting into the room
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 2.6, 0.02), new THREE.MeshBasicMaterial({ color: '#fff2d0', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(x + n.x * 1.3, y - 0.7, z + n.z * 1.3);
    beam.rotation.y = yaw;
    beam.rotateX(-0.75);
    W.add(beam);
  }
}

export function wallClock(W: World, x: number, y: number, z: number, yaw: number): void {
  const tex = canvasTex('clock', 128, 128, (c) => {
    c.fillStyle = '#fbfbf6';
    c.beginPath();
    c.arc(64, 64, 60, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#222';
    c.lineWidth = 6;
    c.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillStyle = '#222';
      c.fillRect(64 + Math.sin(a) * 48 - 2, 64 - Math.cos(a) * 48 - 5, 4, 10);
    }
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(64, 64);
    c.lineTo(64 + 10, 64 - 30);
    c.moveTo(64, 64);
    c.lineTo(64 - 34, 64 - 4);
    c.stroke();
  });
  W.quad(new THREE.MeshBasicMaterial({ map: tex, transparent: true }), { x, y, z }, 0.42, 0.42, yaw);
}

export function waterFountain(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  W.boxC([x, 0.8, z], [0.5, 0.25, 0.38], L.steel, yaw);
  W.boxC([x, 0.4, z - Math.cos(yaw) * 0.08], [0.2, 0.6, 0.2], L.steel, yaw, { collide: false });
}

export function flagPole(W: World, x: number, z: number, h = 9): void {
  const L = M();
  W.boxC([x, h / 2, z], [0.12, h, 0.12], L.steel, 0);
  const tex = canvasTex('bwflag', 256, 160, (c) => {
    c.fillStyle = '#1f3a5f';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#7ff4ff';
    c.beginPath();
    c.arc(128, 80, 34, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1f3a5f';
    c.beginPath();
    c.arc(128, 80, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f4f1e6';
    c.fillRect(0, 140, 256, 20);
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0, 12, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(x + 0.85, h - 0.6, z);
  W.add(flag);
  const pos = flag.geometry.getAttribute('position') as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array as Float32Array);
  W.onUpdate((_dt, t) => {
    for (let i = 0; i < pos.count; i++) {
      const px = base[i * 3];
      pos.setZ(i, Math.sin(t * 4 + px * 4) * 0.08 * (px + 0.8));
    }
    pos.needsUpdate = true;
  });
}

export function bikeRack(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  for (let i = 0; i < 5; i++) {
    const off = (i - 2) * 0.6;
    W.boxC([x + Math.cos(yaw) * off, 0.45, z - Math.sin(yaw) * off], [0.05, 0.9, 0.6], L.steel, yaw, { collide: false });
  }
  W.physics.add({ cx: x, cy: 0.45, cz: z, hx: 1.5, hy: 0.45, hz: 0.3, yaw });
}

export function hedge(W: World, x0: number, z0: number, x1: number, z1: number, h = 0.9): void {
  const L = M();
  W.box([x0, 0, z0], [x1, h, z1], L.hedge, { uv: 1 });
}

/** Painted playground games: hopscotch and a four-square court. */
export function playMarkings(W: World, x: number, z: number): void {
  const tex = canvasTex('hop', 512, 512, (c) => {
    c.clearRect(0, 0, 512, 512);
    c.strokeStyle = '#f4f1e6';
    c.lineWidth = 8;
    // four square
    c.strokeRect(20, 20, 220, 220);
    c.beginPath();
    c.moveTo(130, 20);
    c.lineTo(130, 240);
    c.moveTo(20, 130);
    c.lineTo(240, 130);
    c.stroke();
    c.fillStyle = 'rgba(231,76,60,0.55)';
    c.fillRect(24, 24, 102, 102);
    c.fillStyle = 'rgba(46,134,193,0.55)';
    c.fillRect(134, 134, 102, 102);
    // hopscotch
    const nums = ['1', '2', '3', '4', '5', '6', '7', '8'];
    c.font = '700 40px Arial';
    c.fillStyle = '#f1c40f';
    let y = 480;
    for (let i = 0; i < 8; i++) {
      const pair = i === 3 || i === 6;
      if (pair) {
        c.strokeRect(300, y - 56, 70, 56);
        c.strokeRect(370, y - 56, 70, 56);
        c.fillText(nums[i], 320, y - 14);
        c.fillText(nums[i + 1] ?? '', 390, y - 14);
        i++;
      } else {
        c.strokeRect(335, y - 56, 70, 56);
        c.fillText(nums[i], 357, y - 14);
      }
      y -= 58;
    }
  });
  W.quad(new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false }), { x, y: 0.12, z }, 12, 12, 0, { pitch: -Math.PI / 2 });
}

export function hoop(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  W.boxC([x, 1.6, z], [0.14, 3.2, 0.14], L.steel, 0);
  const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  W.boxC([x + n.x * 0.5, 3.2, z + n.z * 0.5], Math.abs(n.z) > 0.5 ? [1.6, 1.0, 0.06] : [0.06, 1.0, 1.6], L.plasticWhite, 0, { collide: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), L.paintRed);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x + n.x * 0.85, 2.95, z + n.z * 0.85);
  W.add(ring);
}
