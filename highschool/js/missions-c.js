'use strict';
/* =====================================================================
   HIGHSCHOOL — missions C: the new kids, the finale, collectibles,
   deaths, endings
   ===================================================================== */

/* =================================================================
   HAT-TRICK — Alex
   ================================================================= */
mission('alex',{name:'Hat-Trick',icon:'⚽',who:['alex','jacob','omer'],
 blurb:'Alex needs a hat-trick or he’s retiring from football. Jacob is in goal. Jacob does not like being scored on.',
 parts:['PE: three goals past Jacob'],tips:['PE, on the field. Nobody’s supervising. Cross it to Alex.']});

hook({mis:'alex',period:5,room:'field',who:'alex',label:'Help Alex get his hat-trick',run:async()=>{
 scene('field',{alex:[150,1,{y:146,hold:'ball'}],jacob:[262,-1,{y:140}],omer:[200,1,{y:150,pose:'cross'}],nivaan:[60,1,{y:150,pose:'film'}],aidan:[300,-1,{y:132}],you:[110,1,{y:154}]});
 await say('alex','Hat-trick against Jacob or I’m retiring. I won’t retire. But I’ll THINK about retiring.','smirk');
 await say('jacob','Nobody scores on me. Nobody. I’m a wall. I’m an angry wall.','angry');
 hold('alex',null);
 let goals=0;
 for(let i=0;i<4&&goals<3;i++){
  const r=await meter('Cross it to Alex ('+goals+'/3 goals)',{speed:1.1+i*.1});
  const b=prop({t:'ball',x:A.you.x,y:A.you.y-4});
  await tw(b,{x:A.alex.x,y:A.alex.y-24},300);
  pose('alex','kick');SFX.thud();
  if(r){await tw(b,{x:286,y:A.jacob.y-14},250,'in');b.hide=1;goals++;SFX.cheer();A.jacob.shake=1;
   await say('alex',['GET IN!','TWO! Left foot! WEAPON!','HAT-TRICK! HAT-TRICK! HAAAAT-TRICK!'][goals-1],'happy');
   A.jacob.shake=0;await say('jacob',['That doesn’t count.','STOP. SCORING.','…'][goals-1],'angry')}
  else{await tw(b,{x:A.jacob.x,y:A.jacob.y-14},250,'in');b.hide=1;pose('jacob','hold');await say('jacob',pick(['MINE.','Not today.','Wall. Angry wall.']),'angry');pose('jacob',null)}
  pose('alex',null);
 }
 if(goals<3){await say('alex','I’m retiring.','sad');await say('omer','You said that yesterday.');await say('alex','There was no yesterday. It’s always today.','sad');return}
 ex('jacob','yell');A.jacob.shake=1;
 await say('jacob','EVERYONE. KEEPS. SCORING. ON. ME.','yell');
 const b=prop({t:'ball',x:A.jacob.x,y:A.jacob.y-6});pose('jacob','kick');SFX.thud();shake(.8);
 await tw(b,{x:A.nivaan.x,y:A.nivaan.y-26},250);b.hide=1;SFX.glass();pose('nivaan',null);
 await say('nivaan','MY STREAM. MY PHONE. MY LIFE.','cry');
 A.jacob.shake=0;
 await say('jacob','…Sorry. I’m sorry. I’m angry. I’m going to stop being angry. Starting… now.','sad');
 await N('Nobody laughs. Not even a little. Omer nods slowly, like Jacob has said something wise.');
 await say('omer','Fair.');
 await complete('alex');
}});

/* =================================================================
   TEXTURE — Dheva
   ================================================================= */
mission('dheva',{name:'Texture',icon:'💇',who:['dheva'],
 blurb:'Dheva’s texture powder is gone. His hair is just… hair now. Lying there. Giving up.',
 parts:['Before school: hair emergency','Break: get the powder back off Arjun','Lunch: give it back'],
 tips:['Before school, the toilets.','Break, main corridor. Arjun.','Lunch, maths room. Dheva’s hiding in there.'],
 doneTip:'Dheva gives you his emergency powder now. It burns if it gets in someone’s eyes.'});

