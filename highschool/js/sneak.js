'use strict';
/* =====================================================================
   HIGHSCHOOL — SNEAK OUT, MESS AROUND
   Four new quests, built in beats like the big arcs:
   • DITCH DAY — forge a pass, go over the back fence, spend a lesson in
     Fair City, get back before anyone notices. Mr. Adam is out in his
     car hunting truants.
   • THE LUNCH RUN — twelve Burger Barn orders, one lunch period, one
     fence, and Coach.
   • THE HOT SUB — a substitute so good-looking the staff lose their
     minds. The kids run a betting pool on which teacher shoots first.
   • SWIPE RIGHT, MS. BALDUF — her dating profile, a catfish, and a date
     with Mr. Grieve at the food court.
   (The raunch is the adults’. The kids are spectators and bookies.)
   ===================================================================== */
const LESSONP=[1,3,5,6];
K.valentino={n:'Mr. Valentino',col:'#8a2a3a',skin:'#c89068',hair:'#141010',hs:'slick',top:'#f4f0e6',pants:'#2a2a33',adult:1,h:6,seed:96,v:170,vw:'sine'};K.valentino.id='valentino';
for(const id of['valentino','balduf','grieve','coach','adam'])if(typeof SPAWNED!=='undefined')SPAWNED.add(id);
ITEMS.pass=ITEMS.pass||'A forged hall pass (Angelo’s finest)';ITEMS.burgers='Twelve Burger Barn orders (warm, leaking)';
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='fence'){for(let i=0;i<W;i+=6){R(i,y-44,1,44,'#7a7a82');}for(let r=0;r<44;r+=6)for(let i=0;i<W;i+=6){R(i,y-44+r,6,1,'#8a8a92')}R(0,y-46,W,2,'#5a5a62');for(let i=0;i<W;i+=4)R(i,y-49,2,3,'#a8a8b0');return}
 if(p.t==='bag'){R(x-6,y-10,12,10,'#c8402a');R(x-5,y-9,10,2,'#f0c040');pxc('BB',x,y-7,'#fff');return}
 if(p.t==='casserole'){R(x-7,y-5,14,5,'#e8e2d6');R(x-6,y-7,12,2,'#c86a3a');for(let i=0;i<3;i++)R(x-4+i*4,y-9-((T*2+i)%1)*4,1,2,'rgba(255,255,255,.6)');return}
 return _dp(p)}}

/* ================= DITCH DAY ================= */
mission('ditch',{name:'Ditch Day',icon:'🏃',who:['angelo'],goal:'Skip a lesson, get out over the back fence, and get back before anyone notices.',
 blurb:'Angelo says the back fence behind the woods is the only door in this school with no teacher on it. Angelo says a lot of things. Angelo also sells hall passes.',
 parts:['Break or lunch: buy a forged pass','Skip a lesson: over the fence','Get back in'],
 tips:['Break or lunch, Main Corridor. Angelo, locker 13. $2.','At a lesson bell, skip. Run out the back gate, into the woods. The fence is at the far end.','Same trip. Don’t get seen.'],
 variants:{clean:'Nobody noticed',adam:'Mr. Adam’s car',legend:'Came back with a souvenir'}});
