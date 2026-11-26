'use strict';
/* =====================================================================
   HIGHSCHOOL — INSPECTION DAY USES WHAT YOU FOUND
   Everything you dug up across the two weeks shows up in the hall, as
   its own moment, not just a number:
   • the kids you rescued stand up one by one and say what happened
   • the kids you didn't save are on the projector, as MISSING posters
   • Mr. Kim's VOLUNTEERS wall, Mr. Voss's ledger (GRAMS)
   • Oliver Finch walks in through the back doors (if you saved him in 1987)
   • Ms. Sherman remembering 1987 → she confesses instead of killing anyone
   ===================================================================== */
if(MIS.crew){MIS.crew.variants=Object.assign(MIS.crew.variants||{},{confessed:'She confessed'})}
OUTCOME_FIX['crew:confessed']='good';
async function finaleDiscoveries(c){let add=0;const ev=c.ev||{},saved=Object.keys(c.saved||{}),gone=Object.keys(c.gone||{});
 const sl=(t)=>{SLIDE.t=t;SLIDE.lock=1};
 if(ev.ledger){sl('MR. VOSS’S LEDGER. NAMES. DATES. GRAMS');SFX.click();await N('Click. On the wall: a page from Mr. Voss’s ledger. Names. Dates. A column headed GRAMS. Somebody in the back row is sick into their backpack.');add++}
 if(ev.volunteers){sl('VOLUNTEERS');SFX.click();await N('Click. On the wall: Mr. Kim’s basement. Dozens of school photos with red clown noses drawn on in marker. Across the top: VOLUNTEERS.');if(A.kim)A.kim.ex='shock';add++}
 if(gone.length){sl('MISSING: '+gone.map(v=>K[v]?K[v].n:v).join(' · '));SFX.click();await N('Click. MISSING posters. '+gone.map(v=>K[v]?K[v].n:v).join(', ')+'. Somebody’s mom, at the back of the hall, makes a noise like she’s been hit.')}
 if(saved.length){cue('romance');let x=24;
  for(const v of saved.slice(0,4)){if(!K[v])continue;put(v,x,1,{y:160,ex:'scared'});x+=16;
   const a=Object.values(typeof ABD!=='undefined'?ABD:{}).find(q=>q.v===v),t=a&&K[a.t]?K[a.t].n:'a teacher';
   await say(v,'(standing up on a chair) I’m '+K[v].n+'. '+t+' took me. '+pick(['Somebody came and got me out.','I’d be on that wall if somebody hadn’t come.','I’m here because somebody came.']),'angry');add++}
  await N('One by one, they stand up. Then their friends stand up next to them. Then their friends’ friends. The inspectors stop writing. They just watch.');cue('tension')}
 if(ev.finch&&K.oliver){put('oliver',334,-1,{y:150});await walk('oliver',270,60);
  await say('oliver','(at the back doors, holding a library book in a plastic sleeve) My name is Oliver Finch. In March 1987 I was supposed to be in that boiler room. A kid told me to tell someone. I’m telling someone.','sad');add+=2}
 SLIDE.lock=0;return add}
/* the slides go up on the actual projector screen in the hall */
const SLIDE={t:'',lock:0};
{const _sy=say;say=async function(who,t,ex){if(who===''&&typeof t==='string'&&/^Click\./.test(t)&&ROOM==='hall'&&!SLIDE.lock)SLIDE.t=t.replace(/^Click\.\s*(On the wall:\s*)?/,'').split(/[,.:]/)[0];return _sy(who,t,ex)}}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);if(!SLIDE.t||ROOM!=='hall'||TEST)return;
 R(110,34,100,54,'#f4f2ec');R(110,34,100,2,'#c8c4bc');const ws=SLIDE.t.toUpperCase().split(' '),L=[''];for(const w of ws){const tr=(L[L.length-1]+' '+w).trim();if(pxw(tr)>92&&L[L.length-1])L.push(w);else L[L.length-1]=tr}
 if(SLIDE.t==='VOLUNTEERS'){pxc('VOLUNTEERS',160,38,'#8a1010');for(let i=0;i<14;i++){const px_=116+(i%7)*13,py=48+Math.floor(i/7)*19;R(px_,py,10,15,'#c8c0b0');R(px_+2,py+2,6,6,['#e8c0a0','#a8704a','#f0d0b0','#c8946a'][i%4]);R(px_+3,py+1,4,2,['#3a2418','#1a1010','#c86a2a','#5a3a1a'][i%3]);R(px_+4,py+5,2,2,'#e02020');R(px_+1,py+9,8,5,['#3a8ac0','#c0508a','#6a9a2a','#c04030'][i%4])}return}
 const y0=61-L.length*4;L.slice(0,7).forEach((l,i)=>pxc(l,160,y0+i*8,i===0?'#8a1010':'#2a2030'))}}
{const _id=inspectionDay;inspectionDay=async function(){SLIDE.t='';try{return await _id.apply(this,arguments)}finally{SLIDE.t=''}}}
