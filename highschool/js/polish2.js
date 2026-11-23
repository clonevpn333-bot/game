'use strict';
/* =====================================================================
   HIGHSCHOOL — STEAM POLISH, PART 1
   • Boot splash: a content warning card, then PRESS ANY KEY, then the
     title. (Also unlocks the audio on the first press, like real games.)
   • Esc in-game opens a proper PAUSE menu (Resume · Quest Log ·
     Settings · Save & quit to title) instead of dumping you in settings.
   • One visual language for every menu and box: dark glass panels with
     a warm gold edge, the same buttons everywhere, soft slide-ins.
   • The text box: the ▼ breathes, the name tag sits on the box’s edge,
     new lines ease in.
   ===================================================================== */
{const st=document.createElement('style');st.textContent=`
:root{--gold2:#ffd27a;--glass:#141120ee;--edge2:#5a4a6e}
.ov:not(#menu){background:radial-gradient(ellipse at 50% 30%,#1e1830f2,#08060ef8)!important;animation:ovIn .22s ease-out}
.ov:not(#menu) .box{background:#141120cc;border:2px solid var(--edge2);box-shadow:0 0 0 1px #000,0 10px 30px #0008;padding:12px 14px;border-radius:2px}
.ov h2{letter-spacing:.14em!important;text-shadow:2px 2px #000}
@keyframes ovIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.tb{transition:background .12s,transform .08s,border-color .12s}.tb:hover{border-color:var(--gold2)!important}.tb:active{transform:translateY(1px)}
.tabs button{transition:background .12s,color .12s}
#panel{border:2px solid var(--edge2)!important;box-shadow:0 0 0 1px #000,0 8px 24px #0009;animation:panIn .18s ease-out}
@keyframes panIn{from{opacity:.4;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
#name{position:relative;top:-2px;border:1px solid #0006;box-shadow:2px 2px 0 #0008;letter-spacing:.16em}
#text .more,#text:after{animation:breathe 1s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:1;transform:translateY(0)}50%{opacity:.5;transform:translateY(2px)}}
#choices button{transition:background .1s,padding .1s,border-color .1s}#choices button.sel{padding-left:16px!important;border-color:var(--gold2)!important}
#clock{border-radius:2px;box-shadow:0 0 0 1px #000,0 6px 18px #0007}
#toast{box-shadow:0 0 0 1px #000,0 6px 18px #0008;border-radius:2px}
#splash{position:fixed;inset:0;z-index:60;background:#050408;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#cbbfd8;text-align:center;padding:20px;cursor:pointer}
#splash .w{max-width:34em;font-size:clamp(11px,1.5vw,15px);line-height:1.7;letter-spacing:.06em;opacity:0;animation:spIn 1.2s .3s forwards}
#splash .w b{color:#f08a72;letter-spacing:.2em;display:block;margin-bottom:8px}
#splash .k{font-size:clamp(12px,1.6vw,16px);letter-spacing:.3em;color:var(--gold2);opacity:0;animation:spIn .8s 1.6s forwards,breathe 1.6s 2.4s infinite}
@keyframes spIn{to{opacity:1}}
#pause{position:fixed;inset:0;z-index:40;background:#06040cd8;display:flex;align-items:center;justify-content:center;animation:ovIn .18s ease-out}
#pause .pb{display:flex;flex-direction:column;gap:6px;min-width:240px;padding:18px 22px;background:#141120f2;border:2px solid var(--edge2);box-shadow:0 0 0 1px #000,0 12px 40px #000a}
#pause h3{margin:0 0 8px;font-weight:normal;letter-spacing:.3em;color:var(--gold2);text-align:center}
#pause .ttl-b{opacity:1;transform:none;animation:none}
#pause .ps{font-size:10px;letter-spacing:.14em;color:#8a7a9a;text-align:center;margin-top:6px}
`;document.head.appendChild(st)}

/* ---------- boot splash ---------- */
{const _ti=title;let shown=false;title=async function(){
 if(shown||TEST)return _ti();
 shown=true;
 const s=document.createElement('div');s.id='splash';
 s.innerHTML='<div class="w"><b>CONTENT WARNING</b>This game contains blood, gore, strong language, dark humor, violence at a school, and teachers.<br>It is fiction. None of it is okay. Most of it is funny.</div><div class="k">PRESS ANY KEY</div>';
 document.body.appendChild(s);
 await new Promise(r=>{const go=()=>{document.removeEventListener('keydown',go,true);s.removeEventListener('pointerdown',go);r()};setTimeout(()=>{document.addEventListener('keydown',go,true);s.addEventListener('pointerdown',go)},600)});
 try{audio()}catch(e){}SFX.click&&SFX.click();
 s.style.transition='opacity .5s';s.style.opacity='0';setTimeout(()=>s.remove(),520);
 return _ti();
}}

/* ---------- pause menu ---------- */
function pauseOpen(){return !!document.getElementById('pause')}
function closePause(){const p=document.getElementById('pause');if(p)p.remove()}
function openPause(){
 if(pauseOpen())return closePause();
 const p=document.createElement('div');p.id='pause';
 p.innerHTML='<div class="pb"><h3>PAUSED</h3></div>';
 const box=p.querySelector('.pb');const items=[];
 const add=(t,f)=>{const b=document.createElement('button');b.className='ttl-b';b.innerHTML='<i>▸</i><span></span>';b.querySelector('span').textContent=t;b.onclick=()=>{SFX.click&&SFX.click();f()};b.onmouseenter=()=>sel(items.indexOf(b));box.appendChild(b);items.push(b)};
 add('Resume',closePause);
 add('Quest Log',()=>{closePause();openQuest()});
 add('Settings',()=>{closePause();openSettings()});
 add('Save & quit to title',()=>{closePause();try{if(D&&!busy)P.cur=JSON.parse(JSON.stringify(D))}catch(e){}save();closeOverlays();title()});
 const ps=document.createElement('div');ps.className='ps';ps.textContent=D?((window.dayLabel?dayLabel():'')+' · '+(PERIODS[D.period]||{}).name+(D.room&&ROOMS[D.room]?' · '+ROOMS[D.room].name.split(' —')[0]:'')).toUpperCase():'';box.appendChild(ps);
 let cur=0;function sel(i){cur=(i+items.length)%items.length;items.forEach((b,j)=>b.classList.toggle('on',j===cur))}sel(0);
 p.onclick=e=>{if(e.target===p)closePause()};
 openPause._key=e=>{if(!pauseOpen())return;e.stopPropagation();e.preventDefault();
  if(e.key==='Escape')closePause();else if(e.key==='ArrowDown'||e.key==='s')sel(cur+1);else if(e.key==='ArrowUp'||e.key==='w')sel(cur-1);else if(e.key==='Enter'||e.key===' ')items[cur].click()};
 document.body.appendChild(p);
}
document.addEventListener('keydown',e=>{if(pauseOpen()&&openPause._key)openPause._key(e)},true);
INPUT.settings=function(){const m=$('menu');if(m&&!m.hidden)return openSettings();openPause()};
