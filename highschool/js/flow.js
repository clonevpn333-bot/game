'use strict';
/* =====================================================================
   HIGHSCHOOL — FLOW
   • No quest makes you wait for tomorrow. Big quests are longer
     instead: chaotic in-between scenes sit between their steps.
   • The main story moves whenever you’ve done the last thing, and
     between chapters, stuff happens.
   • Every quest says its goal bluntly, and the next step tells you
     where to walk.
   • People you’re in the middle of a quest with come back the next
     day, even if they died.
   • Kids talk like kids.
   ===================================================================== */
const FREE=[0,2,4],ANYP=[0,1,2,3,4,5,6];
K.cop={n:'Officer Kowalski',col:'#2a3a6a',skin:'#e8c4a0',hair:'#c8a060',hs:'short',top:'#2a3a6a',pants:'#1a2440',adult:1,tache:1,tacheC:'#a88040',seed:161,v:180};K.cop.id='cop';

/* =====================================================================
   IN BETWEEN — Intrusive Thoughts
   ===================================================================== */
hooks({mis:'brett',label:'Ask Corey why he’s got a black eye',look:{ex:'hurt',hurt:1},cond:()=>D.f.br===1&&!D.f.il1&&!D.dead.corey,run:async()=>{
 const cast={corey:[150,-1,{y:146,hurt:1}],you:[120,1,{y:154}]};scene('corridor',cast,true);
 await say('corey','It’s nothing. I walked into a door. The door was wearing a letterman jacket.','hurt');
 put('brett',334,-1,{y:146});put('kid4',350,-1,{y:146});await Promise.all([walk('brett',176,80),walk('kid4',196,80)]);
 await say('brett','Curls! Still liking her drawings at 1am? Bro. BRO. Let’s get you somewhere private.','smirk');
 pose('brett','grab');pose('kid4','grab');await N('Brett and his lacrosse friend grab Corey under the arms and drag him to the nearest locker. Locker 217.');
 await Promise.all([walk('brett',230,40),walk('kid4',250,40),tw(A.corey,{x:240},1200)]);
 SFX.locker();put('aidan',244,-1,{y:146});
 await N('Brett yanks the locker open to shove Corey in. Aidan is already inside. Standing up. In the dark. Like he’s been there all day.');
 await say('aidan','Hi.','happy');
 SFX.scream();A.brett.ex='scared';A.kid4.ex='scared';pose('brett',null);pose('kid4',null);
 await Promise.all([walk('brett',-20,140),walk('kid4',-20,150)]);remove('brett');remove('kid4');
 await say('corey','(rubbing his arm) …Thanks, Aidan.','shock');
 await say('aidan','It’s my locker. You can come in if you want. It’s cold. It’s nice.','smirk');
 await say('corey','(to you, after) Bro. He laughed while he did it. He laughs at everything. He laughed when she cried. I saw it.','angry');
 D.f.il1=1;toast('Intrusive Thoughts: something happened. Corey isn’t okay.');
 return 'stay';
}},[[0,'corridor','corey'],[2,'canteen','corey'],[4,'chem','corey']]);
hooks({mis:'brett',label:'Ask Abby where her guitar is',look:{ex:'sad'},cond:()=>D.f.br===2&&!D.f.il2&&!D.dead.abby,run:async()=>{
 scene('music',{abby:[160,-1,{y:146,pose:'sit',hold:'guitar'}],you:[-14,1,{y:156}]},true);await walk('you',110,80);
 await N('The music room, upstairs. Abby is on her own, playing something slow on an old acoustic guitar with stickers all over it.');
 await say('abby','It was my dad’s. He wrote songs in a band nobody ever heard of. This is the only thing of his I got.','sad');
 put('brett',-14,1,{y:146});await walk('brett',130,90);
 await say('brett','This is why you don’t text back? Your little guitar?','angry');
 pose('brett','grab');hold('abby',null);hold('brett','guitar');pose('brett','overhead');await wait(200);SFX.crunch();SFX.glass();shake(1.2);hold('brett',null);
 for(let i=0;i<8;i++)prop({t:'shard',x:140+Math.random()*30,y:150+Math.random()*6});
 SFX.whoosh();blood(A.brett.x,A.brett.y-28,8,null,30,A.brett.y+2);A.brett.ex='hurt';
 await N('He smashes it on the floor. One of the strings snaps back and whips him across the cheek. A thin red line, right under his eye.');
 if(!D.dead.corey){put('corey',334,-1,{y:146});await walk('corey',200,110);
  await N('Corey’s in the doorway. He walked up the stairs for no reason, like he always does when Abby’s up here. He picks up the broken neck of the guitar. His knuckles go white.');
  await say('abby','(very quietly) Corey. Don’t.','scared');
  await say('brett','(laughing, touching his cheek) Do it, Curls. Do it. My dad’s a cop.','smirk');
  await N('Corey puts it down. Slowly. Brett laughs all the way down the stairs.')}
 await walk('brett',-20,90);remove('brett');
 A.abby.pose=null;await say('abby','(picking up the pieces, one at a time) It’s fine. It’s fine. It was just a guitar.','cry');
 D.f.il2=1;return 'stay';
}},[[2,'canteen','abby'],[4,'canteen','abby']]);
hook({mis:'brett',period:[2,4],room:'corridor',who:'nivaan',label:'Ask Nivaan what he found on Brett’s phone',look:{pose:'phone',ex:'shock'},cond:()=>D.f.br===3&&!D.f.il3&&!D.dead.nivaan,run:async()=>{
 scene('corridor',{nivaan:[140,-1,{y:146,pose:'phone'}],you:[110,1,{y:154}]},true);
 await say('nivaan','I wasn’t gonna. Then I did. His cloud password is “brett1”. Bro. Look at what he sends her.','scared');
 await dms('Brett 🏈','to Abby',[['them','where r u','23:02'],['them','who is that','23:04'],['them','answer me','23:04'],['them','u think anyone else would want u','23:11'],['them','u owe me','23:11'],['them','pick up','23:30'],['them','im outside ur house','23:52']],{});
 if(!D.dead.corey){put('corey',334,-1,{y:146});await walk('corey',170,70);
  await N('Corey reads it over Nivaan’s shoulder. All of it. He doesn’t say anything. He just goes very, very still, like the second before a dog bites.');
  await say('corey','Home time. When he runs.','angry')}
 D.f.il3=1;return 'stay';
}});
hook({mis:'brett',period:ANYP,room:'hallb',who:'auto',cond:()=>D.f.br===4&&!D.f.il4,run:async()=>{
 const cast={cop:[200,-1,{y:146}],you:[100,1,{y:156}]};if(!D.dead.corey)cast.corey=[80,1,{y:150}];
 scene('hallb',cast,true);cue('tension');
 await N('A cop in the Front Hall. Not a school cop. A real one, with a real gun and a face like Brett’s, forty years later.');
 await say('cop','Officer Kowalski. Brett’s dad. My son didn’t come home. His car’s still in the student lot. You two. You know a kid called Corey?','angry');
 if(A.corey)await N('Corey is standing right next to you. He has his hands in his hoodie pocket. You know exactly why.');
 const c=await choose(['“Never heard of him.”','“Brett? Haven’t seen him. Sorry.”','Say nothing. Look at your shoes.']);
 const ok=await mash('Keep your face still',{need:14,time:4,info:'Don’t look at Corey. Don’t look at the woods.'});
 if(ok)await say('cop','(looking at you a long time) …Okay. If you hear anything. Anything.','sad');
 else{await say('cop','(writing your name down very slowly) You’re sweating, kid. It’s November.','angry');await N('He walks away. He looks back twice.')}
 await walk('cop',334,60);remove('cop');
 if(A.corey)await say('corey','(barely breathing) He has the same eyes. Did you see? He has the exact same eyes.','scared');
 D.f.il4=1;return 'stay';
}});
Object.assign(MIS.brett,{goal:'Help Corey with Abby’s boyfriend, Brett. Permanently.',
 parts:['The boyfriend','Locker 217, and the thought','The guitar, and where Brett runs','His messages, and the woods','The cop, and Abby after'],
 tipNow:()=>{const b=D.f.br||0;
  if(b===1&&!D.f.il1)return'Find Corey (before school: Main Corridor · break: Cafeteria · lunch: Chem Lab).';
  if(b===1)return'Corey isn’t okay. Find him (break: Cafeteria, lunch: Chem Lab).';
  if(b===2&&!D.f.il2)return'Find Abby in the Cafeteria at break or lunch. Ask about her guitar.';
  if(b===2)return'Ask Nivaan to look somebody up (Main Corridor, break or lunch).';
  if(b===3&&!D.f.il3)return'Nivaan found something on Brett’s phone (Main Corridor, break or lunch).';
  if(b===3&&!D.f.shovel)return'Get the shovel from the groundskeeper’s shed on the Playing Field.';
  if(b===3)return'Home time, the bus loop: walk into the woods with Corey.';
  if(b===4&&!D.f.il4)return'Walk through the Front Hall. Somebody’s asking questions.';
  if(b===4)return'Find Abby (Main Corridor before school, Cafeteria at break or lunch).';
  return null}});

