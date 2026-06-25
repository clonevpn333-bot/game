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
   Festive decoration builders — bunting strings, inflatable balloons,
   beach-balls and candy-stripe pillars. All are static (built once), so
   they're free of per-frame work; a couple expose a `bob` node the caller
   can wire into its anim list for a gentle idle sway.
   ===================================================================== */

// shared little geometry reused across many pennant flags (cheap + tidy).
const _flagPalette = [0xff5fa2, 0xffd34d, 0x8af0cf, 0x6cc6ff, 0x9a6cff, 0xff8cc0];
let _buntGeoCache = null;
function _buntFlagGeo() {
    // a small pennant triangle, ~11 radius x 26 tall (apex rotated to point down).
    if (_buntGeoCache) return _buntGeoCache;
    _buntGeoCache = new THREE.ConeGeometry(11, 26, 3);
    return _buntGeoCache;
}

// A drooping string of pennant flags between two world points (a..b) with a
// catenary-ish sag. Returns an Object3D. Flags alternate through the palette.
// opts: { count, sag, flagScale, cordColor }
function buntingLine(ax, az, bx, bz, topY, opts) {
    opts = opts || {};
    const g = new THREE.Object3D();
    const count = opts.count || 9;
    const sag = opts.sag != null ? opts.sag : 40;
    const flagScale = opts.flagScale != null ? opts.flagScale : 1;
    const dx = bx - ax, dz = bz - az;
    // a thin cord drawn as short segments following the sag curve.
    const cordMat = mat(opts.cordColor != null ? opts.cordColor : 0x6a4a2a, { roughness: 0.85, metalness: 0.0 });
    const segs = Math.max(count, 8);
    let prev = null;
    const flagMats = _flagPalette.map((c) => mat(c, { roughness: 0.55, side: THREE.DoubleSide }));
    for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const px = ax + dx * u, pz = az + dz * u;
        const droop = Math.sin(u * Math.PI) * sag;          // 0 at ends, max in the middle
        const py = topY - droop;
        if (prev) {
            const mx = (prev.x + px) / 2, my = (prev.y + py) / 2, mz = (prev.z + pz) / 2;
            const segLen = Math.hypot(px - prev.x, py - prev.y, pz - prev.z) + 0.5;
            const cord = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, segLen, 5), cordMat);
            cord.position.set(mx, my, mz);
            cord.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(px - prev.x, py - prev.y, pz - prev.z).normalize());
            g.add(cord);
        }
        prev = { x: px, y: py, z: pz };
    }
    // hang flags evenly along the cord, alternating colour.
    for (let i = 0; i < count; i++) {
        const u = (i + 0.5) / count;
        const px = ax + dx * u, pz = az + dz * u;
        const droop = Math.sin(u * Math.PI) * sag;
        const py = topY - droop - 13 * flagScale;
        const flag = new THREE.Mesh(_buntFlagGeo(), flagMats[i % flagMats.length]);
        flag.scale.setScalar(flagScale);
        flag.position.set(px, py, pz);
        flag.rotation.x = Math.PI;                          // apex points down
        flag.rotation.y = Math.atan2(dz, dx);               // face across the line
        g.add(flag);
    }
    return g;
}

// A glossy inflatable balloon on a string, tethered to a base point. Bobs
// gently if the caller wires the returned `bob` group into an anim loop.
// opts: { color, r, height (balloon centre above base) }
function balloonProp(color, opts) {
    opts = opts || {};
    const r = opts.r || 46;
    const height = opts.height != null ? opts.height : 300;
    const c = col(color, WPAL.curb);
    const root = new THREE.Object3D();
    const bob = new THREE.Object3D();                       // animate THIS
    root.add(bob);
    const balloonMat = inflate(c, { roughness: 0.16, clearcoat: 0.95, clearcoatRoughness: 0.2, emissiveIntensity: 0.07 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), balloonMat);
    body.scale.set(1, 1.18, 1);                             // a touch egg-shaped
    body.position.set(0, height, 0);
    bob.add(body);
    // a little knot + a bright highlight cap for that latex sheen.
    const knot = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, r * 0.34, 8), balloonMat);
    knot.position.set(0, height - r * 1.18, 0);
    bob.add(knot);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.32, 12, 10),
        mat(shade(c, 0.6), { roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0.12 }));
    hi.position.set(-r * 0.38, height + r * 0.5, r * 0.42);
    bob.add(hi);
    // a slim string down to the base.
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, height - r * 1.3, 5), mat(0xfff0f6, { roughness: 0.6 }));
    str.position.set(0, (height - r * 1.3) / 2, 0);
    bob.add(str);
    // a small gold anchor weight so it reads tethered to the ground.
    const anchor = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 14, 10), gloss(WPAL.gold, { roughness: 0.3, metalness: 0.4 }));
    anchor.scale.set(1, 0.6, 1);
    anchor.position.set(0, r * 0.16, 0);
    root.add(anchor);
    shadowy(body, true, false);
    return { root, bob };
}

// A big glossy beach-ball with classic coloured segment panels.
function beachBall(r, opts) {
    opts = opts || {};
    const g = new THREE.Object3D();
    const cols = opts.cols || [0xff5fa2, 0xfff3fb, 0xffd34d, 0xfff3fb, 0x6cc6ff, 0xfff3fb];
    const panels = cols.length;
    for (let i = 0; i < panels; i++) {
        const seg = new THREE.Mesh(
            new THREE.SphereGeometry(r, 18, 16, (i / panels) * Math.PI * 2, (Math.PI * 2) / panels),
            inflate(cols[i % cols.length], { roughness: 0.14, clearcoat: 0.9, emissiveIntensity: 0.06 }));
        g.add(seg);
    }
    // little white caps at the poles.
    for (const sy of [1, -1]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 12, 8),
            inflate(0xfff3fb, { roughness: 0.16, clearcoat: 0.8 }));
        cap.position.set(0, sy * r * 0.96, 0);
        g.add(cap);
    }
    shadowy(g, true, false);
    return g;
}

// A tall candy-stripe pillar (a barber-pole-ish column) topped with a glossy
// gold finial — a chunky inflatable landmark to plant beyond the curbs.
function candyPillar(h, r, opts) {
    opts = opts || {};
    const g = new THREE.Object3D();
    const cA = col(opts.a != null ? opts.a : WPAL.curb);
    const cB = col(opts.b != null ? opts.b : 0xfff3fb);
    const bands = Math.max(4, Math.round(h / (r * 1.6)));
    const bandH = h / bands;
    for (let i = 0; i < bands; i++) {
        const ring = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, bandH + 0.5, 20),
            inflate((i & 1) ? cB : cA, { roughness: 0.18, clearcoat: 0.85, emissiveIntensity: 0.05 }));
        ring.position.set(0, bandH * (i + 0.5), 0);
        g.add(ring);
    }
    // domed cap + a glossy gold finial.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        inflate(cA, { roughness: 0.16, clearcoat: 0.9 }));
    cap.position.set(0, h, 0);
    g.add(cap);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(r * 0.4, 16, 12), gloss(WPAL.gold, { roughness: 0.22, metalness: 0.5 }));
    finial.position.set(0, h + r * 0.7, 0);
    g.add(finial);
    // a wider gold base collar so it reads planted.
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.4, r * 0.5, 22),
        gloss(WPAL.gold, { roughness: 0.3, metalness: 0.35 }));
    base.position.set(0, r * 0.25, 0);
    g.add(base);
    shadowy(g, true, false);
    return g;
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

    // ---- a NEARER ring of soft rounded pastel HILLS (rolling domes) ----
    // squashed spheres sitting just inside the mountains so the horizon reads
    // as gentle candy hills rather than one hard wall of peaks.
    const hills = new THREE.Group();
    hills.name = 'hills';
    const hillPals = [WPAL.mint, WPAL.mtnA, WPAL.mtnC, WPAL.mtnB];
    const hillN = 22;
    for (let i = 0; i < hillN; i++) {
        const ang = (i / hillN) * Math.PI * 2 + (i % 2) * 0.14;
        const dist = 3300 + ((i * 47) % 5) * 220;
        const rad = 360 + ((i * 61) % 6) * 70;
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(rad, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
            mat(shade(hillPals[i % hillPals.length], (i % 2) ? 0.05 : -0.03), { roughness: 0.98, metalness: 0.0 }));
        dome.scale.set(1.35, 0.62, 1.35);                 // wide, low rolling hill
        dome.position.set(Math.cos(ang) * dist, -30, Math.sin(ang) * dist);
        hills.add(dome);
    }
    hills.renderOrder = -880;
    scene.add(hills);

    // (No blimps. The giant pastel airship-balls drifting in the sky read as
    // "big balls" looming over the course and are NOT authentic — removed.)
    const blimps = new THREE.Group(); blimps.name = 'blimps';   // empty placeholder
    const blimpSeeds = [];

    // ---- soft, FLAT cloud wisps low on the horizon (billboards, never balls) ----
    // Thin flat planes far away near the skyline give a gentle cloudy sky without
    // the old big sphere-clusters that looked like balls hanging over the course.
    const clouds = new THREE.Group();
    clouds.name = 'clouds';
    const discTex = softDiscTexture();
    const cloudMat = new THREE.MeshStandardMaterial({
        color: WPAL.cloud, roughness: 1.0, metalness: 0.0,
        emissive: 0xfff3ff, emissiveIntensity: 0.25, fog: true,
        transparent: true, opacity: 0.7, alphaMap: discTex || null,
        depthWrite: false, side: THREE.DoubleSide,
    });
    const cloudSeeds = [];
    for (let i = 0; i < 7; i++) {
        const puff = new THREE.Mesh(new THREE.PlaneGeometry(900, 320), cloudMat);
        puff.rotation.x = -Math.PI / 2.1;                 // lie nearly flat, faintly tilted to camera
        const ang = (i / 7) * Math.PI * 2 + 0.4;
        const dist = 3400 + (i % 3) * 420;
        puff.position.set(Math.cos(ang) * dist, 520 + (i % 3) * 180, Math.sin(ang) * dist - 400);
        puff.renderOrder = -880;
        clouds.add(puff);
        cloudSeeds.push({ puff, baseX: puff.position.x, baseY: puff.position.y, speed: 6 + (i % 4) * 3, ph: i * 1.3 });
    }
    scene.add(clouds);

    return {
        sun, hemi, sky, clouds, ambient, fill, glow, mountains, hills, blimps,
        update(dt, t) {
            t = t || 0;
            for (const cs of cloudSeeds) {
                let x = cs.baseX + (t * cs.speed) % 9000;
                if (x > 4500) x -= 9000;
                cs.puff.position.x = x + Math.sin(t * 0.05 + cs.ph) * 40;
                cs.puff.position.y = cs.baseY + Math.sin(t * 0.08 + cs.ph) * 18;
            }
            for (const bs of blimpSeeds) {
                let x = bs.baseX + (t * bs.speed) % 11000;
                if (x > 5500) x -= 11000;
                bs.b.position.x = x;
                bs.b.position.y = bs.baseY + Math.sin(t * 0.06 + bs.ph) * 26;
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
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.25, thick * 1.25, barH * 1.2, 24), hubMat);
    rotor.add(hub);
    // a bold glossy gold hub cap (the signature Fall Guys spinner centre).
    const goldHub = gloss(WPAL.gold, { roughness: 0.24, metalness: 0.5, emissive: 0x5a3d00, emissiveIntensity: 0.12 });
    const hubBand = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.32, thick * 1.32, barH * 0.4, 24), goldHub);
    hubBand.position.set(0, 0, 0);
    rotor.add(hubBand);
    const hubCap = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.78, 18, 14), goldHub);
    hubCap.scale.set(1, 0.8, 1);
    hubCap.position.set(0, barH * 0.66, 0);
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
    // big colourful windmill sails cycle through a vivid candy palette so each
    // blade is a different bright colour (like the real Fall Guys windmills).
    // solidColor: keep every sail the obstacle's own colour (alternating light/
    // dark bands) — used for the Whirlygig's signature pink X-crosses.
    const sailPalette = ob.solidColor
        ? [color, pop(shade(color, 0.34), 0.04, 0.04), color, shade(color, 0.18)]
        : [WPAL.curb, WPAL.gold, WPAL.mint, 0x6cc6ff, WPAL.grape, WPAL.curbLt];
    const sailMats = sailPalette.map((c) => inflate(c, { roughness: 0.22, clearcoat: 0.8, emissiveIntensity: 0.06 }));
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
                sailMats[i % sailMats.length]);
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
            // default 'bar' (and 'sweeper'): a FAT glossy candy bar with bright
            // wrap stripes (candy-cane look) and a beefy rounded paddle tip.
            const fatH = barH * 1.35, fatD = barD * 1.35;
            const barMat = gloss(color, { roughness: 0.22, metalness: 0.05, emissive: shade(color, -0.5), emissiveIntensity: 0.06 });
            const bar = roundedSlab(len, fatH, fatD, Math.min(fatH, fatD) * 0.46, barMat);
            bar.position.set(len / 2, 0, 0);
            arm.add(bar);
            // evenly spaced bright candy wrap stripes around the bar.
            const nStripes = 4;
            for (let s = 0; s < nStripes; s++) {
                const fx = len * (0.16 + s * (0.72 / (nStripes - 1)));
                const band = new THREE.Mesh(new THREE.BoxGeometry(len * 0.085, fatH * 1.05, fatD * 1.05), stripeMat);
                band.position.set(fx, 0, 0);
                arm.add(band);
            }
            // a glossy gold collar where the bar meets the hub.
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(fatH * 0.62, fatH * 0.62, len * 0.05, 16), gloss(WPAL.gold, { metalness: 0.45 }));
            collar.rotation.z = Math.PI / 2;
            collar.position.set(len * 0.06, 0, 0);
            arm.add(collar);
            // rounded paddle cap at the tip for a beefy toy look.
            const cap = new THREE.Mesh(new THREE.SphereGeometry(fatH * 0.72, 16, 12), capMat);
            cap.scale.set(1, 1, 1.12);
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

