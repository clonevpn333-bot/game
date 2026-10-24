// Films every cutscene of the prologue: runs the playthrough with time advanced in small chunks
// (so the async cutscene scripts keep pace) and saves a frame each second the director is active.
// node tools/play.mjs tests/film.mjs "http://localhost:8080/index.html?beat=wake"   (FILM_DIR=...)
import run from './playthrough.mjs';
import fs from 'node:fs';
export default async (ctx) => {
  const { ev, page, log } = ctx;
  const dir = process.env.FILM_DIR || 'film'; fs.mkdirSync(dir, { recursive: true });
  let n = 0, simT = 0, lastCap = -9;
  globalThis.FILM_SLOW = 5; // dialogue plays at full length, so the scripted waits take longer
  const fev = async (fn, arg) => {
    if (typeof arg !== 'number' || !fn.toString().includes('advance(')) return ev(fn, arg);
    for (let left = arg; left > 1e-6;) {
      const s = Math.min(0.25, left); left -= s; simT += s;
      const st = await ev((s) => { __game.skipAll = false; __game.advance(s, 1 / 30, false); return { a: __game.director.active, cp: __game.state.checkpoint }; }, s);
      await page.waitForTimeout(20);
      if (st.a && simT - lastCap >= 1.5) {
        lastCap = simT;
        const info = await ev(() => { __game.engine.render(1 / 30); const P = __game.player; return `${P.anim.mode}${P.anim.activity ? ':' + P.anim.activity : ''} u=${(P.anim.modeParam || 0).toFixed(2)} vis=${P.char.group.visible}`; });
        const f = `${dir}/${String(n++).padStart(4, '0')}_${st.cp}.jpg`;
        await page.screenshot({ path: f, type: 'jpeg', quality: 55 });
        fs.appendFileSync(`${dir}/index.txt`, `${f}\t${simT.toFixed(1)}\t${info}\n`);
      }
    }
  };
  await run({ ...ctx, ev: fev });
  log('filmed', n, 'frames');
};
