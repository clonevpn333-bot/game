'use strict';
/* =====================================================================
   HIGHSCHOOL — THE RIDE HOME
   Every day ends on the 43, and the ride home is its own scene: you sit
   down, a couple of things happen, and then at home your phone lights
   up with whoever needs to talk tonight.
   Paul Jones (the other Paul) rides the 43 too. Nobody talks to him.
   On the last school day, he brings something in his backpack.
   ===================================================================== */
K.pauljones={n:'Paul Jones',col:'#5a5a62',skin:'#c8946a',hair:'#1e1612',hs:'afro',top:'#4a4a52',pants:'#2a2a33',hood:1,h:12,seed:171,v:330};K.pauljones.id='pauljones';
K.driver={n:'The Driver',col:'#3a5a3a',skin:'#c8946a',hair:'#3a3a3a',hs:'receding',top:'#3a5a3a',pants:'#2a2a33',adult:1,tache:1,tacheC:'#2a2a2a',seed:173,v:170};K.driver.id='driver';
CHAT.pauljones=['…','(not looking up from his hood) What.','Everybody calls me Other Paul. Or Off-Brand Paul. Or Paul Two. My name is Paul.'];

/* ---------- the inside of the 43 ---------- */
ROOMS.busride={name:'The 43',music:'sad',bg(){
 const night=D&&D.period>=8,sky=night?['#1a1a3a','#2a2a4a','#3a2a4a']:['#e89a5a','#e8b080','#f0c8a0'];
 R(0,0,W,22,'#c8c8c0');for(let i=10;i<W;i+=60){R(i,4,40,4,'#f4f8f0');R(i,8,40,1,'#a8a8a0')}R(0,21,W,2,'#8a8a84');
 /* the windows, and Fair City going past */
 for(let wx=4;wx<W;wx+=64){
  g.save();g.beginPath();g.rect(wx,26,58,52);g.clip();
  for(let i=0;i<3;i++)R(wx,26+i*18,58,18,sky[i]);
  const off=(T*(D&&D.f&&D.f.busStopped?0:46))%240;
  for(let b=-1;b<6;b++){const bx=wx+((b*48-off)%240+240)%240-60,h=20+((b*37+wx)%3)*10;R(bx,78-h,40,h,night?'#14142a':'#6a5a5a');for(let r=0;r<3;r++)for(let c=0;c<3;c++)if((b+r+c+wx)%3)R(bx+5+c*12,80-h+4+r*8,5,4,night?'#f0d070':'#c8b8a8')}
  for(let p=0;p<4;p++){const px_=wx+((p*80-off*1.6)%240+240)%240-60;R(px_,52,2,26,'#3a3a3a');R(px_-6,50,14,3,'#3a3a3a')}
  g.restore();
  R(wx-2,24,62,2,'#5a5a5a');R(wx-2,78,62,3,'#5a5a5a');R(wx-2,24,2,57,'#5a5a5a');R(wx+58,24,2,57,'#5a5a5a');
 }
 R(0,81,W,25,'#4a5a7a');for(let i=0;i<W;i+=8)R(i,81,1,25,'rgba(0,0,0,.08)');
 for(let i=40;i<W;i+=96){R(i,22,2,90,'#d8d8d0');R(i,22,1,90,'#fff')}
 R(0,106,W,74,'#3a3a44');for(let i=0;i<W;i+=12)R(i,140,8,1,'rgba(255,255,255,.08)');R(0,106,W,2,'#2a2a30');
 if(D&&D.f&&D.f.busTilt)fxState.shake=Math.max(fxState.shake||0,.2);
},items:[
 ...[40,96,152,208,264].map(x=>({y:131,d:()=>{R(x+6,112,6,22,'#2a5aa8');R(x+6,112,6,2,'#4a7ac8');R(x-6,128,18,6,'#2a5aa8')}})),
 ...[40,96,152,208,264].map(x=>({y:157,d:()=>{R(x+6,138,6,22,'#2a5aa8');R(x+6,138,6,2,'#4a7ac8');R(x-6,154,18,6,'#2a5aa8')}}))
]};
if(typeof LIGHT!=='undefined')LIGHT.busride=()=>({amb:D&&D.period>=8?.5:.8,tint:D&&D.period>=8?[20,20,60]:[80,50,30],src:[[60,10,90,.2,[255,250,230]],[180,10,90,.2,[255,250,230]]]});
if(typeof AMB!=='undefined')AMB.busride={bed:.06,traffic:.9,chat:.6};
const SEATS43=[[40,131],[96,131],[152,131],[208,131],[264,131],[40,157],[96,157],[152,157],[208,157],[264,157]];

