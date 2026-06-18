'use strict';
/* =====================================================================
   view_bean.js — procedural 3D bean character for "Bean Royale".
   Builds an entire Fall-Guys-style bean from Three.js primitives and
   drives it with fully procedural, state-blended animation.

   No imports/exports/require — a free `THREE` is assumed in scope
   (in the game: `import * as THREE from 'three'`).

   World mapping (logical sim is top-down X/Y, Z=height; world is Y-up):
     group.position.set(bean.x, bean.z, bean.y)
     group.rotation.y = Math.PI/2 - bean.facing
   The group ORIGIN is the bean's FEET on the ground; body is built
   above local y=0, head near y ~ 2*r.
   ===================================================================== */

class BeanView {
    constructor(appearance) {
        // ---- tunables ------------------------------------------------
        this.r = 17;                       // matches CFG.BEAN_R / bean.r
        const r = this.r;
        this.bodyH = r * 1.5;              // capsule cylinder length (caps add 2*r)
        this.bodyR = r * 0.92;             // capsule radius

        // ---- persistent pose state (lerped toward targets) ----------
        // Every animated DOF lives here so poses blend instead of snap.
        this.pose = {
            armLPitch: 0, armRPitch: 0,   // swing fwd(+)/back(-) around X
            armLRoll: 0,  armRRoll: 0,    // raise out to the side around Z
            armLYaw: 0,   armRYaw: 0,     // twist around Y
            legLPitch: 0, legRPitch: 0,   // leg swing around X
            legTuck: 0,                    // both legs tuck up (airborne)
            bodyPitch: 0,                  // forward lean / dive pitch
            bodyRoll: 0,                   // side roll (dance / ragdoll feel)
            headPitch: 0, headYaw: 0, headRoll: 0,
            sx: 1, sy: 1, sz: 1,          // body squash/stretch
            crouch: 0,                     // lowers whole body (crouch emote / land)
            puff: 0,                       // body scale puff (flex)
            lookX: 0, lookY: 0,           // pupil offset
            eyeOpen: 1,                    // 1 open, ~0.12 closed (blink)
            armScale: 1,                   // arm length scale (heart/point reach)
        };

        // internal animation phase accumulators (decoupled from sim)
        this._runPhase = 0;
        this._idlePhase = Math.random() * Math.PI * 2;
        this._emotePhase = 0;
        this._spinExtra = 0;               // accumulated yaw for spin emote
        this._t = 0;

        this._disposables = [];            // geometries+materials to free
        this._materials = {};              // re-tintable materials by key
        this._textures = {};               // canvas textures by key

        this._buildRoot(appearance || {});
    }

    /* ---------------------------------------------------------------- */
    get object3d() { return this.root; }

    /* =================================================================
       BUILD
       ================================================================= */
    _mat(key, opts) {
        const m = new THREE.MeshStandardMaterial(opts);
        this._disposables.push(m);
        if (key) this._materials[key] = m;
        return m;
    }
    _geo(g) { this._disposables.push(g); return g; }

    // THREE.Color shade: amt<0 -> toward black, amt>0 -> toward white, by |amt|
    _shade(hex, amt) {
        const c = new THREE.Color(hex);
        const f = amt < 0 ? 0 : 1;
        const t = Math.min(1, Math.abs(amt));
        c.r += (f - c.r) * t; c.g += (f - c.g) * t; c.b += (f - c.b) * t;
        return c;
    }

    _buildRoot(appearance) {
        const r = this.r;
        this.appearance = Object.assign(
            { color: '#ffd23f', pattern: 'solid', upper: 'none', lower: 'none', visor: '#3fd2ff' },
            appearance
        );

        // root: positioned at feet, yawed by engine each frame
        this.root = new THREE.Group();
        this.root.name = 'bean';

        // tumble: ragdoll/fall multi-axis spin lives here (around mid-body)
        this.tumble = new THREE.Group();
        this.tumble.position.y = r * 1.2;          // pivot near body centre
        this.root.add(this.tumble);

        // lean: forward lean / dive pitch (pivot at hips so feet stay planted-ish)
        this.lean = new THREE.Group();
        this.tumble.add(this.lean);

        // bob: vertical breathe / crouch / jump bob offset
        this.bob = new THREE.Group();
        this.lean.add(this.bob);

        // bodyScale: squash & stretch / puff (un-does the tumble pivot offset)
        this.bodyScale = new THREE.Group();
        this.bodyScale.position.y = -r * 1.2;       // back down to feet space
        this.bob.add(this.bodyScale);

        // ----- BODY capsule ------------------------------------------
        const bodyGeo = this._geo(new THREE.CapsuleGeometry(this.bodyR, this.bodyH, 6, 16));
        // CapsuleGeometry is centred on origin; lift so feet ~ y=0.
        // total height = bodyH + 2*bodyR; centre sits at half that.
        this._bodyCenterY = this.bodyR + this.bodyH * 0.5;
        this.bodyMat = this._mat('body', {
            color: new THREE.Color(this.appearance.color),
            roughness: 0.62, metalness: 0.0,
        });
        this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
        this.bodyMesh.position.y = this._bodyCenterY;
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyScale.add(this.bodyMesh);

        // pattern overlay (canvas texture if available, else mesh accents)
        this._buildPattern();

        // ----- HEAD anchor (top of body) -----------------------------
        this.headPivot = new THREE.Group();
        this.headPivot.position.y = this._bodyCenterY + this.bodyR * 0.55;
        this.bodyScale.add(this.headPivot);

        this._buildFace();
        this._buildUpper(this.appearance.upper);

        // ----- ARMS (nubs on a shoulder pivot) -----------------------
        this.armL = this._buildArm(+1);
        this.armR = this._buildArm(-1);
        this.bodyScale.add(this.armL.pivot);
        this.bodyScale.add(this.armR.pivot);

        // ----- LEGS (stubby, on hip pivots) --------------------------
        this.legL = this._buildLeg(+1);
        this.legR = this._buildLeg(-1);
        this.bodyScale.add(this.legL.pivot);
        this.bodyScale.add(this.legR.pivot);

        // ----- LOWER costume -----------------------------------------
        this._buildLower(this.appearance.lower);
    }