// Door Dash's signature wall: a chunky cream frame with pink "teeth" along the
// lintel (the monster-mouth look), filled with pastel rounded doors. The
// breakable doors are the way through; on a "tell" wall they sit a touch
// forward and shorter, leaving a pink gap below the teeth (the real game's cue).
function makeDoorWall(ob) {
    const group = new THREE.Object3D();
    const thick = ob.thick || 28;
    const doorH = 240;                     // tall enough you can't peek over
    const frameT = 16;                     // frame border thickness
    const y = ob.y;
    const tell = !!ob.tell;
    const span = ob.x1 - ob.x0;

    // chunky cream frame: sill + lintel + posts.
    const frameMat = inflate(0xfff6fb, { roughness: 0.36, clearcoat: 0.45 });
    const teethMat = gloss(WPAL.curb, { roughness: 0.34 });
    const sill = roundedSlab(span + thick + 12, 18, thick + 20, 8, frameMat);
    sill.position.copy(W((ob.x0 + ob.x1) / 2, y, 9));
    group.add(sill);
    const lintel = roundedSlab(span + thick + 12, 32, thick + 20, 10, frameMat);
    lintel.position.copy(W((ob.x0 + ob.x1) / 2, y, doorH + 20));
    group.add(lintel);

    // frame posts at each end + between every segment.
    const postGeo = roundedSlab(frameT * 1.5, doorH + 44, thick + 18, 6, frameMat).geometry;
    const colXs = new Set([ob.x0, ob.x1]);
    for (const s of ob.segs) { colXs.add(s.x0); colXs.add(s.x1); }
    for (const px of colXs) {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.copy(W(px, y, (doorH + 44) / 2));
        group.add(post);
    }

    // pink teeth hanging from the lintel — the toothy monster-mouth trim.
    const nTeeth = Math.max(7, Math.round(span / 58));
    const toothGeo = new THREE.ConeGeometry(11, 28, 4);
    for (let i = 0; i < nTeeth; i++) {
        const tx = ob.x0 + (i + 0.5) / nTeeth * span;
        const tooth = new THREE.Mesh(toothGeo, teethMat);
        tooth.position.copy(W(tx, y, doorH + 2));
        tooth.rotation.x = Math.PI;                 // point straight down
        tooth.rotation.z = Math.PI / 4;
        group.add(tooth);
    }

    // one door panel per segment, parented to a hinge so a broken one swings.
    const doorCols = [0x8af0cf, 0xff9ec4, 0x9fd6ff, 0xffe08a, 0xc9b6ff, 0xfff3fb];
    const knobMat = gloss(WPAL.gold, { roughness: 0.2, metalness: 0.5 });
    const panels = [];
    let di = 0;
    for (const s of ob.segs) {
        const w = s.x1 - s.x0;
        const isBreak = !!s.fake;                    // breakable = the real way through
        const fwd = (tell && isBreak) ? 16 : 0;      // tell: nudge the real door forward
        const panelH = (tell && isBreak) ? doorH - 26 : doorH - 6;
        const hinge = new THREE.Object3D();          // hinge on the left jamb
        hinge.position.copy(W(s.x0 + frameT * 0.8, y + fwd, 0));
        group.add(hinge);

        const panel = new THREE.Object3D();
        hinge.add(panel);
        const pw = w - frameT * 1.7;                 // leaf width inside frame
        const colr = doorCols[di % doorCols.length]; di++;
        const panelMat = inflate(colr, { roughness: 0.3, clearcoat: 0.5 });

        const board = roundedSlab(pw, panelH, thick, Math.min(pw, panelH) * 0.16, panelMat);
        board.position.set(pw / 2, panelH / 2, 0);
        panel.add(board);
        // a soft inset oval on each face so the door reads as cushioned, not flat.
        for (const sgn of [1, -1]) {
            const inset = new THREE.Mesh(new THREE.CylinderGeometry(pw * 0.3, pw * 0.3, thick * 0.3, 20),
                inflate(shade(colr, 0.16), { roughness: 0.3 }));
            inset.rotation.x = Math.PI / 2;
            inset.scale.set(1, 1, panelH / pw * 1.4);
            inset.position.set(pw / 2, panelH * 0.5, sgn * thick * 0.42);
            panel.add(inset);
        }
        // door knob near the free (right) edge, both faces.
        for (const sgn of [1, -1]) {
            const knob = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), knobMat);
            knob.position.set(pw - 14, panelH * 0.46, sgn * (thick * 0.5 + 4));
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
    // Hex-A-Gone tower tiles carry their own layer height (ob.z); flat fields
    // (Perfect Match / single-layer) sit at z=0.
    group.position.copy(W(ob.cx, ob.cy, ob.z || 0));

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
                for (const m of tile.material) { m.opacity = 1; if (m.emissive) { m.emissive.setRGB(0, 0, 0); m.emissiveIntensity = 0; } }
                bevelMat.opacity = 1; if (bevelMat.emissive) { bevelMat.emissive.copy(col(shade(color, -0.35))); bevelMat.emissiveIntensity = 0.08; }
                fallV = 0;
            } else if (state === 'dissolving') {
                // FLASH WHITE (the ~1s warning), jitter, then begin sinking & fading.
                group.position.x = baseX + Math.sin(tt * 45 + baseX) * 2.6;
                group.rotation.z = Math.sin(tt * 36) * 0.035;
                fallV += d * 140;
                group.position.y = baseY - fallV * 0.16;
                group.visible = true;
                const flash = 0.6 + Math.abs(Math.sin(tt * 18)) * 0.4;   // pulsing white glow
                for (const m of tile.material) {
                    m.transparent = true;
                    m.opacity = Math.max(0.45, m.opacity - d * 0.5);
                    if (m.emissive) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = flash; }
                }
                bevelMat.transparent = true;
                bevelMat.opacity = Math.max(0.45, bevelMat.opacity - d * 0.5);
                if (bevelMat.emissive) { bevelMat.emissive.setRGB(1, 1, 1); bevelMat.emissiveIntensity = flash; }
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
    // a darker inset lane so the bright chevrons pop against the belt.
    const laneMat = mat(shade(color, -0.32), { roughness: 0.55 });
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

    // a single chevron: two thick angled bars meeting at a forward point along
    // +X (travel). Bright glossy gold-white so the belt's direction reads clear.
    const chevMat = gloss(0xfff2a8, { roughness: 0.26, metalness: 0.1, emissive: 0xffe680, emissiveIntensity: 0.3 });
    function makeChevron() {
        const c = new THREE.Object3D();
        const barLen = Math.hypot(chevW / 2, chevD) + 4;
        const barT = Math.max(7, chevD * 0.46);          // chunkier arrow bars
        const barH = 5.5;                                // stand proud of the belt
        for (const sgn of [1, -1]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(barLen, barH, barT), chevMat);
            // angle the bar so the two meet at a forward point.
            bar.rotation.y = sgn * Math.atan2(chevW / 2, chevD);
            bar.position.set(-chevD * 0.32, barH * 0.3, sgn * chevW * 0.25);
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
                const wp = W(ball.x, ball.y, (ball.gz || 0) + ballR);
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

// Dizzy Heights: a rotating disc platform with 6 directional arrows + a centre
// nub. The top surface sits at world y=0 so beans stand on it; the arrow layer
// spins to match the sim's carry.
function makeSpinPlate(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.cx, ob.cy, 0));
    const R = ob.r || 150;
    const baseMat = inflate(ob.color, { roughness: 0.35, clearcoat: 0.4 });
    const rimMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.4 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, 22, 40), baseMat);
    disc.position.y = -11; disc.receiveShadow = true; group.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 3, 5, 10, 44), rimMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.5; group.add(rim);

    const top = new THREE.Object3D(); top.position.y = 1; group.add(top);
    const nub = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 16, 12), rimMat);
    nub.scale.y = 0.6; top.add(nub);
    if (ob.fan) {
        // Big Fans: raised fan BLADES radiating from the hub (you ride the disc).
        const bladeMat = inflate(shade(ob.color, -0.12), { roughness: 0.4 });
        const nB = 6;
        for (let i = 0; i < nB; i++) {
            const a = (i / nB) * Math.PI * 2;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(R * 0.9, 10, R * 0.34), bladeMat);
            blade.position.set(Math.cos(a) * R * 0.5, 6, Math.sin(a) * R * 0.5);
            blade.rotation.y = -a;
            top.add(blade);
        }
    } else {
        const arrowMat = gloss(0xffffff, { roughness: 0.32, emissive: 0xffffff, emissiveIntensity: 0.05 });
        const dirSign = (ob.speed >= 0) ? 1 : -1;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2, rr = R * 0.6;
            const arrow = new THREE.Mesh(new THREE.ConeGeometry(R * 0.085, R * 0.26, 4), arrowMat);
            arrow.position.set(Math.cos(a) * rr, 1.5, Math.sin(a) * rr);
            arrow.rotation.x = Math.PI / 2;
            arrow.rotation.z = -a + dirSign * Math.PI / 2;   // point tangentially (spin direction)
            top.add(arrow);
        }
    }
    shadowy(disc, false, true);
    shadowy(top, true, false);
    const view = {
        object3d: group,
        update(o) { top.rotation.y = -((o && o.angle != null) ? o.angle : (ob.angle || 0)); },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

// Stompin' Ground rhino — a BESPOKE chunky inflatable: barrel body with a valve
// + seam, oversized dopey head, one stubby foam horn (saturated contrast), little
// ears, big googly eyes, short stumpy waddle legs. Reads springy: rear-squashes
// on telegraph, leans + stretches on the charge, jiggles on the overshoot. Paw-
// dust + charge dust-trail driven from entity state.
function makeRhino(ob) {
    const group = new THREE.Object3D();
    const R = ob.r || 48;
    const body = col(ob.color || 0x9fa8ff);
    const skin = inflate(body, { roughness: 0.26, clearcoat: 0.9, clearcoatRoughness: 0.22 });
    const belly = inflate(shade(body, 0.34), { roughness: 0.3 });
    const seamM = mat(shade(body, -0.28), { roughness: 0.5 });
    const hornM = gloss(ob.hornColor || WPAL.gold, { roughness: 0.32 });
    const valveM = gloss(shade(body, -0.18), { roughness: 0.35, metalness: 0.2 });

    const rig = new THREE.Object3D(); rig.position.y = R * 0.1; group.add(rig);

    const torso = new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16), skin);
    torso.scale.set(1.5, 0.98, 1.08); torso.position.set(-R * 0.1, R * 0.95, 0); rig.add(torso);
    const bellyM = new THREE.Mesh(new THREE.SphereGeometry(R * 0.92, 18, 12), belly);
    bellyM.scale.set(1.42, 0.7, 1.0); bellyM.position.set(-R * 0.1, R * 0.7, 0); rig.add(bellyM);
    const rump = new THREE.Mesh(new THREE.SphereGeometry(R * 0.72, 16, 12), skin);
    rump.position.set(-R * 1.08, R * 0.96, 0); rig.add(rump);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(R * 0.78, R * 0.05, 6, 20, Math.PI), seamM);
    seam.rotation.set(0, 0, Math.PI / 2); seam.position.set(-R * 0.2, R * 0.95, 0); rig.add(seam);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.1, R * 0.13, R * 0.16, 8), valveM);
    valve.rotation.z = Math.PI / 2; valve.position.set(-R * 1.7, R * 1.0, 0); rig.add(valve);

    const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.66, 18, 14), skin);
    head.scale.set(1.18, 0.94, 0.96); head.position.set(R * 1.18, R * 0.8, 0); rig.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(R * 0.4, 14, 10), skin);
    snout.scale.set(1.2, 0.85, 0.9); snout.position.set(R * 1.62, R * 0.66, 0); rig.add(snout);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(R * 0.24, R * 0.8, 14), hornM);
    horn.position.set(R * 1.86, R * 1.0, 0); horn.rotation.z = -0.62; rig.add(horn);
    const hornTip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.11, 10, 8), hornM);
    hornTip.position.set(R * 2.06, R * 1.28, 0); rig.add(hornTip);
    const nub = new THREE.Mesh(new THREE.ConeGeometry(R * 0.12, R * 0.34, 12), hornM);
    nub.position.set(R * 1.5, R * 1.2, 0); nub.rotation.z = -0.42; rig.add(nub);

    const eyes = [];
    for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.18, 8, 8), seamM);
        ear.scale.set(0.55, 1.05, 0.7); ear.position.set(R * 0.88, R * 1.34, s * R * 0.42); rig.add(ear);
        const white = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 12, 10), mat(0xffffff, { roughness: 0.3 }));
        white.position.set(R * 1.5, R * 1.0, s * R * 0.34); rig.add(white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(R * 0.075, 8, 8), mat(0x241a30));
        pupil.position.set(R * 1.62, R * 1.0, s * R * 0.36); rig.add(pupil);
        eyes.push(pupil);
    }

    const legM = inflate(shade(body, -0.1), { roughness: 0.3 });
    const legs = [];
    for (const [lx, ls] of [[R * 0.78, -1], [R * 0.78, 1], [-R * 0.8, -1], [-R * 0.8, 1]]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.22, R * 0.34, 4, 10), legM);
        leg.position.set(lx, R * 0.34, ls * R * 0.58); rig.add(leg);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.24, 10, 8), seamM);
        foot.scale.set(1, 0.6, 1); foot.position.set(lx, R * 0.1, ls * R * 0.58); rig.add(foot);
        legs.push({ leg, foot, baseY: R * 0.34 });
    }

    shadowy(group, true, false);

    const dustMat = mat(0xffffff, { transparent: true, opacity: 0, roughness: 1, fog: false });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(R * 0.6, 8, 6), dustMat);
    puff.position.set(R * 1.4, R * 0.18, 0); group.add(puff);
    const trailMat = mat(0xf2ecff, { transparent: true, opacity: 0, roughness: 1, fog: false });
    const trail = new THREE.Mesh(new THREE.SphereGeometry(R * 0.7, 8, 6), trailMat);
    trail.scale.set(1.4, 0.8, 1.2); group.add(trail);

    group.position.copy(W(ob.x, ob.y, 0));
    let blink = U.rngf(1, 4);

    return {
        object3d: group,
        update(o, dt, t) {
            const O = o || ob;
            group.visible = !!O.active;
            if (!O.active) return;
            const d = dt || 0.016;
            group.position.set(O.x, 0, O.y);
            group.rotation.y = -(O.facing || 0);

            const sq = O.squash || 0, lean = O.lean || 0, wob = O.wobble || 0;
            const jig = wob ? Math.sin(t * 38) * 0.12 * wob : 0;
            rig.scale.set(
                1 - sq * 0.12 + Math.max(0, -sq) * 0.16,
                1 + (sq > 0 ? sq * 0.14 : 0) - Math.abs(jig),
                1 + (sq > 0 ? sq * 0.1 : 0) + jig);
            rig.rotation.z = -lean * 0.28 + jig * 0.5;
            rig.position.y = R * 0.1 + Math.max(0, sq) * R * 0.08;

            const g = O.gait || 0, moving = (O.speed || 0) > 2;
            const amp = O.state === 'charge' ? R * 0.2 : R * 0.13;
            legs.forEach((L, i) => {
                const lift = moving ? Math.max(0, Math.sin(g + i * 1.7)) * amp : 0;
                L.leg.position.y = L.baseY + lift;
                L.foot.position.y = R * 0.1 + lift * 0.4;
            });

            blink -= d;
            const bs = blink < 0.12 ? Math.max(0.1, blink / 0.12) : 1;
            if (blink < 0) blink = U.rngf(1.5, 4.5);
            eyes.forEach(e => { e.scale.y = bs; });

            const dz = O.dust || 0;
            dustMat.opacity = 0.6 * dz;
            puff.scale.set(0.6 + (1 - dz) * 1.9, 0.4 + (1 - dz) * 0.8, 0.6 + (1 - dz) * 1.9);

            const tr = O.trail || 0;
            trailMat.opacity = 0.4 * tr;
            trail.position.set(O.x - Math.cos(O.facing) * R * 1.6, R * 0.6, O.y - Math.sin(O.facing) * R * 1.6);
            trail.scale.set(1.4 + tr * 1.2, 0.8, 1.2);
        },
        dispose() { disposeTree(group); },
    };
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
// Each half is a chunky candy block: a coloured body, a glossy recessed face
// panel (both faces), a gold top-cap rail and gold corner pillars at the ends.
// Bodies/panels/caps scale in X to fill their span; the end pillars track the
// moving edges. All driven via transforms in update() — no per-frame allocs.
function makeSlideWall(ob) {
    const group = new THREE.Object3D();
    const h = ob.height || 210, thick = ob.thick || 42;
    const baseCol = col(ob.color || WPAL.grape);
    const wallMat = mat(pop(baseCol, 0.04, 0.02), { roughness: 0.46, metalness: 0.08 });
    const faceMat = gloss(pop(shade(baseCol, 0.24), 0.04, 0), { roughness: 0.3 });
    const capMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.32 });

    // build one chunky half (a group of unit-X meshes we scale to width).
    function makeHalf() {
        const half = new THREE.Object3D();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1, h - 6, thick), wallMat);
        body.position.y = h / 2;
        half.add(body);
        // recessed face panels on the up- and down-course faces.
        const faceF = new THREE.Mesh(new THREE.BoxGeometry(1, h * 0.62, thick * 0.16), faceMat);
        faceF.position.set(0, h / 2, thick / 2 - thick * 0.04);
        half.add(faceF);
        const faceB = new THREE.Mesh(new THREE.BoxGeometry(1, h * 0.62, thick * 0.16), faceMat);
        faceB.position.set(0, h / 2, -(thick / 2 - thick * 0.04));
        half.add(faceB);
        // gold top-cap rail.
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1, 14, thick + 10), capMat);
        cap.position.y = h + 2;
        half.add(cap);
        // gold corner pillars down both ends.
        const pL = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, h - 10, 12), capMat);
        const pR = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, h - 10, 12), capMat);
        pL.position.y = h / 2; pR.position.y = h / 2;
        half.add(pL, pR);
        return { half, body, faceF, faceB, cap, pL, pR };
    }
    const L = makeHalf(), R = makeHalf();
    group.add(L.half, R.half);
    shadowy(group, true, true);

    // place a half spanning [x0..x1] at the wall's current y.
    function seg(H, x0, x1) {
        const w = Math.max(1, x1 - x0), cx = (x0 + x1) / 2;
        H.half.position.copy(W(cx, ob.y, 0));
        const sx = w - 12;                          // inset so pillars cap the ends
        H.body.scale.x = sx; H.faceF.scale.x = sx * 0.9; H.faceB.scale.x = sx * 0.9;
        H.cap.scale.x = w;
        H.pL.position.x = -w / 2 + 6;
        H.pR.position.x = w / 2 - 6;
    }
    const view = {
        object3d: group,
        update(o) {
            const y = o ? o.y : ob.y, gapX = o ? o.gapX : ob.gapX, gapW = o ? o.gapW : ob.gapW;
            ob.y = y;
            seg(L, ob.x0, gapX - gapW / 2);
            seg(R, gapX + gapW / 2, ob.x1);
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob);
    return view;
}