/* ---------- who’s on it ---------- */
function ridersToday(){
 const want=['hasan','arjun','corey','abby','sean','stella','nivaan','omer','david','pauljones','aidan','kenneth','dheva','alex','marcus','paul'];
 return want.filter(k=>K[k]&&!D.dead[k]&&!(k==='aidan'&&D.f.aidanDead)&&!(typeof EDITION_CUT!=='undefined'&&(window.EDITION_CUT||[]).includes(k))&&!(k==='alex'&&typeof alexGone==='function'&&alexGone()));
}
function boardScene(){
 const ks=ridersToday();const cast={you:[152,-1,{y:157,pose:'sit'}]};
 const order=['pauljones',...ks.filter(k=>k!=='pauljones')];
 const free=SEATS43.filter(s=>!(s[0]===152&&s[1]===157));
 order.slice(0,free.length).forEach((k,i)=>{const s=free[(i===0?free.length-1:i-1)%free.length];cast[k]=[s[0],-1,{y:s[1],pose:'sit'}]});
 cast.driver=[8,-1,{y:131,pose:'sit'}];
 scene('busride',cast,true);ROOM='busride';
 if(A.pauljones)A.pauljones.ex='sad';
 return Object.keys(cast);
}
const onBus=id=>A[id]&&!A[id].dead;

/* ---------- THE OTHER PAUL ---------- */
mission('pauljones',{name:'The Other Paul',icon:'🎒',who:['pauljones'],goal:'Get through to Paul Jones before the last day of school.',
 blurb:'Paul Jones sits on his own at the back of the 43, every day, with his hood up. Everybody calls him Other Paul. Nobody has ever asked him anything.',
 parts:['The back seat','The notebook','The backpack','The last ride'],
 tips:['Ride the 43 home. Paul Jones is at the back.','Ride the 43 home. He’s drawing something.','Ride the 43 home. Somebody’s got his backpack.','The last school day. The 43 home.'],
 variants:{given:'He gave you the gun',grabbed:'You grabbed it',shot:'He fired'}});
