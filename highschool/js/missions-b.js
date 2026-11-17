'use strict';
/* =====================================================================
   HIGHSCHOOL — missions B: In Person (Sean & Stella), Corey Gets It,
   The Beep Test, The Back Fridge, Locker 13
   ===================================================================== */

/* =================================================================
   IN PERSON — Sean & Stella
   ================================================================= */
mission('instella',{name:'In Person',icon:'⚾',who:['sean','stella'],
 blurb:'Sean and Stella have only ever been a voice on the phone. Today she’s here. In 3D. Sean is not okay.',
 parts:['Before school: Stella gets off the bus','Break: get her lucky ball back','Lunch: the field'],
 tips:['Before school, bus loop. Sean is hiding behind people.','Break, main corridor. Arjun has something that isn’t his.','Lunch, the field. Coach throws javelins at 12:40. Trees are safe.'],
 variants:{kiss:'Strike one',javelin:'The javelin'}});

hook({mis:'instella',period:0,room:'bus',who:'sean',label:'Ask Sean why he’s hiding',cond:()=>!D.f.stella1,run:async()=>{
 scene('bus',{sean:[170,1,{y:150,pose:'cover'}],you:[186,-1,{y:152}],hasan:[230,-1,{y:146}],arjun:[254,-1,{y:144,pose:'cross'}]});
 await say('sean','Don’t move. Be a wall. Be a big, wide wall.','scared');
 await say('you','Sean, what are you—');
 await say('sean','She’s on the 43. She’s on THIS 43. She’s getting off it NOW.','scared');
 put('stella',30,1,{y:150});SFX.door();
 await walk('stella',110,40);
 await say('sean','(behind you) That’s her. That’s HER. In three dimensions. She has a BACK. I didn’t know she had a back.','shock');
 await say('stella','Sean?','happy');
 pose('sean',null);await walk('sean',140,50);
 await say('sean','HI.','yell');
 await N('He says it at a volume usually reserved for fire drills. The whole bus loop turns round.');
 await say('stella','(laughing) Hi. Strike one?','happy');
 await say('sean','Strike— yeah. Yes. One. Strike. Hi. I already said hi.','blush');
 await say('stella','Meet me on the field at lunch? Bring my ball. You said you’d keep it safe for me.','happy');
 await walk('stella',340,45);remove('stella');
 await say('sean','I don’t HAVE the ball. It was in my bag. My bag’s been open since Arjun sat behind me on the bus.','scared');
 await say('arjun','Lose something, lover boy?','smirk');
 intel('arjunBall');
 D.f.stella1=1;part('instella',1);
}});

async function arjunGives(item,line){
 const c=await choose(['“Give it back or I read your Year 7 diary out loud.”','Wrestle it off him.',{t:'“Two quid.”',dis:D.money<2,why:'skint'}]);
 if(c===0){
  await say('arjun','You haven’t got my diary.','smirk');
  await say('you','“Dear Diary. Today Ms. Shermian smiled at me and I think she’s the only person who gets me.”');
  await say('arjun','…','shock');
  pose('arjun','throw');await wait(250);pose('arjun',null);
  await say('arjun','TAKE it. Take it and die.','angry');
 }else if(c===1){
  await walk('you',A.arjun.x+12,90);pose('you','grab');pose('arjun','grab');
  const ok=await mash('Wrestle it off Arjun!',{need:18,time:5});
  pose('you',null);pose('arjun',null);
  if(ok){await hit('you','arjun',{blood:4,dmg:1});await say('arjun','My FACE. I need that for being looked at.','hurt')}
  else{
   await N('Arjun elbows you in the nose and holds it over his head. Then a hand you didn’t see coming takes it off him.');
   if(A.aidan){await walk('aidan',A.arjun.x-12,70);await say('aidan','You dropped this.','smirk');await say('arjun','I— did not— how long have you been there?','scared');await say('aidan','Always.')}
  }
 }else{
  D.money-=2;updateLoc();
  await say('arjun','Two quid. And you have to say I’m handsome.','smirk');
  await say('you','You’re handsome.');
  await say('arjun','I know. Tragically.','smirk');
 }
 give(item);
 if(line)await say('arjun',line,'smirk');
}

hook({mis:'instella',period:2,room:'corridor',who:'arjun',label:'Get Stella’s ball off Arjun',cond:()=>D.f.stella1&&!has('ball'),run:async()=>{
 scene('corridor',{arjun:[60,1,{pose:'cross',y:146,hold:'ball'}],nivaan:[120,-1,{pose:'phone',y:146}],aidan:[215,1,{y:140}],you:[90,-1,{y:154}]});
 await say('arjun','This? Found it. In a bag. That I opened.','smirk');
 await say('arjun','Tell Sean she’s only talking to him because her dad left and she’s got low standards. Like, underground.','smirk');
 await say('nivaan','Bro, that’s actually evil.','shock');
 await say('arjun','It’s not evil. It’s accurate. Evil is just accurate with a hood on.','smirk');
 hold('arjun',null);
 await arjunGives('ball','Enjoy your little romance. I give it a week. A Friday, even.');
 part('instella',2);
}});

