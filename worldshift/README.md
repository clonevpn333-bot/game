# WORLD//SHIFT

A 3D open-world game set in one city that exists in three eras at once — **1996**, **2047** and **2189** —
and the player can shift between them instantly, staying in the same physical place.

## Run
Easiest: open `WORLDSHIFT.html` (single self-contained file) directly in Chrome/Edge — no server needed.

```
cd worldshift
npx http-server . -p 8080      # or: python3 -m http.server 8080
# open http://localhost:8080
```
Rebuild after editing `src/`: `npm install && npm run build` (or `npm run dev` to watch).

URL options: `?era=0|1|2`, `?t=<hour>`, `?x=&z=` spawn, `?q=low|medium|high`, `?debug`.

## Controls
WASD move · mouse look · Shift sprint · Space jump/vault/mantle (dodge while aiming) · C crouch / slide ·
**1 / 2 / 3 shift to 1996 / 2047 / 2189** · **hold Q to peek** through time (wheel changes era) ·
E interact · F vehicle · LMB attack · RMB aim/block · R reload · J chronicle · M map · Esc pause.

## Architecture (src/)
- `core/` renderer + HDR post (bloom, era colour grade, shift distortion), input, synthesized audio
- `world/` district layout (2.7 km), procedural PBR texture arrays, uber world shader (interior-mapped
  windows, overgrowth, wetness, shift wavefront), era-aware building realisation (1996 → 2047 → ruin 2189),
  chunk streaming per era, far-LOD skyline, collision world
- `timeline/` Chronicle (cause → effect fact store with chunk dependency tracking), shift + peek system
- `actors/` procedural rig + blended animation, player controller, third-person camera
- `gameplay/`, `ui/` game loop, HUD, menus

## What's in the game
- **One 2.7 km city in three eras** — downtown, Elm Park suburbs, Northridge hills, Old Kessler, The Yards,
  Galleria, waterfront, river + bay, Route 9 trench (with a 2047 elevated deck that collapses by 2189),
  three bridges, forests and the Kessler Range. Every lot is realised per era from the same footprint.
- **Shift (1/2/3)**: shader wavefront rebuilds/collapses the city around you; obstruction check
  (you can't shift into a wall); **peek (hold Q)** shows a bubble of another era. Vehicles you drive
  re-materialise as their era counterpart.
- **Cause & effect**: the Chronicle stores facts that propagate forward; chunks that read a fact rebuild
  when it changes. Generic actions anywhere: plant seeds (sapling → oak → climbable colossus), spray your
  tag (preserved under glass in 2047), bury time capsules (dig up the aged contents later).
- **Missions**: The Seed · Game Over (save young Tommy → Old Tom in 2047 → TOM.exe in 2189) ·
  Dead Drop (hide a device in the 1996 construction site, shift inside the shielded 2047 Spire) ·
  Pier 9 (save Mara Quinn → Quinn Clinic / Haven, or a memorial and raiders) · Common Ground
  (who owns Old Kessler reshapes the district) · Burn the Bridge (no bridge, no Bridge Kings) ·
  Foundation (prevent the Spire: the 2047 skyline and its authority change).
- **Living city**: instanced crowds (walk, cross, chat, panic, cower, phone in crimes), AI traffic on
  signals synced with the traffic-light shader, police/AEGIS/Wardens that drive to the scene and search,
  random events (chases, muggings, breakdowns, drone raids, machine hunts, ambushes), weather and lightning.
- **Combat**: per-era weapons (bat, pistol, shotgun, SMG · mono-blade, smart pistol, pulse rifle ·
  rebar club, scrap rifle, arc thrower, Chrono-Displacer), melee combos, block, dodge roll, enemy cover,
  flanking, hearing/vision, drones.
