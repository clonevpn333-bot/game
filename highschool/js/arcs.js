'use strict';
/* =====================================================================
   HIGHSCHOOL — ARCS
   • Darren takes “let’s be friends” the way a real person would: badly.
     Then STEP TWELVE: he comes for Hasan, and it gets ugly.
   • JADE: Brayden screams at his girlfriend in the cafeteria. You can
     take her. That isn’t the end — it’s where it starts: Brayden and
     his boys come for you, Jade wants it public, Brayden comes back
     with flowers, and somebody ends up humiliated at the mall.
   • THE SUPPLY CLOSET: Coach and Pat, “doing inventory”.
   • BAYONET OF MY HEART: Mr. Grieve wrote a romance novel. About war.
     It is extremely about war.
   Each arc is built in beats: a hook, a turn, a fight, a choice, and
   an ending you actually see the fallout from.
   ===================================================================== */
if(!K.jade){K.jade={n:'Jade',col:'#7a3a8a',skin:'#c89068',hair:'#141010',hs:'long',top:'#3a2a4a',pants:'#1a1a22',girl:1,seed:104,v:470};K.jade.id='jade'}
const beat=async(t,sub)=>{if(TEST)return;await card(t,sub||'',1200)};

const freeHooks=(o,places)=>{for(const [p,room,who] of places)hook(Object.assign({},o,{period:p,room,who:who||o.who}))};

/* ================= DARREN: STEP TWELVE ================= */
{const H=HOOKS.filter(h=>h.mis==='darren'&&h.period===4&&String(h.run).includes('Can we be friends'));
 for(const h of H){const src=String(h.run);/* the old “be okay” reply is replaced at runtime below */}}
/* Hasan’s “just friends” now lands the way it should */
{const _say=say;say=function(who,text,e){
 if(who==='darren'&&typeof text==='string'&&/Step ten was always “be okay”/.test(text)){
  return (async()=>{
   await _say('darren','(the question mark slowly lowering) …Friends.','sad');
   await _say('darren','Eleven steps. ELEVEN. I laminated them, Hasan. Do you know what a laminator costs? Do you know how many times I practiced the drone?','angry');
   if(A.darren){pose('darren','throw');SFX.smack();if(A.hasan){A.hasan.ex='hurt';A.hasan.hurt=Math.max(A.hasan.hurt||0,1)}}
   await N('He snaps the question mark over his knee and throws both halves at Hasan’s face. One of them connects.');
   if(A.darren)pose('darren',null);
   await _say('darren','You don’t get to be my friend. You get to be NOTHING. Enjoy step twelve.','evil');
   D.f.darMad=1;save();
   if(A.darren){await walk('darren',340,110);}
   await _say('hasan','(holding his nose) …What’s step twelve?','scared');
  })();
 }
 return _say(who,text,e);
}}
mission('steptwelve',{name:'Step Twelve',icon:'🩸',who:['hasan','darren'],goal:'Keep Darren from wrecking Hasan after Hasan turned him down.',
 blurb:'Hasan said “let’s be friends”. Darren said “enjoy step twelve”. Nobody knows what step twelve is. Hasan hasn’t slept.',
 parts:['The locker','The hallway','The deep end'],
 tips:['Break or lunch, Main Corridor. Something’s wrong with Hasan’s locker.','Break or lunch, Sports Wing. Darren’s waiting by the pool doors.','Home time, the bus loop. Hasan never made it to the bus.'],
 variants:{saved:'You pulled Hasan out',drowned:'Hasan went under',pole:'The pool hook'}});
