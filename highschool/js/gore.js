'use strict';
/* =====================================================================
   HIGHSCHOOL — GORE KIT
   gHead()   take the head off (returns the head, so you can do things to it)
   liftHead() pick it up and hold it up
   kickHead() kick it across the room, bouncing, leaving a trail
   toes()    a close-up: shears, five toes, one at a time. The toes land
             on the floor and stay there.
   Teachers kill sneakily now, unless there are only one or two kids around.
   ===================================================================== */
{const _dp=drawProp;drawProp=function(p){
 if(p.t==='toe'){const x=Math.round(p.x),y=Math.round(p.y);R(x,y,3,2,p.skin||'#e8c0a0');R(x+(p.d>0?2:0),y,1,2,'#8a1020');R(x+(p.d>0?0:2),y,1,1,'#f4e8e0');return}
 if(p.t==='tooth'){const x=Math.round(p.x),y=Math.round(p.y);R(x,y,2,2,'#f4f0e0');R(x,y+1,2,1,'#c03030');return}
 if(p.t==='toecut'){
  const x=Math.round(p.x),y=Math.round(p.y),sk=p.skin||'#e8c0a0';
  R(x-52,y-26,104,52,'#2a2030');R(x-50,y-24,100,48,'#0e0c12');R(x-50,y+10,100,14,'#3a3a44');
  /* the foot */
  R(x-40,y-4,46,14,sk);R(x-42,y-2,4,10,sk);R(x-40,y+8,46,2,'rgba(0,0,0,.25)');R(x-30,y-6,30,3,sk);
  const toeX=[7,15,22,28,33],toeW=[7,6,5,4,4],toeH=[11,10,9,8,7];
  for(let i=0;i<5;i++){const tx=x+toeX[i],ty=y+10-toeH[i];
   if(i<p.cut){R(tx,ty+toeH[i]-3,toeW[i],3,'#a01020');R(tx+1,ty+toeH[i]-3,toeW[i]-2,1,'#e8d0c8')}
   else{R(tx,ty,toeW[i],toeH[i],sk);R(tx,ty,1,toeH[i],'rgba(0,0,0,.18)');R(tx+1,ty+1,toeW[i]-2,3,'#f8e4dc');R(tx+1,ty+1,toeW[i]-2,1,'#fff4f0');R(tx,ty+toeH[i]-1,toeW[i],1,'rgba(0,0,0,.2)')}}
  /* the shears, closing on the next toe */
  if(p.cut<5){const i=p.cut,tx=x+toeX[i]+toeW[i]/2,o=Math.round((1-(p.snip||0))*7);
   R(tx-1,y-20,3,12,'#7a7a82');R(tx-6-o,y-10,7+o,2,'#d0d4d8');R(tx,y-10,7+o,2,'#d0d4d8');R(tx-6-o,y-8,7,2,'#9a9ea8');R(tx+o,y-8,7,2,'#9a9ea8');R(tx-3,y-26,7,6,'#c03030');R(tx-2,y-25,5,4,'#e04848')}
  for(const b of(p.drops||[])){const q=T-b.t;if(q<.8){g.globalAlpha=1-q/.8;R(x+b.x+b.vx*q,y+b.y+q*q*40-q*12,2,2,'#c01020');g.globalAlpha=1}}
  pxc('CLOSE-UP',x,y-23,'#5a5068');return}
 return _dp(p)}}

