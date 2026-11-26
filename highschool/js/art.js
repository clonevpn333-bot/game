'use strict';
/* =====================================================================
   HIGHSCHOOL — characters, poses, faces, props, gore
   Same sprite language as The Calling of Aidan: square pixels, two legs.
   ===================================================================== */
const K={
 you:{n:'You',col:'#b8343a',skin:'#e8b890',hair:'#5a3a22',hs:'cap',top:'#c23b3b',pants:'#2e3a5c',hood:1,seed:1,v:300},
 hasan:{n:'Hasan',col:'#8a7a4a',skin:'#d9a878',hair:'#1e1a18',hs:'short',top:'#8d9099',pants:'#b9a276',knob:1,hood:1,seed:4,v:340},
 arjun:{n:'Arjun',col:'#c0641e',skin:'#a87048',hair:'#15100e',hs:'fluffy',top:'#d87a2e',pants:'#34405a',h:3,pimples:1,seed:7,v:385,vw:'sawtooth'},
 david:{n:'David',col:'#7a4fa0',skin:'#f0c8a0',hair:'#3b2a1c',hs:'long',top:'#7a4fa0',pants:'#39424e',wide:1,glasses:1,seed:2,v:215,vw:'triangle'},
 omer:{n:'Omer',col:'#2f7a40',skin:'#e0b088',hair:'#2a1e16',hs:'short',top:'#3f9a52',pants:'#8a8d94',shorts:1,collar:1,tee:1,seed:6,v:255},
 nivaan:{n:'Nivaan',col:'#5a6a9a',skin:'#b98058',hair:'#1c1412',hs:'curly',top:'#8d9099',pants:'#3565b8',cuff:1,h:-3,hood:1,seed:3,v:430},
 corey:{n:'Corey',col:'#4a4a5f',skin:'#c08860',hair:'#1a1210',hs:'curly',top:'#1d1d24',pants:'#101014',glow:1,h:1,zip:1,seed:5,v:240,vw:'triangle'},
 sean:{n:'Sean',col:'#9a8420',skin:'#f2cfae',hair:'#e8c860',hs:'wavy',top:'#1b1b20',pants:'#8f9198',baggy:1,hood:1,seed:8,v:285},
 stella:{n:'Stella',col:'#c0408a',skin:'#f0c8a8',hair:'#f0d070',hs:'long',top:'#c0408a',pants:'#3a4a7a',girl:1,seed:11,v:520,vw:'triangle'},
 abby:{n:'Abby',col:'#6a35b9',skin:'#ecd2c4',hair:'#0c0a12',hs:'long',top:'#1a1626',pants:'#2a2238',girl:1,streaks:1,seed:12,v:470,vw:'triangle'},
 aidan:{n:'Aidan',col:'#2456c8',skin:'#e6c2a2',hair:'#4a2f1a',hs:'bowl',top:'#2456c8',pants:'#0c0c10',tight:1,h:-5,zip:1,seed:9,v:175,vw:'sawtooth'},
 angelo:{n:'Angelo',col:'#9a6a3a',skin:'#c8946a',hair:'#141010',hs:'straight',top:'#7a5234',pants:'#141416',baggy:1,tee:1,seed:13,v:330},
 alex:{n:'Alex',col:'#2b6bd6',skin:'#f3cdb0',hair:'#e3c15a',hs:'wavyb',top:'#2b6bd6',pants:'#1f2a44',shorts:1,tee:1,num:'9',seed:14,v:305},
 dheva:{n:'Dheva',col:'#565663',skin:'#9a6440',hair:'#121010',hs:'mod',top:'#0f0f12',pants:'#2a2a33',baggy:1,stripe:1,tee:1,seed:15,v:268},
 marcus:{n:'Marcus',col:'#5b7a8c',skin:'#f0d0a8',hair:'#0e0c0c',hs:'fringe',top:'#e8e8ea',pants:'#2a2f3a',tie:1,squint:1,seed:16,v:455},
 paul:{n:'Paul',col:'#b8462a',skin:'#efc6a4',hair:'#7a4a26',hs:'buzz',top:'#b8462a',pants:'#3a3f4a',h:14,thin:1,seed:17,v:228},
 kenneth:{n:'Kenneth',col:'#c9a12a',skin:'#f1c9a3',hair:'#a8874a',hs:'crop',top:'#d8b23a',pants:'#6a3fa0',shorts:1,tee:1,num:'23',seed:18,v:362},
 jacob:{n:'Jacob',col:'#c8202c',skin:'#6b4428',hair:'#120e0c',hs:'fade',top:'#c8202c',pants:'#22252c',h:2,hood:1,seed:19,v:198},
 tyler:{n:'Tyler',col:'#5a7a5a',skin:'#e8c4a0',hair:'#8a5a2a',hs:'short',top:'#5a7a5a',pants:'#33384a',seed:20,v:350},
 balduf:{n:'Ms. Balduf',col:'#b5462a',skin:'#f0cfb0',hair:'#b5462a',hs:'bob',top:'#4b6b3a',pants:'#3a2f2a',skirt:1,glasses:1,cardigan:1,adult:1,girl:1,seed:31,v:410,vw:'triangle'},
 shermian:{n:'Ms. Sherman',col:'#d06a8e',skin:'#efd2bc',hair:'#3a2418',hs:'bun',top:'#e3a9bd',pants:'#2f2f3a',skirt:1,pearls:1,adult:1,girl:1,seed:32,v:490,vw:'triangle'},
 sherman:{n:'Ms. Sherman',col:'#7a4a7a',skin:'#e6c9b5',hair:'#cfcac8',hs:'perm',top:'#5a3a5a',pants:'#3a2a3a',skirt:1,glasses:1,old:1,adult:1,girl:1,wide:1,seed:33,v:205,vw:'sawtooth'},
 loach:{n:'Ms. Loach',col:'#6f7a6a',skin:'#d8c4b4',hair:'#6e6a58',hs:'limp',top:'#6f7a6a',pants:'#4a4a44',cardigan:1,tired:1,adult:1,girl:1,seed:34,v:165,vw:'sine'},
 voss:{n:'Mr. Voss',col:'#8aa0a8',skin:'#e2d0c0',hair:'#9a9088',hs:'bald',top:'#ecebe4',pants:'#2a2a2a',coat:1,goggles:1,adult:1,thin:1,seed:35,v:150,vw:'sawtooth'},
 coach:{n:'Coach Dunmore',col:'#a8202a',skin:'#c98e64',hair:'#2a1a10',hs:'capr',top:'#a8202a',pants:'#a8202a',whistle:1,stripe:1,adult:1,wide:1,seed:36,v:188},
 pat:{n:'Lunch Lady Pat',col:'#6a8aa8',skin:'#e8c0a0',hair:'#d8d8d8',hs:'net',top:'#6a8aa8',pants:'#3a3a48',apron:1,adult:1,wide:1,girl:1,seed:37,v:250},
 kid1:{n:'8th Grader',skin:'#e8c0a0',hair:'#3a2a1a',hs:'short',top:'#3a4a7a',pants:'#2a2a33',seed:41,v:400},
 kid2:{n:'Freshman',skin:'#b88058',hair:'#151010',hs:'curly',top:'#7a3a3a',pants:'#2a2a33',seed:42,v:360},
 kid3:{n:'7th Grader',skin:'#f0d0b0',hair:'#c8a050',hs:'long',top:'#5a7a4a',pants:'#2a2a33',girl:1,seed:43,v:500},
 kid4:{n:'Sophomore',skin:'#7a5034',hair:'#101010',hs:'fade',top:'#4a4a5a',pants:'#2a2a33',h:3,seed:44,v:230}
};
const FRIENDS=['hasan','arjun','david','omer','nivaan','corey','sean','stella','abby','aidan','angelo','alex','dheva','marcus','paul','kenneth','jacob'];
const TEACHERS=['balduf','shermian','sherman','loach','voss','coach','pat'];

function kidGeom(k,o){const ad=k.adult?1:0,hh=k.h||0,lr=Math.round(hh/2),p=o&&o.pose,sit=p==='sit'||p==='write',kn=p==='kneel',cr=p==='crouch';
 return{legH:sit?4:kn?3:cr?(4+ad):(7+lr+ad*3),bodyH:9+hh-lr+ad*3,bw:(k.wide?13:k.thin?8:10)+ad,hw:k.knob?10:12,hd:k.knob?12:11}}

