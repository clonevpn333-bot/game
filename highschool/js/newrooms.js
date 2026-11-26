'use strict';
/* =====================================================================
   HIGHSCHOOL — MORE SCHOOL
   Three new rooms off the hallways, each with its own life and quest:
   • NURSE’S OFFICE (Science Wing) — Nurse Pam, a cot, a cabinet of
     things that are definitely not all medicine.
     Quest: NURSE PAM’S CALENDAR.
   • WEIGHT ROOM (Sports Wing) — racks, mirrors, grunting, Coach’s tub
     of protein. Quest: GAINS.
   • COURTYARD (Arts Wing) — the founder’s statue, a fountain, benches,
     Tez vaping behind a tree. Quest: COURTYARD RAVE.
   ===================================================================== */
WORLD.wing_sci.doors.push({x:110,to:'nurse',label:'NURSE'});
WORLD.wing_sports.doors.push({x:196,to:'weightroom',label:'WEIGHTS'});
WORLD.wing_arts.doors.push({x:196,to:'courtyard',label:'COURTYARD'});
DOORS.nurse={hall:'wing_sci',x:110};DOORS.weightroom={hall:'wing_sports',x:196};DOORS.courtyard={hall:'wing_arts',x:196};
if(typeof INSIDE!=='undefined')Object.assign(INSIDE,{nurse:'#e8f0f0',weightroom:'#5a5a62',courtyard:'#7ab07a'});
if(typeof DOOR_ROOMS!=='undefined')DOOR_ROOMS.push('nurse','weightroom');
FLOOR.nurse=[132,166];FLOOR.weightroom=[132,166];FLOOR.courtyard=[128,168];
K.nurse={n:'Nurse Pam',col:'#c86a8a',skin:'#f0c8a8',hair:'#c83a3a',hs:'bun',top:'#e8e8f0',pants:'#e8e8f0',adult:1,girl:1,skirt:1,seed:97,v:420,vw:'triangle'};K.nurse.id='nurse';
if(typeof SPAWNED!=='undefined')SPAWNED.add('nurse');
for(let p=0;p<=6;p++){ROSTER[p]=ROSTER[p]||{};ROSTER[p].nurse=[['nurse',230,-1,'cross',146]]}
for(const p of[2,4]){ROSTER[p].weightroom=[['paul',120,1,'up',150],['kenneth',170,-1,'hips',150]];ROSTER[p].courtyard=[['tez',250,-1,'smoke',150],['aidan',150,1,'sit',156]]}
ROSTER[0].courtyard=[['aidan',150,1,'sit',156]];

