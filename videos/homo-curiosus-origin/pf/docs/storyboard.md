# Storyboard: HOMO CURIOSUS — origin

**Logline.** One line, drawn by a curious species, runs unbroken from a 67,800-year-old hand stencil to the Moon — and turns into the name of the channel.

## Numbers

- 120 bpm → beat 0.5 s = 12 frames, 8th = 6 frames, 16th = 3 frames. Bar = 2 s. **28 s = 14 bars, 672 frames at 24 fps.**
- Narration is locked (`vo/assets/timing.json`, voice bm_george). Word onsets below are measured; every cut sits on the 8th grid.
- Compositor: Remotion (`../remotion`). Imagery: procedural Canvas scenes in `src/scenes/` (this project, gated by `tools/check.cjs`);
  Three.js for shots 05 and 07 (Remotion components `remotion/src/three/`), layered between a pf background scene and a pf overlay scene.

## Narration (locked)

| Line | Start–end | Words (onset s) |
|---|---|---|
| 1 | 0.50–5.40 | Nearly .52 · sixty-eight .99 · thousand 1.46 · years 1.94 · ago 2.21 · someone 3.04 · blew 3.52 · red 3.80 · ochre 4.08 · around 4.36 · their 4.84 · hand 5.12 |
| 2 | 5.75–8.04 | It 5.77 · was 5.97 · a 6.17 · question 6.37 · left 6.95 · on 7.22 · a 7.50 · wall 7.77 |
| 3 | 8.49–10.69 | We 8.52 · drew 8.81 · lines 9.10 · between 9.61 · the 10.11 · stars 10.40 |
| 4 | 11.04–13.46 | We 11.07 · built 11.35 · a 11.63 · computer 11.91 · out 12.62 · of 12.90 · bronze 13.18 |
| 5 | 13.81–15.75 | For 13.86 · twelve 14.14 · seconds 14.42 · we 15.12 · flew 15.44 |
| 6 | 16.10–18.45 | Then 16.13 · we 16.38 · followed 16.62 · the 17.23 · line 17.47 · to 17.72 · the 17.96 · Moon 18.20 |
| 7 | 18.85–21.42 | Every 18.88 · answer 19.44 · opened 19.84 · a 20.40 · bigger 20.63 · question 21.02 |
| 8 | 21.92–23.94 | This 21.94 · is 22.26 · Homo 22.58 · Curiosus 23.14 |
| 9 | 24.29–25.42 | Stay 24.33 · curious 24.73 |

## Summary

| # | id | T | Plate | Tech | What it shows → what it becomes | Caption band (y) |
|---|---|---|---|---|---|---|
| 01 | cave-hand | 0.00–2.75 | paper | Canvas | torch-lit cave wall; a hand reaches in and presses flat | 1380–1500 |
| 02 | ochre-breath | 2.75–5.75 | paper | Canvas | ochre blown around the hand → negative stencil → the line ignites | 1380–1500 |
| 03 | question-wall | 5.75–8.25 | blueprint | Canvas | stencil as blueprint; strata, hematite lattice; line curls into "?" | 250–350 |
| 04 | star-lines | 8.25–11.00 | paper | Canvas | "?" dot = Rigel; line draws Orion on an engraved planisphere | 1400–1500 |
| 05 | bronze-computer | 11.00–13.75 | blueprint | **Three.js** + Canvas | planisphere ring = Antikythera main wheel; exploded gear train | 1420–1520 |
| 06 | twelve-seconds | 13.75–16.00 | paper | Canvas | Kitty Hawk; the Flyer lifts; the line is the 12 s flight path | 300–400 |
| 07 | line-to-moon | 16.00–18.75 | navy | **Three.js** + Canvas | pull back through the sky to Earth; line loops to the Moon | 1400–1500 |
| 08 | bigger-question | 18.75–21.75 | paper | Canvas | Droste zoom: Moon → "?" → eye → cell → DNA → galaxy → "?" | 250–350 |
| 09 | homo-curiosus | 21.75–24.25 | navy | Canvas | the line writes HOMO CURIOSUS; vignettes orbit | none (wordmark speaks) |
| 10 | stay-curious | 24.25–28.00 | paper | Canvas | back on the wall: stencil + mark; "stay curious." in ink; line exits | none (hand-lettered) |

## Acts

| Act | Bars | T | Shots |
|---|---|---|---|
| I · the mark | 1–3 | 0–5.75 | 01–02 |
| II · the questions | 3–8 | 5.75–16 | 03–06 |
| III · the scale | 9–11 | 16–21.75 | 07–08 |
| IV · the name | 11–14 | 21.75–28 | 09–10 |

