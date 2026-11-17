'use strict';
/* =====================================================================
   HIGHSCHOOL — THE WINDOW SEAT
   Corey & Abby, Period 3 in the Trailer, across the odd days of the
   two weeks. Progress is kept between days (P.win), one step per odd day.
   ===================================================================== */
/* ---------------- THE TRAILER ----------------
   Odd days, Period 3: Ms. Shermian’s math class is in the portable
   classroom out by the field. You and Corey (and Abby) are in it.  */
/* Laid out from the real trailer: four tables along the back wall under the
   windows (Abby: left side of the third one, window behind her), the door in
   the back-right corner, two little tables on the left wall (Ms. Shermian’s),
   and four round tables in the middle. You and Corey: the round one, front left. */
const TR_WALL=[[33,78],[114,159],[166,224],[233,278]];        /* back-wall tables, x from-to */
const TR_ROUND=[[154,137],[250,139],[189,161],[86,163]];      /* round tables, centre x,y */
const TRSEATS=[
 {x:45,y:120,dir:1},{x:66,y:120,dir:-1},{x:125,y:120,dir:1},{x:148,y:120,dir:-1},
 {x:180,y:120,dir:-1,abby:1},                                  /* 4: Abby — left side of table 3 */
 {x:112,y:163,dir:1},{x:60,y:163,dir:1},                       /* 5: Corey, 6: you (front-left round table) */
 {x:128,y:137,dir:1},{x:180,y:137,dir:-1},{x:224,y:139,dir:1},{x:276,y:139,dir:-1},
 {x:163,y:161,dir:1},{x:215,y:161,dir:-1},{x:210,y:120,dir:-1},{x:245,y:120,dir:1},{x:266,y:120,dir:-1}
].map((s,i)=>Object.assign({i,row:s.y,pose:'sit'},s));
const TRSEAT=(row,i)=>{const s=TRSEATS[row==='back'?i:5+i]||TRSEATS[0];return{x:s.x,y:s.y}};
function roundTable(cx,cy){
 g.globalAlpha=.28;for(let dy=-3;dy<=3;dy++){const hw=Math.round(24*Math.sqrt(1-(dy/3.5)**2));R(cx-hw,cy+dy,hw*2,1,'#000')}g.globalAlpha=1;
 R(cx-2,cy-10,4,10,'#5a5e68');R(cx-1,cy-10,1,10,'#7a7e88');R(cx-8,cy-1,16,2,'#3a3e48');
 const ty=cy-17;
 for(let dy=-6;dy<=6;dy++){const hw=Math.round(24*Math.sqrt(1-(dy/6.5)**2));R(cx-hw,ty+dy,hw*2,1,dy<-3?'#e8dcc0':'#d8c8a8')}
 for(let dy=7;dy<=9;dy++){const hw=Math.round(24*Math.sqrt(Math.max(0,1-((dy-3)/6.5)**2)));R(cx-hw,ty+dy-1,hw*2,1,dy===9?'#7a6a52':'#a89070')}
 const k=(cx*3)%4;if(k===0){R(cx-10,ty-2,9,3,'#f4f0e6');R(cx-9,ty-1,6,1,'#9aa0b8')}else if(k===1){R(cx+6,ty-4,3,5,'#3a8ac8');R(cx+6,ty-4,3,1,'#c8c8d0')}else if(k===2){R(cx-8,ty-1,7,2,'#a03030')}else{R(cx-4,ty-2,8,3,'#3a5a3a');R(cx+6,ty,4,1,'#e8c040')}
}
function wallTable(x0,x1){const w=x1-x0;R(x0,114,w,2,'#e0d0b0');R(x0,116,w,3,'#b8a07a');R(x0,119,w,1,'#7a6a52');R(x0+1,120,2,7,'#5a5e68');R(x1-3,120,2,7,'#5a5e68');g.globalAlpha=.25;R(x0,127,w,2,'#000');g.globalAlpha=1}
ROOMS.trailer={name:'The Trailer — Ms. Shermian',music:'class',bg(){
 R(0,0,W,112,'#b08a5a');for(let i=0;i<W;i+=20){R(i,6,1,100,'#8a6a42');R(i+10,6,1,100,'rgba(255,255,255,.06)')}for(let i=0;i<40;i++)R(hsh(i+70)*W,10+hsh(i+71)*90,1,3+hsh(i+72)*5,'#9a7448');
 R(0,0,W,8,'#d8d4c8');for(let i=0;i<W;i+=24){R(i,0,1,8,'#b8b4a8')}R(0,8,W,1,'#8a8478');
 R(130,1,60,3,'#eef2f0');R(130,4,60,1,'#b8c0c4');if(Math.sin(T*9)>.85&&Math.sin(T*2.3)>0){g.globalAlpha=.1;R(100,6,120,60,'#000');g.globalAlpha=1}else{g.globalAlpha=.05;R(110,6,100,40,'#fff');g.globalAlpha=1}
 board(14,16,84,40,[['MATH','#c04070'],['TRAILER RULES:'],['1. NO WINDOWS','#c04070'],['2. LOVE MISS','#c04070']]);
 for(const [a,b] of TR_WALL.slice(1)){windowPane(a+2,52,b-a-4,40,{frame:'#e8e4dc'});R(a+2+(b-a-4)/2-1,52,2,40,'#e8e4dc');R(a+2,71,b-a-4,1,'#e8e4dc')}
 R(36,62,40,30,'#f4e8c8');R(40,66,32,16,'#d8a868');R(46,68,10,10,'#e8c8a0');R(48,66,2,2,'#d8a868');R(54,66,2,2,'#d8a868');pxc('MR BISCUITS',56,85,'#802040');
 R(286,14,30,92,'#8a8478');R(288,16,26,88,'#a8a498');R(290,20,22,30,'#c8dce8');R(290,20,22,1,'#fff');R(309,62,3,5,'#3a3a3a');R(286,104,30,2,'#5a5a52');
 R(240,18,26,14,'#d8d8d0');R(242,20,22,8,'#a8a8a0');for(let i=0;i<5;i++)R(243,21+i*1.5,20,1,'#888');const drip=(T*1.5)%1;R(258,33+drip*14,1,2,'#7ab0d0');
 R(0,106,W,6,'#6a4a2a');R(0,105,W,1,'#c8a878');
 R(0,112,W,68,'#5a6470');for(let i=0;i<220;i++)R(hsh(i+80)*W,112+hsh(i+81)*68,1,1,i%2?'#4a5460':'#6a7480');for(let y=112;y<180;y+=12)R(0,y,W,1,'rgba(0,0,0,.08)');
 g.globalAlpha=.18;R(288,112,28,30,'#fff8e0');g.globalAlpha=1;
 R(0,128,4,40,'#7a6a52');
},items:[
 ...TR_WALL.map(([a,b])=>({y:125,d:()=>wallTable(a,b)})),
 ...TR_ROUND.map(([cx,cy])=>({y:cy-2,d:()=>roundTable(cx,cy)})),
 {y:138,d:()=>{R(2,126,20,4,'#d8c8a8');R(2,130,20,4,'#a89070');R(4,134,2,6,'#5a5e68');R(18,134,2,6,'#5a5e68');R(4,123,8,3,'#f4f0e6');R(14,124,5,2,'#c04070')}},
 {y:158,d:()=>{R(2,146,20,4,'#d8c8a8');R(2,150,20,4,'#a89070');R(4,154,2,6,'#5a5e68');R(18,154,2,6,'#5a5e68');R(6,143,6,3,'#3a8ac8')}}
]};
if(typeof LIGHT!=='undefined')LIGHT.trailer={amb:.62,tint:[70,50,40],src:[[136,72,110,.38,[255,240,220]],[195,72,120,.42,[255,240,220]],[255,72,110,.36,[255,240,220]],[300,120,60,.2,[255,248,220]],[160,4,90,.14]],wallAO:1};
{const _sf=seatsFor;seatsFor=function(room){return room==='trailer'?TRSEATS.map(s=>Object.assign({},s)):_sf(room)}}
TEACHER_SPOT.trailer=[28,1,'hips',146];BOARD.trailer=[14,16,84,40];

