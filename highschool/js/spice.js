'use strict';
/* =====================================================================
   HIGHSCHOOL — SPICE
   • HALL FIGHTS: between classes two kids go at it and the hall forms a
     ring, chanting. Watch, bet, break it up, or jump in.
   • THE REAL LOCKDOWN (week two, once a run, serious): an armed stranger
     in the halls. Hide, pull the fire alarm, talk him down, or go for the
     gun. If you take it off him, you decide what happens to him.
     (The player only ever uses a gun taken from the attacker.)
   • START A NEW TWO WEEKS: on the title screen and the pause menu.
   ===================================================================== */
const HALLS_F=['corridor','hallb','upper','wing_sci','wing_arts','wing_sports'];
const FIGHTERS=['arjun','brayden','jaxon','kayden','omer','tez','angelo','marcus','paul','kenneth','alex','jacob','kaylee','jade'];
chaos('hallfight',HALLS_F,[0,1,2,3,4,5,6],.18,async()=>{
 const pool=FIGHTERS.filter(k=>K[k]&&!D.dead[k]);if(pool.length<2)return;
 const a=pick(pool),b=pick(pool.filter(k=>k!==a));const f=floorOf(D.room),cy=clamp(A.you.y-4,f[0]+4,f[1]-2),cx=A.you.x<160?200:120;
 for(const [k,x,d] of[[a,cx-9,1],[b,cx+9,-1]]){if(A[k])remove(k);put(k,x<160?-16:336,x<160?1:-1,{y:cy,ex:'angry'});walk(k,x,120).then(()=>{if(A[k])A[k].dir=d})}
 const ring=[];for(let i=0;i<9;i++){const id=makeExtra(700+i+cal()*11);const ang=i/9*Math.PI*2,x=cx+Math.cos(ang)*30,y=clamp(cy+Math.sin(ang)*8,f[0],f[1]);put(id,x<160?-14:334,1,{y});A[id].extra=1;A[id]._role='posted';A[id].idle=1e9;walk(id,x,80+Math.random()*40);ring.push(id)}
 await wait(TEST?0:1100);
 for(const id of ring)if(A[id]){A[id].pose='cheer';A[id].ex='laugh';face(id,A[id].x<cx?1:-1)}
 SFX.cheer&&SFX.cheer();
 for(let i=0;i<3;i++)if(typeof bubbles!=='undefined')bubbles.push({id:pick(ring),txt:pick(['FIGHT! FIGHT! FIGHT!','OHHHHHHH','WORLDSTAR','HIT HIM','NOT THE FACE','I GOT FIVE ON '+K[a].n.toUpperCase()]),t:2.4});
 await N(K[a].n+' and '+K[b].n+' are squaring up in the middle of the hall. In about four seconds there’s a ring of thirty kids, phones up, chanting.');
 await say(a,pick(['Say it again. SAY IT AGAIN.','You talk all that and now you’re quiet?','My MOM? You said my MOM?']),'angry');
 await say(b,pick(['I’ll say it to your FACE.','Swing then. SWING.','You wanna do this? Here? Okay.']),'angry');
 await hit(a,b,{blood:3});await hit(b,a,{blood:4});
 const c=await choose([{t:'Watch from the ring.',tag:'👀'},{t:'Bet $2 on '+K[a].n+'.',tag:'💵'},{t:'Break it up.',tag:'✋'},{t:'Jump in on '+K[b].n+'’s side.',tag:'👊'}],'FIGHT! FIGHT! FIGHT!');
 if(c===1){if((D.money||0)<2){await N('You don’t have two dollars. You bet your dignity instead.')}else D.money-=2;updateLoc()}
 if(c===2){const ok=await mash('BREAK IT UP',{need:18,time:3.6,info:'Get between them! MASH!'});
  if(ok){await walk('you',cx,120);for(const k of[a,b])if(A[k]){A[k].ex='cold';A[k].pose=null}await N('You get between them, arms out. It could go either way. Then they both decide it’s your fault and storm off in opposite directions.');if(typeof repAdd==='function')repAdd('liked',1)}
  else{await walk('you',cx,120);await hit(a,'you',{blood:5});A.you.hurt=Math.min(3,(A.you.hurt||0)+1);await N('You step in. You catch one from each side. The ring goes “OHHHHH” like it’s the best thing they’ve ever seen.')}}
 else if(c===3){const ok=await mash('FIGHT',{need:20,time:4});await walk('you',cx-14,120);
  if(ok){await hit('you',a,{blood:6});A[a].pose='lie';A[a].hurt=2;await N(K[a].n+' goes down. The ring loses its mind. '+K[b].n+' looks at you like you just became family.');if(typeof bond==='function'&&FRIENDS.includes(b))bond(b,1);if(typeof repAdd==='function')repAdd('feared',1)}
  else{await hit(a,'you',{blood:6});A.you.hurt=Math.min(3,(A.you.hurt||0)+1);await N('You jump in and get put straight on the floor. Somebody’s video of it gets four thousand views by lunch.')}}
 else{await hit(a,b,{blood:5});const loser=Math.random()<.5?a:b,winner=loser===a?b:a;A[loser].pose='lie';A[loser].hurt=2;
  await N(K[winner].n+' lands one clean and '+K[loser].n+' goes down. The ring explodes.');
  if(c===1){if(winner===a){D.money=(D.money||0)+5;updateLoc();toast('💸 +$5. Your fighter won.')}else toast('You lost $2. Your fighter is on the floor.')}}
 /* a teacher breaks it up, everyone scatters */
 const t=['shermian','adam','coach'].find(k=>K[k]&&!D.dead[k]);
 if(t){put(t,A.you.x<160?336:-16,A.you.x<160?-1:1,{y:cy,ex:'angry'});await walk(t,clamp(cx+(A.you.x<160?40:-40),20,300),140);await say(t,pick(['BREAK IT UP. BREAK. IT. UP.','Phones away or I take them AND the hand.','Every single one of you. Office. NOW.']),'yell')}
 for(const id of ring)if(A[id]){A[id].pose=null;walk(id,Math.random()<.5?-30:350,110+Math.random()*30).then(()=>{if(A[id])remove(id)})}
 for(const k of[a,b])if(A[k]){A[k].pose=null;walk(k,A[k].x<160?-30:350,90).then(()=>{if(A[k])remove(k)})}
 await wait(TEST?0:900);if(t&&A[t])walk(t,A[t].x<160?-30:350,90).then(()=>{if(A[t])remove(t)});
});

