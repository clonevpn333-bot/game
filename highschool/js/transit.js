'use strict';
/* =====================================================================
   HIGHSCHOOL — GETTING TO CLASS
   • After the bell you walk the hallway between classes (the passing
     period). Things happen. You have a couple of apples to spend.
   • Walk off the screen → the classroom door → you open it → you’re in.
   • Face away from the camera when you walk up.
   • PE, swimming and science have their own clothes. You change in the
     locker room for PE and swimming. Your classmates wear them too.
   ===================================================================== */

/* ---------- facing away ---------- */
{const dh=drawHead;drawHead=function(k,x,hy,d,o){dh(k,x,hy,d,o);if(o&&o.back&&!o.crushed){const G=kidGeom(k,o);const hx=x-(G.hw>>1);R(hx,hy,G.hw,G.hd-1,k.hair||'#2a1a12');R(hx+1,hy+G.hd-2,G.hw-2,1,'rgba(0,0,0,.25)')}}}
{const _cs=cutscene;cutscene=function(fn){if(A.you)A.you.back=0;return _cs(fn)}}

/* ---------- class clothes ---------- */
const OUTFIT={
 gym:{top:'#f0f0f0',pants:'#1a2a6a',shorts:1,tee:1,coat:0,hood:0,puffer:0,cardigan:0,zip:0,num:0},
 pool:{top:'#1a5a9a',pants:'#123060',shorts:1,tee:1,coat:0,hood:0,puffer:0,cardigan:0,zip:0,hair:'#2a5ab0',hs:'helmet'},
 science:{coat:1,top:'#f4f4f0',goggles:1,puffer:0},
 chem:{coat:1,top:'#f4f4f0',goggles:1,puffer:0}
};
{const _put=put;put=function(id,x,dir,o){const a=_put(id,x,dir,o);if(D&&D.outfit&&OUTFIT[D.outfit]&&K[id]&&!K[id].adult)a.k=Object.assign({},K[id],OUTFIT[D.outfit]);return a}}
{const _sp=startPeriod;startPeriod=async function(i,resume){if(D&&!resume)D.outfit=null;return _sp(i,resume)}}

/* ---------- rooms: a classroom door, and the locker room ---------- */
ROOMS.door={name:'Classroom Door',music:'class',bg(){
 const to=(D&&D.doorTo&&ROOMS[D.doorTo])?ROOMS[D.doorTo].name.split(' —')[0]:'Class';
 R(0,0,W,112,'#d8d0c0');for(let i=0;i<W;i+=24)R(i,0,1,112,'rgba(0,0,0,.05)');R(0,104,W,8,'#7a6a5a');R(0,0,W,6,'#b8b0a0');
 for(const x of[10,46,250,286]){R(x,24,28,80,'#3a5a8a');R(x+2,26,24,76,'#4a6a9a');for(let j=0;j<4;j++)R(x+4,30+j*4,20,1,'#2a4a7a');R(x+20,62,2,6,'#c8c8c8')}
 const open=(D&&D.doorOpen)||0;
 R(118,14,84,92,'#5a4030');R(122,18,76,88,'#2a2018');
 if(open<1){const w=Math.round(76*(1-open));R(122,18,w,88,'#8a5a3a');R(124,20,w-4,84,'#9a6a46');if(w>30){R(128,26,Math.min(30,w-10),34,'#c8dce8');R(128,26,Math.min(30,w-10),2,'#fff');R(122+w-10,62,4,8,'#d8c070')}}
 else{g.globalAlpha=.25;R(122,18,76,88,'#fff2c8');g.globalAlpha=1}
 R(132,4,56,10,'#f4f0e6');R(132,4,56,1,'#c8c4b8');pxc(to.toUpperCase().slice(0,14),160,6,'#2a2a3a');
 R(0,112,W,68,'#b8a8a0');for(let i=0;i<W;i+=16)for(let j=112;j<180;j+=16)R(i+((j/16)%2)*8,j,8,8,'rgba(0,0,0,.05)');
}};
ROOMS.lockers={name:'Locker Room',music:'gym',bg(){
 R(0,0,W,112,'#9aa8a0');R(0,0,W,6,'#7a8880');
 for(let i=0;i<12;i++){const x=6+i*26;R(x,18,24,88,'#5a7a6a');R(x+1,19,22,86,'#6a8a7a');for(let j=0;j<5;j++)R(x+4,24+j*3,16,1,'#4a6a5a');R(x+18,58,2,6,'#c8c8c8');px(String(100+i),x+4,92,'#e8f0e8')}
 g.globalAlpha=.18;for(let i=0;i<8;i++){const q=(T*.2+i/8)%1;R(hsh(i)*W,100-q*90,18,10,'#fff')}g.globalAlpha=1;
 R(0,112,W,68,'#c8c8c0');for(let i=0;i<W;i+=12)for(let j=112;j<180;j+=12)R(i,j,11,11,(i/12+j/12)%2?'#d0d0c8':'#c0c0b8');
 R(30,140,260,6,'#8a6a4a');R(30,140,260,1,'#a8885a');R(34,146,3,12,'#5a5a5a');R(284,146,3,12,'#5a5a5a');
}};
if(typeof LIGHT!=='undefined'){LIGHT.door={amb:.72,tint:[50,40,40],src:[[160,60,90,.3,[255,240,210]]],wallAO:1};LIGHT.lockers={amb:.66,tint:[30,50,40],src:[[160,4,120,.3,[230,255,240]]],wallAO:1}}

