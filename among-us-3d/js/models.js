/* ============================================================
   AMONG US 3D — MODELS
   Procedural crewmate: bean body, visor, backpack, stub legs,
   plus hats / visors / skins / pets. Toon shaded with a
   black backface outline shell for the cartoon look.
   ============================================================ */
(function (AU) {
'use strict';

var T = window.THREE;

/* ---------------- shared materials ---------------- */
var gradTex = null;
function gradientMap() {
  if (gradTex) return gradTex;
  var d = new Uint8Array([80, 80, 150, 150, 205, 205, 255, 255]);
  gradTex = new T.DataTexture(d, d.length, 1, T.LuminanceFormat);
  gradTex.minFilter = gradTex.magFilter = T.NearestFilter;
  gradTex.generateMipmaps = false;
  gradTex.needsUpdate = true;
  return gradTex;
}
var matCache = {};
function toon(hex, opts) {
  opts = opts || {};
  var key = hex + '|' + (opts.transparent ? 't' : '') + (opts.emissive || '') + (opts.flat ? 'f' : '');
  if (matCache[key] && !opts.unique) return matCache[key];
  var m = new T.MeshToonMaterial({
    color: hex,
    gradientMap: gradientMap(),
    transparent: !!opts.transparent,
    opacity: opts.opacity != null ? opts.opacity : 1
  });
  if (opts.emissive) m.emissive = new T.Color(opts.emissive);
  if (!opts.unique) matCache[key] = m;
  return m;
}
AU.toonMat = toon;
var flatCache = {};
function flat(hex) {
  if (!flatCache[hex]) flatCache[hex] = new T.MeshBasicMaterial({ color: hex });
  return flatCache[hex];
}
var OUTLINE_MAT = new T.MeshBasicMaterial({ color: 0x0a0d16, side: T.BackSide });

function shade(hex, amt) {
  var c = new T.Color(hex);
  c.offsetHSL(0, 0, amt);
  return c.getHex();
}
AU.shadeHex = shade;

/* ---------------- geometry helpers ---------------- */
function roundedBoxGeo(w, h, d, r) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  var s = new T.Shape();
  var x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  var bev = Math.min(0.05, d / 3);
  var g = new T.ExtrudeGeometry(s, {
    depth: Math.max(0.01, d - bev * 2), bevelEnabled: true,
    bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 8
  });
  g.translate(0, 0, -d / 2 + bev);
  return g;
}
AU.roundedBoxGeo = roundedBoxGeo;

/* The crewmate silhouette: radius as a function of height (0..1). */
var BODY_PROFILE = [
  [0.000, 0.000], [0.012, 0.215], [0.035, 0.325], [0.075, 0.405], [0.135, 0.455],
  [0.220, 0.487], [0.330, 0.500], [0.450, 0.503], [0.560, 0.500], [0.660, 0.492],
  [0.745, 0.478], [0.815, 0.458], [0.875, 0.428], [0.925, 0.383], [0.962, 0.315],
  [0.986, 0.212], [1.000, 0.000]
];
var BODY_H = 1.30;      // lathe height
var LEG_H  = 0.34;      // stub legs beneath the body
var BODY_Y = LEG_H;     // body origin
var TOP_Y  = BODY_Y + BODY_H;

var bodyGeo = null;
function bodyGeometry() {
  if (bodyGeo) return bodyGeo;
  var pts = [];
  for (var i = 0; i < BODY_PROFILE.length; i++)
    pts.push(new T.Vector2(BODY_PROFILE[i][1], BODY_PROFILE[i][0] * BODY_H));
  bodyGeo = new T.LatheGeometry(pts, 22);
  bodyGeo.scale(1, 1, 0.82);            // flatten front-to-back like the sprite
  return bodyGeo;
}
/* A band of the body used for skins (shirts / suits). */
function bandGeometry(y0, y1, inflate) {
  var pts = [];
  for (var i = 0; i < BODY_PROFILE.length; i++) {
    var t = BODY_PROFILE[i][0];
    if (t < y0 - 0.001 || t > y1 + 0.001) continue;
    pts.push(new T.Vector2(BODY_PROFILE[i][1] * (1 + inflate), t * BODY_H));
  }
  if (pts.length < 2) return null;
  var g = new T.LatheGeometry(pts, 22);
  g.scale(1, 1, 0.82);
  return g;
}

function legGeometry() {
  var pts = [
    new T.Vector2(0.000, 0.000), new T.Vector2(0.070, 0.005), new T.Vector2(0.120, 0.022),
    new T.Vector2(0.152, 0.055), new T.Vector2(0.165, 0.100), new T.Vector2(0.170, 0.170),
    new T.Vector2(0.172, 0.260), new T.Vector2(0.172, LEG_H), new T.Vector2(0.000, LEG_H)
  ];
  var g = new T.LatheGeometry(pts, 14);
  g.scale(1, 1, 1.18);
  return g;
}
var legGeo = null;

/* Visor: a rounded-rectangle patch mapped onto an ellipsoid so it hugs the
   head the way the sprite's visor does, with soft corners instead of a
   sliced-sphere's square ones. */
function visorPatchGeometry(phiHalf, thetaMid, thetaHalf, corner, seg, rings) {
  seg = seg || 48; rings = rings || 5;
  corner = corner == null ? 0.62 : corner;
  var n = 2 / Math.max(0.05, corner);
  var outline = [];
  for (var i = 0; i < seg; i++) {
    var a = i / seg * Math.PI * 2;
    var cx = Math.cos(a), cy = Math.sin(a);
    var d = Math.pow(Math.pow(Math.abs(cx), n) + Math.pow(Math.abs(cy), n), -1 / n);
    outline.push([cx * d * Math.SQRT2, cy * d * Math.SQRT2]);
  }
  function toXYZ(u, v) {
    var phi = Math.PI / 2 + Math.max(-1, Math.min(1, u)) * phiHalf;
    var theta = thetaMid - Math.max(-1, Math.min(1, v)) * thetaHalf;
    return [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)];
  }
  var pos = [], nor = [], idx = [];
  function push(u, v) {
    var q = toXYZ(u, v);
    pos.push(q[0], q[1], q[2]); nor.push(q[0], q[1], q[2]);
    return pos.length / 3 - 1;
  }
  var centre = push(0, 0);
  var rows = [];
  for (var r = 1; r <= rings; r++) {
    var t = r / rings, row = [];
    for (var k = 0; k < seg; k++) row.push(push(outline[k][0] * t, outline[k][1] * t));
    rows.push(row);
  }
  for (var k2 = 0; k2 < seg; k2++) {
    var k3 = (k2 + 1) % seg;
    idx.push(centre, rows[0][k2], rows[0][k3]);
  }
  for (var r2 = 0; r2 < rings - 1; r2++) {
    for (var k4 = 0; k4 < seg; k4++) {
      var k5 = (k4 + 1) % seg;
      idx.push(rows[r2][k4], rows[r2 + 1][k4], rows[r2 + 1][k5]);
      idx.push(rows[r2][k4], rows[r2 + 1][k5], rows[r2][k5]);
    }
  }
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
var visorGeo = null, visorRimGeo = null;
function visorGeometry() {
  if (!visorGeo) visorGeo = visorPatchGeometry(0.84, Math.PI * 0.5 - 0.06, 0.30, 0.66);
  return visorGeo;
}
function visorRimGeometry() {
  if (!visorRimGeo) visorRimGeo = visorPatchGeometry(0.955, Math.PI * 0.5 - 0.06, 0.355, 0.66);
  return visorRimGeo;
}

function outlineOf(mesh, scale) {
  var o = new T.Mesh(mesh.geometry, OUTLINE_MAT);
  o.scale.multiplyScalar(scale || 1.055);
  o.userData.outline = true;
  return o;
}

/* ============================================================
   HATS
   ============================================================ */
var HAT_BUILDERS = {
  none: function () { return null; },

  cap: function (g, col) {
    var m = toon(0xE23B3B);
    var dome = new T.Mesh(new T.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m);
    dome.scale.set(1, 0.75, 1); g.add(dome);
    var brim = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.035, 16, 1, false, 0, Math.PI), m);
    brim.position.set(0, 0.01, -0.16); brim.scale.set(1, 1, 1.35); brim.rotation.y = Math.PI; g.add(brim);
    var btn = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), toon(0xffffff));
    btn.position.y = 0.26; g.add(btn);
    return g;
  },
  fedora: function (g) {
    var m = toon(0x39404E);
    var brim = new T.Mesh(new T.CylinderGeometry(0.52, 0.56, 0.04, 20), m);
    brim.position.y = 0.02; g.add(brim);
    var crown = new T.Mesh(new T.CylinderGeometry(0.3, 0.33, 0.28, 20), m);
    crown.position.y = 0.16; g.add(crown);
    var band = new T.Mesh(new T.CylinderGeometry(0.335, 0.335, 0.07, 20), toon(0x151a24));
    band.position.y = 0.06; g.add(band);
    var dent = new T.Mesh(new T.SphereGeometry(0.14, 10, 8), m);
    dent.position.y = 0.3; dent.scale.set(1.6, 0.5, 1); g.add(dent);
    return g;
  },
  party: function (g) {
    var cone = new T.Mesh(new T.ConeGeometry(0.26, 0.55, 14), toon(0xED54BA));
    cone.position.y = 0.28; g.add(cone);
    var ball = new T.Mesh(new T.SphereGeometry(0.075, 10, 8), toon(0xF5F557));
    ball.position.y = 0.58; g.add(ball);
    for (var i = 0; i < 3; i++) {
      var r = new T.Mesh(new T.TorusGeometry(0.2 - i * 0.055, 0.018, 6, 16), toon(0x38FEDC));
      r.rotation.x = Math.PI / 2; r.position.y = 0.15 + i * 0.13; g.add(r);
    }
    return g;
  },
  beanie: function (g) {
    var m = toon(0x2E6BE6);
    var dome = new T.Mesh(new T.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), m);
    dome.scale.set(1, 0.85, 1); g.add(dome);
    var cuff = new T.Mesh(new T.CylinderGeometry(0.37, 0.37, 0.1, 18), toon(0xD6E0F0));
    cuff.position.y = 0.03; g.add(cuff);
    var pom = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), toon(0xD6E0F0));
    pom.position.y = 0.32; g.add(pom);
    return g;
  },
  headphones: function (g) {
    var band = new T.Mesh(new T.TorusGeometry(0.38, 0.045, 8, 20, Math.PI), toon(0x2b3140));
    band.rotation.y = Math.PI / 2; band.position.y = 0.02; g.add(band);
    [-1, 1].forEach(function (s) {
      var cup = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, 0.09, 14), toon(0x1c2130));
      cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.38, 0.0, 0); g.add(cup);
      var pad = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.1, 14), toon(0xED54BA));
      pad.rotation.z = Math.PI / 2; pad.position.set(s * 0.42, 0, 0); g.add(pad);
    });
    return g;
  },
  antenna: function (g) {
    var base = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 0.07, 12), toon(0x39404E));
    base.position.y = 0.03; g.add(base);
    var rod = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.42, 8), toon(0x8397A7));
    rod.position.y = 0.26; g.add(rod);
    var ball = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), toon(0xC51111, { emissive: 0x330000 }));
    ball.position.y = 0.48; g.add(ball);
    return g;
  },
  flower: function (g) {
    var stem = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.2, 6), toon(0x117F2D));
    stem.position.set(0.16, 0.1, 0.05); stem.rotation.z = -0.25; g.add(stem);
    for (var i = 0; i < 6; i++) {
      var p = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), toon(0xFFD6EC));
      p.scale.set(1, 0.42, 1.35);
      var a = i / 6 * Math.PI * 2;
      p.position.set(0.19 + Math.cos(a) * 0.085, 0.22, 0.05 + Math.sin(a) * 0.085);
      g.add(p);
    }
    var mid = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), toon(0xF5F557));
    mid.position.set(0.19, 0.24, 0.05); g.add(mid);
    return g;
  },
  banana: function (g) {
    var curve = new T.CatmullRomCurve3([
      new T.Vector3(-0.22, 0.02, 0), new T.Vector3(-0.08, 0.22, 0),
      new T.Vector3(0.08, 0.22, 0),  new T.Vector3(0.22, 0.02, 0)
    ]);
    var tube = new T.Mesh(new T.TubeGeometry(curve, 16, 0.075, 8, false), toon(0xF5F557));
    g.add(tube);
    var tip = new T.Mesh(new T.SphereGeometry(0.055, 8, 6), toon(0x71491E));
    tip.position.set(-0.23, 0.02, 0); g.add(tip);
    return g;
  },
  egg: function (g) {
    var e = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), toon(0xFFFFF2));
    e.scale.set(1, 1.25, 1); e.position.y = 0.16; g.add(e);
    var y = new T.Mesh(new T.SphereGeometry(0.1, 12, 10), toon(0xF5C842));
    y.scale.set(1, 0.5, 1); y.position.y = 0.36; g.add(y);
    return g;
  },
  tp: function (g) {
    var roll = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.24, 18), toon(0xFFFFFF));
    roll.position.y = 0.14; g.add(roll);
    var hole = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.26, 12), toon(0x9a9a9a));
    hole.position.y = 0.14; g.add(hole);
    var sheet = new T.Mesh(new T.BoxGeometry(0.2, 0.3, 0.012), toon(0xFFFFFF));
    sheet.position.set(0.0, 0.06, 0.23); sheet.rotation.x = 0.2; g.add(sheet);
    return g;
  },
  plunger: function (g) {
    var cup = new T.Mesh(new T.CylinderGeometry(0.22, 0.16, 0.2, 16), toon(0xC51111));
    cup.position.y = 0.09; g.add(cup);
    var stick = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.5, 10), toon(0x71491E));
    stick.position.y = 0.42; g.add(stick);
    return g;
  },
  cheese: function (g) {
    var s = new T.Shape();
    s.moveTo(-0.28, -0.14); s.lineTo(0.28, -0.14); s.lineTo(0, 0.24); s.lineTo(-0.28, -0.14);
    var geo = new T.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
    geo.translate(0, 0, -0.11);
    var m = new T.Mesh(geo, toon(0xF5C842));
    m.position.y = 0.16; g.add(m);
    [[0.1, 0.02], [-0.09, -0.03], [0.0, 0.12]].forEach(function (p) {
      var h = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), toon(0xD8A62F));
      h.position.set(p[0], 0.16 + p[1], 0.12); g.add(h);
    });
    return g;
  },
  halo: function (g) {
    var r = new T.Mesh(new T.TorusGeometry(0.26, 0.045, 10, 24),
      toon(0xF5F557, { emissive: 0x554400 }));
    r.rotation.x = Math.PI / 2; r.position.y = 0.34; g.add(r);
    return g;
  },
  crown: function (g) {
    var m = toon(0xF5C842);
    var band = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.12, 18), m);
    band.position.y = 0.07; g.add(band);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      var sp = new T.Mesh(new T.ConeGeometry(0.07, 0.2, 8), m);
      sp.position.set(Math.cos(a) * 0.28, 0.2, Math.sin(a) * 0.28); g.add(sp);
      var gem = new T.Mesh(new T.SphereGeometry(0.04, 8, 6), toon(i % 2 ? 0xC51111 : 0x2E6BE6));
      gem.position.set(Math.cos(a) * 0.32, 0.08, Math.sin(a) * 0.32); g.add(gem);
    }
    return g;
  },
  pilot: function (g) {
    var m = toon(0x2b3140);
    var cap = new T.Mesh(new T.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m);
    cap.scale.set(1, 0.68, 1); g.add(cap);
    var brim = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.04, 16, 1, false, 0, Math.PI), toon(0x15192a));
    brim.position.set(0, 0.02, 0.14); brim.scale.set(1, 1, 1.4); g.add(brim);
    var badge = new T.Mesh(new T.CircleGeometry(0.07, 12), toon(0xF5C842));
    badge.position.set(0, 0.16, 0.3); g.add(badge);
    return g;
  },
  mini: function (g, col) {
    var mini = buildCrewmate({ color: col || 'red', hat: 'none', visor: 'none', skin: 'none' },
      { scale: 0.26, outline: false, noPet: true });
    mini.position.y = 0.06; g.add(mini);
    return g;
  },
  ufo: function (g) {
    var body = new T.Mesh(new T.SphereGeometry(0.3, 18, 10), toon(0x8397A7));
    body.scale.set(1, 0.28, 1); body.position.y = 0.36; g.add(body);
    var dome = new T.Mesh(new T.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      toon(0x38FEDC, { transparent: true, opacity: 0.75 }));
    dome.position.y = 0.4; g.add(dome);
    var beam = new T.Mesh(new T.CylinderGeometry(0.05, 0.24, 0.32, 14, 1, true),
      toon(0x50EF39, { transparent: true, opacity: 0.28 }));
    beam.position.y = 0.18; g.add(beam);
    return g;
  },
  astro: function (g, col) {
    var helm = new T.Mesh(new T.SphereGeometry(0.42, 20, 16),
      new T.MeshPhysicalMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.32,
        roughness: 0.05, metalness: 0, clearcoat: 1 }));
    helm.position.y = 0.02; g.add(helm);
    var ring = new T.Mesh(new T.TorusGeometry(0.4, 0.05, 8, 22), toon(0xD6E0F0));
    ring.rotation.x = Math.PI / 2; ring.position.y = -0.1; g.add(ring);
    return g;
  },
  horns: function (g) {
    [-1, 1].forEach(function (s) {
      var curve = new T.CatmullRomCurve3([
        new T.Vector3(s * 0.2, 0.0, 0), new T.Vector3(s * 0.3, 0.16, -0.02),
        new T.Vector3(s * 0.26, 0.32, -0.06)
      ]);
      var h = new T.Mesh(new T.TubeGeometry(curve, 10, 0.06, 8, false), toon(0xC51111));
      g.add(h);
      var tip = new T.Mesh(new T.ConeGeometry(0.055, 0.12, 8), toon(0x7A0838));
      tip.position.set(s * 0.26, 0.38, -0.07); tip.rotation.z = -s * 0.3; g.add(tip);
    });
    return g;
  },
  wizard: function (g) {
    var m = toon(0x4B2A87);
    var brim = new T.Mesh(new T.CylinderGeometry(0.5, 0.54, 0.04, 20), m);
    g.add(brim);
    var cone = new T.Mesh(new T.ConeGeometry(0.3, 0.72, 16), m);
    cone.position.y = 0.36; cone.rotation.z = 0.12; g.add(cone);
    for (var i = 0; i < 4; i++) {
      var st = new T.Mesh(new T.SphereGeometry(0.035, 6, 5), toon(0xF5F557, { emissive: 0x443300 }));
      st.position.set((Math.random() - 0.5) * 0.4, 0.15 + Math.random() * 0.45, 0.22 - Math.random() * 0.1);
      g.add(st);
    }
    return g;
  },
  leaf: function (g) {
    for (var i = 0; i < 3; i++) {
      var l = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), toon(0x2E9F3D));
      l.scale.set(1, 0.16, 0.5);
      l.rotation.y = i * 2.1; l.rotation.z = 0.35;
      l.position.y = 0.06 + i * 0.05; g.add(l);
    }
    var stem = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 6), toon(0x71491E));
    stem.position.y = 0.2; g.add(stem);
    return g;
  },
  goggleshat: function (g) {
    var strap = new T.Mesh(new T.TorusGeometry(0.4, 0.04, 8, 22), toon(0x2b3140));
    strap.rotation.x = Math.PI / 2; strap.position.y = 0.0; strap.scale.set(1, 1, 0.85); g.add(strap);
    [-1, 1].forEach(function (s) {
      var lens = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.07, 14), toon(0xF5C842));
      lens.rotation.x = Math.PI / 2; lens.position.set(s * 0.15, 0.06, 0.36); g.add(lens);
    });
    return g;
  },
  bandana: function (g) {
    var b = new T.Mesh(new T.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), toon(0xC51111));
    b.scale.set(1, 0.8, 1); b.position.y = -0.02; g.add(b);
    var knot = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), toon(0xC51111));
    knot.position.set(0, 0.02, -0.36); g.add(knot);
    var tail = new T.Mesh(new T.ConeGeometry(0.07, 0.28, 6), toon(0xC51111));
    tail.position.set(0, -0.08, -0.44); tail.rotation.x = -0.6; g.add(tail);
    return g;
  }
};

