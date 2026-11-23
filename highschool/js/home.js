'use strict';
/* =====================================================================
   HIGHSCHOOL — HOME
   Every school day starts at home now. You wake up in your bedroom.
   Walk right into the kitchen. Mom’s there (Dad on even days, with the
   paper). The TV’s on. Your cat is on your bed.
   • Pack your bag from the shelf: take up to two things to school
     (energy drink, compass, duct tape, padlock, first-aid kit). Metal
     things set off the detector in week two.
   • Take the lunch Mom made: +2 🍎 at lunch.
   • Swipe $3 from her purse. She might notice.
   • The news, the window, the cat.
   Walk out of the front door (right side of the kitchen) to catch the 43.
   ===================================================================== */
Object.assign(K,{
 mom:{n:'Mom',col:'#a86a7a',skin:'#e8c4a4',hair:'#5a3a2a',hs:'bun',top:'#c87a8a',pants:'#3a3a54',adult:1,girl:1,seed:71,v:400,vw:'triangle'},
 dad:{n:'Dad',col:'#6a7a5a',skin:'#e0b898',hair:'#4a3a2a',hs:'short',top:'#5a6a7a',pants:'#2a2a33',adult:1,beard:1,glasses:1,seed:72,v:150}
});K.mom.id='mom';K.dad.id='dad';
Object.assign(ITEMS,{lunch:'Packed lunch (from Mom)',compass:ITEMS.compass||'A math compass (pointy)',firstaid:ITEMS.firstaid||'A first-aid kit'});
FLOOR.bedroom=[128,166];FLOOR.kitchen=[130,166];