/* ================= THE REAL LOCKDOWN ================= */
K.intruder={n:'The Guy in the Hoodie',col:'#2a2a30',skin:'#d8b098',hair:'#1a1410',hs:'messy',top:'#1e1e24',pants:'#2a2a33',hood:1,adult:1,seed:777,v:150};K.intruder.id='intruder';
DEATHS.lockdown={name:'Lockdown',desc:'You went for it. It went off first.',hint:'The real lockdown. Wait for your moment. Get behind him.'};
chaos('reallockdown',HALLS_F,[1,3,5,6,2,4],.3,async()=>{
 D.f.realLD=1;P.realLD=P.realLD||{};P.realLD[P.calStarted+':'+(P.runs||0)]=1;
 const f=floorOf(D.room);
 cue('tension',true);SFX.bell&&SFX.bell();fxState.tint='#600010';fxState.tintA=.12;
 await N('The PA crackles. Mr. Adam’s voice, flat and fast: “LOCKDOWN. LOCKDOWN. This is NOT a drill. Teachers, lock your doors.”');
 for(const id of Object.keys(A))if(id!=='you'&&A[id]&&!A[id].dead){A[id].ex='scared';walk(id,A[id].x<160?-30:350,150).then(()=>{if(A[id]&&id!=='you')remove(id)})}
 await N('Every door in the hall slams. Locks click, one after another, all the way down. And you’re on the wrong side of all of them.');
 const fromL=A.you.x>160;put('intruder',fromL?-16:336,fromL?1:-1,{y:clamp(A.you.y-3,f[0],f[1]),hold:'pistol',ex:'cold'});
 await walk('intruder',fromL?40:280,55);
 await N('At the end of the hall, somebody comes through the fire doors. Older. Black hoodie. He’s holding something low by his leg. He hasn’t seen you yet.');
 const c=await choose([{t:'Hide. Get into the doorway, flat against the wall.',tag:'🫥'},{t:'Pull the fire alarm next to you.',tag:'🚨'},{t:'Talk to him.',tag:'🗣'},{t:'Wait for him to turn. Then go for the gun.',tag:'⚡'}],'Somebody with a gun is in the hall with you.');
 const end=async()=>{fxState.tintA=0;if(A.intruder)remove('intruder');cue(ROOMS[D.room]&&ROOMS[D.room].music||'corridor',true)};
 if(c===0){A.you.alpha=.35;A.you.back=1;
  await walk('intruder',A.you.x+(fromL?-60:60),40);
  await N('You press yourself into the door frame and stop breathing. He walks past close enough that you can hear him muttering. He doesn’t look left.');
  await N('Shouting from the stairwell. Radios. Boots. “GUN DOWN, GUN DOWN.” Then it’s over, and you’re still in the doorway, shaking.');
  A.you.alpha=1;A.you.back=0;await end();return}
 if(c===1){pose('you','reach');SFX.bell&&SFX.bell();shake(.6);pose('you',null);A.intruder.ex='shock';
  await N('You yank the fire alarm. The whole building screams. Doors burst open and nine hundred kids pour out of every exit at once.');
  await N('He panics in the crowd and runs for the side door. Right into Coach, who has been waiting for this moment his entire career. It doesn’t take long.');
  if(typeof repAdd==='function')repAdd('legend',1);await end();return}
 if(c===2){
  await say('you','Hey. Hey. Whatever this is about. It doesn’t have to happen.');A.intruder.dir=fromL?1:-1;
  await say('intruder','(not looking at you) Nobody here ever listened to me. Not once. Four years.','cold');
  const c2=await choose(['“I’m listening right now. I’m right here.”','“Then why are you doing THIS?”','“Put it down or you’re gonna regret it.”']);
  if(c2===0){await say('intruder','(long pause, voice breaking) …I don’t even know why I came here.','sad');
   await N('His arm drops. He sits against the lockers, puts it on the floor, and cries. You keep talking until the police come round the corner, slow, hands up.');
   hold('intruder',null);A.intruder.pose='sit';if(typeof repAdd==='function')repAdd('liked',2,'talked him down');await wait(TEST?0:600);await end();return}
  await say('intruder','(turning to you) …Wrong answer.','evil');
  return lockdownStruggle(true,end)}
 return lockdownStruggle(false,end);
},()=>window.EDITION!=='safe'&&typeof cal==='function'&&cal()>=8&&!D.f.realLD&&!(P.realLD&&P.realLD[P.calStarted+':'+(P.runs||0)]));
async function lockdownStruggle(seen,end){
 const a=A.intruder;
 if(!seen){await N('He stops at a classroom door and tries the handle. His back is to you.');}
 const r=await meter('Close the gap',{speed:seen?1.5:1.1,zone:seen?.18:.26});
 await walk('you',a.x+(A.you.x<a.x?-10:10),160);
 if(r===0){SFX.bang&&SFX.bang();shake(1.6);flash('#a00010',.5);blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);A.you.pose='lie';
  await N('He hears you. He turns. It’s very loud and then it’s very quiet.');await end();await die('lockdown');return}
 const ok=await mash('GET THE GUN',{need:26,time:4.5,info:'Both hands on his wrist. MASH!'});
 if(!ok){SFX.bang&&SFX.bang();shake(1.6);flash('#a00010',.5);blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);A.you.pose='lie';
  await N('You get one hand on it. Not two.');await end();await die('lockdown');return}
 hold('intruder',null);hold('you','pistol');a.pose='lie';a.ex='shock';SFX.smack&&SFX.smack();shake(1);
 await N('You twist his wrist until it bends wrong and the gun drops into your hand. He goes down on his back. Now you’re the one holding it.');
 const c=await choose([{t:'Kick him onto his front and sit on him till the cops come.',tag:'🚔'},{t:'Knock him out cold with it.',tag:'💥'},{t:'Pull the trigger.',tag:'🩸'}],'He’s on the floor. You have the gun.');
 if(c===0){pose('you','kneel');await N('Knee in his back, his arms pinned, six minutes. The longest six minutes there have ever been. When the police come, you slide the gun across the floor to them.');
  if(typeof repAdd==='function')repAdd('legend',3,'stopped the lockdown');hold('you',null);pose('you',null)}
 else if(c===1){pose('you','overhead');await wait(TEST?0:200);SFX.smack&&SFX.smack();shake(1.2);a.ex='dead';pose('you',null);
  await N('One swing, flat side, right on the temple. He’s out. You drop the gun like it’s hot and back away from it until you hit the lockers.');
  if(typeof repAdd==='function'){repAdd('legend',2,'stopped the lockdown');repAdd('feared',1)}hold('you',null)}
 else{pose('you','point');await wait(TEST?0:500);SFX.bang&&SFX.bang();shake(1.8);flash('#ffffff',.6);
  kill('intruder','lie',{pool:40,bleed:4,spray:30});pose('you',null);
  await N('So loud your ears stop working. Then just ringing, and the hall, and him, and you. You don’t remember deciding. Only the sound.');
  await N('The police find you against the lockers, the gun far from your hand. Everybody is gentle with you for weeks. It helps less than they think.');
  if(typeof repAdd==='function'){repAdd('feared',3,'the lockdown');repAdd('legend',1)}hold('you',null)}
 await wait(TEST?0:500);await end();
}

