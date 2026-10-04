import * as THREE from 'three';

/** Small cached canvas textures for the Shepherd walkers. */
const cache = new Map<string, THREE.CanvasTexture>();
function tex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true): THREE.CanvasTexture {
  let t = cache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

export const T = {
  /** panel lines, rivets and grime on an off-white hull */
  panels: () => tex('sh-panels', 256, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      c.fillStyle = `rgba(60,55,50,${Math.random() * 0.06})`;
      c.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 2 + Math.random() * 10);
    }
    c.strokeStyle = 'rgba(40,40,40,0.45)';
    c.lineWidth = 2;
    for (const p of [0, 96, 160, 256]) {
      c.beginPath();
      c.moveTo(p, 0);
      c.lineTo(p, 256);
      c.stroke();
    }
    for (const p of [0, 64, 192]) {
      c.beginPath();
      c.moveTo(0, p);
      c.lineTo(256, p);
      c.stroke();
    }
    c.fillStyle = 'rgba(30,30,30,0.5)';
    for (let x = 8; x < 256; x += 22) for (const y of [6, 70, 198]) c.fillRect(x, y, 3, 3);
    // rain streaks
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(70,60,50,${0.05 + Math.random() * 0.08})`;
      c.fillRect(Math.random() * 256, Math.random() * 120, 2, 40 + Math.random() * 120);
    }
  }),
  hazard: () => tex('sh-hazard', 128, 32, (c) => {
    c.fillStyle = '#f2c12e';
    c.fillRect(0, 0, 128, 32);
    c.fillStyle = '#16171a';
    for (let x = -32; x < 160; x += 32) {
      c.beginPath();
      c.moveTo(x, 32);
      c.lineTo(x + 16, 32);
      c.lineTo(x + 32, 0);
      c.lineTo(x + 16, 0);
      c.fill();
    }
  }),
  stencil: (name: string) => tex(`sh-sten-${name}`, 512, 72, (c) => {
    c.clearRect(0, 0, 512, 72);
    c.fillStyle = 'rgba(30,32,36,0.85)';
    c.font = 'bold 40px "Arial Black", Impact, sans-serif';
    c.fillText(`BELLWETHER MUNICIPAL · ${name}`, 8, 52);
  }, false),
  siding: () => tex('sh-siding', 128, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < 128; y += 12) c.fillRect(0, y, 128, 2);
  }),
  radial: () => tex('sh-radial', 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }, false),
};
