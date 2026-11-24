'use strict';
/* =====================================================================
   HIGHSCHOOL — FINAL TOUCHES (Definitive Edition)
   • The text box is wiped the moment a conversation ends, so the last
     line never flashes up when you start a new one.
   • No more teleporting after cutscenes: you walk from where the scene
     left you, and if a scene happened elsewhere you come back to where
     you were standing.
   • BEHIND CLOSED DOORS (🔞 filthy, off-screen): a supply closet or the
     staff room starts THUMPING. The door rattles, stuff flies out, two
     teachers stumble out pretending nothing happened.
   • The backgrounds breathe: birds and clouds outside, flickering tubes
     and drifting litter in the halls, steam over the cafeteria counter,
     passing cloud-shadows in classrooms.
   ===================================================================== */
/* ---------------- no stale lines ---------------- */
function wipeTalk(){try{$('text').textContent='';$('name').textContent='';$('name').style.background='';$('choices').innerHTML='';if(typeof drawPortrait==='function')drawPortrait(null)}catch(e){}}
{const _r=roam;roam=function(){wipeTalk();return _r.apply(this,arguments)}}
{const _tt=talkTo;talkTo=async function(id){if(!DL&&!CH)wipeTalk();return _tt(id)}}
{const _us=useSpot;useSpot=async function(s){if(!DL&&!CH)wipeTalk();return _us(s)}}

/* ---------------- no teleporting ---------------- */
let PRE=null,LASTYOU=null;
{const _rh=runHook;runHook=async function(h){if(!busy&&A.you&&D)PRE={room:D.room,x:A.you.x,y:A.you.y};return _rh(h)}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(A.you&&(busy||panelMode!=='roam'))LASTYOU={room:ROOM,x:A.you.x,y:A.you.y}}}
{const _btr=backToRoom;backToRoom=function(){
 const rebuilt=ROOM!==D.room||!A.you;const r=_btr();
 try{if(TEST||!A.you)return r;
  if(rebuilt&&PRE&&PRE.room===D.room){A.you.x=PRE.x;A.you.y=PRE.y;D.x=Math.round(PRE.x)}
  else if(!rebuilt&&LASTYOU&&LASTYOU.room===ROOM){const tx=A.you.x,ty=A.you.y;if(Math.abs(LASTYOU.x-tx)>4||Math.abs(LASTYOU.y-ty)>3){A.you.x=LASTYOU.x;A.you.y=LASTYOU.y;busy=true;Promise.all([walk('you',tx,90),tw(A.you,{y:ty},Math.max(120,Math.abs(LASTYOU.y-ty)*30))]).finally(()=>{busy=false;roam()})}}
 }catch(e){}PRE=null;return r}}
/* ---------------- BEHIND CLOSED DOORS ---------------- */
const DOORBANG={corridor:{x:160,name:'the History room'},hallb:{x:220,name:'the Vice Principal’s Office'},wing_sci:{x:110,name:'the nurse’s office'}};
const BANG_PAIRS=[
 ['coach','balduf',[['coach','(through the door) Doris. DORIS. Where’s the light switch—'],['balduf','(through the door) That is NOT the light switch, Dale.'],['coach','(through the door) …Should I keep looking for it?'],['balduf','(through the door) Keep looking for it.']],['Inventory.','Inventory.']],
 ['voss','nurse',[['nurse','(through the door) Frederick, put the goggles back on. It’s a lab. Safety first.'],['voss','(through the door) I don’t— why do you have a Bunsen burner in your PURSE—'],['nurse','(through the door) Because I’m a professional, baby.']],['We were… restocking the gauze.','There is so much gauze.']],
 ['grieve','loach',[['grieve','(through the door) FOR THE UNION!'],['loach','(through the door) Barnaby, every time. EVERY time you yell that.'],['grieve','(through the door) The Union deserves to KNOW, Linda!']],['…History department meeting.','It was very… historical.']],
 ['adam','balduf',[['balduf','(through the door) Say it, Gerald.'],['adam','(through the door) …Budget—'],['balduf','(through the door) LOUDER.'],['adam','(through the door) BUDGET! BUDGET! BUDGET!']],['We’ve balanced the budget.','Barely.']],
 ['valentino','shermian',[['shermian','(through the door) You are in violation of eleven school policies.'],['valentino','(through the door) Write me up, Miss Sherman.'],['shermian','(through the door) Oh, I’m going to write you up. I’m going to write you up SO hard.']],['Disciplinary meeting.','He’s been disciplined.']],
 ['coach','valentino',[['coach','(through the door) Is this the key thing? I brought my keys.'],['valentino','(through the door) Dale, it’s a CLOSET. Put your keys— okay. Okay, sure.']],['We were looking for the keys.','Found ’em.']]];