// Gate Crash: a wide striped panel that slides up to block and down to pass.
function makeGate(ob) {
    const group = new THREE.Object3D();
    const w = ob.x1 - ob.x0, cx = (ob.x0 + ob.x1) / 2, thick = ob.thick || 40, maxH = ob.maxH || 220;
    const frameMat = inflate(0xffd86b, { roughness: 0.5 });     // mustard frame walls
    for (const px of [ob.x0, ob.x1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(22, maxH + 60, thick + 18), frameMat);
        post.position.copy(W(px, ob.y, (maxH + 60) / 2));
        group.add(post);
    }
    // the sliding gate panel — vertical pink/white stripes + a gold top cap.
    const pivot = new THREE.Object3D();
    pivot.position.copy(W(cx, ob.y, 0));
    group.add(pivot);
    const panel = new THREE.Object3D();
    pivot.add(panel);
    const pinkMat = inflate(WPAL.curb, { roughness: 0.3, clearcoat: 0.5 });
    const whiteMat = inflate(0xfff3fb, { roughness: 0.3 });
    const nStripes = Math.max(3, Math.round(w / 56));
    const sw = w / nStripes;
    for (let i = 0; i < nStripes; i++) {
        const seg = new THREE.Mesh(new THREE.BoxGeometry(sw - 2, maxH, thick), (i & 1) ? whiteMat : pinkMat);
        seg.position.set(-w / 2 + (i + 0.5) * sw, maxH / 2, 0);
        panel.add(seg);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 16, thick + 8), gloss(WPAL.gold, { metalness: 0.3 }));
    cap.position.set(0, maxH, 0);
    panel.add(cap);
    shadowy(group, true, true);
    const view = {
        object3d: group,
        update(o) {
            const h = (o && o.h != null) ? o.h : (ob.h || 0);
            pivot.position.y = (h - maxH);     // panel top reaches h; when h=0 it's hidden in the sill
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob);
    return view;
}