DEATHS.backseat={name:'Back Seat',desc:'You grabbed for it. You weren’t fast enough.',hint:'The Other Paul. Talk to him before the last day.'};
const pjKind=()=>D.f.pjKind||0;
const RIDE=[
 {id:'pj1',w:9,cond:()=>!D.f.pj1&&onBus('pauljones'),run:async()=>{
  await N('At the back of the bus, a kid with a big afro squashed under his hood sits on his own. Paul Jones. He moved here in October. He has a seat to himself every day, and he isn’t lucky about it.');
  if(onBus('arjun'))await say('arjun','(loud enough) Ayo, Off-Brand Paul. Real Paul’s at the front. You’re the knockoff. You’re the Paul from Wish.','smirk');
  classLaugh(500);
  const c=await choose(['Go and sit next to Paul Jones.','Laugh. It was kind of funny.','Stay where you are.']);
  if(c===0){A.you.pose=null;await walk('you',A.pauljones.x+14,60);A.you.pose='sit';face('pauljones','you');
   await say('pauljones','(not looking up) …You don’t have to sit here.','sad');await say('you','I know.');
   await say('pauljones','(after a really long time) It’s Paul. Just Paul. Nobody here gets that.','sad');D.f.pjKind=pjKind()+1}
  else if(c===1){await N('You laugh. Paul Jones pulls his hood further down. He doesn’t look up again for the whole ride.');D.f.pjMean=(D.f.pjMean||0)+1}
  D.f.pj1=1;if(!D.mp.pauljones)part('pauljones',1);
 }},
 {id:'pj2',w:8,cond:()=>D.f.pj1&&!D.f.pj2&&onBus('pauljones'),run:async()=>{
  hold('pauljones','book');
  await N('Paul Jones is drawing in a notebook at the back, pressing so hard the pen goes through the page.');
  const c=await choose(['Ask what he’s drawing.','Pretend you didn’t see.']);
  if(c===0){A.you.pose=null;await walk('you',A.pauljones.x+14,60);A.you.pose='sit';
   await N('It’s the 43. From above. Every seat, with a name in it. Some of the names are crossed out. Arjun’s is crossed out so many times there’s no paper left.');
   await say('pauljones','(closing it) It’s nothing. It’s a seating plan. I like knowing where everyone is.','sad');
   await say('pauljones','You’re not crossed out. In case you were wondering.','sad');
   const d=await choose(['“Is everything okay at home?”','“Who crossed you out?”']);
   if(d===0)await say('pauljones','(laughing, not really) My dad keeps his stuff in a shoebox in the closet. He thinks I don’t know the code. It’s my birthday. That’s the only time he remembers it.','sad');
   else await say('pauljones','Everybody. Everyone in this school crossed me out on the first day. I’m just doing it back.','angry');
   D.f.pjKind=pjKind()+1}
  hold('pauljones',null);D.f.pj2=1;part('pauljones',2);
 }},
 {id:'pj3',w:8,cond:()=>D.f.pj2&&!D.f.pj3&&onBus('pauljones'),run:async()=>{
  const b=onBus('arjun')?'arjun':onBus('kenneth')?'kenneth':null;
  if(b){A[b].pose=null;hold(b,'paper');await walk(b,200,80);
   await N(K[b].n+' has Paul Jones’s backpack. He’s holding it out of the window by one strap. The whole bus is chanting “DROP IT”.')}
  else await N('Two sophomores at the front have Paul Jones’s backpack. They’re holding it out of the window by one strap. The whole bus is chanting “DROP IT”.');
  await say('pauljones','(standing up, very quiet) Give it back. Give it back. GIVE IT BACK.','angry');
  const c=await choose(['Grab the backpack back for him.','Tell the driver to stop.','Chant.']);
  if(c===0){A.you.pose=null;await walk('you',200,90);pose('you','grab');const ok=await mash('Get it!',{need:14,time:4});pose('you',null);
   if(ok){await N('You snatch it back just before they let go. It’s heavier than a backpack should be. Something inside it clunks. Metal on metal.');
    await walk('you',A.pauljones.x+14,70);await say('pauljones','(taking it, holding it to his chest) …Don’t look in it. Thanks. Don’t look in it.','scared');D.f.pjKind=pjKind()+2}
   else{SFX.thud();await N('The strap snaps. The backpack bounces down the road behind the bus. Paul Jones watches it go through the back window without blinking.');D.f.pjKind=pjKind()+1}}
  else if(c===1){await say('you','DRIVER. STOP THE BUS.');await say('driver','(not stopping) I don’t stop for backpacks. I stopped for a backpack in 2009 and I’ve regretted it every day.','angry');D.f.pjKind=pjKind()+1}
  else{await N('You chant. Everybody chants. The backpack goes. Paul Jones sits back down. He doesn’t say anything. He just takes his notebook out and writes something.');D.f.pjMean=(D.f.pjMean||0)+1}
  if(b){hold(b,null);await walk(b,A[b].x<200?96:208,60)}
  D.f.pj3=1;part('pauljones',3);
 }},
 {id:'pjLast',w:99,cond:()=>cal()===12&&!D.done.pauljones&&onBus('pauljones'),run:async()=>{
  cue('tension');
  await N('The last ride home before the weekend. Inspection Day. Everyone is loud. Paul Jones gets up from the back seat and walks down the middle of the bus.');
  A.pauljones.pose=null;await walk('pauljones',200,40);hold('pauljones','pistol');
  await N('He has his dad’s pistol in his hand. He isn’t pointing it at anybody yet. He’s holding it like it’s heavy. Like he’s surprised it’s real.');
  for(const k in A)if(k!=='you'&&k!=='pauljones'&&k!=='driver'&&A[k]&&!A[k].dead){A[k].ex='scared';A[k].pose='cover'}
  SFX.sting();D.f.busStopped=1;
  await say('driver','(braking, very slowly) Son. Son. Easy.','scared');
  const target=onBus('arjun')?'arjun':ridersToday().find(k=>onBus(k)&&k!=='pauljones');
  if(target)await say('pauljones','(to '+K[target].n+', shaking) You crossed me out. All of you. Every day. Every single day.','angry');
  const kind=pjKind();
  const opts=[{t:'“Paul. It’s me. Give it to me.”',dis:kind<2,why:'he doesn’t know you'},{t:'Grab for it.',tag:'!'},{t:'Get down. Stay down.'}];
  const c=await choose(opts,'Paul Jones has a gun on the 43.');
  if(c===0){
   A.you.pose=null;await walk('you',A.pauljones.x-14,40);face('pauljones','you');
   await say('you','Paul. Just Paul. It’s me. You can give it to me.');
   await say('pauljones','(crying now) I wasn’t gonna— I didn’t know who it was for. I didn’t know if it was for them or for me. I just didn’t want to go home.','cry');
   hold('pauljones',null);hold('you','pistol');
   await N('He holds it out flat on his hand, the way you’d give somebody a bird. You take it. Your hands are shaking worse than his.');
   await N('Then he sits down in the aisle with his head in his hands. The whole bus is completely silent. The driver opens the door, puts on the hazard lights and doesn’t say a single word.');
   pose('pauljones',null);pose('you',null);hold('you',null);
   await N('When the police come, Paul Jones tells them everything before they ask. On his way off the bus, he looks back at you and nods. Just once.');
   await complete('pauljones','given');
  }else if(c===1){
   A.you.pose=null;await walk('you',A.pauljones.x-12,120);pose('you','grab');
   const ok=await mash('Get the gun!',{need:20,time:3,info:'Push it up. UP.'});
   if(ok){SFX.bang&&SFX.bang();shake(1.4);flash('#fff',.6);await N('It goes off into the roof of the bus. A hole the size of a coin, letting in a little circle of evening light. Then it’s in your hands and he’s on the floor.');
    hold('pauljones',null);A.pauljones.pose='sit';A.pauljones.ex='cry';
    await say('pauljones','(on the floor, hands over his head) I’m sorry. I’m sorry. I’m sorry.','cry');
    pose('you',null);await complete('pauljones','grabbed');}
   else{SFX.bang&&SFX.bang();shake(1.6);flash('#a00010',.5);blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);await N('It goes off. You don’t feel it at first. Then you feel all of it.');await die('backseat')}
  }else{
   for(const k of['you'])A[k].pose='kneel';
   SFX.bang&&SFX.bang();shake(1.5);flash('#a00010',.4);
   if(target&&A[target]){blood(A[target].x,A[target].y-20,40,null,80,A[target].y+2);kill(target,'lie',{pool:30});D.dead[target]=1}
   await N('One shot. Then nothing. Paul Jones sits down in the aisle, puts the gun on the floor in front of him, and puts his hands on his head. He knows what happens next. He looks like he’s known for a while.');
   if(target)await N(K[target].n+' doesn’t get up. Nobody on the 43 says anything all the way to the hospital stop, where an ambulance is already waiting, lights on, no siren.');
   await complete('pauljones','shot');
  }
  D.f.busStopped=0;
 }},
 {id:'crash',w:3,cond:()=>!P.busCrash&&cal()>=3,run:async()=>{
  P.busCrash=1;save();cue('fight');
  await N('At the roundabout, a raccoon runs into the road. The driver swerves. He swerves too far.');
  SFX.crunch();SFX.glass();shake(2.2);flash('#fff',.6);D.f.busTilt=1;
  for(const k in A){if(k==='driver')continue;const a=A[k];if(!a||a.dead)continue;a.pose='lie';tw(a,{x:a.x+(Math.random()*40-20),y:Math.min(170,a.y+Math.random()*12)},400)}
  await wait(600);
  const v=['kid4','kid2'].find(k=>!D.dead[k]);if(v){put(v,240,-1,{y:150});blood(240,140,40,null,90,152);kill(v,'lie',{pool:30});D.dead[v]=1}
  await N('The 43 goes over on its side. Everyone ends up on the windows. Somebody’s phone is still playing music. A sophomore who was standing up in the aisle isn’t moving.');
  D.f.busTilt=0;await wait(400);
  for(const k in A)if(A[k]&&!A[k].dead&&k!=='driver')A[k].pose=null;
  if(onBus('hasan'))await say('hasan','(climbing out through a window, glasses gone) Is everyone okay? Is everybody— oh. Oh no. Okay. Okay.','scared');
  await say('driver','(hanging from his seatbelt, very calmly) That’s my third this year. Replacement bus in twenty minutes. Nobody tell my supervisor about the raccoon.','sad');
  await N('The replacement bus comes in eighteen minutes. Everybody gets on. Nobody sits where the sophomore was sitting.');
 }},
 {id:'aidanRun',w:4,cond:()=>!D.dead.aidan&&!D.f.aidanDead&&!onBus('aidan'),run:async()=>{
  await N('Out of the window: Aidan. Running alongside the bus. Not out of breath. Keeping up exactly. He waves.');
  await N('The bus goes forty miles an hour past the hospital. Aidan keeps up. At the lights he just stands there next to your window, smiling, waiting for green.');
  if(onBus('arjun'))await say('arjun','(not looking) I’m not looking at him. If I look at him he gets stronger.','scared');
 }},
 {id:'balloons',w:4,cond:()=>!D.dead.kayden,run:async()=>{
  await N('Three kids on bikes pull up next to the bus. Puffer jackets. Kayden and the Highgate Hittaz. They’ve got water balloons.');
  SFX.splat();SFX.glass();
  const v=['hasan','david','nivaan','sean'].find(onBus);
  if(v){A[v].ex='shock';await N('One comes through the open window and gets '+K[v].n+' right in the face. It isn’t water. It’s Mountain Dew. It’s warm.');await say(v,'WHY IS IT WARM.','yell')}
  await N('Kayden falls off his bike trying to do a wheelie as they ride away. The whole bus cheers.');
 }},
 {id:'puke',w:4,cond:()=>true,run:async()=>{
  const v=ridersToday().filter(onBus).filter(k=>k!=='pauljones');if(v.length<2)return;
  const a=pick(v);SFX.splat();A[a].ex='hurt';
  await N(K[a].n+' throws up on the floor of the bus. The bus goes round a corner. The puke goes round the corner too. It visits everyone.');
  for(const k of v.slice(0,4))if(A[k])A[k].ex='hurt';
  await say('driver','(not turning round) That’s a five-dollar cleaning fee, and I know where you live.','angry');
 }},
 {id:'reilly',w:3,cond:()=>onBus('arjun'),run:async()=>{
  put('reilly',-14,1,{y:150});await walk('reilly',196,30);A.reilly.pose='sit';
  await N('Mrs. Reilly gets on at the hospital stop with her shopping. She sits next to Arjun. She smiles at him the whole way, like a grandma.');
  await N('When she gets off two stops later, Arjun’s phone, wallet and one of his shoes are gone.');
  await walk('reilly',-20,30);remove('reilly');
  await say('arjun','(looking at his sock) …I respect it. I hate it. I respect it.','shock');
 }},
 {id:'driverEx',w:3,cond:()=>true,run:async()=>{
  D.f.busStopped=1;
  await N('The driver takes a detour off the route. Down a street with nice houses. He stops outside one. He winds down his window.');
  await say('driver','(yelling at a house) I STILL HAVE YOUR MOTHER’S CASSEROLE DISH, DENISE. I’M KEEPING IT.','angry');
  await N('Nobody comes out. He winds the window back up, very calmly, and drives everybody home like nothing happened.');
  D.f.busStopped=0;
 }},
 {id:'raccoon',w:2,cond:()=>!!P.done.lockdown||cal()>=4,run:async()=>{
  const r=pprop({t:'raccoon',x:300,y:100,dir:-1,layer:40});
  await N('Something moves in the luggage rack. A raccoon. It looks at you. It takes the sandwich out of a seventh grader’s hand, very politely, and gets off at the next stop.');
  await tw(r,{x:-20},1200);r.hide=1;
 }},
 /* stories, deeper */
 {id:'coreyGuilt',w:12,cond:()=>D.f.brettDead&&cal()>D.f.brettDead&&!D.f.rideCG&&onBus('corey'),run:async()=>{
  if(!onBus('corey'))return;D.f.rideCG=1;A.you.pose=null;await walk('you',A.corey.x+14,60);A.you.pose='sit';
  await N('Corey has his forehead against the window. He’s not looking at anything. His hands are in his lap, palms up, like he’s waiting for someone to put something in them.');
  await say('corey','I keep waiting to feel like a murderer. Like, there’s supposed to be a feeling. I keep checking for it.','sad');
  await say('corey','I just feel like a guy on a bus. Is that worse? I think that’s worse.','sad');
  const c=await choose(['“You did it for her.”','“We did it. Not you. We.”','Say nothing. Sit with him.']);
  if(c===0)await say('corey','I did it for me. I did it so I didn’t have to watch. That’s different. I know it’s different.','cry');
  else if(c===1)await say('corey','(quietly) …We. Okay. We.','cry');
  else await N('You sit with him. At the stop by the woods he closes his eyes until the bus moves again.');
 }},
 {id:'twoBirds',w:12,cond:()=>D.done.window&&!D.f.rideTB&&onBus('corey')&&onBus('abby'),run:async()=>{
  D.f.rideTB=1;
  await N('Corey and Abby, on the back seat. Their seat. She’s got her head on his shoulder and she’s humming a song into his jacket. He’s got his eyes closed.');
  await say('abby','(to you, without lifting her head) It’s called “Window Seat”. It’s not finished. It’s never gonna be finished. That’s the point.','love');
  await say('corey','(eyes still shut) She wrote a verse about my hair. It’s mean. It’s really good.','happy');
 }},
 {id:'portland',w:10,cond:()=>D.f.fw&&!D.f.ridePT&&onBus('sean')&&onBus('stella'),run:async()=>{
  D.f.ridePT=1;
  await N('Sean and Stella are sharing one seat with a map of the United States open on their knees. Sean is measuring it with his hand.');
  await say('sean','It’s three hours behind. So when it’s nine here, it’s six there. So I call at nine and she’s still eating dinner. So she calls me at nine HER time, and it’s midnight.','scared');
  await say('stella','So we both stay up.','happy');
  await say('sean','So we both stay up.','blush');
  await say('stella','(quieter, to you) He made a spreadsheet. Of the next four years. Every holiday. Every flight. He color-coded it.','cry');
 }},
 {id:'retainer',w:10,cond:()=>P.crew&&P.crew.ev&&P.crew.ev.retainer&&!P.crew.rideRet&&onBus('hasan'),run:async()=>{
  crew().rideRet=1;save();
  await N('Hasan has the sandwich bag with Tyler’s retainer in it on his knee. He’s supposed to have given it to Kenneth for the File. He hasn’t.');
  await say('hasan','Tyler sat right there. Every morning. He did the Wordle out loud. He was so bad at it. He always got it on six and acted like it was a win.','sad');
  await say('hasan','I’m gonna give it to Kenneth tomorrow. I just wanted it to ride the bus one more time.','cry');
 }},
 {id:'whiteHair',w:9,cond:()=>P.crew&&P.crew.ev&&P.crew.ev.boiler&&!P.crew.rideOm&&onBus('omer'),run:async()=>{
  crew().rideOm=1;save();if(A.omer)A.omer.hairC='#f4f4f0';
  await say('omer','(white hair, staring out of the window) Louise. Danny. Raj. Ollie. I keep saying them. In my head. On a loop. Like a song you hate.','scared');
  await say('omer','My mom thinks I’m on drugs. I wish I was on drugs. Drugs end.','sad');
 }},
 {id:'adamCar',w:8,cond:()=>P.crew&&P.crew.ev&&P.crew.ev.confession&&!P.crew.rideAd,run:async()=>{
  crew().rideAd=1;save();
  await N('Mr. Adam’s car is parked at the side of the road near the arcade. He’s just sitting in it with the engine off. As the bus goes past, he looks up at your window and nods. He looks lighter. Thirty-nine years lighter.');
 }}
];
async function busRide(fromMall){
 boardScene();cue('sad');fxState.dark=0;
 await N(fromMall?'The last 43 from the mall. The streetlights are on. You sit where you always sit.':'The 43. You get on. You sit where you always sit. Fair City goes past the window.');
 const avail=RIDE.filter(e=>{try{return e.cond()}catch(x){return false}});
 const picks=[];
 const must=avail.find(e=>e.id==='pjLast');if(must)picks.push(must);
 const pool=avail.filter(e=>e!==must);
 while(picks.length<2&&pool.length){let tot=pool.reduce((s,e)=>s+e.w,0),r=Math.random()*tot,i=0;for(;i<pool.length;i++){r-=pool[i].w;if(r<=0)break}picks.push(pool.splice(Math.min(i,pool.length-1),1)[0])}
 for(const e of picks){try{await e.run()}catch(err){if(err===DEATH||err===ENDDAY)throw err;console.error(err);if(TEST&&TEST.err)TEST.err(err)}await wait(300)}
 for(const k in A)if(A[k]&&!A[k].dead){A[k].ex=A[k].ex==='scared'?null:A[k].ex}
}

