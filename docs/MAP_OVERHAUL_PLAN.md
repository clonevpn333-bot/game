# Map Overhaul Plan — "make the levels feel real"

> A refresh, not a rewrite. Keep the engine, cosmetics, shop/Fall Pass, UI,
> and the working modes (Hex-A-Gone, Tail Tag, Perfect Match, Block Party,
> Royal Fumble, Jump Club/Showdown, Tip Toe). Replace the RACE/CLIMB/MOUNTAIN
> levels with hand-authored, section-by-section recreations.

## Diagnosis (why current maps fall short)
1. **Composition, not authorship.** Builders assemble generic helpers
   (`_beams`, `_bumpers`, `_conveyor`, `_cannons`…) at evenly spaced y-values.
   That is procedural generation; real levels are deliberate, asymmetric,
   named sections with specific placements and lane logic.
2. **A flat, thin world.** The sim is a flat top-down lane (beans on the floor,
   z = jump only) with ~10 obstacle types. Real levels are 3D: slopes,
   pits/gaps, multi-tier platforms, half-pipes, tilting see-saws, rotating
   turntables, slime slides. Missing primitives => every map reduces to
   "stuff on a strip."

## New methodology (per map, every time)
1. **Deep reference analysis -> SECTION SPEC.** For each section 1..N, write
   down: shape (length/width), terrain (flat/slope/gap/half-pipe/tier),
   obstacles (type, count, exact positions, motion + timing), transitions,
   and qualify rule. Source: wiki + guides + the user's reference images,
   cross-checked. Get the spec signed off before building.
2. **Primitive check.** If a section needs something we lack (slope, gap,
   see-saw…), build that engine primitive first.
3. **Handcraft the builder.** Author the level section-by-section in bespoke
   code with explicit coordinates — NOT helper-at-intervals.
4. **Verify section-by-section.** Build one section, screenshot from the play
   camera, compare to the real level, iterate until it matches, then move on.
5. **Balance + AI pass.** Winnable; AI navigates each bespoke section.

## Engine primitives to add (the real unlock; in priority order)
- **Terrain height + gaps** — per-section floor elevation (ramps/slopes for
  Slime Climb / Fruit Chute / Fall Mountain) and pit/gap zones you fall
  through (Tip Toe, See Saw, half-pipe holes). Biggest fidelity unlock.
- **Tilting platforms (See Saw)** and **rotating platforms (turntables,
  Dizzy Heights / Roll Out feel).**
- **Slime slides** (low-friction slopes) and **half-pipe** lanes (curved,
  funnel to centre — Knight Fever).
- **Bespoke obstacles** per level that needs them: rolling spike logs,
  drawbridges (raise/lower), pendulums, flippers.
- **Bigger, later:** Wall Guys stackable blocks, Roll Out cylinder, 3-team
  scoring (Egg Scramble / Rock 'n' Roll).

## Bar for every map (real or original/"fake")
- Match the real level's length, section count and obstacle density (most
  races are 4–9 distinct sections).
- Original maps held to the SAME bar: full multi-section, themed, hand-laid,
  as big/detailed as a real map.

## Proposed order (flagship-first to prove the method)
1. **Door Dash** — no new primitives; proves section-by-section authoring,
   real two-stage door banks, a proper start/finish.
2. **Dizzy Heights** — proves slope + rotating turntables + slime slide +
   fruit cannons.
3. **Slime Climb** — proves uphill slope terrain + rising slime + balance-beam
   gaps.
Then: Gate Crash, Hit Parade, The Whirlygig, Knight Fever, Fruit Chute,
Big Fans, See Saw (new), Tip Toe (gaps), Fall Mountain, + new big originals.

## Menu (secondary)
Proper party-lobby feel: bean on a podium with idle/emote animation, cleaner
layout, polished buttons, a Fall Pass/season banner. Slot after the first
flagship maps.

## Working agreement
- Go map-by-map: post the SECTION SPEC for sign-off -> build section-by-section
  -> screenshots per section -> approve/correct -> next.
- Use multi-agent where it helps (one agent researches the next map's spec
  while I build the current; a view agent themes while I lay sim), but
  authoring stays handcrafted and verified — no algorithmic shortcuts.

## Two decisions to confirm before we start
1. Which map is the first flagship? (Recommend Door Dash — simplest, proves
   the pipeline with zero new primitives.)
2. Cleared to invest in the terrain-height/slope/gap + see-saw/turntable
   primitives first? They're foundational; maps won't look right without them.
