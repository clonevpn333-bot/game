/* Loads games.json. Add a game by dropping its folder into site/games/ and
 * adding one entry to that file — nothing else in the hub needs to change. */
import { BASE } from './session.js';

let data = null;

export async function loadManifest() {
  if (data) return data;
  const res = await fetch(BASE + 'games/games.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  data = await res.json();
  data.games = data.games.map((g, i) => ({
    order: i,
    tags: [],
    category: 'arcade',
    art: { motif: 'summit', hue: 210, seed: i * 13 + 3 },
    ...g,
  }));
  data.byId = Object.fromEntries(data.games.map((g) => [g.id, g]));
  return data;
}

export const games = () => (data ? data.games : []);
export const gameById = (id) => (data ? data.byId[id] : null);
export const categories = () => (data ? data.categories : []);
export const featured = () => games().filter((g) => g.featured);
export const isNew = (g) => Date.now() - Date.parse(g.added || 0) < 1000 * 60 * 60 * 24 * 21;

export function search(q) {
  const t = q.trim().toLowerCase();
  if (!t) return games();
  const terms = t.split(/\s+/);
  return games()
    .map((g) => {
      const hay = `${g.title} ${g.tagline} ${g.category} ${(g.tags || []).join(' ')}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (g.title.toLowerCase().startsWith(term)) score += 8;
        else if (g.title.toLowerCase().includes(term)) score += 5;
        else if (hay.includes(term)) score += 2;
        else return { g, score: -1 };
      }
      return { g, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.g);
}
