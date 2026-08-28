/* Post-run screen: who fell, who carried, how high everyone got. */
import { h } from './kit.js';
import { awardRun } from './shop.js';

export class Results {
  constructor(root, data, meId, { onClose }) {
    const me = data.players.find((p) => p.id === meId);
    const profile = me ? awardRun(me.reward, me.peak) : null;

    this.el = h('div', { class: 'screen' }, h('div', { class: 'card' },
      h('div', { class: 'eyebrow' }, data.extracted ? 'Extraction complete' : 'The mountain won'),
      h('h1', {}, data.extracted ? 'Off the summit' : 'Run over'),
      h('p', { style: { marginTop: '10px' } },
        `Highest point ${data.peak} m · ${data.camps} campfire${data.camps === 1 ? '' : 's'} lit · ${fmtTime(data.duration)} on the mountain.`),
      h('div', { class: 'sep' }),
      data.badges.length ? h('div', { class: 'list' }, ...data.badges.map((b) => h('div', { class: 'badge' },
        h('div', {}, h('b', {}, b.who), h('br'), h('span', {}, b.label)),
        h('span', { style: { marginLeft: 'auto' }, class: 'mono' }, String(b.value))))) : null,
      h('div', { class: 'sep' }),
      h('table', { class: 'stats' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Climber'), h('th', {}, 'Peak'), h('th', {}, 'Falls'),
          h('th', {}, 'Revives'), h('th', {}, 'Boosts'), h('th', {}, 'Loot'), h('th', {}, 'Coins'))),
        h('tbody', {}, ...data.players.map((p) => h('tr', {},
          h('td', {}, p.name + (p.id === meId ? ' (you)' : '')),
          h('td', { class: 'mono' }, p.peak + ' m'),
          h('td', { class: 'mono' }, String(p.falls)),
          h('td', { class: 'mono' }, String(p.revives)),
          h('td', { class: 'mono' }, String(p.boosts)),
          h('td', { class: 'mono' }, String(p.items)),
          h('td', { class: 'mono', style: { color: 'var(--accent)' } }, '+' + p.reward))))),
      h('div', { class: 'sep' }),
      h('div', { class: 'row' },
        profile ? h('span', { class: 'wallet' }, profile.coins + ' coins') : null,
        h('span', { style: { flex: '1' } }),
        h('button', { class: 'btn btn--primary', onclick: () => { this.el.remove(); onClose?.(); } }, 'Back to the hangar'))));
    root.append(this.el);
  }
  remove() { this.el.remove(); }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}
