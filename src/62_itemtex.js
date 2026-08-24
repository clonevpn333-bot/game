/* =========================================================================
 * ITEM SPRITES — 16×16 pixel-art icons painted at runtime, baked into the
 * same texture array as the blocks so held items can be extruded in 3D.
 * ========================================================================= */

var ITEM_ICON = {};
function II(name, fn) { ITEM_ICON[name] = fn; }

/* small helpers ---------------------------------------------------------- */
function il(c, f) { return shade(col(c), f); }
function diagLine(p, x0, y0, x1, y1, c, w) {
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (var i = 0; i <= n; i++) {
    var x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    for (var oy = 0; oy < (w || 1); oy++) for (var ox = 0; ox < (w || 1); ox++) p.px(x + ox, y + oy, c);
  }
}
/* wooden handle running bottom-left → up-right, the Minecraft tool diagonal */
function handle(p, x0, y0, x1, y1) {
  var d = col('#6b4d28'), l = col('#8b6a3d');
  diagLine(p, x0, y0, x1, y1, d, 2);
  diagLine(p, x0, y0 - 1, x1, y1 - 1, l, 1);
}
function outlineDark(p) {
  var src = new Uint8Array(p.d);
  for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
    if (src[(y * TS + x) * 4 + 3] > 0) continue;
    var near = false;
    if (x > 0 && src[(y * TS + x - 1) * 4 + 3] > 0) near = true;
    if (x < TS - 1 && src[(y * TS + x + 1) * 4 + 3] > 0) near = true;
    if (y > 0 && src[((y - 1) * TS + x) * 4 + 3] > 0) near = true;
    if (y < TS - 1 && src[((y + 1) * TS + x) * 4 + 3] > 0) near = true;
    if (near) p.set(x, y, 0, 0, 0, 90);
  }
}
/* metal body with a highlight on the upper-left and shade on the lower-right */
function metalShape(p, pts, c) {
  var base = col(c), hi = shade(base, 1.35), lo = shade(base, 0.62);
  for (var i = 0; i < pts.length; i += 4) {
    var x0 = pts[i], y0 = pts[i + 1], x1 = pts[i + 2], y1 = pts[i + 3];
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var t = (x - x0) / Math.max(1, x1 - x0) + (y - y0) / Math.max(1, y1 - y0);
      p.px(x, y, t < 0.5 ? hi : (t > 1.35 ? lo : base));
    }
  }
}

