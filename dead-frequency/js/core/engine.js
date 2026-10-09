'use strict';
// Renderer, VHS post-process, offscreen views (mirrors, CCTV, rear-view), level lifecycle.

const VHS_FRAG = `
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float time, strength, distort, brightness, tracking, gray;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
vec3 aces(vec3 c){ vec3 a = c*(2.51*c+0.03); vec3 b = c*(2.43*c+0.59)+0.14; return clamp(a/b, 0., 1.); }
void main(){
  vec2 uv = vUv;
  float s = strength;
  float ln = floor(uv.y * res.y);
  float j = (hash(vec2(ln, floor(time*24.))) - .5) * (0.0007 + distort*0.014) * s;
  float bandY = fract(time*0.045 + tracking*0.37);
  float band = exp(-pow((uv.y - bandY)*38., 2.)) * (0.0025*s + distort*0.03 + tracking*0.025);
  uv.x += j + band * (hash(vec2(ln, time)) - .5) * 5.;
  float hs = smoothstep(0.03, 0.0, uv.y);
  uv.x += hs * 0.012 * sin(time*47. + uv.y*280.) * s;
  float ca = (0.0012 + distort*0.007) * s;
  vec3 col;
  col.r = texture2D(tDiffuse, uv + vec2(ca, 0.)).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - vec2(ca, 0.)).b;
  vec2 px = 1.0 / res;
  vec3 blur = (texture2D(tDiffuse, uv + vec2(2.*px.x,0.)).rgb + texture2D(tDiffuse, uv - vec2(2.*px.x,0.)).rgb
             + texture2D(tDiffuse, uv + vec2(5.*px.x,0.)).rgb + texture2D(tDiffuse, uv - vec2(5.*px.x,0.)).rgb) * 0.25;
  float Y = dot(col, vec3(.299,.587,.114));
  float Yb = dot(blur, vec3(.299,.587,.114));
  col = mix(col, vec3(Y) + (blur - vec3(Yb)), 0.55 * s);
  vec3 glow = vec3(0.);
  for (int i = 0; i < 8; i++) { float a = float(i) * 0.785 + 0.3; vec2 o = vec2(cos(a), sin(a)) * px * 7.; glow += max(texture2D(tDiffuse, uv + o).rgb - 0.75, 0.); glow += max(texture2D(tDiffuse, uv + o*2.2).rgb - 0.9, 0.) * 0.6; }
  col += glow * 0.1;
  col = aces(col * brightness * 1.15);
  col = pow(col, vec3(1./2.2));
  float L = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(L), col, mix(0.8, 0.0, gray));
  col *= vec3(1.03, 1.0, 0.93);
  col = col * 0.93 + 0.03;
  col *= 0.94 + 0.06 * sin(vUv.y * res.y * 3.14159);
  float n = hash(vUv * res + fract(time * 7.13) * 100.) - .5;
  col += n * (0.05 + distort * 0.3) * s;
  col += band * 6.;
  col += hs * 0.12 * s * hash(vec2(time, uv.y));
  vec2 vv = vUv - .5; col *= 1. - dot(vv, vv) * 1.05;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}`;
const VHS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// grayscale CCTV display material for monitors
const CCTV_FRAG = `
uniform sampler2D map; uniform float time, on; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv; uv.x += (hash(vec2(floor(uv.y*120.), floor(time*12.))) - .5) * 0.004;
  vec3 c = texture2D(map, uv).rgb;
  float l = dot(c, vec3(.3,.59,.11)); l = pow(clamp(l*2.6, 0., 1.), 0.6);
  l *= 0.85 + 0.15 * sin(vUv.y * 480.);
  l += (hash(vUv * 300. + time) - .5) * 0.18;
  gl_FragColor = vec4(vec3(l) * vec3(0.85, 1.0, 0.9) * on, 1.);
}`;