hook({mis:'dheva',period:0,room:'toilets',who:'dheva',label:'Ask Dheva what’s wrong',cond:()=>!D.f.dheva1,run:async()=>{
 scene('toilets',{dheva:[70,1,{pose:'cover',y:146,hs:'limp'}],you:[120,-1,{y:154}]});
 await say('dheva','Don’t look at me.','cry');
 await say('dheva','My powder’s gone. It’s just HAIR now. It’s got no texture. It’s just lying there like it’s given up on life.','cry');
 pose('dheva',null);
 await N('It’s true. His hair is flat. It looks like a normal person’s hair. It’s horrifying.');
 await say('dheva','Arjun sat behind me on the bus. He was laughing at nothing. Arjun never laughs at nothing. He laughs at SOMETHING.','angry');
 intel('arjunPowder');
 D.f.dheva1=1;part('dheva',1);
}});

hook({mis:'dheva',period:2,room:'corridor',who:'arjun',label:'Get Dheva’s powder off Arjun',cond:()=>D.f.dheva1&&!has('powder')&&!D.f.dhevaFixed,run:async()=>{
 scene('corridor',{arjun:[60,1,{pose:'cross',y:146,hold:'powder'}],nivaan:[120,-1,{pose:'phone',y:146}],aidan:[215,1,{y:140}],you:[90,-1,{y:154}]});
 await say('arjun','This? It’s Dheva’s personality. In a tin.','smirk');
 await say('arjun','Without it he’s just a tall disappointment with a nice jawline. His dad told him that. I just remembered it.','smirk');
 hold('arjun',null);
 await arjunGives('powder','Tell Dheva his hair looked better flat. Like his future.');
 part('dheva',2);
}});

hook({mis:'dheva',period:4,room:'maths',who:'dheva',label:'Give Dheva his powder back',cond:()=>has('powder')&&!D.f.dhevaFixed,run:async()=>{
 scene('maths',{dheva:[160,1,{y:146,hs:'limp'}],marcus:[200,-1,{y:146}],you:[120,1,{y:150}]});
 take('powder');hold('dheva','powder');
 await say('dheva','You… you got it. You actually…','cry');
 pose('dheva','reach');await wait(500);SFX.sweet();A.dheva.hs=null;D.f.dhevaFixed=1;
 for(let i=0;i<10;i++)parts.push({x:A.dheva.x+rand(-6,6),y:A.dheva.y-34,vx:rand(-10,10),vy:rand(-20,0),c:'#f0f0f0',s:1,fy:A.dheva.y,life:.8});
 pose('dheva',null);hold('dheva',null);ex('dheva','happy');
 await say('dheva','Matte. Finish.','happy');
 await say('marcus','Oh, that’s textured. That’s properly textured. I want to touch it.','smirk');
 await say('dheva','Nobody touches it.','angry');
 await say('dheva','Here. My emergency tin. Never leave home without it. If you get it in someone’s eyes it BURNS. I’d know.','happy');
 give('spare');D.f.dhevaFixed=1;
 await complete('dheva');
 return 'stay';
}});

/* =================================================================
   GOOD MORNING, HIGHGATE — Marcus on the PA
   ================================================================= */
mission('marcus',{name:'Good Morning, Highgate',icon:'🎙️',who:['marcus'],
 blurb:'Marcus has talked his way into doing the morning announcements. Ms. Sherman has not been told.',
 parts:['Before school: keep the door shut until he’s finished'],tips:['Before school, bus loop. Marcus is heading inside.']});

