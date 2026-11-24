'use strict';
/* =====================================================================
   HIGHSCHOOL — MORE FILTH
     SPEED DATING   Ms. Balduf’s Faculty Mixer. Nurse Pam vs. the staff.
                    You ring the bell. You pick who she leaves with.
     PICKUP LINE    The moms at home-time pickup vs. Mr. Valentino.
                    Arjun’s mom put on lipstick for PICKUP.
   (Adults being filthy. Kids watching, screaming, getting splashed.)
   ===================================================================== */
K.arjunmom={n:'Arjun’s Mom',col:'#c84a7a',skin:'#a8724e',hair:'#1a1010',hs:'long',top:'#c84a7a',pants:'#2a2a3a',adult:1,girl:1,seed:401,v:210};K.arjunmom.id='arjunmom';
K.kaymom={n:'Kayden’s Mom',col:'#3a8ad8',skin:'#e8c0a0',hair:'#e8d070',hs:'ponytail',top:'#3a8ad8',pants:'#1a1a2a',adult:1,girl:1,seed:402,v:230};K.kaymom.id='kaymom';
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
mission('pickupline',{name:'Pickup Line',icon:'💋',who:['arjun','valentino','arjunmom','kaymom','kayden'],
 goal:'Stop the moms at home-time pickup from fighting over Mr. Valentino. Or don’t.',
 blurb:'Word has got out to the parents that the new substitute is a former pastry chef with forearms. Pickup at the bus loop has turned into a nature documentary. Arjun’s mom put on lipstick for PICKUP.',
 parts:['Arjun is not okay','Home time: the bus loop'],
 tips:['Break or lunch, the cafeteria. Arjun is staring at his phone in horror.','Home time, the bus loop.'],
 variants:{rash:'The pastry rash',horn:'The bus horn',fight:'Mom fight'}});
