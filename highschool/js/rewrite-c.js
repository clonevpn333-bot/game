'use strict';
/* =====================================================================
   HIGHSCHOOL — rewrites, part C: Method, The Beep Test, The Back Fridge.
   ===================================================================== */
{const _dh=drawHeld;drawHeld=function(it,x,y,d){if(it==='drumstick'){R(x-2,y-5,5,5,'#a8602a');R(x-1,y-6,3,1,'#c8783a');R(x,y,1,4,'#f0e8d8');R(x-1,y+3,3,1,'#f0e8d8');return}if(it==='dagger'){R(x,y-8,1,8,'#e8e8f0');R(x-1,y,3,1,'#8a6a2a');R(x,y+1,1,2,'#5a3a1a');return}if(it==='cd'){R(x-3,y-3,6,6,'#c8c8d8');R(x-1,y-1,2,2,'#555');return}return _dh(it,x,y,d)}}

/* =================================================================
   METHOD — Mr. Pratt, Drama
   ================================================================= */
dropHooks('method');
Object.assign(MIS.method,{blurb:'Mr. Pratt doesn’t believe in fake blood, fake swords or fake deaths. He’s doing Macbeth. Everyone is going to remember it.',tips:['Period 3, Drama. Sit near Mia. Look up at the lighting rig.']});
hook({mis:'method',period:3,room:'drama',who:'auto',run:async()=>{
 const c=await classIn('drama',{kids:['mia','kayden','kid1','kid3'].filter(n=>!D.dead[n]),fixed:{mia:0,kayden:1,kid1:3,kid3:4},you:2});
 cue('tension');A.pratt.y=104;A.pratt.x=160;face('pratt',1);
 await N('Period 3. Drama. The black studio. All six stage lights are on even though it’s daytime, because Mr. Pratt says daylight is “for accountants”.');
 await say('pratt','Macbeth. Act Two. The murder of King Duncan. And we are NOT using props. Props are for cowards and children’s television.','yell');
 hold('pratt','dagger');
 await say('kayden','Sir. Is that a real knife?','scared');
 await say('pratt','“Is this a dagger which I see before me?” YES. Sheffield steel. Forty bucks. I sharpened it during Jeopardy.','happy');
 await say('pratt','Our Duncan today is… you. eighth grade. Up you get. Onto the stage. Lie down. Close your eyes. Trust the craft.','smirk');
 A.kid1.pose=null;await Promise.all([walk('kid1',200,60),tw(A.kid1,{y:104},700)]);A.kid1.pose='lie';A.kid1.dir=-1;
 await say('kid1','(lying on the stage) Sir? Sir, it’s quite pointy—','scared');
 await walk('pratt',188,40);pose('pratt','slam');SFX.squelch();await wait(220);SFX.squelch();
 kill('kid1','lie',{pool:20});pose('pratt',null);
 await say('pratt','And SCENE! Do you SEE? Do you FEEL it? THAT is theatre!','happy');
 await say('mia','He’s killed an eighth grader. In a lesson. With an audience.','shock');
 await walk('pratt',150,60);face('pratt',-1);
 await say('pratt','Next scene. You. You’re Macbeth. Mia’s Banquo. Banquo dies. Make me believe it.','evil');
 A.you.pose=null;await Promise.all([walk('you',130,60),tw(A.you,{y:106},600)]);
 hold('you','dagger');
 A.mia.pose=null;await Promise.all([walk('mia',110,60),tw(A.mia,{y:106},600)]);face('mia',1);
 const o=[{t:'“I’m not killing Mia.”'},{t:'Catch Mia’s eye. Look up at the lighting rig.'},{t:'Turn round and stab Mr. Pratt.'}];
 if(has('compass'))o[2]={t:'Stab Mr. Pratt with Tez’s compass shiv.',tag:'🗡️'};
 const ch=await choose(o,'Mr. Pratt is waiting, arms folded, mouthing the line for you.');
 if(ch===0){
  await say('you','I’m not killing Mia.');hold('you',null);
  await say('pratt','FAKE. You’re not FEELING it. Let me show you how Banquo REALLY dies—','evil');
  await walk('pratt',A.you.x+12,120);pose('pratt','slam');SFX.squelch();shake(1);A.you.hurt=3;blood(A.you.x,A.you.y-22,40,-1,90,A.you.y+2);kill('you','lie',{pool:26});
  await say('pratt','…Hm. Turns out you were Banquo all along. Bold choice. A bit selfish.','smirk');
  await die('method');
 }
 if(ch===1){
  await N('Mia follows your eyes up to the rig. Six lamps, on a bar, on two clips. She nods once. Cadets.');
  await say('mia','Sir, I need the bathroom.');
  await say('pratt','Banquo doesn’t NEED the bathroom. Banquo needs DEATH.','yell');
  await walk('mia',30,80);await tw(A.mia,{y:24},700);
  await say('pratt','Where is my BANQUO?','yell');
  const r=await meter('Mia’s on the clips. Tell her when.',{speed:1.25});
  const rig=prop({t:'rig',x:150,y:14});await walk('pratt',150,40);
  if(r){
   await tw(rig,{y:94},320,'in');SFX.crunch();shake(1.6);flash('#fff',.5);D.f.rigDown=1;
   kill('pratt','crush',{pool:34,bleed:3});
   await N('The whole rig comes down. Six lamps, all still on. Mr. Pratt gets the best lighting of his life for the last second of it.');
   await tw(A.mia,{y:150},600);await walk('mia',110,60);
   await say('mia','Exit, pursued by a lighting rig.','smirk');
   await say('kayden','That’s a different play, though.','shock');
   await say('mia','He’d have wanted the reference.');
   hold('you',null);
   await complete('method','rig');return;
  }
  await tw(rig,{y:94},320,'in');SFX.crunch();shake(1);
  await N('It drops two seconds early. It misses him completely and lands in front of him, still on, lighting him from below like a ghost story.');
  await say('pratt','A SPOTLIGHT! For ME! Thank you, Banquo! Right — back to the murder.','happy');
  await walk('pratt',A.you.x+12,120);pose('pratt','slam');SFX.squelch();shake(1);kill('you','lie',{pool:26});
  await die('method');
 }
 if(has('compass'))take('compass');
 face('you',1);await walk('you',A.pratt.x-12,140);pose('you','punch');A.you.punchT=T+.4;SFX.squelch();shake(1);blood(A.pratt.x,A.pratt.y-20,40,1,90,A.pratt.y+2);
 await say('pratt','(looking down at it) YES. YES! THAT’S it! FINALLY! A REAL ACTOR!','happy');
 kill('pratt','lie',{pool:30});pose('you',null);hold('you',null);
 await say('pratt','(dying, thrilled) Five… stars…','dead');
 await say('kayden','Bro stabbed a drama teacher and got a standing ovation. From the drama teacher.','shock');
 await say('mia','Self-defence. He handed you a knife and asked you to.','angry');
 await complete('method','stab');
}});