freeHooks({mis:'steptwelve',label:'Ask Hasan what happened to his locker',look:{ex:'cry'},cond:()=>D.f.darMad&&!D.f.s12a&&!D.dead.hasan,run:async()=>{
 scene('corridor',{hasan:[150,1,{y:146,ex:'cry'}],you:[120,1,{y:154}]});
 await beat('STEP TWELVE','PART ONE · THE LOCKER');
 prop({t:'tagtext',x:150,y:70,s:'11 STEPS',layer:-5});
 await N('Somebody has written ELEVEN STEPS across Hasan’s locker in Sharpie. Eleven times. The locker is open. It’s empty. Everything he owns is gone.');
 await say('hasan','My books. My phone charger. My mom’s Tupperware. She’s going to kill me before he does.','cry');
 put('kid2',334,-1,{y:146});await walk('kid2',220,80);
 await say('kid2','(wet sleeves) Uh. Your stuff’s in the pool. All of it. The swim team’s doing laps around it.','scared');
 await walk('kid2',340,90);remove('kid2');
 await camZoom(150,120,1.6,400);
 await say('hasan','(very quiet) I said no nicely. I said it NICELY. I said “real friends”. Who does this?','angry');
 await camZoom();
 const c=await choose(['“We’re getting your stuff back. Then we’re getting him.”','“Report it. Go to Mr. Adam.”','“Bro, maybe just say yes next time.”']);
 if(c===0)await say('hasan','(wiping his face) Okay. Okay. Yeah. Getting him. I don’t know how to get anyone. You get him. I’ll stand behind you.','angry');
 else if(c===1)await say('hasan','Mr. Adam? Mr. Adam cried during the fire drill. Mr. Adam can’t protect a sandwich.','sad');
 else{await say('hasan','…Wow. Okay. Get the fuck away from my locker.','angry');(P.grudge=P.grudge||{}).hasan=cal()+1}
 D.f.s12a=1;part('steptwelve',1);return 'stay';
}},[[2,'corridor','hasan'],[4,'corridor','hasan'],[0,'corridor','hasan']]);
freeHooks({mis:'steptwelve',label:'Go and find Darren',look:{},cond:()=>D.f.s12a&&!D.f.s12b&&!D.dead.hasan&&!D.dead.darren,run:async()=>{
 const cast={darren:[230,-1,{y:146,pose:'cross',ex:'cold'}],kid1:[260,-1,{y:144,pose:'cross'}],kid3:[282,-1,{y:146,pose:'cross'}],hasan:[110,1,{y:148,ex:'scared'}],you:[140,1,{y:154}]};
 scene('wing_sports',cast,true);
 await beat('STEP TWELVE','PART TWO · THE POOL DOORS');
 await N('Darren, outside the pool doors, two swimmers behind him in towels. He’s been crying. Then he decided to be scary instead.');
 await say('darren','Hasan. Hey. You came. That’s step twelve, part one. You coming to me.','evil');
 await walk('darren',150,60);
 await say('darren','You know what you did? You made me look like a fucking idiot. In front of a DRONE.','yell');
 pose('darren','grab');if(A.hasan){A.hasan.ex='hurt'}SFX.smack();shake(.6);
 await N('He grabs Hasan by the front of his hoodie and slams him into the trophy case. A trophy falls off. Nobody catches it.');
 await camZoom(140,110,1.7,300);
 const c=await choose([{t:'Shove Darren off him.',tag:'👊'},{t:'Get between them and talk.'},{t:'Yell for Coach.'}]);
 await camZoom();
 if(c===0){const ok=await mash('Shove!',{need:16,time:3});
  if(ok){pose('darren',null);await hit('you','darren',{blood:4});await tw(A.darren,{x:200},250);await say('darren','(wiping his lip) Okay. OKAY. Home time. The pool. You’re both invited.','evil')}
  else{await hit('kid1','you',{blood:6});A.you.hurt=Math.max(A.you.hurt||0,2);await N('One of the swimmers hits you so hard your ears ring. You go down on the wet floor.');await say('darren','Home time. The pool. Bring him.','evil')}}
 else if(c===1){await say('you','Dude. Dude. It was a no. It’s a no. You can’t laminate someone into liking you.');await say('darren','(laughing, which is worse) Watch me.','evil')}
 else{await say('you','COACH!');await N('Coach sticks his head out of the gym, looks at Darren holding Hasan against the glass, says “good grip”, and goes back inside.');await say('darren','Home time. The pool.','evil')}
 pose('darren',null);await Promise.all([walk('darren',340,80),walk('kid1',345,80),walk('kid3',350,80)]);
 D.f.s12b=1;part('steptwelve',2);return 'stay';
}},[[2,'wing_sports','darren'],[4,'wing_sports','darren'],[2,'corridor','hasan'],[4,'corridor','hasan']]);
hook({mis:'steptwelve',period:7,room:'bus',who:'auto',cond:()=>D.f.s12b&&!D.done.steptwelve&&!D.dead.hasan&&!D.dead.darren,run:async()=>{
 scene('bus',{you:[150,1,{y:154}],nivaan:[190,-1,{y:146,pose:'phone',ex:'scared'}]},true);
 await say('nivaan','(running up) Where’s Hasan? Hasan’s not here. His bag’s here. HE’S not here.','scared');
 await N('The pool. Of course the pool.');
 scene('pool',{darren:[150,-1,{y:110,ex:'evil'}],kid1:[200,-1,{y:110,pose:'cross'}],kid3:[222,-1,{y:110,pose:'cross'}],hasan:[150,1,{y:150,pose:'swim',ex:'scared'}],you:[24,1,{y:112}]},true);
 cue('tension');
 await beat('STEP TWELVE','PART THREE · THE DEEP END');
 A.hasan._drown=1;
 await N('Hasan, in the deep end, in his clothes. Every time he comes up, Darren pushes him back down with the pool hook. Calmly. Like he’s cleaning the filter.');
 await say('darren','Step twelve: you find out what it feels like. To go under. To have nobody pull you out.','evil');
 await walk('you',110,140);
 const c=await choose([{t:'Dive in for Hasan.',tag:'🌊'},{t:'Grab the pool hook out of Darren’s hands.',tag:'🩸'},{t:'Beg Darren to stop.'}]);
 if(c===0){await tw(A.you,{x:130,y:150},450);A.you.pose='swim';const ok=await mash('Swim!',{need:20,time:4.5,info:'He’s going under. MASH!'});
  A.hasan._drown=0;
  if(ok){await walk('you',140,90);await N('You get an arm under his. You drag him to the side. He’s coughing up chlorine and crying and alive.');A.hasan.ex='cry';
   await say('darren','(the hook slipping out of his hands, staring) …I wasn’t gonna. I wasn’t really gonna.','sad');
   await say('hasan','(between coughs) YES. YOU. WERE.','yell');
   await N('Darren sits down on the wet tiles and cries like a little kid. His swimmers walk out on him.');await complete('steptwelve','saved')}
  else{await N('You’re too slow. The water is too cold. By the time you get to him, he’s not fighting anymore. You and Nivaan drag him out together. The ambulance takes eleven minutes.');
   A.hasan.pose='lie';A.hasan.ex='closed';D.f.hasanHosp=cal();await say('darren','(backing away) He’s fine. He’s FINE. He’s being dramatic. He’s always dramatic—','scared');await complete('steptwelve','drowned')}}
 else if(c===1){await walk('you',140,120);pose('you','grab');SFX.smack();await N('You rip the hook out of his hands. It swings. You didn’t mean for it to swing.');
  SFX.crunch();shake(1.2);blood(A.darren.x,A.darren.y-24,40,1,90,A.darren.y+2);A.darren.pose='lie';A.darren.ex='hurt';
  await tw(A.darren,{y:150},400);await N('Darren goes into the water face-first. He doesn’t come back up for a long time. Hasan swims to the side by himself.');
  A.hasan._drown=0;A.hasan.pose=null;await tw(A.hasan,{x:120,y:112},500);D.dead.darren=1;A.darren.dead='lie';
  await say('hasan','(shaking, dripping) …We were never here. We were NEVER here.','scared');await complete('steptwelve','pole')}
 else{await say('you','DARREN. Please. Please, man. Stop.');await say('darren','(laughing) Say please again.','evil');await say('you','Please.');
  await N('He lets the hook go slack. Hasan claws his way to the side. Darren walks out past you, drying his hands on his towel.');
  A.hasan._drown=0;await say('darren','Remember who stopped. It wasn’t you.','cold');await complete('steptwelve','drowned')}
 return 'ended';
}});

