'use strict';
/* =====================================================================
   HIGHSCHOOL — the Roast Table, and Cheeks & Cheek-Clapper.
   ===================================================================== */

/* ---------- two grown men, and their art ---------- */
Object.assign(K,{
 cheeks:{n:'Cheeks',col:'#c86a2a',skin:'#e8b890',hair:'#3a2a1a',hs:'messy',top:'#c84a2a',pants:'#c84a2a',stripe:1,adult:1,wide:1,butt:1,nails:1,yteeth:1,seed:95,v:200,vw:'sawtooth'},
 clapper:{n:'Cheek-Clapper',col:'#6a3aa8',skin:'#d8a878',hair:'#1a1410',hs:'bald',top:'#6a3aa8',pants:'#6a3aa8',stripe:1,adult:1,wide:1,butt:1,nails:1,yteeth:1,tache:1,seed:96,v:170,vw:'sawtooth'}
});
{const dk=drawKid;drawKid=function(k,x,y,o){const r=dk(k,x,y,o);o=o||{};
 if(k.butt&&o.pose!=='sit'&&o.pose!=='lie'){const G=kidGeom(k,o),d=o.dir||1,bx=Math.round(x)-(G.bw>>1),top=Math.round(y)-G.legH-7,b=d>0?bx-7:bx+G.bw-1,c=o.topC||k.pants;
  R(b+1,top,7,12,c);R(b,top+2,9,8,c);R(b+(d>0?2:3),top+3,3,6,'rgba(255,255,255,.12)');R(b+(d>0?7:0),top+1,1,10,'rgba(0,0,0,.25)');R(b+1,top+11,7,1,'rgba(0,0,0,.3)')}
 return r}}
{const dh=drawHead;drawHead=function(k,x,hy,d,o){dh(k,x,hy,d,o);if(!k.yteeth)return;const ey=hy+(k.knob?6:5),ex=x+d,my=ey+3;if(o.talk||['happy','laugh','smirk','yell','evil','cold'].includes(o.ex))R(ex-1,my,3,1,'#d8c038')}}
{const dK=drawKid;drawKid=function(k,x,y,o){const r=dK(k,x,y,o);if(k.nails&&r&&o&&!o.noHead){/* long nails on both hands: little pale points under the hands */const G=kidGeom(k,o),bx=Math.round(x)-(G.bw>>1),by=Math.round(y)-G.legH-G.bodyH;if(!o.pose||o.pose==='hips'){R(bx-2,by+9,1,2,'#ece4b8');R(bx-1,by+10,1,1,'#ece4b8');R(bx+G.bw,by+9,1,2,'#ece4b8');R(bx+G.bw+1,by+10,1,1,'#ece4b8')}}return r}}
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='tripod'){R(x-1,y-24,2,24,'#2a2a2a');R(x-6,y-1,12,1,'#2a2a2a');R(x-5,y-4,1,4,'#2a2a2a');R(x+4,y-4,1,4,'#2a2a2a');R(x-5,y-30,10,7,'#1a1a1a');R(x+5,y-28,3,3,'#3a3a5a');if(Math.sin(T*5)>0)R(x-4,y-29,1,1,'#ff3030');return}
 if(p.t==='clapboard'){R(x-6,y-8,12,8,'#1a1a1a');R(x-6,y-10,12,2,'#e8e8e8');for(let i=0;i<12;i+=3)R(x-6+i,y-10,1,2,'#1a1a1a');px('4',x-1,y-6,'#fff');return}
 if(p.t==='belt'){R(x-8,y-2,16,4,'#c8a040');R(x-3,y-3,6,6,'#f0d870');R(x-1,y-1,2,2,'#c02020');return}
 return _dp(p)}}

/* =================================================================
   THE ROAST TABLE
   ================================================================= */