/* ---------- head: used by bodies, portraits and severed heads ---------- */
function drawHead(k,x,hy,d,o){
 const {hw,hd}=kidGeom(k,o),hx=x-(hw>>1),S=k.skin;
 if(o.crushed){R(hx-1,hy+hd-4,hw+2,4,BLOOD[1]);R(hx,hy+hd-5,hw,2,S);R(hx+2,hy+hd-6,3,2,k.hair);R(hx+6,hy+hd-5,3,1,'#f1e6da');R(hx-3,hy+hd-2,hw+6,2,BLOOD[0]);return}
 R(hx+1,hy,hw-2,1,S);R(hx,hy+1,hw,hd-2,S);R(hx+1,hy+hd-1,hw-2,1,S);R(d>0?hx:hx+hw-1,hy+2,1,hd-4,'rgba(0,0,0,.12)');
 if(k.old){R(hx+1,hy+hd-3,3,1,'rgba(0,0,0,.14)');R(hx+hw-4,hy+hd-3,3,1,'rgba(0,0,0,.14)');R(hx+3,hy+2,6,1,'rgba(0,0,0,.08)')}
 let ex_=o.ex==='scream'?'yell':(o.ex||'n');if(k.adult&&ex_==='evil')ex_='cold';const ey=hy+(k.knob?6:5),ex=x+d,blink=((T*1.3+k.seed*.7)%5)<.12;
 const ink='#1a1410',mouthC='#7a3a2a',dark='#4a1418';
 // evil: face darkens from the top
 if(ex_==='evil'){g.fillStyle='rgba(30,0,10,.38)';g.fillRect(hx,hy,hw,6)}
 // brows
 if(ex_==='angry'||ex_==='evil'||ex_==='yell'){R(ex-5,ey-2,2,1,ink);R(ex-3,ey-1,1,1,ink);R(ex+3,ey-2,2,1,ink);R(ex+2,ey-1,1,1,ink)}
 else if(ex_==='sad'||ex_==='cry'||ex_==='scared'){R(ex-4,ey-2,1,1,ink);R(ex-3,ey-3,1,1,ink);R(ex+3,ey-2,1,1,ink);R(ex+2,ey-3,1,1,ink)}
 // eyes
 if(ex_==='dead'||o.deadFace){R(ex-5,ey-1,1,1,ink);R(ex-3,ey-1,1,1,ink);R(ex-4,ey,1,1,ink);R(ex-5,ey+1,1,1,ink);R(ex-3,ey+1,1,1,ink);R(ex+2,ey-1,1,1,ink);R(ex+4,ey-1,1,1,ink);R(ex+3,ey,1,1,ink);R(ex+2,ey+1,1,1,ink);R(ex+4,ey+1,1,1,ink)}
 else if(ex_==='evil'){const gl=Math.sin(T*9)>0?'#ff2a2a':'#ff6a4a';R(ex-4,ey,2,2,gl);R(ex+2,ey,2,2,gl);R(ex-4,ey-1,2,1,'#fff3');}
 else if(ex_==='cold'){R(ex-4,ey,2,2,ink);R(ex+2,ey,2,2,ink);R(ex-4,ey+2,2,1,'rgba(90,60,70,.35)');R(ex+2,ey+2,2,1,'rgba(90,60,70,.35)')}
 else if(ex_==='shock'||ex_==='scared'){R(ex-4,ey-1,2,3,'#fff');R(ex+2,ey-1,2,3,'#fff');R(ex-3,ey,1,1,'#111');R(ex+2,ey,1,1,'#111')}
 else if(ex_==='closed'||blink||ex_==='happy'&&k.squint||ex_==='laugh'){R(ex-4,ey+1,2,1,ink);R(ex+2,ey+1,2,1,ink);if(ex_==='laugh'){R(ex-5,ey,1,1,ink);R(ex+4,ey,1,1,ink)}}
 else if(ex_==='smirk'||ex_==='sly'){/* smug: steady eyes, one brow cocked up */R(ex-4,ey,2,2,ink);R(ex+2,ey,2,2,ink);R(ex+2,ey-3,2,1,ink);R(ex-4,ey-2,2,1,'rgba(30,15,15,.5)')}
 else if(k.squint||k.tired){R(ex-4,ey+1,2,1,ink);R(ex+2,ey+1,2,1,ink);if(k.tired){R(ex-4,ey+2,2,1,'#9a7a8a');R(ex+2,ey+2,2,1,'#9a7a8a')}}
 else{R(ex-4,ey,2,2,ink);R(ex+2,ey,2,2,ink)}
 if(ex_==='cry'){const q=(T*3|0)%3;R(ex-4,ey+2,1,2+q,'#7ac0ff');R(ex+3,ey+2,1,1+((q+1)%3),'#7ac0ff')}
 if(ex_==='blush'||ex_==='love'){R(ex-6,ey+2,2,1,'#e8798e');R(ex+3,ey+2,2,1,'#e8798e')}
 if(o.hurt>=1||ex_==='hurt'){R(ex+1,ey-1,4,4,'#5d3a70');R(ex+2,ey,2,2,ink)}
 if(o.hurt>=2){R(ex-1,ey+2,1,3,BLOOD[2]);R(hx+1,hy+2,2,1,BLOOD[2]);R(ex-5,ey+3,2,2,'#7a3a5a')}
 if(o.hurt>=3){R(hx+2,hy+1,4,3,BLOOD[2]);R(hx+3,hy+4,1,4,BLOOD[1]);R(ex+4,ey+3,2,1,BLOOD[2])}
 // mouth
 const my=ey+3;
 if(ex_==='dead'||o.deadFace){R(ex-1,my,3,2,'#3a0508');R(ex,my+2,1,2,'#c84a5a')}
 else if(o.talk&&Math.sin(T*15)>0&&ex_!=='evil')R(ex-1,my,3,2,dark);
 else if(ex_==='evil'){R(ex-3,my-1,7,3,'#2a0408');R(ex-2,my-1,1,1,'#fff');R(ex,my-1,1,1,'#fff');R(ex+2,my-1,1,1,'#fff');R(ex-1,my+1,1,1,'#fff');R(ex+1,my+1,1,1,'#fff')}
 else if(ex_==='cold'){R(ex-2,my,4,1,mouthC);R(ex-3,my-1,1,1,mouthC);R(ex+2,my-1,1,1,mouthC)}
 else if(ex_==='laugh'){R(ex-2,my,5,2,dark);R(ex-1,my+2,3,1,dark);R(ex-1,my,3,1,'#f2ece4');R(ex,my+1,1,1,'#c8606a')}
 else if(ex_==='happy'||ex_==='love'){R(ex-2,my,1,1,mouthC);R(ex-1,my+1,3,1,mouthC);R(ex+2,my,1,1,mouthC)}
 else if(ex_==='angry'||ex_==='sad'||ex_==='cry'){R(ex-2,my,4,1,dark);R(ex-3,my+1,1,1,dark);R(ex+2,my+1,1,1,dark)}
 else if(ex_==='shock'){R(ex-1,my,2,3,dark)}
 else if(ex_==='yell'){R(ex-2,my-1,5,3,dark);R(ex-1,my-1,3,1,'#f2ece4')}
 else if(ex_==='scared'){R(ex-2,my,1,1,dark);R(ex-1,my+1,1,1,dark);R(ex,my,1,1,dark);R(ex+1,my+1,1,1,dark)}
 else if(ex_==='smirk'||ex_==='sly'){/* flat mouth, one corner tucked up into the cheek */R(ex-2,my,4,1,mouthC);R(ex+2,my-1,1,1,mouthC);R(ex+3,my-1,1,1,'rgba(0,0,0,.14)')}
 else if(ex_==='closed'){R(ex-1,my,2,1,mouthC)}
 else R(ex-2,my,4,1,mouthC);
 if(k.pimples){R(ex-5,ey+3,1,1,'#c8503a');R(ex+4,ey+2,1,1,'#c8503a');R(ex+1,ey-2,1,1,'#c8503a')}
 if(k.glasses){const c=k.adult?'#2a1a24':'#15151a';for(const gx of[ex-5,ex+1]){R(gx,ey-1,4,1,c);R(gx,ey+2,4,1,c);R(gx,ey-1,1,4,c);R(gx+3,ey-1,1,4,c)}R(ex-1,ey,2,1,c)}
 if(k.goggles){R(hx-1,ey-2,hw+2,1,'#3a5a4a');R(ex-5,ey-1,4,3,'rgba(150,230,200,.55)');R(ex+1,ey-1,4,3,'rgba(150,230,200,.55)');R(ex-5,ey-1,4,1,'#3a5a4a');R(ex+1,ey-1,4,1,'#3a5a4a')}
 // hair
 const hs=o.noHair?'':(o.hs||k.hs),c=o.hairC||k.hair;
 if(hs==='bowl'){R(hx-1,hy-2,hw+2,6,c);R(hx,hy-3,hw,1,c);R(hx+2,hy-4,hw-4,1,c);R(hx-1,hy+4,2,2,c);R(hx+hw-1,hy+4,2,2,c);R(hx+2,hy-2,4,1,'rgba(255,255,255,.3)')}
 else if(hs==='long'){R(hx-1,hy-2,hw+2,4,c);R(hx+1,hy-3,hw-2,1,c);R(hx-2,hy,3,hd+3,c);R(hx+hw-1,hy,3,hd+3,c);R(hx+1,hy+2,3,2,c);R(hx+7,hy+2,3,1,c);if(k.girl)R(hx+2,hy-2,3,1,'rgba(255,255,255,.3)')}
 else if(hs==='curly'){R(hx-1,hy-1,hw+2,3,c);for(let i=0;i<5;i++)R(hx-2+i*3,hy-3-(i%2),3,3,c);R(hx-2,hy+1,2,3,c);R(hx+hw,hy+1,2,3,c);R(hx+2,hy+2,2,1,c);R(hx+7,hy+2,2,1,c)}
 else if(hs==='curlyl'){R(hx-1,hy-1,hw+2,3,c);for(let i=0;i<5;i++)R(hx-2+i*3,hy-3-(i%2),3,3,c);for(let j=0;j<4;j++){R(hx-3+(j%2),hy+1+j*3,3,3,c);R(hx+hw-(j%2),hy+1+j*3,3,3,c)}R(hx+2,hy+2,3,1,c);R(hx+3,hy-2,2,1,'#8a4a2a')}
 else if(hs==='short'){R(hx,hy-1,hw,3,c);R(hx+1,hy-2,hw-2,1,c)}
 else if(hs==='fluffy'){R(hx-1,hy-4,hw+2,6,c);R(hx+1,hy-6,hw-2,2,c);R(hx+3,hy-7,hw-6,1,c);R(hx-2,hy-2,2,5,c);R(hx+hw,hy-2,2,5,c);R(hx+3,hy-5,2,1,'rgba(255,255,255,.14)');R(hx+7,hy-3,2,1,'rgba(255,255,255,.14)')}
 else if(hs==='wavy'){R(hx-1,hy-2,hw+2,4,c);R(hx-2,hy,2,5,c);R(hx+hw,hy,2,5,c);R(hx+1,hy-3,3,1,c);R(hx+6,hy-3,4,1,c);R(hx+2,hy+2,5,1,c);R(hx+3,hy-1,3,1,'#fff2b0')}
 else if(hs==='wavyb'){R(hx-2,hy-3,hw+4,5,c);R(hx,hy-4,4,1,c);R(hx+5,hy-5,5,2,c);R(hx-3,hy-1,3,6,c);R(hx+hw,hy-1,3,6,c);R(hx+d*2+3,hy+2,4,2,c);R(hx+2,hy-3,2,1,'#fff2b0');R(hx+7,hy-4,2,1,'#fff2b0');R(hx-2,hy+5,2,1,c)}
 else if(hs==='cap'){R(hx-1,hy-2,hw+2,4,'#2a4a8a');R(hx+1,hy-3,hw-2,1,'#2a4a8a');R(d>0?hx+hw-1:hx-4,hy+1,5,1,'#1c3566');R(d>0?hx-1:hx+hw-1,hy+2,2,3,c)}
 else if(hs==='slick'){R(hx-1,hy-2,hw+2,3,c);R(hx,hy-3,hw-1,1,c);R(d>0?hx-2:hx+hw,hy-1,2,4,c);R(hx+2,hy-2,7,1,'#4a4a5a');R(hx+3,hy-3,3,1,'#5a5a6a')}
 else if(hs==='texture'){R(hx-1,hy-1,hw+2,3,c);for(let i=0;i<6;i++)R(hx-1+i*2+(i%2),hy-3-(i%3===1?1:0),2,2+(i%2),c);R(hx-1,hy+1,1,2,c);R(hx+hw,hy+1,1,2,c);R(hx+2,hy-2,1,1,'#3a3a3a');R(hx+7,hy-3,1,1,'#3a3a3a')}
 else if(hs==='fringe'){R(hx-1,hy-2,hw+2,4,c);R(hx-1,hy+2,hw+2,1,c);R(hx-1,hy+3,3,1,c);R(hx+hw-2,hy+3,3,1,c);R(hx-2,hy,2,6,c);R(hx+hw,hy,2,6,c);R(hx+3,hy-1,4,1,'#3a3a44')}
 else if(hs==='messy'){R(hx-1,hy-2,hw+2,4,c);R(hx-2,hy-4,3,3,c);R(hx+3,hy-5,3,3,c);R(hx+8,hy-4,4,3,c);R(hx-2,hy,2,3,c);R(hx+hw,hy,2,3,c)}
 else if(hs==='crop'){R(hx,hy-2,hw,4,c);for(let i=0;i<5;i++)R(hx+1+i*2,hy-3-(i%2),1,1,c);R(hx+2,hy-1,6,1,'#c8a86a')}
 else if(hs==='fade'){R(hx+1,hy-3,hw-2,4,c);R(hx,hy-1,hw,2,c);R(hx-1,hy+1,1,3,'rgba(18,14,12,.6)');R(hx+hw,hy+1,1,3,'rgba(18,14,12,.6)');R(hx+2,hy-3,7,1,'#2a2420')}
 else if(hs==='bun'){R(hx-1,hy-2,hw+2,4,c);R(hx-1,hy+2,2,4,c);R(hx+hw-1,hy+2,2,4,c);R(hx+3,hy-6,6,4,c);R(hx+4,hy-7,4,1,c);R(hx+4,hy-5,2,1,'#5a3a2a')}
 else if(hs==='bob'){R(hx-2,hy-2,hw+4,5,c);R(hx-2,hy+3,3,6,c);R(hx+hw-1,hy+3,3,6,c);for(let i=0;i<4;i++)R(hx-1+i*4,hy-3,3,1,c);R(hx+2,hy-1,3,1,'#d86a4a')}
 else if(hs==='perm'){for(let i=0;i<6;i++)for(let j=0;j<2;j++)R(hx-2+i*3,hy-4+j*3-(i%2),3,3,c);R(hx-3,hy,3,5,c);R(hx+hw,hy,3,5,c);R(hx+1,hy-4,2,1,'#efeceb')}
 else if(hs==='limp'){R(hx-1,hy-1,hw+2,3,c);R(hx-1,hy+2,2,9,c);R(hx+hw-1,hy+2,2,9,c);R(hx+2,hy+2,3,1,c)}
 else if(hs==='bald'){R(hx-1,hy+3,2,4,c);R(hx+hw-1,hy+3,2,4,c);R(hx+3,hy,4,1,'rgba(255,255,255,.35)')}
 else if(hs==='capr'){R(hx-1,hy-2,hw+2,4,'#c02a32');R(hx+1,hy-3,hw-2,1,'#c02a32');R(d>0?hx+hw-1:hx-4,hy+1,5,1,'#8a1a22');R(d>0?hx-1:hx+hw-1,hy+2,2,3,c);R(hx+4,hy-1,3,2,'#fff')}
 else if(hs==='receding'){R(hx-1,hy+1,2,5,c);R(hx+hw-1,hy+1,2,5,c);R(hx+1,hy-1,3,2,c);R(hx+hw-4,hy-1,3,2,c);if(o.messy){R(hx-3,hy-3,2,4,c);R(hx+hw+1,hy-4,2,5,c);R(hx+5,hy-3,1,2,c);R(hx+1,hy-4,1,3,c)}}
 else if(hs==='braids'){R(hx-1,hy-2,hw+2,4,c);R(hx+1,hy-3,hw-2,1,c);for(let i=0;i<4;i++){const bx=hx-2+i*(i<2?1:0)+(i>=2?hw-1+(i-2):0);R(bx,hy+1,1,hd+5,c);if(i%2)R(bx,hy+hd+5,1,1,'#e8c040')}for(let i=0;i<3;i++)R(hx+1+i*4,hy-2,1,3,'rgba(255,255,255,.18)');R(d>0?hx-3:hx+hw+1,hy+2,2,hd+6,c);R(d>0?hx-3:hx+hw+1,hy+hd+8,2,1,'#e8c040')}
 else if(hs==='ponytail'){R(hx-1,hy-2,hw+2,4,c);R(hx-1,hy+2,2,3,c);R(hx+hw-1,hy+2,2,3,c);R(d>0?hx-4:hx+hw+1,hy+1,3,9,c);R(d>0?hx-3:hx+hw+1,hy,2,1,'#c03030');R(hx+3,hy-1,3,1,'rgba(255,255,255,.2)')}
 else if(hs==='side'){R(hx-1,hy-2,hw+2,3,c);R(hx-1,hy+1,2,3,c);R(hx+hw-1,hy+1,2,3,c);R(hx+3,hy-2,1,2,'rgba(0,0,0,.3)');R(hx+4,hy+1,5,1,c)}
 else if(hs==='mod'){R(hx+1,hy-2,hw-2,1,c);R(hx,hy-1,hw,3,c);R(hx,hy+2,hw,1,c);for(let k=1;k<hw-1;k+=2)R(hx+k,hy+3,1,1,c);R(hx-1,hy,1,3,c);R(hx+hw,hy,1,3,c);R(hx+2,hy-1,4,1,'rgba(255,255,255,.14)')}
 else if(hs==='afro'){for(let i=-1;i<=hw;i+=2)for(let j=0;j<3;j++)R(hx-3+i+(j%2),hy-7+j*3,4,4,c);R(hx-4,hy-3,4,9,c);R(hx+hw,hy-3,4,9,c);R(hx-2,hy-8,hw+4,2,c);R(hx+2,hy-6,2,1,'rgba(255,255,255,.12)');R(hx+6,hy-4,2,1,'rgba(255,255,255,.12)')}
 else if(hs==='buzz'){R(hx,hy-1,hw,2,c);R(hx+1,hy-2,hw-2,1,c);R(hx,hy+1,1,2,c);R(hx+hw-1,hy+1,1,2,c)}
 else if(hs==='manbun'){R(hx-1,hy-2,hw+2,3,c);R(hx+3,hy-6,5,4,c);R(hx-1,hy+1,2,2,c);R(hx+hw-1,hy+1,2,2,c)}
 else if(hs==='straight'){R(hx-1,hy-2,hw+2,4,c);R(hx,hy-3,hw,1,c);R(hx-2,hy,2,6,c);R(hx+hw,hy,2,6,c);R(d>0?hx+hw-6:hx,hy+2,6,1,c);R(hx+2,hy-2,4,1,'rgba(255,255,255,.18)')}
 else if(hs==='helmet'){R(hx-3,hy-5,hw+6,8,c);R(hx-1,hy-7,hw+2,2,c);R(hx-3,hy+3,3,4,c);R(hx+hw,hy+3,3,4,c);for(let i=0;i<6;i++)R(hx-2+i*3,hy-6+(i%2),1,1,'#f4f4f4');R(hx+1,hy-4,4,1,'rgba(255,255,255,.55)')}
 else if(hs==='wetcurl'){R(hx-1,hy-1,hw+2,3,c);for(let i=0;i<5;i++)R(hx-1+i*3,hy-2,2,2,c);R(hx-2,hy+1,2,6,c);R(hx+hw,hy+1,2,6,c);R(hx+3,hy+2,1,3,c);R(hx+8,hy+2,1,4,c);R(hx+2,hy-1,5,1,'#f4ecc8');R(hx+hw,hy+7,1,2,'#f4ecc8')}
 else if(hs==='cone'){for(let i=0;i<14;i++){const w=Math.max(2,hw+4-i*1.1);R(x-w/2,hy+2-i,w,1,i===5||i===6||i===10?'#f4f4f0':'#f07a20')}R(hx-3,hy+2,hw+6,2,'#e06a10')}
 else if(hs==='net'){R(hx-1,hy-3,hw+2,5,c);for(let i=0;i<hw+2;i+=2)R(hx-1+i,hy-3,1,5,'rgba(255,255,255,.25)');R(hx-1,hy-1,hw+2,1,'rgba(90,90,120,.4)')}
 if(k.tache)R(ex-3,ey+2,7,1,k.tacheC||k.hair);
 if(k.beard){R(hx,hy+hd-5,2,4,k.hair);R(hx+hw-2,hy+hd-5,2,4,k.hair);R(hx+2,hy+hd-2,hw-4,2,k.hair)}
 if(k.glow&&Math.sin(T*1.7+1)>.92){R(x+8,hy-4,1,3,'#fff');R(x+7,hy-3,3,1,'#fff')}
}

