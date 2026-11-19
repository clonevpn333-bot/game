'use strict';
/* =====================================================================
   HIGHSCHOOL — GLOW-UP, part two
   The rooms added after the forest glow-up, drawn properly: cached
   static layers (light, shade, texture, clutter) plus a few things that
   move. Same layouts, so nothing that walks around in them breaks.
   ===================================================================== */
/* ---------- helpers ---------- */
const GU={};
function guCache(id,key,draw){const k=id+'|'+key;if(!GU[k]){const c=document.createElement('canvas');c.width=W;c.height=H;const og=g;g=c.getContext('2d');g.imageSmoothingEnabled=false;try{draw()}finally{g=og}GU[k]=c}g.drawImage(GU[k],0,0)}
function guRGB(h){const n=parseInt(h.slice(1),16);return[n>>16,(n>>8)&255,n&255]}
function guGrad(y0,y1,c0,c1,x0,w){const a=guRGB(c0),b=guRGB(c1),n=Math.max(1,y1-y0);for(let y=y0;y<y1;y++){const t=(y-y0)/n;R(x0||0,y,w||W,1,`rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`)}}
function guSpeck(x0,y0,w,h,n,cols,seed){for(let i=0;i<n;i++)R(x0+hsh(seed+i)*w,y0+hsh(seed+i+.5)*h,1,1,cols[i%cols.length])}
function guBlock(x0,y0,w,h,bw,bh,base,seed){/* painted cinder block */
 R(x0,y0,w,h,base);const c=guRGB(base);
 for(let r=0;r*bh<h;r++)for(let k=-1;k*bw<w;k++){const x=x0+k*bw+(r%2)*(bw>>1),y=y0+r*bh,v=(hsh(seed+r*31+k*7)-.5)*14;
  R(x+1,y+1,bw-2,bh-2,`rgb(${c[0]+v|0},${c[1]+v|0},${c[2]+v|0})`);R(x+1,y+1,bw-2,1,'rgba(255,255,255,.12)');R(x,y,bw,1,'rgba(0,0,0,.14)');R(x,y,1,bh,'rgba(0,0,0,.1)')}}
function guTiles(x0,y0,w,h,s,c1,c2,grout,seed){for(let y=y0;y<y0+h;y+=s)for(let x=x0;x<x0+w;x+=s){R(x,y,s,s,hsh(seed+x*.3+y*.7)<.5?c1:c2);R(x,y,s,1,grout);R(x,y,1,s,grout)}}
function guFloorShine(y0,h,a){g.globalAlpha=a||.08;for(let i=0;i<5;i++)R(20+i*64,y0+4,30,h-8,'#fff');g.globalAlpha=1}
function guShaft(x,y,w,len,slope,col,a){g.globalAlpha=a||.08;for(let i=0;i<len;i+=2)R(x+i*slope,y+i,w+i*.4,2,col||'#fff8e0');g.globalAlpha=1}
function guLight(x,y,w){R(x-w/2,y,w,3,'#f4f8f8');R(x-w/2,y+3,w,1,'#a8b0b4');g.globalAlpha=.07;for(let k=0;k<5;k++)R(x-w/2-6-k*6,y+4+k*8,w+12+k*12,8,'#fffbe8');g.globalAlpha=1}
function guPoster(x,y,w,h,bg,lines,fg){R(x+1,y+1,w,h,'rgba(0,0,0,.25)');R(x,y,w,h,bg);R(x+1,y+1,w-2,1,'rgba(255,255,255,.3)');(lines||[]).forEach((l,i)=>pxc(l,x+w/2,y+3+i*7,fg||'#2a2a3a'));R(x+w/2-1,y-1,2,2,'#c03030')}

/* =====================================================================
   THE STAIRWELL
   ===================================================================== */
