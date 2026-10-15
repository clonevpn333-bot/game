// Life-sim state for a person you play (created lazily for anyone you possess,
// and fully for your own character in Life mode). Persisted via EXTRA_KEYS.
import { clamp } from '../core/math.js';

export function ensureLife(c, W) {
  if (c.life) return c.life;
  const t = c.traits;
  c.life = {
    stats: { health: Math.round((c.health ?? 1) * 85), happy: Math.round((c.happiness ?? 0.6) * 100), smarts: Math.round(35 + t.curiosity * 45), looks: Math.round(35 + (c.look.height - 0.92) * 120 + t.social * 15), fitness: Math.round(25 + (1 - Math.abs(c.look.build - 1)) * 40), karma: Math.round(30 + t.honesty * 60) },
    skills: { cooking: 5, charisma: Math.round(t.social * 30), fitness: 10, programming: Math.round(t.curiosity * 15), music: 0, combat: 0, driving: c.vehicle != null ? 40 : 10, stealth: 0 },
    edu: { level: c.age >= 22 && t.ambition > 0.6 ? 'bachelor' : 'highschool', degrees: c.age >= 22 && t.ambition > 0.6 ? ['General Studies'] : [], enrolled: null, major: null, credits: 0, need: 0 },
    groceries: 3, hygiene: 1, drunk: 0, perf: 55, loans: [], fame: 0, born: W ? W.day - c.age * 40 : 0,
    inv: { phone: true, laptop: false, weapons: [], drill: 0, thermite: 0, lockpicks: 0, product: 0, mask: false },
    passDay: -1, vipDay: -1, outfitDay: -1, notes: [], addictions: {}, license: { driver: c.vehicle != null, gun: false },
  };
  return c.life;
}

export function stat(c, k, d) {
  const L = c.life;
  if (!L) return;
  L.stats[k] = clamp(Math.round((L.stats[k] + d) * 10) / 10, 0, 100);
  if (k === 'health') c.health = clamp(L.stats.health / 85, 0, 1);
  if (k === 'happy') c.happiness = clamp(L.stats.happy / 100, 0, 1);
}
export function skill(c, k, d) {
  const L = c.life;
  if (!L) return;
  L.skills[k] = clamp((L.skills[k] || 0) + d, 0, 100);
}
export const EDU_RANK = { none: 0, highschool: 1, associate: 2, bachelor: 3, master: 4, law: 5, medical: 5, phd: 5 };
export function eduRank(c) { return EDU_RANK[c.life?.edu.level || (c.age >= 22 && c.traits.ambition > 0.6 ? 'bachelor' : 'highschool')] || 1; }
