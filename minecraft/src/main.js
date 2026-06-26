// ============================================================================
//  VOXELCRAFT — main game orchestrator & bootstrap
// ============================================================================
import * as THREE from 'three';
import { RENDER_DISTANCE, DAY_LENGTH_SECONDS, DIM, SEA_LEVEL, clamp, smoothstep, lerp } from './constants.js';
import { BLOCK, ITEM } from './ids.js';
import { getBlock } from './blocks.js';
import { itemDef } from './items.js';
import { buildAtlas } from './textures.js';
import { createUniforms, createAtlasTexture, createChunkMaterials, createSky, createPostFX } from './shaders.js';
import { WorldGen } from './worldgen.js';
import { World } from './world.js';
import { Player } from './player.js';
import { ViewModel } from './viewmodel.js';
import { MobManager } from './mobs.js';
import { Inventory } from './inventory.js';
import { Particles } from './particles.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { UI } from './ui.js';
import { updateSurvival, eatFood, applyArmor } from './survival.js';
import { smeltResult, fuelTime } from './crafting.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';

const CREATIVE_ITEMS = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.COBBLESTONE, BLOCK.PLANKS_OAK, BLOCK.LOG_OAK, BLOCK.LEAVES_OAK,
  BLOCK.SAND, BLOCK.SANDSTONE, BLOCK.GRAVEL, BLOCK.GLASS, BLOCK.BRICKS, BLOCK.STONE_BRICKS, BLOCK.MOSSY_COBBLE,
  BLOCK.WOOL_WHITE, BLOCK.WOOL_RED, BLOCK.WOOL_BLUE, BLOCK.WOOL_GREEN, BLOCK.WOOL_YELLOW, BLOCK.WOOL_BLACK,
  BLOCK.SNOW, BLOCK.ICE, BLOCK.OBSIDIAN, BLOCK.GLOWSTONE, BLOCK.NETHERRACK, BLOCK.SOUL_SAND, BLOCK.END_STONE,
  BLOCK.CRAFTING_TABLE, BLOCK.FURNACE, BLOCK.CHEST, BLOCK.BOOKSHELF, BLOCK.TORCH, BLOCK.LADDER, BLOCK.PUMPKIN,
  BLOCK.CACTUS, BLOCK.FLOWER_POPPY, BLOCK.FLOWER_DANDELION, BLOCK.TALL_GRASS, BLOCK.DIAMOND_BLOCK, BLOCK.IRON_BLOCK,
  BLOCK.GOLD_BLOCK, BLOCK.WATER, BLOCK.LAVA,
  ITEM.DIAMOND_PICKAXE, ITEM.DIAMOND_AXE, ITEM.DIAMOND_SHOVEL, ITEM.DIAMOND_SWORD, ITEM.BOW, ITEM.ARROW,
  ITEM.FLINT_AND_STEEL, ITEM.SHEARS, ITEM.BUCKET, ITEM.WATER_BUCKET, ITEM.LAVA_BUCKET, ITEM.APPLE, ITEM.BREAD,
  ITEM.DIAMOND_HELMET, ITEM.DIAMOND_CHEST, ITEM.DIAMOND_LEGS, ITEM.DIAMOND_BOOTS,
];

class Game {
  constructor() {
    this.settings = { renderDistance: 6, sensitivity: 1, fov: 75, godrays: true, bloom: true, fog: true, shadows: true };
    this.playing = false; this.paused = false;
    this.worlds = {};
    this.containers = {};
    this.time = 0; this.gameTime = DAY_LENGTH_SECONDS * 0.33; // start mid-morning (daylight)
    this.dim = DIM.OVERWORLD;
    this.portalTimer = 0; this.portalCooldown = 0;
    this._initRenderer();
    this._initWorldlessScene();
    this.inventory = new Inventory();
    this.audio = new GameAudio();
    this.input = new Input(this.renderer.domElement);
    this.ui = new UI(this);
    this._bindGlobalInput();
    this.clock = new THREE.Clock();
    this._loop();
    window.addEventListener('resize', () => this._resize());
  }