const FLY=['tie','whistle','shoe','lanyard','goggles','sock'];
{const _dp=drawProp;drawProp=function(p){const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='flyout'){switch(p.what){case'tie':R(x-1,y-4,2,8,'#a02030');R(x-2,y-5,4,2,'#a02030');break;case'whistle':R(x-2,y-1,4,3,'#c0c0c0');R(x-4,y-3,2,1,'#e8e8e8');break;case'shoe':R(x-3,y-2,6,3,'#2a1a14');R(x+1,y-3,2,1,'#2a1a14');break;case'lanyard':R(x-3,y-3,6,1,'#3a6ad8');R(x-1,y-2,3,4,'#f4f0e6');break;case'goggles':R(x-3,y-1,3,2,'#9ad0e0');R(x,y-1,3,2,'#9ad0e0');break;default:R(x-2,y-2,4,3,'#e8e8e8')}return}
 if(p.t==='bangfx'){const k=(T*2.6)%1,j=Math.sin(T*26)>0?1:-1;
  /* the door rattles in its frame */
  g.globalAlpha=.55;R(x-13+j,42,2,78,'#1a1018');R(x+11+j,42,2,78,'#1a1018');R(x-12+j,41,24,2,'#1a1018');g.globalAlpha=1;
  if(Math.sin(T*13)>.3){R(x-14,60+((T*40)%50|0),2,1,'#e8e2d0');R(x+12,70+((T*55)%40|0),2,1,'#e8e2d0')}
  if(k<.6){const s_=p.s||'THUMP';g.save();g.globalAlpha=1-k/.6;g.translate(x+(p.n%2?30:-30),62-k*14);g.scale(2,2);g.rotate((p.n%2?1:-1)*.12);for(const [ox,oy] of[[-1,0],[1,0],[0,-1],[0,1]])pxc(s_,ox*.5,oy*.5,'#1a0a10');pxc(s_,0,0,'#ffd27a');g.restore();g.globalAlpha=1}
  return}
 return _dp(p)}}
chaos('doorbang',Object.keys(DOORBANG),[1,2,3,4,5,6],.22,async()=>{
 const room=D.room,d=DOORBANG[room];const pair=pick(BANG_PAIRS.filter(p=>p.slice(0,2).every(k=>K[k]&&!D.dead[k])));if(!pair)return;
 const [a,b,lines,out]=pair;
 const kids=Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead&&K[k]&&!K[k].adult).slice(0,3);
 if(typeof advisory==='function'&&!P.set.filthyNoWarn&&!(P.filthOK&&P.filthOK.doorbang)){const ok=await advisory('doorbang');if(!ok)return;(P.filthOK=P.filthOK||{}).doorbang=1}
 const fx=prop({t:'bangfx',x:d.x,y:200,n:0,s:'THUMP',layer:60});
 for(let i=0;i<4;i++){SFX.thud&&SFX.thud();shake(.25);fx.n++;await wait(TEST?0:260)}
 for(const k of kids)if(A[k]){A[k].ex='shock';face(k,d.x>A[k].x?1:-1)}
 await N('From behind '+d.name+' door: a rhythmic THUMP. THUMP. THUMP. The door is rattling in its frame. Something falls off a shelf in there. Nobody stops.');
 for(const [w,t] of lines){fx.s=pick(['THUMP','BANG','*squeak*','THUD','*rattle*']);await say(w,t);SFX.thud&&SFX.thud()}
 if(kids[0])await say(kids[0],pick(['Bro. BRO. It’s second period.','I’m gonna need therapy and I’m gonna need it in cash.','Is the door… is the door supposed to bend like that?','My little brother’s in there for detention. Oh no. OH NO.']),'shock');
 /* things fly out */
 for(let i=0;i<2;i++){const it=prop({t:'flyout',what:pick(FLY),x:d.x,y:110,layer:60});SFX.whoosh&&SFX.whoosh();await tw(it,{x:d.x+(i?-40:46)+Math.random()*20,y:158+Math.random()*8},TEST?0:380,'in')}
 props=props.filter(p=>p!==fx);SFX.door&&SFX.door();
 /* they come out */
 const f=floorOf(room);for(const [k,dx] of[[a,-4],[b,5]]){put(k,d.x+dx,1,{y:f[0]+2,alpha:0});A[k].ex='closed';tw(A[k],{alpha:1,y:f[0]+8},TEST?0:260)}
 await wait(TEST?0:350);
 await say(a,out[0],'closed');await say(b,out[1],'smirk');
 await N(pick(['They walk off in opposite directions. Then they both come back for the same shoe.','One of them is wearing the other one’s lanyard. Nobody says anything.','They walk away very normally. Too normally. Like two people who have practiced walking normally.']));
 await Promise.all([walk(a,-30,70),walk(b,350,70)]);remove(a);remove(b);
 if(typeof repAdd==='function')repAdd('legend',1);
},()=>typeof filthyOn==='function'?filthyOn():true);