if(ROOMS.stairwell){
 const S0={x0:96,x1:250,y0:162,y1:96},n=12,dx=(S0.x1-S0.x0)/n,dy=(S0.y0-S0.y1)/n;
 const lineY=x=>S0.y0-((x-S0.x0)/(S0.x1-S0.x0))*(S0.y0-S0.y1);
 function stairStatic(){
  /* walls: cream block above, a painted band that climbs with the stairs */
  guBlock(0,0,W,180,24,8,'#d8ceb4',11);
  for(let x=0;x<W;x++){const ly=x<S0.x0?S0.y0:x>S0.x1?S0.y1:lineY(x);const top=Math.round(ly-38);R(x,top,1,Math.max(0,ly-top),'rgba(42,90,104,.55)');R(x,top,1,2,'#2a5a68')}
  R(0,0,W,8,'#a8a090');R(0,8,W,1,'rgba(0,0,0,.25)');
  /* window on the half landing, wired glass */
  R(146,12,80,54,'#6a6a72');R(149,15,74,48,'#a8c8dc');guGrad(15,63,'#c8e0f0','#8ab0c8',149,74);
  for(let i=0;i<74;i+=6)R(149+i,15,1,48,'rgba(255,255,255,.25)');for(let j=0;j<48;j+=6)R(149,15+j,74,1,'rgba(255,255,255,.25)');
  R(185,15,2,48,'#6a6a72');R(149,38,74,2,'#6a6a72');R(144,64,84,3,'#8a8a92');
  /* signs */
  R(18,36,26,26,'#1e3a5a');R(18,36,26,2,'#3a5a7a');pxc('1',31,44,'#f4f0e6');px('FLOOR',21,54,'#a8c0d8');
  R(270,10,26,26,'#4a2a5a');R(270,10,26,2,'#6a4a7a');pxc('2',283,18,'#f4f0e6');px('FLOOR',273,28,'#c8a8d8');
  R(276,40,28,9,'#1a6a3a');R(277,41,26,7,'#2aa84a');px('EXIT',280,42,'#e8ffe8');
  guPoster(52,60,30,20,'#f4e8c8',['NO','SITTING','ON STAIRS'],'#a02020');
  R(24,102,6,16,'#c02020');R(25,100,4,3,'#2a2a2a');R(26,104,2,10,'#e04040');
  /* scuffs, gum, graffiti */
  for(let i=0;i<30;i++)R(hsh(i+60)*W,60+hsh(i+61)*100,3,1,'rgba(40,30,20,.15)');
  px('AIDAN WAS HERE',8,92,'rgba(60,40,40,.5)');px('class of 87',104,64,'rgba(120,40,40,.4)');px('ARJUN = L',236,62,'rgba(60,40,90,.5)');
  /* ground landing floor: linoleum */
  guTiles(0,140,S0.x0+6,40,10,'#b8b0a0','#aea694','#9a927e',3);R(0,140,S0.x0+6,1,'#7a725e');
  /* the space under the stairs: dark */
  for(let x=S0.x0;x<S0.x1;x++){const ly=lineY(x);g.globalAlpha=.85;R(x,ly+4,1,180-ly,'#3a342c');g.globalAlpha=1}
  R(S0.x0+18,150,16,12,'#5a5a62');R(S0.x0+19,149,14,2,'#7a7a82');R(S0.x0+40,154,20,10,'#8a6a42');R(S0.x0+42,152,16,2,'#a8885a');
  /* the stringer (side of the staircase) */
  for(let x=S0.x0-4;x<S0.x1;x++){const ly=lineY(x);R(x,ly+2,1,6,'#6e6656');R(x,ly+2,1,1,'#8a826e');R(x,ly+7,1,1,'#4a4438')}
  /* steps, back to front */
  for(let i=0;i<n;i++){const x=S0.x0+i*dx,top=S0.y0-(i+1)*dy;
   R(x,top,dx+1,dy+1,'#a69a82');R(x,top,dx+1,2,'#c8bc9e');R(x,top,dx+1,1,'#e0c040');R(x,top+dy-1,dx+1,1,'#7a6e5a');
   if(hsh(i+70)<.5)R(x+3+hsh(i)*6,top+1,1,1,'#e8e0f0');}
  /* top landing */
  R(S0.x1,S0.y1-2,W-S0.x1,3,'#c8bc9e');R(S0.x1,S0.y1-2,W-S0.x1,1,'#e0c040');guTiles(S0.x1,S0.y1+1,W-S0.x1,14,7,'#b0a894','#a69e8a','#8a826e',9);
  R(S0.x1,S0.y1+15,W-S0.x1,180,'#5a5244');R(S0.x1,S0.y1+15,W-S0.x1,2,'#3a342c');
  /* handrail: balusters + rail */
  for(let x=S0.x0+2;x<S0.x1;x+=6){const ly=lineY(x);R(x,ly-24,1,23,'#2e3a36');R(x+1,ly-24,1,23,'rgba(255,255,255,.12)')}
  for(let x=S0.x0-6;x<S0.x1;x++){const ly=Math.round(lineY(x)-25);R(x,ly,1,3,'#1e2a26');R(x,ly,1,1,'#5a6a64')}
  R(S0.x0-8,lineY(S0.x0)-26,4,27,'#1e2a26');
  for(let x=S0.x1;x<W;x+=7)R(x,S0.y1-24,1,22,'#2e3a36');R(S0.x1,S0.y1-26,W-S0.x1,3,'#1e2a26');R(S0.x1,S0.y1-26,W-S0.x1,1,'#5a6a64');
 }
 ROOMS.stairwell.bg=function(){
  guCache('stairwell','',stairStatic);
  guShaft(160,64,30,70,.7,'#fff8e0',.06);
  for(let i=0;i<8;i++){const q=(T*.06+i/8)%1;g.globalAlpha=.5*Math.sin(q*Math.PI);R(170+hsh(i)*40+q*30,66+q*60,1,1,'#fff8d8');g.globalAlpha=1}
  const flick=Math.sin(T*17)>.93;R(250,0,40,3,flick?'#8a8a80':'#f4f8f0');if(!flick){g.globalAlpha=.06;R(240,3,60,40,'#fffbe8');g.globalAlpha=1}
  R(282,52,6,4,Math.sin(T*2)>0?'#ff3030':'#802020');
 };
}

/* =====================================================================
   THE 43 (inside)
   ===================================================================== */
