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
    // VIEW STYLE (visual only): 'windmill' = big flat sails, 'blade' = flat
    // fan/propeller, default 'bar' = chunky padded arm. Motion is identical:
    // every variant still reaches to radius `len` along the arm's local +X.
    const style = (ob.style || 'bar');
    const armMat = mat(color, { roughness: 0.42, metalness: 0.06 });
    const stripeMat = mat(pop(shade(color, 0.4), 0, 0.05), { roughness: 0.35 });
    const capMat = gloss(pop(shade(color, 0.28), 0.05, 0));
    const sailMat = inflate(color, { roughness: 0.24, clearcoat: 0.7 });
    const sailAlt = inflate(pop(shade(color, 0.34), 0.04, 0.04), { roughness: 0.24, clearcoat: 0.7 });
    for (let i = 0; i < arms; i++) {
        const a = (i * Math.PI * 2) / arms;
        const arm = new THREE.Object3D();
        arm.rotation.y = -a;   // logical angle a -> world -Y (X/Y -> X/Z handedness)

        if (style === 'windmill') {
            // a big wide flat sail: thin in height, broad in the sweep (Z) plane,
            // mounted out along the arm so the tip still rides at radius `len`.
            const sailW = len * 0.92;            // along the arm
            const sailSpan = Math.max(barD * 4, len * 0.5);   // broad across (Z)
            const sail = roundedSlab(sailW, barH * 0.8, sailSpan, barH * 0.35,
                (i % 2) ? sailAlt : sailMat);
            sail.position.set(len * 0.54, 0, 0);
            arm.add(sail);
            // a slim spar down the spine of the sail for a built look.
            const spar = new THREE.Mesh(new THREE.CylinderGeometry(barH * 0.28, barH * 0.28, len, 12), armMat);
            spar.rotation.z = Math.PI / 2;
            spar.position.set(len / 2, 0, 0);
            arm.add(spar);
            // bright tip trim so the blade tip reads clearly.
            const tip = new THREE.Mesh(new THREE.BoxGeometry(barH * 0.6, barH * 0.85, sailSpan * 1.02), stripeMat);
            tip.position.set(len * 0.96, 0, 0);
            arm.add(tip);
        } else if (style === 'blade') {
            // a flat propeller/fan blade: a tapered flat paddle, slightly pitched.
            const bladeLen = len * 0.96;
            const bladeSpan = Math.max(barD * 2.6, len * 0.3);
            const blade = roundedSlab(bladeLen, barH * 0.5, bladeSpan, barH * 0.22,
                (i % 2) ? sailAlt : sailMat);
            blade.scale.set(1, 1, 0.6);          // taper toward the hub visually
            blade.rotation.x = 0.32;             // a touch of pitch like a fan
            blade.position.set(len * 0.52, 0, 0);
            arm.add(blade);
            const root = new THREE.Mesh(new THREE.CylinderGeometry(barH * 0.5, barH * 0.7, barH * 1.4, 14), armMat);
            root.position.set(barH * 0.8, 0, 0);
            arm.add(root);
            const tip = new THREE.Mesh(new THREE.BoxGeometry(barH * 0.5, barH * 0.55, bladeSpan * 0.9), stripeMat);
            tip.rotation.x = 0.32;
            tip.position.set(len * 0.95, 0, 0);
            arm.add(tip);
        } else {
            // default 'bar' (and 'sweeper'): the original chunky padded arm.
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
        }
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

    // VIEW STYLE (visual only): 'axe' = medieval axe head, 'pendulum' = a
    // spiked log/ball, default 'hammer' = the chunky studded mace. Every
    // variant centres its mass at (0,-armLen,0) so the swing reads the same.
    const style = (ob.style || 'hammer');
    if (style === 'axe') {
        // a heavy wedge axe head on a stubby haft, blade facing the swing (X).
        const haftMat = gloss(shade(WPAL.wood, -0.1), { roughness: 0.4, metalness: 0.1 });
        const haft = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, headR * 1.7, 12), haftMat);
        haft.position.set(0, -armLen, 0);
        pivot.add(haft);
        const steelMat = gloss(0xd7dde6, { roughness: 0.22, metalness: 0.55, emissive: 0x223040, emissiveIntensity: 0.08 });
        const edgeMat = gloss(0xfbfdff, { roughness: 0.14, metalness: 0.4, emissive: 0xbcd6ff, emissiveIntensity: 0.12 });
        // wedge blade built from a flat trapezoid shape, extruded across Z.
        const bw = headR * 2.2, bh = headR * 2.4;
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, -bh * 0.42);
        bladeShape.lineTo(0, bh * 0.42);
        bladeShape.quadraticCurveTo(bw * 0.5, bh * 0.34, bw, bh * 0.16);
        bladeShape.quadraticCurveTo(bw * 1.12, 0, bw, -bh * 0.16);
        bladeShape.quadraticCurveTo(bw * 0.5, -bh * 0.34, 0, -bh * 0.42);
        const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
            depth: headR * 0.5, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 1, steps: 1,
        });
        bladeGeo.center();
        for (const sgn of [1, -1]) {                     // a double-bit axe
            const blade = new THREE.Mesh(bladeGeo.clone(), steelMat);
            blade.scale.x = sgn;
            blade.position.set(sgn * (headR * 0.9), -armLen, 0);
            pivot.add(blade);
            // a bright cutting edge strip at the lip.
            const edge = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.16, bh * 0.7, headR * 0.62), edgeMat);
            edge.position.set(sgn * (headR * 1.85), -armLen, 0);
            pivot.add(edge);
        }
        const collarMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.4 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, headR * 0.5, 14), collarMat);
        band.position.set(0, -armLen, 0);
        pivot.add(band);
    } else if (style === 'pendulum') {
        // a chunky spiked log/ball hanging across the lane (axis along Z).
        const logMat = gloss(col(ob.color, WPAL.grape), { roughness: 0.3, metalness: 0.15, emissive: shade(col(ob.color, WPAL.grape), -0.5), emissiveIntensity: 0.1 });
        const logLen = headR * 2.6;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 0.95, logLen, 22), logMat);
        log.rotation.x = Math.PI / 2;                    // lay across Z
        log.position.set(0, -armLen, 0);
        pivot.add(log);
        const capMat = gloss(shade(col(ob.color, WPAL.grape), -0.18), { roughness: 0.3, metalness: 0.2 });
        for (const dz of [-1, 1]) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.95, 18, 14), capMat);
            cap.position.set(0, -armLen, dz * logLen / 2);
            pivot.add(cap);
        }
        // rings of spikes bristling around the log.
        const spikeMat = gloss(0xf0f3f8, { roughness: 0.2, metalness: 0.5 });
        for (const rz of [-logLen * 0.3, 0, logLen * 0.3]) {
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const spike = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.2, headR * 0.7, 7), spikeMat);
                spike.position.set(Math.cos(a) * headR, -armLen + Math.sin(a) * headR, rz);
                spike.rotation.z = -a + Math.PI / 2;
                pivot.add(spike);
            }
        }
    } else {
        // default 'hammer': chunky wrecking-ball head with studs (a mace).
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

/* CONVEYOR — a candy treadmill belt over [x0..x1] x [y0..y1] that scrolls
   chevrons along (dx, dy). The belt slab sits just above the floor (~y=4);
   chevrons live on a strip oriented along the travel direction and we slide
   them (wrapping) in update() so it reads as a moving belt. */
function makeConveyor(ob) {
    const group = new THREE.Object3D();
    const x0 = Math.min(ob.x0, ob.x1), x1 = Math.max(ob.x0, ob.x1);
    const y0 = Math.min(ob.y0, ob.y1), y1 = Math.max(ob.y0, ob.y1);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    group.position.copy(W(cx, cy, 0));

    const color = col(ob.color, WPAL.track);
    const beltTop = 8;                       // belt surface height (sits on floor)
    // travel direction in world XZ (sim dx -> world X, sim dy -> world Z).
    const dx = ob.dx || 0, dy = (ob.dy != null ? ob.dy : 1);
    const dlen = Math.hypot(dx, dy) || 1;
    const ux = dx / dlen, uz = dy / dlen;    // unit travel dir in world XZ
    const ang = Math.atan2(uz, ux);          // heading about world Y

    // --- belt slab: a flat rounded candy plate raised just off the floor ---
    const beltMat = gloss(color, { roughness: 0.34, metalness: 0.08, emissive: shade(color, -0.5), emissiveIntensity: 0.06 });
    const belt = roundedSlab(w, h, beltTop, Math.min(18, w / 2 - 1, h / 2 - 1), beltMat);
    belt.rotation.x = -Math.PI / 2;          // slab's extrude depth -> world Y
    belt.position.set(0, beltTop / 2, 0);
    group.add(belt);
    // a darker inset lane so the chevrons pop against the belt.
    const laneMat = mat(shade(color, -0.18), { roughness: 0.5 });
    const lane = new THREE.Mesh(new THREE.BoxGeometry(w - 14, 1.2, h - 14), laneMat);
    lane.position.set(0, beltTop + 0.4, 0);
    group.add(lane);

    // --- chevron strip oriented along travel: we build N arrows and scroll
    //     them within a span, wrapping for an endless-belt illusion. ---
    const strip = new THREE.Object3D();      // local +X = travel direction
    strip.rotation.y = -ang;                 // world heading -> local +X (X/Z handedness)
    strip.position.set(0, beltTop + 1.2, 0);
    group.add(strip);

    // span along travel, and usable cross-width (perpendicular).
    const cosA = Math.abs(Math.cos(ang)), sinA = Math.abs(Math.sin(ang));
    const span = w * cosA + h * sinA;        // belt extent projected on travel axis
    const cross = w * sinA + h * cosA;       // belt extent across travel axis
    const chevW = Math.min(Math.max(cross * 0.6, 24), cross - 10);  // arrow width
    const chevD = Math.max(14, Math.min(34, span * 0.12));          // arrow depth
    const spacing = chevD * 2.0;
    const count = Math.max(2, Math.ceil(span / spacing) + 2);
    const half = (count - 1) * spacing / 2;

    // a single chevron: two angled bars meeting at a point along +X (travel).
    const chevMat = gloss(0xffffff, { roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.14 });
    function makeChevron() {
        const c = new THREE.Object3D();
        const barLen = Math.hypot(chevW / 2, chevD) + 4;
        const barT = Math.max(5, chevD * 0.34);
        for (const sgn of [1, -1]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(barLen, 3.2, barT), chevMat);
            // angle the bar so the two meet at a forward point.
            bar.rotation.y = sgn * Math.atan2(chevW / 2, chevD);
            bar.position.set(-chevD * 0.32, 0, sgn * chevW * 0.25);
            c.add(bar);
        }
        return c;
    }
    const chevrons = [];
    for (let i = 0; i < count; i++) {
        const c = makeChevron();
        c.position.set(0, 0, 0);
        strip.add(c);
        chevrons.push(c);
    }

    // --- side rollers (cylinders) at each end of the belt across travel ---
    const rollerMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.4 });
    const rollers = [];
    for (const sgn of [1, -1]) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(beltTop * 0.7, beltTop * 0.7, cross + 6, 18), rollerMat);
        roller.rotation.x = Math.PI / 2;     // axis along local Z (across travel)
        // place at the leading/trailing end along travel.
        const ex = Math.cos(ang) * (span / 2) * sgn;
        const ez = Math.sin(ang) * (span / 2) * sgn;
        roller.position.set(ex, beltTop * 0.5, ez);
        roller.rotation.y = -ang;
        roller.userData.spinSign = sgn;
        group.add(roller);
        rollers.push(roller);
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            const tt = t || 0;
            // scroll chevrons along +X (travel), wrapping across the span.
            const flow = (tt * 90) % spacing;     // belt speed feel
            for (let i = 0; i < chevrons.length; i++) {
                let x = -half + i * spacing + flow;
                // wrap into [-half-spacing, +half]
                const range = count * spacing;
                x = ((x + half + spacing) % range + range) % range - half - spacing;
                chevrons[i].position.x = x;
            }
            for (const r of rollers) r.rotation.z += (dt || 0.016) * 4 * r.userData.spinSign;
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

