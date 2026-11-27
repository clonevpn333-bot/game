'use strict';
/* =====================================================================
   HIGHSCHOOL — BEEF. Omer vs Arjun, and the Staff Room.
   Plus a lot more mouth from everyone.
   ===================================================================== */

/* ---------- tighter triggers ---------- */
for(const h of HOOKS)if(h.mis==='catfish'&&h.period===8){const old=h.cond;h.cond=()=>D.f.jess2&&(!old||old())}

/* ---------- everyone’s mouth ---------- */
const MOUTH={
 hasan:['Arjun said my laugh sounds like a car that won’t start. Bro, his FACE sounds like a car that won’t start.','I’m not soft. I’m emotionally available. There’s a difference and it’s called therapy.','If Darren does another tumble turn at me I swear to God I’m going to say yes to something.'],
 arjun:['Hasan, you look like a thumb that got a haircut. Respectfully.','I don’t start beef. I just say true things really loud and beef happens to them.','Omer’s legs are so white they’ve got their own weather.','Tell Omer I said hi. Tell him from a distance. Like, a legal distance.'],
 omer:['Shorts are not a choice. Shorts are who I am. Snow is a skill issue.','Arjun’s got a big mouth for somebody with no chin.','I don’t get mad. I get even. Then I get a little bit mad.'],
 david:['As class president, I’d like to say: what the hell is wrong with this school.','I don’t swear. I legislate. (pause) This school is a shitshow.'],
 nivaan:['Chat said I look like a guy who apologizes to Roombas. I DO apologize to Roombas. They have feelings.','Got banned on stream for saying “hell”. Then I said it again, louder. Twelve new followers.'],
 corey:['My hair isn’t a personality. It’s a lifestyle. There’s a difference and it’s six products.','Arjun called my curls “a cry for help.” They ARE a cry for help. That’s not the point.'],
 sean:['My voice is cool. The rest of me is in beta.','Stella says I flirt like a golden retriever. I don’t know how to argue with that.'],
 kenneth:['Since the leak I’ve changed my password to something nobody will guess. It’s my dad’s name. Everyone knows my dad’s name. Damn it.','I’m small but I’m fast. Mostly away from things.'],
 paul:['I’m not violent. I’m affectionate at high speed.','Somebody told me to calm down once. I picked them up. They calmed down.'],
 marcus:['I don’t make it weird. It arrives weird. I just open the door.','Coach said “nice ball control” to Alex and I had to leave the gym. I had to LEAVE.','Everything is a double meaning if you’re brave enough.'],
 dheva:['Arjun said my hair looks like it’s buffering. Arjun’s hairline looks like it’s LEAVING.','Texture powder isn’t vanity. It’s armor. Damn right it’s armor.'],
 alex:['I talk to the ball more than I talk to people. The ball listens. The ball doesn’t say “what?”','Coach told me I’ve got “the soul of a substitute.” What does that MEAN, Coach.'],
 angelo:['I don’t sell to snitches, narcs, or Aidan. Aidan just stares at the merchandise.','Business is good. Business is always good. Business is a little bit illegal.'],
 jacob:['I did a backflip off a shed on Saturday. I can’t feel the left side of my face. Worth it.','I’m not dumb. I’m confident in the wrong direction.'],
 stella:['If one more person says “Stella-vision” I’m throwing the ball at their actual skull.','I’m not mean. I just have a really accurate arm.'],
 aidan:['People call me a creep. I prefer “early observer.”','I know what everyone’s locker combination is. I don’t do anything with it. I just like knowing.']
};
for(const id in MOUTH)if(CHAT[id])CHAT[id].push(...MOUTH[id]);

/* =================================================================
   BEEF — Omer vs Arjun
   ================================================================= */
mission('beef',{name:'Beef',icon:'🥩',who:['omer','arjun','hasan'],
 blurb:'Arjun posted Omer’s mom’s Zumba video in the group chat with the caption “when the bass drops.” Omer has set a time and a place. 3:15. The bus loop.',
 parts:['Before school: the time and the place','Lunch: the trash talk','Home time: 3:15'],
 tips:['Before school, bus loop. Omer is cracking his knuckles.','Lunch, Cafeteria. Arjun is drawing a map of escape routes on a napkin.','Home time, bus loop. Everybody knows. Everybody’s there.'],
 variants:{peace:'Peace (somehow)',teeth:'Teeth',head:'The head'}});