## Shared geometry (copy exactly; screen pixels on 1080×1920)

| G | Shape | Where | Shots |
|---|---|---|---|
| G1 | Hand stencil `FILM.hc.hand()` = { cx 540, cy 900, s 0.78 } | bounds x 344–807, y 474–1209; tips: index (656, 523), middle (549, 474), thumb (801, 824) | 01 end, 02, 03 start, 10 |
| G2 | Line birth point | index fingertip (656, 523) | 02 end → 03 start |
| G3 | Question mark `FILM.hc.question(650, 820, 820)` | hook starts (457, 545), stem foot (650, 1093), dot (650, 1186) r 35.5 | 03 end |
| G4 | The star | (650, 1186) — Rigel | 03 end → 04 start |
| G5 | Planisphere outer ring = main wheel | circle centre (540, 860), r 400 | 04 end → 05 start |
| G6a | Rail line | horizontal y 1240, x 0→1080 | 05 end → 06 start (rail / line) |
| G6b | Flight exit | line leaves (1080, 560) heading up-right 35° | 06 end → 07 start enters from (0, 1500) heading up-right |
| G6 | The Moon | circle centre (540, 700), r 170 | 07 end → 08 start |
| G7 | Line handoff | 08 ends with the line exiting the right edge at y 760; 09 starts with it entering from the left edge at y 760 | 08 → 09 |
| G8 | Hand reprise | 09 ends with a yellow G1 hand outline (light) at 24.0–24.25 → 10 opens on the ochre stencil on G1 | 09 → 10 |

## Shots

### 01 · cave-hand · 0.00–2.75 · paper · Canvas
**Subject.** Limestone wall, Liang Metanduno, 67,800 years ago, lit by one torch off-frame lower left.
**Layers (back→front).** (1) `lib.paper` hcIvory as base; (2) the rock: big hatched relief masses (stone/stoneLight/stoneDeep), flowstone ripples, fractures, pitting stipple, a calcite drip curtain at the top-right; (3) older stencils: 2 faded ochreDeep stencils (smaller hands, one child-size) and a few ochre dots/lines; (4) torch light: warm multiply/screen pool that flickers (seeded noise on twos), long cast shadow of the incoming hand; (5) the hand: realistic, inked (hcInk 4–5 px), skin flat colour with contour hatching, knuckle creases, nails, veins on the back — it comes in from the top-right, foreshortened, rotating to flat, and presses onto G1 exactly at **T 2.25** (on the 8th; squash of the fingertips, a puff of rock dust); (6) dust motes drifting in the torch beam (hundreds, depth-scaled); (7) overlay: an engraved arc annotation counting back "−67,800" is NOT text — use a tick-scale arc with a hcRed tick landing at 2.25.
**Camera.** Slow push 1.00→1.08 toward G1, ending exactly unscaled on G1 at 2.25 (so the hand outline sits on G1 pixels at the cut).
**Caption band.** y 1380–1500 (keep the hand and the arc annotation out).
**Sound.** 0.0 open (cave drone, water drip), 2.25 press (soft thud + dust).

### 02 · ochre-breath · 2.75–5.75 · paper · Canvas
**Subject.** The stencil being made.
**Layers.** Same wall (copy the 01 rock generator by seed so the wall is identical) but warmer light; the hand flat on G1 (palm to wall: we see the back of the hand); a hollow bone/reed tube enters lower-left at 3.25; **T 3.5→4.9 the spray**: a cone of thousands of ochre droplets (particles with velocity, drag, streak length ∝ speed, depth blur by size) hitting the wall and accumulating as a halo stipple densest 20–60 px from the outline, fading to sparse by ~260 px, plus 3–5 drips running down; ochreDust haze in the air; **T 5.0 the hand lifts away** (up and out of frame on twos, 3 drawings) revealing the NEGATIVE stencil on G1 (rock-coloured hand in a red halo); **5.0→5.6 the fingers narrow** (`hand({ narrow })` 0→0.55, the retouch, a few hand-applied ochre strokes); **T 5.25 ignite**: the curiosity line is born as a spark at G2 (656, 523) and draws a first short tail (~120 px) upward.
**Camera.** Locked, a tiny shake on the breath.
**Caption band.** 1380–1500.
**Sound.** 3.5 breath (long airy spray), 5.0 lift (skin-off-rock tick, shimmer), 5.25 ignite (bright plip).