const Engine = {
  views: [],
  shakeAmt: 0, shakeT: 0,
  distortBase: 0, distortPulse: 0,
  tracking: 0,
  gray: 0,

  init() {
    const r = this.renderer = G.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.setPixelRatio(1);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    TEX.maxAniso = Math.min(4, r.capabilities.getMaxAnisotropy());
    document.getElementById('view').appendChild(r.domElement);

    const scene = this.scene = G.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const cam = this.camera = G.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 600);
    scene.add(cam);

    this.rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, depthBuffer: true });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.rt.texture }, res: { value: new THREE.Vector2(16, 16) }, time: { value: 0 }, strength: { value: 1 }, distort: { value: 0 }, brightness: { value: 1 }, tracking: { value: 0 }, gray: { value: 0 } },
      vertexShader: VHS_VERT, fragmentShader: VHS_FRAG, depthTest: false, depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    window.addEventListener('resize', () => this.resize());
    this.resize();
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    const ih = Math.min(h, 540), iw = Math.round(ih * w / h);
    this.rt.setSize(iw, ih);
    this.post.uniforms.res.value.set(iw, ih);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  },

  shake(amt, dur = 0.4) { this.shakeAmt = Math.max(this.shakeAmt, amt); this.shakeT = Math.max(this.shakeT, dur); },
  glitch(amt = 1, dur = 0.5) { this.distortPulse = Math.max(this.distortPulse, amt); this._glitchDecay = amt / dur; },

  // offscreen camera views (CCTV, mirrors). fn(view) called before render to update camera.
  addView(o) {
    const v = Object.assign({ fps: 10, timer: 0, enabled: () => true, rt: new THREE.WebGLRenderTarget(o.w || 256, o.h || 192, { type: THREE.UnsignedByteType }) }, o);
    v.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.views.push(v);
    return v;
  },
  removeViews() { for (const v of this.views) v.rt.dispose(); this.views = []; },
  cctvMaterial(view) {
    return new THREE.ShaderMaterial({ uniforms: { map: { value: view.rt.texture }, time: { value: 0 }, on: { value: 1 } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`, fragmentShader: CCTV_FRAG });
  },

  render(dt) {
    const r = this.renderer;
    // shake
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * Math.min(1, this.shakeT * 3);
      this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    // offscreen views
    for (const v of this.views) {
      if (!v.enabled()) continue;
      v.timer -= dt;
      if (v.timer > 0) continue;
      v.timer = 1 / v.fps;
      if (v.before) v.before(v);
      const hidden = v.hide || [];
      hidden.forEach(o => { o._wasVis = o.visible; o.visible = false; });
      r.setRenderTarget(v.rt);
      r.render(this.scene, v.camera);
      hidden.forEach(o => { o.visible = o._wasVis; });
      if (v.after) v.after(v);
    }
    r.setRenderTarget(this.rt);
    r.render(this.scene, this.camera);
    r.setRenderTarget(null);
    if (this.distortPulse > 0) this.distortPulse = Math.max(0, this.distortPulse - (this._glitchDecay || 1) * dt);
    const u = this.post.uniforms;
    u.time.value = G.time + performance.now() * 0.0001;
    u.strength.value = G.settings.vhs;
    u.distort.value = this.distortBase + this.distortPulse;
    u.brightness.value = G.settings.brightness * (this.exposure || 1);
    u.tracking.value = this.tracking;
    u.gray.value = this.gray;
    r.render(this.postScene, this.postCam);
  },

  // ---- level lifecycle ----
  loadLevel(build, opts = {}) {
    this.unloadLevel();
    Phys.reset();
    const lvl = build(opts);
    G.level = lvl;
    this.scene.add(lvl.root);
    this.scene.fog = lvl.fog || null;
    this.scene.background = lvl.background || new THREE.Color(0x000000);
    if (lvl.reverb) { SND.setReverb(lvl.reverb[0], lvl.reverb[1]); SND.setReverbMix(lvl.reverb[2] == null ? 0.25 : lvl.reverb[2]); }
    if (lvl.onLoad) lvl.onLoad();
    Phys.ready = true;
    return lvl;
  },
  unloadLevel() {
    const lvl = G.level;
    if (!lvl) return;
    if (lvl.onUnload) lvl.onUnload();
    for (const s of lvl.speakers) s.stop();
    for (const l of lvl.loops) l.stop(0.2);
    this.scene.remove(lvl.root);
    lvl.root.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    this.removeViews();
    Interact.clear();
    G.level = null;
  },
};
