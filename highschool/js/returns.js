'use strict';
/* =====================================================================
   HIGHSCHOOL — RETURNS
   In Period 3 you can take a "return": a pass to any classroom, odd-day
   or even-day. They're mostly empty. People use them to retake tests,
   or to hide with their friends. Something different happens in each.
   ===================================================================== */
const RETURNS=[];
Object.assign(INTEL,{shermianList:'Ms. Sherman keeps a list called NOT PASSING. Tyler is crossed out.',byteWatching:'Mrs. Byte watches every webcam in the school.',adamKey:'Mr. Adam carries the key to the PA system. He wants to tell everyone.'});
function ret(o){
 const mis='ret_'+o.id;
 mission(mis,{name:'Return: '+o.name,icon:'🎟️',who:o.who||[],blurb:o.blurb,parts:['Period 3: take a return to '+ROOMS[o.room].name.split(' —')[0]],tips:['At the Period 3 bell, take a return pass. Go to '+ROOMS[o.room].name.split(' —')[0]+'.'],variants:o.variants||{}});
 const r=Object.assign({mis},o);RETURNS.push(r);
 hook({mis,period:3,room:o.room,who:'return',cond:()=>false,run:o.run});
}
const retDone=id=>(P.retRun||{})[id];
async function openReturns(){
 const o=$('map');o.hidden=false;
 o.innerHTML='<h2>Return pass · '+PERIODS[3].name+'</h2><div class="box"><p style="color:#a99aa8;margin:0 0 10px;font-size:13px">Any classroom that isn’t having a lesson right now. Mostly empty. Mostly.</p><div class="grid"></div></div>';
 const grid=o.querySelector('.grid');
 const busyRooms=Object.keys(TEACH[3]||{});
 const byRoom={};for(const r of RETURNS){if(busyRooms.includes(r.room)||(r.cond&&!r.cond()))continue;(byRoom[r.room]=byRoom[r.room]||[]).push(r)}
 for(const room in byRoom){
  const list=byRoom[room],fresh=list.filter(r=>!retDone(r.id)),r=pick(fresh.length?fresh:list);
  const b=document.createElement('button');b.className='loc';b.innerHTML='<b></b><span></span>'+(P.done[r.mis]?'':'<em></em>');
  b.querySelector('b').textContent=ROOMS[room].name.split(' —')[0];
  b.querySelector('span').textContent=r.hint||'Empty. Probably.';
  if(!P.done[r.mis])b.querySelector('em').textContent='🎟️ Something’s happening here';
  b.onclick=()=>{audio();SFX.door();o.hidden=true;runReturn(r)};grid.appendChild(b);
 }
}
function runReturn(r){
 D.room=r.room;D.x=24;updateLoc();
 scene(r.room,{you:[24,1,{y:156}]},true);
 return runHook({mis:r.mis,run:async()=>{const v=await r.run();P.retRun=P.retRun||{};P.retRun[r.id]=1;save();return v}});
}
/* the bell, again, now with returns in Period 3 */
bell=async function(){
 const r=myClass(),t=TEACH[D.period]&&TEACH[D.period][r];
 if(D.period===3&&lockdownDue()){D.room=r;return runHook(LOCKHOOK)}
 if(!TEST&&ROOM!=='corridor'){D.room='corridor';buildRoom('corridor');updateLoc()}
 const tname=t&&K[t]?K[t].n:'',rn=ROOMS[r].name.split(' —')[0];
 const opts=[{t:'Go to class: '+rn+(tname?' with '+tname:'')+'.'}];
 const canRet=D.period===3&&(D.dayType||'odd')==='odd';
 if(canRet)opts.push({t:'Take a return. Go to any empty classroom.',tag:'🎟️'});
 opts.push({t:'Skip class. Sneak around the school.',tag:'skip'},{t:'Skip class. Run out the back gate, into the woods.',tag:'run'});
 const c=await choose(opts,'The bell. '+PERIODS[D.period].name+'. You’re meant to be in '+rn+'.');
 const pickd=opts[c];
 if(c===0)return enterRoom(r);
 if(pickd.tag==='🎟️'){toast('Return pass. Ms. Sherman signs it without looking up.');return openReturns()}
 D.f.skipped=(D.f.skipped||0)+1;
 if(pickd.tag==='skip'){toast('Skipping '+rn+'. Don’t get caught.');openMap.skip=1;return openMap(true)}
 return runToWoods();
};