/* =====================================================================
   IN BETWEEN — Long Distance
   ===================================================================== */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(D&&!D.weekend&&D.f.fw===1&&!D.f.fwil1&&((room==='library'&&D.period===2)||(room==='field'&&D.period===4))&&!A.stellamom){put('stellamom',250,-1,{y:146,hold:'tray'})}return r}}
hooks({mis:'farewell',label:'Ask Stella why her mom is here',look:{ex:'scared'},cond:()=>D.f.fw===1&&!D.f.fwil1&&!D.dead.sean,run:async()=>{
 const r=here();scene(r,{stella:[150,1,{y:148}],stellamom:[200,-1,{y:146,hold:'tray'}],you:[120,1,{y:154}]},true);
 await say('stella','My mom’s picking up my transfer papers. Already. She’s so fast. She’s never been fast at anything.','sad');
 put('sean',334,-1,{y:146});await walk('sean',230,120);
 await say('sean','MRS. STELLA’S MOM. Hi. I’m Sean. Let me carry— let me carry that for you, I’m very strong—','yell');
 pose('sean','grab');hold('stellamom',null);hold('sean','tray');await walk('sean',260,60);SFX.thud();SFX.glass();A.sean.pose='lie';hold('sean',null);
 blood(A.sean.x,A.sean.y-6,10,null,30,A.sean.y+2);
 await N('Sean trips over absolutely nothing and goes face first into the box of framed photos he was carrying. There’s glass in his eyebrow.');
 await say('stellamom','(kneeling next to him, trying not to laugh) Oh, honey. You’re the voicemail boy.','happy');
 await say('sean','(from the floor) …She played you the voicemails?','shock');
 await say('stellamom','Every one. Number thirty-one made me cry in a Target. Get up. You’re okay. You’re a good kid.','happy');
 A.sean.pose=null;
 await say('stella','(to you, very quietly) That’s the first time she’s liked anybody since my dad. I hate this so much.','cry');
 D.f.fwil1=1;return 'stay';
}},[[2,'library','stella'],[4,'field','stella']]);
hook({mis:'farewell',period:ANYP,room:'wing_sports',who:'auto',cond:()=>D.f.fw===2&&D.f.chalk&&!D.f.fwil2,run:async()=>{
 const cast={you:[80,1,{y:156}],coach:[240,-1,{y:146}]};for(const [k,x] of[['kid1',150],['kid2',180],['kid3',120]])if(!D.dead[k])cast[k]=[x,-1,{y:146}];
 scene('wing_sports',cast,true);cue('tension');
 await say('coach','WHO TOOK MY CHALK. Nobody leaves this hallway until somebody gives me back my CHALK.','yell');
 await N('Coach is going down the hall turning out kids’ pockets. Your bag is right there, with a whole bucket of field chalk in it, leaving a white trail.');
 const c=await choose(['Blame the freshman.','Say it was for a science project.','Run.']);
 if(c===0&&A.kid2){pose('you','point');await walk('coach',A.kid2.x+10,120);pose('coach','grab');await N('Coach picks the freshman up by the backpack and puts him headfirst in the trash can by the water fountain. The freshman doesn’t even argue. He’s been here before.');await tw(A.kid2,{y:130},300);A.kid2.pose='lie';pose('coach',null);pose('you',null)}
 else if(c===1){await say('coach','SCIENCE. You know what science is, champ? Science is when I stop being nice. Go.','angry')}
 else{const ok=await mash('Run!',{need:14,time:3});if(!ok){await N('Coach catches you by the hood with one hand. He shakes the bag. A cloud of white chalk goes up and settles on both of you like snow.');await say('coach','…Keep it. I don’t want to know. Whatever it’s for, do it right.','sad')}}
 D.f.fwil2=1;return 'stay';
}});
Object.assign(MIS.farewell,{goal:'Help Sean say goodbye to Stella properly before she moves to Portland.',
 parts:['Portland','Stella’s mom, and Sean’s plan','Coach’s chalk, and forty-one'],
 tipNow:()=>{const f=D.f.fw||0;
  if(!f)return'Find Stella (break: Library · lunch: Playing Field). She’s been crying.';
  if(f===1&&!D.f.fwil1)return'Find Stella again (Library at break, Playing Field at lunch). Her mom is at school.';
  if(f===1)return'Find Sean (Library at break, Playing Field at lunch). He has a plan.';
  if(f===2&&!D.f.chalk)return'Steal Coach’s bucket of field chalk from the Gym.';
  if(f===2&&!D.f.fwil2)return'Walk through the Sports Wing. Coach knows his chalk is gone.';
  if(f===2)return'Home time, the bus loop. Help Sean write.';
  return null}});

