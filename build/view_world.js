/* =====================================================================
   view_world.js — the 3D world for Bean Royale (Fall Guys tribute).

   Procedural Three.js (r160) scene graph. NO external assets, NO WebGL
   renderer calls — we only build / update Object3D graphs. The host
   renderer uses ACES tone-mapping + PCF soft shadows + sRGB output, so
   materials lean on physical roughness/metalness and keep emissive
   restrained (it blooms under tone-mapping otherwise).

   Coordinate mapping (sim is top-down logical X/Y, Z = height; world is
   Y-up):  logical (x, y) at height z  ->  world (x, z, y).
   "Up the race course" is decreasing logical y  (toward world -Z).

   Top-level symbols (no import/export/require; `THREE` is a free var):
     setupEnvironment(scene) -> {sun, hemi, sky, update(dt,t)}
     makeObstacleView(ob)    -> {object3d, update(ob,dt,t), dispose()}
     class CourseView        -> course geometry per round
   ===================================================================== */

/* logical (x, y) at height z -> world Vector3 (x, z, y) */
const W = (x, y, z = 0) => new THREE.Vector3(x, z, y);

const HAS_DOC = (typeof document !== 'undefined' && !!document.createElement);

/* =====================================================================
   Palette — one tidy bubblegum theme everything pulls from.
   ===================================================================== */
const WPAL = {
    skyTop:   0x4fb0ff,   // bright clean blue zenith
    skyMid:   0x9fd6ff,
    skyHaze:  0xffe6f3,   // soft white-pink horizon haze
    fog:      0xe9f4ff,   // very soft horizon fog
    track:    0x8fd4ff,   // pastel track blue
    trackAlt: 0xb6e6ff,
    curb:     0xff5fa2,   // candy pink curb (inflatable pink)
    curbLt:   0xff8cc0,   // lighter inflatable highlight
    gold:     0xffd34d,   // accent gold
    crown:    0xffce3a,   // crown gold
    mint:     0x8af0cf,
    grape:    0x9a6cff,
    grapeDk:  0x6f3ec8,
    slime:    0xff3fb0,   // hot magenta-pink slime
    slimeDk:  0x9c1f86,
    cloud:    0xfffafd,
    wood:     0xc9a063,   // door panel
    woodDk:   0x9a743f,
    chkPink:  0xff5fa2,   // checker pink
    chkWhite: 0xfff3fb,   // checker white
    mtnA:     0xbfe0ff,   // pastel mountain blue
    mtnB:     0xd8c6ff,   // pastel mountain lavender
    mtnC:     0xffd6ec,   // pastel mountain pink
    mtnSnow:  0xfff8ff,   // mountain snow cap
};

/* =====================================================================
   Small shared helpers
   ===================================================================== */

// parse a CSS hex / named color into a THREE.Color (safe fallback).
function col(c, fallback) {
    try {
        if (c instanceof THREE.Color) return c.clone();
        if (c == null) return new THREE.Color(fallback != null ? fallback : 0xffffff);
        return new THREE.Color(c);
    } catch (e) {
        return new THREE.Color(fallback != null ? fallback : 0xffffff);
    }
}

// lighten (t>0) / darken (t<0) a color toward white / black.
function shade(c, t) {
    const out = (c instanceof THREE.Color) ? c.clone() : col(c);
    if (t >= 0) out.lerp(new THREE.Color(0xffffff), t);
    else out.lerp(new THREE.Color(0x000000), -t);
    return out;
}

// nudge saturation/value of a color for richer, less flat pastels.
function pop(c, dS, dL) {
    const base = (c instanceof THREE.Color) ? c.clone() : col(c);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    base.setHSL(hsl.h,
        THREE.MathUtils.clamp(hsl.s + (dS || 0), 0, 1),
        THREE.MathUtils.clamp(hsl.l + (dL || 0), 0, 1));
    return base;
}

// standard playful pastel material.
function mat(color, opts) {
    opts = opts || {};
    const params = {
        color: col(color, 0xffffff),
        roughness: opts.roughness != null ? opts.roughness : 0.62,
        metalness: opts.metalness != null ? opts.metalness : 0.04,
        flatShading: !!opts.flat,
    };
    if (opts.emissive != null) params.emissive = col(opts.emissive, 0x000000);
    if (opts.emissiveIntensity != null) params.emissiveIntensity = opts.emissiveIntensity;
    if (opts.transparent) params.transparent = true;
    if (opts.opacity != null) params.opacity = opts.opacity;
    if (opts.side != null) params.side = opts.side;
    if (opts.fog === false) params.fog = false;
    return new THREE.MeshStandardMaterial(params);
}

// glossy candy material (low roughness, slight metal) for accents/pads.
function gloss(color, opts) {
    opts = opts || {};
    return mat(color, Object.assign({ roughness: 0.18, metalness: 0.12 }, opts));
}

// soft glossy INFLATABLE material — balloon-like vinyl: low roughness,
// a clearcoat sheen, a touch of emissive so the pink stays vivid even in
// shadow. Uses MeshPhysicalMaterial (clearcoat); plain Standard otherwise.
function inflate(color, opts) {
    opts = opts || {};
    const base = col(color, WPAL.curb);
    const params = {
        color: base,
        roughness: opts.roughness != null ? opts.roughness : 0.22,
        metalness: opts.metalness != null ? opts.metalness : 0.0,
        emissive: col(opts.emissive != null ? opts.emissive : shade(base, -0.4)),
        emissiveIntensity: opts.emissiveIntensity != null ? opts.emissiveIntensity : 0.06,
    };
    if (opts.transparent) params.transparent = true;
    if (opts.opacity != null) params.opacity = opts.opacity;
    if (opts.side != null) params.side = opts.side;
    if (opts.fog === false) params.fog = false;
    let m;
    if (typeof THREE.MeshPhysicalMaterial === 'function') {
        params.clearcoat = opts.clearcoat != null ? opts.clearcoat : 0.85;
        params.clearcoatRoughness = opts.clearcoatRoughness != null ? opts.clearcoatRoughness : 0.28;
        m = new THREE.MeshPhysicalMaterial(params);
    } else {
        m = new THREE.MeshStandardMaterial(params);
    }
    return m;
}

// a rounded soft "pillow" via a Capsule laid along an axis ('x'|'y'|'z').
// length is the full tip-to-tip span; r the rounded radius. Returns a Mesh.
function pillow(length, r, axis, material) {
    r = Math.max(0.5, r);
    const cyl = Math.max(0.01, length - r * 2);   // cylindrical middle length
    const geo = new THREE.CapsuleGeometry(r, cyl, 8, 16);
    const mesh = new THREE.Mesh(geo, material);    // capsule is along local Y
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    return mesh;
}

