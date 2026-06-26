// ============================================================================
//  UI: HUD, hotbar, inventory/crafting/furnace/chest screens, menus, settings
// ============================================================================
import { itemDef, itemName, maxStack } from './items.js';
import { getBlock } from './blocks.js';
import { craftResult, smeltResult, fuelTime } from './crafting.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.atlas = game.atlasCanvas;
    this.uvs = game.uvs;
    this.iconCache = new Map();
    this.open = null;       // null | 'inventory' | 'table' | 'furnace' | 'chest'
    this.menu = 'main';     // 'main' | null | 'pause' | 'death'
    this.craftGrid = [];    // current crafting grid (array of {id,count}|null)
    this.craftSize = 2;
    this.activeFurnace = null;
    this.activeChest = null;
    this._build();
  }

  // ---- icons ----
  iconURL(item) {
    if (this.iconCache.has(item)) return this.iconCache.get(item);
    const d = itemDef(item);
    let name = d && d.icon;
    if (!name && d && d.isBlock) name = getBlock(d.blockId).tex?.pz;
    const uv = name && this.uvs.get(name);
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    if (uv) {
      const tx = uv[0] * this.atlas.width, ty = uv[1] * this.atlas.height;
      const tw = (uv[2] - uv[0]) * this.atlas.width, th = (uv[3] - uv[1]) * this.atlas.height;
      ctx.drawImage(this.atlas, tx, ty, tw, th, 0, 0, 32, 32);
    } else { ctx.fillStyle = '#c0c'; ctx.fillRect(0, 0, 32, 32); }
    const url = c.toDataURL();
    this.iconCache.set(item, url);
    return url;
  }

  _build() {
    const root = document.createElement('div');
    root.id = 'ui-root';
    root.innerHTML = `
      <div id="crosshair"><div id="breakbar"></div></div>
      <div id="hud">
        <div id="stats">
          <div id="armorrow" class="pip-row"></div>
          <div id="healthrow" class="pip-row"></div>
          <div id="airrow" class="pip-row"></div>
        </div>
        <div id="hungerrow" class="pip-row"></div>
        <div id="xpbar"><div id="xpfill"></div><span id="xplevel"></span></div>
        <div id="hotbar"></div>
      </div>
      <div id="toast"></div>
      <div id="debug"></div>
      <div id="screen" class="hidden"></div>
      <div id="cursoritem" class="hidden"></div>
      <div id="menu" class="hidden"></div>
    `;
    document.body.appendChild(root);
    this.el = {
      crosshair: root.querySelector('#crosshair'),
      breakbar: root.querySelector('#breakbar'),
      health: root.querySelector('#healthrow'),
      hunger: root.querySelector('#hungerrow'),
      armor: root.querySelector('#armorrow'),
      air: root.querySelector('#airrow'),
      xpfill: root.querySelector('#xpfill'),
      xplevel: root.querySelector('#xplevel'),
      hotbar: root.querySelector('#hotbar'),
      toast: root.querySelector('#toast'),
      debug: root.querySelector('#debug'),
      screen: root.querySelector('#screen'),
      cursor: root.querySelector('#cursoritem'),
      menu: root.querySelector('#menu'),
    };
    // hotbar slots
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('div');
      s.className = 'hslot'; s.dataset.i = i;
      s.addEventListener('mousedown', () => { if (!this.open) { this.game.inventory.select(i); this.game.audio.play('click'); } });
      this.el.hotbar.appendChild(s);
    }
    document.addEventListener('mousemove', (e) => { this._cx = e.clientX; this._cy = e.clientY; this._moveCursor(); });
    this.showMenu('main');
  }

  // ---- HUD update ----
  update() {
    const p = this.game.player;
    // hotbar
    const inv = this.game.inventory;
    [...this.el.hotbar.children].forEach((s, i) => {
      s.classList.toggle('sel', i === inv.selected);
      this._renderSlot(s, inv.slots[i]);
    });
    // hearts
    this._renderPips(this.el.health, 10, p.health / 2, '❤', 'heart');
    this._renderPips(this.el.hunger, 10, p.hunger / 2, '🍗', 'hunger');
    const armor = inv.armorValue();
    this._renderPips(this.el.armor, Math.ceil(armor / 2), armor / 2, '🛡', 'armor');
    // air (only when underwater)
    if (p.headInWater && p.air < p.maxAir) {
      const bub = Math.ceil(p.air / p.maxAir * 10);
      this.el.air.style.display = '';
      this.el.air.innerHTML = '';
      for (let i = 0; i < bub; i++) { const b = document.createElement('span'); b.className = 'pip air'; b.textContent = '💧'; this.el.air.appendChild(b); }
    } else this.el.air.style.display = 'none';
    // xp
    this.el.xpfill.style.width = (this.game.xpProgress() * 100) + '%';
    this.el.xplevel.textContent = p.xpLevel > 0 ? p.xpLevel : '';
    // break bar
    if (p.breakTarget && p.breakProgress > 0) { this.el.breakbar.style.opacity = 1; this.el.breakbar.style.width = (p.breakProgress * 24) + 'px'; }
    else this.el.breakbar.style.opacity = 0;
    // creative hides survival bars
    const cre = p.mode === 'creative';
    this.el.health.style.visibility = cre ? 'hidden' : 'visible';
    this.el.hunger.style.visibility = cre ? 'hidden' : 'visible';
    this.el.armor.style.visibility = cre ? 'hidden' : 'visible';
    this.el.xpfill.parentElement.style.visibility = cre ? 'hidden' : 'visible';
  }

  _renderPips(row, count, value, char, cls) {
    if (row._n !== count || row._v !== value) {
      row.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const span = document.createElement('span'); span.className = 'pip ' + cls;
        span.textContent = char;
        const filled = value - i;
        span.style.opacity = filled >= 1 ? 1 : filled >= 0.5 ? 0.6 : 0.18;
        row.appendChild(span);
      }
      row._n = count; row._v = value;
    }
  }

  _renderSlot(el, slot) {
    if (!slot) { el.style.backgroundImage = ''; el.textContent = ''; el.classList.remove('has'); return; }
    el.classList.add('has');
    el.textContent = '';
    el.style.backgroundImage = `url(${this.iconURL(slot.id)})`;
    el.textContent = '';
    if (slot.count > 1) { const c = document.createElement('span'); c.className = 'cnt'; c.textContent = slot.count; el.appendChild(c); }
    const d = itemDef(slot.id);
    if (d && d.durability && slot.dmg) {
      const bar = document.createElement('div'); bar.className = 'dura';
      const frac = 1 - slot.dmg / d.durability;
      bar.style.width = (frac * 100) + '%';
      bar.style.background = `hsl(${frac * 120},100%,50%)`;
      el.appendChild(bar);
    }
  }

  toast(text) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.el.toast.classList.remove('show'), 1600);
  }

  setDebug(lines) { this.el.debug.innerHTML = lines.join('<br>'); }
  toggleDebug() { this.el.debug.classList.toggle('show'); }

  // ---- cursor item ----
  _moveCursor() {
    const cur = this.game.inventory.cursor;
    if (cur && this.open) {
      this.el.cursor.classList.remove('hidden');
      this.el.cursor.style.left = this._cx + 'px';
      this.el.cursor.style.top = this._cy + 'px';
      this.el.cursor.style.backgroundImage = `url(${this.iconURL(cur.id)})`;
      this.el.cursor.textContent = cur.count > 1 ? cur.count : '';
    } else this.el.cursor.classList.add('hidden');
  }

  // ---- generic slot click model ----
  _clickSlot(get, set, button, isOutput, onCraft) {
    const inv = this.game.inventory;
    let cur = inv.cursor;
    let slot = get();
    if (isOutput) {
      if (!slot) return;
      if (!cur) { inv.cursor = { id: slot.id, count: slot.count }; onCraft && onCraft(slot.count); }
      else if (cur.id === slot.id && cur.count + slot.count <= maxStack(slot.id)) { cur.count += slot.count; onCraft && onCraft(slot.count); }
      this._refresh(); return;
    }
    if (button === 2) {
      if (cur) {
        if (!slot) { set({ id: cur.id, count: 1 }); cur.count--; }
        else if (slot.id === cur.id && slot.count < maxStack(slot.id)) { slot.count++; cur.count--; set(slot); }
        else { /* swap */ inv.cursor = slot; set(cur); }
        if (cur && cur.count <= 0) inv.cursor = null;
      } else if (slot) {
        const half = Math.ceil(slot.count / 2);
        inv.cursor = { id: slot.id, count: half };
        slot.count -= half; set(slot.count > 0 ? slot : null);
      }
    } else {
      if (!cur && slot) { inv.cursor = slot; set(null); }
      else if (cur && !slot) { set(cur); inv.cursor = null; }
      else if (cur && slot) {
        if (slot.id === cur.id) {
          const max = maxStack(slot.id); const move = Math.min(cur.count, max - slot.count);
          slot.count += move; cur.count -= move; set(slot);
          if (cur.count <= 0) inv.cursor = null;
        } else { inv.cursor = slot; set(cur); }
      }
    }
    this._refresh();
  }

  _refresh() {
    if (this.open) this._renderScreen();
    this._moveCursor();
    this.update();
  }

  // ---- screens ----
  openInventory() { this.craftSize = 2; this.craftGrid = new Array(4).fill(null); this._show('inventory'); }
  openCrafting() { this.craftSize = 3; this.craftGrid = new Array(9).fill(null); this._show('table'); }
  openFurnace(furnace) { this.activeFurnace = furnace; this._show('furnace'); }
  openChest(chest) { this.activeChest = chest; this._show('chest'); }

  _show(type) {
    this.open = type;
    this.el.screen.classList.remove('hidden');
    this.game.onUIOpen(true);
    this._renderScreen();
  }

  closeScreen() {
    if (!this.open) return;
    // return crafting grid items to inventory
    for (let i = 0; i < this.craftGrid.length; i++) { const s = this.craftGrid[i]; if (s) { this.game.inventory.addItem(s.id, s.count); this.craftGrid[i] = null; } }
    if (this.game.inventory.cursor) { this.game.inventory.addItem(this.game.inventory.cursor.id, this.game.inventory.cursor.count); this.game.inventory.cursor = null; }
    this.open = null; this.activeFurnace = null; this.activeChest = null;
    this.el.screen.classList.add('hidden');
    this.el.cursor.classList.add('hidden');
    this.game.onUIOpen(false);
    this.update();
  }

  _slotEl(get, set, opts = {}) {
    const el = document.createElement('div');
    el.className = 'islot' + (opts.cls ? ' ' + opts.cls : '');
    this._renderSlot(el, get());
    el.addEventListener('mousedown', (e) => { e.preventDefault(); this._clickSlot(get, set, e.button, opts.output, opts.onCraft); });
    return el;
  }

  _invArr(idxBase, count) {
    const inv = this.game.inventory;
    const frag = document.createElement('div'); frag.className = 'grid';
    frag.style.gridTemplateColumns = `repeat(9, 1fr)`;
    for (let i = 0; i < count; i++) {
      const idx = idxBase + i;
      frag.appendChild(this._slotEl(() => inv.slots[idx], (v) => inv.slots[idx] = v));
    }
    return frag;
  }

  _craftGridEl() {
    const wrap = document.createElement('div'); wrap.className = 'craftwrap';
    const grid = document.createElement('div'); grid.className = 'grid craftgrid';
    grid.style.gridTemplateColumns = `repeat(${this.craftSize}, 1fr)`;
    for (let i = 0; i < this.craftSize * this.craftSize; i++) {
      grid.appendChild(this._slotEl(() => this.craftGrid[i], (v) => { this.craftGrid[i] = v; }));
    }
    const arrow = document.createElement('div'); arrow.className = 'arrow'; arrow.textContent = '➜';
    const res = craftResult(this.craftGrid, this.craftSize);
    const out = this._slotEl(() => res ? { id: res.id, count: res.count } : null, () => {}, {
      output: true, cls: 'output',
      onCraft: () => { for (let i = 0; i < this.craftGrid.length; i++) { const s = this.craftGrid[i]; if (s) { s.count--; if (s.count <= 0) this.craftGrid[i] = null; } } this.game.audio.play('click'); }
    });
    wrap.appendChild(grid); wrap.appendChild(arrow); wrap.appendChild(out);
    return wrap;
  }

  _renderScreen() {
    const s = this.el.screen;
    s.innerHTML = '';
    const panel = document.createElement('div'); panel.className = 'panel';
    const title = document.createElement('h2');
    if (this.open === 'inventory') {
      title.textContent = 'Inventory';
      panel.appendChild(title);
      panel.appendChild(this._craftGridEl());
      const main = document.createElement('div'); main.className = 'maingrid';
      main.appendChild(this._invArr(9, 27));
      panel.appendChild(main);
      const hb = document.createElement('div'); hb.className = 'hotgrid';
      hb.appendChild(this._invArr(0, 9));
      panel.appendChild(hb);
    } else if (this.open === 'table') {
      title.textContent = 'Crafting Table'; panel.appendChild(title);
      panel.appendChild(this._craftGridEl());
      const main = document.createElement('div'); main.className = 'maingrid'; main.appendChild(this._invArr(9, 27)); panel.appendChild(main);
      const hb = document.createElement('div'); hb.className = 'hotgrid'; hb.appendChild(this._invArr(0, 9)); panel.appendChild(hb);
    } else if (this.open === 'furnace') {
      title.textContent = 'Furnace'; panel.appendChild(title);
      panel.appendChild(this._furnaceEl());
      const main = document.createElement('div'); main.className = 'maingrid'; main.appendChild(this._invArr(9, 27)); panel.appendChild(main);
      const hb = document.createElement('div'); hb.className = 'hotgrid'; hb.appendChild(this._invArr(0, 9)); panel.appendChild(hb);
    } else if (this.open === 'chest') {
      title.textContent = 'Chest'; panel.appendChild(title);
      const cgrid = document.createElement('div'); cgrid.className = 'grid'; cgrid.style.gridTemplateColumns = 'repeat(9,1fr)';
      const ch = this.activeChest;
      for (let i = 0; i < 27; i++) cgrid.appendChild(this._slotEl(() => ch.items[i], (v) => ch.items[i] = v));
      panel.appendChild(cgrid);
      const main = document.createElement('div'); main.className = 'maingrid'; main.appendChild(this._invArr(9, 27)); panel.appendChild(main);
      const hb = document.createElement('div'); hb.className = 'hotgrid'; hb.appendChild(this._invArr(0, 9)); panel.appendChild(hb);
    }
    s.appendChild(panel);
  }

  _furnaceEl() {
    const f = this.activeFurnace;
    const wrap = document.createElement('div'); wrap.className = 'furnacewrap';
    const col = document.createElement('div'); col.className = 'fcol';
    col.appendChild(this._slotEl(() => f.input, (v) => f.input = v));
    const flame = document.createElement('div'); flame.className = 'flame'; flame.style.opacity = f.burn > 0 ? 1 : 0.2; flame.textContent = '🔥';
    col.appendChild(flame);
    col.appendChild(this._slotEl(() => f.fuel, (v) => f.fuel = v));
    const arrow = document.createElement('div'); arrow.className = 'arrow'; arrow.textContent = '➜';
    const prog = document.createElement('div'); prog.className = 'cookprog'; prog.style.width = (f.cookMax ? (f.cook / f.cookMax * 40) : 0) + 'px';
    arrow.appendChild(prog);
    const out = this._slotEl(() => f.output, () => { if (f.output) { this.game.inventory.cursor = this.game.inventory.cursor && this.game.inventory.cursor.id === f.output.id ? { id: f.output.id, count: this.game.inventory.cursor.count + f.output.count } : { id: f.output.id, count: f.output.count }; f.output = null; this._refresh(); } }, { cls: 'output' });
    wrap.appendChild(col); wrap.appendChild(arrow); wrap.appendChild(out);
    return wrap;
  }

  // ---- menus ----
  showMenu(which) {
    this.menu = which;
    if (!which) { this.el.menu.classList.add('hidden'); return; }
    this.el.menu.classList.remove('hidden');
    const m = this.el.menu;
    if (which === 'main') {
      m.innerHTML = `
        <div class="menucard">
          <h1>VOXELCRAFT</h1>
          <p class="sub">a Minecraft-inspired survival sandbox</p>
          <label>World Seed <input id="seedinput" placeholder="(random)"></label>
          <div class="modes">
            <label><input type="radio" name="mode" value="survival" checked> Survival</label>
            <label><input type="radio" name="mode" value="creative"> Creative</label>
          </div>
          <button id="btn-new">Create New World</button>
          <button id="btn-load" ${this.game.canLoad() ? '' : 'disabled'}>Continue Saved World</button>
          <button id="btn-settings2">Settings</button>
          <div class="hint">WASD move · Space jump · Shift sneak · Ctrl sprint · E inventory · F3 debug · double-Space fly (creative)</div>
        </div>`;
      m.querySelector('#btn-new').onclick = () => {
        const seed = m.querySelector('#seedinput').value.trim() || ('' + Math.floor(Math.random() * 1e9));
        const mode = m.querySelector('input[name=mode]:checked').value;
        this.game.startNewWorld(seed, mode);
      };
      m.querySelector('#btn-load').onclick = () => this.game.loadSavedWorld();
      m.querySelector('#btn-settings2').onclick = () => this.showMenu('settings');
    } else if (which === 'pause') {
      m.innerHTML = `<div class="menucard"><h1>Paused</h1>
        <button id="btn-resume">Resume</button>
        <button id="btn-settings">Settings</button>
        <button id="btn-save">Save</button>
        <button id="btn-quit">Save & Quit to Menu</button></div>`;
      m.querySelector('#btn-resume').onclick = () => this.game.resume();
      m.querySelector('#btn-settings').onclick = () => this.showMenu('settings');
      m.querySelector('#btn-save').onclick = () => { this.game.save(); this.toast('Game saved'); };
      m.querySelector('#btn-quit').onclick = () => { this.game.save(); this.game.quitToMenu(); };
    } else if (which === 'death') {
      m.innerHTML = `<div class="menucard"><h1 style="color:#c33">You Died!</h1>
        <button id="btn-respawn">Respawn</button>
        <button id="btn-title">Title Screen</button></div>`;
      m.querySelector('#btn-respawn').onclick = () => this.game.respawn();
      m.querySelector('#btn-title').onclick = () => this.game.quitToMenu();
    } else if (which === 'settings') {
      const st = this.game.settings;
      m.innerHTML = `<div class="menucard"><h1>Settings</h1>
        <label>Render Distance: <span id="rdv">${st.renderDistance}</span><input id="rd" type="range" min="3" max="12" value="${st.renderDistance}"></label>
        <label>Mouse Sensitivity: <span id="snv">${st.sensitivity.toFixed(2)}</span><input id="sn" type="range" min="0.3" max="2.5" step="0.05" value="${st.sensitivity}"></label>
        <label>FOV: <span id="fovv">${st.fov}</span><input id="fov" type="range" min="60" max="110" value="${st.fov}"></label>
        <label class="chk"><input id="god" type="checkbox" ${st.godrays ? 'checked' : ''}> God Rays</label>
        <label class="chk"><input id="bloom" type="checkbox" ${st.bloom ? 'checked' : ''}> Bloom</label>
        <label class="chk"><input id="fog" type="checkbox" ${st.fog ? 'checked' : ''}> Fog</label>
        <label class="chk"><input id="vsync" type="checkbox" ${st.shadows ? 'checked' : ''}> Enhanced Shading</label>
        <button id="btn-back">Back</button></div>`;
      const bind = (id, vid, fn, fix) => { const e = m.querySelector('#' + id); e.oninput = () => { const v = parseFloat(e.value); if (vid) m.querySelector('#' + vid).textContent = fix ? v.toFixed(fix) : v; fn(v); }; };
      bind('rd', 'rdv', v => this.game.setRenderDistance(v));
      bind('sn', 'snv', v => st.sensitivity = v, 2);
      bind('fov', 'fovv', v => this.game.setFOV(v));
      m.querySelector('#god').onchange = e => { st.godrays = e.target.checked; this.game.applyFX(); };
      m.querySelector('#bloom').onchange = e => { st.bloom = e.target.checked; this.game.applyFX(); };
      m.querySelector('#fog').onchange = e => { st.fog = e.target.checked; this.game.applyFX(); };
      m.querySelector('#vsync').onchange = e => { st.shadows = e.target.checked; };
      m.querySelector('#btn-back').onclick = () => this.showMenu(this.game.playing ? 'pause' : 'main');
    }
  }
}