    _buildPattern() {
        const r = this.r;
        // Remove any prior pattern artefacts (used by setAppearance)
        if (this._patternGroup) {
            this.bodyScale.remove(this._patternGroup);
            this._disposeNode(this._patternGroup);
        }
        if (this._patternTex) { this._patternTex.dispose(); this._patternTex = null; }

        const type = this.appearance.pattern || 'solid';
        const base = this.appearance.color;
        this._patternGroup = new THREE.Group();
        this._patternGroup.position.y = this._bodyCenterY;
        this.bodyScale.add(this._patternGroup);

        if (type === 'solid') { this.bodyMat.map = null; this.bodyMat.needsUpdate = true; return; }

        // Browser path: paint a CanvasTexture and wrap it onto the body.
        if (typeof document !== 'undefined' && document.createElement) {
            const tex = this._makePatternTexture(type, base);
            if (tex) {
                this._patternTex = tex;
                this.bodyMat.map = tex;
                this.bodyMat.color = new THREE.Color('#ffffff'); // let texture show true colour
                this.bodyMat.needsUpdate = true;
                return;
            }
        }

        // Node / no-canvas fallback: approximate with small accent meshes so
        // the pattern still "reads" and the self-test exercises geometry.
        this.bodyMat.map = null;
        this.bodyMat.color = new THREE.Color(base);
        this.bodyMat.needsUpdate = true;
        this._buildPatternMeshes(type, base);
    }