/* ---------------- the returns ---------------- */
Object.assign(DEATHS,{
 extracredit:{name:'Extra Credit',desc:'The one with the skull on it was, in fact, the bad one.',hint:'Return: Chem Lab. Read the labels. Then don’t.'},
 reenact:{name:'Historically Accurate',desc:'Mr. Grieve used a real sword. He always uses a real sword.',hint:'Return: History. Pick a side. Pick the winning side.'},
 corpse:{name:'Method Acting',desc:'You were playing a corpse. Now you’re very convincing.',hint:'Return: Main Hall. Don’t move. Whatever happens. Don’t move.'}
});

ret({id:'key',room:'maths',name:'The Answer Key',who:['marcus','paul'],hint:'The lights are off. Somebody’s whispering.',
 blurb:'Ms. Sherman is teaching out in the Trailer, so her real classroom is empty. Marcus and Paul are in it, looking for the answer key.',
 variants:{key:'Got the key',cat:'Met Mr. Biscuits'},run:async()=>{
 put('marcus',150,1,{y:146,pose:'reach'});put('paul',196,-1,{y:150});
 await N('Ms. Sherman’s real classroom, with the lights off. She’s out in the Trailer. Marcus is going through her desk. Paul is holding the door shut with his whole body, even though nobody is trying to open it.');
 await say('marcus','Answer key for Friday’s test. It’s in here. A woman like that keeps things close.','smirk');
 await say('paul','If she comes back I’m jumping out the window. I’ve decided. I’ve made peace with it.','scared');
 const c=await choose(['Check the top drawer.','Check the bottom drawer. The locked one.','Check the little fridge behind her desk.']);
 if(c===0){SFX.pick();await N('Top drawer: forty-one red pens. A photo of every kid in the school with their eyes colored in. A sandwich from what looks like last spring.');await say('marcus','Okay, so that’s normal for her.','shock')}
 if(c===1){SFX.locker();hold('marcus','plan');await N('The bottom drawer pops open. The answer key is right on top. Under it is another answer key. Under that one, a list of names called “NOT PASSING”. Some of them are crossed out. Tyler’s is crossed out.');await say('marcus','(very quietly) We’ve got the key. We’ve also got a murder list. That’s a two-for-one I didn’t ask for.','shock');intel('shermianList');await complete('ret_key','key');return}
 SFX.door();await N('Inside the mini fridge, sitting on a little cushion, very cold, perfectly preserved, is a fluffy ginger cat. Its eyes are open. Its eyes are following you.');
 await say('paul','(screaming without making any noise)','scared');
 await say('marcus','Mr. Biscuits. Hi, Mr. Biscuits. We’re going to close the door now, Mr. Biscuits.','scared');
 await N('As the fridge door closes, you could swear the cat blinks.');
 intel('shermianCat');await complete('ret_key','cat');
}});

