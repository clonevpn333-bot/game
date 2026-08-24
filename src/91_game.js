/* =========================================================================
 * GAME — the main loop: input, chunk streaming, ticking, dimensions,
 * weather, day/night, saving, and boot.
 * ========================================================================= */

var Game = null;

function createGame(canvas, seed) {
  var g = {
    canvas: canvas,
    seed: seed >>> 0,
    world: new World(seed >>> 0),
    player: null,
    entities: [],
    particles: [],
    activeBE: [],
    loadedKeys: [],
    time: 0,               /* wall-clock seconds since boot */
    dayTime: 6000,         /* 0..24000, 6000 = noon */
    dayLength: 1200,       /* seconds for a full cycle */
    timeOfDay: 0.5, dayCount: 0,
    isDay: true,
    moonPhase: 0,
    tickCount: 0,
    spawnTimer: 2,
    rtAccum: 0,
    fluidAccum: 0,
    fluidQueue: [],
    fluidSet: {},
    weather: { rain: 0, targetRain: 0, thunder: 0, nextChange: 300 },
    shake: 0, damageFlash: 0, totemFlash: 0,
    exposure: 1.0, screenTint: new Float32Array([1, 1, 1]), screenTintAmt: 0,
    cameraMode: 0,
    input: {},
    keys: {},
    ui: UI,
    paused: false,
    showDebug: false,
    fps: 0, frameTimes: [],
    hit: null, hitEntity: null,
    boss: null,
    ready: false,
    deathCause: ''
  };
  g.player = makePlayer(g);
  UI.dirty = true;
  return g;
}

/* ------------------------------------------------------------- input -- */
var KEYMAP = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  Space: 'jump', ShiftLeft: 'sneak', ShiftRight: 'sneak', ControlLeft: 'sprint'
};
function setupInput(game) {
  var canvas = game.canvas;
  var p = game.player;

  canvas.addEventListener('click', function () {
    if (!UI.screen) game.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', function () {
    game.locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', function (ev) {
    if (!game.locked) return;
    var s = 0.0022 * (game.zooming ? 0.25 : 1);
    p.yaw += ev.movementX * s;
    p.pitch -= ev.movementY * s;
    p.pitch = clamp(p.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
    p.yaw = mod(p.yaw + Math.PI, Math.PI * 2) - Math.PI;
  });
  document.addEventListener('mousedown', function (ev) {
    if (UI.screen) return;
    if (!game.locked) return;
    initAudio();
    if (ev.button === 0) { game.input.attack = true; game.attackEdge = true; }
    if (ev.button === 2) { game.input.use = true; game.useEdge = true; }
    if (ev.button === 1) { pickBlock(game); ev.preventDefault(); }
  });
  document.addEventListener('mouseup', function (ev) {
    if (ev.button === 0) { game.input.attack = false; p.breaking = null; p.breakProgress = 0; }
    if (ev.button === 2) {
      game.input.use = false;
      if (p.charging) releaseBow(game);
      if (p.eating) { p.eating = null; }
    }
  });
  document.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  document.addEventListener('wheel', function (ev) {
    if (UI.screen) return;
    var d = ev.deltaY > 0 ? 1 : -1;
    p.sel = (p.sel + d + 9) % 9;
    showHeldName(game);
    UI.dirty = true;
  }, { passive: true });

  document.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
    game.keys[ev.code] = true;
    initAudio();
    var k = KEYMAP[ev.code];
    if (k) { game.input[k] = true; ev.preventDefault(); }
    if (ev.code === 'Space') ev.preventDefault();
    if (ev.code.indexOf('Digit') === 0) {
      var n = parseInt(ev.code.substr(5), 10);
      if (n >= 1 && n <= 9) { p.sel = n - 1; showHeldName(game); UI.dirty = true; }
    }
    switch (ev.code) {
      case 'KeyE':
        if (UI.screen) hideScreen(game);
        else showScreen(game, p.creative ? 'creative' : 'inventory');
        break;
      case 'Escape':
        if (UI.screen === 'death') break;
        if (UI.screen) hideScreen(game);
        else showScreen(game, 'pause');
        break;
      case 'KeyQ': if (!UI.screen) dropHeld(game, ev.ctrlKey); break;
      case 'F3': game.showDebug = !game.showDebug; ev.preventDefault(); break;
      case 'F5': game.cameraMode = (game.cameraMode + 1) % 3; break;
      case 'F1': R.settings.hideHud = !R.settings.hideHud; UI.els.hud.classList.toggle('hidden'); break;
      case 'KeyF':
        if (!UI.screen) { var t = p.offhand; p.offhand = p.inv[p.sel]; p.inv[p.sel] = t; UI.dirty = true; }
        break;
      case 'KeyC': if (!UI.screen) game.zooming = true; break;
      case 'KeyT': break;
    }
    /* double-tap space to fly in creative */
    if (ev.code === 'Space' && p.creative) {
      var now = performance.now();
      if (now - (game.lastSpace || 0) < 320) { p.flying = !p.flying; p.vy = 0; }
      game.lastSpace = now;
    }
  });
  document.addEventListener('keyup', function (ev) {
    game.keys[ev.code] = false;
    var k = KEYMAP[ev.code];
    if (k) game.input[k] = false;
    if (ev.code === 'KeyC') game.zooming = false;
  });
  window.addEventListener('blur', function () {
    game.input = {}; game.keys = {};
  });
  window.addEventListener('resize', function () { resizeRenderer(); });
}
function showHeldName(game) {
  var s = heldStack(game.player);
  var e = UI.els.itemName;
  if (!s) { e.classList.remove('show'); return; }
  e.textContent = (s.name || (ITEMS[s.item] ? ITEMS[s.item].disp : s.item));
  e.classList.remove('show');
  void e.offsetWidth;
  e.classList.add('show');
}
function pickBlock(game) {
  var p = game.player;
  if (!game.hit) return;
  var b = BLOCKS[game.hit.id];
  var name = b.name;
  if (!ITEMS[name]) return;
  for (var i = 0; i < 9; i++) if (p.inv[i] && p.inv[i].item === name) { p.sel = i; UI.dirty = true; return; }
  if (p.creative) {
    for (var j = 0; j < 9; j++) if (!p.inv[j]) { p.sel = j; p.inv[j] = makeStack(name, 1); UI.dirty = true; return; }
    p.inv[p.sel] = makeStack(name, 1);
    UI.dirty = true;
  }
}
function releaseBow(game) {
  var p = game.player;
  var t = Math.min(1, (p.chargeTime || 0));
  p.charging = false; p.chargeTime = 0;
  if (t < 0.15) return;
  var held = heldItem(p);
  if (!p.creative && countItem(game, 'arrow') === 0 && !enchLevel(heldStack(p), 'infinity')) return;
  if (!p.creative && !enchLevel(heldStack(p), 'infinity')) consumeItem(game, 'arrow', 1);
  var fx = Math.cos(p.pitch) * Math.sin(p.yaw), fy = Math.sin(p.pitch), fz = -Math.cos(p.pitch) * Math.cos(p.yaw);
  var speed = 20 + t * 40;
  var e = makeEntity('arrow', p.dim, p.x + fx * 0.4, p.camY - 0.1, p.z + fz * 0.4, {
    vx: fx * speed, vy: fy * speed, vz: fz * speed, owner: p, kind: 'arrow', life: 0
  });
  var pw = enchLevel(heldStack(p), 'power');
  if (pw) e.powerBonus = pw;
  game.entities.push(e);
  damageHeld(game, 1);
  playSound(game, 'shoot', p.x, p.y, p.z, 0.9 + t * 0.3);
  startSwing(0);
}

