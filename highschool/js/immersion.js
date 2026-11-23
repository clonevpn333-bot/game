'use strict';
/* =====================================================================
   HIGHSCHOOL — immersion pass.
   Every prompt has to match the picture: if a choice says someone is hiding,
   screaming, texting or crying, they are visibly doing it before you ask.
   Rooms show the things missions talk about (the laptop, the bomb box, the scooters).
   ===================================================================== */
const LOOKS=[
 ['instella','Ask Sean why he’s hiding',{pose:'cover',ex:'scared'}],
 ['instella','Get Stella’s ball off Arjun',{pose:null,hold:'ball',ex:'smirk'}],
 ['corey','Get Corey to talk to Abby',{ex:'blush',dir:1}],
 ['beep','Ask Alex what’s wrong',{pose:null,hold:null,ex:'scared'}],
 ['voss','Ask Corey what he’s doing in here',{hold:'powder',ex:'blush'}],
 ['alex','Help Alex get his hat-trick',{pose:null,hold:'football',ex:'happy'}],
 ['dheva','Get Dheva’s powder off Arjun',{pose:null,hold:'powder',ex:'smirk'}],
 ['paul','Enter Paul’s Royal Rumble',{pose:'hips',ex:'happy'}],
 ['jacob','Sit with Jacob',{pose:'carry',hold:'tray',ex:'sad'}],
 ['headcase','Ask Mr. Adam if he’s okay',{x:162,dir:-1,ex:'sad',pose:null}],
 ['headcase','Ask Mia what she knows',{hold:'paper',ex:'angry'}],
 ['headcase','What’s in the box, sir?',{pose:'mic'}],
 ['armoury','Ask Tez what he’s selling',{x:292,dir:-1,pose:'lean',ex:'smirk'}],
 ['armoury','Buy a weapon off Tez',{x:292,dir:-1,pose:'lean',ex:'smirk'}],
 ['register','Ask the sixth grade if he’s lost',{ex:'sad',dir:-1}],
 ['opps','Ask Kayden what he’s doing',{pose:'cross',ex:'angry'}],
 ['opps','Ride out with Kayden',{hold:'soaker',ex:'smirk'}],
 ['hasanmia','Help Hasan with Mia',{hold:'mug',ex:'scared',dir:1}],
 ['smallhours','Listen to Abby play',{x:196,y:138,pose:'sit',hold:'guitar',ex:'closed'}],
 ['tea','Ask Stella what’s wrong',{pose:'cover',ex:'cry'}],
 ['catfish','Ask Kenneth who he keeps texting',{pose:'phone',ex:'love'}],
 ['catfish','Wait for Jess with Kenneth',{topC:'#c8202c',ex:'scared',pose:null}],
 ['kaivibes','Ask Nivaan why he’s screaming',{pose:'phone',ex:'yell',shake:1}],
 ['groupchat','Ask Omer why he’s staring at his phone',{pose:'phone',ex:'angry'}],
 ['leaked','Ask Kenneth why he looks sick',{pose:'phone',ex:'scared'}],
 ['emergency','Nick Corey’s curl cream',{x:122,dir:-1,pose:'reach',ex:'smirk'}],
 ['emergency','Watch Corey do his last touch-up',{hold:'powder',ex:'smirk'}],
 ['calling','Ask Aidan about Fridays',{ex:'sad'}]
];
for(const h of HOOKS){
 if(h.mis==='armoury'&&h.label==='Knock on the end cubicle')h.label='Ask Tez what he’s selling';
 const L=LOOKS.find(l=>l[0]===h.mis&&l[1]===h.label);if(L)h.look=L[2];
}
/* Tez keeps "office hours" by the end cubicle, like he says */
for(const i of[0,2,4,5])if(ROSTER[i]&&ROSTER[i].toilets)for(const e of ROSTER[i].toilets)if(e[0]==='tez'){e[1]=292;e[2]=-1}

/* things the missions talk about are physically there */
function roomDressing(){
 props=props.filter(p=>!p.dress);
 const add=o=>prop(Object.assign({dress:1,keep:1},o));
 if(D.room==='bus'&&D.period===7&&!D.done.headcase&&A.adam)add({t:'bomb',x:96,y:158,secs:120,layer:2});
 if(D.room==='library'&&D.period===4&&D.f.tea1&&!D.f.teaProof)add({t:'laptop',x:112,y:146,layer:20});
 if(D.room==='foodcourt'&&D.period===8&&A.abby&&A.abby.hold==='guitar')add({t:'guitarcase',x:214,y:150});
}

/* new held/prop art the missions need */
const _dp2=drawProp;
drawProp=function(p){
 const x=Math.round(p.x),y=Math.round(p.y);
 if(p.t==='laptop'){drawHeld('laptop',x,y,1);return}
 if(p.t==='guitarcase'){R(x-10,y-2,22,6,'#2a1a14');R(x-9,y-1,20,4,'#6a2a3a');R(x-4,y,2,1,'#c8b040');return}
 if(p.t==='scooter'){const f=p.follow&&A[p.follow];if(f){p.x=f.x;p.y=f.y}const X=Math.round(p.x),Y=Math.round(p.y);R(X-7,Y,14,1,'#c8c8d0');R(X-8,Y+1,3,3,'#1a1a1a');R(X+5,Y+1,3,3,'#1a1a1a');R(X+5,Y-14,1,14,'#9aa0aa');R(X+3,Y-14,5,1,'#3a3a3a');return}
 return _dp2(p);
};
const _dh=drawHeld;
drawHeld=function(it,x,y,d){if(it==='soaker'){R(x-6,y-2,12,4,'#2aa84a');R(x-4,y-5,5,3,'#f08a2a');R(x+5,y-1,4,2,'#f0d040');R(x-6,y+1,3,3,'#2a7a3a');return}return _dh(it,x,y,d)};

