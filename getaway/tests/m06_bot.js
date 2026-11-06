(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game; const log = (x) => console.log(x); let lastObj = '';
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + (document.querySelector('.hud-obj-sub') || {}).textContent;
  G.cam.stopCine(); { const f0 = G.mission.fail.bind(G.mission); G.mission.fail = (r) => { log('FAIL: ' + r + ' at cp ' + G.mission.cpReached + ' t=' + G.time.toFixed(0)); f0(r); }; }
  const step = async (secs) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) {
      const R = G.mission && G.mission.ctx && G.mission.ctx.vars.R;
      if (R && R.gun && i % 3 === 0) { // aim at the nearest threat
        let best = null, bd = 1e9; const hp = R.heli.pos;
        for (const s of R.gunships) if (s.alive) { const d = s.pos.distanceTo(hp); if (d < bd) { bd = d; best = s.pos; } }
        if (!best) for (const v of G.vehicles.list) if (!v.dead && v.ai && v.ai.hostile && v !== R.car) { const d = v.pos.distanceTo(hp); if (d < bd && d < 250) { bd = d; best = v.pos; } }
        if (best) { const d = best.clone().sub(hp); R.gun.yaw = Math.atan2(d.x, d.z) - R.heli.yaw; R.gun.pitch = Math.atan2(d.y + 0.5, Math.hypot(d.x, d.z)); G.input.mouseButtons = (G.input.mouseButtons | 1) | (i % 60 === 0 ? 4 : 0); } else G.input.mouseButtons = 0;
      }
      g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o}`); }
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; }
    window.__fixedDt = 0; };
  for (let k = 0; k < 120; k++) { await step(5); const R = G.mission && G.mission.ctx.vars.R; if (k % 4 === 0 && R) log(`   t=${G.time.toFixed(0)} car=${R.car.pos.x.toFixed(0)},${R.car.pos.z.toFixed(0)} carHP=${R.car.hp.toFixed(0)} heliHP=${R.heli.hp.toFixed(0)} units=${G.police.units.length} gunships=${R.gunships.filter((s) => s.alive).length} veh=${G.vehicles.list.length} errors=${Guard.total}`);
    if (!G.mission || G.mission.done || G.mission.failed) break; }
  await new Promise((r) => setTimeout(r, 2500));
  return `END done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} results=${!!document.querySelector('.results')} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
