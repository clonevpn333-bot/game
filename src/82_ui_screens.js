/* =========================================================================
 * SCREENS — inventory, crafting, furnace, chest, enchanting, brewing, anvil,
 * smithing, stonecutter, grindstone, trading, creative and the menus.
 * ========================================================================= */

function showScreen(game, name, data) {
  if (UI.screen === name && name !== 'chest') return;
  UI.screen = name;
  UI.container = data || UI.container;
  UI.slots = [];
  var s = UI.els.screen;
  clearEl(s);
  s.classList.remove('hidden');
  document.exitPointerLock && document.pointerLockElement && document.exitPointerLock();
  var box = el('div', 'gui', s);
  var builder = SCREEN_BUILDERS[name];
  if (builder) builder(game, box);
  refreshSlots();
  updateCursorItem(game);
  UI.dirty = true;
}
function hideScreen(game) {
  if (!UI.screen) return;
  /* anything left in the crafting grid or on the cursor falls back to you */
  var p = game.player;
  if (p.cursor) { giveItem(game, p.cursor.item, p.cursor.count); p.cursor = null; }
  if (UI.screen === 'inventory' || UI.screen === 'crafting') returnCraftGrid(game);
  if (UI.screen === 'anvil') { returnStack(game, UI.anvilA); returnStack(game, UI.anvilB); UI.anvilA = UI.anvilB = null; }
  if (UI.screen === 'smithing') { returnStack(game, UI.smithA); returnStack(game, UI.smithB); returnStack(game, UI.smithC); UI.smithA = UI.smithB = UI.smithC = null; }
  if (UI.screen === 'grindstone') { returnStack(game, UI.grindA); returnStack(game, UI.grindB); UI.grindA = UI.grindB = null; }
  if (UI.screen === 'enchanting') { returnStack(game, UI.enchItem); returnStack(game, UI.enchLapis); UI.enchItem = UI.enchLapis = null; }
  if (UI.screen === 'stonecutter') { returnStack(game, UI.cutInput); UI.cutInput = null; }
  if (UI.screen === 'trade') { returnStack(game, UI.tradeA); returnStack(game, UI.tradeB); UI.tradeA = UI.tradeB = null; }
  UI.screen = null;
  UI.slots = [];
  UI.container = null;
  clearEl(UI.els.screen);
  UI.els.screen.classList.add('hidden');
  showTooltip(null);
  updateCursorItem(game);
  UI.dirty = true;
  game.requestPointerLock();
}
function returnStack(game, s) { if (s) giveItem(game, s.item, s.count); }
function returnCraftGrid(game) {
  for (var i = 0; i < 9; i++) if (UI.craft[i]) { giveItem(game, UI.craft[i].item, UI.craft[i].count); UI.craft[i] = null; }
  UI.craftOut = null;
}
function refreshScreen(game) {
  if (!UI.screen) return;
  var r = SCREEN_REFRESH[UI.screen];
  if (r) r(game);
  refreshSlots();
  updateCursorItem(game);
  if (UI.hoverSlot >= 0 && UI.slots[UI.hoverSlot]) showTooltip(UI.slots[UI.hoverSlot].get());
}

/* -------------------------------------------------- shared sub-panels -- */
function addPlayerInventory(game, parent, label) {
  var p = game.player;
  var wrap = el('div', 'invsection', parent);
  if (label !== false) el('div', 'guilabel', wrap, 'Inventory');
  var main = [];
  for (var i = 9; i < INV_SIZE; i++) main.push(invSlot(p, i));
  buildSlotGrid(game, wrap, main, 9, 'mainpack');
  var hot = [];
  for (var j = 0; j < 9; j++) hot.push(invSlot(p, j));
  buildSlotGrid(game, wrap, hot, 9, 'hotpack');
}
function guiTitle(parent, text) { el('div', 'guititle', parent, text); }
function arrowEl(parent, cls) { return el('div', 'arrow ' + (cls || ''), parent); }

/* ============================= INVENTORY ================================ */
var SCREEN_BUILDERS = {};
var SCREEN_REFRESH = {};

SCREEN_BUILDERS.inventory = function (game, box) {
  var p = game.player;
  guiTitle(box, 'Crafting');
  var top = el('div', 'invtop', box);

  var left = el('div', 'invleft', top);
  var armorCol = el('div', 'armorcol', left);
  var arm = [];
  for (var i = 0; i < 4; i++) arm.push(armorSlot(p, i));
  buildSlotGrid(game, armorCol, arm, 1, 'armorgrid');
  var doll = el('div', 'playerdoll', left);
  UI.els.doll = doll;
  buildSlotGrid(game, armorCol, [offhandSlot(p)], 1, 'offgrid');

  var right = el('div', 'invright', top);
  UI.craftW = 2;
  var cs = [];
  for (var c = 0; c < 4; c++) cs.push(craftSlot(game, c));
  buildSlotGrid(game, right, cs, 2, 'craft2');
  arrowEl(right);
  buildSlotGrid(game, right, [craftOutSlot(game)], 1, 'craftout');

  addPlayerInventory(game, box, false);
  updateCraftOutput(game);
};
SCREEN_REFRESH.inventory = function (game) { updateCraftOutput(game); drawPlayerDoll(game); };

