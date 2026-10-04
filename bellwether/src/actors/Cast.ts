import { mulberry, type Look, type Hair, type Top, type Jacket } from './Blocky';

/** Named characters. Humans and Gen 4 citizens share one visual language on purpose. */
export const PEOPLE = {
  elias: { gen: 'human', skin: '#c48f6a', hair: 'side', hairColor: '#2b1d15', beard: 'stubble', iris: '#4a3324', top: 'hoodie', topColor: '#5d6670', jacket: 'bomber', jacketColor: '#4b5236', pants: '#2a3140', legs: 'cargo', shoes: '#3b2a20', sole: '#d8cdb8', watch: true },
  maya: { gen: 'human', female: true, skin: '#e2b896', hair: 'pony', hairColor: '#17110e', iris: '#2a1d16', glasses: '#202226', top: 'sweater', topColor: '#c7b8a0', jacket: 'raincoat', jacketColor: '#2c6a72', pants: '#262a33', shoes: '#4a3a30', sole: '#ece4d4' },
  reyes: { gen: 'human', skin: '#8a5a3c', hair: 'buzz', hairColor: '#120d0a', beard: 'moustache', build: 1.12, height: 1.84, top: 'tee', topColor: '#3d4148', jacket: 'tactical', jacketColor: '#3e4635', pants: '#33372c', legs: 'cargo', shoes: '#1d1a17', sole: '#2d2a26', watch: true },
  cole: { gen: 'human', skin: '#d9a888', hair: 'swept', hairColor: '#9a9894', height: 1.83, top: 'shirt', topColor: '#e8ecf0', tie: '#2b3a5a', jacket: 'coat', jacketColor: '#2d2f33', pants: '#25272b', shoes: '#151515', sole: '#151515' },
  ellie: { gen: 'gen4', child: true, female: true, skin: '#e8b996', hair: 'bob', hairColor: '#4a2c1c', iris: '#5a3a22', top: 'hoodie', topColor: '#e8778f', topAccent: '#ffd36b', pants: '#3d5a8a', shoes: '#d8423b', sole: '#f4efe6', light: '#7ff4ff' },
  cashier: { gen: 'gen4', female: true, skin: '#b9825f', hair: 'pony', hairColor: '#2a1a12', top: 'polo', topColor: '#e9e2d0', jacket: 'apron', jacketColor: '#2f7a4a', pants: '#2b2b33', shoes: '#222', sole: '#ddd', light: '#7ff4ff' },
  courier: { gen: 'gen4', skin: '#d29b74', hair: 'short', hairColor: '#3a2416', hat: 'cap', hatColor: '#e35d1f', top: 'tee', topColor: '#1f2328', jacket: 'bomber', jacketColor: '#e8742a', pants: '#2c3340', legs: 'cargo', shoes: '#2a2a2a', sole: '#e6e0d2', backpack: '#e8742a', revealable: 'L', light: '#7ff4ff' },
  mom: { gen: 'gen4', female: true, skin: '#e2b391', hair: 'bun', hairColor: '#4a2c1c', iris: '#5a3a22', top: 'sweater', topColor: '#b8574a', jacket: 'apron', jacketColor: '#efe8d8', pants: '#3a3f4c', shoes: '#4a3a30', sole: '#ece4d4', light: '#7ff4ff', height: 1.66 },
  dad: { gen: 'gen4', skin: '#d39e78', hair: 'side', hairColor: '#5a4a3c', iris: '#3b2a20', glasses: '#3a2a20', beard: 'full', top: 'sweater', topColor: '#3f5f4a', pants: '#4a4036', shoes: '#3b2a20', sole: '#2d2a26', light: '#7ff4ff', height: 1.8, build: 1.1, watch: true },
  officer: { gen: 'security', light: '#ff3b3b' },
  civic: { gen: 'gen2', shell: '#eef0f2', accent: '#3a7bd5', light: '#7ff4ff' },
} satisfies Record<string, Look>;

const SKINS = ['#f1c9a5', '#e2b391', '#d39e78', '#c48a63', '#a8724e', '#8a5a3c', '#6b4430', '#563526', '#efd2b8', '#b98564'];
const HAIRC = ['#141010', '#2a1d16', '#3d2a1c', '#5a3a22', '#8a5a2e', '#c69a5c', '#d8c08a', '#9a9894', '#d9d6d0', '#6a2c1c', '#2b2140'];
const TOPS = ['#c0392b', '#2e86c1', '#e8e2d0', '#27ae60', '#f39c12', '#8e44ad', '#1abc9c', '#34495e', '#e84393', '#f5f1e6', '#5d6d7e', '#d35400', '#3f5f8a', '#a3cb38', '#ffd36b'];
const JACKETS = ['#2d3436', '#4b5236', '#6d4c41', '#1f3a5f', '#7f8c8d', '#8e2c2c', '#c4a26a', '#264d3a', '#3a3a52', '#e8742a', '#d9d4c5'];
const PANTS = ['#2c2f3a', '#1f2a44', '#3d5a8a', '#4a4036', '#2a2a2a', '#6b6255', '#8a7a60', '#33372c', '#5a2e2e'];
const SHOES = ['#1d1a17', '#f4efe6', '#3b2a20', '#2a2a2a', '#c0392b', '#2e86c1', '#6d4c41'];
const UMBRELLAS = ['#c0392b', '#1f3a5f', '#f1c40f', '#2d3436', '#16a085', '#8e44ad', '#e8742a', '#ecf0f1', '#e84393'];

