/* =========================================================================
 * PLANT + FLOWER SPRITES — the transparent cross-shaped tiles.
 * ========================================================================= */

function blade(p, x, yBase, h, c, cd, curve) {
  curve = curve || 0;
  for (var i = 0; i < h; i++) {
    var y = yBase - i;
    var xx = Math.round(x + curve * (i / h) * (i / h) * 3);
    var t = i / h;
    p.px(xx, y, mix(cd, c, 0.25 + t * 0.85));
    if (i > h * 0.45 && i < h * 0.92) p.blend(xx + (curve >= 0 ? -1 : 1), y, cd, 0.55);
  }
  p.px(Math.round(x + curve * 3), yBase - h, mix(c, '#ffffff', 0.18));
}

var PLANT_SHAPES = {
  grass: function (p, c, d) {
    blade(p, 3, 15, 7, c, d, -1); blade(p, 6, 15, 10, c, d, 0.4);
    blade(p, 9, 15, 6, c, d, 1); blade(p, 12, 15, 9, c, d, -0.6);
    blade(p, 14, 15, 5, c, d, 0.8); blade(p, 1, 15, 4, c, d, 0.5);
  },
  tallgrass: function (p, c, d) {
    blade(p, 2, 15, 12, c, d, -0.7); blade(p, 5, 15, 15, c, d, 0.3);
    blade(p, 8, 15, 11, c, d, 1); blade(p, 11, 15, 14, c, d, -0.5);
    blade(p, 14, 15, 9, c, d, 0.9);
  },
  fern: function (p, c, d) {
    /* central stalk with paired fronds */
    for (var y = 15; y >= 4; y--) p.px(8, y, mix(d, c, 0.6));
    for (var i = 0; i < 6; i++) {
      var y2 = 14 - i * 2, w = 5 - Math.floor(i * 0.7);
      for (var x = 1; x <= w; x++) {
        p.px(8 - x, y2 - Math.floor(x * 0.5), mix(d, c, 0.4 + i * 0.09));
        p.px(8 + x, y2 - Math.floor(x * 0.5), mix(d, c, 0.5 + i * 0.08));
      }
    }
    p.px(8, 3, mix(c, '#ffffff', 0.2));
  },
  largefern: function (p, c, d) {
    for (var y = 15; y >= 1; y--) p.px(8, y, mix(d, c, 0.6));
    for (var i = 0; i < 8; i++) {
      var y2 = 15 - i * 2, w = 6 - Math.floor(i * 0.6);
      for (var x = 1; x <= w; x++) {
        p.px(8 - x, y2 - Math.floor(x * 0.5), mix(d, c, 0.35 + i * 0.07));
        p.px(8 + x, y2 - Math.floor(x * 0.5), mix(d, c, 0.45 + i * 0.07));
      }
    }
  },
  sapling: function (p, c, d) {
    for (var y = 15; y >= 10; y--) p.px(8, y, '#6b4f28');
    p.px(7, 12, '#5a4120'); p.px(9, 13, '#5a4120');
    var pts = [[8, 3], [6, 5], [10, 5], [5, 7], [11, 7], [7, 8], [9, 8], [4, 9], [12, 9], [8, 6], [6, 9], [10, 10], [8, 10], [3, 8], [13, 8]];
    for (var i = 0; i < pts.length; i++) {
      var v = pts[i];
      p.disc(v[0], v[1], 1.3, i % 3 === 0 ? mix(c, '#ffffff', 0.18) : (i % 3 === 1 ? c : d));
    }
  },
  dead: function (p, c, d) {
    for (var y = 15; y >= 8; y--) p.px(8, y, d);
    var br = [[8, 11, -1, -1, 4], [8, 10, 1, -1, 5], [8, 13, -1, -1, 3], [8, 9, 1, -1, 3], [8, 12, 1, -1, 4]];
    for (var i = 0; i < br.length; i++) {
      var x = br[i][0], y2 = br[i][1];
      for (var k = 0; k < br[i][4]; k++) { x += br[i][2]; y2 += br[i][3]; p.px(x, y2, k % 2 ? c : d); }
    }
  },
  seagrass: function (p, c, d) {
    blade(p, 4, 15, 9, c, d, 0.8); blade(p, 8, 15, 12, c, d, -0.5);
    blade(p, 12, 15, 8, c, d, 0.6);
  },
  kelp: function (p, c, d) {
    for (var y = 15; y >= 0; y--) {
      var x = 8 + Math.round(Math.sin(y * 0.45) * 1.6);
      p.px(x, y, mix(d, c, 0.6));
      if (y % 3 === 0) { p.px(x - 1, y, d); p.px(x - 2, y - 1, mix(c, d, 0.5)); }
      if (y % 3 === 1) { p.px(x + 1, y, d); p.px(x + 2, y - 1, mix(c, d, 0.5)); }
    }
  },
  cane: function (p, c, d) {
    for (var y = 15; y >= 0; y--) {
      for (var x = 6; x <= 9; x++) p.px(x, y, x === 6 ? d : (x === 9 ? shade(d, 0.9) : c));
      if (y % 5 === 0) for (var x2 = 6; x2 <= 9; x2++) p.px(x2, y, shade(d, 0.8));
    }
    p.px(5, 12, d); p.px(4, 11, mix(c, d, 0.4));
    p.px(10, 6, d); p.px(11, 5, mix(c, d, 0.4));
  },
  azalea: function (p, c, d) {
    for (var y = 15; y >= 11; y--) p.px(8, y, '#6b4f28');
    for (var i = 0; i < 22; i++) {
      var x = 2 + ((rand2(i, 3, 12) * 12) | 0), y2 = 2 + ((rand2(i, 7, 13) * 9) | 0);
      p.disc(x, y2, 1.4, i % 3 ? c : d);
    }
  },
  azalea_f: function (p, c, d) {
    PLANT_SHAPES.azalea(p, c, '#4a6a24');
    for (var i = 0; i < 7; i++) {
      var x = 2 + ((rand2(i, 21, 31) * 12) | 0), y = 2 + ((rand2(i, 17, 33) * 8) | 0);
      p.disc(x, y, 1.1, d);
      p.px(x, y, '#f6dc8c');
    }
  },
  dripleaf: function (p, c, d) {
    for (var y = 15; y >= 8; y--) p.px(8, y, mix(d, '#7a9c4a', 0.5));
    p.disc(8, 6, 3.6, c); p.disc(8, 6, 2.4, mix(c, '#ffffff', 0.15));
    p.ring(8, 6, 3.6, d, 1);
  },
  roots: function (p, c, d) {
    for (var k = 0; k < 5; k++) {
      var x = 2 + k * 3;
      for (var y = 15; y >= 15 - (4 + (k % 3) * 3); y--) p.px(x + Math.round(Math.sin(y * 0.6) * 0.9), y, k % 2 ? c : d);
    }
  },
  cavevine: function (p, c, d) {
    for (var y = 0; y <= 15; y++) {
      var x = 8 + Math.round(Math.sin(y * 0.5) * 1.3);
      p.px(x, y, mix(d, c, 0.6)); p.px(x + 1, y, d);
      if (y % 4 === 2) { p.px(x - 1, y, c); p.px(x + 2, y, c); }
    }
  },
  sprouts: function (p, c, d) {
    blade(p, 5, 15, 6, c, d, 1); blade(p, 8, 15, 8, c, d, -0.5); blade(p, 11, 15, 5, c, d, 0.7);
  },
  weeping: function (p, c, d) {
    for (var k = 0; k < 4; k++) {
      var x = 3 + k * 3;
      var h = 9 + ((rand2(k, 9, 41) * 7) | 0);
      for (var y = 0; y < h; y++) p.px(x + (y % 3 === 0 ? 1 : 0), y, y < 3 ? d : mix(d, c, y / h));
    }
  }
};

