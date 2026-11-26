'use strict';
/* =====================================================================
   HIGHSCHOOL — WEEK TWO: THE CHECKPOINT
   The metal detectors aren't a prop in the bus loop any more. The front
   lobby becomes a security CHECKPOINT room you walk through every morning
   of week two (days 8-11), and it gets worse every day as Mr. Adam
   (the principal) loses his grip:
   • Day 8  ZERO TOLERANCE: one arch, Coach and a javelin, the belt.
   • Day 9  THE X-RAY: bags through a scanner. A sixth grader's lunchbox
            has his dad's pistol in it "for protection, because of the
            detector".
   • Day 10 PAT-DOWNS: a police officer at the arch. If Paul Jones still
            has his dad's gun, he's in the line ahead of you with it.
   • Day 11 THE DROP: a pistol slides out of a hoodie in the line and
            stops at your feet. Everybody looks at you.
   The confiscation table fills up a little more each day.
   ===================================================================== */
K.kid5=Object.assign({},K.kid4,{n:'Ninth Grader',skin:'#e8c4a0',hair:'#c8a050',hs:'short',top:'#5a2a2a',seed:401});K.kid5.id='kid5';
K.kid6=Object.assign({},K.kid4,{n:'Sixth Grader',skin:'#f0d0b0',hair:'#6a3a1a',hs:'bowl',top:'#3a7ac8',h:-3,seed:402});K.kid6.id='kid6';
ROOMS.checkpoint={name:'Security Checkpoint',music:'tension',bg(){
 guCache('checkpoint','static',()=>{
  guGrad(0,112,'#cfc8b8','#b8b0a0');for(let x=0;x<W;x+=20)R(x,0,1,112,'rgba(0,0,0,.05)');
  R(0,70,W,4,'#3a5a8a');R(0,74,W,1,'#2a4a7a');
  /* the front doors, daylight behind */
  R(8,22,62,90,'#5a4a3a');R(11,25,27,87,'#c8e4f4');R(41,25,27,87,'#c8e4f4');R(38,25,3,87,'#4a3a2a');R(11,25,57,2,'#fff');guShaft(14,25,40,60,.6,'#fffbe8',.06);
  /* the banner */
  R(156,8,152,14,'#b81020');R(156,8,152,1,'#e84050');pxc('ZERO TOLERANCE',232,12,'#fff4e0');R(156,24,152,8,'#2a4a8a');pxc('INSPECTION READY',232,25,'#e8f0ff');
  guPoster(90,34,30,26,'#f4f0e6',['NO','BAGS','PAST'],'#b81020');guPoster(262,40,40,28,'#f4f0e6',['SMILE','YOU’RE','SAFE'],'#2a4a8a');
  guLight(130,0,36);guLight(230,0,36);
  /* floor */
  guTiles(0,112,W,68,8,'#9a9a9e','#a2a2a6','rgba(0,0,0,.08)',71);guFloorShine(112,68,.06);
  /* the x-ray machine */
  R(200,98,64,30,'#8a8e96');R(200,98,64,3,'#a8acb4');R(206,104,52,16,'#2a2a30');for(let i=0;i<6;i++)R(208+i*8,104,6,16,'#3a3a42');R(196,124,72,4,'#4a4a52');R(268,90,26,22,'#2a2a30');R(270,92,22,16,'#1a3a2a');
  /* the confiscation table */
  R(276,138,40,4,'#7a5a3a');R(278,142,2,14,'#5a4a3a');R(312,142,2,14,'#5a4a3a');pxc('CONFISCATED',296,131,'#b81020');
  /* queue posts */
  for(const x of[96,128,96,128])R(x,132,2,16,'#c8c8d0');R(96,134,32,1,'#2a4a8a');
 });
 /* the x-ray screen flickers; if a gun is on it, it's outlined in red */
 const scan=CP.scan;R(270,92,22,16,scan==='gun'?'#3a1010':'#1a3a2a');if(Math.sin(T*7)>.8)R(270,92+((T*30)%16|0),22,1,'rgba(120,255,160,.3)');
 if(scan==='gun'&&Math.sin(T*8)>0){R(276,98,9,3,'#ff3030');R(276,101,3,4,'#ff3030')}
 if(scan==='bag'){R(274,96,14,9,'#4a8a5a')}
 /* the table fills up through the week */
 const n=Math.max(0,Math.min(4,cal()-7));const items=[['#c8ccd0',4],['#2a2a2e',6],['#8a6a4a',5],['#2a2a2e',6]];
 for(let i=0;i<n;i++){const [c,w]=items[i];R(280+i*8,136,w,2,c);if(i%2)R(280+i*8,138,2,2,c)}
}};
if(typeof LIGHT!=='undefined')LIGHT.checkpoint={amb:.74,tint:[40,40,50],src:[[40,60,90,.35,[255,248,230]],[160,0,140,.25,[240,250,255]]],wallAO:1};
const CP={scan:null};
/* no arch in the bus loop any more: it lives in the checkpoint */
{const _dp=drawProp;drawProp=function(p){if(p.t==='detector'&&ROOM==='bus'&&!p.cp)return;return _dp(p)}}

