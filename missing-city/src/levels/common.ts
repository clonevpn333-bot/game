import * as THREE from 'three';
import { M, glowMaterial } from '../render/Materials';
import { canvasTexture } from '../render/Textures';
import type { World } from '../world/World';
import type { Game } from '../game/Game';
import type { EnvSettings } from '../world/World';
import { SKY } from '../render/Sky';
import { mesh, box, cyl, rbox } from '../world/Kit';

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const ENV = {
  stormCity: {
    sky: SKY.storm, fog: '#0d121b', fogDensity: 0.011, rain: 1, envKind: 'city', exposure: 1.25,
    hemi: ['#5a6a88', '#120e0a', 0.32], moon: { color: '#8aa0c8', intensity: 0.35, dir: [0.4, 1, 0.25] }, reverb: [2.2, 0.28],
    bloom: 0.6, grade: { sat: 0.95, tint: '#f2f4ff', vignette: 0.95 },
  } as EnvSettings,
  interior: {
    sky: SKY.storm, fog: '#0b0f16', fogDensity: 0.02, rain: 1, envKind: 'interior', exposure: 1.0,
    hemi: ['#6a7480', '#1a1612', 0.25], reverb: [0.9, 0.2], motes: 0.5, bloom: 0.5,
  } as EnvSettings,
};

/** Animated helicopter (used in the prologue and the tower crash). */
export function helicopter(lightsOn = true): { group: THREE.Group; rotor: THREE.Object3D; tail: THREE.Object3D; spot: THREE.SpotLight } {
  const L = M();
  const g = new THREE.Group();
  const olive = new THREE.MeshPhysicalMaterial({ color: 0x2f3426, roughness: 0.55, metalness: 0.35, clearcoat: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 14), olive);
  body.scale.set(1.15, 1.0, 2.4);
  body.position.set(0, 1.4, 0);
  g.add(body);
  const nose = mesh(new THREE.SphereGeometry(1.05, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), L.glassDark, 0, 1.55, 1.9, Math.PI / 2.4, 0, 0);
  nose.scale.set(1, 0.9, 0.9);
  g.add(nose);
  const boom = mesh(cyl(0.18, 0.35, 5.5, 10), olive, 0, 1.7, -4.4, Math.PI / 2, 0, 0);
  g.add(boom);
  g.add(mesh(box(0.1, 1.4, 0.9), olive, 0, 2.3, -7.0));
  for (const sx of [-0.9, 0.9]) {
    g.add(mesh(box(0.1, 0.1, 3.4), L.metalDark, sx, 0.15, 0.2));
    g.add(mesh(box(0.08, 0.6, 0.08), L.metalDark, sx, 0.45, 1.0));
    g.add(mesh(box(0.08, 0.6, 0.08), L.metalDark, sx, 0.45, -0.6));
  }
  g.add(mesh(cyl(0.3, 0.4, 0.5, 10), L.metalDark, 0, 2.7, 0));
  const rotor = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = mesh(box(0.3, 0.04, 7.2), L.metalDark, 0, 0, 3.6);
    const piv = new THREE.Group();
    piv.rotation.y = (i * Math.PI) / 2;
    piv.add(b);
    rotor.add(piv);
  }
  // motion-blur disc
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7.3, 32), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  rotor.add(disc);
  rotor.position.set(0, 3.0, 0);
  g.add(rotor);
  const tail = new THREE.Group();
  for (let i = 0; i < 2; i++) tail.add(mesh(box(0.1, 1.5, 0.12), L.metalDark, 0, 0, 0, 0, 0, (i * Math.PI) / 2));
  tail.position.set(0.25, 2.4, -7.0);
  g.add(tail);
  g.add(mesh(new THREE.SphereGeometry(0.08, 8, 6), L.signalRed, 0, 2.9, -7.4));
  const spot = new THREE.SpotLight(0xe8f0ff, lightsOn ? 160 : 0, 120, 0.22, 0.4, 1.4);
  spot.position.set(0, 0.6, 2.2);
  spot.target.position.set(0, -10, 14);
  g.add(spot, spot.target);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return { group: g, rotor, tail, spot };
}