/* --------------------------------------------------------- interaction */
function handleActions(game, dt) {
  var p = game.player;
  if (UI.screen || !game.locked || p.dead) { p.breaking = null; return; }
  var eye = [p.x, p.camY, p.z];
  var fx = Math.cos(p.pitch) * Math.sin(p.yaw), fy = Math.sin(p.pitch), fz = -Math.cos(p.pitch) * Math.cos(p.yaw);
  var reach = p.creative ? 5.5 : 4.5;
  game.hit = raycastBlocks(game.world, p.dim, eye[0], eye[1], eye[2], fx, fy, fz, reach, false);
  var eh = raycastEntities(game, eye[0], eye[1], eye[2], fx, fy, fz, reach);
  if (eh && (!game.hit || eh.t < game.hit.t)) { game.hitEntity = eh.entity; }
  else game.hitEntity = null;

  if (game.input.attack) {
    if (game.hitEntity) {
      if (game.attackEdge) {
        playerAttack(game, game.hitEntity);
        startSwing(0);
        playSound(game, 'thud', p.x, p.y, p.z, 1.3);
      }
      p.breaking = null;
    } else if (game.hit) {
      updateBreaking(game, dt, game.hit);
      if (game.attackEdge || (VM.swing > 0.6 && VM.swingActive) || !VM.swingActive) {
        if (!VM.swingActive) startSwing(0);
      }
    } else {
      p.breaking = null;
      if (game.attackEdge) startSwing(0);
    }
  } else {
    p.breaking = null; p.breakProgress = 0;
  }

  if (game.useEdge) {
    var s = heldStack(p);
    var it = s ? ITEMS[s.item] : null;
    if (game.hitEntity) {
      if (interactEntity(game, game.hitEntity)) { game.useEdge = false; startSwing(1); }
    }
    if (game.useEdge) {
      if (it && (it.food || it.use === 'drink')) {
        if (startEating(game)) { game.useEdge = false; }
      }
    }
    if (game.useEdge) {
      if (placeBlock(game, game.hit)) startSwing(1);
      else if (it && it.use === 'bow') { p.charging = true; p.chargeTime = 0; }
      else if (!game.hit) startSwing(1);
    }
  }
  game.attackEdge = false;
  game.useEdge = false;
}
function interactEntity(game, e) {
  var p = game.player;
  var def = MOBS[e.type];
  var held = heldItem(p);
  if (e.type === 'villager' || e.type === 'wandering_trader') {
    ensureTrades(game, e);
    UI.trader = e; UI.tradeSel = 0;
    showScreen(game, 'trade');
    return true;
  }
  if (def.tameWith && held === def.tameWith) {
    consumeItem(game, held, 1);
    e.tamed = true; e.persist = true;
    for (var i = 0; i < 14; i++) spawnParticle(game, e.dim, e.x + (Math.random() - 0.5), e.y + e.h, e.z + (Math.random() - 0.5), 0, 1.2, 0, 0.9, 0.3, 0.4, 0.08, 0.9);
    playSound(game, 'pop', e.x, e.y, e.z);
    return true;
  }
  if (def.breedWith && def.breedWith.indexOf(held) >= 0) {
    consumeItem(game, held, 1);
    e.loveTime = 12;
    for (var j = 0; j < 10; j++) spawnParticle(game, e.dim, e.x + (Math.random() - 0.5), e.y + e.h * 0.8, e.z + (Math.random() - 0.5), 0, 1.0, 0, 0.9, 0.3, 0.4, 0.09, 1.0);
    return true;
  }
  if (e.type === 'sheep' && held && ITEMS[held] && ITEMS[held].tool === 'shears' && !e.sheared) {
    e.sheared = true;
    damageHeld(game, 1);
    dropItem(game, e.dim, e.x, e.y + e.h * 0.6, e.z, (e.woolColor || 'white') + '_wool', 1 + (Math.random() * 3 | 0), true);
    playSound(game, 'break', e.x, e.y, e.z, 1.5, 0.4);
    return true;
  }
  if (e.type === 'cow' && held === 'bucket') {
    consumeItem(game, 'bucket', 1); giveItem(game, 'milk_bucket', 1);
    return true;
  }
  if (def.sittable && e.tamed) { e.sitting = !e.sitting; return true; }
  return false;
}
function ensureTrades(game, e) {
  if (e.trades) return;
  var prof = VILLAGER_PROFESSIONS[Math.floor(Math.random() * (VILLAGER_PROFESSIONS.length - 1))];
  e.profession = prof.id;
  e.professionDisp = prof.disp;
  e.trades = prof.trades.map(function (t) {
    return { give: t.give, get: t.get, uses: 0, maxUses: 6 + Math.floor(Math.random() * 10) };
  });
}

