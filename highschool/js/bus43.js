'use strict';
/* =====================================================================
   HIGHSCHOOL — THE 43, DOWN THE AISLE
   Like a real school bus: you’re looking down the aisle from the back.
   Two columns of tall green seats, the windows on both sides, the
   driver and the windshield at the far end. Kids sit with their heads
   over the seat backs. Window seats lean on the glass. Some kids kneel
   backwards on their seats to talk to the row behind.
   ===================================================================== */
const VPX=160;
const BROWS=[{fy:98,s:.42},{fy:108,s:.56},{fy:121,s:.74},{fy:139,s:1},{fy:164,s:1.34}];
const bWallX=y=>120-(y-86)*(120/94);          /* left wall x at floor height y */
const bAisle=s=>15*s;                          /* half the aisle width */
function seatSlots(){const out=[];BROWS.forEach((r,ri)=>{const xw=bWallX(r.fy);
 for(const side of[-1,1]){const winX=side<0?xw+20*r.s:W-xw-20*r.s,aisX=side<0?VPX-bAisle(r.s)-14*r.s:VPX+bAisle(r.s)+14*r.s;
  out.push({r:ri,side,seat:'w',x:Math.round(winX),y:Math.round(r.fy-16*r.s),s:r.s});out.push({r:ri,side,seat:'a',x:Math.round(aisX),y:Math.round(r.fy-16*r.s),s:r.s})}});return out}
const SLOTS43=seatSlots();
const slotAt=(r,side,seat)=>SLOTS43.find(q=>q.r===r&&q.side===side&&q.seat===seat);
const busScale=y=>clamp(.42+(y-91)*(.92/50),.34,1.6);

