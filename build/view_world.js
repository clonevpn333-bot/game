/* =====================================================================
   view_world.js — the 3D world for Bean Royale (Fall Guys tribute).
   Procedural Three.js (r160) scene graph: NO external assets, NO WebGL
   renderer calls. We only build / update Object3D graphs.

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

/* ---------------------------------------------------------------------
   Small shared helpers
   ------------------------------------------------------------------- */

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
    const out = c.clone();
    if (t >= 0) out.lerp(new THREE.Color(0xffffff), t);
    else out.lerp(new THREE.Color(0x000000), -t);
    return out;
}

// standard playful material.
function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial(Object.assign({
        color: col(color, 0xffffff),
        roughness: opts.roughness != null ? opts.roughness : 0.62,
        metalness: opts.metalness != null ? opts.metalness : 0.04,
    }, opts.emissive != null ? { emissive: col(opts.emissive, 0x000000) } : {},
       opts.emissiveIntensity != null ? { emissiveIntensity: opts.emissiveIntensity } : {},
       opts.transparent ? { transparent: true } : {},
       opts.opacity != null ? { opacity: opts.opacity } : {},
       opts.side != null ? { side: opts.side } : {}));
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
                if (m.map && m.map.dispose) m.map.dispose();
                if (m.dispose) m.dispose();
            }
        }
    });
    if (root.parent) root.parent.remove(root);
}

/* ---------------------------------------------------------------------
   ENVIRONMENT — lights, sky dome, fog.
   ------------------------------------------------------------------- */
function setupEnvironment(scene) {
    // --- soft hemisphere ambient (sky tint over ground tint) ---
    const hemi = new THREE.HemisphereLight(0xbfeaff, 0xf3b9e0, 0.85);
    hemi.position.set(0, 1600, 0);
    scene.add(hemi);

    // --- gentle fill so shadowed sides aren't muddy ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(ambient);

    // --- the sun: directional key light with a big shadow frustum ---
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sun.position.set(-700, 1500, 900);     // up & to the side, behind start
    sun.target.position.set(0, 0, -200);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -1400; sc.right = 1400;
    sc.top = 1400; sc.bottom = -1400;
    sc.near = 10; sc.far = 4200;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 1.0;
    scene.add(sun);
    scene.add(sun.target);

    // --- sky dome: big back-side sphere with vertical gradient ---
    const skyColTop = new THREE.Color(0x5ad1ff);   // PAL.skyTop
    const skyColBot = new THREE.Color(0xd8f4ff);   // brighter near horizon
    const skyGeo = new THREE.SphereGeometry(6000, 32, 16);
    let skyMat;
    if (typeof document !== 'undefined' && document.createElement) {
        // gradient via CanvasTexture (browser path)
        const cv = document.createElement('canvas');
        cv.width = 8; cv.height = 256;
        const g2d = cv.getContext('2d');
        const grad = g2d.createLinearGradient(0, 0, 0, 256);
        grad.addColorStop(0.0, '#3aa9ff');   // zenith
        grad.addColorStop(0.55, '#7fd8ff');
        grad.addColorStop(1.0, '#dff6ff');    // horizon
        g2d.fillStyle = grad;
        g2d.fillRect(0, 0, 8, 256);
        const tex = new THREE.CanvasTexture(cv);
        tex.needsUpdate = true;
        skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
    } else {
        // Node / headless fallback: solid sky-blue
        skyMat = new THREE.MeshBasicMaterial({ color: skyColTop.clone().lerp(skyColBot, 0.4), side: THREE.BackSide, fog: false, depthWrite: false });
    }
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'sky';
    sky.renderOrder = -1000;
    scene.add(sky);

    // also set a background color so the clear is pleasant even before sky draws
    scene.background = skyColTop.clone().lerp(skyColBot, 0.35);

    // --- gentle fog for depth (light blue) ---
    scene.fog = new THREE.Fog(0xbfe8ff, 1400, 5200);

    // --- a few drifting puffy clouds (cheap, decorative) ---
    const clouds = new THREE.Group();
    clouds.name = 'clouds';
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 1.0, metalness: 0.0,
        emissive: 0xffffff, emissiveIntensity: 0.25, fog: false,
    });
    const cloudSeeds = [];
    for (let i = 0; i < 7; i++) {
        const puff = new THREE.Group();
        const lobes = 3 + (i % 3);
        for (let j = 0; j < lobes; j++) {
            const r = 120 + ((i * 53 + j * 37) % 90);
            const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
            m.position.set((j - lobes / 2) * 130, ((i + j) % 2) * 40, (j % 2) * 60);
            m.scale.set(1, 0.6, 1);
            puff.add(m);
        }
        const ang = (i / 7) * Math.PI * 2;
        const dist = 2600 + (i % 4) * 350;
        puff.position.set(Math.cos(ang) * dist, 1500 + (i % 3) * 260, Math.sin(ang) * dist - 600);
        clouds.add(puff);
        cloudSeeds.push({ puff, baseX: puff.position.x, speed: 8 + (i % 5) * 3 });
    }
    scene.add(clouds);

    return {
        sun, hemi, sky, clouds, ambient,
        update(dt, t) {
            t = t || 0;
            // drift clouds slowly along world X, wrapping around.
            for (const cs of cloudSeeds) {
                cs.puff.position.x = cs.baseX + Math.sin(t * 0.02 + cs.baseX) * 60 + (t * cs.speed) % 6000;
                if (cs.puff.position.x > 4200) cs.puff.position.x -= 8400;
            }
        },
    };
}