/** Helicopter cabin interior set (seats, netting, red lights, open door). */
export function cabin(W: World, x: number, y: number, z: number): void {
  const L = M();
  const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.1, 0.06).multiplyScalar(3) });
  // shell (open on the +x side = door)
  W.box([x - 1.3, y - 0.1, z - 2.6], [x + 1.3, y, z + 2.6], L.metalDark, { collide: false });
  W.box([x - 1.3, y + 2.0, z - 2.6], [x + 1.3, y + 2.1, z + 2.6], L.metalDark, { collide: false });
  W.box([x - 1.4, y, z - 2.6], [x - 1.3, y + 2.0, z + 2.6], L.metal, { collide: false });
  W.box([x - 1.3, y, z + 2.6], [x + 1.3, y + 2.0, z + 2.7], L.metal, { collide: false });
  W.box([x - 1.3, y, z - 2.7], [x + 1.3, y + 2.0, z - 2.6], L.metal, { collide: false });
  // door frame struts
  W.box([x + 1.25, y, z - 2.6], [x + 1.35, y + 2.0, z - 2.4], L.metalDark, { collide: false });
  W.box([x + 1.25, y, z + 2.4], [x + 1.35, y + 2.0, z + 2.6], L.metalDark, { collide: false });
  // benches + webbing
  for (const side of [-1, 1]) {
    W.box([x + side * 1.25 - 0.25, y + 0.42, z - 2.2], [x + side * 1.25 + 0.25, y + 0.5, z + 2.2], L.fabricRed, { collide: false });
    for (let i = -2; i <= 2; i++) W.box([x + side * 1.3 - 0.02, y + 0.6, z + i * 0.8 - 0.3], [x + side * 1.3 + 0.02, y + 1.6, z + i * 0.8 + 0.3], L.fabric, { collide: false });
  }
  for (const dz of [-1.8, 0, 1.8]) {
    W.box([x - 0.08, y + 1.96, z + dz - 0.08], [x + 0.08, y + 2.0, z + dz + 0.08], red, { collide: false, cast: false });
    W.light({ x, y: y + 1.9, z: z + dz }, '#ff2a14', { intensity: 3, distance: 4, glow: 0.3, pool: false });
  }
}

/** CRT/CCTV material showing a render target with scanlines + noise. */
export function cctvMaterial(tex: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex }, uTime: { value: 0 }, uFlick: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tMap; uniform float uTime; uniform float uFlick; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec2 c = uv - 0.5; uv = 0.5 + c * (1.0 + dot(c,c) * 0.18);
        uv.x += (h(vec2(floor(uv.y * 120.0), floor(uTime * 20.0))) - 0.5) * 0.004 * (1.0 + uFlick * 6.0);
        vec3 col = texture2D(tMap, uv).rgb;
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        l = pow(l * 1.6, 0.8);
        col = vec3(l) * vec3(0.85, 1.0, 0.9);
        col *= 0.8 + 0.2 * sin(uv.y * 480.0);
        col += (h(uv * 300.0 + uTime) - 0.5) * 0.12;
        col *= smoothstep(0.75, 0.3, length(c));
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
        gl_FragColor = vec4(col * 1.6, 1.0);
      }`,
  });
}

/** Animated TV text screen (emergency broadcasts, PA boards). */
export function textScreen(key: string, lines: () => string[], bg = '#0a2a6a', fg = '#ffffff', w = 512, h = 288): { tex: THREE.CanvasTexture; redraw: () => void } {
  const tex = canvasTexture(`screen-${key}`, w, h, () => {}, { repeat: false, mip: false });
  const cv = tex.image as HTMLCanvasElement;
  const c = cv.getContext('2d')!;
  const redraw = () => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    const ls = lines();
    c.fillStyle = fg;
    c.font = `700 ${Math.floor(h / 9)}px "Barlow Condensed", Arial, sans-serif`;
    c.textAlign = 'center';
    ls.forEach((l, i) => {
      if (i === 0) {
        c.fillStyle = '#ff3030';
        c.fillRect(0, 0, w, h / 6);
        c.fillStyle = '#fff';
        c.fillText(l, w / 2, h / 8);
        c.font = `500 ${Math.floor(h / 13)}px "Barlow", Arial, sans-serif`;
        c.fillStyle = fg;
      } else c.fillText(l, w / 2, h / 6 + 14 + i * (h / 9));
    });
    for (let y = 0; y < h; y += 3) {
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(0, y, w, 1);
    }
    tex.needsUpdate = true;
  };
  redraw();
  return { tex, redraw };
}

/** Military floodlight tower on a trailer. */
export function floodlight(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(1.4, 0.5, 2.4), L.paintYellow, 0, 0.6, 0));
  g.add(mesh(cyl(0.08, 0.1, 7, 8), L.metal, 0, 4.2, 0));
  for (const sx of [-0.6, -0.2, 0.2, 0.6]) g.add(mesh(rbox(0.35, 0.35, 0.2, 0.03), L.metalDark, sx, 7.6, 0.1));
  W.prop(g, { x, y: 0, z }, yaw);
  W.physics.add({ cx: x, cy: 0.6, cz: z, hx: 0.7, hy: 0.6, hz: 1.2, yaw });
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  for (const sx of [-0.4, 0.4]) {
    const p = new THREE.Vector3(x, 7.6, z).addScaledVector(new THREE.Vector3(f.z, 0, -f.x), sx).addScaledVector(f, 0.25);
    W.light(p, '#f0f6ff', { intensity: 0, distance: 1, glow: 1.6, pool: false, noLight: true });
  }
  const spot = new THREE.SpotLight(0xeef4ff, 120, 60, 0.5, 0.5, 1.5);
  spot.position.set(x, 7.6, z);
  spot.target.position.set(x + f.x * 20, 0, z + f.z * 20);
  W.add(spot);
  W.add(spot.target);
}

export function glowPlane(W: World, color: string, x: number, y: number, z: number, s: number): void {
  W.quad(glowMaterial(color, 0.4, 'gp'), { x, y, z }, s, s, 0, { pitch: -Math.PI / 2 });
}

export const wait = (_g: Game, ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