/* ---------- drawing ---------- */
function poly(pts,c){g.fillStyle=c;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill()}
const winTop=x=>12+(32-12)*(x/120),winBot=x=>96+(60-96)*(x/120);
function bus43Static(night){
 /* ceiling: white panels, rivets, the light strip */
 poly([[0,0],[W,0],[200,26],[120,26]],'#d8d8d0');
 for(let i=1;i<6;i++){const t=i/6,y=26*t*t*1.1;R(0,Math.round(26-26*(1-t)),W,1,'rgba(0,0,0,.06)')}
 poly([[150,0],[170,0],[164,26],[156,26]],night?'#f0e8c0':'#f4f4ec');
 /* the walls */
 poly([[0,0],[120,26],[120,86],[0,180]],'#c8bc9c');poly([[W,0],[200,26],[200,86],[W,180]],'#c8bc9c');
 for(let i=0;i<14;i++){const x=i*9;R(x,winBot(x)+6,1,(180-winBot(x))*.5,'rgba(0,0,0,.06)');R(W-x,winBot(x)+6,1,(180-winBot(x))*.5,'rgba(0,0,0,.06)')}
 /* far end: windshield, dash, mirror, the destination sign */
 R(120,26,80,60,'#2a2a30');R(124,30,72,30,'#4a5a6a');
 R(122,22,76,6,'#1a1a1a');px('43 FAIR CITY',126,23,'#f0c040');
 R(132,62,56,8,'#1e1e22');R(150,60,20,3,'#3a3a40');R(172,32,16,6,'#2a2a2a');R(173,33,14,4,'#8ab0c8');
 /* floor: ribbed rubber running away from you */
 poly([[120,86],[200,86],[W,180],[0,180]],'#3a3a40');
 for(let i=0;i<12;i++){const t=i/12,y=86+94*t*t;R(0,Math.round(y),W,1,'rgba(255,255,255,.05)')}
 poly([[156,86],[164,86],[178,180],[142,180]],'#46464e');for(let i=0;i<10;i++){const t=i/10,y=Math.round(86+94*t*t);R(VPX-4-t*14,y,8+t*28,1,'rgba(0,0,0,.25)')}
 for(let i=0;i<24;i++){const t=hsh(i+3),y=90+t*t*88;R(VPX-30+hsh(i+5)*60*(t+.3),y,2,1,['#c8c8c8','#e8a0c8','#8ac8e8'][i%3])}
}
function bus43Windows(night){
 const sky=night?['#141432','#22224a','#3a2a4a']:['#e8945a','#eeb07e','#f2cca0'];
 for(const side of[-1,1]){
  g.save();g.beginPath();const P=side<0?[[0,winTop(0)],[120,winTop(120)],[120,winBot(120)],[0,winBot(0)]]:[[W,winTop(0)],[200,winTop(120)],[200,winBot(120)],[W,winBot(0)]];
  g.moveTo(P[0][0],P[0][1]);for(const p of P.slice(1))g.lineTo(p[0],p[1]);g.closePath();g.clip();
  for(let i=0;i<3;i++)R(0,i*30,W,30,sky[i]);R(0,60,W,60,sky[2]);
  const spd=D&&D.f&&D.f.busStopped?0:.18;
  for(let i=0;i<9;i++){const p=((T*spd+i/9)%1),e=p*p,x=side<0?120-e*140:200+e*140,h=(12+hsh(i)*18)*(.4+e*2.2),w=(10+hsh(i+2)*10)*(.4+e*2),yb=winBot(side<0?x:W-x);
   R(side<0?x-w:x,yb-h,w,h,night?'#10101e':['#6a5658','#5a4a5a','#7a6a5a'][i%3]);if(night)for(let k=0;k<3;k++)R((side<0?x-w:x)+2+k*w/3,yb-h+4,2,2,'#f0d070')}
  g.globalAlpha=.12;R(side<0?20:W-40,0,8,180,'#fff');g.globalAlpha=1;
  g.restore();
  /* frames between panes, the sill, the luggage rack */
  for(const fx of[0,30,58,80,98,110,120]){const x=side<0?fx:W-fx;g.fillStyle='#4a4a50';g.fillRect(x-1,winTop(fx)-1,2,winBot(fx)-winTop(fx)+2)}
  g.strokeStyle='#4a4a50';g.lineWidth=2;g.beginPath();if(side<0){g.moveTo(0,winTop(0));g.lineTo(120,winTop(120));g.moveTo(0,winBot(0));g.lineTo(120,winBot(120))}else{g.moveTo(W,winTop(0));g.lineTo(200,winTop(120));g.moveTo(W,winBot(0));g.lineTo(200,winBot(120))}g.stroke();
  g.strokeStyle='#8a8a90';g.lineWidth=1;g.beginPath();if(side<0){g.moveTo(0,winTop(0)-5);g.lineTo(120,winTop(120)-2)}else{g.moveTo(W,winTop(0)-5);g.lineTo(200,winTop(120)-2)}g.stroke();
 }
 /* road through the windshield */
 g.save();g.beginPath();g.rect(124,30,72,30);g.clip();
 for(let i=0;i<3;i++)R(124,30+i*7,72,7,sky[i]);R(124,44,72,16,night?'#1a1a22':'#4a4a50');
 for(let i=0;i<5;i++){const q=((T*(D&&D.f&&D.f.busStopped?0:.6))+i/5)%1;R(158-q*4,44+q*16,2+q*4,2+q*3,'#e8e0a0')}
 g.restore();
}
function seatBack43(r,side){
 const row=BROWS[r],s=row.s,xw=bWallX(row.fy),x0=side<0?xw+1:VPX+bAisle(s),x1=side<0?VPX-bAisle(s):W-xw-1,top=row.fy-28*s,h=28*s;
 const x=Math.round(x0),w=Math.round(x1-x0),y=Math.round(top),hh=Math.round(h);
 R(x+1,y,w-2,hh,'#1f5a3c');R(x,y+2,w,hh-2,'#1f5a3c');
 R(x+1,y,w-2,Math.max(1,Math.round(3*s)),'#3a8a5e');R(x+2,y+1,w-4,1,'#5aa87a');
 R(x,y+Math.round(hh*.5),w,1,'rgba(0,0,0,.25)');R(side<0?x+w-2:x,y+2,2,hh-2,'rgba(0,0,0,.25)');
 if(hsh(r*7+side)<.6)R(x+w*.3,y+hh*.4,Math.max(2,4*s),Math.max(1,3*s),['#e8e0d0','#c04060','#f0d040'][r%3]);
 R(x,y+hh,w,Math.max(1,Math.round(2*s)),'rgba(0,0,0,.35)');
}
ROOMS.busride.bg=function(){const night=D&&D.period>=8;guCache('bus43',night?'n':'d',()=>bus43Static(night));bus43Windows(night);if(D&&D.f&&D.f.busTilt)fxState.shake=Math.max(fxState.shake||0,.2)};
ROOMS.busride.items=[];
BROWS.forEach((row,r)=>{for(const side of[-1,1])ROOMS.busride.items.push({y:row.fy-16*row.s+.6,d:()=>seatBack43(r,side)})});
if(typeof LIGHT!=='undefined')LIGHT.busride=()=>({amb:D&&D.period>=8?.55:.85,tint:D&&D.period>=8?[20,20,60]:[80,50,30],src:[[160,10,120,.25,[255,250,230]]]});