hook({mis:'ditch',period:[2,4],room:'corridor',who:'angelo',label:'“Angelo. I need a pass.”',look:{pose:'cross',ex:'smirk'},cond:()=>!has('pass')&&!D.done.ditch&&!D.dead.angelo,run:async()=>{
 scene('corridor',{angelo:[180,-1,{y:146,pose:'cross',ex:'smirk'}],you:[150,1,{y:154}]});
 await beat('DITCH DAY','PART ONE · THE PASS');
 await say('angelo','A pass. Bathroom, nurse, or “family emergency”? Family emergency is two dollars. It comes with a fake cough.','smirk');
 await say('angelo','I’m not saying where you’re going. I’m not asking. Locker 13 is a church. Locker 13 doesn’t want to know.','cold');
 if((D.money||0)<2){await say('angelo','Two dollars. You have '+(D.money?'one':'zero')+'. Go rob a vending machine like a normal kid.','angry');return 'stay'}
 D.money-=2;updateLoc();give('pass');
 await N('He hands you a hall pass. Ms. Sherman’s signature is perfect. It’s more Ms. Sherman than Ms. Sherman’s actual signature.');
 await say('angelo','Back fence. End of the woods. Go during a lesson, when the halls are empty. And come back BEFORE the bell, or the pass turns into a pumpkin.','smirk');
 part('ditch',1);return 'stay';
}});
spot({room:'forest',period:LESSONP,x:300,y:150,label:'Climb the back fence into town',short:'FENCE',mis:'ditch',cond:()=>has('pass')&&!D.done.ditch,run:async()=>{
 scene('forest',{you:[250,1,{y:154}]},true);const f=pprop({t:'fence',x:0,y:140,layer:-20});
 await beat('DITCH DAY','PART TWO · OVER THE FENCE');
 await N('The back fence. Chain link, eight feet, a little bit of barbed wire on top that somebody already cut a gap in. There’s a sneaker stuck up there. Somebody didn’t make it.');
 const ok=await mash('Climb!',{need:14,time:3.5});
 if(!ok){A.you.hurt=1;await N('Your hoodie catches on the top. You hang there for a bit like laundry. Then it rips and you fall into a bush on the other side. You’re out. Your dignity isn’t.')}
 else await N('Up, over, down. You land in somebody’s backyard. A man in a bathrobe watches you from his deck, drinking coffee. He raises the mug. You raise a hand. Respect.');
 f.hide=1;
 scene('foodcourt',{you:[40,1,{y:154}],kayden:[200,-1,{y:146,pose:'phone'}],kid4:[240,-1,{y:150,pose:'sit'}]},true);
 await N('Fair City Mall at 11:40 on a school day is a different planet. It’s quiet. It smells like pretzels and freedom. The only other kids here are kids who are also not supposed to be here.');
 await say('kayden','(not looking up) First time? Don’t go near the Cinnabon. Truant officer gets his coffee there at noon. Every day. Like a shark.','smirk');
 const c=await choose(['Get a pretzel. Live a little.','Hit the arcade for one game.','Buy a really stupid hat from the kiosk.']);
 if(c===2){give('hat');ITEMS.hat='A stupid hat from the mall kiosk';await N('It says I’D RATHER BE AT SCHOOL across the front. It’s ironic. It’s the best thing you’ve ever owned.');D.f.ditchHat=1}
 else if(c===1){await N('One game turns into nine. You get the high score on the racing game. You enter your initials as ASS. It’s there forever now.')}
 else{D.apples=(D.apples||0)+1;updateLoc();await N('Hot pretzel, extra salt, eaten on a bench in the middle of a school day. It tastes like getting away with it. +1 🍎')}
 part('ditch',2);
 /* getting back */
 scene('bus',{you:[300,-1,{y:154}]},true);cue('tension');
 await beat('DITCH DAY','PART THREE · GETTING BACK IN');
 const car=pprop({t:'car',x:-80,y:150,col:'#5a5a62',driver:1,layer:-4});SFX.rumble();
 await N('You’re walking back along the bus loop road when a beige car slows down behind you. Very slowly. Mr. Adam is driving it. Mr. Adam has his window down. Mr. Adam has binoculars.');
 await tw(car,{x:60},1400,'out');
 const k=await choose(['Run for the woods.','Walk normal. Wave. Show him the pass.','Lie on the ground and pretend to be a log.']);
 if(k===0){const ok2=await mash('RUN',{need:18,time:3.5});if(ok2){await walk('you',360,150);await N('You’re through the trees and over the fence and back in Period '+(D.period===1?'1':D.period===3?'3':D.period===5?'6':'7')+' before he finds reverse. He drives around the school for forty minutes, looking.');await complete('ditch',D.f.ditchHat?'legend':'clean')}
  else{await N('You trip on the curb. The car stops next to you. The window goes down the rest of the way.');await say('adam','(very sad) I was a truant too, you know. In 1987. Look where it got me. Get in the car.','sad');D.f.sherC=(D.f.sherC||0)+1;await complete('ditch','adam')}}
 else if(k===1){await say('you','(waving the pass) Family emergency, sir!');await say('adam','(reading it through the binoculars) …This is Ms. Sherman’s signature. It’s better than Ms. Sherman’s signature. (pause) Carry on. Tell Angelo I want five.','smirk');await complete('ditch',D.f.ditchHat?'legend':'clean')}
 else{A.you.pose='lie';await N('You lie down by the curb and become a log. Mr. Adam stops. Gets out. Stands over you. Pokes you with his foot. Says “Strange log.” Gets back in. Drives away.');A.you.pose=null;await complete('ditch','clean')}
 D.items=D.items.filter(i=>i!=='pass');car.hide=1;return 'ended';
}});

