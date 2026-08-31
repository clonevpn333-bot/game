'use strict';
/**
 * Prism Runner — WebGL1 endless runner.
 *
 * Exists to keep the middle rung of the renderer ladder honest (§1.3): it runs
 * on WebGL1, uses ANGLE_instanced_arrays when the device has it and falls back
 * to per-object draw calls when it does not, so the fallback path is exercised
 * by a shipping title rather than only by a test.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown, Pool = PE.Pool;
    const LANES = [-2.2, 0, 2.2];
    const MAX_INSTANCES = 96;

    const state = {
        mode: 'title', dist: 0, best: 0, gems: 0, speed: 14, lane: 1,
        y: 0, vy: 0, grounded: true, spawnZ: 40, shake: 0, dead: 0,
    };

    const obstacles = new Pool(48, () => ({ x: 0, y: 0, z: 0, w: 1, h: 1, gem: false }));

    let canvas, gl, prog, scaler, loop, ext = null, instanced = false;
    let cubeVbo, cubeIbo, instBuf;
    let uViewProj, uTint, aPos, aNorm, aOff, aScale, aColor, uOffset, uScale, uColor;
    const instData = new Float32Array(MAX_INSTANCES * 9);   // offset3, scale3, color3

    // ------------------------------------------------------------------ math
    const proj = new Float32Array(16), view = new Float32Array(16), vp = new Float32Array(16);

    function perspective(m, fovy, aspect, near, far) {
        const f = 1 / Math.tan(fovy / 2);
        m.fill(0);
        m[0] = f / aspect; m[5] = f; m[11] = -1;
        m[10] = (far + near) / (near - far);
        m[14] = (2 * far * near) / (near - far);
    }

    /** Camera sits behind and above the runner, looking down +Z. */
    function lookForward(m, ex, ey, ez, pitch) {
        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        const rx = -1, ry = 0, rz = 0;
        const ux = 0, uy = cp, uz = sp;
        const fx = 0, fy = -sp, fz = cp;
        m[0] = rx; m[4] = ry; m[8] = rz; m[12] = -(rx * ex + ry * ey + rz * ez);
        m[1] = ux; m[5] = uy; m[9] = uz; m[13] = -(ux * ex + uy * ey + uz * ez);
        m[2] = -fx; m[6] = -fy; m[10] = -fz; m[14] = (fx * ex + fy * ey + fz * ez);
        m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
    }

    function multiply(out, a, b) {
        for (let c = 0; c < 4; c++) {
            const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
            out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
            out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
            out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
            out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
        }
    }

    // ---------------------------------------------------------------- shaders
    function source(useInstancing) {
        const vs =
            'precision mediump float;\n' +
            'attribute vec3 aPos;\n attribute vec3 aNorm;\n' +
            (useInstancing
                ? 'attribute vec3 aOff;\n attribute vec3 aScale;\n attribute vec3 aColor;\n'
                : 'uniform vec3 uOffset;\n uniform vec3 uScaleV;\n uniform vec3 uColorV;\n') +
            'uniform mat4 uViewProj;\n varying vec3 vColor;\n varying float vFog;\n' +
            'void main() {\n' +
            (useInstancing ? '  vec3 off = aOff; vec3 scl = aScale; vec3 col = aColor;\n'
                           : '  vec3 off = uOffset; vec3 scl = uScaleV; vec3 col = uColorV;\n') +
            '  vec3 world = aPos * scl + off;\n' +
            '  vec4 clip = uViewProj * vec4(world, 1.0);\n' +
            '  gl_Position = clip;\n' +
            // Cheap directional shade; no lights, no normals matrix.
            '  float lambert = 0.55 + 0.45 * max(dot(normalize(aNorm), normalize(vec3(0.4, 0.9, -0.3))), 0.0);\n' +
            '  vColor = col * lambert;\n' +
            '  vFog = clamp((clip.w - 34.0) / 26.0, 0.0, 1.0);\n' +
            '}';
        const fs =
            'precision mediump float;\n varying vec3 vColor;\n varying float vFog;\n uniform vec3 uTint;\n' +
            'void main() { gl_FragColor = vec4(mix(vColor * uTint, vec3(0.07, 0.09, 0.16), vFog), 1.0); }';
        return { vs, fs };
    }

    function build(useInstancing) {
        const src = source(useInstancing);
        const v = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(v, src.vs); gl.compileShader(v);
        if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) throw new Error('vs: ' + gl.getShaderInfoLog(v));
        const f = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(f, src.fs); gl.compileShader(f);
        if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) throw new Error('fs: ' + gl.getShaderInfoLog(f));
        const p = gl.createProgram();
        gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
        gl.deleteShader(v); gl.deleteShader(f);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
        return p;
    }

    // ------------------------------------------------------------------ mesh
    function cube() {
        // 24 vertices so each face gets its own normal.
        const p = [], n = [], idx = [];
        const faces = [
            [[0, 0, 1], [-1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1]],
            [[0, 0, -1], [1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1]],
            [[1, 0, 0], [1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1]],
            [[-1, 0, 0], [-1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1]],
            [[0, 1, 0], [-1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1]],
            [[0, -1, 0], [-1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1]],
        ];
        let base = 0;
        for (const [normal, verts] of faces) {
            for (let i = 0; i < 4; i++) {
                p.push(verts[i * 3] * 0.5, verts[i * 3 + 1] * 0.5, verts[i * 3 + 2] * 0.5);
                n.push(normal[0], normal[1], normal[2]);
            }
            idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
            base += 4;
        }
        const interleaved = new Float32Array(p.length * 2);
        for (let i = 0; i < p.length / 3; i++) {
            interleaved[i * 6] = p[i * 3]; interleaved[i * 6 + 1] = p[i * 3 + 1]; interleaved[i * 6 + 2] = p[i * 3 + 2];
            interleaved[i * 6 + 3] = n[i * 3]; interleaved[i * 6 + 4] = n[i * 3 + 1]; interleaved[i * 6 + 5] = n[i * 3 + 2];
        }
        return { verts: interleaved, indices: new Uint16Array(idx) };
    }

    // ------------------------------------------------------------------ game
    const keys = Object.create(null);

    function reset() {
        obstacles.releaseAll();
        state.dist = 0; state.gems = 0; state.speed = 14; state.lane = 1;
        state.y = 0; state.vy = 0; state.grounded = true; state.spawnZ = 40; state.dead = 0;
        state.mode = 'playing';
    }

    function spawnRow(z) {
        const gap = (Math.random() * 3) | 0;
        for (let i = 0; i < 3; i++) {
            if (i === gap) {
                if (Math.random() < 0.35) {
                    const g = obstacles.acquire();
                    if (g) { g.x = LANES[i]; g.y = 0.9; g.z = z; g.w = 0.5; g.h = 0.5; g.gem = true; }
                }
                continue;
            }
            if (Math.random() < 0.72) {
                const o = obstacles.acquire();
                if (o) { o.x = LANES[i]; o.y = 0.6; o.z = z; o.w = 1.6; o.h = 1.2; o.gem = false; }
            }
        }
    }

    function step(dt) {
        if (state.mode !== 'playing') { state.shake *= 0.9; return; }

        state.speed = Math.min(34, state.speed + dt * 0.55);
        state.dist += state.speed * dt;
        state.shake *= 0.88;

        if (keys.KeyA && !keys._a) { state.lane = Math.max(0, state.lane - 1); }
        if (keys.KeyD && !keys._d) { state.lane = Math.min(2, state.lane + 1); }
        keys._a = keys.KeyA; keys._d = keys.KeyD;

        if ((keys.Space || keys.KeyW) && state.grounded) { state.vy = 7.4; state.grounded = false; }
        state.vy -= 22 * dt;
        state.y += state.vy * dt;
        if (state.y <= 0) { state.y = 0; state.vy = 0; state.grounded = true; }

        while (state.spawnZ < state.dist + 90) {
            spawnRow(state.spawnZ);
            state.spawnZ += 7 + Math.random() * 4;
        }

        const px = LANES[state.lane];
        obstacles.update(function (o) {
            const rel = o.z - state.dist;
            if (rel < -6) return false;
            if (rel > -1.2 && rel < 1.2 && Math.abs(o.x - px) < 1.1) {
                if (o.gem) {
                    if (Math.abs(state.y + 0.5 - o.y) < 1.1) { state.gems++; return false; }
                } else if (state.y < o.h) {
                    hit();
                    return false;
                }
            }
            return true;
        }, dt);
    }

    function hit() {
        state.shake = 1;
        state.mode = 'dead';
        state.dead = performance.now();
        const score = Math.floor(state.dist) + state.gems * 50;
        if (score > state.best) state.best = score;
        Bridge.score(score, 'run');
        Bridge.save({ v: 1, best: state.best });
    }

    // ---------------------------------------------------------------- render
    function render(alpha, dt) {
        const w = canvas.width, h = canvas.height;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.07, 0.09, 0.16, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const shakeX = state.shake * (Math.random() - 0.5) * 0.5;
        perspective(proj, 1.15, w / Math.max(1, h), 0.1, 60);
        lookForward(view, LANES[state.lane] * 0.35 + shakeX, 3.4 + state.y * 0.3, -6.8, 0.235);
        multiply(vp, proj, view);

        gl.useProgram(prog);
        gl.uniformMatrix4fv(uViewProj, false, vp);
        gl.uniform3f(uTint, 1, 1, 1);

        let n = 0;
        // Ground: a run of slabs recycled around the player, so the track is
        // "infinite" without ever allocating.
        const seg = Math.floor(state.dist / 6);
        for (let i = -1; i < 9 && n < MAX_INSTANCES; i++, n++) {
            const z = (seg + i) * 6 - state.dist;
            push(n, 0, -0.62, z, 8.4, 0.5, 5.6, (seg + i) % 2 ? 0.22 : 0.29, 0.26, 0.40);
        }
        for (let i = 0; i < obstacles.size && n < MAX_INSTANCES; i++, n++) {
            const o = obstacles.at(i);
            const z = o.z - state.dist;
            if (o.gem) push(n, o.x, o.y + Math.sin(state.dist * 2 + o.z) * 0.12, z, o.w, o.w, o.w, 0.35, 0.82, 0.63);
            else push(n, o.x, o.y, z, o.w, o.h, o.w, 0.85, 0.35, 0.33);
        }
        if (n < MAX_INSTANCES) {
            push(n, LANES[state.lane], state.y + 0.45, 0, 0.8, 0.9, 0.8, 0.95, 0.85, 0.4);
            n++;
        }

        drawInstances(n);
        scaler.sample(dt * 1000, performance.now());
        drawHud();
    }

    function push(i, x, y, z, sx, sy, sz, r, g, b) {
        const o = i * 9;
        instData[o] = x; instData[o + 1] = y; instData[o + 2] = z;
        instData[o + 3] = sx; instData[o + 4] = sy; instData[o + 5] = sz;
        instData[o + 6] = r; instData[o + 7] = g; instData[o + 8] = b;
    }

    function drawInstances(count) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVbo);
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(aNorm);
        gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 24, 12);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIbo);

        if (instanced) {
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, instData.subarray(0, count * 9));
            bindInstanceAttrib(aOff, 3, 0);
            bindInstanceAttrib(aScale, 3, 12);
            bindInstanceAttrib(aColor, 3, 24);
            ext.drawElementsInstancedANGLE(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0, count);
            disableInstanceAttrib(aOff); disableInstanceAttrib(aScale); disableInstanceAttrib(aColor);
        } else {
            // Fallback: one draw call per object. Bounded by MAX_INSTANCES, so
            // the worst case is ~96 calls — fine even on a weak driver.
            for (let i = 0; i < count; i++) {
                const o = i * 9;
                gl.uniform3f(uOffset, instData[o], instData[o + 1], instData[o + 2]);
                gl.uniform3f(uScale, instData[o + 3], instData[o + 4], instData[o + 5]);
                gl.uniform3f(uColor, instData[o + 6], instData[o + 7], instData[o + 8]);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    function bindInstanceAttrib(loc, size, offset) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 36, offset);
        ext.vertexAttribDivisorANGLE(loc, 1);
    }
    function disableInstanceAttrib(loc) {
        ext.vertexAttribDivisorANGLE(loc, 0);
        gl.disableVertexAttribArray(loc);
    }

    // ------------------------------------------------------------------- hud
    let hudEl, titleEl;
    function drawHud() {
        hudEl.textContent = `${Math.floor(state.dist)} m · ${state.gems} ◆ · best ${state.best}` +
            (instanced ? '' : ' · instancing off');
        titleEl.style.display = state.mode === 'playing' ? 'none' : 'flex';
        if (state.mode !== 'playing') {
            titleEl.firstElementChild.textContent = state.mode === 'dead' ? 'WRECKED' : 'PRISM RUNNER';
            titleEl.lastElementChild.textContent = state.mode === 'dead'
                ? `${Math.floor(state.dist)} m · ${state.gems} gems — press ENTER`
                : 'A/D lanes · SPACE jump — press ENTER';
        }
    }

    // ------------------------------------------------------------------ boot
    function boot(hello) {
        canvas = document.getElementById('gl');
        hudEl = document.getElementById('hud');
        titleEl = document.getElementById('title');
        const bootEl = document.getElementById('boot');

        const attrs = { alpha: false, antialias: false, depth: true, powerPreference: 'low-power' };
        gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
        if (!gl) {
            bootEl.textContent = 'WebGL unavailable on this device.';
            Bridge.post('game:error', { message: 'WebGL1 unavailable', stack: '' });
            return;
        }
        Teardown.trackContext(gl);
        bootEl.remove();

        ext = gl.getExtension('ANGLE_instanced_arrays');
        instanced = !!ext;
        prog = build(instanced);

        aPos = gl.getAttribLocation(prog, 'aPos');
        aNorm = gl.getAttribLocation(prog, 'aNorm');
        uViewProj = gl.getUniformLocation(prog, 'uViewProj');
        uTint = gl.getUniformLocation(prog, 'uTint');
        if (instanced) {
            aOff = gl.getAttribLocation(prog, 'aOff');
            aScale = gl.getAttribLocation(prog, 'aScale');
            aColor = gl.getAttribLocation(prog, 'aColor');
        } else {
            uOffset = gl.getUniformLocation(prog, 'uOffset');
            uScale = gl.getUniformLocation(prog, 'uScaleV');
            uColor = gl.getUniformLocation(prog, 'uColorV');
        }

        const geo = cube();
        cubeVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVbo);
        gl.bufferData(gl.ARRAY_BUFFER, geo.verts, gl.STATIC_DRAW);
        cubeIbo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIbo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);
        if (instanced) {
            instBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, instBuf);
            gl.bufferData(gl.ARRAY_BUFFER, instData.byteLength, gl.DYNAMIC_DRAW);
        }
        Teardown.onDestroy(function () {
            gl.deleteBuffer(cubeVbo); gl.deleteBuffer(cubeIbo);
            if (instBuf) gl.deleteBuffer(instBuf);
            gl.deleteProgram(prog);
        });

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        if (hello && hello.save && hello.save.v === 1) state.best = hello.save.best | 0;

        scaler = new PE.ResolutionScaler(canvas, {
            targetFps: 60, maxDpr: 1,
            initialScale: PE.ResolutionScaler.suggestInitialScale(),
        });
        Teardown.on(window, 'resize', () => scaler.applyResize());

        Teardown.on(window, 'keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Enter' && state.mode !== 'playing') reset();
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        });
        Teardown.on(window, 'keyup', (e) => { keys[e.code] = false; });
        Teardown.on(canvas, 'pointerdown', () => { if (state.mode !== 'playing') reset(); });

        loop = new PE.Loop({
            hz: 60, step, render,
            onStats: (s) => Bridge.stats({
                fps: s.fps, frameMs: s.frameMs, scale: scaler.scale(),
                heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
                entities: obstacles.size,
            }),
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();
        Bridge.ready({ tier: 'webgl1', pointerLock: false });
    }

    Bridge.connect({
        id: 'prism-runner',
        onHello: boot,
        onPause: () => loop && loop.pause(),
        onResume: () => loop && loop.resume(),
        onLowMemory: () => Bridge.flush(),
        onSettings: (s) => {
            if (!scaler) return;
            if (s && typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { Bridge.save({ v: 1, best: state.best }); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
