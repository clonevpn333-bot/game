'use strict';
/* =====================================================================
   HIGHSCHOOL — rooms. Wall 0..112, floor 112..180.
   ===================================================================== */
/* 3x5 pixel font so every sign stays square pixels */
const GLYPH={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111','0':'111101101101111','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','5':'111100110001110','6':'011100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001110','!':'010010010000010','?':'110001010000010','.':'000000000000010','-':'000000111000000','+':'000010111010000','=':'000111000111000',':':'000010000010000',"'":'010010000000000','/':'001001010100100','x':'000101010101000','<':'001010100010001','>':'100010001010100','#':'101111101111101','%':'101001010100101','&':'010101010101011','♥':'000101111111010'};
function px(s,x,y,c,sc){sc=sc||1;s=String(s).toUpperCase();let cx=Math.round(x);for(const ch of s){const gph=GLYPH[ch];if(gph){for(let i=0;i<15;i++)if(gph[i]==='1')R(cx+(i%3)*sc,y+((i/3)|0)*sc,sc,sc,c)}cx+=4*sc}}
const pxw=(s,sc)=>String(s).length*4*(sc||1)-(sc||1);
function pxc(s,cx,y,c,sc){px(s,cx-pxw(s,sc)/2,y,c,sc)}

/* ---------- shared pieces ---------- */
function period(){return (typeof D!=="undefined"&&D)?D.period:0}
function wall(c,trim){R(0,0,W,112,c);R(0,0,W,5,'rgba(0,0,0,.18)');R(0,106,W,6,trim||'rgba(0,0,0,.25)');R(0,105,W,1,'rgba(255,255,255,.12)')}
/* floors in perspective: lines run to a vanishing point above the middle of the room */
const VPY=48,FROWS=[112,115,119,124,130,137,145,154,164,175,187];
const fx=(i,B,y)=>160+i*B*(y-VPY)/(180-VPY);
function tiles(c1,c2,s){
 s=s||16;const B=s*2.3;R(0,112,W,68,c1);
 for(let r=0;r<FROWS.length-1;r++){const y0=FROWS[r],y1=Math.min(180,FROWS[r+1]);
  for(let y=y0;y<y1;y++)for(let i=-14;i<14;i++){if((i+r)&1)continue;const a=fx(i,B,y),b=fx(i+1,B,y);if(b<0||a>W)continue;R(a,y,b-a,1,c2)}
  R(0,y0,W,1,'rgba(0,0,0,.10)')}
 for(let y=112;y<180;y++){g.globalAlpha=.10*(1-(y-112)/68);R(0,y,W,1,'#000')}g.globalAlpha=1;
 R(0,112,W,2,'rgba(0,0,0,.25)');
}
function wood(c1,c2){
 R(0,112,W,68,c1);const B=34;
 for(let r=0;r<FROWS.length-1;r++){const y0=FROWS[r],y1=Math.min(180,FROWS[r+1]);R(0,y0,W,1,c2);
  for(let y=y0;y<y1;y++)for(let i=-14;i<14;i++){const x=fx(i+((r*3)%4)/4,B,y);if(x>=0&&x<W)R(x,y,1,1,c2)}
  if(r%2){g.globalAlpha=.06;R(0,y0+1,W,y1-y0-1,'#fff');g.globalAlpha=1}}
 for(let y=112;y<180;y++){g.globalAlpha=.10*(1-(y-112)/68);R(0,y,W,1,'#000')}g.globalAlpha=1;
 R(0,112,W,2,'rgba(0,0,0,.28)');
}
function floorShine(xs){for(const x of xs)for(let y=114;y<170;y+=2){g.globalAlpha=.07*(1-(y-114)/56);R(fx((x-160)/40,40,y)-6,y,12,1,'#fff')}g.globalAlpha=1}
function lights(n){for(let i=0;i<n;i++){const x=20+i*(280/(n-1||1));R(x-14,2,28,3,'#e8eef0');R(x-14,5,28,1,'#b8c0c4');g.globalAlpha=.05;R(x-30,6,60,40,'#fff');g.globalAlpha=1}}
function windowPane(x,y,w,h,o){o=o||{};R(x-2,y-2,w+4,h+4,o.frame||'#e8e4dc');const p=period(),sky=o.sky||(p>=7?'#f0a070':p===0?'#a8d0f0':'#8ec4ee');R(x,y,w,h,sky);R(x,y+h*.6,w,h*.4,p>=7?'#e08a60':'#b8dcf4');
 for(let i=0;i<3;i++){const cx=x+((i*37+T*2)%(w+20))-10;R(cx,y+4+i*5,10,3,'rgba(255,255,255,.75)');R(cx+3,y+2+i*5,5,2,'rgba(255,255,255,.75)')}
 if(o.trees){R(x,y+h-8,w,8,'#4a8a4a');for(let i=0;i<w;i+=7)R(x+i,y+h-11-(i*7%5),6,4,'#3a7a3a')}
 R(x+(w>>1)-1,y,2,h,o.frame||'#e8e4dc');R(x,y+(h>>1)-1,w,2,o.frame||'#e8e4dc');R(x-3,y+h+2,w+6,2,'rgba(0,0,0,.25)')}
function board(x,y,w,h,lines,col){R(x-2,y-2,w+4,h+4,'#9aa0aa');R(x,y,w,h,col||'#f4f6f2');R(x,y+h,w,2,'#7a8088');R(x+4,y+h,10,2,'#d83a3a');R(x+16,y+h,8,2,'#3a5ad8');let yy=y+4;for(const l of lines||[]){px(l[0],x+4,yy,l[1]||'#2a3a6a');yy+=8}}
function poster(x,y,w,h,c,lines,tc){R(x,y,w,h,c);R(x,y,w,1,'rgba(255,255,255,.25)');R(x+w-1,y+1,1,h,'rgba(0,0,0,.25)');let yy=y+3;for(const l of lines||[]){pxc(l,x+w/2,yy,tc||'#fff');yy+=7}R(x+w/2-1,y-1,2,2,'#c03030')}
function door(x,col,label,glass){R(x-2,40,30,72,'#5a5048');R(x,42,26,70,col||'#8a6a4a');R(x+3,45,20,1,'rgba(255,255,255,.15)');if(glass!==false){R(x+7,50,12,16,'#9ac0d8');R(x+7,50,12,1,'#d8eef8')}R(x+21,78,3,2,'#d8c890');if(label){R(x+3,30,20,8,'#2a2a3a');pxc(label,x+13,32,'#f0e0a0')}}
function clock(x,y){R(x-5,y-5,11,11,'#2a2a2a');R(x-4,y-4,9,9,'#f4f4f0');const p=period(),hr=[8.4,9,10.3,10.7,12.3,13.3,14.3,15.2,15.8][p]||9;const a=hr/12*6.283-1.57,b=(hr%1)*6.283-1.57;R(x+Math.round(Math.cos(a)*2),y+Math.round(Math.sin(a)*2),1,1,'#111');R(x+Math.round(Math.cos(b)*3),y+Math.round(Math.sin(b)*3),1,1,'#c00');R(x,y,1,1,'#111')}
function lockers(x0,y0,n,c,nums,start){for(let i=0;i<n;i++){const x=x0+i*15;R(x,y0,14,112-y0-6,c);R(x,y0,14,1,'rgba(255,255,255,.2)');R(x+13,y0,1,112-y0-6,'rgba(0,0,0,.3)');for(let j=0;j<3;j++)R(x+3,y0+4+j*2,8,1,'rgba(0,0,0,.3)');R(x+10,y0+20,2,4,'#c8c8c8');if(nums)px(String(start+i),x+2,y0+12,'rgba(255,255,255,.7)')}}
/* school desk: laminate top with an edge, metal frame, stuff on it that belongs to whoever sits there */
function desk(x,y,top){
 const t=top||'#d4b486';
 R(x-13,y-14,26,1,'#e8d0a8');R(x-13,y-13,26,3,t);R(x-13,y-10,26,1,'#8a6a48');
 R(x-12,y-9,24,5,'#6e7684');R(x-12,y-9,24,1,'#8e96a4');R(x-12,y-5,24,1,'#555c68');
 R(x-12,y-4,2,5,'#4a4f58');R(x+10,y-4,2,5,'#4a4f58');R(x-13,y,4,1,'#2a2a30');R(x+9,y,4,1,'#2a2a30');
 const k=(x*7+y*3)%5;
 if(k===0){R(x-9,y-16,7,2,'#a03030');R(x-9,y-17,7,1,'#c85050')}
 else if(k===1){R(x+3,y-17,3,4,'#3a8ac8');R(x+3,y-17,3,1,'#c8c8d0')}
 else if(k===2){R(x-6,y-15,10,2,'#f4f0e6');R(x-5,y-15,6,1,'#9aa0b8')}
 else if(k===3){R(x-10,y-16,9,2,'#3a5a3a');R(x+4,y-15,5,1,'#e8c040')}
 R(x-11,y-3,22,1,'rgba(0,0,0,.18)');
}
function chairBack(x,y){R(x-6,y-19,12,7,'#34407a');R(x-6,y-19,12,1,'#5a6aaa');R(x-6,y-13,12,1,'#262f5c');R(x-5,y-12,1,8,'#8a8e98');R(x+4,y-12,1,8,'#8a8e98');R(x-6,y-4,12,1,'#5a5e68')}
function bag(x,y,c){R(x-4,y-5,8,5,c);R(x-3,y-6,6,1,c);R(x-2,y-7,4,1,'#2a2a30');R(x-4,y-3,8,1,'rgba(0,0,0,.25)')}
function lightShaft(x0,w,c){g.globalAlpha=.07;for(let i=0;i<34;i++){const y=112+i*2;R(x0-i*2.2,y,w+i*1.2,2,c||'#fff6d0')}g.globalAlpha=1}
function shadow(x,y,w){R(x-w/2,y,w,2,'rgba(0,0,0,.18)')}
const SEATS={back:[100,140,180,220,260],backY:134,front:[100,140,180,220,260],frontY:158};
function classroomDesks(extra){const its=[];for(const row of[['back',SEATS.backY],['front',SEATS.frontY]])for(const x of SEATS[row[0]]){const y=row[1];its.push({y:y-8,d:()=>chairBack(x,y)});its.push({y:y+.5,d:()=>{desk(x,y+8);if(row[0]==='front'&&(x/40)%2===1)bag(x+14,y+12,['#2a3a5a','#5a2a3a','#2a2a2a'][(x/40|0)%3])}})}return its.concat(extra||[])}

const ROOMS={
 bus:{name:'Bus Loop',music:'bus',bg(){
  const p=period(),eve=p>=7;
  R(0,0,W,70,eve?'#f0a070':'#8ec4ee');R(0,40,W,30,eve?'#f6c08a':'#b8dcf4');
  if(!eve){R(250,12,10,10,'#fff6c0');R(249,13,12,8,'#fff6c0')}else{R(40,46,14,14,'#ffde8a')}
  for(let i=0;i<4;i++){const cx=(i*90+T*3)%380-40;R(cx,10+i*6,22,4,'rgba(255,255,255,.8)');R(cx+6,7+i*6,10,3,'rgba(255,255,255,.8)')}
  // school building
  R(20,24,280,88,'#b06a4a');for(let r=0;r<11;r++)R(20,24+r*8,280,1,'rgba(0,0,0,.08)');R(20,24,280,4,'#7a4a3a');
  for(let i=0;i<9;i++){const wx=30+i*30;if(i===4)continue;R(wx,36,18,14,'#2a3a4a');R(wx+1,37,16,6,'#5a7a9a');R(wx,62,18,14,'#2a3a4a');R(wx+1,63,16,6,'#5a7a9a')}
  R(140,60,40,52,'#3a2a2a');R(143,64,16,48,'#5a7a9a');R(161,64,16,48,'#5a7a9a');R(136,52,48,8,'#2a2a3a');pxc('HIGHGATE HIGH',160,54,'#f0d070');
  R(186,82,20,14,'#1a3a6a');pxc('NO',196,84,'#fff');pxc('PHONES',196,90,'#fff');
  // pavement & kerb & road
  R(0,112,W,48,'#9a9a98');for(let i=0;i<W;i+=20)R(i,112,1,48,'rgba(0,0,0,.08)');R(0,136,W,1,'rgba(0,0,0,.08)');
  R(0,160,W,3,'#d8d8d0');R(0,163,W,17,'#3a3a40');for(let i=0;i<W;i+=30)R(i+6,171,14,1,'#e8d870');
  // trees, bench, bike rack
  for(const tx of[8,300]){R(tx-2,70,4,42,'#5a3a2a');R(tx-12,46,24,26,eve?'#6a7a3a':'#3a7a3a');R(tx-8,40,16,8,eve?'#7a8a4a':'#4a8a4a')}
  R(212,128,30,3,'#7a5a3a');R(214,131,2,8,'#444');R(238,131,2,8,'#444');R(212,122,30,2,'#7a5a3a');
  for(let i=0;i<5;i++){R(254+i*7,118,1,12,'#aaa');R(254+i*7,118,5,1,'#aaa')}
  // the 43
  const bx=p>=7?-120:-170;R(bx+40,82,150,64,'#c8302a');R(bx+40,82,150,4,'#a8201a');for(let i=0;i<6;i++){R(bx+48+i*22,92,18,18,'#2a3a4a');R(bx+49+i*22,93,16,6,'#7aa0c0')}R(bx+176,92,12,40,'#2a3a4a');R(bx+177,94,10,36,'#5a7a9a');R(bx+150,84,30,6,'#1a1a1a');px('43',bx+160,85,'#f0d070');R(bx+60,138,14,14,'#1a1a1a');R(bx+150,138,14,14,'#1a1a1a');R(bx+64,142,6,6,'#777');R(bx+154,142,6,6,'#777')
 }},
 corridor:{name:'Main Corridor',music:'corridor',bg(){
  // ceiling: tiles, vents, strip lights
  R(0,0,W,16,'#d8d4c8');for(let i=0;i<W;i+=20)R(i,0,1,16,'rgba(0,0,0,.08)');R(0,8,W,1,'rgba(0,0,0,.08)');R(0,15,W,1,'rgba(0,0,0,.25)');
  for(const x of[46,160,274]){R(x-18,3,36,4,'#f4f8f8');R(x-18,7,36,1,'#a8b0b4');g.globalAlpha=.06;for(let k=0;k<5;k++)R(x-24-k*6,16+k*8,48+k*12,8,'#fffbe8');g.globalAlpha=1}
  R(110,4,10,6,'#b8b4a8');for(let k=0;k<3;k++)R(111,5+k*2,8,1,'#8a867c');
  // breeze-block wall with a painted band
  R(0,16,W,96,'#e9dfc6');for(let r=0;r<12;r++){const y=16+r*8;R(0,y,W,1,'rgba(120,100,70,.18)');for(let x=(r%2)*12;x<W;x+=24)R(x,y,1,8,'rgba(120,100,70,.14)')}
  R(0,36,W,3,'#4a6a9a');R(0,39,W,1,'#2a4a7a');
  // exit sign, clock, CCTV
  R(146,20,36,10,'#1a7a3a');R(147,21,34,8,'#2aa84a');px('EXIT',152,22,'#e8ffe8');R(176,22,4,4,'#e8ffe8');
  clock(226,26);
  R(300,18,10,5,'#2a2a2a');R(306,19,6,3,'#3a3a3a');R(309,20,2,1,Math.sin(T*3)>0?'#ff2020':'#601010');R(302,23,2,4,'#555');
  // lockers, with depth, vents, stickers and a few scars
  const lock=(x0,n,start)=>{R(x0-2,42,n*15+3,66,'#2a3a5a');for(let i=0;i<n;i++){const x=x0+i*15,num=start+i;R(x,44,14,62,'#3e5f92');R(x,44,14,2,'#6a8ac0');R(x,104,14,2,'#2a3f66');R(x+13,44,1,62,'#24365a');R(x,44,1,62,'#5a7ab0');
   for(let j=0;j<4;j++)R(x+3,48+j*2,8,1,'#24365a');px(String(num),x+2,57,'#e8eef8');R(x+10,72,2,6,'#c8ccd4');R(x+10,72,2,1,'#fff');
   if((num*7)%5===0)R(x+2,84,5,4,['#e05a7a','#f0d050','#5ad0a0'][num%3]);if(num%4===1){R(x+3,92,6,1,'#24365a');R(x+5,93,3,1,'#24365a')}
   if(num===217){R(x+2,64,10,1,'#c8d0e0');px('A',x+4,66,'#c8d0e0');R(x+9,76,3,4,'#c8b040')}}
   R(x0-2,106,n*15+3,2,'#1a2a44')};
  lock(4,6,212);lock(232,6,226);
  // classroom doors with number plates and a glimpse inside
  const door_=(x,label,inside)=>{R(x-3,40,32,72,'#6a5a48');R(x,43,26,69,'#8a5e3a');R(x+1,44,24,1,'#a87a52');R(x+12,44,1,66,'rgba(0,0,0,.15)');R(x+6,50,14,20,'#2a2a30');R(x+7,51,12,18,inside);R(x+7,51,12,1,'rgba(255,255,255,.5)');R(x+20,80,3,2,'#d8c890');R(x+3,30,20,8,'#2a2a3a');pxc(label,x+13,32,'#f0e0a0');R(x-3,110,32,2,'rgba(0,0,0,.25)')};
  door_(104,'ENG','#7a8a5a');door_(196,'MATH','#e8c4cc');
  // notice board & trophies
  R(138,40,52,37,'#8a5e3a');R(140,42,48,33,'#c8a070');poster(142,44,21,15,'#e05a5a',['BAKE','SALE']);poster(165,44,21,15,'#5a8ae0',['VOTE','DAVID']);poster(142,60,21,14,'#f0d070',['LOST','CAT'],'#3a2a1a');poster(165,60,21,14,'#7a5ab0',['PROM','?']);
  R(140,78,48,30,'#3a2a20');R(142,80,44,26,'#9ac0d8');R(142,80,44,1,'#e0f0ff');R(142,92,44,1,'#5a4a3a');for(let i=0;i<4;i++){R(146+i*10,84,6,8,'#e8c040');R(147+i*10,82,4,2,'#e8c040');R(148+i*10,84,1,6,'#fff09a');R(146+i*10,96,6,8,'#c8c8d0')}R(142,105,44,1,'#5a4a3a');
  // fire extinguisher, water fountain, bin
  R(134,90,4,13,'#c02020');R(134,88,4,2,'#2a2a2a');R(135,91,1,8,'#e05050');R(133,86,2,2,'#2a2a2a');
  R(0,106,W,6,'#6a5a48');R(0,106,W,1,'#8a7a62');
  tiles('#c8c0b0','#b4ac9c',14);floorShine([46,160,274]);
 }},
 english:{name:'English — Ms. Balduf',music:'class',bg(){
  wall('#7a8a5a','#4a5a3a');lights(3);
  board(96,22,124,56,[['POETRY WEEK',"#a02020"],['ODE = A POEM'],['OF PRAISE'],['NO \'COULD OF\'','#c02020'],['EVER.','#c02020']]);
  for(let s=0;s<3;s++){R(6,30+s*24,60,3,'#6a4a2a');for(let i=0;i<14;i++)R(8+i*4,30+s*24-12+(i%3),3,12-(i%3),['#a03030','#3050a0','#d0a030','#307040','#7a3a7a'][(i+s)%5])}
  R(6,28,2,76,'#6a4a2a');R(64,28,2,76,'#6a4a2a');
  poster(232,24,34,26,'#f4e8c8',['GRAMMAR','SAVES','LIVES'],'#802020');poster(272,24,40,26,'#3a3a5a',['READ','OR','ELSE'],'#f0d070');
  windowPane(234,58,76,40,{trees:1});clock(84,14);
  wood('#8a6a48','#7a5a38');lightShaft(250,56);
  R(18,120,50,4,'#6a4a2a');R(20,124,46,22,'#7a5a3a');R(20,124,46,1,'#9a7a5a');R(28,112,14,8,'#f4f0e6');R(30,110,10,2,'#f4f0e6');R(50,114,6,6,'#c83030');R(52,112,2,2,'#3a8a3a');
 },items:classroomDesks()},
 maths:{name:'Math — Ms. Sherman',music:'class',bg(){
  wall('#e8c4cc','#a87a8a');lights(3);
  board(96,22,124,56,[['MATH :)','#c04070'],['2X + 3 = 11'],['X = ?'],['BE NICE','#c04070'],['OR ELSE','#c04070']]);
  R(232,22,74,52,'#fff');R(232,22,74,6,'#c04070');pxc('SEATING PLAN',269,23,'#fff');for(let r=0;r<4;r++)for(let c=0;c<5;c++){R(236+c*14,32+r*10,12,8,(r*5+c)%4?'#f0d8e0':'#e8b0c4');R(238+c*14,35+r*10,8,1,'#8a6a7a')}
  R(10,24,46,40,'#f4e8c8');R(14,28,38,22,'#d8a868');R(20,32,10,10,'#e8c8a0');R(22,30,2,2,'#d8a868');R(28,30,2,2,'#d8a868');pxc('MR BISCUITS',33,54,'#802040');
  windowPane(236,80,70,24);clock(82,14);
  tiles('#c8b8bc','#b8a8ac',18);lightShaft(250,50,'#ffeef4');
  R(16,120,52,4,'#7a4a5a');R(18,124,48,22,'#8a5a6a');R(18,124,48,1,'#aa7a8a');R(36,130,12,3,'#5a3a4a');R(40,131,4,1,'#d8c890');R(24,114,8,8,'#f4f0e6');R(26,116,4,4,'#d8a868');R(52,116,6,4,'#c04070');
 },items:classroomDesks()},
 science:{name:'Science — Ms. Loach',music:'class',bg(){
  wall('#9aa894','#6a7a64');lights(3);
  R(96,20,128,52,'#f4f0e6');R(96,20,128,1,'#ccc');for(let r=0;r<6;r++)for(let c=0;c<16;c++)if(!(r<1&&c>0&&c<15)&&!(r<3&&c>1&&c<10))R(99+c*7.6,24+r*8,6,6,['#e8a0a0','#a0c8e8','#e8d8a0','#a0e8b0','#d0a0e8'][(r+c)%5]);pxc('PERIODIC TABLE',160,73,'#3a4a3a');
  R(14,26,26,72,'#e8e4d8');R(25,28,6,7,'#f0ece0');R(26,30,1,1,'#222');R(29,30,1,1,'#222');R(27,35,2,30,'#e8e4d8');for(let i=0;i<5;i++)R(22,38+i*3,12,1,'#d8d4c8');R(21,40,2,20,'#e8e4d8');R(33,40,2,20,'#e8e4d8');R(24,66,2,28,'#e8e4d8');R(30,66,2,28,'#e8e4d8');R(14,26,26,1,'#888');
  windowPane(236,24,72,46,{trees:1});clock(78,14);
  poster(236,78,34,22,'#4a6a4a',['SAFETY','FIRST'],'#f0f0a0');poster(274,78,34,22,'#6a4a4a',['NO','EATING'],'#fff');
  tiles('#a8b0a0','#98a090',18);lightShaft(258,54);
  R(46,118,52,4,'#5a5a50');R(48,122,48,22,'#6a6a60');R(48,122,48,1,'#8a8a80');R(54,114,10,6,'#f4f0e6');
  if(!((typeof D!=="undefined"&&D)&&D.f&&D.f.mugGone)){R(82,113,6,7,'#e8e2d6');R(88,115,2,3,'#e8e2d6');R(82,113,6,1,'#6a3a1a');pxc('#1',85,116,'#a02020')}
 },items:(()=>{const its=[];for(const row of[[SEATS.backY],[SEATS.frontY]])for(const x of[120,200,280]){const y=row[0];its.push({y:y+.5,d:()=>{R(x-26,y-13,52,3,'#2a2a2a');R(x-26,y-10,52,10,'#d8d4c8');R(x-26,y-10,52,1,'#f0ece0');R(x-4,y-17,1,4,'#888');R(x-4,y-17,4,1,'#888');R(x-20,y-12,8,2,'#5a5a6a')}})}return its})()},
 chem:{name:'Chem Lab — Mr. Voss',music:'chem',bg(){
  wall('#2f4a48','#1a2a2a');R(0,0,W,112,'rgba(0,0,0,.15)');
  for(let i=0;i<2;i++){const x=20+i*260;R(x-12,2,24,3,'#c8e0c8');g.globalAlpha=.05;R(x-30,6,60,40,'#8f8');g.globalAlpha=1}
  for(let s=0;s<3;s++){R(90,24+s*20,110,2,'#4a3a2a');for(let i=0;i<13;i++){const c=['#6aff8a','#ff6a8a','#e8e070','#8ad8ff','#d0a0ff'][(i*3+s)%5];R(93+i*8,24+s*20-9,6,9,'#c8e0e0');R(94+i*8,24+s*20-6,4,6,c);if((i+s)%4===0){g.globalAlpha=.25+Math.sin(T*2+i)*.1;R(92+i*8,24+s*20-11,8,12,c);g.globalAlpha=1}}}
  pxc('SAMPLES',145,82,'#8af0a8');
  // the back fridge
  R(18,28,48,84,'#d8dcd8');R(18,28,48,2,'#fff');R(20,66,44,2,'#9a9e9a');R(58,40,3,14,'#888');R(58,74,3,18,'#888');
  if(!((typeof D!=="undefined"&&D)&&D.f&&D.f.fridgeOpen)){R(54,56,8,10,'#c8b040');R(56,52,4,4,'#888')}else{R(20,30,38,80,'#1a2a2a');for(let r=0;r<4;r++)for(let c=0;c<3;c++){R(23+c*12,34+r*19,9,14,'#c8e0e0');R(24+c*12,38+r*19,7,10,r===2?'#d8b0a0':'#a8d8b8')}}
  R(22,18,40,8,'#a02020');pxc('DO NOT',42,19,'#fff');
  // fume hood and the vat
  R(214,22,60,56,'#3a4a4a');R(218,26,52,40,'#5a7070');R(218,26,52,1,'#8aa0a0');R(214,78,60,4,'#2a3a3a');
  tiles('#2a3a38','#24322f',18);
  const bub=Math.sin(T*3);R(244,118,58,6,'#5a5a5a');R(246,124,54,26,'#4a4a4a');R(246,124,54,1,'#6a6a6a');R(248,114,50,6,'#6aff8a');for(let i=0;i<5;i++){const q=(T*1.3+i*.37)%1;R(252+i*10,116-q*8,2,2,'rgba(160,255,180,'+(1-q)+')')}g.globalAlpha=.12+bub*.04;R(236,90,74,30,'#6aff8a');g.globalAlpha=1;pxc('ACID',273,134,'#e8e070');
  R(90,120,90,4,'#1a1a1a');R(92,124,86,20,'#3a3a3a');
 },items:[{y:158,d:()=>{R(100,145,120,4,'#1a1a1a');R(102,149,116,11,'#3a3a3a');R(102,149,116,1,'#5a5a5a')}}]},
 canteen:{name:'Cafeteria',music:'canteen',bg(){
  wall('#d8e0e8','#8a98a8');lights(4);for(let i=0;i<W;i+=10)R(i,0,1,106,'rgba(0,0,0,.04)');for(let j=0;j<106;j+=10)R(0,j,W,1,'rgba(0,0,0,.04)');
  R(16,18,96,40,'#2a2a2a');R(18,20,92,36,'#1a3a2a');px('TODAY:',22,23,'#f0f0a0');px('MYSTERY NUGGETS',22,31,'#fff');px('GREY PASTA',22,39,'#fff');px('PAT\'S STEW (?)',22,47,'#e06a6a');
  R(10,70,150,36,'#9aa0aa');R(10,70,150,3,'#c8ccd0');for(let i=0;i<6;i++){R(16+i*24,62,20,8,'#c8ccd0');R(18+i*24,64,16,4,['#e8c04a','#a8a088','#c86a3a','#7a9a3a','#e8e0c8','#8a5a3a'][i])}R(10,70,150,1,'#fff');
  R(272,40,36,66,'#b02030');R(276,46,20,40,'#1a1a2a');for(let r=0;r<5;r++)for(let c=0;c<3;c++)R(278+c*6,48+r*7,4,5,['#e8c040','#40a0e0','#e04040','#40c060'][(r+c)%4]);R(298,60,6,10,'#888');pxc('SNAX',290,92,'#fff');
  windowPane(180,20,74,44,{trees:1});
  tiles('#c8d0c8','#b8c0b8',16);
 },items:[{y:146,d:()=>{R(60,132,200,4,'#a87a4a');R(60,136,200,2,'#7a5a3a');R(70,138,2,10,'#555');R(248,138,2,10,'#555')}},{y:176,d:()=>{R(40,160,240,4,'#a87a4a');R(40,164,240,2,'#7a5a3a');R(50,166,2,10,'#555');R(268,166,2,10,'#555')}}]},
 gym:{name:'Gym',music:'gym',bg(){
  wall('#c8b8a0','#8a7a60');for(let i=0;i<5;i++){R(20+i*64,6,40,14,'#8ab0d0');R(20+i*64,6,40,1,'#d0e8f8')}
  for(let i=0;i<10;i++)R(8+i*5,30,2,76,'#b88a5a');for(let j=0;j<12;j++)R(6,34+j*6,52,2,'#b88a5a');
  R(282,24,28,22,'#fff');R(282,24,28,22,'#fff');R(284,26,24,18,'#fff');R(288,32,16,10,'rgba(0,0,0,.08)');R(290,46,12,2,'#e0502a');for(let i=0;i<4;i++)R(290+i*3,48,1,8,'#eee');
  R(140,40,40,66,'#6a5a4a');R(142,42,36,64,'#8a7a5a');pxc('PE',160,46,'#fff');pxc('CUPBOARD',160,54,'#f0d070');R(170,72,3,4,'#ccc');
  R(80,30,40,14,'#2a5aa8');pxc('GO HARD',100,34,'#fff');R(200,30,52,14,'#a82a2a');pxc('PAIN=GAIN',226,34,'#fff');
  R(62,70,70,36,'#7a5a3a');for(let r=0;r<4;r++)R(62,70+r*9,70,2,'#5a3a2a');
  wood('#d8a868','#c8985a');R(0,140,W,1,'#e04040');R(160,112,1,68,'#e04040');R(120,128,80,1,'#3a6ad8');R(0,170,W,1,'#3a6ad8');
 }},
 field:{name:'Playing Field',music:'field',bg(){
  const p=period();R(0,0,W,76,p>=7?'#f0a070':'#8ec4ee');R(0,50,W,26,'#b8dcf4');R(270,10,10,10,'#fff6c0');
  for(let i=0;i<4;i++){const cx=(i*95+T*4)%380-40;R(cx,12+i*7,24,4,'rgba(255,255,255,.85)');R(cx+6,9+i*7,10,3,'rgba(255,255,255,.85)')}
  R(0,60,W,18,'#7a9a6a');R(30,50,90,26,'#b06a4a');for(let i=0;i<5;i++)R(36+i*16,56,10,8,'#2a3a4a');R(150,56,60,20,'#9a5a3a');
  R(0,76,W,104,'#5aa04a');for(let r=0;r<8;r++)for(let i=0;i<W;i+=12)R(i+(r*5)%12,82+r*12,4,1,'#4a904a');
  R(0,150,W,30,'#c8584a');for(let l=0;l<3;l++)R(0,154+l*9,W,1,'#f0e8e0');
  R(232,84,60,1,'#fff');R(232,84,1,30,'#fff');R(291,84,1,30,'#fff');for(let i=0;i<6;i++)R(233+i*10,85,1,28,'rgba(255,255,255,.3)');
  // the cherry tree
  R(50,70,6,64,'#6a4a3a');R(44,90,6,3,'#6a4a3a');R(54,84,10,3,'#6a4a3a');for(let i=0;i<14;i++){R(20+hsh(i)*70,34+hsh(i+4)*44,12,10,i%3?'#f0a8c0':'#f8c8d8')}
  R(70,128,34,3,'#7a5a3a');R(72,131,2,8,'#444');R(100,131,2,8,'#444');R(70,122,34,2,'#7a5a3a');
 }},
 library:{name:'Library',music:'library',bg(){
  wall('#6a4a3a','#3a2a20');lights(3);
  for(let s=0;s<2;s++)for(const sx of[6,222]){const x=sx;R(x,16,92,92,'#4a2a1a');for(let r=0;r<5;r++){R(x+2,18+r*18,88,16,'#2a1a10');for(let i=0;i<20;i++){const h=10+((i*7+r*3)%5);R(x+3+i*4.3,18+r*18+16-h,3,h,['#a03030','#3050a0','#d0a030','#307040','#7a3a7a','#c8c0a8'][(i+r*2)%6])}}}
  R(118,18,84,22,'#e8e0c8');pxc('SILENCE.',160,22,'#802020',2);pxc('MRS PIKE IS WATCHING',160,33,'#3a2a20');
  R(124,48,72,52,'#2a2030');for(let i=0;i<3;i++){R(130+i*22,58,18,14,'#1a1a2a');R(131+i*22,59,16,10,'#4a8ac0');R(137+i*22,72,4,4,'#555')}R(126,78,68,3,'#7a5a3a');
  wood('#7a5238','#6a4228');
 },items:[{y:160,d:()=>{R(110,146,100,4,'#8a6a48');R(112,150,96,2,'#6a4a2a');R(118,152,2,10,'#4a3a2a');R(200,152,2,10,'#4a3a2a');R(130,142,10,4,'#a03030');R(170,141,8,5,'#3050a0')}}]},
 office:{name:'Vice Principal’s Office',music:'office',bg(){
  wall('#4a2a24','#2a1410');for(let i=0;i<W;i+=16)R(i,30,1,76,'rgba(0,0,0,.2)');R(0,30,W,2,'#6a3a2a');
  R(126,8,64,46,'#c8a040');R(130,12,56,38,'#3a2a3a');drawKid(K.sherman,158,52,{dir:1,still:1,ex:'smirk'});pxc('OUR LEADER',158,56,'#e8c060');
  R(14,24,70,82,'#5a3a2a');R(16,26,66,78,'#2a1a1a');for(let r=0;r<4;r++){R(16,44+r*19,66,2,'#5a3a2a');for(let i=0;i<7;i++)R(19+i*9,30+r*19,6,10,['#262938','#c03030','#e0c040','#262938','#40a0e0','#262938','#aaa'][(i+r)%7])}R(16,26,66,78,'rgba(150,200,255,.08)');pxc('CONFISCATED',49,18,'#e8c060');
  R(230,22,74,52,'#e8e0c8');for(let i=0;i<9;i++)R(232,25+i*5,70,3,'#c8c0a0');R(212,62,10,10,'#c8a040');R(214,64,6,6,'#e8d070');
  tiles('#5a3a30','#4a2a24',22);
  if(!((typeof D!=="undefined"&&D)&&D.f&&D.f.pitOpen)){R(128,156,60,3,'rgba(0,0,0,.35)');R(128,156,1,14,'rgba(0,0,0,.3)');R(187,156,1,14,'rgba(0,0,0,.3)');R(128,169,60,1,'rgba(0,0,0,.3)')}else{R(128,156,60,14,'#030204');R(130,158,56,2,'#1a0a0a')}
 },items:[{y:150,d:()=>{R(110,118,96,5,'#3a1a10');R(112,123,92,26,'#5a2a1a');R(112,123,92,1,'#7a4a3a');R(150,128,16,6,'#3a1a10');R(156,114,4,4,'#333');R(157,110,2,4,'#555');R(168,116,6,3,'#c02020');R(124,113,12,5,'#f4f0e6');R(186,112,6,6,'#e8e2d6')}}]},
 toilets:{name:'Boys’ Bathroom',music:'toilets',bg(){
  const fl=Math.sin(T*23)>.85&&Math.sin(T*3)>0;
  R(0,0,W,112,fl?'#8a9aa0':'#b8c8cc');for(let i=0;i<W;i+=8)R(i,0,1,112,'rgba(0,0,0,.07)');for(let j=0;j<112;j+=8)R(0,j,W,1,'rgba(0,0,0,.07)');R(0,0,W,4,'#6a7a80');
  for(let i=0;i<4;i++){const x=150+i*42;R(x,26,38,86,'#5a7a8a');R(x+2,30,34,82,'#6a8a9a');R(x+30,66,3,4,'#ccc');if(i===2){R(x+6,40,24,8,'#3a3a3a');px('AIDAN',x+8,42,'#fff')}}
  R(10,40,120,30,'#c8e0e8');R(10,40,120,2,'#e8f8ff');R(10,40,2,30,'#aac');R(128,40,2,30,'#aac');for(let i=0;i<3;i++){R(20+i*38,84,26,8,'#e8eef0');R(30+i*38,80,4,4,'#aaa')}
  px('MARCUS WAS HERE ;)',14,26,'#3a3a6a');px('ARJUN = L',152,16,'#a03030');
  R(132,74,14,18,'#e8e8e8');R(134,90,10,2,'#aaa');
  tiles('#d8dcd8','#c8ccc8',12);R(30,150,30,4,'rgba(200,220,255,.25)');
 },over(){if(Math.sin(T*23)>.85&&Math.sin(T*3)>0){g.globalAlpha=.2;R(0,0,W,H,'#000');g.globalAlpha=1}}},
 black:{name:'',music:'dead',bg(){R(0,0,W,H,'#08060c')}},
 stage:{name:'Curtain Call',music:'curtain',bg(){
  R(0,0,W,H,'#120a14');for(let i=0;i<W;i+=8){R(i,0,6,124,'#7a1424');R(i+1,0,1,124,'#9a2a3a')}
  g.globalAlpha=.12;for(let i=0;i<5;i++){R(30+i*60,0,30,160,'#fff2c0')}g.globalAlpha=1;
  R(0,124,W,56,'#5a3a24');for(let i=0;i<W;i+=24)R(i,124,1,56,'#4a2a18');R(0,124,W,2,'#c8a050');
  R(0,0,W,14,'#5a0a14');for(let i=0;i<W;i+=20)R(i,14,20,4,'#5a0a14');
 }}
};