/* =================================================================
   THE BEEP TEST — Period 7
   ================================================================= */
for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis==='beep'&&HOOKS[i].period===6)HOOKS.splice(i,1);
hook({mis:'beep',period:6,room:'gym',who:'auto',run:async()=>{
 const kids=['paul','kenneth','jacob','omer','angelo'].filter(n=>!D.dead[n]);
 const c=await classIn('gym',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,i+1])),you:0});
 cue('gym');hold('coach','cleaver');
 prop({t:'cd',x:160,y:110});
 await N('Period 7. The gym. Two lines of tape, twenty meters apart. A CD player on a chair. Coach Dunmore is holding a meat cleaver like a clipboard.');
 await say('coach','BEEP TEST. You run between the lines. You’re on the line by the beep. Miss a beep, you’re CUT.','evil');
 await N('He taps the cleaver against his whistle. Ting. Ting.');
 if(D.f.beepRig){
  SFX.beep();await wait(150);SFX.beep();await wait(130);SFX.beep();
  await say('jacob','That’s too fast. That is WAY too fast.','angry');
  await say('coach','Too FAST? Pathetic. Watch a real man do it.','yell');
  hold('coach',null);A.coach.pose=null;
  for(let i=0;i<9;i++){SFX.beep();await walk('coach',i%2?60:250,140+i*28);if(i>4){ex('coach','angry');A.coach.shake=1}}
  SFX.heart();await wait(300);SFX.heart();await wait(200);SFX.heart();
  await say('coach','I’m FINE— pain is— weakness—','yell');
  SFX.squelch();shake(1.4);flash('#a00010',.5);blood(A.coach.x,A.coach.y-20,70,null,120,A.coach.y+2);
  kill('coach','lie',{pool:40,bleed:4});
  await N('Coach Dunmore’s heart doesn’t stop. It leaves. Through the front.');
  await N('The CD keeps going. Faster. Faster. A beep every half-second, like it’s panicking for him.');
  await say('jacob','…Do we still have to run?','shock');
  if(A.kenneth){await walk('kenneth',160,70);SFX.click();await N('Kenneth turns it off.');await say('kenneth','Pain is weakness leaving the body. Rest in peace, sir. You were so weak.')}
  await complete('beep','coach');return;
 }
 let n=await rhythm('Beep test: step on every beep',{n:9,gap:has('energy')?1:.85,window:has('energy')?.26:.19});
 if(has('energy'))take('energy');
 for(let i=0;i<3;i++){for(const k of['you',...kids])if(A[k])walk(k,i%2?A[k].x-100:A[k].x+100,110);await wait(900)}
 if(A.angelo){
  await N('On level six, Angelo stops on the line to sell someone a Twix.');
  await say('coach','CUT.','evil');
  await walk('coach',A.angelo.x-12,140);pose('coach','slam');SFX.squelch();shake(1);
  blood(A.angelo.x,A.angelo.y-20,40,1,100,A.angelo.y+2);kill('angelo','lie',{pool:30});pose('coach',null);
  await say('angelo','(on the floor) …No refunds…','dead');
 }
 if(n<6&&has('chucks')){
  await N('Your legs stop. The beep doesn’t.');await say('coach','CUT.','evil');
  await walk('coach',A.you.x-14,160);pose('coach','slam');pose('you','up');SFX.smack();SFX.smack();shake(.8);
  await N('The cleaver comes down. You catch it between two thirty-centimetre rulers and a shoelace. It holds.');
  pose('coach',null);pose('you',null);
  await say('coach','…Ruler-chucks. I haven’t seen ruler-chucks since ’94.','shock');
  await say('coach','You pass. Don’t tell anyone. Respect is weakness leaving the body.','smirk');take('chucks');n=6;
 }
 if(n<6){
  await N('Your legs stop. The beep doesn’t.');await say('coach','CUT.','evil');
  await walk('coach',A.you.x-14,160);pose('coach','slam');SFX.squelch();shake(1.2);flash('#a00010',.5);
  await behead('you',1);
  await N('Your head rolls across the halfway line. Coach blows his whistle. Foul.');
  await die('beep');
 }
 await say('coach','Pathetic. All of you. Same time next week.','angry');
 await say('jacob','(bent double) I hate this. I hate this so much. Nobody laugh at me.','angry');
 if(A.paul)await say('paul','Nobody’s laughing, Jacob. Nobody ever laughs at you.');
 await complete('beep','survive');
}});

