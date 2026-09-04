// ============================================================ GEOMETRY KIT
// Everything in the world is built from a handful of chunky primitives
// merged into single flat-shaded meshes, so a whole pine tree or a whole
// campfire is one draw call.
function bakeColor(geo, hex) {
  var n = geo.attributes.position.count, arr = new Float32Array(n * 3), i;
  for (i = 0; i < n; i++) hexLin(hex, arr, i * 3, 1);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

var _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
var _v3 = new THREE.Vector3(), _v3b = new THREE.Vector3();

// parts: [{g, c, p:[x,y,z], r:[rx,ry,rz], s:[sx,sy,sz]|number}]
// A box with its edges taken off.  Every hard-edged prop and every limb on a
// scout is built from these: a chamfer is three extra strips of triangles and
// it is the difference between a shape that reads as a solid object and one
// that reads as a cube.  The bevel catches the sun along every edge, which is
// most of what makes flat-shaded geometry look built rather than blocked out.
function roundBox(w, h, d, bev, seg) {
  var b = Math.min(bev === undefined ? 0.05 : bev, w * 0.49, h * 0.49, d * 0.49);
  var g = new THREE.BoxGeometry(w, h, d, seg || 2, seg || 2, seg || 2).toNonIndexed();
  var p = g.attributes.position.array;
  var hx = w / 2 - b, hy = h / 2 - b, hz = d / 2 - b;
  // Pull every vertex back onto the inner box, then push it out by the bevel
  // radius.  Faces that share an edge hold coincident vertices, and the same
  // map sends both copies to the same place, so the shell stays closed.
  for (var i = 0; i < p.length; i += 3) {
    var cx = clamp(p[i], -hx, hx), cy = clamp(p[i + 1], -hy, hy), cz = clamp(p[i + 2], -hz, hz);
    var dx = p[i] - cx, dy = p[i + 1] - cy, dz = p[i + 2] - cz;
    var l = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (l < 1e-6) continue;
    p[i] = cx + dx / l * b; p[i + 1] = cy + dy / l * b; p[i + 2] = cz + dz / l * b;
  }
  g.computeVertexNormals();
  return g;
}

function mergeParts(parts) {
  var geos = [], total = 0, i, pt, g;
  for (i = 0; i < parts.length; i++) {
    pt = parts[i];
    g = pt.g.index ? pt.g.toNonIndexed() : pt.g.clone();
    var s = pt.s === undefined ? 1 : pt.s;
    if (typeof s === 'number') s = [s, s, s];
    var p = pt.p || [0, 0, 0], r = pt.r || [0, 0, 0];
    _e.set(r[0], r[1], r[2]);
    _m4.compose(_v3.set(p[0], p[1], p[2]), _q.setFromEuler(_e), _v3b.set(s[0], s[1], s[2]));
    g.applyMatrix4(_m4);
    if (!g.attributes.normal) g.computeVertexNormals();
    bakeColor(g, pt.c === undefined ? 0xffffff : pt.c);
    geos.push(g);
    total += g.attributes.position.count;
  }
  var pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  var o = 0;
  for (i = 0; i < geos.length; i++) {
    g = geos[i];
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  var out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// a lumpy low-poly rock: icosahedron with the vertices kicked around
function rockGeo(rng, r, detail) {
  var g = new THREE.IcosahedronGeometry(r, detail === undefined ? 0 : detail).toNonIndexed();
  var p = g.attributes.position.array, i, k = {};
  for (i = 0; i < p.length; i += 3) {
    var key = (p[i] * 12 | 0) + '_' + (p[i + 1] * 12 | 0) + '_' + (p[i + 2] * 12 | 0);
    if (!k[key]) k[key] = [rngRange(rng, 0.68, 1.3), rngRange(rng, 0.6, 1.15), rngRange(rng, 0.68, 1.3)];
    p[i] *= k[key][0]; p[i + 1] *= k[key][1]; p[i + 2] *= k[key][2];
  }
  g.computeVertexNormals();
  return g;
}

var MAT = {};
function initMaterials() {
  MAT.solid = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.solidS = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  MAT.shiny = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 60, specular: 0x777777 });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  MAT.flame = new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.92 });
  MAT.flame2 = new THREE.MeshBasicMaterial({ color: 0xff5c1c, transparent: true, opacity: 0.75 });
}

// Scatter helper.  Instances are split into spatial buckets, each with its
// own bounding sphere, so the renderer can cull whole thickets of trees
// instead of pushing every instance on the mountain through the pipeline
// each frame.  The buckets share one set of GPU buffers.
function shareGeo(src, sphere) {
  var g = new THREE.BufferGeometry(), k;
  for (k in src.attributes) g.setAttribute(k, src.attributes[k]);
  if (src.index) g.setIndex(src.index);
  g.boundingSphere = sphere;
  return g;
}

var SCATTER_CELL = 84;
function scatter(geo, mat, list, tintFn, opts) {
  opts = opts || {};
  var group = new THREE.Group();
  if (!list.length) return group;
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  // every shared material draws with vertexColors, and an absent colour
  // attribute reads as zero - i.e. a solid black prop
  if (!geo.attributes.color) bakeColor(geo, 0xffffff);
  var baseR = geo.boundingSphere.radius;

  var cells = {}, i, it, key;
  for (i = 0; i < list.length; i++) {
    it = list[i];
    key = Math.floor(it.x / SCATTER_CELL) + ',' + Math.floor(it.z / SCATTER_CELL);
    (cells[key] || (cells[key] = [])).push(it);
  }

  var m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  var col = new THREE.Color();
  for (key in cells) {
    var items = cells[key];
    var cx = 0, cy = 0, cz = 0, maxS = 1;
    for (i = 0; i < items.length; i++) { cx += items[i].x; cy += items[i].y; cz += items[i].z; }
    cx /= items.length; cy /= items.length; cz /= items.length;
    var rad = 0;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      var sc = it.sy || it.s || 1;
      if (sc > maxS) maxS = sc;
      var d = Math.sqrt(Math.pow(it.x - cx, 2) + Math.pow(it.y - cy, 2) + Math.pow(it.z - cz, 2));
      if (d > rad) rad = d;
    }
    var sphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), rad + baseR * maxS * 1.6);
    var im = new THREE.InstancedMesh(shareGeo(geo, sphere), mat, items.length);
    im.userData.cx = cx; im.userData.cy = cy; im.userData.cz = cz; im.userData.rad = sphere.radius;
    if (opts.fade) im.userData.fade = opts.fade;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      e.set(it.rx || 0, it.ry || 0, it.rz || 0);
      m.compose(_v3.set(it.x, it.y, it.z), q.setFromEuler(e),
        _v3b.set(it.sx || it.s || 1, it.sy || it.s || 1, it.sz || it.s || 1));
      im.setMatrixAt(i, m);
      // Always write an instance colour, even when it is plain white.  A
      // material shared between instanced meshes that do and do not carry
      // one makes the renderer bind a colour buffer that is not there.
      if (tintFn) col.setRGB.apply(col, tintFn(it, i)); else col.setRGB(1, 1, 1);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.castShadow = !!opts.shadow;
    im.receiveShadow = !!opts.receive;
    group.add(im);
  }
  return group;
}