/* ---------- walk off → door → in ---------- */
const DOOR_ROOMS=['english','maths','science','trailer','chem','history','art','music','ict','woodwork','psych','hall','gym','pool','library','foodtech','drama','office','canteen'];
async function doorInto(room,late){
 busy=true;setPanel('talk');
 if(A.you&&ROOM!=='door'){A.you.back=0;await walk('you',336,95)}
 const changing=room==='gym'||room==='pool';
 if(changing&&PERIODS[D.period]&&PERIODS[D.period].lesson){
  scene('lockers',{you:[-14,1,{y:156}]},true);D.room='lockers';updateLoc();
  for(const [n,x] of[['paul',220],['kenneth',260],['omer',90]])if(!D.dead[n]&&Math.random()<.7)put(n,x,x>160?-1:1,{y:146});
  await walk('you',140,90);
  await N(pick(room==='pool'?['The locker room smells like chlorine and broken dreams. You get changed into your swim stuff as fast as humanly possible.','Somebody has stolen the left half of every pair of goggles. You change anyway.']:['You change into your PE kit. Paul is doing pull-ups on the shower rail. The rail is losing.','The locker room smells like a body spray called “Apex Predator.” You get changed, fast.','Kenneth is changing inside his hoodie like a tent. Nobody comments. Everybody notices.']));
  flash('#fff',.25);D.outfit=room;if(A.you)A.you.k=Object.assign({},K.you,OUTFIT[room]);
  await walk('you',336,95);
 }else if(room==='science'||room==='chem'){D.outfit=room}
 D.doorTo=room;D.doorOpen=0;
 scene('door',{you:[-14,1,{y:156}]},true);D.room='door';updateLoc();
 if(D.outfit&&A.you)A.you.k=Object.assign({},K.you,OUTFIT[D.outfit]||{});
 await walk('you',150,90);A.you.back=1;
 await tw(A.you,{y:136},400);pose('you','reach');SFX.door();await tw(D,{doorOpen:1},420);pose('you',null);
 if(late)await N(pick(['You’re late. You open the door anyway. Every head in the room turns at the same time, like owls.','Late. The door creaks the whole way open, very slowly, like it’s doing it on purpose.']));
 await tw(A.you,{y:120,alpha:0},380);
 A.you.back=0;busy=false;
}
{const _er=enterRoom;enterRoom=async function(room){
 if(!TEST&&D&&!D.weekend&&DOOR_ROOMS.includes(room)&&ROOM!==room&&!D.noDoor&&A.you){await doorInto(room,D.lateTo===room);D.lateTo=null}
 D.noDoor=0;D.x=24;
 return _er(room);
}}