ret({id:'flasks',room:'chem',name:'Extra Credit',who:['voss','nivaan'],hint:'Mr. Voss is in here. Smiling.',
 blurb:'Mr. Voss offers extra credit to anyone who comes to his lab during a return. The extra credit is drinking things.',
 variants:{green:'Turned green',smart:'Saw the answer'},run:async()=>{
 put('voss',200,-1,{y:142,pose:'hips'});
 const f1=prop({t:'flask',x:150,y:132}),f2=prop({t:'flask',x:166,y:132}),f3=prop({t:'flask',x:182,y:132});
 await say('voss','A return student! Wonderful. Extra credit, today only. Three flasks. One makes you smarter. One makes you green. One makes you a jar.','happy');
 await say('voss','I won’t tell you which. That would be cheating.','evil');
 const c=await choose(['The blue one. It smells like mint.','The green one. It’s fizzing.','The one with the skull drawn on it in Sharpie.']);
 SFX.slurp();await wait(400);
 if(c===2){
  await N('It tastes like batteries and regret. Your throat closes. Then it opens. Then a lot of things come out of it that should have stayed inside.');
  SFX.squelch();blood(A.you.x,A.you.y-28,40,1,90,A.you.y+2);A.you.pose='lie';
  await say('voss','(writing something on a fresh jar label) Ooh. That one’s a jar. Extra credit, though!','happy');
  await die('extracredit');return;
 }
 if(c===1){D.f.infected=(D.f.infected||[]).concat(['you']);A.you.ex='hurt';await N('You turn green. Not a little green. Frog green. It will last until tomorrow. Your mom is going to have questions.');await say('voss','A+, green bean.','happy');await complete('ret_flasks','green');return}
 await N('Your brain goes cold and clear, like somebody opened a window in it. For about ninety seconds you understand everything. Algebra. Your parents. Why Aidan is like that. Then it’s gone, and all you remember is one thing.');
 await N('Mr. Voss has fourteen jars in the back fridge, and the oldest one is from 1987.');
 await say('voss','A+! Smart cookie. Run along now. Don’t remember anything.','evil');
 await complete('ret_flasks','smart');
}});

ret({id:'hastings',room:'history',name:'The Re-enactment',who:['grieve','omer','jacob'],hint:'Mr. Grieve is wearing chain mail.',
 blurb:'Mr. Grieve lets you retake your history test, but only as a live re-enactment. Omer and Jacob are already in armor.',
 variants:{won:'Won the battle',lost:'Lost the battle'},run:async()=>{
 put('grieve',60,1,{y:144,hold:'machete'});put('omer',150,1,{y:146,hold:'bat'});put('jacob',220,-1,{y:146,hold:'bat'});
 await say('grieve','Ah! A return. You’re retaking the Battle of Hastings, 1066. Not the test. The battle.','happy');
 await say('grieve','Omer is William the Conqueror. Jacob is King Harold. You may pick a side. History will judge you.','evil');
 await say('omer','I’m going to conquer SO hard.','angry');
 await say('jacob','I’ve read the Wikipedia. I know how this ends for me. I’m doing it anyway.','sad');
 const c=await choose(['Fight for Omer (William).','Fight for Jacob (Harold).']);
 cue('fight');
 const ok=await mash('CHARGE!',{need:18,time:4,info:'Mash to swing your ruler like a sword!'});
 if(c===1){
  SFX.whoosh();await N('A rubber arrow, fired from somewhere by Mr. Grieve, hits Jacob right in the eye. Historically accurate. Jacob goes down like a tree.');
  A.jacob.pose='lie';A.jacob.hurt=2;
  if(!ok){SFX.crunch();blood(A.you.x,A.you.y-26,40,null,90,A.you.y+2);await N('Mr. Grieve takes your head off with a real sword. In fairness, he did say history would judge you.');await die('reenact');return}
  await say('grieve','Harold lost. You lost. C minus. But a very ENERGETIC C minus.','happy');
  await complete('ret_hastings','lost');return;
 }
 SFX.punch();shake(.8);A.jacob.pose='lie';
 await N('You and Omer charge across the History room, screaming, over the desks. Jacob surrenders immediately and lies down on the carpet.');
 await say('omer','(standing on a desk) ENGLAND IS MINE! I DON’T EVEN LIKE ENGLAND!','yell');
 await say('grieve','A plus! For both of you. Jacob, an F, but historically appropriate.','happy');
 await complete('ret_hastings','won');
}});