hook({mis:'marcus',period:0,room:'bus',who:'marcus',label:'Ask Marcus where he’s going',run:async()=>{
 scene('bus',{marcus:[196,1,{y:146}],you:[176,1,{y:154}],sherman:[260,-1,{pose:'hips',y:150}]});
 await say('marcus','Morning announcements. I volunteered. Nobody stopped me. That’s basically consent from the school.','smirk');
 await say('marcus','Hold the door for me? It’s going to get… intense.','smirk');
 scene('office',{marcus:[158,1,{y:146,pose:'mic'}],you:[30,1,{y:154}]});
 SFX.static();
 await say('marcus','(on the PA) Good morning, Highgate. This is Marcus with your morning announcements.','smirk');
 await say('marcus','Today’s lunch is sausages. Big ones. Served firm. Please handle with care.','smirk');
 await say('marcus','Ms. Shermian would like whoever’s been touching her stapler to stop. Or to keep going, but gentler.','smirk');
 await say('marcus','Netball is cancelled because all the balls are flat. Kenneth, we’re so sorry for your loss.','smirk');
 SFX.door();shake(.5);
 await say('sherman','(outside, getting closer at a speed that shouldn’t be possible) MARCUS!','yell');
 pose('you','hold');
 const ok=await mash('Hold the door shut!',{need:22,time:5.5,info:'She’s ninety-one and strong as a horse. MASH!',onHit(){SFX.door()}});
 if(!ok){
  SFX.door();shake(1);put('sherman',20,1,{y:150});A.you.x=60;pose('you',null);
  await say('sherman','You. Little. HELPER.','evil');
  hold('sherman','mic');pose('sherman','choke');await wait(300);
  for(let i=0;i<4;i++){SFX.crunch();shake(.4);await wait(250)}
  A.you.ex='dead';kill('you','lie',{pool:6,bleed:0,spray:2});
  await N('She uses the microphone cable. She ties a very good knot. Forty-one years of practice.');
  await say('sherman','(into the mic, to the whole school) That’s the end of the announcements.','evil');
  await die('pa');
 }
 await say('marcus','And finally. Ms. Sherman would like everyone to know she is ninety-one years young and still single.','smirk');
 await say('marcus','That’s what she said. Have a great Friday, Highgate.','happy');
 SFX.door();shake(1);put('sherman',20,1,{y:150});pose('you',null);A.you.x=60;
 await say('sherman','MARCUS!','evil');
 await walk('marcus',300,120);SFX.glass();A.marcus.vis=false;
 await N('Marcus goes out of the window. It’s the first floor. You hear him land in a hedge, and then you hear him laugh.');
 await say('marcus','(from the hedge) WORTH IT.','happy');
 await complete('marcus');
}});

/* =================================================================
   ROYAL RUMBLE — Paul
   ================================================================= */
mission('paul',{name:'Royal Rumble',icon:'🤼',who:['paul','kenneth','alex'],
 blurb:'Paul loves wrestling people. Paul especially loves wrestling people who didn’t agree to it.',
 parts:['Lunch: last one on the mats'],tips:['Lunch, sports hall. Paul’s doing a rumble. Mash.']});

hook({mis:'paul',period:4,room:'gym',who:'paul',label:'Enter Paul’s Royal Rumble',run:async()=>{
 scene('gym',{paul:[200,-1,{pose:'hips',y:144}],kenneth:[150,1,{y:146}],alex:[250,-1,{y:146}],you:[120,1,{y:152}]});
 cue('fight');
 await say('paul','ROYAL. RUMBLE. Last one on the mats wins. I’ve already won. This is a formality.','happy');
 await say('kenneth','I’m not in this. I’m watching. I’m— why are you looking at me—','scared');
 await walk('you',140,80);pose('you','grab');
 const a=await mash('Throw Kenneth off the mats!',{need:14,time:4.5});
 pose('you',null);
 if(a){await tw(A.kenneth,{x:40},300);A.kenneth.pose='lie';SFX.thud();await say('kenneth','(from the floor) I’m fine. I’m retired now.','hurt')}
 else{await say('kenneth','HA! I am a SURVIVOR—');await walk('paul',160,90);await tw(A.kenneth,{x:40},300);A.kenneth.pose='lie';SFX.thud();await say('paul','No, you’re not.')}
 await walk('alex',200,60);
 await say('alex','Sorry about this. I play sports.','smirk');
 await walk('paul',214,60);pose('paul','grab');await hop('alex',14,300);A.alex.pose='lie';SFX.thud();pose('paul',null);
 face('paul',-1);await say('paul','Just you and me. I love you. I’m going to put you through the floor.','happy');
 await walk('paul',160,60);pose('paul','grab');pose('you','grab');
 const b=await mash('Survive Paul!',{need:26,time:6,decay:2.6,info:'His arms are so long. MASH!'});
 pose('you',null);pose('paul',null);
 if(!b){
  await hop('you',22,400);A.you.pose='lie';SFX.crunch();shake(1.4);
  await say('paul','Sorry. SORRY. Instinct.','shock');
  A.you.ex='dead';kill('you','lie',{pool:14,bleed:1,spray:6});
  await N('Paul piledrives you on to the sports hall floor. It isn’t a mat. It’s never been a mat.');
  await die('rumble');
 }
 await hop('paul',10,400);A.paul.pose='lie';A.paul.dir=1;SFX.thud();shake(1);
 await say('paul','(from the floor, crying happy tears) I let you win. I didn’t. You won. I’m so PROUD of you.','cry');
 await N('He gets up, picks you up like a toddler, and carries you round the sports hall twice.');
 await complete('paul');
}});