hook({mis:'instella',period:4,room:'field',who:'sean',label:'Give Sean the ball',cond:()=>has('ball')&&!D.dead.sean&&!D.dead.stella,run:async()=>{
 scene('field',{sean:[120,1,{y:146}],stella:[200,-1,{y:146}],coach:[290,-1,{y:140,hold:'javelin',pose:'throw'}],omer:[244,1,{y:150,pose:'cross'}],you:[100,1,{y:156}]});
 cue('field');
 take('ball');hold('sean','ball');
 await say('sean','You got it. You actually— I owe you my life. My whole life. Well, lunch.','happy');
 await walk('sean',166,40);
 await say('coach','JAVELIN PRACTICE! Anyone on the field is a target! That’s not a warning, it’s a scoring system!','yell');
 const c=await choose(['Shout: “Under the cherry tree, you idiots!”','Run onto the field and drag them clear yourself.','Let them stay where they are.'],'Coach is lining up a throw.');
 if(c===2){
  await say('stella','Sean, I—','happy');
  SFX.whoosh();const j=prop({t:'javelin',x:300,y:110,rot:.25});await tw(j,{x:166,y:132},300,'in');
  SFX.squelch();shake(1.3);blood(166,124,40,-1,120,150);
  A.sean.dead='impale';A.sean.pose='lie';A.sean.pool=0;A.sean.poolMax=30;A.sean.bleed=3;D.dead.sean=1;j.hide=1;
  SFX.scream();
  await say('stella','SEAN—','cry');
  await say('coach','Bullseye. Thirty points.','happy');
  await N('Stella holds the ball. Strike one. It never gets thrown.');
  cue('dead');
  P.best['instella:javelin']=1;save();toast('Version found: The javelin');
  return;
 }
 if(c===1){
  await walk('you',184,110);
  await say('you','MOVE—');
  SFX.whoosh();const j=prop({t:'javelin',x:300,y:110,rot:.25});await tw(j,{x:184,y:132},300,'in');j.hide=1;
  SFX.squelch();shake(1.3);blood(184,124,40,-1,120,152);
  A.you.dead='impale';A.you.pose='lie';A.you.pool=0;A.you.poolMax=30;A.you.bleed=3;
  await say('stella','Oh my GOD—','shock');
  await say('coach','DOUBLE POINTS FOR A RUNNING TARGET!','happy');
  await die('javelin');
 }
 await say('you','UNDER THE TREE! NOW!','yell');
 await Promise.all([walk('sean',70,90),walk('stella',84,90)]);face('sean',1);face('stella',-1);
 SFX.whoosh();const j=prop({t:'javelin',x:300,y:110,rot:.25});await tw(j,{x:180,y:142},300,'in');SFX.thud();shake(.5);
 await say('omer','(looking at the javelin quivering where they were standing) Bro.','shock');
 await wait(400);
 cue('romance');await tw(fxState,{romance:1},1200);
 await say('sean','I had a whole speech. I practised. On your voicemail. Forty times.','blush');
 await say('stella','I know. I listened to all forty.','happy');
 await say('sean','Oh no.','shock');
 await say('stella','Number thirty-one was my favourite. You cried a bit.','happy');
 await say('sean','That was hay fever.','blush');
 await say('stella','In November?','smirk');
 await say('sean','…I cried a bit.','blush');
 pose('sean','hold');
 await say('sean','Strike one. You said you’d only ever need one.');
 hold('sean',null);pose('sean',null);hold('stella','ball');
 await say('stella','Strike one.','love');
 ex('sean','closed');ex('stella','closed');pose('sean','kiss');pose('stella','kiss');await tw(A.stella,{x:78},300);
 SFX.kiss();for(let i=0;i<4;i++){prop({t:'heart',x:74+(i%2?6:-4),y:116,t0:T+i*.35})}
 await wait(1400);
 await card('IN PERSON','STRIKE ONE',2400,'love');
 put('arjun',340,-1,{y:150});await walk('arjun',230,90);
 await say('arjun','OI, SEAN! Does she know you practised that on a MIRR—','smirk');
 const k=await choose(['Tackle Arjun.','Let Omer handle it.']);
 if(k===0){await walk('you',220,120);await hit('you','arjun',{pose:'headbutt',blood:6});A.arjun.pose='lie';SFX.thud();pose('you',null);await say('arjun','(from the grass) …worth it.','hurt')}
 else{
  await walk('omer',220,80);pose('omer','hold');await hop('arjun',10,300);A.arjun.pose='lie';SFX.thud();shake(.6);pose('omer',null);
  SFX.whoosh();const j2=prop({t:'javelin',x:300,y:110,rot:.6});await tw(j2,{x:236,y:150},280,'in');SFX.squelch();blood(236,148,16,1,60,152);
  await say('arjun','MY FOOT— HE’S PINNED MY FOOT TO THE GROUND—','yell');
  await say('coach','Fifty points!','happy');
 }
 await N('Under the cherry tree, Sean and Stella don’t notice any of it.');
 fxState.romance=0;
 await complete('instella','kiss');
}});