/* ---------- at home, your phone ---------- */
const NIGHT=[
 {cond:()=>P.crew&&P.crew.beat1&&!(P.crew.ev||{}).retainer,from:'David',msgs:[['them','u up','22:41'],['them','i keep thinking about tylers seat','22:41'],['them','like someone is gonna sit in it eventually. a new kid. and they wont know','22:42'],['me','we’ll find something','22:50'],['them','yeah. yeah ok. night','22:51']]},
 {cond:()=>P.crew&&(P.crew.ev||{}).jars&&!P.crew.n2,set:()=>crew().n2=1,from:'Kenneth',msgs:[['them','i backed the fridge photos up 4 times','23:10'],['them','i keep zooming in on the one that says tyler','23:10'],['them','his handwriting is on the label. not voss’s. TYLERS','23:11'],['them','he labeled his own jar bro','23:11'],['me','go to sleep ken','23:20'],['them','cant','23:20']]},
 {cond:()=>D.f.brettDead&&!D.f.n3,set:()=>D.f.n3=1,from:'Corey',msgs:[['them','i washed my shoes in the bath','00:12'],['them','my mom asked why the bath was brown','00:12'],['them','i said football','00:13'],['them','i dont play football','00:13'],['me','delete these','00:20'],['them','ok','00:20']]},
 {cond:()=>D.done.window&&!D.f.n4,set:()=>D.f.n4=1,from:'Abby',msgs:[['them','is it weird that i drew the bird on my bedroom window too','23:02'],['them','and then a second one','23:02'],['them','dont tell him','23:03'],['them','actually tell him','23:03']]},
 {cond:()=>D.f.fw&&!D.done.farewell,from:'Stella',msgs:[['them','we packed my room today','22:30'],['them','it fits in 6 boxes','22:30'],['them','my whole life is 6 boxes','22:31'],['them','sean called and didnt say anything for like 4 min. just breathed. it was nice actually','22:40']]},
 {cond:()=>D.done.kim&&!D.f.n6,set:()=>D.f.n6=1,from:'Dheva',msgs:[['them','alex is sleeping over','23:50'],['them','he still cant sleep with the light off','23:50'],['them','he keeps counting in his sleep. in 7s','23:51'],['them','im gonna stay up','23:51']]},
 {cond:()=>D.f.pj1&&!D.done.pauljones&&pjKind()>=1,from:'Paul Jones',msgs:[['them','hey its paul. jones. got ur number off the class list','23:30'],['them','sorry thats weird','23:30'],['them','thanks for sitting there','23:31']]},
 {cond:()=>D.done.stepeleven&&!D.f.n8,set:()=>D.f.n8=1,from:'Hasan',msgs:[['them','darren texted me step 12','22:15'],['them','it just says “keep going”','22:15'],['them','im not crying ur crying','22:16']]},
 {cond:()=>!!D.f.robbedToday,from:'Kayden',msgs:[['them','u didnt see nothing at the mall','21:40'],['them','u feel me','21:40'],['them','also do u want a phone case. i have 40 phone cases','21:41']]}
];
async function nightPhone(){
 const n=NIGHT.filter(x=>{try{return x.cond()}catch(e){return false}});if(!n.length)return;
 const x=pick(n);if(x.set)x.set();
 scene('bedroom',{you:[180,1,{y:150,pose:'phone'}]},true);fxState.dark=.35;
 await dms(x.from,'online',x.msgs,{live:x.msgs.length});
 fxState.dark=0;
}