/* =================================================================
   BUZZER BEATER — Kenneth
   ================================================================= */
mission('kenneth',{name:'Buzzer Beater',icon:'🏀',who:['kenneth','alex','paul'],
 blurb:'Kenneth is five foot seven of pure confidence. He says nobody has ever beaten him one-on-one. That isn’t true. Nobody’s been allowed to say so.',
 parts:['Break: beat Kenneth one-on-one'],tips:['Break, sports hall.']});

hook({mis:'kenneth',period:2,room:'gym',who:'kenneth',label:'Play Kenneth one-on-one',run:async()=>{
 scene('gym',{kenneth:[220,-1,{pose:'dribble',y:146}],paul:[150,1,{y:144,pose:'hips'}],alex:[120,1,{y:146}],you:[190,1,{y:152}]});
 await say('kenneth','One-on-one? Me? Five foot seven of buzzer-beater? Your funeral. Literally. I’ve got a guy.','smirk');
 await say('paul','Kenneth has never lost. That’s not true, but if you say it he cries.');
 pose('kenneth',null);
 let pts=0;
 for(let i=0;i<3;i++){
  const r=await meter(['Drive past him','Step-back three','The buzzer-beater'][i],{speed:1.1+i*.15,zone:.24-i*.03});
  if(r){pts++;SFX.ding();await say(['alex','paul','alex'][i],['Ooooh!','He’s COOKING him!','BUZZER BEATER!'][i],'happy')}
  else{SFX.bounce();await say('kenneth',['Too slow. Like your dad.','Brick. Like your house.','HA! And the crowd goes mild!'][i],'smirk')}
 }
 if(pts<2){await say('kenneth','Five foot seven of undefeated. Tell your friends. Tell your FAMILY.','smirk');return}
 ex('kenneth','shock');
 await say('kenneth','…I let you win.','shock');
 await say('alex','He didn’t let you win.');
 await say('kenneth','(crying a little) I’m going to need a minute.','cry');
 await N('He takes eleven minutes. Paul hugs him the whole time.');
 await complete('kenneth');
}});

/* =================================================================
   PUSHED — Jacob
   ================================================================= */
mission('jacob',{name:'Pushed',icon:'😤',who:['jacob','hasan'],
 blurb:'Everybody pushes Jacob around. Physically. Constantly. Nobody makes fun of him, though. Nobody would dare.',
 parts:['Lunch: the canteen'],tips:['Lunch, canteen. Sit with Jacob.'],
 variants:{rage:'The vending machine',calm:'Breathe'}});