SCREEN_BUILDERS.crafting = function (game, box) {
  guiTitle(box, 'Crafting');
  UI.craftW = 3;
  var top = el('div', 'invtop', box);
  var cs = [];
  for (var c = 0; c < 9; c++) cs.push(craftSlot(game, c));
  buildSlotGrid(game, top, cs, 3, 'craft3');
  arrowEl(top);
  buildSlotGrid(game, top, [craftOutSlot(game)], 1, 'craftout');
  var book = el('div', 'recipebook', box);
  buildRecipeBook(game, book);
  addPlayerInventory(game, box);
  updateCraftOutput(game);
};
SCREEN_REFRESH.crafting = function (game) { updateCraftOutput(game); };

function craftSlot(game, i) {
  return {
    get: function () { return UI.craft[i]; },
    set: function (s) { UI.craft[i] = s; },
    onChange: function (g) { updateCraftOutput(g); },
    kind: 'craft', index: i
  };
}
function craftOutSlot(game) {
  return {
    get: function () { return UI.craftOut; },
    set: function () { },
    out: true, kind: 'craftout', index: 0,
    onTake: function (g, n) { consumeCraft(g); }
  };
}
function craftGridArray() {
  var w = UI.craftW;
  var g = [];
  if (w === 2) { g = [UI.craft[0], UI.craft[1], UI.craft[2], UI.craft[3]]; }
  else { for (var i = 0; i < 9; i++) g.push(UI.craft[i]); }
  return g.map(function (s) { return s ? s.item : null; });
}
function updateCraftOutput(game) {
  var w = UI.craftW;
  var names = craftGridArray();
  var rec = findRecipe(names, w, w);
  UI.craftRecipe = rec;
  UI.craftOut = rec ? makeStack(rec.out, rec.count) : null;
  refreshSlots();
}
function consumeCraft(game) {
  var w = UI.craftW;
  var n = w * w;
  for (var i = 0; i < n; i++) {
    var s = UI.craft[i];
    if (!s) continue;
    s.count--;
    /* buckets and bowls stay behind when the recipe uses them up */
    if (s.count <= 0) {
      var back = { water_bucket: 'bucket', lava_bucket: 'bucket', milk_bucket: 'bucket', honey_bottle: 'glass_bottle' }[s.item];
      UI.craft[i] = back ? makeStack(back, 1) : null;
    }
  }
  playSound(game, 'pop', undefined);
  updateCraftOutput(game);
}

/* recipe book: everything craftable from what you carry, one click to fill */
function buildRecipeBook(game, parent) {
  el('div', 'guilabel', parent, 'Craftable');
  var list = el('div', 'booklist', parent);
  var have = {};
  var p = game.player;
  for (var i = 0; i < INV_SIZE; i++) if (p.inv[i]) have[p.inv[i].item] = (have[p.inv[i].item] || 0) + p.inv[i].count;
  var shown = 0;
  for (var r = 0; r < RECIPES.length && shown < 120; r++) {
    var rec = RECIPES[r];
    if (!canCraftFrom(rec, have)) continue;
    shown++;
    var b = el('div', 'bookitem', list);
    var img = el('img', 'islot', b);
    img.src = itemIconURL(rec.out);
    b.title = ITEMS[rec.out].disp;
    (function (rr) {
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); fillRecipe(game, rr, ev.shiftKey); });
      b.addEventListener('mouseenter', function () { showTooltip(makeStack(rr.out, rr.count)); });
      b.addEventListener('mouseleave', function () { showTooltip(null); });
    })(rec);
  }
  if (!shown) el('div', 'tdim', list, 'Nothing craftable yet.');
}
function canCraftFrom(rec, have) {
  var need = {};
  var ings = rec.shaped ? [] : rec.ings.slice();
  if (rec.shaped) {
    for (var y = 0; y < rec.rows.length; y++) for (var x = 0; x < rec.rows[y].length; x++) {
      var ch = rec.rows[y].charAt(x);
      if (ch === ' ') continue;
      ings.push(rec.key[ch]);
    }
  }
  var used = {};
  for (var i = 0; i < ings.length; i++) {
    var ing = ings[i];
    var got = null;
    if (ing.charAt(0) === '#') {
      var list = TAGS[ing.substr(1)] || [];
      for (var j = 0; j < list.length; j++) if ((have[list[j]] || 0) - (used[list[j]] || 0) > 0) { got = list[j]; break; }
    } else if ((have[ing] || 0) - (used[ing] || 0) > 0) got = ing;
    if (!got) return false;
    used[got] = (used[got] || 0) + 1;
  }
  return true;
}
function fillRecipe(game, rec, all) {
  returnCraftGrid(game);
  var w = UI.craftW;
  var cells = [];
  if (rec.shaped) {
    var rw = rec.rows[0].length, rh = rec.rows.length;
    if (rw > w || rh > w) { logMessage(game, 'Needs a crafting table.', '#ff9955'); return; }
    for (var y = 0; y < rh; y++) for (var x = 0; x < rw; x++) {
      var ch = rec.rows[y].charAt(x);
      if (ch === ' ') continue;
      cells.push({ i: y * w + x, ing: rec.key[ch] });
    }
  } else {
    if (rec.ings.length > w * w) { logMessage(game, 'Needs a crafting table.', '#ff9955'); return; }
    for (var k = 0; k < rec.ings.length; k++) cells.push({ i: Math.floor(k / w) * w + (k % w), ing: rec.ings[k] });
  }
  for (var c = 0; c < cells.length; c++) {
    var want = cells[c].ing;
    var name = want.charAt(0) === '#' ? pickFromTag(game, want.substr(1)) : want;
    if (!name || !consumeItem(game, name, 1)) { returnCraftGrid(game); logMessage(game, 'Missing ingredients.', '#ff9955'); updateCraftOutput(game); return; }
    UI.craft[cells[c].i] = makeStack(name, 1);
  }
  updateCraftOutput(game);
  refreshScreen(game);
}
function pickFromTag(game, t) {
  var list = TAGS[t] || [];
  for (var i = 0; i < list.length; i++) if (countItem(game, list[i]) > 0) return list[i];
  return null;
}

