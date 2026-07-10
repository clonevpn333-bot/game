/* ============================================================
 * Engine: renderer, atmosphere, pools (particles/tracers/decals/
 * lights), input (pointer lock + fallback), main loop.
 * ============================================================ */
RT.settings = {
  sens: 1.0, fov: 80, volume: 0.8, quality: 1, // 0 low, 1 high
};
try {
  const s = JSON.parse(localStorage.getItem('rt_settings') || 'null');
  if (s) Object.assign(RT.settings, s);
} catch (e) { /* private mode */ }
RT.saveSettings = () => { try { localStorage.setItem('rt_settings', JSON.stringify(RT.settings)); } catch (e) {} };

RT.engine = (() => {
  const E = {};
  let renderer, scene, camera, sun, hemi, fillDir, skyMesh, sunDisc, sunGlow;
  const world = new THREE.Group();
  E.timeScale = 1; E.time = 0; E.frameMS = 16;

  E.init = function () {
    RT.initMaterials();
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RT.settings.quality ? 2 : 1));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    RT.$('game').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(RT.settings.fov, innerWidth / innerHeight, 0.05, 2400);
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    scene.add(world);

    sun = new THREE.DirectionalLight(0xffe0b0, 2.2);
    sun.castShadow = true;
    const sz = RT.settings.quality ? 2048 : 1024;
    sun.shadow.mapSize.set(sz, sz);
    sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0018;
    sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);

    hemi = new THREE.HemisphereLight(0x8fa8c0, 0x4a4238, 0.55);
    scene.add(hemi);
    fillDir = new THREE.DirectionalLight(0xbaccdd, 0.25);
    fillDir.position.set(-40, 60, -30);
    scene.add(fillDir);

    /* sky dome: vertex-gradient sphere + sun disc */
    const skyGeo = new THREE.SphereGeometry(1600, 32, 18);
    const cols = new Float32Array(skyGeo.attributes.position.count * 3);
    skyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    skyMesh = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyMesh.renderOrder = -10; skyMesh.frustumCulled = false;
    scene.add(skyMesh);
    sunDisc = new THREE.Mesh(new THREE.CircleGeometry(38, 20), new THREE.MeshBasicMaterial({ color: 0xffedca, fog: false, depthWrite: false }));
    sunGlow = new THREE.Mesh(new THREE.CircleGeometry(130, 20), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.28, fog: false, depthWrite: false }));
    sunDisc.renderOrder = -9; sunGlow.renderOrder = -9;
    scene.add(sunDisc); scene.add(sunGlow);

    scene.fog = new THREE.FogExp2(0xc8b49a, 0.006);

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    initParticles(); initTracers(); initDecals(); initLights();
  };

  E.applyQuality = function () {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RT.settings.quality ? 2 : 1));
    const sz = RT.settings.quality ? 2048 : 1024;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.mapSize.set(sz, sz);
  };

  /* palette: {top,horizon,ground,sunDir(Vector3),sunColor,sunIntensity,
   *           hemiSky,hemiGround,hemiIntensity,fogColor,fogDensity,exposure} */
  E.setAtmosphere = function (p) {
    const geo = skyMesh.geometry, pos = geo.attributes.position, col = geo.attributes.color;
    const top = RT.lin(p.top), hor = RT.lin(p.horizon), gnd = RT.lin(p.ground || p.horizon);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 1600;
      let c;
      if (y >= 0) { const t = Math.pow(smoothstep(0, 1, y), 0.62); c = hor.clone().lerp(top, t); }
      else { c = hor.clone().lerp(gnd, smoothstep(0, 1, -y * 3)); }
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    const sd = p.sunDir.clone().normalize();
    sun.position.copy(sd).multiplyScalar(160);
    sun.color.set(p.sunColor); sun.intensity = p.sunIntensity;
    sunDisc.position.copy(sd).multiplyScalar(1500);
    sunGlow.position.copy(sd).multiplyScalar(1490);
    sunDisc.lookAt(0, 0, 0); sunGlow.lookAt(0, 0, 0);
    sunDisc.material.color.set(p.sunDiscColor || 0xffedca).convertSRGBToLinear();
    sunGlow.material.color.set(p.sunDiscColor || 0xffd9a0).convertSRGBToLinear();
    sunGlow.material.opacity = p.sunGlow != null ? p.sunGlow : 0.28;
    sunDisc.visible = sunGlow.visible = p.sunVisible !== false;
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiIntensity;
    fillDir.intensity = p.fillIntensity != null ? p.fillIntensity : 0.25;
    scene.fog.color.set(p.fogColor).convertSRGBToLinear(); scene.fog.density = p.fogDensity;
    renderer.setClearColor(scene.fog.color);
    renderer.toneMappingExposure = p.exposure != null ? p.exposure : 1.05;
    E.basePalette = p;
  };

  E.clearWorld = function () {
    const kill = o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map) o.material.map.dispose();
    };
    world.traverse(kill);
    while (world.children.length) world.remove(world.children[0]);
  };

  /* shadow camera follows the player/camera */
  const _sv = new THREE.Vector3();
  E.updateSun = function (focus) {
    _sv.copy(sun.position).normalize();
    sun.position.copy(focus).addScaledVector(_sv, 160);
    sun.target.position.copy(focus);
    skyMesh.position.copy(focus);
    sunDisc.position.copy(focus).addScaledVector(_sv, 1500);
    sunGlow.position.copy(focus).addScaledVector(_sv, 1490);
    sunDisc.lookAt(focus); sunGlow.lookAt(focus);
  };

  /* ---------- particle system: one Points draw call ---------- */
  const PMAX = 3000;
  let pGeo, pPts, pPos, pCol, pSize, pVel, pLife, pLife0, pGrav, pDrag, pShrink, pCount = 0;
  function initParticles() {
    pGeo = new THREE.BufferGeometry();
    pPos = new Float32Array(PMAX * 3); pCol = new Float32Array(PMAX * 4); pSize = new Float32Array(PMAX);
    pVel = new Float32Array(PMAX * 3); pLife = new Float32Array(PMAX); pLife0 = new Float32Array(PMAX);
    pGrav = new Float32Array(PMAX); pDrag = new Float32Array(PMAX); pShrink = new Float32Array(PMAX);
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 4));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'attribute vec4 aColor; attribute float aSize; varying vec4 vC;' +
        'void main(){ vC=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0);' +
        'gl_PointSize=aSize*(240.0/max(1.0,-mv.z)); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5;' +
        'float a=smoothstep(0.5,0.12,length(d)); gl_FragColor=vec4(vC.rgb,vC.a*a); if(gl_FragColor.a<0.01) discard; }',
    });
    pPts = new THREE.Points(pGeo, mat);
    pPts.frustumCulled = false; pPts.renderOrder = 5;
    scene.add(pPts);
    pGeo.setDrawRange(0, 0);
  }
  const _pc = new THREE.Color();
  E.particle = function (x, y, z, vx, vy, vz, o) {
    if (pCount >= PMAX) return;
    const i = pCount++;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
    _pc.set(o.color).convertSRGBToLinear();
    pCol[i * 4] = _pc.r; pCol[i * 4 + 1] = _pc.g; pCol[i * 4 + 2] = _pc.b; pCol[i * 4 + 3] = o.alpha != null ? o.alpha : 1;
    pSize[i] = o.size || 0.2;
    pLife[i] = pLife0[i] = o.life || 1;
    pGrav[i] = o.grav != null ? o.grav : -9.8;
    pDrag[i] = o.drag != null ? o.drag : 0.5;
    pShrink[i] = o.grow != null ? o.grow : 0; // negative grows
  };
  function updateParticles(dt) {
    let i = 0;
    while (i < pCount) {
      pLife[i] -= dt;
      if (pLife[i] <= 0) { // swap-remove
        const j = --pCount;
        for (let k = 0; k < 3; k++) { pPos[i * 3 + k] = pPos[j * 3 + k]; pVel[i * 3 + k] = pVel[j * 3 + k]; }
        for (let k = 0; k < 4; k++) pCol[i * 4 + k] = pCol[j * 4 + k];
        pSize[i] = pSize[j]; pLife[i] = pLife[j]; pLife0[i] = pLife0[j];
        pGrav[i] = pGrav[j]; pDrag[i] = pDrag[j]; pShrink[i] = pShrink[j];
        continue;
      }
      const dr = Math.max(0, 1 - pDrag[i] * dt);
      pVel[i * 3] *= dr; pVel[i * 3 + 1] = pVel[i * 3 + 1] * dr + pGrav[i] * dt; pVel[i * 3 + 2] *= dr;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      const lf = pLife[i] / pLife0[i];
      pCol[i * 4 + 3] = Math.min(1, lf * 2) * (pCol[i * 4 + 3] > 0 ? 1 : 0) * Math.min(1, lf * 2);
      pSize[i] = Math.max(0.01, pSize[i] * (1 - pShrink[i] * dt));
      i++;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aColor.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.setDrawRange(0, pCount);
  }

  /* ---------- tracers ---------- */
  const TMAX = 48, tracers = [];
  function initTracers() {
    const geo = new THREE.BoxGeometry(0.03, 0.03, 1.6);
    geo.translate(0, 0, -0.8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false });
    for (let i = 0; i < TMAX; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; scene.add(m);
      tracers.push({ m, t: 0, len: 0, speed: 0, dir: new THREE.Vector3(), from: new THREE.Vector3() });
    }
  }
  E.tracer = function (from, dir, dist, speed) {
    const t = tracers.find(t => !t.m.visible);
    if (!t) return;
    t.m.visible = true; t.t = 0; t.len = dist; t.speed = speed || 320;
    t.from.copy(from); t.dir.copy(dir).normalize();
    t.m.position.copy(from);
    t.m.lookAt(from.x - t.dir.x, from.y - t.dir.y, from.z - t.dir.z);
  };
  function updateTracers(dt) {
    for (const t of tracers) {
      if (!t.m.visible) continue;
      t.t += t.speed * dt;
      if (t.t > t.len) { t.m.visible = false; continue; }
      t.m.position.copy(t.from).addScaledVector(t.dir, t.t);
    }
  }

  /* ---------- decals (impact marks) ---------- */
  const DMAX = 64; const decals = []; let decalIdx = 0;
  function initDecals() {
    const geo = new THREE.CircleGeometry(0.5, 8);
    for (let i = 0; i < DMAX; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x1c1a16, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false; scene.add(m);
      decals.push({ m, life: 0 });
    }
  }
  const _dn = new THREE.Vector3();
  E.decal = function (pos, normal, size, color, life) {
    const d = decals[decalIdx]; decalIdx = (decalIdx + 1) % DMAX;
    d.m.visible = true; d.life = life || 14;
    d.m.material.color.set(color || 0x1c1a16);
    d.m.material.opacity = 0.75;
    d.m.scale.setScalar(size || 0.2);
    d.m.position.copy(pos).addScaledVector(normal, 0.012 + Math.random() * 0.004);
    _dn.copy(pos).add(normal);
    d.m.lookAt(_dn);
  };
  function updateDecals(dt) {
    for (const d of decals) {
      if (!d.m.visible) continue;
      d.life -= dt;
      if (d.life < 2) d.m.material.opacity = Math.max(0, d.life / 2) * 0.75;
      if (d.life <= 0) d.m.visible = false;
    }
  }

  /* ---------- pooled point lights (muzzle, explosions) ---------- */
  const LMAX = 4; const plights = [];
  function initLights() {
    for (let i = 0; i < LMAX; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 20, 2);
      l.visible = false; scene.add(l);
      plights.push({ l, t: 0, t0: 1, i0: 0 });
    }
  }
  E.flash = function (pos, color, intensity, dist, time) {
    let s = plights.find(p => !p.l.visible) || plights[0];
    s.l.visible = true; s.l.position.copy(pos);
    s.l.color.set(color); s.l.intensity = intensity; s.l.distance = dist;
    s.t = s.t0 = time; s.i0 = intensity;
  };
  function updateLights(dt) {
    for (const p of plights) {
      if (!p.l.visible) continue;
      p.t -= dt;
      if (p.t <= 0) { p.l.visible = false; continue; }
      p.l.intensity = p.i0 * (p.t / p.t0);
    }
  }

  /* ---------- weather: rain streaks + storm lightning ---------- */
  let rain = null, rainPos = null, weather = null, lightningT = 5, flashT = 0, thunderQueue = 0;
  const RAIN_N = 420;
  function initRain() {
    const geo = new THREE.BufferGeometry();
    rainPos = new Float32Array(RAIN_N * 6);
    for (let i = 0; i < RAIN_N; i++) seedDrop(i, true);
    geo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.34 }));
    rain.frustumCulled = false;
    scene.add(rain);
  }
  function seedDrop(i, anyY) {
    const c = camera ? camera.position : { x: 0, y: 10, z: 0 };
    const x = c.x + (Math.random() - 0.5) * 42;
    const y = c.y + (anyY ? Math.random() * 22 - 4 : 14 + Math.random() * 8);
    const z = c.z + (Math.random() - 0.5) * 42;
    rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z;
    rainPos[i * 6 + 3] = x + 0.12; rainPos[i * 6 + 4] = y - 0.55; rainPos[i * 6 + 5] = z;
  }
  E.setWeather = function (type) {
    weather = type;
    if ((type === 'rain' || type === 'storm') && !rain) initRain();
    if (rain) rain.visible = type === 'rain' || type === 'storm';
    lightningT = 4;
  };
  function updateWeather(raw) {
    if (rain && rain.visible) {
      const fall = weather === 'storm' ? 32 : 24;
      for (let i = 0; i < RAIN_N; i++) {
        rainPos[i * 6 + 1] -= fall * raw; rainPos[i * 6 + 4] -= fall * raw;
        rainPos[i * 6] += 3.5 * raw; rainPos[i * 6 + 3] += 3.5 * raw;
        if (rainPos[i * 6 + 1] < camera.position.y - 8) seedDrop(i, false);
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    if (weather === 'storm') {
      lightningT -= raw;
      if (lightningT <= 0) {
        lightningT = 5 + Math.random() * 9;
        flashT = 0.14 + Math.random() * 0.1;
        thunderQueue = 0.5 + Math.random() * 1.6;
      }
      if (thunderQueue > 0) {
        thunderQueue -= raw;
        if (thunderQueue <= 0 && RT.audio) RT.audio.thunder(0);
      }
      if (flashT > 0) {
        flashT -= raw;
        const on = flashT > 0 && (flashT > 0.1 || Math.random() > 0.4);
        sun.intensity = (E.basePalette ? E.basePalette.sunIntensity : 1) * (on ? 7 : 1);
        hemi.intensity = (E.basePalette ? E.basePalette.hemiIntensity : 0.4) * (on ? 5 : 1);
        renderer.toneMappingExposure = (E.basePalette && E.basePalette.exposure || 1) * (on ? 1.5 : 1);
      }
    }
  }

  /* ---------- camera shake ---------- */
  let trauma = 0;
  E.shake = a => { trauma = Math.min(1.2, trauma + a); };
  E.getShakeOffset = function (out) {
    const t2 = trauma * trauma;
    out.x = t2 * 0.045 * (RT.noise(E.time * 34, 7.3));
    out.y = t2 * 0.05 * (RT.noise(E.time * 31, 41.7));
    out.z = t2 * 0.03 * (RT.noise(E.time * 29, 83.1));
    return out;
  };
  Object.defineProperty(E, 'trauma', { get: () => trauma });

  /* ---------- main loop ---------- */
  const updaters = [];
  E.onUpdate = fn => updaters.push(fn);
  let last = 0, emaMS = 16;
  E.start = function () {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const raw = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      emaMS = emaMS * 0.95 + (raw * 1000) * 0.05;
      E.frameMS = emaMS;
      const dt = raw * E.timeScale;
      E.time += dt;
      trauma = Math.max(0, trauma - raw * 1.7);
      for (const u of updaters) u(dt, raw);
      updateParticles(dt); updateTracers(dt); updateDecals(dt); updateLights(dt); updateWeather(raw);
      renderer.render(scene, camera);
    };
    requestAnimationFrame(loop);
  };

  Object.defineProperties(E, {
    scene: { get: () => scene }, camera: { get: () => camera },
    world: { get: () => world }, renderer: { get: () => renderer },
    sun: { get: () => sun },
  });
  return E;
})();