/* =====================================================================
   IN BETWEEN — Step Eleven
   ===================================================================== */
hook({mis:'stepeleven',period:[2,4],room:'canteen',who:'hasan',label:'Ask Hasan why he’s talking to a lunch tray',look:{hold:'tray',ex:'scared'},cond:()=>D.f.s11===1&&!D.f.s11a&&!D.dead.hasan,run:async()=>{
 const cast={hasan:[150,1,{y:148,hold:'tray'}],you:[178,-1,{y:154}]};if(!D.dead.arjun)cast.arjun=[230,-1,{y:146}];scene('canteen',cast,true);
 await say('hasan','I’m practicing. The tray is my dad. Be my dad. Please. You have to be my dad.','scared');
 const c=await choose(['Be his dad. Do the voice.','Be his dad. Do it mean.']);
 if(c===0)await say('you','(deep voice) Hello, son. Who is this young man with the goggles.');
 else await say('you','(deep voice) Hasan. Why is there a swimmer at my cab. I did not order a swimmer.');
 await say('hasan','(to the tray) Dad. This is Darren. He’s— he likes— we’re— he has a list—','scared');
 if(A.arjun){await walk('arjun',196,80);await say('arjun','No, no, no. Let me do the dad. (sitting down, folding his arms) Hasan. I have driven a taxi for nineteen years so you could do THIS? A SWIMMER? A swimmer, Hasan?','smirk');
  await say('hasan','(laughing so hard he cries) Shut UP. That’s exactly him. That’s exactly what he’ll say.','laugh');
  await say('arjun','(quietly, out of character) He won’t, though. Your dad’s cool. He’ll be cool, bro.','sad')}
 D.f.s11a=1;return 'stay';
}});
hook({mis:'stepeleven',period:[2,4],room:'canteen',who:'hasan',label:'Ask Hasan why he’s wearing armbands',look:{ex:'scared'},cond:()=>D.f.s11===2&&!D.f.s11b&&!D.dead.hasan,run:async()=>{
 scene('pool',{hasan:[90,1,{y:110}],paul:[140,-1,{y:150,pose:'swim'}],you:[60,1,{y:112}]},true);cue('pool');
 await N('The pool, at lunch. Hasan is wearing two orange armbands from the lost property box. Paul is in the water, waiting to teach him. Paul has never taught anybody anything.');
 await say('paul','Just jump. Water holds you up. I read that.','happy');
 SFX.splat();await walk('hasan',120,60);A.hasan.y=160;A.hasan.pose='swim';prop({t:'splash',x:120,y:128});
 await N('Hasan jumps. The armbands come off immediately. He sinks like a dropped phone.');
 const ok=await mash('Get him out!',{need:14,time:4});
 if(!ok)await N('Paul gets him. Paul picks him out of the water with one hand like a tea bag and puts him on the side.');
 else await N('You and Paul drag him out together. He sits on the side coughing out half the shallow end.');
 A.hasan.pose=null;A.hasan.y=110;
 await say('hasan','(spitting water) Never again. NEVER. I’m never going in a pool again for anybody. For ANYBODY.','yell');
 if(!D.dead.darren){put('darren',334,-1,{y:110});await walk('darren',200,60);await say('darren','(from the doorway, very quietly, with his hand on his heart) You tried. For me. That was almost step eleven.','love')}
 D.f.s11b=1;return 'stay';
}});
Object.assign(MIS.stepeleven,{goal:'Get Hasan through all of Darren’s steps. Find out what step eleven is.',
 parts:['The laminated list','Rehearsal, and meet the family','Swimming lessons, and the swim meet'],
 tipNow:()=>{const s=D.f.s11||0;
  if(!s)return'Find Hasan in the Cafeteria at break or lunch.';
  if(s===1&&!D.f.s11a)return'Find Hasan in the Cafeteria. He’s practicing on a lunch tray.';
  if(s===1)return'Home time, the bus loop. Wait with Hasan and Darren for the cab.';
  if(s===2&&!D.f.s11b)return'Find Hasan in the Cafeteria at break or lunch. He’s wearing armbands.';
  if(s===2)return'Lunch, the Cafeteria: Hasan says he isn’t going to Darren’s swim meet.';
  return null}});
