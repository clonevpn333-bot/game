'use strict';
/* =====================================================================
   Ms. Loach: a Black woman in her 40s. Cornrows that are falling apart
   (frizz, loose strands, a couple of rows coming undone) under a big
   satin hair cover she sometimes takes off.
   • k.hs 'cornrows' draws the rows; k.cover draws the cover over them.
   • She wears the cover most days (two days in three); a scene can take it
     off with loachCover(false) (and she sometimes does, mid-lesson).
   ===================================================================== */
Object.assign(K.loach,{skin:'#7a4e36',hair:'#17110e',hs:'cornrows',cover:1});
{const _dh=drawHead;drawHead=function(k,x,hy,d,o){
 if(k.hs!=='cornrows')return _dh(k,x,hy,d,o);
 _dh(Object.assign({},k,{hs:'bald'}),x,hy,d,o);
 if(o&&o.crushed)return;
 const {hw,hd}=kidGeom(k,o),hx=x-(hw>>1),c=k.hair,dk='#0a0706',fz='#2e2420';
 if(k.cover){/* the big satin cover */
  const sc='#5e2a5a',sh='#7e3e78',bd='#3e1a3c';
  R(hx-3,hy-6,hw+6,8,sc);R(hx-2,hy-8,hw+4,2,sc);R(hx,hy-9,hw,1,sc);R(hx-4,hy-4,1,6,sc);R(hx+hw+3,hy-4,1,6,sc);
  R(hx-3,hy+1,hw+6,1,bd);R(hx+1,hy-7,4,1,sh);R(hx+2,hy-8,2,1,'rgba(255,255,255,.35)');R(hx+hw-3,hy-5,2,2,sh);
  R(d>0?hx-4:hx+hw+2,hy+1,2,3,sc);/* the gathered bit at the back */
  R(d>0?hx+hw:hx-2,hy+2,2,1,fz);/* a loose strand escaping at the front */
  return}
 /* cornrows: rows front to back, half of them coming undone */
 R(hx-1,hy-2,hw+2,4,c);R(hx,hy-3,hw,1,c);
 for(let i=0;i<hw;i+=2)R(hx+i,hy-3,1,5,dk);
 const s=k.seed||34;
 for(let i=0;i<7;i++){const fx=hx-1+((s*7+i*13)%(hw+2)),fy=hy-4-((s+i*5)%2);R(fx,fy,1,1,fz)}/* frizz */
 R(hx-2,hy-1,1,3,fz);R(hx+hw+1,hy,1,2,fz);/* flyaways at the temples */
 R(d>0?hx-3:hx+hw+1,hy+1,1,hd-2,c);R(d>0?hx-2:hx+hw,hy+2,1,hd-1,c);/* braid tails at the back */
 R(d>0?hx-4:hx+hw+2,hy+hd-2,1,2,fz);/* one undone at the end */
}}
/* she wears it two days in three */
{const _put=put;put=function(id,x,dir,o){const a=_put(id,x,dir,o);if(id==='loach'&&a&&a.k&&D&&typeof cal==='function'){a.k=Object.assign({},a.k,{cover:D.f&&D.f.loachBare===cal()?0:(cal()%3!==1?1:0)})}return a}}
function loachCover(on){if(A.loach){A.loach.k=Object.assign({},A.loach.k,{cover:on?1:0});if(!on&&D&&D.f)D.f.loachBare=cal()}}
