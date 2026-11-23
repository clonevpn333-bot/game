'use strict';
/* =====================================================================
   HIGHSCHOOL — RAUNCH
   Filthy quests. The rule: the ADULTS are the filthy ones (sex stuff
   happens off-screen: you hear it, you see the van rock, you find the
   gear). The kids react, puke, film, roast, and get revenge. Kids are
   never in anything sexual.
     CODE BROWN    spike the staff coffee with Pat’s ghost-pepper chili
     THE KEY BOWL  the staff after-party on the mall roof is a key party
     THE BOILER ROOM  the basement isn’t where they hide the bodies
   ===================================================================== */
Object.assign(ITEMS,{chili:'Two scoops of Pat’s ghost-pepper chili in a mug',keybowl:'A salad bowl full of car keys (and one pair of handcuffs)',code:'The boiler room code: 6969'});
/* props */
K.gimp=Object.assign({},K.coach,{n:'Coach (?)',col:'#1a1a1a',skin:'#2e2830',hair:'#2e2830',hs:'bald',top:'#2a2228',pants:'#2a2228',whistle:1,stripe:0,seed:361});K.gimp.id='gimp';
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='urn'){R(x-5,y-14,10,13,'#a8a8b0');R(x-4,y-13,8,11,'#c8c8d0');R(x-6,y-15,12,2,'#6a6a72');R(x+4,y-6,3,1,'#333');R(x-3,y-1,6,2,'#6a6a72');if(p.spiked){R(x-3,y-15,6,1,'#c84a1a')}return}
 if(p.t==='stalldoor'){R(x-12,y-44,24,44,'#7a8a9a');R(x-11,y-43,22,42,'#8a9aaa');R(x-8,y-40,16,7,'#f4f0e6');pxc('STAFF',x,y-38,'#a01010');R(x+7,y-22,2,3,p.locked?'#d02020':'#20a040');return}
 if(p.t==='van'){const sh=p.rock?Math.round(Math.sin(T*(p.rock*14))*1.5):0;g.save();g.translate(0,sh);
  R(x-34,y-26,68,22,'#e8e4dc');R(x-34,y-26,68,2,'#fff');R(x-30,y-22,14,8,p.fog?'#c8d0d8':'#3a4a5a');R(x-12,y-22,22,8,p.fog?'#d0d8e0':'#3a4a5a');R(x+14,y-22,16,8,p.fog?'#c8d0d8':'#3a4a5a');
  if(p.fog){g.globalAlpha=.6;R(x-11,y-21,3,3,'#fff');R(x+18,y-20,4,2,'#fff');g.globalAlpha=1}
  R(x-30,y-6,10,6,'#1a1a1a');R(x+20,y-6,10,6,'#1a1a1a');R(x-34,y-12,68,1,'#b8b4ac');g.restore();return}
 if(p.t==='swing'){R(x-10,y-60,1,40,'#555');R(x+10,y-60,1,40,'#555');R(x-12,y-21,24,4,'#1a1a1a');R(x-12,y-61,24,2,'#777');return}
 if(p.t==='whips'){R(x-14,y-30,28,20,'#2a1414');for(let i=0;i<5;i++){R(x-11+i*5,y-29,1,14+(i%2)*3,'#0a0a0a');R(x-12+i*5,y-30,3,2,'#6a1a1a')}return}
 if(p.t==='keypad'){R(x-3,y-6,6,9,'#2a2a30');for(let i=0;i<3;i++)for(let j=0;j<3;j++)R(x-2+i*2,y-5+j*2,1,1,'#8a8a90');R(x-2,y+1,4,1,p.ok?'#20d040':'#d02020');return}
 return _dp(p)}}
function poop(x,y,n){for(let i=0;i<n;i++){const a=hsh(x+i)*6.28,d=hsh(y+i*3)*9;decals.push({x:x+Math.cos(a)*d*1.6,y:y+Math.sin(a)*d*.4,w:1+(i%3),h:1,c:['#5a3a12','#6a4a1a','#4a2a0a'][i%3]})}decals.push({x:x-14,y:y-1,w:28,h:3,c:'#4a2a0a'});decals.push({x:x-9,y:y-2,w:18,h:1,c:'#7a5a22'})}
function brownSpray(x,y){for(let i=0;i<30;i++){const a=rand(-Math.PI,0),v=rand(20,80);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,c:['#5a3a12','#6a4a1a','#7a5a22'][i%3],s:Math.random()<.3?2:1,fy:y+8+rand(-2,3),life:3})}}

