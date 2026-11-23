'use strict';
/* =====================================================================
   HIGHSCHOOL — DOORS THAT BELONG TO THE WALL
   Classroom doors used to be stamped on top of the hallway art, cutting
   through murals and banners. Now every door sits in its own doorway:
   a clean bay of wall, a painted frame and lintel with the room’s sign,
   a shadowed recess, a window with a glimpse of the room behind it, a
   kick plate, a threshold. Walk up to one and it opens a crack; go
   through and it swings all the way open, with the room’s light
   spilling out into the hall.
   ===================================================================== */
const WALLC={};
function wallColorFor(room){
 if(WALLC[room])return WALLC[room];
 try{const d=g.getImageData(0,0,W,1+0,{willReadFrequently:true});}catch(e){}
 let col='#d8d0bc';
 try{const row=g.getImageData(0,9,W,1).data,cnt={};for(let i=0;i<W;i++){const k=(row[i*4]>>3)+','+(row[i*4+1]>>3)+','+(row[i*4+2]>>3);cnt[k]=(cnt[k]||0)+1}
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0].split(',').map(v=>v*8+4);col='rgb('+top.join(',')+')';
  WALLC[room]={wall:col,rgb:top}}catch(e){WALLC[room]={wall:col,rgb:[216,208,188]}}
 return WALLC[room];
}
const shade=(rgb,f)=>'rgb('+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v*f)))).join(',')+')';
const INSIDE={english:'#7a8a5a',maths:'#e8c4cc',history:'#a8885a',toilets:'#9ab8c8',canteen:'#e8e0c8',library:'#8a6a4a',hall:'#4a2a3a',office:'#6a5a4a',psych:'#8a9aa8',art:'#e8d8b0',music:'#5a4a6a',ict:'#3a4a6a',drama:'#2a1a2a',chem:'#c8d8c0',science:'#9aa894',woodwork:'#8a6a48',foodtech:'#e8d8c0',gym:'#c8a070',pool:'#7ac8e8',trailer:'#c8b8a0'};
function doorBay(d,room,open,near){
 const x=d.x,C=wallColorFor(room),rgb=C.rgb;
 const label=(d.label||shortName(d.to).toUpperCase()).slice(0,12),mine=d.to===myClassToday();
 const trim=shade(rgb,.55),trimL=shade(rgb,.75),trimD=shade(rgb,.4);
 /* clean wall bay */
 R(x-26,12,52,96,C.wall);R(x-26,12,1,96,shade(rgb,.85));R(x+25,12,1,96,shade(rgb,.85));
 /* frame + lintel */
 R(x-22,26,44,82,trim);R(x-22,26,44,2,trimL);R(x-22,26,2,82,trimL);R(x+20,26,2,82,trimD);
 /* sign plate on the lintel */
 const lw=Math.max(30,pxw(label)+8);R(x-lw/2,14,lw,10,mine?'#c89a30':'#2a2a36');R(x-lw/2,14,lw,1,mine?'#ffe08a':'#4a4a5a');R(x-lw/2,23,lw,1,'rgba(0,0,0,.4)');pxc(label,x,16,mine?'#2a1a08':'#f0e6c8');
 R(x-1,10,2,4,'#6a6a72');
 /* the recess */
 R(x-18,30,36,78,'#1a1418');
 const inside=INSIDE[d.to]||'#6a6a6a';
 const k=Math.max(open,near?.12:0);
 /* what you see through the open door */
 if(k>0){R(x-17,31,34,76,inside);g.globalAlpha=.35;R(x-17,31,34,76,'#000');g.globalAlpha=1;R(x-17,31,34,2,'rgba(255,255,255,.2)');
  g.globalAlpha=.18*k*2;for(let i=0;i<24;i++)R(x-16-i*1.2,108+i,34+i*2.4,1,'#fff4d0');g.globalAlpha=1}
 /* the door, swinging in on its hinge */
 const w=Math.max(3,Math.round(34*(1-k)));
 R(x-17,31,w,76,'#7a4e30');R(x-17,31,w,1,'#a06c44');R(x-17+w-1,31,1,76,'#5a3820');
 if(w>16){R(x-14,36,Math.min(w-6,14),20,'#2a2a30');R(x-13,37,Math.min(w-8,12),18,inside);g.globalAlpha=.4;R(x-13,37,Math.min(w-8,12),3,'#fff');g.globalAlpha=1;
  R(x-15,92,Math.min(w-4,30),10,'#a8a8b0');R(x-15,92,Math.min(w-4,30),1,'#d8d8e0');
  const hx=x-17+w-6;R(hx,66,3,3,near?'#ffe8a0':'#d8c070');if(near&&Math.sin(T*6)>.3)R(hx+1,65,1,1,'#fff')}
 /* threshold and shadow */
 R(x-20,106,40,2,trimD);g.globalAlpha=.25;R(x-22,108,44,3,'#000');g.globalAlpha=1;
 if(mine&&Math.sin(T*4)>0)R(x-1,113,3,3,'#ffd27a');
}
drawWorldDoors=function(room){
 const w=WORLD[room];if(!w)return;
 const nd=typeof nearDoor==='function'&&D&&D.room===room&&panelMode==='roam'&&!busy?nearDoor():null;
 for(const d of w.doors){
  if(d.front)continue;
  if(d.stairs){drawStairs(d.x,d.stairs);continue}
  const open=D&&D.doorAnim&&D.doorAnim.room===room&&D.doorAnim.x===d.x?D.doorAnim.k:0;
  doorBay(d,room,open,nd===d&&A.you&&Math.abs(A.you.x-d.x)<10);
 }
};
