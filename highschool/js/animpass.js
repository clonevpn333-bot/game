'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — ANIMATION PASS
   • Hair that moves: long styles and ponytails get a trailing tip that
     swings with the walk cycle, lifts back on a run, and sways at rest.
   • New poses live in art.js: clap (o.slow for a slow clap), dance, beg
     (on knees, hands together), sob (on knees, face in hands, shaking).
   • Dancers at Marcus's party; the cafeteria slow clap is staged.
   ===================================================================== */
{
const LONG={ponytail:[3,9,1.6],straight:[2,6,1],wavy:[2,5,1],wavyb:[3,6,1],limp:[2,9,1],braids:[1,10,1.3],bob:[2,5,.8],fringe:[2,6,1],curlyl:[3,8,1],perm:[2,5,.6]};
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){
 _dh(k,x,hy,d,o);
 if(o&&o.pose==='sob'&&!o.crushed){const sh=Math.sin(T*14)>.3?1:0;R(x-5+sh,hy+4,4,5,k.skin);R(x+1+sh,hy+4,4,5,k.skin);R(x-1+sh,hy+5,2,3,'rgba(0,0,0,.15)')}
 try{const L=LONG[k.hs];if(!L||!o||o.crushed||o.noHair||o.pose==='lie'||o.pose==='crouch')return;
  const {hw}=kidGeom(k,o),hx=x-(hw>>1),c=k.hair,[w,len,amp]=L;
  const mv=o.moving,run=o.fast&&mv,ph=o.walk||0;
  const sw=mv?Math.sin(ph)*(run?2:1.2)*amp:Math.sin(T*1.5+k.seed)*.7*amp;
  const lift=mv?(run?3:1):0;
  const bxs=d>0?hx-w-lift:hx+hw+lift;  /* the back side of the head */
  const ty=hy+2+Math.max(2,len-3)-(run?2:0)+Math.round(sw*.5);
  if(k.hs==='ponytail'){const tx=d>0?hx-4-lift:hx+hw+1+lift;R(tx,ty,3,3,c);R(tx+(d>0?-1:3),ty+1+Math.round(sw),1,2,c)}
  else{R(bxs,ty,w,3,c);if(mv)R(bxs+(d>0?-1:w),ty+1+Math.round(sw),1,2,c)}
 }catch(e){}}}

/* ---- the party dances ---- */
if(ROOMS.party){const ob=ROOMS.party.bg;ROOMS.party.bg=function(){ob.apply(this,arguments);
 if(typeof crowdKid!=='function')return;
 for(let i=0;i<4;i++){const x=150+i*20+Math.round(Math.sin(T*.6+i)*4),y=112+(i%2)*3;
  drawKid(crowdKid(i+11),x,y,{dir:i%2?-1:1,pose:'dance',ex:i%2?'happy':'laugh'})}}}
}

/* ---- chewing: anyone holding food chews (mouth opens and shuts) ---- */
{const FOODS=new Set(['sandwich','crisps','cookie','tray','juice']);
 const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);
  try{if(!o||!o.hold||!FOODS.has(o.hold)||o.talk||o.crushed||o.back||o.ex==='dead')return;
   const ph=(T*4+k.seed*.37)%3;if(ph>2)return; /* a pause between mouthfuls */
   const open=Math.sin(T*14+k.seed)>0,mx=x+d-1,my=hy+(k.knob?9:8);
   R(mx,my,3,open?2:1,open?'#5a2028':'#7a3a3a');if(open)R(mx+1,my,1,1,'#e8d0a0')}catch(e){}}}

/* ---- a beating lasts all day; a face doesn't ---- */
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 try{if(!D||!A.you)return;const day=typeof cal==='function'?cal():0,I=D.f.injury&&D.f.injury.day===day?D.f.injury:(D.f.injury={day,hurt:0,bloody:0,stain:null});
  const a=A.you;
  /* remember the worst of today */
  if((a.hurt||0)>I.hurt)I.hurt=a.hurt;if(a.bloody&&!I.bloody)I.bloody=1;
  /* and put it back whenever a new room or scene rebuilds you */
  if((a.hurt||0)<I.hurt)a.hurt=I.hurt;if(I.bloody&&!a.bloody)a.bloody=1;
  /* expressions fade back to neutral a few seconds after a scene */
  if(!busy&&panelMode==='roam'&&a.ex){a._exT=(a._exT||0)+(rdt||dt||.016);if(a._exT>3.5){a.ex=null;a._exT=0}}else a._exT=0;
 }catch(e){}}}