/* ================= THE LUNCH RUN ================= */
mission('lunchrun',{name:'The Lunch Run',icon:'🍔',who:['paul','hasan','omer'],goal:'Get twelve Burger Barn orders back to the cafeteria before lunch ends.',
 blurb:'Pat’s stew has a tooth in it today. Not a human one. Probably. The whole table has decided: somebody goes over the fence for Burger Barn. Everybody looks at you.',
 parts:['Lunch: take the orders','Over the fence','Coach'],
 tips:['Lunch, the cafeteria. Paul has a list.','Lunch, the woods (walk past the field and the walkway). The back fence.','Lunch, the field, on the way back. Run.'],
 variants:{fed:'Lunch is served',coach:'Coach ate them',ate:'You ate them all'}});
hook({mis:'lunchrun',period:4,room:'canteen',who:'paul',label:'Ask Paul why he’s holding a list',look:{hold:'paper',ex:'angry'},cond:()=>!D.f.lr1&&!D.done.lunchrun&&!D.dead.paul,run:async()=>{
 const cast={paul:[170,-1,{y:150,hold:'paper',ex:'angry'}],you:[140,1,{y:154}]};for(const [k,x] of[['hasan',200],['omer',224],['arjun',250]])if(!D.dead[k])cast[k]=[x,-1,{y:150,pose:'sit'}];
 scene('canteen',cast);await beat('THE LUNCH RUN','PART ONE · THE ORDERS');
 await say('paul','There’s a tooth in the stew. A TOOTH. I’m not eating tooth stew. I’ve eaten worse. I won’t eat tooth.','angry');
 await say('paul','Twelve orders. Double Barn, no pickles, extra Barn sauce. Hasan wants a kids’ meal for the toy. Don’t judge him.','smirk');
 if(A.hasan)await say('hasan','It’s a limited edition toy. It’s a little raccoon. I NEED the little raccoon.','scared');
 if(A.arjun)await say('arjun','Get me a large fries and a sense of purpose.','smirk');
 D.money=(D.money||0)+12;updateLoc();await N('Twelve sweaty dollars land in your hand. Half of them are in coins. One of them is Canadian.');
 D.f.lr1=1;part('lunchrun',1);return 'stay';
}});
spot({room:'forest',period:4,x:300,y:150,label:'Over the fence for Burger Barn',short:'FENCE',mis:'lunchrun',cond:()=>D.f.lr1&&!D.f.lr2&&!D.done.lunchrun,run:async()=>{
 scene('forest',{you:[250,1,{y:154}]},true);const f=pprop({t:'fence',x:0,y:140,layer:-20});
 await beat('THE LUNCH RUN','PART TWO · OVER THE FENCE');
 await mash('Climb!',{need:12,time:3.5});f.hide=1;
 scene('foodcourt',{you:[40,1,{y:154}]},true);
 await N('Burger Barn. The guy behind the counter has seen kids in school uniforms at noon before. He doesn’t ask. He just says “twelve?” like he already knew.');
 D.money=Math.max(0,(D.money||0)-12);updateLoc();give('burgers');hold('you','bag');
 await N('Twelve orders in four bags. They’re hot. They’re leaking. The whole mall can smell you coming. You have nine minutes.');
 D.f.lr2=1;part('lunchrun',2);hold('you',null);return 'stay';
}});
hook({mis:'lunchrun',period:4,room:'field',who:'auto',cond:()=>D.f.lr2&&!D.done.lunchrun&&has('burgers'),run:async()=>{
 scene('field',{you:[300,-1,{y:154,hold:'bag'}]},true);cue('fight');
 await beat('THE LUNCH RUN','PART THREE · COACH');
 put('coach',-20,1,{y:150,ex:'evil'});await walk('coach',60,90);
 await say('coach','(sniffing the air like a bloodhound) Is that… BARN SAUCE?','yell');
 await say('coach','NOBODY LEAVES CAMPUS. NOBODY BRINGS BACK BARN SAUCE WITHOUT GIVING COACH A BARN.','evil');
 const c=await choose([{t:'Run past him.',tag:'🏃'},{t:'Throw him one burger and keep going.'},{t:'Sit down on the grass and eat them all. All twelve.'}]);
 D.items=D.items.filter(i=>i!=='burgers');
 if(c===0){const ok=await mash('RUN',{need:20,time:4,info:'Coach used to play college ball. MASH!'});
  if(ok){await walk('you',-20,150);scene('canteen',{paul:[170,-1,{y:150}],hasan:[200,-1,{y:150,pose:'sit'}],you:[140,1,{y:154,hold:'bag'}]},true);SFX.cheer();
   await N('You come through the cafeteria doors like a war hero. The table stands up. Somebody starts the slow clap. Pat watches from behind the counter, holding a ladle, saying nothing, for a very long time.');
   if(A.hasan)await say('hasan','THE LITTLE RACCOON. HE GOT THE LITTLE RACCOON.','cry');await complete('lunchrun','fed')}
  else{pose('coach','grab');await N('Coach tackles you into the long-jump pit. Burgers everywhere. He eats four of them right there in the sand, looking you in the eye.');await complete('lunchrun','coach')}}
 else if(c===1){pose('you','throw');await N('You throw a Double Barn at him. He catches it one-handed without looking, like a dog with a frisbee. He’s too busy eating to chase you.');
  scene('canteen',{paul:[170,-1,{y:150}],you:[140,1,{y:154}]},true);await say('paul','…Eleven? There are eleven. Who didn’t get one. (looks at Hasan) It’s Hasan. It’s always Hasan.','smirk');await complete('lunchrun','fed')}
 else{pose('you','sit');await N('You sit down on the grass and eat twelve Burger Barns in front of Coach. It takes eleven minutes. Coach watches the whole thing in silence. At the end, he salutes you.');
  D.apples=(D.apples||0)+3;updateLoc();await N('+3 🍎. Paul will never, ever forgive you.');(P.grudge=P.grudge||{}).paul=cal()+3;await complete('lunchrun','ate')}
 return 'stay';
}});

