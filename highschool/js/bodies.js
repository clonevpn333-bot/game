'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — BODIES
   1. Teachers are a different SHAPE from kids, not just taller kids.
      Each adult gets a build (legs, body, width): a barrel-chested Coach
      on short legs, Voss a beanpole, the Other Miss tall and thin, the
      real Ms. Sherman short and round, Pat short and wide, and so on.
   2. Facing the camera / facing away. S turns you to face the camera
      (feet side by side, both arms swing, face centered); W turns you
      away (hair down your back, ears, the back of your neck).
   ===================================================================== */
{
/* [extra leg, extra body, width] */
const BUILD={
 shermian:[3,5,12], sherman:[3,5,12], loach:[7,5,12], voss:[13,7,9], coach:[0,8,21], pat:[0,5,21],
 balduf:[1,3,17], adam:[4,5,15], kim:[7,3,12], grieve:[11,5,11], dahl:[9,3,10], fenwick:[11,2,9],
 byte:[0,4,18], tarn:[3,5,16], oakes:[5,7,20], lyle:[8,5,11], cheeks:[3,8,22], clapper:[3,8,22],
 glen:[2,9,23], sub:[8,3,12], kettle:[1,4,18], pratt:[7,3,11]
};
{const _kg=kidGeom;kidGeom=function(k,o){const G=_kg(k,o);
 const id=k&&Object.keys(BUILD).find(i=>K[i]===k||(K[i]&&K[i].n===k.n&&k.adult));
 const b=id&&BUILD[id];if(!b)return G;
 const p=o&&o.pose,low=p==='sit'||p==='write'||p==='kneel'||p==='beg'||p==='sob'||p==='crouch';
 return Object.assign({},G,{legH:low?G.legH:Math.max(5,G.legH+b[0]),bodyH:G.bodyH+b[1],bw:b[2],hw:G.hw+2,hd:G.hd+1})}}
/* Coach's chest, Pat's and Glen's bulk: a little extra shape on the widest ones */
{const _dk=drawKid;drawKid=function(k,x,y,o){const r=_dk(k,x,y,o);
 try{if(k&&k.adult&&!(o&&(o.front||o.back))&&r&&(k===K.coach||k===K.glen||k===K.cheeks||k===K.clapper)){const G=kidGeom(k,o);const bx=Math.round(x)-(G.bw>>1);
  R(bx+2,r.by+2,G.bw-4,1,'rgba(255,255,255,.12)');R(bx+1,r.by+G.bodyH-3,G.bw-2,1,'rgba(0,0,0,.18)')}}catch(e){}
 return r}}

/* ---------------- front / back ---------------- */
const LONGH=new Set(['ponytail','straight','wavy','wavyb','limp','braids','bob','fringe','curlyl','perm','afro']);
function drawFB(k,x,y,o){
 x=Math.round(x);y=Math.round(y);
 const G=kidGeom(k,o),{legH,bodyH,bw}=G,top=o.topC||k.top,sk=k.skin,back=!!o.back;
 const mv=o.moving,ph=o.walk||0,st=mv?Math.sin(ph):0;
 const bob=mv?(Math.abs(st)>.6?1:0):(Math.sin(T*2.2+k.seed)>.6?1:0);
 const bx=x-(bw>>1),lw=k.baggy?5:k.tight?3:4,shoe=k.tight?'#ddd':k.adult?'#1a1418':'#2a2a30';
 /* legs side by side; the stepping one lifts */
 const lift=[st>.3?2:0,st<-.3?2:0],lxs=[x-lw-1,x+1];
 for(let i=0;i<2;i++){const lx=lxs[i],h=legH-lift[i];R(lx,y-legH,lw,h,k.pants);R(lx+(i?lw-1:0),y-legH+1,1,h-2,'rgba(0,0,0,.14)');
  if(k.shorts)R(lx,y-legH+3,lw,h-3,sk);if(k.skirt)R(lx,y-legH+4,lw,h-4,'#d9b49a');
  R(lx-(i?0:1),y-1-lift[i],lw+1,1,shoe)}
 /* body */
 const by=y-legH-bodyH+bob,bh=bodyH-bob;
 if(k.coat)R(bx-1,by,bw+2,bh+5,top);
 R(bx,by,bw,bh,top);R(bx,by,1,bh,'rgba(0,0,0,.2)');R(bx+bw-1,by,1,bh,'rgba(0,0,0,.2)');R(bx+1,by,bw-2,1,'rgba(255,255,255,.12)');R(bx,by+bh-1,bw,1,'rgba(0,0,0,.22)');
 if(!back){
  if(k.zip)R(x,by,1,bh,'rgba(255,255,255,.28)');
  if(k.collar)R(x-2,by,4,1,'#f4f4f4');
  if(k.tie){R(x,by,1,6,'#a02030');R(x-1,by+1,3,1,'#a02030')}
  if(k.hood){R(x-2,by+1,1,4,'#e8e8e8');R(x+1,by+1,1,4,'#e8e8e8')}
  if(k.apron)R(bx+1,by+3,bw-2,bh+2,'#f2f0ea');
  if(k.cardigan){R(x-1,by,2,bh,'rgba(0,0,0,.25)')}
  if(k.whistle){R(x-2,by,1,4,'#e8e8e8');R(x+1,by,1,4,'#e8e8e8');R(x-1,by+4,3,2,'#c0c0c0')}
  if(k.pearls)for(let i=0;i<5;i++)R(x-3+i*1.5,by+1+(i===2?1:0),1,1,'#fff');
  if(k.num){R(x-1,by+3,3,4,'#fff')}
 }else{R(x,by+2,1,bh-3,'rgba(0,0,0,.12)');if(k.hood){R(x-4,by-1,8,3,top);R(x-3,by+2,6,1,'rgba(0,0,0,.2)')}if(k.num){R(x-2,by+3,4,5,'#fff');R(x-1,by+4,2,3,top)}}
 /* arms swing opposite each other */
 const sl=k.tee?sk:top,sw=Math.round(st*2);
 const arm=(ax,s)=>{R(ax,by+1+Math.max(0,s),2,6-Math.abs(s),sl);R(ax,by+1,2,2,top);R(ax,by+7+Math.min(0,s)-(s>0?0:0),2,2,sk)};
 arm(bx-2,sw);arm(bx+bw,-sw);
 /* head */
 const {hw,hd}=G,hTop=by-hd+1+(k.old?1:0),hx=x-(hw>>1);
 if(!back){drawHead(k,x,hTop,0,Object.assign({},o,{back:0}))}
 else{
  const hc=k.hair||'#2a1a12',bald=k.hs==='bald'||k.hs==='receding';
  R(hx+1,hTop,hw-2,1,sk);R(hx,hTop+1,hw,hd-2,sk);R(hx+1,hTop+hd-1,hw-2,1,sk);
  R(hx-1,hTop+4,1,3,sk);R(hx+hw,hTop+4,1,3,sk); /* ears */
  if(bald){R(hx+1,hTop+hd-5,hw-2,3,hc);R(hx+3,hTop+1,4,1,'rgba(255,255,255,.3)')}
  else if(k.hs==='cap'||k.hs==='capr'){const c=k.hs==='cap'?'#2a4a8a':'#c02a32';R(hx-1,hTop-2,hw+2,5,c);R(hx+3,hTop+3,hw-6,1,'#e8e8e8');R(hx,hTop+3,hw,hd-5,hc)}
  else if(k.hs==='net'){R(hx-1,hTop-3,hw+2,hd-2,hc);for(let i=0;i<hw+2;i+=2)R(hx-1+i,hTop-3,1,hd-2,'rgba(255,255,255,.25)')}
  else{
   const tall=k.hs==='afro'||k.hs==='fluffy'||k.hs==='perm'||k.hs==='bun'||k.hs==='manbun';
   R(hx-1,hTop-(tall?4:2),hw+2,hd-1+(tall?3:1),hc);R(hx+2,hTop-(tall?3:1),hw-4,1,'rgba(255,255,255,.18)');
   if(k.hs==='bun'||k.hs==='manbun'){R(x-3,hTop-7,6,4,hc);R(x-2,hTop-8,4,1,hc)}
   if(LONGH.has(k.hs)){const len=k.hs==='ponytail'?0:k.hs==='bob'?3:k.hs==='afro'?2:7;
    if(len){const sway=mv?Math.round(Math.sin(ph)*1):0;R(hx-1+sway,hTop+hd-2,hw+2,len,hc);R(hx+1+sway,hTop+hd-2+len,hw-2,1,hc)}
    if(k.hs==='ponytail'){const sway=mv?Math.round(Math.sin(ph*1)*2):Math.round(Math.sin(T*1.5)*1);R(x-1,hTop+hd-3,3,2,'#c03030');R(x-1+sway,hTop+hd-1,3,7,hc);R(x+sway,hTop+hd+6,2,2,hc)}
    if(k.hs==='braids'){for(let i=0;i<4;i++)R(hx+i*3,hTop+hd-2,1,7,hc)}}
   else R(hx+1,hTop+hd-3,hw-2,1,'rgba(0,0,0,.2)'); /* short hair: the nape shows */
  }
 }
 if(o.hold&&!back)drawHeld(o.hold,bx+bw+1,by+8,1);
 return{hx:x,hy:hTop,by}}
{const _dk=drawKid;drawKid=function(k,x,y,o){
 if(o&&(o.front||o.back)&&!o.pose&&!o.noHead&&!o.crushed&&!(o.tr&&o.tr.k<1)&&!o.torch)return drawFB(k,x,y,o);
 return _dk(k,x,y,o)}}
/* walking: S faces the camera, W faces away; sideways clears both */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 try{if(panelMode!=='roam'||busy||!A.you)return;const a=A.you,vx=(keys.r-keys.l),vy=(keys.d-keys.u);
  if(vx){a.front=0;a.back=0}else if(vy>0){a.front=1;a.back=0}else if(vy<0){a.front=0;a.back=1}}catch(e){}}}
{const _cs=cutscene;cutscene=function(fn){if(A.you){A.you.front=0;A.you.back=0}return _cs(fn)}}
{const _sc=scene;scene=function(){const r=_sc.apply(this,arguments);if(A.you){A.you.front=0}return r}}
}
