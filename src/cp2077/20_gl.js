<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 02 — WEBGL2 DEVICE LAYER
   Thin, allocation-free wrappers: programs w/ cached uniform locations,
   MRT framebuffers, texture arrays, VAOs, and a redundancy-filtered state cache.
   ========================================================================== */
const GX = {
  gl: null, canvas: null, ext: {}, caps: {},
  _prog: null, _fbo: null, _vao: null, _blend: null, _depth: null, _cull: null,
  stats: { draws: 0, tris: 0, progSwaps: 0 },

  init(canvas, opts) {
    const gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: "high-performance", desynchronized: true,
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) return null;
    this.gl = gl; this.canvas = canvas;
    this.ext.cbf = gl.getExtension("EXT_color_buffer_float");
    this.ext.flin = gl.getExtension("OES_texture_float_linear");
    this.ext.afil = gl.getExtension("EXT_texture_filter_anisotropic");
    this.ext.s3tc = gl.getExtension("WEBGL_compressed_texture_s3tc");
    this.ext.dbg = gl.getExtension("WEBGL_debug_renderer_info");
    this.caps.aniso = this.ext.afil ? gl.getParameter(this.ext.afil.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1;
    this.caps.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.caps.maxUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    this.caps.maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
    this.caps.maxVUnif = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS);
    this.caps.renderer = this.ext.dbg ? gl.getParameter(this.ext.dbg.UNMASKED_RENDERER_WEBGL) : "WebGL2";
    this.caps.floatRT = !!this.ext.cbf;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    return gl;
  },

  /* ------------------------------------------------------------ shaders -- */
  compile(src, type, name) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      const lines = src.split("\n");
      let ctx = "";
      const m = /ERROR:\s*\d+:(\d+)/.exec(log);
      if (m) { const ln = +m[1];
        for (let i = max(0, ln - 4); i < min(lines.length, ln + 3); i++)
          ctx += (i + 1) + (i + 1 === ln ? " >> " : "  | ") + lines[i] + "\n"; }
      console.error("[shader:" + name + "]\n" + log + "\n" + ctx);
      throw new Error("shader compile failed: " + name);
    }
    return s;
  },
  program(vs, fs, name, xfb) {
    const gl = this.gl, p = gl.createProgram();
    const v = this.compile(vs, gl.VERTEX_SHADER, name + ".vs");
    const f = this.compile(fs, gl.FRAGMENT_SHADER, name + ".fs");
    gl.attachShader(p, v); gl.attachShader(p, f);
    if (xfb) gl.transformFeedbackVaryings(p, xfb, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error("link failed " + name + ": " + gl.getProgramInfoLog(p));
    gl.deleteShader(v); gl.deleteShader(f);
    /* pre-cache every active uniform + attribute location */
    const u = Object.create(null), a = Object.create(null);
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) { const inf = gl.getActiveUniform(p, i);
      const nm = inf.name.replace(/\[0\]$/, ""); u[nm] = gl.getUniformLocation(p, inf.name); }
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) { const inf = gl.getActiveAttrib(p, i); a[inf.name] = gl.getAttribLocation(p, inf.name); }
    return { p, u, a, name };
  },
  use(pr) { if (this._prog !== pr.p) { this.gl.useProgram(pr.p); this._prog = pr.p; this.stats.progSwaps++; } return pr; },

  /* ----------------------------------------------------------- textures -- */
  tex2D(w, h, ifmt, fmt, type, data, o) {
    const gl = this.gl, t = gl.createTexture(); o = o || {};
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data || null);
    const flt = o.filter === undefined ? gl.LINEAR : o.filter;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : flt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, flt);
    const wr = o.wrap === undefined ? gl.CLAMP_TO_EDGE : o.wrap;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
    if (o.cmp) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL); }
    if (o.mips) gl.generateMipmap(gl.TEXTURE_2D);
    if (o.aniso && this.ext.afil) gl.texParameterf(gl.TEXTURE_2D,
      this.ext.afil.TEXTURE_MAX_ANISOTROPY_EXT, min(o.aniso, this.caps.aniso));
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { t, w, h, target: gl.TEXTURE_2D };
  },
  texArray(w, h, layers, ifmt, fmt, type, o) {
    const gl = this.gl, t = gl.createTexture(); o = o || {};
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    const levels = o.mips ? (Math.log2(max(w, h)) | 0) + 1 : 1;
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, ifmt, w, h, layers);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (o.aniso && this.ext.afil) gl.texParameterf(gl.TEXTURE_2D_ARRAY,
      this.ext.afil.TEXTURE_MAX_ANISOTROPY_EXT, min(o.aniso, this.caps.aniso));
    return { t, w, h, layers, target: gl.TEXTURE_2D_ARRAY, mips: !!o.mips };
  },
  subImage3D(tex, layer, src) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex.t);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, tex.w, tex.h, 1,
      gl.RGBA, gl.UNSIGNED_BYTE, src);
  },
  genMips(tex) { const gl = this.gl; gl.bindTexture(tex.target, tex.t); gl.generateMipmap(tex.target); },
  bindTex(unit, tex) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(tex.target || gl.TEXTURE_2D, tex.t !== undefined ? tex.t : tex);
  },

  /* -------------------------------------------------------- framebuffers -- */
  /* specs: [{ifmt,fmt,type,filter}] ; depth: true|"tex"|false */
  fbo(w, h, specs, depth) {
    const gl = this.gl, f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    const cols = [], bufs = [];
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const t = this.tex2D(w, h, s.ifmt, s.fmt, s.type, null, { filter: s.filter || gl.NEAREST, wrap: s.wrap });
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t.t, 0);
      cols.push(t); bufs.push(gl.COLOR_ATTACHMENT0 + i);
    }
    if (specs.length > 1) gl.drawBuffers(bufs);
    let dep = null;
    if (depth === "tex") {
      dep = this.tex2D(w, h, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT, null, { filter: gl.NEAREST });
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dep.t, 0);
    } else if (depth) {
      const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      dep = { rb };
    }
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) console.warn("FBO incomplete 0x" + st.toString(16), w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, w, h, cols, dep, bufs };
  },
  shadowFbo(size) {
    const gl = this.gl, f = gl.createFramebuffer();
    const t = this.tex2D(size, size, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT, null,
      { filter: gl.LINEAR, cmp: true });
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t.t, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { f, w: size, h: size, dep: t, cols: [] };
  },
  bindFbo(fb) {
    const gl = this.gl;
    const tgt = fb ? fb.f : null;
    if (this._fbo !== tgt) { gl.bindFramebuffer(gl.FRAMEBUFFER, tgt); this._fbo = tgt; }
    if (fb) gl.viewport(0, 0, fb.w, fb.h);
    else gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  },

  /* --------------------------------------------------------------- mesh -- */
  /* layout: [{loc,size,type,norm,offset}] over one interleaved buffer */
  mesh(verts, idx, layout, stride, dyn) {
    const gl = this.gl;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, verts, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    for (const a of layout) {
      gl.enableVertexAttribArray(a.loc);
      if (a.type === gl.UNSIGNED_BYTE && !a.norm && a.int)
        gl.vertexAttribIPointer(a.loc, a.size, a.type, stride, a.offset);
      else gl.vertexAttribPointer(a.loc, a.size, a.type, !!a.norm, stride, a.offset);
      if (a.div) gl.vertexAttribDivisor(a.loc, a.div);
    }
    let ib = null, count = 0, itype = gl.UNSIGNED_SHORT;
    if (idx) {
      ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      count = idx.length; itype = idx.BYTES_PER_ELEMENT === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    } else count = (verts.byteLength / stride) | 0;
    gl.bindVertexArray(null);
    return { vao, vb, ib, count, itype, indexed: !!idx };
  },
  addInstanced(m, data, layout, stride, dyn) {
    const gl = this.gl;
    gl.bindVertexArray(m.vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    for (const a of layout) {
      gl.enableVertexAttribArray(a.loc);
      gl.vertexAttribPointer(a.loc, a.size, a.type || gl.FLOAT, !!a.norm, stride, a.offset);
      gl.vertexAttribDivisor(a.loc, 1);
    }
    gl.bindVertexArray(null);
    m.ivb = b; m.icount = (data.byteLength / stride) | 0;
    return m;
  },
  updateBuf(buf, data, target) {
    const gl = this.gl; target = target || gl.ARRAY_BUFFER;
    gl.bindBuffer(target, buf);
    gl.bufferSubData(target, 0, data);
  },
  draw(m, mode, count) {
    const gl = this.gl;
    if (this._vao !== m.vao) { gl.bindVertexArray(m.vao); this._vao = m.vao; }
    mode = mode === undefined ? gl.TRIANGLES : mode;
    const n = count === undefined ? m.count : count;
    if (m.indexed) gl.drawElements(mode, n, m.itype, 0);
    else gl.drawArrays(mode, 0, n);
    this.stats.draws++; this.stats.tris += n / 3;
  },
  drawInst(m, n, mode) {
    const gl = this.gl;
    if (this._vao !== m.vao) { gl.bindVertexArray(m.vao); this._vao = m.vao; }
    mode = mode === undefined ? gl.TRIANGLES : mode;
    if (m.indexed) gl.drawElementsInstanced(mode, m.count, m.itype, 0, n);
    else gl.drawArraysInstanced(mode, 0, m.count, n);
    this.stats.draws++; this.stats.tris += m.count / 3 * n;
  },
  freeMesh(m) { const gl = this.gl;
    if (m.vao) gl.deleteVertexArray(m.vao);
    if (m.vb) gl.deleteBuffer(m.vb);
    if (m.ib) gl.deleteBuffer(m.ib);
    if (m.ivb) gl.deleteBuffer(m.ivb);
    if (this._vao === m.vao) this._vao = null; },

  /* -------------------------------------------------------------- state -- */
  blend(mode) {                                  // 0 off | 1 alpha | 2 add | 3 premult
    if (this._blend === mode) return; this._blend = mode;
    const gl = this.gl;
    if (!mode) { gl.disable(gl.BLEND); return; }
    gl.enable(gl.BLEND);
    if (mode === 1) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else if (mode === 2) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  },
  depth(test, write, func) {                     // func default GREATER (reversed-Z)
    const gl = this.gl;
    const key = (test?1:0) | (write?2:0) | ((func||0) << 2);
    if (this._depth === key) return; this._depth = key;
    if (test) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    gl.depthMask(!!write);
    gl.depthFunc(func || gl.GEQUAL);
  },
  cull(mode) {                                   // 0 none | BACK | FRONT
    if (this._cull === mode) return; this._cull = mode;
    const gl = this.gl;
    if (!mode) gl.disable(gl.CULL_FACE);
    else { gl.enable(gl.CULL_FACE); gl.cullFace(mode); }
  },
  clear(r, g, b, a, d) {
    const gl = this.gl; let bits = 0;
    if (r !== undefined) { gl.clearColor(r, g, b, a === undefined ? 1 : a); bits |= gl.COLOR_BUFFER_BIT; }
    if (d !== undefined) { gl.clearDepth(d); gl.depthMask(true); this._depth = null; bits |= gl.DEPTH_BUFFER_BIT; }
    if (bits) gl.clear(bits);
  },
  resetFrameStats() { this.stats.draws = 0; this.stats.tris = 0; this.stats.progSwaps = 0; },
};

