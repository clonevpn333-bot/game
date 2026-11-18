'use strict';
/* =====================================================================
   HIGHSCHOOL — walking, and errands.
   1) Quests that need a trigger now actually wait for it.
   2) Walk up and down as well as left and right.
   3) Items lying around rooms that you walk to, pick up, and bring to
      somebody.
   ===================================================================== */

/* ---------- 1. later parts wait for the thing that sets them up ---------- */
{
 const need=(mis,per,who,f)=>{for(const h of HOOKS)if(h.mis===mis&&(h.period===per||(Array.isArray(h.period)&&h.period.includes(per)))&&h.who===who){const old=h.cond;h.cond=()=>f()&&(!old||old())}};
 need('beep',6,'auto',()=>D.f.beep1);           /* Beep test: Alex at break first */
 need('pitch',3,'auto',()=>D.f.pitch1);         /* Perfect Pitch: Kenneth humming at break */
 need('delete',3,'auto',()=>D.f.del1);          /* HIGHGATE OS: Nivaan at break */
 need('measure',5,'auto',()=>D.f.oak1);         /* Mr. Oakes: Tez at lunch */
 need('talent',6,'auto',()=>D.f.tal1);          /* Talent show: Paul’s sign-up sheet at lunch */
 need('headcase',7,'adam',()=>D.f.adam2);       /* Mr. Adam’s box: only after Mia at lunch */
}

/* ---------- 2. up and down ---------- */
keys.u=0;keys.d=0;
addEventListener('keydown',e=>{if(panelMode!=='roam'||DL||busy)return;const k=e.key;if(k==='ArrowUp'||k==='w'||k==='W'){keys.u=1;e.preventDefault()}if(k==='ArrowDown'||k==='s'||k==='S'){keys.d=1;e.preventDefault()}});
addEventListener('keyup',e=>{const k=e.key;if(k==='ArrowUp'||k==='w'||k==='W')keys.u=0;if(k==='ArrowDown'||k==='s'||k==='S')keys.d=0});
addEventListener('blur',()=>{keys.u=keys.d=0});
if($('pU')){holdBtn('pU','u');holdBtn('pD','d')}
const FLOOR={bus:[140,168],corridor:[136,168],canteen:[136,168],field:[132,170],gym:[134,168],library:[136,168],toilets:[138,166],trailer:[128,170],english:[134,166],maths:[134,166],science:[136,166],chem:[138,166],office:[140,166],forest:[132,170],lake:[134,160],party:[134,168],bedroom:[134,166],boiler:[136,166],carpark:[134,168],foodcourt:[136,168],arcade:[136,168],hall:[134,168],pool:[140,166]};
const floorOf=r=>FLOOR[r]||[136,168];
HOOK.update=(dt,rdt)=>{
 if(panelMode!=='roam'||busy||!A.you)return;
 const a=A.you,vx=(keys.r-keys.l),vy=(keys.d-keys.u);
 if(vx||vy){
  if(vx)a.dir=vx;a.moving=true;
  const f=floorOf(D.room);
  a.x=clamp(a.x+vx*62*rdt,10,310);a.y=clamp(a.y+vy*40*rdt,f[0],f[1]);
  a.walk+=rdt*11;D.x=Math.round(a.x);
 }else a.moving=false;
 let best=null,bd=1e9;
 for(const it of interactables()){
  const ty=it.id?(A[it.id]?A[it.id].y:a.y):(it.spot.y||a.y);
  const dx=Math.abs(it.x-a.x),dy=Math.abs(ty-a.y);
  if(dx<18&&dy<(it.spot?(it.spot.item?14:24):34)){const d=dx+dy*.6;if(d<bd){bd=d;best=it}}
 }
 if(best!==roamTarget&&(!best||!roamTarget||best.label!==roamTarget.label||best.x!==roamTarget.x)){roamTarget=best;roamHint()}else roamTarget=best;
};

/* (keep the safety net from story.js: if nothing is happening and you can't move, give control back) */
{let stuckT=0;const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const idle=!busy&&panelMode!=='roam'&&!DL&&!CH&&!MINI&&!anyOverlay()&&D&&D.room&&$('menu').hidden;stuckT=idle?stuckT+rdt:0;if(stuckT>2.5){stuckT=0;roam()}}}