/* ============================================================
   FACE VISORS (accessories drawn over the standard visor)
   ============================================================ */
var VISOR_BUILDERS = {
  none: function () { return null; },
  geek: function (g) {
    [-1, 1].forEach(function (s) {
      var r = new T.Mesh(new T.TorusGeometry(0.1, 0.022, 8, 18), toon(0x2b3140));
      r.position.set(s * 0.12, 0, 0.005); g.add(r);
      var l = new T.Mesh(new T.CircleGeometry(0.095, 14), toon(0xdff3ff, { transparent: true, opacity: 0.4 }));
      l.position.set(s * 0.12, 0, 0); g.add(l);
    });
    var br = new T.Mesh(new T.BoxGeometry(0.06, 0.02, 0.02), toon(0x2b3140)); g.add(br);
    return g;
  },
  shades: function (g) {
    var f = new T.Mesh(roundedBoxGeo(0.46, 0.13, 0.04, 0.05), toon(0x14171f));
    g.add(f);
    var br = new T.Mesh(new T.BoxGeometry(0.5, 0.03, 0.03), toon(0x14171f));
    br.position.y = 0.075; g.add(br);
    return g;
  },
  ski: function (g) {
    var f = new T.Mesh(roundedBoxGeo(0.5, 0.2, 0.06, 0.08), toon(0x2b3140));
    g.add(f);
    var lens = new T.Mesh(roundedBoxGeo(0.42, 0.13, 0.02, 0.06), toon(0xEF7D0D, { emissive: 0x331500 }));
    lens.position.z = 0.03; g.add(lens);
    return g;
  },
  monocle: function (g) {
    var r = new T.Mesh(new T.TorusGeometry(0.11, 0.02, 8, 20), toon(0xF5C842));
    r.position.set(0.12, 0.01, 0.01); g.add(r);
    var l = new T.Mesh(new T.CircleGeometry(0.105, 16), toon(0xdff3ff, { transparent: true, opacity: 0.35 }));
    l.position.set(0.12, 0.01, 0); g.add(l);
    var ch = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.22, 6), toon(0xF5C842));
    ch.position.set(0.2, -0.1, 0); ch.rotation.z = 0.4; g.add(ch);
    return g;
  },
  eyepatch: function (g) {
    var p = new T.Mesh(roundedBoxGeo(0.19, 0.16, 0.03, 0.05), toon(0x14171f));
    p.position.set(-0.12, 0.01, 0.01); g.add(p);
    var s = new T.Mesh(new T.BoxGeometry(0.6, 0.025, 0.02), toon(0x14171f));
    s.position.y = 0.09; s.rotation.z = 0.12; g.add(s);
    return g;
  },
  bandage: function (g) {
    var b = new T.Mesh(roundedBoxGeo(0.22, 0.09, 0.02, 0.03), toon(0xFFE9C9));
    b.position.set(0.1, 0.05, 0.01); b.rotation.z = -0.4; g.add(b);
    var b2 = b.clone(); b2.rotation.z = 0.4; g.add(b2);
    return g;
  },
  angry: function (g) {
    [-1, 1].forEach(function (s) {
      var br = new T.Mesh(new T.BoxGeometry(0.17, 0.04, 0.025), toon(0x14171f));
      br.position.set(s * 0.12, 0.07, 0.01); br.rotation.z = -s * 0.5; g.add(br);
    });
    return g;
  },
  cateye: function (g) {
    [-1, 1].forEach(function (s) {
      var e = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), toon(0xF5F557));
      e.scale.set(1, 1.25, 0.3); e.position.set(s * 0.12, 0.0, 0.02); g.add(e);
      var p = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), toon(0x14171f));
      p.scale.set(0.5, 1.5, 0.4); p.position.set(s * 0.12, 0, 0.04); g.add(p);
    });
    return g;
  },
  scanner: function (g) {
    var bar = new T.Mesh(roundedBoxGeo(0.44, 0.045, 0.03, 0.02),
      toon(0x38FEDC, { emissive: 0x0a4d4d }));
    bar.position.y = 0.02; g.add(bar);
    var side = new T.Mesh(new T.BoxGeometry(0.05, 0.11, 0.05), toon(0x2b3140));
    side.position.set(0.24, 0.0, 0); g.add(side);
    return g;
  }
};

