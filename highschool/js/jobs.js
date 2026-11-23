'use strict';
/* =====================================================================
   HIGHSCHOOL — JOBS: YOU DO THE THING
   Before a quest's next scene, someone needs you to actually DO
   something with your hands:
     fetch  go grab an item in another room (it's drawn there, sparkling),
            bring it back and hand it over; the scene carries on
     plant  grab something, then stash it somewhere
     shove  put somebody into the lockers (E on them, or X)
     fight  mash to knock somebody out cold
   Jobs show in ⚡ Do Now / the tracker like any other step. X shoves
   anybody, any time. Kids react; teachers who see it punish you.
   ===================================================================== */
const JOBS={};
function J(m,s,o){(JOBS[m]=JOBS[m]||{})[s]=o}
/* item shapes drawn on the floor and in hands */
const JSHAPE={bottle:1,box:1,bag:1,can:1,paper:1,tub:1,jar:1,flower:1,mic:1,tool:1,cloth:1,cup:1,phone:1,ball:1,light:1};
function drawJ(sh,x,y,d){x=Math.round(x);y=Math.round(y);
 switch(sh){
  case'bottle':R(x-1,y-5,3,6,'#7ab84a');R(x,y-7,1,2,'#e8e2d6');break;
  case'box':R(x-3,y-3,7,5,'#c89a5a');R(x-3,y-3,7,1,'#e8c08a');R(x,y-3,1,5,'#8a6a3a');break;
  case'bag':R(x-3,y-3,6,6,'#3a4a8a');R(x-2,y-5,4,2,'#2a3060');break;
  case'can':R(x-1,y-4,3,5,'#d83a3a');R(x-1,y-4,3,1,'#ddd');break;
  case'paper':R(x-3,y-4,6,7,'#f4f0e6');R(x-2,y-2,4,1,'#9aa');R(x-2,y,3,1,'#9aa');break;
  case'tub':R(x-3,y-4,7,6,'#2a2a30');R(x-3,y-4,7,1,'#e8e8e8');R(x-2,y-2,5,2,'#d8a020');break;
  case'jar':R(x-2,y-4,5,6,'#cfe8f0');R(x-2,y-5,5,1,'#888');R(x-1,y-2,3,3,'#e86ab8');break;
  case'flower':R(x,y-6,1,6,'#3a8a3a');R(x-1,y-8,3,3,'#e85a7a');R(x,y-7,1,1,'#ffd27a');break;
  case'mic':R(x-1,y-4,2,5,'#333');R(x-1,y-5,2,1,'#aaa');break;
  case'tool':R(x-3,y-1,7,2,'#e0c040');R(x+3*(d||1),y-2,2,4,'#888');break;
  case'cloth':R(x-3,y-3,7,5,'#3a6ad8');R(x-3,y-3,7,1,'#6a9af0');break;
  case'cup':R(x-2,y-4,4,5,'#f4f0e6');R(x-2,y-4,4,1,'#6a3a1a');R(x-1,y-2,2,1,'#d83a3a');break;
  case'phone':R(x-1,y-3,3,5,'#1a1a1a');R(x,y-2,1,3,'#6ab8e8');break;
  case'ball':R(x-2,y-2,4,4,'#e0702a');break;
  case'light':R(x-3,y-1,5,3,'#3a3a3a');R(x+2,y-2,2,5,'#e8e2a0');break;
 }}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){if(typeof it==='string'&&it.startsWith('J:'))return drawJ(it.slice(2),x,y,d);return _dh(it,x,y,d)}}

