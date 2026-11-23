'use strict';
/* =====================================================================
   HIGHSCHOOL — GAME FEEL
   • A soft vignette on every scene, so it reads framed, like a film.
   • Hits land: a 3-frame hit-stop, a white flash on the one who got hit,
     a tiny camera punch toward the impact, and dust off the floor.
   • Title cards (periods, days, chapters) get a soft musical sting.
   • The end of the two weeks rolls proper credits.
   ===================================================================== */
/* vignette: cached once, drawn over everything in the scene */
let VIG=null;
function vignette(){if(!VIG){VIG=document.createElement('canvas');VIG.width=W;VIG.height=H;const v=VIG.getContext('2d');
 const gr=v.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*1.05);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(8,4,14,.55)');v.fillStyle=gr;v.fillRect(0,0,W,H)}
 g.drawImage(VIG,0,0)}
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{try{if(!TEST&&D&&ROOM!=='titlescreen')vignette()}catch(e){}_do&&_do(...x)}}
/* hits */
let HITSTOP=0;
{const _u=update;update=function(dt,rdt){if(HITSTOP>0){HITSTOP-=rdt||dt;return _u(dt*.05,rdt)}return _u(dt,rdt)}}
{const _hit=hit;hit=async function(a,b,o){
 const q=A[b];if(!TEST&&q){HITSTOP=.07;q._flashT=T;
  if(typeof CAM!=='undefined'&&CAM.z<1.05){CAM.x=q.x;CAM.y=q.y-20;CAM.z=1.06;setTimeout(()=>{tw(CAM,{z:1},220)},90)}
  for(let i=0;i<6;i++)parts.push({x:q.x+rand(-6,6),y:q.y,vx:rand(-30,30),vy:rand(-30,-8),s:1,c:'#c8c0b0',life:.35})}
 return _hit(a,b,o)}}
{const _da=drawActor;drawActor=function(a){if(a&&a._flashT&&T-a._flashT<.1&&!TEST){g.save();g.filter='brightness(2.6)';try{return _da(a)}finally{g.restore()}}return _da(a)}}
/* stings on title cards */
{const _cd=card;card=async function(b,s,ms,cls){if(!TEST&&!skipping()){try{const death=cls==='death';const n=death?[220,185,147]:[392,494,587];n.forEach((f,i)=>tone(f,.5,'triangle',.03,0,i*.11))}catch(e){}}return _cd(b,s,ms,cls)}}
/* the credits */
async function rollCredits(){
 if(TEST)return;
 const c=document.createElement('div');c.id='credits';
 const cast=Object.keys(FRIENDS?FRIENDS.reduce((o,k)=>(o[k]=1,o),{}):{}).filter(k=>K[k]&&!(window.EDITION_CUT||[]).includes(k)).map(k=>K[k].n);
 const teach=['balduf','shermian','loach','voss','coach','pat','adam','grieve','tarn','kim'].filter(k=>K[k]).map(k=>K[k].n);
 c.innerHTML='<div class="roll"><h1>HIGHSCHOOL</h1><p class="s">A Calling of Aidan story</p>'+
  '<h3>THE STUDENTS</h3>'+cast.map(n=>'<p>'+n+'</p>').join('')+
  '<h3>THE STAFF</h3>'+teach.map(n=>'<p>'+n+'</p>').join('')+
  '<h3>ALSO STARRING</h3><p>The 43</p><p>Locker 217</p><p>The raccoons in the ceiling</p><p>Biscuit the cat</p>'+
  '<h3>IN MEMORY OF</h3><p>Tyler Morrison</p><p>Ollie, and everybody in the boiler room, 1987</p><p>Every kid who looked at Mr. Voss wrong</p>'+
  '<p class="s" style="margin-top:40px">No teachers were harmed in the making of this game.<br>Several were deserved.</p><h1 style="margin-top:60px">THANK YOU FOR PLAYING</h1></div>';
 document.body.appendChild(c);
 await new Promise(r=>{const end=()=>{c.remove();r()};c.onclick=end;setTimeout(end,42000);document.addEventListener('keydown',function k(e){if(e.key==='Escape'){document.removeEventListener('keydown',k);end()}})});
}
{const st=document.createElement('style');st.textContent=`
#credits{position:fixed;inset:0;z-index:55;background:#050408;overflow:hidden;cursor:pointer}
#credits .roll{position:absolute;left:0;right:0;top:100%;text-align:center;animation:roll 40s linear forwards;color:#cbbfd8;letter-spacing:.12em}
#credits h1{font-weight:normal;color:#ffd27a;font-size:clamp(26px,5vw,54px);margin:0;text-shadow:3px 3px #4a1a2a}
#credits h3{font-weight:normal;color:#f08a72;letter-spacing:.3em;margin:46px 0 12px;font-size:13px}
#credits p{margin:6px 0;font-size:14px}#credits .s{color:#8a7a9a;font-size:12px}
@keyframes roll{to{transform:translateY(calc(-100% - 100vh))}}`;document.head.appendChild(st)}
if(typeof twoWeeksEnd==='function'){const _tw=twoWeeksEnd;twoWeeksEnd=async function(...a){try{await rollCredits()}catch(e){}return _tw(...a)}}
