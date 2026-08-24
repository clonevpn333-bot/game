/* =========================================================================
 * CUSTOM TILE PAINTERS — the tiles that are recognisable shapes rather than
 * parameterised materials.  Each is a few lines of the pixel-art DSL.
 * ========================================================================= */

var CUSTOM_TEX = {};
function CT(name, fn) { CUSTOM_TEX[name] = fn; }

/* ------------------------------------------------------------- terrain -- */
CT('grass_top', function (p) {
  p.fill('#8fbf62').noise(0.05).blotch(0.06, 7, 3.5);
  for (var k = 0; k < 40; k++) p.blend((p.rng() * 16) | 0, (p.rng() * 16) | 0, p.rng() < 0.5 ? '#a8d178' : '#6f9c46', 0.6);
  return p;
});
CT('grass_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#8a5f3c', c2: '#6f4b2f', n: 70, sz: 1 });
  /* ragged grass overhang along the top edge, tinted at runtime */
  for (var x = 0; x < 16; x++) {
    var h = 3 + Math.round(rand2(x, 0, 313) * 2.6);
    for (var y = 0; y < h; y++) p.px(x, y, y === h - 1 ? '#7bab52' : (rand2(x, y, 91) < 0.4 ? '#8fbf62' : '#84b458'));
  }
  return p;
});
CT('podzol_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#8a5f3c', c2: '#6f4b2f', n: 70, sz: 1 });
  for (var x = 0; x < 16; x++) {
    var h = 3 + Math.round(rand2(x, 4, 317) * 2.4);
    for (var y = 0; y < h; y++) p.px(x, y, rand2(x, y, 92) < 0.45 ? '#5d4321' : '#77582a');
  }
  return p;
});
CT('mycelium_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#8a5f3c', c2: '#6f4b2f', n: 70, sz: 1 });
  for (var x = 0; x < 16; x++) {
    var h = 3 + Math.round(rand2(x, 8, 319) * 2.4);
    for (var y = 0; y < h; y++) p.px(x, y, rand2(x, y, 93) < 0.5 ? '#6f6265' : '#8a7d80');
  }
  return p;
});
CT('warped_nylium_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#6f3435', c2: '#5b2a2b', n: 90, sz: 1 });
  for (var x = 0; x < 16; x++) {
    var h = 2 + Math.round(rand2(x, 2, 331) * 3);
    for (var y = 0; y < h; y++) p.px(x, y, rand2(x, y, 94) < 0.5 ? '#2b7267' : '#1d564f');
  }
  return p;
});
CT('crimson_nylium_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#6f3435', c2: '#5b2a2b', n: 90, sz: 1 });
  for (var x = 0; x < 16; x++) {
    var h = 2 + Math.round(rand2(x, 6, 337) * 3);
    for (var y = 0; y < h; y++) p.px(x, y, rand2(x, y, 95) < 0.5 ? '#853d3d' : '#6c2f2f');
  }
  return p;
});
CT('path_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#8a5f3c', c2: '#6f4b2f', n: 70, sz: 1 });
  p.rect(0, 0, 16, 1, '#96793f');
  return p;
});
CT('farmland', function (p) {
  p.fill('#6b4a25').noise(0.05);
  for (var y = 2; y < 16; y += 4) { p.rect(0, y, 16, 2, '#553a1c'); p.rect(0, y - 1, 16, 1, '#7b5730'); }
  p.noise(0.04);
  return p;
});
CT('muddy_roots', function (p) {
  p.fill('#3d3a3f').noise(0.06);
  for (var k = 0; k < 7; k++) p.walk(p.rng() * 16, p.rng() * 16, 12, '#7a5a3a', 0.35, true);
  return p;
});
CT('suspicious_sand', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#dbcc8e', c2: '#cbbc7c', n: 90, sz: 1 });
  p.frame(3, 3, 10, 10, '#b8a86c'); p.rect(6, 6, 4, 4, '#a89a60');
  return p;
});
CT('suspicious_gravel', function (p) {
  PAINT.cobble(p, { k: 'cobble', c: '#8a8686', d: '#696666' });
  p.frame(3, 3, 10, 10, '#5d5a5a'); p.rect(6, 6, 4, 4, '#4f4c4c');
  return p;
});
CT('soul_sand', function (p) {
  p.fill('#4e3b2c').noise(0.05).blotch(0.06, 5, 3.5);
  /* the three sunken faces */
  var f = [[3, 4], [10, 5], [6, 11]];
  for (var i = 0; i < 3; i++) {
    p.disc(f[i][0], f[i][1], 2.2, '#3a2b20');
    p.px(f[i][0] - 1, f[i][1] - 1, '#2b1f17'); p.px(f[i][0] + 1, f[i][1] - 1, '#2b1f17');
    p.rect(f[i][0] - 1, f[i][1] + 1, 3, 1, '#2b1f17');
  }
  return p;
});
CT('ice', function (p) {
  p.fill('#8ab5e8', 190).noise(0.03);
  for (var k = 0; k < 6; k++) p.walk(p.rng() * 16, p.rng() * 16, 14, '#b8d8f5', 0, true);
  for (var i = 0; i < 5; i++) p.px(3 + i, 3 + i, '#e2f0ff', 220);
  return p;
});
CT('packed_ice', function (p) { p.fill('#93bfe8').noise(0.04); for (var k = 0; k < 8; k++) p.walk(p.rng() * 16, p.rng() * 16, 12, '#b0d6f5', 0, true); return p; });
CT('blue_ice', function (p) { p.fill('#74a8e0').noise(0.03); for (var k = 0; k < 6; k++) p.walk(p.rng() * 16, p.rng() * 16, 12, '#a5cdf0', 0, true); return p; });
CT('magma', function (p) {
  p.fill('#2e1108').noise(0.05);
  for (var k = 0; k < 14; k++) {
    var x = p.rng() * 16, y = p.rng() * 16, r = 1 + p.rng() * 2.4;
    p.disc(x, y, r, '#8e3a10'); p.disc(x, y, r * 0.6, '#d4681c'); p.disc(x, y, r * 0.28, '#f5b04a');
  }
  return p;
});
CT('crying_obsidian', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#100d1a', c2: '#241d38', n: 26, sz: 1 });
  for (var k = 0; k < 5; k++) {
    var x = 2 + ((p.rng() * 12) | 0), y = 1 + ((p.rng() * 6) | 0), h = 3 + ((p.rng() * 7) | 0);
    for (var i = 0; i < h; i++) p.px(x, y + i, i === h - 1 ? '#c85af0' : '#7b2ea8');
  }
  return p;
});
CT('ancient_debris_side', function (p) {
  p.fill('#3c2a25').noise(0.05).blotch(0.06, 5, 3);
  for (var k = 0; k < 8; k++) { var x = p.rng() * 16, y = p.rng() * 16; p.disc(x, y, 1.6, '#6a4b3d'); p.disc(x, y, 0.9, '#8a6650'); }
  return p;
});
CT('ancient_debris_top', function (p) {
  p.fill('#3c2a25').noise(0.05);
  p.disc(8, 8, 4.6, '#6a4b3d'); p.disc(8, 8, 3.1, '#8a6650'); p.disc(8, 8, 1.6, '#5c4034');
  p.speckle('#2a1c18', 20, 1, 0.6);
  return p;
});