/* ================= THE HOT SUB ================= */
mission('hotsub',{name:'The Hot Sub',icon:'🔥',who:['valentino','arjun'],goal:'Win the betting pool on which teacher shoots their shot at the new substitute first.',
 blurb:'There’s a substitute. He’s six foot three, his shirt has given up on its top three buttons, and he says “ciao” unironically. The entire staff has lost its mind. Arjun is taking bets.',
 parts:['The arrival','The staff room war','Home time'],
 tips:['Break or lunch, Front Hall. Everybody’s staring at something.','Lunch, the cafeteria. The teachers are competing. Pick who to help.','Home time, the bus loop. Somebody leaves with him.'],
 variants:{won:'You called it',lost:'You lost the pool',chaos:'Everybody lost'}});
hook({mis:'hotsub',period:[2,4],room:'hallb',who:'arjun',label:'Ask Arjun why everyone’s staring',look:{ex:'smirk',hold:'paper'},cond:()=>!D.f.hs1&&cal()>=2&&!D.dead.arjun,run:async()=>{
 const cast={arjun:[110,1,{y:150,hold:'paper',ex:'smirk'}],you:[86,1,{y:154}],valentino:[340,-1,{y:146}]};
 for(const [k,x] of[['shermian',230],['balduf',258],['coach',284]])if(!D.dead[k])cast[k]=[x,-1,{y:144}];
 scene('hallb',cast,true);await beat('THE HOT SUB','PART ONE · THE ARRIVAL');
 await walk('valentino',190,40);await camZoom(190,100,2,600);
 await N('He walks down the Front Hall in slow motion. Not actually in slow motion. It just feels like it. His hair doesn’t move. His shirt does.');
 await say('valentino','(to nobody, to everybody) Ciao.','smirk');await camZoom();
 if(A.balduf){A.balduf.ex='shock';hold('balduf','book');SFX.thud();await N('Ms. Balduf drops an entire stack of graded essays. She doesn’t pick them up. She doesn’t look down. She’s breathing like she climbed stairs.')}
 if(A.shermian){A.shermian.ex='blush';await say('shermian','(fixing her hair with a ruler) Well. WELL. Miss hasn’t felt like this since the Clinton administration.','blush')}
 if(A.coach){pose('coach','up');await N('Coach starts doing pull-ups on the door frame. Nobody asked him to. He’s maintaining eye contact with the sub the entire time.')}
 await say('arjun','(clipboard out) Betting pool’s open. Who shoots their shot first? Odds on Sherman are two to one. Odds on Balduf are even. Odds on Coach are… complicated.','evil');
 const c=await choose(['Bet $2 on Ms. Sherman.','Bet $2 on Ms. Balduf.','Bet $2 on Coach.']);
 D.f.hsBet=['shermian','balduf','coach'][c];D.money=Math.max(0,(D.money||0)-2);updateLoc();
 await say('arjun','Noted. If you rig it, I’ll know. If you rig it well, I’ll respect it.','smirk');
 for(const k of['valentino','shermian','balduf','coach'])if(A[k]){A[k].pose=null;walk(k,350,60)}
 D.f.hs1=1;part('hotsub',1);return 'stay';
}});
hook({mis:'hotsub',period:4,room:'canteen',who:'auto',cond:()=>D.f.hs1&&!D.f.hs2&&!D.done.hotsub,run:async()=>{
 const cast={valentino:[160,1,{y:150,pose:'sit'}],you:[60,1,{y:154}]};
 if(!D.dead.shermian)cast.shermian=[200,-1,{y:146,hold:'casserole'}];if(!D.dead.balduf)cast.balduf=[230,-1,{y:146,hold:'book'}];if(!D.dead.coach)cast.coach=[120,1,{y:146,pose:'hips'}];
 scene('canteen',cast,true);await beat('THE HOT SUB','PART TWO · THE STAFF ROOM WAR');
 if(A.shermian){hold('shermian',null);pprop({t:'casserole',x:184,y:146,layer:2});await say('shermian','Miss made you a casserole, sweetie. It has meat in it. Miss won’t say what kind. That’s part of the mystery.','blush')}
 if(A.balduf)await say('balduf','I wrote you a sonnet. Fourteen lines. Iambic pentameter. The rhyme scheme is ABAB, and so, frankly, am I.','blush');
 if(A.coach){pose('coach','up');SFX.thud();shake(.6);await N('Coach picks up the vending machine. The whole vending machine. He holds it over his head and says “I can also lift YOU.” Nobody knows what to do with that.')}
 await say('valentino','(sipping an espresso he brought from home) You are all very generous. I am only here until Thursday. I am a substitute. I substitute.','smirk');
 const bet=D.f.hsBet;
 const c=await choose(['Help your bet: tell '+K[bet].n.replace(/^(Ms\.|Mr\.)\s*/,'')+' he “loves a bold move”.','Sabotage the others: swap the sonnet for a parking ticket.','Pull the fire alarm. Let chaos decide.']);
 if(c===0){D.f.hsHelp=1;await N('You whisper it. '+K[bet].n+' goes very still, then very determined, like a shark that just heard a heartbeat.')}
 else if(c===1){D.f.hsHelp=1;await N('You make the swap. Ms. Balduf stands up, clears her throat, and reads him a parking ticket in iambic pentameter by accident. She runs out of the cafeteria.')}
 else{SFX.bell();SFX.bell();D.f.hsChaos=1;await N('The fire alarm goes. In the stampede, the casserole hits the floor, Coach drops the vending machine on Mr. Adam’s foot, and Ms. Balduf and Ms. Sherman both grab the sub’s arm at once and pull. He loses a sleeve.')}
 D.f.hs2=1;part('hotsub',2);return 'stay';
}});
hook({mis:'hotsub',period:7,room:'bus',who:'auto',cond:()=>D.f.hs2&&!D.done.hotsub,run:async()=>{
 scene('bus',{valentino:[200,-1,{y:146}],arjun:[110,1,{y:150,hold:'paper'}],you:[86,1,{y:154}]},true);
 await beat('THE HOT SUB','PART THREE · HOME TIME');
 const pool=['shermian','balduf','coach'].filter(k=>!D.dead[k]);
 const win=D.f.hsChaos?null:(D.f.hsHelp&&Math.random()<.75?D.f.hsBet:pick(pool));
 if(!win){await N('Nobody wins. The sub leaves alone, with one sleeve, in a red convertible, without looking back. Three teachers watch him go from three different windows. Ms. Balduf is crying. Coach is crying. Ms. Sherman is sharpening something.');
  await say('arjun','The house keeps the money. I AM the house.','evil');await complete('hotsub','chaos');return 'stay'}
 put(win,-20,1,{y:146});await walk(win,176,70);
 const lines={shermian:'(taking his arm) Miss is going to show you the town, sweetie. Miss knows ALL the shortcuts. Some of them are underground.',balduf:'(taking his arm, shaking) I have never done anything impulsive in my life. Please drive before I correct something.',coach:'(clapping him on the back so hard he staggers) Grab a protein shake with me. As bros. As BROS. (it is not as bros)'};
 await say(win,lines[win],'blush');
 const car=pprop({t:'car',x:150,y:150,col:'#c82a2a',layer:-4});
 await N(K[win].n+' gets into the passenger seat of a red convertible. They peel out of the bus loop doing about sixty. Somebody on the 43 starts clapping. Then everybody does.');
 await tw(car,{x:400},1200,'in');remove(win);remove('valentino');
 if(win===D.f.hsBet){D.money=(D.money||0)+8;updateLoc();await say('arjun','(counting out bills, disgusted) Eight dollars. You called it. I don’t like it. Here.','angry');await complete('hotsub','won')}
 else{await say('arjun','(pocketing your money) Thank you for your donation to the Arjun Foundation.','smirk');await complete('hotsub','lost')}
 return 'stay';
}});