/* ---------- the hallway between classes ---------- */
const PASS=[
 {id:'books',who:'kid1',label:'Help the seventh grader pick up their books',run:async()=>{
  await N('A seventh grader has dropped an entire stack of textbooks in the middle of the hallway and is just standing over them, vibrating.');
  await say('kid1','(not looking at you) Don’t. Don’t help. If you help, it’s real.','scared');
  pose('you','kneel');await wait(400);pose('you',null);
  await N('You pick them up anyway. On top of the stack is a note in pencil: “if ms shermian asks, i was in the bathroom the whole time.”');
  await say('kid1','(snatching the books back) Thanks. Don’t read stuff. Don’t ever read stuff.','scared');
 }},
 {id:'aidan',who:'aidan',label:'Ask Aidan what he’s doing at locker 217',cond:()=>!D.f.aidanDead&&!D.dead.aidan,run:async()=>{
  await say('aidan','(forehead against locker 217) Listening. It hums. Every locker hums a little. Mine hums the loudest.','smirk');
  await say('aidan','You can listen too. Put your ear on it. No one ever does.','happy');
  const c=await choose(['Put your ear on the locker.','“Aidan, you’re going to be late.”']);
  if(c===0)await N('It’s cold. Colder than metal should be. And it does hum. It hums like someone a long way down is trying to sing.');
  else await say('aidan','I’m never late. I’m just early for the next one.','smirk');
 }},
 {id:'monitor',who:'sherman',label:'Ms. Sherman wants to see your hall pass',cond:()=>!D.dead.sherman,run:async()=>{
  await say('sherman','Hall pass, dear.','evil');
  const c=await choose(['Show her the back of a gum wrapper.','“I’m on my way to class, Miss.”','Run.']);
  if(c===0){await say('sherman','(holding the gum wrapper up to the light for a long time) …This is a valid hall pass. Carry on.','smirk')}
  else if(c===1){await say('sherman','Of course you are. Everybody is on their way somewhere. Some of you just never arrive.','evil')}
  else{SFX.whoosh();await N('You run. She doesn’t chase you. She just writes something down. You hear the pen from all the way down the hall.')}
 }},
 {id:'rating',who:'arjun',label:'Ask Arjun what he’s writing down',cond:()=>!D.dead.arjun,run:async()=>{
  await say('arjun','(clipboard, rating everyone who walks past) Six. Four. Three, but I respect the confidence. Two. Aidan. Aidan’s not on the scale. Aidan’s the scale.','smirk');
  await say('arjun','(looking you up and down) …Seven. Don’t let it go to your head. It’s a weak seven.','smirk');
 }},
 {id:'crying',who:'kid3',label:'Ask the kid in the stairwell if they’re okay',run:async()=>{
  await say('kid3','(on the stairs, face in their sleeves) I’m fine. I’m— my mom says we’re moving. Again. Third school in two years.','cry');
  const c=await choose(['Sit with them for a minute.','“Hey. This school sucks anyway.”']);
  if(c===0){pose('you','sit');await N('You sit with them on the cold stairs until the second bell. Neither of you says anything. When you stand up, they say “thanks,” so quietly you nearly miss it.');pose('you',null)}
  else await say('kid3','(laughing, a little) Yeah. Yeah, it really does. Last school didn’t have teachers who kill people, though. So.','sad');
 }},
 {id:'couple',who:'sean',label:'Ask Sean and Stella why they’re blocking the hallway',cond:()=>!D.dead.sean&&!D.dead.stella,run:async()=>{
  if(!A.stella)put('stella',A.sean.x+10,-1,{y:A.sean.y});
  await N('Sean and Stella are saying goodbye outside a classroom like one of them is going to war. They have different classes. The classrooms are next to each other.');
  await say('stella','See you in fifty minutes.','blush');await say('sean','(holding both her hands) Fifty minutes. I’ll survive. I don’t know how. I’ll survive.','blush');
  await say('you','You’re literally going to be on the other side of a wall.');
  await say('sean','A WALL. Do you hear yourself.','sad');
 }},
 {id:'raccoon',who:'kid2',label:'Ask the kid why they’re staring at the ceiling',run:async()=>{
  await say('kid2','(pointing up) There’s something in the ceiling. It’s been following me since second period.','scared');
  SFX.thud();shake(.3);await N('A ceiling tile shifts. A small gray hand reaches down, takes the granola bar out of the kid’s hand, and goes back up. The tile slides shut.');
  await say('kid2','…That’s the third one today.','shock');
 }}
];
for(const p of PASS)hook({mis:'passing',period:[1,3,5,6],room:'corridor',who:p.who,label:p.label,cond:()=>!!(D&&D.passing&&D.passing.ev.includes(p.id))&&(!p.cond||p.cond()),run:async()=>{
 if(!A[p.who])put(p.who,160,-1,{y:146});
 await p.run();D.passing&&(D.passing.ev=D.passing.ev.filter(x=>x!==p.id));
 P.passN=(P.passN||0)+1;save();if(P.passN>=1)part('passing',1,true);if(P.passN>=6&&!P.done.passing)complete('passing');
 return 'stay'}});
