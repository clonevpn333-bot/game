'use strict';
/* =====================================================================
   HIGHSCHOOL — TITLE
   A proper front door. Highgate High at dusk: the sky going purple,
   one window still lit on the second floor with somebody standing in
   it, crows, fog rolling across the bus loop, the 43 idling with its
   lights on, and the crew hanging around like they don’t want to go
   home. The logo drops in, the menu slides in, keys and mouse both work.
   ===================================================================== */
ROOMS.titlescreen={name:'Highgate High',music:'title',bg(){
 guCache('titlescreen','',()=>{
  /* sky */
  const sky=['#1a1030','#24143a','#3a1c44','#5a2848','#8a3a48','#c8584a','#e8884e'];
  for(let i=0;i<sky.length;i++)R(0,i*14,W,15,sky[i]);
  for(let i=0;i<60;i++){const x=hsh(i*3.1)*W,y=hsh(i*7.7)*60;R(x,y,1,1,i%5?'rgba(255,240,220,.5)':'#fff')}
  /* moon */
  R(250,14,14,14,'#f4ead8');R(248,16,18,10,'#f4ead8');R(253,17,3,3,'#d8ccb8');R(258,22,2,2,'#d8ccb8');
  for(let r=1;r<=4;r++){g.globalAlpha=.05;R(250-r*3,14-r*2,14+r*6,14+r*4,'#f4ead8');R(248-r*2,16-r*3,18+r*4,10+r*6,'#f4ead8')}g.globalAlpha=1;
  /* far city */
  for(let i=0;i<26;i++){const w=8+((i*7)%10),h=14+((i*13)%26),x=i*13-6;R(x,96-h,w,h,'#2a1a36');for(let k=0;k<4;k++)if(hsh(i*9+k)>.6)R(x+2+(k%2)*3,96-h+3+Math.floor(k/2)*5,1,2,'#f0c070')}
  /* the school */
  R(30,40,260,72,'#5a2a2a');for(let y=42;y<112;y+=4)for(let x=30+(y%8?0:4);x<290;x+=8)R(x,y,7,3,y%8?'#6a3232':'#622e2e');
  R(30,40,260,3,'#3a1a1a');R(28,38,264,3,'#7a4a3a');
  /* clock tower */
  R(140,14,40,28,'#5a2a2a');R(136,12,48,3,'#7a4a3a');R(150,4,20,10,'#4a2222');R(158,0,4,5,'#3a1a1a');
  R(151,20,18,18,'#e8dcc0');R(152,21,16,16,'#f4ead8');R(160,22,1,8,'#2a1a1a');R(160,29,5,1,'#2a1a1a');
  pxc('HIGHGATE HIGH',160,46,'#e8c870');
  /* windows (lit ones are drawn live) */
  for(let r=0;r<2;r++)for(let c=0;c<12;c++){const x=40+c*20,y=56+r*24;if(c===5||c===6)continue;R(x,y,12,14,'#1a1424');R(x,y,12,1,'#3a2a3a');R(x+5,y,1,14,'#3a2a3a');R(x,y+6,12,1,'#3a2a3a')}
  /* front doors */
  R(146,80,28,32,'#2a2030');R(147,81,12,30,'#3a5a6a');R(161,81,12,30,'#3a5a6a');R(146,78,28,2,'#8a6a4a');
  /* ground: bus loop */
  R(0,112,W,68,'#3a3440');for(let i=0;i<W;i+=24)R(i,138,14,2,'#8a8270');R(0,112,W,2,'#5a5460');
  for(let i=0;i<W;i+=6)R(i,113+((i*7)%3),2,1,'#4a4450');
  /* fence and trees */
  for(const x of[4,292]){R(x+10,70,4,44,'#1a1418');for(let i=0;i<7;i++){const r=9-Math.abs(i-3)*2;R(x+12-r,62+i*5,r*2,5,i%2?'#1e2430':'#222a38')}}
  R(0,104,W,1,'#5a5a62');for(let x=0;x<W;x+=6)R(x,104,1,9,'#5a5a62');
 });
 /* live: lit windows, the one figure, flicker */
 const lit=[[0,0],[3,1],[8,0],[10,1],[2,0],[11,0]];
 for(const [c,r] of lit){const x=40+c*20,y=56+r*24,f=hsh(Math.floor(T*2)+c*7+r)>.92?.5:1;g.globalAlpha=f;R(x+1,y+1,10,12,c===8&&r===0?'#c84a3a':'#f0c070');g.globalAlpha=1;R(x+5,y,1,14,'#3a2a3a');R(x,y+6,12,1,'#3a2a3a')}
 /* someone at the red window, watching */
 {const x=40+8*20,y=56;R(x+3,y+4,5,9,'#1a0c10');R(x+4,y+2,3,3,'#1a0c10');if(Math.sin(T*1.3)>.94)R(x+4,y+3,1,1,'#ff3a2a'),R(x+6,y+3,1,1,'#ff3a2a')}
 /* clock hands move a little */
 {const a=T*.05;R(160+Math.round(Math.cos(a)*5),29+Math.round(Math.sin(a)*5),1,1,'#c83a2a')}
 /* crows */
 for(let i=0;i<5;i++){const q=((T*.04+i*.21)%1.2),x=W+20-q*(W+60),y=24+i*7+Math.sin(T*2+i)*3,f=Math.sin(T*10+i)>0;R(x,y,3,1,'#120a14');R(x-2,y-(f?1:-1),2,1,'#120a14');R(x+3,y-(f?1:-1),2,1,'#120a14')}
 /* the 43, idling */
 {const bx=272,by=142,sh=Math.sin(T*30)>.5?1:0;R(bx,by-34+sh,96,34,'#e8b830');R(bx,by-34+sh,96,3,'#f8d860');for(let i=0;i<6;i++)R(bx+6+i*15,by-28+sh,11,10,'#2a3a4a');R(bx,by-14+sh,96,2,'#2a2a2a');
  R(bx+8,by-4,12,8,'#141414');R(bx+70,by-4,12,8,'#141414');pxc('43',bx+40,by-31+sh,'#2a1a10');
  g.globalAlpha=.22+Math.sin(T*3)*.05;R(bx-34,by-10,36,8,'#fff0b0');g.globalAlpha=1;R(bx-1,by-12+sh,3,4,'#fff8d0');
  g.globalAlpha=.25;for(let i=0;i<3;i++){const q=(T*.6+i/3)%1;R(bx+94+q*10,by-6-q*14,4+q*6,3,'#c8c8d0')}g.globalAlpha=1}
 /* fog */
 g.globalAlpha=.14;for(let i=0;i<5;i++){const x=((T*6+i*90)%(W+120))-100;R(x,118+i*9,140,6,'#c8b8d8')}g.globalAlpha=1;
}};
if(typeof LIGHT!=='undefined')LIGHT.titlescreen=()=>({amb:.78,tint:[60,30,60],src:[[200,66,40,.35,[255,120,90]],[210,140,70,.3,[255,240,180]]]});