/* move the class */
{CLASS[3].trailer=CLASS[3].maths.slice();const sc=CLASS[3].science,i=sc.indexOf('abby');if(i>=0)sc.splice(i,1);if(!CLASS[3].trailer.includes('abby'))CLASS[3].trailer.push('abby');delete CLASS[3].maths;
 const od=DAYSET.odd[3];od.locs=od.locs.map(r=>r==='maths'?'trailer':r);{const t=Object.assign({},od.teach);if(t.maths){t.trailer=t.maths;delete t.maths}od.teach=t}od.cls=Object.assign({},CLASS[3]);
 if(od.roster&&od.roster.maths){od.roster=Object.assign({},od.roster,{trailer:od.roster.maths});delete od.roster.maths}
 ROSTER[3].trailer=[['shermian',40,1,'hips',148]];delete ROSTER[3].maths;
 for(const h of HOOKS)if(h.room==='maths'&&(h.period===3||(Array.isArray(h.period)&&h.period.includes(3)))&&h.day!=='even')h.room='trailer';
 MYCLASS.odd[3]=(window.EDITION==='safe')?'english':'trailer';}
{const _sc=scene;scene=function(room,cast,fresh){if(room==='maths'&&D&&D.period===3&&(D.dayType||'odd')==='odd')room='trailer';return _sc(room,cast,fresh)}}
{const _ci=classIn;classIn=function(room,o){if(room==='maths'&&D&&D.period===3&&(D.dayType||'odd')==='odd')room='trailer';return _ci(room,o)}}
Object.assign(INTEL,{abbyBird:'Abby draws a little bird on the Trailer window in Period 3. Every time. Then rubs it out.'});
const winStage=()=>(P.win&&P.win.stage)||0;
function winSet(n){P.win=P.win||{};P.win.stage=Math.max(winStage(),n);P.win.looks=(P.win.looks||0)+1;save()}

