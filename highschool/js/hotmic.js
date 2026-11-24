'use strict';
/* =====================================================================
   HIGHSCHOOL — HOT MIC
   Mr. Adam needs his PA fixed before his very important “budget
   meeting”. You fix it. Sort of. The ON AIR light never goes off.
   Period 5, in class, the speaker crackles, and the whole school hears
   what the staff do in the Vice Principal's office at 1:20 on a weekday.
   (Filthy adults on air. The kids just have to live with it.)
   ===================================================================== */
Object.assign(ITEMS,{etape:'A roll of electrical tape'});
mission('hotmic',{name:'Hot Mic',icon:'🎙️',who:['adam','balduf','coach','nurse','grieve'],
 goal:'Fix Mr. Adam’s PA before his “meeting”.',
 blurb:'Mr. Adam has a very important budget meeting in his office before Period 5. Door locked. Blinds down. He needs the PA fixed first, and the AV kid is “unavailable”.',
 parts:['Break or lunch: Mr. Adam’s favor','Fix the PA (tape from Woodwork)','Period 5: the broadcast'],
 tips:['Break or lunch, the Vice Principal’s Office (Front Hall).','Grab electrical tape in Woodwork, then fix the PA box in the Vice Principal’s Office.','Period 5 or 6, in your class. Sit down. Listen.'],
 variants:{zap:'You cut the power',viral:'It went viral',radio:'Highgate Public Radio'}});
if(typeof OUTCOME_FIX!=='undefined')Object.assign(OUTCOME_FIX,{'hotmic:viral':'good','hotmic:radio':'good','hotmic:zap':'messy'});
/* the PA speaker, on the classroom wall */
{const _dp=drawProp;drawProp=function(p){if(p.t==='pa'){const x=Math.round(p.x),y=Math.round(p.y);
  R(x-9,y-6,18,13,'#2a2a30');R(x-8,y-5,16,11,'#3a3a44');for(let i=0;i<4;i++)R(x-6,y-3+i*2.5,12,1,'#1a1a20');
  R(x+6,y-5,2,2,p.on?(Math.sin(T*10)>0?'#ff3030':'#a01010'):'#401010');
  if(p.on){g.globalAlpha=.6;const k=(T*2)%1;for(let j=0;j<2;j++){const r=10+((k+j*.5)%1)*12;R(x-r,y+8+j,1,3,'#f4ead8');R(x+r,y+8+j,1,3,'#f4ead8')}g.globalAlpha=1}
  return}
 if(p.t==='pabox'){const x=Math.round(p.x),y=Math.round(p.y);R(x-6,y-10,12,14,'#4a4a52');R(x-5,y-9,10,12,'#5a5a64');R(x-3,y-7,2,2,p.on?'#ff3030':'#401010');R(x,y-6,4,1,'#c8a040');R(x,y-4,3,1,'#40a0c8');return}
 return _dp(p)}}
function milkSpray(x,y,dir){for(let i=0;i<46;i++){const a=dir>0?rand(-.5,.15):rand(Math.PI-.15,Math.PI+.5),v=rand(40,140);parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-rand(0,20),c:i%3?'#c89a6a':'#f4ead8',s:Math.random()<.3?2:1,fy:y+22+rand(-3,4),life:3})}}