### 03 · question-wall · 5.75–8.25 · blueprint · Canvas
**Subject.** The hidden systems of that mark, and the question it asks.
**Layers.** `lib.blueprint`; G1 hand as double lavender outline at 5.75, inside it a contour-line map of the rock relief; around it the halo as a stipple field; **calcite strata** above it as 7 wavy layers with a drilled sample core (bracket + label "U-SERIES ≥ 67.8 KA"); an inset circle (node glyph) with a hematite **Fe₂O₃** hex lattice (label); measurement brackets on the hand height. From 6.0 the whole diagram eases to lower-left (hand → cx 300, cy 1260, s 0.42 by 6.5) while **the curiosity line** (hcYellow light) runs from the fingertip up and across into the G3 "?" — hook drawn by **6.875**, the dot lands at **7.0** (glowDot burst, hcRed ring 8 frames). 7.0→8.25: the dot breathes; faint star field appears around it (foreshadowing 04). Progress glyph at (900, 300), arc 1 lit.
**Caption band.** 250–350 (top).
**Sound.** 5.75 cut (blueprint pluck), 6.375 curl (rising glide), 7.0 dot (glass ping).

### 04 · star-lines · 8.25–11.00 · paper · Canvas
**Subject.** Humans connecting the sky into stories and instruments.
**Layers.** hcIvory paper with faint engraved meridian/parallel graticule; a **planisphere**: outer ring G5 (540, 860) r 400 with degree ticks, zodiac band ring with 12 engraved sign glyphs (procedurally drawn line-art, not fonts), an inner rotating rete with curved pointers; engraved star field (hundreds of stipple stars, 6 magnitude sizes as 8-point engraved stars); **Orion**: Rigel at G4 (650, 1186) — wait, Rigel must be inside the ring area: the chart is drawn so that Orion fills the ring's lower half and Rigel sits on G4 even though it is near the ring bottom (r 400 → bottom y 1260); the curiosity line (orange ink) hops star-to-star on the 8ths **8.75, 9.25, 9.75, 10.25** (Rigel → belt → Betelgeuse → Bellatrix → Saiph...), each arrival popping the star; behind, an **engraved hunter figure** (club raised, shield) in hatched line fades up 9.5→10.4; **10.5 lock**: the rings rotate and click into final alignment, outer ring G5 thickens (this is the circle the next shot's gear sits on).
**Camera.** Rotating very slowly (rete), push 1.0→1.05 then settles at 10.5 exactly unscaled so G5 lands.
**Caption band.** 1400–1500 (ring bottom is 1260 — fine).
**Sound.** 8.25 cut, stars on 8.75/9.25/9.75/10.25 (ascending glock), 10.5 lock (ratchet click + bell).

### 05 · bronze-computer · 11.00–13.75 · blueprint · Three.js + Canvas
**Subject.** The Antikythera mechanism, c. 150 BC.
**pf scene `bronze-computer`** draws ONLY the blueprint background (grid, guide circles, faint exploded-view axis lines, progress glyph arc 3). **pf scene `bronze-computer-fg`** (same file, registered second, drawn transparent by Remotion) draws annotations: tooth-count brackets "223", "38", "127" in mono small caps (≤3 labels), leader lines to gears, a back-dial spiral (Saros) unwinding, "c. 150 BC" label, hcYellow curiosity line tracing the main wheel pitch circle then shooting off tangentially to the right along y 1240 at 13.5 (G6a).
**Three layer (remotion/src/three/Antikythera.tsx).** Main wheel face-on at 11.0 projected onto G5 (r 400 on screen), 4-spoke cross, 223 fine triangular teeth, corroded bronze/verdigris material (procedural canvas texture), smaller meshing gears behind it exploding outward along z from 11.5 (stagger), all rotating at correct ratios; camera orbits to 3/4 by 12.6, slight push; **11.875 gear** a big gear engages (clunk); **13.25 bronze** a rim-light glint sweeps.
**Caption band.** 1420–1520.
**Sound.** 11.0 cut (deep clock tock), ticking escapement under, 11.875 gear clunk, 13.25 bronze gong.

### 06 · twelve-seconds · 13.75–16.00 · paper · Canvas
**Subject.** Kitty Hawk, 10:35 am, 17 Dec 1903.
**Layers.** hcIvory sky with horizontal engraved hatching (skyPale tint, wind-streaked), distant Kill Devil Hill dune silhouette, the camp shed, dunes with contour hatching (sand/sandShade), wind-bent grass tufts streaming right-to-left (wind from the north), the **60 ft launch rail on G6a y 1240**; **the Wright Flyer** in 3/4 side view, ~760 px wingspan, every rib, strut and wire, muslin with seam lines, canard in front, twin rudders behind, two pusher props (blur discs), Orville prone; **Wilbur** running at the right wingtip (on twos); sand kicked up. **14.5 liftoff** the flyer leaves the rail; climbs ~10 ft-equivalent and the camera tracks; the **curiosity line is the flight path** drawing on behind the flyer with dashed ruler ticks every second (annBlue ruler 0–12 s) and a "120 FT" bracket; **15.5 flew**: the line breaks free, rises steeply and exits at G6b (1080, 560).
**Camera.** Pan right with the flyer (world scroll), parallax on dunes.
**Caption band.** 300–400 (sky).
**Sound.** 13.75 cut (wind, engine putter), 14.5 liftoff (whoosh up), 15.5 flew (rising glide).