/* Abby, as she is in The Calling of Aidan: long black hair, dark clothes,
   headphones (one blue cup, one purple), purple eyeliner */
{const dh=drawHead;drawHead=function(k,x,hy,d,o){dh(k,x,hy,d,o);if(o&&o.crushed)return;
 if(k.liner&&o.ex!=='dead'&&!o.deadFace){const ey=hy+5,ex=x+d;R(ex-5,ey-1,3,1,'#8a3fe0');R(ex+2,ey-1,3,1,'#8a3fe0')}
 if(k.phones){R(x-6,hy-2,12,1,'#7a35c9');R(x-7,hy-1,1,3,'#7a35c9');R(x+6,hy-1,1,3,'#7a35c9');R(x-8,hy+3,2,6,'#2b4fd6');R(x-8,hy+3,2,1,'#5a7ae8');R(x+6,hy+3,2,6,'#7a35c9');R(x+6,hy+3,2,1,'#a06ae8')}}}
/* the drawing on the glass */
{const _dp=drawProp;drawProp=function(p){
 if(p.t==='glassbird'){const x=Math.round(p.x),y=Math.round(p.y),n=p.n||1;
  g.globalAlpha=(p.a==null?1:p.a)*.55;for(let i=0;i<n;i++){const ox=x+i*15;R(ox-6,y-4,14,10,'#f4f8fa')}g.globalAlpha=(p.a==null?1:p.a);
  const col=p.blood?'#a01020':'#6a8ca8';
  for(let i=0;i<n;i++){const ox=x+i*15+(i===1?0:0),fl=i===1?-1:1;R(ox-3,y,3,1,col);R(ox,y-1,1,1,col);R(ox+1,y,3,1,col);R(ox+(fl>0?4:-5),y-1,1,1,col);R(ox-1,y+1,2,1,col)}
  if(p.heart){R(x+5,y-3,1,1,'#c04070');R(x+7,y-3,1,1,'#c04070');R(x+5,y-2,3,1,'#c04070');R(x+6,y-1,1,1,'#c04070')}
  g.globalAlpha=1;return}
 if(p.t==='crane'){const x=Math.round(p.x),y=Math.round(p.y);R(x-3,y,7,1,'#f4f0e6');R(x-1,y-2,3,2,'#f4f0e6');R(x+3,y-2,1,2,'#e8e0d0');R(x-4,y-1,1,1,'#e8e0d0');return}
 return _dp(p)}}
/* once they’re together, the two birds are always on the glass */
{const mb=ROOMS.trailer.bg;ROOMS.trailer.bg=function(){mb();if(P&&P.done&&P.done.window&&!(typeof EDITION!=='undefined'&&window.EDITION==='safe')){drawProp({t:'glassbird',x:182,y:66,n:2,heart:1,a:.8})}}}

