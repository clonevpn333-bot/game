# The Last Procession: final evidence

## What was built

The game is a complete eight-reel cinematic linear adventure made with Three.js, Vite and TypeScript. It is structured as a film: each chapter alternates authored cutscenes (letterboxed, with subtitles and retro voice babble) with playable set pieces. Between beats the game uses game-time fades, so the action passes seamlessly into the next character scene. Every asset is procedural: geometry, textures, sky, music and SFX. The asset credential probe reported TRIPO, GEMINI and ELEVENLABS all `MISSING`.

The design brief, core-loop contract and level plan are in [`game-progress.md`](game-progress.md).

## Skills used

- `threejs-game-director`: the entry point and verification flow.
- `threejs-gameplay-systems`: the scaffold, design artifacts and loop.
- `threejs-aaa-graphics-builder`: the visual scorecard, authoring recipes, technical-art budgets and shader cookbook (bloom, vignette, sky, and the onBeforeCompile grass and outlines).
- `threejs-game-ui-designer`: the UI patterns.
- `threejs-qa-release`: the canvas inspector, bot playtest and evidence manifest.
- `threejs-debug-profiler`: render-budget triage.

## Commands run and results

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit -p .` | clean |
| Production build | `npx vite build` | ✓ (≈ 830 kB JS, 225 kB gzip) |
| Canvas inspector, pass 2 | `node scripts/inspect-threejs-canvas.mjs --manifest artifacts/evidence.json --url http://127.0.0.1:4188` | **20/20 PASS** (16 desktop states, 4 mobile states) |
| Canvas inspector, pass 3 (re-check after fixes) | `... --manifest artifacts/evidence-pass3.json` | **3/3 PASS** |
| Evidence checker | `check_evidence.py . --manifest artifacts/evidence.json` (and pass 3) | passed (20 + 3 artifacts) |
| Bot playtest | `npm run playtest:bot -- http://127.0.0.1:4188` | **8/8 chapters PASS, 0 page errors, exit 0** |

### Bot playtest (fixed-step headless simulation, real input intents)

Every segment was won through real input intents. "Lowest resolve" is the bot's minimum health during the segment.

| Segment | Time | Lowest resolve |
| --- | --- | --- |
| Prologue run / catch | ok | — |
| City: escape → alley → stride → bridge → gate | ≈ 45 s | 4/4 |
| Ride: ride / beneath / ravine | 18 s / 23 s / 22 s | 4 / **2** / **1** of 4 |
| Embers: explore | 19.5 s | — |
| Train: roof / gantries / front | 12 s / 16 s / 4 s | 4/4 |
| Climb | 91.5 s | 4/4 |
| Fall | 25.5 s | 3/4 |
| Finale: battle / charge / duel / walk | 31 s / 34 s / 24 s / 6 s | 4/4, 4/4, 5/5, — |

The finale reaches the epilogue and its credits. The credits roll is a 62 s CSS animation on real time, so it can be skipped with the advance input.

Bugs the playtest found and that are now fixed:

- The train's closing cutscene stalled because the giants' battle choreography kept steering the Carillon.
- Enemies that fell between train cars never counted as defeated.
- Real-time chapter fades desynchronized from game time.
- Dialogue-choice hotkeys were blocked during cutscenes.
- Abort errors from parallel beats went unhandled.

## Captures

The JPG copies are in [`screens/`](screens). The full-resolution PNGs and JSON reports are written to `pass-2/` and `pass-3/` (PNGs are gitignored).

| State | entropy | edges | contrast | draw calls (budget) |
| --- | --- | --- | --- | --- |
| title (pass 3) | 5.61 | 0.153 | 136 | ok |
| kneeling | 5.83 | 0.273 | 209 | ok |
| catch run | 6.90 | 0.479 | 162 | ok |
| city escape | 6.48 | 0.267 | 163 | ok |
| city fight | 5.41 | 0.545 | 147 | 367 > 300 |
| city bridge | 5.18 | 0.365 | 156 | ok |
| horse ride | 6.40 | 0.175 | 161 | 324 > 300 |
| campfire (explore) | 4.76 | 0.134 | 88 | ok |
| campfire talk | 5.29 | 0.231 | 169 | ok |
| train fight | 5.74 | 0.105 | 163 | ok |
| climb | 5.74 | 0.211 | 162 | ok |
| fall | 5.81 | 0.327 | 187 | ok |
| reveal (planet) | 3.28 | 0.109 | 118 | ok |
| battlefield (pass 3) | 5.97 | 0.159 | 149 | 437 > 300 |
| duel (pass 3) | 5.80 | 0.288 | 191 | 335 > 300 |
| finale | 5.35 | 0.198 | 211 | ok |
| mobile: city escape / ride / campfire / duel | 6.79 / 6.35 / 5.24 / 5.97 | — | — | 236 / 288 / ok / 297 (mobile budget 150) |