if(ROOMS.busride){
 function busStatic(){
  guGrad(0,24,'#dcdcd4','#b8b8b0');
  for(let i=0;i<6;i++){const x=6+i*54;R(x,4,46,10,['#c04040','#3a6ac8','#e8b040','#40a060','#8a4ac8','#2a2a3a'][i]);R(x+2,6,20,6,'rgba(255,255,255,.35)');px(['DENTIST','LAWYER','PIZZA','JESUS','VAPE','SHOP'][i],x+24,7,'#fff')}
  R(0,18,W,2,'#8a8a84');for(let i=24;i<W;i+=96)R(i,19,46,3,'#f4f4ec');
  /* wall under the windows: ribbed plastic */
  guGrad(80,108,'#5a6a8a','#3a4a68');for(let x=0;x<W;x+=4)R(x,82,1,24,'rgba(0,0,0,.12)');R(0,80,W,2,'#2a3248');R(0,92,W,1,'#e0c040');
  for(let i=0;i<14;i++)R(hsh(i+5)*W,84+hsh(i+6)*20,4,1,'rgba(255,255,255,.07)');
  /* floor: ribbed rubber */
  guGrad(106,180,'#3a3a40','#24242a');for(let y=110;y<180;y+=3)R(0,y,W,1,'rgba(255,255,255,.04)');R(0,106,W,2,'#e0c040');
  for(let i=0;i<30;i++)R(hsh(i+20)*W,112+hsh(i+21)*64,2,1,['#c8c8c8','#e8a0c8','#8ac8e8'][i%3]);
 }
 const SC=[40,96,152,208,264];
 function seatBack(x,y){
  R(x+3,y-26,12,30,'#16306a');R(x+4,y-26,10,1,'#3a5ab0');R(x+3,y-25,1,28,'#2a4a9a');R(x+14,y-25,1,28,'#0e2050');
  for(let k=0;k<26;k+=2)for(let j=0;j<10;j+=2)if((k+j)%4===0)R(x+4+j,y-24+k,1,1,'#3a5aa8');
  R(x+2,y-29,14,3,'#c8c8d0');R(x+2,y-29,14,1,'#fff');R(x+3,y-27,2,2,'#8a8a92');R(x+13,y-27,2,2,'#8a8a92');
  R(x-9,y-5,24,8,'#16306a');R(x-9,y-5,24,2,'#3a5ab0');for(let j=0;j<22;j+=2)if(j%4===0)R(x-8+j,y-2,1,1,'#3a5aa8');R(x-9,y+3,24,1,'#0a1430');
  R(x-6,y+4,3,8,'#6a6a72');R(x+10,y+4,3,8,'#6a6a72');g.globalAlpha=.3;R(x-10,y+11,28,2,'#000');g.globalAlpha=1}
 ROOMS.busride.bg=function(){
  guCache('busride','',busStatic);
  const night=D&&D.period>=8,sky=night?['#141432','#22224a','#3a2a4a']:['#e8945a','#eeb07e','#f2cca0'];
  for(let wx=4;wx<W;wx+=64){
   g.save();g.beginPath();g.rect(wx+1,25,56,53);g.clip();
   for(let i=0;i<3;i++)R(wx,25+i*18,58,18,sky[i]);
   const off=(T*(D&&D.f&&D.f.busStopped?0:46))%240;
   for(let b=-1;b<6;b++){const bx=wx+((b*48-off)%240+240)%240-60,h=20+((b*37+wx)%3)*10;R(bx,78-h,40,h,night?'#10101e':'#6a5658');R(bx,78-h,40,2,night?'#1e1e30':'#7a6668');for(let r=0;r<3;r++)for(let c=0;c<3;c++)if((b+r+c+wx)%3)R(bx+5+c*12,80-h+4+r*8,5,4,night?'#f0d070':'#c8b8a8')}
   for(let p=0;p<4;p++){const px_=wx+((p*80-off*1.6)%240+240)%240-60;R(px_,50,2,28,'#2a2a2a');R(px_-6,48,14,3,'#2a2a2a');if(night){g.globalAlpha=.3;R(px_-8,50,18,10,'#f0d070');g.globalAlpha=1}}
   g.globalAlpha=.12;R(wx+6,27,10,50,'#fff');R(wx+20,27,4,50,'#fff');g.globalAlpha=1;
   g.restore();
   R(wx-2,23,62,3,'#3a3a40');R(wx-2,77,62,4,'#3a3a40');R(wx-2,23,3,58,'#3a3a40');R(wx+57,23,3,58,'#3a3a40');R(wx-1,24,60,1,'#6a6a72');
  }
  for(let i=40;i<W;i+=96){R(i,22,3,86,'#e0b020');R(i,22,1,86,'#f8e080');R(i-1,60,5,4,'#c02020');R(i,61,3,1,'#ff6060')}
  for(const x of SC){seatBack(x,131);seatBack(x,157)}
  if(D&&D.f&&D.f.busTilt)fxState.shake=Math.max(fxState.shake||0,.2);
 };
 ROOMS.busride.items=[];
}

/* =====================================================================
   SCIENCE WING
   ===================================================================== */
