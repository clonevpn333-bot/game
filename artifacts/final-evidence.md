# Starfall Dominion — final evidence (pass-1)

## What was built
`starfall.html`: a single-file Three.js r160 game, about 3,000 long lines and 410 KB. Rules, controls and architecture are in [STARFALL.md](../STARFALL.md). All art and audio are procedural: the asset-credential probe reported TRIPO, GEMINI and ELEVENLABS all **MISSING**.

## Checks run (and what was observed)
| Check | Result |
|---|---|
| `node --check` on the module script | pass |
| Canvas inspector, 10 declared desktop states (`artifacts/evidence.json`, seed 42) | **10/10 PASS**, 0 console or page errors, budget=ok |
| `check_evidence.py --manifest artifacts/evidence.json` | "Evidence check passed: 10 artifact(s) confirmed." |
| Full-loop bot (real UI clicks + game `Input` object): title → new campaign → drop → capture → governor → colony → extract → galaxy → travel → arrival | completed; the conquest took 310 s of game time (5 uplinks, 25 kills, 0 troops lost); governor modal appeared; colony founded (owner P); 0 errors |
| Defense mission bot (siege of 117 troops) | repelled at 188–197 s, 117 kills, 4–7 squad losses |
| Assault (rival Choir city) / boarding (Synod hull) bots | run without errors; all uplinks / reactors captured; the bot does not reliably finish the core within its time limit |
| 60-minute galaxy sim, 3 seeds | first raid alert at minute 8–19; colony Outpost at 2 min, Fortified Town at 10, City at 20, Fortress City at 30, Megacity at about 45; rivals reach 2–8 worlds each |

Software rendering (SwiftShader) was used throughout, so **FPS was not measured**.

## Renderer diagnostics (from the inspector reports)
| State | Draw calls | Triangles | Geometries | Textures | Entropy | Edge density | Contrast |
|---|---|---|---|---|---|---|---|
| title | 51 | 27k | 37 | 15 | 2.90 | 0.33 | 143 |
| orbit | 23 | 20k | 9 | 17 | 3.24 | 0.44 | 132 |
| galaxy | 248 | 34k | 10 | 14 | 3.29 | 0.42 | 125 |
| warp | 19 | 1k | 5 | 15 | 5.08 | 0.50 | 202 |
| active-play (verdant) | 142 | 747k | 106 | 19 | 5.58 | 0.49 | 151 |
| ground-combat | 93 | 743k | 82 | 19 | 7.08 | 0.44 | 159 |
| ground-titan (volcanic) | 105 | 555k | 60 | 21 | 4.08 | 0.44 | 108 |
| ground-city (Fortress City) | 124 | 794k | 92 | 19 | 6.63 | 0.41 | 194 |
| ground-boarding | 94 | 218k | 76 | 17 | 3.30 | 0.47 | 89 |

Tradeoff: city views go slightly over the inspector's suggested 750k-triangle desktop budget. That cost comes from a merged settlement mesh with hundreds of structures plus shadows. The next optimisation would be a LOD for the far city and smaller shadow casters.

## Visual scorecard (genre mapping: hero = commander; enemies = rival infantry, heavies, natives and titans; interactables = uplinks, monoliths, nests, villages and terminals)
| Category | Score | Evidence |
|---|---|---|
| Art direction | 2 | Amber military-sci-fi identity carried through the HUD, ships and settlements; four faction palettes and building styles |
| Hero/player | 2 | Authored commander: cape, crest, visor, pauldrons, carbine, jet-pack VFX. Built from primitives, no skinning. |
| Enemies | 2 | Faction families with distinct silhouettes (drone/walker, zealot/seraph, broodling/ravager); per-planet natives; titans with telegraphed stomps and sweeps |
| Interactables | 2 | Uplinks with capture rings and owner beams, rune monoliths, nests, Kith villages, beacons |
| World | 2.5 | Layered play/mid/far ring (12 km), landmarks, sky gas giant, fleets overhead, distant battles, weather |
| Materials | 2 | Shared role kit (hull, organic, rock, glass, emissive), panel and organic textures, lit window bands |
| Lighting | 2 | ACES, hemisphere + sun + fill, camera-following shadows, bloom; a few backlit views read dark |
| VFX | 2 | Moving tracer streaks, drop pods, explosions with shells and rings, orbital lance, scorch decals, warp tunnel |
| UI/HUD | 2 | Compass, radar, directive bar, squad roster, alerts with actions, strategy panels, modals |
| Performance evidence | 2 | Renderer counts and browser QA on every state; no real-GPU FPS |
| **Average** | **2.05** | Below the skill's 2.3 "premium" threshold. The biggest gains would come from generated or skinned hero characters and more material detail. |

## Captures
`artifacts/pass-1/desktop-*.png` and `.json`, one pair per state above. PNGs are colour-quantised for repo size.

## Known gaps
Desktop only (no touch). No relay server ships, so multiplayer is protocol plus client only. Ground mission state isn't saved mid-drop. Real-GPU frame rates weren't measured.