/* ================= CODE BROWN ================= */
mission('codebrown',{name:'Code Brown',icon:'💩',who:['pat','coach','voss','balduf','grieve','shermian'],
 goal:'Spike the staff coffee with Pat’s ghost-pepper chili. Watch the staff toilet.',
 blurb:'The teachers took Pat’s parking space, her microwave and her good ladle. Pat has a pot of ghost-pepper chili that her ex-husband invented. He’s dead now. The chili is why.',
 parts:['Pat’s chili','The staff coffee urn','Next class: the race to the staff toilet'],
 tips:['Break or lunch, cafeteria. Pat’s guarding a pot.','Dump the chili in the staff coffee urn (cafeteria, staff table).','Your next class (Period 3, 5 or 6). Sit down. Wait.'],
 variants:{locked:'Locked the toilet',alarm:'The sprinklers',filmed:'Filmed it'}});
hook({mis:'codebrown',period:[2,4],room:'canteen',who:'pat',label:'Ask Pat what’s in the pot she’s guarding',look:{ex:'evil'},cond:()=>!D.f.cb1&&!D.dead.pat,run:async()=>{
 scene('canteen',{pat:[100,1,{y:140,ex:'evil'}],you:[130,-1,{y:150}]});
 if(typeof beat==='function')await beat('CODE BROWN','PART ONE · THE POT');
 await say('pat','Ghost-pepper chili. My ex-husband’s recipe. He’s dead now. This is why.','evil');
 await say('pat','Those bastards in the staff room took my parking space. Then my microwave. Then Coach took my good ladle and I’m fairly sure he’s been using it on himself.','angry');
 await say('pat','Third period they all get coffee from the urn on the staff table. Two scoops of this in that urn and every one of them will be shitting through the eye of a needle by ten forty-five.','evil');
 const c=await choose(['“Give me the mug.”','“Is this a war crime?”','“How bad is it?”']);
 if(c===1)await say('pat','In three countries. Not this one. Take the mug.','smirk');
 if(c===2)await say('pat','My ex ate one bowl and they had to bury him in a lead coffin, love. Not for the radiation. For the smell.','smirk');
 hold('pat','mug');await wait(200);hold('pat',null);give('chili');
 await say('pat','Don’t get it on your hands. Don’t touch your eyes. Don’t touch ANYTHING else. You’ll know what I mean when you go for a piss.','cold');
 D.f.cb1=1;part('codebrown',1);return 'stay';
}});
spot({room:'canteen',x:268,y:146,label:'Dump the chili in the staff coffee urn',short:'SPIKE',mis:'codebrown',cond:()=>D.f.cb1&&!D.f.cb2&&has('chili'),run:async()=>{
 clearTalk();await walk('you',258,70);face('you',1);const u=props.find(p=>p.t==='urn');hold('you','mug');pose('you','reach');await wait(400);hold('you',null);pose('you',null);take('chili');if(u)u.spiked=1;
 await N('Two scoops. The coffee doesn’t change color. It just goes very, very still, like it knows.');
 D.f.cb2=1;part('codebrown',2);return 'stay';
}});
/* the urn is always on the staff table */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(room==='canteen'&&!props.some(p=>p.t==='urn'))prop({t:'urn',x:268,y:130,keep:1,spiked:D&&D.f.cb2&&!D.done.codebrown})}catch(e){}return r}}
hook({mis:'codebrown',_bomb:1,period:[3,5,6],get room(){return D&&myClassFor(D.period)},set room(v){},who:'auto',cond:()=>D.f.cb2&&!D.done.codebrown,run:async()=>{
 const room=D.room,t=(TEACH[D.period]&&TEACH[D.period][room])||'voss';
 const kids=['arjun','hasan','omer'].filter(k=>K[k]&&!D.dead[k]);const cast={you:[150,1,{y:154,pose:'sit'}]};kids.forEach((k,i)=>cast[k]=[90+i*70,i?-1:1,{y:150,pose:'sit'}]);
 if(K[t]&&!D.dead[t])cast[t]=[60,1,{y:140,ex:'cold'}];
 scene(room,cast,true);if(typeof beat==='function')await beat('CODE BROWN','PART TWO · TEN FORTY-FIVE');
 if(A[t]){hold(t,'mug');await say(t,'(sipping coffee) Settle down. Settle. Down. Today we’re going to—','cold');hold(t,null);
  SFX.rumble&&SFX.rumble();A[t].ex='shock';A[t].shake=1;await N('From somewhere inside '+K[t].n+' comes a sound like a cello being dragged down a flight of stairs.');
  await say(t,'(very quietly) …Read. Chapter. Anything. Nobody. Leaves.','scared');A[t].shake=0;await walk(t,-30,200);remove(t)}
 /* the hallway */
 const T_=['coach','voss','balduf','grieve','shermian','loach'].filter(k=>K[k]&&!D.dead[k]);
 const hc={you:[40,1,{y:156}]};K.gimp.top='#2a2228';K.gimp.pants='#2a2228';T_.forEach((k,i)=>hc[k]=[200+i*18,-1,{y:146}]);for(const k of kids)hc[k]=[60+kids.indexOf(k)*16,1,{y:152}];
 scene('corridor',hc,true);const door=prop({t:'stalldoor',x:296,y:140,layer:-20});
 await N('You follow the screaming out into the Main Corridor. Every teacher in the building is in a line outside the one staff toilet, clenching like their lives depend on it, because they do.');
 for(const k of T_)if(A[k]){A[k].shake=1;A[k].ex='scared'}
 if(A.voss)await say('voss','I have a DOCTORATE. I will not shit myself in a hallway like a common undergraduate.','scared');
 if(A.balduf&&A.grieve){await say('balduf','Barnaby. Let me cut. I’ll do the thing you like. The thing with the stamp.','scared');await say('grieve','Not even for the stamp, Doris. Not TODAY.','scared')}
 if(A.shermian)await say('shermian','(through her teeth) If any of you children laugh I will pull your spines out through your mouths. AFTER.','scared');
 if(A.coach){await say('coach','I held it in through Desert Storm and two divorces. I can hold it in for— oh. Oh no. Oh no no no no.','scared');
  SFX.squelch&&SFX.squelch();shake(1);brownSpray(A.coach.x,A.coach.y-10);poop(A.coach.x,A.coach.y+2,90);poop(A.coach.x-30,A.coach.y+5,70);poop(A.coach.x-70,A.coach.y+8,50);A.coach.ex='closed';A.coach.shake=0;
  await N('Coach does not hold it in. It comes out of his tracksuit leg like a fire hose. It pools. It SPREADS. It reaches Mr. Voss’s good shoes, and Mr. Voss makes a noise no human should make.');
  await say('coach','(very calm, eyes closed) …Nobody says a goddamn word.','closed')}
 for(const k of kids)if(A[k])pose(k,'cover');
 if(A.arjun)await say('arjun','IT’S RUNNING DOWNHILL. WHY IS THE HALLWAY DOWNHILL. IT’S COMING TOWARDS US.','shock');
 if(A.omer){SFX.squelch&&SFX.squelch();await N('Omer throws up. Then he looks down at the hallway and throws up again, just to be safe.')}
 const c=await choose([{t:'Lock the staff toilet from the outside.',tag:'🔒'},{t:'Pull the fire alarm.',tag:'🚨'},{t:'Film everything.',tag:'📱'}],'Every teacher. One toilet.');
 for(const k of kids)if(A[k])pose(k,null);
 if(c===0){await walk('you',284,120);pose('you','reach');door.locked=1;SFX.door&&SFX.door();pose('you',null);await walk('you',60,140);
  await N('Click. The line turns and looks at the red light on the lock. Then they look at each other. Then, one by one, with enormous dignity, they each pick a trash can.');
  for(const k of T_.filter(k=>k!=='coach'))if(A[k]){pose(k,'kneel')}
  await say('voss','(squatting over the recycling) This is going in the jars. ALL of you are going in the jars.','angry');
  if(typeof repAdd==='function')repAdd('feared',1);await complete('codebrown','locked');return 'stay'}
 if(c===1){await walk('you',20,140);pose('you','reach');SFX.bell&&SFX.bell();pose('you',null);fxState.tint='#6a8ab8';fxState.tintA=.18;
  await N('The fire alarm goes off. The sprinklers come on. Eight inches of brown water starts moving down the Main Corridor like a tide, carrying three trash cans, a lanyard and Ms. Balduf’s cardigan.');
  await N('Nine hundred kids file out to the parking lot past the staff, who are standing completely still in the rain, ruined, looking at nothing.');
  fxState.tintA=0;if(typeof repAdd==='function')repAdd('legend',1);await complete('codebrown','alarm');return 'stay'}
 pose('you','phone');await N('You film the whole thing. Coach. The tide. Mr. Voss climbing onto a radiator. Ms. Sherman, perfectly still, a single tear rolling down her face.');
 await N('By lunch it’s on every phone in the school with the caption “staff meeting”. By home time Mr. Adam has sent an email with the subject line “REGARDING THIS MORNING’S INCIDENT” and nothing in the body.');
 pose('you',null);if(typeof repAdd==='function')repAdd('legend',2,'Code Brown');await complete('codebrown','filmed');return 'stay';
}});

