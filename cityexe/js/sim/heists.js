// Bank heists and the legal gun trade. A bank is realistic: the tellers' drawers
// hold a few thousand dollars; everyone's deposits sit in the vault behind a
// steel door you need a drill or a thermal charge (and time) to get through.
// Alarms bring an escalating police response; armed guards fight back.
import { WEAPONS } from './combat.js';
import { ensureLife } from './lifeState.js';
import { openPanel, money, esc } from '../ui/panels.js';
import { rand } from '../core/rng.js';
import { dist, clamp } from '../core/math.js';

export const GEAR = {
  drill: { label: 'Industrial drill', price: 3500, illegal: false, desc: 'Gets through a vault door. Slowly. Loudly.' },
  thermite: { label: 'Thermal charge', price: 2200, illegal: true, desc: 'Burns through steel in minutes.' },
  mask: { label: 'Ski mask', price: 40, desc: 'Cameras and witnesses can\'t identify you.' },
  armour: { label: 'Body armour', price: 1200, desc: 'Halves the damage you take.' },
  lockpicks: { label: 'Lockpicks', price: 150, desc: 'Open parked cars quietly.' },
};

export class Heists {
  constructor(W) {
    this.W = W;
    this.vaults = {};    // bid -> { open, progress, method, startedAt, alarm }
    this.licences = {};
  }
  vaultOpen(bid) { return !!this.vaults[bid]?.open; }
  vaultLabel(b, c) {
    const V = this.vaults[b.id];
    const L = ensureLife(c, this.W);
    if (V?.open) return 'The vault is open';
    if (V?.progress) return `${V.method === 'drill' ? 'Drilling' : 'Burning'} the vault… ${Math.round(V.progress * 100)}% (stay close)`;
    if (L.inv.thermite > 0) return 'Place a thermal charge on the vault door';
    if (L.inv.drill > 0) return 'Drill the vault door';
    return 'Vault door — you\'d need a drill or a thermal charge';
  }

  // ------------------------------------------------------------ the teller
  tellerRobbery(c, b, game) {
    const W = this.W;
    const biz = W.economy.biz[b.bizId];
    const armed = game.weapons && game.weapons.cur && game.weapons.cur !== 'fists';
    if (!armed) { game.toast('The teller stares at you. "Sir, are you… robbing us? With your hands?" (Draw a weapon with X first.)', 4); return; }
    if (W.time - (biz.robbedAt || -1e9) < 60) { game.toast('The drawers are already empty.'); return; }
    biz.robbedAt = W.time;
    const take = Math.round((biz.drawers || 3000) * (0.4 + rand.float() * 0.3));
    biz.drawers = Math.max(500, (biz.drawers || 3000) - take);
    const L = ensureLife(c, W);
    let got = take;
    if (rand.chance(0.3)) { got = Math.round(take * 0.4); game.toast(`A dye pack explodes in the bag — most of the $${take.toLocaleString()} is ruined. You keep $${got.toLocaleString()}.`, 5); }
    else game.toast(`The teller fills the bag: $${take.toLocaleString()}. The silent alarm is already ringing at the precinct.`, 5);
    c.money += got;
    L.dirty = (L.dirty || 0) + got;
    this.alarm(b, c, 2.5, 'Bank robbery');
    W.history.citizenLog(c, `Robbed ${biz.name} ($${got.toLocaleString()})`, true);
    W.history.cityEvent(`${biz.name} robbed at gunpoint`, { type: 'robbery', x: b.door[0], z: b.door[1] });
  }

  alarm(b, c, heat, title) {
    const W = this.W;
    const masked = ensureLife(c, W).inv.mask;
    const V = this.vaults[b.id] || (this.vaults[b.id] = {});
    if (!V.inc || V.inc.closed) {
      V.inc = W.incidents.create('heist', { x: b.door[0], z: b.door[1], building: b.id, suspects: [c.id], priority: 2, needs: { police: 4 }, title, reported: true });
      c.flags.suspectOf = V.inc.id;
    }
    V.inc.needs.police = Math.min(8, V.inc.needs.police + 2);
    W.combat.raiseHeat(heat, V.inc);
    if (!masked) c.record.crimes++;
    else c.flags.unidentified = true;
    V.hostile = W.time;
    this.game?.audio?.alarm();
  }