/* ================= JADE ================= */
mission('jade',{name:'Jade',icon:'💔',who:['jade','brayden'],goal:'Take Jade from Brayden. Then survive what happens next.',
 blurb:'Brayden screams at his girlfriend Jade in the cafeteria every single day, and every single day she takes it. Today she looks at you while he’s doing it.',
 parts:['The cafeteria','The library','The bus loop','The corridor','The food court'],
 tips:['Break or lunch, the cafeteria. Brayden’s yelling again.','Break or lunch, the library. Jade’s hiding in the back.','Home time, the bus loop. Brayden knows.','Break or lunch, Main Corridor. Jade wants everyone to see.','After school, Fair City Mall food court. Brayden brought flowers.'],
 variants:{you:'She picked you',back:'She went back to him',dumped:'You dumped her first'}});
freeHooks({mis:'jade',label:'Watch Brayden scream at Jade',look:{ex:'angry'},cond:()=>!D.f.jd1&&!D.dead.jade&&!D.dead.brayden,run:async()=>{
 scene('canteen',{brayden:[180,-1,{y:146,ex:'yell',pose:'point'}],jade:[150,1,{y:146,ex:'sad',pose:'cross'}],kaylee:[220,-1,{y:150,pose:'sit'}],you:[90,1,{y:154}]},true);
 await beat('JADE','PART ONE · THE CAFETERIA');
 await say('brayden','You don’t TEXT him back. You don’t LOOK at him. Are you stupid? Are you actually stupid?','yell');
 await N('The whole cafeteria has gone quiet the way it does for a fight. Jade isn’t crying. She’s looking past Brayden’s shoulder. At you.');
 await camZoom(150,110,1.8,500);await wait(TEST?0:400);await camZoom();
 const c=await choose(['“Yo. Brayden. Shut the fuck up.”','Walk over and stand next to Jade.','Keep eating. Not your business.']);
 if(c===0){await say('brayden','(turning) The fuck did you just say?','angry');await say('you','You heard me. Everybody heard me. Everybody’s been hearing you for a month.');
  await N('Somebody at the back table says “OHHHH”. Then everybody does. Brayden’s ears go red. He kicks a chair over and leaves.');await walk('brayden',340,100)}
 else if(c===1){await walk('you',134,70);face('you','brayden');await N('You don’t say anything. You just stand there next to her. It’s enough. Brayden looks at you, looks at her, and laughs like it’s a joke he doesn’t get.');
  await say('brayden','Whatever. She’ll be back. She always comes back.','smirk');await walk('brayden',340,100)}
 else{await N('Brayden keeps going for two more minutes. When he leaves, Jade drops a napkin on your tray. LIBRARY. LUNCH.');}
 remove('brayden');
 if(c!==2){await say('jade','(quietly) …Thanks. Nobody ever does that. Back of the library. I hide there. Come find me if you want.','blush')}
 D.f.jd1=1;part('jade',1);return 'stay';
}},[[2,'canteen','jade'],[4,'canteen','jade']]);
freeHooks({mis:'jade',label:'Find Jade behind the shelves',look:{pose:'sit'},cond:()=>D.f.jd1&&!D.f.jd2&&!D.dead.jade,run:async()=>{
 scene('library',{jade:[220,-1,{y:146,pose:'sit',hold:'phone'}],you:[170,1,{y:154}]},true);
 await beat('JADE','PART TWO · THE LIBRARY');
 await say('jade','Hey. You came. Nobody comes back here. That’s the point.','happy');
 await say('jade','He wasn’t always like that. He used to be funny. Now he checks my phone like he’s a cop. He IS a cop. A tiny, stupid cop.','sad');
 await say('jade','(laughing at herself) Sorry. I’m trauma dumping on you behind the encyclopedias. Very romantic.','smirk');
 const c=await choose(['“So dump him. Hang out with me instead.”','“You deserve way better than that dude.”','“I should probably not get involved.”']);
 if(c===2){await say('jade','(face going flat) Right. Yeah. Nobody should. That’s kind of the whole problem.','cold');await walk('you',60,80);(P.grudge=P.grudge||{}).jade=cal()+1;D.f.jdOut=1;D.f.jd2=1;part('jade',2);return 'stay'}
 await say('jade',c===0?'(staring at you) …Are you asking me out? Behind the encyclopedias?':'(smiling, a bit) Say that again. Slower.','blush');
 await say('you',c===0?'Yeah. Yeah, I am.':'You deserve better than that dude.');
 await say('jade','Okay. Yeah. Okay. He’s gonna find out by home time, you know that, right? Everything gets back to him.','scared');
 await N('She holds your hand under the table for about four seconds. Then a librarian walks past, and she lets go like it burned her.');
 D.f.jd2=1;D.f.jdYou=1;part('jade',2);return 'stay';
}},[[2,'library','jade'],[4,'library','jade']]);
hook({mis:'jade',period:7,room:'bus',who:'brayden',label:'Brayden’s waiting by the bus',look:{pose:'cross',ex:'angry'},cond:()=>D.f.jdYou&&!D.f.jd3&&!D.dead.brayden,run:async()=>{
 scene('bus',{brayden:[200,-1,{y:146,ex:'angry'}],jaxon:[226,-1,{y:144,pose:'cross'}],kid4:[246,-1,{y:146,pose:'cross'}],you:[140,1,{y:154}]},true);
 cue('fight');await beat('JADE','PART THREE · THE BUS LOOP');
 await say('brayden','Library. Holding hands. Under the table. You think Kaylee doesn’t have eyes? Kaylee has like forty eyes.','yell');
 await walk('brayden',160,80);
 const c=await choose([{t:'Swing first.',tag:'👊'},{t:'Take the hit. Don’t fight back.'},{t:'Run for the bus.'}]);
 if(c===0){const ok=await mash('FIGHT',{need:20,time:4});
  if(ok){await hit('you','brayden',{blood:8});await hit('you','brayden',{blood:6,pose:'punch'});A.brayden.pose='lie';A.brayden.hurt=2;await N('He goes down in front of the whole bus loop. Jaxon looks at you, looks at Brayden, and decides he has somewhere else to be.');D.f.jdWon=1}
  else{await hit('brayden','you',{blood:8});await hit('jaxon','you',{blood:6});A.you.hurt=3;await N('It’s three on one. It goes exactly like three on one. Somebody films it. By eight o’clock it has a remix.');D.money=Math.max(0,(D.money||0)-3);updateLoc()}}
 else if(c===1){await hit('brayden','you',{blood:10});A.you.hurt=2;await N('He hits you once, hard, in the mouth. You don’t hit back. You just look at him. Somehow that’s worse for him. Everybody saw it.');D.f.jdWon=1}
 else{await walk('you',-20,150);await N('You make the bus. Brayden punches the window next to your face. Thirty kids watch you not get off.');D.f.jdRan=1}
 await say('brayden','(spitting) This isn’t over. She’s MINE. She’s been mine since sixth grade.','evil');
 D.f.jd3=1;part('jade',3);return c===2?'ended':'stay';
}});
freeHooks({mis:'jade',label:'Walk the corridor with Jade',look:{ex:'happy'},cond:()=>D.f.jd3&&!D.f.jd4&&!D.dead.jade,run:async()=>{
 scene('corridor',{jade:[60,1,{y:150,ex:'happy'}],you:[40,1,{y:154}],kaylee:[200,-1,{y:146,pose:'phone'}],brayden:[270,-1,{y:146,pose:'cross',ex:'angry'}]},true);
 await beat('JADE','PART FOUR · THE CORRIDOR');
 await say('jade','I want everyone to see. All the way down. Past him. Don’t walk fast.','smirk');
 await N('She takes your hand. In public. In the Main Corridor, at break, which at Highgate is basically on television.');
 await Promise.all([walk('jade',230,40),walk('you',212,40)]);
 await camZoom(250,110,1.6,400);
 await say('brayden','(through his teeth) Wow. Wow. Classy, Jade.','angry');
 await say('jade','(not stopping) Bye, Brayden.','smirk');
 await camZoom();
 await N('Kaylee films the whole thing. It has nine hundred views before Period 3.');
 await say('jade','(when you’re round the corner, letting go, shaking) Oh my god. Oh my god, did you see his face. I’m gonna throw up. That was the best thing I’ve ever done.','laugh');
 const c=await choose(['“You okay?”','“Was that for me, or for him?”']);
 if(c===1){await say('jade','(too long a pause) …For you. Obviously. Obviously for you.','scared');D.f.jdDoubt=1}
 else await say('jade','No. Yes. Ask me tomorrow.','happy');
 D.f.jd4=1;part('jade',4);return 'stay';
}},[[2,'corridor','jade'],[4,'corridor','jade']]);
hook({mis:'jade',period:8,room:'foodcourt',who:'auto',cond:()=>D.f.jd4&&!D.done.jade&&!D.dead.jade&&!D.dead.brayden,run:async()=>{
 scene('foodcourt',{jade:[150,1,{y:150,pose:'sit',ex:'happy'}],you:[180,-1,{y:150,pose:'sit'}],kaylee:[240,-1,{y:150,pose:'phone'}],jaxon:[262,-1,{y:146,pose:'cross'}]},true);
 await beat('JADE','PART FIVE · THE FOOD COURT');
 await N('You and Jade are splitting a pretzel. Then the whole food court goes “awww”, sarcastically, at the same time.');
 put('brayden',340,-1,{y:146,hold:'flower',ex:'sad'});await walk('brayden',200,50);
 await N('Brayden. With roses from the gas station, still in the plastic. His eyes are red. He’s practiced this.');
 await say('brayden','Jade. I’m sorry. I’m so sorry. I’ll stop checking your phone. I’ll stop everything. Just— come back. Please. In front of everybody. I’m saying it in front of everybody.','cry');
 await camZoom(170,110,1.8,500);
 const c=await choose(['Hold Jade’s hand on the table.','Say nothing. Let her choose.','“Take him back. I’m done.”']);
 await camZoom();
 if(c===2){await say('jade','(staring at you) …Wow. Okay. Wow.','shock');await N('You get up and walk out. Behind you, Jade throws the pretzel at you. Then at Brayden. Then at Kaylee for filming. She leaves alone.');await complete('jade','dumped');return 'stay'}
 const you=c===0&&!D.f.jdDoubt?true:c===0?Math.random()<.6:(D.f.jdWon?Math.random()<.6:Math.random()<.35);
 if(you){await say('jade','(not letting go of your hand) Brayden. Go home.','cold');
  await N('Brayden stands there with his gas station roses for a long time. Then he puts them in the trash and walks out. The food court applauds, slowly, for no one.');
  hold('brayden',null);await walk('brayden',340,70);remove('brayden');await say('jade','(quietly) I picked you. Don’t make me regret it.','blush');await complete('jade','you')}
 else{await say('jade','(standing up, not looking at you) …He said in front of everybody. Nobody’s ever said anything in front of everybody for me.','sad');
  await walk('jade',196,60);hold('brayden',null);hold('jade','flower');
  await N('She takes the roses. She takes his hand. She walks out with him without looking back once. Brayden looks back. Brayden smiles at you.');
  await Promise.all([walk('jade',340,60),walk('brayden',350,60)]);remove('jade');remove('brayden');
  await say('kaylee','(filming you) Damn. Damn. Say something for the people.','laugh');await complete('jade','back')}
 return 'stay';
}});
/* after: how it shows around school */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);
 if(D&&!D.weekend&&D.done&&P.done.jade==='you'&&D.period>=2&&D.period<=4&&room==='canteen'&&!A.jade&&!D.dead.jade)put('jade',120,1,{y:150,pose:'sit',ex:'happy'});
 if(D&&!D.weekend&&P.done.jade==='back'&&room==='corridor'&&[2,4].includes(D.period)&&!A.brayden&&!D.dead.brayden){put('brayden',230,-1,{y:146,pose:'cross',ex:'smirk'});if(!D.dead.jade)put('jade',244,-1,{y:146,ex:'sad'})}
 return r}}