/* ---------------- the jobs ---------------- */
/* fetch:  it, nm, sh, from, x, get, [give], thx  (no 'thx' and an auto scene = just bring it) */
J('bully',1,{k:'fetch',nm:'a chocolate milk',sh:'can',from:'canteen',x:206,get:'Grab a chocolate milk off the cafeteria counter (for Aidan)',give:'Hand Omer the chocolate milk',thx:'Chocolate milk. For a crying kid. You’re a good dude. I’m not saying it twice.'});
J('seat',1,{k:'fetch',nm:'a screwdriver',sh:'tool',from:'woodwork',x:120,get:'Grab a screwdriver off the woodwork bench',give:'Hand Dheva the screwdriver',thx:'Perfect. Her drawer’s got two screws and zero morals.'});
J('seat',2,{k:'plant',nm:'a whoopee cushion',sh:'bag',from:'drama',x:150,get:'Grab the whoopee cushion from the Drama prop box',to:'maths',tx:60,put:'Put the whoopee cushion on the teacher’s chair',done:'You set it on the chair and pull the cushion over it. It’s a perfect fit. It’s an evil fit.'});
J('oldbat',1,{k:'fetch',nm:'a bundle of cables',sh:'tool',from:'ict',x:200,get:'Yank a bundle of cables out of the back of the ICT room',give:'Hand David the cables',thx:'That’s like forty feet of Ethernet. I needed four. I’m gonna use all forty.'});
J('oldbat',2,{k:'fetch',nm:'detention snacks',sh:'bag',from:'canteen',x:60,get:'Stock up on snacks for detention (cafeteria)',thx:null});
J('loach',1,{k:'plant',nm:'a stink capsule',sh:'jar',from:'chem',x:250,get:'Grab the stink capsule off the back shelf in Chem',to:'science',tx:70,put:'Stick the stink capsule under the science teacher’s desk',done:'You wedge it under the desk with gum. It’s warm already. It’s ticking? Why is it ticking.'});
J('beep',1,{k:'plant',nm:'the Bluetooth speaker',sh:'box',from:'music',x:90,get:'Grab the Bluetooth speaker from the music room',to:'gym',tx:40,put:'Hide the speaker under the gym bleachers',done:'You pair it to your phone and slide it under the bleachers. The beep test is about to get a remix.'});
J('voss',1,{k:'fetch',nm:'lab gloves',sh:'cloth',from:'science',x:230,get:'Grab a pair of lab gloves from Science (for the fridge)',thx:null});
J('angelo',1,{k:'fetch',nm:'a hairnet',sh:'cloth',from:'foodtech',x:110,get:'Grab a hairnet from Food Tech (disguise)',give:'Hand Marcus the hairnet',thx:'A hairnet. We look like lunch staff now. Nobody questions lunch staff.'});
J('angelo',0,{k:'fetch',ask:'Need stock, bro. Vending machine in the cafeteria’s got a loose back panel. Twenty Takis. Go.',nm:'a box of Takis',sh:'box',from:'canteen',x:290,get:'Pull twenty Takis out the back of the cafeteria vending machine',give:'Hand Angelo the Takis',thx:'(counting them) Nineteen. You ate one. That’s fine. That’s a tax.'});
J('dheva',1,{k:'fight',tgt:'arjun',room:'corridor',lab:'Get the powder back off Arjun',why:'Arjun won’t give it back. Make him.',win:'You get Arjun in a headlock until he taps the lockers. A little tub of powder falls out of his hoodie. He says he was holding it for a friend. He has no friends.',lose:'Arjun spins out of it and slaps the back of your head so hard you see the school logo.'});
J('dheva',2,{k:'fetch',nm:'a wide-tooth comb',sh:'tool',from:'toilets',x:200,get:'Grab the wide-tooth comb from the bathroom sink',give:'Hand Dheva the comb',thx:'A WIDE-tooth comb. You actually listened. That’s honestly kind of scary.'});
J('headcase',2,{k:'fetch',nm:'a coffee',sh:'cup',from:'canteen',x:120,get:'Get Mr. Adam a coffee from the cafeteria',give:'Hand Mr. Adam the coffee',thx:'(holding it with both hands) Nobody’s bought me a coffee since 2019. It’s terrible. Thank you.'});
J('register',1,{k:'fetch',nm:'Ollie’s glasses',sh:'tool',from:'office',x:230,get:'Dig Ollie’s glasses out of the lost property box (office)',give:'Give Ollie his glasses back',thx:'(putting them on) Oh. OH. You have a face. Everyone has faces.'});
J('opps',1,{k:'fight',tgt:'brayden',room:'carpark',per:[8],lab:'Jump Brayden (the Hittaz initiation)',why:'Kayden says you’re not in till you drop somebody.',win:'Brayden goes down between two cars and stays down. Somebody in a hoodie films it. You’re officially in a gang now. It’s three kids and a group chat.',lose:'Brayden throws you into a shopping cart. The cart rolls. You’re in the cart. People clap.'});
J('catfish',1,{k:'fetch',nm:'a laptop charger',sh:'tool',from:'ict',x:120,get:'Steal a laptop charger from the ICT room',give:'Hand Nivaan the charger',thx:'Charger. Now I can reverse-image-search this catfish into the ground.'});
J('catfish',2,{k:'fetch',nm:'body spray',sh:'bottle',from:'toilets',x:120,get:'Grab the body spray from the boys’ bathroom (for Kenneth)',give:'Hand Kenneth the body spray',thx:'Wild Lime. If Jess is real she’s getting hit with this. If she’s not, same.'});
J('kaivibes',1,{k:'fetch',nm:'the ring light',sh:'light',from:'drama',x:220,get:'Borrow the ring light from the Drama room',give:'Hand Nivaan the ring light',thx:'Ring light. Now I look like a guy with a podcast. Which is the goal.'});
J('leaked',1,{k:'fetch',nm:'an energy drink',sh:'can',from:'canteen',x:276,get:'Get Nivaan an energy drink from the vending machine',give:'Hand Nivaan the energy drink',thx:'Fuel. Tracking a burner account is ten percent skill, ninety percent caffeine.'});
J('emergency',1,{k:'fetch',nm:'a jar of glitter',sh:'jar',from:'art',x:200,get:'Grab a jar of glitter from the art room',give:'Hand Tez the glitter',thx:'Glitter. In hair gel. You’re a sick, beautiful freak.'});
J('emergency',2,{k:'fetch',nm:'a pocket mirror',sh:'paper',from:'toilets',x:90,get:'Pry the little mirror off the bathroom wall',give:'Hand Corey the mirror',thx:'Okay. Okay. The hair is… the hair is a crime scene. Don’t let her look at me yet.'});
J('pitch',1,{k:'fetch',nm:'throat spray',sh:'bottle',from:'nurse',x:150,get:'Get throat spray from Nurse Pam’s office (for the solo)',thx:null});
J('delete',1,{k:'fetch',nm:'the admin password',sh:'paper',from:'office',x:100,get:'Peel the admin password sticky note off the office monitor',thx:null});
J('measure',1,{k:'fetch',nm:'safety goggles',sh:'tool',from:'science',x:150,get:'Grab safety goggles from Science (for the lathe)',thx:null});
J('talent',1,{k:'fetch',nm:'the wireless mic',sh:'mic',from:'drama',x:80,get:'Grab the wireless mic from Drama (for the show)',thx:null});
J('darren',1,{k:'fetch',nm:'a blue hoodie',sh:'cloth',from:'gym',x:60,get:'Find a blue hoodie in the gym lost and found (D said wear blue)',give:'Give Hasan the blue hoodie',thx:'Blue. It’s blue. Oh no. It suits me. OH NO.'});
J('darren',2,{k:'shove',tgt:'arjun',room:'canteen',lab:'Shove Arjun before he roasts Hasan',why:'Arjun’s winding up a joke about Hasan. Shut it down.',react:'WHAT DID I DO. I HAVEN’T EVEN SAID IT YET.'});
J('nightshift',1,{k:'fetch',nm:'a bag of flour',sh:'bag',from:'foodtech',x:200,get:'Grab a bag of flour from Food Tech',give:'Hand Pat the flour',thx:'Flour. Good. Now get out of my light.'});
J('nightshift',2,{k:'fetch',nm:'birthday candles',sh:'box',from:'foodtech',x:60,get:'Grab birthday candles from Food Tech',give:'Hand Hasan the candles',thx:'Candles. For a man who drives drunk people home. He’s gonna cry and say it’s allergies.'});
J('cheeks',0,{k:'fetch',ask:'Casting call says “bring a headshot.” I don’t have a headshot. I have a FACE. Get the art room to print one.',nm:'a headshot',sh:'paper',from:'art',x:120,get:'Print Nivaan a headshot on the art room printer',give:'Hand Nivaan the headshot',thx:'I look like a missing person. Perfect. Directors love that.'});
J('cheeks',1,{k:'fetch',nm:'fake blood',sh:'bottle',from:'drama',x:180,get:'Grab a bottle of fake blood from Drama (for the shoot)',thx:null});
J('pits',1,{k:'fetch',nm:'the confiscated body spray',sh:'bottle',from:'gym',x:280,get:'Grab the confiscated body spray from the gym',give:'Hand Aidan the body spray',thx:'(spraying it at the ceiling like a fire extinguisher) For the pits. For ALL of us.'});
J('phone',1,{k:'fetch',nm:'two paperclips',sh:'tool',from:'library',x:90,get:'Grab two paperclips from the library desk (to pick the drawer)',give:'Hand Arjun the paperclips',thx:'Paperclips. Old school. I respect it. I’m gonna mess it up but I respect it.'});
J('flimbus',1,{k:'fetch',nm:'a dictionary',sh:'paper',from:'library',x:220,get:'Grab a dictionary from the library',give:'Hand Arjun the dictionary',thx:'Bro. It’s not IN here. It’s not in the DICTIONARY. That’s the scary part.'});
J('beef',1,{k:'shove',tgt:'jaxon',room:'canteen',lab:'Shove Jaxon off Omer’s table',why:'Jaxon’s sitting on Omer’s table filming for Arjun. Move him.',react:'Bro I was just— I was just SITTING.'});
J('staffroom',1,{k:'fetch',nm:'the good biscuits',sh:'box',from:'foodtech',x:250,get:'Grab a tin of the good biscuits from Food Tech',give:'Hand Pat the biscuits',thx:'The good biscuits. You’ve done this before.'});
J('stepeleven',1,{k:'fetch',nm:'a swim cap',sh:'cloth',from:'pool',x:30,get:'Grab a swim cap from the pool (for Hasan)',give:'Hand Hasan the swim cap',thx:'It squeaks when I put it on. Do I look like a thumb? I look like a thumb.'});
J('stepeleven',2,{k:'fetch',nm:'nose clips',sh:'tool',from:'nurse',x:90,get:'Get a nose clip from Nurse Pam',give:'Hand Hasan the nose clip',thx:'(putting it on) Dow I sowd like a duck. Thanks.'});
J('kim',1,{k:'fetch',nm:'Mr. Kim’s flyer',sh:'paper',from:'hallb',x:150,get:'Tear Mr. Kim’s MAGIC SHOW flyer off the Front Hall wall',give:'Show Dheva the flyer',thx:'“Volunteers wanted. Small ones.” Oh my God. OH my God.'});
J('kim',2,{k:'fetch',nm:'a crowbar',sh:'tool',from:'woodwork',x:240,get:'Grab a crowbar from Woodwork (for the magic box)',thx:null});
J('kim',3,{k:'fetch',nm:'a flashlight',sh:'light',from:'woodwork',x:60,get:'Grab a flashlight from Woodwork (the van’s dark)',thx:null});
J('mended',1,{k:'fetch',nm:'sandpaper',sh:'paper',from:'art',x:60,get:'Grab sandpaper from the art room',thx:null});
J('mended',2,{k:'fetch',nm:'guitar strings',sh:'tool',from:'music',x:240,get:'Grab a pack of guitar strings from the music room',thx:null});
J('giant',1,{k:'fetch',nm:'a coffee',sh:'cup',from:'canteen',x:150,get:'Get Jacob a coffee from the cafeteria',give:'Hand Jacob the coffee',thx:'(drinking it in one go) I’ve been awake since four. Don’t tell Coach.'});
J('dopple',1,{k:'fetch',nm:'a box of salt',sh:'box',from:'foodtech',x:150,get:'Grab a box of salt from Food Tech (for the thing that isn’t Ms. Sherman)',give:'Hand Pat the salt',thx:'Salt. Smart kid. That’s what my nan used. Didn’t work on my nan, but.'});
J('dopple',2,{k:'fetch',nm:'a flashlight',sh:'light',from:'woodwork',x:150,get:'Grab a flashlight from Woodwork (it’s dark under the stairs)',thx:null});
J('jade',1,{k:'fetch',nm:'a poetry book',sh:'paper',from:'library',x:160,get:'Find the poetry book Jade dropped in the library',give:'Give Jade the book',thx:'You read it? …Don’t answer. Your face answered.'});
J('jade',2,{k:'fight',tgt:'brayden',room:'bus',per:[7],lab:'Take Brayden down before he gets to Jade',why:'Brayden’s waiting by the bus with his boys. Get to him first.',win:'Brayden goes down on the curb, right where the bus pulls in. The bus driver doesn’t even slow down. The bus driver has seen it all.',lose:'Brayden puts you into the bus shelter. The ad on it is for a dentist. It feels personal.'});
J('jade',3,{k:'fetch',nm:'a flower',sh:'flower',from:'courtyard',x:110,get:'Pick a flower from the courtyard planter',give:'Give Jade the flower',thx:'(trying not to smile) It’s a weed. You picked me a weed. …I’m keeping it.'});
J('closet',1,{k:'fetch',nm:'a baby monitor',sh:'box',from:'foodtech',x:90,get:'Grab the baby monitor from the Food Tech cupboard',give:'Hand Nivaan the baby monitor',thx:'A BABY MONITOR. We’re gonna hear EVERYTHING. I hate this. I’m so in.'});
J('hotsub',1,{k:'plant',nm:'ghost pepper sauce',sh:'bottle',from:'canteen',x:100,get:'Grab the ghost pepper sauce from behind Pat’s counter',to:'canteen',tx:250,put:'Douse Mr. Valentino’s sub on the staff table',done:'You empty half the bottle into the sub and close it up. It’s now forty percent sauce. The bread is sweating.'});
J('swipe',1,{k:'fetch',nm:'a yearbook photo',sh:'paper',from:'library',x:260,get:'Find a hot guy in the library’s 1994 yearbook (for the fake profile)',give:'Hand Nivaan the yearbook photo',thx:'…That’s Mr. Grieve. With HAIR. Oh, this is going to work so well it’s gonna be a crime.'});
J('swipe',2,{k:'fetch',nm:'a rose',sh:'flower',from:'courtyard',x:200,get:'Pick a rose from the courtyard (for the “date”)',thx:null});
J('gains',1,{k:'plant',nm:'Coach’s shaker cup',sh:'cup',from:'weightroom',x:210,get:'Grab Coach’s shaker cup off the weight room shelf',to:'canteen',tx:180,put:'Leave the shaker on the cafeteria counter where Coach stands',done:'You set the shaker down exactly where he always stands. The powder’s already in it. It’s waiting. It’s patient. It’s for horses.'});
J('rave',0,{k:'shove',ask:'Invite costs ten bucks or a favor. The favor: Brayden. The fountain. Go.',tgt:'brayden',room:'courtyard',lab:'Shove Brayden into the courtyard fountain',react:'MY JORDANS. MY JORDANS ARE IN THE FOUNTAIN.'});
J('rave',1,{k:'fetch',nm:'the PA speaker',sh:'box',from:'music',x:160,get:'Grab the big PA speaker from the music room (for the rave)',thx:null});
J('paul',0,{k:'fetch',ask:'(cracking his neck) Before the Rumble I need baby oil. It’s a wrestling thing. Food Tech’s got cooking oil. Same thing.',nm:'cooking oil',sh:'bottle',from:'foodtech',x:180,get:'Grab a bottle of cooking oil from Food Tech (for Paul)',give:'Hand Paul the oil',thx:'(oiling up his arms) Now nobody can grab me. Including me. That’s a problem for later.'});
J('kenneth',0,{k:'fetch',ask:'Ball’s flat. Pump’s in the weight room. Go get it or you forfeit, and I tell everybody you forfeited.',nm:'the ball pump',sh:'tool',from:'weightroom',x:250,get:'Grab the ball pump from the weight room',give:'Hand Kenneth the pump',thx:'(pumping) You came back. Most people don’t come back. Let’s go.'});
J('jacob',0,{k:'shove',ask:'He’s in my seat. Every day. I’m six-five and I can’t do it, man. I just can’t.',tgt:'brayden',room:'canteen',lab:'Shove Brayden out of Jacob’s seat',react:'BRO. It’s a SEAT. It’s a PLASTIC SEAT.'});
J('alex',0,{k:'fetch',ask:'Jacob’s in goal for PE. His goalie gloves are in the gym. Make them… not be in the gym.',nm:'Jacob’s goalie gloves',sh:'cloth',from:'gym',x:200,get:'Steal Jacob’s goalie gloves from the gym',give:'Show Alex the gloves',thx:'(stuffing them in a bush) Three goals. He’s gonna save them with his FACE.'});
J('marcus',0,{k:'fetch',ask:'Announcements in five. I need the good mic from the office. The cafeteria mic smells like ranch.',nm:'the good mic',sh:'mic',from:'office',x:160,get:'Grab the good mic from the office',give:'Hand Marcus the mic',thx:'(tapping it) Oh, that’s RICH. That’s a voice. Good morning, Highgate.'});
J('armoury',1,{k:'fetch',nm:'duct tape',sh:'tool',from:'woodwork',x:180,get:'Grab a roll of duct tape from Woodwork',give:'Hand Tez the duct tape',thx:'Duct tape. The spine of every good weapon and most bad marriages.'});
J('hasanmia',0,{k:'fetch',ask:'I’m gonna ask Mia out. I need a flower. A real one. There’s a planter in the courtyard at school. Please. Before I lose my nerve.',nm:'a flower',sh:'flower',from:'courtyard',x:60,get:'Pick a flower in the school courtyard (for Hasan)',give:'Hand Hasan the flower',thx:'(holding it like a grenade) Okay. Okay okay okay. If I die, tell my mom it was romantic.'});
J('jacobken',0,{k:'shove',ask:'(quietly) Jaxon’s on my machine. Again. He puts his quarters in MY slot and makes me watch.',tgt:'jaxon',room:'arcade',per:[8],lab:'Shove Jaxon off Jacob’s machine',react:'MY QUARTERS. MY QUARTERS ARE STILL IN THERE.'});
J('alone',0,{k:'fetch',ask:'(not looking at you) I’m not hungry. I’m just saying, IF someone got a burger from the food court, I wouldn’t throw it off the roof.',nm:'a burger',sh:'box',from:'foodcourt',x:150,get:'Get Arjun a burger from the food court',give:'Hand Arjun the burger',thx:'(not looking at you) …I didn’t ask for this. Thanks.'});
J('roast',0,{k:'fetch',ask:'Roast Table rules. You bring a gift for the table. Chicken nuggets. From Pat. Go, peasant.',nm:'a tray of nuggets',sh:'box',from:'canteen',x:80,get:'Get a tray of nuggets from Pat (for the Roast Table)',give:'Put the nuggets on the Roast Table',thx:'Nuggets. Acceptable. Sit. You’re getting roasted first, though.'});
J('bigscore',1,{k:'fetch',nm:'Halloween masks',sh:'bag',from:'drama',x:120,get:'Steal four masks from the Drama costume rack',thx:null});
J('tea',2,{k:'fetch',nm:'the printed screenshots',sh:'paper',from:'library',x:120,get:'Print the screenshots on the library printer',give:'Hand David the printouts',thx:'Printed. Physical evidence. They can delete a post. They can’t delete paper.'});
J('quiet',2,{k:'fetch',nm:'a slice of pizza',sh:'box',from:'canteen',x:180,get:'Grab Nivaan a slice of pizza from the cafeteria',give:'Hand Nivaan the pizza',thx:'(not streaming it) …Thanks. I’m just gonna eat it. Like a guy. Off camera.'});
J('grandad',1,{k:'fetch',nm:'a flashlight',sh:'light',from:'woodwork',x:120,get:'Grab a flashlight from Woodwork (for the woods)',thx:null});
J('bayonet',1,{k:'fetch',nm:'an air horn',sh:'can',from:'gym',x:120,get:'Grab Coach’s air horn from the gym (cannon sound effects)',thx:null});
J('nursecal',2,{k:'fetch',nm:'the ICT webcam',sh:'phone',from:'ict',x:260,get:'Borrow the webcam off an ICT computer (evidence)',thx:null});
J('toby',2,{k:'fetch',nm:'a Sharpie',sh:'tool',from:'art',x:260,get:'Grab a Sharpie from the art room (for the plan)',give:'Hand Sean the Sharpie',thx:'Sharpie. Permanent. Like my mistakes. Okay, let’s go.'});
J('tellmom',1,{k:'fetch',nm:'a box of tissues',sh:'box',from:'nurse',x:220,get:'Grab a box of tissues from the nurse’s office',give:'Hand Pat the tissues',thx:'They’re not for me. (they’re for her) …Some of them are for me.'});
J('instella',2,{k:'fetch',nm:'flowers',sh:'flower',from:'courtyard',x:240,get:'Pick some flowers in the courtyard (for Sean’s big moment)',give:'Hand Sean the flowers',thx:'Flowers. On the field. Like a movie. Like a bad movie. Okay.'});
J('breath',0,{k:'fetch',nm:'a nose clip',sh:'tool',from:'nurse',x:60,get:'Get a nose clip from Nurse Pam (before swimming)',thx:null});
J('sleepy',0,{k:'fetch',nm:'a pocket watch',sh:'tool',from:'drama',x:260,get:'Grab a shiny pocket watch from the Drama prop box (before Psychology)',thx:null});
J('heads',0,{k:'fetch',nm:'a cardboard crown',sh:'box',from:'art',x:160,get:'Grab a cardboard crown from the art room (before History)',thx:null});
J('stilllife',0,{k:'fetch',nm:'a bedsheet',sh:'cloth',from:'nurse',x:180,get:'Grab a bedsheet from the nurse’s cot (toga for Art)',thx:null});
J('method',0,{k:'fetch',nm:'a fake skull',sh:'ball',from:'science',x:90,get:'Grab the skull off the Science skeleton (for Macbeth)',thx:null});
J('bakeoff',0,{k:'fetch',nm:'vanilla extract',sh:'bottle',from:'canteen',x:230,get:'Swipe vanilla extract from the cafeteria (before Food Tech)',thx:null});
J('steptwelve',1,{k:'shove',tgt:'brayden',room:'corridor',lab:'Shove Brayden away from Hasan’s locker',why:'Darren’s got Brayden guarding Hasan’s locker.',react:'Okay okay OKAY. Darren paid me five bucks. FIVE. That’s not enough for this.'});

