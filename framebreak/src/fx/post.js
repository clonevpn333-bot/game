// Shared post-processing for every 3D reality: HDR scene target with MSAA,
// two-level bloom, optional tilt-shift (miniature dioramas), vignette,
// colour grade and film grain, then tone mapping. One draw of the scene,
// a handful of half/quarter-resolution blur passes, one composite.
import * as THREE from 'three';

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const BLUR = `varying vec2 vUv; uniform sampler2D t; uniform vec2 dir; uniform float thr;
void main(){ vec3 c = vec3(0.0); float w[5]; w[0]=0.227; w[1]=0.194; w[2]=0.121; w[3]=0.054; w[4]=0.016;
  for (int i = -4; i <= 4; i++) { vec3 s = texture2D(t, vUv + dir * float(i) * 1.4).rgb; if (thr > 0.0) { float l = max(s.r, max(s.g, s.b)); s *= smoothstep(thr, thr + 0.6, l); } c += s * w[i < 0 ? -i : i]; }
  gl_FragColor = vec4(c, 1.0); }`;
// Screen-space light shafts (GPU Gems 3, ch. 13): radial blur of the bright buffer toward the light's screen position.
const RAYS = `varying vec2 vUv; uniform sampler2D t; uniform vec2 lp; uniform float dens, decay;
void main(){ vec2 d = (vUv - lp) * dens / 72.0, uv = vUv; vec3 c = vec3(0.0); float il = 1.0;
  for (int i = 0; i < 72; i++) { uv -= d; c += texture2D(t, clamp(uv, 0.001, 0.999)).rgb * il; il *= decay; }
  gl_FragColor = vec4(c / 72.0 * 4.0, 1.0); }`;
const COMP = `varying vec2 vUv; uniform sampler2D tS, tB1, tB2, tT, tR; uniform float bloom, tilt, focus, vig, sat, grain, time, con, rays; uniform vec3 tint, rayCol;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main(){ vec3 c = texture2D(tS, vUv).rgb;
  if (tilt > 0.0) { float k = smoothstep(0.08, 0.5, abs(vUv.y - focus)) * tilt; c = mix(c, texture2D(tT, vUv).rgb, clamp(k, 0.0, 1.0)); }
  c += (texture2D(tB1, vUv).rgb * 0.6 + texture2D(tB2, vUv).rgb) * bloom;
  if (rays > 0.0) c += texture2D(tR, vUv).rgb * rayCol * rays;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, sat) * tint; c = (c - 0.18) * con + 0.18;
  vec2 q = vUv - 0.5; c *= 1.0 - vig * smoothstep(0.25, 0.85, length(q) * 1.25);
  c = max(c, 0.0); gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (h(vUv * 911.0) - 0.5) * grain; }`;

export class PostFX {
  constructor(r) {
    this.r = r; this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); this.quad.frustumCulled = false; this.scene.add(this.quad);
    this.blur = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: BLUR, uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() }, thr: { value: 0 } }, depthTest: false, depthWrite: false, toneMapped: false });
    this.comp = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: COMP, depthTest: false, depthWrite: false, uniforms: { tS: { value: null }, tB1: { value: null }, tB2: { value: null }, tT: { value: null }, bloom: { value: 0.6 }, tilt: { value: 0 }, focus: { value: 0.5 }, vig: { value: 0.3 }, sat: { value: 1 }, grain: { value: 0.03 }, time: { value: 0 }, con: { value: 1 }, tint: { value: new THREE.Vector3(1, 1, 1) }, tR: { value: null }, rays: { value: 0 }, rayCol: { value: new THREE.Vector3(1, 1, 1) } } });
    this.raysM = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: RAYS, uniforms: { t: { value: null }, lp: { value: new THREE.Vector2(0.5, 0.5) }, dens: { value: 0.9 }, decay: { value: 0.965 } }, depthTest: false, depthWrite: false, toneMapped: false });
    this.w = 0; this.h = 0; this.size = new THREE.Vector2();
  }
  rt(w, h, o = {}) { return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o }); }
  ensure(w, h, msaa) {
    if (w === this.w && h === this.h) return; this.w = w; this.h = h; for (const k of ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G']) this[k]?.dispose();
    this.S = this.rt(w, h, { depthBuffer: true, samples: msaa }); this.A = this.rt(w >> 1, h >> 1); this.B = this.rt(w >> 1, h >> 1); this.C = this.rt(w >> 2, h >> 2); this.D = this.rt(w >> 2, h >> 2); this.E = this.rt(w >> 2, h >> 2); this.F = this.rt(w >> 2, h >> 2); this.G = this.rt(w >> 1, h >> 1);
  }
  pass(src, dst, dx, dy, thr = 0) { const u = this.blur.uniforms; u.t.value = src.texture; u.dir.value.set(dx / src.width, dy / src.height); u.thr.value = thr; this.quad.material = this.blur; this.r.setRenderTarget(dst); this.r.render(this.scene, this.cam); }
  render(scene, cam, o = {}) {
    const r = this.r; r.getDrawingBufferSize(this.size); this.ensure(this.size.x, this.size.y, o.msaa ?? 4);
    r.setRenderTarget(this.S); r.render(scene, cam);
    const thr = o.threshold ?? 1.05;
    this.pass(this.S, this.A, 1, 0, thr); this.pass(this.A, this.B, 0, 1); this.pass(this.B, this.A, 1, 0);
    this.pass(this.A, this.C, 0, 1.5); this.pass(this.C, this.D, 2, 0); this.pass(this.D, this.C, 0, 2);
    const tilt = o.tilt ?? 0; if (tilt > 0) { this.pass(this.S, this.E, 2.5, 0); this.pass(this.E, this.F, 0, 2.5); this.pass(this.F, this.E, 2, 0); this.pass(this.E, this.F, 0, 2); }
    const rays = o.rays ?? 0; if (rays > 0) { const q = this.raysM.uniforms; q.t.value = this.A.texture; q.lp.value.set(o.rayPos?.[0] ?? 0.5, o.rayPos?.[1] ?? 0.5); q.dens.value = o.rayDens ?? 0.9; q.decay.value = o.rayDecay ?? 0.965; this.quad.material = this.raysM; r.setRenderTarget(this.G); r.render(this.scene, this.cam); }
    const u = this.comp.uniforms; u.tR.value = this.G.texture; u.rays.value = rays; const rc = o.rayCol || [1, 0.9, 0.75]; u.rayCol.value.set(rc[0], rc[1], rc[2]); u.tS.value = this.S.texture; u.tB1.value = this.A.texture; u.tB2.value = this.C.texture; u.tT.value = this.F.texture;
    u.bloom.value = o.bloom ?? 0.6; u.tilt.value = tilt; u.focus.value = o.focus ?? 0.5; u.vig.value = o.vig ?? 0.3; u.sat.value = o.sat ?? 1.05; u.grain.value = o.grain ?? 0.025; u.con.value = o.con ?? 1.04; u.time.value = performance.now() * 0.001 % 10; const t = o.tint || [1, 1, 1]; u.tint.value.set(t[0], t[1], t[2]);
    this.quad.material = this.comp; r.setRenderTarget(null); r.render(this.scene, this.cam);
  }
}
// Render through the shared pipeline unless post-processing is switched off.
export function renderFX(game, r, scene, cam, o) {
  if (!game.settings.post) { r.setRenderTarget(null); r.render(scene, cam); return; }
  (game.post ||= new PostFX(r)).render(scene, cam, { ...o, msaa: game.settings.post > 1 ? 4 : 0 });
}
