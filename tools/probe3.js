import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 560 } });
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto('http://localhost:4321/games/summit/index.html', { waitUntil: 'load' });
await page.waitForTimeout(11000);
await page.evaluate(`(() => { const s = window.__summit; s.menu.nameInput.value='Ada'; s.menu.serverInput.value='ws://localhost:8787/ws'; s.menu.host(); })()`);
await page.waitForTimeout(6000);
console.log(JSON.stringify(await page.evaluate(`(() => {
  const s = window.__summit;
  const c = s.lobby.climbers.get(s.net.id);
  return {
    chuteVisible: c.chute.visible,
    cloth: c.cloth.map(st => ({ inited: !!st.inited, span: +st.pts[0].distanceTo(st.pts[st.count-1]).toFixed(2), p0: st.pts[0].toArray().map(v => +v.toFixed(2)), pN: st.pts[st.count-1].toArray().map(v => +v.toFixed(2)) })),
    pos: c.pos.toArray().map(v => +v.toFixed(2)),
  };
})()`), null, 1));
await browser.close();