    _makePatternTexture(type, base) {
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        const ctx = cv.getContext('2d');
        if (!ctx) return null;
        const W = 256, H = 256;
        const hex = (c) => '#' + this._shade(base, c).getHexString();
        const dk = hex(-0.28), lt = hex(0.4);
        ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
        const star = (cx, cy, R, r2, pts, col) => {
            ctx.fillStyle = col; ctx.beginPath();
            for (let i = 0; i < pts * 2; i++) {
                const a = (Math.PI / pts) * i - Math.PI / 2;
                const rad = i & 1 ? r2 : R;
                const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath(); ctx.fill();
        };
        switch (type) {
            case 'stripes':
                ctx.fillStyle = dk;
                for (let i = -1; i < 8; i++) ctx.fillRect(i * 36, 0, 16, H);
                break;
            case 'spots':
                ctx.fillStyle = dk;
                for (const p of [[.2, .2], [.6, .35], [.4, .65], [.78, .75], [.12, .8], [.85, .15], [.5, .92]]) {
                    ctx.beginPath(); ctx.arc(p[0] * W, p[1] * H, 22, 0, 6.283); ctx.fill();
                }
                break;
            case 'check': {
                const n = 8, s = W / n;
                for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++)
                    if ((xx + yy) & 1) { ctx.fillStyle = dk; ctx.fillRect(xx * s, yy * s, s, s); }
                break;
            }
            case 'camo': {
                ctx.fillStyle = this._shadeStr(base, 0.12);
                ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = dk;
                for (const p of [[.3, .25, 55], [.7, .5, 64], [.45, .8, 48], [.85, .15, 42], [.12, .62, 50]]) {
                    ctx.beginPath(); ctx.ellipse(p[0] * W, p[1] * H, p[2], p[2] * 0.8, 0.5, 0, 6.283); ctx.fill();
                }
                ctx.fillStyle = hex(0.18);
                for (const p of [[.55, .2, 30], [.2, .85, 26], [.8, .7, 28]]) {
                    ctx.beginPath(); ctx.ellipse(p[0] * W, p[1] * H, p[2], p[2] * 0.8, 1.1, 0, 6.283); ctx.fill();
                }
                break;
            }
            case 'tiger':
                ctx.strokeStyle = dk; ctx.lineWidth = 16; ctx.lineCap = 'round';
                for (let i = -1; i < 8; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, i * 34);
                    ctx.quadraticCurveTo(W / 2, i * 34 - 26, W, i * 34);
                    ctx.stroke();
                }
                break;
            case 'star':
                for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++)
                    star(xx * 64 + 32, yy * 64 + 32, 22, 9, 5, lt);
                break;
            case 'tiedye': {
                const g = ctx.createRadialGradient(W / 2, H / 2, 4, W / 2, H / 2, W * 0.7);
                g.addColorStop(0, 'rgba(255,255,255,0.85)');
                g.addColorStop(0.35, this._shadeStr(base, 0.35));
                g.addColorStop(0.65, base);
                g.addColorStop(1, dk);
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                break;
            }
            case 'galaxy': {
                const g = ctx.createLinearGradient(0, 0, W, H);
                g.addColorStop(0, '#2b1d5e'); g.addColorStop(0.5, '#6a32c8'); g.addColorStop(1, '#1b1340');
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = '#fff';
                for (let i = 0; i < 60; i++) {
                    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
                    ctx.beginPath();
                    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.8 + 0.4, 0, 6.283);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
            }
            default: return null;
        }
        const tex = new THREE.CanvasTexture(cv);
        return tex;
    }

    _shadeStr(base, amt) { return '#' + this._shade(base, amt).getHexString(); }

    // Mesh-based pattern fallback (no canvas). Thin accents on the body.
    _buildPatternMeshes(type, base) {
        const r = this.r, R = this.bodyR;
        const dkMat = this._mat(null, { color: this._shade(base, -0.28), roughness: 0.6 });
        const ltMat = this._mat(null, { color: this._shade(base, 0.4), roughness: 0.6 });
        const add = (geo, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x, y, z);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            m.castShadow = true;
            this._patternGroup.add(m);
        };
        const surf = R * 1.005;
        switch (type) {
            case 'stripes':
                for (let i = -2; i <= 2; i++)
                    add(new THREE.BoxGeometry(r * 0.18, this.bodyH + R, r * 0.05),
                        dkMat, 0, 0, 0, 0, i * 0.5, 0);
                break;
            case 'spots':
                for (const p of [[0.5, 0.3], [-0.6, 0.8], [0.2, -0.5], [-0.3, -0.1], [0.7, -0.9]]) {
                    const a = p[0] * Math.PI, h = p[1] * r * 0.9;
                    add(new THREE.SphereGeometry(r * 0.2, 8, 8), dkMat,
                        Math.cos(a) * surf, h, Math.sin(a) * surf);
                }
                break;
            case 'star':
                add(new THREE.ConeGeometry(r * 0.45, r * 0.12, 5), ltMat,
                    0, 0, surf, Math.PI / 2, 0, 0);
                break;
            case 'galaxy':
            case 'tiedye':
            case 'camo':
            case 'tiger':
            case 'check':
            default:
                // belt-style accent ring so something is visibly different
                add(new THREE.TorusGeometry(R * 0.98, r * 0.12, 6, 18), dkMat, 0, 0, 0, Math.PI / 2, 0, 0);
                break;
        }
    }

    /* ----- FACE --------------------------------------------------- */
    _buildFace() {
        const r = this.r;
        this.face = new THREE.Group();
        // Face sits on the front (+Z) upper portion of the body.
        this.face.position.set(0, this._bodyCenterY + r * 0.35, this.bodyR * 0.62);
        this.bodyScale.add(this.face);

        // visor band — a flattened rounded box across the eyes
        this.visorMat = this._mat('visor', {
            color: new THREE.Color(this.appearance.visor),
            roughness: 0.25, metalness: 0.1,
            emissive: new THREE.Color(this.appearance.visor).multiplyScalar(0.12),
        });
        const visorGeo = this._geo(new THREE.BoxGeometry(r * 1.5, r * 0.72, r * 0.5));
        const visor = new THREE.Mesh(visorGeo, this.visorMat);
        visor.position.z = -r * 0.12;
        visor.castShadow = true;
        this.face.add(visor);

        // eyes: white spheres with dark pupils, on a small pivot so they
        // can squash for blinking and the pupils can track movement.
        const whiteMat = this._mat('eyeWhite', { color: new THREE.Color('#ffffff'), roughness: 0.4 });
        const pupilMat = this._mat('pupil', { color: new THREE.Color('#22203a'), roughness: 0.5 });
        const eyeGeo = this._geo(new THREE.SphereGeometry(r * 0.22, 12, 12));
        const pupilGeo = this._geo(new THREE.SphereGeometry(r * 0.1, 10, 10));

        this.eyes = [];
        for (const side of [+1, -1]) {
            const eye = new THREE.Group();
            eye.position.set(side * r * 0.34, 0, r * 0.2);
            const white = new THREE.Mesh(eyeGeo, whiteMat);
            white.scale.z = 0.6;
            eye.add(white);
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.z = r * 0.16;
            eye.add(pupil);
            this.face.add(eye);
            this.eyes.push({ group: eye, pupil });
        }

        // pink cheek dots
        const cheekMat = this._mat('cheek', {
            color: new THREE.Color('#ff7896'), roughness: 0.7,
            transparent: true, opacity: 0.65,
        });
        const cheekGeo = this._geo(new THREE.CircleGeometry(r * 0.17, 12));
        for (const side of [+1, -1]) {
            const ch = new THREE.Mesh(cheekGeo, cheekMat);
            ch.position.set(side * r * 0.6, -r * 0.32, r * 0.2);
            this.face.add(ch);
        }
    }

    /* ----- ARM ---------------------------------------------------- */
    _buildArm(side) {
        const r = this.r;
        const pivot = new THREE.Group();
        // shoulder location on the side of the upper body
        pivot.position.set(side * this.bodyR * 0.95, this._bodyCenterY + r * 0.15, 0);
        // default rest: arms hang slightly out & down. We rotate around Z
        // for the "out" angle and X for fwd/back swing.
        const armMat = this._mat('arm', { color: new THREE.Color(this.appearance.color), roughness: 0.62 });
        this._materials['arm' + (side > 0 ? 'L' : 'R')] = armMat;
        // a small capsule nub hanging from the pivot (pivot at top of nub)
        const len = r * 0.85;
        const geo = this._geo(new THREE.CapsuleGeometry(r * 0.26, len, 4, 10));
        const mesh = new THREE.Mesh(geo, armMat);
        mesh.position.y = -(len * 0.5 + r * 0.26);   // hang below pivot
        mesh.castShadow = true;
        pivot.add(mesh);
        // little hand tip (lighter) for personality
        const hand = new THREE.Mesh(
            this._geo(new THREE.SphereGeometry(r * 0.28, 8, 8)),
            this._mat(null, { color: this._shade(this.appearance.color, 0.18), roughness: 0.6 })
        );
        hand.position.y = -(len + r * 0.26);
        hand.castShadow = true;
        pivot.add(hand);
        pivot.userData.side = side;
        return { pivot, mesh, hand, len };
    }

    /* ----- LEG ---------------------------------------------------- */
    _buildLeg(side) {
        const r = this.r;
        const pivot = new THREE.Group();
        // hip near the bottom of the body, slightly inset
        pivot.position.set(side * this.bodyR * 0.45, r * 0.62, 0);
        const legMat = this._mat('leg', { color: this._shade(this.appearance.color, -0.18), roughness: 0.65 });
        const len = r * 0.5;
        const geo = this._geo(new THREE.CapsuleGeometry(r * 0.27, len, 4, 10));
        const mesh = new THREE.Mesh(geo, legMat);
        mesh.position.y = -(len * 0.5 + r * 0.27);
        mesh.castShadow = true;
        pivot.add(mesh);
        // foot
        const foot = new THREE.Mesh(
            this._geo(new THREE.SphereGeometry(r * 0.3, 8, 8)),
            legMat
        );
        foot.scale.set(1.1, 0.7, 1.3);
        foot.position.set(0, -(len + r * 0.27), r * 0.08);
        foot.castShadow = true;
        pivot.add(foot);
        return { pivot, mesh, foot, len };
    }

    /* ----- UPPER COSTUME ------------------------------------------ */
    _buildUpper(prop) {
        const r = this.r;
        if (this.upperGroup) { this.headPivot.remove(this.upperGroup); this._disposeNode(this.upperGroup); }
        this.upperGroup = new THREE.Group();
        // sit atop the head; head top is roughly here in headPivot-local space
        this.upperGroup.position.y = this.bodyR * 0.55;
        this.headPivot.add(this.upperGroup);
        const g = this.upperGroup;
        const M = (col, opts) => this._mat(null, Object.assign({ color: new THREE.Color(col), roughness: 0.5 }, opts || {}));
        const add = (geo, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x || 0, y || 0, z || 0);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            m.castShadow = true; g.add(m); return m;
        };
        switch (prop) {
            case 'party':
                add(new THREE.ConeGeometry(r * 0.5, r * 1.1, 16), M('#ff5fa2'), 0, r * 0.55, 0);
                add(new THREE.SphereGeometry(r * 0.18, 10, 10), M('#ffd23f', { emissive: new THREE.Color('#5a3a00') }), 0, r * 1.15, 0);
                break;
            case 'cap':
                add(new THREE.SphereGeometry(r * 0.62, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
                    M('#e6395a'), 0, r * 0.05, 0);
                // backwards brim points -Z (behind)
                add(new THREE.BoxGeometry(r * 0.7, r * 0.12, r * 0.5), M('#e6395a'), 0, r * 0.04, -r * 0.7);
                break;
            case 'pigeon': {
                add(new THREE.SphereGeometry(r * 0.6, 14, 12), M('#cfd6df'), 0, r * 0.45, 0);
                add(new THREE.ConeGeometry(r * 0.16, r * 0.5, 8), M('#ff9447'), 0, r * 0.42, r * 0.55, Math.PI / 2, 0, 0);
                for (const s of [+1, -1]) {
                    const eye = add(new THREE.SphereGeometry(r * 0.09, 8, 8), M('#222'), s * r * 0.22, r * 0.6, r * 0.4);
                    eye.castShadow = false;
                }
                break;
            }
            case 'bee':
                for (const s of [+1, -1]) {
                    add(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.7, 6),
                        M('#222'), s * r * 0.25, r * 0.35, 0, 0, 0, s * 0.3);
                    add(new THREE.SphereGeometry(r * 0.13, 8, 8), M('#ffd23f', { emissive: new THREE.Color('#5a4a00') }),
                        s * r * 0.42, r * 0.72, 0);
                }
                break;
            case 'cat':
                for (const s of [+1, -1])
                    add(new THREE.ConeGeometry(r * 0.26, r * 0.6, 4), M('#9a6cff'),
                        s * r * 0.4, r * 0.45, 0, 0, Math.PI / 4, 0);
                break;
            case 'pirate':
                add(new THREE.CylinderGeometry(r * 0.78, r * 0.92, r * 0.18, 18), M('#23203a'), 0, r * 0.1, 0);
                add(new THREE.SphereGeometry(r * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), M('#23203a'), 0, r * 0.18, 0);
                add(new THREE.SphereGeometry(r * 0.12, 8, 8), M('#ffffff', { emissive: new THREE.Color('#333') }), 0, r * 0.3, r * 0.45);
                break;
            case 'dino':
                // back spikes: place them down the spine, not just head.
                this.headPivot.remove(this.upperGroup);
                this.bodyScale.add(this.upperGroup);
                this.upperGroup.position.set(0, 0, -this.bodyR * 0.7);
                for (let i = 0; i < 4; i++) {
                    const sz = 0.5 - i * 0.07;
                    add(new THREE.ConeGeometry(r * 0.22, r * (0.7 * sz + 0.3), 4),
                        M('#46d36a'),
                        0, this._bodyCenterY + r * 0.7 - i * r * 0.55, -i * r * 0.05,
                        0.35, Math.PI / 4, 0);
                }
                break;
            case 'crown':
                add(new THREE.CylinderGeometry(r * 0.55, r * 0.55, r * 0.32, 16),
                    M('#ffd23f', { metalness: 0.6, roughness: 0.25, emissive: new THREE.Color('#3a2a00') }),
                    0, r * 0.2, 0);
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    add(new THREE.ConeGeometry(r * 0.12, r * 0.3, 4),
                        M('#ffd23f', { metalness: 0.6, roughness: 0.25, emissive: new THREE.Color('#3a2a00') }),
                        Math.cos(a) * r * 0.5, r * 0.45, Math.sin(a) * r * 0.5);
                }
                // a gem
                add(new THREE.SphereGeometry(r * 0.12, 8, 8),
                    M('#ff4d6d', { emissive: new THREE.Color('#5a0010') }), 0, r * 0.22, r * 0.55);
                break;
            default: break;
        }
    }

    /* ----- LOWER COSTUME ------------------------------------------ */
    _buildLower(prop) {
        const r = this.r;
        if (this.lowerGroup) { this.bodyScale.remove(this.lowerGroup); this._disposeNode(this.lowerGroup); }
        this.lowerGroup = new THREE.Group();
        this.bodyScale.add(this.lowerGroup);
        const g = this.lowerGroup;
        this._rocketFlames = null;
        const M = (col, opts) => this._mat(null, Object.assign({ color: new THREE.Color(col), roughness: 0.5 }, opts || {}));
        const add = (parent, geo, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x || 0, y || 0, z || 0);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            m.castShadow = true; parent.add(m); return m;
        };
        switch (prop) {
            case 'shoes':
                for (const s of [+1, -1]) {
                    const sh = add(g, new THREE.SphereGeometry(r * 0.34, 10, 10), M('#f25c54'),
                        s * this.bodyR * 0.45, r * 0.18, r * 0.12);
                    sh.scale.set(1.15, 0.7, 1.5);
                    // attach to the matching leg so shoes move with the run cycle
                    g.remove(sh);
                    (s > 0 ? this.legL : this.legR).pivot.add(sh);
                    sh.position.set(0, -(this.legL.len + r * 0.27), r * 0.14);
                }
                break;
            case 'tutu':
                add(g, new THREE.TorusGeometry(r * 1.05, r * 0.32, 8, 18), M('#ff8fd0', { transparent: true, opacity: 0.9 }),
                    0, r * 0.95, 0, Math.PI / 2, 0, 0).scale.set(1, 0.6, 1);
                break;
            case 'tail': {
                const tail = add(g, new THREE.ConeGeometry(r * 0.45, r * 1.7, 8), M('#46d36a'),
                    0, r * 0.7, -this.bodyR * 0.9, -Math.PI / 2.3, 0, 0);
                this._tail = tail;            // gentle wag in update
                break;
            }
            case 'rocket': {
                this._rocketFlames = [];
                for (const s of [+1, -1]) {
                    const boot = add(g, new THREE.CylinderGeometry(r * 0.34, r * 0.4, r * 0.55, 12), M('#c0c6d0', { metalness: 0.5, roughness: 0.3 }),
                        s * this.bodyR * 0.45, r * 0.32, 0);
                    const flame = add(g, new THREE.ConeGeometry(r * 0.3, r * 0.8, 10),
                        M('#ff7a2c', { emissive: new THREE.Color('#ff5a1c'), transparent: true, opacity: 0.92 }),
                        s * this.bodyR * 0.45, -r * 0.2, 0, Math.PI, 0, 0);
                    const core = add(g, new THREE.ConeGeometry(r * 0.15, r * 0.5, 8),
                        M('#ffd23f', { emissive: new THREE.Color('#ffcf3f'), transparent: true, opacity: 0.95 }),
                        s * this.bodyR * 0.45, -r * 0.12, 0, Math.PI, 0, 0);
                    this._rocketFlames.push(flame, core);
                }
                break;
            }
            case 'gold':
                for (const s of [+1, -1]) {
                    const sh = add(g, new THREE.SphereGeometry(r * 0.36, 10, 10),
                        M('#ffd23f', { metalness: 0.7, roughness: 0.22, emissive: new THREE.Color('#3a2a00') }),
                        0, 0, 0);
                    sh.scale.set(1.15, 0.75, 1.55);
                    g.remove(sh);
                    (s > 0 ? this.legL : this.legR).pivot.add(sh);
                    sh.position.set(0, -(this.legL.len + r * 0.27), r * 0.14);
                }
                break;
            default: break;
        }
    }

    /* =================================================================
       LIVE APPEARANCE SWAP
       ================================================================= */
    setAppearance(appearance) {
        if (!appearance) return;
        const prev = this.appearance;
        this.appearance = Object.assign({}, prev, appearance);

        // colour-driven materials
        if (this._materials.body) this._materials.body.color.set(this.appearance.color);
        if (this._materials.armL) this._materials.armL.color.set(this.appearance.color);
        if (this._materials.armR) this._materials.armR.color.set(this.appearance.color);
        if (this._materials.leg) this._materials.leg.color.copy(this._shade(this.appearance.color, -0.18));
        if (this._materials.visor) {
            this._materials.visor.color.set(this.appearance.visor);
            this._materials.visor.emissive.copy(new THREE.Color(this.appearance.visor).multiplyScalar(0.12));
        }

        // pattern: rebuild only when it (or base colour) changed
        if (appearance.pattern !== undefined && appearance.pattern !== prev.pattern ||
            appearance.color !== undefined && appearance.color !== prev.color) {
            this._buildPattern();
        }
        // costumes: rebuild only on change
        if (appearance.upper !== undefined && appearance.upper !== prev.upper) this._buildUpper(this.appearance.upper);
        if (appearance.lower !== undefined && appearance.lower !== prev.lower) this._buildLower(this.appearance.lower);
    }

    /* =================================================================
       UPDATE — position, orient, animate
       ================================================================= */
    update(bean, dt, t) {
        if (!bean) return;
        dt = (typeof dt === 'number' && dt > 0) ? Math.min(dt, 0.1) : 0.016;
        t = (typeof t === 'number') ? t : (this._t + dt);
        this._t = t;
        const r = this.r;

        // ---- world placement (the critical mapping) -----------------
        this.root.position.set(bean.x || 0, bean.z || 0, bean.y || 0);
        this.root.rotation.y = Math.PI / 2 - (bean.facing || 0);

        // ---- derived state ------------------------------------------
        const speed = Math.hypot(bean.vx || 0, bean.vy || 0);
        const grounded = !!bean.grounded;
        const airborne = (bean.z || 0) > 1 && !bean.falling;
        const diveT = bean.diveT || 0;
        const proneT = bean.proneT || 0;
        const ragdoll = bean.ragdoll || 0;
        const falling = !!bean.falling;
        const squash = (typeof bean.squash === 'number') ? bean.squash : 1;
        const emote = bean.emoteAnim || null;
        const emoteT = bean.emoteT || 0;
        const canEmote = emote && emoteT > 0 && grounded && ragdoll <= 0 && diveT <= 0 && !falling;

        // smoothing helper
        const P = this.pose;
        const lp = (key, target, rate) => { P[key] += (target - P[key]) * Math.min(1, rate * dt); };
        // direct exponential blend toward 0 baseline for unused DOFs
        const RATE = 14;       // general pose blend speed

        // ---- build TARGET pose (start from neutral each frame) -------
        const T = this._target || (this._target = {});
        for (const k in P) T[k] = 0;
        T.sx = 1; T.sy = 1; T.sz = 1; T.eyeOpen = 1; T.armScale = 1;
        // default rest: arms out a touch
        T.armLRoll = 0.18; T.armRRoll = 0.18;

        // ===== priority chain: ragdoll/fall > dive/prone > airborne >
        //       emote > run > idle. Each writes targets; blending = smooth.
        let handledBody = false;

        if (ragdoll > 0 || falling) {
            this._poseRagdoll(bean, T, dt, t);
            handledBody = true;
        } else if (diveT > 0) {
            this._poseDive(bean, T, diveT);
            handledBody = true;
        } else if (proneT > 0) {
            this._posePone(bean, T, proneT);
            handledBody = true;
        }

        if (!handledBody) {
            if (airborne) this._poseAir(bean, T, squash);

            if (canEmote) {
                this._poseEmote(emote, T, emoteT, dt, t);
            } else if (!airborne) {
                if (speed > 6) this._poseRun(bean, T, speed, dt, t);
                else this._poseIdle(bean, T, dt, t);
            }
            // squash & stretch from sim (combine multiplicatively with pose)
            this._applySquash(T, squash, airborne);
        } else {
            this._spinExtra = 0; // reset emote spin when interrupted
            this._emotePhase = 0;
        }

        // eye blink overrides everything (cheap, always)
        if (typeof bean.blink === 'number' && bean.blink < 0.12) T.eyeOpen = 0.12;

        // pupils track movement direction (in body-local +Z forward space)
        // logical movement dir relative to facing -> mostly forward; add a
        // little horizontal lead based on velocity heading vs facing.
        let lookX = 0;
        if (speed > 4) {
            const moveAng = Math.atan2(bean.vy || 0, bean.vx || 0);
            const rel = this._angDiff(bean.facing || 0, moveAng);
            lookX = Math.max(-1, Math.min(1, rel * 0.8 + Math.sin(t * 0.7) * 0.05));
        } else {
            lookX = Math.sin(t * 0.6) * 0.25;     // idle gaze wander
        }
        T.lookX = lookX;
        T.lookY = -0.15 + (airborne ? 0.3 : 0);

        // ---- blend pose toward targets ------------------------------
        for (const k in P) {
            // scale & eye values blend a touch faster for snappy squash
            const rate = (k === 'sx' || k === 'sy' || k === 'sz' || k === 'eyeOpen') ? RATE * 1.6 : RATE;
            lp(k, T[k], rate);
        }

        // ---- commit pose to scene graph -----------------------------
        this._commit(bean, dt, t, { ragdoll, falling, diveT, proneT });
    }

    /* ---- pose generators ---------------------------------------- */
    _poseIdle(bean, T, dt, t) {
        this._idlePhase += dt * 2.0;
        const ph = this._idlePhase;
        // gentle breathe: body scales subtly + slight bob handled in commit
        T.sy = 1 + Math.sin(ph) * 0.03;
        T.sx = 1 - Math.sin(ph) * 0.02;
        T.sz = 1 - Math.sin(ph) * 0.02;
        // tiny sway
        T.bodyRoll = Math.sin(ph * 0.5) * 0.04;
        T.headRoll = Math.sin(ph * 0.5 + 0.4) * 0.05;
        T.headYaw = Math.sin(ph * 0.33) * 0.08;
        // arms dangle with faint motion
        T.armLRoll = 0.2 + Math.sin(ph) * 0.03;
        T.armRRoll = 0.2 - Math.sin(ph) * 0.03;
        T.armLPitch = Math.sin(ph * 0.7) * 0.04;
        T.armRPitch = -Math.sin(ph * 0.7) * 0.04;
        this._breatheBob = Math.sin(ph) * (this.r * 0.05);
    }

    _poseRun(bean, T, speed, dt, t) {
        // cadence & amplitude scale with speed
        const sp = Math.min(speed, 320);
        const cadence = 6 + sp * 0.035;       // rad/s
        this._runPhase += dt * cadence;
        const ph = this._runPhase;
        const amp = Math.min(1, 0.35 + sp / 320);   // 0.35..1

        const swing = Math.sin(ph) * amp;
        const swing2 = Math.sin(ph + Math.PI) * amp;
        // legs swing opposite each other
        T.legLPitch = swing * 0.9;
        T.legRPitch = swing2 * 0.9;
        // arms counter-swing
        T.armLPitch = swing2 * 0.7;
        T.armRPitch = swing * 0.7;
        T.armLRoll = 0.12; T.armRRoll = 0.12;
        // body bob (twice per cycle) + forward lean
        this._runBob = Math.abs(Math.sin(ph)) * (this.r * 0.12) * amp;
        T.bodyPitch = -(0.12 + amp * 0.18);    // lean forward (negative pitch = nose down +Z)
        T.bodyRoll = Math.sin(ph) * 0.06 * amp;
        T.headPitch = (0.06 + amp * 0.06);     // counter the lean so face stays up
        T.headYaw = Math.sin(ph) * 0.04;
    }

    _poseAir(bean, T, squash) {
        // legs tuck up, slight stretch (combined with squash in _applySquash)
        T.legTuck = 1;
        T.legLPitch = -1.0;
        T.legRPitch = -1.0;
        // arms out for balance
        T.armLRoll = 0.6; T.armRRoll = 0.6;
        T.armLPitch = -0.2; T.armRPitch = -0.2;
        const rising = (bean.vz || 0) > 0;
        T.bodyPitch = rising ? -0.1 : 0.05;
    }

    _poseDive(bean, T, diveT) {
        // pitch whole body forward ~70 deg, arms thrown forward (superman)
        const k = Math.min(1, diveT / 0.42);       // 1 at start of dive
        T.bodyPitch = -1.22 * (0.4 + 0.6 * k);     // up to ~ -70deg (nose toward +Z)
        T.armLRoll = 1.5; T.armRRoll = 1.5;        // arms up to horizontal
        T.armLPitch = -1.3; T.armRPitch = -1.3;    // and thrown forward
        T.legLPitch = 0.5; T.legRPitch = 0.5;      // legs trail back
        T.legTuck = 0.3;
        T.headPitch = 0.5;                         // look forward
        T.sx = 1.12; T.sy = 0.92; T.sz = 1.12;     // slight flatten/stretch
    }

    _posePone(bean, T, proneT) {  // prone = flattened, lying down, recovering
        const k = Math.min(1, proneT / 0.4);       // 1 right after landing
        // flattened: wider & shorter, face-down then popping back up as k->0
        T.bodyPitch = -1.35 * k;                   // lying forward
        T.sx = 1 + 0.25 * k;
        T.sy = 1 - 0.25 * k;
        T.sz = 1 + 0.15 * k;
        T.armLRoll = 1.2 * k; T.armRRoll = 1.2 * k;
        T.armLPitch = -0.8 * k; T.armRPitch = -0.8 * k;
        T.legLPitch = 0.3 * k; T.legRPitch = 0.3 * k;
        T.headPitch = 0.4 * k;
    }

    _poseRagdoll(bean, T, dt, t) {
        // limbs flail loosely; the actual tumble rotation is applied in commit
        // using bean.spin across multiple axes.
        const f = t * 9;
        T.armLPitch = Math.sin(f * 1.3) * 1.4;
        T.armRPitch = Math.sin(f * 1.1 + 2) * 1.4;
        T.armLRoll = 0.5 + Math.sin(f * 0.9) * 0.7;
        T.armRRoll = 0.5 + Math.sin(f * 0.8 + 1) * 0.7;
        T.legLPitch = Math.sin(f * 1.2 + 1) * 1.1;
        T.legRPitch = Math.sin(f * 1.05) * 1.1;
        T.legTuck = 0.4;
        T.headRoll = Math.sin(f * 0.7) * 0.4;
        T.headPitch = Math.sin(f * 0.6) * 0.3;
        T.eyeOpen = 0.3;                            // dazed
        T.sx = 1.05; T.sy = 0.96;
    }

    _poseEmote(anim, T, emoteT, dt, t) {
        // fade-in/out factor so emote starts/ends gently (1.8s total)
        const total = 1.8;
        const age = total - emoteT;
        const fade = Math.min(1, Math.min(age, emoteT) * 3.5);
        this._emotePhase += dt;
        const ph = this._emotePhase;
        const blend = (base, val) => base + (val - base) * fade;

        switch (anim) {
            case 'wave': {
                // raise right arm and wave it
                T.armRRoll = blend(0.18, 2.5);
                T.armRPitch = blend(0, -0.2);
                T.armRYaw = Math.sin(ph * 9) * 0.5 * fade;
                T.headRoll = Math.sin(ph * 9) * 0.06 * fade;
                T.armLRoll = 0.18;
                break;
            }
            case 'dance': {
                // chicken dance: bob side to side + flap arms like wings
                const side = Math.sin(ph * 6);
                T.bodyRoll = side * 0.22 * fade;
                T.headRoll = side * 0.18 * fade;
                const flap = Math.abs(Math.sin(ph * 6)) * fade;
                T.armLRoll = blend(0.18, 1.3 + flap * 0.5);
                T.armRRoll = blend(0.18, 1.3 + flap * 0.5);
                T.armLPitch = -flap * 0.3; T.armRPitch = -flap * 0.3;
                this._danceBob = Math.abs(side) * this.r * 0.12;
                break;
            }
            case 'crouch': {
                // repeated squat (t-bag)
                const c = (Math.sin(ph * 7) * 0.5 + 0.5) * fade;
                T.crouch = c;
                T.sy = 1 - c * 0.3; T.sx = 1 + c * 0.18; T.sz = 1 + c * 0.1;
                T.legLPitch = c * 0.6; T.legRPitch = c * 0.6;
                T.armLPitch = c * 0.4; T.armRPitch = c * 0.4;
                break;
            }
            case 'think': {
                // tilt head, right hand (arm) to chin
                T.headRoll = blend(0, 0.35);
                T.headPitch = blend(0, 0.12);
                T.armRRoll = blend(0.18, 1.55);
                T.armRPitch = blend(0, -1.0);
                T.armRYaw = blend(0, -0.6);
                T.armRScale = 1;
                T.armLRoll = 0.1;
                T.bodyRoll = blend(0, 0.05) + Math.sin(ph) * 0.01;
                break;
            }
            case 'flex': {
                // both arms up flexing, body puffs
                T.armLRoll = blend(0.18, 1.6);
                T.armRRoll = blend(0.18, 1.6);
                T.armLPitch = blend(0, -1.7);     // forearms up
                T.armRPitch = blend(0, -1.7);
                T.armLYaw = 0.6; T.armRYaw = -0.6;
                const puff = (0.6 + Math.sin(ph * 4) * 0.4) * fade;
                T.puff = puff;
                T.sx = 1 + puff * 0.12; T.sz = 1 + puff * 0.12; T.sy = 1 + puff * 0.04;
                T.bodyPitch = -0.05;
                break;
            }
            case 'spin': {
                // spin the whole bean around Y once or twice over the emote
                // accumulate extra yaw; eased so it does ~2 turns then settles.
                const turns = 2;
                const target = turns * Math.PI * 2 * Math.min(1, age / (total * 0.8));
                this._spinExtra = target;
                T.armLRoll = 0.9; T.armRRoll = 0.9;   // arms out while spinning
                T.armLPitch = 0.2; T.armRPitch = 0.2;
                this._danceBob = Math.abs(Math.sin(age / total * Math.PI)) * this.r * 0.15;
                break;
            }
            case 'point': {
                // thrust right arm forward pointing
                T.armRRoll = blend(0.18, 1.4);
                T.armRPitch = blend(0, -1.45);    // point forward (+Z)
                T.armRScale = blend(1, 1.15);
                T.bodyPitch = blend(0, -0.12);    // lean into the point
                T.headPitch = 0.1;
                T.armLRoll = 0.12; T.armLPitch = 0.2;
                break;
            }
            case 'heart': {
                // arms make a heart overhead, gentle bounce
                T.armLRoll = blend(0.18, 2.7);
                T.armRRoll = blend(0.18, 2.7);
                T.armLPitch = blend(0, -0.5);
                T.armRPitch = blend(0, -0.5);
                T.armLYaw = blend(0, 0.7); T.armRYaw = blend(0, -0.7);
                T.armScale = blend(1, 0.85);
                this._danceBob = (Math.sin(ph * 4) * 0.5 + 0.5) * this.r * 0.1 * fade;
                T.headPitch = -0.08;
                break;
            }
            default: break;
        }
        // separate per-arm scale used by think/point
        if (T.armRScale === undefined) T.armRScale = 1;
    }

    _applySquash(T, squash, airborne) {
        // bean.squash ~1; <1 squashed wider/shorter, >1 taller/thinner.
        // Combine with any pose-driven scale already in T (multiplicative).
        let sy = squash;
        let sxz = 1 / Math.sqrt(Math.max(0.0001, squash));   // preserve volume
        if (airborne) { sy *= 1.04; sxz *= 0.98; }
        T.sy *= sy;
        T.sx *= sxz;
        T.sz *= sxz;
    }

    /* ---- commit pose to the scene graph ------------------------- */
    _commit(bean, dt, t, st) {
        const r = this.r, P = this.pose;

        // --- tumble (ragdoll / falling): rotate on multiple axes -----
        if (st.ragdoll > 0 || st.falling) {
            const s = bean.spin || 0;
            this.tumble.rotation.set(s * 1.0, s * 0.6, s * 0.8);
        } else {
            // ease tumble back to zero so recovery isn't a snap
            const e = this.tumble.rotation;
            e.x += (0 - e.x) * Math.min(1, 12 * dt);
            e.y += (0 - e.y) * Math.min(1, 12 * dt);
            e.z += (0 - e.z) * Math.min(1, 12 * dt);
        }

        // --- body lean / dive pitch (around X = pitch in world) ------
        // We pitch about X so the bean tips toward +Z (its forward).
        this.lean.rotation.x = P.bodyPitch;
        this.lean.rotation.z = P.bodyRoll;

        // --- spin-emote: extra yaw on root (kept separate from facing) -
        // Apply on top of the facing-derived yaw set in update().
        if (this._spinExtra) this.root.rotation.y += this._spinExtra;

        // --- vertical bob (breathe / run / crouch / emote bounce) ----
        let bobY = 0;
        bobY += this._breatheBob || 0;
        bobY += this._runBob || 0;
        bobY += this._danceBob || 0;
        bobY -= (P.crouch || 0) * r * 0.5;
        this.bob.position.y = bobY;
        // decay one-shot bob accumulators so stale frames don't linger
        this._breatheBob = (this._breatheBob || 0) * 0.6;
        this._runBob = (this._runBob || 0) * 0.5;
        this._danceBob = (this._danceBob || 0) * 0.5;

        // --- body squash/stretch + puff ------------------------------
        const puff = 1 + (P.puff || 0) * 0;   // puff already folded into sx/sz
        this.bodyScale.scale.set(P.sx, P.sy, P.sz);

        // --- head ----------------------------------------------------
        this.headPivot.rotation.set(P.headPitch, P.headYaw, P.headRoll);
        if (this.face) this.face.rotation.set(P.headPitch * 0.6, P.headYaw * 0.6, P.headRoll * 0.6);

        // --- arms ----------------------------------------------------
        // pivot rotation: roll (Z) raises out to side, pitch (X) swings f/b,
        // yaw (Y) twists. Left arm is +X side, mirror the roll sign.
        const aL = this.armL.pivot, aR = this.armR.pivot;
        aL.rotation.set(P.armLPitch, P.armLYaw, +P.armLRoll);
        aR.rotation.set(P.armRPitch, P.armRYaw, -P.armRRoll);
        const armScale = P.armScale || 1;
        const rArmScale = (this._target && this._target.armRScale) || 1;
        this.armL.pivot.scale.y = armScale;
        this.armR.pivot.scale.y = armScale * rArmScale;

        // --- legs ----------------------------------------------------
        const tuck = P.legTuck || 0;
        const lL = this.legL.pivot, lR = this.legR.pivot;
        lL.rotation.set(P.legLPitch, 0, 0);
        lR.rotation.set(P.legRPitch, 0, 0);
        // tuck pulls feet up toward the body (raise hip pivot)
        lL.position.y = r * 0.62 + tuck * r * 0.35;
        lR.position.y = r * 0.62 + tuck * r * 0.35;

        // --- eyes: blink (scale Y) + pupil tracking ------------------
        for (const e of this.eyes) {
            e.group.scale.y = Math.max(0.08, P.eyeOpen);
            e.pupil.position.x = P.lookX * r * 0.1;
            e.pupil.position.y = P.lookY * r * 0.06;
        }

        // --- prop flourishes -----------------------------------------
        if (this._tail) {
            this._tail.rotation.z = Math.sin(t * 4) * 0.18;   // wag
        }
        if (this._rocketFlames) {
            const flick = 0.7 + Math.sin(t * 30) * 0.3;
            for (const f of this._rocketFlames) {
                f.scale.y = flick;
                if (f.material) f.material.opacity = 0.7 + Math.sin(t * 24 + f.id) * 0.2;
            }
        }
    }

    /* ---- small math helpers ------------------------------------- */
    _angDiff(a, b) {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    /* =================================================================
       DISPOSAL
       ================================================================= */
    _disposeNode(node) {
        node.traverse((o) => {
            if (o.geometry && o.geometry.dispose) o.geometry.dispose();
            if (o.material) {
                const mats = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of mats) { if (m.map && m.map.dispose) m.map.dispose(); if (m.dispose) m.dispose(); }
            }
        });
    }

    dispose() {
        for (const d of this._disposables) { if (d && d.dispose) d.dispose(); }
        for (const k in this._textures) { const tx = this._textures[k]; if (tx && tx.dispose) tx.dispose(); }
        if (this._patternTex && this._patternTex.dispose) this._patternTex.dispose();
        this._disposables = [];
        this._materials = {};
        this._textures = {};
    }
}

// Make available without modules (browser global / Node global) without
// using `export`. In the game this file is concatenated/loaded so the bare
// class declaration is enough; this guard just helps the self-test eval.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BeanView;
}
