# VOXELCRAFT — a Minecraft‑inspired survival sandbox

A feature‑rich, browser‑based voxel survival game built from scratch with
**Three.js** and a **custom built‑in shader pack** (god rays, bloom, dynamic
sky, waving water/foliage, stylized color grading). No game engine, no asset
downloads — every texture is generated procedurally at runtime, so the whole
thing is self‑contained.

> This is an original, *inspired‑by* clone for learning/fun — not affiliated
> with Mojang/Microsoft and not a byte‑for‑byte copy of Minecraft.

---

## ▶ How to run

It's a static site. Serve the folder over HTTP (ES modules don't load from
`file://`):

```bash
cd minecraft
python3 -m http.server 8099
# then open http://localhost:8099
```

Any static server works (`npx serve`, nginx, etc.). A modern browser with
WebGL2 is required.

---

## 🎮 Controls

| Action | Key |
| --- | --- |
| Move | `W` `A` `S` `D` |
| Jump / swim up / climb | `Space` |
| Sneak | `Shift` |
| Sprint | `Ctrl` (hold while moving) |
| Look | Mouse (click the world to capture the cursor) |
| Break block | Hold **Left‑click** |
| Place block / use / interact | **Right‑click** |
| Attack mob | **Left‑click** |
| Select hotbar | `1`‑`9` or scroll wheel |
| Drop held item | `Q` |
| Inventory | `E` |
| Debug overlay | `F3` |
| Pause / close menu | `Esc` |
| Toggle fly (creative) | double‑tap `Space` |
| Cycle dimension (creative, for fun) | `G` |

---

## ✨ Features

**World & terrain**
- Infinite, streamed chunk world with greedy face‑culled meshing, baked
  ambient occlusion, and smooth lighting.
- 12 biomes (plains, forest, jungle, savanna, swamp, desert, badlands, snowy,
  taiga, mountains, beach, ocean) with per‑biome grass/foliage/water tints.
- Multi‑octave + ridged noise terrain, caves (spaghetti + cheese), ore
  distribution by depth, lakes, beaches, trees (oak/birch/spruce/jungle),
  flowers, tall grass, cacti, sugar cane, mushrooms.
- **Three dimensions:** Overworld, Nether (lava seas, glowstone, soul sand)
  and the End (floating island over the void). Light an obsidian column with
  flint & steel and step through, or use the End portal.

**Survival**
- Health, hunger, saturation/exhaustion, natural regen, starvation.
- Fall, drowning, lava, and void damage; armor damage reduction.
- Day/night cycle with XP and levels.

**Blocks & items**
- ~85 block types and ~140 items (tools, armor, food, materials).
- Tool tiers (wood→stone→iron→gold→diamond) with correct mining speeds and
  harvest requirements; tool durability.
- Full crafting (shaped + shapeless) on a 2×2 inventory grid and 3×3 table,
  plus furnace smelting with fuel.

**Mobs & entities**
- Passive: cow, pig, sheep, chicken. Hostile: zombie, skeleton (ranged),
  creeper (explodes & destroys terrain), spider.
- Wander / chase / flee AI, jumping pathing, light‑ & time‑based spawning,
  daylight burning, drops, and dropped‑item physics with pickup magnet.

**Rendering — built‑in shader pack**
- Volumetric **god rays** from the sun, **bloom**, ACES tone mapping and a
  BSL/Bliss‑style **color grade** (saturation, contrast, vignette).
- Dynamic sky dome with sunrise/sunset gradients, sun, moon and stars.
- Waving water surface and swaying foliage, distance fog, underwater tint.
- Toggle each effect, render distance, FOV and sensitivity in **Settings**.

**Misc**
- Procedural pixel‑art texture atlas + item icons (generated on a canvas).
- Procedural WebAudio sound effects.
- `localStorage` save/load (Continue Saved World), creative & survival modes,
  chests & containers, world seeds.

---

## 🗂 Project layout

```
minecraft/
├── index.html          # entry + import map
├── styles.css          # all UI styling
├── vendor/             # vendored three.module.js + jsm post‑processing addons
└── src/
    ├── main.js         # Game orchestrator, loop, day/night, dimensions
    ├── constants.js    ids.js  noise.js
    ├── blocks.js  items.js  textures.js        # content & procedural atlas
    ├── chunk.js   world.js  worldgen.js        # voxels, meshing, generation
    ├── player.js  input.js                     # controls, physics, raycast
    ├── inventory.js crafting.js survival.js    # systems
    ├── mobs.js                                  # entities & AI
    ├── shaders.js                               # materials, sky, post FX
    ├── particles.js audio.js save.js ui.js     # FX, sound, persistence, HUD
```

Built with Three.js r160 (vendored locally, no CDN needed).