var FLOWER_SHAPES = {
  simple: function (p, s, c) {
    for (var y = 15; y >= 8; y--) p.px(8, y, s);
    p.px(7, 12, shade(s, 0.85)); p.px(9, 11, shade(s, 0.85));
    p.disc(8, 6, 2.6, c);
    p.disc(8, 6, 1.2, shade(c, 1.2));
    p.px(8, 6, '#f5e08a');
  },
  tulip: function (p, s, c) {
    for (var y = 15; y >= 8; y--) p.px(8, y, s);
    p.px(6, 11, s); p.px(5, 10, shade(s, 0.9)); p.px(10, 12, s); p.px(11, 11, shade(s, 0.9));
    p.rect(7, 5, 3, 4, c); p.px(6, 6, shade(c, 0.85)); p.px(10, 6, shade(c, 0.85));
    p.px(7, 4, shade(c, 1.15)); p.px(9, 4, shade(c, 1.15));
  },
  daisy: function (p, s, c) {
    for (var y = 15; y >= 8; y--) p.px(8, y, s);
    p.px(6, 12, s); p.px(10, 11, s);
    var pts = [[8, 4], [6, 5], [10, 5], [5, 7], [11, 7], [6, 9], [10, 9], [8, 10]];
    for (var i = 0; i < pts.length; i++) p.px(pts[i][0], pts[i][1], c);
    p.disc(8, 7, 1.4, '#f0c93c');
  },
  bluet: function (p, s, c) {
    for (var y = 15; y >= 9; y--) p.px(8, y, s);
    p.px(5, 8, c); p.px(11, 8, c); p.px(8, 6, c); p.px(6, 10, c);
    p.px(5, 7, shade(c, 0.9)); p.px(11, 7, shade(c, 0.9)); p.px(8, 5, shade(c, 0.9));
    p.px(5, 8, '#e8e46a'); p.px(11, 8, '#e8e46a');
  },
  allium: function (p, s, c) {
    for (var y = 15; y >= 8; y--) p.px(8, y, s);
    p.px(6, 11, s); p.px(10, 12, s);
    p.disc(8, 5, 3, c); p.disc(8, 5, 1.8, shade(c, 1.18));
    p.px(6, 3, shade(c, 0.85)); p.px(10, 3, shade(c, 0.85)); p.px(8, 2, shade(c, 1.1));
  },
  orchid: function (p, s, c) {
    for (var y = 15; y >= 9; y--) p.px(8, y, s);
    p.px(6, 12, s); p.px(10, 11, s);
    p.px(8, 7, c); p.px(7, 6, c); p.px(9, 6, c); p.px(8, 5, shade(c, 1.15));
    p.px(6, 8, c); p.px(10, 8, c); p.px(8, 8, '#f2e58c');
  },
  lily: function (p, s, c) {
    for (var y = 15; y >= 7; y--) p.px(8, y, s);
    p.px(6, 10, s); p.px(10, 9, s); p.px(5, 12, shade(s, 0.9));
    p.px(6, 6, c); p.px(7, 7, c); p.px(9, 5, c); p.px(10, 6, c); p.px(8, 4, c);
  },
  sunflower: function (p, s, c) {
    for (var y = 15; y >= 4; y--) p.px(8, y, s);
    p.px(6, 10, s); p.px(10, 8, s);
    p.disc(8, 4, 4.2, c); p.disc(8, 4, 2.4, '#7a4a1c'); p.disc(8, 4, 1.4, '#5c3512');
  },
  lilac: function (p, s, c) {
    for (var y = 15; y >= 6; y--) p.px(8, y, s);
    for (var i = 0; i < 16; i++) {
      var x = 4 + ((rand2(i, 5, 61) * 9) | 0), y2 = 1 + ((rand2(i, 9, 62) * 7) | 0);
      p.disc(x, y2, 1.2, i % 2 ? c : shade(c, 0.85));
    }
  },
  rose_bush: function (p, s, c) {
    for (var y = 15; y >= 6; y--) p.px(8, y, s);
    p.px(5, 9, s); p.px(11, 8, s);
    p.disc(6, 5, 2, c); p.disc(11, 6, 1.8, shade(c, 0.9)); p.disc(8, 2, 1.8, shade(c, 1.1));
  },
  peony: function (p, s, c) {
    for (var y = 15; y >= 7; y--) p.px(8, y, s);
    p.disc(8, 4, 3.4, c); p.disc(7, 3, 1.6, shade(c, 1.16)); p.disc(10, 5, 1.2, shade(c, 0.86));
  },
  pitcher_plant: function (p, s, c) {
    for (var y = 15; y >= 8; y--) p.px(8, y, s);
    p.rect(6, 3, 5, 6, c); p.px(6, 2, shade(c, 1.1)); p.px(10, 2, shade(c, 1.1));
    p.rect(7, 4, 3, 3, shade(c, 0.85));
  }
};
