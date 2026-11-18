'use strict';
/* =====================================================================
   HIGHSCHOOL — THE WINGS
   The walk to class goes through the right part of the school:
   the science wing, the arts wing, the sports wing, the main corridor,
   or the covered walkway out to the Trailer. Your classroom door is
   at the end of it. Walk up, open it, go in.
   ===================================================================== */
const WING_OF={trailer:'walkway',science:'wing_sci',chem:'wing_sci',music:'wing_arts',ict:'wing_arts',art:'wing_arts',woodwork:'wing_arts',gym:'wing_sports',pool:'wing_sports',english:'corridor',history:'corridor',maths:'corridor',psych:'corridor',hall:'corridor',library:'corridor',foodtech:'wing_arts',drama:'wing_arts'};
const DOOR_X=272;
function classDoor(x,label,open,tint){
 R(x-20,30,40,76,'#5a4030');R(x-17,33,34,73,'#2a2018');
 const w=Math.round(34*(1-(open||0)));
 if(w>2){R(x-17,33,w,73,tint||'#8a5a3a');R(x-15,35,w-4,69,tint?tint:'#9a6a46');if(w>18){R(x-12,40,12,18,'#c8dce8');R(x-12,40,12,1,'#fff')}R(x-17+w-6,70,3,6,'#d8c070')}
 else{g.globalAlpha=.3;R(x-17,33,34,73,'#fff2c8');g.globalAlpha=1}
 R(x-24,18,48,10,'#f4f0e6');R(x-24,18,48,1,'#c8c4b8');pxc(String(label||'').toUpperCase().slice(0,11),x,20,'#2a2a3a');
}
const doorLabel=()=>D&&D.passing&&ROOMS[D.passing.to]?ROOMS[D.passing.to].name.split(' —')[0]:'';
function tilesFloor(a,b){R(0,112,W,68,a);for(let i=0;i<W;i+=16)for(let j=112;j<180;j+=16)R(i+((j/16)%2)*8,j,8,8,b)}
ROOMS.wing_sci={name:'Science Wing',music:'class',bg(){
 R(0,0,W,112,'#d8e4d8');for(let i=0;i<W;i+=20)R(i,0,1,112,'rgba(0,0,0,.04)');R(0,0,W,6,'#b8c8b8');R(0,104,W,8,'#5a7a6a');
 R(10,30,58,44,'#f4f0e6');for(let r=0;r<5;r++)for(let c=0;c<9;c++)R(13+c*6,33+r*7,5,6,['#e8a0a0','#a0c8e8','#e8e0a0','#a0e8b0'][(r+c)%4]);pxc('PERIODIC TABLE',39,76,'#3a5a4a');
 R(80,26,36,50,'#e8d040');R(82,28,32,46,'#2a2a2a');pxc('GOGGLES',98,34,'#e8d040');pxc('ON.',98,42,'#e8d040');pxc('ALWAYS.',98,50,'#e8d040');R(90,60,16,8,'#7ab8c8');
 R(130,40,30,64,'#7a8a7a');R(132,42,26,60,'#9aaa9a');R(140,60,10,8,'#5ab0d0');pxc('EYEWASH',145,46,'#e8f0e8');
 R(176,30,44,76,'#5a4030');R(179,33,38,73,'#7a6a5a');R(186,42,24,20,'#7ad09a');g.globalAlpha=.25+Math.sin(T*3)*.1;R(186,42,24,20,'#a0ffb0');g.globalAlpha=1;pxc('CHEM',198,20,'#3a5a4a');
 R(232,56,10,20,'#c03030');R(234,52,6,4,'#c03030');
 classDoor(DOOR_X,doorLabel(),D&&D.doorOpen,'#5a7a6a');
 tilesFloor('#c8d0c8','rgba(0,0,0,.05)');
}};
ROOMS.wing_arts={name:'Arts Wing',music:'class',bg(){
 R(0,0,W,112,'#e8d8c0');R(0,0,W,6,'#c8b8a0');R(0,104,W,8,'#8a5a3a');
 for(let i=0;i<9;i++){const x=8+i*26,y=24+(i%3)*8;R(x,y,20,16,['#f0a0a0','#a0c8f0','#f0e0a0','#c0a0f0','#a0f0c0'][i%5]);R(x+3,y+3,14,10,['#c03030','#3060c0','#e0a020','#7030c0','#30a060'][(i+2)%5]);R(x+9,y-2,2,3,'#c0c0c0')}
 R(10,64,220,30,'#3a2a4a');for(let i=0;i<22;i++)R(14+i*10,68+Math.sin(i)*6,6,6,['#e04060','#40a0e0','#e0c040','#60c060'][i%4]);pxc('THE ARTS ARE ALIVE',120,84,'#f4f0e6');
 for(let i=0;i<4;i++){const q=(T*.6+i/4)%1;R(200+i*14,60-q*30,2,4,'#5a3a6a');R(201+i*14,58-q*30,3,2,'#5a3a6a')}
 classDoor(DOOR_X,doorLabel(),D&&D.doorOpen,'#9a5a8a');
 R(0,112,W,68,'#a07a5a');for(let i=0;i<W;i+=18)R(i,112,1,68,'#8a6a4a');
}};
ROOMS.wing_sports={name:'Sports Wing',music:'gym',bg(){
 R(0,0,W,112,'#5a7aa8');for(let y=0;y<112;y+=8)for(let x=(y/8%2)*12;x<W;x+=24)R(x,y,23,7,'#6a8ab8');R(0,104,W,8,'#2a3a5a');
 R(10,22,70,56,'#4a3a2a');R(13,25,64,50,'#7a9aaa');for(let i=0;i<4;i++){R(18+i*15,48,8,24,'#d8b040');R(17+i*15,44,10,5,'#e8c850')}pxc('TROPHIES',45,28,'#f4f0e6');
 R(96,24,80,18,'#c02030');pxc('GO HIGHGATE',136,29,'#f4f0e6');R(96,42,80,2,'#8a1020');
 R(190,70,18,34,'#c8c8d0');R(193,74,12,6,'#e8e8f0');R(198,66,2,6,'#888');g.globalAlpha=.4;R(197,62,4,4,'#a0d0f0');g.globalAlpha=1;pxc('WATER',199,60,'#f4f0e6');
 g.globalAlpha=.15;for(let i=0;i<5;i++){const q=(T*.3+i/5)%1;R(230+Math.sin(T+i)*6,96-q*60,3,6,'#9aff9a')}g.globalAlpha=1;
 classDoor(DOOR_X,doorLabel(),D&&D.doorOpen,'#3a5a8a');
 R(0,112,W,68,'#c89a5a');for(let i=0;i<W;i+=12)R(i,112,1,68,'#b88a4a');R(0,150,W,2,'#c03030');
}};
ROOMS.walkway={name:'Walkway to the Portables',music:'field',bg(){
 skyBands(['#8ab4d8','#a8c8e0','#c8dce8'],0,70);for(let i=0;i<3;i++)cloud((i*120+T*3)%400-60,10+i*9,1);
 R(0,56,W,20,'#5a8a4a');for(let i=0;i<W;i+=6)R(i,54+(i%4),3,4,'#4a7a3a');
 for(let i=0;i<W;i+=4)R(i,60,1,16,'rgba(200,200,210,.55)');R(0,60,W,1,'#c8c8d0');R(0,66,W,1,'rgba(200,200,210,.4)');
 R(214,28,100,50,'#c8b890');R(214,28,100,4,'#a89870');for(let i=0;i<3;i++)R(222+i*28,40,18,14,'#7ab0d0');R(214,74,100,4,'#8a8a8a');for(let i=0;i<5;i++)R(218+i*20,78,4,12,'#6a6a6a');pxc('PORTABLE 4',264,32,'#5a4a3a');
 R(0,16,W,6,'#7a7a82');R(0,22,W,2,'#5a5a62');for(let i=10;i<W;i+=50){R(i,24,3,88,'#8a8a92');R(i+1,24,1,88,'#aaaab2')}
 R(0,76,W,36,'#6a9a5a');for(let i=0;i<60;i++)R(hsh(i)*W,78+hsh(i+3)*32,2,1,'#5a8a4a');
 classDoor(DOOR_X,doorLabel(),D&&D.doorOpen,'#a08060');
 R(0,112,W,68,'#a8a8a0');for(let i=0;i<W;i+=30)R(i,112,1,68,'#8a8a84');for(let i=0;i<40;i++)R(hsh(i+9)*W,114+hsh(i+11)*64,2,1,'#9a9a92');
}};
if(typeof LIGHT!=='undefined')Object.assign(LIGHT,{wing_sci:{amb:.7,tint:[40,60,50],src:[[198,52,60,.3,[150,255,190]],[100,6,120,.25]],wallAO:1},wing_arts:{amb:.72,tint:[60,40,30],src:[[160,6,140,.3,[255,230,200]]],wallAO:1},wing_sports:{amb:.66,tint:[30,40,70],src:[[160,6,140,.3,[230,240,255]]],wallAO:1},walkway:{amb:.95,tint:[60,70,90],src:[]}});
if(typeof FLOOR!=='undefined')Object.assign(FLOOR,{wing_sci:[136,168],wing_arts:[136,168],wing_sports:[136,168],walkway:[132,168]});
if(typeof AMB!=='undefined')Object.assign(AMB,{wing_sci:{bed:.04,chat:.6,lockers:.2,steps:.5,drip:.2},wing_arts:{bed:.04,chat:.7,steps:.4,beeps:.15},wing_sports:{bed:.05,chat:.6,squeak:.3,ball:.3,lockers:.3},walkway:{bed:.03,wind:.5,birds:.4,chat:.3,distant:.6}});
if(typeof EXTRA_SPOTS!=='undefined')Object.assign(EXTRA_SPOTS,{wing_sci:3,wing_arts:3,wing_sports:3,walkway:2});
/* the hallway events can happen in any wing */
for(const p of PASS)for(const w of['wing_sci','wing_arts','wing_sports','walkway'])hook({mis:'passing',period:[1,3,5,6],room:w,who:p.who,label:p.label,cond:()=>!!(D&&D.passing&&D.passing.ev.includes(p.id))&&(!p.cond||p.cond()),run:async()=>{if(!A[p.who])put(p.who,160,-1,{y:146});await p.run();D.passing&&(D.passing.ev=D.passing.ev.filter(x=>x!==p.id));P.passN=(P.passN||0)+1;save();return 'stay'}});
/* the door at the end: walk up and open it */
for(const w of['corridor','wing_sci','wing_arts','wing_sports','walkway'])spot({room:w,period:[1,3,5,6],x:DOOR_X,y:140,label:'Open the door',short:'DOOR',free:1,cond:()=>!!(D&&D.passing),run:async()=>{
 if(!D.passing)return 'stay';const to=D.passing.to;D.passing=null;A.you.back=1;await walk('you',DOOR_X,60);await tw(A.you,{y:136},250);pose('you','reach');SFX.door();await tw(D,{doorOpen:1},420);pose('you',null);await tw(A.you,{y:122,alpha:0},380);A.you.back=0;
 const changing=to==='gym'||to==='pool';D.noDoor=!changing;D.doorOpen=0;
 setTimeout(()=>enterRoom(to),0);return 'ended'}});