// flag a mesh (and descendants) to cast / receive shadows.
function shadowy(obj, cast, receive) {
    obj.traverse((o) => {
        if (o.isMesh) {
            if (cast != null) o.castShadow = cast;
            if (receive != null) o.receiveShadow = receive;
        }
    });
    return obj;
}

// recursively dispose geometries + materials under a root.
function disposeTree(root) {
    if (!root) return;
    root.traverse((o) => {
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
        if (o.material) {
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of ms) {
                if (m && m.map && m.map.dispose) m.map.dispose();
                if (m && m.dispose) m.dispose();
            }
        }
    });
    if (root.parent) root.parent.remove(root);
}

/* A rounded "pill" box: a Box with little cap cylinders/spheres would be
   pricey; instead we cheat a chunky-soft look by scaling a Box and adding
   nothing — but for the few hero pieces we build a true rounded slab via
   an ExtrudeGeometry of a rounded rectangle. Returns a Mesh.            */
function roundedSlab(w, h, d, r, material) {
    r = Math.max(0.5, Math.min(r, w / 2 - 0.1, h / 2 - 0.1));
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    const geo = new THREE.ExtrudeGeometry(s, {
        depth: d, bevelEnabled: true,
        bevelThickness: Math.min(r * 0.6, d * 0.25, 4),
        bevelSize: Math.min(r * 0.5, 3),
        bevelSegments: 2, steps: 1,
    });
    geo.center();
    return new THREE.Mesh(geo, material);
}

/* =====================================================================
   Canvas textures (browser only; all guarded). Each returns a
   CanvasTexture or null in Node.
   ===================================================================== */

function vGradientTexture(stops, h) {
    if (!HAS_DOC) return null;
    h = h || 512;
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = h;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of stops) grad.addColorStop(p, c);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, h);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
}

// soft mottled slime texture — blobs of light/dark so the goo isn't flat.
function slimeTexture() {
    if (!HAS_DOC) return null;
    const N = 256;
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    g.fillStyle = '#ff3fb0';
    g.fillRect(0, 0, N, N);
    // bright bubbles
    for (let i = 0; i < 90; i++) {
        const x = Math.random() * N, y = Math.random() * N;
        const r = 4 + Math.random() * 22;
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        const bright = Math.random() > 0.5;
        rad.addColorStop(0, bright ? 'rgba(255,170,225,0.85)' : 'rgba(150,20,120,0.7)');
        rad.addColorStop(1, 'rgba(255,63,176,0)');
        g.fillStyle = rad;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
}

// soft round white sprite-ish blob, used to fake puffy cloud lighting.
function softDiscTexture() {
    if (!HAS_DOC) return null;
    const N = 128;
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const g = cv.getContext('2d');
    const rad = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.7, 'rgba(255,246,255,0.9)');
    rad.addColorStop(1, 'rgba(255,246,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, N, N);
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
}

/* =====================================================================
   ENVIRONMENT — lights, sky dome, fog, drifting clouds.
   ===================================================================== */
function setupEnvironment(scene) {
    // ---- key light: the warm sun, from above & behind the start line ----
    const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
    sun.position.set(-820, 1650, 1150);    // up, to the side, behind start (+Z = down-course)
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -1600; sc.right = 1600;
    sc.top = 1600; sc.bottom = -1600;
    sc.near = 100; sc.far = 4000;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 1.5;
    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 400);     // aim down the play areas
    sun.target = sunTarget;
    scene.add(sun);
    scene.add(sunTarget);

    // ---- soft sky/ground fill so shadowed sides stay lush, not muddy ----
    // brighter, cleaner hemisphere keeps the world cheerful & pastel.
    const hemi = new THREE.HemisphereLight(0xd6f0ff, 0x8c7aa0, 1.05);
    hemi.position.set(0, 1400, 0);
    scene.add(hemi);

    // ---- low ambient floor so nothing reads pure black ----
    const ambient = new THREE.AmbientLight(0xfff6f0, 0.22);
    scene.add(ambient);

    // ---- cool fill from the opposite side (no shadow) to shape forms ----
    const fill = new THREE.DirectionalLight(0xbcd6ff, 0.55);
    fill.position.set(900, 700, -1100);
    fill.castShadow = false;
    scene.add(fill);

    // ---- SKY: big back-side sphere with a vertical pastel gradient ----
    const horizon = col(WPAL.skyHaze).clone().lerp(col(WPAL.skyMid), 0.4);
    const skyGeo = new THREE.SphereGeometry(6000, 32, 20);
    let skyMat;
    // brighter, cleaner cheerful gradient: vivid blue zenith -> airy white-pink.
    const gradTex = vGradientTexture([
        [0.00, '#3aa6ff'],   // zenith vivid clean blue
        [0.38, '#7ec8ff'],
        [0.62, '#bfe6ff'],
        [0.84, '#fff0f8'],
        [1.00, '#ffe6f3'],   // soft white-pink horizon
    ], 512);
    if (gradTex) {
        skyMat = new THREE.MeshBasicMaterial({ map: gradTex, side: THREE.BackSide, fog: false, depthWrite: false });
    } else {
        // Node / headless fallback: a pleasant solid sky blend.
        skyMat = new THREE.MeshBasicMaterial({
            color: col(WPAL.skyMid), side: THREE.BackSide, fog: false, depthWrite: false,
        });
    }
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'sky';
    sky.renderOrder = -1000;
    scene.add(sky);

    // background color (used before the dome draws / if dome culled).
    scene.background = col(WPAL.skyMid).clone().lerp(horizon, 0.4);

    // ---- subtle fog tuned to the horizon haze: soft depth, stays clear ----
    scene.fog = new THREE.Fog(horizon.getHex(), 2400, 6200);

    // ---- a low warm sun-disc / glow on the dome for a focal point ----
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xfff0d8, transparent: true, opacity: 0.55,
        side: THREE.FrontSide, fog: false, depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(520, 32), glowMat);
    glow.position.set(-1900, 2400, 3600);
    glow.lookAt(0, 600, 0);
    glow.renderOrder = -999;
    scene.add(glow);

    // ---- a ring of big low-poly pastel MOUNTAINS on the horizon ----
    // chunky cones with jittered low-seg silhouettes + soft snow caps; they
    // surround every course so the play area always sits in a cheerful basin.
    const mountains = new THREE.Group();
    mountains.name = 'mountains';
    const mtnPals = [WPAL.mtnA, WPAL.mtnB, WPAL.mtnC];
    const ringN = 26;
    for (let i = 0; i < ringN; i++) {
        const ang = (i / ringN) * Math.PI * 2 + (i % 2) * 0.11;
        const dist = 3600 + ((i * 71) % 5) * 240;
        // big chunky peaks, low radial segments for a faceted low-poly read.
        const baseR = 620 + ((i * 53) % 7) * 90;
        const peakH = 1100 + ((i * 37) % 9) * 200;
        const segs = 5 + (i % 3);                 // 5..7 -> low-poly facets
        const mCol = mtnPals[i % mtnPals.length];
        const peakMat = mat(shade(mCol, (i % 2) ? 0.06 : -0.04), { flat: true, roughness: 0.95, metalness: 0.0 });
        const peak = new THREE.Mesh(new THREE.ConeGeometry(baseR, peakH, segs), peakMat);
        // jitter the silhouette so peaks aren't perfect cones.
        const pa = peak.geometry.attributes.position;
        for (let v = 0; v < pa.count; v++) {
            const py = pa.getY(v);
            if (py < peakH * 0.45) {              // leave the apex sharp
                const k = 1 + (((v * 911) % 100) / 100 - 0.5) * 0.16;
                pa.setX(v, pa.getX(v) * k);
                pa.setZ(v, pa.getZ(v) * k);
            }
        }
        pa.needsUpdate = true;
        peak.geometry.computeVertexNormals();
        peak.position.set(Math.cos(ang) * dist, peakH / 2 - 40, Math.sin(ang) * dist);
        peak.rotation.y = (i * 1.7) % Math.PI;
        mountains.add(peak);
        // a soft snow cap: a smaller flat-shaded cone perched on the apex.
        const capH = peakH * 0.34;
        const cap = new THREE.Mesh(
            new THREE.ConeGeometry(baseR * 0.42, capH, segs),
            mat(WPAL.mtnSnow, { flat: true, roughness: 1.0, emissive: 0xfff0ff, emissiveIntensity: 0.06 }));
        cap.position.set(peak.position.x, peakH - capH / 2 - 40, peak.position.z);
        cap.rotation.y = peak.rotation.y;
        mountains.add(cap);
    }
    mountains.renderOrder = -900;
    scene.add(mountains);

    // ---- drifting puffy clouds: clusters of soft lobes ----
    const clouds = new THREE.Group();
    clouds.name = 'clouds';
    const discTex = softDiscTexture();
    const cloudMat = new THREE.MeshStandardMaterial({
        color: WPAL.cloud, roughness: 1.0, metalness: 0.0,
        emissive: 0xfff3ff, emissiveIntensity: 0.35, fog: true,
        transparent: !!discTex, alphaMap: discTex || null,
        depthWrite: false,
    });
    const cloudSeeds = [];
    for (let i = 0; i < 8; i++) {
        const puff = new THREE.Group();
        const lobes = 3 + (i % 4);
        for (let j = 0; j < lobes; j++) {
            const r = 130 + ((i * 53 + j * 37) % 110);
            const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), cloudMat);
            m.position.set((j - lobes / 2) * 150, ((i + j) % 2) * 46, (j % 2) * 70);
            m.scale.set(1, 0.58, 1);
            puff.add(m);
        }
        const ang = (i / 8) * Math.PI * 2;
        const dist = 2700 + (i % 4) * 380;
        puff.position.set(Math.cos(ang) * dist, 1550 + (i % 3) * 300, Math.sin(ang) * dist - 500);
        clouds.add(puff);
        cloudSeeds.push({ puff, baseX: puff.position.x, baseY: puff.position.y, speed: 7 + (i % 5) * 3.5, ph: i * 1.3 });
    }
    scene.add(clouds);

    return {
        sun, hemi, sky, clouds, ambient, fill, glow, mountains,
        update(dt, t) {
            t = t || 0;
            for (const cs of cloudSeeds) {
                let x = cs.baseX + (t * cs.speed) % 9000;
                if (x > 4500) x -= 9000;
                cs.puff.position.x = x + Math.sin(t * 0.05 + cs.ph) * 40;
                cs.puff.position.y = cs.baseY + Math.sin(t * 0.08 + cs.ph) * 18;
            }
        },
    };
}