/* -------------------------------------------------------- gem / metals -- */
CT('diamond_block', function (p) {
  p.fill('#4fc4c0').noise(0.03);
  var g = [[3, 3], [11, 3], [3, 11], [11, 11], [7, 7]];
  for (var i = 0; i < g.length; i++) {
    p.disc(g[i][0], g[i][1], 2.1, '#8ef0e8'); p.disc(g[i][0], g[i][1], 1.1, '#d8ffff');
    p.px(g[i][0] + 1, g[i][1] + 1, '#2f9a96');
  }
  return p;
});
CT('emerald_block', function (p) {
  p.fill('#28a04c').noise(0.03);
  var g = [[3, 4], [11, 3], [4, 11], [12, 11], [8, 7]];
  for (var i = 0; i < g.length; i++) {
    p.disc(g[i][0], g[i][1], 2.1, '#4ee06e'); p.disc(g[i][0], g[i][1], 1, '#a8ffb8');
    p.px(g[i][0] + 1, g[i][1] + 1, '#166b30');
  }
  return p;
});
CT('amethyst_block', function (p) {
  p.fill('#8659c5').noise(0.04);
  for (var k = 0; k < 10; k++) {
    var x = p.rng() * 16, y = p.rng() * 16;
    p.disc(x, y, 1.8 + p.rng(), '#9b70d8'); p.disc(x, y, 0.9, '#c6a8f0');
  }
  return p;
});
CT('budding_amethyst', function (p) {
  CUSTOM_TEX.amethyst_block(p);
  var b = [[4, 4], [11, 6], [6, 12]];
  for (var i = 0; i < 3; i++) { p.disc(b[i][0], b[i][1], 2.3, '#5c3a8c'); p.disc(b[i][0], b[i][1], 1.3, '#3f2663'); }
  return p;
});
CT('cut_copper', function (p, o) {
  PAINT.metal(p, { k: 'metal', c: o.c, d: o.d });
  p.rect(0, 7, 16, 1, shade(o.d, 0.85)); p.rect(7, 0, 1, 7, shade(o.d, 0.85)); p.rect(7, 8, 1, 8, shade(o.d, 0.85));
  p.rect(0, 8, 16, 1, shade(o.c, 1.12));
  return p;
});
CT('chiseled_copper', function (p, o) {
  PAINT.metal(p, { k: 'metal', c: o.c, d: o.d });
  p.frame(3, 2, 10, 12, shade(o.d, 0.8));
  p.rect(5, 4, 6, 8, shade(o.c, 1.12));
  p.rect(7, 5, 2, 6, shade(o.d, 0.9));
  return p;
});
CT('copper_grate', function (p, o) {
  p.clear();
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    if ((x % 4 < 2) === (y % 4 < 2)) p.px(x, y, ((x + y) % 3) ? o.c : o.d);
  }
  return p;
});
CT('copper_bulb', function (p, o) {
  PAINT.metal(p, { k: 'metal', c: o.c, d: o.d });
  p.disc(8, 8, 4.4, '#f5d87a'); p.disc(8, 8, 3, '#fff0b0'); p.ring(8, 8, 4.4, shade(o.d, 0.8), 1);
  return p;
});
CT('copper_door', function (p, o) { return doorTex(p, o.c, o.d, true); });
CT('copper_trapdoor', function (p, o) { return trapdoorTex(p, o.c, o.d); });

/* --------------------------------------------------------- stone motifs -- */
CT('chiseled_stone_bricks', function (p) {
  p.fill('#6f6f6f').noise(0.04);
  p.frame(1, 1, 14, 14, '#5a5a5a');
  p.rect(3, 3, 10, 10, '#7d7d7d');
  p.rect(6, 4, 4, 3, '#5f5f5f'); p.rect(5, 8, 6, 4, '#5f5f5f');
  p.rect(6, 9, 4, 2, '#8a8a8a');
  return p;
});
CT('chiseled_deepslate', function (p) {
  p.fill('#43434a').noise(0.04);
  p.frame(1, 1, 14, 14, '#33333a');
  p.rect(4, 3, 8, 10, '#4d4d55');
  p.rect(6, 5, 4, 6, '#2e2e34');
  return p;
});
CT('reinforced_deepslate', function (p) {
  p.fill('#414149').noise(0.05);
  p.frame(2, 2, 12, 12, '#2a2a30');
  for (var i = 0; i < 4; i++) { p.px(4 + i * 2, 4, '#8fa06a'); p.px(4 + i * 2, 11, '#8fa06a'); }
  p.rect(6, 6, 4, 4, '#6c7a4e');
  return p;
});
CT('chiseled_blackstone', function (p) {
  p.fill('#2b2529').noise(0.04);
  p.frame(1, 1, 14, 14, '#1c181b');
  p.rect(4, 3, 8, 10, '#332d38'); p.rect(6, 6, 4, 4, '#1c181b');
  return p;
});
CT('chiseled_nether_bricks', function (p) {
  p.fill('#2f181c').noise(0.05);
  p.frame(1, 1, 14, 14, '#1e0f12');
  p.disc(8, 5, 2.2, '#3c2025'); p.rect(6, 9, 5, 4, '#3c2025');
  return p;
});
CT('purpur_pillar', function (p) {
  p.fill('#a97fa9').noise(0.03);
  p.rect(0, 0, 16, 2, '#8d6d92'); p.rect(0, 14, 16, 2, '#8d6d92');
  for (var x = 2; x < 16; x += 4) p.rect(x, 2, 1, 12, '#96709a');
  return p;
});
CT('chiseled_quartz', function (p) {
  p.fill('#eae5dd').noise(0.02);
  p.frame(2, 2, 12, 12, '#cdc6ba'); p.rect(4, 4, 8, 8, '#f2ede6'); p.rect(6, 6, 4, 4, '#d8d1c6');
  return p;
});
CT('quartz_pillar', function (p) {
  p.fill('#eae5dd').noise(0.02);
  p.rect(0, 0, 16, 2, '#d3ccc0'); p.rect(0, 14, 16, 2, '#d3ccc0');
  for (var x = 2; x < 16; x += 4) p.rect(x, 2, 1, 12, '#dcd5c9');
  return p;
});
CT('quartz_pillar_top', function (p) {
  p.fill('#eae5dd').noise(0.02); p.ring(8, 8, 5.5, '#d3ccc0', 2); p.disc(8, 8, 2.4, '#f2ede6');
  return p;
});
CT('prismarine', function (p) {
  p.fill('#5f9c8c').noise(0.05);
  for (var y = 0; y < 16; y += 4) for (var x = 0; x < 16; x += 4) {
    var f = 0.86 + rand2(x, y, 411) * 0.3;
    p.mulRect(x, y, 4, 4, f);
  }
  p.speckle('#79bda9', 20, 1, 0.5);
  return p;
});
CT('prismarine_bricks', function (p) {
  p.fill('#63a898').noise(0.03);
  for (var y = 0; y < 16; y += 8) for (var x = 0; x < 16; x += 8) {
    p.frame(x, y, 8, 8, '#4e8d7e'); p.rect(x + 2, y + 2, 4, 4, '#74bcaa');
  }
  return p;
});
CT('dark_prismarine', function (p) {
  p.fill('#33564a').noise(0.05);
  for (var y = 0; y < 16; y += 4) for (var x = 0; x < 16; x += 4) p.mulRect(x, y, 4, 4, 0.9 + rand2(x, y, 412) * 0.22);
  return p;
});
CT('sea_lantern', function (p) {
  p.fill('#a8d6c8').noise(0.03);
  for (var y = 0; y < 16; y += 8) for (var x = 0; x < 16; x += 8) {
    p.rect(x + 1, y + 1, 6, 6, '#d8f0e6'); p.rect(x + 2, y + 2, 4, 4, '#f0fff8');
  }
  p.speckle('#c0e8d8', 20, 1, 0.5);
  return p;
});
CT('sandstone_side', function (p) {
  p.fill('#dfd3a1').noise(0.03);
  p.rect(0, 0, 16, 4, '#e6dbab'); p.rect(0, 4, 16, 1, '#c8bb85');
  for (var y = 5; y < 16; y++) { var f = 1 + (rand2(0, y, 61) - 0.5) * 0.09; for (var x = 0; x < 16; x++) p.mul(x, y, f); }
  return p;
});
CT('cut_sandstone', function (p) {
  p.fill('#dfd3a1').noise(0.02);
  p.frame(0, 0, 16, 16, '#c8bb85'); p.rect(1, 7, 14, 1, '#c8bb85'); p.rect(7, 1, 1, 14, '#c8bb85');
  return p;
});
CT('chiseled_sandstone', function (p) {
  p.fill('#dfd3a1').noise(0.02);
  p.rect(0, 0, 16, 3, '#e6dbab'); p.rect(0, 3, 16, 1, '#c0b47e');
  p.rect(4, 5, 8, 9, '#cfc28c'); p.rect(6, 7, 4, 5, '#b4a774');
  p.px(8, 6, '#a89c6a');
  return p;
});
CT('red_sandstone_side', function (p) {
  p.fill('#bf6b2c').noise(0.03);
  p.rect(0, 0, 16, 4, '#c87531'); p.rect(0, 4, 16, 1, '#a55b24');
  for (var y = 5; y < 16; y++) { var f = 1 + (rand2(0, y, 62) - 0.5) * 0.1; for (var x = 0; x < 16; x++) p.mul(x, y, f); }
  return p;
});
CT('cut_red_sandstone', function (p) {
  p.fill('#bf6b2c').noise(0.02);
  p.frame(0, 0, 16, 16, '#a55b24'); p.rect(1, 7, 14, 1, '#a55b24'); p.rect(7, 1, 1, 14, '#a55b24');
  return p;
});
CT('chiseled_red_sandstone', function (p) {
  p.fill('#bf6b2c').noise(0.02);
  p.rect(0, 0, 16, 3, '#c87531'); p.rect(0, 3, 16, 1, '#9c5622');
  p.rect(4, 5, 8, 9, '#b06328'); p.rect(6, 7, 4, 5, '#96521f');
  return p;
});
CT('obsidian_dark', function (p) { return PAINT.speck(p, { k: 'speck', c: '#100d1a', c2: '#241d38', n: 26, sz: 1 }); });