/* ---------- 3. items you can see, walk to and pick up ---------- */
Object.assign(ITEMS,{inhaler:'Kenneth’s inhaler',thermos:'Hasan’s dad’s thermos',ladle:'Pat’s lucky ladle',shorts:'Omer’s shorts'});
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 if(it==='inhaler'){R(x-2,y-4,3,6,'#3a7ad8');R(x-2,y+1,6,2,'#3a7ad8');R(x-2,y-4,3,1,'#9ac0f0');return}
 if(it==='thermos'){R(x-2,y-8,5,10,'#b8bcc4');R(x-2,y-8,5,2,'#3a4a6a');R(x-1,y-5,1,6,'#e8ecf0');R(x+3,y-5,1,4,'#8a8e98');return}
 if(it==='ladle'){R(x-1,y-9,1,8,'#c8ccd4');R(x-3,y-1,5,3,'#c8ccd4');R(x-2,y,3,1,'#9a9ea8');return}
 if(it==='shorts'){R(x-4,y-4,9,3,'#1a2a6a');R(x-4,y-1,4,4,'#1a2a6a');R(x+1,y-1,4,4,'#1a2a6a');R(x-4,y-4,9,1,'#f0f0f0');return}
 return _dh(it,x,y,d)}}
const takeItem=it=>{D.items=D.items.filter(i=>i!==it);updateLoc()};
{const _do=HOOK.drawOver;HOOK.drawOver=(...args)=>{_do&&_do(...args);if(panelMode!=='roam'||busy||!D)return;
 for(const s of SPOTS)if(s.item&&s.room===D.room&&(s.period==null||s.period===D.period||(Array.isArray(s.period)&&s.period.includes(D.period)))&&(!s.cond||s.cond())){
  const ix=s.ix||s.x,iy=(s.iy||s.y)+Math.round(Math.sin(T*3)*1);
  g.globalAlpha=.3;R(ix-5,(s.iy||s.y)+2,11,2,'#000');g.globalAlpha=1;drawHeld(s.item,ix,iy,1);drawProp({t:'sparkle',x:ix+4,y:iy-8});
 }}}
function errand(o){
 mission(o.id,{name:o.name,icon:o.icon,who:o.who,blurb:o.blurb,parts:['Find out what’s missing','Bring it back'],tips:o.tips,variants:o.variants||{}});
}

/* ---- Kenneth’s inhaler ---- */
errand({id:'inhaler',name:'Puffer',icon:'💨',who:['kenneth','coach'],
 blurb:'Coach made Kenneth run laps at break for “breathing wrong”. Now he actually can’t breathe. His inhaler is somewhere in the library.',
 tips:['Break, the Gym. Kenneth is lying on the floor.','Break, the Library. Under the beanbags at the back. Walk right up to them. Then get back to the Gym before break ends.']});
hook({mis:'inhaler',period:2,room:'gym',who:'kenneth',label:'Ask Kenneth why he’s lying on the floor',look:{pose:'lie',ex:'hurt'},cond:()=>!D.f.inh1&&!D.done.inhaler,run:async()=>{
 await say('kenneth','(wheezing) Coach made me do laps. For breathing wrong. Now I’m breathing wrong for real.','hurt');
 await say('kenneth','My inhaler. Library. I left it under the beanbags in Period 1. Blue. Please. Before Coach sees me lying down and makes me do a lap for that.','hurt');
 if(A.coach)await say('coach','(not looking) Kenneth, the floor is not a muscle group.','angry');
 D.f.inh1=1;part('inhaler',1);return 'stay';
}});
spot({room:'library',period:2,x:286,y:164,item:'inhaler',label:'Pick up the blue inhaler under the beanbag',short:'INHALER',cond:()=>D.f.inh1&&!has('inhaler')&&!D.done.inhaler,run:async()=>{
 give('inhaler');await N('Under the beanbag: a blue inhaler, two pound coins, and a note in Aidan’s handwriting that just says “hi”. You take the inhaler. You leave the note.');return 'stay';
}});
hook({mis:'inhaler',period:2,room:'gym',who:'kenneth',label:'Give Kenneth his inhaler',look:{pose:'lie',ex:'hurt'},cond:()=>has('inhaler')&&!D.done.inhaler,run:async()=>{
 takeItem('inhaler');A.kenneth.pose=null;
 await N('Two puffs. Kenneth sits up like someone plugged him back in.');
 await say('kenneth','I can see colors again. You’re a hero. You’re the only person in this school who has ever brought me anything.','happy');
 if(A.coach)await say('coach','Kenneth! Since you’re up. One lap. For lying down.','angry');
 await say('kenneth','(already running) WORTH IT.','happy');
 bond('kenneth',1);await complete('inhaler');return 'stay';
}});