/* =====================================================================
   OBSTACLE VIEWS — makeObstacleView(ob) dispatches on ob.kind.
   Each returns { object3d, update(ob,dt,t), dispose() }.
   ===================================================================== */

// In the sim, a spinner arm tip is at radius `len` (cx+cos*len). So a bar
// spans 0..len from the hub and we center it at len/2. Overhead bars (no
// height cap / tall) ride higher than low sweepers.
function spinnerLift(ob) {
    return (ob.height != null && ob.height < 200) ? 10 : 34;
}

function makeSpinner(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.cx, ob.cy, 0));

    const color = col(ob.color, WPAL.curb);
    const thick = ob.thick || 18;
    const len = ob.len || 200;             // arm tip radius (matches sim _ends)
    const arms = Math.max(1, ob.arms || 2);
    const lift = spinnerLift(ob);
    const barH = thick * 1.25;
    const barD = thick * 1.25;

    // central post from ground up to the rotor, + a chunky hub.
    const postMat = mat(pop(shade(color, -0.28), 0.05, 0), { roughness: 0.45, metalness: 0.15 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.55, thick * 0.85, lift + barH, 18), postMat);
    post.position.set(0, (lift + barH) / 2, 0);
    group.add(post);
    // a little base plate so the post reads as bolted down.
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.2, thick * 1.35, 6, 20), postMat);
    plate.position.set(0, 3, 0);
    group.add(plate);

    // the rotor carries the arms; we spin THIS about world Y.
    const rotor = new THREE.Object3D();
    rotor.position.set(0, lift + barH * 0.5, 0);
    group.add(rotor);

    const hubMat = gloss(pop(shade(color, -0.12), 0.05, 0), { roughness: 0.3, metalness: 0.25 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.15, thick * 1.15, barH * 1.15, 22), hubMat);
    rotor.add(hub);
    const hubCap = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.55, 16, 12), gloss(WPAL.gold));
    hubCap.position.set(0, barH * 0.6, 0);
    rotor.add(hubCap);

    // each arm: a soft rounded padded bar laid along +X, plus a paddle cap.
    const armMat = mat(color, { roughness: 0.42, metalness: 0.06 });
    const stripeMat = mat(pop(shade(color, 0.4), 0, 0.05), { roughness: 0.35 });
    const capMat = gloss(pop(shade(color, 0.28), 0.05, 0));
    for (let i = 0; i < arms; i++) {
        const a = (i * Math.PI * 2) / arms;
        const arm = new THREE.Object3D();
        arm.rotation.y = -a;   // logical angle a -> world -Y (X/Y -> X/Z handedness)

        const bar = roundedSlab(len, barH, barD, Math.min(barH, barD) * 0.45, armMat);
        bar.position.set(len / 2, 0, 0);
        arm.add(bar);
        // a bright hazard stripe band near the tip.
        const band = new THREE.Mesh(new THREE.BoxGeometry(len * 0.18, barH * 1.02, barD * 1.04), stripeMat);
        band.position.set(len * 0.78, 0, 0);
        arm.add(band);
        // rounded paddle cap at the tip for a beefy toy look.
        const cap = new THREE.Mesh(new THREE.SphereGeometry(barH * 0.72, 16, 12), capMat);
        cap.scale.set(1, 1, 1.15);
        cap.position.set(len, 0, 0);
        arm.add(cap);
        rotor.add(arm);
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            rotor.rotation.y = -((o && o.angle != null) ? o.angle : (ob.angle || 0));
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeHammer(ob) {
    const group = new THREE.Object3D();
    const cx = ob.cx, cy = ob.cy;
    const amp = ob.amp || 280;
    const headR = ob.headR || 30;
    const height = (ob.height != null) ? ob.height : 120;
    // hang the pendulum high enough that the head sweeps above `height`.
    const pivotH = Math.max(height + headR * 2 + 80, headR * 4 + 160);

    // two support towers + a cross-beam straddling the lane.
    const towerMat = mat(WPAL.grape, { roughness: 0.5, metalness: 0.12 });
    const towerTrim = mat(WPAL.gold, { roughness: 0.3, metalness: 0.3 });
    const legW = 30;
    for (const sx of [cx - amp - 70, cx + amp + 70]) {
        const tower = roundedSlab(legW, pivotH, legW, 8, towerMat);
        tower.position.copy(W(sx, cy, pivotH / 2));
        group.add(tower);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(legW * 1.5, 14, legW * 1.5), towerMat);
        foot.position.copy(W(sx, cy, 7));
        group.add(foot);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(legW * 0.6, 16, 12), towerTrim);
        knob.position.copy(W(sx, cy, pivotH));
        group.add(knob);
    }
    const beam = roundedSlab((amp + 70) * 2, 26, 26, 8, towerMat);
    beam.position.copy(W(cx, cy, pivotH));
    group.add(beam);

    // pivot swings in the world X / height plane -> rotate about world Z.
    const pivot = new THREE.Object3D();
    pivot.position.copy(W(cx, cy, pivotH));
    group.add(pivot);

    const armLen = pivotH - height - headR * 0.4;  // length of the swinging rod
    const armMat = gloss(WPAL.grapeDk, { roughness: 0.3, metalness: 0.25 });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, armLen, 14), armMat);
    arm.position.set(0, -armLen / 2, 0);           // hang down from pivot
    pivot.add(arm);
    // chain-ish collar where rod meets head.
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 16, 16), gloss(WPAL.gold));
    collar.position.set(0, -armLen + headR * 0.4, 0);
    pivot.add(collar);

    // chunky wrecking-ball head with studs (a mace).
    const headMat = gloss(WPAL.gold, { roughness: 0.28, metalness: 0.35, emissive: 0x5a3d00, emissiveIntensity: 0.12 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), headMat);
    head.position.set(0, -armLen, 0);
    pivot.add(head);
    const studMat = gloss(shade(WPAL.gold, -0.25), { metalness: 0.4 });
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const stud = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.26, headR * 0.5, 8), studMat);
        stud.position.set(Math.cos(a) * headR, -armLen + Math.sin(a) * headR, 0);
        stud.rotation.z = -a + Math.PI / 2;
        pivot.add(stud);
    }
    // a couple studs poking toward/away (Z) so it reads round from the side.
    for (const dz of [-1, 1]) {
        const stud = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.26, headR * 0.5, 8), studMat);
        stud.position.set(0, -armLen, dz * headR);
        stud.rotation.x = dz < 0 ? Math.PI / 2 : -Math.PI / 2;
        pivot.add(stud);
    }

    shadowy(group, true, true);

    // head world-X must equal cx + sin(phase)*amp. The down-hanging rod's
    // tip X = armLen*sin(theta), so theta = asin(clamp(sin(phase)*amp/armLen)).
    function applyPhase(phase) {
        const desiredX = Math.sin(phase) * amp;
        const ratio = THREE.MathUtils.clamp(desiredX / armLen, -1, 1);
        pivot.rotation.z = Math.asin(ratio);
    }

    const view = {
        object3d: group,
        update(o, dt, t) { applyPhase((o && o.phase != null) ? o.phase : (ob.phase || 0)); },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeDoorWall(ob) {
    const group = new THREE.Object3D();
    const thick = ob.thick || 26;
    const doorH = 240;                     // tall enough you can't peek over
    const frameT = 14;                     // frame border thickness
    const y = ob.y;

    // ground sill across the whole wall.
    const trimMat = mat(WPAL.woodDk, { roughness: 0.7, metalness: 0.05 });
    const sill = new THREE.Mesh(new THREE.BoxGeometry((ob.x1 - ob.x0) + thick, 14, thick + 16), trimMat);
    sill.position.copy(W((ob.x0 + ob.x1) / 2, y, 7));
    group.add(sill);
    // lintel across the top.
    const lintel = new THREE.Mesh(new THREE.BoxGeometry((ob.x1 - ob.x0) + thick, 22, thick + 16), trimMat);
    lintel.position.copy(W((ob.x0 + ob.x1) / 2, y, doorH + 16));
    group.add(lintel);

    // frame posts at each end + between every segment.
    const postGeo = new THREE.BoxGeometry(frameT * 1.4, doorH + 30, thick + 14);
    const colXs = new Set([ob.x0, ob.x1]);
    for (const s of ob.segs) { colXs.add(s.x0); colXs.add(s.x1); }
    for (const px of colXs) {
        const post = new THREE.Mesh(postGeo, trimMat);
        post.position.copy(W(px, y, (doorH + 30) / 2));
        group.add(post);
    }

    // one door panel per segment, parented to a hinge so a broken one swings.
    const panelMat = mat(WPAL.wood, { roughness: 0.55, metalness: 0.05 });
    const panelInset = mat(shade(WPAL.wood, 0.2), { roughness: 0.5 });
    const knobMat = gloss(WPAL.gold, { roughness: 0.2, metalness: 0.5 });
    const panels = [];
    for (const s of ob.segs) {
        const w = s.x1 - s.x0;
        const hinge = new THREE.Object3D();          // hinge on the left jamb
        hinge.position.copy(W(s.x0 + frameT * 0.7, y, 0));
        group.add(hinge);

        const panel = new THREE.Object3D();
        hinge.add(panel);
        const pw = w - frameT * 1.4;                 // leaf width inside frame

        const board = new THREE.Mesh(new THREE.BoxGeometry(pw, doorH - 6, thick), panelMat);
        board.position.set(pw / 2, doorH / 2, 0);
        panel.add(board);
        // two recessed inset panels (front & back) for a real door look.
        for (const sgn of [1, -1]) {
            for (const yy of [doorH * 0.30, doorH * 0.66]) {
                const inset = new THREE.Mesh(
                    new THREE.BoxGeometry(pw * 0.6, doorH * 0.26, thick * 0.35), panelInset);
                inset.position.set(pw / 2, yy, sgn * thick * 0.4);
                panel.add(inset);
            }
        }
        // door knob near the free (right) edge, both faces.
        for (const sgn of [1, -1]) {
            const knob = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), knobMat);
            knob.position.set(pw - 14, doorH * 0.46, sgn * (thick * 0.5 + 4));
            panel.add(knob);
        }

        panels.push({ seg: s, hinge, panel, board, openT: 0, wobble: Math.random() * 6 });
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            const segs = (o && o.segs) ? o.segs : ob.segs;
            const d = dt || 0.016;
            for (let i = 0; i < panels.length; i++) {
                const p = panels[i];
                const seg = segs[i] || p.seg;
                if (seg && seg.broken) {
                    // swing open, sag, and let it settle (shatter-ish burst).
                    p.openT = Math.min(1, p.openT + d * 5.0);
                    const e = 1 - Math.pow(1 - p.openT, 3);      // ease-out
                    p.hinge.rotation.y = -e * (Math.PI * 0.72);   // swing about hinge
                    p.panel.rotation.z = -e * 0.18 + Math.sin((t || 0) * 10 + p.wobble) * (1 - e) * 0.25;
                    p.panel.position.y = -e * 6;
                } else {
                    p.openT = 0;
                    p.hinge.rotation.y = 0;
                    p.panel.rotation.z = 0;
                    p.panel.position.y = 0;
                }
            }
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeBouncePad(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.x, ob.y, 0));
    const r = ob.r || 38;

    // springy base ring + a glossy bouncy dome we squash over time.
    const baseMat = inflate(shade(WPAL.curb, -0.18), { roughness: 0.26 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.18, 9, 30), baseMat);
    base.position.set(0, 4.5, 0);
    group.add(base);

    // springs (little torus coils) around the base for a trampoline feel.
    const springMat = gloss(WPAL.gold, { roughness: 0.25, metalness: 0.4 });
    const springs = [];
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const coil = new THREE.Mesh(new THREE.TorusGeometry(5.5, 1.8, 8, 14), springMat);
        coil.position.set(Math.cos(a) * r * 0.95, 10, Math.sin(a) * r * 0.95);
        coil.rotation.x = Math.PI / 2;
        group.add(coil);
        springs.push(coil);
    }

    // the bouncy cushion — soft glossy inflatable pink dome, scale.y pulses.
    const cushion = new THREE.Object3D();
    cushion.position.set(0, 9, 0);
    group.add(cushion);
    const padMat = inflate(WPAL.curb, { roughness: 0.16, clearcoat: 0.9, emissiveIntensity: 0.08 });
    const pad = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), padMat);
    pad.scale.set(1, 0.62, 1);
    pad.position.set(0, 9, 0);
    cushion.add(pad);
    // gentle seams (thin rings) so the dome reads as stitched inflatable vinyl.
    const seamMat = inflate(shade(WPAL.curb, -0.22), { roughness: 0.3, clearcoat: 0.4 });
    for (const ry of [13.5, 19]) {
        const seam = new THREE.Mesh(new THREE.TorusGeometry(r * (ry < 16 ? 0.82 : 0.5), 1.6, 8, 30), seamMat);
        seam.rotation.x = Math.PI / 2;
        seam.position.set(0, ry, 0);
        cushion.add(seam);
    }

    // white rim accent + a chevron hinting "bounce up".
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 3.4, 10, 30), inflate(WPAL.curbLt, { roughness: 0.2, clearcoat: 0.9 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 13, 0);
    cushion.add(rim);
    const arrowMat = gloss(0xffffff, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.12 });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, r * 0.5, 4), arrowMat);
    arrow.position.set(0, 9 + r * 0.62 + 8, 0);   // rest just above the inflatable dome
    arrow.rotation.y = Math.PI / 4;
    cushion.add(arrow);
    const arrowRestY = arrow.position.y;

    shadowy(group, true, true);

    const baseSpringY = springs.map(s => s.position.y);
    const view = {
        object3d: group,
        update(o, dt, t) {
            // sim resets BouncePad.t on bounce; we don't receive it, so we
            // run a lively idle squash-pulse keyed off time + position.
            const tt = (t || 0);
            const ph = tt * 3.4 + ob.x * 0.013 + ob.y * 0.011;
            const breathe = 0.10 * (0.5 + 0.5 * Math.sin(ph));   // 0..0.10
            const sQ = 1 - breathe;            // squash down on the beat
            cushion.scale.set(1 + breathe * 0.5, sQ, 1 + breathe * 0.5);
            arrow.position.y = 27 + (1 - sQ) * -10 + 5 * Math.max(0, Math.sin(ph));
            arrow.rotation.y = Math.PI / 4 + tt * 0.8;
            for (let i = 0; i < springs.length; i++) springs[i].scale.y = sQ;
            for (let i = 0; i < springs.length; i++) springs[i].position.y = baseSpringY[i] * (0.6 + 0.4 * sQ);
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeHex(ob) {
    const group = new THREE.Object3D();
    const size = ob.size || 33;
    const depth = 28;                       // prism thickness (tile height)
    group.position.copy(W(ob.cx, ob.cy, 0));

    const color = col(ob.color, WPAL.grape);
    // CylinderGeometry with 6 radial segments == a hexagonal prism.
    // point-up to match sim's hexagon (a = π/3*i - π/2).
    const topMat = mat(pop(color, 0.05, 0.02), { roughness: 0.42, metalness: 0.05 });
    const sideMat = mat(shade(color, -0.2), { roughness: 0.55 });
    const geo = new THREE.CylinderGeometry(size, size * 0.98, depth, 6);
    // material groups: 0 = side, 1 = top cap, 2 = bottom cap.
    const tile = new THREE.Mesh(geo, [sideMat, topMat, sideMat]);
    tile.position.set(0, -depth / 2, 0);    // top face at world y=0 (beans stand here)
    tile.rotation.y = Math.PI / 6;          // flat-top -> point-up
    group.add(tile);

    // a bright beveled cap inset on top for a glossy candy gem look.
    const bevelMat = gloss(pop(shade(color, 0.3), 0.05, 0.05),
        { roughness: 0.25, emissive: shade(color, -0.35), emissiveIntensity: 0.08 });
    const bevel = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.78, size * 0.9, depth * 0.22, 6), bevelMat);
    bevel.position.set(0, -depth * 0.11, 0);   // inset flush with the y=0 top face
    bevel.rotation.y = Math.PI / 6;
    group.add(bevel);

    shadowy(group, true, true);

    const baseY = group.position.y;
    const baseX = group.position.x;
    let fallV = 0;
    const view = {
        object3d: group,
        update(o, dt, t) {
            const state = (o && o.state) ? o.state : (ob.state || 'solid');
            const d = dt || 0.016;
            const tt = t || 0;
            if (state === 'solid') {
                group.position.set(baseX, baseY, group.position.z);
                group.rotation.set(0, 0, 0);
                group.visible = true;
                for (const m of tile.material) { m.opacity = 1; }
                bevelMat.opacity = 1;
                fallV = 0;
            } else if (state === 'dissolving') {
                // jitter/shake + begin sinking & fading.
                group.position.x = baseX + Math.sin(tt * 40 + baseX) * 2.4;
                group.rotation.z = Math.sin(tt * 33) * 0.03;
                fallV += d * 140;
                group.position.y = baseY - fallV * 0.18;
                group.visible = true;
                for (const m of tile.material) {
                    m.transparent = true;
                    m.opacity = Math.max(0.3, m.opacity - d * 0.7);
                }
                bevelMat.transparent = true;
                bevelMat.opacity = Math.max(0.3, bevelMat.opacity - d * 0.7);
            } else { // 'gone'
                fallV += d * 700;
                group.position.y = baseY - 220 - fallV;
                group.visible = group.position.y > baseY - 1100;
            }
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeObstacleView(ob) {
    switch (ob && ob.kind) {
        case 'spinner':   return makeSpinner(ob);
        case 'hammer':    return makeHammer(ob);
        case 'doorwall':  return makeDoorWall(ob);
        case 'bouncepad': return makeBouncePad(ob);
        case 'hex':       return makeHex(ob);
        default: {
            const g = new THREE.Object3D();
            return { object3d: g, update() {}, dispose() { disposeTree(g); } };
        }
    }
}

/* =====================================================================
   SLIME — a reusable animated pink goo surface (shared by all courses).
   Hot magenta with a mottled texture, slight emissive, animated shimmer:
   we scroll the texture and pulse emissive in update().
   ===================================================================== */
function makeSlime(cx, cy, w, h, y, opts) {
    opts = opts || {};
    const tex = slimeTexture();
    if (tex) {
        const rep = Math.max(2, Math.round(Math.max(w, h) / 600));
        tex.repeat.set(rep, rep);
    }
    const slimeMat = new THREE.MeshStandardMaterial({
        color: WPAL.slime,
        map: tex || null,
        roughness: 0.22,
        metalness: 0.0,
        emissive: new THREE.Color(WPAL.slimeDk),
        emissiveIntensity: 0.4,
    });
    // gentle waves: a subdivided plane we ripple in the vertex Z (height).
    const segX = opts.flat ? 1 : Math.min(40, Math.max(6, Math.round(w / 120)));
    const segY = opts.flat ? 1 : Math.min(40, Math.max(6, Math.round(h / 120)));
    const geo = new THREE.PlaneGeometry(w, h, segX, segY);
    const mesh = new THREE.Mesh(geo, slimeMat);
    mesh.rotation.x = -Math.PI / 2;          // lay flat on world XZ
    mesh.position.set(cx, y != null ? y : -2, cy);
    mesh.receiveShadow = true;
    // stash base vertex positions for the wave animation.
    let basePos = null;
    if (!opts.flat) {
        basePos = Float32Array.from(geo.attributes.position.array);
    }
    return { mesh, slimeMat, geo, tex, basePos };
}

/* =====================================================================
   COURSE VIEW — static round geometry + a few animated bits.
   ===================================================================== */
class CourseView {
    constructor(round) {
        this._root = new THREE.Object3D();
        this._root.name = 'course';
        this._disposables = [];
        this._anim = [];                  // [(dt,t) => ...] called each update
        this._round = round || {};
        // viewKind lets new sim modes (mountain/tag/tiptoe) reuse an existing
        // course look (race/survival/final) without bespoke geometry.
        const kind = (round && (round.viewKind || round.kind)) || 'race';
        if (kind === 'race') this._buildRace(round);
        else if (kind === 'survival') this._buildSurvival(round);
        else if (kind === 'final') this._buildFinal(round);
        else this._buildRace(round);
        // Align the walkable surface to world y=0 (the beans' feet plane) so
        // beans + obstacles stand ON the floor instead of sinking into the slab.
        this._root.position.y = -(kind === 'race' ? 20 : kind === 'survival' ? 28 : 0);
    }

    get object3d() { return this._root; }

    _add(obj) { this._root.add(obj); return obj; }

    // register a slime surface for shimmer/wave animation + disposal.
    _registerSlime(s, strong) {
        const baseE = s.slimeMat.emissiveIntensity;
        const amp = strong ? 0.2 : 0.13;
        const pos = s.basePos ? s.geo.attributes.position : null;
        const waveAmp = strong ? 7 : 4;
        this._anim.push((dt, t) => {
            const tt = t || 0;
            s.slimeMat.emissiveIntensity = baseE + Math.sin(tt * 1.7) * amp;
            if (s.tex) { s.tex.offset.x = (tt * 0.012) % 1; s.tex.offset.y = (tt * 0.018) % 1; }
            if (pos && s.basePos) {
                const a = pos.array, b = s.basePos;
                for (let i = 0; i < a.length; i += 3) {
                    const x = b[i], y = b[i + 1];
                    // plane local coords (pre-rotation): ripple the Z component.
                    a[i + 2] = b[i + 2]
                        + Math.sin(x * 0.012 + tt * 1.6) * waveAmp
                        + Math.cos(y * 0.013 - tt * 1.3) * waveAmp * 0.7;
                }
                pos.needsUpdate = true;
            }
        });
    }

    /* ---------------- RACE: long track + curbs + start/finish ---------- */
    _buildRace(r) {
        const minX = r.minX != null ? r.minX : 200;
        const maxX = r.maxX != null ? r.maxX : 1080;
        const minY = r.minY != null ? r.minY : 240;
        const maxY = r.maxY != null ? r.maxY : 2680;
        const finishY = r.finishY != null ? r.finishY : (minY + 180);
        const cx = r.cx != null ? r.cx : (minX + maxX) / 2;
        const w = maxX - minX;
        const len = maxY - minY;
        const midY = (minY + maxY) / 2;

        // --- the track slab (pastel blue), slightly raised over the slime ---
        const trackMat = mat(WPAL.track, { roughness: 0.7, metalness: 0.0 });
        const track = new THREE.Mesh(new THREE.BoxGeometry(w, 20, len), trackMat);
        track.position.copy(W(cx, midY, 10));
        track.receiveShadow = true;
        track.castShadow = false;
        this._add(track);

        // soft tonal bands across the track so it isn't one flat sheet.
        const bandMat = mat(WPAL.trackAlt, { roughness: 0.72 });
        const bandStep = 360;
        for (let yy = minY; yy < maxY; yy += bandStep * 2) {
            const seg = Math.min(bandStep, maxY - yy);
            if (seg <= 0) break;
            const b = new THREE.Mesh(new THREE.BoxGeometry(w, 2, seg), bandMat);
            b.position.copy(W(cx, yy + seg / 2, 20.2));
            b.receiveShadow = true;
            this._add(b);
        }

        // dashed centre lane line (bright dashes).
        const dashMat = gloss(0xffffff, { roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.06 });
        const dashLen = 110, gap = 80;
        for (let yy = finishY + 80; yy < maxY - 60; yy += dashLen + gap) {
            const seg = Math.min(dashLen, maxY - 60 - yy);
            if (seg <= 0) break;
            const dash = new THREE.Mesh(new THREE.BoxGeometry(14, 3, seg), dashMat);
            dash.position.copy(W(cx, yy + seg / 2, 20.6));
            dash.receiveShadow = true;
            this._add(dash);
        }

        // --- rounded raised curbs / side walls (candy pink + gold cap) ---
        const curbH = 78, curbT = 30;
        const curbMat = mat(WPAL.curb, { roughness: 0.5 });
        const capMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.25 });
        for (const side of [-1, 1]) {
            const wx = side < 0 ? minX - curbT / 2 : maxX + curbT / 2;
            const wall = roundedSlab(curbT, curbH, len, 10, curbMat);
            wall.position.copy(W(wx, midY, curbH / 2));
            shadowy(wall, true, true);
            this._add(wall);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(curbT + 8, 12, len), capMat);
            cap.position.copy(W(wx, midY, curbH + 4));
            shadowy(cap, true, true);
            this._add(cap);
            // periodic candy bumpers along each curb for chunk + rhythm.
            for (let yy = minY + 120; yy < maxY - 120; yy += 300) {
                const bump = new THREE.Mesh(new THREE.SphereGeometry(20, 16, 12), gloss(WPAL.gold));
                bump.scale.set(1, 0.7, 1);
                bump.position.copy(W(wx, yy, curbH + 8));
                shadowy(bump, true, true);
                this._add(bump);
            }
        }

        // --- pink SLIME planes flanking the track (falling off = deadly) ---
        const slimePad = 1500;
        for (const side of [-1, 1]) {
            const sx = side < 0 ? minX - slimePad / 2 - curbT : maxX + slimePad / 2 + curbT;
            const s = makeSlime(sx, midY, slimePad, len + 900, -6);
            this._add(s.mesh);
            this._disposables.push(s.mesh);
            this._registerSlime(s);
        }
        // slime cap beyond the finish so the goal hangs over the goo.
        const sFront = makeSlime(cx, minY - 520, w + slimePad * 2 + 400, 1040, -6);
        this._add(sFront.mesh); this._disposables.push(sFront.mesh); this._registerSlime(sFront);

        // --- CHECKERED finish line + celebratory ARCH at finishY ---
        this._add(this._buildCheckerLine(minX, maxX, finishY, 21, 30));
        this._add(this._buildArch(minX, maxX, finishY, WPAL.gold, 'finish'));

        // --- giant grabbable CROWN floating at the finish (Fall Mountain) ---
        if (r.crownFinish) this._add(this._buildCrown((minX + maxX) / 2, finishY - 40));

        // --- START gate near maxY (grape) + a glowing start band ---
        const startY = maxY - 150;
        this._add(this._buildArch(minX, maxX, startY, WPAL.grape, 'start'));
        const startBand = mat(WPAL.grape, { roughness: 0.5, emissive: 0x2a0f55, emissiveIntensity: 0.25 });
        const band = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 30), startBand);
        band.position.copy(W(cx, startY, 21));
        band.receiveShadow = true;
        this._add(band);
    }

    // black/white checker strip laid flat across the track at depth `dy`.
    _buildCheckerLine(minX, maxX, dy, yLevel, sq) {
        const g = new THREE.Object3D();
        const w = maxX - minX;
        const cols = Math.ceil(w / sq);
        const rows = 2;
        const black = mat(0x23232b, { roughness: 0.6 });
        const white = mat(0xf4f4f8, { roughness: 0.6 });
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const m = ((i + j) & 1) ? black : white;
                const cw = Math.min(sq, w - i * sq);
                if (cw <= 0) continue;
                const cell = new THREE.Mesh(new THREE.BoxGeometry(cw, 3, sq), m);
                cell.position.copy(W(minX + i * sq + cw / 2, dy - sq + j * sq + sq / 2, yLevel));
                cell.receiveShadow = true;
                g.add(cell);
            }
        }
        return g;
    }

    // a big golden crown bobbing on a pedestal — the Fall Mountain prize.
    _buildCrown(cx, cy) {
        const g = new THREE.Object3D();
        const goldM = gloss(WPAL.gold, { roughness: 0.22, metalness: 0.55, emissive: 0x5a3d00, emissiveIntensity: 0.18 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(26, 30, 22, 24, 1, true), goldM);
        band.position.y = 0; g.add(band);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 8), goldM);
            spike.position.set(Math.cos(a) * 27, 20, Math.sin(a) * 27);
            g.add(spike);
            const gem = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8),
                gloss(0xff3b6b, { roughness: 0.2, metalness: 0.3, emissive: 0x6a0020, emissiveIntensity: 0.3 }));
            gem.position.set(Math.cos(a) * 27, 33, Math.sin(a) * 27); g.add(gem);
        }
        const post = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 120, 16), mat(WPAL.grape, { roughness: 0.5 }));
        post.position.y = -78; g.add(post);
        g.position.copy(W(cx, cy, 150));
        const baseY = g.position.y;
        this._anim.push((dt, t) => { g.rotation.y = t * 1.1; g.position.y = baseY + Math.sin(t * 2) * 8; });
        shadowy(g, true, false);
        return g;
    }

    // a celebratory arch: two posts + a rounded top beam, banner + bunting.
    _buildArch(minX, maxX, dy, color, label) {
        const g = new THREE.Object3D();
        const h = 320, postT = 30;
        const postMat = gloss(shade(color, -0.18), { roughness: 0.4, metalness: 0.18 });
        for (const px of [minX - 8, maxX + 8]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(postT * 0.5, postT * 0.62, h, 16), postMat);
            post.position.copy(W(px, dy, h / 2));
            shadowy(post, true, true);
            g.add(post);
            const ball = new THREE.Mesh(new THREE.SphereGeometry(postT * 0.7, 18, 14), gloss(WPAL.gold));
            ball.position.copy(W(px, dy, h + 6));
            shadowy(ball, true, true);
            g.add(ball);
        }
        const span = (maxX + 8) - (minX - 8);
        const beamMat = gloss(color, { roughness: 0.32, emissive: shade(color, -0.5), emissiveIntensity: 0.2 });
        const beam = roundedSlab(span, 60, 34, 16, beamMat);
        beam.position.copy(W((minX + maxX) / 2, dy, h - 26));
        shadowy(beam, true, true);
        g.add(beam);

        // bunting triangles hanging under the beam for festivity.
        const flagCols = [WPAL.curb, WPAL.gold, WPAL.mint, WPAL.skyTop, WPAL.grape];
        const n = 11;
        for (let i = 0; i < n; i++) {
            const fm = mat(flagCols[i % flagCols.length], { roughness: 0.55, side: THREE.DoubleSide });
            const flag = new THREE.Mesh(new THREE.ConeGeometry(15, 30, 3), fm);
            const fx = minX + (i + 0.5) * (span / n);
            flag.position.copy(W(fx, dy, h - 66));
            flag.rotation.x = Math.PI;            // point down
            g.add(flag);
        }
        return g;
    }

    /* ---------------- SURVIVAL: hovering disc over a slime sea ---------- */
    _buildSurvival(r) {
        const P = r.platform || { cx: (r.cx != null ? r.cx : 640), cy: 380, r: 300 };
        const R = P.r || 300;

        // wide animated slime sea below.
        const sea = makeSlime(P.cx, P.cy, 4400, 4400, -44);
        this._add(sea.mesh); this._disposables.push(sea.mesh);
        this._registerSlime(sea, true);

        // the thick rounded platform disc hovering above the goo.
        const platH = 40;
        const platMat = mat(WPAL.track, { roughness: 0.6, metalness: 0.0 });
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.03, platH, 72), platMat);
        disc.position.copy(W(P.cx, P.cy, 8));
        disc.receiveShadow = true;
        disc.castShadow = true;
        this._add(disc);

        // glossy top inlay + a thick candy rim torus.
        const inlay = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.84, R * 0.84, 5, 72),
            gloss(WPAL.trackAlt, { roughness: 0.4 }));
        inlay.position.copy(W(P.cx, P.cy, 8 + platH / 2 + 1));
        inlay.receiveShadow = true;
        this._add(inlay);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 12, 16, 80), gloss(WPAL.curb, { roughness: 0.35 }));
        rim.rotation.x = Math.PI / 2;
        rim.position.copy(W(P.cx, P.cy, 8 + platH / 2));
        shadowy(rim, true, true);
        this._add(rim);

        // a soft underside cone so the disc reads as a floating island.
        const under = new THREE.Mesh(new THREE.ConeGeometry(R * 0.92, 180, 56),
            mat(shade(WPAL.track, -0.32), { roughness: 0.8 }));
        under.position.copy(W(P.cx, P.cy, 8 - platH / 2 - 90));
        under.rotation.x = Math.PI;
        this._add(under);

        // a few decorative gold rivets around the rim.
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const riv = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), gloss(WPAL.gold));
            riv.position.copy(W(P.cx + Math.cos(a) * R * 0.9, P.cy + Math.sin(a) * R * 0.9, 8 + platH / 2 + 2));
            this._add(riv);
        }
    }

    /* ---------------- FINAL: wide slime pit + tidy raised border -------- */
    _buildFinal(r) {
        const minX = r.minX != null ? r.minX : 300;
        const maxX = r.maxX != null ? r.maxX : 980;
        const minY = r.minY != null ? r.minY : 130;
        const maxY = r.maxY != null ? r.maxY : 630;
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const w = maxX - minX, h = maxY - minY;

        // wide pink slime pit spanning (and overhanging) the arena.
        const pit = makeSlime(cx, cy, w + 1500, h + 1500, -60);
        this._add(pit.mesh); this._disposables.push(pit.mesh);
        this._registerSlime(pit, true);

        // a tidy raised border frame around the play field.
        const frameMat = mat(WPAL.grape, { roughness: 0.45, metalness: 0.12, emissive: 0x2a0f55, emissiveIntensity: 0.15 });
        const ft = 44, fh = 80;
        const pad = 64;
        const fx0 = minX - pad, fx1 = maxX + pad, fy0 = minY - pad, fy1 = maxY + pad;
        const fw = fx1 - fx0, fhh = fy1 - fy0;
        const railNS = new THREE.BoxGeometry(fw + ft, fh, ft);
        const railEW = new THREE.BoxGeometry(ft, fh, fhh + ft);
        const top = new THREE.Mesh(railNS, frameMat); top.position.copy(W(cx, fy0, fh / 2));
        const bot = new THREE.Mesh(railNS, frameMat); bot.position.copy(W(cx, fy1, fh / 2));
        const left = new THREE.Mesh(railEW, frameMat); left.position.copy(W(fx0, cy, fh / 2));
        const right = new THREE.Mesh(railEW, frameMat); right.position.copy(W(fx1, cy, fh / 2));
        for (const m of [top, bot, left, right]) { shadowy(m, true, true); this._add(m); }

        // a glossy gold cap rail running along the top of the border.
        const capMatTop = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.3 });
        for (const [geom, pos] of [
            [new THREE.BoxGeometry(fw + ft, 10, ft + 6), W(cx, fy0, fh)],
            [new THREE.BoxGeometry(fw + ft, 10, ft + 6), W(cx, fy1, fh)],
            [new THREE.BoxGeometry(ft + 6, 10, fhh + ft), W(fx0, cy, fh)],
            [new THREE.BoxGeometry(ft + 6, 10, fhh + ft), W(fx1, cy, fh)],
        ]) {
            const m = new THREE.Mesh(geom, capMatTop); m.position.copy(pos);
            shadowy(m, true, true); this._add(m);
        }

        // gold corner caps for polish.
        for (const [gx, gy] of [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]]) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(ft * 0.72, 18, 14), gloss(WPAL.gold));
            cap.position.copy(W(gx, gy, fh + 4));
            shadowy(cap, true, true);
            this._add(cap);
        }
    }

    update(round, dt, t) {
        if (round) this._round = round;
        for (const fn of this._anim) fn(dt, t);
    }

    dispose() {
        disposeTree(this._root);
        this._disposables.length = 0;
        this._anim.length = 0;
    }
}
