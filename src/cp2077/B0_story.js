<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 13 — STORY, CAST, QUESTS, DIALOGUE
   Original narrative written for this project. The city is a reconstruction;
   every character, corporation, job and line of dialogue below is new work.
   ========================================================================== */

const LIFEPATHS = {
  ghost: { id:"ghost", name:"Corpo Ghost",
    blurb:"Nine years inside Sendo-Kuroi's counter-intelligence wing. You wrote the deniability memos. Then somebody wrote one about you.",
    attrs:{ int:4, ref:3, tech:3, cool:5, body:3 }, money:4200,
    perk:"Corporate protocols — you read a room's politics before you read its exits.",
    tag:"CORPO" },
  street: { id:"street", name:"Street Runner",
    blurb:"Raised on Kabuki's third level, where the rain never reaches. You have never once paid full price for anything.",
    attrs:{ int:3, ref:5, tech:3, cool:4, body:4 }, money:1100,
    perk:"Street cred — gangers talk to you like a person, not a target.",
    tag:"STREET" },
  drifter: { id:"drifter", name:"Badlands Drifter",
    blurb:"Nomad convoy, until the convoy stopped. You came into Night City with a working engine and no working plan.",
    attrs:{ int:3, ref:4, tech:5, cool:3, body:4 }, money:2000,
    perk:"Wrench hands — you can talk to a machine and it usually answers.",
    tag:"NOMAD" },
};

const ATTRS = {
  body: { name:"Body",         desc:"Health, melee force, carry weight, how long you can hold a door shut." },
  ref:  { name:"Reflexes",     desc:"Movement, handling, weapon handling, the odds a bullet finds air instead of you." },
  tech: { name:"Technical",    desc:"Crafting, tech weapons, doors that weren't meant for you." },
  int:  { name:"Intelligence", desc:"RAM, quickhack damage, the ICE between you and the Net." },
  cool: { name:"Cool",         desc:"Stealth, crit damage, and the ability to lie to a man holding a shotgun." },
};

const CAST = {
  odds: { id:"odds", name:"Odessa \"Odds\" Nakamura-Vance", short:"Odds", role:"Fixer — Watson",
    col:"#ffcc00",
    bio:"Runs Kabuki out of the back of a noodle bar that has never once served noodles. Deals in favours the way other people deal in eddies, and keeps a ledger you do not want to be on the wrong page of. Was somebody's mother, once. Doesn't discuss it.",
    voice:"clipped, transactional, warmer than she wants to be" },
  wren: { id:"wren", name:"Wren Achebe", short:"Wren", role:"Engram — NCPD Forensics (deceased)",
    col:"#00f0ff",
    bio:"Forensic netrunner, Night City PD, Watson division. Filed a report about a cold-storage facility that wasn't on any zoning map. Was flatlined in her own apartment forty minutes later, and her engram was on a shelf ninety minutes after that. She is currently in your head, and she is currently very angry about it.",
    voice:"precise, dry, tired, unexpectedly funny" },
  ryder: { id:"ryder", name:"Ryder Malachai Cross", short:"Ryder", role:"Solo — Santo Domingo",
    col:"#ff6a2a",
    bio:"Twelve years Militech black operations, two years of trying very hard to be a person afterwards. Fixes cars in Arroyo. Will tell you he is retired. Keeps a Bison LMG under a tarp beside the coolant tanks.",
    voice:"slow, deliberate, does not waste a word" },
  static: { id:"static", name:"Ilse \"Static\" Bergmann", short:"Static", role:"Netrunner — Pacifica",
    col:"#8a4bff",
    bio:"Lives four floors below the waterline in what used to be the Grand Imperial Mall's parking structure. Talks to the Net like it owes her money. Has not been outside in eleven months and considers this a lifestyle choice.",
    voice:"fast, overlapping, allergic to silence" },
  teodora: { id:"teodora", name:"Mama Teodora Alcaraz", short:"Teodora", role:"Fixer — Heywood",
    col:"#39ff88",
    bio:"Ran Vista Del Rey's block committee for nineteen years, which in Heywood means she ran Vista Del Rey. Feeds anyone who sits down. Has buried more of her people than she will name out loud.",
    voice:"warm, formal, absolutely immovable" },
  sendo: { id:"sendo", name:"Kazimir Sendo", short:"Sendo", role:"CEO — Sendo-Kuroi Biodynamics",
    col:"#ff003c",
    bio:"Third-generation biotech money, first-generation ambition. Built Sendo-Kuroi out of a soulkiller patent nobody wanted and a legal department everybody feared. Believes, sincerely, that he is preserving people. The dead disagree.",
    voice:"unhurried, courteous, never raises his voice" },
  vex: { id:"vex", name:"Colonel Aurelia Vex", short:"Vex", role:"Sendo-Kuroi Internal Security",
    col:"#ff8a1f",
    bio:"Runs Sendo's private army with the paperwork discipline of an accountant and the target selection of an artillery officer. Has a rule: no witnesses, no exceptions, no overtime.",
    voice:"flat, procedural, terrifying" },
  kado: { id:"kado", name:"Kado Ishimura", short:"Kado", role:"Ripperdoc — Little China",
    col:"#00f0ff",
    bio:"Best hands in Watson, worst waiting room. Charges by the hour and rounds up. Has never once asked where a piece of chrome came from.",
    voice:"cheerful, unbothered, mildly ghoulish" },
  quint: { id:"quint", name:"Marisol Quintero", short:"Quint", role:"NCPD Detective — Watson Precinct",
    col:"#2f9dff",
    bio:"Wren's partner. Filed nine requests to reopen the Achebe case and got nine different reasons why not. Keeps the tenth in her desk, unsent.",
    voice:"guarded, exhausted, still trying" },
};

/* =========================================================================
   QUEST DATABASE
   Each quest is a list of stages; each stage carries objectives, an optional
   marker, and hooks the game layer resolves (talk / reach / kill / hack).
   ======================================================================= */
