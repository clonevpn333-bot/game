'use strict';
/**
 * Voxel Drift — first-person voxel sandbox.
 *
 * The portal's stress case: WebGL2, pointer-lock mouse-look, streaming chunk
 * meshes off the main thread, and a hard memory budget on resident geometry.
 */
(function () {
    const Bridge = PE.Bridge, Teardown = PE.Teardown;
    const M = self.Mesher;
    const CX = M.CX, CY = M.CY, CZ = M.CZ;
    const SEED = 20260831;

    // Numeric chunk keys: 16 bits per axis, so no string allocation per lookup.
    const key = (cx, cz) => ((cx & 0xffff) << 16) | (cz & 0xffff);

    const cfg = {
        renderDistance: 6,          // in chunks, adapted at runtime
        maxRenderDistance: 9,
        minRenderDistance: 4,
        fov: Math.PI / 2.35,
        uploadsPerFrame: 1,         // one VBO upload per frame: no hitch spikes
        meshBudgetMB: 96,
    };

    const player = {
        x: 8, y: 46, z: 8, px: 8, py: 46, pz: 8,
        vx: 0, vy: 0, vz: 0,
        yaw: 0, pitch: 0,
        onGround: false, flying: false,
        reach: 6, block: M.STONE,
    };

    const state = {
        edits: Object.create(null),
        locked: false,
        placed: 0, broken: 0,
        loading: 0,
    };

    const chunks = new Map();      // key -> { cx, cz, voxels, pending }
    const queue = [];              // pending mesh requests, nearest-first
    const inflight = new Map();    // key -> [cx, cz], so a dead worker can be recovered from
    const uploads = [];            // completed meshes waiting for a GL upload

    let canvas, renderer, scaler, loop, workers = [], inFlight = 0, useWorker = true, spawned = false;
    let hud, hint;

    // -------------------------------------------------------------- workers
    function startWorkers(count) {
        const src =
            '(' + self.MESHER_FACTORY.toString() + ')(self);\n' +
            'self.onmessage = function (e) {\n' +
            '  var d = e.data;\n' +
            '  var r = self.Mesher.build(d.cx, d.cz, d.seed, d.edits);\n' +
            '  self.postMessage({ key: d.key, cx: d.cx, cz: d.cz, voxels: r.voxels, verts: r.verts, indices: r.indices },\n' +
            '    [r.voxels.buffer, r.verts.buffer, r.indices.buffer]);\n' +
            '};';
        let url;
        try {
            url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
            Teardown.trackObjectURL(url);
            for (let i = 0; i < count; i++) {
                const w = new Worker(url);
                w.onmessage = onMeshed;
                // A blocked worker fails asynchronously — Content-Security-Policy
                // rejections arrive as an error event, not a constructor throw —
                // so the fallback has to be able to take over mid-flight.
                w.onerror = dropWorkers;
                workers.push(w);
            }
            Teardown.onDestroy(() => { for (const w of workers) w.terminate(); workers.length = 0; });
        } catch {
            // No Worker or no blob: URL (rare, but some managed profiles block
            // it). Meshing then runs inline, which costs frame time but works.
            dropWorkers();
        }
    }

    /**
     * Give up on workers and put everything that was in flight back on the
     * queue. Without the requeue, the chunks handed to a worker that never
     * answers stay pending forever and the world stops streaming.
     */
    function dropWorkers() {
        if (!useWorker && !workers.length) return;
        useWorker = false;
        for (const w of workers) { try { w.terminate(); } catch (e) { /* already dead */ } }
        workers.length = 0;
        inFlight = 0;
        for (const [k, pos] of inflight) queue.push(k, pos[0], pos[1]);
        inflight.clear();
        pumpQueue();
    }

    function editsNear(cx, cz) {
        const out = Object.create(null);
        const x0 = cx * CX - 1, x1 = cx * CX + CX, z0 = cz * CZ - 1, z1 = cz * CZ + CZ;
        for (const k in state.edits) {
            const p = k.split(',');
            const x = +p[0], z = +p[2];
            if (x >= x0 && x <= x1 && z >= z0 && z <= z1) out[k] = state.edits[k];
        }
        return out;
    }

    function requestChunk(cx, cz) {
        const k = key(cx, cz);
        const existing = chunks.get(k);
        if (existing && existing.pending) return;
        chunks.set(k, { cx, cz, voxels: existing ? existing.voxels : null, pending: true });
        queue.push(k, cx, cz);
        state.loading++;
    }

    function pumpQueue() {
        const limit = useWorker ? workers.length : 1;
        while (queue.length && inFlight < limit) {
            const k = queue.shift(), cx = queue.shift(), cz = queue.shift();
            const msg = { key: k, cx, cz, seed: SEED, edits: editsNear(cx, cz) };
            inFlight++;
            if (useWorker && workers.length) {
                inflight.set(k, [cx, cz]);
                workers[inFlight % workers.length].postMessage(msg);
            } else {
                const r = M.build(cx, cz, SEED, msg.edits);
                onMeshed({ data: { key: k, cx, cz, voxels: r.voxels, verts: r.verts, indices: r.indices } });
            }
        }
    }

    function onMeshed(e) {
        inFlight = Math.max(0, inFlight - 1);
        const d = e.data;
        inflight.delete(d.key);
        const rec = chunks.get(d.key);
        if (!rec) return;                     // unloaded while in flight
        rec.voxels = d.voxels;
        rec.pending = false;
        state.loading = Math.max(0, state.loading - 1);
        uploads.push(d);
    }

    // ------------------------------------------------------------ streaming
    function streamChunks() {
        const pcx = Math.floor(player.x / CX), pcz = Math.floor(player.z / CZ);
        const r = cfg.renderDistance;

        for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dz * dz > r * r + r) continue;   // round, not square
                const cx = pcx + dx, cz = pcz + dz;
                const k = key(cx, cz);
                const rec = chunks.get(k);
                if (!rec) requestChunk(cx, cz);
                else if (!rec.pending && !renderer.has(k)) requestChunk(cx, cz);
            }
        }

        // Drop anything well outside the ring; the renderer's LRU handles the
        // rest if memory is still tight.
        const drop = (r + 2) * (r + 2);
        for (const [k, rec] of chunks) {
            const dx = rec.cx - pcx, dz = rec.cz - pcz;
            if (dx * dx + dz * dz > drop) {
                chunks.delete(k);
                renderer.remove(k);
            }
        }
        pumpQueue();
    }

    function flushUploads() {
        for (let i = 0; i < cfg.uploadsPerFrame && uploads.length; i++) {
            const u = uploads.shift();
            if (!chunks.has(u.key)) continue;
            renderer.upload(u.key, u.cx, u.cz, u.verts, u.indices);
        }
    }

    // -------------------------------------------------------------- voxels
    function blockAt(wx, wy, wz) {
        if (wy < 0 || wy >= CY) return M.AIR;
        const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ);
        const rec = chunks.get(key(cx, cz));
        if (!rec || !rec.voxels) return M.AIR;
        const lx = wx - cx * CX, lz = wz - cz * CZ;
        return rec.voxels[M.IDX(lx, wy, lz)];
    }

    const solid = (id) => id !== M.AIR;

    function setBlock(wx, wy, wz, id) {
        if (wy < 1 || wy >= CY - 1) return;
        state.edits[wx + ',' + wy + ',' + wz] = id;
        const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ);
        const rec = chunks.get(key(cx, cz));
        if (rec && rec.voxels) rec.voxels[M.IDX(wx - cx * CX, wy, wz - cz * CZ)] = id;
        requestChunk(cx, cz);
        // A face on the seam changes the neighbour's mesh too.
        const lx = wx - cx * CX, lz = wz - cz * CZ;
        if (lx === 0) requestChunk(cx - 1, cz);
        if (lx === CX - 1) requestChunk(cx + 1, cz);
        if (lz === 0) requestChunk(cx, cz - 1);
        if (lz === CZ - 1) requestChunk(cx, cz + 1);
        persistSoon();
    }

    // DDA voxel raycast; hit and the face-adjacent empty cell are written into
    // this preallocated record rather than returned as a new object.
    const hit = { found: false, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };
    function raycast(maxDist) {
        const dx = Math.sin(player.yaw) * Math.cos(player.pitch);
        const dy = -Math.sin(player.pitch);
        const dz = Math.cos(player.yaw) * Math.cos(player.pitch);
        let x = Math.floor(player.x), y = Math.floor(player.y + 1.62), z = Math.floor(player.z);
        const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
        const EPS = 1e-6;
        const tDx = Math.abs(dx) < EPS ? Infinity : Math.abs(1 / dx);
        const tDy = Math.abs(dy) < EPS ? Infinity : Math.abs(1 / dy);
        const tDz = Math.abs(dz) < EPS ? Infinity : Math.abs(1 / dz);
        const ox = player.x, oy = player.y + 1.62, oz = player.z;
        // An axis with no direction component must never be the next step;
        // with a finite tMax it would drag the ray one cell sideways.
        let tMaxX = tDx === Infinity ? Infinity : (dx > 0 ? x + 1 - ox : ox - x) * tDx;
        let tMaxY = tDy === Infinity ? Infinity : (dy > 0 ? y + 1 - oy : oy - y) * tDy;
        let tMaxZ = tDz === Infinity ? Infinity : (dz > 0 ? z + 1 - oz : oz - z) * tDz;
        let fx = 0, fy = 0, fz = 0, t = 0;

        hit.found = false;
        while (t <= maxDist) {
            if (solid(blockAt(x, y, z))) {
                hit.found = true;
                hit.x = x; hit.y = y; hit.z = z;
                hit.nx = fx; hit.ny = fy; hit.nz = fz;
                return hit;
            }
            if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDx; fx = -stepX; fy = 0; fz = 0; }
            else if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDy; fx = 0; fy = -stepY; fz = 0; }
            else { z += stepZ; t = tMaxZ; tMaxZ += tDz; fx = 0; fy = 0; fz = -stepZ; }
        }
        return hit;
    }

    // -------------------------------------------------------------- physics
    const keys = Object.create(null);
    const HALF = 0.3, HEIGHT = 1.8;

    function collides(x, y, z) {
        const x0 = Math.floor(x - HALF), x1 = Math.floor(x + HALF);
        const y0 = Math.floor(y), y1 = Math.floor(y + HEIGHT - 0.02);
        const z0 = Math.floor(z - HALF), z1 = Math.floor(z + HALF);
        for (let yy = y0; yy <= y1; yy++)
            for (let zz = z0; zz <= z1; zz++)
                for (let xx = x0; xx <= x1; xx++)
                    if (solid(blockAt(xx, yy, zz))) return true;
        return false;
    }

    /** True once the chunk the player stands in has voxel data to collide with. */
    function groundReady() {
        const rec = chunks.get(key(Math.floor(player.x / CX), Math.floor(player.z / CZ)));
        return !!(rec && rec.voxels);
    }

    /** Lift the player out of anything solid they ended up inside. */
    function unstick() {
        let guard = 0;
        while (collides(player.x, player.y, player.z) && player.y < CY && guard++ < CY) player.y += 1;
        player.py = player.y;
        player.vy = 0;
    }

    function step(dt) {
        // Physics must not run before the world exists: gravity against an
        // empty chunk drops the player straight through the terrain that is
        // still being meshed, and they wake up sealed inside a hill.
        if (!groundReady()) { player.vy = 0; return; }
        if (!spawned) { spawned = true; unstick(); }

        player.px = player.x; player.py = player.y; player.pz = player.z;

        const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
        const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
        const speed = (keys.ShiftLeft || keys.ShiftRight ? 8.6 : 4.9) * (player.flying ? 1.8 : 1);

        const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
        // forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
        let mx = (sy * fwd - cy * strafe);
        let mz = (cy * fwd + sy * strafe);
        const len = Math.hypot(mx, mz);
        if (len > 0) { mx = mx / len * speed; mz = mz / len * speed; }

        if (player.flying) {
            player.vy = ((keys.Space ? 1 : 0) - (keys.ControlLeft ? 1 : 0)) * 7;
        } else {
            player.vy -= 26 * dt;
            if (player.vy < -55) player.vy = -55;
            if (keys.Space && player.onGround) { player.vy = 8.4; player.onGround = false; }
        }

        // Axis-separated sweep: cheap, stable, and no tunnelling at these speeds.
        const nx = player.x + mx * dt;
        if (!collides(nx, player.y, player.z)) player.x = nx;
        const nz = player.z + mz * dt;
        if (!collides(player.x, player.y, nz)) player.z = nz;

        const ny = player.y + player.vy * dt;
        if (!collides(player.x, ny, player.z)) {
            player.y = ny;
            player.onGround = false;
        } else {
            if (player.vy < 0) player.onGround = true;
            player.vy = 0;
        }

        if (player.y < -20) {                                   // fell out of the world
            player.y = CY - 8; player.vy = 0;
            unstick();
        }
    }

    // -------------------------------------------------------------- render
    const cam = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    const drawCfg = { fov: 0, far: 0 };
    const lerp = (a, b, t) => a + (b - a) * t;

    function render(alpha, dt) {
        cam.x = lerp(player.px, player.x, alpha);
        cam.y = lerp(player.py, player.y, alpha) + 1.62;
        cam.z = lerp(player.pz, player.z, alpha);
        cam.yaw = player.yaw; cam.pitch = player.pitch;
        drawCfg.fov = cfg.fov;

        streamChunks();
        flushUploads();
        // Fog has to finish *inside* the loaded radius, otherwise the player
        // sees the edge of the streamed world as a hard horizon of sky.
        drawCfg.far = cfg.renderDistance * CX;
        renderer.draw(cam, drawCfg);
        scaler.sample(dt * 1000, performance.now());
    }

    // ---------------------------------------------------------------- input
    function bindInput() {
        Teardown.on(window, 'keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'KeyF') player.flying = !player.flying;
            if (e.code.startsWith('Digit')) {
                const n = +e.code.slice(5);
                const list = [M.STONE, M.DIRT, M.GRASS, M.SAND, M.WOOD, M.LEAF];
                if (n >= 1 && n <= list.length) player.block = list[n - 1];
                updateHud();
            }
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        });
        Teardown.on(window, 'keyup', (e) => { keys[e.code] = false; });
        Teardown.on(window, 'blur', () => { for (const k in keys) keys[k] = false; });

        Teardown.on(canvas, 'click', () => {
            if (!state.locked) {
                // Pointer lock inside a sandboxed frame needs allow-pointer-lock
                // on the iframe; the portal sets it and this is where it pays off.
                const p = canvas.requestPointerLock();
                if (p && p.catch) p.catch(() => showHint('Pointer lock was refused by the browser.'));
            }
        });

        Teardown.on(document, 'pointerlockchange', () => {
            state.locked = document.pointerLockElement === canvas;
            Bridge.pointerLock(state.locked);
            showHint(state.locked ? '' : 'Click to look around · Esc releases the cursor');
        });
        Teardown.on(document, 'pointerlockerror', () => showHint('Pointer lock failed on this device.'));

        Teardown.on(document, 'mousemove', (e) => {
            if (!state.locked) return;
            player.yaw -= e.movementX * 0.0023;
            player.pitch -= e.movementY * 0.0023;
            const lim = Math.PI / 2 - 0.01;
            if (player.pitch > lim) player.pitch = lim;
            if (player.pitch < -lim) player.pitch = -lim;
        });

        Teardown.on(canvas, 'mousedown', (e) => {
            if (!state.locked) return;
            e.preventDefault();
            const r = raycast(player.reach);
            if (!r.found) return;
            if (e.button === 0) {
                setBlock(r.x, r.y, r.z, M.AIR);
                state.broken++;
            } else if (e.button === 2) {
                const tx = r.x + r.nx, ty = r.y + r.ny, tz = r.z + r.nz;
                // Refuse to seal the player inside a block.
                if (!(Math.floor(player.x) === tx && Math.floor(player.z) === tz &&
                      (Math.floor(player.y) === ty || Math.floor(player.y + 1) === ty))) {
                    setBlock(tx, ty, tz, player.block);
                    state.placed++;
                }
            }
            updateHud();
        });
        Teardown.on(canvas, 'contextmenu', (e) => e.preventDefault());
    }

    // ------------------------------------------------------------------ hud
    const BLOCK_NAMES = { 1: 'stone', 2: 'dirt', 3: 'grass', 4: 'sand', 5: 'wood', 6: 'leaves' };
    function updateHud() {
        if (!hud) return;
        hud.textContent =
            `xyz ${player.x.toFixed(1)} ${player.y.toFixed(1)} ${player.z.toFixed(1)} · ` +
            `${BLOCK_NAMES[player.block]} · ${renderer.drawn} chunks (${renderer.culled} culled) · ` +
            `${(renderer.meshBytes / 1048576).toFixed(1)}/${cfg.meshBudgetMB} MB mesh · dist ${cfg.renderDistance}`;
    }
    function showHint(text) {
        if (!hint) return;
        hint.textContent = text;
        hint.style.display = text ? 'block' : 'none';
    }

    // -------------------------------------------------------------- persist
    let saveTimer = 0;
    function persistSoon() {
        clearTimeout(saveTimer);
        saveTimer = Teardown.timeout(persist, 3000);
    }
    function persist() {
        Bridge.save({
            v: 1,
            x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch,
            flying: player.flying, edits: state.edits,
            broken: state.broken, placed: state.placed,
        });
    }

    // ----------------------------------------------------------------- boot
    function boot(hello) {
        canvas = document.getElementById('gl');
        hud = document.getElementById('hud');
        hint = document.getElementById('hint');
        const boot = document.getElementById('boot');

        try {
            renderer = new Gfx.Renderer(canvas, { budgetMB: cfg.meshBudgetMB });
        } catch (err) {
            if (boot) boot.textContent = 'WebGL2 unavailable: ' + err.message;
            Bridge.post('game:error', { message: 'WebGL2 unavailable: ' + err.message, stack: '' });
            return;
        }
        if (boot) boot.remove();

        const caps = hello && hello.caps;
        // Start conservative on weak devices; the frame-time controller opens
        // it back up if there is headroom.
        if (caps) {
            if (caps.software) cfg.renderDistance = 4;
            else if ((caps.deviceMemory && caps.deviceMemory <= 4) || (caps.cores && caps.cores <= 2)) cfg.renderDistance = 5;
            if (caps.deviceMemory && caps.deviceMemory <= 4) { cfg.meshBudgetMB = 64; renderer.budgetBytes = 64 * 1048576; }
        }

        if (hello && hello.save && hello.save.v === 1) {
            const s = hello.save;
            player.x = player.px = s.x; player.y = player.py = s.y; player.z = player.pz = s.z;
            player.yaw = s.yaw; player.pitch = s.pitch; player.flying = !!s.flying;
            state.edits = s.edits || Object.create(null);
            state.broken = s.broken | 0; state.placed = s.placed | 0;
        } else {
            // Drop the player onto the surface rather than inside it.
            player.y = player.py = M.heightAt(Math.floor(player.x), Math.floor(player.z), SEED) + 2;
        }

        scaler = new PE.ResolutionScaler(canvas, {
            targetFps: 60,
            maxDpr: 1,
            initialScale: PE.ResolutionScaler.suggestInitialScale(),
            onResize: (w, h) => renderer.resize(w, h),
        });
        Teardown.on(window, 'resize', () => scaler.applyResize());

        startWorkers(Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1)));
        bindInput();
        showHint('Click to look around · Esc releases the cursor');

        loop = new PE.Loop({
            hz: 60,
            step,
            render,
            onStats: (s) => {
                adaptRenderDistance(s.frameMs);
                updateHud();
                Bridge.stats({
                    fps: s.fps, frameMs: s.frameMs, scale: scaler.scale(),
                    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0,
                    entities: renderer.drawn, triangles: renderer.triangles | 0,
                });
            },
        });
        Teardown.onDestroy(() => loop.stop());
        loop.start();

        // Test handle: the soak and benchmark harnesses read chunk and memory
        // counters from here. Read-only by convention; nothing depends on it.
        window.__game = { player, state, cfg, chunks, renderer, scaler, loop, raycast, blockAt, setBlock };

        Bridge.ready({ tier: 'webgl2', pointerLock: true });
    }

    /**
     * Second-stage degradation. Resolution drops first (ResolutionScaler);
     * render distance only moves once resolution is already at its floor, and
     * moves in single steps with a long cooldown so the view never pulses.
     */
    let lastDistChange = 0;
    function adaptRenderDistance(frameMs) {
        const now = performance.now();
        if (now - lastDistChange < 6000) return;
        if (frameMs > 22 && scaler.scale() <= 0.75 && cfg.renderDistance > cfg.minRenderDistance) {
            cfg.renderDistance--;
            lastDistChange = now;
        } else if (frameMs < 11 && scaler.scale() >= 1 && cfg.renderDistance < cfg.maxRenderDistance) {
            cfg.renderDistance++;
            lastDistChange = now;
        }
    }

    Bridge.connect({
        id: 'voxel-drift',
        onHello: boot,
        onPause: () => {
            if (loop) loop.pause();
            if (document.pointerLockElement) document.exitPointerLock();
            persist(); Bridge.flush();
        },
        onResume: () => loop && loop.resume(),
        onLowMemory: () => {
            // Shed the outer ring: geometry is by far the largest thing here.
            cfg.renderDistance = Math.max(cfg.minRenderDistance, cfg.renderDistance - 1);
            renderer.budgetBytes = Math.max(32 * 1048576, renderer.budgetBytes * 0.7) | 0;
            renderer.enforceBudget();
            persist(); Bridge.flush();
        },
        onSettings: (s) => {
            if (!scaler) return;
            if (s && typeof s.resolutionScale === 'number') { scaler.setAuto(false); scaler.setScale(s.resolutionScale); }
            else scaler.setAuto(true);
        },
        onShutdown: () => { persist(); Bridge.flush(); Teardown.destroyAll(); },
    });
})();
