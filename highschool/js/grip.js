'use strict';
/* =====================================================================
   HIGHSCHOOL — GRIP
   Weapons are held, not stuck on. Every weapon has a handle and a
   business end. The hand closes around the handle (you can see the
   fingers over it), and the weapon points where the pose needs it:
   down at your side when you’re walking, straight out when you stab,
   up over your head when you swing, aimed down your arm when you point
   a gun, cocked back over your shoulder when you throw.
   Picking something up is a grab: the arm reaches, the hand closes,
   and the thing swings up into place.
   ===================================================================== */
let GRIP_A=null,GRIP_K=null,GRIP_POSE=null,GRIP_TR=null;
{const _da=drawActor;drawActor=function(a){
 const pa=GRIP_A;GRIP_A=a;
 if(a){if(!('_hold' in a))a._hold=a.hold;else if(a._hold!==a.hold){const was=a._hold;a._hold=a.hold;if(a.hold&&GRIP_W[a.hold]&&!TEST){a._grabT=T;a._grabFrom=was?'hold':'reach';if(!a.pose||['hold','grab','point','stab','overhead','throw'].includes(a.pose)){a._tr={from:'pickup',t0:T,dur:.45,ease:'grab'};if(!a.dead&&a.pose!=='lie')a._pose=(a.air&&!a.pose?'up':a.pose)||null}}}}
 try{return _da(a)}finally{GRIP_A=pa}}}
{const _dk=drawKid;drawKid=function(k,x,y,o){const pk=GRIP_K,pp=GRIP_POSE,pt=GRIP_TR;GRIP_K=k;GRIP_POSE=o&&o.pose||null;GRIP_TR=o&&o.tr||null;try{return _dk(k,x,y,o)}finally{GRIP_K=pk;GRIP_POSE=pp;GRIP_TR=pt}}}

/* a crisp line of pixels along an angle */
function gLine(x,y,ca,sa,from,to,w0,w1,col){for(let t=from;t<=to;t++){const f=(t-from)/Math.max(1,to-from),w=w0+(w1-w0)*f;for(let n=-Math.floor(w/2);n<Math.ceil(w/2);n++)R(Math.round(x+ca*t-sa*n),Math.round(y+sa*t+ca*n),1,1,col)}}
function gPerp(x,y,ca,sa,at,from,to,col){for(let n=from;n<=to;n++)R(Math.round(x+ca*at-sa*n),Math.round(y+sa*at+ca*n),1,1,col)}