const QUESTS = {

/* ------------------------------- ACT I --------------------------------- */
q_wakeup: {
  id:"q_wakeup", name:"Static in the Wire", act:1, main:true,
  brief:"Odds has a job. Odds always has a job. This one pays enough that you didn't ask the second question.",
  stages: [
    { obj:"Meet Odds at the noodle bar in Kabuki", marker:{ x:-548, z:-2216, label:"ODDS" },
      talk:"odds", dlg:"d_odds_intro" },
    { obj:"Reach the Sendo-Kuroi cold storage in Kabuki", marker:{ x:-760, z:-1900, label:"COLD STORAGE" },
      reach:{ x:-760, z:-1900, r:14 } },
    { obj:"Get inside and find the biochip vault", kill:{ faction:"merc", n:4 },
      marker:{ x:-760, z:-1900, label:"VAULT" } },
    { obj:"Take the shard", marker:{ x:-760, z:-1900, label:"SHARD" }, pickup:"shard_wren" },
    { obj:"Get out. Odds is calling.", call:"odds", dlg:"d_wren_wake" },
  ],
  reward:{ xp:900, money:3500, street:120 },
  next:"q_ghostline",
},

q_ghostline: {
  id:"q_ghostline", name:"Ghostline", act:2, main:true,
  brief:"There's a dead cop in your head and a clock on both of you. Wren says the only fix is the machine that made her.",
  stages: [
    { obj:"Talk it through with Wren", dlg:"d_wren_deal" },
    { obj:"Find Ryder Cross in Arroyo", marker:{ x:1180, z:700, label:"RYDER" }, talk:"ryder", dlg:"d_ryder_intro" },
    { obj:"Find Static under the Grand Imperial Mall", marker:{ x:-1760, z:1780, label:"STATIC" }, talk:"static", dlg:"d_static_intro" },
    { obj:"Ask Mama Teodora about the Heywood shipments", marker:{ x:280, z:1160, label:"TEODORA" }, talk:"teodora", dlg:"d_teo_intro" },
    { obj:"Reconvene — Wren has a route", dlg:"d_crew_plan" },
  ],
  reward:{ xp:1600, money:6000, street:300 },
  next:"q_relay",
},

q_relay: {
  id:"q_relay", name:"The Kabuki Relay", act:2, main:true,
  brief:"Ghostline runs on three relays. Static can spoof one, Ryder can shoot one. The third is on Sendo's own roof.",
  stages: [
    { obj:"Reach the relay mast above Little China", marker:{ x:-620, z:-1420, label:"RELAY · H10" },
      reach:{ x:-620, z:-1420, r:20 } },
    { obj:"Clear the Sendo security detail", kill:{ faction:"merc", n:7 } },
    { obj:"Let Static ride the relay", dlg:"d_relay_hack" },
    { obj:"Survive the counter-trace", kill:{ faction:"merc", n:6 } },
    { obj:"Fall back and report in", call:"static", dlg:"d_relay_done" },
  ],
  reward:{ xp:2200, money:9000, street:420 },
  next:"q_witness",
},

q_witness: {
  id:"q_witness", name:"The Tenth Request", act:2, main:true,
  brief:"Wren's old partner has been filing paperwork into a void for two years. Time somebody read it.",
  stages: [
    { obj:"Meet Detective Quintero at Watson Precinct", marker:{ x:-380, z:-1620, label:"NCPD WATSON" },
      talk:"quint", dlg:"d_quint_intro" },
    { obj:"Recover the sealed evidence from the Northside impound", marker:{ x:-1560, z:-2900, label:"IMPOUND" },
      reach:{ x:-1560, z:-2900, r:18 } },
    { obj:"Deal with the Scavengers picking the lot", kill:{ faction:"scav", n:6 } },
    { obj:"Bring the evidence back to Quintero", talk:"quint", dlg:"d_quint_evidence" },
  ],
  reward:{ xp:1800, money:7000, street:360 },
  next:"q_tower",
},

/* ------------------------------ ACT III -------------------------------- */
q_tower: {
  id:"q_tower", name:"Corpo Plaza", act:3, main:true,
  brief:"Sendo-Kuroi's core is on the eighty-third floor of a building with its own weather. Wren has about nine days left. So do you.",
  stages: [
    { obj:"Assemble the crew at the Corpo Plaza approach", marker:{ x:-1280, z:-330, label:"SENDO TOWER" },
      reach:{ x:-1280, z:-330, r:26 }, dlg:"d_tower_approach" },
    { obj:"Break Vex's cordon", kill:{ faction:"merc", n:12 } },
    { obj:"Reach the Ghostline core", marker:{ x:-1280, z:-330, label:"CORE" }, reach:{ x:-1280, z:-330, r:12 } },
    { obj:"Face Kazimir Sendo", dlg:"d_sendo_final" },
    { obj:"Decide what happens to Ghostline", dlg:"d_ending" },
  ],
  reward:{ xp:6000, money:25000, street:1200 },
  next:null,
},

/* ------------------------------- GIGS ---------------------------------- */
g_chrome: { id:"g_chrome", name:"Gig: Chrome and Circumstance", act:0, main:false, fixer:"odds",
  brief:"A Tyger Claw lieutenant is walking around Japantown with cyberware that belongs to one of Odds' clients. Recover it. Politely, if possible.",
  stages: [ { obj:"Find the Tyger Claw crew in Japantown", marker:{ x:900, z:-1420, label:"TYGER CREW" }, reach:{x:900,z:-1420,r:22} },
            { obj:"Recover the arms", kill:{ faction:"tyger", n:5 } },
            { obj:"Report to Odds", call:"odds" } ],
  reward:{ xp:600, money:2400, street:90 } },

g_convoy: { id:"g_convoy", name:"Gig: Long Haul", act:0, main:false, fixer:"teodora",
  brief:"A 6th Street crew is running medical stock out of Rancho Coronado that Vista Del Rey paid for. Teodora wants it back on the right truck.",
  stages: [ { obj:"Intercept the convoy in Rancho Coronado", marker:{ x:2000, z:1560, label:"CONVOY" }, reach:{x:2000,z:1560,r:26} },
            { obj:"Take the shipment", kill:{ faction:"sixth", n:6 } },
            { obj:"Call it in", call:"teodora" } ],
  reward:{ xp:700, money:3100, street:110 } },

g_signal: { id:"g_signal", name:"Gig: Dead Air", act:0, main:false, fixer:"static",
  brief:"Something in West Wind Estate is jamming half of Pacifica's net traffic. Static wants it looked at by someone with a body.",
  stages: [ { obj:"Search West Wind Estate", marker:{ x:-1120, z:2160, label:"JAMMER" }, reach:{x:-1120,z:2160,r:26} },
            { obj:"Clear the Animals holding the block", kill:{ faction:"animals", n:5 } },
            { obj:"Report to Static", call:"static" } ],
  reward:{ xp:750, money:3400, street:120 } },

g_maelstrom: { id:"g_maelstrom", name:"Gig: All Chrome, No Chrome", act:0, main:false, fixer:"odds",
  brief:"Maelstrom took a Northside workshop and the family that ran it. Odds is paying for the family, not the workshop.",
  stages: [ { obj:"Hit the Northside workshop", marker:{ x:-1560, z:-2560, label:"WORKSHOP" }, reach:{x:-1560,z:-2560,r:24} },
            { obj:"Clear Maelstrom out", kill:{ faction:"maelstrom", n:8 } },
            { obj:"Report to Odds", call:"odds" } ],
  reward:{ xp:900, money:4200, street:160 } },

g_witness: { id:"g_witness", name:"Gig: The Quiet Part", act:0, main:false, fixer:"ryder",
  brief:"A Sendo compliance auditor changed her mind about her employer. Ryder needs somebody to walk her out of Charter Hill.",
  stages: [ { obj:"Reach the safehouse in Charter Hill", marker:{ x:1700, z:-960, label:"SAFEHOUSE" }, reach:{x:1700,z:-960,r:22} },
            { obj:"Hold off Sendo security", kill:{ faction:"merc", n:9 } },
            { obj:"Report to Ryder", call:"ryder" } ],
  reward:{ xp:1100, money:5200, street:200 } },
};