/* 1 · the favor */
hook({mis:'hotmic',period:[2,4],room:'office',who:'adam',label:'Ask Mr. Adam why he’s sweating',look:{ex:'scared'},cond:()=>!D.f.hm1&&!D.dead.adam&&cal()>=2,run:async()=>{
 scene('office',{adam:[160,-1,{y:154,ex:'scared'}],you:[118,1,{y:156}]});
 if(typeof beat==='function')await beat('HOT MIC','PART ONE · THE FAVOR');
 const pa=prop({t:'pabox',x:262,y:120,layer:5});
 await say('adam','You. Kid. You look like a kid who’s good with wires. You have a wire face.','scared');
 await say('adam','The PA’s dead. The AV kid is… unavailable.','scared');
 const c=await choose(['“What happened to the AV kid?”','“What’s in it for me?”','“Why are you sweating, sir?”']);
 if(c===0)await say('adam','He’s unavailable. Permanently. Moving on. Moving ON.','cold');
 if(c===1)await say('adam','A hall pass. Laminated. You can go anywhere. Except here. Especially after lunch.','smirk');
 if(c===2)await say('adam','It’s warm. It’s a warm office. Ms. Balduf says it’s warm in here too. When she— when she visits. For the budget.','scared');
 await say('adam','I need it working by Period 5. I have a meeting. In here. Door locked. Ms. Balduf and I are going over the budget. With our— with the budget. It’s a hands-on budget.','blush');
 await say('adam','Electrical tape’s in Woodwork. The box is behind my desk. Don’t touch anything else in my desk. Don’t open the bottom drawer. It’s not a massager. It’s for my back. Don’t open it.','scared');
 D.f.hm1=1;part('hotmic',1);return 'stay';
}});
/* the tape */
spot({room:'woodwork',x:210,y:150,label:'Grab electrical tape off the Woodwork bench (for the PA)',short:'GRAB',sparkle:1,mis:'hotmic',jdraw:{sh:'tool'},cond:()=>D.f.hm1&&!D.f.hm2&&!has('etape'),run:async()=>{
 clearTalk();await walk('you',204,70);pose('you','reach');await wait(220);pose('you','grab');give('etape');hold('you','J:tool');await wait(380);hold('you',null);pose('you',null);
 toast('Now: fix the PA box in the Vice Principal’s Office');return 'stay'}});