/* =================================================================
   COREY GETS IT — Corey & Abby, PE
   ================================================================= */
mission('corey',{name:'Corey Gets It',icon:'🏐',who:['corey','abby','kenneth'],
 blurb:'Corey has looked at Abby every day since Year 8. Today she’s in his PE group. Today, one way or another, Corey gets it.',
 parts:['Break: the canteen queue','Lunch: get Kenneth to swap PE partners','Period 5 (PE): medicine-ball dodgeball'],
 tips:['Break, canteen. Corey’s in the queue behind her.','Lunch, sports hall. Kenneth will swap for a buzzer-beater.','Period 5 (PE), sports hall. When the ball comes, put Corey in front of it.'],
 variants:{kiss:'He gets the girl',ball:'He gets the ball'}});

hook({mis:'corey',period:2,room:'canteen',who:'corey',label:'Get Corey to talk to Abby',cond:()=>!D.f.corey1,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],abby:[150,-1,{y:146,hold:'tray'}],corey:[178,-1,{y:146,hold:'tray'}],hasan:[210,-1,{y:148}],marcus:[280,-1,{y:146}],you:[236,-1,{y:154}]});
 await say('corey','(whispering) She’s right there. She’s right THERE. Her hair is doing the thing.','scared');
 await say('you','So say something.');
 face('abby',1);
 await say('abby','You’re the boy on the 43 who gives his seat away and pretends he wanted to stand.','happy');
 ex('corey','shock');await wait(600);
 hold('corey',null);const t=prop({t:'tray',x:172,y:128});SFX.whoosh();await tw(t,{y:150},260,'in');SFX.thud();SFX.glass();
 const jar=prop({t:'powder',x:176,y:150});await tw(jar,{x:154},500);
 await N('He drops the tray. A small purple jar rolls out of his hoodie pocket and stops against Abby’s trainer.');
 pose('abby','kneel');jar.hide=1;await wait(300);pose('abby',null);hold('abby','powder');
 await say('abby','C.U.R.L.? Mate.','smirk');
 await say('corey','That’s— for emergencies.','blush');
 await say('abby','Mine are natural. I just wake up like this.','smirk');
 hold('abby','tray');
 await say('abby','See you in PE. I’ll be the one not dying.','happy');
 await walk('abby',330,50);remove('abby');
 await say('hasan','Bro dropped his tray AND his dignity. In one motion. Like a magic trick.','laugh');
 await say('corey','She’s in my PE group. But Kenneth’s her partner. Kenneth’s ALWAYS her partner.','sad');
 await say('corey','Kenneth would swap if you beat him at something. He’s got no dignity. Only a competitive streak.');
 intel('kennethSwap');
 D.f.corey1=1;part('corey',1);
}});

hook({mis:'corey',period:4,room:'gym',who:'kenneth',label:'Ask Kenneth to swap PE partners',cond:()=>D.f.corey1&&!D.f.swap,run:async()=>{
 scene('gym',{kenneth:[200,-1,{pose:'dribble',y:146}],paul:[240,-1,{pose:'hips',y:144}],alex:[120,1,{y:146}],you:[170,1,{y:152}]});
 await say('kenneth','Swap Abby? She’s the only one who doesn’t throw at my face.','shock');
 await say('kenneth','…Buzzer-beater. Three shots. Get two, she’s Corey’s. Miss, and you buy me a cookie for a year.','smirk');
 pose('kenneth',null);hold('you','bball');
 let made=0;
 for(let i=0;i<3;i++){
  const r=await meter('Shot '+(i+1)+' of 3',{speed:1.15+i*.12});
  pose('you','throw');hold('you',null);const b=prop({t:'bball',x:A.you.x+4,y:A.you.y-30});await Promise.all([tw(b,{x:296},500),tw(b,{y:30},250,'out').then(()=>tw(b,{y:r?50:70},250,'in'))]);b.hide=1;pose('you',null);hold('you','bball');
  if(r){made++;SFX.ding();await say(i%2?'alex':'paul',pick(['SPLASH.','Nothing but net!','Cold. Ice cold.']),'happy')}else{SFX.bounce();await say('kenneth',pick(['Brick.','Brick city, population you.','That hit the ceiling. How did that hit the ceiling.']),'laugh')}
 }
 hold('you',null);
 if(made>=2){
  await say('kenneth','…Fine. FINE. Take the bib. Corey owes me. Corey owes me a kidney.','sad');
  give('swap');D.f.swap=1;
  await say('paul','Kenneth. You lost. Do you know what that means?','smirk');
  await say('kenneth','No— Paul— not the—');
  await walk('paul',214,70);pose('paul','grab');await hop('kenneth',12,300);A.kenneth.pose='lie';SFX.thud();shake(.6);
  part('corey',2);
 }else{
  await say('kenneth','Come back tomorrow.','smirk');
  await say('you','(It’s always today.)');
 }
}});