if(typeof CHAT!=='undefined'){CHAT.jade=['Brayden texted me “u up” at 4am. Like a psycho. Like a little psycho.','If you’re gonna stare, at least be weird about it in a cute way.','Kaylee films everything. Everything. She filmed her own grandma’s funeral.'];
 CHAT.brayden=['What are you looking at? Keep walking.','I’m not jealous. I’m PROTECTIVE. It’s different. Look it up.','Bro, you think you’re funny? You’re not funny.']}

/* ================= THE SUPPLY CLOSET ================= */
mission('closet',{name:'The Supply Closet',icon:'🧻',who:['coach','pat'],goal:'Find out what Coach and Pat are doing in the supply closet every lunch. Then use it.',
 blurb:'Every lunch, Coach and Pat both disappear. Every lunch, the supply closet by the bathrooms starts making noises like somebody’s moving a filing cabinet. Repeatedly. Rhythmically.',
 parts:['Lunch: the noises','Use it'],tips:['Lunch, Main Corridor. Stand by the supply closet. Listen.','Break or lunch, anywhere. Decide what to do with what you saw.'],
 variants:{pe:'Never doing PE again',viral:'Posted it',adam:'Told Mr. Adam'}});
hook({mis:'closet',period:4,room:'corridor',who:'auto',cond:()=>!D.f.cl1&&!D.dead.coach&&!D.dead.pat&&cal()>=2,run:async()=>{
 scene('corridor',{you:[200,1,{y:154}],nivaan:[176,1,{y:150,pose:'phone'}],arjun:[222,-1,{y:150,pose:'cross'}]});
 await beat('THE SUPPLY CLOSET','');
 await N('There’s a noise coming from the supply closet. A rhythmic, wooden noise. Like someone very slowly moving a filing cabinet. Over and over. With great commitment.');
 SFX.thud();await wait(300);SFX.thud();await wait(300);SFX.thud();shake(.3);
 await say('arjun','That’s Coach. I know that grunt. That’s his deadlift grunt.','shock');
 await say('nivaan','Chat. CHAT. I’m not streaming this. I’m not. (he is) This is for science.','scared');
 const c=await choose(['Open the door.','Knock, very politely.','Walk away. You’re a child.']);
 if(c===2){await N('You walk away. Behind you, Arjun opens the door. The scream is two people at once. Arjun doesn’t speak for the rest of the day.');D.f.cl1=1;return 'stay'}
 if(c===1){SFX.click();await N('You knock. The noise stops instantly. Total silence. Then Pat’s voice, very high: “OCCUPIED. INVENTORY.”');}
 put('coach',236,1,{y:150,ex:'shock'});put('pat',248,-1,{y:150,ex:'shock'});
 SFX.door();await N('The door bangs open. Coach: shirt inside out, Pat’s hairnet on. Pat: apron on backwards, ladle raised. Neither of them is out of breath. Extremely.');
 await camZoom(242,110,1.9,400);
 await say('coach','INVENTORY. We were doing. Inventory.','yell');
 await say('pat','Forty-one rolls of paper towel. Counted ’em. Twice. Thoroughly.','angry');
 await camZoom();
 await say('coach','(peeling a five off a roll of cash, holding it out) You didn’t see anything. Nobody saw anything. Nobody’s even here.','scared');
 D.money=(D.money||0)+5;updateLoc();
 await N('He gives you five dollars. Then Arjun puts his hand out too, and he gives Arjun five dollars. Then Nivaan. Coach is broke by the time he’s done.');
 await Promise.all([walk('coach',-20,110),walk('pat',340,90)]);remove('coach');remove('pat');
 D.f.cl1=1;part('closet',1);return 'stay';
}});
freeHooks({mis:'closet',label:'“About the supply closet…”',look:{ex:'smirk'},cond:()=>D.f.cl1&&!D.done.closet&&!D.dead.nivaan,run:async()=>{
 scene(D.room||'corridor',{nivaan:[180,-1,{y:146,pose:'phone'}],you:[150,1,{y:154}]});
 await say('nivaan','I have it. I have the whole thing. The hairnet. The ladle. Coach saying “inventory” like a hostage.','evil');
 const c=await choose(['Blackmail Coach: no PE, forever.','Post it. Let the school have it.','Show Mr. Adam.']);
 if(c===0){scene('gym',{coach:[120,1,{y:146,pose:'hips'}],you:[160,-1,{y:154}]},true);await say('you','So, Coach. Paper towels.');
  await say('coach','(very quietly) …What do you want.','scared');await say('you','I’m excused from PE. Forever. Medical reasons.');
  await say('coach','What medical reasons.');await say('you','I saw you come out of a closet in a hairnet.');
  await say('coach','(writing it down) “Medical reasons.” Get out of my gym. Please. I’m begging you.','cry');await complete('closet','pe')}
 else if(c===1){await N('Nivaan posts it. By last period, there are posters. Someone has made a song. The cafeteria line chants “INVENTORY” every time Pat picks up a ladle.');
  await N('Pat doesn’t serve stew for a week. Coach makes everyone run until two kids pass out. Everybody agrees it was worth it.');await complete('closet','viral')}
 else{scene('corridor',{adam:[200,-1,{y:146}],you:[170,1,{y:154}]});await say('adam','(watching the video, his face falling apart) Pat? MY Pat? She makes me a grilled cheese every Thursday. She cuts it in TRIANGLES.','cry');
  await N('Mr. Adam walks to the gym very calmly. Thirty seconds later, the whole school hears Coach get hit with a fire extinguisher.');await complete('closet','adam')}
 return 'stay';
}},[[2,'corridor','nivaan'],[4,'canteen','nivaan'],[2,'canteen','nivaan'],[4,'corridor','nivaan']]);