/* ================= THE KEY BOWL ================= */
mission('keybowl',{name:'The Key Bowl',icon:'🔑',who:['valentino','coach','nurse','loach','voss','shermian'],
 goal:'Deliver the bowl to the van on the roof. Don’t look in the van.',
 blurb:'Mr. Valentino is throwing the staff after-party on the mall roof. He needs a kid to carry a bowl up to a white van. The bowl is full of car keys. You are not old enough to know what that means. You know exactly what that means.',
 parts:['After school: Mr. Valentino’s bowl','The van on the roof'],
 tips:['After school, Fair City food court. Mr. Valentino’s holding a salad bowl.','The rooftop parking. The van that’s moving on its own.'],
 variants:{swap:'Swapped the keys',brake:'The handbrake',cash:'Took the twenty'}});
hook({mis:'keybowl',period:8,room:'foodcourt',who:'valentino',label:'Ask Mr. Valentino why he’s holding a bowl of keys',look:{ex:'smirk'},cond:()=>!D.f.kb1&&cal()>=3&&!!K.valentino,run:async()=>{
 scene('foodcourt',{valentino:[200,-1,{y:150,ex:'smirk'}],you:[170,1,{y:156}]});
 if(typeof beat==='function')await beat('THE KEY BOWL','PART ONE · THE BOWL');
 await say('valentino','Kid. Twenty bucks. Take this bowl up to the white van on the roof. Don’t look in the bowl.','smirk');
 await N('You look in the bowl. Car keys. Eleven sets. A Prius key with a tiny whistle on the keyring. And a pair of fuzzy pink handcuffs.');
 await say('valentino','I said DON’T look in the bowl. Now you know. Now you’re part of it. Welcome to the faculty, kid.','smirk');
 const c=await choose(['“Is this a key party?”','“Whose handcuffs?”','“Make it forty.”']);
 if(c===0)await say('valentino','It’s a faculty development seminar. Everybody puts their keys in the bowl. Everybody takes out a key. Everybody develops.','smirk');
 if(c===1)await say('valentino','Pam’s. She says they’re “for patients”. She doesn’t have patients. She has a cot and a jar of lollipops.','cold');
 if(c===2){await say('valentino','Forty. Fine. You’re gonna make a great substitute one day. Heartless.','smirk');D.f.kb40=1}
 give('keybowl');D.f.kb1=1;part('keybowl',1);return 'stay';
}});
spot({room:'carpark',x:236,y:150,label:'Deliver the key bowl to the rocking white van',short:'VAN',mis:'keybowl',cond:()=>D.f.kb1&&!D.done.keybowl&&has('keybowl'),run:async()=>{
 clearTalk();scene('carpark',{you:[150,1,{y:156}]},true);const v=prop({t:'van',x:250,y:150,rock:1,fog:1,layer:-4});
 if(typeof beat==='function')await beat('THE KEY BOWL','PART TWO · THE VAN');
 await N('The van is parked across three spaces. The windows are fogged from the inside. It is rocking. Not a little. It is rocking like it’s trying to leave.');
 await walk('you',206,60);
 await say('coach','(from inside the van) WHOSE KNEE IS THAT.');
 await say('nurse','(from inside the van) That’s not a knee, Dale.');
 await say('coach','(from inside the van) …Oh. Oh, okay. Carry on. Good for you, Pam.');
 await say('loach','(from inside the van) Who has their hand in my cardigan?');
 await say('voss','(from inside the van) It’s me, Linda. It’s been me for twenty minutes. I thought you knew.');
 await say('loach','(from inside the van, a long pause) …Keep going.');
 v.rock=2;SFX.thud&&SFX.thud();
 await N('The van starts rocking twice as fast. The left tire squeaks on every beat. A sock is pressed against the inside of the window and slowly slides down it.');
 v.rock=0;SFX.door&&SFX.door();
 put('shermian',250,-1,{y:150});await walk('shermian',222,50);face('shermian','you');
 await N('The side door slides open a foot and Ms. Sherman steps out, perfectly calm, buttoning her blouse up to the very top, with her hair completely flat on one side.');
 await say('shermian','(holding out her hand for the bowl, eyes dead) You saw nothing. You’re going to tell everyone you saw nothing. And if I hear “key party” in my hallway, I’ll find out whose key you are.','cold');
 const c=await choose([{t:'Hand her the bowl. Swap two keys first.',tag:'🔑'},{t:'Hand her the bowl. Then take off the handbrake.',tag:'🚐'},{t:'Hand her the bowl. Take your money. Leave.',tag:'💵'}]);
 take('keybowl');
 if(c===0){pose('you','reach');await wait(250);pose('you',null);await walk('shermian',250,50);remove('shermian');
  await N('You swap Mr. Grieve’s keys with Coach’s. Nobody notices until the bowl comes out.');
  await say('grieve','(from inside the van) I’ve drawn… Dale.');
  await say('coach','(from inside the van, a very long pause) …I’ve got a Prius, Barnaby. It’s a small car. We’ll make it work.');
  v.rock=1;await N('As you walk down the ramp, the van starts rocking again. Slower. Sadder. Somehow, more committed.');
  if(typeof repAdd==='function')repAdd('legend',1);await complete('keybowl','swap');return 'stay'}
 if(c===1){await walk('shermian',250,50);remove('shermian');await walk('you',270,60);pose('you','reach');SFX.door&&SFX.door();pose('you',null);await walk('you',150,90);
  v.rock=2;await N('Click. The van rolls. It rolls slowly at first, still rocking, still squeaking on the beat, and then it hits the ramp.');
  await tw(v,{x:420},1400,'in');SFX.crash&&SFX.crash();shake(1.2);
  await N('It goes down three floors of parking ramp at forty miles an hour with nine teachers inside screaming in harmony and comes to a stop in the mall fountain. The doors fly open. Steam comes out. So does Coach. He is wearing only the whistle.');
  if(typeof repAdd==='function')repAdd('legend',2,'The Key Bowl');await complete('keybowl','brake');return 'stay'}
 await say('shermian','(taking the bowl) Good. Smart. You’ll go far. Not tonight. Tonight you go home.','cold');await walk('shermian',250,50);remove('shermian');
 D.money=(D.money||0)+(D.f.kb40?40:20);updateLoc();toast('+$'+(D.f.kb40?40:20));
 v.rock=1;await N('You walk away rich. Behind you the van starts up again, and someone in it says “oh, PAM” with real emotion.');
 await complete('keybowl','cash');return 'stay';
}});
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(room==='carpark'&&D&&D.f.kb1&&!D.done.keybowl&&!props.some(p=>p.t==='van'))prop({t:'van',x:250,y:150,rock:1,fog:1,keep:1,layer:-4})}catch(e){}return r}}