hook({mis:'corey',period:5,room:'gym',who:'auto',cond:()=>D.f.corey1&&!D.dead.corey,run:async()=>{
 const sw=D.f.swap;
 const cast={coach:[50,1,{pose:'hips',y:146}],corey:[sw?150:250,sw?1:-1,{y:146}],abby:[sw?170:110,sw?-1:1,{y:148}],kenneth:[sw?250:130,-1,{y:146}],paul:[270,-1,{y:142}],arjun:[230,-1,{y:150,pose:'cross'}],marcus:[90,1,{y:150}],you:[210,-1,{y:156}]};
 if(D.dead.abby)delete cast.abby;
 scene('gym',cast);
 await say('coach','DODGEBALL! Except we’re out of dodgeballs. So: medicine balls.','evil');
 await say('marcus','Big, heavy balls. In my face. On a Friday. Living the dream.','smirk');
 await say('coach','Partners! Abby with— '+(sw?'Corey.':'Kenneth.'),'yell');
 if(sw)await say('corey','(to you, very quietly) I will name my first child after you. Even if it’s a dog.','happy');
 hold('paul','medball');pose('paul','throw');await wait(200);hold('paul',null);
 const b1=prop({t:'medball',x:260,y:118});await tw(b1,{x:A.arjun.x,y:124},250,'in');b1.hide=1;
 await hit('paul','arjun',{sfx:SFX.thud,blood:10,push:10,dmg:2});A.arjun.pose='lie';
 await say('arjun','(from the floor) My FACE. I had plans for my face.','hurt');
 if(!sw){
  await say('corey','(staring at Abby across the hall)','blush');
  await say('coach','COREY! HEADS UP!','yell');
  hold('coach','medball');pose('coach','throw');await wait(250);hold('coach',null);
  const b=prop({t:'medball',x:60,y:118});await tw(b,{x:A.corey.x,y:118},300,'in');b.hide=1;
  SFX.crunch();shake(1.4);flash('#fff',.5);
  kill('corey','crush',{pool:30,bleed:3});
  if(A.abby){await say('abby','COREY!','cry')}
  await say('coach','And THAT is why we keep our eyes on the ball.','smirk');
  await N('Corey finally gets it in PE. Not the way anyone hoped.');
  P.best['corey:ball']=1;save();toast('Version found: He gets the ball');
  return;
 }
 await say('abby','Stand behind me. I’ve got older brothers. I know how to take a ball.','smirk');
 hold('coach','medball');pose('coach','throw');
 await say('coach','(winding up, eyes on Abby) Let’s see you take THIS.','evil');
 const c=await choose(['Shove Corey in front of Abby.','Shout a warning.','Do nothing.'],'The ball is already in the air.');
 hold('coach',null);
 const b=prop({t:'medball',x:60,y:118});
 if(c===0){
  await walk('you',A.corey.x+10,160);pose('you','grab');
  await tw(A.corey,{x:A.abby.x+12},120);
  await tw(b,{x:A.corey.x,y:120},250,'in');b.hide=1;
  SFX.crunch();shake(1.2);flash('#fff',.4);
  A.corey.hurt=3;blood(A.corey.x,A.corey.y-22,40,1,90,A.corey.y+2);A.corey.pose='lie';A.corey.dir=-1;
  await N('Corey takes the medicine ball full in the face. His nose goes one way. Most of his blood goes the other.');
  pose('you',null);
  pose('abby','kneel');ex('abby','shock');
  await say('abby','You IDIOT. You absolute idiot.','cry');
  await say('corey','(through a lot of blood) …Was it cool?','hurt');
  await say('abby','It was so cool.','love');
  cue('romance');fxState.romance=.8;
  pose('abby','kiss');ex('abby','closed');SFX.kiss();
  for(let i=0;i<3;i++)prop({t:'heart',x:A.abby.x+i*4,y:122,t0:T+i*.4});
  await wait(1200);
  await say('kenneth','He finally gets it.','happy');
  await say('paul','IN PE!','happy');
  await say('arjun','(from the floor, nose bleeding) …Fair play. Genuinely.','hurt');
  fxState.romance=0;
  await card('COREY GETS IT','IN PE',2200,'love');
  await complete('corey','kiss');return;
 }
 if(c===1){
  await say('you','ABBY, DUCK!','yell');
  pose('abby','kneel');await tw(b,{x:A.corey.x,y:120},250,'in');b.hide=1;
  SFX.crunch();shake(1.2);A.corey.hurt=3;blood(A.corey.x,A.corey.y-22,30,1,90,A.corey.y+2);A.corey.pose='lie';
  await N('Abby ducks. The ball keeps going. Corey was standing directly behind Abby, because of course he was.');
  pose('abby',null);
  await say('abby','…Corey?','shock');
  await say('corey','(from the floor) I’m good. I’m great. Hi.','hurt');
  await say('abby','You’re bleeding on my trainers.','smirk');
  await say('abby','…Text me. After you’ve stopped bleeding.','happy');
  part('corey',2,true);toast('So close. Next time, put him in front of it on purpose.');
  return;
 }
 await tw(b,{x:A.abby.x,y:120},250,'in');b.hide=1;SFX.thud();shake(.9);
 A.abby.hurt=2;A.abby.pose='lie';blood(A.abby.x,A.abby.y-20,18,1,70,A.abby.y+2);
 ex('corey','angry');
 await say('corey','…You threw that at a GIRL.','angry');
 await walk('corey',90,110);await hit('corey','coach',{blood:6,dmg:1});
 await say('coach','(not moving at all) Detention. Forever. Your forever. Not mine.','evil');
 await N('Corey doesn’t get it. Not today.');
}});

