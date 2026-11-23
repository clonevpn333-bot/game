'use strict';
/* =====================================================================
   HIGHSCHOOL — FAIR CITY MALL, REDONE
   The food court is two floors now: shops and shoppers upstairs behind
   a glass rail, a skylight, four lit-up food stalls with staff behind
   the counters, an escalator that runs, a fountain, tables and
   umbrellas, a shiny floor. The arcade is properly dark and loud: neon
   trim, cabinets whose screens play, a dance machine, a claw machine
   full of plushies, a prize counter, spotlights sweeping the carpet.
   The roof is dusk over the city: lamp posts, parked cars, puddles,
   pigeons, graffiti, and a cart that rolls by itself.
   ===================================================================== */
const MALL_N=n=>hsh(n);
ROOMS.foodcourt.bg=function(){
 guCache('fc2','',()=>{
  /* skylight ceiling */
  R(0,0,W,12,'#2a2440');for(let x=0;x<W;x+=40){R(x+4,1,32,9,'#5a7aa8');R(x+4,1,32,1,'#8ab0d8');R(x+19,1,2,9,'#2a2440')}
  /* upper floor: shopfronts behind a glass rail */
  R(0,12,W,34,'#3a3450');
  const shops=[['SHOE BOX','#c83a5a'],['GAMEZ','#3a8ac8'],['CLAIRE’S-ISH','#c860c8'],['BOOKS','#5aa05a'],['VAPE?','#7a7a7a'],['PHONE FIX','#e8a030']];
  shops.forEach(([n,c],i)=>{const x=4+i*53;R(x,14,48,4,c);pxc(n,x+24,15,'#fff');R(x,18,48,22,'#1a1828');R(x+2,20,44,18,'#4a5a7a');R(x+2,20,44,1,'#8aa0c0');for(let k=0;k<4;k++)R(x+6+k*10,30,6,8,['#e8c0a0','#c83a3a','#3a5a8a','#f0d070'][(i+k)%4])});
  R(0,40,W,3,'#8a8aa0');R(0,43,W,6,'rgba(170,210,240,.25)');for(let x=0;x<W;x+=16)R(x,40,1,9,'#6a6a80');R(0,49,W,3,'#2a2438');
  /* lower floor wall */
  R(0,52,W,60,'#4a4258');for(let y=56;y<108;y+=6)R(0,y,W,1,'rgba(0,0,0,.08)');
  /* food stalls */
  const stalls=[[6,'BURGER BARN','#c8402a','#f0c040'],[84,'NOODLE BOX','#e8a020','#c8402a'],[214,'BUBBLE T','#9a5ad0','#f4c8e8'],[260,'PIZZA PIT','#2a8a4a','#f0f0e0']];
  for(const [x,n,c,c2] of stalls){const w=x===214?44:70;
   R(x,54,w,10,c);R(x,54,w,1,'rgba(255,255,255,.3)');pxc(n,x+w/2,57,c2);
   R(x,64,w,26,'#2a2230');R(x+2,66,w-4,12,'#141018');for(let k=0;k<3;k++){R(x+4+k*((w-8)/3),67,(w-8)/3-2,10,'#f4ecd8');R(x+6+k*((w-8)/3),69,6,1,'#5a4a3a');R(x+6+k*((w-8)/3),72,10,1,'#5a4a3a')}
   R(x,90,w,4,'#b8b0a0');R(x,94,w,18,c);R(x,94,w,1,'rgba(255,255,255,.25)');for(let k=4;k<w-4;k+=12)R(x+k,98,8,10,'rgba(0,0,0,.15)')}
  /* escalator housing in the middle */
  R(154,52,56,60,'#3a3448');R(158,48,4,64,'#8a8aa0');R(204,48,4,64,'#8a8aa0');R(162,50,42,62,'#24202e');pxc('UP',183,56,'#9adcff');
  /* plants */
  for(const x of[78,146]){R(x,96,10,16,'#7a5a3a');R(x+1,96,8,2,'#9a7a5a');for(let i=0;i<5;i++)R(x-3+i*3,82+(i%2)*3,4,14,'#3a8a4a')}
  /* floor: big shiny tiles */
  for(let y=112,r=0;y<H;y+=12,r++)for(let x=-((r%2)*16);x<W;x+=32){R(x,y,16,12,'#cfc6d8');R(x+16,y,16,12,'#bdb4c8');R(x,y,32,1,'rgba(0,0,0,.08)')}
  g.globalAlpha=.08;for(const [x,,c] of stalls)R(x,112,60,30,c);g.globalAlpha=1;
  for(let i=0;i<6;i++){g.globalAlpha=.25*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
  /* fountain */
  R(120,132,80,10,'#8a8aa0');R(122,130,76,4,'#a8a8c0');R(124,134,72,6,'#5aa0d8');R(156,118,8,16,'#a8a8c0');R(152,116,16,3,'#c8c8e0');
  /* tables and umbrellas */
  for(const x of[30,268]){R(x-10,142,20,3,'#e8e0d0');R(x-1,145,2,14,'#8a8a8a');R(x-8,158,16,2,'#6a6a6a');R(x,110,1,32,'#8a8a8a');for(let i=0;i<5;i++)R(x-14+i*2,106+Math.abs(2-i),28-i*4,2,i%2?'#e8402a':'#f4f0e6')}
  R(10,150,7,9,'#f0d040');pxc('!',13,151,'#2a2a2a');
 });
 /* live: shoppers upstairs, skylight light, escalator, fountain, staff, neon */
 for(let i=0;i<5;i++){const sp=10+i*3,x=((T*sp+i*90)%380)-30,d=i%2?1:-1,xx=d>0?x:340-x,leg=Math.sin(T*10+i)>0?1:0;R(xx,32,4,8,['#5a3a6a','#3a5a3a','#6a3a3a','#3a4a7a','#7a6a3a'][i]);R(xx,29,4,3,['#e8c0a0','#c89068','#a87048','#f0d0b8','#7a5034'][i]);R(xx+leg,40,1,2,'#1a1a1a');R(xx+3-leg,40,1,2,'#1a1a1a')}
 g.globalAlpha=.06;for(let i=0;i<8;i++){const x=i*40+20;for(let y=12;y<112;y+=4)R(x-4+(y-12)*.18,y,10,4,'#dfeeff')}g.globalAlpha=1;
 for(let i=0;i<9;i++){const q=(T*.25+i/9)%1;const x=163+q*36,y=108-q*58;R(x,y,8,2,'#8a8a92');R(x,y,8,1,'#b8b8c0')}
 R(160,48,46,2,'#5a5a70');g.globalAlpha=.7;R(160+((T*20)%46),48,4,2,'#9adcff');g.globalAlpha=1;
 for(let i=0;i<14;i++){const q=(T*1.4+i/14)%1,a=i*.45;R(160+Math.cos(a)*q*18,118-Math.sin(q*3.14)*14,1,2,'rgba(190,230,255,.85)')}
 g.globalAlpha=.4;R(124+((T*12)%60),136,10,1,'#fff');g.globalAlpha=1;
 for(const [x,c] of[[40,'#f0c040'],[118,'#c8402a'],[236,'#f4c8e8'],[294,'#f0f0e0']]){const b=Math.sin(T*2+x)>0?1:0;R(x-3,80+b,6,8,'#f4f0e6');R(x-2,77+b,4,3,'#e8c0a0');R(x-3,76+b,6,1,c)}
 if(Math.sin(T*17)>-.85){g.globalAlpha=.25;R(214,54,44,10,'#f4c8e8');g.globalAlpha=1}
 for(const x of[30,268]){const s=Math.round(Math.sin(T*1.2+x));R(x-14+s,106,28,1,'rgba(255,255,255,.2)')}
};
LIGHT.foodcourt=()=>({amb:.92,tint:[60,40,80],src:[[160,10,200,.25,[220,235,255]],[40,80,60,.25,[255,190,90]],[118,80,60,.2,[255,210,120]],[236,80,50,.25,[230,150,255]]]});

ROOMS.arcade.bg=function(){
 guCache('ar2','',()=>{
  R(0,0,W,112,'#120e1e');for(let y=0;y<112;y+=8)R(0,y,W,1,'rgba(255,255,255,.02)');
  R(0,0,W,10,'#0a0814');for(let x=10;x<W;x+=50){R(x,8,30,3,'#2a2438');R(x+12,10,6,4,'#3a3448')}
  /* cabinets */
  const cab=(x,c,name)=>{R(x,38,28,74,c);R(x+1,39,26,1,'rgba(255,255,255,.25)');R(x+2,40,24,8,'#0a0a10');pxc(name,x+14,42,'#fff');R(x+3,50,22,22,'#1a1a24');R(x+3,74,22,10,'#2a2a34');R(x+7,77,3,3,'#e04040');R(x+14,77,3,3,'#40c0e0');R(x+19,78,2,5,'#2a2a2a');R(x+18,77,4,2,'#c8c8c8');R(x+4,90,20,6,'#1a1a24');R(x+12,92,4,2,'#c8a030');R(x+26,40,2,72,'rgba(0,0,0,.35)')};
  [['#c8303a','ZAP'],['#3a60d0','KONG'],['#30a050','RACE'],['#a040c0','FIGHT'],['#d08a20','PAC']].forEach(([c,n],i)=>cab(8+i*32,c,n));
  /* dance machine */
  R(172,30,56,82,'#2a2438');R(176,34,48,22,'#1a1a24');pxc('DANCE!',200,58,'#ff60c0');R(170,96,60,16,'#3a3448');for(let i=0;i<4;i++)R(174+i*14,99,12,10,'#2a2a34');
  /* claw machine */
  R(238,26,40,86,'#d0306a');R(240,28,36,6,'#f060a0');pxc('CLAW',258,29,'#fff');R(242,36,32,46,'#a8d8f0');g.globalAlpha=.6;R(242,36,32,46,'#1a2a3a');g.globalAlpha=1;
  for(let i=0;i<10;i++)R(244+(i%5)*6,70+Math.floor(i/5)*5,6,6,['#f0d040','#f08aa0','#8ae0a0','#a0a0f0','#f0a060'][i%5]);R(242,84,32,20,'#a02050');R(246,88,8,8,'#1a1a1a');
  /* prize counter */
  R(284,46,36,66,'#3a3448');R(286,48,32,30,'#1a1a24');for(let i=0;i<8;i++)R(288+(i%4)*7,50+Math.floor(i/4)*10,5,7,['#f0d040','#f08aa0','#8ae0a0','#a0a0f0'][i%4]);pxc('PRIZES',302,80,'#f0d040');R(284,88,36,24,'#5a3a6a');
  /* carpet */
  R(0,112,W,68,'#1a1030');for(let i=0;i<120;i++){const x=MALL_N(i)*W,y=114+MALL_N(i*3)*64;R(x,y,1,1,['#5a3a9a','#3a5a9a','#9a3a7a'][i%3])}
  for(let i=0;i<10;i++){const x=MALL_N(i*5)*W,y=118+MALL_N(i*7)*56;R(x-2,y,5,1,'#4a2a8a');R(x,y-2,1,5,'#4a2a8a')}
  for(let i=0;i<6;i++){g.globalAlpha=.3*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
 });
 /* live */
 const cols=['#ff4a6a','#4aff9a','#4a9aff','#ffd24a','#d24aff'];
 for(let i=0;i<5;i++){const x=11+i*32,y=50;g.save();g.beginPath();g.rect(x,y,22,22);g.clip();R(x,y,22,22,'#0a0a18');for(let k=0;k<5;k++)R(x+((T*18*(k+1)+i*13)%30)-4,y+k*4+1,5,3,cols[(i+k)%5]);if(i===4){const px=x+((T*12)%26)-2;R(px,y+10,5,5,'#ffd24a');for(let d=0;d<4;d++)R(x+2+d*6,y+12,1,1,'#fff')}g.restore();g.globalAlpha=.12;R(x-4,y+22,30,40,cols[i]);g.globalAlpha=1}
 {g.save();g.beginPath();g.rect(176,34,48,22);g.clip();R(176,34,48,22,'#100818');for(let i=0;i<4;i++){const q=(T*.8+i*.25)%1;R(180+i*11,56-q*24,8,5,['#ff60c0','#60c0ff','#ffd24a','#60ff9a'][i])}R(176,38,48,1,'#ffffff');g.restore()}
 for(let i=0;i<4;i++){if(Math.sin(T*6+i*1.6)>.3)R(175+i*14,100,10,8,['#ff60c0','#60c0ff','#ffd24a','#60ff9a'][i])}
 {const cx=246+((Math.sin(T*.7)+1)/2)*24,cy=40+Math.max(0,Math.sin(T*.5))*24;R(cx+3,36,1,cy-36,'#e8e8e8');R(cx,cy,7,2,'#e8e8e8');R(cx,cy+2,1,3,'#e8e8e8');R(cx+6,cy+2,1,3,'#e8e8e8')}
 const neon=(x,y,w,c,ph)=>{const on=Math.sin(T*1.5+ph)>-.9&&!(Math.sin(T*31+ph)>.97);g.globalAlpha=on?1:.35;R(x,y,w,1,c);g.globalAlpha=on?.18:.05;R(x,y-2,w,5,c);g.globalAlpha=1};
 neon(0,24,170,'#ff40c0',0);neon(0,33,170,'#40d0ff',2);neon(284,42,36,'#ffd040',4);
 for(let i=0;i<3;i++){const a=Math.sin(T*.6+i*2.1),x=60+i*100+a*60;g.globalAlpha=.08;for(let y=10;y<180;y+=3)R(x-(y-10)*.12,y,10+(y-10)*.24,3,['#ff40c0','#40d0ff','#ffd040'][i]);g.globalAlpha=1}
 for(let i=0;i<24;i++)if(Math.sin(T*3+i*7)>.75)R(MALL_N(i*11)*W,116+MALL_N(i*13)*60,1,1,'#ff80e0');
};
LIGHT.arcade=()=>({amb:.6,tint:[40,10,70],src:[[90,60,120,.35,[160,90,255]],[200,50,60,.35,[255,90,200]],[258,60,50,.3,[255,120,180]],[302,70,40,.3,[255,220,90]]]});

ROOMS.carpark.bg=function(){
 guCache('cp2','',()=>{
  const sky=['#2a1a40','#3a2050','#5a2a58','#8a3a58','#c0564e','#e88a52','#f4b060'];
  for(let i=0;i<sky.length;i++)R(0,i*11,W,12,sky[i]);
  for(let i=0;i<40;i++)if(MALL_N(i*2)<.5)R(MALL_N(i*3)*W,MALL_N(i*5)*30,1,1,'rgba(255,240,220,.6)');
  /* far city */
  for(let i=0;i<30;i++){const w=8+((i*7)%12),h=18+((i*13)%34),x=i*11-8;R(x,86-h,w,h,i%2?'#2a1a3a':'#24162e')}
  for(let i=0;i<14;i++){const w=14+((i*5)%10),h=30+((i*11)%30),x=i*24-6;R(x,90-h,w,h,'#1a1024');R(x,90-h,w,1,'#3a2a4a')}
  pxc('FAIR CITY',40,58,'#e85a4a');
  /* rooftop: barrier wall, lights, kiosk */
  R(0,88,W,16,'#7a7880');R(0,88,W,2,'#a8a6b0');for(let x=0;x<W;x+=40)R(x,90,1,14,'#5a5860');
  g.globalAlpha=.6;R(16,92,22,7,'#2a2a2a');pxc('JZ',27,92,'#e85aa0');R(200,94,30,6,'#2a2a2a');g.globalAlpha=1;pxc('KAYDEN',215,94,'#5ae0a0');
  R(260,40,50,64,'#6a6870');R(262,42,46,4,'#8a8890');R(270,54,30,50,'#3a3a44');R(272,56,12,46,'#5a6a7a');R(286,56,12,46,'#5a6a7a');pxc('LEVEL 4',285,47,'#f0d040');
  /* deck */
  R(0,104,W,76,'#5a5862');for(let y=104;y<H;y+=2)R(0,y,W,1,y%4?'#5e5c66':'#56545e');
  for(let x=10;x<W;x+=60){R(x,126,2,40,'#e8e4c0');R(x+30,166,2,14,'#e8e4c0')}R(0,124,W,2,'#e8d040');
  for(const [x,y,w] of[[60,150,30],[200,162,24]]){R(x,y,w,3,'#3a3a54');g.globalAlpha=.5;R(x+2,y,w-4,1,'#e88a52');g.globalAlpha=1}
  /* parked cars */
  const car=(x,c)=>{R(x,110,52,12,c);R(x+10,102,30,9,c);R(x+12,103,12,7,'#2a3a4a');R(x+26,103,12,7,'#2a3a4a');R(x+4,120,10,5,'#1a1a1a');R(x+38,120,10,5,'#1a1a1a');R(x,110,52,1,'rgba(255,255,255,.25)');R(x+50,113,2,3,'#f0d0a0')};
  car(90,'#7a2a2a');car(150,'#2a4a7a');
  /* light poles */
  for(const x of[20,250]){R(x,30,3,76,'#3a3a40');R(x-6,28,14,4,'#3a3a40');R(x-5,32,12,2,'#f0e0a0')}
 });
 /* live: clouds, city windows, pole lights, pigeons, the cart */
 for(let i=0;i<3;i++){const x=((T*3+i*130)%420)-60;R(x,18+i*10,40,4,'rgba(255,200,180,.45)')}
 for(let i=0;i<30;i++){const x=(i*37)%W,y=40+((i*19)%44);if(Math.sin(T*.5+i*2.3)>-.2)R(x,y,1,1,'#f0d070')}
 for(const x of[20,250]){const f=Math.sin(T*23+x)>.95?.2:1;g.globalAlpha=.12*f;for(let y=34;y<104;y+=2)R(x+1-(y-34)*.25,y,2+(y-34)*.5,2,'#fff0b0');g.globalAlpha=f;R(x-5,32,12,2,'#fff4c0');g.globalAlpha=1}
 for(let i=0;i<3;i++){const hp=Math.sin(T*4+i)>.7?1:0;const x=120+i*9;R(x,86-hp,5,3,'#8a8a92');R(x+4,85-hp,2,2,'#8a8a92');R(x+5,85-hp,1,1,'#2a2a2a')}
 {const k=((T%20)/20);if(k<.3){const x=-20+k/.3*360,w=Math.sin(T*20)>0?1:0;R(x,140,14,8,'#c8ccd4');R(x,140,14,1,'#e8ecf0');for(let i=0;i<4;i++)R(x+1+i*3,142,1,6,'#8a8e98');R(x+2,148+w,2,2,'#2a2a2a');R(x+10,148+(1-w),2,2,'#2a2a2a')}}
 for(const [x,y,w] of[[60,150,30],[200,162,24]]){g.globalAlpha=.25;R(x+((T*4)%w),y+1,4,1,'#fff');g.globalAlpha=1}
};
LIGHT.carpark=()=>({amb:.85,tint:[90,40,60],src:[[20,60,60,.3,[255,240,180]],[250,60,60,.3,[255,240,180]],[160,0,160,.2,[255,150,90]]]});
