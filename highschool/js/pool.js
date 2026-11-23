'use strict';
/* =====================================================================
   HIGHSCHOOL — THE POOL
   People in the water are IN the water: head and shoulders above the
   surface, bobbing, with ripples round them, and the rest of them a
   wobbly blue shape under it. Somebody drowning flails, sinks, comes
   up, sinks, and bubbles. A body floats face-down.
   ===================================================================== */
const POOL_WL=126;   /* where the water starts in the pool room */
function inWater(a){return ROOM==='pool'&&a&&a.y>=POOL_WL+2&&!a.sitHigh&&!(a.z>2)}
function drowning(a){return a._drown||(a.pose==='swim'&&['scared','shock','hurt','cry'].includes(a.ex))}
{const _da=drawActor;drawActor=function(a){
 if(!inWater(a)||a.vis===false)return _da(a);
 const sd=((a.id||'').length*1.7)%6.28;
 if(a.dead){ /* floating face-down, mostly under */
  const oy=a.y;a.y=oy-2+Math.sin(T*1.2+sd);
  g.save();g.globalAlpha=.55;_da(a);g.restore();a.y=oy;
  g.globalAlpha=.35;R(a.x-16,a.y-4,32,2,'#bfe8ff');g.globalAlpha=1;return;
 }
 const G=kidGeom(a.k,{pose:'swim'}),dr=drowning(a);
 const bob=Math.sin(T*3+sd)*1.2+(dr?Math.max(0,Math.sin(T*2.2+sd))*9:0);
 const oy=a.y,op=a.pose;a.y=oy+bob+(G.legH+G.bodyH-5);  /* sink the body so the shoulders sit at the surface */
 if(!a.pose||a.pose==='swim')a.pose=dr&&Math.sin(T*9+sd)>0?'up':'swim';
 const wl=oy-2;   /* the surface line for this person, on screen */
 /* the part under water: faded and blue */
 g.save();g.beginPath();g.rect(0,wl,W,H);g.clip();g.globalAlpha=.32;_da(a);g.restore();
 /* the part above */
 g.save();g.beginPath();g.rect(0,0,W,wl);g.clip();_da(a);g.restore();
 a.y=oy;a.pose=op;
 /* ripples */
 const rw=12+Math.sin(T*4+sd)*2+(dr?5:0);
 g.globalAlpha=.55;R(a.x-rw/2,wl,rw,1,'#e8f8ff');g.globalAlpha=.3;R(a.x-rw/2-4,wl+2,rw+8,1,'#e8f8ff');
 const q=(T*1.5+sd)%1;g.globalAlpha=.35*(1-q);R(a.x-rw/2-q*10,wl+1,rw+q*20,1,'#ffffff');g.globalAlpha=1;
 if(dr){for(let i=0;i<4;i++){const b=(T*1.6+i*.27+sd)%1;R(a.x-4+((i*5)%9),wl-b*10,2,2,'rgba(230,248,255,'+(.8-b*.7)+')')}
  if(Math.sin(T*6+sd)>.7)R(a.x-8,wl-2,16,2,'rgba(255,255,255,.6)')}
}}
/* the pool’s own surface gets a real ripple and shine, drawn over the people below it */
if(ROOMS.pool){const ob=ROOMS.pool.over;ROOMS.pool.over=function(){
 g.globalAlpha=.22;R(0,POOL_WL,W,H-POOL_WL,'#1a7ab0');g.globalAlpha=1;
 for(let i=0;i<W;i+=10){g.globalAlpha=.18;R(i+Math.round(Math.sin(T*1.4+i*.2)*3),POOL_WL+6+((i*7)%40),7,1,'#ffffff')}
 g.globalAlpha=.3;R(0,POOL_WL,W,1,'#e8f8ff');g.globalAlpha=1;
 /* caustics on the floor tiles */
 g.globalAlpha=.08;for(let i=0;i<14;i++){const x=(i*37+Math.sin(T*.8+i)*8)%W,y=POOL_WL+14+((i*23)%40);R(x,y,10,3,'#ffffff')}g.globalAlpha=1;
}}
/* anyone told to swim in the pool goes into the water instead of standing on it */
{const _pose=pose;pose=function(id,p,ms){const a=A[id];if(a&&p==='swim'&&ROOM==='pool'&&a.y<POOL_WL+2){a.y=150}return _pose(id,p,ms)}}