Notes on the low-metric rows:

- The reveal's low entropy and 0.55 dominant share are intentional: it is a planet on black space.
- The campfire explore shot's contrast of 88 comes from the night grade.

### Render-budget tradeoffs

The draw-call overruns come from the colossal walking machines. Each giant is a skeleton of about 15–20 bones, with one merged mesh per bone per material, and shadow casters render twice.

Mitigations already in place:

- Per-bone geometry merging.
- Instanced cities, crowds, armies, grass and trees.
- Distant giants built at "far" detail with no shadow casting.
- Emissive parts excluded from the shadow pass.
- Frustum culling enabled.
- The 90 lantern sprites collapsed into one Points draw.
- Character weapons merged per material, and no outlines on trailing cloth.

Next steps if a profile on real hardware shows draw-call pressure:

- An atlas or vertex-colour material per giant, which would collapse 4–5 materials into 1.
- A lower shadow-caster count on mobile.

Triangle counts stay well under budget (≤ 300k).

### Performance caveat

This container has no GPU. Every capture rasterized through SwiftShader, which the inspector flags as `SOFTWARE(fps-invalid)`. The pixel and budget checks are valid, but **no FPS or frame-time claims are made**. The game should be profiled on real hardware. The DPR cap is 2 on desktop and 1.5 on mobile, there is one shadow-casting light with a 2048 map, and the post chain is bloom at half resolution plus one grade pass.

## Visual scorecard (premium bar: every category ≥ 2, average ≥ 2.3)

All shots were scored against the calibration anchors. No "before" scores exist because this is a new game.

| Category | Score | Evidence |
| --- | --- | --- |
| Art direction | 2.5 | A bell and clockwork motif runs through the giants, Bellwarden helms, shrines, the Field of Bells, the UI ornaments and the score. Every chapter has its own palette: sunset, golden plains, night, morning cloud-sea, overcast, interior, storm and dawn. |
| Hero / player | 2 | Kael is a toon-shaded, ink-outlined rig with named joints, a scarf with secondary motion, a pauldron, face blink and talk animation, and about 20 pose modes. Lyra has emissive circuitry that pulses. |
| Obstacles / enemies | 2 | Bellwardens have a distinct bell-helm silhouette and a glowing wind-up telegraph. Giant footfalls use exact `predictLanding` rings. Shockwaves, debris rings, gantries, vents, swinging bells and gear gaps each have their own read. |
| Interactables | 2 | Firewood glints, the overlook beacon, the catch marker, the climb grip QTE ring, glowing gear gaps and the duel's sweep telegraph. |
| World / environment | 2.5 | Layered worlds: an instanced city, hedgerows, the cathedral, a viaduct over the cloud sea, armies, bell fields, and Processionals in the mid- and background for scale. |
| Materials | 2 | Procedural riveted panel plating with patina and drip streaks, cobble, facade, roof and stone textures, a toon ramp, and metal, trim and glow roles. |
| Lighting / render | 2.5 | ACES tone mapping, per-chapter sun and hemisphere lighting, a painterly cloud sky shader, bloom limited to authored emissives, plus vignette, grain and shadow lift. |
| VFX / motion | 2 | Event-driven stomp dust, sparks, embers, motes, slash glints, hit-stop, trauma shake, FOV punches and slow motion under the belly. |
| UI / HUD | 2.5 | Letterbox transitions, typed subtitles with speaker colours, choice cards, an objective glyph, resolve diamonds, a progress rail, key prompts, a QTE ring, chapter cards and touch controls. |
| Performance evidence | 2 | Renderer counts on every capture, documented budget tradeoffs, and a software-render caveat. |

**Average: 2.2.** Every category is at least 2, but the average misses the 2.3 premium threshold. The two weakest areas, Hero and Materials, would be helped by authored skinned characters, which were not possible because external generation was unavailable, and by texture atlasing for the giants.
