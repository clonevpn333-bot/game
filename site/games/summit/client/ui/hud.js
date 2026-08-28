/* In-run HUD: vitals, altitude ladder, team, prompts, belt, feed, banners. */
import { h, clear, fmt } from './kit.js';
import { BIOMES, STAMINA, SURVIVAL, STATUS, WORLD } from '../../shared/constants.js';
import { ITEMS, inventoryWeight, PACKS } from '../../shared/items.js';
import { FLAG } from '../../shared/protocol.js';

export class HUD {
  constructor(root) {
    this.root = root;
    this.feedLines = [];
    this.build();
    this.lastHp = SURVIVAL.hpMax;
  }

  build() {
    const bar = (cls, label) => {
      const fill = h('i');
      const val = h('span', {}, '');
      const el = h('div', {},
        h('div', { class: 'bar__label' }, h('span', {}, label), val),
        h('div', { class: `bar ${cls}` }, fill));
      return { el, fill, val };
    };
    this.stam = bar('bar--stam', 'Stamina');
    this.hp = bar('bar--hp', 'Health');
    this.food = bar('bar--food', 'Hunger');
    this.tempMark = h('b');
    this.vitals = h('div', { class: 'vitals pass' },
      this.stam.el, this.hp.el, this.food.el,
      h('div', {}, h('div', { class: 'bar__label' }, h('span', {}, 'Body heat'), h('span', {}, '')),
        h('div', { class: 'temp' }, this.tempMark)));

    this.crosshair = h('div', { class: 'crosshair pass' });
    this.statuses = h('div', { class: 'statuses pass' });
    this.team = h('div', { class: 'team pass' });
    this.promptEl = h('div', { class: 'prompt pass hide' });
    this.belt = h('div', { class: 'belt pass' });
    this.feed = h('div', { class: 'feed pass' });
    this.netstat = h('div', { class: 'netstat pass' });
    this.banner = h('div', { class: 'banner pass hide' });

    this.altBands = h('div');
    this.altMates = h('div');
    this.altMe = h('div', { class: 'altitude__me' });
    this.altRead = h('div', { class: 'altitude__read' }, h('span', {}, 'Altitude'), h('em', { class: 'mono' }, '0 m'));
    this.altitude = h('div', { class: 'altitude pass' },
      h('div', { class: 'altitude__track' }), this.altBands, this.altMates, this.altMe, this.altRead);
    for (const b of BIOMES) {
      const from = Math.max(0, b.from) / WORLD.summit, to = Math.min(WORLD.summit, b.to) / WORLD.summit;
      this.altBands.append(h('div', {
        class: 'altitude__band',
        style: { bottom: (from * 100) + '%', height: ((to - from) * 100) + '%', background: `rgb(${b.tint.map((c) => Math.round(c * 255)).join(',')})` },
      }));
    }

    this.hurtVig = h('div', { class: 'vig vig--hurt' });
    this.coldVig = h('div', { class: 'vig vig--cold' });
    this.tiredVig = h('div', { class: 'vig vig--tired' });

    this.el = h('div', { id: 'hud', class: 'pass' },
      this.crosshair, this.vitals, this.altitude, this.team, this.statuses,
      this.promptEl, this.belt, this.feed, this.netstat, this.banner);
    this.root.append(this.hurtVig, this.coldVig, this.tiredVig, this.el);
  }

  show(v) { this.el.classList.toggle('hide', !v); }

  setPrompt(p, holdFrac = 0) {
    if (!p) { this.promptEl.classList.add('hide'); return; }
    this.promptEl.classList.remove('hide');
    if (this.promptText !== p.label) {
      this.promptText = p.label;
      clear(this.promptEl).append(h('span', { html: p.label.replace(/^([A-Z]|Hold [A-Z])\b/, '<b>$1</b>') }));
      if (p.hold) this.promptEl.append(this.holdBar = h('span', { class: 'prompt__hold' }, this.holdFill = h('i')));
      else this.holdBar = null;
    }
    if (this.holdFill) this.holdFill.style.width = Math.min(100, holdFrac * 100) + '%';
  }