/* ------------------------------------------------------------- tools -- */
II('sword', function (p, c) {
  handle(p, 3, 14, 6, 11);
  metalShape(p, [5, 10, 6, 11], '#4a3a20');       /* guard base */
  var g = col('#5a4626');
  p.px(4, 11, g); p.px(7, 10, g); p.px(4, 12, g); p.px(3, 12, g);
  var b = col(c), hi = shade(b, 1.4), lo = shade(b, 0.6);
  for (var i = 0; i < 9; i++) {
    var x = 6 + i, y = 9 - i;
    p.px(x, y, hi); p.px(x + 1, y, b); p.px(x + 1, y + 1, lo);
  }
  p.px(14, 1, hi); p.px(15, 0, hi);
  outlineDark(p);
});
II('pickaxe', function (p, c) {
  handle(p, 4, 14, 9, 8);
  var b = col(c), hi = shade(b, 1.35), lo = shade(b, 0.62);
  for (var x = 3; x <= 13; x++) {
    var arc = Math.round(Math.abs(x - 8) * 0.55);
    p.px(x, 3 + arc, hi); p.px(x, 4 + arc, b); p.px(x, 5 + arc, lo);
  }
  p.px(2, 6, b); p.px(2, 7, lo); p.px(14, 6, b); p.px(14, 7, lo);
  p.px(1, 8, lo); p.px(15, 8, lo);
  outlineDark(p);
});
II('axe', function (p, c) {
  handle(p, 4, 14, 9, 7);
  var b = col(c), hi = shade(b, 1.35), lo = shade(b, 0.62);
  for (var y = 2; y <= 9; y++) {
    var w = y < 6 ? y - 1 : 10 - y;
    for (var x = 8; x < 8 + Math.max(2, w + 2); x++) p.px(x, y, x < 10 ? hi : (x > 12 ? lo : b));
  }
  for (var y2 = 3; y2 <= 8; y2++) { p.px(7, y2, b); if (y2 > 4 && y2 < 8) p.px(6, y2, lo); }
  outlineDark(p);
});
II('shovel', function (p, c) {
  handle(p, 4, 14, 10, 7);
  var b = col(c), hi = shade(b, 1.35), lo = shade(b, 0.62);
  for (var y = 2; y <= 7; y++) for (var x = 9; x <= 13; x++) {
    if (y === 2 && (x === 9 || x === 13)) continue;
    if (y === 7 && (x === 9 || x === 13)) continue;
    p.px(x, y, x < 11 ? hi : (x > 12 ? lo : b));
  }
  outlineDark(p);
});
II('hoe', function (p, c) {
  handle(p, 4, 14, 10, 6);
  var b = col(c), hi = shade(b, 1.35), lo = shade(b, 0.62);
  for (var x = 4; x <= 11; x++) { p.px(x, 3, hi); p.px(x, 4, b); }
  p.px(11, 5, lo); p.px(11, 6, lo); p.px(4, 5, lo);
  outlineDark(p);
});
II('shears', function (p, c) {
  var b = col(c), hi = shade(b, 1.3), lo = shade(b, 0.65);
  diagLine(p, 4, 12, 11, 3, hi, 1); diagLine(p, 5, 12, 12, 3, b, 1);
  diagLine(p, 11, 12, 4, 3, lo, 1); diagLine(p, 10, 12, 3, 3, b, 1);
  p.px(7, 7, col('#4a4a4a')); p.px(8, 8, col('#4a4a4a'));
  var g = col('#4a4a4a');
  p.px(3, 13, g); p.px(4, 14, g); p.px(12, 13, g); p.px(11, 14, g);
  outlineDark(p);
});
II('flint_steel', function (p, c) {
  metalShape(p, [3, 4, 6, 12], '#8f8f95');
  metalShape(p, [8, 3, 12, 6], '#9c9c9c');
  var f = col('#3c3c42');
  for (var y = 7; y <= 12; y++) for (var x = 8; x <= 12; x++) if ((x + y) % 5) p.px(x, y, f);
  outlineDark(p);
});
II('bow', function (p, c) {
  var w = col('#6b4d28'), wl = col('#8b6a3d');
  for (var y = 1; y <= 14; y++) {
    var t = (y - 7.5) / 7.5;
    var x = Math.round(11 - t * t * 5);
    p.px(x, y, w); p.px(x + 1, y, wl);
  }
  for (var y2 = 2; y2 <= 13; y2++) p.px(Math.round(11 - Math.abs(y2 - 7.5) * 0.35), y2, col('#e8e8e8'));
  diagLine(p, 3, 7, 12, 7, col('#dcdcdc'), 1);
  outlineDark(p);
});
II('crossbow', function (p, c) {
  var w = col('#6b4d28'), wl = col('#8b6a3d');
  for (var x = 2; x <= 13; x++) { p.px(x, 8, w); p.px(x, 9, wl); }
  for (var y = 3; y <= 13; y++) { p.px(3, y, w); p.px(12, y, w); }
  diagLine(p, 3, 4, 12, 4, col('#dcdcdc'), 1);
  metalShape(p, [6, 5, 9, 8], '#a8a8a8');
  outlineDark(p);
});
II('arrow', function (p, c) {
  var s = col('#6b4d28');
  diagLine(p, 3, 12, 11, 4, s, 1);
  diagLine(p, 4, 12, 12, 4, col('#8b6a3d'), 1);
  var t = col('#c8c8c8');
  p.px(12, 3, t); p.px(13, 2, t); p.px(11, 3, t); p.px(13, 4, t); p.px(12, 2, shade(t, 1.2));
  var f = col('#f0f0f0');
  p.px(2, 13, f); p.px(3, 13, f); p.px(2, 12, f); p.px(1, 14, f); p.px(4, 14, f); p.px(2, 14, f);
  outlineDark(p);
});
II('trident', function (p, c) {
  var b = col(c), hi = shade(b, 1.3);
  diagLine(p, 4, 14, 9, 8, b, 2);
  for (var x = 6; x <= 12; x += 3) for (var y = 2; y <= 6; y++) p.px(x, y, x === 9 ? hi : b);
  for (var x2 = 6; x2 <= 12; x2++) p.px(x2, 6, b);
  p.px(6, 1, hi); p.px(9, 1, hi); p.px(12, 1, hi);
  outlineDark(p);
});
II('shield', function (p, c) {
  for (var y = 1; y <= 14; y++) for (var x = 3; x <= 12; x++) {
    if (y > 10 && (x < 4 + (y - 10) || x > 11 - (y - 10))) continue;
    var edge = (x === 3 || x === 12 || y === 1);
    p.px(x, y, edge ? col('#6b6b6b') : col('#8b6a3d'));
  }
  for (var y2 = 3; y2 <= 9; y2++) for (var x2 = 5; x2 <= 10; x2++) p.px(x2, y2, col(c));
  outlineDark(p);
});
II('rod', function (p, c) {
  diagLine(p, 2, 13, 11, 3, col('#6b4d28'), 2);
  diagLine(p, 3, 13, 12, 3, col('#8b6a3d'), 1);
  for (var i = 0; i < 8; i++) p.px(12 + ((i % 2) ? 1 : 0) - Math.floor(i / 3), 3 + i, col('#e0e0e0'));
  outlineDark(p);
});
II('compass', function (p, c) {
  p.disc(8, 8, 6.2, col('#4a4a52'));
  p.disc(8, 8, 4.6, col('#2a2a30'));
  for (var y = 5; y <= 8; y++) p.px(8, y, col('#d43a3a'));
  for (var y2 = 8; y2 <= 11; y2++) p.px(8, y2, col('#e8e8e8'));
  p.ring(8, 8, 6.2, col('#8f8f98'));
  outlineDark(p);
});
II('clock', function (p, c) {
  p.disc(8, 8, 6.4, col('#c9a227'));
  p.disc(8, 8, 5, col('#1c2a4a'));
  p.disc(8, 6.5, 2.1, col('#f4e9c0'));
  p.ring(8, 8, 6.4, col('#8f7418'));
  outlineDark(p);
});
II('spyglass', function (p, c) {
  metalShape(p, [3, 10, 7, 13], '#7a7a82');
  metalShape(p, [6, 7, 10, 11], '#9a9aa2');
  metalShape(p, [9, 3, 13, 8], '#6a6a72');
  p.px(12, 3, col('#3a4a5a')); p.px(11, 3, col('#3a4a5a'));
  outlineDark(p);
});
II('brush', function (p, c) {
  diagLine(p, 3, 13, 8, 8, col('#8b6a3d'), 2);
  metalShape(p, [8, 5, 11, 8], '#c9a227');
  for (var x = 9; x <= 13; x++) for (var y = 1; y <= 5; y++) if ((x + y) % 2) p.px(x, y, col('#f0eadd'));
  outlineDark(p);
});
II('map', function (p, c) {
  p.rect(2, 2, 12, 12, col('#e0d8b8'));
  p.rect(2, 2, 12, 1, col('#b8ab88')); p.rect(2, 13, 12, 1, col('#b8ab88'));
  for (var i = 0; i < 24; i++) p.px(3 + ((i * 7) % 11), 4 + ((i * 5) % 9), col('#9aa87a'));
  outlineDark(p);
});
II('tag', function (p, c) {
  p.rect(4, 5, 10, 6, col('#d8d0b8'));
  p.rect(4, 5, 10, 1, col('#b0a890'));
  p.px(3, 7, col('#8a8a8a')); p.px(2, 7, col('#8a8a8a')); p.px(2, 8, col('#8a8a8a'));
  outlineDark(p);
});
II('lead', function (p, c) {
  for (var i = 0; i < 14; i++) p.px(3 + Math.round(Math.sin(i * 0.7) * 3) + 4, 1 + i, col(i % 2 ? '#b8a878' : '#988858'));
  outlineDark(p);
});
II('saddle', function (p, c) {
  p.rect(3, 5, 10, 6, col('#8a5a3a'));
  p.rect(2, 7, 12, 3, col('#7a4a2a'));
  p.rect(5, 4, 6, 2, col('#a06a44'));
  p.rect(3, 10, 10, 1, col('#3a2a1a'));
  metalShape(p, [7, 11, 8, 12], '#a8a8a8');
  outlineDark(p);
});
II('elytra', function (p, c) {
  for (var y = 2; y <= 13; y++) {
    var w = Math.max(1, 6 - Math.abs(y - 7) * 0.4) | 0;
    for (var i = 0; i < w; i++) { p.px(7 - i, y, col('#8a8298')); p.px(8 + i, y, col('#6f6a80')); }
  }
  p.rect(7, 4, 2, 8, col('#4a4658'));
  outlineDark(p);
});
II('bucket', function (p, c) {
  for (var y = 5; y <= 13; y++) {
    var inset = y > 11 ? 1 : 0;
    for (var x = 3 + inset; x <= 12 - inset; x++) p.px(x, y, x < 6 ? col('#d8d8d8') : (x > 10 ? col('#8f8f8f') : col('#b8b8b8')));
  }
  p.rect(3, 4, 10, 1, col('#e0e0e0'));
  if (c && c !== '#c8c8c8') p.rect(5, 6, 6, 5, col(c));
  outlineDark(p);
});
II('bottle', function (p, c) {
  p.rect(7, 2, 2, 3, col('#c8d8e0'));
  for (var y = 5; y <= 13; y++) {
    var w = y < 7 ? 2 + (y - 5) * 2 : 6;
    for (var i = 0; i < w; i++) p.px(8 - (w >> 1) + i, y, col('#b8cdd8'));
  }
  if (c) p.rect(6, 8, 5, 5, col(c));
  p.px(6, 6, col('#e8f4f8')); p.px(6, 7, col('#e8f4f8'));
  outlineDark(p);
});
II('potion', function (p, c) {
  ITEM_ICON.bottle(p, c);
  p.rect(6, 2, 4, 2, col('#a06a3a'));
});
II('rocket', function (p, c) {
  p.rect(6, 3, 4, 9, col('#d8d8d8'));
  p.rect(6, 3, 4, 2, col('#c04040'));
  p.px(8, 1, col('#b0b0b0')); p.px(8, 2, col('#b0b0b0'));
  p.rect(5, 12, 6, 2, col('#8a8a8a'));
  outlineDark(p);
});

