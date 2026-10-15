export default async function ({ page, shot, wait }) {
  await page.evaluate(() => {
    window.__ts = [];
    const g = window.game;
    const u = g.update.bind(g);
    g.update = (dt) => { const t0 = performance.now(); u(dt); window.__ts.push([Math.round(t0), Math.round(performance.now() - t0)]); };
    const r = g.renderer.render.bind(g.renderer);
    g.renderer.render = (dt) => { const t0 = performance.now(); r(dt); window.__rt = Math.round(performance.now() - t0); };
  });
  await wait(4000);
  console.log(JSON.stringify(await page.evaluate(() => ({ ts: window.__ts.slice(-10), rt: window.__rt, n: window.__ts.length }))));
}