/* =================================================================
   THE BEEP TEST — Coach Dunmore
   ================================================================= */
mission('beep',{name:'The Beep Test',icon:'📢',who:['alex','paul','kenneth','jacob'],
 blurb:'Coach Dunmore keeps a list. Anyone who drops out of the beep test gets cut. Not from the team.',
 parts:['Break: find out about the cut list','Period 7: the beep test'],
 tips:['Break, sports hall. Alex looks like he hasn’t slept.','Period 7, sports hall. If you rigged it, let Coach show you how it’s done. Energy drinks help.'],
 variants:{coach:'Coach demonstrates',survive:'You survived it'}});

hook({mis:'beep',period:2,room:'gym',who:'alex',label:'Ask Alex what’s wrong',cond:()=>!D.f.beep1,run:async()=>{
 scene('gym',{coach:[70,1,{pose:'hips',y:146}],alex:[150,1,{y:146}],paul:[190,-1,{y:144}],kenneth:[230,-1,{y:146,pose:'dribble'}],you:[176,-1,{y:154}]});
 await say('alex','Coach has a list. The cut list. Anyone who drops out of the beep test this afternoon gets cut.','scared');
 await say('you','From the team?');
 await say('alex','From the register. Gary Pritchard got cut last year. They never found the rest of Gary.','scared');
 await say('kenneth','They found his left trainer. On the roof. Still laced.','shock');
 await say('alex','The beep-test CD player’s in the PE cupboard. There’s a speed dial on the back. If someone turned it up…');
 intel('beepDial');
 await say('paul','I’ve wanted to wrestle Coach since Year 7. This is my moment. Go.','happy');
 await walk('paul',84,90);pose('paul','grab');pose('coach','grab');
 await say('coach','PAUL. YOU ABSOLUTE GIRAFFE—','yell');
 const s=async()=>{for(let i=0;i<6;i++){hop('paul',4,200);hop('coach',3,200);SFX.thud();shake(.3);await wait(260)}};
 const sp=s();
 await walk('you',160,90);SFX.door();
 const r=await meter('Turn the dial to ×3',{speed:1.25});
 await sp;
 if(r){D.f.beepRig=1;SFX.ding();await N('You turn the dial from ×1 to ×3. The little sticker next to ×3 says “DO NOT. — Gary”.')}
 else{await N('Your thumb slips. The dial clicks to ×0.5. Nobody will ever know. Nobody will ever be saved.')}
 pose('coach',null);
 await tw(A.paul,{x:250},350);A.paul.pose='lie';SFX.thud();shake(.5);
 await say('paul','(from across the hall) Again! AGAIN!','happy');
 D.f.beep1=1;part('beep',1);
}});