/* ================= THE BOILER ROOM ================= */
mission('dungeon',{name:'The Boiler Room',icon:'⛓️',who:['kenneth','coach','voss','nurse'],
 goal:'Get the code, open the boiler room, find out what the chains are.',
 blurb:'The boiler room door has a new keypad on it. Kenneth swears you can hear chains down there at lunch. Everybody knows the teachers kill kids. Everybody assumes that’s where they keep the bodies. Everybody is wrong, and it’s worse.',
 parts:['Kenneth heard chains','The code','The boiler room'],
 tips:['Break or lunch, the Main Corridor. Kenneth’s by the boiler room door (far left).','Nurse Pam’s office. The code is on a sticky note.','Main Corridor, far left. Punch the code into the keypad.'],
 variants:{free:'Freed Coach',photo:'Took a photo',safeword:'The safe word'}});
hook({mis:'dungeon',period:[2,4],room:'corridor',who:'kenneth',label:'Ask Kenneth why he’s got his ear on the wall',look:{ex:'scared'},cond:()=>!D.f.dg1&&cal()>=2&&!D.dead.kenneth,run:async()=>{
 scene('corridor',{kenneth:[52,-1,{y:146,ex:'scared'}],you:[80,-1,{y:152}]});
 const kp=prop({t:'keypad',x:30,y:112,layer:-40});
 if(typeof beat==='function')await beat('THE BOILER ROOM','PART ONE · CHAINS');
 await say('kenneth','Bro. BRO. Put your ear on the wall. The boiler room. They put a keypad on it Monday.','scared');
 await N('You put your ear on the wall. Far away, under the floor: a slow rattle of chains. A muffled, rhythmic squeak. And a voice, maybe, going “mmmph”.');
 await say('kenneth','That’s where they keep the bodies, right? That’s gotta be the bodies. Bodies don’t say “mmmph” though. Do they? Can they?','scared');
 await say('kenneth','Nurse Pam put the keypad in. I saw her. She’s got the code on a sticky note on her monitor because she’s like seventy.','scared');
 D.f.dg1=1;part('dungeon',1);return 'stay';
}});
spot({room:'nurse',x:200,y:150,label:'Read the sticky note on Nurse Pam’s monitor',short:'READ',mis:'dungeon',jdraw:{sh:'paper'},cond:()=>D.f.dg1&&!has('code')&&!D.f.dg2,run:async()=>{
 clearTalk();await walk('you',194,70);pose('you','reach');await wait(300);pose('you',null);give('code');
 await N('The sticky note says BOILER: 6969, and under it, in different handwriting, “very funny Dale”.');
 part('dungeon',2);D.f.dg2=1;return 'stay';
}});
spot({room:'corridor',x:30,y:150,label:'Punch 6969 into the boiler room keypad',short:'KEYPAD',mis:'dungeon',cond:()=>D.f.dg2&&has('code')&&!D.done.dungeon,run:async()=>{
 clearTalk();const kp=prop({t:'keypad',x:30,y:112,layer:-40});await walk('you',36,70);pose('you','reach');SFX.click&&SFX.click();await wait(300);kp.ok=1;pose('you',null);SFX.door&&SFX.door();take('code');
 const cast={you:[60,1,{y:154}],gimp:[200,-1,{y:146,ex:'scared'}]};if(!D.dead.kenneth)cast.kenneth=[36,1,{y:152,ex:'scared'}];
 scene('boiler',cast,true);fxState.tint='#a01020';fxState.tintA=.16;
 prop({t:'swing',x:150,y:150,layer:-30});prop({t:'whips',x:80,y:110,layer:-40});
 if(typeof beat==='function')await beat('THE BOILER ROOM','PART TWO · NOT THE BODIES');
 await N('It is not the bodies. The bulb is red. There is a leather swing on chains hanging from the boiler pipes. There is a pegboard of whips, labeled, like a woodwork room. And in the middle of the floor, in a full black leather suit with a zipper for a mouth, is somebody shaped exactly like Coach.');
 A.gimp.shake=1;await say('gimp','MMMPH. MMMMPH.','scared');A.gimp.shake=0;
 if(A.kenneth){await say('kenneth','Is that… is that a SWING? Like for babies?','scared');await say('gimp','MMMMMMPH.','angry');await say('kenneth','He says it’s not for babies.','scared')}
 const c0=await choose(['Unzip the mouth.','Walk around him once, slowly.']);
 if(c0===1)await N('On the back of the suit, in rhinestones: PROPERTY OF THE SCIENCE DEPARTMENT.');
 await walk('you',184,60);pose('you','reach');await wait(250);pose('you',null);
 await say('gimp','(gasping) KIDS. Thank God. Thank GOD. Voss zipped me in at the start of Tuesday. It’s Thursday. The safe word is “protein” and nobody CAME.','scared');
 await say('gimp','Pam was supposed to check on me at lunch. Pam forgot. Pam’s at a KEY PARTY.','angry');
 const c=await choose([{t:'Unzip him all the way. Get him out.',tag:'🔓'},{t:'Take a photo. Zip the mouth back up.',tag:'📸'},{t:'Run upstairs and say “PROTEIN” over the PA.',tag:'🎙️'}]);
 if(c===0){pose('you','reach');await wait(400);pose('you',null);
  await N('It takes four minutes. There are a lot of zippers. Some of them don’t go anywhere. Coach steps out of the suit in his tracksuit, which he was wearing UNDER the leather, the whole time, for two days.');
  await say('gimp','A in PE. Forever. Both of you. And if this leaves this room I will make you run until your ancestors are tired.','cold');
  fxState.tintA=0;if(typeof repAdd==='function')repAdd('liked',1);await complete('dungeon','free');return 'stay'}
 if(c===1){pose('you','phone');SFX.click&&SFX.click();flash('#fff',.5);await wait(300);pose('you','reach');await wait(250);pose('you',null);
  await say('gimp','(as the zipper closes) NO NO NO NO MMMPH','scared');
  await N('Best photo you’ll ever take. Coach in full leather, mid-scream, under a red bulb, with the swing behind him like a halo. That’s not a photo. That’s a pension.');
  fxState.tintA=0;if(typeof repAdd==='function')repAdd('feared',2,'you own Coach now');D.f.coachPhoto=1;await complete('dungeon','photo');return 'stay'}
 await walk('you',-20,170);scene('office',{you:[244,1,{y:152,pose:'phone'}]},true);prop({t:'pabox',x:262,y:120,layer:5,on:1});fxState.tintA=0;
 await say('you','(on every speaker in the school) PROTEIN. I repeat. PROTEIN. Somebody go get Coach out of the boiler room, he’s been in the leather since Tuesday.');
 await N('Every classroom goes silent. Then, from the science wing, the sound of Mr. Voss running. Then, from the gym, the PE class, chanting “PRO-TEIN” in unison, and it never, ever stops.');
 pose('you',null);if(typeof repAdd==='function')repAdd('legend',2,'PROTEIN');await complete('dungeon','safeword');return 'stay';
}});
/* the keypad is on the wall once you know about it */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(room==='corridor'&&D&&D.f.dg1&&!D.done.dungeon&&!props.some(p=>p.t==='keypad'))prop({t:'keypad',x:30,y:112,keep:1,layer:-40})}catch(e){}return r}}
/* Inspection Day: Coach has another weakness now */
if(typeof WEAK!=='undefined'&&WEAK.coach){const h=WEAK.coach.has,w=WEAK.coach.what;WEAK.coach.has=()=>h()||!!D.done.dungeon;WEAK.coach.what=()=>D.done.dungeon?'Yell “PROTEIN” and hold up the photo of the leather suit.':w()}
if(typeof OUTCOME_FIX!=='undefined')Object.assign(OUTCOME_FIX,{'codebrown:filmed':'good','codebrown:alarm':'good','codebrown:locked':'messy','keybowl:brake':'good','keybowl:swap':'good','keybowl:cash':'messy','dungeon:free':'good','dungeon:photo':'messy','dungeon:safeword':'good'});
/* the school talks */
ON_PERIOD.push(async()=>{if(!D||TEST||D.period===0||Math.random()>.3)return;const l=[];
 if(D.done.codebrown)l.push('They’re still mopping the Main Corridor. It’s been a WEEK.','Mr. Voss threw his shoes in the incinerator. With his feet still in them, basically.');
 if(D.done.keybowl)l.push('Coach and Mr. Grieve came in together this morning. In a Prius. Nobody’s talking about it.','Somebody wrote KEY PARTY on Ms. Sherman’s door and she just smiled and that’s so much worse.');
 if(D.done.dungeon)l.push('PRO-TEIN. PRO-TEIN.','Don’t go in the boiler room. Not because of the bodies.');
 if(l.length)setTimeout(()=>toast('🗣 '+pick(l)),5200)});
