'use strict';

/* =====================================================================
   engine.js — Three.js core. Owns renderer/scene/camera/lights, builds
   the 3D scene for each round from the (headless) sim, drives every view
   each frame, runs the camera, in-world FX, the DOM UI and the live
   customise preview.  THREE is imported once by the host module.
   ===================================================================== */

const Engine = {
    MAXFX: 500,

    start() {
        const host = document.getElementById('app');
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        // renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);
        this.renderer = renderer;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 8000);
        this.camera.position.set(0, 400, 600);
        this.env = setupEnvironment(this.scene);

        // persistent FX points
        this.fxGeo = new THREE.BufferGeometry();
        this.fxPos = new Float32Array(this.MAXFX * 3);
        this.fxCol = new Float32Array(this.MAXFX * 3);
        this.fxGeo.setAttribute('position', new THREE.BufferAttribute(this.fxPos, 3));
        this.fxGeo.setAttribute('color', new THREE.BufferAttribute(this.fxCol, 3));
        this.fxPoints = new THREE.Points(this.fxGeo,
            new THREE.PointsMaterial({ size: 11, vertexColors: true, sizeAttenuation: true }));
        this.fxPoints.frustumCulled = false;
        this.scene.add(this.fxPoints);

        this.roundGroup = null;
        this.beanViews = new Map();
        this.obViews = [];
        this.courseView = null;
        this._lastRound = null;
        this._lastScreen = null;
        this._lastPhase = null;
        this._camPos = new THREE.Vector3(0, 600, 800);
        this._camLook = new THREE.Vector3();
        this._tmpC = new THREE.Color();

        // input + sim + ui
        Input.init(renderer.domElement);
        Game.init();
        UI.mount(host, {
            COLORS, PATTERNS, FACEPLATES, COSTUMES_UPPER, COSTUMES_LOWER, EMOTES, ACHIEVEMENTS, SHOW, FALL_PASS, FRUITS,
        }, {
            onPlay: () => Game.startShow(),
            onCustomize: () => { Game.screen = 'customize'; },
            onHowTo: () => { Game.screen = 'howto'; },
            onTrophies: () => { Game.screen = 'trophies'; },
            onFallPass: () => Game.toFallPass(),
            onMenu: () => Game.toMenu(),
            onShop: () => Game.toShop(),
            onShopBuy: (slot, idx) => Game.shopSelect(slot, idx),
            onShopReroll: () => Game.rerollShop(),
            onPassClaim: (tier) => Game.claimPassTier(tier),
            onCycle: (slot, dir) => Game.cycleCosmetic(slot, dir),
            onEmoteCycle: (i, dir) => Game.cycleEmote(i, dir),
            getSave: () => Save.data,
            getThumb: (slot, idx) => this.thumb(slot, idx),
            getShopRotation: () => Save.shopRotation(),
            getNextRotationMs: () => Save.nextRotationMs(),
            getPassProgress: () => Save.passProgress(),
            getPass: () => { let c = 0; for (const t of FALL_PASS) if (Save.canClaim(t.tier)) c++; return { claimable: c, tier: Save.passTierReached() }; },
        });

        window.addEventListener('resize', () => this._resize());
        this._clock = performance.now();
        this._t = 0;
        requestAnimationFrame(ts => this._loop(ts));
    },

    _resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.preview) {
            const box = UI.previewContainer();
            if (box) { this.preview.renderer.setSize(box.clientWidth, box.clientHeight, false);
                this.preview.camera.aspect = box.clientWidth / Math.max(1, box.clientHeight);
                this.preview.camera.updateProjectionMatrix(); }
        }
    },

    _loop(ts) {
        let dt = (ts - this._clock) / 1000; this._clock = ts;
        dt = Math.min(dt, 0.05); this._t += dt;

        Game.update(dt);
        this._syncScreen();
        if (Game.screen === 'playing') this._updatePlaying(dt, this._t);
        if (Game.screen === 'customize' || Game.screen === 'menu') this._updatePreview(dt, this._t);
        if (Game.screen === 'shop') UI.tickShop();

        // achievement toasts
        while (Save.newlyUnlocked.length) UI.toast(Save.newlyUnlocked.shift());

        this.env && this.env.update && this.env.update(dt, this._t);
        this.renderer.render(this.scene, this.camera);
        Input.flush();
        requestAnimationFrame(t2 => this._loop(t2));
    },

    // ---- screen / round transitions ----------------------------------
    _syncScreen() {
        // Build the 3D scene as soon as a round exists (during 'loading' too,
        // so it's ready the instant the loading screen clears).
        const round = Game.show && Game.show.round;
        if (round && round !== this._lastRound) { this._buildRound(round); this._lastRound = round; }
        else if (!round && this._lastRound) { this._teardownRound(); this._lastRound = null; }

        if (Game.screen !== this._lastScreen) {
            this._lastScreen = Game.screen;
            switch (Game.screen) {
                case 'menu': UI.showMenu(); this._mountPreview(); break;
                case 'customize': UI.showCustomize(); this._mountPreview(); break;
                case 'howto': UI.showHowTo(); break;
                case 'trophies': UI.showTrophies(); break;
                case 'shop': UI.showShop(); break;
                case 'fallpass': UI.showFallPass(); break;
                case 'loading': UI.showLoading(Game.loadingInfo); break;
                case 'eliminated': UI.showEliminated(Game.info); break;
                case 'victory': UI.showVictory(Game.info); break;
                case 'playing': this._lastPhase = null; break;
            }
        }
        // Esc returns to menu from play
        if (Game.screen === 'playing' && Input.esc) Game.toMenu();
    },

    _buildRound(round) {
        this._teardownRound();
        const g = new THREE.Group();
        this.courseView = new CourseView(round);
        g.add(this.courseView.object3d);

        this.obViews = [];
        const allOb = round.obstacles.concat(round.tiles || []);
        for (const ob of allOb) {
            const v = makeObstacleView(ob);
            this.obViews.push({ ob, v });
            g.add(v.object3d);
        }
        this.beanViews = new Map();
        for (const b of round.beans) {
            const bv = new BeanView(b.appearance);
            this.beanViews.set(b, bv);
            g.add(bv.object3d);
        }
        // floating arrow so you can always find your bean
        this._marker = new THREE.Mesh(
            new THREE.ConeGeometry(13, 24, 6),
            new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb000, emissiveIntensity: 0.6, roughness: 0.4 }));
        this._marker.rotation.x = Math.PI;        // point down
        g.add(this._marker);
        this._playerBean = round.player;
        this.scene.add(g);
        this.roundGroup = g;
        this._lastPhase = null;
        this._camSnap = true;          // snap camera to the new round's framing
        this._specBean = null;         // reset spectate target
    },

    _teardownRound() {
        if (this.roundGroup) { this.scene.remove(this.roundGroup); }
        if (this.courseView) this.courseView.dispose && this.courseView.dispose();
        for (const { v } of this.obViews) v.dispose && v.dispose();
        for (const bv of this.beanViews.values()) bv.dispose && bv.dispose();
        this.roundGroup = null; this.courseView = null; this.obViews = []; this.beanViews = new Map();
    },

    // ---- per-frame play update ---------------------------------------
    _updatePlaying(dt, t) {
        const round = Game.show.round;
        // beans (qualified=exited and eliminated=gone beans vanish)
        for (const b of round.beans) {
            const bv = this.beanViews.get(b);
            if (!bv) continue;
            if (b.gone || b.exited) { bv.object3d.visible = false; continue; }
            bv.object3d.visible = true;
            bv.update(b, dt, t);
        }
        // spectate: once you're out, follow a surviving bean — and let the
        // player switch between beans with ← / → (A/D, J/L, Space).
        const p = this._playerBean;
        const playerActive = p && p.alive && !p.gone && !p.exited && !p.falling;
        this._spectating = !playerActive;
        let subject;
        if (playerActive) { subject = p; this._specBean = null; }
        else {
            if (Input.specNext) this._cycleSpectate(round, 1);
            else if (Input.specPrev) this._cycleSpectate(round, -1);
            subject = this._spectateTarget(round) || p;
        }
        // gold marker hovers over YOUR bean only while you're still in it
        if (this._marker) {
            this._marker.visible = playerActive;
            if (playerActive) {
                this._marker.position.set(p.x, p.z + 64 + Math.sin(t * 4) * 5, p.y);
                this._marker.rotation.y = t * 2;
            }
        }
        // obstacles + tiles
        for (const { ob, v } of this.obViews) v.update(ob, dt, t);
        this.courseView && this.courseView.update(round, dt, t);

        this._updateTails(round, t);
        this._updateClimbSlime(round, t);
        this._updateFx(round);
        this._camera(round, dt, subject);
        this._hud(round);
    },

    // floating colour-coded halo + streamer over beans that hold a tail (Tail Tag)
    _updateTails(round, t) {
        if (!this._tailPool) this._tailPool = [];
        let idx = 0;
        if (round.kind === 'tag') {
            for (const b of round.beans) {
                if (b.gone || b.exited || b.falling || !b.hasTail) continue;
                let g = this._tailPool[idx];
                if (!g) {
                    g = new THREE.Group();
                    const ringMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.4 });
                    const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 4, 8, 22), ringMat);
                    ring.rotation.x = Math.PI / 2; ring.name = 'ring';
                    const tailMat = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.5 });
                    const tail = new THREE.Mesh(new THREE.ConeGeometry(7, 34, 10), tailMat);
                    tail.name = 'tail';
                    g.add(ring); g.add(tail);
                    this.scene.add(g); this._tailPool[idx] = g;
                }
                g.visible = true;
                const c = new THREE.Color(b.tailColor || '#ff5fa2');
                const ring = g.getObjectByName('ring'), tail = g.getObjectByName('tail');
                ring.material.color.copy(c); ring.material.emissive.copy(c);
                tail.material.color.copy(c); tail.material.emissive.copy(c);
                ring.position.set(b.x, b.z + 74 + Math.sin(t * 4 + b.x) * 3, b.y);
                ring.rotation.z = t * 2;
                // a wagging streamer trailing behind the bean's facing
                const back = b.facing + Math.PI, wag = Math.sin(t * 13 + b.y) * 0.35;
                tail.position.set(b.x + Math.cos(back) * 20, b.z + 20, b.y + Math.sin(back) * 20);
                tail.rotation.set(0, -back, Math.PI / 2 + wag);
                idx++;
            }
        }
        for (let i = idx; i < this._tailPool.length; i++) this._tailPool[i].visible = false;
    },

    // Slime Climb: a glossy pink slab of slime that creeps up the course
    _updateClimbSlime(round, t) {
        if (round.kind !== 'climb' || round.slimeY == null) {
            if (this._climbSlime) this._climbSlime.visible = false;
            return;
        }
        if (!this._climbSlime) {
            const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0xd23bb0, emissive: 0x9c1f86,
                emissiveIntensity: 0.4, transparent: true, opacity: 0.86, roughness: 0.3, metalness: 0.1 });
            const m = new THREE.Mesh(geo, mat);
            m.rotation.x = -Math.PI / 2;                 // lie flat (top surface)
            this._climbSlime = m; this.scene.add(m);
        }
        const m = this._climbSlime; m.visible = true;
        const yTop = round.slimeY, yBot = round.maxY + 400;
        const cx = (round.minX + round.maxX) / 2, w = (round.maxX - round.minX) + 240;
        const len = Math.max(10, yBot - yTop), cy = (yTop + yBot) / 2;
        m.position.set(cx, 6 + Math.sin(t * 2) * 1.5, cy);
        m.scale.set(w, len, 1);
        // gentle surface shimmer
        m.material.emissiveIntensity = 0.34 + Math.sin(t * 3) * 0.08;
    },

    _spectateTarget(round) {
        const ok = b => b && b.alive && !b.gone && !b.exited && !b.falling;
        if (ok(this._specBean)) return this._specBean;
        const cands = round.beans.filter(ok);
        this._specBean = cands.length ? cands[0] : null;
        return this._specBean;
    },
    _cycleSpectate(round, dir) {
        const ok = b => b && b.alive && !b.gone && !b.exited && !b.falling;
        const cands = round.beans.filter(ok);
        if (!cands.length) { this._specBean = null; return; }
        let i = cands.indexOf(this._specBean);
        if (i < 0) i = 0; else i = (i + dir + cands.length) % cands.length;
        this._specBean = cands[i];
    },

    _updateFx(round) {
        const fx = round.fx || [];
        const n = Math.min(fx.length, this.MAXFX);
        for (let i = 0; i < n; i++) {
            const p = fx[i];
            this.fxPos[i * 3] = p.x; this.fxPos[i * 3 + 1] = p.z; this.fxPos[i * 3 + 2] = p.y;
            this._tmpC.set(p.color || '#ffffff');
            this.fxCol[i * 3] = this._tmpC.r; this.fxCol[i * 3 + 1] = this._tmpC.g; this.fxCol[i * 3 + 2] = this._tmpC.b;
        }
        this.fxGeo.setDrawRange(0, n);
        this.fxGeo.attributes.position.needsUpdate = true;
        this.fxGeo.attributes.color.needsUpdate = true;
    },

    // ---- camera -------------------------------------------------------
    _camera(round, dt, subject) {
        // debug/verification override: tests can pin the camera to inspect a
        // whole course or a single section from any angle. Harmless in play.
        if (this._dbgCam) {
            this.camera.position.copy(this._dbgCam.pos);
            this.camera.lookAt(this._dbgCam.look);
            return;
        }
        const p = subject || round.player;
        let pos, look;
        if (round.kind === 'race' || round.kind === 'mountain' || round.kind === 'climb') {
            // 3rd-person chase: close behind and a little above the bean, looking
            // just ahead down the course (close, low — like the real game).
            pos  = new THREE.Vector3(p.x, p.z + 168, p.y + 270);
            look = new THREE.Vector3(p.x, p.z + 46,  p.y - 110);
        } else {
            const arena = !!(round.platform && round.platform.r);
            const cx = arena ? round.platform.cx : (round.minX + round.maxX) / 2;
            const cy = arena ? round.platform.cy : (round.minY + round.maxY) / 2;
            const r  = arena ? round.platform.r : 360;
            // keep the arena framed but drift toward the player so you can find your bean
            const fx = U.lerp(cx, p.x, 0.42);
            pos  = new THREE.Vector3(fx, r * 1.35 + 120, cy + r * 1.28);
            look = new THREE.Vector3(fx, 25, U.lerp(cy, p.y, 0.45));
        }
        if (this._camSnap) { this._camPos.copy(pos); this._camLook.copy(look); this._camSnap = false; }
        else { const k = Math.min(1, dt * 9); this._camPos.lerp(pos, k); this._camLook.lerp(look, k); }
        this.camera.position.copy(this._camPos);
        this.camera.lookAt(this._camLook);
    },

    // ---- HUD / intro / banner ----------------------------------------
    _hud(round) {
        const phase = round.phase;
        if (phase !== this._lastPhase) {
            this._lastPhase = phase;
            if (phase === 'intro') {
                UI.showIntro({ name: round.def.name, category: round.category, tagline: round.def.tagline,
                    qualify: round.def.qualify || null, countdown: null });
            } else if (phase === 'go') {
                UI.showHUD();
            } else if (phase === 'ending') {
                UI.showHUD(); UI.showEndingBanner(round.result);
            }
        }
        if (phase === 'go' || phase === 'ending') {
            UI.updateHUD({
                name: round.def.name, category: round.category, kind: round.kind,
                qualifiedCount: round.qualifiedCount, qualifyCount: round.qualifyCount,
                timer: round.timer, aliveCount: round.aliveSoFar(), place: round.player.place,
                spectating: this._spectating,
                specName: this._spectating && this._specBean ? this._specBean.name : null,
                youHaveTail: round.player.hasTail,
                tailCount: round.beans.filter(b => b.alive && !b.eliminated && b.hasTail).length,
                matchSafe: round.matchSafe, matchPhase: round.matchPhase,
            });
        }
    },

    // ---- customise live 3D preview -----------------------------------
    _mountPreview() {
        const box = UI.previewContainer();
        if (!box) return;
        if (!this.preview) {
            const pr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            pr.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            pr.shadowMap.enabled = true; pr.shadowMap.type = THREE.PCFSoftShadowMap;
            pr.outputColorSpace = THREE.SRGBColorSpace; pr.toneMapping = THREE.ACESFilmicToneMapping;
            const sc = new THREE.Scene();
            const hemi = new THREE.HemisphereLight(0xffffff, 0x556680, 1.0);
            const dir = new THREE.DirectionalLight(0xffffff, 1.6); dir.position.set(60, 120, 90);
            dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024);
            dir.shadow.camera.left = -90; dir.shadow.camera.right = 90;
            dir.shadow.camera.top = 90; dir.shadow.camera.bottom = -90;
            sc.add(hemi); sc.add(dir);
            // a little pedestal so it reads like the Fall Guys lobby
            const ped = new THREE.Mesh(new THREE.CylinderGeometry(34, 42, 16, 40),
                new THREE.MeshStandardMaterial({ color: 0x9a6cff, roughness: 0.5 }));
            ped.position.y = -8; ped.receiveShadow = true; sc.add(ped);
            const pedT = new THREE.Mesh(new THREE.CylinderGeometry(35, 35, 3, 40),
                new THREE.MeshStandardMaterial({ color: 0xff5fa2, roughness: 0.4, metalness: 0.1 }));
            pedT.position.y = 0.5; pedT.receiveShadow = true; sc.add(pedT);
            const cam = new THREE.PerspectiveCamera(45, 1, 1, 1000);
            cam.position.set(0, 30, 118); cam.lookAt(0, 16, 0);
            this.preview = { renderer: pr, scene: sc, camera: cam, bean: null, sig: '', fake: {
                x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: 0, r: 17, grounded: true,
                diveT: 0, proneT: 0, ragdoll: 0, spin: 0, falling: false, squash: 1,
                emoteAnim: null, emoteT: 0, blink: 3, isPlayer: true, name: 'You' } };
        }
        if (this.preview.renderer.domElement.parentElement !== box) {
            box.appendChild(this.preview.renderer.domElement);
        }
        const w = box.clientWidth || 300, h = box.clientHeight || 430;
        this.preview.renderer.setSize(w, h, false);
        this.preview.camera.aspect = w / h; this.preview.camera.updateProjectionMatrix();
    },

    // ---- cosmetic THUMBNAILS (shop / pass / customise item previews) --
    // A tiny offscreen renderer makes a transparent PNG of each item: the bare
    // prop for costumes (no body, as requested), a candy swatch-bean for
    // colours/patterns/faceplates. Cached by slot:idx so each renders once.
    _ensureThumbRig() {
        if (this._thumbR) return true;
        try {
            const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            r.setPixelRatio(1); r.setSize(168, 168);
            r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
            const sc = new THREE.Scene();
            sc.add(new THREE.HemisphereLight(0xffffff, 0x55607a, 1.15));
            const d = new THREE.DirectionalLight(0xffffff, 1.7); d.position.set(40, 90, 70); sc.add(d);
            const d2 = new THREE.DirectionalLight(0xfff0ff, 0.5); d2.position.set(-50, 20, -40); sc.add(d2);
            this._thumbR = r; this._thumbScene = sc;
            this._thumbCam = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);
            this._thumbFake = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, facing: 0.5, r: 17, grounded: true,
                diveT: 0, proneT: 0, ragdoll: 0, spin: 0, falling: false, squash: 1, emoteAnim: null,
                emoteT: 0, blink: 3, isPlayer: false, name: '' };
            return true;
        } catch (e) { this._thumbR = null; return false; }
    },
    thumb(slot, idx) {
        const key = slot + ':' + idx;
        if (!this._thumbCache) this._thumbCache = {};
        if (key in this._thumbCache) return this._thumbCache[key];
        let url = null;
        try { if (this._ensureThumbRig()) url = this._renderThumb(slot, idx); } catch (e) { url = null; }
        this._thumbCache[key] = url;
        return url;
    },
    _renderThumb(slot, idx) {
        const sc = this._thumbScene;
        let bv = null, obj = null;
        try {
            if (slot === 'upper' || slot === 'lower') {
                const arr = slot === 'upper' ? COSTUMES_UPPER : COSTUMES_LOWER;
                const prop = arr[idx] && arr[idx].prop;
                if (!prop || prop === 'none') return null;
                bv = new BeanView({ color: '#e9e9f2', pattern: 'solid',
                    upper: slot === 'upper' ? prop : 'none', lower: slot === 'lower' ? prop : 'none', visor: '#3fd2ff' });
                bv.update(this._thumbFake, 0, 0);
                const grp = slot === 'upper' ? bv.upperGroup : bv.lowerGroup;
                if (!grp) return null;
                obj = new THREE.Group();
                bv.object3d.updateWorldMatrix(true, true);
                grp.updateWorldMatrix(true, false);
                grp.parent && grp.parent.remove(grp);
                grp.matrix.copy(grp.matrixWorld); grp.matrix.decompose(grp.position, grp.quaternion, grp.scale);
                obj.add(grp);
            } else {
                const ap = { color: '#e9e9f2', pattern: 'solid', upper: 'none', lower: 'none', visor: '#3fd2ff' };
                if (slot === 'color') ap.color = COLORS[idx].hex;
                else if (slot === 'pattern') { ap.pattern = PATTERNS[idx].type; ap.color = '#b9c2ff'; }
                else if (slot === 'faceplate') ap.visor = FACEPLATES[idx].visor;
                bv = new BeanView(ap);
                bv.update(this._thumbFake, 0, 0);
                obj = bv.object3d;
            }
            sc.add(obj);
            const url = this._frameThumb(obj, slot);
            sc.remove(obj);
            return url;
        } finally { if (bv) try { bv.dispose(); } catch (e) {} }
    },
    _frameThumb(obj, slot) {
        obj.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(obj);
        if (box.isEmpty()) return null;
        const sph = box.getBoundingSphere(new THREE.Sphere());
        const c = sph.center, rad = Math.max(8, sph.radius);
        const cam = this._thumbCam;
        const pull = (slot === 'upper' || slot === 'lower') ? 2.5 : 2.7;
        cam.position.set(c.x + rad * 0.45, c.y + rad * 0.42, c.z + rad * pull);
        cam.near = Math.max(0.1, rad * 0.05); cam.far = rad * 40;
        cam.lookAt(c); cam.updateProjectionMatrix();
        this._thumbR.render(this._thumbScene, cam);
        return this._thumbR.domElement.toDataURL('image/png');
    },

    _updatePreview(dt, t) {
        const pv = this.preview; if (!pv) return;
        const sig = JSON.stringify(Save.appearance());
        if (sig !== pv.sig) {
            pv.sig = sig;
            if (!pv.bean) { pv.bean = new BeanView(Save.appearance()); pv.scene.add(pv.bean.object3d); }
            else pv.bean.setAppearance(Save.appearance());
        }
        pv.fake.facing = t * 0.7;                 // slowly turn
        pv.fake.blink = (Math.floor(t) % 4 === 0 && t % 1 < 0.12) ? 0.05 : 3;
        pv.bean && pv.bean.update(pv.fake, dt, t);
        pv.renderer.render(pv.scene, pv.camera);
    },
};

// debug handle so headless render tests can drive the game from page scope
try { window.__BR = { Game, Engine, UI, Save, Input, THREE, SHOW, COSTUMES_UPPER, COSTUMES_LOWER, COLORS }; } catch (e) {}

window.addEventListener('load', () => Engine.start());
