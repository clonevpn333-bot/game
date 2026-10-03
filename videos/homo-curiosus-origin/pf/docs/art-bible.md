# Art bible: HOMO CURIOSUS — origin

The visual rules every scene follows. The house look comes from `docs/reference-analysis.md`
(Kevin Ngo's procedural films): warm hand-inked illustration cut against midnight blueprint.
HOMO CURIOSUS adds its own identity on top (section 0). Where this file and a scene brief disagree on a
colour, weight or rule, this file wins. Where this file and `docs/storyboard.md` disagree on a position
or a time, the storyboard wins.

## 0. HOMO CURIOSUS identity (non-negotiable)

- **Diagrams become reality, reality becomes diagrams.** Every cut is a transformation of a shape, never an arbitrary jump.
- **Hidden systems revealed.** The blueprint shots open the thing up: strata, lattices, gear trains, orbits.
- **Scale changes.** At least every other shot zooms or pulls through an order of magnitude.
- **THE CURIOSITY LINE** (`FILM.hc.line`, src/cast.js) is the one recurring motif: a burnt-orange ink stroke on paper,
  a curiosity-yellow light line on navy. It is born at the stencil's index fingertip (shot 2) and becomes a question mark,
  constellation lines, a gear pitch circle, a flight path, a lunar trajectory, the Droste spiral and finally the wordmark.
  Only the line is allowed to glow on paper. Nothing else uses hcOrange/hcYellow as a large fill.
- Science, mystery and history collide: each illustrated shot carries one engraved scientific annotation
  (arc, bracket, ruler, tick scale) in the overlay colours.
- Never: UI cards, rounded rectangles with text, centred title cards, gradient blobs, emoji, drop shadows, generic icons.
  Compose off-centre (thirds) unless the shot is a match cut on G1/G5/G6.

## 1. Frame

The canvas is 1080 px wide and 1920 px tall at 24 fps. Origin top-left, y down.

### 1.1 Shorts safe area

Must-read content (subject, match-cut shapes, labels) sits inside x 60 to 940 and y 220 to 1540.
Captions are composited later by Remotion inside a per-shot caption band (storyboard "Caption band");
a scene must keep its hero out of that band. Backgrounds, grain and guides run full bleed.

### 1.2 Composition for a tall frame

Compose for the height. Use the vertical axis (the hand reaching down, the line rising to the Moon).
Large subjects fill 60 to 90 percent of the width. Foreground / midground / background on every illustrated shot.

## 2. Palettes

Names are keys of `FILM.lib.pal`. Colour is flat; tone comes from hatching. Radial glows only in schematic mode
and for the curiosity line's head.

### 2.1 Brand palette (both plates)

| Name | Hex | Use |
|---|---|---|
| hcIvory | #F2E8D0 | Paper base for every illustrated shot (`lib.paper({ color: P.hcIvory })`) |
| hcIvoryShade | #E2D2AE | Paper shade, stripe band B |
| hcIvoryDeep | #C9B289 | Paper vignette |
| hcNavy | #0D1630 | Blueprint base (`lib.blueprint`, then tint toward hcNavy) |
| hcNavyDeep | #070C1E | Space, deepest shadow |
| hcYellow | #F2C230 | Curiosity line on navy, line highlights, stars that matter |
| hcYellowPale | #F8E3A0 | Soft yellow tints |
| hcOrange | #D45F1E | Curiosity line on paper |
| hcOrangeDeep | #A8441A | Line edge, accent hatching |
| hcInk | #1F1610 | Main ink outline on paper (use instead of pal.ink) |
| hcInkSoft | #4E3C2C | Secondary ink |
| hcCyan | #5EC8D8 | Occasional schematic accent (one per shot max) |
| hcViolet | #8A6BD1 | Occasional schematic accent |
| hcRed | #C8321E | Warning / change flash (replaces magenta) |

Blueprint linework stays `lavender`, `lineWhite`, `paleBlue`, `grid` from lib.pal (2.3 below).

### 2.2 Subject palette

| Name | Hex | Use |
|---|---|---|
| ochre | #B4472A | Hand-stencil pigment (red ochre, hematite) |
| ochreDeep | #7E2B18 | Dense pigment, older stencils |
| ochreDust | #D07A52 | Airborne spray haze, sparse dots |
| stone | #CDBB98 | Limestone wall base |
| stoneLight | #DDD0B2 | Lit rock planes |
| stoneDeep | #9C8462 | Rock shade hatching |
| stoneShadow | #5E4B35 | Crevices, deepest cave dark (with hcInk) |
| torch | #F4A548 | Torch light pools (multiply/screen washes only) |
| skin | #D9A88A | Hand skin |
| skinShade | #B07A5E | Skin hatching |
| skinDeep | #7F5240 | Creases, nail edges |
| bronze | #A06C32 | Antikythera bronze |
| bronzeLight | #D6A55E | Bronze highlights |
| verdigris | #5E8A73 | Corrosion |
| verdigrisLight | #8DB59C | Corrosion highlights |
| sand | #E6D3A2 | Kitty Hawk dunes |
| sandShade | #C4A86E | Dune hatching |
| spruce | #C9B48A | Flyer spruce frame |
| canvasCloth | #EDE3C8 | Flyer wing muslin |
| skyPale | #DCE3DD | 1903 sky band |
| moon | #E9E4D6 | Moon disc |
| moonShade | #A9A397 | Moon maria hatching |
| earthSea | #2B4C7E | Earth ocean |
| earthLand | #C9B27C | Earth land |

### 2.3 Cool schematic palette (blueprint plate)

`navy #0B1230`, `navyDeep #060A1C`, `navyLight #18234D`, `grid #3A4A86`, `lavender #C8C1EF`, `lineWhite #EEF0FF`,
`paleBlue #9CC2EA`, `glow #FFF3DC`. HOMO CURIOSUS replaces the house magenta with **hcRed** for change flashes and
uses **hcYellow** only for the curiosity line and its targets.

### 2.4 Overlay colours on illustrations

annBlue #3B8EE0 (trajectories, rulers), annYellow #EAB530 (attention rings, brackets), hcRed (change), teal #3C8783 (secondary).

## 3. Line

All widths are at 1080 px wide.
Illustrated lines come from `lib.inkPath` with pressure variation of plus or minus 25 percent.

### 3.1 Illustrated weights

| Element | Width | Colour and opacity |
|---|---|---|
| Hero subject outline | 5 px | ink 100% |
| Doubled hero outline, occasional | 1.5 px, offset 3 px | ink 40% |
| Secondary form outline | 3 px | ink 100% |
| Detail lines: segment rings, veins, ridges | 1.8 px | inkSoft 90% |
| Hatch strokes | 1.2 to 1.8 px | ink or the form's deep colour, 70 to 90% |
| Construction lines | 1.5 px | inkFaint 30% |

Hero-specific line treatments (for example the band widths of a wing's veins) are specified in section 10 with exact widths at a stated subject size, and scale with the drawn size.

### 3.2 Schematic weights

| Element | Width | Colour and opacity |
|---|---|---|
| Primary outline, double | outer 2.5 px and inner 1.5 px, 9 px apart | lavender 85% outer, 50% inner |
| Secondary outline | 1.5 px | lavender 60% |
| Lattice and cell lines | 1 px | lavender 30 to 40% |
| Grid | 1 px, 60 px pitch | grid 35% |
| Guide circles | 1.5 px | lavender 12 to 18% |
| Long diagonals | 1 px | lavender 12% |
| Ticks | 1.5 px, 10 to 20 px long | lineWhite 60% |
| Brackets | 1.5 px, end ticks 16 px | lavender 60% |
| Magenta flashes and rings | 3 px | magenta 100%, fading |

### 3.3 Overlay weights

| Element | Width |
|---|---|
| Attention and change rings | 3 px |
| Trajectory lines | 2.5 px |
| Dashed trajectories | 2.5 px, 14 px on and 10 px off |
| Motion rings | 2 px |
| Arc annotations | 2 px with 8 px end ticks |
| Rulers | 2 px, short ticks 12 px, long ticks 28 px |

## 4. Tone

### 4.1 Hatching

Light comes from the upper left, so shadow falls on the lower right of each form.
Only shadow sides and recesses get hatched, and lit sides stay flat colour.
The primary hatch runs at 45 degrees, rising from lower left to upper right.
Cross-hatch adds a second layer at 105 degrees for deep shadow.
Spacing sets the tone: 12 px for light shade, 8 px for mid shade, 5 px for dark shade, with the cross layer at 7 px.
Cylinders (stems, bodies, trunks) take contour hatching perpendicular to the long axis, slightly curved, 6 to 8 px apart, on the shadow half only.
Foliage takes hatching parallel to the side veins, between the veins.
Bark takes lengthwise hatching.
Water takes horizontal hatching, and coastlines take engraved hatching parallel to the coast that fades with distance offshore.
Every stroke jitters: angle plus or minus 3 degrees, spacing plus or minus 15 percent, each end plus or minus 6 px.

### 4.2 Stipple

Stipple dots have a radius of 1.0 to 2.2 px.
Use stipple for hairs, frost, stars, fine tissue texture, and the body texture of a subject seen very small.
Density runs from 0.002 dots per px² (sparse) to 0.02 dots per px² (dense).

### 4.3 Grain and boil

`core` lays paper grain over illustrated shots and fine noise over schematic shots, re-seeded on the 12 fps boil clock.
Scenes do not add their own full-frame grain.
Every ink and schematic line wobbles on the same 12 fps boil through `lib.boil(T)`, so still frames shimmer like drawn animation.

### 4.4 Stripes

The stripe background uses `lib.stripes` with a band width of 140 px at 30 degrees, rising left to right (`width: 140, angle: -0.52`).
Band A is stripeCream and band B changes by act, as listed in 2.1.
Stripes drift 6 px along their normal per beat unless a shot says otherwise.

## 5. Schematic language

The schematic shots reveal the hidden system inside the illustrated shot that precedes or follows them.
Every schematic frame starts from `lib.blueprint` (navy base, grid, at least one large faint guide circle, two long diagonals).
The subject is a double lavender outline with fine internal structure (lattices, strata, sections, exploded parts).
Glow dots mark points of activity. Measurement is brackets, tick scales and arc annotations.
HOMO CURIOSUS allows **sparse engraved labels** (at most 3 per shot) in small caps monospace via `lib.text`
(`family: '"JetBrains Mono", ui-monospace, monospace'`, size 22 to 26, tracking 0.18em, lavender 70%): e.g. "Fe₂O₃", "U-SERIES ≥ 67.8 KA", "c. 150 BC".
hcRed marks a moment of change for at most 12 frames.
Progress glyph: a small ring at (900, 300) split into 5 arcs (stone, stars, bronze, flight, moon); the arc of the current era glows hcYellow. Draw it with `FILM.hc`-style thin lines in every schematic shot except 09.

## 6. Overlays on illustrations

Overlays show what the drawing cannot: paths, attention, sound, time and scale.
They are thin rings, arcs, straight guide lines, rulers and brackets in the four overlay colours.
Rings expand with `outExpo` and fade over 5 to 12 frames.
Trajectory lines draw on behind a moving subject at 24 fps.
Every illustrated shot carries at least one overlay and at most four overlay colours at once.

## 7. Motion

### 7.1 The on-twos rule

Anything that is drawn as a character or object moves on twos.
Compute its pose from `lib.onTwos(t)`, so it changes 12 times a second and holds each drawing for 2 frames.
Camera moves, zooms, overlay draw-on progress and ring expansion run at a full 24 fps so they stay smooth.
Line wobble follows the 12 fps boil clock.

### 7.2 Timing

The beat is 60/bpm seconds; at the default 120 bpm that is 0.5 s, which is 12 frames at 24 fps, an 8th note 6 frames and a 16th note 3.
Every pop, cut and hit lands on a beat, an 8th or a 16th, exactly on the frame.
Pops use `outBack` over 3 frames with a 6 to 10 percent overshoot.
Draw-ons use `outExpo` over 6 frames.
Character motion never eases for longer than one beat, and only camera moves may run slower.
Motion should feel snappy, never floaty.

### 7.3 Determinism

Seed every random choice from `lib.hash(shotId, ...)` through `lib.rng`.
A scene draws from `t` alone and never depends on a previous frame.
A scene may be asked for `t` slightly beyond its duration during a transition, so clamp to the final pose.

## 8. Match cuts

A match cut keeps a shape on the same pixels across a mode change.
The shared geometry tables live in `docs/storyboard.md`, section "Shared geometry", and scenes copy those numbers exactly.
Line weights may change across the cut, positions may not.

## 9. Wordmark

HOMO CURIOSUS is written by the curiosity line itself (shot 09), not typeset: a monoline engraved capital alphabet
traced as strokes (each letter a polyline set authored in shot 09), stroke width 7 px, centred near y 900, with
construction geometry (baselines, cap line, compass arcs) at lavender 18%. Captions and the end card text are Remotion's job.

## 10. Subject reference

Sources checked on 2026-10-03: Nature (Jan 2026) Muna Island hand stencil via Smithsonian / Al Jazeera reports;
Wikipedia "Antikythera mechanism"; Wright brothers first-flight accounts; NASA Apollo 11 flight journal.

### 10.1 The Muna hand stencil (shots 01–03, 10)
- Hand stencil on limestone, Liang Metanduno cave, Muna Island, SE Sulawesi; dated by uranium-series on calcite crusts to **at least 67,800 years**.
- Made by placing the hand on the wall and **blowing** red ochre pigment around it (mouth-spray), leaving a negative image: rock-coloured hand inside a red halo.
- The artist later **narrowed the fingers**, making them look claw-like → `FILM.hc.hand({ narrow })` from 0 to 0.55 after the lift.
- The halo is densest 20–60 px from the outline and fades to sparse dots by ~260 px; spray droplets are 1–4 px, some running drips downward.
- Calcite crust: thin translucent layers (5–9 visible strata) formed OVER the paint; samples are drilled from crust above and below.

### 10.2 The Antikythera mechanism (shot 05)
- Ancient Greek geared device, 2nd century BC (c. 150–100 BC), found 1901 in a shipwreck off Antikythera; oldest known analogue computer.
- Bronze gears with small triangular teeth (not involute), ~30 surviving gears; largest wheel ~13 cm with **223 teeth** (Saros cycle; four-spoke cross).
- Front dial: zodiac and calendar rings; back dials: two spirals (Metonic and Saros). Corroded green-bronze, fragmentary.

### 10.3 The 1903 Wright Flyer (shot 06)
- 17 Dec 1903, Kill Devil Hills near Kitty Hawk NC. First flight: **12 seconds, 120 feet**, Orville piloting, Wilbur running at the right wingtip.
- Biplane, wingspan 12.3 m; **canard elevator in front**, twin rudders behind, two **pusher** propellers behind the wings driven by chains; pilot lies **prone** on the lower wing, left of centre; engine right of centre.
- Launched from a 60 ft wooden rail on level sand into a ~27 mph wind; muslin-covered spruce/ash frame, wires crossing between the wings.

### 10.4 Apollo 11 (shot 07)
- July 1969; trans-lunar trajectory is a long looping path (free-return figure-8 is the iconic diagram); Moon ~384,000 km.

### 10.5 Mistakes to avoid
- The stencil is a NEGATIVE: never paint the hand red. The hand area stays rock-coloured; the pigment is around it.
- Wright Flyer: propellers are BEHIND the wings (pushers), elevator in FRONT. Never a tractor propeller on the nose, never a tail elevator.
- Pilot lies flat, never sits upright.
- Antikythera gears are bronze with fine triangular teeth, never chunky cartoon cogs with square teeth.
- No text inside illustrated shots except engraved annotations (≤ 2) and the end line in shot 10.