/* the people who start these quests turn up where the quest needs them */
{const mine=HOOKS.filter(h=>['dungeon','keybowl','codebrown','hotmic'].includes(h.mis)&&h.who!=='auto');mine.forEach(h=>h._here=1);
 const _hp=hookPresent;hookPresent=function(h,per){if(h&&h._here)return !D.dead[h.who];return _hp(h,per)};
 const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(const h of mine){if(h.room!==room||A[h.who]||D.dead[h.who]||!K[h.who])continue;const ps=Array.isArray(h.period)?h.period:[h.period];if(!ps.includes(D.period))continue;let ok=false;try{ok=!h.cond||h.cond()}catch(e){}if(!ok)continue;const f=floorOf(room);put(h.who,h.mis==='dungeon'?52:200,-1,{y:clamp(f[0]+8,f[0],f[1])})}}catch(e){}return r}}

/* your own time bombs go off first */
{for(const h of HOOKS)if(h.mis==='hotmic'&&h.who==='auto')h._bomb=1;
 const _ah=availableHooks;availableHooks=function(room,who){const l=_ah(room,who);if(who==='auto'&&l.length>1)l.sort((a,b)=>(b._bomb?1:0)-(a._bomb?1:0));return l}}
/* the boiler room: a red bulb you can actually see by */
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(ROOM!=='boiler'||!A.gimp)return;
 g.save();g.globalCompositeOperation='lighter';const gr=g.createRadialGradient(170,40,4,170,110,170);gr.addColorStop(0,'rgba(255,60,60,.28)');gr.addColorStop(1,'rgba(255,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);g.restore();
 R(168,8,5,6,'#ff4040');R(169,14,3,2,'#ffb0b0');
 for(const p of props)if(p.t==='swing'||p.t==='whips'){const x=Math.round(p.x),y=Math.round(p.y);
  if(p.t==='swing'){R(x-10,y-60,1,40,'#b8b8c0');R(x+10,y-60,1,40,'#b8b8c0');for(let i=0;i<40;i+=3){R(x-11,y-60+i,3,1,'#d8d8e0');R(x+9,y-60+i,3,1,'#d8d8e0')}R(x-13,y-22,26,5,'#3a1418');R(x-13,y-22,26,1,'#7a3a40');R(x-12,y-62,24,2,'#9a9aa0')}
  else{R(x-15,y-31,30,22,'#3a1a1a');R(x-15,y-31,30,1,'#7a3a3a');for(let i=0;i<5;i++){R(x-11+i*5,y-28,1,14+(i%2)*4,'#1a0a0a');R(x-12+i*5,y-30,3,2,'#c84040');R(x-11+i*5,y-14+(i%2)*4,2,1,'#c84040')}pxc('PROPERTY OF SCI DEPT',x,y-7,'#ff9090')}}
 const a=A.gimp;if(a&&a.vis){try{drawActor(a)}catch(e){}g.save();g.globalAlpha=.8;R(a.x-4,a.y-34,1,22,'#ff7070');R(a.x+3,a.y-30,1,12,'#ff7070');R(a.x-2,a.y-36,4,1,'#ff9090');R(a.x-1,a.y-29,3,1,'#c0c0c0');g.restore()}
}}