mission('window',{name:'The Window Seat',icon:'🐦',who:['corey','abby','shermian'],
 blurb:'Period 3 is in the Trailer. Abby sits by the window. Corey sits across the room, looking at her. He has looked at her every day since seventh grade. Every odd day you’re there, he gets one more look.',
 parts:['Odd day one: one second','Odd day two: the other bird','Odd day three: the notes','Odd day four: the window','The 43, home time: until…'],
 tips:['Odd day, Period 3, the Trailer. Watch the window.','The next odd day, Period 3, the Trailer. You know about the bird now. Corey needs to answer it.','The next odd day, Period 3, the Trailer. The notes. Keep Arjun’s hands off them.','The next odd day, Period 3, the Trailer. Ms. Shermian has noticed. She has a new seating plan.','Same day, home time, the 43. Back seat.'],
 variants:{kiss:'Two birds',hands:'Holding hands'}});
DEATHS.windowsill={name:'Sill',desc:'Ms. Shermian closed the window. You were in it.',hint:'The Window Seat. Don’t fight Ms. Shermian with your bare hands.'};

const only=(kids,f)=>Object.fromEntries(Object.entries(f).filter(([k])=>kids.includes(k)));
const winAvail=()=>D&&(D.dayType||'odd')==='odd'&&!D.f.winToday&&!D.dead.corey&&!D.dead.abby&&!D.dead.shermian&&winStage()<4&&!D.f.seatPick;
async function winClass(){
 const kids=['corey','arjun','alex','dheva','marcus','tyler','abby'].filter(n=>!D.dead[n]);
 const c=await classIn('trailer',{kids,fixed:only(kids,{abby:4,corey:5,arjun:7,tyler:1,alex:0,dheva:9,marcus:3}),you:6});
 face('corey',1);face('abby',-1);cue('class');
 return c;
}
async function glance(secs,line){
 face('corey',1);A.corey.ex='blush';face('abby',-1);
 if(secs>0){A.abby.ex='blush';await wait(200)}
 await N(line);
 if(A.corey)A.corey.ex=null;if(A.abby)A.abby.ex=null;
}
async function drawBird(n,o){
 const a=A.abby;pose('abby','reach');SFX.whoosh();
 const b=pprop(Object.assign({t:'glassbird',x:189-(n>1?7:0),y:66,n,a:0,layer:-300},o||{}));
 await tw(b,{a:1},600);pose('abby','sit');return b;
}

/* ---------------- FRIDAY ONE ---------------- */
hook({mis:'window',period:3,room:'trailer',who:'auto',cond:()=>winAvail()&&winStage()===0,run:async()=>{
 const c=await winClass();
 await N('Period 3. The Trailer. The AC unit is dripping into a bucket. The whole room wobbles when anyone walks. Ms. Shermian is writing on the board in her loopy, frightening handwriting.');
 await N('Abby sits at the back, by the window. Corey sits at the front, on the other side of the room. To look at her, he has to turn all the way round in his chair. He does. Constantly.');
 const b=await drawBird(1);
 await N('Abby breathes on the window. With one finger, she draws a little bird in the fog. She looks at it for a second. Then she rubs it out with her sleeve, before anyone can see.');
 await say('corey','(whispering, to you, not looking away from her) She does that every day. The bird. Since seventh grade. Every single day. She never draws anything else.','blush');
 intel('abbyBird');b.hide=1;
 await glance(1,'Abby turns round. Just for a second. Their eyes meet across the room, over twenty-six desks and Tyler.');
 SFX.thud();shake(.4);A.corey.pose='lie';
 await N('Corey turns back so fast that he falls off his chair.');
 await evil('shermian');
 await say('shermian','Corey, sweetie. Is the back of Abby’s head on the syllabus?','evil');
 await say('corey','(from the floor) No, Miss.','scared');
 A.corey.pose='sit';
 await Promise.all([walk('shermian',A.corey.x-16,60),tw(A.shermian,{y:150},400)]);face('shermian',1);
 await say('shermian','Eyes are for the board. Next time, Miss takes them out and puts them ON the board. Then they can look at it all day.','evil');
 SFX.crunch();await N('She picks up his pencil and snaps it, slowly, an inch from his face. Then she goes back to the board humming.');
 await Promise.all([walk('shermian',28,60),tw(A.shermian,{y:146},400)]);A.shermian.pose='hips';face('shermian',1);await sweet('shermian');
 if(A.arjun)await say('arjun','(whispering) Bro’s been in love with a window for three years.','smirk');
 await say('corey','(whispering) …One second. She looked at me for one second.','happy');
 await N('He spends the rest of the lesson writing “one second” in the margin of his textbook, over and over, very small. The trailer wobbles every time he dots an i.');
 await classOut(c);
 D.f.winToday=1;winSet(1);part('window',1);
}});