/* ============================================================
   SKINS (body overlays)
   ============================================================ */
var SKIN_BUILDERS = {
  none: function () { return null; },
  mechanic: function (g) {
    addBand(g, 0.04, 0.60, 0xEF7D0D, 0.012);
    addStrap(g, 0x8B4A0A, 0.5);
    addPocket(g, 0xB35F0C, 0.3);
    return g;
  },
  military: function (g) {
    addBand(g, 0.04, 0.60, 0x4A5A32, 0.012);
    addPocket(g, 0x3B4A28, 0.38);
    addBadge(g, 0xF5C842, 0.55, 0.15);
    return g;
  },
  police: function (g) {
    addBand(g, 0.04, 0.62, 0x1B2A63, 0.012);
    addBadge(g, 0xF5C842, 0.55, -0.14);
    addBand(g, 0.54, 0.62, 0x0E1740, 0.016);
    return g;
  },
  science: function (g) {
    addBand(g, 0.02, 0.62, 0xF2F5FA, 0.012);
    addPocket(g, 0xDCE6F5, 0.42);
    addBand(g, 0.46, 0.5, 0x38FEDC, 0.02);
    return g;
  },
  suit: function (g) {
    addBand(g, 0.04, 0.62, 0x1A1D26, 0.012);
    var tie = new T.Mesh(roundedBoxGeo(0.08, 0.3, 0.02, 0.02), toon(0xC51111));
    tie.position.set(0, BODY_Y + BODY_H * 0.6, 0.4); g.add(tie);
    var shirt = new T.Mesh(roundedBoxGeo(0.16, 0.24, 0.02, 0.03), toon(0xF2F5FA));
    shirt.position.set(0, BODY_Y + BODY_H * 0.66, 0.39); g.add(shirt);
    return g;
  },
  captain: function (g) {
    addBand(g, 0.04, 0.62, 0x14213D, 0.012);
    addBadge(g, 0xF5C842, 0.56, -0.14);
    for (var i = 0; i < 3; i++) addBand(g, 0.2 + i * 0.05, 0.225 + i * 0.05, 0xF5C842, 0.018);
    return g;
  },
  prisoner: function (g) {
    for (var i = 0; i < 6; i++)
      addBand(g, 0.05 + i * 0.095, 0.10 + i * 0.095, i % 2 ? 0xF2F5FA : 0x1A1D26, 0.014);
    return g;
  },
  astronaut: function (g) {
    addBand(g, 0.02, 0.62, 0xE8EEF8, 0.014);
    addBand(g, 0.4, 0.46, 0x2E6BE6, 0.02);
    addPocket(g, 0xC7D4E8, 0.3);
    var hose = new T.Mesh(new T.TorusGeometry(0.16, 0.03, 6, 14, Math.PI), toon(0x8397A7));
    hose.position.set(0.28, BODY_Y + BODY_H * 0.55, -0.2); hose.rotation.y = 1.2; g.add(hose);
    return g;
  },
  wallguard: function (g) {
    addBand(g, 0.04, 0.60, 0x6B7280, 0.012);
    var plate = new T.Mesh(roundedBoxGeo(0.5, 0.42, 0.08, 0.06), toon(0x9AA5B4));
    plate.position.set(0, BODY_Y + BODY_H * 0.5, 0.3); g.add(plate);
    return g;
  },
  diver: function (g) {
    addBand(g, 0.02, 0.62, 0x123A55, 0.014);
    addBand(g, 0.5, 0.56, 0xF5C842, 0.02);
    var tank = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.5, 12), toon(0xC7D4E8));
    tank.position.set(0, BODY_Y + BODY_H * 0.55, -0.44); g.add(tank);
    return g;
  },
  tarmac: function (g) {
    addBand(g, 0.04, 0.60, 0x2F3540, 0.012);
    addBand(g, 0.3, 0.36, 0xF5C842, 0.018);
    addBand(g, 0.42, 0.48, 0xF5C842, 0.018);
    return g;
  }
};
function addBand(g, y0, y1, hex, inflate) {
  var geo = bandGeometry(y0, y1, inflate);
  if (!geo) return;
  var m = new T.Mesh(geo, toon(hex));
  m.position.y = BODY_Y; g.add(m);
}
function addStrap(g, hex, t) {
  [-1, 1].forEach(function (s) {
    var st = new T.Mesh(roundedBoxGeo(0.09, 0.42, 0.03, 0.02), toon(hex));
    st.position.set(s * 0.17, BODY_Y + BODY_H * t + 0.1, 0.4); g.add(st);
  });
}
function addPocket(g, hex, t) {
  var p = new T.Mesh(roundedBoxGeo(0.17, 0.14, 0.03, 0.03), toon(hex));
  p.position.set(0.16, BODY_Y + BODY_H * t, 0.4); g.add(p);
  var p2 = p.clone(); p2.position.x = -0.16; g.add(p2);
}
function addBadge(g, hex, t, x) {
  var b = new T.Mesh(new T.CircleGeometry(0.055, 10), toon(hex));
  b.position.set(x, BODY_Y + BODY_H * t, 0.41); g.add(b);
}

