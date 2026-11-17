'use strict';
/* =====================================================================
   HIGHSCHOOL — odd and even days.
   Odd days run Periods 1, 3, 5 (PE) and 7. Even days run Periods 2, 4, 6
   and 8, with different classes and different teachers. Break, lunch, home
   time and the mall are the same on both.
   ===================================================================== */
Object.assign(K,{
 grieve:{n:'Mr. Grieve',col:'#6a5a3a',skin:'#e4c4a8',hair:'#b8b0a0',hs:'short',tache:1,tacheC:'#c8c0b0',top:'#6a5a3a',pants:'#3a3428',adult:1,old:1,cardigan:1,seed:71,v:200,vw:'sawtooth'},
 dahl:{n:'Miss Dahl',col:'#c84a6a',skin:'#f0d4c0',hair:'#1a1416',hs:'bob',top:'#e8e0d0',pants:'#2a2a3a',skirt:1,apron:1,glasses:1,adult:1,girl:1,seed:72,v:450,vw:'triangle'},
 fenwick:{n:'Mr. Fenwick',col:'#4a3a7a',skin:'#ecd0bc',hair:'#9a9aa8',hs:'slick',top:'#3a2a4a',pants:'#1a1a22',tie:1,adult:1,thin:1,h:2,seed:73,v:330,vw:'triangle'},
 byte:{n:'Mrs. Byte',col:'#2a8a9a',skin:'#e8c8b0',hair:'#3ac8c8',hs:'bob',top:'#4a4a5a',pants:'#2a2a33',skirt:1,cardigan:1,glasses:1,adult:1,girl:1,seed:74,v:520,vw:'square'},
 tarn:{n:'Mrs. Tarn',col:'#2a6aa8',skin:'#d8b090',hair:'#c8a040',hs:'ponytail',top:'#1a4a8a',pants:'#1a4a8a',whistle:1,adult:1,girl:1,wide:1,seed:75,v:300},
 oakes:{n:'Mr. Oakes',col:'#8a5a2a',skin:'#d8a880',hair:'#5a3a22',hs:'short',beard:1,top:'#3a5a7a',pants:'#3a5a7a',goggles:1,adult:1,wide:1,h:2,seed:76,v:180},
 lyle:{n:'Dr. Lyle',col:'#5a4a6a',skin:'#ecd4c0',hair:'#2a2020',hs:'slick',beard:1,top:'#1a1a1a',pants:'#3a3a44',glasses:1,adult:1,thin:1,seed:77,v:260,vw:'sine'}
});
TEACHERS.push('grieve','dahl','fenwick','byte','tarn','oakes','lyle');