/* ---------------- FRIDAY TWO ---------------- */
hook({mis:'window',period:3,room:'trailer',who:'auto',cond:()=>winAvail()&&winStage()===1,run:async()=>{
 const c=await winClass();
 await N('Period 3. The Trailer again. You know what Abby is about to do now. Corey is already turned round in his chair, waiting for it.');
 const b=await drawBird(1);
 await N('There it is. She breathes on the glass. The little bird.');
 await say('you','(whispering) Corey. Draw one back.');
 await say('corey','(whispering) Draw WHAT back? On WHAT? I’m nowhere near a window. I’m near Tyler.','scared');
 const ch=await choose(['“Fold her a bird. Out of paper. Pass it back.”','“Breathe on Tyler’s glasses and draw it on those.”']);
 if(ch===1&&A.tyler){
  await N('Corey leans over, breathes on Tyler’s glasses, and draws a tiny bird on the left lens with his pinky.');
  await say('tyler','(not moving, terrified) I can’t see anything. I can’t see the board. If she asks me a question I’m dead.','scared');
 }
 pose('corey','write');await wait(400);pose('corey','sit');
 await N('Corey tears a page out of the back of his textbook and folds it into a paper bird, under the desk, with shaking hands. It takes him four tries. The fourth one is beautiful.');
 const cr=pprop({t:'crane',x:A.corey.x,y:A.corey.y-22,layer:20});
 const path=['dheva','marcus','alex','abby'].filter(n=>A[n]);
 for(const n of path){await tw(cr,{x:A[n].x,y:A[n].y-22},420);if(n==='dheva')await say('dheva','(passing it on) Cute. Disgusting. Cute.','smirk');if(n==='marcus')await say('marcus','(passing it on, holding it like a live grenade) For the record, I respect this.','smirk')}
 if(A.arjun&&!A.arjun.dead){await say('arjun','(reaching for it) Ooh, what’s THIS—','smirk');await say('dheva','(slapping his hand away) Touch it and I’ll pepper-spray your eyebrows off.','angry')}
 cr.hide=1;hold('abby','note');
 await N('Abby unfolds it. There’s nothing written inside. Corey panicked and wrote nothing. Just the bird.');
 hold('abby',null);
 b.hide=1;const b2=await drawBird(2);
 await N('She breathes on the window again. Next to her bird, she draws a second one. Facing the first one.');
 await glance(3,'Then she turns round and looks at him. Three seconds. Corey counts them out loud under his breath. “One. Two. Three.”');
 await evil('shermian');
 await say('shermian','(not turning round from the board) Somebody’s passing notes. Miss can HEAR paper.','evil');
 await walk('shermian',A.abby.x-12,70);
 await N('She walks to the back, picks up the paper bird from Abby’s desk, and holds it up so the whole class can see. Then she puts it in her mouth. She chews it. She keeps eye contact with Corey the whole time. She swallows.');
 await say('shermian','Mmm. Paper. Paper is love, sweeties.','happy');
 await walk('shermian',28,70);A.shermian.pose='hips';face('shermian',1);await sweet('shermian');
 b2.hide=1;
 await say('corey','(whispering, white) Two birds. She drew two birds.','blush');
 await classOut(c);
 D.f.winToday=1;winSet(2);part('window',2);
}});