ret({id:'model',room:'art',name:'Life Drawing',who:['alex','dheva','dahl'],hint:'Alex and Dheva. Hiding behind the easels.',
 blurb:'Alex and Dheva spend their returns in the art room drawing each other, badly, on purpose. Miss Dahl needs a model.',
 variants:{friends:'Best friends'},run:async()=>{
 put('alex',140,1,{y:146,pose:'paint'});put('dheva',190,-1,{y:146,pose:'paint'});put('dahl',270,-1,{y:142,pose:'hips'});
 await N('Alex and Dheva are behind two easels, drawing each other. Alex has drawn Dheva as a horse. Dheva has drawn Alex as a slightly worse horse.');
 await say('dheva','Seating plan split us up. The trailer’s got assigned seats. This is the only place we get to sit together anymore.','sad');
 await say('alex','We take returns on the same day. Every time. It’s our thing. Don’t make it weird.','smirk');
 await say('dahl','A volunteer! Strip down to your T-shirt and hold this skull. For art.','happy');
 pose('you','hold');
 await N('You stand on a stool holding a skull for twenty minutes. It is cold, and much heavier than a plastic one would be. Miss Dahl keeps saying “Perfect. Perfect. Don’t blink.”');
 await say('alex','(whispering) Is that skull real?','scared');
 await say('dheva','(whispering) Don’t. Don’t ask. Just draw him as a horse.','scared');
 pose('you',null);
 await N('At the end they show you the drawings. You are a horse holding a skull. Both of them gave you very nice hair.');
 await say('alex','Same time next week?','happy');
 await say('dheva','Same time every week. Forever. Until they split us up for real.','happy');
 bond('alex',1);bond('dheva',1);await complete('ret_model','friends');
}});

ret({id:'duet',room:'music',name:'The Duet',who:['sean','toby'],hint:'Someone is playing a love song, badly.',
 blurb:'Sean is in the music room practicing a song for Stella. It is not going well.',
 variants:{song:'The song'},run:async()=>{
 put('sean',150,1,{y:146,pose:'guitar',hold:null});
 await N('Sean is sitting on the edge of the stage with a guitar, playing the same four chords over and over. He has written a song for Stella. It is called “Stella (Stella)”.');
 await say('sean','♪ Stella… Stella… your ball is so round… ♪','closed');
 await say('sean','Is that bad? Be honest. Actually, don’t be honest.','scared');
 if(D.done.toby||P.done.toby){put('toby',-14,1,{y:146});await walk('toby',120,60);await say('toby','Oh, I can help with this. Try going up on the second Stella. Like this. ♪ Stel-LAAA ♪','happy')}
 const r=await meter('Hit the harmony',{speed:1});
 if(r){SFX.ding();await N('You hit the harmony. It actually sounds good. Sean looks at you like you just pulled him out of a river.');await say('sean','That’s IT. That’s the song. I’m playing it for her at lunch. In front of everyone. I’m going to throw up.','happy')}
 else{SFX.bad();await N('You miss the note by about a mile. A window cracks. Sean doesn’t even notice. He’s crying a little at his own lyrics.')}
 await complete('ret_duet','song');
}});

ret({id:'stream',room:'ict',name:'Live From the ICT Room',who:['nivaan'],hint:'Nivaan is livestreaming. 14 viewers.',
 blurb:'Nivaan uses his returns to livestream from the ICT room on the school computers. You’re his guest.',
 variants:{viral:'Went viral',banned:'Got banned'},run:async()=>{
 put('nivaan',160,1,{y:146,pose:'type'});
 await say('nivaan','We’re LIVE. Chat, we have a special guest. Say hi to chat. Chat, say hi.','happy');
 await dms('NIVAAN LIVE 🔴','14 watching',[['them','who is this'],['them','make him lick the keyboard'],['them','first'],['them','is that the school with the murders'],['them','LICK THE KEYBOARD']]);
 const c=await choose(['Lick the keyboard.','Tell chat about the teachers.','Do the worm.']);
 if(c===0){SFX.slurp();await N('You lick the keyboard. The whole row from Q to P. It tastes like eleven years of hands.');await say('nivaan','CHAT IS GOING CRAZY. 40 viewers. FORTY. Do the spacebar.','happy');await complete('ret_stream','viral');return}
 if(c===1){
  await say('you','The teachers here are killing kids. Ms. Sherman. Mr. Voss. Coach. All of them.');
  SFX.static();await N('The stream cuts out. Every monitor in the room goes blue. Then, one at a time, they all show the same thing: a webcam image of you, from behind. Taken right now.');
  await say('byte','(over the speakers, sweetly) Learners! Livestreaming is against the acceptable use policy. Your account has been deleted. Nivaan, you’re next, sweetie.','evil');
  await say('nivaan','(unplugging everything) Chat, I love you, if I die tell my mom I had 14 viewers.','scared');
  intel('byteWatching');await complete('ret_stream','banned');return;
 }
 SFX.thud();await N('You do the worm across the floor of the ICT room. You knock a cable out. Every computer in the school shuts down at once. Somewhere, a teacher screams.');
 await say('nivaan','(reading chat) “bro is him”. Chat says you’re him. I’ve never seen chat say that about anyone.','happy');
 await complete('ret_stream','viral');
}});

