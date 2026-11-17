'use strict';
/* =====================================================================
   HIGHSCHOOL — graphics pass.
   1. Every character is drawn into a buffer, shaded (darker on the far side
      and at the feet, a little light on the near edge) and given a 1px dark
      outline, so people read clearly against busy backgrounds.
   2. Proper ground shadows that shrink when someone's in the air.
   3. Every room has a light map: windows, ceiling strips, lamps, glows,
      darker corners and floor edges. It's dithered with a 4x4 Bayer pattern,
      so the light falls off in square pixels, not smooth blur.
   ===================================================================== */
const ABW=80,ABH=88,OX=40,OY=82;
const AB=document.createElement('canvas');AB.width=ABW;AB.height=ABH;const abg=AB.getContext('2d');
const AS=document.createElement('canvas');AS.width=ABW;AS.height=ABH;const asg=AS.getContext('2d');
function bufferKid(k,o){
 abg.setTransform(1,0,0,1,0,0);abg.globalCompositeOperation='source-over';abg.globalAlpha=1;abg.clearRect(0,0,ABW,ABH);
 const s=g;g=abg;try{drawKid(k,OX,OY,o)}finally{g=s}
 abg.globalCompositeOperation='source-atop';
 abg.fillStyle='rgba(16,8,28,.20)';abg.fillRect(OX+1,0,ABW,ABH);
 abg.fillStyle='rgba(16,8,28,.16)';abg.fillRect(0,OY-9,ABW,9);
 abg.fillStyle='rgba(255,236,210,.10)';abg.fillRect(OX-7,0,2,ABH);
 abg.globalCompositeOperation='source-over';
 asg.globalCompositeOperation='source-over';asg.clearRect(0,0,ABW,ABH);asg.drawImage(AB,0,0);
 asg.globalCompositeOperation='source-in';asg.fillStyle='#120a18';asg.fillRect(0,0,ABW,ABH);asg.globalCompositeOperation='source-over';
}
function blitKid(dx,dy,alpha){
 const ga=g.globalAlpha;g.globalAlpha=ga*(alpha==null?1:alpha)*.92;
 g.drawImage(AS,dx-1,dy);g.drawImage(AS,dx+1,dy);g.drawImage(AS,dx,dy-1);g.drawImage(AS,dx,dy+1);
 g.globalAlpha=ga*(alpha==null?1:alpha);g.drawImage(AB,dx,dy);g.globalAlpha=ga;
}
function groundShadow(x,y,z,wide){const w=Math.max(6,(wide?18:14)-z*.35);g.globalAlpha=Math.max(.12,.34-z*.01);R(x-w/2+1,y-1,w-2,1,'#0a0612');R(x-w/2,y,w,2,'#0a0612');R(x-w/2+2,y+2,w-4,1,'#0a0612');g.globalAlpha=1}

drawActor=function(a){
 const k=a.k;if(!k)return;
 let alpha=a.alpha<1?Math.max(0,a.alpha):1;
 if(k.ghost)alpha=Math.min(alpha,.62+Math.sin(T*3+a.x)*.12);
 let messy=false;if(k.adam){const L=adamLvl();messy=L>=3;if(!a.ex)a._ex=['happy','smirk','shock','smirk','yell','evil','shock','evil','sad'][L];if(L>=5)a.hurt=0}
 const y=Math.round(a.y-(a.z||0)),x=Math.round(a.x);
 if(a.dead||a.pose==='lie'){
  if(a.pool!=null&&P.set.gore){const w=a.pool;R(a.x-w/2,a.y-1,w,3,BLOOD[1]);R(a.x-w/2+2,a.y,w-4,1,BLOOD[2]);R(a.x-w*.3,a.y+2,w*.5,1,BLOOD[0]);R(a.x-w/2+3,a.y-1,w*.3,1,'#e8566055')}
  groundShadow(x,a.y+1,0,1);
  bufferKid(k,{dir:1,still:1,hs:a.hs,hairC:a.hairC,topC:a.topC,ex:a.dead?'dead':(a.ex||'closed'),noHead:a.dead==='head',crushed:a.dead==='crush',hurt:a.hurt,bloody:a.dead||a.bloody,hold:null});
  g.save();g.translate(x,y-5);g.rotate((a.dir>0?-1:1)*Math.PI/2);blitKid(-OX,5-OY,alpha);g.restore();
  if(a.dead==='impale'){R(a.x-18,a.y-22,1,24,'#c8c8c8');R(a.x-18,a.y-23,1,1,'#fff')}
  return;
 }
 const seated=a.pose==='sit'||a.pose==='write'||a.pose==='type'||a.pose==='swim';
 if(!seated)groundShadow(x,a.y,a.z||0,k.wide||k.adult);
 bufferKid(k,{fast:a.fast,messy,dir:a.dir,moving:a.moving,walk:a.walk,pose:a.air&&!a.pose?'up':a.pose,ex:a.ex||a._ex||(a.air?'shock':null),talk:a.talk,hold:a.hold,hurt:a.hurt,bloody:a.bloody,shake:a.shake,punchT:a.punchT,still:a.still,hairC:a.hairC,topC:a.topC,hs:a.hs||(a.id==='dheva'&&(typeof D!=='undefined'&&D)&&D.f&&!D.f.dhevaFixed?'limp':null)});
 blitKid(x-OX,y-OY,alpha);
};