hook({mis:'pickupline',period:[2,4],room:'canteen',who:'arjun',label:'Ask Arjun why he looks like he’s seen a ghost',look:{ex:'shock',pose:'phone'},_here:1,cond:()=>!D.f.pl1&&!!K.valentino&&!D.dead.arjun&&(D.done.hotsub||cal()>=3),run:async()=>{
 scene('canteen',{arjun:[176,-1,{y:146,ex:'shock',pose:'phone'}],you:[150,1,{y:152}]});
 if(typeof beat==='function')await beat('PICKUP LINE','PART ONE · THE TEXT');
 await dms('MOM 👑','online',[['them','Hi baby! Mommy is picking you up today 💕','11:02'],['me','u never pick me up','11:03'],['them','Is the new substitute going to be outside?? The pastry one??','11:03'],['them','Asking for the PTA','11:03'],['them','Does he like a woman who can cook or a woman who can be COOKED 🔥','11:04'],['me','MOM','11:04'],['them','I’m wearing the red dress 😘','11:05']]);
 await say('arjun','She’s wearing the red dress. The RED DRESS. She wore it to my uncle’s wedding and my uncle’s wedding got CANCELLED.','shock');
 await say('arjun','And Kayden’s mom’s coming too. She texted the PTA chat a photo of her “pickup outfit”. Bro, it’s a bikini top and a lanyard. At PICKUP.','shock');
 await say('arjun','You gotta be there. Home time. Bus loop. If my mom marries a substitute I’m moving to the woods.','scared');
 D.f.pl1=1;part('pickupline',1);return 'stay';
}});
hook({mis:'pickupline',period:7,room:'bus',who:'auto',_bomb:1,cond:()=>D.f.pl1&&!D.done.pickupline&&!!K.valentino,run:async()=>{
 const cast={valentino:[200,-1,{y:146,ex:'smirk'}],arjunmom:[150,1,{y:150,ex:'love'}],kaymom:[246,-1,{y:150,ex:'love'}],you:[80,1,{y:154}]};
 if(!D.dead.arjun)cast.arjun=[60,1,{y:150,ex:'shock'}];if(!D.dead.kayden)cast.kayden=[290,-1,{y:150,ex:'shock'}];
 scene('bus',cast,true);if(typeof beat==='function')await beat('PICKUP LINE','PART TWO · THE BUS LOOP');
 await N('Home time. The bus loop. Mr. Valentino is standing by the curb eating a croissant. Two moms have him surrounded like nature documentary lions around a very confident gazelle.');
 await say('arjunmom','So you were a PASTRY chef. That must mean you’re very good with your hands.','love');
 await say('valentino','I can make a croissant with eighty-one layers, ma’am. Each one by hand. Slowly.','smirk');
 await say('arjunmom','(fanning herself with a permission slip) Arjun’s father can’t make toast. He can’t make ANYTHING. He can’t make it to the end, if you know what I mean.','love');
 if(A.arjun)await say('arjun','MOM. MOM. I’M RIGHT HERE. I CAN HEAR YOU. I CAN SEE YOU.','shock');
 await say('kaymom','(stepping in front of her) Excuse me, Priya, I was in line. I’ve been in line since lunch. I’ve been in line since my DIVORCE.','angry');
 await say('kaymom','(to Valentino) I’d let you substitute my husband. Full time. Benefits.','love');
 if(A.kayden)await say('kayden','I’m gonna throw myself under the 43. I’m gonna lie down in front of it. Tell the driver it’s fine.','shock');
 await say('valentino','Ladies. Please. I only sub. I never commit. But I have office hours. My office is my car. My car is a Corolla.','smirk');
 await say('arjunmom','(digging her nails into Kayden’s mom’s arm) Arjun, baby, get on the bus. Mommy’s going to a… parent-teacher conference.','love');
 if(A.arjun)await say('arjun','IN A COROLLA?!','shock');
 const c=await choose([{t:'“Mr. Valentino, is your rash still contagious? The pastry rash?”',tag:'🤢'},{t:'Lean on the bus horn until everybody scatters.',tag:'📯'},{t:'“Ladies, he said whoever wins gets the Corolla.”',tag:'🥊'}],'The moms are circling.');
 if(c===0){await say('you','Mr. Valentino! Is that pastry rash still contagious? The one on your—you know. Your cream horn.');
  for(const m of['arjunmom','kaymom'])if(A[m])A[m].ex='shock';await say('valentino','(very slowly lowering his croissant) …It’s mostly cleared up.','cold');
  await Promise.all([walk('arjunmom',-20,120),walk('kaymom',340,120)]);
  await N('Both moms are back in their cars before the sentence is over. Arjun’s mom does a three-point turn in one point. Mr. Valentino looks at you for a long time and eats the rest of his croissant without breaking eye contact.');
  if(A.arjun)await say('arjun','(hugging you, then immediately stopping) I owe you my life. I don’t want to talk about the rash. Is there a rash? Don’t tell me.','happy');
  if(typeof repAdd==='function')repAdd('liked',1);await complete('pickupline','rash');return 'stay'}
 if(c===1){SFX.horn?SFX.horn():SFX.bell&&SFX.bell();shake(.8);
  for(const m of['arjunmom','kaymom','valentino'])if(A[m])A[m].ex='shock';
  await N('You lean on the bus horn. The bus horn is the loudest thing in the state. Kayden’s mom drops her iced coffee. Arjun’s mom drops her dignity. Mr. Valentino drops the croissant and everybody watches it roll into a drain like a little sad wheel.');
  if(typeof spew==='function'&&A.arjun){await spew({x:A.kaymom.x,y:A.kaymom.y-24},['arjun'],'milk',{n:40,dur:700,arc:20})}
  if(A.arjun)await say('arjun','(dripping iced coffee) …It’s still better than a stepdad.','closed');
  await Promise.all([walk('arjunmom',-20,100),walk('kaymom',340,100),walk('valentino',340,60)]);
  await complete('pickupline','horn');return 'stay'}
 await say('you','Ladies! He said whoever wins gets the Corolla!');
 for(const m of['arjunmom','kaymom'])if(A[m])A[m].ex='angry';
 await walk('kaymom',172,120);
 if(typeof spew==='function'){await spew({x:A.kaymom.x-4,y:A.kaymom.y-26},['arjunmom','arjun'].filter(k=>A[k]),'milk',{n:50,dur:700,arc:16});}
 await N('Kayden’s mom throws her entire iced coffee in Arjun’s mom’s face. Most of it misses and hits Arjun.');
 for(const m of['arjunmom','kaymom'])if(A[m]){A[m].pose='lie';A[m].shake=1}SFX.smack&&SFX.smack();shake(.8);
 await N('Arjun’s mom grabs Kayden’s mom’s ponytail. They go down on the curb like two raccoons in a bag.');
 if(A.kayden)await say('kayden','(filming) MOM. MOM, YOUR TOP. MOM, NOT IN FRONT OF THE BUS.','shock');
 await say('valentino','(stepping over them, finishing his croissant) …I’ll be in the Corolla.','smirk');await walk('valentino',340,60);
 if(A.arjun)await say('arjun','(dripping, watching his mom bite someone) I’m moving to the woods. I’m actually moving to the woods.','closed');
 for(const m of['arjunmom','kaymom'])if(A[m])A[m].shake=0;
 if(typeof repAdd==='function')repAdd('legend',2,'the Pickup Line');await complete('pickupline','fight');return 'stay';
}});
/* people who start these turn up */
{const mine=HOOKS.filter(h=>['speeddate','pickupline'].includes(h.mis)&&h._here);const _hp=hookPresent;hookPresent=function(h,per){if(mine.includes(h))return !D.dead[h.who];return _hp(h,per)};
 const _br=buildRoom;buildRoom=function(room){const r=_br(room);try{if(D&&!D.weekend)for(const h of mine){if(h.room!==room||A[h.who]||D.dead[h.who])continue;const ps=Array.isArray(h.period)?h.period:[h.period];if(!ps.includes(D.period))continue;let ok=false;try{ok=!h.cond||h.cond()}catch(e){}if(ok)put(h.who,200,-1,{y:148})}}catch(e){}return r}}
if(typeof OUTCOME_FIX!=='undefined')Object.assign(OUTCOME_FIX,{'speeddate:valentino':'good','speeddate:coach':'good','speeddate:everyone':'good','pickupline:rash':'good','pickupline:horn':'messy','pickupline:fight':'good'});
for(const m of['speeddate','pickupline']){if(MIS[m])MIS[m].filthy=1;if(typeof FILTHY!=='undefined'&&!FILTHY.includes(m))FILTHY.push(m)}
ON_PERIOD.push(async()=>{if(!D||TEST||D.period===0||Math.random()>.3)return;const l=[];
 if(D.done.speeddate)l.push('The nurse’s office sign says “SICK? GO HOME.” It’s said that for three days.','Somebody keeps ringing a little bell in the hallway and Mr. Adam flinches every time.');
 if(D.done.pickupline)l.push('Arjun’s mom has been banned from pickup. She now does DROP-OFF. In the red dress.','Mr. Valentino’s Corolla has a PTA sticker on it now.');
 if(l.length)setTimeout(()=>toast('🗣 '+pick(l)),6400)});
