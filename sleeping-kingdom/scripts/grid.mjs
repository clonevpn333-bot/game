// Tile PNGs into a 2x2 contact sheet (pngjs, no native deps).
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [out, ...files] = process.argv.slice(2);
const imgs = files.map((f) => PNG.sync.read(fs.readFileSync(f)));
const cw = Math.floor(imgs[0].width / 2), ch = Math.floor(imgs[0].height / 2);
const dst = new PNG({ width: cw * 2, height: ch * 2 });
imgs.forEach((im, k) => {
  const ox = (k % 2) * cw, oy = Math.floor(k / 2) * ch;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y * 2) * im.width + x * 2) * 4, di = ((oy + y) * dst.width + ox + x) * 4;
    for (let c = 0; c < 4; c++) dst.data[di + c] = im.data[si + c];
  }
});
fs.writeFileSync(out, PNG.sync.write(dst));
