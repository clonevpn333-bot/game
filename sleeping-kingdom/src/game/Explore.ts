import * as THREE from 'three';
import type { Game } from './Game';
import type { Enemy } from '../entities/Enemies';
import { Marrowmite, Penitent } from '../entities/Enemies';
import { dressAsThrall } from '../entities/Enemies2';
import { DuelKnight, FrostWolf } from '../entities/Enemies3';
import { Mats } from '../world/Materials';
import { lathe, place, prep, worldBox } from '../world/geo';
import { MARSH_WATER } from '../world/Terrain';
import { merge } from '../world/geo';

// ============================================================================ saved progress

export type Progress = { embers: number; vigor: number; endurance: number; strength: number; kindle: number; found: string[] };
const KEY = 'sleeping-kingdom-progress';

export function loadProgress(): Progress {
  const base: Progress = { embers: 0, vigor: 0, endurance: 0, strength: 0, kindle: 0, found: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    /* storage blocked: play without saving */
  }
  return base;
}

export function saveProgress(p: Progress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/** Ember cost of the next level in a stat. */
export const levelCost = (lvl: number) => 60 + lvl * 45;

export const EMBERS: Record<string, number> = { mite: 8, penitent: 22, witch: 30, wolf: 16, hollow: 48, boss: 300, dragon: 420, ivarr: 520, morvane: 0 };

// ============================================================================ authored content

type Reward = { embers?: number; kindle?: boolean; vigor?: boolean };
type Note = { title: string; lines: string[] };
type Guard = 'mite' | 'penitent' | 'thrall' | 'wolf' | 'hollow';
type AreaDef = {
  id: string;
  /** Path distance, side (+1 right / -1 left, 0 = auto: the uphill side), distance from the road's edge, radius. */
  s: number;
  side: number;
  off: number;
  r: number;
  chest?: Reward;
  note?: Note;
  guards?: Guard[];
  ruin?: boolean;
};

export const NOTES: Record<string, Note> = {};

function defs(ch: number, g: Game): AreaDef[] {
  const p = g.path;
  const z = (n: Parameters<typeof p.zoneStart>[0]) => p.zoneStart(n);
  switch (ch) {
    case 1:
      return [
        {
          id: 'c1-meadow', s: 70, side: 0, off: 15, r: 17, guards: ['mite', 'mite', 'mite'], chest: { embers: 140 },
          note: { title: 'A shepherd’s tally', lines: ['Three ewes lost this week. Not to wolves: they walked into the rock and did not come out.', 'The ground hums at night. My dog will not lie down on it.'] },
        },
        {
          id: 'c1-watch', s: Math.min(z('bridge') - 60, 300), side: 0, off: 16, r: 15, ruin: true, guards: ['penitent'], chest: { kindle: true },
          note: { title: 'Watch-log, Pilgrim Road', lines: ['Bells heard from the city at the second hour. Nobody was ringing them.', 'Captain says write nothing. I am writing it anyway.'] },
        },
      ];
    case 2:
      return [
        {
          id: 'c2-glade', s: 70, side: 0, off: 14, r: 14, guards: ['thrall', 'thrall'], chest: { embers: 180 },
          note: { title: 'A Thornwife’s charm', lines: ['Hush now, hush, the hill is sleeping. Hush now, hush, the bell is keeping.', 'A lullaby, scratched on bark. The last line has been torn away.'] },
        },
        { id: 'c2-hollow', s: z('hamlet') - 40, side: 0, off: 14, r: 13, chest: { vigor: true }, ruin: true },
      ];
    case 3:
      return [
        {
          id: 'c3-isle', s: z('village') + 26, side: 0, off: 13, r: 11, guards: ['penitent'], chest: { embers: 220 },
          note: { title: 'A drowned hymnbook', lines: ['The pages are pulp, but one verse survived: “Sleep, great one, on the floor of the world.”', 'Someone has underlined it, twice.'] },
        },
      ];
    case 4:
      return [
        {
          id: 'c4-camp', s: z('camp') + 40, side: 0, off: 9, r: 12, guards: ['wolf', 'wolf'], chest: { kindle: true },
          note: { title: 'Bell Guard roll call', lines: ['Forty-one names. Thirty-eight are crossed out.', 'The last entry, in Ivarr’s hand: “Hold the bell. Hold yourselves. Hold.”'] },
        },
      ];
    case 5:
      return [
        {
          id: 'c5-vault', s: z('cavern') + 60, side: 0, off: 3, r: 7, guards: ['hollow'], chest: { embers: 400 },
          note: { title: 'Morvane’s sermon', lines: ['“We do not worship the Founders. We apologise to them, for every century we kept them dreaming.”', 'In the margin, smaller: “Forgive me, Ivarr.”'] },
        },
      ];
    default:
      return [];
  }
}

const TALK: Record<string, string[]> = {
  Gatewarden: ['Mind the streets, ser. Folk are jumpy. Three wells ran warm this week.'],
  Washerwoman: ['The water in the trough was warm as a bath this morning. In autumn!', 'My mother said the mountain breathes. I used to laugh at her.'],
  Tanner: ['Hides won’t cure. Everything sweats in this town lately.'],
  Lamplighter: ['Every lamp on this street, every night, for twenty years. Tonight the flames lean toward the cathedral. All of them.'],
  'Old Bram': ['When I was a boy, the bells rang only once a year, for the Hymn. Never at night. Never like this.'],
  Porter: ['Can’t stop, ser. Merchants want their crates up the hill before the bells start again.'],
  'Spice Merchant': ['Best saffron this side of the Ashfront. No? Then step aside, ser knight.'],
  'Goodwife Ama': ['The towers are empty, ser. I sweep the chapel steps. Nobody went up tonight.'],
  Pilgrim: ['I walked forty days to pray at the Still Bell. Now the Bell will not be still.'],
  Watchman: ['Orders are to keep the market calm. Nobody told us how.'],
  Boy: ['Ser! Is it true knights can kill anything? Even a mountain?'],
  Mendicant: ['Alms for the waking god, ser knight. He will be hungry.'],
};

// ============================================================================ runtime

type Chest = { id: string; pos: THREE.Vector3; lid: THREE.Object3D; open: boolean; reward: Reward; glow: THREE.Mesh };
type Interact = { pos: THREE.Vector3; label: string; act: () => void; live: () => boolean };

/** Off-road exploration: open areas, guarded chests, lore notes, talkable townsfolk, embers and levelling. */
export class Explore {
  readonly progress = loadProgress();
  private readonly items: Interact[] = [];
  private readonly chests: Chest[] = [];
  private readonly pending: Array<{ id: string; c: THREE.Vector3; r: number; guards: Guard[]; anchorS: number }> = [];
  private prompt: Interact | null = null;
  private readonly emberEl = document.querySelector<HTMLElement>('#embers-count');

  constructor(private readonly g: Game) {
    for (const d of defs(g.chapterNo, g)) this.build(d);
    this.hookTalk();
    this.applyStats();
    this.updateEmbers();
  }

  private build(d: AreaDef): void {
    const g = this.g;
    const a = g.path.at(d.s);
    const t = g.terrain;
    let side = d.side;
    if (side === 0) {
      // The gentler, higher side of the road.
      const l = t.groundAt(a.pos.x - a.right.x * (a.width / 2 + d.off), a.pos.z - a.right.z * (a.width / 2 + d.off));
      const r = t.groundAt(a.pos.x + a.right.x * (a.width / 2 + d.off), a.pos.z + a.right.z * (a.width / 2 + d.off));
      const sl = t.slopeAt(a.pos.x - a.right.x * (a.width / 2 + d.off), a.pos.z - a.right.z * (a.width / 2 + d.off));
      const sr = t.slopeAt(a.pos.x + a.right.x * (a.width / 2 + d.off), a.pos.z + a.right.z * (a.width / 2 + d.off));
      side = Math.abs(l - a.pos.y) + sl * 6 < Math.abs(r - a.pos.y) + sr * 6 ? -1 : 1;
    }
    let c = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + d.off));
    const floor = (x: number, z: number) => t.groundAt(x, z) + 0.3;
    // Validate: dry and not a cliff. Shrink until it is, or give up.
    let r = d.r;
    const ok = (rr: number) => {
      for (let i = 0; i < 12; i += 1) {
        const ang = (i / 12) * Math.PI * 2;
        const x = c.x + Math.cos(ang) * rr * 0.8;
        const zz = c.z + Math.sin(ang) * rr * 0.8;
        if (g.chapterNo === 3 && t.groundAt(x, zz) < MARSH_WATER + 0.15) return false;
        if (t.slopeAt(x, zz) > 0.95) return false;
      }
      return g.chapterNo !== 3 || t.groundAt(c.x, c.z) > MARSH_WATER + 0.15;
    };
    while (r > 5 && !ok(r)) r -= 2;
    let inCorridor = d.off <= 4;
    if (!inCorridor && !ok(r)) {
      // No safe ground out there (water, cliffs): keep the cache by the roadside instead.
      inCorridor = true;
      c = a.pos.clone().addScaledVector(a.right, side * Math.max(1, a.width / 2 - 2));
    }
    if (!inCorridor) g.nav.areas.push({ x: c.x, z: c.z, r, anchorS: d.s, floor, slope: (x, z) => t.slopeAt(x, z) });
    c.y = inCorridor ? a.pos.y : floor(c.x, c.z);
    // A marker you can see from the road: a lantern on a post.
    const post = new THREE.Group();
    const pp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 1.2));
    post.position.set(pp.x, Math.min(a.pos.y, t.groundAt(pp.x, pp.z)) - 0.2, pp.z);
    post.add(new THREE.Mesh(worldBox(0.18, 2.6, 0.18, 1), Mats().wood).translateY(1.3));
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), Mats().lanternGlow);
    lamp.position.y = 2.5;
    post.add(lamp);
    if (!inCorridor) g.worldRoot.add(post);
    if (d.ruin) this.ruin(c, a.tangent);
    if (d.chest) this.chest(d.id, c.clone().addScaledVector(a.tangent, 1.5), a, d.chest, side);
    if (d.note) {
      NOTES[d.id] = d.note;
      this.note(d.id, c.clone().addScaledVector(a.tangent, -2.5).addScaledVector(a.right, side * 1.5), d.note);
    }
    if (d.guards?.length) this.pending.push({ id: d.id, c, r, guards: d.guards, anchorS: d.s });
  }

  private ruin(c: THREE.Vector3, tangent: THREE.Vector3): void {
    const t = this.g.terrain;
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i += 1) {
      const ang = (i / 7) * Math.PI * 2;
      const x = c.x + Math.cos(ang) * 5;
      const z = c.z + Math.sin(ang) * 5;
      const h = 1 + ((i * 37) % 5);
      parts.push(place(worldBox(1.6, h + 2, 1.6, 2), x, t.groundAt(x, z) - 1 + (h + 2) / 2, z, ang));
    }
    const b = t.groundAt(c.x - tangent.x * 6, c.z - tangent.z * 6);
    parts.push(place(prep(new THREE.CylinderGeometry(2.2, 2.6, 9, 7)), c.x - tangent.x * 6, b + 3.5, c.z - tangent.z * 6));
    const mesh = new THREE.Mesh(merge(parts), Mats().stoneDark);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.g.worldRoot.add(mesh);
    this.g.nav.obstacles.push({ x: c.x - tangent.x * 6, z: c.z - tangent.z * 6, r: 2.6 });
  }

  private chest(id: string, p: THREE.Vector3, a: { tangent: THREE.Vector3 }, reward: Reward, side: number): void {
    const g = this.g;
    const y = g.nav.areas.length && Math.abs(p.y - g.terrain.groundAt(p.x, p.z)) < 3 ? g.terrain.groundAt(p.x, p.z) + 0.25 : p.y;
    const group = new THREE.Group();
    group.position.set(p.x, y - 0.05, p.z);
    group.rotation.y = Math.atan2(a.tangent.x, a.tangent.z) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    const m = Mats();
    const body = new THREE.Mesh(worldBox(1.1, 0.6, 0.7, 1), m.wood);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);
    for (const x of [-0.4, 0.4]) group.add(new THREE.Mesh(worldBox(0.08, 0.64, 0.74, 1), m.ironDark).translateX(x).translateY(0.3));
    const lid = new THREE.Group();
    lid.position.set(0, 0.6, -0.35);
    const lidMesh = new THREE.Mesh(worldBox(1.1, 0.22, 0.7, 1), m.wood);
    lidMesh.position.set(0, 0.11, 0.35);
    lid.add(lidMesh);
    group.add(lid);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.04), m.goldGlow);
    glow.position.set(0, 0.6, 0.36);
    group.add(glow);
    g.worldRoot.add(group);
    const open = this.progress.found.includes(id);
    const ch: Chest = { id, pos: group.position, lid, open, reward, glow };
    if (open) {
      lid.rotation.x = -1.9;
      glow.visible = false;
    }
    this.chests.push(ch);
    g.nav.obstacles.push({ x: p.x, z: p.z, r: 0.6 });
    this.items.push({ pos: group.position, label: 'Open the chest', act: () => this.openChest(ch), live: () => !ch.open });
  }

  private openChest(c: Chest): void {
    const g = this.g;
    c.open = true;
    c.glow.visible = false;
    this.progress.found.push(c.id);
    g.audio.candle();
    g.vfx.holyMotes(c.pos.clone().setY(c.pos.y + 0.8), 30);
    const lid = c.lid;
    const t0 = performance.now();
    const anim = () => {
      const k = Math.min(1, (performance.now() - t0) / 600);
      lid.rotation.x = -1.9 * (1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(anim);
    };
    anim();
    const r = c.reward;
    if (r.embers) {
      this.addEmbers(r.embers);
      g.hud.hint(`Found <b>${r.embers} Embers</b>. Spend them at a Wayside Candle.`, 4);
    }
    if (r.kindle) {
      this.progress.kindle += 1;
      g.hud.hint('Found a <b>Flask Kindling</b>. Your Ember Flask holds one more draught.', 4.5);
    }
    if (r.vigor) {
      this.progress.vigor += 1;
      g.hud.hint('Found a <b>Heartstone</b>. Your vigour grows.', 4.5);
    }
    this.applyStats();
    saveProgress(this.progress);
  }

  private note(id: string, p: THREE.Vector3, n: Note): void {
    const g = this.g;
    const ground = g.terrain.groundAt(p.x, p.z);
    const y = Math.abs(p.y - ground) < 3 ? Math.min(p.y, ground + 0.2) : p.y;
    const m = Mats();
    const ped = new THREE.Mesh(lathe([[0.25, 0], [0.16, 0.1], [0.12, 0.8], [0.3, 0.95], [0.0001, 0.98]], 6), m.stoneDark);
    ped.position.set(p.x, y - 0.1, p.z);
    ped.castShadow = true;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.26).rotateX(-Math.PI / 2 + 0.3), m.robeWhite);
    paper.position.y = 1.0;
    ped.add(paper);
    g.worldRoot.add(ped);
    this.items.push({
      pos: ped.position,
      label: `Read: ${n.title}`,
      act: () => {
        g.hud.clearSubtitles();
        for (const line of n.lines) g.hud.say(n.title, line, Math.max(3.5, line.length * 0.07));
        if (!this.progress.found.includes(id)) {
          this.progress.found.push(id);
          saveProgress(this.progress);
          g.hud.hint('Added to <b>The Chronicle</b>.', 3);
        }
      },
      live: () => true,
    });
  }

  private hookTalk(): void {
    const g = this.g;
    for (const f of g.folk) {
      const name = (f as unknown as { name?: string }).name;
      const lines = name ? TALK[name] : undefined;
      if (!lines) continue;
      let i = 0;
      this.items.push({
        pos: f.group.position,
        label: `Talk to the ${name}`.replace('the Old', 'Old').replace('the Goodwife', 'Goodwife'),
        act: () => {
          g.hud.clearSubtitles();
          g.hud.say(name!, lines[i % lines.length]);
          i += 1;
          f.face(g.player.pos);
        },
        live: () => f.group.visible && f.behavior !== 'flee' && f.behavior !== 'cower' && f.behavior !== 'dying',
      });
    }
  }

  // ------------------------------------------------------------------ embers & stats
  addEmbers(n: number): void {
    if (n <= 0) return;
    this.progress.embers += n;
    saveProgress(this.progress);
    this.updateEmbers(true);
  }

  private updateEmbers(pulse = false): void {
    if (!this.emberEl) return;
    this.emberEl.textContent = String(this.progress.embers);
    if (pulse) {
      const el = this.emberEl.parentElement!;
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
  }

  applyStats(): void {
    const p = this.g.player;
    const pr = this.progress;
    p.maxHp = 100 + pr.vigor * 14;
    p.maxStamina = 100 + pr.endurance * 12;
    p.maxFlasks = 3 + pr.kindle;
    p.damageMul = 1 + pr.strength * 0.1;
  }

  /** Resting at a Wayside Candle: spend Embers to grow stronger. */
  rest(): void {
    const g = this.g;
    const el = document.querySelector<HTMLElement>('#levelup-screen');
    if (!el) return;
    const stats: Array<[keyof Progress, string, string]> = [
      ['vigor', 'Vigour', '+14 health'],
      ['endurance', 'Endurance', '+12 stamina'],
      ['strength', 'Strength', '+10% sword damage'],
    ];
    const render = () => {
      const list = el.querySelector<HTMLElement>('#levelup-list')!;
      el.querySelector<HTMLElement>('#levelup-embers')!.textContent = String(this.progress.embers);
      list.innerHTML = '';
      for (const [key, label, desc] of stats) {
        const lvl = this.progress[key] as number;
        const cost = levelCost(lvl);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'menu-btn level-btn';
        b.disabled = this.progress.embers < cost;
        b.innerHTML = `<span>${label} <em>${lvl}</em></span><small>${desc}</small><b>${cost} ◆</b>`;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.progress.embers < cost) return;
          this.progress.embers -= cost;
          (this.progress[key] as number) += 1;
          saveProgress(this.progress);
          this.applyStats();
          g.player.hp = g.player.maxHp;
          g.player.stamina = g.player.maxStamina;
          g.player.flasks = g.player.maxFlasks;
          g.audio.candle();
          this.updateEmbers(true);
          render();
        });
        list.append(b);
      }
    };
    render();
    el.classList.remove('hidden');
    g.openOverlay(el);
  }

  // ------------------------------------------------------------------ per frame
  update(): void {
    const g = this.g;
    if (g.mode !== 'play' || g.cut.active) return;
    const s = g.path.samples[Math.max(0, g.player.pathIndex)]?.s ?? 0;
    const pp = g.player.pos;
    // Guards rise when you step into their area.
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const a = this.pending[i];
      if (Math.hypot(pp.x - a.c.x, pp.z - a.c.z) > a.r + 6 || a.anchorS > g.nav.maxS) continue;
      if (this.progress.found.includes(a.id) && this.chests.every((c) => c.id !== a.id || c.open)) {
        this.pending.splice(i, 1);
        continue;
      }
      this.pending.splice(i, 1);
      a.guards.forEach((k, j) => this.spawnGuard(k, a.c.clone().add(new THREE.Vector3(Math.cos(j * 2.1) * 3, 0, Math.sin(j * 2.1) * 3)), `explore-${a.id}`));
    }
    void s;
    let best: Interact | null = null;
    if (g.player.controlEnabled && g.player.state !== 'ride') {
      const calm = g.enemies.every((e) => !e.alive || e.state === 'dormant' || e.state === 'idle' || e.pos.distanceTo(pp) > 14);
      let bd = 2.4;
      if (calm) {
        for (const it of this.items) {
          if (!it.live()) continue;
          const d = Math.hypot(it.pos.x - pp.x, it.pos.z - pp.z);
          if (d < bd) {
            bd = d;
            best = it;
          }
        }
      }
    }
    if (best !== this.prompt) {
      this.prompt = best;
      if (best) g.hud.prompt(best.label, g.input.usingTouch ? '✋' : 'E');
      else g.hud.prompt(null);
    }
    if (this.prompt && g.input.peek('interact')) {
      g.input.consume('interact');
      const it = this.prompt;
      this.prompt = null;
      g.hud.prompt(null);
      it.act();
    }
  }

  get hasPrompt(): boolean {
    return this.prompt !== null;
  }

  private spawnGuard(kind: Guard, p: THREE.Vector3, encounter: string): void {
    const g = this.g;
    let e: Enemy;
    if (kind === 'mite') {
      const m = new Marrowmite();
      m.emerge(Math.random() * 0.6);
      e = m;
    } else if (kind === 'wolf') {
      e = new FrostWolf();
    } else if (kind === 'hollow') {
      e = new DuelKnight();
    } else {
      const pn = new Penitent();
      if (kind === 'thrall') dressAsThrall(pn.rig);
      pn.state = 'idle';
      e = pn;
    }
    if (kind !== 'mite' && kind !== 'hollow') e.state = 'idle';
    e.encounter = encounter;
    e.place(p, Math.random() * 6);
    g.addEnemy(e);
    e.pathIndex = g.nav.resolve(e.pos, e.radius, -1);
  }
}