/* ---------------- state ---------------- */
for(const m in JOBS)if(!MIS[m])delete JOBS[m];
function jobFor(m){const j=JOBS[m];if(!j||!D||!MIS[m]||D.done[m])return null;const s=D.mp[m]||0;return j[s]?Object.assign({s},j[s]):null}
function jrec(m){const j=jobFor(m);if(!j)return null;D.f.jobs=D.f.jobs||{};let r=D.f.jobs[m];if(!r||r.s!==j.s)r=D.f.jobs[m]={s:j.s,st:j.ask?'ask':'do'};return r}
function jst(m){const r=jrec(m);return r?r.st:null}
function jset(m,st){const r=jrec(m);if(r)r.st=st;if(typeof updateLoc==='function')updateLoc()}
const jItem=(m,s)=>'J_'+m+'_'+s;
const jShape=j=>'J:'+(j.sh||'box');
const FREEP=[0,2,4,7,8];
function jPeriods(room){return['foodcourt','arcade','carpark'].includes(room)?[8]:room==='bus'?[0,7]:[0,2,4]}

/* ---------------- wiring ---------------- */
const ORIG={};
for(const m in JOBS){ORIG[m]=HOOKS.filter(h=>h.mis===m);
 for(const h of ORIG[m]){const c0=h.cond;h._c0=c0;h.cond=()=>{try{if(c0&&!c0())return false}catch(e){return false}const st=jst(m);if(!st||st==='done')return true;
  /* a hand-over job only holds back the person you hand it to; other paths in the quest keep working */
  const j=jobFor(m);if(j&&j.k==='fetch'&&j.thx&&h.who==='auto')return true;return false}}}