### 07 · line-to-moon · 16.00–18.75 · navy · Three.js + Canvas
**Subject.** 66 years later: following the line all the way.
**pf scene `line-to-moon`**: navy space plate with engraved star field (stipple), faint orbital guide circles, progress glyph arc 5. **pf `line-to-moon-fg`**: the curiosity line overlay (it must stay the same 2D light line), distance ticks along it, an arc annotation "384,400 KM" (one label).
**Three layer (remotion/src/three/EarthMoon.tsx).** Start: camera low in a pale sky (sky gradient sphere) looking up the rising line; 16.0→17.0 pull back fast through atmosphere layers (ink-textured cloud shells) — dramatic scale change — to a full Earth (sphere with procedural canvas texture: engraved coastlines, hatched oceans in brand palette) small in frame; the free-return trajectory (a 3D tube or a projected 2D line) loops around the Moon; 17.0→18.25 the camera rides toward the Moon; **18.25 moon**: the Moon sits on G6 (540, 700) r 170 on screen.
**Caption band.** 1400–1500.
**Sound.** 16.0 cut (reverse swell into big whoosh), sub drop, 18.25 moon (bell).

### 08 · bigger-question · 18.75–21.75 · paper · Canvas
**Subject.** Every answer opens a bigger question.
**Layers.** One continuous logarithmic zoom (Droste) on hcIvory engraving. Level 0: the Moon on G6 (hatched maria, craters) is the **dot of a "?"** whose hook (orange ink curiosity line) arcs above; zoom INTO the hook's curl: Level 1 an engraved **human eye** (iris fibres, lashes, cross-hatched lid); pupil → Level 2 a **cell** (membrane, organelles stippled); nucleus → Level 3 **DNA** double helix (hatched ribbons); a rung → Level 4 a **spiral galaxy** (stipple arms); the core → Level 5 a new "?" whose dot is a tiny star. Zoom accelerates on beats **19.5, 20.25** (zoom cues), arriving at **21.0 question** with the final big "?" (hcRed ring flash). 21.0→21.75: the "?" unravels into a single line that sweeps right and exits at G7 (1080, 760).
**Caption band.** 250–350.
**Sound.** 18.75 cut, zoom swells 19.5/20.25 (rising pitch), 21.0 question (stab + crash).

### 09 · homo-curiosus · 21.75–24.25 · navy · Canvas
**Subject.** The name.
**Layers.** `lib.blueprint` tinted hcNavy; construction geometry fades in (cap line, baseline, x-height guides, compass arcs, a golden-ratio rectangle); the curiosity line enters at G7 (0, 760) and **writes HOMO** (monoline engraved capitals, cap height ~200 px, baseline y 860, x 150–930) finishing **22.5**, then loops down and **writes CURIOSUS** (cap height ~120, baseline y 1080, x 130–950) finishing **23.125**; each letter's completion pops a tiny glint; around the word, 5 small engraved vignettes (hand stencil, star, gear, flyer, Moon; ~110 px, lavender linework) orbit on an elliptical path that is itself the curiosity line; **24.0→24.25** everything collapses into a yellow G1 hand outline (G8).
**Caption band.** none.
**Sound.** 21.75 cut, 22.5 homo (stab), 23.125 curiosus (stab + crash), shimmer tail.

### 10 · stay-curious · 24.25–28.00 · paper · Canvas
**Subject.** The mark endures; the line goes on.
**Layers.** The 01 wall (same generator, same seed) under warm torch; the **ochre stencil on G1** (negative, narrowed fingers as at the end of 02); a small HOMO CURIOSUS mark engraved under it (the hand-with-"?" emblem: a "?" drawn inside the palm in orange ink, 24.5→25.0); the curiosity line circles the hand once (24.25→24.75), then writes **"stay curious."** in a flowing hand-ink cursive (single stroke, procedurally authored glyph strokes, cap ~90 px) at y 1330–1420 from 24.75→25.6; 25.6→27.5 the line drifts on and exits into the dark lower-right; torch flickers; dust motes; **27.5 out**: the torch dims to the 01 opening light so the loop to 01 is seamless.
**Caption band.** none.
**Sound.** 24.25 cut, 24.75 curious (warm chord), 27.5 out (drip, as 01 opens).