if(ROOMS.wing_sci){
 function sciStatic(){
  guGrad(0,112,'#e4ece4','#c8d4c8');R(0,0,W,10,'#b8c4b8');R(0,10,W,1,'rgba(0,0,0,.2)');
  guTiles(0,62,W,44,6,'#d8e8dc','#cce0d0','#aac0b0',21);R(0,62,W,2,'#4a7a62');R(0,104,W,8,'#3a5a4a');R(0,104,W,1,'#5a8a72');
  for(const x of[50,160,270])guLight(x,11,40);
  /* periodic table */
  R(8,18,64,40,'#3a4a42');R(10,20,60,36,'#f4f0e6');for(let r=0;r<5;r++)for(let c=0;c<9;c++)if(!(r===0&&c>0&&c<8))R(12+c*6.4,22+r*6,5,5,['#e8a0a0','#a0c8e8','#e8e0a0','#a0e8b0','#d0a0e8'][(r*3+c)%5]);px('PERIODIC',14,52,'#3a5a4a');
  /* goggles sign + eyewash */
  R(80,22,36,34,'#e8c830');R(82,24,32,30,'#1e1e1e');pxc('GOGGLES',98,28,'#e8c830');pxc('ON.',98,36,'#e8c830');R(90,44,16,6,'#7ab8c8');R(97,44,2,6,'#1e1e1e');
  R(128,30,26,40,'#3a8a5a');R(130,32,22,36,'#4aa86a');pxc('EYE',141,36,'#e8ffe8');pxc('WASH',141,44,'#e8ffe8');R(136,54,10,8,'#c8f0e0');R(140,62,2,8,'#8a8a8a');
  /* display case with a skeleton */
  R(222,20,36,40,'#5a4a32');R(224,22,32,36,'#a8c8d0');g.globalAlpha=.4;R(224,22,32,36,'#e8f4f8');g.globalAlpha=1;
  R(238,26,4,4,'#f4f0e6');R(239,30,2,14,'#f4f0e6');for(let i=0;i<4;i++)R(235,32+i*3,10,1,'#f4f0e6');R(236,44,1,10,'#f4f0e6');R(243,44,1,10,'#f4f0e6');px('MR BONES',226,52,'#3a3a3a');
  /* fire blanket, flask poster */
  R(170,70,14,18,'#c02020');px('FIRE',171,74,'#fff');guPoster(186,70,22,24,'#f4f0e6',['DONT','LICK','IT'],'#3a5a4a');
  /* floor: speckled terrazzo */
  guGrad(112,180,'#c8d0c4','#a8b0a4');guSpeck(0,112,W,68,400,['#8a9286','#e8ece4','#7a8a7e','#d0d8cc'],77);
  R(0,112,W,2,'#7a8a7e');guFloorShine(116,60,.06);
 }
 ROOMS.wing_sci.bg=function(){guCache('wing_sci','',sciStatic);g.globalAlpha=.25+Math.sin(T*3)*.1;R(186,42,24,20,'#a0ffb0');g.globalAlpha=1;for(let i=0;i<3;i++){const q=(T*.4+i/3)%1;g.globalAlpha=(1-q)*.3;R(196+Math.sin(T+i)*3,40-q*30,3,3,'#a0ffb0');g.globalAlpha=1}};
}

/* =====================================================================
   ARTS WING (upstairs)
   ===================================================================== */
if(ROOMS.wing_arts){
 function artsStatic(){
  guGrad(0,112,'#f0dcc0','#d8c0a0');R(0,0,W,8,'#c8b090');R(0,8,W,1,'rgba(0,0,0,.2)');
  for(const x of[60,200])guLight(x,9,40);
  /* a wall of student art */
  for(let i=0;i<22;i++){const x=6+(i%11)*22,y=16+Math.floor(i/11)*24+(hsh(i)*4|0),w=16+(hsh(i+3)*4|0),h=18;R(x+1,y+1,w,h,'rgba(0,0,0,.2)');R(x,y,w,h,'#f4f0e6');
   const t=i%4;if(t===0){R(x+2,y+2,w-4,h-4,['#f0a0a0','#a0c8f0','#f0e0a0'][i%3]);R(x+5,y+6,6,6,['#c03030','#3060c0','#e0a020'][(i+1)%3])}else if(t===1){for(let k=0;k<5;k++)R(x+2+k*3,y+4+hsh(i*7+k)*8,2,6,['#e04060','#40a0e0','#60c060'][k%3])}else if(t===2){R(x+w/2-3,y+3,6,6,'#e8c8a0');R(x+w/2-2,y+5,1,1,'#1a1a1a');R(x+w/2+1,y+5,1,1,'#1a1a1a');R(x+w/2-2,y+10,4,7,'#4a6ac0')}else{for(let k=0;k<4;k++)R(x+2+hsh(i+k)*(w-6),y+2+hsh(i*3+k)*(h-6),4,4,['#a050c0','#e08030','#30a0a0','#e0e040'][k])}
   R(x+w/2-1,y-1,2,2,'#c03030')}
  /* mural band */
  R(0,66,250,34,'#3a2a4a');for(let x=0;x<250;x+=2){const y=80+Math.sin(x*.05)*8+Math.sin(x*.13)*3;R(x,y,2,100-y,['#e04060','#e08030','#e0c040','#60c060','#40a0e0','#8050c0'][Math.floor(x/42)%6])}
  pxc('THE ARTS ARE ALIVE',124,70,'#f4f0e6');
  R(0,100,W,6,'#8a5a3a');R(0,100,W,1,'#a87a52');
  /* clay shelf */
  R(256,62,58,4,'#8a6a4a');for(let i=0;i<5;i++){const x=260+i*11;R(x,52-(i%2)*4,8,10+(i%2)*4,['#c88a5a','#a86a4a','#d8a070'][i%3]);R(x+2,50-(i%2)*4,4,2,'#8a5a3a')}
  /* wood floor with paint */
  for(let y=112;y<180;y+=6){R(0,y,W,6,(y/6)%2?'#b08a62':'#a8825a');R(0,y,W,1,'#8a6a4a');for(let x=(y*7)%40;x<W;x+=40)R(x,y,1,6,'#8a6a4a')}
  for(let i=0;i<40;i++){const x=hsh(i+90)*W,y=114+hsh(i+91)*64;R(x,y,2+hsh(i)*3,1+hsh(i+2)*2,['#e04060','#40a0e0','#e0c040','#60c060','#f4f0e6'][i%5])}
  guFloorShine(116,60,.05);
 }
 ROOMS.wing_arts.bg=function(){guCache('wing_arts','',artsStatic);for(let i=0;i<4;i++){const q=(T*.6+i/4)%1;R(270+i*10,46-q*30,2,3,'rgba(90,60,110,.5)')}};
}

