// Renders a top-down biome map or a vertical cross-section of generated terrain.
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const make=require('./bundle.js');
const TMP='/tmp/claude-0/-home-user-game/8e46908c-6722-519f-95f9-a35325cb275d/scratchpad/wgfull.js';
make(['00_s_core.js','01_s_blocks.js','02_s_biomes.js','03_s_worldgen.js','04_s_features.js','05_s_structures.js',
      '10_tex_core.js','11_tex_plants.js','12_tex_custom.js'].filter(f=>fs.existsSync(path.join(__dirname,'..','src',f))),
  TMP, ['WorldGen','WG','BLOCKS','BID','BY_NAME','BIOMES','BIOME_ID','SIDX','ID_MASK','CH_H','CH_W','SEA','climateAt','heightAt','pickBiome','clamp','hash3','bakeAllBlockTextures','TEX_LAYERS']);
const M=require(TMP);
const {WorldGen,WG,BLOCKS,BIOMES,SIDX,ID_MASK,CH_H,SEA,climateAt,heightAt,pickBiome,clamp,hash3}=M;
M.bakeAllBlockTextures();
WorldGen.init(parseInt(process.env.SEED||'1337'));
function png(W,H,img,file){
 function crc32(b){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c;}let crc=0xFFFFFFFF;for(let i=0;i<b.length;i++)crc=t[(crc^b[i])&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
 function ch(ty,da){const l=Buffer.alloc(4);l.writeUInt32BE(da.length);const td=Buffer.concat([Buffer.from(ty),da]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([l,td,c]);}
 const ih=Buffer.alloc(13);ih.writeUInt32BE(W,0);ih.writeUInt32BE(H,4);ih[8]=8;ih[9]=6;
 const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){raw[y*(W*4+1)]=0;img.copy(raw,y*(W*4+1)+1,y*W*4,(y+1)*W*4);}
 fs.writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw)),ch('IEND',Buffer.alloc(0))]));
}
const mode=process.argv[3]||'map';
if(mode==='map'){
  const W=600,H=600,STEP=parseInt(process.argv[4]||'8');
  const img=Buffer.alloc(W*H*4);
  const pal={ocean:[40,70,160],deep_ocean:[25,50,130],warm_ocean:[60,150,190],lukewarm_ocean:[50,120,190],cold_ocean:[35,60,150],frozen_ocean:[130,160,200],deep_frozen_ocean:[110,140,190],
   river:[70,110,220],frozen_river:[150,180,220],beach:[220,210,150],snowy_beach:[230,235,240],stony_shore:[130,130,130],
   plains:[140,190,90],sunflower_plains:[160,200,90],meadow:[130,190,110],cherry_grove:[230,160,190],forest:[60,130,60],flower_forest:[110,170,90],birch_forest:[130,180,110],old_growth_birch_forest:[120,175,105],
   dark_forest:[35,80,35],pale_garden:[150,160,150],taiga:[45,110,90],snowy_taiga:[150,190,190],old_growth_pine_taiga:[40,100,80],old_growth_spruce_taiga:[35,95,75],grove:[200,220,220],
   jungle:[40,160,40],sparse_jungle:[80,170,60],bamboo_jungle:[120,190,60],swamp:[80,100,60],mangrove_swamp:[90,110,70],mushroom_fields:[190,150,190],
   desert:[230,215,140],savanna:[190,180,90],savanna_plateau:[180,170,85],windswept_savanna:[170,165,90],
   badlands:[190,110,60],eroded_badlands:[200,120,70],wooded_badlands:[170,120,70],
   snowy_plains:[240,245,250],ice_spikes:[220,240,255],snowy_slopes:[225,235,245],jagged_peaks:[250,250,255],frozen_peaks:[230,245,255],stony_peaks:[160,160,160],
   windswept_hills:[110,140,110],windswept_gravelly_hills:[130,130,120],windswept_forest:[90,130,90]};
  const bcol={};BIOMES.forEach((b,i)=>{bcol[i]=pal[b.name]||[255,0,255];});
  for(let py=0;py<H;py++)for(let px=0;px<W;px++){
    const wx=(px-W/2)*STEP, wz=(py-H/2)*STEP;
    const cl=climateAt(wx,wz); const h=heightAt(wx,wz,cl); const bi=pickBiome(wx,wz,h,cl);
    let c=bcol[bi]; let sh=clamp(0.55+(h-SEA)/160,0.35,1.4);
    if(h<SEA) sh=clamp(0.5+(h-SEA+50)/110,0.3,1.0);
    const i=(py*W+px)*4;
    img[i]=clamp(c[0]*sh,0,255);img[i+1]=clamp(c[1]*sh,0,255);img[i+2]=clamp(c[2]*sh,0,255);img[i+3]=255;
  }
  png(W,H,img,process.argv[2]);
  console.log('map ok');
} else {
  const CHUNKS=parseInt(process.argv[4]||'12');
  const dim=parseInt(process.argv[6]||'0');
  const W=CHUNKS*16, H=CH_H;
  const img=Buffer.alloc(W*H*4);
  const cz=parseInt(process.argv[5]||'0');
  for(let w=0;w<8;w++) WorldGen.generateColumn(dim,900+w,900);
  const t0=Date.now();
  for(let c=0;c<CHUNKS;c++){
    const r=WorldGen.generateColumn(dim,c-((CHUNKS/2)|0),cz);
    for(let x=0;x<16;x++)for(let y=0;y<H;y++){
      const sec=r.data[y>>4]; const v=sec?sec[SIDX(x,y,8)]:0; const b=BLOCKS[v&ID_MASK];
      let col=[135,190,255];
      if(v&ID_MASK){ const a=b.avgColor||[0.5,0.5,0.5]; col=[a[0]*255,a[1]*255,a[2]*255]; }
      const px=c*16+x, py=H-1-y, i=(py*W+px)*4;
      img[i]=col[0];img[i+1]=col[1];img[i+2]=col[2];img[i+3]=255;
    }
  }
  console.log('gen time for',CHUNKS,'chunks:',Date.now()-t0,'ms');
  png(W,H,img,process.argv[2]);
}
