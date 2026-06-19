'use strict';
/* =====================================================================
   view_bean.js — high-quality procedural 3D bean for "Bean Royale"
   (a Fall Guys tribute). Builds a soft, cute jellybean character from
   Three.js primitives and drives it with smooth, state-blended,
   procedural animation.

   No imports / exports / require — a free `THREE` is assumed in scope
   (in the game: `import * as THREE from 'three'`; in Node tests it is
   `eval`'d with THREE already defined).

   World mapping (logical sim is top-down X/Y, Z = height; world is Y-up).
   Performed inside update():
       group.position.set(bean.x, bean.z, bean.y)   // z(height) -> world Y
       group.rotation.y = Math.PI/2 - bean.facing
   The group ORIGIN is the bean's FEET on the ground plane (world y = 0).
   EVERYTHING is built at local y >= 0 so the bean never clips the floor:
   feet rest at y ~ 0, the body sits above, the head crowns it. The
   build is laid out from a fixed "foot line" and proven by the self
   test (root bounding-box min.y >= -0.5 at rest).

   Interface (unchanged):
     class BeanView { constructor(appearance); get object3d();
                      setAppearance(appearance); update(bean,dt,t); dispose(); }
   ===================================================================== */

class BeanView {
    constructor(appearance) {
        // ---- proportions (all derived from r so scaling is trivial) --
        const r = 17;                     // matches CFG.BEAN_R / bean.r
        this.r = r;

        // Foot line sits at y = 0. Legs are short; the body floats just
        // above the feet. These numbers define the whole silhouette and are
        // tuned so the crown lands near ~2.3*r (total height) with the body
        // roughly radius r, and nothing dips below y = 0 at rest.
        // Fall-Guys jellybean: the BODY is the dominant shape and nearly
        // reaches the floor; tiny legs/feet poke out of the bottom-front.
        // total body height = bodyH + 2*bodyR; tuned to ~2.0*r so head detail
        // crowns it near ~2.3*r. The body's lower cap rests just above y=0.
        this.bodyR    = r * 0.78;         // jellybean radius (widest)
        this.bodyH    = r * 0.50;         // capsule straight section
        this.groundGap = r * 0.04;        // clearance under the body
        // seat so the lower cap (bodyCY - bodyH/2 - bodyR) == groundGap
        this.bodyCY   = this.groundGap + this.bodyH * 0.5 + this.bodyR;
        // legs hang from low hips; feet rest on the floor at the front.
        this.footR    = r * 0.24;         // foot radius (rests on ground)
        this.footFlat = 0.6;              // foot vertical squash (scale.y)
        this.legR     = r * 0.2;          // leg capsule radius
        this.legLen   = r * 0.1;          // leg capsule straight section
        this.footCY   = this.footR * this.footFlat;   // foot centre (bottom ~0)
        this.hipY     = this.bodyCY - this.bodyR * 0.25;   // hips inside lower body
        this.bodyTopY = this.bodyCY + this.bodyH * 0.5 + this.bodyR;     // crown
        this.faceY    = this.bodyCY + this.bodyH * 0.42;  // eyes height
        this.shoulderY= this.bodyCY + this.bodyH * 0.30;

        // ---- persistent pose state (every animated DOF eased -> target)
        this.pose = {
            armLPitch: 0, armRPitch: 0,   // swing fwd(+Z)/back around X
            armLRoll: 0,  armRRoll: 0,    // raise out to the side
            armLYaw: 0,   armRYaw: 0,     // twist around Y
            armLScale: 1, armRScale: 1,   // per-arm reach
            legLPitch: 0, legRPitch: 0,   // leg swing around X
            legSplay: 0,                   // legs out to sides
            legTuck: 0,                    // both legs tuck up (airborne)
            bodyPitch: 0,                  // forward lean / dive pitch
            bodyRoll: 0,                   // side roll
            headPitch: 0, headYaw: 0, headRoll: 0,
            sx: 1, sy: 1, sz: 1,          // body squash / stretch
            crouch: 0,                     // lower whole body
            lift: 0,                       // raise whole body (leap)
            lookX: 0, lookY: 0,           // pupil offset
            eyeOpen: 1,                    // 1 open, ~0.1 closed (blink)
            mouthOpen: 0,
        };
        this._target = {};

        // internal phase accumulators (decoupled from sim time)
        this._runPhase  = 0;
        this._idlePhase = Math.random() * Math.PI * 2;
        this._emotePhase = 0;
        this._spinExtra = 0;               // accumulated yaw for spin emote
        this._t = 0;
        // one-shot vertical bob accumulators (set by pose fns, read in commit)
        this._breatheBob = 0; this._runBob = 0; this._danceBob = 0;

        this._disposables = [];            // geometries + materials to free
        this._materials = {};              // re-tintable materials by key
        this._patternTex = null;

        this._build(appearance || {});
    }

    /* ---------------------------------------------------------------- */
    get object3d() { return this.root; }

    /* =================================================================
       small helpers
       ================================================================= */
    _mat(key, opts) {
        const m = new THREE.MeshStandardMaterial(opts);
        this._disposables.push(m);
        if (key) this._materials[key] = m;
        return m;
    }
    _geo(g) { this._disposables.push(g); return g; }

    // shade a hex toward black (amt<0) or white (amt>0) by |amt|
    _shade(hex, amt) {
        const c = new THREE.Color(hex);
        const f = amt < 0 ? 0 : 1, k = Math.min(1, Math.abs(amt));
        c.r += (f - c.r) * k; c.g += (f - c.g) * k; c.b += (f - c.b) * k;
        return c;
    }
    _shadeStr(hex, amt) { return '#' + this._shade(hex, amt).getHexString(); }

    // saturate/boost a colour a touch for candy vibrancy
    _candy(hex) {
        const c = new THREE.Color(hex);
        const mx = Math.max(c.r, c.g, c.b);
        if (mx > 0) { const k = Math.min(1.12, 1 / mx * 0.96 + 0.18); }
        return c;
    }

