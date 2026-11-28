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
const together=()=>!!(D&&D.done&&D.done.instella&&D.done.instella!=='no');
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

/* =====================================================================
   MARCUS'S HOUSE (the party) and THE RESERVOIR, repainted.
   Kept: couch 36-134, coffee table 180-220, TV 130-210 x 22-74,
   hot-tub doors 226-316, the photos of Marcus age 4, NO SWIM sign,
   the dam 120-210, the dock 100-320 x 128-154.
   ===================================================================== */
{
const rmCache=(id,draw)=>guCache('rm_'+id,'',draw);
const rmMix=(a,b,t)=>{const A_=guRGB(a),B=guRGB(b);return`rgb(${A_[0]+(B[0]-A_[0])*t|0},${A_[1]+(B[1]-A_[1])*t|0},${A_[2]+(B[2]-A_[2])*t|0})`};
if(ROOMS.party){
 function partyPaint(){
  /* damask wallpaper, wainscot, crown moulding */
  R(0,0,W,106,'#3a2438');for(let y=8;y<80;y+=14)for(let x=((y/14)%2)*10;x<W;x+=20){R(x+8,y,4,2,'#4a3048');R(x+6,y+2,8,4,'#4a3048');R(x+8,y+6,4,2,'#4a3048');R(x+9,y+3,2,2,'#5a3a58')}
  R(0,0,W,6,'#2a1828');R(0,6,W,2,'#6a4a5a');R(0,80,W,26,'#4a2a3a');R(0,80,W,2,'#7a5a6a');for(let x=0;x<W;x+=40)R(x+4,84,32,18,'rgba(0,0,0,.15)');
  /* family photos: Marcus, age 4, in every one */
  for(let i=0;i<4;i++){const x=16+i*28,y=24+(i%2)*3;R(x,y,22,18,'#c8a868');R(x+2,y+2,18,14,['#8aa0b0','#b08a70','#90a080','#a090b0'][i]);R(x+7,y+6,6,6,'#e8c8a0');R(x+8,y+5,4,2,'#3a2a1a');R(x+8,y+9,4,1,'#c84a4a');R(x+2,y+2,18,1,'rgba(255,255,255,.25)')}
  pxc('MARCUS',70,48,'#f0e0c0');pxc('AGE 4',70,56,'#c8b8a0');
  /* a lamp with a shade, knocked crooked */
  R(118,52,2,28,'#2a2a2a');R(111,44,16,9,'#e8c890');R(112,45,14,1,'#fff0c0');R(114,78,10,3,'#2a2a2a');
  /* the big TV, karaoke */
  R(128,20,84,52,'#0a0a0a');R(130,22,80,48,'#141c2c');R(160,72,20,4,'#1a1a1a');R(150,76,40,4,'#2a1a20');
  /* sliding doors to the deck and the hot tub, night outside */
  R(224,14,94,92,'#1a1420');guGrad(16,104,'#0a1030','#2a2a5a',226,90);
  for(let i=0;i<14;i++)R(228+hsh(i+300)*86,18+hsh(i+301)*40,1,1,'#e8e8ff');R(296,22,8,8,'#f4f0d8');R(298,22,6,6,'#0a1030');
  R(226,70,90,34,'#3a2a22');for(let x=226;x<316;x+=10)R(x,70,1,34,'#2a1a14');
  R(236,78,64,22,'#4a4a52');R(238,80,60,6,'#3ac8e8');R(238,86,60,14,'#2a5a6a');for(let i=0;i<4;i++)R(242+i*14,92,8,1,'rgba(150,240,255,.5)');
  R(270,16,3,90,'#6a6a7a');R(226,16,90,1,'rgba(255,255,255,.2)');g.globalAlpha=.12;R(230,18,10,84,'#fff');R(276,18,6,84,'#fff');g.globalAlpha=1;
  /* string lights across the ceiling */
  for(let x=0;x<W;x+=2){const y=10+Math.sin(x/320*Math.PI*3)*4;R(x,y,2,1,'#2a2a2a')}
  /* floor: hardwood with a rug */
  R(0,106,W,6,'#2a1820');guGrad(112,180,'#6a4a34','#4a3224');
  for(let y=112;y<180;y+=8)for(let x=((y/8)%3)*14;x<W;x+=42){R(x,y,41,1,'rgba(0,0,0,.2)');R(x,y+1,41,1,'rgba(255,220,180,.05)')}
  R(24,140,160,30,'#6a2a3a');R(28,143,152,24,'#7a3a4a');for(let x=30;x<178;x+=8)R(x,154,4,2,'#c8a050');R(24,140,160,1,'rgba(255,255,255,.1)');
  /* the couch */
  R(36,112,98,8,'#3a2050');R(36,118,98,18,'#4a2a5a');R(36,114,6,22,'#3a2050');R(128,114,6,22,'#3a2050');for(let i=0;i<3;i++)R(44+i*28,118,26,6,'#5a3a6a');R(40,136,3,4,'#1a1a1a');R(127,136,3,4,'#1a1a1a');
  /* the coffee table, covered in cups */
  R(178,122,44,4,'#3a2a20');R(178,122,44,1,'#5a4a3a');R(182,126,2,12,'#2a1a14');R(216,126,2,12,'#2a1a14');
  for(let i=0;i<6;i++)R(184+i*6,117,4,5,'#c02030');R(185,117,2,1,'#f05060');
  /* the snack table by the doors, chips everywhere */
  R(248,128,56,4,'#e8e8e8');R(250,132,2,10,'#8a8a8a');R(300,132,2,10,'#8a8a8a');R(256,122,14,6,'#f0c040');R(276,122,10,6,'#e06a3a');R(290,120,8,8,'#6a3a2a');
  for(let i=0;i<26;i++)R(hsh(i+40)*W,148+hsh(i+41)*28,2,1,'#e8c04a');
  for(let i=0;i<10;i++){const x=hsh(i+60)*W,y=150+hsh(i+61)*26;R(x,y,3,4,'#c02030');R(x,y,3,1,'#f05060')}
 }
 ROOMS.party.bg=function(){rmCache('party2',partyPaint);
  /* karaoke screen cycles, lyrics bounce */
  const k=Math.floor(T*.7)%3;R(132,24,76,44,['#2a3a8a','#8a2a5a','#2a7a5a'][k]);px('KARAOKE',150,30,'#fff');
  const lyr=['TOTAL ECLIPSE','OF THE PARTY','SING IT MARCUS'][k];pxc(lyr,170,46,'#f0e0a0');R(140+((T*30)%56),56,4,4,'#f0e040');
  /* string lights twinkle */
  for(let i=0;i<20;i++){const x=8+i*16,y=11+Math.sin(x/320*Math.PI*3)*4,c=['#ff4a7a','#4ac8ff','#f0e040','#6aff8a'][i%4];R(x,y,2,2,c);if(Math.sin(T*3+i*1.3)>.3){g.globalAlpha=.18;R(x-4,y-3,10,8,c);g.globalAlpha=1}}
  /* disco ball dots sweep the walls */
  R(170,0,1,10,'#888');R(166,10,9,9,'#c8c8d0');R(168,12,2,2,'#fff');
  for(let i=0;i<14;i++){const a=T*.8+i*.45,x=170+Math.cos(a)*(60+i*9),y=40+Math.sin(a*1.3+i)*30;if(x>0&&x<224){g.globalAlpha=.35;R(x,y,2,2,['#fff','#ffb0d0','#b0e0ff'][i%3]);g.globalAlpha=1}}
  /* hot tub steam */
  g.globalAlpha=.3;for(let i=0;i<6;i++){const q=(T*.4+i/6)%1;R(240+i*10+Math.sin(T+i)*3,78-q*50,6,3,'#d8e8f0')}g.globalAlpha=1;
  /* bass: the cups on the table hop */
  if(Math.sin(T*8)>.85)for(let i=0;i<6;i++)R(184+i*6,116,4,1,'#f05060')};
 if(typeof LIGHT!=='undefined')LIGHT.party={amb:.52,tint:[60,20,70],src:[[170,46,110,.45,[120,170,255]],[270,80,80,.35,[120,220,255]],[119,48,50,.35,[255,210,150]],[60,12,90,.2,[255,120,180]]],wallAO:1};
}
if(ROOMS.lake){
 function lakePaint(){
  /* sunset sky, clouds lit from below */
  guGrad(0,62,'#3a4a7a','#f0b080');guGrad(36,62,'#f0a070','#f8d8a0');
  for(const [x,y,w] of[[20,14,60],[110,22,80],[220,10,50],[260,30,46]]){R(x,y,w,3,'#c88090');R(x+4,y+3,w-8,2,'#f0a080');R(x+10,y-2,w-24,2,'#a06a8a')}
  /* far hills, three layers */
  for(let x=0;x<W;x++){const h1=Math.sin(x*.02)*6+Math.sin(x*.07)*3;R(x,44+h1,1,20,'#8a7a9a');const h2=Math.sin(x*.035+2)*5+Math.sin(x*.11)*2;R(x,50+h2,1,14,'#6a6a7a')}
  /* the dam */
  R(118,46,94,16,'#a8a4a0');R(118,46,94,2,'#d8d0c8');for(let i=0;i<6;i++){R(122+i*15,50,10,10,'#7a7672');R(122+i*15,58,10,2,'#5a8ab0')}R(116,44,4,18,'#8a8682');R(210,44,4,18,'#8a8682');
  /* water: deep at the bottom, sky reflected at the top */
  guGrad(62,124,'#e8a888','#2a4a6a');
  /* the sun's reflection column */
  g.globalAlpha=.35;for(let y=64;y<120;y+=3)R(250-(y-62)*.1,y,14+(y-62)*.2,1,'#fff0c0');g.globalAlpha=1;
  /* reeds and cattails on the left */
  for(let i=0;i<30;i++){const x=hsh(i+20)*90,hh=10+hsh(i)*16;R(x,124-hh,1,hh,'#4a5a2a');if(i%3===0){R(x-1,124-hh-4,3,5,'#6a4a2a')}}
  /* the bank: grass, then mud */
  R(0,122,W,10,'#5a6a3a');for(let x=0;x<W;x+=2)R(x,121-hsh(x)*3,1,4,'#6a8a4a');guGrad(130,180,'#5a5032','#3a3424');
  for(let i=0;i<30;i++)R(hsh(i+90)*W,134+hsh(i+91)*44,2,1,'rgba(255,230,180,.15)');
  /* the dock */
  R(100,128,220,26,'#6a4a2a');for(let i=0;i<220;i+=10){R(100+i,128,9,26,rmMix('#8a6a42','#7a5a38',hsh(i)));R(100+i,128,9,1,'#c8a070')}
  R(100,154,220,2,'#3a2a18');for(let i=0;i<5;i++){R(110+i*48,154,4,20,'#4a3424');R(110+i*48,170,4,4,'rgba(80,110,140,.5)')}
  R(300,118,3,14,'#4a3424');R(300,116,6,3,'#c84a3a');/* a mooring post with a red cap */
  /* the NO SWIM sign */
  R(28,98,26,18,'#e8e4da');R(28,98,26,1,'#fff');R(29,99,24,16,'#f4f0e6');pxc('NO',41,101,'#c03030');pxc('SWIM',41,108,'#c03030');R(40,116,2,14,'#6a4a2a');
  /* a lifebuoy on the dock */
  R(236,132,12,10,'#e84a3a');R(239,135,6,4,'#6a4a2a');R(236,136,12,2,'#f4f0e6');
 }
 ROOMS.lake.bg=function(){rmCache('lake2',lakePaint);
  /* the sun sinking a little, then not */
  R(250,14,14,14,'#fff0c0');g.globalAlpha=.25;R(244,8,26,26,'#fff0c0');g.globalAlpha=1;
  /* ripples drift */
  for(let y=66;y<122;y+=4){const o=Math.sin(T*1.1+y*.3)*5;g.globalAlpha=y<84?.5:.3;for(let x=(y*7)%24;x<W;x+=30)R(x+o,y,8,1,y<84?'#f8d8c0':'#8ab0c8');g.globalAlpha=1}
  /* a fish jumps now and then */
  {const k=(T%9)/9;if(k<.08){const q=k/.08;R(180+q*10,90-Math.sin(q*Math.PI)*10,3,2,'#c8d0d8')}if(k>.08&&k<.2){const q=(k-.08)/.12;g.globalAlpha=.5*(1-q);R(190-q*8,92,q*16+2,1,'#fff');g.globalAlpha=1}}
  /* birds, reeds swaying */
  for(let i=0;i<3;i++){const x=((T*6+i*110)%380)-30,y=20+i*6,f=Math.sin(T*8+i)>0;R(x,y,3,1,'#2a2a3a');R(x-1,y+(f?-1:1),1,1,'#2a2a3a');R(x+3,y+(f?-1:1),1,1,'#2a2a3a')}
  for(let i=0;i<8;i++){const x=hsh(i+20)*90,s=Math.round(Math.sin(T*1.4+i)*1);R(x+s,100+hsh(i)*8,1,3,'#5a6a3a')}};
 if(typeof LIGHT!=='undefined')LIGHT.lake={amb:.9,tint:[90,60,40],src:[[256,22,220,.32,[255,210,160]]]};
}
}