Object.assign(MIS.window,{goal:'Get Corey and Abby together. Period 3, the Trailer, every odd day.'});

/* =====================================================================
   THE MAIN STORY — in between the chapters, stuff happens
   ===================================================================== */
const MAIN_IL=[
 {id:'il_bin',after:()=>crew().ev.retainer,room:'corridor',run:async()=>{
  scene('corridor',{you:[100,1,{y:156}],hasan:[130,1,{y:150}]},true);cue('tension');
  put('sherman',334,-1,{y:146});await walk('sherman',220,40);
  await N('Ms. Sherman is walking the Main Corridor very slowly, sniffing. Not like a person. Like a dog that lost something.');
  await say('sherman','(to nobody) Somebody’s been in Miss’s bin. Miss can smell it. Miss can smell a sandwich bag a mile off.','evil');
  await say('hasan','(grabbing your sleeve) Bathroom. Now. NOW.','scared');
  await Promise.all([walk('you',215,120),walk('hasan',225,120)]);A.you.back=1;A.hasan.back=1;await wait(200);
  scene('toilets',{you:[120,1,{y:156,pose:'kneel'}],hasan:[150,-1,{y:154,pose:'kneel'}]},true);
  await N('You and Hasan crouch on the toilet seat in the end stall, both of you, holding your breath. The bathroom door opens. Heels. They stop outside your stall.');
  SFX.drip();await wait(TEST?0:900);
  await N('Then they walk away. Under the stall door, on the floor, she’s left something. A gold sticker. It says “GOOD JOB”.');
  await say('hasan','(whispering) She knows. She knows and she’s being NICE about it. That’s so much worse.','scared');
 }},
 {id:'il_jars',after:()=>crew().ev.jars,room:'wing_sci',run:async()=>{
  scene('wing_sci',{you:[80,1,{y:156}],kid1:[200,-1,{y:146}]},true);
  SFX.bell();SFX.bell();
  await N('An alarm goes off in the Chem Lab. Not the fire alarm. A different one, lower, like a fridge screaming.');
  put('voss',198,-1,{y:146});A.voss.ex='evil';await walk('voss',230,140);
  await say('voss','Who opened my fridge? WHO OPENED MY FRIDGE. The seal is broken. The JARS can BREATHE now.','yell');
  await N('He runs past you in a full hazmat hood, sniffing every kid in the hall. He gets to the freshman, smells him, and stops.');
  await say('voss','(very gently) Not you. Your blood is boring.','smirk');
  await walk('voss',-20,120);remove('voss');
  await say('kid1','(not moving) …What does “boring” mean in this situation?','scared');
 }},
 {id:'il_pick',after:()=>crew().pick,room:'corridor',run:async()=>{
  scene('corridor',{you:[80,1,{y:156}],angelo:[160,-1,{y:146}]},true);
  put('tez',334,-1,{y:146});await walk('tez',190,70);
  await say('tez','Angelo. Your uncle called. He wants his lockpicks back. All of them. He said the word “ALL” in capitals.','scared');
  await say('angelo','(to you, through his teeth) That one you have is the good one. If he asks, you found it in a cereal box.','smirk');
  SFX.door();await N('Down the hall, a man in a tracksuit walks in through the front doors, looks around, and asks a seventh grader where locker 13 is. Angelo is already gone. You didn’t see him go. He just went.');
  if(A.angelo){await walk('angelo',-20,160);remove('angelo')}
 }},
 {id:'il_ghost',after:()=>crew().ev.register,room:'toilets',run:async()=>{
  scene('toilets',{you:[100,1,{y:156}]},true);cue('evil');
  await N('The bathroom. The lights buzz. In the mirror, the steam spells something on the glass, one letter at a time, from the inside.');
  await N('O. L. L. I. E.');
  put('ollie',200,-1,{y:150});A.ollie.alpha=.6;
  await say('ollie','You took the register. She’s going to notice. She notices everything. She noticed the boiler.','sad');
  await say('ollie','Ask Mr. Adam where he was. On the thirteenth. Ask him.','sad');
  await tw(A.ollie,{alpha:0},800);delete A.ollie;
  await N('When you look back at the mirror it just says your name. Then that fades too.');
 }},
 {id:'il_pa',after:()=>crew().wiped,room:'hallb',run:async()=>{
  scene('hallb',{you:[120,1,{y:156}],kid2:[200,-1,{y:146}],kid3:[240,-1,{y:146}]},true);
  SFX.static();
  await N('The PA crackles. It isn’t Mr. Adam. It’s Ms. Sherman. She’s playing something into the microphone. A voicemail.');
  await say('sherman','(over the PA) “Hey mom, it’s Arjun, can you pick me up, I don’t feel—” Oh dear. Somebody wiped all Miss’s phones. Miss kept the voicemails, sweeties. Miss always keeps the voicemails.','evil');
  await N('She plays another one. And another. Every kid in the Front Hall stops walking. Some of them hear their own voices.');
  await say('kid3','(whispering) That’s me. That’s me in sixth grade. How does she have that.','scared');
 }},
 {id:'il_stew',after:()=>crew().ev.rota,room:'canteen',run:async()=>{
  scene('canteen',{pat:[90,1,{y:140}],coach:[150,-1,{y:146}],you:[220,-1,{y:156}]},true);cue('fight');
  await say('coach','Somebody’s been talking to the kids, Pat. Somebody’s been handing out ROTAS.','angry');
  await say('pat','(stirring) Somebody’s been handing out chlamydia in the staff room, Gary, and nobody’s made a rota for that.','smirk');
  await walk('coach',120,90);pose('coach','grab');SFX.splat();await N('Coach tips the whole pot of stew onto the floor. It moves on its own for a second. Then it settles.');
  pose('coach',null);hold('pat','cleaver');
  await say('pat','(very quietly) Pick it up. With your hands.','evil');
  await N('Coach picks it up with his hands. All of it. Every kid in the cafeteria watches. Nobody films it. Even Nivaan puts his phone down out of respect.');
  hold('pat',null);
 }},
 {id:'il_drain',after:()=>crew().ev.boiler,room:'wing_sports',run:async()=>{
  scene('wing_sports',{you:[100,1,{y:156}],omer:[130,1,{y:150}]},true);cue('evil');
  if(A.omer)A.omer.hairC='#f4f4f0';
  await N('The Sports Wing smells like chlorine. A lot of chlorine. From behind the pool doors comes a long, slow sucking sound.');
  await say('omer','(his hair has gone completely white overnight) Don’t. Don’t say anything about the hair. My mom cried.','scared');
  await N('Through the pool doors you can see the water level going down. All by itself. The drain is pulling it. Somebody under there wants out.');
  await say('omer','I said their names in my sleep. My mom heard. She said “who’s Louise”. I said “I don’t know, Mom.” I know.','sad');
 }},
 {id:'il_aidan',after:()=>crew().roles,room:'corridor',run:async()=>{
  scene('corridor',{you:[80,1,{y:156}],aidan:[180,-1,{y:146,hold:'clipboard'}]},true);
  if(D.dead.aidan||D.f.aidanDead)return;
  await N('Aidan is standing in the middle of the Main Corridor with a clipboard. Behind him, six seventh graders in matching cardboard badges.');
  await say('aidan','I started my own crew. Since I wasn’t in yours. We’re called “Also The Crew”.','happy');
  await say('aidan','We have one job. On Friday, we’ll be there. Wherever you are. Standing slightly behind you.','smirk');
  await N('All six seventh graders take one step closer to you at exactly the same time.');
 }}
];
for(const il of MAIN_IL)hook({mis:'crew',period:ANYP,room:il.room,who:'auto',cond:()=>!D.weekend&&cal()<12&&!crew()[il.id]&&!!il.after()&&!crew().finale,run:async()=>{crew()[il.id]=1;save();await il.run();return 'stay'}});

