'use strict';
/* =====================================================================
   HIGHSCHOOL — MORE FILTH
     SPEED DATING   Ms. Balduf’s Faculty Mixer. Nurse Pam vs. the staff.
                    You ring the bell. You pick who she leaves with.
     PICKUP LINE    Ms. Loach vs. Ms. Sherman over Mr. Valentino at the
                    bus loop. Kayden runs the book, Tez sells snacks.
   (Adults being filthy. Kids watching, screaming, getting splashed.)
   ===================================================================== */
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='datetable'){R(x-14,y-6,28,3,'#7a5a3a');R(x-14,y-6,28,1,'#9a7a5a');R(x-1,y-3,2,9,'#5a3a2a');R(x-4,y-9,2,3,'#f4f0e6');R(x-4,y-10,2,1,p.flame?'#ffd040':'#888');return}
 if(p.t==='bell'){R(x-3,y-3,6,3,'#d8b040');R(x-1,y-5,2,2,'#f0d060');R(x-4,y,8,1,'#6a4a2a');return}
 return _dp(p)}}

/* ================= SPEED DATING ================= */
mission('speeddate',{name:'Speed Dating',icon:'💘',who:['nurse','balduf','coach','voss','grieve','valentino','adam'],
 goal:'Ring the bell at Ms. Balduf’s Faculty Mixer. Pick who Nurse Pam leaves with.',
 blurb:'Ms. Balduf is running a Faculty Speed Dating Mixer in the library at lunch, “to rebuild staff morale after the incident”. Nobody knows which incident. There have been several. She needs a kid to ring the bell. The kid is you.',
 parts:['Ms. Balduf needs a bell-ringer','Get the bell from the office','Lunch: the Faculty Mixer'],
 tips:['Break, the library. Ms. Balduf is putting candles on tables.','The Vice Principal’s Office. The little brass bell on the desk.','Lunch, the library. Ring it.'],
 variants:{valentino:'Pam left with the sub',coach:'Pam left with Coach',everyone:'Pam left with everyone'}});
hook({mis:'speeddate',period:2,room:'library',who:'balduf',label:'Ask Ms. Balduf why there are candles in the library',look:{ex:'smirk'},_here:1,cond:()=>!D.f.sd1&&cal()>=2&&!D.dead.balduf&&!D.dead.nurse,run:async()=>{
 scene('library',{balduf:[200,-1,{y:146,ex:'smirk'}],you:[172,1,{y:152}]});prop({t:'datetable',x:120,y:150,layer:-2});prop({t:'datetable',x:240,y:150,layer:-2});
 if(typeof beat==='function')await beat('SPEED DATING','PART ONE · THE MIXER');
 await say('balduf','Faculty Speed Dating. Lunch. To rebuild staff morale after the incident.','smirk');
 const c=await choose(['“Which incident?”','“Why are YOU running it?”','“Why are the candles shaped like that?”']);
 if(c===0)await say('balduf','The copier. The van. The boiler room. Take your pick, child. We are a very morale-damaged staff.','cold');
 if(c===1)await say('balduf','Because I’ve already slept with all of them, and I’m bored, and I want to watch.','smirk');
 if(c===2)await say('balduf','They were on sale. Don’t ask Pam about the candles. She will tell you.','cold');
 await say('balduf','Every three minutes you ring a bell and they swap. The good bell is on Mr. Adam’s desk. He rings it when he— never mind when he rings it. Bring it.','smirk');
 D.f.sd1=1;part('speeddate',1);return 'stay';
}});
spot({room:'office',x:200,y:150,label:'Grab the little brass bell off Mr. Adam’s desk',short:'GRAB',sparkle:1,mis:'speeddate',jdraw:{sh:'cup'},cond:()=>D.f.sd1&&!D.f.sd2,run:async()=>{
 clearTalk();await walk('you',194,70);pose('you','reach');await wait(250);pose('you','grab');hold('you','J:cup');await wait(380);hold('you',null);pose('you',null);
 await N('There’s a sticky note on the bell. It says “FOR EMERGENCIES” and, underneath, in Ms. Balduf’s handwriting, “and for when he’s done”.');
 D.f.sd2=1;part('speeddate',2);toast('Now: lunch, the library');return 'stay'}});