    /* =================================================================
       BUILD
       ================================================================= */
    _build(appearance) {
        const r = this.r;
        this.appearance = Object.assign(
            { color: '#ffd23f', pattern: 'solid', upper: 'none', lower: 'none', visor: '#3fd2ff' },
            appearance
        );

        // root: at feet, yawed by the engine each frame
        this.root = new THREE.Group();
        this.root.name = 'bean';

        // tumble: ragdoll / fall multi-axis spin, pivots near body centre
        this.tumble = new THREE.Group();
        this.tumble.position.y = this.bodyCY;
        this.root.add(this.tumble);

        // lean: forward lean / dive pitch. We pivot near the HIPS so a
        // forward dive swings the body+head over the feet convincingly.
        this.lean = new THREE.Group();
        this.lean.position.y = this.hipY - this.bodyCY;   // move pivot to hips
        this.tumble.add(this.lean);

        // bob: vertical breathe / run / crouch / leap offset
        this.bob = new THREE.Group();
        this.lean.add(this.bob);

        // bodyScale: squash & stretch about the foot line
        this.bodyScale = new THREE.Group();
        this.bodyScale.position.y = -this.hipY;           // back to foot space
        this.bob.add(this.bodyScale);

        // shared materials -------------------------------------------------
        this.bodyMat = this._mat('body', {
            color: new THREE.Color(this.appearance.color),
            roughness: 0.5, metalness: 0.0,
            emissive: new THREE.Color(this.appearance.color).multiplyScalar(0.06),
        });
        // slightly darker zone for fake ambient occlusion on the underside
        this.bodyDarkMat = this._mat('bodyDark', {
            color: this._shade(this.appearance.color, -0.22),
            roughness: 0.58, metalness: 0.0,
            emissive: new THREE.Color(this.appearance.color).multiplyScalar(0.03),
        });
        this.limbMat = this._mat('limb', {
            color: new THREE.Color(this.appearance.color),
            roughness: 0.5, metalness: 0.0,
            emissive: new THREE.Color(this.appearance.color).multiplyScalar(0.05),
        });
        this.footMat = this._mat('foot', {
            color: this._shade(this.appearance.color, -0.30),
            roughness: 0.55, metalness: 0.0,
        });

        this._buildBody();
        this._buildFace();
        this._buildLimbs();

        this._buildPattern();
        this._buildUpper(this.appearance.upper);
        this._buildLower(this.appearance.lower);
    }

    _buildBody() {
        const r = this.r;
        // High-segment capsule = smooth soft jellybean.
        const bodyGeo = this._geo(new THREE.CapsuleGeometry(this.bodyR, this.bodyH, 18, 32));
        this.bodyMesh = new THREE.Mesh(bodyGeo, this.bodyMat);
        this.bodyMesh.position.y = this.bodyCY;
        // egg/jellybean: a touch narrower & taller at the top, fuller belly
        this.bodyMesh.scale.set(1.0, 1.0, 0.96);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyScale.add(this.bodyMesh);

        // Fake-AO underside: a darker squashed sphere hugging the lower body.
        const aoGeo = this._geo(new THREE.SphereGeometry(this.bodyR * 0.99, 24, 16));
        this.aoMesh = new THREE.Mesh(aoGeo, this.bodyDarkMat);
        this.aoMesh.position.y = this.bodyCY - this.bodyH * 0.42;
        this.aoMesh.scale.set(1.0, 0.62, 0.96);
        this.aoMesh.castShadow = false;
        this.bodyScale.add(this.aoMesh);

        // Soft top highlight zone (very subtly lighter) for a candy sheen.
        const hiMat = this._mat('bodyHi', {
            color: this._shade(this.appearance.color, 0.14),
            roughness: 0.4, metalness: 0.0,
            emissive: new THREE.Color(this.appearance.color).multiplyScalar(0.05),
            transparent: true, opacity: 0.55,
        });
        const hiGeo = this._geo(new THREE.SphereGeometry(this.bodyR * 0.92, 20, 14));
        this.hiMesh = new THREE.Mesh(hiGeo, hiMat);
        this.hiMesh.position.set(0, this.bodyCY + this.bodyH * 0.30, -this.bodyR * 0.12);
        this.hiMesh.scale.set(0.9, 0.7, 0.85);
        this.hiMesh.castShadow = false;
        this.bodyScale.add(this.hiMesh);

        // pattern overlay lives in its own group on the body
        this._patternGroup = new THREE.Group();
        this.bodyScale.add(this._patternGroup);
    }

    /* ----- FACE --------------------------------------------------- */
    _buildFace() {
        const r = this.r;
        this.headPivot = new THREE.Group();
        this.headPivot.position.set(0, this.faceY, 0);
        this.bodyScale.add(this.headPivot);

        this.face = new THREE.Group();
        // Face sits on the front (+Z) of the upper body.
        this.face.position.set(0, 0, this.bodyR * 0.66);
        this.headPivot.add(this.face);

        // Glossy curved visor — a thin curved shell across the eyes.
        this.visorMat = this._mat('visor', {
            color: new THREE.Color(this.appearance.visor),
            roughness: 0.12, metalness: 0.15,
            emissive: new THREE.Color(this.appearance.visor).multiplyScalar(0.10),
            transparent: true, opacity: 0.92,
        });
        // a partial sphere shell, scaled flat, gives a wrap-around visor
        const visorGeo = this._geo(new THREE.SphereGeometry(r * 0.66, 24, 16,
            0, Math.PI * 2, Math.PI * 0.18, Math.PI * 0.44));
        this.visorMesh = new THREE.Mesh(visorGeo, this.visorMat);
        this.visorMesh.position.set(0, r * 0.04, -r * 0.30);
        this.visorMesh.scale.set(1.06, 0.92, 0.62);
        this.visorMesh.rotation.x = -0.12;
        this.visorMesh.castShadow = false;
        this.face.add(this.visorMesh);

        // Eyes: glossy white spheres + dark pupils with a tiny specular dot.
        const whiteMat = this._mat('eyeWhite', { color: new THREE.Color('#ffffff'), roughness: 0.22, metalness: 0.0 });
        const pupilMat = this._mat('pupil', { color: new THREE.Color('#23203a'), roughness: 0.18, metalness: 0.0 });
        const glintMat = this._mat('glint', { color: new THREE.Color('#ffffff'), roughness: 0.1, emissive: new THREE.Color('#444') });
        const eyeGeo = this._geo(new THREE.SphereGeometry(r * 0.215, 18, 16));
        const pupilGeo = this._geo(new THREE.SphereGeometry(r * 0.115, 14, 12));
        const glintGeo = this._geo(new THREE.SphereGeometry(r * 0.045, 8, 8));

        this.eyes = [];
        for (const side of [+1, -1]) {
            const eye = new THREE.Group();
            eye.position.set(side * r * 0.33, r * 0.02, r * 0.04);
            const white = new THREE.Mesh(eyeGeo, whiteMat);
            white.scale.z = 0.55;
            white.castShadow = false;
            eye.add(white);
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.z = r * 0.14;
            pupil.castShadow = false;
            eye.add(pupil);
            const glint = new THREE.Mesh(glintGeo, glintMat);
            glint.position.set(side * r * 0.04, r * 0.05, r * 0.20);
            glint.castShadow = false;
            eye.add(glint);
            this.face.add(eye);
            this.eyes.push({ group: eye, pupil });
        }

        // Soft pink cheeks (flat translucent discs).
        const cheekMat = this._mat('cheek', {
            color: new THREE.Color('#ff86a6'), roughness: 0.85,
            transparent: true, opacity: 0.55,
        });
        const cheekGeo = this._geo(new THREE.CircleGeometry(r * 0.17, 16));
        for (const side of [+1, -1]) {
            const ch = new THREE.Mesh(cheekGeo, cheekMat);
            ch.position.set(side * r * 0.55, -r * 0.30, r * 0.20);
            ch.castShadow = false;
            this.face.add(ch);
        }

        // Tiny mouth — a small dark torus arc; opens (scaleY) for emotes.
        const mouthMat = this._mat('mouth', { color: new THREE.Color('#5a3142'), roughness: 0.6 });
        const mouthGeo = this._geo(new THREE.TorusGeometry(r * 0.12, r * 0.035, 8, 16, Math.PI));
        this.mouth = new THREE.Mesh(mouthGeo, mouthMat);
        this.mouth.position.set(0, -r * 0.16, r * 0.22);
        this.mouth.rotation.z = Math.PI;          // smile arc opening downward = upturned
        this.mouth.castShadow = false;
        this.face.add(this.mouth);
    }