/* ---------- light maps ---------- */
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
/* amb: base light 0..1. tint: colour of the dark. src: [x,y,radius,strength,[r,g,b]?]. wallAO: darken the floor where it meets the wall. */
const LIGHT={
 bus:()=>{const p=D?D.period:0;return p>=7?{amb:.78,tint:[90,40,70],src:[[40,50,220,.25,[255,190,140]]],warm:1}:{amb:.97,tint:[60,60,100],src:[]}},
 field:()=>{const p=D?D.period:0;return p>=7?{amb:.8,tint:[90,40,70],src:[[270,20,240,.2,[255,200,150]]]}:{amb:.98,tint:[60,70,100],src:[]}},
 carpark:{amb:.7,tint:[80,30,80],src:[[252,82,220,.35,[255,170,120]],[60,90,60,.2,[255,140,80]]]},
 corridor:{amb:.66,tint:[50,40,70],src:[[46,10,90,.32],[160,10,90,.32],[274,10,90,.32]],wallAO:1},
 english:{amb:.62,tint:[50,40,60],src:[[272,78,130,.45,[255,240,200]],[150,8,90,.18]],wallAO:1},
 maths:{amb:.64,tint:[70,40,70],src:[[271,92,120,.42,[255,236,240]],[150,8,90,.18]],wallAO:1},
 science:{amb:.62,tint:[40,50,50],src:[[272,47,130,.44,[240,255,240]],[150,8,90,.16]],wallAO:1},
 chem:{amb:.42,tint:[10,30,30],src:[[272,120,90,.5,[120,255,150]],[145,40,70,.25,[150,255,200]],[40,10,60,.18]],wallAO:1},
 canteen:{amb:.7,tint:[50,50,70],src:[[217,42,120,.35,[255,250,230]],[60,10,90,.25],[260,10,90,.25]],wallAO:1},
 gym:{amb:.68,tint:[60,50,50],src:[[40,13,70,.25],[104,13,70,.25],[168,13,70,.25],[232,13,70,.25],[296,13,70,.25]],wallAO:1},
 library:{amb:.6,tint:[40,25,20],src:[[160,100,90,.35,[255,220,160]],[160,6,80,.2]],wallAO:1},
 office:{amb:.46,tint:[40,15,20],src:[[267,48,100,.32,[255,230,190]],[158,30,60,.15,[255,210,150]]],wallAO:1},
 toilets:()=>({amb:Math.sin(T*23)>.85&&Math.sin(T*3)>0?.45:.66,tint:[40,60,60],src:[[160,6,110,.3,[230,255,255]]],wallAO:1}),
 foodtech:{amb:.66,tint:[60,40,30],src:[[277,80,90,.45,[255,160,80]],[150,8,90,.2]],wallAO:1},
 drama:{amb:.32,tint:[10,5,20],src:[[34,60,40,.4,[255,246,200]],[86,60,40,.4,[255,246,200]],[138,60,40,.4,[255,246,200]],[190,60,40,.4,[255,246,200]],[242,60,40,.4,[255,246,200]],[294,60,40,.4,[255,246,200]]]},
 foodcourt:{amb:.68,tint:[50,40,80],src:[[160,6,140,.3,[255,220,180]],[43,42,60,.25,[255,100,100]],[119,42,60,.25,[255,200,100]],[277,42,60,.25,[200,140,255]]]},
 arcade:{amb:.42,tint:[30,10,50],src:[[23,56,40,.35,[80,150,255]],[59,56,40,.35,[255,90,60]],[95,56,40,.3,[90,255,120]],[131,56,40,.3,[255,90,255]],[167,56,40,.3,[90,255,255]],[246,50,50,.3,[200,150,255]]]},
 history:{amb:.58,tint:[30,40,25],src:[[66,60,100,.3,[255,230,180]],[160,8,90,.2]],wallAO:1},
 art:{amb:.78,tint:[70,60,70],src:[[160,10,160,.35,[255,250,230]]],wallAO:1},
 music:{amb:.55,tint:[40,20,50],src:[[160,10,120,.3],[46,60,60,.2,[255,220,180]]],wallAO:1},
 ict:{amb:.45,tint:[10,20,40],src:[[185,52,120,.4,[90,255,210]],[40,60,60,.25,[90,255,120]]],wallAO:1},
 pool:{amb:.78,tint:[30,70,90],src:[[160,150,200,.25,[150,230,255]]],wallAO:0},
 woodwork:{amb:.6,tint:[50,30,15],src:[[160,10,110,.28,[255,230,180]],[37,58,40,.2,[255,120,100]]],wallAO:1},
 psych:{amb:.44,tint:[30,20,40],src:[[160,49,70,.35,[230,220,255]],[267,46,60,.2,[255,230,200]]],wallAO:1},
 hall:{amb:.5,tint:[40,25,20],src:[[160,40,110,.45,[255,246,200]]],wallAO:1},
 stage:{amb:.5,tint:[30,10,20],src:[[45,60,60,.35,[255,240,190]],[105,60,60,.35,[255,240,190]],[165,60,60,.35,[255,240,190]],[225,60,60,.35,[255,240,190]],[285,60,60,.35,[255,240,190]]]},
 black:{amb:1,tint:[0,0,0],src:[]}
};
const LM=document.createElement('canvas');LM.width=W;LM.height=H;const lmg=LM.getContext('2d');
let lmKey='';
function buildLightmap(room){
 let cfg=LIGHT[room];if(typeof cfg==='function')cfg=cfg();if(!cfg)return false;
 const key=room+'|'+JSON.stringify(cfg);if(key===lmKey&&!cfg.live)return true;lmKey=key;
 const img=lmg.createImageData(W,H),d=img.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  let r=0,gg=0,b=0,L=cfg.amb;
  for(const s of cfg.src){const dx=x-s[0],dy=(y-s[1])*1.15,dd=Math.sqrt(dx*dx+dy*dy);if(dd<s[2]){const f=Math.pow(1-dd/s[2],1.6)*s[3];L+=f;const c=s[4]||[255,255,255];r+=f*(c[0]/255-1);gg+=f*(c[1]/255-1);b+=f*(c[2]/255-1)}}
  if(cfg.wallAO&&y>=110&&y<122)L-=.16*(1-(y-110)/12);
  const vx=(x-160)/160,vy=(y-90)/90;L-=.14*(vx*vx+vy*vy);
  L=Math.max(0,Math.min(1,L));
  const q=Math.min(1,Math.floor(L*22+BAYER[(y&3)*4+(x&3)])/22);
  const i=(y*W+x)*4,t=cfg.tint;
  d[i]=Math.max(0,Math.min(255,t[0]+(255-t[0])*q*(1+r*.6)));d[i+1]=Math.max(0,Math.min(255,t[1]+(255-t[1])*q*(1+gg*.6)));d[i+2]=Math.max(0,Math.min(255,t[2]+(255-t[2])*q*(1+b*.6)));d[i+3]=255;
 }
 lmg.putImageData(img,0,0);return true;
}
let lightLiveT=0;
function drawLighting(){
 if(P.set.light===0)return;
 let cfg=LIGHT[ROOM];if(!cfg)return;
 if(!buildLightmap(ROOM))return;
 g.save();g.globalCompositeOperation='multiply';g.drawImage(LM,0,0);g.restore();
}
