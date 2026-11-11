// Builders for the last act: canvas textures (cave wall of hands, shadow
// puppets, leaded glass, stitches, pixel sprites), and the "lens" material
// that shows the same 3D world, through a frame, drawn in another format.
import * as THREE from 'three';
import { hash2, TAU, makeCanvas } from '../core/util.js';

export const tex = (w, h, fn, nearest) => { const c = makeCanvas(w, h); fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (nearest) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; } else t.anisotropy = 8; return t; };
export const JEWEL = ['#d23a44', '#2f6fd0', '#f0b030', '#2fa36a', '#8a4fc0', '#e8642a', '#2fd3c6'];
export function hand2d(c, x, y, s, rot = 0) { c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.beginPath(); c.ellipse(0, 0, 0.5, 0.56, 0, 0, TAU); c.fill(); [[-0.36, -0.42, -0.25, 0.5], [-0.13, -0.52, -0.07, 0.62], [0.1, -0.52, 0.07, 0.58], [0.32, -0.42, 0.24, 0.46], [0.5, 0.05, 1.05, 0.42]].forEach(([fx, fy, a, l]) => { c.save(); c.translate(fx, fy); c.rotate(a); c.beginPath(); c.roundRect(-0.095, -l, 0.19, l + 0.15, 0.09); c.fill(); c.restore(); }); c.beginPath(); c.roundRect(-0.3, 0.3, 0.6, 0.75, 0.1); c.fill(); c.restore(); }