/* =====================================================================
   SPORTS WING
   ===================================================================== */
if(ROOMS.wing_sports){
 function sportsStatic(){
  guBlock(0,0,W,106,24,8,'#5a7aa8',41);R(0,0,W,8,'#2a3a5a');R(0,8,W,1,'rgba(0,0,0,.3)');
  for(const x of[80,240])guLight(x,9,44);
  /* trophy case, lit */
  R(8,20,78,58,'#3a2a1a');R(11,23,72,52,'#1e2a3a');guGrad(23,75,'#3a5a7a','#1e2a3a',11,72);
  R(11,48,72,2,'#a88a5a');for(let i=0;i<5;i++){const x=16+i*14;R(x,36-(i%2)*4,8,12+(i%2)*4,'#d8b040');R(x-1,32-(i%2)*4,10,4,'#e8c850');R(x+2,48,4,2,'#8a6a2a')}
  for(let i=0;i<4;i++){const x=18+i*16;R(x,62,10,10,'#c0c0c8');R(x+3,58,4,4,'#e8e8f0')}
  g.globalAlpha=.18;R(14,23,6,52,'#fff');R(30,23,2,52,'#fff');g.globalAlpha=1;pxc('TROPHIES',47,25,'#f4f0e6');
  /* banner + team photos */
  R(98,18,84,20,'#c02030');R(98,18,84,2,'#e04050');pxc('GO HIGHGATE',140,24,'#f4f0e6');R(98,38,84,2,'#8a1020');for(let i=0;i<7;i++)R(100+i*12,40,8,5,'#c02030');
  for(let i=0;i<3;i++){R(100+i*28,52,24,18,'#2a2a2a');R(102+i*28,54,20,14,'#8ab0c8');for(let k=0;k<4;k++)R(104+i*28+k*5,60,3,6,'#3a3a4a')}
  /* water fountain */
  R(190,62,20,42,'#c8c8d0');R(192,66,16,8,'#e8e8f0');R(199,60,2,6,'#888');R(188,104,24,2,'#8a8a92');
  /* gym mats stacked */
  R(214,80,46,24,'#2a4a8a');for(let i=0;i<4;i++)R(214,80+i*6,46,1,'#1a2a5a');R(214,80,46,1,'#4a6aaa');
  R(0,104,W,4,'#2a3a5a');
  /* polished wood floor with court lines */
  for(let y=108;y<180;y+=5){R(0,y,W,5,(y/5)%2?'#d8a868':'#cfa060');R(0,y,W,1,'rgba(120,80,40,.25)')}
  R(0,150,W,2,'#c03030');R(0,128,W,1,'rgba(255,255,255,.4)');g.globalAlpha=.12;R(0,108,W,72,'#fff');g.globalAlpha=1;guFloorShine(112,60,.1);
 }
 ROOMS.wing_sports.bg=function(){guCache('wing_sports','',sportsStatic);g.globalAlpha=.4;R(197,57,4,4,'#a0d0f0');g.globalAlpha=1;if(Math.sin(T*.7)>.95){g.globalAlpha=.3;R(11,23,72,52,'#fff');g.globalAlpha=1}};
}

/* =====================================================================
   WALKWAY TO THE PORTABLES
   ===================================================================== */
