<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 15 — GAME
   Player controller, combat resolution, quest state machine, save/load and
   the frame loop that drives every system above.
   ========================================================================== */
const GAME = {
  started: false, paused: false, inDialogue: false, loading: true,
  sens: 0.0022, invertY: false, toggleAim: false, autoReload: true, showDmg: true,
  clockScale: 60, waypoint: null, activeQuest: null, questStage: 0,
  keys: {}, mouse: { dx:0, dy:0, l:false, r:false }, pointerLocked: false,
  time: 0, dt: 0, acc: 0, fps: 60, frames: 0, fpsT: 0,
  dynLights: [], markerList: [], tmpA: V3.n(), tmpB: V3.n(), tmpC: V3.n(),
  fx: { glitch:0, hack:0, damage:0, exposure:1 },
  hitFlash: 0, killT: 0, lastSave: 0, ending: null,

  P: {
    name:"V", lifepath:"street", x:-548, y:0, z:-2180, yaw:0, pitch:0,
    vx:0, vy:0, vz:0, grounded:true, crouch:0, sprint:0, bob:0, step:0,
    hp:100, maxHp:100, armor:0, ram:8, maxRam:8, stam:100, maxStam:100,
    money:1100, xp:0, level:1, street:0, attrPoints:0, perkPoints:0,
    attrs:{ body:3, ref:3, tech:3, int:3, cool:3 }, perks:[],
    inv:[], slots:["corvid", null, null], slot:0, hacks:["qh_ping","qh_short"],
    cyber:{}, grenades:3, wanted:0, wantedT:0,
    weapon:null, aim:0, vehicle:null, shard:false, integrity:1,
    contacts:["odds"], messages:[], questsDone:[], shards:[], rel:{}, romance:null,
    stats:{ kills:0, headshots:0, dist:0, drives:0, quests:0 },
    body: null, sk: null, model: M4.n(), prevModel: M4.n(), phase: 0,
    lastGround: 0, jumpBuf: 0, coyote: 0, doubleJumped: false,
    slowmo: 0, laceT: 0, reviveT: 0,
  },

/* ======================================================================== */
async boot() {
  const cv = $("gl");
  if (!RENDER.init(cv)) {
    $("bootMsg").textContent = "WEBGL2 UNAVAILABLE";
    $("bootTip").textContent = "This build needs a WebGL2 context with float render targets. " +
      "Try a desktop browser with hardware acceleration enabled.";
    return;
  }
  $("bootTip").textContent = TIPS[(Math.random()*TIPS.length)|0];
  const step = async (pct, msg, fn) => {
    UI.boot(pct, msg);
    await new Promise(r => setTimeout(r, 12));
    fn();
  };
  await step(0.04, "SYNTHESISING MATERIALS", () => {
    TEX.build();
    WORLD.init();
  });
  await step(0.30, "SURVEYING NIGHT CITY", () => { CITY.generate(); });
  await step(0.52, "FABRICATING VEHICLES", () => { VEHICLE.buildAll(); });
  await step(0.62, "MACHINING WEAPONS", () => { WMESH.buildAll(); });
  await step(0.72, "GROWING POPULATION", () => { NPCS.buildBodies(); });
  await step(0.80, "CASTING", () => {
    /* the named cast get full-detail bodies so holocalls show the real person */
    this.castMesh = {}; this.castSk = {};
    for (const id in CAST_LOOK) {
      const L = CAST_LOOK[id];
      const cfg = { height:L.height, build:L.build, fem:L.fem, skin:L.skin, face:L.face,
                    clothes:L.clothes, cyber:L.cyber, seed:(id.charCodeAt(0)*7919)>>>0, arch:id, lod:0 };
      const m = BODY.build(cfg);
      if (!m) continue;
      m.height = L.height;
      this.castMesh[id] = m;
      this.castSk[id] = new Skeleton(L.height/1.78);
    }
  });
  await step(0.88, "WARMING THE GRID", () => {
    PARTICLES.init();
    RENDER.applyQuality(2);
    this.buildRain();
    this.buildWater();
    UI.init();
  });
  await step(0.97, "COMPILING SHADERS", () => {
    /* touch every program once so the first frame isn't a hitch */
    for (const k in RENDER.prog) GX.use(RENDER.prog[k]);
  });
  UI.boot(1, "READY");
  await new Promise(r => setTimeout(r, 180));
  UI.bootDone();
  this.loading = false;
  UI.show("mm");
  this.bindInput();
  this.startMenuBg();
  requestAnimationFrame(this.frame.bind(this));
},

/* ---------------------------------------------------------------- input - */
bindInput() {
  const cv = $("gl");
  /* Browsers require a user gesture before an AudioContext may start. */
  const unlock = () => {
    if (AUDIO.ready) { AUDIO.resume(); return; }
    if (AUDIO.init()) { RADIO.setOn(this.radioOn !== false && !!this.P.vehicle); }
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (this.keys[k]) return;
    this.keys[k] = true;
    this.onKey(k, e);
  });
  window.addEventListener("keyup", (e) => { this.keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { this.keys = {}; });
  document.addEventListener("pointerlockchange", () => {
    this.pointerLocked = document.pointerLockElement === cv;
  });
  cv.addEventListener("mousedown", (e) => {
    if (!this.started || UI.screen || this.inDialogue) return;
    if (!this.pointerLocked) { this.capturePointer(); return; }
    if (e.button === 0) this.mouse.l = true;
    if (e.button === 2) this.mouse.r = true;
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) this.mouse.l = false;
    if (e.button === 2) this.mouse.r = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (!this.pointerLocked) return;
    this.mouse.dx += e.movementX; this.mouse.dy += e.movementY;
  });
  window.addEventListener("wheel", (e) => {
    if (!this.started || UI.screen || this.inDialogue) return;
    this.selectSlot((this.P.slot + (e.deltaY > 0 ? 1 : 2)) % 3);
  }, { passive: true });
  cv.addEventListener("contextmenu", e => e.preventDefault());
},
onKey(k, e) {
  if (this.inDialogue) {
    const n = UI.dlgNode;
    if (!n || !n.opts) return;
    if (k === "w" || k === "arrowup") { UI.dlgSel = (UI.dlgSel + n.opts.length - 1) % n.opts.length; UI.renderOpts(); }
    else if (k === "s" || k === "arrowdown") { UI.dlgSel = (UI.dlgSel + 1) % n.opts.length; UI.renderOpts(); }
    else if (k === "e" || k === "enter" || k === " ") { e.preventDefault(); UI.choose(UI.dlgSel); }
    else if (k >= "1" && k <= "9") { const i = +k - 1; if (i < n.opts.length) UI.choose(i); }
    return;
  }
  if (k === "escape") {
    if (UI.screen === "pause") { if (UI.fromMenu) { UI.fromMenu = false; UI.show("mm"); } else UI.closeMenus(); }
    else if (UI.screen === "metro" || UI.screen === "shop") { UI.closeMenus(); }
    else if (UI.screen === "cc") UI.show("mm");
    else if (this.started) { UI.show("pause"); UI.setTab("set"); this.releasePointer(); }
    return;
  }
  if (!this.started) return;
  if (k === "tab") { e.preventDefault();
    if (UI.screen) UI.closeMenus(); else { UI.show("pause"); UI.setTab("inv"); this.releasePointer(); }
    return; }
  if (UI.screen) {
    if (k === "m" && UI.screen === "pause") UI.setTab("map");
    return;
  }
  if (k === "m") { UI.show("pause"); UI.setTab("map"); this.releasePointer(); return; }
  if (k === "j") { UI.show("pause"); UI.setTab("jrn"); this.releasePointer(); return; }
  if (k === "1") this.selectSlot(0);
  if (k === "2") this.selectSlot(1);
  if (k === "3") this.selectSlot(2);
  if (k === "r") { if (this.P.weapon && this.P.weapon.startReload()) {
    const pz = this.eyePos(V3.n());
    AUDIO.reload(0, pz);
    setTimeout(() => AUDIO.reload(1, this.eyePos(V3.n())), this.P.weapon.W.reload*380);
    setTimeout(() => AUDIO.reload(2, this.eyePos(V3.n())), this.P.weapon.W.reload*720);
  } }
  if (k === "e") this.interact();
  if (k === "f") this.enterExitVehicle();
  if (k === "g") this.throwGrenade();
  if (k === "q") this.toggleScanner();
  if (k === "h") this.useHack();
  if (k === "c") this.P.crouchToggle = !this.P.crouchToggle;
  if (k === "b") { this.radioOn = !RADIO.on; RADIO.setOn(this.radioOn);
    UI.note(RADIO.on ? ("RADIO · <b>" + RADIO.cur.name + "</b>") : "RADIO OFF"); }
  if (k === "n") { const st = RADIO.next(); RADIO.setOn(true); this.radioOn = true;
    UI.note("RADIO · <b>" + st.name + "</b> · " + st.genre); }
  if (k === "f5") { e.preventDefault(); this.saveGame(); UI.note("QUICKSAVE", "xp"); }
  if (k === "f9") { e.preventDefault(); this.loadGame(); }
},
capturePointer() { if (this.started && !UI.screen && !this.inDialogue) $("gl").requestPointerLock(); },
releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); },

/* ------------------------------------------------------------- new game - */
newGame() {
  UI.show("cc");
  UI.initCC();
  this.ccYaw = 0.5; this.ccPitch = 0.05; this.ccZoom = 2.4;
  const cv = $("ccCv");
  let drag = false, lx = 0, ly = 0;
  cv.onmousedown = (e) => { drag = true; lx = e.clientX; ly = e.clientY; };
  window.addEventListener("mouseup", () => drag = false);
  cv.onmousemove = (e) => { if (!drag) return;
    this.ccYaw -= (e.clientX-lx)*0.01; this.ccPitch = clamp(this.ccPitch + (e.clientY-ly)*0.006, -0.6, 0.7);
    lx = e.clientX; ly = e.clientY; };
  cv.onwheel = (e) => { e.preventDefault(); this.ccZoom = clamp(this.ccZoom * (e.deltaY>0?1.1:0.9), 1.1, 5); };
},

beginGame() {
  const C = UI.ccCfg;
  const P = this.P;
  P.name = C.name; P.lifepath = C.lifepath;
  Object.assign(P.attrs, C.attrs);
  P.money = LIFEPATHS[C.lifepath].money;
  P.cfg = {
    height: C.height, build: C.build, skin: C.skin, face: C.face, fem: C.fem,
    clothes: C.clothes, cyber: C.cyber, seed: C.seed, arch: "player",
  };
  if (P.body) GX.freeMesh(P.body);
  P.body = BODY.build(P.cfg);
  P.sk = new Skeleton(C.height/1.78);
  VARMS.invalidate();
  /* nudge to the nearest street node so the opening frame is never inside a
     building interior */
  const startNode = TRAFFIC.nearestNode(-548, -2180);
  let sx = startNode ? startNode.x : -548, sz = startNode ? startNode.z : -2180;
  /* road nodes can still land inside a footprint, so eject with a generous
     radius and step outward until the spot is genuinely clear */
  for (let i = 0; i < 8; i++) {
    const c = CITY.collide(sx, sz, 1.4, 0);
    if (hypot(c[0]-sx, c[1]-sz) < 0.01) break;
    sx = c[0]; sz = c[1];
  }
  P.x = sx; P.z = sz;
  P.y = CITY.height(P.x, P.z);
  P.yaw = 0.7;
  P.inv = [
    { w:"corvid", n:1 }, { i:"maxdoc", n:3 }, { i:"scrap", n:2 },
  ];
  P.slots = ["corvid", null, null]; P.slot = 0;
  P.hacks = ["qh_ping", "qh_short"];
  P.contacts = ["odds"];
  P.messages = [{ from:"odds", t:"NOW", b:"Noodle bar. Kabuki. Don't be seen coming in and don't be seen leaving. — O" }];
  P.questsDone = []; P.shards = []; P.perks = []; P.rel = {}; P.romance = null;
  P.shard = false; P.integrity = 1;
  P.stats = { kills:0, headshots:0, dist:0, drives:0, quests:0 };
  this.recalc();
  P.hp = P.maxHp; P.ram = P.maxRam; P.stam = P.maxStam;
  this.equip("corvid");
  RENDER.env.time = 21*3600;
  RENDER.env.rain = 0.35;
  this.startQuest("q_wakeup");
  this.started = true;
  UI.fade(true, () => {
    UI.show(null);
    UI.fade(false);
    this.capturePointer();
    /* Opening brief: who you are, where you are, and what you are doing here.
       Delivered as staged cards rather than assuming the player already knows. */
    const L = LIFEPATHS[P.lifepath];
    UI.cards([
      { t:"NIGHT CITY", s:"2077 · " + CITY.districtName(P.x, P.z).toUpperCase() + ", WATSON", d:3.4 },
      { t:P.name, s:L.name.toUpperCase() + " · MERC FOR HIRE", d:3.2 },
      { t:"THE JOB", s:"ODESSA NAKAMURA-VANCE HAS WORK. THE PAY IS GOOD ENOUGH THAT YOU DIDN'T ASK THE SECOND QUESTION.", d:4.4 },
      { t:"", s:"FOLLOW THE YELLOW MARKER · [TAB] INVENTORY · [M] MAP · [J] JOBS · [B] RADIO", d:4.6 },
    ]);
    UI.note("NIGHT CITY · " + CITY.districtName(P.x, P.z).toUpperCase(), "xp");
    setTimeout(() => this.startCall("odds",
      "You're late. You're standing in the rain outside my bar like a tourist who lost his tour. " +
      "Get inside — the marker on your optics is the door.", 8), 2400);
  });
},

