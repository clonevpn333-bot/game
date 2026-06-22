# Level Accuracy & Roster Plan

Goal: cut repetitive / non-existent levels, and make every remaining level
**bigger, longer, and far more accurate** to the real Fall Guys. A plan only —
nothing here is executed until signed off.

> Roster authenticity is being re-verified by a research pass; the "fake /
> duplicate" calls below are my assessment and will be reconciled with it.

---

## 1. Current roster audit (19 levels)

| # | Level | Real? | Status / problem |
|---|-------|-------|------------------|
| 1 | **Door Dash** | ✅ real | Rebuilt 1-to-1. Good. (lengthen slightly) |
| 2 | **Gate Crash** | ✅ real | **INACCURATE** — uses smash-doors; the real level is raising/lowering **gates** in timed waves. Needs a Gate primitive. |
| 3 | **The Whirlygig** | ✅ real | **INACCURATE** — generic beams/bumpers; real one is a long course of big spinning **windmill blades** + treadmills over slime. |
| 4 | **Dizzy Heights** | ✅ real | Rebuilt with spinning plates. Add the 4-lane **ball gauntlet** + **stacked-disc** finale for full accuracy. |
| 5 | **Fruit Chute** | ✅ real | Rebuilt as an uphill climb. Good. (lengthen) |
| 6 | **Hit Parade** | ✅ real | Generic "everything" mix; needs the real section order + more length. |
| 7 | **Knight Fever** | ✅ real | Up/down profile done; obstacles are stand-ins. Needs **half-pipe, spike-logs, Thicc Bonkus, drawbridges**. |
| 8 | **Slime Climb** | ✅ real | Rebuilt as a climb vs a rising flood. Good. |
| 9 | **Big Fans** | ✅ real | **INACCURATE** — windmills; the real level has giant **fans that blow you** (wind push) toward the slime. Needs a Wind primitive. |
| 10 | **Jump Club** | ✅ real | Good. Add the second, higher sweeper bar. |
| 11 | **Jump Showdown** | ✅ real | Final version of Jump Club — keep (faster/smaller). Slightly too similar to #10; differentiate (two bars + shrinking floor). |
| 12 | **Block Party** | ✅ real | Rebuilt + rebalanced. Good. |
| 13 | **Tail Tag** | ✅ real | Good. |
| 14 | **Tip Toe** | ✅ real | AI improved. Enlarge the grid (longer path). |
| 15 | **Perfect Match** | ✅ real | Fixed grid + AI. Good. (bigger board, more fruits/rounds) |
| 16 | **Hex-A-Gone** | ✅ real | Good. Add more vertical layers (it's a long endurance final). |
| 17 | **Fall Mountain** | ✅ real | Rebuilt as a climb to the Crown. Good. |
| 18 | **Lost Temple** | ❌ **FAKE / DUPLICATE** | Not a canonical Fall Guys level, and it's a near-clone of Fall Mountain (mountain-kind crown race). **Remove / replace.** |
| 19 | **Royal Fumble** | ✅ real | Good (one-tail final). |

### Verdicts
- **Remove (fake + duplicate):** **Lost Temple** → replace with a real, distinct final.
- **Near-duplicate to differentiate (keep both):** Jump Club vs Jump Showdown (make Showdown clearly the harder two-bar final).
- **Door-family overlap (all real, keep, but make distinct):** Door Dash = pure doors (done); Gate Crash = raising gates (fix mechanic); Hit Parade = mixed gauntlet (distinct sequence).

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

Priority real levels to build (grouped):
- **Races:** **See Saw** (tilting boards — research done), **Tundra Run** (slippery + fans + snowballs), **Lily Leapers** (bouncy lily pads over water), **Hoopla** (run through hoops + fans).
- **Survival:** **Roll Out / Roll Off** (walk a rotating drum), **Tunnel** (treadmill survival).
- **Logic / Hunt:** **Jinxed** (tag — being "it" spreads), **Sweet Thieves**-lite.
- **Team:** **Egg Scramble**, **Hoarders**, **Rock 'n' Roll** (3-team scoring — needs a team-score system; bigger lift, later).
- **Finals:** **Thin Ice** (tile-break), **Roll Off**, **Fall Ball** (soccer — needs a ball + goals), **Lost Temple → replaced** by one of these.

Original ("fake-but-faithful") levels are allowed too, but only if held to the
same bar: full multi-section, themed, hand-laid, as big as a real course.

---

## 6. Proposed execution order

1. **Remove Lost Temple**, slot in a real final (start with **Thin Ice** or **See Saw**-as-needed) so the roster has no fakes.
2. **Primitive: Gate** → fix **Gate Crash** (biggest accuracy win, no terrain).
3. **Primitive: Wind/Fan** → fix **Big Fans**.
4. **The Whirlygig** accuracy pass (giant windmill).
5. **Lengthen all races** to 5-7 sections (~5,200 long) + winnability pass.
6. **Primitives: half-pipe, drawbridge, spike-log** → full **Knight Fever**.
7. **Dizzy Heights** finale (stacked discs + ball gauntlet).
8. **See Saw** (new, primitive #6) + **Roll Off** (#8).
9. Bigger finals (Hex layers) + **Thin Ice**.
10. (Later, large) **team modes** (Egg Scramble / Hoarders / Rock 'n' Roll).

Each step: build → headless sim (winnable) → screenshot-verify vs reference →
commit. Multi-agent research per new level before building, as we've been doing.