// The wall: ~150 hand stencils sprayed in ochre, charcoal and white; a second
// canvas holds the same hands in pure colour, used as the wall's emissive map.
export function buildWall(marks) {
  const W = 2048, H = 1024, a = makeCanvas(W, H), b = makeCanvas(W, H), ca = a.getContext('2d'), cb = b.getContext('2d'), tmp = makeCanvas(220, 220), ct = tmp.getContext('2d'), OCH = ['#c9743a', '#e8dcc0', '#8a2f22', '#d9a441'];
  ca.fillStyle = '#3d2c23'; ca.fillRect(0, 0, W, H); for (let i = 0; i < 2600; i++) { ca.fillStyle = `rgba(${hash2(i, 1) > 0.5 ? '130,92,66' : '18,10,8'},${hash2(i, 2) * 0.13})`; ca.beginPath(); ca.ellipse(hash2(i, 3) * W, hash2(i, 4) * H, 10 + hash2(i, 5) * 90, 4 + hash2(i, 6) * 30, hash2(i, 7) * 3, 0, TAU); ca.fill(); }
  cb.fillStyle = '#000'; cb.fillRect(0, 0, W, H);
  for (let i = 0; i < 170; i++) { const x = 70 + hash2(i, 11) * (W - 140), y = 80 + hash2(i, 12) * (H - 170); if (Math.hypot(x - W / 2, y - H * 0.56) < 170) continue; const s = 42 + hash2(i, 13) * 26, rot = (hash2(i, 14) - 0.5) * 0.9, neg = hash2(i, 15) > 0.28;
    ct.globalCompositeOperation = 'source-over'; ct.globalAlpha = 1; ct.clearRect(0, 0, 220, 220);
    if (neg) { const g = ct.createRadialGradient(110, 110, 10, 110, 110, 108); g.addColorStop(0, OCH[i % 4]); g.addColorStop(0.5, OCH[i % 4]); g.addColorStop(1, 'rgba(0,0,0,0)'); ct.fillStyle = g; ct.globalAlpha = 0.85; ct.fillRect(0, 0, 220, 220); ct.globalAlpha = 1; ct.globalCompositeOperation = 'destination-out'; ct.fillStyle = '#000'; hand2d(ct, 110, 118, s, rot); for (let k = 0; k < 150; k++) { ct.globalAlpha = hash2(k, i) * 0.8; ct.fillRect(hash2(k, i + 1) * 220, hash2(k, i + 2) * 220, 3, 3); } }
    else { ct.fillStyle = OCH[(i + 2) % 4]; ct.globalAlpha = 0.8; hand2d(ct, 110, 118, s, rot); }
    ca.drawImage(tmp, x - 110, y - 110); cb.fillStyle = JEWEL[i % 7]; cb.globalAlpha = 0.95; hand2d(cb, x, y + 8, s, rot); cb.globalAlpha = 1; }
  // Vell: the first try. A smudge, bottom left.
  { const g = ca.createRadialGradient(250, 880, 4, 250, 880, 60); g.addColorStop(0, '#c06fc0'); g.addColorStop(1, 'rgba(192,111,192,0)'); ca.fillStyle = g; ca.fillRect(170, 800, 160, 160); cb.fillStyle = '#c06fc0'; cb.beginPath(); cb.ellipse(250, 880, 34, 26, 0.4, 0, TAU); cb.fill(); }
  // marks left on earlier play-throughs, drawn where the player drew them
  (marks || []).slice(-12).forEach((m, i) => { const px = W / 2 + Math.cos(i * 1.31 + 0.4) * 330 - 70, py = H * 0.56 + Math.sin(i * 1.31 + 0.4) * 250 - 50; for (const [c, col, lw] of [[ca, '#e8dcc0', 5], [cb, '#fff3b0', 6]]) { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = c.lineJoin = 'round'; for (const st of m.s || []) { c.beginPath(); for (let k = 0; k < st.length; k += 2) c.lineTo(px + st[k] * 140, py + st[k + 1] * 100); c.stroke(); } } });
  const map = new THREE.CanvasTexture(a), glow = new THREE.CanvasTexture(b); map.colorSpace = glow.colorSpace = THREE.SRGBColorSpace; map.anisotropy = glow.anisotropy = 8;
  return { map, glow, stamp() { ct.globalCompositeOperation = 'source-over'; ct.globalAlpha = 1; ct.clearRect(0, 0, 220, 220); const g = ct.createRadialGradient(110, 110, 10, 110, 110, 108); g.addColorStop(0, '#2fd3c6'); g.addColorStop(0.55, '#2fd3c6'); g.addColorStop(1, 'rgba(0,0,0,0)'); ct.fillStyle = g; ct.fillRect(0, 0, 220, 220); ct.globalCompositeOperation = 'destination-out'; hand2d(ct, 110, 118, 56, 0.06); ca.drawImage(tmp, W / 2 - 110, H * 0.56 - 110); cb.fillStyle = '#8ff5e3'; hand2d(cb, W / 2, H * 0.56 + 8, 56, 0.06); map.needsUpdate = glow.needsUpdate = true; } };
}
export const puppetTex = (i) => tex(128, 192, (c) => { c.fillStyle = c.strokeStyle = '#fff'; c.lineCap = 'round';
  if (i === 0) { c.beginPath(); c.ellipse(60, 100, 40, 20, 0, 0, TAU); c.fill(); c.lineWidth = 7; for (const x of [30, 44, 78, 92]) { c.beginPath(); c.moveTo(x, 108); c.lineTo(x + (x < 60 ? -4 : 4), 172); c.stroke(); } c.lineWidth = 12; c.beginPath(); c.moveTo(92, 92); c.lineTo(106, 56); c.stroke(); c.beginPath(); c.ellipse(110, 50, 13, 8, 0.4, 0, TAU); c.fill(); c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(106, 44); c.lineTo(100 + s * 12, 14); c.lineTo(100 + s * 22, 22); c.moveTo(100 + s * 6, 28); c.lineTo(100 + s * 2, 8); c.stroke(); } }
  else if (i === 1) { c.beginPath(); c.ellipse(64, 96, 26, 12, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(50, 92); c.quadraticCurveTo(20, 30, 6, 60); c.quadraticCurveTo(30, 70, 60, 100); c.fill(); c.beginPath(); c.moveTo(76, 92); c.quadraticCurveTo(100, 30, 122, 56); c.quadraticCurveTo(100, 70, 70, 100); c.fill(); c.beginPath(); c.moveTo(88, 92); c.lineTo(106, 98); c.lineTo(88, 103); c.fill(); }
  else if (i === 2) { c.beginPath(); c.arc(64, 40, 14, 0, TAU); c.fill(); c.lineWidth = 12; c.beginPath(); c.moveTo(64, 54); c.lineTo(64, 116); c.lineTo(46, 178); c.moveTo(64, 116); c.lineTo(84, 178); c.moveTo(64, 70); c.lineTo(100, 60); c.moveTo(64, 70); c.lineTo(34, 96); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(96, 12); c.lineTo(104, 152); c.stroke(); }
  else hand2d(c, 60, 90, 72, -0.1); });
