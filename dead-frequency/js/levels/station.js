'use strict';
// KTLR 94.1 FM — the station building, parking lot and back lot.
//
// Plan (x right, z toward the parking lot):
//   north row z -8..-1.2 : Break room (-13..-5) | Bath (-5..-2.5) | Engineering (-2.5..3) | Prod B (3..9) | Storage (9..13)
//   hall      z -1.2..1.2
//   south row z 1.2..8   : Lobby (-13..-6) | Ray's office (-6..-1) | Studio A (-1..7) | Library (7..13)

const Levels = {};

const STATION_DOCS = {
  backdoor: `<h2>NOTICE</h2>BACK DOOR STICKS.\n\nPull HARD, then LIFT.\nDo NOT prop it open with the fire extinguisher. Again.\n\n— Ray`,
  addresses: `<h2>DEDICATIONS POLICY</h2>First names and towns ONLY.\n\nNo street addresses.\nNo last names.\nNo "she's at the Shell on 9 all by herself, give her a call."\n\nWe are a radio station, not a dating service.\nThis means you, Marcy.\n\n— R.T.`,
  carrie: `<h1 class="red">MISSING</h1><div class="ph">[ photo: young woman, dark blonde hair, waitress apron, laughing at someone off-camera ]</div><h2>CARRIE ANN LINDQVIST</h2>Age 23 · 5'5" · 120 lbs · Hazel eyes\n\nLast seen leaving the Pine Hollow Diner, Route 9, after closing on <b>March 2, 2003</b> at approx. 1:00 AM.\n\nHer silver 1996 Honda Civic was found the next morning on the shoulder at mile marker 14, keys in the ignition, radio on.\n\nANY INFORMATION: Hollis County Sheriff's Office\n541-555-0110\n\n<i>"She always sang along to the radio on the drive home." — her mother</i>`,
  biscuit: `LOST CAT\n\n"BISCUIT"\nOrange tabby, fat, judgmental.\nAnswers to the sound of a can opener.\n\nLast seen near the Feed & Seed.\nPlease call Darlene 555-0177`,
  coffee: `KTLR COFFEE CLUB\n$5 / month\n\nRay ........... PAID\nMarcy ......... PAID\nGwen .......... PAID\nEvan .......... <span class="red">owes $10</span>\nDale .......... "I bring my own"\n\nWHOEVER LEAVES THE POT ON THE BURNER ALL NIGHT: WE KNOW.`,
  festival: `KESSLER GAP\n31st ANNUAL\nHARVEST FESTIVAL\n\nSat. Oct 23 · Grange Hall\nPie auction · Chili cook-off · Hayrides\nLive remote broadcast by KTLR 94.1!\n\n"The Gap's Own Station"`,
  requestline: `<h2>TIMBERLINE AFTER DARK</h2>Requests & Dedications\n10 PM – 2 AM nightly\n\n☎ 541-555-0941\n\n"Working late? Driving home? Can't sleep?\nCall us. Tell us who you're thinking about tonight.\nWe'll play something for you."`,
  lacey: `<h2>IN HONOR OF</h2><h1>LACEY HARMON</h1>Overnight Host, 1993 – 1997\n\n"The voice that kept the Gap company."\n\nLacey signed on every night at midnight with the same words: <i>"If you're still up, you're not alone. I'm right here."</i>\n\nMissing since March 14, 1997.\nWe're still listening, Lace.\n\n— Your KTLR family`,
  staffphoto: `<div class="ph">[ photo: seven people squinting into the sun in front of this building. Someone has drawn a mustache on the station sign. ]</div><b>KTLR STAFF — SUMMER 1996</b>\n\nBack row: Ray Tolliver (Owner/GM), Dale Pruitt (Engineer), Bud Kimmel (Sales)\nFront row: Gwen Ostrander (Traffic), Lacey Harmon (Overnights), Tim "T-Bone" Reyes (Mornings), Marcy Dunn (Intern!)\n\nDale is the only one not looking at the camera. He's looking at Lacey.`,
  plaque: `KTLR 94.1 FM\nKESSLER GAP, OREGON\n\nServing the Gap since 1971\n\nHOLLIS COUNTY CHAMBER OF COMMERCE\nSmall Business of the Year — 1988`,
  raynote: `Evan —\n\nMarcy leaves at 10:30. After that it's your show.\n\n• Station ID at the top of every hour. LIVE, not the cart.\n• Requests 10–2. Log every one in the book.\n• Transmitter readings on the hour (the remote panel by the board). Write them down. FCC loves paperwork.\n• Lock the back door. The REAL lock. The deadbolt.\n\nDon't call me after midnight unless we're OFF THE AIR.\nAutomation runs the music. You run everything else.\n\n— Ray\n\nP.S. If Dale shows up he has keys, don't freak out. He does the STL at weird hours.`,
  faxcover: `<b>FAX</b>  KTLR 94.1  541-555-0940\n\nTO:   Dale Pruitt — Pruitt Broadcast Svc.\nFROM: Ray\nRE:   October staff schedule\nPGS:  2\n\nDale — here's October so you know when the building's staffed vs. empty for the STL work. Evan's on overnights Fridays now, he's a good kid, don't scare him.\n\nAlso: logger is out of tapes again. You still have the last six.\n\n— R`,
  schedule: `<h2>KTLR — OCTOBER 2004 SCHEDULE</h2><pre style="font-family:inherit;font-size:15px">          MON    TUE    WED    THU    FRI    SAT    SUN
6-10A    Tim    Tim    Tim    Tim    Tim    AUTO   AUTO
10-3P    Gwen   Gwen   Gwen   Gwen   Gwen   AUTO   AUTO
3-10:30  Marcy  Marcy  Marcy  Marcy  Marcy  Ray    AUTO
OVNT     AUTO   AUTO   AUTO   AUTO   <span class="red">EVAN</span>   AUTO   AUTO</pre>\nOvernights after 10:30 PM: ONE OPERATOR. Building otherwise empty.\nNo visitors after 9 PM.`,
  answering: '',
  loggernote: `LOGGER\n(the VCR — DO NOT TOUCH)\n\nRecords 24 hrs of air on one tape (EP speed).\nTapes are pulled MONDAYS.\nDale takes them for the archive.\n\nDO NOT ERASE. DO NOT TAPE OVER.\nDO NOT RECORD "BAYWATCH" ON IT, TIM.\n\n— Ray`,
  ridgenote: `RIDGE SITE — EMERGENCY LOCAL AUDIO\n\nIf the STL drops and you need to get audio on the air FROM THE TRANSMITTER BUILDING:\n\n1. Exciter panel → LOCAL AUDIO switch UP\n2. Key the desk mic (red button)\n3. Talk. You're on.\n\nDon't use this for fun. — D.P.`,
  breakers: `PANEL A\n\n1  STUDIO A\n2  STUDIO A (UPS)\n3  HALL / LOBBY LIGHTS\n4  OFFICE\n5  BREAK RM / OUTLETS\n6  BREAK RM COFFEE (DON'T)\n7  ENG RACKS\n8  PROD B\n9  EXTERIOR / LOT\n10 HVAC\n11 SPARE\n12 SPARE\n\nGENERATOR TRANSFER SWITCH ON EXTERIOR WALL`,
  checklist: `OVERNIGHT CHECKLIST\n\n[ ] Station ID — top of the hour, LIVE\n[ ] Requests — answer LINE 1, find it, cue it, LOG IT\n[ ] TX readings on the hour\n[ ] Don't leave dead air. EVER.\n[ ] If the silence alarm goes off: check the board, check automation, then call Ray.\n\nLINE 1 = Request line (555-0941)\nLINE 2 = Business (555-0940)\nLINE 3 = Hotline (unlisted — Ray/Dale/Sheriff only)\nLINE 4 = Intercom`,
  prodbsign: `PRODUCTION B\n\nOLD GEAR — DO NOT USE\nKey in Ray's office.\n\n(we really need to clean this room out)`,
  lacey97: '',
};