ret({id:'laps',room:'pool',name:'Laps',who:['darren','tarn'],hint:'Someone is swimming laps. Alone.',
 blurb:'Darren spends his returns swimming laps on his own. He’d like someone to talk to. He’d like it to be about Hasan.',
 variants:{talk:'Talked to Darren'},cond:()=>!D.dead.darren,run:async()=>{
 put('darren',170,-1,{y:150,pose:'swim'});put('tarn',290,-1,{y:142,pose:'hips'});
 await N('The pool is empty except for one lane. Darren is swimming laps in his prescription goggles, doing a tumble turn at each end and saying something underwater.');
 await walk('darren',150,40);A.darren.pose=null;
 await say('darren','(surfacing) Oh! Hi. Sorry. I talk to myself underwater. It’s where I practice things I’m going to say to Hasan.','happy');
 await say('darren','Today’s was: “Hasan, would you like to see a tumble turn.” I can’t decide if it’s too much.','love');
 await say('you','It’s a lot.');
 await say('darren','It’s a LOT. You’re right. I’ll make it a smaller tumble turn.','happy');
 await say('tarn','(blowing her whistle) No talking in the pool! Talking lets water in! Water in, you drown! You drown, I have paperwork!','evil');
 await walk('tarn',A.you.x+10,70);pose('tarn','grab');SFX.splat();
 await N('She shoves you into the deep end with all your clothes on.');
 const ok=await mash('Get back to the side!',{need:18,time:5,info:'Your jeans weigh about a hundred pounds now. MASH!'});
 pose('tarn',null);
 if(!ok){await N('Darren pulls you out by the collar, very calmly, like he’s done it many times.');await say('darren','Happens to me most days. You get used to it. You don’t, actually.','happy')}
 else await N('You haul yourself out, coughing. Your shoes are full of water. They will never be dry again.');
 bond('darren',1);await complete('ret_laps','talk');
}});

ret({id:'shelf',room:'woodwork',name:'The Trophy Shelf',who:['omer','oakes'],hint:'A band saw is running. Omer is laughing.',
 blurb:'Omer uses his returns to build a shelf for his one trophy. It is a participation trophy. It is the most important thing he owns.',
 variants:{shelf:'The shelf'},run:async()=>{
 put('omer',160,1,{y:146,pose:'saw'});put('oakes',280,-1,{y:142,pose:'hips'});
 await N('Omer is feeding a plank through the band saw with his tongue out in concentration. On the bench next to him is a little gold trophy that says “PARTICIPANT, U12 FOOTBALL, 2017”.');
 await say('omer','It’s getting a shelf. A proper shelf. Mahogany. Well, it’s pine. I’m calling it mahogany.','happy');
 await say('oakes','Keep your fingers away from the blade, son. It doesn’t know the difference between pine and you.','evil');
 SFX.crunch();shake(1);blood(A.omer.x+6,A.omer.y-22,30,1,90,A.omer.y+2);A.omer.hurt=2;
 await N('The saw takes the tip off Omer’s pinky. Just the tip. It lands on the trophy.');
 await say('omer','(looking at it for a long time) …Keep building.','angry');
 await say('oakes','Respect. That’s the spirit of woodwork. Here. Sawdust. Pack it in, it’ll stop the bleeding. It won’t.','happy');
 await N('You help him finish the shelf. It’s wonky. He puts the trophy on it, and his pinky tip next to the trophy, “for the memories”.');
 bond('omer',1);await complete('ret_shelf','shelf');
}});