async function gHead(id,dir){
 const a=A[id];if(!a)return null;const d=dir||1;
 const h=prop({t:'head',id,x:a.x,y:a.y-26,rot:0,layer:6});
 kill(id,'head',{spray:50,pool:40,bleed:6});
 SFX.squelch();shake(1.2);flash('#a00010',.35);
 for(let i=0;i<3;i++)blood(a.x,a.y-22,26,null,120,a.y+2);
 await Promise.all([tw(h,{x:a.x+d*34},700,'out'),tw(h,{y:a.y-48},350,'out').then(()=>tw(h,{y:a.y-2},350,'in')),tw(h,{rot:d*6},700)]);
 SFX.thud();splat(h.x,a.y+1,7);
 /* the neck keeps going for a bit */
 for(let i=0;i<4;i++){blood(a.x,a.y-6,10,null,70,a.y+2);await wait(160)}
 return h;
}
async function liftHead(who,h,line){
 if(!A[who]||!h)return;
 await walk(who,h.x-(A[who].x<h.x?6:-6),80);const d=A[who].x<h.x?1:-1;face(who,d);
 pose(who,'reach');await tw(h,{x:A[who].x+d*5,y:A[who].y-38,rot:0},400);pose(who,'up');
 for(let i=0;i<3;i++){blood(h.x,h.y+4,3,null,20,A[who].y+2);await wait(220)}
 if(line)await N(line);
 pose(who,null);await tw(h,{x:A[who].x+d*7,y:A[who].y-2},300,'in');SFX.thud();
}
async function kickHead(who,h,far){
 if(!A[who]||!h)return;
 const d=A[who].x<=h.x?1:-1;if(Math.abs(A[who].x-h.x)>9)await walk(who,h.x-d*8,90);face(who,d);
 pose(who,'kick');await wait(160);SFX.punch();shake(.8);
 const fy=h.y,dist=(far||120)*d;let x0=h.x;
 const legs=[[dist*.6,34,320],[dist*.28,12,220],[dist*.12,5,160]];
 for(const [dx,hgt,ms] of legs){const y0=fy;await Promise.all([tw(h,{x:x0+dx},ms),tw(h,{y:y0-hgt},ms/2,'out').then(()=>tw(h,{y:fy},ms/2,'in')),tw(h,{rot:h.rot+d*5},ms)]);x0+=dx;SFX.thud();splat(h.x,fy+1,4);blood(h.x,fy-2,6,null,40,fy+1)}
 pose(who,null);
}
async function toes(vic,cutter){
 const a=A[vic];if(!a)return;
 if(cutter&&A[cutter]){await walk(cutter,a.x-(A[cutter].x<a.x?10:-10),80);face(cutter,A[cutter].x<a.x?1:-1);pose(cutter,'kneel')}
 a.pose='lie';a.ex='scared';SFX.sting();
 const p=prop({t:'toecut',x:200,y:40,cut:0,snip:0,skin:(K[vic]||{}).skin,drops:[],layer:9999});
 await wait(500);
 for(let i=0;i<5;i++){
  await tw(p,{snip:1},620,'in');
  SFX.crunch();SFX.squelch();shake(.5);p.cut=i+1;p.snip=0;
  for(let j=0;j<10;j++)p.drops.push({x:[7,15,22,28,33][i]+2,y:2,vx:(Math.random()-.5)*30,t:T});
  const tp=prop({t:'toe',x:a.x+6,y:a.y-4,skin:(K[vic]||{}).skin,d:1});
  await Promise.all([tw(tp,{x:a.x+10+i*5+Math.random()*4},420),tw(tp,{y:a.y-14},210,'out').then(()=>tw(tp,{y:a.y+1+(i%2)},210,'in'))]);
  blood(a.x+4,a.y-2,6,null,40,a.y+2);
  if(i===1)SFX.scream();
  if(i<4)await wait(420);
 }
 await wait(1400);p.hide=1;if(cutter&&A[cutter])pose(cutter,null);
}