/* ---------------- living backgrounds ---------------- */
const BIRDS=Array.from({length:4},(_,i)=>({p:hsh(i*9.1)*40,y:16+hsh(i*3.3)*40,s:18+hsh(i*5.7)*14}));
const HALLISH=new Set(['corridor','hallb','upper','wing_sci','wing_arts','wing_sports','walkway','stairwell']);
const OUTSIDE=new Set(['bus','field','courtyard','carpark','forest','lake']);
let FLICK={t:-9,room:null},LITTER=null;
{const _do=HOOK.drawOver;HOOK.drawOver=(...x)=>{
 if(!TEST&&D&&ROOM&&ROOM!=='titlescreen'&&!(P.set&&P.set.rmOff)){
  if(OUTSIDE.has(ROOM)){for(const b of BIRDS){const q=((T+b.p)%40)/40,bx=-10+q*(W+20)*(b.s/24),by=b.y+Math.sin(T*2+b.p)*3;if(bx>W+10)continue;const f=Math.sin(T*12+b.p)>0;g.globalAlpha=.7;R(bx,by,1,1,'#1a1420');R(bx-2,by-(f?1:0),2,1,'#1a1420');R(bx+1,by-(f?1:0),2,1,'#1a1420');g.globalAlpha=1}}
  if(HALLISH.has(ROOM)){
   if(Math.random()<.004&&T-FLICK.t>3)FLICK={t:T,room:ROOM};
   if(T-FLICK.t<.18&&FLICK.room===ROOM&&Math.sin(T*90)>0){g.globalAlpha=.12;R(0,0,W,H,'#000');g.globalAlpha=1}
   if(!LITTER||LITTER.room!==ROOM||LITTER.x>W+10){if(!LITTER||Math.random()<.002)LITTER={room:ROOM,x:-8,y:162+Math.random()*6,v:8+Math.random()*10,r:0}}
   if(LITTER&&LITTER.room===ROOM&&LITTER.x<=W+10){LITTER.x+=LITTER.v*(1/60);LITTER.r+=.08;const lx=Math.round(LITTER.x),ly=Math.round(LITTER.y+Math.sin(T*3)*1.5);R(lx,ly,3,2,'#e8e4d8');R(lx+(Math.sin(LITTER.r)>0?1:0),ly-1,2,1,'#c8c4b8')}
  }
  if(ROOM==='canteen'){for(let i=0;i<6;i++){const q=(T*.4+i/6)%1;g.globalAlpha=.16*(1-q);R(60+i*24+Math.sin(T+i)*3,128-q*30,2,2,'#ffffff');g.globalAlpha=1}}
  if(!OUTSIDE.has(ROOM)&&!HALLISH.has(ROOM)&&!['boiler','closet','black','busride'].includes(ROOM)){const q=((T*.02)%1.6)-.3;g.globalAlpha=.05;g.fillStyle='#000';g.beginPath();g.moveTo(q*W*1.5,0);g.lineTo(q*W*1.5+80,0);g.lineTo(q*W*1.5+30,H);g.lineTo(q*W*1.5-50,H);g.fill();g.globalAlpha=1}
 }
 _do&&_do(...x)}}