const c0ok=h=>{try{return !h._c0||h._c0()}catch(e){return false}};
for(const m in JOBS)for(const sk in JOBS[m]){
 const S=+sk,j=JOBS[m][sk],it=jItem(m,S),here=()=>{const r=jobFor(m);return r&&r.s===S};
 ITEMS[it]=j.nm||'something';
 const people=ORIG[m].filter(h=>h.who&&h.who!=='auto'&&K[h.who]);
 /* ask: the person who'd start this step asks you first */
 if(j.ask)for(const h of people)hook({mis:m,period:h.period,room:h.room,who:h.who,label:h.label,look:h.look,cond:()=>here()&&c0ok(h)&&jst(m)==='ask',run:async()=>{
  face(h.who,'you');face('you',h.who);await say(h.who,j.ask,'smirk');
  jset(m,'do');if(!D.f.track)D.f.track=m;
  toast('Job: '+(j.get||j.lab||j.put));return 'stay'}});
 if(j.k==='fetch'||j.k==='plant'){
  spot({room:j.from,x:j.x,y:j.y||150,label:j.get,short:'GRAB',sparkle:1,mis:m,jdraw:{sh:j.sh,S,m},cond:()=>here()&&jst(m)==='do'&&!has(it),run:async()=>{
   clearTalk();await walk('you',j.x+(A.you.x<j.x?-6:6),70);face('you',j.x>A.you.x?1:-1);
   pose('you','reach');await wait(220);pose('you','grab');SFX.pick&&SFX.pick();
   give(it);hold('you',jShape(j));await wait(380);pose('you',null);hold('you',null);
   if(j.k==='plant'){jset(m,'plant');toast('Now: '+j.put+' ('+shortName(j.to)+')')}
   else if(people.length&&j.thx){jset(m,'give');toast('Now: '+(j.give||'bring it back'))}
   else{jset(m,'done');take(it);toast('Got it. '+MIS[m].name+' can go ahead.')}
   return jAfter()}});
 }
 if(j.k==='plant'){
  spot({room:j.to,x:j.tx,y:j.ty||150,label:j.put,short:'PLANT',mis:m,cond:()=>here()&&jst(m)==='plant'&&has(it),run:async()=>{
   clearTalk();await walk('you',j.tx+(A.you.x<j.tx?-6:6),70);face('you',j.tx>A.you.x?1:-1);
   hold('you',jShape(j));pose('you','kneel');await wait(300);pose('you','reach');await wait(250);hold('you',null);pose('you',null);
   take(it);await N(j.done);jset(m,'done');return jAfter()}});
 }
 if(j.k==='fetch'&&j.thx)for(const h of people)hook({mis:m,period:h.period,room:h.room,who:h.who,label:j.give||('Give '+K[h.who].n+' '+j.nm),look:h.look,cond:()=>here()&&c0ok(h)&&jst(m)==='give'&&has(it),run:async()=>{
  await handOver(h.who,j);take(it);jset(m,'done');
  return h.run()}});
 if(j.k==='shove'||j.k==='fight'){
  SPAWNED.add(j.tgt);
  hook({mis:m,period:j.per||jPeriods(j.room),room:j.room,who:j.tgt,label:j.lab,cond:()=>here()&&jst(m)==='do'&&!D.dead[j.tgt],run:async()=>{
   if(j.k==='shove'){await doShove(j.tgt,{react:j.react});jset(m,'done');return jAfter()}
   const won=await doFight(j.tgt,j);if(won){jset(m,'done');return jAfter()}return 'stay'}});
 }
}
/* after a job: if a scene is now waiting in this room, it plays */
function jAfter(){const a=availableHooks(D.room,'auto');if(a.length){setTimeout(()=>{if(!busy&&panelMode==='roam')runHook(a[0])},50)}return 'stay'}
/* shove/fight targets turn up where the job says */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(const m in JOBS){const j=jobFor(m);if(!j||!(j.k==='shove'||j.k==='fight')||j.room!==room||jst(m)!=='do'||A[j.tgt]||D.dead[j.tgt]||!K[j.tgt])continue;
 const ps=j.per||jPeriods(room);if(!ps.includes(D.period))continue;const f=floorOf(room);put(j.tgt,190+Math.random()*60,-1,{y:clamp(f[0]+10,f[0],f[1])})}}catch(e){}return r}}
