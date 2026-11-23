'use strict';
/* =====================================================================
   HIGHSCHOOL — CINEMA
   No more jump cuts.
   • A scene in a different room fades through black, with a small
     location caption so you always know where you are.
   • A scene that restarts the room you’re already in doesn’t wipe it:
     people who aren’t in the scene run off-screen, the cast already on
     screen walk to their marks, and newcomers walk in from the edge.
   • When the scene’s over, the people who left walk back in.
   • When a new period starts in the hallway you’re standing in, the new
     crowd runs in from both ends instead of popping in.
   ===================================================================== */
let TRANS={a:0,cap:'',capT:-9};
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{_do&&_do(...x);
 if(TRANS.a>0){g.globalAlpha=Math.min(1,TRANS.a);R(0,0,W,H,'#050408');g.globalAlpha=1}
 const ct=T-TRANS.capT;if(TRANS.cap&&ct<2.2){const al=ct<.3?ct/.3:ct>1.6?Math.max(0,(2.2-ct)/.6):1;g.globalAlpha=al;
  const w=pxw(TRANS.cap)+14;R(W/2-w/2,8,w,11,'rgba(10,8,16,.75)');R(W/2-w/2,18,w,1,'#c8a86a');pxc(TRANS.cap,W/2,10,'#f4ead8');g.globalAlpha=1}}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);
 if(TRANS.a>0)TRANS.a=Math.max(0,TRANS.a-(rdt||dt)*2.6);
 for(let i=LEAVERS.length-1;i>=0;i--){const p=LEAVERS[i],a=p.a;a.x+=a.dir*a.lsp*dt;a.walk=(a.walk||0)+dt*14;a.moving=true;a.fast=true;p.x=a.x;p.y=a.y;if(a.x<-40||a.x>360||!props.includes(p)){p.hide=1;LEAVERS.splice(i,1)}}
}}
function roomCaption(room){const r=ROOMS[room];if(!r||!r.name)return'';return r.name.split(' —')[0].replace('Fair City Mall — ','').toUpperCase().slice(0,22)}

/* ---------- people leaving the shot ---------- */
const LEAVERS=[];let lvN=0;
{const _dp=drawProp;drawProp=function(p){if(p.t==='leaver'){if(!p.hide)drawActor(p.a);return}return _dp(p)}}
function leaveShot(a){
 const o=Object.assign({},a);o.id='_lv'+(++lvN);o.pose=null;o.talk=false;o.tx=null;o.res=null;o.hold=a.hold;o.ex=null;o.sit=false;o.sitHigh=false;o.back=0;
 o.dir=a.x<160?-1:1;o.lsp=95+Math.random()*45;o._trK=null;o._tr=null;
 const p=prop({t:'leaver',a:o,x:o.x,y:o.y,layer:0});LEAVERS.push(p);
}
/* who left for the last scene, so they can come back */
let STEPPED_OUT=[];

{const _sc=scene;scene=function(room,cast,fresh){
 if(TEST||!D||!ROOM)return _sc(room,cast,fresh);
 if(room!==ROOM){
  if(!(typeof worldFade!=='undefined'&&worldFade>0)&&!scene.noFade&&room!=='door'){TRANS.a=1;const c=roomCaption(room);if(c){TRANS.cap=c;TRANS.capT=T}}
  STEPPED_OUT=[];
  return _sc(room,cast,fresh);
 }
 if(!fresh||!Object.keys(A).length)return _sc(room,cast,fresh);
 /* same room, restaged: remember who was where */
 const prev={},gone=[];
 for(const id in A){const a=A[id];if(!a||a.dead||a.vis===false)continue;prev[id]={x:a.x,y:a.y,dir:a.dir};
  if(id!=='you'&&!(cast&&id in cast)&&a.x>-6&&a.x<326&&a.pose!=='lie')gone.push(a)}
 const r=_sc(room,cast,fresh);
 for(const a of gone)leaveShot(a);
 STEPPED_OUT=gone.map(a=>({id:a.id,x:a.x,y:a.y,dir:a.dir,pose:a.pose,k:a.k,extra:a.extra}));
 for(const id in A){const a=A[id],p=prev[id];
  if(a.dead||a.pose==='lie'||a.vis===false||a.x<-6||a.x>326)continue;
  const tx=a.x,ty=a.y,ps=a.pose,still=ps==='sit'||ps==='kneel'||a.sitHigh;
  if(p){if(Math.abs(p.x-tx)<3||still)continue;a.x=p.x;a.y=p.y;a.pose=null;tw(a,{y:ty},Math.max(160,Math.abs(p.x-tx)/85*1000));walk(id,tx,85).then(()=>{if(A[id]===a&&a.tx==null){if(ps)a.pose=ps}})}
  else if(id!=='you'&&!still&&ty>=132){a.x=tx<160?-14:334;a.pose=null;walk(id,tx,85).then(()=>{if(A[id]===a&&a.tx==null){if(ps)a.pose=ps}})}
 }
 return r;
}}