/* --------------------------------------------------------- chunk pump -- */
function pumpChunks(game, budgetMs) {
  var world = game.world, p = game.player;
  var dim = p.dim;
  var rd = R.settings.renderDistance;
  var pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
  var t0 = performance.now();

  /* request the nearest missing chunks first */
  if (!game._spiral || game._spiralR !== rd) {
    game._spiral = [];
    for (var dx = -rd - 1; dx <= rd + 1; dx++) for (var dz = -rd - 1; dz <= rd + 1; dz++) {
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d > rd + 1) continue;
      game._spiral.push([dx, dz, d]);
    }
    game._spiral.sort(function (a, b) { return a[2] - b[2]; });
    game._spiralR = rd;
  }
  var sp = game._spiral;
  var asked = 0;
  for (var i = 0; i < sp.length && asked < 12; i++) {
    var cx = pcx + sp[i][0], cz = pcz + sp[i][1];
    var key = cx + ',' + cz;
    if (world.dims[dim][key] || world.pending[dim][key]) continue;
    if (world.request(dim, cx, cz) === false) break;
    asked++;
  }

  /* light newly generated chunks whose neighbours are present */
  for (var j = 0; j < sp.length; j++) {
    if (performance.now() - t0 > budgetMs) break;
    var cx2 = pcx + sp[j][0], cz2 = pcz + sp[j][1];
    var c = world.chunkAt(dim, cx2, cz2);
    if (!c || !c.loaded || c.lit) continue;
    world.initChunkLight(c);
    break;
  }

  world.propagate(dim, 20000);

  /* mesh: nearest unmeshed chunk with all four neighbours loaded */
  var meshed = 0;
  for (var k = 0; k < sp.length && meshed < 3; k++) {
    if (performance.now() - t0 > budgetMs) break;
    var cx3 = pcx + sp[k][0], cz3 = pcz + sp[k][1];
    if (sp[k][2] > rd) continue;
    var c3 = world.chunkAt(dim, cx3, cz3);
    if (!c3 || !c3.lit || c3.meshed) continue;
    if (!world.chunkAt(dim, cx3 + 1, cz3) || !world.chunkAt(dim, cx3 - 1, cz3) ||
      !world.chunkAt(dim, cx3, cz3 + 1) || !world.chunkAt(dim, cx3, cz3 - 1)) continue;
    meshChunk(game, c3);
    meshed++;
  }

  /* re-mesh dirty sections */
  var q = world.meshQueue;
  var remeshed = 0;
  while (q.length && remeshed < 12 && performance.now() - t0 < budgetMs + 4) {
    var job = q.shift();
    var c4 = world.chunkAt(job[0], job[1], job[2]);
    if (!c4 || !c4.meshed) continue;
    c4.dirty[job[3]] = 0;
    var mb = meshSection(world, c4, job[3]);
    uploadSectionMesh(c4, job[3], mb);
    buildTintTexture(world, c4);
    remeshed++;
  }

  /* drop chunks that fell out of range */
  game.unloadTimer = (game.unloadTimer || 0) - 1;
  if (game.unloadTimer <= 0) {
    game.unloadTimer = 40;
    var keys = Object.keys(world.dims[dim]);
    game.loadedKeys = keys;
    var lim = (rd + 3) * (rd + 3);
    for (var m = 0; m < keys.length; m++) {
      var c5 = world.dims[dim][keys[m]];
      var ddx = c5.cx - pcx, ddz = c5.cz - pcz;
      if (ddx * ddx + ddz * ddz <= lim) continue;
      for (var s2 = 0; s2 < N_SECT; s2++) if (c5.mesh[s2]) disposeMesh(c5.mesh[s2]);
      if (c5.tintTex) { gl.deleteTexture(c5.tintTex); c5.tintTex = null; }
      for (var bk in c5.blockEntities) {
        var idx = game.activeBE.indexOf(c5.blockEntities[bk]);
        if (idx >= 0) game.activeBE.splice(idx, 1);
      }
      delete world.dims[dim][keys[m]];
    }
  }
  world.stats.chunks = Object.keys(world.dims[dim]).length;
}
function meshChunk(game, c) {
  c.meshed = true;
  for (var sy = 0; sy < N_SECT; sy++) {
    var mb = meshSection(game.world, c, sy);
    uploadSectionMesh(c, sy, mb);
    c.dirty[sy] = 0;
  }
  buildTintTexture(game.world, c);
  game.world.stats.meshed++;
  /* register block entities the generator left behind */
  for (var k in c.blockEntities) {
    var be = c.blockEntities[k];
    be.dim = c.dim;
    if (game.activeBE.indexOf(be) < 0) game.activeBE.push(be);
  }
}
function remeshAll(game) {
  var world = game.world;
  for (var d = 0; d < 3; d++) {
    for (var k in world.dims[d]) {
      var c = world.dims[d][k];
      if (!c.meshed) continue;
      for (var s = 0; s < N_SECT; s++) if (!c.dirty[s]) { c.dirty[s] = 1; world.meshQueue.push([d, c.cx, c.cz, s, 0]); }
    }
  }
}