/* the chapter line: one goal, in order, any time */
const CH_GOAL=[
 {beat:1,t:'The Empty Seat',goal:'Search Ms. Sherman’s Math room for anything of Tyler’s. (Main Corridor, MATH door, when there’s no lesson in it.)',done:()=>crew().ev.retainer},
 {beat:2,t:'The File',goal:'Photograph Mr. Voss’s back fridge. (Science Wing, CHEM LAB door.)',done:()=>crew().ev.jars},
 {beat:3,t:'Muscle',goal:'Get a lockpick from Angelo. (Main Corridor, break or lunch.)',done:()=>crew().pick},
 {beat:4,t:'The Office',goal:'Pick the lock on Ms. Sherman’s office. (Main Corridor, far right.)',done:()=>crew().ev.register},
 {beat:5,t:'Mr. Adam Knows',goal:'Get to home time alive.',done:()=>crew().fri1},
 {beat:8,t:'The Leak',goal:'Wipe the phones in Ms. Sherman’s drawer. (Math room, Main Corridor.)',done:()=>crew().wiped},
 {beat:9,t:'Lookouts',goal:'Get the Inspection Day rota from Pat. (Cafeteria, break or lunch.)',done:()=>crew().ev.rota},
 {beat:10,t:'The Boiler Room',goal:'Go down the old hatch. (Main Corridor, far left.)',done:()=>crew().ev.boiler},
 {beat:11,t:'The Plan',goal:'Everyone has a job. Stay alive until Inspection Day (Friday, week two).',done:()=>crew().roles}
];
storyNow=function(){
 if(crew().finale)return{i:99,t:'After',goal:'It’s over. Or it isn’t.'};
 if(cal()>=12)return{i:98,t:'Inspection Day',goal:'The Main Hall. Everything happens.'};
 for(let k=0;k<CH_GOAL.length;k++){const ch=CH_GOAL[k];if(ch.done())continue;
  if(!crew()['beat'+ch.beat])return{i:k,t:ch.t,goal:'The crew is meeting. It’ll happen next time you’ve got a free minute (before school, break or lunch).'};
  return{i:k,t:ch.t,goal:ch.goal}}
 return{i:CH_GOAL.length,t:'Ready',goal:'Everything’s ready. Inspection Day is Friday of week two. Do the side stuff. Stay alive.'};
};
if(typeof CHAPTERS!=='undefined'){for(const c of CHAPTERS){const g=CH_GOAL.find(x=>x.beat===c.day);if(g)c.goal=g.goal}}

/* =====================================================================
   GOALS — blunt. Next steps — with directions.
   ===================================================================== */
