'use strict';
/* =====================================================================
   HIGHSCHOOL REMASTERED — TEACHERS AS THEMSELVES
   Every adult gets their own FACE (jaw, nose, brows, eye bags, lips,
   wrinkles, extras), their own WALK (speed, bounce, sway) and an IDLE
   HABIT they fall into when they're standing around.
   Face geometry: eyes at (ex-4..ex-3) and (ex+2..ex+3) on row ey,
   ex = x + facing, ey = hy+5; the mouth sits around ey+4.
   ===================================================================== */
{
const ink='#1a1410';
const shade=(c,a)=>'rgba(0,0,0,'+(a||.18)+')';
const FACE={
 coach(k,x,hy,d,hw,hd,ex,ey){const hx=x-(hw>>1);
  R(hx-1,hy+hd-5,1,4,k.skin);R(hx+hw,hy+hd-5,1,4,k.skin);R(hx-1,hy+hd-1,hw+2,1,k.skin);       /* square jaw */
  R(ex-5,ey-2,3,1,ink);R(ex+2,ey-2,3,1,ink);                                                     /* heavy flat brows */
  R(ex-1,ey+1,3,2,shade(0,.22));R(ex-1,ey+1,1,1,'rgba(255,255,255,.15)');                         /* broken nose */
  for(let i=0;i<7;i++)R(hx+1+i*2,hy+hd-2-(i%2),1,1,'rgba(30,20,10,.35)');                         /* stubble */
  R(x-4,hy+hd,8,2,k.skin)},                                                                         /* bull neck */
 voss(k,x,hy,d,hw,hd,ex,ey){const hx=x-(hw>>1);
  R(hx+2,hy+hd-1,hw-4,2,k.skin);R(hx+4,hy+hd+1,hw-8,1,k.skin);                                    /* long chin */
  R(hx+1,ey+2,2,3,shade(0,.15));R(hx+hw-3,ey+2,2,3,shade(0,.15));                                  /* hollow cheeks */
  R(ex-4,ey+2,2,1,'rgba(90,60,90,.45)');R(ex+2,ey+2,2,1,'rgba(90,60,90,.45)');                      /* deep bags */
  R(ex+d*0-1,ey+1,2,3,k.skin);R(d>0?ex+1:ex-3,ey+3,2,1,k.skin);R(ex-1,ey+1,1,3,shade(0,.2));        /* hooked nose */
  R(ex-5,ey-2,2,1,'#7a7070');R(ex+3,ey-3,2,1,'#7a7070')},                                            /* thin, uneven brows */
 shermian(k,x,hy,d,hw,hd,ex,ey){
  R(ex-5,ey-2,1,1,ink);R(ex-4,ey-3,2,1,ink);R(ex+2,ey-3,2,1,ink);R(ex+4,ey-2,1,1,ink);              /* sharp arched brows */
  R(ex-5,ey,1,1,ink);R(ex+4,ey,1,1,ink);                                                             /* lashes */
  R(ex-2,ey+4,4,1,'#c0203a');R(ex-1,ey+5,2,1,'#a01830');                                           /* lipstick */
  R(ex+4,ey+3,1,1,'#3a2018');                                                                        /* beauty mark */
  R(ex-6,ey+2,2,1,'rgba(220,80,110,.35)');R(ex+4,ey+2,2,1,'rgba(220,80,110,.35)')},                   /* cheekbones */
 sherman(k,x,hy,d,hw,hd,ex,ey){const hx=x-(hw>>1);
  R(hx-1,hy+hd-5,1,3,k.skin);R(hx+hw,hy+hd-5,1,3,k.skin);R(hx,hy+hd-1,hw,1,k.skin);                 /* soft jowls */
  R(ex-6,ey+3,1,2,shade(0,.12));R(ex+5,ey+3,1,2,shade(0,.12));                                     /* smile lines */
  R(ex-2,ey+4,4,1,'#b86a6a')},
 pat(k,x,hy,d,hw,hd,ex,ey){const hx=x-(hw>>1);
  R(hx-1,ey+1,1,5,k.skin);R(hx+hw,ey+1,1,5,k.skin);                                                  /* round cheeks */
  R(hx+2,hy+hd-1,hw-4,1,shade(0,.15));R(hx+3,hy+hd,hw-6,1,k.skin);                                  /* double chin */
  R(ex-4,ey,2,2,k.skin);R(ex-4,ey+1,2,1,ink);                                                         /* the squint (one good eye) */
  R(ex+4,ey+3,1,1,'#5a3a2a')},                                                                        /* mole */
 adam(k,x,hy,d,hw,hd,ex,ey){
  R(ex-4,ey-3,1,1,ink);R(ex-3,ey-2,2,1,ink);R(ex+2,ey-2,2,1,ink);R(ex+4,ey-3,1,1,ink);              /* worried brows */
  R(ex-1,ey+1,2,3,shade(0,.18));R(ex-1,ey+3,3,1,shade(0,.12));                                       /* big nose */
  R(ex-6,ey+2,2,1,'rgba(230,90,90,.35)');R(ex+4,ey+2,2,1,'rgba(230,90,90,.35)');                     /* flushed */
  if(Math.sin(T*2+k.seed)>.2){R(ex-6,hy+2,1,2,'#bfe8ff');R(ex+5,hy+3,1,2,'#bfe8ff')}},                /* sweat */
 kim(k,x,hy,d,hw,hd,ex,ey){
  R(ex-5,ey-3,3,1,ink);R(ex+2,ey-3,3,1,ink);                                                          /* high arched brows */
  R(ex-4,ey+4,8,1,'#5a1a1a');R(ex-5,ey+3,1,1,'#5a1a1a');R(ex+4,ey+3,1,1,'#5a1a1a');R(ex-3,ey+4,6,1,'#f4f0e6'); /* the too-wide smile */
  R(ex-6,ey+2,2,2,'rgba(230,70,90,.4)');R(ex+4,ey+2,2,2,'rgba(230,70,90,.4)')},                        /* rosy, like makeup */
 loach(k,x,hy,d,hw,hd,ex,ey){
  R(ex-4,ey,2,1,k.skin);R(ex+2,ey,2,1,k.skin);R(ex-4,ey,2,1,'rgba(0,0,0,.25)');R(ex+2,ey,2,1,'rgba(0,0,0,.25)');  /* heavy lids */
  R(ex-4,ey+2,2,1,'rgba(60,30,40,.4)');R(ex+2,ey+2,2,1,'rgba(60,30,40,.4)');                        /* tired */
  R(ex-2,ey+4,4,1,'#6a3a3a')},                                                                        /* flat mouth */
 balduf(k,x,hy,d,hw,hd,ex,ey){for(const [a,b] of[[-5,2],[-3,3],[3,2],[5,3]])R(ex+a,ey+b,1,1,'rgba(150,80,40,.5)');R(ex-1,ey+4,2,1,'#8a3a3a')},
 grieve(k,x,hy,d,hw,hd,ex,ey){const hx=x-(hw>>1);
  R(ex-6,ey-2,4,1,'#d8d0c0');R(ex+2,ey-2,4,1,'#d8d0c0');                                              /* bushy white brows */
  R(hx+3,hy+2,hw-6,1,shade(0,.12));R(hx+3,hy+4,hw-6,1,shade(0,.1));                                 /* forehead lines */
  R(hx-2,ey,2,3,k.skin)},                                                                              /* big ears */
 glen(k,x,hy,d,hw,hd,ex,ey){R(ex-5,ey-2,3,1,ink);R(ex+2,ey-2,3,1,ink);R(x-5,hy+hd,10,2,k.skin);R(ex-2,ey+4,4,1,'#5a2a2a')},
 cheeks(k,x,hy,d,hw,hd,ex,ey){R(ex-3,ey+4,6,1,'#e8d868');R(ex-6,ey+2,2,2,'rgba(230,90,90,.4)');R(ex+4,ey+2,2,2,'rgba(230,90,90,.4)')},
 clapper(k,x,hy,d,hw,hd,ex,ey){R(ex-3,ey+4,6,1,'#e8d868');R(ex-5,ey-2,3,1,ink);R(ex+2,ey-2,3,1,ink)}
};
const idOf=k=>k&&(k._id||(k._id=Object.keys(K).find(i=>K[i]===k)||Object.keys(K).find(i=>K[i]&&K[i].n===k.n)));
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){_dh(k,x,hy,d,o);
 try{if(!k||!k.adult||!o||o.crushed||o.back||o.ex==='dead'||o.deadFace)return;const id=idOf(k),f=FACE[id];if(!f)return;
  const {hw,hd}=kidGeom(k,o);f(k,x,hy,d,hw,hd,x+d,hy+(k.knob?6:5))}catch(e){}}}

