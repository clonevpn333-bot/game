'use strict';
/* =====================================================================
   HIGHSCHOOL — HOME, DRAWN PROPERLY
   The bedroom and kitchen, redrawn to the glow-up standard: furniture
   with tops, fronts and shadows, textured walls and floors, the morning
   coming in through the window and lying on the floor, and clutter that
   says somebody actually lives here.
   ===================================================================== */
/* a few drawing helpers */
function hBox(x,y,w,h,d,top,front,edge){ /* a block seen slightly from above: top face d tall */
 R(x,y,w,d,top);R(x,y+d,w,h-d,front);R(x,y+d,w,1,edge||'rgba(0,0,0,.25)');R(x,y,w,1,'rgba(255,255,255,.18)');R(x+w-1,y+d,1,h-d,'rgba(0,0,0,.18)')}
function hShadow(x,y,w,h,a){g.globalAlpha=a||.25;R(x,y,w,h,'#000');R(x+2,y+h,w-4,1,'#000');g.globalAlpha=1}
function hGrad(x,y,w,h,c1,c2,n){n=n||8;for(let i=0;i<n;i++){g.globalAlpha=.3*(1-i/n);R(x,y+Math.floor(h*i/n),w,Math.ceil(h/n),c2);}g.globalAlpha=1}
function hPlanks(y0,c1,c2,c3){for(let y=y0,r=0;y<H;y+=7,r++){R(0,y,W,7,r%2?c1:c2);R(0,y,W,1,'rgba(0,0,0,.18)');for(let x=((r*37)%60)-60;x<W;x+=60){R(x,y,1,7,c3)}for(let i=0;i<6;i++)R(((r*53+i*61)%W),y+3,8,1,'rgba(0,0,0,.08)')}
 hGrad(0,y0,W,24,'rgba(0,0,0,0)','#000',6)}
function hTape(x,y){R(x,y,4,2,'rgba(240,235,200,.7)')}