/* ------------------------------------------------------ doors / panels -- */
function doorTex(p, c, d, metal) {
  p.fill(c).noise(0.03);
  p.frame(0, 0, 16, 16, shade(d, 0.8));
  p.rect(1, 1, 14, 1, shade(c, 1.12));
  /* upper light panel + lower solid panel */
  p.rect(3, 2, 10, 5, shade(d, metal ? 1.05 : 0.92));
  p.frame(3, 2, 10, 5, shade(d, 0.75));
  p.rect(4, 3, 8, 3, metal ? shade(c, 1.15) : mix(c, '#8ec8e8', 0.55));
  p.rect(3, 9, 10, 6, shade(d, 0.95));
  p.frame(3, 9, 10, 6, shade(d, 0.75));
  /* handle */
  p.rect(12, 7, 2, 2, metal ? '#8a8a8a' : '#6a5a3a');
  p.px(13, 7, metal ? '#c8c8c8' : '#8a7a52');
  return p;
}
function trapdoorTex(p, c, d) {
  p.clear();
  p.rect(0, 0, 16, 3, c); p.rect(0, 13, 16, 3, c);
  p.rect(0, 0, 3, 16, c); p.rect(13, 0, 3, 16, c);
  p.rect(6, 3, 4, 10, c);
  p.noise(0.04);
  p.frame(0, 0, 16, 16, shade(d, 0.85));
  p.rect(1, 1, 2, 2, '#5a5a5a'); p.rect(13, 1, 2, 2, '#5a5a5a');
  p.rect(1, 13, 2, 2, '#5a5a5a'); p.rect(13, 13, 2, 2, '#5a5a5a');
  return p;
}
CT('door', function (p, o) { return doorTex(p, o.c, o.d, false); });
CT('trapdoor', function (p, o) { return trapdoorTex(p, o.c, o.d); });
CT('iron_door', function (p) { return doorTex(p, '#c8c8c8', '#9a9a9a', true); });
CT('iron_trapdoor', function (p) {
  p.clear();
  p.frame(0, 0, 16, 16, '#8a8a8a');
  p.rect(1, 1, 14, 2, '#c0c0c0'); p.rect(1, 13, 14, 2, '#c0c0c0');
  p.rect(1, 3, 2, 10, '#c0c0c0'); p.rect(13, 3, 2, 10, '#c0c0c0');
  p.rect(6, 3, 4, 10, '#b0b0b0');
  for (var i = 0; i < 4; i++) { p.px(2 + (i % 2) * 12, 2 + ((i / 2) | 0) * 12, '#6a6a6a'); }
  return p;
});

/* -------------------------------------------------------------- plants -- */
CT('bamboo_mosaic', function (p) {
  p.fill('#c2b04a').noise(0.03);
  for (var y = 0; y < 16; y += 8) for (var x = 0; x < 16; x += 8) {
    var v = ((x / 8) + (y / 8)) % 2;
    for (var i = 0; i < 8; i++) {
      if (v) p.rect(x, y + i, 8, 1, i % 2 ? '#b0a03f' : '#c8b653');
      else p.rect(x + i, y, 1, 8, i % 2 ? '#b0a03f' : '#c8b653');
    }
  }
  return p;
});
CT('bamboo_stalk', function (p) {
  p.clear();
  for (var y = 0; y < 16; y++) for (var x = 6; x < 10; x++) p.px(x, y, x === 6 ? '#5c7a1c' : (x === 9 ? '#4d6717' : '#7ba026'));
  p.rect(6, 4, 4, 1, '#3f5412'); p.rect(6, 12, 4, 1, '#3f5412');
  return p;
});
CT('shroomlight', function (p) {
  p.fill('#f28a2c').noise(0.04);
  for (var k = 0; k < 12; k++) { var x = p.rng() * 16, y = p.rng() * 16; p.disc(x, y, 1.6, '#ffd06a'); p.disc(x, y, 0.8, '#fff0c0'); }
  return p;
});
CT('crimson_fungus', function (p) {
  p.clear();
  for (var y = 15; y >= 9; y--) p.px(8, y, '#c8b0a0');
  p.disc(8, 7, 3.4, '#8f1f24'); p.disc(8, 7, 2, '#b22e2e');
  p.px(6, 5, '#d8c8b8'); p.px(10, 6, '#d8c8b8');
  return p;
});
CT('warped_fungus', function (p) {
  p.clear();
  for (var y = 15; y >= 9; y--) p.px(8, y, '#d8d0b8');
  p.disc(8, 7, 3.4, '#158f80'); p.disc(8, 7, 2, '#1eb3a0');
  p.px(6, 5, '#e8f0c0'); p.px(10, 6, '#e8f0c0');
  return p;
});
CT('lily_pad', function (p) {
  p.clear();
  p.disc(8, 8, 7.2, '#4e8a3a');
  p.disc(8, 8, 6.2, '#5c9c44');
  p.ring(8, 8, 7.2, '#3f7030', 1);
  /* the notch that makes a lily pad read as a lily pad */
  for (var i = 0; i < 8; i++) {
    var w = Math.max(1, 3 - ((i / 3) | 0));
    for (var k = 0; k < w; k++) { p.set(8 + k, 8 + i, 0, 0, 0, 0); p.set(7 - k + 1, 8 + i, 0, 0, 0, 0); }
  }
  for (var v = 0; v < 5; v++) {
    var a = -Math.PI / 2 + (v - 2) * 0.55;
    for (var r = 1; r < 6; r++) p.blend(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r), '#3f7030', 0.5);
  }
  return p;
});
CT('cactus_side', function (p) {
  p.fill('#4f7d33').noise(0.04);
  p.rect(0, 0, 1, 16, '#3d6427'); p.rect(15, 0, 1, 16, '#3d6427');
  p.rect(1, 0, 14, 1, '#5c8f3c');
  for (var k = 0; k < 14; k++) {
    var x = 2 + ((p.rng() * 12) | 0), y = 1 + ((p.rng() * 14) | 0);
    p.px(x, y, '#dfe8c8'); p.px(x, y + 1, '#b8c49a');
  }
  return p;
});
CT('cactus_top', function (p) {
  p.fill('#5c8f3c').noise(0.04);
  p.ring(8, 8, 6.5, '#3d6427', 1); p.disc(8, 8, 4.5, '#6ba147');
  p.speckle('#dfe8c8', 10, 1, 0.8);
  return p;
});
CT('cactus_bottom', function (p) { p.fill('#4a7530').noise(0.05); p.ring(8, 8, 6.5, '#3d6427', 1); return p; });
CT('vine', function (p) {
  p.clear();
  for (var k = 0; k < 5; k++) {
    var x = 1 + k * 3;
    for (var y = 0; y < 16; y++) {
      var xx = x + Math.round(Math.sin(y * 0.5 + k) * 1.2);
      if (rand2(xx, y, 501 + k) < 0.72) p.px(xx, y, rand2(xx, y, 77) < 0.5 ? '#3e6b25' : '#4f8a2f');
    }
  }
  return p;
});
CT('glow_lichen', function (p) {
  p.clear();
  for (var k = 0; k < 8; k++) p.walk(p.rng() * 16, p.rng() * 16, 16, k % 2 ? '#6a8a72' : '#8fb89a', 0, true);
  for (var i = 0; i < 14; i++) p.px((p.rng() * 16) | 0, (p.rng() * 16) | 0, '#c8f0d0');
  return p;
});
CT('flowering_azalea_leaves', function (p) {
  PAINT.leaves(p, { k: 'leaves', c: '#5f8a34', d: '#4a6e28' });
  for (var k = 0; k < 8; k++) {
    var x = (p.rng() * 16) | 0, y = (p.rng() * 16) | 0;
    p.disc(x, y, 1.2, '#d88fb0'); p.px(x, y, '#f6dc8c');
  }
  return p;
});
CT('dripleaf', function (p) {
  p.fill('#5c9c44').noise(0.04);
  p.ring(8, 8, 7, '#3f7030', 1);
  for (var i = 0; i < 5; i++) p.rect(8, 4 + i * 2, 1, 1, '#79b85c');
  return p;
});
CT('spore_blossom', function (p) {
  p.clear();
  p.disc(8, 8, 6, '#c85a8a'); p.disc(8, 8, 4, '#e07aa8'); p.disc(8, 8, 2, '#f0a0c8');
  p.disc(8, 8, 1, '#f6dc8c');
  return p;
});
CT('cave_vines_berries', function (p) {
  PLANT_SHAPES.cavevine(p, '#5a7a29', '#476020');
  for (var k = 0; k < 5; k++) {
    var y = 2 + k * 3, x = 8 + Math.round(Math.sin(y * 0.5) * 1.3);
    p.disc(x, y, 1.5, '#f0a828'); p.px(x, y, '#ffd870');
  }
  return p;
});
CT('sweet_berry_bush', function (p) {
  PLANT_SHAPES.grass(p, '#3f6b2c', '#2f5220');
  for (var k = 0; k < 6; k++) p.disc(2 + p.rng() * 12, 6 + p.rng() * 8, 1.2, '#b52a2a');
  return p;
});
CT('brown_mushroom', function (p) {
  p.clear();
  for (var y = 15; y >= 10; y--) { p.px(7, y, '#d8d0c0'); p.px(8, y, '#c0b8a8'); }
  p.disc(8, 9, 4.2, '#8a6a4a'); p.disc(8, 9, 2.6, '#a07f58');
  p.rect(4, 10, 9, 1, '#6d5238');
  return p;
});
CT('red_mushroom', function (p) {
  p.clear();
  for (var y = 15; y >= 10; y--) { p.px(7, y, '#e0d8c8'); p.px(8, y, '#c8c0b0'); }
  p.disc(8, 9, 4.4, '#b52a24'); p.disc(6, 7, 1.1, '#f0e8e0'); p.disc(10, 8, 1, '#f0e8e0'); p.disc(8, 10, 1, '#f0e8e0');
  return p;
});
CT('red_mushroom_block', function (p) {
  p.fill('#b52a24').noise(0.03);
  for (var k = 0; k < 5; k++) p.disc(2 + p.rng() * 12, 2 + p.rng() * 12, 2.2, '#efeadc');
  return p;
});
CT('chorus_plant', function (p) {
  p.fill('#7a5a7a').noise(0.05);
  p.ring(8, 8, 6, '#5c405c', 2); p.disc(8, 8, 3.4, '#8f6f8f');
  return p;
});
CT('chorus_flower', function (p) {
  p.fill('#d8d0d8').noise(0.03);
  p.frame(2, 2, 12, 12, '#a898a8'); p.rect(6, 6, 4, 4, '#8f7f8f');
  return p;
});
CT('pumpkin_side', function (p) {
  p.fill('#c07615').noise(0.03);
  for (var x = 0; x < 16; x += 4) p.rect(x, 0, 1, 16, '#a3600f');
  p.rect(0, 0, 16, 1, '#d08a25'); p.rect(0, 15, 16, 1, '#8f5410');
  return p;
});
CT('pumpkin_top', function (p) {
  p.fill('#c07615').noise(0.03); p.ring(8, 8, 6, '#a3600f', 1);
  p.rect(6, 6, 4, 4, '#6f5a2a'); p.rect(7, 5, 2, 6, '#7f6a35');
  return p;
});
CT('pumpkin_face', function (p) {
  CUSTOM_TEX.pumpkin_side(p);
  p.rect(3, 4, 3, 3, '#2a1a08'); p.rect(10, 4, 3, 3, '#2a1a08');
  p.px(4, 7, '#2a1a08'); p.px(11, 7, '#2a1a08');
  p.rect(4, 10, 8, 2, '#2a1a08'); p.px(5, 9, '#2a1a08'); p.px(8, 9, '#2a1a08'); p.px(10, 9, '#2a1a08');
  return p;
});
CT('jack_face', function (p) {
  CUSTOM_TEX.pumpkin_side(p);
  p.rect(3, 4, 3, 3, '#ffd45a'); p.rect(10, 4, 3, 3, '#ffd45a');
  p.px(4, 7, '#ffb020'); p.px(11, 7, '#ffb020');
  p.rect(4, 10, 8, 2, '#ffd45a'); p.px(5, 9, '#ffb020'); p.px(8, 9, '#ffb020'); p.px(10, 9, '#ffb020');
  return p;
});
CT('melon_side', function (p) {
  p.fill('#6f9c2c').noise(0.04);
  for (var x = 0; x < 16; x++) for (var y = 0; y < 16; y++) if ((x + y * 2) % 7 < 2) p.blend(x, y, '#4f7420', 0.7);
  return p;
});
CT('melon_top', function (p) { p.fill('#7ba832').noise(0.04); p.ring(8, 8, 6, '#5c8a25', 1); return p; });
CT('cocoa', function (p) {
  p.clear();
  p.disc(8, 9, 4.4, '#8f5a1c'); p.disc(8, 9, 2.8, '#b8762a');
  p.rect(7, 1, 2, 4, '#5c4020');
  return p;
});