if(ROOMS.walkway){
 function walkStatic(key){
  const eve=key==='eve';
  guGrad(0,74,eve?'#e8a070':'#7aa8d0',eve?'#f0c8a0':'#c8dcec');
  /* far trees and fence */
  for(let i=0;i<20;i++){const x=hsh(i+40)*W,r=10+hsh(i+41)*8;for(let y=-r;y<r;y+=2)for(let k=-r;k<r;k+=2)if(k*k+y*y<r*r&&hsh(i*9+k+y*3)>.2)R(x+k,62+y*.6,2,2,hsh(i+k+y)<.5?'#4a7a4a':'#5a8a52')}
  for(let x=0;x<W;x+=3){R(x,58,1,18,'rgba(160,170,180,.5)')}R(0,58,W,1,'#a8b0b8');R(0,66,W,1,'rgba(160,170,180,.4)');for(let x=0;x<W;x+=40)R(x,56,2,20,'#8a929a');
  /* grass */
  guGrad(74,112,'#6aa05a','#4a8040');for(let i=0;i<220;i++){const x=hsh(i+60)*W,y=76+hsh(i+61)*34;R(x,y,1,2,i%3?'#3a7030':'#7ab868')}
  /* the portable */
  R(206,24,108,56,'#c8b48c');for(let x=206;x<314;x+=4)R(x,24,1,56,'rgba(0,0,0,.08)');R(206,24,108,3,'#a8946c');R(204,22,112,3,'#8a7a5a');
  for(let i=0;i<3;i++){R(214+i*30,36,20,14,'#5a6a7a');R(216+i*30,38,16,10,'#9ac0d8');R(216+i*30,38,16,2,'#c8e0f0')}
  R(230,62,10,12,'#a8a8b0');for(let i=0;i<3;i++)R(231,64+i*3,8,1,'#6a6a72');pxc('PORTABLE 4',260,28,'#5a4a3a');
  R(206,80,108,6,'#6a6a62');for(let i=0;i<6;i++)R(210+i*20,80,4,14,'#5a5a52');
  /* covered walkway roof + posts */
  R(0,8,W,8,'#7a7a82');R(0,16,W,3,'#5a5a62');R(0,8,W,1,'#9a9aa2');for(let i=0;i<W;i+=12)R(i,8,1,8,'rgba(0,0,0,.1)');
  for(let x=10;x<W;x+=50){R(x,19,4,93,'#8a8a92');R(x,19,1,93,'#aaaab2');R(x-2,108,8,4,'#6a6a72')}
  /* path: concrete slabs, cracks, weeds */
  guGrad(112,180,'#b8b8b0','#9a9a92');for(let x=0;x<W;x+=32){R(x,112,1,68,'#8a8a84')}R(0,112,W,2,'#7a7a74');
  for(let i=0;i<10;i++){const x=hsh(i+80)*W,y=118+hsh(i+81)*50;for(let k=0;k<8;k++)R(x+k*2,y+Math.sin(k)*2,2,1,'#7a7a72')}
  for(let i=0;i<12;i++){const x=hsh(i+90)*W;R(x,112,1,3,'#5a8a40');R(x+1,111,1,3,'#6a9a48')}
 }
 ROOMS.walkway.bg=function(){const eve=D&&D.period>=7;guCache('walkway',eve?'eve':'day',()=>walkStatic(eve?'eve':'day'));for(let i=0;i<3;i++)cloud((i*120+T*3)%400-60,8+i*9+20,1)};
}

/* =====================================================================
   LOCKER ROOM
   ===================================================================== */
if(ROOMS.lockers){
 function lockStatic(){
  guTiles(0,0,W,112,8,'#c8d4cc','#bcc8c0','#9aaaa0',51);R(0,0,W,6,'#7a8a80');
  for(const x of[70,230])guLight(x,6,40);
  for(let i=0;i<12;i++){const x=6+i*26;R(x,16,24,90,'#3a6a5a');R(x+1,17,22,88,'#4a7a6a');R(x+1,17,1,88,'#6a9a8a');R(x+22,17,1,88,'#2a4a3a');
   for(let j=0;j<5;j++)R(x+5,22+j*3,14,1,'#2a4a3a');R(x+18,58,2,6,'#c8c8c8');px(String(100+i),x+5,92,'#e8f0e8');if(hsh(i)<.3)R(x+4,70,8,6,['#e04060','#e0c040','#40a0e0'][i%3])}
  /* bench */
  R(30,132,260,6,'#8a6a4a');R(30,132,260,1,'#a8885a');R(34,138,3,14,'#5a5a5a');R(284,138,3,14,'#5a5a5a');R(150,138,3,14,'#5a5a5a');
  R(60,128,14,4,'#e8e8e0');R(200,126,10,6,'#c03030');R(240,128,16,3,'#4a6ac8');
  /* tiled floor with drain */
  guTiles(0,112,W,68,10,'#d0d0c8','#c4c4bc','#a8a8a0',61);R(156,160,10,4,'#5a5a5a');for(let i=0;i<4;i++)R(157+i*2,161,1,2,'#2a2a2a');
  for(let i=0;i<8;i++)R(hsh(i+70)*W,116+hsh(i+71)*60,6,2,'rgba(150,180,200,.3)');
 }
 ROOMS.lockers.bg=function(){guCache('lockers','',lockStatic);g.globalAlpha=.15;for(let i=0;i<8;i++){const q=(T*.2+i/8)%1;R(hsh(i)*W,100-q*90,18,10,'#fff')}g.globalAlpha=1};
}

/* =====================================================================
   THE OLD BOILER ROOM
   ===================================================================== */