Levels.station = function (o = {}) {
  const L = new Level('station');
  G.buildLevel = L;
  const R = L.root;
  L.defaultSurface = 'tile';
  L.reverb = [0.7, 3, 0.18];
  L.fog = new THREE.FogExp2(0x05070b, 0.018);
  L.background = new THREE.Color(0x03040a);

  // ---------- materials ----------
  const M = {
    dry: B.mat('drywall'), dryWarm: B.mat('drywall', { texArgs: ['#d6cdb6'] }),
    panel: B.mat('paneling'), acoustic: B.mat('acoustic'), siding: B.mat('siding'),
    vct: B.mat('vct'), vctBlue: B.mat('vct', { texArgs: ['#b7bcc0', '#a9aeb2'] }), carpet: B.mat('carpet'), carpetBrown: B.mat('carpet', { texArgs: ['#5a4a3c'] }), carpetRed: B.mat('carpet', { texArgs: ['#5a3434'] }),
    ceil: B.mat('ceiling'), concrete: B.mat('concrete'), tileWhite: B.mat('vct', { texArgs: ['#dcdcd6', '#d0d0ca'] }),
    trim: B.col(0x6b5a48), dark: B.col(0x1d1d20), metal: B.mat('metal'),
  };
  // wall material helpers: [px, nx, py, ny, pz, nz]
  const wX = (minus, plus) => [M.dry, M.dry, M.dry, M.dry, plus, minus];   // wall along X: minus = -z side, plus = +z side
  const wZ = (minus, plus) => [plus, minus, M.dry, M.dry, M.dry, M.dry];   // wall along Z: minus = -x side, plus = +x side
  const H = 2.7, EXT = 3.3, T = 0.12;

  // ---------- floors & ceilings ----------
  B.floor(R, -13, -8, 13, 8, 0, M.vct, 0.6);                                  // base
  B.floor(R, -6, 1.2, -1, 8, 0.002, M.carpetBrown, 1);                        // office
  B.floor(R, -1, 1.2, 7, 8, 0.002, M.carpet, 1);                              // studio
  B.floor(R, 7, 1.2, 13, 8, 0.002, M.carpetRed, 1);                           // library
  B.floor(R, 3, -8, 9, -1.2, 0.002, M.carpetBrown, 1);                        // prod B
  B.floor(R, -5, -8, -2.5, -1.2, 0.002, M.tileWhite, 0.3);                    // bath
  B.floor(R, 9, -8, 13, -1.2, 0.002, M.concrete, 2);                          // storage
  B.floor(R, -2.5, -8, 3, -1.2, 0.002, M.vctBlue, 0.6);                       // engineering
  L.surface(-6, 1.2, 13, 8, 'carpet'); L.surface(3, -8, 9, -1.2, 'carpet'); L.surface(9, -8, 13, -1.2, 'concrete');
  B.ceiling(R, -13, -8, 13, 8, H, M.ceil, 0.6);
  // roof slab (seen from outside) + parapet
  B.box(R, 0, EXT - 0.1, 0, 26.4, 0.15, 16.4, B.col(0x3a3836), { cast: true, uv: 0 });
  B.box(R, 0, EXT, 8.15, 26.6, 0.35, 0.15, M.siding); B.box(R, 0, EXT, -8.15, 26.6, 0.35, 0.15, M.siding);
  B.box(R, 13.15, EXT, 0, 0.15, 0.35, 16.4, M.siding); B.box(R, -13.15, EXT, 0, 0.15, 0.35, 16.4, M.siding);

  // ---------- exterior walls ----------
  // south (front) wall z=8: front door x=-9.5, lobby window x=-12 & -7, office window x=-3.5, studio window x=3
  B.wallX(R, -13.1, 13.1, 8, EXT, 0.2, wX(M.dry, M.siding), [
    { at: -9.5, w: 1.0, h: 2.15 }, { at: -11.8, w: 1.2, h: 2.0, sill: 0.9 }, { at: -7.4, w: 1.2, h: 2.0, sill: 0.9 },
    { at: -3.5, w: 1.4, h: 2.0, sill: 0.95 }, { at: 3, w: 2.6, h: 2.05, sill: 0.95 },
  ]);
  B.windowFrame(R, -11.8, 0.9, 8, 1.2, 1.1, 'x'); B.windowFrame(R, -7.4, 0.9, 8, 1.2, 1.1, 'x'); B.windowFrame(R, -3.5, 0.95, 8, 1.4, 1.05, 'x'); B.windowFrame(R, 3, 0.95, 8, 2.6, 1.1, 'x');
  // north (back) wall z=-8: back door x=-10.5, break window x=-7
  B.wallX(R, -13.1, 13.1, -8, EXT, 0.2, wX(M.siding, M.dry), [{ at: -10.5, w: 1.0, h: 2.1 }, { at: -7, w: 1.0, h: 1.9, sill: 1.0 }]);
  B.windowFrame(R, -7, 1.0, -8, 1.0, 0.9, 'x');
  B.wallZ(R, -8, 8, -13, EXT, 0.2, wZ(M.siding, M.dry));
  B.wallZ(R, -8, 8, 13, EXT, 0.2, wZ(M.dry, M.siding));

  // ---------- interior walls ----------
  // hall north wall z=-1.2 (doors: break -8, bath -3.75, eng 0, prodB 5.5, storage 10.8)
  B.wallX(R, -13, 13, -1.2, H, T, wX(M.dry, M.dryWarm), [{ at: -8, w: 0.95 }, { at: -3.75, w: 0.85 }, { at: 0, w: 0.95 }, { at: 5.5, w: 0.95 }, { at: 10.8, w: 0.9 }]);
  // hall south wall z=1.2 (lobby opening -9.5 w2.4, office door -3, studio door 0.2, studio window 4 (interior), library door 8.6)
  B.wallX(R, -13, 13, 1.2, H, T, [M.dry, M.dry, M.dry, M.dry, M.dry, M.dryWarm], [{ at: -9.5, w: 2.4, h: 2.3 }, { at: -3, w: 0.95 }, { at: 0.2, w: 0.95 }, { at: 4, w: 1.8, h: 2.0, sill: 1.0 }, { at: 8.6, w: 0.95 }]);
  B.windowFrame(R, 4, 1.0, 1.2, 1.8, 1.0, 'x');
  // overlay acoustic on studio side of that wall
  B.box(R, 0.95, 0, 1.27, 1.8, H, 0.02, M.acoustic, { uv: 1.2 }); B.box(R, 5.95, 0, 1.27, 2.1, H, 0.02, M.acoustic, { uv: 1.2 });
  B.box(R, 4, 2.0, 1.27, 1.8, 0.7, 0.02, M.acoustic, { uv: 1.2 }); B.box(R, 4, 0, 1.27, 1.8, 1.0, 0.02, M.acoustic, { uv: 1.2 });
  // north row partitions
  B.wallZ(R, -8, -1.2, -5, H, T, wZ(M.dry, M.tileWhiteish || M.dry));
  B.wallZ(R, -8, -1.2, -2.5, H, T, wZ(M.dry, M.dry));
  B.wallZ(R, -8, -1.2, 3, H, T, wZ(M.dry, M.panel));
  B.wallZ(R, -8, -1.2, 9, H, T, wZ(M.panel, M.dry));
  // south row partitions
  B.wallZ(R, 1.2, 8, -6, H, T, wZ(M.dry, M.panel));
  B.wallZ(R, 1.2, 8, -1, H, T, wZ(M.panel, M.acoustic));
  B.wallZ(R, 1.2, 8, 7, H, T, wZ(M.acoustic, M.dry));
  // studio acoustic on south wall inner face and east/west
  // baseboards in hall
  B.box(R, 0, 0, -1.13, 26, 0.1, 0.02, M.trim, { uv: 0 }); B.box(R, 0, 0, 1.13, 26, 0.1, 0.02, M.trim, { uv: 0 });

  // ---------- zones ----------
  L.zone('outside', -200, -200, 200, 200);
  L.zone('backlot', -30, -40, 20, -8.1);
  L.zone('lot', -30, 8.1, 40, 45);
  L.zone('hall', -13, -1.2, 13, 1.2);
  L.zone('lobby', -13, 1.2, -6, 8);
  L.zone('office', -6, 1.2, -1, 8);
  L.zone('studio', -1, 1.2, 7, 8);
  L.zone('library', 7, 1.2, 13, 8);
  L.zone('break', -13, -8, -5, -1.2);
  L.zone('bath', -5, -8, -2.5, -1.2);
  L.zone('eng', -2.5, -8, 3, -1.2);
  L.zone('prodb', 3, -8, 9, -1.2);
  L.zone('storage', 9, -8, 13, -1.2);
  L.inside = (x, z) => x > -13 && x < 13 && z > -8 && z < 8;

  // ---------- doors ----------
  const D = L.named.doors = {};
  const wood = B.mat('woodDoor'), green = B.mat('paintedDoor', { texArgs: ['#3f5e44'] }), gray = B.mat('paintedDoor', { texArgs: ['#7c7f80'] }), steel = B.mat('metal', { color: 0x9a9890 });
  D.front = new Door(L, { name: 'front', x: -9.5, z: 8, w: 1.0, axis: 'x', hinge: -1, swing: -1, mat: B.mat('metal', { color: 0x777a7c }), window: true, label: 'front door' });
  D.back = new Door(L, { name: 'back', x: -10.5, z: -8, w: 1.0, axis: 'x', hinge: 1, swing: 1, mat: steel, sticky: 1, label: 'back door' });
  D.break = new Door(L, { name: 'break', x: -8, z: -1.2, w: 0.95, axis: 'x', hinge: -1, swing: -1, mat: wood });
  D.bath = new Door(L, { name: 'bath', x: -3.75, z: -1.2, w: 0.85, axis: 'x', hinge: 1, swing: -1, mat: wood });
  D.eng = new Door(L, { name: 'eng', x: 0, z: -1.2, w: 0.95, axis: 'x', hinge: -1, swing: -1, mat: gray });
  D.prodb = new Door(L, { name: 'prodb', x: 5.5, z: -1.2, w: 0.95, axis: 'x', hinge: 1, swing: -1, mat: green, locked: true, lockedPrompt: 'Locked (Prod B)', creakAmt: 2.2 });
  D.storage = new Door(L, { name: 'storage', x: 10.8, z: -1.2, w: 0.9, axis: 'x', hinge: -1, swing: -1, mat: gray });
  D.office = new Door(L, { name: 'office', x: -3, z: 1.2, w: 0.95, axis: 'x', hinge: -1, swing: 1, mat: wood });
  D.studio = new Door(L, { name: 'studio', x: 0.2, z: 1.2, w: 0.95, axis: 'x', hinge: -1, swing: 1, mat: B.mat('woodDoor', { texArgs: ['#5c4430'] }), window: true, thick: 0.08, creak: false });
  D.library = new Door(L, { name: 'library', x: 8.6, z: 1.2, w: 0.95, axis: 'x', hinge: 1, swing: 1, mat: wood });
  D.front.locked = !!o.frontLocked;

  // ---------- lights ----------
  const LT = L.named.lights = {};
  LT.hall1 = B.fluoro(L, -7, H - 0.04, 0, { w: 1.2, d: 0.3, intensity: 4.5, dist: 9 });
  LT.hall2 = B.fluoro(L, 5, H - 0.04, 0, { w: 1.2, d: 0.3, intensity: 4.5, dist: 9 });
  LT.lobby = B.fluoro(L, -9.5, H - 0.04, 4.5, { intensity: 6, dist: 10 });
  LT.office = B.fluoro(L, -3.5, H - 0.04, 4.5, { intensity: 5, dist: 8 });
  LT.studio = B.fluoro(L, 3, H - 0.04, 3.2, { intensity: 3.5, dist: 9, color: 0xf3e7cf, circuit: 'studio' });
  LT.studioLamp = B.bulb(L, 6.2, 1.15, 6.9, { color: 0xffc070, intensity: 2.2, dist: 5, circuit: 'studio' });
  LT.library = B.fluoro(L, 10, H - 0.04, 4.5, { intensity: 5, dist: 9 });
  LT.break = B.fluoro(L, -9, H - 0.04, -4.5, { intensity: 6, dist: 10, flicker: o.breakFlicker ? 0.3 : 0 });
  LT.bath = B.fluoro(L, -3.75, H - 0.04, -4.5, { w: 0.6, d: 0.6, intensity: 3.5, dist: 6 });
  LT.eng = B.fluoro(L, 0.25, H - 0.04, -4.5, { intensity: 5, dist: 9, color: 0xe8f0f8 });
  LT.prodb = B.bulb(L, 5.6, 0.35, -5.2, { color: 0xffb870, intensity: 2.6, dist: 6, on: !!o.prodLamp, circuit: 'prodb' });
  LT.storage = B.bulb(L, 11, H - 0.15, -4.5, { color: 0xffe0b0, intensity: 2, dist: 5, on: false });
  LT.exit1 = B.bulb(L, -9.5, 2.45, 7.8, { color: 0xff3020, intensity: 0.35, dist: 3, circuit: 'emergency', r: 0.04 });
  LT.exit2 = B.bulb(L, -10.5, 2.4, -7.8, { color: 0xff3020, intensity: 0.35, dist: 3, circuit: 'emergency', r: 0.04 });
  // exit signs
  B.signMesh(R, 'EXIT', -9.5, 2.4, 7.88, 0.32, 0.12, { glow: true, glowColor: 0xff5544, tex: { bg: '#200', fg: '#f43', grime: false }, ry: Math.PI });
  B.signMesh(R, 'EXIT', -10.5, 2.35, -7.88, 0.32, 0.12, { glow: true, glowColor: 0xff5544, tex: { bg: '#200', fg: '#f43', grime: false } });

  // exterior lights
  LT.pole1 = B.poleLight(L, -8, 21, { dir: 1, circuit: 'ext', shadow: true });
  LT.pole2 = B.poleLight(L, 15, 21, { dir: -1, circuit: 'ext', intensity: 45, flicker: o.poleFlicker ? 0.15 : 0 });
  LT.backBulb = B.bulb(L, -10.5, 2.55, -8.35, { color: 0xffd7a0, intensity: 6, dist: 9, circuit: 'ext', spot: true, angle: 1.1, tz: -3 });
  LT.frontBulb = B.bulb(L, -9.5, 2.55, 8.35, { color: 0xffd7a0, intensity: 5, dist: 7, circuit: 'ext' });

  // ---------- ON AIR light ----------
  const onAirMat = new THREE.MeshBasicMaterial({ color: 0x300808 });
  B.box(R, 0.2, 2.3, 1.12, 0.5, 0.18, 0.08, B.col(0x111111));
  const onAirSign = B.texPlane(R, TEX.get('sign', 'ON AIR', { bg: '#600', fg: '#fff', w: 256, h: 96, grime: false }), 0.2, 2.39, 1.07, 0.44, 0.15, { basic: true, ry: Math.PI });
  onAirSign.material = onAirMat; onAirMat.map = TEX.get('sign', 'ON AIR', { bg: '#600', fg: '#fff', w: 256, h: 96, grime: false });
  L.setOnAirLight = on => { onAirMat.color.set(on ? 0xffffff : 0x2a1010); };
  L.setOnAirLight(false);

  // ================= LOBBY =================
  P.couch(R, -12.2, 4.5, Math.PI / 2, { color: 0x7a5a40 });
  P.table(R, -11, 4.5, 0, { w: 0.5, d: 1.0, h: 0.42, color: 0x6b5038 });
  P.plant(R, -12.5, 7.4); P.plant(R, -6.6, 1.8);
  // reception counter
  B.box(R, -8.0, 0, 5.2, 0.5, 1.05, 2.2, M.panel, { collide: true });
  B.box(R, -8.0, 1.05, 5.2, 0.6, 0.04, 2.3, B.col(0x8a6a4a));
  // bulletin board on west wall
  const bb = L.named.bulletin = [];
  const paper = (lines, opt) => TEX.get('paper', lines, opt);
  const bitems = [
    { key: 'backdoor', tex: paper(['BACK DOOR', 'STICKS', '', 'pull HARD', 'then LIFT', '', '- Ray'], { fs: 13 }), x: -0.45, y: 0.15, w: 0.2, h: 0.26, rot: 0.04 },
    { key: 'addresses', tex: paper(['DEDICATIONS', 'POLICY', '', 'First names', '& towns ONLY', '', 'this means', 'you Marcy'], { fs: 11 }), x: -0.18, y: 0.18, w: 0.2, h: 0.26, rot: -0.03 },
    { key: 'carrie', tex: paper([], { title: 'MISSING', tcol: '#a00', photo: true, w: 128, h: 170 }), x: 0.12, y: 0.12, w: 0.24, h: 0.32 },
    { key: 'biscuit', tex: paper(['LOST CAT', '"BISCUIT"', '', 'orange tabby'], { fs: 12, bg: '#f6f0a0' }), x: 0.42, y: 0.22, w: 0.18, h: 0.2, rot: 0.08 },
    { key: 'coffee', tex: paper(['COFFEE CLUB', '$5/mo', '', 'Evan owes $10'], { fs: 11 }), x: -0.4, y: -0.22, w: 0.2, h: 0.22, rot: -0.05 },
    { key: 'festival', tex: paper([], { title: 'HARVEST FEST', tcol: '#a50', w: 128, h: 160, bg: '#f2d9a0' }), x: -0.1, y: -0.22, w: 0.22, h: 0.28, rot: 0.02 },
    { key: 'requestline', tex: paper(['TIMBERLINE', 'AFTER DARK', '', 'Requests', '10P - 2A', '555-0941'], { fs: 12, bg: '#dde6f2' }), x: 0.4, y: -0.18, w: 0.22, h: 0.26, rot: -0.02 },
  ];
  const board = P.bulletin(R, -12.88, 1.15, 3.0, Math.PI / 2, bitems);
  void board;
  for (const it of bitems) { Interact.add(it.mesh, { prompt: 'Read', use: () => UI.doc(STATION_DOCS[it.key], it.key === 'carrie' ? 'flyer' : (it.key === 'backdoor' || it.key === 'coffee' ? 'hand' : '')).then(() => Bus.emit('read', it.key)) }); bb.push(it); }
  // framed photos on lobby north wall (z=1.26)
  const frame = (x, y, w, h, key, texDraw) => {
    const g = B.group(R, x, y, 1.27, 0);
    B.box(g, 0, -h / 2, 0, w + 0.06, h + 0.06, 0.03, B.col(0x2a1c10));
    const pic = B.texPlane(g, texDraw, 0, 0, 0.02, w, h);
    Interact.add(pic, { prompt: 'Look', use: () => UI.doc(STATION_DOCS[key], key === 'staffphoto' ? 'photo' : '').then(() => Bus.emit('read', key)) });
    return g;
  };
  frame(-11.6, 1.7, 0.6, 0.42, 'staffphoto', TEX.get('poster', 'KTLR 1996', 'staff photo', 35));
  frame(-10.4, 1.65, 0.36, 0.48, 'lacey', TEX.get('paper', ['', '', '', '', '', '', '', 'Lacey Harmon', '1993-1997'], { photo: true, w: 128, h: 170, bg: '#ddd6c4', fs: 11 }));
  frame(-7.2, 1.7, 0.5, 0.36, 'plaque', TEX.get('sign', 'KTLR\nSINCE 1971', { bg: '#c8a040', fg: '#3a2a10', w: 256, h: 180 }));
  // station logo on lobby wall behind counter
  B.signMesh(R, 'KTLR 94.1 FM\nTHE TIMBERLINE', -6.08, 1.8, 5.2, 1.6, 0.6, { ry: -Math.PI / 2, tex: { bg: '#1c2a20', fg: '#e8d8a0' } });
  // buzzer by front door
  L.named.lobbyLight = LT.lobby;

  // ================= RAY'S OFFICE =================
  const odesk = P.desk(R, -3.4, 6.2, Math.PI, { w: 1.7, color: 0x8a6a4a });
  void odesk;
  P.officeChair(R, -3.4, 5.4, Math.PI);
  P.cabinet(R, -5.6, 7.5, Math.PI, {});
  P.cabinet(R, -5.6, 6.9, Math.PI, { color: 0x8a8a80 });
  P.shelf(R, -1.25, 4.5, -Math.PI / 2, { w: 1.6, d: 0.35, h: 1.8, n: 4, fill: () => TEX.get('lpSpines', 9), fillH: 0.3 });
  const opc = P.crt(R, -3.0, 0.76, 6.35, Math.PI, { screenMat: new THREE.MeshBasicMaterial({ color: 0x1b4a6a }) });
  P.keyboard(R, -3.1, 0.76, 5.85, Math.PI);
  P.pcTower(R, -2.4, 6.4, Math.PI);
  L.named.officePC = opc;
  const ophone = P.deskPhone(R, -4.0, 0.76, 6.0, Math.PI); L.named.officePhone = ophone;
  // answering machine
  const am = B.group(R, -4.5, 0.76, 6.3, Math.PI);
  B.box(am, 0, 0, 0, 0.22, 0.06, 0.16, B.col(0x222222));
  const amLight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2200 })); amLight.position.set(0.07, 0.065, 0.05); am.add(amLight);
  L.named.answering = { group: am, light: amLight };
  // fax machine on cabinet
  const fax = B.group(R, -5.6, 1.3, 7.2, Math.PI);
  B.box(fax, 0, 0, 0, 0.4, 0.15, 0.35, B.col(0xcfcab8)); B.box(fax, 0, 0.15, -0.1, 0.3, 0.12, 0.05, B.col(0xe8e4d8));
  L.named.fax = fax;
  // key cabinet on west wall
  const keyBox = B.group(R, -5.92, 1.5, 3.3, Math.PI / 2);
  B.box(keyBox, 0, 0, 0, 0.4, 0.5, 0.08, B.col(0x6a6a60));
  for (let i = 0; i < 8; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.01), B.col(0xc8b060)); k.position.set(-0.13 + (i % 4) * 0.09, 0.32 - Math.floor(i / 4) * 0.18, 0.05); keyBox.add(k); }
  L.named.keyBox = keyBox;
  // CCTV monitor on shelf (quad) — cameras: lot, back door, lobby, hall
  const cctvCams = [
    [new THREE.Vector3(12, 3.0, 8.4), new THREE.Vector3(2, 0, 24)],
    [new THREE.Vector3(-4, 2.9, -8.4), new THREE.Vector3(-10, 0, -14)],
    [new THREE.Vector3(-6.3, 2.5, 7.6), new THREE.Vector3(-11, 0.5, 2)],
    [new THREE.Vector3(12.6, 2.5, 0), new THREE.Vector3(-6, 0.8, 0)],
  ];
  const quad = B.group(R, -1.3, 1.35, 6.6, -Math.PI / 2);
  B.box(quad, 0, 0, -0.15, 0.4, 0.34, 0.35, B.col(0x2a2a2a));
  const quadMats = [];
  cctvCams.forEach((cc, i) => {
    const cam = new THREE.PerspectiveCamera(60, 4 / 3, 0.2, 80); cam.position.copy(cc[0]); cam.lookAt(cc[1]); cam.layers.enable(1);
    const view = Engine.addView({ w: 160, h: 120, fps: 4, camera: cam, enabled: () => Player.zone() === 'office' || L.cctvForce, hide: [quad] });
    view.timer = i * 0.06;
    const m = Engine.cctvMaterial(view); quadMats.push(m);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), m);
    sc.position.set(-0.08 + (i % 2) * 0.165, 0.24 - Math.floor(i / 2) * 0.125, 0.026); quad.add(sc);
  });
  L.onUpdate(() => { for (const m of quadMats) m.uniforms.time.value = G.time; });
  L.named.cctv = { group: quad, cams: cctvCams, mats: quadMats };
  // corkboard in office with schedule + fax cover
  const ob = P.bulletin(R, -3.4, 1.25, 7.86, Math.PI, [
    { tex: paper(['OCT 2004', '', 'M T W T F', '... EVAN ..'], { fs: 10 }), x: -0.3, y: 0.0, w: 0.3, h: 0.3 },
    { tex: paper(['FAX', 'TO: Dale', 'Pruitt', 'RE: Oct', 'schedule'], { fs: 11, bg: '#f2f2ee' }), x: 0.15, y: 0.02, w: 0.24, h: 0.3, rot: 0.05 },
  ]);
  void ob;
  Interact.volume(R, -3.25, 1.6, 7.8, 0.36, 0.36, 0.1, { prompt: 'Read schedule', use: () => UI.doc(STATION_DOCS.schedule, 'fax').then(() => Bus.emit('read', 'schedule')) });
  Interact.volume(R, -3.85, 1.6, 7.8, 0.36, 0.36, 0.1, { prompt: 'Read', use: () => UI.doc(STATION_DOCS.faxcover, 'fax').then(() => Bus.emit('read', 'faxcover')) });
  // desk note from Ray
  const note = B.texPlane(R, paper(['Evan -', '', 'Marcy leaves', 'at 10:30...'], { fs: 12, bg: '#f7f2a8' }), -3.7, 0.765, 5.95, 0.12, 0.12, { rx: -Math.PI / 2 });
  Interact.add(note, { prompt: 'Read note from Ray', use: () => UI.doc(STATION_DOCS.raynote, 'hand').then(() => Bus.emit('read', 'raynote')) });
  P.trash(R, -2.0, 7.4);

  // ================= STUDIO A =================
  // console desk (U) under the south window
  const cd = B.group(R, 3, 0, 6.85, 0);
  B.box(cd, 0, 0, 0, 4.6, 0.78, 0.9, B.col(0x3a2e24), {}); // base cabinet
  B.box(cd, 0, 0.78, 0, 4.7, 0.05, 1.0, B.col(0x2a2a2c));
  Phys.addC(3, 6.85, 4.6, 0.9, 0, 0.8);
  // side wings
  B.box(R, 0.2, 0, 5.4, 0.8, 0.8, 1.9, B.col(0x3a2e24), { collide: true }); B.box(R, 0.2, 0.8, 5.4, 0.9, 0.04, 2.0, B.col(0x2a2a2c));
  B.box(R, 5.8, 0, 5.4, 0.8, 0.8, 1.9, B.col(0x3a2e24), { collide: true }); B.box(R, 5.8, 0.8, 5.4, 0.9, 0.04, 2.0, B.col(0x2a2a2c));
  // mixing board
  const boardM = new THREE.MeshStandardMaterial({ map: TEX.get('board') });
  const bm = new THREE.Mesh(B.boxGeo(1.6, 0.08, 0.6, 0), [M.dark, M.dark, boardM, M.dark, M.dark, M.dark]);
  bm.position.set(3, 0.87, 6.55); bm.rotation.x = -0.12; R.add(bm); L.named.board = bm;
  // mic on arm
  const micArm = B.group(R, 3.1, 0.83, 6.95);
  B.cyl(micArm, 0, 0, 0, 0.02, 0.02, 0.5, M.dark);
  const arm2 = B.box(micArm, 0, 0.48, -0.25, 0.03, 0.03, 0.55, M.dark); arm2.rotation.x = 0.5;
  const mic = B.cyl(micArm, 0, 0.42, -0.55, 0.045, 0.04, 0.18, B.col(0x2c2c30), { rx: 1.2 });
  L.named.mic = mic;
  // CD players and cart deck in rack on right wing
  const rackR = B.group(R, 5.5, 0.84, 5.9, -Math.PI / 2);
  for (let i = 0; i < 3; i++) { B.box(rackR, 0, i * 0.1, 0, 0.45, 0.09, 0.3, B.col(i === 2 ? 0x303030 : 0x1a1a1a)); const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshBasicMaterial({ color: i === 2 ? 0x331100 : 0x113322 })); disp.position.set(0.1, i * 0.1 + 0.05, 0.151); rackR.add(disp); }
  L.named.cdPlayer = rackR;
  // turntable on left wing
  const tt = B.group(R, 0.3, 0.84, 5.0, 0);
  B.box(tt, 0, 0, 0, 0.45, 0.1, 0.36, B.col(0x2a2a2a));
  const platter = B.cyl(tt, -0.03, 0.1, 0, 0.15, 0.15, 0.015, B.col(0x111111), { seg: 20 }); L.named.platter = platter;
  const tonearm = B.box(tt, 0.15, 0.12, 0.05, 0.02, 0.02, 0.22, B.col(0xaaaaaa)); tonearm.rotation.y = 0.3;
  L.named.turntable = tt;
  // automation computer on left of board
  const auto = P.crt(R, 1.3, 0.83, 6.9, Math.PI, { screenMat: new THREE.MeshBasicMaterial({ color: 0x0a1a12 }) });
  L.named.autoPC = auto;
  L.autoScreen = TEX.dynamic(256, 192, (c, w, h) => {
    const i = Radio.info();
    c.fillStyle = '#0b0f14'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#23314a'; c.fillRect(0, 0, w, 18); c.fillStyle = '#fff'; c.font = 'bold 11px Arial'; c.fillText('AirBoss 3.1 — KTLR', 6, 13); c.fillText(Story.clockStr(), w - 62, 13);
    c.fillStyle = Radio.onAir ? '#4c6' : '#f44'; c.font = 'bold 12px Arial'; c.fillText(Radio.onAir ? 'ON AIR' : 'SILENCE!', 6, 36);
    if (i) { c.fillStyle = '#fff'; c.font = 'bold 13px Arial'; c.fillText(i.title.slice(0, 26), 6, 58); c.fillStyle = '#9ab'; c.font = '11px Arial'; c.fillText(i.artist.slice(0, 30), 6, 74); c.fillStyle = '#233'; c.fillRect(6, 82, w - 12, 6); c.fillStyle = '#4c6'; c.fillRect(6, 82, (w - 12) * Math.min(1, i.elapsed / i.duration), 6); }
    c.fillStyle = '#8a9'; c.font = '10px Arial'; Radio.upcoming(5).forEach((id, k) => c.fillText(`${k + 1}. ${SONGS[id].title} — ${SONGS[id].artist}`.slice(0, 40), 6, 108 + k * 15));
  });
  auto.screen.material = new THREE.MeshBasicMaterial({ map: L.autoScreen.tex });
  let autoT = 0; L.onUpdate(dt => { autoT -= dt; if (autoT <= 0 && Player.zone() === 'studio') { autoT = 0.5; L.autoScreen.redraw(); } });
  P.keyboard(R, 1.5, 0.83, 6.45, Math.PI);
  // studio phone on right wing
  const sphone = P.deskPhone(R, 5.6, 0.83, 4.9, -Math.PI / 2); L.named.studioPhone = sphone;
  // request book
  const rb = B.group(R, 2.0, 0.83, 6.25, 0.2);
  B.box(rb, 0, 0, 0, 0.32, 0.03, 0.24, B.col(0x2a3a5a)); B.box(rb, 0, 0.03, 0, 0.3, 0.005, 0.22, B.col(0xeeeadc));
  L.named.requestBook = rb;
  // transmitter remote panel on east wall
  const txp = B.group(R, 6.92, 1.25, 4.4, -Math.PI / 2);
  B.box(txp, 0, 0, 0, 0.6, 0.5, 0.1, B.col(0x4a524c));
  const txMat = new THREE.MeshStandardMaterial({ map: TEX.get('meterPanel', 'REMOTE CONTROL'), emissive: 0x222222, emissiveMap: TEX.get('meterPanel', 'REMOTE CONTROL') });
  const txFace = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.46), txMat); txFace.position.set(0, 0.25, 0.051); txp.add(txFace);
  const txLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: 0x22ff44 })); txLed.position.set(0.24, 0.45, 0.06); txp.add(txLed);
  L.named.txPanel = txp; L.setTxLed = on => txLed.material.color.set(on ? 0x22ff44 : 0xff2222);
  // headphones hanging
  const hp = B.group(R, 4.3, 0.86, 6.35, 0);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 14, Math.PI), M.dark); band.rotation.x = -Math.PI / 2; hp.add(band);
  for (const sx of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10), M.dark); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.09, 0, 0); hp.add(cup); }
  L.named.headphones = hp;
  // monitors (speakers) on desk
  P.speakerBox(R, 1.0, 0.84, 7.15, Math.PI - 0.3, 1.1); P.speakerBox(R, 5.0, 0.84, 7.15, Math.PI + 0.3, 1.1);
  // DJ chair
  const djChair = P.officeChair(R, 3, 5.6, 0); L.named.djChair = djChair;
  // checklist taped near board
  const ck = B.texPlane(R, paper(['OVERNIGHT', 'CHECKLIST', '', '[ ] ID', '[ ] Requests', '[ ] TX readings'], { fs: 11 }), 1.85, 1.35, 7.88, 0.18, 0.22, { ry: Math.PI });
  Interact.add(ck, { prompt: 'Read checklist', use: () => UI.doc(STATION_DOCS.checklist).then(() => Bus.emit('read', 'checklist')) });
  // studio clock above south window (visible from the chair)
  const sclock = P.clock(R, 3, 2.35, 7.88, Math.PI); L.named.studioClock = sclock;
  L.onUpdate(() => sclock.update(Story.clock));
  // posters on studio side walls
  B.texPlane(R, TEX.get('poster', 'COLT RAMSEY', 'Long Haul Tour 2001', 25), -0.92, 1.6, 3.2, 0.45, 0.6, { ry: Math.PI / 2 });
  B.texPlane(R, TEX.get('poster', 'WREN AVENUE', 'Cold Front', 210), 6.92, 1.6, 2.4, 0.45, 0.6, { ry: -Math.PI / 2 });
  // window blinds (half up) over studio window
  for (let i = 0; i < 6; i++) B.box(R, 3, 1.75 + i * 0.05, 7.83, 2.6, 0.012, 0.04, B.col(0xd8d4c4), { cast: false });
  // small CD rack in studio
  P.shelf(R, -0.75, 2.3, Math.PI / 2, { w: 1.0, d: 0.25, h: 1.6, n: 5, fill: i => TEX.get('cdSpines', 30 + i), fillH: 0.18 });

  // ================= LIBRARY =================
  for (let i = 0; i < 4; i++) P.shelf(R, 12.75, 2.4 + i * 1.3, -Math.PI / 2, { w: 1.2, d: 0.3, h: 2.2, n: 7, fill: k => TEX.get('cdSpines', 100 + i * 10 + k), fillH: 0.17 });
  P.shelf(R, 9.2, 3.2, 0, { w: 1.2, d: 0.3, h: 2.2, n: 7, fill: k => TEX.get('cdSpines', 200 + k), fillH: 0.17 });
  P.shelf(R, 7.25, 4.6, Math.PI / 2, { w: 2.2, d: 0.35, h: 1.4, n: 4, fill: k => TEX.get('lpSpines', 300 + k), fillH: 0.32 });
  P.shelf(R, 9.4, 7.7, Math.PI, { w: 2.6, d: 0.35, h: 1.4, n: 4, fill: k => TEX.get('lpSpines', 310 + k), fillH: 0.32 });
  P.cabinet(R, 11.6, 7.55, Math.PI, { w: 0.7, d: 0.5, h: 1.1, n: 6, color: 0x7a6a50 }); // card catalog
  L.named.catalog = { pos: new THREE.Vector3(11.6, 1, 7.4) };
  P.table(R, 10.5, 5.2, 0, { w: 1.4, d: 0.8 });
  B.box(R, 10.3, 0.74, 5.1, 0.35, 0.06, 0.28, B.col(0x2a2a50)); B.box(R, 10.8, 0.74, 5.3, 0.33, 0.08, 0.26, B.col(0x502a2a));
  // section signs
  [['A–F', 2.4], ['G–L', 3.7], ['M–R', 5.0], ['S–Z', 6.3]].forEach(([t, z]) => B.signMesh(R, t, 12.6, 2.35, z, 0.4, 0.14, { ry: -Math.PI / 2, tex: { bg: '#eee', fg: '#222' } }));
  B.signMesh(R, 'ARCHIVE LPs', 7.12, 1.55, 4.6, 0.5, 0.12, { ry: Math.PI / 2, tex: { bg: '#eee', fg: '#222' } });
  L.named.cdShelves = [[12.5, 2.4], [12.5, 3.7], [12.5, 5.0], [12.5, 6.3]];
  L.named.lpShelf = [7.5, 4.6];
  L.named.binders = [10.55, 5.2];

  // ================= BREAK ROOM =================
  // counter along west wall
  B.box(R, -12.6, 0, -4.6, 0.65, 0.9, 4.2, B.col(0x8a7a62), { collide: true });
  B.box(R, -12.6, 0.9, -4.6, 0.7, 0.04, 4.3, B.col(0xc9c2a8));
  B.box(R, -12.7, 1.5, -4.6, 0.4, 0.7, 4.2, B.col(0x8a7a62)); // upper cabinets
  for (let i = 0; i < 6; i++) B.box(R, -12.49, 1.52, -6.3 + i * 0.7, 0.01, 0.66, 0.66, B.col(0x7a6a52));
  // sink
  const sink = B.group(R, -12.55, 0.9, -3.4);
  B.box(sink, 0, -0.12, 0, 0.45, 0.14, 0.55, B.mat('metal', { color: 0xc0c4c8 }));
  B.cyl(sink, -0.18, 0.02, 0, 0.015, 0.015, 0.25, B.col(0xb0b0b0));
  const faucet = B.box(sink, -0.1, 0.25, 0, 0.18, 0.025, 0.025, B.col(0xb0b0b0)); void faucet;
  L.named.sink = sink;
  // coffee maker
  const cm = B.group(R, -12.6, 0.94, -5.0, Math.PI / 2);
  B.box(cm, 0, 0, 0, 0.3, 0.04, 0.26, M.dark);
  B.box(cm, 0, 0, -0.1, 0.3, 0.42, 0.08, M.dark);
  B.box(cm, 0, 0.32, 0.02, 0.3, 0.1, 0.24, M.dark);
  const brewLed = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0x330000 })); brewLed.position.set(0.1, 0.12, -0.055); cm.add(brewLed);
  const pot = B.group(cm, 0, 0.04, 0.03);
  const potGlass = B.cyl(pot, 0, 0, 0, 0.075, 0.09, 0.18, new THREE.MeshStandardMaterial({ color: 0x99aabb, transparent: true, opacity: 0.35, roughness: 0.1 }));
  void potGlass;
  const potCoffee = B.cyl(pot, 0, 0, 0, 0.08, 0.085, 0.05, B.col(0x1a0c04)); L.named.potCoffee = potCoffee;
  B.box(pot, 0, 0.17, 0, 0.12, 0.03, 0.12, M.dark);
  L.named.coffeeMaker = { group: cm, pot, led: brewLed };
  // coffee can + filters
  const can = B.cyl(R, -12.55, 0.94, -5.7, 0.07, 0.07, 0.16, B.col(0xb0201a)); L.named.coffeeCan = can;
  const filterBox = B.box(R, -12.7, 1.55, -5.6, 0.15, 0.14, 0.2, B.col(0xe6e0d0)); L.named.filters = filterBox;
  // mugs on drying rack
  B.box(R, -12.5, 0.94, -2.7, 0.3, 0.02, 0.3, B.col(0x444444));
  const mug1 = P.mug(R, -12.55, 0.96, -2.62, { color: 0x2a4a7a }); const mug2 = P.mug(R, -12.45, 0.96, -2.78, { color: 0xe8e4da });
  L.named.mugs = [mug1, mug2];
  // microwave
  const mw = B.group(R, -12.55, 0.94, -6.3, Math.PI / 2);
  B.box(mw, 0, 0, 0, 0.5, 0.3, 0.38, B.col(0xd8d4c8));
  const mwWin = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x0c0c0c })); mwWin.position.set(-0.05, 0.15, 0.191); mw.add(mwWin);
  L.named.microwave = { group: mw, win: mwWin };
  // fridge
  const fr = B.group(R, -12.5, 0, -1.9, Math.PI / 2);
  B.box(fr, 0, 0, 0, 0.75, 1.7, 0.7, B.col(0xe2ddd0), {});
  B.box(fr, 0.3, 0.9, 0.36, 0.03, 0.4, 0.04, B.col(0xaaaaaa));
  Phys.addC(-12.5, -1.9, 0.7, 0.75, 0, 1.7);
  L.named.fridge = fr;
  // vending machine
  const vm = B.group(R, -5.6, 0, -2.0, -Math.PI / 2);
  const vmMat = new THREE.MeshStandardMaterial({ map: TEX.get('vending'), emissive: 0x333333, emissiveMap: TEX.get('vending') });
  const vmBox = new THREE.Mesh(B.boxGeo(0.9, 1.85, 0.8, 0), [B.col(0x1a1a1a), B.col(0x1a1a1a), B.col(0x1a1a1a), B.col(0x1a1a1a), vmMat, B.col(0x1a1a1a)]);
  vmBox.position.y = 0.925; vmBox.castShadow = true; vm.add(vmBox);
  Phys.addC(-5.6, -2.0, 0.8, 0.9, 0, 1.85);
  L.named.vending = vm;
  L.loop('vendHum', { pos: new THREE.Vector3(-5.6, 1, -2), vol: 0.6 });
  L.loop('fridge', { pos: new THREE.Vector3(-12.5, 1, -1.9), vol: 0.7 });
  // table + chairs
  P.table(R, -9, -5, 0, { w: 1.2, d: 0.9, color: 0xcfc6b0 });
  P.chair(R, -9.6, -5, Math.PI / 2, { color: 0x6a4a3a }); P.chair(R, -8.4, -5.1, -Math.PI / 2, { color: 0x6a4a3a });
  P.trash(R, -11.9, -7.4, { r: 0.22, h: 0.6, color: 0x2a2a2a });
  // back door sign
  const bds = B.texPlane(R, paper(['PULL HARD', 'THEN', 'LIFT'], { fs: 16, bg: '#f3e06a' }), -11.25, 1.45, -7.88, 0.16, 0.2, {});
  Interact.add(bds, { prompt: 'Read', use: () => UI.doc(STATION_DOCS.backdoor, 'hand') });
  // break wall phone
  const bphone = B.group(R, -5.1, 1.3, -4.0, -Math.PI / 2);
  B.box(bphone, 0, 0, 0, 0.18, 0.24, 0.07, B.col(0xd8d0c0));
  const bhs = B.box(bphone, 0, 0.02, 0.05, 0.05, 0.2, 0.04, B.col(0xd8d0c0)); void bhs;
  L.named.breakPhone = { group: bphone, lights: [] };
  // backpack on table (Evan's)
  const bag = B.group(R, -8.8, 0.74, -4.8, 0.4);
  B.box(bag, 0, 0, 0, 0.32, 0.36, 0.18, B.col(0x2a3a4a)); B.box(bag, 0, 0.05, 0.1, 0.24, 0.18, 0.05, B.col(0x22303c));
  L.named.backpack = bag; bag.visible = !!o.backpack;

  // ================= BATHROOM =================
  const toilet = B.group(R, -4.4, 0, -7.4, 0);
  B.box(toilet, 0, 0, 0.1, 0.38, 0.42, 0.5, B.col(0xf0f0ea)); B.box(toilet, 0, 0.42, -0.22, 0.42, 0.38, 0.18, B.col(0xf0f0ea));
  Phys.addC(-4.4, -7.3, 0.45, 0.65, 0, 0.8);
  L.named.toilet = toilet;
  const bsink = B.group(R, -2.75, 0.82, -4.0, -Math.PI / 2);
  B.box(bsink, 0, 0, 0, 0.5, 0.1, 0.4, B.col(0xf0f0ea)); B.box(bsink, 0, -0.82, 0.05, 0.1, 0.82, 0.1, B.col(0xe0e0da));
  L.named.bathSink = bsink;
  P.mirror(L, -2.57, 1.55, -4.0, 0.55, 0.75, -Math.PI / 2, () => Player.zone() === 'bath');
  B.box(R, -2.58, 1.15, -4.0, 0.03, 0.8, 0.6, B.col(0x333333), { cast: false });
  B.box(R, -4.9, 1.2, -3.2, 0.12, 0.35, 0.25, B.col(0xdcdcdc)); // towel dispenser

  // ================= ENGINEERING =================
  for (let i = 0; i < 4; i++) {
    const rg = B.group(R, -2.0 + i * 0.62, 0, -7.55, 0);
    const front = new THREE.MeshStandardMaterial({ map: TEX.get('rack', 400 + i, ['STL', 'EAS', 'SAT RX', 'LOGGER'][i]), emissive: 0x666666, emissiveMap: TEX.get('rack', 400 + i, ['STL', 'EAS', 'SAT RX', 'LOGGER'][i]) });
    const box = new THREE.Mesh(B.boxGeo(0.6, 2.0, 0.6, 0), [M.dark, M.dark, M.dark, M.dark, front, M.dark]); box.position.y = 1.0; box.castShadow = true; rg.add(box);
  }
  Phys.add(-2.35, -7.9, 0.2, -7.2, 0, 2);
  // logger VCR on the 4th rack
  const vcr = B.group(R, -0.14, 1.1, -7.22, 0);
  B.box(vcr, 0, 0, 0, 0.42, 0.09, 0.05, B.col(0x2a2a2a));
  const vcrLed = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x33ff66 })); vcrLed.position.set(0.1, 0.05, 0.026); vcr.add(vcrLed);
  L.named.logger = { group: vcr, led: vcrLed };
  const ln = B.texPlane(R, paper(['LOGGER', 'DO NOT', 'TOUCH'], { fs: 14 }), -0.14, 1.32, -7.21, 0.14, 0.16, {});
  Interact.add(ln, { prompt: 'Read', use: () => UI.doc(STATION_DOCS.loggernote, 'hand').then(() => Bus.emit('read', 'loggernote')) });
  // workbench
  B.box(R, 2.4, 0, -4.2, 0.9, 0.85, 2.4, B.col(0x5a5040), { collide: true });
  B.box(R, 2.4, 0.85, -4.2, 0.95, 0.04, 2.5, B.col(0x8a7a5a));
  B.box(R, 2.4, 0.89, -4.6, 0.3, 0.1, 0.2, B.col(0x2a2a2a)); B.box(R, 2.3, 0.89, -3.9, 0.18, 0.06, 0.4, B.col(0x777777));
  const rnote = B.texPlane(R, paper(['RIDGE SITE', 'LOCAL AUDIO', '1. switch UP', '2. key mic', '- D.P.'], { fs: 11 }), 2.86, 1.3, -3.6, 0.16, 0.2, { ry: -Math.PI / 2 });
  Interact.add(rnote, { prompt: 'Read', use: () => UI.doc(STATION_DOCS.ridgenote, 'hand').then(() => Bus.emit('read', 'ridgenote')) });
  // shelf with flashlight
  P.shelf(R, -2.2, -4.0, Math.PI / 2, { w: 1.4, d: 0.35, h: 1.8, n: 4 });
  const flash = B.group(R, -2.15, 0.95, -4.1, 0);
  B.cyl(flash, 0, 0, 0, 0.025, 0.025, 0.22, B.col(0x222222), { rz: Math.PI / 2 });
  B.cyl(flash, 0.12, 0, 0, 0.035, 0.03, 0.05, B.col(0x444444), { rz: Math.PI / 2 });
  L.named.flashlight = flash; flash.visible = !o.haveFlashlight;
  P.boxes(R, -2.1, -2.0, 2, 7);
  // breaker panel on east wall of eng
  const bp = B.group(R, 2.92, 1.1, -6.6, -Math.PI / 2);
  B.box(bp, 0, 0, 0, 0.5, 0.75, 0.1, B.col(0x8a8a86));
  for (let i = 0; i < 12; i++) B.box(bp, -0.08 + (i % 2) * 0.16, 0.1 + Math.floor(i / 2) * 0.1, 0.05, 0.1, 0.03, 0.02, B.col(0x222222));
  L.named.breaker = bp;
  // off-air monitor receiver w/ small speaker
  L.loop('rackFans', { pos: new THREE.Vector3(-1, 1, -7.4), vol: 0.8 });

  // ================= PROD B =================
  const sheet = B.col(0xd9d4c6);
  B.box(R, 8.3, 0, -5, 1.0, 1.0, 2.6, sheet, { collide: true }); // covered console
  B.box(R, 8.2, 1.0, -5.3, 0.8, 0.3, 1.2, sheet);
  const reel = B.group(R, 4.0, 0, -7.4, 0); // reel-to-reel
  B.box(reel, 0, 0, 0, 0.7, 1.1, 0.5, B.col(0x6a6a64));
  for (const sx of [-0.17, 0.17]) { const r2 = B.cyl(reel, sx, 1.1, 0, 0.14, 0.14, 0.02, B.col(0x999999), { rx: Math.PI / 2 }); r2.position.set(sx, 1.25, 0.26); }
  Phys.addC(4.0, -7.4, 0.7, 0.5, 0, 1.4);
  // cassette deck on small table
  P.table(R, 6.8, -7.2, 0, { w: 1.2, d: 0.6, h: 0.75, color: 0x5a4a3a });
  const deck = B.group(R, 6.7, 0.75, -7.2, 0);
  B.box(deck, 0, 0, 0, 0.44, 0.12, 0.3, B.col(0x1d1d1d)); B.box(deck, -0.08, 0.06, 0.151, 0.16, 0.06, 0.005, B.col(0x333333));
  L.named.deck = deck;
  // chair in the middle facing the wall
  const chairB = P.chair(R, 6.0, -6.4, Math.PI, { color: 0x3a3a3a }); L.named.chairB = chairB;
  const tapeB = B.group(R, 6.0, 0.48, -6.38, 0.3);
  B.box(tapeB, 0, 0, 0, 0.1, 0.016, 0.065, B.col(0x1a1a1a)); B.box(tapeB, 0, 0.017, 0, 0.07, 0.001, 0.035, B.col(0xf0f0e8));
  L.named.tapeB = tapeB; tapeB.visible = !!o.tapeB;
  // lamp on the floor
  const lamp = B.group(R, 5.6, 0, -5.2, 0);
  B.cyl(lamp, 0, 0, 0, 0.08, 0.1, 0.05, M.dark); B.cyl(lamp, 0, 0.05, 0, 0.012, 0.012, 0.2, M.dark);
  B.cyl(lamp, 0, 0.22, 0, 0.07, 0.12, 0.14, B.col(0xd8c8a0), { open: true });
  L.named.lamp = lamp;
  P.boxes(R, 4.0, -2.2, 3, 21); P.boxes(R, 8.3, -2.0, 2, 22);
  B.texPlane(R, TEX.get('poster', 'KTLR', 'Your Country Station 1985', 40), 3.08, 1.5, -4.5, 0.5, 0.66, { ry: Math.PI / 2 });
  const pbs = B.texPlane(R, paper(['PRODUCTION B', 'OLD GEAR', 'DO NOT USE'], { fs: 13 }), 5.5, 1.7, -1.13, 0.2, 0.15, {});
  Interact.add(pbs, { prompt: 'Read', use: () => UI.doc(STATION_DOCS.prodbsign) });

  // ================= STORAGE =================
  P.shelf(R, 12.75, -4.5, -Math.PI / 2, { w: 2.0, d: 0.45, h: 2.0, n: 4 });
  P.boxes(R, 12.6, -3.9, 2, 31); P.boxes(R, 12.6, -5.2, 3, 32);
  P.boxes(R, 9.6, -7.4, 3, 33);
  B.cyl(R, 10.0, 0, -5.5, 0.22, 0.2, 0.35, B.col(0xd6c020)); // mop bucket
  L.named.storageHide = { x: 10.2, z: -6.9 };

  // ================= HALL details =================
  const ext = B.cyl(R, -12.8, 0.4, 0.8, 0.07, 0.07, 0.5, B.col(0xbb1111)); void ext;
  B.box(R, 12.8, 0.8, -0.6, 0.3, 0.3, 0.3, B.col(0xb0b0b0)); // water fountain
  B.texPlane(R, TEX.get('poster', 'GOLD RECORD', 'KTLR 1979', 48), -1.5, 1.6, -1.13, 0.42, 0.55, {});
  B.texPlane(R, TEX.get('sign', 'STUDIO A\n→', { w: 256, h: 128, bg: '#1d2a3a', fg: '#dde' }), -1.0, 1.8, 1.13, 0.4, 0.2, { ry: Math.PI });

  // ================= monitor speakers (air signal in every room) =================
  const spk = (x, z, room, v = 0.35) => { P.ceilingSpeaker(R, x, H, z); const s = L.speaker({ kind: 'monitor', pos: new THREE.Vector3(x, H - 0.1, z), vol: v, ref: 1.5, rolloff: 1.4 }); s.room = room; return s; };
  L.named.speakers = [spk(-2, 0, 'hall', 0.3), spk(9, 0, 'hall', 0.3), spk(-10, 3.5, 'lobby'), spk(-3.5, 3, 'office', 0.3), spk(10, 3, 'library'), spk(-10, -3, 'break'), spk(0.5, -3, 'eng', 0.25)];
  L.named.studioMonitors = [
    L.speaker({ kind: 'monitor', pos: new THREE.Vector3(1.0, 1.0, 7.1), vol: 0.5, ref: 1.2 }),
    L.speaker({ kind: 'monitor', pos: new THREE.Vector3(5.0, 1.0, 7.1), vol: 0.5, ref: 1.2 }),
  ];

  // ================= ambience =================
  L.loop('roomTone', { vol: 0.5 });
  L.loop('hvac', { vol: 0.35 });
  L.loop('fluoro', { pos: new THREE.Vector3(-7, 2.6, 0), vol: 0.5 });
  L.loop('fluoro', { pos: new THREE.Vector3(-9, 2.6, -4.5), vol: 0.5 });
  L.loop('fluoro', { pos: new THREE.Vector3(0.3, 2.6, -4.5), vol: 0.4 });
  L.windLoop = L.loop('wind', { vol: 0.0 });
  L.onUpdate(() => {
    const inside = L.inside(Player.pos.x, Player.pos.z) && G.mode !== 'car';
    const tgt = inside ? 0.06 : 0.45;
    if (L._windT !== tgt) { L._windT = tgt; L.windLoop.volume(tgt, 1.2); }
  });

  Levels.stationExterior(L, o);
  Levels.stationInteractions(L, o);

  // nav nodes for the hunter
  L.nav = [[-12, 0], [-9.5, 0], [-8, 0], [-5, 0], [-3.75, 0], [-3, 0], [0.1, 0], [3, 0], [5.5, 0], [8.6, 0], [10.8, 0], [12, 0],
    [-8, -2.2], [-3.75, -2.2], [0, -2.2], [5.5, -2.2], [10.8, -2.2], [-3, 2.2], [0.2, 2.3], [8.6, 2.3], [-9.5, 2.6],
    [-9, -3.6], [-10.5, -6.6], [-11.2, -3], [-7, -6.5], [-3.6, -4.5], [0.5, -4.6], [6, -4], [11, -4.6], [-3.5, 3.8], [2.4, 3.6], [4.6, 4.6], [10, 3.6], [-10.2, 5], [-9.5, 7.2],
    [-10.5, -9.5], [-14.6, -9.4], [-14.6, 0], [-14.6, 9.6], [-9.5, 9.8], [0, 10.5], [14.6, -9.4], [14.6, 9.6], [-5, -9.6], [6, -9.6]];
  // default spawn
  L.spawns.lot = [6.4, 15, Math.PI];
  L.spawns.studioChair = [3, 5.6, Math.PI];
  L.spawns.hall = [-4, 0, -Math.PI / 2];
  G.buildLevel = null;
  return L;
};