  // ------------------------------------------------------------ the vault
  vaultUse(I, game) {
    const W = this.W, c = I.c, b = I.b;
    const L = ensureLife(c, W);
    const V = this.vaults[b.id] || (this.vaults[b.id] = {});
    this.game = game;
    if (V.open) return;
    if (V.progress) { game.toast('Keep at it. Don\'t leave the vault.'); return; }
    const method = L.inv.thermite > 0 ? 'thermite' : L.inv.drill > 0 ? 'drill' : null;
    if (!method) { game.toast('The vault door is a foot of steel. You\'d need a drill or a thermal charge (try the underground).', 5); return; }
    if (method === 'thermite') L.inv.thermite--;
    V.method = method; V.progress = 0.001; V.startedAt = W.time; V.need = method === 'drill' ? 40 : 8;
    V.bid = b.id;
    game.toast(method === 'drill' ? 'You brace the drill against the door. It screams.' : 'The charge flares white. Molten steel drips.', 4);
    game.audio && game.audio.alarm();
    // alarms trip within a minute or two of tampering
    this.alarm(b, c, 3, 'Bank vault breach');
  }
  grabCash(I, game) {
    const W = this.W, c = I.c, b = I.b;
    const biz = W.economy.biz[b.bizId];
    const L = ensureLife(c, W);
    if (!this.vaultOpen(b.id)) { game.toast('The vault is still sealed.'); return; }
    const load = Math.round(Math.min(biz.vault || 0, 60000 + rand.float() * 60000));
    if (load <= 0) { game.toast('The vault is empty.'); return; }
    biz.vault -= load;
    c.money += load;
    L.dirty = (L.dirty || 0) + load;
    W.combat.raiseHeat(1.5);
    game.toast(`You stuff $${load.toLocaleString()} into duffel bags. ${biz.vault > 1000 ? `There's $${Math.round(biz.vault).toLocaleString()} left — greed gets people killed.` : 'That\'s everything.'}`, 5);
    if (!V(this, b).logged) { V(this, b).logged = true; W.history.citizenLog(c, `Robbed the vault at ${biz.name}`, true); W.history.cityEvent(`The vault at ${biz.name} was cleaned out in a heist`, { type: 'robbery', x: b.door[0], z: b.door[1] }); W.history.record && W.history.record('biggestHeist', load, `Biggest heist: $${load.toLocaleString()} (${biz.name})`, { x: b.x, z: b.z }); }
    // the depositors' money is gone from the bank, not from their accounts — the bank eats it
    biz.cash -= load * 0.1;
  }

  // ------------------------------------------------------------ per frame (indoors)
  update(dt, game) {
    const W = this.W, I = game.interiors;
    for (const bid in this.vaults) {
      const V = this.vaults[bid];
      if (!V.progress || V.open) continue;
      const dm = W.time - (V.lastT ?? W.time);
      V.lastT = W.time;
      const here = I && I.active && I.b && I.b.id === +bid && I.player && dist(I.player.x, I.player.z, 5.0, -5.3) < 2.4;
      if (!here) continue;
      V.progress = clamp(V.progress + dm / V.need, 0.001, 1);
      if (I.player) I.player.action = 'repair';
      if (V.progress >= 1) { V.open = true; V.progress = 0; I.player.action = ''; I.setVaultOpen(true); game.toast('The vault door swings open.', 4); }
    }
    // armed guards fight back during a robbery
    if (I && I.active && I.b && this.vaults[I.b.id]?.hostile && W.time - this.vaults[I.b.id].hostile < 240) {
      const c = I.c, p = I.player;
      this.gT = (this.gT || 0) - dt;
      if (this.gT <= 0 && c.status === 'ok') {
        this.gT = 1.1 + rand.float() * 0.8;
        for (const f of I.figs.values()) {
          const o = W.citizens[f.cid];
          if (!o || o.status !== 'ok' || f.action === 'down') continue;
          if (o.job?.role === 'security guard' || (o.duty != null && o.job?.role === 'officer')) {
            f.action = 'aim'; f.h = Math.atan2(p.x - f.x, p.z - f.z);
            const d = dist(f.x, f.z, p.x, p.z);
            W.emit('shot', { shooter: o, wid: 'pistol', from: { x: f.x, y: 1.4, z: f.z }, shots: [{ from: { x: f.x, y: 1.4, z: f.z }, to: { x: p.x, y: 1.2, z: p.z }, hit: 'ped' }], noise: 1, indoor: true });
            if (rand.float() < 0.45 * (1 - d / 30)) W.combat.wound(c, 0.14, o, 'pistol');
          } else if (f.action !== 'hail') f.action = 'hail';
        }
      }
    }
  }

  // shooting indoors: hit the nearest person in front of you
  indoorShot(game, wid) {
    const W = this.W, I = game.interiors, p = I.player, c = I.c;
    let best = null, bd = WEAPONS[wid].range;
    for (const f of I.figs.values()) {
      const d = dist(f.x, f.z, p.x, p.z);
      const ang = Math.atan2(f.x - p.x, f.z - p.z);
      const da = Math.abs(((ang - p.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < 0.22 + 0.6 / Math.max(1, d) && d < bd) { bd = d; best = f; }
    }
    const to = best ? { x: best.x, y: 1.2, z: best.z } : { x: p.x + Math.sin(p.h) * 12, y: 1.3, z: p.z + Math.cos(p.h) * 12 };
    W.emit('shot', { shooter: c, wid, from: { x: p.x, y: 1.4, z: p.z }, shots: [{ from: { x: p.x, y: 1.4, z: p.z }, to, hit: best ? 'ped' : 'wall' }], noise: WEAPONS[wid].noise, indoor: true });
    const V = this.vaults[I.b.id] || (this.vaults[I.b.id] = {});
    V.hostile = W.time;
    if (best) {
      const o = W.citizens[best.cid];
      W.combat.wound(o, WEAPONS[wid].dmg * (0.8 + rand.float() * 0.5), c, wid);
      if (o.status !== 'ok' || o.injured > 0) best.action = 'down';
    }
    for (const f of I.figs.values()) if (f !== best && f.action !== 'down' && f.action !== 'aim') f.action = 'hail';
    if (W.combat.heat < 2) { const b = I.b; this.alarm(b, c, 2, 'Shots fired'); }
  }

  // ------------------------------------------------------------ gun store
  gunStore(c, biz, game) {
    const W = this.W, L = ensureLife(c, W);
    const items = Object.entries(WEAPONS).filter(([, w]) => w.price && !w.illegal);
    const render = () => `<p>Licence: <b>${L.license.gun ? 'valid' : 'none'}</b>${L.license.gun ? '' : ' — firearms need a licence (apply at a police station front desk).'} · Cash ${money(c.money)}</p>
      <div class="menu">${items.map(([k, w]) => `<button data-w="${k}" ${c.money < w.price || (w.licence && !L.license.gun) || (L.inv.weapons || []).includes(k) ? 'disabled' : ''}><span>${w.label}${(L.inv.weapons || []).includes(k) ? ' (owned)' : ''}</span><b>${money(w.price)}</b></button>`).join('')}
      ${['pistol', 'revolver', 'shotgun'].filter((k) => (L.inv.weapons || []).includes(k)).map((k) => `<button data-ammo="${k}" ${c.money < 40 ? 'disabled' : ''}><span>Ammo for ${WEAPONS[k].label} (×${k === 'shotgun' ? 12 : 30})</span><b>${money(40)}</b></button>`).join('')}
      <button data-g="armour" ${c.money < GEAR.armour.price || L.inv.armour ? 'disabled' : ''}><span>Body armour</span><b>${money(GEAR.armour.price)}</b></button></div>`;
    openPanel(game, {
      title: '🎯 ' + esc(biz.name), html: render(),
      onBind(a) {
        a.el.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => { const w = WEAPONS[b.dataset.w]; c.money -= w.price; biz.cash += w.price; L.inv.weapons = [...(L.inv.weapons || []), b.dataset.w]; L.ammo = L.ammo || {}; if (!w.melee) L.ammo[b.dataset.w] = (L.ammo[b.dataset.w] || 0) + 30; W.history.citizenLog(c, `Bought a ${w.label}`, false); game.toast(`${w.label} bought. Press X on foot to draw it.`); a.set(render()); });
        a.el.querySelectorAll('[data-ammo]').forEach((b) => b.onclick = () => { c.money -= 40; biz.cash += 40; L.ammo = L.ammo || {}; L.ammo[b.dataset.ammo] = (L.ammo[b.dataset.ammo] || 0) + (b.dataset.ammo === 'shotgun' ? 12 : 30); a.set(render()); });
        a.el.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { c.money -= GEAR.armour.price; L.inv.armour = true; a.set(render()); });
      },
    });
  }

  applyLicence(c, game) {
    const W = this.W, L = ensureLife(c, W);
    if (L.license.gun) { game.toast('You already have a gun licence.'); return; }
    if (c.age < 21) { game.toast('You must be 21 to own a firearm.'); return; }
    if (c.record.arrests > 0) { game.toast('Background check failed: you have an arrest record.'); return; }
    if (c.money < 150) { game.toast('The licence fee is $150.'); return; }
    c.money -= 150;
    L.license.gun = true;
    game.toast('Background check clear. Your gun licence is approved ($150).', 4);
  }

  serialize() { const out = {}; for (const k in this.vaults) { const v = this.vaults[k]; out[k] = { open: v.open, progress: v.progress, method: v.method, need: v.need }; } return out; }
  deserialize(o) { if (!o) return; for (const k in o) this.vaults[k] = { ...o[k] }; }
}

const V = (H, b) => H.vaults[b.id] || (H.vaults[b.id] = {});
