'use strict';
/* =====================================================================
   HIGHSCHOOL — THE TEACHERS, AS BOSSES
   Over the two weeks, quests dig up each teacher's weakness. On
   Inspection Day, before the crew reaches the PA, the teachers step off
   the wall to stop you, one at a time. Each one is a boss: a card, a
   health bar, a fight. Use their weakness and you take them apart. No
   weakness and it's your fists against theirs. Every teacher you beat
   counts toward exposing the school.
   ===================================================================== */
const WEAK={
 coach:{has:()=>!!(D.done.gains||D.done.closet),what:()=>D.done.gains?'Shout “PROTEIN SHAKE” across the hall.':'Hold up Nivaan’s phone: Coach in a hairnet.',
  hit:'Coach goes white. Every kid in the hall starts chanting “IN-VEN-TO-RY”. He drops to his knees and covers his ears like a man in a war movie.'},
 balduf:{has:()=>!!D.done.swipe,what:()=>'Read her dating profile out loud.',
  hit:'“Seeking a gentleman of letters.” The whole hall goes “OOOOOH”. Ms. Balduf turns the color of a red pen and walks backwards into the curtain until she’s just a shape.'},
 grieve:{has:()=>!!(D.done.bayonet||D.items.includes('notebook')),what:()=>'“Chapter Four, sir. Again and again the cannon fired—”',
  hit:'Mr. Grieve screams. Not a word. Just a long, military scream. He drops his bayonet and runs out of the fire exit, and the alarm goes off, and nobody turns it off.'},
 shermian:{has:()=>!!((typeof crew==='function'&&crew().ev&&crew().ev.boiler)||(D.f.sherC||0)>=5),what:()=>(typeof crew==='function'&&crew().ev&&crew().ev.boiler)?'“Ollie Finch. Raj Patel. Danny Mason. Louise Okafor. You left them there.”':'“You’ve caught me six times, Miss. Six. I know how you move now.”',
  hit:'Ms. Sherman stops halfway across the hall. Her face does something faces aren’t built to do. Then she sits down on the floor, very slowly, and doesn’t get up.'},
 voss:{has:()=>!!((typeof crew==='function'&&crew().ev&&crew().ev.jars)||D.f.chaos&&Object.keys(D.f.chaos).some(k=>k.startsWith('carfire'))),what:()=>'“Fourteen jars, sir. With names on.”',
  hit:'Mr. Voss stops smiling for the first time in his life. He looks at the inspectors. He takes out his little notebook and writes his OWN name in it. Then he leaves.'},
 nurse:{has:()=>!!D.done.nursecal,what:()=>'“Coach, Grieve and Adam. In that order. Thursday’s just the word WHY.”',
  hit:'Nurse Pam drops the syringe. Three grown men on the side wall all turn and look at her at once. She runs. They follow. It’s not clear if it’s to stop her.'}
};
const BOSS_LIST=['shermian','coach','voss','balduf','grieve','nurse'];
let BOSS=null;
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!BOSS)return;
 const w=130,x0=W-w-8,y0=24;R(x0-2,y0,w+4,13,'#141020');R(x0-2,y0,w+4,1,'#ffd27a');pxc(BOSS.name,x0+w/2,y0+2,'#ffd27a');
 R(x0,y0+9,w,3,'#3a1a1a');R(x0,y0+9,Math.round(w*BOSS.hp),3,BOSS.hp>.5?'#e04040':'#ff8a3a')}}
{const _cl=clearStage;clearStage=function(){BOSS=null;return _cl()}}
async function bossFight(t){
 const W_=WEAK[t];if(!A[t]||A[t].dead)return 0;
 BOSS={name:'BOSS · '+K[t].n.toUpperCase(),hp:1};
 await card('BOSS',K[t].n.toUpperCase(),1100);
 A[t].ex='evil';await walk(t,A.you.x+34,90);face(t,'you');
 await camZoom((A[t].x+A.you.x)/2,A.you.y-24,1.5,350);
 const has=W_&&W_.has();
 const opts=[];if(has)opts.push({t:'Use what you know: '+W_.what(),tag:'⚡'});opts.push({t:'Fight.',tag:'👊'});opts.push({t:'Run past.'});
 const c=await choose(opts,K[t].n+' is coming for you.');
 const pick_=opts[c];
 if(pick_.tag==='⚡'){
  await say('you',W_.what().replace(/^“|”$/g,''));
  for(let i=0;i<10;i++){BOSS.hp=Math.max(0,1-(i+1)/10);await wait(TEST?0:40)}
  SFX.bad&&SFX.bad();shake(1);flash('#fff',.4);A[t].ex='shock';await N(W_.hit);
  A[t].pose='lie';await camZoom();BOSS=null;return 2;
 }
 if(pick_.tag==='👊'){
  const ok=await mash('FIGHT '+K[t].n.toUpperCase(),{need:24,time:4.5,info:'No weakness. Just you. MASH!'});
  if(ok){await hit('you',t,{blood:8});BOSS.hp=.4;await hit('you',t,{blood:8});BOSS.hp=0;A[t].pose='lie';A[t].hurt=3;await N(K[t].n+' goes down in front of the whole school. The inspectors write something down. It’s probably your name. It’s probably a good thing.');await camZoom();BOSS=null;return 1}
  await hit(t,'you',{blood:10});A.you.hurt=Math.min(3,(A.you.hurt||0)+1);await N(K[t].n+' throws you into the front row of chairs like a bag of laundry. You get up. You’re still standing. Barely.');await camZoom();BOSS=null;return 0;
 }
 const ok=await mash('Dodge',{need:14,time:3});await camZoom();BOSS=null;
 if(ok){await N('You slip past. '+K[t].n+' grabs the air where you were.');return 0}
 await hit(t,'you',{blood:8});A.you.hurt=Math.min(3,(A.you.hurt||0)+1);return 0;
}
async function bossFights(teachers){
 if(TEST)return 0;
 const order=BOSS_LIST.filter(t=>teachers.includes(t)||(t==='nurse'&&D.done.nursecal)||(t==='grieve'&&K.grieve)||(t==='balduf'&&K.balduf));
 if(!order.length)return 0;
 for(const t of order)if(!A[t]&&K[t]&&!D.dead[t])put(t,320,-1,{y:126});
 await N('The crew starts moving towards the PA desk. Along the side wall, the teachers stop smiling. One by one, they step off the wall.');
 let score=0;
 for(const t of order.slice(0,4)){score+=await bossFight(t)}
 await N(score>=4?'Behind you, the hall is a wreck of teachers on the floor. In front of you, the PA desk. Nobody’s in your way any more.':'You make it to the PA desk. Behind you, the teachers who are still standing are getting up off the floor.');
 return Math.floor(score/2);
}
/* the Tracker lists what you know */
{const _rt=renderTracker;renderTracker=function(body){_rt(body);const w=body.querySelector('.trk');if(!w||!D)return;
 const h=document.createElement('h3');h.textContent='⚡ TEACHER WEAKNESSES (for Inspection Day)';h.style.color='#ff9a6a';w.appendChild(h);
 const box=document.createElement('div');box.className='ppl';w.appendChild(box);
 for(const t of BOSS_LIST){if(!K[t])continue;const d=document.createElement('div');const ok=WEAK[t].has();d.innerHTML='<b></b>: ';d.querySelector('b').textContent=K[t].n;d.appendChild(document.createTextNode(ok?'✔ got it':'? not yet'));d.style.opacity=ok?1:.55;box.appendChild(d)}
}}