  // ---- setup ----
  _initRenderer() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // ACES applied in the final post pass
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.05, 1600);
    this.camera.position.set(0, 80, 0);
  }

  _initWorldlessScene() {
    this.scene = new THREE.Scene();
    this.uniforms = createUniforms();
    const atlas = buildAtlas();
    this.atlasCanvas = atlas.canvas; this.uvs = atlas.uvs;
    this.atlasTexture = createAtlasTexture(atlas.canvas);
    this.materials = createChunkMaterials(this.atlasTexture, this.uniforms);
    this.sky = createSky(this.uniforms);
    this.scene.add(this.sky.group);
    this.particles = new Particles(this.scene);
    this.scene.add(this.camera);
    this.viewmodel = new ViewModel(this.camera, this.atlasTexture, this.uvs);
    this.fx = createPostFX(this.renderer, this.scene, this.camera);
    // selection outline
    const og = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const edges = new THREE.EdgesGeometry(og);
    this.selBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }));
    this.selBox.visible = false; this.scene.add(this.selBox);
    this.applyFX();
  }

  applyFX() {
    if (!this.fx) return;
    this.fx.bloom.enabled = this.settings.bloom;
    this.fx.godrays.enabled = this.settings.godrays;
  }
  setRenderDistance(v) { this.settings.renderDistance = v | 0; RENDER_DISTANCE.value = v | 0; }
  setFOV(v) { this.settings.fov = v; this.camera.fov = v; this.camera.updateProjectionMatrix(); }
  canLoad() { return hasSave(); }

  // ---- world lifecycle ----
  getWorld(dim) {
    if (!this.worlds[dim]) {
      const w = new World(this.scene, this.gen, this.materials, this.uvs, dim);
      this.worlds[dim] = w;
    }
    return this.worlds[dim];
  }

  startNewWorld(seedStr, mode) {
    clearSave();
    this._setup(seedStr, mode);
    this._giveStarter(mode);
    this._spawnPlayer();
    this._beginPlay();
  }

  loadSavedWorld() {
    const data = loadGame();
    if (!data) { this.startNewWorld('' + Math.floor(Math.random() * 1e9), 'survival'); return; }
    this._setup(data.seed, data.mode);
    this.gameTime = data.gameTime || this.gameTime;
    this.inventory.load(data.inventory);
    this.dim = data.dim || DIM.OVERWORLD;
    this.world = this.getWorld(this.dim);
    if (data.modified) for (const dimk in data.modified) { const w = this.getWorld(+dimk); w.modified = data.modified[dimk]; }
    this.containers = this._deserContainers(data.containers);
    this.player.mode = data.mode || 'survival';
    this.player.setMode(this.player.mode);
    this.player.pos.set(data.px, data.py, data.pz);
    this.player.health = data.health ?? 20; this.player.hunger = data.hunger ?? 20;
    this.player.xp = data.xp || 0; this.player.xpLevel = data.xpLevel || 0;
    this._setActiveDim(this.dim, false);
    this._primeAround();
    this._beginPlay();
  }

  _setup(seedStr, mode) {
    // clear previous
    for (const k in this.worlds) { this.worlds[k].clear(); this.scene.remove(this.worlds[k].group); }
    this.worlds = {}; this.containers = {};
    this.gen = new WorldGen(seedStr);
    this.seedStr = seedStr;
    this.dim = DIM.OVERWORLD;
    this.world = this.getWorld(DIM.OVERWORLD);
    if (!this.mobs) this.mobs = new MobManager(this.scene, this.world, this);
    else { this.mobs.clear(); this.mobs.world = this.world; }
    if (!this.player) this.player = new Player(this.camera, this.world, this);
    this.player.world = this.world;
    this.player.setMode(mode);
    RENDER_DISTANCE.value = this.settings.renderDistance;
  }

  _spawnPlayer() {
    const sx = 8, sz = 8;
    this.player.pos.set(sx + 0.5, 120, sz + 0.5);
    this._primeAround();
    const y = this.world.highestY(sx, sz);
    this.player.pos.set(sx + 0.5, y + 1, sz + 0.5);
    this.player.vel.set(0, 0, 0);
    this.spawnPoint = { x: sx, y: y + 1, z: sz, dim: DIM.OVERWORLD };
  }

  _primeAround() {
    // synchronously generate a small spawn area so the player has ground
    for (let i = 0; i < 6; i++) this.world.update(this.player.pos.x, this.player.pos.z, { gen: 40, mesh: 0 });
    for (let i = 0; i < 3; i++) this.world.update(this.player.pos.x, this.player.pos.z, { gen: 0, mesh: 30 });
  }

  _giveStarter(mode) {
    this.inventory.slots.fill(null);
    this.inventory.armor.fill(null);
    if (mode === 'creative') {
      CREATIVE_ITEMS.forEach((id, i) => { if (i < 36) this.inventory.slots[i] = { id, count: itemDef(id).isBlock ? 64 : 1 }; });
    } else {
      // friendly starter kit
      this.inventory.slots[0] = { id: ITEM.WOOD_PICKAXE, count: 1 };
      this.inventory.slots[1] = { id: ITEM.WOOD_AXE, count: 1 };
      this.inventory.slots[2] = { id: ITEM.WOOD_SWORD, count: 1 };
      this.inventory.slots[3] = { id: BLOCK.CRAFTING_TABLE, count: 1 };
      this.inventory.slots[4] = { id: ITEM.BREAD, count: 5 };
      this.inventory.slots[5] = { id: BLOCK.TORCH, count: 16 };
    }
  }

  _beginPlay() {
    this.playing = true; this.paused = false;
    this.ui.showMenu(null);
    this.audio.init();
    this.input.requestLock();
  }

  resume() { this.paused = false; this.ui.showMenu(null); this.input.requestLock(); }
  pause() { if (!this.playing) return; this.paused = true; this.ui.showMenu('pause'); this.input.exitLock(); }
  quitToMenu() {
    this.playing = false; this.paused = false;
    this.input.exitLock();
    this.ui.showMenu('main');
  }

  onUIOpen(isOpen) { if (isOpen) this.input.exitLock(); else if (this.playing && !this.paused) this.input.requestLock(); }

  // ---- save ----
  save() {
    if (!this.playing) return;
    const modified = {};
    for (const k in this.worlds) modified[k] = this.worlds[k].modified;
    const data = {
      seed: this.seedStr, mode: this.player.mode, dim: this.dim, gameTime: this.gameTime,
      px: this.player.pos.x, py: this.player.pos.y, pz: this.player.pos.z,
      health: this.player.health, hunger: this.player.hunger, xp: this.player.xp, xpLevel: this.player.xpLevel,
      inventory: this.inventory.serialize(), modified, containers: this._serContainers(),
    };
    saveGame(data);
  }
  _serContainers() {
    const out = {};
    for (const k in this.containers) {
      const c = this.containers[k];
      if (c.type === 'chest') out[k] = { type: 'chest', items: c.items.map(s => s ? [s.id, s.count] : null) };
      else out[k] = { type: 'furnace', input: c.input ? [c.input.id, c.input.count] : null, fuel: c.fuel ? [c.fuel.id, c.fuel.count] : null, output: c.output ? [c.output.id, c.output.count] : null };
    }
    return out;
  }
  _deserContainers(data) {
    const out = {};
    if (!data) return out;
    for (const k in data) {
      const c = data[k];
      if (c.type === 'chest') out[k] = { type: 'chest', items: c.items.map(s => s ? { id: s[0], count: s[1] } : null) };
      else out[k] = { type: 'furnace', burn: 0, burnMax: 0, cook: 0, cookMax: 10, pos: k.split(',').map(Number), input: c.input ? { id: c.input[0], count: c.input[1] } : null, fuel: c.fuel ? { id: c.fuel[0], count: c.fuel[1] } : null, output: c.output ? { id: c.output[0], count: c.output[1] } : null };
    }
    return out;
  }

  // ---- callbacks used by player / mobs ----
  spawnDrop(x, y, z, item, count) { this.mobs.spawnDrop(x, y, z, item, count); }
  makeItemSprite(item) {
    const d = itemDef(item);
    let name = d && d.icon; if (!name && d && d.isBlock) name = getBlock(d.blockId).tex?.pz;
    const uv = (name && this.uvs.get(name)) || [0, 0, 1, 1];
    const g = new THREE.PlaneGeometry(0.5, 0.5);
    const u = g.attributes.uv;
    u.setXY(0, uv[0], uv[1]); u.setXY(1, uv[2], uv[1]); u.setXY(2, uv[0], uv[3]); u.setXY(3, uv[2], uv[3]);
    u.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: this.atlasTexture, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    return new THREE.Mesh(g, mat);
  }
  damagePlayer(amount, src) {
    const reduced = applyArmor(amount, this.inventory.armorValue());
    this.player.takeDamage(reduced, 'mob');
  }
  onHurt(amount, source) {
    this.audio.play('hurt');
    document.body.classList.add('hurt');
    setTimeout(() => document.body.classList.remove('hurt'), 200);
  }
  onDeath() {
    this.audio.play('mobdeath');
    this.input.exitLock();
    this.ui.showMenu('death');
  }
  respawn() {
    const s = this.spawnPoint;
    if (s.dim !== this.dim) this._setActiveDim(s.dim, false);
    this.player.respawn(s.x, s.y, s.z);
    this.paused = false; this.ui.showMenu(null); this.input.requestLock();
  }
  onBlockBroken(t, b) {
    const key = t.x + ',' + t.y + ',' + t.z + ',' + this.dim;
    const c = this.containers[key];
    if (c) {
      if (c.type === 'chest') { for (const s of c.items) if (s) this.spawnDrop(t.x + 0.5, t.y + 0.5, t.z + 0.5, s.id, s.count); }
      else { for (const s of [c.input, c.fuel, c.output]) if (s) this.spawnDrop(t.x + 0.5, t.y + 0.5, t.z + 0.5, s.id, s.count); }
      delete this.containers[key];
    }
    this.particles.blockBreak(t.x + 0.5, t.y + 0.5, t.z + 0.5, this._blockColor(t.id));
    // gravity blocks: turn floating sand/gravel above into falling -> simply drop them one level loop
    let yy = t.y + 1;
    while (true) {
      const above = this.world.getBlock(t.x, yy, t.z);
      if (above === BLOCK.SAND || above === BLOCK.GRAVEL || above === BLOCK.RED_SAND) {
        this.world.setBlock(t.x, yy, t.z, BLOCK.AIR);
        this.world.setBlock(t.x, yy - 1, t.z, above);
        yy++;
      } else break;
    }
  }
  _blockColor(id) {
    const b = getBlock(id); if (!b.tex) return [0.6, 0.5, 0.4];
    const uv = this.uvs.get(b.tex.pz); if (!uv) return [0.6, 0.5, 0.4];
    return [0.6, 0.55, 0.5];
  }

  eat(d, held) { if (eatFood(this.player, this.inventory, d)) this.audio.play('pop'); }

  addXP(n) {
    this.player.xp += n;
    let need = this._xpNeed();
    while (this.player.xp >= need) { this.player.xp -= need; this.player.xpLevel++; need = this._xpNeed(); this.audio.play('level'); }
  }
  _xpNeed() { return 7 + this.player.xpLevel * 3; }
  xpProgress() { return clamp(this.player.xp / this._xpNeed(), 0, 1); }

  tryAttack() {
    if (this.ui.open) return;
    const o = this.player.eyePos();
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ'));
    const held = this.inventory.held();
    let dmg = 1; if (held) { const d = itemDef(held.id); if (d && d.damage) dmg = d.damage; }
    if (this.mobs.attackRay(o, dir, this.player.reach, dmg)) {
      if (held) { const d = itemDef(held.id); if (d && d.durability) this.inventory.damageHeld(1); }
      this.player.exhaustion += 0.1;
    }
  }

  tryIgnitePortal(t) {
    if (t.id !== BLOCK.OBSIDIAN) return;
    // build a small portal column above the obsidian
    for (let dy = 1; dy <= 3; dy++) {
      if (this.world.getBlock(t.x, t.y + dy, t.z) === BLOCK.AIR) this.world.setBlock(t.x, t.y + dy, t.z, BLOCK.NETHER_PORTAL);
    }
    this.audio.play('place');
    this.ui.toast('Portal lit — step in to travel');
  }

  openCrafting() { this.ui.openCrafting(); }
  openFurnace(t) {
    const key = t.x + ',' + t.y + ',' + t.z + ',' + this.dim;
    if (!this.containers[key]) this.containers[key] = { type: 'furnace', burn: 0, burnMax: 0, cook: 0, cookMax: 10, input: null, fuel: null, output: null, pos: [t.x, t.y, t.z] };
    this.ui.openFurnace(this.containers[key]);
  }
  openChest(t) {
    const key = t.x + ',' + t.y + ',' + t.z + ',' + this.dim;
    if (!this.containers[key]) this.containers[key] = { type: 'chest', items: new Array(27).fill(null) };
    this.ui.openChest(this.containers[key]);
  }

  // ---- dimensions ----
  _setActiveDim(dim, savePos = true) {
    if (savePos) this._returnPos = this._returnPos || {};
    this.dim = dim;
    this.world = this.getWorld(dim);
    for (const k in this.worlds) this.worlds[k].group.visible = (+k === dim);
    this.player.world = this.world;
    this.mobs.world = this.world;
    this.mobs.clear();
  }
  travel(toDim) {
    const fromY = this.player.pos.y;
    this._setActiveDim(toDim);
    // place safely
    const px = Math.floor(this.player.pos.x), pz = Math.floor(this.player.pos.z);
    this.player.pos.set(px + 0.5, 120, pz + 0.5);
    this._primeAround();
    const y = this.world.highestY(px, pz);
    this.player.pos.set(px + 0.5, y + 1, pz + 0.5);
    this.player.vel.set(0, 0, 0);
    this.portalCooldown = 2;
    this.ui.toast(toDim === DIM.NETHER ? 'Entering the Nether' : toDim === DIM.END ? 'Entering the End' : 'Returning to the Overworld');
  }

  // ---- day / night ----
  _updateSky(dt) {
    if (this.dim === DIM.OVERWORLD) this.gameTime = (this.gameTime + dt) % DAY_LENGTH_SECONDS;
    const dayT = this.gameTime / DAY_LENGTH_SECONDS;
    const elev = Math.sin(dayT * Math.PI * 2 - Math.PI / 2);
    const ang = dayT * Math.PI * 2 - Math.PI / 2;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.85, elev, 0.35).normalize();
    let dayLight = smoothstep(-0.08, 0.22, elev);

    // palettes
    const dayTop = new THREE.Color(0x2a6bd6), dayMid = new THREE.Color(0x83b6f2), dayBot = new THREE.Color(0xc6e0f5);
    const nightTop = new THREE.Color(0x05060f), nightMid = new THREE.Color(0x0a1330), nightBot = new THREE.Color(0x16203f);
    const duskTop = new THREE.Color(0x33305e), duskMid = new THREE.Color(0xb5683f), duskBot = new THREE.Color(0xe89a55);
    const sunDay = new THREE.Color(0xfff2cc), sunDusk = new THREE.Color(0xff9a3c);

    const horizon = clamp(1 - Math.abs(elev) / 0.32, 0, 1); // strong near sunrise/sunset
    const top = nightTop.clone().lerp(dayTop, dayLight).lerp(duskTop, horizon * 0.6);
    const mid = nightMid.clone().lerp(dayMid, dayLight).lerp(duskMid, horizon * 0.8);
    const bot = nightBot.clone().lerp(dayBot, dayLight).lerp(duskBot, horizon);
    const sunCol = sunDusk.clone().lerp(sunDay, dayLight);

    if (this.dim === DIM.NETHER) { top.set(0x310d0d); mid.set(0x521414); bot.set(0x6e1d18); dayLight = 0.55; sunDir.set(0, 1, 0); }
    if (this.dim === DIM.END) { top.set(0x07060f); mid.set(0x140d22); bot.set(0x1d1430); dayLight = 0.5; sunDir.set(0.3, 0.7, 0.2).normalize(); }

    this.sky.setColors(top, mid, bot, sunCol);
    this.sky.update(this.camera, sunDir, dayLight);

    this.uniforms.uDayLight.value = Math.max(dayLight, this.dim === DIM.OVERWORLD ? 0.05 : 0.5);
    this.uniforms.uSunDir.value.copy(sunDir);
    this.uniforms.uTime.value = this.time;
    this.uniforms.uAmbient.value = this.dim === DIM.NETHER ? 0.18 : (this.dim === DIM.END ? 0.16 : 0.05 + dayLight * 0.05);
    this.uniforms.uCamPos.value.copy(this.camera.position);

    // fog
    const fog = mid.clone();
    this.uniforms.uFogColor.value.copy(fog);
    const rd = RENDER_DISTANCE.value * 16;
    this.uniforms.uFogNear.value = this.settings.fog ? rd * 0.55 : 100000;
    this.uniforms.uFogFar.value = this.settings.fog ? rd * 0.95 : 100001;

    // god rays sun position in screen space
    const gr = this.fx.godrays.uniforms;
    if (this.settings.godrays && elev > -0.05 && this.dim !== DIM.END) {
      const sp = this.camera.position.clone().add(sunDir.clone().multiplyScalar(600));
      const ndc = sp.project(this.camera);
      const front = ndc.z < 1;
      gr.uSun.value.set((ndc.x + 1) / 2, (1 - ndc.y) / 2);
      const onScreen = ndc.x > -1.3 && ndc.x < 1.3 && ndc.y > -1.3 && ndc.y < 1.3;
      gr.uVisible.value = (front && onScreen) ? clamp(dayLight + horizon * 0.5, 0, 1) : 0;
      gr.uColor.value.copy(sunCol);
    } else gr.uVisible.value = 0;

    this.uniforms.uUnderwater.value = this.player && this.player.headInWater ? 1 : 0;
  }

  // ---- per-frame input (when playing) ----
  _handlePlayInput() {
    const inp = this.input;
    if (inp.pressed('Escape')) {
      if (this.ui.open) this.ui.closeScreen();
      else if (this.paused) this.resume();
      else this.pause();
    }
    if (this.paused) return;
    if (inp.pressed('KeyE')) { if (this.ui.open) this.ui.closeScreen(); else this.ui.openInventory(); }
    if (inp.pressed('F3')) this.ui.toggleDebug();
    if (this.ui.open) return;
    for (let i = 1; i <= 9; i++) if (inp.pressed('Digit' + i)) this.inventory.select(i - 1);
    const w = inp.takeWheel(); if (w) this.inventory.scroll(w);
    if (inp.pressed('KeyQ')) {
      const h = this.inventory.held();
      if (h) { const o = this.player.eyePos(); const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.player.pitch, this.player.yaw, 0, 'YXZ')); this.spawnDrop(o.x + dir.x, o.y, o.z + dir.z, h.id, 1); this.inventory.consumeHeld(1); }
    }
    if (inp.pressed('KeyG') && this.player.mode === 'creative') {
      // quick dimension cycle for testing/fun in creative
      const order = [DIM.OVERWORLD, DIM.NETHER, DIM.END];
      this.travel(order[(order.indexOf(this.dim) + 1) % 3]);
    }
  }

  _tickFurnaces(dt) {
    for (const k in this.containers) {
      const f = this.containers[k];
      if (f.type !== 'furnace') continue;
      const result = f.input ? smeltResult(f.input.id) : null;
      const canCook = result != null && (!f.output || (f.output.id === result && f.output.count < 64));
      if (f.burn > 0) f.burn -= dt;
      if (f.burn <= 0 && canCook && f.fuel) {
        const ft = fuelTime(f.fuel.id);
        if (ft > 0) { f.burn = ft; f.burnMax = ft; f.fuel.count--; if (f.fuel.count <= 0) { const empties = f.fuel.id === ITEM.LAVA_BUCKET ? ITEM.BUCKET : null; f.fuel = empties ? { id: empties, count: 1 } : null; } }
      }
      if (f.burn > 0 && canCook) {
        f.cook += dt;
        if (f.cook >= f.cookMax) {
          f.cook = 0;
          if (!f.output) f.output = { id: result, count: 1 }; else f.output.count++;
          f.input.count--; if (f.input.count <= 0) f.input = null;
        }
      } else f.cook = Math.max(0, f.cook - dt);
      // lit block state
      if (f.pos) {
        const [x, y, z] = f.pos;
        const cur = this.world.getBlock(x, y, z);
        if (f.burn > 0 && cur === BLOCK.FURNACE) this.world.setBlock(x, y, z, BLOCK.FURNACE_LIT);
        else if (f.burn <= 0 && cur === BLOCK.FURNACE_LIT) this.world.setBlock(x, y, z, BLOCK.FURNACE);
      }
    }
  }

  _checkPortals(dt) {
    if (this.portalCooldown > 0) { this.portalCooldown -= dt; return; }
    const feet = this.world.getBlock(Math.floor(this.player.pos.x), Math.floor(this.player.pos.y + 0.9), Math.floor(this.player.pos.z));
    if (feet === BLOCK.NETHER_PORTAL) {
      this.portalTimer += dt;
      if (this.portalTimer > 1.2) { this.portalTimer = 0; this.travel(this.dim === DIM.NETHER ? DIM.OVERWORLD : DIM.NETHER); }
    } else if (feet === BLOCK.END_PORTAL) {
      this.travel(this.dim === DIM.END ? DIM.OVERWORLD : DIM.END);
    } else this.portalTimer = 0;
  }

  // ---- main loop ----
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.time += dt;

    if (this.playing) {
      this._handlePlayInput();
      if (!this.paused && !this.ui.open) {
        this.player.update(dt, this.input);
        updateSurvival(this.player, dt);
        this.world.update(this.player.pos.x, this.player.pos.z, { gen: 2, mesh: 2 });
        this.mobs.update(dt, this.player, this.uniforms.uDayLight.value);
        this._tickFurnaces(dt);
        this._checkPortals(dt);
        // selection box
        const t = this.player.target;
        if (t) { this.selBox.visible = true; this.selBox.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5); }
        else this.selBox.visible = false;
        // step sound
        if (this.player.onGround && (Math.abs(this.player.vel.x) + Math.abs(this.player.vel.z)) > 1.5) this.audio.tick('step');
        // view model (arm + held item)
        if ((this.input.mouseLeft && this.player.target) || this.input.mouseRight) this.viewmodel.triggerSwing();
        const held = this.inventory.held();
        const vlight = this.world.lightLevelAt(Math.floor(this.player.pos.x), Math.floor(this.player.pos.y + 1), Math.floor(this.player.pos.z), this.uniforms.uDayLight.value);
        this.viewmodel.update(dt, this.player, held ? held.id : -1, vlight, this.time);
        this.viewmodel.root.visible = true;
      } else {
        this.world && this.world.update(this.player.pos.x, this.player.pos.z, { gen: 1, mesh: 2 });
        this.viewmodel.root.visible = false;
      }
      this.particles.update(dt);
    } else {
      this.viewmodel.root.visible = false;
      // menu backdrop: slowly orbit
      this.camera.position.set(Math.cos(this.time * 0.1) * 4, 80, Math.sin(this.time * 0.1) * 4);
      this.camera.lookAt(0, 82, -10);
    }

    this._updateSky(dt);
    if (this.playing) this.ui.update();
    this._updateDebug();
    this.input.endFrame();

    this.fx.render();
  }

  _updateDebug() {
    if (!this.el_debugOn && !this.ui.el.debug.classList.contains('show')) return;
    if (!this.playing) return;
    const p = this.player;
    const dimName = ['Overworld', 'Nether', 'End'][this.dim];
    const biome = this.dim === DIM.OVERWORLD ? this.gen.biomeAt(Math.floor(p.pos.x), Math.floor(p.pos.z)).name : dimName;
    const facing = ['South (+Z)', 'West (-X)', 'North (-Z)', 'East (+X)'][Math.round(((this.player.yaw % (Math.PI * 2)) / (Math.PI / 2)) + 4) % 4];
    this.ui.setDebug([
      `VOXELCRAFT  ${(1 / Math.max(0.0001, this.clock.oldDelta || 0.016)).toFixed(0)} fps`,
      `XYZ ${p.pos.x.toFixed(1)} / ${p.pos.y.toFixed(1)} / ${p.pos.z.toFixed(1)}`,
      `Dim ${dimName}  Biome ${biome}`,
      `Facing ${facing}  Light ${(this.uniforms.uDayLight.value).toFixed(2)}`,
      `Mobs ${this.mobs.mobs.length}  Items ${this.mobs.items.length}  Chunks ${this.world.chunks.size}`,
      `Mode ${p.mode}${p.flying ? ' (flying)' : ''}  HP ${p.health.toFixed(0)} Hunger ${p.hunger}`,
    ]);
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.fx.setSize(window.innerWidth, window.innerHeight);
  }

  _bindGlobalInput() {
    this.renderer.domElement.addEventListener('mousedown', () => {
      this.audio.init();
      if (this.playing && !this.paused && !this.ui.open && !this.input.locked) this.input.requestLock();
    });
    this.input.onLockChange = (locked) => {
      if (!locked && this.playing && !this.paused && !this.ui.open) {
        // auto-pause when focus lost
        this.pause();
      }
    };
  }
}

function bootGame() { window.GAME = new Game(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGame);
else bootGame();
