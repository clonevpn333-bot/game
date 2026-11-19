'use strict';
/* =====================================================================
   HIGHSCHOOL — THE STAIRWELL
   A real stairwell between the Main Corridor and the second floor.
   Bottom landing on the left, a big staircase going up to the right,
   the top landing at the top right. Walk right to climb.
   Kids sit on the steps. It echoes. Somebody is always crying in it.
   ===================================================================== */
WORLD.stairwell={L:'corridor',Lx:285,R:'upper',Rx:40,doors:[]};
HALLS.add('stairwell');
const ST={x0:96,x1:250,y0:162,y1:96};      /* the stairs: bottom step to top landing */
function stairY(x){if(x<=ST.x0)return null;if(x>=ST.x1)return ST.y1;const t=(x-ST.x0)/(ST.x1-ST.x0);return Math.round(ST.y0+(ST.y1-ST.y0)*t)}
ROOMS.stairwell={name:'The Stairwell',music:'corridor',bg(){
 /* walls */
 R(0,0,W,180,'#d8cfb8');for(let r=0;r<22;r++){const y=r*8;R(0,y,W,1,'rgba(120,100,70,.14)');for(let x=(r%2)*12;x<W;x+=24)R(x,y,1,8,'rgba(120,100,70,.1)')}
 R(0,0,W,6,'#b8b0a0');
 /* the big window halfway up */
 R(150,14,74,50,'#5a5a62');R(153,17,68,44,'#9ac0d8');for(let i=0;i<3;i++)cloud((i*60+T*3)%110+150,20+i*9,1);R(153,38,68,2,'#5a5a62');R(186,17,2,44,'#5a5a62');
 g.globalAlpha=.12;R(140,60,100,80,'#fff8e0');g.globalAlpha=1;
 /* floor numbers and graffiti */
 R(20,40,22,22,'#2a4a7a');pxc('1',31,46,'#fff');R(272,14,22,22,'#5a3a7a');pxc('2',283,20,'#fff');
 px('AIDAN WAS HERE',40,86,'rgba(60,40,40,.55)');px('class of 87',108,74,'rgba(120,40,40,.4)');px('ARJUN = L',240,50,'rgba(60,40,90,.5)');
 R(60,64,14,10,'#c03030');pxc('NO',67,66,'#fff');px('SITTING ON STAIRS',36,100,'rgba(60,40,40,.5)');
 /* ground landing */
 R(0,140,ST.x0+6,40,'#b8a890');for(let i=0;i<ST.x0+6;i+=16)R(i,140,1,40,'rgba(0,0,0,.06)');R(0,140,ST.x0+6,1,'#8a7a62');
 /* the stairs: solid underneath, a lip on every step */
 const n=12,dx=(ST.x1-ST.x0)/n,dy=(ST.y0-ST.y1)/n;
 for(let i=0;i<n;i++){const x=ST.x0+i*dx,top=ST.y0-(i+1)*dy;R(x,top,dx+1,180-top,'#9a8c74');R(x,top,dx+1,2,'#c8b898');R(x,top+2,dx+1,1,'#6a5e4a');R(x,top,1,dy,'#7a6e5a')}
 /* top landing */
 R(ST.x1,ST.y1-2,W-ST.x1,4,'#c8b898');R(ST.x1,ST.y1+2,W-ST.x1,180-ST.y1,'#8a7c66');R(ST.x1,ST.y1+2,W-ST.x1,1,'#5a4e3a');
 /* the railing */
 for(let i=0;i<=n;i+=2){const x=ST.x0+i*dx,top=ST.y0-i*dy;R(x,top-22,1,22,'#5a5a62')}
 for(let x=ST.x0;x<ST.x1;x++){const y=ST.y0-((x-ST.x0)/(ST.x1-ST.x0))*(ST.y0-ST.y1);R(x,Math.round(y)-23,1,2,'#3a3a42')}
 R(ST.x1,ST.y1-23,W-ST.x1,2,'#3a3a42');for(let x=ST.x1;x<W;x+=14)R(x,ST.y1-22,1,22,'#5a5a62');
}};
if(typeof LIGHT!=='undefined')LIGHT.stairwell={amb:.74,tint:[60,50,40],src:[[188,40,110,.35,[230,240,255]]],wallAO:1};
if(typeof FLOOR!=='undefined')FLOOR.stairwell=[ST.y1-4,170];
if(typeof AMB!=='undefined')AMB.stairwell={bed:.04,steps:.9,chat:.4,distant:.6,scream:.03};
if(typeof EXTRA_SPOTS!=='undefined')EXTRA_SPOTS.stairwell=0;

/* walking: on the stairs your feet follow the steps */
function stairFix(a){const y=stairY(a.x);if(y==null){a.y=clamp(a.y,146,168);return}if(a.x>=ST.x1){a.y=clamp(a.y,ST.y1-2,ST.y1+4);return}a.y=y}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(D&&D.room==='stairwell'&&A.you&&!busy)stairFix(A.you)}}
{const _br=buildRoom;buildRoom=function(room){
 const r=_br(room);
 if(D&&room==='stairwell'){
  if(A.you)stairFix(A.you);
  /* kids sitting on the steps */
  if(!D.weekend&&!(PERIODS[D.period]&&PERIODS[D.period].lesson)){
   const sit=[['kid3',150],['kid1',200]];
   for(const [id,x] of sit)if(!A[id]&&!D.dead[id]){const a=put(id,x,-1,{y:stairY(x)+1,pose:'sit'});a.sitHigh=1}
  }
 }
 return r;
}}
/* anyone else who walks in here follows the steps too */
{const _da=drawActor;drawActor=function(a){if(D&&ROOM==='stairwell'&&a&&a.id!=='you'&&!a.dead&&a.pose!=='sit'&&a.pose!=='lie'&&a.x>ST.x0){const y=stairY(a.x);if(y!=null)a.y=y}return _da(a)}}

/* the hallway moment “a kid crying on the stairs” happens on the real stairs now */
hook({mis:'passing',period:[1,3,5,6,2,4],room:'stairwell',who:'kid3',label:'Ask the kid on the stairs if they’re okay',cond:()=>!D.f.stairCry,run:async()=>{
 D.f.stairCry=1;
 if(!A.kid3)put('kid3',150,-1,{y:stairY(150)+1,pose:'sit'});
 A.you.x=A.kid3.x-14;stairFix(A.you);
 await say('kid3','(face in their sleeves) I’m fine. I’m— my mom says we’re moving. Again. Third school in two years.','cry');
 const c=await choose(['Sit with them for a minute.','“Hey. This school sucks anyway.”','“Want half my Takis?”']);
 if(c===0){pose('you','sit');await N('You sit on the cold step with them until the next bell. When you stand up, they say “thanks,” so quietly you nearly miss it.');pose('you',null)}
 else if(c===1)await say('kid3','(laughing a little) Yeah. Yeah, it really does. My last school didn’t have teachers who kill people, though. So that’s new.','sad');
 else await say('kid3','(taking three) …These are wet. Why are these wet. …I’m eating them anyway.','laugh');
 return 'stay';
}});