/* ---------------------------------------------------- utility fixtures -- */
CT('crafting_top', function (p) {
  p.fill('#a07f45').noise(0.03);
  p.frame(0, 0, 16, 16, '#6b542e');
  for (var i = 1; i < 4; i++) { p.rect(i * 4, 1, 1, 14, '#7a5f36'); p.rect(1, i * 4, 14, 1, '#7a5f36'); }
  return p;
});
CT('crafting_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(2, 4, 12, 8, '#7a5f36'); p.frame(2, 4, 12, 8, '#5f4a2a');
  p.rect(4, 6, 3, 4, '#8a6d40'); p.rect(9, 6, 3, 4, '#8a6d40');
  return p;
});
CT('crafting_front', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(1, 3, 14, 10, '#8a6d40'); p.frame(1, 3, 14, 10, '#5f4a2a');
  p.rect(3, 5, 4, 3, '#c8b070'); p.rect(9, 5, 4, 3, '#6f5730');
  p.rect(3, 9, 10, 2, '#5f4a2a');
  return p;
});
CT('furnace_top', function (p) {
  p.fill('#7d7d7d').noise(0.05);
  p.frame(2, 2, 12, 12, '#5f5f5f'); p.rect(4, 4, 8, 8, '#6e6e6e');
  return p;
});
CT('furnace_front', function (p) {
  p.fill('#787878').noise(0.05);
  p.rect(2, 5, 12, 9, '#4a4a4a'); p.frame(2, 5, 12, 9, '#3a3a3a');
  p.rect(3, 6, 10, 3, '#5a5a5a');
  for (var i = 0; i < 5; i++) p.rect(3 + i * 2, 10, 1, 3, '#3a3a3a');
  return p;
});
CT('furnace_front_lit', function (p) {
  CUSTOM_TEX.furnace_front(p);
  p.rect(3, 10, 10, 3, '#f08a20');
  for (var i = 0; i < 5; i++) p.rect(3 + i * 2, 10, 1, 2, '#ffd070');
  p.rect(3, 12, 10, 1, '#c05a10');
  return p;
});
CT('blast_side', function (p) {
  p.fill('#5a5a5a').noise(0.05);
  p.rect(0, 0, 16, 4, '#6f6f6f'); p.rect(0, 12, 16, 4, '#6f6f6f');
  for (var x = 2; x < 16; x += 5) p.rect(x, 4, 1, 8, '#4a4a4a');
  return p;
});
CT('blast_top', function (p) { p.fill('#5f5f5f').noise(0.05); p.frame(1, 1, 14, 14, '#3f3f3f'); p.rect(4, 4, 8, 8, '#727272'); return p; });
CT('blast_front', function (p) {
  p.fill('#5a5a5a').noise(0.05);
  p.rect(1, 2, 14, 5, '#3f3f3f'); p.frame(1, 2, 14, 5, '#2f2f2f');
  p.rect(2, 9, 12, 5, '#2b2b2b'); p.frame(2, 9, 12, 5, '#1f1f1f');
  for (var i = 0; i < 4; i++) p.rect(3 + i * 3, 9, 2, 5, '#3a3a3a');
  return p;
});
CT('blast_front_lit', function (p) {
  CUSTOM_TEX.blast_front(p);
  for (var i = 0; i < 4; i++) { p.rect(3 + i * 3, 10, 2, 3, '#f0a020'); p.rect(3 + i * 3, 10, 2, 1, '#ffe090'); }
  return p;
});
CT('smoker_side', function (p) {
  PAINT.logside(p, { k: 'logside', c: '#4a3721', d: '#3a2a19', r: 'sm' });
  p.rect(0, 6, 16, 4, '#5f5f5f');
  return p;
});
CT('smoker_top', function (p) { p.fill('#5f5f5f').noise(0.05); p.ring(8, 8, 5, '#3f3f3f', 2); p.disc(8, 8, 3, '#2b2b2b'); return p; });
CT('smoker_front', function (p) {
  PAINT.logside(p, { k: 'logside', c: '#4a3721', d: '#3a2a19', r: 'sm' });
  p.rect(2, 5, 12, 9, '#3a3a3a'); p.frame(2, 5, 12, 9, '#2a2a2a');
  for (var i = 0; i < 5; i++) p.rect(3 + i * 2, 7, 1, 6, '#2a2a2a');
  return p;
});
CT('smoker_front_lit', function (p) {
  CUSTOM_TEX.smoker_front(p);
  p.rect(3, 8, 10, 5, '#e07818');
  for (var i = 0; i < 5; i++) p.rect(3 + i * 2, 8, 1, 4, '#ffcc60');
  return p;
});
CT('chest', function (p) {
  p.fill('#8a6a35').noise(0.04);
  p.rect(0, 5, 16, 1, '#4f3a1c');
  p.rect(6, 4, 4, 5, '#3a3a3a'); p.rect(7, 5, 2, 3, '#c8a83c');
  p.frame(0, 0, 16, 16, '#5f4526');
  return p;
});
CT('ender_chest', function (p) {
  p.fill('#1d3038').noise(0.05);
  p.rect(0, 5, 16, 1, '#0f1d22');
  p.rect(6, 4, 4, 5, '#0b1417'); p.rect(7, 5, 2, 3, '#4fd8c8');
  p.speckle('#2ea8a0', 12, 1, 0.5);
  return p;
});
CT('barrel_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#7a5a36', d: '#63482a' });
  p.rect(0, 2, 16, 2, '#4a4a4a'); p.rect(0, 12, 16, 2, '#4a4a4a');
  return p;
});
CT('barrel_top', function (p) {
  p.fill('#7a5a36').noise(0.04); p.ring(8, 8, 6.5, '#4a4a4a', 2);
  p.rect(6, 6, 4, 4, '#3a2c1a');
  return p;
});
CT('ench_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#100d1a', c2: '#241d38', n: 26, sz: 1 });
  p.rect(0, 0, 16, 5, '#8a2020'); p.rect(0, 5, 16, 1, '#5f1414');
  p.speckle('#c85050', 10, 1, 0.6);
  return p;
});
CT('ench_top', function (p) {
  p.fill('#151022').noise(0.04);
  p.frame(1, 1, 14, 14, '#3a2f55');
  p.rect(4, 4, 8, 8, '#c8bfa0'); p.rect(5, 5, 6, 6, '#e0d8b8');
  for (var i = 0; i < 6; i++) p.rect(5, 6 + (i % 3) * 2, 6, 1, '#8f8460');
  return p;
});
CT('brewing_stand', function (p) {
  p.clear();
  p.rect(6, 0, 4, 16, '#8a8a8a');
  p.rect(7, 1, 2, 14, '#b0b0b0');
  p.rect(2, 12, 12, 3, '#6a6a6a');
  p.rect(4, 3, 2, 5, '#c8c8c8'); p.rect(10, 3, 2, 5, '#c8c8c8');
  return p;
});
CT('anvil', function (p) {
  p.fill('#4a4a4a').noise(0.05);
  p.rect(0, 0, 16, 3, '#6a6a6a'); p.rect(0, 3, 16, 1, '#2f2f2f');
  p.speckle('#5f5f5f', 14, 1, 0.5);
  return p;
});
CT('anvil_chipped', function (p) { CUSTOM_TEX.anvil(p); for (var k = 0; k < 3; k++) p.walk(p.rng() * 16, p.rng() * 16, 8, '#2a2a2a', 0, true); return p; });
CT('anvil_damaged', function (p) { CUSTOM_TEX.anvil(p); for (var k = 0; k < 7; k++) p.walk(p.rng() * 16, p.rng() * 16, 10, '#242424', 0, true); return p; });
CT('smithing_side', function (p) {
  p.fill('#3a3540').noise(0.04);
  p.rect(0, 0, 16, 6, '#2b2730');
  p.rect(2, 8, 5, 6, '#6b542e'); p.rect(9, 8, 5, 6, '#6b542e');
  return p;
});
CT('smithing_top', function (p) {
  p.fill('#2b2730').noise(0.04);
  p.rect(2, 2, 12, 12, '#4a4450');
  p.rect(5, 5, 6, 6, '#6a6a72');
  return p;
});
CT('smithing_bottom', function (p) { PAINT.planks(p, { k: 'planks', c: '#4b3418', d: '#3a2812' }); return p; });
CT('grindstone', function (p) {
  p.fill('#7d7d7d').noise(0.05);
  p.disc(8, 8, 6, '#5f5f5f'); p.disc(8, 8, 4.4, '#8a8a8a');
  p.rect(0, 7, 16, 2, '#6b542e');
  return p;
});
CT('stonecutter_side', function (p) {
  p.fill('#7d7d7d').noise(0.05);
  p.rect(0, 0, 16, 5, '#5f5f5f');
  p.rect(6, 5, 4, 11, '#8a8a8a');
  return p;
});
CT('stonecutter_top', function (p) {
  p.fill('#7d7d7d').noise(0.05);
  p.rect(7, 0, 2, 16, '#c8c8c8');
  for (var i = 0; i < 8; i++) p.px(7 + (i % 2), i * 2, '#f0f0f0');
  return p;
});
CT('carto_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(2, 3, 12, 8, '#e0d6b8'); p.frame(2, 3, 12, 8, '#8a7a52');
  for (var i = 0; i < 4; i++) p.rect(3, 5 + i * 2, 10, 1, '#b0a078');
  return p;
});
CT('carto_top', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(3, 3, 10, 10, '#e0d6b8'); p.frame(3, 3, 10, 10, '#8a7a52');
  p.walk(8, 8, 22, '#a08a5a', 0, false);
  return p;
});
CT('fletch_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(3, 3, 2, 10, '#5f4a2a'); p.rect(11, 3, 2, 10, '#5f4a2a');
  p.rect(6, 5, 4, 1, '#d8d0b0');
  return p;
});
CT('fletch_top', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(2, 6, 12, 1, '#8a7a52'); p.rect(2, 9, 12, 1, '#8a7a52');
  return p;
});
CT('loom_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(0, 0, 16, 4, '#e8e4d8');
  return p;
});
CT('loom_top', function (p) {
  p.fill('#e8e4d8').noise(0.03);
  for (var i = 0; i < 8; i++) p.rect(i * 2, 0, 1, 16, '#c8c2b0');
  return p;
});
CT('loom_front', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(0, 0, 16, 4, '#e8e4d8');
  p.rect(3, 6, 10, 7, '#d8d2c0'); p.frame(3, 6, 10, 7, '#8a7a52');
  for (var i = 0; i < 4; i++) p.rect(4 + i * 2, 7, 1, 5, '#a89a70');
  return p;
});
CT('composter', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#7a5a36', d: '#63482a' });
  p.rect(0, 0, 16, 2, '#5f4526'); p.rect(0, 14, 16, 2, '#5f4526');
  p.rect(7, 0, 2, 16, '#5f4526');
  return p;
});
CT('cauldron', function (p) {
  p.fill('#4a4a4a').noise(0.05);
  p.rect(0, 0, 16, 3, '#6a6a6a');
  p.speckle('#3a3a3a', 16, 1, 0.6);
  return p;
});
CT('lectern', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#7a5a36', d: '#63482a' });
  p.rect(2, 2, 12, 5, '#d8d0b0'); p.rect(7, 2, 2, 5, '#9a8a60');
  return p;
});
CT('bell', function (p) {
  p.clear();
  p.disc(8, 8, 5.5, '#d8a82c'); p.disc(8, 7, 4, '#f0c84c');
  p.rect(5, 12, 6, 2, '#b08a20');
  p.rect(7, 1, 2, 3, '#6a5a3a');
  return p;
});
CT('beacon', function (p) {
  p.fill('#4a8f8a').noise(0.04);
  p.frame(1, 1, 14, 14, '#2b5a58');
  p.rect(4, 4, 8, 8, '#111820'); p.rect(6, 6, 4, 4, '#7fe8dd');
  return p;
});
CT('conduit', function (p) {
  p.fill('#c8b878').noise(0.04);
  p.disc(8, 8, 5, '#5a4a2a'); p.disc(8, 8, 3, '#f0e0a0');
  return p;
});
CT('anchor_side', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#100d1a', c2: '#241d38', n: 26, sz: 1 });
  p.rect(0, 5, 16, 6, '#2b2438');
  for (var i = 0; i < 4; i++) p.rect(2 + i * 4, 6, 2, 4, '#4a3f66');
  return p;
});
CT('anchor_top', function (p) {
  PAINT.speck(p, { k: 'speck', c: '#100d1a', c2: '#241d38', n: 26, sz: 1 });
  p.frame(3, 3, 10, 10, '#4a3f66'); p.rect(5, 5, 6, 6, '#7b4fa8');
  return p;
});
CT('lodestone_side', function (p) {
  p.fill('#6a6a72').noise(0.05);
  p.rect(0, 0, 16, 2, '#4a4a52'); p.rect(0, 14, 16, 2, '#4a4a52');
  for (var x = 3; x < 16; x += 5) p.rect(x, 2, 1, 12, '#585860');
  return p;
});
CT('lodestone_top', function (p) {
  p.fill('#6a6a72').noise(0.05); p.frame(2, 2, 12, 12, '#4a4a52');
  p.disc(8, 8, 3, '#c8c8d0'); p.rect(7, 5, 2, 6, '#a83030');
  return p;
});
CT('jukebox_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#5c4022', d: '#48321a' });
  p.rect(0, 6, 16, 4, '#3a2814');
  p.rect(2, 7, 4, 2, '#8a6a35');
  return p;
});
CT('jukebox_top', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#5c4022', d: '#48321a' });
  p.rect(3, 3, 10, 10, '#2a1c0e'); p.disc(8, 8, 4, '#4a4a4a'); p.disc(8, 8, 1, '#8a8a8a');
  return p;
});
CT('note_block', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#5c4022', d: '#48321a' });
  p.speckle('#2a1c0e', 30, 1, 0.5);
  p.rect(6, 6, 4, 4, '#2a1c0e'); p.px(7, 7, '#8a7a52');
  return p;
});
CT('bookshelf', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.rect(0, 1, 16, 6, '#5f4526'); p.rect(0, 9, 16, 6, '#5f4526');
  var cols = ['#9c3a3a', '#3a5f9c', '#3a9c5f', '#9c8a3a', '#7a3a9c', '#b06a2a'];
  for (var r = 0; r < 2; r++) {
    var y = r ? 9 : 1, x = 0;
    while (x < 16) {
      var w = 1 + ((rand2(x, r, 71) * 2) | 0), h = 5 - ((rand2(x, r, 72) * 2) | 0);
      p.rect(x, y + (6 - h), w, h, cols[(rand2(x, r, 73) * 6) | 0]);
      x += w + 1;
    }
  }
  return p;
});
CT('chiseled_bookshelf', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  for (var i = 0; i < 3; i++) { p.rect(i * 5 + 1, 1, 4, 6, '#4a3520'); p.rect(i * 5 + 1, 9, 4, 6, '#4a3520'); }
  return p;
});
CT('hay_side', function (p) {
  p.fill('#b09a22').noise(0.05);
  p.rect(0, 0, 16, 2, '#8a7818'); p.rect(0, 14, 16, 2, '#8a7818');
  for (var x = 0; x < 16; x++) { var f = 1 + (rand2(x, 0, 91) - 0.5) * 0.22; for (var y = 2; y < 14; y++) p.mul(x, y, f); }
  return p;
});
CT('hay_top', function (p) {
  p.fill('#c8b02a').noise(0.06);
  for (var k = 0; k < 30; k++) p.disc(p.rng() * 16, p.rng() * 16, 1, '#a89020');
  return p;
});
CT('bone_side', function (p) {
  p.fill('#e0dcc8').noise(0.03);
  p.rect(0, 0, 16, 2, '#c0bca8'); p.rect(0, 14, 16, 2, '#c0bca8');
  for (var x = 2; x < 16; x += 4) p.rect(x, 2, 2, 12, '#cec9b4');
  return p;
});
CT('bone_top', function (p) {
  p.fill('#e0dcc8').noise(0.03);
  p.disc(5, 5, 2.4, '#b8b4a0'); p.disc(11, 5, 2.4, '#b8b4a0');
  p.disc(5, 11, 2.4, '#b8b4a0'); p.disc(11, 11, 2.4, '#b8b4a0');
  return p;
});
CT('honey', function (p) {
  p.fill('#e09a20', 220).noise(0.03);
  p.frame(0, 0, 16, 16, '#c07c10');
  for (var i = 0; i < 4; i++) p.px(3 + i, 3 + i, '#ffd870', 240);
  return p;
});
CT('honeycomb', function (p) {
  p.fill('#c07c10').noise(0.03);
  for (var y = 0; y < 16; y += 5) for (var x = (y / 5 % 2) * 3; x < 16; x += 6) {
    p.disc(x + 2, y + 2, 2.2, '#f0b840'); p.disc(x + 2, y + 2, 1.2, '#e0a020');
  }
  return p;
});
CT('slime', function (p) {
  p.fill('#6ec06a', 200).noise(0.04);
  p.frame(0, 0, 16, 16, '#4f9c4c');
  p.disc(5, 5, 2, '#9ae094', 220); p.disc(11, 10, 1.6, '#9ae094', 220);
  return p;
});
CT('cobweb', function (p) {
  p.clear();
  for (var a = 0; a < 8; a++) {
    var ang = a * Math.PI / 4;
    for (var r = 0; r < 11; r++) p.px(Math.round(8 + Math.cos(ang) * r), Math.round(8 + Math.sin(ang) * r), '#e8e8f0');
  }
  for (var rr = 3; rr <= 9; rr += 3) p.ring(8, 8, rr, '#d8d8e4', 1);
  return p;
});
CT('scaffolding', function (p) {
  p.clear();
  p.rect(0, 0, 16, 3, '#c2b04a'); p.rect(0, 0, 3, 16, '#a89740'); p.rect(13, 0, 3, 16, '#a89740');
  p.rect(0, 13, 16, 3, '#8f8236');
  return p;
});
CT('ladder', function (p) {
  p.clear();
  p.rect(2, 0, 2, 16, '#8a6a35'); p.rect(12, 0, 2, 16, '#8a6a35');
  for (var y = 2; y < 16; y += 5) p.rect(4, y, 8, 2, '#a07f45');
  return p;
});
CT('iron_bars', function (p) {
  p.clear();
  p.rect(6, 0, 4, 16, '#9a9a9a'); p.rect(7, 0, 2, 16, '#c0c0c0');
  return p;
});
CT('chain', function (p) {
  p.clear();
  for (var y = 0; y < 16; y += 4) { p.rect(6, y, 4, 3, '#5a5a5a'); p.rect(7, y + 1, 2, 1, '#8a8a8a'); }
  return p;
});