/* ---------------------------------------------------------- day cycle -- */
function updateWorldTime(game, dt) {
  var before = game.dayTime;
  game.dayTime = (game.dayTime + dt * 24000 / game.dayLength) % 24000;
  if (game.dayTime < before) game.dayCount++;
  /* dayTime follows Minecraft (0 = sunrise); the sky table is keyed on
     0 = midnight, so shift by a quarter turn. */
  game.timeOfDay = mod(game.dayTime / 24000 + 0.25, 1);
  game.isDay = game.dayTime > 1000 && game.dayTime < 13000;
  game.moonPhase = game.dayCount % 8;

  var w = game.weather;
  w.nextChange -= dt;
  if (w.nextChange <= 0) {
    if (w.targetRain > 0) { w.targetRain = 0; w.nextChange = 300 + Math.random() * 900; }
    else { w.targetRain = 0.5 + Math.random() * 0.5; w.nextChange = 120 + Math.random() * 480; }
    if (w.targetRain > 0.85) w.thunderStorm = true; else w.thunderStorm = false;
  }
  w.rain = approach(w.rain, game.player.dim === DIM_OVERWORLD ? w.targetRain : 0, dt * 0.12);
  if (w.thunderStorm && w.rain > 0.6) {
    w.thunder -= dt;
    if (w.thunder <= 0) {
      w.thunder = 6 + Math.random() * 40;
      game.lightningFlash = 1;
      playSound(game, 'thunder', game.player.x, game.player.y, game.player.z, 0.8 + Math.random() * 0.4);
    }
  }
  game.lightningFlash = Math.max(0, (game.lightningFlash || 0) - dt * 3.5);
}

/* -------------------------------------------------------- dimensions --- */
function travelDimension(game, to) {
  var p = game.player;
  var from = p.dim;
  var scale = 1;
  if (from === DIM_OVERWORLD && to === DIM_NETHER) scale = 1 / 8;
  if (from === DIM_NETHER && to === DIM_OVERWORLD) scale = 8;
  var nx = Math.floor(p.x * scale), nz = Math.floor(p.z * scale);
  if (to === DIM_END) { nx = 0; nz = 0; }
  p.dim = to;
  p.x = nx + 0.5; p.z = nz + 0.5;
  p.vx = p.vy = p.vz = 0;
  game.dimSwitchPending = { x: nx, z: nz, to: to, from: from };
  logMessage(game, 'Travelling to ' + ['the Overworld', 'the Nether', 'the End'][to] + '…', '#c8a0ff');
  playSound(game, 'portal', p.x, p.y, p.z);
  game.portalFade = 1;
  UI.dirty = true;
}
function finishDimSwitch(game) {
  var d = game.dimSwitchPending;
  if (!d) return;
  var p = game.player, world = game.world;
  var c = world.chunkAt(p.dim, d.x >> 4, d.z >> 4);
  if (!c || !c.loaded) return;
  /* find a safe landing spot and build a return portal */
  var y = safeYAt(game, p.dim, d.x, d.z);
  p.x = d.x + 0.5; p.y = y; p.z = d.z + 0.5;
  if (d.to !== DIM_END) buildPortalFrame(game, p.dim, d.x, y, d.z);
  else buildEndPlatform(game, d.x, d.z);
  game.dimSwitchPending = null;
  p.portalCool = 6;
}
function safeYAt(game, dim, x, z) {
  var world = game.world;
  if (dim === DIM_NETHER) {
    for (var y = 100; y > 8; y--) {
      if (world.getId(dim, x, y, z) === 0 && world.getId(dim, x, y + 1, z) === 0 && isSolidAt(world, dim, x, y - 1, z)) return y;
    }
    return 64;
  }
  var h = world.getHeight(dim, x, z);
  return Math.max(SEA + 1, h + 1);
}
function buildPortalFrame(game, dim, x, y, z) {
  var world = game.world;
  if (world.getId(dim, x, y + 1, z) === BID.nether_portal) return;
  for (var dy = -1; dy <= 4; dy++) for (var dx = -1; dx <= 2; dx++) {
    var solid = (dy === -1 || dy === 4 || dx === -1 || dx === 2);
    var bx = x + dx, by = y + dy, bz = z;
    if (solid) { if (world.getId(dim, bx, by, bz) === 0 || dy === -1) world.setBlock(dim, bx, by, bz, BID.obsidian); }
    else world.setBlock(dim, bx, by, bz, bpack(BID.nether_portal, 0));
  }
  /* a small landing so you never arrive inside a wall */
  for (var lx = -2; lx <= 3; lx++) for (var lz = -2; lz <= 2; lz++) {
    if (world.getId(dim, x + lx, y - 1, z + lz) === 0) world.setBlock(dim, x + lx, y - 1, z + lz, BID.obsidian);
    for (var ly = 0; ly < 4; ly++) {
      var idc = world.getId(dim, x + lx, y + ly, z + lz);
      if (idc !== 0 && idc !== BID.obsidian && idc !== BID.nether_portal && (lx < -1 || lx > 2 || lz !== 0))
        world.setBlock(dim, x + lx, y + ly, z + lz, 0);
    }
  }
}
function buildEndPlatform(game, x, z) {
  var world = game.world, dim = DIM_END;
  var y = 66;
  for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) {
    world.setBlock(dim, x + dx, y, z + dz, BID.obsidian);
    for (var dy = 1; dy <= 3; dy++) world.setBlock(dim, x + dx, y + dy, z + dz, 0);
  }
  game.player.y = y + 1;
}