hook({mis:'beef',period:0,room:'bus',who:'omer',label:'Ask Omer why he’s cracking his knuckles',look:{pose:'cross',ex:'angry'},cond:()=>!D.f.bf1&&!D.dead.omer&&!D.dead.arjun,run:async()=>{
 await say('omer','He posted my MOM. In the group chat. Doing ZUMBA. With the caption “when the bass drops.”','angry');
 await say('omer','She saw it. She liked it. She LIKED it. Now she thinks she’s famous. She’s doing it in the kitchen. Every morning. At me.','angry');
 if(A.arjun){face('arjun','omer');await say('arjun','(from three people away) It got two hundred likes, bro. Your mom’s the most popular person in your house. Be happy for her.','smirk')}
 await say('omer','Bus loop. Three fifteen. I’m going to fold you like a lawn chair, Arjun.','yell');
 if(A.arjun)await say('arjun','Can’t wait. Wear the shorts. I want everyone to see your little legs shaking.','smirk');
 if(!D.dead.hasan)await say('hasan','(very quietly, to you) Somebody’s dying today. I don’t know who. I’m going to cry either way.','scared');
 D.f.bf1=1;part('beef',1);return 'stay';
}});
hook({mis:'beef',period:4,room:'canteen',who:'arjun',label:'Ask Arjun why he’s drawing on a napkin',look:{ex:'scared'},cond:()=>D.f.bf1&&!D.f.bf2&&!D.dead.omer&&!D.dead.arjun,run:async()=>{
 await say('arjun','(drawing arrows on a napkin) Escape routes. Fire exit. Kitchen. Pat’s walk-in fridge. I’m not scared. I’m strategically pissing myself.','scared');
 const c=await choose(['“Just apologize to him.”','“You’ve got this. Talk your shit.”','“Want me to talk to Omer?”']);
 if(c===0){await say('arjun','(writing on the back of the napkin) “Dear Omer. Sorry your mom is so talented.” …Is that an apology? It feels like an apology.','smirk');await say('you','It’s not an apology.');await say('arjun','It’s the most apology I’ve got.','sad')}
 else if(c===1){await say('arjun','(standing up on the bench, gaining confidence) You’re right. You’re RIGHT. I’m him. I’ve always been him. YOU HEAR THAT, OMER? I’M HIM.','yell')}
 else{await say('arjun','Tell him I said I’m sorry and also that his shorts are a cry for help. Both. In that order.','smirk')}
 put('omer',334,-1,{y:146});await walk('omer',230,90);
 await say('omer','(slamming a tray down) Three fifteen.','angry');
 await say('arjun','Three fifteen, Zumba Junior.','smirk');
 SFX.cheer();await N('The whole cafeteria makes a noise like a hockey game. Somebody starts a group chat called BUS LOOP 3:15 and it has 140 people in it before the bell.');
 if(!D.dead.shermian)await say('shermian','(from the end of the room, very sweetly) Miss has five dollars on the one in the shorts, sweeties.','happy');
 if(!D.dead.pat)await say('pat','Ten on the mouthy one. He’s got nothing to lose. You can see it in his face. His face has already lost.','smirk');
 D.f.bf2=1;part('beef',2);return 'stay';
}});
hook({mis:'beef',period:7,room:'bus',who:'omer',label:'Go to the bus loop. 3:15.',look:{ex:'angry',pose:'cross'},cond:()=>D.f.bf2&&!D.done.beef&&!D.dead.omer&&!D.dead.arjun,run:async()=>{
 const cast={omer:[130,1,{y:150}],arjun:[190,-1,{y:150}],you:[90,1,{y:158}]};for(const [n,x] of[['hasan',230],['nivaan',260],['paul',60],['kenneth',280]])if(!D.dead[n])cast[n]=[x,-1,{y:144,pose:n==='nivaan'?'film':'cheer'}];
 scene('bus',cast,true);crowd={n:16,cheer:true,phones:true,front:6,gap:[90,220]};cue('fight');
 await N('Three fifteen. A ring of a hundred and forty kids. Somebody brought a speaker. Somebody brought popcorn. A teacher watches from a window and stays there.');
 await say('arjun','(bouncing on his toes, no idea how to fight) Let’s go, let’s go, let’s go— wait, are we going? Are we doing it? Go.','yell');
 pose('omer','punch');A.omer.punchT=T+.4;SFX.punch();shake(.8);A.arjun.hurt=1;await tw(A.arjun,{x:A.arjun.x+8},120);blood(A.arjun.x,A.arjun.y-26,8,1,60,A.arjun.y+2);pose('omer',null);
 await N('Omer hits him once. It sounds like dropping a phone book.');
 pose('arjun','headbutt');SFX.punch();await tw(A.arjun,{x:A.omer.x+12},160);A.omer.hurt=1;pose('arjun',null);
 await N('Arjun headbutts him in the chest, which is the only part he can reach. It does nothing. It is very brave.');
 const c=await choose(['Step in between them.','Hype it. HYPE IT.','Let it go all the way.'],'It’s getting worse.');
 if(c===0){
  await walk('you',160,140);pose('you','up');
  SFX.punch();shake(1);A.you.hurt=2;blood(A.you.x,A.you.y-26,10,null,60,A.you.y+2);
  await N('You step in. Both of them hit you. At the same time. From both sides. Your ears ring like a fire alarm.');
  await say('omer','(staring at you on the ground) …Why would you DO that?','shock');
  await say('arjun','(also staring) Bro, that was the dumbest shit I’ve ever seen. And I’m ME.','shock');
  await N('They pick you up together. Arjun says sorry to Omer’s mom by voice note, on speaker. It’s a terrible voice note. It’s also the first real sorry he’s ever said.');
  pose('you',null);crowd=null;bond('omer',1);bond('arjun',1);await complete('beef','peace');return 'stay';
 }
 if(c===1){
  for(let i=0;i<3;i++){pose('omer','punch');A.omer.punchT=T+.3;SFX.punch();shake(.9);blood(A.arjun.x,A.arjun.y-24,14,1,70,A.arjun.y+2);
   const th=prop({t:'tooth',x:A.arjun.x,y:A.arjun.y-24});tw(th,{x:A.arjun.x+20+i*8},400);tw(th,{y:A.arjun.y-36},200,'out').then(()=>tw(th,{y:A.arjun.y+1},200,'in'));await wait(380)}
  pose('omer',null);A.arjun.pose='lie';A.arjun.hurt=3;
  await N('Three teeth. You count them on the ground afterwards. Nivaan counts them on stream. Chat counts them in the comments.');
  await say('arjun','(from the ground, lisping) …Thith ithn’t over.','hurt');
  await say('omer','(walking off) It’s over. Tell your teeth.','angry');
  crowd=null;await complete('beef','teeth');return 'stay';
 }
 pose('arjun','stomp');pose('omer','kick');await wait(400);pose('arjun',null);pose('omer',null);
 await N('It goes on and on. Arjun gets one good kick in. He’s so happy about it that he backs up to do a little dance. Backwards. Off the curb.');
 SFX.rumble();await N('The 43 is pulling in. It never slows down. It does not slow down.');
 SFX.crunch();shake(1.8);flash('#a00010',.5);
 const h=await gHead('arjun',-1);crowd=null;
 await N('The head rolls across the bus loop and comes to a stop at Omer’s feet. Facing up. Still looking smug. It looks smug even now.');
 await say('omer','(staring down at it) …Bro. What the fuck.','shock');
 await N('Omer has played soccer every day of his life since he was four. His body does it before his brain can say no.');
 await kickHead('omer',h,150);
 await N('It’s the cleanest strike of his life. It goes over the bus shelter. A hundred and forty phones follow it the whole way.');
 await say('omer','(hands on his head) I DIDN’T MEAN TO. MY FOOT DID IT. MY FOOT DID IT ON ITS OWN.','yell');
 if(!D.dead.hasan)await say('hasan','(throwing up into the bushes, crying, also kind of laughing) It was a GREAT kick. It was a great kick. Why was it a great kick.','cry');
 if(!D.dead.sherman){put('sherman',334,-1,{y:146});await walk('sherman',250,60);await say('sherman','Bus is leaving, boys. Somebody pick that up. It’s a hazard.','evil')}
 await complete('beef','head');return 'stay';
}});