ROOMS.bedroom.bg=function(){
 guCache('bedroom2','',()=>{
  /* wall: navy with a diamond wallpaper, darker at the edges */
  R(0,0,W,112,'#34405e');
  for(let y=4;y<104;y+=8)for(let x=(y/8%2)*6;x<W;x+=12){R(x+5,y,2,1,'#3e4a6a');R(x+4,y+1,4,1,'#3e4a6a');R(x+5,y+2,2,1,'#3e4a6a')}
  g.globalAlpha=.25;R(0,0,30,112,'#0a0e1a');R(290,0,30,112,'#0a0e1a');g.globalAlpha=.12;R(0,0,W,10,'#000');g.globalAlpha=1;
  g.globalAlpha=.14;R(6,4,26,14,'#8a7a5a');R(12,16,14,8,'#8a7a5a');R(16,22,6,4,'#8a7a5a');g.globalAlpha=1; /* water stain */
  /* baseboard */
  R(0,104,W,8,'#262c44');R(0,104,W,1,'#566086');R(0,111,W,1,'#14182a');
  /* floor */
  hPlanks(112,'#6a4c34','#634630','#4a3424');
  /* window: frame, sill, blinds half down, plant */
  R(200,14,74,62,'#d8d0c0');R(202,16,70,58,'#a89c88');R(204,18,66,54,'#1a1a24');
  R(198,74,78,4,'#e8e0d0');R(198,78,78,2,'#a89c88');
  R(206,72,10,2,'#8a5a3a');R(207,64,8,8,'#c86a3a');for(let i=0;i<5;i++)R(206+i*2,58+(i%2)*2,2,7,'#3a8a4a');
  R(254,66,12,6,'#e8e2d6');R(256,64,8,2,'#f4f0e6');
  /* desk */
  hShadow(10,108,90,6,.3);
  hBox(8,82,92,26,4,'#8a6a4c','#6a4a32');for(let i=0;i<2;i++){R(58,92+i*8,36,7,'#5e4230');R(58,92+i*8,36,1,'#7a5a42');R(74,95+i*8,6,1,'#c8a870')}
  R(12,92,4,16,'#4a3424');R(50,92,4,16,'#4a3424');
  /* laptop with stickers, books, mug, lamp */
  R(22,66,32,16,'#2a2a32');R(24,68,28,12,'#141420');R(20,82,36,2,'#4a4a56');R(26,68,4,3,'#e05a7a');R(46,77,4,3,'#5ad0a0');
  R(62,74,6,8,'#c83a3a');R(68,72,6,10,'#3a5a8a');R(74,75,5,7,'#e8c870');R(62,74,17,1,'rgba(255,255,255,.2)');
  R(84,76,8,6,'#e8e2d6');R(91,77,2,3,'#e8e2d6');R(85,75,6,1,'#7a4a2a');
  R(14,80,4,2,'#f4f0e6');R(14,76,10,4,'#f4f0e6');R(16,74,8,2,'#e8e2d6');
  R(92,52,2,24,'#3a3a3a');R(90,74,6,2,'#2a2a2a');R(86,48,12,6,'#d8b048');R(88,54,8,1,'#f0d070');
  /* desk chair */
  R(30,96,22,4,'#2a3a6a');R(32,86,18,10,'#3a4a8a');R(32,86,18,1,'#5a6aaa');R(40,100,2,8,'#3a3a3a');R(32,107,18,2,'#2a2a2a');
  /* the shelf over the desk with what you can take */
  R(10,40,90,3,'#8a6a4c');R(10,43,90,1,'#3a2a1a');R(16,43,2,5,'#5a4230');R(90,43,2,5,'#5a4230');
  R(16,28,7,12,'#2a7a3a');R(17,27,5,1,'#c8c8c8');R(18,31,3,5,'#f0f070');R(16,28,1,12,'rgba(255,255,255,.2)');
  R(30,36,12,4,'#a8a8a8');R(35,22,2,14,'#c8c8c8');R(34,21,4,2,'#8a8a8a');R(30,34,12,1,'#d8d8d8');
  R(48,31,10,9,'#8a8a92');R(51,34,4,3,'#4a4a52');R(48,31,10,1,'#b8b8c0');
  R(64,31,8,7,'#c8b040');R(65,27,6,4,'#8a8a8a');R(66,28,4,3,'#34405e');R(64,31,8,1,'#f0d870');
  R(76,28,16,12,'#f4f0e6');R(83,30,2,8,'#c83a3a');R(80,33,10,2,'#c83a3a');R(76,28,16,1,'#ffffff');
  /* corkboard with photos and a ticket */
  R(104,20,40,30,'#7a5a3a');R(106,22,36,26,'#b8905a');for(let i=0;i<20;i++)R(106+((i*13)%36),22+((i*7)%26),1,1,'#9a7444');
  R(108,24,10,8,'#f4f0e6');R(109,25,8,5,'#8ab0d0');R(122,26,9,9,'#f4f0e6');R(123,27,7,6,'#e8a888');R(133,24,7,10,'#f0d070');R(110,36,14,8,'#f4f0e6');R(111,37,12,2,'#c83a3a');R(128,38,12,8,'#e05a7a');
  for(const [x,y] of[[112,23],[126,25],[136,23],[116,35],[133,37]])R(x,y,1,1,'#c83a3a');
  /* closet: half open, clothes on the rail, a pile on the floor */
  R(104,54,44,58,'#5a4632');R(106,56,40,54,'#1a1410');R(108,60,36,1,'#8a8a8a');
  for(let i=0;i<6;i++){const cx=110+i*6;R(cx,60,1,3,'#8a8a8a');R(cx-2,63,5,16+(i%3)*4,['#3a5a8a','#c83a3a','#2a2a2a','#5a8a4a','#e8e2d6','#7a4a8a'][i])}
  R(126,56,20,54,'#6e5640');R(126,56,1,54,'#8a7258');R(128,80,2,4,'#c8b878');
  R(100,104,34,8,'#c83a3a');R(112,106,20,6,'#3a5a8a');R(104,102,12,4,'#e8e2d6');R(126,108,10,4,'#2a2a2a');
  /* posters */
  R(152,18,30,40,'#141414');R(154,20,26,36,'#c83a3a');pxc('DEAD',167,24,'#f4ead8');pxc('MALL',167,31,'#f4ead8');R(158,39,18,13,'#141414');R(161,41,12,9,'#f4ead8');R(163,43,2,2,'#141414');R(169,43,2,2,'#141414');R(164,47,6,1,'#141414');hTape(152,17);hTape(178,17);
  R(152,62,44,12,'#2a5a3a');R(152,62,44,1,'#4a8a5a');pxc('HAWKS',171,65,'#f0d070');R(196,62,6,6,'#2a5a3a');R(196,68,3,3,'#2a5a3a');
  R(184,22,14,18,'#f4f0e6');R(184,22,14,4,'#c83a3a');for(let r=0;r<3;r++)for(let c=0;c<3;c++)R(186+c*4,28+r*4,3,3,'#e8e2d6');
  /* string lights along the top (bulbs drawn live) */
  for(let x=0;x<W;x+=2)R(x,8+Math.round(Math.sin(x/22)*3),2,1,'#1a1a1a');
  /* nightstand + alarm clock */
  hShadow(180,108,26,5,.3);hBox(180,90,26,20,3,'#8a6a4c','#6a4a32');R(184,98,18,1,'#4a3424');R(192,100,2,2,'#c8a870');
  R(184,80,16,10,'#1a1a1a');R(184,80,16,1,'#3a3a3a');R(196,76,6,4,'#c8c0a8');
  /* bed: headboard, frame, mattress, duvet with folds, pillows, a plushie */
  hShadow(212,112,104,8,.35);
  R(304,60,12,52,'#6a4a32');R(302,58,16,4,'#8a6a4c');R(306,64,8,40,'#5a3e28');
  R(212,96,96,16,'#6a4a32');R(212,96,96,2,'#8a6a4c');R(212,110,96,2,'#4a3424');R(214,112,3,6,'#4a3424');R(302,112,3,6,'#4a3424');
  R(214,86,92,10,'#e8e2d6');
  R(212,80,82,18,'#4a5a9a');R(212,80,82,2,'#6a7abc');for(let i=0;i<6;i++){R(216+i*13,84+(i%2)*3,8,1,'#3a4a86');R(220+i*13,90-(i%2)*2,6,1,'#5a6aac')}R(212,96,82,2,'#34406e');
  for(let i=0;i<82;i+=8)R(212+i,80,4,1,'#8a9ad8');
  R(278,74,24,10,'#f4f0e6');R(278,74,24,1,'#ffffff');R(280,82,20,2,'#d8d0c0');R(284,70,14,6,'#e8e2d6');
  R(222,72,8,8,'#a8784a');R(221,70,3,3,'#a8784a');R(228,70,3,3,'#a8784a');R(224,75,1,1,'#1a1a1a');R(227,75,1,1,'#1a1a1a');
  /* rug */
  R(118,134,124,26,'#4a2a4a');R(120,136,120,22,'#6a3a5a');for(let i=0;i<6;i++){R(126+i*19,140,10,14,'#7a4a6a');R(129+i*19,143,4,8,'#8a5a7a')}
  for(let i=0;i<124;i+=3){R(118+i,132,1,2,'#c8a8b8');R(118+i,160,1,2,'#c8a8b8')}
  /* stuff on the floor */
  R(60,146,7,3,'#f4f0e6');R(58,148,4,2,'#f4f0e6');R(150,168,10,4,'#2a2a2a');R(262,150,14,6,'#2a3a6a');R(264,148,10,2,'#3a4a8a');R(28,160,8,6,'#e8c870');
 });
 /* live: sky through the window, clouds, a bird */
 R(204,18,66,54,'#f2c4a0');R(204,18,66,22,'#e8a088');R(204,40,66,10,'#f6d4b0');
 for(let i=0;i<3;i++){const x=204+((T*3+i*28)%86)-12;const x0=Math.max(204,x),w=Math.min(18,270-x0);if(w>0)R(x0,26+i*8,w,3,'rgba(255,255,255,.75)')}
 R(204,52,66,20,'#5a6a5a');for(let i=0;i<7;i++)R(204+i*10,48-(i%3)*2,9,6,'#4a5a4a');R(204,62,66,10,'#3a4a3a');
 {const bx=204+((T*8)%90);if(bx<268){const f=Math.sin(T*12)>0;R(bx,32,2,1,'#2a2a2a');R(bx-1,31+(f?0:2),1,1,'#2a2a2a');R(bx+2,31+(f?0:2),1,1,'#2a2a2a')}}
 /* blinds pulled half down, mullions */
 for(let y=18;y<40;y+=3){R(204,y,66,2,'#e8e4d8');R(204,y+1,66,1,'#c8c0b0')}R(236,18,2,54,'#d8d0c0');
 /* curtains */
 const sw=Math.sin(T*.8)*1.5;R(192+sw,12,12,66,'#8a3a4a');R(270-sw,12,12,66,'#8a3a4a');for(let i=0;i<3;i++){R(194+sw+i*3,14,1,62,'#6a2a3a');R(272-sw+i*3,14,1,62,'#6a2a3a')}R(190,10,94,3,'#5a4a3a');
 /* sunlight through the blinds, onto the floor */
 g.globalAlpha=.09;for(let i=0;i<40;i++){const y=74+i*2;R(206-i*1.7,y,64+i*.8,2,'#ffe2b8')}g.globalAlpha=1;
 g.globalAlpha=.1;for(let s=0;s<5;s++)R(150+s*14,118+s*2,9,30,'#ffe2b8');g.globalAlpha=1;
 for(let i=0;i<12;i++){const q=(T*.06+i*.083)%1;R(206+hsh(i)*60-q*36,76+q*44+Math.sin(T+i)*2,1,1,'rgba(255,240,210,.65)')}
 /* string lights twinkle */
 for(let i=0;i<14;i++){const x=10+i*22,y=10+Math.round(Math.sin(x/22)*3),on=Math.sin(T*2+i*1.7)>-.3;R(x,y,2,3,on?['#ffd27a','#ff8a9a','#8ad0ff'][i%3]:'#5a5a5a');if(on){g.globalAlpha=.18;R(x-3,y-2,8,8,['#ffd27a','#ff8a9a','#8ad0ff'][i%3]);g.globalAlpha=1}}
 /* laptop glow, lamp light, clock */
 const fl=.75+Math.sin(T*7)*.06;g.globalAlpha=fl;R(24,68,28,12,'#2a5aa0');R(26,70,16,1,'#c8e0ff');R(26,73,22,1,'#8ab0e0');R(26,76,12,1,'#8ab0e0');g.globalAlpha=1;
 g.globalAlpha=.08;R(16,58,46,30,'#6a9ae0');g.globalAlpha=.1;for(let i=0;i<16;i++)R(92-i*1.2,55+i*1.6,8+i*2.4,2,'#ffe8a0');g.globalAlpha=1;
 if(Math.sin(T*3)>-.2)pxc('7:15',192,82,'#ff4a3a');
 /* the cat */
 {const br=Math.sin(T*1.6)>0?1:0;R(244,72-br,20,8+br,'#e8a050');R(246,72-br,16,1,'#f0b868');R(260,68-br,7,6,'#e8a050');R(260,67-br,1,1,'#e8a050');R(265,67-br,1,1,'#e8a050');R(261,70-br,1,1,'#2a2a2a');R(264,70-br,1,1,'#2a2a2a');
  for(let i=0;i<3;i++)R(248+i*4,74-br,2,1,'#c8803a');const tf=Math.round(Math.sin(T*2.2)*2);R(239,77+tf,6,2,'#e8a050')}
};
LIGHT.bedroom=()=>({amb:.84,tint:[50,40,70],src:[[236,52,96,.38,[255,214,170]],[38,74,44,.22,[120,160,255]],[92,56,30,.2,[255,220,140]]]});