/* ============================================================
 * Input: pointer lock mouse-look with arrow-key fallback.
 * ============================================================ */
RT.input = (() => {
  const I = { keys: {}, mdx: 0, mdy: 0, fire: false, aim: false, locked: false, fallback: false, wheel: 0 };
  const pressed = {};
  I.pressed = k => { const v = pressed[k]; pressed[k] = false; return v; };
  I.consumeMouse = () => { const r = [I.mdx, I.mdy]; I.mdx = I.mdy = 0; return r; };

  I.init = function (dom) {
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      I.keys[e.code] = true; pressed[e.code] = true;
      if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyL') { I.fallback = !I.fallback; if (RT.ui) RT.ui.toastMsg(I.fallback ? 'ARROW-KEY LOOK ENABLED' : 'ARROW-KEY LOOK DISABLED'); }
    });
    document.addEventListener('keyup', e => { I.keys[e.code] = false; });
    dom.addEventListener('mousemove', e => {
      if (!I.locked) return;
      I.mdx += e.movementX; I.mdy += e.movementY;
    });
    dom.addEventListener('mousedown', e => {
      if (e.button === 0) { I.fire = true; pressed.Mouse0 = true; }
      if (e.button === 2) { I.aim = true; pressed.Mouse2 = true; }
    });
    dom.addEventListener('mouseup', e => {
      if (e.button === 0) I.fire = false;
      if (e.button === 2) I.aim = false;
    });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('wheel', e => { I.wheel += Math.sign(e.deltaY); });
    document.addEventListener('pointerlockchange', () => {
      I.locked = document.pointerLockElement === dom;
      if (!I.locked && RT.game && RT.game.state === 'play') RT.game.pause();
    });
    document.addEventListener('pointerlockerror', () => {
      I.fallback = true;
      if (RT.ui) RT.ui.toastMsg('POINTER LOCK UNAVAILABLE — ARROW KEYS TO LOOK, L TO TOGGLE');
    });
    I.dom = dom;
  };
  I.lock = () => { try { I.dom.requestPointerLock(); } catch (e) { I.fallback = true; } };
  I.unlock = () => { if (I.locked) document.exitPointerLock(); };
  return I;
})();