/* =================================================================
   THE STAFF ROOM — the teachers hate each other too
   ================================================================= */
ROOMS.staffroom={name:'The Staff Room',music:'office',bg(){
 R(0,0,W,112,'#c8b89a');for(let i=0;i<W;i+=24)R(i,0,1,112,'rgba(0,0,0,.06)');R(0,0,W,5,'rgba(0,0,0,.2)');
 R(14,20,80,50,'#c8a878');R(16,22,76,46,'#e8d8b8');for(let i=0;i<9;i++){R(20+(i%3)*24,26+Math.floor(i/3)*13,20,10,['#f4f0a0','#f0c0c0','#c0e0f0'][i%3])}px('PASSIVE',22,62,'#7a5a3a');
 pxc('WHOEVER ATE MY YOGURT',160,24,'#a02020');pxc('I KNOW WHERE YOU LIVE',160,31,'#a02020');pxc('- L',196,38,'#a02020');
 R(230,24,40,82,'#e8e8ec');R(232,26,36,40,'#f4f4f8');R(232,68,36,36,'#f4f4f8');R(264,40,2,12,'#888');R(264,80,2,12,'#888');R(238,30,10,8,'#f0e080');R(250,32,8,6,'#f0a0c0');
 R(120,60,90,6,'#7a6a5a');R(124,52,10,8,'#e8e8e8');R(126,48,6,4,'#c03030');R(140,50,8,10,'#3a3a3a');R(160,52,12,8,'#f4f0e6');px('WORLD',160,53,'#c04070');R(180,52,10,8,'#5a8ac8');
 R(280,40,30,66,'#6a5a4a');R(282,42,26,62,'#7a6a5a');px('SUPPLY',283,48,'#3a2a1a');R(304,72,2,4,'#2a2a2a');
 R(0,106,W,6,'#7a6a52');R(0,112,W,68,'#7a7062');for(let i=0;i<W;i+=20)R(i,112,1,68,'rgba(0,0,0,.08)');
 R(30,124,90,16,'#5a4a6a');R(30,120,90,6,'#6a5a7a');R(26,120,6,20,'#5a4a6a');R(118,120,6,20,'#5a4a6a');
}};
if(typeof LIGHT!=='undefined')LIGHT.staffroom={amb:.62,tint:[60,40,30],src:[[160,10,110,.3,[255,240,210]],[248,60,60,.2,[220,240,255]]],wallAO:1};
mission('staffroom',{name:'The Staff Room',icon:'☕',who:['loach','shermian','pat','coach','voss'],
 blurb:'The teachers have beef with each other too. Somebody ate Ms. Loach’s yogurt. Somebody sat on Mr. Voss’s lap at the Christmas party. Today Ms. Loach is going to do something about it.',
 parts:['Before school: the shouting in the parking lot','Break: Pat explains','Lunch: the staff room'],
 tips:['Before school, the bus loop. Listen to the teachers in the parking lot.','Break, the Cafeteria. Ask Pat what that was.','Lunch, the Main Corridor. The staff room door is by the trophy cabinet.'],
 variants:{swap:'Swapped the mugs',toes:'Warned Ms. Sherman',immune:'Did nothing'}});