/* ---------------- the bedroom ---------------- */
ROOMS.bedroom={name:'Your Bedroom',music:'title',bg(){
 guCache('bedroom','',()=>{
  /* wall: navy, faded stripes, a water stain in the corner */
  R(0,0,W,112,'#3a4666');for(let x=0;x<W;x+=10)R(x,0,4,112,'#3e4a6c');R(0,0,W,4,'rgba(0,0,0,.25)');
  g.globalAlpha=.18;R(4,6,30,18,'#8a7a5a');R(10,22,16,8,'#8a7a5a');g.globalAlpha=1;
  R(0,104,W,8,'#2a3048');R(0,104,W,1,'#5a6688');
  /* window + curtains (sky drawn live) */
  R(206,20,62,52,'#e8e4dc');R(268,20,2,52,'#b8b4ac');
  /* posters */
  R(110,18,34,44,'#1a1a1a');R(112,20,30,40,'#c83a3a');pxc('DEAD',127,26,'#f4ead8');pxc('MALL',127,33,'#f4ead8');R(118,42,18,14,'#1a1a1a');R(122,45,10,8,'#f4ead8');R(124,47,2,2,'#1a1a1a');R(128,47,2,2,'#1a1a1a');
  R(150,22,40,14,'#2a5a3a');R(150,22,40,1,'#4a8a5a');pxc('HAWKS',168,26,'#f0d070');R(190,22,6,7,'#2a5a3a');
  R(152,42,30,30,'#f4f0e6');for(let r=0;r<4;r++)for(let c=0;c<5;c++)R(155+c*5,49+r*5,4,4,'#e8e2d6');R(152,42,30,5,'#c83a3a');pxc('NOV',167,42,'#fff');
  /* desk, laptop, lamp, chair */
  R(14,84,82,4,'#7a5a3a');R(14,88,82,20,'#6a4a2e');R(16,88,1,20,'#8a6a48');R(54,92,20,2,'#5a3e26');R(62,96,4,1,'#c8a870');
  R(30,70,30,14,'#2a2a30');R(32,72,26,10,'#1a1a24');R(28,84,34,2,'#4a4a52');
  R(80,58,2,26,'#3a3a3a');R(74,54,14,5,'#d8b048');R(76,59,10,1,'#f0d070');
  R(66,80,8,4,'#e8e2d6');R(67,78,6,2,'#c86a3a');R(18,80,10,4,'#f4f0e6');R(20,78,8,2,'#f4f0e6');
  R(24,100,20,6,'#2a3a6a');R(26,92,16,9,'#3a4a8a');R(26,92,16,1,'#5a6aaa');
  /* the shelf: what you can take */
  R(14,38,82,3,'#7a5a3a');R(14,41,82,1,'#4a3a2a');
  R(18,30,6,8,'#2a7a3a');R(19,29,4,1,'#c8c8c8');R(20,32,2,3,'#f0f070');      /* energy */
  R(30,34,10,4,'#a8a8a8');R(34,26,2,8,'#c8c8c8');R(33,25,4,2,'#888');           /* compass */
  R(46,32,9,6,'#8a8a92');R(48,34,5,2,'#5a5a62');                                 /* tape */
  R(60,31,6,5,'#c8b040');R(61,28,4,3,'#888');                                   /* padlock */
  R(72,30,14,8,'#f4f0e6');R(78,31,2,6,'#c83a3a');R(75,33,8,2,'#c83a3a');         /* first aid */
  /* closet, half open, clothes falling out */
  R(98,40,6,72,'#5a4a3a');R(104,46,40,66,'#7a6a52');R(106,48,36,62,'#6a5a44');R(104,46,40,2,'#8a7a62');R(140,76,2,4,'#c8b878');
  R(92,104,30,6,'#c83a3a');R(110,106,18,5,'#3a5a8a');R(96,101,10,4,'#e8e2d6');
  /* bed */
  R(214,96,100,16,'#6a4a2e');R(214,92,100,4,'#8a6a48');R(304,70,10,42,'#6a4a2e');R(302,68,14,4,'#8a6a48');
  R(218,84,84,10,'#e8e2d6');R(220,80,86,8,'#5a6aaa');for(let i=0;i<86;i+=6)R(220+i,82,3,2,'#7a8acc');R(282,74,20,8,'#f4f0e6');
  /* nightstand + clock */
  R(186,96,22,16,'#7a5a3a');R(186,96,22,2,'#9a7a5a');R(190,102,14,1,'#5a3e26');R(190,86,16,10,'#1a1a1a');
  /* floor: boards, a rug, socks */
  for(let y=112;y<180;y+=6){R(0,y,W,6,y%12?'#6a4e36':'#644832');for(let x=(y*7)%40;x<W;x+=40)R(x,y,1,6,'#4a3624')}
  R(120,140,120,24,'#5a3a5a');R(122,142,116,20,'#6a4a6a');for(let i=0;i<5;i++)R(130+i*22,146,12,12,'rgba(255,220,240,.08)');
  R(60,150,6,3,'#f4f0e6');R(250,162,6,3,'#2a2a2a');
 });
 /* live: sky, clouds, a bird, the light */
 const p=Math.min(1,Math.max(0,(T%600)/600));
 R(208,22,58,48,'#f0c89a');R(208,22,58,20,'#e8a888');R(208,42,58,14,'#f4d8b0');
 for(let i=0;i<3;i++){const x=208+((T*3+i*26)%70)-10;R(Math.max(208,x),28+i*9,Math.min(16,266-Math.max(208,x)),3,'rgba(255,255,255,.75)')}
 R(208,60,58,10,'#4a5a4a');for(let i=0;i<6;i++)R(210+i*10,56-(i%3)*2,8,6,'#3a4a3a');
 {const bx=208+((T*9)%80);if(bx<264){const f=Math.sin(T*12)>0;R(bx,34,2,1,'#2a2a2a');R(bx-1,33+(f?0:2),1,1,'#2a2a2a');R(bx+2,33+(f?0:2),1,1,'#2a2a2a')}}
 R(236,20,2,52,'#e8e4dc');R(206,45,62,2,'#e8e4dc');
 const sway=Math.sin(T*.8)*1.5;R(198+sway,16,12,62,'#8a3a4a');R(266-sway,16,12,62,'#8a3a4a');R(198+sway,16,12,2,'#aa5a6a');R(266-sway,16,12,2,'#aa5a6a');
 g.globalAlpha=.08;for(let i=0;i<30;i++){const y=72+i*2;R(200-i*1.6,y,70+i,2,'#ffe8c0')}g.globalAlpha=1;
 for(let i=0;i<10;i++){const q=(T*.07+i*.1)%1;R(200+hsh(i)*60-q*30,74+q*40+Math.sin(T+i)*2,1,1,'rgba(255,240,210,.6)')}
 /* laptop glow, clock blink */
 const fl=.7+Math.sin(T*7)*.08;g.globalAlpha=fl;R(32,72,26,10,'#3a6ab0');R(34,74,14,1,'#c8e0ff');R(34,77,20,1,'#8ab0e0');R(34,79,10,1,'#8ab0e0');g.globalAlpha=1;
 g.globalAlpha=.07;R(20,60,50,40,'#6a9ae0');g.globalAlpha=1;
 if(Math.sin(T*3)>-.2)pxc('7:15',198,88,'#ff4a3a');
 /* the cat: a lump that breathes, a tail that flicks */
 {const br=Math.sin(T*1.6)>0?1:0;R(248,76-br,18,7+br,'#e8a050');R(262,73-br,6,6,'#e8a050');R(262,72-br,1,1,'#e8a050');R(266,72-br,1,1,'#e8a050');R(263,75-br,1,1,'#2a2a2a');R(266,75-br,1,1,'#2a2a2a');
  const tf=Math.sin(T*2.2)*2;R(244,79+tf,5,2,'#e8a050');R(252,79-br,8,2,'#c8803a')}
}};
LIGHT.bedroom=()=>({amb:.82,tint:[60,40,70],src:[[236,60,90,.35,[255,220,170]],[45,78,40,.2,[120,160,255]]]});