/* ------------------------------------------------------------ armour -- */
II('armor_helmet', function (p, c) {
  var b = col(c), hi = shade(b, 1.25), lo = shade(b, 0.65);
  for (var y = 3; y <= 12; y++) for (var x = 3; x <= 12; x++) {
    if (y > 7 && x > 5 && x < 10) continue;
    if ((y === 3 || y === 12) && (x < 4 || x > 11)) continue;
    p.px(x, y, x < 6 ? hi : (x > 10 ? lo : b));
  }
  outlineDark(p);
});
II('armor_chestplate', function (p, c) {
  var b = col(c), hi = shade(b, 1.25), lo = shade(b, 0.65);
  for (var y = 3; y <= 12; y++) for (var x = 2; x <= 13; x++) {
    if (y < 5 && x > 5 && x < 10) continue;
    if (y > 5 && (x < 4 || x > 11)) continue;
    p.px(x, y, x < 6 ? hi : (x > 10 ? lo : b));
  }
  outlineDark(p);
});
II('armor_leggings', function (p, c) {
  var b = col(c), hi = shade(b, 1.25), lo = shade(b, 0.65);
  for (var y = 2; y <= 13; y++) for (var x = 3; x <= 12; x++) {
    if (y > 6 && x > 6 && x < 9) continue;
    p.px(x, y, x < 6 ? hi : (x > 10 ? lo : b));
  }
  outlineDark(p);
});
II('armor_boots', function (p, c) {
  var b = col(c), hi = shade(b, 1.25), lo = shade(b, 0.65);
  for (var y = 6; y <= 12; y++) for (var x = 3; x <= 12; x++) {
    if (y < 10 && x > 5 && x < 10) continue;
    p.px(x, y, x < 6 ? hi : (x > 10 ? lo : b));
  }
  outlineDark(p);
});