/* =============================== CHEST ================================== */
SCREEN_BUILDERS.chest = function (game, box) {
  var be = UI.container;
  guiTitle(box, be && be.name ? be.name : 'Chest');
  var items = be.items;
  var slots = [];
  for (var i = 0; i < items.length; i++) slots.push(arraySlot(items, i));
  buildSlotGrid(game, box, slots, 9, 'chestgrid');
  addPlayerInventory(game, box);
};

/* ============================== FURNACE ================================= */
function furnaceScreen(title, kind) {
  return function (game, box) {
    var be = UI.container;
    guiTitle(box, title);
    var row = el('div', 'furnrow', box);
    var colA = el('div', 'furncol', row);
    buildSlotGrid(game, colA, [arraySlot(be.slots, 0, { onChange: function () { } })], 1, 'fslot');
    var flame = el('div', 'flame', colA); UI.els.flame = flame;
    buildSlotGrid(game, colA, [arraySlot(be.slots, 1, { accept: function (s) { return !s || (ITEMS[s.item] && ITEMS[s.item].fuel > 0); } })], 1, 'fslot');
    var mid = el('div', 'furnmid', row);
    var prog = el('div', 'progarrow', mid);
    UI.els.progfill = el('div', 'progfill', prog);
    var colB = el('div', 'furncol', row);
    buildSlotGrid(game, colB, [{
      get: function () { return be.slots[2]; },
      set: function (s) { be.slots[2] = s; },
      out: true, kind: 'furnout', index: 2,
      onTake: function (g, n) {
        be.slots[2] = null;
        if (be.xp) { addXP(g, Math.round(be.xp)); be.xp = 0; }
      }
    }], 1, 'fslot');
    addPlayerInventory(game, box);
  };
}
SCREEN_BUILDERS.furnace = furnaceScreen('Furnace', 'furnace');
SCREEN_BUILDERS.blast_furnace = furnaceScreen('Blast Furnace', 'blast_furnace');
SCREEN_BUILDERS.smoker = furnaceScreen('Smoker', 'smoker');
var furnRefresh = function (game) {
  var be = UI.container;
  if (!be) return;
  if (UI.els.progfill) UI.els.progfill.style.width = Math.round((be.progress / Math.max(0.001, be.total || 10)) * 100) + '%';
  if (UI.els.flame) UI.els.flame.style.setProperty('--fuel', Math.round((be.burn / Math.max(0.001, be.burnMax || 1)) * 100) + '%');
};
SCREEN_REFRESH.furnace = furnRefresh;
SCREEN_REFRESH.blast_furnace = furnRefresh;
SCREEN_REFRESH.smoker = furnRefresh;

/* ============================= ENCHANTING =============================== */
SCREEN_BUILDERS.enchanting = function (game, box) {
  guiTitle(box, 'Enchant');
  var row = el('div', 'enchrow', box);
  var left = el('div', 'enchleft', row);
  buildSlotGrid(game, left, [{
    get: function () { return UI.enchItem; },
    set: function (s) { UI.enchItem = s; rollOffers(game); },
    accept: function (s) { return !s || (ITEMS[s.item] && (ITEMS[s.item].enchantable || ITEMS[s.item].name === 'book')); },
    kind: 'ench', index: 0
  }, {
    get: function () { return UI.enchLapis; },
    set: function (s) { UI.enchLapis = s; },
    accept: function (s) { return !s || s.item === 'lapis_lazuli'; },
    kind: 'ench', index: 1, ghost: 'lapis'
  }], 1, 'enchslots');
  UI.els.enchList = el('div', 'enchlist', row);
  addPlayerInventory(game, box);
  rollOffers(game);
};
function shelvesAround(game) {
  var p = game.player, pos = UI.containerPos;
  if (!pos) return 0;
  var n = 0;
  for (var dx = -2; dx <= 2; dx++) for (var dz = -2; dz <= 2; dz++) for (var dy = 0; dy <= 1; dy++) {
    if (Math.abs(dx) < 2 && Math.abs(dz) < 2) continue;
    if (game.world.getId(p.dim, pos.x + dx, pos.y + dy, pos.z + dz) === BID.bookshelf) n++;
  }
  return Math.min(15, n);
}
function rollOffers(game) {
  if (!UI.enchItem) { UI.enchOffers = null; renderOffers(game); return; }
  if (!UI.enchSeed) UI.enchSeed = (Math.random() * 0xffffffff) >>> 0;
  UI.enchOffers = rollEnchantOffers(UI.enchItem.item, shelvesAround(game), UI.enchSeed ^ (UI.enchItem.item.length * 2654435761));
  renderOffers(game);
}
function renderOffers(game) {
  var host = UI.els.enchList;
  if (!host) return;
  clearEl(host);
  var p = game.player;
  if (!UI.enchOffers) { el('div', 'tdim', host, 'Place an item to enchant.'); return; }
  for (var i = 0; i < UI.enchOffers.length; i++) {
    (function (i) {
      var o = UI.enchOffers[i];
      var lapis = i + 1;
      var can = (p.level >= o.cost || p.creative) && (p.creative || (UI.enchLapis && UI.enchLapis.count >= lapis));
      var row = el('div', 'enchopt' + (can ? '' : ' disabled'), host);
      el('div', 'enchlvl', row, '' + lapis);
      var mid = el('div', 'enchtext', row);
      var names = o.ench.map(function (e) { return (ENCH_BY_ID[e.id] ? ENCH_BY_ID[e.id].disp : e.id) + ' ' + ROMAN[e.lvl]; });
      el('div', 'enchname', mid, names.join(', '));
      el('div', 'enchcost', mid, o.cost + ' levels · ' + lapis + ' lapis');
      row.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        if (!can) { playSound(game, 'click', undefined, undefined, undefined, 0.6); return; }
        if (!p.creative) {
          if (!spendLevels(game, o.cost)) return;
          UI.enchLapis.count -= lapis;
          if (UI.enchLapis.count <= 0) UI.enchLapis = null;
        }
        var st = UI.enchItem;
        st.ench = (st.ench || []).concat(o.ench);
        if (st.item === 'book') st.item = 'enchanted_book';
        UI.enchSeed = (Math.random() * 0xffffffff) >>> 0;
        playSound(game, 'levelup', p.x, p.y, p.z);
        for (var q = 0; q < 30; q++) spawnParticle(game, p.dim, p.x + (Math.random() - 0.5) * 2, p.y + 1 + Math.random(), p.z + (Math.random() - 0.5) * 2, 0, 1, 0, 0.6, 0.4, 0.9, 0.07, 1.0);
        rollOffers(game);
        refreshScreen(game);
      });
    })(i);
  }
}
SCREEN_REFRESH.enchanting = function (game) { renderOffers(game); };

