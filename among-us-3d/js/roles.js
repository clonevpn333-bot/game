/* ============================================================
   AMONG US 3D — ROLES
   Assignment honours the lobby's per-role chance settings, and
   each role's tunables resolve from the role-settings block.
   ============================================================ */
(function (AU) {
'use strict';

function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* Resolve a role's live options from the lobby role settings. */
function opts(roleId, rs) {
  rs = rs || AU.defaultSettings(AU.ROLE_SETTING_DEFS);
  switch (roleId) {
    case 'engineer':     return { cooldown: rs.engineerCd, maxTime: rs.engineerMax };
    case 'scientist':    return { cooldown: rs.scientistCd, battery: rs.scientistBat };
    case 'noisemaker':   return { alertDuration: rs.noiseDur, impostorSeesAlert: rs.noiseImp };
    case 'tracker':      return { cooldown: rs.trackerCd, duration: rs.trackerDur, delay: 3 };
    case 'detective':    return { interrogations: rs.detInterro };
    case 'guardian':     return { cooldown: rs.gaCd, duration: rs.gaDur, visible: rs.gaVisible };
    case 'judge':        return { uses: 1 };
    case 'shapeshifter': return { cooldown: rs.ssCd, duration: rs.ssDur, leaveSkin: rs.ssLeave };
    case 'phantom':      return { cooldown: rs.phCd, duration: rs.phDur };
    case 'viper':        return { dissolveTime: rs.viperDis };
    default:             return {};
  }
}

/* Assign impostors, then roll specialist roles by chance. */
function assign(players, settings, rs) {
  var alive = players.slice();
  shuffle(alive);
  var impCount = Math.min(settings.impostors || 1, Math.max(1, Math.floor((players.length - 1) / 2)));
  var imps = alive.slice(0, impCount);
  var crew = alive.slice(impCount);

  for (var i = 0; i < players.length; i++) {
    players[i].team = 'crew';
    players[i].role = 'crewmate';
    players[i].roleOpts = {};
    players[i].gaCandidate = false;
  }

  /* impostor specialisations */
  for (var k = 0; k < imps.length; k++) {
    var p = imps[k];
    p.team = 'impostor';
    p.role = 'impostor';
    var order = shuffle(AU.IMPOSTOR_ROLES.slice());
    for (var r = 0; r < order.length; r++) {
      var chance = rs['role_' + order[r]] || 0;
      if (Math.random() * 100 < chance) { p.role = order[r]; break; }
    }
    p.roleOpts = opts(p.role, rs);
  }

  /* crewmate specialisations — one role per player, capped so the crew
     isn't entirely made of specialists */
  var crewRoles = ['engineer', 'scientist', 'noisemaker', 'tracker', 'detective', 'judge'];
  for (var c = 0; c < crew.length; c++) {
    var cp = crew[c];
    var ord = shuffle(crewRoles.slice());
    for (var q = 0; q < ord.length; q++) {
      var ch = rs['role_' + ord[q]] || 0;
      if (Math.random() * 100 < ch) { cp.role = ord[q]; break; }
    }
    cp.roleOpts = opts(cp.role, rs);
    /* Guardian Angel is granted on death, like the real game */
    cp.gaCandidate = Math.random() * 100 < (rs.role_guardian || 0);
  }
  return { impostors: imps, crew: crew };
}

/* Called when a crewmate dies — they may become a Guardian Angel. */
function onCrewDeath(player, rs) {
  if (player.team !== 'crew') return false;
  if (!player.gaCandidate) return false;
  player.ghostRole = 'guardian';
  player.roleOpts = opts('guardian', rs);
  player.abilityCd = player.roleOpts.cooldown;
  return true;
}

function def(roleId) { return AU.ROLES[roleId] || AU.ROLES.crewmate; }

/* Label + description shown on the role reveal card. */
function reveal(player) {
  var d = def(player.role);
  return { name: d.name, color: d.color, desc: d.desc, team: d.team };
}

/* Does this role have an active ability button? */
function abilityOf(player) {
  if (!player.alive && player.ghostRole === 'guardian') return 'Protect';
  if (!player.alive) return null;
  var d = def(player.role);
  if (player.role === 'engineer')     return 'Vent';
  if (player.role === 'scientist')    return 'Vitals';
  if (player.role === 'tracker')      return 'Track';
  if (player.role === 'detective')    return 'Notes';
  if (player.role === 'shapeshifter') return 'Shapeshift';
  if (player.role === 'phantom')      return 'Vanish';
  if (player.role === 'judge')        return null;  /* used in meetings */
  return d.ability;
}

AU.Roles = {
  assign: assign,
  opts: opts,
  def: def,
  reveal: reveal,
  abilityOf: abilityOf,
  onCrewDeath: onCrewDeath,
  isImpostor: function (p) { return p.team === 'impostor'; },
  canVent: function (p) {
    return p.alive && (p.team === 'impostor' || p.role === 'engineer');
  },
  canKill: function (p) { return p.alive && p.team === 'impostor'; },
  canSabotage: function (p) { return p.alive && p.team === 'impostor'; }
};

})(window.AU);
