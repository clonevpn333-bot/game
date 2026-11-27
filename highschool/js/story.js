'use strict';
/* =====================================================================
   HIGHSCHOOL — the main story, one clear step at a time.
   Shown under the clock and at the top of the quest log.
   ===================================================================== */
const STORY=[
 {t:'Friday. Again.',goal:'Get through one whole day. Board the 43 at home time.',done:()=>P.loops>=2},
 {t:'The boy who notices',goal:'Find Aidan and talk to him. He’s at the bus loop before school.',done:()=>P.story&&P.story.metAidan},
 {t:'Ode to Omer',goal:'Pick an ODD day. Go to English in Period 1 and hear Aidan’s poem.',done:()=>P.intel.aidanPoem},
 {t:'Fourteen jars',goal:'Lunch: get Mr. Voss’s fridge key in the chem lab. Period 7: open the back fridge.',done:()=>P.intel.aidanJars},
 {t:'The boy in the library',goal:'Bunk Period 1 in the library and talk to the sixth grade. Find his overdue book. Give it back.',done:()=>D&&D.done&&D.done.register},
 {t:'1987',goal:()=>'Find pages of the Highgate Archive (Quest log → Archive). '+(typeof loreCount==='function'?loreCount():0)+' of 8 so far.',done:()=>typeof loreCount==='function'&&loreCount()>=8},
 {t:'The Calling',goal:'Home time, bus loop: ask Aidan about Fridays. How you treated him today decides how it ends.',done:()=>Object.keys(P.endings).some(e=>e!=='saturday')},
 {t:'Saturday',goal:()=>'Secret: find every Archive page ('+(typeof loreCount==='function'?loreCount():0)+'/12), then tell Aidan what happened in 1987.',done:()=>P.endings.saturday}
];
function storyNow(){for(let i=0;i<STORY.length;i++){if(!STORY[i].done())return{i,...STORY[i],goal:typeof STORY[i].goal==='function'?STORY[i].goal():STORY[i].goal}}return null}
{const _c=chat;chat=async function(id){if(id==='aidan'){P.story=P.story||{};if(!P.story.metAidan){P.story.metAidan=1;save()}}return _c(id)}}
{const _ul=updateLoc;updateLoc=function(){_ul();const s=storyNow(),c=$('clock');if(!c||!s)return;const d=document.createElement('div');d.className='story';d.textContent='★ '+s.t+': '+s.goal;c.appendChild(d)}}
{const _oq=openQuest;openQuest=function(){_oq();if(questTab!=='missions')return;const s=storyNow(),body=$('quest').querySelector('.qbody');if(!body)return;const box=document.createElement('div');box.className='li storybox';box.innerHTML='<b>Main story — chapter '+(s?s.i+1:STORY.length)+' of '+STORY.length+'</b><br>';box.appendChild(document.createTextNode(s?s.t+': '+s.goal:'Every chapter done. You found Saturday.'));const done=STORY.filter(x=>x.done()).map(x=>x.t);if(done.length){const p=document.createElement('div');p.style.cssText='color:#a9d88a;font-size:12px;margin-top:4px';p.textContent='Done: '+done.join(' · ');box.appendChild(p)}body.prepend(box)}}
/* when a chapter finishes, say so */
let storyLast=null;
let storyLastT=null;
ON_PERIOD.push(async()=>{const s=storyNow(),k=s?s.i:STORY.length;if(storyLast!=null&&k>storyLast&&storyLastT&&(!s||s.t!==storyLastT)){SFX.good();toast('★ Main story: '+storyLastT+' — done. Next: '+(s?s.t:'the end'))}storyLast=k;storyLastT=s?s.t:null});
/* safety net: if nothing is happening and you can't move, give control back */
{let stuckT=0;const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);const idle=!busy&&panelMode!=='roam'&&!DL&&!CH&&!MINI&&!anyOverlay()&&D&&D.room&&$('menu').hidden;stuckT=idle?stuckT+rdt:0;if(stuckT>2.5){stuckT=0;roam()}}}