recalc() {
  const P = this.P;
  let hp = 100 + P.attrs.body * 18;
  if (P.perks.indexOf("p_body2") >= 0) hp *= 1.25;
  P.maxHp = round(hp);
  P.maxRam = 4 + (P.attrs.int * 0.9 | 0) + (P.perks.indexOf("p_int1") >= 0 ? 3 : 0) +
             (P.cyber.deck ? ITEMS[P.cyber.deck].ram : 0);
  P.maxStam = 80 + P.attrs.body * 8 + P.attrs.ref * 4;
  P.armor = (P.cyber.skin ? ITEMS[P.cyber.skin].armor : 0) + P.attrs.body * 3 + P.level * 2;
  P.hp = min(P.hp, P.maxHp);
},
xpForLevel(l) { return round(500 * Math.pow(l, 1.42)); },
addXP(n) {
  const P = this.P;
  P.xp += n;
  while (P.xp >= this.xpForLevel(P.level+1)) {
    P.level++; P.attrPoints++; P.perkPoints++;
    this.recalc(); P.hp = P.maxHp;
    UI.note("LEVEL UP · <b>" + P.level + "</b>", "xp");
  }
},
/* affinity, and the scene it unlocks */
addAffinity(who, n) {
  const P = this.P;
  P.rel[who] = min(100, (P.rel[who] || 0) + n);
  const R = ROMANCE[who];
  if (!R) return;
  const stage = min(3, (P.rel[who] / 26) | 0);
  if (stage !== P._relStage_) { /* per-character stage note */ }
  if (P.rel[who] >= R.gate && !P.romanceReady) P.romanceReady = {};
  if (P.rel[who] >= R.gate && P.romanceReady && !P.romanceReady[who]) {
    P.romanceReady[who] = true;
    UI.note("<b>" + CAST[who].short.toUpperCase() + "</b> WANTS TO TALK", "xp");
    P.messages.push({ from: who, t: "NOW",
      b: who === "static"
        ? "come down. not for a job. — I"
        : "Shop's open. No work. Just come by. — R" });
    this.setWaypoint(R.place.x, R.place.z, true);
  }
},

addStreet(n) {
  const P = this.P;
  P.street += n;
  const tier = (P.street/250)|0;
  if (tier > (P._streetTier||0)) { P._streetTier = tier;
    UI.note("STREET CRED · <b>TIER " + tier + "</b>", "xp"); }
},

/* ======================= QUEST STATE MACHINE =========================== */
canStart(q) {
  const P = this.P;
  if (P.questsDone.indexOf(q.id) >= 0) return false;
  if (this.activeQuest && this.activeQuest.id === q.id) return false;
  if (!q.main) return P.questsDone.length >= 1 || P.street > 100;
  /* main jobs unlock in chain order */
  for (const k in QUESTS) {
    const o = QUESTS[k];
    if (o.next === q.id) return P.questsDone.indexOf(o.id) >= 0;
  }
  return q.id === "q_wakeup";
},
startQuest(id) {
  const q = QUESTS[id];
  if (!q) return;
  this.activeQuest = q; this.questStage = 0;
  this.stageKills = 0;
  UI.note("NEW JOB · <b>" + q.name + "</b>", "xp");
  const s = q.stages[0];
  if (s && s.marker) this.setWaypoint(s.marker.x, s.marker.z, true);
},
advanceStage() {
  const q = this.activeQuest;
  if (!q) return;
  this.questStage++;
  this.stageKills = 0;
  if (this.questStage >= q.stages.length) return this.completeQuest();
  const s = q.stages[this.questStage];
  UI.note("OBJECTIVE · " + s.obj.toUpperCase());
  if (s.marker) this.setWaypoint(s.marker.x, s.marker.z, true);
  if (s.kill) this.spawnEncounter(s.kill.faction, s.kill.n);
  if (s.call) setTimeout(() => this.phoneCall(s.call, s.dlg), 900);
},
completeQuest() {
  const q = this.activeQuest;
  const P = this.P;
  P.questsDone.push(q.id);
  P.stats.quests++;
  if (q.reward) {
    P.money += q.reward.money;
    this.addXP(q.reward.xp);
    this.addStreet(q.reward.street);
    UI.note("JOB COMPLETE · <b>€$" + fmt(q.reward.money) + " · " + fmt(q.reward.xp) + " XP</b>", "xp");
  }
  this.activeQuest = null; this.questStage = 0;
  this.waypoint = null;
  /* story beats that fire on completion */
  if (q.id === "q_wakeup") {
    P.shard = true;
    if (P.contacts.indexOf("wren") < 0) P.contacts.push("wren");
    P.messages.push({ from:"wren", t:"NOW", b:"I can hear you thinking. It's very loud in here. — W" });
    setTimeout(() => this.startQuest("q_ghostline"), 1400);
  }
  if (q.id === "q_ghostline") {
    for (const c of ["ryder","static","teodora"]) if (P.contacts.indexOf(c) < 0) P.contacts.push(c);
    setTimeout(() => this.startQuest("q_relay"), 1400);
  }
  if (q.id === "q_relay") setTimeout(() => this.startQuest("q_witness"), 1400);
  if (q.id === "q_witness") {
    if (P.contacts.indexOf("quint") < 0) P.contacts.push("quint");
    setTimeout(() => this.startQuest("q_tower"), 1400);
  }
  this.saveGame();
},
checkStage() {
  const q = this.activeQuest;
  if (!q || this.inDialogue) return;
  const s = q.stages[this.questStage];
  if (!s) return;
  const P = this.P;
  if (s.reach) {
    const d = hypot(P.x - s.reach.x, P.z - s.reach.z);
    if (d < s.reach.r) {
      if (s.dlg) this.beginDialogue(s.dlg);
      else if (s.kill) { /* handled by the next stage */ this.advanceStage(); }
      else this.advanceStage();
      return;
    }
  }
  if (s.kill && this.stageKills >= s.kill.n) { this.advanceStage(); return; }
  if (s.talk) {
    const n = this.nearestNPCWithId(s.talk);
    if (n && hypot(P.x-n.x, P.z-n.z) < 3.4) {
      UI.prompt("TALK TO " + (CAST[s.talk] ? CAST[s.talk].short.toUpperCase() : s.talk), "E");
      this.talkTarget = { npc: n, dlg: s.dlg };
    }
  }
  if (s.pickup && !this.pickupDone) {
    const m = s.marker;
    if (m && hypot(P.x-m.x, P.z-m.z) < 6) {
      UI.prompt("TAKE THE SHARD", "E");
      this.pickupTarget = s.pickup;
    }
  }
},
spawnEncounter(faction, n) {
  const map = { merc:"merc", scav:"scav", tyger:"tyger", maelstrom:"maelstrom",
    sixth:"sixth", animals:"animal", voodoo:"voodoo", valentino:"valentino", ncpd:"cop" };
  const arch = map[faction] || "merc";
  const P = this.P;
  const q = this.activeQuest;
  const s = q && q.stages[this.questStage];
  const cx = s && s.marker ? s.marker.x : P.x;
  const cz = s && s.marker ? s.marker.z : P.z;
  for (let i = 0; i < n; i++) {
    const a = (i/n)*TAU + Math.random();
    const d = 12 + Math.random()*22;
    const x = cx + cos(a)*d, z = cz + sin(a)*d;
    const npc = NPCS.spawn(arch, x, z, { hostile:true, quest:true, aware:0.5 });
    npc.state = "combat";
  }
  UI.note("HOSTILES DETECTED · <b>" + n + "</b>", "bad");
},
nearestNPCWithId(castId) {
  let best = null, bd = 1e9;
  for (const n of NPCS.list) {
    if (n.castId !== castId) continue;
    const d = hypot(n.x-this.P.x, n.z-this.P.z);
    if (d < bd) { bd = d; best = n; }
  }
  if (!best) {
    /* summon the story NPC at the objective marker the first time we need them */
    const q = this.activeQuest;
    const s = q && q.stages[this.questStage];
    if (s && s.marker) {
      const arch = { odds:"vendor", ryder:"merc", static:"netrunner", teodora:"vendor",
        quint:"cop", kado:"ripper" }[castId] || "civ";
      best = NPCS.spawn(arch, s.marker.x, s.marker.z, { quest:true, castId, state:"idle",
        name: CAST[castId] ? CAST[castId].short : castId });
    }
  }
  return best;
},
beginDialogue(dlgId) {
  UI.startDialogue(dlgId, (res) => {
    if (res === "advance") this.advanceStage();
    else if (res && res.indexOf("finish:") === 0) this.finishGame(res.slice(7));
  });
},
/* Start a holocall: 3D portrait, jaw-synced delivery, and subtitles. There is
   no voice acting in a 500 KB file, so the line is always readable on screen. */
startCall(who, text, dur) {
  this.callActive = true; this.callWho = who; this.callT = 0;
  this.callDur = dur || max(3.2, text.length * 0.055);
  this.callFade = 0;
  const c = CAST[who];
  this.callTint = c ? hex2rgb(parseInt(c.col.slice(1), 16)) : [1,.95,.9];
  AUDIO.holocall();
  UI.call(who, text, this.callDur + 1.4);
  UI.sub(c ? c.short.toUpperCase() : who, text, this.callDur + 1.2);
},
phoneCall(who, dlgId) {
  if (dlgId && DIALOGUE[dlgId]) { this.beginDialogue(dlgId); return; }
  const lines = {
    odds:"Clean work. Eddies are in your account, minus my cut, which we are not discussing.",
    wren:"Still here. Still you. Check the mirror occasionally, would you?",
    ryder:"Job's done. Don't come to the shop for a few days.",
    static:"Ohhh that's beautiful, that's a hole the size of a district. Nice.",
    teodora:"Vista Del Rey thanks you. Come eat sometime when nobody's shooting.",
    quint:"Filed under a case number that doesn't exist. Which means it's safe. For now.",
  };
  this.startCall(who, lines[who] || "...", 6.5);
  const q = this.activeQuest;
  const s = q && q.stages[this.questStage];
  if (s && s.call === who) setTimeout(() => this.advanceStage(), 700);
},
canCall(id) { return this.P.contacts.indexOf(id) >= 0; },
finishGame(ending) {
  this.ending = ending;
  const texts = {
    separate:"Wren Achebe walks out of Corpo Plaza in a shell she paid for with two years of screaming. You walk out as yourself. Quintero files nine thousand four hundred and twelve names, and this time somebody reads them.",
    purge:"Ghostline burns. Nine thousand voices stop, all at once, and the silence is the loudest thing you have ever heard. Wren goes with them. You never quite stop listening for her.",
    broadcast:"Nine thousand engrams hit the open net inside four seconds. By morning there are nine thousand new voices in Night City with nothing to lose and a very specific grievance. Sendo-Kuroi's share price does not survive the week.",
    keep:"You leave the core running and walk down eighty-three floors. Nine days later somebody with your face and Wren Achebe's memories signs for your apartment. She keeps the jacket.",
  };
  UI.fade(true, () => {
    UI.show("pause"); UI.setTab("jrn");
    const body = $("pBody"); body.innerHTML = "";
    $("pTitleTxt").textContent = "GHOSTLINE — " + ending.toUpperCase();
    const p = UI.panel(body, "END OF THE LINE", "1");
    const d = el("div", "pFlav", texts[ending]);
    d.style.cssText = "font-size:16px;line-height:1.9;font-style:normal;padding:10px 4px";
    p.appendChild(d);
    const st = this.P.stats;
    for (const s of [["Kills", st.kills], ["Headshots", st.headshots], ["Jobs", st.quests],
      ["Distance", round(st.dist) + " m"], ["Street cred", this.P.street], ["Level", this.P.level]]) {
      const r = el("div", "stat"); r.appendChild(el("span", null, s[0]));
      r.appendChild(el("b", null, String(s[1]))); p.appendChild(r);
    }
    const b = el("button", "btn", "RETURN TO NIGHT CITY");
    b.style.marginTop = "18px";
    b.onclick = () => { UI.closeMenus(); UI.fade(false); };
    p.appendChild(b);
    UI.fade(false);
    this.releasePointer();
  });
},
setWaypoint(x, z, quiet) {
  this.waypoint = { x, z };
  if (!quiet) UI.note("WAYPOINT SET");
},