// Hoarders / Fall Ball: a big glossy pushable ball that rolls and tints to the
// sector it's in. Sits at world height = its radius (resting on the floor).
function makeBall(ob) {
    const group = new THREE.Object3D();
    const ballMat = gloss(ob.color || 0xfff3fb, { roughness: 0.34, clearcoat: 0.45 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(ob.r, 26, 20), ballMat);
    group.add(sphere);
    // two crossed seam bands so the roll reads.
    const seamMat = gloss(0xffffff, { roughness: 0.3 });
    for (let i = 0; i < 2; i++) {
        const seam = new THREE.Mesh(new THREE.TorusGeometry(ob.r * 1.001, ob.r * 0.07, 8, 28), seamMat);
        seam.rotation.x = i === 0 ? Math.PI / 2 : 0;
        sphere.add(seam);
    }
    shadowy(group, true, false);
    let last = ob.color;
    const view = {
        object3d: group,
        update(o) {
            const b = o || ob;
            group.position.set(b.x, b.r, b.y);            // x, height=r, z=sim-y
            sphere.rotation.x = b.spin || 0;
            sphere.rotation.z = (b.spin || 0) * 0.6;
            if (b.color !== last) { last = b.color; ballMat.color.copy(col(b.color)); }
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob);
    return view;
}

// a guard rail: a low candy-striped barrier wall (lifted onto its leg by the
// engine). A rounded top bar reads as the inflatable lip lining the course.
function makeWall(ob) {
    const g = new THREE.Object3D();
    const w = ob.hw * 2, d = ob.hh * 2, h = ob.height || 150;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        inflate(ob.color || WPAL.curb, { roughness: 0.34, clearcoat: 0.5 }));
    body.position.y = h / 2; shadowy(body, true, true); g.add(body);
    // bright rounded cap along the longer axis
    const long = Math.max(w, d), capR = Math.min(w, d) * 0.55;
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(capR, long - capR * 2, 4, 10),
        gloss(shade(ob.color || WPAL.curb, 0.3), { roughness: 0.3 }));
    cap.rotation.z = Math.PI / 2;
    if (d > w) cap.rotation.y = Math.PI / 2;
    cap.position.y = h; g.add(cap);
    return { object3d: g, update() {}, dispose() { disposeTree(g); } };
}

// a see-saw plank: a long candy deck on a chunky pivot wedge. update() tips the
// deck to the obstacle's eased tilt so a loaded end visibly dips.
function makeSeeSaw(ob) {
    const g = new THREE.Object3D();
    g.position.copy(W(ob.cx, ob.cy, 0));
    // pivot wedge (a fat triangular prism under the centre)
    const wedge = new THREE.Mesh(new THREE.CylinderGeometry(ob.hw * 0.34, ob.hw * 0.5, ob.hw * 0.6, 3),
        inflate(WPAL.grape, { roughness: 0.4 }));
    wedge.rotation.y = Math.PI / 2; wedge.position.y = -ob.hw * 0.3; shadowy(wedge, true, true); g.add(wedge);
    // the tilting deck
    const deck = new THREE.Object3D(); g.add(deck);
    const board = new THREE.Mesh(new THREE.BoxGeometry(ob.hw * 2, 22, ob.hl * 2),
        gloss(WPAL.curbLt, { roughness: 0.3 }));
    board.position.y = 11; shadowy(board, true, true); deck.add(board);
    // bright candy caps on the two ends so you can read which way it tips
    for (const [zc, c] of [[ob.hl - 16, WPAL.curb], [-(ob.hl - 16), WPAL.mint]]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(ob.hw * 2, 26, 30), inflate(c, { roughness: 0.34 }));
        cap.position.set(0, 13, zc); shadowy(cap, true, true); deck.add(cap);
    }
    // a low centre rail line on top for grip read
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(ob.hw * 0.3, 4, ob.hl * 1.8), gloss(shade(WPAL.curbLt, -0.3)));
    stripe.position.y = 23; deck.add(stripe);
    return {
        object3d: g,
        update(o) { deck.rotation.x = (o && o.tilt != null) ? o.tilt : ob.tilt || 0; },
        dispose() { disposeTree(g); },
    };
}

// a Roll-Out drum: coaxial candy-striped cylinder bands along x, each rolling at
// its own speed/direction. Beans stand on the crest; update() spins each band.
function makeDrum(ob) {
    const g = new THREE.Object3D();
    g.position.copy(W((ob.x0 + ob.x1) / 2, ob.cy, 0));
    const R = ob.R || 170, bands = ob.bands || [];
    const spinners = [];
    bands.forEach((b, i) => {
        const len = b.x1 - b.x0, mid = (b.x0 + b.x1) / 2 - (ob.x0 + ob.x1) / 2;
        const grp = new THREE.Object3D(); grp.position.set(mid, 0, 0); grp.rotation.z = Math.PI / 2; g.add(grp);
        const baseC = i % 2 ? WPAL.mint : WPAL.curb;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len * 0.96, 30, 1, false),
            inflate(baseC, { roughness: 0.34, clearcoat: 0.4 }));
        grp.add(cyl);
        // contrasting spokes so the spin (and its direction) reads clearly
        for (let s = 0; s < 6; s++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(R * 2.02, R * 0.16, len * 0.5),
                gloss(s % 2 ? WPAL.curbLt : shade(baseC, -0.3), { roughness: 0.3 }));
            stripe.rotation.x = s * Math.PI / 6; cyl.add(stripe);
        }
        // gold end caps between bands
        for (const ey of [-len / 2, len / 2]) {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 10, 30), gloss(WPAL.gold, { metalness: 0.3 }));
            cap.position.y = ey; cyl.add(cap);
        }
        shadowy(grp, true, true);
        spinners.push({ cyl, speed: b.speed });
    });
    return {
        object3d: g,
        update(o, dt) { for (const s of spinners) s.cyl.rotation.y += s.speed * dt; },
        dispose() { disposeTree(g); },
    };
}