/* ================= BAYONET OF MY HEART ================= */
mission('bayonet',{name:'Bayonet of My Heart',icon:'📕',who:['grieve','arjun'],goal:'Find out what Mr. Grieve is writing at his desk, then decide what to do with it.',
 blurb:'Mr. Grieve writes in a leather notebook every lesson and covers it with his arm when anyone walks past. Arjun says it’s a kill list. It’s worse than a kill list.',
 parts:['The notebook','History class'],tips:['Break or lunch, History room (Main Corridor). Empty room, Mr. Grieve’s desk.','History, any lesson after you’ve read it. Or give it back.'],
 variants:{returned:'Gave it back',read:'Arjun read it aloud',sold:'Sold it to Nivaan'}});
async function readBayonet(){
 await N('A leather notebook. On the front, embossed in gold: BAYONET OF MY HEART. A NOVEL. BY CAPTAIN R. GRIEVE (RET.).');
 await N('Chapter One: “The General’s trenches were deep, and the night was long, and Lieutenant Rosalind had never seen a man hold a musket with such… purpose.”');
 await N('Chapter Four: “Again and again the cannon fired, and Rosalind cried out the name of every battle he had ever won. All fourteen of them. Alphabetically.”');
 await N('There are three hundred and twelve pages. There are diagrams. One of them is labelled “the advance”.');
 const c=await choose(['Take it.','Put it back exactly where it was.']);
 if(c===1){await N('You put it back. Your soul does not go back with it.');D.f.bay1=1;part('bayonet',1);D.f.bayBack=1;return 'stay'}
 give('notebook');ITEMS.notebook=ITEMS.notebook||'BAYONET OF MY HEART (a novel)';D.f.bay1=1;part('bayonet',1);return 'stay';
}
spot({room:'history',period:[2,4],x:58,y:150,label:'Read the leather notebook on Mr. Grieve’s desk',short:'NOTEBOOK',mis:'bayonet',cond:()=>!D.f.bay1&&!A.grieve,run:async()=>readBayonet()});
freeHooks({mis:'bayonet',label:'“I found something of Mr. Grieve’s…”',look:{ex:'smirk'},cond:()=>D.f.bay1&&has('notebook')&&!D.done.bayonet&&!D.dead.arjun,run:async()=>{
 scene(D.room||'corridor',{arjun:[190,-1,{y:146,ex:'smirk'}],nivaan:[214,-1,{y:146,pose:'phone'}],you:[160,1,{y:154}]});
 await say('arjun','(flipping pages, going pale, then delighted) “He loaded the cannon with the tenderness of a man who has read the manual twice.” Bro. BRO. This is the best fucking day of my life.','laugh');
 const c=await choose(['Let Arjun read it out in History.','Sell it to Nivaan for $10.','Give it back to Mr. Grieve.']);
 if(c===1){D.items=D.items.filter(i=>i!=='notebook');D.money=(D.money||0)+10;updateLoc();await say('nivaan','Chat is getting an audiobook tonight. I’m doing the voices. I’m doing ALL the voices.','evil');await complete('bayonet','sold');return 'stay'}
 if(c===2){scene('history',{grieve:[60,1,{y:146,pose:'sit'}],you:[110,-1,{y:154}]},true);D.items=D.items.filter(i=>i!=='notebook');
  await say('grieve','(snatching it, holding it to his chest) Did you read it.','cold');const k=await choose(['“No, sir.”','“Chapter four was… a lot, sir.”']);
  if(k===0)await say('grieve','Good. Good. You have an A, forever. For your discretion. Get out.','sad');
  else await say('grieve','(after a long silence) …It was based on a true story. Get out. You have an A. I hate that you have an A.','cry');
  P.grieveA=1;await complete('bayonet','returned');return 'stay'}
 scene('history',{grieve:[50,1,{y:146,pose:'hips'}],arjun:[200,-1,{y:146,hold:'book'}],kid1:[150,1,{y:150,pose:'sit'}],kid2:[240,-1,{y:150,pose:'sit'}],you:[120,1,{y:150,pose:'sit'}]},true);
 await say('grieve','Arjun. You’re standing. Why are you standing.','cold');
 await say('arjun','(clearing his throat) “Bayonet of My Heart. Chapter Four.”','evil');
 await camZoom(50,110,2,300);await N('Mr. Grieve’s face does something you have never seen a face do. It goes white, then red, then a sort of military green.');await camZoom();
 await say('arjun','“Again and again the cannon fired—”','laugh');classLaugh&&classLaugh(400);
 await say('grieve','SIT. DOWN.','yell');SFX.bang();shake(1.4);flash('#fff',.6);
 await N('He fires a musket into the ceiling. A real one. From the display case. Plaster comes down on everyone. Arjun sits down. The class does not stop laughing for nine minutes.');
 await say('grieve','(shaking) Everybody fails. Everybody. Forever. For the rest of your lives.','evil');
 D.items=D.items.filter(i=>i!=='notebook');await complete('bayonet','read');return 'stay';
}},[[2,'corridor','arjun'],[4,'canteen','arjun'],[2,'canteen','arjun'],[4,'corridor','arjun']]);

