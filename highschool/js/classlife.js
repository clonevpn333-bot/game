'use strict';
/* =====================================================================
   HIGHSCHOOL — CLASS LIFE and VAPERS
   1) Every ordinary lesson now has a "while nobody’s watching" moment
      with things you can actually do, and random class events.
   2) Kids vaping in the bathrooms, behind the field, in the corridor,
      at the bus loop and up in the carpark. They offer. You decide.
   ===================================================================== */
const kidsIn=c=>(c&&c.kids||[]).filter(k=>A[k]&&!A[k].dead&&k!=='you'&&!(K[k]&&K[k].adult));
const teacherOf=c=>c&&c.t&&A[c.t]&&!A[c.t].dead?c.t:null;

/* ---------------- things to do in class ---------------- */
const CLASS_ACTS=[
 {t:'Throw a paper ball at somebody.',tag:'🗞️',run:async c=>{
  const ks=kidsIn(c).filter(k=>!c.nb.includes(k));const tg=ks.length?pick(ks):null;if(!tg)return;
  await N('You ball up a page of your notebook and line it up on '+K[tg].n+'.');
  const r=await meter('Throw',{speed:1.15});
  const pb=pprop({t:'plane',x:A.you.x,y:A.you.y-22,layer:30});
  if(r){await tw(pb,{x:A[tg].x,y:A[tg].y-24},380);pb.hide=1;SFX.thud();A[tg].ex='shock';
   const L={arjun:'(not turning round) I know it was you. I’ve always known it was you. I’m going to know it was you for the rest of my life.',aidan:'(picking it up, unfolding it, smoothing it flat, putting it in his pocket) Thank you. I’ll keep it.',hasan:'(throwing it straight back, without looking, perfectly) Nothing but net. Like my dad taught me.',omer:'(standing up) WHO. WHO DID THAT.',kenneth:'(flinching so hard he falls off his chair) I thought it was a bird. I thought a bird got in.',nivaan:'(whispering) Do it again, I wasn’t recording.',corey:'(touching his curls, horrified) Did it touch the hair. Did it TOUCH the HAIR.'};
   await say(tg,L[tg]||pick(['(rubbing their head) Why.','Okay, that was actually a good throw.','I’m telling. I’m not telling. I’m telling.']),'shock');return}
  const t=teacherOf(c);if(t){await tw(pb,{x:A[t].x,y:A[t].y-26},380);pb.hide=1;SFX.thud();await evil(t);
   await say(t,'Who. Threw. That.','evil');
   const w=await choose(['“It was me.”','Point at the kid next to you.']);
   if(w===0){await say('you','It was me.');await say(t,'(very close to your face) Honesty is lovely, {PET}. Next time {ME} throws something back. And {ME} doesn’t throw paper.','evil')}
   else{const nb=c.nb[0];if(nb){pose('you','point');await say(nb,'(betrayed) WHAT? I was literally writing the date.','shock');await say(t,nb===c.t?'':'Detention, '+K[nb].n+'. And then the other kind of detention.','evil');pose('you',null)}}
   await sweet(t)}else pb.hide=1;
 }},
 {t:'Pass a note to a friend.',tag:'✉️',run:async c=>{
  const fr=kidsIn(c).filter(k=>FRIENDS.includes(k));const to=fr.length?pick(fr):null;if(!to)return;
  const m=await choose(['“this class is a war crime”','“do u think the teacher has a family”','A drawing of the teacher as a horse.'],'The note to '+K[to].n+':');
  const msg=['this class is a war crime','do u think the teacher has a family','(a drawing of the teacher as a horse, with a speech bubble that says “NEIGH. DETENTION.”)'][m];
  const pl=pprop({t:'plane',x:A.you.x,y:A.you.y-22,layer:30});await tw(pl,{x:A[to].x,y:A[to].y-22},500);pl.hide=1;
  const t=teacherOf(c);
  if(t&&Math.random()<.4){
   await walk(t,A[to].x-12,80);hold(t,'note');await evil(t);
   await say(t,'(reading it out loud to the whole room) “'+msg+'.”','evil');classLaugh(1000);
   await say(t,m===2?'(looking at the drawing for a long, long time) …The likeness is good. That’s what upsets {ME}.':'Notes are for people who don’t respect {ME}. Who doesn’t respect {ME}?','evil');hold(t,null);await sweet(t);
  }else{
   const R_={0:['lmao it really is','(underneath, smaller) help'],1:['no. they live here. they sleep in the cupboard','i’ve seen the cupboard'],2:['IM GOING TO DIE LAUGHING','(a second drawing: you, as a smaller horse)']};
   await dms(K[to].n,'a folded note',[['me',msg],...R_[m].map(x=>['them',x])],{live:R_[m].length});
  }
 }},
 {t:'Cheat off the quiz of the kid next to you.',tag:'👀',run:async c=>{
  const nb=c.nb[0];if(!nb)return;
  const r=await meter('Lean over without the teacher noticing',{speed:1.25,zone:.22});
  if(r){const ans={arjun:'Every single answer: “mickther”. Question 9 is a drawing of Hasan.',hasan:'He’s drawn a little heart next to every answer he isn’t sure about. Every answer has a heart.',corey:'He’s written a curl cream routine. In steps. It’s numbered.',nivaan:'Every answer: “like and subscribe”. He got the first one right somehow.',aidan:'Every answer is “1987”. Including the one about fractions. He’s underlined it twice.',kenneth:'Blank. Completely blank. He’s written his own full name, school and dad’s name at the top out of habit, then crossed it out.',omer:'He’s written the answers in a really aggressive font. Most of them are right.',david:'Perfect. Every one. In fountain pen. He’s also written “I know you’re looking” at the bottom.'};
   await N(ans[nb]||'Their answers are worse than yours. Somehow. You copy one anyway out of respect.');return}
  const t=teacherOf(c);if(!t)return;await evil(t);
  await say(t,'Eyes on your OWN paper, {PET}. {ME} has eyes on everyone’s.','evil');
  await N(K[t].n+' takes your quiz, rips it in half, and puts both halves in '+HIS(t)+' mouth. Chewing, all the way back to the front.');await sweet(t);
 }},
 {t:'Put your head down. Just for a second.',tag:'💤',run:async c=>{
  const t=teacherOf(c);pose('you','sit');fxState.dark=0;await tw(fxState,{dark:.85},700);
  await N(pick(['You dream you’re in a hallway made entirely of lockers. Every one is 217. Aidan is inside all of them, knocking politely.','You dream that Mr. Biscuits the cat is teaching the class. He’s better at it. Everyone loves him. Ms. Sherman is in the back row, crying.','You dream the bell rings and everyone leaves and you can’t stand up because your legs are made of trays. Pat is there. She says, “It’s fine, love. It’s fine.”','You dream about absolutely nothing for the first time in weeks. It’s amazing.']));
  await tw(fxState,{dark:0},400);
  if(t){await walk(t,A.you.x+14,90);face(t,-1);await say(t,'(standing right over you) Are we BORED, {PET}? Is {ME} BORING?','evil');
   const r=await choose(['“No, '+SIRMISS(t)+'. I was thinking about the lesson.”','Wipe the drool off your desk with your sleeve and say nothing.']);
   await say(t,r?'(watching the drool) …Gross. Lovely. Gross.':'Thinking with your EYES CLOSED? {ME} thinks like that too. In the night. About all of you.','evil')}
 }},
 {t:'Draw something on your desk.',tag:'✏️',run:async c=>{
  const m=await choose(['A little heart with initials in it.','The teacher as a horse.','“AIDAN WAS HERE”']);
  pose('you','write');await wait(400);pose('you',null);
  const nb=c.nb[0];
  if(m===0&&nb)await say(nb,'(leaning over) Whose initials are those? Those aren’t real initials. Nobody’s called J.B.','smirk');
  if(m===1&&nb)await say(nb,'(whispering) That’s the best thing anyone has ever drawn in this school. Sign it.','happy');
  if(m===2){await N('You write it small, in the corner. When you look up, a desk across the room already has it written on it. In the same handwriting. Older ink.');if(!D.dead.aidan&&!D.f.aidanDead)await say('aidan','(from the door window, mouthing) thank you','smirk')}
 }},
 {t:'Flick a rubber band at the ceiling tiles.',tag:'🎯',run:async c=>{
  SFX.whoosh();const ks=kidsIn(c);const v=ks.length?pick(ks):null;
  if(Math.random()<.25){SFX.crunch();shake(1);const r=pprop({t:'raccoon',x:160,y:110,dir:1,layer:40});await tw(r,{y:A.you.y-4},300,'in');
   await N('The tile comes down. So does a raccoon. It lands on the desk in front of you, looks around the classroom, takes a pencil, and leaves through the door.');classLaugh(1200);await tw(r,{x:-20},900);r.hide=1;return}
  if(v){SFX.thud();blood(A[v].x,A[v].y-26,8,null,40,A[v].y+2);A[v].ex='hurt';await N('The tile comes loose and lands flat on '+K[v].n+'’s head. A little cloud of dust. A little nosebleed.');await say(v,'(not even surprised) Every time. Every single time.','hurt')}
 }},
 {t:'Actually answer the teacher’s question.',tag:'✋',run:async c=>{
  const t=teacherOf(c);if(!t)return;
  const Q=[['What’s 7 × 8?',['56','54','A lot.'],0],['What’s the past tense of “run”?',['Ran','Runned','Escaped'],0],['What does a plant need to make food?',['Sunlight','Vibes','Pat'],0],['What year did the boiler at this school blow up?',['1987','1978','What boiler?'],2]];
  const q=pick(Q);await say(t,'Who can tell {ME}: '+q[0],'happy');pose('you','up');
  const a=await choose(q[1]);pose('you',null);
  if(a===q[2]){await say(t,q[0].includes('boiler')?'(very still) …Good answer, {PET}. There was no boiler. Good.':'Correct! Gold star, {PET}.','happy');bond(t,1)}
  else{await evil(t);await say(t,q[0].includes('boiler')?'(very quietly, writing your name down) How does a child know that.':'(writing your name on the board, slowly, in red) Wrong, {PET}. {ME} will remember this one.','evil');await sweet(t)}
 }}
];
/* ---------------- things that just happen ---------------- */
const CLASS_EVENTS=[
 async c=>{const ks=kidsIn(c);if(!ks.length)return;const v=pick(ks);SFX.buzz?SFX.buzz():SFX.static();await N('A wasp comes in through the window and lands on '+K[v].n+'’s pencil case. Nobody breathes.');A[v].ex='scared';await say(v,'(frozen, whispering) Is it on me. Don’t tell me if it’s on me. Tell me if it’s on me.','scared');const t=teacherOf(c);if(t){await walk(t,A[v].x-10,90);SFX.smack();await N(K[t].n+' crushes it with a bare hand. Then wipes the hand on '+K[v].n+'’s shirt, and goes back to the board.')}},
 async c=>{const ks=kidsIn(c);if(!ks.length)return;const v=pick(ks);SFX.beep();await N('Somebody’s phone goes off. Full volume. The ringtone is a man screaming “WAKE UP, KING” over a bass drop. It’s '+K[v].n+'’s.');A[v].ex='shock';const t=teacherOf(c);if(t){await walk(t,A[v].x-10,90);hold(t,'phone');await say(t,'No phones, {PET}. It goes in {ME}’s drawer. With the others. The drawer is very full.','evil');hold(t,null);await walk(t,TEACHER_SPOT[c.room]?TEACHER_SPOT[c.room][0]:44,80)}},
 async c=>{if(D.dead.aidan||D.f.aidanDead)return;await N('In the little window in the classroom door: Aidan. Just his face. He isn’t in this class. He waves. Slowly. Everyone sees. Everyone decides not to have seen.');const ks=kidsIn(c);if(ks.length)await say(pick(ks),'(not looking at the door) Don’t look at the door.','scared')},
 async c=>{const ks=kidsIn(c);if(ks.length<2)return;const v=pick(ks);SFX.splat();await N(K[v].n+' throws up. Into their own backpack. With incredible accuracy. The smell gets to the next desk, and then the next one, and it becomes a chain.');for(const k of ks.filter(k=>k!==v).slice(0,2)){A[k].ex='hurt';SFX.splat();await wait(300)}const t=teacherOf(c);if(t)await say(t,'(not looking up) Bodies are beautiful, {PETS}. Keep working.','happy')},
 async c=>{const ks=kidsIn(c);if(!ks.length)return;const v=pick(ks);blood(A[v].x,A[v].y-24,14,null,40,A[v].y+2);A[v].ex='shock';await N(K[v].n+'’s nose starts bleeding all over the worksheet, out of nowhere, like a tap.');const t=teacherOf(c);if(t)await say(t,'(taking the bloody worksheet, delighted) Extra credit! That’s commitment.','happy')},
 async c=>{SFX.bell();SFX.bell();await N('Fire alarm. Twenty minutes in lines on the wet field. Nobody was on fire. Back inside, the teacher counts heads twice and gets two different numbers.');}
];