/* --------------------------------------------------------- light / fx -- */
CT('torch', function (p) {
  p.clear();
  p.rect(7, 6, 2, 10, '#8a6a3a');
  p.rect(7, 6, 1, 10, '#a07f45');
  p.rect(6, 4, 4, 3, '#f0a020'); p.rect(7, 3, 2, 2, '#ffe090'); p.px(8, 2, '#fff6c8');
  return p;
});
CT('soul_torch', function (p) {
  CUSTOM_TEX.torch(p);
  p.rect(6, 4, 4, 3, '#2ab0d0'); p.rect(7, 3, 2, 2, '#8ef0ff'); p.px(8, 2, '#d0ffff');
  return p;
});
CT('redstone_torch', function (p) {
  p.clear();
  p.rect(7, 6, 2, 10, '#8a6a3a'); p.rect(7, 6, 1, 10, '#a07f45');
  p.rect(7, 3, 2, 3, '#c81c1c'); p.px(8, 2, '#ff5a5a');
  return p;
});
CT('lantern', function (p) {
  p.clear();
  p.rect(7, 0, 2, 3, '#5a5a5a');
  p.rect(5, 3, 6, 2, '#8a8a8a');
  p.rect(5, 5, 6, 6, '#f0c040'); p.rect(6, 6, 4, 4, '#fff0a0');
  p.rect(5, 11, 6, 2, '#8a8a8a');
  p.rect(6, 13, 4, 1, '#5a5a5a');
  return p;
});
CT('soul_lantern', function (p) {
  CUSTOM_TEX.lantern(p);
  p.rect(5, 5, 6, 6, '#2ab0d0'); p.rect(6, 6, 4, 4, '#b0f8ff');
  return p;
});
CT('end_rod', function (p) {
  p.clear();
  p.rect(6, 0, 4, 12, '#f0ece0'); p.rect(7, 0, 2, 12, '#ffffff');
  p.rect(5, 12, 6, 4, '#c8c0b0'); p.rect(6, 13, 4, 2, '#e8e0d0');
  return p;
});
CT('campfire', function (p) {
  p.clear();
  p.rect(0, 10, 16, 3, '#6b542e'); p.rect(0, 11, 16, 1, '#8a6a35');
  p.rect(2, 6, 12, 4, '#f08a20'); p.rect(4, 4, 8, 3, '#ffc050'); p.rect(6, 2, 4, 2, '#fff0b0');
  p.rect(0, 13, 16, 3, '#4a4a4a');
  return p;
});
CT('soul_campfire', function (p) {
  CUSTOM_TEX.campfire(p);
  p.rect(2, 6, 12, 4, '#1f90b8'); p.rect(4, 4, 8, 3, '#5ad0ec'); p.rect(6, 2, 4, 2, '#c8fbff');
  return p;
});
CT('glowstone', function (p) {
  p.fill('#8a6a2a').noise(0.05);
  for (var k = 0; k < 16; k++) {
    var x = p.rng() * 16, y = p.rng() * 16;
    p.disc(x, y, 1.6, '#e0b850'); p.disc(x, y, 0.9, '#fff0b0');
  }
  return p;
});
CT('fire', function (p) {
  p.clear();
  for (var x = 0; x < 16; x++) {
    var h = 6 + Math.round(Math.sin(x * 0.9) * 3 + rand2(x, 3, 811) * 5);
    for (var y = 15; y > 15 - h; y--) {
      var t = (15 - y) / h;
      p.px(x, y, t < 0.35 ? '#e05a10' : (t < 0.7 ? '#f09020' : '#ffd060'), 255);
    }
  }
  return p;
});
CT('soul_fire', function (p) {
  CUSTOM_TEX.fire(p);
  for (var i = 0; i < p.d.length; i += 4) {
    if (p.d[i + 3] === 0) continue;
    var l = p.d[i] * 0.4 + p.d[i + 1] * 0.5;
    p.d[i] = clamp(l * 0.2, 0, 255); p.d[i + 1] = clamp(l * 0.75, 0, 255); p.d[i + 2] = clamp(l * 1.0, 0, 255);
  }
  return p;
});
CT('nether_portal', function (p) {
  p.fill('#5a1fa8', 200);
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    var n = rand2(x * 3, y * 5, 921);
    p.blend(x, y, n < 0.3 ? '#8f3fd8' : (n < 0.6 ? '#3a1070' : '#a85ff0'), 0.6);
  }
  p.noise(0.08);
  return p;
});
CT('end_portal', function (p) {
  p.fill('#050a12');
  for (var k = 0; k < 45; k++) {
    var x = (p.rng() * 16) | 0, y = (p.rng() * 16) | 0;
    p.px(x, y, p.rng() < 0.5 ? '#7fe8dd' : '#3a6a8f');
  }
  return p;
});
CT('end_frame_side', function (p) {
  p.fill('#c8cf9a').noise(0.03);
  p.rect(0, 0, 16, 5, '#dee3b8');
  p.rect(0, 5, 16, 1, '#a8ae7a');
  return p;
});
CT('end_frame_top', function (p) {
  p.fill('#dee3b8').noise(0.03);
  p.frame(2, 2, 12, 12, '#a8ae7a'); p.rect(4, 4, 8, 8, '#3a4a5a');
  return p;
});
CT('end_frame_bottom', function (p) { p.fill('#c8cf9a').noise(0.04); return p; });
CT('dragon_egg', function (p) {
  p.fill('#0d0a14').noise(0.04);
  p.speckle('#2a1f3a', 22, 1, 0.7); p.speckle('#4a3a66', 8, 1, 0.5);
  return p;
});
CT('spawner', function (p) {
  p.clear();
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    if ((x % 4 === 0) || (y % 4 === 0)) p.px(x, y, ((x + y) % 8 < 4) ? '#2b3238' : '#3a444c');
  }
  return p;
});
CT('trial_spawner_side', function (p) {
  p.fill('#3a3a44').noise(0.05);
  p.frame(2, 2, 12, 12, '#22222a');
  p.rect(5, 5, 6, 6, '#1a4a52'); p.disc(8, 8, 2, '#3ad0c0');
  return p;
});
CT('trial_spawner_top', function (p) { p.fill('#2e2e36').noise(0.05); p.ring(8, 8, 5, '#3ad0c0', 1); return p; });
CT('vault_side', function (p) { p.fill('#33333c').noise(0.05); p.frame(1, 1, 14, 14, '#22222a'); return p; });
CT('vault_top', function (p) { p.fill('#2a2a32').noise(0.05); p.disc(8, 8, 4, '#c8a83c'); p.disc(8, 8, 2, '#3a3a44'); return p; });
CT('vault_front', function (p) {
  p.fill('#33333c').noise(0.05);
  p.frame(2, 2, 12, 12, '#c8a83c'); p.rect(5, 5, 6, 6, '#1a1a20');
  p.disc(8, 8, 2, '#f0c84c');
  return p;
});

