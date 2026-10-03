// DOM HUD: era dial, chrono charge, health, prompts, objectives, toasts,
// timeline-consequence reveals, damage indicators, minimap.
import { G, ERA_YEARS, ERA_NAMES } from '../core/state.js';
import { ERA_DEF } from '../world/eras.js';
import { formatTime, clamp } from '../core/mathx.js';
import { districtAt, DISTRICT_NAMES, nearestStreetName } from '../world/layout.js';

const el = (tag, cls, parent, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
};

export class HUD {
  constructor() {
    const root = el('div', 'hud', document.body);
    this.root = root;
    // era dial (top-left)
    this.eraBox = el('div', 'era-box', root);
    this.eraYear = el('div', 'era-year', this.eraBox, '1996');
    this.eraName = el('div', 'era-name', this.eraBox, 'THE OLD CITY');
    this.eraDots = el('div', 'era-dots', this.eraBox);
    this.dots = [0, 1, 2].map((e) => el('div', 'era-dot', this.eraDots, `<span class="k">${e + 1}</span><span class="y">${ERA_YEARS[e]}</span>`));
    this.chargeBar = el('div', 'charge', this.eraBox, '<div class="fill"></div>');
    this.chargeFill = this.chargeBar.firstChild;
    this.location = el('div', 'location', this.eraBox, '');
    // vitals (bottom-left)
    this.vitals = el('div', 'vitals', root);
    this.hpBar = el('div', 'bar hp', this.vitals, '<div class="fill"></div>');
    this.armBar = el('div', 'bar armor', this.vitals, '<div class="fill"></div>');
    this.stBar = el('div', 'bar stamina', this.vitals, '<div class="fill"></div>');
    // weapon (bottom-right)
    this.weapon = el('div', 'weapon', root);
    // objective (top-right)
    this.objective = el('div', 'objective', root);
    // wanted
    this.wanted = el('div', 'wanted', root);
    // crosshair
    this.cross = el('div', 'crosshair', root, '<i></i><i></i><i></i><i></i><b></b>');
    this.hitmark = el('div', 'hitmarker', root, '<i></i><i></i><i></i><i></i>');
    // prompt
    this.prompt = el('div', 'prompt', root);
    // toasts & reveals
    this.toasts = el('div', 'toasts', root);
    this.reveal = el('div', 'reveal', root);
    this.banner = el('div', 'banner', root);
    this.subtitle = el('div', 'subtitle', root);
    this.dmgRing = el('div', 'dmg-ring', root);
    // minimap
    this.mini = el('canvas', 'minimap', root);
    this.mini.width = 220; this.mini.height = 220;
    this.mctx = this.mini.getContext('2d');
    this.clock = el('div', 'clock', root);
    this.speedo = el('div', 'speedo', root);
    this.fps = el('div', 'fps', root);
    this._promptText = '';
    this.bannerT = 0;
    this.subT = 0;
    this.revealT = 0;
    this.hitmarkT = 0;
    this.dmgDirs = [];
    this.markers = [];
    this.lastEra = -1;
  }

  toast(text, kind = 'info', dur = 3.2) {
    const t = el('div', 'toast ' + kind, this.toasts, text);
    setTimeout(() => t.classList.add('out'), dur * 1000);
    setTimeout(() => t.remove(), dur * 1000 + 600);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
  }

  showBanner(title, sub = '', dur = 3.5, color = null) {
    this.banner.innerHTML = `<div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ''}`;
    this.banner.style.setProperty('--c', color || ERA_DEF[G.era].accent);
    this.banner.classList.add('on');
    this.bannerT = dur;
  }

  say(speaker, text, dur = 4) {
    this.subtitle.innerHTML = speaker ? `<span class="who">${speaker}</span> ${text}` : text;
    this.subtitle.classList.add('on');
    this.subT = dur;
  }

  setPrompt(text) {
    if (text === this._promptText) return;
    this._promptText = text;
    this.prompt.innerHTML = text || '';
    this.prompt.classList.toggle('on', !!text);
  }