{const _w=whisper;whisper=async function(c){
 /* now and then, something just happens in class (no menu) */
 if(c&&Math.random()<(TEST?.5:.25)){const e=pick(CLASS_EVENTS);try{await e(c)}catch(err){if(TEST&&TEST.err)TEST.err(err)}}
 return _w(c);
}}

/* ---------------- VAPERS ---------------- */
Object.assign(K,{
 brayden:{n:'Brayden',col:'#5a5a6a',skin:'#f0c8a8',hair:'#c8a060',hs:'fade',top:'#3a3a44',pants:'#1a1a22',hood:1,seed:101,v:300},
 kaylee:{n:'Kaylee',col:'#d070a0',skin:'#e8c0a0',hair:'#e8d0a0',hs:'ponytail',top:'#e0a0c8',pants:'#2a2a3a',girl:1,seed:102,v:480},
 jaxon:{n:'Jaxon',col:'#3a6a4a',skin:'#c89068',hair:'#1a1210',hs:'buzz',top:'#2a5a3a',pants:'#1a1a1a',chain:1,seed:103,v:260}
});
for(const id of['brayden','kaylee','jaxon'])K[id].id=id;
Object.assign(ITEMS,{vape:'A confiscated Blue Razz Ice vape'});
{const _dh=drawHeld;drawHeld=function(it,x,y,d){if(it==='vape'){R(x-1,y-5,2,7,'#2a2a3a');R(x-1,y-5,2,1,'#5ac8f0');if(Math.sin(T*3)>.6)R(x-1,y+1,2,1,'#f05ac8');return}return _dh(it,x,y,d)}}
{const _dp=drawProp;drawProp=function(p){if(p.t==='vapecloud'){const f=A[p.follow];if(!f||f.dead){return}const hx=f.x+(f.dir||1)*6,hy=f.y-30;for(let i=0;i<7;i++){const q=(T*.35+i/7)%1;g.globalAlpha=(1-q)*.75;const r=3+q*9;R(hx+(f.dir||1)*q*14+Math.sin(T+i)*3-r/2,hy-q*26-r/2,r,r,i%2?'#e8e8f4':'#d8e0f8');g.globalAlpha=1}return}return _dp(p)}}
const VAPE_SPOTS=[['toilets',0,200],['toilets',2,230],['toilets',4,180],['field',2,40],['field',4,30],['corridor',4,280],['bus',0,20],['carpark',8,280]];
function vapersToday(){
 if(!D.f.vapers){const sp=VAPE_SPOTS.slice().sort(()=>Math.random()-.5),out=[];const grab=f=>{const i=sp.findIndex(f);return sp.splice(i<0?0:i,1)[0]};for(const id of['kaylee','brayden','jaxon']){const s_=grab(x=>id!=='kaylee'||x[0]!=='toilets');out.push({id,room:s_[0],per:s_[1],x:s_[2]})}D.f.vapers=out}
 return D.f.vapers;
}
const vaperHere=id=>{const v=vapersToday().find(v=>v.id===id);return v&&v.room===D.room&&v.per===D.period&&!D.dead[id]&&!(D.f.vapeDone||{})[id]};
{const _b=buildRoom;buildRoom=function(room){const r=_b(room);if(D&&!D.weekend)for(const v of vapersToday())if(v.room===room&&v.per===D.period&&!D.dead[v.id]&&!(D.f.vapeDone||{})[v.id]){put(v.id,v.x,v.x>160?-1:1,{y:140,hold:'vape',pose:'lean'});prop({t:'vapecloud',follow:v.id,x:0,y:0})}return r}}