const cpSeen=()=>{const c=crew();c.cp=c.cp||{};return c.cp};
screening=async function(){
 busy=true;setPanel('talk');
 const day=cal();
 const cast={you:[-14,1,{y:156}]};
 if(!D.dead.coach)cast.coach=[176,-1,{y:146,hold:'javelin'}];
 if(!D.dead.adam)cast.adam=[112,1,{y:140}];
 if(day>=10&&K.cop)cast.cop=[134,1,{y:148}];
 scene('checkpoint',cast,true);D.room='checkpoint';updateLoc();
 const arch=prop({t:'detector',x:160,y:146,light:0,cp:1,layer:2});
 const q=[];for(const [id,x] of[['kid1',40],['kid3',56],['kid2',72]])if(!D.dead[id]){put(id,x,1,{y:152});q.push(id)}
 cue('tension',true);
 await walk('you',24,70);
 const seen=cpSeen();
 if(!seen[day]){seen[day]=1;save&&save();
  if(day<=8)await cpDay8(arch);
  else if(day===9)await cpDay9(arch);
  else if(day===10)await cpDay10(arch);
  else await cpDay11(arch)}
 else if(A.adam)await say('adam',pick(['(through the megaphone, to nobody) Keep it moving. Keep it MOVING.','(through the megaphone) Pockets. Belts. Feelings. In the tray.','(through the megaphone, very tired) Smile for the inspectors.']),'cold');
 /* your turn */
 for(const id of q)if(A[id]){await walk(id,180,90);await walk(id,340,90);remove(id)}
 await walk('you',160,60);
 const m=metalOn();
 if(m.length){arch.light=2;SFX.beep&&SFX.beep();SFX.beep&&SFX.beep();
  await N('It rings. '+(ITEMS[m[0]]||m[0])+'.');
  if(A.coach){pose('coach','throw');await wait(200);SFX.whoosh&&SFX.whoosh();SFX.squelch&&SFX.squelch();shake(1.4);flash('#a00010',.5);blood(A.you.x,A.you.y-22,50,1,100,A.you.y+2)}
  arch.light=0;await die('detector')}
 arch.light=1;SFX.ding&&SFX.ding();await wait(TEST?0:300);arch.light=0;
 if(day>=10&&A.cop){pose('cop','grab');await wait(TEST?0:300);pose('cop',null);await say('cop','(patting you down, bored) Clean. Next.','cold')}
 await walk('you',336,80);
 busy=false;
};
/* the front door now leads through the checkpoint (it replaces the bus-loop screening) */

/* ---- day 8: zero tolerance ---- */
async function cpDay8(arch){
 if(A.adam){hold('adam','mic');await say('adam','(through a megaphone, eyes like he hasn’t slept) As of today, Highgate is a ZERO. TOLERANCE. SCHOOL.','yell');
  await say('adam','Walk through the arch. If it rings, Coach will… help you.','scared')}
 if(A.kid2){await walk('kid2',160,60);arch.light=2;SFX.beep&&SFX.beep();SFX.beep&&SFX.beep();
  await N('It rings. A freshman. His belt buckle.');
  if(A.coach){pose('coach','throw');await wait(200);hold('coach',null);SFX.whoosh&&SFX.whoosh();SFX.squelch&&SFX.squelch();shake(1.2);flash('#a00010',.4);
   blood(A.kid2.x,A.kid2.y-22,50,1,100,A.kid2.y+2);kill('kid2','impale',{pool:34});D.dead.kid2=1;hold('coach','javelin');pose('coach',null)}
  arch.light=0;
  await N('Nobody in the line makes a sound.');
  if(A.adam)await say('adam','(very quietly, not into the megaphone) …Belts are metal. Did nobody read the letter.','scared')}
 intel('backway');
 await N('Behind you, a kid whispers to his friend: “back way. through the woods. tomorrow.”')}