export const glassTex = (i) => tex(128, 320, (c, w, h) => { c.beginPath(); c.moveTo(4, h); c.lineTo(4, 90); c.quadraticCurveTo(4, 10, 64, 4); c.quadraticCurveTo(124, 10, 124, 90); c.lineTo(124, h); c.closePath(); c.save(); c.clip(); for (let y = 0; y < 8; y++) for (let x = 0; x < 3; x++) { c.fillStyle = JEWEL[Math.floor(hash2(x + i * 5, y) * 7)]; c.fillRect(x * 43, y * 40, 43, 40); c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(x * 43, y * 40); c.lineTo(x * 43 + 43, y * 40); c.lineTo(x * 43, y * 40 + 40); c.fill(); } c.strokeStyle = '#0b0a0d'; c.lineWidth = 5; for (let y = 0; y <= 8; y++) { c.beginPath(); c.moveTo(0, y * 40); c.lineTo(w, y * 40); c.stroke(); } for (let x = 1; x < 3; x++) { c.beginPath(); c.moveTo(x * 43, 0); c.lineTo(x * 43, h); c.stroke(); } c.beginPath(); c.arc(64, 72, 30, 0, TAU); c.fillStyle = JEWEL[(i + 2) % 7]; c.fill(); c.stroke(); c.restore(); });
export const sunTex = () => tex(512, 512, (c) => { for (let r = 3; r >= 0; r--) for (let i = 0; i < 12; i++) { const a0 = (i * TAU) / 12, R1 = 64 + r * 62, R0 = R1 - 62; c.beginPath(); c.arc(256, 256, R1, a0, a0 + TAU / 12); c.arc(256, 256, Math.max(8, R0), a0 + TAU / 12, a0, true); c.closePath(); c.fillStyle = JEWEL[(i + r * 2) % 7]; c.fill(); c.strokeStyle = '#0b0a0d'; c.lineWidth = 7; c.stroke(); } });
export const stitchTex = () => tex(128, 128, (ctx, s) => { ctx.fillStyle = '#777'; ctx.fillRect(0, 0, s, s); const n = 4, c = s / n; for (let j = -1; j <= n; j++) for (let i = 0; i < n; i++) for (const d of [-1, 1]) { const x = i * c + c / 2 + d * c * 0.23, y = j * c + c * 0.5, g = ctx.createLinearGradient(x - c * 0.2, y, x + c * 0.2, y); g.addColorStop(0, d < 0 ? '#fff' : '#b5b5b5'); g.addColorStop(1, d < 0 ? '#b5b5b5' : '#fff'); ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.rotate(d * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, c * 0.2, c * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore(); } });
const PXC = { W: '#f4f6ff', L: '#b4d2f7', Y: '#ffd166', O: '#ff9a3c', R: '#c2362f', K: '#0d0f1f', T: '#2fd3c6', S: '#ffd0a4', N: '#2a3a6b' };
const PX = { cloud: ['....WWWW........', '..WWWWWWWW..WW..', '.WWWWWWWWWWWWWW.', 'WWWWWWWWWWWWWWWW', 'LLWWWWWWWWWWWWLL', '.LLLLLLLLLLLLLL.'], heart: ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], coin: ['.YYYY.', 'YYOOYY', 'YYOYYY', 'YYOYYY', 'YYOOYY', '.YYYY.'], star: ['...Y...', '...Y...', 'YYYYYYY', '.YYYYY.', '.YYYYY.', 'YY...YY', 'Y.....Y'],
  rin: ['..WW.WW...', '.WWWWWWW..', '.WOOOOOW..', '.SSKSSKS..', '.SSSSSSS..', 'OOTTTTT...', 'O.TTTTT...', '..TTTTTS..', '..TTTTT...', '..NN.NN...', '..NN.NN...', '..KK.KK...'] };