if(ROOMS.boiler){
 function boilStatic(){
  guBlock(0,0,W,112,16,6,'#3a2a22',81);g.globalAlpha=.5;R(0,0,W,112,'#140c0a');g.globalAlpha=1;
  for(let i=0;i<4;i++){const y=12+i*18;R(0,y,W,5,'#4a4a4a');R(0,y,W,1,'#7a7a7a');R(0,y+4,W,1,'#2a2a2a');for(let x=20+i*30;x<W;x+=90){R(x,y-2,6,9,'#5a5a5a');R(x+1,y-4,4,2,'#8a2a2a')}}
  /* the boiler */
  R(106,28,88,80,'#1a1612');R(110,32,80,72,'#2e2824');guGrad(32,104,'#3a3028','#1e1814',110,80);
  R(120,40,60,40,'#100c0a');R(146,40,8,40,'#4a1a10');for(let i=0;i<8;i++)R(118,86+i*2,64,1,'#3a3430');for(let i=0;i<6;i++)R(112+i*14,30,4,4,'#5a5a5a');
  R(150,14,12,16,'#2a2a2a');R(152,6,8,8,'#3a3a3a');
  /* the coal chute and the light from above */
  R(240,0,44,72,'#140e0c');R(250,0,24,72,'#070504');
  /* the names */
  px('OLLIE',226,92,'#8a7a6a');px('RAJ',260,92,'#8a7a6a');px('DANNY',226,99,'#8a7a6a');px('LOUISE',258,99,'#8a7a6a');px('WE WAITED',236,106,'rgba(140,120,100,.7)');
  /* floor: wet, dark, rubble */
  guGrad(112,180,'#241c16','#120c0a');guSpeck(0,112,W,68,260,['#2e241c','#3a2e24','#0a0806'],91);
  for(let i=0;i<6;i++){const x=hsh(i+95)*W,y=128+hsh(i+96)*40;R(x,y,20+hsh(i)*20,3,'#1e2a30');R(x+4,y,10,1,'#3a4a54')}
 }
 ROOMS.boiler.bg=function(){guCache('boiler','',boilStatic);
  g.globalAlpha=.22;for(let i=0;i<34;i++)R(250-i,i*2.2,22+i*2,3,'#d8e8f0');g.globalAlpha=1;
  for(let i=0;i<6;i++){const q=(T*.7+i/6)%1;R(60+i*48,q*112,1,2,'#6a8aa0')}
  if(Math.sin(T*1.3)>.9){g.globalAlpha=.4;R(120,40,60,40,'#ff6020');g.globalAlpha=1}};
}

/* =====================================================================
   THE ROOF
   ===================================================================== */
if(ROOMS.roof){
 function roofStatic(key){
  const eve=key==='eve';guGrad(0,82,eve?'#e88a5a':'#6a90b8',eve?'#f4c890':'#c8dce8');
  for(let i=0;i<16;i++){const x=i*22-6,h=18+hsh(i)*42;R(x,82-h,20,h,eve?'#5a4a5a':'#7a8494');R(x,82-h,20,1,eve?'#7a6a7a':'#9aa4b4');for(let r=0;r<h/8-1;r++)for(let c=0;c<3;c++)if(hsh(i*11+r*3+c)>.4)R(x+3+c*6,86-h+r*8,3,3,eve?'#f0d070':'#d8e0c8')}
  R(130,30,6,52,'#5a5a62');R(128,26,10,4,'#c03030');
  /* parapet and gravel */
  R(0,82,W,6,'#9a9a92');R(0,82,W,1,'#c8c8c0');R(0,88,W,1,'#5a5a52');
  guGrad(88,180,'#8a8a84','#6a6a64');guSpeck(0,88,W,92,500,['#5a5a54','#a8a8a0','#7a7a72','#9a9088'],111);
  /* AC units, vents, a hatch, a puddle */
  R(236,96,52,34,'#a8a8b0');R(236,96,52,2,'#c8c8d0');R(240,100,44,24,'#8a8a92');for(let i=0;i<6;i++)R(242,102+i*4,40,1,'#6a6a72');R(244,130,4,4,'#5a5a5a');R(276,130,4,4,'#5a5a5a');
  R(30,98,16,28,'#9a9aa0');R(28,94,20,4,'#b8b8c0');R(34,102,8,2,'#6a6a72');
  R(140,150,30,16,'#5a5a52');R(141,151,28,14,'#6a6a62');R(152,156,6,2,'#3a3a32');
  R(80,140,40,6,'#5a6a78');R(84,141,20,1,'#8a9aa8');
 }
 ROOMS.roof.bg=function(){const eve=D&&D.period>=7;guCache('roof',eve?'eve':'day',()=>roofStatic(eve?'eve':'day'));for(let i=0;i<3;i++)cloud((i*110+T*2)%400-60,10+i*8,1);if(Math.sin(T*2)>0)R(130,27,6,2,'#ff4040')};
}

/* =====================================================================
   SUPPLY CLOSET
   ===================================================================== */