// SLIME CLIMB rolling log: a fat candy-striped cylinder lying ACROSS a leg
// (axis along world Z = sim Y), spinning about that axis so its surface rolls
// beans down-leg in X. Yellow with bright wrap bands + rounded end caps.
function makeRollLog(ob) {
    const g = new THREE.Object3D();
    const r = ob.radius || 40, len = ob.len || 300;
    const color = col(ob.color, WPAL.gold);
    const spin = new THREE.Object3D();
    spin.rotation.x = Math.PI / 2;                  // local Y -> world Z (log axis)
    g.add(spin);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24),
        inflate(color, { roughness: 0.3, clearcoat: 0.6 }));
    spin.add(body);
    const bandMat = gloss(shade(color, -0.32), { roughness: 0.32 });
    for (const fy of [-len * 0.32, -len * 0.1, len * 0.12, len * 0.34]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, r * 0.16, 8, 20), bandMat);
        band.rotation.x = Math.PI / 2; band.position.y = fy; body.add(band);
    }
    for (const fy of [-len / 2, len / 2]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 16, 12),
            inflate(shade(color, 0.18), { roughness: 0.28, clearcoat: 0.7 }));
        cap.position.y = fy; body.add(cap);
    }
    shadowy(g, true, true);
    const baseSpin = (ob.dir != null ? ob.dir : 1);
    return {
        object3d: g,
        update(o, dt) {
            const z = (o && o.z != null) ? o.z : (ob.z || 0);
            g.position.copy(W(o ? o.cx : ob.cx, o ? o.cy : ob.cy, 0));
            g.position.y += z;                                  // re-assert leg height
            spin.rotation.y += baseSpin * (o ? o.speed : ob.speed) * (dt || 0);
        },
        dispose() { disposeTree(g); },
    };
}

// SLIME CLIMB doughnut pillar: a fat inflatable RING on a short post that slides
// side to side across a leg. The hole is the timed gap; the rim is the shove.
function makeRingSweep(ob) {
    const g = new THREE.Object3D();
    const R = ob.R || 64, tube = ob.tube || 20;
    const color = col(ob.color, WPAL.curb);
    const postMat = inflate(shade(color, -0.3), { roughness: 0.4, clearcoat: 0.5 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(tube * 0.7, tube * 0.9, R * 1.4, 14), postMat);
    post.position.y = R * 0.7; g.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 14, 30),
        inflate(color, { roughness: 0.28, clearcoat: 0.8 }));
    ring.position.y = R * 1.45; ring.rotation.y = Math.PI / 2; g.add(ring);   // hole opens along X
    for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        const seg = new THREE.Mesh(new THREE.TorusGeometry(R, tube * 1.02, 8, 8, 0.7),
            inflate(WPAL.cloud, { roughness: 0.32 }));
        seg.position.y = R * 1.45; seg.rotation.y = Math.PI / 2; seg.rotation.x = a; g.add(seg);
    }
    shadowy(g, true, true);
    return {
        object3d: g,
        update(o) {
            const z = (o && o.z != null) ? o.z : (ob.z || 0);
            g.position.copy(W(o ? o.cx : ob.cx, o ? o.cy : ob.cy, 0));
            g.position.y += z;                                  // ride the leg height while sliding
        },
        dispose() { disposeTree(g); },
    };
}

// SLIME CLIMB slimed walkway: a thin glossy pink goo slab laid over a leg's deck
// (cosmetic; the slowing lives in the obstacle). Sits at leg height.
function makeSlimeFloor(ob) {
    const g = new THREE.Object3D();
    const w = (ob.x1 - ob.x0), d = ob.hh * 2;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d),
        gloss(WPAL.slime, { roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.82,
            emissive: WPAL.slimeDk, emissiveIntensity: 0.35 }));
    slab.position.y = 5; slab.receiveShadow = true; g.add(slab);
    const blobMat = gloss(shade(WPAL.slime, 0.12), { roughness: 0.16, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 5; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(14 + i * 2, 12, 8), blobMat);
        blob.scale.y = 0.4;
        blob.position.set((i + 0.5) / 5 * w - w / 2, 8, U.rngf(-d * 0.3, d * 0.3));
        g.add(blob);
    }
    g.position.copy(W((ob.x0 + ob.x1) / 2, ob.cy, 0));
    return { object3d: g, update() {}, dispose() { disposeTree(g); } };
}