/* -------------------------------------------------------------- food -- */
II('apple', function (p, c) {
  p.disc(7, 9, 4.6, col(c));
  p.disc(10, 9, 3.6, shade(col(c), 0.85));
  p.px(6, 6, shade(col(c), 1.5)); p.px(5, 7, shade(col(c), 1.35));
  p.rect(8, 2, 1, 3, col('#5a3a1a'));
  p.px(10, 3, col('#4a8a3a')); p.px(11, 3, col('#4a8a3a')); p.px(11, 2, col('#5aa04a'));
  outlineDark(p);
});
II('bread', function (p, c) {
  for (var y = 5; y <= 11; y++) for (var x = 2; x <= 13; x++) {
    if ((x < 4 || x > 11) && (y < 6 || y > 10)) continue;
    p.px(x, y, y < 7 ? shade(col(c), 1.15) : (y > 9 ? shade(col(c), 0.75) : col(c)));
  }
  for (var i = 0; i < 4; i++) p.rect(4 + i * 2, 4, 1, 2, shade(col(c), 1.3));
  outlineDark(p);
});
II('cookie', function (p, c) {
  p.disc(8, 8, 5.4, col(c));
  var d = col('#4a2a12');
  p.px(6, 6, d); p.px(10, 7, d); p.px(7, 10, d); p.px(11, 10, d); p.px(5, 9, d); p.px(9, 4, d);
  outlineDark(p);
});
II('meat', function (p, c) {
  p.disc(8, 8, 5.6, col(c));
  p.disc(6, 6, 2.6, shade(col(c), 1.2));
  p.rect(10, 10, 3, 3, shade(col(c), 0.8));
  p.px(4, 11, col('#f0eadd')); p.px(5, 12, col('#f0eadd')); p.px(3, 10, col('#f0eadd'));
  outlineDark(p);
});
II('fish', function (p, c) {
  for (var x = 3; x <= 12; x++) {
    var h = Math.round(3.2 * Math.sin((x - 2) / 11 * Math.PI));
    for (var y = 8 - h; y <= 8 + h; y++) p.px(x, y, y < 8 ? shade(col(c), 1.15) : col(c));
  }
  p.px(13, 5, col(c)); p.px(14, 4, col(c)); p.px(13, 11, col(c)); p.px(14, 12, col(c)); p.px(13, 8, col(c));
  p.px(5, 7, col('#101010'));
  outlineDark(p);
});
II('carrot', function (p, c) {
  for (var i = 0; i < 10; i++) {
    var x = 3 + i, y = 12 - i;
    for (var w = 0; w <= Math.max(0, 3 - Math.floor(i / 3)); w++) { p.px(x + w, y, col(c)); p.px(x, y + w, shade(col(c), 0.8)); }
  }
  p.px(12, 2, col('#4a8a3a')); p.px(13, 1, col('#4a8a3a')); p.px(11, 2, col('#3a7a2a')); p.px(13, 3, col('#5a9a4a'));
  outlineDark(p);
});
II('potato', function (p, c) {
  p.disc(8, 8, 5.4, col(c));
  p.disc(6, 6, 2.4, shade(col(c), 1.15));
  var d = shade(col(c), 0.62);
  p.px(10, 6, d); p.px(6, 11, d); p.px(11, 10, d);
  outlineDark(p);
});
II('beet', function (p, c) {
  p.disc(8, 10, 4.4, col(c));
  p.px(8, 14, shade(col(c), 0.7)); p.px(8, 15, shade(col(c), 0.7));
  p.px(7, 4, col('#4a8a3a')); p.px(9, 3, col('#4a8a3a')); p.px(8, 5, col('#3a7a2a')); p.px(10, 4, col('#5a9a4a'));
  outlineDark(p);
});
II('soup', function (p, c) {
  for (var y = 7; y <= 13; y++) for (var x = 3; x <= 12; x++) {
    if (y > 11 && (x < 5 || x > 10)) continue;
    p.px(x, y, x < 5 ? col('#b06a4a') : (x > 10 ? col('#7a4028') : col('#96543a')));
  }
  p.rect(4, 6, 8, 2, col(c));
  outlineDark(p);
});
II('melon', function (p, c) {
  for (var x = 2; x <= 13; x++) {
    var h = Math.round(6 * Math.sin((x - 1) / 13 * Math.PI));
    for (var y = 12 - h; y <= 12; y++) p.px(x, y, y > 11 ? col('#3a7a2a') : (y > 10 ? col('#8aca6a') : col(c)));
  }
  var s = col('#2a1a10');
  p.px(6, 8, s); p.px(9, 7, s); p.px(8, 10, s);
  outlineDark(p);
});
II('berry', function (p, c) {
  p.disc(6, 9, 3, col(c)); p.disc(10, 10, 2.6, shade(col(c), 0.85)); p.disc(9, 6, 2.4, shade(col(c), 1.12));
  p.px(5, 7, shade(col(c), 1.6));
  outlineDark(p);
});
II('kelp', function (p, c) {
  for (var y = 2; y <= 13; y++) {
    var x = 8 + Math.round(Math.sin(y * 0.8) * 2.5);
    p.px(x, y, col(c)); p.px(x + 1, y, shade(col(c), 0.8)); p.px(x - 1, y, shade(col(c), 1.15));
  }
  outlineDark(p);
});
II('pie', function (p, c) {
  p.disc(8, 9, 5.6, col('#c8a05a'));
  p.disc(8, 8, 4.4, col(c));
  for (var i = 0; i < 6; i++) p.px(4 + i * 1.6 | 0, 4 + (i % 2), col('#e0c080'));
  outlineDark(p);
});
II('cake', function (p, c) {
  p.rect(3, 5, 10, 8, col('#e8e0d0'));
  p.rect(3, 5, 10, 2, col('#f5f0e6'));
  p.rect(3, 7, 10, 1, col('#b03a3a'));
  for (var i = 0; i < 5; i++) p.px(4 + i * 2, 4, col('#f0f0f0'));
  outlineDark(p);
});
II('eye', function (p, c) {
  p.disc(8, 8, 5.2, col(c));
  p.disc(8, 8, 2.6, col('#f0e8d8'));
  p.disc(8, 8, 1.2, col('#101010'));
  outlineDark(p);
});
II('egg', function (p, c, c2) {
  var b = typeof c === 'string' ? c : '#e8e0d0';
  for (var y = 1; y <= 14; y++) {
    var t = (y - 1) / 13;
    /* asymmetric ovoid: narrow at the top, full and round at the base */
    var w = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.62) / 0.66, 2))) * (2.4 + t * 3.6));
    if (w <= 0) continue;
    for (var x = 8 - w; x <= 7 + w; x++)
      p.px(x, y, x < 8 - w * 0.35 ? shade(b, 1.18) : (x > 6 + w ? shade(b, 0.74) : b));
  }
  if (c2) {
    var spots = [[6, 4], [10, 6], [5, 9], [9, 10], [7, 12], [11, 9], [4, 7], [8, 7]];
    for (var i = 0; i < spots.length; i++) {
      var sx = spots[i][0], sy = spots[i][1];
      if (p.get(sx, sy)[3] === 0) continue;
      p.px(sx, sy, c2); p.px(sx + 1, sy, shade(c2, 0.86));
      if (p.get(sx, sy + 1)[3] > 0) p.px(sx, sy + 1, shade(c2, 0.92));
    }
  }
  p.px(6, 3, shade(b, 1.5));
  outlineDark(p);
});

