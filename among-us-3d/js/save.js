/* ============================================================
   AMONG US 3D — SAVE / PROFILE
   Wallet (Beans / Stars / Pods), owned + equipped cosmetics,
   level & XP, lobby + client settings. All in localStorage.
   ============================================================ */
(function (AU) {
'use strict';

var KEY = 'au3d.profile.v1';

var DEFAULT = {
  name: '',
  level: 1, xp: 0,
  beans: 1200, stars: 8, pods: 40,
  multiplier: 1.0,
  stats: { played:0, crewWins:0, impWins:0, tasksDone:0, kills:0, ejected:0, bodiesReported:0, meetings:0 },
  color: 'red',
  equipped: { hat:'none', visor:'none', skin:'none', pet:'none', nameplate:'none' },
  owned: { hat:['none','cap','egg'], visor:['none'], skin:['none'], pet:['none'], nameplate:['none'] },
  cubes: {},            // cubeId -> { bought:true, unlocked:[ 'hat:leaf', ... ] }
  settings: null,       // lobby settings
  roleSettings: null,   // role settings
  client: null          // client settings
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

var P = null;

AU.Save = {
  load: function () {
    if (P) return P;
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    P = clone(DEFAULT);
    if (raw) {
      try {
        var got = JSON.parse(raw);
        for (var k in got) if (Object.prototype.hasOwnProperty.call(got, k)) P[k] = got[k];
      } catch (e) {}
    }
    // Fill in defaults for anything missing (forward compatible saves)
    if (!P.settings)     P.settings     = AU.defaultSettings(AU.SETTING_DEFS);
    if (!P.roleSettings) P.roleSettings = AU.defaultSettings(AU.ROLE_SETTING_DEFS);
    if (!P.client)       P.client       = AU.defaultSettings(AU.CLIENT_SETTING_DEFS);
    mergeDefaults(P.settings,     AU.SETTING_DEFS);
    mergeDefaults(P.roleSettings, AU.ROLE_SETTING_DEFS);
    mergeDefaults(P.client,       AU.CLIENT_SETTING_DEFS);
    if (!P.equipped) P.equipped = clone(DEFAULT.equipped);
    if (!P.owned)    P.owned    = clone(DEFAULT.owned);
    if (!P.stats)    P.stats    = clone(DEFAULT.stats);
    for (var i = 0; i < AU.COSMETIC_KINDS.length; i++) {
      var kind = AU.COSMETIC_KINDS[i];
      if (!P.owned[kind]) P.owned[kind] = ['none'];
      if (P.owned[kind].indexOf('none') < 0) P.owned[kind].push('none');
    }
    if (!P.name) P.name = AU.BOT_NAMES[Math.floor(Math.random() * AU.BOT_NAMES.length)].toUpperCase();
    return P;
  },
  save: function () {
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {}
  },
  get p() { return P || AU.Save.load(); },

  /* ---------- wallet ---------- */
  canAfford: function (cost) {
    var p = AU.Save.p;
    if (cost.beans && p.beans < cost.beans) return false;
    if (cost.stars && p.stars < cost.stars) return false;
    if (cost.pods  && p.pods  < cost.pods)  return false;
    return true;
  },
  spend: function (cost) {
    if (!AU.Save.canAfford(cost)) return false;
    var p = AU.Save.p;
    if (cost.beans) p.beans -= cost.beans;
    if (cost.stars) p.stars -= cost.stars;
    if (cost.pods)  p.pods  -= cost.pods;
    AU.Save.save();
    return true;
  },
  grant: function (g) {
    var p = AU.Save.p;
    if (g.beans) p.beans += g.beans;
    if (g.stars) p.stars += g.stars;
    if (g.pods)  p.pods  += g.pods;
    AU.Save.save();
  },

  /* ---------- cosmetics ---------- */
  owns: function (kind, id) {
    var p = AU.Save.p;
    return id === 'none' || (p.owned[kind] && p.owned[kind].indexOf(id) >= 0);
  },
  give: function (kind, id) {
    var p = AU.Save.p;
    if (!p.owned[kind]) p.owned[kind] = [];
    if (p.owned[kind].indexOf(id) < 0) p.owned[kind].push(id);
    AU.Save.save();
  },
  equip: function (kind, id) {
    AU.Save.p.equipped[kind] = id;
    AU.Save.save();
  },

  /* ---------- cosmicubes ---------- */
  cube: function (id) {
    var p = AU.Save.p;
    if (!p.cubes[id]) p.cubes[id] = { bought:false, unlocked:[] };
    return p.cubes[id];
  },
  cubeHas: function (cubeId, kind, id) {
    return AU.Save.cube(cubeId).unlocked.indexOf(kind + ':' + id) >= 0;
  },
  cubeUnlock: function (cubeId, kind, id) {
    var c = AU.Save.cube(cubeId);
    if (c.unlocked.indexOf(kind + ':' + id) < 0) c.unlocked.push(kind + ':' + id);
    AU.Save.give(kind, id);
  },

  /* ---------- progression ---------- */
  xpForLevel: function (lvl) { return 100 + (lvl - 1) * 55; },
  addXp: function (amount) {
    var p = AU.Save.p, leveled = 0;
    p.xp += amount;
    while (p.xp >= AU.Save.xpForLevel(p.level)) {
      p.xp -= AU.Save.xpForLevel(p.level);
      p.level++; leveled++;
      // Bean multiplier grows with level, capped like the real game's 0.5x–5.0x band
      p.multiplier = Math.min(5.0, 1.0 + Math.floor(p.level / 5) * 0.25);
    }
    AU.Save.save();
    return leveled;
  },

  /* Award end-of-match currency the way the real game does:
     tasks completed, correct ejections, kills, and a win bonus, times the level multiplier. */
  awardMatch: function (r) {
    var p = AU.Save.p;
    var beans = 0;
    beans += (r.tasks || 0) * 12;
    beans += (r.correctEjects || 0) * 40;
    beans += (r.kills || 0) * 25;
    beans += (r.win ? 150 : 45);
    beans += (r.survived ? 30 : 0);
    beans = Math.round(beans * (p.multiplier || 1));
    var pods = Math.round(2 + (r.win ? 6 : 2) + (r.tasks || 0) * 0.5);
    var xp   = 30 + (r.tasks || 0) * 5 + (r.win ? 40 : 10);
    var stars = (r.win && Math.random() < 0.25) ? 1 : 0;
    p.stats.played++;
    if (r.win && r.team === 'crew')     p.stats.crewWins++;
    if (r.win && r.team === 'impostor') p.stats.impWins++;
    p.stats.tasksDone += (r.tasks || 0);
    p.stats.kills     += (r.kills || 0);
    AU.Save.grant({ beans: beans, pods: pods, stars: stars });
    var levels = AU.Save.addXp(xp);
    return { beans: beans, pods: pods, stars: stars, xp: xp, levels: levels };
  },

  reset: function () {
    P = clone(DEFAULT);
    P.settings     = AU.defaultSettings(AU.SETTING_DEFS);
    P.roleSettings = AU.defaultSettings(AU.ROLE_SETTING_DEFS);
    P.client       = AU.defaultSettings(AU.CLIENT_SETTING_DEFS);
    AU.Save.save();
  }
};

function mergeDefaults(obj, defs) {
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    if (d.key && typeof obj[d.key] === 'undefined') obj[d.key] = d.def;
  }
}

})(window.AU);