/* ================= the kids swear like kids ================= */
if(typeof CHAT!=='undefined')for(const [id,l] of Object.entries({
 hasan:['bro I’m so fucking tired. I’ve been tired since fifth grade.','who the hell puts raisins in a cookie. psychopaths. that’s who.'],
 arjun:['shut the fuck up, I’m thinking. I’m always thinking. it’s exhausting being this smart.','this whole school is a shithole with a mascot.'],
 omer:['If one more person touches my shorts I’m gonna fucking lose it.','Coach called me “son” today. I’m not his son. I’d rather be dead.'],
 nivaan:['chat is fucking LIVID right now','I’ve been banned from three platforms this week. that’s a personal best, honestly.'],
 paul:['I fucking love this school. I hate it. I love it. I don’t know. I punched a wall.','bro my mom packed me a salad. a SALAD. what am I, a fucking rabbit?'],
 david:['the student council is a dictatorship and I’m the dictator and I still can’t get the vending machine fixed. democracy is bullshit.'],
 kenneth:['I’m not short. Everyone else is just aggressively tall. it’s a hate crime.'],
 dheva:['touch my hair and I will end your entire bloodline. respectfully.'],
 marcus:['I don’t swear. (pause) okay that shit was fucking insane though.'],
 sean:['I have never once been chill in my life and I’m not starting now, so fuck it.'],
 stella:['If Kaylee films me one more time I’m shoving that phone up her ass. Lovingly.'],
 angelo:['Locker 13 doesn’t do refunds. Locker 13 doesn’t do feelings. Locker 13 does business, bitch.']
}))if(CHAT[id])CHAT[id].push(...l);

/* props for the arcs */
{const _dp=drawProp;drawProp=function(p){if(p.t==='tagtext'){const x=Math.round(p.x),y=Math.round(p.y);for(let i=0;i<3;i++)pxc(p.s,x+((i*7)%5)-2,y+i*9,'#1a1a1a');return}return _dp(p)}}
/* the people these arcs need are actually standing there when their step is up */
const ARC_MIS=['steptwelve','jade','closet','bayonet'];
for(const id of['jade','brayden','darren','kaylee','jaxon'])if(typeof SPAWNED!=='undefined')SPAWNED.add(id);
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(!D||D.weekend||TEST&&!TEST.auto)return r;
 const per=D.period,at=x=>x==null?true:Array.isArray(x)?x.includes(per):x===per;
 let n=0;for(const h of HOOKS){if(!ARC_MIS.includes(h.mis)||h.room!==room||!at(h.period)||h.who==='auto'||A[h.who]||D.dead[h.who])continue;
  let ok=false;try{ok=!h.cond||h.cond()}catch(e){}if(!ok)continue;put(h.who,250-n*26,-1,{y:146});n++}
 return r}}
