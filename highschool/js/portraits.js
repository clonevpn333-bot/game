'use strict';
/* =====================================================================
   HIGHSCHOOL — PORTRAITS
   The speaker portrait is a close-up now: head and shoulders at double
   size, on a backdrop in the character’s own color, with a soft light
   behind them. Mouths move when they talk, eyes blink, and the portrait
   breathes a little.
   ===================================================================== */
{const c=$('portrait');c.width=40;c.height=40;}
{const st=document.createElement('style');st.textContent=`
#portraitBox{width:104px!important;height:104px!important;border:3px solid var(--edge2,#5a4a6e)!important;box-shadow:0 0 0 1px #000,3px 3px 0 #0008;border-radius:2px}
@media (max-width:640px),(max-height:520px){#portraitBox{width:64px!important;height:64px!important}}`;document.head.appendChild(st)}
portraitTick=function(){
 const who=portraitWho;if(!who||!K[who])return;
 const k=K[who],a=A[who]||{},o={dir:1,hs:a.hs||(who==='dheva'&&D&&D.f&&D.f.dheva1&&!D.f.dhevaFixed?'limp':null),ex:a.dead?'dead':a.ex,talk:DL&&DL.who===who&&!DL.done,hurt:a.hurt,still:1,bloody:a.bloody,hairC:a.hairC,topC:a.topC};
 const saved=g;g=pg;
 try{
  pg.setTransform(1,0,0,1,0,0);
  const col=k.col||'#6b4a7a';R(0,0,40,40,'#120e1c');g.globalAlpha=.55;R(0,0,40,40,col);g.globalAlpha=.35;R(4,2,32,30,'#ffffff');g.globalAlpha=1;
  for(let y=0;y<40;y+=2){g.globalAlpha=.06;R(0,y,40,1,'#000')}g.globalAlpha=1;
  const G=kidGeom(k,o),br=Math.round(Math.sin(T*2.2)*.6);
  /* draw at 2x, framed on the head */
  pg.setTransform(2,0,0,2,0,0);
  const footY=3+G.hd+G.bodyH+G.legH+br+(k.knob?1:0)+(k.hs==='fluffy'||k.hs==='bun'||k.hs==='afro'?2:0);
  drawKid(k,10,footY,o);
  pg.setTransform(1,0,0,1,0,0);
  g.globalAlpha=.35;R(0,34,40,6,'#000');g.globalAlpha=1;
 }finally{g=saved}
};
