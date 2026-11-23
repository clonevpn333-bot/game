'use strict';
/* =====================================================================
   HIGHSCHOOL — EVERY CLASS LOOKS DIFFERENT
   The same two rows of desks every lesson got old. Now every session
   of a subject sets the room up differently, and the teacher stands
   somewhere different:
     rows · horseshoe · group tables · exam spacing · a presentation
     at the front · everyone on the carpet · a line-up against the back
     wall · desks in pairs facing each other.
   Which one you get depends on the subject and how many times you’ve
   had it, so no two sessions of the same class look the same, and the
   classes on one day look different from each other.
   ===================================================================== */
const LAYOUT_ROOMS={english:'all',maths:'all',history:'all',ict:['rows','present','lineup','pairs','floor'],science:['rows','present','lineup','floor']};
const LAYOUT_ALL=['rows','horseshoe','groups','exam','present','floor','lineup','pairs'];
function layoutFor(room){
 const set=LAYOUT_ROOMS[room]==='all'?LAYOUT_ALL:LAYOUT_ROOMS[room];if(!set)return'rows';
 const n=(typeof LN==='function'?LN()[room]:0)||0;
 const h=(room.charCodeAt(0)+room.length*3)%set.length;
 return set[(n*3+h)%set.length];
}
const tName=t=>t&&K[t]?K[t].n:'The teacher';
/* furniture */
function lyTable(x,y,w){return{y:y+.5,d:()=>{R(x-w/2,y-12,w,3,'#8a6a48');R(x-w/2,y-9,w,7,'#6a4e34');R(x-w/2,y-12,w,1,'#a88a64');R(x-w/2+2,y-2,2,6,'#4a3a2a');R(x+w/2-4,y-2,2,6,'#4a3a2a');
 for(let i=0;i<3;i++)R(x-w/2+4+i*10,y-15,7,3,['#f4f0e6','#e8e2d6','#f0ead8'][i])}}}
function lyChair(x,y){return{y:y-8,d:()=>{chairBack(x,y);R(x-7,y-5,14,3,'#34407a');R(x-7,y-5,14,1,'#5a6aaa');R(x-6,y-2,1,6,'#8a8e98');R(x+5,y-2,1,6,'#8a8e98')}}}
function lyDesk(x,y){return{y:y+.5,d:()=>desk(x,y+8)}}
function lyRug(){return{y:120,d:()=>{R(60,136,200,26,'#7a3a4a');R(62,138,196,22,'#8a4a5a');for(let i=0;i<9;i++)R(70+i*22,140,10,18,'rgba(255,220,160,.12)');R(60,136,200,1,'#c8a070');R(60,161,200,1,'#c8a070')}}}
function lyBox(){return{y:121,d:()=>{R(20,118,20,10,'#8a6a48');R(22,116,16,3,'#a88a64');for(let i=0;i<4;i++)R(23+i*4,114,2,4,['#2a2a30','#5a8ad0','#c83a3a','#2a2a30'][i])}}}