/* ---------------- FRIDAY THREE ---------------- */
hook({mis:'window',period:3,room:'trailer',who:'auto',cond:()=>winAvail()&&winStage()===2,run:async()=>{
 const c=await winClass();
 await N('Period 3. The Trailer. This time, Abby moves first. Before Corey even turns round, a folded note lands on his desk. It flew the whole way across the room.');
 await say('corey','(unfolding it with two fingers like it might explode) It says: “do you ever feel like today already happened?”','shock');
 await say('corey','What do I say? What do I SAY?','scared');
 const ch=await choose(['“Say yes. Say the true thing.”','“Say ‘lol what’.”']);
 const reply=ch===0?'every day. its always the same day. except for when you look over here':'lol what';
 if(ch===1){await say('corey','(writing, then stopping, then crossing it out) No. No. I’m not saying lol what. I’ve been saying lol what for three years.','angry')}
 pose('corey','write');await wait(500);pose('corey','sit');
 await N('He writes: “every day. it’s always the same day. except for when you look over here.” He folds it into a plane.');
 if(A.arjun){
  const pl=pprop({t:'plane',x:A.corey.x,y:A.corey.y-24,layer:20});await tw(pl,{x:A.arjun.x,y:A.arjun.y-24},400);pl.hide=1;hold('arjun','note');
  await say('arjun','(standing on his chair) INTERCEPTION! “Every day, it’s always the same day, except for when you look over here.” OHHHH. COREY. DEEP. Bro’s a POET—','laugh');
  classLaugh(1200);
  const s=await choose(['Grab the note off him.','Let it happen.']);
  if(s===0){
   await walk('you',A.arjun.x-10,90);pose('you','grab');hold('arjun',null);hold('you','note');
   await say('you','Sit down, Arjun.');
   await say('arjun','(sitting down, surprised) …Okay. Okay. Jeez. It was a good note. I was being supportive. In my way.','angry');
   pose('you',null);hold('you',null);await walk('you',A.corey.x+40,90);
  }else{
   await N('Corey goes red from his neck up, like a thermometer. He stares at his desk. He wants to die. You can see him wanting to die.');
  }
 }
 await N('The note gets to Abby anyway. Everyone in the room has heard it now. She reads it anyway, like nobody else is there.');
 await drawBird(2,{heart:1});
 await N('She draws the two birds again. And a very small heart between them. Then she turns all the way round in her chair, puts her chin on the back of it, and just looks at him.');
 await glance(10,'Ten seconds. The whole class goes quiet and watches. Even Arjun. Ten whole seconds, which is a really long time to look at somebody.');
 await evil('shermian');
 await say('shermian','Ten seconds, Abby. Miss counted. Miss counts EVERYTHING.','evil');
 await say('shermian','(very sweetly, to the room) New seating plan next time, sweeties. Windows are for people who don’t love Miss.','happy');
 await N('Abby’s head snaps round to look at her. Corey goes pale. Next time is two days away.');
 await sweet('shermian');
 await classOut(c);
 D.f.winToday=1;winSet(3);part('window',3);
}});

