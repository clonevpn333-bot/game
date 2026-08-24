/* =========================================================================
 * UI CORE — HUD, slot machinery and the screen framework.
 * ========================================================================= */

var UI = {
  screen: null, prevScreen: null, dirty: true,
  slots: [], els: {}, container: null, containerPos: null,
  craft: [null, null, null, null, null, null, null, null, null], craftW: 3,
  craftOut: null, craftRecipe: null,
  anvilA: null, anvilB: null, anvilName: '', anvilCost: 0,
  smithA: null, smithB: null, smithC: null,
  grindA: null, grindB: null,
  enchOffers: null, enchItem: null, enchLapis: null, enchSeed: 0,
  cutInput: null, cutSel: 0,
  trader: null, tradeSel: 0, tradeA: null, tradeB: null,
  tooltipItem: null, hoverSlot: -1, dragSlots: null, dragButton: 0,
  messages: [], creativeTab: 'building', creativeScroll: 0, creativeSearch: ''
};

/* -------------------------------------------------------- HUD sprites -- */
var HUD_ICONS = {};
function hudIcon(name) {
  if (HUD_ICONS[name]) return HUD_ICONS[name];
  var S = 9, sc = 4;
  var c = document.createElement('canvas');
  c.width = S * sc; c.height = S * sc;
  var ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  var px = function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(x * sc, y * sc, sc, sc); };
  var HEART = [
    '.XX.XX.', 'XOORXXX', 'XOORXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'
  ];
  var FOOD = [
    '..XXX..', '.XXXXX.', 'XXOXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...S...'
  ];
  var ARMOR = [
    '.XXXXX.', 'XX.X.XX', 'XXXXXXX', 'XXXXXXX', 'XX.X.XX', 'XX...XX', '.......'
  ];
  var BUBBLE = [
    '..XXX..', '.XOOOX.', 'XOOOOOX', 'XOOOOOX', 'XOOOOOX', '.XOOOX.', '..XXX..'
  ];
  var art, main, hi, shadow = 'rgba(0,0,0,0.45)';
  if (name.indexOf('heart') === 0) { art = HEART; main = '#d63a2f'; hi = '#f26a5e'; }
  else if (name.indexOf('food') === 0) { art = FOOD; main = '#9a6a2a'; hi = '#c89a4a'; }
  else if (name.indexOf('armor') === 0) { art = ARMOR; main = '#cfd4d8'; hi = '#f0f4f8'; }
  else { art = BUBBLE; main = '#dff2ff'; hi = '#ffffff'; }
  var empty = name.indexOf('empty') > 0, half = name.indexOf('half') > 0;
  for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
    var ch = art[y].charAt(x);
    if (ch === '.') continue;
    px(x + 1, y + 1, shadow);
  }
  for (var y2 = 0; y2 < 7; y2++) for (var x2 = 0; x2 < 7; x2++) {
    var ch2 = art[y2].charAt(x2);
    if (ch2 === '.') continue;
    var isEmpty = empty || (half && x2 >= 4);
    var c2 = isEmpty ? 'rgba(20,20,20,0.55)' : (ch2 === 'O' ? hi : (ch2 === 'R' ? '#ffffff' : (ch2 === 'S' ? '#e8e0d0' : main)));
    px(x2, y2, c2);
  }
  HUD_ICONS[name] = c.toDataURL();
  return HUD_ICONS[name];
}

