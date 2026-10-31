// @ts-nocheck
// The cast of HAUNTED SHIFT.
import { makeChar, SKIN } from "./clay.js";
export const CAST = () => ({
  you: makeChar({ seed: 1, makeup: true, outfit: "staff", shirt: 0x1d1d24, pants: 0x30343c, hair: "messy", hairColor: 0x2a1a14, h: 1.0 }),
  bro: makeChar({ seed: 2, outfit: "jacket", shirt: 0xb8242a, trim: 0xf2ead8, pants: 0x34507a, hair: "cap", capC: 0x1f5fb8, skin: SKIN.tan, girth: 1.12, h: 1.04 }),
  girl: makeChar({ seed: 3, outfit: "hoodie", shirt: 0x8a4fd6, pants: 0x2a2f45, hair: "pony", hairColor: 0xc8762a, skin: SKIN.pale, girth: 0.9, h: 0.95, eyeR: 0.062 }),
  kid: makeChar({ seed: 4, outfit: "pumpkin", pants: 0x2a2a2a, hair: "stem", skin: SKIN.brown, h: 0.62, eyeR: 0.066 }),
  z1: makeChar({ seed: 5, zombie: true, outfit: "suit", shirt: 0x3a3e4a, pants: 0x2a2c34, hair: "messy", hairColor: 0x2a2a1a, girth: 1.05 }),
  z2: makeChar({ seed: 6, zombie: true, outfit: "tee", shirt: 0x8a8a6a, pants: 0x4a4a6a, hair: "bald", skin: SKIN.zombie2, girth: 1.2 }),
  granny: makeChar({ seed: 7, outfit: "cardigan", shirt: 0x6a9a8a, trim: 0xe8dcc0, pants: 0x5a4a6a, hair: "bun", hairColor: 0xd8d8e0, glasses: true, h: 0.9, girth: 1.05 }),
  z3: makeChar({ seed: 8, zombie: true, outfit: "dress", shirt: 0x6a3a5a, hair: "long", hairColor: 0x3a2a20, skin: SKIN.zombie, girth: 0.92, h: 0.96 }),
});