const GOALS={
 bully:'Stop Hasan’s prank on Aidan in English. Or don’t.',seat:'Beat Ms. Sherman’s new seating plan.',oldbat:'Survive Ms. Sherman. Then get back at her.',
 loach:'Get Ms. Loach to react to anything.',group:'Get your group through Ms. Balduf’s presentation.',instella:'Get Sean and Stella together on the field.',
 beep:'Get Kenneth through the beep test alive.',voss:'Find out what’s in Mr. Voss’s back fridge.',angelo:'Get Angelo some of Pat’s cookies to sell.',
 alex:'Help Alex score a hat-trick past Jacob.',dheva:'Get Dheva his texture powder back.',marcus:'Get Marcus on the morning announcements.',
 paul:'Survive wrestling Paul.',kenneth:'Beat Kenneth one-on-one. Or let him win.',jacob:'Find out why everybody pushes Jacob.',
 calling:'Find out what Aidan knows.',headcase:'Help Mr. Adam before he loses it.',bakeoff:'Don’t end up in Mrs. Kettle’s oven.',method:'Survive Mr. Pratt’s Macbeth.',
 armoury:'Buy something from Tez’s bathroom shop.',register:'Find out who Ollie Finch is.',opps:'Get into Kayden’s gang. Or end it.',alone:'Talk to Arjun when he’s on his own.',
 hasanmia:'Help Hasan ask Mia out.',striketwo:'Go on Sean and Stella’s first date with them.',smallhours:'Listen to Abby play. Get Corey to sing.',
 omermum:'Meet Omer’s mom.',jacobken:'Watch Jacob and Kenneth play arcade hoops.',tea:'Find out who runs @highgate.tea.',catfish:'Find out who “Jess” really is before Kenneth meets her.',
 kaivibes:'Get Nivaan through his collab with Kai Vibes.',groupchat:'Stop Omer killing Arjun over the screenshots.',leaked:'Get Kenneth’s leaked stuff taken down.',
 emergency:'Prank Corey with his own curl cream.',heads:'Survive Mr. Grieve’s French Revolution.',stilllife:'Get Marcus out of Miss Dahl’s still life alive.',
 pitch:'Get Kenneth through his singing solo.',delete:'Shut down HIGHGATE OS.',breath:'Survive Mrs. Tarn’s breath test.',measure:'Stop Mr. Oakes measuring Dheva for a coffin.',
 sleepy:'Don’t let Dr. Lyle hypnotize you out of a window.',talent:'Win Mr. Adam’s talent show.',darren:'Find out who “D” is and help Hasan answer him.',
 nightshift:'Help Hasan say happy birthday to his dad.',roast:'Win the Roast Table.',cheeks:'Help Cheeks & Cheek-Clapper finish their movie.',pits:'Survive Aidan’s deodorant.',
 toby:'Help Sean deal with Toby liking him.',phone:'Get Arjun’s phone back from Ms. Sherman.',lockdown:'Survive the lockdown. Find out what’s in the school.',
 crew:'Prove the teachers are killing kids before Inspection Day.',crew_locker:'Get Tyler’s notebook out of his locker.',crew_dark:'Get the night camera footage.',
 crew_record:'Get Mr. Adam on the record about 1987.',flimbus:'Find out what “mickther” means.',inhaler:'Find Kenneth’s inhaler.',thermos:'Get Hasan’s dad’s thermos back.',
 ladle:'Get Pat’s lucky ladle back from Coach.',shorts:'Find Omer’s shorts.',vapes:'Deal with the vape kids.',beef:'Stop Omer and Arjun killing each other. Or watch.',
 staffroom:'Find out who ate Ms. Loach’s yogurt.',passing:'Stop for things that happen in the halls between classes.',
 farewell:'Help Sean say goodbye to Stella properly.',stepeleven:'Find out what step eleven is.',kim:'Find out what Mr. Kim did with Alex.',window:'Get Corey and Abby together.',brett:'Help Corey with Abby’s boyfriend, Brett. Permanently.'
};
for(const m in GOALS)if(MIS[m])MIS[m].goal=MIS[m].goal||GOALS[m];
for(const m of Object.values(MIS)){if(!m.goal){if(m.id.startsWith('cq_'))m.goal='Do the secret stuff that only happens in '+m.name.replace('Class Secrets: ','')+'.';else if(m.id.startsWith('ret_'))m.goal=m.name.replace('Return: ','')+': do it during a Period 3 return.';else if(m.id.startsWith('wk_'))m.goal=m.name.replace('Weekend: ','')+'. (A weekend thing.)';else m.goal=m.name+'.'}}

/* the next-step line: goal, what to do, and where to walk */
activeNext=function(){
 if(!D||!D.mp)return[];
 const out=[];
 for(const m in D.mp){const M=MIS[m];if(!M||D.done[m]||P.done[m]&&!D.mp[m])continue;const n=D.mp[m];if(n>=M.parts.length&&!M.tipNow)continue;
  let tip=M.tipNow?M.tipNow():null;if(!tip)tip=M.tips&&M.tips[Math.min(n,M.tips.length-1)];if(!tip)continue;
  const tg=typeof questTarget==='function'?questTarget(m):null;
  const route=tg&&tg.now&&tg.room&&tg.room!==D.room?' 🧭 '+routeText(D.room,tg.room):(tg&&tg.now&&tg.room===D.room?' 🧭 It’s here.':'');
  out.push({m,name:M.name,tip:tip+route,goal:M.goal})}
 return out;
};
{const _ul=updateLoc;updateLoc=function(){_ul();const c=$('clock');if(!c)return;const n=c.querySelector('.story.next');if(n){const a=activeNext();if(a[0])n.textContent='→ '+a[0].name.toUpperCase()+' — '+(a[0].goal||'')+' NEXT: '+a[0].tip+(a.length>1?'  (+'+(a.length-1)+' more)':'')}}}