/* everybody on the bus is drawn at the size of the row they’re in, and window seats lean on the glass */
{const _da=drawActor;drawActor=function(a){
 if(ROOM!=='busride'||!a||a.id==='driver'&&false)return _da(a);
 const s=a.bs||busScale(a.y);
 g.save();g.translate(a.x,a.y);if(a.blean&&!a.dead)g.rotate(a.blean);g.scale(s,s);g.translate(-a.x,-a.y);
 try{_da(a)}finally{g.restore()}
}}
/* people turn round to talk */
{const _say=say;say=function(who,t,e){if(ROOM==='busride'&&A[who]&&who!=='driver'){A[who].back=0;A[who].blean=0}return _say(who,t,e)}}

/* ---------- getting on ---------- */
boardScene=function(){
 const ks=ridersToday();const cast={};
 const used=new Set();const take=(sl,id,o)=>{used.add(sl);cast[id]=[sl.x,sl.side<0?1:-1,Object.assign({y:sl.y,pose:'sit'},o||{})];cast[id].slot=sl};
 const mine=slotAt(3,-1,'a');take(mine,'you');
 if(ks.includes('pauljones'))take(slotAt(4,1,'w'),'pauljones');
 const order=ks.filter(k=>k!=='pauljones');
 const free=SLOTS43.filter(sl=>!used.has(sl)&&!(sl.r===4&&sl.side===1));
 free.sort((a,b)=>hsh(a.r*13+a.x+cal())-hsh(b.r*13+b.x+cal()));
 order.slice(0,free.length).forEach((k,i)=>take(free[i],k));
 cast.driver=[140,1,{y:84,pose:'sit'}];
 scene('busride',cast,true);ROOM='busride';
 for(const id in cast){const a=A[id];if(!a)continue;a.back=1;a.bslot=cast[id].slot||null;a.sitHigh=1;
  if(a.bslot&&a.bslot.seat==='w'&&id!=='you'&&hsh(id.length*7+cal())<.55){a.blean=a.bslot.side<0?-.32:.32;if(hsh(id.length+cal())<.5)a.ex='closed'}
  if(a.bslot&&a.bslot.r===2&&id!=='you'&&hsh(id.length*3+cal())<.5){a.back=0;a.dir=a.bslot.side<0?1:-1}}
 if(A.driver){A.driver.bs=.4;A.driver.back=1}
 if(A.pauljones){A.pauljones.ex='sad';A.pauljones.blean=.3}
 return Object.keys(cast);
};
/* moving around inside: out to the aisle, along it, into a seat */
async function busMove(id,to,speed){
 const a=A[id];if(!a)return;speed=speed||60;a.pose=null;a.blean=0;a.back=1;
 const toY=to.y,toX=to.x;
 await walk(id,VPX+(a.x<VPX?-4:4),speed);
 await new Promise(r=>{a.moving=true;const dur=Math.abs(a.y-toY)/40*1000;tw(a,{y:toY},Math.max(150,dur)).then(()=>{a.moving=false;r()})});
 await walk(id,toX,speed);
}
const besideSlot=sl=>slotAt(sl.r,sl.side,sl.seat==='w'?'a':'w');
async function sitBeside(id,other){const o=A[other];if(!o||!o.bslot)return;const sl=besideSlot(o.bslot);for(const k in A)if(k!==id&&A[k]&&A[k].bslot===sl){await busMove(k,{x:VPX+(sl.side<0?-2:2),y:sl.y+6});A[k].pose='sit'}
 await busMove(id,sl);A[id].pose='sit';A[id].bslot=sl;face(id,other)}