/* ---------- full body ---------- */
function drawKid(k,x,y,o){
 o=o||{};x=Math.round(x);y=Math.round(y);drawKid._lens=null;
 const d=o.dir||1,p=o.pose,G=kidGeom(k,o),{legH,bodyH,bw}=G,top=o.topC||k.top,sk=k.skin;
 if(o.shake)x+=Math.round(Math.sin(T*38));
 const mv=o.moving,ph=o.walk||0,st=mv?Math.sin(ph):0,ct=mv?Math.cos(ph):0;
 const bob=o.still||p==='sit'||p==='write'?0:mv?(Math.abs(st)>.6?1:0):(Math.sin(T*2.2+k.seed)>.6?1:0);
 const run=o.fast&&mv&&!p;
 let lean=run?d:0;if(p==='lean'||p==='hurt'||p==='drag')lean=-d*2;if(p==='crouch')lean=d*2;if(p==='stab'||p==='overhead')lean=d;if(p==='headbutt')lean=d*(Math.sin(T*10)>0?4:2);if(p==='kiss')lean=d*2;if(p==='punch'&&o.punchT>T)lean=d;if(k.old)lean+=d;
 const bx=x-(bw>>1)+lean,lw=k.baggy?5:k.tight?3:4;
 /* legs */
 const shoe=k.tight?'#ddd':k.adult?'#1a1418':'#2a2a30';
 const leg=(lx,top_,h,f)=>{R(lx,y-h+top_,lw,h+f,k.pants);R(lx+(d>0?lw-1:0),y-h+top_+1,1,Math.max(0,h+f-2),'rgba(255,255,255,.1)');R(lx+(d>0?0:lw-1),y-h+top_,1,h+f,'rgba(0,0,0,.12)');if(k.shorts)R(lx,y-h+top_+3,lw,h-3+f,sk);if(k.skirt)R(lx,y-h+top_+4,lw-1,h-4+f,'#d9b49a');if(k.stripe)R(lx+(d>0?0:lw-1),y-h+top_,1,h+f,'#e8e8e8');if(k.cuff)R(lx,y-2+f,lw,1,'#a8c8ff');R(lx-(d<0?1:0),y-1+f,lw+1,1,shoe)};
 if(p==='sit'||p==='write'){R(x-3,y-4,bw-2,3,k.pants);R(x+d*4-1,y-3,lw,4,k.shorts?sk:k.pants);R(x+d*4-1,y,lw+1,1,shoe);R(x-1,y-4,lw,4,k.pants)}
 else if(p==='crouch'){/* sneak crouch: wide low stance, back foot behind on its toes, front knee forward; feet shuffle when moving */
  const M=(u,w)=>d>0?x+u:x-u-w,sh=mv?Math.round(st):0,P=k.shorts?sk:k.pants;
  R(M(-5,10),y-5,10,2,k.pants);
  R(M(-7,5),y-4,5,3,P);R(M(-8-sh,5),y-1,5,1,shoe);
  R(M(1,7),y-5,7,2,k.pants);R(M(4,4),y-3,4,2,P);R(M(4+sh,5),y-1,5,1,shoe);R(M(7+sh,1),y-1,1,1,'rgba(255,255,255,.18)');
  R(M(-4,8),y-4,8,1,'rgba(0,0,0,.18)')}
 else if(p==='kneel'){R(bx+1,y-3,bw-2,3,k.pants);R(bx-(d>0?2:-bw+3),y-1,5,1,shoe)}
 else if(p==='kick'){const kk=Math.sin(T*12)>0;R(bx+(d>0?1:bw-1-lw),y-legH,lw,legH,k.pants);R(bx+(d>0?1:bw-1-lw)-(d<0?1:0),y-1,lw+1,1,shoe);if(kk){R(d>0?bx+bw-2:bx-8,y-legH+1,10,lw-1,k.pants);R(d>0?bx+bw+7:bx-10,y-legH,3,lw,shoe)}else{R(bx+bw-1-lw,y-legH,lw,legH-2,k.pants)}}
 else if(p==='stomp'){const up=Math.sin(T*9)>0;R(bx+(d>0?1:bw-1-lw),y-legH,lw,legH,k.pants);R(bx+(d>0?1:bw-1-lw)-(d<0?1:0),y-1,lw+1,1,shoe);const kx=bx+(d>0?bw-1-lw:1);if(up){R(kx,y-legH,lw,legH-4,k.pants);R(kx+d*2,y-legH+legH-6,lw,3,k.pants);R(kx+d*2-(d<0?1:0),y-5,lw+1,2,shoe)}else{R(kx,y-legH,lw,legH,k.pants);R(kx-(d<0?1:0),y-1,lw+2,1,shoe)}}
 else if(p==='drag'){R(bx+1-d,y-legH,lw,legH,k.pants);R(bx-d,y-1,lw+1,1,shoe);R(bx+bw-1-lw-d*2,y-legH+1,lw,legH-1,k.pants);R(bx+bw-1-lw-d*3,y-1,lw+1,1,shoe)}
 else if(p==='lean'){R(bx+2,y-legH,lw,legH,k.pants);R(bx+1,y-1,lw+1,1,shoe);R(bx+4,y-legH,lw,legH-3,k.pants);R(bx+1+d,y-3,lw,2,k.pants);R(bx+d,y-2,lw+1,1,shoe)}
 else{const sx=Math.round(st*(run?3:2))*d,lf=[ct>.3?(run?-3:-2):0,ct<-.3?(run?-3:-2):0],lxs=[bx+1+sx,bx+bw-1-lw-sx];for(let i=0;i<2;i++)leg(lxs[i],0,legH,lf[i])}
 /* body */
 const by=y-legH-bodyH+bob+(p==='hurt'?1:0),bh=bodyH-bob;
 if(k.coat){R(bx-1,by,bw+2,bh+5,top);R(x+lean,by+3,1,bh+2,'#c8c6bc');R(bx-1,by+bh+4,bw+2,1,'#c8c6bc')}
 if(p==='crouch'){const M=(u,w)=>d>0?x+u:x-u-w,sd='rgba(0,0,0,.2)';R(M(-4,bw),by+4,bw,bh-4,top);R(M(-3,bw),by+2,bw,2,top);R(M(-2,bw),by,bw,2,top);R(M(-4,2),by+4,2,bh-4,sd);R(M(-3,2),by+2,2,2,sd);R(M(-2,2),by,2,2,sd)}
 else{R(bx,by,bw,bh,top);R(d>0?bx:bx+bw-2,by,2,bh,'rgba(0,0,0,.2)');/* fabric: lit edge, shoulder light, chin shadow, waist fold, hem */R(d>0?bx+bw-1:bx,by+1,1,bh-2,'rgba(255,255,255,.14)');R(bx+2,by,bw-4,1,'rgba(255,255,255,.12)');R(x-2+lean,by,4,1,'rgba(0,0,0,.28)');if(bh>6){R(bx+2,by+bh-4,bw-4,1,'rgba(0,0,0,.14)');R(x+(d>0?1:-2)+lean,by+bh-5,2,1,'rgba(0,0,0,.12)')}R(bx,by+bh-1,bw,1,'rgba(0,0,0,.22)')}
 if(k.apron){R(bx+1,by+3,bw-2,bh+3,'#f2f0ea');R(bx+2,by+2,bw-4,1,'#f2f0ea')}
 if(k.puffer){for(let i=2;i<bh;i+=3)R(bx,by+i,bw,1,'rgba(0,0,0,.28)');R(bx-1,by,bw+2,2,top)}
 if(k.hivis){R(bx,by+3,bw,2,'#e8f040');R(bx,by+7,bw,1,'#e8f040')}
 if(k.scarf){R(x+lean-3,by,7,2,'#d8a040');R(x+lean+2,by+2,2,5,'#d8a040')}
 if(k.cardigan){R(x+lean-1,by,2,bh,'rgba(0,0,0,.25)');R(x+lean-2,by+1,1,3,'#e8e2d0')}
 if(k.collar)R(x+lean-2,by,4,1,'#f4f4f4');
 if(k.hood){R(x+lean-2,by+1,1,3,'#e8e8e8');R(x+lean+1,by+1,1,3,'#e8e8e8')}
 if(k.zip)R(x+lean,by,1,bh,'rgba(255,255,255,.28)');
 if(k.tie){R(x+lean,by,1,6,'#a02030');R(x+lean-1,by+1,3,1,'#a02030')}
 if(k.chain){R(x+lean-3,by+1,1,2,'#e8c040');R(x+lean-2,by+3,5,1,'#e8c040');R(x+lean+2,by+1,1,2,'#e8c040');R(x+lean,by+4,1,1,'#fff09a')}
 if(k.pearls)for(let i=0;i<5;i++)R(x+lean-3+i*1.5,by+1+(i===2?1:0),1,1,'#fff');
 if(k.whistle){R(x+lean-2,by,1,4,'#e8e8e8');R(x+lean+1,by,1,4,'#e8e8e8');R(x+lean-1,by+4,3,2,'#c0c0c0')}
 if(k.num){R(x+lean-1,by+3,3,4,'#fff');R(x+lean,by+4,1,2,top)}
 if(k.girl&&!k.adult)R(bx,by+bh-2,bw,1,'rgba(0,0,0,.14)');
 /* arms */
 const fs=d>0?bx+bw:bx-2,bs=d>0?bx-2:bx+bw,sl=k.tee?sk:top,sw=Math.round(st*2);
 const arm=(ax,ay,h,hand)=>{R(ax,ay,2,Math.min(2,h),top);if(h>2)R(ax,ay+2,2,h-2,sl);if(hand!==false)R(ax,ay+h,2,2,sk)};
 let hx=fs,hy=by+8;   // front-hand position, for held items
 const back=()=>arm(bs,by+1,6);
 let gl_=null;if(o.tr&&o.tr.k<1&&typeof glideArms==='function')gl_=glideArms(o.tr,p,{bx,bw,by,d,top,sl,sk,x,lean,fs,bs});
 if(gl_){hx=gl_.hx;hy=gl_.hy}else switch(p){
  case'cross':case'lean':R(bx-2,by+1,2,5,top);R(bx+bw,by+1,2,5,top);R(bx-1,by+4,bw+2,3,top);R(bx+1,by+5,2,2,sk);R(bx+bw-3,by+4,2,2,sk);hx=x;hy=by+5;break;
  case'hips':R(bx-3,by+1,2,4,top);R(bx-3,by+5,3,2,sl);R(bx-1,by+6,2,2,sk);R(bx+bw+1,by+1,2,4,top);R(bx+bw,by+5,3,2,sl);R(bx+bw-1,by+6,2,2,sk);hx=fs;hy=by+6;break;
  case'point':back();R(d>0?bx+bw:bx-7,by+2,7,2,sl);R(d>0?bx+bw+7:bx-10,by+1,3,2,sk);hx=d>0?bx+bw+8:bx-10;hy=by+1;break;
  case'punch':{back();const out=o.punchT>T,e=out?8:3,x0=d>0?bx+bw:bx-e;R(x0,by+2,e,3,sl);const fx=d>0?x0+e:x0-3;R(fx,by+1,3,4,sk);hx=fx;hy=by+2;break}
  case'slam':{const u=Math.sin(T*12)>0;R(fs,u?by-6:by+1,2,u?8:6,sl);R(fs,u?by-8:by+7,3,3,sk);R(bs,u?by-6:by+1,2,u?8:6,sl);hx=fs;hy=u?by-8:by+7;break}
  case'up':case'cheer':{const pm=p==='cheer'&&Math.sin(T*9+k.seed)>0?2:0;for(const ax of[bx-2,bx+bw]){R(ax,by-5+pm,2,8-pm,sl);R(ax,by-7+pm,2,2,sk)}hx=fs;hy=by-7+pm;break}
  case'cover':case'cry':for(const ax of[bx-2,bx+bw]){R(ax,by-1,2,5,sl);R(ax+(ax<x?2:-2),by-5,3,4,sk)}hx=fs;hy=by-4;break;
  case'facepalm':back();R(fs,by-1,2,5,sl);R(fs-d*3,by-6,4,4,sk);hx=fs;hy=by-5;break;
  case'wave':{back();const w=Math.sin(T*10)>0?1:0;R(fs,by-5,2,7,sl);R(fs+w*d,by-8,2,3,sk);hx=fs;hy=by-8;break}
  case'shrug':R(bx-4,by+5,4,2,sl);R(bx-5,by+4,2,2,sk);R(bx+bw,by+5,4,2,sl);R(bx+bw+3,by+4,2,2,sk);hx=fs;hy=by+4;break;
  case'hold':case'choke':{const yy=p==='choke'?by+1:by+4;back();R(d>0?bx+bw:bx-8,yy,8,2,sl);R(d>0?bx+bw+8:bx-10,yy-1,2,3,sk);hx=d>0?bx+bw+8:bx-10;hy=yy;break}
  case'grab':back();R(d>0?bx+bw:bx-6,by+2,6,2,sl);R(d>0?bx+bw+6:bx-8,by+1,2,3,sk);hx=d>0?bx+bw+6:bx-8;hy=by+1;break;
  case'carry':R(d>0?bx+bw-2:bx-3,by+5,5,2,sl);R(d>0?bx+bw+3:bx-5,by+4,2,2,sk);R(bs,by+1,2,4,top);hx=d>0?bx+bw+3:bx-5;hy=by+4;break;
  case'phone':back();R(fs,by+1,2,4,sl);R(fs+d*2-(d<0?1:0),by+3,3,2,sk);R(fs+d*3-(d<0?2:0),by+1,3,4,'#262938');R(fs+d*3-(d<0?2:0)+1,by+2,1,2,'#bfe8ff');hx=-99;break;
  case'film':{back();const fx=d>0?bx+bw+3:bx-8;R(d>0?bx+bw:bx-4,by-1,4,2,sl);R(fx,by-5,6,4,'#262938');R(fx+(d>0?1:1),by-4,4,2,'#bfe8ff');if(Math.sin(T*6)>0)R(fx+(d>0?5:0),by-6,1,1,'#ff3030');R(d>0?bx+bw+2:bx-4,by-2,2,2,sk);hx=-99;break}
  case'throw':back();R(fs-d*2,by-6,2,8,sl);R(fs-d*3,by-8,3,3,sk);hx=fs-d*3;hy=by-8;break;
  case'hug':case'kiss':R(d>0?bx+bw-2:bx-8,by+3,10,2,sl);R(d>0?bx+bw-2:bx-8,by+6,10,2,sl);R(d>0?bx+bw+7:bx-9,by+3,2,5,sk);hx=-99;break;
  case'write':back();R(d>0?bx+bw:bx-5,by+5,5,2,sl);R(d>0?bx+bw+4+(Math.sin(T*8)>0?1:0):bx-7,by+4,2,2,sk);hx=d>0?bx+bw+5:bx-7;hy=by+3;break;
  case'sit':R(d>0?bx+bw-1:bx-3,by+5,4,2,sl);R(d>0?bx+bw+2:bx-4,by+5,2,2,sk);back();hx=d>0?bx+bw+2:bx-4;hy=by+5;break;
  case'dribble':{back();const b=Math.abs(Math.sin(T*7));R(fs,by+1,2,6,sl);R(fs,by+7,2,2,sk);hx=-99;R(fs+d*2-1,by+9+b*(legH-2),4,4,'#e0702a');R(fs+d*2,by+10+b*(legH-2),2,1,'#3a1a0a');break}
  case'hurt':back();R(fs-d*2,by+4,4,2,sl);R(fs-d*3,by+4,2,2,sk);hx=-99;break;
  case'drink':back();R(fs,by-1,2,4,sl);R(fs-d,by-3,2,2,sk);hx=fs-d*2;hy=by-4;break;
  case'mic':back();R(fs,by+1,2,4,sl);R(fs-d*2,by-1,3,3,sk);R(fs-d*3,by-4,2,3,'#333');R(fs-d*3,by-5,2,1,'#888');hx=-99;break;
  case'headbutt':R(bs-d*2,by+2,2,6,sl);R(fs-d*2,by+2,2,6,sl);R(bs-d*2,by+8,2,2,sk);hx=-99;break;
  case'kick':R(bx-4,by+2,4,2,sl);R(bx+bw,by+2,4,2,sl);hx=-99;break;
  case'reach':back();R(d>0?bx+bw:bx-4,by-1,4,3,sl);R(d>0?bx+bw+2:bx-5,by-6,3,6,sl);R(d>0?bx+bw+2:bx-5,by-9,3,3,sk);hx=d>0?bx+bw+2:bx-5;hy=by-9;break;
  case'zombie':R(d>0?bx+bw:bx-8,by+2,8,2,sl);R(d>0?bx+bw+8:bx-10,by+1,2,3,sk);R(d>0?bx+bw-3:bx-5,by+4,8,2,sl);R(d>0?bx+bw+5:bx-7,by+3,2,3,sk);hx=-99;break;
  case'conduct':{back();const w=Math.sin(T*8);R(fs,by-3,2,6,sl);R(fs+d*Math.round(w*2),by-6,2,3,sk);R(fs+d*(Math.round(w*2)+1),by-14,1,9,'#f4f0e6');hx=-99;break}
  case'paint':{back();const w=Math.sin(T*6)*2|0;R(d>0?bx+bw:bx-6,by+1+w,6,2,sl);R(d>0?bx+bw+6:bx-8,by+w,2,3,sk);R(d>0?bx+bw+7:bx-10,by-2+w,1,4,'#8a6a3a');R(d>0?bx+bw+7:bx-10,by-3+w,1,1,'#e04060');hx=-99;break}
  case'type':{const a1=Math.sin(T*16)>0?1:0;R(d>0?bx+bw-2:bx-4,by+5-a1,6,2,sl);R(d>0?bx+bw+3:bx-5,by+5-a1,2,2,sk);R(d>0?bx+bw-6:bx,by+6-(1-a1),6,2,sl);R(d>0?bx+bw-1:bx-1,by+6-(1-a1),2,2,sk);hx=-99;break}
  case'swim':{const a1=Math.sin(T*5);R(bx-2,by-6+Math.round(a1*3),2,8,sl);R(bx-2,by-8+Math.round(a1*3),2,2,sk);R(bx+bw,by-6-Math.round(a1*3),2,8,sl);R(bx+bw,by-8-Math.round(a1*3),2,2,sk);hx=-99;break}
  case'saw':{const a1=Math.sin(T*10)*2|0;R(d>0?bx+bw-2+a1:bx-6+a1,by+4,8,2,sl);R(d>0?bx+bw+6+a1:bx-8+a1,by+3,2,3,sk);back();hx=d>0?bx+bw+7+a1:bx-8+a1;hy=by+3;break}
  case'sing':R(bx-1,by+3,bw+2,2,sl);R(x-1+lean,by+3,3,3,sk);R(bx-2,by+1,2,3,top);R(bx+bw,by+1,2,3,top);hx=-99;break;
  case'overhead':{const sw=Math.sin(T*10)>.2;const ty=sw?by-12:by-4;R(x-2+lean,ty,2,by-ty+2,sl);R(x+1+lean,ty,2,by-ty+2,sl);R(x-1+lean,ty-2,4,3,sk);hx=x+lean+d;hy=ty-2;break}
  case'stab':{back();const ph_=Math.sin(T*14)>0;const ex_=ph_?7:3;R(d>0?bx+bw:bx-ex_,by+3,ex_,2,sl);R(d>0?bx+bw+ex_:bx-ex_-2,by+3,2,3,sk);hx=d>0?bx+bw+ex_:bx-ex_-2;hy=by+5;break}
  case'drag':R(d>0?bx-7:bx+bw,by+4,7,2,sl);R(d>0?bx-9:bx+bw+7,by+3,2,3,sk);R(fs,by+1,2,5,sl);hx=d>0?bx-9:bx+bw+7;hy=by+4;break;
  case'stomp':R(bx-4,by+1,4,2,sl);R(bx-5,by-1,2,2,sk);R(bx+bw,by+1,4,2,sl);R(bx+bw+3,by-1,2,2,sk);hx=-99;break;
  case'crouch':{const M=(u,w)=>d>0?x+u:x-u-w,a1=mv?Math.round(st):0;
   R(M(-4,2),by+3,2,3,top);R(M(-4-Math.max(0,a1),2),by+6,2,2,sk);
   if(!o.torch){R(M(6,2),by+3,2,2,top);R(M(7+a1,2),by+5,2,2,sl);R(M(8+a1,2),by+7,2,2,sk)}hx=M(8+a1,2);hy=by+7;break}
  case'kneel':R(bx-2,by+1,2,6,sl);R(bx-2,by+7,2,2,sk);R(fs,by+2,2,4,sl);R(fs+d*2,by+5,2,2,sk);hx=fs+d*2;hy=by+5;break;
  default:
   if(run){const s2=Math.round(st*3);R(bx-2+s2,by+1,2,4,top);R(bx-2+s2+d,by+5,2,2,sl);R(bx-2+s2+d,by+6,2,2,sk);R(bx+bw-s2,by+1,2,4,top);R(bx+bw-s2+d,by+5,2,2,sl);R(bx+bw-s2+d,by+6,2,2,sk);hx=-99;break}
   if(o.torch){if(d>0)arm(bx-2+sw,by+1,6);else arm(bx+bw-sw,by+1,6)}else{arm(bx-2+sw,by+1,6);arm(bx+bw-sw,by+1,6)}hx=d>0?bx+bw-sw:bx-2+sw;hy=by+7;
 }
 /* a flashlight or lantern gripped in the front hand */
 if(o.torch){const cr=p==='crouch',sx=cr?(d>0?x+6:x-8):(d>0?bx+bw:bx-2),sy=cr?by+3:by+1,F=(u,w)=>d>0?sx+u:sx+2-u-w;
  if(o.torch==='lantern'){R(F(0,2),sy,2,4,top);R(F(1,2),sy+4,2,3,sl);R(F(1,2),sy+7,2,2,sk);R(F(1,1),sy+9,1,2,'#2a2014');R(F(0,4),sy+11,4,5,'#4a3418');R(F(1,2),sy+12,2,3,'#ffc860');R(F(0,4),sy+11,4,1,'#6a4c24');drawKid._lens={dx:F(1,2)+1-x,dy:sy+13-y,lantern:1}}
  else{R(F(0,2),sy,2,2,top);R(F(1,4),sy+2,4,2,sl);R(F(4,6),sy+2,6,2,'#30303a');R(F(6,1),sy+2,1,2,'#4a4a56');R(F(9,2),sy+1,2,4,'#585866');R(F(9,2),sy+1,2,1,'#7a7a88');R(F(11,1),sy+2,1,2,o.torch==='off'?'#5a5a60':'#fff6c0');
   R(F(4,3),sy+1,3,3,sk);R(F(4,3),sy+3,3,1,'rgba(0,0,0,.18)');R(F(4,1),sy+1,1,1,'rgba(255,255,255,.2)');drawKid._lens={dx:F(12,1)-x,dy:sy+3-y}}}
 /* head */
 const {hw,hd}=G,hTop=by-hd+1+(k.old?1:0)+(p==='crouch'?1:0);
 const hcx=x+lean+(p==='headbutt'?d*2:0)+(p==='kiss'?d*1:0)+(p==='crouch'?d*2:0);
 if(!o.noHead)drawHead(k,hcx,hTop,d,o);
 else{R(hcx-3,by-2,6,3,BLOOD[1]);R(hcx-2,by-3,4,1,'#f1e6da');R(hcx-1,by-4,2,1,BLOOD[2])}
 if(o.bloody){R(bx+2,by+2,2,2,BLOOD[2]);R(bx+5,by+4,3,2,BLOOD[1]);R(bx+3,by+6,2,1,BLOOD[2])}
 if(o.hold&&hx!==-99)drawHeld(o.hold,hx,hy,d);
 return{hx:hcx,hy:hTop,by};
}