/* ============================== BREWING ================================= */
SCREEN_BUILDERS.brewing = function (game, box) {
  var be = UI.container;
  guiTitle(box, 'Brewing Stand');
  var row = el('div', 'brewrow', box);
  buildSlotGrid(game, row, [arraySlot(be.slots, 3, { ghost: 'blaze' })], 1, 'fslot');
  buildSlotGrid(game, row, [arraySlot(be.slots, 4)], 1, 'fslot');
  var bub = el('div', 'bubbles', row); UI.els.bubbles = bub;
  var bots = el('div', 'brewbots', row);
  buildSlotGrid(game, bots, [arraySlot(be.slots, 0), arraySlot(be.slots, 1), arraySlot(be.slots, 2)], 3, 'fslot');
  addPlayerInventory(game, box);
};
SCREEN_REFRESH.brewing = function (game) {
  var be = UI.container;
  if (UI.els.bubbles && be) UI.els.bubbles.style.setProperty('--brew', Math.round((be.progress / 20) * 100) + '%');
};

/* =============================== ANVIL ================================== */
SCREEN_BUILDERS.anvil = function (game, box) {
  guiTitle(box, 'Repair & Name');
  var row = el('div', 'anvilrow', box);
  buildSlotGrid(game, row, [
    { get: function () { return UI.anvilA; }, set: function (s) { UI.anvilA = s; computeAnvil(game); }, kind: 'anvil', index: 0 },
    { get: function () { return UI.anvilB; }, set: function (s) { UI.anvilB = s; computeAnvil(game); }, kind: 'anvil', index: 1 }
  ], 2, 'anvilin');
  var mid = el('div', 'anvilmid', row);
  var input = el('input', 'nameinput', mid);
  input.type = 'text'; input.maxLength = 32; input.placeholder = 'Name';
  input.addEventListener('input', function () { UI.anvilName = input.value; computeAnvil(game); refreshScreen(game); });
  input.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
  UI.els.anvilCost = el('div', 'anvilcost', mid, '');
  buildSlotGrid(game, row, [{
    get: function () { return UI.anvilOut; },
    set: function () { },
    out: true, kind: 'anvilout', index: 0,
    onTake: function (g) { applyAnvil(g); }
  }], 1, 'anvilout');
  addPlayerInventory(game, box);
  computeAnvil(game);
};
function computeAnvil(game) {
  UI.anvilOut = null; UI.anvilCost = 0;
  var a = UI.anvilA, b = UI.anvilB;
  if (!a) return;
  var it = ITEMS[a.item];
  var out = makeStack(a.item, a.count, a.dur, a.ench ? a.ench.slice() : null);
  var cost = 0;
  if (b) {
    if (it.durability && b.item === a.item) {
      /* combine two of the same tool: durability plus a bonus, merge enchants */
      var used = Math.max(0, a.dur + b.dur - it.durability - Math.floor(it.durability * 0.12));
      out.dur = clamp(used, 0, it.durability - 1);
      cost += 2;
      if (b.ench) out.ench = mergeEnchants(out.ench, b.ench, function (n) { cost += n; });
    } else if (b.item === 'enchanted_book' && b.ench) {
      out.ench = mergeEnchants(out.ench, b.ench, function (n) { cost += n; });
    } else if (it.durability && repairMaterialFor(a.item) === b.item) {
      var per = Math.ceil(it.durability / 4);
      var n2 = Math.min(b.count, Math.ceil(a.dur / per));
      out.dur = Math.max(0, a.dur - per * n2);
      cost += n2;
    } else return;
  }
  if (UI.anvilName && UI.anvilName !== (out.name || '')) { out.name = UI.anvilName; cost += 1; }
  if (cost === 0 && !b) return;
  UI.anvilCost = Math.max(1, cost);
  UI.anvilOut = out;
  if (UI.els.anvilCost) {
    UI.els.anvilCost.textContent = 'Enchantment Cost: ' + UI.anvilCost;
    UI.els.anvilCost.className = 'anvilcost' + (game.player.level >= UI.anvilCost || game.player.creative ? '' : ' too');
  }
}
function mergeEnchants(base, add, costFn) {
  base = base ? base.slice() : [];
  for (var i = 0; i < add.length; i++) {
    var found = false;
    for (var j = 0; j < base.length; j++) {
      if (base[j].id === add[i].id) {
        var def = ENCH_BY_ID[add[i].id];
        var lvl = base[j].lvl === add[i].lvl ? Math.min(def.max, base[j].lvl + 1) : Math.max(base[j].lvl, add[i].lvl);
        costFn(lvl);
        base[j] = { id: base[j].id, lvl: lvl };
        found = true; break;
      }
    }
    if (!found) { base.push({ id: add[i].id, lvl: add[i].lvl }); costFn(add[i].lvl); }
  }
  return base;
}
function repairMaterialFor(item) {
  var m = { wooden: 'oak_planks', stone: 'cobblestone', iron: 'iron_ingot', golden: 'gold_ingot', diamond: 'diamond', netherite: 'netherite_ingot',
    leather: 'leather', chainmail: 'iron_ingot', turtle: 'scute' };
  for (var k in m) if (item.indexOf(k + '_') === 0) return m[k];
  return null;
}
function applyAnvil(game) {
  var p = game.player;
  if (!UI.anvilOut) return;
  if (!p.creative && !spendLevels(game, UI.anvilCost)) return;
  UI.anvilA = null;
  if (UI.anvilB) { UI.anvilB.count--; if (UI.anvilB.count <= 0) UI.anvilB = null; }
  playSound(game, 'anvil', p.x, p.y, p.z);
  UI.anvilOut = null;
  computeAnvil(game);
}
SCREEN_REFRESH.anvil = function (game) { computeAnvil(game); };