/* =================================================================
   THE BACK FRIDGE — Period 7
   ================================================================= */
for(let i=HOOKS.length-1;i>=0;i--)if(HOOKS[i].mis==='voss'&&HOOKS[i].period===6)HOOKS.splice(i,1);
hook({mis:'voss',period:6,room:'chem',who:'auto',cond:()=>has('key'),run:async()=>{
 const kids=['david','nivaan'].filter(n=>!D.dead[n]);
 const c=await classIn('chem',{kids,fixed:Object.fromEntries(kids.map((n,i)=>[n,i+2])),you:0});
 cue('chem');
 await N('Period 7. The chem lab. The fridge at the back hums a note you can feel in your teeth. The key from his lanyard is in your pocket. It’s cold. It shouldn’t be cold.');
 await say('voss','Today: dissolving! Who wants to see something dissolve?','happy');
 hold('voss','drumstick');await walk('voss',256,40);pose('voss','throw');await wait(220);hold('voss',null);pose('voss',null);SFX.squelch();prop({t:'smoke',x:272,y:116});
 await N('He drops a chicken drumstick into the vat. It fizzes, goes white, and is gone in about the time it takes to blink twice.');
 await say('voss','Now imagine that was a person. Don’t imagine too hard. I’ll know.','evil');
 face('voss',1);
 await say('voss','Volunteers to stir? No? Shy. Shy is so… tender.','smirk');
 A.you.pose=null;await walk('you',44,50);face('you',-1);SFX.door();take('key');D.f.fridgeOpen=1;
 await N('The key turns. The fridge breathes out, cold and sweet, like a sweet shop in a freezer.');
 await N('Jars. Rows of them, with handwritten labels. GARY P. (LEFT FOOT). TYLER — ×31. A big jar labelled KEVIN, which is just teeth.');
 await N('And on the bottom shelf, at the back: AIDAN. AIDAN. AIDAN. Fourteen jars. Every label dated Friday. The oldest label is yellow and says 13/3/87.');
 intel('aidanJars');if(typeof lore==='function')lore('jars');
 if(A.david)await say('david','(whispering) Why are there fourteen Aidans?','shock');
 if(A.nivaan){pose('nivaan','film');await say('nivaan','(whispering) Chat says “bro’s been farming”.','shock')}
 await walk('voss',70,90);face('voss',-1);
 await say('voss','Curious. I like curious. Curious is so… absorbent.','evil');
 pose('voss','choke');A.you.ex='scared';
 await walk('voss',236,70);await walk('you',250,70);
 const has_=has('spare')||has('powder');
 const ch=await choose([{t:'Throw texture powder in his eyes.',dis:!has_,why:'you need powder',tag:'💇'},{t:'Stab him with the compass shiv.',dis:!has('compass'),why:'Tez sells those',tag:'🗡️'},{t:'Bite his hand.'},{t:'Scream for David.'}],'He’s lifting you over the vat.');
 if(ch<=1){
  if(ch===0){take('spare');take('powder');pose('you','throw');for(let i=0;i<16;i++)parts.push({x:A.voss.x,y:A.voss.y-24,vx:rand(-20,20),vy:rand(-30,0),c:'#e8e8e8',s:1,fy:150,life:1});SFX.whoosh();await say('voss','MY EYES— it’s so… MATTE—','yell')}
  else{take('compass');pose('you','punch');A.you.punchT=T+.4;SFX.squelch();blood(A.voss.x,A.voss.y-20,30,1,80,A.voss.y+2);await say('voss','You STABBED me. With GEOMETRY.','yell')}
  pose('voss',null);pose('you',null);A.voss.shake=1;await walk('voss',268,60);
  SFX.squelch();SFX.fire();await tw(A.voss,{y:128},300);prop({t:'smoke',x:268,y:114});SFX.scream();
  await N('He sits down in the acid like it’s a bath he’s been looking forward to.');
  await tw(A.voss,{alpha:0},1200);A.voss.vis=false;D.dead.voss=1;P.stats.kills++;
  await N('His goggles float to the top. Then his lanyard. Then nothing at all.');
  if(A.nivaan)await say('nivaan','(still filming) Chat is losing its mind.','happy');
  if(A.david)await say('david','We should tell someone. We’re not going to tell anyone, are we.','shock');
  await complete('voss');return;
 }
 if(ch===2){SFX.crunch();await say('voss','Ah! Biting! A FRESH one.','evil')}
 else{await say('you','DAVID!');if(A.david)await say('david','I— I— (he doesn’t move a single muscle)','scared')}
 SFX.squelch();await tw(A.you,{y:126},250);A.you.vis=false;prop({t:'smoke',x:266,y:116});SFX.fire();
 await say('voss','Fifteen jars. A lovely round number. Well. Not round. Not anymore.','happy');
 await die('vat');
}});