mission('roast',{name:'The Roast Table',icon:'🔥',who:['arjun','hasan','sean','nivaan','paul','kenneth','alex','dheva','aidan'],
 blurb:'Every Friday at lunch, the back table of the cafeteria turns into a roast battle. Everyone gets roasted. Everyone. The winner gets the Belt.',
 parts:['Lunch: survive the Roast Table'],tips:['Lunch, cafeteria. Sit down at the back table (talk to Arjun).'],variants:{belt:'Won the Belt',burnt:'Got burnt'}});
const ROASTS={
 aidan:[['Aidan’s bangs is so straight, the math department borrows it as a ruler.',2],['Aidan doesn’t walk into a room. He loads in.',2],['Aidan’s quiet.',0]],
 sean:[['Sean practiced saying “hi” so many times his mirror got a restraining order.',2],['Sean’s voice is gorgeous. His feet are still tripping over the same piece of air from sixth grade.',2],['Sean’s blonde.',0]],
 nivaan:[['Nivaan’s got ninety-one viewers and eighty of them are his own phone on different accounts.',2],['Nivaan livestreamed himself sleeping. Chat said it was his best content.',2],['Nivaan streams a lot.',0]],
 paul:[['Paul’s arms are so long he can high-five people in the next lesson.',2],['Paul’s never lost a wrestle because nobody wants to be that close to him.',2],['Paul’s tall.',0]],
 kenneth:[['Kenneth’s five foot seven but his ego plays for the Lakers.',2],['Kenneth’s hairline is on a fast break and it’s winning.',2],['Kenneth likes basketball.',0]],
 alex:[['Alex’s left foot is a weapon. The rest of him is a waiting room.',2],['Alex’s dad shouts “that’s my boy” at a different kid every single match.',2],['Alex plays soccer.',0]],
 dheva:[['Dheva’s spent so long on his hair, his parting has its own postcode.',2],['Dheva’s texture powder costs more than his phone, and it’s doing more work.',2],['Dheva has hair.',0]],
 arjun:[['Arjun roasts everyone because nobody’s ever invited him to an actual barbecue.',2],['Arjun’s forehead has more bumps than the 43’s route.',2],['Arjun’s mean.',0]]
};
const COMEBACK={
 aidan:'(not blinking) I’ve heard that one. Fourteen times. It was funnier the first time. It was the first time you said it every time.',
 sean:'At least my mirror talks back. Who talks to you? Your NAN? Your grandma’s on mute.',
 nivaan:'Chat’s typing… chat says “bro peaked in the line for fries”.',
 paul:'(standing up, very slowly, arms going on for ever) Do you want to say that from the floor?',
 kenneth:'I may be five seven, but my free-throw percentage is taller than your whole family.',
 alex:'My left foot’s got more friends than you. It’s got a group chat.',
 dheva:'(touching his hair, very calmly) This took forty minutes. Your whole personality took four.',
 arjun:'That’s actually funny. I hate that it’s funny. I’m writing it down so I can say it about someone else.'
};
hook({mis:'roast',period:4,room:'canteen',who:'arjun',label:'Sit down at the Roast Table',look:{pose:'cross',ex:'smirk'},cond:()=>!D.done.roast&&!D.dead.arjun,run:async()=>{
 const cast={arjun:[110,1,{y:146,pose:'cross'}],you:[90,1,{y:150}]};
 const seat=[130,150,170,190,210,230,250,270];
 const who=['hasan','sean','nivaan','paul','kenneth','alex','dheva','aidan'].filter(n=>!D.dead[n]&&!(n==='aidan'&&D.f.aidanDead));
 who.forEach((n,i)=>cast[n]=[seat[i],-1,{y:i%2?150:144}]);
 scene('canteen',cast);cue('canteen');
 await say('arjun','Welcome to the Roast Table. Rules: you roast who I point at. The table decides. Anyone who cries buys fries.','smirk');
 await say('hasan','I’ve bought fries four Fridays running.','sad');
 let score=0;const targets=['aidan','sean','nivaan','paul','kenneth','alex','dheva','arjun'].filter(n=>A[n]);
 for(const t of targets.slice(0,5)){
  pose('arjun','point');face('arjun',t);
  await say('arjun',t==='arjun'?'Go on then. Do me. I dare you.':nameOf(t)+'. Go.','smirk');pose('arjun',null);
  const opts=ROASTS[t].slice().sort(()=>Math.random()-.5);
  const i=await choose(opts.map(o=>o[0]),'Roast '+nameOf(t)+':');
  face('you',t);await say('you',opts[i][0]);
  const pts=opts[i][1];score+=pts;
  if(pts){SFX.cheer();for(const k of Object.keys(A))if(k!==t&&k!=='you'&&A[k]&&!TEACHERS.includes(k)){A[k].ex='laugh'}A[t].ex='shock';await wait(700);
   if(t==='paul'){pose('paul','hold');await hop('you',8,300);pose('paul',null);await N('Paul lifts you up by your armpits, holds you there for a second like a baby he’s proud of, and puts you back down.')}
   await say(t,COMEBACK[t],t==='aidan'?'smirk':'angry');
   for(const k of Object.keys(A))if(A[k]&&A[k].ex==='laugh')A[k].ex=null}
  else{await N('Silence. Someone’s fork scrapes a plate. It’s worse than booing.');await say(t,'…That’s not a roast. That’s a fact. You’ve just said a fact at me.','smirk')}
 }
 if(score>=8){
  await say('arjun','…Fine. FINE. The Belt goes to you. I hate it. Give it here so I can give it to you.','sad');
  const b=prop({t:'belt',x:A.you.x,y:A.you.y-16,follow:'you',dy:-14,layer:1});
  await N('The Belt is a cafeteria-tray strap with a Fanta lid glued to it. It is the most respected object in the building.');
  await complete('roast','belt');return;
 }
 await say('arjun','Weak. The Belt stays with me. Fries are on you.','smirk');
 await N('You buy nine portions of fries. Hasan eats two of them out of pure relief that it wasn’t him.');
 await complete('roast','burnt');
}});