/* ---------------- the kitchen ---------------- */
const NEWS=()=>{const L=['TYLER MORRISON STILL MISSING · DAY '+(cal()+3),'STATE INSPECTORS VISIT HIGHGATE HIGH NEXT WEEK','RACCOONS: “AN INFESTATION OF CONFIDENCE”','LOCAL BUS 43 VOTED “MOST HAUNTED ROUTE”','WEATHER: GREY. THEN GREYER.'];
 if(D&&D.f&&D.f.brettDead)L.unshift('HIGHGATE JUNIOR BRETT KOWALSKI MISSING');if(D&&D.done&&D.done.kim)L.unshift('MATH TEACHER WANTED FOR QUESTIONING');if(cal()>=8)L.unshift('METAL DETECTORS INSTALLED AT HIGHGATE');return L.join('   ·   ')};
ROOMS.kitchen={name:'Kitchen',music:'title',bg(){
 guCache('kitchen','',()=>{
  R(0,0,W,112,'#e8d8a8');for(let y=60;y<106;y+=6)for(let x=(y%12?0:6);x<160;x+=12)R(x,y,11,5,y%12?'#f4ecd8':'#efe4c8');
  R(0,0,W,4,'rgba(0,0,0,.18)');R(0,104,W,8,'#a88a5a');R(0,104,W,1,'#c8aa7a');
  /* upper cabinets */
  for(let i=0;i<4;i++){R(8+i*36,12,34,34,'#8a5a3a');R(10+i*36,14,30,30,'#9a6a48');R(36+i*36,28,2,4,'#e8c870')}
  /* counter, sink, toaster, coffee maker */
  R(4,84,156,6,'#d8d4c8');R(4,90,156,18,'#7a4a32');for(let i=0;i<4;i++){R(10+i*38,92,32,14,'#8a5a3e');R(25+i*38,96,2,4,'#e8c870')}
  R(50,80,30,5,'#b8bcc4');R(54,81,22,3,'#8a8e98');R(64,70,2,10,'#c8ccd4');R(64,70,8,2,'#c8ccd4');
  R(100,72,18,12,'#c8ccd4');R(102,72,14,2,'#e8ecf0');R(103,70,4,2,'#2a2a2a');R(110,70,4,2,'#2a2a2a');
  R(130,66,16,18,'#2a2a2a');R(132,76,12,8,'#5a3a2a');R(133,77,10,1,'#8a5a3a');
  R(20,74,10,10,'#f4f0e6');R(22,72,6,2,'#c86a3a');R(36,78,10,6,'#f0d070');
  /* window over the sink */
  R(44,50,44,26,'#e8e4dc');R(46,52,40,22,'#9ac8e8');R(46,64,40,10,'#7aa87a');R(65,52,2,22,'#e8e4dc');
  /* fridge */
  R(166,24,38,88,'#e8e8e4');R(168,26,34,30,'#f4f4f0');R(168,58,34,52,'#f4f4f0');R(198,36,2,14,'#a8a8a8');R(198,64,2,18,'#a8a8a8');
  R(172,30,12,14,'#f4f0e6');R(173,31,10,3,'#c83a3a');pxc('MISSING',178,31,'#fff');R(175,35,6,6,'#d8b898');R(176,36,4,2,'#5a3a2a');
  R(186,32,8,6,'#5ac8a0');R(172,62,10,8,'#f0d070');R(186,66,10,10,'#7aa0e0');R(188,68,6,5,'#f4f0e6');R(184,90,8,6,'#e05a7a');
  /* TV on a bracket */
  R(228,24,64,40,'#1a1a1a');R(258,64,4,10,'#3a3a3a');
  /* front door at the right */
  R(300,30,20,82,'#5a3a2a');R(302,32,18,80,'#7a4a2e');R(304,40,14,24,'#8a5a3e');R(304,70,14,30,'#8a5a3e');R(303,74,2,4,'#e8c870');
  R(296,100,4,12,'#5a3a2a');pxc('→',294,114,'#c8aa7a');
  /* table + chairs */
  for(let y=112;y<180;y+=8)for(let x=((y/8)%2)*8-8;x<W;x+=16){R(x,y,8,8,'#d8d0c0');R(x+8,y,8,8,'#c8c0b0')}
  R(214,128,76,4,'#8a6a48');R(216,132,72,3,'#6a4a2e');R(220,135,3,20,'#5a3e26');R(282,135,3,20,'#5a3e26');
  R(232,122,10,6,'#f4f0e6');R(234,120,6,2,'#e8c870');R(262,124,8,4,'#e8e2d6');R(264,122,4,2,'#c86a3a');
  R(204,112,6,30,'#7a5a3a');R(294,112,6,30,'#7a5a3a');
 });
 /* live: the news, coffee steam, toast */
 R(230,26,60,36,'#2a3a5a');R(230,26,60,10,'#c83a3a');pxc('NEWS 9',260,27,'#fff');
 {const s=Math.round(Math.sin(T*.7)*2);R(244+s,38,10,12,'#d8b898');R(244+s,36,10,4,'#5a3a2a');R(248+s,46,2,1,'#8a3a3a');R(238,50,32,8,'#4a4a6a')}
 R(230,56,60,6,'#141418');{const txt=NEWS(),w=pxw(txt),x=290-((T*22)%(w+60));g.save();g.beginPath();g.rect(230,56,60,6);g.clip();px(txt,x,57,'#f0d070');g.restore()}
 g.globalAlpha=.08+Math.sin(T*9)*.02;R(222,20,76,50,'#8ab0e0');g.globalAlpha=1;
 g.globalAlpha=.4;for(let i=0;i<4;i++){const q=(T*.5+i/4)%1;R(136+Math.sin(T*2+i)*2,64-q*16,3,3,'#ffffff')}g.globalAlpha=1;
 {const q=(T%9)/9;if(q<.08){const h=Math.sin(q/.08*Math.PI)*8;R(104,70-h,4,4,'#d8a868');R(110,70-h,4,4,'#d8a868')}}
 g.globalAlpha=.07;for(let i=0;i<26;i++)R(40-i*1.4,78+i*2,60+i,2,'#fff0c8');g.globalAlpha=1;
}};
LIGHT.kitchen=()=>({amb:.9,tint:[80,60,30],src:[[66,64,70,.3,[255,240,200]],[260,44,50,.2,[150,180,255]]]});

