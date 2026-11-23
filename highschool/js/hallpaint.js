'use strict';
/* =====================================================================
   HIGHSCHOOL — HALLWAYS PAINTED IN ONE PIECE
   The hallway art and the classroom doors used to be two different
   pictures stacked on top of each other. Now each hallway is painted
   in one go, around its doors: the doors are part of the wall, and the
   lockers, posters, trophy case, periodic table, art wall and the rest
   are laid out in the gaps between them. Only the moving bits (a door
   swinging open, a flickering tube, your class glowing) are drawn live.
   ===================================================================== */
const HTHEME={
 corridor:{wall:'#e4dac4',brick:'#d8ccb2',band:'#3a5a9a',wain:'#c8bca2',trim:'#8a7a5e',door:'#8a5a38',floorA:'#c8c4bc',floorB:'#b4b0a8',locker:'#3a5aa0',feat:'lockers'},
 hallb:{wall:'#e8dcc6',brick:'#dccfb6',band:'#8a2a3a',wain:'#c4b49a',trim:'#7a5a44',door:'#7a4e32',floorA:'#cdc6b8',floorB:'#b8b0a2',locker:'#8a2a3a',feat:'front'},
 upper:{wall:'#e0d8cc',brick:'#d4cbbd',band:'#5a3a8a',wain:'#c0b6a8',trim:'#6a5a7a',door:'#86603e',floorA:'#c4c0bc',floorB:'#b0aca8',locker:'#4a5a9a',feat:'lockers'},
 wing_sci:{wall:'#cfe0d2',brick:'#c2d4c6',band:'#2a7a5a',wain:'#e4efe6',trim:'#5a7a6a',door:'#7e5a3a',floorA:'#c8d0c8',floorB:'#b4bcb4',locker:'#3a7a6a',feat:'science'},
 wing_sports:{wall:'#4a6aa8',brick:'#40609c',band:'#c8a030',wain:'#38548a',trim:'#2a3a6a',door:'#8a5a38',floorA:'#c8a878',floorB:'#b89868',locker:'#2a4a8a',feat:'sports'},
 wing_arts:{wall:'#efe2c4',brick:'#e4d6b6',band:'#c85a3a',wain:'#d8c8a4',trim:'#9a7a52',door:'#8a5e3c',floorA:'#c8b898',floorB:'#b8a888',locker:'#c85a3a',feat:'arts'}
};
const PAINTED=new Set(Object.keys(HTHEME));
function hpDoor(d,T_){
 const x=d.x,label=(d.label||shortName(d.to).toUpperCase()).slice(0,12);
 /* casing in the wall's own trim color, flush with the wall */
 R(x-19,31,38,77,T_.trim);R(x-19,31,38,1,'rgba(255,255,255,.25)');R(x+18,32,1,76,'rgba(0,0,0,.25)');
 R(x-17,33,34,75,T_.door);R(x-17,33,34,1,'rgba(255,255,255,.22)');R(x-17,33,1,75,'rgba(255,255,255,.12)');R(x+16,33,1,75,'rgba(0,0,0,.25)');
 R(x-14,38,28,1,'rgba(0,0,0,.18)');R(x-14,38,1,64,'rgba(0,0,0,.12)');
 const inside=(typeof INSIDE!=='undefined'&&INSIDE[d.to])||'#6a6a6a';
 R(x-12,41,13,19,'#2a2a30');R(x-11,42,11,17,inside);g.globalAlpha=.5;R(x-11,42,11,4,'#ffffff');R(x-11,42,3,17,'#ffffff');g.globalAlpha=.25;R(x-11,52,11,7,'#000');g.globalAlpha=1;
 R(x+9,70,3,4,'#d8c070');R(x+9,70,3,1,'#fff0a0');
 R(x-15,94,30,11,'#a8a8b0');R(x-15,94,30,1,'#d8d8e0');R(x-15,104,30,1,'#7a7a82');
 R(x-19,106,38,2,'rgba(0,0,0,.3)');
 /* the sign, screwed to the wall above */
 const lw=Math.max(28,pxw(label)+8);R(x-lw/2,21,lw,9,'#2a2a36');R(x-lw/2,21,lw,1,'#5a5a6a');R(x-lw/2,29,lw,1,'rgba(0,0,0,.3)');pxc(label,x,23,'#f0e6c8');
}
function hpStairs(d,T_){
 const x=d.x,up=d.stairs==='up';
 R(x-23,29,46,79,T_.trim);R(x-21,31,42,77,'#1c201c');
 for(const s of[-1,1]){const dx=s<0?x-20:x+1;R(dx,32,19,76,'#6a7a6a');R(dx+1,33,17,74,'#7a8a78');R(dx,32,19,1,'rgba(255,255,255,.2)');
  R(dx+3,40,13,22,'#5a6458');for(let i=0;i<5;i++){const sy=up?58-i*4:44+i*4;R(dx+3+i*2,sy,13-i*2,1,'#c8c0a8');R(dx+3+i*2,sy+1,13-i*2,3,'#8a8470')}
  for(let k=0;k<13;k+=4)R(dx+3+k,40,1,22,'rgba(30,30,30,.35)');for(let k=0;k<22;k+=4)R(dx+3,40+k,13,1,'rgba(30,30,30,.35)');
  R(dx+2,74,15,3,'#c8ccc8');R(dx+2,77,15,1,'#5a5a5a')}
 R(x-1,32,2,76,'#3a4038');
 R(x-23,17,46,11,'#1a6a3a');R(x-23,17,46,1,'#3a9a5a');pxc(up?'STAIRS ▲':'STAIRS ▼',x,19,'#e8f8e8');
 R(x-21,108,42,2,'rgba(0,0,0,.3)');
}
function hpLockers(x0,x1,T_,seed){
 const w=11;for(let x=x0;x+w<=x1;x+=w){const n=200+((x+seed)%97);
  R(x,56,w-1,50,T_.locker);R(x,56,w-1,1,'rgba(255,255,255,.25)');R(x+w-2,56,1,50,'rgba(0,0,0,.25)');
  for(let v=0;v<4;v++)R(x+2,60+v*2,w-5,1,'rgba(0,0,0,.25)');R(x+w-4,78,2,5,'#c8c8d0');px(String(n),x+1,69,'rgba(255,255,255,.55)');
  if(hsh(x*3+seed)>.75)R(x+2,86,4,4,['#e05a7a','#f0d050','#5ad0a0'][(x>>3)%3]);
  if(hsh(x*7+seed)>.85){R(x+1,90,w-3,8,'#f4f0e6');R(x+2,92,w-5,1,'#8a8a9a')}}
 R(x0,54,x1-x0,2,T_.trim);R(x0,106,x1-x0,1,'rgba(0,0,0,.35)');
}
function hpPoster(x,y,w,h,c,lines,tc){R(x,y,w,h,c);R(x,y,w,1,'rgba(255,255,255,.25)');R(x+w-1,y+1,1,h-1,'rgba(0,0,0,.25)');let yy=y+3;for(const l of lines||[]){pxc(l,x+w/2,yy,tc||'#fff');yy+=7}R(x+1,y-1,3,2,'rgba(240,235,200,.8)');R(x+w-4,y-1,3,2,'rgba(240,235,200,.8)')}
function hpGaps(doors){const sp=doors.map(d=>[d.x-(d.stairs?25:21),d.x+(d.stairs?25:21)]).sort((a,b)=>a[0]-b[0]);const g_=[];let x=0;for(const [a,b] of sp){if(a-x>=6)g_.push([x,a]);x=Math.max(x,b)}if(W-x>=6)g_.push([x,W]);return g_}
/* what goes in the gaps, by hallway */
const HPFEAT={
 lockers(gx,T_,room){gx.forEach(([a,b],i)=>{hpLockers(a+2,b-2,T_,i*31+room.length);if(b-a>=20)hpPoster(a+Math.max(2,(b-a)/2-9),34,18,16,['#e05a5a','#5a8ae0','#f0d070','#7a5ab0'][i%4],[['BAKE','SALE'],['VOTE','DAVID'],['LOST','CAT'],['PROM','?']][i%4],i%4===2?'#3a2a1a':'#fff')})},
 front(gx,T_,room){gx.forEach(([a,b],i)=>{const m=(a+b)/2;
  if(b-a>=16){R(m-7,34,14,20,T_.band);R(m-7,54,7,4,T_.band);R(m,54,7,4,T_.band);R(m-7,34,14,1,'rgba(255,255,255,.3)');pxc('H',m,40,'#f0d070')}
  if(b-a>=18){R(m-8,64,16,26,'#7a5a3a');R(m-7,65,14,24,'#c8a070');R(m-5,67,5,6,'#f4f0e6');R(m+1,69,4,7,'#e05a5a');R(m-5,76,8,5,'#5a8ae0');R(m-2,82,6,5,'#f4f0e6')}
  R(a,104,b-a,2,'rgba(0,0,0,.15)')});
  R(4,58,10,48,'#c02020');R(6,56,6,2,'#2a2a2a');R(7,62,4,20,'#e05050')},
 science(gx,T_,room){
  R(0,76,W,30,T_.wain);for(let x=0;x<W;x+=8)for(let y=76;y<106;y+=8){R(x,y,8,1,'rgba(0,0,0,.08)');R(x,y,1,8,'rgba(0,0,0,.08)')}R(0,74,W,3,T_.band);
  const pieces=[[66,(x)=>{R(x,30,62,38,'#f4f0e6');R(x,30,62,1,'#fff');for(let r=0;r<6;r++)for(let c=0;c<12;c++)if(!(r===0&&c>0&&c<11)&&!(r<3&&c>1&&c<10))R(x+2+c*5,33+r*5,4,4,['#e8a0a0','#a0c8e8','#c8e8a0','#f0d890','#d0a8e8'][(r+c)%5]);pxc('PERIODIC',x+31,62,'#3a3a5a')}],
   [34,(x)=>{R(x,34,30,26,'#1a1a1a');R(x+2,36,26,22,'#f0d040');pxc('GOGGLES',x+15,40,'#1a1a1a');pxc('ON.',x+15,48,'#1a1a1a')}],
   [26,(x)=>{R(x,40,22,30,'#2a8a4a');R(x+2,42,18,26,'#3aa05a');pxc('EYE',x+11,46,'#fff');pxc('WASH',x+11,54,'#fff');R(x+6,60,10,6,'#e8e8e8')}],
   [30,(x)=>{R(x,30,26,36,'#3a3a4a');R(x+2,32,22,32,'#e8e8f0');R(x+10,34,6,6,'#d8d8d8');R(x+12,40,2,14,'#d8d8d8');R(x+8,44,10,1,'#d8d8d8');R(x+9,54,2,8,'#d8d8d8');R(x+14,54,2,8,'#d8d8d8')}]];
  let pi=0;for(const [a,b] of gx){let x=a+4;while(pi<pieces.length&&x+pieces[pi][0]<=b-2){pieces[pi][1](x);x+=pieces[pi][0]+4;pi++}}
 },
 sports(gx,T_,room){const [a,b]=gx[0]||[0,0];
  if(b-a>80){R(8,34,84,58,'#3a2a20');R(10,36,80,54,'#1a2430');R(10,36,80,1,'rgba(255,255,255,.3)');for(let i=0;i<5;i++){R(16+i*15,44,8,12,'#d8b040');R(17+i*15,42,6,2,'#d8b040');R(19+i*15,56,2,4,'#a88a30');R(16+i*15,60,8,2,'#a88a30')}
   for(let i=0;i<5;i++){R(16+i*15,70,8,10,'#c8c8d0');R(18+i*15,68,4,2,'#c8c8d0')}R(10,64,80,1,'#5a4a3a');R(10,82,80,1,'#5a4a3a');pxc('TROPHIES',50,37,'#f0d070')}
  const m=(gx[1]?gx[1][0]+gx[1][1]:400)/2;
  if(gx[1]){const gw=gx[1][1]-gx[1][0];if(gw>=64){R(m-30,28,60,14,'#c02020');R(m-30,28,60,1,'#e05050');pxc('GO HAWKS',m,32,'#fff')}else{R(m-7,30,14,20,'#c02020');R(m-7,50,7,4,'#c02020');R(m,50,7,4,'#c02020');pxc('H',m,36,'#fff')}if(gw>=40){R(m-14,64,28,14,'#d8dce4');R(m-12,66,24,8,'#a8b0c0');R(m-2,60,4,4,'#c8ccd4')}}
  for(let x=0;x<W;x+=16)for(let y=8;y<106;y+=8)R(x+((y/8)%2)*8,y,15,1,'rgba(0,0,0,.08)')},
 arts(gx,T_,room){gx.forEach(([a,b],i)=>{for(let x=a+4;x+20<b;x+=24)for(let r=0;r<2;r++){const y=26+r*26,c=['#e05a7a','#5ab0e0','#f0c040','#7ad07a','#b07ae0'][((x>>3)+r+i)%5];R(x,y,20,20,'#f4f0e6');R(x+2,y+2,16,16,c);R(x+4,y+6,6,6,'#f4f0e6');R(x+11,y+9,5,7,'#2a2a2a');R(x+1,y-1,3,2,'rgba(240,235,200,.8)')}
   R(a,78,b-a,26,'#2a2a3a');for(let x=a;x<b;x+=2){const h=10+Math.sin(x*.05+i)*8;R(x,104-h,2,h,['#e05a5a','#f0a040','#f0d040','#5ad07a','#5aa0e0','#a05ae0'][Math.floor((x-a)/18)%6])}});
  pxc('THE ARTS ARE ALIVE',80,82,'#fff')}
};
function paintHall(room){
 const T_=HTHEME[room],w=WORLD[room];
 /* wall: brick, band, wainscot */
 R(0,0,W,112,T_.wall);for(let y=2;y<56;y+=4)for(let x=(y%8?0:6);x<W;x+=12)R(x,y,11,3,T_.brick);
 R(0,0,W,4,'rgba(0,0,0,.18)');for(let i=0;i<4;i++){R(20+i*80,1,44,3,'#e8eef0');R(20+i*80,4,44,1,'#b8c0c4')}
 R(0,52,W,3,T_.band);R(0,55,W,1,'rgba(0,0,0,.2)');
 R(0,56,W,50,T_.wain);R(0,56,W,1,'rgba(255,255,255,.2)');R(0,104,W,4,T_.trim);R(0,104,W,1,'rgba(255,255,255,.2)');R(0,108,W,4,'rgba(0,0,0,.25)');
 /* floor */
 for(let y=112,r=0;y<H;y+=10,r++)for(let x=-((r%2)*12);x<W;x+=24){R(x,y,12,10,T_.floorA);R(x+12,y,12,10,T_.floorB);R(x,y,24,1,'rgba(0,0,0,.07)')}
 g.globalAlpha=.12;for(let i=0;i<4;i++){const x=40+i*80;for(let y=114;y<170;y+=2)R(x-6+(y-114)*.15,y,12,1,'#fff')}g.globalAlpha=1;
 for(let i=0;i<6;i++){g.globalAlpha=.25*(1-i/6);R(0,112+i*2,W,2,'#000')}g.globalAlpha=1;
 /* everything between the doors */
 const gx=hpGaps(w.doors.filter(d=>!d.front));
 HPFEAT[T_.feat](gx,T_,room);
 /* and the doors, in the same paint */
 for(const d of w.doors){if(d.front)continue;if(d.stairs)hpStairs(d,T_);else hpDoor(d,T_)}
}
for(const room of PAINTED){if(!ROOMS[room]||!WORLD[room])continue;
 const old=ROOMS[room];
 old.bg=function(){
  guCache('hall2_'+room,'',()=>paintHall(room));
  /* live: one tube flickers, lit window glow */
  if(Math.sin(T*23+room.length)>.96){g.globalAlpha=.4;R(100,1,44,4,'#000');g.globalAlpha=1}
  if(D&&!D.weekend)drawWorldDoors(room);
 };
 old._doors=1;
}
/* live door bits only, for the painted halls: swing open, crack open when you’re close, your class glows */
{const _dw=drawWorldDoors;drawWorldDoors=function(room){
 if(!PAINTED.has(room))return _dw(room);
 const w=WORLD[room],T_=HTHEME[room];
 const nd=D&&D.room===room&&panelMode==='roam'&&!busy&&typeof nearDoor==='function'?nearDoor():null;
 for(const d of w.doors){if(d.front||d.stairs)continue;
  const open=D&&D.doorAnim&&D.doorAnim.room===room&&D.doorAnim.x===d.x?D.doorAnim.k:0;
  const near=nd===d&&A.you&&Math.abs(A.you.x-d.x)<10;
  const k=Math.max(open,near?.14:0);
  if(k>0){const x=d.x,inside=(typeof INSIDE!=='undefined'&&INSIDE[d.to])||'#6a6a6a';
   R(x-17,33,34,73,'#1a1418');R(x-16,34,32,72,inside);g.globalAlpha=.35;R(x-16,34,32,72,'#000');g.globalAlpha=1;
   const ww=Math.max(3,Math.round(34*(1-k)));R(x-17,33,ww,73,T_.door);R(x-17,33,ww,1,'rgba(255,255,255,.22)');R(x-17+ww-1,33,1,73,'rgba(0,0,0,.3)');
   if(ww>18){R(x-12,41,Math.min(13,ww-8),19,'#2a2a30');R(x-15,94,Math.min(30,ww-4),11,'#a8a8b0')}
   g.globalAlpha=.16*k*2;for(let i=0;i<22;i++)R(x-16-i,108+i,32+i*2,1,'#fff4d0');g.globalAlpha=1}
  if(near&&!open){R(d.x+9,70,3,4,Math.sin(T*6)>0?'#fff0a0':'#d8c070')}
  if(d.to===myClassToday()){const lw=Math.max(28,pxw((d.label||shortName(d.to).toUpperCase()).slice(0,12))+8);g.globalAlpha=.35+Math.sin(T*4)*.2;R(d.x-lw/2-1,20,lw+2,11,'#ffd27a');g.globalAlpha=1;pxc((d.label||shortName(d.to).toUpperCase()).slice(0,12),d.x,23,'#fff6d0')}
 }
}}
/* outside, the Portable’s own door is already in the picture */
{const _dw2=drawWorldDoors;drawWorldDoors=function(room){if(room!=='walkway')return _dw2(room);
 const x=272,open=D&&D.doorAnim&&D.doorAnim.room==='walkway'&&D.doorAnim.x===x?D.doorAnim.k:0;
 /* the Portable’s door: metal, in the siding, up two wooden steps */
 R(x-11,44,22,52,'#b89a6a');R(x-10,45,20,51,'#1a1612');
 if(open>0){R(x-9,46,18,50,'#c8b8a0');g.globalAlpha=.4;R(x-9,46,18,50,'#000');g.globalAlpha=1}
 const w=Math.max(2,Math.round(20*(1-open)));R(x-10,45,w,51,'#8a6e4a');R(x-10,45,w,1,'#a8885e');if(w>12){R(x-7,50,12,12,'#2a2a30');R(x-6,51,10,10,'#c8b8a0');R(x+5,72,2,3,'#d8c070')}
 R(x-14,96,28,4,'#8a6a42');R(x-14,96,28,1,'#a8885a');R(x-16,100,32,5,'#7a5a36');R(x-16,100,32,1,'#9a7a4e');R(x-16,105,32,3,'rgba(0,0,0,.25)');
}}