/* the job item drawn where it's waiting */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!D||panelMode==='none'||ROOM!==D.room)return;if(typeof CAM!=='undefined'&&CAM.z>1.01)return;
 for(const s of SPOTS){if(!s.jdraw||s.room!==D.room)continue;let ok=false;try{ok=s.cond()}catch(e){}if(!ok)continue;
  drawJ(s.jdraw.sh,s.x,s.y-1,1);if(Math.sin(T*6+s.x)>.3){R(s.x+3,s.y-9,1,1,'#fff');R(s.x-4,s.y-6,1,1,'#ffd27a')}}}}
/* a toast when a quest step turns into a job */
{const _pt=part;part=function(m,n){const r=_pt(m,n);try{const j=jobFor(m);if(j&&!TEST)setTimeout(()=>toast('Next for '+MIS[m].name+': '+(j.get||j.lab||j.put)),2600)}catch(e){}return r}}

/* ---------------- the actions ---------------- */
function clearTalk(){try{$('text').textContent='';$('name').textContent='';$('choices').innerHTML='';if(typeof drawPortrait==='function')drawPortrait(null)}catch(e){}}
async function handOver(who,j){
 const b=A[who];if(b&&A.you){const side=b.x>A.you.x?-14:14;if(Math.abs(A.you.x-(b.x+side))>3)await walk('you',b.x+side,80);face('you',who);face(who,'you')}
 hold('you',jShape(j));pose('you','hold');await wait(380);hold('you',null);pose('you',null);
 if(b){hold(who,jShape(j));pose(who,'hold')}SFX.pick&&SFX.pick();
 if(j.thx)await say(who,j.thx,'happy');
 if(b){await wait(150);hold(who,null);pose(who,null)}
}
async function doShove(id,o){
 clearTalk(); const a=A.you,b=A[id];if(!a||!b)return;o=o||{};
 const dir=b.x>=a.x?1:-1;await walk('you',b.x-dir*11,95);face('you',id);face(id,'you');
 pose('you','hug');SFX.smack&&SFX.smack();shake(.5);b.ex='shock';
 const tx=clamp(b.x+dir*28,8,312);await tw(b,{x:tx},240);
 b.pose='lie';b.hurt=Math.max(b.hurt||0,1);pose('you',null);await wait(420);
 if(o.react)await say(id,o.react,'hurt');
 b.pose=null;b.ex='angry';
}
async function doFight(id,j){
 const b=A[id];if(!b)return false;
 await walk('you',b.x+(A.you.x<b.x?-14:14),90);face('you',id);face(id,'you');b.ex='angry';A.you.ex='angry';
 if(j.why)await N(j.why);
 if(typeof camZoom==='function')await camZoom((A.you.x+b.x)/2,b.y-24,1.4,300);
 const ok=await mash('FIGHT '+(K[id]?K[id].n.toUpperCase():''),{need:20,time:4.5,info:'MASH!'});
 if(ok){await hit('you',id,{blood:5});await hit('you',id,{blood:6});b.pose='lie';b.hurt=3;if(typeof camZoom==='function')await camZoom();await N(j.win);if(typeof repAdd==='function')repAdd('feared',1,'knocked out '+(K[id]?K[id].n:''));return true}
 await hit(id,'you',{blood:6});A.you.hurt=Math.min(3,(A.you.hurt||0)+1);if(typeof camZoom==='function')await camZoom();await N(j.lose+' (Try again: walk up to them.)');return false;
}