/* ---------------- sneaky teachers ---------------- */
const witnessesNow=()=>Object.keys(A).filter(k=>k!=='you'&&A[k]&&!A[k].dead&&A[k].vis!==false&&K[k]&&!K[k].adult);
{const _lk=lessonKill;lessonKill=async function(t){
 const L=LESSON_KILLS[t];if(!L||!A[t]||D.dead[L.victim])return;
 const wit=witnessesNow().length;
 if(wit<=2)return _lk(t);              /* nobody to see it: she doesn’t bother hiding it */
 if(Math.random()<.5)return;
 const v=A[L.victim]||put(L.victim,300,-1,{y:146});
 await say(t,pick(['(sweetly) '+K[L.victim].n+', {PET}, could you help {ME} carry something to the supply closet? Just you. Just for a minute.','(not looking up) '+K[L.victim].n+'. Stay behind a second when I take the register to the office. You can carry it.','(smiling with no teeth) '+K[L.victim].n+'. Hall pass. Come with me. It’s about your… behavior.']),'happy');
 await say(L.victim,pick(['…Okay.','Can someone else come?','Is it heavy?']),'scared');
 await Promise.all([walk(t,334,70),walk(L.victim,322,60)]);
 A[t].vis=false;v.vis=false;
 await N(pick(['The door clicks shut behind them. Somebody keeps writing. Somebody stops writing.','The door shuts. For about a minute the only sound is the clock. Then, from down the corridor, one short thump. Then a second, longer one.','Nobody says anything. Through the wall, very faintly, something heavy gets dragged.']));
 const c=await choose(['Keep your head down.','Ask to go to the bathroom. Follow them.'],'They’ve been gone a while.');
 if(c===1){
  await N('You slip out. The supply closet at the end of the corridor is open a crack. You look.');
  const snap={A:Object.assign({},A),room:ROOM,props:props.slice(),decals:decals.slice()};
  scene('closet',{you:[40,1,{y:156}]},true);fxState.dark=.35;
  put(L.victim,200,-1,{y:150});put(t,176,1,{y:146});
  await toes(L.victim,t);
  await say(t,'(not turning round) This little piggy went to market. And this little piggy stayed after class.','evil');
  const run=await mash('Get back to class. Don’t make a sound.',{need:16,time:4,info:'MASH, quietly!'});
  if(!run){face(t,-1);await say(t,'(turning, very slowly) Oh, {PET}. You don’t have a hall pass.','evil');SFX.squelch();blood(A.you.x,A.you.y-24,40,null,100,A.you.y+2);await die(DEATHS.closet?'closet':'seat');return}
  D.dead[L.victim]=1;fxState.dark=0;
  scene(snap.room,null,true);for(const k in snap.A)if(k!==L.victim&&k!==t)A[k]=snap.A[k];props=snap.props;decals=snap.decals;if(snap.A[t]){A[t]=snap.A[t];A[t].vis=false}
  await N('You get back to your seat. Your heart is going so hard your pen is shaking. Twenty minutes later, '+K[t].n+' comes back in alone, wiping '+HIS(t)+' hands on a paper towel that keeps getting redder.');
  if(A[t]){A[t].vis=true;A[t].x=300;await walk(t,TEACHER_SPOT[ROOM]?TEACHER_SPOT[ROOM][0]:44,70)}
  return;
 }
 D.dead[L.victim]=1;
 await wait(600);A[t].vis=true;A[t].x=300;await walk(t,TEACHER_SPOT[ROOM]?TEACHER_SPOT[ROOM][0]:44,70);
 await say(t,pick(['(back, alone, wiping hands on a paper towel) Where were we, {PETS}?','(back alone, slightly out of breath) '+K[L.victim].n+' went home. Wasn’t feeling well. Isn’t feeling anything now. Page twelve.','(back alone, a little smear of something on one cuff) Let’s carry on.']),'happy');
 const w=witnessesNow().filter(k=>FRIENDS.includes(k));if(w.length)await say(pick(w),pick(['(whispering, not looking up) Did… did they come back?','(whispering) I’m not asking. I’m not asking. Someone else ask.','(whispering) That’s three this week. Three.']),'scared');
}}
ROOMS.closet={name:'Supply Closet',music:'evil',bg(){
 R(0,0,W,112,'#2a2622');for(let i=0;i<W;i+=16)R(i,0,1,112,'rgba(0,0,0,.2)');
 for(const sy of[24,52,80]){R(10,sy,300,4,'#5a4a3a');R(10,sy+4,300,1,'#3a2a1a');for(let i=0;i<24;i++){const bx=14+i*12+(sy%7);R(bx,sy-12+(i%3),10,12-(i%3),['#e8e4dc','#c8b8a0','#8aa0b0','#d0c8b0'][(i+sy)%4]);if(i%5===0)px('A4',bx+1,sy-9,'#5a5a5a')}}
 R(260,30,6,82,'#7a6a4a');R(256,100,14,12,'#8a8a92');R(240,60,4,52,'#6a5a3a');R(232,104,20,8,'#c8c020');
 R(150,0,2,10,'#222');R(146,10,10,5,'#3a3a3a');g.globalAlpha=.25+Math.sin(T*7)*.04;R(110,14,90,90,'#fff2c8');g.globalAlpha=1;
 R(0,112,W,68,'#3a3430');for(let i=0;i<80;i++)R(hsh(i+5)*W,114+hsh(i+6)*64,2,1,'#2a2420');
}};
if(typeof LIGHT!=='undefined')LIGHT.closet={amb:.36,tint:[30,20,10],src:[[151,14,90,.55,[255,236,190]]]};
DEATHS.closet={name:'No Hall Pass',desc:'You followed them to the supply closet. You don’t get to unsee it, and you didn’t get to leave.',hint:'When a teacher takes a kid to the supply closet, following is a choice. Be quiet.'};