/* both rooms join up: bedroom ← → kitchen → front door */
WORLD.bedroom={L:null,R:'kitchen',Rx:16,doors:[]};WORLD.kitchen={L:'bedroom',Lx:300,R:null,doors:[]};
HALLS.add('bedroom');HALLS.add('kitchen');
ROSTER[0]=ROSTER[0]||{};ROSTER[0].kitchen=[['mom',96,1,null,144]];
ROSTER[0].bedroom=[];

const HOME_OK=()=>!TEST&&D&&!D.weekend&&!D.f.leftHome;
{const _sp=startPeriod;startPeriod=async function(i,resume){
 if(i===0&&HOME_OK()&&(!resume||D.home)){
  D.period=0;D.home=1;P.cur=JSON.parse(JSON.stringify(D));save();closeOverlays();setHud(true);
  D.spawn={room:D.room==='kitchen'?'kitchen':'bedroom',x:D.room==='kitchen'?40:170,y:146,dir:1};
  return enterRoom(D.room==='kitchen'?'kitchen':'bedroom');
 }
 return _sp(i,resume);
}}
/* Dad’s at the table on even days */
{const _br=buildRoom;buildRoom=function(room){const r=_br(room);if(room==='kitchen'&&D&&(D.dayType||'odd')==='even'&&!A.dad){put('dad',250,-1,{y:148,pose:'sit',hold:'paper'})}return r}}
{const _ed=edge;edge=function(s){
 if(D&&D.room==='kitchen'&&s>0)return leaveHome();
 if(D&&D.room==='bedroom'&&s<0){if(!edge.t2||T-edge.t2>1.2){edge.t2=T;toast('That’s your wall. It has a poster of a band nobody’s heard of.')}return}
 return _ed(s);
}}
async function leaveHome(){
 if(busy)return;busy=true;setPanel('talk');keys.l=keys.r=0;
 if(!D.f.packed&&!TEST){busy=false;setPanel('roam');
  const c=await choose(['Go back and pack your bag first.','Leave anyway. Empty bag. Living free.'],'You haven’t packed anything.');
  if(c===0){busy=false;roam();return}busy=true}
 if(A.mom&&!D.f.momBye){D.f.momBye=1;face('mom','you');await say('mom',pick(['Bye! Love you! Don’t die!','Have a good day! Don’t talk to the math teacher!','Bye, baby. Text me if anybody gets murdered.','Love you! Hat! Where’s your— okay, no hat. Fine. Freeze.']),'happy')}
 A.you.back=0;await walk('you',304,70);pose('you','reach');SFX.door();await wait(250);pose('you',null);await tw(A.you,{alpha:0},250);
 D.home=0;D.f.leftHome=1;
 TRANS.a=1.2;
 await card(PERIODS[0].name.toUpperCase(),(window.dayLabel?dayLabel():'')+' · 8:25'+(window.weekOf?'  ·  WEEK '+weekOf():''),1300);
 SFX.bell();
 busy=false;
 if(typeof applesFor==='function'){D.apples=applesFor(0);updateLoc()}
 for(const f of ON_PERIOD){try{await f(0,false)}catch(e){console.error(e)}}
 D.room='bus';P.cur=JSON.parse(JSON.stringify(D));save();
 return enterRoom('bus');
}
if(typeof DAILY_F!=='undefined')DAILY_F.push('leftHome','packed','momBye','purse','lunchTaken','petCat','newsSeen','windowSeen');