/* ============================================================
   PETS
   ============================================================ */
var PET_BUILDERS = {
  none: function () { return null; },
  minicrew: function (g, col) {
    g.add(buildCrewmate({ color: col, hat: 'none', visor: 'none', skin: 'none' },
      { scale: 0.33, outline: false, noPet: true }));
    return g;
  },
  dog: function (g) {
    var m = toon(0xB07A3E);
    var body = new T.Mesh(roundedBoxGeo(0.3, 0.22, 0.42, 0.09), m);
    body.position.y = 0.24; g.add(body);
    var head = new T.Mesh(roundedBoxGeo(0.24, 0.22, 0.22, 0.08), m);
    head.position.set(0, 0.36, 0.24); g.add(head);
    var sn = new T.Mesh(roundedBoxGeo(0.12, 0.1, 0.12, 0.04), toon(0x8A5A28));
    sn.position.set(0, 0.31, 0.36); g.add(sn);
    [-1, 1].forEach(function (s) {
      var ear = new T.Mesh(roundedBoxGeo(0.07, 0.16, 0.05, 0.03), toon(0x8A5A28));
      ear.position.set(s * 0.11, 0.45, 0.22); g.add(ear);
      var e = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), toon(0x14171f));
      e.position.set(s * 0.06, 0.39, 0.35); g.add(e);
    });
    for (var i = 0; i < 4; i++) {
      var leg = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.16, 8), m);
      leg.position.set((i % 2 ? 1 : -1) * 0.1, 0.08, (i < 2 ? 1 : -1) * 0.13); g.add(leg);
    }
    var tail = new T.Mesh(new T.CylinderGeometry(0.03, 0.02, 0.2, 6), m);
    tail.position.set(0, 0.32, -0.22); tail.rotation.x = -0.7; g.add(tail);
    return g;
  },
  hamster: function (g) {
    var b = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), toon(0xE0B77A));
    b.position.y = 0.2; b.scale.set(1, 0.9, 1.05); g.add(b);
    var bel = new T.Mesh(new T.SphereGeometry(0.14, 12, 10), toon(0xFFF0D6));
    bel.position.set(0, 0.17, 0.1); g.add(bel);
    [-1, 1].forEach(function (s) {
      var ear = new T.Mesh(new T.CircleGeometry(0.06, 10), toon(0xC79A5C));
      ear.position.set(s * 0.12, 0.36, 0); ear.rotation.y = s * 0.4; g.add(ear);
      var e = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), toon(0x14171f));
      e.position.set(s * 0.07, 0.22, 0.19); g.add(e);
    });
    return g;
  },
  ufo: function (g) {
    var body = new T.Mesh(new T.SphereGeometry(0.26, 18, 10), toon(0x8397A7));
    body.scale.set(1, 0.3, 1); body.position.y = 0.5; g.add(body);
    var dome = new T.Mesh(new T.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      toon(0x38FEDC, { transparent: true, opacity: 0.7 }));
    dome.position.y = 0.54; g.add(dome);
    for (var i = 0; i < 5; i++) {
      var l = new T.Mesh(new T.SphereGeometry(0.028, 6, 5), toon(0xF5F557, { emissive: 0x444400 }));
      var a = i / 5 * Math.PI * 2;
      l.position.set(Math.cos(a) * 0.22, 0.46, Math.sin(a) * 0.22); g.add(l);
    }
    g.userData.float = true;
    return g;
  },
  slug: function (g) {
    var b = new T.Mesh(new T.SphereGeometry(0.19, 14, 12), toon(0xED54BA));
    b.scale.set(1, 0.8, 1.3); b.position.y = 0.16; g.add(b);
    var lobe = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), toon(0xC53C9A));
    lobe.position.set(0, 0.28, -0.05); g.add(lobe);
    [-1, 1].forEach(function (s) {
      var t = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.16, 6), toon(0xED54BA));
      t.position.set(s * 0.07, 0.3, 0.12); t.rotation.x = 0.4; g.add(t);
      var e = new T.Mesh(new T.SphereGeometry(0.032, 8, 6), toon(0xFFFFFF));
      e.position.set(s * 0.07, 0.38, 0.15); g.add(e);
    });
    return g;
  },
  robot: function (g) {
    var b = new T.Mesh(roundedBoxGeo(0.26, 0.28, 0.22, 0.05), toon(0x8397A7));
    b.position.y = 0.26; g.add(b);
    var h = new T.Mesh(roundedBoxGeo(0.22, 0.18, 0.2, 0.05), toon(0xB6C2D1));
    h.position.y = 0.48; g.add(h);
    var eye = new T.Mesh(roundedBoxGeo(0.15, 0.06, 0.02, 0.02), toon(0xC51111, { emissive: 0x330000 }));
    eye.position.set(0, 0.49, 0.11); g.add(eye);
    var an = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 0.12, 6), toon(0x555f70));
    an.position.y = 0.62; g.add(an);
    var ab = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), toon(0xF5F557, { emissive: 0x444400 }));
    ab.position.y = 0.69; g.add(ab);
    var tr = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.24, 10), toon(0x2b3140));
    tr.rotation.z = Math.PI / 2; tr.position.y = 0.09; g.add(tr);
    return g;
  },
  squig: function (g) {
    var b = new T.Mesh(new T.SphereGeometry(0.2, 14, 12), toon(0x50EF39));
    b.position.y = 0.24; b.scale.set(1, 1.1, 1); g.add(b);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      var t = new T.Mesh(new T.CylinderGeometry(0.026, 0.012, 0.2, 6), toon(0x2E9F3D));
      t.position.set(Math.cos(a) * 0.13, 0.08, Math.sin(a) * 0.13);
      t.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); g.add(t);
    }
    [-1, 1].forEach(function (s) {
      var e = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), toon(0xFFFFFF));
      e.position.set(s * 0.08, 0.3, 0.17); g.add(e);
      var p = new T.Mesh(new T.SphereGeometry(0.022, 8, 6), toon(0x14171f));
      p.position.set(s * 0.08, 0.3, 0.21); g.add(p);
    });
    return g;
  },
  ellie: function (g) {
    var b = new T.Mesh(new T.SphereGeometry(0.21, 14, 12), toon(0x9AA5B4));
    b.position.y = 0.24; g.add(b);
    var tr = new T.Mesh(new T.CylinderGeometry(0.05, 0.03, 0.3, 8), toon(0x9AA5B4));
    tr.position.set(0, 0.16, 0.22); tr.rotation.x = 1.1; g.add(tr);
    [-1, 1].forEach(function (s) {
      var ear = new T.Mesh(new T.CircleGeometry(0.12, 12), toon(0xB6C2D1));
      ear.position.set(s * 0.2, 0.28, 0); ear.rotation.y = s * 1.1; g.add(ear);
    });
    return g;
  }
};