ret({id:'inkblot',room:'psych',name:'The Personality Test',who:['lyle'],hint:'Dr. Lyle. A stack of ink blots.',
 blurb:'Dr. Lyle uses returns to run “personality tests” on whoever walks in. Every ink blot looks like Aidan.',
 variants:{done:'Tested'},run:async()=>{
 put('lyle',100,1,{y:144,pose:'sit'});
 await say('lyle','Sit. Look at the ink. Tell me what you see. There are no wrong answers. There are, but I won’t tell you which.','smirk');
 const seen=[];
 for(let i=0;i<3;i++){const c=await choose([['A butterfly.','Two people dancing.','A bowl cut.'],['A bat.','A cloud.','A boy at a locker.'],['My mom.','Nothing. It’s just ink.','Aidan. It’s Aidan. It’s been Aidan this whole time.']][i]);seen.push(c)}
 await say('lyle','(scribbling) Fascinating. All three of them were Aidan. Everyone says Aidan. I didn’t draw Aidan. I drew a horse.','shock');
 await say('lyle','Your results: you are, psychologically, a Corey. Congratulations. Or condolences.','happy');
 await complete('ret_inkblot','done');
}});

ret({id:'speech',room:'hall',name:'Rehearsal',who:['adam'],hint:'Mr. Adam is alone on the stage. Practicing.',
 blurb:'Mr. Adam spends Period 3 alone in the hall, rehearsing his speech for the school inspection.',
 variants:{heard:'Heard the speech'},run:async()=>{
 put('adam',160,1,{y:124,pose:'conduct'});
 await say('adam','(to the empty hall) Inspectors! Welcome to Highgate High, where every child is safe, and every child is… is… where every child is.','happy');
 await say('adam','(seeing you) OH. An audience. Sit. Sit down. Tell me if this is good.','shock');
 await say('adam','“Highgate has a ZERO percent disappearance rate.” That’s good, right? It’s a good number. Zero is the best number.','scared');
 await say('adam','“Our teachers are passionate.” Too passionate. They’re SO passionate. Ms. Sherman is passionate about necks. Is that— should I cut that line?','scared');
 const c=await choose(['“Mr. Adam, are you okay?”','“The speech is great, sir.”']);
 if(c===0){await say('adam','(after a very long time) No. No, I’m not. Two weeks. Two weeks until they come and look at everything. I’ve got a key to the PA system in my pocket and I keep thinking, what if I just… told everyone.','sad');await N('He holds out a little brass key. Then he puts it back in his pocket, and laughs too loud.');intel('adamKey')}
 else await say('adam','GREAT. It’s GREAT. I’m going to be GREAT. (He isn’t.)','happy');
 await complete('ret_speech','heard');
}});

ret({id:'cake',room:'chem',name:'Cake for Dad',who:['hasan','voss'],hint:'It smells like cake. In the Chem Lab. Somebody’s humming.',
 blurb:'Food Tech is booked, so Hasan bakes in the Chem Lab on the Bunsen burners. Today it’s a cake for his dad, who works nights and sleeps through dinner.',
 variants:{cake:'The cake'},run:async()=>{
 put('hasan',120,1,{y:146,pose:'hold'});put('voss',280,-1,{y:142,pose:'hips'});
 await say('hasan','My dad gets in at six in the morning. I leave cake on the counter. He texts me a picture of the empty plate. That’s our thing.','happy');
 await say('hasan','Today it’s lemon drizzle. Hold this bowl. Don’t let Mr. Voss near it. He puts things in things.','scared');
 const r=await meter('Fold in the flour gently',{speed:1});
 if(r){await N('It comes out of the oven golden and perfect. Hasan looks at it like it’s a newborn baby.')}
 else{await N('It comes out a bit flat. Hasan says it’s “rustic”. He says it like he’s defending it in court.')}
 await say('voss','(appearing behind you with a pipette) Need any… extra ingredients, boys?','evil');
 await say('hasan','NO THANK YOU MR. VOSS.','yell');
 bond('hasan',1);await complete('ret_cake','cake');
}});