/* ============================== SMITHING ================================ */
SCREEN_BUILDERS.smithing = function (game, box) {
  guiTitle(box, 'Upgrade Gear');
  var row = el('div', 'anvilrow', box);
  buildSlotGrid(game, row, [
    { get: function () { return UI.smithA; }, set: function (s) { UI.smithA = s; computeSmith(game); }, kind: 'smith', index: 0, ghost: 'template' },
    { get: function () { return UI.smithB; }, set: function (s) { UI.smithB = s; computeSmith(game); }, kind: 'smith', index: 1 },
    { get: function () { return UI.smithC; }, set: function (s) { UI.smithC = s; computeSmith(game); }, kind: 'smith', index: 2, ghost: 'ingot' }
  ], 3, 'anvilin');
  arrowEl(row);
  buildSlotGrid(game, row, [{
    get: function () { return UI.smithOut; }, set: function () { }, out: true, kind: 'smithout', index: 0,
    onTake: function (g) {
      UI.smithA.count--; if (UI.smithA.count <= 0) UI.smithA = null;
      UI.smithB = null;
      UI.smithC.count--; if (UI.smithC.count <= 0) UI.smithC = null;
      playSound(g, 'anvil', g.player.x, g.player.y, g.player.z);
      computeSmith(g);
    }
  }], 1, 'anvilout');
  addPlayerInventory(game, box);
  computeSmith(game);
};
function computeSmith(game) {
  UI.smithOut = null;
  if (!UI.smithA || !UI.smithB || !UI.smithC) return;
  for (var i = 0; i < SMITHING.length; i++) {
    var r = SMITHING[i];
    if (r.template === UI.smithA.item && r.base === UI.smithB.item && r.addition === UI.smithC.item) {
      UI.smithOut = makeStack(r.out, 1, Math.min(UI.smithB.dur, (ITEMS[r.out].durability - 1)), UI.smithB.ench ? UI.smithB.ench.slice() : null);
      return;
    }
  }
}
SCREEN_REFRESH.smithing = function (game) { computeSmith(game); };

/* ============================ STONECUTTER =============================== */
SCREEN_BUILDERS.stonecutter = function (game, box) {
  guiTitle(box, 'Stonecutter');
  var row = el('div', 'cutrow', box);
  buildSlotGrid(game, row, [{
    get: function () { return UI.cutInput; }, set: function (s) { UI.cutInput = s; UI.cutSel = 0; refreshScreen(game); }, kind: 'cut', index: 0
  }], 1, 'fslot');
  UI.els.cutList = el('div', 'cutlist', row);
  buildSlotGrid(game, row, [{
    get: function () { return cutOutput(); }, set: function () { }, out: true, kind: 'cutout', index: 0,
    onTake: function (g, n) {
      UI.cutInput.count--;
      if (UI.cutInput.count <= 0) UI.cutInput = null;
      playSound(g, 'break', g.player.x, g.player.y, g.player.z, 1.4, 0.5);
    }
  }], 1, 'fslot');
  addPlayerInventory(game, box);
  renderCutList(game);
};
function cutOutput() {
  if (!UI.cutInput) return null;
  var list = STONECUT[UI.cutInput.item];
  if (!list || !list[UI.cutSel]) return null;
  return makeStack(list[UI.cutSel].out, list[UI.cutSel].count);
}
function renderCutList(game) {
  var host = UI.els.cutList;
  if (!host) return;
  clearEl(host);
  var list = UI.cutInput ? STONECUT[UI.cutInput.item] : null;
  if (!list) { el('div', 'tdim', host, 'No cuts available.'); return; }
  for (var i = 0; i < list.length; i++) {
    (function (i) {
      var b = el('div', 'cutopt' + (i === UI.cutSel ? ' sel' : ''), host);
      el('img', 'islot', b).src = itemIconURL(list[i].out);
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); UI.cutSel = i; refreshScreen(game); });
      b.addEventListener('mouseenter', function () { showTooltip(makeStack(list[i].out, list[i].count)); });
      b.addEventListener('mouseleave', function () { showTooltip(null); });
    })(i);
  }
}
SCREEN_REFRESH.stonecutter = function (game) { renderCutList(game); };