/* ---------------------------------------------------------------------
   OBSTACLE VIEWS
   makeObstacleView(ob) dispatches on ob.kind.  Each returns
   { object3d, update(ob,dt,t), dispose() }.
   ------------------------------------------------------------------- */

// arms of a spinner sit higher when it's an overhead bar vs a low sweeper.
function spinnerLift(ob) {
    return (ob.height != null && ob.height < 200) ? 10 : 34;
}

function makeSpinner(ob) {
    const group = new THREE.Object3D();
    group.position.copy(W(ob.cx, ob.cy, 0));

    const color = col(ob.color, 0xff5fa2);
    const thick = ob.thick || 18;
    const len = ob.len || 200;
    const arms = Math.max(1, ob.arms || 2);
    const lift = spinnerLift(ob);

    // central post from ground up to the arms, + a hub.
    const postMat = mat(shade(color, -0.25), { roughness: 0.5 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(thick * 0.6, thick * 0.8, lift + thick, 16), postMat);
    post.position.set(0, (lift + thick) / 2, 0);
    group.add(post);

    // the rotor carries the arms; we spin THIS about world Y.
    const rotor = new THREE.Object3D();
    rotor.position.set(0, lift + thick * 0.5, 0);
    group.add(rotor);

    const hubMat = mat(shade(color, -0.15), { roughness: 0.45, metalness: 0.1 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(thick * 1.1, thick * 1.1, thick * 1.3, 20), hubMat);
    rotor.add(hub);

    // each arm is a long box laid along +X, then rotated about Y into place.
    const armMat = mat(color, { roughness: 0.5, metalness: 0.06 });
    const capMat = mat(shade(color, 0.35), { roughness: 0.4 });
    for (let i = 0; i < arms; i++) {
        const a = (i * Math.PI * 2) / arms;           // matches sim _ends()
        const arm = new THREE.Object3D();
        arm.rotation.y = -a;   // logical angle a -> world -Y rotation (X/Y -> X/Z handedness)
        const bar = new THREE.Mesh(new THREE.BoxGeometry(len, thick, thick * 1.15), armMat);
        bar.position.set(len / 2, 0, 0);
        arm.add(bar);
        // rounded paddle cap at the tip for a toy look.
        const cap = new THREE.Mesh(new THREE.SphereGeometry(thick * 0.85, 14, 10), capMat);
        cap.position.set(len, 0, 0);
        arm.add(cap);
        rotor.add(arm);
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            // sim drives ob.angle; mirror it. logical +angle (CCW in X/Y)
            // becomes -rotation.y in world (X right, Z = +logical-y).
            rotor.rotation.y = -((o && o.angle != null) ? o.angle : ob.angle || 0);
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
    // pivot height: hang the pendulum from a tower above the lane.
    const pivotH = Math.max(180, headR * 4 + 120);

    // support tower beside the lane so the pivot has something to hang from.
    const towerMat = mat(0x6a5acd, { roughness: 0.6 });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(26, pivotH, 26), towerMat);
    tower.position.copy(W(cx - amp - 60, cy, pivotH / 2));
    group.add(tower);
    const tower2 = tower.clone();
    tower2.position.copy(W(cx + amp + 60, cy, pivotH / 2));
    group.add(tower2);
    // cross-beam between towers.
    const beam = new THREE.Mesh(new THREE.BoxGeometry((amp + 60) * 2, 22, 22), towerMat);
    beam.position.copy(W(cx, cy, pivotH));
    group.add(beam);

    // pivot pivots in the world ZX? No: head sweeps along logical X at depth cy,
    // so it swings in the world X/Y(height) plane -> rotate about world Z.
    const pivot = new THREE.Object3D();
    pivot.position.copy(W(cx, cy, pivotH));
    group.add(pivot);

    const armLen = pivotH - headR * 1.2;
    const armMat = mat(0x9a8cff, { roughness: 0.5, metalness: 0.1 });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, armLen, 12), armMat);
    // cylinder default is along +Y; we want it hanging down from pivot.
    arm.position.set(0, -armLen / 2, 0);
    pivot.add(arm);

    const headMat = mat(0xffd23f, { roughness: 0.35, metalness: 0.2, emissive: 0x6b4a00, emissiveIntensity: 0.15 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 22, 16), headMat);
    head.position.set(0, -armLen, 0);
    pivot.add(head);
    // a couple of "studs" so the swinging head reads as a mace.
    const studMat = mat(shade(col(0xffd23f), -0.2), { metalness: 0.3 });
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const stud = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.28, headR * 0.5, 8), studMat);
        stud.position.set(Math.cos(a) * headR, -armLen + Math.sin(a) * headR, 0);
        stud.rotation.z = -a + Math.PI / 2;
        pivot.add(stud);
    }

    shadowy(group, true, true);

    // map a pendulum phase so head world-X = cx + sin(phase)*amp.
    // pivot rotates about world Z by angle theta; head sits at depth = arm*sin(theta)?
    // We instead drive a swing angle from asin(sin(phase)) clamped, so the head's
    // X offset = armLen*sin(theta). To honor amp exactly we scale: theta from
    // desired x-offset = sin(phase)*amp -> theta = asin(clamp(x/armLen)).
    function applyPhase(phase) {
        const desiredX = Math.sin(phase) * amp;
        const ratio = Math.max(-1, Math.min(1, desiredX / armLen));
        const theta = Math.asin(ratio);
        // rotate pivot about world Z so the down-hanging arm swings in X.
        pivot.rotation.z = theta;
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
    const doorH = 230;                     // tall enough that you can't peek over
    const y = ob.y;

    // door-frame posts at each end.
    const postMat = mat(0x5a4632, { roughness: 0.8 });
    const postGeo = new THREE.BoxGeometry(thick * 0.7, doorH + 40, thick + 18);
    for (const px of [ob.x0, ob.x1]) {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.copy(W(px, y, (doorH + 40) / 2));
        group.add(post);
    }

    // one swinging panel per segment. We parent each panel to a hinge so a
    // "broken" panel can swing open instead of just vanishing.
    const panelMat = mat(0xcaa46a, { roughness: 0.7, metalness: 0.05 });
    const panelInsetMat = mat(shade(col(0xcaa46a), 0.18), { roughness: 0.65 });
    const knobMat = mat(0xffd23f, { roughness: 0.3, metalness: 0.4 });
    const panels = [];
    for (const s of ob.segs) {
        const w = s.x1 - s.x0;
        const hinge = new THREE.Object3D();
        // hinge at the segment's left edge, on the ground.
        hinge.position.copy(W(s.x0, y, 0));
        group.add(hinge);

        const panel = new THREE.Object3D();
        panel.position.set(0, 0, 0);
        hinge.add(panel);

        const board = new THREE.Mesh(new THREE.BoxGeometry(w - 6, doorH, thick), panelMat);
        board.position.set(w / 2, doorH / 2, 0);
        panel.add(board);
        // recessed inset rectangle for a paneled-door look.
        const inset = new THREE.Mesh(new THREE.BoxGeometry((w - 6) * 0.62, doorH * 0.72, thick * 0.4), panelInsetMat);
        inset.position.set(w / 2, doorH / 2, thick * 0.42);
        panel.add(inset);
        const inset2 = inset.clone();
        inset2.position.set(w / 2, doorH / 2, -thick * 0.42);
        panel.add(inset2);
        // door knob near the free edge.
        const knob = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 10), knobMat);
        knob.position.set(w - 12, doorH * 0.5, thick * 0.5 + 4);
        panel.add(knob);

        panels.push({ seg: s, hinge, panel, board, openT: 0, dropped: false });
    }

    shadowy(group, true, true);

    const view = {
        object3d: group,
        update(o, dt, t) {
            const segs = (o && o.segs) ? o.segs : ob.segs;
            for (let i = 0; i < panels.length; i++) {
                const p = panels[i];
                const seg = segs[i] || p.seg;
                if (seg.broken) {
                    // swing open + slowly tip away once broken.
                    p.openT = Math.min(1, p.openT + (dt || 0.016) * 4.5);
                    p.hinge.rotation.y = -p.openT * (Math.PI * 0.62);   // swing about hinge
                    p.panel.rotation.z = -p.openT * 0.15;               // slight sag
                    p.board.visible = true;
                } else {
                    p.openT = 0;
                    p.hinge.rotation.y = 0;
                    p.panel.rotation.z = 0;
                    p.board.visible = true;
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

    // a low cushioned disc: base ring + springy top dome we squash over time.
    const baseMat = mat(0xff3f86, { roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.15, 8, 28), baseMat);
    base.position.set(0, 4, 0);
    group.add(base);

    // the bouncy part — its scale.y pulses.
    const padMat = mat(0xff5fa2, { roughness: 0.35, metalness: 0.05, emissive: 0x5a1030, emissiveIntensity: 0.2 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 16, 28), padMat);
    pad.position.set(0, 14, 0);
    group.add(pad);

    // white rim accent.
    const rimMat = mat(0xffffff, { roughness: 0.4 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 3.2, 8, 28), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 22, 0);
    group.add(rim);

    // a chevron/arrow on top hinting "bounce up".
    const arrowMat = mat(0xffffff, { roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, r * 0.5, 4), arrowMat);
    arrow.position.set(0, 30, 0);
    arrow.rotation.y = Math.PI / 4;
    group.add(arrow);

    shadowy(group, true, true);

    const baseY = 14;
    const view = {
        object3d: group,
        update(o, dt, t) {
            // sim resets BouncePad.t to 0 on bounce; we don't get t here,
            // so animate a gentle idle breathing + a time-based pulse so the
            // pad always looks springy/alive.
            const tt = t || 0;
            const breathe = 0.06 * Math.sin(tt * 3.0 + ob.x * 0.01);
            const sQ = 1 + breathe;          // squash factor
            pad.scale.y = sQ;
            pad.position.y = baseY - (1 - sQ) * 8;
            arrow.position.y = 30 + breathe * 14 + 2 * Math.sin(tt * 3.0 + ob.x * 0.01 + 1.2);
            arrow.rotation.y = Math.PI / 4 + tt * 0.6;
        },
        dispose() { disposeTree(group); },
    };
    view.update(ob, 0, 0);
    return view;
}

function makeHex(ob) {
    const group = new THREE.Object3D();
    const size = ob.size || 33;
    const depth = 26;                       // prism thickness (height of tile)
    group.position.copy(W(ob.cx, ob.cy, 0));

    const color = col(ob.color, 0x9a8cff);
    // CylinderGeometry with 6 radial segments == a hexagonal prism.
    // point-up to match sim's hexagon (a = π/3*i - π/2).
    const topMat = mat(color, { roughness: 0.55, metalness: 0.04 });
    const sideMat = mat(shade(color, -0.18), { roughness: 0.6 });
    const geo = new THREE.CylinderGeometry(size, size, depth, 6);
    // group materials: index 0 = side, 1 = top cap, 2 = bottom cap.
    const tile = new THREE.Mesh(geo, [sideMat, topMat, sideMat]);
    tile.position.set(0, depth / 2, 0);
    tile.rotation.y = Math.PI / 6;           // flat-top -> point-up orientation
    group.add(tile);

    // a thin bright bevel cap on top for the glossy candy look.
    const bevelMat = mat(shade(color, 0.3), { roughness: 0.35, emissive: shade(color, -0.4), emissiveIntensity: 0.1 });
    const bevel = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.82, size * 0.9, depth * 0.18, 6), bevelMat);
    bevel.position.set(0, depth + depth * 0.06, 0);
    bevel.rotation.y = Math.PI / 6;
    group.add(bevel);

    shadowy(group, true, true);

    const baseY = group.position.y;
    let fallV = 0;            // accumulated drop velocity once dissolving/gone
    const view = {
        object3d: group,
        update(o, dt, t) {
            const state = (o && o.state) ? o.state : ob.state || 'solid';
            const d = dt || 0.016;
            if (state === 'solid') {
                group.position.y = baseY;
                group.position.x = ob.cx;        // (world X == logical x)
                group.rotation.y = 0;
                group.visible = true;
                tile.material[1].opacity = 1; tile.material[0].opacity = 1;
                fallV = 0;
            } else if (state === 'dissolving') {
                // shake horizontally + begin sinking & fading.
                const tt = t || 0;
                group.position.x = ob.cx + Math.sin(tt * 38) * 2.2;
                fallV += d * 120;
                group.position.y = baseY - fallV * 0.15;
                group.visible = true;
                // fade the caps a touch.
                for (const m of tile.material) {
                    m.transparent = true;
                    m.opacity = Math.max(0.35, m.opacity - d * 0.6);
                }
            } else { // 'gone'
                // drop away fast, then hide.
                fallV += d * 600;
                group.position.y = baseY - 200 - fallV;
                group.visible = group.position.y > baseY - 900;
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
            // unknown kind: harmless empty group so the engine never crashes.
            const g = new THREE.Object3D();
            return { object3d: g, update() {}, dispose() { disposeTree(g); } };
        }
    }
}

/* ---------------------------------------------------------------------
   COURSE VIEW — static round geometry.
   ------------------------------------------------------------------- */

// A reusable animated "slime" plane (pink, faint emissive shimmer).
function makeSlime(cx, cy, w, h, y) {
    const slimeMat = new THREE.MeshStandardMaterial({
        color: 0xd23bb0,
        roughness: 0.35,
        metalness: 0.0,
        emissive: 0x9c1f86,
        emissiveIntensity: 0.35,
    });
    const geo = new THREE.PlaneGeometry(w, h, 1, 1);
    const mesh = new THREE.Mesh(geo, slimeMat);
    mesh.rotation.x = -Math.PI / 2;          // lay flat on world XZ
    mesh.position.set(cx, y != null ? y : -2, cy);
    mesh.receiveShadow = true;
    return { mesh, slimeMat };
}

class CourseView {
    constructor(round) {
        this._root = new THREE.Object3D();
        this._root.name = 'course';
        this._disposables = [];
        this._anim = [];                  // [{fn}] called each update
        this._round = round || {};
        const kind = (round && round.kind) || 'race';
        if (kind === 'race') this._buildRace(round);
        else if (kind === 'survival') this._buildSurvival(round);
        else if (kind === 'final') this._buildFinal(round);
        else this._buildRace(round);
    }

    get object3d() { return this._root; }

    _add(obj) { this._root.add(obj); return obj; }

    // ---------------- RACE: long pastel track + curbs + finish + start ----
    _buildRace(r) {
        const minX = r.minX != null ? r.minX : 200;
        const maxX = r.maxX != null ? r.maxX : 1080;
        const minY = r.minY != null ? r.minY : 240;
        const maxY = r.maxY != null ? r.maxY : 2680;
        const finishY = r.finishY != null ? r.finishY : (minY + 180);
        const cx = r.cx != null ? r.cx : (minX + maxX) / 2;
        const w = maxX - minX;
        const len = maxY - minY;

        // --- the track slab (pastel blue), slightly raised over slime ---
        const trackMat = mat(0x7fd0ff, { roughness: 0.85, metalness: 0.0 });
        const track = new THREE.Mesh(new THREE.BoxGeometry(w, 18, len), trackMat);
        track.position.copy(W(cx, (minY + maxY) / 2, 9));
        track.receiveShadow = true;
        this._add(track);

        // subtle centre lane stripe (dashed look via a thin lighter slab).
        const stripeMat = mat(shade(col(0x7fd0ff), 0.22), { roughness: 0.8 });
        const dashLen = 90, gap = 70;
        for (let yy = minY + 60; yy < maxY - 60; yy += dashLen + gap) {
            const seg = Math.min(dashLen, maxY - 60 - yy);
            if (seg <= 0) break;
            const dash = new THREE.Mesh(new THREE.BoxGeometry(10, 2, seg), stripeMat);
            dash.position.copy(W(cx, yy + seg / 2, 18.6));
            dash.receiveShadow = true;
            this._add(dash);
        }

        // --- raised side walls / curbs ---
        const curbH = 70, curbT = 26;
        const curbMatA = mat(0xff5fa2, { roughness: 0.6 });   // candy pink
        const curbMatB = mat(0xffd23f, { roughness: 0.6 });   // gold accent stripe on top
        for (const side of [-1, 1]) {
            const wx = side < 0 ? minX - curbT / 2 : maxX + curbT / 2;
            const wall = new THREE.Mesh(new THREE.BoxGeometry(curbT, curbH, len), curbMatA);
            wall.position.copy(W(wx, (minY + maxY) / 2, curbH / 2));
            shadowy(wall, true, true);
            this._add(wall);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(curbT + 6, 12, len), curbMatB);
            cap.position.copy(W(wx, (minY + maxY) / 2, curbH + 6));
            shadowy(cap, true, true);
            this._add(cap);
        }

        // --- decorative pink SLIME planes flanking the track (deadly look) ---
        const slimePad = 1400;
        for (const side of [-1, 1]) {
            const sx = side < 0 ? minX - slimePad / 2 - curbT : maxX + slimePad / 2 + curbT;
            const s = makeSlime(sx, (minY + maxY) / 2, slimePad, len + 800, -4);
            this._add(s.mesh);
            this._registerSlime(s);
        }
        // slime caps beyond the finish + behind the start too.
        const sFront = makeSlime(cx, minY - 500, w + slimePad * 2 + 400, 1000, -4);
        this._add(sFront.mesh); this._registerSlime(sFront);

        // --- CHECKERED finish line at logical depth finishY ---
        this._add(this._buildCheckerLine(minX, maxX, finishY, 19, 28));
        // finish gantry arch + "FINISH" banner bar.
        this._add(this._buildGantry(minX, maxX, finishY, 0xffd23f, 'finish'));

        // --- START gate near maxY ---
        const startY = maxY - 150;
        this._add(this._buildGantry(minX, maxX, startY, 0x7b46d6, 'start'));
        // start floor band.
        const bandMat = mat(0x7b46d6, { roughness: 0.6, emissive: 0x2a0f55, emissiveIntensity: 0.2 });
        const band = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 26), bandMat);
        band.position.copy(W(cx, startY, 19.5));
        band.receiveShadow = true;
        this._add(band);
    }

    // black/white checker strip laid flat across the track at depth `dy`.
    _buildCheckerLine(minX, maxX, dy, yLevel, sq) {
        const g = new THREE.Object3D();
        const w = maxX - minX;
        const cols = Math.ceil(w / sq);
        const rows = 2;
        const black = mat(0x1c1c22, { roughness: 0.7 });
        const white = mat(0xf4f4f8, { roughness: 0.7 });
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const m = ((i + j) & 1) ? black : white;
                const cw = Math.min(sq, w - i * sq);
                if (cw <= 0) continue;
                const cell = new THREE.Mesh(new THREE.BoxGeometry(cw, 2, sq), m);
                cell.position.copy(W(minX + i * sq + cw / 2, dy - sq + j * sq + sq / 2, yLevel));
                cell.receiveShadow = true;
                g.add(cell);
            }
        }
        return g;
    }

    // a simple arch (two posts + top beam) with a colored banner bar.
    _buildGantry(minX, maxX, dy, color, label) {
        const g = new THREE.Object3D();
        const h = 300, postT = 26;
        const postMat = mat(shade(col(color), -0.2), { roughness: 0.5, metalness: 0.1 });
        for (const px of [minX - 6, maxX + 6]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(postT * 0.5, postT * 0.6, h, 12), postMat);
            post.position.copy(W(px, dy, h / 2));
            shadowy(post, true, true);
            g.add(post);
        }
        const beamMat = mat(color, { roughness: 0.45, emissive: shade(col(color), -0.5), emissiveIntensity: 0.25 });
        const span = (maxX + 6) - (minX - 6);
        const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 56, 30), beamMat);
        beam.position.copy(W((minX + maxX) / 2, dy, h - 28));
        shadowy(beam, true, true);
        g.add(beam);
        // little flags along the beam for festivity.
        const flagCols = [0xff5fa2, 0xffd23f, 0x46d36a, 0x5ad1ff, 0xb06bff];
        const n = 9;
        for (let i = 0; i < n; i++) {
            const fm = mat(flagCols[i % flagCols.length], { roughness: 0.6, side: THREE.DoubleSide });
            const flag = new THREE.Mesh(new THREE.ConeGeometry(16, 26, 3), fm);
            const fx = minX + (i + 0.5) * (span / n);
            flag.position.copy(W(fx, dy, h - 60));
            flag.rotation.x = Math.PI / 2;
            g.add(flag);
        }
        return g;
    }

    // ---------------- SURVIVAL: hovering disc over animated slime --------
    _buildSurvival(r) {
        const P = r.platform || { cx: (r.cx != null ? r.cx : 640), cy: 380, r: 300 };
        const R = P.r || 300;

        // wide slime sea below.
        const sea = makeSlime(P.cx, P.cy, 4200, 4200, -40);
        this._add(sea.mesh);
        this._registerSlime(sea, true);

        // the platform disc hovering above the slime.
        const platH = 36;
        const platMat = mat(0x8be0ff, { roughness: 0.7, metalness: 0.0 });
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.02, platH, 64), platMat);
        disc.position.copy(W(P.cx, P.cy, 6));
        disc.receiveShadow = true;
        disc.castShadow = true;
        this._add(disc);

        // glossy top inlay ring + rim accent.
        const inlayMat = mat(shade(col(0x8be0ff), 0.18), { roughness: 0.5 });
        const inlay = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 4, 64), inlayMat);
        inlay.position.copy(W(P.cx, P.cy, 6 + platH / 2 + 1));
        inlay.receiveShadow = true;
        this._add(inlay);
        const rimMat = mat(0xff5fa2, { roughness: 0.5 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 10, 12, 64), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.copy(W(P.cx, P.cy, 6 + platH / 2));
        shadowy(rim, true, true);
        this._add(rim);

        // a soft underside cone so the disc reads as a floating island.
        const underMat = mat(shade(col(0x8be0ff), -0.35), { roughness: 0.8 });
        const under = new THREE.Mesh(new THREE.ConeGeometry(R * 0.95, 160, 48), underMat);
        under.position.copy(W(P.cx, P.cy, 6 - platH / 2 - 80));
        under.rotation.x = Math.PI;           // point downward
        this._add(under);
    }

    // ---------------- FINAL: wide slime pit + border frame ---------------
    _buildFinal(r) {
        const minX = r.minX != null ? r.minX : 300;
        const maxX = r.maxX != null ? r.maxX : 980;
        const minY = r.minY != null ? r.minY : 130;
        const maxY = r.maxY != null ? r.maxY : 630;
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const w = maxX - minX, h = maxY - minY;

        // wide pink slime pit spanning (and overhanging) the arena.
        const pit = makeSlime(cx, cy, w + 1400, h + 1400, -60);
        this._add(pit.mesh);
        this._registerSlime(pit, true);

        // a subtle raised border frame around the play field (decorative).
        const frameMat = mat(0x7b46d6, { roughness: 0.55, metalness: 0.1, emissive: 0x2a0f55, emissiveIntensity: 0.15 });
        const ft = 40, fh = 70;
        const pad = 60;
        const fx0 = minX - pad, fx1 = maxX + pad, fy0 = minY - pad, fy1 = maxY + pad;
        const fw = fx1 - fx0, fhh = fy1 - fy0;
        // four rails.
        const railNS = new THREE.BoxGeometry(fw + ft, fh, ft);
        const railEW = new THREE.BoxGeometry(ft, fh, fhh + ft);
        const top = new THREE.Mesh(railNS, frameMat); top.position.copy(W(cx, fy0, fh / 2));
        const bot = new THREE.Mesh(railNS, frameMat); bot.position.copy(W(cx, fy1, fh / 2));
        const left = new THREE.Mesh(railEW, frameMat); left.position.copy(W(fx0, cy, fh / 2));
        const right = new THREE.Mesh(railEW, frameMat); right.position.copy(W(fx1, cy, fh / 2));
        for (const m of [top, bot, left, right]) { shadowy(m, true, true); this._add(m); }

        // gold corner caps for polish.
        const capMat = mat(0xffd23f, { roughness: 0.4, metalness: 0.3 });
        for (const [gx, gy] of [[fx0, fy0], [fx1, fy0], [fx0, fy1], [fx1, fy1]]) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(ft * 0.7, 16, 12), capMat);
            cap.position.copy(W(gx, gy, fh));
            shadowy(cap, true, true);
            this._add(cap);
        }
    }

    // register a slime surface for shimmer animation + disposal.
    _registerSlime(s, strong) {
        this._disposables.push(s.mesh);
        const baseE = s.slimeMat.emissiveIntensity;
        const amp = strong ? 0.22 : 0.14;
        this._anim.push((dt, t) => {
            const tt = t || 0;
            s.slimeMat.emissiveIntensity = baseE + Math.sin(tt * 1.6) * amp;
            // gentle hue wobble for a living-slime feel.
            const hueShift = 0.02 * Math.sin(tt * 0.7);
            s.slimeMat.emissive.setHSL(0.86 + hueShift, 0.7, 0.32);
        });
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
