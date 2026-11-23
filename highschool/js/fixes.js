'use strict';
/* =====================================================================
   HIGHSCHOOL — FIXES
   • Speed: skip (7×) only ever runs during a cutscene. S and A are
     movement keys, so they no longer toggle skip/auto mid-walk (that was
     the "game randomly speeds up" bug). Hold Ctrl or press the ⏩ button.
   • Transitions: every room change, whether through a door, off the
     end of a hall, or into a cutscene, uses the same dip: the old
     picture fades to black, the new one fades up. No cuts, slides or
     double fades.
   ===================================================================== */
speed=function(){return TEST?60:(skipping()&&(DL||busy||panelMode==='talk')&&panelMode!=='roam'?7:1)};
addEventListener('keydown',e=>{if(!DL||TEST)return;const k=e.key;if(k==='s'||k==='S'||k==='a'||k==='A'){e.stopImmediatePropagation()}},true);
{const _sp=setPanel;setPanel=function(m){const r=_sp(m);if(m==='roam'){if(skipOn)setSkip(false);if(autoOn)setAuto(false)}return r}}

/* ---------- one transition for everything ---------- */
const DIP={snap:null,t0:0,out:.18,inn:.32};
function dipSnap(){if(TEST)return;const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.imageSmoothingEnabled=false;try{x.drawImage(cv,0,0,W,H)}catch(e){return}DIP.snap=c;DIP.t0=performance.now()}
{const _sc=scene;scene=function(room,cast,fresh){if(!TEST&&ROOM&&room!==ROOM&&!(DIP.snap&&performance.now()-DIP.t0<60))dipSnap();return _sc(room,cast,fresh)}}
{const _d=draw;draw=function(){_d();if(!DIP.snap)return;
 const t=(performance.now()-DIP.t0)/1000;
 if(t<DIP.out){g.drawImage(DIP.snap,0,0);g.globalAlpha=t/DIP.out;R(0,0,W,H,'#050408');g.globalAlpha=1}
 else if(t<DIP.out+DIP.inn){const k=(t-DIP.out)/DIP.inn;g.globalAlpha=1-k*k*(3-2*k);R(0,0,W,H,'#050408');g.globalAlpha=1}
 else DIP.snap=null}}
/* the old fades and the hallway slide are retired */
if(typeof TRANS!=='undefined')Object.defineProperty(TRANS,'a',{get(){return 0},set(){}});
worldGo=async function(room,x,y,dir){if(busy&&!TEST)return;keys.l=keys.r=0;if(keys.u!=null)keys.u=keys.d=0;worldFade=0;return worldMove(room,x,y,dir)};