/* ============================ GRINDSTONE ================================ */
SCREEN_BUILDERS.grindstone = function (game, box) {
  guiTitle(box, 'Repair & Disenchant');
  var row = el('div', 'anvilrow', box);
  buildSlotGrid(game, row, [
    { get: function () { return UI.grindA; }, set: function (s) { UI.grindA = s; }, kind: 'grind', index: 0 },
    { get: function () { return UI.grindB; }, set: function (s) { UI.grindB = s; }, kind: 'grind', index: 1 }
  ], 2, 'anvilin');
  arrowEl(row);
  buildSlotGrid(game, row, [{
    get: function () { return grindOutput(); }, set: function () { }, out: true, kind: 'grindout', index: 0,
    onTake: function (g) {
      var xp = 0;
      if (UI.grindA && UI.grindA.ench) xp += UI.grindA.ench.length * 3;
      if (UI.grindB && UI.grindB.ench) xp += UI.grindB.ench.length * 3;
      UI.grindA = null; UI.grindB = null;
      if (xp) spawnXP(g, g.player.dim, g.player.x, g.player.y + 1, g.player.z, xp);
      playSound(g, 'break', g.player.x, g.player.y, g.player.z, 0.7, 0.5);
    }
  }], 1, 'anvilout');
  addPlayerInventory(game, box);
};
function grindOutput() {
  var a = UI.grindA, b = UI.grindB;
  if (!a && !b) return null;
  if (a && b) {
    if (a.item !== b.item) return null;
    var it = ITEMS[a.item];
    if (!it.durability) return null;
    var used = Math.max(0, a.dur + b.dur - it.durability - Math.floor(it.durability * 0.05));
    return makeStack(a.item, 1, clamp(used, 0, it.durability - 1), null);
  }
  var s = a || b;
  if (!s.ench || !s.ench.length) return null;
  return makeStack(s.item === 'enchanted_book' ? 'book' : s.item, s.count, s.dur, null);
}
SCREEN_REFRESH.grindstone = function () { };

/* ============================== TRADING ================================= */
SCREEN_BUILDERS.trade = function (game, box) {
  var v = UI.trader;
  guiTitle(box, (v && v.professionDisp ? v.professionDisp : 'Villager') + ' · Trades');
  var row = el('div', 'traderow', box);
  UI.els.tradeList = el('div', 'tradelist', row);
  var right = el('div', 'traderight', row);
  buildSlotGrid(game, right, [
    { get: function () { return UI.tradeA; }, set: function (s) { UI.tradeA = s; refreshScreen(game); }, kind: 'trade', index: 0 },
    { get: function () { return UI.tradeB; }, set: function (s) { UI.tradeB = s; refreshScreen(game); }, kind: 'trade', index: 1 }
  ], 2, 'anvilin');
  arrowEl(right);
  buildSlotGrid(game, right, [{
    get: function () { return tradeOutput(game); }, set: function () { }, out: true, kind: 'tradeout', index: 0,
    onTake: function (g) { commitTrade(g); }
  }], 1, 'anvilout');
  addPlayerInventory(game, box);
  renderTrades(game);
};
function currentTrade() {
  var v = UI.trader;
  if (!v || !v.trades) return null;
  return v.trades[UI.tradeSel] || null;
}
function tradeOutput(game) {
  var t = currentTrade();
  if (!t) return null;
  if (t.uses >= t.maxUses) return null;
  var give = t.give;
  var a = UI.tradeA, b = UI.tradeB;
  var pool = [];
  if (a) pool.push(a);
  if (b) pool.push(b);
  for (var i = 0; i < give.length; i++) {
    var need = give[i][1], got = 0;
    for (var j = 0; j < pool.length; j++) if (pool[j].item === give[i][0]) got += pool[j].count;
    if (got < need) return null;
  }
  return makeStack(t.get[0], t.get[1]);
}
function commitTrade(game) {
  var t = currentTrade();
  if (!t) return;
  for (var i = 0; i < t.give.length; i++) {
    var need = t.give[i][1];
    var arr = [UI.tradeA, UI.tradeB];
    for (var j = 0; j < 2 && need > 0; j++) {
      var s = arr[j];
      if (!s || s.item !== t.give[i][0]) continue;
      var take = Math.min(s.count, need);
      s.count -= take; need -= take;
      if (s.count <= 0) { if (j === 0) UI.tradeA = null; else UI.tradeB = null; }
    }
  }
  t.uses++;
  UI.trader.xp = (UI.trader.xp || 0) + 2;
  addXP(game, 3 + Math.floor(Math.random() * 4));
  playSound(game, 'orb', game.player.x, game.player.y, game.player.z);
  renderTrades(game);
}
function renderTrades(game) {
  var host = UI.els.tradeList;
  if (!host) return;
  clearEl(host);
  var v = UI.trader;
  if (!v || !v.trades || !v.trades.length) { el('div', 'tdim', host, 'This villager has nothing to offer.'); return; }
  for (var i = 0; i < v.trades.length; i++) {
    (function (i) {
      var t = v.trades[i];
      var out = t.uses >= t.maxUses;
      var r = el('div', 'tradeopt' + (i === UI.tradeSel ? ' sel' : '') + (out ? ' disabled' : ''), host);
      for (var g = 0; g < t.give.length; g++) {
        var gi = el('div', 'tradeitem', r);
        el('img', 'islot', gi).src = itemIconURL(t.give[g][0]);
        el('span', 'icount', gi, '' + t.give[g][1]);
      }
      arrowEl(r, 'small');
      var oi = el('div', 'tradeitem', r);
      el('img', 'islot', oi).src = itemIconURL(t.get[0]);
      if (t.get[1] > 1) el('span', 'icount', oi, '' + t.get[1]);
      r.addEventListener('mousedown', function (ev) { ev.preventDefault(); UI.tradeSel = i; refreshScreen(game); });
    })(i);
  }
}
SCREEN_REFRESH.trade = function (game) { renderTrades(game); };