/* ================= SWIPE RIGHT, MS. BALDUF ================= */
mission('swipe',{name:'Swipe Right, Ms. Balduf',icon:'💘',who:['balduf','grieve','nivaan'],goal:'Set Ms. Balduf up with Mr. Grieve. Watch from behind a plant.',
 blurb:'Nivaan found Ms. Balduf’s dating profile. Age: “a lady never says”. Looking for: “a man who knows the difference between who and whom.” She has zero matches. Mr. Grieve is right there.',
 parts:['The profile','The catfish','The date'],
 tips:['Break, the library. Nivaan has his phone out.','Lunch, anywhere. Write her a message as Mr. Grieve.','After school, Fair City Mall food court.'],
 variants:{love:'They kissed (gross)',fight:'Food court war',caught:'They caught you'}});
hook({mis:'swipe',period:[2,4],room:'library',who:'nivaan',label:'Ask Nivaan what he’s laughing at',look:{pose:'phone',ex:'laugh'},cond:()=>!D.f.sw1&&!D.dead.balduf&&!D.dead.grieve&&!D.dead.nivaan,run:async()=>{
 scene('library',{nivaan:[180,-1,{y:146,pose:'phone',ex:'laugh'}],you:[150,1,{y:154}]});
 await beat('SWIPE RIGHT, MS. BALDUF','PART ONE · THE PROFILE');
 await say('nivaan','(wheezing) Bro. BRO. Ms. Balduf has a dating profile. Look at her photo. She’s holding a dictionary. In the SEA.','laugh');
 await say('nivaan','“Turn-ons: the Oxford comma. Turn-offs: ‘could of’. Seeking a gentleman of letters. Must own a cardigan. Must be able to handle a strong woman and a stronger thesaurus.”','laugh');
 await say('you','…Mr. Grieve owns like nine cardigans.');
 await say('nivaan','(slowly putting the phone down) Oh no. Oh no. We’re doing this. We’re making history. Literally. He teaches history.','evil');
 D.f.sw1=1;part('swipe',1);return 'stay';
}});
freeHooks({mis:'swipe',label:'Write Ms. Balduf a message “from Mr. Grieve”',look:{pose:'phone'},cond:()=>D.f.sw1&&!D.f.sw2,run:async()=>{
 scene(D.room||'corridor',{nivaan:[180,-1,{y:146,pose:'phone'}],you:[150,1,{y:154}]});
 await beat('SWIPE RIGHT, MS. BALDUF','PART TWO · THE CATFISH');
 const c=await choose(['“My dearest Ms. Balduf. Your use of the semicolon has kept me up at night.”','“u up”','“I, too, have a sword.”']);
 const rep=['“Mr. Grieve. Nobody has ever noticed my semicolons. Food court. Four o’clock. Wear the brown cardigan.”','“I am ALWAYS up. I have insomnia and a red pen. Food court. Four. Don’t be late or I’ll take marks off.”','“…Bring it. Food court. Four.”'][c];
 await dms('Ms. Balduf','typing…',[['me',['My dearest Ms. Balduf. Your use of the semicolon has kept me up at night.','u up','I, too, have a sword.'][c],'12:41'],['them',rep,'12:44']]);
 await say('nivaan','Now we just have to make sure Mr. Grieve is ALSO at the food court at four. I told him there’s a Civil War reenactment flyer by the pretzel place. He’s already sharpening something.','evil');
 D.f.sw2=1;part('swipe',2);return 'stay';
}},[[2,'library','nivaan'],[4,'library','nivaan'],[4,'canteen','nivaan'],[2,'corridor','nivaan']]);
hook({mis:'swipe',period:8,room:'foodcourt',who:'auto',cond:()=>D.f.sw2&&!D.done.swipe&&!D.dead.balduf&&!D.dead.grieve,run:async()=>{
 scene('foodcourt',{balduf:[140,1,{y:150,pose:'sit',ex:'blush'}],grieve:[180,-1,{y:150,pose:'sit',ex:'shock'}],nivaan:[262,-1,{y:150,pose:'kneel'}],you:[280,-1,{y:152,pose:'kneel'}]},true);
 await beat('SWIPE RIGHT, MS. BALDUF','PART THREE · THE DATE');
 await N('You and Nivaan are crouched behind a fake palm tree. Ms. Balduf and Mr. Grieve are at the same small table, both in brown cardigans, both very confused, both pretending they aren’t.');
 await say('balduf','So. Your… semicolons.','blush');
 await say('grieve','My what? I— yes. I have many. Hundreds. I use them in battle reports. Tactically.','scared');
 await camZoom(160,108,2,500);
 await say('balduf','(leaning in) Say something tactical.','blush');
 await say('grieve','(sweating through the cardigan) …Flanking maneuver.','blush');await camZoom();
 const c=await choose(['Stay hidden. Let it happen.','Nivaan sneezes. (Don’t stop him.)','Send Ms. Balduf another text “from Grieve”: “nice cardigan 😏”.']);
 if(c===0){fxState.romance=.5;await N('They kiss. Over a pretzel. It’s the most horrifying, beautiful thing you have ever seen. A child at the next table starts crying. Nivaan is streaming it. Chat is screaming.');fxState.romance=0;
  await say('nivaan','(whispering, crying) Ninety-one viewers. NINETY-ONE. We did it. We’re matchmakers. We’re gods.','cry');await complete('swipe','love')}
 else if(c===1){SFX.gasp&&SFX.gasp();A.nivaan.pose=null;A.you.pose=null;await N('Nivaan sneezes. The palm tree falls over. Both teachers turn round and see you. Then they look at each other. Then they understand everything.');
  await say('balduf','(standing up, very slowly) Who. Sent. The. Message.','evil');await say('grieve','(also standing) Flanking maneuver.','evil');
  await N('You and Nivaan run for your lives through Fair City Mall with two teachers in matching cardigans chasing you. They’re holding hands the whole time.');await complete('swipe','caught')}
 else{pose('you','phone');await N('Ms. Balduf’s phone buzzes. She reads it. She looks at Mr. Grieve, who is very obviously not holding his phone. Her face goes from pink to white to Old Testament.');
  await say('balduf','(standing, grabbing her soda) You MOCK me?','yell');SFX.splat();await N('Soda in his face. He throws his pretzel. It escalates. Within a minute it’s the cafeteria food fight all over again, but with adults, and with the whole food court joining in.');
  for(let i=0;i<10;i++)prop({t:'food',x:100+Math.random()*120,y:120+Math.random()*20,vx:(Math.random()-.5)*60,floor:150+Math.random()*20,land:1+Math.random(),c:pick(['#e8c040','#c04030','#f4f0e6'])});await complete('swipe','fight')}
 return 'stay';
}});
ARC_MIS.push('ditch','lunchrun','hotsub','swipe');
OUTCOME_FIX['ditch:clean']='good';OUTCOME_FIX['ditch:legend']='good';OUTCOME_FIX['ditch:adam']='bad';
OUTCOME_FIX['lunchrun:fed']='good';OUTCOME_FIX['lunchrun:coach']='bad';OUTCOME_FIX['lunchrun:ate']='messy';
OUTCOME_FIX['hotsub:won']='good';OUTCOME_FIX['hotsub:lost']='bad';OUTCOME_FIX['hotsub:chaos']='messy';
OUTCOME_FIX['swipe:love']='good';OUTCOME_FIX['swipe:fight']='messy';OUTCOME_FIX['swipe:caught']='bad';