/* ========================= PLAYER MOVEMENT ============================= */
updatePlayer(dt) {
  const P = this.P;
  const K = this.keys;
  /* --- look ---------------------------------------------------------- */
  if (this.pointerLocked) {
    const s = this.sens * (P.aim > .5 ? 0.55 : 1);
    /* screen-right is -X in this camera basis, so yaw must INCREASE when the
       mouse moves right — the old sign mirrored horizontal look */
    P.yaw += this.mouse.dx * s;
    P.pitch -= this.mouse.dy * s * (this.invertY ? -1 : 1);
    P.pitch = clamp(P.pitch, -1.50, 1.50);
  }
  this.mouse.dx = 0; this.mouse.dy = 0;

  if (P.vehicle) return this.updateDriving(dt);

  /* --- movement intent ----------------------------------------------- */
  let ix = 0, iz = 0;
  if (K["w"]) iz += 1; if (K["s"]) iz -= 1;
  if (K["d"]) ix += 1; if (K["a"]) ix -= 1;
  const il = hypot(ix, iz);
  if (il > 0) { ix /= il; iz /= il; }
  const crouching = P.crouchToggle || K["control"];
  P.crouch = damp(P.crouch, crouching ? 1 : 0, 12, dt);
  const wantSprint = K["shift"] && iz > 0.2 && P.stam > 4 && P.aim < .3 && !crouching;
  P.sprint = damp(P.sprint, wantSprint ? 1 : 0, 8, dt);
  if (wantSprint) P.stam = max(0, P.stam - 22*dt);
  else P.stam = min(P.maxStam, P.stam + 16*dt);

  const laceBoost = P.laceT > 0 ? 1.3 : 1;
  const perkSpeed = P.perks.indexOf("p_ref1") >= 0 ? 1.15 : 1;
  let spd = (3.5 + P.attrs.ref*0.16) * perkSpeed * laceBoost;
  spd *= lerp(1, 2.0, P.sprint);
  spd *= lerp(1, 0.45, P.crouch);
  spd *= lerp(1, 0.52, P.aim);

  const c = cos(P.yaw), s = sin(P.yaw);
  /* forward = (-sin yaw, cos yaw); right = (-cos yaw, -sin yaw) */
  const wx = (-s*iz - c*ix) * spd;
  const wz = ( c*iz - s*ix) * spd;
  const accel = P.grounded ? 16 : 3.5;
  P.vx = damp(P.vx, wx, accel, dt);
  P.vz = damp(P.vz, wz, accel, dt);

  /* --- gravity, jump, double jump ------------------------------------ */
  const gy = this.groundHeight(P.x, P.z);
  P.vy -= 24 * dt;
  if (K[" "] && P.jumpBuf <= 0) {
    if (P.grounded || P.coyote > 0) { P.vy = 8.2; P.grounded = false; P.coyote = 0;
      P.jumpBuf = 0.25; P.doubleJumped = false; AUDIO.jump([P.x,P.y,P.z]); }
    else if (!P.doubleJumped && P.cyber.legs) { P.vy = 7.4; P.doubleJumped = true; P.jumpBuf = 0.25;
      PARTICLES.sparks(P.x, P.y+0.2, P.z, 8, 0.3, 0.9, 1); }
  }
  P.jumpBuf -= dt;

  /* --- collide against buildings (cylinder vs rotated box) ------------ */
  let nx = P.x + P.vx*dt, nz = P.z + P.vz*dt;
  const R = 0.42;
  const cands = CITY.bldGrid.query(nx, nz, 26, []);
  for (const b of cands) {
    const py = P.y;
    if (py > b.y + b.h + 0.5) continue;
    const dx = nx - b.x, dz = nz - b.z;
    const cc = cos(-b.rot), ss = sin(-b.rot);
    const lx = dx*cc - dz*ss, lz = dx*ss + dz*cc;
    const ex = b.hw + R, ez = b.hd + R;
    if (abs(lx) < ex && abs(lz) < ez) {
      const px = ex - abs(lx), pz2 = ez - abs(lz);
      let plx = lx, plz = lz;
      if (px < pz2) plx = sign(lx)*ex; else plz = sign(lz)*ez;
      const rc = cos(b.rot), rs = sin(b.rot);
      nx = b.x + plx*rc - plz*rs;
      nz = b.z + plx*rs + plz*rc;
    }
  }
  P.stats.dist += hypot(nx-P.x, nz-P.z);
  P.x = nx; P.z = nz;
  P.y += P.vy * dt;
  const g2 = this.groundHeight(P.x, P.z);
  if (P.y <= g2) {
    if (!P.grounded && P.vy < -12) {
      const fall = (-P.vy - 12) * (P.cyber.legs ? 1.6 : 4.0);
      if (fall > 1) this.hurt(fall, 0, 0, true);
    }
    if (!P.grounded) AUDIO.land([P.x,P.y,P.z], P.vy < -9);
    P.y = g2; P.vy = 0; P.grounded = true; P.doubleJumped = false; P.coyote = 0.12;
  } else { P.grounded = false; P.coyote -= dt; }

  /* --- footsteps + camera bob ---------------------------------------- */
  const hs = hypot(P.vx, P.vz);
  P.phase += hs * dt * 0.55;
  P.bob = damp(P.bob, P.grounded ? hs/6 : 0, 8, dt);
  P.step += hs*dt;
  const strideLen = lerp(2.1, 1.5, P.sprint);
  if (P.step > strideLen && P.grounded) { P.step = 0;
    const surf = CITY.cityFalloff(P.x, P.z) > .45 ? "sand" : "stone";
    AUDIO.step([P.x, P.y, P.z], surf, P.sprint > 0.4, P.crouch > 0.5);
    PARTICLES.spawn(P.x, P.y+0.05, P.z, 0, 0.25, 0, 0.10, .35,.34,.32, 0.35, 0, 3, 0.4); }

  /* --- combat -------------------------------------------------------- */
  const wantAim = this.toggleAim ? P.aimToggle : this.mouse.r;
  P.aim = damp(P.aim, wantAim && !P.vehicle ? 1 : 0, 13, dt);
  if (P.weapon) {
    P.weapon.update(dt);
    P.weapon.ads = P.aim;
    if (this.mouse.l && P.weapon.canFire()) this.playerShoot();
    else if (this.mouse.l && this.autoReload && P.weapon.needsReload()) P.weapon.startReload();
  }
  /* --- regen --------------------------------------------------------- */
  P.ram = min(P.maxRam, P.ram + dt * (0.55 + P.attrs.int*0.06));
  if (P.hp < P.maxHp*0.45) P.hp = min(P.maxHp*0.45, P.hp + dt*1.4);
  if (P.laceT > 0) P.laceT -= dt;
  if (P.slowmo > 0) P.slowmo -= dt;
  if (P.reviveT > 0) P.reviveT -= dt;
  /* --- neural decay: the story clock --------------------------------- */
  if (P.shard) {
    P.integrity = max(0, P.integrity - dt * 0.00018);
    if (P.integrity < 0.35 && Math.random() < dt*0.12) this.fx.glitch = 0.5;
  }
  /* --- wanted level -------------------------------------------------- */
  if (P.wanted > 0) {
    /* the timer only runs while no NCPD unit can see you */
    let seen = false;
    for (const u of POLICE.units)
      if (u.state !== "dead" && u.aware > 0.4 && hypot(u.x-P.x, u.z-P.z) < 70) { seen = true; break; }
    P.wantedT -= seen ? -dt*0.5 : dt;
    P.wantedT = min(P.wantedT, 40);
    if (P.wantedT <= 0) { P.wanted--; P.wantedT = 26;
      if (P.wanted === 0) UI.note("HEAT COOLED", "xp"); }
  }
  /* --- animate the player's own body (for shadow + third-person bits) - */
  if (P.sk) {
    if (hs > 0.3) ANIM.locomotion(P.sk, P.phase, hs, this.time, 0);
    else ANIM.idle(P.sk, this.time, 0);
    if (P.weapon) ANIM.aimOverlay(P.sk, P.weapon.W.hands||0, max(P.aim, 0.25), -P.pitch*0.5);
    P.sk.pose();
    M4.cpy(P.prevModel, P.model);
    const q = Q4.n(); Q4.euler(q, 0, -P.yaw, 0);
    M4.trs(P.model, P.x, P.y, P.z, q[0],q[1],q[2],q[3], 1,1,1);
  }
},
groundHeight(x, z) {
  let g = CITY.height(x, z);
  /* metro platforms and viaduct decks are walkable */
  for (const s of CITY.metro.stations) {
    if (abs(x-s.x) < 16 && abs(z-s.z) < 7) {
      const py = s.y + 15;
      if (this.P.y > py - 1.2) return py;
    }
  }
  return g;
},