/* BUMPER — a pinball mushroom: glossy dome cap on a small base with a white
   ring accent. Pops (scales up + brightens) when ob.t is small (just hit). */
function makeBumper(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.x, ob.y, 0));
    const r = ob.r || 34;
    const color = col(ob.color, WPAL.gold);

    // a squat base ring the dome perches on.
    const baseMat = gloss(shade(color, -0.28), { roughness: 0.32, metalness: 0.12 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.16, 12, 28), baseMat);
    base.position.set(0, 6, 0);
    group.add(base);

    // the glossy rounded cap (mushroom dome) we pop on hit.
    const cap = new THREE.Object3D();
    cap.position.set(0, 10, 0);
    group.add(cap);
    const domeMat = gloss(color, { roughness: 0.16, metalness: 0.1, emissive: shade(color, -0.4), emissiveIntensity: 0.12 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), domeMat);
    dome.scale.set(1, 0.82, 1);
    cap.add(dome);
    // a glossy knob on top to finish the bumper.
    const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 16, 12), gloss(shade(color, 0.3), { roughness: 0.2 }));
    knob.position.set(0, r * 0.66, 0);
    cap.add(knob);

    // white ring accent around the dome base.
    const ringMat = gloss(0xfff6fb, { roughness: 0.2, metalness: 0.05, emissive: 0xffffff, emissiveIntensity: 0.1 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, r * 0.12, 12, 30), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, r * 0.18, 0);
    cap.add(ring);

    shadowy(group, true, true);
    const baseEmissive = 0.12;

    const view = {
        object3d: group,
        update(o, dt, t) {
            const ot = (o && o.t != null) ? o.t : (ob.t != null ? ob.t : 99);
            // pop window right after a hit (ob.t resets to 0, climbs over time).
            const pop = Math.max(0, 1 - ot * 4.5);     // 1 -> 0 over ~0.22s
            const ease = pop * pop;
            cap.scale.set(1 + ease * 0.28, 1 + ease * 0.42, 1 + ease * 0.28);
            domeMat.emissiveIntensity = baseEmissive + ease * 0.6;
            ringMat.emissiveIntensity = 0.1 + ease * 0.7;
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

/* MOVING BLOCK — a chunky candy block (rounded box) sliding side to side.
   Follows ob.cx/ob.cy each frame, sitting on the floor (height/2 up). */
function makeMovingBlock(ob) {
    const group = new THREE.Object3D();
    const w = ob.w || 130;
    const thick = ob.thick || 40;
    const height = (ob.height != null) ? ob.height : 130;
    const color = col(ob.color, WPAL.grape);
    group.position.copy(W(ob.cx != null ? ob.cx : (ob.x0 || 0), ob.cy, 0));

    // the solid rounded block body.
    const bodyMat = mat(pop(color, 0.04, 0.02), { roughness: 0.4, metalness: 0.08 });
    const body = roundedSlab(w, height, thick, Math.min(16, w / 2 - 1, height / 2 - 1, thick / 2 - 1), bodyMat);
    body.position.set(0, height / 2, 0);
    group.add(body);

    // a subtle inset face panel on the down-course (front) & back faces so it
    // reads as a Fall Guys block, plus a bright bolt in the middle.
    const faceMat = gloss(pop(shade(color, 0.22), 0.04, 0), { roughness: 0.3 });
    const boltMat = gloss(WPAL.gold, { roughness: 0.24, metalness: 0.45 });
    for (const sgn of [1, -1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, height * 0.6, thick * 0.18), faceMat);
        panel.position.set(0, height / 2, sgn * (thick / 2 - thick * 0.05));
        group.add(panel);
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, height) * 0.09, 14, 10), boltMat);
        bolt.position.set(0, height / 2, sgn * (thick / 2 + 1));
        group.add(bolt);
    }

    // gold trim cap rails along the top and bottom edges.
    const trimMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.35 });
    for (const yy of [height - 6, 8]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 6, 10, thick + 6), trimMat);
        rail.position.set(0, yy, 0);
        group.add(rail);
    }
    // gold corner studs down the vertical edges.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, height - 18, 10), trimMat);
        stud.position.set(sx * (w / 2 - 2), height / 2, sz * (thick / 2 - 2));
        group.add(stud);
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            const cxv = (o && o.cx != null) ? o.cx : (ob.cx != null ? ob.cx : 0);
            const cyv = (o && o.cy != null) ? o.cy : ob.cy;
            group.position.copy(W(cxv, cyv, 0));   // height handled by body offset
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