/* ---- day 9: the x-ray ---- */
async function cpDay9(arch){
 put('kid6',96,1,{y:152,hold:'bag',ex:'happy'});
 await N('There’s a new machine today. Bags go in one end on a rubber belt and come out the other. A screen shows what’s inside them, in green.');
 if(A.adam)await say('adam','(megaphone) BAGS. ON. THE BELT.','yell');
 await walk('kid6',212,60);hold('kid6',null);CP.scan='bag';SFX.click&&SFX.click();await wait(TEST?0:700);
 CP.scan='gun';SFX.beep&&SFX.beep();SFX.beep&&SFX.beep();
 await N('The screen. A sixth grader’s dinosaur lunchbox. A juice box, a sandwich, and the outline of a pistol.');
 for(const id of Object.keys(A))if(A[id]&&id!=='you'&&id!=='coach'&&id!=='adam')A[id].ex='shock';
 if(A.adam)await say('adam','(lowering the megaphone) …Whose lunchbox is that.','shock');
 await say('kid6','(very small) It’s my dad’s. I brought it for protection. Because of the detector. You said it was dangerous now.','scared');
 await N('Nobody says anything. That is exactly what he said.');
 if(K.cop){put('cop',334,-1,{y:150});await walk('cop',236,90);pose('cop','grab');await say('cop','Okay, buddy. Okay. Come with me. You’re not in trouble. You’re in a little bit of trouble.','sad');
  await Promise.all([walk('cop',360,60),walk('kid6',350,60)]);remove('cop')}
 remove('kid6');CP.scan=null;
 if(A.adam)await say('adam','(to himself, staring at the screen) Twenty-two years.','scared')}

/* ---- day 10: pat-downs, and Paul ---- */
async function cpDay10(arch){
 if(A.adam)await say('adam','(megaphone) Backpacks are BANNED as of today. Officer Kowalski will be patting everybody down. EVERYBODY.','yell');
 const paulHasIt=!D.dead.pauljones&&D.f&&D.f.pj2&&!crew().pjSafe&&!(D.done&&D.done.pauljones);
 if(!paulHasIt){await N('Half the school didn’t come through the front this morning. You can see them through the glass, coming out of the woods in twos and threes, not talking.');return}
 put('pauljones',86,1,{y:152,hold:'bag',ex:'sad'});
 await N('Two places ahead of you: Paul Jones. Hood up. His backpack on his front, both arms round it, like a baby.');
 await N('You know what’s in it. You know what the arch will do when he walks through it. You know what Coach is holding.');
 const c=await choose(['Pull him out of the line. “Back way. Now.”','Throw your stuff on the belt to jam it.','Tell Officer Kowalski.','Do nothing.'],'PAUL JONES IS IN THE LINE');
 if(c===0){await walk('you',92,90);pose('you','grab');await wait(200);pose('you',null);
  await say('pauljones','(not looking at you) …Okay.','sad');
  await Promise.all([walk('pauljones',-20,70),walk('you',-20,70)]);
  await N('You walk him back out through the front doors and round the side of the school, to the woods. He doesn’t say anything the whole way. At the fence, he says “thanks” to the ground.');
  D.f.pjKind=(D.f.pjKind||0)+1;remove('pauljones');put('you',-14,1,{y:156});await walk('you',24,70);return}
 if(c===1){await walk('you',208,90);pose('you','throw');const ok=await vgThrow('JAM THE BELT');pose('you',null);
  if(ok){SFX.crunch&&SFX.crunch();shake(.6);CP.scan=null;await N('Your shoe goes into the rollers. The belt chews it, screams, and stops. Everyone turns to look at the machine. Paul Jones walks back out of the front doors and nobody sees him go.');
   remove('pauljones');D.f.pjKind=(D.f.pjKind||0)+1;await walk('you',24,70);return}
  await N('You miss. Your shoe hits Mr. Adam in the back of the head.');}
 if(c===2&&A.cop){await walk('you',140,80);await say('you','(very quietly) Officer. The kid in the hood. His backpack.');
  await walk('cop',112,80);pose('cop','grab');await say('cop','Bag, son. Now.','cold');
  await N('Paul Jones looks at you over the officer’s shoulder while they unzip it. He doesn’t look angry. He looks like he expected it.');
  await Promise.all([walk('cop',360,60),walk('pauljones',350,60)]);remove('cop');remove('pauljones');
  crew().pjTold=1;await complete('pauljones','told');return}
 /* he walks through */
 await walk('pauljones',160,50);arch.light=2;SFX.beep&&SFX.beep();SFX.beep&&SFX.beep();
 for(const id of Object.keys(A))if(A[id]&&id!=='you')A[id].ex='shock';
 if(A.coach){await walk('coach',184,60);pose('coach','throw')}
 await N('It rings. Coach lifts the javelin. And Paul Jones, very calmly, unzips his backpack.');
 cue('fight',true);
 const d=await choose(['Run at Coach.','Shout “PAUL, DON’T.”','Get down.'],'IT’S RINGING');
 if(d===1){await say('you','PAUL. DON’T.');await N('He stops with his hand in the bag. He looks at you. He takes his hand out, empty, and puts both hands on his head.');
  if(A.coach)pose('coach',null);if(A.cop){await walk('cop',172,90);pose('cop','grab')}
  await say('pauljones','(to you, as they take him) I wasn’t gonna. I don’t think I was gonna.','cry');
  if(A.cop)await Promise.all([walk('cop',360,60),walk('pauljones',350,60)]);remove('cop');remove('pauljones');
  await complete('pauljones','caught');return}
 if(d===0){await walk('you',176,140);pose('you','grab');const ok=await mash('HOLD COACH',{need:22,time:3});pose('you',null);
  if(ok){await N('You hit Coach in the middle at full speed. The javelin goes into the ceiling tiles and stays there. Officer Kowalski gets to Paul before Paul gets to anything.')}
  else{SFX.whoosh&&SFX.whoosh();await N('Coach throws anyway. It goes past Paul’s head so close it takes his hood off. Officer Kowalski gets to him before anyone does anything else.')}
  if(A.cop)await Promise.all([walk('cop',360,60),walk('pauljones',350,60)]);remove('cop');remove('pauljones');
  await complete('pauljones','caught');return}
 pose('you','kneel');SFX.bang&&SFX.bang();shake(1.6);flash('#fff',.5);
 if(A.coach){blood(A.coach.x,A.coach.y-24,50,null,100,A.coach.y+2);kill('coach','lie',{pool:36});D.dead.coach=1}
 await N('One shot. Coach goes down with the javelin still in his hand. Paul puts the gun on the floor and puts his hands on his head before anybody tells him to.');
 if(A.cop)await Promise.all([walk('cop',172,90)]);
 await complete('pauljones','shot');remove('pauljones');pose('you',null)}

