# THE SLEEPING KINGDOM — Progress & Design

## Intent and constraints (from the user)
- Third-person, **linear** dark-fantasy action RPG. Not open world: handcrafted chapter maps that feel like
  slices of an enormous kingdom (far silhouettes, ribs of other Founders, distant castles, valleys of fog).
- Retro RPG character models + modern cinematic presentation (moonlight, fog, shafts, fire, rain, embers, sky).
- **User correction (mid-build): models do not have to look blocky — stylized dark fantasy.** So characters
  use lathed / tapered / capsule forms with sculpted silhouettes and smooth shading on cloth, faceted only on
  stone and plate edges. Subtle vertex wobble stays as a tasteful retro touch.
- Original world: kingdom of Velmour, built on sleeping god-beings called the Founders.
- Protagonist: Ser Calder, low-ranking knight returning from war. Heavy worn armor, big cloak, longsword,
  simple helmet.
- The original prompt was cut off at "The enormous mountain…". It is interpreted as: the mountain under the
  capital is a Founder, and at the end of Chapter I it opens its eye.
- No asset-generation keys were found (TRIPO / GEMINI / ELEVENLABS all MISSING), so all models, textures and
  audio are procedural (Three.js geometry, canvas textures, Web Audio synthesis).

## Design brief (Chapter I — The Waking of Velmour)
- **Player promise:** you are a lone knight who reaches home in time to watch the mountain under it wake up.
- **Target feeling:** lonely awe → creeping wrongness → panic → grim, weighty swordplay → cosmic dread.
- **Primary verb:** fight with a heavy longsword (light combo / heavy / roll). **Secondary:** ride, sprint,
  lock on, drink a flask, interact (dismount, talk, light candles).
- **Every 5–30 s:** read an enemy telegraph, then punish it or roll through it, while managing stamina.
- **Across 1–5 min:** the city keeps changing: bells, tilt, rising districts, cracks, new enemy types, the boss.
- **Lose / learn / restart:** HP reaches 0 → "YOU HAVE FALLEN" → respawn at the last Wayside Candle with
  flasks refilled, and the uncleared encounter resets. That takes about 2 seconds.
- **Reward / risk:** clearing encounters opens the route forward, and Wayside Candles save progress and
  refill flasks. Greedy combos drain stamina and leave you unable to roll.
- **A better player:** rolls through telegraphs instead of away from them, keeps stamina for a roll after a
  combo, and uses heavies on staggered enemies.
- **Next decision communicated by:** glowing enemy telegraphs (orange = melee wind-up, gold ring = toll AoE),
  ground markers for falling debris, the objective line, and route lighting (torches lead the way).
- **Non-goals:** open world, inventory/loot, leveling, multiple chapters (Chapter II is a teaser).

## Core loop contract
Player **swings, rolls and blocks with stamina** to **carve a route to the Cathedral of the Still Bell** while
**Founder-spawned enemies and a collapsing city** create risk. Success **opens the next street, lights a
checkpoint and advances the story**. Failure **costs progress back to the last candle** for a fast retry.

## Level plan (single spline corridor, ~1250 m)
| Beat | Path zone | Content |
| --- | --- | --- |
| 0 | Mountain road (ride) | Night rain, lightning. The capital is visible ~1 km away. Epigraph and narration. |
| 1 | Pilgrim's Span (bridge) | A long arched bridge over a fog chasm, with ribs of a distant Founder visible to the west. |
| 2 | Gate of Velmour | Dismount, gatewarden dialogue, portcullis opens. Candle checkpoint. |
| 3 | Lantern Street | Townsfolk, dog, birds on roofs, lantern light. Lore chatter. |
| 4 | Market of St. Ossery | Bells ring with nobody pulling them, dogs bark, birds flee, fountain water trembles → the **city tilts**, the statue falls, people scream. |
| 5 | Broken Street | Districts rise on both sides, cracks glow, debris falls with ground markers. First fight: Marrowmites. |
| 6 | Penitents' Stair | Candle checkpoint. Hushed Penitents (bell-masked) plus mites. Dying priest reveals the truth. |
| 7 | Cathedral Plaza | Fog gate → boss: **The Knellwarden**, the bell-headed guardian statue. Two phases. |
| 8 | Finale | The cliff under the plaza splits and the Founder's eye opens. End card, Chapter II teaser. |

Escalation: the first threat appears ~4 min in (mites, 3), then mixed mites + penitents, then the boss. There are
recovery beats at the candles and the priest.

## Art direction
- Palettes: blue moonlit road → warm orange street lanterns → red ember tremor → gold/purple cathedral → sickly
  gold eye. Sky: stars, moon, layered clouds, lightning.
- Camera: third-person over-the-shoulder, 4.6 m behind, FOV 55. On horseback it pulls back to 7 m.
- Hero readability: a dark cloak silhouette with a pale steel helmet rim, kept separate from the warm backgrounds.

## Status
- [x] Skills installed and read (director, gameplay, graphics, UI, debug, QA + references)
- [x] Scaffold created in `sleeping-kingdom/`
- [x] Engine modules, world, characters, combat, story, UI, audio
- [x] Hero rebuilt (user request): sculpted great-helm + crest, layered pauldrons, tassets, poleyns, sabatons,
      tattered tabard, fur collar, simulated ragged cloak, hand-painted textures + fresnel rim, 2-hand IK grip
- [x] Build + headless browser QA across all stages (see final-evidence.md)

## Remaining / next
- Draw calls ~430–710 incl. shadow + bloom passes (over the 300 desktop budget); next step is merging city
  roles per district and LOD on far props. Triangles ~550–590k (within budget).
- Enemies use the older rig style; giving them the same treatment as the hero is the next art pass.
- Chapter II (The Ribs of Harrowmere) is teased only.

## Phase: full story (Chapters I–V), cutscenes, PS2 finish
- Five chapters: I The Waking of Velmour, II The Witchwood, III The Drowned Choir, IV The Frostspine, V The Heart of Osseran.
- Cutscene engine (actors that walk/gesture/kneel, camera shots, subtitles, storybook narration, skip with Space/Esc).
- Plain-language lore: prologue narration, chapter recaps, The Chronicle codex (pause/title menu), entries unlock per chapter.
- New enemies: drowned monks, Drowned Cantors, Choir Zealots, frost wolves + Pale Alpha, hollow knights (mirror the player's sword forms).
- Bosses: Choirmaster Oswin, Ser Ivarr the Hollow (guard/riposte duel, burning phase two), Archdeacon Morvane (orbs, light pillars, tolls, grows to giant size).
- PS2 finish: 0.8 render scale, Bayer-dithered 6-bit output, soft wide bloom, faint interlace; PS1 vertex wobble removed.
- Levitation: city walls, towers, houses, skyline and Witchwood stilts/totems are founded on the lowest rendered ground under their footprint.
