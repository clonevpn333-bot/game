# THE LAST PROCESSION — progress log

## Intent & constraints
- Third-person cinematic *linear* adventure that plays like an interactive animated movie.
- Structure per chapter: cutscene → playable set piece → seamless transition → character scene → short exploration → set piece → cutscene.
- Stylized slightly-retro characters (toon-shaded, chunky silhouettes) + HUGE environments and colossal walking machines (Processionals).
- No external asset keys (TRIPO/GEMINI/ELEVENLABS all MISSING) → everything procedural: geometry, sky, textures, music and SFX (Web Audio synthesis).
- Desktop primary (keyboard/mouse); touch controls for mobile.
- Lives in `the-last-procession/` beside the pre-existing Schedule I game at repo root (left untouched).

## Design brief
- Player promise: *you are the hero of a giant animated fantasy film* — you run, ride, fight, climb and fall through spectacle while a quiet friendship grows.
- Target feeling: awe (tiny vs colossal), momentum, tenderness in quiet beats.
- Primary verb: move (run / ride / climb / fall-steer). Secondary: jump, strike, dodge, interact, choose dialogue.
- Repeats every 5–30 s: read a telegraph (foot shadow, debris ring, gear gap, bell swing, enemy wind-up) → react.
- Changes across 1–5 min: a new set-piece mechanic per chapter, new Processional, new time of day.
- Lose/learn/restart: hits drain 4 resolve pips; at 0 the segment restarts instantly from its checkpoint (≈1 s).
- Reward: story progress, new shots, relationship scenes. Risk: hazards and enemies.
- Better player: reads telegraphs earlier, keeps momentum, fewer restarts.
- Non-goals: open world, loot, XP, grinding, inventories.

## Core loop contract
Player **moves through an authored set piece** to **reach the next story beat** while **colossal machines, debris and Bellwardens** create risk; success **advances the film (new cutscene / new mechanic)**, failure **restarts the segment at a checkpoint within a second**.

## Chapter / level plan
| # | Chapter | Set piece | Quiet/character beat | Processional |
|---|---------|-----------|----------------------|--------------|
| 0 | The Kneeling | run across plaza to catch the falling girl | first words | the Pilgrim (humanoid) kneels |
| 1 | The City Walks | escape avenue: falling debris, stomp shockwaves, alley fight, collapsing bridge | gate/horses | Pilgrim walks through the city |
| 2 | Beneath the Antlered | horseback: dodge hoof stomps, jump rubble, joust riders, slow-mo under its belly | ridge at dusk | the Antlered (stag) |
| 3 | Embers | short exploration: firewood, light fire, overlook | campfire conversation w/ choices | distant lantern line on horizon |
| 4 | The Iron Pilgrimage | train-roof fight + gantry slides while two Processionals battle | observation deck talk | Carillon vs Antlered |
| 5 | The Carillon | climb a walking giant's leg, hold on during steps, avoid swinging bells | "it's letting us in" | Carillon (walking temple) |
| 6 | The Fall | steer through rotating gear rings in a vertical shaft | REVEAL: the planet machine | inside the Carillon |
| 7 | The Last Procession | battlefield crossing, duel with Vesk, final walk | farewell, epilogue, credits | all of them |

## Status (end of build session)
- All 8 chapters implemented, typecheck + production build clean.
- Bot playtest: 8/8 chapters complete, 0 page errors (`npm run playtest:bot`).
- Canvas inspector pass-2 20/20 PASS, pass-3 3/3 PASS; evidence checker passed. See `final-evidence.md`.
- Known gaps: draw calls over the 300 desktop budget in giant-heavy shots (city fight, ride, battlefield, duel); no real-GPU FPS evidence (SwiftShader-only container); scorecard average 2.2 (all categories ≥ 2).
- Next: atlas/vertex-colour materials for giants, profile on real hardware, skinned hero characters if 3D generation keys become available.
