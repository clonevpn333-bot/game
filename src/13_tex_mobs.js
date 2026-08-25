/* =========================================================================
 * MOB SKIN TILES — faces and patterned hides.  Everything else on a mob is
 * a plain noised colour tile generated on demand by partTile().
 * ========================================================================= */

function faceBase(p, c, v) { p.fill(c).noise(v === undefined ? 0.045 : v); return p; }
function eyes(p, x1, x2, y, w, h, cw, ce) {
  p.rect(x1, y, w, h, cw); p.rect(x2, y, w, h, cw);
  if (ce) { p.rect(x1 + (w > 2 ? 1 : 0), y, w > 2 ? w - 1 : w, h, ce); p.rect(x2, y, w > 2 ? w - 1 : w, h, ce); }
}

CT('face_player', function (p) {
  faceBase(p, '#b58762');
  p.rect(3, 6, 3, 2, '#ffffff'); p.rect(10, 6, 3, 2, '#ffffff');
  p.rect(4, 6, 2, 2, '#4a6f9c'); p.rect(10, 6, 2, 2, '#4a6f9c');
  p.rect(0, 0, 16, 4, '#3a2a1a'); p.rect(0, 4, 3, 3, '#3a2a1a'); p.rect(13, 4, 3, 3, '#3a2a1a');
  p.rect(6, 10, 4, 1, '#8a5f42');
  return p;
});
CT('face_zombie', function (p) {
  faceBase(p, '#4a7a3c');
  p.rect(3, 6, 3, 2, '#1d3b18'); p.rect(10, 6, 3, 2, '#1d3b18');
  p.rect(0, 0, 16, 4, '#2f4a26');
  p.rect(6, 10, 4, 2, '#2b4a22');
  return p;
});
CT('face_husk', function (p) {
  faceBase(p, '#a08b62');
  p.rect(3, 6, 3, 2, '#4a3c24'); p.rect(10, 6, 3, 2, '#4a3c24');
  p.rect(0, 0, 16, 4, '#7f6d4c');
  return p;
});
CT('face_drowned', function (p) {
  faceBase(p, '#3f6d68');
  p.rect(3, 6, 3, 2, '#c8e070'); p.rect(10, 6, 3, 2, '#c8e070');
  p.rect(0, 0, 16, 4, '#2d514f');
  p.speckle('#57847e', 16, 1, 0.6);
  return p;
});
CT('face_skeleton', function (p) {
  faceBase(p, '#c8c8c8', 0.05);
  p.rect(3, 5, 3, 3, '#1a1a1a'); p.rect(10, 5, 3, 3, '#1a1a1a');
  p.rect(6, 10, 4, 1, '#3a3a3a');
  p.rect(5, 12, 1, 2, '#3a3a3a'); p.rect(8, 12, 1, 2, '#3a3a3a'); p.rect(10, 12, 1, 2, '#3a3a3a');
  return p;
});
CT('face_wither_skeleton', function (p) {
  faceBase(p, '#2e2e2e', 0.06);
  p.rect(3, 5, 3, 3, '#0a0a0a'); p.rect(10, 5, 3, 3, '#0a0a0a');
  p.rect(5, 11, 6, 1, '#101010');
  return p;
});
CT('face_creeper', function (p) {
  faceBase(p, '#5fa04e');
  p.rect(3, 4, 3, 3, '#0d0d0d'); p.rect(10, 4, 3, 3, '#0d0d0d');
  p.rect(6, 7, 4, 4, '#0d0d0d'); p.rect(5, 9, 2, 4, '#0d0d0d'); p.rect(9, 9, 2, 4, '#0d0d0d');
  p.speckle('#4f8c40', 26, 1, 0.5);
  return p;
});
CT('face_enderman', function (p) {
  faceBase(p, '#0f0f14', 0.03);
  p.rect(2, 7, 5, 2, '#d8b8ff'); p.rect(9, 7, 5, 2, '#d8b8ff');
  p.rect(3, 7, 3, 2, '#f0e0ff'); p.rect(10, 7, 3, 2, '#f0e0ff');
  return p;
});
CT('face_spider', function (p) {
  faceBase(p, '#2b1a12', 0.06);
  p.rect(2, 5, 2, 2, '#b02020'); p.rect(5, 4, 2, 2, '#b02020');
  p.rect(9, 4, 2, 2, '#b02020'); p.rect(12, 5, 2, 2, '#b02020');
  p.rect(6, 8, 4, 2, '#1a0f0a');
  return p;
});
CT('face_cave_spider', function (p) {
  CUSTOM_TEX.face_spider(p);
  for (var i = 0; i < p.d.length; i += 4) { p.d[i] = p.d[i] * 0.5; p.d[i + 2] = clamp(p.d[i + 2] * 1.8, 0, 255); }
  return p;
});
CT('golem_body', function (p) {
  /* Hammered iron plate: seams, rivets and the vine that always creeps up a
     golem's chest. Painted rather than modelled, so the torso is not a slab. */
  p.fill('#d9d4c6').noise(0.055);
  p.rect(0, 4, 16, 1, '#bcb5a4'); p.rect(0, 11, 16, 1, '#bcb5a4');
  p.rect(7, 0, 1, 16, '#c9c2b1');
  p.rect(1, 1, 1, 1, '#a79e8c'); p.rect(14, 1, 1, 1, '#a79e8c');
  p.rect(1, 14, 1, 1, '#a79e8c'); p.rect(14, 14, 1, 1, '#a79e8c');
  p.rect(3, 6, 2, 1, '#cdc6b5'); p.rect(11, 8, 2, 1, '#cdc6b5');
  return p;
});
CT('face_villager', function (p) {
  faceBase(p, '#c39774');
  p.rect(3, 6, 3, 2, '#f0f0f0'); p.rect(10, 6, 3, 2, '#f0f0f0');
  p.rect(4, 6, 2, 2, '#4a3a2a'); p.rect(10, 6, 2, 2, '#4a3a2a');
  p.rect(6, 7, 4, 5, '#a87e5c');       /* the nose */
  p.rect(0, 0, 16, 4, '#5c4a3a');
  p.rect(3, 4, 10, 1, '#5c4a3a');
  return p;
});
CT('face_piglin', function (p) {
  faceBase(p, '#e0a091');
  p.rect(3, 5, 2, 2, '#2a1a14'); p.rect(11, 5, 2, 2, '#2a1a14');
  p.rect(5, 8, 6, 5, '#c98a7c');
  p.rect(6, 10, 1, 2, '#7a4f45'); p.rect(9, 10, 1, 2, '#7a4f45');
  return p;
});
CT('face_hoglin', function (p) {
  faceBase(p, '#9c6a4a');
  p.rect(3, 5, 2, 2, '#241610'); p.rect(11, 5, 2, 2, '#241610');
  p.rect(5, 9, 6, 4, '#7f523a');
  p.rect(3, 9, 2, 3, '#e8e0c8'); p.rect(11, 9, 2, 3, '#e8e0c8');
  return p;
});
CT('face_cow', function (p) {
  faceBase(p, '#4a3225');
  p.rect(2, 4, 3, 3, '#1a1008'); p.rect(11, 4, 3, 3, '#1a1008');
  p.rect(5, 9, 6, 5, '#e0d0c0');
  p.rect(6, 11, 1, 1, '#8a7a6a'); p.rect(9, 11, 1, 1, '#8a7a6a');
  p.rect(0, 2, 16, 3, '#f0ece0');
  return p;
});
CT('face_pig', function (p) {
  faceBase(p, '#e39699');
  p.rect(3, 5, 2, 2, '#1a1008'); p.rect(11, 5, 2, 2, '#1a1008');
  p.rect(5, 9, 6, 5, '#c87f82');
  p.rect(6, 11, 1, 2, '#8f5a5c'); p.rect(9, 11, 1, 2, '#8f5a5c');
  return p;
});
CT('face_sheep', function (p) {
  faceBase(p, '#d8c8b8');
  p.rect(3, 6, 2, 2, '#241a12'); p.rect(11, 6, 2, 2, '#241a12');
  p.rect(6, 10, 4, 3, '#c0b0a0');
  return p;
});
CT('wool_fluff', function (p) {
  p.fill('#e9ecec').noise(0.05);
  for (var k = 0; k < 34; k++) {
    var x = (p.rng() * 16) | 0, y = (p.rng() * 16) | 0;
    p.disc(x, y, 1.6, p.rng() < 0.5 ? '#f4f6f6' : '#d3d6d6');
  }
  return p;
});
CT('face_chicken', function (p) {
  faceBase(p, '#e8e8e8');
  p.rect(3, 5, 2, 2, '#1a1008'); p.rect(11, 5, 2, 2, '#1a1008');
  p.rect(6, 8, 4, 3, '#e0a020');
  p.rect(5, 0, 6, 3, '#c83a2a');
  return p;
});
CT('face_wolf', function (p) {
  faceBase(p, '#cfcac4');
  p.rect(3, 5, 2, 2, '#c02020'); p.rect(11, 5, 2, 2, '#c02020');
  p.rect(6, 8, 4, 5, '#e8e4e0');
  p.rect(7, 11, 2, 2, '#2a2220');
  return p;
});
CT('face_fox', function (p) {
  faceBase(p, '#d9863f');
  p.rect(3, 5, 2, 2, '#241610'); p.rect(11, 5, 2, 2, '#241610');
  p.rect(5, 8, 6, 6, '#efe0d0');
  p.rect(7, 12, 2, 2, '#2a1a14');
  return p;
});
CT('face_cat', function (p) {
  faceBase(p, '#8a6a4a');
  p.rect(3, 5, 3, 2, '#c8e04a'); p.rect(10, 5, 3, 2, '#c8e04a');
  p.rect(4, 5, 1, 2, '#1a1008'); p.rect(11, 5, 1, 2, '#1a1008');
  p.rect(6, 9, 4, 3, '#e0d0c0'); p.rect(7, 10, 2, 1, '#c07a7a');
  return p;
});
CT('face_panda', function (p) {
  faceBase(p, '#e8e4dc');
  p.rect(2, 4, 4, 4, '#1a1a1a'); p.rect(10, 4, 4, 4, '#1a1a1a');
  p.rect(3, 5, 2, 2, '#e8e4dc'); p.rect(11, 5, 2, 2, '#e8e4dc');
  p.rect(6, 9, 4, 3, '#1a1a1a');
  return p;
});
CT('face_polar_bear', function (p) {
  faceBase(p, '#f0eee8');
  p.rect(3, 5, 2, 2, '#241a14'); p.rect(11, 5, 2, 2, '#241a14');
  p.rect(6, 9, 4, 4, '#d8d4cc'); p.rect(7, 11, 2, 2, '#241a14');
  return p;
});
CT('face_bee', function (p) {
  faceBase(p, '#e8b83a');
  p.rect(3, 5, 3, 3, '#241a10'); p.rect(10, 5, 3, 3, '#241a10');
  p.rect(6, 10, 4, 2, '#241a10');
  return p;
});
CT('bee_body', function (p) {
  p.fill('#e8b83a').noise(0.04);
  p.rect(0, 3, 16, 3, '#3a2a14'); p.rect(0, 9, 16, 3, '#3a2a14');
  return p;
});
CT('face_blaze', function (p) {
  p.fill('#f0a020').noise(0.06);
  p.rect(3, 5, 3, 3, '#f8e8a0'); p.rect(10, 5, 3, 3, '#f8e8a0');
  p.speckle('#ffe070', 20, 1, 0.6);
  return p;
});
CT('face_ghast', function (p) {
  faceBase(p, '#e8e8e8', 0.03);
  p.rect(2, 5, 4, 3, '#101010'); p.rect(10, 5, 4, 3, '#101010');
  p.rect(4, 10, 8, 3, '#101010');
  return p;
});
CT('face_guardian', function (p) {
  p.fill('#5f9c92').noise(0.05);
  p.disc(8, 8, 4.4, '#d8d0c0'); p.disc(8, 8, 2.4, '#e0703a'); p.disc(8, 8, 1.2, '#201810');
  p.speckle('#78bdaa', 16, 1, 0.5);
  return p;
});
CT('face_witch', function (p) {
  faceBase(p, '#3f6d68');
  p.rect(3, 6, 3, 2, '#f0f0f0'); p.rect(10, 6, 3, 2, '#f0f0f0');
  p.rect(4, 6, 2, 2, '#2a1a10'); p.rect(10, 6, 2, 2, '#2a1a10');
  p.rect(6, 7, 4, 6, '#2f5a56');
  p.rect(7, 12, 2, 1, '#7a3a3a');
  return p;
});
CT('face_illager', function (p) {
  faceBase(p, '#9a9a9a');
  p.rect(3, 6, 3, 2, '#f0f0f0'); p.rect(10, 6, 3, 2, '#f0f0f0');
  p.rect(4, 6, 2, 2, '#2a2a2a'); p.rect(10, 6, 2, 2, '#2a2a2a');
  p.rect(6, 7, 4, 6, '#8a8a8a');
  p.rect(2, 5, 12, 1, '#5f5f5f');
  return p;
});
CT('face_warden', function (p) {
  p.fill('#0f2b30').noise(0.05);
  p.rect(4, 5, 3, 2, '#2ac0cc'); p.rect(9, 5, 3, 2, '#2ac0cc');
  p.rect(5, 10, 6, 2, '#0a1c20');
  p.speckle('#1a6a72', 14, 1, 0.5);
  return p;
});
CT('warden_chest', function (p) {
  p.fill('#123a40').noise(0.05);
  p.disc(8, 6, 3, '#2ac0cc'); p.disc(8, 6, 1.6, '#8ff0f8');
  for (var i = 0; i < 4; i++) p.rect(2, 10 + i, 12, 1, i % 2 ? '#0c2a30' : '#164a52');
  return p;
});
CT('face_shulker', function (p) {
  p.fill('#986a98').noise(0.05);
  p.rect(4, 6, 3, 3, '#f0e8c0'); p.rect(9, 6, 3, 3, '#f0e8c0');
  p.rect(5, 7, 1, 1, '#2a1a2a'); p.rect(10, 7, 1, 1, '#2a1a2a');
  return p;
});
CT('face_dragon', function (p) {
  p.fill('#191019').noise(0.05);
  p.rect(2, 5, 4, 2, '#c83ad8'); p.rect(10, 5, 4, 2, '#c83ad8');
  p.rect(4, 10, 8, 2, '#0d080d');
  return p;
});
CT('face_wither', function (p) {
  p.fill('#3a3a3a').noise(0.06);
  p.rect(3, 5, 3, 3, '#101010'); p.rect(10, 5, 3, 3, '#101010');
  p.rect(5, 11, 6, 1, '#141414');
  return p;
});
CT('face_axolotl', function (p) {
  faceBase(p, '#f5b8d0');
  p.rect(3, 6, 2, 2, '#2a1a20'); p.rect(11, 6, 2, 2, '#2a1a20');
  p.rect(6, 10, 4, 1, '#d890a8');
  return p;
});
CT('face_frog', function (p) {
  faceBase(p, '#88a24a');
  p.rect(2, 2, 4, 4, '#f0e070'); p.rect(10, 2, 4, 4, '#f0e070');
  p.rect(3, 3, 2, 2, '#201810'); p.rect(11, 3, 2, 2, '#201810');
  p.rect(4, 11, 8, 1, '#5f7030');
  return p;
});
CT('face_goat', function (p) {
  faceBase(p, '#d8d0c4');
  p.rect(3, 6, 2, 2, '#241a12'); p.rect(11, 6, 2, 2, '#241a12');
  p.rect(6, 10, 4, 3, '#b8b0a4');
  return p;
});
CT('face_llama', function (p) {
  faceBase(p, '#c8b898');
  p.rect(3, 6, 2, 2, '#241a12'); p.rect(11, 6, 2, 2, '#241a12');
  p.rect(6, 9, 4, 5, '#e0d8c0');
  return p;
});
CT('face_horse', function (p) {
  faceBase(p, '#a0714a');
  p.rect(3, 5, 2, 2, '#241a12'); p.rect(11, 5, 2, 2, '#241a12');
  p.rect(5, 9, 6, 6, '#8a5f3c');
  p.rect(6, 12, 1, 2, '#4a3220'); p.rect(9, 12, 1, 2, '#4a3220');
  return p;
});
CT('face_rabbit', function (p) {
  faceBase(p, '#a08060');
  p.rect(3, 6, 2, 2, '#3a1a1a'); p.rect(11, 6, 2, 2, '#3a1a1a');
  p.rect(6, 10, 4, 2, '#c0a080');
  return p;
});
CT('face_turtle', function (p) {
  faceBase(p, '#68a25a');
  p.rect(3, 6, 2, 2, '#1a2a10'); p.rect(11, 6, 2, 2, '#1a2a10');
  p.rect(6, 10, 4, 2, '#548a48');
  return p;
});
CT('turtle_shell', function (p) {
  p.fill('#5a8f4a').noise(0.05);
  for (var y = 0; y < 16; y += 5) for (var x = ((y / 5) % 2) * 3; x < 16; x += 6) {
    p.disc(x + 2, y + 2, 2.4, '#3f6f34'); p.disc(x + 2, y + 2, 1.4, '#6ba05a');
  }
  return p;
});
CT('face_squid', function (p) { p.fill('#2a3a72').noise(0.05); p.rect(4, 6, 2, 2, '#101018'); p.rect(10, 6, 2, 2, '#101018'); return p; });
CT('face_glow_squid', function (p) { p.fill('#1a4a52').noise(0.05); p.rect(4, 6, 2, 2, '#8ff0ff'); p.rect(10, 6, 2, 2, '#8ff0ff'); p.speckle('#4fd8e8', 18, 1, 0.6); return p; });
CT('fish_body', function (p) {
  p.fill('#8f6a3a').noise(0.05);
  p.rect(0, 6, 16, 4, '#c8a45a');
  p.rect(2, 5, 2, 2, '#101010');
  return p;
});
CT('tropical_body', function (p) {
  p.fill('#e8a020').noise(0.04);
  for (var x = 0; x < 16; x += 5) p.rect(x, 0, 2, 16, '#e0e0e0');
  p.rect(2, 5, 2, 2, '#101010');
  return p;
});
CT('face_villager_zombie', function (p) {
  CUSTOM_TEX.face_villager(p);
  for (var i = 0; i < p.d.length; i += 4) {
    var g = p.d[i + 1];
    p.d[i] = p.d[i] * 0.45; p.d[i + 1] = clamp(g * 0.95 + 20, 0, 255); p.d[i + 2] = p.d[i + 2] * 0.4;
  }
  return p;
});
CT('golem_face', function (p) {
  p.fill('#c8c0b0').noise(0.05);
  p.rect(3, 6, 3, 2, '#3a3a3a'); p.rect(10, 6, 3, 2, '#3a3a3a');
  p.rect(6, 8, 4, 6, '#a89c88');
  p.speckle('#7a9a5a', 8, 1, 0.4);
  return p;
});
CT('snow_golem_face', function (p) {
  p.fill('#f0f6f8').noise(0.03);
  p.rect(4, 6, 2, 2, '#2a2a2a'); p.rect(10, 6, 2, 2, '#2a2a2a');
  p.rect(6, 10, 1, 1, '#2a2a2a'); p.rect(9, 10, 1, 1, '#2a2a2a');
  return p;
});
CT('face_phantom', function (p) { p.fill('#3f4a6a').noise(0.05); p.rect(3, 5, 3, 2, '#8ff0a0'); p.rect(10, 5, 3, 2, '#8ff0a0'); return p; });
CT('face_vex', function (p) { p.fill('#8ea3b8').noise(0.04); p.rect(3, 6, 3, 2, '#c83a3a'); p.rect(10, 6, 3, 2, '#c83a3a'); return p; });
CT('face_allay', function (p) { p.fill('#4fa8e0').noise(0.04); p.rect(3, 6, 3, 2, '#e0f4ff'); p.rect(10, 6, 3, 2, '#e0f4ff'); return p; });
CT('face_strider', function (p) { p.fill('#9c3a3a').noise(0.06); p.rect(3, 5, 3, 2, '#f0e0a0'); p.rect(10, 5, 3, 2, '#f0e0a0'); return p; });
CT('face_camel', function (p) { faceBase(p, '#d8b070'); p.rect(3, 6, 2, 2, '#241a12'); p.rect(11, 6, 2, 2, '#241a12'); p.rect(6, 10, 4, 3, '#c09a5a'); return p; });
CT('face_sniffer', function (p) { faceBase(p, '#8a5a8a'); p.rect(3, 5, 2, 2, '#241020'); p.rect(11, 5, 2, 2, '#241020'); p.rect(4, 10, 8, 4, '#6f4570'); return p; });
CT('face_armadillo', function (p) { faceBase(p, '#8a6a52'); p.rect(3, 6, 2, 2, '#201810'); p.rect(11, 6, 2, 2, '#201810'); p.rect(6, 10, 4, 3, '#6f5240'); return p; });
CT('face_creaking', function (p) { p.fill('#4a4a44').noise(0.06); p.rect(3, 5, 3, 3, '#e86a2a'); p.rect(10, 5, 3, 3, '#e86a2a'); return p; });
CT('face_breeze', function (p) { p.fill('#4a8fd8').noise(0.06); p.rect(3, 5, 3, 2, '#e0f0ff'); p.rect(10, 5, 3, 2, '#e0f0ff'); return p; });
CT('face_silverfish', function (p) { p.fill('#6a6a6a').noise(0.06); p.rect(3, 6, 2, 2, '#1a1a1a'); p.rect(11, 6, 2, 2, '#1a1a1a'); return p; });
CT('face_slime', function (p) {
  p.fill('#6ec06a', 190).noise(0.04);
  p.rect(4, 6, 2, 2, '#204a20'); p.rect(10, 6, 2, 2, '#204a20');
  p.rect(6, 10, 4, 1, '#204a20');
  return p;
});
CT('face_magma_cube', function (p) {
  p.fill('#8e3a10').noise(0.06);
  p.rect(4, 6, 2, 2, '#f0c040'); p.rect(10, 6, 2, 2, '#f0c040');
  p.speckle('#f08020', 18, 1, 0.6);
  return p;
});
CT('face_ravager', function (p) {
  faceBase(p, '#6a5a4a');
  p.rect(3, 5, 2, 2, '#c03a1a'); p.rect(11, 5, 2, 2, '#c03a1a');
  p.rect(4, 9, 8, 5, '#4a3f34');
  p.rect(5, 12, 1, 2, '#e8e0c8'); p.rect(10, 12, 1, 2, '#e8e0c8');
  return p;
});
CT('face_parrot', function (p) { faceBase(p, '#c02a2a'); p.rect(3, 5, 2, 2, '#101010'); p.rect(11, 5, 2, 2, '#101010'); p.rect(6, 8, 4, 3, '#e0a020'); return p; });
CT('face_bat', function (p) { p.fill('#4a3a30').noise(0.05); p.rect(4, 6, 2, 2, '#c03030'); p.rect(10, 6, 2, 2, '#c03030'); return p; });
CT('face_dolphin', function (p) { p.fill('#8fa8c0').noise(0.04); p.rect(3, 6, 2, 2, '#101820'); p.rect(11, 6, 2, 2, '#101820'); p.rect(5, 10, 6, 1, '#6a8296'); return p; });
CT('face_endermite', function (p) { p.fill('#2a1f38').noise(0.06); p.rect(4, 6, 2, 2, '#c8a0f0'); p.rect(10, 6, 2, 2, '#c8a0f0'); return p; });