/* ---------------------------------------------------------- deep dark -- */
CT('sculk_vein', function (p) {
  p.clear();
  for (var k = 0; k < 7; k++) p.walk(p.rng() * 16, p.rng() * 16, 14, k % 2 ? '#0f4a52' : '#1a6f78', 0, true);
  for (var i = 0; i < 10; i++) p.px((p.rng() * 16) | 0, (p.rng() * 16) | 0, '#2fc0cc');
  return p;
});
CT('sculk_catalyst_side', function (p) {
  PAINT.sculk(p);
  p.rect(0, 0, 16, 4, '#1b2a2e');
  for (var i = 0; i < 5; i++) p.px(2 + i * 3, 2, '#e0f0f0');
  return p;
});
CT('sculk_catalyst_top', function (p) {
  PAINT.sculk(p);
  p.disc(8, 8, 4, '#dfeff0'); p.disc(8, 8, 2.2, '#8fc8cc');
  return p;
});
CT('sculk_shrieker', function (p) {
  PAINT.sculk(p);
  p.ring(8, 8, 6, '#d8c890', 1); p.ring(8, 8, 4, '#b8a870', 1); p.disc(8, 8, 2.4, '#2a1f28');
  return p;
});
CT('sculk_sensor', function (p) {
  PAINT.sculk(p);
  for (var k = 0; k < 3; k++) {
    var x = 3 + k * 5;
    for (var y = 2; y < 12; y++) p.px(x, y, '#1f8f9c');
    p.disc(x, 2, 1.4, '#3fd8e0');
  }
  return p;
});