/* send the walk through the right wing */
{const _pt=passingTo;passingTo=async function(room){
 const w=WING_OF[room]||'corridor';
 await _pt(room);
 if(w==='corridor'||TEST)return;
 const keep=Object.keys(A).filter(k=>k!=='you'&&!A[k].extra).map(k=>[k,A[k].x,A[k].dir,A[k].y,A[k].pose]);
 D.room=w;scene(w,{you:[20,1,{y:156}]},true);
 for(const [k,x,dir,y,ps] of keep)if(!A[k]){const a=put(k,x,dir,{y,pose:ps});if(x<0||x>320){walk(k,x<0?336:-16,50)}}
 spawnExtras(w,false);updateLoc();roam();
}}
/* the hallway door in the main corridor too */
{const _cb=ROOMS.corridor.bg;ROOMS.corridor.bg=function(){_cb();if(D&&D.passing&&!TEST)classDoor(DOOR_X,doorLabel(),D.doorOpen)}}
/* walking off the edge also still works, but the door’s right there now */
{const _rh=roamHint;roamHint=function(){_rh();if(D&&D.passing){const h=$('hint');if(h)h.innerHTML=h.innerHTML.replace(/walk right → [^<]*/,'door on the right → '+doorLabel())}}}
/* bubbles: the pixel font has no apostrophes */
{const _do=HOOK.drawOver;HOOK.drawOver=(...a)=>{for(const b of(typeof bubbles!=='undefined'?bubbles:[]))b.txt=b.txt.replace(/[’']/g,'');_do&&_do(...a)}}