ROOMS.kitchen.bg=function(){
 guCache('kitchen2','',()=>{
  /* wall: warm cream with a faint stripe */
  R(0,0,W,112,'#e6d4a4');for(let x=0;x<W;x+=8)R(x,0,1,112,'#e0cc9a');g.globalAlpha=.12;R(0,0,W,8,'#000');g.globalAlpha=1;
  /* backsplash tiles with grout and shine */
  for(let y=56;y<84;y+=6)for(let x=(y%12?0:6)-6;x<162;x+=12){R(x,y,11,5,'#f4ecd8');R(x,y,11,1,'#ffffff');R(x+10,y,1,5,'#d8ccb0')}
  R(0,84,162,1,'#c8b890');
  /* upper cabinets: paneled doors */
  R(4,10,156,40,'#6a4630');for(let i=0;i<4;i++){const x=6+i*38;R(x,12,36,36,'#8a5e40');R(x+3,15,30,30,'#7a5236');R(x+4,16,28,1,'#9a6e4e');R(x+3,44,30,1,'#5e3e28');R(i%2?x+4:x+30,28,2,6,'#e8c870')}
  R(4,50,156,2,'#4a3020');
  /* window over the sink, blinds up, plants */
  R(46,52,48,30,'#e8e0d0');R(48,54,44,26,'#1a1a24');R(68,54,2,26,'#e8e0d0');R(48,66,44,2,'#e8e0d0');R(44,80,52,3,'#f4ecd8');
  R(50,74,8,6,'#c86a3a');for(let i=0;i<4;i++)R(51+i*2,68+(i%2)*2,2,7,'#3a8a4a');R(84,75,6,5,'#e8e2d6');R(85,72,4,3,'#5aa04a');
  /* counter: top surface with depth, cabinets below */
  R(2,84,160,3,'#e8e4dc');R(2,87,160,3,'#c8c4bc');R(2,90,160,1,'#8a8680');
  R(2,91,160,21,'#6e4630');for(let i=0;i<4;i++){const x=6+i*39;R(x,93,35,17,'#8a5a3c');R(x+2,95,31,13,'#7a4e34');R(x+3,96,29,1,'#9a6a4a');R(x+15,99,6,2,'#e8c870')}
  R(2,110,160,2,'#3a2618');
  /* sink */
  R(52,85,36,3,'#b8bcc4');R(56,86,28,2,'#7a7e88');R(68,72,2,13,'#c8ccd4');R(68,72,9,2,'#c8ccd4');R(76,74,1,2,'#c8ccd4');
  R(92,78,14,6,'#c8ccd4');for(let i=0;i<4;i++)R(94+i*3,72,1,6,'#e8e2d6');
  /* toaster, coffee maker, fruit bowl, knife block, paper towels */
  R(110,74,20,11,'#c8ccd4');R(112,74,16,2,'#e8ecf0');R(113,72,5,2,'#2a2a2a');R(121,72,5,2,'#2a2a2a');R(128,78,3,2,'#2a2a2a');
  R(136,64,18,21,'#2a2a2a');R(136,64,18,2,'#4a4a4a');R(139,74,12,10,'#3a2418');R(140,75,10,1,'#7a4a2a');R(150,68,2,2,'#e04040');
  R(12,80,22,5,'#e8e2d6');R(14,76,6,5,'#e04030');R(20,75,6,6,'#f0d040');R(25,77,6,4,'#7ac040');
  R(38,72,8,13,'#5a3a2a');for(let i=0;i<3;i++)R(39+i*2,68,1,4,'#2a2a2a');
  R(4,60,6,22,'#f4f0e6');R(4,60,6,1,'#ffffff');R(6,58,2,2,'#8a8a8a');
  /* fridge with depth, magnets, photos, the flyer */
  hShadow(166,110,42,5,.3);
  R(166,22,40,90,'#e4e4e0');R(166,22,40,2,'#f8f8f4');R(204,22,2,90,'#b8b8b4');R(166,56,40,2,'#a8a8a4');
  R(200,30,2,20,'#a8a8a8');R(200,62,2,26,'#a8a8a8');
  R(170,28,14,16,'#f4f0e6');R(170,28,14,3,'#c83a3a');pxc('MISSING',177,28,'#fff');R(173,32,8,8,'#d8b898');R(174,33,6,2,'#5a3a2a');R(175,35,1,1,'#1a1a1a');R(178,35,1,1,'#1a1a1a');R(171,41,12,1,'#8a8a8a');
  R(188,30,9,7,'#8ab0d0');R(189,31,7,4,'#5a8a5a');R(186,40,10,12,'#f4f0e6');for(let i=0;i<4;i++)R(187,42+i*2,8,1,'#8a8a9a');
  R(172,62,10,10,'#f0d070');R(174,64,6,6,'#e8a050');R(186,64,12,9,'#7aa0e0');R(188,66,8,5,'#f4f0e6');R(172,80,8,8,'#e05a7a');R(186,84,10,10,'#f4f0e6');R(187,85,8,6,'#c8a8e8');
  for(const [x,y,c] of[[182,46,'#e04040'],[176,76,'#40a0e0'],[194,78,'#f0c040']])R(x,y,3,3,c);
  /* wall clock + calendar + TV bracket */
  R(214,14,14,14,'#2a2a2a');R(215,15,12,12,'#f4f4f0');R(221,17,1,5,'#2a2a2a');R(221,21,3,1,'#2a2a2a');
  R(216,34,16,20,'#f4f0e6');R(216,34,16,5,'#3a7ac8');for(let r=0;r<3;r++)for(let c=0;c<3;c++)R(218+c*5,41+r*4,4,3,(r*3+c)%4?'#e8e2d6':'#e05a5a');
  R(236,20,58,38,'#141414');R(238,22,54,34,'#1a1a1a');R(262,58,6,8,'#3a3a3a');R(258,64,14,2,'#2a2a2a');
  /* pendant lamp over the table */
  R(258,0,2,64,'#2a2a2a');R(250,64,18,6,'#c8a040');R(252,70,14,2,'#f0d070');
  /* the front door, coat hooks, shoes, mat */
  R(298,26,22,86,'#5a3a26');R(300,28,20,84,'#7a4a2e');R(302,34,16,26,'#8a5a3e');R(302,64,16,40,'#8a5a3e');R(303,35,14,1,'#a06c48');R(303,65,14,1,'#a06c48');R(301,74,3,4,'#e8c870');R(306,40,8,10,'#b8d0e0');
  R(282,40,14,3,'#5a3a26');R(284,43,2,4,'#c8c8c8');R(291,43,2,4,'#c8c8c8');R(281,46,8,24,'#3a5a8a');R(288,46,8,18,'#8a3a3a');
  /* floor: checker tile with grout, darker toward the front */
  for(let y=112,r=0;y<H;y+=9,r++)for(let x=-((r%2)*10);x<W;x+=20){R(x,y,10,9,'#dcd2be');R(x+10,y,10,9,'#c4b8a2');R(x,y,20,1,'#b0a490')}
  hGrad(0,112,W,30,'rgba(0,0,0,0)','#000',6);
  R(290,150,26,8,'#7a3a3a');R(292,152,22,4,'#8a4a4a');R(276,150,8,4,'#2a2a2a');R(268,152,7,3,'#c83a3a');
  /* table with depth, chairs, breakfast */
  hShadow(214,148,80,6,.3);
  R(212,124,82,4,'#b08a60');R(212,128,82,4,'#8a6a48');R(212,132,82,1,'#5a4230');R(216,133,4,22,'#6a4a32');R(286,133,4,22,'#6a4a32');
  R(222,118,12,6,'#f4f0e6');R(224,117,8,2,'#e8c870');R(240,120,10,4,'#e8e2d6');R(252,116,6,8,'#f4f0e6');R(253,118,4,5,'#f0a040');R(266,118,14,6,'#e8e2d6');R(268,116,10,2,'#c86a3a');
  R(202,112,6,34,'#7a5a3a');R(202,112,6,2,'#9a7a5a');R(200,130,12,3,'#7a5a3a');R(296,112,6,34,'#7a5a3a');R(296,112,6,2,'#9a7a5a');R(294,130,12,3,'#7a5a3a');
 });
 /* live: the news */
 R(238,22,54,34,'#24345a');R(238,22,54,8,'#c83a3a');pxc('NEWS 9',265,23,'#fff');
 {const s=Math.round(Math.sin(T*.7)*2);R(256+s,34,10,12,'#d8b898');R(256+s,32,10,4,'#3a2a1a');R(259+s,38,1,1,'#1a1a1a');R(262+s,38,1,1,'#1a1a1a');R(259+s,42,4,1,'#8a3a3a');R(250,46,30,6,'#3a3a5a')}
 R(238,50,54,6,'#101014');{const txt=NEWS(),w=pxw(txt),x=292-((T*22)%(w+60));g.save();g.beginPath();g.rect(238,50,54,6);g.clip();px(txt,x,51,'#f0d070');g.restore()}
 g.globalAlpha=.07+Math.sin(T*9)*.02;R(228,16,74,48,'#8ab0e0');g.globalAlpha=1;
 /* window light, lamp glow, coffee steam, toast */
 R(48,54,20,12,'#bfe0f4');R(70,54,22,12,'#bfe0f4');R(48,68,20,12,'#8ab870');R(70,68,22,12,'#8ab870');
 for(let i=0;i<2;i++){const x=48+((T*4+i*30)%50);if(x<88)R(x,57+i*4,8,2,'rgba(255,255,255,.8)')}
 R(68,54,2,26,'#e8e0d0');R(48,66,44,2,'#e8e0d0');
 g.globalAlpha=.07;for(let i=0;i<28;i++)R(46-i*1.5,82+i*2,52+i,2,'#fff4d0');g.globalAlpha=1;
 g.globalAlpha=.12;for(let i=0;i<22;i++)R(259-i*2.2,72+i*2.4,1+i*4.4,2,'#ffe8a0');g.globalAlpha=1;
 g.globalAlpha=.45;for(let i=0;i<4;i++){const q=(T*.5+i/4)%1;R(143+Math.sin(T*2+i)*2,62-q*18,3,3,'#ffffff')}g.globalAlpha=1;
 {const q=(T%9)/9;if(q<.08){const h=Math.sin(q/.08*Math.PI)*8;R(114,72-h,4,4,'#d8a868');R(122,72-h,4,4,'#d8a868')}}
 {const a=T*.3;R(221,21,Math.round(Math.cos(a)*4)>=0?1:1,1,'#c83a3a')}
};
LIGHT.kitchen=()=>({amb:.9,tint:[70,55,30],src:[[70,66,70,.32,[255,240,205]],[259,90,60,.3,[255,220,140]],[265,40,46,.2,[150,180,255]]]});