hook({mis:'beep',period:6,room:'gym',who:'auto',run:async()=>{
 const kids=['paul','kenneth','jacob','omer','angelo'].filter(n=>!D.dead[n]);
 const cast={coach:[50,1,{pose:'hips',y:146,hold:'cleaver'}],you:[290,-1,{y:150}]};kids.forEach((n,i)=>cast[n]=[120+i*32,-1,{y:146}]);
 scene('gym',cast);
 await say('coach','BEEP TEST. Twenty metres. Every beep, you’re on the line. Miss a beep, you’re CUT.','evil');
 await N('He taps the cleaver against his whistle. Ting. Ting.');
 if(D.f.beepRig){
  SFX.beep();await wait(200);SFX.beep();await wait(150);SFX.beep();
  await say('jacob','That’s too fast. That’s WAY too fast.','angry');
  await say('coach','Too fast? TOO FAST? Pathetic. Let me DEMONSTRATE how a real man does it.','yell');
  hold('coach',null);
  for(let i=0;i<9;i++){SFX.beep();await walk('coach',i%2?60:250,150+i*30);if(i>4){ex('coach','angry');A.coach.shake=1}}
  SFX.heart();await wait(300);SFX.heart();await wait(200);SFX.heart();
  await say('coach','I’m— FINE— pain is— weakness—','yell');
  SFX.squelch();shake(1.4);flash('#a00010',.5);blood(A.coach.x,A.coach.y-20,70,null,120,A.coach.y+2);
  kill('coach','lie',{pool:40,bleed:4});
  await N('Coach Dunmore’s heart doesn’t stop. It leaves. Through the front.');
  await N('The CD keeps beeping. Faster. Faster.');
  await say('jacob','…Do we still have to run?','shock');
  if(A.kenneth){await walk('kenneth',160,60);SFX.click();await N('Kenneth turns it off.');await say('kenneth','Pain is weakness leaving the body. Rest in peace, sir. You were so weak.')}
  await complete('beep','coach');return;
 }
 let n=await rhythm('Beep test: step on every beep',{n:9,gap:has('energy')?1:.85,window:has('energy')?.26:.19});
 if(has('energy'))take('energy');
 if(A.angelo){
  await N('On level six, Angelo stops to sell someone a Twix.');
  await say('coach','CUT.','evil');
  await walk('coach',A.angelo.x-12,140);pose('coach','slam');SFX.squelch();shake(1);
  blood(A.angelo.x,A.angelo.y-20,40,1,100,A.angelo.y+2);kill('angelo','lie',{pool:30});
  pose('coach',null);
  await say('angelo','(dying) …No refunds…','dead');
 }
 if(n<6&&has('chucks')){
  await N('Your legs stop. The beep doesn’t.');
  await say('coach','CUT.','evil');
  await walk('coach',A.you.x-14,160);pose('coach','slam');pose('you','up');SFX.smack();SFX.smack();shake(.8);
  await N('The cleaver comes down. You catch it between two thirty-centimetre rulers and a shoelace. It holds.');
  pose('coach',null);pose('you',null);
  await say('coach','…Ruler-chucks. I haven’t seen ruler-chucks since ’94.','shock');
  await say('coach','You pass. Don’t tell anyone. Respect is weakness leaving the body.','smirk');
  take('chucks');n=6;
 }
 if(n<6){
  await N('Your legs stop. The beep doesn’t.');
  await say('coach','CUT.','evil');
  await walk('coach',A.you.x-14,160);pose('coach','slam');SFX.squelch();shake(1.2);flash('#a00010',.5);
  await behead('you',1);
  await N('Your head rolls across the halfway line. Coach blows his whistle. Foul.');
  await die('beep');
 }
 await say('coach','…Pathetic. All of you. Same time next week.','angry');
 await say('jacob','(barely breathing) I hate this. I hate this so much. Nobody laugh at me.','angry');
 await say('paul','Nobody’s laughing, Jacob. Nobody ever laughs at you.');
 await complete('beep','survive');
}});

/* =================================================================
   THE BACK FRIDGE — Mr. Voss
   ================================================================= */
mission('voss',{name:'The Back Fridge',icon:'🧪',who:['corey','david','nivaan','dheva'],
 blurb:'Mr. Voss makes Corey’s curl cream. He says it’s collagen. He says it’s from “volunteers”. He has a fridge nobody’s allowed to open.',
 parts:['Lunch: get the key off Mr. Voss','Period 7: open the back fridge'],
 tips:['Lunch, chem lab. Corey’s buying something.','Period 7, chem lab. You’ll need something to throw in his eyes. Dheva never leaves home without his powder.']});

hook({mis:'voss',period:4,room:'chem',who:'corey',label:'Ask Corey what he’s doing in here',cond:()=>!has('key'),run:async()=>{
 scene('chem',{voss:[180,-1,{pose:'hips',y:142}],corey:[120,1,{y:148,hold:'powder'}],you:[90,1,{y:154}]});
 await say('corey','Don’t judge me. Voss makes C.U.R.L. The best curl cream in the country. I don’t ask what’s in it.','blush');
 await say('voss','Collagen. From… volunteers.','smirk');
 await N('He looks at the fridge when he says “volunteers”. Then he looks at you, the way people look at a menu.');
 await say('voss','Would YOU like to volunteer? Young people are so full of collagen. Bursting with it.','evil');
 await say('corey','(whispering) He keeps the fridge key on his lanyard. I’ve seen him open it. It’s… jars. Lots of jars.','scared');
 intel('vossKey');
 const c=await choose(['Hug Mr. Voss and lift the key.','Ask him to show you the acid vat.']);
 if(c===0){await walk('you',166,60);pose('you','hug');await say('voss','Oh! Oh my. A hugger. Huggers are so… squeezable.','evil')}
 else{await say('you','Sir, can you show me the vat?');await say('voss','Can I SHOW you the VAT?','happy');await walk('voss',250,60);await walk('you',236,60)}
 const r=await meter('Lift the key off his lanyard',{speed:1.3,zone:.22});
 pose('you',null);
 if(r===0){
  await say('voss','Ah. A volunteer.','evil');
  await N('His hand closes round your wrist. It’s cold the way meat is cold.');
  await walk('voss',260,80);await walk('you',272,80);
  SFX.squelch();await tw(A.you,{y:120},300);A.you.vis=false;prop({t:'smoke',x:272,y:118});SFX.fire();
  await N('The acid takes about eleven seconds. Mr. Voss times it on his watch and writes it down.');
  await say('voss','Eleven. Lovely. Very… absorbent.','happy');
  await die('vat');
 }
 SFX.pick();give('key');
 await say('corey','(as you leave) I’m never using that curl cream again. …I’m going to use it on Monday.','sad');
 part('voss',1);
}});