/* --------------------------- DRIVING ---------------------------------- */
updateDriving(dt) {
  const P = this.P, K = this.keys, car = P.vehicle;
  car.throttle = (K["w"] ? 1 : 0) - (K["s"] ? 1 : 0);
  car.brake = K[" "] ? 1 : 0;
  car.handbrake = K["shift"] ? 1 : 0;
  const steerIn = (K["d"] ? 1 : 0) - (K["a"] ? 1 : 0);
  car.steer = damp(car.steer, steerIn, 9, dt);
  car.headlights = RENDER.env.nightAmt > 0.2;
  car.update(dt, RENDER.env);
  P.x = car.p[0]; P.y = car.p[1]; P.z = car.p[2];
  P.stats.dist += car.speed*dt;
  /* tyre smoke while drifting */
  if (car.driftAmt > 0.35 && car.grounded && Math.random() < dt*30) {
    for (const w of (car.mesh.wheels||[])) {
      const p = V3.xfm(this.tmpA, w, car.model);
      PARTICLES.spawn(p[0], p[1]-0.2, p[2], (Math.random()-.5)*2, 0.7, (Math.random()-.5)*2,
        0.34, .32,.31,.30, 0.9, 0, 1.6, 0.4);
    }
  }
  AUDIO.engineUpdate("player", car.rpm, sat(abs(car.throttle)) * 0.7 + car.driftAmt*0.3, null, 1);
  if (car.driftAmt > 0.3 && car.grounded) AUDIO.skid([car.p[0],car.p[1],car.p[2]], car.driftAmt);
  if (K["h"]) AUDIO.horn([car.p[0],car.p[1],car.p[2]]);
  if (car.destroyed) this.exitVehicle();
},
enterExitVehicle() {
  const P = this.P;
  if (P.vehicle) return this.exitVehicle();
  let best = null, bd = 4.2;
  for (const c of TRAFFIC.cars) {
    const d = hypot(c.p[0]-P.x, c.p[2]-P.z);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return;
  best.ai = null; best.occupant = P;
  P.vehicle = best;
  P.stats.drives++;
  AUDIO.engineStart("player");
  if (this.radioOn !== false) RADIO.setOn(true);
  UI.note("DRIVING · <b>" + best.C.name + "</b>");
},
exitVehicle() {
  const P = this.P;
  if (!P.vehicle) return;
  const car = P.vehicle;
  const side = cos(car.yaw)*2.4, sz = sin(car.yaw)*2.4;
  P.x = car.p[0] - side; P.z = car.p[2] - sz;
  P.y = CITY.height(P.x, P.z);
  P.vx = car.v[0]*0.3; P.vz = car.v[2]*0.3; P.vy = 0;
  car.occupant = null;
  AUDIO.engineStop("player");
  RADIO.setOn(false);
  if (!car.destroyed) { car.ai = { node: TRAFFIC.nearestNode(car.p[0], car.p[2]), next:null, t:0, cruise: 9 };
    TRAFFIC.pickNext(car); }
  P.vehicle = null;
},

/* ========================== COMBAT ==================================== */
aimRay(out) {
  const P = this.P;
  const cp = cos(P.pitch), sp = sin(P.pitch);
  const w = P.weapon;
  let yaw = P.yaw, pitch = P.pitch;
  if (w) { yaw -= w.recoilX; pitch += w.recoilY; }
  out[0] = -sin(yaw)*cos(pitch); out[1] = sin(pitch); out[2] = cos(yaw)*cos(pitch);
  return out;
},
eyePos(out) {
  const P = this.P;
  const h = lerp(1.68, 1.05, P.crouch) * (P.cfg ? P.cfg.height/1.78 : 1);
  if (P.vehicle) { const c = P.vehicle;
    return V3.xfm(out, c.mesh.seatL, c.model); }
  return V3.set(out, P.x, P.y + h + sin(P.phase*TAU)*P.bob*0.05, P.z);
},
playerShoot() {
  const P = this.P, w = P.weapon;
  if (!w) return;
  const W = w.W;
  if (W.sys === WSYS.MELEE) return this.playerMelee();
  if (W.sys === WSYS.THROWN) return this.throwGrenade();
  w.fire();
  const eye = this.eyePos(this.tmpA);
  const dir = this.aimRay(this.tmpB);
  /* muzzle flash + light */
  const mz = V3.mad(this.tmpC, eye, dir, 0.75);
  PARTICLES.muzzle(mz[0], mz[1], mz[2], dir[0], dir[1], dir[2], W.cls === "Shotgun" ? 1.6 : 1);
  AUDIO.gun(W.cls, mz, W.sys);
  this.dynLights.push({ x:mz[0], y:mz[1], z:mz[2], r:16, cr:5.5, cg:3.6, cb:1.6, kind:0, ttl:0.06 });
  const pellets = W.pellets || 1;
  const critBase = 0.08 + P.attrs.cool*0.02 + (P.perks.indexOf("p_cool2")>=0 && this.killT>0 ? 0.2 : 0);
  for (let i = 0; i < pellets; i++) {
    const sp = w.spread * lerp(1.9, 0.35, P.aim) * (1 + w.heat*0.6);
    const d = V3.set(V3.n(), dir[0], dir[1], dir[2]);
    d[0] += (Math.random()-.5)*sp*2; d[1] += (Math.random()-.5)*sp*2; d[2] += (Math.random()-.5)*sp*2;
    V3.nrm(d, d);
    const hit = this.traceShot(eye, d, W.range, W.pierce||0);
    if (hit) {
      const crit = Math.random() < critBase || hit.head;
      let dmg = w.damage * (1 + P.level*0.06) * (crit ? (W.crit||1.5) : 1);
      if (hit.head) dmg *= (P.cyber.eyes ? ITEMS[P.cyber.eyes].headshot : 1) * 2.1;
      if (P.perks.indexOf("p_cool3") >= 0 && hit.npc && hit.npc.hp >= hit.npc.maxHp) dmg *= 1.8;
      this.applyHit(hit, dmg, crit, d);
    } else {
      /* tracer into the distance so misses still read */
      const e = V3.mad(V3.n(), eye, d, W.range);
      this.tracer(mz, e, W.sys === WSYS.TECH ? [0.3,0.8,1] : [1,0.8,0.45]);
    }
  }
  /* shell ejection */
  if (W.mag > 0 && W.cls !== "Revolver") {
    const rx = -cos(P.yaw), rz = -sin(P.yaw);
    PARTICLES.spawn(eye[0]+rx*0.25, eye[1]-0.12, eye[2]+rz*0.25,
      rx*2.4+(Math.random()-.5), 2.2, rz*2.4+(Math.random()-.5),
      0.022, 0.85,0.65,0.25, 1.2, 1, 0.6, -13, 1.6);
  }
  if (P.wanted < 1 && this.nearCivilians(18)) this.raiseWanted(1);
  NPCS.alertArea(P.x, P.z, 42);
},
traceShot(o, d, range, pierce) {
  let best = null, bt = range;
  /* NPCs: capsule approximated by three spheres (head / chest / legs) */
  for (const n of NPCS.list) {
    if (n.state === "dead") continue;
    const h = n.mesh.height;
    const parts = [
      { y: n.y + h*0.93, r: 0.135*h/1.78, head: true },
      { y: n.y + h*0.68, r: 0.29*h/1.78 },
      { y: n.y + h*0.40, r: 0.24*h/1.78 },
    ];
    for (const p of parts) {
      const t = raySphere(o[0],o[1],o[2], d[0],d[1],d[2], n.x, p.y, n.z, p.r);
      if (t >= 0 && t < bt) { bt = t; best = { npc:n, head:!!p.head, t,
        x:o[0]+d[0]*t, y:o[1]+d[1]*t, z:o[2]+d[2]*t }; }
    }
  }
  /* vehicles */
  for (const c of TRAFFIC.cars) {
    const t = raySphere(o[0],o[1],o[2], d[0],d[1],d[2], c.p[0], c.p[1]+0.6, c.p[2], c.C.wid*1.1);
    if (t >= 0 && t < bt) { bt = t; best = { car:c, t, x:o[0]+d[0]*t, y:o[1]+d[1]*t, z:o[2]+d[2]*t }; }
  }
  /* world: buildings (AABB in local space) + ground */
  const cands = CITY.bldGrid.query(o[0], o[2], min(range, 160), []);
  for (const b of cands) {
    const cc = cos(-b.rot), ss = sin(-b.rot);
    const ox = o[0]-b.x, oz = o[2]-b.z;
    const lox = ox*cc - oz*ss, loz = ox*ss + oz*cc;
    const ldx = d[0]*cc - d[2]*ss, ldz = d[0]*ss + d[2]*cc;
    const t = rayAABB(lox, o[1]-b.y, loz, ldx, d[1], ldz,
      -b.hw, 0, -b.hd, b.hw, b.h, b.hd);
    if (t >= 0 && t < bt) { bt = t; best = { world:true, t,
      x:o[0]+d[0]*t, y:o[1]+d[1]*t, z:o[2]+d[2]*t, b }; }
  }
  /* ground plane */
  if (d[1] < -0.001) {
    for (let t = 2; t < min(bt, range); t += 3) {
      const px = o[0]+d[0]*t, py = o[1]+d[1]*t, pz = o[2]+d[2]*t;
      const g = CITY.height(px, pz);
      if (py <= g) { bt = t; best = { world:true, ground:true, t, x:px, y:g, z:pz }; break; }
    }
  }
  return best;
},
applyHit(hit, dmg, crit, dir) {
  const P = this.P;
  if (hit.npc) {
    const r = NPCS.damage(hit.npc, dmg, dir[0], dir[2], crit);
    PARTICLES.impact(hit.x, hit.y, hit.z, -dir[0], -dir[1], -dir[2], "flesh");
    AUDIO.impact("flesh", [hit.x, hit.y, hit.z]);
    if (crit || hit.head) PARTICLES.blood(hit.x, hit.y, hit.z, dir[0], dir[1], dir[2]);
    if (this.showDmg) UI.dmgNum(hit.x, hit.y, hit.z, dmg, crit || hit.head);
    this.hitmark(crit || hit.head);
    if (hit.head) P.stats.headshots++;
    if (r === 2) this.onKill(hit.npc);
    NPCS.alertArea(hit.npc.x, hit.npc.z, 40);
  } else if (hit.car) {
    hit.car.damage(dmg);
    PARTICLES.impact(hit.x, hit.y, hit.z, -dir[0], -dir[1], -dir[2], "metal");
    AUDIO.impact("metal", [hit.x, hit.y, hit.z]);
    this.hitmark(false);
    if (hit.car.burn > 0 && !hit.car._boom) { hit.car._boom = true;
      setTimeout(() => { PARTICLES.explosion(hit.car.p[0], hit.car.p[1]+0.6, hit.car.p[2], 3);
        AUDIO.explosion([hit.car.p[0], hit.car.p[1]+0.6, hit.car.p[2]]);
        this.dynLights.push({ x:hit.car.p[0], y:hit.car.p[1]+1, z:hit.car.p[2], r:44,
          cr:8, cg:4, cb:1.2, kind:0, ttl:0.6 });
        this.radiusDamage(hit.car.p[0], hit.car.p[1], hit.car.p[2], 8, 140); }, 1400); }
  } else {
    PARTICLES.impact(hit.x, hit.y, hit.z, -dir[0], -dir[1], -dir[2], "stone");
    AUDIO.impact("stone", [hit.x, hit.y, hit.z]);
    /* power weapons ricochet off hard surfaces */
    const W = P.weapon && P.weapon.W;
    if (W && W.ricochet && Math.random() < 0.22) {
      const nd = V3.set(V3.n(), -dir[0]+ (Math.random()-.5)*0.9, abs(dir[1])*0.4 + 0.1, -dir[2]+(Math.random()-.5)*0.9);
      V3.nrm(nd, nd);
      const o2 = V3.set(V3.n(), hit.x, hit.y, hit.z);
      const h2 = this.traceShot(o2, nd, 26, 0);
      AUDIO.ricochet([hit.x, hit.y, hit.z]);
      if (h2 && h2.npc) this.applyHit(h2, P.weapon.damage*0.55, false, nd);
      this.tracer(o2, h2 ? [h2.x,h2.y,h2.z] : V3.mad(V3.n(), o2, nd, 26), [1,0.75,0.4]);
    }
  }
  const mz = this.eyePos(V3.n());
  this.tracer(mz, [hit.x, hit.y, hit.z], [1,0.82,0.5]);
},
tracer(a, b, col) {
  const dx = b[0]-a[0], dy = b[1]-a[1], dz = b[2]-a[2];
  const len = hypot(dx,dy,dz);
  const n = min(9, max(2, (len/5)|0));
  for (let i = 0; i < n; i++) {
    const t = (i+0.4)/n;
    PARTICLES.spawn(a[0]+dx*t, a[1]+dy*t, a[2]+dz*t, 0,0,0,
      0.028, col[0],col[1],col[2], 0.07, 1, 0.1, 0, 3.2);
  }
},
hitmark(crit) {
  AUDIO.hitmark(crit);
  const h = $("hitmark");
  h.className = crit ? "crit" : "";
  h.style.opacity = "1";
  h.style.transform = "translate(-50%,-50%) scale(" + (crit ? 1.5 : 1.15) + ")";
  clearTimeout(this._hmT);
  this._hmT = setTimeout(() => { h.style.opacity = "0"; h.style.transform = "translate(-50%,-50%) scale(1)"; }, 120);
},
onKill(npc) {
  const P = this.P;
  P.stats.kills++;
  this.killT = 10;
  if (this.activeQuest) {
    const s = this.activeQuest.stages[this.questStage];
    if (s && s.kill) {
      const map = { merc:"merc", scav:"scav", tyger:"tyger", maelstrom:"maelstrom",
        sixth:"sixth", animals:"animal", voodoo:"voodoo", valentino:"valentino", ncpd:"ncpd" };
      if (npc.faction === (map[s.kill.faction] === "animal" ? "animals" : s.kill.faction) ||
          npc.arch === map[s.kill.faction]) this.stageKills++;
      else this.stageKills++;   // any hostile counts toward the encounter
    }
  }
  AUDIO.kill();
  this.addXP(40 + npc.A.hp*0.4);
  this.addStreet(6);
  if (P.perks.indexOf("p_body3") >= 0) P.hp = min(P.maxHp, P.hp + P.maxHp*0.12);
  /* loot */
  if (Math.random() < 0.55) {
    const roll = Math.random();
    if (roll < 0.4) this.addItem({ i:"scrap", n:1 });
    else if (roll < 0.6) this.addItem({ i:"maxdoc", n:1 });
    else if (roll < 0.72) this.addItem({ i:"optics", n:1 });
    else if (roll < 0.8 && npc.weapon) this.addItem({ w:npc.weapon.id, n:1 });
    else P.money += 40 + (Math.random()*260|0);
  }
  if (Math.random() < 0.12) this.giveShard();
  if (npc.faction === "ncpd") this.raiseWanted(2);
},
playerMelee() {
  const P = this.P, w = P.weapon;
  w.fire();
  const eye = this.eyePos(this.tmpA);
  const dir = this.aimRay(this.tmpB);
  const range = w.W.range * (P.cyber.arms ? 1.3 : 1);
  const hit = this.traceShot(eye, dir, range, 0);
  if (w.W.cls === "Katana") AUDIO.blade(eye); else AUDIO.melee(!!(hit && hit.npc), eye);
  if (hit && hit.npc) {
    let dmg = w.damage * (1 + P.attrs.body*0.12) * (P.cyber.arms ? ITEMS[P.cyber.arms].melee : 1);
    const crit = Math.random() < 0.2;
    this.applyHit(hit, dmg * (crit ? w.W.crit : 1), crit, dir);
  } else if (hit) PARTICLES.sparks(hit.x, hit.y, hit.z, 6, 1, .8, .4);
},
throwGrenade() {
  const P = this.P;
  if (P.grenades <= 0) return;
  P.grenades--;
  const eye = this.eyePos(V3.n());
  const dir = this.aimRay(V3.n());
  const g = { x:eye[0], y:eye[1], z:eye[2],
    vx:dir[0]*22, vy:dir[1]*22+4, vz:dir[2]*22, t:2.6 };
  (this.grenades || (this.grenades = [])).push(g);
},
updateGrenades(dt) {
  if (!this.grenades) return;
  for (let i = this.grenades.length-1; i >= 0; i--) {
    const g = this.grenades[i];
    g.t -= dt;
    g.vy -= 22*dt;
    g.x += g.vx*dt; g.y += g.vy*dt; g.z += g.vz*dt;
    const gy = CITY.height(g.x, g.z);
    if (g.y < gy) { g.y = gy; g.vy = -g.vy*0.32; g.vx *= 0.62; g.vz *= 0.62; }
    PARTICLES.spawn(g.x, g.y, g.z, 0,0,0, 0.05, 0.4,1,0.5, 0.09, 1, 0.1, 0, 1);
    if (g.t <= 0) {
      PARTICLES.explosion(g.x, g.y+0.4, g.z, 3.4);
      AUDIO.explosion([g.x, g.y+0.4, g.z]);
      this.dynLights.push({ x:g.x, y:g.y+1.2, z:g.z, r:46, cr:9, cg:4.6, cb:1.4, kind:0, ttl:0.5 });
      this.radiusDamage(g.x, g.y, g.z, WEAPONS.frag.radius, WEAPONS.frag.dmg);
      NPCS.alertArea(g.x, g.z, 60);
      this.grenades.splice(i, 1);
    }
  }
},
radiusDamage(x, y, z, r, dmg) {
  for (const n of NPCS.list) {
    if (n.state === "dead") continue;
    const d = hypot(n.x-x, n.z-z);
    if (d > r) continue;
    const f = 1 - d/r;
    const dd = dmg*f*f;
    const res = NPCS.damage(n, dd, (n.x-x)/max(d,.1), (n.z-z)/max(d,.1), false);
    if (this.showDmg) UI.dmgNum(n.x, n.y+1.4, n.z, dd, true);
    if (res === 2) this.onKill(n);
  }
  const pd = hypot(this.P.x-x, this.P.z-z);
  if (pd < r) this.hurt(dmg*(1-pd/r)*0.6, (this.P.x-x), (this.P.z-z));
  for (const c of TRAFFIC.cars) {
    const d = hypot(c.p[0]-x, c.p[2]-z);
    if (d < r) c.damage(dmg*(1-d/r));
  }
},
npcShoot(n, px, pz) {
  const W = n.weapon.W;
  const eye = V3.set(V3.n(), n.x, n.y + n.mesh.height*0.82, n.z);
  const P = this.P;
  const tx = P.x, ty = P.y + 1.2, tz = P.z;
  const d = V3.nrm(V3.n(), V3.set(V3.n(), tx-eye[0], ty-eye[1], tz-eye[2]));
  const sp = W.spread * 2.6;
  d[0] += (Math.random()-.5)*sp*2; d[1] += (Math.random()-.5)*sp*2; d[2] += (Math.random()-.5)*sp*2;
  V3.nrm(d, d);
  const mz = V3.mad(V3.n(), eye, d, 0.5);
  PARTICLES.muzzle(mz[0], mz[1], mz[2], d[0], d[1], d[2], 0.8);
  AUDIO.gun(W.cls, mz, W.sys);
  this.dynLights.push({ x:mz[0], y:mz[1], z:mz[2], r:12, cr:4, cg:2.6, cb:1.1, kind:0, ttl:0.05 });
  const hit = this.traceShot(eye, d, W.range, 0);
  const distToPlayer = hypot(tx-eye[0], tz-eye[2]);
  this.tracer(mz, hit ? [hit.x,hit.y,hit.z] : V3.mad(V3.n(), eye, d, W.range), [1,0.5,0.3]);
  /* did the ray pass close enough to the player capsule? */
  const t = raySphere(eye[0],eye[1],eye[2], d[0],d[1],d[2], tx, ty, tz, 0.5);
  if (t >= 0 && (!hit || hit.t >= t - 0.2)) {
    const dmg = W.dmg * (0.55 + Math.random()*0.5) * (1 + NPCS.list.length*0.0);
    this.hurt(dmg, tx-eye[0], tz-eye[2]);
  } else if (hit) this.applyWorldHit(hit, d);
},
applyWorldHit(hit, d) {
  if (hit.npc) { NPCS.damage(hit.npc, 12, d[0], d[2]); PARTICLES.impact(hit.x,hit.y,hit.z,-d[0],-d[1],-d[2],"flesh"); }
  else PARTICLES.impact(hit.x, hit.y, hit.z, -d[0], -d[1], -d[2], "stone");
},
npcMelee(n) {
  const P = this.P;
  const d = hypot(n.x-P.x, n.z-P.z);
  if (d < 3) this.hurt(18 + n.A.hp*0.05, P.x-n.x, P.z-n.z);
},
hurt(amt, dx, dz, fall) {
  const P = this.P;
  if (P.hp <= 0) return;
  let a = amt;
  const mit = P.armor / (P.armor + 120);
  a *= (1 - mit);
  P.hp -= a;
  this.fx.damage = min(1, this.fx.damage + a/60);
  this.hitFlash = 0.35;
  AUDIO.hurt(sat(a/45));
  $("dmgVig").style.opacity = String(sat(1 - P.hp/P.maxHp) * 0.9);
  if (P.hp <= 0) {
    if (P.cyber.circ && P.reviveT <= 0) {
      P.hp = P.maxHp*0.5; P.reviveT = 360;
      UI.note("SECOND HEART ENGAGED", "bad");
      return;
    }
    this.die();
  }
},
die() {
  const P = this.P;
  P.hp = 0;
  AUDIO.death();
  $("death").classList.add("on");
  this.releasePointer();
  this.started = false;
},
respawn() {
  const P = this.P;
  $("death").classList.remove("on");
  if (!this.loadGame()) {
    P.hp = P.maxHp; P.wanted = 0;
    P.x = -548; P.z = -2180; P.y = CITY.height(P.x, P.z);
    this.started = true;
  }
  $("dmgVig").style.opacity = "0";
  UI.show(null);
  this.capturePointer();
},
raiseWanted(n) {
  const P = this.P;
  const before = P.wanted;
  P.wanted = min(5, P.wanted + n);
  P.wantedT = 34;
  /* POLICE owns the actual response; this only records the scene so units
     converge on where it happened rather than teleporting onto the player */
  POLICE.reportCrime(P.x, P.z);
  if (P.wanted > before) UI.note("WANTED · <b>LEVEL " + P.wanted + "</b>", "bad");
},
nearCivilians(r) {
  for (const n of NPCS.list)
    if (n.faction === "civ" && n.state !== "dead" && hypot(n.x-this.P.x, n.z-this.P.z) < r) return true;
  return false;
},

/* ========================== QUICKHACKS ================================ */
toggleScanner() {
  this.scanning = !this.scanning;
  AUDIO.ui("scan");
  $("scanFx").classList.toggle("on", this.scanning);
  if (!this.scanning) { UI.scan(null); $("qhack").classList.remove("on"); }
},
useHack() {
  const P = this.P;
  const t = this.scanTarget;
  if (!t || !t.npc) return;
  const hid = P.hacks[this.hackSel || 0];
  const h = ITEMS[hid];
  if (!h) return;
  const cost = max(1, h.ram - (P.perks.indexOf("p_int3") >= 0 ? 2 : 0));
  if (P.ram < cost) { UI.note("INSUFFICIENT RAM", "bad"); return; }
  P.ram -= cost;
  this.fx.hack = 1;
  AUDIO.ui("hack");
  const n = t.npc;
  if (h.dmg) {
    const dm = h.dmg * (1 + P.attrs.int*0.08) * (P.perks.indexOf("p_int2")>=0 ? 1.35 : 1);
    const r = NPCS.damage(n, dm, 0, 0, true);
    UI.dmgNum(n.x, n.y+1.5, n.z, dm, true);
    PARTICLES.sparks(n.x, n.y+1.4, n.z, 16, 0.2, 0.9, 1);
    if (r === 2) this.onKill(n);
  }
  if (h.reveal) { this.pingT = 12; UI.note("PING · NETWORK MAPPED"); }
  if (h.blind) { n.aware = 0; n.state = "idle"; n.stateT = 0; UI.note("OPTICS REBOOTED"); }
  if (h.berserk) { n.faction = "berserk"; n.hostile = true; UI.note("CYBERPSYCHOSIS INDUCED", "bad"); }
  if (h.stun) { NPCS.damage(n, n.hp+1, 0, 0, false); this.onKill(n); UI.note("SYSTEM RESET"); }
  if (h.dot) { n._dot = { t:6, d:h.dot }; }
  UI.note(h.name.toUpperCase() + " · <b>" + cost + " RAM</b>");
},

/* ======================== INTERACTION ================================= */
interact() {
  const P = this.P;
  if (this.talkTarget && hypot(P.x-this.talkTarget.npc.x, P.z-this.talkTarget.npc.z) < 3.6) {
    const t = this.talkTarget;
    t.npc.state = "talk"; t.npc.stateT = 0; t.npc.faceTarget = { x:P.x, z:P.z };
    this.talkTarget = null;
    this.beginDialogue(t.dlg);
    return;
  }
  if (this.pickupTarget) {
    this.pickupTarget = null;
    P.shard = true;
    UI.note("ACQUIRED · <b>UNMARKED BIOCHIP</b>", "xp");
    this.fx.glitch = 1;
    setTimeout(() => this.advanceStage(), 900);
    return;
  }
  /* a companion waiting on you */
  if (P.romanceReady) for (const k in P.romanceReady) {
    const R = ROMANCE[k];
    if (!R || P.romanceDone && P.romanceDone[k]) continue;
    if (hypot(P.x-R.place.x, P.z-R.place.z) < 14) {
      (P.romanceDone || (P.romanceDone = {}))[k] = true;
      UI.startDialogue(R.scene, (res) => {
        if (res && res.indexOf("ROMANCE:") === 0) {
          P.romance = res.slice(8);
          UI.note("YOU AND <b>" + CAST[P.romance].short.toUpperCase() + "</b>", "xp");
        }
        this.capturePointer();
      });
      return;
    }
  }
  /* metro station */
  for (const s of CITY.metro.stations) {
    if (hypot(P.x-s.x, P.z-s.z) < 12) { this.openMetro(s); return; }
  }
  /* nearby vendor NPC */
  for (const n of NPCS.list) {
    if (n.state === "dead") continue;
    if (hypot(n.x-P.x, n.z-P.z) > 3.2) continue;
    if (n.arch === "vendor") { UI.startDialogue("d_vendor"); return; }
    if (n.arch === "ripper") { UI.startDialogue("d_ripper"); return; }
    if (n.castId) { n.state = "talk"; n.stateT = 0; n.faceTarget = { x:P.x, z:P.z };
      UI.startDialogue("d_ambient"); return; }
    if (n.state === "dead") continue;
  }
  /* loot a body */
  for (const n of NPCS.list) {
    if (n.state !== "dead" || n.looted) continue;
    if (hypot(n.x-P.x, n.z-P.z) > 2.4) continue;
    n.looted = true;
    P.money += 30 + (Math.random()*180|0);
    if (n.weapon && Math.random() < 0.5) this.addItem({ w:n.weapon.id, n:1 });
    this.addItem({ i:"scrap", n:1 });
    UI.note("LOOTED");
    return;
  }
},
addItem(it) {
  const P = this.P;
  const key = it.w ? "w" : "i";
  const ex = P.inv.find(o => o[key] === it[key]);
  if (ex && !it.w) ex.n += it.n;
  else if (ex && it.w) return;
  else P.inv.push(it);
  const def = it.w ? WEAPONS[it.w] : ITEMS[it.i];
  UI.note("+ " + def.name);
},
useItem(idx) {
  const P = this.P;
  const it = P.inv[idx];
  if (!it || !it.i) return;
  const d = ITEMS[it.i];
  if (d.heal) { P.hp = min(P.maxHp, P.hp + P.maxHp*d.heal); $("dmgVig").style.opacity = "0"; }
  if (d.ram) P.ram = min(P.maxRam, P.ram + d.ram);
  if (d.buff === "lace") P.laceT = 25;
  it.n--;
  if (it.n <= 0) P.inv.splice(idx, 1);
  UI.note("USED · " + d.name);
},
equip(wid) {
  const P = this.P;
  let slot = P.slots.indexOf(wid);
  if (slot < 0) { slot = P.slots.indexOf(null); if (slot < 0) slot = P.slot; P.slots[slot] = wid; }
  P.slot = slot;
  P.weapon = new WeaponInst(wid);
},
selectSlot(s) {
  const P = this.P;
  if (!P.slots[s]) { P.slot = s; P.weapon = new WeaponInst("fist"); return; }
  P.slot = s;
  P.weapon = new WeaponInst(P.slots[s]);
},
equipHack(id) {
  const P = this.P;
  if (P.hacks.indexOf(id) < 0) { if (P.hacks.length >= 4) P.hacks.shift(); P.hacks.push(id); }
},
buyCyber(k) {
  const P = this.P, d = ITEMS[k];
  if (P.money < d.price) { UI.note("NOT ENOUGH EDDIES", "bad"); return; }
  P.money -= d.price;
  P.cyber[d.slot] = k;
  this.recalc();
  UI.note("INSTALLED · <b>" + d.name + "</b>", "xp");
  UI.setTab("cyb");
},
giveShard() {
  const P = this.P;
  const avail = [];
  for (let i = 0; i < SHARDS.length; i++) if (P.shards.indexOf(i) < 0) avail.push(i);
  if (!avail.length) return;
  const idx = avail[(Math.random()*avail.length)|0];
  P.shards.push(idx);
  UI.note("SHARD · <b>" + SHARDS[idx].t + "</b>");
},
openShop() {
  UI.show("shop");
  this.releasePointer();
  const P = this.P;
  $("shopName").textContent = "TRADE";
  $("shopMoney").textContent = "€$ " + fmt(P.money);
  const buy = $("shopBuy"), sell = $("shopSell"), info = $("shopInfo");
  buy.innerHTML = ""; sell.innerHTML = ""; info.innerHTML = "";
  const stock = ["maxdoc","bounceback","ram_shard","stim","qh_ping","qh_over","qh_blind","qh_short","qh_sys"];
  const wstock = ["corvid","shrike","ashura","bulldog","kagejin","overture","kestrel","hornet","longshadow","bison","crowbar"];
  const show = (def) => {
    info.innerHTML = "";
    info.appendChild(el("div", "pTitle", def.name));
    info.appendChild(el("div", "rSub", (def.cls||def.kind||"").toUpperCase()));
    info.appendChild(el("div", "pFlav", def.desc||""));
  };
  for (const k of stock) {
    const d = ITEMS[k];
    const r = el("div", "row");
    r.appendChild(el("div", "ico", d.icon));
    const c = el("div"); c.appendChild(el("div", "rName q"+d.q, d.name));
    c.appendChild(el("div", "rSub", d.kind.toUpperCase())); r.appendChild(c);
    r.appendChild(el("div", "rRight", "€$" + fmt(d.price)));
    r.onmouseenter = () => show(d);
    r.onclick = () => { if (P.money < d.price) return UI.note("NOT ENOUGH EDDIES", "bad");
      P.money -= d.price; this.addItem({ i:k, n:1 }); this.openShop(); };
    buy.appendChild(r);
  }
  for (const k of wstock) {
    const d = WEAPONS[k];
    const r = el("div", "row");
    r.appendChild(el("div", "ico", "▮"));
    const c = el("div"); c.appendChild(el("div", "rName q"+d.tier, d.name));
    c.appendChild(el("div", "rSub", d.cls.toUpperCase() + " · " + WSYS_NAME[d.sys])); r.appendChild(c);
    r.appendChild(el("div", "rRight", "€$" + fmt(d.price)));
    r.onmouseenter = () => show(d);
    r.onclick = () => { if (P.money < d.price) return UI.note("NOT ENOUGH EDDIES", "bad");
      P.money -= d.price; this.addItem({ w:k, n:1 }); this.openShop(); };
    buy.appendChild(r);
  }
  P.inv.forEach((it, i) => {
    const d = it.w ? WEAPONS[it.w] : ITEMS[it.i];
    if (!d || !d.price) return;
    const r = el("div", "row");
    r.appendChild(el("div", "ico", d.icon || "▮"));
    const c = el("div"); c.appendChild(el("div", "rName", d.name + (it.n>1?" ×"+it.n:"")));
    c.appendChild(el("div", "rSub", "SELL")); r.appendChild(c);
    r.appendChild(el("div", "rRight", "€$" + fmt(round(d.price*0.35))));
    r.onmouseenter = () => show(d);
    r.onclick = () => { P.money += round(d.price*0.35); it.n--;
      if (it.n <= 0) P.inv.splice(i,1); this.openShop(); };
    sell.appendChild(r);
  });
},
openMetro(station) {
  UI.show("metro");
  this.releasePointer();
  this.metroFrom = station;
  const list = $("metroList");
  list.innerHTML = "";
  const head = el("div", "rSub", "DEPARTING · " + station.name.toUpperCase() +
    " · LINES " + station.lines.join(" / "));
  head.style.marginBottom = "10px";
  list.appendChild(head);
  for (const s of CITY.metro.stations) {
    if (s.id === station.id) continue;
    const shared = s.lines.filter(l => station.lines.indexOf(l) >= 0);
    const d = hypot(s.x-station.x, s.z-station.z);
    const r = el("div", "mLine");
    const dot = el("div", "mDot");
    const line = CITY.metro.lines.find(l => l.id === (shared[0] || s.lines[0]));
    dot.style.background = line ? line.col : "#888";
    r.appendChild(dot);
    const c = el("div");
    c.appendChild(el("div", "mName", s.name));
    c.appendChild(el("div", "rSub", s.dist + " · LINE " + s.lines.join(" ")));
    r.appendChild(c);
    r.appendChild(el("div", "mDist", (shared.length ? "DIRECT" : "TRANSFER") + " · " + round(d) + "m"));
    r.onclick = () => this.rideMetro(s);
    list.appendChild(r);
  }
  requestAnimationFrame(() => this.drawMetroMap());
},
drawMetroMap() {
  const wrap = $("metroMapCv");
  if (!wrap) return;
  wrap.width = wrap.parentElement.clientWidth;
  wrap.height = wrap.parentElement.clientHeight;
  const cam = { x: 0, z: -300, zoom: min(wrap.width/5600, wrap.height/6200) };
  UI.drawMapInto(wrap, cam, { labels: true });
},
rideMetro(dest) {
  UI.fade(true, () => {
    const P = this.P;
    P.x = dest.x + 6; P.z = dest.z + 6;
    P.y = dest.y + 15;
    P.vx = P.vy = P.vz = 0;
    RENDER.env.time += 180 + Math.random()*300;
    UI.show(null);
    UI.fade(false);
    this.capturePointer();
    UI.note("NCART · ARRIVED AT <b>" + dest.name.toUpperCase() + "</b>");
  });
},

/* =========================== SAVE / LOAD ============================== */
saveGame() {
  const P = this.P;
  const data = {
    v: 3, name:P.name, lifepath:P.lifepath, x:P.x, y:P.y, z:P.z, yaw:P.yaw,
    hp:P.hp, money:P.money, xp:P.xp, level:P.level, street:P.street,
    attrs:P.attrs, perks:P.perks, attrPoints:P.attrPoints, perkPoints:P.perkPoints,
    inv:P.inv, slots:P.slots, slot:P.slot, hacks:P.hacks, cyber:P.cyber,
    grenades:P.grenades, shard:P.shard, integrity:P.integrity,
    contacts:P.contacts, messages:P.messages, questsDone:P.questsDone, shards:P.shards,
    rel:P.rel, romance:P.romance,
    stats:P.stats, cfg:P.cfg, quest: this.activeQuest ? this.activeQuest.id : null,
    stage: this.questStage, time: RENDER.env.time, rain: RENDER.env.rain,
  };
  try { localStorage.setItem("ghostline_save", JSON.stringify(data)); } catch (e) {}
  this.lastSave = this.time;
},
loadGame() {
  let raw;
  try { raw = localStorage.getItem("ghostline_save"); } catch (e) { return false; }
  if (!raw) { UI.note("NO SAVE FOUND", "bad"); return false; }
  let d;
  try { d = JSON.parse(raw); } catch (e) { return false; }
  const P = this.P;
  Object.assign(P, {
    name:d.name, lifepath:d.lifepath, x:d.x, y:d.y, z:d.z, yaw:d.yaw||0,
    hp:d.hp, money:d.money, xp:d.xp, level:d.level, street:d.street,
    attrs:d.attrs, perks:d.perks||[], attrPoints:d.attrPoints||0, perkPoints:d.perkPoints||0,
    inv:d.inv||[], slots:d.slots||["corvid",null,null], slot:d.slot||0,
    hacks:d.hacks||["qh_ping"], cyber:d.cyber||{}, grenades:d.grenades||0,
    shard:d.shard, integrity:d.integrity===undefined?1:d.integrity,
    contacts:d.contacts||["odds"], messages:d.messages||[], questsDone:d.questsDone||[],
    shards:d.shards||[], rel:d.rel||{}, romance:d.romance||null,
    stats:d.stats||{kills:0,headshots:0,dist:0,drives:0,quests:0},
    cfg:d.cfg, vehicle:null,
  });
  if (P.cfg) { if (P.body) GX.freeMesh(P.body); P.body = BODY.build(P.cfg);
    P.sk = new Skeleton(P.cfg.height/1.78); VARMS.invalidate(); }
  this.recalc();
  POLICE.reset();
  this.activeQuest = d.quest ? QUESTS[d.quest] : null;
  this.questStage = d.stage || 0;
  this.stageKills = 0;
  RENDER.env.time = d.time || 21*3600;
  RENDER.env.rain = d.rain === undefined ? 0.3 : d.rain;
  this.selectSlot(P.slot);
  this.started = true;
  UI.show(null);
  UI.fade(false);
  $("death").classList.remove("on");
  this.capturePointer();
  UI.note("SAVE LOADED", "xp");
  return true;
},
toMainMenu() {
  this.saveGame();
  this.started = false;
  this.releasePointer();
  UI.show("mm");
},

/* ======================= AMBIENT SYSTEMS ============================== */
buildRain() {
  /* rain is particle-driven around the camera, recycled every frame */
  this.rainT = 0;
},
updateRain(dt) {
  const rain = RENDER.env.rain;
  if (rain < 0.02) return;
  const P = this.P;
  const n = (rain * 90 * dt * 60)|0;
  for (let i = 0; i < min(n, 34); i++) {
    const a = Math.random()*TAU, d = Math.random()*22;
    const x = P.x + cos(a)*d, z = P.z + sin(a)*d;
    PARTICLES.spawn(x, P.y + 9 + Math.random()*6, z, 0.6, -16, 0.4,
      0.10, 0.55, 0.62, 0.72, 0.62, 3, 0.02, -8, 6);
  }
},
buildWater() {
  const B = new MeshBuilder();
  const N = 40, S = 220;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = (i/N-0.5)*S*N/8, z0 = (j/N-0.5)*S*N/8;
  }
  /* one large grid, re-centred on the camera each frame */
  const G = 60, ext = 2400;
  for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
    const x0 = (i/G-0.5)*ext*2, z0 = (j/G-0.5)*ext*2;
    const st = ext*2/G;
    B.quad([x0,0,z0+st],[x0+st,0,z0+st],[x0+st,0,z0],[x0,0,z0], 1, 1);
  }
  this.waterMesh = B.build();
},