/* more banter in chats, aimed at exactly these eight */
const BANTER={
 aidan:['Hasan says my bangs looks like a lampshade. I asked if it gives off light. He went quiet.','I’m not weird. I’m just early. You’ll all be weird eventually.'],
 sean:['Hasan says I walk like I’m apologising to the floor.','My voice is the only part of me that’s cool. The rest of me is buffering.'],
 nivaan:['Chat says I’m “the human equivalent of a loading screen”. Chat’s been mean since the update.','I streamed a fire drill. It’s my second-most-watched video. The first is me falling off a trash can.'],
 paul:['Kenneth says I hug like a car crash. I said thank you.','I’m not lanky. I’m long-form.'],
 kenneth:['Alex says my jump shot looks like I’m throwing away a parking ticket.','Height is just a number. My number’s small. That’s all.'],
 alex:['Dheva says I’ve got the conversation skills of a corner flag.','I don’t know how to talk to people. I know how to cross to them.'],
 dheva:['Arjun says my hair has more personality than me. Arjun hasn’t got hair OR a personality.','Paul ruffled my hair once. We don’t talk about it. He doesn’t know we don’t talk about it.'],
 arjun:['Everyone roasts me back now. It’s exhausting. I created a monster and the monster is all of you.','I’m not mean. I’m early. You’ll all be this honest when you’re forty.']
};
for(const id in BANTER)if(CHAT[id])CHAT[id].push(...BANTER[id]);

/* =================================================================
   CHEEKS & CHEEK-CLAPPER — Fists of Fair City 4
   ================================================================= */
mission('cheeks',{name:'Fists of Fair City 4',icon:'🎬',who:['nivaan','paul'],
 blurb:'Cheeks & Cheek-Clapper are two grown men with a YouTube channel, 312 subscribers, huge backsides, very long nails and teeth the color of old piano keys. They’re filming the fourth Fists of Fair City. They need extras.',
 parts:['Break: Nivaan finds the casting call','After school: the rooftop parking shoot'],
 tips:['Break, main corridor. Nivaan’s watching something he shouldn’t be.','After school, Fair City Mall rooftop parking.'],variants:{premiere:'Henchman #2',glen:'Shut down by Big Glen'}});