/* ---------- held items ---------- */
function drawHeld(it,x,y,d){
 switch(it){
  case'pen':R(x-1,y-4,1,6,'#d82020');R(x-1,y-5,1,1,'#fff');break;
  case'mug':R(x-2,y-2,5,5,'#e8e2d6');R(x+(d>0?3:-3),y-1,1,3,'#e8e2d6');R(x-2,y-2,5,1,'#6a3a1a');R(x-1,y,3,1,'#d06a3a');break;
  case'plan':case'note':case'paper':R(x-3,y-4,6,7,'#f4f0e6');R(x-2,y-2,4,1,'#9aa');R(x-2,y,3,1,'#9aa');if(it==='note')R(x+1,y-3,1,1,'#e05a7a');break;
  case'ball':R(x-2,y-2,4,4,'#f4f2ea');R(x-1,y-2,1,4,'#d83a3a');break;
  case'bball':R(x-2,y-3,5,5,'#e0702a');R(x,y-3,1,5,'#3a1a0a');break;
  case'dodge':R(x-3,y-3,6,6,'#b8202c');R(x-2,y-3,2,1,'#e86a6a');break;
  case'medball':R(x-3,y-3,7,7,'#3a3a3a');R(x-2,y-2,2,1,'#6a6a6a');break;
  case'tray':R(x-6,y-1,12,2,'#9aa0aa');R(x-4,y-3,3,2,'#e8c04a');R(x,y-3,3,2,'#7a9a3a');break;
  case'padlock':R(x-2,y-1,4,4,'#c8b040');R(x-1,y-3,2,2,'#888');R(x-1,y+3,1,6,'#3a3a4a');break;
  case'mic':R(x-1,y-4,2,4,'#333');R(x-1,y-5,2,1,'#888');break;
  case'javelin':R(x-14,y-1,30,1,'#c8c8c8');R(x+16*d,y-1,2,1,'#fff');break;
  case'cleaver':R(x-1,y-1,2,4,'#5a3a2a');R(x-3+(d>0?2:0),y-7,5,6,'#c8ccd0');R(x-3+(d>0?2:0),y-7,5,1,'#fff');break;
  case'knife':R(x-1,y-1,2,3,'#5a3a2a');R(x-1,y-6,1,5,'#dfe6ea');break;
  case'powder':R(x-2,y-2,5,4,'#1a1a1a');R(x-2,y-2,5,1,'#e8e8e8');R(x-1,y,3,1,'#c03030');break;
  case'tape':R(x-2,y-2,5,5,'#a8a8a8');R(x-1,y-1,3,3,'#555');break;
  case'cookie':R(x-2,y-2,5,4,'#c8904a');R(x-1,y-1,1,1,'#4a2a1a');R(x+1,y,1,1,'#4a2a1a');break;
  case'book':R(x-3,y-3,6,7,'#7a2a3a');R(x-3,y-3,1,7,'#4a1a2a');break;
  case'flask':R(x-1,y-5,2,2,'#c8e8e0');R(x-2,y-3,4,5,'#c8e8e0');R(x-2,y,4,2,'#6aff8a');break;
  case'cd':R(x-2,y-3,5,5,'#c8c8d8');R(x,y-1,1,1,'#333');break;
  case'key':R(x-1,y-2,3,3,'#d8b84a');R(x,y+1,1,3,'#d8b84a');break;
  case'chair':R(x-6,y-10,8,2,'#3a4a8a');R(x-6,y-10,2,14,'#9aa0aa');R(x,y-10,2,14,'#9aa0aa');break;
  case'phone':R(x-1,y-3,3,5,'#262938');R(x,y-2,1,3,'#bfe8ff');break;
  case'flower':R(x,y-6,1,6,'#3a8a3a');R(x-1,y-8,3,2,'#9a4ae0');R(x,y-9,1,1,'#c88aff');break;
  case'guitarpick':R(x-1,y-1,3,2,'#e05a3a');break;
  case'guitar':R(x-7,y-1,10,6,'#8a4a2a');R(x-6,y,8,4,'#a8603a');R(x-3,y+1,3,2,'#2a1a10');R(x+3,y-3,9,2,'#5a3a20');R(x+11,y-4,2,3,'#3a2a1a');break;
  case'football':R(x-2,y-2,5,5,'#f4f4f0');R(x,y-1,1,1,'#1a1a1a');R(x-2,y+1,1,1,'#1a1a1a');R(x+2,y+1,1,1,'#1a1a1a');break;
  case'brush':R(x,y-6,1,7,'#8a6a3a');R(x,y-7,1,1,'#e04060');break;
  case'baton':R(x,y-9,1,9,'#f4f0e6');break;
  case'plank':R(x-10,y-1,22,3,'#c8985a');R(x-10,y-1,22,1,'#e8b878');break;
  case'watch':{const sw=Math.sin(T*3)*5;R(x,y,1,6,'#c8b040');R(x+Math.round(sw)-1,y+6,4,4,'#e8d060');R(x+Math.round(sw),y+7,2,2,'#fff8c0');break}
  case'laptop':R(x-4,y-1,8,2,'#3a3a44');R(x-4,y-6,8,5,'#2a2a34');R(x-3,y-5,6,3,'#7ab0e0');break;
  case'clipboard':R(x-3,y-4,6,8,'#a8784a');R(x-2,y-3,4,6,'#f4f0e6');R(x-1,y-5,2,1,'#888');break;
 }
}