hook({mis:'voss',period:6,room:'chem',who:'auto',cond:()=>has('key'),run:async()=>{
 const cast={voss:[200,-1,{pose:'hips',y:142}],you:[110,1,{y:156}]};if(!D.dead.david)cast.david=[150,-1,{y:150}];if(!D.dead.nivaan)cast.nivaan=[176,-1,{y:152,pose:'film'}];
 scene('chem',cast);
 await say('voss','Today: dissolving! Who wants to see something dissolve?','happy');
 await walk('voss',250,40);hold('voss','cookie');pose('voss','throw');await wait(200);hold('voss',null);SFX.squelch();prop({t:'smoke',x:272,y:118});
 await say('voss','Imagine that was a person. Don’t imagine too hard. I’ll know.','evil');
 await walk('you',44,60);face('you',-1);SFX.door();take('key');D.f.fridgeOpen=1;
 await N('The key fits. The fridge hums like it’s happy to see you.');
 await N('Jars. Rows of them. Labels in neat handwriting. GARY P. (LEFT FOOT). TYLER ×31. A jar labelled KEVIN that is just teeth.');
 await N('And on the bottom shelf: AIDAN. AIDAN. AIDAN. Fourteen jars. Every one dated Friday.');
 intel('aidanJars');
 if(A.david)await say('david','Why are there fourteen Aidans?','shock');
 if(A.nivaan)await say('nivaan','Chat says “bro’s been farming”.','shock');
 await walk('voss',70,90);
 await say('voss','Curious. I like curious. Curious is so… absorbent.','evil');
 pose('voss','choke');A.you.ex='scared';
 await walk('voss',230,60);A.you.x=244;
 const has_=has('spare')||has('powder');
 const c=await choose([{t:'Throw texture powder in his eyes.',dis:!has_,why:'you need powder',tag:'💇'},{t:'Bite his hand.'},{t:'Scream for David.'},{t:'Stab him with the compass shiv.',dis:!has('compass'),why:'Tez sells those',tag:'🗡️'}],'He’s lifting you over the vat.');
 if(c===3){take('compass');pose('you','punch');A.you.punchT=T+.4;SFX.squelch();blood(A.voss.x,A.voss.y-20,30,1,80,A.voss.y+2);await say('voss','You… STABBED me. With GEOMETRY.','yell');pose('voss',null);A.voss.shake=1;await walk('voss',266,60);SFX.squelch();SFX.fire();await tw(A.voss,{y:128},300);prop({t:'smoke',x:268,y:114});SFX.scream();await tw(A.voss,{alpha:0},1200);A.voss.vis=false;D.dead.voss=1;P.stats.kills++;await N('He staggers back into his own vat clutching a compass. Tez is going to want a review.');if(A.nivaan)await say('nivaan','Chat says “Pythagoras would be proud”.','happy');await complete('voss');return}
 if(c===0){
  take('spare');take('powder');pose('you','throw');
  for(let i=0;i<14;i++)parts.push({x:A.voss.x,y:A.voss.y-24,vx:rand(-20,20),vy:rand(-30,0),c:'#e8e8e8',s:1,fy:150,life:1});
  SFX.whoosh();
  await say('voss','MY EYES— IT’S SO… MATTE—','yell');
  pose('voss',null);A.voss.shake=1;await walk('voss',266,60);
  SFX.squelch();SFX.fire();await tw(A.voss,{y:128},300);ex('voss','scream');
  A.voss.bleed=0;
  await N('He stumbles backwards and sits down in the acid like it’s a bath.');
  prop({t:'smoke',x:268,y:114});SFX.scream();
  await tw(A.voss,{alpha:0},1200);A.voss.vis=false;D.dead.voss=1;P.stats.kills++;
  await N('His goggles bob to the surface. Then his lanyard. Then nothing.');
  if(A.nivaan)await say('nivaan','(still filming) Chat is going absolutely insane.','happy');
  if(A.david)await say('david','We should tell someone. We’re not going to tell anyone, are we.','shock');
  await complete('voss');return;
 }
 if(c===1){SFX.crunch();await say('voss','Ah! Biting! You’re a FRESH one.','evil')}
 else{await say('you','DAVID!');if(A.david)await say('david','I— I’m— (he does not move a single muscle)','scared')}
 SFX.squelch();await tw(A.you,{y:126},250);A.you.vis=false;prop({t:'smoke',x:266,y:116});SFX.fire();
 await say('voss','Fifteen jars. A nice round number. Well. Not round. Not anymore.','happy');
 await die('vat');
}});