/* ============================== CREATIVE ================================ */
var CREATIVE_TABS = [
  ['building', 'Building'], ['nature', 'Nature'], ['wood', 'Wood'], ['color', 'Colour'],
  ['ore', 'Ores'], ['copper', 'Copper'], ['deco', 'Decoration'], ['redstone', 'Redstone'],
  ['storage', 'Storage'], ['util', 'Utility'], ['tools', 'Tools'], ['combat', 'Combat'],
  ['food', 'Food'], ['brewing', 'Brewing'], ['materials', 'Materials'], ['spawneggs', 'Spawn Eggs'], ['misc', 'Misc']
];
SCREEN_BUILDERS.creative = function (game, box) {
  box.classList.add('creativegui');
  guiTitle(box, 'Creative Inventory');
  var tabs = el('div', 'tabs', box);
  for (var i = 0; i < CREATIVE_TABS.length; i++) {
    (function (i) {
      var t = el('div', 'tab' + (UI.creativeTab === CREATIVE_TABS[i][0] ? ' sel' : ''), tabs, CREATIVE_TABS[i][1]);
      t.addEventListener('mousedown', function (ev) { ev.preventDefault(); UI.creativeTab = CREATIVE_TABS[i][0]; showScreenForce(game, 'creative'); });
    })(i);
  }
  var search = el('input', 'searchbox', box);
  search.type = 'text'; search.placeholder = 'Search all items…';
  search.value = UI.creativeSearch;
  search.addEventListener('input', function () { UI.creativeSearch = search.value; renderCreativeList(game); });
  search.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
  UI.els.creativeList = el('div', 'creativelist', box);
  renderCreativeList(game);
  addPlayerInventory(game, box);
};
function showScreenForce(game, name) { UI.screen = null; showScreen(game, name); }
function renderCreativeList(game) {
  var host = UI.els.creativeList;
  clearEl(host);
  var q = UI.creativeSearch.trim().toLowerCase();
  var n = 0;
  for (var i = 0; i < ITEM_LIST.length && n < 600; i++) {
    var it = ITEM_LIST[i];
    if (q) { if (it.name.indexOf(q) < 0 && it.disp.toLowerCase().indexOf(q) < 0) continue; }
    else if (it.group !== UI.creativeTab) continue;
    n++;
    (function (it) {
      var b = el('div', 'slot creativeslot', host);
      var img = el('img', 'islot', b);
      img.src = itemIconURL(it.name);
      b.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        var count = ev.button === 2 ? 1 : it.stack;
        if (ev.shiftKey) giveItem(game, it.name, count);
        else game.player.cursor = makeStack(it.name, count);
        UI.dirty = true; refreshScreen(game);
      });
      b.addEventListener('mouseenter', function () { showTooltip(makeStack(it.name, 1)); });
      b.addEventListener('mouseleave', function () { showTooltip(null); });
      b.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    })(it);
  }
  if (!n) el('div', 'tdim', host, 'Nothing matches.');
}
SCREEN_REFRESH.creative = function () { };