/* ============================================================
   CREWMATE BUILDER
   ============================================================ */
function buildCrewmate(look, opts) {
  opts = opts || {};
  var col = AU.colorById(look.color || 'red');
  var root = new T.Group();
  var outline = opts.outline !== false;

  var bodyMat = toon(col.hex, { unique: true });
  var body = new T.Mesh(bodyGeometry(), bodyMat);
  body.position.y = BODY_Y;
  body.castShadow = true;
  root.add(body);
  if (outline) { var bo = outlineOf(body, 1.05); bo.position.y = BODY_Y; root.add(bo); }

  if (!legGeo) legGeo = legGeometry();
  var legs = new T.Group();
  [-1, 1].forEach(function (s) {
    var l = new T.Mesh(legGeo, bodyMat);
    l.position.set(s * 0.21, 0, 0);
    l.userData.side = s;
    legs.add(l);
    if (outline) { var lo = outlineOf(l, 1.08); lo.position.copy(l.position); lo.userData.side = s; legs.add(lo); }
  });
  root.add(legs);

  /* backpack */
  var packMat = toon(col.shadow, { unique: true });
  var pack = new T.Mesh(roundedBoxGeo(0.36, 0.66, 0.30, 0.12), packMat);
  pack.position.set(0, BODY_Y + BODY_H * 0.46, -0.44);
  root.add(pack);
  if (outline) { var po = outlineOf(pack, 1.06); po.position.copy(pack.position); root.add(po); }

  /* visor — flat sprite-like colours so it reads clearly at any distance */
  var visorGroup = new T.Group();
  visorGroup.position.set(0, BODY_Y + BODY_H * 0.70, 0);
  var rim = new T.Mesh(visorRimGeometry(), flat(0x4A6480));
  rim.scale.set(0.520, 0.500, 0.432);
  visorGroup.add(rim);
  var glass = new T.Mesh(visorGeometry(), flat(0xC2E4F5));
  glass.scale.set(0.520, 0.500, 0.455);
  visorGroup.add(glass);
  var hi = new T.Mesh(new T.SphereGeometry(0.052, 14, 10), flat(0xFFFFFF));
  hi.scale.set(1.75, 0.95, 0.26);
  hi.position.set(-0.132, 0.048, 0.412);
  hi.rotation.z = 0.26;
  visorGroup.add(hi);
  var hi2 = new T.Mesh(new T.SphereGeometry(0.030, 12, 8), flat(0xFFFFFF));
  hi2.scale.set(1.05, 1.05, 0.26);
  hi2.position.set(0.052, -0.030, 0.420);
  visorGroup.add(hi2);
  root.add(visorGroup);

  /* skin overlay */
  var skinId = look.skin || 'none';
  if (skinId !== 'none' && SKIN_BUILDERS[AU.cosmetic('skin', skinId).build])
    SKIN_BUILDERS[AU.cosmetic('skin', skinId).build](root, col.hex);

  /* face visor accessory */
  var visId = look.visor || 'none';
  var visDef = AU.cosmetic('visor', visId);
  if (visId !== 'none' && VISOR_BUILDERS[visDef.build]) {
    var vg = new T.Group();
    VISOR_BUILDERS[visDef.build](vg, col.hex);
    vg.position.set(0, BODY_Y + BODY_H * 0.70, 0.487);
    root.add(vg);
  }

  /* hat */
  var hatId = look.hat || 'none';
  var hatDef = AU.cosmetic('hat', hatId);
  if (hatId !== 'none' && HAT_BUILDERS[hatDef.build]) {
    var hg = new T.Group();
    HAT_BUILDERS[hatDef.build](hg, col.hex);
    hg.position.y = TOP_Y - 0.06;
    root.add(hg);
    root.userData.hat = hg;
  }

  root.userData.body = body;
  root.userData.legs = legs;
  root.userData.visor = visorGroup;
  root.userData.bodyMat = bodyMat;
  root.userData.packMat = packMat;
  root.userData.height = TOP_Y;

  if (opts.scale) root.scale.setScalar(opts.scale);
  return root;
}