hook({mis:'speeddate',period:4,room:'library',who:'auto',_bomb:1,cond:()=>D.f.sd2&&!D.done.speeddate&&!D.dead.nurse,run:async()=>{
 const men=['coach','voss','grieve','valentino','adam'].filter(k=>K[k]&&!D.dead[k]);
 const cast={nurse:[110,1,{y:150,pose:'sit',ex:'smirk'}],you:[300,-1,{y:154}]};if(!D.dead.balduf)cast.balduf=[270,-1,{y:146,pose:'cross'}];
 if(!D.dead.nivaan)cast.nivaan=[20,1,{y:150,pose:'phone'}];if(K.ollie&&!D.dead.ollie)cast.ollie=[40,1,{y:146}];
 men.forEach((k,i)=>cast[k]=[i===0?132:190+i*16,i===0?-1:-1,{y:i===0?150:144,pose:i===0?'sit':null}]);
 scene('library',cast,true);const t1=prop({t:'datetable',x:121,y:150,layer:-2,flame:1});const bl=prop({t:'bell',x:296,y:132,layer:5});
 if(typeof beat==='function')await beat('SPEED DATING','PART TWO · THE MIXER');
 if(A.balduf)await say('balduf','Welcome to the Faculty Mixer. Three minutes each. Be honest. Be brief. Pam, put the speculum away.','smirk');
 await say('nurse','It’s a conversation starter, Doris.','smirk');
 const DATES={
  coach:[['coach','I bench three-fifteen.','smirk'],['nurse','Dale, I’ve seen you naked in my office twice a week for six years. Three-fifteen WHAT.','cold'],['coach','…Feelings, Pam. I bench three-fifteen feelings.','sad']],
  voss:[['voss','I’d very much like to dissect you.','evil'],['nurse','Buy me dinner first. THEN dissect me. Then buy me breakfast.','smirk'],['voss','(writing in his little notebook) “Dinner. Dissect. Breakfast.” Underlined twice.','evil']],
  grieve:[['grieve','In 1862, a soldier would court a lady for six months before he so much as touched her glove.','closed'],['nurse','Barnaby, I have forty minutes for lunch and a cot.','smirk'],['grieve','(very quietly, loosening his collar) …Sherman never made it to the sea that fast.','blush']],
  valentino:[['valentino','I’m only a substitute. I’m gone by Friday.','smirk'],['nurse','Perfect. So am I, baby. So am I.','love'],['valentino','(leaning in) I was a pastry chef. I know what to do with a cream horn.','smirk']],
  adam:[['adam','So. Pam. I’ve been working very hard on the budget—','blush'],['nurse','Gerald. The whole school knows. The whole school chants it.','cold'],['adam','(standing up so fast his chair falls over) I’M GOING TO MY CAR.','shock']]};
 let n=0;
 for(const m of men){
  if(n>0){pose('you','reach');SFX.bell&&SFX.bell();await wait(TEST?0:200);pose('you',null);const prev=men[n-1];if(A[prev]){A[prev].pose=null;await walk(prev,190+n*16,90)}if(A[m]){A[m].pose=null;await walk(m,132,90);face(m,-1);A[m].pose='sit'}}
  for(const [w,t,e] of DATES[m]||[])if(A[w])await say(w,t,e);
  if(m==='valentino'){t1.flame=2;if(A.ollie)await say('ollie','(from behind the shelf) This is a LIBRARY. People READ in here. I was READING.','angry')}
  if(m==='voss'&&A.nivaan)await say('nivaan','(whispering, filming) Chat. Chat. The dissection guy is winning.','laugh');
  n++;
 }
 if(A.balduf)await say('balduf','(to you) Well? You rang the bell. You saw everything. Who does she go home with?','smirk');
 const opts=[];if(A.valentino)opts.push({t:'Mr. Valentino. The cream horn guy.',tag:'🥐',v:'valentino'});if(A.coach)opts.push({t:'Coach. Three-fifteen feelings.',tag:'💪',v:'coach'});opts.push({t:'“Honestly? All of them.”',tag:'🔔',v:'everyone'});
 const c=opts[await choose(opts,'Nurse Pam is looking at you. Everybody is looking at you.')];
 if(c.v==='valentino'){await say('nurse','(standing, grabbing his tie) Come on, pastry boy. My cot’s still warm from third period.','love');
  await Promise.all([walk('nurse',-20,80),walk('valentino',-10,80)]);
  if(A.balduf)await say('balduf','(watching them go, with real hatred) I was going to have him for dessert.','angry');
  await N('Twenty minutes later the nurse’s office door is locked, and the sign on it has been flipped to “SICK? GO HOME.”');
 }else if(c.v==='coach'){await say('nurse','…Fine. But the whistle comes OFF this time, Dale.','smirk');await say('coach','(standing up, overwhelmed) Nobody’s ever asked me to take the whistle off.','sad');
  await Promise.all([walk('nurse',-20,70),walk('coach',-10,70)]);
  await N('From the gym, all through fifth period, a whistle goes off at irregular intervals. Then it stops. Then it starts again, faster.');
 }else{await say('nurse','(standing up, grabbing two ties at once) Smart kid. Gentlemen? The nurse’s office. Bring a note from your doctor.','love');
  for(const m of men)if(A[m]){A[m].pose=null;A[m].ex='shock'}
  await Promise.all([walk('nurse',-20,80)].concat(men.filter(m=>A[m]).map((m,i)=>walk(m,-10-i*12,70+i*6))));
  if(A.balduf)await say('balduf','(alone, blowing out the candle) …Morale rebuilt, I suppose.','closed');
  if(A.nivaan)await say('nivaan','Chat says “W nurse”. Chat says “the bell kid is a genius”. That’s you. You’re the bell kid now.','laugh');
 }
 if(typeof repAdd==='function')repAdd('legend',1,'the bell kid');await complete('speeddate',c.v);return 'stay';
}});