export interface CitizenSpec {
  look: Look;
  umbrella?: string;
  prop?: 'phone' | 'coffee' | 'bag' | 'briefcase' | 'clipboard';
}

/**
 * A believable Bellwether resident. Mostly Gen 4; older generations appear in service roles
 * (pass gen to force one).
 */
export function citizen(seed: number, o: { gen?: Look['gen']; rain?: boolean; child?: boolean } = {}): CitizenSpec {
  const r = mulberry(seed * 9301 + 49297);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const female = r() < 0.5;
  const child = o.child ?? r() < 0.08;
  const gen = o.gen ?? (r() < 0.1 ? 'gen3' : 'gen4');
  const hairs: Hair[] = female ? ['long', 'bun', 'pony', 'bob', 'curly', 'short', 'afro', 'side'] : ['short', 'side', 'buzz', 'curly', 'bald', 'swept', 'afro', 'mohawk'];
  const tops: Top[] = ['tee', 'shirt', 'sweater', 'hoodie', 'polo', 'tank', ...(female ? (['dress'] as Top[]) : [])];
  const jackets: (Jacket | null)[] = o.rain ? ['raincoat', 'coat', 'bomber', 'denim', 'blazer', null] : ['bomber', 'blazer', 'denim', 'vest', null, null, 'coat'];
  const top = pick(tops);
  const look: Look = {
    gen,
    female,
    child,
    seed,
    height: child ? 1.05 + r() * 0.35 : female ? 1.58 + r() * 0.18 : 1.68 + r() * 0.2,
    build: 0.9 + r() * 0.28,
    skin: gen === 'gen3' ? '#d9c8b4' : pick(SKINS),
    hair: pick(hairs),
    hairColor: pick(HAIRC),
    iris: pick(['#3b2a20', '#2a4a6a', '#3a5a3a', '#5a3a22', '#1a1412']),
    top,
    topColor: pick(TOPS),
    topAccent: r() < 0.25 ? pick(TOPS) : undefined,
    jacket: top === 'dress' ? (r() < 0.5 ? 'coat' : null) : pick(jackets),
    jacketColor: pick(JACKETS),
    pants: pick(PANTS),
    legs: female && r() < 0.3 ? 'skirt' : r() < 0.12 ? 'shorts' : r() < 0.2 ? 'cargo' : 'pants',
    shoes: pick(SHOES),
    sole: r() < 0.5 ? '#ece6da' : '#2a2724',
    glasses: r() < 0.18 ? pick(['#202226', '#6b4a2e', '#c0c4c8']) : undefined,
    beard: !female && !child && r() < 0.3 ? pick(['stubble', 'full', 'moustache'] as const) : undefined,
    hat: r() < 0.12 ? pick(['cap', 'beanie'] as const) : undefined,
    hatColor: pick(TOPS),
    backpack: r() < 0.15 ? pick(JACKETS) : undefined,
    scarf: o.rain && r() < 0.15 ? pick(TOPS) : undefined,
    watch: r() < 0.4,
    light: '#7ff4ff',
  };
  const spec: CitizenSpec = { look };
  if (o.rain && r() < 0.55) spec.umbrella = pick(UMBRELLAS);
  else if (r() < 0.5) spec.prop = pick(['phone', 'coffee', 'bag', 'briefcase'] as const);
  return spec;
}

/** Look-dev sets for preview.html */
export const CAST: Record<string, Look[]> = {
  humans: [PEOPLE.elias, PEOPLE.maya, PEOPLE.reyes, PEOPLE.cole, PEOPLE.ellie, PEOPLE.cashier, PEOPLE.courier],
  robots: [{ gen: 'gen1' as never, shell: '#e0a526' }, PEOPLE.civic, { gen: 'gen2', shell: '#d8d6d0', accent: '#e0752c' }, { gen: 'gen3', female: true, top: 'shirt', topColor: '#6a7a8a', pants: '#3a3f4a', hair: 'bob', hairColor: '#3a2a1c' }, PEOPLE.officer, { gen: 'null' }, { gen: 'discarded', seed: 3 }],
  crowd: Array.from({ length: 9 }, (_, i) => citizen(i + 11, { rain: true }).look),
};