/* ------------------------------------------------------------- trees --- */
function growTree(game, dim, x, y, z, kind) {
  var world = game.world;
  var key = { oak: 'oak', birch: 'birch', spruce: 'spruce', jungle: 'jungle', acacia: 'acacia',
    dark_oak: 'dark_oak', mangrove: 'mangrove', cherry: 'cherry', pale_oak: 'pale_oak' }[kind] || 'oak';
  var tpl = TREES[key] || TREES.oak;
  if (Math.random() < 0.12 && TREES[key + '_big']) tpl = TREES[key + '_big'];
  world.setBlock(dim, x, y, z, 0);
  var placed = [];
  tpl(x, y, z, makeRNG((x * 374761393 + z * 668265263 + y * 1274126177) >>> 0), function (bx, by, bz, id, replace) {
    var cur = world.getId(dim, bx, by, bz);
    if (cur !== 0 && !replace && !BLOCKS[cur].replaceable) return;
    world.setBlock(dim, bx, by, bz, id);
  });
  playSound(game, 'place', x, y, z, 0.7);
}

/* ---------------------------------------------------------- save/load -- */
function saveGame(game) {
  try {
    var p = game.player;
    var data = {
      v: 3, seed: game.seed, dayTime: game.dayTime,
      p: {
        x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, dim: p.dim,
        hp: p.hp, food: p.food, sat: p.saturation, xp: p.xp, level: p.level,
        creative: p.creative, flying: p.flying,
        inv: p.inv, armor: p.armor, offhand: p.offhand,
        spawnX: p.spawnX, spawnY: p.spawnY, spawnZ: p.spawnZ
      },
      edits: game.edits
    };
    localStorage.setItem('voxelcraft.save', JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
function loadGame(game) {
  try {
    var raw = localStorage.getItem('voxelcraft.save');
    if (!raw) return false;
    var d = JSON.parse(raw);
    if (!d || d.v !== 3) return false;
    game.seed = d.seed;
    game.dayTime = d.dayTime;
    game.edits = d.edits || {};
    var p = game.player;
    var s = d.p;
    p.x = s.x; p.y = s.y; p.z = s.z; p.yaw = s.yaw; p.pitch = s.pitch; p.dim = s.dim;
    p.hp = s.hp; p.food = s.food; p.saturation = s.sat; p.xp = s.xp; p.level = s.level;
    p.creative = s.creative; p.flying = s.flying;
    p.inv = s.inv; p.armor = s.armor; p.offhand = s.offhand;
    p.spawnX = s.spawnX; p.spawnY = s.spawnY; p.spawnZ = s.spawnZ;
    return true;
  } catch (e) { return false; }
}

/* ================================ TICK ================================== */
function gameTick(game, dt) {
  var p = game.player;
  game.time += dt;
  game.tickCount++;

  updateWorldTime(game, dt);
  handleActions(game, dt);
  updatePlayer(game, dt, game.input);
  updateCamera(game, dt);
  updateViewModel(game, dt);

  /* entities */
  var list = game.entities;
  for (var i = list.length - 1; i >= 0; i--) {
    var e = list[i];
    if (e.remove) { list[i] = list[list.length - 1]; list.pop(); continue; }
    if (e.invuln > 0) e.invuln -= dt;
    var d2 = (e.x - p.x) * (e.x - p.x) + (e.z - p.z) * (e.z - p.z);
    if (e.dim !== p.dim || d2 > 140 * 140) {
      if (!e.persist && d2 > 220 * 220) { list[i] = list[list.length - 1]; list.pop(); }
      continue;
    }
    updateEntity(game, e, dt);
  }
  drainPendingMobs(game);
  if (!p.creative) trySpawnMobs(game, dt);
  updateParticles(game, dt);
  tickBlockEntities(game, dt);
  randomTicks(game, dt);
  tickFluids(game, dt);
  if (game.dimSwitchPending) finishDimSwitch(game);

  /* screen tint: water, lava, portals and night vision all colour the frame */
  var tr = 1, tg = 1, tb = 1, ta = 0, ex = 1;
  if (p.submerged) { tr = 0.42; tg = 0.66; tb = 0.95; ta = 0.55; ex = 0.9; }
  if (p.inLava) { tr = 1.0; tg = 0.42; tb = 0.12; ta = 0.82; ex = 1.1; }
  if (p.effects.nightvision) { tr = 0.75; tg = 0.95; tb = 0.78; ta = Math.max(ta, 0.20); ex = 1.5; }
  if (p.portalTime > 0.05) { tr = 0.72; tg = 0.36; tb = 0.92; ta = Math.max(ta, clamp(p.portalTime / 1.4, 0, 1) * 0.5); }
  if (game.lightningFlash > 0) ex += game.lightningFlash * 0.9;
  if (game.totemFlash > 0) { tr = 1.0; tg = 0.85; tb = 0.35; ta = Math.max(ta, game.totemFlash * 0.7); }
  game.screenTint[0] = tr; game.screenTint[1] = tg; game.screenTint[2] = tb;
  game.screenTintAmt = approach(game.screenTintAmt, ta, dt * 6);
  game.exposure = approach(game.exposure, ex * (0.92 + game.weather.rain * -0.08), dt * 2.5);

  game.shake = Math.max(0, game.shake - dt * 2.2);
  game.damageFlash = Math.max(0, game.damageFlash - dt * 2.5);
  game.totemFlash = Math.max(0, game.totemFlash - dt * 1.2);
  game.portalFade = Math.max(0, (game.portalFade || 0) - dt * 1.5);

  /* the boss bar tracks whatever boss is nearest */
  game.boss = null;
  for (var b = 0; b < list.length; b++) {
    var be = list[b];
    if (be.dim !== p.dim || be.dead) continue;
    if (!MOBS[be.type].boss) continue;
    var bd = Math.hypot(be.x - p.x, be.z - p.z);
    if (bd < 120) { game.boss = be; break; }
  }
}

/* Mobs that belong to a structure appear once their chunk is meshed. */
function drainPendingMobs(game) {
  var list = game.world.pendingMobs;
  if (!list.length) return;
  var p = game.player;
  for (var i = list.length - 1; i >= 0; i--) {
    var m = list[i];
    var c = game.world.chunkAt(m.dim, Math.floor(m.x) >> 4, Math.floor(m.z) >> 4);
    if (!c || !c.meshed) {
      if (!c) { list[i] = list[list.length - 1]; list.pop(); }
      continue;
    }
    list[i] = list[list.length - 1]; list.pop();
    if (m.mob === 'end_crystal_marker') m.mob = 'end_crystal';
    if (!MOBS[m.mob]) continue;
    if (m.mob === 'ender_dragon' && game.entities.some(function (e) { return e.type === 'ender_dragon'; })) continue;
    if (game.entities.length > 320) continue;
    game.entities.push(makeEntity(m.mob, m.dim, m.x, m.y, m.z, { persist: true }));
  }
}

/* ============================== HUD PAINT =============================== */
function paintHUD(game) {
  var p = game.player;
  if (UI.dirty) { updateHUD(game); UI.dirty = false; }

  UI.els.hurt.style.opacity = Math.max(game.damageFlash * 0.55, p.hp <= 6 && !p.dead ? 0.12 + Math.sin(game.time * 4) * 0.05 : 0);
  UI.els.portal.style.opacity = Math.max(p.portalTime / 1.4 * 0.7, game.portalFade || 0);
  UI.els.vignette.style.opacity = p.submerged ? 0.5 : 0.28;

  /* status line */
  if (game.showDebug) {
    var w = game.world;
    var biome = w.getBiome(p.dim, Math.floor(p.x), Math.floor(p.z));
    UI.els.debug.classList.remove('hidden');
    UI.els.debug.textContent =
      'Voxelcraft  ' + game.fps.toFixed(0) + ' fps\n' +
      'XYZ ' + p.x.toFixed(2) + ' / ' + p.y.toFixed(2) + ' / ' + p.z.toFixed(2) + '\n' +
      'Chunk ' + (Math.floor(p.x) >> 4) + ', ' + (Math.floor(p.z) >> 4) + '   Dim ' + ['Overworld', 'Nether', 'End'][p.dim] + '\n' +
      'Biome ' + (biome ? biome.disp || biome.name : '?') + '\n' +
      'Light ' + (w.getLight(p.dim, Math.floor(p.x), Math.floor(p.camY), Math.floor(p.z)) >> 4 & 15) + ' sky / ' +
      (w.getLight(p.dim, Math.floor(p.x), Math.floor(p.camY), Math.floor(p.z)) & 15) + ' block\n' +
      'Time ' + Math.floor(game.dayTime) + (game.isDay ? ' (day)' : ' (night)') + '   Rain ' + game.weather.rain.toFixed(2) + '\n' +
      'Chunks ' + w.stats.chunks + ' loaded, ' + w.stats.meshed + ' meshed, ' + w.jobs + ' jobs\n' +
      'Entities ' + game.entities.length + '   Particles ' + game.particles.length + '\n' +
      'Facing ' + facingName(p.yaw) + '   ' + (game.hit ? 'Looking at ' + BLOCKS[game.hit.id].disp : '');
  } else UI.els.debug.classList.add('hidden');

  /* chat log */
  var chat = UI.els.chat;
  if (UI.messages.length !== chat._n) {
    chat._n = UI.messages.length;
    clearEl(chat);
    var start = Math.max(0, UI.messages.length - 8);
    for (var i = start; i < UI.messages.length; i++) {
      var m = UI.messages[i];
      var d = el('div', 'chatline', chat, m.text);
      d.style.color = m.color;
    }
  }
  var fade = UI.messages.length ? clamp(1 - (game.time - UI.messages[UI.messages.length - 1].t - 5) / 2, 0, 1) : 0;
  chat.style.opacity = fade;

  /* boss bar */
  if (game.boss) {
    UI.els.bossbar.classList.remove('hidden');
    if (!UI.els.bossbar._fill) {
      clearEl(UI.els.bossbar);
      UI.els.bossbar._name = el('div', 'bossname', UI.els.bossbar);
      var track = el('div', 'bosstrack', UI.els.bossbar);
      UI.els.bossbar._fill = el('div', 'bossfill', track);
    }
    UI.els.bossbar._name.textContent = MOBS[game.boss.type].disp;
    UI.els.bossbar._fill.style.width = Math.max(0, game.boss.hp / game.boss.maxHp * 100) + '%';
  } else UI.els.bossbar.classList.add('hidden');

  /* break progress on the crosshair */
  if (UI.screen) refreshScreen(game);
}
function facingName(yaw) {
  var d = Math.round(mod(yaw, Math.PI * 2) / (Math.PI / 2)) & 3;
  return ['North', 'East', 'South', 'West'][d];
}

/* ================================ BOOT ================================== */
function boot() {
  var canvas = document.getElementById('gl');
  if (!initGL(canvas)) {
    document.getElementById('loading').textContent = 'WebGL2 is not available in this browser.';
    return;
  }
  setLoading('Painting textures…', 0.05);
  setTimeout(function () { boot2(canvas); }, 20);
}
function setLoading(text, frac) {
  var l = document.getElementById('loading');
  if (!l) return;
  var t = document.getElementById('loadtext');
  var b = document.getElementById('loadbar');
  if (t) t.textContent = text;
  if (b) b.style.width = Math.round(frac * 100) + '%';
}
function boot2(canvas) {
  classifyPasses();
  bakeAllBlockTextures();
  bakeItemIcons();
  prebakeEntityTiles();
  setLoading('Uploading atlas (' + TEX_LAYERS.length + ' tiles)…', 0.25);
  setTimeout(function () { boot3(canvas); }, 20);
}
function boot3(canvas) {
  initRenderer(canvas);
  initEntityBuffers();
  initParticleBuffers();
  initWeatherBuffers();
  setLoading('Generating world…', 0.45);
  setTimeout(function () { boot4(canvas); }, 20);
}
function seedFromURL() {
  var m = /[?&#]seed=([^&#]+)/.exec(location.href);
  if (!m) return (Math.random() * 0xffffffff) >>> 0;
  var raw = decodeURIComponent(m[1]);
  if (/^-?\d+$/.test(raw)) return (parseInt(raw, 10) >>> 0);
  var h = 2166136261;
  for (var i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function boot4(canvas) {
  var seed = seedFromURL();
  var g = createGame(canvas, seed);
  Game = g;
  window.game = g;

  buildHUD(g);
  g.requestPointerLock = function () {
    if (!UI.screen && canvas.requestPointerLock) canvas.requestPointerLock();
  };
  g.save = function () { return saveGame(g); };
  g.remeshAll = function () { remeshAll(g); };
  g.growTree = function (dim, x, y, z, kind) { growTree(g, dim, x, y, z, kind); };
  g.travelDimension = function (to) { travelDimension(g, to); };
  g.trySleep = function () {
    if (g.isDay) { logMessage(g, 'You can only sleep at night.', '#ff9955'); return; }
    g.dayTime = 23500;
    logMessage(g, 'Good morning.', '#aaffaa');
  };
  /* the equivalent of /locate: walk outward through the structure grid */
  g.locate = function (name, fromX, fromZ) {
    var def = null;
    for (var i = 0; i < STRUCT_DEFS.length; i++) if (STRUCT_DEFS[i].name === name) def = STRUCT_DEFS[i];
    if (!def) return null;
    var px = fromX === undefined ? g.player.x : fromX, pz = fromZ === undefined ? g.player.z : fromZ;
    var crx = Math.floor((px / 16) / def.spacing), crz = Math.floor((pz / 16) / def.spacing);
    for (var ring = 0; ring < 40; ring++) {
      for (var dx = -ring; dx <= ring; dx++) for (var dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        var pos = structRegionPos(def, crx + dx, crz + dz, 0);
        if (structValid(def, pos)) return { x: pos.cx * 16 + 8, y: pos.y, z: pos.cz * 16 + 8, name: name };
      }
    }
    return null;
  };
  g.onBossKilled = function (e) {
    logMessage(g, MOBS[e.type].disp + ' defeated!', '#ffdd55');
    if (e.type === 'ender_dragon') spawnXP(g, e.dim, e.x, e.y, e.z, 500);
  };

  loadGame(g);
  setupInput(g);

  /* the main thread keeps its own copy of the noise fields so it can answer
     climate and structure-location queries without asking a worker */
  WorldGen.init(g.seed);

  var workerSrc = document.getElementById('worker-src').textContent;
  g.world.initWorkers(workerSrc, Math.min(6, Math.max(2, (navigator.hardwareConcurrency || 4) - 1)));

  /* starting kit so the first minute is playable */
  var p = g.player;
  var empty = true;
  for (var i = 0; i < INV_SIZE; i++) if (p.inv[i]) empty = false;
  if (empty) {
    giveItem(g, 'oak_planks', 16);
    giveItem(g, 'torch', 24);
    giveItem(g, 'stone_pickaxe', 1);
    giveItem(g, 'stone_axe', 1);
    giveItem(g, 'stone_sword', 1);
    giveItem(g, 'bread', 8);
    giveItem(g, 'crafting_table', 1);
  }

  setLoading('Loading terrain…', 0.6);
  waitForSpawn(g);
}

/* Walk outward from the origin until we find dry, open land — nobody wants
   to spawn a hundred blocks out to sea or inside a mountain. */
function findSpawnPoint(g, relax) {
  var w = g.world, dim = g.player.dim;
  var best = null;
  for (var r = 0; r < 12 && !best; r++) {
    for (var a = 0; a < Math.max(1, r * 8) && !best; a++) {
      var ang = a / Math.max(1, r * 8) * Math.PI * 2;
      var x = Math.round(Math.cos(ang) * r * 12);
      var z = Math.round(Math.sin(ang) * r * 12);
      var c = w.chunkAt(dim, x >> 4, z >> 4);
      if (!c || !c.loaded) continue;
      var h = w.getHeight(dim, x, z);
      if (h <= SEA) continue;
      var ground = w.getId(dim, x, h, z);
      if (!ground || !BLOCKS[ground].solid) continue;
      if (BLOCKS[ground].liquid) continue;
      var bi = w.getBiome(dim, x, z);
      if (bi && bi.name.indexOf('ocean') >= 0) continue;
      /* open sky and room to stand — never inside a canopy */
      if (w.getId(dim, x, h + 1, z) !== 0 || w.getId(dim, x, h + 2, z) !== 0) continue;
      if (relax < 2 && ((w.getLight(dim, x, h + 1, z) >> 4) & 15) < 15) continue;
      if (relax < 1) {
        var clear = true;
        for (var ox = -1; ox <= 1 && clear; ox++) for (var oz = -1; oz <= 1; oz++) {
          if (w.getId(dim, x + ox, h + 1, z + oz) !== 0) { clear = false; break; }
        }
        if (!clear) continue;
      }
      best = { x: x, y: h + 1, z: z };
    }
  }
  return best;
}

function waitForSpawn(g) {
  var p = g.player;
  pumpChunks(g, 24);
  var c = g.world.chunkAt(p.dim, Math.floor(p.x) >> 4, Math.floor(p.z) >> 4);
  var ready = c && c.loaded && c.meshed;
  var loaded = Object.keys(g.world.dims[p.dim]).length;
  setLoading('Loading terrain… (' + loaded + ' chunks)', 0.6 + Math.min(0.39, loaded / 90 * 0.39));
  if (!ready || loaded < 20) { requestAnimationFrame(function () { waitForSpawn(g); }); return; }
  if (!g.spawned) {
    g.spawned = true;
    if (!g.loadedSave) {
      g.spawnTries = (g.spawnTries || 0) + 1;
      var spot = findSpawnPoint(g, g.spawnTries > 90 ? 2 : (g.spawnTries > 45 ? 1 : 0));
      if (!spot && g.spawnTries > 150) {
        /* nothing dry anywhere nearby — stand on the sea and get on with it */
        spot = { x: 0, y: Math.max(SEA + 1, g.world.getHeight(g.player.dim, 0, 0) + 1), z: 0 };
      }
      if (!spot) { requestAnimationFrame(function () { waitForSpawn(g); }); g.spawned = false; return; }
      p.x = spot.x + 0.5; p.z = spot.z + 0.5; p.y = spot.y;
      p.spawnX = spot.x; p.spawnY = spot.y; p.spawnZ = spot.z;
      p.camY = p.y + 1.62;
    }
  }
  var l = document.getElementById('loading');
  if (l) l.classList.add('gone');
  logMessage(g, 'Welcome to Voxelcraft. Left click to mine, right click to place, E for inventory.', '#ffffff');
  UI.dirty = true;
  g.ready = true;
  g.lastFrame = performance.now();
  requestAnimationFrame(function (t) { frame(g, t); });
}

function frame(g, now) {
  requestAnimationFrame(function (t) { frame(g, t); });
  var dt = Math.min(0.1, (now - g.lastFrame) / 1000);
  g.lastFrame = now;
  if (dt <= 0) return;

  /* fps */
  g.frameTimes.push(dt);
  if (g.frameTimes.length > 30) g.frameTimes.shift();
  var sum = 0;
  for (var i = 0; i < g.frameTimes.length; i++) sum += g.frameTimes[i];
  g.fps = g.frameTimes.length / sum;

  if (R.settings.maxFps > 0) {
    g.frameAccum = (g.frameAccum || 0) + dt;
    if (g.frameAccum < 1 / R.settings.maxFps) return;
    dt = g.frameAccum; g.frameAccum = 0;
  }

  if (g.frozen) { updateCamera(g, dt); updateViewModel(g, dt); g.time += dt; updateWorldTime(g, dt); }
  else if (!UI.screen || UI.screen === 'death') gameTick(g, dt);
  else { updateViewModel(g, dt); updateCamera(g, dt); g.time += dt; tickBlockEntities(g, dt); }

  pumpChunks(g, 6);
  renderFrame(g);
  paintHUD(g);
}

/* the headless smoke test calls this */
function DIAG() {
  var g = Game;
  if (!g) return { ready: false };
  return {
    ready: !!g.ready,
    blocks: BLOCKS.length, items: ITEM_LIST.length, tiles: TEX_LAYERS.length,
    mobs: Object.keys(MOBS).length, biomes: BIOMES.length, recipes: RECIPES.length,
    chunks: g.world.stats.chunks, meshed: g.world.stats.meshed,
    entities: g.entities.length, fps: g.fps,
    player: { x: g.player.x, y: g.player.y, z: g.player.z, dim: g.player.dim },
    errors: window.__errors || []
  };
}

window.addEventListener('error', function (e) {
  window.__errors = window.__errors || [];
  window.__errors.push(String(e.message) + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0));
  var l = document.getElementById('loading');
  if (l && !l.classList.contains('gone')) {
    var t = document.getElementById('loadtext');
    if (t) t.textContent = 'Error: ' + e.message;
  }
});
window.addEventListener('DOMContentLoaded', boot);
