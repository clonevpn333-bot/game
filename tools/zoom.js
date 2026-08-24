// Renders a named subset of block faces at large scale for close review.
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const SRC=path.resolve(__dirname,'..','src');
eval(['00_s_core.js','01_s_blocks.js','10_tex_core.js','11_tex_plants.js','12_tex_custom.js'].map(f=>fs.readFileSync(path.join(SRC,f),'utf8')).join('\n'));
bakeAllBlockTextures();
const names=process.argv[3].split(',');
const SCALE=8, COLS=Math.min(8,names.length), rows=Math.ceil(names.length/COLS);
const CW=16*SCALE, W=COLS*CW, H=rows*CW;
const img=Buffer.alloc(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;const c=((x>>4)+(y>>4))%2?90:60;img[i]=c;img[i+1]=c;img[i+2]=c;img[i+3]=255;}
names.forEach((nm,t)=>{
  let face=2; let n=nm; if(nm.includes(':')){const s=nm.split(':');n=s[0];face=parseInt(s[1]);}
  const b=BY_NAME[n]; if(!b){console.log('missing',n);return;}
  const d=TEX_LAYERS[b.layers[face]];
  const tx=(t%COLS)*CW, ty=Math.floor(t/COLS)*CW;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const s=(y*16+x)*4,a=d[s+3]/255;
    for(let sy=0;sy<SCALE;sy++)for(let sx=0;sx<SCALE;sx++){const px=tx+x*SCALE+sx,py=ty+y*SCALE+sy,i=(py*W+px)*4;
      img[i]=img[i]*(1-a)+d[s]*a;img[i+1]=img[i+1]*(1-a)+d[s+1]*a;img[i+2]=img[i+2]*(1-a)+d[s+2]*a;}}
});
function crc32(buf){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}let crc=0xFFFFFFFF;for(let i=0;i<buf.length;i++)crc=t[(crc^buf[i])&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(ty,da){const l=Buffer.alloc(4);l.writeUInt32BE(da.length);const td=Buffer.concat([Buffer.from(ty),da]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c]);}
const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;
const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){raw[y*(W*4+1)]=0;img.copy(raw,y*(W*4+1)+1,y*W*4,(y+1)*W*4);}
fs.writeFileSync(process.argv[2],Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
console.log('ok');
