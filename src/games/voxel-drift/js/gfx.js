'use strict';
/**
 * Voxel Drift — WebGL2 renderer.
 *
 * Draw-call discipline (§1.3): one texture atlas bound once, one VAO per
 * chunk, chunks frustum-culled against their AABB, and a hard byte budget on
 * resident chunk meshes with LRU eviction (§1.1) so GPU memory on an
 * integrated part with shared system RAM cannot creep.
 */
(function (global) {
    const Gfx = {};

    // ---------------------------------------------------------------- math
    const mat4 = {
        create: () => new Float32Array(16),
        identity(m) {
            m.fill(0); m[0] = m[5] = m[10] = m[15] = 1; return m;
        },
        perspective(m, fovy, aspect, near, far) {
            const f = 1 / Math.tan(fovy / 2);
            m.fill(0);
            m[0] = f / aspect; m[5] = f; m[11] = -1;
            m[10] = (far + near) / (near - far);
            m[14] = (2 * far * near) / (near - far);
            return m;
        },
        /** View matrix straight from yaw/pitch/eye — no lookAt, no temporaries. */
        view(m, x, y, z, yaw, pitch) {
            const cy = Math.cos(yaw), sy = Math.sin(yaw);
            const cp = Math.cos(pitch), sp = Math.sin(pitch);
            // Right-handed basis for a yaw-then-pitch camera:
            //   forward = (sin y cos p, -sin p, cos y cos p)
            //   right   = normalize(cross(forward, worldUp)) = (-cos y, 0, sin y)
            // Getting right's sign wrong mirrors the world, which silently
            // inverts every triangle's winding and turns back-face culling
            // into front-face culling.
            const rx = -cy, ry = 0, rz = sy;
            const ux = sy * sp, uy = cp, uz = cy * sp;
            const fx = sy * cp, fy = -sp, fz = cy * cp;
            m[0] = rx; m[4] = ry; m[8] = rz; m[12] = -(rx * x + ry * y + rz * z);
            m[1] = ux; m[5] = uy; m[9] = uz; m[13] = -(ux * x + uy * y + uz * z);
            m[2] = -fx; m[6] = -fy; m[10] = -fz; m[14] = (fx * x + fy * y + fz * z);
            m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
            return m;
        },
        multiply(out, a, b) {
            for (let c = 0; c < 4; c++) {
                const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
                out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
                out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
                out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
                out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
            }
            return out;
        },
    };
    Gfx.mat4 = mat4;

    // Frustum planes, extracted in place from a view-projection matrix.
    const planes = new Float32Array(24);
    function extractFrustum(vp) {
        for (let i = 0; i < 3; i++) {
            const s = i * 2;
            for (let j = 0; j < 4; j++) {
                planes[s * 4 + j]       = vp[j * 4 + 3] + vp[j * 4 + i];
                planes[(s + 1) * 4 + j] = vp[j * 4 + 3] - vp[j * 4 + i];
            }
        }
        for (let p = 0; p < 6; p++) {
            const o = p * 4;
            const len = Math.hypot(planes[o], planes[o + 1], planes[o + 2]) || 1;
            planes[o] /= len; planes[o + 1] /= len; planes[o + 2] /= len; planes[o + 3] /= len;
        }
    }

    function aabbVisible(minX, minY, minZ, maxX, maxY, maxZ) {
        for (let p = 0; p < 6; p++) {
            const o = p * 4, a = planes[o], b = planes[o + 1], c = planes[o + 2], d = planes[o + 3];
            // Farthest corner along the plane normal; if it is behind, cull.
            const x = a > 0 ? maxX : minX, y = b > 0 ? maxY : minY, z = c > 0 ? maxZ : minZ;
            if (a * x + b * y + c * z + d < 0) return false;
        }
        return true;
    }

    // -------------------------------------------------------------- shaders
    const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUv;
layout(location=2) in float aLight;
uniform mat4 uViewProj;
uniform vec3 uChunk;
out vec2 vUv;
out float vLight;
out float vDist;
void main() {
  vec3 world = aPos + uChunk;
  vec4 clip = uViewProj * vec4(world, 1.0);
  gl_Position = clip;
  vUv = aUv;
  vLight = aLight;
  vDist = clip.w;
}`;

    const FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vLight;
in float vDist;
uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform vec2 uFogRange;
out vec4 outColor;
void main() {
  vec4 tex = texture(uAtlas, vUv);
  vec3 lit = tex.rgb * vLight;
  // Linear fog hides the render-distance edge without a second pass.
  float fog = clamp((vDist - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
  outColor = vec4(mix(lit, uFogColor, fog), 1.0);
}`;

    function compile(gl, type, src, label) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(sh);
            gl.deleteShader(sh);
            throw new Error(`${label} shader: ${log}`);
        }
        return sh;
    }

    function program(gl) {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT, 'vertex');
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG, 'fragment');
        const p = gl.createProgram();
        gl.attachShader(p, vs); gl.attachShader(p, fs);
        gl.linkProgram(p);
        gl.deleteShader(vs); gl.deleteShader(fs);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(p);
            gl.deleteProgram(p);
            throw new Error('link: ' + log);
        }
        return p;
    }

    // ---------------------------------------------------------------- atlas
    /** 4x4 tiles of 16px, generated procedurally: no image asset, no decode. */
    function buildAtlas(gl, cols, tilePx) {
        const size = cols * tilePx;
        const px = new Uint8Array(size * size * 4);
        const palette = [
            [126, 126, 132], [122, 88, 58], [96, 154, 74], [122, 88, 58],
            [216, 202, 152], [122, 92, 52], [96, 74, 44], [74, 128, 62],
        ];
        let seed = 0x9e3779b9;
        const rnd = () => {
            seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed |= 0;
            return (seed >>> 0) / 4294967296;
        };
        for (let tile = 0; tile < cols * cols; tile++) {
            const base = palette[tile % palette.length];
            const tx = (tile % cols) * tilePx, ty = ((tile / cols) | 0) * tilePx;
            for (let y = 0; y < tilePx; y++) {
                for (let x = 0; x < tilePx; x++) {
                    const n = 0.82 + rnd() * 0.36;
                    // Grass side tile (3) gets a dirt body with a green cap.
                    const grassSide = tile === 3 && y < 4;
                    const c = grassSide ? palette[2] : base;
                    const i = ((ty + y) * size + tx + x) * 4;
                    px[i]     = Math.min(255, c[0] * n);
                    px[i + 1] = Math.min(255, c[1] * n);
                    px[i + 2] = Math.min(255, c[2] * n);
                    px[i + 3] = 255;
                }
            }
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
        // NEAREST magnification keeps the pixel look; mipmaps kill the shimmer
        // that costs the most fill rate at distance.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        return { tex, bytes: size * size * 4 * 1.34 | 0 };
    }

    // -------------------------------------------------------------- renderer
    Gfx.Renderer = function (canvas, opts) {
        const attrs = {
            alpha: false, antialias: false, depth: true, stencil: false,
            desynchronized: true, powerPreference: 'low-power',
            preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false,
        };
        const gl = canvas.getContext('webgl2', attrs);
        if (!gl) throw new Error('WebGL2 unavailable');
        PE.Teardown.trackContext(gl);

        this.gl = gl;
        this.canvas = canvas;
        this.budgetBytes = (opts && opts.budgetMB || 96) * 1048576;
        this.meshBytes = 0;
        this.chunks = new Map();      // key -> { vao, vbo, ibo, count, bytes, lastUsed, cx, cz }
        this.drawn = 0;
        this.culled = 0;
        this.evictions = 0;

        this.prog = program(gl);
        this.uViewProj = gl.getUniformLocation(this.prog, 'uViewProj');
        this.uChunk = gl.getUniformLocation(this.prog, 'uChunk');
        this.uAtlas = gl.getUniformLocation(this.prog, 'uAtlas');
        this.uFogColor = gl.getUniformLocation(this.prog, 'uFogColor');
        this.uFogRange = gl.getUniformLocation(this.prog, 'uFogRange');

        const atlas = buildAtlas(gl, 4, 16);
        this.atlas = atlas.tex;
        this.atlasBytes = atlas.bytes;

        this.proj = mat4.create();
        this.viewM = mat4.create();
        this.viewProj = mat4.create();

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.frontFace(gl.CCW);
        gl.clearColor(0.55, 0.70, 0.88, 1);

        PE.Teardown.onDestroy(() => this.dispose());
    };

    Gfx.Renderer.prototype.upload = function (key, cx, cz, verts, indices) {
        const gl = this.gl;
        this.remove(key);
        if (!indices.length) {
            this.chunks.set(key, { vao: null, count: 0, bytes: 0, lastUsed: performance.now(), cx, cz });
            return;
        }
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        const stride = 6 * 4;
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 20);
        const ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        gl.bindVertexArray(null);

        const bytes = verts.byteLength + indices.byteLength;
        this.chunks.set(key, { vao, vbo, ibo, count: indices.length, bytes, lastUsed: performance.now(), cx, cz });
        this.meshBytes += bytes;
        this.enforceBudget();
    };

    Gfx.Renderer.prototype.remove = function (key) {
        const c = this.chunks.get(key);
        if (!c) return false;
        const gl = this.gl;
        if (c.vao) { gl.deleteVertexArray(c.vao); gl.deleteBuffer(c.vbo); gl.deleteBuffer(c.ibo); }
        this.meshBytes -= c.bytes;
        this.chunks.delete(key);
        return true;
    };

    /** LRU eviction against a hard byte budget — never grows during play. */
    Gfx.Renderer.prototype.enforceBudget = function (protect) {
        if (this.meshBytes <= this.budgetBytes) return 0;
        const entries = [...this.chunks.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
        let freed = 0;
        for (const [key] of entries) {
            if (this.meshBytes <= this.budgetBytes * 0.85) break;
            if (protect && protect.has(key)) continue;
            this.remove(key);
            this.evictions++;
            freed++;
        }
        return freed;
    };

    Gfx.Renderer.prototype.has = function (key) { return this.chunks.has(key); };

    Gfx.Renderer.prototype.resize = function (w, h) {
        this.gl.viewport(0, 0, w, h);
    };

    Gfx.Renderer.prototype.draw = function (cam, cfg) {
        const gl = this.gl;
        const w = this.canvas.width, h = this.canvas.height;
        const far = cfg.far;

        mat4.perspective(this.proj, cfg.fov, w / Math.max(1, h), 0.1, far);
        mat4.view(this.viewM, cam.x, cam.y, cam.z, cam.yaw, cam.pitch);
        mat4.multiply(this.viewProj, this.proj, this.viewM);
        extractFrustum(this.viewProj);

        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(this.uViewProj, false, this.viewProj);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.atlas);
        gl.uniform1i(this.uAtlas, 0);
        gl.uniform3f(this.uFogColor, 0.55, 0.70, 0.88);
        // Fully fogged one chunk before the far plane, so the streamed world's
        // edge never appears as a horizon of clear colour.
        gl.uniform2f(this.uFogRange, far * 0.72, far * 0.98);

        const CX = 16, CY = 64, CZ = 16;
        const now = performance.now();
        this.drawn = 0; this.culled = 0;
        let tris = 0;

        for (const [, c] of this.chunks) {
            if (!c.count) continue;
            const ox = c.cx * CX, oz = c.cz * CZ;
            if (!aabbVisible(ox, 0, oz, ox + CX, CY, oz + CZ)) { this.culled++; continue; }
            c.lastUsed = now;
            gl.uniform3f(this.uChunk, ox, 0, oz);
            gl.bindVertexArray(c.vao);
            gl.drawElements(gl.TRIANGLES, c.count, gl.UNSIGNED_INT, 0);
            this.drawn++;
            tris += c.count / 3;
        }
        gl.bindVertexArray(null);
        this.triangles = tris;
    };

    Gfx.Renderer.prototype.dispose = function () {
        const gl = this.gl;
        for (const key of [...this.chunks.keys()]) this.remove(key);
        if (this.atlas) gl.deleteTexture(this.atlas);
        if (this.prog) gl.deleteProgram(this.prog);
        this.atlas = null; this.prog = null;
        this.meshBytes = 0;
    };

    global.Gfx = Gfx;
})(self);