/* the quest log: show the goal, and a Story tab */
{const _oq=openQuest;openQuest=function(){
 _oq();
 const o=$('quest'),tb=o.querySelector('.tabs');
 if(tb&&!tb.querySelector('[data-story]')){const b=document.createElement('button');b.textContent='Story so far';b.dataset.story=1;b.setAttribute('aria-pressed',String(questTab==='story'));b.onclick=()=>{questTab='story';openQuest()};tb.insertBefore(b,tb.firstChild)}
 if(questTab==='missions'){for(const q of o.querySelectorAll('.qgrid .q')){const h=q.querySelector('h3');if(!h)continue;const m=Object.values(MIS).find(x=>h.textContent.startsWith(x.name));if(m&&m.goal&&!q.querySelector('.goal')&&!q.classList.contains('lock')){const g=document.createElement('div');g.className='goal';g.style.cssText='color:#ffd27a;font-size:12px;margin:2px 0 4px';g.textContent='GOAL: '+m.goal;h.after(g)}
  if(m&&m.tipNow&&D&&D.mp[m.id]&&!D.done[m.id]){const t=q.querySelector('.tip');const tn=m.tipNow();if(t&&tn)t.textContent='➜ '+tn}}}
 if(questTab==='story'){
  for(const b of tb.querySelectorAll('button'))b.setAttribute('aria-pressed',String(!!b.dataset.story));
  const body=o.querySelector('.qbody');body.innerHTML='';
  const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.style.cssText=c;if(txt!=null)e.textContent=txt;return e};
  body.appendChild(el('p','color:#f4ead8;font-size:14px;margin:0 0 8px','Tyler is missing. The teachers at Highgate have been killing kids for years, and everyone pretends it’s a joke. The crew is building a file of proof to show the state inspectors on Inspection Day (Friday, week two). Everybody except Aidan.'));
  const s=storyNow();body.appendChild(el('p','color:#ffd27a;font-size:13px;margin:0 0 10px','NOW: '+s.t+' — '+s.goal));
  body.appendChild(el('h3','color:#cbbfd8;font-size:13px;margin:8px 0 4px','Chapters'));
  for(const ch of CH_GOAL){const d=ch.done();body.appendChild(el('div','font-size:13px;color:'+(d?'#9ad09a':crew()['beat'+ch.beat]?'#f4ead8':'#6a5a6a'),(d?'✓ ':crew()['beat'+ch.beat]?'➜ ':'· ')+ch.t+(d||crew()['beat'+ch.beat]?' — '+ch.goal:'')))}
  const EV={retainer:'Tyler’s retainer, with blood on it, from Ms. Sherman’s bin.',jars:'Photos of Mr. Voss’s fridge: fourteen jars labelled AIDAN, and one labelled TYLER M.',register:'The 1987 detention register: four kids, crossed out in red.',boiler:'Four names scratched in the old boiler room: Ollie, Raj, Danny, Louise.',rota:'Every teacher’s timetable for Inspection Day.',notebook:'Tyler’s notebook: “She keeps me after the bell.”',footage:'Night camera footage of the teachers.',confession:'Mr. Adam’s confession about 1987.'};
  body.appendChild(el('h3','color:#cbbfd8;font-size:13px;margin:10px 0 4px','The File ('+crewEvidence()+')'));
  const ev=crew().ev||{};let any=0;for(const k in EV)if(ev[k]){any=1;body.appendChild(el('div','font-size:13px;color:#f4ead8','• '+EV[k]))}if(!any)body.appendChild(el('div','font-size:13px;color:#6a5a6a','Nothing yet.'));
  body.appendChild(el('h3','color:#cbbfd8;font-size:13px;margin:10px 0 4px','What you know'));
  const kn=Object.keys(P.intel||{});if(!kn.length)body.appendChild(el('div','font-size:13px;color:#6a5a6a','Nothing yet.'));for(const k of kn)body.appendChild(el('div','font-size:13px;color:#f4ead8','• '+(INTEL[k]||k)));
  if(typeof LORE!=='undefined'&&P.lore){const lk=Object.keys(P.lore||{}).filter(k=>LORE[k]);if(lk.length){body.appendChild(el('h3','color:#cbbfd8;font-size:13px;margin:10px 0 4px','Lore'));for(const k of lk)body.appendChild(el('div','font-size:13px;color:#f4ead8','• '+LORE[k].title+': '+LORE[k].text))}}
 }
}}

/* =====================================================================
   PEOPLE YOU NEED COME BACK TOMORROW
   ===================================================================== */
{const _cf=carryFrom;carryFrom=function(prev,died){
 const r=_cf(prev,died);
 if(!r||r.replay||!r.dead||!prev)return r;
 const need=new Set();
 for(const m in(prev.mp||{})){if(prev.done&&prev.done[m])continue;const M=MIS[m];if(M&&M.who)for(const w of M.who)need.add(w)}
 if(P.crew&&!P.crew.finale)for(const w of(MIS.crew?MIS.crew.who:[]))need.add(w);
 for(const w of need)if(r.dead[w]&&!(K[w]&&K[w].adult&&w!=='adam')){delete r.dead[w];(P.backTomorrow=P.backTomorrow||[]).push(w)}
 return r;
}}
{const _di=dayIntro;dayIntro=async function(died){
 await _di(died);
 if(!died&&P.backTomorrow&&P.backTomorrow.length){const ns=[...new Set(P.backTomorrow)].filter(k=>K[k]).map(k=>K[k].n);P.backTomorrow=[];save();if(ns.length)await N(ns.join(', ')+(ns.length>1?' are':' is')+' back. Somehow. Bandaged, quiet, and back. You’re in the middle of something with them, and the building seems to know it.')}
}}

/* =====================================================================
   KIDS TALK LIKE KIDS
   ===================================================================== */