    /* ----- LIMBS (arms + legs) ------------------------------------ */
    _buildLimbs() {
        this.armL = this._buildArm(+1);
        this.armR = this._buildArm(-1);
        this.bodyScale.add(this.armL.pivot);
        this.bodyScale.add(this.armR.pivot);

        this.legL = this._buildLeg(+1);
        this.legR = this._buildLeg(-1);
        this.bodyScale.add(this.legL.pivot);
        this.bodyScale.add(this.legR.pivot);
    }

    _buildArm(side) {
        const r = this.r;
        const pivot = new THREE.Group();
        // shoulder on the side of the upper body
        pivot.position.set(side * this.bodyR * 0.82, this.shoulderY, 0);

        const len = r * 0.62;
        const geo = this._geo(new THREE.CapsuleGeometry(r * 0.24, len, 6, 14));
        const mesh = new THREE.Mesh(geo, this.limbMat);
        mesh.position.y = -(len * 0.5 + r * 0.24);   // hang from the pivot
        mesh.castShadow = true;
        pivot.add(mesh);

        // rounded mitten hand (slightly lighter for read)
        const handMat = this._mat('hand', { color: this._shade(this.appearance.color, 0.16), roughness: 0.5 });
        this._materials['hand' + (side > 0 ? 'L' : 'R')] = handMat;
        const hand = new THREE.Mesh(this._geo(new THREE.SphereGeometry(r * 0.27, 12, 10)), handMat);
        hand.position.y = -(len + r * 0.24);
        hand.scale.set(1, 0.95, 1.05);
        hand.castShadow = true;
        pivot.add(hand);

        pivot.userData.side = side;
        return { pivot, mesh, hand, len };
    }

    _buildLeg(side) {
        const r = this.r;
        const pivot = new THREE.Group();
        pivot.position.set(side * this.bodyR * 0.42, this.hipY, 0);

        // hip-to-foot distance in pivot-local space (pivot at the hip).
        const footDrop = this.hipY - this.footCY;
        // leg capsule spans most of that gap (a little shorter so the rounded
        // foot reads as a separate ball). It lives mostly under the body.
        const len = Math.max(r * 0.1, footDrop - this.footR * 1.2);
        const geo = this._geo(new THREE.CapsuleGeometry(this.legR, len, 6, 12));
        const mesh = new THREE.Mesh(geo, this.footMat);
        mesh.position.y = -(len * 0.5 + this.legR * 0.2);   // hang from the hip
        mesh.castShadow = true;
        pivot.add(mesh);

        // chunky rounded foot/shoe; its lowest point rests at y ~ 0 at rest.
        const foot = new THREE.Mesh(this._geo(new THREE.SphereGeometry(this.footR, 14, 12)), this.footMat);
        foot.scale.set(1.05, this.footFlat, 1.5);
        foot.position.set(0, -footDrop, r * 0.16);
        foot.castShadow = true;
        pivot.add(foot);
        this.legLen = len;   // record actual length for costume placement

        // hip -> foot centre / lowest point (for costume + planting math)
        const footBottom = footDrop + this.footR * this.footFlat;
        return { pivot, mesh, foot, len, footY: -footDrop, footBottom };
    }

    /* =================================================================
       PATTERN (CanvasTexture in browser, mesh accents in Node)
       ================================================================= */
    _buildPattern() {
        // clear any prior pattern artefacts
        while (this._patternGroup.children.length) {
            const c = this._patternGroup.children.pop();
            this._disposeNode(c);
        }
        if (this._patternTex) { this._patternTex.dispose(); this._patternTex = null; }

        const type = this.appearance.pattern || 'solid';
        const base = this.appearance.color;

        if (type === 'solid') {
            this.bodyMat.map = null;
            this.bodyMat.color.set(base);
            this.bodyMat.needsUpdate = true;
            return;
        }

        // Browser: paint a CanvasTexture and wrap it onto the body.
        if (typeof document !== 'undefined' && document.createElement) {
            const tex = this._makePatternTexture(type, base);
            if (tex) {
                this._patternTex = tex;
                this.bodyMat.map = tex;
                this.bodyMat.color.set('#ffffff');   // let the texture's colour show
                this.bodyMat.needsUpdate = true;
                return;
            }
        }

        // Node / no-canvas: approximate with a few tasteful accent meshes so
        // the pattern still reads and the self-test exercises real geometry.
        this.bodyMat.map = null;
        this.bodyMat.color.set(base);
        this.bodyMat.needsUpdate = true;
        this._buildPatternMeshes(type, base);
    }

