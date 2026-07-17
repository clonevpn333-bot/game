# The Gilded Seam

*A porcelain infection mod for Minecraft Java Edition 26.2 (Fabric).*

> Somewhere under the hill there is a kiln that never went out. What it fires
> is not pottery. A golden thread creeps out of the fire-mouth, finds the
> broken and the dead, and **mends** them — every crack filled with gold,
> every body rebuilt in glazed white porcelain, every face replaced with a
> serene, eyeless mask. Kintsugi, if kintsugi wanted *you*.

The Gilded Seam is an escalating-infection mod in the spirit of Scape and Run:
Parasites, but with its own identity: no flesh, no sculk. The hive is
**ceramic and gold** — a quiet, beautiful, patient apocalypse that rings like
struck china and gets **bigger, harder and wronger** the longer you leave it
alone.

---

## The infection loop

1. **The Gilded** status effect is the thread under the skin: contracted from
   porcelain blooms, vein mats, seamstone underfoot, or any seam creature's
   touch. It stiffens movement, and at Stoneware strength it starts sewing
   shut something vital (armor-bypassing damage).
2. **Death is a promotion.** Anything that dies Gilded — or dies to the Seam —
   is mended on the spot: villagers, zombies and raiders stand back up as
   **Vessels** (with a full stitched-upright rising animation); animals are
   broken down into **Shardlings**.
3. **Kiln Hearts** are the forges of the outbreak. They mature through four
   firing stages, gild the ground into **Seamstone**, lay **Gilded Vein**
   runners, sprout **Porcelain Blooms**, and — once white-hot — fire brand-new
   creatures out into the world.
4. **Firing tiers** are the mutation system, and they are *local*: creatures
   roll their tier from how saturated the surrounding chunk is with seam
   blocks (plus world age). Leave an outbreak to feed and it escalates:
   - **Bisque (tier 0)** — fresh from the kiln. Matte, brittle, baseline.
   - **Stoneware (tier 1)** — refired: +40% health, +35% damage, larger,
     knockback-resistant, warmer glaze.
   - **Lustre (tier 2)** — fired until the glaze runs gold: bigger again,
     heavily gilded texture — and on some species the Seam stops pretending
     anatomy matters. **Vessels grow a second pair of arms.**

## The bestiary (9 all-custom creatures)

Every model is built from scratch (no vanilla reskins), with hand-tuned
procedural gaits plus keyframe animations for attacks and abilities.

| Stage | Creature | What it does |
| --- | --- | --- |
| I — Hairline | **Shardling** | Skittering crab of saucer-fragments; diagonal-pair skitter gait, lunge-snap attack, flaring plates. Made from dead animals. |
| I | **Vessel** | The mended dead. Stiff shamble, two-handed haymaker, rising-from-the-corpse animation; grows extra gilded arms at Lustre. |
| I | **Porcelain Hound** | Vase-work greyhound; rotary lope, jaw-past-reason bite, and a **peal** — a struck-bell howl that speeds every seam creature in earshot and points them at you. |
| II — Crazing | **Seamstress** | Four-armed stilt-walker. Whips a **gold-thread lash** that hooks and *reels you in*; her loom-arms **mend** wounded seam creatures nearby. Heron-step walk with backward knees. |
| II | **Kilnborn** | A walking furnace. Rolling charge that bowls over everything in the lane; below 40% health it **overfires** — armors up in molten gold and scalds anything touching it. Fire immune. |
| II | **Chime** | A flying mask in a halo of orbiting shard-petals. Hovers out of reach and **rings** — an armor-piercing resonance that leaves you nauseous and slow. |
| II | **Font of Gold** | A rooted amphora that breathes. Drips vein runners into the soil, lacquers the local brood with resistance, and pours out newborn shardlings — faster if you hit it. |
| III — Lustre | **Manifold** | The Seam gone abstract: eleven arms knotted around a molten core, walking on six of them in rippling sequence. Climbs sheer walls, drags what it hits into the knot, and every fifth blow is a barrel-flattening constriction. |
| III | **Reliquary Colossus** | The boss. A six-armed praying idol found dormant in the world; step into its nave and it unfolds finger by finger (3-second awakening). Room-clearing sweeps, floor-cracking slams that shake shardlings loose, and a prayer that raises a congregation of vessels. Boss bar, projectile-resistant, drops a Kiln Heart. |

## Blocks, items, and the fight back

- **Blocks:** Seamstone (creeping glazed ground), Gilded Vein (crawling gold
  runners), Porcelain Bloom (spore-ringing flower), Kiln Heart (the forge,
  ages 0-3), Fired Shell (craftable ceramic building block).
- **Porcelain Shard / Gold Thread** — mob and block drops, the crafting economy.
- **Kintsugi Blade** — sword forged from the Seam's own shards; deals +50%
  damage to all seam creatures, repaired with porcelain shards.
- **Rivening Salt** — the only field cure for the Gilded effect
  (bone meal + sugar + amethyst shard).
- Three advancements, custom damage types with bespoke death messages, loot
  tables, recipes, and a creative-inventory presence for everything.

## Building

Requires **Java 25** and an internet connection (Gradle fetches Minecraft
26.2, Fabric Loader 0.19.3 and Fabric API):

```bash
cd gilded-seam
./gradlew build          # jar lands in build/libs/
./gradlew runClient      # dev client
```

This project targets the post-obfuscation era: Minecraft 26.1+ ships
unobfuscated, so the build uses the `net.fabricmc.fabric-loom` plugin
(Loom 1.15+, Gradle 9.4) with **no mappings step** and plain
`implementation` dependencies. See `PORTING.md` for notes if you build
against a different game version.

## The asset pipeline (`tools/`)

All entity geometry lives in `tools/modelgen/models.py` as declarative data —
**one source of truth** that generates both the Java `LayerDefinition` code
*and* the UV-packed textures, so model UVs and texture art can never drift
apart. Textures are procedurally painted pixel art: cold porcelain, black
crazing, kintsugi gold, cobalt brushwork, ember-cracked kiln clay.

```bash
pip install pillow
python3 tools/modelgen/gen.py   # entity geometry snippets + entity textures
python3 tools/asset_gen.py      # block/item textures, icon, all JSON assets
```
