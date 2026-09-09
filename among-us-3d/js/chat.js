/* ============================================================
   AMONG US 3D — CHAT BRAIN
   No API, no keys: a local parser reads what you typed, works out
   the intent and who/where you meant, and each bot answers from
   its own memory. A bot that saw something says so; a bot that
   only has a hunch says it like a hunch.
   ============================================================ */
(function (AU) {
'use strict';

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ']/g, ' ').replace(/\s+/g, ' ').trim(); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function chance(p) { return Math.random() < p; }

/* ---------------- fuzzy matching ---------------- */
function levenshtein(a, b) {
  if (a === b) return 0;
  var m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  var prev = [], cur = [], i, j;
  for (j = 0; j <= n; j++) prev[j] = j;
  for (i = 1; i <= m; i++) {
    cur[0] = i;
    for (j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}
function bestMatch(token, candidates, maxDist) {
  var best = null, bd = 1e9;
  for (var i = 0; i < candidates.length; i++) {
    var c = norm(candidates[i].key);
    if (!c) continue;
    var d = c === token ? 0 : (c.indexOf(token) === 0 && token.length >= 3 ? 0.5 : levenshtein(token, c));
    if (d < bd) { bd = d; best = candidates[i]; }
  }
  var limit = maxDist != null ? maxDist : (token.length <= 4 ? 1 : 2);
  return bd <= limit ? best : null;
}

/* ---------------- intent detection ---------------- */
var INTENTS = [
  { id:'where',    words:['where were you','where was you','where u','where you','where were u','where wer','wheres','where is','where did you','account for'] },
  { id:'whosaw',   words:['who did you see','who saw','anyone see','did you see','see anyone','who was with','who were you with','anyone with'] },
  { id:'accuse',   words:['is sus','sus','suspicious','it is','its him','its her','i think it','was it','impostor','imposter','vote out','venting','vented','vent','saw them kill','killed'] },
  { id:'defend',   words:['not me','wasnt me','was not me','im clear','i am clear','innocent','why me','im crew','i am crew','trust me','not sus'] },
  { id:'clear',    words:['can clear','is clear','clear them','vouch','was with me','with me the whole','they are clean','not them'] },
  { id:'vote',     words:['vote','lets vote','vote him','vote her','vote them','eject','kick'] },
  { id:'skip',     words:['skip','no info','not enough','pass','nothing to go on'] },
  { id:'where_body',words:['where body','where was the body','body in','dead in','found in','body was'] },
  { id:'report',   words:['i was doing','i did','i was in','i came from','doing tasks','my task','was on'] },
  { id:'ask_sus',  words:['who do you','who is sus','who we voting','any clues','thoughts','what do you think',
                          'proof','evidence','anyone see','anyone got','who saw anything','any reads','who'] },
  { id:'greet',    words:['hi','hey','hello','yo','sup'] }
];

function detect(text) {
  var raw = String(text || '');
  var t = ' ' + norm(text) + ' ';
  var hits = [];
  INTENTS.forEach(function (it) {
    for (var i = 0; i < it.words.length; i++) {
      if (t.indexOf(' ' + it.words[i]) >= 0 || t.indexOf(it.words[i] + ' ') >= 0) {
        hits.push({ id: it.id, w: it.words[i].length });
        return;
      }
    }
  });
  if (!hits.length) return raw.indexOf('?') >= 0 ? 'ask_sus' : 'chatter';
  hits.sort(function (a, b) { return b.w - a.w; });
  return hits[0].id;
}

/* ---------------- entity extraction ---------------- */
function parse(text, G, speaker) {
  var raw = String(text || '');
  var t = norm(raw);
  var tokens = t.split(' ').filter(Boolean);

  var nameCands = G.players.map(function (p) { return { key: p.name, id: p.id, p: p }; });
  var roomCands = G.map.rooms.map(function (r) { return { key: r.name, id: r.id, r: r }; });

  var names = [], rooms = [];
  for (var i = 0; i < tokens.length; i++) {
    /* two-word rooms first ("main hall", "upper engine") */
    if (i < tokens.length - 1) {
      var two = tokens[i] + ' ' + tokens[i + 1];
      var rm2 = bestMatch(two, roomCands, 2);
      if (rm2 && rooms.indexOf(rm2) < 0) { rooms.push(rm2); i++; continue; }
    }
    var nm = bestMatch(tokens[i], nameCands, tokens[i].length <= 4 ? 1 : 2);
    if (nm && names.indexOf(nm) < 0 && tokens[i].length >= 2) { names.push(nm); continue; }
    var rm = bestMatch(tokens[i], roomCands, 2);
    if (rm && rooms.indexOf(rm) < 0 && tokens[i].length >= 3) rooms.push(rm);
  }

  var selfRef = /\b(i|im|i'm|me|my|myself|was i)\b/.test(' ' + t + ' ');
  var negated = /\b(not|isnt|isn't|wasnt|wasn't|didnt|didn't|never|no)\b/.test(t);

  return {
    text: raw,
    intent: detect(raw),
    names: names,
    rooms: rooms,
    target: names.length ? names[0].p : null,
    room: rooms.length ? rooms[0].r : null,
    selfRef: selfRef,
    negated: negated,
    speaker: speaker
  };
}

/* ---------------- response generation ---------------- */
/* Each reply must be traceable to the bot's own memory. */
function respond(bot, q, G, meeting) {
  var M = AU.Memory;
  var me = q.speaker;
  var mem = M.mem(bot);
  if (!mem) return null;
  var suspect = M.topSuspect(bot, G, meeting);
  var cleared = M.whoIClear(bot, G);
  var conf = suspect && suspect.certain;

  switch (q.intent) {

    case 'where':
      /* addressed to me, or to nobody in particular */
      if (q.target && q.target.id !== bot.id) return null;
      return pick([
        'i was in ' + M.trailText(bot, G, 3) + '.',
        'me? ' + M.trailText(bot, G, 2) + '. doing my tasks.',
        M.trailText(bot, G, 3) + '. that is my route.'
      ]);

    case 'whosaw': {
      if (q.target && q.target.id !== bot.id) return null;
      var seenList = [];
      for (var id in mem.seen) {
        if (G.time - mem.seen[id].t < 40) {
          var sp = G.byId(id);
          if (sp) seenList.push(sp.name + ' in ' + mem.seen[id].room);
        }
      }
      if (!seenList.length) return pick(['nobody. i was on my own the whole time.',
        'i did not see a soul, which is not great for me.']);
      return 'i saw ' + seenList.slice(0, 3).join(', and ') + '.';
    }

    case 'accuse': {
      var accused = q.target;
      if (!accused) {
        if (conf) return proofLine(bot, suspect, G);
        return suspect && suspect.score > 120
          ? hedge(bot) + ' ' + G.byId(suspect.id).name + ' ' + basisPhrase(suspect, G)
          : pick(['on what though? i have not got anything.', 'i need more than that.']);
      }
      if (accused.id === bot.id) {
        /* being accused: answer with the actual route */
        return pick([
          'not me. i was in ' + M.trailText(bot, G, 2) + '.',
          'that is wrong, i was ' + M.trailText(bot, G, 2) + ' the whole time.',
          'me? no. ' + (cleared ? G.byId(cleared.id).name + ' was with me in ' + cleared.room + '.'
                                : 'i was doing tasks in ' + M.trailText(bot, G, 1) + '.')
        ]);
      }
      /* somebody else accused: agree, disagree with an alibi, or stay neutral */
      if (cleared && cleared.id === accused.id) {
        return pick([
          'no, ' + accused.name + ' was with me in ' + cleared.room + ' for a good ' + cleared.secs + ' seconds.',
          'cannot be ' + accused.name + ', i was stood next to them in ' + cleared.room + '.'
        ]);
      }
      if (conf && suspect.id === accused.id) return proofLine(bot, suspect, G);
      if (conf && suspect.id !== accused.id) {
        return 'no, it is ' + G.byId(suspect.id).name + ' — ' + proofPhrase(suspect, G) + '.';
      }
      var a = M.assess(bot, G, meeting)[accused.id];
      if (a && a.score > 140) return pick([
        'yeah i am with you, ' + accused.name + ' ' + basisPhrase(a, G),
        'agreed. ' + accused.name + ' ' + basisPhrase(a, G)
      ]);
      if (a && a.score < -100) return accused.name + ' seems fine to me, ' + basisPhrase(a, G);
      return pick([
        'maybe. i have not seen enough of ' + accused.name + ' to say.',
        'i cannot confirm that one way or the other.',
        'possibly, but that is a guess not a read.'
      ]);
    }

    case 'defend': {
      /* the speaker is defending themselves */
      if (!me) return null;
      var view = M.assess(bot, G, meeting)[me.id];
      if (view && view.certain) return 'you would say that. ' + proofPhrase(view, G) + '.';
      if (cleared && cleared.id === me.id)
        return 'they are telling the truth, ' + me.name + ' was with me in ' + cleared.room + '.';
      if (view && view.score > 140) return 'then say where you were, because ' + basisPhrase(view, G);
      return pick(['alright, i believe you for now.', 'fine. then who do you like for it?',
                   'ok, but somebody is lying.']);
    }

    case 'clear': {
      if (!q.target) return null;
      var v = M.assess(bot, G, meeting)[q.target.id];
      if (v && v.certain) return 'you cannot clear ' + q.target.name + ' — ' + proofPhrase(v, G) + '.';
      if (cleared && cleared.id === q.target.id) return 'i can back that up, they were with me in ' + cleared.room + '.';
      return pick(['on your word alone? alright.', 'noted, but i did not see that myself.']);
    }

    case 'where_body': {
      var br = meeting && meeting.bodyRoom;
      var foundBody = null;
      for (var i = 0; i < mem.proof.length; i++) if (mem.proof[i].kind === 'body') foundBody = mem.proof[i];
      if (foundBody) return 'the body was in ' + foundBody.room + ', i saw it.';
      if (br) return 'they said ' + br + '. i was not there.';
      return 'i did not see the body myself.';
    }

    case 'vote': {
      if (q.target) {
        if (cleared && cleared.id === q.target.id) return 'do not, ' + q.target.name + ' was with me.';
        if (conf && suspect.id !== q.target.id)
          return 'vote ' + G.byId(suspect.id).name + ' instead, ' + proofPhrase(suspect, G) + '.';
        var vv = M.assess(bot, G, meeting)[q.target.id];
        if (vv && vv.score > 100) return 'yeah, i will vote ' + q.target.name + '.';
        return chance(0.5) ? 'i am not sure enough to vote ' + q.target.name + '.'
                           : 'alright, ' + q.target.name + ' then.';
      }
      return conf ? 'vote ' + G.byId(suspect.id).name + ', ' + proofPhrase(suspect, G) + '.'
                  : 'i would rather skip than guess.';
    }

    case 'skip':
      if (conf) return 'no, do not skip — ' + proofPhrase(suspect, G) + '.';
      return pick(['agreed, skip.', 'yeah, nothing solid here.', 'skip and watch each other.']);

    case 'report':
      if (q.room && q.target === null) {
        var sawThere = null;
        for (var id2 in mem.seen) {
          if (mem.seen[id2].room === q.room.name && me && id2 === me.id) sawThere = true;
        }
        if (sawThere) return 'yeah i saw you in ' + q.room.name + ', that checks out.';
        if (mem.seen[me && me.id] ) return 'i saw you, but not in ' + q.room.name + '.';
        return chance(0.5) ? 'i cannot confirm that, i was in ' + M.trailText(bot, G, 1) + '.' : null;
      }
      return null;

    case 'ask_sus':
      if (conf) return proofLine(bot, suspect, G);
      if (suspect && suspect.score > 120)
        return hedge(bot) + ' ' + G.byId(suspect.id).name + ' ' + basisPhrase(suspect, G);
      if (cleared) return 'no idea, but ' + G.byId(cleared.id).name + ' is clear, they were with me in ' + cleared.room + '.';
      return pick(['honestly no clue yet.', 'i have got nothing solid.', 'i was heads down on tasks, sorry.']);

    case 'greet':
      if (conf && chance(0.5)) return proofLine(bot, suspect, G);
      return chance(0.4) ? pick(['hey.', 'yo.', 'alright.']) : null;

    default:
      if (conf) return proofLine(bot, suspect, G);
      return chance(0.35) ? pick(['who is actually cleared here?', 'anyone got anything real?',
        'i am listening.']) : null;
  }
}

/* ---------------- phrasing helpers ---------------- */
function hedge(bot) {
  return pick(['i lean', 'if i had to guess,', 'weak read but', 'no proof, but i think it is',
               'gut says']);
}
function proofPhrase(view, G) {
  var d = view.detail || {};
  if (d.kind === 'kill') {
    var v = d.victim ? G.byId(d.victim) : null;
    return 'i watched them kill ' + (v ? v.name : 'someone') + ' in ' + d.room;
  }
  if (d.kind === 'vent') return 'i saw them climb out of the vent in ' + d.room;
  if (d.kind === 'nearbody') return 'i saw them standing over the body in ' + d.room;
  if (d.kind === 'nearscene') return 'they were in ' + d.room + ' right when it happened';
  if (d.kind === 'unseen') return 'nobody has seen them for ' + d.secs + ' seconds';
  if (d.kind === 'alibi') return 'they were with me in ' + d.room;
  return 'something is off about them';
}
function basisPhrase(view, G) {
  var d = view.detail || {};
  if (view.basis === 'proof') return proofPhrase(view, G) + '.';
  if (view.basis === 'alibi') return 'they were with me in ' + (d.room || 'the same room') + '.';
  if (view.basis === 'hearsay') {
    var f = d.from ? G.byId(d.from) : null;
    return 'well, ' + (f ? f.name : 'someone') + ' said so — i did not see it.';
  }
  if (d.kind === 'unseen') return 'has been off on their own the whole round.';
  if (d.kind === 'nearscene') return 'was around ' + d.room + ' at the wrong moment.';
  return 'just feels off, that is all i have.';
}
function proofLine(bot, suspect, G) {
  var name = G.byId(suspect.id);
  if (!name) return null;
  return pick([
    'it is ' + name.name + '. ' + proofPhrase(suspect, G) + '.',
    proofPhrase(suspect, G).replace('them', name.name) + '. it is ' + name.name + '.',
    name.name + ' — ' + proofPhrase(suspect, G) + '. i am certain.'
  ]);
}

/* ---------------- unprompted lines ---------------- */
/* What a bot volunteers when nobody has asked it anything. */
function volunteer(bot, G, meeting) {
  var M = AU.Memory;
  var suspect = M.topSuspect(bot, G, meeting);
  var cleared = M.whoIClear(bot, G);

  if (suspect && suspect.certain) return proofLine(bot, suspect, G);
  if (bot.team === 'impostor') return impostorLine(bot, G, meeting, suspect);
  if (cleared && chance(0.35))
    return G.byId(cleared.id).name + ' is clear, we were together in ' + cleared.room + '.';
  if (suspect && suspect.score > 130 && chance(0.75))
    return hedge(bot) + ' ' + G.byId(suspect.id).name + ' — ' + basisPhrase(suspect, G);
  return pick([
    'i was in ' + M.trailText(bot, G, 2) + ', nothing to report.',
    'where was the body?',
    'anyone actually see anything, or are we guessing?',
    'i have got no read at all this round.',
    'who is everyone with?'
  ]);
}

/* Impostors lie, but plausibly — they cite real rooms they really walked. */
function impostorLine(bot, G, meeting, suspect) {
  var M = AU.Memory;
  var crew = G.players.filter(function (p) { return p.alive && p.team !== 'impostor' && p.id !== bot.id; });
  if (!crew.length) return 'skip.';
  var mark = pick(crew);
  return pick([
    'i was in ' + M.trailText(bot, G, 2) + ' the whole time.',
    mark.name + ' has been very quiet.',
    'i did not see anything, i was on tasks in ' + M.trailText(bot, G, 1) + '.',
    'where was everyone? i was ' + M.trailText(bot, G, 2) + '.',
    mark.name + ' came from that direction, did anyone else see that?',
    'skip this one, we are guessing.'
  ]);
}

/* ---------------- contextual quick chat for the player ---------------- */
function quickOptions(G, meeting) {
  var me = G.me();
  var others = G.players.filter(function (p) { return p.alive && p.id !== me.id; });
  var opts = ['Where were you?', 'Who did you see?', 'Anyone got proof?', 'Skip', 'I was doing tasks'];
  var room = G.layout.roomAt(me.x, me.z);
  if (meeting && meeting.bodyRoom) opts.push('Where was the body?');
  if (room) opts.push('I was in ' + room.name);
  others.slice(0, 4).forEach(function (p) {
    opts.push(p.name + ' is sus');
    opts.push('Where were you ' + p.name + '?');
  });
  if (others.length) {
    opts.push('I can clear ' + others[0].name);
    opts.push('I saw ' + others[0].name + ' vent');
    opts.push('Vote ' + others[0].name);
  }
  opts.push('Not me', 'It was a self report');
  return opts;
}

/* A bot spoken to by name always says something back. */
function fallback(bot, q, G, meeting) {
  var M = AU.Memory;
  var sus = M.topSuspect(bot, G, meeting);
  var cleared = M.whoIClear(bot, G);
  var who = q.speaker ? q.speaker.name.toLowerCase() : '';
  if (sus && sus.certain) return proofLine(bot, sus, G);
  switch (q.intent) {
    case 'where':   return 'i was in ' + M.trailText(bot, G, 3) + '.';
    case 'whosaw':  return cleared
      ? 'only ' + G.byId(cleared.id).name + ', we were in ' + cleared.room + '.'
      : 'nobody, i was on my own.';
    case 'vote':
    case 'skip':    return chance(0.5) ? 'i am fine either way.' : 'sure.';
    case 'accuse':  return 'i cannot back that up, i was in ' + M.trailText(bot, G, 1) + '.';
    case 'clear':   return 'i did not see that myself.';
    default:        return pick([
      'i was in ' + M.trailText(bot, G, 2) + ', that is all i have.',
      'nothing solid from me, sorry.',
      'ask me something specific and i will answer.'
    ]);
  }
}

function hasProof(bot, G, meeting) {
  var sus = AU.Memory.topSuspect(bot, G, meeting);
  return !!(sus && sus.certain);
}

AU.Chat = {
  hasProof: hasProof,
  fallback: fallback,
  parse: parse,
  respond: respond,
  volunteer: volunteer,
  quickOptions: quickOptions,
  detect: detect
};

})(window.AU);