spot({room:'bus',period:0,x:296,y:148,label:'Listen to the teachers shouting in the parking lot',short:'SHOUTING',cond:()=>!D.f.st1&&!D.dead.loach&&!D.dead.shermian,run:async()=>{
 await N('Behind the bus shelter, in the staff parking lot, two teachers are screaming at each other over the roof of a Kia.');
 await say('loach','It had an L on it, Debra. An L. For LOACH.','angry');
 await say('shermian','I thought the L stood for “love,” sweetie. Everything in that fridge is love. Your yogurt was love. Now it’s in Miss.','happy');
 await say('loach','You ate my yogurt and you sat on Gerald Voss’s lap at the Christmas party for forty-five minutes, and it was NOT to read him a STORY.','yell');
 await say('shermian','(very calmly) He has very supportive thighs, sweetie. Everyone knows that. It’s in his file.','smirk');
 await N('Ms. Loach sits in her Kia, both hands on the wheel, staring at nothing for a full minute. Then she reverses into Mr. Voss’s car. On purpose.');
 D.f.st1=1;part('staffroom',1);return 'stay';
}});
hook({mis:'staffroom',period:2,room:'canteen',who:'pat',label:'Ask Pat what the teachers are fighting about',look:{ex:'smirk'},cond:()=>D.f.st1&&!D.f.st2,run:async()=>{
 await say('pat','(leaning over the counter, delighted) Oh, love. Oh, you have NO idea. I’m in the group chat. I see everything.','smirk');
 await dms('HIGHGATE STAFF 🍎','14 members',[
  ['loach','WHOEVER ATE MY YOGURT I KNOW WHERE YOU LIVE. I KNOW WHERE ALL OF YOU LIVE.'],
  ['shermian','it was delicious sweetie 💗'],
  ['voss','Can we keep the drama out of the group chat please. Also who keeps moving my jars. I count them.'],
  ['coach','👍'],
  ['loach','gerald you of all people do not get to talk about drama. ask debra about the christmas party. ask her about your LAP'],
  ['adam','PLEASE. I am BEGGING. the inspection is in TWO WEEKS'],
  ['coach','👍'],
  ['pat','🍿']
 ]);
 await say('pat','And between you and me, love, Ms. Loach bought something from the hardware store this morning. Brown bottle. Skull on it. She asked the man if it “tastes of anything.”','smirk');
 await say('pat','Staff room. Lunch. Ms. Sherman always has her coffee at 12:30. In the “World’s Best Teacher” mug. She bought it for herself.','happy');
 D.f.st2=1;part('staffroom',2);return 'stay';
}});
spot({room:'corridor',period:4,x:132,y:148,label:'Sneak into the staff room',short:'STAFF ROOM',cond:()=>D.f.st2&&!D.done.staffroom&&!D.dead.loach&&!D.dead.shermian,run:async()=>{
 scene('staffroom',{you:[40,1,{y:160,pose:'kneel'}],loach:[150,1,{y:142,hold:'mug'}]},true);cue('tension');
 await N('The staff room smells like burnt coffee and resentment. You duck down behind the couch. Ms. Loach is at the kettle, alone, humming.');
 await N('She takes a little brown bottle out of her cardigan. There’s a skull drawn on it in Sharpie. She tips most of it into the WORLD’S BEST TEACHER mug.');
 await say('loach','(stirring, to the mug) Love, Debra. All love.','evil');
 hold('loach',null);
 const c=await choose(['Swap the mugs when she turns round.','Warn Ms. Sherman.','Stay behind the couch. Do nothing.']);
 put('shermian',-14,1,{y:146});
 if(c===0){
  await N('Ms. Loach turns for the milk. You swap the WORLD’S BEST TEACHER mug for hers. Steady hands. Very loud heart.');
  await walk('shermian',110,60);await say('shermian','(picking up the World’s Best mug) Ooh, Linda, you made Miss a coffee? That’s so sweet. Cheers, sweetie.','happy');
  await say('loach','(smiling, sipping her own) Cheers, Debra.','evil');
  await wait(600);A.loach.ex='shock';A.loach.shake=1;SFX.gasp();
  await N('Ms. Loach puts her mug down. She looks at it. She looks at Ms. Sherman. She looks at the mug.');
  for(let i=0;i<4;i++){SFX.squelch();blood(A.loach.x,A.loach.y-26,20,null,80,A.loach.y+2);shake(.7);await wait(280)}
  await N('It comes out of her nose first. Then her eyes. Then everywhere. It’s green and red and it foams. She grips the counter. The counter wins.');
  kill('loach','lie',{pool:44,bleed:5,spray:60});
  await say('shermian','(taking a long sip of her perfectly fine coffee) Oh dear. Somebody should call somebody. After lunch.','happy');
  await say('shermian','(not turning round) Thank you, sweetie behind the couch. Miss owes you. Miss ALWAYS pays her debts.','smirk');
  await complete('staffroom','swap');return 'stay';
 }
 if(c===1){
  pose('you',null);await walk('you',90,90);await say('you','Miss— don’t drink that.');
  await walk('shermian',110,60);
  await say('shermian','(looking at the mug, then at Ms. Loach, very slowly) …Linda.','evil');
  await say('loach','It’s— it’s sugar, Debra. It’s a sweetener. It’s organic—','scared');
  await evil('shermian');
  await say('shermian','(to you, without looking) Close your eyes, sweetie. Or don’t. Miss doesn’t mind an audience of one.','evil');
  SFX.thud();A.loach.pose='lie';A.loach.ex='scared';
  hold('shermian','scissors');
  await toes('loach','shermian');
  await say('shermian','(standing, dusting off her skirt) This little piggy ate Miss’s… no. Wait. Miss ate HER yogurt. Well. Fair’s fair. Fair is ten toes.','happy');
  await N('She leaves the toes in a neat line on the counter, next to the kettle, where everyone will see them at break tomorrow.');
  kill('loach','lie',{pool:30,bleed:3,spray:20});hold('shermian',null);
  await complete('staffroom','toes');return 'stay';
 }
 await walk('shermian',110,60);
 await say('shermian','Is that for Miss, Linda? You shouldn’t have.','happy');
 await N('She drinks the whole thing. In one go. Ms. Loach watches her, frozen, like a woman watching a bus not hit someone.');
 await say('shermian','(putting the mug down, licking her lips) Hmm. Hint of almond. Miss has been drinking worse than that since 1998, sweetie. Next time, use the whole bottle.','evil');
 SFX.door();
 if(!D.dead.coach&&!D.dead.pat){put('coach',300,-1,{y:146});put('pat',312,-1,{y:146});
  await N('The supply cupboard opens. Coach and Pat come out together. He’s buttoning his tracksuit. She’s fixing her hairnet. Nobody says anything.');
  await say('coach','(pointing at all of you) Inventory.','angry');
  await say('pat','(fixing her hairnet) Inventory, love. Very thorough inventory.','smirk')}
 await complete('staffroom','immune');return 'stay';
}});
