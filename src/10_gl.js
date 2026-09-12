/* =============================================================
 * BREACHPOINT — WebGL core: matrices, shaders, buffers, textures
 *
 * Deliberately dependency-free and WebGL1-compatible so the game
 * runs on school Chromebooks without a driver lottery.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});

  /* ---------------------------------------------------------------
   * Mat4 / Vec math (column-major, same layout as GL)
   * ------------------------------------------------------------- */
  var Mat4 = {};
  Mat4.create = function () {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  };
  Mat4.identity = function (o) {
    o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0;
    o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
    return o;
  };
  Mat4.perspective = function (o, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  };
  Mat4.ortho = function (o, l, r, b, t, n, f) {
    var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    o[0] = -2 * lr; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = -2 * bt; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 2 * nf; o[11] = 0;
    o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1;
    return o;
  };
  Mat4.multiply = function (o, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (var i = 0; i < 4; i++) {
      var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      o[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  };
  Mat4.translate = function (o, a, x, y, z) {
    if (o !== a) for (var i = 0; i < 12; i++) o[i] = a[i];
    o[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    o[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    o[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    o[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    return o;
  };
  Mat4.scale = function (o, a, x, y, z) {
    o[0] = a[0] * x; o[1] = a[1] * x; o[2] = a[2] * x; o[3] = a[3] * x;
    o[4] = a[4] * y; o[5] = a[5] * y; o[6] = a[6] * y; o[7] = a[7] * y;
    o[8] = a[8] * z; o[9] = a[9] * z; o[10] = a[10] * z; o[11] = a[11] * z;
    o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15];
    return o;
  };
  Mat4.rotateY = function (o, a, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[4] = a[4]; o[5] = a[5]; o[6] = a[6]; o[7] = a[7]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
    o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
    return o;
  };
  Mat4.rotateX = function (o, a, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    if (o !== a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
    o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
    return o;
  };
  Mat4.rotateZ = function (o, a, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    if (o !== a) { o[8] = a[8]; o[9] = a[9]; o[10] = a[10]; o[11] = a[11]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
    o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
    o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
    return o;
  };
  /* Camera look matrix from yaw/pitch — avoids a lookAt with up-vector edge cases. */
  Mat4.fpsView = function (o, x, y, z, yaw, pitch, roll) {
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    // forward = (cp*cy, sp, -cp*sy)
    var fx = cp * cy, fy = sp, fz = -cp * sy;
    // right = normalize(cross(forward, worldUp)) = (-fz, 0, fx)
    var rl = Math.sqrt(fz * fz + fx * fx) || 1;
    var rx = -fz / rl, ry = 0, rz = fx / rl;
    // up = cross(right, forward)
    var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    if (roll) {
      var cr = Math.cos(roll), sr = Math.sin(roll);
      var nrx = rx * cr + ux * sr, nry = ry * cr + uy * sr, nrz = rz * cr + uz * sr;
      var nux = ux * cr - rx * sr, nuy = uy * cr - ry * sr, nuz = uz * cr - rz * sr;
      rx = nrx; ry = nry; rz = nrz; ux = nux; uy = nuy; uz = nuz;
    }
    o[0] = rx; o[1] = ux; o[2] = -fx; o[3] = 0;
    o[4] = ry; o[5] = uy; o[6] = -fy; o[7] = 0;
    o[8] = rz; o[9] = uz; o[10] = -fz; o[11] = 0;
    o[12] = -(rx * x + ry * y + rz * z);
    o[13] = -(ux * x + uy * y + uz * z);
    o[14] = (fx * x + fy * y + fz * z);
    o[15] = 1;
    return o;
  };
  CS.Mat4 = Mat4;

  /* ---------------------------------------------------------------
   * GL helpers
   * ------------------------------------------------------------- */
  var GL = {};

  GL.createContext = function (canvas, opts) {
    var attrs = {
      alpha: false, antialias: !!(opts && opts.antialias), depth: true, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'high-performance', desynchronized: true,
      failIfMajorPerformanceCaveat: false
    };
    var gl = canvas.getContext('webgl2', attrs);
    var isGL2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) return null;
    gl.__isGL2 = isGL2;
    return gl;
  };

  GL.compile = function (gl, type, src, label) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Shader compile failed (' + (label || '') + '): ' + log);
    }
    return sh;
  };

  GL.program = function (gl, vsSrc, fsSrc, label) {
    var vs = GL.compile(gl, gl.VERTEX_SHADER, vsSrc, label + '.vert');
    var fs = GL.compile(gl, gl.FRAGMENT_SHADER, fsSrc, label + '.frag');
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(pr);
      gl.deleteProgram(pr);
      throw new Error('Program link failed (' + (label || '') + '): ' + log);
    }
    // reflect attributes and uniforms so call sites can use names
    var obj = { p: pr, a: {}, u: {} };
    var na = gl.getProgramParameter(pr, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < na; i++) {
      var ai = gl.getActiveAttrib(pr, i);
      obj.a[ai.name] = gl.getAttribLocation(pr, ai.name);
    }
    var nu = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (var j = 0; j < nu; j++) {
      var ui = gl.getActiveUniform(pr, j);
      var name = ui.name.replace(/\[0\]$/, '');
      obj.u[name] = gl.getUniformLocation(pr, name);
    }
    return obj;
  };

  /* Static or dynamic interleaved mesh. */
  function Mesh(gl, layout) {
    this.gl = gl;
    this.layout = layout;              // [{name, size, type, norm}]
    this.stride = 0;
    for (var i = 0; i < layout.length; i++) {
      layout[i].offset = this.stride;
      this.stride += layout[i].size * (layout[i].bytes || 4);
    }
    this.vbo = gl.createBuffer();
    this.ibo = null;
    this.count = 0;
    this.indexed = false;
    this.capacity = 0;
  }
  Mesh.prototype.upload = function (data, indices, dynamic) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    this.capacity = data.byteLength;
    if (indices) {
      if (!this.ibo) this.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      this.indexed = true;
      this.count = indices.length;
      this.indexType = indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    } else {
      this.indexed = false;
      this.count = data.byteLength / this.stride;
    }
    return this;
  };
  Mesh.prototype.updateSub = function (data, count) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    var bytes = count * this.stride;
    if (bytes > this.capacity) {
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      this.capacity = data.byteLength;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray ? data.subarray(0, count * this.stride / 4) : data);
    }
    this.count = count;
    this.indexed = false;
  };
  /* Attribute slots are shared across programs, so any slot left enabled by a
   * previous draw would point at a stale buffer. Track and disable the rest. */
  Mesh.prototype.bind = function (prog) {
    var gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    var used = 0;
    for (var i = 0; i < this.layout.length; i++) {
      var L = this.layout[i];
      var loc = prog.a[L.name];
      if (loc === undefined || loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, L.size, L.type || gl.FLOAT, !!L.norm, this.stride, L.offset);
      used |= (1 << loc);
    }
    var prev = gl.__attribMask || 0;
    var stale = prev & ~used;
    if (stale) {
      for (var s = 0; s < 16; s++) if (stale & (1 << s)) gl.disableVertexAttribArray(s);
    }
    gl.__attribMask = used;
    if (this.indexed) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
  };
  Mesh.prototype.draw = function (prog, mode) {
    var gl = this.gl;
    if (!this.count) return;
    this.bind(prog);
    if (this.indexed) gl.drawElements(mode === undefined ? gl.TRIANGLES : mode, this.count, this.indexType, 0);
    else gl.drawArrays(mode === undefined ? gl.TRIANGLES : mode, 0, this.count);
  };
  Mesh.prototype.dispose = function () {
    var gl = this.gl;
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.ibo) gl.deleteBuffer(this.ibo);
    this.vbo = this.ibo = null;
  };
  GL.Mesh = Mesh;

  /* ---------------------------------------------------------------
   * Procedural textures — generated in a canvas, so no asset files
   * ------------------------------------------------------------- */
  GL.makeTexture = function (gl, canvas, opts) {
    opts = opts || {};
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, opts.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, opts.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.nomip ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (!opts.nomip) gl.generateMipmap(gl.TEXTURE_2D);
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic') ||
                gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (aniso && opts.aniso) {
      var max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(opts.aniso, max));
    }
    return tex;
  };

  GL.makeCanvas = function (size) {
    var c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    if (!c) return null;
    c.width = c.height = size;
    return c;
  };

  CS.GL = GL;
})(typeof window !== 'undefined' ? window : globalThis);
