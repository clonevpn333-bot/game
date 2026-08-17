# CYBERPUNK 2077 :: GHOSTLINE

A single-file, open-world, first-person RPG set in a 1:1 metric reconstruction of
Night City. Open `cyberpunk2077.html` in a WebGL2 browser — that's the whole
install. No CDN, no downloads, no external assets of any kind.

---

## What it is

**One HTML file. ~13,700 lines. 625 KB.** Everything below is generated in code
at load time: every texture, every mesh, every animation, the entire city.

| | |
|---|---|
| Renderer | Custom WebGL2 deferred pipeline (no Three.js, no libraries) |
| World | 5.2 × 6.4 km at true metric scale, ~7,750 buildings, 490 roads, 13,000 graph nodes |
| Materials | 30 PBR materials synthesised procedurally into GPU array textures |
| Characters | 24-bone skinned humans at anatomical proportions, fully procedural animation |
| Story | Original narrative, cast, dialogue and two romance arcs |
| Audio | Fully synthesised — weapons, engines, city ambience and five radio stations, from oscillators and shaped noise |

---

## Night City

The layout follows the published geography of Night City. District bounds,
adjacency, street-grid bearings, height profiles and gang territory are all
derived from reference research done during development:

- **Watson** (north) — Little China, Kabuki, Northside, Arasaka Waterfront
- **City Center** (west-central) — Corpo Plaza, Downtown
- **Westbrook** (east/north-east) — Japantown, Charter Hill, North Oaks
- **Heywood** (south-central) — The Glen, Wellsprings, Vista Del Rey
- **Santo Domingo** (east/south-east) — Arroyo, Rancho Coronado
- **Pacifica** (south-west coast) — Coastview, West Wind Estate
- **The Badlands** wrapping the landward sides; Pacific Ocean and Del Coronado Bay to the west and north

**Arasaka Tower stands at its published 620 m** and is the tallest structure in
the city. Megabuilding H10 sits in Little China. **NCART runs five lines (A–E)
across nineteen stations**, elevated over most of the city, and does not serve
the Badlands — ride it from any station.

Each district builds in one of the four canonical architectural registers, and
the style drives massing, palette, greebling and signage density:

| Style | Reads as | Where |
|---|---|---|
| **Entropism** | necessity over style; grey, cracked, fire escapes, AC units | Watson, Rancho Coronado |
| **Kitsch** | bold colour, plastic, rounded, awnings, dense neon | Japantown, Wellsprings |
| **Neo-Militarism** | monolithic, minimal, sleek glass and brushed alloy | City Center, Arasaka Waterfront |
| **Neo-Kitsch** | rich, ornamented, marble and gold | Charter Hill, North Oaks, Coastview |

---

## Audio

There are no audio files, because there are no files. Every sound is built at
runtime from oscillators, filtered noise and a synthesised convolution reverb:

- **Weapons** — each class has a tuned body / crack / tail triplet; tech
  weapons add a rail whine, smart weapons a lock chirp
- **Vehicles** — a per-car oscillator bank (three detuned saws, a sub and an
  intake-noise layer) driven live by RPM and load, with tyre scrub on drift
- **World** — traffic rumble, rain, wind and mains hum mixed continuously from
  the environment state, plus sporadic sirens, gunfire, AV flybys and NCART
  passes placed positionally around you
- **Radio** — five procedurally composed stations (`B` toggles, `N` cycles):
  RADIO NEON 105.9, PACIFICA DUB 88.1, MAELSTROM FM 92.3, KABUKI CITY POP
  101.5 and BADLANDS 66. Each is a generator with its own scale, tempo,
  drive and rhythmic character, scheduled with a lookahead clock.

Positioning is computed by hand — inverse-square distance gain and equal-power
pan against the camera basis — which keeps a hundred simultaneous city sources
cheap.

## Rendering pipeline

Eleven passes per frame:

