/* =========================================================================
 * ACHIEVEMENTS, CHEATS AND THE END CREDITS
 *
 * Achievements are only awarded on an honest world.  Turning on X-ray marks
 * the save as cheated for good — it disables every remaining achievement and
 * the credits say so at the end.
 * ========================================================================= */

var ACHIEVEMENTS = [
  { id: 'wood', name: 'Getting Wood', desc: 'Punch a tree.' },
  { id: 'bench', name: 'Benchmarking', desc: 'Craft a crafting table.' },
  { id: 'pick', name: 'Time to Mine!', desc: 'Craft a pickaxe.' },
  { id: 'stone', name: 'Stone Age', desc: 'Mine stone with a pickaxe.' },
  { id: 'furnace', name: 'Hot Topic', desc: 'Craft a furnace.' },
  { id: 'iron', name: 'Acquire Hardware', desc: 'Smelt an iron ingot.' },
  { id: 'ironpick', name: "Isn't It Iron Pick", desc: 'Craft an iron pickaxe.' },
  { id: 'diamond', name: 'Diamonds!', desc: 'Find a diamond.' },
  { id: 'diamondgear', name: 'Cutting Edge', desc: 'Craft something from diamond.' },
  { id: 'bed', name: 'Sweet Dreams', desc: 'Sleep in a bed.' },
  { id: 'farm', name: 'Bake Bread', desc: 'Bake a loaf of bread.' },
  { id: 'enchant', name: 'Enchanter', desc: 'Enchant an item.' },
  { id: 'trade', name: 'What a Deal!', desc: 'Trade with a villager.' },
  { id: 'obsidian', name: 'Ice Bucket Challenge', desc: 'Obtain obsidian.' },
  { id: 'nether', name: 'We Need to Go Deeper', desc: 'Build a portal and enter the Nether.' },
  { id: 'fortress', name: 'A Terrible Fortress', desc: 'Find a nether fortress.' },
  { id: 'blaze', name: 'Into Fire', desc: 'Take a blaze rod from a blaze.' },
  { id: 'pearl', name: 'The Next Generation', desc: 'Get an ender pearl.' },
  { id: 'eye', name: 'Eye Spy', desc: 'Craft an eye of ender.' },
  { id: 'stronghold', name: 'Deeper and Deeper', desc: 'Find a stronghold.' },
  { id: 'end', name: 'The End?', desc: 'Enter the End.' },
  { id: 'dragon', name: 'Free the End', desc: 'Defeat the Ender Dragon.' },
  { id: 'wither', name: 'Withering Heights', desc: 'Defeat the Wither.' },
  { id: 'beacon', name: 'Beaconator', desc: 'Craft a beacon.' },
  { id: 'netherite', name: 'Cover Me in Debris', desc: 'Craft netherite gear.' },
  { id: 'elytra', name: "Sky's the Limit", desc: 'Find an elytra.' },
  { id: 'warden', name: 'It Spreads', desc: 'Meet the Warden and live.' },
  { id: 'monument', name: 'Deep Sea Diver', desc: 'Find an ocean monument.' }
];
var ACH_BY_ID = {};
for (var _a = 0; _a < ACHIEVEMENTS.length; _a++) ACH_BY_ID[ACHIEVEMENTS[_a].id] = ACHIEVEMENTS[_a];

/* item name -> achievement it grants when you first obtain it */
var ACH_ITEM = {
  oak_log: 'wood', birch_log: 'wood', spruce_log: 'wood', jungle_log: 'wood',
  acacia_log: 'wood', dark_oak_log: 'wood', mangrove_log: 'wood', cherry_log: 'wood',
  crafting_table: 'bench', furnace: 'furnace', iron_ingot: 'iron', diamond: 'diamond',
  bread: 'farm', obsidian: 'obsidian', blaze_rod: 'blaze', ender_pearl: 'pearl',
  ender_eye: 'eye', beacon: 'beacon', elytra: 'elytra', cobblestone: 'stone',
  wooden_pickaxe: 'pick', stone_pickaxe: 'pick', iron_pickaxe: 'ironpick',
  diamond_pickaxe: 'diamondgear', diamond_sword: 'diamondgear', diamond_chestplate: 'diamondgear',
  netherite_ingot: 'netherite', netherite_pickaxe: 'netherite', netherite_sword: 'netherite'
};

function achState(game) {
  if (!game.ach) game.ach = {};
  return game.ach;
}
function unlockAch(game, id) {
  var a = ACH_BY_ID[id];
  if (!a) return;
  var st = achState(game);
  if (st[id]) return;
  if (game.cheated) return;              /* no trophies on a cheated world */
  st[id] = 1;
  showAchToast(game, a);
  playSound(game, 'levelup', game.player.x, game.player.y, game.player.z, 1.4, 0.5);
}
function achOnItem(game, itemName) {
  var id = ACH_ITEM[itemName];
  if (id) unlockAch(game, id);
}
function achCount(game) {
  var st = achState(game), n = 0;
  for (var k in st) if (st[k]) n++;
  return n;
}