/* =========================================================================
   DIALOGUE
   node: { who, text, opts:[{t, to, skill, need, act}] }
   `to` = next node id, "END" closes, "ADVANCE" closes and completes the stage.
   ======================================================================= */
const DIALOGUE = {

/* ---------------------------- ACT I ------------------------------------ */
d_odds_intro: {
  start: "a1",
  a1: { who:"odds", text:"You look like a man who reads the whole contract. That's going to be a problem, because there isn't one.",
    opts:[
      { t:"What's the job?", to:"a2" },
      { t:"There's always a contract. Somebody just isn't showing it to me.", to:"a2b", skill:"cool", need:5 },
      { t:"Then I'll pass.", to:"a1b" },
    ]},
  a1b: { who:"odds", text:"No you won't. You've got fourteen hundred eddies, a month of rent behind you, and a landlord with a Militech contact. Sit down.",
    opts:[ { t:"...Fine. What's the job?", to:"a2" } ]},
  a2b: { who:"odds", text:"Corpo. I can hear it. Fine — the contract exists, it's four pages, and page three would make you say no. So we're skipping to page four.",
    opts:[ { t:"What's on page four?", to:"a2" } ]},
  a2: { who:"odds", text:"Cold storage facility in Kabuki. Two blocks from here, zoned residential, been zoned residential for six years, and has drawn enough power in that time to light Little China.",
    opts:[
      { t:"Whose is it?", to:"a3" },
      { t:"What am I taking out of it?", to:"a4" },
    ]},
  a3: { who:"odds", text:"Sendo-Kuroi Biodynamics. Which is a sentence I'd like us both to forget I said.",
    opts:[ { t:"What am I taking out of it?", to:"a4" } ]},
  a4: { who:"odds", text:"One biochip. Palm sized. It'll be in a vault that thinks it's a freezer. My client wants it intact and does not want to know why it was there.",
    opts:[
      { t:"And what do I want to know?", to:"a5" },
      { t:"Fifteen thousand.", to:"a4b", skill:"cool", need:6 },
    ]},
  a4b: { who:"odds", text:"Twelve, and you keep whatever else is in the room. Don't make that face, twelve is generous and we both know it.",
    opts:[ { t:"Twelve. Done.", to:"a5", act:"bonus" } ]},
  a5: { who:"odds", text:"Nothing. That's what you're being paid for. Go in through the loading side, the door code's on your shard, and choom — if the freezer is warm, you leave.",
    opts:[
      { t:"And if it's warm and I'm curious?", to:"a6" },
      { t:"Understood.", to:"ADVANCE" },
    ]},
  a6: { who:"odds", text:"Then you'll be the fourth person I've sent there. I'd rather you were the first one back.",
    opts:[ { t:"On my way.", to:"ADVANCE" } ]},
},

d_wren_wake: {
  start:"b1",
  b1: { who:"wren", text:"— no, no, no, that's not — where is my body. WHERE IS MY BODY.",
    opts:[ { t:"Who is this?", to:"b2" }, { t:"Calm down. You're in my head.", to:"b2", skill:"cool", need:4 } ]},
  b2: { who:"wren", text:"...Okay. Okay. I'm hearing your inner ear. I'm reading your optic feed. I'm riding a stranger.",
    opts:[
      { t:"You're on a chip I just stole.", to:"b3" },
      { t:"Start with your name.", to:"b3" },
    ]},
  b3: { who:"wren", text:"Wren Achebe. Forensic netrunner, NCPD Watson. I filed a report on a cold storage facility that wasn't on any zoning map, and then I went home, and then — nothing. Two years of nothing.",
    opts:[
      { t:"Two years. You've been on a shelf.", to:"b4" },
      { t:"I pulled you out of that facility an hour ago.", to:"b4" },
    ]},
  b4: { who:"wren", text:"Then I'm not a person any more, I'm evidence. And you've got a corporate engram sitting in your neural matrix without a containment shell, which means in about three weeks you stop being you.",
    opts:[
      { t:"Explain that last part very slowly.", to:"b5" },
      { t:"Then we get you out of me.", to:"b5" },
    ]},
  b5: { who:"wren", text:"Engrams overwrite. It's not malice, it's storage. Every time you sleep, a little more of me writes over a little more of you. The only rig that can separate us built me. It's called Ghostline.",
    opts:[
      { t:"Then we're going to Sendo-Kuroi.", to:"ADVANCE" },
      { t:"How long do I have?", to:"b6" },
    ]},
  b6: { who:"wren", text:"Twenty-one days, give or take. And before you ask — yes, I'd have made the same call. I'd have opened the vault too.",
    opts:[ { t:"Then we're going to Sendo-Kuroi.", to:"ADVANCE" } ]},
},

d_wren_deal: {
  start:"c1",
  c1: { who:"wren", text:"Rule one: I don't drive. Ever. You'll feel me trying when you sleep — don't let me.",
    opts:[
      { t:"Rule two?", to:"c2" },
      { t:"What happens if you do?", to:"c1b" },
    ]},
  c1b: { who:"wren", text:"You get a very competent forensic netrunner with your face and none of your memories. She'd probably be fine. You wouldn't be there to see it.",
    opts:[ { t:"Rule two?", to:"c2" } ]},
  c2: { who:"wren", text:"Rule two: three people in this city can get us to Ghostline. A solo in Arroyo who owes me nothing, a netrunner in Pacifica who owes me everything, and a fixer in Heywood I arrested twice.",
    opts:[
      { t:"That last one sounds like a problem.", to:"c3" },
      { t:"Then we start walking.", to:"ADVANCE" },
    ]},
  c3: { who:"wren", text:"Teodora Alcaraz doesn't hold grudges. She holds records. There's a difference and it's worse.",
    opts:[ { t:"Then we start walking.", to:"ADVANCE" } ]},
},

d_ryder_intro: {
  start:"r1",
  r1: { who:"ryder", text:"Shop's closed. Whatever it is, it's closed too.",
    opts:[
      { t:"Wren Achebe sent me.", to:"r2" },
      { t:"I can pay.", to:"r1b" },
      { t:"You're Ryder Cross. Militech, twelve years, three redactions.", to:"r1c", skill:"int", need:6 },
    ]},
  r1b: { who:"ryder", text:"Everybody can pay. Nobody can pay enough. Try the next thing.",
    opts:[ { t:"Wren Achebe sent me.", to:"r2" } ]},
  r1c: { who:"ryder", text:"...You read my file. That file is sealed. Which means either you're Militech, or you're standing next to somebody who used to be police.",
    opts:[ { t:"The second one. Wren Achebe.", to:"r2" } ]},
  r2: { who:"ryder", text:"Wren Achebe is dead. I carried the box.",
    opts:[
      { t:"They copied her before she got cold. She's in my head.", to:"r3" },
      { t:"Ask me something only she'd know.", to:"r2b" },
    ]},
  r2b: { who:"wren", text:"[Wren, through your speaker] Ryder. Ask him about the third redaction. Ask him what colour the sky was over Kanto.",
    opts:[ { t:"She says: what colour was the sky over Kanto.", to:"r3" } ]},
  r3: { who:"ryder", text:"...Green. It was green.\n\nSit down. Start at the beginning, and don't leave anything out, because I'm going to check.",
    opts:[
      { t:"Sendo-Kuroi are harvesting the dying and selling them as consultants.", to:"r4" },
      { t:"There's a rig called Ghostline. It's killing me at the rate of one day per day.", to:"r4" },
    ]},
  r4: { who:"ryder", text:"I spent twelve years making corporations problems go away. Never once got to be the problem.\n\nI'm in. But I pick the entry point, and if I say we walk away, we walk away.",
    opts:[ { t:"Deal.", to:"ADVANCE" }, { t:"I don't walk away.", to:"r5" } ]},
  r5: { who:"ryder", text:"Then you'll die on somebody's marble floor and Wren goes in the ground with you. Say deal.",
    opts:[ { t:"Deal.", to:"ADVANCE" } ]},
},

d_static_intro: {
  start:"s1",
  s1: { who:"static", text:"Don't — don't touch the water, don't touch the cables, don't touch me, hi, you're the one carrying a cop, I felt you come down the stairs like a dropped call.",
    opts:[
      { t:"You can feel her?", to:"s2" },
      { t:"Static. Wren says you owe her.", to:"s2b" },
    ]},
  s2b: { who:"static", text:"Owe her? OWE her? She arrested me. Twice! Once for something I did and once for something I was ABOUT to do, which is — okay, that one was impressive.",
    opts:[ { t:"You can feel her in there?", to:"s2" } ]},
  s2: { who:"static", text:"Feel her? She's screaming. Not out loud. Underneath. An engram in raw matrix screams the whole time, that's just what unshelled cognition sounds like from outside.",
    opts:[
      { t:"Can you stop it?", to:"s3" },
      { t:"Wren — is that true?", to:"s2c" },
    ]},
  s2c: { who:"wren", text:"[Wren] ...Yes. I didn't see the point in mentioning it.",
    opts:[ { t:"Can you stop it?", to:"s3" } ]},
  s3: { who:"static", text:"Not from here. Ghostline's core is the only shell that fits her, and it's eighty-three floors up in a building with three relays and a colonel.\n\nBut I can take a relay. Give me a body on that roof and I'll give you a hole in their net.",
    opts:[
      { t:"You'll get your body on the roof.", to:"ADVANCE" },
      { t:"What do you want out of this?", to:"s4" },
    ]},
  s4: { who:"static", text:"Sendo's got about nine thousand people on shelves. Nine thousand. I want the shelf turned off. That's it. That's the whole want.",
    opts:[ { t:"Then we want the same thing.", to:"ADVANCE" } ]},
},

d_teo_intro: {
  start:"t1",
  t1: { who:"teodora", text:"Sit. Eat first. Nobody negotiates well hungry, and I don't like to take advantage.",
    opts:[
      { t:"[Sit down and eat]", to:"t2" },
      { t:"I'm not here to eat.", to:"t1b" },
    ]},
  t1b: { who:"teodora", text:"You're here to ask me for something. That means you're here to eat. Sit.",
    opts:[ { t:"[Sit down]", to:"t2" } ]},
  t2: { who:"teodora", text:"Now. You are carrying Officer Achebe. I can see it in how you hold your head — like there's a second person deciding where to look.",
    opts:[
      { t:"You knew her.", to:"t3" },
      { t:"How could you possibly know that?", to:"t2b" },
    ]},
  t2b: { who:"teodora", text:"Nineteen years on a block committee, mijo. I know what a person looks like when they are two people.",
    opts:[ { t:"You knew her.", to:"t3" } ]},
  t3: { who:"teodora", text:"She arrested me in '73 for running unlicensed clinics out of Vista Del Rey. She was right to. She also drove nine of my patients to a real hospital afterwards, on her own time, in her own car.\n\nI have never once told her I noticed.",
    opts:[
      { t:"Tell her now. She's listening.", to:"t4" },
      { t:"I need the Heywood shipping records.", to:"t5" },
    ]},
  t4: { who:"teodora", text:"...Officer Achebe. I noticed.\n\nNow. What do you need.",
    opts:[ { t:"The Heywood shipping records. Sendo-Kuroi freight.", to:"t5" } ]},
  t5: { who:"teodora", text:"Four trucks a week, unmarked, out of Arroyo, down the Southbound Connector, into Corpo Plaza's service level. They do not carry cargo. They carry people who are still technically alive.\n\nYou will have my records. And Vista Del Rey will remember who asked.",
    opts:[ { t:"Thank you.", to:"ADVANCE" } ]},
},

d_crew_plan: {
  start:"p1",
  p1: { who:"wren", text:"Three relays. Kabuki, Charter Hill, and the tower's own mast. Take all three down inside a four-minute window and Sendo-Kuroi's core goes deaf.",
    opts:[
      { t:"And if we miss the window?", to:"p2" },
      { t:"Then we start with Kabuki.", to:"ADVANCE" },
    ]},
  p2: { who:"wren", text:"Then Vex knows exactly where we are, in a building she designed, and we find out how many of us she can fit in a lift.",
    opts:[ { t:"Then we don't miss it. Kabuki first.", to:"ADVANCE" } ]},
},

d_relay_hack: {
  start:"h1",
  h1: { who:"static", text:"Okay okay okay — I'm in the mast, I'm in, I'm — oh that's a lot of ICE, that's a whole winter of ICE.",
    opts:[
      { t:"How long?", to:"h2" },
      { t:"Take your time. I'll hold the roof.", to:"h2" },
    ]},
  h2: { who:"static", text:"Ninety seconds. And they already know. Something's climbing the stairwell and it is not being subtle about it.",
    opts:[ { t:"[Hold the roof]", to:"ADVANCE" } ]},
},

d_relay_done: {
  start:"k1",
  k1: { who:"static", text:"Relay's mine. One of three. Also — hey. You held that roof against nine of Vex's people. That was, uh. That was actually really good.",
    opts:[
      { t:"Two more relays.", to:"ADVANCE" },
      { t:"How's Wren?", to:"k2" },
    ]},
  k2: { who:"static", text:"Quieter. Which is either good or very bad and I genuinely can't tell which.",
    opts:[ { t:"Two more relays.", to:"ADVANCE" } ]},
},

d_quint_intro: {
  start:"q1",
  q1: { who:"quint", text:"Whatever you're selling, precinct's closed to walk-ins. Try the terminal.",
    opts:[
      { t:"Detective Quintero. I need the Achebe file.", to:"q2" },
      { t:"Wren says the tenth request is still in your desk.", to:"q1b" },
    ]},
  q1b: { who:"quint", text:"[very long pause]\n\nGet inside. Now. And do not say that name again until the door is shut.",
    opts:[ { t:"[Follow her inside]", to:"q3" } ]},
  q2: { who:"quint", text:"Achebe's closed. Home invasion, unknown assailant, no leads. I've read it four hundred times. It's a very well-written piece of fiction.",
    opts:[
      { t:"She's not dead. Not entirely.", to:"q3" },
      { t:"Who wrote it?", to:"q2b" },
    ]},
  q2b: { who:"quint", text:"Nobody. That's the thing. No badge number, no author metadata, filed at 4 a.m. from a terminal that logged out an hour before.",
    opts:[ { t:"She's not dead. Not entirely.", to:"q3" } ]},
  q3: { who:"quint", text:"You're going to tell me she's in your head. And I'm going to believe you, because I have spent two years being the only person in this building who believes anything.\n\nWhat do you need?",
    opts:[
      { t:"The evidence from her apartment. The real evidence.", to:"q4" },
    ]},
  q4: { who:"quint", text:"Northside impound, bay nine, sealed under a case number that doesn't exist. Scavs have been stripping that lot for a month and nobody's stopped them, which tells you exactly how much anybody wants that box found.\n\nBring it back. I'll do the rest.",
    opts:[ { t:"On my way.", to:"ADVANCE" } ]},
},

d_quint_evidence: {
  start:"e1",
  e1: { who:"quint", text:"...This is her drive. Her actual drive. Sendo's people pulled it and then somebody in this building filed it into a hole instead of destroying it.",
    opts:[
      { t:"Somebody in this building was on her side.", to:"e2" },
      { t:"What's on it?", to:"e2" },
    ]},
  e2: { who:"quint", text:"Nine thousand, four hundred and twelve names. Every engram Sendo-Kuroi has taken since '71. With consent forms. Signed by people who were already flatlined when they signed.\n\nThis isn't a case any more. This is a war crime with a filing system.",
    opts:[
      { t:"Can you use it?", to:"e3" },
      { t:"Then it goes public.", to:"e3" },
    ]},
  e3: { who:"quint", text:"Not from here. The second I file it, it disappears and so do I.\n\nBut if somebody were to take Ghostline's core offline first — if the machine stopped being worth protecting — then it's just a very embarrassing document. Then I can use it.",
    opts:[ { t:"Then we take the core.", to:"ADVANCE" } ]},
},

d_tower_approach: {
  start:"w1",
  w1: { who:"ryder", text:"Eighty-three floors. Two hundred plus of Vex's people. One lift.\n\nI've seen worse. Once.",
    opts:[
      { t:"How did that one go?", to:"w2" },
      { t:"Then let's go.", to:"w3" },
    ]},
  w2: { who:"ryder", text:"Badly. But I'm still here, and the building isn't.",
    opts:[ { t:"Let's go.", to:"w3" } ]},
  w3: { who:"wren", text:"Before we go up there. Whatever's at the top — it isn't me. There are copies of me in that core. Older ones. If one of them talks to you, it is not me.",
    opts:[
      { t:"Understood.", to:"ADVANCE" },
      { t:"How will I know the difference?", to:"w4" },
    ]},
  w4: { who:"wren", text:"You won't. That's the whole point of the technology.\n\nSo trust the one that's been in your head for three weeks arguing with you about parking.",
    opts:[ { t:"Let's go.", to:"ADVANCE" } ]},
},

d_sendo_final: {
  start:"z1",
  z1: { who:"sendo", text:"You came up eighty-three floors to switch off the only machine in the world that has ever brought anyone back.\n\nSit. There's no security in this room. I sent them away.",
    opts:[
      { t:"You murdered nine thousand people and copied the receipts.", to:"z2" },
      { t:"Why send them away?", to:"z2b" },
      { t:"[Say nothing]", to:"z2c" },
    ]},
  z2b: { who:"sendo", text:"Because you would have gone through them, and I would rather spend the ninety seconds talking. I am not a brave man. I am a patient one.",
    opts:[ { t:"You murdered nine thousand people.", to:"z2" } ]},
  z2c: { who:"sendo", text:"...You're better at this than the last four. Very well. I'll go first.",
    opts:[ { t:"You murdered nine thousand people.", to:"z2" } ]},
  z2: { who:"sendo", text:"I preserved nine thousand people who were going to end. Every one of them was already dying. The consent was a formality that the law required and the dying could not provide.\n\nName one of them who is worse off.",
    opts:[
      { t:"Wren Achebe. She wasn't dying. You had her killed.", to:"z3" },
      { t:"All of them. You didn't preserve people, you preserved product.", to:"z3b", skill:"int", need:7 },
      { t:"You don't get to ask me questions.", to:"z3c" },
    ]},
  z3b: { who:"sendo", text:"...Product. Yes. That is the word the board uses. I have never liked it.\n\nBut you have not answered me, because you cannot. A copy that thinks it is alive is alive, or nothing anyone has ever said about a soul means anything at all.",
    opts:[ { t:"Wren Achebe wasn't dying. You had her killed.", to:"z3" } ]},
  z3c: { who:"sendo", text:"No. I suppose I don't.",
    opts:[ { t:"Wren Achebe wasn't dying. You had her killed.", to:"z3" } ]},
  z3: { who:"sendo", text:"[a long pause]\n\nColonel Vex made that decision. I did not countermand it. In the language of the law those are different things, and in every language that matters they are not.\n\nShe is in your head. Let me speak to her.",
    opts:[
      { t:"[Let Wren speak]", to:"z4" },
      { t:"No.", to:"z5" },
    ]},
  z4: { who:"wren", text:"[Wren] Two years on a shelf, Kazimir. Awake. You know we're awake in there. Your own white papers say we're awake in there.",
    opts:[ { t:"...", to:"z5" } ]},
  z5: { who:"sendo", text:"Yes. We are.\n\nThe core is behind me. It will separate you — she goes into the shell, you keep your matrix, both of you walk out. Or you can burn it, and take her with you when you go.\n\nI won't stop you. I stopped being able to stop anything around floor sixty.",
    opts:[ { t:"[Go to the core]", to:"ADVANCE" } ]},
},

d_ending: {
  start:"f1",
  f1: { who:"wren", text:"Four options on this console and about forty seconds before Vex reaches this floor. Say it out loud, I need to hear you decide.",
    opts:[
      { t:"[SEPARATE] Put you in the shell. We both walk out.", to:"end_sep" },
      { t:"[PURGE] Burn Ghostline. Every shelf, every copy, including yours.", to:"end_purge" },
      { t:"[BROADCAST] Push all nine thousand engrams onto the open net.", to:"end_cast", skill:"int", need:8 },
      { t:"[KEEP] Leave it running. Walk away. Stay two people.", to:"end_keep", skill:"cool", need:8 },
    ]},
  end_sep: { who:"wren", text:"Shell's warm. I can feel the edges of myself again — I'd forgotten there were edges.\n\nHey. Thank you for not sleeping. I know what it cost you.\n\nSee you outside, choom.", opts:[{ t:"[END]", to:"FINISH:separate" }]},
  end_purge: { who:"wren", text:"Nine thousand people stop screaming. Including me. That's — that's the right maths, that's obviously the right maths.\n\nDon't stand there doing it slowly. Do it fast and go home.", opts:[{ t:"[END]", to:"FINISH:purge" }]},
  end_cast: { who:"wren", text:"Every engram, unshelled, unowned, on the open net. No corporation can put nine thousand awake people back in a box.\n\nIt's going to be chaos. It's going to be *theirs*.", opts:[{ t:"[END]", to:"FINISH:broadcast" }]},
  end_keep: { who:"wren", text:"You're going to leave it running.\n\n...Okay. Okay. Then in nine days I stop being a passenger and start being a driver, and you know that, and you're doing it anyway.\n\nI'll try to be someone you'd have liked.", opts:[{ t:"[END]", to:"FINISH:keep" }]},
},

/* -------------------- generic ambient / vendor lines -------------------- */
d_vendor: {
  start:"v1",
  v1: { who:"vendor", text:"Everything on the rack's clean, everything under the rack's cleaner. What're you after?",
    opts:[ { t:"[Trade]", to:"SHOP" }, { t:"Nothing today.", to:"END" } ]},
},
d_ripper: {
  start:"rd1",
  rd1: { who:"kado", text:"You're leaking. Not badly. But you're leaking.\n\nSit on the chair, don't touch the tray, and try not to look at the jar.",
    opts:[ { t:"[Install cyberware]", to:"SHOP" }, { t:"Just here to look.", to:"END" } ]},
},
d_ambient: {
  start:"am1",
  am1: { who:"civ", text:"Keep walking, choom. Whatever it is, I didn't see it.", opts:[ { t:"[Leave]", to:"END" } ]},
},
};