/* ---------------- X: shove anybody ---------------- */
const SHOVE_REACT={kid:['BRO.','What the hell, man?!','(from the floor) …Okay. Okay. I’ll remember this.','You’re actually insane.','My SHOULDER. Bro, my shoulder.','(getting up) That’s it. That’s going in the group chat.','Not the face, not the— okay, the floor. Fine.'],
 adult:['Did you just put your HANDS on me?','In thirty years of teaching, nobody has ever— okay, one person. He’s dead now.','(very calm) Name. Grade. Next of kin.']};
function nearestPerson(r){let b=null,bd=r||22;for(const id in A){if(id==='you')continue;const a=A[id];if(!a.vis||a.dead||a.x<4||a.x>316)continue;const d=Math.abs(a.x-A.you.x)+Math.abs(a.y-A.you.y)*.5;if(d<bd){bd=d;b=id}}return b}
async function freeShove(){
 if(!D||D.weekend||busy||panelMode!=='roam'||!A.you)return;
 const id=nearestPerson(24);if(!id){toast('Nobody close enough to shove.');return}
 /* a job wants this shove? */
 const jh=availableHooks(D.room,id).find(h=>/^Shove|^Take|^Jump|^Get the powder|^Make .* pay/.test(h.label||''));
 if(jh)return runHook(jh);
 const adult=K[id]&&K[id].adult;
 runHook({run:async()=>{
  await doShove(id,{});
  await say(id,pick(adult?SHOVE_REACT.adult:SHOVE_REACT.kid),adult?'angry':'hurt');
  D.f.shoves=(D.f.shoves||0)+1;if(typeof repAdd==='function'&&D.f.shoves%3===0)repAdd('feared',1,'shoving people');
  const teacher=Object.keys(A).find(k=>k!==id&&K[k]&&K[k].adult&&A[k].vis&&!A[k].dead);
  if(adult||teacher){const t=adult?id:teacher;face(t,'you');await say(t,adult?'Detention. And I’m keeping your apple.':'I SAW that. Lose an apple, and lose the attitude.','angry');D.apples=Math.max(0,(D.apples||0)-1);updateLoc()}
  return 'stay'}});
}
addEventListener('keydown',e=>{if((e.key==='x'||e.key==='X')&&!e.repeat&&panelMode==='roam'&&!busy&&!DL&&!anyOverlay()){e.preventDefault();freeShove()}});
/* touch: a shove button next to the roam controls */
{const r=$('roam');if(r){const b=document.createElement('button');b.id='bShove';b.textContent='✋ SHOVE';b.className='tb';b.style.cssText='margin-left:6px';b.onclick=e=>{e.stopPropagation();freeShove()};r.appendChild(b)}}
/* roam hint mentions X */
{const _rh=roamHint;roamHint=function(){const r=_rh.apply(this,arguments);try{const h=$('roamhint')||document.querySelector('#roam .hint');if(h&&!/SHOVE/.test(h.textContent))h.appendChild(document.createTextNode(' · X SHOVE'))}catch(e){}return r}}