/* ------------------------------------------------------------ helpers -- */
function el(tag, cls, parent, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function clearEl(e) { while (e.firstChild) e.removeChild(e.firstChild); }
function titleCaseUI(s) { return ITEMS[s] ? ITEMS[s].disp : titleCase(s); }

function logMessage(game, text, color) {
  UI.messages.push({ text: text, color: color || '#ffffff', t: game ? game.time : 0, life: 8 });
  if (UI.messages.length > 60) UI.messages.shift();
  UI.dirty = true;
}

/* ------------------------------------------------------------- build -- */
function buildHUD(game) {
  var root = document.getElementById('ui');
  UI.root = root;
  var hud = el('div', 'hud', root); UI.els.hud = hud;

  el('div', 'crosshair', hud);
  var vig = el('div', 'vignette', hud); UI.els.vignette = vig;
  var hurt = el('div', 'hurtflash', hud); UI.els.hurt = hurt;
  var portal = el('div', 'portalflash', hud); UI.els.portal = portal;

  var bottom = el('div', 'bottom', hud);
  var barsWrap = el('div', 'barsWrap', bottom);
  UI.els.left = el('div', 'statrow left', barsWrap);
  UI.els.right = el('div', 'statrow right', barsWrap);

  var xpwrap = el('div', 'xpwrap', bottom);
  UI.els.xpbar = el('div', 'xpbar', xpwrap);
  UI.els.xpfill = el('div', 'xpfill', UI.els.xpbar);
  UI.els.xplevel = el('div', 'xplevel', xpwrap);

  var hotbar = el('div', 'hotbar', bottom); UI.els.hotbar = hotbar;
  UI.els.hotslots = [];
  for (var i = 0; i < 9; i++) {
    var s = el('div', 'hotslot', hotbar);
    s.dataset.i = i;
    UI.els.hotslots.push(s);
  }
  UI.els.sel = el('div', 'hotsel', hotbar);

  UI.els.itemName = el('div', 'itemname', hud);
  UI.els.chat = el('div', 'chatlog', hud);
  UI.els.debug = el('div', 'debug', hud);
  UI.els.effects = el('div', 'effects', hud);
  UI.els.bossbar = el('div', 'bossbar', hud);
  UI.els.subtitle = el('div', 'subtitle', hud);

  UI.els.screen = el('div', 'screen hidden', root);
  UI.els.tooltip = el('div', 'tooltip hidden', root);
  UI.els.cursorItem = el('div', 'cursoritem hidden', root);

  document.addEventListener('mousemove', function (ev) {
    UI.mouseX = ev.clientX; UI.mouseY = ev.clientY;
    if (UI.screen) positionFloaters();
  });
}

function positionFloaters() {
  var t = UI.els.tooltip, c = UI.els.cursorItem;
  if (!t.classList.contains('hidden')) {
    var r = t.getBoundingClientRect();
    var x = UI.mouseX + 14, y = UI.mouseY - 10;
    if (x + r.width > window.innerWidth - 6) x = UI.mouseX - r.width - 14;
    if (y + r.height > window.innerHeight - 6) y = window.innerHeight - r.height - 6;
    t.style.left = x + 'px'; t.style.top = Math.max(4, y) + 'px';
  }
  if (!c.classList.contains('hidden')) {
    c.style.left = (UI.mouseX - 22) + 'px';
    c.style.top = (UI.mouseY - 22) + 'px';
  }
}

/* ------------------------------------------------------- HUD updating -- */
function updateHUD(game) {
  var p = game.player;
  /* hotbar */
  for (var i = 0; i < 9; i++) {
    var s = p.inv[i];
    var e = UI.els.hotslots[i];
    renderSlotInto(e, s);
  }
  UI.els.sel.style.left = (p.sel * 44) + 'px';

  /* health / armour / hunger / air */
  var L = UI.els.left, Rr = UI.els.right;
  clearEl(L); clearEl(Rr);
  var ap = armorPoints(p).pts;
  if (ap > 0) {
    var arow = el('div', 'iconrow', L);
    for (var a = 0; a < 10; a++) {
      var v = ap - a * 2;
      el('img', 'hicon', arow).src = hudIcon(v >= 2 ? 'armor_full' : (v === 1 ? 'armor_half' : 'armor_empty'));
    }
  }
  var hrow = el('div', 'iconrow', L);
  var hp = Math.max(0, p.hp);
  var jitter = p.hp <= 4;
  for (var h = 0; h < 10; h++) {
    var hv = hp - h * 2;
    var img = el('img', 'hicon' + (jitter ? ' jitter' : ''), hrow);
    img.src = hudIcon(hv >= 2 ? 'heart_full' : (hv >= 1 ? 'heart_half' : 'heart_empty'));
    if (jitter) img.style.animationDelay = (h * 0.05) + 's';
  }
  if (!p.creative) {
    var frow = el('div', 'iconrow rev', Rr);
    for (var f = 0; f < 10; f++) {
      var fv = p.food - f * 2;
      el('img', 'hicon', frow).src = hudIcon(fv >= 2 ? 'food_full' : (fv >= 1 ? 'food_half' : 'food_empty'));
    }
  }
  if (p.air < p.maxAir) {
    var brow = el('div', 'iconrow rev', Rr);
    var bubbles = Math.ceil(p.air / p.maxAir * 10);
    for (var b = 0; b < 10; b++) el('img', 'hicon', brow).src = hudIcon(b < bubbles ? 'bubble_full' : 'bubble_empty');
  }
  if (p.creative) { L.classList.add('hidden'); Rr.classList.add('hidden'); }
  else { L.classList.remove('hidden'); Rr.classList.remove('hidden'); }

  /* XP */
  var need = xpForLevel(p.level);
  UI.els.xpfill.style.width = Math.round(p.xp / need * 100) + '%';
  UI.els.xplevel.textContent = p.level > 0 ? p.level : '';
  UI.els.xpwrapHidden = p.creative;
  UI.els.xpbar.parentNode.style.visibility = p.creative ? 'hidden' : 'visible';

  /* status effects */
  clearEl(UI.els.effects);
  for (var k in p.effects) {
    var d = el('div', 'effect', UI.els.effects);
    el('span', 'ename', d, titleCase(k));
    el('span', 'etime', d, fmtTime(p.effects[k]));
  }
}

function renderSlotInto(e, s) {
  var cur = e._stack;
  var key = s ? (s.item + '|' + s.count + '|' + s.dur + '|' + (s.ench ? s.ench.length : 0)) : '';
  if (e._key === key) return;
  e._key = key;
  e._stack = s;
  clearEl(e);
  if (!s) return;
  var img = el('img', 'islot', e);
  img.src = itemIconURL(s.item);
  if (s.count > 1) el('span', 'icount', e, '' + s.count);
  var it = ITEMS[s.item];
  if (it && it.durability && s.dur > 0) {
    var bar = el('div', 'durbar', e);
    var frac = 1 - s.dur / it.durability;
    var fill = el('div', 'durfill', bar);
    fill.style.width = Math.max(0, Math.round(frac * 100)) + '%';
    fill.style.background = 'hsl(' + Math.round(frac * 110) + ',95%,45%)';
  }
  if (s.ench && s.ench.length) e.classList.add('ench'); else e.classList.remove('ench');
}

/* ---------------------------------------------------------- tooltips -- */
function showTooltip(stack) {
  var t = UI.els.tooltip;
  if (!stack) { t.classList.add('hidden'); return; }
  clearEl(t);
  var it = ITEMS[stack.item];
  var title = el('div', 'ttitle', t, it ? it.disp : stack.item);
  if (it && it.rarity === 1) title.style.color = '#ffff55';
  if (it && it.rarity === 2) title.style.color = '#55ffff';
  if (stack.ench && stack.ench.length) {
    title.style.color = '#c8a0ff';
    for (var i = 0; i < stack.ench.length; i++) {
      var e2 = ENCH_BY_ID[stack.ench[i].id];
      el('div', 'tench', t, (e2 ? e2.disp : stack.ench[i].id) + ' ' + ROMAN[stack.ench[i].lvl]);
    }
  }
  if (it) {
    if (it.dmg > 1) el('div', 'tstat', t, '+' + it.dmg.toFixed(1) + ' Attack Damage');
    if (it.armor) el('div', 'tstat', t, '+' + it.armor + ' Armor');
    if (it.toughness) el('div', 'tstat', t, '+' + it.toughness + ' Armor Toughness');
    if (it.food) el('div', 'tstat', t, 'Restores ' + it.food + ' hunger');
    if (it.tool) el('div', 'tstat', t, titleCase(it.tool) + ' · Tier ' + it.tier);
    if (it.durability) el('div', 'tstat', t, 'Durability ' + (it.durability - stack.dur) + ' / ' + it.durability);
    if (it.block && BID[it.block] !== undefined) {
      var b = BLOCKS[BID[it.block]];
      if (b.hard >= 0) el('div', 'tdim', t, 'Hardness ' + b.hard + (b.tool ? ' · ' + titleCase(b.tool) : ''));
      if (b.light) el('div', 'tdim', t, 'Light level ' + b.light);
    }
    el('div', 'tdim', t, it.name);
  }
  t.classList.remove('hidden');
  positionFloaters();
}
function updateCursorItem(game) {
  var c = UI.els.cursorItem;
  var s = game.player.cursor;
  if (!s) { c.classList.add('hidden'); return; }
  c.classList.remove('hidden');
  c._key = null;
  renderSlotInto(c, s);
  positionFloaters();
}

/* ============================ SLOT LOGIC ================================ */
function invSlot(p, i) {
  return {
    get: function () { return p.inv[i]; },
    set: function (s) { p.inv[i] = s; },
    kind: 'inv', index: i
  };
}
function armorSlot(p, i) {
  return {
    get: function () { return p.armor[i]; },
    set: function (s) { p.armor[i] = s; },
    accept: function (s) { return !s || (ITEMS[s.item] && ITEMS[s.item].slot === ARMOR_SLOTKEY[i]); },
    kind: 'armor', index: i, ghost: ['helmet', 'chestplate', 'leggings', 'boots'][i]
  };
}
function offhandSlot(p) {
  return { get: function () { return p.offhand; }, set: function (s) { p.offhand = s; }, kind: 'offhand', index: 0, ghost: 'shield' };
}
function arraySlot(arr, i, opts) {
  var s = { get: function () { return arr[i]; }, set: function (v) { arr[i] = v; }, kind: 'arr', index: i };
  if (opts) for (var k in opts) s[k] = opts[k];
  return s;
}

function mergeInto(dst, src) {
  /* returns the leftover of src */
  if (!dst) return null;
  if (!sameStack(dst, src)) return src;
  var max = stackMax(dst);
  var room = max - dst.count;
  if (room <= 0) return src;
  var move = Math.min(room, src.count);
  dst.count += move; src.count -= move;
  return src.count > 0 ? src : null;
}

function slotClick(game, idx, button, shift) {
  var p = game.player;
  var slot = UI.slots[idx];
  if (!slot) return;
  var cur = p.cursor;
  var s = slot.get();

  if (slot.out) {                                   /* result slots */
    if (!s) return;
    if (shift) {
      var guard = 0;
      while (slot.get() && guard++ < 64) {
        var take = slot.get();
        var left = giveItem(game, take.item, take.count);
        if (left > 0) break;
        slot.onTake && slot.onTake(game, take.count);
      }
    } else {
      if (cur && !sameStack(cur, s)) return;
      if (cur && cur.count + s.count > stackMax(cur)) return;
      if (cur) cur.count += s.count;
      else p.cursor = makeStack(s.item, s.count, s.dur, s.ench);
      slot.onTake && slot.onTake(game, s.count);
    }
    playSound(game, 'pop', undefined);
    UI.dirty = true;
    refreshScreen(game);
    return;
  }

  if (shift) {                                      /* quick move */
    if (!s) return;
    quickMove(game, idx);
    UI.dirty = true;
    refreshScreen(game);
    return;
  }

  if (button === 2) {                               /* right click */
    if (cur) {
      if (!s) {
        if (slot.accept && !slot.accept(makeStack(cur.item, 1, cur.dur, cur.ench))) return;
        slot.set(makeStack(cur.item, 1, cur.dur, cur.ench));
        cur.count--;
        if (cur.count <= 0) p.cursor = null;
      } else if (sameStack(s, cur) && s.count < stackMax(s)) {
        s.count++; cur.count--;
        if (cur.count <= 0) p.cursor = null;
      } else if (!sameStack(s, cur)) {
        if (slot.accept && !slot.accept(cur)) return;
        slot.set(cur); p.cursor = s;
      }
    } else if (s) {
      var half = Math.ceil(s.count / 2);
      p.cursor = makeStack(s.item, half, s.dur, s.ench);
      s.count -= half;
      if (s.count <= 0) slot.set(null);
    }
  } else {                                          /* left click */
    if (cur && s && sameStack(cur, s)) {
      var max = stackMax(s);
      var move = Math.min(max - s.count, cur.count);
      s.count += move; cur.count -= move;
      if (cur.count <= 0) p.cursor = null;
    } else {
      if (cur && slot.accept && !slot.accept(cur)) return;
      slot.set(cur); p.cursor = s;
    }
  }
  slot.onChange && slot.onChange(game);
  playSound(game, 'click', undefined, undefined, undefined, 1, 0.35);
  UI.dirty = true;
  refreshScreen(game);
}

/* shift-click routing: containers ↔ inventory, hotbar ↔ backpack */
function quickMove(game, idx) {
  var p = game.player;
  var slot = UI.slots[idx];
  var s = slot.get();
  if (!s) return;
  var targets = [];
  if (slot.kind === 'inv') {
    /* prefer a container, an armour slot, then the other half of the pack */
    for (var i = 0; i < UI.slots.length; i++) {
      var t = UI.slots[i];
      if (t === slot) continue;
      if (t.out) continue;
      if (t.kind === 'inv') continue;
      if (t.noQuick) continue;
      if (t.accept && !t.accept(s)) continue;
      targets.push(t);
    }
    if (!targets.length) {
      var inHotbar = slot.index < 9;
      for (var j = 0; j < UI.slots.length; j++) {
        var t2 = UI.slots[j];
        if (t2.kind !== 'inv' || t2 === slot) continue;
        if (inHotbar ? t2.index >= 9 : t2.index < 9) targets.push(t2);
      }
    }
  } else {
    for (var k = 0; k < UI.slots.length; k++) {
      var t3 = UI.slots[k];
      if (t3.kind === 'inv') targets.push(t3);
    }
    targets.sort(function (a, b) { return (a.index < 9 ? 1 : 0) - (b.index < 9 ? 1 : 0); });
  }
  /* fill partial stacks first, then empties */
  for (var pass = 0; pass < 2 && s.count > 0; pass++) {
    for (var m = 0; m < targets.length && s.count > 0; m++) {
      var d = targets[m].get();
      if (pass === 0) {
        if (!d || !sameStack(d, s)) continue;
        var room = stackMax(d) - d.count;
        if (room <= 0) continue;
        var mv = Math.min(room, s.count);
        d.count += mv; s.count -= mv;
      } else {
        if (d) continue;
        if (targets[m].accept && !targets[m].accept(s)) continue;
        targets[m].set(makeStack(s.item, s.count, s.dur, s.ench));
        s.count = 0;
      }
      targets[m].onChange && targets[m].onChange(game);
    }
  }
  if (s.count <= 0) slot.set(null);
  slot.onChange && slot.onChange(game);
}

/* --------------------------------------------------------- rendering -- */
function buildSlotGrid(game, parent, slots, cols, cls) {
  var grid = el('div', 'slotgrid ' + (cls || ''), parent);
  if (cols) grid.style.gridTemplateColumns = 'repeat(' + cols + ', 40px)';
  for (var i = 0; i < slots.length; i++) {
    var sl = slots[i];
    var idx = UI.slots.length;
    UI.slots.push(sl);
    var e = el('div', 'slot' + (sl.out ? ' outslot' : ''), grid);
    sl.el = e;
    e.dataset.idx = idx;
    if (sl.ghost) e.classList.add('ghost-' + sl.ghost);
    bindSlot(game, e, idx);
  }
  return grid;
}
function bindSlot(game, e, idx) {
  e.addEventListener('mousedown', function (ev) {
    ev.preventDefault();
    slotClick(game, idx, ev.button === 2 ? 2 : 0, ev.shiftKey);
  });
  e.addEventListener('mouseenter', function () {
    UI.hoverSlot = idx;
    var sl = UI.slots[idx];
    showTooltip(sl ? sl.get() : null);
  });
  e.addEventListener('mouseleave', function () {
    if (UI.hoverSlot === idx) { UI.hoverSlot = -1; showTooltip(null); }
  });
  e.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
}
function refreshSlots() {
  for (var i = 0; i < UI.slots.length; i++) {
    var sl = UI.slots[i];
    if (sl.el) renderSlotInto(sl.el, sl.get());
  }
}