  setObjective(title, lines = []) {
    if (!title) { this.objective.innerHTML = ''; this.objective.classList.remove('on'); return; }
    this.objective.innerHTML = `<div class="ot">${title}</div>` + lines.map((l) => `<div class="ol ${l.done ? 'done' : ''}">${l.text}</div>`).join('');
    this.objective.classList.add('on');
  }

  eraArrived(era) {
    const d = ERA_DEF[era];
    this.showBanner(`${ERA_YEARS[era]}`, ERA_NAMES[era], 2.6, d.accent);
  }

  consequences(list) {
    // dramatic reveal of what changed because of the player's actions
    const html = list.map((c) => `<div class="c"><span class="cause">${c.cause}</span><span class="arrow">→</span><span class="eff">${c.text}</span></div>`).join('');
    this.reveal.innerHTML = `<div class="rt">TIMELINE ALTERED</div>${html}`;
    this.reveal.classList.add('on');
    this.revealT = 6 + list.length;
    G.audio && G.audio.play('consequence');
  }

  hitMarker(kill = false) {
    this.hitmark.classList.add('on');
    this.hitmark.classList.toggle('kill', kill);
    this.hitmarkT = kill ? 0.35 : 0.15;
  }

  damageFrom(pos) {
    this.dmgDirs.push({ x: pos.x, z: pos.z, t: 1 });
  }

