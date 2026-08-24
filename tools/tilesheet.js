// Renders every baked tile into a PNG contact sheet for visual review.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const SRC = path.resolve(__dirname, '..', 'src');
const files = ['00_s_core.js','01_s_blocks.js','10_tex_core.js','11_tex_plants.js','12_tex_custom.js'];
let code = files.map(f => fs.readFileSync(path.join(SRC,f),'utf8')).join('\n');
eval(code);
bakeAllBlockTextures();
console.log('tiles baked:', TEX_LAYERS.length);

const COLS = 32, SCALE = 3;
const rows = Math.ceil(TEX_LAYERS.length / COLS);
const W = COLS*16*SCALE, H = rows*16*SCALE;
const img = Buffer.alloc(W*H*4);
// checkerboard background so alpha is visible
for (let y=0;y<H;y++) for (let x=0;x<W;x++){
  const i=(y*W+x)*4; const c = ((x>>3)+(y>>3))%2 ? 90 : 60;
  img[i]=c;img[i+1]=c;img[i+2]=c;img[i+3]=255;
}
for (let t=0;t<TEX_LAYERS.length;t++){
  const tx=(t%COLS)*16*SCALE, ty=Math.floor(t/COLS)*16*SCALE, d=TEX_LAYERS[t];
  for (let y=0;y<16;y++) for (let x=0;x<16;x++){
    const s=(y*16+x)*4, a=d[s+3]/255;
    for (let sy=0;sy<SCALE;sy++) for (let sx=0;sx<SCALE;sx++){
      const px=tx+x*SCALE+sx, py=ty+y*SCALE+sy, i=(py*W+px)*4;
      img[i]=img[i]*(1-a)+d[s]*a; img[i+1]=img[i+1]*(1-a)+d[s+1]*a; img[i+2]=img[i+2]*(1-a)+d[s+2]*a;
    }
  }
}
// minimal PNG writer
function crc32(buf){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}
  let crc=0xFFFFFFFF;for(let i=0;i<buf.length;i++)crc=t[(crc^buf[i])&0xFF]^(crc>>>8);return (crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);
  const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([len,td,c]);}
const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6;
const raw=Buffer.alloc((W*4+1)*H);
for(let y=0;y<H;y++){raw[y*(W*4+1)]=0; img.copy(raw,y*(W*4+1)+1,y*W*4,(y+1)*W*4);}
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(process.argv[2]||'/tmp/tiles.png',png);
console.log('wrote sheet', W+'x'+H);