/* -------------------------------------------------------- amethyst buds */
function budTex(p, h) {
  p.clear();
  var xs = [5, 8, 11], hs = [h * 0.7, h, h * 0.8];
  for (var i = 0; i < 3; i++) {
    var top = 15 - Math.round(hs[i]);
    for (var y = 15; y >= top; y--) {
      p.px(xs[i], y, '#8f66c8');
      p.px(xs[i] + 1, y, '#a884dd');
    }
    p.px(xs[i], top - 1, '#d8c0f8'); p.px(xs[i] + 1, top - 1, '#e8dcff');
  }
  return p;
}
CT('amethyst_bud1', function (p) { return budTex(p, 3); });
CT('amethyst_bud2', function (p) { return budTex(p, 5); });
CT('amethyst_bud3', function (p) { return budTex(p, 8); });
CT('amethyst_cluster', function (p) {
  budTex(p, 11);
  p.px(3, 9, '#a884dd'); p.px(13, 10, '#a884dd');
  for (var y = 15; y >= 9; y--) { p.px(3, y, '#8f66c8'); p.px(13, y, '#8f66c8'); }
  return p;
});
CT('pointed_dripstone', function (p) {
  p.clear();
  for (var y = 0; y < 16; y++) {
    var w = Math.max(1, Math.round((16 - y) * 0.42));
    for (var x = 8 - w; x <= 8 + w; x++) p.px(x, y, x < 8 ? '#8a6a5a' : (x === 8 ? '#9b7b69' : '#6f5346'));
  }
  return p;
});