/* ---------------- FRIDAY FOUR ---------------- */
hook({mis:'window',period:3,room:'trailer',who:'auto',cond:()=>winAvail()&&winStage()===3,run:async()=>{
 const kids=['corey','arjun','alex','dheva','marcus','tyler','abby'].filter(n=>!D.dead[n]);
 const c=await classIn('trailer',{kids,fixed:only(kids,{corey:4,abby:5,arjun:7,tyler:1,alex:0,dheva:9,marcus:3}),you:6});
 cue('tension');
 await N('Period 3. The Trailer. Everything is wrong. The desks have moved. Corey is by the window now. Abby is at the front, right next to Ms. Shermian’s desk, where she can touch her.');
 put('shermian',A.abby.x-14,1,{y:A.abby.y-2,pose:'hips'});A.shermian.x=A.abby.x-14;
 await say('shermian','(one hand on Abby’s shoulder) Abby’s Miss’s now. Isn’t that lovely? Abby doesn’t need a window. Abby’s got Miss.','happy');
 face('corey',-1);
 await N('Corey sits by the window, where she always sits. There’s already something on the glass. Two birds and a tiny heart, faded, from last time. Nobody wiped them off. Nobody ever cleans the Trailer.');
 pprop({t:'glassbird',x:182,y:66,n:2,heart:1,a:.5,layer:-300});
 await say('corey','(whispering) They’re still here. She never rubbed them out. She always rubs them out.','shock');
 pose('corey','reach');await wait(300);
 const b3=pprop({t:'glassbird',x:213,y:80,n:1,a:1,layer:-300});pose('corey','sit');
 await N('He breathes on the glass and draws a third bird. Flying towards the other two.');
 await evil('shermian');
 await Promise.all([walk('shermian',A.corey.x+12,90),tw(A.shermian,{y:A.corey.y},300)]);face('shermian',-1);
 await say('shermian','Miss said. No. WINDOWS.','evil');
 pose('shermian','slam');SFX.glass();SFX.crunch();shake(1.6);flash('#a00010',.5);
 for(let i=0;i<3;i++){SFX.squelch();blood(A.corey.x+6,A.corey.y-22,24,1,90,A.corey.y+2);await wait(240)}
 A.corey.hurt=3;A.corey.pose='hurt';b3.blood=1;
 await N('She grabs his hand, puts it on the windowsill, and brings the window down on it. Twice. The third bird on the glass is red now.');
 SFX.scream();
 await say('abby','(standing up, knocking her chair over) LEAVE HIM ALONE!','yell');
 for(const k of['dheva','marcus','alex','tyler','arjun'])if(A[k]){A[k].pose=null;A[k].ex='shock'}
 await N('Nobody has ever shouted at Ms. Shermian. The room goes completely silent. Then everything happens at once. Marcus flips his desk for no reason. Tyler starts crying. Dheva sprays something. Arjun films it.');
 const ch=await choose([{t:'Throw the window open. Get them out.',tag:'run'},{t:'Grab her arm. Fight her.',tag:'🩸'},{t:'Stay in your seat.'}],'She’s still holding his hand on the sill.');
 if(ch===1){
  await walk('you',A.shermian.x-10,110);pose('you','grab');
  await N('You grab her arm. It’s like grabbing a fence post. She doesn’t even look at you. She just moves the window from his hand to your neck.');
  SFX.crunch();shake(1.6);blood(A.you.x,A.you.y-26,40,null,90,A.you.y+2);
  await die('windowsill');return;
 }
 if(ch===2){
  await N('You stay in your seat. Everyone does. After a while, Ms. Shermian lets go of his hand, wipes the window with her cardigan sleeve, and carries on with the lesson.');
  await N('Corey sits by the window for the rest of Period 3 holding his hand in his lap. Abby doesn’t turn round once. She doesn’t draw anything. It’s the first time in three years she hasn’t drawn the bird.');
  await sweet('shermian');
  await classOut(c);D.f.winToday=1;return;
 }
 await walk('you',A.corey.x-12,120);SFX.door();
 const ok=await mash('Hold the window open!',{need:22,time:5,info:'She’s pushing it down. MASH!'});
 if(!ok){
  await N('She’s stronger than you. She’s always been stronger than everyone. The window comes down, and she holds it there, smiling, until the bell.');
  await sweet('shermian');await classOut(c);D.f.winToday=1;return;
 }
 await N('You get it open. You get it all the way open and you put your whole back against it. Abby’s across the room in four steps. She grabs Corey’s good hand.');
 await say('abby','(to Corey) Come on.','yell');
 A.corey.pose=null;A.abby.pose=null;
 await Promise.all([walk('abby',334,120),walk('corey',334,120)]);
 await say('shermian','(very quietly, watching them go) …Monday, sweeties. Miss will see them Monday.','evil');
 await N('Through the window you watch them run across the field together, hand in hand. Coach throws a javelin at them out of habit. It misses by a lot. They don’t even notice. They are laughing.');
 await N('Abby shouts something at him as they run. You only catch the end of it. “—the 43! The back seat! Don’t you DARE give it away!”');
 await sweet('shermian');
 D.f.winToday=1;D.f.win4=1;winSet(4);part('window',4);
}});