hook({mis:'jacob',period:4,room:'canteen',who:'jacob',label:'Sit with Jacob',cond:()=>!D.dead.arjun,run:async()=>{
 scene('canteen',{pat:[90,1,{y:140}],shermian:[140,1,{pose:'cross',y:140}],hasan:[176,1,{y:146}],arjun:[204,-1,{pose:'cross',y:146}],jacob:[240,-1,{pose:'carry',y:150,hold:'tray'}],kid4:[290,-1,{y:146}],you:[268,-1,{y:156}]});
 await say('jacob','Sit. Sit with me. Everyone else just pushes past.','sad');
 await walk('kid4',250,90);await tw(A.jacob,{x:A.jacob.x-6},100);SFX.thud();
 await say('kid4','Move, mate.');
 await walk('kid4',340,90);remove('kid4');
 face('arjun',-1);
 await say('arjun','Hasan, your dad works nights so he doesn’t have to look at you. I’ve done the maths.','smirk');
 ex('hasan','sad');
 face('arjun',1);await walk('arjun',230,60);SFX.thud();await tw(A.jacob,{x:A.jacob.x+4},100);
 hold('jacob',null);const t=prop({t:'tray',x:A.jacob.x,y:A.jacob.y-24});await tw(t,{y:A.jacob.y},250,'in');SFX.glass();
 A.jacob.bloody=1;
 await N('Arjun’s elbow tips Jacob’s tray straight down his front. Gravy. Peas. A yoghurt, somehow upside down.');
 A.jacob.shake=1;ex('jacob','angry');
 await say('jacob','Everyone. Keeps. PUSHING. ME.','yell');
 await N('Nobody laughs. The whole canteen goes still. You don’t laugh at Jacob. Nobody’s ever even tried.');
 await say('arjun','Nobody’s laughing, Jacob. Seriously. Nobody would EVER.','scared');
 const c=await choose(['Let him go.','Calm him down.','Push him back.']);
 if(c===2){
  await say('you','Mate, it’s just peas—');pose('you','grab');SFX.thud();
  await N('You push Jacob. Everybody pushes Jacob. You are the first person who has ever done it while he was already angry.');
  pose('jacob','hold');await hop('you',20,350);
  SFX.glass();shake(1.4);A.you.x=300;A.you.y=126;A.you.hurt=3;blood(300,110,50,1,100,150);
  kill('you','lie',{pool:24});
  await N('He throws you through the vending machine. The machine survives. It drops a Twix, out of respect.');
  await die('jacob');
 }
 if(c===0){
  pose('jacob','hold');A.jacob.shake=0;
  await walk('jacob',A.arjun.x+12,90);
  await hop('arjun',22,500);await tw(A.arjun,{x:290,y:126},300);SFX.glass();shake(1.4);
  A.arjun.hurt=3;A.arjun.pose='lie';blood(290,110,40,1,80,146);
  await N('Jacob picks Arjun up with one hand and throws him through the front of the vending machine.');
  await say('arjun','(from inside the machine, among the crisps) …that’s fair. That one’s fair.','hurt');
  await evil('shermian');
  await say('shermian','JACOB!','evil');
  await sweet('shermian','canteen');
  await say('shermian','…Lovely throw, sweetie. Lovely follow-through.','happy');
  ex('jacob','happy');
  await say('jacob','I feel so much better. I feel like a cloud.','happy');
  await complete('jacob','rage');return;
 }
 await say('you','Jacob. Breathe. In for four.');
 await say('jacob','(breathing in for four, shaking)','angry');
 await say('hasan','Look at me. LOOK at my head. It’s shaped like a gear-stick. People laugh at THIS every day. Nobody laughs at YOU. Not once.','happy');
 A.jacob.shake=0;ex('jacob','laugh');
 await say('jacob','(snorting) …It really is shaped like a gear-stick.','laugh');
 await say('hasan','See? You’re fine. You’ve got gravy on you, but you’re fine.','happy');
 await complete('jacob','calm');
}});

/* =================================================================
   THE CALLING — the finale
   ================================================================= */
mission('calling',{name:'The Calling',icon:'🔔',who:['aidan'],hidden:1,lockText:'Something is wrong with Friday. Something is wrong with Aidan. Keep living the day.',
 blurb:'Every Friday is the same Friday. Aidan knows. Aidan has always known.',
 parts:['Learn why Friday keeps happening','Home time: talk to Aidan'],
 tips:['Aidan wrote a poem about it. Mr. Voss keeps jars about it.','Home time, bus loop. Ask him. Bring your friends.']});

hook({mis:'calling',period:7,room:'bus',who:'aidan',label:'…Aidan?',cond:()=>D.f.aidanDead,run:async()=>{
 const a=A.aidan;
 cue('dead');fxState.dark=.3;
 await say('aidan','You put me in the locker.','evil');
 await say('aidan','The locker is very cold. Come and see.','evil');
 scene('corridor',{aidan:[86,1,{y:140,hurt:3,bloody:1,ex:'evil'}],you:[120,-1,{y:150}]});
 fxState.dark=.55;SFX.locker();
 await N('You don’t remember walking back inside. The corridor is empty. All the lights are off except one.');
 await say('you','Aidan, I— we didn’t—');
 pose('aidan','grab');await walk('aidan',108,30);A.you.ex='scared';
 await N('Locker 217 is open. There’s no back to it. It goes down a long way, and at the bottom, somebody is calling your name in your mum’s voice.');
 await tw(A.you,{x:86},500);A.you.vis=false;SFX.locker();shake(1);
 fxState.dark=1;
 await N('Next Friday, at 8:25, the 43 pulls in. Everyone gets off. Hasan is laughing at something you know he’s about to say.');
 await N('Nobody notices you’re not on it. Locker 217 is very cold.');
 return ending('calling');
}});