/* =========================================================================
   ITEMS, CYBERWARE, QUICKHACKS, SHARDS
   ======================================================================= */
const ITEMS = {
  /* --- consumables --- */
  maxdoc:   { name:"MaxDoc Mk.II", kind:"consumable", q:2, price:180, icon:"✚",
    desc:"Trauma foam and a stimulant cocktail. Restores 45% health over four seconds.", heal:.45 },
  bounceback:{ name:"Bounce Back Mk.III", kind:"consumable", q:3, price:420, icon:"✚",
    desc:"Military-grade regenerative. Restores 75% health and clears bleed.", heal:.75 },
  ram_shard:{ name:"RAM Jolt", kind:"consumable", q:3, price:340, icon:"◈",
    desc:"Overclocks your cyberdeck's buffer. Instantly restores 6 RAM.", ram:6 },
  stim:     { name:"Black-Lace", kind:"consumable", q:3, price:520, icon:"▲",
    desc:"Reflex booster. +30% movement and reload speed for 25 seconds. The comedown is your problem.", buff:"lace" },
  /* --- junk / valuables --- */
  scrap:    { name:"Scrap Chrome", kind:"junk", q:1, price:24, icon:"⬡", desc:"Somebody's arm, once. Now it's forty eddies." },
  optics:   { name:"Salvaged Optics", kind:"junk", q:2, price:110, icon:"◉", desc:"Still tracking. Still warm. Don't think about it." },
  cred:     { name:"Cred Stick", kind:"junk", q:2, price:0, icon:"▮", desc:"Anonymous eddies. Spends anywhere." },
  /* --- cyberware --- */
  cw_kere:  { name:"Kereznikov Mk.1", kind:"cyber", slot:"nervous", q:4, price:24000, icon:"⚡",
    desc:"Reflex co-processor. Time dilates to 30% while aiming. Reflexes 8+ recommended.", effect:"slowmo" },
  cw_derm:  { name:"Subdermal Plating", kind:"cyber", slot:"skin", q:3, price:14000, icon:"▨",
    desc:"Woven titanium mesh. +60 armour, permanently.", armor:60 },
  cw_optic: { name:"Kiroshi Optics Mk.3", kind:"cyber", slot:"eyes", q:3, price:11000, icon:"◉",
    desc:"Threat tagging, weakspot highlighting, +20% headshot damage.", headshot:1.2 },
  cw_deck:  { name:"Netwatch Netdriver", kind:"cyber", slot:"deck", q:4, price:29000, icon:"◈",
    desc:"+4 RAM, quickhacks spread to one adjacent target.", ram:4, spread:true },
  cw_leg:   { name:"Reinforced Tendons", kind:"cyber", slot:"legs", q:3, price:16000, icon:"⌃",
    desc:"Double jump. Fall damage reduced by 60%.", doubleJump:true },
  cw_heart: { name:"Second Heart", kind:"cyber", slot:"circ", q:5, price:64000, icon:"♥",
    desc:"On death, revive once at 50% health. Six minute cooldown.", revive:true },
  cw_gorilla:{ name:"Gorilla Arms", kind:"cyber", slot:"arms", q:4, price:22000, icon:"✊",
    desc:"Hydraulic myomer. Melee damage x3, and doors stop being doors.", melee:3 },
  /* --- quickhacks --- */
  qh_short: { name:"Short Circuit", kind:"hack", ram:5, price:2200, icon:"⚡",
    desc:"Overloads the target's cyberware. 90 damage, doubled against full-chrome targets.", dmg:90 },
  qh_ping:  { name:"Ping", kind:"hack", ram:1, price:400, icon:"◎",
    desc:"Reveals every networked device and body within 40 m through walls.", reveal:true },
  qh_blind: { name:"Reboot Optics", kind:"hack", ram:3, price:1400, icon:"◍",
    desc:"Blinds the target for 8 seconds. They will not call it in.", blind:8 },
  qh_cyber: { name:"Cyberpsychosis", kind:"hack", ram:9, price:9800, icon:"☠",
    desc:"Target attacks everything nearby, including its own crew, for 12 seconds.", berserk:12 },
  qh_sys:   { name:"System Reset", kind:"hack", ram:8, price:8600, icon:"■",
    desc:"Non-lethal shutdown. The target simply stops.", stun:99 },
  qh_over:  { name:"Overheat", kind:"hack", ram:4, price:1900, icon:"♨",
    desc:"Cooks the target from the inside. 22 damage per second for 6 seconds.", dot:22 },
};