/* ---------------- UNTIL… ---------------- */
hook({mis:'window',period:7,room:'bus',who:'abby',label:'Get on the 43 behind Abby and Corey',look:{ex:'blush'},cond:()=>D.f.win4&&!D.dead.corey&&!D.dead.abby,run:async()=>{
 scene('bus',{abby:[184,-1,{y:146}],corey:[166,1,{y:150,hurt:2}],you:[140,1,{y:154}]});
 cue('romance');
 await N('Home time. The 43. Corey gets on first and goes straight to the back seat. The good one, the one by the window. He sits in it like he’s guarding it. Abby sits down next to him.');
 await N('His hand is wrapped up in a whole roll of tissue from the nurse. There’s still some blood coming through. Abby holds the other one.');
 await say('abby','(quietly) Four hundred and twelve.','blush');
 await say('corey','Four hundred and twelve what?','blush');
 await say('abby','Times you’ve looked at me. Since seventh grade. I counted. I’ve got them in my notes app. There’s a graph.','blush');
 await say('corey','(laughing, dying) There’s a GRAPH?','happy');
 await say('abby','I moved here in seventh grade. Middle of the year. Nobody talks to the new girl in the middle of the year. I started drawing the bird on the window so there’d be one thing in that trailer that was mine.','sad');
 await say('abby','Nobody ever drew one back. For three years. Then you did.','cry');
 await N('Corey doesn’t say anything clever. He doesn’t try to. He just squeezes her hand so hard it probably hurts his broken one.');
 SFX.door();
 put('reilly',-14,1,{y:150});
 await walk('reilly',120,40);
 await N('At the hospital stop, an old woman gets on with two bags of shopping and nowhere to sit. Mrs. Reilly. She gets on at this stop every day. Corey always gives her his seat.');
 await say('corey','(looking at Abby, then at Mrs. Reilly, then at Abby) …I’m sorry. I have to. I always—','sad');
 await say('abby','(smiling, already standing up) I know. That’s why.','happy');
 await walk('corey',196,40);await walk('abby',212,40);put('reilly',A.reilly.x,1,{y:150});await walk('reilly',176,30);A.reilly.pose='sit';
 await say('reilly','(sitting down, to both of them) About time, you two. Three years I’ve been watching this.','happy');
 face('corey',1);face('abby',-1);
 const c=await choose(['Tell them you remember too.','Say nothing. Let them have it.']);
 if(c===0){
  await say('you','(quietly) I saw. Every time. The bird, the notes, all of it. You two are the best thing that happens in that trailer.');
  await say('abby','(laughing, wiping her eyes) That trailer is the worst place on earth.','cry');
  await say('corey','That trailer is the best place on earth.','blush');
 }
 if(!D.dead.nivaan){put('nivaan',300,-1,{y:150,pose:'film'});await say('nivaan','(from the back, filming) Chat, I’m not crying. YOU’RE crying. Somebody clip this. Nobody clip this.','cry')}
 const k=await choose(['Kiss her.','Just hold her hand. It’s enough.'],'Corey. It’s your call.');
 if(k===0){
  pose('corey','kiss');pose('abby','kiss');SFX.kiss();fxState.romance=1;prop({t:'heart',x:204,y:110});
  await N('The bus goes over the speed bump by the roundabout and they kiss anyway, badly, and then properly. Somebody at the front whoops. The driver honks the horn twice, which he has never done for anything.');
 }else{
  await N('He holds her hand. Their knuckles are white because the bus is swerving and they’re both standing. Neither of them lets go. At the roundabout, she leans her head on his shoulder.');
 }
 await say('abby','(quietly) Monday. Period 3. Ms. Shermian’s going to kill us.','blush');
 await say('corey','Then I’ll look at you first. Before the bell. Before anything. Before she kills us.','blush');
 await N('Outside the window the sun is going down orange over Fair City. On the glass, in the fog, somebody has drawn two little birds.');
 pose('corey',null);pose('abby',null);fxState.romance=0;
 await complete('window',k===0?'kiss':'hands');
 return 'stay';
}});
K.reilly=K.reilly||{n:'Mrs. Reilly',col:'#8a7aa8',skin:'#e8c8b0',hair:'#d8d8e0',hs:'perm',top:'#7a6a9a',pants:'#4a4a5a',skirt:1,adult:1,girl:1,old:1,seed:71,v:300};K.reilly.id='reilly';

/* if Seat Wars is waiting too, you choose which Period 3 this is */
{const _er=enterRoom;enterRoom=async function(room){
 if(!TEST&&room==='trailer'&&D.period===3&&winAvail()&&winStage()<4&&!P.done.seat&&!D.f.seat1){
  const c=await choose(['Sit across from Corey (The Window Seat).','Line up along the back wall (Seat Wars).'],'Period 3, the Trailer.');
  if(c===1)D.f.seatPick=1;
 }
 return _er(room);
}}
/* the window hooks go first in line */
{const mine=HOOKS.filter(h=>h.mis==='window'&&h.who==='auto');for(const h of mine)HOOKS.splice(HOOKS.indexOf(h),1);HOOKS.unshift(...mine)}
