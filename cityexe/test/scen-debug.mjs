export default async function ({ page, shot, wait }) {
  for (let i = 0; i < 6; i++) {
    const r = await page.evaluate(() => { const g = window.game; return { f: g.frame, progs: g.renderer.r.info.programs.length, calls: g.renderer.r.info.render.calls, t: g.world.history.timeStr(g.world.time) }; });
    console.log(JSON.stringify(r));
    await wait(8000);
  }
}