export const pixelTex = (n) => { const R = PX[n]; return tex(R[0].length, R.length, (c) => R.forEach((row, y) => [...row].forEach((ch, x) => { if (PXC[ch]) { c.fillStyle = PXC[ch]; c.fillRect(x, y, 1, 1); } })), true); };
export const pixelAspect = (n) => PX[n][0].length / PX[n].length;
export const gridTex = () => { const t = tex(256, 256, (c) => { c.fillStyle = '#02060a'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#2fd3c6'; c.lineWidth = 4; c.strokeRect(0, 0, 256, 256); c.lineWidth = 1.5; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 256); c.moveTo(0, 128); c.lineTo(256, 128); c.stroke(); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

// The lens: samples a second render of the same camera view at the fragment's
// own screen position and redraws it. 0 pixel · 1 ink · 2 vector · 3 comic · 4 1996 · 5 blueprint
export function lensMat(rt, style, res) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tMap: { value: rt.texture }, uRes: { value: res }, uStyle: { value: style }, uMix: { value: 1 }, uGain: { value: 1.6 } },
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tMap; uniform vec2 uRes; uniform float uStyle, uMix, uGain;
      float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); } vec3 S(vec2 uv){ return texture2D(tMap, uv).rgb * uGain; }
      float edge(vec2 uv, float px){ vec2 d = px / uRes; float a = lum(S(uv + vec2(d.x, 0.0))) - lum(S(uv - vec2(d.x, 0.0))), b = lum(S(uv + vec2(0.0, d.y))) - lum(S(uv - vec2(0.0, d.y))); return clamp(length(vec2(a, b)) * 9.0, 0.0, 1.0); }
      void main(){ vec2 uv = gl_FragCoord.xy / uRes; vec3 c;
        if (uStyle < 0.5) { vec2 q = vec2(176.0, 99.0); c = S((floor(uv * q) + 0.5) / q); c = floor(c * 5.0 + 0.5) / 5.0; }
        else if (uStyle < 1.5) { float e = edge(uv, 2.0), l = lum(S(uv)), h = step(l, 0.12) * step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 7.0)); c = mix(vec3(0.86, 0.8, 0.66), vec3(0.03, 0.02, 0.05), max(e, h * 0.85)); }
        else if (uStyle < 2.5) { c = vec3(0.004, 0.012, 0.02) + vec3(0.2, 1.0, 0.9) * edge(uv, 2.0) * 2.2; }
        else if (uStyle < 3.5) { float l = lum(S(uv)); vec2 g = fract(gl_FragCoord.xy / 9.0) - 0.5; float d = step(length(g), sqrt(clamp(1.0 - l * 1.8, 0.0, 1.0)) * 0.62); c = mix(vec3(0.9, 0.85, 0.72), mix(vec3(0.75, 0.12, 0.1), vec3(0.03, 0.02, 0.05), step(l, 0.2)), d); }
        else if (uStyle < 4.5) { vec2 q = vec2(160.0, 90.0), p = floor(uv * q); float l = lum(S((p + 0.5) / q)); l = floor((l * 1.7 + mod(p.x + p.y, 2.0) * 0.12) * 4.0) / 4.0; c = l * vec3(0.7, 0.42, 0.3); }
        else { vec2 g = step(fract(gl_FragCoord.xy / 40.0), vec2(0.05)); c = vec3(0.02, 0.09, 0.3) + vec3(0.85, 0.92, 1.0) * edge(uv, 1.5) * 1.5 + vec3(0.06, 0.12, 0.3) * max(g.x, g.y); }
        gl_FragColor = vec4(c, uMix);
        #include <colorspace_fragment>
      }` });
}
export function goldFrame(w, h, t = 0.35) { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.9, roughness: 0.3, emissive: '#3a2408', emissiveIntensity: 0.6 }); for (const [bw, bh, x, y] of [[w + t * 2, t, 0, h / 2 + t / 2], [w + t * 2, t, 0, -h / 2 - t / 2], [t, h, w / 2 + t / 2, 0], [t, h, -w / 2 - t / 2, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, t), m); b.position.set(x, y, 0); b.castShadow = true; g.add(b); } return g; }