/* ---------- eight new rooms ---------- */
Object.assign(SCORES,{
 history:{beat:.7,root:[38,43,41,36],mode:[[0,7,15],[0,7,16],[0,7,16],[0,7,15]],lead:[62,-1,62,-1,67,-1,-1,65,-1,62,-1,-1,60,-1,-1,-1],drums:1},
 art:{beat:.62,root:[45,41,43,40],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,15]],lead:[76,-1,79,-1,-1,77,-1,76,74,-1,-1,72,-1,-1,-1,-1],soft:1},
 music:{beat:.5,root:[48,43,45,41],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,16]],lead:[72,74,76,77,79,-1,79,-1,81,79,77,76,74,-1,72,-1],soft:1},
 ict:{beat:.4,root:[40,40,38,38],mode:[[0,7,15],[0,7,15],[0,7,16],[0,7,16]],lead:[76,-1,76,79,-1,76,-1,74,72,-1,72,74,-1,72,-1,71],drums:2},
 pool:{beat:.66,root:[41,46,43,38],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,15]],lead:[77,-1,-1,74,-1,-1,72,-1,-1,74,-1,-1,69,-1,-1,-1],soft:1},
 woodwork:{beat:.46,root:[38,38,41,36],mode:[[0,7,15],[0,7,15],[0,7,16],[0,7,15]],lead:[62,-1,65,62,-1,60,-1,62,-1,-1,67,-1,65,-1,62,-1],drums:2},
 psych:{beat:.9,root:[38,37,41,36],mode:[[0,6,13],[0,7,15],[0,6,14],[0,7,13]],lead:[74,-1,-1,-1,73,-1,-1,-1,69,-1,-1,-1,70,-1,-1,-1],soft:1},
 hall:{beat:.44,root:[43,48,45,41],mode:[[0,7,16],[0,7,16],[0,7,15],[0,7,16]],lead:[67,-1,71,74,-1,79,-1,76,74,-1,71,-1,72,-1,-1,-1],drums:2}
});
function guillotineBg(x){R(x-13,24,3,88,'#6a4a2a');R(x+10,24,3,88,'#6a4a2a');R(x-15,20,30,5,'#5a3a1a');R(x-10,24,20,1,'#3a2a1a');R(x-13,96,26,8,'#5a3a1a');R(x-4,98,8,4,'#2a1a10');R(x-15,108,30,4,'#4a2a10')}
function blade(x,y){R(x-10,y,20,10,'#b8c0c8');R(x-10,y,20,2,'#e8eef4');R(x-10,y+9,20,1,'#f8fcff');R(x-8,y-3,16,3,'#3a3a3a')}
Object.assign(ROOMS,{
 history:{name:'History — Mr. Grieve',music:'history',bg(){
  wall('#3a5040','#22301f');lights(3);
  R(96,20,128,62,'#c8b890');R(98,22,124,58,'#d8c8a0');R(98,22,124,58,'rgba(90,70,40,.12)');
  const land=[[108,30,22,14],[124,26,30,20],[150,36,18,22],[166,30,26,16],[184,44,20,20],[132,50,24,18],[200,30,14,12]];land.forEach(([x,y,w,h])=>{R(x,y,w,h,'#a8b878');R(x+2,y+2,w-4,1,'#c8d898')});
  R(140,40,2,2,'#c02020');R(176,58,2,2,'#c02020');pxc('EUROPE 1789',160,72,'#4a3a20');
  for(let i=0;i<3;i++){const x=12+i*26;R(x,26,22,30,'#c8a040');R(x+2,28,18,26,['#5a2a2a','#2a3a5a','#4a4a2a'][i]);R(x+7,32,8,9,'#e8c8a8');R(x+6,30,10,3,['#e8e0c8','#c8a050','#3a2a1a'][i]);R(x+5,42,12,10,['#8a1a2a','#1a2a6a','#2a2a2a'][i])}
  pxc('KINGS',46,60,'#d8c8a0');
  R(10,70,78,10,'#5a1a1a');px('1066 1666 1789',14,72,'#f0d070');
  R(232,24,22,58,'#2a2a2a');R(234,26,18,54,'#4a5a6a');R(237,32,12,10,'#8a8a8a');R(238,34,10,4,'#5a5a5a');pxc('1916',243,58,'#d8c8a0');
  if(!(typeof D!=='undefined'&&D&&D.f.guillotineOut))guillotineBg(286);
  clock(84,14);
  wood('#6a4a32','#5a3a22');lightShaft(60,40);
 },items:classroomDesks()},
 art:{name:'Art — Miss Dahl',music:'art',bg(){
  R(0,0,W,112,'#ecebe4');R(0,0,W,5,'rgba(0,0,0,.08)');
  for(let i=0;i<40;i++){const x=hsh(i)*W,y=10+hsh(i+7)*90;R(x,y,1+(i%3),1+(i%2),['#e04060','#3a8ae0','#e8c030','#40b060','#8a40c0'][i%5])}
  R(100,0,120,22,'#a8d0e8');R(100,0,120,22,'rgba(255,255,255,.3)');R(158,0,4,22,'#d8d8d0');g.globalAlpha=.06;for(let i=0;i<30;i++)R(100-i,22+i*3,120+i*2,3,'#fffbe0');g.globalAlpha=1;
  const frame=(x,y,w,h,f)=>{R(x-2,y-2,w+4,h+4,'#3a2a1a');R(x,y,w,h,'#f4f0e6');f(x,y)};
  frame(14,28,34,26,(x,y)=>{R(x+2,y+14,30,10,'#40a050');R(x+4,y+4,10,10,'#f0d040')});
  frame(56,30,28,34,(x,y)=>{R(x+8,y+6,12,12,'#e8c8a8');R(x+6,y+2,16,6,'#2a1a1a');R(x+6,y+18,16,14,'#8a3a5a')});
  frame(234,28,72,40,(x,y)=>{for(let i=0;i<6;i++){R(x+4+i*11,y+16,8,14,'#4a6a3a');R(x+5+i*11,y+10,6,6,'#e0c0a0');R(x+5+i*11,y+9,6,2,'#5a3a22')}R(x+62,y+8,6,7,'#e6c2a2');R(x+61,y+6,8,3,'#4a2f1a');pxc('1987',x+36,y+32,'#3a3a3a')});
  R(230,74,80,4,'#8a6a4a');for(let i=0;i<5;i++)R(236+i*15,78,12,18,['#e8c8a0','#a8c8e8','#e8a8b8','#c8e8a8','#f0e0a0'][i]);
  R(12,80,60,26,'#c8c8d0');R(14,82,56,10,'#9aa0aa');R(30,76,4,6,'#888');pxc('SINK',42,96,'#3a3a3a');
  tiles('#d8d4cc','#c8c4bc',16);
  for(let i=0;i<20;i++)R(20+hsh(i+30)*280,120+hsh(i+40)*55,2,1,['#e04060','#3a8ae0','#e8c030'][i%3]);
 },items:[{y:132,d:()=>{R(146,108,40,4,'#8a6a4a');R(150,112,3,22,'#6a4a2a');R(178,112,3,22,'#6a4a2a');R(152,100,10,8,'#e8e0d0');R(156,98,6,4,'#c83030');R(166,100,8,8,'#e8d8b8');R(167,102,2,2,'#1a1a1a');R(171,102,2,2,'#1a1a1a')}}].concat([90,130,200,240,280].map((x,i)=>({y:150+(i%2)*8,d:()=>{const y=150+(i%2)*8;R(x-1,y-34,2,34,'#8a6a3a');R(x-9,y,2,2,'#6a4a2a');R(x+7,y,2,2,'#6a4a2a');R(x-9,y-30,18,20,'#f4f0e6');R(x-9,y-30,18,1,'#c8c4b8');R(x-6,y-26,8,6,['#e04060','#3a8ae0','#40b060','#e8c030','#8a40c0'][i]);R(x-10,y-10,20,2,'#8a6a3a')}})))},
 music:{name:'Music — Mr. Fenwick',music:'music',bg(){
  R(0,0,W,112,'#4a3a5a');for(let i=0;i<W;i+=12)for(let j=6;j<106;j+=12){R(i,j,12,12,(i/12+j/12)%2?'#3e3050':'#56466a');R(i+1,j+1,10,1,'rgba(255,255,255,.06)')}
  R(0,0,W,6,'#2a2038');R(0,106,W,6,'#2a2038');
  R(96,18,128,48,'#f4f6f2');for(let l=0;l<5;l++)R(100,26+l*4,120,1,'#3a3a5a');[[108,30],[124,26],[140,34],[156,22],[172,30],[188,26],[204,34]].forEach(([x,y])=>{R(x,y,4,3,'#1a1a2a');R(x+3,y-10,1,10,'#1a1a2a')});pxc('DO RE MI FA SO DIE',160,52,'#a02020');
  R(12,40,70,62,'#1a1418');R(14,42,66,20,'#2a2228');for(let i=0;i<13;i++)R(16+i*5,64,4,14,'#f4f0e6');for(let i=0;i<12;i++)if(i%7!==2&&i%7!==6)R(19+i*5,64,3,8,'#1a1418');R(12,96,4,10,'#1a1418');R(78,96,4,10,'#1a1418');
  R(240,72,24,22,'#c02020');R(244,76,16,14,'#e8e8e8');R(264,66,20,18,'#c02020');R(268,70,12,10,'#e8e8e8');R(252,58,30,2,'#c8b040');R(262,94,4,12,'#888');R(286,60,2,46,'#888');R(280,58,14,2,'#c8b040');
  for(let i=0;i<3;i++){R(232+i*14,24,3,30,'#8a4a2a');R(230+i*14,46,7,10,['#c86a2a','#2a2a2a','#e8c040'][i])}
  R(290,20,24,30,'#e8e0c8');R(296,24,12,12,'#e8c8a8');R(294,22,16,4,'#e8e8e8');pxc('MOZART',302,40,'#3a2a1a');
  wood('#5a3a4a','#4a2a3a');
 },items:[110,138,166,194,222,250,278].map(x=>({y:150.5,d:()=>{R(x-5,150-4,10,3,'#34407a');R(x-5,150-4,10,1,'#5a6aaa');R(x-4,150-1,1,5,'#8a8e98');R(x+3,150-1,1,5,'#8a8e98');R(x+12,150-22,1,22,'#2a2a2a');R(x+8,150-24,9,6,'#1a1a1a')}})).concat([110,138,166,194,222,250,278].map(x=>({y:141,d:()=>chairBack(x,150)})))},
 ict:{name:'ICT — Mrs. Byte',music:'ict',bg(){
  wall('#2a3440','#1a2228');
  for(let i=0;i<4;i++){R(20+i*18,20,12,86,'#1a1a22');for(let j=0;j<10;j++){R(22+i*18,24+j*8,8,5,'#2a2a34');if(Math.sin(T*(3+i)+j*1.7)>.2)R(28+i*18,25+j*8,1,1,j%3?'#3aff6a':'#ff3a3a')}}
  R(110,16,150,72,'#d8dce0');R(112,18,146,68,'#0a1a2a');const t=(T*.5)%1;px('HIGHGATE OS v8.7',118,24,'#3affc8');px('STUDENTS: 412',118,34,'#3affc8');px('DELETED: '+(typeof D!=='undefined'&&D&&D.f.byteDel?D.f.byteDel:0),118,42,'#ff5a5a');px('UPTIME: SINCE 13.03.87',118,52,'#3affc8');if(t<.5)R(118,62,4,6,'#3affc8');R(112,86,146,2,'#888');
  for(let i=0;i<6;i++){R(270,20+i*14,40,2,'#aab0b8')}
  tiles('#3a4450','#34404a',14);
 },items:[[134,'back'],[158,'front']].map(([y])=>({y:y+.5,d:()=>{R(80,y-13,230,3,'#5a5a64');R(80,y-10,230,9,'#3a3a44');for(let i=0;i<5;i++){const x=96+i*44;R(x-9,y-26,18,13,'#1a1a22');const on=typeof D!=='undefined'&&D&&D.f.ictSpark&&i===2&&Math.sin(T*30)>0;R(x-8,y-25,16,10,on?'#fff':(Math.sin(T*2+i)>0?'#2a6aa8':'#2a5a98'));R(x-2,y-13,4,1,'#555');R(x-8,y-12,16,2,'#2a2a30')}}}))},
 pool:{name:'Swimming Pool — Mrs. Tarn',music:'pool',bg(){
  R(0,0,W,112,'#d8eef0');for(let i=0;i<W;i+=8)R(i,0,1,112,'rgba(0,80,120,.08)');for(let j=0;j<112;j+=8)R(0,j,W,1,'rgba(0,80,120,.08)');
  R(0,0,W,20,'#a8c8d0');for(let i=0;i<5;i++){R(10+i*64,4,44,10,'#e8f8ff')}
  R(10,30,60,20,'#2a4a8a');pxc('DEEP END',40,34,'#fff');pxc('3M',40,42,'#f0d070');R(250,30,60,20,'#c02020');pxc('NO BOMBING',280,34,'#fff');pxc('NO HEROES',280,42,'#fff');
  R(120,30,80,26,'#f4f4f0');pxc('BREATH TEST',160,34,'#2a4a8a');pxc('2:00 OR',160,42,'#2a4a8a');pxc('TRY AGAIN',160,49,'#c02020');
  R(0,96,W,24,'#c8dce0');R(0,96,W,2,'#f4ffff');
  R(16,86,40,4,'#e8e8e8');R(50,86,6,14,'#a8a8a8');
  R(0,120,W,60,'#3a9ac8');for(let r=0;r<4;r++){const y=124+r*14;for(let i=0;i<W;i+=6)R(i,y,4,2,i%12?'#e8e8e8':'#c02020')}
  for(let i=0;i<8;i++){const x=(i*47+T*12)%W,y=126+(i*13)%50;R(x,y,6,1,'rgba(255,255,255,.35)')}
  R(4,150,16,16,'#2a2a30');for(let i=0;i<4;i++)R(5,151+i*4,14,1,'#5a5a64');
 },over(){g.globalAlpha=.38;R(0,128,W,52,'#2a8ac0');g.globalAlpha=.25;for(let i=0;i<W;i+=10)R(i,128+Math.round(Math.sin(T*2+i*.3)),8,1,'#fff');g.globalAlpha=1}},
 woodwork:{name:'Woodwork — Mr. Oakes',music:'woodwork',bg(){
  wall('#8a6a48','#5a4228');for(let i=0;i<W;i+=22)R(i,0,1,106,'rgba(0,0,0,.12)');
  R(90,18,140,62,'#c8a878');for(let i=0;i<140;i+=6)for(let j=0;j<62;j+=6)R(90+i+2,18+j+2,1,1,'#8a6a48');
  const tool=(x,y,w,h,c)=>{R(x-1,y-1,w+2,h+2,'#3a2a1a');R(x,y,w,h,c)};tool(98,24,30,6,'#a8a8b0');tool(98,30,8,14,'#6a4a2a');tool(136,24,6,30,'#a8a8b0');tool(150,26,22,4,'#888');tool(152,30,4,16,'#6a4a2a');tool(182,24,10,24,'#c03030');tool(200,26,20,8,'#a8a8b0');tool(204,40,14,24,'#6a4a2a');pxc('COUNT YOUR FINGERS',160,70,'#3a2a1a');
  for(let i=0;i<2;i++){const x=258+i*24;R(x,28,18,80,'#3a2418');R(x+2,30,14,76,'#4a2e1e');R(x+4,40,10,1,'#2a1a10');R(x+6,34,6,2,'#2a1a10')}pxc('ORDERS',280,20,'#f0e0c0');
  R(14,40,46,66,'#6a7a6a');R(18,44,38,30,'#8a9a8a');const b=T*20;R(34,58,6,6,'#d8d8d8');R(36+Math.round(Math.cos(b)*2),60+Math.round(Math.sin(b)*2),2,2,'#555');R(30,74,14,32,'#5a6a5a');R(14,40,46,3,'#c02020');pxc('BANDSAW',37,98,'#fff');
  wood('#a8885a','#98784a');for(let i=0;i<40;i++)R(hsh(i+3)*W,120+hsh(i+9)*58,1,1,'#e8c890');
 },items:[[134],[158]].map(([y])=>({y:y+.5,d:()=>{for(const x of[110,200,290]){R(x-28,y-13,56,4,'#c8985a');R(x-28,y-9,56,9,'#8a6a3a');R(x-28,y-13,56,1,'#e8b878');R(x+20,y-18,6,5,'#555');R(x+22,y-20,2,2,'#888')}}}))},
 psych:{name:'Psychology — Dr. Lyle',music:'psych',bg(){
  wall('#3a3448','#221e2c');
  R(0,0,W,112,'rgba(0,0,0,.18)');
  R(120,18,80,62,'#e8e4dc');const s=T*.6;for(let r=2;r<28;r+=3)for(let a=0;a<6.28;a+=.5){const x=160+Math.cos(a+s+r*.2)*r,y=49+Math.sin(a+s+r*.2)*r*.9;R(x,y,1,1,'#2a2a3a')}pxc('LOOK DEEPER',160,72,'#5a2a6a');
  R(20,24,40,30,'#e8e4dc');R(30,30,20,16,'#e8b8b8');R(36,32,8,3,'#c88888');R(32,38,16,2,'#c88888');pxc('THE BRAIN',40,48,'#5a2a2a');
  R(232,20,70,52,'#c8c0b8');for(let i=0;i<8;i++)R(234,22+i*6,66,4,'#e8e0d8');
  R(82,56,10,40,'#5a3a2a');R(84,60,6,6,'#e8e0c8');const sw=Math.sin(T*2.4)*5;R(86+Math.round(sw),68,2,16,'#c8a040');R(85+Math.round(sw),84,4,4,'#e8c050');
  wood('#4a3a3a','#3a2a2a');R(30,140,60,8,'#6a2a3a');R(26,132,12,16,'#6a2a3a');R(30,148,4,6,'#3a1a1a');R(84,148,4,6,'#3a1a1a');
 },items:classroomDesks()},
 hall:{name:'Main Hall — Assembly',music:'hall',bg(){
  R(0,0,W,112,'#5a4a3a');for(let i=0;i<W;i+=20)R(i,0,2,112,'rgba(0,0,0,.15)');
  R(40,20,240,70,'#2a1a14');R(40,20,240,4,'#8a6a3a');for(const cx of[40,250]){for(let i=0;i<30;i+=5){R(cx+i,24,4,66,'#7a1424');R(cx+i+1,24,1,66,'#9a2a3a')}}
  R(80,26,160,4,'#7a1424');for(let i=0;i<160;i+=10)R(80+i,30,10,3,'#7a1424');
  R(110,34,100,44,'#e8e8f0');pxc('HIGHGATE',160,40,'#2a2a5a');pxc('GOT TALENT?',160,50,'#c02020');pxc('(NO.)',160,62,'#6a6a7a');
  R(40,88,240,24,'#6a4a2a');R(40,88,240,2,'#c8a050');
  R(4,30,30,10,'#1a3a6a');pxc('HOUSE',19,32,'#fff');R(286,30,30,10,'#6a1a1a');pxc('POINTS',301,32,'#fff');
  wood('#8a6a42','#7a5a32');
 },items:[118,132,148,164].map((y,i)=>({y:y+6,d:()=>{for(let x=20+(i%2)*10;x<310;x+=20){R(x-6,y-6,12,2,'#34407a');R(x-6,y-4,1,8,'#555');R(x+5,y-4,1,8,'#555');R(x-6,y-1,12,2,'#2a3060')}}}))}
});