/* ---------------- hallway people: unique, and doing something ---------------- */
/* each room gets its own background kids (no clones from hall to hall) */
let EXROOM=null;const EXOFF={};let EXN=0;
const EXNEXT={};
{const _mx=makeExtra;makeExtra=function(i){if(EXROOM==null)return _mx(i);const key=EXROOM+':'+(D?cal()+':'+D.period:'');if(EXOFF[EXROOM]==null)EXOFF[EXROOM]=(++EXN)*40;if(EXNEXT[key]==null)EXNEXT[key]=0;let j=EXOFF[EXROOM]+(EXNEXT[key]++);while(A['x'+j])j++;return _mx(j)}}
{const _se=spawnExtras;spawnExtras=function(room,walkIn){EXROOM=room;
 /* count only this room's extras as "have" */
 try{_se(room,walkIn)}finally{EXROOM=null}
 if(TEST||!D)return;
 const hall=HALLISH.has(room),doors=((WORLD[room]||{}).doors||[]).filter(d=>!d.stairs&&!d.front);
 for(const id in A){const a=A[id];if(!a||!a.extra||a._role)continue;
  if(hall&&Math.random()<.45&&(doors.length||true)){
   a._role='going';a.idle=1e9;a.pose=null;
   const useDoor=doors.length&&Math.random()<.6,dest=useDoor?pick(doors):null,tx=dest?dest.x:(Math.random()<.5?-24:344);
   walk(id,tx,32+Math.random()*12).then(()=>{const b=A[id];if(!b||b!==a)return;
    if(dest){b.back=1;tw(b,{alpha:0,y:b.y-6},TEST?0:280).then(()=>{if(A[id]===b)remove(id)})}else remove(id)});
  }else{
   a._role='posted';a.idle=1e9;a.pose=pick(['cross','phone','hips',null,'cross','phone']);
   a._turnT=T+4+Math.random()*8;
  }}
}}
{const _hu=HOOK.update;HOOK.update=(dt,rdt)=>{_hu&&_hu(dt,rdt);if(TEST||!D)return;
 for(const id in A){const a=A[id];if(!a||a._role!=='posted'||a.tx!=null)continue;
  if(T>a._turnT){a._turnT=T+5+Math.random()*9;const nb=Object.keys(A).find(k=>k!==id&&A[k]&&A[k]._role==='posted'&&Math.abs(A[k].x-a.x)<26);
   if(nb&&!A[nb].moving)face(id,nb);
   if(nb&&Math.random()<.35&&typeof bubbles!=='undefined'&&typeof GOSSIP==='function')bubbles.push({id,txt:pick(GOSSIP()),t:3})}}}}
/* named kids: once you’ve seen someone in one hall this period, they’re not in the next one too */
const SEENIN={};
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);
 try{if(!TEST&&D&&!D.weekend){const key=cal()+':'+D.period;SEENIN[key]=SEENIN[key]||{};const seen=SEENIN[key];
  for(const id of Object.keys(A)){const a=A[id];if(!a||id==='you'||a.extra||!K[id]||K[id].adult||a.dead)continue;
   const busyHere=availableHooks(room,id).length>0||(typeof jobFor==='function'&&false);
   if(seen[id]&&seen[id]!==room&&!busyHere){if(HALLISH.has(room))remove(id);continue}
   seen[id]=room}}}catch(e){}
 return r}}

/* sidesteps keep facing the same way (no flip-flopping when people shuffle apart) */
{const _u=update;update=function(dt,rdt){_u(dt,rdt);for(const id in A){const a=A[id];if(a&&a._keepDir!=null){if(a.tx==null)a._keepDir=null;else a.dir=a._keepDir}}}}