/* ---------- the ride replaces the old ending of the day ---------- */
{const _bb=boardBus;boardBus=async function(fromMall){
 if(TEST&&!TEST.auto)return _bb(fromMall);
 setPanel('talk');busy=true;closeOverlays();
 if(D&&(ROOM==='bus'||ROOM==='carpark'||ROOM==='foodcourt')&&!TEST){
  const ids=Object.keys(A).filter(id=>id!=='you'&&!A[id].dead&&!(K[id]&&K[id].adult));
  ids.forEach((id,i)=>timers.push({t:i*.15,r:()=>{if(A[id])walk(id,A[id].x<160?-20:340,80)}}));
  if(ids.length)await wait(1400);
  if(A.you)await walk('you',A.you.x<160?-20:340,90);
 }
 try{await busRide(fromMall)}catch(e){if(e===DEATH){busy=false;return newDay(true)}throw e}
 {const dn=Object.keys(D.done).filter(m=>MIS[m]);if(dn.length)await N('Today you: '+dn.map(m=>MIS[m].name).join(', ')+'.')}
 await N('You get off at your stop. The 43 pulls away with its windows lit up.');
 try{await nightPhone()}catch(e){console.error(e)}
 fxState.dark=0;await tw(fxState,{dark:1},900);
 {const nc=window.nextDayCard?nextDayCard():['TOMORROW',''];await card(nc[0],nc[1],1600)}
 fxState.dark=0;busy=false;
 return newDay();
}}