/* each weapon, drawn along +x from the grip. ang: per pose, facing right (0 = forward, -PI/2 = up) */
const P2=Math.PI/2;
ARMS.pickup={f:[6,10],b:[0,7]};
EASE.grab=k=>k<.3?0:EASE.back((k-.3)/.7);   /* hand waits low, closes, then whips up */   /* low and forward: where things get picked up from */
const GRIP_W={
 knife:{rest:1.15,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#4a2e1e');gPerp(x,y,c,s,1,-1,1,'#8a8a92');gLine(x,y,c,s,2,8,2,1,'#dfe6ea');gLine(x,y,c,s,2,7,1,1,'#ffffff')}},
 sword:{rest:1.35,two:0,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#5a3a22');gPerp(x,y,c,s,1,-3,3,'#c8a040');gLine(x,y,c,s,2,17,2,1,'#d8dce4');gLine(x,y,c,s,3,16,1,1,'#ffffff')}},
 pistol:{rest:.75,draw:(x,y,c,s)=>{gLine(x,y,c,s,-2,6,3,3,'#2a2a2e');gLine(x,y,c,s,-1,6,1,1,'#4a4a52');gPerp(x,y,c,s,-1,1,4,'#3a3a3e');gPerp(x,y,c,s,0,1,4,'#3a3a3e');R(Math.round(x+c*7),Math.round(y+s*7),1,1,'#1a1a1a')}},
 javelin:{rest:-1.4,draw:(x,y,c,s)=>{gLine(x,y,c,s,-12,18,1,1,'#c8c8c8');gLine(x,y,c,s,-2,2,2,2,'#7a4a2a');gLine(x,y,c,s,18,21,1,1,'#ffffff')}},
 shovel:{rest:-1.25,two:1,draw:(x,y,c,s)=>{gPerp(x,y,c,s,-6,-2,2,'#5a3a22');gLine(x,y,c,s,-6,10,2,2,'#8a6a42');gLine(x,y,c,s,11,17,6,5,'#8a8e98');gLine(x,y,c,s,12,16,2,2,'#aab0ba')}},
 cleaver:{rest:1.2,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#5a3a2a');gLine(x,y,c,s,1,7,5,5,'#c8ccd0');gLine(x,y,c,s,1,7,1,1,'#ffffff')}},
 hammer:{rest:1.2,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,8,1,1,'#8a6a4a');gLine(x,y,c,s,8,10,5,5,'#7a7a82')}},
 bat:{rest:1.3,two:1,draw:(x,y,c,s)=>{gLine(x,y,c,s,-4,2,2,2,'#6a4a2a');gLine(x,y,c,s,3,15,2,4,'#c8a070');gLine(x,y,c,s,4,15,1,1,'#e0c090')}},
 dagger:{rest:1.15,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#2a2a2e');gPerp(x,y,c,s,1,-2,2,'#a8a8b0');gLine(x,y,c,s,2,9,2,1,'#c8ccd8');gLine(x,y,c,s,2,8,1,1,'#ffffff')}},
 machete:{rest:1.3,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#3a2a1a');gLine(x,y,c,s,1,13,3,3,'#a8acb0');gLine(x,y,c,s,1,12,1,1,'#e0e4e8')}},
 katana:{rest:1.4,draw:(x,y,c,s)=>{gLine(x,y,c,s,-5,0,2,2,'#1a1a2a');gPerp(x,y,c,s,1,-2,2,'#c8a040');gLine(x,y,c,s,2,19,2,1,'#e0e4ec');gLine(x,y,c,s,2,18,1,1,'#ffffff')}},
 bonesaw:{rest:1.25,draw:(x,y,c,s)=>{gLine(x,y,c,s,-3,0,2,2,'#2a2a2e');gLine(x,y,c,s,1,9,3,3,'#b8bcc4');for(let t=2;t<=9;t+=2)gPerp(x,y,c,s,t,2,2,'#7a7e88')}},
 scissors:{rest:1.1,draw:(x,y,c,s)=>{gPerp(x,y,c,s,-1,-2,2,'#c03030');gLine(x,y,c,s,0,7,1,1,'#c8ccd4');gLine(x+(-s)*1,y+c*1,c,s,0,7,1,1,'#a8acb4')}},
 redpen:{rest:1.1,draw:(x,y,c,s)=>{gLine(x,y,c,s,-2,6,2,2,'#c02020');gLine(x,y,c,s,6,7,1,1,'#f4f0e6')}},
 mop:{rest:-1.3,two:1,draw:(x,y,c,s)=>{gLine(x,y,c,s,-8,12,1,1,'#8a6a4a');gLine(x,y,c,s,12,15,6,7,'#d8d0c0')}},
 chucks:{rest:1.3,draw:(x,y,c,s)=>{gLine(x,y,c,s,-2,5,2,2,'#2a2a2a');const sw=Math.sin(T*14)*1.2;gLine(x+c*6,y+s*6,Math.cos(Math.atan2(s,c)+sw),Math.sin(Math.atan2(s,c)+sw),0,7,2,2,'#3a3a3a')}}
};
/* where each pose points the weapon */
const GRIP_POSE_ANG={stab:0,punch:0,point:0,hold:-.15,grab:-.2,reach:-.9,pickup:.05,overhead:-2.35,slam:-1.9,throw:-2.6,up:-P2,cheer:-P2,hips:null,cross:null,kneel:.9,drag:1.4};
function weaponAng(item,pose){const W=GRIP_W[item];const a=GRIP_POSE_ANG[pose];return a==null?W.rest:(item==='javelin'&&pose==='throw')?-.25:(item==='pistol'&&['point','hold','grab','stab'].includes(pose))?-.05:a}
{const _dh=drawHeld;drawHeld=function(it,x,y,d){
 const W=GRIP_W[it];if(!W)return _dh(it,x,y,d);
 let ang=weaponAng(it,GRIP_POSE);
 if(GRIP_TR&&GRIP_TR.k<1){const a0=weaponAng(it,GRIP_TR.from);ang=a0+(ang-a0)*GRIP_TR.k}
 /* the grab: it comes up off the floor into the hand */
 let ox=0,oy=0;const a=GRIP_A;
 let open=0;
 if(a&&a._grabT!=null){const q=(T-a._grabT)/.45;if(q<1){if(a._grabFrom==='reach'){if(q<.22){open=1;ang=.05;oy=1}else if(q<.3){ang=.05}else{const e=1-Math.pow(1-(q-.3)/.7,3);ang=.05+(ang-.05)*e}}}else a._grabT=null}
 if(d<0)ang=Math.PI-ang;
 const c=Math.cos(ang),s=Math.sin(ang),gx=x+1+ox*d,gy=y+1+oy;
 W.draw(gx,gy,c,s);
 /* the hand, closed round the handle: fingers over it, a knuckle line */
 const sk=(GRIP_K&&GRIP_K.skin)||'#e8c8a8';
 if(open){/* fingers still open, about to close on it */R(Math.round(gx)-1,Math.round(gy)-3,1,2,sk);R(Math.round(gx)+1,Math.round(gy)-3,1,2,sk);R(Math.round(gx)-1,Math.round(gy)-1,3,1,sk);return}
 R(Math.round(gx)-1,Math.round(gy)-1,3,3,sk);R(Math.round(gx)-1,Math.round(gy)+1,3,1,'rgba(0,0,0,.28)');R(Math.round(gx)+(d>0?1:-1),Math.round(gy)-1,1,1,'rgba(255,255,255,.25)');
 /* two-handed things get the other hand further up the handle */
 if(W.two&&['overhead','slam','stab','kneel','drag','hold','grab'].includes(GRIP_POSE)){const hx2=gx+c*-5,hy2=gy+s*-5;R(Math.round(hx2)-1,Math.round(hy2)-1,3,3,sk);R(Math.round(hx2)-1,Math.round(hy2)+1,3,1,'rgba(0,0,0,.28)')}
}}