1. **Cascaded shadow maps** — 3 cascades, texel-snapped, 9-tap rotated-Poisson PCF
2. **G-buffer** — 4 MRTs (albedo+AO, octahedral normal+roughness+metal+shading model, HDR emissive, velocity), reversed-Z float depth
3. **SSAO** — 16-sample golden-spiral hemisphere kernel + separable bilateral blur
4. **Tiled light culling** — 32×18 tiles, up to 256 lights, screen-space sphere binning on the CPU into `RG32UI`/`R32UI` lookup textures
5. **Deferred resolve** — Cook-Torrance GGX with height-correlated Smith visibility, Karis analytic env BRDF, two-lobe subsurface wrap for skin, analytic sky IBL
6. **SSR** — half-res march with binary refinement, for wet asphalt
7. **Volumetric scattering** — 24-step raymarch with shadow-map transmittance and per-tile neon in-scatter
8. **Forward pass** — emissive neon/holo geometry and soft particles
9. **Bloom** — Jimenez 13-tap downsample, tent upsample, 6 mips
10. **Composite** — ACES filmic, camera motion blur, chromatic aberration, glitch, grain, vignette
11. **FXAA**

Reversed-Z with an infinite far plane keeps a 620 m tower and a 3 km draw
distance free of depth fighting.

### Streaming

Two LOD tiers that are **additive, not competing**, so transitions never pop or
z-fight:

- **Sectors (400 m)** — building shells, terrain, roads, viaducts. Always drawn.
- **Chunks (200 m)** — decoration *only*: greebles, signage, fire escapes,
  awnings, balconies, street furniture, and every neon light source.

Because the chunk tier adds new surfaces rather than replacing shell geometry,
detail fades in without the silhouette ever changing. Both tiers build inside a
per-frame millisecond budget, chunks first.

---

## Materials

Every surface is authored in code. Each material paints albedo, height,
roughness and metalness buffers, which are then differentiated with a Sobel
kernel into tangent-space normals and packed into two GPU array textures:

```
ALBEDO ARRAY  RGB = base colour, A = baked cavity/AO
SURFACE ARRAY RG  = normal.xy,   B = roughness, A = metalness
```

Thirty materials: poured and water-stained concrete, asphalt with wheel-path
polish, cast pavers, brick, corrugated and rusted steel, brushed aluminium,
glass curtain wall, kitsch paint, stucco, graffiti, sign board, polished screed,
marble, badlands sand and scrub, layered skin, twill techwear, leather,
parkerised gun metal, metallic-flake car paint, tyre rubber, PCB, holo panel,
water, ceramic tile, perforated screen, hair, metro platform.

Seamless value noise, seamless Voronoi, running-bond masonry, directed grime
streaks, irregular splotches and a cavity-darkening pass do the work.

---

## Characters

Bodies are lofted from a real anthropometric table: nine measured trunk
stations from pelvic floor to acromion, so the waist is genuinely the narrowest
point and the chest is deeper than it is wide. Sections are superellipses, not
circles, which is what keeps a torso from reading as a tube. Faces are built by
a field of localised gaussians — brow ridge, orbits with lid and bag, nasal
root and dorsum and alae, cheekbones and the hollow under them, both lips, the
philtrum, the mandibular angle — so features compose anatomically instead of
sitting on a sphere. Hands have four fingers of three phalanges and an opposed
thumb; the crowd LOD swaps them for a mitten at distance.

The lower face is skinned to a jaw bone pivoting at the temporomandibular
joint, so characters actually open their mouths when they speak.

A 24-bone skeleton at the standard 7.5-head canon, 1.78 m reference stature.
Bodies are built from tapered elliptical cross-sections with correct hip/waist/
rib/shoulder progression; heads are sculpted analytically — a displacement field
adds brow ridge, eye sockets, nasal bridge and tip, cheekbones, lips, chin and
jaw taper to a sphere, then eyes, ears and hair are layered on.

**There is no keyframe data in this project.** Idle, walk-through-sprint,
strafing, weapon carry and aim, hit reactions, two-stage death, sitting and
conversational gesture are all analytic functions of phase — which is why every
pedestrian in the crowd can run its own cycle.

---

## Gameplay