function buildPet(look) {
  var petId = look.pet || 'none';
  if (petId === 'none') return null;
  var def = AU.cosmetic('pet', petId);
  if (!PET_BUILDERS[def.build]) return null;
  var g = new T.Group();
  PET_BUILDERS[def.build](g, AU.colorById(look.color).hex);
  return g;
}

/* Ghost: translucent crewmate with no legs and a wispy tail. */
function buildGhost(look) {
  var g = buildCrewmate(look, { outline: false });
  g.traverse(function (o) {
    if (o.isMesh) {
      var m = o.material.clone();
      m.transparent = true; m.opacity = 0.35; m.depthWrite = false;
      o.material = m;
    }
  });
  if (g.userData.legs) g.remove(g.userData.legs);
  var tail = new T.Mesh(new T.ConeGeometry(0.4, 0.5, 14),
    toon(AU.colorById(look.color).hex, { transparent: true, opacity: 0.22, unique: true }));
  tail.position.y = 0.18; tail.rotation.x = Math.PI;
  g.add(tail);
  return g;
}

/* Dead body: the classic folded-in-half crewmate with a bone. */
function buildDeadBody(look) {
  var root = new T.Group();
  var col = AU.colorById(look.color || 'red');
  var mat = toon(col.hex, { unique: true });
  var half = new T.Mesh(new T.SphereGeometry(0.42, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
  half.rotation.x = -Math.PI / 2;
  half.scale.set(1, 1, 0.85);
  half.position.set(0, 0.30, 0);
  root.add(half);
  var base = new T.Mesh(new T.CylinderGeometry(0.42, 0.44, 0.22, 18), mat);
  base.position.y = 0.11; root.add(base);
  var pack = new T.Mesh(roundedBoxGeo(0.3, 0.2, 0.34, 0.08), toon(col.shadow, { unique: true }));
  pack.position.set(0, 0.16, -0.34); root.add(pack);
  var bone = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.34, 8), toon(0xF2F5FA));
  bone.rotation.z = Math.PI / 2; bone.position.set(0.1, 0.42, 0.12); root.add(bone);
  [-1, 1].forEach(function (s) {
    var k = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), toon(0xF2F5FA));
    k.position.set(0.1 + s * 0.17, 0.42, 0.12); root.add(k);
  });
  var vis = new T.Mesh(visorGeometry(), toon(0x9fc0d6));
  vis.scale.set(0.42, 0.40, 0.42); vis.position.set(0, 0.26, 0.06); vis.rotation.x = -0.4;
  root.add(vis);
  root.userData.look = look;
  return root;
}