/* ================= PICKUP LINE ================= */
mission('pickupline',{name:'Pickup Line',icon:'💋',who:['kayden','tez','valentino','loach','shermian','jaxon','kaylee'],
 goal:'Ms. Loach and Ms. Sherman are fighting over the sub at the bus loop. Kayden is taking bets.',
 blurb:'Mr. Valentino has been at Highgate four days and two teachers are already at war over him. Ms. Loach wore lipstick to cafeteria duty. Ms. Sherman ironed her lanyard. Kayden has opened a betting book. Tez is selling snacks. The seventh graders are losing their minds.',
 parts:['Kayden opens the book','Home time: the bus loop'],
 tips:['Break or lunch, the cafeteria. Kayden is taking bets.','Home time, the bus loop.'],
 variants:{rash:'The pastry rash',horn:'The bus horn',fight:'Teacher fight'}});
hook({mis:'pickupline',period:[2,4],room:'canteen',who:'kayden',label:'Ask Kayden why he has a notebook full of odds',look:{ex:'smirk'},_here:1,cond:()=>!D.f.pl1&&!!K.valentino&&!D.dead.kayden&&!D.dead.loach&&!D.dead.shermian&&(D.done.hotsub||cal()>=3),run:async()=>{
 const cast={kayden:[176,-1,{y:146,ex:'smirk'}],you:[150,1,{y:152}]};if(!D.dead.tez)cast.tez=[204,-1,{y:146,pose:'cross'}];
 scene('canteen',cast);if(typeof beat==='function')await beat('PICKUP LINE','PART ONE · THE BOOK');
 await say('kayden','Loach versus Sherman. For the sub. Bus loop, home time. I got Sherman at two-to-one. She ironed her LANYARD, bro.','smirk');
 await say('kayden','Loach put on lipstick for cafeteria duty. She’s been reapplying it every twenty minutes. She reapplied it while she was yelling at a sixth grader.','laugh');
 if(A.tez)await say('tez','I’m selling snacks at ringside. Takis, two bucks. Popcorn, three. Front row, five.','smirk');
 await say('kayden','The seventh graders already put forty bucks on Loach. They don’t know anything. They’re SEVENTH graders. You in?','smirk');
 const c=await choose(['“Five on Sherman.”','“Five on Loach.”','“Five on the sub running away.”']);D.f.plBet=['shermian','loach','run'][c];
 await say('kayden',c===2?'…Honestly? Smartest bet in the book.':'Locked in. Home time. Bring a poncho, it might get wet.','smirk');
 D.f.pl1=1;part('pickupline',1);return 'stay';
}});
hook({mis:'pickupline',period:7,room:'bus',who:'auto',_bomb:1,cond:()=>D.f.pl1&&!D.done.pickupline&&!!K.valentino&&!D.dead.loach&&!D.dead.shermian,run:async()=>{
 const cast={valentino:[200,-1,{y:146,ex:'smirk',hold:'mug'}],loach:[150,1,{y:150,ex:'love'}],shermian:[246,-1,{y:150,ex:'cold'}],you:[80,1,{y:154}]};
 for(const [k,x] of[['kayden',40],['tez',60],['jaxon',290],['kaylee',306],['arjun',100]])if(K[k]&&!D.dead[k])cast[k]=[x,x<160?1:-1,{y:156}];
 scene('bus',cast,true);if(typeof beat==='function')await beat('PICKUP LINE','PART TWO · THE BUS LOOP');
 if(A.tez)pose('tez','cross');if(A.kayden)pose('kayden','phone');
 await N('Mr. Valentino eats a croissant by the curb. Ms. Loach and Ms. Sherman circle him like two lions round a very relaxed gazelle. Kayden is still taking bets.');
 await say('loach','So. You were a PASTRY chef, Mr. Valentino. That must mean you’re very good with your hands.','love');
 await say('valentino','I can make a croissant with eighty-one layers, Linda. Each one by hand. Slowly.','smirk');
 await say('loach','(fanning herself with a detention slip) My ex-husband couldn’t make toast. He couldn’t make anything. He couldn’t make it past the first commercial break, if you know what I mean.','love');
 if(A.jaxon)await say('jaxon','(seventh grader, horrified) WHAT THE FUCK DOES THAT MEAN. WHAT COMMERCIAL BREAK.','shock');
 await say('shermian','(stepping between them) Linda. You are wearing lipstick on bus duty. That is a uniform violation. I could write you up.','cold');
 await say('shermian','(to Valentino, flatly) I have a set of handcuffs and the keys to every room in this building. Including the ones with no windows.','smirk');
 if(A.kaylee)await say('kaylee','(eighth grader, filming) SHE SAID NO WINDOWS. SHE SAID NO WINDOWS, CHAT.','laugh');
 await say('valentino','Ladies. Please. I only sub. I never commit. But I do have office hours. My office is my car. My car is a Corolla.','smirk');
 if(A.arjun)await say('arjun','A COROLLA. THEY’RE FIGHTING OVER A MAN WITH A COROLLA.','shock');
 const c=await choose([{t:'“Mr. Valentino, is that pastry rash still contagious?”',tag:'🤢'},{t:'Lean on the bus horn until everybody scatters.',tag:'📯'},{t:'“Miss! He said whoever wins gets the Corolla!”',tag:'🥊'}],'Two teachers. One sub. One Corolla.');
 const pay=w=>{if(D.f.plBet===w){D.money=(D.money||0)+10;updateLoc();toast('💸 Your bet came in. +$10')}};
 if(c===0){await say('you','Mr. Valentino! Is that pastry rash still contagious? The one on your— you know. Your cream horn.');
  for(const m of['loach','shermian'])if(A[m])A[m].ex='shock';await say('valentino','(very slowly lowering his croissant) …It’s mostly cleared up.','cold');
  await Promise.all([walk('loach',-20,120),walk('shermian',340,100)]);
  await N('Both teachers are gone before you finish the sentence. Ms. Loach leaves her cardigan behind. Mr. Valentino finishes the croissant without breaking eye contact.');
  if(A.kayden)await say('kayden','(closing the book) Nobody wins. House wins. I’m the house.','smirk');
  pay('run');if(typeof repAdd==='function')repAdd('liked',1);await complete('pickupline','rash');return 'stay'}
 if(c===1){SFX.horn?SFX.horn():SFX.bell&&SFX.bell();shake(.8);
  for(const m of['loach','shermian','valentino'])if(A[m])A[m].ex='shock';hold('valentino',null);
  await N('You lean on the bus horn. Ms. Loach drops her lipstick. Ms. Sherman drops her dignity. Mr. Valentino drops his coffee.');
  if(typeof spew==='function'&&A.arjun)await spew({x:A.valentino.x,y:A.valentino.y-22},['arjun'],'milk',{n:40,dur:700,arc:20});
  if(A.arjun)await say('arjun','(dripping coffee) …Why is it always me. I wasn’t even in this one.','closed');
  await Promise.all([walk('loach',-20,100),walk('shermian',340,100),walk('valentino',340,60)]);
  pay('run');await complete('pickupline','horn');return 'stay'}
 await say('you','Miss! He said whoever wins gets the Corolla!');
 for(const m of['loach','shermian'])if(A[m])A[m].ex='angry';
 await walk('shermian',172,120);
 if(typeof spew==='function')await spew({x:A.valentino.x,y:A.valentino.y-22},['loach','arjun'].filter(k=>A[k]),'milk',{n:50,dur:700,arc:16});
 await N('Ms. Sherman grabs the coffee out of Mr. Valentino’s hand and throws it at Ms. Loach. Most of it misses and hits Arjun.');
 for(const m of['loach','shermian'])if(A[m]){A[m].pose='lie';A[m].shake=1}SFX.smack&&SFX.smack();shake(.8);
 await N('Ms. Loach grabs Ms. Sherman’s lanyard. They go down on the curb like two raccoons in a bag. The seventh graders start chanting. The eighth graders start a livestream.');
 if(A.jaxon){pose('jaxon','cheer');await say('jaxon','LOACH! LOACH! LOACH! I GOT FORTY BUCKS ON YOU, MISS!','laugh')}
 await say('valentino','(stepping over them) …I’ll be in the Corolla. Whoever’s still standing.','smirk');await walk('valentino',340,60);
 for(const m of['loach','shermian'])if(A[m])A[m].shake=0;
 const w=Math.random()<.5?'loach':'shermian';A[w].pose=null;A[w].ex='evil';await say(w,'(standing up, hair everywhere, holding the other one’s lanyard) …Nobody saw this.','evil');
 await walk(w,340,140);pay(w);
 if(A.kayden)await say('kayden','(counting money) Best day of my LIFE.','laugh');
 if(typeof repAdd==='function')repAdd('legend',2,'the Pickup Line');await complete('pickupline','fight');return 'stay';
}});
/* people who start these turn up */
{const mine=HOOKS.filter(h=>['speeddate','pickupline'].includes(h.mis)&&h._here);const _hp=hookPresent;hookPresent=function(h,per){if(mine.includes(h))return !D.dead[h.who];return _hp(h,per)};
 const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(const h of mine){if(h.room!==room||A[h.who]||D.dead[h.who])continue;const ps=Array.isArray(h.period)?h.period:[h.period];if(!ps.includes(D.period))continue;let ok=false;try{ok=!h.cond||h.cond()}catch(e){}if(ok)put(h.who,200,-1,{y:148})}}catch(e){}return r}}
if(typeof OUTCOME_FIX!=='undefined')Object.assign(OUTCOME_FIX,{'speeddate:valentino':'good','speeddate:coach':'good','speeddate:everyone':'good','pickupline:rash':'good','pickupline:horn':'messy','pickupline:fight':'good'});
for(const m of['speeddate','pickupline']){if(MIS[m])MIS[m].filthy=1;if(typeof FILTHY!=='undefined'&&!FILTHY.includes(m))FILTHY.push(m)}
ON_PERIOD.push(async()=>{if(!D||TEST||D.period===0||Math.random()>.3)return;const l=[];
 if(D.done.speeddate)l.push('The nurse’s office sign says “SICK? GO HOME.” It’s said that for three days.','Somebody keeps ringing a little bell in the hallway and Mr. Adam flinches every time.');
 if(D.done.pickupline)l.push('Ms. Loach and Ms. Sherman aren’t allowed on bus duty together any more.','Mr. Valentino’s Corolla has two lanyards hanging off the mirror now.');
 if(l.length)setTimeout(()=>toast('🗣 '+pick(l)),6400)});