/* ---------- day sets ---------- */
const DAYSET={odd:{},even:{}};
for(const i of[1,3,5,6])DAYSET.odd[i]={name:{1:'Period 1',3:'Period 3',5:'Period 5 — PE',6:'Period 7'}[i],locs:PERIODS[i].locs.slice(),teach:Object.assign({},TEACH[i]),cls:CLASS[i]?Object.assign({},CLASS[i]):undefined,roster:ROSTER[i]};
DAYSET.even={
 1:{name:'Period 2',locs:['history','art','library','toilets','corridor'],teach:{history:'grieve',art:'dahl'},cls:{history:['hasan','arjun','omer','david','aidan','kid1'],art:['corey','abby','dheva','marcus','stella','sean']},roster:{library:[['ollie',250,-1,null,146],['kid3',150,1,'sit',150]],toilets:[['tez',292,-1,'lean']],corridor:[['kid2',200,-1]]}},
 3:{name:'Period 4',locs:['music','ict','library','toilets'],teach:{music:'fenwick',ict:'byte'},cls:{music:['sean','stella','abby','kenneth','marcus','jacob','paul'],ict:['nivaan','david','kayden','mia','alex','arjun']},roster:{library:[['ollie',250,-1,null,146]],toilets:[['tez',292,-1,'lean']]}},
 5:{name:'Period 6',locs:['pool','woodwork','toilets'],teach:{pool:'tarn',woodwork:'oakes'},cls:{pool:['omer','paul','jacob','alex','kenneth','hasan'],woodwork:['tez','dheva','angelo','aidan','marcus','nivaan']},roster:{toilets:[]}},
 6:{name:'Period 8',locs:['psych','hall','library','toilets'],teach:{psych:'lyle',hall:'adam'},cls:{psych:['aidan','david','mia','arjun','hasan','corey'],hall:[]},roster:{library:[['ollie',230,-1,null,146]],toilets:[]}}
};
function applyDay(t){
 t=t||'odd';const set=DAYSET[t];
 for(const i of[1,3,5,6]){const s=set[i];PERIODS[i].name=s.name;PERIODS[i].locs=s.locs.slice();for(const k in TEACH[i])delete TEACH[i][k];Object.assign(TEACH[i],s.teach);if(s.cls)CLASS[i]=Object.assign({},s.cls);else delete CLASS[i];ROSTER[i]=s.roster}
}
/* everything already written belongs to odd days unless it's somewhere both days share */
const SHARED_ROOMS=['library','toilets','corridor'];
for(const h of HOOKS){const ps=Array.isArray(h.period)?h.period:[h.period];if(!h.day&&ps.some(p=>[1,3,5,6].includes(p))&&!SHARED_ROOMS.includes(h.room))h.day='odd'}
{const _ah=availableHooks;availableHooks=function(room,who){const dt=(D&&D.dayType)||'odd';return _ah(room,who).filter(h=>!h.day||h.day===dt)}}
/* the choice, every new Friday */
async function pickDay(){
 if(TEST){return Math.random()<.5?'odd':'even'}
 const i=await choose([{t:'Odd day — Periods 1, 3, 5 and 7',tag:'1·3·5·7'},{t:'Even day — Periods 2, 4, 6 and 8',tag:'2·4·6·8'}],'What kind of Friday is it?');
 return i?'even':'odd';
}
{const _di=dayIntro;dayIntro=async function(died){await _di(died);D.dayType=await pickDay();applyDay(D.dayType);toast(D.dayType==='even'?'Even day: History or Art, Music or ICT, Swimming or Woodwork, Psychology or Assembly.':'Odd day: Periods 1, 3, 5 and 7.')}}
{const _sp=startPeriod;startPeriod=async function(i,resume){applyDay((D&&D.dayType)||'odd');return _sp(i,resume)}}
/* (the day label now comes from calendar.js) */