const TITLE_CREW={nivaan:[168,1,'phone'],corey:[184,-1,null],arjun:[200,1,'cross'],aidan:[216,-1,null],stella:[232,1,'hips'],hasan:[248,-1,'phone'],paul:[262,-1,'cross']};
title=async function(){
 closeOverlays();setHud(false);setPanel('none');busy=true;
 D=D||freshD();
 const saveD=D;D=Object.assign(freshD(),{period:8});
 const cast={};for(const id in TITLE_CREW){if((window.EDITION_CUT||[]).includes(id))continue;const [x,d,p]=TITLE_CREW[id];cast[id]=[x,d,{y:150+(x%3)*2,pose:p}]}
 scene.noFade=1;scene('titlescreen',cast,true);scene.noFade=0;
 D=saveD;
 cue('title');
 if(typeof TRANS!=='undefined'){TRANS.a=1.4;TRANS.cap=''}
 const m=$('menu');m.hidden=false;m.className='ov ttl';
 const done=Object.keys(P.done).length,total=Object.keys(MIS).length;
 m.innerHTML='<div class="ttl-l"><div class="ttl-eye">A Calling of Aidan story</div><h1 class="ttl-logo"><span>HIGH</span><span>SCHOOL</span></h1>'+
  '<div class="ttl-tag">Two weeks at Highgate High. The teachers kill kids. Everybody knows. Nobody says it out loud.</div>'+
  '<nav class="ttl-menu"></nav>'+
  '<div class="ttl-stats">'+(P.loops?'DAY '+(typeof cal==='function'?cal():P.loops)+' · '+done+'/'+total+' QUESTS · '+Object.keys(P.endings).length+' ENDINGS · '+Object.keys(P.deaths).length+' WAYS TO DIE':'')+'</div></div>'+
  '<div class="ttl-foot"><span>'+(window.EDITION==='safe'?'SAFE VERSION · ':'')+'M · Blood · Gore · Strong language</span><span>↑↓ / tap · Enter</span></div>';
 const nav=m.querySelector('.ttl-menu');const items=[];
 const add=(t,f,fs)=>{const b=document.createElement('button');b.className='ttl-b';b.innerHTML='<i>▸</i><span></span>';b.querySelector('span').textContent=t;
  b.onclick=()=>{audio();SFX.click();if(fs&&!TEST)goFullscreen(true);f()};b.onmouseenter=()=>sel(items.indexOf(b));nav.appendChild(b);items.push(b)};
 if(P.cur)add('Continue',()=>{m.hidden=true;m.className='ov';D=P.cur;busy=false;startPeriod(D.period,true)},true);
 add(P.loops?'New Day':'Start',()=>{m.hidden=true;m.className='ov';busy=false;newDay()},true);
 add('Quest Log',()=>{D=D||freshD();openQuest()});
 add('Settings',openSettings);
 add('Endings & Deaths',()=>{D=D||freshD();questTab='endings';openQuest()});
 let cur=0;function sel(i){cur=(i+items.length)%items.length;items.forEach((b,j)=>b.classList.toggle('on',j===cur))}sel(0);
 items.forEach((b,i)=>{b.style.animationDelay=(1.1+i*.09)+'s'});
 title._key=e=>{if(m.hidden||!$('quest').hidden||!$('settings').hidden)return;
  if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){e.preventDefault();sel(cur+1);SFX.blip&&SFX.blip(520)}
  else if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){e.preventDefault();sel(cur-1);SFX.blip&&SFX.blip(520)}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();items[cur].click()}};
};
document.addEventListener('keydown',e=>{if(title._key)title._key(e)},true);
{const st=document.createElement('style');st.textContent=`
#menu.ttl{background:linear-gradient(90deg,rgba(8,5,14,.82) 0%,rgba(8,5,14,.55) 34%,rgba(8,5,14,0) 62%);justify-content:center;align-items:flex-start;padding:0 0 0 6vw;pointer-events:none}
#menu.ttl>*{pointer-events:auto}
.ttl-l{display:flex;flex-direction:column;gap:10px;max-width:min(560px,86vw)}
.ttl-eye{font-size:clamp(10px,1.2vw,13px);letter-spacing:.34em;color:#e9a98e;text-transform:uppercase;opacity:0;animation:ttlIn .8s .3s forwards}
.ttl-logo{margin:0;font-weight:normal;line-height:.86;font-size:clamp(46px,10vw,124px);letter-spacing:-.02em;display:flex;flex-direction:column}
.ttl-logo span{color:#f7ebc9;text-shadow:3px 3px 0 #c8483a,6px 6px 0 #4a1a2a,9px 9px 0 #12080f;opacity:0;transform:translateY(-40px);animation:ttlDrop .55s cubic-bezier(.2,1.6,.4,1) forwards}
.ttl-logo span:nth-child(2){animation-delay:.18s;color:#ffd27a}
.ttl-tag{font-size:clamp(12px,1.4vw,15px);line-height:1.55;color:#e3cdbf;text-shadow:0 2px 0 #000;max-width:30em;opacity:0;animation:ttlIn .8s .8s forwards}
.ttl-menu{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.ttl-b{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;font-size:clamp(14px,1.8vw,19px);letter-spacing:.12em;text-transform:uppercase;color:#cbbfd8;padding:5px 12px 5px 4px;border-left:3px solid transparent;opacity:0;transform:translateX(-16px);animation:ttlSlide .45s forwards;transition:color .12s,background .12s,border-color .12s,padding .12s}
.ttl-b i{font-style:normal;color:#f08a72;opacity:0;transition:opacity .12s}
.ttl-b.on{color:#fff;background:linear-gradient(90deg,rgba(240,138,114,.28),rgba(240,138,114,0));border-left-color:#f08a72;padding-left:10px}
.ttl-b.on i{opacity:1}
.ttl-stats{font-size:11px;letter-spacing:.16em;color:#8a7a9a;margin-top:6px;opacity:0;animation:ttlIn .8s 1.5s forwards}
.ttl-foot{position:absolute;left:6vw;right:3vw;bottom:max(12px,env(safe-area-inset-bottom));display:flex;justify-content:space-between;font-size:10px;letter-spacing:.14em;color:#6a5a7a;text-transform:uppercase;opacity:0;animation:ttlIn .8s 1.8s forwards}
@keyframes ttlDrop{to{opacity:1;transform:none}}
@keyframes ttlIn{to{opacity:1}}
@keyframes ttlSlide{to{opacity:1;transform:none}}
@media (max-height:480px){.ttl-logo{font-size:clamp(34px,8vh,60px)}.ttl-tag{display:none}.ttl-l{gap:6px}}`;document.head.appendChild(st)}