startMenuBg() {
  /* the main menu renders a slow flythrough of the real city */
  this.menuT = 0;
  this.menuCam = { x:-1100, y:180, z:-500, yaw:0.6, pitch:-0.12 };
},

/* ============================ FRAME =================================== */
frame(now) {
  requestAnimationFrame(this.frame.bind(this));
  const t = now * 0.001;
  const raw = t - (this._last || t);          // true frame time, unclamped
  let dt = min(0.05, raw);                    // simulation step, clamped
  this._last = t;
  this.dt = dt; this.time += dt;
  /* FPS is measured against real elapsed time, not the clamped step, so a
     stalling frame reports as a stall instead of silently reading 60. */
  this.frames++; this.fpsT += raw;
  if (this.fpsT > 0.5) {
    this.fps = this.frames/this.fpsT; this.frames = 0; this.fpsT = 0;
    this.adaptQuality();
  }
  if (this.loading) return;

  const P = this.P;
  const menuMode = !this.started || UI.screen === "mm";

  /* --- world clock ---------------------------------------------------- */
  RENDER.env.time = (RENDER.env.time + dt*this.clockScale) % 86400;
  RENDER.updateEnv(dt);

  /* --- simulate ------------------------------------------------------- */
  const active = this.started && !UI.screen && !this.paused;
  const simDt = dt * (P.slowmo > 0 ? 0.35 : 1);
  if (menuMode) {
    const m = this.menuCam;
    /* menuFrozen parks the flythrough — used by the credits screen and by
       automated capture so a fixed vantage can be held. */
    if (!this.menuFrozen) {
      this.menuT += dt;
      m.yaw += dt*0.035;
      m.x = -1100 + sin(this.menuT*0.06)*380;
      m.z = -500 + cos(this.menuT*0.05)*420;
      m.y = 150 + sin(this.menuT*0.09)*45;
    }
    RENDER.setCamera(m.x, m.y, m.z, m.yaw, m.pitch, 0, 62);
    WORLD.ensure(m.x, m.z, 7);
  } else {
    if (active) {
      this.updatePlayer(simDt);
      this.updateGrenades(simDt);
      TRAFFIC.update(simDt, P.x, P.z, RENDER.env);
      NPCS.updateCrowd(simDt, P.x, P.z, P.wanted > 0);
      POLICE.update(simDt, P);
      this.checkStage();
      this.updateInteractPrompt();
      this.updateScan();
    }
    PARTICLES.update(dt);
    this.updateRain(dt);
    this.updateAudio(dt);
    WORLD.ensure(P.x, P.z, 5.5);
    /* camera */
    const eye = this.eyePos(this.tmpA);
    let roll = 0, fov = RENDER.settings.fov;
    if (P.vehicle) {
      const c = P.vehicle;
      roll = c.roll*0.35;
      fov += min(24, c.speed*0.42);
      const seat = V3.xfm(this.tmpB, c.mesh.seatL, c.model);
      RENDER.setCamera(seat[0], seat[1], seat[2], P.yaw, P.pitch, roll, fov);
    } else {
      fov = lerp(fov, fov*0.72, P.aim) + P.sprint*5;
      const bobX = sin(P.phase*TAU)*P.bob*0.035;
      const bobY = abs(cos(P.phase*TAU))*P.bob*0.028;
      roll = -P.vx*0.0 + sin(P.phase*TAU)*P.bob*0.014;
      RENDER.setCamera(eye[0]+bobX, eye[1]-bobY, eye[2], P.yaw, P.pitch, roll, fov);
    }
    /* decaying screen effects */
    this.fx.glitch = max(0, this.fx.glitch - dt*1.1);
    this.fx.hack = max(0, this.fx.hack - dt*1.4);
    this.fx.damage = max(0, this.fx.damage - dt*0.9);
    if (this.killT > 0) this.killT -= dt;
    if (P.hp < P.maxHp*0.3) this.fx.damage = max(this.fx.damage, 0.25 + sin(this.time*4)*0.08);
    $("dmgVig").style.opacity = String(sat(1 - P.hp/P.maxHp) * 0.75);
    /* holocall portrait: animate and render the caller as real geometry */
    if (this.callActive) {
      this.callT += dt;
      const sk = this.castSk[this.callWho];
      const mesh = this.castMesh[this.callWho];
      if (sk && mesh) {
        /* talk drives the jaw bone, which the head mesh is genuinely skinned to */
        const speaking = this.callT < this.callDur;
        if (speaking) ANIM.talk(sk, this.callT*1.35, 3.1, 1.0);
        else ANIM.idle(sk, this.callT, 3.1);
        sk.pose();
        RENDER.portraitPass(mesh, sk, this.callTint);
        this.callFade = damp(this.callFade, this.callT < this.callDur + 0.5 ? 1 : 0, 7, dt);
        if (this.callFade < 0.02 && this.callT > this.callDur) this.callActive = false;
      }
    }
    /* HUD */
    UI.updateHUD(P);
    UI.tickChip(dt);
    UI.tickNotes(dt);
    UI.tickWorldUI(dt);
    UI.tickDialogue(dt);
    UI.drawMini(P);
    this.updateMarkers();
    if (this.time - this.lastSave > 90) this.saveGame();
  }
  /* prune expiring dynamic lights */
  for (let i = this.dynLights.length-1; i >= 0; i--) {
    const l = this.dynLights[i];
    l.ttl -= dt;
    if (l.ttl <= 0) this.dynLights.splice(i, 1);
  }

  this.render(dt, menuMode);
},

