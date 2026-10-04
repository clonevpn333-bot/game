import * as THREE from 'three';

export type EnvKind = 'city' | 'interior' | 'subway' | 'lab' | 'other' | 'sunrise' | 'fire';

/** Bake a procedural environment map (reflections on wet asphalt, glass, metal). */
export function makeEnvironment(renderer: THREE.WebGLRenderer, kind: EnvKind): THREE.Texture {
  const scene = new THREE.Scene();
  const palette: Record<EnvKind, { top: string; mid: string; low: string; lights: string[]; n: number; bright: number }> = {
    city: { top: '#0a0e16', mid: '#1c2230', low: '#2a2018', lights: ['#ffb070', '#ffe0b0', '#80c8ff', '#ff4088', '#40e0ff', '#ff9040'], n: 160, bright: 3 },
    interior: { top: '#d8e8e4', mid: '#5a6466', low: '#2a2a2a', lights: ['#f0fff8', '#ffffff'], n: 24, bright: 2 },
    subway: { top: '#1a1c1a', mid: '#2a2c26', low: '#141412', lights: ['#e0f0d0', '#ffd8a0'], n: 30, bright: 2 },
    lab: { top: '#080a10', mid: '#141a24', low: '#05060a', lights: ['#a080ff', '#60c0ff', '#ffffff'], n: 40, bright: 2.5 },
    other: { top: '#1a0c3a', mid: '#5a3a8a', low: '#d0b0ff', lights: ['#ffffff', '#c090ff', '#90f0ff'], n: 120, bright: 2.5 },
    sunrise: { top: '#4a6a9a', mid: '#f0b080', low: '#3a3530', lights: ['#fff0d0', '#ffd0a0'], n: 60, bright: 2 },
    fire: { top: '#200c06', mid: '#6a2a10', low: '#100604', lights: ['#ff6020', '#ffa040'], n: 50, bright: 3 },
  };
  const p = palette[kind];
  const grad = document.createElement('canvas');
  grad.width = 4;
  grad.height = 256;
  const c = grad.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, p.top);
  g.addColorStop(0.48, p.mid);
  g.addColorStop(0.55, p.low);
  g.addColorStop(1, '#050505');
  c.fillStyle = g;
  c.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(grad);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
  scene.add(dome);
  // emissive cards = windows, neon, lamps
  const card = new THREE.PlaneGeometry(1, 1);
  let seed = 3;
  const r = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < p.n; i++) {
    const col = new THREE.Color(p.lights[Math.floor(r() * p.lights.length)]).multiplyScalar(p.bright * (0.3 + r()));
    const m = new THREE.Mesh(card, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    const a = r() * Math.PI * 2;
    const el = kind === 'interior' || kind === 'subway' || kind === 'lab' ? 0.5 + r() * 0.8 : -0.05 + r() * 0.45;
    const R = 30;
    m.position.set(Math.cos(a) * R * Math.cos(el), Math.sin(el) * R, Math.sin(a) * R * Math.cos(el));
    m.lookAt(0, 0, 0);
    const s = kind === 'interior' ? 4 + r() * 6 : 0.6 + r() * 2.5;
    m.scale.set(s * (kind === 'city' ? 0.5 + r() : 1.5), s * (kind === 'interior' ? 0.3 : 1), 1);
    scene.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02);
  pm.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      (m.material as THREE.Material).dispose();
    }
  });
  dome.geometry.dispose();
  card.dispose();
  tex.dispose();
  return rt.texture;
}