/* 2 · the fix */
spot({room:'office',x:262,y:150,label:'Fix the PA box behind Mr. Adam’s desk',short:'FIX',mis:'hotmic',cond:()=>D.f.hm1&&!D.f.hm2&&has('etape'),run:async()=>{
 clearTalk();scene('office',{you:[244,1,{y:152}]},true);const pa=prop({t:'pabox',x:262,y:120,layer:5});
 if(typeof beat==='function')await beat('HOT MIC','PART TWO · THE FIX');
 pose('you','reach');await N('You pull the cover off the PA box. It’s two wires, a lot of dust, and a sticky note that says “GERALD — DON’T” in Ms. Balduf’s handwriting.');
 const r=await meter('Splice the wires',{speed:1.1});pose('you','saw');SFX.zap&&SFX.zap();flash('#fff',.25);
 pa.on=1;pose('you',null);take('etape');
 await N(r>0?'Perfect splice. The little red ON AIR light comes on. You flick the switch off. The light stays on. You flick it again. It stays on.':'Sparks. Your eyebrows get warmer. The little red ON AIR light comes on. You flick the switch off. The light stays on.');
 await N('Huh. You put the cover back on. That’s future-you’s problem. Future-you is in Period 5.');
 D.f.hm2=1;D.f.hm2day=cal();part('hotmic',2);return 'stay';
}});
/* 3 · the broadcast: whatever class you're in, Period 5 or 6 */
const HM_VOICES=['adam','balduf','coach','nurse','grieve'];
hook({mis:'hotmic',period:[5,6],get room(){return D&&myClassFor(D.period)},set room(v){},who:'auto',cond:()=>D.f.hm2&&!D.done.hotmic&&!D.dead.adam&&!D.dead.balduf,run:async()=>{
 const room=D.room,kids=['hasan','nivaan','arjun','omer','paul'].filter(k=>K[k]&&!D.dead[k]);
 const cast={you:[150,1,{y:154,pose:'sit'}]};
 const xs=[60,100,200,240,280];kids.forEach((k,i)=>cast[k]=[xs[i],i<2?1:-1,{y:i%2?146:154,pose:'sit'}]);
 const sub=K.valentino?'valentino':null;if(sub)cast[sub]=[30,1,{y:140}];
 scene(room,cast,true);
 if(typeof beat==='function')await beat('HOT MIC','PART THREE · THE BROADCAST');
 const pa=prop({t:'pa',x:160,y:28,layer:-50});if(A.hasan)hold('hasan','mug');if(A.nivaan){pose('nivaan','phone')}
 if(sub)await say(sub,'Your teacher is “in a meeting”. I am your substitute. I don’t know what this class is. Read something.','cold');
 SFX.static&&SFX.static();pa.on=1;
 await N('Halfway through the lesson, the speaker on the wall crackles. The little red light on it comes on. Everybody looks up.');
 await say('adam','(on the speaker) …is it on? It’s not on. The kid fixed it. The light’s just broken, Doris. Get over here.');
 await say('balduf','(on the speaker) Pants. Off. Now, Gerald. I’ve been thinking about your sad little body through all of second period.');
 for(const k of kids)if(A[k])A[k].ex='shock';
 await say('adam','(on the speaker) Yes ma’am. Should I— should I fold them?');
 await say('balduf','(on the speaker) Did I SAY fold them? Throw them in the shredder. You’re going home in a trash bag like last time.');
 if(A.hasan){pose('hasan','drink');await N('Hasan, frozen, takes a slow sip of his chocolate milk so his face has something to do.')}
 SFX.thud&&SFX.thud();shake(.4);
 await N('A desk creaks. Then it creaks again. Then it starts creaking on a rhythm, and the rhythm is not a good rhythm, and the whole school is now hearing it in surround sound.');
 await say('adam','(on the speaker) Oh God, Doris. Oh GOD. Talk dirty to me. Talk about the budget.');
 await say('balduf','(on the speaker) Forty percent cut to the arts department, Gerald.');
 await say('adam','(on the speaker) NNNGH—');
 await say('balduf','(on the speaker) We’re selling the band’s instruments. ALL of them. The TUBA, Gerald.');
 await say('adam','(on the speaker) Oh the tuba— oh the TUBA— DORIS I’M GONNA—');
 SFX.thud&&SFX.thud();
 await say('adam','(on the speaker) …');
 await say('balduf','(on the speaker, flat) Four seconds. That’s a new record, Gerald. Wrong direction.');
 if(A.hasan){pose('hasan',null);A.hasan.ex='shock';SFX.squelch&&SFX.squelch();milkSpray(A.hasan.x+A.hasan.dir*6,A.hasan.y-26,A.hasan.dir);shake(.8);
  if(typeof camZoom==='function')await camZoom(A.hasan.x,A.hasan.y-26,1.8,200);
  await N('Hasan sprays chocolate milk halfway across the room. It hits Arjun in the mouth. Arjun had his mouth open because he was screaming.');
  if(typeof camZoom==='function')await camZoom()}
 if(A.arjun){pose('arjun','hurt');await say('arjun','IT’S IN MY MOUTH. HIS MILK IS IN MY MOUTH AND THE VICE PRINCIPAL JUST FINISHED IN FOUR SECONDS. THIS IS THE WORST DAY OF MY LIFE.','shock');pose('arjun',null)}
 if(A.omer){pose('omer','hurt');SFX.squelch&&SFX.squelch();await N('Omer throws up into his backpack. Quietly. Respectfully. Zips it back up.');pose('omer',null)}
 if(A.nivaan)await say('nivaan','(filming the speaker) Chat. CHAT. Fourteen thousand viewers. Somebody just donated twenty bucks with the message “TUBA”.','laugh');
 SFX.knock&&SFX.knock();
 await say('coach','(on the speaker, banging on the door) GERALD. IT’S DALE. I heard the tuba thing from the GYM. Is it my turn? I’ve been warming up. I did lunges.');
 await say('balduf','(on the speaker) Get in here, Dale. Lock it. Leave the whistle on.');
 await say('coach','(on the speaker) The whistle never comes off, Doris. You know that. The whistle has seen things.');
 for(const k of kids)if(A[k]){pose(k,'cover')}
 await N('Every kid in the room screams at once, like a flock of birds leaving a tree that’s on fire.');
 await say('nurse','(on the speaker) Knock knock! Heard there was a staff meeting. I brought the lube from the nurse’s office. It says “for medical use only” and baby, this IS medical.');
 await say('adam','(on the speaker) Pam, you can’t bring the speculum in h— oh, she brought the speculum.');
 await say('grieve','(on the speaker, the door slamming) DORIS. You told me you were RE-SHELVING.');
 await say('balduf','(on the speaker) I am re-shelving, Barnaby. Gerald is the shelf. Get on your knees and be a footstool or get out.');
 await say('grieve','(on the speaker, a long, long pause, then a zipper) …For the Union.');
 if(sub){await walk(sub,150,60);pose(sub,'reach');await N('Mr. Valentino reaches up and turns the volume knob on the speaker, very slowly, all the way down. It comes off in his hand. The volume goes UP.');pose(sub,null);await say(sub,'(holding the knob) I need you all to know I was a pastry chef.','cold')}
 for(const k of kids)if(A[k])pose(k,'sit');
 const c=await choose([{t:'Sprint to the office and cut the power.',tag:'⚡'},{t:'Let it play. Hit record.',tag:'📱'},{t:'Grab the classroom phone and get on the PA yourself.',tag:'🎙️'}],'The whole school is listening. You did this.');
 if(c===0){
  pose('you',null);await walk('you',-20,170);
  scene('office',{you:[130,1,{y:158,pose:'lie'}],adam:[160,-1,{y:154,ex:'shock'}],balduf:[190,-1,{y:154,ex:'shock'}],coach:[70,1,{y:150}],nurse:[100,1,{y:152}],grieve:[40,1,{y:148,ex:'angry'}]},true);
  const pb=prop({t:'pabox',x:262,y:120,layer:5});
  SFX.zap&&SFX.zap();flash('#fff',.8);shake(1.4);
  await N('You yank the PA cable out with both hands. Two hundred and forty volts go up your arms and you black out.');
  await N('You wake up on the office carpet. Five teachers are standing over you. Nobody says anything for a very long time.');
  await say('nurse','(crouching, still wearing the gloves) Pupils are fine. He’ll live. He’ll wish he didn’t.','smirk');
  hold('adam','paper');await say('adam','(handing you a laminated hall pass that says NOTHING HAPPENED) …You fixed it too well.','cold');hold('adam',null);
  if(typeof repAdd==='function')repAdd('legend',1);
  await complete('hotmic','zap');return 'stay';
 }
 if(c===1){
  pose('you','phone');await N('You hold your phone up next to Nivaan’s. It goes on for four more minutes. Somebody on the floor below starts a slow clap that spreads through the whole building.');
  await N('By home time it has a remix. By tomorrow it has a dance where you go limp after four seconds. For the rest of your life, someone in a hallway will yell “THE TUBA” and you will think of this.');
  pose('you',null);if(typeof repAdd==='function'){repAdd('legend',2,'Hot Mic went viral')}
  await complete('hotmic','viral');return 'stay';
 }
 await walk('you',40,90);pose('you','phone');
 await say('you','(into the classroom phone, on every speaker in the building) Thank you for listening to Highgate Public Radio. Up next: the weather. It’s hot. It’s very hot in the Vice Principal’s Office.');
 await N('Dead silence. On the speaker, five adults stop breathing at the same time.');
 await say('adam','(on the speaker, very quietly) …Who said that.');
 await N('The red light goes off. Across the school, nine hundred kids lose their minds.');
 pose('you',null);if(typeof repAdd==='function')repAdd('legend',1,'Highgate Public Radio');(P.grudge=P.grudge||{}).adam=1;
 await complete('hotmic','radio');return 'stay';
}});
/* afterwards: the school won't let it go */
if(typeof CHAT!=='undefined'){const add=['FOUR SECONDS. The man lasted FOUR SECONDS.','The band kids are hiding the tuba from Mr. Adam now.','“The whistle has seen things.” I’m never doing PE again.','Grieve said FOR THE UNION, bro.','Don’t go to the nurse. She’s out of lube and everyone knows why.'];
 ON_PERIOD.push(async()=>{if(D&&D.done&&D.done.hotmic&&!TEST&&Math.random()<.35&&D.period>0)setTimeout(()=>toast('🗣 Someone in the hall: “'+pick(add)+'”'),4200)})}