/* Drop detail automatically on machines that can't hold the frame, and let it
   climb back when there is headroom. Never overrides a manual preset change. */
adaptQuality() {
  if (this._manualQuality) return;
  const S = RENDER.settings;
  if (this.fps < 24 && this._adaptCool !== undefined && this.time > this._adaptCool) {
    if (S.resScale > 0.62) { S.resScale = max(0.62, S.resScale - 0.12); RENDER.resize(true); }
    else if (S.ssr) S.ssr = 0;
    else if (S.volumetrics) S.volumetrics = 0;
    else if (S.ssao) S.ssao = 0;
    else if (S.shadows > 1) S.shadows = 1;
    else if (S.drawDist > 1200) S.drawDist -= 300;
    else return;
    this._adaptCool = this.time + 4;
  } else if (this.fps > 55 && this._adaptCool !== undefined && this.time > this._adaptCool + 8) {
    if (S.resScale < 1.0) { S.resScale = min(1.0, S.resScale + 0.06); RENDER.resize(true); this._adaptCool = this.time + 6; }
  }
  if (this._adaptCool === undefined) this._adaptCool = this.time + 6;
},

/* Live audio mix: ambience density from what is actually around the player,
   engine voices for the nearest few cars, and the radio's lookahead scheduler. */
updateAudio(dt) {
  if (!AUDIO.ready) return;
  const P = this.P;
  RADIO.update();
  /* density drives the traffic rumble bed */
  let near = 0;
  for (const c of TRAFFIC.cars) if (hypot(c.p[0]-P.x, c.p[2]-P.z) < 90) near++;
  const dens = sat(near/9) * (1 - CITY.cityFalloff(P.x, P.z));
  const neon = WORLD.lightHash.query(P.x, P.z, 14, this._ltmp || (this._ltmp = [])).length > 2;
  AUDIO.ambience(dt, RENDER.env, dens, false, neon);

  /* voice the three closest traffic cars, retire the rest */
  const sorted = TRAFFIC.cars.slice().sort((a,b) =>
    (hypot(a.p[0]-P.x,a.p[2]-P.z)) - (hypot(b.p[0]-P.x,b.p[2]-P.z)));
  const want = new Set();
  for (let i = 0; i < min(3, sorted.length); i++) {
    const c = sorted[i];
    if (hypot(c.p[0]-P.x, c.p[2]-P.z) > 70) break;
    const id = "car" + c.id;
    want.add(id);
    AUDIO.engineStart(id);
    AUDIO.engineUpdate(id, c.rpm, sat(abs(c.throttle)), c.p, 10);
  }
  for (const id of AUDIO.engines.keys())
    if (id !== "player" && !want.has(id)) AUDIO.engineStop(id);

  /* sporadic city one-shots — the thing that makes a city sound inhabited */
  this._ambT = (this._ambT || 0) - dt;
  if (this._ambT <= 0) {
    this._ambT = 3 + Math.random()*7;
    const a = Math.random()*TAU, d = 40 + Math.random()*120;
    const pos = [P.x + cos(a)*d, P.y + 4 + Math.random()*20, P.z + sin(a)*d];
    const r = Math.random();
    const kind = r < 0.22 ? "distantSiren" : r < 0.40 ? "distantGun"
               : r < 0.58 ? "flyby" : r < 0.74 ? "trainPass" : "crowd";
    AUDIO.cityEvent(pos, kind);
  }
  /* low-health heartbeat */
  if (P.hp < P.maxHp*0.28) {
    this._hbT = (this._hbT || 0) - dt;
    if (this._hbT <= 0) { this._hbT = 0.85; AUDIO.heartbeat(); }
  }
},