mission('passing',{name:'Between Classes',icon:'🚶',who:['aidan','arjun','sherman'],blurb:'After the bell, you walk the hallway to class. Things happen in the hallway. Stop for six of them.',parts:['Stop for something in the hallway','Stop for six'],tips:['Choose “Walk to class” at the bell. People in the hallway with a ! want something.','Keep stopping between classes. You have a couple of apples before you’re late.']});
spot({room:'corridor',period:[1,3,5,6],x:306,y:150,label:'Go to class →',short:'CLASS',free:1,cond:()=>!!(D&&D.passing),run:async()=>{if(!D.passing)return 'stay';const to=D.passing.to;D.passing=null;busy=false;setTimeout(()=>enterRoom(to),0);return 'ended'}});
async function passingTo(room){
 D.passing={to:room,ev:PASS.filter(p=>!p.cond||p.cond()).sort(()=>Math.random()-.5).slice(0,2).map(p=>p.id)};
 D.room='corridor';D.x=20;scene('corridor',{you:[20,1,{y:156}]},true);
 const spots=[90,170,240];
 D.passing.ev.forEach((id,i)=>{const p=PASS.find(q=>q.id===id);if(!A[p.who])put(p.who,spots[i],i?-1:1,{y:144+(i%2)*4,pose:id==='aidan'?'lean':id==='rating'?'write':id==='crying'?'sit':null})});
 for(let i=0;i<4;i++){const id=['kid1','kid2','kid3','kid4'][i];if(A[id])continue;const a=put(id,i%2?-16:336,i%2?1:-1,{y:140+i*4});walk(id,i%2?336:-16,50+i*10)}
 updateLoc();
 toast('Between classes. You’ve got '+(D.apples||2)+' 🍎 before you’re late. The '+ROOMS[room].name.split(' —')[0]+' door is on the right.');
 roam();
}
/* the bell: “Go to class” walks the hallway first */
{const _bell=bell;bell=async function(){
 if(TEST)return _bell();
 const r=myClass();
 if(D.period===3&&typeof lockdownDue==='function'&&lockdownDue())return _bell();
 if(!TEST&&ROOM!=='corridor'){D.room='corridor';buildRoom('corridor');updateLoc()}
 const t=TEACH[D.period]&&TEACH[D.period][r],rn=ROOMS[r].name.split(' —')[0],tname=t&&K[t]?K[t].n:'';
 const opts=[{t:'Walk to '+rn+(tname?' ('+tname+')':'')+'.'}];
 const canRet=D.period===3&&(D.dayType||'odd')==='odd';
 if(canRet)opts.push({t:'Take a return. Go to any empty classroom.',tag:'🎟️'});
 opts.push({t:'Skip class. Sneak around the school.',tag:'skip'},{t:'Skip class. Run out the back gate, into the woods.',tag:'run'});
 const c=await choose(opts,'The bell. '+PERIODS[D.period].name+'. You’ve got '+rn+'.');
 const pk=opts[c];
 if(c===0)return passingTo(r);
 if(pk.tag==='🎟️'){toast('Return pass. Ms. Sherman signs it without looking up.');return openReturns()}
 D.f.skipped=(D.f.skipped||0)+1;
 if(pk.tag==='skip'){toast('Skipping '+rn+'. Don’t get caught.');openMap.skip=1;return openMap(true)}
 return runToWoods();
}}
/* out of apples in the hallway = late, not skipped */
{const _sa=spendApple;spendApple=async function(per,day){
 if(D&&D.passing&&D.period===per&&cal()===day){D.apples=Math.max(0,(D.apples||0)-1);updateLoc();if(D.apples<=0){const to=D.passing.to;D.passing=null;D.lateTo=to;toast('🍎 Out of apples. You’re late.');await wait(600);return enterRoom(to)}return}
 return _sa(per,day);
}}

/* walking off the right edge of the hallway = going to class */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(D&&D.passing&&!busy&&panelMode==='roam'&&A.you&&A.you.x>=309){const to=D.passing.to;D.passing=null;enterRoom(to)}}}
{const _rh=roamHint;roamHint=function(){_rh();if(D&&D.passing){const h=$('hint');if(h)h.innerHTML=h.innerHTML.replace(/ · <i[^>]*>bunking<\/i>/,'')+' · <b style="color:#ffd27a">walk right → '+ROOMS[D.passing.to].name.split(' —')[0]+'</b>'}}}
