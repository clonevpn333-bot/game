/* 99_main.js — boot, main loop, debug hooks. OWNER: integration (main agent). */
(function () {
  const boot = document.getElementById('boot');
  const bootbar = document.querySelector('#bootbar i');
  const bootmsg = document.getElementById('bootmsg');
  function progress(p, msg) {
    if (bootbar) bootbar.style.width = (p * 100).toFixed(0) + '%';
    if (bootmsg && msg) bootmsg.textContent = msg;
  }
  function fatal(e) {
    const el = document.getElementById('fatal');
    el.style.display = 'block';
    el.textContent = 'VOLTHAVEN failed to start\n\n' + (e && e.stack ? e.stack : String(e));
    if (boot) boot.classList.add('gone');
    console.error(e);
  }

  VH.ctx = {
    scene: null, camera: null, renderer: null,
    player: null, actors: [], enemies: [],
    world: null, time: 0, dt: 0, frame: 0,
    paused: false, timeScale: 1, input: VH.Input, flags: {},
  };

  let hitstopT = 0;
  VH.on('hitstop', d => { hitstopT = Math.max(hitstopT, (d && d.dur) || 0.05); });

  function step(name, fn) {
    try { fn(); } catch (e) { console.error('[' + name + '] ' + e.message, e); throw e; }
  }

  function start() {
    if (!window.THREE) { fatal(new Error('three.js failed to load from cdnjs')); return; }
    const canvas = document.getElementById('gl');
    VH.Input.bind(canvas);

    progress(0.05, 'RENDERER');
    step('Audio.init', () => VH.Audio.init());
    step('Core.init', () => VH.Core.init(canvas));
    VH.ctx.scene = VH.Core.scene; VH.ctx.camera = VH.Core.camera; VH.ctx.renderer = VH.Core.renderer;

    progress(0.2, 'MATERIALS');
    step('Mat.init', () => VH.Mat.init(VH.Core.renderer));

    progress(0.45, 'VOLTHAVEN');
    const seed = +(VH.q.seed || 20770);
    const startMission = VH.q.mission || null;
    const district = startMission && VH.Story.missions[startMission] ? VH.Story.missions[startMission].district : undefined;
    step('World.build', () => {
      VH.ctx.world = VH.World.build(seed, district);
      if (VH.ctx.world && VH.ctx.world.group) VH.ctx.scene.add(VH.ctx.world.group);
    });

    progress(0.68, 'CHARACTERS');
    step('Chars.init', () => VH.Chars.init());
    step('Combat.init', () => VH.Combat.init());
    step('AI.init', () => VH.AI.init());

    progress(0.85, 'SYSTEMS');
    step('Missions.init', () => VH.Missions.init());
    step('UI.init', () => VH.UI.init());

    progress(1, 'READY');

    /* First user gesture unlocks audio (browser policy). */
    const unlock = () => { try { VH.Audio.unlock(); } catch (e) {} };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    setTimeout(() => { if (boot) boot.classList.add('gone'); }, 260);

    /* Entry point: title screen, or straight into a mission when driven by the harness. */
    if (startMission) {
      VH.Missions.goto(startMission);
    } else if (VH.q.nointro) {
      VH.Missions.start(VH.Story.acts[0].missions[0]);
    } else {
      VH.UI.titleScreen();
    }

    requestAnimationFrame(loop);
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    let raw = (now - last) / 1000; last = now;
    if (!(raw > 0)) raw = 1 / 60;
    raw = Math.min(raw, 1 / 20);

    if (hitstopT > 0) { hitstopT -= raw; }
    const scale = (hitstopT > 0 ? 0.02 : 1) * (VH.ctx.paused ? 0 : 1) * VH.ctx.timeScale;
    const dt = raw * scale;

    VH.ctx.dt = dt; VH.ctx.rawDt = raw; VH.ctx.time += dt; VH.ctx.frame++;

    try {
      VH.Missions.update(dt);
      VH.AI.update(dt);
      VH.Combat.update(dt, raw);
      VH.Chars.update(dt);
      VH.World.update(dt);
      VH.Audio.update(dt);
      VH.UI.update(dt, raw);
      VH.Core.render(dt, raw);
    } catch (e) {
      if (!VH._loopErrored) { VH._loopErrored = true; console.error('loop error:', e); }
    }

    VH.Input.endFrame();
    VH.Perf.tick();
    if (!VH.booted && VH.ctx.frame > 2) VH.booted = true;
  }

  /* ------------------------------------------------------------ debug hooks */
  VH.debug = {
    state() {
      const p = VH.ctx.player;
      return {
        mission: VH.Missions.current ? VH.Missions.current.id : null,
        objectives: VH.Missions.current && VH.Missions.current.objectives ? VH.Missions.current.objectives.map(o => (o.text || o.id) + (o.done ? ' [x]' : '')) : [],
        enemies: VH.ctx.enemies.filter(e => e.alive).length,
        hp: p ? Math.round(p.hp) : null,
        fps: Math.round(VH.Perf.fps),
        district: VH.ctx.world ? VH.ctx.world.district : null,
        pos: p ? [+p.group.position.x.toFixed(1), +p.group.position.y.toFixed(1), +p.group.position.z.toFixed(1)] : null,
        frame: VH.ctx.frame,
      };
    },
    goto(id) { VH.Missions.goto(id); },
    freecam(pos, look) {
      VH.debug._free = true;
      const t = VH.Core.camTarget;
      if (pos) t.pos.set(pos[0], pos[1], pos[2]);
      if (look) t.look.set(look[0], look[1], look[2]);
    },
    spawn(a, n) { for (let i = 0; i < (n || 1); i++) { const p = VH.ctx.player ? VH.ctx.player.group.position : new THREE.Vector3(); VH.AI.spawn(a, new THREE.Vector3(p.x + (Math.random() - .5) * 14, p.y, p.z - 6 - Math.random() * 8)); } },
    kill() { VH.ctx.enemies.slice().forEach(e => VH.Combat.damage(e, 99999, { silent: true })); },
    god(b) { VH.ctx.flags.god = b !== false; },
    timeScale(n) { VH.ctx.timeScale = n; },
    pause(b) { VH.ctx.paused = b !== false; },
  };
  if (VH.q.god) VH.ctx.flags.god = true;

  window.addEventListener('error', e => { if (!VH.booted) fatal(e.error || e.message); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { try { start(); } catch (e) { fatal(e); } });
  else { try { start(); } catch (e) { fatal(e); } }
})();