mission('vapes',{name:'Clear the Air',icon:'💨',who:['brayden','kaylee','jaxon'],
 blurb:'Three eighth graders vape everywhere. The bathrooms, behind the field, the bus loop, the carpark. They’re somewhere different every day. They always offer.',
 parts:['Deal with a vaper','Deal with all three (any days)'],
 tips:['Look for a cloud. Bathrooms, behind the field, the corridor at lunch, the bus loop, the carpark after school. They move every day.'],
 variants:{clean:'No blood',mixed:'Some blood',killer:'All blood'}});
const VKILL={
 toilets:{t:'Shove their face into the hand dryer.',run:async id=>{await walk('you',A[id].x-10,90);pose('you','grab');SFX.rumble();shake(1);for(let i=0;i<3;i++){SFX.squelch();blood(A[id].x+6,A[id].y-26,26,1,100,A[id].y+2);await wait(260)}pose('you',null);kill(id,'lie',{pool:36,bleed:4,spray:40});await N('The hand dryer is the expensive kind. It is very, very good at its job. It runs for another minute after, on its own, like it’s proud.')}},
 field:{t:'Coach left the shot put on the grass.',run:async id=>{hold('you','medball');pose('you','throw');await wait(250);hold('you',null);const b=pprop({t:'medball',x:A.you.x,y:A.you.y-24});await tw(b,{x:A[id].x,y:A[id].y-24},350,'in');b.hide=1;pose('you',null);SFX.crunch();shake(1.2);kill(id,'crush',{pool:34,bleed:3,spray:40});await N('Seven kilograms, from about four meters. Coach, from across the field, holding a stopwatch: “…Personal best.”')}},
 corridor:{t:'Slam them in a locker.',run:async id=>{await walk('you',A[id].x-10,90);pose('you','grab');for(let i=0;i<4;i++){SFX.locker();shake(.7);blood(A[id].x,A[id].y-24,14,null,60,A[id].y+2);await wait(240)}pose('you',null);kill(id,'crush',{pool:30,bleed:3,spray:30});await N('Locker doors are not designed to close that many times on one thing. This one does. It doesn’t shut properly ever again.')}},
 bus:{t:'Push them in front of the 43.',run:async id=>{SFX.rumble();await N('The 43 is pulling in. It is not slowing down. It never slows down.');pose('you','grab');await wait(200);pose('you',null);SFX.crunch();shake(1.6);flash('#a00010',.4);kill(id,'lie',{pool:46,bleed:5,spray:70});await N('The driver doesn’t stop. He opens the doors at the stop like nothing happened, and says “Morning,” to everybody.')}},
 carpark:{t:'Tip them over the barrier.',run:async id=>{await walk('you',A[id].x-10,90);pose('you','grab');await wait(200);pose('you',null);SFX.scream();await tw(A[id],{y:200},600,'in');D.dead[id]=1;P.stats.kills++;A[id].vis=false;await wait(500);SFX.crunch();await N('Six floors. Then the sound of a car alarm, far below. It goes on for a long time.')}}
};
function vapeScore(how){P.vape=P.vape||{kill:0,clean:0,run:{}};const k=cal()+'_'+how;P.vape[how==='kill'?'kill':'clean']++;save();
 const n=P.vape.kill+P.vape.clean;if(n>=1)part('vapes',1);
 if(n>=3&&!P.done.vapes){complete('vapes',P.vape.clean===0?'killer':P.vape.kill===0?'clean':'mixed')}
}
for(const id of['brayden','kaylee','jaxon'])for(const room of['toilets','field','corridor','bus','carpark'])
 hook({mis:'vapes',period:[0,2,4,8],room,who:id,label:'Walk up to '+K[id].n+' (vaping)',look:{hold:'vape'},cond:()=>vaperHere(id),run:async()=>{
  const LINES={brayden:'(blowing a cloud the size of a car) Bro. Blue Razz Ice. You want a hit? It’s basically fruit.',kaylee:'(blowing a cloud right in your face) It’s watermelon. It tastes like summer. Like a summer where you can’t breathe. You want some?',jaxon:'(holding it out without looking at you) Hit it. Don’t be weird about it. Everyone hits it. Your mom hits it.'};
  if(!A[id]){put(id,200,-1,{y:140,hold:'vape',pose:'lean'});prop({t:'vapecloud',follow:id,x:0,y:0})}
  await say(id,LINES[id],'smirk');
  const room=D.room,teach=Object.keys(A).filter(k=>K[k]&&K[k].adult&&!A[k].dead&&k!==id);
  const o=[{t:'“No thanks.”'},{t:'Take a hit.'},{t:'Snatch it and throw it away.'},{t:'Tell a teacher.'},{t:VKILL[room].t,tag:'🩸'},{t:'Take their head off with the art room paper cutter. Then kick it.',tag:'🩸'},{t:'Borrow the groundskeeper’s shears. Their toes. One at a time.',tag:'🩸'}];
  const c=await choose(o,'They’re holding it out to you.');
  D.f.vapeDone=D.f.vapeDone||{};
  if(c===0){await say(id,pick(['Okay, narc.','Your loss. Your lungs’ win, or whatever.','You’re so boring. You’re like a substitute teacher.']),'smirk');return 'stay'}
  if(c===1){SFX.gasp();A.you.ex='hurt';fxState.tint='#6ac040';fxState.tintA=.18;
   await N('You take a hit. Your lungs immediately file a formal complaint. You cough for so long that '+K[id].n+' gets bored and starts scrolling.');
   await N('The room tilts. Your mouth tastes like a blue Jolly Rancher that died. You feel incredible for four seconds and then terrible for forty minutes.');
   await tw(fxState,{tintA:0},2000);fxState.tint=null;
   if(teach.length){await say(teach[0],'(sniffing the air) Why does it smell like a blueberry that’s been set on fire?','evil')}
   return 'stay'}
  if(c===2){pose('you','grab');await wait(200);pose('you',null);hold(id,null);give('vape');
   await N('You grab it out of their hand. '+K[id].n+' makes a sound like a kettle.');
   await say(id,'THAT WAS FORTY DOLLARS. THAT WAS MY BIRTHDAY MONEY.','cry');
   await N('You drop it '+(room==='toilets'?'in the toilet and flush. It goes round and round, still glowing, like a little sad disco.':'down the nearest drain. It lights up blue all the way down.'));
   D.items=D.items.filter(x=>x!=='vape');D.f.vapeDone[id]=1;vapeScore('clean');await walk(id,id==='kaylee'?334:-16,80);remove(id);return 'stay'}
  if(c===3){put('sherman',334,-1,{y:146});await walk('sherman',A[id].x+14,90);
   await say('sherman','Vaping? On school grounds? Come with me, sweetheart. To my office. We’ll have a little chat about your lungs.','evil');
   await Promise.all([walk('sherman',334,60),walk(id,320,60)]);remove('sherman');remove(id);
   await N('About a minute later, from somewhere deep inside the building, one short scream. Then the PA plays the bell for no reason.');
   D.f.vapeDone[id]=1;vapeScore('clean');return 'stay'}
  if(c===5){
   hold('you','cleaver');pose('you','overhead');await say(id,'(the vape still in their mouth) Bro, what is that. Is that from ART?','scared');
   await wait(300);pose('you','stab');SFX.whoosh();await wait(150);
   const h=await gHead(id,A.you.x<A[id].x?1:-1);hold('you',null);pose('you',null);
   await liftHead('you',h,'You pick it up by the hair. The vape is still in its mouth. It’s still glowing. Blue Razz Ice.');
   await kickHead('you',h,140);
   await N('It bounces three times and comes to rest with the vape still in. Somewhere, a kid films the whole thing and posts it with a sad violin sound.');
  }else if(c===6){
   pose('you','grab');await wait(200);pose('you',null);A[id].pose='lie';
   await say(id,'WAIT. WAIT WAIT WAIT. I’LL STOP. I’LL STOP VAPING.','scared');
   await toes(id,'you');
   await say(id,'(from the floor, very small) …I’m switching to gum.','hurt');
   await N('Five toes in a little line on the floor, like they’re waiting for a bus. All day, everyone steps around them very carefully.');
   D.f.vapeDone[id]=1;vapeScore('clean');return 'stay';
  }else await VKILL[room].run(id);
  D.f.vapeDone[id]=1;vapeScore('kill');
  if(teach.length){const t=teach[0];await say(t,pick(['(nodding) Vaping is a disgusting habit, {PET}. {ME} would have done the same. {ME} HAS done the same.','(not even looking up) Good. Clean that up before the bell.','(slow clap) Initiative. I like initiative.']),'happy')}
  const ks=Object.keys(A).filter(k=>FRIENDS.includes(k)&&!A[k].dead);if(ks.length)await say(pick(ks),pick(['…Okay. Okay. We didn’t see that. Did we see that?','I’m never vaping. I was never going to vape. I’m extra never vaping now.','Bro. BRO. It was watermelon flavor.']),'shock');
  return 'stay';
 }});
