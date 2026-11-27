'use strict';
/* =====================================================================
   HIGHSCHOOL — FAIR CITY, AFTER DARK
   After school, kids rob the mall. Every day there’s a decent chance
   something is getting stolen somewhere, and you can join in, stop it,
   or get Big Glen. Kayden has a bigger plan.
   ===================================================================== */
K.noodle={n:'Noodle Box Guy',col:'#c04040',skin:'#e8c8a0',hair:'#1a1a1a',hs:'short',top:'#f4f0e6',pants:'#2a2a33',apron:1,adult:1,seed:181,v:240};K.noodle.id='noodle';
{const _dp=drawProp;drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='till'){R(x-8,y-10,16,10,'#3a3a42');R(x-6,y-14,12,4,'#2a2a30');R(x-5,y-13,10,2,'#60e080');if(p.open){R(x-8,y,16,3,'#5a5a62');for(let i=0;i<4;i++)R(x-6+i*4,y,3,2,'#6ab060')}return}
 if(p.t==='claw'){R(x-14,y-46,28,46,'#c03050');R(x-11,y-42,22,26,'#9ac8e8');if(p.smashed){g.globalAlpha=.6;R(x-11,y-42,22,26,'#e8f4fa');g.globalAlpha=1;for(let i=0;i<6;i++)R(x-10+i*4,y-30+(i%3)*4,2,2,'#c8e0f0')}for(let i=0;i<5;i++)R(x-9+i*4,y-22,3,4,['#e0c040','#60a0e0','#e06080'][i%3]);R(x-14,y-14,28,14,'#a02040');return}
 if(p.t==='kiosk'){R(x-22,y-30,44,30,'#e8d8f0');R(x-22,y-36,44,6,'#c050a0');pxc('SPARKLE HUT',x,y-35,'#fff');for(let i=0;i<6;i++){R(x-18+i*7,y-24,4,4,'#f0d070');R(x-17+i*7,y-23,2,2,'#fff8c0')}return}
 if(p.t==='mask'){let x=Math.round(p.x),y=Math.round(p.y);if(p.follow){const f=A[p.follow];if(!f||!f.vis||f.dead)return;x=Math.round(f.x);y=Math.round(f.y+(p.dy||0))}R(x-3,y-4,6,5,'#1a1a1a');R(x-2,y-3,1,1,'#e8c8a0');R(x+1,y-3,1,1,'#e8c8a0');return}
 return _dp(p)}}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='bag'){R(x-3,y-1,7,7,'#2a2a2a');R(x-1,y-3,3,2,'#2a2a2a');R(x-1,y+1,3,2,'#6ab060');return}
 if(it==='hammer'){R(x,y-8,1,10,'#8a6a4a');R(x-2,y-9,5,3,'#7a7a82');return}
 if(it==='necklace'){R(x-2,y-2,5,1,'#f0d070');R(x,y-1,1,2,'#c0f0ff');return}
 return _dh(it,x,y,d)}}