updateInteractPrompt() {
  const P = this.P;
  let txt = null, key = "E";
  if (P.vehicle) txt = "EXIT VEHICLE", key = "F";
  else {
    for (const s of CITY.metro.stations)
      if (hypot(P.x-s.x, P.z-s.z) < 12) { txt = "NCART · " + s.name.toUpperCase(); break; }
    if (!txt) for (const c of TRAFFIC.cars)
      if (hypot(c.p[0]-P.x, c.p[2]-P.z) < 4.2) { txt = "DRIVE " + c.C.name.toUpperCase(); key = "F"; break; }
    if (!txt) for (const n of NPCS.list) {
      if (hypot(n.x-P.x, n.z-P.z) > 3.2) continue;
      if (n.state === "dead" && !n.looted) { txt = "LOOT"; break; }
      if (n.arch === "vendor") { txt = "TRADE"; break; }
      if (n.castId) { txt = "TALK TO " + (n.name||"").toUpperCase(); break; }
    }
  }
  if (this.talkTarget || this.pickupTarget) return;
  UI.prompt(txt, key);
},
updateScan() {
  if (!this.scanning) { this.scanTarget = null; return; }
  const P = this.P;
  const eye = this.eyePos(this.tmpA), dir = this.aimRay(this.tmpB);
  let best = null, bd = 60;
  for (const n of NPCS.list) {
    if (n.state === "dead") continue;
    const dx = n.x-eye[0], dy = (n.y+1.4)-eye[1], dz = n.z-eye[2];
    const d = hypot(dx,dy,dz);
    if (d > bd) continue;
    const dot = (dx*dir[0] + dy*dir[1] + dz*dir[2])/d;
    if (dot < 0.965) continue;
    bd = d; best = n;
  }
  if (!best) { UI.scan(null); $("qhack").classList.remove("on"); this.scanTarget = null; return; }
  this.scanTarget = { npc: best };
  best.scanned = true;
  UI.scan({ key: "npc"+best.id, rows: [
    ["NAME", best.name || best.A.name],
    ["FACTION", best.faction.toUpperCase()],
    ["THREAT", best.A.hp > 250 ? "VERY HIGH" : best.A.hp > 160 ? "HIGH" : best.A.hp > 100 ? "MODERATE" : "LOW"],
    ["HEALTH", round(best.hp) + " / " + best.maxHp],
    ["STATE", best.state.toUpperCase()],
    ["ARMED", best.weapon ? best.weapon.W.name : "UNARMED"],
    ["CYBERWARE", best.mesh.cfg && best.mesh.cfg.cyber && Object.keys(best.mesh.cfg.cyber).length ? "DETECTED" : "MINIMAL"],
    ["DISTANCE", round(bd) + " m"],
  ]});
  /* quickhack list */
  const box = $("qhack");
  box.classList.add("on");
  if (box.dataset.n !== String(this.P.hacks.length) + (this.hackSel||0)) {
    box.dataset.n = String(this.P.hacks.length) + (this.hackSel||0);
    box.innerHTML = "";
    this.P.hacks.forEach((h, i) => {
      const d = ITEMS[h];
      const e = el("div", "qhItem" + (i === (this.hackSel||0) ? " on" : ""));
      e.style.left = "180px"; e.style.top = (i*46 - 60) + "px";
      e.innerHTML = "<div class='n'>" + d.icon + " " + d.name + "</div><div class='c'>" + d.ram + " RAM · [H]</div>";
      e.onclick = () => { this.hackSel = i; box.dataset.n = ""; };
      box.appendChild(e);
    });
  }
},
updateMarkers() {
  const list = this.markerList;
  list.length = 0;
  const P = this.P;
  const q = this.activeQuest;
  if (q && q.stages[this.questStage] && q.stages[this.questStage].marker) {
    const m = q.stages[this.questStage].marker;
    const d = hypot(P.x-m.x, P.z-m.z);
    list.push({ x:m.x, y:CITY.height(m.x,m.z)+3.4, z:m.z, label:m.label, dist:d });
  }
  if (this.waypoint) {
    const d = hypot(P.x-this.waypoint.x, P.z-this.waypoint.z);
    list.push({ x:this.waypoint.x, y:CITY.height(this.waypoint.x,this.waypoint.z)+3, z:this.waypoint.z,
      label:"WAYPOINT", dist:d });
  }
  if (this.pingT > 0) {
    this.pingT -= this.dt;
    for (const n of NPCS.list) {
      if (n.state === "dead") continue;
      const d = hypot(n.x-P.x, n.z-P.z);
      if (d > 40) continue;
      list.push({ x:n.x, y:n.y+n.mesh.height+0.3, z:n.z, label:n.A.name.toUpperCase(),
        dist:d, hostile:n.hostile });
    }
  } else {
    for (const n of NPCS.list) {
      if (n.state === "dead" || !n.hostile) continue;
      const d = hypot(n.x-P.x, n.z-P.z);
      if (d > 70) continue;
      list.push({ x:n.x, y:n.y+n.mesh.height+0.3, z:n.z, label:"", dist:d, hostile:true });
    }
  }
  UI.markers(list);
},

