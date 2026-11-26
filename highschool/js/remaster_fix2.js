'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — fixes from playtesting
   • Strike Three (steal_stella) can't start until Sean and Stella are
     actually together THIS run (In Person finished).
   • The courtyard moves downstairs: a glass double door in the Science
     Wing (ground floor, right past the Front Hall), with signs to it from
     the Main Corridor and the Front Hall. The old upstairs door is gone.
   • The courtyard is repainted.
   ===================================================================== */
{
const rmCache=(id,draw)=>guCache('rm_'+id,'',draw);
const rmMix=(a,b,t)=>{const A_=guRGB(a),B=guRGB(b);return`rgb(${A_[0]+(B[0]-A_[0])*t|0},${A_[1]+(B[1]-A_[1])*t|0},${A_[2]+(B[2]-A_[2])*t|0})`};
/* ---- Strike Three gate ---- */
const together=()=>!!(D&&D.done&&D.done.instella);
for(const h of HOOKS)if(h.mis==='steal_stella'){const c=h.cond;h.cond=()=>together()&&(!c||c())}
if(MIS.steal_stella&&MIS.steal_stella.tips)MIS.steal_stella.tips=['First, Sean and Stella have to be together (finish In Person). Then: break or lunch, the field. Stella is venting.'].concat(MIS.steal_stella.tips.slice(1));

/* ---- the courtyard door moves to the Science Wing ---- */
if(WORLD.wing_arts)WORLD.wing_arts.doors=WORLD.wing_arts.doors.filter(d=>d.to!=='courtyard');
if(WORLD.wing_sci&&!WORLD.wing_sci.doors.some(d=>d.to==='courtyard'))WORLD.wing_sci.doors.unshift({x:40,to:'courtyard',label:'COURTYARD',glass:1});
if(typeof DOORS!=='undefined')DOORS.courtyard={hall:'wing_sci',x:40};
{const _hd=hpDoor;hpDoor=function(d,T_){if(!d.glass)return _hd(d,T_);
 const x=d.x;
 /* a wide glass double door, daylight and green through it */
 R(x-21,29,42,79,'#4a5a52');R(x-21,29,42,1,'rgba(255,255,255,.3)');
 guGrad(31,106,'#bfe4f4','#8ac08a',x-19,38);
 for(let i=0;i<5;i++)R(x-18+i*8,60-(i%2)*6,6,46,i%2?'#4a8a3a':'#5a9a4a');R(x-19,88,38,18,'#c8c0a8');
 g.globalAlpha=.35;R(x-17,33,4,70,'#fff');R(x+3,33,3,70,'#fff');g.globalAlpha=1;
 R(x-1,31,2,75,'#4a5a52');R(x-19,31,38,2,'#4a5a52');R(x-5,64,3,8,'#c8c8d0');R(x+2,64,3,8,'#c8c8d0');
 /* the sign over it */
 R(x-20,20,40,9,'#2a6a3a');R(x-20,20,40,1,'#5aa06a');pxc('COURTYARD',x,22,'#f4f0e0');
 /* daylight on the floor */
 g.globalAlpha=.12;for(let i=0;i<24;i++)R(x-18-i*.6,108+i,36+i*1.2,1,'#fff8d8');g.globalAlpha=1}}
/* signs pointing there */
const SIGN={corridor:274,hallb:262};
for(const r of Object.keys(SIGN)){if(!ROOMS[r])continue;const ob=ROOMS[r].bg;ROOMS[r].bg=function(){ob.apply(this,arguments);
 if(D&&D.weekend)return;const x=SIGN[r];
 R(x+2,0,1,3,'#3a3a3a');R(x+40,0,1,3,'#3a3a3a');R(x,3,44,10,'#2a6a3a');R(x,3,44,1,'#5aa06a');R(x,12,44,1,'#1a4a2a');
 px('COURTYARD',x+3,5,'#f4f0e0');R(x+38,7,3,1,'#f4f0e0');R(x+39,6,1,3,'#f4f0e0');R(x+40,7,1,1,'#f4f0e0')}}

/* ---- the courtyard, repainted ---- */
if(ROOMS.courtyard){
 function cyPaint(){
  /* sky */
  guGrad(0,40,'#7ab4e4','#c4e0f2');
  for(const [x,y,w] of[[30,8,40],[150,14,56],[250,6,34]]){R(x,y,w,5,'#ffffff');R(x+6,y-3,w-16,4,'#ffffff');R(x,y+4,w,1,'#d8e8f4')}
  /* the school on three sides: brick, windows with sills and reflections */
  R(0,26,W,86,'#8a3a32');for(let y=28;y<110;y+=4)for(let x=(y%8?0:6);x<W;x+=12){R(x,y,11,3,rmMix('#9a4438','#a84c3e',hsh(x*.13+y)));R(x,y+3,11,1,'rgba(0,0,0,.12)')}
  R(0,26,W,3,'#6a6a6e');R(0,29,W,1,'rgba(0,0,0,.3)');
  for(let r=0;r<2;r++)for(let c=0;c<8;c++){const x=10+c*40,y=36+r*32;if(x>184&&x<240)continue;
   R(x-1,y-1,26,22,'#e8e0d0');R(x,y,24,20,'#2a3a4a');guGrad(y+1,y+19,'#a8cce4','#6a92b4',x+1,22);
   R(x+12,y,1,20,'#e8e0d0');R(x,y+10,24,1,'#e8e0d0');g.globalAlpha=.4;R(x+2,y+2,3,7,'#fff');R(x+14,y+12,3,6,'#fff');g.globalAlpha=1;
   if(hsh(c+r*9)>.6){R(x+1,y+1,11,7,'#e8d8a8');for(let i=0;i<7;i+=2)R(x+1,y+1+i,11,1,'#c8b888')}
   if(hsh(c*3+r)>.75)R(x+3,y+14,4,5,'#d86a3a');
   R(x-2,y+20,28,2,'#c8c0b0')}
  /* ivy climbing the brick */
  for(const [x0,top] of[[4,40],[300,34],[160,60]]){for(let i=0;i<70;i++){const yy=top+hsh(i+x0)*(110-top),xx=x0+Math.sin(yy*.15+x0)*8+hsh(i*2+x0)*14;R(xx,yy,3,2,hsh(i*5)>.5?'#3a7a3a':'#4e9444')}}
  /* the covered walkway along the back */
  R(0,96,W,4,'#5a5a5e');for(let x=6;x<W;x+=46)R(x,100,4,12,'#7a7a7e');
  /* paving: big stones, moss in the joints, worn path */
  guGrad(112,180,'#c8bea8','#a89e88');
  for(let y=112,r=0;y<180;y+=11,r++)for(let x=-((r%2)*13);x<W;x+=26){const t=hsh(x*.7+y);R(x+1,y+1,24,9,rmMix('#cfc5ae','#b8ae96',t));R(x+1,y+1,24,1,'rgba(255,255,255,.18)');R(x,y,26,1,'#7a8a5a');R(x,y,1,11,'#7a8a5a')}
  g.globalAlpha=.12;R(120,112,80,68,'#6a5a48');g.globalAlpha=1;
  for(let i=0;i<6;i++){g.globalAlpha=.22*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
  /* planters with flowers (the fetch spots) */
  for(const x of[60,110,200,240]){R(x-12,104,24,10,'#7a5a3a');R(x-12,104,24,2,'#9a7a52');R(x-11,106,22,1,'rgba(0,0,0,.25)');
   for(let i=0;i<9;i++){const fx=x-10+i*2.4,fh=4+hsh(i+x)*6;R(fx,104-fh,1,fh,'#4a8a3a');R(fx-1,103-fh,3,2,['#e85a7a','#f0d040','#f4f0f0','#b07ae0'][(i+x)%4])}}
  /* trees, layered round canopies */
  for(const x of[28,288]){R(x-3,52,7,60,'#5a3a22');R(x-1,52,2,60,'#7a5232');R(x-8,108,17,4,'#4a3020');
   for(const [dx,dy,r,c] of[[-14,30,16,'#2e6a2e'],[12,34,15,'#2e6a2e'],[0,22,18,'#3a7e36'],[-8,40,13,'#448a3c'],[10,44,12,'#448a3c'],[2,32,12,'#56a046']])for(let yy=-r;yy<=r;yy+=2){const w_=Math.sqrt(r*r-yy*yy)*2|0;R(x+dx-w_/2,dy+yy,w_,2,c)}
   for(let i=0;i<18;i++)R(x-20+hsh(i+x)*40,16+hsh(i*3+x)*36,2,1,'#7ac060')}
  /* the founder, on his plinth */
  R(194,58,36,52,'#8a8a90');R(192,56,40,4,'#aeaeb4');R(192,106,40,4,'#6a6a70');R(196,60,2,48,'rgba(255,255,255,.15)');R(226,60,2,48,'rgba(0,0,0,.18)');
  R(200,84,24,10,'#6a6a70');pxc('FOUNDER',212,86,'#d8d8dc');pxc('1962',212,98,'#4a4a52');
  R(205,34,14,22,'#7e7e86');R(207,22,10,12,'#7e7e86');R(208,24,8,2,'#9a9aa2');R(203,36,4,14,'#6e6e76');R(219,28,4,10,'#6e6e76');R(219,24,4,4,'#7e7e86');R(205,56,5,2,'#5e5e66');R(214,56,5,2,'#5e5e66');
  R(206,36,2,20,'rgba(255,255,255,.18)');R(212,20,6,2,'#ffffff');/* a pigeon's contribution */
  for(let i=0;i<8;i++)R(207+hsh(i)*10,26+hsh(i+1)*30,1,2,'rgba(240,240,230,.6)');
  /* the fountain basin */
  R(82,100,80,14,'#9a9aa2');R(84,98,76,4,'#c4c4cc');R(86,102,72,8,'#3a7ab0');R(86,102,72,1,'#8ac8f0');R(84,110,76,4,'#7a7a82');
  R(118,82,8,20,'#a8a8b0');R(120,82,2,20,'#d0d0d8');R(110,80,24,3,'#c4c4cc');R(112,83,20,1,'rgba(0,0,0,.2)');
  for(let i=0;i<6;i++)R(90+hsh(i+7)*60,104+hsh(i+8)*4,2,1,'#e8c040');/* coins */
  /* benches (on top of the paving this time) */
  for(const x of[20,250]){R(x,122,50,3,'#9a7450');R(x,122,50,1,'#c09a6a');R(x,128,50,4,'#8a6a48');R(x,128,50,1,'#b08a60');R(x+4,132,3,10,'#3a3a3a');R(x+43,132,3,10,'#3a3a3a');R(x+2,142,48,1,'rgba(0,0,0,.18)')}
  /* dappled shade under the trees */
  for(const x of[28,288])for(let i=0;i<14;i++){g.globalAlpha=.14;R(x-30+hsh(i+x*2)*60,114+hsh(i*7+x)*24,8,3,'#1a3a1a')}g.globalAlpha=1;
  /* edges of the grass at the front */
  R(0,172,W,8,'#4e9444');for(let x=0;x<W;x+=3)R(x,170-hsh(x)*3,1,4,'#5aa04a');
 }
 ROOMS.courtyard.bg=function(){rmCache('courtyard2',cyPaint);
  /* fountain spray and ripples */
  for(let i=0;i<16;i++){const q=(T*1.3+i/16)%1,a=i*.4;R(122+Math.cos(a)*q*18,81-Math.sin(q*3.14)*14+q*20,1,2,'rgba(200,235,255,.9)')}
  for(let i=0;i<3;i++){const q=(T*.6+i/3)%1;g.globalAlpha=.4*(1-q);R(122-q*30,104,q*60,1,'#cfeaff');g.globalAlpha=1}
  /* clouds drift, leaves sway and fall */
  for(let i=0;i<2;i++){const x=((T*3+i*170)%380)-40;R(x,4+i*10,26,4,'rgba(255,255,255,.7)')}
  for(const x of[28,288]){const s=Math.round(Math.sin(T*1.3+x)*1.5);g.globalAlpha=.15;R(x-14+s,16,28,2,'#ffffff');g.globalAlpha=1}
  for(let i=0;i<4;i++){const q=(T*.12+i/4)%1,lx=(i%2?288:28)+Math.sin(T*2+i)*10;R(lx,40+q*130,2,1,'#8ab050')}
  {const k=((T%14)/14);if(k<.4){const x=360-k/.4*400,f=Math.sin(T*12)>0;R(x,20,3,1,'#2a2a2a');R(x-1,19+(f?0:2),1,1,'#2a2a2a');R(x+3,19+(f?0:2),1,1,'#2a2a2a')}}};
 if(typeof LIGHT!=='undefined')LIGHT.courtyard=()=>({amb:1,tint:[70,60,30],src:[[160,10,220,.18,[255,245,215]]]});
}
}