/* more of everybody’s story, on the way home */
RIDE.push(
 {id:'alexClown',w:10,cond:()=>typeof alexClown==='function'&&alexClown()&&!D.f.rideAC&&onBus('dheva'),run:async()=>{
  if(!onBus('dheva'))return;D.f.rideAC=1;if(!onBus('alex')){put('alex',A.dheva.x+14,-1,{y:A.dheva.y,pose:'sit'})}
  await N('Alex is sitting next to Dheva. There’s still a little white paint in his ears. Dheva keeps checking. Every time the bus goes over a bump, Alex flinches and says a number.');
  await say('dheva','(not looking away from him) I’m walking him to his door. Every day. His mom thinks it’s sweet. It’s not sweet. It’s a job.','sad');
  await say('alex','(very quietly, smiling at the window) …honk.','happy');
  await say('dheva','Don’t. Don’t do the honk, bro. Please.','cry');
 }},
 {id:'kenJess',w:9,cond:()=>(D.done.catfish||D.done.leaked)&&!D.f.rideKJ&&onBus('kenneth'),run:async()=>{
  D.f.rideKJ=1;
  await N('Kenneth is scrolling through his phone, deleting things. Messages. Photos. Three months of goodnights.');
  await say('kenneth','I’m fine. I’m great. I’m five foot seven and I talked to a fake girl for three months. I’m thriving.','sad');
  await say('kenneth','The worst part is she was really nice. Whoever she was. She remembered my mom’s surgery. That was a real thing she did.','cry');
 }},
 {id:'arjunPhone',w:8,cond:()=>D.done.phone&&!D.f.rideAP&&onBus('arjun'),run:async()=>{
  D.f.rideAP=1;
  await N('Arjun has his phone back. He’s not on it. He’s just holding it in both hands, looking at the cracked screen.');
  await say('arjun','There’s a voicemail on here from my grandad. From before. It’s the only one. I thought she was gonna delete it.','sad');
  await say('arjun','If you tell anyone I said that I’ll say you made it up. Nobody would believe you. I’m awful.','smirk');
 }},
 {id:'tobyBus',w:7,cond:()=>D.done.toby&&!D.f.rideTo&&onBus('sean'),run:async()=>{
  if(!onBus('sean'))return;D.f.rideTo=1;put('toby',A.sean.x+14,-1,{y:A.sean.y,pose:'sit'});
  await N('Toby from Ohio has started riding the 43. He sits behind Sean and Stella and gives them both friendship bracelets every Thursday. Nobody asked him to. Everybody wears them.');
  await say('toby','(leaning over the seat) Sean. Your hair. Today. Ten out of ten. Stella. Your hair. Eleven.','happy');
 }},
 {id:'davidList',w:8,cond:()=>P.crew&&P.crew.beat2&&!P.crew.rideDL&&onBus('david'),run:async()=>{
  crew().rideDL=1;save();hold('david','clipboard');
  await N('David has his clipboard on his knees. A list. Names of kids who stopped coming to Highgate. It goes back twelve years. It’s three pages long.');
  await say('david','Every year, four or five. Every year somebody says “they moved”. Nobody moves that much. This town isn’t big enough to move that much.','scared');
  await say('david','(quietly) Tyler’s the first one I actually knew. That’s the only reason I noticed. That’s so messed up.','sad');hold('david',null);
 }},
 {id:'stellaDad',w:8,cond:()=>D.done.striketwo&&!D.f.rideSD&&onBus('stella'),run:async()=>{
  if(!onBus('stella'))return;D.f.rideSD=1;hold('stella','ball');
  await N('Stella is turning her lucky ball over and over in her hands. Strike one.');
  await say('stella','My dad texted. First time in two years. He saw a photo of me and Sean. He said “who’s the boy”.','sad');
  await say('stella','I didn’t answer. I’m gonna let him wonder. He can wonder for two years.','angry');hold('stella',null);
 }}
);
NIGHT.push(
 {cond:()=>D.done.pauljones==='given'&&!D.f.n9,set:()=>D.f.n9=1,from:'Paul Jones',msgs:[['them','they let me call one person','21:12'],['them','i called u. sorry','21:12'],['them','my aunt is coming to get me. shes in ohio. i think thats good','21:13'],['them','thanks for not crossing me out','21:14']]},
 {cond:()=>P.crew&&P.crew.ev&&P.crew.ev.boiler&&!P.crew.n10,set:()=>crew().n10=1,from:'Omer',msgs:[['them','cant sleep','02:14'],['them','i keep hearing knocking','02:14'],['them','its not the pipes','02:15'],['them','grieve said its not the pipes','02:15']]},
 {cond:()=>D.f.lockedRoom&&!D.f.n11,set:()=>D.f.n11=1,from:'Hasan',msgs:[['them','are we gonna talk about it','22:01'],['them','the cupboard','22:01'],['them','ok we’re not gonna talk about it','22:09'],['them','goodnight','22:09']]},
 {cond:()=>D.done.bigscore==='fake'&&!D.f.n12,set:()=>D.f.n12=1,from:'Kayden',msgs:[['them','it was FAKE???','20:50'],['them','2 YEARS of planning','20:50'],['them','glen tased me for a 5 dollar necklace','20:51'],['them','keep it. its urs. its cursed','20:51']]}
);