/* the intro happens in bed now, not on the bus */
let HOME_INTRO=false;
{const _di=dayIntro;dayIntro=async function(died){HOME_INTRO=!TEST&&!(D&&D.weekend);try{return await _di(died)}finally{HOME_INTRO=false}}}
{const _sc=scene;scene=function(room,cast,fresh){if(HOME_INTRO&&room==='bus'){room='bedroom';cast={you:[262,-1,{y:92,pose:'lie',ex:'closed'}]}}return _sc(room,cast,fresh)}}
const HOME_LINES=[[/The 43 drops you at Highgate High at 8:25\./,'Your alarm goes off at 7:15. The 43 leaves the end of your street at 7:58.'],
 [/You gasp awake on the 43, both hands on your neck\. Still attached\./,'You wake up in bed, both hands on your neck. Still attached.'],
 [/You wake up on the bus\. The radio’s playing the same song\./,'You wake up in your bed. The alarm is playing the same song.'],
 [/The bus\. The bell\. Your mouth tastes like pennies\./,'Your ceiling. Your alarm. Your mouth tastes like pennies.'],
 [/The 43 smells like Axe and wet coats\./,'Your alarm goes off. 7:15. You hit snooze with your whole face.'],
 [/Hasan is already laughing at something\./,'The cat is sitting on your chest, staring at you like you owe it money.']];
{const _s=say;say=function(who,text,e){if(HOME_INTRO&&typeof text==='string')for(const [re,to] of HOME_LINES)text=text.replace(re,to);return _s(who,text,e)}}
{const _p=put;put=function(id,x,dir,o){if(HOME_INTRO&&id==='aidan')return{id,k:K.aidan,x:0,y:150,vis:false};return _p(id,x,dir,o)}}
/* getting out of bed */
{const _er=enterRoom;enterRoom=async function(room){const r=await _er(room);
 if(room==='bedroom'&&A.you&&A.you.pose==='lie'){A.you.pose=null}
 if((room==='bedroom'||room==='kitchen')&&!TEST&&!D.f.homeTip){D.f.homeTip=1;toast('Home. Pack your bag (shelf over the desk), then walk right through the kitchen and out the front door.')}
 return r}}

