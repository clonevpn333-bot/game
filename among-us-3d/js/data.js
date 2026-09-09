/* ============================================================
   AMONG US 3D — DATA
   Colors, cosmetics catalog, roles, lobby settings, quick chat.
   ============================================================ */
window.AU = window.AU || {};
(function (AU) {
'use strict';

/* ---------------- COLORS (the 18 official crew colors) ---------------- */
AU.COLORS = [
  { id:'red',    name:'Red',     hex:0xC51111, shadow:0x7A0838 },
  { id:'blue',   name:'Blue',    hex:0x132ED1, shadow:0x09158E },
  { id:'green',  name:'Green',   hex:0x117F2D, shadow:0x0A4D2E },
  { id:'pink',   name:'Pink',    hex:0xED54BA, shadow:0xAB2BAD },
  { id:'orange', name:'Orange',  hex:0xEF7D0D, shadow:0xB33E15 },
  { id:'yellow', name:'Yellow',  hex:0xF5F557, shadow:0xC38823 },
  { id:'black',  name:'Black',   hex:0x3F474E, shadow:0x1E1F26 },
  { id:'white',  name:'White',   hex:0xD6E0F0, shadow:0x8394BC },
  { id:'purple', name:'Purple',  hex:0x6B2FBB, shadow:0x3B177C },
  { id:'brown',  name:'Brown',   hex:0x71491E, shadow:0x5E2615 },
  { id:'cyan',   name:'Cyan',    hex:0x38FEDC, shadow:0x24A9BE },
  { id:'lime',   name:'Lime',    hex:0x50EF39, shadow:0x15A742 },
  { id:'maroon', name:'Maroon',  hex:0x6C2B3D, shadow:0x3F1F2B },
  { id:'rose',   name:'Rose',    hex:0xFFD6EC, shadow:0xD9A3CB },
  { id:'banana', name:'Banana',  hex:0xFFFFBE, shadow:0xD0C68B },
  { id:'gray',   name:'Gray',    hex:0x8397A7, shadow:0x53616F },
  { id:'tan',    name:'Tan',     hex:0x9F9989, shadow:0x6D6555 },
  { id:'coral',  name:'Coral',   hex:0xEC7578, shadow:0xB55A5C }
];
AU.colorById = function (id) {
  for (var i = 0; i < AU.COLORS.length; i++) if (AU.COLORS[i].id === id) return AU.COLORS[i];
  return AU.COLORS[0];
};
AU.colorIndex = function (id) {
  for (var i = 0; i < AU.COLORS.length; i++) if (AU.COLORS[i].id === id) return i;
  return 0;
};

/* ---------------- COSMETICS ----------------
   kind:  hat | visor | skin | pet | nameplate
   price: beans (0 = free/default). cube: cosmicube id + pod cost when locked behind a cube.
   build: key used by models.js to construct the 3D geometry.
------------------------------------------------ */
AU.HATS = [
  { id:'none',        name:'No Hat',           price:0,    rarity:'common', build:'none' },
  { id:'cap',         name:'Backwards Cap',    price:200,  rarity:'common', build:'cap' },
  { id:'fedora',      name:'Fedora',           price:250,  rarity:'common', build:'fedora' },
  { id:'partyhat',    name:'Party Hat',        price:200,  rarity:'common', build:'party' },
  { id:'beanie',      name:'Beanie',           price:220,  rarity:'common', build:'beanie' },
  { id:'headphones',  name:'Headphones',       price:400,  rarity:'rare',   build:'headphones' },
  { id:'antenna',     name:'Antenna',          price:400,  rarity:'rare',   build:'antenna' },
  { id:'flower',      name:'Flower',           price:350,  rarity:'rare',   build:'flower' },
  { id:'banana',      name:'Banana',           price:500,  rarity:'rare',   build:'banana' },
  { id:'egg',         name:'Egg',              price:150,  rarity:'common', build:'egg' },
  { id:'toiletpaper', name:'Toilet Paper',     price:450,  rarity:'rare',   build:'tp' },
  { id:'plunger',     name:'Plunger',          price:500,  rarity:'rare',   build:'plunger' },
  { id:'cheese',      name:'Cheese',           price:450,  rarity:'rare',   build:'cheese' },
  { id:'halo',        name:'Halo',             price:900,  rarity:'epic',   build:'halo' },
  { id:'crown',       name:'Crown',            price:1200, rarity:'epic',   build:'crown' },
  { id:'topgun',      name:'Pilot Cap',        price:800,  rarity:'epic',   build:'pilot' },
  { id:'mini',        name:'Mini Crewmate',    price:2000, rarity:'legend', build:'mini' },
  { id:'ufohat',      name:'UFO',              price:1800, rarity:'legend', build:'ufo' },
  { id:'astro',       name:'Astro Helmet',     price:1500, rarity:'epic',   build:'astro' },
  { id:'horns',       name:'Devil Horns',      price:1400, rarity:'epic',   build:'horns',  cube:'impostor', pods:40 },
  { id:'wizard',      name:'Wizard Hat',       price:1600, rarity:'epic',   build:'wizard', cube:'fungle',   pods:35 },
  { id:'leaf',        name:'Leaf Cap',         price:600,  rarity:'rare',   build:'leaf',   cube:'fungle',   pods:15 },
  { id:'goggleshat',  name:'Goggles Up',       price:600,  rarity:'rare',   build:'goggleshat' },
  { id:'bandana',     name:'Bandana',          price:550,  rarity:'rare',   build:'bandana', cube:'airship', pods:20 }
];
AU.VISORS = [
  { id:'none',       name:'Standard Visor', price:0,   rarity:'common', build:'none' },
  { id:'geek',       name:'Geek Glasses',   price:250, rarity:'common', build:'geek' },
  { id:'shades',     name:'Shades',         price:300, rarity:'common', build:'shades' },
  { id:'ski',        name:'Ski Goggles',    price:350, rarity:'rare',   build:'ski' },
  { id:'monocle',    name:'Monocle',        price:600, rarity:'rare',   build:'monocle', cube:'airship', pods:20 },
  { id:'eyepatch',   name:'Eye Patch',      price:500, rarity:'rare',   build:'eyepatch' },
  { id:'bandage',    name:'Bandage',        price:300, rarity:'common', build:'bandage' },
  { id:'angry',      name:'Angry Eyes',     price:700, rarity:'epic',   build:'angry',   cube:'impostor', pods:25 },
  { id:'cateye',     name:'Cat Eyes',       price:700, rarity:'epic',   build:'cateye' },
  { id:'scanner',    name:'HUD Scanner',    price:900, rarity:'epic',   build:'scanner' }
];
AU.SKINS = [
  { id:'none',      name:'Default',      price:0,    rarity:'common', build:'none' },
  { id:'mechanic',  name:'Mechanic',     price:300,  rarity:'common', build:'mechanic' },
  { id:'military',  name:'Military',     price:350,  rarity:'common', build:'military' },
  { id:'police',    name:'Police',       price:400,  rarity:'rare',   build:'police' },
  { id:'science',   name:'Science',      price:400,  rarity:'rare',   build:'science' },
  { id:'suit',      name:'Black Suit',   price:500,  rarity:'rare',   build:'suit' },
  { id:'captain',   name:'Captain',      price:800,  rarity:'epic',   build:'captain',  cube:'airship', pods:30 },
  { id:'prisoner',  name:'Prisoner',     price:600,  rarity:'rare',   build:'prisoner', cube:'airship', pods:20 },
  { id:'astronaut', name:'Astronaut',    price:900,  rarity:'epic',   build:'astronaut' },
  { id:'wallguard', name:'Wall Guard',   price:700,  rarity:'epic',   build:'wallguard' },
  { id:'diver',     name:'Diver',        price:850,  rarity:'epic',   build:'diver',    cube:'fungle', pods:30 },
  { id:'tarmac',    name:'Tarmac',       price:450,  rarity:'rare',   build:'tarmac' }
];
AU.PETS = [
  { id:'none',      name:'No Pet',       price:0,    rarity:'common', build:'none' },
  { id:'minicrew',  name:'Mini Crewmate',price:700,  rarity:'rare',   build:'minicrew' },
  { id:'dog',       name:'Doggo',        price:900,  rarity:'rare',   build:'dog' },
  { id:'hamster',   name:'Hamster',      price:900,  rarity:'rare',   build:'hamster' },
  { id:'ufo',       name:'UFO',          price:1400, rarity:'epic',   build:'ufo' },
  { id:'brainslug', name:'Brain Slug',   price:1400, rarity:'epic',   build:'slug',   cube:'impostor', pods:35 },
  { id:'robot',     name:'Robot',        price:1200, rarity:'epic',   build:'robot' },
  { id:'squig',     name:'Squig',        price:1600, rarity:'legend', build:'squig',  cube:'fungle', pods:40 },
  { id:'ellie',     name:'Ellie',        price:1100, rarity:'epic',   build:'ellie' }
];
AU.NAMEPLATES = [
  { id:'none',      name:'Default',      price:0,    rarity:'common', css:'transparent' },
  { id:'steel',     name:'Steel Plate',  price:200,  rarity:'common', css:'#5a6b86' },
  { id:'gold',      name:'Gold Bar',     price:600,  rarity:'rare',   css:'linear-gradient(90deg,#F5C842,#FFF0A8)' },
  { id:'circuit',   name:'Circuitry',    price:500,  rarity:'rare',   css:'linear-gradient(90deg,#0a3b3b,#38FEDC)' },
  { id:'lava',      name:'Reactor',      price:800,  rarity:'epic',   css:'linear-gradient(90deg,#7a1010,#EF7D0D)' },
  { id:'void',      name:'Deep Space',   price:800,  rarity:'epic',   css:'linear-gradient(90deg,#1b1040,#6B2FBB)' },
  { id:'sus',       name:'Sus',          price:1500, rarity:'legend', css:'linear-gradient(90deg,#C51111,#ED54BA)', cube:'impostor', pods:50 },
  { id:'moss',      name:'Mossy',        price:600,  rarity:'rare',   css:'linear-gradient(90deg,#12401f,#50EF39)', cube:'fungle', pods:20 }
];
AU.COSMETIC_KINDS = ['hat','visor','skin','pet','nameplate'];
AU.catalog = function (kind) {
  return kind === 'hat' ? AU.HATS : kind === 'visor' ? AU.VISORS : kind === 'skin' ? AU.SKINS
       : kind === 'pet' ? AU.PETS : AU.NAMEPLATES;
};
AU.cosmetic = function (kind, id) {
  var list = AU.catalog(kind);
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return list[0];
};

/* ---------------- COSMICUBES ---------------- */
AU.COSMICUBES = [
  { id:'impostor', name:'Impostor Cosmicube', price:2500, currency:'beans', color:'#C51111',
    desc:'Sinister cosmetics for the sneaky sort. Unlock nodes with Pods earned in matches.',
    paths:[
      { name:'RED PATH',  nodes:[ {kind:'visor',id:'angry',pods:25}, {kind:'hat',id:'horns',pods:40}, {kind:'nameplate',id:'sus',pods:50} ] },
      { name:'DARK PATH', nodes:[ {kind:'pet',id:'brainslug',pods:35} ] }
    ] },
  { id:'airship', name:'Airship Cosmicube', price:2000, currency:'beans', color:'#E2B10C',
    desc:'Fresh from the skies. Brass, uniforms and stolen jewels.',
    paths:[
      { name:'CREW PATH',  nodes:[ {kind:'hat',id:'bandana',pods:20}, {kind:'skin',id:'prisoner',pods:20}, {kind:'skin',id:'captain',pods:30} ] },
      { name:'VAULT PATH', nodes:[ {kind:'visor',id:'monocle',pods:20} ] }
    ] },
  { id:'fungle', name:'Fungle Cosmicube', price:2200, currency:'beans', color:'#50EF39',
    desc:'Spores, leaves and island critters from The Fungle.',
    paths:[
      { name:'JUNGLE PATH', nodes:[ {kind:'hat',id:'leaf',pods:15}, {kind:'nameplate',id:'moss',pods:20}, {kind:'hat',id:'wizard',pods:35} ] },
      { name:'REEF PATH',   nodes:[ {kind:'skin',id:'diver',pods:30}, {kind:'pet',id:'squig',pods:40} ] }
    ] }
];
AU.cubeById = function (id) {
  for (var i = 0; i < AU.COSMICUBES.length; i++) if (AU.COSMICUBES[i].id === id) return AU.COSMICUBES[i];
  return null;
};

/* Bean / Star bundles (Stars are the premium currency; here they're earned, never sold for money) */
AU.BUNDLES = [
  { id:'b1', name:'Handful of Beans', give:{beans:500},  cost:{stars:1},  desc:'500 Beans' },
  { id:'b2', name:'Bag of Beans',     give:{beans:1500}, cost:{stars:2},  desc:'1500 Beans' },
  { id:'b3', name:'Crate of Beans',   give:{beans:4000}, cost:{stars:5},  desc:'4000 Beans' },
  { id:'p1', name:'Pod Pack',         give:{pods:25},    cost:{beans:800},desc:'25 Pods for Cosmicubes' },
  { id:'p2', name:'Big Pod Pack',     give:{pods:70},    cost:{beans:2000},desc:'70 Pods for Cosmicubes' }
];

/* ---------------- ROLES ----------------
   team: 'crew' | 'impostor'
   Defaults mirror the real game's role options.
--------------------------------------------- */
AU.ROLES = {
  crewmate: { id:'crewmate', name:'Crewmate', team:'crew', color:'#7FE8FF',
    desc:'Finish your tasks and find the Impostors.', ability:null },

  engineer: { id:'engineer', name:'Engineer', team:'crew', color:'#F5C842',
    desc:'You can use the vents to move around the map.', ability:'Vent',
    opts:{ cooldown:30, maxTime:15 } },

  scientist: { id:'scientist', name:'Scientist', team:'crew', color:'#7FE8FF',
    desc:'You can check Vitals anywhere. Complete tasks to recharge the battery.', ability:'Vitals',
    opts:{ cooldown:15, battery:5 } },

  noisemaker: { id:'noisemaker', name:'Noisemaker', team:'crew', color:'#FF9DE0',
    desc:'When you die, an alert shows everyone where you were killed.', ability:null,
    opts:{ alertDuration:3, impostorSeesAlert:false } },

  tracker: { id:'tracker', name:'Tracker', team:'crew', color:'#50EF39',
    desc:'Place a tracker on a player and follow their location on your map.', ability:'Track',
    opts:{ cooldown:25, duration:30, delay:3 } },

  detective: { id:'detective', name:'Detective', team:'crew', color:'#FFD27F',
    desc:'Take notes on a body, then interrogate suspects in the meeting.', ability:'Notes',
    opts:{ interrogations:2 } },

  guardian: { id:'guardian', name:'Guardian Angel', team:'crew', color:'#BFEFFF',
    desc:'From the afterlife, shield the living from a single kill.', ability:'Protect',
    opts:{ cooldown:30, duration:10, visibleShield:true } },

  judge: { id:'judge', name:'Judge', team:'crew', color:'#FFE38A',
    desc:'Overrule a vote once. If you are wrong, you are ejected instead.', ability:'Overrule',
    opts:{ uses:1 } },

  impostor: { id:'impostor', name:'Impostor', team:'impostor', color:'#FF4D4D',
    desc:'Sabotage and eliminate the Crew.', ability:null },

  shapeshifter: { id:'shapeshifter', name:'Shapeshifter', team:'impostor', color:'#FF4D4D',
    desc:'Take the appearance of another player for a short time.', ability:'Shapeshift',
    opts:{ cooldown:15, duration:30, leaveSkin:true } },

  phantom: { id:'phantom', name:'Phantom', team:'impostor', color:'#FF4D4D',
    desc:'Turn invisible and slip past the Crew.', ability:'Vanish',
    opts:{ cooldown:30, duration:15 } },

  viper: { id:'viper', name:'Viper', team:'impostor', color:'#FF4D4D',
    desc:'Kill with acid. Bodies dissolve, hiding the evidence.', ability:'Acid',
    opts:{ dissolveTime:20 } }
};
AU.CREW_ROLES     = ['engineer','scientist','noisemaker','tracker','detective','guardian','judge'];
AU.IMPOSTOR_ROLES = ['shapeshifter','phantom','viper'];

/* ---------------- LOBBY SETTINGS ---------------- */
AU.SETTING_DEFS = [
  { group:'GAME' },
  { key:'map',            name:'Map',                type:'enum', values:['skeld','mira','polus','airship','fungle'],
    labels:['The Skeld','MIRA HQ','Polus','The Airship','The Fungle'], def:'airship' },
  { key:'impostors',      name:'# Impostors',        type:'int',  min:1, max:3, step:1, def:2 },
  { key:'confirmEjects',  name:'Confirm Ejects',     type:'bool', def:true },
  { key:'emergencies',    name:'Emergency Meetings', type:'int',  min:0, max:9, step:1, def:1 },
  { key:'emergencyCd',    name:'Emergency Cooldown', type:'int',  min:0, max:60, step:5, def:15, unit:'s' },
  { key:'discussionTime', name:'Discussion Time',    type:'int',  min:0, max:120, step:5, def:15, unit:'s' },
  { key:'votingTime',     name:'Voting Time',        type:'int',  min:0, max:300, step:15, def:120, unit:'s' },
  { key:'anonymousVotes', name:'Anonymous Votes',    type:'bool', def:false },
  { key:'taskBar',        name:'Task Bar Updates',   type:'enum', values:['always','meetings','never'],
    labels:['Always','Meetings','Never'], def:'always' },
  { group:'MOVEMENT & VISION' },
  { key:'playerSpeed',    name:'Player Speed',       type:'float',min:0.5, max:3, step:0.25, def:1, unit:'x' },
  { key:'crewVision',     name:'Crewmate Vision',    type:'float',min:0.25,max:5, step:0.25, def:1, unit:'x' },
  { key:'impVision',      name:'Impostor Vision',    type:'float',min:0.25,max:5, step:0.25, def:1.5, unit:'x' },
  { group:'IMPOSTOR' },
  { key:'killCooldown',   name:'Kill Cooldown',      type:'int',  min:10, max:60, step:2.5, def:45, unit:'s' },
  { key:'killDistance',   name:'Kill Distance',      type:'enum', values:['short','medium','long'],
    labels:['Short','Medium','Long'], def:'short' },
  { group:'TASKS' },
  { key:'visualTasks',    name:'Visual Tasks',       type:'bool', def:true },
  { key:'commonTasks',    name:'Common Tasks',       type:'int',  min:0, max:2, step:1, def:1 },
  { key:'longTasks',      name:'Long Tasks',         type:'int',  min:0, max:3, step:1, def:1 },
  { key:'shortTasks',     name:'Short Tasks',        type:'int',  min:0, max:5, step:1, def:2 }
];
AU.ROLE_SETTING_DEFS = [
  { group:'CREWMATE ROLES' },
  { key:'role_engineer',  name:'Engineer',  type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'engineerCd',     name:'  Vent Cooldown',      type:'int', min:5, max:60, step:5, def:30, unit:'s', sub:true },
  { key:'engineerMax',    name:'  Max Time In Vents',  type:'int', min:5, max:60, step:5, def:15, unit:'s', sub:true },
  { key:'role_scientist', name:'Scientist', type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'scientistCd',    name:'  Vitals Cooldown',    type:'int', min:5, max:60, step:5, def:15, unit:'s', sub:true },
  { key:'scientistBat',   name:'  Battery Charge',     type:'int', min:5, max:30, step:5, def:5,  unit:'s', sub:true },
  { key:'role_noisemaker',name:'Noisemaker',type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'noiseDur',       name:'  Alert Duration',     type:'int', min:1, max:15, step:1, def:3, unit:'s', sub:true },
  { key:'noiseImp',       name:'  Impostor Sees Alert',type:'bool', def:false, sub:true },
  { key:'role_tracker',   name:'Tracker',   type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'trackerCd',      name:'  Tracking Cooldown',  type:'int', min:5, max:60, step:5, def:25, unit:'s', sub:true },
  { key:'trackerDur',     name:'  Tracking Duration',  type:'int', min:5, max:60, step:5, def:30, unit:'s', sub:true },
  { key:'role_detective', name:'Detective', type:'int', min:0, max:100, step:10, def:20, unit:'%' },
  { key:'detInterro',     name:'  Interrogations',     type:'int', min:1, max:5, step:1, def:2, sub:true },
  { key:'role_guardian',  name:'Guardian Angel', type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'gaCd',           name:'  Protect Cooldown',   type:'int', min:5, max:60, step:5, def:30, unit:'s', sub:true },
  { key:'gaDur',          name:'  Protect Duration',   type:'int', min:5, max:30, step:5, def:10, unit:'s', sub:true },
  { key:'gaVisible',      name:'  Shield Visible',     type:'bool', def:true, sub:true },
  { key:'role_judge',     name:'Judge',     type:'int', min:0, max:100, step:10, def:15, unit:'%' },
  { group:'IMPOSTOR ROLES' },
  { key:'role_shapeshifter', name:'Shapeshifter', type:'int', min:0, max:100, step:10, def:40, unit:'%' },
  { key:'ssCd',           name:'  Shapeshift Cooldown',type:'int', min:5, max:60, step:5, def:15, unit:'s', sub:true },
  { key:'ssDur',          name:'  Shapeshift Duration',type:'int', min:5, max:60, step:5, def:30, unit:'s', sub:true },
  { key:'ssLeave',        name:'  Leave Skin Behind',  type:'bool', def:true, sub:true },
  { key:'role_phantom',   name:'Phantom',   type:'int', min:0, max:100, step:10, def:40, unit:'%' },
  { key:'phCd',           name:'  Vanish Cooldown',    type:'int', min:5, max:60, step:5, def:30, unit:'s', sub:true },
  { key:'phDur',          name:'  Vanish Duration',    type:'int', min:5, max:30, step:5, def:15, unit:'s', sub:true },
  { key:'role_viper',     name:'Viper',     type:'int', min:0, max:100, step:10, def:30, unit:'%' },
  { key:'viperDis',       name:'  Body Dissolve Time', type:'int', min:5, max:60, step:5, def:20, unit:'s', sub:true }
];
AU.CLIENT_SETTING_DEFS = [
  { group:'CONTROLS & DISPLAY' },
  { key:'sensitivity',  name:'Mouse Sensitivity', type:'float', min:0.2, max:3, step:0.1, def:1, unit:'x' },
  { key:'fov',          name:'Field of View',     type:'int',   min:60, max:110, step:5, def:78, unit:'°' },
  { key:'thirdPerson',  name:'Third Person Camera', type:'bool', def:false },
  { key:'headBob',      name:'Head Bob',          type:'bool',  def:true },
  { key:'quality',      name:'Graphics Quality',  type:'enum',  values:['low','medium','high'], labels:['Low','Medium','High'], def:'medium' },
  { key:'showFps',      name:'Show FPS',          type:'bool',  def:false },
  { group:'AUDIO & CHAT' },
  { key:'sfxVolume',    name:'SFX Volume',        type:'int',   min:0, max:100, step:10, def:70, unit:'%' },
  { key:'musicVolume',  name:'Music Volume',      type:'int',   min:0, max:100, step:10, def:40, unit:'%' },
  { key:'voiceMode',    name:'Voice Chat',        type:'enum',  values:['off','proximity','meeting','always'],
    labels:['Off','Proximity','Meetings Only','Always On'], def:'proximity' },
  { key:'voiceVolume',  name:'Voice Volume',      type:'int',   min:0, max:100, step:10, def:100, unit:'%' },
  { key:'pushToTalk',   name:'Push To Talk (V)',  type:'bool',  def:false },
  { key:'censorChat',   name:'Censor Chat',       type:'bool',  def:true }
];
AU.defaultSettings = function (defs) {
  var o = {};
  for (var i = 0; i < defs.length; i++) if (defs[i].key) o[defs[i].key] = defs[i].def;
  return o;
};

/* ---------------- QUICK CHAT ---------------- */
AU.QUICKCHAT = [
  'Where?', 'I saw them vent!', 'Sus', 'Not me', 'It was self report',
  'Skip', 'I was doing tasks', 'Any clues?', 'Who do you suspect?', 'I can clear them',
  'Let\'s vote', 'Dead body in ', 'I was in ', 'They faked a task', 'Trust me'
];
AU.CENSOR = ['damn','hell','stupid','idiot','crap'];

/* ---------------- MISC BALANCE ---------------- */
AU.BASE_SPEED       = 4.2;   // units/sec at 1x
AU.KILL_RANGES      = { short:1.6, medium:2.4, long:3.4 };
AU.USE_RANGE        = 2.0;
AU.REPORT_RANGE     = 2.4;
AU.VISION_BASE      = 14;    // fog far distance at 1x vision
AU.PLAYER_RADIUS    = 0.42;
AU.EYE_HEIGHT       = 1.28;
AU.NAMES = ['Red','Blue','Green','Pink','Orange','Yellow','Black','White','Purple','Brown',
  'Cyan','Lime','Maroon','Rose','Banana','Gray','Tan','Coral'];
AU.BOT_NAMES = ['Sus','Kai','Nova','Pixel','Bolt','Echo','Zed','Momo','Rex','Vex','Juno','Milo',
  'Tofu','Quill','Bean','Ozzy','Wisp','Dart','Gizmo','Nyx','Pogo','Sable'];

})(window.AU);