/* ---- Hasan’s dad’s thermos ---- */
errand({id:'thermos',name:'The Thermos',icon:'☕',who:['hasan','hasandad'],
 blurb:'Hasan’s dad dropped him off on the way home from his night shift and his thermos fell out of the cab. Ms. Sherman took it to Lost Property. It was Hasan’s grandad’s.',
 tips:['Before school, the bus loop. Hasan is staring at the road.','Break or lunch, the Main Corridor. The Lost Property box at the far left, against the back wall. Then find Hasan in the Cafeteria.']});
hook({mis:'thermos',period:0,room:'bus',who:'hasan',label:'Ask Hasan why he’s staring at the road',look:{ex:'sad'},cond:()=>!D.f.th1&&!D.done.thermos,run:async()=>{
 await say('hasan','My dad’s thermos fell out of the cab when he dropped me off. Ms. Sherman picked it up and put it in Lost Property. She said “finders keepers” and laughed for a really long time.','sad');
 await say('hasan','It was my grandad’s. It’s got a dent where he dropped it on the ferry in 1979. Dad drinks his tea out of it every night at four a.m. He’ll notice. He’ll pretend he didn’t notice.','sad');
 D.f.th1=1;part('thermos',1);return 'stay';
}});
spot({room:'corridor',period:[2,4],x:30,y:138,item:'thermos',label:'Dig the thermos out of Lost Property',short:'LOST PROPERTY',cond:()=>D.f.th1&&!has('thermos')&&!D.done.thermos,run:async()=>{
 pose('you','reach');await wait(300);pose('you',null);
 give('thermos');await N('Lost Property: forty-one single gloves, a retainer, a whole trumpet, and at the bottom, a dented silver thermos that still smells like cardamom.');return 'stay';
}});
hook({mis:'thermos',period:[2,4],room:'canteen',who:'hasan',label:'Give Hasan the thermos',look:{ex:'sad'},cond:()=>has('thermos')&&!D.done.thermos,run:async()=>{
 takeItem('thermos');hold('hasan','thermos');
 await say('hasan','(holding it with both hands) The ferry dent. That’s the ferry dent.','cry');
 await say('hasan','I’m going to put it back in the cab before he wakes up. He’ll never know it was gone. That’s the best version. Him never knowing.','happy');
 hold('hasan',null);bond('hasan',1);await complete('thermos');return 'stay';
}});

/* ---- Pat’s ladle ---- */
errand({id:'ladle',name:'The Lucky Ladle',icon:'🥄',who:['pat','coach'],
 blurb:'Lunch Lady Pat has served with the same ladle for twenty-two years. Coach “borrowed” it for drills. It’s on his equipment cart in the Gym. Coach is standing right there.',
 tips:['Break, the Cafeteria. Pat is serving with a spoon.','Break, the Gym. The ladle is on the cart by the back wall. Coach watches the front of the gym. Stay at the back (walk up) when you grab it.'],variants:{clean:'Nobody saw',caught:'Twenty push-ups'}});
