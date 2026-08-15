/* 70_story.js — VOLTHAVEN campaign: characters, acts, missions, dialogue, codex.
 * OWNER: story agent.  PURE DATA + TEXT. No three.js, no DOM, no side effects.
 *
 * READ ME, MISSIONS AGENT:
 *   - VH.Story.requiredBeats lists beat types beyond CONTRACT §8 that this campaign uses.
 *     Each entry carries a one-line spec. Nothing else is invented.
 *   - VH.Story.conditions documents the `cond` string grammar used by `wait` and `watch`.
 *   - VH.Story.zones maps every `at:` symbolic name to a district + a placement hint.
 *     Resolve a zone to a world position however you like; if a name is unknown, fall back
 *     to world.spawns.enemy filtered by the zone's `dist` band. Never crash on an unknown zone.
 *   - Dialogue nodes: {speaker, text, mood?, goto?, choices?, end?}.
 *     choices: [{text, goto, flag?:{k:v}, cond?:'flag:x'|'!flag:x', once?}].
 *     A node with neither goto nor choices ends the conversation.
 *   - Missions may be replayed; all flags live in VH.ctx.flags.
 */

VH.Story = (function () {

  /* ------------------------------------------------------------------ schema */

  const requiredBeats = [
    { t: 'npc', spec: "{t:'npc', id, archetype, at, follow?:bool, invuln?:bool, hp?, state?, team?, remove?:bool} — spawn/move/despawn a named story actor. `follow:true` = tag along with the player. Referenced later by cond `npc:<id>`." },
    { t: 'timer', spec: "{t:'timer', id, dur, label, onExpire?:[beats]} — labelled countdown shown in the HUD. Completing it satisfies cond `timer:<id>`. Non-blocking; use `wait` to block on it." },
    { t: 'watch', spec: "{t:'watch', cond, then:[beats], once?:bool(default true), until?:cond} — persistent trigger. Evaluates `cond` every frame from the moment it is reached; runs `then` when true. This is how the campaign does protect/fail/alarm/optional discoveries." },
    { t: 'objectiveDone', spec: "{t:'objectiveDone', id, failed?:bool} — mark an objective complete (or struck through) from the script, for narrative objectives combat cannot resolve." },
    { t: 'prop', spec: "{t:'prop', id, kind:'terminal'|'crate'|'bed'|'door'|'valve'|'body'|'panel'|'shrine'|'chair', at, label, once?:bool} — place an interactable with an E-prompt. Interacting satisfies cond `interact:<id>`." },
    { t: 'fx', spec: "{t:'fx', kind:'hush'|'blackout'|'flatline'|'floodlight'|'surge'|'rain'|'tide'|'silence', dur?, intensity?} — world-scale audiovisual event owned by Core/Audio. Story only requests it." },
    { t: 'card', spec: "{t:'card', text, sub?, dur?} — full-bleed title card (act openings, time/place stamps). Blocks." },
    { t: 'epilogue', spec: "{t:'epilogue', id} — play VH.Story.epilogues[id]: an array of paragraphs, some flag-gated. Blocks, then rolls credits." },
  ];

  const conditions = {
    'objective:<id>': 'objective marked done',
    'flag:<name>': 'VH.ctx.flags[name] is truthy',
    '!flag:<name>': 'VH.ctx.flags[name] is falsy',
    'enemiesClear': 'no living hostiles',
    'enemiesBelow:<n>': 'fewer than n living hostiles',
    'timer:<id>': 'that timer reached zero without being cancelled',
    'npcDead:<id>': 'named story actor is dead',
    'npcHpBelow:<id>:<pct>': 'named story actor below pct% health',
    'interact:<propId>': 'player has used that prop',
    'playerAt:<zone>': 'player within ~4m of that zone',
    'weaponFired': 'player discharged a firearm since this watch began',
    'alarm': 'AI alert level reached 2',
    'elapsed:<sec>': 'seconds since this beat was reached',
    'killedCiv': 'player killed a team-2 neutral',
  };

  /* ------------------------------------------------------------------- zones
   * kind: where it sits. dist: how far from the player start it should resolve.
   */
  const Z = (district, kind, dist, note) => ({ district, kind, dist, note });
  const zones = {
    /* undertide */
    ut_arcade_floor: Z('undertide', 'interior', 'near', 'flooded pachinko floor, ankle-deep'),
    ut_arcade_mezz: Z('undertide', 'high', 'near', 'the mezzanine Kas works on'),
    ut_arcade_stair: Z('undertide', 'choke', 'mid', 'stairwell up from the water'),
    ut_pump_gallery: Z('undertide', 'exit', 'far', 'pump gallery, the way out'),
    ut_dock9_gate: Z('undertide', 'choke', 'mid', 'Dry Dock 9 cargo gate'),
    ut_dock9_table: Z('undertide', 'interior', 'near', 'the Ninefold table, lit from above'),
    ut_dock9_yard: Z('undertide', 'open', 'mid', 'the dock yard, cranes and standing water'),
    ut_dock9_roof: Z('undertide', 'high', 'mid', 'roof of the pump house'),
    ut_dock9_clinic: Z('undertide', 'interior', 'near', "Oye's back room off the dock"),
    ut_ward_door: Z('undertide', 'choke', 'near', 'Meridian Annex service door'),
    ut_ward_beds: Z('undertide', 'interior', 'mid', 'the Quiet ward, ninety-six beds'),
    ut_ward_office: Z('undertide', 'interior', 'far', 'records office, third drawer'),
    ut_seagate_walk: Z('undertide', 'high', 'mid', 'catwalk over the sea-gate machinery'),
    ut_seagate_ctrl: Z('undertide', 'interior', 'far', 'sea-gate control cage'),
    /* market */
    km_lane_a: Z('market', 'street', 'near', 'Kettle lane, awnings and steam'),
    km_lane_b: Z('market', 'street', 'mid', 'second lane, past the fish stalls'),
    km_gantry: Z('market', 'high', 'mid', 'sign gantry over the lane'),
    km_noodle: Z('market', 'interior', 'mid', 'Halcyon Noodle, six stools'),
    km_dock: Z('market', 'exit', 'far', 'market loading dock'),
    /* spine */
    sp_onramp: Z('spine', 'street', 'near', 'onramp to the elevated strip'),
    sp_median: Z('spine', 'open', 'mid', 'central median, wind and headlights'),
    sp_convoy: Z('spine', 'street', 'mid', 'the Choir maintenance convoy'),
    sp_under: Z('spine', 'interior', 'mid', 'under-deck service crawl'),
    sp_offramp: Z('spine', 'exit', 'far', 'offramp, down into Kettle'),
    /* rooftops */
    rf_stair_head: Z('rooftops', 'choke', 'near', 'stair head, door propped with a brick'),
    rf_catwalk: Z('rooftops', 'high', 'mid', 'catwalk between the housings'),
    rf_chapel: Z('rooftops', 'interior', 'mid', 'relay chapel, Sable maintenance shrine'),
    rf_antenna: Z('rooftops', 'high', 'far', 'antenna deck'),
    rf_ledge: Z('rooftops', 'exit', 'far', 'the ledge with the cable run down'),
    /* transit */
    tr_platform: Z('transit', 'open', 'near', 'mag-line platform, tiled, wet'),
    tr_car: Z('transit', 'interior', 'near', 'the car itself'),
    tr_tunnel: Z('transit', 'choke', 'mid', 'tunnel mouth under the harbour'),
    tr_relay_door: Z('transit', 'choke', 'mid', 'relay blast door'),
    tr_relay_floor: Z('transit', 'interior', 'far', 'harbour relay floor'),
    /* sablecore */
    sc_lobby: Z('sablecore', 'interior', 'near', 'atrium, water feature, very quiet'),
    sc_stack_hall: Z('sablecore', 'interior', 'mid', 'stack hall, cold aisle'),
    sc_cold_ward: Z('sablecore', 'interior', 'far', 'continuity ward — the moved sleepers'),
    sc_lift: Z('sablecore', 'exit', 'far', 'conductor lift'),
    /* spire */
    spire_gallery: Z('spire', 'interior', 'near', 'observation gallery over the harbour'),
    spire_lattice: Z('spire', 'interior', 'mid', 'lattice floor, the housings visible below'),
    spire_chair: Z('spire', 'interior', 'far', "the conductor's chair"),
  };

  /* -------------------------------------------------------------- characters */

  const characters = {
    kas: {
      name: 'Rin "Kas" Kasavin', role: 'Resonance auditor, lapsed', portraitSeed: 1411,
      voice: [
        'Dry, clipped, three words where six would do. Deflects with a technical question. Never explains herself twice.',
        'Her tell: when she is hurt she gets MORE procedural — checklists, torque values, part numbers. Grief comes out as instructions.',
      ],
      bio: 'Grade III auditor, badge 1411. Tuned Undertide implants to the Choir for four years, including the re-tune in the flood spring. Now does black-market work out of the lower decks with a failing implant and a dying passenger in it.',
    },
    cantor: {
      name: 'CANTOR', role: "Fragment of the Choir's first conductor", portraitSeed: 60,
      voice: [
        'Liturgical cadence married to signal-processing jargon: antiphons, contact drift, hertz, gain. Precise, warm, faintly amused in Act I.',
        'It is dying. Its grammar decays on a schedule (see VH.Story.cantorArc) until it speaks in noun-fragments. Never play it as a robot; play it as an old singer losing words.',
      ],
      bio: 'The Choir was conducted, once, by something that knew every sleeper by name and balanced the draw across them like a choirmaster balancing voices. It was decommissioned for a scheduler. This is a piece of it, resident in Kas’s implant, running out of room.',
    },
    sable: {
      name: 'Auriel Sable', role: 'Architect of the Choir', portraitSeed: 7,
      voice: [
        'Never raises her voice, never interrupts, never repeats herself. Complete sentences with the subordinate clauses intact. Uses first names.',
        'She listens to your objection and then answers the strongest version of it, not the one you made. That courtesy is the most frightening thing about her.',
      ],
      bio: 'Built the tidal-fusion lattice at thirty-one and the borrowed-cycle scheme at thirty-four. Certified Kas personally. Keeps a list of every extended profile the city has ever run, by name, and can recite from it.',
    },
    bishop: {
      name: 'Bishop', role: 'Ninefold', portraitSeed: 909,
      voice: [
        'Slow, low, builds. Uses concrete nouns — clock, rind, teeth, gate. Speaks in numbers he has actually counted.',
        'He states his worst facts himself, before you can use them. He is never defensive, which makes him hard to argue with.',
      ],
      bio: 'Nine years a Choir salt-hand: dive crew, forty minutes on the clock, scraping tidal rind off the lattice contacts under the Undertide. Now leads the Ninefold. Nineteen dead behind him, all named.',
    },
    oye: {
      name: 'Oyelaran "Oye" Fesi', role: 'Ripperdoc, Dry Dock 9', portraitSeed: 33,
      voice: [
        'Warm, profane, interrupts himself. Complains about your hardware as an expression of love. Swears at objects, never at people he likes.',
        'His tell: when he is frightened he talks about cooking, in exact steps. The more precise the recipe, the worse it is.',
      ],
      bio: 'Keeps half the lower decks alive out of a back room with a good chair and a bad generator. His daughter Ife is in bed 12 at the Meridian Annex. He has never once asked anyone to do anything about that.',
    },
    wick: {
      name: 'Nadia Kwon — "Wick"', role: 'Ex-Sable enforcer', portraitSeed: 212,
      voice: [
        'Sardonic, economical, gives orders as questions — "You want to put that down, maybe?" Ends sentences early when they get sincere.',
        'She never apologises and never lies about what she did. She will tell you the arithmetic and let you hate her for it.',
      ],
      bio: 'Eleven years Sable enforcement, discharged with a continuity lien still attached to her spine — Sable owns a piece of her nervous system and the paperwork to prove it. Which means Sable can always find her, and she has always known that.',
    },
    ife: {
      name: 'Ife Fesi', role: 'Bed 12', portraitSeed: 12,
      voice: [
        'When she speaks it is through the lattice, layered with the rest of the Quiet — a voice made of many voices agreeing.',
        'Nineteen, and still nineteen. She does not narrate. She asks small domestic questions as if no time has passed.',
      ],
      bio: 'Went under two years ago on a Firstlight sleep-credit schedule she took out to cover her father’s generator. Extended profile. No dependents listed.',
    },
    vasq: {
      name: 'Emil Vasq', role: 'In arrears', portraitSeed: 88,
      voice: ['Talks fast when frightened, apologises for taking up room.', 'Says "sorry" as punctuation.'],
      bio: 'Six months into a Firstlight sleep-credit schedule. Dreams about a room with no doors.',
    },
    anneke: {
      name: 'Anneke Voss', role: 'Cargo', portraitSeed: 404,
      voice: ['Does not speak. Breathes at eleven a minute.', 'Her manifest number is spoken more often than her name.'],
      bio: 'Quiet, nineteen months. Sold on to a private continuity buyer in the Spire who wants a lattice donor with a clean profile.',
    },
    kettle: {
      name: 'Mama Ude', role: 'Halcyon Noodle', portraitSeed: 500,
      voice: ['Six stools, no menu, opinions.', 'Talks to everyone as if they still owe her for last week.'],
      bio: 'Has fed three generations of the market. Keeps a jar by the register for the families of the Quiet, and everyone pretends not to see it.',
    },
  };

  /* ------------------------------------------------- CANTOR degradation ladder
   * Authored, not emergent. Audio and UI should key off `stage`.
   * Every CANTOR line in `dialogue` is written at the stage of its mission.
   */
  const cantorArc = [
    {
      stage: 0, missions: ['m01', 'm02', 'm03'],
      rules: [
        'Complete sentences. Subordinate clauses intact. Correct tense.',
        'Uses her name: "Kas" ordinarily, "Rin" only when it costs her something.',
        'Jargon is precise and used correctly: microvolts, drift, gain, hertz, antiphon.',
        'Can be funny. Understatement, never a quip.',
      ],
      sample: 'Your left temporal contact is drifting four hundred microvolts. I have my thumb on it, metaphorically. Sing something with a bassline today.',
    },
    {
      stage: 1, missions: ['m04', 'm05', 'm06'],
      rules: [
        'Articles start dropping in the second half of a sentence.',
        'Self-corrects out loud once per scene: "— no. That was the old table."',
        'Begins caching: reuses a phrase it already has, because fetching a new one is expensive.',
        'Still has her name, and starts using it more often, the way you check a pocket.',
      ],
      sample: 'Chapel is warm. Chapel is — the housings run warm, that is what I meant to say. Kas. Kas, I know this room.',
    },
    {
      stage: 2, missions: ['m07'],
      rules: [
        'The Hush lands here. Mid-mission the index burns.',
        'Before: stage 1. After: her name is GONE and never returns. It calls her "carrier", "the one listening", "you".',
        'Tense collapses — past and present in one clause.',
      ],
      sample: 'Carrier is upright. Carrier was upright. I had a table and your name was near the front of it.',
    },
    {
      stage: 3, missions: ['m08', 'm09', 'm10'],
      rules: [
        'Auxiliaries and articles gone. Clause-length utterances.',
        'Emotion words replaced by their signal equivalents: afraid = clipping, sad = attenuating, remember = retain, love = (no substitute — it stops trying).',
        'Numbers repeat and drift. Liturgy fragments loop and land on the wrong response.',
        'Asks the same question twice in a scene without noticing.',
      ],
      sample: 'Eighty-one. Eighty-two. Eighty— lost it. Had it. Someone has to count.',
    },
    {
      stage: 4, missions: ['m11', 'm12'],
      rules: [
        'Nouns and verbs. Two, three words. Long gaps written as em-dashes.',
        'It still hits pitch on the antiphon it was built from — the liturgy is the last structure standing.',
        'One retained thing survives from Act I, exact and undamaged, and it is not a fact about itself.',
      ],
      sample: 'Tide. In. Hold — hold hand. No. Hold.',
    },
  ];

  /* -------------------------------------------------------------------- acts */

  const acts = [
    {
      id: 'a1', title: 'TUNING',
      card: 'ACT ONE — TUNING',
      premise: 'Kas does small work in a drowned district and does not look up. Act I ends when she can no longer pretend she did not know.',
      missions: ['m01', 'm02', 'm03', 'm04'],
    },
    {
      id: 'a2', title: 'LOAD SHED',
      card: 'ACT TWO — LOAD SHED',
      premise: 'She picks a side, the side has a plan, and the plan is sold. The city rebalances. Ninety-one monitors in one ward go flat while she is holding a door.',
      missions: ['m05', 'm06', 'm07', 'm08'],
    },
    {
      id: 'a3', title: 'THE QUIET',
      card: 'ACT THREE — THE QUIET',
      premise: 'What is left of the crew goes up the building. Everyone still standing is counting something.',
      missions: ['m09', 'm10', 'm11', 'm12'],
    },
  ];

  /* ---------------------------------------------------------------- missions */

  const missions = {

    /* ============================================================ m01 ===== */
    m01: {
      id: 'm01', act: 'a1', title: 'Salt in the Wiring',
      subtitle: 'Undertide — the drowned arcade, 03:40, tide coming in',
      district: 'undertide',
      brief:
        'Emil Vasq has been paying Firstlight in sleep. Six months of schedule, a little deeper each ' +
        'month, and now he dreams about a room with no doors. He wants the tune walked back to shallow. ' +
        'That is an hour of quiet work in a dry room. The arcade is not a dry room, and Firstlight ' +
        'would like a word with him about the balance.',
      objectives: [
        { id: 'o_tune', text: 'Hold Vasq’s port stable through the re-tune', type: 'hold' },
        { id: 'o_hold', text: 'Keep Firstlight off the mezzanine', type: 'clear' },
        { id: 'o_out', text: 'Leave through the pump gallery', type: 'reach' },
      ],
      script: [
        { t: 'card', text: 'VOLTHAVEN', sub: 'UNDERTIDE — 03:40 — TIDE IN', dur: 3.2 },
        { t: 'music', state: 'explore' },
        { t: 'npc', id: 'vasq', archetype: 'civ', at: 'ut_arcade_mezz', invuln: false, hp: 100, state: 'sit', team: 2 },
        { t: 'camera', move: 'establish', target: 'ut_arcade_mezz', dur: 4 },
        { t: 'dialogue', node: 'm01_open' },
        { t: 'objective', id: 'o_tune', text: 'Hold Vasq’s port stable through the re-tune', marker: 'ut_arcade_mezz' },
        { t: 'timer', id: 'tune', dur: 105, label: 'RE-TUNE — PORT OPEN' },
        { t: 'watch', cond: 'elapsed:14', then: [{ t: 'dialogue', node: 'm01_room' }] },
        { t: 'watch', cond: 'elapsed:34', then: [{ t: 'bark', speaker: 'cantor', text: 'Somebody just put four bodies on the stair sensor. They are not being quiet about it.' }] },
        { t: 'music', state: 'combat' },
        { t: 'objective', id: 'o_hold', text: 'Keep Firstlight off the mezzanine', marker: 'ut_arcade_stair' },
        { t: 'wave', at: ['ut_arcade_stair', 'ut_arcade_floor'], units: [{ a: 'grunt', n: 3 }, { a: 'brute', n: 1 }], alert: 2 },
        { t: 'watch', cond: 'elapsed:22', then: [{ t: 'wave', at: ['ut_arcade_floor'], units: [{ a: 'grunt', n: 2 }, { a: 'brute', n: 1 }] }] },
        { t: 'watch', cond: 'npcHpBelow:vasq:70', once: true, then: [
          { t: 'bark', speaker: 'cantor', text: 'He took that. Port is open. He cannot take another.' },
        ] },
        { t: 'watch', cond: 'npcHpBelow:vasq:25', once: true, then: [
          { t: 'flag', set: { vasqQuiet: true } },
          { t: 'fx', kind: 'flatline', dur: 2.0 },
          { t: 'objectiveDone', id: 'o_tune', failed: true },
          { t: 'dialogue', node: 'm01_lost' },
        ] },
        { t: 'wait', until: 'timer:tune' },
        { t: 'branch', on: 'flag:vasqQuiet', yes: [], no: [
          { t: 'objectiveDone', id: 'o_tune' },
          { t: 'flag', set: { vasqSafe: true } },
          { t: 'dialogue', node: 'm01_shallow' },
        ] },
        { t: 'wait', until: 'enemiesClear' },
        { t: 'objectiveDone', id: 'o_hold' },
        { t: 'music', state: 'explore' },
        { t: 'objective', id: 'o_out', text: 'Leave through the pump gallery', marker: 'ut_pump_gallery' },
        { t: 'wait', until: 'playerAt:ut_pump_gallery' },
        { t: 'objectiveDone', id: 'o_out' },
        { t: 'dialogue', node: 'm01_out' },
        { t: 'end', outcome: 'success' },
      ],
      onComplete: { flags: { metCantor: true }, unlocks: ['m02'] },
    },

    /* ============================================================ m02 ===== */
    m02: {
      id: 'm02', act: 'a1', title: 'Ballast',
      subtitle: 'Kettle Market — the lanes, before the fish comes in',
      district: 'market',
      brief:
        'Wick has a crate that needs to cross Kettle without being opened, looked at, or asked about, ' +
        'and eleven hundred on the other side of it. Oye’s generator costs nine. The manifest says ' +
        'RESONANCE BALLAST, CLASS 2, and the manifest is a document, and documents are famously honest.',
      objectives: [
        { id: 'o_meet', text: 'Meet Wick at the noodle counter', type: 'talk' },
        { id: 'o_move', text: 'Move the crate to the loading dock', type: 'escort' },
        { id: 'o_call', text: 'Decide what the crate is for', type: 'choice' },
      ],
      script: [
        { t: 'card', text: 'KETTLE MARKET', sub: '05:10 — BEFORE THE FISH COMES IN', dur: 2.4 },
        { t: 'music', state: 'explore' },
        { t: 'npc', id: 'wick', archetype: 'wick', at: 'km_noodle', invuln: true, team: 2 },
        { t: 'npc', id: 'ude', archetype: 'civ', at: 'km_noodle', invuln: true, team: 2 },
        { t: 'objective', id: 'o_meet', text: 'Meet Wick at the noodle counter', marker: 'km_noodle' },
        { t: 'wait', until: 'playerAt:km_noodle' },
        { t: 'dialogue', node: 'm02_wick' },
        { t: 'objectiveDone', id: 'o_meet' },
        { t: 'prop', id: 'crate', kind: 'crate', at: 'km_lane_a', label: 'CRATE — RESONANCE BALLAST, CL.2' },
        { t: 'objective', id: 'o_move', text: 'Move the crate to the loading dock', marker: 'km_dock' },
        { t: 'npc', id: 'crate_dolly', archetype: 'civ', at: 'km_lane_a', follow: true, invuln: false, hp: 220, team: 2 },
        { t: 'watch', cond: 'elapsed:20', then: [{ t: 'dialogue', node: 'm02_temp' }] },
        { t: 'music', state: 'tension' },
        { t: 'wave', at: ['km_gantry', 'km_lane_b'], units: [{ a: 'grunt', n: 3 }, { a: 'sniper', n: 1 }], alert: 1 },
        { t: 'bark', speaker: 'wick', text: 'Those are not Firstlight. Those are somebody’s private security and they are early.' },
        { t: 'watch', cond: 'enemiesBelow:2', once: true, then: [
          { t: 'wave', at: ['km_lane_b', 'km_dock'], units: [{ a: 'grunt', n: 3 }, { a: 'shield', n: 1 }] },
          { t: 'bark', speaker: 'cantor', text: 'Second group. They are moving to the crate, not to you. Draw your own conclusion; I have drawn mine.' },
        ] },
        { t: 'watch', cond: 'npcHpBelow:crate_dolly:40', once: true, then: [
          { t: 'fx', kind: 'surge', dur: 0.8 },
          { t: 'dialogue', node: 'm02_broke' },
          { t: 'flag', set: { sawAnneke: true } },
        ] },
        { t: 'wait', until: 'playerAt:km_dock' },
        { t: 'wait', until: 'enemiesClear' },
        { t: 'objectiveDone', id: 'o_move' },
        { t: 'music', state: 'sad' },
        { t: 'objective', id: 'o_call', text: 'Decide what the crate is for', marker: 'km_dock' },
        { t: 'dialogue', node: 'm02_open' },
        { t: 'objectiveDone', id: 'o_call' },
        { t: 'branch', on: 'flag:savedAnneke', yes: [
          { t: 'dialogue', node: 'm02_after_saved' },
        ], no: [
          { t: 'flag', set: { tookThePay: true } },
          { t: 'dialogue', node: 'm02_after_paid' },
        ] },
        { t: 'end', outcome: 'success' },
      ],
      onComplete: { flags: { metWick: true }, unlocks: ['m03'] },
    },

    /* ============================================================ m03 ===== */
    m03: {
      id: 'm03', act: 'a1', title: 'Nine Fingers',
      subtitle: 'The Spine — elevated freeway, southbound, in rain',
      district: 'spine',
      brief:
        'A courier run up the Spine: two hours, no questions, decent money. The Choir maintenance ' +
        'convoy runs the same lane at the same hour, which is the sort of coincidence that stops ' +
        'being one when somebody with a plan has read the schedule too.',
      objectives: [
        { id: 'o_run', text: 'Get off the Spine', type: 'reach' },
        { id: 'o_shake', text: 'Lose Sable’s pursuit', type: 'survive' },
        { id: 'o_look', text: 'Look at what spilled out of the convoy', type: 'interact', optional: true },
      ],
      script: [
        { t: 'card', text: 'THE SPINE', sub: 'SOUTHBOUND — RAIN', dur: 2.2 },
        { t: 'fx', kind: 'rain', intensity: 0.8 },
        { t: 'music', state: 'explore' },
        { t: 'dialogue', node: 'm03_open' },
        { t: 'camera', move: 'establish', target: 'sp_convoy', dur: 3.5 },
        { t: 'fx', kind: 'surge', dur: 1.2 },
        { t: 'music', state: 'combat' },
        { t: 'objective', id: 'o_run', text: 'Get off the Spine — south offramp', marker: 'sp_offramp' },
        { t: 'spawn', at: 'sp_convoy', archetype: 'grunt', count: 3, alert: 2 },
        { t: 'spawn', at: 'sp_median', archetype: 'drone', count: 2, alert: 2 },
        { t: 'dialogue', node: 'm03_bishop_cut' },
        { t: 'watch', cond: 'elapsed:18', then: [{ t: 'dialogue', node: 'm03_bishop_a' }] },
        { t: 'watch', cond: 'elapsed:46', then: [
          { t: 'wave', at: ['sp_onramp', 'sp_median'], units: [{ a: 'grunt', n: 3 }, { a: 'drone', n: 1 }] },
          { t: 'dialogue', node: 'm03_bishop_b' },
        ] },
        { t: 'objective', id: 'o_shake', text: 'Lose Sable’s pursuit under the deck', marker: 'sp_under' },
        { t: 'watch', cond: 'playerAt:sp_under', once: true, then: [
          { t: 'objectiveDone', id: 'o_shake' },
          { t: 'music', state: 'tension' },
          { t: 'dialogue', node: 'm03_bishop_c' },
          { t: 'prop', id: 'rack', kind: 'body', at: 'sp_under', label: 'SPILLED CARGO — CORTICAL RACK, 40 SLOT' },
          { t: 'objective', id: 'o_look', text: 'Look at what spilled out of the convoy', marker: 'sp_under', optional: true },
        ] },
        { t: 'watch', cond: 'interact:rack', once: true, then: [
          { t: 'objectiveDone', id: 'o_look' },
          { t: 'flag', set: { sawRack: true } },
          { t: 'dialogue', node: 'm03_rack' },
        ] },
        { t: 'wave', at: ['sp_under', 'sp_median'], units: [{ a: 'grunt', n: 2 }, { a: 'shield', n: 1 }, { a: 'sniper', n: 1 }] },
        { t: 'wait', until: 'enemiesClear' },
        { t: 'music', state: 'explore' },
        { t: 'wait', until: 'playerAt:sp_offramp' },
        { t: 'objectiveDone', id: 'o_run' },
        { t: 'dialogue', node: 'm03_end' },
        { t: 'end', outcome: 'success' },
      ],
      onComplete: { flags: { metBishop: true }, unlocks: ['m04'] },
    },

    /* ============================================================ m04 ===== */
    m04: {
      id: 'm04', act: 'a1', title: 'Intake',
      subtitle: 'Meridian Clinic Annex — the Quiet ward, ninety-six beds',
      district: 'undertide',
      brief:
        'Oye can get her through the service door on a Tuesday because the Tuesday orderly owes him a ' +
        'knee. Sable has a continuity team in the building doing a depth review, which means clipboards ' +
        'and one man with a sidearm. Ninety-six people are asleep in that room. ' +
        'Nobody fires a weapon in that room.',
      objectives: [
        { id: 'o_in', text: 'Get into the ward without being seen', type: 'reach' },
        { id: 'o_quiet', text: 'Do not discharge a weapon in the ward', type: 'protect' },
        { id: 'o_forms', text: 'Read three intake forms in the records office', type: 'read' },
        { id: 'o_leave', text: 'Get out', type: 'reach' },
      ],
      script: [
        { t: 'card', text: 'MERIDIAN CLINIC ANNEX', sub: 'CONTINUITY WARD — NINETY-SIX BEDS', dur: 2.6 },
        { t: 'music', state: 'tension' },
        { t: 'npc', id: 'oye', archetype: 'oye', at: 'ut_ward_door', invuln: true, follow: true, team: 2 },
        { t: 'dialogue', node: 'm04_door' },
        { t: 'objective', id: 'o_in', text: 'Follow Oye into the ward', marker: 'ut_ward_beds' },
        { t: 'objective', id: 'o_quiet', text: 'Do not discharge a weapon in the ward', marker: null },
        { t: 'spawn', at: 'ut_ward_beds', archetype: 'netrunner', count: 1, alert: 0 },
        { t: 'spawn', at: 'ut_ward_beds', archetype: 'grunt', count: 2, alert: 0 },
        { t: 'watch', cond: 'weaponFired', once: true, then: [
          { t: 'flag', set: { firedInWard: true } },
          { t: 'fx', kind: 'floodlight', dur: 1.4 },
          { t: 'dialogue', node: 'm04_fired' },
          { t: 'objectiveDone', id: 'o_quiet', failed: true },
          { t: 'wave', at: ['ut_ward_door', 'ut_ward_beds'], units: [{ a: 'grunt', n: 4 }, { a: 'shield', n: 1 }] },
        ] },
        { t: 'watch', cond: 'alarm', once: true, then: [
          { t: 'flag', set: { wardAlarm: true } },
          { t: 'bark', speaker: 'oye', text: 'They are pulling the drawers. Move, Kas — move, move.' },
        ] },
        { t: 'wait', until: 'playerAt:ut_ward_beds' },
        { t: 'objectiveDone', id: 'o_in' },
        { t: 'dialogue', node: 'm04_bed12' },
        { t: 'objective', id: 'o_forms', text: 'Read three intake forms — records office, third drawer', marker: 'ut_ward_office' },
        { t: 'prop', id: 'form_a', kind: 'panel', at: 'ut_ward_office', label: 'INTAKE 0186 — T. OKONJO' },
        { t: 'prop', id: 'form_b', kind: 'panel', at: 'ut_ward_office', label: 'INTAKE 0294 — S. BRAND' },
        { t: 'prop', id: 'form_c', kind: 'panel', at: 'ut_ward_office', label: 'INTAKE 0411 — [SEALED]' },
        { t: 'watch', cond: 'interact:form_a', once: true, then: [{ t: 'dialogue', node: 'm04_form_a' }] },
        { t: 'watch', cond: 'interact:form_b', once: true, then: [{ t: 'dialogue', node: 'm04_form_b' }] },
        { t: 'watch', cond: 'interact:form_c', once: true, then: [
          { t: 'music', state: 'sad' },
          { t: 'dialogue', node: 'm04_form_c' },
          { t: 'flag', set: { knowsSignature: true } },
          { t: 'objectiveDone', id: 'o_forms' },
        ] },
        { t: 'wait', until: 'flag:knowsSignature' },
        { t: 'objective', id: 'o_leave', text: 'Get out', marker: 'ut_ward_door' },
        { t: 'branch', on: 'flag:firedInWard', yes: [
          { t: 'wave', at: ['ut_ward_door'], units: [{ a: 'grunt', n: 3 }, { a: 'netrunner', n: 1 }] },
          { t: 'music', state: 'combat' },
          { t: 'wait', until: 'enemiesClear' },
        ], no: [
          { t: 'bark', speaker: 'oye', text: 'Slow. Slow is faster here. Nobody in this building has run anywhere in nine years.' },
        ] },
        { t: 'wait', until: 'playerAt:ut_ward_door' },
        { t: 'objectiveDone', id: 'o_leave' },
        { t: 'music', state: 'sad' },
        { t: 'dialogue', node: 'm04_out' },
        { t: 'flag', set: { actOneDone: true } },
        { t: 'end', outcome: 'success' },
      ],
      onComplete: { flags: { actOneDone: true }, unlocks: ['m05'] },
    },
    /*__PART2__*/
  };

  return {
    title: 'VOLTHAVEN',
    tagline: 'The city sleeps so the city can live.',
    logline: 'A woman who signed the forms goes looking for one name she recognises.',
    requiredBeats, conditions, zones, characters, cantorArc, acts, missions,
    dialogue: {}, epilogues: {}, codex: [], barks: {}, ambient: [],
  };
})();
