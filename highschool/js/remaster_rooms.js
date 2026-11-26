'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — ROOMS AS ART PIECES
   Rooms redrawn from scratch (layouts and landmarks kept where scenes
   expect them). Each one: a cached static painting (light, shade,
   texture, clutter, story details) + small living touches every frame,
   and a LIGHT config that frames the room instead of flattening it.
   ===================================================================== */
{
function rmCache(id,draw){guCache('rm_'+id,'',draw)}
function rmRGB(h){return guRGB(h)}
function rmMix(a,b,t){const A_=rmRGB(a),B=rmRGB(b);return`rgb(${A_[0]+(B[0]-A_[0])*t|0},${A_[1]+(B[1]-A_[1])*t|0},${A_[2]+(B[2]-A_[2])*t|0})`}
function rmGlow(x,y,r,col,a){/* soft round light, drawn in rings */for(let i=r;i>0;i-=2){g.globalAlpha=(a||.06)*(1-i/r)*1.6;R(x-i,y-i*.6,i*2,i*1.2,col)}g.globalAlpha=1}
function rmBrick(x0,y0,w,h,base,mortar,seed,soot){R(x0,y0,w,h,mortar);const c=rmRGB(base);
 for(let r=0;r*5<h;r++)for(let k=-1;k*12<w;k++){const x=x0+k*12+(r%2)*6,y=y0+r*5,v=(hsh(seed+r*37+k*11)-.5)*22,sd=soot?Math.max(0,1-(y-y0)/h)*soot:0;
  R(x+1,y+1,10,3,`rgb(${Math.max(0,c[0]+v-sd*60)|0},${Math.max(0,c[1]+v-sd*55)|0},${Math.max(0,c[2]+v-sd*50)|0})`);if(hsh(seed+r*7+k)>.8)R(x+2+(hsh(r+k)*6|0),y+2,2,1,'rgba(0,0,0,.25)')}}

/* =====================================================================
   THE BOILER ROOM — where it happened
   ===================================================================== */
if(ROOMS.boiler){
 const B={fire:'#ff7a2a',cold:'#bcd8f0'};
 function boilerPaint(){
  /* sooty brick, darker towards the ceiling */
  rmBrick(0,0,W,112,'#5a3a2c','#22160f',301,1.1);
  guGrad(0,0,'#000000','#000000');
  g.globalAlpha=.55;guGrad(0,0,'#0a0605','#2a1a12',0,W);g.globalAlpha=1;
  /* ceiling beam + pipes with flanges, valves, a gauge */
  R(0,0,W,6,'#120c0a');R(0,6,W,1,'#3a2a22');
  for(const [y,c,h] of[[14,'#6a6058',5],[26,'#5a5048',4],[40,'#7a5a40',3]]){R(0,y,W,h,c);R(0,y,W,1,'rgba(255,255,255,.18)');R(0,y+h-1,W,1,'rgba(0,0,0,.4)');
   for(let x=8;x<W;x+=46){R(x,y-1,4,h+2,'#3a3430');R(x+1,y-1,1,h+2,'rgba(255,255,255,.15)')}}
  /* valve wheels */
  for(const [x,y] of[[52,20],[212,32]]){R(x-4,y-4,9,9,'#7a1a14');R(x-3,y-3,7,7,'#1a0e0a');R(x-1,y-4,3,9,'#9a2a20');R(x-4,y-1,9,3,'#9a2a20');R(x,y,1,1,'#d84a3a')}
  /* the stopped clock: 3:15 */
  R(58,46,16,16,'#2a221c');R(59,47,14,14,'#d8ccb4');R(59,47,14,1,'#f4ead4');R(65,49,1,6,'#1a1410');R(66,54,4,1,'#1a1410');R(65,54,1,1,'#7a1a14');
  /* DETENTION sign, peeling */
  R(16,66,44,10,'#e8dcc0');R(16,66,44,1,'#fff6e0');pxc('DETENTION',38,68,'#5a1a14');R(56,66,4,3,'#b8a888');R(16,75,44,1,'rgba(0,0,0,.3)');
  /* the boiler: a riveted iron hulk */
  R(102,26,96,84,'#120d0a');
  guGrad(30,108,'#4a3a30','#1a1210',106,88);
  R(106,30,88,1,'rgba(255,220,180,.25)');R(106,30,2,78,'rgba(255,220,180,.12)');R(192,30,2,78,'rgba(0,0,0,.4)');
  for(let i=0;i<8;i++){R(110+i*11,34,2,2,'#7a6a5a');R(110+i*11,100,2,2,'#5a4a3a')}
  for(let j=0;j<5;j++){R(108,42+j*12,2,2,'#6a5a4a');R(190,42+j*12,2,2,'#4a3a2e')}
  R(106,70,88,2,'#2a1e18');R(106,72,88,1,'rgba(255,200,160,.12)');
  /* the firebox door (glow drawn live) */
  R(124,44,52,30,'#0a0706');R(122,42,56,2,'#3a2e26');R(122,74,56,2,'#3a2e26');R(122,42,2,34,'#3a2e26');R(176,42,2,34,'#3a2e26');
  for(let i=0;i<6;i++)R(128+i*8,48,3,22,'#1a0e08');
  /* the pressure gauge */
  R(178,22,16,16,'#2a2420');R(179,23,14,14,'#e8e0cc');R(179,23,14,1,'#fffaf0');R(180,34,12,2,'#c84030');
  /* the flue going up */
  R(144,0,14,28,'#2a221c');R(144,0,2,28,'rgba(255,220,180,.15)');R(142,24,18,4,'#3a3028');
  /* the coal chute: a hatch in the ceiling, cold light, a heap of coal */
  R(236,0,50,6,'#0a0706');R(240,0,42,4,'#2a3a48');R(244,0,34,2,'#8aa8c0');
  for(let i=0;i<22;i++){const w=26+i*2.2;R(261-w/2,108-i*.6,w,1,i%2?'#0e0a08':'#16100c')}
  R(242,96,40,14,'#0a0806');for(let i=0;i<60;i++){const cx=244+hsh(i+501)*36,cy=96+hsh(i+502)*12;R(cx,cy,2,2,hsh(i)>.5?'#1e1a18':'#2c2824');if(hsh(i+9)>.6)R(cx,cy,1,1,'#6a8094')}for(let i=0;i<9;i++)R(238+hsh(i+601)*50,108+hsh(i+602)*8,2,1,'#1e1a18')
  /* the names, scratched low, kid height */
  const sc='rgba(220,200,180,.55)';px('OLLIE',216,86,sc);px('DANNY',248,86,sc);px('PRIYA',216,94,sc);px('MICHAEL',248,94,sc);px('WE WAITED',224,102,'rgba(220,180,160,.42)');
  for(let i=0;i<5;i++)R(196+i*3,84,1,6,sc);R(195,86,16,1,sc);
  /* floor: wet concrete, a drain, a puddle that catches the chute light */
  guGrad(112,180,'#2a201a','#0e0a08');guSpeck(0,112,W,68,420,['#34281e','#3e3026','#0a0706','#221a14'],511);
  R(0,112,W,2,'#0a0706');R(0,114,W,1,'rgba(255,200,160,.08)');
  R(150,150,22,4,'#0a0806');for(let i=0;i<5;i++)R(152+i*4,151,2,2,'#2a2a2e');
  R(226,132,54,10,'#141c22');R(230,133,46,7,'#1e2c36');R(236,134,24,2,'rgba(190,220,240,.35)');
  /* 1987: four wooden detention chairs, one knocked over */
  const chair=(x,y,fl)=>{if(fl){R(x-6,y-2,14,3,'#5a3a22');R(x-6,y-6,3,4,'#4a2e1a');R(x+5,y-6,3,4,'#4a2e1a');R(x-8,y-1,2,2,'#3a2414');return}
   R(x-5,y-18,2,12,'#6a4428');R(x-5,y-9,11,2,'#7a5030');R(x-5,y-7,11,1,'#3a2414');R(x-5,y-7,2,8,'#5a3a22');R(x+4,y-7,2,8,'#5a3a22');R(x-4,y-18,1,10,'rgba(255,220,180,.2)')};
  chair(38,152,0);chair(60,154,0);chair(82,152,0);chair(84,166,1);
  /* a single small shoe near the chute */
  R(214,150,6,3,'#2a2a3a');R(214,149,3,1,'#3a3a4a');R(219,152,1,1,'#c8c8c8');
 }
 ROOMS.boiler.bg=function(){rmCache('boiler',boilerPaint);
  /* firebox glow, breathing */
  const f=.55+.25*Math.sin(T*3.1)+.12*Math.sin(T*7.7);
  g.globalAlpha=f;R(126,50,48,22,'#ff5a1a');g.globalAlpha=f*.7;R(130,54,40,14,'#ffb040');g.globalAlpha=1;
  for(let i=0;i<6;i++)R(128+i*8,48,3,22,'#1a0e08');
  rmGlow(150,90,60,B.fire,.05*f+.02);
  /* gauge needle trembling */
  const a=-.4+.15*Math.sin(T*5)+.05*Math.sin(T*23);g.save();g.translate(186,30);g.rotate(a);R(0,-.5,6,1,'#1a1410');g.restore();
  /* the cold shaft from the chute, dust drifting in it */
  g.globalAlpha=.16;for(let i=0;i<54;i++){const w=30+i*.9;R(261-w/2,4+i*2,w,2,B.cold)}g.globalAlpha=1;
  for(let i=0;i<14;i++){const q=(T*.06+hsh(i+77))%1,x=246+hsh(i+78)*30+Math.sin(T+i)*3,y=6+q*100;g.globalAlpha=.5*(1-q);R(x,y,1,1,'#e8f4ff');g.globalAlpha=1}
  /* steam from the valve */
  for(let i=0;i<5;i++){const q=(T*.5+i/5)%1;g.globalAlpha=.25*(1-q);R(212+q*8+Math.sin(T*2+i)*2,24-q*18,4+q*6,3,'#c8c8c8');g.globalAlpha=1}
  /* drips into the puddle */
  {const q=(T*.9)%1;if(q<.8)R(250,40+q*92,1,2,'#9ac0d8');else{g.globalAlpha=1-(q-.8)*5;R(246,136,9,1,'#bcd8f0');g.globalAlpha=1}}
 };
 if(typeof LIGHT!=='undefined')LIGHT.boiler={amb:.48,tint:[24,12,8],src:[[150,66,120,.55,[255,150,80]],[261,30,110,.5,[190,220,255]],[40,140,40,.12,[255,180,120]]]};
}


/* =====================================================================
   THE GYM — Coach's kingdom
   ===================================================================== */
if(ROOMS.gym){
 function gymPaint(){
  /* painted cinder block, two-tone, scuffed */
  guBlock(0,0,W,112,16,8,'#d8ccb4',711);R(0,64,W,48,'rgba(40,60,110,.22)');R(0,63,W,2,'#2a4a8a');R(0,65,W,1,'rgba(255,255,255,.2)');
  /* high windows with daylight */
  for(let i=0;i<5;i++){const x=20+i*64;R(x-1,5,42,16,'#6a6258');R(x,6,40,14,'#a8d0ec');guGrad(6,20,'#cfe6f6','#88b4d8',x,40);R(x+19,6,2,14,'#6a6258');R(x,12,40,1,'#6a6258');guShaft(x+4,20,30,70,.35,'#fff6dc',.05)}
  /* wall bars */
  for(let i=0;i<10;i++){R(8+i*5,28,2,80,'#b88a5a');R(8+i*5,28,1,80,'#d8a870')}for(let j=0;j<13;j++){R(6,32+j*6,52,2,'#a87a4a');R(6,32+j*6,52,1,'#c89a6a')}
  /* banners */
  R(80,28,40,16,'#1e4a98');R(80,28,40,1,'#4a7ac8');pxc('GO HARD',100,33,'#fff');R(80,44,40,2,'rgba(0,0,0,.25)');
  R(198,28,56,16,'#981e1e');R(198,28,56,1,'#c84a4a');pxc('PAIN=GAIN',226,33,'#fff');R(198,44,56,2,'rgba(0,0,0,.25)');
  /* 1987 championship banner, faded */
  R(140,8,40,14,'#5a2a6a');pxc('STATE 87',160,12,'#e8d070');
  /* the PE cupboard */
  R(138,46,44,62,'#3a2e22');R(140,48,40,60,'#7a6448');R(140,48,40,1,'#a88a64');R(158,48,1,60,'#5a4a34');pxc('PE',160,52,'#fff');pxc('CUPBOARD',160,60,'#f0d070');R(170,78,3,4,'#d8d8d8');
  R(140,104,40,4,'#2a2018');
  /* bleachers */
  for(let r=0;r<5;r++){R(62+r*2,72+r*8,72-r*4,3,'#9a6a3a');R(62+r*2,72+r*8,72-r*4,1,'#c89058');R(62+r*2,75+r*8,72-r*4,5,'#4a3020')}
  R(64,72,2,40,'#3a3a40');R(130,72,2,40,'#3a3a40');
  /* hoop + backboard */
  R(282,22,30,24,'#f4f4f0');R(284,24,26,20,'#ffffff');R(290,30,14,10,'rgba(200,40,40,.35)');R(291,31,12,8,'#fff');R(296,46,2,4,'#7a7a82');R(288,48,18,2,'#e0502a');for(let i=0;i<5;i++)R(289+i*4,50,1,8+(i%2),'#e8e8e8');
  /* the gym doors, where the bucket hangs */
  R(270,62,44,50,'#2a2420');R(272,64,19,48,'#5a6a7a');R(293,64,19,48,'#5a6a7a');R(276,70,11,10,'#a8c8e0');R(297,70,11,10,'#a8c8e0');R(272,86,40,3,'#c8c8cc');pxc('EXIT',292,57,'#e04040');
  /* floor: glossy maple with court lines and scuffs */
  guGrad(112,180,'#e2b072','#b8844a');for(let y=112;y<180;y+=4)R(0,y,W,1,'rgba(120,70,30,.18)');for(let i=0;i<40;i++){const x=hsh(i+721)*W,y=114+hsh(i+722)*64;R(x,y,12+hsh(i)*16,1,'rgba(255,240,210,.18)')}
  for(let i=0;i<24;i++){const x=hsh(i+731)*W,y=116+hsh(i+732)*60;R(x,y,4,1,'rgba(30,20,10,.3)')}
  R(0,140,W,1,'#d83a3a');R(160,112,1,68,'#d83a3a');R(118,126,84,1,'#2a5ad0');R(0,170,W,1,'#2a5ad0');
  g.globalAlpha=.18;for(let i=0;i<5;i++)R(30+i*64,116,24,60,'#fff8e8');g.globalAlpha=1;
  R(0,112,W,2,'rgba(0,0,0,.3)');
 }
 ROOMS.gym.bg=function(){rmCache('gym',gymPaint);
  /* dust in the window light, a ball that rolls by now and then */
  for(let i=0;i<10;i++){const q=(T*.04+hsh(i+741))%1;g.globalAlpha=.4*(1-q);R(24+hsh(i+742)*270,22+q*80,1,1,'#fff8e0');g.globalAlpha=1}
  const b=(T*.1)%6;if(b<1){const x=-10+b*340;R(x,170,6,6,'#d8662a');R(x+2,170,1,6,'#3a1a10');R(x,172,6,1,'#3a1a10')}};
 if(typeof LIGHT!=='undefined')LIGHT.gym={amb:.78,tint:[60,40,20],src:[[40,13,80,.3,[255,248,225]],[104,13,80,.3,[255,248,225]],[168,13,80,.3,[255,248,225]],[232,13,80,.3,[255,248,225]],[296,13,80,.3,[255,248,225]]],wallAO:1};
}

/* =====================================================================
   THE CHEM LAB — Mr. Voss
   ===================================================================== */
if(ROOMS.chem){
 function chemPaint(){
  guTiles(0,0,W,112,8,'#2c4a46','#30504c','rgba(0,0,0,.18)',801);g.globalAlpha=.45;guGrad(0,0,'#081412','#1a302c',0,W);g.globalAlpha=1;
  R(0,96,W,16,'#1e302c');R(0,96,W,1,'#4a6a64');
  /* fluorescent fittings */
  for(const x of[24,160,296]){R(x-14,2,28,3,'#cfe8d8');R(x-14,5,28,1,'#6a8a80')}
  /* specimen shelves: jars with things in them */
  for(let r=0;r<3;r++){const y=24+r*20;R(86,y,120,3,'#4a3626');R(86,y,120,1,'#7a5a3e');R(86,y+3,120,1,'rgba(0,0,0,.4)')}
  pxc('SAMPLES',146,84,'#8af0a8');R(118,82,56,1,'rgba(138,240,168,.3)');
  /* periodic table, curling at one corner */
  R(214,16,54,34,'#e8e4d4');for(let r=0;r<5;r++)for(let c=0;c<9;c++)if(!(r<2&&c>0&&c<8))R(216+c*6,18+r*6,5,5,['#e88a8a','#e8c88a','#a8e08a','#8ac8e8','#c8a8e8'][(r+c)%5]);R(262,44,6,6,'#c8c0a8');
  /* the back fridge, with a padlock it shouldn't need */
  R(16,26,52,86,'#9aa09a');R(18,28,48,82,'#dcdfda');R(18,28,48,2,'#fff');R(20,66,44,2,'#9a9e9a');R(58,40,3,14,'#8a8a8a');R(58,74,3,18,'#8a8a8a');
  R(30,44,20,8,'#f4f0d0');pxc('DO NOT',40,45,'#b01818');R(54,56,6,6,'#c8a030');R(55,54,4,3,'#7a7a82');
  g.globalAlpha=.35;R(20,30,6,78,'#ffffff');g.globalAlpha=1;
  /* acid bath, glowing */
  R(238,92,64,26,'#1a2a24');R(240,94,60,22,'#2a3a32');R(242,96,56,8,'#1a4a2a');pxc('ACID',270,108,'#ffe040');
  /* lab benches: black tops, sinks, gas taps */
  guGrad(112,180,'#3a4642','#1a2220');guTiles(0,112,W,68,10,'#34403c','#2e3a36','rgba(0,0,0,.2)',811);
  for(const [x,y] of[[84,128],[196,128],[84,156],[196,156]]){R(x-34,y-4,68,5,'#121616');R(x-34,y-4,68,1,'#3a4a48');R(x-32,y+1,64,14,'#5a4a3a');R(x-32,y+1,64,1,'#7a6a52');R(x-6,y-3,12,3,'#3a4a4a');R(x+20,y-8,2,5,'#a8a8b0');R(x+19,y-9,4,1,'#c8c8d0')}
 }
 ROOMS.chem.bg=function(){rmCache('chem',chemPaint);
  /* the jars glow and things turn in them */
  for(let r=0;r<3;r++)for(let i=0;i<14;i++){const x=89+i*8,y=24+r*20,c=['#6aff8a','#ff6a8a','#e8e070','#8ad8ff','#d0a0ff'][(i*3+r)%5];
   R(x,y-10,6,10,'#a8c8c4');R(x+1,y-7,4,7,c);R(x,y-11,6,1,'#7a7a6a');if((i+r)%3===0){const o=Math.sin(T*1.2+i*1.7)*1.5;R(x+2,y-5+o,2,2,'#e8d8c8')}
   if((i+r)%4===0){g.globalAlpha=.18+Math.sin(T*2+i)*.08;R(x-1,y-12,8,13,c);g.globalAlpha=1}}
  /* acid bubbles */
  for(let i=0;i<6;i++){const q=(T*.6+i/6)%1;R(246+hsh(i+821)*48,104-q*8,2,2,'#9aff70')}
  g.globalAlpha=.25+.08*Math.sin(T*2);R(242,96,56,8,'#6aff70');g.globalAlpha=1;
  /* one tube flickers */
  if(Math.sin(T*17)>.6&&Math.sin(T*1.3)>0){g.globalAlpha=.35;R(146,2,28,3,'#000');g.globalAlpha=1}};
 if(typeof LIGHT!=='undefined')LIGHT.chem={amb:.5,tint:[10,30,26],src:[[270,100,90,.5,[120,255,150]],[146,40,80,.3,[170,255,210]],[24,10,70,.22,[220,255,235]],[296,10,70,.2,[220,255,235]]],wallAO:1};
}

/* =====================================================================
   THE STAGE — Curtain Call (Mr. Kim's)
   ===================================================================== */
if(ROOMS.stage){
 function stagePaint(){
  R(0,0,W,112,'#0e0608');
  /* the heavy curtain: folds catch light */
  for(let x=0;x<W;x+=8){const f=Math.sin(x*.35)*.5+.5;R(x,0,8,108,rmMix('#4a0a12','#b02232',f*.85));R(x+1,0,1,108,'rgba(255,200,200,.12)');R(x+7,0,1,108,'rgba(0,0,0,.3)')}
  R(0,0,W,14,'#2a0408');for(let x=0;x<W;x+=16)R(x,10,16,6,'#7a1420');R(0,15,W,1,'#c8a040');
  for(let x=4;x<W;x+=12)R(x,104,6,4,'#6a0e18');
  /* stage floor and footlights */
  R(0,108,W,8,'#3a2416');R(0,108,W,1,'#6a4a30');for(let x=0;x<W;x+=24)R(x,108,1,8,'#2a180e');
  for(let x=14;x<W;x+=26){R(x,114,10,4,'#1a1a1a');R(x+1,114,8,1,'#f4d890')}
  R(0,118,W,62,'#120a08');guSpeck(0,118,W,62,120,['#1a100c','#22160e'],851);
  /* the ghost light: one bulb on a stand, left on all night */
  R(60,62,2,46,'#3a3a3a');R(56,106,10,2,'#2a2a2a');R(57,56,8,6,'#5a5a5a');R(59,58,4,4,'#fff4c8');
  /* Mr. Kim's magic box, stars painted on */
  R(214,74,44,34,'#1a1440');R(216,76,40,30,'#2a2470');for(let i=0;i<7;i++)R(218+hsh(i+861)*34,78+hsh(i+862)*24,2,2,'#f0d040');pxc('MAGIC',236,80,'#f0d040');R(214,106,44,2,'#0a0820');
  /* sandbags on ropes */
  R(292,0,1,70,'#8a7a5a');R(288,70,9,10,'#7a6a4a');R(280,0,1,50,'#8a7a5a');R(276,50,9,10,'#6a5a3a');
 }
 ROOMS.stage.bg=function(){rmCache('stage',stagePaint);
  const fl=.7+.3*Math.sin(T*9)*Math.sin(T*2.3);rmGlow(61,60,34,'#fff0c0',.07*fl);g.globalAlpha=fl;R(59,58,4,4,'#fffbe8');g.globalAlpha=1;
  /* the curtain breathes */
  g.globalAlpha=.08;R(0,0,W,108,Math.sin(T*.7)>0?'#000':'#300');g.globalAlpha=1;
  for(let i=0;i<8;i++){const q=(T*.03+hsh(i+871))%1;g.globalAlpha=.35*(1-q);R(40+hsh(i+872)*40,60-q*40,1,1,'#fff4d0');g.globalAlpha=1}};
 if(typeof LIGHT!=='undefined')LIGHT.stage={amb:.46,tint:[40,8,10],src:[[61,60,90,.45,[255,236,190]],[160,116,180,.2,[255,210,160]]],wallAO:0};
}

/* =====================================================================
   THE POOL — Mrs. Tarn
   ===================================================================== */
if(ROOMS.pool){
 function poolPaint(){
  guTiles(0,0,W,96,6,'#d8ecf0','#cfe6ec','rgba(90,140,160,.25)',901);
  R(0,0,W,6,'#7a8a94');for(let i=0;i<6;i++){const x=12+i*54;R(x,8,40,18,'#9ac8e8');guGrad(8,26,'#e8f6ff','#9ac8e8',x,40);R(x+19,8,2,18,'#7a8a94');guShaft(x+6,26,26,70,.25,'#fffef0',.05)}
  R(0,58,W,3,'#2a6ab0');R(0,61,W,1,'#ffffff');
  /* signs (same places as always) */
  R(10,30,60,16,'#1e4ab0');pxc('DEEP END',40,32,'#fff');pxc('3M',40,39,'#fff');
  R(114,30,92,22,'#f4f4ec');pxc('BREATH TEST',160,32,'#1a3a6a');pxc('2:00 OR',160,39,'#1a3a6a');pxc('TRY AGAIN',160,46,'#c02020');
  R(248,30,64,16,'#c01818');pxc('NO BOMBING',280,32,'#fff');pxc('NO HEROES',280,39,'#fff');
  /* lifeguard chair, diving board */
  R(286,70,2,26,'#e8e8e8');R(298,70,2,26,'#e8e8e8');R(284,70,18,3,'#d83a3a');R(284,62,18,2,'#d83a3a');
  R(20,90,40,3,'#e8e4d0');R(20,90,40,1,'#fff');R(22,93,4,8,'#a8a8b0');
  /* deck and water */
  R(0,96,W,16,'#cfe6ec');for(let x=0;x<W;x+=8)R(x,96,1,16,'rgba(90,140,160,.25)');R(0,110,W,2,'#2a5a7a');
  guGrad(112,180,'#3aa8d8','#0e4a7a');
  for(let i=0;i<4;i++){const y=124+i*14;for(let x=0;x<W;x+=6)R(x,y,4,2,i%2?'#e83a3a':'#f4f4f4')}
  for(let x=0;x<W;x+=32)R(x+14,112,4,68,'rgba(10,40,80,.35)');
 }
 ROOMS.pool.bg=function(){rmCache('pool',poolPaint);
  /* caustics on the water and a slow swell */
  g.globalAlpha=.22;for(let i=0;i<40;i++){const x=(hsh(i+911)*W+Math.sin(T*.8+i)*8)%W,y=114+hsh(i+912)*64+Math.sin(T*1.1+i*2)*2;R(x,y,6+Math.sin(T*2+i)*3,1,'#e8fbff')}g.globalAlpha=1;
  g.globalAlpha=.15;R(0,112+Math.sin(T)*1,W,2,'#ffffff');g.globalAlpha=1;
  for(let i=0;i<4;i++){const y=124+i*14+Math.sin(T*1.5+i)*1;for(let x=0;x<W;x+=6)R(x,y,4,2,i%2?'#e83a3a':'#f4f4f4')}};
 if(typeof LIGHT!=='undefined')LIGHT.pool={amb:.86,tint:[30,70,90],src:[[160,150,200,.25,[150,230,255]],[40,20,80,.2,[255,255,240]],[260,20,80,.2,[255,255,240]]],wallAO:0};
}

/* =====================================================================
   THE WEIGHT ROOM
   ===================================================================== */
if(ROOMS.weightroom){
 function wrPaint(){
  guBlock(0,0,W,112,16,8,'#5a5e66',951);g.globalAlpha=.35;guGrad(0,0,'#1a1c20','#3a3e46',0,W);g.globalAlpha=1;
  R(0,60,W,2,'#c8a020');R(0,62,W,1,'#5a4a10');
  /* the mirror wall */
  R(86,14,148,74,'#2a2c30');guGrad(16,86,'#9aa8b8','#5a6472',88,144);g.globalAlpha=.25;for(let i=0;i<6;i++)R(100+i*24,16,10,70,'#ffffff');g.globalAlpha=1;R(88,16,144,1,'#e8f0f8');
  pxc('NO PAIN NO GAIN',160,6,'#c8a020');
  /* dumbbell racks */
  for(const x0 of[10,240]){R(x0,70,70,4,'#2a2a2e');R(x0+2,74,3,30,'#2a2a2e');R(x0+65,74,3,30,'#2a2a2e');R(x0,88,70,3,'#2a2a2e');
   for(let i=0;i<6;i++){const x=x0+6+i*11;R(x,64,3,6,'#1a1a1c');R(x+3,66,4,2,'#8a8a92');R(x+7,64,3,6,'#1a1a1c');R(x,82,3,6,'#1a1a1c');R(x+3,84,4,2,'#8a8a92');R(x+7,82,3,6,'#1a1a1c')}}
  /* rubber floor, chalk dust, the bench */
  guGrad(112,180,'#2a2a2e','#141416');guTiles(0,112,W,68,16,'#26262a','#222226','rgba(0,0,0,.3)',961);
  for(let i=0;i<30;i++)R(hsh(i+971)*W,114+hsh(i+972)*62,2,1,'rgba(240,240,240,.18)');
  R(130,130,60,6,'#a81e1e');R(130,130,60,1,'#d84a4a');R(134,136,3,14,'#3a3a3e');R(183,136,3,14,'#3a3a3e');
  R(122,116,2,22,'#5a5a62');R(196,116,2,22,'#5a5a62');R(110,114,100,2,'#9a9aa2');R(108,110,6,10,'#1a1a1c');R(206,110,6,10,'#1a1a1c');
 }
 ROOMS.weightroom.bg=function(){rmCache('weightroom',wrPaint);
  for(let i=0;i<8;i++){const q=(T*.05+hsh(i+981))%1;g.globalAlpha=.3*(1-q);R(110+hsh(i+982)*100,130-q*30,1,1,'#f0f0f0');g.globalAlpha=1}};
 if(typeof LIGHT!=='undefined')LIGHT.weightroom={amb:.7,tint:[30,30,40],src:[[160,10,120,.3,[240,245,255]]],wallAO:1};
}

/* =====================================================================
   THE SUPPLY CLOSET — Ms. Sherman's punishment room
   ===================================================================== */
if(ROOMS.closet){
 function closetPaint(){
  R(0,0,W,112,'#2a221c');guSpeck(0,0,W,112,300,['#30271f','#241c16'],1001);
  /* floor-to-ceiling shelves of supplies */
  for(let r=0;r<4;r++){const y=20+r*22;R(10,y,300,3,'#5a4a36');R(10,y,300,1,'#8a7050');R(10,y+3,300,1,'rgba(0,0,0,.4)');
   for(let i=0;i<34;i++){const x=12+i*8.7,h=6+hsh(i*7+r)*10,c=['#c8b890','#8aa0b8','#c87a5a','#e8e0c8','#7a9a6a','#b8a0c8'][(i+r*2)%6];R(x,y-h,7,h,c);R(x,y-h,7,1,'rgba(255,255,255,.2)');if(hsh(i+r*31)>.85)R(x+1,y-h+2,5,1,'#2a2a2a')}}
  /* the door, from inside: scratches low down, kid height */
  R(132,30,56,82,'#3a2a1e');R(134,32,52,80,'#5a4230');R(178,70,4,6,'#a8a8a0');
  for(let i=0;i<16;i++){const x=138+hsh(i+1011)*44,y=78+hsh(i+1012)*28;R(x,y,1,4+hsh(i)*6,'rgba(220,200,180,.45)');R(x+1,y+1,1,3,'rgba(220,200,180,.25)')}
  /* mop, bucket, bleach */
  R(40,70,1,40,'#8a6a4a');R(36,108,9,4,'#d8d0c0');R(48,98,16,14,'#c8a020');R(48,98,16,1,'#f0c840');R(70,100,8,12,'#e8f0f8');R(71,98,6,2,'#4a7ac8');
  /* the floor */
  guGrad(112,180,'#2a221c','#0e0a08');guSpeck(0,112,W,68,200,['#30261e','#1a140f'],1021);
  /* the dark corner at the back, where something breathes slower than you */
  g.globalAlpha=.7;guGrad(0,0,'#000000','#000000',260,60);g.globalAlpha=1;
 }
 ROOMS.closet.bg=function(){rmCache('closet',closetPaint);
  /* the bulb swings */
  const sw=Math.sin(T*1.4)*8,bx=160+sw;g.save();g.strokeStyle='#4a4a4a';g.beginPath();g.moveTo(160,0);g.lineTo(bx,26);g.stroke();g.restore();
  R(bx-2,26,5,5,'#fff4c0');rmGlow(bx,34,70,'#fff0b0',.06);
  /* two points of light in the back corner, sometimes */
  if(Math.sin(T*.37)>.93){R(284,62,1,1,'#e8e0a0');R(290,62,1,1,'#e8e0a0')}};
 if(typeof LIGHT!=='undefined')LIGHT.closet={amb:.42,tint:[30,20,10],src:[[160,30,120,.5,[255,236,180]]],wallAO:1};
}


/* =====================================================================
   THE DRAMA STUDIO — Mr. Pratt's black box
   ===================================================================== */
if(ROOMS.drama){
 function dramaPaint(){
  R(0,0,W,112,'#0e0c12');guSpeck(0,0,W,112,260,['#16131c','#0a080e'],1101);
  /* lighting rig: a black truss with clamps */
  R(8,12,304,5,'#2a2a32');for(let x=8;x<312;x+=8){R(x,12,1,5,'#4a4a54');R(x,14,8,1,'#3a3a44')}
  /* side curtains */
  for(const cx of[0,282])for(let i=0;i<38;i+=4){const f=Math.sin(i*.6)*.5+.5;R(cx+i,6,4,106,rmMix('#4a0a16','#9a2236',f))}
  /* the platform */
  R(40,74,240,38,'#2a1e18');R(40,74,240,3,'#6a4a32');R(40,77,240,1,'rgba(0,0,0,.5)');for(let i=0;i<240;i+=20)R(40+i,77,1,35,'rgba(0,0,0,.3)');
  /* comedy/tragedy masks, then the poster */
  R(134,26,24,28,'#efe8da');R(138,33,5,4,'#0e0c12');R(149,33,5,4,'#0e0c12');R(140,44,12,3,'#0e0c12');R(141,46,10,1,'#0e0c12');
  R(162,26,24,28,'#e4dccc');R(166,33,5,4,'#0e0c12');R(177,33,5,4,'#0e0c12');R(168,47,12,2,'#0e0c12');R(166,45,2,2,'#0e0c12');R(180,45,2,2,'#0e0c12');R(171,38,1,4,'#4a6aa0');
  pxc('MACBETH',160,58,'#d8b060');pxc('REAL DAGGERS',160,65,'#b02424');
  /* costume rack, a dressmaker's dummy, a prop sword */
  R(52,40,46,2,'#8a8a92');R(54,40,2,34,'#6a6a72');R(94,40,2,34,'#6a6a72');for(let i=0;i<6;i++)R(58+i*6,42,5,22,['#6a1a2a','#2a3a6a','#c8a040','#1a1a1a','#7a5a9a','#3a6a3a'][i]);
  R(236,36,12,16,'#c8b8a0');R(234,52,16,18,'#d8c8b0');R(241,70,2,4,'#5a4a3a');R(236,74,12,2,'#3a2a1e');
  R(262,44,2,30,'#d8dce4');R(258,70,10,2,'#c8a040');R(262,72,2,4,'#5a3a22');
  /* floor: black box, tape marks */
  R(0,112,W,68,'#16131a');guSpeck(0,112,W,68,160,['#1c1822','#0e0c12'],1111);for(let i=0;i<8;i++){const x=30+i*36,y=140+(i%2)*14;R(x,y,10,1,'#e8d040');R(x+4,y-3,1,7,'#e8d040')}
 }
 ROOMS.drama.bg=function(){rmCache('drama',dramaPaint);
  /* the rig lights, each with its cone; one may be down (quest) */
  for(let i=0;i<6;i++){const x=30+i*52;R(x,17,8,8,'#2a2a30');R(x+1,24,6,1,'#5a5a64');if(typeof D!=='undefined'&&D&&D.f.rigDown&&i===3)continue;
   const c=['#fff2c0','#ffb0b0','#b0d0ff','#fff2c0','#c8ffb8','#ffd890'][i];g.globalAlpha=.07+.015*Math.sin(T*1.7+i);for(let k=0;k<44;k++)R(x+4-6-k*.5,25+k*2,12+k,2,c);g.globalAlpha=1;R(x+1,23,6,2,c)}
  for(let i=0;i<12;i++){const q=(T*.03+hsh(i+1121))%1;g.globalAlpha=.35*(1-q);R(30+hsh(i+1122)*260,30+q*80,1,1,'#fff4d8');g.globalAlpha=1}};
 if(typeof LIGHT!=='undefined')LIGHT.drama={amb:.52,tint:[20,12,26],src:[[160,60,130,.35,[255,236,200]],[60,40,60,.2,[255,180,180]],[264,40,60,.2,[180,210,255]]],wallAO:0};
}

/* =====================================================================
   THE ENRICHMENT LAYER for every room not fully repainted
   grain on the walls, a ceiling shadow, a baseboard shadow, floor depth,
   soft window light, and small clutter in the empty places
   ===================================================================== */
const ENR={
 corridor:{shafts:[],clutter:[['bin',22,150],['bag',96,162],['paper',210,170],['paper',140,158]]},
 hallb:{clutter:[['plant',300,110],['bin',20,150],['paper',180,166]]},
 upper:{clutter:[['bin',300,150],['paper',120,168],['bag',230,162]]},
 wing_sci:{clutter:[['bin',300,150],['paper',90,166]]},wing_arts:{clutter:[['paper',150,168],['bag',260,162]]},wing_sports:{clutter:[['bin',18,150],['ball',240,168]]},
 canteen:{clutter:[['tray',90,164],['paper',200,170],['bin',300,150],['spill',150,172]]},
 library:{clutter:[['plant',300,110],['books',40,168]]},
 maths:{clutter:[['bag',300,164],['paper',60,172]]},english:{clutter:[['bag',300,164],['paper',220,172]]},history:{clutter:[['bag',18,164],['paper',150,172]]},
 science:{clutter:[['bag',300,164],['paper',90,172]]},trailer:{clutter:[['bag',300,166],['paper',150,174]]},art:{clutter:[['paper',90,172],['paper',230,166]]},
 foodtech:{clutter:[['spill',120,172],['paper',250,168]]},toilets:{clutter:[['paper',140,170],['spill',220,168]]},staffroom:{clutter:[['plant',20,110],['bag',300,164]]},
 office:{clutter:[['plant',300,110]]},ict:{clutter:[['bag',18,164],['paper',150,174]]},psych:{clutter:[['plant',300,110],['paper',200,172]]},music:{clutter:[['paper',150,172]]},
 lockers:{clutter:[['bag',150,168],['towel',220,166],['paper',80,172]]},nurse:{clutter:[['bin',300,150]]},hall:{clutter:[['paper',60,174],['paper',260,172]]},
 checkpoint:{clutter:[['bin',10,150],['paper',120,172]]},door:{clutter:[]},walkway:{clutter:[['paper',90,170]]},courtyard:{clutter:[['paper',200,172]]},
 roof:{clutter:[['vent',60,112],['puddle',200,160],['puddle',90,170]]},party:{clutter:[['cup',100,168],['cup',220,172],['cup',160,164]]},lake:{clutter:[]},carpark:{clutter:[['paper',200,172]]},
 stairwell:{clutter:[]},gymx:{}};
function enrichPaint(r){
 const sd=r.length*977;
 /* wall grain + ceiling shadow */
 for(let i=0;i<420;i++){const x=hsh(sd+i)*W,y=hsh(sd+i+.5)*110;g.globalAlpha=.06;R(x,y,1,1,hsh(sd+i*3)>.5?'#ffffff':'#000000')}g.globalAlpha=1;
 g.globalAlpha=.22;guGrad(0,14,'#000000','#000000');for(let y=0;y<14;y++){g.globalAlpha=.2*(1-y/14);R(0,y,W,1,'#000')}g.globalAlpha=1;
 /* baseboard shadow + floor depth */
 for(let y=112;y<118;y++){g.globalAlpha=.28*(1-(y-112)/6);R(0,y,W,1,'#000')}
 for(let y=150;y<180;y++){g.globalAlpha=.16*((y-150)/30);R(0,y,W,1,'#000')}g.globalAlpha=1;
 /* side vignette */
 for(let x=0;x<18;x++){g.globalAlpha=.12*(1-x/18);R(x,0,1,H,'#000');R(W-1-x,0,1,H,'#000')}g.globalAlpha=1;
 /* clutter */
 for(const [t,x,y] of (ENR[r].clutter||[])){
  if(t==='bin'){R(x-6,y-14,12,14,'#3a5a7a');R(x-7,y-15,14,2,'#2a4a6a');R(x-5,y-13,2,12,'rgba(255,255,255,.15)');R(x-3,y-17,4,2,'#e8e4d4')}
  else if(t==='bag'){R(x-6,y-8,12,9,'#2a3a6a');R(x-5,y-10,10,3,'#2a3a6a');R(x-3,y-6,6,3,'#3a4a7a');R(x-2,y-11,4,1,'#1a2a4a')}
  else if(t==='paper'){R(x-3,y-1,6,3,'#f0ece0');R(x-2,y,4,1,'#b8b4a8')}
  else if(t==='plant'){R(x-5,y-2,10,8,'#8a5a3a');R(x-4,y-2,8,1,'#a8724a');for(let i=0;i<7;i++)R(x-6+i*2,y-8-(i%3)*3,2,7+(i%3)*3,i%2?'#3a7a3a':'#4a9a4a')}
  else if(t==='tray'){R(x-7,y-1,14,3,'#8a8a92');R(x-4,y-2,4,2,'#d8a040');R(x+1,y-2,3,2,'#7a9a3a')}
  else if(t==='spill'){R(x-8,y-1,16,3,'rgba(150,110,60,.45)');R(x-4,y,6,1,'rgba(255,255,255,.2)')}
  else if(t==='books'){for(let i=0;i<3;i++)R(x-6,y-2-i*2,12-i*2,2,['#8a2a2a','#2a4a8a','#c8a040'][i])}
  else if(t==='ball'){R(x-3,y-5,6,6,'#d8662a');R(x-1,y-5,1,6,'#3a1a10')}
  else if(t==='towel'){R(x-7,y-1,14,3,'#e8e8f0');R(x-7,y,14,1,'#a8b8d8')}
  else if(t==='vent'){R(x-12,y-18,24,18,'#7a7e86');R(x-12,y-18,24,2,'#9aa0a8');for(let i=0;i<5;i++)R(x-10+i*5,y-14,3,10,'#4a4e56')}
  else if(t==='puddle'){R(x-12,y-1,24,3,'rgba(150,180,210,.35)');R(x-6,y,8,1,'rgba(255,255,255,.3)')}
  else if(t==='cup'){R(x-2,y-4,4,4,'#d81e2a');R(x-2,y-4,4,1,'#f05060')}}}
for(const r of Object.keys(ENR)){if(!ROOMS[r]||typeof ROOMS[r].bg!=='function')continue;
 const ob=ROOMS[r].bg;ROOMS[r].bg=function(){ob.apply(this,arguments);guCache('enr_'+r,'',()=>enrichPaint(r));
  /* dust in the air */
  for(let i=0;i<6;i++){const q=(T*.03+hsh(i+r.length*31))%1;g.globalAlpha=.22*(1-q);R(20+hsh(i+r.length*7)*280,20+q*90,1,1,'#fff8e8');g.globalAlpha=1}}}

}