/* ---------- something’s getting robbed ---------- */
function robRoll(room){D.f.robRoll=D.f.robRoll||{};const k=cal()+room;if(D.f.robRoll[k]==null)D.f.robRoll[k]=Math.random()<.45?1:0;return D.f.robRoll[k]===1}
hook({mis:'robbery',period:8,room:'foodcourt',who:'auto',cond:()=>robRoll('foodcourt')&&!D.f['rob_fc'+cal()],run:async()=>{
 D.f['rob_fc'+cal()]=1;
 const cast={you:[60,1,{y:156}],noodle:[200,-1,{y:140,pose:'hips'}],kid1:[170,1,{y:150,hold:'knife'}],kid3:[150,1,{y:150,hold:'bag'}]};
 scene('foodcourt',cast,true);const till=pprop({t:'till',x:212,y:134,layer:-5});cue('tension');
 await N('Noodle Box. Two kids with T-shirts pulled up over their noses. One of them has a butter knife from the food court. The other one is holding a bag open.');
 await say('kid1','(voice cracking) Empty the register, my guy. Fast. FAST.','angry');
 await say('noodle','(not moving) I know your mom, kid. I know your MOM.','angry');
 const c=await choose(['Help them grab the cash.','Stop them.','Yell for Big Glen.']);
 if(c===0){await walk('you',200,90);pose('you','grab');till.open=1;SFX.ding();D.money=(D.money||0)+6;updateLoc();D.f.robbedToday=1;
  await N('You reach over the counter and grab a fistful of the till. Six dollars and a coupon for free egg rolls.');
  await Promise.all([walk('kid1',-20,140),walk('kid3',-20,140),walk('you',-20,140)]);pose('you',null);
  await N('All three of you run out past the fountain. Behind you the Noodle Box guy is throwing egg rolls. He’s got a good arm.');}
 else if(c===1){await walk('you',A.kid1.x+10,90);await hit('you','kid1',{blood:4});hold('kid1',null);
  await say('kid1','(holding his nose) BRO. We’re on the SAME SIDE. We’re both kids.','hurt');
  await Promise.all([walk('kid1',-20,130),walk('kid3',-20,130)]);
  await say('noodle','(sliding you a free bowl of noodles) Hero. Little hero. Free noodles for life. Or for today. Today.','happy')}
 else{put('glen',334,-1,{y:150});await walk('glen',A.kid3.x+10,140);pose('glen','grab');SFX.splat();shake(1);
  await N('Big Glen comes out of nowhere and picks the kid with the bag up by the belt and throws him into the fountain. Coins everywhere. Teeth everywhere.');
  blood(A.kid3.x,A.kid3.y-20,20,null,60,A.kid3.y+2);await tw(A.kid3,{x:110,y:160},400);A.kid3.pose='lie';pose('glen',null);
  await walk('kid1',-20,150);await say('glen','(adjusting his hi-vis) Nobody robs Noodle Box on my watch. Nobody.','angry')}
 return 'stay';
}});
hook({mis:'robbery',period:8,room:'arcade',who:'auto',cond:()=>robRoll('arcade')&&!D.f['rob_ar'+cal()],run:async()=>{
 D.f['rob_ar'+cal()]=1;
 scene('arcade',{you:[60,1,{y:156}],kid2:[180,1,{y:150,hold:'hammer'}],kid4:[210,-1,{y:150}]},true);
 const cm=pprop({t:'claw',x:200,y:148,layer:-5});
 await N('Two kids are going at the claw machine with a hammer they definitely got from Mr. Oakes’s room.');
 pose('kid2','overhead');await wait(200);SFX.glass();shake(.8);cm.smashed=1;pose('kid2',null);
 await N('The glass comes in. Stuffed animals everywhere. A man in an Arcadia polo shirt starts running from very far away.');
 const c=await choose(['Grab a stuffed animal and run.','Help the polo-shirt man catch them.','Walk away. Not your claw machine.']);
 if(c===0){hold('you','flower');D.f.robbedToday=1;await walk('you',-20,140);await N('You got a one-eyed duck. It looks exactly like the one Sean won Stella. It might be its brother.');hold('you',null)}
 else if(c===1&&A.kid4){await walk('you',A.kid4.x+10,110);await hit('you','kid4',{blood:3});await N('You tackle one. The other gets away with a dinosaur under each arm. The polo-shirt man arrives out of breath and gives you one ticket.')}
 else await N('You walk away. Behind you there’s the sound of a second hammer.');
 return 'stay';
}});
hook({mis:'robbery',period:8,room:'carpark',who:'auto',cond:()=>robRoll('carpark')&&!D.f['rob_cp'+cal()]&&!(D.f.kim3&&!D.f.kim4),run:async()=>{
 D.f['rob_cp'+cal()]=1;
 scene('carpark',{you:[60,1,{y:156}],kid1:[190,1,{y:150,pose:'reach'}]},true);
 const car=pprop({t:'car',x:170,y:170,col:'#c8c8d0',layer:20});
 await N('A kid is halfway through a silver car’s window, pulling out the stereo. No alarm. That means it’s a teacher’s car. Teachers never set the alarm.');
 SFX.door();put('voss',334,-1,{y:150});await walk('voss',240,60);
 await say('voss','(very pleased) Oh! A young scientist! In my car! Inside my car is where I keep the good jars!','happy');
 A.kid1.ex='scared';
 const c=await choose(['Shout “RUN!”','Say nothing.']);
 if(c===0){await say('you','RUN!');A.kid1.pose=null;await walk('kid1',-20,170);await say('voss','(disappointed) Everyone always runs. Nobody ever stays for the jars.','sad')}
 else{await walk('voss',A.kid1.x+8,80);pose('voss','grab');await N('Mr. Voss helps the kid the rest of the way into the car. Then he gets in. Then he drives away, very slowly, waving at you.');
  await Promise.all([tw(car,{x:400},3000)]);remove('voss');if(A.kid1){A.kid1.vis=false;D.dead.kid1=1}}
 return 'stay';
}});
mission('robbery',{name:'Fair City After Dark',icon:'💸',who:['kayden'],goal:'Get through the mall robberies. Or join in.',hidden:1,
 blurb:'After school, kids rob the mall. Noodle Box, the arcade, the rooftop parking. You can join in, stop them, or get Big Glen.',
 parts:['A robbery'],tips:['After school, Fair City Mall.']});

/* ---------- THE BIG SCORE ---------- */
mission('bigscore',{name:'The Big Score',icon:'💎',who:['kayden','glen'],goal:'Help Kayden rob the Sparkle Hut. Or don’t.',
 blurb:'Kayden has a plan. The Sparkle Hut jewelry kiosk in the food court. Three masks, one necklace, and the Highgate Hittaz are going legit. Illegitimately.',
 parts:['The plan','The masks','The heist'],
 tips:['After school, Fair City Mall rooftop parking. Kayden has a plan.','Lost Property, Main Corridor (far left): three beanies with holes in.','After school, the Food Court: the Sparkle Hut.'],
 variants:{fake:'It was fake',tased:'Kayden got tased',bailed:'You bailed'}});
