# STARFALL DOMINION — progress

## Intent / constraints
- Single-file HTML client (`starfall.html`), Three.js r160 via import map. No asset keys → procedural art + WebAudio OST.
- Commander on the ground + real-time galaxy layer; AI rivals use the same command API a networked human would.
- Desktop-first. The existing "Schedule I" game (index.html, js/, css/) is untouched.

## Done
- Core/sim/AI/net, audio + 8-cue adaptive OST, renderer/material kit, models, 8 biomes + hull, ground combat (5 mission types), space views, UI, test hooks.
- Balance pass: colony pacing (≈City at 20 min, Megacity at ≈45–60 min), AI expansion cooldowns, paced raids, siege tuning, crippled-flagship loop fix, stale-timer fix.
- Evidence pass-1 (10 desktop states) + bot playtests. See final-evidence.md.

## Next (if continued)
- Relay server for real multiplayer; touch controls; LOD for far city; skinned/generated hero meshes.