    _makePatternTexture(type, base) {
        const W = 512, H = 512;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const ctx = cv.getContext('2d');
        if (!ctx) return null;
        const dk = this._shadeStr(base, -0.30), dk2 = this._shadeStr(base, -0.16);
        const lt = this._shadeStr(base, 0.42), lt2 = this._shadeStr(base, 0.22);
        ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
        const star = (cx, cy, R, ri, pts, col) => {
            ctx.fillStyle = col; ctx.beginPath();
            for (let i = 0; i < pts * 2; i++) {
                const a = (Math.PI / pts) * i - Math.PI / 2, rad = (i & 1) ? ri : R;
                const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
                i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.closePath(); ctx.fill();
        };
        switch (type) {
            case 'stripes':
                ctx.fillStyle = dk;
                for (let i = -1; i < 9; i++) { ctx.save(); ctx.translate(i * 64, 0); ctx.rotate(0.12); ctx.fillRect(0, -20, 30, H + 40); ctx.restore(); }
                break;
            case 'spots':
                for (const p of [[.2,.22,.10],[.62,.34,.13],[.4,.66,.11],[.8,.76,.09],[.12,.82,.08],[.86,.16,.10],[.5,.5,.12],[.7,.92,.08]]) {
                    ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(p[0]*W, p[1]*H, p[2]*W, 0, 6.283); ctx.fill();
                    ctx.fillStyle = lt2; ctx.beginPath(); ctx.arc(p[0]*W - p[2]*W*0.3, p[1]*H - p[2]*H*0.3, p[2]*W*0.35, 0, 6.283); ctx.fill();
                }
                break;
            case 'check': {
                const n = 8, s = W / n;
                for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
                    if ((x + y) & 1) { ctx.fillStyle = dk; ctx.fillRect(x*s, y*s, s, s); }
                break;
            }
            case 'camo': {
                ctx.fillStyle = lt2; ctx.fillRect(0, 0, W, H);
                const blob = (cx, cy, rr, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr*0.8, 0.5, 0, 6.283); ctx.fill(); };
                for (const p of [[.3,.25,90],[.7,.5,110],[.45,.82,80],[.86,.16,72],[.12,.64,86],[.6,.05,70]]) blob(p[0]*W, p[1]*H, p[2], dk);
                for (const p of [[.55,.2,52],[.2,.86,46],[.82,.72,50],[.4,.5,44]]) blob(p[0]*W, p[1]*H, p[2], dk2);
                break;
            }
            case 'tiger':
                ctx.strokeStyle = dk; ctx.lineWidth = 26; ctx.lineCap = 'round';
                for (let i = -1; i < 9; i++) {
                    ctx.beginPath(); ctx.moveTo(0, i * 64);
                    ctx.quadraticCurveTo(W * 0.5, i * 64 - 48, W, i * 64);
                    ctx.stroke();
                }
                break;
            case 'star':
                ctx.fillStyle = this._shadeStr(base, -0.12); ctx.fillRect(0, 0, W, H);
                for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++)
                    star(x*128 + 64, y*128 + 64, 42, 17, 5, (x+y)&1 ? lt : '#fff');
                break;
            case 'tiedye': {
                const g = ctx.createRadialGradient(W*0.42, H*0.4, 6, W*0.5, H*0.5, W*0.72);
                g.addColorStop(0, 'rgba(255,255,255,0.9)');
                g.addColorStop(0.3, this._shadeStr(base, 0.4));
                g.addColorStop(0.6, base);
                g.addColorStop(0.85, dk2);
                g.addColorStop(1, dk);
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                break;
            }
            case 'galaxy': {
                const g = ctx.createLinearGradient(0, 0, W, H);
                g.addColorStop(0, '#2b1d5e'); g.addColorStop(0.5, '#6a32c8'); g.addColorStop(1, '#1b1340');
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                const neb = ctx.createRadialGradient(W*0.6, H*0.4, 10, W*0.6, H*0.4, W*0.5);
                neb.addColorStop(0, 'rgba(255,120,200,0.5)'); neb.addColorStop(1, 'rgba(255,120,200,0)');
                ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
                ctx.fillStyle = '#fff';
                for (let i = 0; i < 140; i++) {
                    ctx.globalAlpha = 0.3 + Math.random() * 0.7;
                    ctx.beginPath(); ctx.arc(Math.random()*W, Math.random()*H, Math.random()*2.2 + 0.4, 0, 6.283); ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
            }
            default: return null;
        }
        const tex = new THREE.CanvasTexture(cv);
        if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return tex;
    }