/* ============================================================
   AVATAR SNAPSHOTS (for DOM UI)
   ============================================================ */
var snapRenderer = null, snapScene = null, snapCam = null, snapCache = {};
function snapshot(look, w, h) {
  w = w || 128; h = h || 148;
  var key = [look.color, look.hat, look.visor, look.skin, look.pet, w, h].join('|');
  if (snapCache[key]) return snapCache[key];
  try {
    if (!snapRenderer) {
      snapRenderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      snapRenderer.setPixelRatio(1);
      snapScene = new T.Scene();
      var hemi = new T.HemisphereLight(0xffffff, 0x445566, 1.0);
      snapScene.add(hemi);
      var dir = new T.DirectionalLight(0xffffff, 0.9);
      dir.position.set(2, 4, 3); snapScene.add(dir);
      var dir2 = new T.DirectionalLight(0x9fc4ff, 0.4);
      dir2.position.set(-3, 1, -2); snapScene.add(dir2);
      snapCam = new T.PerspectiveCamera(26, w / h, 0.1, 50);
    }
    snapRenderer.setSize(w, h, false);
    snapCam.aspect = w / h; snapCam.updateProjectionMatrix();
    var g = buildCrewmate(look, {});
    var pet = buildPet(look);
    if (pet) { pet.position.set(-0.95, 0, 0.1); pet.scale.setScalar(0.85); g.add(pet); }
    g.rotation.y = 0.42;
    g.position.x = pet ? 0.28 : 0;
    snapScene.add(g);
    snapCam.position.set(0, 1.0, 6.2);
    snapCam.lookAt(0, 0.88, 0);
    snapRenderer.render(snapScene, snapCam);
    var url = snapRenderer.domElement.toDataURL('image/png');
    snapScene.remove(g);
    disposeTree(g);
    snapCache[key] = url;
    return url;
  } catch (e) {
    return '';
  }
}
function disposeTree(o) {
  o.traverse(function (c) {
    if (c.isMesh && c.material && c.material.userData && c.material.userData.tmp) c.material.dispose();
  });
}

/* HTML <img> for a look — used all over the DOM UI. */
function avatarImg(look, w, h, cls) {
  var url = snapshot(look, w || 110, h || 128);
  return '<img class="av ' + (cls || '') + '" src="' + url + '" alt="" draggable="false">';
}

AU.Models = {
  buildCrewmate: buildCrewmate,
  buildPet: buildPet,
  buildGhost: buildGhost,
  buildDeadBody: buildDeadBody,
  snapshot: snapshot,
  avatarImg: avatarImg,
  roundedBoxGeo: roundedBoxGeo,
  HEIGHT: TOP_Y,
  BODY_Y: BODY_Y,
  toon: toon,
  hatBuilders: HAT_BUILDERS,
  visorBuilders: VISOR_BUILDERS,
  skinBuilders: SKIN_BUILDERS,
  petBuilders: PET_BUILDERS
};

})(window.AU);
