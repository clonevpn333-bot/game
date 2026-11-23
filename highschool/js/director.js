'use strict';
/* =====================================================================
   HIGHSCHOOL — THE DIRECTOR
   Every scene in the game gets camera work, not just the new ones:
   • A big line (yelling, an evil grin, shock, tears) punches the camera
     in on whoever said it. The next calm line eases back out.
   • Somebody dies: the camera pushes in slowly on them, holds, pulls out.
   • Scenes that move the camera themselves are left alone.
   ===================================================================== */
const BIG_EX=['yell','evil','shock','cry','scared','angry'];
let DIR={auto:false,last:0};
{const _s=say;say=function(who,text,e){
 try{
  if(!TEST&&typeof CAM!=='undefined'&&busy&&ROOM!=='busride'){
   const a=who&&A[who];
   const scripted=CAM.z>1.01&&!DIR.auto;
   if(!scripted){
    if(a&&BIG_EX.includes(e)&&T-DIR.last>1.2&&a.x>20&&a.x<300){DIR.auto=true;DIR.last=T;camZoom(a.x,a.y-26-(a.z||0),1.32,260)}
    else if(DIR.auto&&(!e||!BIG_EX.includes(e))){DIR.auto=false;camZoom()}
   }
  }
 }catch(err){}
 return _s(who,text,e);
}}
{const _k=kill;kill=function(id,type,o){const a=A[id];const r=_k(id,type,o);
 if(!TEST&&a&&typeof CAM!=='undefined'&&!(CAM.z>1.01&&!DIR.auto)){DIR.auto=true;CAM.x=a.x;CAM.y=a.y-12;tw(CAM,{z:1.45},900,'out').then(()=>setTimeout(()=>{if(DIR.auto){DIR.auto=false;camZoom(null,null,null,700)}},900))}
 return r}}
/* every scene starts and ends wide */
{const _bt=backToRoom;backToRoom=function(){if(typeof CAM!=='undefined'){DIR.auto=false;CAM.z=1}return _bt()}}