hook({mis:'ladle',period:2,room:'canteen',who:'pat',label:'Ask Pat why she’s serving with a spoon',look:{ex:'angry'},cond:()=>!D.f.la1&&!D.done.ladle,run:async()=>{
 await say('pat','Twenty-two years. Same ladle. Never missed a scoop. Then HE comes in here and takes it. For “drills.” What drill needs a LADLE.','angry');
 await say('pat','It’s on his cart in the Gym. Get it back and there’s a cookie in it for you. A warm one. From the back. The good tray.','smirk');
 D.f.la1=1;part('ladle',1);return 'stay';
}});
spot({room:'gym',period:2,x:30,y:136,item:'ladle',label:'Grab the ladle off Coach’s cart',short:'LADLE',cond:()=>D.f.la1&&!has('ladle')&&!D.done.ladle,run:async()=>{
 const sneaky=A.you.y<=144;
 pose('you','reach');await wait(250);pose('you',null);
 if(sneaky||!A.coach||A.coach.dead){give('ladle');D.f.laClean=1;await N('You stay flat against the back wall and lift it off the cart like you’re defusing a bomb. Coach is yelling at a medicine ball. He doesn’t see a thing.');return 'stay'}
 face('coach','you');
 await say('coach','OI. That is TRAINING EQUIPMENT. Twenty push-ups. NOW.','angry');
 pose('you','lie');
 const ok=await mash('Twenty push-ups',{need:20,time:6,info:'You walked across the front of the gym. He saw everything. MASH!'});
 pose('you',null);
 if(ok){give('ladle');await say('coach','…Twenty. Fine. Take the spoon thing. Respect.','smirk')}
 else await say('coach','Eleven? ELEVEN? Come back when you’re a man. The ladle stays.','angry');
 return 'stay';
}});
hook({mis:'ladle',period:[2,4],room:'canteen',who:'pat',label:'Give Pat her ladle back',look:{ex:'angry'},cond:()=>has('ladle')&&!D.done.ladle,run:async()=>{
 takeItem('ladle');hold('pat','ladle');
 await say('pat','(holding it up to the light) Hello, old friend.','happy');
 await N('Pat serves the next forty kids with a speed and precision you’ve never seen. Every scoop is the same size. Every scoop lands with a little ting.');
 await say('pat','Cookie. From the back. Don’t tell anyone. Especially not him.','smirk');
 D.money+=1;updateLoc();hold('pat',null);
 await complete('ladle',D.f.laClean?'clean':'caught');return 'stay';
}});

/* ---- Omer’s shorts ---- */
errand({id:'shorts',name:'Shorts',icon:'🩳',who:['omer','arjun'],
 blurb:'Omer wears shorts every day. In the snow. Today someone stole them out of his bag and he’s had to wear JEANS. The shorts are hanging off the soccer goal on the field.',
 tips:['Break, the Field. Omer is in jeans. He is not okay.','Break or lunch, the Field. Walk up to the goal and climb it. Then give them back to Omer.']});
hook({mis:'shorts',period:2,room:'field',who:'omer',label:'Ask Omer why he’s wearing jeans',look:{ex:'angry',pose:'cross'},cond:()=>!D.f.sh1&&!D.done.shorts,run:async()=>{
 await say('omer','Somebody took my shorts. Out of my BAG. I’ve had to wear my brother’s jeans. I can’t feel my legs. I can’t feel ANYTHING.','angry');
 await say('omer','(pointing at the goal, shaking) They’re up there. On the crossbar. Like a flag. Like a FLAG of my shame.','angry');
 if(!D.dead.arjun)await say('omer','I know it was Arjun. I don’t have proof. I have a feeling. The feeling is Arjun.','angry');
 D.f.sh1=1;part('shorts',1);return 'stay';
}});
spot({room:'field',period:[2,4],x:262,y:140,ix:262,iy:88,item:'shorts',label:'Climb the goal and get Omer’s shorts',short:'GOAL',cond:()=>D.f.sh1&&!has('shorts')&&!D.done.shorts,run:async()=>{
 pose('you','up');
 const ok=await mash('Climb the goalpost',{need:16,time:5,info:'Hand over hand. MASH!'});
 pose('you',null);
 if(!ok){SFX.thud();shake(.6);A.you.hurt=1;await N('You get halfway up and fall off onto your back. Some sixth graders clap. Try again.');return 'stay'}
 give('shorts');await N('You get to the crossbar and pull them down. They’re navy. They’re warm from the sun. Somebody has written ARJUN WAS HERE on the inside in Sharpie.');return 'stay';
}});
hook({mis:'shorts',period:[2,4],room:'field',who:'omer',label:'Give Omer his shorts',look:{ex:'angry',pose:'cross'},cond:()=>has('shorts')&&!D.done.shorts,run:async()=>{
 takeItem('shorts');
 await say('omer','(reading the Sharpie) ARJUN. WAS. HERE.','angry');
 await say('omer','(very calm, putting them on over the jeans) Thank you. I’m going to go and have a conversation with Arjun now. A long one. With my hands.','angry');
 bond('omer',1);await complete('shorts');return 'stay';
}});