    // Mesh-based fallback (no canvas). A few thin accents on the body.
    _buildPatternMeshes(type, base) {
        const r = this.r, R = this.bodyR;
        const dkMat = this._mat(null, { color: this._shade(base, -0.28), roughness: 0.55 });
        const ltMat = this._mat(null, { color: this._shade(base, 0.40), roughness: 0.45 });
        const grp = this._patternGroup;
        grp.position.y = 0;
        const add = (geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x, y, z);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            if (sx || sy || sz) m.scale.set(sx || 1, sy || 1, sz || 1);
            m.castShadow = false;
            grp.add(m);
        };
        const cy = this.bodyCY, surf = R * 1.004;
        switch (type) {
            case 'stripes':
                for (let i = -2; i <= 2; i++)
                    add(new THREE.BoxGeometry(r * 0.16, this.bodyH + R * 1.2, r * 0.04), dkMat, 0, cy, 0, 0, i * 0.5, 0);
                break;
            case 'spots':
                for (const p of [[0.5,0.4],[-0.7,0.9],[0.2,-0.4],[-0.3,-0.1],[0.85,-0.7],[-1.0,0.2]]) {
                    const a = p[0] * Math.PI, h = cy + p[1] * R * 0.7;
                    add(new THREE.SphereGeometry(r * 0.18, 10, 8), dkMat, Math.cos(a) * surf, h, Math.sin(a) * surf, 0,0,0, 1,1,0.4);
                }
                break;
            case 'star':
                add(new THREE.ConeGeometry(r * 0.42, r * 0.1, 5), ltMat, 0, cy + R*0.1, surf, Math.PI / 2, 0, 0);
                break;
            case 'check':
                add(new THREE.TorusGeometry(R * 0.96, r * 0.10, 8, 20), dkMat, 0, cy, 0, Math.PI / 2, 0, 0);
                add(new THREE.TorusGeometry(R * 0.86, r * 0.08, 8, 20), ltMat, 0, cy + R*0.35, 0, Math.PI / 2, 0, 0);
                break;
            default:
                add(new THREE.TorusGeometry(R * 0.96, r * 0.11, 8, 20), dkMat, 0, cy - R*0.1, 0, Math.PI / 2, 0, 0);
                break;
        }
    }

    /* =================================================================
       UPPER COSTUME (head accessories)
       ================================================================= */
    _buildUpper(prop) {
        const r = this.r;
        if (this.upperGroup) {
            (this.upperGroup.parent || this.headPivot).remove(this.upperGroup);
            this._disposeNode(this.upperGroup);
            this.upperGroup = null;
        }
        if (prop === 'none' || !prop) return;

        this.upperGroup = new THREE.Group();
        // crown of the head in headPivot-local space
        const crownY = this.bodyTopY - this.faceY;
        this.upperGroup.position.y = crownY;
        this.headPivot.add(this.upperGroup);
        const g = this.upperGroup;

        const M = (col, opts) => this._mat(null, Object.assign({ color: new THREE.Color(col), roughness: 0.5 }, opts || {}));
        const add = (geo, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x || 0, y || 0, z || 0);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            m.castShadow = true; g.add(m); return m;
        };
        const shiny = { metalness: 0.65, roughness: 0.22, emissive: new THREE.Color('#3a2a00') };

        switch (prop) {
            case 'party':
                add(new THREE.ConeGeometry(r * 0.5, r * 1.15, 20), M('#ff5fa2', { emissive: new THREE.Color('#3a1530') }), 0, r * 0.6, 0);
                // swirl stripes
                add(new THREE.ConeGeometry(r * 0.52, r * 1.05, 20, 1, true), M('#ffd23f', { transparent: true, opacity: 0.9 }), 0, r * 0.58, 0);
                add(new THREE.SphereGeometry(r * 0.18, 12, 12), M('#fff7c0', { emissive: new THREE.Color('#5a4a10') }), 0, r * 1.22, 0);
                break;
            case 'cap':
                add(new THREE.SphereGeometry(r * 0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('#e6395a'), 0, r * 0.02, 0);
                add(new THREE.BoxGeometry(r * 0.72, r * 0.1, r * 0.55), M('#c92b48'), 0, r * 0.0, -r * 0.72);  // backwards brim
                add(new THREE.SphereGeometry(r * 0.07, 8, 8), M('#fff'), 0, r * 0.5, 0);
                break;
            case 'pigeon': {
                add(new THREE.SphereGeometry(r * 0.55, 16, 14), M('#cfd6df'), 0, r * 0.42, r * 0.05);
                add(new THREE.SphereGeometry(r * 0.34, 14, 12), M('#cfd6df'), 0, r * 0.7, r * 0.18);   // little head
                add(new THREE.ConeGeometry(r * 0.12, r * 0.4, 8), M('#ff9447'), 0, r * 0.68, r * 0.5, Math.PI / 2, 0, 0); // beak
                for (const s of [+1, -1]) add(new THREE.SphereGeometry(r * 0.07, 8, 8), M('#1a1a1a'), s * r * 0.14, r * 0.78, r * 0.34);
                for (const s of [+1, -1]) add(new THREE.SphereGeometry(r * 0.3, 12, 10), M('#b9c1cc'), s * r * 0.5, r * 0.35, -r * 0.1).scale.set(0.5, 0.9, 1.1); // wings
                break;
            }
            case 'bee':
                for (const s of [+1, -1]) {
                    add(new THREE.CylinderGeometry(r * 0.035, r * 0.035, r * 0.62, 6), M('#2a2a2a'), s * r * 0.22, r * 0.32, 0, 0, 0, s * 0.35);
                    add(new THREE.SphereGeometry(r * 0.12, 10, 10), M('#ffd23f', { emissive: new THREE.Color('#5a4a00') }), s * r * 0.42, r * 0.62, 0);
                }
                break;
            case 'cat':
                for (const s of [+1, -1]) {
                    add(new THREE.ConeGeometry(r * 0.26, r * 0.55, 16), M(this._shadeStr(this.appearance.color, -0.1)), s * r * 0.4, r * 0.34, 0, 0, 0, -s * 0.18);
                    add(new THREE.ConeGeometry(r * 0.14, r * 0.32, 12), M('#ff9db4'), s * r * 0.4, r * 0.3, r * 0.08, 0, 0, -s * 0.18); // inner ear
                }
                break;
            case 'pirate':
                add(new THREE.CylinderGeometry(r * 0.8, r * 0.95, r * 0.14, 20), M('#23203a'), 0, r * 0.05, 0);   // brim
                add(new THREE.SphereGeometry(r * 0.56, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.1), M('#23203a'), 0, r * 0.1, 0); // dome
                add(new THREE.CircleGeometry(r * 0.16, 8), M('#fff', { emissive: new THREE.Color('#333') }), 0, r * 0.28, r * 0.46); // skull
                for (const s of [+1, -1]) add(new THREE.CircleGeometry(r * 0.04, 8), M('#23203a'), s * r * 0.06, r * 0.30, r * 0.49);
                break;
            case 'dino':
                // spikes down the spine; reattach to bodyScale so they line the back
                this.headPivot.remove(this.upperGroup);
                this.bodyScale.add(this.upperGroup);
                this.upperGroup.position.set(0, 0, 0);
                for (let i = 0; i < 5; i++) {
                    const sz = 0.55 - i * 0.06;
                    add(new THREE.ConeGeometry(r * 0.2, r * (0.65 * sz + 0.32), 4),
                        M('#46d36a', { emissive: new THREE.Color('#0e3a1c') }),
                        0, this.bodyCY + this.bodyH * 0.42 - i * (this.bodyH * 0.22), -this.bodyR * (0.78 + i * 0.02),
                        0.35, Math.PI / 4, 0);
                }
                break;
            case 'crown':
                add(new THREE.CylinderGeometry(r * 0.55, r * 0.58, r * 0.3, 18), M('#ffd23f', shiny), 0, r * 0.18, 0);
                for (let i = 0; i < 7; i++) {
                    const a = (i / 7) * Math.PI * 2;
                    add(new THREE.ConeGeometry(r * 0.11, r * 0.3, 4), M('#ffd23f', shiny), Math.cos(a) * r * 0.55, r * 0.42, Math.sin(a) * r * 0.55);
                }
                for (const p of [[0, '#ff4d6d'], [0.9, '#4dd2ff'], [-0.9, '#7bff7b']]) {
                    add(new THREE.SphereGeometry(r * 0.1, 10, 10), M(p[1], { emissive: new THREE.Color(p[1]).multiplyScalar(0.4), roughness: 0.2 }), Math.sin(p[0]) * r * 0.5, r * 0.2, Math.cos(p[0]) * r * 0.55);
                }
                break;
            default: break;
        }
    }

    /* =================================================================
       LOWER COSTUME (legs / back)
       ================================================================= */
    _buildLower(prop) {
        const r = this.r;
        if (this.lowerGroup) { this.bodyScale.remove(this.lowerGroup); this._disposeNode(this.lowerGroup); this.lowerGroup = null; }
        this._tail = null; this._rocketFlames = null;
        if (prop === 'none' || !prop) return;

        this.lowerGroup = new THREE.Group();
        this.bodyScale.add(this.lowerGroup);
        const g = this.lowerGroup;
        const M = (col, opts) => this._mat(null, Object.assign({ color: new THREE.Color(col), roughness: 0.5 }, opts || {}));
        const add = (parent, geo, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(this._geo(geo), mat);
            m.position.set(x || 0, y || 0, z || 0);
            if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
            m.castShadow = true; parent.add(m); return m;
        };
        const shiny = { metalness: 0.7, roughness: 0.2, emissive: new THREE.Color('#3a2a00') };

        switch (prop) {
            case 'shoes':
                for (const s of [+1, -1]) {
                    const leg = (s > 0 ? this.legL : this.legR);
                    // wrap the shoe around the foot; lowest point stays near y~0
                    const sh = add(leg.pivot, new THREE.SphereGeometry(r * 0.28, 12, 10), M('#f25c54', { roughness: 0.4 }),
                        0, leg.footY + r * 0.02, r * 0.18);
                    sh.scale.set(1.2, 0.66, 1.6);
                }
                break;
            case 'tutu': {
                const t = add(g, new THREE.TorusGeometry(this.bodyR * 1.02, r * 0.3, 10, 22), M('#ff8fd0', { transparent: true, opacity: 0.9, roughness: 0.6 }),
                    0, this.hipY + r * 0.35, 0, Math.PI / 2, 0, 0);
                t.scale.set(1, 0.55, 1);
                break;
            }
            case 'tail': {
                const tail = add(g, new THREE.ConeGeometry(r * 0.42, r * 1.5, 10), M('#46d36a', { emissive: new THREE.Color('#0e3a1c') }),
                    0, this.bodyCY - this.bodyH * 0.2, -this.bodyR * 0.85, -Math.PI / 2.4, 0, 0);
                this._tail = tail;            // gentle wag in commit
                break;
            }
            case 'rocket': {
                // back-mounted jetpack: boots on the lower back, short flames
                // that flicker but stay near the foot line so they don't clip.
                this._rocketFlames = [];
                const baseY = this.hipY + r * 0.45;
                for (const s of [+1, -1]) {
                    add(g, new THREE.CylinderGeometry(r * 0.28, r * 0.34, r * 0.55, 14), M('#c0c6d0', { metalness: 0.5, roughness: 0.3 }), s * this.bodyR * 0.5, baseY, -this.bodyR * 0.55);
                    add(g, new THREE.ConeGeometry(r * 0.28, r * 0.4, 14), M('#e2483a', { roughness: 0.4 }), s * this.bodyR * 0.5, baseY + r * 0.45, -this.bodyR * 0.55); // nose cone
                    const flame = add(g, new THREE.ConeGeometry(r * 0.24, r * 0.6, 12), M('#ff7a2c', { emissive: new THREE.Color('#ff5a1c'), transparent: true, opacity: 0.9 }), s * this.bodyR * 0.5, baseY - r * 0.55, -this.bodyR * 0.55, Math.PI, 0, 0);
                    const core = add(g, new THREE.ConeGeometry(r * 0.12, r * 0.38, 10), M('#ffe27a', { emissive: new THREE.Color('#ffd23f'), transparent: true, opacity: 0.95 }), s * this.bodyR * 0.5, baseY - r * 0.48, -this.bodyR * 0.55, Math.PI, 0, 0);
                    this._rocketFlames.push(flame, core);
                }
                break;
            }
            case 'gold':
                for (const s of [+1, -1]) {
                    const leg = (s > 0 ? this.legL : this.legR);
                    const sh = add(leg.pivot, new THREE.SphereGeometry(r * 0.3, 12, 10), M('#ffd23f', shiny), 0, leg.footY + r * 0.02, r * 0.16);
                    sh.scale.set(1.2, 0.66, 1.6);
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
        const col = this.appearance.color;

        // colour-driven materials
        if (this._materials.body && !this.bodyMat.map) this._materials.body.color.set(col);
        if (this._materials.body) this._materials.body.emissive.copy(new THREE.Color(col).multiplyScalar(0.06));
        if (this._materials.bodyDark) { this._materials.bodyDark.color.copy(this._shade(col, -0.22)); this._materials.bodyDark.emissive.copy(new THREE.Color(col).multiplyScalar(0.03)); }
        if (this._materials.bodyHi) this._materials.bodyHi.color.copy(this._shade(col, 0.14));
        if (this._materials.limb) { this._materials.limb.color.set(col); this._materials.limb.emissive.copy(new THREE.Color(col).multiplyScalar(0.05)); }
        if (this._materials.foot) this._materials.foot.color.copy(this._shade(col, -0.30));
        if (this._materials.handL) this._materials.handL.color.copy(this._shade(col, 0.16));
        if (this._materials.handR) this._materials.handR.color.copy(this._shade(col, 0.16));
        if (this._materials.visor) {
            this._materials.visor.color.set(this.appearance.visor);
            this._materials.visor.emissive.copy(new THREE.Color(this.appearance.visor).multiplyScalar(0.10));
        }

        // rebuild pattern only when it (or base colour) changed
        if ((appearance.pattern !== undefined && appearance.pattern !== prev.pattern) ||
            (appearance.color !== undefined && appearance.color !== prev.color)) {
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
        const speed    = Math.hypot(bean.vx || 0, bean.vy || 0);
        const grounded = !!bean.grounded;
        const z        = bean.z || 0;
        const airborne = z > 1 && !bean.falling;
        const diveT    = bean.diveT || 0;
        const proneT   = bean.proneT || 0;
        const ragdoll  = bean.ragdoll || 0;
        const falling  = !!bean.falling;
        const squash   = (typeof bean.squash === 'number') ? bean.squash : 1;
        const emote    = bean.emoteAnim || null;
        const emoteT   = bean.emoteT || 0;
        const canEmote = emote && emoteT > 0 && grounded && ragdoll <= 0 && diveT <= 0 && proneT <= 0 && !falling;

        const P = this.pose;

        // ---- build TARGET pose (neutral baseline each frame) --------
        const T = this._target;
        for (const k in P) T[k] = 0;
        T.sx = 1; T.sy = 1; T.sz = 1; T.eyeOpen = 1; T.armLScale = 1; T.armRScale = 1;
        T.armLRoll = 0.16; T.armRRoll = 0.16;       // rest: arms a touch out
        this._spinExtraTarget = 0;

        // ===== priority chain: ragdoll/fall > dive > prone > airborne >
        //       emote > run > idle. Each writes targets; blending smooths.
        let handledBody = false;
        if (ragdoll > 0 || falling) { this._poseRagdoll(bean, T, dt, t); handledBody = true; }
        else if (diveT > 0)         { this._poseDive(bean, T, diveT);    handledBody = true; }
        else if (proneT > 0)        { this._poseProne(bean, T, proneT);  handledBody = true; }

        if (!handledBody) {
            if (airborne) this._poseAir(bean, T, squash);
            if (canEmote) this._poseEmote(emote, T, emoteT, dt, t);
            else if (!airborne) {
                if (speed > 6) this._poseRun(bean, T, speed, dt, t);
                else this._poseIdle(bean, T, dt, t);
            }
            this._applySquash(T, squash, airborne);
        } else {
            this._emotePhase = 0;
        }

        // blink overrides everything
        if (typeof bean.blink === 'number' && bean.blink < 0.12) T.eyeOpen = 0.1;

        // pupils track movement / gaze
        if (speed > 4) {
            const moveAng = Math.atan2(bean.vy || 0, bean.vx || 0);
            const rel = this._angDiff(bean.facing || 0, moveAng);
            T.lookX = Math.max(-1, Math.min(1, rel * 0.8 + Math.sin(t * 0.7) * 0.05));
        } else {
            T.lookX = Math.sin(t * 0.6) * 0.28;
        }
        T.lookY = -0.1 + (airborne ? 0.35 : 0) + (diveT > 0 ? 0.4 : 0);

        // ---- ease pose toward targets -------------------------------
        const RATE = 14;
        for (const k in P) {
            const fast = (k === 'sx' || k === 'sy' || k === 'sz' || k === 'eyeOpen');
            const a = Math.min(1, (fast ? RATE * 1.7 : RATE) * dt);
            P[k] += (T[k] - P[k]) * a;
        }

        // ---- commit to scene graph ----------------------------------
        this._commit(bean, dt, t, { ragdoll, falling, diveT, proneT });
    }

    /* ---- pose generators ---------------------------------------- */
    _poseIdle(bean, T, dt, t) {
        this._idlePhase += dt * 2.0;
        const ph = this._idlePhase;
        // gentle breathe
        T.sy = 1 + Math.sin(ph) * 0.035;
        T.sx = 1 - Math.sin(ph) * 0.02;
        T.sz = 1 - Math.sin(ph) * 0.02;
        // micro-sway
        T.bodyRoll = Math.sin(ph * 0.5) * 0.04;
        T.headRoll = Math.sin(ph * 0.5 + 0.4) * 0.05;
        T.headYaw  = Math.sin(ph * 0.33) * 0.09;
        T.armLRoll = 0.18 + Math.sin(ph) * 0.03;
        T.armRRoll = 0.18 - Math.sin(ph) * 0.03;
        T.armLPitch = Math.sin(ph * 0.7) * 0.05;
        T.armRPitch = -Math.sin(ph * 0.7) * 0.05;
        this._breatheBob = Math.sin(ph) * (this.r * 0.04);
    }

    _poseRun(bean, T, speed, dt, t) {
        const sp = Math.min(speed, 320);
        const cadence = 7 + sp * 0.04;          // rad/s, scales with speed
        this._runPhase += dt * cadence;
        const ph = this._runPhase;
        const amp = Math.min(1, 0.4 + sp / 300);

        const a = Math.sin(ph) * amp, b = Math.sin(ph + Math.PI) * amp;
        T.legLPitch = a * 1.0;
        T.legRPitch = b * 1.0;
        T.legSplay  = 0.06;
        // arms counter-swing
        T.armLPitch = b * 0.7;
        T.armRPitch = a * 0.7;
        T.armLRoll = 0.14; T.armRRoll = 0.14;
        // bob twice per stride + forward lean scaling with speed
        this._runBob = Math.abs(Math.sin(ph)) * (this.r * 0.1) * amp;
        T.bodyPitch = -(0.14 + amp * 0.2);       // lean nose-forward (+Z)
        T.bodyRoll  = Math.sin(ph) * 0.06 * amp;
        T.headPitch = 0.12 + amp * 0.08;          // keep face up against lean
        T.headYaw   = Math.sin(ph) * 0.05;
        T.mouthOpen = 0.3 + amp * 0.3;
    }

    _poseAir(bean, T, squash) {
        T.legTuck = 1;
        T.legLPitch = -0.9; T.legRPitch = -0.9;
        T.legSplay = 0.12;
        T.armLRoll = 0.7; T.armRRoll = 0.7;       // arms out for balance
        T.armLPitch = -0.25; T.armRPitch = -0.25;
        const rising = (bean.vz || 0) > 0;
        T.bodyPitch = rising ? -0.12 : 0.06;
        T.lift = rising ? this.r * 0.05 : 0;
        T.mouthOpen = 0.5;
    }

    _poseDive(bean, T, diveT) {
        // DRAMATIC superman: body pitched ~80-90deg forward (nearly flat),
        // arms thrust forward, legs trailing back, stretched, lifted up.
        const k = Math.min(1, diveT / 0.42);      // ~1 at the start of the dive
        const e = 0.4 + 0.6 * k;                  // ease the pitch in
        T.bodyPitch = -1.48 * e;                  // up to ~ -85deg (face toward +Z)
        // arms thrust straight forward (raised to horizontal + swung fwd)
        T.armLRoll = 1.55; T.armRRoll = 1.55;
        T.armLPitch = -1.55; T.armRPitch = -1.55;
        T.armLScale = 1.15; T.armRScale = 1.15;   // reach
        // legs trail straight back behind the body
        T.legLPitch = 0.85; T.legRPitch = 0.85;
        T.legSplay = 0.1;
        T.legTuck = 0.15;
        T.headPitch = 0.6;                        // look ahead while flat
        // stretched along travel: longer (z) + a bit narrower
        T.sx = 0.92; T.sy = 0.9; T.sz = 1.22;
        T.lift = this.r * (0.45 + 0.35 * e);      // leap up off the ground
        T.mouthOpen = 1.0;                        // open-mouth "wheee"
    }

    _poseProne(bean, T, proneT) {
        // belly-down recovery: lying flat, then springs back upright as k->0
        const k = Math.min(1, proneT / 0.4);      // ~1 just after landing
        const spring = k > 0.6 ? 0 : Math.sin((0.6 - k) * 4) * 0.12;  // little push-up
        T.bodyPitch = -1.42 * k;                  // lying forward, face-down
        T.sx = 1 + 0.22 * k; T.sy = 1 - 0.24 * k; T.sz = 1 + 0.18 * k;
        T.armLRoll = 1.2 * k; T.armRRoll = 1.2 * k;
        T.armLPitch = (-0.7 - spring) * k; T.armRPitch = (-0.7 - spring) * k;
        T.legLPitch = 0.5 * k; T.legRPitch = 0.5 * k;
        T.legSplay = 0.15 * k;
        T.headPitch = 0.5 * k;
        T.lift = this.r * 0.08 * k + spring * this.r;
    }

    _poseRagdoll(bean, T, dt, t) {
        // limbs flail loosely; tumble rotation applied in commit via bean.spin
        const f = t * 9;
        T.armLPitch = Math.sin(f * 1.3) * 1.5;
        T.armRPitch = Math.sin(f * 1.1 + 2) * 1.5;
        T.armLRoll = 0.5 + Math.sin(f * 0.9) * 0.8;
        T.armRRoll = 0.5 + Math.sin(f * 0.8 + 1) * 0.8;
        T.legLPitch = Math.sin(f * 1.2 + 1) * 1.2;
        T.legRPitch = Math.sin(f * 1.05) * 1.2;
        T.legSplay = 0.2 + Math.sin(f) * 0.15;
        T.legTuck = 0.35;
        T.headRoll = Math.sin(f * 0.7) * 0.4;
        T.headPitch = Math.sin(f * 0.6) * 0.3;
        T.eyeOpen = 0.25;                          // dazed
        T.mouthOpen = 0.7;
        T.sx = 1.05; T.sy = 0.95;
    }

    _poseEmote(anim, T, emoteT, dt, t) {
        const total = 1.8;
        const age = total - emoteT;
        const fade = Math.min(1, Math.min(age, emoteT) * 3.5);   // ease in/out
        this._emotePhase += dt;
        const ph = this._emotePhase;
        const bl = (base, val) => base + (val - base) * fade;

        switch (anim) {
            case 'wave':
                T.armRRoll = bl(0.16, 2.55);
                T.armRPitch = bl(0, -0.15);
                T.armRYaw = Math.sin(ph * 9) * 0.55 * fade;
                T.headRoll = Math.sin(ph * 9) * 0.07 * fade;
                T.armLRoll = 0.16;
                T.mouthOpen = 0.6;
                break;
            case 'dance': {
                const side = Math.sin(ph * 6);
                T.bodyRoll = side * 0.22 * fade;
                T.headRoll = side * 0.18 * fade;
                const flap = Math.abs(Math.sin(ph * 6)) * fade;
                T.armLRoll = bl(0.16, 1.35 + flap * 0.5);
                T.armRRoll = bl(0.16, 1.35 + flap * 0.5);
                T.armLPitch = -flap * 0.3; T.armRPitch = -flap * 0.3;
                T.headPitch = 0.08 + flap * 0.12;
                this._danceBob = Math.abs(side) * this.r * 0.12;
                T.mouthOpen = 0.6;
                break;
            }
            case 'crouch': {
                const c = (Math.sin(ph * 7) * 0.5 + 0.5) * fade;
                T.crouch = c;
                T.sy = 1 - c * 0.3; T.sx = 1 + c * 0.18; T.sz = 1 + c * 0.1;
                T.legLPitch = c * 0.7; T.legRPitch = c * 0.7;
                T.legSplay = 0.15 + c * 0.2;
                T.armLPitch = c * 0.4; T.armRPitch = c * 0.4;
                break;
            }
            case 'think':
                T.headRoll = bl(0, 0.35);
                T.headPitch = bl(0, 0.14);
                T.armRRoll = bl(0.16, 1.5);
                T.armRPitch = bl(0, -1.1);
                T.armRYaw = bl(0, -0.6);
                T.armLRoll = 0.1;
                T.bodyRoll = bl(0, 0.05) + Math.sin(ph) * 0.012;
                break;
            case 'flex': {
                T.armLRoll = bl(0.16, 1.65);
                T.armRRoll = bl(0.16, 1.65);
                T.armLPitch = bl(0, -1.75);
                T.armRPitch = bl(0, -1.75);
                T.armLYaw = 0.6; T.armRYaw = -0.6;
                const puff = (0.6 + Math.sin(ph * 4) * 0.4) * fade;
                T.sx = 1 + puff * 0.14; T.sz = 1 + puff * 0.14; T.sy = 1 + puff * 0.05;
                T.bodyPitch = -0.05;
                T.mouthOpen = 0.5;
                break;
            }
            case 'spin': {
                const turns = 2;
                this._spinExtraTarget = turns * Math.PI * 2 * Math.min(1, age / (total * 0.8));
                T.armLRoll = 0.95; T.armRRoll = 0.95;
                T.armLPitch = 0.2; T.armRPitch = 0.2;
                this._danceBob = Math.abs(Math.sin(age / total * Math.PI)) * this.r * 0.15;
                break;
            }
            case 'point':
                T.armRRoll = bl(0.16, 1.45);
                T.armRPitch = bl(0, -1.55);       // straight forward (+Z)
                T.armRScale = bl(1, 1.18);
                T.bodyPitch = bl(0, -0.14);
                T.headPitch = 0.1;
                T.armLRoll = 0.12; T.armLPitch = 0.2;
                T.mouthOpen = 0.4;
                break;
            case 'heart':
                T.armLRoll = bl(0.16, 2.75);
                T.armRRoll = bl(0.16, 2.75);
                T.armLPitch = bl(0, -0.45);
                T.armRPitch = bl(0, -0.45);
                T.armLYaw = bl(0, 0.7); T.armRYaw = bl(0, -0.7);
                T.armLScale = bl(1, 0.85); T.armRScale = bl(1, 0.85);
                this._danceBob = (Math.sin(ph * 4) * 0.5 + 0.5) * this.r * 0.1 * fade;
                T.headPitch = -0.08;
                T.mouthOpen = 0.6;
                break;
            default: break;
        }
    }

    _applySquash(T, squash, airborne) {
        // bean.squash ~1: <1 squashed wider/shorter, >1 taller/thinner.
        let sy = squash;
        let sxz = 1 / Math.sqrt(Math.max(0.0001, squash));   // preserve volume
        if (airborne) { sy *= 1.03; sxz *= 0.985; }
        T.sy *= sy; T.sx *= sxz; T.sz *= sxz;
    }

    /* ---- commit pose to the scene graph ------------------------- */
    _commit(bean, dt, t, st) {
        const r = this.r, P = this.pose;

        // --- tumble (ragdoll / falling): multi-axis spin --------------
        if (st.ragdoll > 0 || st.falling) {
            const s = bean.spin || 0;
            this.tumble.rotation.set(s * 1.0, s * 0.6, s * 0.8);
        } else {
            const e = this.tumble.rotation, a = Math.min(1, 12 * dt);
            e.x += (0 - e.x) * a; e.y += (0 - e.y) * a; e.z += (0 - e.z) * a;
        }

        // --- body lean / dive pitch + roll ---------------------------
        this.lean.rotation.x = P.bodyPitch;
        this.lean.rotation.z = P.bodyRoll;

        // --- spin-emote extra yaw (eased), on top of facing yaw -------
        this._spinExtra += ((this._spinExtraTarget || 0) - this._spinExtra) * Math.min(1, 10 * dt);
        if (Math.abs(this._spinExtra) > 1e-4) this.root.rotation.y += this._spinExtra;

        // --- vertical bob (breathe / run / crouch / leap) ------------
        let bobY = (this._breatheBob || 0) + (this._runBob || 0) + (this._danceBob || 0);
        bobY -= (P.crouch || 0) * r * 0.45;
        bobY += (P.lift || 0);
        this.bob.position.y = bobY;
        this._breatheBob *= 0.6; this._runBob *= 0.5; this._danceBob *= 0.5;

        // --- body squash / stretch about the foot line ---------------
        this.bodyScale.scale.set(P.sx, P.sy, P.sz);

        // --- head ----------------------------------------------------
        this.headPivot.rotation.set(P.headPitch, P.headYaw, P.headRoll);

        // --- arms ----------------------------------------------------
        // roll (Z) raises out to the side, pitch (X) swings fwd(+Z)/back,
        // yaw (Y) twists. Left arm is on +X, mirror the roll sign.
        const aL = this.armL.pivot, aR = this.armR.pivot;
        aL.rotation.set(P.armLPitch, P.armLYaw, +P.armLRoll);
        aR.rotation.set(P.armRPitch, P.armRYaw, -P.armRRoll);
        aL.scale.y = P.armLScale;
        aR.scale.y = P.armRScale;

        // --- legs ----------------------------------------------------
        const tuck = P.legTuck || 0;
        const lL = this.legL.pivot, lR = this.legR.pivot;
        lL.rotation.set(P.legLPitch, 0, +P.legSplay);
        lR.rotation.set(P.legRPitch, 0, -P.legSplay);
        // tuck raises the hip pivots so feet lift toward the body
        lL.position.y = this.hipY + tuck * r * 0.3;
        lR.position.y = this.hipY + tuck * r * 0.3;

        // --- eyes: blink + pupil tracking; mouth open ----------------
        for (const e of this.eyes) {
            e.group.scale.y = Math.max(0.08, P.eyeOpen);
            e.pupil.position.x = P.lookX * r * 0.09;
            e.pupil.position.y = P.lookY * r * 0.06;
        }
        if (this.mouth) this.mouth.scale.y = 1 + (P.mouthOpen || 0) * 1.6;

        // --- prop flourishes -----------------------------------------
        if (this._tail) this._tail.rotation.z = Math.sin(t * 4) * 0.2;
        if (this._rocketFlames) {
            const flick = 0.7 + Math.sin(t * 30) * 0.3;
            for (let i = 0; i < this._rocketFlames.length; i++) {
                const f = this._rocketFlames[i];
                f.scale.y = flick + (i & 1 ? 0.1 : 0);
                if (f.material) f.material.opacity = 0.7 + Math.sin(t * 24 + i) * 0.2;
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
        if (this._patternTex && this._patternTex.dispose) this._patternTex.dispose();
        this._disposables = [];
        this._materials = {};
        this._patternTex = null;
    }
}

// Available without modules (browser global / Node global) without `export`.
// In the game this file is concatenated/loaded so the bare class declaration
// suffices; this guard just helps the self-test eval.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BeanView;
}