if(ROOMS.closet){
 function closetStatic(){
  guBlock(0,0,W,112,20,8,'#3a342e',121);g.globalAlpha=.45;R(0,0,W,112,'#0e0a08');g.globalAlpha=1;
  for(const sy of[26,54,82]){R(10,sy,300,4,'#6a5a46');R(10,sy,300,1,'#8a7a62');R(10,sy+4,300,2,'#1e1610');
   for(let i=0;i<24;i++){const bx=14+i*12+(sy%7),h=10+(i%3)*2;R(bx,sy-h,10,h,['#e8e4dc','#c8b8a0','#8aa0b0','#d0c8b0','#a83a3a'][(i+sy)%5]);R(bx,sy-h,10,1,'rgba(255,255,255,.2)');if(i%5===0)px('A4',bx+1,sy-h+3,'#5a5a5a');if(i%7===3){R(bx+2,sy-h-6,6,6,'#3a6aa8');R(bx+3,sy-h-8,4,2,'#2a2a2a')}}}
  /* mop, bucket, chemicals */
  R(262,30,4,82,'#7a6a4a');R(256,100,16,14,'#8a8a92');R(258,98,12,2,'#a8a8b0');R(240,60,4,52,'#6a5a3a');R(232,104,20,8,'#c8c020');
  for(let i=0;i<4;i++){R(200+i*9,96,7,12,['#e0e040','#40c0e0','#e06040','#60e060'][i]);R(202+i*9,93,3,3,'#2a2a2a')}
  guGrad(112,180,'#2a241e','#14100c');guSpeck(0,112,W,68,150,['#3a3028','#1a1410'],131);
 }
 ROOMS.closet.bg=function(){guCache('closet','',closetStatic);
  const sw=Math.sin(T*1.2)*6;R(158+sw*.2,0,2,14,'#2a2a2a');R(155+sw*.3,14,8,6,'#f4e8a0');
  g.globalAlpha=.12;for(let i=0;i<20;i++)R(158+sw-i*3,20+i*7,6+i*6,7,'#fff2b0');g.globalAlpha=1};
}

/* =====================================================================
   THE STAFF ROOM
   ===================================================================== */
if(ROOMS.staffroom){
 function staffStatic(){
  guGrad(0,112,'#d8c8a8','#c0ae8c');R(0,0,W,6,'#a8987a');R(0,6,W,1,'rgba(0,0,0,.2)');for(let x=0;x<W;x+=30)R(x,6,1,100,'rgba(0,0,0,.05)');
  guLight(160,7,50);
  /* pigeonholes */
  R(12,18,84,52,'#8a6a4a');for(let r=0;r<4;r++)for(let c=0;c<6;c++){R(15+c*13.5,21+r*12,12,10,'#3a2a1a');if(hsh(r*6+c)<.6)R(16+c*13.5,25+r*12,10,6,['#f4f0e6','#e8e0c0','#f0c0c0'][(r+c)%3])}px('STAFF',38,62,'#f4f0e6');
  /* the note */
  R(110,16,100,30,'#f4f0e6');R(110,16,100,1,'#c8c4b8');pxc('WHOEVER ATE MY YOGURT',160,20,'#a02020');pxc('I KNOW WHERE YOU LIVE',160,28,'#a02020');pxc('- L',196,36,'#a02020');
  /* window */
  R(224,14,80,46,'#e8e4dc');R(227,17,74,40,'#9ac0d8');guGrad(17,57,'#b8d8ec','#8ab0c8',227,74);R(263,17,2,40,'#e8e4dc');
  /* fridge, coffee machine, counter */
  R(268,62,40,50,'#e8e8e0');R(268,62,40,1,'#fff');R(270,82,36,1,'#b8b8b0');R(302,66,2,12,'#a8a8a0');R(302,86,2,16,'#a8a8a0');for(let i=0;i<5;i++)R(272+i*6,66+(i%2)*4,5,5,['#f4f0a0','#f0c0c0','#c0e0f0'][i%3]);
  R(180,80,80,4,'#7a5a3a');R(180,84,80,28,'#8a6a4a');R(182,86,36,24,'#7a5a3a');R(222,86,36,24,'#7a5a3a');R(196,64,22,16,'#2a2a2a');R(198,66,18,6,'#4a4a4a');R(204,74,6,4,'#c03030');
  for(let i=0;i<4;i++)R(226+i*8,74,6,6,['#f4f0e6','#c06080','#6080c0','#e0c040'][i]);
  /* couch */
  R(20,92,110,18,'#6a4a3a');R(20,84,110,10,'#7a5a46');R(16,86,8,24,'#5a3a2a');R(126,86,8,24,'#5a3a2a');for(let i=0;i<3;i++)R(24+i*36,96,32,1,'#4a2a1a');
  /* carpet */
  guGrad(112,180,'#7a6a5a','#5a4a3e');guSpeck(0,112,W,68,300,['#6a5a4a','#8a7a6a','#4a3a30'],141);
  R(60,150,40,6,'#5a3a2a');R(140,140,18,4,'#c8b8a0');
 }
 ROOMS.staffroom.bg=function(){guCache('staffroom','',staffStatic);for(let i=0;i<3;i++){const q=(T*.5+i/3)%1;g.globalAlpha=(1-q)*.4;R(206+Math.sin(T+i)*2,62-q*16,2,3,'#e8e8e8');g.globalAlpha=1}};
}

/* the hallway doors go back on top of the new walls */
for(const r of['wing_sci','wing_arts','wing_sports','walkway']){const nb=ROOMS[r].bg;ROOMS[r].bg=function(){nb.call(this);if(D&&!D.weekend&&typeof drawWorldDoors==='function')drawWorldDoors(r)}}
