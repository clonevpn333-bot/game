'use strict';
/**
 * Voxel Drift — terrain generation and chunk meshing.
 *
 * Written as a factory so the exact same source runs on the main thread and,
 * via Function.prototype.toString into a Blob, inside a worker — a single-file
 * bundle has no second file to point a Worker at (§1.4).
 *
 * Everything here is typed-array work with no per-call allocation beyond the
 * output buffers, which are transferred rather than copied.
 */
self.MESHER_FACTORY = function (scope) {
    const CX = 16, CY = 64, CZ = 16;
    const IDX = (x, y, z) => x + z * CX + y * CX * CZ;

    // Padded copy (18 x CY x 18) so border faces cull against real neighbours
    // instead of guessing.
    const PX = CX + 2, PZ = CZ + 2;
    const PIDX = (x, y, z) => (x + 1) + (z + 1) * PX + y * PX * PZ;

    const AIR = 0, STONE = 1, DIRT = 2, GRASS = 3, SAND = 4, WOOD = 5, LEAF = 6;
    const SEA = 26;

    // --- deterministic value noise ---------------------------------------
    function hash2(x, z, seed) {
        let h = (x * 374761393 + z * 668265263 + seed * 1442695040) | 0;
        h = (h ^ (h >>> 13)) * 1274126177;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }
    const smooth = (t) => t * t * (3 - 2 * t);

    function noise2(x, z, seed) {
        const xi = Math.floor(x), zi = Math.floor(z);
        const xf = smooth(x - xi), zf = smooth(z - zi);
        const a = hash2(xi, zi, seed), b = hash2(xi + 1, zi, seed);
        const c = hash2(xi, zi + 1, seed), d = hash2(xi + 1, zi + 1, seed);
        return (a + (b - a) * xf) * (1 - zf) + (c + (d - c) * xf) * zf;
    }

    function fbm(x, z, seed, octaves) {
        let sum = 0, amp = 1, freq = 1, norm = 0;
        for (let o = 0; o < (octaves || 4); o++) {
            sum += noise2(x * freq, z * freq, seed + o) * amp;
            norm += amp;
            amp *= 0.5; freq *= 2.07;
        }
        return sum / norm;
    }

    /**
     * Height field. Deliberately smooth: high-frequency detail on a heightmap
     * turns the world into single-column spikes, which is both ugly and a
     * face-count multiplier — every spike is four extra side faces to mesh,
     * upload and shade.
     */
    function heightAt(wx, wz, seed) {
        const continent = fbm(wx / 220, wz / 220, seed, 3);
        const hills = fbm(wx / 74, wz / 74, seed + 91, 4);
        const detail = fbm(wx / 26, wz / 26, seed + 17, 2) - 0.5;
        const h = 16 + continent * 22 + hills * 14 + detail * 3;
        return Math.floor(h);
    }

    /** Fill a padded voxel array for one chunk, applying player edits. */
    function generate(cx, cz, seed, edits) {
        const pad = new Uint8Array(PX * PZ * CY);
        for (let z = -1; z <= CZ; z++) {
            for (let x = -1; x <= CX; x++) {
                const wx = cx * CX + x, wz = cz * CZ + z;
                const h = Math.min(CY - 2, heightAt(wx, wz, seed));
                const beach = h <= SEA + 1;
                for (let y = 0; y <= h; y++) {
                    let id;
                    if (y === h) id = beach ? SAND : GRASS;
                    else if (y > h - 4) id = beach ? SAND : DIRT;
                    else id = STONE;
                    pad[PIDX(x, y, z)] = id;
                }
                // Trees: deterministic per column so neighbours agree.
                if (!beach && h > SEA + 2 && hash2(wx, wz, seed + 313) > 0.988) {
                    const th = 4 + ((hash2(wx, wz, seed + 5) * 3) | 0);
                    for (let t = 1; t <= th && h + t < CY - 1; t++) pad[PIDX(x, h + t, z)] = WOOD;
                    for (let ly = -1; ly <= 1; ly++) {
                        for (let lx = -1; lx <= 1; lx++) {
                            for (let lz = -1; lz <= 1; lz++) {
                                const px = x + lx, py = h + th + ly, pz = z + lz;
                                if (px < -1 || px > CX || pz < -1 || pz > CZ || py >= CY) continue;
                                if (pad[PIDX(px, py, pz)] === AIR) pad[PIDX(px, py, pz)] = LEAF;
                            }
                        }
                    }
                }
            }
        }
        if (edits) {
            for (const key in edits) {
                const parts = key.split(',');
                const wx = +parts[0], wy = +parts[1], wz = +parts[2];
                const lx = wx - cx * CX, lz = wz - cz * CZ;
                if (lx < -1 || lx > CX || lz < -1 || lz > CZ || wy < 0 || wy >= CY) continue;
                pad[PIDX(lx, wy, lz)] = edits[key];
            }
        }
        return pad;
    }

    // --- face tables ------------------------------------------------------
    // dir: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z
    const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const FACE_VERTS = [
        [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],   // +X
        [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],   // -X
        [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],   // +Y
        [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],   // -Y
        [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],   // +Z
        [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],   // -Z
    ];
    // Tangent axes used for ambient occlusion sampling, per face direction.
    const AO_AXES = [
        [[0, 1, 0], [0, 0, 1]], [[0, 1, 0], [0, 0, 1]],
        [[1, 0, 0], [0, 0, 1]], [[1, 0, 0], [0, 0, 1]],
        [[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 1, 0]],
    ];
    const FACE_SHADE = [0.78, 0.72, 1.0, 0.55, 0.86, 0.66];

    // Atlas tile per block id and face: [top, side, bottom]
    const TILES = {
        1: [0, 0, 0],       // stone
        2: [1, 1, 1],       // dirt
        3: [2, 3, 1],       // grass
        4: [4, 4, 4],       // sand
        5: [6, 5, 6],       // wood
        6: [7, 7, 7],       // leaves
    };
    const ATLAS_COLS = 4;

    function tileFor(id, dir) {
        const t = TILES[id];
        if (!t) return 0;
        return dir === 2 ? t[0] : dir === 3 ? t[2] : t[1];
    }

    const solid = (v) => v !== AIR;

    /**
     * Build one chunk mesh. Only faces adjacent to air are emitted, which is
     * the single biggest overdraw and draw-call saving available in a voxel
     * scene (§1.3).
     */
    function mesh(pad) {
        // Two passes: count faces, then fill exact-size buffers. One extra
        // scan is cheaper than growing arrays and re-copying.
        let faces = 0;
        for (let y = 0; y < CY; y++) {
            for (let z = 0; z < CZ; z++) {
                for (let x = 0; x < CX; x++) {
                    if (!solid(pad[PIDX(x, y, z)])) continue;
                    for (let d = 0; d < 6; d++) {
                        const n = NORMALS[d];
                        const ny = y + n[1];
                        if (ny < 0 || ny >= CY) { if (n[1] < 0) continue; }
                        if (!solid(neighbour(pad, x + n[0], ny, z + n[2]))) faces++;
                    }
                }
            }
        }

        const verts = new Float32Array(faces * 4 * 6);   // x,y,z,u,v,light
        const indices = new Uint32Array(faces * 6);
        let vi = 0, ii = 0, vertBase = 0;

        for (let y = 0; y < CY; y++) {
            for (let z = 0; z < CZ; z++) {
                for (let x = 0; x < CX; x++) {
                    const id = pad[PIDX(x, y, z)];
                    if (!solid(id)) continue;
                    for (let d = 0; d < 6; d++) {
                        const n = NORMALS[d];
                        const nx = x + n[0], ny = y + n[1], nz = z + n[2];
                        if (ny < 0 && n[1] < 0) continue;
                        if (solid(neighbour(pad, nx, ny, nz))) continue;

                        const tile = tileFor(id, d);
                        const tu = (tile % ATLAS_COLS) / ATLAS_COLS;
                        const tv = ((tile / ATLAS_COLS) | 0) / ATLAS_COLS;
                        const ts = 1 / ATLAS_COLS;
                        const shade = FACE_SHADE[d];
                        const corners = FACE_VERTS[d];
                        const axes = AO_AXES[d];

                        let ao0 = 0, ao2 = 0;
                        for (let c = 0; c < 4; c++) {
                            const cv = corners[c];
                            // Corner sign along each tangent axis: -1 or +1.
                            const s1 = sign(cv, axes[0]), s2 = sign(cv, axes[1]);
                            const side1 = solid(neighbour(pad,
                                nx + axes[0][0] * s1, ny + axes[0][1] * s1, nz + axes[0][2] * s1));
                            const side2 = solid(neighbour(pad,
                                nx + axes[1][0] * s2, ny + axes[1][1] * s2, nz + axes[1][2] * s2));
                            const corner = solid(neighbour(pad,
                                nx + axes[0][0] * s1 + axes[1][0] * s2,
                                ny + axes[0][1] * s1 + axes[1][1] * s2,
                                nz + axes[0][2] * s1 + axes[1][2] * s2));
                            const ao = (side1 && side2) ? 0 : 3 - ((side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0));
                            const light = shade * (0.55 + 0.15 * ao);
                            if (c === 0) ao0 = ao; if (c === 2) ao2 = ao;

                            verts[vi++] = x + cv[0];
                            verts[vi++] = y + cv[1];
                            verts[vi++] = z + cv[2];
                            verts[vi++] = tu + (c === 1 || c === 2 ? ts : 0);
                            verts[vi++] = tv + (c >= 2 ? 0 : ts);
                            verts[vi++] = light;
                        }

                        // Flip the quad's split so the AO gradient does not
                        // produce the classic diagonal seam.
                        if (ao0 > ao2) {
                            indices[ii++] = vertBase; indices[ii++] = vertBase + 1; indices[ii++] = vertBase + 2;
                            indices[ii++] = vertBase; indices[ii++] = vertBase + 2; indices[ii++] = vertBase + 3;
                        } else {
                            indices[ii++] = vertBase + 1; indices[ii++] = vertBase + 2; indices[ii++] = vertBase + 3;
                            indices[ii++] = vertBase + 1; indices[ii++] = vertBase + 3; indices[ii++] = vertBase;
                        }
                        vertBase += 4;
                    }
                }
            }
        }
        return { verts, indices, faces };
    }

    function sign(corner, axis) {
        const c = axis[0] ? corner[0] : axis[1] ? corner[1] : corner[2];
        return c === 0 ? -1 : 1;
    }

    function neighbour(pad, x, y, z) {
        if (y < 0 || y >= CY) return AIR;
        if (x < -1 || x > CX || z < -1 || z > CZ) return AIR;
        return pad[PIDX(x, y, z)];
    }

    /** Strip the padding so the main thread stores only the chunk proper. */
    function core(pad) {
        const out = new Uint8Array(CX * CY * CZ);
        for (let y = 0; y < CY; y++)
            for (let z = 0; z < CZ; z++)
                for (let x = 0; x < CX; x++) out[IDX(x, y, z)] = pad[PIDX(x, y, z)];
        return out;
    }

    function build(cx, cz, seed, edits) {
        const pad = generate(cx, cz, seed, edits);
        const m = mesh(pad);
        return { cx, cz, voxels: core(pad), verts: m.verts, indices: m.indices, faces: m.faces };
    }

    scope.Mesher = {
        CX, CY, CZ, IDX, AIR, STONE, DIRT, GRASS, SAND, WOOD, LEAF, SEA,
        ATLAS_COLS, TILES, build, heightAt, hash2,
    };
    return scope.Mesher;
};
self.MESHER_FACTORY(self);