/* ============================== MENUS =================================== */
SCREEN_BUILDERS.death = function (game, box) {
  box.classList.add('centered');
  el('div', 'bigtitle', box, 'You Died!');
  el('div', 'subtext', box, game.deathCause || '');
  var b = el('button', 'bigbtn', box, 'Respawn');
  b.addEventListener('click', function () { respawnPlayer(game); });
  var b2 = el('button', 'bigbtn', box, 'Title Screen');
  b2.addEventListener('click', function () { respawnPlayer(game); showScreen(game, 'pause'); });
};
SCREEN_BUILDERS.pause = function (game, box) {
  box.classList.add('centered');
  el('div', 'bigtitle', box, 'Paused');
  var b1 = el('button', 'bigbtn', box, 'Back to Game');
  b1.addEventListener('click', function () { hideScreen(game); });
  var b2 = el('button', 'bigbtn', box, 'Options');
  b2.addEventListener('click', function () { showScreen(game, 'options'); });
  var b3 = el('button', 'bigbtn', box, game.player.creative ? 'Switch to Survival' : 'Switch to Creative');
  b3.addEventListener('click', function () {
    game.player.creative = !game.player.creative;
    game.player.flying = game.player.creative && game.player.flying;
    logMessage(game, 'Game mode: ' + (game.player.creative ? 'Creative' : 'Survival'), '#ffff88');
    hideScreen(game);
  });
  var b4 = el('button', 'bigbtn', box, 'Save World');
  b4.addEventListener('click', function () { game.save(); logMessage(game, 'World saved.', '#88ff88'); });
};
SCREEN_BUILDERS.options = function (game, box) {
  box.classList.add('centered', 'optionsgui');
  el('div', 'bigtitle', box, 'Options');
  var list = el('div', 'optlist', box);
  function slider(label, key, min, max, step, fmt, onChange) {
    var row = el('div', 'optrow', list);
    var lab = el('label', 'optlabel', row, label + ': ' + (fmt ? fmt(R.settings[key]) : R.settings[key]));
    var inp = el('input', 'optslider', row);
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = R.settings[key];
    inp.addEventListener('input', function () {
      R.settings[key] = parseFloat(inp.value);
      lab.textContent = label + ': ' + (fmt ? fmt(R.settings[key]) : R.settings[key]);
      if (onChange) onChange();
    });
  }
  function toggle(label, key, onChange) {
    var row = el('div', 'optrow', list);
    var b = el('button', 'optbtn', row, label + ': ' + (R.settings[key] ? 'ON' : 'OFF'));
    b.addEventListener('click', function () {
      R.settings[key] = !R.settings[key];
      b.textContent = label + ': ' + (R.settings[key] ? 'ON' : 'OFF');
      if (onChange) onChange();
    });
  }
  slider('Render Distance', 'renderDistance', 2, 20, 1);
  slider('Field of View', 'fov', 50, 110, 1);
  slider('Render Scale', 'renderScale', 0.5, 1, 0.05, function (v) { return Math.round(v * 100) + '%'; }, function () { resizeRenderer(); });
  slider('Max FPS', 'maxFps', 0, 240, 10, function (v) { return v === 0 ? 'Unlimited' : v; });
  toggle('Shadows', 'shadows');
  toggle('Bloom', 'bloom');
  toggle('God Rays', 'godRays');
  toggle('FXAA', 'fxaa');
  toggle('Smooth Lighting', 'smoothLight', function () { game.remeshAll(); });
  toggle('Fancy Water', 'fancyWater');
  toggle('View Bobbing', 'viewBob');
  toggle('Waving Plants', 'waveGrass');
  toggle('Clouds', 'clouds');
  var vrow = el('div', 'optrow', list);
  var vlab = el('label', 'optlabel', vrow, 'Volume: ' + Math.round(AUDIO.volume * 100) + '%');
  var vin = el('input', 'optslider', vrow);
  vin.type = 'range'; vin.min = 0; vin.max = 1; vin.step = 0.05; vin.value = AUDIO.volume;
  vin.addEventListener('input', function () {
    AUDIO.volume = parseFloat(vin.value);
    if (AUDIO.master) AUDIO.master.gain.value = AUDIO.volume;
    vlab.textContent = 'Volume: ' + Math.round(AUDIO.volume * 100) + '%';
  });
  var back = el('button', 'bigbtn', box, 'Done');
  back.addEventListener('click', function () { showScreen(game, 'pause'); });
};
SCREEN_REFRESH.death = function () { };
SCREEN_REFRESH.pause = function () { };
SCREEN_REFRESH.options = function () { };

/* --------------------------------------------------- the player doll --- */
function drawPlayerDoll(game) {
  /* the little rotating figure in the inventory is drawn with the same
     entity model code, into a 2D canvas, so it always matches the mobs */
  var host = UI.els.doll;
  if (!host) return;
  if (!host._c) {
    host._c = document.createElement('canvas');
    host._c.width = 120; host._c.height = 200;
    host.appendChild(host._c);
  }
  var ctx = host._c.getContext('2d');
  ctx.clearRect(0, 0, 120, 200);
  var p = game.player;
  var parts = [
    ['#3a6fb0', 26, 60, 40, 60],     /* body */
    [SKIN, 12, 62, 14, 56],          /* left arm */
    [SKIN, 66, 62, 14, 56],          /* right arm */
    ['#2f4f7a', 26, 120, 19, 58],    /* left leg */
    ['#2f4f7a', 47, 120, 19, 58],    /* right leg */
    [SKIN, 26, 14, 40, 44]           /* head */
  ];
  for (var i = 0; i < parts.length; i++) {
    var q = parts[i];
    ctx.fillStyle = q[0];
    ctx.fillRect(q[1], q[2], q[3], q[4]);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(q[1] + q[3] * 0.62, q[2], q[3] * 0.38, q[4]);
  }
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(26, 14, 40, 12);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(34, 32, 7, 6); ctx.fillRect(51, 32, 7, 6);
  ctx.fillStyle = '#4a6fb0'; ctx.fillRect(37, 33, 4, 5); ctx.fillRect(52, 33, 4, 5);
  ctx.fillStyle = '#8a5a44'; ctx.fillRect(38, 46, 16, 3);
  /* worn armour tints over the body */
  for (var a = 0; a < 4; a++) {
    var s = p.armor[a];
    if (!s) continue;
    var c = ITEMS[s.item] ? ITEMS[s.item].color : '#c0c0c0';
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = c;
    if (a === 0) ctx.fillRect(24, 12, 44, 34);
    if (a === 1) { ctx.fillRect(24, 58, 44, 44); ctx.fillRect(10, 60, 16, 34); ctx.fillRect(64, 60, 16, 34); }
    if (a === 2) ctx.fillRect(25, 100, 42, 42);
    if (a === 3) ctx.fillRect(25, 156, 42, 24);
    ctx.globalAlpha = 1;
  }
}