hook({mis:'calling',period:7,room:'bus',who:'aidan',label:'Ask Aidan about Fridays',cond:()=>!D.f.aidanDead&&P.intel.aidanPoem&&P.intel.aidanJars,run:async()=>{
 part('calling',1,true);
 const present=['hasan','arjun','david','omer','nivaan','corey','sean','stella','abby','paul','kenneth','jacob','alex','dheva','marcus','angelo'].filter(n=>!D.dead[n]);
 const cast={aidan:[180,-1,{y:146}],you:[150,1,{y:154}]};
 present.slice(0,12).forEach((n,i)=>cast[n]=[i<6?16+i*20:210+(i-6)*18,i<6?1:-1,{y:140+(i%3)*4}]);
 scene('bus',cast);cue('finale');
 await say('you','Aidan. Your poem. “Every Friday is the same Friday.” And Voss has jars. Fourteen jars with your name on them.');
 await say('aidan','Fourteen Fridays I didn’t make it to Monday. That’s just the ones he kept.','sad');
 await say('aidan','Every Friday you lot do something to me. So I keep the Friday. I keep it and keep it until somebody gets it right.','evil');
 fxState.red=.6;SFX.static();
 if(A.hasan)await say('hasan','What’s he on about? What’s “keep the Friday”? Is that a TikTok thing?','shock');
 if(A.arjun)await say('arjun','He’s lost it. Finally. I called this in Year 7. I have it in writing.','smirk');
 await say('aidan','They don’t remember. Only you. You’re the only one who’s ever noticed.','sad');
 if(P.intel.ollie)await say('aidan','Well. You and Ollie. He was the first. He told you, didn’t he. He told you it was lonely.','sad');
 fxState.red=0;
 const can=D.f.aidanIncluded&&!D.f.bullied;
 const c=await choose([{t:'“Sit with us on Monday.”',dis:!can,why:D.f.bullied?'not after what you did to him today':'he’s never been part of the group. Not once.',tag:'🤝'},{t:'“Omer. Do it.”',tag:'🔒'},{t:'“Then keep it. I’ll stay.”',tag:'🔁'}],'Everyone is looking at you.');
 if(c===0){
  await say('you','Sit with us on Monday. At lunch. Same table. Every Monday.');
  await say('aidan','…You don’t mean that. Nobody means that.','sad');
  if(A.omer)await say('omer','He means it. I mean it. Shorts on Monday too. Shorts in solidarity.','happy');
  if(A.david)await say('david','You wrote the best bit of our presentation. You’re in. It’s in the minutes.','happy');
  if(A.arjun){await say('arjun','…','smirk');await say('arjun','Fine. FINE. But I’m sitting opposite him so I can see the fringe coming.','smirk')}
  for(const n of Object.keys(A))if(n!=='aidan'&&n!=='you'&&FRIENDS.includes(n)){walk(n,clamp(A.aidan.x+(A[n].x<180?-30:30)+rand(-14,14),10,310),60)}
  ex('aidan','cry');cue('romance');fxState.romance=.4;
  await say('aidan','(crying, laughing, not sure which) Okay. Okay. Monday.','cry');
  await wait(800);
  return ending('monday');
 }
 if(c===1){
  if(!A.omer)put('omer',100,1,{y:150});
  await walk('omer',160,60);ex('omer','angry');
  await say('omer','I’ve been waiting all day for someone to say that.','angry');
  cue('fight');crowd={n:12,cheer:true,phones:true,front:5,gap:[120,240]};
  await say('aidan','Again? You want to do it AGAIN?','evil');
  await hit('omer','aidan',{pose:'headbutt',sfx:SFX.crunch,blood:16});
  for(const n of['paul','jacob','hasan','arjun'])if(A[n]){await walk(n,A.aidan.x+(A[n].x<A.aidan.x?-12:12),140);await hit(n,'aidan',{blood:10,push:0,ms:200})}
  await hit('omer','aidan',{blood:20,push:0});
  kill('aidan','crush',{pool:40,bleed:4});
  crowd.cheer=false;cue('dead');
  await say('aidan','(from the kerb, almost gone) …Monday… then.','dead');
  return ending('locker');
 }
 await say('you','Then keep it. I like Friday. I like them, on Friday.');
 await say('aidan','…You’d stay? With me? In the same day?','shock');
 await say('you','It’s not a bad day. It’s a terrible day. But it’s ours.');
 ex('aidan','happy');
 return ending('forever');
}});

