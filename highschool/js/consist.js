'use strict';
/* =====================================================================
   HIGHSCHOOL — CONSISTENCY NETS
   • Nobody talks from nowhere: if a character speaks in a scene while
     they're not on screen, they walk in from the nearest edge first and
     stop beside you, facing you. Lines that are MEANT to come from off
     screen (through a door, over the PA, on the phone, from far away)
     are left alone.
   ===================================================================== */
const OFFSCREEN_RE=/^\((through|from|over|on the (phone|pa|speaker|walkie)|far away|offscreen|off-screen|behind the|muffled|on speaker|in the (hall|next)|outside)/i;
{const _s=say;say=async function(id,t,ex){
 try{if(!TEST&&id&&id!=='$'&&id!=='you'&&K[id]&&ROOM&&ROOM!=='titlescreen'&&!OFFSCREEN_RE.test(String(t||'').trim())&&A.you){
  const a=A[id],on=a&&a.vis!==false&&!a.dead&&a.x>-4&&a.x<324&&(a.alpha==null||a.alpha>.2);
  if(!on&&!(a&&a.dead)){const fromL=A.you.x>160,sx=fromL?-14:334,tx=clamp(A.you.x+(fromL?-26:26),16,304);
   if(!a)put(id,sx,fromL?1:-1,{y:A.you.y-2});else{a.x=sx;a.alpha=1;a.vis=true}
   await walk(id,tx,110);face(id,'you')}}}catch(e){}
 return _s.apply(this,arguments)}}