// Stompin' Ground ruin-pillar / rock — a stout inflatable charge-blocker.
function makeRhinoRock(ob) {
    const group = new THREE.Object3D();
    const R = ob.r || 46;
    const skin = inflate(ob.color || 0xb6a4ff, { roughness: 0.34, clearcoat: 0.6 });
    const capM = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.95, R * 1.05, R * 1.7, 14), skin);
    base.position.y = R * 0.85; group.add(base);
    const top = new THREE.Mesh(new THREE.SphereGeometry(R * 0.95, 14, 10), skin);
    top.scale.set(1, 0.7, 1); top.position.y = R * 1.7; group.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, R * 0.1, 8, 18), capM);
    ring.rotation.x = Math.PI / 2; ring.position.y = R * 1.2; group.add(ring);
    shadowy(group, true, true);
    group.position.copy(W(ob.x, ob.y, 0));
    return { object3d: group, update() {}, dispose() { disposeTree(group); } };
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
        case 'wall':        return makeWall(ob);
        case 'seesaw':      return makeSeeSaw(ob);
        case 'drum':        return makeDrum(ob);
        case 'rolllog':     return makeRollLog(ob);
        case 'ringsweep':   return makeRingSweep(ob);
        case 'slimefloor':  return makeSlimeFloor(ob);
        case 'rhino':       return makeRhino(ob);
        case 'rhinorock':   return makeRhinoRock(ob);
        case 'slidewall':   return makeSlideWall(ob);
        case 'cannon':      return makeCannon(ob);
        case 'spinplate':   return makeSpinPlate(ob);
        case 'gate':        return makeGate(ob);
        case 'ball':        return makeBall(ob);
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
        else if (kind === 'team') this._buildTeam(round);
        else if (kind === 'whirlygig') this._buildWhirlygig(round);
        else if (kind === 'hextower') this._buildHexTower(round);
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

        const curbH = 78, curbT = 30;
        const T = r.terrain;                                   // optional height profile
        const gz = (yy) => T ? T.heightAt(cx, yy) : 0;         // floor height at a course-y

        if (T) {
            // sloped / stepped / pitted track that follows the height profile
            this._buildTerrainTrack(r, { minX, maxX, cx, w, curbT, curbH });
        } else {
            // --- flat track slab (pastel blue), slightly raised over the slime ---
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
        const fz = gz(finishY);
        const chk = this._buildCheckerLine(minX, maxX, finishY, 21, 30); chk.position.y += fz; this._add(chk);
        const fArch = this._buildArch(minX, maxX, finishY, WPAL.gold, 'finish'); fArch.position.y += fz; this._add(fArch);

        // --- giant grabbable CROWN floating at the finish (Fall Mountain) ---
        if (r.crownFinish) { const cr = this._buildCrown((minX + maxX) / 2, finishY - 40, r.crownSlide); cr.position.y += fz; this._add(cr); }

        // --- START gate near maxY (grape) + a glowing start band ---
        const startY = maxY - 150;
        const sz = gz(startY);
        const sArch = this._buildArch(minX, maxX, startY, WPAL.grape, 'start'); sArch.position.y += sz; this._add(sArch);
        const startBand = mat(WPAL.grape, { roughness: 0.5, emissive: 0x2a0f55, emissiveIntensity: 0.25 });
        const band = new THREE.Mesh(new THREE.BoxGeometry(w, 4, 30), startBand);
        band.position.copy(W(cx, startY, 21 + sz));
        band.receiveShadow = true;
        this._add(band);

        // generic decoration is intentionally empty (see _decorateRace).
        this._decorateRace();
    }

    /* Build a race track that follows a Terrain height profile: one slab + curb
       run per segment, tilted for ramps, omitted for pits. World heights match
       the bean physics floor (top of each slab sits at the segment's z). */
    _buildTerrainTrack(r, P) {
        const { minX, maxX, cx, w, curbT, curbH } = P;
        const O = 20;                                   // courseView race y-offset compensation
        const thick = 22;
        const trackMat = mat(WPAL.track, { roughness: 0.7 });
        const trackAlt = mat(WPAL.trackAlt, { roughness: 0.72 });
        const curbMat = mat(WPAL.curb, { roughness: 0.5 });
        const capMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.25 });
        let si = 0;
        for (const s of r.terrain.segs) {
            if (s.void) continue;                       // a pit — leave it open (slime shows below)
            const yLen = s.yHi - s.yLo, ymid = (s.yLo + s.yHi) / 2;
            const zmid = (s.z0 + s.z1) / 2, dz = s.z1 - s.z0;
            const len3d = Math.hypot(yLen, dz) + 1;
            const tilt = Math.atan2(dz, yLen);          // rotate about world X (along the course)
            // track slab — top surface sits at the segment's floor height.
            const slab = new THREE.Mesh(new THREE.BoxGeometry(w, thick, len3d), (si++ & 1) ? trackAlt : trackMat);
            slab.position.set(cx, zmid - thick / 2 + O, ymid);
            slab.rotation.x = -tilt;
            slab.receiveShadow = true;
            this._add(slab);
            // curbs + gold caps, both sides, tilted to match.
            for (const side of [-1, 1]) {
                const wx = side < 0 ? minX - curbT / 2 : maxX + curbT / 2;
                const wall = new THREE.Mesh(new THREE.BoxGeometry(curbT, curbH, len3d), curbMat);
                wall.position.set(wx, zmid + curbH / 2 - 20 + O, ymid);
                wall.rotation.x = -tilt;
                shadowy(wall, true, true);
                this._add(wall);
                const cap = new THREE.Mesh(new THREE.BoxGeometry(curbT + 8, 12, len3d), capMat);
                cap.position.set(wx, zmid + curbH - 16 + O, ymid);
                cap.rotation.x = -tilt;
                shadowy(cap, true, true);
                this._add(cap);
            }
        }
    }

    /* Generic race dressing is intentionally EMPTY.

       The old festival kit (striped poles, pennant bunting, distance-marker
       signs, and the big bobbing balloons / beach-balls / candy pillars) was
       inauthentic — none of it exists in the real levels — and, worst of all,
       the tall poles/signs/inflatables crowded the camera and OBSCURED the
       view of the course. It is all removed.

       Each course now gets its own true-to-reference decoration inside its
       bespoke builder as it is overhauled one-to-one, kept low and to the
       sides so it never blocks the play view. */
    _decorateRace() { /* no generic decoration — see comment above */ }

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
    _buildCrown(cx, cy, slide) {
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
        const baseY = g.position.y, baseX = g.position.x;
        if (slide) {
            // Lost Temple: the Crown slides side-to-side (vs Fall Mountain's bob).
            this._anim.push((dt, t) => { g.rotation.y = t * 1.1; g.position.x = baseX + Math.sin(t * 0.9) * 220; g.position.y = baseY + Math.sin(t * 2) * 4; });
        } else {
            this._anim.push((dt, t) => { g.rotation.y = t * 1.1; g.position.y = baseY + Math.sin(t * 2) * 8; });
        }
        shadowy(g, true, false);
        return g;
    }

    // A bold celebratory gateway: two fat candy-striped inflatable pillars,
    // a chunky rounded top beam, a glossy banner board (START / FINISH) and a
    // drooping pennant garland — the unmistakable Fall Guys start/finish gate.
    _buildArch(minX, maxX, dy, color, label) {
        const g = new THREE.Object3D();
        const h = 340, postR = 26;
        const cx = (minX + maxX) / 2;
        const px0 = minX - 18, px1 = maxX + 18;

        // fat candy-striped inflatable pillars (alternating colour bands).
        const stripeLt = inflate(shade(color, 0.45), { roughness: 0.2, clearcoat: 0.85, emissiveIntensity: 0.05 });
        const stripeDk = inflate(color, { roughness: 0.2, clearcoat: 0.85, emissiveIntensity: 0.06 });
        const finialMat = gloss(WPAL.gold, { roughness: 0.22, metalness: 0.5 });
        const bands = 7, bandH = h / bands;
        for (const px of [px0, px1]) {
            const pillar = new THREE.Object3D();
            for (let b = 0; b < bands; b++) {
                const seg = new THREE.Mesh(
                    new THREE.CylinderGeometry(postR, postR * 1.04, bandH + 0.6, 18),
                    (b & 1) ? stripeLt : stripeDk);
                seg.position.set(0, (b + 0.5) * bandH, 0);
                pillar.add(seg);
            }
            // a wide gold base collar so it reads planted & chunky.
            const collar = new THREE.Mesh(new THREE.CylinderGeometry(postR * 1.3, postR * 1.5, 26, 22), finialMat);
            collar.position.set(0, 13, 0);
            pillar.add(collar);
            // a big rounded finial knob on top.
            const knob = new THREE.Mesh(new THREE.SphereGeometry(postR * 1.05, 20, 16), finialMat);
            knob.position.set(0, h + postR * 0.4, 0);
            pillar.add(knob);
            pillar.position.copy(W(px, dy, 0));
            shadowy(pillar, true, true);
            g.add(pillar);
        }

        // a chunky rounded top beam straddling the lane.
        const span = px1 - px0 + postR * 2;
        const beamMat = inflate(color, { roughness: 0.2, clearcoat: 0.85, emissiveIntensity: 0.08 });
        const beam = roundedSlab(span, 70, 44, 22, beamMat);
        beam.position.copy(W(cx, dy, h - 8));
        shadowy(beam, true, true);
        g.add(beam);
        // gold trim rails along the top & bottom lips of the beam.
        for (const zz of [h - 8 + 30, h - 8 - 30]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(span + 6, 9, 9), finialMat);
            rail.position.copy(W(cx, dy, zz));
            shadowy(rail, true, true);
            g.add(rail);
        }

        // a glossy banner board hung on the beam (the START / FINISH sign).
        const isFinish = (label === 'finish');
        const boardMat = gloss(isFinish ? 0xfff3fb : shade(color, 0.5), { roughness: 0.28, metalness: 0.05, emissive: shade(color, -0.4), emissiveIntensity: 0.1 });
        const boardW = Math.min(span * 0.62, 560);
        const board = roundedSlab(boardW, 96, 16, 22, boardMat);
        board.position.copy(W(cx, dy + 6, h - 84));
        shadowy(board, true, true);
        g.add(board);
        // a slim gold frame strip around the banner (top & bottom edge bars).
        for (const zz of [h - 84 + 46, h - 84 - 46]) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(boardW, 7, 22), finialMat);
            bar.position.copy(W(cx, dy + 6, zz));
            shadowy(bar, true, true);
            g.add(bar);
        }
        // three studs across the banner so it reads as a printed sign.
        for (const ux of [-0.32, 0, 0.32]) {
            const stud = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10),
                gloss(isFinish ? color : WPAL.gold, { roughness: 0.25, metalness: 0.4 }));
            stud.position.copy(W(cx + ux * boardW, dy + 14, h - 84));
            g.add(stud);
        }

        // a drooping pennant garland slung under the beam, pole to pole.
        const a = W(px0, dy, 0), b = W(px1, dy, 0);
        const garland = buntingLine(a.x, a.z, b.x, b.z, h - 40, { count: 13, sag: 56, flagScale: 1.2 });
        g.add(garland);

        return g;
    }

    /* -------- THE WHIRLYGIG: a chain of round mini-golf platforms over water -- */
    _buildWhirlygig(r) {
        const plats = r.platforms || [];
        const deco = r.deco || [];
        const midY = (r.minY + r.maxY) / 2;
        const W2 = (r.maxX - r.minX) + 1800, H2 = (r.maxY - r.minY) + 1600;
        if (r.groundKind === 'grass') {
            // a wide GRASS field below (Hit Parade sits on stilts over grass).
            const grass = new THREE.Mesh(new THREE.PlaneGeometry(W2 * 1.6, H2 * 1.3, 1, 1),
                mat(0x86d36a, { roughness: 0.95 }));
            grass.rotation.x = -Math.PI / 2; grass.position.set(r.cx, r.grassZ != null ? r.grassZ : -120, midY);
            grass.receiveShadow = true; this._add(grass);
        } else {
            // the goo the whole course floats over. On a CLIMB (r.slimeZ set) it's
            // a RISING flood: start it at slimeZ and track it upward every frame.
            const slimeBaseY = r.slimeZ != null ? r.slimeZ : -70;
            const s = makeSlime(r.cx, midY, 2400, H2, slimeBaseY);
            this._add(s.mesh); this._disposables.push(s.mesh); this._registerSlime(s, true);
            if (r.slimeZ != null) this._anim.push(() => { s.mesh.position.y = r.slimeZ; });
        }
        // round, concentric ring-walled bowl (Slime Climb's arena) — stacked
        // colour bands rising from the slime, with a soft rounded top rim.
        if (r.arena) {
            const A = r.arena;
            const bands = [['#e6395a', -160, 200], ['#ff9447', 40, 180], ['#46d36a', 220, 180], ['#5ad1ff', 400, 180]];
            for (const [c, y0, h] of bands) {
                const ring = new THREE.Mesh(new THREE.CylinderGeometry(A.r, A.r, h, 60, 1, true),
                    mat(c, { roughness: 0.85, side: THREE.DoubleSide }));
                ring.position.set(A.cx, y0 + h / 2, A.cy); ring.receiveShadow = true; this._add(ring);
            }
            const rim = new THREE.Mesh(new THREE.TorusGeometry(A.r, 32, 14, 60), inflate(WPAL.curb, { roughness: 0.4 }));
            rim.rotation.x = Math.PI / 2; rim.position.set(A.cx, 580, A.cy); this._add(rim);
        }

        const baseMat = mat(WPAL.track, { roughness: 0.72 });
        const altMat = mat(WPAL.trackAlt, { roughness: 0.72 });
        const chkA = mat(WPAL.track, { roughness: 0.66 });
        const chkB = mat(shade(WPAL.track, -0.22), { roughness: 0.66 });
        const rimMat = gloss(WPAL.gold, { roughness: 0.3, metalness: 0.35 });
        const sideMat = mat(shade(WPAL.track, -0.34), { roughness: 0.85 });

        const triMat = gloss(0xffd23f, { roughness: 0.32, metalness: 0.05, emissive: 0x5a4300, emissiveIntensity: 0.08 });
        // ---- platforms: round discs (with optional checker top) + ramps/slabs ----
        plats.forEach((p, i) => {
            if (p.spin) {
                // a Dizzy-Heights spinning plate: the SpinPlate obstacle view IS
                // the visible disc, so the floor platform stays invisible here.
                return;
            } else if (p.tri) {
                // a yellow inflatable TRIANGLE bumper wedged in the gap (walkable).
                const z = p.z || 0, tr = p.triR || (p.r * 1.5);
                const tri = new THREE.Mesh(new THREE.CylinderGeometry(tr, tr * 0.94, 26, 3), triMat);
                tri.rotation.y = p.triA || 0; tri.position.set(p.cx, z - 11, p.cy); tri.receiveShadow = true; shadowy(tri, true, true); this._add(tri);
                return;
            } else if (p.disc) {
                const z = p.z || 0;
                const disc = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.95, 46, 64), (i & 1) ? altMat : baseMat);
                disc.position.set(p.cx, z - 23, p.cy); disc.receiveShadow = true; disc.castShadow = false; this._add(disc);
                // a "checkered" triangular blue top — alternating pie wedges.
                if (p.checker) {
                    const n = 14, ss = Math.PI * 2 / n;
                    for (let w = 0; w < n; w++) {
                        const wedge = new THREE.Mesh(new THREE.CircleGeometry(p.r - 5, 30, w * ss, ss), (w & 1) ? chkA : chkB);
                        wedge.rotation.x = -Math.PI / 2; wedge.position.set(p.cx, z + 1.6, p.cy); wedge.receiveShadow = true; this._add(wedge);
                    }
                }
                const rim = new THREE.Mesh(new THREE.TorusGeometry(p.r - 1, 9, 12, 80), rimMat);
                rim.rotation.x = Math.PI / 2; rim.position.set(p.cx, z + 2, p.cy); shadowy(rim, true, true); this._add(rim);
            } else if (p.xramp) {
                // a SWITCHBACK leg: a sloped box climbing along X (sim x → world x),
                // from (xLo,z0) to (xHi,z1). Tilt about world Z so the +x end rises.
                const x0 = p.x0, x1 = p.x1, y0 = p.y0, y1 = p.y1, z0 = p.z0 || 0, z1 = (p.z1 != null ? p.z1 : p.z0) || 0;
                const w = x1 - x0, depth = y1 - y0, dz = z1 - z0, hyp = Math.hypot(w, dz) || 1;
                const ang = Math.atan2(dz, w);
                const slab = new THREE.Mesh(new THREE.BoxGeometry(hyp, 26, depth), baseMat);
                slab.position.set((x0 + x1) / 2, (z0 + z1) / 2 - 6, (y0 + y1) / 2);
                slab.rotation.z = ang;
                slab.receiveShadow = true; this._add(slab);
                // dark skirt under the leg so it reads thick/solid from the side.
                const skirt = new THREE.Mesh(new THREE.BoxGeometry(hyp * 0.99, 80, depth * 0.96), sideMat);
                skirt.position.set((x0 + x1) / 2, (z0 + z1) / 2 - 50, (y0 + y1) / 2);
                skirt.rotation.z = ang; this._add(skirt);
                // side rails following the climb, along the two long (north/south) edges.
                if (p.rail) {
                    this._wRail(x0, y0 + 6, z0, x1, y0 + 6, z1, p.rail);
                    this._wRail(x0, y1 - 6, z0, x1, y1 - 6, z1, p.rail);
                }
            } else {
                // a ramp / slab: a sloped box from (yLo,z0) to (yHi,z1).
                const x0 = p.x0, x1 = p.x1, y0 = p.y0, y1 = p.y1, z0 = p.z0 || 0, z1 = (p.z1 != null ? p.z1 : p.z0) || 0;
                const w = x1 - x0, dy = y1 - y0, dz = z1 - z0, hyp = Math.hypot(dy, dz) || 1;
                const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 26, hyp), baseMat);
                slab.position.set((x0 + x1) / 2, (z0 + z1) / 2 - 6, (y0 + y1) / 2);
                slab.rotation.x = -Math.atan2(dz, dy);
                slab.receiveShadow = true; this._add(slab);
                // dark skirt under the ramp so it reads thick/solid from the side.
                const skirt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 80, hyp * 0.99), sideMat);
                skirt.position.set((x0 + x1) / 2, (z0 + z1) / 2 - 50, (y0 + y1) / 2);
                skirt.rotation.x = -Math.atan2(dz, dy); this._add(skirt);
                // visual stair treads (purple stairs) on flagged ramps.
                if (p.stairs) {
                    const steps = 9, sm = gloss(shade(WPAL.grape, 0.12), { roughness: 0.5 });
                    for (let k = 1; k < steps; k++) {
                        const t = k / steps, yy = y0 + dy * t, zz = z0 + dz * t;
                        const tread = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 7, 16), sm);
                        tread.position.set((x0 + x1) / 2, zz + 4, yy); shadowy(tread, true, true); this._add(tread);
                    }
                }
                // side rails following the ramp slope.
                if (p.rail) {
                    this._wRail(x0 + 6, y0, z0, x0 + 6, y1, z1, p.rail);
                    this._wRail(x1 - 6, y0, z0, x1 - 6, y1, z1, p.rail);
                }
            }
        });

        // ---- decorations (crown / chevrons / windmills / rails / column / beams) ----
        for (const d of deco) {
            if (d.type === 'crown') this._wCrownEmblem(d.cx, d.cy, d.z || 0);
            else if (d.type === 'chevrons') this._wChevrons(d.cx, d.cy, d.z || 0, d.r, d.ang || -Math.PI / 2);
            else if (d.type === 'windmillDeco') this._wWindmill(d.cx, d.cy, d.z || 0, d.r, d.color, d.speed);
            else if (d.type === 'rail') this._wRail(d.x0, d.y0, d.z, d.x1, d.y1, d.z, d.color);
            else if (d.type === 'column') this._wColumn(d.cx, d.cy, d.z || 0, d.h, d.r);
            else if (d.type === 'cylbeam') this._wCylBeam(d);
            else if (d.type === 'roller') this._wRoller(d);
            else if (d.type === 'donut') this._wDonut(d.cx, d.cy, d.z || 0, d.r);
        }

        // ---- start arch on the start platform, finish checker + arch on the last.
        // Works for either a disc (cx/cy/r) or a slab (x0..x1/y0..y1).
        const ctr = (p) => p.disc
            ? { cx: p.cx, cy: p.cy, hw: p.r, z: p.z || 0 }
            : { cx: (p.x0 + p.x1) / 2, cy: (p.y0 + p.y1) / 2, hw: (p.x1 - p.x0) / 2, z: p.z0 || 0 };
        const p0 = plats.find(p => p.start), pN = plats.find(p => p.finish);
        if (p0) { const c = ctr(p0); const a = this._buildArch(c.cx - 260, c.cx + 260, c.cy - c.hw * 0.55, WPAL.grape, 'start'); a.position.y += c.z; this._add(a); }
        if (pN) {
            const c = ctr(pN);
            const chk = this._buildCheckerLine(c.cx - 200, c.cx + 200, c.cy, 21, 30); chk.position.y += c.z; this._add(chk);
            const a = this._buildArch(c.cx - 240, c.cx + 240, c.cy, WPAL.gold, 'finish'); a.position.y += c.z; this._add(a);
        }
    }

    // a railing of posts + a top bar running between two 3D points (z lerps).
    _wRail(ax, ay, az, bx, by, bz, color) {
        const g = new THREE.Object3D();
        const postMat = inflate(color || WPAL.grape, { roughness: 0.3, clearcoat: 0.6 });
        const barMat = gloss(shade(color || WPAL.grape, 0.25), { roughness: 0.35 });
        const len = Math.hypot(bx - ax, by - ay, bz - az) || 1;
        const n = Math.max(2, Math.round(len / 150));
        const top = 60;                                   // rail height above the deck
        for (let i = 0; i <= n; i++) {
            const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, top, 12), postMat);
            post.position.set(x, z + top / 2, y); shadowy(post, true, false); g.add(post);
        }
        // a continuous top bar (a thin box spanning the run, tilted to match).
        const dy = by - ay, dz = bz - az, hyp = Math.hypot(dy, dz) || 1;
        const span = Math.hypot(bx - ax, by - ay, bz - az);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 10, span), barMat);
        bar.position.set((ax + bx) / 2, (az + bz) / 2 + top, (ay + by) / 2);
        bar.rotation.x = -Math.atan2(dz, dy);
        if (Math.abs(bx - ax) > 1) bar.rotation.y = Math.atan2(bx - ax, by - ay);
        shadowy(bar, true, false); g.add(bar);
        this._add(g); return g;
    }

    // a small decorative pinwheel windmill on a post (non-colliding; spins).
    _wWindmill(cx, cy, z, r, color, speed) {
        const g = new THREE.Object3D(); g.position.set(cx, z, cy);
        const postMat = mat(shade(color || WPAL.curb, -0.3), { roughness: 0.5 });
        const hubH = r * 1.7;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.16, hubH, 12), postMat);
        post.position.y = hubH / 2; shadowy(post, true, false); g.add(post);
        const rotor = new THREE.Object3D(); rotor.position.set(0, hubH, r * 0.18);
        const sailMats = [color, shade(color || WPAL.curb, 0.4), WPAL.gold, WPAL.cloud].map(c => inflate(c, { roughness: 0.24, clearcoat: 0.7 }));
        for (let i = 0; i < 4; i++) {
            const a = i / 4 * Math.PI * 2;
            const sail = new THREE.Mesh(new THREE.BoxGeometry(r * 0.34, r * 0.95, 4), sailMats[i % sailMats.length]);
            sail.position.set(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0); sail.rotation.z = a;
            shadowy(sail, true, false); rotor.add(sail);
        }
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 12, 10), gloss(WPAL.gold, { metalness: 0.4 }));
        rotor.add(cap);
        g.add(rotor); this._add(g);
        const sp = speed || 1.3;
        this._anim.push((dt) => { rotor.rotation.z += sp * dt; });
        return g;
    }

    // the tall central pink-striped column (matches the Post collider).
    _wColumn(cx, cy, z, h, r) {
        const g = new THREE.Object3D(); g.position.set(cx, z, cy);
        const bands = Math.max(4, Math.round(h / 60));
        const pink = inflate(WPAL.curb, { roughness: 0.24, clearcoat: 0.8 });
        const white = inflate(WPAL.cloud, { roughness: 0.3, clearcoat: 0.6 });
        const bh = h / bands;
        for (let b = 0; b < bands; b++) {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(r, r, bh + 0.5, 24), (b & 1) ? pink : white);
            seg.position.y = b * bh + bh / 2; shadowy(seg, true, false); g.add(seg);
        }
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.3, 14, 24), gloss(WPAL.gold, { metalness: 0.4 }));
        collar.position.y = 8; g.add(collar);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 18, 14), gloss(WPAL.gold, { roughness: 0.24, metalness: 0.5 }));
        cap.position.y = h + r * 0.5; g.add(cap);
        this._add(g); return g;
    }

    // a bright YELLOW cylindrical balance beam (Slime Climb's signature bridge):
    // a round-topped log laid along the course over the slime, so you slip off
    // if you're not dead-centre. d = {cx, y0, y1, z0, z1, r}.
    _wCylBeam(d) {
        const y0 = d.y0, y1 = d.y1, z0 = d.z0 || 0, z1 = d.z1 != null ? d.z1 : (d.z0 || 0), r = d.r || 40;
        const dy = y1 - y0, dz = z1 - z0, len = Math.hypot(dy, dz) || 1;
        const m = gloss(0xffd23f, { roughness: 0.32, metalness: 0.1, emissive: 0x5a4300, emissiveIntensity: 0.08 });
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), m);
        cyl.rotation.x = Math.PI / 2 - Math.atan2(dz, dy);   // lay along world Z, tilt to the slope
        cyl.position.set(d.cx, (z0 + z1) / 2 + r * 0.2, (y0 + y1) / 2);
        shadowy(cyl, true, true); this._add(cyl);
        // end caps so the log reads solid.
        for (const [yy, zz] of [[y0, z0], [y1, z1]]) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
            cap.position.set(d.cx, zz + r * 0.2, yy); shadowy(cap, true, false); this._add(cap);
        }
        return cyl;
    }

    // a horizontal ROLLING LOG laid across the path (Hit Parade): a blue
    // cylinder along X with stripe bands, continuously rolling about its length.
    // d = {cx, cy, z, len, r, speed, color}.
    _wRoller(d) {
        const r = d.r || 30, len = d.len || 300;
        const g = new THREE.Object3D();
        g.position.set(d.cx, (d.z || 0) + r, d.cy);
        g.rotation.z = Math.PI / 2;                          // lay the cylinder along world X
        const m = inflate(d.color || 0x5ad1ff, { roughness: 0.34, clearcoat: 0.4 });
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), m);
        g.add(cyl);
        const bandMat = gloss(0xff5fa2, { roughness: 0.35 });
        for (const fy of [-len * 0.3, 0, len * 0.3]) {
            const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.16, 8, 18), bandMat);
            band.rotation.x = Math.PI / 2; band.position.y = fy; cyl.add(band);
        }
        for (const fy of [-len / 2, len / 2]) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 14, 10), gloss(WPAL.gold, { metalness: 0.3 }));
            cap.position.y = fy; cyl.add(cap);
        }
        shadowy(g, true, true); this._add(g);
        const sp = d.speed || 2.4;
        this._anim.push((dt) => { cyl.rotation.y += sp * dt; });   // roll about its length
        return g;
    }

    // the giant inflatable RING float bobbing in the slime — Slime Climb's
    // signature set-dressing.
    _wDonut(cx, cy, z, r) {
        const g = new THREE.Object3D(); g.position.set(cx, z, cy);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.42, 14, 36),
            inflate(WPAL.curbLt, { roughness: 0.3, clearcoat: 0.7 }));
        ring.rotation.x = Math.PI / 2; g.add(ring);
        // a couple of white stripe bands around the tube.
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2;
            const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.43, 8, 12, 0.5),
                inflate(WPAL.cloud, { roughness: 0.35 }));
            band.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); band.rotation.y = -a; g.add(band);
        }
        this._add(g);
        const baseY = z;
        this._anim.push((dt, t) => { g.position.y = baseY + Math.sin((t || 0) * 0.8) * 8; g.rotation.y = (t || 0) * 0.15; });
        return g;
    }

    // yellow chevron arrows painted on a disc, pointing along `ang`.
    _wChevrons(cx, cy, z, r, ang) {
        const g = new THREE.Object3D(); g.position.set(cx, z + 1.8, cy); g.rotation.y = -ang;
        const m = gloss(WPAL.gold, { roughness: 0.4, emissive: 0x5a3d00, emissiveIntensity: 0.12 });
        for (let k = 0; k < 3; k++) {
            const off = (k - 1) * r * 0.34;
            for (const sgn of [-1, 1]) {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, 3, 16), m);
                // a "V": two arms meeting at the front, opening backward.
                arm.position.set(sgn * r * 0.18, 0, off);
                arm.rotation.y = sgn * 0.7;
                g.add(arm);
            }
        }
        this._add(g); return g;
    }

    // a flat crown emblem painted on the start slab (concentric rings + star).
    _wCrownEmblem(cx, cy, z) {
        const g = new THREE.Object3D(); g.position.set(cx, z + 2, cy);
        const ringG = gloss(WPAL.gold, { roughness: 0.34, metalness: 0.3 });
        const ringP = gloss(WPAL.curb, { roughness: 0.4 });
        const r1 = new THREE.Mesh(new THREE.TorusGeometry(190, 10, 10, 64), ringG); r1.rotation.x = Math.PI / 2; g.add(r1);
        const r2 = new THREE.Mesh(new THREE.TorusGeometry(140, 7, 10, 56), ringP); r2.rotation.x = Math.PI / 2; g.add(r2);
        // a low golden crown prop in the middle (short — steppable, not blocking).
        const goldM = gloss(WPAL.gold, { roughness: 0.26, metalness: 0.5, emissive: 0x5a3d00, emissiveIntensity: 0.16 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(46, 52, 26, 24, 1, true), goldM); band.position.y = 14; g.add(band);
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(10, 30, 8), goldM);
            spike.position.set(Math.cos(a) * 48, 36, Math.sin(a) * 48); g.add(spike);
        }
        shadowy(g, true, false); this._add(g); return g;
    }

    /* ---------------- TEAM: a sector-tinted arena (Hoarders / Fall Ball) ---- */
    _buildTeam(r) {
        const P = r.platform, cx = P.cx, cy = P.cy;
        if (P.rect) {
            const hw = P.hw, hh = P.hh;
            const floor = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 30, hh * 2), mat(0x69c46e, { roughness: 0.75 }));
            floor.position.set(cx, -15, cy); floor.receiveShadow = true; this._add(floor);
            // painted centre line + circle
            const lineMat = gloss(0xffffff, { roughness: 0.4 });
            const mid = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 2, 8), lineMat); mid.position.set(cx, 1, cy); this._add(mid);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(90, 4, 8, 40), lineMat); ring.rotation.x = Math.PI / 2; ring.position.set(cx, 1, cy); this._add(ring);
            // perimeter walls + two goals (team-coloured frames) at the short ends
            const wallMat = inflate(WPAL.curb, { roughness: 0.4 });
            for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(20, 70, hh * 2), wallMat); w.position.set(cx + sx * hw, 35, cy); shadowy(w, true, true); this._add(w); }
            for (const sy of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 70, 20), wallMat); w.position.set(cx, 35, cy + sy * hh); shadowy(w, true, true); this._add(w); }
            if (r.goals) for (const g of r.goals) {
                const gm = gloss(r.teams[g.team].color, { roughness: 0.4, metalness: 0.2 });
                const post = new THREE.Mesh(new THREE.BoxGeometry(g.w, 95, 16), gm);
                post.position.set(g.x, 48, g.y); shadowy(post, true, true); this._add(post);
            }
        } else {
            const R = P.r, nT = P.sectors || 3, ss = Math.PI * 2 / nT;
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 30, 60), mat(shade(WPAL.track, -0.05), { roughness: 0.72 }));
            disc.position.set(cx, -15, cy); disc.receiveShadow = true; this._add(disc);
            for (let i = 0; i < nT; i++) {
                const wedge = new THREE.Mesh(new THREE.CircleGeometry(R - 6, 44, i * ss, ss),
                    mat(r.teams[i].color, { roughness: 0.62, side: THREE.DoubleSide }));
                wedge.rotation.x = Math.PI / 2; wedge.position.set(cx, 1.5, cy); this._add(wedge);
            }
            const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 16, 12, 64), gloss(WPAL.gold, { metalness: 0.3 }));
            rim.rotation.x = Math.PI / 2; rim.position.set(cx, 12, cy); shadowy(rim, true, true); this._add(rim);
        }
        const s = makeSlime(cx, cy, 3600, 3600, -52); this._add(s.mesh); this._disposables.push(s.mesh); this._registerSlime(s);
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
            // chunky candy corner posts with glossy gold finials — frames the
            // arena and reads unmistakably as a Fall Guys Block Party platform.
            const postMat = inflate(WPAL.curb, { roughness: 0.2, clearcoat: 0.8, emissiveIntensity: 0.05 });
            const finMat = gloss(WPAL.gold, { roughness: 0.24, metalness: 0.5 });
            for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(20, 24, 96, 18), postMat);
                post.position.copy(W(P.cx + sx * P.hw, P.cy + sy * P.hh, 8 + platH / 2 + 48));
                shadowy(post, true, true); this._add(post);
                const fin = new THREE.Mesh(new THREE.SphereGeometry(22, 18, 14), finMat);
                fin.position.copy(W(P.cx + sx * P.hw, P.cy + sy * P.hh, 8 + platH / 2 + 96 + 14));
                shadowy(fin, true, false); this._add(fin);
            }
            // festive bunting strung between the four corner posts.
            const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
            for (let ci = 0; ci < 4; ci++) {
                const c0 = corners[ci], c1 = corners[(ci + 1) % 4];
                const a = W(P.cx + c0[0] * P.hw, P.cy + c0[1] * P.hh, 0);
                const b = W(P.cx + c1[0] * P.hw, P.cy + c1[1] * P.hh, 0);
                const line = buntingLine(a.x, a.z, b.x, b.z, 8 + platH / 2 + 92, { count: 9, sag: 40, flagScale: 1.05 });
                this._add(line);
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
    /* -------- HEX-A-GONE: a tall tower of honeycomb layers over slime -------
       Hundreds of hex tiles → one InstancedMesh per layer (a handful of draw
       calls) so the whole tower stays fast. Per frame we reflect each tile's
       sim state into its instance: solid sits at its layer height; dissolving
       flashes white and sinks; gone shrinks away. */
    _buildHexTower(r) {
        const cx = r.cx != null ? r.cx : 640, cy = r.cy != null ? r.cy : 400;
        const R = r._towerR || 470;
        const sea = makeSlime(cx, cy, R * 4.6, R * 4.6, -70);
        this._add(sea.mesh); this._disposables.push(sea.mesh); this._registerSlime(sea, true);

        const tiles = r.tiles || [];
        const byLayer = new Map();
        for (const t of tiles) { if (!byLayer.has(t.layer)) byLayer.set(t.layer, []); byLayer.get(t.layer).push(t); }

        const depth = 22;
        // a unit point-up hex prism (radius 1, height 1); scaled per instance.
        const geo = new THREE.CylinderGeometry(1, 0.98, 1, 6); geo.rotateY(Math.PI / 6);
        const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
        const WHITE = new THREE.Color(1, 1, 1);
        const layers = [];
        for (const [, arr] of byLayer) {
            const n = arr.length;
            // base material white so the per-instance colour shows through.
            const m = mat(0xffffff, { roughness: 0.46, metalness: 0.05 });
            const im = new THREE.InstancedMesh(geo, m, n);
            // shadows off: a thousand shadow-casting instances murders software
            // GL, and the tower reads fine flat-lit (beans still cast/receive).
            im.castShadow = false; im.receiveShadow = false;
            for (let i = 0; i < n; i++) {
                const t = arr[i];
                P.set(t.cx, t.z - depth / 2, t.cy); S.set(t.size, depth, t.size);
                im.setMatrixAt(i, M.compose(P, Q.identity(), S));
                im.setColorAt(i, col(t.color));
                t._li = i;
            }
            im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
            this._add(im);
            layers.push({ im, arr });
        }

        this._anim.push((dt, t) => {
            const tt = t || 0;
            for (const { im, arr } of layers) {
                let mD = false, cD = false;
                for (let i = 0; i < arr.length; i++) {
                    const tile = arr[i];
                    if (tile._lastState === tile.state && tile.state !== 'dissolving') continue;
                    if (tile.state === 'solid') {
                        P.set(tile.cx, tile.z - depth / 2, tile.cy); S.set(tile.size, depth, tile.size);
                        im.setMatrixAt(i, M.compose(P, Q.identity(), S)); im.setColorAt(i, col(tile.color)); mD = cD = true;
                    } else if (tile.state === 'dissolving') {
                        const k = 1 - (tile.timer / (tile.dissolveTime || 0.95));
                        P.set(tile.cx, tile.z - depth / 2 - k * 9, tile.cy); S.set(tile.size * (1 - k * 0.12), depth, tile.size * (1 - k * 0.12));
                        im.setMatrixAt(i, M.compose(P, Q.identity(), S)); im.setColorAt(i, WHITE); mD = cD = true;   // flash white
                    } else {  // gone — shrink away
                        S.set(0.001, 0.001, 0.001); P.set(tile.cx, tile.z, tile.cy);
                        im.setMatrixAt(i, M.compose(P, Q.identity(), S)); mD = true;
                    }
                    tile._lastState = tile.state;
                }
                if (mD) im.instanceMatrix.needsUpdate = true;
                if (cD && im.instanceColor) im.instanceColor.needsUpdate = true;
            }
        });
    }

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
