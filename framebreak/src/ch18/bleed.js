// ACT I — THE BLEED. The seams between the worlds have split and everything
// is leaking into everything else, badly. The floor is a patchwork of every
// format, and each tile behaves like the thing it is: glass cracks under you,
// wool unravels, pixels blink out, wireframe has no floor, ink swallows you,
// paper folds up into walls. Behind you the Curator's "correction" greys the
// world out, and riding it comes the Composite — every old villain glued
// together wrong — whose every slam reshuffles the floor ahead.
import * as THREE from 'three';
import { V, buildVell, bar } from './kit.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { pbr, normalFromHeight } from '../fx/tex.js';
import { tex, glassTex, stitchTex, goldFrame } from './atelierkit.js';
import { clamp, lerp, hash2, TAU, ease } from '../core/util.js';

const W = 9, L = 112, TS = 4, END = L * TS - 8, CPS = [6, 110, 220, 330];
const VOX = 0, CLAY = 1, PAPER = 2, GLASS = 3, WOOL = 4, PIXEL = 5, WIRE = 6, INK = 7, GREY = 8, NF = 9;
const NAME = ['VOXEL', 'CLAY', 'PAPER', 'GLASS', 'WOOL', 'PIXEL', 'WIREFRAME', 'INK'];
const SONG = (() => { const bars = {}, bass = ['A1 . A2 . A1 A1 A2 .', 'F1 . F2 . F1 F1 F2 .', 'C2 . C3 . C2 C2 C3 .', 'G1 . G2 . G1 G1 G2 .'], m = ['E5 . D5 E5 . C5 . A4 . C5 . D5 E5 - . .', 'F5 . E5 F5 . A5 . F5 . E5 . C5 A4 - . .', 'G5 . E5 G5 . C6 . G5 . E5 . C5 E5 - . .', 'D5 . B4 D5 . G5 . F5 . D5 . B4 G4 - . .'], who = ['lead', 'kazoo', 'organ', 'brass'];
  const A = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const b = { bass: bass[i % 4] + ' ' + bass[i % 4], drums: i % 4 === 3 ? 'k . h k s . h k k . s k s s t l' : 'k . h . s . h k . k h . s . h h', stab: i % 2 ? '. . A3+E4 . . . . . . . A3+E4 . . . . .' : '. . . . . . F3+C4 . . . . . . . G3+D4 .' }; for (const w of who) b[w] = who[(i + (i >> 2)) % 4] === w ? m[i % 4] : '. . . . . . . . . . . . . . . .'; bars['a' + i] = b; return 'a' + i; });
  return { bpm: 146, gain: 0.9, reverb: 0.12, start: 'A', tracks: { bass: { inst: 'fmbass', vol: 0.85 }, drums: { kit: 'electro', vol: 0.85 }, stab: { inst: 'stab', vol: 0.5, pan: -0.2 }, lead: { inst: 'lead', vol: 0.7, pan: 0.15 }, kazoo: { inst: 'kazoo', vol: 0.55, pan: 0.15 }, organ: { inst: 'organ', vol: 0.45, pan: 0.15 }, brass: { inst: 'brass', vol: 0.55, pan: 0.15 } }, bars, sections: { A }, next: { A: 'A' } }; })();