/* ---------------- things to do at home ---------------- */
const PACKABLE=['energy','compass','tape','padlock','firstaid'];
spot({room:'bedroom',period:0,x:52,y:150,label:'Pack your bag (take 2 things)',short:'PACK',free:1,cond:()=>!D.f.packed,run:async()=>{
 await walk('you',52,70);pose('you','reach');
 let n=0;
 while(n<2){const opts=PACKABLE.filter(i=>!has(i));if(!opts.length)break;
  const c=await choose(opts.map(i=>(ITEMS[i]||i)+(['compass','padlock'].includes(i)&&cal()>=8?'  (metal: the detector)':'')).concat(n?['That’s it.']:['Nothing. Travel light.']),'What goes in the bag? ('+(2-n)+' left)');
  if(c>=opts.length)break;give(opts[c]);n++}
 pose('you',null);D.f.packed=1;
 await N(n?'Bag packed. It’s heavier than it looks. Everything at that school is.':'Empty bag. You are a free spirit and a fool.');
 return 'stay';
}});
spot({room:'bedroom',period:0,x:236,y:140,label:'Look out the window',short:'WINDOW',free:1,cond:()=>!D.f.windowSeen,run:async()=>{
 await walk('you',236,70);A.you.back=1;D.f.windowSeen=1;
 const L=['Down the street, the 43 is already at the stop, idling. The driver is eating a whole onion like an apple.',
  'Mr. Henderson across the road is mowing his lawn in a bathrobe. It’s November. He waves at you with the hand that isn’t holding a beer.',
  'A black van is parked outside the Morrisons’ house. Nobody gets out. It’s been there since Tyler.',
  'Paul Jones walks past on the other side of the street with his hood up, alone. He looks up at your window like he knows it’s yours.',
  'Two raccoons are fighting in your recycling bin. One of them wins. The other one looks at you like you’re next.',
  'The sky is the color of a school hallway. There are birds on the wire. They’re all facing the school.'];
 await N(L[(cal()-1)%L.length]);A.you.back=0;return 'stay';
}});
spot({room:'bedroom',period:0,x:256,y:150,label:'Pet the cat',short:'CAT',free:1,cond:()=>!D.f.petCat,run:async()=>{
 await walk('you',256,70);pose('you','reach');D.f.petCat=1;
 await N(pick(['Biscuit purrs like a broken fridge and bites you, gently, as a warning.','Biscuit lets you pet him exactly three times, then leaves the room in disgust.','Biscuit rolls over. It’s a trap. You know it’s a trap. You do it anyway. Blood.','Biscuit stares at the corner of the room for a long time. There’s nothing there. Probably.']));
 pose('you',null);return 'stay';
}});
spot({room:'kitchen',period:0,x:26,y:150,label:'Take the lunch Mom made',short:'LUNCH',free:1,cond:()=>!D.f.lunchTaken,run:async()=>{
 await walk('you',26,70);pose('you','reach');await wait(200);pose('you',null);D.f.lunchTaken=1;give('lunch');
 await N('A brown paper bag with your name on it in Sharpie, and a heart, and underneath the heart: “EAT THE APPLE THIS TIME.”');return 'stay';
}});
spot({room:'kitchen',period:0,x:150,y:150,label:'Swipe $3 from Mom’s purse',short:'PURSE',free:1,cond:()=>!D.f.purse,run:async()=>{
 await walk('you',150,60);pose('you','kneel');D.f.purse=1;
 const caught=A.mom&&Math.random()<.35;
 if(!caught){D.money=(D.money||0)+3;updateLoc();SFX.pick();await N('Three crumpled dollars and a receipt for wine. You take the dollars. You leave the receipt. You’re not a monster.')}
 else{face('mom','you');await say('mom','(not turning around) Put it back.','cold');await say('you','I wasn’t—');await say('mom','You were. You always were. Take one. One. And bring me back a coffee from the gas station like a decent criminal.','smirk');D.money=(D.money||0)+1;updateLoc()}
 pose('you',null);return 'stay';
}});
spot({room:'kitchen',period:0,x:260,y:150,label:'Watch the news',short:'TV',free:1,cond:()=>!D.f.newsSeen,run:async()=>{
 await walk('you',250,60);A.you.back=1;D.f.newsSeen=1;
 const L=[];if(D.f.brettDead)L.push('The news: “Brett Kowalski, a junior at Highgate High, has not been seen since Tuesday. His father, a police officer, is asking anyone with information to—” Mom changes the channel.');
 if(cal()>=8)L.push('The news: “Highgate High has installed metal detectors after what the principal called ‘a normal amount of incidents’.”');
 L.push('The news: “Day '+(cal()+3)+' in the search for Tyler Morrison, thirteen.” His school photo comes up. You sat behind him in math. You never once saw his face from the front.');
 L.push('The news: a reporter outside Highgate High says the words “perfectly safe” four times in one sentence. Behind him, a window on the second floor goes dark.');
 await N(pick(L));A.you.back=0;return 'stay';
}});
const MOM_TALK=[
 [['mom','Did you hear about that Tyler boy? Still missing.','sad'],['mom','(sipping coffee) Anyway. Do you want eggs? You look like a kid who needs eggs.','happy']],
 [['mom','Your school called last night. A robot voice. It said “Your child is still alive.”','shock'],['mom','Is that new? Do they always say that? That feels new.','scared']],
 [['mom','(on the phone) No, Karen. I will NOT chaperone the dance. I met those teachers. One of them looked at me like I was a ham.','angry'],['mom','(covering the phone) Morning, baby. Karen’s a bitch. Eat something.','happy']],
 [['mom','If anybody at that school offers you a ride, you say no.','cold'],['mom','If a TEACHER offers you a ride, you run. You run and you don’t stop until you see a gas station.','evil']],
 [['mom','I put a note in your lunch.','happy'],['mom','Don’t read it in front of people. It’s embarrassing. It’s supposed to be. That’s love.','smirk']],
 [['mom','Sit up. Eat something. Don’t die. Love you.','happy'],['mom','In that order.','smirk']],
 [['mom','The Morrisons put up another flyer. I took one. I don’t know why. It’s on the fridge.','sad'],['mom','…Text me when you get there. Every period, actually. Just send a thumbs up.','scared']],
 [['mom','Your math teacher emailed me. Ms. Sherman? She says you’re “delicious company”.','shock'],['mom','I’m sure that’s a typo. That’s a typo, right? “Delightful.” She meant delightful.','scared']],
 [['mom','Your father snores like a man being strangled by a smaller man. I haven’t slept since the Clinton administration.','angry'],['mom','Anyway, go learn something.','happy']],
 [['mom','There was a raccoon in the kitchen at three AM. It opened the fridge. It looked at me. I looked at it. It took the cheese.','shock'],['mom','I respect it. I hate it, but I respect it.','smirk']]
];
const DAD_TALK=[
 [['dad','(behind the paper) Inspection at your school next week. Says here they’ll be “thorough”.'],['dad','Your school’s never been thorough about anything in its life. Except lunch. That cafeteria lady scares the shit out of me.','smirk']],
 [['dad','You know I went to Highgate? Same building. Same lunch lady, I swear to God. She hasn’t aged. That’s not a joke. Pass the salt.','scared']],
 [['dad','Your mom says I need to have “the talk” with you.'],['dad','So: the teachers at that school are dangerous, don’t go in the boiler room, and never eat the stew. That’s the talk. That’s the whole talk.','cold']]
];
hook({period:0,room:'kitchen',who:'mom',label:'Talk to Mom',look:{},cond:()=>!D.f.momTalk,run:async()=>{
 D.f.momTalk=1;face('mom','you');for(const [w,t,e] of MOM_TALK[(cal()-1)%MOM_TALK.length])await say(w,t,e);return 'stay'}});
hook({period:0,room:'kitchen',who:'dad',label:'Talk to Dad',look:{pose:'sit',hold:'paper'},cond:()=>!D.f.dadTalk,run:async()=>{
 D.f.dadTalk=1;for(const [w,t,e] of DAD_TALK[(cal()-1)%DAD_TALK.length])await say(w,t,e);return 'stay'}});
if(typeof DAILY_F!=='undefined')DAILY_F.push('momTalk','dadTalk','homeTip');
/* Mom’s lunch pays off at lunch */
ON_PERIOD.push(async(i,resume)=>{if(i===4&&!resume&&D&&has('lunch')){D.items=D.items.filter(x=>x!=='lunch');D.apples=(D.apples||0)+2;updateLoc();setTimeout(()=>toast('🍎 Mom’s lunch: +2 apples. The note says “I’m proud of you. Eat the apple.”'),1900)}});