- **First person** throughout, with viewmodel sway, bob, ADS, and recoil recovery
- **Three weapon systems** — Power (rounds ricochet off hard surfaces), Tech (charges, punches through cover), Smart (guided). 14 weapons plus melee and grenades
- **Driving** — 9 vehicle classes with per-wheel spring suspension and a slip-based tyre model that drifts. Traffic follows the road graph
- **NCART metro** — five lines, nineteen stations, ride between any of them
- **Quickhacks** — scanner, RAM budget, Ping / Short Circuit / Reboot Optics / Overheat / System Reset / Cyberpsychosis
- **Cyberware, perks, five attributes, lifepaths, levelling, street cred, vendors, ripperdocs, loot, lore shards**
- **Living crowd** — every pedestrian gets a purpose from the clock: commuting
  at rush hour, at work through the day, drinking after dark, heading home.
  Destinations are real buildings, real metro stations and real neon clusters,
  offset onto the pavement. Crowd density follows the hour
- **NCPD** — ambient patrols plus a five-tier dispatch ladder. Units converge
  on where the crime happened rather than on you, cruisers drive the road graph
  with sirens and drop officers on arrival, and heat only cools while nobody
  has eyes on you
- **Romance** — two arcs (Static and Ryder) with affinity earned through
  dialogue, a gated private scene each, and relationship state in the save
- **Menus** — inventory, character sheet, cyberware, journal, full pannable city map, phone, settings
- Wanted system with NCPD response and MaxTac at five stars
- Day/night cycle, dynamic rain and wetness, autosave to `localStorage`

### Controls

| | |
|---|---|
| `WASD` move · `Shift` sprint · `Space` jump · `C` crouch | `Mouse` look · `LMB` fire · `RMB` aim |
| `1-3` weapons · `R` reload · `G` grenade | `E` interact · `F` enter/exit vehicle |
| `Q` scanner · `H` quickhack | `Tab` inventory · `M` map · `J` journal · `Esc` settings |
| `B` radio on/off · `N` next station | Weapon HUD hides when empty-handed |
| `F5` quicksave · `F9` quickload | |

Quality auto-adapts to your frame rate unless you pick a preset yourself.

---

## Story — GHOSTLINE

*Original narrative. Every character, corporation and line of dialogue below was
written for this project.*

You take a job from **Odessa "Odds" Nakamura-Vance** to lift one biochip out of a
Sendo-Kuroi cold-storage clinic in Kabuki. The chip carries **Wren Achebe** — an
NCPD forensic netrunner who filed a report about a building that wasn't on any
zoning map, and was flatlined forty minutes later.

She is now in your neural matrix without a containment shell. Engrams overwrite.
You have about three weeks before you stop being you, and the only rig that can
separate you is the one that made her: **Ghostline**, eighty-three floors up in
Corpo Plaza.

Supporting cast: **Ryder Malachai Cross** (ex-Militech solo, Arroyo),
**Ilse "Static" Bergmann** (netrunner, four floors below the waterline in
Pacifica), **Mama Teodora Alcaraz** (Heywood), **Detective Marisol Quintero**
(NCPD Watson), against **Kazimir Sendo** and **Colonel Aurelia Vex**.

Five main jobs, five gigs, and **four endings** — Separate, Purge, Broadcast, Keep.

---

## Building

The single file is generated from modular sources:

```bash
bash src/cp2077/build.sh          # → cyberpunk2077.html
```

| Module | |
|---|---|
| `00_head` `01_dom` | UI stylesheet and markup |
| `10_core` | math, RNG, noise |
| `20_gl` | WebGL2 device layer |
| `30_tex` | procedural PBR material synthesis |
| `40_shaders` | GLSL ES 3.00 library |
| `50_geo` | mesh builder and primitives |
| `60_city` `62_world` | Night City layout and geometry streaming |
| `70_char` | anatomy, skinning, animation |
| `80_vehicle` `82_weapon` | vehicles and weapons |
| `90_render` | deferred renderer |
| `35_audio` | procedural audio + radio |
| `A0_npc` `A2_life` | crowd AI, daily agendas, NCPD |
| `B0_story` `C0_ui` `D0_game` | narrative, interface, game loop |

---

## A note on rights

This is a fan reconstruction and homage. **Cyberpunk 2077 and Night City are the
property of CD PROJEKT RED.** No assets from the original game are used,
referenced at runtime, or included in this file — the city geography is
reconstructed from published reference material, and every texture, model,
animation, character and line of dialogue here is original work generated in
code. Distribute accordingly.
