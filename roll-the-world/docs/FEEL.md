# Feel report: the first 60 seconds

Everything here is measured headless from the same code the game runs:
- `tests/feel.spec.luau` covers movement;
- `tools/sim/growth.spec.luau` covers growth pacing;
- `tests/worldgen.spec.luau` covers spawn density.

Re-run them after any tuning change: `node tools/test.js <luau>`, then `SPEC_DIR=tools/sim node tools/test.js <luau>`.

## Movement at each size (tests fail if any size leaves this envelope)

| Ball D (studs ≈ cm) | top speed | ball-lengths/s | 0→90% speed | 180° reverse | 90° turn | coast | hop | airtime |
|---|---|---|---|---|---|---|---|---|
| 3   | 23  | 7.7 | 0.30 s | 0.42 s | 0.27 s | 3.5 D | 1.7 D | 0.45 s |
| 8   | 36  | 4.5 | 0.33 s | 0.45 s | 0.32 s | 2.6 D | 0.6 D | 0.45 s |
| 20  | 54  | 2.7 | 0.40 s | 0.53 s | 0.38 s | 1.9 D | 0.55 D | 0.67 s |
| 50  | 82  | 1.6 | 0.48 s | 0.65 s | 0.45 s | 1.3 D | 0.55 D | 1.06 s |
| 120 | 121 | 1.0 | 0.57 s | 0.77 s | 0.55 s | 0.9 D | 0.55 D | 1.64 s |
| 250 | 168 | 0.7 | 0.65 s | 0.90 s | 0.62 s | 0.7 D | 0.55 D | 2.37 s |

**Small balls are zippy.** They cross almost 8 ball-lengths a second and turn in about a quarter second. **Huge balls are heavy but never sluggish.** They have the highest absolute speed and still reach top speed in under 0.7 s. Acceleration time is eased by size, so the 30–120 second window stays nearly as snappy as the start. Turn assist gives extra grip when steering against your motion.

## Growth pacing (solo greedy roller on real generated maps)

| Kit | pickups in first 60 s | longest gap | D @10 s | @30 s | @60 s | @2 min | @4 min | @6 min |
|---|---|---|---|---|---|---|---|---|
| Kitchen Counter | 304 | 1.3 s | 5.7 | 10.7 | 19.2 | 39.8 | 78.8 | 151 |
| Backyard BBQ | 248 | 1.5 s | 5.5 | 8.5 | 12.7 | 28.7 | 77.1 | 135 |
| Candy Shop | 368 | 0.8 s | 6.5 | 9.8 | 14.7 | 25.6 | 66.2 | 101 |

That's 4–6 pickups a second in the first minute and never more than 1.5 s without one. The ball grows about 5× in the first minute, then steadily, with no runaway. Growth uses each prop's real solid volume. An earlier version used bounding boxes, so chairs counted as solid blocks and growth exploded by minute 2.

## First seconds
- **Fast first pickup:** from every spawn point (3 kits × 3 seeds × 24 spawns) the nearest pickup is at most 0.6 s away at top speed, and at least 112 pickups are within 5 s.
- **No empty world on join:** spawning waits until the props around spawn and the skyline (landmark plus big furniture) are built, with a 6 s server fallback. A slow orbit over the map plays while it loads.
- **Spawn swoop:** the camera starts high, framing your tiny ball against the landmark, and dives into the chase camera in 1.25 s. You can roll during it, and the camera faces the landmark when it lands.

## Juice checklist (what fires on each action)
| Action | Sound | Visual | Camera / haptics |
|---|---|---|---|
| Pickup | pop pitched by size, climbs on streaks | prop flies in and sticks out of the ball, color-matched burst, ball squash, "+cm" floater, ×N combo (3+) with SWEEP!/WOW! tiers | vibration on big pickups |
| Crumb fields | rapid rising pops | vacuum pull: tiny things are grabbed from up to 0.22 D further away | – |
| Bonk (too big) | bonk pitched by size | bounce-back, stars, shockwave ring, 💫, **🔒 gauge on the prop showing how close you are** | shake + rumble; at full speed 2 props knock loose |
| Dash | swoosh | trail, dust, screen speed lines | FOV kick + small shake |
| Hop / land | hop / land | dust and shockwave on big landings | landing shake |
| Next size goal reached | sparkle stinger | "✓ Toaster can be rolled up now!" card, gold ring burst | rumble |
| Unit change (cm → m) | – | big "📏 M!" banner and counter bump | – |
| Almost-big-enough props | – | warm outline that brightens as you get closer | – |
| Rare / mutated props | – | persistent glint, so treasure reads from far away | – |

## Never-empty map
**Supply rain:** any ball in a sparse area gets props dropped from the sky that are sized for it (25–55% of what it can absorb). Small balls get the kit's crumb list. This keeps late rounds and near-empty servers from feeling picked clean.

## Tune in Studio
Press **F2** to open the live tuning panel. Every number above has a slider. Use **Print** to copy values back into `Config/Tuning.luau`, then re-run the tests to confirm you're still inside the envelope.
