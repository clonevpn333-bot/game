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
            COLORS, PATTERNS, FACEPLATES, COSTUMES_UPPER, COSTUMES_LOWER, EMOTES, ACHIEVEMENTS, SHOW,
        }, {
            onPlay: () => Game.startShow(),
            onCustomize: () => { Game.screen = 'customize'; },
            onHowTo: () => { Game.screen = 'howto'; },
            onTrophies: () => { Game.screen = 'trophies'; },
            onMenu: () => Game.toMenu(),
            onCycle: (slot, dir) => Game.cycleCosmetic(slot, dir),
            onEmoteCycle: (i, dir) => Game.cycleEmote(i, dir),
            getSave: () => Save.data,
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
        if (Game.screen === 'customize') this._updatePreview(dt, this._t);

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
                case 'menu': UI.showMenu(); break;
                case 'customize': UI.showCustomize(); this._mountPreview(); break;
                case 'howto': UI.showHowTo(); break;
                case 'trophies': UI.showTrophies(); break;
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
        // spectate: once you're out, the camera follows a surviving bean
        const p = this._playerBean;
        const playerActive = p && p.alive && !p.gone && !p.exited && !p.falling;
        const subject = playerActive ? p : (this._spectateTarget(round) || p);
        this._spectating = !playerActive;
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

        this._updateFx(round);
        this._camera(round, dt, subject);
        this._hud(round);
    },

    _spectateTarget(round) {
        const ok = b => b && b.alive && !b.gone && !b.exited && !b.falling;
        if (ok(this._specBean)) return this._specBean;
        const cands = round.beans.filter(ok);
        this._specBean = cands.length ? U.pick(cands) : null;
        return this._specBean;
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
        const p = subject || round.player;
        let pos, look;
        if (round.kind === 'race') {
            // 3rd-person chase: centred on the player, behind (+Z) and above,
            // looking ahead down the course (-Z).
            pos  = new THREE.Vector3(p.x, p.z + 250, p.y + 380);
            look = new THREE.Vector3(p.x, p.z + 60,  p.y - 190);
        } else {
            const arena = !!(round.platform && round.platform.r);
            const cx = arena ? round.platform.cx : (round.minX + round.maxX) / 2;
            const cy = arena ? round.platform.cy : (round.minY + round.maxY) / 2;
            const r  = arena ? round.platform.r : 360;
            // keep the arena framed but drift toward the player so you can find your bean
            const fx = U.lerp(cx, p.x, 0.35);
            pos  = new THREE.Vector3(fx, r * 1.55 + 150, cy + r * 1.45);
            look = new THREE.Vector3(fx, 25, U.lerp(cy, p.y, 0.4));
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
            sc.add(hemi); sc.add(dir);
            const cam = new THREE.PerspectiveCamera(45, 1, 1, 1000);
            cam.position.set(0, 34, 110); cam.lookAt(0, 22, 0);
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

window.addEventListener('load', () => Engine.start());