/* --------------------------------------------------------- redstone fx -- */
CT('redstone_dust', function (p) {
  p.clear();
  p.rect(6, 0, 4, 16, '#8f1010'); p.rect(7, 0, 2, 16, '#b81b1b');
  p.rect(0, 6, 16, 4, '#8f1010'); p.rect(0, 7, 16, 2, '#b81b1b');
  return p;
});
CT('repeater', function (p) {
  p.fill('#b0aaa4').noise(0.03);
  p.speckle('#8f8a84', 24, 1, 0.5);
  p.rect(7, 3, 2, 2, '#c81c1c'); p.rect(7, 10, 2, 2, '#c81c1c');
  p.rect(6, 12, 4, 2, '#6a6a6a');
  return p;
});
CT('comparator', function (p) {
  p.fill('#b0aaa4').noise(0.03);
  p.speckle('#8f8a84', 24, 1, 0.5);
  p.rect(5, 3, 2, 2, '#c81c1c'); p.rect(9, 3, 2, 2, '#c81c1c'); p.rect(7, 11, 2, 2, '#c81c1c');
  return p;
});
CT('lever', function (p) {
  p.clear();
  p.rect(5, 10, 6, 5, '#7d7d7d'); p.frame(5, 10, 6, 5, '#5f5f5f');
  p.rect(7, 3, 2, 8, '#8a6a3a'); p.rect(7, 2, 2, 2, '#a8a8a8');
  return p;
});
CT('observer_side', function (p) {
  p.fill('#6f6f6f').noise(0.05);
  p.rect(0, 6, 16, 4, '#5a5a5a');
  return p;
});
CT('observer_top', function (p) { p.fill('#6f6f6f').noise(0.05); p.rect(0, 7, 16, 2, '#4a4a4a'); return p; });
CT('observer_front', function (p) {
  p.fill('#5a5a5a').noise(0.05);
  p.disc(8, 8, 4.4, '#3a3a3a'); p.disc(8, 8, 2.6, '#c8c8c8');
  return p;
});
CT('observer_back', function (p) {
  p.fill('#5a5a5a').noise(0.05);
  p.disc(5, 8, 2, '#c81c1c'); p.disc(11, 8, 2, '#c81c1c');
  return p;
});
CT('piston_side', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#a07f45', d: '#8a6a35' });
  p.rect(0, 0, 16, 4, '#7d7d7d'); p.rect(0, 4, 16, 1, '#5f5f5f');
  return p;
});
CT('piston_front', function (p) {
  PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' });
  p.frame(0, 0, 16, 16, '#6b542e');
  for (var i = 0; i < 4; i++) { p.px(i * 5, i * 5, '#5f4a2a'); }
  return p;
});
CT('piston_back', function (p) { p.fill('#7d7d7d').noise(0.05); p.frame(0, 0, 16, 16, '#5f5f5f'); p.rect(5, 5, 6, 6, '#6a6a6a'); return p; });
CT('piston_sticky', function (p) {
  CUSTOM_TEX.piston_front(p);
  p.disc(8, 8, 5, '#6ec06a'); p.disc(8, 8, 3, '#9ae094');
  return p;
});
CT('dispenser_front', function (p) {
  p.fill('#787878').noise(0.05);
  p.rect(4, 4, 8, 8, '#3a3a3a'); p.frame(4, 4, 8, 8, '#2a2a2a');
  p.rect(6, 6, 4, 4, '#5a5a5a');
  return p;
});
CT('dropper_front', function (p) {
  p.fill('#787878').noise(0.05);
  p.rect(5, 5, 6, 6, '#3a3a3a'); p.frame(5, 5, 6, 6, '#2a2a2a');
  return p;
});
CT('hopper', function (p) {
  p.fill('#4a4a4a').noise(0.05);
  p.rect(0, 0, 16, 3, '#6a6a6a'); p.rect(0, 3, 16, 1, '#2f2f2f');
  return p;
});
CT('redstone_lamp', function (p) {
  p.fill('#6a4a28').noise(0.05);
  for (var y = 0; y < 16; y += 4) for (var x = 0; x < 16; x += 4) p.rect(x + 1, y + 1, 2, 2, '#8a6a38');
  return p;
});
CT('redstone_lamp_lit', function (p) {
  p.fill('#c89040').noise(0.04);
  for (var y = 0; y < 16; y += 4) for (var x = 0; x < 16; x += 4) p.rect(x + 1, y + 1, 2, 2, '#ffe090');
  return p;
});
CT('target_side', function (p) {
  p.fill('#e8e0d0').noise(0.03);
  p.ring(8, 8, 6, '#c82a2a', 2); p.ring(8, 8, 3, '#c82a2a', 2); p.disc(8, 8, 1.2, '#c82a2a');
  return p;
});
CT('target_top', function (p) { return CUSTOM_TEX.target_side(p); });
CT('daylight_top', function (p) {
  p.fill('#2a2a3a').noise(0.04);
  p.rect(1, 1, 14, 14, '#3a4a6a');
  for (var i = 0; i < 4; i++) p.rect(2 + i * 3, 2, 2, 12, '#5a7ab0');
  return p;
});
CT('daylight_side', function (p) { PAINT.planks(p, { k: 'planks', c: '#b0904f', d: '#98793f' }); p.rect(0, 0, 16, 4, '#3a4a6a'); return p; });
CT('tripwire_hook', function (p) {
  p.clear();
  p.rect(6, 2, 4, 3, '#8a6a3a'); p.rect(7, 5, 2, 5, '#8a8a8a'); p.rect(6, 10, 4, 2, '#5a5a5a');
  return p;
});
CT('lightning_rod', function (p) {
  p.clear();
  p.rect(6, 2, 4, 14, '#c06a43'); p.rect(7, 2, 2, 14, '#d88a5a');
  p.rect(5, 0, 6, 3, '#a75935');
  return p;
});
function railTex(p, tie, rail) {
  p.clear();
  for (var y = 1; y < 16; y += 4) p.rect(0, y, 16, 2, tie);
  p.rect(3, 0, 2, 16, rail); p.rect(11, 0, 2, 16, rail);
  return p;
}
CT('rail', function (p) { return railTex(p, '#6b542e', '#9a9a9a'); });
CT('powered_rail', function (p) { railTex(p, '#8a6a2a', '#c8a83c'); p.rect(0, 7, 16, 2, '#c82a2a'); return p; });
CT('detector_rail', function (p) { railTex(p, '#6b542e', '#9a9a9a'); p.rect(6, 6, 4, 4, '#7d7d7d'); return p; });
CT('activator_rail', function (p) { railTex(p, '#5a4a2a', '#9a9a9a'); p.rect(0, 6, 16, 1, '#c82a2a'); p.rect(0, 9, 16, 1, '#c82a2a'); return p; });

/* ------------------------------------------------------------- others -- */
CT('tnt_side', function (p) {
  p.fill('#c8322a').noise(0.03);
  p.rect(0, 4, 16, 8, '#e8e4d8');
  for (var i = 0; i < 4; i++) p.rect(1 + i * 4, 6, 3, 4, '#2a2a2a');
  p.rect(0, 0, 16, 4, '#a8281f'); p.rect(0, 12, 16, 4, '#a8281f');
  return p;
});
CT('tnt_top', function (p) { p.fill('#c8322a').noise(0.03); p.disc(8, 8, 3, '#e8e4d8'); p.rect(7, 2, 2, 5, '#8a7a52'); return p; });
CT('tnt_bottom', function (p) { p.fill('#8a281f').noise(0.04); return p; });
CT('flower_pot', function (p) {
  p.clear();
  p.rect(3, 4, 10, 12, '#96604a'); p.rect(2, 3, 12, 2, '#a86a52');
  p.rect(4, 6, 8, 8, '#7b4d3c');
  return p;
});
CT('shulker', function (p, o) {
  p.fill(o.c).noise(0.03);
  p.rect(0, 0, 16, 6, shade(o.c, 1.1));
  p.rect(0, 6, 16, 1, o.d);
  p.frame(0, 0, 16, 16, shade(o.d, 0.85));
  p.rect(6, 4, 4, 4, shade(o.d, 0.8));
  return p;
});

/* ------------------------------------------------------ break overlay -- */
/* Ten progressively worse crack sheets, drawn over the block being mined. */
var CRACK_LAYERS = [];
function bakeCrackTiles() {
  if (CRACK_LAYERS.length) return;
  for (var s = 0; s < 10; s++) {
    var p = new Pain();
    p.seed(0x2f00 + s * 977);
    p.clear();
    var walks = 1 + Math.floor(s * 0.9);
    var alpha = 110 + s * 15;
    for (var l = 0; l < walks; l++) {
      var x = Math.floor(p.rng() * 16), y = Math.floor(p.rng() * 16);
      var len = 4 + Math.floor(p.rng() * (4 + s));
      var horiz = p.rng() < 0.5;
      var dx = p.rng() < 0.5 ? 1 : -1, dy = p.rng() < 0.5 ? 1 : -1;
      for (var i = 0; i < len; i++) {
        p.set(x, y, 16, 13, 11, alpha);
        if (horiz) { x += dx; if (p.rng() < 0.34) y += dy; }
        else { y += dy; if (p.rng() < 0.34) x += dx; }
        if (p.rng() < 0.10) dx = -dx;
        if (p.rng() < 0.10) dy = -dy;
        if (x < 0 || x > 15 || y < 0 || y > 15) break;
      }
    }
    CRACK_LAYERS.push(rawLayer('crack:' + s, p.d));
  }
}
