'use strict';
/* =====================================================================
   HIGHSCHOOL — ROOMS THAT MOVE
   Every main room gets its own moving parts on top of the painting, so
   nothing sits there like a postcard: steam, bubbling flasks, a ball
   bouncing in the gym, blossoms blowing across the field, cars on the
   road, an escalator that actually moves, arcade screens that play,
   a tap that drips. Most of it loops; some of it happens every so often
   (a can drops out of the vending machine, a book slides off a shelf,
   a paper airplane crosses the classroom).
   ===================================================================== */
const every=(per,len,off)=>{const q=((T+(off||0))%per);return q<len?q/len:-1};
const LIVE={
 canteen(){
  for(let i=0;i<7;i++){const x=22+i*20,q=(T*.45+i*.31)%1;g.globalAlpha=.35*(1-q);R(x+Math.sin(T*2+i)*2,64-q*22,3,4,'#ffffff');g.globalAlpha=1}
  {const k=every(11,1.2,3);if(k>=0){const y=40+Math.min(1,k*2)*56;R(286,y,5,7,'#c83a3a');R(286,y,5,1,'#e8e8e8')}}
  for(let i=0;i<4;i++)if(Math.sin(T*3+i*1.7)>.2)R(276+i*7,36,2,2,['#f04040','#40f080','#f0d040','#40a0f0'][i]);
  {const k=every(17,3,7);if(k>=0){const x=-6+k*340,y=166;R(x,y,4,2,'#3a2418');R(x-1,y+2,1,1,'#3a2418');R(x+4,y+2,1,1,'#3a2418');R(x+4,y-1,2,1,'#3a2418')}}
  g.globalAlpha=.07;for(let i=0;i<24;i++)R(176-i*1.5,66+i*2.6,74+i,2,'#fff6d0');g.globalAlpha=1;
  for(let i=0;i<8;i++){const q=(T*.05+i*.125)%1;R(180+hsh(i)*60-q*30,70+q*60,1,1,'rgba(255,250,220,.6)')}
 },
 library(){
  for(let i=0;i<14;i++){const q=(T*.04+i*.07)%1;R(130+hsh(i*3)*80+Math.sin(T*.7+i)*4,20+q*120,1,1,'rgba(255,240,200,.5)')}
  for(let i=0;i<3;i++){g.save();g.beginPath();g.rect(141+i*18,52,14,9);g.clip();for(let l=0;l<4;l++)R(142+i*18,52+((l*3+T*6+i*4)%12),8+((l*5)%5),1,'#a8f0c8');g.restore()}
  {const k=every(19,1.4,5);if(k>=0){const q=Math.min(1,k*1.6);R(60,40+q*q*90,6,8,'#a03030');R(60,40+q*q*90,1,8,'#c84a4a');if(k>.65){R(56,140,10,3,'#a03030')}}}
  {const f=Math.sin(T*9)>.6;R(463-320,142,20,1,f?'#fff8e8':'#e8e0d0')}
 },
 field(){
  for(let i=0;i<3;i++){const x=((T*4+i*120)%420)-60;R(x,10+i*9,30,5,'rgba(255,255,255,.8)');R(x+6,7+i*9,16,4,'rgba(255,255,255,.8)')}
  for(let i=0;i<16;i++){const q=(T*.12+i*.0625)%1;const x=40+hsh(i)*60+q*220+Math.sin(T*2+i)*6,y=20+q*120+Math.sin(T*3+i*2)*4;R(x,y,2,1,'#f8c8d8')}
  {const w=Math.sin(T*6);R(286,82,1,14,'#c8c8c8');R(287,82+(w>0?0:1),5,3,'#f04040');R(292,82+(w>0?1:0),3,3,'#e03030')}
  {const x=((T*30)%380)-30,legs=Math.sin(T*16)>0;R(x,150,3,6,'#3a5a9a');R(x,147,3,3,'#e8c0a0');R(x-(legs?1:0),156,1,2,'#2a2a2a');R(x+2+(legs?1:0),156,1,2,'#2a2a2a')}
  for(let i=0;i<20;i++){const x=hsh(i*5)*320,y=90+hsh(i*7)*50,s=Math.round(Math.sin(T*2+x*.05));R(x+s,y,1,3,'#5aa04a')}
 },
 gym(){
  {const q=Math.abs(Math.sin(T*2.4)),x=200+Math.sin(T*.6)*30;R(x,104-q*30,6,6,'#e0702a');R(x+2,104-q*30,1,6,'#3a1a0a');g.globalAlpha=.25;R(x-1,110,8-q*3,2,'#000');g.globalAlpha=1}
  for(let i=0;i<3;i++){const sw=Math.sin(T*1.3+i)*2;for(let y=20;y<96;y+=3)R(244+i*8+Math.round(sw*(y-20)/76),y,1,3,'#c8a060')}
  if(Math.sin(T*2)>0)pxc('HOME 21 · AWAY 3',230,8,'#ff5a3a');
 },
 bus(){
  {const k=every(9,3,0);if(k>=0){const x=-60+k*440;R(x,170,46,8,'#3a6ac8');R(x+8,165,28,6,'#3a6ac8');R(x+10,166,10,4,'#a8d0f0');R(x+22,166,10,4,'#a8d0f0');R(x+6,177,8,3,'#1a1a1a');R(x+32,177,8,3,'#1a1a1a')}}
  {const k=every(13,3.5,6);if(k>=0){const x=380-k*460;R(x,168,40,9,'#c83a3a');R(x+8,163,22,6,'#c83a3a');R(x+10,164,8,4,'#a8d0f0');R(x+4,176,8,3,'#1a1a1a');R(x+28,176,8,3,'#1a1a1a')}}
  for(let i=0;i<2;i++){const x=((T*3+i*170)%420)-60;R(x,8+i*10,26,4,'rgba(255,255,255,.8)')}
  for(let i=0;i<4;i++){const f=Math.sin(T*8+i*2)>0;R(150+i*9,28-(f?1:0),2,1,'#2a2a2a')}
 },
 english(){LIVE._class(84,14,230,58,76,40)},
 maths(){LIVE._class(82,14,236,80,70,24)},
 science(){LIVE._class(78,14,235,22,75,52)},
 _class(cx,cy,wx,wy,ww,wh){
  {const a=T*6.283/60;R(cx+Math.round(Math.cos(a-1.57)*3),cy+Math.round(Math.sin(a-1.57)*3),1,1,'#c83a3a')}
  for(let i=0;i<4;i++){const s=Math.round(Math.sin(T*1.5+i)*1);R(wx+6+i*18+s,wy+wh-12,10,6,'#4a8a4a')}
  {const x=wx+((T*5)%(ww+20))-10;if(x>wx&&x<wx+ww-14)R(x,wy+6,14,3,'rgba(255,255,255,.85)')}
  {const k=every(23,2.4,9);if(k>=0){const x=300-k*280,y=60+Math.sin(k*9)*10;R(x,y,6,2,'#f4f0e6');R(x+2,y-1,3,1,'#e8e2d6')}}
  for(let i=0;i<6;i++){const q=(T*.05+i*.16)%1;R(wx+hsh(i)*ww-q*30,wy+wh+q*50,1,1,'rgba(255,250,220,.5)')}
 },
 chem(){
  for(let s=0;s<3;s++)for(let i=0;i<5;i++){const q=(T*.8+i*.2+s*.33)%1;R(100+s*30+i*4,52-q*14,1,1,'rgba(160,255,180,'+(.8-q*.7)+')')}
  {const p=.5+Math.sin(T*2)*.25;g.globalAlpha=p*.35;R(240,108,64,20,'#6aff8a');g.globalAlpha=1;for(let i=0;i<6;i++){const q=(T*1.2+i*.17)%1;R(252+i*8,124-q*8,2,2,'rgba(200,255,200,'+(1-q)+')')}}
  if(Math.sin(T*40)>.9)R(20,28,44,1,'rgba(255,255,255,.3)');
  {const k=every(7,.3,2);if(k>=0){R(222,30,40,30,'#a8ffb8');g.globalAlpha=.3;R(214,24,56,42,'#a8ffb8');g.globalAlpha=1}}
 },
 foodcourt(){
  for(let i=0;i<8;i++){const q=(T*.25+i/8)%1;const x=164+q*58,y=118-q*76;R(x,y,10,2,'#8a8a92');R(x,y,10,1,'#b8b8c0')}
  for(let i=0;i<10;i++){const q=(T*1.5+i*.1)%1;R(158+Math.sin(i*3)*12*q,124-Math.sin(q*3.14)*10,1,2,'rgba(170,220,255,.8)')}
  for(let i=0;i<3;i++){const x=((T*14+i*120)%360)-20;R(x,24,3,8,['#5a3a6a','#3a5a3a','#6a3a3a'][i]);R(x,21,3,3,'#e8c0a0')}
  if(Math.sin(T*13)>-.8)R(330-320,32,90,1,'rgba(255,90,90,.6)');
 },
 arcade(){
  const cols=['#ff4a6a','#4aff9a','#4a9aff','#ffd24a','#d24aff'];
  for(let i=0;i<6;i++){const x=12+i*36,y=46;g.save();g.beginPath();g.rect(x,y,22,16);g.clip();for(let k=0;k<4;k++)R(x+((T*20*(k+1)+i*13)%30)-4,y+k*4,6,3,cols[(i+k)%5]);g.restore()}
  {const cx=242+Math.sin(T*.8)*8,cy=60+Math.max(0,Math.sin(T*.5))*14;R(cx,46,1,cy-46,'#c8c8c8');R(cx-3,cy,7,2,'#c8c8c8');R(cx-3,cy+2,1,3,'#c8c8c8');R(cx+3,cy+2,1,3,'#c8c8c8')}
  for(let i=0;i<20;i++)if(Math.sin(T*3+i*7)>.7)R(hsh(i)*320,114+hsh(i*3)*60,1,1,'#ff60c0');
 },
 toilets(){
  for(let i=0;i<3;i++){const q=(T*.9+i*.37)%1;R(30+i*42,74+q*30,1,2,'rgba(170,220,255,.9)');if(q>.92){R(28+i*42,104,5,1,'rgba(170,220,255,.6)')}}
  if(Math.sin(T*17)>.85){g.globalAlpha=.25;R(0,0,320,110,'#000');g.globalAlpha=1}
  {const sw=Math.sin(T*.9)*2;R(276+sw,36,2,70,'rgba(0,0,0,.25)')}
 }
};
for(const r in LIVE){if(r[0]==='_'||!ROOMS[r])continue;const ob=ROOMS[r].bg;ROOMS[r].bg=function(){ob.call(this);try{LIVE[r]()}catch(e){}}}