/* ---- fullscreen triangle: one 3-vertex draw, no VBO, gl_VertexID based --- */
const FST = {
  vs: `#version 300 es
  out vec2 vUv;
  void main(){
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`,
  vao: null,
  draw() { const gl = GX.gl;
    if (!this.vao) this.vao = gl.createVertexArray();
    if (GX._vao !== this.vao) { gl.bindVertexArray(this.vao); GX._vao = this.vao; }
    gl.drawArrays(gl.TRIANGLES, 0, 3); GX.stats.draws++; },
};

/* ---- frustum: 6 planes extracted from a view-projection matrix ----------- */
class Frustum {
  constructor() { this.p = new Float32Array(24); }
  fromVP(m) {
    const p = this.p;
    for (let i = 0; i < 3; i++) {
      const s = i * 2;
      p[s*4+0] = m[3] + m[i];      p[s*4+1] = m[7] + m[4+i];
      p[s*4+2] = m[11] + m[8+i];   p[s*4+3] = m[15] + m[12+i];
      p[(s+1)*4+0] = m[3] - m[i];  p[(s+1)*4+1] = m[7] - m[4+i];
      p[(s+1)*4+2] = m[11] - m[8+i]; p[(s+1)*4+3] = m[15] - m[12+i];
    }
    for (let i = 0; i < 6; i++) {
      const o = i*4, l = hypot(p[o], p[o+1], p[o+2]) || 1;
      p[o]/=l; p[o+1]/=l; p[o+2]/=l; p[o+3]/=l;
    }
    return this;
  }
  sphere(x, y, z, r) {
    const p = this.p;
    for (let i = 0; i < 6; i++) { const o = i*4;
      if (p[o]*x + p[o+1]*y + p[o+2]*z + p[o+3] < -r) return false; }
    return true;
  }
  aabb(x0, y0, z0, x1, y1, z1) {
    const p = this.p;
    for (let i = 0; i < 6; i++) { const o = i*4;
      const nx = p[o] >= 0 ? x1 : x0, ny = p[o+1] >= 0 ? y1 : y0, nz = p[o+2] >= 0 ? z1 : z0;
      if (p[o]*nx + p[o+1]*ny + p[o+2]*nz + p[o+3] < 0) return false; }
    return true;
  }
}
</script>