/* =================================================================
   LOCKER 13 — Angelo
   ================================================================= */
mission('angelo',{name:'Locker 13',icon:'💰',who:['angelo','marcus'],
 blurb:'Angelo runs the only working economy in the building out of locker 13. He’s out of stock. Pat’s cookies go for a quid each.',
 parts:['Before school: Angelo needs stock','Break: rob Dinner Lady Pat'],
 tips:['Before school, main corridor.','Break, canteen. Pat’s left eye is glass. Marcus can talk to anyone about anything.'],
 doneTip:'Angelo’s shop is open every day now. Talk to him to buy things.'});

hook({mis:'angelo',period:0,room:'corridor',who:'angelo',label:'Ask Angelo how business is',cond:()=>!D.f.angelo1&&!P.done.angelo,run:async()=>{
 scene('corridor',{angelo:[36,1,{pose:'lean',y:146}],you:[70,-1,{y:154}],corey:[150,1,{pose:'phone',y:146}]});
 await say('angelo','Angelo. Like the angel, but I charge.','smirk');
 await say('angelo','Locker 13 is the only functioning economy in this building. Cash, cookies or favours. And right now? I’m out of stock.','sad');
 await say('angelo','Pat’s cookies go for a quid each after lunch. Fresh ones. The ones she won’t let anyone have. I need a tray.','smirk');
 await say('angelo','Bring me a tray at break. I’ll cut you in. Fifty-fifty. Sixty-forty. To me. Seventy-thirty.','smirk');
 D.f.angelo1=1;part('angelo',1);
}});

hook({mis:'angelo',period:2,room:'canteen',who:'marcus',label:'Get Marcus to distract Dinner Lady Pat',cond:()=>D.f.angelo1&&!D.done.angelo,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140,hold:'cleaver'}],marcus:[180,-1,{y:146}],you:[210,-1,{y:154}],hasan:[260,-1,{y:148}]});
 await say('marcus','Pat? Easy. Her left eye’s glass, by the way. I asked. She showed me. We’re close now.','smirk');
 intel('patBlind');
 await walk('marcus',112,50);face('marcus',-1);
 await say('marcus','Pat. Pat. Can I just say. Those are the biggest buns I have ever seen.','smirk');
 await say('pat','…They’re iced buns, love.');
 await say('marcus','I know.','smirk');
 await say('pat','(blushing, hitting him with a tea towel) Oh, STOP it.','blush');
 const c=await choose([{t:'Sneak round her LEFT side.'},{t:'Sneak round her RIGHT side.'},{t:'Just grab the tray and run.'},{t:'Blast her with the fire extinguisher.',dis:!has('extinguisher'),why:'Tez sells those',tag:'🧯'}]);
 if(c===3){take('extinguisher');pose('you','hold');SFX.whoosh();for(let i=0;i<30;i++)parts.push({x:A.you.x-8,y:A.you.y-22,vx:rand(-90,-30),vy:rand(-20,10),c:'#e8f0ff',s:2,fy:150,life:1});await say('pat','I CAN’T SEE. I can’t see out of my GOOD eye!','yell');pose('you',null)}
 if(c===1||c===2){
  if(c===1){await walk('you',118,60);await N('She turns her good eye. It lands on you like a searchlight.')}
  else{await walk('you',100,120);await N('You grab the tray. Pat doesn’t shout. Pat doesn’t do anything at all, for one second.')}
  await evil('pat','evil');
  await say('pat','Seconds, is it?','evil');
  pose('pat','throw');await wait(200);hold('pat',null);SFX.whoosh();
  await wait(150);SFX.squelch();shake(1.2);A.you.hurt=3;
  await behead('you',1);
  await N('The cleaver goes into the wall behind you. Your head takes a little longer to get there.');
  await say('pat','No seconds.','evil');
  await die('cleaver');
 }
 await walk('you',60,50);hold('you','tray');SFX.pick();await walk('you',250,90);
 give('cookies');
 scene('corridor',{angelo:[36,1,{pose:'lean',y:146}],you:[80,-1,{y:154,hold:'tray'}]});
 await say('angelo','Oh, that is BEAUTIFUL. You’re on the list. The good list.','happy');
 take('cookies');hold('you',null);D.money+=5;updateLoc();
 await say('angelo','Five quid, and locker 13 is open to you every day from now on. Every. Day.','smirk');
 await N('He says “every day” like he knows something. He doesn’t. Probably.');
 await complete('angelo');
}});