async function ending(id){
 const e=ENDINGS[id];P.endings[id]=(P.endings[id]||0)+1;P.done.calling=P.done.calling||1;P.parts.calling=2;P.cur=null;save();
 if(id==='monday'){
  scene('bus',{hasan:[60,1,{y:146}],arjun:[84,1,{y:144,pose:'cross'}],omer:[108,1,{y:150}],david:[132,1,{y:144}],nivaan:[150,1,{y:148,pose:'film'}],corey:[170,1,{y:146}],abby:[188,-1,{y:146}],sean:[206,1,{y:146}],stella:[222,-1,{y:148}],aidan:[246,-1,{y:144}],you:[270,-1,{y:154}]});
  fxState.dark=1;await tw(fxState,{dark:0},1200);
  await card('MONDAY','8:25 AM',2200);
  await say('hasan','It’s… Monday? It feels like it hasn’t been Monday in about a year.','shock');
  await say('you','It’s Monday.');
  await say('aidan','Same table?','happy');
  await say('omer','Same table.','happy');
  await say('arjun','Your fringe still looks like your mum did it with her eyes shut.','smirk');
  await say('aidan','She did.','laugh');
  await say('arjun','…Respect.','smirk');
 }else if(id==='locker'){
  scene('corridor',{you:[120,1,{y:154}],arjun:[200,-1,{y:146,pose:'cross'}],hasan:[230,-1,{y:146}]});
  await card('MONDAY','IT CAME. IT ISN’T RIGHT.',2400,'death');
  await N('Monday comes. Then Tuesday. The loop is gone. So is Aidan.');
  await N('Nobody mentions him. Not once. His name isn’t on the register. His seat in English is just a seat.');
  await say('arjun','Did we… have a mate called Aidan? I feel like I used to be horrible to someone called Aidan.','shock');
  await say('hasan','You’re horrible to everyone.','smirk');
  await N('Locker 217 is always cold. You never walk past it. You always walk past it.');
 }else if(id==='forever'){
  fxState.dark=0;
  await card('FRIDAY','FOREVER',2200);
  await N('You get on the 43 with everyone. Hasan laughs at the thing he always laughs at. You laugh first, this time.');
  await N('Tomorrow is Friday. Tomorrow is always Friday. Aidan sits next to you on the bus, every single morning, and says “again?” and you say “again.”');
 }
 await card(e.name.toUpperCase(),'ENDING '+(Object.keys(ENDINGS).indexOf(id)+1)+' OF '+Object.keys(ENDINGS).length,2600,id==='locker'||id==='calling'?'death':'love');
 await curtainCall(id);
 return 'ended';
}

ENDINGS.monday={name:'Monday',desc:'You let Aidan in. The day finally ended.',hint:'Include Aidan in the group. Don’t lay a finger on him all day. Then ask him at home time.'};
ENDINGS.locker={name:'Locker 217',desc:'The group finished him at the bus loop. Monday came. It isn’t right.',hint:'At the very end, tell Omer to do it.'};
ENDINGS.forever={name:'Friday Forever',desc:'You chose to stay in the day with your friends.',hint:'At the very end, choose to keep the Friday.'};
ENDINGS.calling={name:'The Calling',desc:'You killed him and went to him anyway. Locker 217 has no back.',hint:'Talk to Aidan at home time on a day he died.'};

/* =================================================================
   COLLECTIBLES
   ================================================================= */
