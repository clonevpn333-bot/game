/* ============================================================
   AMONG US 3D — MAPS
   Rooms are axis-aligned rectangles; `links` are carved into
   corridors by the world builder, which guarantees the map is
   fully connected. Task lists follow the real games' tasks.
   ============================================================ */
(function (AU) {
'use strict';

/* r(id, name, cx, cz, w, d) */
function r(id, name, x, z, w, d, extra) {
  var o = { id: id, name: name, x: x, z: z, w: w, d: d };
  if (extra) for (var k in extra) o[k] = extra[k];
  return o;
}

/* ============================ THE SKELD ============================ */
var SKELD = {
  id: 'skeld', name: 'The Skeld', theme: 'ship',
  hallWidth: 4.5,
  rooms: [
    r('upperengine','Upper Engine',   -46,-16, 16, 14),
    r('reactor',    'Reactor',        -68,  0, 14, 22),
    r('security',   'Security',       -44,  2, 10, 10),
    r('lowerengine','Lower Engine',   -46, 20, 16, 14),
    r('medbay',     'Medbay',         -20,-14, 16, 12),
    r('electrical', 'Electrical',     -20, 18, 18, 12),
    r('cafeteria',  'Cafeteria',        6,-20, 24, 20, { emergency:true }),
    r('storage',    'Storage',          4, 20, 16, 16),
    r('admin',      'Admin',           26,  2, 14, 12, { admin:true }),
    r('weapons',    'Weapons',         30,-26, 14, 12),
    r('o2',         'O2',              26,-10, 10, 10),
    r('navigation', 'Navigation',      54,-12, 12, 10),
    r('shields',    'Shields',         30, 22, 12, 12),
    r('communications','Communications',26, 34, 12, 10)
  ],
  links: [
    ['reactor','upperengine'], ['reactor','lowerengine'], ['reactor','security'],
    ['security','upperengine'], ['security','lowerengine'],
    ['upperengine','medbay'], ['medbay','cafeteria'], ['upperengine','cafeteria'],
    ['lowerengine','electrical'], ['electrical','storage'], ['storage','cafeteria'],
    ['cafeteria','weapons'], ['cafeteria','admin'], ['weapons','o2'], ['o2','navigation'],
    ['navigation','shields'], ['shields','storage'], ['shields','communications'],
    ['admin','storage'], ['o2','admin']
  ],
  vents: [
    { id:'v_upe',  room:'upperengine', links:['v_reactor','v_lowe'] },
    { id:'v_reactor', room:'reactor',  links:['v_upe','v_lowe'] },
    { id:'v_lowe', room:'lowerengine', links:['v_upe','v_reactor'] },
    { id:'v_sec',  room:'security',    links:['v_medbay','v_elec'] },
    { id:'v_medbay',room:'medbay',     links:['v_sec','v_elec'] },
    { id:'v_elec', room:'electrical',  links:['v_sec','v_medbay'] },
    { id:'v_cafe', room:'cafeteria',   links:['v_admin','v_hall'] },
    { id:'v_admin',room:'admin',       links:['v_cafe'] },
    { id:'v_hall', room:'weapons',     links:['v_cafe','v_nav1'] },
    { id:'v_nav1', room:'navigation',  links:['v_hall','v_shields'] },
    { id:'v_shields',room:'shields',   links:['v_nav1'] }
  ],
  features: { admin:'admin', security:'security', vitals:null, doorlog:null, spawn:'cafeteria' },
  cams: ['security'],
  camViews: ['upperengine','security','lowerengine','storage'],
  doorRooms: ['medbay','electrical','storage','cafeteria','upperengine','lowerengine','security','weapons','o2','navigation','shields','communications','admin'],
  sabotages: [
    { id:'reactor', name:'Reactor Meltdown', rooms:['reactor'], dual:true, time:30 },
    { id:'o2',      name:'Oxygen Depleted',  rooms:['o2','admin'], dual:true, time:30 },
    { id:'lights',  name:'Fix Lights',       rooms:['electrical'], time:0 },
    { id:'comms',   name:'Comms Sabotaged',  rooms:['communications'], time:0 },
    { id:'doors',   name:'Close Doors',      doors:true }
  ],
  tasks: [
    { id:'wiring',  name:'Fix Wiring',        kind:'common', mini:'wires',
      pick:3, rooms:['electrical','storage','admin','navigation','security','cafeteria'] },
    { id:'swipe',   name:'Swipe Card',        kind:'common', mini:'swipe', steps:[{room:'admin'}] },
    { id:'alignengine', name:'Align Engine Output', kind:'long', mini:'align',
      steps:[{room:'upperengine'},{room:'lowerengine'}] },
    { id:'chartcourse', name:'Chart Course',  kind:'long', mini:'chart', steps:[{room:'navigation'}] },
    { id:'cleano2', name:'Clean O2 Filter',   kind:'long', mini:'leaves', steps:[{room:'o2'}] },
    { id:'chute',   name:'Empty Chute',       kind:'long', mini:'garbage', steps:[{room:'o2'},{room:'storage'}] },
    { id:'garbage', name:'Empty Garbage',     kind:'long', mini:'garbage', visual:true,
      steps:[{room:'cafeteria'},{room:'storage'}] },
    { id:'fuel',    name:'Fuel Engines',      kind:'long', mini:'fuel',
      steps:[{room:'storage'},{room:'upperengine'},{room:'storage'},{room:'lowerengine'}] },
    { id:'inspect', name:'Inspect Sample',    kind:'long', mini:'sample', steps:[{room:'medbay'}] },
    { id:'startreactor', name:'Start Reactor',kind:'long', mini:'simon', steps:[{room:'reactor'}] },
    { id:'scan',    name:'Submit Scan',       kind:'long', mini:'scan', visual:true, steps:[{room:'medbay'}] },
    { id:'divert',  name:'Divert Power',      kind:'short', mini:'divert',
      steps:[{room:'electrical'}], accept:['upperengine','lowerengine','o2','navigation','security','shields','weapons','communications'] },
    { id:'calibrate',name:'Calibrate Distributor',kind:'short', mini:'calibrate', steps:[{room:'electrical'}] },
    { id:'shieldsT',name:'Prime Shields',     kind:'short', mini:'shields', visual:true, steps:[{room:'shields'}] },
    { id:'steering',name:'Stabilize Steering',kind:'short', mini:'steering', steps:[{room:'navigation'}] },
    { id:'manifolds',name:'Unlock Manifolds', kind:'short', mini:'manifolds', steps:[{room:'reactor'}] },
    { id:'upload',  name:'Download Data',     kind:'short', mini:'upload',
      steps:[{ pick1:['cafeteria','communications','electrical','navigation','weapons'] },{room:'admin'}] },
    { id:'asteroids',name:'Clear Asteroids',  kind:'short', mini:'asteroids', visual:true, steps:[{room:'weapons'}] }
  ]
};

/* ============================ MIRA HQ ============================ */
var MIRA = {
  id: 'mira', name: 'MIRA HQ', theme: 'hq',
  hallWidth: 4.5,
  rooms: [
    r('launchpad','Launchpad',   -54, 26, 16, 14),
    r('reactor',  'Reactor',     -50,-24, 14, 14),
    r('laboratory','Laboratory', -28,-26, 14, 12),
    r('decontam', 'Decontamination',-30, 6, 10, 22),
    r('storage',  'Storage',      -6, 22, 14, 12),
    r('cafeteria','Cafeteria',     -2,-24, 20, 16, { emergency:true }),
    r('admin',    'Admin',         6,  2, 14, 12, { admin:true }),
    r('balcony',  'Balcony',      26, 26, 20, 12),
    r('office',   'Office',       24,-14, 14, 12),
    r('greenhouse','Greenhouse',  26,-32, 16, 12),
    r('medbay',   'Medbay',       -8, -6, 12, 10),
    r('comms',    'Communications',44, 4, 12, 10),
    r('lockerroom','Locker Room', 44, 22, 12, 10)
  ],
  links: [
    ['launchpad','decontam'], ['decontam','reactor'], ['reactor','laboratory'],
    ['laboratory','cafeteria'], ['cafeteria','medbay'], ['medbay','admin'],
    ['cafeteria','greenhouse'], ['greenhouse','office'], ['office','admin'],
    ['admin','balcony'], ['balcony','comms'], ['comms','lockerroom'], ['lockerroom','balcony'],
    ['storage','decontam'], ['storage','admin'], ['launchpad','storage']
  ],
  vents: [
    { id:'v_bal',  room:'balcony',    links:['v_med','v_cafe'] },
    { id:'v_med',  room:'medbay',     links:['v_bal','v_cafe'] },
    { id:'v_cafe', room:'cafeteria',  links:['v_bal','v_med','v_admin'] },
    { id:'v_admin',room:'admin',      links:['v_cafe','v_office'] },
    { id:'v_office',room:'office',    links:['v_admin','v_green'] },
    { id:'v_green',room:'greenhouse', links:['v_office','v_lab'] },
    { id:'v_lab',  room:'laboratory', links:['v_green','v_reactor'] },
    { id:'v_reactor',room:'reactor',  links:['v_lab','v_decon'] },
    { id:'v_decon',room:'decontam',   links:['v_reactor','v_launch'] },
    { id:'v_launch',room:'launchpad', links:['v_decon'] }
  ],
  features: { admin:'admin', security:null, vitals:null, doorlog:'comms', spawn:'launchpad' },
  cams: [],
  camViews: [],
  doorRooms: ['launchpad','reactor','laboratory','office','admin','greenhouse','medbay','balcony','storage','cafeteria','comms','lockerroom'],
  sabotages: [
    { id:'reactor', name:'Reactor Meltdown', rooms:['reactor'], dual:false, time:45 },
    { id:'o2',      name:'Oxygen Depleted',  rooms:['greenhouse','office'], dual:true, time:30 },
    { id:'lights',  name:'Fix Lights',       rooms:['office'], time:0 },
    { id:'comms',   name:'Comms Sabotaged',  rooms:['comms'], time:0 },
    { id:'doors',   name:'Close Doors',      doors:true }
  ],
  tasks: [
    { id:'idcode',  name:'Enter ID Code',    kind:'common', mini:'keypad', steps:[{room:'admin'}] },
    { id:'wiring',  name:'Fix Wiring',       kind:'common', mini:'wires',
      pick:3, rooms:['cafeteria','laboratory','balcony','office','storage','greenhouse'] },
    { id:'scan',    name:'Submit Scan',      kind:'long', mini:'scan', visual:true, steps:[{room:'medbay'}] },
    { id:'asteroids',name:'Clear Asteroids', kind:'long', mini:'asteroids', steps:[{room:'balcony'}] },
    { id:'water',   name:'Water Plants',     kind:'long', mini:'water', steps:[{room:'storage'},{room:'greenhouse'}] },
    { id:'startreactor',name:'Start Reactor',kind:'long', mini:'simon', steps:[{room:'reactor'}] },
    { id:'divertM', name:'Divert Power',     kind:'long', mini:'divert', steps:[{room:'reactor'}],
      accept:['laboratory','office','greenhouse','admin','launchpad','cafeteria'] },
    { id:'chartcourse',name:'Chart Course',  kind:'short', mini:'chart', steps:[{room:'admin'}] },
    { id:'manifolds',name:'Unlock Manifolds',kind:'short', mini:'manifolds', steps:[{room:'reactor'}] },
    { id:'artifact',name:'Assemble Artifact',kind:'short', mini:'artifact', steps:[{room:'laboratory'}] },
    { id:'sort',    name:'Sort Samples',     kind:'short', mini:'sort', steps:[{room:'decontam'}] },
    { id:'shieldsT',name:'Prime Shields',    kind:'short', mini:'shields', steps:[{room:'greenhouse'}] },
    { id:'garbage', name:'Empty Garbage',    kind:'short', mini:'garbage', steps:[{room:'cafeteria'}] },
    { id:'weather', name:'Measure Weather',  kind:'short', mini:'weather', steps:[{room:'balcony'}] },
    { id:'beverage',name:'Buy Beverage',     kind:'short', mini:'vending', steps:[{room:'cafeteria'}] },
    { id:'process', name:'Process Data',     kind:'short', mini:'process', steps:[{room:'office'}] },
    { id:'diag',    name:'Run Diagnostics',  kind:'short', mini:'diagnostics', steps:[{room:'launchpad'}] },
    { id:'fuel',    name:'Fuel Engines',     kind:'short', mini:'fuel', steps:[{room:'launchpad'}] }
  ]
};

/* ============================ POLUS ============================ */
var POLUS = {
  id: 'polus', name: 'Polus', theme: 'ice',
  hallWidth: 5,
  rooms: [
    r('dropship','Dropship',      -6,-42, 14, 12),
    r('office',  'Office',        14,-14, 16, 12, { admin:true }),
    r('admin2',  'Admin',         14,  2, 12, 10),
    r('comms',   'Communications',34, 10, 12, 10),
    r('weapons', 'Weapons',        6,-26, 10, 10),
    r('o2',      'O2',            30,-20, 12, 10),
    r('electrical','Electrical', -22, 12, 14, 12),
    r('security','Security',     -22, -6, 12, 10),
    r('storage', 'Storage',      -20, 30, 14, 12),
    r('medbay',  'Medbay',       -44, 22, 14, 12),
    r('decontam','Decontamination',-40, 2, 8, 12),
    r('lab',     'Laboratory',   -48,-16, 16, 12),
    r('specimen','Specimen Room',  6, 32, 16, 12),
    r('boiler',  'Boiler Room',   34, 34, 14, 12),
    r('outside', 'Outside',       -6,  6, 20, 16, { open:true, emergency:true })
  ],
  links: [
    ['dropship','weapons'], ['weapons','office'], ['office','admin2'], ['admin2','comms'],
    ['office','o2'], ['o2','comms'], ['admin2','outside'], ['outside','security'],
    ['security','electrical'], ['electrical','storage'], ['storage','specimen'],
    ['specimen','boiler'], ['boiler','comms'], ['storage','medbay'], ['medbay','decontam'],
    ['decontam','lab'], ['lab','security'], ['outside','storage'], ['outside','weapons']
  ],
  vents: [
    { id:'v_elec', room:'electrical', links:['v_sec','v_o2'] },
    { id:'v_sec',  room:'security',   links:['v_elec','v_o2'] },
    { id:'v_o2',   room:'o2',         links:['v_elec','v_sec'] },
    { id:'v_comms',room:'comms',      links:['v_office','v_boiler'] },
    { id:'v_office',room:'office',    links:['v_comms','v_admin'] },
    { id:'v_admin',room:'admin2',     links:['v_office'] },
    { id:'v_boiler',room:'boiler',    links:['v_comms','v_spec'] },
    { id:'v_spec', room:'specimen',   links:['v_boiler','v_storage'] },
    { id:'v_storage',room:'storage',  links:['v_spec','v_med'] },
    { id:'v_med',  room:'medbay',     links:['v_storage','v_lab'] },
    { id:'v_lab',  room:'lab',        links:['v_med'] }
  ],
  features: { admin:'office', security:'security', vitals:'office', doorlog:null, spawn:'dropship' },
  cams: ['security'],
  camViews: ['outside','electrical','storage','lab','specimen','o2'],
  doorRooms: ['office','admin2','electrical','security','storage','medbay','lab','specimen','boiler','comms','o2','weapons'],
  sabotages: [
    { id:'reactor', name:'Seismic Stabilizers', rooms:['lab','specimen'], dual:true, time:60 },
    { id:'o2',      name:'Oxygen Depleted',     rooms:['o2','office'], dual:true, time:30 },
    { id:'lights',  name:'Fix Lights',          rooms:['electrical'], time:0 },
    { id:'comms',   name:'Comms Sabotaged',     rooms:['comms'], time:0 },
    { id:'doors',   name:'Close Doors',         doors:true }
  ],
  tasks: [
    { id:'swipe',   name:'Swipe Card',        kind:'common', mini:'swipe', steps:[{room:'office'}] },
    { id:'keys',    name:'Insert Keys',       kind:'common', mini:'keys', steps:[{room:'dropship'}] },
    { id:'wiring',  name:'Fix Wiring',        kind:'common', mini:'wires',
      pick:3, rooms:['electrical','office','comms','lab','storage','o2'] },
    { id:'startreactor',name:'Start Reactor', kind:'long', mini:'simon', steps:[{room:'specimen'}] },
    { id:'fuel',    name:'Fuel Engines',      kind:'long', mini:'fuel',
      steps:[{room:'storage'},{room:'lab'},{room:'storage'},{room:'lab'}] },
    { id:'scan',    name:'Submit Scan',       kind:'long', mini:'scan', visual:true, steps:[{room:'medbay'}] },
    { id:'waterways',name:'Open Waterways',   kind:'long', mini:'waterways',
      steps:[{room:'boiler'},{room:'boiler'},{room:'boiler'}] },
    { id:'inspect', name:'Inspect Sample',    kind:'long', mini:'sample', steps:[{room:'lab'}] },
    { id:'waterjug',name:'Replace Water Jug', kind:'long', mini:'waterjug', steps:[{room:'boiler'},{room:'specimen'}] },
    { id:'temp',    name:'Record Temperature',kind:'long', mini:'temperature', steps:[{room:'lab'},{room:'outside'}] },
    { id:'water',   name:'Water Plants',      kind:'long', mini:'water', steps:[{room:'storage'},{room:'o2'}] },
    { id:'manifolds',name:'Unlock Manifolds', kind:'short', mini:'manifolds', steps:[{room:'specimen'}] },
    { id:'artifacts',name:'Store Artifacts',  kind:'short', mini:'artifact', steps:[{room:'specimen'}] },
    { id:'canisters',name:'Fill Canisters',   kind:'short', mini:'canisters', steps:[{room:'o2'}] },
    { id:'tree',    name:'Monitor Tree',      kind:'short', mini:'tree', steps:[{room:'o2'}] },
    { id:'cleano2', name:'Clean O2 Filter',   kind:'short', mini:'leaves', steps:[{room:'o2'}] },
    { id:'chart',   name:'Chart Course',      kind:'short', mini:'chart', steps:[{room:'dropship'}] },
    { id:'upload',  name:'Download Data',     kind:'short', mini:'upload',
      steps:[{ pick1:['weapons','electrical','o2','specimen','comms'] },{room:'office'}] },
    { id:'steering',name:'Stabilize Steering',kind:'short', mini:'steering', steps:[{room:'dropship'}] },
    { id:'drill',   name:'Repair Drill',      kind:'short', mini:'drill', steps:[{room:'lab'}] },
    { id:'pass',    name:'Scan Boarding Pass',kind:'short', mini:'swipe', steps:[{room:'office'}] },
    { id:'wifi',    name:'Reboot Wifi',       kind:'short', mini:'wifi', steps:[{room:'comms'}] },
    { id:'divert',  name:'Divert Power',      kind:'short', mini:'divert', steps:[{room:'electrical'}],
      accept:['o2','comms','office','lab','specimen','boiler','weapons'] }
  ]
};

/* ============================ THE AIRSHIP ============================ */
var AIRSHIP = {
  id: 'airship', name: 'The Airship', theme: 'sky',
  hallWidth: 5,
  rooms: [
    r('cockpit',     'Cockpit',        -66,-22, 16, 16),
    r('armory',      'Armory',         -44,-30, 14, 12),
    r('viewingdeck', 'Viewing Deck',   -44, -8, 14, 12),
    r('engine',      'Engine Room',    -22,-26, 16, 16),
    r('kitchen',     'Kitchen',          0,-32, 14, 12),
    r('mainhall',    'Main Hall',       24,-22, 22, 20, { emergency:true }),
    r('vault',       'Vault',          -66,  6, 14, 12),
    r('gap',         'Gap Room',       -44, 12, 12, 10),
    r('security',    'Security',       -22,  2, 12, 10),
    r('comms',       'Communications',   0, -6, 12, 10),
    r('meeting',     'Meeting Room',    24,  4, 16, 12),
    r('records',     'Records',         48, -8, 14, 12),
    r('brig',        'Brig',           -66, 28, 14, 12),
    r('ventilation', 'Ventilation',    -44, 32, 12, 10),
    r('cargo',       'Cargo Bay',      -18, 28, 22, 18),
    r('electrical',  'Electrical',       8, 26, 14, 12),
    r('lounge',      'Lounge',          32, 28, 14, 12),
    r('medical',     'Medical',         52, 16, 14, 12),
    r('showers',     'Showers',         54, 34, 14, 12)
  ],
  links: [
    ['cockpit','armory'], ['cockpit','vault'], ['armory','engine'], ['armory','viewingdeck'],
    ['viewingdeck','gap'], ['vault','gap'], ['vault','brig'], ['gap','ventilation'],
    ['engine','kitchen'], ['engine','security'], ['kitchen','mainhall'], ['kitchen','comms'],
    ['comms','security'], ['comms','meeting'], ['mainhall','meeting'], ['mainhall','records'],
    ['meeting','records'], ['records','medical'], ['medical','showers'], ['showers','lounge'],
    ['lounge','electrical'], ['electrical','cargo'], ['cargo','ventilation'], ['brig','ventilation'],
    ['security','cargo'], ['meeting','lounge'], ['medical','lounge']
  ],
  vents: [
    { id:'v_cockpit', room:'cockpit',    links:['v_viewing','v_vault'] },
    { id:'v_viewing', room:'viewingdeck',links:['v_cockpit','v_armory'] },
    { id:'v_armory',  room:'armory',     links:['v_viewing','v_engine'] },
    { id:'v_engine',  room:'engine',     links:['v_armory','v_kitchen'] },
    { id:'v_kitchen', room:'kitchen',    links:['v_engine','v_mainhall'] },
    { id:'v_mainhall',room:'mainhall',   links:['v_kitchen','v_records'] },
    { id:'v_records', room:'records',    links:['v_mainhall','v_medical'] },
    { id:'v_medical', room:'medical',    links:['v_records','v_showers'] },
    { id:'v_showers', room:'showers',    links:['v_medical','v_lounge'] },
    { id:'v_lounge',  room:'lounge',     links:['v_showers','v_elec'] },
    { id:'v_elec',    room:'electrical', links:['v_lounge','v_cargo'] },
    { id:'v_cargo',   room:'cargo',      links:['v_elec','v_vent'] },
    { id:'v_vent',    room:'ventilation',links:['v_cargo','v_brig'] },
    { id:'v_brig',    room:'brig',       links:['v_vent','v_vault'] },
    { id:'v_vault',   room:'vault',      links:['v_brig','v_cockpit'] },
    { id:'v_gap',     room:'gap',        links:['v_security','v_meeting'] },
    { id:'v_security',room:'security',   links:['v_gap','v_comms'] },
    { id:'v_comms',   room:'comms',      links:['v_security','v_meeting'] },
    { id:'v_meeting', room:'meeting',    links:['v_comms','v_gap'] }
  ],
  features: { admin:'cockpit', security:'security', vitals:'medical', doorlog:null, spawn:'multi' },
  spawnRooms: ['brig','engine','mainhall','kitchen','records'],
  cams: ['security'],
  camViews: ['cargo','mainhall','records','electrical','kitchen','vault'],
  doorRooms: ['cockpit','armory','engine','kitchen','mainhall','vault','security','comms','meeting',
              'records','cargo','electrical','lounge','medical','showers','ventilation','brig','gap','viewingdeck'],
  ladders: [ { from:'cargo', to:'security' }, { from:'gap', to:'viewingdeck' }, { from:'brig', to:'vault' } ],
  platform: { from:'gap', to:'viewingdeck' },
  sabotages: [
    { id:'crash',  name:'Avert Crash Course', rooms:['cockpit','records'], dual:true, time:90, code:true },
    { id:'lights', name:'Fix Lights',         rooms:['electrical'], time:0 },
    { id:'comms',  name:'Comms Sabotaged',    rooms:['comms'], time:0 },
    { id:'doors',  name:'Close Doors',        doors:true }
  ],
  tasks: [
    { id:'wiring',  name:'Fix Wiring',        kind:'common', mini:'wires',
      pick:3, rooms:['electrical','vault','brig','engine','cockpit','showers','records','mainhall'] },
    { id:'idcode',  name:'Enter ID Code',     kind:'common', mini:'keypad', steps:[{room:'meeting'}] },
    { id:'garbage', name:'Empty Garbage',     kind:'long', mini:'garbage',
      steps:[{room:'mainhall'},{room:'medical'},{room:'cargo'}] },
    { id:'shower',  name:'Fix Shower',        kind:'long', mini:'shower', steps:[{room:'showers'}] },
    { id:'photos',  name:'Develop Photos',    kind:'long', mini:'photos', steps:[{room:'records'}] },
    { id:'tapes',   name:'Rewind Tapes',      kind:'long', mini:'tapes', steps:[{room:'security'}] },
    { id:'fans',    name:'Start Fans',        kind:'long', mini:'fans', steps:[{room:'ventilation'},{room:'ventilation'}] },
    { id:'safe',    name:'Unlock Safe',       kind:'long', mini:'safe', steps:[{room:'vault'}] },
    { id:'ruby',    name:'Polish Ruby',       kind:'long', mini:'ruby', steps:[{room:'vault'}] },
    { id:'towels',  name:'Pick Up Towels',    kind:'long', mini:'towels',
      steps:[{room:'showers'},{room:'lounge'},{room:'mainhall'}] },
    { id:'mannequin',name:'Dress Mannequin',  kind:'long', mini:'mannequin', steps:[{room:'mainhall'}] },
    { id:'burger',  name:'Make Burger',       kind:'long', mini:'burger', steps:[{room:'kitchen'}] },
    { id:'steering',name:'Stabilize Steering',kind:'short', mini:'steering', steps:[{room:'cockpit'}] },
    { id:'divert',  name:'Divert Power',      kind:'short', mini:'divert', steps:[{room:'electrical'}],
      accept:['cockpit','engine','kitchen','mainhall','meeting','records','medical','showers','cargo','vault','security','comms'] },
    { id:'calibrate',name:'Calibrate Distributor',kind:'short', mini:'calibrate', steps:[{room:'electrical'}] },
    { id:'breakers',name:'Reset Breakers',    kind:'short', mini:'breakers',
      pick:2, rooms:['engine','cargo','vault','brig','records','kitchen'] },
    { id:'upload',  name:'Download Data',     kind:'short', mini:'upload',
      steps:[{ pick1:['comms','records','engine','vault','cargo','cockpit'] },{room:'meeting'}] },
    { id:'records', name:'Sort Records',      kind:'short', mini:'sort', steps:[{room:'records'}] },
    { id:'toilet',  name:'Clean Toilet',      kind:'short', mini:'toilet', steps:[{room:'lounge'}] },
    { id:'artifact',name:'Assemble Artifact', kind:'short', mini:'artifact', steps:[{room:'medical'}] },
    { id:'scan',    name:'Submit Scan',       kind:'short', mini:'scan', visual:true, steps:[{room:'medical'}] }
  ]
};

/* ============================ THE FUNGLE ============================ */
var FUNGLE = {
  id: 'fungle', name: 'The Fungle', theme: 'jungle',
  hallWidth: 5.5,
  rooms: [
    r('dropship',   'Dropship',      -4,-40, 14, 12),
    r('cafeteria',  'Cafeteria',     -4,-20, 20, 16, { emergency:true }),
    r('kitchen',    'Kitchen',      -26,-22, 14, 12),
    r('storage',    'Storage',      -26,  0, 14, 12),
    r('campfire',   'Campfire',       0,  0, 14, 14, { open:true }),
    r('beach',      'Beach',        -44, 22, 22, 16, { open:true }),
    r('fishing',    'Fishing Dock', -20, 30, 16, 12, { open:true }),
    r('jungle',     'Jungle',         6, 24, 22, 18, { open:true }),
    r('lookout',    'Lookout',       34, 30, 14, 12, { open:true }),
    r('meeting',    'Meeting Room',  22, -2, 14, 12),
    r('laboratory', 'Laboratory',    24,-24, 16, 12),
    r('greenhouse', 'Greenhouse',    46,-10, 16, 14),
    r('reactor',    'Reactor',       46, 12, 14, 14),
    r('miningpit',  'Mining Pit',   -46, -4, 16, 14),
    r('sleeping',   'Sleeping Quarters', -46,-24, 16, 12),
    r('comms',      'Communications', 40,-34, 14, 12),
    r('splitlevel', 'Split Level',    8,-40, 14, 12)
  ],
  links: [
    ['dropship','cafeteria'], ['cafeteria','kitchen'], ['cafeteria','campfire'],
    ['cafeteria','splitlevel'], ['splitlevel','laboratory'], ['laboratory','comms'],
    ['laboratory','meeting'], ['comms','greenhouse'], ['greenhouse','reactor'],
    ['meeting','greenhouse'], ['meeting','jungle'], ['reactor','lookout'],
    ['jungle','lookout'], ['jungle','campfire'], ['campfire','storage'],
    ['storage','kitchen'], ['storage','miningpit'], ['miningpit','sleeping'],
    ['sleeping','kitchen'], ['miningpit','beach'], ['beach','fishing'],
    ['fishing','jungle'], ['fishing','campfire']
  ],
  vents: [
    { id:'v_kitchen', room:'kitchen',    links:['v_storage','v_sleep'] },
    { id:'v_storage', room:'storage',    links:['v_kitchen','v_mining'] },
    { id:'v_sleep',   room:'sleeping',   links:['v_kitchen','v_mining'] },
    { id:'v_mining',  room:'miningpit',  links:['v_storage','v_sleep','v_beach'] },
    { id:'v_beach',   room:'beach',      links:['v_mining','v_fishing'] },
    { id:'v_fishing', room:'fishing',    links:['v_beach','v_jungle'] },
    { id:'v_jungle',  room:'jungle',     links:['v_fishing','v_lookout'] },
    { id:'v_lookout', room:'lookout',    links:['v_jungle','v_reactor'] },
    { id:'v_reactor', room:'reactor',    links:['v_lookout','v_green'] },
    { id:'v_green',   room:'greenhouse', links:['v_reactor','v_comms'] },
    { id:'v_comms',   room:'comms',      links:['v_green','v_lab'] },
    { id:'v_lab',     room:'laboratory', links:['v_comms','v_meeting'] },
    { id:'v_meeting', room:'meeting',    links:['v_lab','v_cafe'] },
    { id:'v_cafe',    room:'cafeteria',  links:['v_meeting','v_kitchen'] }
  ],
  features: { admin:null, security:'lookout', vitals:'laboratory', doorlog:null, spawn:'dropship' },
  cams: ['lookout'],
  camViews: ['beach','jungle','campfire','miningpit'],
  doorRooms: ['kitchen','storage','laboratory','meeting','greenhouse','reactor','comms','sleeping','splitlevel','cafeteria'],
  sabotages: [
    { id:'reactor',   name:'Reactor Meltdown', rooms:['reactor'], dual:true, time:45 },
    { id:'mushroom',  name:'Mushroom Mixup',   rooms:['campfire'], time:0, special:'mixup' },
    { id:'comms',     name:'Comms Sabotaged',  rooms:['comms'], time:0 },
    { id:'lights',    name:'Fix Lights',       rooms:['storage'], time:0 },
    { id:'doors',     name:'Close Doors',      doors:true }
  ],
  tasks: [
    { id:'wiring',  name:'Fix Wiring',        kind:'common', mini:'wires',
      pick:3, rooms:['storage','laboratory','comms','reactor','kitchen','lookout'] },
    { id:'samples', name:'Collect Samples',   kind:'common', mini:'sample', steps:[{room:'jungle'},{room:'laboratory'}] },
    { id:'fish',    name:'Catch Fish',        kind:'long', mini:'fish', steps:[{room:'fishing'}] },
    { id:'parts',   name:'Replace Parts',     kind:'long', mini:'parts', steps:[{room:'storage'},{room:'reactor'}] },
    { id:'water',   name:'Water Plants',      kind:'long', mini:'water', steps:[{room:'storage'},{room:'greenhouse'}] },
    { id:'startreactor',name:'Start Reactor', kind:'long', mini:'simon', steps:[{room:'reactor'}] },
    { id:'sandcastle',name:'Build Sandcastle',kind:'long', mini:'sandcastle', steps:[{room:'beach'}] },
    { id:'winch',   name:'Hoist Supplies',    kind:'long', mini:'winch', steps:[{room:'storage'}] },
    { id:'antenna', name:'Fix Antenna',       kind:'long', mini:'antenna', steps:[{room:'comms'}] },
    { id:'marsh',   name:'Roast Marshmallow', kind:'short', mini:'marshmallow', steps:[{room:'campfire'}] },
    { id:'chop',    name:'Chop Wood',         kind:'short', mini:'chop', steps:[{room:'jungle'}] },
    { id:'mushrooms',name:'Clean Mushrooms',  kind:'short', mini:'leaves', steps:[{room:'greenhouse'}] },
    { id:'critter', name:'Help Critter',      kind:'short', mini:'critter', steps:[{room:'jungle'}] },
    { id:'temp',    name:'Record Temperature',kind:'short', mini:'temperature', steps:[{room:'lookout'}] },
    { id:'gem',     name:'Polish Gem',        kind:'short', mini:'ruby', steps:[{room:'miningpit'}] },
    { id:'artifact',name:'Assemble Artifact', kind:'short', mini:'artifact', steps:[{room:'laboratory'}] },
    { id:'cook',    name:'Cook Food',         kind:'short', mini:'burger', steps:[{room:'kitchen'}] },
    { id:'sort',    name:'Sort Supplies',     kind:'short', mini:'sort', steps:[{room:'storage'}] },
    { id:'scan',    name:'Submit Scan',       kind:'short', mini:'scan', visual:true, steps:[{room:'laboratory'}] }
  ]
};

AU.MAPS = { skeld: SKELD, mira: MIRA, polus: POLUS, airship: AIRSHIP, fungle: FUNGLE };
AU.MAP_ORDER = ['skeld', 'mira', 'polus', 'airship', 'fungle'];
AU.getMap = function (id) { return AU.MAPS[id] || AIRSHIP; };
AU.roomOf = function (map, id) {
  for (var i = 0; i < map.rooms.length; i++) if (map.rooms[i].id === id) return map.rooms[i];
  return null;
};

})(window.AU);