const LAYOUT={
 horseshoe(room,t){const S=[],items=[];const xs=[56,80,106,130,190,214,240,264],ys=[156,146,138,134,134,138,146,156];
  xs.forEach((x,i)=>{S.push({x,y:ys[i],i,row:'h',pose:'sit',dir:x<160?1:-1});items.push(lyChair(x,ys[i]))});
  return{S,items,teacher:[160,-1,'hips',146],intro:tName(t)+' has dragged the chairs into a horseshoe and shoved the desks against the wall. No desks. Nowhere to put your face.'}},
 groups(room,t){const S=[],items=[];const tx=[80,170,260];tx.forEach((x,g)=>{items.push(lyTable(x,150,34));
   [[x-20,146,1],[x+20,146,-1],[x-20,158,1],[x+20,158,-1]].forEach(([sx,sy,d],j)=>{S.push({x:sx,y:sy,i:j%2,row:'g'+g+'_'+(j<2?0:1),pose:'sit',dir:d});items.push(lyChair(sx,sy))})});
  return{S,items,teacher:[28,1,'cross',146],intro:'The desks are pushed into islands of four. Group work. The three worst words in the English language.'}},
 exam(room,t){const S=[],items=[];[70,130,190,250].forEach((x,i)=>[132,152].forEach((y,r)=>{S.push({x,y,i,row:'e'+r,pose:'write',dir:1});items.push(lyChair(x,y));items.push(lyDesk(x,y))}));items.push(lyBox());
  return{S,items,teacher:[296,-1,'cross',146],intro:'Desks a meter apart. Phones in a shoebox at the front. A test. Nobody was told about the test. '+tName(t)+' is smiling about it.'}},
 present(room,t){const S=[],items=[];[100,140,180,220,260].forEach((x,i)=>{S.push({x,y:SEATS.frontY,i,row:'f',pose:'sit',dir:-1});items.push(lyChair(x,SEATS.frontY));items.push(lyDesk(x,SEATS.frontY))});
  S.unshift({x:150,y:130,i:9,row:'p',pose:'point',dir:1,present:1});
  return{S,items,teacher:[40,1,'sit',140],intro:null}},
 floor(room,t){const S=[],items=[lyRug()];[[86,146],[110,152],[136,144],[162,152],[188,146],[214,152],[240,144],[262,152]].forEach(([x,y],i)=>S.push({x,y,i,row:'r',pose:i%3===1?'kneel':'sit',dir:-1}));
  items.push(lyChair(40,146));
  return{S,items,teacher:[40,1,'sit',146],intro:'No desks today. Everybody on the carpet like it’s kindergarten. '+tName(t)+' is in a chair above you, and that feels on purpose.'}},
 lineup(room,t){const S=[];[60,84,108,132,156,180,204,228,252,276].forEach((x,i)=>S.push({x,y:128,i,row:'l',pose:null,dir:1}));
  return{S,items:[],teacher:[160,-1,'cross',150],intro:'Everybody against the back wall. Shoulders touching the bricks. '+tName(t)+' walks the line slowly, looking at each of you like produce.'}},
 pairs(room,t){const S=[],items=[];[[90,110],[160,180],[230,250]].forEach(([a,b],p)=>[136,158].forEach((y,r)=>{S.push({x:a,y,i:0,row:'p'+p+r,pose:'sit',dir:1});S.push({x:b,y,i:1,row:'p'+p+r,pose:'sit',dir:-1});items.push(lyChair(a,y));items.push(lyChair(b,y));items.push({y:y+.5,d:()=>{R(a+4,y-6,b-a-8,3,'#8a6a48');R(a+4,y-3,b-a-8,6,'#6a4e34')}})}));
  return{S,items,teacher:[34,1,'hips',146],intro:'The desks are turned to face each other in pairs. You have to look at your partner the whole lesson. Your partner has to look at you.'}}
};
let LAYOUT_ON=null;
{const _ci=classIn;classIn=async function(room,opts){
 opts=opts||{};
 const L=LAYOUT_ROOMS[room]&&!opts.fixed&&opts.you==null&&!(typeof EDITION!=='undefined'&&false)?layoutFor(room):'rows';
 if(L==='rows'||!LAYOUT[L]||TEST&&!TEST.auto&&Math.random()<.5)return _ci(room,opts);
 const t=opts.teacher||(TEACH[D.period]&&TEACH[D.period][room]);
 const lay=LAYOUT[L](room,t);
 const oS=seatsFor,oT=TEACHER_SPOT[room],oI=ROOMS[room]&&ROOMS[room].items;
 seatsFor=r=>r===room?lay.S.map(s=>Object.assign({},s)):oS(r);
 TEACHER_SPOT[room]=lay.teacher;
 if(ROOMS[room]){ROOMS[room].items=lay.items;LAYOUT_ON={room,items:oI}}
 if(A[t]&&A[t].vis&&!A[t].dead){const [x,d,p,y]=lay.teacher;A[t].dir=d;walk(t,x,70).then(()=>{if(A[t]){A[t].pose=p;A[t].dir=d}});A[t].y=y}
 let c;try{c=await _ci(room,opts)}finally{seatsFor=oS;if(oT)TEACHER_SPOT[room]=oT;else delete TEACHER_SPOT[room]}
 c.layout=L;
 const pres=c.seats.find(s=>s.present&&s.who&&s.who!=='you');
 if(pres&&A[pres.who]){A[pres.who].pose='point';A[pres.who].ex='scared';hold(pres.who,'paper')}
 if(!TEST){
  if(L==='present'&&pres)await N(K[pres.who].n+' is up at the front doing a presentation. It is going so badly. '+tName(t)+' is sitting at the side, writing notes about it.');
  else if(lay.intro)await N(lay.intro);
 }
 if(L==='lineup')for(const k of c.kids)if(A[k])A[k].dir=1;
 return c;
}}
function layoutOff(){if(LAYOUT_ON&&ROOMS[LAYOUT_ON.room]){ROOMS[LAYOUT_ON.room].items=LAYOUT_ON.items}LAYOUT_ON=null}
{const _co=classOut;classOut=async function(c,line){try{for(const s of c.seats||[])if(s.present&&A[s.who])hold(s.who,null);return await _co(c,line)}finally{layoutOff()}}}
{const _br=buildRoom;buildRoom=function(room){layoutOff();return _br(room)}}