/* ---------- actors on stage ---------- */
function drawActor(a){
 const k=a.k;if(!k)return;
 if(a.alpha<1)g.globalAlpha=Math.max(0,a.alpha);
 if(k.ghost)g.globalAlpha=Math.min(g.globalAlpha,.62+Math.sin(T*3+a.x)*.12);
 let messy=false;if(k.adam){const L=adamLvl();messy=L>=3;if(!a.ex)a._ex=['happy','smirk','shock','smirk','yell','evil','shock','evil','sad'][L];if(L>=5)a.hurt=0}
 const y=Math.round(a.y-(a.z||0));
 if(a.dead||a.pose==='lie'){
  if(a.pool!=null&&P.set.gore){const w=a.pool;R(a.x-w/2,a.y-1,w,3,BLOOD[1]);R(a.x-w/2+2,a.y,w-4,1,BLOOD[2]);R(a.x-w*.3,a.y+2,w*.5,1,BLOOD[0])}
  g.save();g.translate(Math.round(a.x),y-5);g.rotate((a.dir>0?-1:1)*Math.PI/2);
  drawKid(k,0,5,{dir:1,still:1,hs:a.hs,ex:a.dead?'dead':(a.ex||'closed'),noHead:a.dead==='head',crushed:a.dead==='crush',hurt:a.hurt,bloody:a.dead||a.bloody,hold:null});
  g.restore();
  if(a.dead==='impale'){R(a.x-18,a.y-22,1,24,'#c8c8c8');R(a.x-18,a.y-23,1,1,'#fff')}
  if(a.dead==='melt'){R(a.x-12,a.y-2,24,3,'#6aff8a55')}
  g.globalAlpha=1;return;
 }
 if(!a.sitHigh&&a.pose!=='sit'&&a.pose!=='write'){const zz=a.z||0,sw_=Math.max(4,12-zz*.4);g.globalAlpha=Math.min(g.globalAlpha,.22);R(a.x-sw_/2,a.y,sw_,2,'#000');g.globalAlpha=k.ghost?Math.min(1,.62+Math.sin(T*3+a.x)*.12):(a.alpha<1?Math.max(0,a.alpha):1)}
 drawKid(k,a.x,y,{tr:a._trK,fast:a.fast,messy,dir:a.dir,moving:a.moving,walk:a.walk,pose:a.air&&!a.pose?'up':a.pose,ex:a.ex||a._ex||(a.air?'shock':null),talk:a.talk,hold:a.hold,hurt:a.hurt,bloody:a.bloody,shake:a.shake,punchT:a.punchT,still:a.still,hairC:a.hairC,topC:a.topC,hs:a.hs||(a.id==='dheva'&&(typeof D!=="undefined"&&D)&&D.f&&D.f.dheva1&&!D.f.dhevaFixed?'limp':null)});

 g.globalAlpha=1;
}
function drawTalkMark(a){const G=kidGeom(a.k,a),top=a.y-(a.z||0)-G.legH-G.bodyH-G.hd-6-(a.k.hs==='fluffy'||a.k.hs==='bun'?4:0)+(Math.sin(T*6)>0?1:0);R(a.x-2,top,5,1,'#fff');R(a.x-1,top+1,3,1,'#fff');R(a.x,top+2,1,1,'#fff')}

