# Level Accuracy & Roster Plan

Goal: cut repetitive / non-existent levels, and make every remaining level
**bigger, longer, and far more accurate** to the real Fall Guys. A plan only —
nothing here is executed until signed off.

> Authenticity verified by research pass (2026-06-22). **All 19 levels are
> REAL** — there are NO fakes. The felt "repetition" comes from two levels
> being IMPLEMENTED wrong (notably Lost Temple built as a Fall Mountain clone),
> plus one miscategorization (Tip Toe). Fix = rebuild to the real mechanic.

---

## 1. Current roster audit (19 levels)

| # | Level | Real? | Status / problem |
|---|-------|-------|------------------|
| 1 | **Door Dash** | ✅ real | Rebuilt 1-to-1. Good. (lengthen slightly) |
| 2 | **Gate Crash** | ✅ real | **INACCURATE** — uses smash-doors; the real level is raising/lowering **gates** in timed waves. Needs a Gate primitive. |
| 3 | **The Whirlygig** | ✅ real | **REBUILT BESPOKE (1-to-1)** — full multi-tier climb authored via the new `Level` layer: crowned START slab → 4-disc CLOVERLEAF of sweeping arrow-beams → purple STAIR ramp → X-SPINNER tier (two giant pink X-crosses, purple rails) → windmilled TOP around a tall pink-striped central column → FINISH. Climbs z 0→~580 over ~5000 units; ~30s race; 7/20 qualify. Floats high over water (fall off any edge = splash). |
| 4 | **Dizzy Heights** | ✅ real | Rebuilt with spinning plates. Add the 4-lane **ball gauntlet** + **stacked-disc** finale for full accuracy. |
| 5 | **Fruit Chute** | ✅ real | Rebuilt as an uphill climb. Good. (lengthen) |
| 6 | **Hit Parade** | ✅ real | Generic "everything" mix; needs the real section order + more length. |
| 7 | **Knight Fever** | ✅ real | Up/down profile done; obstacles are stand-ins. Needs **half-pipe, spike-logs, Thicc Bonkus, drawbridges**. |
| 8 | **Slime Climb** | ✅ real | **REBUILT BESPOKE** on the Level layer: a tall climb of distinct platforms (wide start funnelling narrow) racing a RISING slime flood — push-block gauntlets (3/2/4), a backward conveyor, a cannon slope, the signature **yellow cylinder balance-beams** over the goo, a hammer room and a **triple-pendulum** finale, plus the inflatable ring float. ~33s; ~19/40 finish. |
| 9 | **Big Fans** | ✅ real | **INACCURATE** — windmills; the real level has giant **fans that blow you** (wind push) toward the slime. Needs a Wind primitive. |
| 10 | **Jump Club** | ✅ real | Good. Add the second, higher sweeper bar. |
| 11 | **Jump Showdown** | ✅ real | Final version of Jump Club — keep (faster/smaller). Slightly too similar to #10; differentiate (two bars + shrinking floor). |
| 12 | **Block Party** | ✅ real | Rebuilt + rebalanced. Good. |
| 13 | **Tail Tag** | ✅ real | Good. |
| 14 | **Tip Toe** | ✅ real | **MISCATEGORIZED** — it's a **Race/Course**, not Logic. Recategorize. AI improved; enlarge the grid (longer path). |
| 15 | **Perfect Match** | ✅ real | Fixed grid + AI. Good. (bigger board, more fruits/rounds) |
| 16 | **Hex-A-Gone** | ✅ real | **REBUILT as a real multi-layer TOWER** — 7 stacked honeycomb layers (lower wider), z-aware floor so you fall through holes layer-to-layer and are out only off the BOTTOM into slime. Tiles flash white & vanish ~1s after a step; last bean standing wins. Drawn instanced (one mesh/layer) for speed. |
| 17 | **Fall Mountain** | ✅ real | Rebuilt as a climb to the Crown. Good. |
| 18 | **Lost Temple** | ✅ real (S5 Final) | **MIS-IMPLEMENTED** — I built it as a Fall Mountain crown-climb, which is why it feels like a duplicate. The REAL level is a **maze of randomized obstacle rooms** ending at a crown that slides over **lily pads**. **Rebuild to the real mechanic** (don't remove). |
| 19 | **Royal Fumble** | ✅ real | Good (one-tail final). |

### Verdicts (post-audit)
- **NEW: data-driven `Level` authoring layer ("level editor engine").** Author a
  course as discs / slabs / ramps + decorations (`crown`, `chevrons`,
  `windmillDeco`, `rail`, `column`); `apply()` wires the sim floor
  (`platformGroundZ`), AI waypoints (`path`), and the view's decoration list in
  one shot. This is what makes BIG multi-tier bespoke courses tractable. The
  Whirlygig is the first level rebuilt on it; the rest of the keepers follow.
- **No fakes to remove.** All 19 are real.
- **Fix the FELT duplication by rebuilding mis-implemented levels:**
  - **Lost Temple** → rebuild as the **maze-of-rooms** final (currently a Fall
    Mountain clone — that's the whole reason it feels repetitive).
  - **Recategorize Tip Toe** as a Race (it's a Course round, not Logic).
- **Intentional near-duplicates — KEEP BOTH (authentic):** Jump Club (Survival)
  vs Jump Showdown (Final, +falling floor); Tail Tag (Hunt) vs Royal Fumble
  (Final, single tail). The real game ships both pairs on purpose.
- **Door-family overlap (all real, keep, make distinct):** Door Dash = pure
  doors (done); Gate Crash = raising/lowering **gates** (fix mechanic); Hit
  Parade = turntables + wrecking balls (distinct sequence).
- **Biggest gap = ZERO team rounds.** Adding Egg Scramble / Hoarders / Fall
  Ball / Rock 'n' Roll is the highest-variety win (needs a team-score system).

---

## 2. Engine primitives required for accuracy (the real unlock)

Most "inaccuracy" is missing mechanics, not bad placement. Build these, in order:

1. **Gate (raise/lower wall in waves)** — Gate Crash. A wall segment that drops to block then lifts to open, on a per-row timed cycle (run through when it's up/opening).
2. **Wind zone / Fan push** — Big Fans (+ future Hoopla/Tundra). A volume that adds a steady push velocity to beans inside it; the fan visually spins.
3. **Half-pipe floor** — Knight Fever (+ others). A curved cross-section that funnels beans to the centre; pairs with the terrain system.
4. **Drawbridge** — Knight Fever. A hinged platform that tilts up (gap) / down (crossable) on a timer.
5. **Spike-log roller** — Knight Fever / Slime Climb. A horizontal cylinder with radial spikes that rotates; ride/dodge the gaps.
6. **See-saw (tilting platform)** — the See Saw level. A board that tips under bean weight (research already done).
7. **Stacked rotating discs** — Dizzy Heights finale (reuse SpinPlate, stack + size-step).
8. **Big rolling cylinder** — Roll Off / Roll Out (a slowly rotating drum you walk on).
9. **Tile-break ice / thin-ice** — a Thin Ice / Snowy Scrap final (floor tiles that crack and drop in stages — Hex-A-Gone tech generalised).

(Already have: terrain slopes/pits, rising-flood, spinning plates, cannons,
conveyors, bumpers, hammers, axes, moving blocks, slide walls, doors, hex tiles.)

---

## 3. Per-level accuracy upgrades (after primitives land)

- **Gate Crash** → swap doors for **Gate waves** (5-7 rows, gaps offset row to row); time your run to the openings. *(needs #1)*
- **Big Fans** → replace windmills with **giant fans** along the edges that **blow beans toward the slime**; safe lanes in the lee of platforms. *(needs #2)*
- **The Whirlygig** → one or two **giant windmill blades** sweeping the full width, treadmill sections, narrow slime bridges; faithful section order.
- **Knight Fever** → real obstacle set on the existing up/down terrain: holey **half-pipes + swinging axes** (climb), **spike-log** gauntlet (3 then 2), slime **slide** with axes + bumper-triangles, long half-pipe with **two Thicc Bonkus**, three offset **drawbridges** → finish. *(needs #3,#4,#5)*
- **Hit Parade** → real "greatest-hits" sequence (doors → spinning bars → hammers → see-saw → fruit → fans), each a distinct beat, longer.
- **Dizzy Heights** → add the flat **4-lane ball gauntlet** (cannons head-on) and the **stacked triple-disc** finale + ramp. *(needs #7)*
- **Hex-A-Gone** → 4-5 stacked layers; faster decay over time.
- **Tip Toe / Perfect Match** → larger boards / longer hidden path; more rounds.

---

## 4. Make levels BIGGER & LONGER

- **Race length:** extend the course axis from ~3,740 to **~5,200-5,500** and give every race **5-7 distinct sections** (not 3-4), matching real run-times.
- **Width / scale:** widen the lane a touch and increase obstacle counts per section so courses read as substantial, not sparse.
- **Finals:** bigger arenas (Hex layers, larger Fall Mountain).
- Re-verify each enlarged course is winnable (sim + screenshots) after resizing.

---

## 5. New authentic levels to ADD (replace the fake, add variety)

Priority real levels to build (grouped). **Team rounds are the biggest gap (we
have none) — highest variety-per-effort:**
- **TEAM (build first for variety):** **Egg Scramble** (3 teams hoard eggs),
  **Hoarders** (push balls into your zone), **Fall Ball** (2-team soccer),
  **Rock 'n' Roll** (push a giant ball to the finish). Needs a **team-score
  system** (new) — one lift, then four levels reuse it.
- **Races:** **See Saw** (tilting boards — research done), **Tundra Run**
  (icy + fans + snowballs), **Lily Leapers** (springy lily pads over slime).
- **Survival:** **Roll Out** (walk a giant rotating segmented drum, avoid holes).
- **Hunt/Logic:** **Jinxed** (tag that spreads to a whole team), **Roll Call**
  (stand on the correct tile each round).

Original ("fake-but-faithful") levels are allowed too, but only if held to the
same bar: full multi-section, themed, hand-laid, as big as a real course.

---

## 6. Proposed execution order

1. **Recategorize Tip Toe** as a Race (quick metadata fix).
2. **Primitive: Gate** → fix **Gate Crash** (biggest single accuracy win, no terrain).
3. **Primitive: Wind/Fan** → accuracy pass on **Big Fans** + **The Whirlygig** (giant windmill).
4. **Lengthen all races** to 5-7 sections (~5,200 long) + winnability pass.
5. **Primitives: half-pipe, drawbridge, spike-log** → full **Knight Fever**.
6. **Rebuild Lost Temple** as the real **maze-of-rooms** final (kills the felt Fall-Mountain duplication).
7. **Dizzy Heights** finale (stacked discs + ball gauntlet); bigger **Hex-A-Gone** (more layers).
8. **Team-score system** → **Egg Scramble**, **Hoarders**, **Fall Ball**, **Rock 'n' Roll** (fills the biggest gap).
9. New races: **See Saw**, **Roll Out**, **Lily Leapers**, **Tundra Run**.

Each step: build → headless sim (winnable) → screenshot-verify vs reference →
commit. Multi-agent research per new level before building, as we've been doing.