/* walks: [speed, bounce, sway] */
const GAIT={coach:[.75,2,0],voss:[.55,0,0],shermian:[1.35,0,1],sherman:[.7,1,1],pat:[.85,1,2],adam:[1.8,1,0],kim:[1.15,3,0],loach:[.6,0,0],
 balduf:[1.3,1,1],grieve:[.6,0,0],glen:[.7,2,1],cheeks:[.8,2,1],clapper:[.8,2,1],sub:[1,1,0]};
{const _dk=drawKid;drawKid=function(k,x,y,o){
 const id=k&&k.adult&&idOf(k),G_=id&&GAIT[id];
 if(!G_||!o||!o.moving)return _dk(k,x,y,o);
 const ph=(o.walk||0)*G_[0];
 const by=-Math.round(Math.abs(Math.sin(ph))*G_[1]),sx=Math.round(Math.sin(ph*.5)*G_[2]);
 return _dk(k,x+sx,y+by,Object.assign({},o,{walk:ph}))}}

/* idle habits */
const HABIT={coach:['hips',2],shermian:['cross',3],voss:['hold',2],pat:['cross',3],adam:['facepalm',1.4],kim:['wave',1.2],loach:['drink',2.5],
 balduf:['write',2],grieve:['point',1.5],sherman:['cross',3],glen:['hips',2]};
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(busy||!D||panelMode!=='roam')return;const s=rdt||dt||.016;
 for(const id in A){const a=A[id],H_=HABIT[id];if(!H_||a.moving||a.dead)continue;
  a._hb=(a._hb==null?4+Math.random()*6:a._hb-s);
  if(a._hb<=0){if(a._hbOn){if(a.pose===H_[0])a.pose=null;a._hbOn=0;a._hb=6+Math.random()*8}
   else if(!a.pose){a.pose=H_[0];a._hbOn=1;a._hb=H_[1]}}}}}
}