/* =====================================================================
   CLASSROOMS + BATHROOM: small living touches over the existing paint
   ===================================================================== */
{
const LIVE={
 english:{clock:[42,7],win:[116,28,40,22]},
 maths:{clock:[201,7],win:[278,39,36,13]},
 history:{clock:[42,7]},
 science:{clock:[42,7]}
};
for(const r of Object.keys(LIVE)){if(!ROOMS[r])continue;const L=LIVE[r],ob=ROOMS[r].bg;ROOMS[r].bg=function(){ob.apply(this,arguments);
 try{
  if(L.clock){const [cx,cy]=L.clock,a=(T%60)/60*Math.PI*2-Math.PI/2;R(Math.round(cx+Math.cos(a)*2),Math.round(cy+Math.sin(a)*2),1,1,'#c02020')}
  if(L.win){const [wx,wy,ww,wh]=L.win;
   for(let i=0;i<2;i++){const x=wx+((T*2+i*30)%(ww+12))-6;g.save();g.beginPath();g.rect(wx,wy,ww,wh);g.clip();R(x,wy+3+i*5,8,2,'rgba(255,255,255,.75)');g.restore()}
   for(let i=0;i<8;i++){const q=(T*.04+i/8)%1;g.globalAlpha=.25*(1-q);R(wx+hsh(i+r.length)*ww-q*20,wy+wh+q*60,1,1,'#fff8e0');g.globalAlpha=1}}
  if(Math.sin(T*17+r.length)>.985){g.globalAlpha=.12;R(0,0,W,112,'#000');g.globalAlpha=1}
 }catch(e){}}}
if(ROOMS.toilets){const ob=ROOMS.toilets.bg;ROOMS.toilets.bg=function(){ob.apply(this,arguments);
 try{for(const x of[177,197,217]){const q=(T*.7+x*.013)%1;if(q<.6)R(x,131+q*10,1,2,'rgba(170,210,240,.9)');if(q>.6&&q<.7){g.globalAlpha=.5;R(x-2,138,5,1,'#cfeaff');g.globalAlpha=1}}
  if(Math.sin(T*9)>.93){g.globalAlpha=.18;R(0,0,W,112,'#002')}g.globalAlpha=1}catch(e){}}}
}