function coll(id,o){COLL[id]=o;if(!o.room)return;spot({room:o.room,period:o.period,x:o.x,y:o.y||146,sparkle:1,label:'Look at the sparkly thing',short:'?',cond:()=>!P.coll[id]&&(!o.cond||o.cond()),run:async()=>{SFX.pick();await N(o.name+'. '+o.desc);P.coll[id]=1;save();toast('Collectible '+Object.keys(P.coll).length+'/'+Object.keys(COLL).length+': '+o.name);return 'stay'}})}
coll('ticket',{room:'bus',period:0,x:300,y:156,name:'A bus 43 ticket',desc:'Punched so many times it’s mostly hole. Every punch is dated Friday.',hint:'Before school, by the road.'});
coll('prices',{room:'corridor',period:0,x:96,y:150,name:'Angelo’s price list',desc:'“FAKE NOTE £3. REAL NOTE £5. ESSAY £10. ALIBI £20. ARJUN’S DIARY: PRICELESS.”',hint:'Before school, near locker 13.'});
coll('notebook',{room:'toilets',x:260,y:150,name:'Marcus’s notebook (DO NOT OPEN)',desc:'You open it. It’s three hundred pages of extremely good poems about bread. You close it. You respect him more and less.',hint:'The toilets. Any time.'});
coll('nugget',{room:'canteen',period:2,x:40,y:150,name:'A mystery nugget',desc:'It moved. You definitely saw it move. You put it in your pocket anyway.',hint:'Canteen, at break.'});
coll('tooth',{room:'field',period:4,x:30,y:160,name:'A tooth (not yours)',desc:'Adult molar. Coach’s javelin target is right next to it. You don’t think about it.',hint:'The field, at lunch, far left.'});
coll('trainer',{room:'gym',period:2,x:290,y:150,name:'Gary Pritchard’s left trainer',desc:'Still laced. Still warm. Nobody’s seen the rest of Gary since the beep test.',hint:'Sports hall, at break, under the hoop.'});
coll('overdue',{room:'library',period:[1,3,6],x:40,y:150,name:'An overdue book',desc:'“Due back: 14th March 1987.” The fine is £11,402. Ms. Sherman signed it out.',hint:'Library, during a lesson you’re bunking.'});
coll('collar',{room:'maths',period:4,x:30,y:150,name:'Mr. Biscuits’ collar',desc:'The little bell is still on it. The tag says “If found, I will find YOU.”',hint:'Maths room, at lunch.'});
coll('kevin',{room:'chem',period:4,x:140,y:150,name:'A jar labelled KEVIN',desc:'It’s just teeth. Lots of teeth. Some of them are baby teeth.',hint:'Chem lab, at lunch.'});
coll('combo',{room:'corridor',period:4,x:72,y:150,cond:()=>!D.f.fight,name:'Locker 217’s combination',desc:'Written on a Post-it in Aidan’s handwriting: “0-4-1-7. It’s always Friday.”',hint:'Main corridor at lunch, on a quiet day.'});
coll('dentures',{name:'Ms. Sherman’s dentures',desc:'Still clacking. Recovered from the edge of the pit.',hint:'Get back at Ms. Sherman.'});
coll('flower',{room:'bus',period:7,x:22,y:156,name:'Corey’s purple flower',desc:'It’s growing out of a crack in the kerb. Corey pretends he’s never seen it before. He waters it every day.',hint:'Home time, bus loop, by the kerb.'});

/* =================================================================
   DEATHS
   ================================================================= */
Object.assign(DEATHS,{
 redpen:{name:'Red Pen',desc:'Ms. Balduf corrected your grammar. Through your eye.',hint:'Say something ungrammatical in English.'},
 fminus:{name:'F-Minus',desc:'Ms. Balduf wrote your grade on your forehead. Then through it.',hint:'Mess up the group project completely.'},
 seat:{name:'Assigned Seating',desc:'Ms. Shermian found you somewhere you weren’t meant to be.',hint:'Get on the wrong side of Ms. Shermian’s seating plan.'},
 ring:{name:'Ringside',desc:'You got in the ring. Aidan doesn’t fight fair. Aidan doesn’t fight human.',hint:'Join the fight at the lockers yourself.'},
 pit:{name:'The Rug',desc:'Ms. Sherman’s pit is an old coal chute. You aren’t the first kid down it.',hint:'Stand on the wrong side of a red button.'},
 mug:{name:'Earl Grey',desc:'You drank from Ms. Loach’s mug. She keeps the big scissors in the top drawer.',hint:'Drink something that isn’t yours.'},
 beep:{name:'Cut',desc:'You dropped out of the beep test. Coach cut you. From everything.',hint:'Miss too many beeps.'},
 vat:{name:'Volunteer',desc:'Mr. Voss needed collagen. You had collagen.',hint:'Get caught by Mr. Voss.'},
 cleaver:{name:'No Seconds',desc:'Dinner Lady Pat has one good eye and one good arm.',hint:'Steal from Pat where she can see you.'},
 pa:{name:'Off Air',desc:'Ms. Sherman ended the announcements. And you.',hint:'Let Ms. Sherman through the door.'},
 rumble:{name:'Piledriver',desc:'Paul said sorry. Paul meant it.',hint:'Lose Paul’s rumble.'},
 jacob:{name:'Collateral',desc:'You pushed Jacob. Nobody pushes Jacob when he’s already angry.',hint:'Push the wrong person at the wrong time.'},
 javelin:{name:'Running Target',desc:'Double points.',hint:'Run onto the field at 12:40.'}
});

/* misc spots: the bus home */
spot({room:'bus',period:7,x:150,y:150,label:'Get on the 43 home',short:'BUS',run:async()=>{await boardBus();return 'ended'}});