/* ---------- props ---------- */
function drawProp(p){
 if(p.follow){const f=A[p.follow];if(!f||!f.vis||f.dead)return;p.x=f.x+(p.dx||0)*f.dir;p.y=f.y+(p.layer||0);p.oy=p.dy||0}
 const x=Math.round(p.x),y=Math.round(p.y+(p.oy||0));
 switch(p.t){
  case'head':{const k=K[p.id];g.save();g.translate(x,y);g.rotate((p.rot||0));drawHead(k,0,-6,1,{ex:'dead'});R(-3,5,6,2,BLOOD[1]);g.restore();break}
  case'ball':case'bball':case'dodge':case'medball':case'cookie':case'powder':case'mug':case'plan':case'paper':case'note':case'tape':case'pen':case'phone':case'cd':case'key':case'flower':case'padlock':case'tray':drawHeld(p.t,x,y,p.dir||1);break;
  case'javelin':g.save();g.translate(x,y);g.rotate(p.rot||0);R(-15,0,30,1,'#d0d0d0');R(15,0,2,1,'#fff');R(-3,-1,6,1,'#7a4a2a');g.restore();break;
  case'fire':for(let i=0;i<(p.n||8);i++){const fx=x+(hsh(i+p.t0)-.5)*(p.w||16),fh=4+((T*14+i*3)%7);R(fx,y-fh,2,fh,i%3?'#f0a030':'#f0e070');R(fx,y-fh-1,1,1,'#ff5020')}R(x-(p.w||16)/2,y,(p.w||16),1,'#3a2a2a');break;
  case'smoke':for(let i=0;i<6;i++){const q=(T*.4+i/6)%1;g.globalAlpha=(1-q)*.5;R(x+(hsh(i)-.5)*14+q*8,y-q*40,6,5,'#8a8a96')}g.globalAlpha=1;break;
  case'chair':R(x-5,y-12,9,2,'#3a4a8a');R(x-5,y-10,1,10,'#9aa0aa');R(x+3,y-10,1,10,'#9aa0aa');R(x-5,y-7,9,2,'#3a4a8a');break;
  case'hole':R(x-14,y-2,28,5,'#050307');R(x-15,y-2,1,5,'#3a2a20');R(x+14,y-2,1,5,'#3a2a20');R(x-12,y-2,24,1,'#1a1012');break;
  case'tooth':R(x,y,2,2,'#f4f0e0');break;
  case'heart':{const q=T-p.t0;if(q<2){g.globalAlpha=Math.max(0,1-q/2);const yy=y-q*16;R(x-2,yy,2,2,'#ff6a8a');R(x+1,yy,2,2,'#ff6a8a');R(x-2,yy+1,5,2,'#ff6a8a');R(x-1,yy+3,3,1,'#ff6a8a');R(x,yy+4,1,1,'#ff6a8a');g.globalAlpha=1}break}
  case'text':{g.font='8px KenPixel,monospace';g.fillStyle=p.c||'#fff';g.textAlign='center';g.fillText(p.s,x,y);g.textAlign='left';break}
  case'sparkle':if(Math.sin(T*5+x)>0){R(x,y-2,1,5,'#fff6c0');R(x-2,y,5,1,'#fff6c0')}else R(x,y,1,1,'#fff6c0');break;
  case'locker':R(x,y,14,30,'#3a5a8a');R(x+1,y+3,12,1,'#2a3a5a');R(x+1,y+5,12,1,'#2a3a5a');break;
  case'bunsen':R(x-1,y-6,2,6,'#888');R(x-3,y,6,1,'#555');if(p.lit){R(x-1,y-11,2,5,'#6aa8ff');R(x,y-13,1,2,'#c8e8ff')}break;
  case'pa':R(x-2,y-8,4,8,'#333');break;
 }
}