export class Bleed {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.name = 'THE BLEED'; this.done = false; }
  help() { return '<b>W/A/S/D</b> run · <b>SHIFT</b> sprint · <b>SPACE</b> jump (again in the air to double jump)<br>Glass cracks · wool unravels · pixels blink · wireframe has no floor · ink swallows you · paper folds up. Outrun the grey.'; }
  build() {
    const g = this.game, ch = this.ch, S = (this.scene = new THREE.Scene()); this.t = 0; this.said = {};
    S.fog = new THREE.FogExp2('#2a1430', 0.0085); this.cam = new THREE.PerspectiveCamera(60, g.W / g.H, 0.2, 1400);
    // sky: the worlds' palettes in torn sectors, turning against each other, with bright seams between
    this.skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { t: { value: 0 }, k: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform float t, k; vec3 pal(float i){ i = mod(i, 7.0); return i < 1.0 ? vec3(0.95,0.55,0.2) : i < 2.0 ? vec3(0.2,0.45,0.95) : i < 3.0 ? vec3(0.93,0.84,0.6) : i < 4.0 ? vec3(0.55,0.2,0.75) : i < 5.0 ? vec3(0.1,0.7,0.65) : i < 6.0 ? vec3(0.85,0.25,0.3) : vec3(0.98,0.9,0.4); }
        void main(){ vec3 d = normalize(vP); float a = atan(d.z, d.x), y = d.y; float s1 = floor((a + t * 0.05) * 7.0 / 6.2832 * 2.0 + y * 3.0), s2 = floor((a - t * 0.08) * 5.0 / 6.2832 * 2.0 - y * 4.0);
          vec3 c = mix(pal(s1), pal(s2 + 3.0), 0.5 + 0.5 * sin(y * 6.0 + t * 0.3)); c *= 0.22 + 0.25 * smoothstep(-0.2, 0.8, y);
          float e1 = abs(fract((a + t * 0.05) * 7.0 / 6.2832 * 2.0 + y * 3.0) - 0.5), e2 = abs(fract((a - t * 0.08) * 5.0 / 6.2832 * 2.0 - y * 4.0) - 0.5); c += vec3(1.0, 0.3, 0.9) * smoothstep(0.485, 0.5, e1) * 1.6 + vec3(0.3, 1.0, 0.95) * smoothstep(0.485, 0.5, e2) * 1.4;
          float sc = step(0.995, fract(sin(floor((y + t * 0.4) * 60.0)) * 9999.0)); c += sc * vec3(0.9) * (0.5 + k); gl_FragColor = vec4(c, 1.0); }` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 20), this.skyM); this.sky.frustumCulled = false; S.add(this.sky);
    // the void under the floor: every palette churning together
    this.voidM = new THREE.ShaderMaterial({ fog: false, uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vU; uniform float t; void main(){ vec2 p = vU * 0.02; float v = sin(p.x * 3.0 + t) + sin(p.y * 2.3 - t * 1.3) + sin((p.x + p.y) * 4.1 + t * 0.7) + sin(length(p) * 5.0 - t * 2.0); vec3 c = 0.5 + 0.5 * cos(6.2832 * (v * 0.25 + vec3(0.0, 0.33, 0.67) + t * 0.05)); gl_FragColor = vec4(c * c * (0.35 + 0.65 * smoothstep(0.2, 1.0, sin(v * 3.0))) * 0.9, 1.0); }' });
    const vo = new THREE.Mesh(new THREE.PlaneGeometry(400, 900), this.voidM); vo.rotation.x = -Math.PI / 2; vo.position.set(0, -36, END / 2); S.add(vo);
    S.add(new THREE.HemisphereLight('#c9b8ff', '#3a1a2a', 0.85)); const sun = (this.sun = new THREE.DirectionalLight('#ffe0c0', 2.4)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; S.add(sun, sun.target);
    // ---- one material per format
    const rep = (t, a) => { if (!t) return null; const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(a, a); return c; }, cl = pbr('clay'), knit = stitchTex(), knitN = normalFromHeight(knit.image, 3.2);
    const grass = tex(16, 16, (c) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const h = hash2(x, y); c.fillStyle = y < 3 ? (h > 0.5 ? '#6fbf4a' : '#5aa63c') : h > 0.6 ? '#8a6a4a' : h > 0.25 ? '#7a5a3c' : '#6a4a30'; c.fillRect(x, y, 1, 1); } c.fillStyle = '#7fd05a'; for (let x = 0; x < 16; x++) if (hash2(x, 9) > 0.5) c.fillRect(x, 3, 1, 1); }, true);
    const paperT = tex(128, 128, (c) => { c.fillStyle = '#f3ead6'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(120,100,70,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 128); c.moveTo(0, 64); c.lineTo(128, 64); c.stroke(); c.fillStyle = 'rgba(40,30,50,0.55)'; for (let i = 0; i < 9; i++) c.fillRect(12, 12 + i * 5, 30 + hash2(i, 1) * 16, 2); c.strokeStyle = '#d23a44'; c.lineWidth = 3; c.strokeRect(80, 80, 34, 34); });
    const pixT = tex(16, 16, (c) => { c.fillStyle = '#c84c0c'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#ffb08a'; c.fillRect(0, 0, 16, 1); c.fillRect(0, 8, 16, 1); c.fillStyle = '#5a1e04'; c.fillRect(0, 7, 16, 1); c.fillRect(0, 15, 16, 1); c.fillRect(7, 0, 1, 7); c.fillRect(15, 8, 1, 7); c.fillStyle = '#ffd166'; c.fillRect(3, 2, 2, 2); }, true);
    const wireT = tex(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.strokeStyle = '#7ff5e6'; c.lineWidth = 6; c.strokeRect(3, 3, 122, 122); c.lineWidth = 1.5; c.globalAlpha = 0.6; c.beginPath(); for (let i = 32; i < 128; i += 32) { c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); } c.stroke(); });
    const greyT = tex(128, 128, (c) => { c.fillStyle = '#9a9aa2'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#c9c9d0'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 128; i += 16) { c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); } c.stroke(); });
    const gT = glassTex(1); gT.wrapS = gT.wrapT = THREE.RepeatWrapping;
    this.MAT = [new THREE.MeshStandardMaterial({ map: grass, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#d98a5f', normalMap: rep(cl.normalMap, 1.5), roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: paperT, roughness: 1 }),
      new THREE.MeshStandardMaterial({ map: gT, emissiveMap: gT, emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.08, transparent: true, opacity: 0.88 }), new THREE.MeshPhysicalMaterial({ color: '#c9605a', map: rep(knit, 1.5), normalMap: rep(knitN, 1.5), roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffb0a0') }),
      new THREE.MeshStandardMaterial({ map: pixT, emissiveMap: pixT, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.7 }), new THREE.MeshBasicMaterial({ map: wireT, transparent: true, depthWrite: false, color: new THREE.Color('#ffffff').multiplyScalar(2.2) }),
      new THREE.MeshPhysicalMaterial({ color: '#08070b', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.2 }), new THREE.MeshStandardMaterial({ map: greyT, roughness: 0.6, emissive: '#555560', emissiveIntensity: 0.4 })];
    const tg = new THREE.BoxGeometry(TS - 0.14, 1.2, TS - 0.14); this.IM = this.MAT.map((m) => { const im = new THREE.InstancedMesh(tg, m, W * L); im.count = 0; im.castShadow = im.receiveShadow = m !== this.MAT[WIRE]; im.frustumCulled = false; S.add(im); return im; });
    // ---- tiles
    const N = W * L; this.F = new Int8Array(N); this.Y = new Float32Array(N); this.T = new Float32Array(N); this.WALL = new Float32Array(N); this.FOLD = new Uint8Array(N); this.GONE = new Uint8Array(N); this.POP = new Float32Array(N); this.STOOD = new Uint8Array(N);
    this.spine = []; let c = 4; for (let j = 0; j < L; j++) { if (j > 6 && hash2(j, 77) > 0.6) c = clamp(c + (hash2(j, 78) > 0.5 ? 1 : -1), 1, W - 2); this.spine.push(c); } this.gen(0, L);
    // ---- the far worlds, hung up badly: fragments of every format mis-assembled
    this.junk = []; const JM = this.MAT; for (let n = 0; n < 46; n++) { const s = n % 2 ? 1 : -1, z = n * 10 + hash2(n, 1) * 8, G = new THREE.Group(), k = n % 6, m1 = JM[(n * 3) % 6], m2 = JM[(n * 5 + 2) % 6];
      if (k === 0) { const a = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 6), m1), b = new THREE.Mesh(new THREE.ConeGeometry(5, 5, 4), m2); b.position.y = 7; b.rotation.y = 0.8; G.add(a, b); }
      else if (k === 1) { const a = new THREE.Mesh(new THREE.TorusKnotGeometry(3, 1, 60, 10), m1); G.add(a); }
      else if (k === 2) { for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), JM[(n + i) % 6]); a.position.set(i * 2.2 - 3, Math.sin(i) * 2, i * 0.7); a.rotation.set(i, i * 0.5, 0); G.add(a); } }
      else if (k === 3) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 14, 8), m1), b = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), m2); b.position.y = 8; b.scale.y = 0.7; G.add(a, b); }
      else if (k === 4) { const a = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: paperT, side: THREE.DoubleSide })); a.rotation.z = 0.3; G.add(a); }
      else { const a = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 0), m1), e = new THREE.LineSegments(new THREE.EdgesGeometry(a.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color('#ff5ad0').multiplyScalar(2) })); e.scale.setScalar(1.05); G.add(a, e); }
      G.position.set(s * (36 + hash2(n, 2) * 40), 6 + hash2(n, 3) * 30, z); G.rotation.set(hash2(n, 4) * 3, hash2(n, 5) * 3, hash2(n, 6) * 3); G.traverse((o) => (o.castShadow = true)); S.add(G); this.junk.push({ G, b: G.position.clone(), r: G.rotation.clone(), sp: (hash2(n, 7) - 0.5) * 0.6 }); }
    // ---- the correction: a grey wall of finished-ness, and the thing riding it
    this.cz = -24; this.wave = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vU; uniform float t; void main(){ vec2 g = abs(fract(vU * vec2(40.0, 30.0)) - 0.5); float l = step(0.46, max(g.x, g.y)); float scan = 0.5 + 0.5 * sin(vU.y * 200.0 - t * 20.0); vec3 c = vec3(0.85, 0.86, 0.9) * (0.35 + 0.4 * l + 0.1 * scan); gl_FragColor = vec4(c * 1.6, 0.55 + 0.3 * l); }' })); S.add(this.wave);
    this.comp = this.buildComposite(); S.add(this.comp.G); this.slamT = 5; this.ripples = [];
    this.portal = goldFrame(12, 9, 0.7); this.portal.position.set(0, 4.5, END + 4); S.add(this.portal); { const pm = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6dc').multiplyScalar(3) })); pm.position.copy(this.portal.position); S.add(pm); this.portalPane = pm; }
    // ---- Rin and Vell
    this.rin = buildRin3D(pbr('fabric').map); S.add(this.rin); this.vell = buildVell(); S.add(this.vell);
    this.cp = CPS[0]; this.p = { x: 0, y: 0, z: CPS[0], vy: 0, gr: true, jumps: 1, coy: 0, buf: 0, yaw: 0, sp: 0, slow: 1 }; this.camPos = V(0, 7, -6); this.shake = 0;
    ch.hud.title('FINALE', 'THE BLEED'); g.music.play(SONG, { intensity: 1, fade: 0.4 }); g.save.setCheckpoint(18, null);
    g.dialogue.say([{ who: 'vell', text: "Rin — the seams are open. Everything we came through is leaking into everything else." }, { who: 'rin', text: 'The floor is about four different things.' }, { who: 'curator', text: 'I am CORRECTING it. Hold still and you will be finished too.' }, { who: 'vell', text: 'Run. Glass cracks, wool comes undone, pixels blink out, the wireframe ones are not there at all — and stay OUT of the ink!' }]);
  }
  buildComposite() {
    const G = new THREE.Group(), M = this.MAT, parts = [];
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 3), M[CLAY]); { const a = core.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), d = 1 + Math.sin(x * 0.9) * 0.08 + Math.sin(y * 1.3 + z) * 0.08; a.setXYZ(i, x * d, y * d, z * d); } core.geometry.computeVertexNormals(); } G.add(core); parts.push(core);
    const faceT = tex(16, 12, (c) => { c.fillStyle = '#17131f'; c.fillRect(0, 0, 16, 12); c.fillStyle = '#ff3a3a'; c.fillRect(3, 3, 3, 2); c.fillRect(10, 3, 3, 2); c.fillStyle = '#ffd166'; c.fillRect(4, 3, 1, 1); c.fillRect(11, 3, 1, 1); c.fillStyle = '#f4f6ff'; for (let x = 3; x < 13; x += 2) c.fillRect(x, 8, 1, 2); c.fillRect(3, 7, 10, 1); }, true);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.75), new THREE.MeshBasicMaterial({ map: faceT })); face.position.set(0, 1.5, -6.4); face.rotation.y = Math.PI; G.add(face); parts.push(face);
    const drums = [-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 12), M[VOX]); d.rotation.z = Math.PI / 2; d.position.set(s * 8, -4, -2); G.add(d); parts.push(d); return d; });
    const tent = []; for (let k = 0; k < 6; k++) { const segs = []; let par = G; for (let i = 0; i < 7; i++) { const sg = new THREE.Mesh(new THREE.SphereGeometry(1.1 - i * 0.12, 10, 8), M[INK]); sg.position.set(i ? 0 : Math.cos(k) * 5, i ? -1.6 : -4, i ? 0 : Math.sin(k) * 4); par.add(sg); segs.push(sg); par = sg; } tent.push(segs); }
    const pen = new THREE.Group(), pb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 10), new THREE.MeshStandardMaterial({ color: '#d23a44', roughness: 0.4 })), pt = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 10), new THREE.MeshStandardMaterial({ color: '#17131f' })); pb.position.y = -8; pt.position.y = -17.5; pt.rotation.x = Math.PI; pen.add(pb, pt); pen.position.set(7, 4, -2); G.add(pen);
    const cur = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(2.4, 6, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color('#ff3a3a').multiplyScalar(2.5) })); cur.position.set(-6, 7, -3); G.add(cur);
    const shards = []; for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.TetrahedronGeometry(1.2 + (i % 3) * 0.5), M[i % 2 ? GLASS : PAPER]); G.add(s); shards.push(s); }
    G.traverse((o) => (o.castShadow = true)); return { G, core, face, drums, tent, pen, cur, shards, parts };
  }
  key(i, j) { return j * W + i; }
  pick(i, j, safe) { const d = clamp(j / L, 0, 1), w = safe ? [3, 2, 2, 1, 0, 0, 0, 0] : [2.6, 1.6, 2, 0.8 + 1.2 * d, 0.8 + 0.8 * d, 0.7 + 1.1 * d, 0.3 + 1.3 * d, 0.2 + 1.1 * d]; let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let f = 0; f < 8; f++) if ((r -= w[f]) < 0) return f; return VOX; }
  set(i, j, f) { const k = this.key(i, j); this.F[k] = f; this.T[k] = 0; this.WALL[k] = 0; this.GONE[k] = 0; this.STOOD[k] = 0; this.Y[k] = 0; this.FOLD[k] = f === PAPER && i !== this.spine[j] && Math.random() < 0.35 ? 1 : 0; }
  gen(j0, j1) { for (let j = Math.max(0, j0); j < Math.min(L, j1); j++) for (let i = 0; i < W; i++) { const start = CPS.some((c) => Math.abs(j * TS + 2 - c) < 7); this.set(i, j, start ? (i % 2 ? VOX : CLAY) : this.pick(i, j, Math.abs(i - this.spine[j]) < 1)); } }
  tileAt(x, z) { const i = Math.round(x / TS) + 4, j = Math.floor(z / TS); return i < 0 || i >= W || j < 0 || j >= L ? -1 : this.key(i, j); }
  solid(k) { if (k < 0 || this.GONE[k]) return false; const f = this.F[k], t = this.t, i = k % W, j = (k / W) | 0; if (f === WIRE || f === INK) return false; if (f === PIXEL) return (t + i * 0.37 + j * 0.21) % 2.6 < 1.7; if (f === WOOL) return (t * 0.45 + j * 0.11 + i * 0.07) % 1 < 0.72; return true; }
  respawn() { const g = this.game, p = this.p; g.save.data.stats.deaths++; p.x = 0; p.z = this.cp; p.y = 0; p.vy = 0; this.cz = this.cp - 30; const j0 = Math.floor((this.cp - 40) / TS); this.gen(j0, L); this.ripples = []; g.sfx.play('px.die'); this.flash = 0.8; }
  update(dt) {
    const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; const t = this.t; this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, (this.flash || 0) - dt * 2);
    if (this.out) { this.out += dt; p.z += 9 * dt; if (this.out > 1.6) this.done = true; return; }
    // the correction advances; the Composite slams and the floor reshuffles
    const spd = (3.9 + clamp(p.z / END, 0, 1) * 1.9) * (g.easy ? 0.72 : 1); this.cz = Math.max(this.cz + spd * dt, p.z - 70);
    this.slamT -= dt; if (this.slamT <= 0) { this.slamT = 4.2 + Math.random() * 1.5; this.slam = 1; this.ripples.push({ z: this.compZ ?? p.z + 34, r: 0 }); sfx.play('px.slam'); sfx.play('fx.boom', { vol: 0.6 }); this.shake = Math.max(this.shake, 0.6); }
    for (const R of this.ripples) { const r0 = R.r; R.r += 34 * dt; for (let j = Math.max(0, Math.floor((R.z - R.r - 8) / TS)); j < Math.min(L, Math.floor((R.z + R.r + 8) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j), d = Math.hypot((i - 4) * TS, j * TS + 2 - R.z); if (d >= r0 && d < R.r && j * TS + 2 > this.cz + 6 && this.F[k] !== GREY) { const mine = k === this.tileAt(p.x, p.z); this.set(i, j, this.pick(i, j, mine || Math.abs(i - this.spine[j]) < 1)); this.POP[k] = 1; } } }
    this.ripples = this.ripples.filter((R) => R.r < 90);
    // tiles: glass cracks, paper folds up, the correction greys and drops what it passes
    const pk = this.tileAt(p.x, p.z); for (let j = Math.max(0, Math.floor((p.z - 80) / TS)); j < Math.min(L, Math.floor((p.z + 100) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j), zc = j * TS + 2; this.POP[k] = Math.max(0, this.POP[k] - dt * 2.5);
      if (zc < this.cz && this.F[k] !== GREY) { this.F[k] = GREY; this.T[k] = 0; this.WALL[k] = 0; }
      if (this.F[k] === GREY) { this.T[k] += dt; if (this.T[k] > 1.1) { this.Y[k] -= (this.T[k] - 1.1) * 30 * dt; if (this.Y[k] < -40) this.GONE[k] = 1; } continue; }
      if (this.F[k] === GLASS && this.STOOD[k]) { this.T[k] += dt; if (this.T[k] > 0.75) { this.Y[k] -= (this.T[k] - 0.75) * 40 * dt; if (!this.GONE[k] && this.T[k] > 0.8) { this.GONE[k] = 1; sfx.play('px.crumble', { vol: 0.5, pitch: 1.6 }); } } }
      if (this.FOLD[k]) { const want = zc > p.z + 2 && zc < p.z + 16 ? 1 : this.WALL[k]; if (want > this.WALL[k] && this.WALL[k] === 0) sfx.play('pp.fold', { vol: 0.5 }); this.WALL[k] = Math.min(want, this.WALL[k] + dt * 2.2); } }
    // Rin
    const iz = (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) - (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0), ix = (inp.keys.has('KeyD') || inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft') ? 1 : 0), slow = pk >= 0 && this.F[pk] === CLAY && p.gr ? 0.62 : 1, sp = (inp.down.dash ? 10.5 : 7.4) * slow;
    let nx = clamp(p.x - ix * sp * 0.85 * dt, -17.6, 17.6), nz = p.z + iz * sp * dt; const blocked = (x, z) => { const k = this.tileAt(x, z); return k >= 0 && this.WALL[k] > 0.6 && p.y < 3.6 && this.F[k] === PAPER; };
    if (blocked(nx, p.z)) nx = p.x; if (blocked(p.x, nz)) nz = p.z; p.x = nx; p.z = Math.max(1, nz);
    if (inp.pressed.jump) p.buf = 0.15; else p.buf -= dt; if (p.gr) { p.coy = 0.12; p.jumps = 1; } else p.coy -= dt;
    if (p.buf > 0 && (p.coy > 0 || p.jumps > 0)) { const dbl = p.coy <= 0; if (dbl) p.jumps--; p.vy = dbl ? 8 : 9.4; p.buf = 0; p.coy = 0; p.gr = false; sfx.play('pp.jump', { pitch: dbl ? 1.35 : 1 }); }
    const k = this.tileAt(p.x, p.z), vy0 = p.vy, py = p.y; p.vy -= (p.vy > 0 && inp.down.jump ? 22 : 34) * dt; p.y += p.vy * dt; const top = k >= 0 && this.solid(k) && this.WALL[k] < 0.3 ? this.Y[k] : -999;
    if (p.vy <= 0 && py >= top - 0.25 && p.y <= top) { p.y = top; p.vy = 0; if (!p.gr && vy0 < -7) sfx.play('pp.land', { vol: 0.5 }); p.gr = true; if (k >= 0 && !this.STOOD[k]) { this.STOOD[k] = 1; if (this.F[k] === GLASS) sfx.play('ink.squash', { pitch: 2, vol: 0.4 }); } } else p.gr = false;
    if (k >= 0 && this.F[k] === INK && p.y <= 0.05 && !this.GONE[k]) { if (!this.said.ink) { this.said.ink = true; g.dialogue.say('vell', 'The ink took you! Black tiles are not floor, they are HOLES that look like floor.'); } return this.respawn(); }
    if (p.y < -14) return this.respawn(); if (p.z < this.cz + 1.2) { if (!this.said.grey) { this.said.grey = true; g.dialogue.say('curator', 'There. Finished. Was that so bad?'); } return this.respawn(); }
    p.sp = lerp(p.sp, Math.hypot(ix, iz) * sp, Math.min(1, dt * 8)); if (iz || ix) p.yaw = Math.atan2(-ix, Math.max(0.01, iz) + (iz < 0 ? -2 : 0));
    for (const c of CPS) if (p.z > c && c > this.cp && p.gr) { this.cp = c; sfx.play('px.checkpoint'); }
    const say = (key, z, who, text) => { if (!this.said[key] && p.z > z) { this.said[key] = true; g.dialogue.say(who, text); } };
    say('a', 60, 'vell', "That's... every boss we ever beat. Glued together WRONG. It's what you get when nothing matches and you force it to."); say('b', 150, 'rin', 'Every time it slams, the floor changes its mind.'); say('c', 250, 'curator', 'I am trying to HOLD it. It will not hold.'); say('d', 360, 'vell', 'There — a frame! Straight through it!');
    if (p.z > END + 2 && !this.out) { this.out = 0.001; sfx.play('fx.whoosh'); sfx.play('fx.shimmer'); g.dialogue.clear(); }
  }
  frame(dt) {
    const g = this.game, p = this.p, t = this.t, S = this.scene; this.skyM.uniforms.t.value = t; this.skyM.uniforms.k.value = this.shake; this.voidM.uniforms.t.value = t; this.wave.material.uniforms.t.value = t;
    // instances
    const cnt = new Array(NF).fill(0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
    for (let j = Math.max(0, Math.floor((p.z - 40) / TS)); j < Math.min(L, Math.floor((p.z + 110) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j); if (this.GONE[k] && this.Y[k] < -38) continue; const f = this.F[k], x = (i - 4) * TS, z = j * TS + 2, pop = this.POP[k], on = this.solid(k);
      let y = this.Y[k] - 0.6 + Math.sin(pop * Math.PI) * 0.8, a = 0; if (f === INK) y -= 0.15; if (f === GLASS && this.STOOD[k] && this.T[k] < 0.75) { x + Math.sin(t * 60) * 0.03; }
      sc.set(1, 1, 1); if (f === WOOL) { const u = (t * 0.45 + j * 0.11 + i * 0.07) % 1; const s = u < 0.72 ? 1 : Math.max(0.05, 1 - (u - 0.72) * 8); sc.set(s, 1, s); } if (f === PIXEL && !on) { sc.set(0.001, 0.001, 0.001); } else if (f === PIXEL && (t + i * 0.37 + j * 0.21) % 2.6 > 1.3 && Math.floor(t * 14) % 2) sc.set(0.94, 1, 0.94);
      if (f === PAPER && this.WALL[k] > 0) { a = ease.outBack(this.WALL[k]) * Math.PI / 2; pos.set(x, -0.6 * Math.cos(a) + 2 * Math.sin(a), z + 2 - 0.6 * Math.sin(a) - 2 * Math.cos(a)); } else pos.set(x, y, z);
      e.set(a, 0, f === GREY ? (this.T[k] > 1.1 ? (this.T[k] - 1.1) * (i % 2 ? 0.6 : -0.6) : 0) : 0); q.setFromEuler(e); m4.compose(pos, q, sc); this.IM[f].setMatrixAt(cnt[f]++, m4); }
    this.IM.forEach((im, f) => { im.count = cnt[f]; im.instanceMatrix.needsUpdate = true; });
    for (const J of this.junk) { const gl = Math.floor(t * 3 + J.b.x) % 17 === 0; J.G.position.set(J.b.x + (gl ? (Math.random() - 0.5) * 3 : 0), J.b.y + Math.sin(t * 0.5 + J.b.z) * 2, J.b.z); J.G.rotation.set(J.r.x + t * J.sp, J.r.y + t * J.sp * 0.7, J.r.z); }
    // the Composite
    { const C = this.comp, sl = this.slam = Math.max(0, (this.slam || 0) - dt * 1.6); this.compZ = lerp(this.compZ ?? p.z + 40, Math.min(END - 10, p.z + 38), Math.min(1, dt * 1.5)); const z = this.compZ; C.G.position.set(Math.sin(t * 0.7) * 7, 10.5 + Math.sin(t * 2.1) * 1.5 - Math.sin(sl * Math.PI) * 6, z + 10); C.G.scale.setScalar(1.25); C.G.rotation.set(-Math.sin(t * 1.3) * 0.15 - sl * 0.5, Math.sin(t * 0.5) * 0.3, Math.sin(t * 0.9) * 0.1);
      C.drums.forEach((d, i) => (d.rotation.x = t * (i ? 6 : -6))); C.pen.rotation.x = 0.6 + Math.sin(sl * Math.PI) * 1.4; C.cur.rotation.y = t * 3; C.face.scale.x = Math.floor(t * 9) % 11 === 0 ? -1 : 1;
      C.tent.forEach((segs, k) => segs.forEach((s, i) => { s.rotation.x = Math.sin(t * 2.4 + k + i * 0.6) * 0.5; s.rotation.z = Math.cos(t * 1.9 + k * 2 + i * 0.5) * 0.5; }));
      C.shards.forEach((s, i) => { const a = t * (0.6 + i * 0.07) + i; s.position.set(Math.cos(a) * (9 + i % 3), Math.sin(a * 1.3) * 5, Math.sin(a) * (9 + i % 3)); s.rotation.set(a, a * 2, 0); });
      if (Math.random() < dt * 6) { const pt = C.parts[(Math.random() * C.parts.length) | 0]; if (pt.material && pt !== C.face) pt.material = this.MAT[(Math.random() * 8) | 0]; } }
    this.wave.position.set(0, 18, this.cz); this.portal.rotation.z = Math.sin(t * 0.8) * 0.03; this.portalPane.material.color.setScalar(2.5 + Math.sin(t * 3) * 0.5);
    // Rin, Vell, camera
    this.rin.position.set(p.x, p.y, p.z); let dy = p.yaw - this.rin.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.rin.rotation.y += dy * Math.min(1, dt * 12); animateRin(this.rin, { speed: p.sp, ground: p.gr, vy: p.vy, slide: false, climb: 0, grapple: false, strike: 0, hurt: 0, t, dt, lookAt: null, talk: false });
    this.vell.position.lerp(V(p.x + 1.4, p.y + 2.4 + Math.sin(t * 3) * 0.2, p.z - 0.5), Math.min(1, dt * 5)); this.vell.rotation.y = t; this.vell.userData.tick(t);
    const sh = this.shake * (g.settings.shake ?? 1), want = V(p.x * 0.55, p.y * 0.6 + 6.8, p.z - 11.5 - (this.out || 0) * 6); this.camPos.lerp(want, 1 - Math.exp(-6 * dt)); this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)); this.cam.lookAt(p.x * 0.7, p.y * 0.7 + 1.6, p.z + 9); this.cam.fov = 60 + Math.min(8, p.sp * 0.6) + (this.out || 0) * 30; this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix(); this.sky.position.copy(this.cam.position);
    this.sun.position.set(p.x - 20, 40, p.z - 24); this.sun.target.position.set(p.x, 0, p.z + 8);
    const behind = p.z - this.cz; this.ch.hud.set(this.out ? '' : 'Reach the frame', [(behind < 14 ? '!' : '') + bar('GREY', clamp(1 - behind / 40, 0, 1), 12), `<kbd>→</kbd>${Math.max(0, Math.round(END - p.z))} m`]);
    const f = this.flash + (this.out || 0) * 0.6; return { scene: S, cam: this.cam, fx: { bloom: 0.75 + this.shake * 0.6 + f, threshold: 1.0, vig: 0.42, sat: 1.15 + this.shake * 0.4, grain: 0.05, con: 1.08, tint: this.slam > 0.5 ? [1.2, 0.85, 1.15] : [1, 1, 1] } };
  }
}