ROOMS.nurse={name:'Nurse’s Office',music:'class',bg(){
 guCache('nurse','',()=>{
  R(0,0,W,112,'#dce8e6');for(let y=60;y<106;y+=8)for(let x=(y%16?0:8);x<W;x+=16)R(x,y,15,7,'#e8f2f0');R(0,56,W,3,'#6aa8a0');R(0,104,W,8,'#8ab8b0');R(0,104,W,1,'#b8e0d8');
  R(0,0,W,4,'rgba(0,0,0,.12)');for(let i=0;i<3;i++){R(30+i*100,1,50,3,'#f4f8f8')}
  /* eye chart, posters */
  R(18,18,30,40,'#f4f4f0');R(18,18,30,1,'#fff');const L=['E','F P','T O Z','L P E D','P E C F D'];L.forEach((l,i)=>pxc(l,33,21+i*7,'#1a1a1a'));
  R(56,20,34,22,'#e05a5a');pxc('WASH',73,24,'#fff');pxc('YOUR',73,31,'#fff');R(56,44,34,14,'#5a8ae0');pxc('LICE?',73,47,'#fff');
  /* medicine cabinet */
  R(100,16,56,70,'#c8d0d0');R(102,18,52,66,'#a8b8b8');R(103,19,24,64,'#d8e8f0');R(129,19,24,64,'#d8e8f0');g.globalAlpha=.4;R(104,20,6,60,'#fff');R(130,20,6,60,'#fff');g.globalAlpha=1;
  for(let r=0;r<4;r++){R(104,30+r*14,48,1,'#8a9a9a');for(let i=0;i<6;i++)R(106+i*8,23+r*14,5,7,['#e8a040','#f4f0e6','#c83a3a','#5ab0e0','#f4f0e6','#8ad07a'][(i+r)%6])}
  R(126,50,4,6,'#e8c070');
  /* cot with a paper sheet */
  R(170,94,90,14,'#c8ccd4');R(170,90,90,6,'#f4f4f0');for(let i=0;i<90;i+=10)R(172+i,90,6,1,'#e8e8e4');R(172,108,3,10,'#8a8e98');R(255,108,3,10,'#8a8e98');R(246,82,16,9,'#f4f4f0');
  R(166,30,4,70,'#a8b0b8');R(166,30,30,3,'#a8b0b8');R(170,33,24,50,'#c8e8e0');for(let i=0;i<24;i+=4)R(170+i,33,1,50,'#a8d0c8');
  /* desk with a computer and the calendar */
  R(268,80,52,4,'#8a6a48');R(268,84,52,24,'#6a4e34');R(278,62,22,18,'#2a2a2a');R(280,64,18,13,'#3a6a8a');R(300,64,16,16,'#f4f0e6');R(300,64,16,3,'#e05a7a');for(let r=0;r<3;r++)for(let c=0;c<3;c++)R(302+c*5,69+r*4,3,2,(r+c)%2?'#e8a0b8':'#e8e2d6');
  /* floor */
  for(let y=112,r=0;y<H;y+=10,r++)for(let x=-((r%2)*12);x<W;x+=24){R(x,y,12,10,'#e4ece8');R(x+12,y,12,10,'#d4dcd8')}
  for(let i=0;i<6;i++){g.globalAlpha=.2*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
 });
 if(Math.sin(T*.9)>0){R(281,66,8,1,'#c8f0ff');R(281,69,12,1,'#c8f0ff')}else R(281,66,14,1,'#c8f0ff');
 {const sw=Math.sin(T*.7)*1.5;g.globalAlpha=.25;R(170+sw,33,24,50,'#ffffff');g.globalAlpha=1}
 if(Math.sin(T*19)>.93){g.globalAlpha=.2;R(0,0,W,112,'#fff');g.globalAlpha=1}
}};
ROOMS.weightroom={name:'Weight Room',music:'gym',bg(){
 guCache('weight','',()=>{
  R(0,0,W,112,'#4a4a52');for(let y=0;y<106;y+=6)for(let x=(y%12?0:10);x<W;x+=20)R(x,y,19,5,'#52525a');R(0,104,W,8,'#2a2a30');
  /* mirror wall */
  R(80,18,160,70,'#8a98a8');R(82,20,156,66,'#a8b8c8');g.globalAlpha=.3;for(let i=0;i<6;i++)R(90+i*26,20,4,66,'#fff');g.globalAlpha=1;
  pxc('NO PAIN NO GAIN',160,10,'#f0d040');R(100,8,120,1,'#f0d040');
  /* racks and plates */
  for(const x of[14,256]){R(x,30,4,78,'#8a8a92');R(x+42,30,4,78,'#8a8a92');R(x,40,46,3,'#5a5a62');for(let i=0;i<4;i++){R(x+6+i*9,48,7,14,'#1a1a1a');R(x+7+i*9,50,5,10,'#3a3a3a')}R(x,70,46,3,'#5a5a62');for(let i=0;i<5;i++)R(x+4+i*8,76,6,6,'#2a2a2a')}
  /* bench + bar */
  R(126,98,60,6,'#c83a3a');R(130,104,4,10,'#3a3a3a');R(178,104,4,10,'#3a3a3a');R(110,86,92,2,'#c8c8c8');R(110,80,8,14,'#1a1a1a');R(194,80,8,14,'#1a1a1a');
  /* coach's protein tub */
  R(262,86,14,18,'#2a2a2a');R(262,86,14,3,'#c8a030');pxc('PRO',269,92,'#c8a030');
  /* rubber floor */
  R(0,112,W,68,'#2a2a2e');for(let i=0;i<W;i+=40)R(i,112,1,68,'#1a1a1e');for(let j=112;j<180;j+=34)R(0,j,W,1,'#1a1a1e');
  for(let i=0;i<6;i++){g.globalAlpha=.3*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
 });
 for(let i=0;i<4;i++){const q=(T*.4+i/4)%1;g.globalAlpha=.15*(1-q);R(150+Math.sin(i+T)*20,90-q*40,10,6,'#c8c8d0');g.globalAlpha=1}
 if(Math.sin(T*2)>0){R(150,4,20,3,'#ff4040')}
}};
ROOMS.courtyard={name:'The Courtyard',music:'field',bg(){
 guCache('court','',()=>{
  R(0,0,W,40,'#8ec4ee');R(0,24,W,16,'#b8dcf4');
  R(0,30,W,82,'#8a3a3a');for(let y=32;y<110;y+=4)for(let x=(y%8?0:6);x<W;x+=12)R(x,y,11,3,'#9a4444');
  for(let r=0;r<2;r++)for(let c=0;c<8;c++){const x=12+c*40,y=40+r*30;R(x,y,24,20,'#2a2a3a');R(x+1,y+1,22,18,'#8ab0d0');R(x+12,y,1,20,'#2a2a3a');R(x,y+10,24,1,'#2a2a3a')}
  /* trees */
  for(const x of[30,280]){R(x-2,60,6,52,'#5a3a22');for(let i=0;i<5;i++){R(x-18+i*3,28+i*5,36-i*6,8,i%2?'#3a8a3a':'#4a9a4a')}}
  /* statue of the founder */
  R(196,60,32,48,'#9a9aa0');R(198,58,28,4,'#b8b8c0');R(204,30,16,28,'#8a8a92');R(207,20,10,10,'#8a8a92');R(205,34,4,14,'#7a7a82');R(219,28,4,10,'#7a7a82');pxc('FOUNDER',212,96,'#3a3a40');
  /* fountain */
  R(84,104,76,10,'#a8a8b0');R(86,102,72,4,'#c8c8d0');R(88,106,68,6,'#5aa0d8');R(118,86,8,18,'#a8a8b0');R(112,84,20,3,'#c8c8d0');
  /* benches */
  for(const x of[20,250]){R(x,128,50,4,'#8a6a48');R(x,122,50,3,'#8a6a48');R(x+4,132,3,10,'#3a3a3a');R(x+43,132,3,10,'#3a3a3a')}
  /* ground: paving + grass */
  R(0,112,W,68,'#c8c0b0');for(let y=112;y<H;y+=10)for(let x=((y/10)%2)*10;x<W;x+=20)R(x,y,19,9,'#d4ccbc');
  R(0,170,W,10,'#5aa04a');
  for(let i=0;i<6;i++){g.globalAlpha=.2*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
 });
 for(let i=0;i<14;i++){const q=(T*1.3+i/14)%1,a=i*.45;R(122+Math.cos(a)*q*16,102-Math.sin(q*3.14)*14,1,2,'rgba(190,230,255,.85)')}
 for(let i=0;i<2;i++){const x=((T*4+i*160)%380)-40;R(x,6+i*8,24,4,'rgba(255,255,255,.85)')}
 for(const x of[30,280]){const s=Math.round(Math.sin(T*1.3+x)*1.5);R(x-18+s,28,36,2,'rgba(255,255,255,.12)')}
 {const k=((T%14)/14);if(k<.4){const x=360-k/.4*400,f=Math.sin(T*12)>0;R(x,20,3,1,'#2a2a2a');R(x-1,19+(f?0:2),1,1,'#2a2a2a');R(x+3,19+(f?0:2),1,1,'#2a2a2a')}}
}};
if(typeof LIGHT!=='undefined'){LIGHT.nurse=()=>({amb:.95,tint:[60,90,90],src:[[128,40,60,.2,[220,255,255]]]});LIGHT.weightroom=()=>({amb:.78,tint:[50,40,40],src:[[160,40,90,.25,[255,240,220]]]});LIGHT.courtyard=()=>({amb:1,tint:[90,70,40],src:[]})}

/* ================= NURSE PAM’S CALENDAR ================= */
mission('nursecal',{name:'Nurse Pam’s Calendar',icon:'📅',who:['nurse','coach','grieve'],goal:'Find out who Nurse Pam is seeing. Then book them all for the same appointment.',
 blurb:'Nurse Pam has a heart-shaped calendar on her desk with three different teachers’ names on it in three different colors of pen. She thinks nobody’s noticed. Everybody’s noticed.',
 parts:['Fake sick','The appointments','Four o’clock'],
 tips:['Break or lunch: the Nurse’s Office (Science Wing, NURSE door). Tell her your stomach hurts.','Lunch, anywhere: send the three notes.','Lunch (later), the Nurse’s Office. Watch.'],
 variants:{brawl:'Three men, one cot',caught:'She knew it was you',love:'All four of them, somehow'}});
hook({mis:'nursecal',period:[2,4],room:'nurse',who:'nurse',label:'“My stomach really hurts…”',look:{pose:'cross'},cond:()=>!D.f.nc1&&!D.dead.nurse,run:async()=>{
 scene('nurse',{nurse:[230,-1,{y:146,pose:'cross'}],you:[180,1,{y:152}]});
 await beat('NURSE PAM’S CALENDAR','PART ONE · FAKE SICK');
 await say('nurse','Stomach. Mm-hm. Lie down, sweetie. I have to make a call. A very professional call.','smirk');
 await walk('you',210,60);A.you.pose='lie';A.you.y=148;
 await walk('nurse',340,70);remove('nurse');
 A.you.pose=null;await walk('you',300,70);A.you.back=1;
 await camZoom(305,76,2.4,500);
 await N('The heart-shaped calendar. Monday: COACH 💪 (cardio). Wednesday: MR. GRIEVE 📜 (“history lesson” — she drew a little wink). Friday: MR. ADAM (out of pity) (he cried last time).');
 await N('Thursday has all three names on it, crossed out, then rewritten, then crossed out, and then just the word “WHY” in red pen.');
 await camZoom();A.you.back=0;
 D.f.nc1=1;part('nursecal',1);return 'stay';
}});
freeHooks({mis:'nursecal',label:'Write three notes “from Nurse Pam”',look:{},cond:()=>D.f.nc1&&!D.f.nc2,run:async()=>{
 await beat('NURSE PAM’S CALENDAR','PART TWO · THE APPOINTMENTS');
 await N('Three notes, in pink pen, with a little heart over the i. “Nurse’s Office. Lunch. Come alone. Bring nothing. I mean NOTHING. — P.”');
 const c=await choose(['Slide them under three staff room pigeonholes.','Get Nivaan to deliver them “as a hall monitor”.']);
 if(c===1&&!D.dead.nivaan)await say('nivaan','(already filming) I’ll be in the vent. Chat is going to see EVERYTHING. Not everything. The PG-13 bits.','evil');
 D.f.nc2=1;part('nursecal',2);return 'stay';
}},[[2,'corridor','auto'],[4,'corridor','auto'],[4,'canteen','auto']]);
hook({mis:'nursecal',period:4,room:'nurse',who:'auto',cond:()=>D.f.nc2&&!D.done.nursecal&&!D.dead.nurse,run:async()=>{
 const cast={nurse:[160,1,{y:146,ex:'shock'}],you:[30,1,{y:156,pose:'kneel'}]};scene('nurse',cast,true);
 await beat('NURSE PAM’S CALENDAR','PART THREE · ALL AT ONCE');
 await N('You’re hiding behind the privacy curtain. Nurse Pam is checking her lipstick in a tongue depressor. She doesn’t know anyone’s coming. Everyone’s coming.');
 const men=['coach','grieve','adam'].filter(k=>!D.dead[k]);
 for(const [i,m] of men.entries()){put(m,334+i*16,-1,{y:146,ex:'blush',hold:i===0?'flower':null});await walk(m,200+i*24,70)}
 await say('nurse','(looking from face to face to face) …Oh no.','scared');
 if(A.coach)await say('coach','Pam. Who are these men. Why do they have FEELINGS on their faces.','angry');
 if(A.grieve)await say('grieve','I was promised a history lesson. I brought my musket.','cold');
 if(A.adam)await say('adam','(sitting down on the cot, already crying) I knew it. I knew Friday was a pity Friday.','cry');
 const c=await choose(['Stay hidden. Let it play out.','Pop out: “Surprise!”','Pull the privacy curtain round all four of them and leave.']);
 if(c===0){if(A.coach&&A.grieve){await hit('coach','grieve',{blood:6});await hit('grieve','coach',{blood:6,sfx:SFX.smack})}
  await N('The worst fight you’ve ever seen. Coach swings a crutch. Mr. Grieve fixes a bayonet to a thermometer. Nurse Pam takes everyone’s blood pressure anyway.');await complete('nursecal','brawl')}
 else if(c===1){A.you.pose=null;await walk('you',120,80);await say('nurse','(slowly turning to you) …Stomach ache. Lie down, sweetie. I’m going to give you a shot. A big one.','evil');
  await N('She chases you out of the office with a syringe the size of a flashlight. Three grown men watch you go, holding their flowers, and then look back at each other.');await complete('nursecal','caught')}
 else{await N('You pull the curtain round the four of them and walk out. Behind you there’s a long, long silence. Then Mr. Adam says “…so is this a group thing now?” and nobody says no.');
  await N('By Friday the four of them are seen at the Fair City Applebee’s, sharing a blooming onion. Nobody at Highgate is ever, ever okay again.');await complete('nursecal','love')}
 return 'stay';
}});

/* ================= GAINS ================= */
mission('gains',{name:'Gains',icon:'💪',who:['coach','paul'],goal:'Swap Coach’s protein powder before his lunch shake.',
 blurb:'Coach drinks one protein shake every lunch, in front of everyone, maintaining eye contact, and then makes the whole PE class run until somebody throws up. Paul has had enough.',
 parts:['Break: the tub','Lunch: the shake'],
 tips:['Break, the Weight Room (Sports Wing, WEIGHTS door). Coach’s tub is on the shelf.','Lunch, the cafeteria. Coach always shakes it at the counter.'],
 variants:{sprint:'The sprint',caught:'Coach knew',paul:'Paul drank it'}});
hook({mis:'gains',period:2,room:'weightroom',who:'paul',label:'Ask Paul why he’s glaring at Coach’s tub',look:{ex:'angry',pose:'cross'},cond:()=>!D.f.gn1&&!D.dead.paul&&!D.dead.coach,run:async()=>{
 scene('weightroom',{paul:[200,-1,{y:150,ex:'angry'}],you:[170,1,{y:154}]});
 await beat('GAINS','PART ONE · THE TUB');
 await say('paul','He made Jacob run until Jacob saw God. Jacob says God was disappointed in him. That’s on Coach.','angry');
 await say('paul','(holding up a bag of brown powder) Laxative chocolate. Industrial. My uncle’s a vet. This is for horses.','evil');
 const c=await choose(['Swap it. Fill the tub.','“Half. Just half. We’re not monsters.”','“Dude, this could kill a man.”']);
 if(c===2){await say('paul','He’s not a man. He’s a whistle with legs.','cold');}
 pose('paul','reach');await N('Paul tips the bag into Coach’s tub. '+(c===1?'Half of it. He stops. Then he does the other half too, looking at you like you never said anything.':'All of it. He stirs it in with a pencil.'));pose('paul',null);
 D.f.gn1=1;part('gains',1);return 'stay';
}});
hook({mis:'gains',period:4,room:'canteen',who:'auto',cond:()=>D.f.gn1&&!D.done.gains&&!D.dead.coach,run:async()=>{
 const cast={coach:[180,-1,{y:146,hold:'mug'}],you:[90,1,{y:154}]};if(!D.dead.paul)cast.paul=[114,1,{y:150,pose:'cross'}];for(const k of['hasan','omer','jacob'])if(!D.dead[k])cast[k]=[230+['hasan','omer','jacob'].indexOf(k)*20,-1,{y:150,pose:'sit'}];
 scene('canteen',cast,true);await beat('GAINS','PART TWO · THE SHAKE');
 await N('Coach shakes his protein in front of the whole cafeteria like he always does. Shake shake shake. Eye contact. He drinks the whole thing in one go and slams the cup down.');
 await say('coach','THAT’S how a man refuels. Anybody want to see a man refuel AGAIN?','yell');
 const c=await choose(['Watch.','Tell him what was in it.','Offer Paul the second shake. For courage.']);
 if(c===1){await say('coach','(going very still) …Paul.','evil');await N('Coach breathes through his nose, like a dragon deciding something. Then he walks out, very calm. Nobody sees him till Monday. Paul gets detention for the year.');await complete('gains','caught');return 'stay'}
 if(c===2&&A.paul){await say('paul','(drinking it to prove a point) …Oh. Oh no. I forgot. I forgot that’s what it was.','scared');await walk('paul',-30,200);await complete('gains','paul');return 'stay'}
 A.coach.ex='shock';SFX.rumble&&SFX.rumble();await wait(TEST?0:400);
 await N('A sound comes out of Coach that you will hear in your dreams. A low, wet, tectonic rumble. Every kid in the cafeteria puts their fork down at the same time.');
 await camZoom(180,110,2,250);await say('coach','(very quietly) …Don’t. Nobody. Move.','scared');await camZoom();
 hold('coach',null);await walk('coach',360,240);
 await N('Coach runs like he never ran in college, or in the war he says he was in. He takes a door off its hinges. The cafeteria gives him a standing ovation.');
 SFX.cheer();await complete('gains','sprint');return 'stay';
}});

/* ================= COURTYARD RAVE ================= */
mission('rave',{name:'Courtyard Rave',icon:'🔊',who:['kayden'],goal:'Skip Period 7 for Kayden’s secret party in the Courtyard. Get out before the raid.',
 blurb:'Kayden is throwing a party in the Courtyard during Period 7. During school. He has a speaker the size of a fridge and a smoke machine he stole from the drama department.',
 parts:['Lunch: get the invite','Period 7: the party'],tips:['Lunch, the Courtyard (Arts Wing, COURTYARD door). Kayden’s handing out wristbands.','At the Period 7 bell, skip. Sneak to the Courtyard.'],
 variants:{escaped:'Got out clean',raided:'Busted by Sherman',legend:'Danced on the statue'}});
hook({mis:'rave',period:4,room:'courtyard',who:'kayden',label:'“Kayden, what’s with the wristbands?”',look:{ex:'smirk'},cond:()=>!D.f.rv1&&!D.dead.kayden,run:async()=>{
 scene('courtyard',{kayden:[170,-1,{y:150,ex:'smirk'}],you:[140,1,{y:154}]});
 await beat('COURTYARD RAVE','PART ONE · THE INVITE');
 await say('kayden','Period 7. Right here. The statue’s the DJ booth. I got a smoke machine. I got lights. I got a juice box tower. You’re on the list. You’re the list.','evil');
 await say('kayden','Rule one: don’t tell Sherman. Rule two: if Sherman comes, don’t scream. She can smell screaming.','smirk');
 D.f.rv1=1;part('rave',1);return 'stay';
}});
hook({mis:'rave',period:6,room:'courtyard',who:'auto',cond:()=>D.f.rv1&&!D.done.rave&&!D.dead.kayden,run:async()=>{
 const cast={kayden:[212,-1,{y:110,pose:'cheer'}],you:[120,1,{y:154}]};const crowd=['jaxon','kaylee','tez','mia','brayden','kid1','kid2','kid3'];crowd.forEach((k,i)=>{if(!D.dead[k]&&K[k])cast[k]=[60+i*26,i%2?1:-1,{y:146+(i%3)*4,pose:'cheer'}]});
 scene('courtyard',cast,true);cue('fight');fxState.tint='#6a2a8a';fxState.tintA=.25;
 await beat('COURTYARD RAVE','PART TWO · THE PARTY');
 await N('Kayden on the founder’s shoulders, a speaker strapped to the statue. Thirty kids. Dish-soap foam up to everyone’s knees. It’s 2:40 on a Thursday.');
 const c=await choose(['Dance.','Climb the statue next to Kayden.','Keep watch by the door.']);
 if(c===1){await walk('you',200,90);await tw(A.you,{z:40,y:112},500);pose('you','cheer');await N('You’re on the founder’s other shoulder. The whole courtyard screams your name. You don’t know who started it. You don’t care.');D.f.rvStatue=1}
 else if(c===0){pose('you','cheer');await N('You dance like nobody’s watching. Everybody is watching. It’s fine. It’s great, actually.')}
 else{await walk('you',30,80);await N('You stand by the door like a bouncer. Kaylee calls you “security” all night. It’s the most respected you’ve ever been.');D.f.rvWatch=1}
 SFX.door();put('shermian',-20,1,{y:150,ex:'evil'});await walk('shermian',40,60);fxState.tintA=0;
 await say('shermian','(very calmly, over the music) Hello, sweeties.','evil');
 await N('The music stops. Thirty kids freeze in a foot of foam. Kayden is still on the statue. Ms. Sherman is holding a list. She is already writing names.');
 const k=D.f.rvWatch?0:await choose([{t:'Run through the foam for the side gate.',tag:'🏃'},{t:'Stand very still. Become part of the foam.'}]);
 if(D.f.rvWatch){await N('You saw her coming first. You’re through the side gate before she gets her pen out. Behind you, Kayden screams “TRAITOR” and then “GO, GO, I’LL HOLD HER OFF.”');await complete('rave','escaped')}
 else if(k===0){const ok=await mash('RUN',{need:18,time:3.5});if(ok){await walk('you',360,160);await complete('rave',D.f.rvStatue?'legend':'escaped')}else{await N('You slip in the foam. Ms. Sherman steps on your hood. She writes your name very slowly, saying each letter out loud.');D.f.sherC=(D.f.sherC||0)+1;await complete('rave','raided')}}
 else{await N('You stand perfectly still in the foam. She walks right past you. She looks you in the eye. She keeps walking. You will think about it for the rest of your life.');await complete('rave',D.f.rvStatue?'legend':'escaped')}
 fxState.tint=null;return 'ended';
}});
ARC_MIS.push('nursecal','gains','rave');
Object.assign(OUTCOME_FIX,{'nursecal:brawl':'good','nursecal:caught':'bad','nursecal:love':'messy','gains:sprint':'good','gains:caught':'bad','gains:paul':'messy','rave:escaped':'good','rave:raided':'bad','rave:legend':'good'});