/* ---- day 11: the drop ---- */
async function cpDay11(arch){
 if(A.adam)await say('adam','(megaphone, voice gone) Tomorrow the inspectors come. Tomorrow we are PERFECT.','yell');
 put('kid5',100,1,{y:152,hold:'pistol',ex:'scared'});
 await N('In front of you, a ninth grader pulls his hoodie off over his head to put it in the tray. Something falls out of it.');
 SFX.thud&&SFX.thud();hold('kid5',null);const gp=prop({t:'gunfloor',x:56,y:157,layer:3});
 await N('A pistol. It hits the tiles and spins, and slides, and stops against your shoe.');
 for(const id of Object.keys(A))if(A[id]&&id!=='you')A[id].ex='shock';
 await N('Everyone in the line looks at it. Then at you.');
 const c=await choose(['Step on it. Hands up. “OFFICER.”','Kick it away, hard.','Pick it up.'],'THERE’S A GUN AT YOUR FEET');
 if(c===2){pose('you','reach');await wait(250);pose('you',null);hold('you','pistol');const i=props.indexOf(gp);if(i>=0)props.splice(i,1);
  if(A.coach){pose('coach','throw');await wait(200);SFX.whoosh&&SFX.whoosh();SFX.squelch&&SFX.squelch();shake(1.4);flash('#a00010',.5);blood(A.you.x,A.you.y-22,50,1,100,A.you.y+2)}
  await N('You pick it up to hand it to somebody. Coach doesn’t wait to find out who.');await die('detector')}
 if(c===1){SFX.whoosh&&SFX.whoosh();await tw(gp,{x:300},500);
  await N('It skates across the lobby and under the confiscation table. Coach watches it go. Then he looks back at you for a very long time.');
  if(A.coach)await say('coach','Nice touch, champ. Fast feet. Friday, fast feet.','evil')}
 else{pose('you','up');
  await N('You put your foot on it and your hands in the air and you shout for the officer so loud your voice cracks in half.');
  if(K.cop){if(!A.cop)put('cop',334,-1,{y:150});await walk('cop',72,120);pose('cop','grab');const i=props.indexOf(gp);if(i>=0)props.splice(i,1);
   await say('cop','(picking it up with a pen through the trigger guard) …Good kid. Good kid. Breathe.','cold')}
  pose('you',null)}
 await walk('kid5',-20,90);remove('kid5');
 if(A.adam)await say('adam','(not into the megaphone) …Keep it moving. Please.','scared')}
OUTCOME_FIX['pauljones:told']='messy';OUTCOME_FIX['pauljones:caught']='messy';
if(MIS.pauljones)MIS.pauljones.variants=Object.assign(MIS.pauljones.variants||{},{told:'You told the officer',caught:'Caught at the checkpoint'});