/* ---------- crowds: everyone circling a fight ---------- */
const CROWD_K=['kid1','kid2','kid3','kid4','tyler'];
function crowdKid(i){const base=K[CROWD_K[i%CROWD_K.length]];return Object.assign({},base,{top:['#3a4a7a','#7a3a3a','#5a7a4a','#4a4a5a','#8a6a3a','#2a6a7a','#6a3a6a'][i%7],seed:50+i,hair:['#3a2a1a','#151010','#c8a050','#101010','#7a4a2a'][i*3%5]})}
function drawCrowdBack(c){for(let i=0;i<(c.n||14);i++){const k=crowdKid(i),x=8+i*(304/((c.n||14)-1)),y=132+(i%2)*3;if(c.gap&&x>c.gap[0]&&x<c.gap[1])continue;const ps=c.phones&&i%3===0?'film':c.cheer?(i%3===1?'cheer':'up'):null;drawKid(k,x,y,{dir:x<160?1:-1,pose:ps,ex:c.cheer?(i%2?'yell':'happy'):'shock'})}}
function drawCrowdFront(c){for(let i=0;i<(c.front||7);i++){const k=crowdKid(i+20),x=20+i*46+(i%2)*6,y=196;g.globalAlpha=.95;drawKid(k,x,y,{dir:i%2?-1:1,pose:c.cheer&&i%2?'cheer':(c.phones&&i%3===0?'film':null),ex:'yell'});g.globalAlpha=1}R(0,176,W,4,'rgba(0,0,0,.3)')}