/* ------------------------------------------------------------- toast --- */
function showAchToast(game, a) {
  var host = UI.els.achievements;
  if (!host) return;
  var t = el('div', 'achtoast', host);
  el('div', 'achtitle', t, 'Achievement Unlocked!');
  el('div', 'achname', t, a.name);
  el('div', 'achdesc', t, a.desc);
  setTimeout(function () { t.classList.add('out'); }, 4200);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 5200);
}

/* ------------------------------------------------------------ cheating -- */
function markCheated(game, why) {
  if (game.cheated) return;
  game.cheated = true;
  game.cheatReason = why || 'X-ray';
  logMessage(game, 'Cheats enabled — achievements are disabled for this world.', '#ff8866');
}

/* Asking before switching X-ray on, because it cannot be taken back. */
SCREEN_BUILDERS.cheatconfirm = function (game, box) {
  box.classList.add('centered');
  el('div', 'bigtitle', box, 'Enable X-Ray?');
  el('div', 'subtext', box, 'X-ray strips the world down to ores and lights everything up.');
  el('div', 'subtext', box, 'It counts as cheating: achievements will be permanently');
  el('div', 'subtext', box, 'disabled for this world, and the end credits will say so.');
  if (achCount(game) > 0) {
    el('div', 'subtext warn', box, 'You already have ' + achCount(game) + ' achievement' +
      (achCount(game) === 1 ? '' : 's') + ' on this world.');
  }
  var yes = el('button', 'bigbtn danger', box, 'Yes, enable X-ray');
  yes.addEventListener('click', function () {
    markCheated(game, 'X-ray');
    R.settings.xray = true;
    hideScreen(game);
    game.setXray(true);
  });
  var no = el('button', 'bigbtn', box, 'No, keep it fair');
  no.addEventListener('click', function () { R.settings.xray = false; hideScreen(game); });
};
SCREEN_REFRESH.cheatconfirm = function () { };

/* --------------------------------------------------- achievement list -- */
SCREEN_BUILDERS.achievements = function (game, box) {
  box.classList.add('centered', 'optionsgui');
  el('div', 'bigtitle', box, 'Achievements');
  var st = achState(game);
  el('div', 'subtext', box, achCount(game) + ' of ' + ACHIEVEMENTS.length + ' unlocked' +
    (game.cheated ? ' — disabled, this world used ' + game.cheatReason : ''));
  var list = el('div', 'achlist', box);
  for (var i = 0; i < ACHIEVEMENTS.length; i++) {
    var a = ACHIEVEMENTS[i];
    var row = el('div', 'achrow' + (st[a.id] ? ' got' : ''), list);
    el('span', 'achn', row, st[a.id] ? a.name : '???');
    el('span', 'achd', row, st[a.id] ? a.desc : a.desc);
  }
  var b = el('button', 'bigbtn', box, 'Back');
  b.addEventListener('click', function () { hideScreen(game); });
};
SCREEN_REFRESH.achievements = function () { };

/* ----------------------------------------------------------- credits --- */
var CREDITS_LINES = [
  '', 'VOXELCRAFT', '', 'You have freed the End.', '',
  '— WORLD —', 'terrain, caves and cliffs', 'sixty-two biomes', 'twenty kinds of structure',
  'three dimensions', '',
  '— BUILT FROM NOTHING —', 'every texture painted at runtime',
  'every sound synthesised', 'no images, no audio files', 'one HTML file', '',
  '— THE LONG WAY DOWN —', 'wood', 'stone', 'iron', 'diamond', 'obsidian',
  'the Nether', 'blaze rods', 'ender pearls', 'the stronghold', 'the End', '',
  'Thank you for playing.', ''
];
function showCredits(game) {
  game.creditsT = 0;
  showScreen(game, 'credits');
}
SCREEN_BUILDERS.credits = function (game, box) {
  box.classList.add('centered', 'creditsgui');
  var scroll = el('div', 'creditscroll', box);
  var inner = el('div', 'creditinner', scroll);
  if (game.cheated) {
    var w = el('div', 'creditcheat', inner);
    el('div', 'cheatbig', w, 'YOU CHEATED');
    el('div', 'cheatsmall', w, 'This world used ' + (game.cheatReason || 'cheats') + '.');
    el('div', 'cheatsmall', w, 'No achievements were earned.');
  } else {
    var g2 = el('div', 'creditclean', inner);
    el('div', 'cheatbig', g2, 'FAIR AND SQUARE');
    el('div', 'cheatsmall', g2, achCount(game) + ' of ' + ACHIEVEMENTS.length + ' achievements earned.');
  }
  for (var i = 0; i < CREDITS_LINES.length; i++) {
    var line = CREDITS_LINES[i];
    el('div', line === line.toUpperCase() && line.length > 2 ? 'creditline head' : 'creditline', inner, line);
  }
  UI.els.creditInner = inner;
  var b = el('button', 'bigbtn', box, 'Continue');
  b.addEventListener('click', function () { hideScreen(game); });
};
SCREEN_REFRESH.credits = function (game) {
  var inner = UI.els.creditInner;
  if (!inner) return;
  game.creditsT = (game.creditsT || 0) + 0.016;
  inner.style.transform = 'translateY(' + Math.max(-inner.scrollHeight, 240 - game.creditsT * 42) + 'px)';
};