/* CANNON — a tilted barrel pointing down-course (+y / world +Z) that lobs
   rolling boulders. We pool spheres: one per live entry in ob.balls, rolled
   by ball.spin; unused pooled spheres are hidden. */
function makeCannon(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.x, ob.y, 0));
    const color = col(ob.color, WPAL.slime);
    const ballR = ob.ballR || 26;

    // a stout mount the barrel pivots on.
    const mountMat = gloss(WPAL.grapeDk, { roughness: 0.4, metalness: 0.2 });
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(ballR * 0.9, ballR * 1.2, ballR * 0.9, 20), mountMat);
    mount.position.set(0, ballR * 0.45, 0);
    group.add(mount);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(ballR * 0.7, ballR * 0.16, 10, 20), gloss(WPAL.gold, { metalness: 0.4 }));
    yoke.rotation.y = Math.PI / 2;
    yoke.position.set(0, ballR * 0.9, 0);
    group.add(yoke);

    // the barrel: a tube tilted to aim down-course (toward world +Z). We tilt
    // a barrel pivot about world X so the muzzle points up-and-forward.
    const barrel = new THREE.Object3D();
    barrel.position.set(0, ballR * 1.0, 0);
    barrel.rotation.x = -0.62;               // tilt muzzle toward +Z (down-course)
    group.add(barrel);
    const barrelLen = ballR * 3.0;
    const barrelMat = gloss(shade(color, -0.18), { roughness: 0.32, metalness: 0.4, emissive: shade(color, -0.55), emissiveIntensity: 0.08 });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(ballR * 0.85, ballR * 1.05, barrelLen, 22, 1, true), barrelMat);
    tube.position.set(0, 0, barrelLen / 2);  // extend forward along local +Z
    tube.rotation.x = Math.PI / 2;           // cylinder axis (local Y) -> local Z
    barrel.add(tube);
    // a bright muzzle ring at the mouth.
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(ballR * 0.92, ballR * 0.14, 12, 24), gloss(WPAL.gold, { metalness: 0.45 }));
    muzzle.position.set(0, 0, barrelLen);
    barrel.add(muzzle);
    // a back cap so the barrel reads solid from behind.
    const backCap = new THREE.Mesh(new THREE.SphereGeometry(ballR * 0.85, 16, 12), barrelMat);
    backCap.position.set(0, 0, 0);
    barrel.add(backCap);

    // --- boulder pool: shared geometry, hidden until needed ---
    const isFruit = !!ob.fruit;
    const ballGeo = new THREE.SphereGeometry(ballR, 20, 16);
    const ballMat = isFruit
        ? gloss(pop(color, 0.06, 0.04), { roughness: 0.28, clearcoat: 0.8, emissive: shade(color, -0.45), emissiveIntensity: 0.08 })
        : mat(pop(color, 0.03, 0), { roughness: 0.5, metalness: 0.06, flat: true, emissive: shade(color, -0.5), emissiveIntensity: 0.06 });
    const speckMat = gloss(shade(color, -0.3), { roughness: 0.6 });
    const leafMat = gloss(0x46b95a, { roughness: 0.45 });
    const stemMat = gloss(0x6a4a2a, { roughness: 0.6 });
    const pool = [];
    function makeBoulder() {
        const b = new THREE.Object3D();
        const core = new THREE.Mesh(ballGeo, ballMat);
        if (isFruit) core.scale.set(1, 1.08, 1);          // slightly plump fruit
        b.add(core);
        if (isFruit) {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(ballR * 0.09, ballR * 0.12, ballR * 0.5, 8), stemMat);
            stem.position.set(0, ballR * 1.05, 0); b.add(stem);
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(ballR * 0.34, 10, 8), leafMat);
            leaf.scale.set(1, 0.35, 0.6); leaf.position.set(ballR * 0.28, ballR * 1.12, 0); b.add(leaf);
        } else {
            for (const p of [[0.5, 0.3, 0.4], [-0.4, -0.3, 0.5], [0.2, 0.6, -0.4]]) {
                const lump = new THREE.Mesh(new THREE.SphereGeometry(ballR * 0.28, 8, 6), speckMat);
                lump.position.set(p[0] * ballR, p[1] * ballR, p[2] * ballR);
                b.add(lump);
            }
        }
        b.visible = false;
        shadowy(b, true, false);
        group.add(b);
        pool.push(b);
        return b;
    }

    shadowy(mount, true, true);
    shadowy(barrel, true, true);

    const cx = ob.x, cy = ob.y;
    const view = {
        object3d: group,
        update(o, dt, t) {
            const balls = (o && o.balls) ? o.balls : (ob.balls || []);
            for (let i = 0; i < balls.length; i++) {
                const ball = balls[i];
                const m = pool[i] || makeBoulder();
                m.visible = true;
                // ball lives in sim space; place relative to the cannon group.
                const wp = W(ball.x, ball.y, ballR);
                m.position.set(wp.x - group.position.x, wp.y - group.position.y, wp.z - group.position.z);
                // rolling-rotate about world X (it travels toward +Z).
                m.rotation.x = (ball.spin || 0);
            }
            for (let i = balls.length; i < pool.length; i++) pool[i].visible = false;
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

// Perfect Match: a square candy tile with a fruit emblem painted on top.
const _fruitTexCache = {};
function fruitTexture(idx) {
    if (_fruitTexCache[idx] !== undefined) return _fruitTexCache[idx];
    let tex = null;
    try {
        const f = (typeof FRUITS !== 'undefined' && FRUITS[idx]) ? FRUITS[idx] : { color: '#ffffff', icon: '?' };
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const g = c.getContext('2d');
        g.fillStyle = '#fbf7ff'; g.fillRect(0, 0, 128, 128);
        g.fillStyle = f.color; g.globalAlpha = 0.32; g.fillRect(0, 0, 128, 128); g.globalAlpha = 1;
        g.font = '92px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(f.icon, 64, 72);
        tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 4;
    } catch (e) { tex = null; }
    _fruitTexCache[idx] = tex;
    return tex;
}
function makeMatchTile(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.cx, ob.cy, 0));
    const s = (ob.size || 40) * 1.34, depth = 26;
    const fc = (typeof FRUITS !== 'undefined' && FRUITS[ob.fruit]) ? FRUITS[ob.fruit].color : (ob.color || '#fff');
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, depth, s), mat(shade(fc, -0.12), { roughness: 0.55 }));
    box.position.y = -depth / 2; group.add(box);
    const tex = fruitTexture(ob.fruit);
    const topMat = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 })
                       : mat(pop(fc, 0.1, 0.05), { roughness: 0.4 });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.97, s * 0.97), topMat);
    top.rotation.x = -Math.PI / 2; top.position.y = 0.4; group.add(top);
    shadowy(group, true, true);
    const baseY = group.position.y, baseX = group.position.x;
    let fallV = 0;
    const view = {
        object3d: group,
        update(o, dt, t) {
            const state = (o && o.state) || 'solid'; const d = dt || 0.016, tt = t || 0;
            if (state === 'solid') { group.position.set(baseX, baseY, group.position.z); group.visible = true; fallV = 0; }
            else if (state === 'dissolving') {
                group.position.x = baseX + Math.sin(tt * 40 + baseX) * 2.2;
                fallV += d * 150; group.position.y = baseY - fallV * 0.2; group.visible = true;
            } else { fallV += d * 720; group.position.y = baseY - 210 - fallV; group.visible = group.position.y > baseY - 1100; }
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

// Block Party: a wall in two halves with a gap between, sliding along y.
function makeSlideWall(ob) {
    const group = new THREE.Object3D();
    const h = ob.height || 210, thick = ob.thick || 42;
    const wallMat = mat(ob.color || WPAL.grape, { roughness: 0.5, metalness: 0.08 });
    const capMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.3 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(1, h, thick), wallMat);
    const right = new THREE.Mesh(new THREE.BoxGeometry(1, h, thick), wallMat);
    const capL = new THREE.Mesh(new THREE.BoxGeometry(1, 13, thick + 8), capMat);
    const capR = new THREE.Mesh(new THREE.BoxGeometry(1, 13, thick + 8), capMat);
    group.add(left, right, capL, capR);
    shadowy(group, true, true);
    function seg(mesh, cap, x0, x1) {
        const w = Math.max(1, x1 - x0), cx = (x0 + x1) / 2;
        mesh.scale.x = w; mesh.position.copy(W(cx, ob.y, h / 2));
        cap.scale.x = w; cap.position.copy(W(cx, ob.y, h + 2));
    }
    const view = {
        object3d: group,
        update(o) {
            const y = o ? o.y : ob.y, gapX = o ? o.gapX : ob.gapX, gapW = o ? o.gapW : ob.gapW;
            ob.y = y;
            seg(left, capL, ob.x0, gapX - gapW / 2);
            seg(right, capR, gapX + gapW / 2, ob.x1);
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob);
    return view;
}

function makeObstacleView(ob) {
    switch (ob && ob.kind) {
        case 'spinner':     return makeSpinner(ob);
        case 'hammer':      return makeHammer(ob);
        case 'doorwall':    return makeDoorWall(ob);
        case 'bouncepad':   return makeBouncePad(ob);
        case 'hex':         return makeHex(ob);
        case 'matchtile':   return makeMatchTile(ob);
        case 'conveyor':    return makeConveyor(ob);
        case 'bumper':      return makeBumper(ob);
        case 'movingblock': return makeMovingBlock(ob);
        case 'slidewall':   return makeSlideWall(ob);
        case 'cannon':      return makeCannon(ob);
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

        // RECTANGULAR floor (Block Party) — a square candy slab + gold rim.
        if (P.rect) {
            const platH = 40, w = P.hw * 2, h = P.hh * 2;
            const slab = new THREE.Mesh(new THREE.BoxGeometry(w, platH, h), mat(WPAL.track, { roughness: 0.6 }));
            slab.position.copy(W(P.cx, P.cy, 8)); shadowy(slab, true, true); this._add(slab);
            const inlay = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 5, h * 0.9), gloss(WPAL.trackAlt, { roughness: 0.4 }));
            inlay.position.copy(W(P.cx, P.cy, 8 + platH / 2 + 1)); inlay.receiveShadow = true; this._add(inlay);
            // gold cap rails around the four edges
            const railMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.25 });
            for (const [gw, gh, dx, dy] of [[w + 22, 16, 0, -P.hh], [w + 22, 16, 0, P.hh], [16, h + 22, -P.hw, 0], [16, h + 22, P.hw, 0]]) {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(gw, 14, gh), railMat);
                rail.position.copy(W(P.cx + dx, P.cy + dy, 8 + platH / 2 + 4)); shadowy(rail, true, true); this._add(rail);
            }
            const under = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 150, h * 0.86), mat(shade(WPAL.track, -0.32), { roughness: 0.8 }));
            under.position.copy(W(P.cx, P.cy, 8 - platH / 2 - 75)); this._add(under);
            return;
        }

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
