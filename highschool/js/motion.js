'use strict';
/* =====================================================================
   HIGHSCHOOL — MOTION
   Nobody clicks into a pose any more. Arms travel from where they were
   to where they’re going, fast and hard when someone’s angry or scared,
   slow and heavy when they’re sad. People fall over instead of
   appearing on the floor, and get back up the same way.
   ===================================================================== */
/* where each pose puts the hands, relative to the shoulders.
   dx is “forward” (the way they face), dy is down from the top of the body. */
const ARMS={
 _:{f:[0,7],b:[0,7]},
 cross:{f:[-4,5],b:[5,5]},lean:{f:[-4,5],b:[5,5]},hips:{f:[2,6],b:[-2,6]},point:{f:[9,1],b:[0,7]},punch:{f:[10,2],b:[0,7]},
 slam:{f:[1,-8],b:[-1,-6]},up:{f:[0,-8],b:[0,-8]},cheer:{f:[0,-8],b:[0,-8]},cover:{f:[-2,-4],b:[2,-4]},cry:{f:[-2,-4],b:[2,-4]},
 facepalm:{f:[-3,-5],b:[0,7]},wave:{f:[1,-8],b:[0,7]},shrug:{f:[4,4],b:[-4,4]},hold:{f:[9,3],b:[0,7]},choke:{f:[9,1],b:[2,4]},
 grab:{f:[7,1],b:[0,7]},carry:{f:[4,4],b:[0,5]},phone:{f:[3,1],b:[0,7]},film:{f:[5,-4],b:[0,7]},throw:{f:[-3,-9],b:[2,6]},
 hug:{f:[9,4],b:[9,6]},kiss:{f:[9,4],b:[9,6]},write:{f:[5,4],b:[0,7]},sit:{f:[3,5],b:[0,7]},hurt:{f:[-3,4],b:[0,7]},
 drink:{f:[-1,-3],b:[0,7]},mic:{f:[-2,-1],b:[0,7]},headbutt:{f:[-2,8],b:[-2,8]},kick:{f:[-4,2],b:[4,2]},reach:{f:[3,-9],b:[0,7]},
 zombie:{f:[9,1],b:[7,3]},overhead:{f:[-1,-13],b:[1,-13]},stab:{f:[8,3],b:[0,7]},drag:{f:[-9,3],b:[0,5]},stomp:{f:[4,-1],b:[-4,-1]},
 kneel:{f:[2,5],b:[0,7]},conduct:{f:[1,-6],b:[0,7]},paint:{f:[6,1],b:[0,7]},type:{f:[4,5],b:[3,6]},swim:{f:[0,-8],b:[0,-8]},
 saw:{f:[7,3],b:[0,7]},sing:{f:[2,3],b:[-2,3]},dribble:{f:[1,8],b:[0,7]},
 clap:{f:[5,3],b:[5,3]},slowclap:{f:[5,3],b:[5,3]},dance:{f:[0,-8],b:[0,7]},beg:{f:[2,-3],b:[2,-3]},sob:{f:[-2,-4],b:[2,-4]},
};
const armOf=p=>ARMS[p]||ARMS._;
/* how a feeling moves */
function feel(ex){
 if(['angry','yell','evil','smirk'].includes(ex))return{dur:.15,ease:'back'};
 if(['scared','shock','hurt'].includes(ex))return{dur:.09,ease:'expo',shiver:1};
 if(['sad','cry','closed','love','blush'].includes(ex))return{dur:.55,ease:'sine'};
 if(['laugh','happy'].includes(ex))return{dur:.2,ease:'back'};
 return{dur:.26,ease:'cubic'};
}
const EASE={
 cubic:k=>1-Math.pow(1-k,3),
 sine:k=>.5-Math.cos(Math.PI*k)/2,
 expo:k=>k>=1?1:1-Math.pow(2,-10*k),
 back:k=>{const c=2.2;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)}
};
/* a 2px limb from a to b, bending at the elbow */
function limb(ax,ay,hx,hy,bend,c1,c2,sk){
 const mx=(ax+hx)/2,my=(ay+hy)/2,dx=hx-ax,dy=hy-ay,L=Math.max(1,Math.hypot(dx,dy));
 const ex=mx+(-dy/L)*bend,ey=my+(dx/L)*bend;
 const seg=(x0,y0,x1,y1,c)=>{const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++){const t=i/n;R(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),2,2,c)}};
 seg(ax,ay,ex,ey,c1);seg(ex,ey,hx,hy,c2);R(Math.round(hx),Math.round(hy),2,2,sk);
}
function glideArms(tr,p,G){
 const {by,d,top,sl,sk,fs,bs}=G;
 const A0=armOf(tr.from),A1=armOf(p),k=tr.k;
 const sh=tr.shiver?Math.round(Math.sin(T*70)*(1-k)):0;
 const at=(a,b)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
 const f=at(A0.f,A1.f),b=at(A0.b,A1.b);
 const fx=fs+f[0]*d,fy=by+1+f[1]+sh,bx_=bs+b[0]*d,by_=by+1+b[1];
 limb(bs,by+1,bx_,by_,-d*1.2,top,sl,sk);
 limb(fs,by+1,fx,fy,d*1.4,top,sl,sk);
 return{hx:Math.round(fx),hy:Math.round(fy)};
}
/* track pose changes on every actor */
{const _da=drawActor;drawActor=function(a){
 if(a&&a.k){
  const lying=!!(a.dead||a.pose==='lie');
  const cur=lying?'lie':(a.air&&!a.pose?'up':a.pose)||null;
  if(a._pose===undefined){a._pose=cur;a._lie=lying?1:0}
  if(cur!==a._pose){
   const was=a._pose;a._pose=cur;
   if(!lying&&was!=='lie'){const f=feel(a.ex||a._ex);a._tr={from:was,t0:T,dur:f.dur,ease:f.ease,shiver:f.shiver}}
   else a._tr=null;
   if(lying&&was!=='lie')a._fall={t0:T,up:0,dur:a.dead?.42:.5};
   if(!lying&&was==='lie')a._fall={t0:T,up:1,dur:.45};
  }
  if(a._tr){const q=Math.min(1,(T-a._tr.t0)/a._tr.dur);if(q>=1){a._tr=null;a._trK=null}else a._trK={from:a._tr.from,k:EASE[a._tr.ease](q),shiver:a._tr.shiver}}else a._trK=null;
  if(a._fall){
   const q=Math.min(1,(T-a._fall.t0)/a._fall.dur);
   if(q>=1){a._fall=null}
   else{
    /* falling: gravity on the way down, a little bounce at the bottom. Getting up: slow, then quick. */
    const e=a._fall.up?1-EASE.cubic(q):(q*q);
    return fallFrame(a,e,a._fall.up?0:q);
   }
  }
 }
 return _da(a);
}}
function fallFrame(a,e,q){
 const k=a.k,y=Math.round(a.y-(a.z||0));
 const ang=(a.dir>0?-1:1)*Math.PI/2*e;
 const bounce=(!q||q<.85)?0:Math.round(Math.sin((q-.85)/.15*Math.PI)*-1.5);
 if(a.alpha<1)g.globalAlpha=Math.max(0,a.alpha);
 g.save();g.translate(Math.round(a.x),y-5*e+bounce);g.rotate(ang);
 drawKid(k,0,5*e+(1-e)*0,{dir:e<.35?(a.dir||1):1,still:1,hs:a.hs,ex:a.dead?(e>.8?'dead':'hurt'):(a.ex||'shock'),noHead:a.dead==='head',crushed:a.dead==='crush',hurt:a.hurt,bloody:a.dead||a.bloody,hold:null,pose:e<.5?'hurt':null});
 g.restore();g.globalAlpha=1;
}
/* punches land on a wind-up, not a teleport */
{const _hit=hit;hit=async function(a,b,o){const p=A[a];if(p&&!TEST){const was=p.pose;p.pose='throw';await wait(90);p.pose=was}return _hit(a,b,o)}}