/* ---------- the ride events, restaged for the aisle ---------- */
const RE=id=>RIDE.find(e=>e.id===id);
if(RE('pj1'))RE('pj1').run=async()=>{
 await N('Back row, by the window: Paul Jones, afro squashed under his hood. He has a whole seat to himself every day. Not because he’s lucky.');
 if(onBus('arjun'))await say('arjun','(kneeling backwards on his seat, loud) Ayo, Off-Brand Paul. Real Paul’s up front. You’re the knockoff. You’re the Paul from Wish.','smirk');
 classLaugh(500);
 const c=await choose(['Go and sit next to Paul Jones.','Laugh. It was kind of funny.','Stay where you are.']);
 if(c===0){await sitBeside('you','pauljones');
  await say('pauljones','(still leaning on the window) …You don’t have to sit here.','sad');await say('you','I know.');
  await say('pauljones','(after a really long time) It’s Paul. Just Paul. Nobody here gets that.','sad');D.f.pjKind=pjKind()+1}
 else if(c===1){await N('You laugh. Paul Jones turns his face to the window. He doesn’t look away from it for the whole ride.');D.f.pjMean=(D.f.pjMean||0)+1}
 D.f.pj1=1;if(!D.mp.pauljones)part('pauljones',1);
};
if(RE('pj2'))RE('pj2').run=async()=>{
 hold('pauljones','book');A.pauljones.blean=0;
 await N('Paul Jones is drawing in a notebook on his knees at the back, pressing so hard the pen goes through the page.');
 const c=await choose(['Go back and ask what he’s drawing.','Pretend you didn’t see.']);
 if(c===0){await sitBeside('you','pauljones');
  await N('It’s the 43. From above. Every seat, with a name in it. Some of the names are crossed out. Arjun’s is crossed out so many times there’s no paper left.');
  await say('pauljones','(closing it) It’s nothing. It’s a seating plan. I like knowing where everyone is.','sad');
  await say('pauljones','You’re not crossed out. In case you were wondering.','sad');
  const d=await choose(['“Is everything okay at home?”','“Who crossed you out?”']);
  if(d===0)await say('pauljones','(not really laughing) My dad keeps his stuff in a shoebox in the closet. He thinks I don’t know the code. It’s my birthday. That’s the only time he remembers it.','sad');
  else await say('pauljones','Everybody. Everyone in this school crossed me out on the first day. I’m just doing it back.','angry');
  D.f.pjKind=pjKind()+1}
 hold('pauljones',null);D.f.pj2=1;part('pauljones',2);
};
if(RE('pj3'))RE('pj3').run=async()=>{
 const b=['arjun','kenneth'].find(onBus);
 if(b){hold(b,'paper');A[b].blean=A[b].bslot&&A[b].bslot.side<0?-.4:.4;pose(b,'up');
  await N(K[b].n+' has Paul Jones’s backpack. He’s holding it out of the window by one strap. The whole bus is chanting “DROP IT”.')}
 else await N('Two sophomores up front have Paul Jones’s backpack out of the window by one strap. The whole bus is chanting “DROP IT”.');
 A.pauljones.back=0;A.pauljones.blean=0;
 await say('pauljones','(standing up at the back, very quiet) Give it back. Give it back. GIVE IT BACK.','angry');
 const c=await choose(['Grab the backpack back for him.','Yell for the driver to stop.','Chant.']);
 if(c===0&&b){await busMove('you',{x:VPX,y:A[b].y+4});pose('you','grab');const ok=await mash('Get it!',{need:14,time:4});pose('you',null);
  if(ok){await N('You snatch it back in through the window. It’s heavier than a backpack should be. Something inside clunks. Metal on metal.');
   await busMove('you',{x:VPX+6,y:A.pauljones.y+4});await say('pauljones','(taking it, holding it to his chest) …Don’t look in it. Thanks. Don’t look in it.','scared');D.f.pjKind=pjKind()+2}
  else{SFX.thud();await N('The strap snaps. The backpack bounces down the road behind the bus. Paul Jones watches it go through the back window without blinking.');D.f.pjKind=pjKind()+1}}
 else if(c===1){await say('you','DRIVER. STOP THE BUS.');await say('driver','(not stopping) I don’t stop for backpacks. I stopped for a backpack in 2009 and I’ve regretted it every day.','angry');D.f.pjKind=pjKind()+1}
 else{await N('You chant. Everybody chants. The backpack goes. Paul Jones sits back down and writes something in his notebook.');D.f.pjMean=(D.f.pjMean||0)+1}
 if(b){hold(b,null);pose(b,'sit')}
 D.f.pj3=1;part('pauljones',3);
};
if(RE('pjLast'))RE('pjLast').run=async()=>{
 cue('tension');
 await N('The last ride home before the weekend. Inspection Day. Everyone is loud. At the back, Paul Jones stands up and steps out into the aisle.');
 await busMove('pauljones',{x:VPX,y:BROWS[3].fy-12});A.pauljones.back=0;hold('pauljones','pistol');
 await N('He’s in the aisle, right next to you, holding his dad’s pistol. Not pointing it. Holding it like it’s heavy. Like he’s surprised it’s real.');
 for(const k in A)if(k!=='you'&&k!=='pauljones'&&k!=='driver'&&A[k]&&!A[k].dead){A[k].ex='scared';A[k].back=0;A[k].blean=0}
 SFX.sting();D.f.busStopped=1;
 await say('driver','(eyes in the big mirror, braking slowly) Son. Son. Easy.','scared');
 const target=onBus('arjun')?'arjun':ridersToday().find(k=>onBus(k)&&k!=='pauljones');
 if(target)await say('pauljones','(to '+K[target].n+', shaking) You crossed me out. All of you. Every day. Every single day.','angry');
 const kind=pjKind();
 const c=await choose([{t:'“Paul. It’s me. Give it to me.”',dis:kind<2,why:'he doesn’t know you'},{t:'Grab for it.',tag:'!'},{t:'Get down behind the seat.'}],'Paul Jones has a gun on the 43.');
 if(c===0){
  A.you.pose=null;A.you.back=0;await say('you','Paul. Just Paul. It’s me. You can give it to me.');
  await say('pauljones','(crying now) I wasn’t gonna— I didn’t know who it was for. I didn’t know if it was for them or for me. I just didn’t want to go home.','cry');
  hold('pauljones',null);hold('you','pistol');
  await N('He holds it out flat on his hand, the way you’d give somebody a bird. You take it. Your hands are shaking worse than his.');
  A.pauljones.pose='sit';A.pauljones.y+=6;
  await N('He sits down in the aisle, head in his hands. The bus is silent. The driver opens the door, puts the hazards on, and says nothing.');
  hold('you',null);await N('When the police come, Paul Jones tells them everything before they ask. On his way off the bus he looks back at you and nods. Once.');
  await complete('pauljones','given');
 }else if(c===1){
  A.you.pose='grab';const ok=await mash('Get the gun!',{need:20,time:3,info:'Push it up. UP.'});
  if(ok){SFX.bang&&SFX.bang();shake(1.4);flash('#fff',.6);await N('It goes off into the roof. A hole the size of a coin, letting in a little circle of evening light. Then it’s in your hands and he’s on the floor of the aisle.');
   hold('pauljones',null);A.pauljones.pose='sit';A.pauljones.ex='cry';A.pauljones.y+=6;
   await say('pauljones','(on the floor, hands over his head) I’m sorry. I’m sorry. I’m sorry.','cry');pose('you',null);await complete('pauljones','grabbed')}
  else{SFX.bang&&SFX.bang();shake(1.6);flash('#a00010',.5);blood(A.you.x,A.you.y-24,40,null,90,A.you.y+2);await N('It goes off. You don’t feel it at first. Then you feel all of it.');await die('backseat')}
 }else{
  A.you.pose='sit';A.you.y+=8;SFX.bang&&SFX.bang();shake(1.5);flash('#a00010',.4);
  if(target&&A[target]){blood(A[target].x,A[target].y-20,40,null,80,A[target].y+2);kill(target,'lie',{pool:20});D.dead[target]=1}
  await N('One shot. Then nothing. Paul sits down in the aisle, puts the gun on the floor, hands on his head. Like he’s known for a while how this goes.');
  if(target)await N(K[target].n+' doesn’t get up. Nobody on the 43 says anything all the way to the hospital stop, where an ambulance is already waiting, lights on, no siren.');
  await complete('pauljones','shot');
 }
 D.f.busStopped=0;
};
if(RE('reilly'))RE('reilly').run=async()=>{
 const sl=A.arjun&&A.arjun.bslot?besideSlot(A.arjun.bslot):null;if(!sl)return;
 put('reilly',VPX,1,{y:86});A.reilly.back=0;
 await N('Mrs. Reilly gets on at the hospital stop with two bags of shopping and walks down the aisle like she owns it.');
 for(const k in A)if(k!=='reilly'&&A[k]&&A[k].bslot===sl){await busMove(k,{x:VPX+(sl.side<0?-3:3),y:sl.y+5});A[k].pose='sit'}
 await busMove('reilly',sl,40);A.reilly.pose='sit';A.reilly.back=0;
 await N('She sits next to Arjun. She smiles at him the whole way, like a grandma. Two stops later she walks back up the aisle and gets off.');
 await busMove('reilly',{x:VPX,y:86},45);remove('reilly');
 await N('Arjun’s phone, wallet and one of his shoes are gone.');
 await say('arjun','(looking at his sock) …I respect it. I hate it. I respect it.','shock');
};
if(RE('coreyGuilt')){const old=RE('coreyGuilt').run;RE('coreyGuilt').run=async()=>{if(!onBus('corey'))return;D.f.rideCG=1;await sitBeside('you','corey');A.corey.blean=A.corey.bslot&&A.corey.bslot.seat==='w'?(A.corey.bslot.side<0?-.3:.3):0;
 await N('Corey has his forehead against the window. He’s not looking at anything. His hands are in his lap, palms up, like he’s waiting for somebody to put something in them.');
 await say('corey','I keep waiting to feel like a murderer. Like, there’s supposed to be a feeling. I keep checking for it.','sad');
 await say('corey','I just feel like a guy on a bus. Is that worse? I think that’s worse.','sad');
 const c=await choose(['“You did it for her.”','“We did it. Not you. We.”','Say nothing. Sit with him.']);
 if(c===0)await say('corey','I did it for me. I did it so I didn’t have to watch. That’s different. I know it’s different.','sad');
 else if(c===1)await say('corey','(quietly) …We. Okay. We.','sad');
 else{A.corey.blean=0;await N('You sit with him. At the stop by the woods he closes his eyes until the bus moves again.')}}}
