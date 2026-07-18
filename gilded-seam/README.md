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

## The bestiary (20 all-custom creatures)

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
| ∞ | **The Porcelain Autarch** | The Overlord King. A crowned idol carried on a palanquin of eight gilded legs, six arms, three counter-spinning halo rings, enthroned in the **Gilded Palace** where the cure is kept. Thread-storms that reel in every player in the nave, resonance novas, court-summoning decrees, 600 HP, red boss bar. Drops the **Rivening Heart** and his crown. |
| — | **Salt-Sworn** | *Hireable help.* A human lamplighter-mercenary who hunts the porcelain. Pay them a gold ingot or emerald and they follow you, fight seam creatures, and cure your Gilded infection for free. Found guarding the Hollow City, or rarely on the roads. |

### The Gilded Farmyard — every normal mob, kept in its own shape

Scape-and-Run style: the common mobs are not melted down into generic
shardlings any more — each one is mended into **its own infected form**, a
fully custom model with its **own Bisque → Stoneware → Lustre mutation
stages** (new anatomy appears at each firing, not just a palette swap).
Fish alone are exempt — the thread will not cross water.

| Original | Becomes | Mutation line |
| --- | --- | --- |
| Cow | **Chinaware Bull** | Split ewer jaw with a glowing seam; Stoneware grows a kiln-hump on its back; Lustre opens a porcelain bloom out of the hump. |
| Pig | **Tithe Swine** | A lidded pot on legs with a teapot-spout snout; the lid finial swells each firing; Lustre adds a second set of legs and a gold ring. |
| Sheep | **Thread-Fleece** | Fleece re-spun as gold thread; Stoneware bristles with darning needles; Lustre carries a full spool on its spine. |
| Chicken | **Cloche Hen** | A teapot that pecks; Stoneware adds a second set of wing-plates; Lustre grows a **second spout-head**. |
| Spider | **Tureen Spider** | A soup tureen on eight gold wire legs, face underneath the bowl; Lustre adds legs nine and ten. |
| Creeper | **Crackle Cask** | A tall crazed urn in gold hoops that shatters into shardlings on death; Lustre is crowned. Leaps like the spider. |
| Villagers / zombies / skeletons / piglins / raiders | **Vessel** | The classic mended dead — extra gilded arms at Lustre. |
| Anything else | **Shardlings** | Whatever cannot be mended whole is broken down and re-fired as saucer-crabs. |

### The people (what's left of them)

| Who | What |
| --- | --- |
| **Refugee** | The scared ones, hiding in roadside hamlets. **Talk to them** (empty hand) and they answer — four voices of quiet dread. **Convince them** (give bread, or approach holding any sword) and they *rally*: they stop fleeing, follow you, and fight the Seam at your side. |
| **Gilt-Mad Prophet** | The crazy ones. Half a gold mask, a hand-bell, a robe, and a sermon about how beautiful the mending is. Harmless, unsettling, slowly gilding themselves on purpose. |
| **Half-Sewn** | The infected ones, caught mid-conversion — one side skin, one side glaze, dragging their porcelain half behind them. Hostile; they remember doors. |
| **Salt-Sworn** | The fighters (see above) — hireable, loyal, and carrying the salt. |

## Blocks, items, and the fight back

- **Blocks:** Seamstone (creeping glazed ground), Gilded Vein (crawling gold
  runners), Porcelain Bloom (spore-ringing flower), Kiln Heart (the forge,
  ages 0-3), Fired Shell (craftable ceramic building block).
- **Porcelain Shard / Gold Thread** — mob and block drops, the crafting economy.
- **Kintsugi Blade** — sword forged from the Seam's own shards; deals +50%
  damage to all seam creatures, repaired with porcelain shards.
- **Rivening Salt** — the field cure for the Gilded effect
  (bone meal + sugar + amethyst shard).
- **Riven Tranquilizer + Salt Darts** — a brass-and-porcelain air rifle. One
  dart drops any seam creature short of the crowned ones *on the spot* (the
  salt unsews every seam at once); warm targets just get very sleepy.
- **Rivening Heart** — *the cure.* Kept in the Gilded Palace reliquary under
  the King's eye (or looted from his corpse): one strike purges the Gilded
  from everything nearby, cracks seam blocks back into honest stone, and
  tears seam creatures apart at the seams. Not consumed; ten-second heartbeat.
- Three advancements, custom damage types with bespoke death messages, loot
  tables, recipes, and a creative-inventory presence for everything.

## Structures, outliers, total war

- **The Gilded Palace** — a generated quartz-and-gold throne hall where the
  Autarch sits dormant among his court, kiln-hearts burning in the corners
  and the Rivening Heart waiting in the reliquary chests.
- **The Hollow City** — a ruined town the Seam already finished: gilded
  streets, crumbling fired-shell houses, a Font of Gold nesting in the old
  fountain, vessels where the citizens were — and the last two Salt-Sworn
  still holding their posts. (Both generate as structures across overworld
  biomes; injecting whole custom biomes cleanly needs third-party worldgen
  libraries, so ruins-in-any-biome was the honest choice.)
- **Refuge Hamlets** — three spruce cottages, a well and a pantry, scattered
  randomly through the overworld: this is where the Refugees hide, usually
  with one Salt-Sworn on watch and one Gilt-Mad Prophet nobody invited.
- **Every mob converts** into its own infected form (see the Farmyard table);
  fish alone are spared.
- **The world dies for real:** seamstone creep strips leaves to nothing and
  petrifies trunks into fired shell — and old, saturated seamstone keeps
  rotting after that: it slumps into **Gilt Mass** (a soft gold dross you can
  mine for nuggets) or collapses into open pits. Mature outbreaks end as
  cratered gold wasteland. Grass alone refuses the thread — the Seam cannot
  explain it and neither can we.
- **The Nether breach:** if a Kiln Heart matures within reach of a nether
  portal, the portal *fires* — a screaming trigger-flash, gold pouring
  through the frame — and a new Kiln Heart seeds itself on the far side,
  veins already crawling. The infection does not stay in the overworld.
- **Outliers:** ~2% of seam creatures come out of the kiln *wrong* — glowing,
  named, 2× health, half again the damage, a third bigger, and carrying gold.

## The goal — tasks, the cure, and the Rivening

A main-quest advancement line walks you to the ending: **catch the Gilded →
find the Gilded Palace → slay the Porcelain Autarch → perform the Rivening.**

The Rivening Heart in your hand will purge locally, but used *on a Kiln
Heart* it does something else entirely: the kiln goes dark, and a **Rivening
wave** rolls out from it — an expanding ring of salt-light you can watch
cross the horizon, unsewing every seam block back to honest stone, tearing
seam creatures apart as it passes, bells rising pitch by pitch until the
world-cracking finale. The cinematic ending, rendered in the world itself.

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