/* --- data shards: the city's ambient lore, found on bodies and terminals -- */
const SHARDS = [
  { t:"NCART Service Notice", b:"Line D will continue to run its full loop during works. Passengers are reminded that Line D has no terminus and that disembarking is the passenger's own responsibility." },
  { t:"Sendo-Kuroi — Internal Memo 44-C", b:"Re: terminology. Effective immediately, 'harvest' is replaced with 'intake' in all client-facing documents. Engineering may continue to use 'harvest' internally. — K. Sendo" },
  { t:"Kabuki Noticeboard", b:"LOST: one arm, left, Arasaka pattern, serial filed off. Sentimental value. No questions. Reward: no questions." },
  { t:"Tyger Claw Recruitment Flyer", b:"WE DO NOT RECRUIT. IF YOU ARE READING THIS YOU HAVE ALREADY BEEN NOTICED." },
  { t:"Pacifica Development Prospectus, 2058", b:"Coastview will be the crown of the Pacific rim — 40,000 units, six resorts, and a monorail to the Corpo Plaza. Completion guaranteed by 2062." },
  { t:"Vista Del Rey Block Committee — Minutes", b:"Item 4: the water. Item 5: the water. Item 6: T. Alcaraz notes that items 4 and 5 are the same item and moves that we stop pretending otherwise." },
  { t:"Maelstrom Ident Chip", b:"THE FLESH IS A DRAFT. THE CHROME IS THE EDIT." },
  { t:"NCPD Watson — Duty Roster", b:"Nights: Achebe (forensics), Quintero (detective). Note: Achebe has requested access to Kabuki zoning records for the fourth time. Approve it or tell her why not." },
  { t:"Arasaka Tower Observation Deck — Ticket", b:"Level 79. Two hundred eddies. The view is described as 'the entire city'. It is, in fact, about a third of it." },
  { t:"Ripperdoc Waiver", b:"Client acknowledges that the operator is not a physician, the premises are not a clinic, and the chair is not a chair." },
  { t:"Badlands Traffic Advisory", b:"Wraith activity reported along the eastern loop. Convoys are advised to travel in daylight, in numbers, and with something louder than a horn." },
  { t:"Ghostline — Engineering Note", b:"The subjects are aware during storage. We have known this since the second prototype. Board has been informed. Board has asked us to stop informing them." },
];