if(RE('crash')){const old=RE('crash').run;RE('crash').run=async()=>{
 P.busCrash=1;save();cue('fight');
 await N('At the roundabout, a raccoon runs into the road. Through the windshield you see the driver’s arms go the wrong way. He swerves too far.');
 SFX.crunch();SFX.glass();shake(2.2);flash('#fff',.6);D.f.busTilt=1;
 for(const k in A){if(k==='driver')continue;const a=A[k];if(!a||a.dead)continue;a.pose='lie';a.blean=0;tw(a,{x:a.x+(Math.random()*60-30)*(a.bs||1),y:a.y+Math.random()*10},400)}
 await wait(600);
 const v=['kid4','kid2'].find(k=>!D.dead[k]);if(v){put(v,VPX+10,-1,{y:BROWS[2].fy-6});blood(A[v].x,A[v].y-8,40,null,70,A[v].y+2);kill(v,'lie',{pool:20});D.dead[v]=1}
 await N('The 43 goes over on its side. Everyone ends up on the windows. Somebody’s phone is still playing music. A sophomore who was standing in the aisle isn’t moving.');
 D.f.busTilt=0;await wait(400);
 for(const k in A)if(A[k]&&!A[k].dead&&k!=='driver')A[k].pose='sit';
 if(onBus('hasan'))await say('hasan','(climbing out through a window, glasses gone) Is everyone okay? Is everybody— oh. Oh no. Okay. Okay.','scared');
 await say('driver','(hanging from his seatbelt, very calm) That’s my third this year. Replacement bus in twenty minutes. Nobody tell my supervisor about the raccoon.','sad');
 await N('The replacement bus comes in eighteen minutes. Everybody gets on. Nobody sits where the sophomore was sitting.');
}}
if(RE('alexClown')){RE('alexClown').run=async()=>{if(!onBus('dheva'))return;D.f.rideAC=1;
 if(!onBus('alex')){const sl=besideSlot(A.dheva.bslot);put('alex',sl.x,-1,{y:sl.y,pose:'sit'});A.alex.back=0;A.alex.bslot=sl}
 await N('Alex is sitting next to Dheva. There’s still a little white paint in his ears. Every time the bus goes over a bump, Alex flinches and says a number.');
 await say('dheva','(not looking away from him) I’m walking him to his door. Every day. His mom thinks it’s sweet. It’s not sweet. It’s a job.','sad');
 await say('alex','(very quietly, smiling at the window) …honk.','happy');
 await say('dheva','Don’t. Don’t do the honk, bro. Please.','sad');}}
if(RE('tobyBus')){RE('tobyBus').run=async()=>{if(!onBus('sean'))return;D.f.rideTo=1;
 const s=A.sean.bslot,sl=s?slotAt(Math.min(4,s.r+1),s.side,'a'):null;if(sl){put('toby',sl.x,-1,{y:sl.y,pose:'sit'});A.toby.back=0;A.toby.bslot=sl}
 await N('Toby from Ohio rides the 43 now. He leans over Sean and Stella’s seat and hands out friendship bracelets. Nobody asked. Everybody wears them.');
 await say('toby','(chin on the seat back) Sean. Your hair. Today. Ten out of ten. Stella. Eleven.','happy');}}
if(RE('raccoon'))RE('raccoon').run=async()=>{
 const r=pprop({t:'raccoon',x:300,y:30,dir:-1,layer:200});
 await N('A raccoon in the luggage rack. It takes a seventh grader’s sandwich, very politely, and gets off at the next stop.');
 await tw(r,{x:150,y:60},900);await tw(r,{x:-20,y:40},700);r.hide=1;
};

/* the hint: you’re on the bus */
if(ROOMS.busride)ROOMS.busride.name='The 43 (home)';
