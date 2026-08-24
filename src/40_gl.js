/* =========================================================================
 * GL PLUMBING — context creation, shader/program helpers, framebuffers and
 * the block texture array.
 * ========================================================================= */

var gl = null;
var GLX = { aniso: null, maxAniso: 1, colorBufferFloat: false, maxLayers: 256 };

function initGL(canvas) {
  var opts = { alpha: false, antialias: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false, desynchronized: true };
  gl = canvas.getContext('webgl2', opts);
  if (!gl) return false;
  GLX.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (GLX.aniso) GLX.maxAniso = gl.getParameter(GLX.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  GLX.colorBufferFloat = !!gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  GLX.maxLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS);
  return true;
}

function compileShader(type, src, name) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    var log = gl.getShaderInfoLog(s);
    var lines = src.split('\n');
    var m = /ERROR: \d+:(\d+)/.exec(log);
    var ctx = '';
    if (m) {
      var ln = parseInt(m[1], 10);
      for (var i = Math.max(0, ln - 4); i < Math.min(lines.length, ln + 3); i++) ctx += (i + 1) + ': ' + lines[i] + '\n';
    }
    console.error('shader compile failed [' + name + ']\n' + log + '\n' + ctx);
    return null;
  }
  return s;
}
function makeProgram(name, vsSrc, fsSrc) {
  var vs = compileShader(gl.VERTEX_SHADER, vsSrc, name + '.vert');
  var fs = compileShader(gl.FRAGMENT_SHADER, fsSrc, name + '.frag');
  if (!vs || !fs) return null;
  var p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('link failed [' + name + ']: ' + gl.getProgramInfoLog(p));
    return null;
  }
  gl.deleteShader(vs); gl.deleteShader(fs);
  var prog = { p: p, u: {}, a: {}, name: name };
  var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < nu; i++) {
    var info = gl.getActiveUniform(p, i);
    var nm = info.name.replace(/\[0\]$/, '');
    prog.u[nm] = gl.getUniformLocation(p, nm);
  }
  var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (var j = 0; j < na; j++) {
    var ai = gl.getActiveAttrib(p, j);
    prog.a[ai.name] = gl.getAttribLocation(p, ai.name);
  }
  return prog;
}

/* ---------------------------------------------------------- framebuffer -- */
function FBO(w, h, opts) {
  opts = opts || {};
  this.w = w; this.h = h;
  this.fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
  this.color = null; this.depth = null;
  if (opts.color !== false) {
    this.color = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.color);
    var ifmt = opts.float ? (GLX.colorBufferFloat ? gl.RGBA16F : gl.RGBA8) : gl.RGBA8;
    var type = (opts.float && GLX.colorBufferFloat) ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, gl.RGBA, type, null);
    var filt = opts.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.color, 0);
  } else {
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
  }
  if (opts.depth) {
    this.depth = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depth);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (opts.compare) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depth, 0);
  }
  var st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (st !== gl.FRAMEBUFFER_COMPLETE) console.error('FBO incomplete 0x' + st.toString(16), w, h, opts);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
FBO.prototype.bind = function () {
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
  gl.viewport(0, 0, this.w, this.h);
};
FBO.prototype.dispose = function () {
  gl.deleteFramebuffer(this.fb);
  if (this.color) gl.deleteTexture(this.color);
  if (this.depth) gl.deleteTexture(this.depth);
};

/* ------------------------------------------------------- texture array -- */
function uploadBlockTextures() {
  var n = TEX_LAYERS.length;
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  var levels = 5;                              // 16 -> 1
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, TS, TS, n);
  var big = new Uint8Array(TS * TS * 4 * n);
  for (var i = 0; i < n; i++) big.set(TEX_LAYERS[i], i * TS * TS * 4);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, TS, TS, n, gl.RGBA, gl.UNSIGNED_BYTE, big);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  if (GLX.aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, GLX.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, GLX.maxAniso));
  return tex;
}

/* a 1x1 white texture used wherever a sampler must be bound but unused */
function makeWhiteTex() {
  var t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
}

/* fullscreen triangle used by every post pass */
var _fsVAO = null;
function fullscreenQuad() {
  if (!_fsVAO) {
    _fsVAO = gl.createVertexArray();
    gl.bindVertexArray(_fsVAO);
    var b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }
  gl.bindVertexArray(_fsVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