  update(dt) {
    const p = G.player;
    const era = G.era;
    const d = ERA_DEF[era];
    if (era !== this.lastEra) {
      this.lastEra = era;
      this.eraYear.textContent = ERA_YEARS[era];
      this.eraName.textContent = ERA_NAMES[era];
      document.documentElement.style.setProperty('--accent', d.accent);
      this.dots.forEach((dot, i) => dot.classList.toggle('cur', i === era));
    }
    const sh = G.shift;
    this.dots.forEach((dot, i) => {
      dot.classList.toggle('blocked', !!sh.obstructed[i] && i !== era);
      dot.classList.toggle('locked', !sh.unlocked[i]);
      dot.classList.toggle('peek', sh.peekHeld && sh.peekEra === i);
    });
    this.chargeFill.style.width = `${sh.charge * 100}%`;
    this.chargeBar.classList.toggle('low', sh.charge < sh.cost);
    const loc = `${DISTRICT_NAMES[districtAt(p.pos.x, p.pos.z)] || ''} · ${nearestStreetName(p.pos.x, p.pos.z)}`;
    if (loc !== this._loc) { this._loc = loc; this.location.textContent = loc; }
    this.hpBar.firstChild.style.width = `${(p.health / p.maxHealth) * 100}%`;
    this.armBar.firstChild.style.width = `${p.armor}%`;
    this.armBar.style.display = p.armor > 0 ? '' : 'none';
    this.stBar.firstChild.style.width = `${p.stamina * 100}%`;
    this.clock.textContent = formatTime(G.dayTime);
    G.engine.final.uLowHealth.value = p.health < 30 ? (1 - p.health / 30) * 0.8 : 0;

    // weapon
    const w = G.combat && G.combat.current();
    const wtxt = w ? `<div class="wn">${w.name}</div>${w.mag !== undefined && w.def.mag ? `<div class="am">${w.mag}<span>/${w.reserve}</span></div>` : ''}` : '';
    if (wtxt !== this._w) { this._w = wtxt; this.weapon.innerHTML = wtxt; }
    // crosshair
    this.cross.classList.toggle('on', !!(p.aiming || (w && w.def.melee && false)));
    if (G.combat) this.cross.style.setProperty('--spread', `${8 + G.combat.spread * 120}px`);
    this.hitmarkT -= dt;
    if (this.hitmarkT <= 0) this.hitmark.classList.remove('on');
    // wanted
    const wl = G.authority ? G.authority.level(era) : 0;
    const wtext = wl > 0 ? `<span class="wl">${'◆'.repeat(wl)}${'◇'.repeat(5 - wl)}</span><span class="wa">${G.authority.label(era)}</span>` : '';
    if (wtext !== this._wanted) { this._wanted = wtext; this.wanted.innerHTML = wtext; }
    this.wanted.classList.toggle('flash', !!(G.authority && G.authority.seen(era)));
    // vehicle speedo
    if (p.vehicle) {
      this.speedo.style.display = '';
      this.speedo.innerHTML = `<b>${Math.round(p.vehicle.speed * 3.6)}</b> km/h<div class="vh"><div style="width:${p.vehicle.health}%"></div></div>`;
    } else this.speedo.style.display = 'none';
    // timers
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.classList.remove('on'); }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.subtitle.classList.remove('on'); }
    if (this.revealT > 0) { this.revealT -= dt; if (this.revealT <= 0) this.reveal.classList.remove('on'); }
    // damage direction ring
    this.dmgDirs = this.dmgDirs.filter((dd) => (dd.t -= dt * 0.8) > 0);
    if (this.dmgDirs.length) {
      const dd = this.dmgDirs[this.dmgDirs.length - 1];
      const ang = Math.atan2(dd.x - p.pos.x, dd.z - p.pos.z) - G.cam.yaw;
      this.dmgRing.style.opacity = dd.t;
      this.dmgRing.style.transform = `translate(-50%,-50%) rotate(${-ang}rad)`;
    } else this.dmgRing.style.opacity = 0;
    if (G.frame % 3 === 0) this.drawMinimap();
    if (G.debug && G.frame % 15 === 0) {
      const info = G.renderer.info;
      this.fps.textContent = `${Math.round(G.fpsAvg)} fps · ${info.render.calls} calls · ${(info.render.triangles / 1000).toFixed(0)}k tris · chunks ${G.chunks.stats.active}`;
    }
    this.fps.style.display = G.debug ? '' : 'none';
  }

  drawMinimap() {
    const c = this.mctx, W = 220, H = 220;
    const p = G.player;
    const scale = 0.55; // px per metre
    const yaw = G.cam.yaw;
    c.save();
    c.clearRect(0, 0, W, H);
    c.beginPath();
    c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
    c.clip();
    const era = G.era;
    c.fillStyle = era === 0 ? 'rgba(30,26,22,0.82)' : era === 1 ? 'rgba(10,12,24,0.82)' : 'rgba(14,26,18,0.82)';
    c.fillRect(0, 0, W, H);
    c.translate(W / 2, H / 2);
    c.rotate(yaw - Math.PI);
    c.scale(scale, scale);
    c.translate(-p.pos.x, -p.pos.z);
    // roads & buildings from active chunks
    const acc = ERA_DEF[era].accent;
    c.lineWidth = 1 / scale;
    G.chunks.forEachActive(era, (ch, ec) => {
      c.fillStyle = era === 2 ? 'rgba(80,110,70,0.5)' : 'rgba(90,90,100,0.45)';
      c.fillRect(ch.x0, ch.z0, 96, 96);
      c.fillStyle = era === 1 ? 'rgba(40,50,70,0.9)' : era === 2 ? 'rgba(40,60,40,0.9)' : 'rgba(60,52,44,0.9)';
      const b = ch.blockRect || (ch.blockRect = null);
      for (const col of ec.colliders) {
        if (col.maxY - col.minY < 4 || col.maxX - col.minX < 3) continue;
        c.fillRect(col.minX, col.minZ, col.maxX - col.minX, col.maxZ - col.minZ);
      }
      void b;
    });
    // markers
    for (const m of this.markers) {
      if (m.era !== undefined && m.era !== era) continue;
      c.fillStyle = m.color || acc;
      c.beginPath();
      c.arc(m.x, m.z, (m.r || 7) / scale * 0.5, 0, Math.PI * 2);
      c.fill();
    }
    if (G.minimapExtra) G.minimapExtra(c, scale);
    c.restore();
    // edge markers (off-map objectives)
    for (const m of this.markers) {
      if (m.era !== undefined && m.era !== era) continue;
      const dx = m.x - p.pos.x, dz = m.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist * scale < W / 2 - 10) continue;
      const a = Math.atan2(dx, dz) - yaw;
      const r = W / 2 - 10;
      const sx = W / 2 - Math.sin(a) * r, sy = H / 2 - Math.cos(a) * r;
      c.fillStyle = m.color || acc;
      c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill();
    }
    // player arrow
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(yaw - p.yaw);
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 6); c.lineTo(0, 3); c.lineTo(-6, 6); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = acc;
    c.lineWidth = 2;
    c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); c.stroke();
  }
}