hook({mis:'cheeks',period:2,room:'corridor',who:'nivaan',label:'Ask Nivaan what he’s laughing at',look:{pose:'phone',ex:'laugh'},cond:()=>!D.f.ch1,run:async()=>{
 scene('corridor',{nivaan:[120,-1,{pose:'phone',ex:'laugh'}],you:[96,1,{y:154}]});
 await say('nivaan','(crying laughing) You HAVE to see this. These two grown men. They make action films. In the Fair City Mall parking lot.','laugh');
 await dms('Cheeks & Cheek-Clapper Productions','312 subscribers',[
  ['them','FISTS OF FAIR CITY 3: THE CLAPPENING — out now!! 🎬👊🍑','Mon 18:20'],['note','4:51 · 1,204 views'],
  ['them','CASTING CALL!!! Fists of Fair City 4. Need henchmen + 1 stuntman. Roof parking lot, Fair City Mall, 4pm TODAY. Bring own snacks. No pay. Exposure!!','Fri 07:12'],
  ['note','Top comment: “why do they keep hitting each other with their backsides”'],['note','Reply from Cheeks: “its called THE CHEEK CLAP. it’s a martial art. look it up. (we invented it)”']]);
 await say('nivaan','They slap each other in the face with their butts. Fully clothed. In tracksuits. As a FIGHTING STYLE. They’ve got a whole lore.','laugh');
 await say('nivaan','We’re going. You’re a henchman. I’m the camera. Paul’s going to want to be the stuntman. Paul is ALWAYS the stuntman.','happy');
 D.f.ch1=1;part('cheeks',1);
}});
{const _b=buildRoom;buildRoom=function(room){_b(room);if(D.period===8&&room==='carpark'&&D.f.ch1&&!D.done.cheeks){put('cheeks',182,1,{y:150,hold:'clipboard'});put('clapper',212,-1,{y:150,pose:'hips'});prop({t:'tripod',x:150,y:152,dress:1,keep:1})}}}
hook({mis:'cheeks',period:8,room:'carpark',who:'cheeks',label:'“We’re here for the casting call.”',look:{ex:'happy'},cond:()=>D.f.ch1&&!D.done.cheeks,run:async()=>{
 const cast={cheeks:[182,1,{y:150,hold:'clipboard'}],clapper:[212,-1,{y:150,pose:'hips'}],you:[120,1,{y:156}]};
 if(!D.dead.nivaan)cast.nivaan=[96,1,{y:154,pose:'film'}];if(!D.dead.paul)cast.paul=[70,1,{y:150}];
 scene('carpark',cast);cue('arcade');
 await say('cheeks','EXTRAS! Welcome to the set of FISTS OF FAIR CITY FOUR. I’m Cheeks. Director, writer, lead, catering.','happy');
 await say('clapper','And I’m Cheek-Clapper. Star. Stunts. Emotional core of the franchise.','happy');
 await N('Two enormous men in straining tracksuits. Teeth the color of a nicotine ceiling. Cheeks’ nails are long enough to have their own weather.');
 if(A.paul)await say('paul','I’d like to be the stuntman. I’ve done my own stunts since the womb.','happy');
 await say('cheeks','Love the energy. Love the arms. YOU. Henchman Number Two. Here’s your line: “Boss, he’s too powerful!”','happy');
 await say('cheeks','SCENE ONE. The Clap of Doom. ACTION!','yell');
 hold('cheeks',null);prop({t:'clapboard',x:166,y:136});SFX.smack();
 await say('clapper','(in a deep movie voice) You thought you could run Fair City, Cheeks?','angry');
 await say('cheeks','(in a deeper movie voice) I don’t RUN Fair City. Fair City runs from ME.','angry');
 await say('you','Boss, he’s too powerful!');
 face('clapper',1);await walk('clapper',196,40);
 await N('Cheek-Clapper turns round, plants his feet, sticks his backside out like a battering ram, and reverses into Cheeks at full speed.');
 SFX.smack();shake(.9);await tw(A.cheeks,{x:240,y:150},360);
 await N('BOOMF. Cheeks takes it full in the face. He spins once, staggers, and goes down on the hood of a Honda Civic.');
 A.cheeks.pose='lie';SFX.thud();
 await wait(500);
 await say('cheeks','(from the car) …CUT. CUT. That was BEAUTIFUL. Did you get that? Tell me you got that.','laugh');
 if(A.nivaan)await say('nivaan','(shaking) I got it. I got it in 4K. I’m never going to be okay again.','laugh');
 A.cheeks.pose=null;await walk('cheeks',204,40);face('cheeks',-1);face('clapper',1);
 await N('They laugh until they can’t breathe, then celebrate the only way they know: slapping each other’s cheeks. Click click click go the nails.');
 for(let i=0;i<4;i++){pose(i%2?'clapper':'cheeks','punch');A[i%2?'clapper':'cheeks'].punchT=T+.25;SFX.smack();await wait(240)}
 pose('cheeks',null);pose('clapper',null);
 await say('clapper','SCENE TWO! The henchman gets clapped! That’s you!','happy');
 const c=await choose(['Take the hit. For cinema.','Dodge. Improvise.','“Paul’s the stuntman. Paul, take it.”',]);
 if(c===2&&A.paul){
  await walk('paul',192,60);face('paul',1);face('clapper',-1);
  await N('Cheek-Clapper reverses into Paul at full speed. Paul doesn’t move one millimetre. Cheek-Clapper bounces off him like a beach ball off a wall.');
  SFX.thud();shake(.8);await tw(A.clapper,{x:250},300);A.clapper.pose='lie';
  await say('paul','(not turning round) Was that the stunt? I didn’t feel the stunt.','shock');
  await say('cheeks','…That’s our ENDING. That’s the twist. The henchman was the hero all along. Fists Five writes itself.','cry');
 }else if(c===1){
  await walk('clapper',140,60);A.you.z=0;await hop('you',14,400);SFX.whoosh();
  await N('You dive sideways. Cheek-Clapper reverses past you, keeps going, and backs straight into Big Glen, who has just walked up the ramp.');
  put('glen',334,-1,{y:150});await walk('glen',150,140);SFX.thud();shake(.8);A.clapper.pose='lie';
  await say('glen','…Permit.','angry');
  await say('cheeks','We have a permit! In spirit!','scared');
  await say('glen','Off. My. Roof.','angry');
  await N('They pack up in eleven seconds. They’ve clearly done it before. As they go, Cheeks presses a business card into your hand. It just says “CALL US (FOR FISTS 5)”.');
  await complete('cheeks','glen');return;
 }else{
  await walk('clapper',140,60);face('clapper',1);
  await N('You brace. Cheek-Clapper reverses into you. It’s like being hit in the face by a warm sofa.');
  SFX.smack();shake(1);await tw(A.you,{x:96},300);A.you.pose='lie';await wait(600);A.you.pose=null;
  await say('cheeks','PERFECT. You’ve got a face made for being clapped. That’s a compliment in this industry.','happy');
 }
 await N('The premiere: everyone round Nivaan’s phone on the parking lot roof. Three minutes. Terrible. Nobody has ever been happier.');
 await say('clapper','(wiping his eyes with a long, long nail) Henchman Number Two… you were the heart of it.','cry');
 await say('cheeks','Credits roll! Look! Look at your name!','happy');
 await N('Under “HENCHMAN #2”, in Comic Sans, is your name. Spelt wrong.');
 await complete('cheeks','premiere');
}});