// ---------------------------------------------------------------------------
Levels.stationExterior = function (L, o) {
  const R = L.root;
  L.defaultSurface = 'grass';
  // ground
  const grass = B.mat('grass');
  B.floor(R, -150, -150, 150, 150, -0.02, grass, 4);
  B.floor(R, -18, 8.2, 26, 31, -0.005, B.mat('asphalt'), 5);         // lot
  B.floor(R, 13, 31, 21, 34.5, -0.005, B.mat('asphalt'), 5);          // driveway
  B.floor(R, -18, -20, 3, -8.2, -0.008, B.mat('gravel'), 3);          // back lot
  B.floor(R, -13.3, 8.2, -5.7, 9.6, 0.02, B.mat('concrete'), 2);     // front walk
  L.surface(-18, 8.2, 26, 34.5, 'asphalt'); L.surface(-18, -20, 3, -8.2, 'gravel'); L.surface(-13.3, 8.2, -5.7, 9.6, 'concrete');
  L.surface(-150, -150, 150, -20, 'grass'); L.surface(-150, -150, -18, 150, 'grass'); L.surface(26, -150, 150, 150, 'grass');
  // re-add station interior surfaces with priority (later wins)
  L.surface(-13, -8, 13, 8, 'tile'); L.surface(-6, 1.2, 13, 8, 'carpet'); L.surface(3, -8, 9, -1.2, 'carpet'); L.surface(9, -8, 13, -1.2, 'concrete');
  // parking lines
  const lineMat = B.col(0xd8d4c0);
  for (let i = 0; i < 9; i++) B.box(R, -10 + i * 3.2, -0.004, 13.2, 0.1, 0.01, 4.4, lineMat, { cast: false, uv: 0 });
  // wheel stops
  for (let i = 0; i < 8; i++) B.box(R, -8.4 + i * 3.2, 0, 10.8, 1.6, 0.12, 0.2, B.col(0x9a9890), { cast: false });
  // road (Route 9)
  const road = B.plane(R, 0, 0.0, 37.5, 300, 7, new THREE.MeshStandardMaterial({ map: (() => { const t = TEX.get('road').clone(); t.needsUpdate = true; t.rotation = Math.PI / 2; t.center.set(0.5, 0.5); t.repeat.set(37.5, 1); return t; })() }), { rx: -Math.PI / 2, uv: 0 });
  void road;
  L.surface(-150, 34, 150, 41, 'asphalt');
  // station sign by the road
  const sg = B.group(R, -8, 0, 32.5, 0);
  B.box(sg, -1.4, 0, 0, 0.18, 2.6, 0.18, B.col(0x4a3a2a)); B.box(sg, 1.4, 0, 0, 0.18, 2.6, 0.18, B.col(0x4a3a2a));
  B.box(sg, 0, 1.4, 0, 3.2, 1.3, 0.14, B.col(0x2a2018));
  B.signMesh(sg, 'KTLR 94.1 FM\nTHE TIMBERLINE', 0, 2.05, 0.08, 3.0, 1.15, { tex: { bg: '#1b2a1e', fg: '#efe2b0', w: 512, h: 200 }, emissive: 0x332a18 });
  B.signMesh(sg, 'KTLR 94.1 FM\nTHE TIMBERLINE', 0, 2.05, -0.08, 3.0, 1.15, { ry: Math.PI, tex: { bg: '#1b2a1e', fg: '#efe2b0', w: 512, h: 200 }, emissive: 0x332a18 });
  // satellite dish + STL pole east side
  const dish = B.group(R, 15.5, 0, -2, -0.8);
  B.box(dish, 0, 0, 0, 0.3, 1.2, 0.3, B.col(0x777777));
  const dm = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, 0.9), new THREE.MeshStandardMaterial({ color: 0xcfcfc8, side: THREE.DoubleSide }));
  dm.position.set(0, 1.9, 0); dm.rotation.x = -1.1; dm.castShadow = true; dish.add(dm);
  Phys.addC(15.5, -2, 1.2, 1.2, 0, 2);
  B.cyl(R, 14.2, 0, 4, 0.08, 0.1, 9, B.col(0x777777), { collide: true });
  const stl = B.cyl(R, 14.2, 7.5, 4, 0.6, 0.6, 0.15, B.col(0xdddddd), { rx: Math.PI / 2 }); stl.rotation.set(Math.PI / 2, 0, -0.5);
  // back lot: generator, dumpster, propane, transfer switch
  const gen = P.generatorUnit(R, -5.5, -11, 0); L.named.generator = gen;
  const dump = B.group(R, -13, -11.5, 0.1);
  B.box(dump, 0, 0, 0, 2.0, 1.3, 1.2, B.mat('metal', { color: 0x2f4f3a }));
  B.box(dump, 0, 1.3, 0, 2.05, 0.06, 1.25, B.col(0x1e3a28));
  Phys.addC(-13, -11.5, 2.1, 1.3, 0, 1.4);
  L.named.dumpster = dump;
  const tank = B.cyl(R, -1.0, 0, -12, 0.55, 0.55, 2.2, B.col(0xe8e6e0), { rz: Math.PI / 2, collide: true }); tank.position.set(-1.0, 0.6, -12);
  B.box(R, -8.6, 0.9, -8.25, 0.45, 0.6, 0.25, B.col(0x8a8a86)); // transfer switch box on wall
  // utility poles along the road
  for (let i = -4; i <= 4; i++) { B.cyl(R, i * 35, 0, 42.5, 0.14, 0.18, 10, B.mat('bark', { color: 0x9a8a7a }), { seg: 8 }); B.box(R, i * 35, 9, 42.5, 2.0, 0.12, 0.12, B.col(0x4a3a2a)); }
  for (let i = -4; i < 4; i++) for (const sx of [-0.8, 0.8]) { const a = new THREE.Vector3(i * 35 + sx * 0, 9.1, 42.5 + sx), b = new THREE.Vector3((i + 1) * 35, 9.1, 42.5 + sx); const geo = new THREE.BufferGeometry().setFromPoints([a, new THREE.Vector3((a.x + b.x) / 2, 8.3, a.z), b]); R.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x111111 }))); }
  // forest
  const excl = (x, z) => (x > -22 && x < 30 && z > -24 && z < 33) || (z > 33 && z < 44);
  const trees = P.scatter(-120, -120, 120, 120, 900, 5, excl, 3.2);
  P.forest(L, trees, { collide: true, collideIf: (x, z) => Math.abs(x) < 50 && z > -50 && z < 60, seed: 9 });
  // a few closer trees
  P.forest(L, [[-20, -14, 13], [-21, 2, 15], [28, -6, 14], [29, 10, 12], [24, 30, 11], [27, 26, 14], [-20, 24, 12]], { collide: true, seed: 3, shadows: true });
  // distant ridge silhouettes
  const ridgeMat = new THREE.MeshBasicMaterial({ color: 0x080b12, fog: false });
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(70 + (i % 3) * 30, 70 + (i % 4) * 25, 6), ridgeMat); const a = -1.2 + i * 0.3; c.position.set(Math.sin(a) * 300, 20, -Math.cos(a) * 300); R.add(c); }
  // night sky
  L.skyRig = P.sky(L);
  P.clouds(L, { seed: 4 });
  P.mist(L, { size: 170, opacity: 0.11, heights: [0.3, 1.1, 2.4] });
  // grass tufts on the verges around the lot and building
  const gp = P.scatter(-40, -40, 50, 50, 1800, 12, (x, z) => (x > -18.5 && x < 26.5 && z > 8 && z < 34.8) || (x > -13.5 && x < 13.5 && z > -8.5 && z < 8.5) || (x > -18.5 && x < 3.5 && z > -20.5 && z < -8) || (z > 33.5 && z < 41.5), 0.9);
  P.grass(L, gp, { seed: 3 });

  // vehicles
  L.named.evanCar = o.evanCar !== false ? P.car(R, 6.4, 13.2, Math.PI, { color: 0x4d5b4a }) : null;
  L.named.marcyCar = o.marcyCar ? P.car(R, -3.2, 13.2, Math.PI, { color: 0x8a1c1c, len: 4.2 }) : null;
  L.named.buick = null;
  L.showBuick = (show, lights) => {
    if (show && !L.named.buick) { L.named.buick = P.car(R, 23, 27.5, -2.4, { color: 0x3a1418, len: 5.0, wid: 1.85, collide: true }); }
    if (L.named.buick) { L.named.buick.visible = show; if (L.named.buick.userData.col) L.named.buick.userData.col.on = show; L.named.buick.userData.setLights(!!lights, !!lights); }
  };
  if (o.buick) L.showBuick(true, false);
  if (o.momCar) L.named.momCar = P.car(R, -6.6, 15.5, Math.PI - 0.3, { color: 0x2f4a3a, wagon: true, len: 4.9, lights: true, beams: true });
  if (o.evanCarDark) L.named.evanCar2 = P.car(R, 21, 25, -2.2, { color: 0x4d5b4a });
};