/* --------------------------------------------------------- materials -- */
II('stick', function (p, c) {
  diagLine(p, 4, 12, 11, 4, col('#6b4d28'), 2);
  diagLine(p, 5, 12, 12, 4, col('#8b6a3d'), 1);
  outlineDark(p);
});
II('gem', function (p, c) {
  var b = col(c), hi = shade(b, 1.45), lo = shade(b, 0.6);
  for (var y = 3; y <= 12; y++) {
    var w = Math.round(5 - Math.abs(y - 7.5) * 0.55);
    for (var x = 8 - w; x <= 7 + w; x++) p.px(x, y, (x + y < 14) ? hi : (x + y > 18 ? lo : b));
  }
  p.px(6, 5, col('#ffffff')); p.px(7, 5, shade(hi, 1.2));
  outlineDark(p);
});
II('shard', function (p, c) {
  var b = col(c), hi = shade(b, 1.4), lo = shade(b, 0.6);
  for (var y = 2; y <= 13; y++) {
    var w = Math.max(1, Math.round(4 - Math.abs(y - 9) * 0.45));
    for (var x = 8 - w; x <= 7 + w; x++) p.px(x, y, x < 7 ? hi : (x > 9 ? lo : b));
  }
  outlineDark(p);
});
II('ingot', function (p, c) {
  var b = col(c), hi = shade(b, 1.35), lo = shade(b, 0.6);
  for (var y = 5; y <= 11; y++) {
    var inset = y < 7 ? (7 - y) : 0;
    for (var x = 2 + inset; x <= 13 - inset; x++) p.px(x, y, y < 7 ? hi : (y > 9 ? lo : b));
  }
  p.rect(4, 6, 5, 1, shade(b, 1.55));
  outlineDark(p);
});
II('nugget', function (p, c) {
  var b = col(c);
  p.disc(7, 8, 2.6, shade(b, 1.2)); p.disc(10, 10, 2.1, b); p.disc(9, 6, 1.8, shade(b, 0.85));
  p.px(6, 7, shade(b, 1.6));
  outlineDark(p);
});
II('raw', function (p, c) {
  var b = col(c);
  p.disc(7, 8, 3.6, b); p.disc(10, 10, 2.8, shade(b, 0.82)); p.disc(10, 6, 2.4, shade(b, 1.14));
  p.px(5, 6, shade(b, 1.5)); p.px(6, 6, shade(b, 1.3));
  outlineDark(p);
});
II('dust', function (p, c) {
  var b = col(c);
  for (var i = 0; i < 40; i++) {
    var a = (i * 2.39), r = Math.sqrt(i / 40) * 5;
    p.px(Math.round(8 + Math.cos(a) * r), Math.round(9 + Math.sin(a) * r * 0.8), i % 3 ? b : shade(b, 1.3));
  }
  outlineDark(p);
});
II('feather', function (p, c) {
  diagLine(p, 5, 14, 11, 3, col('#c8c8c8'), 1);
  for (var i = 0; i < 9; i++) {
    var x = 10 - Math.round(i * 0.55), y = 4 + i;
    for (var w = 1; w <= 3 - Math.floor(i / 4); w++) { p.px(x - w, y, col('#f0f0f0')); p.px(x + w - 1, y - 1, col('#e0e0e0')); }
  }
  outlineDark(p);
});
II('leather', function (p, c) {
  var b = col(c);
  for (var y = 4; y <= 12; y++) for (var x = 2; x <= 13; x++) {
    if ((x < 4 || x > 11) && (y < 6 || y > 10)) continue;
    p.px(x, y, (x * 7 + y * 3) % 5 ? b : shade(b, 1.18));
  }
  p.rect(4, 6, 8, 1, shade(b, 1.3));
  outlineDark(p);
});
II('string', function (p, c) {
  for (var i = 0; i < 15; i++) {
    var x = 8 + Math.round(Math.sin(i * 0.9) * 4.5);
    p.px(x, 1 + i, col(c)); p.px(x + 1, 1 + i, shade(col(c), 0.8));
  }
  outlineDark(p);
});
II('tear', function (p, c) {
  for (var y = 3; y <= 13; y++) {
    var w = y < 7 ? Math.round((y - 2) * 0.7) : Math.round(4 - (y - 10) * 0.4);
    for (var x = 8 - w; x <= 7 + w; x++) p.px(x, y, x < 7 ? shade(col(c), 1.2) : col(c));
  }
  p.px(7, 6, col('#ffffff'));
  outlineDark(p);
});
II('ball', function (p, c) {
  p.disc(8, 8, 5.4, col(c));
  p.disc(6, 6, 2.4, shade(col(c), 1.22));
  p.px(5, 5, shade(col(c), 1.55));
  outlineDark(p);
});
II('star', function (p, c) {
  var b = col(c);
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4;
    for (var r = 0; r < (i % 2 ? 4 : 6.5); r += 0.5)
      p.px(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), r < 3 ? shade(b, 1.3) : b);
  }
  p.disc(8, 8, 2.2, col('#ffffff'));
  outlineDark(p);
});
II('paper', function (p, c) {
  p.rect(3, 3, 10, 11, col('#f0f0e8'));
  p.rect(3, 3, 10, 1, col('#d8d8cc'));
  for (var i = 0; i < 4; i++) p.rect(5, 6 + i * 2, 6, 1, col('#c8c8bc'));
  outlineDark(p);
});
II('book', function (p, c) {
  p.rect(3, 2, 10, 12, col(c));
  p.rect(4, 3, 8, 10, col('#f0eadd'));
  p.rect(3, 2, 2, 12, shade(col(c), 0.8));
  p.rect(11, 2, 2, 12, shade(col(c), 1.12));
  outlineDark(p);
});
II('comb', function (p, c) {
  for (var y = 3; y <= 12; y++) for (var x = 3; x <= 12; x++) {
    var hx = ((x - 3) + ((y & 1) ? 1.5 : 0)) % 4;
    p.px(x, y, hx < 0.9 ? shade(col(c), 0.72) : col(c));
  }
  outlineDark(p);
});
II('shell', function (p, c) {
  for (var y = 4; y <= 12; y++) {
    var w = Math.round(6 * Math.sin((y - 3) / 10 * Math.PI));
    for (var x = 8 - w; x <= 7 + w; x++) p.px(x, y, ((x * 3) % 4 === 0) ? shade(col(c), 0.8) : col(c));
  }
  outlineDark(p);
});
II('heart', function (p, c) {
  p.disc(5.5, 6, 3.2, col(c)); p.disc(10.5, 6, 3.2, col(c));
  for (var y = 6; y <= 13; y++) { var w = 13 - y; for (var x = 8 - w; x <= 7 + w; x++) p.px(x, y, col(c)); }
  p.px(5, 5, shade(col(c), 1.5)); p.px(6, 4, shade(col(c), 1.4));
  outlineDark(p);
});
II('totem', function (p, c) {
  p.rect(4, 2, 8, 12, col(c));
  p.rect(5, 4, 6, 4, col('#3a8a6a'));
  p.px(6, 5, col('#101010')); p.px(9, 5, col('#101010'));
  p.rect(6, 9, 4, 1, col('#8a6a20'));
  p.rect(3, 6, 1, 4, shade(col(c), 0.8)); p.rect(12, 6, 1, 4, shade(col(c), 0.8));
  outlineDark(p);
});
II('skull', function (p, c) {
  p.rect(3, 3, 10, 9, col(c));
  p.rect(4, 12, 8, 2, shade(col(c), 0.85));
  p.rect(5, 6, 2, 2, col('#0a0a0a')); p.rect(9, 6, 2, 2, col('#0a0a0a'));
  p.rect(6, 10, 4, 1, col('#0a0a0a'));
  outlineDark(p);
});
II('seeds', function (p, c) {
  var b = col(c);
  var pts = [[5, 6], [9, 5], [7, 9], [11, 9], [4, 10], [8, 12]];
  for (var i = 0; i < pts.length; i++) {
    p.px(pts[i][0], pts[i][1], b); p.px(pts[i][0] + 1, pts[i][1], shade(b, 0.8));
    p.px(pts[i][0], pts[i][1] + 1, shade(b, 0.9)); p.px(pts[i][0] + 1, pts[i][1] + 1, shade(b, 0.7));
  }
  outlineDark(p);
});
II('wart', function (p, c) {
  p.disc(6, 7, 2.8, col(c)); p.disc(10, 9, 2.4, shade(col(c), 0.82)); p.disc(8, 11, 2.2, shade(col(c), 1.1));
  outlineDark(p);
});
II('cane', function (p, c) {
  p.rect(6, 1, 4, 14, col(c));
  p.rect(6, 1, 1, 14, shade(col(c), 1.2)); p.rect(9, 1, 1, 14, shade(col(c), 0.78));
  for (var i = 0; i < 4; i++) p.rect(6, 3 + i * 3, 4, 1, shade(col(c), 0.7));
  outlineDark(p);
});
II('disc', function (p, c) {
  p.disc(8, 8, 6.4, col('#2a2a2a'));
  p.ring(8, 8, 5.2, col(c));
  p.disc(8, 8, 2.2, col('#c8c8c8'));
  p.disc(8, 8, 0.8, col('#2a2a2a'));
  outlineDark(p);
});
II('wheat', function (p, c) {
  var b = col(c);
  for (var s = -1; s <= 1; s++) {
    var bx = 8 + s * 4;
    for (var y = 3; y <= 13; y++) p.px(bx + Math.round(s * (y - 8) * 0.12), y, shade(b, 0.8));
    for (var i = 0; i < 5; i++) {
      var y2 = 3 + i * 2;
      p.px(bx - 1, y2, b); p.px(bx + 1, y2, shade(b, 1.15));
    }
  }
  outlineDark(p);
});
II('bone', function (p, c) {
  diagLine(p, 4, 11, 11, 4, col(c), 2);
  var b = col(c);
  p.px(3, 10, b); p.px(3, 12, b); p.px(2, 11, b); p.px(4, 13, b);
  p.px(12, 3, b); p.px(13, 4, b); p.px(11, 2, b); p.px(13, 2, b);
  outlineDark(p);
});

/* --------------------------------------------------------- baking ----- */
var ITEM_LAYER = {};   /* item name -> texture array layer */
function bakeItemIcons() {
  for (var i = 0; i < ITEM_LIST.length; i++) {
    var it = ITEM_LIST[i];
    if (it.block) continue;                      /* block items use their block tiles */
    var fn = ITEM_ICON[it.icon] || ITEM_ICON.gem;
    var p = new Pain();
    p.clear();
    fn(p, it.color || '#b0b0b0', it.color2 || null);
    unifyTile(p.d);
    ITEM_LAYER[it.name] = rawLayer('item:' + it.name, p.d);
  }
}