  setVitals(me, moveState) {
    if (!me) return;
    const stam = (moveState?.stamina ?? me.s) / STAMINA.max;
    this.stam.fill.style.transform = `scaleX(${clamp01(stam)})`;
    this.stam.val.textContent = Math.round(stam * 100) + '%';
    this.hp.fill.style.transform = `scaleX(${clamp01(me.h / SURVIVAL.hpMax)})`;
    this.hp.val.textContent = Math.round(me.h);
    this.food.fill.style.transform = `scaleX(${clamp01(me.u / SURVIVAL.hungerMax)})`;
    this.food.val.textContent = Math.round(me.u) + '%';
    this.tempMark.style.left = `calc(${clamp01(me.t / SURVIVAL.tempMax) * 100}% - 1.5px)`;

    this.hurtVig.style.opacity = String(Math.max(0, 1 - me.h / 45) * 0.9);
    this.coldVig.style.opacity = String(Math.max(0, 1 - me.t / 28) * 0.8);
    this.tiredVig.style.opacity = String(Math.max(0, 1 - stam / 0.22) * 0.85);
    if (me.h < this.lastHp - 2) { this.hurtVig.style.opacity = '1'; }
    this.lastHp = me.h;

    const cur = (me.st || []).join(',');
    if (cur !== this.statusKey) {
      this.statusKey = cur;
      clear(this.statuses);
      for (const id of me.st || []) {
        const d = STATUS[id];
        if (d) this.statuses.append(h('div', { class: 'status', style: { color: d.color } }, d.name));
      }
    }
  }

  setAltitude(me, mates) {
    if (!me) return;
    const k = clamp01(me.y / WORLD.summit);
    this.altMe.style.bottom = (k * 100) + '%';
    this.altRead.style.bottom = (k * 100) + '%';
    this.altRead.lastChild.textContent = `${Math.round(me.y)} m`;
    while (this.altMates.children.length < mates.length) this.altMates.append(h('div', { class: 'altitude__mate' }));
    [...this.altMates.children].forEach((el, i) => {
      const m = mates[i];
      el.style.display = m ? 'block' : 'none';
      if (m) el.style.bottom = (clamp01(m.y / WORLD.summit) * 100) + '%';
    });
  }

  setTeam(list, meId) {
    const key = list.map((p) => `${p.i}${p.f}${Math.round(p.s)}${Math.round(p.y)}`).join('|');
    if (key === this.teamKey) return;
    this.teamKey = key;
    clear(this.team);
    for (const p of list) {
      const dead = p.f & FLAG.DEAD, down = p.f & FLAG.DOWNED, off = !(p.f & FLAG.ONLINE);
      this.team.append(h('div', { class: 'mate' },
        h('span', { class: 'mate__dot' + (off ? ' is-off' : dead ? ' is-dead' : down ? ' is-down' : '') }),
        h('span', { class: 'mate__name' }, p.n + (p.i === meId ? ' (you)' : '')),
        h('span', { class: 'mate__bar' }, h('i', { style: { width: clamp01(p.s / STAMINA.max) * 100 + '%' } })),
        h('span', { class: 'mate__alt' }, Math.round(p.y) + 'm')));
    }
  }

  setBelt(inv, pack) {
    const key = JSON.stringify(inv) + pack;
    if (key === this.beltKey) return;
    this.beltKey = key;
    clear(this.belt);
    const def = PACKS[pack] || PACKS.small;
    for (let i = 0; i < def.slots; i++) {
      const slot = inv[i];
      this.belt.append(h('div', { class: 'slot' + (slot ? '' : ' is-empty') },
        h('span', { class: 'slot__key' }, String(i + 1)),
        h('span', { class: 'slot__name' }, slot ? (ITEMS[slot.id]?.name || slot.id) : ''),
        slot && slot.n > 1 ? h('span', { class: 'slot__n' }, '×' + slot.n) : null));
    }
    const kg = inventoryWeight(inv);
    this.belt.append(h('div', { class: 'belt__weight' + (kg > def.capacity * 0.92 ? ' is-over' : '') },
      `${kg.toFixed(1)} / ${def.capacity} kg`));
  }

  pushFeed(html) {
    const line = h('div', { class: 'feed__line', html });
    this.feed.append(line);
    this.feedLines.push(line);
    if (this.feedLines.length > 6) this.feedLines.shift().remove();
    setTimeout(() => { line.style.transition = 'opacity .6s'; line.style.opacity = '0'; setTimeout(() => line.remove(), 650); }, 7000);
  }

  showBanner(title, sub) {
    clear(this.banner).append(h('p', {}, sub || ''), h('h2', {}, title));
    this.banner.classList.remove('hide', 'is-out');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => {
      this.banner.classList.add('is-out');
      setTimeout(() => this.banner.classList.add('hide'), 1100);
    }, 2600);
  }

  setNet(status, rtt, players) {
    const bad = status !== 'online' || rtt > 220;
    this.netstat.innerHTML = `<b class="${bad ? 'is-bad' : ''}">${status === 'online' ? Math.round(rtt) + ' ms' : status}</b> · ${players} climbing`;
  }

  setCrosshair(v) { this.crosshair.style.opacity = v ? '1' : '0'; }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