/* ================= START A NEW TWO WEEKS ================= */
function newTwoWeeks(){P.cal=0;P.calStarted=0;P.weekType={};P.crew={};P.win={};P.wkRun={};P.calSeen=0;P.cur=null;P.runs=(P.runs||0)+1;P.grudge={};save();
 for(const id of['menu','quest','settings'])if($(id)){$(id).hidden=true}$('menu').className='ov';closePause&&closePause();busy=false;newDay()}
function confirmBtn(b,label,fn){let armed=false;b.onclick=()=>{if(!armed){armed=true;b.querySelector('span').textContent='Sure? Click again: '+label;SFX.blip&&SFX.blip(440);setTimeout(()=>{armed=false;b.querySelector('span').textContent=label},3000);return}SFX.click&&SFX.click();fn()}}
setInterval(()=>{try{const m=$('menu');if(m&&!m.hidden&&ROOM==='titlescreen'){const nav=m.querySelector('.ttl-menu');if(nav&&!nav.querySelector('.new2w')&&P.loops){const b=document.createElement('button');b.className='ttl-b new2w';b.innerHTML='<i>▸</i><span>Start a New Two Weeks</span>';confirmBtn(b,'Start a New Two Weeks',()=>{audio();newTwoWeeks()});const set=[...nav.children].find(x=>/Quest Log/.test(x.textContent));nav.insertBefore(b,set||null)}}
 const p=document.getElementById('pause');if(p&&!p.querySelector('.new2w')){const box=p.querySelector('.pb');const b=document.createElement('button');b.className='ttl-b new2w';b.innerHTML='<i>▸</i><span>Start a New Two Weeks</span>';confirmBtn(b,'Start a New Two Weeks',newTwoWeeks);const ps=box.querySelector('.ps');box.insertBefore(b,ps||null)}}catch(e){}},500);
