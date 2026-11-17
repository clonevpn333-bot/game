'use strict';
/* HIGHSCHOOL — boot */
fit();
requestAnimationFrame(t=>{last=t;requestAnimationFrame(frame)});
title();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&AC)AC.suspend().catch(()=>{});else if(AC)AC.resume().catch(()=>{})});
/* test hooks (tools/test.mjs) */
window.HS={get D(){return D},set D(v){D=v},get P(){return P},HOOKS,SPOTS,MIS,COLL,DEATHS,ENDINGS,PERIODS,runHook,enterRoom,startPeriod,newDay,endPeriod,talkTo,useSpot,availableHooks,get busy(){return busy},get panelMode(){return panelMode},freshD,A,buildRoom,boardBus,reset(){localStorage.removeItem(SAVE_KEY);loadP()}};