/* ---------- romance petals ---------- */
function drawPetals(a){for(let i=0;i<26;i++){const x=(hsh(i)*360+T*(8+hsh(i+5)*10)+Math.sin(T+i)*6)%340-10,y=(hsh(i+3)*200+T*(10+hsh(i+7)*14))%200-10;g.globalAlpha=a*.9;R(x,y,2,1,i%3?'#ffb3cf':'#fff0f5');g.globalAlpha=1}}

/* ---------- portrait in the dialogue box: the same sprite, scaled by whole pixels ---------- */
const pcv=$('portrait'),pg=pcv.getContext('2d');pg.imageSmoothingEnabled=false;
let portraitWho=null;
function drawPortrait(who){portraitWho=who;$('portraitBox').classList.toggle('on',!!(who&&K[who]));portraitTick()}
function portraitTick(){
 const who=portraitWho;if(!who||!K[who])return;
 const k=K[who],a=A[who]||{},o={dir:1,hs:a.hs||(who==='dheva'&&(typeof D!=="undefined"&&D)&&D.f&&D.f.dheva1&&!D.f.dhevaFixed?'limp':null),ex:a.dead?'dead':a.ex,talk:DL&&DL.who===who&&!DL.done,hurt:a.hurt,still:1};
 const saved=g;g=pg;
 R(0,0,26,26,'#1a1528');R(0,18,26,8,'#231c33');
 const G=kidGeom(k,o);drawKid(k,13,8+G.hd+G.bodyH+G.legH-1+(k.knob?1:0)+(k.hs==='fluffy'||k.hs==='bun'?2:0),o);
 g=saved;
}