/* when the scene’s done, the people who stepped out come back */
{const _btr=backToRoom;backToRoom=function(){
 const r=_btr();
 if(TEST||!D||!STEPPED_OUT.length||ROOM!==D.room){STEPPED_OUT=[];return r}
 const back=STEPPED_OUT.splice(0);let i=0;
 for(const s of back){if(A[s.id]||D.dead[s.id]||!K[s.id])continue;
  const from=s.x<160?-16-i*4:336+i*4;put(s.id,from,s.dir,{y:s.y,extra:s.extra});if(s.k)A[s.id].k=s.k;
  const tgt=s.x,ps=s.pose,dl=.2+i*.18;i++;
  timers.push({t:dl,r:()=>{const a=A[s.id];if(!a)return;walk(s.id,tgt,70+Math.random()*25).then(()=>{if(A[s.id]===a&&a.tx==null&&ps&&ps!=='sit')a.pose=ps})}});
 }
 return r;
}}

/* new period, same hallway: the crowd runs in */
{const _br=buildRoom;buildRoom=function(room){
 const wasHere=ROOM===room&&D&&D._lastBuild&&D._lastBuild.room===room&&D._lastBuild.per!==D.period;
 const r=_br(room);
 if(D)D._lastBuild={room,per:D.period};
 if(TEST||!wasHere)return r;
 let i=0;
 for(const id in A){const a=A[id];if(id==='you'||a.dead||a.pose==='sit'||a.pose==='lie'||a.sitHigh||a.y<132)continue;
  const tgt=a.x,ps=a.pose,from=tgt<160?-16-i*5:336+i*5;a.x=from;a.pose=null;const dl=.1+i*.12;i++;
  timers.push({t:dl,r:()=>{if(A[id]!==a)return;walk(id,tgt,90+Math.random()*30).then(()=>{if(A[id]===a&&a.tx==null&&ps)a.pose=ps})}});
 }
 return r;
}}

/* ---------- walking between hallways: the camera slides, it doesn’t cut ---------- */
let PAN=null,PANDIR=0;
{const _eg=edge;edge=function(s){PANDIR=s;try{return _eg(s)}finally{PANDIR=0}}}
function snapNoYou(){
 const c=document.createElement('canvas');c.width=W;c.height=H;const og=g,a=A.you,v=a&&a.vis;if(a)a.vis=false;
 g=c.getContext('2d');g.imageSmoothingEnabled=false;try{_DRAW0()}catch(e){}finally{g=og;if(a)a.vis=v}return c}
let _DRAW0=draw;
{const _wg=worldGo;worldGo=async function(room,x,y,dir){
 if(!PANDIR||TEST||busy||!A.you)return _wg(room,x,y,dir);
 const s=PANDIR;PANDIR=0;
 busy=true;keys.l=keys.r=0;if(keys.u!=null)keys.u=keys.d=0;
 const snap=snapNoYou(),fromX=A.you.x;
 scene.noFade=1;
 busy=false;
 const p=worldMove(room,x,y,dir);
 setTimeout(()=>{scene.noFade=0},700);
 PAN={snap,dir:s,t0:performance.now(),dur:480,fromX};
 return p;
}}
draw=function(){
 if(!PAN)return _DRAW0();
 const k=Math.min(1,(performance.now()-PAN.t0)/PAN.dur),e=1-Math.pow(1-k,3);
 const off=Math.round(PAN.dir*W*(1-e));
 const a=A.you,v=a&&a.vis;if(a)a.vis=false;
 g.save();g.translate(off,0);try{_DRAW0()}finally{g.restore();if(a)a.vis=v}
 g.drawImage(PAN.snap,off-PAN.dir*W,0);
 if(a&&a.vis!==false){const sx=PAN.fromX+(a.x-PAN.fromX)*e;g.save();g.translate(Math.round(sx-a.x),0);const m=a.moving,w=a.walk;a.moving=true;a.walk=(a.walk||0)+.0;a.dir=PAN.dir;try{drawActor(a)}finally{a.moving=m;g.restore()}}
 if(k>=1)PAN=null;
};