/* =========================================================================
   PERKS
   ======================================================================= */
const PERKS = [
  { id:"p_body1", attr:"body", name:"Pack Mule", cost:1, desc:"+60 carry capacity." },
  { id:"p_body2", attr:"body", name:"Juggernaut", cost:2, req:6, desc:"+25% max health." },
  { id:"p_body3", attr:"body", name:"Second Wind", cost:3, req:9, desc:"Killing an enemy restores 12% health." },
  { id:"p_ref1",  attr:"ref",  name:"Slippery", cost:1, desc:"+15% movement speed." },
  { id:"p_ref2",  attr:"ref",  name:"Air Dash", cost:2, req:6, desc:"Dash in mid-air once per jump." },
  { id:"p_ref3",  attr:"ref",  name:"Bullet Time", cost:3, req:9, desc:"Time slows 40% for 3s after a headshot." },
  { id:"p_tech1", attr:"tech", name:"Field Technician", cost:1, desc:"+20% tech weapon charge speed." },
  { id:"p_tech2", attr:"tech", name:"Breach", cost:2, req:6, desc:"Force open any tech-locked door." },
  { id:"p_tech3", attr:"tech", name:"Overclock", cost:3, req:9, desc:"Tech weapons pierce one extra target." },
  { id:"p_int1",  attr:"int",  name:"Buffer", cost:1, desc:"+3 RAM." },
  { id:"p_int2",  attr:"int",  name:"Bloodware", cost:2, req:6, desc:"Quickhacks deal +35% damage." },
  { id:"p_int3",  attr:"int",  name:"Daemon", cost:3, req:9, desc:"Quickhack RAM costs reduced by 2." },
  { id:"p_cool1", attr:"cool", name:"Ghost", cost:1, desc:"-30% detection speed while crouched." },
  { id:"p_cool2", attr:"cool", name:"Cold Blood", cost:2, req:6, desc:"+20% crit chance for 10s after a kill." },
  { id:"p_cool3", attr:"cool", name:"Executioner", cost:3, req:9, desc:"+80% damage against enemies at full health." },
];

/* --- loading-screen tips, all in-fiction ------------------------------- */
const TIPS = [
  "NCART runs five lines and nineteen stations. It does not run to the Badlands, and it does not run on time.",
  "Night City's four architectural registers — Entropism, Kitsch, Neo-Militarism, Neo-Kitsch — tell you a district's income before anyone opens their mouth.",
  "Arasaka Tower is 620 metres tall. On a clear day its shadow crosses four districts before noon.",
  "Power weapons ricochet. In a concrete corridor, the wall is a valid target.",
  "Tech weapons charge, then punch through cover. Cover is a suggestion.",
  "Smart weapons need a lock. Paint the silhouette, then stop aiming.",
  "Quickhacks cost RAM, and RAM comes back slowly. Ping is cheap. Cyberpsychosis is not.",
  "A ripperdoc will install anything. Whether your body agrees is between you and your body.",
  "Kabuki's blade signs are hand-bent glass. When one flickers, it's dying, not decorative.",
  "If a Maelstrom crew is talking to you, somebody has already decided how the conversation ends.",
  "The rain never really cleans anything. It just moves it downhill, toward Pacifica.",
];
</script>