Object.assign(CHAT,{
 hasan:['Bro I’m so tired. I slept like four hours. Arjun kept sending me reels.','If Ms. Balduf asks, I did the reading. I did not do the reading.','Stop looking at my head. I know you’re looking at my head.','Lowkey I have the weirdest déjà vu today. Like I’ve already been bored of this exact day.','You want half my chips? You can have like three. THREE.'],
 arjun:['What? Oh. It’s you. I thought it was someone important.','I’m not mean, I’m honest. You’re just on the wrong side of honest.','Bro, your shoes. Your SHOES. Who let you leave the house.','I’m bored. Somebody fight somebody.','If you tell anyone I did my homework I’ll end you.'],
 david:['I’m running for class president. My whole campaign is “no”.','Okay, don’t laugh, but I think something is seriously wrong with this school.','My glasses keep fogging up near Ms. Sherman. I think that’s fear.','I made a spreadsheet of missing kids. It’s long. It’s really long.'],
 omer:['Shorts in November. Deal with it.','Anybody says anything about my mom today, I swear to God.','I did push-ups this morning. Not for anything. Just in case.','Bro I’m starving. When’s lunch. Why is it not lunch.'],
 nivaan:['We’re live. Say hi to chat. Chat says you look like a thumb.','Ninety-one viewers. NINETY-ONE. I’m basically famous.','If anybody fights today, I need like a ten-second warning to get the angle.','Chat wants to know if you’re single. I didn’t ask them to ask.'],
 corey:['I’m fine. My hair’s fine. Everything’s fine.','Don’t look at my hair. Okay, look at it a little.','Do you think the purple curl cream is too much? Be honest. Don’t be honest.'],
 sean:['She’s HERE. Like in person. With a body.','I practiced saying hi in the mirror. The mirror did it better.','Strike one. That’s our thing. Don’t make it weird.'],
 stella:['Sean talks way more on the phone. In person he just kinda vibrates.','I lost my lucky ball. If you see a ball that looks lucky, it’s mine.','Is your friend group always this loud or is that a Highgate thing?'],
 abby:['Corey keeps walking past me. Then walking past me again. From the other side.','I stayed up till three playing guitar. My neighbors hate me. It’s fine.','My dog’s called Morrissey. He bites. Don’t pet him.'],
 angelo:['Locker 13. Open nine till three-thirty. Cash, cookies, or favors.','I don’t sell anything illegal. I sell stuff that’s illegal in THIS building. Big difference.','You need a fake doctor’s note? I got one signed by a real dentist.'],
 alex:['Hat-trick at break or I’m quitting soccer. I’m not quitting soccer.','Coach says my left foot is a weapon. He says it like he’s gonna take it.','I can run a 5k but I can’t text a girl back. Bodies are weird.'],
 dheva:['Touch my hair and I’ll touch your face. With my fist.','It’s not gel. It’s NEVER gel. It’s texture powder.','Track pants are formal wear if you commit to it.'],
 marcus:['Morning. Or as I like to call it: the hard part. Heh.','Ms. Sherman told me to “take it out” about my phone and I haven’t stopped thinking about it.','I’d tell you about my weekend but there are children present. You. You’re the children.'],
 paul:['Wanna wrestle? That wasn’t a question.','I put Kenneth through a table this morning. It was his table. He was chill about it.','My arms are too long. My mom has to buy my shirts at a giraffe store.'],
 kenneth:['I’m six foot in my head. Five seven everywhere else.','Basketball is literally just math that makes girls look at you.','If Coach asks, I have asthma. I do not have asthma.'],
 jacob:['Don’t push me. Everyone pushes me. I’m not a door.','Somebody put me in a trash can this morning. Nobody even laughed. That’s worse somehow.','I’m calm. I’m so calm. Look how calm I am.']
});
for(const w in WHISPER)WHISPER[w]=WHISPER[w].map(set=>set.map(([who,t,...r])=>[who,t.replace(/\(whispering\) /g,'').replace(/, dear\b/g,'')
 ,...r]));

/* what your neighbor whispers in class — in their own words */
Object.assign(WHISPER,{
 hasan:[[['hasan','psst. bro. is it just me or does this lesson feel like it’s been going for three days'],['hasan','I checked the clock twice. It went BACKWARDS.']],[['hasan','don’t laugh. DON’T laugh. Arjun just sent me a picture of the teacher as a potato.'],['hasan','(shaking) I’m gonna die. I’m literally gonna die in here.']]],
 arjun:[[['arjun','if you tell anyone I did the homework I swear on everything'],['you','You did the homework?'],['arjun','…shut up.']],[['arjun','rate everyone in this room. go. I’ll start. you’re a six. today. on a good day.']]],
 alex:[[['alex','my dad’s gonna watch the match Saturday. if I don’t score he does this face. you know the face.'],['alex','every dad has the face.']],[['alex','(drawing formations on his hand) if Jacob’s in goal I go low left. always low left. don’t tell him.']]],
 dheva:[[['dheva','(fixing one piece of hair in his phone camera) people think it’s vanity. it’s literally the only thing I get to decide all day.'],['dheva','…that was deep. forget I said that.']],[['dheva','where’s Alex. he said he’d sit here. we’re a package. you can’t split a package.']]],
 marcus:[[['marcus','I make jokes so nobody else gets to decide I’m the weird one first.'],['marcus','also cause they’re funny. mostly that.']],[['marcus','did you know you can fit nine Haribo in your mouth. I can do eleven. it’s a gift.']]],
 paul:[[['paul','(way too loud) I could lift this desk. with you on it. not now. but I could.']],[['paul','my elbows are in Kenneth’s lesson. my arms are too long for this room.']]],
 kenneth:[[['kenneth','five seven. FIVE SEVEN. my cousin’s five eleven and he can’t even catch.'],['kenneth','height’s fake. short people invented it. trust.']],[['kenneth','I talk to people online at night. like a lot. is that weird. don’t answer that.']]],
 jacob:[[['jacob','somebody pushed me into the trash cans this morning. nobody even laughed. that’s worse.']],[['jacob','doing breathing. in for four. you do it too. I don’t wanna do it alone.']]],
 omer:[[['omer','my mom picks my clothes. my dad used to. then he didn’t. so she just kept doing it. that’s it. that’s the story.']],[['omer','(doing push-ups against the desk) for speed. don’t ask.']]],
 corey:[[['corey','I give my seat up on the 43 every day. old lady at the hospital stop. nobody else moves. it’s whatever.'],['corey','don’t make it a thing.']],[['corey','(checking his curls in the window) emergency. no. false alarm. we’re good.']]],
 sean:[[['sean','I practiced saying hi like forty times on the bus. I’m gonna say it zero times.']],[['sean','Stella’s dad shook my hand once. I heard a bone. one of mine.']]],
 stella:[[['stella','Sean thinks I don’t notice him practicing. I notice. it’s my favorite part of the day.']],[['stella','my dad left the ball. the lucky one. he took literally everything else.']]],
 david:[[['david','I got nine votes for class president last year. four were cousins.']],[['david','I have a theory about this school and I hate it. don’t laugh.'],['you','I’m not laughing.'],['david','…you will be.']]],
 nivaan:[[['nivaan','(phone under the desk) ninety-one people are watching a math lesson right now. that’s community.']],[['nivaan','I stream so it’s not quiet at home. that’s all. don’t clip that.']]],
 abby:[[['abby','(writing chords in the back of her book) I wrote a song about the 43. it’s mostly about the boy who gives his seat up.'],['abby','don’t tell him. he’d literally explode.']],[['abby','my dog ate my homework. Morrissey. he actually did. he ate the whole book.']]],
 angelo:[[['angelo','(sliding a price list over) friends and family rate. you’re not family. friends rate.']],[['angelo','my mom works two jobs. I work one. locker 13. it’s not a joke to me.']]]
});