hook({mis:'bigscore',period:8,room:'carpark',who:'auto',cond:()=>cal()>=3&&!D.f.bs1&&!D.dead.kayden&&!(D.f.kim3&&!D.f.kim4),run:async()=>{
 scene('carpark',{you:[60,1,{y:156}],kayden:[150,-1,{y:150}],kid4:[180,-1,{y:146}]},true);
 await say('kayden','Yo. Yo. Come here. Business. The Sparkle Hut. Food court. That girl at the counter goes on break at 5:15 every day and leaves it open.','smirk');
 await say('kayden','There’s a necklace in there. Eight hundred dollars. EIGHT HUNDRED. The Hittaz go legit. We get a clubhouse. With a fridge.','happy');
 await say('kid4','(the other Hittaz member, very quietly) He’s been planning it for two years. He has a whiteboard.','scared');
 const c=await choose(['“I’m in.”','“That’s the dumbest thing I’ve ever heard. I’m in.”']);
 await say('kayden','Masks. We need masks. Lost Property at school. Beanies. Cut eye holes. Then we meet at the food court. After school.','smirk');
 D.f.bs1=1;part('bigscore',1);return 'stay';
}});
spot({room:'corridor',period:[0,1,2,3,4,5,6],x:24,y:140,label:'Take three beanies from Lost Property',short:'BEANIES',mis:'bigscore',cond:()=>D.f.bs1&&!D.f.bs2,run:async()=>{
 await walk('you',28,60);pose('you','reach');await wait(300);pose('you',null);
 await N('Three beanies from the Lost Property box. A red one, a Highgate one, and one that says WORLD’S BEST GRANDPA. You poke eye holes in them with a pencil.');
 D.f.bs2=1;part('bigscore',2);return 'stay';
}});
hook({mis:'bigscore',period:8,room:'foodcourt',who:'auto',cond:()=>D.f.bs2&&!D.done.bigscore&&!D.dead.kayden,run:async()=>{
 scene('foodcourt',{you:[60,1,{y:156}],kayden:[90,1,{y:150}],kid4:[110,1,{y:150}]},true);
 const k=pprop({t:'kiosk',x:220,y:146,layer:-5});cue('tension');
 for(const id of['you','kayden','kid4'])pprop({t:'mask',follow:id,dy:-25,layer:1});
 await N('5:15. The Sparkle Hut girl goes on break. The three of you pull the beanies down. Kayden got WORLD’S BEST GRANDPA. He doesn’t know.');
 await say('kayden','GO GO GO GO GO.','yell');
 await Promise.all([walk('kayden',210,140),walk('kid4',230,140),walk('you',200,140)]);
 pose('kayden','grab');hold('kayden','necklace');SFX.ding();
 await N('Kayden grabs the necklace off the stand. It’s still attached to the stand by a security cable. The stand comes too. The whole kiosk tips.');
 SFX.crunch();shake(1);
 put('glen',334,-1,{y:150});await walk('glen',270,150);
 await say('glen','HITTAZ.','yell');
 const c=await choose(['Run with the necklace.','Fight Big Glen.','Bail. Leave Kayden.']);
 if(c===0){hold('kayden',null);hold('you','necklace');await Promise.all([walk('you',-20,150),walk('kid4',-20,150)]);
  await N('You get out past the fountain with the necklace in your fist. Behind you, Kayden screams. Then a sound like a bug zapper.');
  await N('Outside, under the streetlight, you look at the necklace. On the back of the pendant, tiny: MADE IN CHINA $4.99. The Sparkle Hut had been fake the whole time.');
  hold('you',null);await complete('bigscore','fake');}
 else if(c===1){await walk('you',A.glen.x-10,110);await hit('you','glen',{blood:1});
  await N('You hit Big Glen. It’s like hitting a vending machine. He looks down at you with something like pity.');
  pose('glen','choke');await wait(400);SFX.crunch();A.you.hurt=3;
  const ok=await mash('Get out of his grip!',{need:20,time:4});
  if(!ok){await die('glen')}
  pose('glen',null);await N('You slip out of your hoodie and leave it in his hands like a lizard leaving its tail.');await walk('you',-20,160);await complete('bigscore','tased')}
 else{await walk('you',-20,150);SFX.zap&&SFX.zap();SFX.static();
  await N('Behind you: a crackle, a thump, and Kayden saying “ow” in a very high voice, over and over, in a beanie that says WORLD’S BEST GRANDPA.');
  await complete('bigscore','bailed')}
 return 'stay';
}});
DEATHS.glen=DEATHS.glen||{name:'Big Glen',desc:'You hit Big Glen. Big Glen hit back.',hint:'The Big Score. Don’t fight the mall cop.'};
