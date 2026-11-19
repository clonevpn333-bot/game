'use strict';
/* =====================================================================
   HIGHSCHOOL — POLISH
   The last things that clicked into place:
   • When a scene moves somebody (steps them next to someone, shuffles
     them along a bench, sits them down), they don’t teleport any more.
     They step there, quickly, with their legs moving.
   • Sitting down and kneeling settle with a little give, instead of
     snapping from standing to seated.
   (Real entrances from off-screen and room changes still cut, the way
   a camera cut should.)
   ===================================================================== */
{let lastT=0;
 const _da=drawActor;drawActor=function(a){
  if(!a||a.vis===false)return _da(a);
  if(a._sx==null||a._room!==ROOM){a._sx=a.x;a._sy=a.y;a._room=ROOM;a._st=T}
  const dt=Math.max(0,Math.min(.1,T-(a._st||T)));a._st=T;
  let dx=a.x-a._sx,dy=a.y-a._sy;
  if(Math.abs(dx)>110||Math.abs(dy)>70||a.dead&&!a._wasDead){a._sx=a.x;a._sy=a.y;dx=dy=0}
  a._wasDead=!!a.dead;
  const gx=Math.abs(dx)>2.5,gy=Math.abs(dy)>1.5;
  let glide=false;
  if(gx||gy){const k=Math.min(1,dt*(gx?9:12));a._sx+=dx*k;a._sy+=dy*k;glide=true}
  else{a._sx=a.x;a._sy=a.y}
  /* sitting / kneeling: settle */
  const tr=a._trK,settle=tr&&tr.k<1&&(['sit','kneel'].includes(tr.from)||['sit','kneel'].includes(a.pose));
  if(!glide&&!settle)return _da(a);
  const ox=a.x,oy=a.y,om=a.moving,ow=a.walk,od=a.dir;
  if(glide){a.x=a._sx;a.y=a._sy;if(gx&&!a.pose&&!a.dead&&!a.sitHigh){a._wp=(a._wp||0)+dt*11;a.moving=true;a.walk=a._wp;a.dir=dx>0?1:-1}}
  try{
   if(settle){const q=Math.sin(Math.PI*tr.k)*.12;g.save();g.translate(a.x,a.y);g.scale(1+q*.3,1-q);g.translate(-a.x,-a.y);_da(a);g.restore()}
   else _da(a);
  }finally{a.x=ox;a.y=oy;a.moving=om;a.walk=ow;a.dir=od}
 }}

/* ---------- the info box: compact, tap to expand ---------- */
{const st=document.createElement('style');st.textContent=`
#clock{pointer-events:auto;cursor:pointer}
#clock .story{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#clock .story.nowbox{display:block;-webkit-line-clamp:unset}
#clock .nowbox div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#clock .nowbox div:nth-child(n+5){display:none}
#clock.full .story{-webkit-line-clamp:unset;display:block}
#clock.full .nowbox div{display:block!important}
#clock .tapnote{display:none;color:#8a7a9a;font-size:9px;margin-top:2px}
@media (max-width:950px),(max-height:520px){
 #clock{max-width:38vw;font-size:10px;padding:3px 6px}
 #clock small{font-size:9px}
 #clock .story{-webkit-line-clamp:1;font-size:9px;max-width:37vw}
 #clock .nowbox{font-size:9px}#clock .nowbox div:nth-child(n+4){display:none}
 #clock .tapnote{display:block}
 #clock.full{max-width:70vw}#clock.full .story{max-width:68vw}
}`;document.head.appendChild(st)}
{const c=$('clock');if(c)c.addEventListener('click',e=>{e.stopPropagation();c.classList.toggle('full')})}
{const _ul=updateLoc;updateLoc=function(){_ul();const c=$('clock');if(!c||c.querySelector('.tapnote'))return;const t=document.createElement('div');t.className='tapnote';t.textContent=c.classList.contains('full')?'tap to shrink':'tap for more';c.appendChild(t)}}