/* ============================ RENDER ================================== */
render(dt, menuMode) {
  const gl = GX.gl;
  const P = this.P;
  RENDER.begin(dt);
  const camX = RENDER.camPos[0], camZ = RENDER.camPos[2];

  /* gather static + dynamic lights */
  const dyn = this.dynLights.slice();
  if (!menuMode) {
    for (const c of TRAFFIC.cars) {
      if (!c.headlights) continue;
      const d = hypot(c.p[0]-camX, c.p[2]-camZ);
      if (d > 130) continue;
      const fx = -sin(c.yaw), fz = cos(c.yaw);
      dyn.push({ x:c.p[0]+fx*2.2, y:c.p[1]+0.4, z:c.p[2]+fz*2.2, r:34,
        cr:3.4, cg:3.5, cb:3.8, kind:2, dx:fx, dy:-0.12, dz:fz, cone:0.62 });
      dyn.push({ x:c.p[0]-fx*2.4, y:c.p[1]+0.5, z:c.p[2]-fz*2.4, r:9,
        cr:2.6, cg:0.15, cb:0.25, kind:0 });
    }
    if (P.vehicle) {
      const c = P.vehicle;
      const fx = -sin(c.yaw), fz = cos(c.yaw);
      dyn.push({ x:c.p[0]+fx*2.4, y:c.p[1]+0.45, z:c.p[2]+fz*2.4, r:46,
        cr:4.2, cg:4.3, cb:4.6, kind:2, dx:fx, dy:-0.1, dz:fz, cone:0.55 });
    }
    if (P.weapon && P.weapon.recoil > 0.05)
      dyn.push({ x:RENDER.camPos[0], y:RENDER.camPos[1], z:RENDER.camPos[2], r:14,
        cr:P.weapon.recoil*3, cg:P.weapon.recoil*2, cb:P.weapon.recoil*0.9, kind:0 });
  }
  RENDER.gatherLights(camX, camZ, dyn);

  /* ---------------- shadow cascades ---------------- */
  RENDER.shadowPass((c, lvp, frust) => {
    const p = GX.use(RENDER.prog.shadow);
    gl.uniformMatrix4fv(p.u.uLVP, false, lvp);
    const ident = RENDER._ident || (RENDER._ident = M4.n());
    gl.uniformMatrix4fv(p.u.uModel, false, ident);
    for (const [k, s] of WORLD.sectors) {
      if (!frust.aabb(s.x0, s.ymin, s.z0, s.x1, s.ymax, s.z1)) continue;
      if (s.solid) GX.draw(s.solid);
      if (s.glass) GX.draw(s.glass);
    }
    if (c > 0) return;    // only the tightest cascade carries characters
    for (const chk of WORLD.chunks.values()) {
      if (!frust.aabb(chk.x0, chk.ymin, chk.z0, chk.x1, chk.ymax, chk.z1)) continue;
      if (chk.detail) GX.draw(chk.detail);
    }
    const sp = GX.use(RENDER.prog.shadowSkin);
    gl.uniformMatrix4fv(sp.u.uLVP, false, lvp);
    gl.uniform1f(sp.u.uBoneCount, BONE.COUNT);
    GX.bindTex(0, RENDER.bones); gl.uniform1i(sp.u.uBones, 0);
    for (const n of NPCS.list) {
      if (hypot(n.x-camX, n.z-camZ) > 46) continue;
      gl.bindTexture(gl.TEXTURE_2D, RENDER.bones.t);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, BONE.COUNT, gl.RGBA, gl.FLOAT, n.sk.tex);
      gl.uniformMatrix4fv(sp.u.uModel, false, n.model);
      GX.draw(n.mesh);
    }
    const cp = GX.use(RENDER.prog.shadow);
    gl.uniformMatrix4fv(cp.u.uLVP, false, lvp);
    for (const car of TRAFFIC.cars) {
      if (hypot(car.p[0]-camX, car.p[2]-camZ) > 70) continue;
      gl.uniformMatrix4fv(cp.u.uModel, false, car.model);
      GX.draw(car.mesh);
    }
  });

  /* ---------------- G-buffer ---------------- */
  RENDER.gbufBegin();
  const F = RENDER.frustum;
  const dd = RENDER.settings.drawDist;
  let pg = RENDER.useGbuf("facade");
  const ident = RENDER._ident || (RENDER._ident = M4.n());
  gl.uniformMatrix4fv(pg.u.uModel, false, ident);
  for (const s of WORLD.sectors.values()) {
    if (!s.glass) continue;
    if (hypot(s.cx-camX, s.cz-camZ) > dd) continue;
    if (!F.aabb(s.x0, s.ymin, s.z0, s.x1, s.ymax, s.z1)) continue;
    GX.draw(s.glass);
  }
  pg = RENDER.useGbuf("gbuf");
  gl.uniformMatrix4fv(pg.u.uModel, false, ident);
  for (const s of WORLD.sectors.values()) {
    if (!s.solid) continue;
    if (hypot(s.cx-camX, s.cz-camZ) > dd) continue;
    if (!F.aabb(s.x0, s.ymin, s.z0, s.x1, s.ymax, s.z1)) continue;
    GX.draw(s.solid);
  }
  for (const c of WORLD.chunks.values()) {
    if (!c.detail) continue;
    if (hypot(c.cx-camX, c.cz-camZ) > 360) continue;
    if (!F.aabb(c.x0, c.ymin, c.z0, c.x1, c.ymax, c.z1)) continue;
    GX.draw(c.detail);
  }
  /* vehicles */
  for (const car of TRAFFIC.cars) {
    if (hypot(car.p[0]-camX, car.p[2]-camZ) > 220) continue;
    if (!F.sphere(car.p[0], car.p[1]+1, car.p[2], car.C.len)) continue;
    gl.uniform4f(pg.u.uTint || null, 1,1,1,1);
    RENDER.drawMesh(pg, car.mesh, car.model);
    /* wheels */
    if (VEHICLE.wheelMesh && car.mesh.wheels) {
      const wm = M4.n(), tmp = M4.n(), q = Q4.n();
      for (let i = 0; i < car.mesh.wheels.length; i++) {
        const w = car.mesh.wheels[i];
        const steer = i < 2 ? car.steer*0.4 : 0;
        Q4.euler(q, 0, steer, car.wheelSpin);
        M4.trs(tmp, w[0], w[1], w[2], q[0], q[1], q[2], q[3], 1, 1, 1);
        M4.mul(wm, car.model, tmp);
        RENDER.drawMesh(pg, VEHICLE.wheelMesh, wm);
      }
    }
  }
  /* characters */
  const ps = GX.use(RENDER.prog.skin);
  gl.uniformMatrix4fv(ps.u.uVP, false, RENDER.vp);
  gl.uniformMatrix4fv(ps.u.uPrevVP, false, RENDER.prevVP);
  gl.uniform3fv(ps.u.uCamPos, RENDER.camPos);
  gl.uniform1f(ps.u.uTime, RENDER.frameT);
  gl.uniform1f(ps.u.uWetness, RENDER.env.wetness);
  gl.uniform1f(ps.u.uBoneCount, BONE.COUNT);
  GX.bindTex(0, TEX.albArr); gl.uniform1i(ps.u.uAlb, 0);
  GX.bindTex(1, TEX.srfArr); gl.uniform1i(ps.u.uSrf, 1);
  GX.bindTex(2, RENDER.bones); gl.uniform1i(ps.u.uBones, 2);
  GX.bindTex(3, RENDER.bones); gl.uniform1i(ps.u.uPrevBones, 3);
  gl.uniformMatrix4fv(ps.u.uPrevModel, false, ident);
  GX.cull(0);
  for (const n of NPCS.list) {
    const d = hypot(n.x-camX, n.z-camZ);
    if (d > 150) continue;
    if (!F.sphere(n.x, n.y+0.9, n.z, 1.4)) continue;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, RENDER.bones.t);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, BONE.COUNT, gl.RGBA, gl.FLOAT, n.sk.tex);
    gl.uniformMatrix4fv(ps.u.uModel, false, n.model);
    gl.uniformMatrix4fv(ps.u.uPrevModel, false, n.prevModel);
    GX.draw(n.mesh);
  }
  GX.cull(gl.BACK);

  /* first-person weapon viewmodel */
  if (!menuMode && this.started && P.weapon && !P.vehicle) {
    const pg2 = RENDER.useGbuf("gbuf");
    const m = this.viewmodelMatrix(dt);
    GX.cull(0);                       // hands are thin; show both faces
    const arms = VARMS.get(P.weapon.id, P.cfg);
    if (arms) RENDER.drawMesh(pg2, arms, m);
    if (P.weapon.mesh && P.weapon.W.cls !== "Melee") RENDER.drawMesh(pg2, P.weapon.mesh, m);
    GX.cull(gl.BACK);
  }

  /* ---------------- lighting + effects ---------------- */
  RENDER.ssaoPass();
  RENDER.lightPass();
  RENDER.ssrPass();
  RENDER.volPass();

  /* ---------------- forward: neon + particles ---------------- */
  RENDER.copyDepth();
  RENDER.forwardBegin();
  const pn = RENDER.useNeon();
  gl.uniformMatrix4fv(pn.u.uModel, false, ident);
  for (const c of WORLD.chunks.values()) {
    if (!c.neon) continue;
    if (hypot(c.cx-camX, c.cz-camZ) > 420) continue;
    if (!F.aabb(c.x0, c.ymin, c.z0, c.x1, c.ymax, c.z1)) continue;
    GX.draw(c.neon);
  }
  const pp = RENDER.useParticles();
  PARTICLES.draw();
  GX.cull(gl.BACK);

  /* ---------------- post ---------------- */
  RENDER.post(this.fx);
  /* holocall portrait sits on top of the finished frame */
  if (this.callActive && this.callFade > 0.01) {
    const r = UI.callRect();
    if (r) RENDER.blitPortrait(r, this.callFade);
  }
},

viewmodelMatrix(dt) {
  const P = this.P, w = P.weapon;
  const m = this._vmM || (this._vmM = M4.n());
  const tmp = M4.n(), q = Q4.n();
  /* sway from look delta, bob from locomotion, recoil kick, ADS blend */
  const swayT = -this.mouse.dx * 0.0;
  w.swayX = damp(w.swayX, clamp(-P.vx*0.006, -0.03, 0.03), 8, dt);
  w.swayY = damp(w.swayY, clamp(P.vy*0.004, -0.04, 0.04), 8, dt);
  const bob = P.bob;
  const bx = sin(P.phase*TAU)*bob*0.035 * (1-P.aim);
  const by = abs(cos(P.phase*TAU))*bob*0.026 * (1-P.aim);
  const idleX = sin(this.time*0.9)*0.004*(1-P.aim);
  const idleY = cos(this.time*1.3)*0.003*(1-P.aim);
  /* hip position vs sighted position */
  /* Weapon sits further forward than a bare model would need, so the arms
     behind it clear the near plane; ADS pulls it to the optical centre. */
  const hipX = 0.165, hipY = -0.150, hipZ = 0.520;
  const adsX = 0.0,   adsY = -0.046, adsZ = 0.345;
  const a = P.aim;
  let ox = lerp(hipX, adsX, a) + bx + idleX + w.swayX;
  let oy = lerp(hipY, adsY, a) + by + idleY + w.swayY - P.crouch*0.03;
  let oz = lerp(hipZ, adsZ, a) - w.recoil*0.06 - P.sprint*0.10;
  const kick = w.recoil;
  const pitch = -w.recoilY*3.2 - kick*0.28 - P.sprint*0.45;
  const yaw = lerp(-0.22, 0, a) + w.recoilX*2.4 + P.sprint*0.35;
  const roll = lerp(0.06, 0, a) + P.sprint*0.28 + sin(P.phase*TAU)*bob*0.05*(1-a);
  /* camera-space -> world */
  const cam = RENDER.invView;
  Q4.euler(q, pitch, yaw, roll);
  M4.trs(tmp, ox, oy, -oz, q[0], q[1], q[2], q[3], 1, 1, 1);
  M4.mul(m, cam, tmp);
  return m;
},
};

/* ------------------------------------------------------------------------ */
window.addEventListener("load", () => { GAME.boot(); });
</script>
</body>
</html>