ret({id:'corpse',room:'hall',name:'The Corpse',who:['mia','kayden','pratt'],hint:'Mia and Kayden are rehearsing a murder on the stage.',
 blurb:'Mia and Kayden are rehearsing a murder mystery on the hall stage for the spring show. They need a corpse. Mr. Pratt has a real knife.',
 variants:{corpse:'Best corpse'},run:async()=>{
 put('mia',120,1,{y:150});put('kayden',200,-1,{y:150});put('pratt',260,-1,{y:150,pose:'hips'});
 await say('mia','You’re the body. Lie down. Don’t move. Whatever happens, do not move. It’s very important for my process.','smirk');
 pose('you','lie');
 await say('kayden','(dramatically, holding the knife) “The butler did it.” …Wait, there’s no butler. “The HITTAZ did it.”','yell');
 await say('pratt','(handing Kayden a very real knife) Use this one. Authenticity, Kayden. The audience can smell a fake.','evil');
 const ok=await mash('Don’t move. Hold your breath.',{need:14,time:4,info:'Mash to stay still while Kayden waves a real knife over you!'});
 if(!ok){SFX.squelch();blood(A.you.x,A.you.y-6,40,null,80,A.you.y+2);await N('You twitch. Kayden panics. The knife was real.');await say('pratt','And SCENE. Beautiful. Very convincing. Somebody call someone.','happy');await die('corpse');return}
 await N('You don’t move. Kayden does a seven-minute monologue directly over your face. It’s mostly about his cousin in Wales.');
 pose('you',null);
 await say('mia','Best corpse we’ve ever had. You’re hired. Every return. Forever.','happy');
 await complete('ret_corpse','corpse');
}});

ret({id:'dodge',room:'gym',name:'PE Makeup',who:['coach','kenneth'],hint:'Coach. Alone. With a cart of balls.',
 blurb:'Missed PE? Coach runs makeup tests during returns. The test is dodging. The balls are medicine balls.',
 variants:{pass:'Passed'},run:async()=>{
 put('coach',60,1,{y:146,pose:'hips'});
 await say('coach','Makeup test. Five balls. Dodge them all and you pass. Get hit and you also pass, but it’ll hurt.','evil');
 let hits=0;
 for(let i=0;i<3;i++){pose('coach','throw');const r=await meter('Dodge ball '+(i+1),{speed:1.1+i*.15});pose('coach',null);if(!r){hits++;SFX.thud();shake(.8);A.you.hurt=Math.min(3,hits)}else SFX.whoosh()}
 if(!D.dead.kenneth){put('kenneth',334,-1,{y:150});await walk('kenneth',240,90);await say('kenneth','I’m also here for the makeup test. I’m also scared. Is it medicine balls? It’s medicine balls.','scared')}
 await say('coach',hits?'You took '+hits+'. Toughness: A. Dodging: F. Average: pass.':'Clean sheet! You’re on the team. What team? There is no team. YOU’RE on it.','smirk');
 await complete('ret_dodge','pass');
}});

/* flask prop */
{const _dp=drawProp;drawProp=function(p){if(p.t==='flask'){const x=Math.round(p.x),y=Math.round(p.y);R(x-2,y-8,4,3,'#d8e8f0');R(x-4,y-5,8,7,'#d8e8f0');R(x-3,y-3,6,4,['#40a0e0','#60d040','#e8e8e8'][Math.round(x/16)%3]);return}return _dp(p)}}
